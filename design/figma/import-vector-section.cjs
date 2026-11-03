const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
(async()=>{const c=await new BridgeClient().open();try{
const mode=process.argv[2]||'desktop',part=process.argv[3]||'hero';
const old=require('./figma-nodes.json'),statePath=path.join(__dirname,'native-ribbon-v5-nodes.json'),state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):{};
const key=mode+'-'+part,meta=require('./'+key+'-native.json');
if(state[key]?.normalized){console.log('Existing',state[key].id);return}
if(!state._staging){state._staging=await c.call('create_frame',{name:'Preparação — botões em faixa',x:4000,y:0,width:2050,height:5000,fill:'#13071c'});fs.writeFileSync(statePath,JSON.stringify(state,null,2));}
const svg=fs.readFileSync(path.join(__dirname,key+'-native.svg'),'utf8');
const result=state[key]||(await c.batch([{command:'place_svg',params:{svg,name:'DUELINK / '+mode+' / '+part,parentId:state._staging.id}}])).results[0].result;
const review=require('./review.json').find(r=>r.key===mode);const keys=['header','hero','stats','catalog','footer'];let y=0;
for(const name of keys){if(name===part)break;y+=name==='header'?review.sections.filter(s=>['nav','utility'].includes(s.name)).reduce((a,b)=>a+b.height,0):review.sections.find(s=>s.name===name).height;}
state[key]={...result,parent:old[mode].id,y};fs.writeFileSync(statePath,JSON.stringify(state,null,2));
await c.batch([{command:'move',params:{nodeId:result.id,x:mode==='mobile'?1600:0,y:state[key].y}}]);
const spec=(await c.batch([{command:'get_spec',params:{nodeId:result.id}}])).results[0].result;
fs.writeFileSync(path.join(__dirname,'native-spec-'+key+'.json'),JSON.stringify(spec,null,2));
// SVG import picks Bold for 600; normalize native font weights against source.
const texts=[];function walk(n){if(n.type==='TEXT')texts.push(n);for(const ch of n.children||[])walk(ch)}walk(spec.uiSpec.root);
const weights={400:'Regular',500:'Medium',600:'SemiBold',700:'Bold'};
const compact=t=>t.replace(/\s/g,'');
const ops=[];for(const n of texts){const m=meta.texts.find(t=>t.text===n.text.characters)||meta.texts.find(t=>t.font===n.text.fontFamily&&compact(n.text.characters).length>3&&compact(t.text).includes(compact(n.text.characters)));const weight=weights[m?.weight]||'Regular';if(m&&n.text.fontStyle!==weight)ops.push({command:'set_text_style',params:{nodeId:n.id,weight}})}
for(let i=0;i<ops.length;i+=3)await c.batch(ops.slice(i,i+3));
state[key].normalized=true;fs.writeFileSync(statePath,JSON.stringify(state,null,2));
console.log(JSON.stringify({...result,texts:texts.length,expectedTexts:meta.texts.length}));
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
