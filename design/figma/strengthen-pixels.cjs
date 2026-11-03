const fs=require('fs'),path=require('path');const file=path.join(__dirname,'build-design.cjs');let s=fs.readFileSync(file,'utf8');
if(!s.includes("require('./pixel-geometry.cjs')"))s="const pixelArt=require('./pixel-geometry.cjs');\n"+s;
// Remove the slim edge decorations from the earlier direction.
s=s.replace(/<svg class="pixel-edge"[\s\S]*?<\/svg>/g,'${pixelArt.band(\'pixel-band top\',\'top\')}');
s=s.replace(/<svg class="pixel-edge bottom"[\s\S]*?<\/svg>/g,'${pixelArt.band(\'pixel-band bottom\',\'bottom\')}');
s=s.replace('<div class="orbit"></div>',"${pixelArt.orbit()}${pixelArt.tiles('pixel-tiles left')}${pixelArt.tiles('pixel-tiles right')}");
s=s.replace('<div class="spark a">✦</div><div class="spark b">✦</div>',"${pixelArt.star('pixel-spark a')}${pixelArt.star('pixel-spark b')}");
s=s.replace('<div class="hero-card left"><img','<div class="hero-card left">${pixelArt.panel(\'hero\')}<img').replace('<div class="hero-card right"><img','<div class="hero-card right">${pixelArt.panel(\'hero\')}<img');
s=s.replace('<div class="match"><div class="match-icon">',"<div class=\"match\">${pixelArt.panel('match')}<div class=\"match-icon\">");
s=s.replace('<article class="card"><div class="corner-cut">',"<article class=\"card\">${pixelArt.panel('card')}<div class=\"corner-cut\">");
s=s.replace('<section class="closing"><div class="wrap">',"<section class=\"closing\">${pixelArt.transition()}<div class=\"wrap\">");
s=s.replace('<div>${t}</div>${ico(icon',"${pixelArt.panel(primary?'button':'secondary')}<div>${t}</div>${ico(icon");
// Extra space belongs to decorative pixel bands; product copy stays in its own area.
fs.writeFileSync(file,s);
