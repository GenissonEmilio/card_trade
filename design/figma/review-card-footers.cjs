const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const report=[];try{
for(const [mode,width]of [['desktop',1440],['mobile',390]]){
const page=await browser.newPage({viewport:{width,height:1000}});await page.goto(pathToFileURL(path.join(__dirname,mode+'-catalog.html')).href);await page.evaluate(()=>document.fonts.ready);
await page.locator('.cards-row').first().screenshot({path:path.join(__dirname,'card-footers-'+mode+'-preview.png')});
const cards=await page.evaluate(()=>[...document.querySelectorAll('.card')].map(card=>{
 const c=card.getBoundingClientRect(),row=card.querySelector('.card-bottom'),label=row.querySelector('div').getBoundingClientRect(),button=card.querySelector('.card-add').getBoundingClientRect();
 const clearance=c.bottom-button.bottom,notchDepth=c.height*32/454;
 return {name:card.querySelector('.card-name').textContent,buttonWidth:button.width,buttonHeight:button.height,alignment:Math.abs(label.y+label.height/2-button.y-button.height/2),rightInset:c.right-button.right,clearance,notchDepth,labelFits:label.right<=button.left-8};
}));
for(const card of cards)if(card.buttonWidth<44||card.buttonHeight<44||card.alignment>.5||card.rightInset<10||card.clearance<card.notchDepth+2||!card.labelFits)throw Error('Card footer bounds failed '+mode+' '+JSON.stringify(card));
report.push({mode,cards});console.log(mode,cards.length,'footers aligned, buttons 44 px, clear of pixel cuts');await page.close();
}
fs.writeFileSync(path.join(__dirname,'card-footer-review.json'),JSON.stringify(report,null,2));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
