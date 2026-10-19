-- Multi-game identities and protected operator administration.
-- Authorization is stored in a private table, never in editable user_metadata.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check(role='admin'),
  created_at timestamptz not null default now()
);
alter table private.user_roles enable row level security;
create table private.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
alter table private.admin_audit enable row level security;
create index admin_audit_actor_idx on private.admin_audit(actor_id,created_at desc);
revoke all on private.user_roles,private.admin_audit from public,anon,authenticated;

create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from private.user_roles where user_id=auth.uid() and role='admin');
$$;
create function public.get_my_role() returns text language sql stable security definer set search_path='' as $$
  select case when public.is_admin() then 'admin' else 'user' end;
$$;
revoke all on function public.is_admin(),public.get_my_role() from public,anon,authenticated;
grant execute on function public.is_admin(),public.get_my_role() to authenticated;

create table public.marketplace_settings (
  id boolean primary key default true check(id),
  commission_bps integer check(commission_bps between 0 and 10000),
  enabled boolean not null default false,
  pickup_instructions text not null default '' check(char_length(pickup_instructions)<=1000),
  operator_name text not null default 'Duelink' check(char_length(operator_name) between 2 and 100),
  operator_contact text not null default 'officegenisson@gmail.com' check(char_length(operator_contact)<=200),
  terms_version text not null default '2026-10-19',
  updated_at timestamptz not null default now(),
  check(not enabled or (commission_bps is not null and char_length(trim(pickup_instructions))>=10 and char_length(trim(operator_contact))>=5))
);
insert into public.marketplace_settings(id) values(true);
alter table public.marketplace_settings enable row level security;
create policy marketplace_settings_read on public.marketplace_settings for select to anon,authenticated using(true);
revoke all on public.marketplace_settings from public,anon,authenticated;
grant select on public.marketplace_settings to anon,authenticated;

create function public.admin_update_settings(p_commission_bps integer,p_enabled boolean,p_pickup_instructions text,p_operator_name text default 'Duelink',p_operator_contact text default 'officegenisson@gmail.com') returns jsonb
language plpgsql security definer set search_path='' as $$
declare before_row jsonb; after_row jsonb;
begin
  if not public.is_admin() then raise exception 'Acesso restrito à administração.'; end if;
  select to_jsonb(s) into before_row from public.marketplace_settings s where id=true for update;
  update public.marketplace_settings set terms_version=case when commission_bps is distinct from p_commission_bps then to_char(clock_timestamp(),'YYYY-MM-DD')||'-'||substr(gen_random_uuid()::text,1,8) else terms_version end,commission_bps=p_commission_bps,enabled=p_enabled,pickup_instructions=trim(p_pickup_instructions),operator_name=trim(p_operator_name),operator_contact=trim(p_operator_contact),updated_at=now() where id=true returning to_jsonb(marketplace_settings.*) into after_row;
  insert into private.admin_audit(actor_id,action,entity_id,before_data,after_data) values(auth.uid(),'settings.update','marketplace',before_row,after_row);
  return after_row;
