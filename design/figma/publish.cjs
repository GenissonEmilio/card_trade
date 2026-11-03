const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
const manifest=require('./manifest.json'),review=require('./review.json');
const statePath=path.join(__dirname,'figma-nodes.json');
const state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):{};
const save=()=>fs.writeFileSync(statePath,JSON.stringify(state,null,2));
function id(r){return r.nodeId||r.id||r.frameId||r.frame?.id}
(async()=>{const c=await new BridgeClient().open();try{
 const status=await c.call('status');console.log(JSON.stringify(status));if(!status.connected||status.fileName!=='Sem título')throw Error('Expected connected target file Sem título');
 const mode=process.argv[2]||'desktop';const rootX=mode==='mobile'?1600:0;
 if(!state[mode]){const r=await c.call('create_frame',{name:`DUELINK — Explorar / ${mode==='mobile'?'Mobile 390':'Desktop 1440'}`,x:rootX,y:0,width:mode==='mobile'?390:1440,height:review.find(r=>r.key===mode).height,fill:'#080b10'});console.log('root',JSON.stringify(r));state[mode]={id:id(r),sections:{}};save()}
 let y=0;const heights=review.find(r=>r.key===mode).sections;
 for(const part of manifest.sections[mode]){
   const h=part.name==='header'?heights.filter(r=>['nav','utility'].includes(r.name)).reduce((a,b)=>a+b.height,0):part.name==='footer'?heights.filter(r=>['closing','footer'].includes(r.name)).reduce((a,b)=>a+b.height,0):heights.find(r=>r.name===part.name).height;
   if(!state[mode].sections[part.name]){
    const result=await c.call('html_to_design',{path:part.path,width:part.width,parentId:state[mode].id,x:0,y});
    state[mode].sections[part.name]={id:id(result),y,height:h,result};save();console.log(part.name,JSON.stringify(result));
   }
   y+=h;
   if(process.argv.includes('--header-only'))break;
 }
 console.log('saved',statePath);
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
