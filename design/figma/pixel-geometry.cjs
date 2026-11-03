// Vector pixel geometry. Large modules form the composition, not a raster filter.
const cream='#f7f7e8',purple='#180522',lime='#ceff3b';
function svg(cls,w,h,body){return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`}
function cells(points,unit,color){return points.map(([x,y])=>`<rect x="${x*unit}" y="${y*unit}" width="${unit}" height="${unit}" fill="${color}"/>`).join('')}
function band(cls,position){
 const u=32,w=1440,h=160,cols=45;
 const skyline=position==='top'?[5,3,2,4,2,1,2,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,2,1,3,1,2,4,3,5]:[3,4,2,3,1,2,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,2,1,3,1,2,3,4,2];
 let body='';for(let c=0;c<cols;c++){const n=skyline[c];if(n)body+=`<rect x="${c*u}" y="${position==='top'?0:h-n*u}" width="${u}" height="${n*u}" fill="${cream}"/>`}
 const loose=position==='top'?[[2,4],[4,4],[6,2],[8,2],[35,2],[38,3],[41,4],[43,4]]:[[0,0],[2,0],[4,1],[7,3],[9,3],[35,3],[37,2],[40,0],[43,0]];
 body+=cells(loose,u,cream);
 const mobileHeights=position==='top'?[6,3,4,2,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,2,1,3,4,5]:[4,2,3,1,2,0,1,0,0,0,0,0,0,0,0,0,0,1,0,2,1,3,2,4,3];
 const mh=position==='top'?112:96;let small='';for(let c=0;c<25;c++){const n=mobileHeights[c];if(n)small+=`<rect x="${c*16}" y="${position==='top'?0:mh-n*16}" width="16" height="${n*16}" fill="${cream}"/>`}
 small+=cells(position==='top'?[[2,5],[4,3],[20,4],[23,6]]:[[0,0],[3,1],[6,3],[18,3],[22,0]],16,cream);
 return svg(cls+' desktop-art',w,h,body)+svg(cls+' mobile-art',390,mh,small);
}
function orbit(){
 const path='M96 0H416V32H480V96H512V416H480V480H416V512H96V480H32V416H0V96H32V32H96Z';
 return svg('pixel-orbit',512,512,`<path d="${path}" fill="none" stroke="#67318a" stroke-width="2"/><path d="M96 0H160M512 352V416H480V480H416M0 160V96H32V32H96" fill="none" stroke="#c047ff" stroke-width="8"/>${cells([[1,1],[14,13]],32,lime)}`);
}
function star(cls){return svg(cls,64,64,'<path fill="#ceff3b" d="M24 0H40V16H48V24H64V40H48V48H40V64H24V48H16V40H0V24H16V16H24Z"/>')}
function tiles(cls){return svg(cls,224,224,cells([[0,0],[2,0],[4,0],[6,1],[1,2],[2,2],[4,2],[5,3],[0,4],[2,4],[4,4],[6,5],[1,6],[3,6],[5,6]],32,'#7720a9')+cells([[2,1],[3,3],[6,3],[1,5]],32,'#39104e'))}
function transition(){const u=24;let body='';for(let c=0;c<60;c++){const heights=[1,2,0,3,1,4,2,1,3,0,2,4,1,2,0,1,3,2,4,1];const n=heights[c%heights.length];if(n)body+=`<rect x="${c*u}" y="0" width="24" height="${n*u}" fill="${cream}"/>`;if(c%5===1||c%7===4)body+=`<rect x="${c*u}" y="${(n+1)*u}" width="24" height="24" fill="${cream}"/>`}
return svg('pixel-transition',1440,144,body)}
function ribbon(kind='secondary'){
 const themes={button:[lime,'#a7cc28','#ad52d7'],secondary:['#6b1c96','#9c65b6',lime],active:['#6b1c96','#6b1c96',lime],chip:[lime,'#9ab43c','#7a349a'],idle:['#eee7f2','#b5a0c2','#9f76b0']};
 const [fill,stroke,texture]=themes[kind]||themes.secondary;
 let dots='';for(let y=8;y<=48;y+=4)for(let x=6;x<=210;x+=4){const hidden=y<44&&x>=14-(y-4)*13/40&&x+1.4<=219-(y-4)*14/40;if(!hidden&&(x+y)%12!==0)dots+=`M${x} ${y}h1.4v1.4h-1.4Z`;}
 return svg('ribbon-base',220,50,`<path d="${dots}" fill="${texture}" opacity=".55"/><path d="M14 4H219L205 44H1Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`);
}
function badge(primary=false){return svg('ribbon-badge-shape',46,44,`<path d="M7 1H45L38 43H0Z" fill="${primary?'#ceff3b':'#6b1c96'}"/>`)}
function panel(kind){if(kind==='button'||kind==='secondary')return ribbon(kind);const config={match:[510,88,12,'#2b103e','#a56ec2'],card:[294,454,16,'#240a36','#622c7e'],hero:[205,298,8,'#461660','#c384ff']};const [w,h,u,fill,stroke]=config[kind];const p=`M${u*2} 0H${w-u*2}V${u}H${w-u}V${u*2}H${w}V${h-u*2}H${w-u}V${h-u}H${w-u*2}V${h}H${u*2}V${h-u}H${u}V${h-u*2}H0V${u*2}H${u}V${u}H${u*2}Z`;
return svg('pixel-panel-shape',w,h,`<path d="${p}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`)}
module.exports={band,orbit,star,tiles,transition,panel,ribbon,badge};
