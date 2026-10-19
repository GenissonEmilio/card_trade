import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentError } from '@/lib/payments/core';

const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  currentUser: vi.fn(),
  provider: vi.fn(),
  rpc: vi.fn(),
  sellerToken: vi.fn(),
  sameOrigin: vi.fn(),
}));
vi.mock('@/lib/payments/server', () => ({
  paymentConfig: mocks.config,
  currentUser: mocks.currentUser,
  provider: mocks.provider,
  rpc: mocks.rpc,
  sellerToken: mocks.sellerToken,
  sameOrigin: mocks.sameOrigin,
  failure: (error: unknown) =>
    Response.json(
      { error: error instanceof Error ? error.message : 'error' },
      { status: error instanceof PaymentError ? error.status : 500 },
    ),
}));
import { POST } from '@/app/api/marketplace/checkout/route';

const orderId = '00000000-0000-4000-8000-000000000001';
const initPoint = 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=test-preference';
const order = {
  id: orderId,
  seller_id: 'seller',
  commission_cents: 100,
  expires_at: '2099-01-01T00:00:00Z',
  items: [
    {
      listing_id: 'listing',
      quantity: 1,
      unit_price_cents: 1000,
      listing_snapshot: { card_name: 'Carta teste', description: 'Exemplar de teste' },
    },
  ],
};
function request() {
  return new Request('https://duelink.mage.dev.br/api/marketplace/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://duelink.mage.dev.br' },
    body: JSON.stringify({ orderId }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({ sandbox: true, origin: 'https://duelink.mage.dev.br' });
  mocks.currentUser.mockResolvedValue({ user: { id: 'buyer', email: 'buyer@example.test' } });
  mocks.sellerToken.mockResolvedValue({
    token: 'APP_USR-test-user-token',
    providerUserId: '12345',
    sellerId: 'seller',
  });
  mocks.rpc.mockImplementation((name) =>
    Promise.resolve(name === 'payment_claim_checkout' ? { order } : null),
  );
});

