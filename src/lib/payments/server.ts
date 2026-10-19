import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { cents, encryptionKey, PaymentError, seal, unseal } from './core';
import type { MarketplaceOrder } from '@/types/marketplace';

export function paymentConfig() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const key = process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;
  const mode = process.env.MERCADOPAGO_MODE;
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
  await rpc('payment_store_seller', {
    p_seller_id: sellerId,
    p_provider_user_id: String(tokens.user_id),
    p_encrypted_tokens: seal(
      { access_token: tokens.access_token, refresh_token: tokens.refresh_token },
      config.key,
    ),
    p_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  });
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
  let tokens = unseal<{ access_token: string; refresh_token: string }>(
    account.encrypted_tokens,
    config.key,
  );
  if (new Date(account.expires_at).getTime() < Date.now() + 60000) {
    const claimed = await rpc<StoredAccount & { refresh: boolean }>(
      'payment_claim_seller_refresh',
      { p_seller_id: account.seller_id },
    );
    tokens = unseal<{ access_token: string; refresh_token: string }>(
      claimed.encrypted_tokens,
      config.key,
    );
    if (claimed.refresh) {
      try {
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
        tokens = fresh;
      } finally {
        await rpc('payment_release_seller_refresh', { p_seller_id: account.seller_id });
      }
    }
  }
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
      test_token: config.sandbox,
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
};
export async function applyVerifiedPayment(
  payment: ProviderPayment,
  account: { providerUserId: string; sellerId: string },
) {
  const config = paymentConfig();
  if (
    String(payment.collector_id) !== account.providerUserId ||
    payment.currency_id !== 'BRL' ||
    payment.live_mode === config.sandbox
  )
    throw new PaymentError(
      'O pagamento não corresponde ao vendedor ou ao ambiente do pedido.',
      409,
    );
  const order = await serviceClient()
    .from('marketplace_orders')
    .select('*')
    .eq('id', payment.external_reference)
    .single();
  if (order.error || !order.data || order.data.seller_id !== account.sellerId)
    throw new PaymentError('O pagamento não corresponde a um pedido deste vendedor.', 409);
  if (
    cents(payment.transaction_amount) !== order.data.subtotal_cents ||
    !Number.isFinite(Date.parse(payment.date_last_updated))
  )
    throw new PaymentError('O valor ou a data do pagamento não corresponde ao pedido.', 409);
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
