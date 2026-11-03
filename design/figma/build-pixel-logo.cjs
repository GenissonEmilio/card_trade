const fs=require('fs'),path=require('path');
const opentype=require('./.tools/node_modules/opentype.js');
const out=path.resolve(__dirname,'../../public/brand');
const color={ink:'#16071f',purple:'#7023a3',light:'#bf4bff',cream:'#f7f7e8',lime:'#ceff3b',shade:'#3a104f'};
function frame(x,y,w,h,s){return `M${x+s*2} ${y}H${x+w-s*2}V${y+s}H${x+w-s}V${y+s*2}H${x+w}V${y+h-s*2}H${x+w-s}V${y+h-s}H${x+w-s*2}V${y+h}H${x+s*2}V${y+h-s}H${x+s}V${y+h-s*2}H${x}V${y+s*2}H${x+s}V${y+s}H${x+s*2}Z`}
function rect(x,y,w,h,fill){return `<path fill="${fill}" d="M${x} ${y}h${w}v${h}h-${w}Z"/>`}
const ringOuter=frame(320,24,512,528,48),ringInner=frame(352,56,448,464,40);
const ring=`<g id="moldura-pixel"><path fill="${color.purple}" fill-rule="evenodd" d="${ringOuter}${ringInner}"/>${rect(368,72,48,24,color.light)}${rect(736,448,48,24,color.light)}${rect(320,168,24,48,color.lime)}${rect(808,360,24,48,color.lime)}</g>`;
const card=(x,y)=>`<g><path d="${frame(x+16,y+16,168,216,12)}" fill="${color.purple}"/><path d="${frame(x,y,168,216,12)}" fill="${color.ink}" stroke="${color.cream}" stroke-width="8"/><path d="${frame(x+20,y+20,128,176,8)}" fill="${color.shade}" stroke="${color.light}" stroke-width="8"/>${rect(x+40,y+40,40,8,color.cream)}${rect(x+40,y+152,88,8,color.light)}<path d="M${x+76} ${y+68}h24v16h16v24h-16v16h-24v-16h-16v-24h16Z" fill="${color.lime}"/></g>`;
const links=`<g id="elo-pixel"><path d="${frame(488,148,112,104,16)}${frame(520,180,48,40,8)}" fill="${color.lime}" fill-rule="evenodd" stroke="${color.ink}" stroke-width="8"/><path d="${frame(552,188,112,104,16)}${frame(584,220,48,40,8)}" fill="${color.cream}" fill-rule="evenodd" stroke="${color.ink}" stroke-width="8"/>${rect(552,180,16,40,color.lime)}${rect(568,220,16,32,color.ink)}</g>`;
const icon=`${ring}<g id="cartas-pixel">${card(392,64)}${card(592,104)}</g>${links}`;
const fontBytes=fs.readFileSync(path.join(__dirname,'.tools/ChakraPetch-Bold.ttf'));
const font=opentype.parse(fontBytes.buffer.slice(fontBytes.byteOffset,fontBytes.byteOffset+fontBytes.byteLength));
const wordPath=font.getPath('DUELINK',0,0,1000,{kerning:true}),box=wordPath.getBoundingBox();
const scale=Math.min(992/(box.x2-box.x1),184/(box.y2-box.y1));
const textTransform=`translate(${((1152-(box.x2-box.x1)*scale)/2-box.x1*scale).toFixed(3)} ${(304-box.y1*scale).toFixed(3)}) scale(${scale.toFixed(6)})`;
const textPath=wordPath.toPathData(2);
const plate=frame(16,272,1120,240,16);
const word=`<g id="letreiro-legivel"><path d="${plate}" transform="translate(0 16)" fill="${color.purple}"/><path d="${plate}" fill="${color.ink}" stroke="${color.cream}" stroke-width="8"/><g transform="translate(0 8)"><path d="${textPath}" transform="${textTransform}" fill="${color.purple}"/></g><path id="DUELINK" d="${textPath}" transform="${textTransform}" fill="${color.cream}"/>${rect(824,496,224,8,color.lime)}</g>`;
const full=`<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="576" viewBox="0 0 1152 576" role="img" aria-label="Duelink"><title>Duelink — marca pixelada</title>${icon}${word}</svg>`;
fs.writeFileSync(path.join(out,'duelink-logo-pixel.svg'),full);
fs.writeFileSync(path.join(out,'duelink-simbolo-pixel.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="576" height="576" viewBox="288 0 576 576" role="img" aria-label="Símbolo Duelink"><title>Duelink — cartas conectadas</title>${icon}</svg>`);
console.log('SVG logo and symbol created');
