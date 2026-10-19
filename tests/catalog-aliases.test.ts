import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/catalog-aliases/route';
import { catalogAliases, matchingCatalogIds } from '@/lib/catalog-server';
import { normalizeSearch } from '@/lib/catalog';
describe('bounded bilingual marketplace aliases', () => {
  it('finds a Portuguese listing by its English canonical name and vice versa', () => {
    const aliases = catalogAliases('yugioh', ['46986414'])['46986414'];
    expect(aliases).toContain('Dark Magician');
    expect(aliases).toContain('Mago Negro');
    const searchable = normalizeSearch(['Mago Negro', ...aliases].join(' '));
    expect(searchable).toContain(normalizeSearch('Dark Magician'));
    expect(matchingCatalogIds('yugioh', 'Mago Negro')).toContain('46986414');
    expect(matchingCatalogIds('yugioh', 'Dark Magician')).toContain('46986414');
  });
  it('scopes every ID to the requested game and omits missing IDs without falling back across games', () => {
    expect(catalogAliases('pokemon', ['46986414'])['46986414']).toEqual([]);
    const translated = catalogAliases('pokemon', ['sv03.5-189'])['sv03.5-189'];
    expect(translated).toContain('Golem ex');
    expect(translated.length).toBeGreaterThan(0);
    expect(catalogAliases('yugioh', ['sv03.5-189'])['sv03.5-189']).toEqual([]);
  });
  it('rejects oversized batches and returns only names for requested cards', () => {
    expect(() => catalogAliases('yugioh', Array(101).fill('46986414'))).toThrow(RangeError);
    expect(Object.keys(catalogAliases('yugioh', ['46986414', '46986414']))).toEqual(['46986414']);
    expect(JSON.stringify(catalogAliases('yugioh', ['46986414']))).not.toContain('card_images');
    expect(catalogAliases('pokemon', ['__proto__'])['__proto__']).toEqual([]);
  });
  it('validates API batch size, game and identifier syntax', async () => {
    for (const query of [
      'game=magic&ids=46986414',
      'game=pokemon&ids=../secret',
      `game=yugioh&ids=${Array(101).fill('46986414').join(',')}`,
    ]) {
      expect(
        (await GET(new NextRequest(`https://duelink.test/api/catalog-aliases?${query}`))).status,
      ).toBe(400);
    }
    const response = await GET(
      new NextRequest('https://duelink.test/api/catalog-aliases?game=yugioh&ids=46986414'),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.game).toBe('yugioh');
    expect(body.aliases['46986414']).toContain('Dark Magician');
    expect(Object.keys(body.aliases)).toHaveLength(1);
  });
});
