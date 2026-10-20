-- Preserve observed provider mode; test identity is independently restricted by the backend.
alter table private.marketplace_checkout_tests
 add column provider_live_mode boolean,
 add column payer_id text check(payer_id ~ '^[0-9]{1,30}$');

drop function public.payment_test_apply(uuid,text,text,text,integer,text,boolean,text,timestamptz,text);

create function public.payment_test_apply(p_id uuid,p_provider_user_id text,p_payment_id text,p_status text,p_amount_cents integer,p_currency text,p_live_mode boolean,p_payment_method text,p_updated_at timestamptz,p_client_id text,p_expected_payer_id text,p_payer_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t private.marketplace_checkout_tests;
begin
 select * into t from private.marketplace_checkout_tests where id=p_id for update;
 if t.id is null or t.preference_id is null or p_client_id is null or length(p_client_id) not between 1 and 128 or t.client_id is distinct from p_client_id or t.provider_user_id is distinct from p_provider_user_id or p_amount_cents is distinct from t.amount_cents or p_currency is distinct from 'BRL' or p_live_mode is null or p_payment_id is null or p_payment_id !~ '^[0-9]{1,30}$' or p_status is null or p_status not in('pending','approved','authorized','in_process','in_mediation','rejected','cancelled','refunded','charged_back') or p_updated_at is null or p_updated_at<t.created_at-interval '5 minutes' or p_updated_at>now()+interval '5 minutes' or p_payment_method is null or length(p_payment_method) not between 1 and 80 or p_expected_payer_id is null or p_expected_payer_id !~ '^[0-9]{1,30}$' or p_payer_id is distinct from p_expected_payer_id or p_payer_id=t.provider_user_id then raise exception 'O pagamento, o comprador fictício ou o aplicativo não corresponde à sessão de homologação.'; end if;
 if t.payment_updated_at>p_updated_at or (t.payment_updated_at=p_updated_at and t.payment_id=p_payment_id and t.payment_status=p_status and t.provider_live_mode is not distinct from p_live_mode and t.payer_id=p_payer_id) then return to_jsonb(t); end if;
 update private.marketplace_checkout_tests set payment_id=p_payment_id,payment_status=p_status,payment_method=p_payment_method,payment_updated_at=p_updated_at,provider_live_mode=p_live_mode,payer_id=p_payer_id,verified_at=now() where id=p_id returning * into t;
 return to_jsonb(t);
end $$;

revoke all on function public.payment_test_apply(uuid,text,text,text,integer,text,boolean,text,timestamptz,text,text,text) from public,anon,authenticated;
do $$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.payment_test_apply(uuid,text,text,text,integer,text,boolean,text,timestamptz,text,text,text) to service_role; end if;
end $$;
