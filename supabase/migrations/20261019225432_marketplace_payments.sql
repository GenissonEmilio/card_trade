-- Marketplace local: a unidade física é compartilhada com coleção e trocas.
create table public.seller_payment_accounts (
  seller_id uuid primary key references public.profiles(id),
  connected boolean not null default false,
  updated_at timestamptz not null default now()
);
create table private.seller_payment_tokens (
  seller_id uuid primary key references public.profiles(id),
  provider_user_id text not null unique,
  encrypted_tokens text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table private.seller_payment_tokens enable row level security;
revoke all on private.seller_payment_tokens from public,anon,authenticated;

create table public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  collection_item_id uuid not null unique references public.collection_items(id),
  game text not null check(game in ('yugioh','pokemon')),
  card_id text not null,
  card_name text not null,
  image_url text,
  condition text not null,
  language text not null,
  rarity text not null,
  set_code text not null,
  description text not null check(char_length(description) between 10 and 2000),
  price_cents integer not null check(price_cents between 100 and 10000000),
  quantity integer not null check(quantity between 0 and 999),
  photos text[] not null check(cardinality(photos) between 1 and 6),
  status text not null default 'draft' check(status in ('draft','pending','active','rejected','paused','sold')),
  rejection_reason text check(char_length(rejection_reason)<=1000),
  seller_terms_version text not null,
  seller_commission_bps integer,
  seller_terms_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketplace_listings_feed_idx on public.marketplace_listings(game,status,created_at desc);
create index marketplace_listings_seller_idx on public.marketplace_listings(seller_id,updated_at desc);
create table public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  listing_id uuid not null references public.marketplace_listings(id),
  collection_item_id uuid not null references public.collection_items(id),
  listing_snapshot jsonb not null,
  items jsonb not null default '[]',
  quantity integer not null check(quantity between 1 and 19980),
  subtotal_cents integer not null check(subtotal_cents>0),
  commission_bps integer not null check(commission_bps between 0 and 10000),
  commission_cents integer not null check(commission_cents>=0),
  seller_net_cents integer not null check(seller_net_cents>=0),
  refunded_cents integer not null default 0 check(refunded_cents>=0 and refunded_cents<=subtotal_cents),
  refunded_commission_cents integer not null default 0,
  terms_version text not null,
  pickup_instructions text not null,
  status text not null default 'pending_payment' check(status in ('pending_payment','paid','ready','completed','cancelled','expired','refunded','disputed','payment_review')),
  expires_at timestamptz not null default now()+interval '30 minutes',
  payment_id text unique,
  payment_status text,
  fulfilled_at timestamptz,
  status_before_dispute text,
  request_reason text check(char_length(request_reason)<=2000),
  refund_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(buyer_id<>seller_id),
  check(subtotal_cents=commission_cents+seller_net_cents)
);
create index marketplace_orders_buyer_idx on public.marketplace_orders(buyer_id,created_at desc);
create index marketplace_orders_seller_idx on public.marketplace_orders(seller_id,created_at desc);
create index marketplace_orders_listing_idx on public.marketplace_orders(listing_id,status);
create index marketplace_orders_expiry_idx on public.marketplace_orders(expires_at) where status='pending_payment';
create index marketplace_orders_inventory_idx on public.marketplace_orders(collection_item_id,status,expires_at);
create table public.marketplace_order_items (
 order_id uuid not null references public.marketplace_orders(id),
 listing_id uuid not null references public.marketplace_listings(id),
 collection_item_id uuid not null references public.collection_items(id),
 quantity integer not null check(quantity between 1 and 999),
 unit_price_cents integer not null,
 subtotal_cents integer not null,
 listing_snapshot jsonb not null,
 primary key(order_id,listing_id)
);
create index marketplace_order_items_stock_idx on public.marketplace_order_items(collection_item_id,order_id);
alter table public.marketplace_order_items enable row level security;
revoke all on public.marketplace_order_items from anon,authenticated;
grant select on public.marketplace_order_items to authenticated;
create policy order_item_read on public.marketplace_order_items for select to authenticated using(exists(select 1 from public.marketplace_orders o where o.id=order_id and (auth.uid() in(o.buyer_id,o.seller_id) or public.is_admin())));
create table private.commerce_inventory_allowances(item_id uuid primary key,transaction_id bigint,quantity integer);
alter table private.commerce_inventory_allowances enable row level security;
revoke all on private.commerce_inventory_allowances from public,anon,authenticated;
create table private.marketplace_checkouts (
  order_id uuid primary key references public.marketplace_orders(id),
  preference_id text,
  checkout_url text,
  lease_until timestamptz,
  updated_at timestamptz not null default now()
);
create table private.marketplace_payment_events (
  event_key text primary key,
  order_id uuid not null references public.marketplace_orders(id),
  payment_id text not null,
  status text not null,
  refunded_cents integer not null,
  received_at timestamptz not null default now()
);
alter table private.marketplace_checkouts enable row level security;
alter table private.marketplace_payment_events enable row level security;
revoke all on private.marketplace_checkouts,private.marketplace_payment_events from public,anon,authenticated;
alter table public.seller_payment_accounts enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_orders enable row level security;
revoke all on public.seller_payment_accounts,public.marketplace_listings,public.marketplace_orders from anon,authenticated;
grant select on public.seller_payment_accounts,public.marketplace_orders to authenticated;
grant select on public.marketplace_listings to anon,authenticated;
create policy seller_account_read on public.seller_payment_accounts for select to authenticated using(seller_id=(select auth.uid()) or (select public.is_admin()));
create policy listing_read_anon on public.marketplace_listings for select to anon using(status='active');
create policy listing_read on public.marketplace_listings for select to authenticated using(status='active' or seller_id=(select auth.uid()) or (select public.is_admin()));
create policy order_read on public.marketplace_orders for select to authenticated using((select auth.uid()) in(buyer_id,seller_id) or (select public.is_admin()));

