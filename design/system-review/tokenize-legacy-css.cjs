const fs=require('node:fs'),path=require('node:path'),postcss=require('postcss');
const root=path.resolve(__dirname,'../..');
const files=process.argv.length>2?process.argv.slice(2):['src/app/globals.css','src/app/multigame.css','src/app/navigation.css','src/components/marketplace.module.css','src/components/admin.module.css'];
function rgba(hex){let raw=hex.slice(1);if(raw.length===3||raw.length===4)raw=raw.split('').map(c=>c+c).join('');return[parseInt(raw.slice(0,2),16),parseInt(raw.slice(2,4),16),parseInt(raw.slice(4,6),16),raw.length===8?parseInt(raw.slice(6,8),16)/255:1];}
function semantic(value,decl){
 const prop=decl.prop,selector=decl.parent.selector||'';
 return value.replace(/#[a-f\d]{3,8}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/gi,color=>{
  const [r,g,b,a]=color.startsWith('#')?rgba(color):color.match(/[\d.]+/g).map(Number);
  const alpha=a??1,light=(r+g+b)/765;
  const yellow=r>b*1.18&&g>b*1.08&&g>r*.63;
  const red=r>g*1.22&&r>b*1.1&&!yellow;
  const green=g>r*1.08&&g>b*1.02;
  const chromatic=Math.max(r,g,b)-Math.min(r,g,b)>18;
  const kind=/shadow/.test(prop)?'shadow':/background/.test(prop)?'background':/border|outline/.test(prop)?'border':'foreground';
  const status=/error|negative|danger|reason|cancel|reject/.test(selector)?'danger':/success|positive|valid|\.ok\b|owned/.test(selector)?'success':/pending|warning/.test(selector)?'warning':null;
  let token;
  if(kind==='shadow')return 'var(--ds-shadow-color)';
  if(status)token=`--ds-${status}${kind==='background'?'-bg':kind==='border'?'-border':''}`;
  else if(kind==='background')token=/(?:^|[ .])(?:card-art|art\b|detail-illustration|cover\b|holo)/.test(selector)?'--ds-art-surface':(red?'--ds-danger-bg':green?'--ds-success-bg':yellow||chromatic?'--ds-soft':'--panel');
  else if(kind==='border')token='--line';
  else token=yellow?'--gold':red?'--ds-danger':green?'--ds-success':light>.82?'--text':chromatic&&b>r*1.25?'--cyan':'--muted';
  return alpha<.99?`color-mix(in srgb, var(${token}) ${Math.round(alpha*100)}%, transparent)`:`var(${token})`;
 });
}
const report=[];
for(const name of files){const file=path.join(root,name),css=postcss.parse(fs.readFileSync(file,'utf8'));let count=0;css.walkDecls(decl=>{
 if(decl.parent.type==='atrule'&&decl.parent.name==='font-face')return;
 if(decl.prop.startsWith('--'))return;
 const next=semantic(decl.value,decl);if(next!==decl.value){decl.value=next;count++;}
 if(decl.prop==='border-radius'&&!decl.value.includes('%'))decl.value='var(--ds-radius)';
 if(decl.prop==='font-family'&&/Barlow/.test(decl.value))decl.value='var(--ds-font-display)';
 });fs.writeFileSync(file,css.toString());report.push({file:name,declarations:count});}
console.log(JSON.stringify(report));
