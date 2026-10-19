import { describe, expect, it } from 'vitest';
import { getCatalog, searchCatalog } from '@/lib/catalog-server';
import { collectionCard, displayCardName, normalizeSearch } from '@/lib/catalog';
describe('complete multi-game catalog', () => {
  it('imports all source records except documented exclusions and preserves untranslated cards', () => {
    const { cards, report } = getCatalog();
    expect(report.yugioh.imported).toBeGreaterThan(14000);
    expect(report.pokemon.imported).toBeGreaterThan(20000);
    expect(new Set(cards.map((card) => `${card.game}:${card.id}`)).size).toBe(cards.length);
    expect(cards.some((card) => card.game === 'yugioh' && !card.localized_name)).toBe(true);
    expect(cards.some((card) => card.game === 'pokemon' && !card.localized_name)).toBe(true);
    expect(cards.every((card) => card.id && typeof card.id === 'string')).toBe(true);
  });
  it('searches Portuguese, English, accents and IDs without the old one-card shortcut', () => {
    const dragon = searchCatalog({ game: 'yugioh', query: 'dragao' });
    expect(dragon.total).toBeGreaterThan(100);
    const accented = searchCatalog({ game: 'yugioh', query: 'força do espelho' });
    expect(accented.data.map((c) => c.id)).toEqual(
      searchCatalog({ game: 'yugioh', query: 'forca do espelho' }).data.map((c) => c.id),
    );
    expect(
      searchCatalog({ game: 'yugioh', query: 'Blue Eyes White Dragon' }).data.some(
        (c) => c.id === '89631139',
      ),
    ).toBe(true);
    expect(searchCatalog({ game: 'yugioh', query: '89631139' }).data[0]?.id).toBe('89631139');
    expect(searchCatalog({ game: 'yugioh', query: 'mago' }).total).toBeGreaterThan(1);
  });
  it('finds Pokémon trainers in Portuguese, physical editions and category/type filters', () => {
    expect(
      searchCatalog({ game: 'pokemon', query: 'pesquisa de professores' }).total,
    ).toBeGreaterThan(1);
    expect(
      searchCatalog({ game: 'pokemon', query: 'sv03.5 151' }).data.some(
        (c) => c.id === 'sv03.5-151',
      ),
    ).toBe(true);
    expect(
      searchCatalog({ game: 'pokemon', type: 'Trainer' }).data.every((c) => c.type === 'Trainer'),
    ).toBe(true);
    const fire = searchCatalog({ game: 'pokemon', attribute: 'Fire' });
    expect(fire.total).toBeGreaterThan(100);
    expect(fire.data.every((c) => c.pokemon?.types?.includes('Fire'))).toBe(true);
    expect(getCatalog().cards.some((c) => c.game === 'pokemon' && c.set_id === 'A1')).toBe(false);
  });
  it('paginates through the end of both complete catalogs without duplicates', () => {
    for (const game of ['yugioh', 'pokemon'] as const) {
      const first = searchCatalog({ game, limit: 100000 });
      expect(first.data).toHaveLength(first.total);
      const last = searchCatalog({ game, offset: first.total - 2 });
      expect(last.data).toHaveLength(2);
      expect(last.hasMore).toBe(false);
      expect(last.data.map((c) => c.id)).toEqual(first.data.slice(-2).map((c) => c.id));
      expect(first.data.every((c) => c.game === game)).toBe(true);
    }
  });
  it('keeps legacy Yu-Gi-Oh! rows readable and never applies their aliases to Pokémon IDs', () => {
    expect(
      collectionCard({ card_id: 46986414, card_name: 'Dark Magician', card_type: 'Normal Monster' })
        .game,
    ).toBe('yugioh');
    expect(displayCardName({ id: '46986414', game: 'pokemon', name: 'Other game' })).toBe(
      'Other game',
    );
    expect(normalizeSearch('Pokémon — Mago “Negro”')).toBe('pokemon mago negro');
  });
});
