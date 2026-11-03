const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
(async()=>{const c=await new BridgeClient().open();async function check(){try{fs.writeFileSync(path.join(__dirname,'bridge-status.json'),JSON.stringify({pid:process.pid,status:await c.call('status')},null,2))}catch(e){fs.writeFileSync(path.join(__dirname,'bridge-status.json'),JSON.stringify({pid:process.pid,error:e.message}))}}await check();setInterval(check,12000)})().catch(console.error);
