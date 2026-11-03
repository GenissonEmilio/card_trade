const path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
for(const [mode,width,height]of [['desktop',1440,520],['mobile',390,720]]){
 const page=await browser.newPage({viewport:{width,height}});await page.goto(pathToFileURL(path.join(__dirname,'figma-ribbons-'+mode+'.png')).href);
 await page.evaluate(()=>{document.body.style.margin='0';const img=document.querySelector('img');Object.assign(img.style,{display:'block',margin:'0',maxWidth:'none',width:img.naturalWidth+'px',height:img.naturalHeight+'px'})});
 await page.screenshot({path:path.join(__dirname,'figma-ribbon-controls-'+mode+'.png')});await page.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
