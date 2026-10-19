import type { Deck, DeckCard } from '@/types';
import { normalizeSearch } from './catalog';
export function validateDeck(
  deck: Pick<Deck, 'game' | 'format'>,
  cards: Pick<DeckCard, 'quantity' | 'card_data' | 'section'>[],
) {
  const errors: string[] = [];
  const totals = { main: 0, extra: 0, side: 0 };
  const names = new Map<string, number>();
  let basics = 0;
  for (const line of cards) {
    totals[line.section] += line.quantity;
    if (line.card_data.game !== deck.game) errors.push('Há uma carta de outro jogo neste deck.');
    const card = line.card_data;
    if (deck.game === 'pokemon' && card.type === 'Pokemon' && card.pokemon?.stage === 'Basic')
      basics += line.quantity;
    if (!(
      deck.game === 'pokemon' &&
      card.type === 'Energy' &&
      card.pokemon?.energyType === 'Normal'
    )) {
      const name = normalizeSearch(card.name_en || card.name);
      names.set(name, (names.get(name) || 0) + line.quantity);
    }
  }
  if (deck.game === 'pokemon') {
    if (totals.main !== 60) errors.push(`O deck precisa de 60 cartas; você tem ${totals.main}.`);
    if (!basics) errors.push('Inclua pelo menos um Pokémon Básico.');
    if (totals.extra || totals.side) errors.push('Pokémon TCG não usa Extra Deck ou Side Deck.');
    if ([...names.values()].some((quantity) => quantity > 4))
      errors.push('Há mais de 4 cartas com o mesmo nome (exceto Energia Básica).');
  } else {
    if (totals.main < 40 || totals.main > 60)
      errors.push(`O Main Deck precisa de 40 a 60 cartas; você tem ${totals.main}.`);
    if (totals.extra > 15) errors.push('O Extra Deck permite até 15 cartas.');
    if (totals.side > 15) errors.push('O Side Deck permite até 15 cartas.');
    if ([...names.values()].some((quantity) => quantity > 3))
      errors.push('Use até 3 cópias do mesmo nome, somando Main, Extra e Side.');
    for (const line of cards) {
      const extra = /fusion|synchro|xyz|link/i.test(line.card_data.type);
      if (line.section === 'main' && extra)
        errors.push('Monstros de Fusão, Sincro, Xyz e Link pertencem ao Extra Deck ou Side Deck.');
      if (line.section === 'extra' && !extra)
        errors.push('O Extra Deck aceita apenas monstros de Fusão, Sincro, Xyz e Link.');
    }
  }
  return { errors: [...new Set(errors)], totals, total: totals.main + totals.extra + totals.side };
}
export function exportDeck(
  deck: Pick<Deck, 'name' | 'game'>,
  lines: Pick<DeckCard, 'quantity' | 'card_data' | 'section'>[],
) {
  return [
    `# ${deck.name}`,
    `# Duelink · ${deck.game === 'pokemon' ? 'Pokémon' : 'Yu-Gi-Oh!'}`,
    ...(['main', 'extra', 'side'] as const).flatMap((section) => {
      const rows = lines.filter((line) => line.section === section);
      return rows.length
        ? [
            `\n# ${section.toUpperCase()}`,
            ...rows.map(
              ({ quantity, card_data: c }) =>
                `${quantity} ${c.name_en || c.name}${c.game === 'pokemon' ? ` (${c.set_id || ''} ${c.local_id || c.id})` : ` [${c.id}]`}`,
            ),
          ]
        : [];
    }),
  ].join('\n');
}
