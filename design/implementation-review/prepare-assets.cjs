const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const geometry = require('../figma/pixel-geometry.cjs');
const out = path.join(root, 'public/brand/pixel');
fs.mkdirSync(out, { recursive: true });
for (const position of ['top', 'bottom']) {
  const parts = geometry.band('pixel-band ' + position, position).match(/<svg[\s\S]*?<\/svg>/g);
  fs.writeFileSync(path.join(out, `band-${position}.svg`), parts[0].replace('<svg ', '<svg shape-rendering="crispEdges" '));
  fs.writeFileSync(path.join(out, `band-${position}-mobile.svg`), parts[1].replace('<svg ', '<svg shape-rendering="crispEdges" '));
}
for (const [name, svg] of Object.entries({
  orbit: geometry.orbit(), star: geometry.star(''), tiles: geometry.tiles(''),
  transition: geometry.transition(), 'panel-card': geometry.panel('card'),
  'panel-hero': geometry.panel('hero'), 'panel-match': geometry.panel('match'),
  'ribbon-primary': geometry.ribbon('button'), 'ribbon-secondary': geometry.ribbon('secondary'),
  'ribbon-idle': geometry.ribbon('idle'), 'ribbon-chip': geometry.ribbon('chip'),
  'badge-lime': geometry.badge(true), 'badge-purple': geometry.badge(false),
})) fs.writeFileSync(path.join(out, name + '.svg'), name === 'transition' ? svg.replace('<svg ', '<svg shape-rendering="crispEdges" ') : svg);
const iconDir = path.join(root, 'design/figma/icons');
const icons = Object.fromEntries(fs.readdirSync(iconDir).filter(n => n.endsWith('.svg')).map(n => [n.slice(0,-4), fs.readFileSync(path.join(iconDir,n),'utf8').replace(/^<svg[^>]*>|<\/svg>$/g, '').trim()]));
fs.writeFileSync(path.join(root,'src/components/design-icons.json'), JSON.stringify(icons,null,2)+'\n');
fs.copyFileSync(path.join(iconDir,'LICENSE'),path.join(out,'PHOSPHOR-LICENSE'));
fs.copyFileSync(path.join(root,'design/figma/.tools/ChakraPetch-Bold.ttf'),path.join(root,'public/fonts/chakra-petch-bold.ttf'));
console.log('Approved Figma geometry and licensed icon paths prepared.');
