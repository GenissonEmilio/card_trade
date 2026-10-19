import { isUuid, PaymentError } from '@/lib/payments/core';
import {
  applyVerifiedPayment,
  currentUser,
  failure,
  ownedOrder,
  provider,
  rpc,
  sameOrigin,
  sellerToken,
  type ProviderPayment,
} from '@/lib/payments/server';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { client, user } = await currentUser();
    const body = await request.json();
    if (
      !isUuid(body.orderId) ||
      !Number.isSafeInteger(body.amountCents) ||
      body.amountCents < 1 ||
      typeof body.reason !== 'string' ||
      body.reason.trim().length < 10
    )
      throw new PaymentError('Informe o pedido, o valor e um motivo de pelo menos 10 caracteres.');
    const admin = await client.rpc('is_admin');
    const order = await ownedOrder(body.orderId, user.id, admin.data === true);
    if (user.id !== order.seller_id && admin.data !== true)
      throw new PaymentError('Somente o vendedor ou administrador pode executar o reembolso.', 403);
    if (
      !order.payment_id ||
      !['paid', 'ready', 'completed', 'disputed', 'payment_review'].includes(order.status)
    )
      throw new PaymentError('Este pedido não possui pagamento elegível para reembolso.');
    const paymentId = body.paymentId === undefined ? order.payment_id : body.paymentId;
    if (typeof paymentId !== 'string' || !/^[0-9]{1,30}$/.test(paymentId))
      throw new PaymentError('Pagamento inválido.');
    const account = await sellerToken(order.seller_id);
    const latest = await provider<ProviderPayment>(
      `/v1/payments/${encodeURIComponent(paymentId)}`,
      account.token,
    );
    await applyVerifiedPayment(latest, account);
    const remaining = Math.round(
      (latest.transaction_amount - (latest.transaction_amount_refunded || 0)) * 100,
    );
    if (body.amountCents > remaining)
      throw new PaymentError('O valor excede o saldo reembolsável. Atualize o pedido.');
    // A mesma intenção tem a mesma chave, inclusive após falhas de rede.
    const idempotency = `${order.id}-${paymentId}-${Math.round((latest.transaction_amount_refunded || 0) * 100)}-${body.amountCents}`;
    await rpc('payment_log_refund', {
      p_order_id: order.id,
      p_actor_id: user.id,
      p_amount_cents: body.amountCents,
      p_reason: body.reason.trim(),
    });
    await provider(`/v1/payments/${encodeURIComponent(paymentId)}/refunds`, account.token, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotency },
      body: JSON.stringify({ amount: body.amountCents / 100 }),
    });
    const updated = await provider<ProviderPayment>(
      `/v1/payments/${encodeURIComponent(paymentId)}`,
      account.token,
    );
    const status = await applyVerifiedPayment(updated, account);
    return Response.json({ status });
  } catch (error) {
    return failure(error);
  }
}
