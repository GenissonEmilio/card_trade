-- Decks are lists, not ownership records. Saving a draft does not reserve stock.
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null check(game in ('yugioh','pokemon')),
  name text not null check(char_length(trim(name)) between 1 and 100),
  description text not null default '' check(char_length(description)<=1000),
  format text not null default 'casual' check(format in ('casual','standard','expanded','advanced')),
  visibility text not null default 'private' check(visibility in ('private','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,game),
  check((game='pokemon' and format in ('casual','standard','expanded')) or (game='yugioh' and format in ('casual','advanced')))
);
create index decks_owner_game_idx on public.decks(user_id,game);
create index decks_public_idx on public.decks(game,updated_at desc) where visibility='public';
create table public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null,
  game text not null check(game in ('yugioh','pokemon')),
  card_id text not null check(char_length(card_id) between 1 and 80),
  card_name text not null check(char_length(card_name) between 1 and 200),
  card_data jsonb not null check(jsonb_typeof(card_data)='object' and octet_length(card_data::text)<=50000),
  quantity integer not null default 1 check(quantity between 1 and 999),
  section text not null default 'main' check(section in ('main','extra','side')),
  foreign key(deck_id,game) references public.decks(id,game) on delete cascade,
  unique(deck_id,card_id,section),
  check(game<>'pokemon' or section='main'),
  check((card_data->>'id'=card_id and card_data->>'game'=game) is true)
);
create index deck_cards_deck_game_idx on public.deck_cards(deck_id,game);
alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;
revoke all on public.decks,public.deck_cards from anon,authenticated;
grant select on public.decks,public.deck_cards to anon,authenticated;
grant insert,update,delete on public.decks,public.deck_cards to authenticated;
create policy decks_read on public.decks for select to anon,authenticated using (visibility='public' or user_id=(select auth.uid()));
create policy decks_insert on public.decks for insert to authenticated with check (user_id=(select auth.uid()));
create policy decks_update on public.decks for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy decks_delete on public.decks for delete to authenticated using(user_id=(select auth.uid()));
create policy deck_cards_read on public.deck_cards for select to anon,authenticated using(exists(select 1 from public.decks d where d.id=deck_id and (d.visibility='public' or d.user_id=(select auth.uid()))));
create policy deck_cards_insert on public.deck_cards for insert to authenticated with check(exists(select 1 from public.decks d where d.id=deck_id and d.user_id=(select auth.uid())));
create policy deck_cards_update on public.deck_cards for update to authenticated using(exists(select 1 from public.decks d where d.id=deck_id and d.user_id=(select auth.uid()))) with check(exists(select 1 from public.decks d where d.id=deck_id and d.user_id=(select auth.uid())));
create policy deck_cards_delete on public.deck_cards for delete to authenticated using(exists(select 1 from public.decks d where d.id=deck_id and d.user_id=(select auth.uid())));