end $$;
create function public.admin_list_members() returns table(id uuid,username text,display_name text,role text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Acesso restrito à administração.'; end if;
  return query select p.id,p.username,p.display_name,coalesce(r.role,'user'),p.created_at from public.profiles p left join private.user_roles r on r.user_id=p.id order by p.created_at desc limit 200;
end $$;
create function public.admin_set_user_role(p_user uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
declare previous_role text;
begin
  if not public.is_admin() then raise exception 'Acesso restrito à administração.'; end if;
  if p_role not in ('user','admin') or p_role is null then raise exception 'Permissão inválida.'; end if;
  lock table private.user_roles in share row exclusive mode;
  if not exists(select 1 from public.profiles where id=p_user) then raise exception 'Usuário não encontrado.'; end if;
  select role into previous_role from private.user_roles where user_id=p_user;
  if p_role='user' then
    if previous_role='admin' and (select count(*) from private.user_roles where role='admin')<=1 then raise exception 'Mantenha ao menos um administrador.'; end if;
    delete from private.user_roles where user_id=p_user;
  else
    insert into private.user_roles(user_id,role) values(p_user,'admin') on conflict(user_id) do update set role='admin';
  end if;
  insert into private.admin_audit(actor_id,action,entity_id,before_data,after_data) values(auth.uid(),'role.update',p_user::text,jsonb_build_object('role',coalesce(previous_role,'user')),jsonb_build_object('role',p_role));
end $$;
create function public.admin_get_audit() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Acesso restrito à administração.'; end if;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]') into result from (select id,actor_id,action,entity_id,before_data,after_data,created_at from private.admin_audit order by created_at desc limit 100) a;
 return result;
end $$;
revoke all on function public.admin_update_settings(integer,boolean,text,text,text),public.admin_list_members(),public.admin_set_user_role(uuid,text),public.admin_get_audit() from public,anon,authenticated;
grant execute on function public.admin_update_settings(integer,boolean,text,text,text),public.admin_list_members(),public.admin_set_user_role(uuid,text),public.admin_get_audit() to authenticated;

-- Preserve existing YGO values as their canonical external string IDs.
alter table public.collection_items drop constraint collection_items_card_id_check;
alter table public.collection_items alter column card_id type text using card_id::text;
alter table public.collection_items add column game text not null default 'yugioh' check(game in ('yugioh','pokemon'));
alter table public.collection_items add column image_url text check(image_url is null or char_length(image_url)<=1000);
alter table public.collection_items add constraint collection_card_key_check check(card_id ~ '^[A-Za-z0-9_.-]{1,80}$');
alter table public.wishlists drop constraint wishlists_card_id_check;
alter table public.wishlists drop constraint wishlists_user_id_card_id_key;
alter table public.wishlists alter column card_id type text using card_id::text;
alter table public.wishlists add column game text not null default 'yugioh' check(game in ('yugioh','pokemon'));
alter table public.wishlists add constraint wishlists_game_card_unique unique(user_id,game,card_id);
alter table public.wishlists add constraint wishlist_card_key_check check(card_id ~ '^[A-Za-z0-9_.-]{1,80}$');
create index collection_game_card_idx on public.collection_items(game,card_id,user_id) where for_trade and quantity>0;
create index wishlist_game_card_idx on public.wishlists(game,card_id,user_id);

-- Commerce replaces this hook once its tables are available.
create function public.commerce_item_reserved(p_item uuid) returns boolean language sql stable security definer set search_path='' as $$ select false; $$;
revoke all on function public.commerce_item_reserved(uuid) from public,anon,authenticated;

create or replace function public.guard_collection_item() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.card_id<>old.card_id or new.card_name<>old.card_name or new.id<>old.id or new.game<>old.game) then raise exception 'A identidade da carta não pode ser alterada.'; end if;
 if exists(select 1 from public.trades where status='accepted' and (offered_item_id=old.id or requested_item_id=old.id)) then raise exception 'Esta carta está reservada em uma troca aceita. Cancele a troca antes de editar.'; end if;
 if public.commerce_item_reserved(old.id) then raise exception 'Esta carta está reservada para venda.'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.guard_collection_item() from public,anon,authenticated;

drop function public.get_matches();
create function public.get_matches(selected_game text default 'yugioh') returns table(partner_id uuid,username text,display_name text,avatar_url text,neighborhood text,offered jsonb,wanted jsonb,score bigint)
language sql stable security definer set search_path='' as $$
 select p.id,p.username,p.display_name,p.avatar_url,p.neighborhood,
  (select jsonb_agg(to_jsonb(c)) from public.collection_items c where c.user_id=auth.uid() and c.game=selected_game and c.for_trade and c.quantity>0 and not public.commerce_item_reserved(c.id) and not exists(select 1 from public.trades t where t.status='accepted' and c.id in (t.offered_item_id,t.requested_item_id)) and exists(select 1 from public.wishlists w where w.user_id=p.id and w.game=c.game and w.card_id=c.card_id)),
  (select jsonb_agg(to_jsonb(c)) from public.collection_items c where c.user_id=p.id and c.game=selected_game and c.for_trade and c.quantity>0 and not public.commerce_item_reserved(c.id) and not exists(select 1 from public.trades t where t.status='accepted' and c.id in (t.offered_item_id,t.requested_item_id)) and exists(select 1 from public.wishlists w where w.user_id=auth.uid() and w.game=c.game and w.card_id=c.card_id)),
  (select count(*) from public.collection_items c where c.user_id=p.id and c.game=selected_game and c.for_trade and c.quantity>0 and not public.commerce_item_reserved(c.id) and exists(select 1 from public.wishlists w where w.user_id=auth.uid() and w.game=c.game and w.card_id=c.card_id))
 from public.profiles p where auth.uid() is not null and p.id<>auth.uid() and p.city='Lagarto'
 and exists(select 1 from public.collection_items c join public.wishlists w on w.game=c.game and w.card_id=c.card_id where c.user_id=p.id and w.user_id=auth.uid() and c.game=selected_game and c.for_trade and c.quantity>0 and not public.commerce_item_reserved(c.id) and not exists(select 1 from public.trades t where t.status='accepted' and c.id in (t.offered_item_id,t.requested_item_id)))
 and exists(select 1 from public.collection_items c join public.wishlists w on w.game=c.game and w.card_id=c.card_id where c.user_id=auth.uid() and w.user_id=p.id and c.game=selected_game and c.for_trade and c.quantity>0 and not public.commerce_item_reserved(c.id) and not exists(select 1 from public.trades t where t.status='accepted' and c.id in (t.offered_item_id,t.requested_item_id)))
 order by 8 desc,p.display_name;
