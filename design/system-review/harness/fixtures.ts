// @ts-nocheck
// QA-only synthetic records; never imported by the production application.
import featuredSource from '../../../src/lib/featured.json';
const featured = Array.isArray(featuredSource)
  ? featuredSource
  : featuredSource.data || featuredSource.cards || [];
export const params = new URLSearchParams(location.search);
export const qa = {
  screen: params.get('screen') || 'library',
  state: params.get('state') || 'populated',
  role: params.get('role') || 'user',
  game: params.get('game') || 'yugioh',
  status: params.get('status'),
  log: [],
  mutations: [],
  tables: {},
};
export const timestamp = '2026-11-03T12:00:00.000Z';
export const profiles = [
  {
    id: 'qa-user',
    username: 'ana_duelista',
    display_name: 'Ana Oliveira',
    bio: 'Colecionadora de histórias e cartas. Sempre procurando uma nova conexão.',
    neighborhood: 'Centro',
    city: 'Lagarto',
    avatar_url: null,
    created_at: timestamp,
  },
  {
    id: 'qa-partner',
    username: 'bruno_tcg',
    display_name: 'Bruno Santos',
    bio: 'Yu-Gi-Oh! e Pokémon. Vamos completar nossos decks juntos?',
    neighborhood: 'Horta',
    city: 'Lagarto',
    avatar_url: null,
    created_at: timestamp,
  },
  {
    id: 'qa-admin',
    username: 'operacao_duelink',
    display_name: 'Operação Duelink',
    bio: 'Equipe de atendimento à comunidade.',
    neighborhood: 'Centro',
    city: 'Lagarto',
    avatar_url: null,
    created_at: timestamp,
  },
];
const localIds = [
  '89631139',
  '46986414',
  '74677422',
  '23995346',
  '44508094',
  '12580477',
  '10045474',
  '55144522',
];
export const cards = localIds
  .map((id, index) => {
    const original = featured.find((c) => String(c.id) === id) || featured[index];
    return {
      ...original,
      id,
      game: 'yugioh',
      image_url: `/cards/${id}.jpg`,
      card_images: [
        {
          id,
          image_url: `/cards/${id}.jpg`,
          image_url_small: `/cards/${id}.jpg`,
          image_url_cropped: `/cards/${id}.jpg`,
        },
      ],
    };
  })
  .concat(
    localIds.slice(0, 4).map((id, index) => ({
      id: `base1-${index + 1}`,
      game: 'pokemon',
      name: ['Alakazam', 'Blastoise', 'Chansey', 'Charizard'][index],
      localized_name: ['Alakazam', 'Blastoise', 'Chansey', 'Charizard'][index],
      type: 'Pokemon',
      frameType: 'pokemon',
      desc: 'Pokémon de demonstração visual, dados sintéticos de QA.',
      race: 'Pokémon',
      image_url: `/cards/${id}.jpg`,
      card_images: [{ id: `base1-${index + 1}`, image_url: `/cards/${id}.jpg` }],
      pokemon: { hp: 120, stage: 'Basic', types: ['Fire'] },
      set_id: 'base1',
      local_id: String(index + 1),
    })),
  );
for (const card of cards)
  if (card.game === 'pokemon') {
    card.image_url = '/card-back.svg';
    card.card_images[0].image_url = '/card-back.svg';
  }
export const items = cards.flatMap((card, index) =>
  ['qa-user', 'qa-partner', 'qa-admin'].map((user_id, u) => ({
    id: `item-${u}-${index}`,
    user_id,
    card_id: card.id,
    game: card.game,
    image_url: card.image_url,
    card_name: card.localized_name || card.name,
    card_type: card.type,
    quantity: (index % 3) + 1,
    condition: 'NM',
    language: 'PT',
    rarity: 'Ultra Rare',
    set_code: 'SD01-PT001',
    for_trade: index % 3 !== 2,
    notes: 'Exemplar conservado em sleeve. Disponível para combinar troca local.',
    created_at: timestamp,
    photo_url: null,
    profiles: profiles[u === 0 ? 0 : u === 1 ? 1 : 2],
  })),
);
const own = items.filter((i) => i.user_id === 'qa-user' && i.game === 'yugioh'),
  partner = items.filter((i) => i.user_id === 'qa-partner' && i.game === 'yugioh');
