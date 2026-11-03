const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const results=[];
 try {
  for(const width of [768,1024,1200,1279,1280]) {
   const page=await browser.newPage({viewport:{width,height:844}});
   await page.route('**/api/cards?*',r=>r.fulfill({json:{data:[],hasMore:false,total:0,syncedAt:'2026-10-19T00:00:00Z',coverage:{imported:14617,withPortugueseName:10887}}}));
   await page.goto(process.argv[2]||'http://localhost:3000',{waitUntil:'load'});
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('.catalog-tabs button').first().click(); // An actual client handler establishes hydration.
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.locator('.pixel-header').screenshot({path:path.join(__dirname,`${width}-header.png`)});
   const data=await page.evaluate(()=>{
    const visible=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).display!=='none'};
    const bounds=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
    const nav=[...document.querySelectorAll('.pixel-primary-nav a')].filter(visible);
    return{width:innerWidth,pageWidth:document.documentElement.scrollWidth,visiblePrimary:nav.map(e=>e.textContent),menuVisible:visible(document.querySelector('.pixel-menu-toggle')),accountRibbonVisible:visible(document.querySelector('.pixel-account .pixel-ribbon')),headerLinks:[...document.querySelectorAll('.pixel-header a,.pixel-header button')].filter(visible).map(e=>({text:e.textContent.trim()||e.getAttribute('aria-label'),...bounds(e)}))};
   });
   if(data.menuVisible){
    await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
    await page.locator('#pixel-mobile-menu').waitFor({state:'visible'});
    data.menuOpen=await page.locator('#pixel-mobile-menu').evaluate(e=>e.open);
    data.menuLinks=await page.locator('#pixel-mobile-menu nav a').allTextContents();
    await page.locator('#pixel-mobile-menu').screenshot({path:path.join(__dirname,`${width}-tablet-menu.png`)});
    await page.getByRole('button',{name:'Fechar menu',exact:true}).click();
    data.menuClosed=await page.locator('#pixel-mobile-menu').evaluate(e=>!e.open);
   }
   results.push(data); await page.close();
  }
  fs.writeFileSync(path.join(__dirname,'tablet-header-report.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({width:r.width,pageWidth:r.pageWidth,menuVisible:r.menuVisible,menuOpen:r.menuOpen,menuClosed:r.menuClosed,primary:r.visiblePrimary})),null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
