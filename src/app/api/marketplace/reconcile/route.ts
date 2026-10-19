import { isUuid, PaymentError } from '@/lib/payments/core';
import {
  applyVerifiedPayment,
  currentUser,
  failure,
  ownedOrder,
  provider,
  sameOrigin,
  sellerToken,
  type ProviderPayment,
} from '@/lib/payments/server';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { client, user } = await currentUser();
    const body = await request.json();
    if (!isUuid(body.orderId)) throw new PaymentError('Pedido inválido.');
    const admin = await client.rpc('is_admin');
    const order = await ownedOrder(body.orderId, user.id, admin.data === true);
    const account = await sellerToken(order.seller_id);
    const result = await provider<{ results: ProviderPayment[] }>(
      `/v1/payments/search?external_reference=${encodeURIComponent(order.id)}&sort=date_created&criteria=desc&limit=20`,
      account.token,
    );
    let status = order.status as string;
    for (const payment of [...result.results].reverse()) {
      if (payment.external_reference === order.id)
        status = await applyVerifiedPayment(payment, account);
    }
    return Response.json({ status });
  } catch (error) {
    return failure(error);
  }
}
