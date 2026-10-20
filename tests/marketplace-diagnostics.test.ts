import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentError } from '@/lib/payments/core';

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  currentUser: vi.fn(),
  role: vi.fn(),
  settings: vi.fn(),
  provider: vi.fn(),
  rpc: vi.fn(),
  sellerToken: vi.fn(),
  commercialApply: vi.fn(),
}));
vi.mock('@/lib/payments/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/payments/server')>('@/lib/payments/server');
  return {
    ...actual,
    paymentConfig: mocks.config,
    currentUser: mocks.currentUser,
    provider: mocks.provider,
    rpc: mocks.rpc,
    sellerToken: mocks.sellerToken,
    applyVerifiedPayment: mocks.commercialApply,
  };
});
import { GET, POST } from '@/app/api/admin/marketplace-test/route';
import { POST as webhook } from '@/app/api/marketplace/webhook/route';
import { validatePaymentSnapshot } from '@/lib/payments/server';

const origin = 'https://duelink.mage.dev.br';
const actor = '00000000-0000-4000-8000-000000000001';
const id = '00000000-0000-4000-8000-000000000002';
const reference = `duelink-sandbox:${id}`;
const url = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=test';
const test = {
  id,
  actor_id: actor,
  provider_user_id: '12345',
  client_id: 'unit-sandbox-client',
  amount_cents: 1000,
  commission_bps: 300,
  commission_cents: 30,
  created_at: new Date().toISOString(),
  expires_at: '2099-01-01T00:00:00Z',
  lease_id: '00000000-0000-4000-8000-000000000003',
  lease_until: '2099-01-01T00:00:00Z',
  checkout_url: null,
  preference_id: null,
  payment_id: null,
  payment_status: null,
  payment_method: null,
  verified_at: null,
  provider_live_mode: null,
  payer_id: null,
  identity_verified: false,
};
const preference = {
  id: 'test-preference',
  init_point: url,
  external_reference: reference,
  collector_id: 12345,
  client_id: 'unit-sandbox-client',
  marketplace_fee: 0.3,
  items: [{ currency_id: 'BRL', quantity: 1, unit_price: 10 }],
};
const payment = {
  id: 98765,
  external_reference: reference,
  collector_id: 12345,
  currency_id: 'BRL',
  transaction_amount: 10,
  status: 'approved',
  live_mode: false,
  date_last_updated: new Date().toISOString(),
  payment_method_id: 'visa',
  payer: { id: '55555' },
};
function request(body: unknown, requestOrigin = origin) {
  return new Request(`${origin}/api/admin/marketplace-test`, {
    method: 'POST',
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function notification() {
  const ts = '1704908010';
  const signature = createHmac('sha256', 'test-secret')
    .update(`id:98765;request-id:request;ts:${ts};`)
    .digest('hex');
  return new Request(`${origin}/api/marketplace/webhook?data.id=98765`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': 'request',
      'x-signature': `ts=${ts},v1=${signature}`,
    },
    body: JSON.stringify({ type: 'payment', data: { id: '98765' }, user_id: 12345 }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', origin);
  vi.stubEnv('MERCADOPAGO_SANDBOX_BUYER_ID', '55555');
  mocks.config.mockReturnValue({
    clientId: 'unit-sandbox-client',
    sandbox: true,
    origin,
    webhookSecret: 'test-secret',
  });
  mocks.role.mockResolvedValue({ data: 'admin', error: null });
  mocks.settings.mockResolvedValue({ data: { commission_bps: 300, enabled: false }, error: null });
  mocks.currentUser.mockResolvedValue({
    user: { id: actor, email: 'real-owner@example.test' },
    client: {
      rpc: mocks.role,
      from: () => ({ select: () => ({ eq: () => ({ single: mocks.settings }) }) }),
    },
  });
  mocks.sellerToken.mockResolvedValue({
    token: 'APP_USR-test',
    providerUserId: '12345',
    sellerId: actor,
  });
  mocks.rpc.mockImplementation((name: string, args: Record<string, unknown>) => {
    if (name === 'payment_test_claim') return Promise.resolve({ ...test });
    if (name === 'payment_test_get')
      return Promise.resolve({ ...test, preference_id: preference.id });
    if (name === 'payment_test_list') return Promise.resolve([{ ...test }]);
    if (name === 'payment_test_save')
      return Promise.resolve({
        ...test,
        preference_id: args.p_preference_id,
        checkout_url: args.p_checkout_url,
      });
    if (name === 'payment_test_apply')
      return Promise.resolve({
        ...test,
        preference_id: preference.id,
        payment_id: args.p_payment_id,
        payment_status: args.p_status,
        payment_method: args.p_payment_method,
        provider_live_mode: args.p_live_mode,
        payer_id: args.p_payer_id,
        verified_at: new Date().toISOString(),
      });
    return Promise.resolve(null);
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('diagnóstico administrativo com vendas fechadas', () => {
  it.each([undefined, '', 'invalid'])(
    'exige configuração explícita de comprador fictício %s',
    async (value) => {
      vi.stubEnv('MERCADOPAGO_SANDBOX_BUYER_ID', value);
      expect((await GET()).status).toBe(503);
      expect((await POST(request({ action: 'create' }))).status).toBe(503);
      expect(mocks.sellerToken).not.toHaveBeenCalled();
      expect(mocks.provider).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it('nega anônimo antes de consultar configuração, vendedor ou preferências', async () => {
    mocks.currentUser.mockRejectedValue(new PaymentError('Entre na sua conta.', 401));
    expect((await POST(request({ action: 'create' }))).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.config).not.toHaveBeenCalled();
  });
  it('nega usuário comum mesmo autenticado', async () => {
    mocks.role.mockResolvedValue({ data: 'user', error: null });
    expect((await POST(request({ action: 'create' }))).status).toBe(403);
    expect((await GET()).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.sellerToken).not.toHaveBeenCalled();
  });
  it('nega produção e origem diferente sem chamar o MP', async () => {
    mocks.config.mockReturnValue({ sandbox: false, origin });
    expect((await POST(request({ action: 'create' }))).status).toBe(409);
    expect((await GET()).status).toBe(409);
    expect((await POST(request({ action: 'create' }, 'https://other.test'))).status).toBe(403);
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejeita conta real verificada pelo guard compartilhado antes de criar sessão', async () => {
    mocks.sellerToken.mockRejectedValue(
      new PaymentError('A homologação aceita somente contas Mercado Pago de teste.', 409),
    );
    expect((await POST(request({ action: 'create' }))).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it('retorna apenas o resumo do próprio admin, sem credenciais, lease ou URL privada', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      sandbox: true,
      amount_cents: 1000,
      commission_bps: 300,
      commission_cents: 30,
    });
    expect(body.tests[0]).not.toHaveProperty('actor_id');
    expect(body.tests[0]).not.toHaveProperty('provider_user_id');
    expect(body.tests[0]).not.toHaveProperty('client_id');
    expect(body.tests[0]).not.toHaveProperty('payer_id');
    expect(body.tests[0]).not.toHaveProperty('checkout_url');
    expect(body.tests[0]).not.toHaveProperty('lease_id');
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('payment_test_list', { p_actor_id: actor });
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it.each([null, 10000, 9999, -1, 3.5])(
    'bloqueia taxa inválida %s no resumo',
    async (commission_bps) => {
      mocks.settings.mockResolvedValue({ data: { commission_bps }, error: null });
      expect((await GET()).status).toBe(409);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it('cria preferência de R$10 com taxa real e referência própria, sem confiar no payload do cliente', async () => {
    mocks.provider.mockResolvedValueOnce({ elements: [] }).mockResolvedValueOnce(preference);
    const response = await POST(
      request({ action: 'create', amount_cents: 1, commission_bps: 0, seller_id: 'other' }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ url, test: { id, commission_cents: 30, amount_cents: 1000 } });
    const sent = JSON.parse(mocks.provider.mock.calls[1][2].body);
    expect(sent).toMatchObject({
      marketplace_fee: 0.3,
      external_reference: reference,
      items: [{ quantity: 1, unit_price: 10, currency_id: 'BRL' }],
    });
    expect(sent.items[0].title).toContain('homologação');
    expect(sent).not.toHaveProperty('payer');
    expect(sent.back_urls.success).toBe(`${origin}/admin?homologacao=${id}&retorno=sucesso`);
    expect(mocks.rpc).toHaveBeenCalledWith('payment_test_claim', {
      p_actor_id: actor,
      p_provider_user_id: '12345',
      p_client_id: 'unit-sandbox-client',
    });
    expect(mocks.commercialApply).not.toHaveBeenCalled();
  });
  it('recupera uma preferência já criada após interrupção em vez de criar outra', async () => {
    mocks.provider
      .mockResolvedValueOnce({ elements: [{ id: preference.id }] })
      .mockResolvedValueOnce(preference);
    expect((await POST(request({ action: 'create' }))).status).toBe(200);
    expect(mocks.provider.mock.calls.some(([, , init]) => init?.method === 'POST')).toBe(false);
  });
  it('revalida preferência persistida sem atalho pela URL salva', async () => {
    mocks.rpc.mockResolvedValueOnce({ ...test, preference_id: preference.id, checkout_url: url });
    mocks.provider.mockResolvedValueOnce({ ...preference, collector_id: 999 });
    expect((await POST(request({ action: 'create' }))).status).toBe(409);
    expect(mocks.sellerToken).toHaveBeenCalledWith(actor);
    expect(mocks.provider).toHaveBeenCalledExactlyOnceWith(
      `/checkout/preferences/${preference.id}`,
      'APP_USR-test',
    );
    expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_save', expect.anything());
    expect(mocks.rpc).toHaveBeenCalledWith('payment_test_release', {
      p_id: id,
      p_lease_id: test.lease_id,
    });
  });
  it.each([
    { marketplace_fee: 0 },
    { items: [{ currency_id: 'USD', quantity: 1, unit_price: 10 }] },
    { items: [{ currency_id: 'BRL', quantity: 1, unit_price: 11 }] },
  ])('rejeita preferência com valor/moeda/taxa divergente %j', async (patch) => {
    mocks.provider
      .mockResolvedValueOnce({ elements: [] })
      .mockResolvedValueOnce({ ...preference, ...patch });
    expect((await POST(request({ action: 'create' }))).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_save', expect.anything());
  });
  it('consulta Pix pendente confirmado remotamente sem promover pedido comercial', async () => {
    mocks.provider
      .mockResolvedValueOnce({ results: [{ id: 98765 }] })
      .mockResolvedValueOnce({ ...payment, status: 'pending', payment_method_id: 'pix' })
      .mockResolvedValueOnce(preference);
    const response = await POST(request({ action: 'refresh', testId: id, retorno: 'sucesso' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      test: { payment_status: 'pending', payment_method: 'pix' },
    });
    expect(mocks.rpc).toHaveBeenCalledWith('payment_test_get', { p_id: id, p_actor_id: actor });
    expect(mocks.commercialApply).not.toHaveBeenCalled();
    expect(mocks.rpc.mock.calls.some(([name]) => name === 'payment_apply')).toBe(false);
  });
  it('preserva o modo observado true no summary sem expor o identificador do comprador', async () => {
    mocks.provider
      .mockResolvedValueOnce({ results: [{ id: 98765 }] })
      .mockResolvedValueOnce({ ...payment, live_mode: true })
      .mockResolvedValueOnce(preference);
    const response = await POST(request({ action: 'refresh', testId: id }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.test).toMatchObject({
      provider_live_mode: true,
      identity_verified: true,
      payment_status: 'approved',
    });
    expect(body.test).not.toHaveProperty('payer_id');
  });
  it('não prepara checkout quando o comprador fictício configurado é o vendedor', async () => {
    vi.stubEnv('MERCADOPAGO_SANDBOX_BUYER_ID', '12345');
    expect((await POST(request({ action: 'create' }))).status).toBe(409);
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([null, 'old-app'])(
    'não usa uma sessão legada ou emitida por outro app retornada pelo claim: %s',
    async (client_id) => {
      mocks.rpc.mockResolvedValueOnce({
        ...test,
        client_id,
        preference_id: preference.id,
        checkout_url: url,
      });
      const response = await POST(request({ action: 'create' }));
      expect(response.status).toBe(409);
      expect(mocks.provider).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_save', expect.anything());
    },
  );
  it.each([null, 'old-app'])(
    'não consulta preferência de sessão legada/outro app ao atualizar: %s',
    async (client_id) => {
      mocks.rpc.mockResolvedValueOnce({ ...test, client_id, preference_id: preference.id });
      expect((await POST(request({ action: 'refresh', testId: id }))).status).toBe(409);
      expect(mocks.provider).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_apply', expect.anything());
    },
  );
  it('rejeita client_id remoto divergente da preferência, mesmo que a sessão tenha o aplicativo atual', async () => {
    mocks.provider
      .mockResolvedValueOnce({ results: [{ id: 98765 }] })
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce({ ...preference, client_id: 'other-app' });
    expect((await POST(request({ action: 'refresh', testId: id }))).status).toBe(409);
    expect(mocks.provider).toHaveBeenCalledTimes(3);
    expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_apply', expect.anything());
  });
});

describe('webhook de homologação isolado do processamento comercial', () => {
  it.each([
    undefined,
    null,
    {},
    { id: null },
    { id: '66666' },
    { id: '12345' },
    { id: '' },
    { id: true },
  ])('rejeita comprador ausente/divergente/igual vendedor %j', async (payer) => {
    mocks.provider.mockResolvedValueOnce({ ...payment, live_mode: true, payer });
    expect((await webhook(notification())).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_apply', expect.anything());
    expect(mocks.commercialApply).not.toHaveBeenCalled();
  });
  it('rejeita vendedor real antes de consultar pagamento ou preferência', async () => {
    mocks.sellerToken.mockRejectedValue(
      new PaymentError('Somente vendedores fictícios são aceitos.', 409),
    );
    expect((await webhook(notification())).status).toBe(409);
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('reconfere o aplicativo na preferência também no webhook e bloqueia divergência', async () => {
    mocks.provider
      .mockResolvedValueOnce({ ...payment, live_mode: true })
      .mockResolvedValueOnce({ ...preference, client_id: 'other-app' });
    expect((await webhook(notification())).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_apply', expect.anything());
    expect(mocks.commercialApply).not.toHaveBeenCalled();
  });
  it('registra live_mode true observado após conferir identidades e preferência do app atual', async () => {
    mocks.provider
      .mockResolvedValueOnce({ ...payment, live_mode: true })
      .mockResolvedValueOnce(preference);
    const response = await webhook(notification());
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'payment_test_apply',
      expect.objectContaining({
        p_live_mode: true,
        p_expected_payer_id: '55555',
        p_payer_id: '55555',
      }),
    );
    expect(mocks.provider).toHaveBeenCalledWith(
      `/checkout/preferences/${preference.id}`,
      'APP_USR-test',
    );
    expect(mocks.commercialApply).not.toHaveBeenCalled();
  });
  it('registra aprovação fictícia assinada e consultada, sem chamar payment_apply', async () => {
    mocks.provider.mockResolvedValueOnce(payment).mockResolvedValueOnce(preference);
    const response = await webhook(notification());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, diagnostic: true });
    expect(mocks.sellerToken).toHaveBeenCalledWith(undefined, '12345');
    expect(mocks.rpc).toHaveBeenCalledWith(
      'payment_test_apply',
      expect.objectContaining({
        p_id: id,
        p_live_mode: false,
        p_amount_cents: 1000,
        p_status: 'approved',
      }),
    );
    expect(mocks.commercialApply).not.toHaveBeenCalled();
    expect(mocks.rpc.mock.calls.some(([name]) => name === 'payment_apply')).toBe(false);
  });
  it('preserva o caminho comercial para referências UUID de pedidos normais', async () => {
    mocks.provider.mockResolvedValueOnce({ ...payment, external_reference: id });
    expect((await webhook(notification())).status).toBe(200);
    expect(mocks.commercialApply).toHaveBeenCalledOnce();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('não registra nem consulta o provedor com assinatura inválida', async () => {
    const req = notification();
    req.headers.set('x-signature', 'invalid');
    expect((await webhook(req)).status).toBe(401);
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('não aceita diagnóstico em produção nem o encaminha para pedidos comerciais', async () => {
    mocks.config.mockReturnValue({ sandbox: false, origin, webhookSecret: 'test-secret' });
    mocks.provider.mockResolvedValueOnce(payment).mockResolvedValueOnce(preference);
    expect((await webhook(notification())).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.commercialApply).not.toHaveBeenCalled();
  });
  it.each([null, 'old-app'])(
    'não atualiza sessão de outro emissor ou legada via webhook: %s',
    async (client_id) => {
      mocks.provider.mockResolvedValueOnce(payment).mockResolvedValueOnce(preference);
      mocks.rpc.mockResolvedValueOnce({ ...test, client_id, preference_id: preference.id });
      expect((await webhook(notification())).status).toBe(409);
      expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_apply', expect.anything());
      expect(mocks.commercialApply).not.toHaveBeenCalled();
    },
  );
  it.each([
    { collector_id: 999 },
    { transaction_amount: 11 },
    { live_mode: 'true' },
    { live_mode: null },
    { live_mode: 0 },
    { live_mode: undefined },
    { currency_id: 'USD' },
    { date_last_updated: 'invalid' },
    { payment_method_id: undefined },
    { external_reference: 'duelink-sandbox:invalid' },
  ])('rejeita pagamento remoto incompatível %j sem gravar observação', async (patch) => {
    mocks.provider.mockResolvedValueOnce({ ...payment, ...patch });
    expect((await webhook(notification())).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalledWith('payment_test_apply', expect.anything());
    expect(mocks.commercialApply).not.toHaveBeenCalled();
  });
});

describe('a exceção de identidade não altera o contrato comercial de ambiente', () => {
  it('continua bloqueando live_mode true em sandbox e false em produção', () => {
    const expected = { reference, amount_cents: 1000 };
    const account = { providerUserId: '12345' };
    expect(() =>
      validatePaymentSnapshot({ ...payment, live_mode: true }, account, expected, true),
    ).toThrow(/marcou este pagamento como produção/);
    expect(() =>
      validatePaymentSnapshot({ ...payment, live_mode: false }, account, expected, false),
    ).toThrow(/marcou este pagamento como teste/);
    expect(() =>
      validatePaymentSnapshot({ ...payment, live_mode: true }, account, expected, false),
    ).not.toThrow();
  });
});
