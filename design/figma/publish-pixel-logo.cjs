const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
const logo=fs.readFileSync(path.resolve(__dirname,'../../public/brand/duelink-logo-pixel.svg'),'utf8');
const targets=require('./logo-placement.json'),ledger=path.join(__dirname,'logo-figma-nodes.json');
const state=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger)):{};const save=()=>fs.writeFileSync(ledger,JSON.stringify(state,null,2));
const extract=s=>s.replace(/<svg\b[^>]*>/,'').replace(/<\/svg>$/,'').replace(/<title>[\s\S]*?<\/title>/,'');
(async()=>{const c=await new BridgeClient().open();try{
const status=await c.call('status');if(!status.connected||status.fileName!=='Sem título')throw Error('Expected Duelink Figma file');
for(const t of targets){
 if(state[t.key]?.done)continue;
 const {x,y,width,height}=t.bounds;
 if(!state[t.key]){
  const r=(await c.batch([{command:'place_svg',params:{svg:logo.replace('width="1152" height="576"',`width="${width}" height="${height}"`),name:'DUELINK / logo pixelada legível',parentId:t.parent}}])).results[0].result;
  state[t.key]={id:r.id,parent:t.parent,bounds:t.bounds};save();
 }
 const id=state[t.key].id;await c.call('move',{nodeId:id,x,y});
 const spec=(await c.batch([{command:'get_spec',params:{nodeId:t.parent}}])).results[0].result.uiSpec.root;
 let old;function walk(n){if(n.id===t.old)old=n;for(const ch of n.children||[])walk(ch)}walk(spec);
 if(old){if(old.type!=='VECTOR'||!old.visual?.fillColors?.includes('#ffffff')||old.width>190||old.height>95)throw Error('Unexpected prior logo geometry '+t.key);await c.call('delete',{nodeId:t.old})}
 state[t.key].done=true;save();console.log(t.key,id);
}
if(!state.board){
 const body=extract(logo),render=(x,y,w)=>`<g transform="translate(${x} ${y}) scale(${w/1152})">${body}</g>`;
 const board=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="840" viewBox="0 0 1440 840"><rect width="1440" height="840" fill="#13071c"/><text x="72" y="62" font-family="DM Sans" font-size="22" fill="#f7f7e8">Duelink · marca pixelada</text><path d="M1336 28h24v24h24v24h-24V52h-24Z" fill="#ceff3b"/>${render(260,76,920)}<path d="M72 590H1368" stroke="#532568"/><text x="100" y="634" font-family="DM Sans" font-size="14" fill="#bba2cb">Cabeçalho · 176 px</text>${render(100,658,176)}<text x="432" y="634" font-family="DM Sans" font-size="14" fill="#bba2cb">Mobile · 125 px</text>${render(432,658,125)}<text x="780" y="634" font-family="DM Sans" font-size="14" fill="#bba2cb">Fundo claro</text><rect x="760" y="648" width="260" height="130" fill="#f7f7e8"/>${render(802,666,176)}<text x="1080" y="684" font-family="DM Sans" font-size="16" fill="#f7f7e8">SVG vetorial</text><text x="1080" y="714" font-family="DM Sans" font-size="14" fill="#bba2cb">Fundo transparente</text></svg>`;
 fs.writeFileSync(path.join(__dirname,'logo-board.svg'),board);
 state.board=(await c.batch([{command:'place_svg',params:{svg:board,name:'DUELINK — Logo pixelada / legibilidade',x:2200,y:1600}}])).results[0].result;save();
 await c.call('move',{nodeId:state.board.id,x:2200,y:1600});
}
await c.call('annotate',{nodeId:state.board.id,label:'Logo adaptada à linguagem pixelada. Nome com letras contínuas para preservar legibilidade.',suggestion:'Roxo, creme e verde-lima. Cartas conectadas e moldura escalonada. Letreiro convertido em curvas; SVG sem dependência de fontes. Verificado a 176 px e 125 px.'});
await c.call('focus',{nodeId:state.board.id});console.log('brand board',state.board.id);
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
