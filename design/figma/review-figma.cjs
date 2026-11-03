const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
for(const [mode,width]of [['desktop',1440],['mobile',390]]){
const page=await browser.newPage({viewport:{width,height:1040}});
await page.goto(pathToFileURL(path.join(__dirname,'figma-'+mode+'-final.png')).href);
await page.evaluate(()=>{document.body.style.margin='0';const img=document.querySelector('img');img.style.display='block';img.style.margin='0';img.style.maxWidth='none';img.style.width=img.naturalWidth+'px';img.style.height=img.naturalHeight+'px'});
await page.screenshot({path:path.join(__dirname,'figma-top-'+mode+'.png')});await page.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
