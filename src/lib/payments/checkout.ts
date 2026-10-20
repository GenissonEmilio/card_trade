import { cents, checkoutUrl, isPublicHttpsOrigin, PaymentError } from './core';
import { provider } from './server';

export type CheckoutSpec = {
  reference: string;
  idempotencyKey: string;
  items: {
    id: string;
    title: string;
    description: string;
    quantity: number;
    unit_price_cents: number;
  }[];
  commission_cents: number;
  expires_at: string;
  returnPath: string;
  metadata: Record<string, string>;
  email?: string;
};
export type CheckoutAccount = { token: string; providerUserId: string; sellerId: string };
type CheckoutConfig = { origin: string; sandbox: boolean };
export type CheckoutPreference = {
  id: string;
  init_point: string;
  external_reference: string;
  collector_id: string | number;
  marketplace_fee: number;
  items: { currency_id: string; quantity: number; unit_price: number }[];
};

export function preferenceBody(spec: CheckoutSpec, config: CheckoutConfig) {
  const separator = spec.returnPath.includes('?') ? '&' : '?';
  const returnUrl = `${config.origin}${spec.returnPath}${separator}retorno=`;
  return {
    items: spec.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description.slice(0, 250),
      currency_id: 'BRL',
      quantity: item.quantity,
      unit_price: item.unit_price_cents / 100,
    })),
    marketplace_fee: spec.commission_cents / 100,
    external_reference: spec.reference,
    ...(!config.sandbox && spec.email ? { payer: { email: spec.email } } : {}),
    back_urls: {
      success: `${returnUrl}sucesso`,
      pending: `${returnUrl}pendente`,
      failure: `${returnUrl}falha`,
    },
    ...(isPublicHttpsOrigin(config.origin) ? { auto_return: 'approved' } : {}),
    notification_url: `${config.origin}/api/marketplace/webhook?source_news=webhooks`,
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: spec.expires_at,
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
      installments: 1,
    },
    statement_descriptor: 'DUELINK',
    metadata: spec.metadata,
  };
}

/** Both new and recovered preferences must match the trusted server snapshot. */
export function validatePreference(
  preference: CheckoutPreference,
  spec: CheckoutSpec,
  account: CheckoutAccount,
): string {
  if (
    !preference ||
    typeof preference.id !== 'string' ||
    !preference.id ||
    preference.external_reference !== spec.reference ||
    String(preference.collector_id) !== account.providerUserId
  )
    throw new PaymentError(
      'A referência ou a conta de recebimento do checkout não corresponde.',
      409,
    );
  const expected = spec.items.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);
  if (
    typeof preference.marketplace_fee !== 'number' ||
    cents(preference.marketplace_fee) !== spec.commission_cents ||
    !Array.isArray(preference.items) ||
    !preference.items.length ||
    preference.items.some(
      (item) =>
        item.currency_id !== 'BRL' ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        typeof item.unit_price !== 'number',
    ) ||
    preference.items.reduce((sum, item) => sum + item.quantity * cents(item.unit_price), 0) !==
      expected
  )
    throw new PaymentError('O valor ou a comissão do checkout não corresponde.', 409);
  return checkoutUrl(preference.init_point);
}

export async function readPreference(
  preferenceId: string,
  spec: CheckoutSpec,
  account: CheckoutAccount,
) {
  const preference = await provider<CheckoutPreference>(
    `/checkout/preferences/${encodeURIComponent(preferenceId)}`,
    account.token,
  );
  const url = validatePreference(preference, spec, account);
  return { preference, url };
}

/** The caller holds a database lease; searches recover interrupted provider writes. */
export async function createOrRecoverPreference(
  spec: CheckoutSpec,
  account: CheckoutAccount,
  config: CheckoutConfig,
  saved: { preferenceId?: string | null; url?: string | null } = {},
) {
  if (saved.preferenceId) return readPreference(saved.preferenceId, spec, account);
  const found = await provider<{ elements: { id: string }[] }>(
    `/checkout/preferences/search?external_reference=${encodeURIComponent(spec.reference)}&limit=2`,
    account.token,
  );
  if (!Array.isArray(found.elements) || found.elements.length > 1)
    throw new PaymentError(
      'A preferência precisa ser conferida antes de iniciar outro checkout.',
      409,
    );
  if (found.elements[0]) return readPreference(found.elements[0].id, spec, account);
  if (saved.url)
    throw new PaymentError(
      'Não foi possível recuperar o checkout. Consulte o pagamento antes de criar outro.',
      409,
    );
  const preference = await provider<CheckoutPreference>('/checkout/preferences', account.token, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': spec.idempotencyKey },
    body: JSON.stringify(preferenceBody(spec, config)),
  });
  return { preference, url: validatePreference(preference, spec, account) };
}
