const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
(async()=>{const c=await new BridgeClient().open();try{
 const card=fs.readFileSync(path.join(__dirname,'../../public/cards/46986414.jpg')).toString('base64');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="480" height="340"><rect width="480" height="340" fill="#080b10"/><text x="20" y="45" fill="#f5cf60" font-family="Chakra Petch" font-weight="600" font-size="30">Sua próxima carta.</text><text x="20" y="80" fill="#ffffff" font-family="DM Sans" font-size="18">Explorar cartas</text><image x="20" y="110" width="120" height="180" xlink:href="data:image/jpeg;base64,${card}"/></svg>`;
 const r=(await c.batch([{command:'place_svg',params:{svg,name:'TEMP / import verification',x:2300,y:0}}])).results[0].result;
 console.log(r);fs.writeFileSync(path.join(__dirname,'probe-node.json'),JSON.stringify(r));
 console.log(JSON.stringify((await c.batch([{command:'get_spec',params:{nodeId:r.id}}])).results[0].result));
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
