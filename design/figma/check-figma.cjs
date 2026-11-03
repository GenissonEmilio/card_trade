const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
(async()=>{const c=await new BridgeClient().open();try{
const nodeId=process.argv[2],name=process.argv[3]||nodeId.replace(':','-');
const spec=(await c.batch([{command:'get_spec',params:{nodeId}}])).results[0].result;fs.writeFileSync(path.join(__dirname,'figma-spec-'+name+'.json'),JSON.stringify(spec,null,2));
const result=await c.rpc('tools/call',{name:'take_screenshot',arguments:{nodeId,scale:1}});
for(const item of result.content||[])if(item.type==='image'){const p=path.join(__dirname,'figma-'+name+'.png');fs.writeFileSync(p,Buffer.from(item.data,'base64'));console.log(p)}else if(item.type==='text')console.log(item.text.slice(0,600));
console.log('Spec root',Object.keys(spec));
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
