-- Cover foreign-key lookups and evaluate session-wide authorization once per policy query.
create index marketplace_payment_events_order_idx on private.marketplace_payment_events(order_id);
create index marketplace_order_events_actor_idx on public.marketplace_order_events(actor_id);
create index marketplace_order_items_listing_idx on public.marketplace_order_items(listing_id);
alter policy order_item_read on public.marketplace_order_items using(exists(select 1 from public.marketplace_orders o where o.id=order_id and ((select auth.uid()) in(o.buyer_id,o.seller_id) or (select public.is_admin()))));
alter policy order_event_read on public.marketplace_order_events using(exists(select 1 from public.marketplace_orders o where o.id=order_id and ((select auth.uid()) in(o.buyer_id,o.seller_id) or (select public.is_admin()))));
alter policy order_message_read on public.marketplace_order_messages using(exists(select 1 from public.marketplace_orders o where o.id=order_id and ((select auth.uid()) in(o.buyer_id,o.seller_id) or (select public.is_admin()))));
alter policy marketplace_payments_read on public.marketplace_payments using(exists(select 1 from public.marketplace_orders o where o.id=order_id and ((select auth.uid()) in(o.buyer_id,o.seller_id) or (select public.is_admin()))));
