import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { Card, Game } from '@/types';
import { displayCardName, localizedNames, normalizeSearch } from './catalog';
type Snapshot = {
  report: {
    syncedAt: string;
    yugioh: { imported: number; withPortugueseName: number };
    pokemon: { imported: number; withPortugueseName: number };
  };
  cards: Card[];
};
let snapshot: Snapshot | undefined;
let byIdentity: Map<string, Card> | undefined;
let index: { card: Card; name: string; identifier: string; tokens: string }[] | undefined;
export function getCatalog() {
  if (!snapshot)
    snapshot = JSON.parse(
      gunzipSync(readFileSync(path.join(process.cwd(), 'src/data/catalog.json.gz'))).toString(
        'utf8',
      ),
    ) as Snapshot;
  return snapshot;
}
function catalogCardByIdentity(game: Game, id: string) {
  byIdentity ||= new Map(getCatalog().cards.map((card) => [`${card.game}:${card.id}`, card]));
  return byIdentity.get(`${game}:${id}`);
}
/** Public names only; batch reads never ship the complete catalog to the browser. */
export function catalogAliases(game: Game, cardIds: readonly string[]): Record<string, string[]> {
  if (cardIds.length > 100) throw new RangeError('Consulte até 100 cartas por lote.');
  const result: Record<string, string[]> = Object.create(null);
  for (const id of new Set(cardIds)) {
    const card = catalogCardByIdentity(game, id);
    result[id] = card
      ? [
          ...new Set(
            [
              card.name,
              card.name_en,
              card.localized_name,
              game === 'yugioh' ? localizedNames[id] : undefined,
            ].filter(
              (value): value is string => typeof value === 'string' && value.trim().length > 0,
            ),
          ),
        ]
      : [];
  }
  return result;
}
/** Full canonical ID result for trusted server-side marketplace filtering. */
export function matchingCatalogIds(game: Game, query: string): string[] {
  return searchCatalog({ game, query, limit: 100000 }).data.map((card) => card.id);
}
export function searchCatalog({
  game,
  query = '',
  type = '',
  attribute = '',
  offset = 0,
  limit = 24,
  sort = 'name',
}: {
  game: Game;
  query?: string;
  type?: string;
  attribute?: string;
  offset?: number;
  limit?: number;
  sort?: string;
}) {
  const source = getCatalog();
  index ||= source.cards.map((card) => ({
    card,
    name: normalizeSearch(displayCardName(card)),
    identifier: normalizeSearch(card.id),
    tokens: normalizeSearch(
      [
        card.name,
        card.name_en,
        card.localized_name,
        card.id,
        card.set_id,
        card.local_id,
        card.archetype,
        card.race,
        ...(card.card_sets?.map((s) => s.set_code) || []),
        card.game === 'yugioh' ? localizedNames[card.id] : '',
      ]
        .filter(Boolean)
        .join(' '),
    ),
  }));
  const search = normalizeSearch(query),
    words = search.split(' ').filter(Boolean);
  const rows = index.filter(
    ({ card, tokens }) =>
      card.game === game &&
      words.every((word) => tokens.includes(word)) &&
      (!attribute ||
        (game === 'yugioh'
          ? card.attribute === attribute
          : card.pokemon?.types?.includes(attribute))) &&
      (!type || matchesType(card, type)),
  );
  rows.sort((a, b) => {
    if (search) {
      const rank =
        Number(b.identifier === search) - Number(a.identifier === search) ||
        Number(b.name === search) - Number(a.name === search) ||
        Number(b.name.startsWith(search)) - Number(a.name.startsWith(search));
      if (rank) return rank;
    }
    const comparison =
      a.name.localeCompare(b.name, 'pt-BR', { numeric: true }) ||
      a.card.id.localeCompare(b.card.id);
    return sort === 'name_desc' ? -comparison : comparison;
  });
  return {
    data: rows.slice(offset, offset + limit).map((r) => r.card),
    total: rows.length,
    hasMore: offset + limit < rows.length,
    syncedAt: source.report.syncedAt,
    coverage: source.report[game],
    source: game === 'yugioh' ? 'YGOPRODeck' : 'TCGdex',
  };
}
export function matchesType(card: Card, type: string) {
  if (card.game === 'pokemon') return card.type.toLowerCase() === type.toLowerCase();
  if (type === 'monster') return /monster/i.test(card.type);
  return card.type.toLowerCase().includes(type.toLowerCase());
}
export async function getCatalogCard(game: Game, id: string): Promise<Card | undefined> {
  const card = catalogCardByIdentity(game, id);
  if (!card || game === 'yugioh') return card;
  try {
    const language = card.localized_name ? 'pt' : 'en';
    const response = await fetch(
      `https://api.tcgdex.net/v2/${language}/cards/${encodeURIComponent(id)}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(12000) },
    );
    if (!response.ok) return card;
    const detail = await response.json();
    const description = [
      detail.effect,
      ...(detail.abilities || []).map(
        (a: { name: string; effect: string }) => `${a.name}: ${a.effect}`,
      ),
      ...(detail.attacks || []).map(
        (a: { name: string; damage?: string | number; effect?: string }) =>
          `${a.name}${a.damage ? ` (${a.damage})` : ''}${a.effect ? `: ${a.effect}` : ''}`,
      ),
    ]
      .filter(Boolean)
      .join('\n\n');
    return {
      ...card,
      desc: description || 'Esta carta não possui texto de efeito no catálogo.',
      race: detail.set?.name || card.race,
      pokemon: {
        category: card.type,
        energyType: card.pokemon?.energyType || detail.energyType,
        hp: detail.hp,
        stage: card.pokemon?.stage || detail.stage,
        types: card.pokemon?.types,
        regulationMark: detail.regulationMark,
        legal: detail.legal,
        variants: detail.variants,
      },
      card_sets: [
        {
          set_name: detail.set?.name || card.race,
          set_code: `${card.set_id} ${card.local_id}`,
          set_rarity: detail.rarity || 'Não informada',
          set_price: '',
        },
      ],
    };
  } catch {
    return card;
  }
}
