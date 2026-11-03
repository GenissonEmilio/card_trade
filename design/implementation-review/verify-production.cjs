const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../..');
const ids=['89631139','44508094','74677422','23995346','10045474','46986414','55144522','12580477'];
const featured=require('../../src/lib/featured.json').data;
const data=ids.map(id=>({...featured.find(c=>String(c.id)===id),id,game:'yugioh'}));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const result=[];
 try{
  for(const width of [1440,1365,390]){
   const page=await browser.newPage({viewport:{width,height:900}});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/cards?*',r=>r.fulfill({json:{data,total:14617,hasMore:true,coverage:{imported:14617,withPortugueseName:10887},syncedAt:'2026-10-19T12:00:00Z'}}));
   await page.goto(process.argv[2]||'http://localhost:3001',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>document.querySelectorAll('.card-tile').length===8);
   await page.evaluate(()=>{for(const image of document.images)image.loading='eager'});
   await page.waitForFunction(()=>[...document.images].filter(i=>i.closest('.pixel-app')).every(i=>i.complete&&i.naturalWidth>0),null,{timeout:30000});
   await page.waitForTimeout(250);
   await page.screenshot({path:path.join(__dirname,`production-${width}.png`),fullPage:true});
   await page.screenshot({path:path.join(__dirname,`production-${width}-top.png`)});
   const check=await page.evaluate(()=>{
    const rect=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y+scrollY,width:b.width,height:b.height}};
    return{width:innerWidth,height:document.body.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,
     sections:Object.fromEntries(['.pixel-header','.pixel-hero','.stats-strip','.catalog-section','.pixel-closing','.pixel-footer'].map(s=>[s,rect(document.querySelector(s))])),
     cards:[...document.querySelectorAll('.card-tile')].map(e=>({card:rect(e),add:rect(e.querySelector('.card-add')),label:rect(e.querySelector('.catalog-label')),imageLoaded:e.querySelector('.card-art').naturalWidth>0})),
     resultCopyVisible:getComputedStyle(document.querySelector('.results-caption>span:last-child')).display!=='none',
     transition:rect(document.querySelector('.pixel-transition')),
     images:[...document.images].filter(i=>i.closest('.pixel-app')).every(i=>i.complete&&i.naturalWidth>0)};
   });
   result.push({...check,errors});await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'production-review.json'),JSON.stringify(result,null,2));
  if(result.some(r=>r.overflow||r.errors.length||!r.images||!r.resultCopyVisible||r.transition.x+r.transition.width<r.width||r.cards.some(c=>c.add.width!==44||c.add.height!==44)))throw Error('Production visual verification failed');
  console.log(JSON.stringify(result.map(({width,height,overflow,images,errors,cards})=>({width,height,overflow,images,errors,cardHeight:cards[0].card.height,add:cards[0].add}))));
 }finally{await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))])}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
