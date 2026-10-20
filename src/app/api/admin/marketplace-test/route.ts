import { isUuid, PaymentError } from '@/lib/payments/core';
import { createOrRecoverPreference } from '@/lib/payments/checkout';
import {
  assertDiagnosticMode,
  CHECKOUT_TEST_AMOUNT,
  diagnosticFee,
  diagnosticSpec,
  getCheckoutTest,
  refreshCheckoutTest,
  testSummary,
  type StoredCheckoutTest,
} from '@/lib/payments/diagnostics';
import {
  currentUser,
  failure,
  paymentConfig,
  rpc,
  sameOrigin,
  sellerToken,
} from '@/lib/payments/server';

const json = (body: unknown) =>
  Response.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
async function authorize() {
  const { client, user } = await currentUser();
  const role = await client.rpc('get_my_role');
  if (role.error || role.data !== 'admin')
    throw new PaymentError('Acesso restrito à administração.', 403);
  const config = paymentConfig();
  assertDiagnosticMode(config.sandbox);
  return { client, user, config };
}

export async function GET() {
  try {
    const { client, user } = await authorize();
    const result = await client
      .from('marketplace_settings')
      .select('commission_bps')
      .eq('id', true)
      .single();
    if (result.error)
      throw new PaymentError('Não foi possível carregar a comissão de homologação.', 503);
    const fee = diagnosticFee(result.data?.commission_bps);
    const tests = await rpc<StoredCheckoutTest[]>('payment_test_list', { p_actor_id: user.id });
    return json({
      sandbox: true,
      amount_cents: CHECKOUT_TEST_AMOUNT,
      ...fee,
      tests: tests.map(testSummary),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  let claimed: StoredCheckoutTest | undefined;
  try {
    sameOrigin(request);
    const { user, config } = await authorize();
    if (Number(request.headers.get('content-length') || 0) > 2000)
      throw new PaymentError('Solicitação muito grande.', 413);
    let body: { action?: unknown; testId?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new PaymentError('Solicitação inválida.');
    }
    if (!body || typeof body !== 'object' || !['create', 'refresh'].includes(String(body.action)))
      throw new PaymentError('Ação de homologação inválida.');
    if (body.action === 'refresh' && !isUuid(body.testId))
      throw new PaymentError('Sessão de homologação inválida.');
    // This remotely verifies identity, Brazil and test_user before any preference/cache access.
    const account = await sellerToken(user.id);
    if (body.action === 'refresh') {
      const test = await getCheckoutTest(body.testId as string, user.id);
      return json({ test: await refreshCheckoutTest(test, account) });
    }
    claimed = await rpc<StoredCheckoutTest>('payment_test_claim', {
      p_actor_id: user.id,
      p_provider_user_id: account.providerUserId,
    });
    if (claimed.actor_id !== user.id || claimed.provider_user_id !== account.providerUserId)
      throw new PaymentError('A sessão de homologação não corresponde ao administrador.', 409);
    const { preference, url } = await createOrRecoverPreference(
      diagnosticSpec(claimed),
      account,
      config,
      {
        preferenceId: claimed.preference_id,
        url: claimed.checkout_url,
      },
    );
    const saved = await rpc<StoredCheckoutTest>('payment_test_save', {
      p_id: claimed.id,
      p_actor_id: user.id,
      p_lease_id: claimed.lease_id,
      p_preference_id: preference.id,
      p_checkout_url: url,
    });
    return json({ url, test: testSummary(saved) });
  } catch (error) {
    if (claimed?.lease_id) {
      try {
        await rpc('payment_test_release', { p_id: claimed.id, p_lease_id: claimed.lease_id });
      } catch {
        /* A failed recovery remains bounded by the database lease. */
      }
    }
    return failure(error);
  }
}
