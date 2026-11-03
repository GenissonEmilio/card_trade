const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const out=path.join(__dirname,'.local');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({headless:true,channel:process.env.DUELINK_REVIEW_BROWSER||'chrome'}),p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));const result={};try{
const go=async(screen,role='user')=>{await p.goto(`http://127.0.0.1:3102/?screen=${screen}&role=${role}`,{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200)};
await go('admin','admin');result.adminActive=await p.locator('.pixel-utility [aria-current="page"]').allTextContents();
await go('wishlist');result.wishCounters=await p.locator('.pixel-utility .ds-nav-count').allTextContents();
result.cardNativeControls=await p.locator('.card-art-button,.wish-button').evaluateAll(es=>es.every(e=>e.tagName==='BUTTON'&&!e.classList.contains('ds-action')));
await go('components');result.darkInput=await p.locator('.ds-panel-dark').evaluate(panel=>{const input=document.createElement('input');input.value='Campo em superfície escura';panel.appendChild(input);const s=getComputedStyle(input);return{color:s.color,background:s.backgroundColor,border:s.borderColor}});
result.busy=await p.locator('button[aria-busy="true"]').count();await p.screenshot({path:path.join(out,'contexts-desktop.png'),fullPage:true});result.errors=errors;
if(!result.adminActive.some(t=>t.includes('Administração'))||!result.wishCounters.length||!result.cardNativeControls||result.darkInput.color!=='rgb(247, 247, 232)'||result.darkInput.background!=='rgb(19, 7, 28)'||!result.busy||errors.length)throw Error(JSON.stringify(result));
fs.writeFileSync(path.join(out,'contexts.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await Promise.race([b.close(),new Promise(r=>setTimeout(r,5000))])}})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
