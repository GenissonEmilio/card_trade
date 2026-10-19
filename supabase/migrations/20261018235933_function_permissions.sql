-- Supabase atribui EXECUTE diretamente a anon/authenticated nas permissões padrão.
revoke all on function public.handle_new_user() from public,anon,authenticated;
revoke all on function public.guard_collection_item() from public,anon,authenticated;
revoke all on function public.get_matches() from public,anon,authenticated;
revoke all on function public.create_trade(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.transition_trade(uuid,text) from public,anon,authenticated;
grant execute on function public.get_matches() to authenticated;
grant execute on function public.create_trade(uuid,uuid,text) to authenticated;
grant execute on function public.transition_trade(uuid,text) to authenticated;