export const listingStatuses = ['active', 'pending', 'paused', 'rejected', 'draft', 'sold'];
export const listings = own
  .concat(items.filter((i) => i.user_id === 'qa-user' && i.game === 'pokemon'))
  .map((item, index) => ({
    id: `listing-${index}`,
    seller_id: index < 3 ? 'qa-partner' : 'qa-user',
    collection_item_id: item.id,
    game: item.game,
    card_id: item.card_id,
    card_name: item.card_name,
    image_url: item.image_url,
    condition: item.condition,
    language: item.language,
    rarity: item.rarity,
    set_code: item.set_code,
    description: 'Exemplar real da coleção de QA. Foto ilustrativa local para revisão do layout.',
    price_cents: 2490 + index * 1350,
    quantity: 3,
    available_quantity: 3,
    photos: [`qa/${item.card_id}/front.jpg`, `qa/${item.card_id}/back.svg`],
    status: listingStatuses[index % 6],
    rejection_reason: index % 6 === 3 ? 'Envie uma foto mais nítida do verso da carta.' : null,
    seller_commission_bps: 800,
    seller_terms_version: '2026-10',
    created_at: timestamp,
    updated_at: timestamp,
    seller: profiles[index < 3 ? 1 : 0],
  }));
listings[8].status = 'active';
listings[9].status = 'pending';
export const trades = ['pending', 'accepted', 'completed', 'declined', 'cancelled'].map(
  (status, index) => ({
    id: index === 0 ? 'trade-demo' : `trade-${status}`,
    proposer_id: index % 2 === 0 ? 'qa-partner' : 'qa-user',
    recipient_id: index % 2 === 0 ? 'qa-user' : 'qa-partner',
    offered_item_id: own[index].id,
    requested_item_id: partner[index].id,
    status: index === 0 ? qa.status || status : status,
    proposer_confirmed: false,
    recipient_confirmed: false,
    created_at: timestamp,
    updated_at: timestamp,
    offered: own[index],
    requested: partner[index],
    proposer: profiles[index % 2 === 0 ? 1 : 0],
    recipient: profiles[index % 2 === 0 ? 0 : 1],
  }),
);
export const orderStatuses = [
  'paid',
  'pending_payment',
  'ready',
  'completed',
  'cancelled',
  'expired',
  'refunded',
  'disputed',
  'payment_review',
];
export const orders = orderStatuses.map((status, index) => {
  const l = listings[index % listings.length];
  return {
    id: index === 0 ? 'order-demo' : `order-${status}`,
    buyer_id: index % 2 === 0 ? 'qa-user' : 'qa-partner',
    seller_id: index % 2 === 0 ? 'qa-partner' : 'qa-user',
    listing_id: l.id,
    collection_item_id: l.collection_item_id,
    listing_snapshot: l,
    items: [
      {
        listing_id: l.id,
        collection_item_id: l.collection_item_id,
        quantity: 1,
        unit_price_cents: l.price_cents,
        subtotal_cents: l.price_cents,
        listing_snapshot: l,
      },
    ],
    quantity: 1,
    subtotal_cents: l.price_cents,
    commission_bps: 800,
    commission_cents: Math.round(l.price_cents * 0.08),
    seller_net_cents: l.price_cents - Math.round(l.price_cents * 0.08),
    refunded_cents: status === 'refunded' ? l.price_cents : 0,
    refunded_commission_cents: 0,
    terms_version: '2026-10',
    pickup_instructions:
      'Combine local e horário pelo chat. Retirada em espaço público de Lagarto.',
    status: index === 0 ? qa.status || status : status,
    expires_at: '2026-12-30T12:00:00Z',
    payment_id: status === 'pending_payment' ? null : `payment-${index}`,
    payment_status: status === 'pending_payment' ? 'pending' : 'approved',
    request_reason: status === 'disputed' ? 'O exemplar recebido difere da descrição.' : null,
    refund_requested: status === 'disputed',
    created_at: timestamp,
    updated_at: timestamp,
    buyer: profiles[index % 2 === 0 ? 0 : 1],
    seller: profiles[index % 2 === 0 ? 1 : 0],
  };
});
export const settings = {
  commission_bps: 800,
  enabled: qa.state !== 'closed',
  pickup_instructions: 'Combine local e horário pelo chat. Retirada em espaço público de Lagarto.',
  operator_name: 'Duelink Comunidade',
  operator_contact: 'atendimento@example.test',
  terms_version: '2026-10',
  updated_at: timestamp,
};
export const config = {
  ...settings,
  payments_ready: qa.state !== 'unconfigured',
  payment_methods: ['pix', 'credit_card'],
};
export const decks = ['qa-user', 'qa-partner', 'qa-admin'].flatMap((user_id, u) =>
  ['yugioh', 'pokemon'].map((game, g) => ({
    id: `deck-${u}-${g}`,
    user_id,
    game,
    name: game === 'yugioh' ? 'Dragões do crepúsculo' : 'Fogo da comunidade',
    description: 'Um deck de demonstração para revisar composição, validação e edição.',
    format: game === 'yugioh' ? 'advanced' : 'standard',
    visibility: 'public',
    created_at: timestamp,
    updated_at: timestamp,
  })),
);
const tableData = {
  profiles,
  collection_items: items,
  wishlists: cards.slice(3, 7).map((c, i) => ({
    id: `wish-${i}`,
    user_id: 'qa-user',
    card_id: c.id,
    game: c.game,
    card_name: c.localized_name || c.name,
    card_type: c.type,
    created_at: timestamp,
  })),
  decks,
  deck_cards: decks.flatMap((deck) =>
    cards
      .filter((c) => c.game === deck.game)
      .slice(0, 5)
      .map((card, i) => ({
        id: `line-${deck.id}-${i}`,
        deck_id: deck.id,
        game: deck.game,
        card_id: card.id,
        card_name: card.localized_name || card.name,
        card_data: card,
        quantity: 3,
        section: /fusion|synchro|xyz|link/i.test(card.type) ? 'extra' : 'main',
      })),
  ),
  trades,
  messages: [
    {
      id: 'message-1',
      trade_id: 'trade-demo',
      sender_id: 'qa-partner',
      content: 'Oi! Podemos combinar a troca no centro de Lagarto?',
      created_at: timestamp,
    },
    {
      id: 'message-2',
      trade_id: 'trade-demo',
      sender_id: 'qa-user',
      content: 'Claro! As cartas estão em ótimo estado. Vamos conversar sobre o horário.',
      created_at: timestamp,
    },
  ],
  reviews: [
    {
      id: 'review-1',
      trade_id: 'trade-completed',
      reviewer_id: 'qa-user',
      reviewed_id: 'qa-partner',
      rating: 5,
      comment: 'Troca tranquila, cartas muito bem cuidadas!',
      created_at: timestamp,
      reviewer: { display_name: 'Ana Oliveira' },
    },
  ],
  marketplace_listings: listings,
  marketplace_orders: orders,
  marketplace_order_events: [
    {
      id: 'event-1',
      order_id: 'order-demo',
      actor_id: null,
      event: 'payment_approved',
      message: 'Pagamento confirmado pelo provedor.',
      created_at: timestamp,
    },
  ],
  marketplace_order_messages: [
    {
      id: 'order-message-1',
      order_id: 'order-demo',
      sender_id: 'qa-partner',
      content: 'Olá! Seu pedido está separado. Podemos combinar a retirada?',
      created_at: timestamp,
    },
  ],
  marketplace_payments: [
    {
      payment_id: 'payment-0',
      order_id: 'order-demo',
      status: 'approved',
      amount_cents: orders[0].subtotal_cents,
      refunded_cents: 0,
      updated_at: timestamp,
    },
  ],
  seller_payment_accounts: [
    { seller_id: 'qa-user', connected: qa.state !== 'unconfigured', updated_at: timestamp },
    { seller_id: 'qa-admin', connected: true, updated_at: timestamp },
  ],
};
qa.tables = structuredClone(tableData);
if (qa.state === 'empty')
  for (const key of Object.keys(qa.tables))
    if (!['profiles', 'seller_payment_accounts'].includes(key)) qa.tables[key] = [];
export const matches =
  qa.state === 'empty'
    ? []
    : [
        {
          partner_id: 'qa-partner',
          username: 'bruno_tcg',
          display_name: 'Bruno Santos',
          avatar_url: null,
          neighborhood: 'Horta',
          offered: [own[0]],
          wanted: [partner[1]],
          score: 2,
        },
      ];
export const adminData = {
  settings,
  members:
    qa.state === 'empty'
      ? []
      : profiles.map((p, i) => ({ ...p, role: i === 2 ? 'admin' : 'user' })),
  audit:
    qa.state === 'empty'
      ? []
      : [
          {
            id: 'audit-1',
            actor_id: 'qa-admin',
            action: 'settings.update',
            entity_id: 'marketplace-settings',
            created_at: timestamp,
            before_data: { commission_bps: 700 },
            after_data: { commission_bps: 800 },
          },
        ],
  payments: {
    mode: 'sandbox',
    checks: [
      { label: 'Token de homologação', configured: true },
      { label: 'Webhook de pagamento', configured: true },
      { label: 'Conta da operação', configured: qa.state !== 'unconfigured' },
    ],
  },
};
window.__DUELINK_QA__ = qa;