create or replace function public.commerce_item_reserved(p_item uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.marketplace_listings where collection_item_id=p_item and status in('pending','active'))
 or exists(select 1 from public.marketplace_orders o join public.marketplace_order_items i on i.order_id=o.id where i.collection_item_id=p_item and o.fulfilled_at is null and (status in('paid','ready','disputed','payment_review') or (status='pending_payment' and expires_at>now())));
$$;
revoke all on function public.commerce_item_reserved(uuid) from public,anon,authenticated;

-- Bloqueia edição de anúncios/estoque por fora das operações atômicas.
create or replace function public.guard_collection_item() returns trigger language plpgsql security definer set search_path='' as $$
declare allowed integer;
begin
 if tg_op='UPDATE' then
  delete from private.commerce_inventory_allowances where item_id=old.id and transaction_id=txid_current() returning quantity into allowed;
  if allowed is not null and new.quantity=old.quantity-allowed and (to_jsonb(new)-'quantity')=(to_jsonb(old)-'quantity') then return new; end if;
 end if;
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.card_id<>old.card_id or new.game<>old.game or new.card_name<>old.card_name or new.id<>old.id) then raise exception 'A identidade da carta não pode ser alterada.'; end if;
 if exists(select 1 from public.trades where status='accepted' and (offered_item_id=old.id or requested_item_id=old.id)) then raise exception 'Esta carta está reservada em uma troca aceita. Cancele a troca antes de editar.'; end if;
 if public.commerce_item_reserved(old.id) then raise exception 'Esta carta está reservada no marketplace. Pause o anúncio e finalize os pedidos antes de editar.'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;

