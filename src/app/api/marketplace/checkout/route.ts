import { checkoutUrl, isPublicHttpsOrigin, isUuid, PaymentError } from '@/lib/payments/core';
import {
  currentUser,
  failure,
  paymentConfig,
  provider,
  rpc,
  sameOrigin,
  sellerToken,
} from '@/lib/payments/server';
import type { MarketplaceOrder } from '@/types/marketplace';

export async function POST(request: Request) {
  let claimedOrder: string | undefined;
  try {
    sameOrigin(request);
    const config = paymentConfig();
    const { user } = await currentUser();
    const body = await request.json();
    if (!isUuid(body.orderId)) throw new PaymentError('Pedido inválido.');
    const claim = await rpc<{ order: MarketplaceOrder; url?: string }>('payment_claim_checkout', {
      p_order_id: body.orderId,
      p_buyer_id: user.id,
    });
    // Cached URLs never bypass seller mode or provider-side collector/reference validation.
    claimedOrder = body.orderId;
    const order = claim.order;
    const account = await sellerToken(order.seller_id);
    type Preference = {
      id: string;
      init_point: string;
      external_reference: string;
      collector_id: string | number;
    };
    // Recover an already-created preference after a network interruption, before creating another.
    const found = await provider<{ elements: { id: string }[] }>(
      `/checkout/preferences/search?external_reference=${encodeURIComponent(order.id)}&limit=1`,
      account.token,
    );
    let recovered: Preference | undefined;
    if (found.elements[0]) {
      recovered = await provider<Preference>(
        `/checkout/preferences/${encodeURIComponent(found.elements[0].id)}`,
        account.token,
      );
    }
    if (claim.url && !recovered)
      throw new PaymentError(
        'Não foi possível recuperar o checkout deste pedido. Consulte o pagamento antes de criar outro pedido.',
        409,
      );
    const preference =
      recovered ||
      (await provider<Preference>('/checkout/preferences', account.token, {
        method: 'POST',
        headers: { 'X-Idempotency-Key': order.id },
        body: JSON.stringify({
          items: order.items.map((item) => ({
            id: item.listing_id,
            title: item.listing_snapshot.card_name,
            description: item.listing_snapshot.description.slice(0, 250),
            currency_id: 'BRL',
            quantity: item.quantity,
            unit_price: item.unit_price_cents / 100,
          })),
          marketplace_fee: order.commission_cents / 100,
          external_reference: order.id,
          // Test buyers authenticate in Mercado Pago; do not prefill a real Duelink email.
          ...(!config.sandbox && user.email ? { payer: { email: user.email } } : {}),
          back_urls: {
            success: `${config.origin}/pedidos/${order.id}?retorno=sucesso`,
            pending: `${config.origin}/pedidos/${order.id}?retorno=pendente`,
            failure: `${config.origin}/pedidos/${order.id}?retorno=falha`,
          },
          ...(isPublicHttpsOrigin(config.origin) ? { auto_return: 'approved' } : {}),
          notification_url: `${config.origin}/api/marketplace/webhook?source_news=webhooks`,
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: order.expires_at,
          payment_methods: {
            excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
            installments: 1,
          },
          statement_descriptor: 'DUELINK',
          metadata: { duelink_order_id: order.id },
        }),
      }));
    if (
      preference.external_reference !== order.id ||
      String(preference.collector_id) !== account.providerUserId
    )
      throw new PaymentError(
        'A referência ou a conta de recebimento do checkout não corresponde ao pedido.',
        409,
      );
    // private.marketplace_checkouts.checkout_url stores init_point in both modes.
    const url = checkoutUrl(preference.init_point);
    await rpc('payment_save_checkout', {
      p_order_id: order.id,
      p_preference_id: preference.id,
      p_checkout_url: url,
    });
    return Response.json({ url });
  } catch (error) {
    if (claimedOrder) {
      try {
        await rpc('payment_release_checkout', { p_order_id: claimedOrder });
      } catch {
        /* lease expires safely */
      }
    }
    return failure(error);
  }
}
