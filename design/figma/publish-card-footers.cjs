const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
const previous=require('./native-ribbon-v5-nodes.json'),roots=require('./figma-nodes.json'),review=require('./review.json');
const ledger=path.join(__dirname,'card-footer-figma.json'),state=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger)):{};
const save=()=>fs.writeFileSync(ledger,JSON.stringify(state,null,2)),compact=t=>t.replace(/\s/g,'');
(async()=>{const c=await new BridgeClient().open();try{
const status=await c.call('status');if(!status.connected||status.fileName!=='Sem título')throw Error('Expected Duelink Figma file');
if(!state._staging){state._staging=await c.call('create_frame',{name:'Preparação — rodapés dos cards',x:4000,y:0,width:2050,height:3000,fill:'#f7f7e8'});save()}
for(const mode of ['desktop','mobile']){
 const key=mode+'-catalog',meta=require('./'+key+'-native.json');
 if(!state[mode]){const r=(await c.batch([{command:'place_svg',params:{svg:fs.readFileSync(path.join(__dirname,key+'-native.svg'),'utf8'),name:'DUELINK / '+mode+' / catalog',parentId:state._staging.id}}])).results[0].result;state[mode]={id:r.id,height:meta.height};save();await c.call('move',{nodeId:r.id,x:mode==='mobile'?1600:0,y:0})}
 const id=state[mode].id,spec=(await c.batch([{command:'get_spec',params:{nodeId:id}}])).results[0].result.uiSpec.root;
 const texts=[];let images=0;function walk(n){if(n.type==='TEXT')texts.push(n);if(n.visual?.fills==='image')images++;if(n.name==='cards-row1')state[mode].firstRow=n.id;for(const ch of n.children||[])walk(ch)}walk(spec);
 const whole=compact(texts.map(n=>n.text.characters).join(''));const missing=meta.texts.filter(t=>!whole.includes(compact(t.text)));
 if(missing.length||images!==8||texts.filter(n=>n.text.characters==='No catálogo').length!==8)throw Error('Card catalog content mismatch '+mode);
 const ops=[];for(const n of texts){const m=meta.texts.find(t=>compact(t.text)===compact(n.text.characters))||meta.texts.find(t=>t.font===n.text.fontFamily&&compact(n.text.characters).length>3&&compact(t.text).includes(compact(n.text.characters)));const weight={400:'Regular',500:'Medium',600:'SemiBold',700:'Bold'}[m?.weight];if(weight&&n.text.fontStyle!==weight)ops.push({command:'set_text_style',params:{nodeId:n.id,weight}})}
 for(let i=0;i<ops.length;i+=3)await c.batch(ops.slice(i,i+3));
 if(!state[mode].published){
  const y=previous[key].y,footer=previous[mode+'-footer'];
  await c.batch([{command:'reparent',params:{nodeId:id,parentId:roots[mode].id,index:3}},{command:'move',params:{nodeId:id,x:0,y}},{command:'move',params:{nodeId:footer.id,x:0,y:y+meta.height}},{command:'delete',params:{nodeId:previous[key].id}},{command:'resize',params:{nodeId:roots[mode].id,width:mode==='desktop'?1440:390,height:review.find(r=>r.key===mode).height}}]);
  state[mode].published=true;save();
 }
 await c.call('annotate',{nodeId:id,label:'Rodapé dos cards revisado: status e ação alinhados, botão de adicionar de 44 px e símbolo + nítido.',suggestion:'Espaçamento automático em duas colunas. Todos os elementos ficam acima dos recortes inferiores da moldura. Copy e ação de adicionar à coleção preservadas.'});
 save();console.log(mode,state[mode]);
}
const active={};for(const [key,value]of Object.entries(previous))if(!key.startsWith('_'))active[key]={...value};
for(const mode of ['desktop','mobile']){const key=mode+'-catalog';active[key]={...active[key],id:state[mode].id,height:state[mode].height};active[mode+'-footer'].y=active[key].y+state[mode].height;}
fs.writeFileSync(path.join(__dirname,'active-design-nodes.json'),JSON.stringify(active,null,2));
if(!state.stagingRemoved){await c.call('delete',{nodeId:state._staging.id});state.stagingRemoved=true;save()}
await c.call('focus',{nodeId:'3:2'});
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