create function public.submit_marketplace_listing(p_collection_item_id uuid,p_quantity integer,p_price_cents integer,p_description text,p_photos text[],p_submit boolean default true,p_listing_id uuid default null,p_terms_version text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.collection_items; l public.marketplace_listings; result uuid; settings public.marketplace_settings;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 select * into settings from public.marketplace_settings where id=true;
 if p_terms_version is null or settings.terms_version<>p_terms_version then raise exception 'Leia e aceite os termos atuais do marketplace.'; end if;
 if p_submit and settings.commission_bps is null then raise exception 'A administração precisa configurar a comissão antes da submissão.'; end if;
 perform id from public.marketplace_listings where collection_item_id=p_collection_item_id for update;
 select * into c from public.collection_items where id=p_collection_item_id for update;
 if c.id is null or c.user_id<>auth.uid() then raise exception 'Carta não encontrada na sua coleção.'; end if;
 select * into l from public.marketplace_listings where collection_item_id=c.id for update;
 if p_listing_id is not null and (l.id is null or l.id<>p_listing_id) then raise exception 'Anúncio não encontrado.'; end if;
 if exists(select 1 from public.trades where status='accepted' and (offered_item_id=c.id or requested_item_id=c.id)) or exists(select 1 from public.marketplace_orders o join public.marketplace_order_items i on i.order_id=o.id where i.collection_item_id=c.id and o.fulfilled_at is null and (status in('paid','ready','disputed','payment_review') or (status='pending_payment' and expires_at>now()))) then raise exception 'Carta reservada. Finalize os pedidos ou a troca antes de editar.'; end if;
 if p_quantity is null or p_quantity<1 or p_quantity>c.quantity then raise exception 'Quantidade indisponível na coleção.'; end if;
 if p_price_cents is null or p_price_cents<100 or p_price_cents>10000000 then raise exception 'Informe um preço de R$ 1 a R$ 100.000.'; end if;
 if p_description is null or char_length(trim(p_description)) not between 10 and 2000 then raise exception 'Descreva a carta em 10 a 2.000 caracteres.'; end if;
 if p_submit and (cardinality(p_photos)<2 or (select count(distinct photo) from unnest(p_photos) photo)<2) then raise exception 'Envie fotos diferentes da frente e do verso da carta.'; end if;
 if p_photos is null or array_position(p_photos,null) is not null or cardinality(p_photos) not between 1 and 6 or exists(select 1 from unnest(p_photos) photo where photo not like auth.uid()::text||'/%' or not exists(select 1 from storage.objects where bucket_id='marketplace-photos' and name=photo)) then raise exception 'Envie de uma a seis fotos próprias da carta.'; end if;
 if (select count(*) from public.marketplace_listings where seller_id=auth.uid() and created_at>now()-interval '1 hour')>=30 and l.id is null then raise exception 'Limite de anúncios por hora atingido.'; end if;
 insert into public.marketplace_listings(seller_id,collection_item_id,game,card_id,card_name,image_url,condition,language,rarity,set_code,description,price_cents,quantity,photos,status,seller_terms_version,seller_commission_bps)
 values(auth.uid(),c.id,c.game,c.card_id,c.card_name,c.image_url,c.condition,c.language,c.rarity,c.set_code,trim(p_description),p_price_cents,p_quantity,p_photos,case when p_submit then 'pending' else 'draft' end,p_terms_version,settings.commission_bps)
 on conflict(collection_item_id) do update set description=excluded.description,price_cents=excluded.price_cents,quantity=excluded.quantity,photos=excluded.photos,seller_terms_version=excluded.seller_terms_version,seller_commission_bps=excluded.seller_commission_bps,seller_terms_accepted_at=now(),status=excluded.status,rejection_reason=null,updated_at=now(),condition=excluded.condition,language=excluded.language,rarity=excluded.rarity,set_code=excluded.set_code,image_url=excluded.image_url
 returning id into result;
 return result;
end $$;
create function public.marketplace_listing_consistent(p_listing_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.marketplace_listings l join public.collection_items c on c.id=l.collection_item_id where l.id=p_listing_id and l.seller_id=c.user_id and l.game=c.game and l.card_id=c.card_id and l.card_name=c.card_name and l.condition=c.condition and l.language=c.language and l.rarity=c.rarity and l.set_code=c.set_code and l.image_url is not distinct from c.image_url and l.quantity<=c.quantity and l.quantity>0);
$$;
revoke all on function public.marketplace_listing_consistent(uuid) from public,anon,authenticated;
create function public.admin_moderate_listing(p_listing_id uuid,p_approved boolean,p_reason text default '') returns void language plpgsql security definer set search_path='' as $$
declare l public.marketplace_listings;
begin
 if not public.is_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
 select * into l from public.marketplace_listings where id=p_listing_id for update;
 if l.id is null or l.status not in('pending','active','paused') then raise exception 'Anúncio não está disponível para moderação.'; end if;
 perform id from public.collection_items where id=l.collection_item_id for update;
 if p_approved and not public.marketplace_listing_consistent(l.id) then raise exception 'O estoque ou as condições da carta mudaram. O vendedor precisa editar e reenviar o anúncio.'; end if;
 if p_approved and (cardinality(l.photos)<2 or not exists(select 1 from public.seller_payment_accounts where seller_id=l.seller_id and connected) or not exists(select 1 from public.marketplace_settings where id=true and commission_bps is not null and commission_bps=l.seller_commission_bps and terms_version=l.seller_terms_version)) then raise exception 'Confirme fotos frente/verso, conexão do vendedor e aceite da comissão/termos atuais antes de publicar.'; end if;
 if not p_approved and char_length(trim(p_reason))<5 then raise exception 'Informe o motivo da reprovação.'; end if;
 insert into private.admin_audit(actor_id,action,entity_id,before_data,after_data) values(auth.uid(),'moderate_listing',l.id::text,to_jsonb(l),jsonb_build_object('approved',p_approved,'reason',p_reason));
 update public.marketplace_listings set status=case when p_approved then 'active' else 'rejected' end,rejection_reason=case when p_approved then null else left(trim(p_reason),1000) end,updated_at=now() where id=l.id;
end $$;
create function public.seller_set_listing_status(p_listing_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare l public.marketplace_listings;
begin
 if auth.uid() is null or p_status not in('paused','pending') then raise exception 'Ação inválida.'; end if;
 select * into l from public.marketplace_listings where id=p_listing_id and seller_id=auth.uid() for update;
 if l.id is null then raise exception 'Anúncio não encontrado.'; end if;
 perform id from public.collection_items where id=l.collection_item_id for update;
 if p_status='pending' and not public.marketplace_listing_consistent(l.id) then raise exception 'O estoque ou as condições da carta mudaram. Edite e reenvie o anúncio.'; end if;
 if p_status='pending' and not exists(select 1 from public.marketplace_listings q join public.marketplace_settings s on s.id=true where q.id=p_listing_id and q.seller_commission_bps=s.commission_bps and q.seller_terms_version=s.terms_version) then raise exception 'Edite o anúncio para aceitar a comissão e os termos atuais.'; end if;
 update public.marketplace_listings set status=p_status,updated_at=now() where id=p_listing_id and seller_id=auth.uid() and status not in('sold','draft');
 if not found then raise exception 'Anúncio não encontrado.'; end if;
end $$;
create function public.reserve_marketplace_order(p_items jsonb,p_terms_version text) returns uuid language plpgsql security definer set search_path='' as $$
declare l public.marketplace_listings; c public.collection_items; s public.marketplace_settings; entry jsonb; cart jsonb:='[]'; seller uuid; reserved integer; qty integer; total bigint:=0; count_items integer:=0; fee integer; result uuid;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 select * into s from public.marketplace_settings where id=true;
 if not s.enabled or s.commission_bps is null or s.terms_version<>p_terms_version then raise exception 'As vendas ainda não estão disponíveis ou os termos mudaram. Atualize a página.'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Selecione de um a vinte anúncios do mesmo vendedor.'; end if;
 if (select count(distinct value->>'listing_id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'Agrupe as quantidades de cada anúncio.'; end if;
 -- Todos os pedidos bloqueiam anúncios e lotes na mesma ordem para evitar venda concorrente.
 perform id from public.marketplace_listings where id in(select (value->>'listing_id')::uuid from jsonb_array_elements(p_items)) order by id for update;
 perform id from public.collection_items where id in(select collection_item_id from public.marketplace_listings where id in(select (value->>'listing_id')::uuid from jsonb_array_elements(p_items))) order by id for update;
 for entry in select value from jsonb_array_elements(p_items) order by value->>'listing_id' loop
  qty:=(entry->>'quantity')::integer;
  select * into l from public.marketplace_listings where id=(entry->>'listing_id')::uuid;
  if l.id is null or l.status<>'active' or l.seller_id=auth.uid() then raise exception 'Anúncio indisponível.'; end if;
  if l.seller_commission_bps is distinct from s.commission_bps or l.seller_terms_version<>s.terms_version then raise exception 'A comissão mudou. O vendedor precisa atualizar o anúncio.'; end if;
  if seller is null then seller:=l.seller_id; elsif seller<>l.seller_id then raise exception 'Cada pedido deve conter cartas de um único vendedor.'; end if;
  if not exists(select 1 from public.seller_payment_accounts where seller_id=l.seller_id and connected) then raise exception 'O vendedor precisa conectar a conta Mercado Pago.'; end if;
  select * into c from public.collection_items where id=l.collection_item_id;
  if not public.marketplace_listing_consistent(l.id) then raise exception 'O estoque ou as condições deste anúncio mudaram. O vendedor precisa reenviá-lo.'; end if;
  if exists(select 1 from public.trades where status='accepted' and (offered_item_id=c.id or requested_item_id=c.id)) then raise exception 'Carta reservada em uma troca.'; end if;
  select coalesce(sum(i.quantity),0) into reserved from public.marketplace_order_items i join public.marketplace_orders o on o.id=i.order_id where i.collection_item_id=c.id and o.fulfilled_at is null and (o.status in('paid','ready','disputed','payment_review') or (o.status='pending_payment' and o.expires_at>now()));
  if qty is null or qty<1 or qty>least(l.quantity,c.quantity)-reserved then raise exception 'Quantidade indisponível; outra pessoa pode ter reservado esta carta.'; end if;
  total:=total+l.price_cents*qty; count_items:=count_items+qty;
  cart:=cart||jsonb_build_array(jsonb_build_object('listing_id',l.id,'collection_item_id',c.id,'quantity',qty,'unit_price_cents',l.price_cents,'subtotal_cents',l.price_cents*qty,'listing_snapshot',to_jsonb(l)));
 end loop;
 if total>10000000 then raise exception 'O pedido excede o limite de R$ 100.000.'; end if;
 if (select count(*) from public.marketplace_orders where buyer_id=auth.uid() and status='pending_payment' and expires_at>now())>=5 then raise exception 'Finalize ou cancele seus pedidos pendentes antes de continuar.'; end if;
 fee:=round(total::numeric*s.commission_bps/10000)::integer;
 insert into public.marketplace_orders(buyer_id,seller_id,listing_id,collection_item_id,listing_snapshot,items,quantity,subtotal_cents,commission_bps,commission_cents,seller_net_cents,terms_version,pickup_instructions)
 values(auth.uid(),seller,(cart->0->>'listing_id')::uuid,(cart->0->>'collection_item_id')::uuid,cart->0->'listing_snapshot',cart,count_items,total,s.commission_bps,fee,total-fee,s.terms_version,s.pickup_instructions) returning id into result;
 insert into public.marketplace_order_items(order_id,listing_id,collection_item_id,quantity,unit_price_cents,subtotal_cents,listing_snapshot)
 select result,(value->>'listing_id')::uuid,(value->>'collection_item_id')::uuid,(value->>'quantity')::integer,(value->>'unit_price_cents')::integer,(value->>'subtotal_cents')::integer,value->'listing_snapshot' from jsonb_array_elements(cart);
 return result;
end $$;
create function public.marketplace_order_action(p_order_id uuid,p_action text,p_reason text default '') returns text language plpgsql security definer set search_path='' as $$
declare o public.marketplace_orders; c public.collection_items; l public.marketplace_listings; item public.marketplace_order_items;
begin
 select * into o from public.marketplace_orders where id=p_order_id for update;
 if auth.uid() is null or o.id is null or auth.uid() not in(o.buyer_id,o.seller_id) then raise exception 'Pedido não encontrado.'; end if;
 if p_action='cancel' and o.status='pending_payment' then update public.marketplace_orders set status='cancelled',updated_at=now() where id=o.id;
 elsif p_action='ready' and o.status='paid' and auth.uid()=o.seller_id and not o.refund_requested then update public.marketplace_orders set status='ready',updated_at=now() where id=o.id;
 elsif p_action='complete' and o.status='ready' and auth.uid()=o.buyer_id and not o.refund_requested then
   perform id from public.marketplace_listings where id in(select listing_id from public.marketplace_order_items where order_id=o.id) order by id for update;
   perform id from public.collection_items where id in(select collection_item_id from public.marketplace_order_items where order_id=o.id) order by id for update;
   update public.marketplace_orders set status='completed',fulfilled_at=now(),updated_at=now() where id=o.id;
   for item in select * from public.marketplace_order_items where order_id=o.id loop
     select * into c from public.collection_items where id=item.collection_item_id;
     if c.quantity<item.quantity then raise exception 'Inconsistência de estoque. Entre em contato com a administração.'; end if;
     insert into private.commerce_inventory_allowances(item_id,transaction_id,quantity) values(c.id,txid_current(),item.quantity);
     update public.collection_items set quantity=quantity-item.quantity where id=c.id;
     update public.marketplace_listings set quantity=quantity-item.quantity,status=case when quantity-item.quantity=0 then 'sold' else status end,updated_at=now() where id=item.listing_id;
     insert into public.collection_items(user_id,card_id,card_name,card_type,game,image_url,quantity,condition,language,rarity,set_code,for_trade)
     values(o.buyer_id,c.card_id,c.card_name,c.card_type,c.game,c.image_url,item.quantity,c.condition,c.language,c.rarity,c.set_code,false);
     delete from public.wishlists where user_id=o.buyer_id and card_id=c.card_id and game=c.game;
   end loop;
 elsif p_action in('dispute','request_refund') and o.status in('paid','ready','completed','payment_review') then
   if char_length(trim(p_reason))<10 then raise exception 'Descreva o motivo em pelo menos 10 caracteres.'; end if;
   if p_action='request_refund' and auth.uid()<>o.buyer_id then raise exception 'Somente o comprador pode solicitar o reembolso.'; end if;
   update public.marketplace_orders set status_before_dispute=case when p_action='dispute' then status else status_before_dispute end,status=case when p_action='dispute' then 'disputed' else status end,refund_requested=p_action='request_refund' or refund_requested,request_reason=left(trim(p_reason),2000),updated_at=now() where id=o.id;
 else raise exception 'Ação inválida para o estado atual do pedido.';
 end if;
 return (select status from public.marketplace_orders where id=o.id);
end $$;

create table public.marketplace_order_events (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.marketplace_orders(id),
 actor_id uuid references public.profiles(id),
 event text not null,
 message text not null default '',
 created_at timestamptz not null default now()
);
create index marketplace_order_events_order_idx on public.marketplace_order_events(order_id,created_at);
create table public.marketplace_order_messages (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.marketplace_orders(id),
 sender_id uuid not null references public.profiles(id),
 content text not null check(char_length(trim(content)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index marketplace_order_messages_order_idx on public.marketplace_order_messages(order_id,created_at);
create index marketplace_order_messages_sender_idx on public.marketplace_order_messages(sender_id,created_at desc);
alter table public.marketplace_order_events enable row level security;
alter table public.marketplace_order_messages enable row level security;
revoke all on public.marketplace_order_events,public.marketplace_order_messages from anon,authenticated;
grant select on public.marketplace_order_events,public.marketplace_order_messages to authenticated;
grant insert on public.marketplace_order_messages to authenticated;
create policy order_event_read on public.marketplace_order_events for select to authenticated using(exists(select 1 from public.marketplace_orders where id=order_id and (auth.uid() in(buyer_id,seller_id) or public.is_admin())));
create policy order_message_read on public.marketplace_order_messages for select to authenticated using(exists(select 1 from public.marketplace_orders where id=order_id and (auth.uid() in(buyer_id,seller_id) or public.is_admin())));
create policy order_message_insert on public.marketplace_order_messages for insert to authenticated with check(sender_id=(select auth.uid()) and exists(select 1 from public.marketplace_orders where id=order_id and (auth.uid() in(buyer_id,seller_id) or public.is_admin())));
create function public.guard_marketplace_message() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public.marketplace_order_messages where sender_id=new.sender_id and created_at>now()-interval '10 seconds')>=10 then raise exception 'Você está enviando mensagens muito rápido.'; end if;
 return new;
end $$;
create trigger marketplace_message_rate before insert on public.marketplace_order_messages for each row execute function public.guard_marketplace_message();
create function public.log_marketplace_order() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or old.status is distinct from new.status or old.refund_requested is distinct from new.refund_requested or old.refunded_cents is distinct from new.refunded_cents then
  insert into public.marketplace_order_events(order_id,actor_id,event,message) values(new.id,auth.uid(),new.status,case when new.refund_requested then coalesce(new.request_reason,'Solicitação de reembolso') else '' end);
 end if;
 return new;
end $$;
create trigger marketplace_order_log after insert or update on public.marketplace_orders for each row execute function public.log_marketplace_order();
-- Somente o backend confiável pode manipular credenciais, preferências e estados financeiros.
alter table private.seller_payment_tokens add column refresh_lease_until timestamptz;
create function public.payment_store_seller(p_seller_id uuid,p_provider_user_id text,p_encrypted_tokens text,p_expires_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into private.seller_payment_tokens(seller_id,provider_user_id,encrypted_tokens,expires_at) values(p_seller_id,p_provider_user_id,p_encrypted_tokens,p_expires_at)
 on conflict(seller_id) do update set provider_user_id=excluded.provider_user_id,encrypted_tokens=excluded.encrypted_tokens,expires_at=excluded.expires_at,updated_at=now(),refresh_lease_until=null;
 insert into public.seller_payment_accounts(seller_id,connected) values(p_seller_id,true) on conflict(seller_id) do update set connected=true,updated_at=now();
end $$;
create function public.payment_get_seller(p_seller_id uuid default null,p_provider_user_id text default null) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(t) from private.seller_payment_tokens t where (p_seller_id is not null and t.seller_id=p_seller_id) or (p_provider_user_id is not null and t.provider_user_id=p_provider_user_id) limit 1;
$$;
create function public.payment_claim_checkout(p_order_id uuid,p_buyer_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.marketplace_orders; c private.marketplace_checkouts;
begin
 select * into o from public.marketplace_orders where id=p_order_id for update;
 if o.id is null or o.buyer_id<>p_buyer_id then raise exception 'Pedido não encontrado.'; end if;
 if not exists(select 1 from public.marketplace_settings where id=true and enabled and commission_bps is not null) then raise exception 'Checkout indisponível no momento.'; end if;
 if o.status<>'pending_payment' or o.expires_at<=now() then raise exception 'Pedido expirado ou já processado. Crie um novo pedido.'; end if;
 select * into c from private.marketplace_checkouts where order_id=o.id for update;
 if c.checkout_url is not null then return jsonb_build_object('order',to_jsonb(o),'url',c.checkout_url); end if;
 if c.lease_until>now() then raise exception 'O checkout está sendo preparado. Tente novamente em alguns segundos.'; end if;
 insert into private.marketplace_checkouts(order_id,lease_until) values(o.id,now()+interval '45 seconds') on conflict(order_id) do update set lease_until=excluded.lease_until;
 return jsonb_build_object('order',to_jsonb(o));
end $$;
create function public.payment_save_checkout(p_order_id uuid,p_preference_id text,p_checkout_url text) returns void language plpgsql security definer set search_path='' as $$
begin
 update private.marketplace_checkouts set preference_id=p_preference_id,checkout_url=p_checkout_url,lease_until=null,updated_at=now() where order_id=p_order_id;
end $$;
create function public.payment_release_checkout(p_order_id uuid) returns void language sql security definer set search_path='' as $$
 update private.marketplace_checkouts set lease_until=null where order_id=p_order_id and checkout_url is null;
$$;
alter table public.marketplace_orders add column payment_updated_at timestamptz;
create table public.marketplace_payments (
 payment_id text primary key,
 order_id uuid not null references public.marketplace_orders(id),
 status text not null,
 amount_cents integer not null,
 refunded_cents integer not null,
 updated_at timestamptz not null
);
create index marketplace_payments_order_idx on public.marketplace_payments(order_id);
alter table public.marketplace_payments enable row level security;
revoke all on public.marketplace_payments from anon,authenticated;
grant select on public.marketplace_payments to authenticated;
create policy marketplace_payments_read on public.marketplace_payments for select to authenticated using(exists(select 1 from public.marketplace_orders where id=order_id and (auth.uid() in(buyer_id,seller_id) or public.is_admin())));
create function public.payment_apply(p_order_id uuid,p_payment_id text,p_status text,p_amount_cents integer,p_refunded_cents integer,p_collector_id text,p_currency text,p_event_key text,p_updated_at timestamptz) returns text language plpgsql security definer set search_path='' as $$
declare o public.marketplace_orders; affected integer; item public.marketplace_order_items; available integer;
begin
 select * into o from public.marketplace_orders where id=p_order_id for update;
 if o.id is null then raise exception 'Pedido não encontrado.'; end if;
 if p_currency<>'BRL' or p_amount_cents<>o.subtotal_cents or p_refunded_cents<0 or p_refunded_cents>o.subtotal_cents or not exists(select 1 from private.seller_payment_tokens where seller_id=o.seller_id and provider_user_id=p_collector_id) then raise exception 'O pagamento não corresponde ao pedido.'; end if;
 insert into public.marketplace_payments(payment_id,order_id,status,amount_cents,refunded_cents,updated_at) values(p_payment_id,o.id,p_status,p_amount_cents,p_refunded_cents,p_updated_at) on conflict(payment_id) do update set status=excluded.status,refunded_cents=excluded.refunded_cents,updated_at=excluded.updated_at where marketplace_payments.order_id=excluded.order_id and marketplace_payments.updated_at<=excluded.updated_at;
 insert into private.marketplace_payment_events(event_key,order_id,payment_id,status,refunded_cents) values(p_event_key,o.id,p_payment_id,p_status,p_refunded_cents) on conflict do nothing;
 get diagnostics affected=row_count;
 if affected=0 then return o.status; end if;
 if o.payment_updated_at>p_updated_at and o.payment_id=p_payment_id then return o.status; end if;
 if o.payment_id is not null and o.payment_id<>p_payment_id and o.payment_status in('approved','refunded','charged_back','in_mediation') then
  if p_status in('approved','charged_back','in_mediation') and p_refunded_cents<p_amount_cents then
   insert into public.marketplace_order_events(order_id,event,message) values(o.id,'duplicate_payment',format('Pagamento adicional %s recebido; concilie e reembolse a cobrança excedente.',p_payment_id));
   update public.marketplace_orders set status_before_dispute=case when status<>'payment_review' then status else status_before_dispute end,status='payment_review',refund_requested=true,request_reason='Possível pagamento duplicado; conciliação necessária.',updated_at=now() where id=o.id;
   return 'payment_review';
  elsif o.status='payment_review' and o.request_reason='Possível pagamento duplicado; conciliação necessária.' and not exists(select 1 from public.marketplace_payments where order_id=o.id and payment_id<>o.payment_id and status in('approved','charged_back','in_mediation') and refunded_cents<amount_cents) then
   update public.marketplace_orders set status=case when fulfilled_at is not null then 'completed' when status_before_dispute='ready' then 'ready' when status_before_dispute='paid' then 'paid' else 'payment_review' end,refund_requested=false,request_reason=null,updated_at=now() where id=o.id;
  end if;
  return (select status from public.marketplace_orders where id=o.id);
 end if;
 if p_status='approved' and o.status in('pending_payment','expired','cancelled') then
  -- Uma aprovação após cancelamento/expiração jamais retoma estoque já liberado.
  if o.status<>'pending_payment' or o.expires_at<=now() then
   update public.marketplace_orders set status='payment_review',refund_requested=true,request_reason='Pagamento aprovado após cancelamento ou fim da reserva. Verifique e reembolse.',updated_at=now() where id=o.id;
  else update public.marketplace_orders set status='paid',updated_at=now() where id=o.id;
  end if;
 elsif p_status='refunded' or p_refunded_cents=o.subtotal_cents then
  update public.marketplace_orders set status='refunded',refund_requested=false,updated_at=now() where id=o.id;
 elsif p_status in('charged_back','in_mediation') then
  update public.marketplace_orders set status_before_dispute=case when status<>'disputed' then status else status_before_dispute end,status='disputed',request_reason='Pagamento em contestação no Mercado Pago. Não entregue as cartas até a análise.',updated_at=now() where id=o.id;
 elsif p_status='cancelled' and o.status='pending_payment' then
  update public.marketplace_orders set status='cancelled',updated_at=now() where id=o.id;
 end if;
 update public.marketplace_orders set payment_id=p_payment_id,payment_status=p_status,payment_updated_at=p_updated_at,refunded_cents=greatest(refunded_cents,p_refunded_cents),refunded_commission_cents=round(commission_cents::numeric*greatest(refunded_cents,p_refunded_cents)/subtotal_cents)::integer,updated_at=now() where id=o.id;
 return (select status from public.marketplace_orders where id=o.id);
end $$;

-- Os métodos financeiros não têm grant para clientes, mesmo em projetos com defaults permissivos.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature,p.proname name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'payment_%' or p.proname in('guard_marketplace_message','log_marketplace_order','submit_marketplace_listing','admin_moderate_listing','seller_set_listing_status','reserve_marketplace_order','marketplace_order_action')) loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if f.name like 'payment_%' then
   if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant execute on function %s to service_role',f.signature); end if;
  elsif f.name in('submit_marketplace_listing','admin_moderate_listing','seller_set_listing_status','reserve_marketplace_order','marketplace_order_action') then execute format('grant execute on function %s to authenticated',f.signature);
  end if;
 end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('marketplace-photos','marketplace-photos',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy marketplace_photo_public_read on storage.objects for select to anon,authenticated using(bucket_id='marketplace-photos' and exists(select 1 from public.marketplace_listings l where l.status='active' and l.photos @> array[name]));
create policy marketplace_photo_participant_read on storage.objects for select to authenticated using(bucket_id='marketplace-photos' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.is_admin()) or exists(select 1 from public.marketplace_order_items i where i.listing_snapshot->'photos' ? name)));
create policy marketplace_photo_insert on storage.objects for insert to authenticated with check(bucket_id='marketplace-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Anúncios possuem snapshots: fotografias publicadas não podem ser sobrescritas ou apagadas.
create policy marketplace_photo_delete on storage.objects for delete to authenticated using(bucket_id='marketplace-photos' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.marketplace_listings where photos @> array[name]) and not exists(select 1 from public.marketplace_order_items where listing_snapshot->'photos' ? name) and not exists(select 1 from public.marketplace_orders where listing_snapshot->'photos' ? name));
create function public.marketplace_available_quantities(p_listing_ids uuid[]) returns table(listing_id uuid,available_quantity integer) language sql stable security definer set search_path='' as $$
 select l.id,case when exists(select 1 from public.trades t where t.status='accepted' and c.id in(t.offered_item_id,t.requested_item_id)) then 0 else greatest(0,least(l.quantity,c.quantity)-coalesce((select sum(i.quantity)::integer from public.marketplace_order_items i join public.marketplace_orders o on o.id=i.order_id where i.collection_item_id=c.id and o.fulfilled_at is null and (o.status in('paid','ready','disputed','payment_review') or (o.status='pending_payment' and o.expires_at>now()))),0)) end
 from public.marketplace_listings l join public.collection_items c on c.id=l.collection_item_id
 where cardinality(p_listing_ids)<=100 and l.id=any(p_listing_ids) and (l.status='active' or l.seller_id=auth.uid() or public.is_admin());
$$;
revoke all on function public.marketplace_available_quantities(uuid[]) from public,anon,authenticated;
grant execute on function public.marketplace_available_quantities(uuid[]) to anon,authenticated;
create function public.payment_expire_orders() returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
 update public.marketplace_orders set status='expired',updated_at=now() where status='pending_payment' and expires_at<=now();
 get diagnostics affected=row_count; return affected;
end $$;
revoke all on function public.payment_expire_orders() from public,anon,authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.payment_expire_orders() to service_role; end if; end $$;
-- Mudanças de taxa/termos pedem novo aceite do vendedor, sem alterar pedidos existentes.
create function public.pause_marketplace_on_terms_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.commission_bps is distinct from new.commission_bps or old.terms_version is distinct from new.terms_version then
  update public.marketplace_listings set status='paused',rejection_reason='A comissão ou os termos mudaram. Edite e reenvie o anúncio para novo aceite.',updated_at=now() where status in('active','pending');
 end if;
 return new;
end $$;
revoke all on function public.pause_marketplace_on_terms_change() from public,anon,authenticated;
create trigger marketplace_terms_change after update on public.marketplace_settings for each row execute function public.pause_marketplace_on_terms_change();
create function public.admin_resolve_marketplace_dispute(p_order_id uuid,p_reason text) returns text language plpgsql security definer set search_path='' as $$
declare o public.marketplace_orders; result text;
begin
 if not public.is_admin() then raise exception 'Acesso restrito à administração.'; end if;
 if char_length(trim(p_reason))<10 then raise exception 'Descreva a resolução em pelo menos 10 caracteres.'; end if;
 select * into o from public.marketplace_orders where id=p_order_id for update;
 if o.id is null or o.status<>'disputed' or o.payment_status<>'approved' then raise exception 'Concilie o pagamento no Mercado Pago antes de resolver a contestação.'; end if;
 result:=case when o.fulfilled_at is not null then 'completed' when o.status_before_dispute='ready' then 'ready' else 'paid' end;
 update public.marketplace_orders set status=result,refund_requested=false,updated_at=now() where id=o.id;
 insert into public.marketplace_order_events(order_id,actor_id,event,message) values(o.id,auth.uid(),'dispute_resolved',trim(p_reason));
 insert into private.admin_audit(actor_id,action,entity_id,before_data,after_data) values(auth.uid(),'dispute.resolve',o.id::text,to_jsonb(o),jsonb_build_object('status',result,'reason',p_reason));
 return result;
end $$;
revoke all on function public.admin_resolve_marketplace_dispute(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_resolve_marketplace_dispute(uuid,text) to authenticated;
create function public.payment_log_refund(p_order_id uuid,p_actor_id uuid,p_amount_cents integer,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.marketplace_orders where id=p_order_id and seller_id=p_actor_id) and not exists(select 1 from private.user_roles where user_id=p_actor_id and role='admin') then raise exception 'Acesso restrito ao responsável pelo reembolso.'; end if;
 insert into public.marketplace_order_events(order_id,actor_id,event,message) values(p_order_id,p_actor_id,'refund_initiated',format('Reembolso solicitado: R$ %s. %s',p_amount_cents::numeric/100,left(trim(p_reason),1000)));
 insert into private.admin_audit(actor_id,action,entity_id,after_data) values(p_actor_id,'payment.refund',p_order_id::text,jsonb_build_object('amount_cents',p_amount_cents,'reason',p_reason));
end $$;
revoke all on function public.payment_log_refund(uuid,uuid,integer,text) from public,anon,authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then
 grant execute on function public.payment_log_refund(uuid,uuid,integer,text) to service_role;
 grant select on public.marketplace_orders,public.marketplace_settings to service_role;
end if; end $$;
create function public.payment_claim_seller_refresh(p_seller_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t private.seller_payment_tokens;
begin
 select * into t from private.seller_payment_tokens where seller_id=p_seller_id for update;
 if t.seller_id is null then raise exception 'Conecte a conta Mercado Pago.'; end if;
 if t.expires_at>now()+interval '60 seconds' then return to_jsonb(t)||jsonb_build_object('refresh',false); end if;
 if t.refresh_lease_until>now() then raise exception 'A conexão Mercado Pago está sendo renovada. Tente novamente em alguns segundos.'; end if;
 update private.seller_payment_tokens set refresh_lease_until=now()+interval '30 seconds' where seller_id=t.seller_id;
 return to_jsonb(t)||jsonb_build_object('refresh',true);
end $$;
create function public.payment_release_seller_refresh(p_seller_id uuid) returns void language sql security definer set search_path='' as $$
 update private.seller_payment_tokens set refresh_lease_until=null where seller_id=p_seller_id;
$$;
revoke all on function public.payment_claim_seller_refresh(uuid),public.payment_release_seller_refresh(uuid) from public,anon,authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.payment_claim_seller_refresh(uuid),public.payment_release_seller_refresh(uuid) to service_role; end if; end $$;
-- IDs can include every matching external-catalog name without exceeding a GET URL limit.
create function public.search_marketplace_listings(p_game text,p_query text default '',p_card_ids text[] default '{}',p_sort text default 'recent',p_min_price integer default null,p_max_price integer default null,p_condition text default null,p_language text default null,p_offset integer default 0,p_limit integer default 25) returns setof jsonb language sql stable security invoker set search_path='' as $$
 select to_jsonb(l)||jsonb_build_object('seller',to_jsonb(p)) from public.marketplace_listings l join public.profiles p on p.id=l.seller_id
 where l.game=p_game and l.status='active'
 and (p_query='' or l.card_id=any(p_card_ids) or translate(lower(l.card_name||' '||l.description||' '||l.set_code||' '||l.card_id||' '||p.display_name||' '||p.username),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc') like '%'||replace(replace(replace(lower(p_query),'\','\\'),'%','\%'),'_','\_')||'%')
 and (p_min_price is null or l.price_cents>=p_min_price) and (p_max_price is null or l.price_cents<=p_max_price)
 and (p_condition is null or l.condition=p_condition) and (p_language is null or l.language=p_language)
 order by case when p_sort='price_asc' then l.price_cents end asc,case when p_sort='price_desc' then l.price_cents end desc,l.created_at desc,l.id
 limit least(greatest(p_limit,1),61) offset least(greatest(p_offset,0),10000);
$$;
revoke all on function public.search_marketplace_listings(text,text,text[],text,integer,integer,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.search_marketplace_listings(text,text,text[],text,integer,integer,text,text,integer,integer) to anon,authenticated;
