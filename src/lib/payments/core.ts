import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export class PaymentError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new PaymentError('Valor financeiro inválido.');
  const amount = Math.round(value * 100);
  if (!Number.isSafeInteger(amount) || Math.abs(amount / 100 - value) > 0.000001)
    throw new PaymentError('Valor financeiro inválido.');
  return amount;
}
export function commissionCents(total: number, bps: number): number {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isInteger(bps) || bps < 0 || bps > 10000)
    throw new PaymentError('Comissão inválida.');
  return Math.round((total * bps) / 10000);
}
export function encryptionKey(value: string): Buffer {
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32)
    throw new PaymentError('A configuração segura dos pagamentos está incompleta.', 503);
  return key;
}
export function seal(value: unknown, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}
export function unseal<T>(value: string, key: Buffer): T {
  try {
    const [version, iv, tag, data] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !data) throw new Error();
    const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    cipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(
      Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString(
        'utf8',
      ),
    ) as T;
  } catch {
    throw new PaymentError('A conexão de pagamento precisa ser refeita.', 503);
  }
}
export function pkce() {
  const verifier = randomBytes(48).toString('base64url');
  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
    state: randomBytes(32).toString('base64url'),
  };
}
/** Mercado Pago signs query data.id + x-request-id + ts; payload status is never trusted. */
export function verifyWebhookSignature(
  dataId: string,
  requestId: string,
  signature: string,
  secret: string,
): boolean {
  if (!dataId || !requestId || !secret || signature.length > 500) return false;
  const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')));
  if (!/^\d{10,16}$/.test(parts.ts || '') || !/^[a-f0-9]{64}$/i.test(parts.v1 || '')) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, 'hex'));
}
export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
  );
}
export function checkoutUrl(value: string, sandbox: boolean): string {
  const url = new URL(value);
  const allowed = sandbox
    ? ['sandbox.mercadopago.com.br', 'sandbox.mercadopago.com']
    : ['www.mercadopago.com.br', 'www.mercadopago.com'];
  if (url.protocol !== 'https:' || !allowed.includes(url.hostname))
    throw new PaymentError('O provedor retornou um checkout inválido.', 502);
  return url.href;
}
