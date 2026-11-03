const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const routes = [
 ['login','/login'], ['signup','/cadastro'], ['forgot','/recuperar-senha'], ['reset','/recuperar-senha?etapa=nova'],
 ['expired-link','/login?erro=confirmacao'], ['community','/comunidade'], ['missing-profile','/perfil/duelink-review-inexistente'],
 ['shared-deck-unavailable','/decks?ver=00000000-0000-0000-0000-000000000000'],
 ['collection-gate','/colecao'], ['wishes-gate','/desejos'], ['decks-gate','/decks'], ['settings-gate','/configuracoes'],
 ['matches-gate','/matches'], ['trades-gate','/trocas'], ['trade-detail-gate','/trocas/00000000-0000-0000-0000-000000000000'],
 ['how','/como-funciona'], ['privacy','/privacidade'], ['marketplace-terms','/termos-marketplace'], ['not-found','/pagina-inexistente-review'],
];

(async () => {
 const base = process.argv.find(x=>/^https?:/.test(x)) || 'http://localhost:3000';
 const widthsArg = process.argv.find(x=>x.startsWith('--widths='));
 const widths = widthsArg ? widthsArg.slice(9).split(',').map(Number) : [390,360];
 const filterArg = process.argv.find(x=>x.startsWith('--routes='));
 const filter = filterArg?.slice(9).split(',');
 const selected = filter ? routes.filter(([key])=>filter.includes(key)) : routes;
 const out = path.join(__dirname,'.local','account','public');
 fs.mkdirSync(out,{recursive:true});
 const browser = await chromium.launch({headless:true, channel: process.env.DUELINK_REVIEW_BROWSER || 'chrome'});
 const reports = [];
 try {
  for(const width of widths) for(const [key,route] of selected) {
   const page = await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   let response;
   try {
    response=await page.goto(base+route,{waitUntil:'load',timeout:45000});
    await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,8000))]));
    await page.waitForFunction(()=>{const e=document.querySelector('main button,main input');return !e||Object.keys(e).some(k=>k.startsWith('__reactProps$'));},null,{timeout:10000}).catch(()=>{});
    if(key==='expired-link')await page.locator('.auth-error[role="alert"]').waitFor({state:'visible',timeout:8000});
    // Resolve session/protected loading without sending any external form/action.
    await page.waitForFunction(()=>!document.querySelector('main .loading-state'),null,{timeout:12000}).catch(()=>{});
    await page.screenshot({path:path.join(out,`${width}-${key}.png`),fullPage:true,timeout:25000});
    const data=await page.evaluate(()=>{
     const visible=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>0&&b.height>0&&s.display!=='none'&&s.visibility!=='hidden'};
     const bounds=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y+scrollY,width:b.width,height:b.height,right:b.right}};
     return{
      viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,
      headings:[...document.querySelectorAll('main h1,main h2')].filter(visible).map(e=>e.textContent.trim()),
      sessionGate:document.querySelector('main')?.textContent.includes('Sua coleção começa com uma conexão.')||false,
      loading:Boolean(document.querySelector('main .loading-state')),
      outside:[...document.querySelectorAll('main h1,main h2,main h3,main p,main .button,main label,main input,main select,main textarea,main .text-link')].filter(visible).filter(e=>{const b=e.getBoundingClientRect();return b.left<-.5||b.right>innerWidth+.5}).map(e=>({tag:e.tagName,class:e.className,text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,100),...bounds(e)})),
      images:[...document.querySelectorAll('main img')].filter(visible).map(e=>({src:e.getAttribute('src'),loaded:e.complete&&e.naturalWidth>0,...bounds(e)})),
      fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),
      colors:{body:getComputedStyle(document.body).backgroundColor,main:document.querySelector('main')?getComputedStyle(document.querySelector('main')).color:null},
     };
    });
    if(key==='login'||key==='reset'){
     const toggle=page.getByRole('button',{name:'Mostrar senha',exact:true});
     if(await toggle.count()){await toggle.click();data.passwordToggle=await page.locator('input[name="password"]').getAttribute('type')==='text';await page.getByRole('button',{name:'Ocultar senha',exact:true}).click();}
    }
    reports.push({key,route,width,status:response?.status(),finalUrl:page.url(),...data,errors});
    console.log(JSON.stringify({key,width,status:response?.status(),overflow:data.pageWidth>width,outside:data.outside.length,loading:data.loading,errors:errors.length}));
   } catch(e){reports.push({key,route,width,error:String(e),errors});console.log(JSON.stringify({key,width,error:String(e)}));}
   await page.close();
   fs.writeFileSync(path.join(out,filter?'focused-report.json':'report.json'),JSON.stringify(reports,null,2));
  }
 } finally { const timer=setTimeout(()=>process.exit(process.exitCode||0),5000);await browser.close();clearTimeout(timer); }
})().catch(e=>{console.error(e);process.exitCode=1});
