import type { Card } from '@/types';
import featured from './featured.json';
export const featuredCards = featured.data as Card[];
export const localizedNames: Record<number, string> = {
  89631139: 'Dragão Branco de Olhos Azuis',
  46986414: 'Mago Negro',
  74677422: 'Dragão Negro de Olhos Vermelhos',
  10045474: 'Impermanência Infinita',
  23995346: 'Dragão Supremo de Olhos Azuis',
  44508094: 'Dragão da Poeira Estelar',
  84013237: 'Número 39: Utopia',
  6983839: 'Dragão Tornado',
  83764718: 'Monstro que Renasce',
  12580477: 'Raigeki',
  44095762: 'Força do Espelho',
  55144522: 'Pote da Ganância',
  53129443: 'Buraco Negro',
  70781052: 'Crânio Invocado',
  14558127: 'Florescer de Cinzas e Primavera Feliz',
  23434538: 'Maxx “C”',
  4280258: 'Apollousa, Arco da Deusa',
  8491308: 'Ás da Força Celeste - Hayate',
  27204311: 'Nibiru, o Ser Primitivo',
  73580471: 'Dragão da Rosa Negra',
  86066372: 'Acessocodificar Transmissor',
};
export function displayCardName(card: Pick<Card, 'id' | 'name'>) {
  return localizedNames[card.id] || card.name;
}
