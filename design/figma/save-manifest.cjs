const fs=require('fs'),path=require('path');
const file=path.join(__dirname,'build-design.cjs');let source=fs.readFileSync(file,'utf8');
source=source.replace("colors:{background:'#080b10',surface:'#121a25',gold:'#ceff3b',cyan:'#c384ff',text:'#f4f4f0',muted:'#9ca5b2'}","colors:{background:'#13071c',surface:'#240a36',lime:'#ceff3b',violet:'#c047ff',ivory:'#f7f7e8',text:'#f7f7e8',muted:'#b3a7bd'}");fs.writeFileSync(file,source);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json')));
manifest.colors={background:'#13071c',surface:'#240a36',lime:'#ceff3b',violet:'#c047ff',ivory:'#f7f7e8',text:'#f7f7e8',muted:'#b3a7bd'};
manifest.figma={desktop:'3:2',mobile:'4:252',states:'9:6347'};
manifest.pipeline='DOM medido no navegador → SVG sem foreignObject → texto, vetores, imagens e grupos nativos pela Claude Bridge';
fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify(manifest,null,2));
