import { commissionCents, isUuid, PaymentError } from './core';
import { type CheckoutAccount, type CheckoutSpec, readPreference } from './checkout';
import {
  paymentConfig,
  provider,
  rpc,
  validatePaymentSnapshot,
  type ProviderPayment,
} from './server';
import type { MarketplaceCheckoutTest } from '@/types/marketplace';

export const CHECKOUT_TEST_AMOUNT = 1000;
const PREFIX = 'duelink-sandbox:';
export type StoredCheckoutTest = MarketplaceCheckoutTest & {
  actor_id: string;
  provider_user_id: string;
  checkout_url: string | null;
  lease_id: string | null;
  lease_until: string | null;
};
export function assertDiagnosticMode(sandbox: boolean) {
  if (!sandbox)
    throw new PaymentError('A homologação está disponível somente no modo sandbox.', 409);
}
export function diagnosticFee(bps: unknown) {
  if (typeof bps !== 'number' || !Number.isInteger(bps) || bps < 0 || bps >= 10000)
    throw new PaymentError(
      'Configure uma comissão válida menor que 100% antes da homologação.',
      409,
    );
  const commission = commissionCents(CHECKOUT_TEST_AMOUNT, bps);
  if (commission >= CHECKOUT_TEST_AMOUNT)
    throw new PaymentError('A comissão arredondada precisa ser menor que o valor do teste.', 409);
  return { commission_bps: bps, commission_cents: commission };
}
export function diagnosticId(reference: string): string | null {
  if (!reference.startsWith(PREFIX)) return null;
  const id = reference.slice(PREFIX.length);
  if (!isUuid(id)) throw new PaymentError('Referência de homologação inválida.', 409);
  return id;
}
export function testSummary(test: StoredCheckoutTest): MarketplaceCheckoutTest {
  return {
    id: test.id,
    created_at: test.created_at,
    expires_at: test.expires_at,
    preference_id: test.preference_id,
    payment_id: test.payment_id,
    payment_status: test.payment_status,
    payment_method: test.payment_method,
    verified_at: test.verified_at,
    amount_cents: test.amount_cents,
    commission_cents: test.commission_cents,
    commission_bps: test.commission_bps,
  };
}
export function diagnosticSpec(test: StoredCheckoutTest): CheckoutSpec {
  const fee = diagnosticFee(test.commission_bps);
  if (test.amount_cents !== CHECKOUT_TEST_AMOUNT || test.commission_cents !== fee.commission_cents)
    throw new PaymentError('Os valores da sessão de homologação são inválidos.', 409);
  return {
    reference: `${PREFIX}${test.id}`,
    idempotencyKey: test.id,
    items: [
      {
        id: test.id,
        title: 'Duelink — homologação de pagamento fictício',
        description:
          'Teste técnico do Checkout Pro. Não representa compra de carta, pedido ou entrega.',
        quantity: 1,
        unit_price_cents: CHECKOUT_TEST_AMOUNT,
      },
    ],
    commission_cents: test.commission_cents,
    expires_at: test.expires_at,
    returnPath: `/admin?homologacao=${test.id}`,
    metadata: { duelink_checkout_test_id: test.id, duelink_mode: 'sandbox' },
  };
}

export async function getCheckoutTest(id: string, actorId?: string) {
  const test = await rpc<StoredCheckoutTest | null>('payment_test_get', {
    p_id: id,
    p_actor_id: actorId || null,
  });
  if (!test) throw new PaymentError('Sessão de homologação não encontrada.', 404);
  return test;
}

/** Called only after a signed webhook or an authorized remote refresh, never a browser return. */
export async function applyCheckoutTestPayment(
  payment: ProviderPayment,
  account: CheckoutAccount,
  actorId?: string,
) {
  assertDiagnosticMode(paymentConfig().sandbox);
  const id = diagnosticId(payment.external_reference);
  if (!id) throw new PaymentError('Referência de homologação inválida.', 409);
  const test = await getCheckoutTest(id, actorId);
  if (test.actor_id !== account.sellerId || test.provider_user_id !== account.providerUserId)
    throw new PaymentError('A conta de recebimento não corresponde à homologação.', 409);
  diagnosticSpec(test);
  validatePaymentSnapshot(
    payment,
    account,
    {
      reference: `${PREFIX}${test.id}`,
      amount_cents: test.amount_cents,
    },
    true,
  );
  if (
    typeof payment.payment_method_id !== 'string' ||
    !/^[a-z0-9_]{1,80}$/i.test(payment.payment_method_id)
  )
    throw new PaymentError('O meio de pagamento de teste não pôde ser verificado.', 409);
  const saved = await rpc<StoredCheckoutTest>('payment_test_apply', {
    p_id: test.id,
    p_provider_user_id: account.providerUserId,
    p_payment_id: String(payment.id),
    p_status: payment.status,
    p_amount_cents: test.amount_cents,
    p_currency: payment.currency_id,
    p_live_mode: payment.live_mode,
    p_payment_method: payment.payment_method_id,
    p_updated_at: payment.date_last_updated,
  });
  return testSummary(saved);
}

export async function refreshCheckoutTest(test: StoredCheckoutTest, account: CheckoutAccount) {
  assertDiagnosticMode(paymentConfig().sandbox);
  if (test.actor_id !== account.sellerId || test.provider_user_id !== account.providerUserId)
    throw new PaymentError('A conta de recebimento não corresponde à homologação.', 409);
  if (!test.preference_id)
    throw new PaymentError('Inicie ou recupere o checkout antes de consultar este teste.', 409);
  await readPreference(test.preference_id, diagnosticSpec(test), account);
  const found = await provider<{ results: { id: string | number }[] }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(`${PREFIX}${test.id}`)}&sort=date_last_updated&criteria=desc&limit=1`,
    account.token,
  );
  if (!Array.isArray(found.results))
    throw new PaymentError('Não foi possível conferir os pagamentos de homologação.', 502);
  if (!found.results.length) return testSummary(test);
  const id = String(found.results[0].id);
  if (!/^[0-9]{1,30}$/.test(id))
    throw new PaymentError('O provedor retornou um pagamento de teste inválido.', 502);
  const payment = await provider<ProviderPayment>(`/v1/payments/${id}`, account.token);
  if (String(payment.id) !== id)
    throw new PaymentError('O provedor retornou um pagamento diferente do consultado.', 409);
  return applyCheckoutTestPayment(payment, account, test.actor_id);
}
