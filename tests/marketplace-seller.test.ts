import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seal, unseal } from '@/lib/payments/core';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), fetch: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: mocks.rpc }) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
import {
  exchangeCode,
  paymentConfig,
  paymentsReady,
  sellerToken,
  storeTokens,
} from '@/lib/payments/server';

const key = Buffer.alloc(32, 7);
const token = 'APP_USR-unit-test-seller';
const tokens = {
  access_token: token,
  refresh_token: 'unit-refresh',
  user_id: 12345,
  expires_in: 3600,
};
const testProfile = { id: 12345, tags: ['test_user'], site_id: 'MLB', country_id: 'BR' };
function profile(value: unknown) {
  mocks.fetch.mockResolvedValueOnce(Response.json(value));
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubEnv('MERCADOPAGO_MODE', 'sandbox');
  vi.stubEnv('MERCADOPAGO_CLIENT_ID', 'unit-client');
  vi.stubEnv('MERCADOPAGO_CLIENT_SECRET', 'unit-client-secret');
  vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'unit-webhook-secret');
  vi.stubEnv('MERCADOPAGO_SANDBOX_CLIENT_ID', 'unit-sandbox-client');
  vi.stubEnv('MERCADOPAGO_SANDBOX_CLIENT_SECRET', 'unit-sandbox-client-secret');
  vi.stubEnv('MERCADOPAGO_SANDBOX_WEBHOOK_SECRET', 'unit-sandbox-webhook-secret');
  vi.stubEnv('MERCADOPAGO_TOKEN_ENCRYPTION_KEY', key.toString('base64'));
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://duelink.mage.dev.br');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://unit.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'unit-service-role');
  mocks.rpc.mockResolvedValue({ data: null, error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('identidade do vendedor e isolamento da homologação', () => {
  it('autoriza e cifra somente a conta brasileira de teste confirmada por users/me', async () => {
    profile(testProfile);
    await storeTokens('local-seller', tokens);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      'payment_store_seller',
      expect.objectContaining({ p_provider_user_id: '12345', p_seller_id: 'local-seller' }),
    );
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(token);
  });
  it('bloqueia uma conta real em sandbox antes de persistir credenciais', async () => {
    profile({ ...testProfile, tags: ['normal_user'] });
    await expect(storeTokens('local-seller', tokens)).rejects.toThrow(
      /somente contas Mercado Pago de teste/,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('rejeita token TEST incompatível sem consultar a conta ou persistir dados', async () => {
    await expect(
      storeTokens('local-seller', { ...tokens, access_token: 'TEST-unit-incompatible' }),
    ).rejects.toThrow(/APP_USR/);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('não permite conectar conta de teste em produção', async () => {
    vi.stubEnv('MERCADOPAGO_MODE', 'production');
    profile(testProfile);
    await expect(storeTokens('local-seller', tokens)).rejects.toThrow(
      /teste não podem receber vendas em produção/,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('aceita conta real brasileira em produção apenas depois da conferência', async () => {
    vi.stubEnv('MERCADOPAGO_MODE', 'production');
    profile({ ...testProfile, tags: [] });
    await storeTokens('local-seller', tokens);
    expect(mocks.rpc).toHaveBeenCalledWith('payment_store_seller', expect.any(Object));
  });
  it.each([
    { ...testProfile, tags: undefined },
    { ...testProfile, tags: null },
    { ...testProfile, tags: ['test_user', null] },
    { ...testProfile, id: 99999 },
    { ...testProfile, country_id: 'AR', site_id: 'MLA' },
    { ...testProfile, country_id: 'BR', site_id: 'MLA' },
    { ...testProfile, country_id: undefined, site_id: undefined },
    null,
  ])('falha fechada se a identidade ou o país não está confirmado %j', async (account) => {
    profile(account);
    await expect(storeTokens('local-seller', tokens)).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('falha fechada durante indisponibilidade de users/me', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(storeTokens('local-seller', tokens)).rejects.toThrow(/indisponível/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('reconfere um token já persistido e bloqueia conta real após troca para sandbox', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        seller_id: 'local-seller',
        provider_user_id: '12345',
        encrypted_tokens: seal(
          { access_token: token, refresh_token: 'unit-refresh', client_id: 'unit-sandbox-client' },
          key,
        ),
        expires_at: '2099-01-01T00:00:00Z',
      },
      error: null,
    });
    profile({ ...testProfile, tags: [] });
    await expect(sellerToken('local-seller')).rejects.toThrow(
      /somente contas Mercado Pago de teste/,
    );
    expect(mocks.rpc.mock.calls.some(([name]) => name === 'payment_store_seller')).toBe(false);
  });
  it('troca o código OAuth sem pedir token TEST ao provedor', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(tokens));
    await exchangeCode('unit-code', 'unit-pkce-verifier');
    expect(mocks.fetch.mock.calls[0][0]).toBe('https://api.mercadopago.com/oauth/token');
    const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('test_token');
    expect(body.grant_type).toBe('authorization_code');
    expect(body.code_verifier).toBe('unit-pkce-verifier');
    expect(body.client_id).toBe('unit-sandbox-client');
    expect(body.client_secret).toBe('unit-sandbox-client-secret');
  });
});

describe('credenciais por modo e vínculo da conexão ao aplicativo OAuth', () => {
  const stored = (payload: object, expires_at = '2099-01-01T00:00:00Z') => ({
    seller_id: 'local-seller',
    provider_user_id: '12345',
    encrypted_tokens: seal(payload, key),
    expires_at,
  });
  const boundTokens = {
    access_token: token,
    refresh_token: 'unit-refresh',
    client_id: 'unit-sandbox-client',
  };
  it('seleciona o conjunto sandbox completo e preserva a chave de criptografia compartilhada', () => {
    const config = paymentConfig();
    expect(config).toMatchObject({
      sandbox: true,
      clientId: 'unit-sandbox-client',
      clientSecret: 'unit-sandbox-client-secret',
      webhookSecret: 'unit-sandbox-webhook-secret',
    });
    expect(config.key).toEqual(key);
  });
  it('não faz fallback para credenciais reais quando todo o conjunto sandbox está ausente', () => {
    for (const name of ['CLIENT_ID', 'CLIENT_SECRET', 'WEBHOOK_SECRET'])
      vi.stubEnv(`MERCADOPAGO_SANDBOX_${name}`, undefined);
    expect(() => paymentConfig()).toThrow(/configuração do Mercado Pago/);
    expect(paymentsReady()).toBe(false);
  });
  it.each(['CLIENT_ID', 'CLIENT_SECRET', 'WEBHOOK_SECRET'])(
    'falha com conjunto sandbox parcial: falta %s',
    (name) => {
      vi.stubEnv(`MERCADOPAGO_SANDBOX_${name}`, undefined);
      expect(() => paymentConfig()).toThrow();
      expect(paymentsReady()).toBe(false);
    },
  );
  it('produção usa somente o conjunto genérico, mesmo com sandbox configurado', () => {
    vi.stubEnv('MERCADOPAGO_MODE', 'production');
    expect(paymentConfig()).toMatchObject({
      sandbox: false,
      clientId: 'unit-client',
      clientSecret: 'unit-client-secret',
      webhookSecret: 'unit-webhook-secret',
    });
    vi.stubEnv('MERCADOPAGO_CLIENT_SECRET', undefined);
    expect(() => paymentConfig()).toThrow();
  });
  it('OAuth do novo aplicativo persiste o client_id dentro do JSON cifrado', async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json(tokens));
    profile(testProfile);
    const exchanged = await exchangeCode('new-app-code', 'unit-pkce');
    await storeTokens('local-seller', exchanged);
    const encrypted = mocks.rpc.mock.calls.find(([name]) => name === 'payment_store_seller')![1]
      .p_encrypted_tokens;
    expect(unseal(encrypted, key)).toEqual({ ...boundTokens });
    expect(encrypted).not.toContain('unit-sandbox-client');
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body).client_id).toBe('unit-sandbox-client');
  });
  it.each(['2099-01-01T00:00:00Z', '2000-01-01T00:00:00Z'])(
    'bloqueia outro emissor antes de usar cache ou refresh, validade %s',
    async (expiresAt) => {
      mocks.rpc.mockResolvedValueOnce({
        data: stored({ ...boundTokens, client_id: 'other-app' }, expiresAt),
        error: null,
      });
      await expect(sellerToken('local-seller')).rejects.toThrow(/Reconecte.*outro aplicativo/);
      expect(mocks.fetch).not.toHaveBeenCalled();
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    },
  );
  it('conexão legada sem client_id exige reconexão, sem tentar refresh', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: stored({ access_token: token, refresh_token: 'unit-refresh' }, '2000-01-01T00:00:00Z'),
      error: null,
    });
    await expect(sellerToken('local-seller')).rejects.toThrow(/Reconecte.*conexão é antiga/);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('revalida o emissor do token obtido no lease e o libera quando a conta mudou', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: stored(boundTokens, '2000-01-01T00:00:00Z'),
      error: null,
    });
    mocks.rpc.mockResolvedValueOnce({
      data: { ...stored({ ...boundTokens, client_id: 'other-app' }), refresh: true },
      error: null,
    });
    await expect(sellerToken('local-seller')).rejects.toThrow(/Reconecte/);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('payment_release_seller_refresh', {
      p_seller_id: 'local-seller',
    });
  });
  it('atualiza token emitido pelo aplicativo correto usando apenas seu secret de sandbox', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: stored(boundTokens, '2000-01-01T00:00:00Z'),
      error: null,
    });
    mocks.rpc.mockResolvedValueOnce({
      data: { ...stored(boundTokens, '2000-01-01T00:00:00Z'), refresh: true },
      error: null,
    });
    mocks.fetch.mockResolvedValueOnce(Response.json(tokens));
    profile(testProfile);
    await expect(sellerToken('local-seller')).resolves.toMatchObject({
      token,
      providerUserId: '12345',
    });
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toMatchObject({
      client_id: 'unit-sandbox-client',
      client_secret: 'unit-sandbox-client-secret',
      grant_type: 'refresh_token',
      refresh_token: 'unit-refresh',
    });
    const encrypted = mocks.rpc.mock.calls.find(([name]) => name === 'payment_store_seller')![1]
      .p_encrypted_tokens;
    expect(unseal(encrypted, key)).toEqual(boundTokens);
  });
});
