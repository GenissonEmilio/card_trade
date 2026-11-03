const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
const folders=['src/components','src/app'];
const files=folders.flatMap(dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.tsx')).map(e=>path.join(root,dir,e.name)));
const skipped=new Set(['explore.tsx','explore-shell.tsx','pixel-design.tsx','design-system.tsx','system-icons.tsx']);
const output=[];
for(const file of files){
 if(skipped.has(path.basename(file)))continue;
 let text=fs.readFileSync(file,'utf8');
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const edits=[],used=new Set();
 function visit(node){
  if(ts.isJsxElement(node)){
   const tag=node.openingElement.tagName.getText(source);
   const attr=node.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(source)==='className');
   const cls=attr?.initializer?.getText(source)||'';
   const kind=(tag==='button'&&/\bbutton\b/.test(cls))?'ActionButton':(tag==='Link'&&/\bbutton\b/.test(cls))?'ActionLink':(tag==='div'&&/(?:["'\s])panel(?:["'\s])/.test(cls))?'Panel':null;
   if(kind){used.add(kind);edits.push({start:node.openingElement.tagName.getStart(source),end:node.openingElement.tagName.end,value:kind},{start:node.closingElement.tagName.getStart(source),end:node.closingElement.tagName.end,value:kind});}
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
 for(const edit of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,edit.start)+edit.value+text.slice(edit.end);
 if(used.size){const at=text.startsWith("'use client';")?text.indexOf('\n')+1:0;const relative=file.includes(path.join('src','app'))?'@/components/design-system':'./design-system';text=text.slice(0,at)+`import { ${[...used].join(', ')} } from '${relative}';\n`+text.slice(at);fs.writeFileSync(file,text);output.push({file:path.relative(root,file),components:[...used],elements:edits.length/2});}
}
console.log(JSON.stringify(output));
