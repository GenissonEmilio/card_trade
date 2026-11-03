const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
const old=require('./figma-nodes.json'),previous=require('./native-pixel-nodes.json'),current=require('./native-pixel-v3-nodes.json'),review=require('./review.json');
const keys=['header','hero','stats','catalog','footer'];
(async()=>{const c=await new BridgeClient().open();try{
 const status=await c.call('status');if(status.fileName!=='Sem título'||!status.connected)throw Error('Target file disconnected');
 for(const mode of ['desktop','mobile']){
   for(const part of keys)if(!current[mode+'-'+part]?.normalized)throw Error('Incomplete '+mode+' '+part);
   // Check current native sections before removing only the earlier generated sections.
   const snapshots={};for(const part of keys){const id=current[mode+'-'+part].id;const s=(await c.batch([{command:'get_spec',params:{nodeId:id}}])).results[0].result;snapshots[part]=s.uiSpec.root;}
   let images=0,texts=0,vectors=0;function walk(n){if(n.visual?.fills==='image')images++;if(n.type==='TEXT')texts++;if(n.type==='VECTOR')vectors++;for(const ch of n.children||[])walk(ch)}for(const n of Object.values(snapshots))walk(n);
   if(images!==10||texts<100)throw Error(`Incomplete content: ${mode} images=${images}, texts=${texts}`);
   fs.writeFileSync(path.join(__dirname,'native-verified-'+mode+'.json'),JSON.stringify({images,texts,vectors,sections:snapshots},null,2));
   const root=old[mode].id;const rootSpec=(await c.batch([{command:'get_spec',params:{nodeId:root}}])).results[0].result.uiSpec.root;
   const currentIds=new Set(rootSpec.children.map(n=>n.id));const ops=[];
   for(const v of Object.values(old[mode].sections))if(currentIds.has(v.id))ops.push({command:'delete',params:{nodeId:v.id}});
   for(const key of keys){const v=previous[mode+'-'+key];if(v&&currentIds.has(v.id))ops.push({command:'delete',params:{nodeId:v.id}});}
   if(mode==='desktop'&&currentIds.has('7:35'))ops.push({command:'delete',params:{nodeId:'7:35'}});
   if(ops.length)await c.batch(ops);
   const layout=keys.flatMap((p,i)=>[{command:'reparent',params:{nodeId:current[mode+'-'+p].id,parentId:root,index:i}},{command:'move',params:{nodeId:current[mode+'-'+p].id,x:0,y:current[mode+'-'+p].y}}]);
   await c.batch(layout);
   await c.batch([{command:'resize',params:{nodeId:root,width:mode==='desktop'?1440:390,height:review.find(r=>r.key===mode).height}},{command:'set_fill',params:{nodeId:root,color:'#13071c'}}]);
   await c.call('annotate',{nodeId:root,label:'Direção aprovada: roxo, creme e verde-lima; recortes pixelados. Textos, vetores e imagens em camadas editáveis.',suggestion:'Página Explorar redesenhada a partir do projeto. Busca, filtros, jogos, catálogo, desejos, coleção e navegação mantêm os contratos existentes. Ícones Phosphor duotone selecionados no catálogo público 21st.dev. O arquivo é design visual; fluxos funcionais permanecem no código.'});
   console.log(mode,{id:root,images,texts,vectors,sections:keys.length});
 }
 const page=await c.call('list_page_nodes');if(page.nodes.some(n=>n.id==='7:30'))await c.call('delete',{nodeId:'7:30'});
 await c.call('focus',{nodeId:old.desktop.id});
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
