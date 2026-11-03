const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const targets=[{key:'desktop-header',width:1440,parent:'18:3',old:'18:29'},{key:'desktop-footer',width:1440,parent:'18:1739',old:'18:1890'},{key:'mobile-header',width:390,parent:'18:1947',old:'18:1973'},{key:'mobile-footer',width:390,parent:'18:3499',old:'18:3652'}];
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
for(const t of targets){const p=await browser.newPage({viewport:{width:t.width,height:1100}});await p.goto(pathToFileURL(path.join(__dirname,t.key+'.html')).href);await p.evaluate(()=>document.fonts.ready);t.bounds=await p.locator('svg[aria-label="Duelink"]').boundingBox();if(!t.bounds)throw Error('Logo missing '+t.key);await p.close()}
fs.writeFileSync(path.join(__dirname,'logo-placement.json'),JSON.stringify(targets,null,2));console.log(JSON.stringify(targets));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