$$;
revoke all on function public.get_matches(text) from public,anon,authenticated;
grant execute on function public.get_matches(text) to authenticated;
create or replace function public.create_trade(offered_id uuid,requested_id uuid,introduction text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.collection_items; b public.collection_items; result uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
  if char_length(introduction)>2000 then raise exception 'Mensagem muito longa.'; end if;
  perform id from public.collection_items where id in (offered_id,requested_id) order by id for update;
  select * into a from public.collection_items where id=offered_id;
  select * into b from public.collection_items where id=requested_id;
  if a.id is null or b.id is null or a.user_id<>auth.uid() or b.user_id=auth.uid() or not a.for_trade or not b.for_trade or a.quantity<1 or b.quantity<1 then
    raise exception 'Selecione duas cartas disponíveis de colecionadores diferentes.';
  end if;
  if a.game<>b.game then raise exception 'Selecione cartas do mesmo jogo.'; end if;
  if public.commerce_item_reserved(a.id) or public.commerce_item_reserved(b.id) then raise exception 'Uma das cartas está reservada para venda.'; end if;
  if exists(select 1 from public.trades where status='accepted' and (offered_item_id in (a.id,b.id) or requested_item_id in (a.id,b.id))) then raise exception 'Uma das cartas já está reservada.'; end if;
  insert into public.trades(proposer_id,recipient_id,offered_item_id,requested_item_id,offered_snapshot,requested_snapshot)
    values(auth.uid(),b.user_id,a.id,b.id,to_jsonb(a),to_jsonb(b)) returning id into result;
  if char_length(trim(introduction))>0 then insert into public.messages(trade_id,sender_id,content) values(result,auth.uid(),trim(introduction)); end if;
  return result;
end $$;

create or replace function public.transition_trade(trade uuid,action text) returns text
language plpgsql security definer set search_path='' as $$
declare t public.trades; a public.collection_items; b public.collection_items; final_status text;
begin
  select * into t from public.trades where id=trade for update;
  if t.id is null or auth.uid() is null or auth.uid() not in (t.proposer_id,t.recipient_id) then raise exception 'Troca não encontrada.'; end if;
  if action='accept' and t.status='pending' and auth.uid()=t.recipient_id then
    perform id from public.collection_items where id in (t.offered_item_id,t.requested_item_id) order by id for update;
    select * into a from public.collection_items where id=t.offered_item_id;
    select * into b from public.collection_items where id=t.requested_item_id;
    if a.id is null or b.id is null or a.quantity<1 or b.quantity<1 or not a.for_trade or not b.for_trade then raise exception 'Uma das cartas não está mais disponível.'; end if;
    if a.game<>b.game then raise exception 'Selecione cartas do mesmo jogo.'; end if;
    if public.commerce_item_reserved(a.id) or public.commerce_item_reserved(b.id) then raise exception 'Uma das cartas está reservada para venda.'; end if;
    if exists(select 1 from public.trades x where x.status='accepted' and x.id<>t.id and (x.offered_item_id in (a.id,b.id) or x.requested_item_id in (a.id,b.id))) then raise exception 'Uma das cartas já está reservada.'; end if;
    update public.trades set status='accepted',updated_at=now() where id=trade;
  elsif action='decline' and t.status='pending' and auth.uid()=t.recipient_id then
    update public.trades set status='declined',updated_at=now() where id=trade;
  elsif action='cancel' and (t.status='accepted' or (t.status='pending' and auth.uid()=t.proposer_id)) then
    update public.trades set status='cancelled',updated_at=now() where id=trade;
  elsif action='confirm' and t.status='accepted' then
    update public.trades set proposer_confirmed=proposer_confirmed or auth.uid()=proposer_id,recipient_confirmed=recipient_confirmed or auth.uid()=recipient_id,updated_at=now() where id=trade returning * into t;
    if t.proposer_confirmed and t.recipient_confirmed then
      perform id from public.collection_items where id in (t.offered_item_id,t.requested_item_id) order by id for update;
      select * into a from public.collection_items where id=t.offered_item_id;
      select * into b from public.collection_items where id=t.requested_item_id;
      if a.id is null or b.id is null or a.quantity<1 or b.quantity<1 then raise exception 'Cartas indisponíveis.'; end if;
      update public.trades set status='completed',updated_at=now() where id=trade;
      update public.collection_items set quantity=quantity-1 where id in (a.id,b.id);
      insert into public.collection_items(user_id,card_id,card_name,card_type,condition,language,rarity,set_code,for_trade,game,image_url)
        values(t.recipient_id,a.card_id,a.card_name,a.card_type,a.condition,a.language,a.rarity,a.set_code,false,a.game,a.image_url),
              (t.proposer_id,b.card_id,b.card_name,b.card_type,b.condition,b.language,b.rarity,b.set_code,false,b.game,b.image_url);
      delete from public.wishlists where (user_id=t.recipient_id and game=a.game and card_id=a.card_id) or (user_id=t.proposer_id and game=b.game and card_id=b.card_id);
      update public.trades set status='cancelled',updated_at=now() where id<>t.id and status='pending' and (offered_item_id in (a.id,b.id) or requested_item_id in (a.id,b.id));
    end if;
  else raise exception 'Ação inválida para o estado atual da troca.';
  end if;
  select status into final_status from public.trades where id=trade;
  return final_status;
end $$;

revoke all on function public.create_trade(uuid,uuid,text),public.transition_trade(uuid,text) from public,anon,authenticated;
grant execute on function public.create_trade(uuid,uuid,text),public.transition_trade(uuid,text) to authenticated;
