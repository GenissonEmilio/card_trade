-- Duelink: trocas presenciais entre colecionadores de Lagarto/SE.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 2 and 60),
  bio text not null default '' check (char_length(bio) <= 500),
  neighborhood text not null default '' check (char_length(neighborhood) <= 80),
  city text not null default 'Lagarto' check (city = 'Lagarto'),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare requested text; display text;
begin
  requested := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if requested !~ '^[a-z0-9_]{3,24}$' or exists(select 1 from public.profiles where username=requested) then
    requested := 'duelista_' || substr(replace(new.id::text,'-',''),1,14);
  end if;
  display := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Duelista'),60);
  if char_length(display)<2 then display := 'Duelista'; end if;
  insert into public.profiles(id,username,display_name) values(new.id,requested,display);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id bigint not null check (card_id between 1 and 9999999999),
  card_name text not null check(char_length(card_name) between 1 and 200),
  card_type text not null default 'Effect Monster' check(char_length(card_type)<=80),
  quantity integer not null default 1 check(quantity between 0 and 999),
  condition text not null default 'NM' check(condition in ('MT','NM','EX','GD','LP','PL','PO')),
  language text not null default 'PT' check(language in ('PT','EN','ES','JP','DE','FR','IT','KR','ZH')),
  rarity text not null default 'Common' check(char_length(rarity)<=100),
  set_code text not null default '' check(char_length(set_code)<=40),
  for_trade boolean not null default true,
  notes text not null default '' check(char_length(notes)<=500),
  photo_url text check(photo_url is null or char_length(photo_url)<=500),
  created_at timestamptz not null default now()
);
create index collection_trade_idx on public.collection_items(card_id,user_id) where for_trade and quantity>0;
create index collection_owner_idx on public.collection_items(user_id);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id bigint not null check(card_id between 1 and 9999999999),
  card_name text not null check(char_length(card_name) between 1 and 200),
  card_type text not null default 'Effect Monster' check(char_length(card_type)<=80),
  created_at timestamptz not null default now(),
  unique(user_id,card_id)
);
create index wishlist_card_idx on public.wishlists(card_id);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  offered_item_id uuid references public.collection_items(id) on delete set null,
  requested_item_id uuid references public.collection_items(id) on delete set null,
  offered_snapshot jsonb not null,
  requested_snapshot jsonb not null,
  status text not null default 'pending' check(status in ('pending','accepted','completed','declined','cancelled')),
  proposer_confirmed boolean not null default false,
  recipient_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(proposer_id<>recipient_id)
);
create index trade_participants_idx on public.trades(proposer_id,recipient_id,status);
create unique index trade_pending_pair_idx on public.trades(proposer_id,offered_item_id,requested_item_id) where status='pending';
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text not null check(char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_trade_idx on public.messages(trade_id,created_at);
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id),
  reviewer_id uuid not null references public.profiles(id),
  reviewed_id uuid not null references public.profiles(id),
  rating integer not null check(rating between 1 and 5),
  comment text not null default '' check(char_length(comment)<=500),
  created_at timestamptz not null default now(),
  unique(trade_id,reviewer_id), check(reviewer_id<>reviewed_id)
);

alter table public.profiles enable row level security;
alter table public.collection_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.trades enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

create policy profiles_read on public.profiles for select using(true);
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy collection_read on public.collection_items for select using(user_id=(select auth.uid()) or (for_trade and quantity>0));
create policy collection_insert on public.collection_items for insert to authenticated with check(user_id=(select auth.uid()));
create policy collection_update on public.collection_items for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy collection_delete on public.collection_items for delete to authenticated using(user_id=(select auth.uid()));
create policy wishlist_read on public.wishlists for select to authenticated using(user_id=(select auth.uid()));
create policy wishlist_insert on public.wishlists for insert to authenticated with check(user_id=(select auth.uid()));
create policy wishlist_delete on public.wishlists for delete to authenticated using(user_id=(select auth.uid()));
create policy trades_read on public.trades for select to authenticated using((select auth.uid()) in (proposer_id,recipient_id));
create policy messages_read on public.messages for select to authenticated using(exists(select 1 from public.trades t where t.id=trade_id and (select auth.uid()) in (t.proposer_id,t.recipient_id)));
create policy messages_insert on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and exists(select 1 from public.trades t where t.id=trade_id and (select auth.uid()) in (t.proposer_id,t.recipient_id) and t.status in ('pending','accepted')));
create policy reviews_read on public.reviews for select using(true);
create policy reviews_insert on public.reviews for insert to authenticated with check(reviewer_id=(select auth.uid()) and exists(select 1 from public.trades t where t.id=trade_id and t.status='completed' and (t.proposer_id=reviewer_id and t.recipient_id=reviewed_id or t.recipient_id=reviewer_id and t.proposer_id=reviewed_id)));

-- Impede alterar identidade/metadados e itens reservados em negociação aceita.
create function public.guard_collection_item() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.user_id<>old.user_id or new.card_id<>old.card_id or new.card_name<>old.card_name or new.id<>old.id) then
    raise exception 'A identidade da carta não pode ser alterada.';
  end if;
  if exists(select 1 from public.trades where status='accepted' and (offered_item_id=old.id or requested_item_id=old.id)) then
    raise exception 'Esta carta está reservada em uma troca aceita. Cancele a troca antes de editar.';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger protect_collection before update or delete on public.collection_items for each row execute function public.guard_collection_item();

