import { isUuid, PaymentError } from '@/lib/payments/core';
import { createOrRecoverPreference } from '@/lib/payments/checkout';
import {
  currentUser,
  failure,
  paymentConfig,
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
    const { preference, url } = await createOrRecoverPreference(
      {
        reference: order.id,
        idempotencyKey: order.id,
        items: order.items.map((item) => ({
          id: item.listing_id,
          title: item.listing_snapshot.card_name,
          description: item.listing_snapshot.description,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
        })),
        commission_cents: order.commission_cents,
        expires_at: order.expires_at,
        returnPath: `/pedidos/${order.id}`,
        metadata: { duelink_order_id: order.id },
        email: user.email,
      },
      account,
      config,
      { url: claim.url },
    );
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