describe('Checkout Pro com usuários de teste', () => {
  it('retorna e persiste init_point mesmo em modo sandbox, sem depender de outro campo', async () => {
    mocks.provider.mockResolvedValueOnce({ elements: [] }).mockResolvedValueOnce({
      id: 'preference',
      init_point: initPoint,
      external_reference: orderId,
      collector_id: 12345,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: initPoint });
    expect(mocks.rpc).toHaveBeenCalledWith('payment_save_checkout', {
      p_order_id: orderId,
      p_preference_id: 'preference',
      p_checkout_url: initPoint,
    });
  });
  it('reutiliza init_point persistido somente após validar a preferência e a conta do vendedor', async () => {
    mocks.rpc.mockResolvedValueOnce({ order, url: initPoint });
    mocks.provider
      .mockResolvedValueOnce({ elements: [{ id: 'preference' }] })
      .mockResolvedValueOnce({
        id: 'preference',
        init_point: initPoint,
        external_reference: orderId,
        collector_id: 12345,
      });
    const response = await POST(request());
    expect(await response.json()).toEqual({ url: initPoint });
    expect(mocks.sellerToken).toHaveBeenCalledWith('seller');
    expect(mocks.provider.mock.calls.every(([, , options]) => options?.method !== 'POST')).toBe(
      true,
    );
  });
  it('corrige uma URL sandbox persistida consultando a preferência existente', async () => {
    mocks.rpc.mockResolvedValueOnce({
      order,
      url: 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=old',
    });
    mocks.provider
      .mockResolvedValueOnce({ elements: [{ id: 'preference' }] })
      .mockResolvedValueOnce({
        id: 'preference',
        init_point: initPoint,
        external_reference: orderId,
        collector_id: 12345,
      });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: initPoint });
    expect(mocks.provider.mock.calls.every(([, , options]) => options?.method !== 'POST')).toBe(
      true,
    );
    expect(mocks.rpc).toHaveBeenCalledWith('payment_save_checkout', {
      p_order_id: orderId,
      p_preference_id: 'preference',
      p_checkout_url: initPoint,
    });
  });
  it('não cria outra preferência quando a URL antiga não pode ser recuperada', async () => {
    mocks.rpc.mockResolvedValueOnce({
      order,
      url: 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=old',
    });
    mocks.provider.mockResolvedValueOnce({ elements: [] });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(mocks.provider).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls.some(([name]) => name === 'payment_save_checkout')).toBe(false);
  });
  it('omite o e-mail do Duelink em testes para o comprador autenticar a conta MP de teste', async () => {
    mocks.currentUser.mockResolvedValue({ user: { id: 'buyer', email: 'real-user@gmail.com' } });
    mocks.provider.mockResolvedValueOnce({ elements: [] }).mockResolvedValueOnce({
      id: 'preference',
      init_point: initPoint,
      external_reference: orderId,
      collector_id: 12345,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = JSON.parse(
      mocks.provider.mock.calls.find(([path]) => path === '/checkout/preferences')![2].body,
    );
    expect(body).not.toHaveProperty('payer');
    expect(body.auto_return).toBe('approved');
  });
  it('preserva o e-mail verificado do comprador e o retorno automático no domínio HTTPS em produção', async () => {
    mocks.config.mockReturnValue({ sandbox: false, origin: 'https://duelink.mage.dev.br' });
    mocks.provider.mockResolvedValueOnce({ elements: [] }).mockResolvedValueOnce({
      id: 'preference',
      init_point: initPoint,
      external_reference: orderId,
      collector_id: 12345,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = JSON.parse(
      mocks.provider.mock.calls.find(([path]) => path === '/checkout/preferences')![2].body,
    );
    expect(body.payer).toEqual({ email: 'buyer@example.test' });
    expect(body.auto_return).toBe('approved');
  });
  it.each([
    'http://localhost:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    'https://127.2.3.4:3000',
    'https://0.0.0.0:3000',
    'http://duelink.mage.dev.br',
    'https://[::1]:3000',
    'https://192.168.0.10:3000',
  ])('omite retorno automático no endereço não público ou sem HTTPS %s', async (origin) => {
    mocks.config.mockReturnValue({ sandbox: true, origin });
    mocks.provider.mockResolvedValueOnce({ elements: [] }).mockResolvedValueOnce({
      id: 'preference',
      init_point: initPoint,
      external_reference: orderId,
      collector_id: 12345,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = JSON.parse(
      mocks.provider.mock.calls.find(([path]) => path === '/checkout/preferences')![2].body,
    );
    expect(body).not.toHaveProperty('auto_return');
    expect(body.back_urls.success).toBe(`${origin}/pedidos/${orderId}?retorno=sucesso`);
  });
  it('bloqueia uma URL produtiva em cache se a conta atual é real e o modo é sandbox', async () => {
    mocks.rpc.mockResolvedValueOnce({ order, url: initPoint });
    mocks.sellerToken.mockRejectedValueOnce(
      new PaymentError('A homologação aceita somente contas Mercado Pago de teste.', 409),
    );
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).not.toHaveProperty('url');
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it('não reutiliza preferência em cache cujo coletor pertence a outra conta, inclusive após troca de modo', async () => {
    mocks.rpc.mockResolvedValueOnce({ order, url: initPoint });
    mocks.provider
      .mockResolvedValueOnce({ elements: [{ id: 'production-preference' }] })
      .mockResolvedValueOnce({
        id: 'production-preference',
        init_point: initPoint,
        external_reference: orderId,
        collector_id: 99999,
      });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).not.toHaveProperty('url');
    expect(mocks.rpc.mock.calls.some(([name]) => name === 'payment_save_checkout')).toBe(false);
  });
  it('não libera preferência que pertence a outro pedido', async () => {
    mocks.provider
      .mockResolvedValueOnce({ elements: [{ id: 'preference' }] })
      .mockResolvedValueOnce({
        id: 'preference',
        init_point: initPoint,
        external_reference: 'other-order',
        collector_id: 12345,
      });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(mocks.provider.mock.calls.every(([, , options]) => options?.method !== 'POST')).toBe(
      true,
    );
  });
});
