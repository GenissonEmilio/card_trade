import type { Card, Game } from '@/types';
import featured from './featured.json';
export const gameLabels: Record<Game, string> = { yugioh: 'Yu-Gi-Oh!', pokemon: 'Pokémon' };
export function gameOf(value: { game?: Game | string | null }): Game {
  return value.game === 'pokemon' ? 'pokemon' : 'yugioh';
}
export function cardKey(game: Game, id: string | number) {
  return `${game}:${id}`;
}
export const localizedNames: Record<string, string> = {
  '89631139': 'Dragão Branco de Olhos Azuis',
  '46986414': 'Mago Negro',
  '74677422': 'Dragão Negro de Olhos Vermelhos',
  '10045474': 'Impermanência Infinita',
  '23995346': 'Dragão Supremo de Olhos Azuis',
  '44508094': 'Dragão da Poeira Estelar',
  '84013237': 'Número 39: Utopia',
  '6983839': 'Dragão Tornado',
  '83764718': 'Monstro que Renasce',
  '12580477': 'Raigeki',
  '44095762': 'Força do Espelho',
  '55144522': 'Pote da Ganância',
  '53129443': 'Buraco Negro',
  '70781052': 'Crânio Invocado',
  '14558127': 'Florescer de Cinzas e Primavera Feliz',
  '23434538': 'Maxx “C”',
  '4280258': 'Apollousa, Arco da Deusa',
  '8491308': 'Ás da Força Celeste - Hayate',
  '27204311': 'Nibiru, o Ser Primitivo',
  '73580471': 'Dragão da Rosa Negra',
  '86066372': 'Acessocodificar Transmissor',
};
export const featuredCards: Card[] = featured.data.map((c) => ({
  ...c,
  id: String(c.id),
  game: 'yugioh',
  localized_name: localizedNames[c.id],
  card_images: c.card_images.map((i) => ({ ...i, id: String(i.id) })),
})) as Card[];
export function displayCardName(
  card: Pick<Card, 'id' | 'name'> & Partial<Pick<Card, 'game' | 'localized_name'>>,
) {
  return (
    card.localized_name ||
    (gameOf(card) === 'yugioh' ? localizedNames[String(card.id)] : undefined) ||
    card.name
  );
}
export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[’“”"']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
export function collectionCard(item: {
  card_id: string | number;
  card_name: string;
  card_type: string;
  game?: Game;
  image_url?: string | null;
}): Card {
  const game = gameOf(item);
  return (
    featuredCards.find((c) => game === c.game && String(c.id) === String(item.card_id)) || {
      id: String(item.card_id),
      game,
      name: item.card_name,
      type: item.card_type,
      frameType:
        game === 'pokemon'
          ? 'pokemon'
          : /spell/i.test(item.card_type)
            ? 'spell'
            : /trap/i.test(item.card_type)
              ? 'trap'
              : 'effect',
      race: gameLabels[game],
      desc: 'Consulte o catálogo para ver o texto completo desta carta.',
      image_url: item.image_url || undefined,
      card_images: [
        {
          id: String(item.card_id),
          image_url: item.image_url || '',
          image_url_small: '',
          image_url_cropped: '',
        },
      ],
    }
  );
}
