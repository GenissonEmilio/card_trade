import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
let db: PGlite;
const alice = '00000000-0000-4000-8000-000000000001',
  bob = '00000000-0000-4000-8000-000000000002';
const privateDeck = '10000000-0000-4000-8000-000000000001',
  publicDeck = '10000000-0000-4000-8000-000000000002';
async function as(user: string | null) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${user || ''}',false); set role ${user ? 'authenticated' : 'anon'};`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; create table public.profiles(id uuid primary key); insert into public.profiles values('${alice}'),('${bob}');`,
  );
  await db.exec(
    readFileSync(
      `supabase/migrations/${readdirSync('supabase/migrations').find((name) => name.endsWith('_multigame_decks.sql'))}`,
      'utf8',
    ),
  );
  await db.exec(
    `insert into public.decks(id,user_id,game,name,visibility) values('${privateDeck}','${alice}','pokemon','Privado','private'),('${publicDeck}','${alice}','yugioh','Público','public'); insert into public.deck_cards(deck_id,game,card_id,card_name,card_data) values('${privateDeck}','pokemon','base1-58','Pikachu','{"id":"base1-58","game":"pokemon"}'),('${publicDeck}','yugioh','46986414','Dark Magician','{"id":"46986414","game":"yugioh"}');`,
  );
});
beforeEach(async () => {
  await db.exec('reset role; begin;');
});
afterEach(async () => {
  await db.exec('rollback; reset role;');
});
afterAll(async () => {
  await db.close();
});
describe('deck storage access control', () => {
  it('exposes only public decks and their cards to anonymous readers', async () => {
    await as(null);
    expect(
      (await db.query<{ id: string }>('select id from public.decks')).rows.map((r) => r.id),
    ).toEqual([publicDeck]);
    expect(
      (await db.query<{ card_id: string }>('select card_id from public.deck_cards')).rows.map(
        (r) => r.card_id,
      ),
    ).toEqual(['46986414']);
  });
  it('lets the owner read private decks and edit them, while others cannot edit public decks', async () => {
    await as(bob);
    expect((await db.query('select * from public.decks')).rows).toHaveLength(1);
    await db.exec(`update public.decks set name='Intrusão' where id='${publicDeck}'`);
    await as(alice);
    expect((await db.query('select * from public.decks')).rows).toHaveLength(2);
    expect(
      (await db.query<{ name: string }>(`select name from public.decks where id='${publicDeck}'`))
        .rows[0].name,
    ).toBe('Público');
    await db.exec(`update public.decks set name='Alterado' where id='${privateDeck}'`);
    expect(
      (await db.query<{ name: string }>(`select name from public.decks where id='${privateDeck}'`))
        .rows[0].name,
    ).toBe('Alterado');
  });
  it('blocks adding cards to someone else’s public deck', async () => {
    await as(bob);
    await expect(
      db.exec(
        `insert into public.deck_cards(deck_id,game,card_id,card_name,card_data) values('${publicDeck}','yugioh','1','Falsa','{"id":"1","game":"yugioh"}')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it('blocks transferring a deck to another account', async () => {
    await as(alice);
    await expect(
      db.exec(`update public.decks set user_id='${bob}' where id='${privateDeck}'`),
    ).rejects.toThrow(/row-level security/);
  });
  it('blocks mixed games and incomplete identity metadata at database level', async () => {
    await as(alice);
    await expect(
      db.exec(
        `insert into public.deck_cards(deck_id,game,card_id,card_name,card_data) values('${privateDeck}','yugioh','1','Falsa','{"id":"1","game":"yugioh"}')`,
      ),
    ).rejects.toThrow(/foreign key/);
  });
  it('requires matching identity metadata even for the owner', async () => {
    await as(alice);
    await expect(
      db.exec(
        `insert into public.deck_cards(deck_id,game,card_id,card_name,card_data) values('${privateDeck}','pokemon','bad','Falsa','{}')`,
      ),
    ).rejects.toThrow(/check constraint/);
  });
  it('deletes deck cards when their owner removes the parent deck', async () => {
    await as(alice);
    await db.exec(`delete from public.decks where id='${privateDeck}'`);
    expect(
      (await db.query(`select * from public.deck_cards where deck_id='${privateDeck}'`)).rows,
    ).toHaveLength(0);
  });
});
