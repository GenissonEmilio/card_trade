-- Never infer the issuer of historical sessions: NULL remains read-only history.
alter table private.marketplace_checkout_tests add column client_id text
 check(client_id is null or (length(client_id) between 1 and 128 and client_id=btrim(client_id)));

-- Remove the old service API as well, so older deployments cannot bypass issuer binding.
drop function public.payment_test_claim(uuid,text);
drop function public.payment_test_save(uuid,uuid,uuid,text,text);
drop function public.payment_test_apply(uuid,text,text,text,integer,text,boolean,text,timestamptz);

create function public.payment_test_claim(p_actor_id uuid,p_provider_user_id text,p_client_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t private.marketplace_checkout_tests; fee integer;
begin
 perform 1 from public.profiles where id=p_actor_id for update;
 if not exists(select 1 from private.user_roles where user_id=p_actor_id and role='admin') then raise exception 'Acesso restrito à administração.'; end if;
 if p_client_id is null or length(p_client_id) not between 1 and 128 or p_client_id<>btrim(p_client_id) then raise exception 'Aplicativo de homologação inválido.'; end if;
 if not exists(select 1 from private.seller_payment_tokens where seller_id=p_actor_id and provider_user_id=p_provider_user_id) or not exists(select 1 from public.seller_payment_accounts where seller_id=p_actor_id and connected) then raise exception 'A conta de recebimento não corresponde ao administrador.'; end if;
 select commission_bps into fee from public.marketplace_settings where id=true;
 if fee is null or fee<0 or fee>=10000 or round(1000::numeric*fee/10000)>=1000 then raise exception 'Configure uma comissão menor que 100%%, inclusive após arredondamento em centavos, antes da homologação.'; end if;
 select * into t from private.marketplace_checkout_tests where actor_id=p_actor_id and provider_user_id=p_provider_user_id and client_id=p_client_id and commission_bps=fee and expires_at>now() and (payment_status is null or payment_status in('pending','in_process','authorized','in_mediation')) order by created_at desc limit 1 for update;
 if t.id is null then
  if (select count(*) from private.marketplace_checkout_tests where actor_id=p_actor_id and created_at>now()-interval '1 hour')>=20 then raise exception 'Limite de sessões de homologação atingido. Aguarde antes de criar outra.'; end if;
  insert into private.marketplace_checkout_tests(actor_id,provider_user_id,client_id,commission_bps,commission_cents) values(p_actor_id,p_provider_user_id,p_client_id,fee,round(1000::numeric*fee/10000)::integer) returning * into t;
  insert into private.admin_audit(actor_id,action,entity_id,after_data) values(p_actor_id,'marketplace_checkout_test',t.id::text,jsonb_build_object('amount_cents',t.amount_cents,'commission_bps',fee,'mode','sandbox','client_id',p_client_id));
 end if;
 if t.lease_until>now() then raise exception 'O checkout de homologação está sendo preparado. Aguarde alguns segundos.'; end if;
 update private.marketplace_checkout_tests set lease_id=gen_random_uuid(),lease_until=now()+interval '45 seconds' where id=t.id returning * into t;
 return to_jsonb(t);
end $$;

create function public.payment_test_save(p_id uuid,p_actor_id uuid,p_lease_id uuid,p_preference_id text,p_checkout_url text,p_client_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t private.marketplace_checkout_tests;
begin
 if not exists(select 1 from private.user_roles where user_id=p_actor_id and role='admin') then raise exception 'Acesso restrito à administração.'; end if;
 if p_client_id is null or length(p_client_id) not between 1 and 128 then raise exception 'Aplicativo de homologação inválido.'; end if;
 update private.marketplace_checkout_tests set preference_id=p_preference_id,checkout_url=p_checkout_url,lease_id=null,lease_until=null where id=p_id and actor_id=p_actor_id and client_id=p_client_id and lease_id=p_lease_id and lease_until>now() and expires_at>now() and (preference_id is null or preference_id=p_preference_id) returning * into t;
 if t.id is null then raise exception 'A sessão de homologação mudou, expirou ou pertence a outro aplicativo. Crie um novo teste.'; end if;
 return to_jsonb(t);
end $$;

create function public.payment_test_apply(p_id uuid,p_provider_user_id text,p_payment_id text,p_status text,p_amount_cents integer,p_currency text,p_live_mode boolean,p_payment_method text,p_updated_at timestamptz,p_client_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t private.marketplace_checkout_tests;
begin
 select * into t from private.marketplace_checkout_tests where id=p_id for update;
 if t.id is null or t.preference_id is null or p_client_id is null or length(p_client_id) not between 1 and 128 or t.client_id is distinct from p_client_id or t.provider_user_id is distinct from p_provider_user_id or p_amount_cents is distinct from t.amount_cents or p_currency is distinct from 'BRL' or p_live_mode is distinct from false or p_payment_id is null or p_payment_id !~ '^[0-9]{1,30}$' or p_status is null or p_status not in('pending','approved','authorized','in_process','in_mediation','rejected','cancelled','refunded','charged_back') or p_updated_at is null or p_updated_at<t.created_at-interval '5 minutes' or p_updated_at>now()+interval '5 minutes' or p_payment_method is null or length(p_payment_method) not between 1 and 80 then raise exception 'O pagamento ou o aplicativo não corresponde à sessão de homologação.'; end if;
 if t.payment_updated_at>p_updated_at or (t.payment_updated_at=p_updated_at and t.payment_id=p_payment_id and t.payment_status=p_status) then return to_jsonb(t); end if;
 update private.marketplace_checkout_tests set payment_id=p_payment_id,payment_status=p_status,payment_method=p_payment_method,payment_updated_at=p_updated_at,verified_at=now() where id=p_id returning * into t;
 return to_jsonb(t);
end $$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('payment_test_claim','payment_test_save','payment_test_apply') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant execute on function %s to service_role',f.signature); end if;
 end loop;
end $$;
