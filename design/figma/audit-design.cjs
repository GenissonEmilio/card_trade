const fs=require('fs'),path=require('path');
const {BridgeClient}=require('C:/Users/vinic/Documents/ChatGPT/Projeto editor/tools/figma-design/bridge-client.cjs');
const nodes=fs.existsSync(path.join(__dirname,'active-design-nodes.json'))?require('./active-design-nodes.json'):require('./native-ribbon-v5-nodes.json'),extra=require('./extra-nodes.json');
const clean=s=>s.replace(/\s/g,'');
(async()=>{const c=await new BridgeClient().open();try{
 const report={sections:[],fontsCorrected:[]};
 for(const [key,node]of [...Object.entries(nodes).filter(([key])=>!key.startsWith('_')),['extras-states',extra.states]]){
   const meta=require('./'+key+'-native.json');const spec=(await c.batch([{command:'get_spec',params:{nodeId:node.id}}])).results[0].result;
   const texts=[];let images=0;function walk(n){if(n.type==='TEXT')texts.push(n);if(n.visual?.fills==='image')images++;for(const ch of n.children||[])walk(ch)}walk(spec.uiSpec.root);
   const joined=clean(texts.map(n=>n.text.characters).join(''));
   const missing=meta.texts.filter(t=>!joined.includes(clean(t.text))).map(t=>t.text);
   const ops=[];for(const n of texts){const exact=meta.texts.find(t=>clean(t.text)===clean(n.text.characters));const match=exact||meta.texts.find(t=>t.font===n.text.fontFamily&&clean(n.text.characters).length>3&&clean(t.text).includes(clean(n.text.characters)));
     const weight={400:'Regular',500:'Medium',600:'SemiBold',700:'Bold'}[match?.weight];
     if(weight&&n.text.fontStyle!==weight){ops.push({command:'set_text_style',params:{nodeId:n.id,weight}});report.fontsCorrected.push({id:n.id,text:n.text.characters,weight});}
   }
   for(let i=0;i<ops.length;i+=3)await c.batch(ops.slice(i,i+3));
   const pos=await c.call('move',{nodeId:node.id});
   const section={key,id:node.id,x:pos.x,y:pos.y,width:spec.uiSpec.root.width,height:spec.uiSpec.root.height,texts:texts.length,images,expectedImages:meta.images,missing};
   report.sections.push(section);if(missing.length||images!==meta.images)throw Error('Content mismatch '+JSON.stringify(section));
 }
 for(const mode of ['desktop','mobile']){const ordered=report.sections.filter(s=>s.key.startsWith(mode));for(let i=1;i<ordered.length;i++){const a=ordered[i-1],b=ordered[i];if(b.y<a.y+a.height-.1)throw Error('Section overlap: '+a.key+' / '+b.key)}}
 report.status='passed';fs.writeFileSync(path.join(__dirname,'figma-audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,sections:report.sections.length,fontsCorrected:report.fontsCorrected.length,missing:0,overlaps:0}));
 await c.call('focus',{nodeId:'3:2'});
}finally{c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
