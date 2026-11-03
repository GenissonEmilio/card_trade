const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/vinic/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const esbuild=require('./.tools/node_modules/esbuild');
const m=require('./manifest.json');
(async()=>{
await esbuild.build({entryPoints:[path.join(__dirname,'.tools/node_modules/dom-to-svg/lib/index.js')],bundle:true,format:'iife',globalName:'domSVG',outfile:path.join(__dirname,'.tools/dom-svg.js')});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const targets=process.argv[2]==='states'?[['extras',{name:'states',path:m.states,width:1248}]]:['desktop','mobile'].flatMap(mode=>m.sections[mode].filter(p=>process.argv[2]!=='catalog'||p.name==='catalog').map(p=>[mode,p]));
try{for(const [mode,p] of targets){
 const page=await browser.newPage({viewport:{width:p.width,height:1000}});await page.goto(pathToFileURL(p.path).href);await page.evaluate(()=>document.fonts.ready);
 await page.addScriptTag({path:path.join(__dirname,'.tools/dom-svg.js')});
 const r=await page.evaluate(()=>{
   const source=document.querySelector('.screen')||document.querySelector('.state'),rect=source.getBoundingClientRect();
   for(const el of [...source.querySelectorAll('*')])if(el.isConnected){const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')el.remove();}
   // Capture layout without transforms, then restore geometric rotation in SVG.
   // dom-to-svg otherwise exports the rotated bounding box as a stretched image.
   const rotated=[];
   for(const el of source.querySelectorAll('.hero-card')){
     const transform=getComputedStyle(el).transform,matrix=new DOMMatrix(transform),angle=Math.atan2(matrix.b,matrix.a)*180/Math.PI;
     el.style.transform='none';const r=el.getBoundingClientRect();rotated.push({className:el.className,angle,cx:r.x+r.width/2,cy:r.y+r.height/2});
   }
   const shadows=[];
   for(const el of source.querySelectorAll('*')){
     if(!(el instanceof HTMLElement))continue;
     const cs=getComputedStyle(el);if(cs.boxShadow==='none')continue;
     const match=cs.boxShadow.match(/(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?/);
     if(match&&Number(match[4])===0){const r=el.getBoundingClientRect();el.dataset.nativeShadow=String(shadows.length);shadows.push({x:r.x+Number(match[2]),y:r.y+Number(match[3]),width:r.width,height:r.height,color:match[1],rx:parseFloat(cs.borderRadius)||0});}
   }
   const doc=domSVG.elementToSVG(source),svg=doc.documentElement;
   for(const r of rotated){const group=[...svg.querySelectorAll('g[data-tag]')].find(g=>g.getAttribute('class')===r.className);if(group){group.setAttribute('transform',`rotate(${r.angle} ${r.cx} ${r.cy})`);group.removeAttribute('mask');for(const masked of group.querySelectorAll('[mask]'))masked.removeAttribute('mask');for(const mask of group.querySelectorAll('mask'))mask.remove();}}
   // Restore crisp offset shadows which the SVG serializer does not emit.
   for(const el of source.querySelectorAll('[data-native-shadow]')){
     const tag=el.tagName.toLowerCase(),cls=el.className,record=shadows[Number(el.dataset.nativeShadow)];
     const candidates=[...svg.querySelectorAll(`g[data-tag="${tag}"]`)].filter(g=>g.getAttribute('class')===cls&&!g.hasAttribute('data-shadow-restored'));
     const group=candidates[0];if(!group)continue;group.setAttribute('data-shadow-restored','true');
     const bg=group.querySelector('[data-stacking-layer="rootBackgroundAndBorders"]');if(!bg)continue;
     const shadow=doc.createElementNS('http://www.w3.org/2000/svg','rect');for(const [key,value]of Object.entries(record))shadow.setAttribute(key==='color'?'fill':key,String(value));bg.insertBefore(shadow,bg.firstChild);
   }
   svg.setAttribute('width',rect.width);svg.setAttribute('height',rect.height);svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
   const texts=[],context=document.createElement('canvas').getContext('2d');
   for(const text of svg.querySelectorAll('text')){
      const raw=text.getAttribute('font-family')||'';const family=raw.split(',')[0].replace(/["']/g,'').trim();if(family)text.setAttribute('font-family',family);
      if(text.getAttribute('dominant-baseline')==='text-after-edge'){
        const size=parseFloat(text.getAttribute('font-size')),weight=text.getAttribute('font-weight')||'400';context.font=`${weight} ${size}px "${family}"`;
        const descent=context.measureText('Hg').fontBoundingBoxDescent||0;
        text.removeAttribute('dominant-baseline');for(const span of text.querySelectorAll('tspan[y]'))span.setAttribute('y',Number(span.getAttribute('y'))-descent);
      }
      texts.push({text:text.textContent,font:family,weight:text.getAttribute('font-weight')});
   }
   return {svg:new XMLSerializer().serializeToString(svg),width:rect.width,height:rect.height,texts,images:svg.querySelectorAll('image').length};
 });
 const file=path.join(__dirname,mode+'-'+p.name+'-native.svg');fs.writeFileSync(file,r.svg);delete r.svg;
 fs.writeFileSync(file.replace('.svg','.json'),JSON.stringify(r,null,2));
 console.log(mode,p.name,r.width,r.height,'texts',r.texts.length,'images',r.images);
 await page.close();
}}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
