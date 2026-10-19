import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
let db: PGlite;
const alice = '00000000-0000-4000-8000-000000000001',
  bob = '00000000-0000-4000-8000-000000000002',
  eve = '00000000-0000-4000-8000-000000000003';
const ca = '10000000-0000-4000-8000-000000000001',
  cb = '10000000-0000-4000-8000-000000000002',
  ce = '10000000-0000-4000-8000-000000000003';
async function as(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
async function propose() {
  await as(alice);
  const r = await db.query<{ id: string }>(
    `select public.create_trade('${ca}','${cb}','Olá, vamos trocar?') as id`,
  );
  return r.rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;`);
  await db.exec(
    'alter default privileges in schema public grant execute on functions to anon,authenticated;',
  );
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await db.exec(
      readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
        'create extension if not exists pgcrypto;',
        '',
      ),
    );
  }
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values ('${alice}','{"username":"alice","display_name":"Alice"}'),('${bob}','{"username":"bob","display_name":"Bob"}'),('${eve}','{"username":"eve","display_name":"Eve"}');
 insert into public.collection_items(id,user_id,card_id,card_name,quantity) values('${ca}','${alice}',89631139,'Blue-Eyes White Dragon',2),('${cb}','${bob}',46986414,'Dark Magician',1),('${ce}','${eve}',74677422,'Red-Eyes Black Dragon',1);
 insert into public.wishlists(user_id,card_id,card_name) values('${alice}',46986414,'Dark Magician'),('${bob}',89631139,'Blue-Eyes White Dragon');`);
});
beforeEach(async () => {
  await db.exec('reset role;begin;');
});
afterEach(async () => {
  await db.exec('rollback;reset role;');
});
afterAll(async () => {
  await db.close();
});
describe('políticas e ciclo de trocas', () => {
  it('limita rajadas de mensagens no banco', async () => {
    const id = await propose();
    for (let n = 0; n < 9; n++)
      await db.exec(
        `insert into public.messages(trade_id,sender_id,content) values('${id}','${alice}','Mensagem ${n}')`,
      );
    await expect(
      db.exec(
        `insert into public.messages(trade_id,sender_id,content) values('${id}','${alice}','Excesso')`,
      ),
    ).rejects.toThrow(/muito rápido/);
  });
  it('não expõe funções privilegiadas a visitantes anônimos', async () => {
    await db.exec('set role anon');
    await expect(db.exec('select public.get_matches()')).rejects.toThrow(/permission denied/);
  });
  it('cria perfis automaticamente e encontra apenas matches recíprocos', async () => {
    await as(alice);
    const result = await db.query<{ partner_id: string; offered: unknown[]; wanted: unknown[] }>(
      'select * from public.get_matches()',
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].partner_id).toBe(bob);
    expect(result.rows[0].offered).toHaveLength(1);
    expect(result.rows[0].wanted).toHaveLength(1);
  });
  it('mantém desejos de outros usuários privados', async () => {
    await as(eve);
    const result = await db.query('select * from public.wishlists');
    expect(result.rows).toHaveLength(0);
  });
  it('impede editar a coleção de outra pessoa', async () => {
    await as(eve);
    await db.exec(`update public.collection_items set quantity=9 where id='${ca}'`);
    await db.exec('reset role');
    const result = await db.query<{ quantity: number }>(
      `select quantity from public.collection_items where id='${ca}'`,
    );
    expect(result.rows[0].quantity).toBe(2);
  });
  it('impede inserir uma carta em nome de outro usuário', async () => {
    await as(eve);
    await expect(
      db.exec(
        `insert into public.collection_items(user_id,card_id,card_name) values('${alice}',1,'Falsa')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it('somente o destinatário pode aceitar', async () => {
    const id = await propose();
    await expect(db.exec(`select public.transition_trade('${id}','accept')`)).rejects.toThrow(
      /Ação inválida/,
    );
  });
  it('bloqueia edição de carta reservada', async () => {
    const id = await propose();
    await as(bob);
    await db.exec(`select public.transition_trade('${id}','accept')`);
    await as(alice);
    await expect(
      db.exec(`update public.collection_items set for_trade=false where id='${ca}'`),
    ).rejects.toThrow(/reservada/);
  });
  it('não aceita uma segunda proposta sobre uma carta reservada', async () => {
    const id = await propose();
    await as(eve);
    const second = await db.query<{ id: string }>(
      `select public.create_trade('${ce}','${ca}') as id`,
    );
    await as(bob);
    await db.exec(`select public.transition_trade('${id}','accept')`);
    await as(alice);
    await expect(
      db.exec(`select public.transition_trade('${second.rows[0].id}','accept')`),
    ).rejects.toThrow(/reservada/);
  });
  it('troca cartas e remove desejos somente após ambas as confirmações', async () => {
    const id = await propose();
    await as(bob);
    await db.exec(
      `select public.transition_trade('${id}','accept');select public.transition_trade('${id}','confirm')`,
    );
    let result = await db.query<{ status: string }>(
      `select status from public.trades where id='${id}'`,
    );
    expect(result.rows[0].status).toBe('accepted');
    await as(alice);
    await db.exec(`select public.transition_trade('${id}','confirm')`);
    result = await db.query(`select status from public.trades where id='${id}'`);
    expect(result.rows[0].status).toBe('completed');
    const owned = await db.query<{ card_id: number; for_trade: boolean }>(
      `select card_id,for_trade from public.collection_items where user_id='${alice}' and card_id='46986414'`,
    );
    expect(owned.rows).toHaveLength(1);
    expect(owned.rows[0].for_trade).toBe(false);
    const wishes = await db.query('select * from public.wishlists');
    expect(wishes.rows).toHaveLength(0);
  });
  it('impede ler e enviar mensagens de uma troca da qual não participa', async () => {
    const id = await propose();
    await as(eve);
    expect(
      (await db.query(`select * from public.messages where trade_id='${id}'`)).rows,
    ).toHaveLength(0);
    expect((await db.query(`select * from public.trades where id='${id}'`)).rows).toHaveLength(0);
    await expect(
      db.exec(
        `insert into public.messages(trade_id,sender_id,content) values('${id}','${eve}','intrusão')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it('permite apenas uma avaliação por participante após concluir', async () => {
    const id = await propose();
    await as(bob);
    await db.exec(
      `select public.transition_trade('${id}','accept');select public.transition_trade('${id}','confirm')`,
    );
    await as(alice);
    await db.exec(
      `select public.transition_trade('${id}','confirm');insert into public.reviews(trade_id,reviewer_id,reviewed_id,rating) values('${id}','${alice}','${bob}',5)`,
    );
    await expect(
      db.exec(
        `insert into public.reviews(trade_id,reviewer_id,reviewed_id,rating) values('${id}','${alice}','${bob}',5)`,
      ),
    ).rejects.toThrow(/unique constraint/);
  });
});

describe('administração e identidades por jogo', () => {
  it('não concede administração a metadados editáveis pelo usuário', async () => {
    await db.exec(
      `update auth.users set raw_user_meta_data='{"role":"admin","is_admin":true}' where id='${alice}'`,
    );
    await as(alice);
    expect(
      (await db.query<{ role: string }>('select public.get_my_role() as role')).rows[0].role,
    ).toBe('user');
    await expect(db.exec('select * from private.user_roles')).rejects.toThrow(/permission denied/);
  });
  it('rejeita alterações de taxas por usuários comuns', async () => {
    await as(alice);
    await expect(
      db.exec("select public.admin_update_settings(1000,false,'Retirada combinada em Lagarto')"),
    ).rejects.toThrow(/restrito/);
  });
  it('permite ao admin alterar a taxa e registra auditoria', async () => {
    await db.exec(`insert into private.user_roles(user_id,role) values('${bob}','admin')`);
    await as(bob);
    await db.exec("select public.admin_update_settings(850,false,'Retirada combinada em Lagarto')");
    const result = await db.query<{ commission_bps: number }>(
      'select commission_bps from public.marketplace_settings',
    );
    expect(result.rows[0].commission_bps).toBe(850);
    expect(
      (await db.query<{ audit: unknown[] }>('select public.admin_get_audit() as audit')).rows[0]
        .audit,
    ).toHaveLength(1);
  });
  it('protege a última conta de administração', async () => {
    await db.exec(`insert into private.user_roles(user_id,role) values('${bob}','admin')`);
    await as(bob);
    await expect(db.exec(`select public.admin_set_user_role('${bob}','user')`)).rejects.toThrow(
      /ao menos um administrador/,
    );
  });
  it('não confunde IDs iguais de jogos diferentes nos matches', async () => {
    await as(alice);
    await db.exec(
      `insert into public.collection_items(user_id,card_id,card_name,game) values('${alice}','46986414','Outra carta','pokemon')`,
    );
    expect((await db.query("select * from public.get_matches('pokemon')")).rows).toHaveLength(0);
  });
  it('impede propostas entre jogos diferentes', async () => {
    await as(alice);
    const added = await db.query<{ id: string }>(
      `insert into public.collection_items(user_id,card_id,card_name,game) values('${alice}','swsh3-136','Furret','pokemon') returning id`,
    );
    await expect(
      db.exec(`select public.create_trade('${added.rows[0].id}','${cb}')`),
    ).rejects.toThrow(/mesmo jogo/);
  });
  it('preserva jogo e imagem ao concluir uma troca Pokémon', async () => {
    const a = await db.query<{ id: string }>(
      `insert into public.collection_items(user_id,card_id,card_name,game,image_url) values('${alice}','swsh3-136','Furret','pokemon','https://assets.tcgdex.net/pt/swsh/swsh3/136/high.webp') returning id`,
    );
    const b = await db.query<{ id: string }>(
      `insert into public.collection_items(user_id,card_id,card_name,game) values('${bob}','swsh1-1','Celebi V','pokemon') returning id`,
    );
    await as(alice);
    const id = (
      await db.query<{ id: string }>(
        `select public.create_trade('${a.rows[0].id}','${b.rows[0].id}') as id`,
      )
    ).rows[0].id;
    await as(bob);
    await db.exec(
      `select public.transition_trade('${id}','accept');select public.transition_trade('${id}','confirm')`,
    );
    await as(alice);
    await db.exec(`select public.transition_trade('${id}','confirm')`);
    const got = await db.query<{ game: string; card_id: string }>(
      `select game,card_id from public.collection_items where user_id='${alice}' and card_id='swsh1-1'`,
    );
    expect(got.rows).toEqual([{ game: 'pokemon', card_id: 'swsh1-1' }]);
    await as(bob);
    expect(
      (
        await db.query<{ image_url: string }>(
          `select image_url from public.collection_items where user_id='${bob}' and card_id='swsh3-136'`,
        )
      ).rows[0].image_url,
    ).toContain('tcgdex');
  });
});
