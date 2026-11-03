const fs=require('fs'),path=require('path');const p=path.join(__dirname,'build-design.cjs');let s=fs.readFileSync(p,'utf8');
const original='<div class="card-add">${pixelArt.badge(true)}${ico(\'Plus\',16,\'#ceff3b\')}</div>';
const replacement='<button type="button" class="card-add" aria-label="Adicionar à coleção: ${names[id]}" title="Adicionar à coleção">${pixelArt.badge(true)}<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="#270d35" stroke-width="2.4" stroke-linecap="square"/></svg></button>';
if(!s.includes(replacement)){if(!s.includes(original))throw Error('Card action source did not match');s=s.replace(original,replacement)}
fs.writeFileSync(p,s);
