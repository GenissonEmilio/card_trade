import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

let db: PGlite;
const seller = '00000000-0000-4000-8000-000000000001',
  buyer = '00000000-0000-4000-8000-000000000002',
  admin = '00000000-0000-4000-8000-000000000003',
  outsider = '00000000-0000-4000-8000-000000000004';
const a = '10000000-0000-4000-8000-000000000001',
  b = '10000000-0000-4000-8000-000000000002',
  c = '10000000-0000-4000-8000-000000000003';
async function attempt<T>(fn: () => Promise<T>) {
  await db.exec('savepoint expected_failure');
  try {
    return await fn();
  } catch (error) {
    await db.exec('rollback to savepoint expected_failure');
    throw error;
  } finally {
    await db.exec('release savepoint expected_failure');
  }
}
async function fails(sql: string, pattern: RegExp) {
  await expect(attempt(() => db.exec(sql))).rejects.toThrow(pattern);
}
async function as(id: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
async function owner() {
  await db.exec(`reset role;select set_config('request.jwt.claim.sub','',false)`);
}
async function listing(item = a, price = 1001, quantity = 2) {
  await as(seller);
  const result = await db.query<{ id: string }>(
    `select public.submit_marketplace_listing('${item}',${quantity},${price},'Carta física em excelente estado.',array['${seller}/frente.jpg','${seller}/verso.jpg'],true,null,'2026-10-19') id`,
  );
  await as(admin);
  await db.exec(`select public.admin_moderate_listing('${result.rows[0].id}',true)`);
  return result.rows[0].id;
}
async function reserve(items: { listing_id: string; quantity: number }[]) {
  await as(buyer);
  return (
    await db.query<{ id: string }>(
      `select public.reserve_marketplace_order('${JSON.stringify(items)}'::jsonb,'2026-10-19') id`,
    )
  ).rows[0].id;
}
async function pay(
  order: string,
  status = 'approved',
  amount = 2002,
  refunded = 0,
  key = 'event-1',
) {
  await owner();
  return db.query<{ status: string }>(
    `select public.payment_apply('${order}','123','${status}',${amount},${refunded},'12345','BRL','${key}',now()) status`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;grant usage on schema storage to anon,authenticated;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select on storage.objects to anon,authenticated;grant insert,delete on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 alter default privileges in schema public grant execute on functions to anon,authenticated;`);
  for (const file of readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(
      readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
        'create extension if not exists pgcrypto;',
        '',
      ),
    );
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${seller}','{"username":"seller","display_name":"Seller"}'),('${buyer}','{"username":"buyer","display_name":"Buyer"}'),('${admin}','{"username":"admin","display_name":"Admin"}'),('${outsider}','{"username":"outsider","display_name":"Outsider"}');
 insert into private.user_roles(user_id,role) values('${admin}','admin');
 insert into public.collection_items(id,user_id,card_id,card_name,quantity,game) values('${a}','${seller}','89631139','Blue-Eyes',3,'yugioh'),('${b}','${seller}','sv03-001','Pokémon',2,'pokemon'),('${c}','${outsider}','46986414','Dark Magician',1,'yugioh');
 insert into storage.objects(bucket_id,name) values('marketplace-photos','${seller}/frente.jpg'),('marketplace-photos','${seller}/verso.jpg');
 insert into public.seller_payment_accounts(seller_id,connected) values('${seller}',true);
 insert into private.seller_payment_tokens(seller_id,provider_user_id,encrypted_tokens,expires_at) values('${seller}','12345','encrypted',now()+interval '1 day');
 update public.marketplace_settings set enabled=true,commission_bps=750,pickup_instructions='Retirada em Lagarto após agendamento.' where id=true;`);
});
beforeEach(async () => {
  await owner();
  await db.exec('begin');
});
afterEach(async () => {
  await db.exec('rollback;reset role');
});
afterAll(async () => {
  await db.close();
});

