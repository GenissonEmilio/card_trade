/** Refresh the complete searchable snapshot. A failed import never replaces the last valid one. */
import { writeFile, mkdir, rename } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const root = new URL('../src/data/', import.meta.url);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Duelink/2.0 (https://duelink.mage.dev.br)' },
        signal: AbortSignal.timeout(90000),
      });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return await response.json();
    } catch (error) {
      if (attempt === 2) throw error;
      await sleep(1500 * (attempt + 1));
    }
  }
}
async function tcgList(language, query = {}) {
  const result = [];
  for (let page = 1; page < 100; page++) {
    const url = new URL(`https://api.tcgdex.net/v2/${language}/cards`);
    Object.entries({ ...query, 'pagination:page': page, 'pagination:itemsPerPage': 2000 }).forEach(
      ([key, value]) => url.searchParams.set(key, String(value)),
    );
    const rows = await fetchJson(url);
    if (!Array.isArray(rows)) throw new Error('Invalid TCGdex catalog');
    result.push(...rows);
    if (rows.length < 2000) return result;
    await sleep(250);
  }
  throw new Error('TCGdex pagination did not finish');
}
await mkdir(root, { recursive: true });
console.log('Importing complete Yu-Gi-Oh! EN/PT catalogs…');
const en = (await fetchJson('https://db.ygoprodeck.com/api/v7/cardinfo.php')).data;
const pt = (await fetchJson('https://db.ygoprodeck.com/api/v7/cardinfo.php?language=pt')).data;
if (en.length < 10000 || pt.length < 8000) throw new Error('Yu-Gi-Oh! import looks incomplete');
const translated = new Map(pt.map((c) => [String(c.id), c]));
const yugioh = en
  .filter((c) => c.name !== '???')
  .map((c) => {
    const local = translated.get(String(c.id));
    return {
      id: String(c.id),
      game: 'yugioh',
      name: c.name,
      name_en: c.name,
      localized_name: local?.name,
      type: c.type,
      frameType: c.frameType,
      desc: local?.desc || c.desc,
      race: c.race,
      atk: c.atk,
      def: c.def,
      level: c.level,
      attribute: c.attribute,
      archetype: c.archetype,
      card_images: (c.card_images || []).map((i) => ({ ...i, id: String(i.id) })),
      card_sets: c.card_sets,
    };
  });
console.log('Importing Pokémon EN/PT names and physical sets…');
const pokeEn = await tcgList('en');
const pokePt = await tcgList('pt');
const pocket = await fetchJson('https://api.tcgdex.net/v2/en/series/tcgp');
const pocketSets = new Set(pocket.sets.map((s) => s.id));
const setsEn = await fetchJson('https://api.tcgdex.net/v2/en/sets');
const setsPt = await fetchJson('https://api.tcgdex.net/v2/pt/sets');
const setNames = new Map([...setsEn, ...setsPt].map((s) => [s.id, s.name]));
const categories = new Map();
for (const category of ['Pokemon', 'Trainer', 'Energy']) {
  console.log(`Classifying Pokémon ${category}…`);
  for (const c of await tcgList('en', { category: `eq:${category}` }))
    categories.set(c.id, category);
}
const basics = new Set((await tcgList('en', { stage: 'eq:Basic' })).map((c) => c.id));
const basicEnergy = new Set((await tcgList('en', { energyType: 'eq:Normal' })).map((c) => c.id));
const pokemonTypes = new Map();
for (const type of [
  'Grass',
  'Fire',
  'Water',
  'Lightning',
  'Psychic',
  'Fighting',
  'Darkness',
  'Metal',
  'Dragon',
  'Colorless',
  'Fairy',
]) {
  for (const c of await tcgList('en', { types: `eq:${type}` }))
    pokemonTypes.set(c.id, [...(pokemonTypes.get(c.id) || []), type]);
}
const localized = new Map(pokePt.map((c) => [c.id, c]));
const englishCards = new Map(pokeEn.map((c) => [c.id, c]));
const pokemon = [...new Map([...pokeEn, ...pokePt].map((c) => [c.id, c])).values()]
  .filter((c) => !pocketSets.has(c.id.slice(0, c.id.lastIndexOf('-'))))
  .map((c) => {
    const english = englishCards.get(c.id);
    const local = localized.get(c.id);
    const setId = c.id.slice(0, c.id.lastIndexOf('-'));
    const category = categories.get(c.id) || 'Unknown';
    const image = local?.image || english?.image;
    return {
      id: c.id,
      game: 'pokemon',
      name: english?.name || c.name,
      name_en: english?.name,
      localized_name: local?.name,
      image_url: image ? `${image}/high.webp` : undefined,
      set_id: setId,
      local_id: c.localId,
      type: category,
      frameType: 'pokemon',
      race: setNames.get(setId) || setId,
      desc: 'Consulte os detalhes para ver o texto e as características da carta.',
      card_images: [
        {
          id: c.id,
          image_url: image ? `${image}/high.webp` : '',
          image_url_small: image ? `${image}/low.webp` : '',
          image_url_cropped: '',
        },
      ],
      pokemon: {
        category,
        types: pokemonTypes.get(c.id),
        stage: basics.has(c.id) ? 'Basic' : undefined,
        ...(basicEnergy.has(c.id) ? { energyType: 'Normal' } : {}),
      },
    };
  });
if (pokemon.length < 15000) throw new Error('Pokémon import looks incomplete');
const report = {
  syncedAt: new Date().toISOString(),
  sources: { yugioh: 'https://ygoprodeck.com/api-guide/', pokemon: 'https://tcgdex.dev/' },
  yugioh: {
    sourceEnglish: en.length,
    sourcePortuguese: pt.length,
    imported: yugioh.length,
    withPortugueseName: yugioh.filter((c) => c.localized_name).length,
    excluded: 'Unrevealed-card placeholder (???)',
  },
  pokemon: {
    sourceEnglish: pokeEn.length,
    sourcePortuguese: pokePt.length,
    imported: pokemon.length,
    withPortugueseName: pokemon.filter((c) => c.localized_name).length,
    withImage: pokemon.filter((c) => c.image_url).length,
    excludedPocketSets: [...pocketSets],
    unknownCategory: pokemon.filter((c) => c.type === 'Unknown').length,
  },
};
const data = { report, cards: [...yugioh, ...pokemon] };
const temp = new URL('catalog.json.gz.next', root);
await writeFile(temp, gzipSync(JSON.stringify(data), { level: 9 }));
await rename(temp, new URL('catalog.json.gz', root));
await writeFile(new URL('catalog-report.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
