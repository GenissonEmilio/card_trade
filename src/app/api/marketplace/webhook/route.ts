import { isUuid, PaymentError, verifyWebhookSignature } from '@/lib/payments/core';
import { applyCheckoutTestPayment, diagnosticId } from '@/lib/payments/diagnostics';
import {
  applyVerifiedPayment,
  failure,
  paymentConfig,
  provider,
  sellerToken,
  type ProviderPayment,
} from '@/lib/payments/server';

export async function POST(request: Request) {
  try {
    const config = paymentConfig();
    const url = new URL(request.url);
    const id = url.searchParams.get('data.id') || '';
    if (
      !verifyWebhookSignature(
        id,
        request.headers.get('x-request-id') || '',
        request.headers.get('x-signature') || '',
        config.webhookSecret,
      )
    )
      throw new PaymentError('Assinatura inválida.', 401);
    const body = await request.json();
    if (body.type !== 'payment') return Response.json({ received: true });
    if (
      !/^[0-9]{1,30}$/.test(id) ||
      String(body.data?.id) !== id ||
      !/^[0-9]{1,30}$/.test(String(body.user_id))
    )
      throw new PaymentError('Notificação inválida.');
    const account = await sellerToken(undefined, String(body.user_id));
    const payment = await provider<ProviderPayment>(
      `/v1/payments/${encodeURIComponent(id)}`,
      account.token,
    );
    if (String(payment.id) !== id || typeof payment.external_reference !== 'string')
      throw new PaymentError('Pagamento sem referência válida.', 409);
    // Diagnostic observations never enter the commercial ledger or change stock/orders.
    if (diagnosticId(payment.external_reference)) {
      await applyCheckoutTestPayment(payment, account);
      return Response.json({ received: true, diagnostic: true });
    }
    if (!isUuid(payment.external_reference))
      throw new PaymentError('Pagamento sem referência válida.', 409);
    await applyVerifiedPayment(payment, account);
    return Response.json({ received: true });
  } catch (error) {
    return failure(error);
  }
}
