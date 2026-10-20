import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  assertCheckoutToken,
  assertSellerAccount,
  cents,
  encryptionKey,
  PaymentError,
  seal,
  unseal,
} from './core';
import type { MarketplaceOrder } from '@/types/marketplace';

export function paymentConfig() {
  const mode = process.env.MERCADOPAGO_MODE;
  // A missing sandbox credential must never select credentials from the real operator.
  const clientId =
    mode === 'sandbox'
      ? process.env.MERCADOPAGO_SANDBOX_CLIENT_ID
      : process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret =
    mode === 'sandbox'
      ? process.env.MERCADOPAGO_SANDBOX_CLIENT_SECRET
      : process.env.MERCADOPAGO_CLIENT_SECRET;
  const webhookSecret =
    mode === 'sandbox'
      ? process.env.MERCADOPAGO_SANDBOX_WEBHOOK_SECRET
      : process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const key = process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (
    !clientId ||
    !clientSecret ||
    !webhookSecret ||
    !key ||
    !appUrl ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !['sandbox', 'production'].includes(mode || '')
  )
    throw new PaymentError(
      'Os pagamentos ainda não foram habilitados. O administrador precisa concluir a configuração do Mercado Pago.',
      503,
    );
  const origin = new URL(appUrl).origin;
  if (mode === 'production' && !origin.startsWith('https://'))
    throw new PaymentError('A publicação segura dos pagamentos está incompleta.', 503);
  return {
    clientId,
    clientSecret,
    webhookSecret,
    key: encryptionKey(key),
    sandbox: mode === 'sandbox',
    origin,
    redirectUri: `${origin}/api/marketplace/callback`,
  };
}
export function paymentsReady(): boolean {
  try {
    paymentConfig();
    return true;
  } catch {
    return false;
  }
}
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new PaymentError('O serviço seguro de pagamentos ainda não foi configurado.', 503);
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function currentUser() {
  const client = await createClient();
  const { data } = client ? await client.auth.getUser() : { data: { user: null } };
  if (!data.user || !client) throw new PaymentError('Entre na sua conta.', 401);
  return { client, user: data.user };
}
export function sameOrigin(request: Request) {
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  if (
    request.headers.get('origin') !== expected ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new PaymentError('Origem da solicitação inválida.', 403);
}
export function failure(error: unknown): Response {
  const known = error instanceof PaymentError;
  return Response.json(
    { error: known ? error.message : 'Não foi possível concluir esta operação. Tente novamente.' },
    { status: known ? error.status : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await serviceClient().rpc(name, args);
  if (error) throw new PaymentError(error.message, 409);
  return data as T;
}
export async function provider<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new PaymentError('Endpoint inválido.', 500);
  let response: Response;
  try {
    response = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new PaymentError('O Mercado Pago está indisponível. Tente novamente.', 502);
  }
  if (!response.ok)
    throw new PaymentError(
      response.status === 401 || response.status === 403
        ? 'Reconecte a conta Mercado Pago do vendedor ou revise a habilitação da aplicação.'
        : 'O Mercado Pago não concluiu a solicitação. Verifique o pedido antes de tentar novamente.',
      502,
    );
  return response.json() as Promise<T>;
}
type Tokens = {
  access_token: string;
  refresh_token: string;
  user_id: string | number;
  expires_in: number;
};
type StoredAccount = {
  seller_id: string;
  provider_user_id: string;
  encrypted_tokens: string;
  expires_at: string;
};
export async function verifySellerAccount(
  token: string,
  providerUserId: string,
  sandbox: boolean,
): Promise<void> {
  assertCheckoutToken(token);
  const profile = await provider<unknown>('/users/me', token);
  assertSellerAccount(token, profile, providerUserId, sandbox);
}
export async function storeTokens(sellerId: string, tokens: Tokens) {
  if (
    !tokens.access_token ||
    !tokens.refresh_token ||
    !tokens.user_id ||
    !Number.isFinite(tokens.expires_in) ||
    tokens.expires_in <= 0
  )
    throw new PaymentError('A conexão retornada pelo Mercado Pago está incompleta.', 502);
  const config = paymentConfig();
  await verifySellerAccount(tokens.access_token, String(tokens.user_id), config.sandbox);
  await rpc('payment_store_seller', {
    p_seller_id: sellerId,
    p_provider_user_id: String(tokens.user_id),
    p_encrypted_tokens: seal(
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        client_id: config.clientId,
      },
      config.key,
    ),
    p_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  });
}
type BoundSellerTokens = { access_token: string; refresh_token: string; client_id: string };
function readBoundSellerTokens(
  encrypted: string,
  config: ReturnType<typeof paymentConfig>,
): BoundSellerTokens {
  const tokens = unseal<Partial<BoundSellerTokens> | null>(encrypted, config.key);
  if (
    !tokens ||
    typeof tokens !== 'object' ||
    tokens.client_id !== config.clientId ||
    typeof tokens.access_token !== 'string' ||
    !tokens.access_token ||
    typeof tokens.refresh_token !== 'string' ||
    !tokens.refresh_token
  )
    throw new PaymentError(
      'Reconecte a conta Mercado Pago: a conexão é antiga ou pertence a outro aplicativo.',
      409,
    );
  return tokens as BoundSellerTokens;
}
export async function sellerToken(
  sellerId?: string,
  providerUserId?: string,
): Promise<{ token: string; providerUserId: string; sellerId: string }> {
  const config = paymentConfig();
  const account = await rpc<StoredAccount | null>('payment_get_seller', {
    p_seller_id: sellerId || null,
    p_provider_user_id: providerUserId || null,
  });
  if (!account) throw new PaymentError('O vendedor precisa conectar a conta Mercado Pago.', 409);
  let tokens = readBoundSellerTokens(account.encrypted_tokens, config);
  let verified = false;
  if (new Date(account.expires_at).getTime() < Date.now() + 60000) {
    const claimed = await rpc<StoredAccount & { refresh: boolean }>(
      'payment_claim_seller_refresh',
      { p_seller_id: account.seller_id },
    );
    try {
      tokens = readBoundSellerTokens(claimed.encrypted_tokens, config);
      if (
        claimed.seller_id !== account.seller_id ||
        claimed.provider_user_id !== account.provider_user_id
      )
        throw new PaymentError('A conexão Mercado Pago mudou. Reconecte o vendedor.', 409);
      if (claimed.refresh) {
        const fresh = await provider<Tokens>('/oauth/token', null, {
          method: 'POST',
          body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: tokens.refresh_token,
          }),
        });
        if (String(fresh.user_id) !== account.provider_user_id)
          throw new PaymentError('A conta de recebimento não corresponde ao vendedor.', 409);
        await storeTokens(account.seller_id, fresh);
        tokens = { ...fresh, client_id: config.clientId };
        verified = true;
      }
    } finally {
      if (claimed.refresh)
        await rpc('payment_release_seller_refresh', { p_seller_id: account.seller_id });
    }
  }
  if (!verified)
    await verifySellerAccount(tokens.access_token, account.provider_user_id, config.sandbox);
  return {
    token: tokens.access_token,
    providerUserId: account.provider_user_id,
    sellerId: account.seller_id,
  };
}
export async function exchangeCode(code: string, verifier: string): Promise<Tokens> {
  const config = paymentConfig();
  return provider<Tokens>('/oauth/token', null, {
    method: 'POST',
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
    }),
  });
}
export type ProviderPayment = {
  id: string | number;
  external_reference: string;
  collector_id: string | number;
  currency_id: string;
  transaction_amount: number;
  transaction_amount_refunded?: number;
  status: string;
  date_last_updated: string;
  live_mode: boolean;
  payment_method_id?: string;
};
export function validatePaymentSnapshot(
  payment: ProviderPayment,
  account: { providerUserId: string },
  expected: { reference: string; amount_cents: number },
  sandbox: boolean,
) {
  if (
    !/^[0-9]{1,30}$/.test(String(payment.id)) ||
    payment.external_reference !== expected.reference ||
    String(payment.collector_id) !== account.providerUserId ||
    payment.currency_id !== 'BRL' ||
    cents(payment.transaction_amount) !== expected.amount_cents ||
    typeof payment.date_last_updated !== 'string' ||
    !Number.isFinite(Date.parse(payment.date_last_updated)) ||
    ![
      'pending',
      'approved',
      'authorized',
      'in_process',
      'in_mediation',
      'rejected',
      'cancelled',
      'refunded',
      'charged_back',
    ].includes(payment.status)
  )
    throw new PaymentError(
      'O pagamento não corresponde à referência, ao vendedor, ao valor ou ao ambiente.',
      409,
    );
  if (payment.live_mode !== !sandbox)
    throw new PaymentError(
      typeof payment.live_mode !== 'boolean'
        ? 'O Mercado Pago não informou o ambiente do pagamento. A conferência foi bloqueada.'
        : sandbox
          ? 'O Mercado Pago marcou este pagamento como produção, mas o site está configurado para testes. A conferência foi bloqueada.'
          : 'O Mercado Pago marcou este pagamento como teste, mas o site está configurado para produção. A conferência foi bloqueada.',
      409,
    );
}
export async function applyVerifiedPayment(
  payment: ProviderPayment,
  account: { providerUserId: string; sellerId: string },
) {
  const config = paymentConfig();
  const order = await serviceClient()
    .from('marketplace_orders')
    .select('*')
    .eq('id', payment.external_reference)
    .single();
  if (order.error || !order.data || order.data.seller_id !== account.sellerId)
    throw new PaymentError('O pagamento não corresponde a um pedido deste vendedor.', 409);
  validatePaymentSnapshot(
    payment,
    account,
    {
      reference: order.data.id,
      amount_cents: order.data.subtotal_cents,
    },
    config.sandbox,
  );
  return rpc<string>('payment_apply', {
    p_order_id: payment.external_reference,
    p_payment_id: String(payment.id),
    p_status: payment.status,
    p_amount_cents: cents(payment.transaction_amount),
    p_refunded_cents: cents(payment.transaction_amount_refunded || 0),
    p_collector_id: String(payment.collector_id),
    p_currency: payment.currency_id,
    p_event_key: `${payment.id}:${payment.date_last_updated}:${payment.status}:${payment.transaction_amount_refunded || 0}`,
    p_updated_at: payment.date_last_updated,
  });
}
export async function ownedOrder(
  id: string,
  userId: string,
  allowAdmin = false,
): Promise<MarketplaceOrder> {
  const result = await serviceClient().from('marketplace_orders').select('*').eq('id', id).single();
  if (
    result.error ||
    !result.data ||
    (!allowAdmin && ![result.data.buyer_id, result.data.seller_id].includes(userId))
  )
    throw new PaymentError('Pedido não encontrado.', 404);
  return result.data as MarketplaceOrder;
}