describe('marketplace com autorização e estoque compartilhado', () => {
  it('não permite um usuário aprovar o próprio anúncio nem falsificar estado financeiro', async () => {
    const id = await listing();
    await as(seller);
    await fails(`select public.admin_moderate_listing('${id}',true)`, /restrito/);
    await fails(
      `select public.payment_apply(gen_random_uuid(),'1','approved',1,0,'12345','BRL','fake',now())`,
      /permission denied/,
    );
    await fails(
      `update public.marketplace_listings set status='active' where id='${id}'`,
      /permission denied/,
    );
    await fails(`select * from private.seller_payment_tokens`, /permission denied/);
  });
  it('exige fotos próprias e aceite da versão atual dos termos', async () => {
    await as(seller);
    await fails(
      `select public.submit_marketplace_listing('${a}',1,1000,'Descrição real da carta.',array['${buyer}/foto.jpg','${buyer}/verso.jpg'],true,null,'2026-10-19')`,
      /fotos próprias/,
    );
    await fails(
      `select public.submit_marketplace_listing('${a}',1,1000,'Descrição real da carta.',array['${seller}/frente.jpg','${seller}/verso.jpg'],true,null,'old')`,
      /termos atuais/,
    );
  });
  it('bloqueia reserva de venda simultânea a uma troca aceita', async () => {
    await as(seller);
    const t = (await db.query<{ id: string }>(`select public.create_trade('${a}','${c}') id`))
      .rows[0].id;
    await as(outsider);
    await db.exec(`select public.transition_trade('${t}','accept')`);
    await as(seller);
    await fails(
      `select public.submit_marketplace_listing('${a}',1,1000,'Descrição real da carta.',array['${seller}/frente.jpg'],true,null,'2026-10-19')`,
      /reservada/,
    );
  });
  it('publica somente anúncios moderados e impede troca/edição do lote anunciado', async () => {
    const id = await listing();
    await db.exec('reset role;set role anon');
    expect(
      (await db.query(`select id from public.marketplace_listings where id='${id}'`)).rows,
    ).toHaveLength(1);
    await as(seller);
    await fails(`update public.collection_items set quantity=1 where id='${a}'`, /reservada/);
    await fails(`select public.create_trade('${a}','${c}')`, /reservada|venda/);
  });
  it('reserva vários anúncios do mesmo vendedor com preço e taxa imutáveis', async () => {
    const first = await listing(),
      second = await listing(b, 2000, 1);
    const order = await reserve([
      { listing_id: first, quantity: 2 },
      { listing_id: second, quantity: 1 },
    ]);
    const result = await db.query<{
      subtotal_cents: number;
      commission_cents: number;
      items: unknown[];
    }>(`select * from public.marketplace_orders where id='${order}'`);
    expect(result.rows[0].subtotal_cents).toBe(4002);
    expect(result.rows[0].commission_cents).toBe(300);
    expect(result.rows[0].items).toHaveLength(2);
    await as(admin);
    await db.exec(
      `select public.admin_update_settings(1500,true,'Retirada em Lagarto após agendamento.')`,
    );
    await as(buyer);
    expect(
      (
        await db.query<{ commission_cents: number }>(
          `select commission_cents from public.marketplace_orders where id='${order}'`,
        )
      ).rows[0].commission_cents,
    ).toBe(300);
  });
  it('impede overselling e libera automaticamente reservas vencidas', async () => {
    const id = await listing(a, 1001, 2),
      order = await reserve([{ listing_id: id, quantity: 2 }]);
    await as(outsider);
    await fails(
      `select public.reserve_marketplace_order('[{"listing_id":"${id}","quantity":1}]','2026-10-19')`,
      /Quantidade indisponível/,
    );
    await owner();
    await db.exec(
      `update public.marketplace_orders set expires_at=now()-interval '1 second' where id='${order}'`,
    );
    await as(outsider);
    expect(
      (
        await db.query(
          `select public.reserve_marketplace_order('[{"listing_id":"${id}","quantity":2}]','2026-10-19')`,
        )
      ).rows,
    ).toHaveLength(1);
  });
  it('só revela pedidos, mensagens e contas de recebimento aos participantes/admin', async () => {
    const id = await listing(),
      order = await reserve([{ listing_id: id, quantity: 2 }]);
    await as(outsider);
    expect((await db.query('select * from public.marketplace_orders')).rows).toHaveLength(0);
    expect((await db.query('select * from public.seller_payment_accounts')).rows).toHaveLength(0);
    await fails(
      `insert into public.marketplace_order_messages(order_id,sender_id,content) values('${order}','${outsider}','Intrusão')`,
      /row-level security/,
    );
  });
  it('confirma pagamento uma vez e somente transfere estoque após retirada pelo comprador', async () => {
    const first = await listing(),
      second = await listing(b, 2000, 1),
      order = await reserve([
        { listing_id: first, quantity: 2 },
        { listing_id: second, quantity: 1 },
      ]);
    await pay(order, 'approved', 4002);
    await pay(order, 'approved', 4002);
    await as(seller);
    await db.exec(`select public.marketplace_order_action('${order}','ready')`);
    await fails(`select public.marketplace_order_action('${order}','complete')`, /Ação inválida/);
    await as(buyer);
    await db.exec(`select public.marketplace_order_action('${order}','complete')`);
    const owned = await db.query<{ game: string; quantity: number }>(
      `select game,quantity from public.collection_items where user_id='${buyer}' order by game`,
    );
    expect(owned.rows).toEqual([
      { game: 'pokemon', quantity: 1 },
      { game: 'yugioh', quantity: 2 },
    ]);
    await owner();
    expect(
      (
        await db.query<{ quantity: number }>(
          `select quantity from public.collection_items where id='${a}'`,
        )
      ).rows[0].quantity,
    ).toBe(1);
    expect(
      (await db.query(`select * from private.marketplace_payment_events where order_id='${order}'`))
        .rows,
    ).toHaveLength(1);
  });
  it('não confirma pagamento com valor/recebedor divergentes e não confia no retorno do navegador', async () => {
    const id = await listing(),
      order = await reserve([{ listing_id: id, quantity: 2 }]);
    await expect(attempt(() => pay(order, 'approved', 1000))).rejects.toThrow(/não corresponde/);
    await as(buyer);
    await fails(
      `update public.marketplace_orders set status='paid' where id='${order}'`,
      /permission denied/,
    );
  });
  it('pagamento aprovado após reserva vencida entra em revisão, nunca gera entrega automática', async () => {
    const id = await listing(),
      order = await reserve([{ listing_id: id, quantity: 2 }]);
    await owner();
    await db.exec(
      `update public.marketplace_orders set expires_at=now()-interval '1 second' where id='${order}'`,
    );
    expect((await pay(order)).rows[0].status).toBe('payment_review');
    await as(seller);
    await fails(`select public.marketplace_order_action('${order}','ready')`, /Ação inválida/);
  });
  it('concilia reembolso proporcional e libera a reserva sem inventar retorno físico de cartas', async () => {
    const id = await listing(),
      order = await reserve([{ listing_id: id, quantity: 2 }]);
    await pay(order);
    await pay(order, 'approved', 2002, 1001, 'partial');
    const partial = (
      await db.query<{ refunded_cents: number; refunded_commission_cents: number }>(
        `select * from public.marketplace_orders where id='${order}'`,
      )
    ).rows[0];
    expect(partial.refunded_cents).toBe(1001);
    expect(partial.refunded_commission_cents).toBe(75);
    await pay(order, 'refunded', 2002, 2002, 'full');
    expect(
      (
        await db.query<{ status: string }>(
          `select status from public.marketplace_orders where id='${order}'`,
        )
      ).rows[0].status,
    ).toBe('refunded');
    expect(
      (
        await db.query<{ quantity: number }>(
          `select quantity from public.collection_items where id='${a}'`,
        )
      ).rows[0].quantity,
    ).toBe(3);
  });
  it('pausa anúncios após nova taxa e exige novo aceite antes de republicar', async () => {
    const id = await listing();
    await as(admin);
    await db.exec(
      `select public.admin_update_settings(900,true,'Retirada em Lagarto após agendamento.')`,
    );
    const row = (
      await db.query<{ status: string }>(
        `select status from public.marketplace_listings where id='${id}'`,
      )
    ).rows[0];
    expect(row.status).toBe('paused');
    await as(seller);
    await fails(`select public.seller_set_listing_status('${id}','pending')`, /comissão|termos/);
  });
  it('deduz apenas a quantidade entregue mesmo quando outro comprador reservou o mesmo lote', async () => {
    const id = await listing(a, 1001, 3),
      order = await reserve([{ listing_id: id, quantity: 1 }]);
    await as(outsider);
    await db.exec(
      `select public.reserve_marketplace_order('[{"listing_id":"${id}","quantity":1}]','2026-10-19')`,
    );
    await pay(order, 'approved', 1001);
    await as(seller);
    await db.exec(`select public.marketplace_order_action('${order}','ready')`);
    await as(buyer);
    await db.exec(`select public.marketplace_order_action('${order}','complete')`);
    expect(
      (
        await db.query<{ available_quantity: number }>(
          `select * from public.marketplace_available_quantities(array['${id}']::uuid[])`,
        )
      ).rows[0].available_quantity,
    ).toBe(1);
  });
  it('identifica cobrança duplicada e só retoma o pedido após reembolso da cobrança excedente', async () => {
    const id = await listing(),
      order = await reserve([{ listing_id: id, quantity: 2 }]);
    await pay(order);
    const duplicate = await db.query<{ status: string }>(
      `select public.payment_apply('${order}','124','approved',2002,0,'12345','BRL','duplicate',now()) status`,
    );
    expect(duplicate.rows[0].status).toBe('payment_review');
    await db.exec(
      `select public.payment_apply('${order}','124','refunded',2002,2002,'12345','BRL','refund-duplicate',now())`,
    );
    const row = (
      await db.query<{ status: string; refunded_cents: number; payment_id: string }>(
        `select * from public.marketplace_orders where id='${order}'`,
      )
    ).rows[0];
    expect(row.status).toBe('paid');
    expect(row.refunded_cents).toBe(0);
    expect(row.payment_id).toBe('123');
    expect(
      (await db.query(`select * from public.marketplace_payments where order_id='${order}'`)).rows,
    ).toHaveLength(2);
  });
  it('busca nomes bilíngues pelo identificador e pagina sem expor anúncios privados', async () => {
    const id = await listing();
    await db.exec('reset role;set role anon');
    const result = await db.query<{ search_marketplace_listings: { id: string } }>(
      `select public.search_marketplace_listings('yugioh','dragão branco',array['89631139'],'recent',null,null,null,null,0,25)`,
    );
    expect(result.rows.map((x) => x.search_marketplace_listings.id)).toContain(id);
    expect(
      (
        await db.query(
          `select public.search_marketplace_listings('pokemon','',array[]::text[],'recent',null,null,null,null,0,25)`,
        )
      ).rows,
    ).toHaveLength(0);
  });
  it('não aceita fotos nulas nem republica condições antigas depois da edição de um lote pausado', async () => {
    await as(seller);
    await fails(
      `select public.submit_marketplace_listing('${a}',1,1000,'Carta física em bom estado.',array['${seller}/frente.jpg','${seller}/verso.jpg',null],true,null,'2026-10-19')`,
      /fotos próprias/,
    );
    const id = await listing();
    await as(seller);
    await db.exec(
      `select public.seller_set_listing_status('${id}','paused');update public.collection_items set condition='PO' where id='${a}'`,
    );
    await fails(`select public.seller_set_listing_status('${id}','pending')`, /condições/);
    await as(admin);
    await fails(`select public.admin_moderate_listing('${id}',true)`, /condições/);
  });
  it('não enumera fotos de rascunhos para visitantes e preserva evidência de pedidos antigos', async () => {
    await as(seller);
    const id = (
      await db.query<{ id: string }>(
        `select public.submit_marketplace_listing('${a}',1,1001,'Carta física em excelente estado.',array['${seller}/frente.jpg','${seller}/verso.jpg'],false,null,'2026-10-19') id`,
      )
    ).rows[0].id;
    await db.exec('reset role;set role anon');
    expect(
      (await db.query(`select name from storage.objects where bucket_id='marketplace-photos'`))
        .rows,
    ).toHaveLength(0);
    await as(seller);
    await db.exec(
      `select public.submit_marketplace_listing('${a}',1,1001,'Carta física em excelente estado.',array['${seller}/frente.jpg','${seller}/verso.jpg'],true,'${id}','2026-10-19')`,
    );
    await as(admin);
    await db.exec(`select public.admin_moderate_listing('${id}',true)`);
    const order = await reserve([{ listing_id: id, quantity: 1 }]);
    await pay(order, 'approved', 1001);
    await as(seller);
    await db.exec(`select public.marketplace_order_action('${order}','ready')`);
    await as(buyer);
    await db.exec(`select public.marketplace_order_action('${order}','complete')`);
    await owner();
    await db.exec(
      `insert into storage.objects(bucket_id,name) values('marketplace-photos','${seller}/nova-frente.jpg'),('marketplace-photos','${seller}/novo-verso.jpg')`,
    );
    await as(seller);
    await db.exec(
      `select public.submit_marketplace_listing('${a}',1,1001,'Carta física em excelente estado.',array['${seller}/nova-frente.jpg','${seller}/novo-verso.jpg'],false,'${id}','2026-10-19');delete from storage.objects where bucket_id='marketplace-photos' and name='${seller}/frente.jpg'`,
    );
    await owner();
    expect(
      (
        await db.query(
          `select name from storage.objects where bucket_id='marketplace-photos' and name='${seller}/frente.jpg'`,
        )
      ).rows,
    ).toHaveLength(1);
  });
});

