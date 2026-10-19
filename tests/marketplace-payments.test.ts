import { createHmac, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  cents,
  checkoutUrl,
  commissionCents,
  encryptionKey,
  pkce,
  seal,
  unseal,
  verifyWebhookSignature,
} from '../src/lib/payments/core';

describe('contrato financeiro e integridade', () => {
  it('converte BRL sem aceitar frações ocultas de centavos', () => {
    expect(cents(10.01)).toBe(1001);
    expect(commissionCents(4002, 750)).toBe(300);
    expect(() => cents(1.001)).toThrow();
    expect(() => commissionCents(100, 10001)).toThrow();
  });
  it('criptografa os tokens com autenticação e rejeita alterações', () => {
    const key = randomBytes(32),
      value = seal({ access_token: 'sensitive' }, key);
    expect(value).not.toContain('sensitive');
    expect(unseal(value, key)).toEqual({ access_token: 'sensitive' });
    expect(() => unseal(value, randomBytes(32))).toThrow();
    expect(() => encryptionKey('invalid')).toThrow();
  });
  it('usa PKCE e estados diferentes em cada autorização', () => {
    const a = pkce(),
      b = pkce();
    expect(a.verifier.length).toBeGreaterThanOrEqual(43);
    expect(a.state).not.toBe(b.state);
    expect(a.verifier).not.toBe(a.challenge);
  });
  it('verifica o manifesto oficial do webhook sem confiar no corpo recebido', () => {
    const signature = createHmac('sha256', 'secret')
      .update('id:123;request-id:request;ts:1704908010;')
      .digest('hex');
    expect(
      verifyWebhookSignature('123', 'request', `ts=1704908010,v1=${signature}`, 'secret'),
    ).toBe(true);
    expect(
      verifyWebhookSignature('999', 'request', `ts=1704908010,v1=${signature}`, 'secret'),
    ).toBe(false);
    expect(
      verifyWebhookSignature('123', 'different', `ts=1704908010,v1=${signature}`, 'secret'),
    ).toBe(false);
    expect(verifyWebhookSignature('123', 'request', 'ts=1704908010,v1=oops', 'secret')).toBe(false);
  });
  it('usa o host init_point do Mercado Pago também em testes e rejeita URLs antigas de sandbox', () => {
    expect(
      checkoutUrl('https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123'),
    ).toContain('mercadopago');
    expect(() => checkoutUrl('https://www.mercadopago.com.br.evil.test/')).toThrow();
    expect(() => checkoutUrl('https://sandbox.mercadopago.com.br/')).toThrow();
    expect(() => checkoutUrl(undefined)).toThrow(/checkout inválido/);
    expect(() => checkoutUrl('invalid')).toThrow(/checkout inválido/);
  });
});
