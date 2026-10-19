import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const vars = Object.fromEntries(
  ['.env.local', '.env.test.local'].flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .filter((s) => s.includes('=') && !s.startsWith('#'))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        return [key, rest.join('=').replace(/^"|"$/g, '')];
      }),
  ),
);
const url = vars.NEXT_PUBLIC_SUPABASE_URL,
  key = vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
async function login(email) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: vars.DUELINK_QA_PASSWORD,
  });
  assert.ifError(error);
  return { client, user: data.user };
}
async function ok(query) {
  const { data, error } = await query;
  assert.ifError(error);
  return data;
}
const a = await login(vars.DUELINK_QA_A),
  b = await login(vars.DUELINK_QA_B),
  e = await login(vars.DUELINK_QA_E);
console.log('✓ Three temporary accounts authenticated');
const ca = await ok(
  a.client
    .from('collection_items')
    .insert({
      user_id: a.user.id,
      card_id: 89631139,
      card_name: 'Blue-Eyes White Dragon',
      card_type: 'Normal Monster',
      quantity: 2,
    })
    .select()
    .single(),
);
const cb = await ok(
  b.client
    .from('collection_items')
    .insert({
      user_id: b.user.id,
      card_id: 46986414,
      card_name: 'Dark Magician',
      card_type: 'Normal Monster',
      quantity: 1,
    })
    .select()
    .single(),
);
await ok(
  a.client
    .from('wishlists')
    .insert({ user_id: a.user.id, card_id: 46986414, card_name: 'Dark Magician' }),
);
await ok(
  b.client
    .from('wishlists')
    .insert({ user_id: b.user.id, card_id: 89631139, card_name: 'Blue-Eyes White Dragon' }),
);
const matches = await ok(a.client.rpc('get_matches'));
assert(matches.some((m) => m.partner_id === b.user.id));
assert.equal((await ok(e.client.from('wishlists').select('*'))).length, 0);
console.log('✓ Reciprocal matches and wishlist privacy');
const tradeId = await ok(
  a.client.rpc('create_trade', {
    offered_id: ca.id,
    requested_id: cb.id,
    introduction: 'Teste automatizado: proposta de troca.',
  }),
);
assert.equal((await ok(e.client.from('trades').select('*').eq('id', tradeId))).length, 0);
assert.equal((await ok(e.client.from('messages').select('*').eq('trade_id', tradeId))).length, 0);
const forbidden = await e.client
  .from('messages')
  .insert({ trade_id: tradeId, sender_id: e.user.id, content: 'Não deve ser gravada' });
assert(forbidden.error);
await ok(b.client.rpc('transition_trade', { trade: tradeId, action: 'accept' }));
const reserved = await a.client.from('collection_items').update({ quantity: 10 }).eq('id', ca.id);
assert(reserved.error);
await ok(
  a.client
    .from('messages')
    .insert({ trade_id: tradeId, sender_id: a.user.id, content: 'Combinado em local público!' }),
);
const relation = await ok(
  a.client
    .from('trades')
    .select(
      '*, offered:offered_snapshot, requested:requested_snapshot, proposer:profiles!trades_proposer_id_fkey(*), recipient:profiles!trades_recipient_id_fkey(*)',
    )
    .eq('id', tradeId)
    .single(),
);
assert.equal(relation.proposer.id, a.user.id);
assert.equal(relation.offered.card_id, 89631139);
await ok(a.client.rpc('transition_trade', { trade: tradeId, action: 'confirm' }));
assert.equal(
  (await ok(a.client.from('trades').select('status').eq('id', tradeId).single())).status,
  'accepted',
);
await ok(b.client.rpc('transition_trade', { trade: tradeId, action: 'confirm' }));
assert.equal(
  (await ok(a.client.from('trades').select('status').eq('id', tradeId).single())).status,
  'completed',
);
assert.equal(
  (
    await ok(
      a.client
        .from('collection_items')
        .select('*')
        .eq('user_id', a.user.id)
        .eq('card_id', 46986414),
    )
  ).length,
  1,
);
await ok(
  a.client.from('reviews').insert({
    trade_id: tradeId,
    reviewer_id: a.user.id,
    reviewed_id: b.user.id,
    rating: 5,
    comment: 'Avaliação temporária de QA.',
  }),
);
console.log(
  '✓ Real PostgREST joins, private chat, reservation, double confirmation, inventory transfer and review',
);
// Leave these disposable accounts for browser QA. Cleanup is done by the owner after verification.
for (const { client } of [a, b, e]) await client.auth.signOut();
