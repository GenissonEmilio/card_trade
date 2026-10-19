import { describe, expect, it } from 'vitest';
import { getCatalog } from '@/lib/catalog-server';
import { exportDeck, validateDeck } from '@/lib/decks';
import type { Card, DeckCard } from '@/types';
const cards = getCatalog().cards;
const basic = cards.find((c) => c.game === 'pokemon' && c.pokemon?.stage === 'Basic')!;
const energy = cards.find((c) => c.game === 'pokemon' && c.pokemon?.energyType === 'Normal')!;
const line = (card: Card, quantity: number, section: DeckCard['section'] = 'main') => ({
  card_data: card,
  quantity,
  section,
});
describe('deck composition', () => {
  it('accepts 60-card Pokémon lists and basic Energy beyond four copies', () => {
    expect(
      validateDeck({ game: 'pokemon', format: 'casual' }, [line(basic, 4), line(energy, 56)])
        .errors,
    ).toEqual([]);
  });
  it('requires exactly 60 cards and at least one Basic Pokémon', () => {
    expect(
      validateDeck({ game: 'pokemon', format: 'casual' }, [line(energy, 59)]).errors,
    ).toHaveLength(2);
    expect(
      validateDeck({ game: 'pokemon', format: 'casual' }, [line(basic, 4), line(energy, 57)])
        .errors,
    ).toHaveLength(1);
  });
  it('counts reprints/translations by original name, not printing ID', () => {
    const reprint = { ...basic, id: 'another-printing', localized_name: 'Outro nome traduzido' };
    expect(
      validateDeck({ game: 'pokemon', format: 'casual' }, [
        line(basic, 4),
        line(reprint, 1),
        line(energy, 55),
      ]).errors.some((message) => message.includes('mais de 4')),
    ).toBe(true);
  });
  it('blocks mixed games and flags misplaced Yu-Gi-Oh! Extra Deck cards', () => {
    const fusion = cards.find((c) => c.game === 'yugioh' && c.type === 'Fusion Monster')!;
    expect(
      validateDeck({ game: 'pokemon', format: 'casual' }, [line(fusion, 1)]).errors.some(
        (message) => message.includes('outro jogo'),
      ),
    ).toBe(true);
    expect(
      validateDeck({ game: 'yugioh', format: 'casual' }, [line(fusion, 1)]).errors.some((message) =>
        message.includes('pertencem'),
      ),
    ).toBe(true);
    const normal = cards.find((c) => c.game === 'yugioh' && c.type === 'Normal Monster')!;
    expect(
      validateDeck({ game: 'yugioh', format: 'casual' }, [
        line(normal, 3),
        line(normal, 1, 'side'),
      ]).errors.some((message) => message.includes('até 3')),
    ).toBe(true);
  });
  it('exports the exact card printing and quantity', () => {
    const output = exportDeck({ game: 'pokemon', name: 'Meu deck' }, [
      line(basic, 4),
      line(energy, 56),
    ]);
    expect(output).toContain(`4 ${basic.name}`);
    expect(output).toContain(basic.set_id!);
    expect(output).toContain('56');
  });
});
