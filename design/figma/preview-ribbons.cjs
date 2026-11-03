const path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
for(const [mode,width,height]of [['desktop',1440,680],['mobile',390,780]]){
 const page=await browser.newPage({viewport:{width,height}});await page.goto(pathToFileURL(path.join(__dirname,mode+'-catalog.html')).href);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(__dirname,'ribbons-'+mode+'-preview.png')});
 const issues=await page.evaluate(()=>[...document.querySelectorAll('.button,.pill,.game,.filter,.sort,.search-submit')].filter(el=>{const label=el.querySelector('.control-label');if(!label)return false;const a=el.getBoundingClientRect(),b=label.getBoundingClientRect();return b.left<a.left||b.right>a.right||b.top<a.top||b.bottom>a.bottom}).map(el=>el.textContent));
 if(issues.length)throw Error('Clipped control labels: '+JSON.stringify(issues));console.log(mode,'ribbon labels fit');await page.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