describe('sessões privadas de homologação sem efeitos comerciais', () => {
  beforeEach(async () => {
    await owner();
    await db.exec(`insert into public.seller_payment_accounts(seller_id,connected) values('${admin}',true);
      insert into private.seller_payment_tokens(seller_id,provider_user_id,encrypted_tokens,expires_at) values('${admin}','67890','encrypted-test',now()+interval '1 day');
      update public.marketplace_settings set enabled=false,commission_bps=300 where id=true;`);
  });
  const claim = async (clientId = 'unit-sandbox-client') => {
    await db.exec('reset role;set role service_role');
    return (
      await db.query<{
        test: { id: string; lease_id: string; commission_cents: number; client_id: string };
      }>(`select public.payment_test_claim('${admin}','67890','${clientId}') test`)
    ).rows[0].test;
  };
  const save = async () => {
    const test = await claim();
    await db.exec(
      `select public.payment_test_save('${test.id}','${admin}','${test.lease_id}','test-preference','https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=test','unit-sandbox-client')`,
    );
    return test;
  };
  it('nega leitura direta e todas as RPCs ao cliente, inclusive admin autenticado', async () => {
    const test = await save();
    for (const id of [buyer, admin]) {
      await as(id);
      await fails('select * from private.marketplace_checkout_tests', /permission denied/);
      await fails(`select public.payment_test_get('${test.id}','${id}')`, /permission denied/);
      await fails(
        `select public.payment_test_claim('${id}','67890','unit-sandbox-client')`,
        /permission denied/,
      );
    }
    await db.exec('reset role;set role anon');
    await fails(`select public.payment_test_list('${admin}')`, /permission denied/);
  });
  it('serializa criação e recupera a mesma sessão sem abrir vendas nem anunciar cartas', async () => {
    const test = await claim();
    expect(test.commission_cents).toBe(30);
    await fails(
      `select public.payment_test_claim('${admin}','67890','unit-sandbox-client')`,
      /sendo preparado/,
    );
    await db.exec(`select public.payment_test_release('${test.id}','${test.lease_id}')`);
    const retried = await claim();
    expect(retried.id).toBe(test.id);
    expect(retried.lease_id).not.toBe(test.lease_id);
    await fails(
      `select public.payment_test_save('${test.id}','${admin}','${test.lease_id}','wrong','https://www.mercadopago.com.br','unit-sandbox-client')`,
      /mudou.*expirou/,
    );
    await owner();
    expect((await db.query('select enabled from public.marketplace_settings')).rows).toEqual([
      { enabled: false },
    ]);
    for (const name of ['marketplace_orders', 'marketplace_listings', 'marketplace_payments'])
      expect((await db.query(`select * from public.${name}`)).rows).toHaveLength(0);
  });
  it('restringe ator e vínculo financeiro, e rejeita comissão de 100%', async () => {
    await db.exec('set role service_role');
    await fails(
      `select public.payment_test_claim('${buyer}','67890','unit-sandbox-client')`,
      /restrito/,
    );
    await fails(
      `select public.payment_test_claim('${admin}','12345','unit-sandbox-client')`,
      /não corresponde/,
    );
    const test = await save();
    await fails(`select public.payment_test_get('${test.id}','${buyer}')`, /restrito/);
    await owner();
    await db.exec('update public.marketplace_settings set commission_bps=10000 where id=true');
    await db.exec('set role service_role');
    await fails(
      `select public.payment_test_claim('${admin}','67890','unit-sandbox-client')`,
      /menor que 100%/,
    );
  });
  it('registra somente fatos de teste válidos, ignora replay e não altera estoque/pedidos', async () => {
    const test = await save();
    for (const values of [
      "'other',1000,'BRL',false",
      "'67890',1001,'BRL',false",
      "'67890',1000,'USD',false",
      "'67890',1000,'BRL',null",
    ])
      await fails(
        `select public.payment_test_apply('${test.id}',${values.split(',')[0]},'123','approved',${values.split(',').slice(1).join(',')},'visa',now(),'unit-sandbox-client','55555','55555')`,
        /não corresponde/,
      );
    const sql = `select public.payment_test_apply('${test.id}','67890','123','approved',1000,'BRL',false,'visa',now(),'unit-sandbox-client','55555','55555') test`;
    const first = (await db.query<{ test: unknown }>(sql)).rows[0].test;
    expect((await db.query<{ test: unknown }>(sql)).rows[0].test).toEqual(first);
    await owner();
    expect((await db.query('select * from public.marketplace_orders')).rows).toHaveLength(0);
    expect((await db.query('select * from public.marketplace_payments')).rows).toHaveLength(0);
    expect(
      (await db.query(`select quantity from public.collection_items where id='${a}'`)).rows,
    ).toEqual([{ quantity: 3 }]);
  });
  it('não reutiliza sessão legada sem emissor e preserva seu histórico', async () => {
    await owner();
    const legacy = (
      await db.query<{ id: string }>(
        `insert into private.marketplace_checkout_tests(actor_id,provider_user_id,commission_bps,commission_cents,preference_id,checkout_url) values('${admin}','67890',300,30,'old-preference','https://www.mercadopago.com.br') returning id`,
      )
    ).rows[0].id;
    const current = await claim();
    expect(current.id).not.toBe(legacy);
    expect(current.client_id).toBe('unit-sandbox-client');
    const history = (
      await db.query<{ history: { id: string; client_id: string | null }[] }>(
        `select public.payment_test_list('${admin}') history`,
      )
    ).rows[0].history;
    expect(history).toHaveLength(2);
    expect(history.find((row) => row.id === legacy)?.client_id).toBeNull();
    await fails(
      `select public.payment_test_apply('${legacy}','67890','123','approved',1000,'BRL',false,'visa',now(),'unit-sandbox-client','55555','55555')`,
      /não corresponde/,
    );
  });
  it('cria outra sessão ao trocar aplicativo e rejeita gravações cruzadas', async () => {
    const first = await save();
    const other = await claim('other-sandbox-app');
    expect(other.id).not.toBe(first.id);
    expect(other.client_id).toBe('other-sandbox-app');
    await fails(
      `select public.payment_test_save('${other.id}','${admin}','${other.lease_id}','wrong','https://www.mercadopago.com.br','unit-sandbox-client')`,
      /outro aplicativo/,
    );
    await fails(
      `select public.payment_test_apply('${first.id}','67890','123','approved',1000,'BRL',false,'visa',now(),'other-sandbox-app','55555','55555')`,
      /aplicativo não corresponde/,
    );
    await fails(
      `select public.payment_test_apply('${first.id}','67890','123','approved',1000,'BRL',false,'visa',now(),null,'55555','55555')`,
      /aplicativo não corresponde/,
    );
    await fails(
      `select public.payment_test_claim('${admin}','67890',null)`,
      /Aplicativo.*inválido/,
    );
  });
  it('remove as assinaturas antigas que permitiam chamadas sem aplicativo', async () => {
    await db.exec('set role service_role');
    for (const signature of [
      'public.payment_test_claim(uuid,text)',
      'public.payment_test_save(uuid,uuid,uuid,text,text)',
      'public.payment_test_apply(uuid,text,text,text,integer,text,boolean,text,timestamptz)',
      'public.payment_test_apply(uuid,text,text,text,integer,text,boolean,text,timestamptz,text)',
    ])
      expect(
        (await db.query<{ fn: unknown }>(`select to_regprocedure('${signature}') fn`)).rows[0].fn,
      ).toBeNull();
  });
  it('preserva o live_mode observado apenas para comprador fictício esperado e distinto do vendedor', async () => {
    const test = await save();
    for (const [expected, actual] of [
      [null, '55555'],
      ['55555', null],
      ['55555', '66666'],
      ['67890', '67890'],
    ]) {
      const quote = (id: string | null) => (id === null ? 'null' : `'${id}'`);
      await fails(
        `select public.payment_test_apply('${test.id}','67890','123','approved',1000,'BRL',true,'visa',now(),'unit-sandbox-client',${quote(expected)},${quote(actual)})`,
        /comprador fictício/,
      );
    }
    const result = (
      await db.query<{ test: { provider_live_mode: boolean; payer_id: string } }>(
        `select public.payment_test_apply('${test.id}','67890','123','approved',1000,'BRL',true,'visa',now(),'unit-sandbox-client','55555','55555') test`,
      )
    ).rows[0].test;
    expect(result.provider_live_mode).toBe(true);
    expect(result.payer_id).toBe('55555');
    await owner();
    expect((await db.query('select * from public.marketplace_orders')).rows).toHaveLength(0);
  });
});
