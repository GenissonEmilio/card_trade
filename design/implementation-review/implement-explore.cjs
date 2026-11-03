const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../../src/components/explore.tsx');
let s=fs.readFileSync(file,'utf8');
s=s.replace("import { Empty } from './ui';", "import { Empty } from './ui';\nimport { DesignIcon, PixelArt, RibbonLabel, type DesignIconName } from './pixel-design';");
const start=s.indexOf('      <div className="welcome-line">'),end=s.indexOf('      <div className="stats-strip">',start);
if(start<0||end<0)throw Error('Hero source not found');
s=s.slice(0,start)+`      <section className="pixel-hero" aria-labelledby="hero-heading">
        <picture><source media="(max-width: 767px)" srcSet="/brand/pixel/band-top-mobile.svg"/><img className="pixel-band top" src="/brand/pixel/band-top.svg" alt="" aria-hidden="true"/></picture>
        <div className="pixel-aura left"/><div className="pixel-aura right"/>
        <PixelArt name="orbit" className="pixel-orbit"/>
        <PixelArt name="tiles" className="pixel-tiles left"/><PixelArt name="tiles" className="pixel-tiles right"/>
        <div className="pixel-hero-card left" aria-hidden="true"><PixelArt name="panel-hero"/><img src={game==='pokemon'?cardImage('base1-2','pokemon'):'/cards/46986414.jpg'} alt=""/></div>
        <div className="pixel-hero-card right" aria-hidden="true"><PixelArt name="panel-hero"/><img src={game==='pokemon'?cardImage('base1-4','pokemon'):'/cards/89631139.jpg'} alt=""/></div>
        <PixelArt name="star" className="pixel-spark a"/><PixelArt name="star" className="pixel-spark b"/>
        <div className="pixel-hero-copy">
          <div className="eyebrow">O PONTO DE ENCONTRO DOS DUELISTAS</div>
          <div className="pixel-hero-tag">SUA COLEÇÃO TEM NOVAS POSSIBILIDADES</div>
          <h1 id="hero-heading">Sua próxima carta.<span>Sua próxima conexão.</span></h1>
          <p>Cartas que você tem. Cartas que você quer.<br/>Yu-Gi-Oh! e Pokémon na comunidade de Lagarto.</p>
          <div className="hero-actions">
            <a href="#explorar" className="pixel-ribbon primary"><RibbonLabel primary icon="cards">Explorar cartas</RibbonLabel></a>
            <Link href={user?'/colecao':'/cadastro'} className="pixel-ribbon secondary"><RibbonLabel icon="cards-three">Montar minha coleção</RibbonLabel></Link>
          </div>
          <div className="pixel-hero-proof"><DesignIcon name="seal-check" size={16}/><span>Uma comunidade local. Infinitas possibilidades.</span></div>
        </div>
        <div className="pixel-match"><PixelArt name="panel-match"/><span className="pixel-match-icon"><DesignIcon name="sparkle" size={22}/></span><div><strong>O match perfeito existe.</strong><small>Encontre a peça que falta no seu deck.</small></div></div>
        <span className="pixel-coordinate">35° · 10°55′ S · 37°39′ O</span><span className="pixel-location">LAGARTO, SERGIPE</span>
        <picture><source media="(max-width: 767px)" srcSet="/brand/pixel/band-bottom-mobile.svg"/><img className="pixel-band bottom" src="/brand/pixel/band-bottom.svg" alt="" aria-hidden="true"/></picture>
      </section>
`+s.slice(end);
s=s.replace('<GameSwitch />','<GameSwitch pixel />');
s=s.replace('<span className="gold-text">.</span>','<span>.</span>');
s=s.replace('<div className="catalog-title">','<div className="catalog-title">');
s=s.replace('<Search size={19} />','<DesignIcon name="magnifying-glass" size={19} />');
s=s.replace('              Buscar\n','              <span className="control-label">Buscar</span>\n');
s=s.replace('            <SlidersHorizontal size={17} />\n            Filtros{attribute && <i className="tiny-dot" />}','            <RibbonLabel icon="faders-horizontal">Filtros</RibbonLabel>{attribute && <i className="tiny-dot" />}');
s=s.replace('            <span className="sr-only">Ordenar cartas</span>','            <span className="sr-only">Ordenar cartas</span>\n            <span className="ribbon-icon purple"><DesignIcon name="arrow-down" size={18}/></span>');
s=s.replace('              <Icon size={14} />\n              {label}',`              <RibbonLabel primary icon={({ '': 'cards-three', monster:'sword',spell:'magic-wand',trap:'shield',fusion:'intersect',synchro:'circles-three',xyz:'stack',link:'link',Pokemon:'pokemon',Trainer:'cards',Energy:'sparkle' } as Record<string, DesignIconName>)[id]}>{label}</RibbonLabel>`);
s=s.replace("{categories.map(({ id, label, icon: Icon }) => (","{categories.map(({ id, label }) => (");
s=s.replace("onClick={() => setType(id)}>","onClick={() => setType(id)} aria-pressed={type === id}>");
s=s.replace("onClick={() => setLocal(false)} className=", "onClick={() => setLocal(false)} aria-pressed={!local} className=");
s=s.replace("onClick={() => setLocal(true)} className=", "onClick={() => setLocal(true)} aria-pressed={local} className=");
s=s.replace('            onClick={() => setFilters(!filters)}','            onClick={() => setFilters(!filters)}\n            aria-expanded={filters}\n            aria-controls="catalog-expanded-filters"');
s=s.replace('<div className="expanded-filters">','<div className="expanded-filters" id="catalog-expanded-filters">');
s=s.replace('{loading ? <Loader2 className="spin" size={16} /> : <ArrowDown size={16} />}\n                Descobrir mais cartas','<RibbonLabel icon="arrow-down">{loading && <Loader2 className="spin" size={16} />}Descobrir mais cartas</RibbonLabel>');
const bottom=s.indexOf('      <section className="bottom-cta">'),bottomEnd=s.indexOf('      {detail && (',bottom);
s=s.slice(0,bottom)+`      <section className="pixel-closing"><PixelArt name="transition" className="pixel-transition"/><div className="pixel-wrap"><div className="pixel-closing-copy"><span className="eyebrow">CONNECT. TRADE. DUEL.</span><h3>O seu repetido pode ser o desejo de alguém.</h3><p>Organize sua coleção e deixe as conexões acontecerem.</p></div><Link className="pixel-ribbon primary" href={user?'/colecao':'/cadastro'}><RibbonLabel primary icon="cards-three">Começar minha coleção</RibbonLabel></Link></div></section>
`+s.slice(bottomEnd);
const iconNames={Layers3:'cards-three',ArrowLeftRight:'arrows-clockwise',Users:'users-three',ArrowUpRight:'arrow-up-right',Heart:'heart',MapPin:'map-pin',Compass:'cards',ChevronDown:'caret-down'};
for(const [old,name]of Object.entries(iconNames))s=s.replace(new RegExp('<'+old+' size=\\{(\\d+)\\} />','g'),'<DesignIcon name="'+name+'" size={$1} />');
fs.writeFileSync(file,s);
console.log('Explore JSX adapted; original data state and handlers retained.');
