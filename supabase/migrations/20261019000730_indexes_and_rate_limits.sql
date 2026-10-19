create index messages_sender_idx on public.messages(sender_id,created_at desc);
create index reviews_reviewed_idx on public.reviews(reviewed_id,created_at desc);
create index reviews_reviewer_idx on public.reviews(reviewer_id);
create index trades_offered_idx on public.trades(offered_item_id) where offered_item_id is not null;
create index trades_requested_idx on public.trades(requested_item_id) where requested_item_id is not null;
create index trades_recipient_idx on public.trades(recipient_id,updated_at desc);

-- Limites no banco, compartilhados por todas as instâncias do site.
create function public.limit_message_frequency() returns trigger language plpgsql set search_path='' as $$
begin
  if (select count(*) from public.messages where sender_id=new.sender_id and created_at>now()-interval '10 seconds') >= 10 then
    raise exception 'Você está enviando mensagens muito rápido. Aguarde alguns segundos.';
  end if;
  return new;
end $$;
revoke all on function public.limit_message_frequency() from public,anon,authenticated;
create trigger message_frequency before insert on public.messages for each row execute function public.limit_message_frequency();

create function public.limit_trade_frequency() returns trigger language plpgsql set search_path='' as $$
begin
  if (select count(*) from public.trades where proposer_id=new.proposer_id and created_at>now()-interval '1 hour') >= 20 then
    raise exception 'Limite de propostas atingido. Aguarde antes de enviar novas propostas.';
  end if;
  return new;
end $$;
revoke all on function public.limit_trade_frequency() from public,anon,authenticated;
create trigger trade_frequency before insert on public.trades for each row execute function public.limit_trade_frequency();
