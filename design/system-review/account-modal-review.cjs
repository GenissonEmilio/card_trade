const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const out=path.join(__dirname,'.local','account','modals');fs.mkdirSync(out,{recursive:true});
const cases=[
 {key:'library-search',screen:'library',action:async p=>{await p.getByRole('button',{name:'Adicionar carta',exact:true}).click();await p.getByRole('button',{name:'Buscar cartas no catálogo',exact:true}).click();}},
 {key:'library-add',screen:'library',action:async p=>p.locator('.card-add').first().click()},
 {key:'library-edit',screen:'library',action:async p=>p.locator('.inventory-actions button[aria-label^="Editar"]').first().click()},
 {key:'library-delete',screen:'library',action:async p=>p.locator('.inventory-actions button[aria-label^="Remover"]').first().click()},
 {key:'library-detail',screen:'library',action:async p=>p.locator('.card-name').first().click()},
 {key:'wishlist-search',screen:'wishlist',action:async p=>{await p.getByRole('button',{name:'Adicionar desejo',exact:true}).click();await p.getByRole('button',{name:'Buscar cartas no catálogo',exact:true}).click();}},
 {key:'deck-new',screen:'decks',action:async p=>p.getByRole('button',{name:'Criar deck',exact:true}).click()},
 {key:'deck-delete',screen:'decks',action:async p=>p.getByRole('button',{name:'Excluir deck',exact:true}).click()},
 {key:'deck-search',screen:'decks',action:async p=>{await p.getByRole('button',{name:'Adicionar carta',exact:true}).click();await p.getByRole('button',{name:'Buscar cartas no catálogo',exact:true}).click();}},
 {key:'match-propose',screen:'matches',action:async p=>p.getByRole('button',{name:'Propor troca',exact:true}).click()},
 {key:'trade-decline',screen:'trade-detail',action:async p=>p.getByRole('button',{name:'Recusar',exact:true}).click()},
 {key:'trade-confirm',screen:'trade-detail',status:'accepted',action:async p=>p.getByRole('button',{name:'Confirmar que recebi a carta',exact:true}).click()},
 {key:'trade-cancel',screen:'trade-detail',status:'accepted',action:async p=>p.getByRole('button',{name:'Cancelar proposta',exact:true}).click()},
];
(async()=>{const browser=await chromium.launch({headless:true,channel: process.env.DUELINK_REVIEW_BROWSER || 'chrome'});const results=[];
try{for(const width of [390,360])for(const test of cases){const p=await browser.newPage({viewport:{width,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
await p.goto(`http://127.0.0.1:3102/?screen=${test.screen}&role=user&state=populated${test.status?'&status='+test.status:''}`,{waitUntil:'load',timeout:60000});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);await test.action(p);
const modal=p.locator('dialog.modal[open]');await modal.waitFor({state:'visible'});await p.waitForTimeout(100);
await modal.screenshot({path:path.join(out,`${width}-${test.key}-top.png`),timeout:15000});
const data=await modal.evaluate(e=>{const b=e.getBoundingClientRect();const visible=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0};return{title:e.querySelector('h2')?.textContent,width:b.width,height:b.height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollHeight:e.scrollHeight,bodyOverflow:document.body.style.overflow,focusInDialog:e.contains(document.activeElement),outside:[...e.querySelectorAll('h2,h3,p,input,select,textarea,.button,label')].filter(visible).filter(n=>{const r=n.getBoundingClientRect();return r.left<b.left-.5||r.right>b.right+.5}).map(n=>({class:n.className,text:n.textContent.slice(0,80)}))}});
await p.keyboard.press('Tab');data.focusAfterTab=await modal.evaluate(e=>e.contains(document.activeElement));
if(data.scrollHeight>data.height+5){await modal.evaluate(e=>e.scrollTop=e.scrollHeight);await modal.screenshot({path:path.join(out,`${width}-${test.key}-bottom.png`)});}
await p.keyboard.press('Escape');await p.waitForTimeout(100);data.escClosed=await p.locator('dialog.modal[open]').count()===0;
results.push({key:test.key,width,...data,errors});console.log(JSON.stringify({key:test.key,width,overflow:data.scrollWidth>data.clientWidth,outside:data.outside,focus:data.focusInDialog,esc:data.escClosed,errors}));
}catch(e){results.push({key:test.key,width,error:String(e),errors});console.log(JSON.stringify({key:test.key,width,error:String(e)}))}
await p.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));}
}finally{const t=setTimeout(()=>process.exit(process.exitCode||0),5000);await browser.close();clearTimeout(t)}
})().catch(e=>{console.error(e);process.exitCode=1});
