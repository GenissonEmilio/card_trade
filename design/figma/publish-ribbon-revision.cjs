const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
const prior=require('./native-pixel-v4-nodes.json'),current=require('./native-ribbon-v5-nodes.json'),roots=require('./figma-nodes.json'),review=require('./review.json'),art=require('./pixel-geometry.cjs');
const ledger=path.join(__dirname,'ribbon-v5-publish.json'),state=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger)):{};
const save=()=>fs.writeFileSync(ledger,JSON.stringify(state,null,2));const compact=t=>t.replace(/\s/g,'');
(async()=>{const c=await new BridgeClient().open();try{
 const status=await c.call('status');if(!status.connected||status.fileName!=='Sem título')throw Error('Expected connected Duelink Figma file');
 const parts=['header','hero','stats','catalog','footer'];
 for(const mode of ['desktop','mobile']){
  for(const part of parts){const key=mode+'-'+part,n=current[key];if(!n?.normalized)throw Error('Incomplete '+key);
   const s=(await c.batch([{command:'get_spec',params:{nodeId:n.id}}])).results[0].result.uiSpec.root,meta=require('./'+key+'-native.json');
   const texts=[];let images=0;function walk(n){if(n.type==='TEXT')texts.push(n.text.characters);if(n.visual?.fills==='image')images++;for(const x of n.children||[])walk(x)}walk(s);
   const full=compact(texts.join(''));const missing=meta.texts.filter(t=>!full.includes(compact(t.text)));if(missing.length||images!==meta.images)throw Error('Content mismatch '+key);
  }
  if(!state[mode]){
   const present=(await c.batch([{command:'get_spec',params:{nodeId:roots[mode].id}}])).results[0].result.uiSpec.root.children.map(n=>n.id);
   const ops=[];for(const [i,part]of parts.entries()){const n=current[mode+'-'+part];ops.push({command:'reparent',params:{nodeId:n.id,parentId:roots[mode].id,index:i}},{command:'move',params:{nodeId:n.id,x:0,y:n.y}})}
   for(const part of parts){const id=prior[mode+'-'+part].id;if(present.includes(id))ops.push({command:'delete',params:{nodeId:id}})}
   ops.push({command:'resize',params:{nodeId:roots[mode].id,width:mode==='desktop'?1440:390,height:review.find(r=>r.key===mode).height}});
   await c.batch(ops);state[mode]={id:roots[mode].id};save();
  }
  // Import border geometry directly so the HTML serializer's masks cannot hide it.
  for(const position of ['top','bottom'])if(!state[mode][position]){
   const markup=art.band('pixel-band '+position,position).match(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)[mode==='desktop'?0:1];
   const r=(await c.batch([{command:'place_svg',params:{svg:markup,name:'Mosaico pixelado / '+position,parentId:current[mode+'-hero'].id}}])).results[0].result;
   const bandHeight=mode==='desktop'?160:position==='top'?112:96;
   await c.call('move',{nodeId:r.id,x:0,y:position==='top'?0:current[mode+'-hero'].height-bandHeight});state[mode][position]=r;save();
  }
  await c.call('annotate',{nodeId:roots[mode].id,label:'Botões em faixas inclinadas, com ícone destacado e textura deslocada, conforme referência.',suggestion:'Textos horizontais; estados ativos em verde-lima e roxo. Jogos, categorias, filtros e ações principais preservam a copy e os ícones. Logo legível e composição pixelada mantidas.'});
  console.log(mode,state[mode].id,'published');
 }
 if(!state.states){
  const result=(await c.batch([{command:'place_svg',params:{svg:fs.readFileSync(path.join(__dirname,'extras-states-native.svg'),'utf8'),name:'Controles e estados / pixelado',parentId:current._staging.id}}])).results[0].result;state.states={replacement:result.id};save();
 }
 if(!state.states.done){
  const target='9:6347',old=(await c.batch([{command:'get_spec',params:{nodeId:target}}])).results[0].result.uiSpec.root;
  await c.batch([{command:'reparent',params:{nodeId:state.states.replacement,parentId:target}},{command:'move',params:{nodeId:state.states.replacement,x:0,y:0}},...old.children.filter(n=>n.id!==state.states.replacement).map(n=>({command:'delete',params:{nodeId:n.id}}))]);
  state.states.done=true;save();
 }
 if(!state.stagingRemoved){await c.call('delete',{nodeId:current._staging.id});state.stagingRemoved=true;save()}
 await c.call('focus',{nodeId:'3:2'});
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
