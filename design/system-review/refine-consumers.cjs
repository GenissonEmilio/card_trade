const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
for(const dir of ['src/components','src/app'])for(const f of fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.tsx'))){
 if(['design-system.tsx'].includes(f))continue;
 const file=path.join(root,dir,f);let text=fs.readFileSync(file,'utf8');const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const edits=[];
 function visit(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(source)==='ActionButton'){
 const attr=n.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(source)==='className');const cls=attr?.initializer?.getText(source)||'';
 if(attr&&!/[\s"'`]button(?=[\s"'`])/.test(cls))edits.push({start:n.openingElement.tagName.getStart(source),end:n.openingElement.tagName.end,value:'button'},{start:n.closingElement.tagName.getStart(source),end:n.closingElement.tagName.end,value:'button'});
 }ts.forEachChild(n,visit);}visit(source);
 for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.value+text.slice(e.end);
 if(edits.length){fs.writeFileSync(file,text);console.log(`${f}: preserved ${edits.length/2} native icon/art controls`);}
}
const tradeFile=path.join(root,'src/components/trades.tsx');let trades=fs.readFileSync(tradeFile,'utf8');
trades=trades.replace(/import \{([^}]+)\} from '\.\/design-system';/,(_m,names)=>`import { ${names.trim()}, StatusBadge } from './design-system';`);
trades=trades.replace('<span className={`status status-${t.status}`}>{statuses[t.status]}</span>','<StatusBadge tone={t.status === "completed" ? "success" : t.status === "pending" ? "warning" : t.status === "accepted" ? "info" : "danger"} className={`status status-${t.status}`}>{statuses[t.status]}</StatusBadge>');
trades=trades.replace('<span className={`status status-${trade.status}`}>{statuses[trade.status]}</span>','<StatusBadge tone={trade.status === "completed" ? "success" : trade.status === "pending" ? "warning" : trade.status === "accepted" ? "info" : "danger"} className={`status status-${trade.status}`}>{statuses[trade.status]}</StatusBadge>');fs.writeFileSync(tradeFile,trades);
const marketFile=path.join(root,'src/components/marketplace.tsx');fs.writeFileSync(marketFile,fs.readFileSync(marketFile,'utf8').replaceAll('className={styles.hero}','className={`${styles.hero} ds-surface-dark`}'));
