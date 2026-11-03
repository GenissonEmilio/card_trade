const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
(async()=>{const c=await new BridgeClient().open();try{
 const ledger=path.join(__dirname,'extra-nodes.json'),state=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger)):{};
 const save=()=>fs.writeFileSync(ledger,JSON.stringify(state,null,2));
 const nodes=require('./native-pixel-v3-nodes.json');
 for(const mode of ['desktop','mobile'])if(!state[mode+'-edge']){
  const w=mode==='desktop'?1440:390,h=mode==='desktop'?44:22;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g transform="scale(${w/1440} ${h/44})"><path fill="#f7f7e8" d="M0 0H1440V12H1360V32H1280V12H1200V28H1140V12H360V32H280V16H160V44H100V22H0Z"/></g></svg>`;
  const r=(await c.batch([{command:'place_svg',params:{svg,name:'Moldura pixelada / superior',parentId:nodes[mode+'-hero'].id}}])).results[0].result;
  await c.call('move',{nodeId:r.id,x:0,y:0});state[mode+'-edge']=r;save();
 }
 if(!state.states){
  const svg=fs.readFileSync(path.join(__dirname,'extras-states-native.svg'),'utf8');
  state.states=(await c.batch([{command:'place_svg',params:{svg,name:'DUELINK — Controles, filtros e estados',x:2200,y:0}}])).results[0].result;save();
  await c.call('move',{nodeId:state.states.id,x:2200,y:0});
 }
 const spec=(await c.batch([{command:'get_spec',params:{nodeId:state.states.id}}])).results[0].result;
 const meta=require('./extras-states-native.json'),weights={400:'Regular',500:'Medium',600:'SemiBold',700:'Bold'},ops=[];
 function walk(n){if(n.type==='TEXT'){const t=meta.texts.find(t=>t.text===n.text.characters);const weight=weights[t?.weight];if(weight&&n.text.fontStyle!==weight)ops.push({command:'set_text_style',params:{nodeId:n.id,weight}})}for(const ch of n.children||[])walk(ch)}walk(spec.uiSpec.root);
 for(let i=0;i<ops.length;i+=3)await c.batch(ops.slice(i,i+3));
 await c.call('annotate',{nodeId:state.states.id,label:'Estados visuais correspondentes aos controles existentes no projeto.',suggestion:'Busca vazia, comunidade vazia, filtros Yu-Gi-Oh! e Pokémon, detalhe da carta, navegação e ações autenticadas. Regras e destinos seguem o código atual; esta prancha não implementa backend nem ligações de protótipo.'});
 console.log(JSON.stringify(state));
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