create function public.get_matches() returns table(partner_id uuid,username text,display_name text,avatar_url text,neighborhood text,offered jsonb,wanted jsonb,score bigint)
language sql stable security definer set search_path='' as $$
  select p.id,p.username,p.display_name,p.avatar_url,p.neighborhood,
    (select jsonb_agg(to_jsonb(c)) from public.collection_items c where c.user_id=auth.uid() and c.for_trade and c.quantity>0 and exists(select 1 from public.wishlists w where w.user_id=p.id and w.card_id=c.card_id)),
    (select jsonb_agg(to_jsonb(c)) from public.collection_items c where c.user_id=p.id and c.for_trade and c.quantity>0 and exists(select 1 from public.wishlists w where w.user_id=auth.uid() and w.card_id=c.card_id)),
    (select count(*) from public.collection_items c where c.user_id=p.id and c.for_trade and c.quantity>0 and exists(select 1 from public.wishlists w where w.user_id=auth.uid() and w.card_id=c.card_id))
  from public.profiles p where auth.uid() is not null and p.id<>auth.uid() and p.city='Lagarto'
    and exists(select 1 from public.collection_items c join public.wishlists w on w.card_id=c.card_id where c.user_id=p.id and w.user_id=auth.uid() and c.for_trade and c.quantity>0)
    and exists(select 1 from public.collection_items c join public.wishlists w on w.card_id=c.card_id where c.user_id=auth.uid() and w.user_id=p.id and c.for_trade and c.quantity>0)
  order by 8 desc,p.display_name;
$$;

create function public.create_trade(offered_id uuid,requested_id uuid,introduction text default '') returns uuid
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
  if exists(select 1 from public.trades where status='accepted' and (offered_item_id in (a.id,b.id) or requested_item_id in (a.id,b.id))) then raise exception 'Uma das cartas já está reservada.'; end if;
  insert into public.trades(proposer_id,recipient_id,offered_item_id,requested_item_id,offered_snapshot,requested_snapshot)
    values(auth.uid(),b.user_id,a.id,b.id,to_jsonb(a),to_jsonb(b)) returning id into result;
  if char_length(trim(introduction))>0 then insert into public.messages(trade_id,sender_id,content) values(result,auth.uid(),trim(introduction)); end if;
  return result;
end $$;

create function public.transition_trade(trade uuid,action text) returns text
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
      insert into public.collection_items(user_id,card_id,card_name,card_type,condition,language,rarity,set_code,for_trade)
        values(t.recipient_id,a.card_id,a.card_name,a.card_type,a.condition,a.language,a.rarity,a.set_code,false),
              (t.proposer_id,b.card_id,b.card_name,b.card_type,b.condition,b.language,b.rarity,b.set_code,false);
      delete from public.wishlists where (user_id=t.recipient_id and card_id=a.card_id) or (user_id=t.proposer_id and card_id=b.card_id);
      update public.trades set status='cancelled',updated_at=now() where id<>t.id and status='pending' and (offered_item_id in (a.id,b.id) or requested_item_id in (a.id,b.id));
    end if;
  else raise exception 'Ação inválida para o estado atual da troca.';
  end if;
  select status into final_status from public.trades where id=trade;
  return final_status;
end $$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.guard_collection_item() from public;
revoke all on function public.get_matches() from public;
revoke all on function public.create_trade(uuid,uuid,text) from public;
revoke all on function public.transition_trade(uuid,text) from public;
grant execute on function public.get_matches() to authenticated;
grant execute on function public.create_trade(uuid,uuid,text) to authenticated;
grant execute on function public.transition_trade(uuid,text) to authenticated;
revoke all on public.profiles,public.collection_items,public.wishlists,public.trades,public.messages,public.reviews from anon,authenticated;
grant usage on schema public to anon,authenticated;
grant select on public.profiles,public.collection_items,public.reviews to anon,authenticated;
grant update(username,display_name,bio,neighborhood,avatar_url) on public.profiles to authenticated;
grant insert,update,delete on public.collection_items to authenticated;
grant select,insert,delete on public.wishlists to authenticated;
grant select on public.trades to authenticated;
grant select,insert on public.messages to authenticated;
grant insert on public.reviews to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('avatars','avatars',true,2097152,array['image/jpeg','image/png','image/webp']),
 ('card-photos','card-photos',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('card-images','card-images',true,5242880,array['image/jpeg'])
on conflict(id) do nothing;
create policy public_media_read on storage.objects for select using(bucket_id in ('avatars','card-photos','card-images'));
create policy owned_media_insert on storage.objects for insert to authenticated with check(bucket_id in ('avatars','card-photos') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy owned_media_update on storage.objects for update to authenticated using(bucket_id in ('avatars','card-photos') and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id in ('avatars','card-photos') and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy owned_media_delete on storage.objects for delete to authenticated using(bucket_id in ('avatars','card-photos') and (storage.foldername(name))[1]=(select auth.uid())::text);
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
