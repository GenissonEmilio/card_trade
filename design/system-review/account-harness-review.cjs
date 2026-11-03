const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const out=path.join(__dirname,'.local','account','harness');
fs.mkdirSync(out,{recursive:true});
const screens=['library','wishlist','decks','settings','profile','community','matches','trades','trade-detail'];
const args=process.argv.slice(2);
const cases=[];
if(!args.includes('--states-only'))for(const width of [390,360])for(const screen of screens)cases.push({screen,width,state:'populated'});
if(!args.includes('--populated-only')){
 for(const screen of ['library','wishlist','decks','profile','community','matches','trades'])cases.push({screen,width:390,state:'empty'});
 for(const screen of ['library','decks','community','trade-detail'])cases.push({screen,width:390,state:'error'});
 for(const screen of ['library','decks','matches','trade-detail'])cases.push({screen,width:390,state:'loading'});
 for(const status of ['accepted','completed','declined','cancelled'])cases.push({screen:'trade-detail',width:390,state:'populated',status});
}
(async()=>{
const browser=await chromium.launch({headless:true,channel: process.env.DUELINK_REVIEW_BROWSER || 'chrome'});const results=[];
try{for(const test of cases){
 const {screen,width,state,status}=test;
 const key=`${width}-${screen}-${state}${status?'-'+status:''}`;
 const page=await browser.newPage({viewport:{width,height:844}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(`http://127.0.0.1:3102/?screen=${screen}&role=user&state=${state}${status?'&status='+status:''}`,{waitUntil:'load',timeout:60000});
 await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,5000))]));await page.waitForTimeout(150);
 await page.evaluate(async()=>{const imgs=[...document.querySelectorAll('main img')];imgs.forEach(i=>i.loading='eager');await Promise.race([Promise.all(imgs.map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,5000))]);});
 await page.screenshot({path:path.join(out,key+'.png'),fullPage:true,timeout:20000});
 const data=await page.evaluate(()=>{
  const visible=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>0&&b.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
  const rect=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y+scrollY,width:b.width,height:b.height,right:b.right,bottom:b.bottom+scrollY}};
  return{pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,boundary:document.querySelector('[data-qa-error]')?.textContent||null,
   headings:[...document.querySelectorAll('main h1,main h2')].filter(visible).map(e=>e.textContent.trim()),
   outside:[...document.querySelectorAll('main h1,main h2,main h3,main p,main label,main input,main select,main textarea,main .button,main .card-name')].filter(visible).filter(e=>{const b=e.getBoundingClientRect();return b.left<-.5||b.right>innerWidth+.5}).map(e=>({class:e.className,text:e.textContent?.slice(0,100),...rect(e)})),
   labels:[...document.querySelectorAll('.card-bottom')].slice(0,8).map(e=>{const l=e.querySelector('.catalog-label,.card-owner'),b=e.querySelector('.card-add');return{label:l?.textContent,rect:rect(e),labelBox:l?rect(l):null,button:b?rect(b):null}}),
   images:[...document.querySelectorAll('main img')].filter(visible).filter(e=>!e.complete||!e.naturalWidth).map(e=>e.getAttribute('src')),
   mutations:window.__DUELINK_QA__?.mutations||[],
  };
 });
 results.push({...test,key,...data,errors});console.log(JSON.stringify({key,width:data.pageWidth,outside:data.outside.length,boundary:data.boundary,images:data.images.length,errors}));
 }catch(e){results.push({...test,key,error:String(e),errors});console.log(JSON.stringify({key,error:String(e)}))}
 await page.close();fs.writeFileSync(path.join(out,args.includes('--states-only')?'states-report.json':'report.json'),JSON.stringify(results,null,2));
}}finally{const timer=setTimeout(()=>process.exit(process.exitCode||0),5000);await browser.close();clearTimeout(timer)}
})().catch(e=>{console.error(e);process.exitCode=1});
