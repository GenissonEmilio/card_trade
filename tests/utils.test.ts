import { describe, it, expect } from 'vitest';
import { safeNext } from '../src/lib/utils';
describe('redirecionamento de autenticação', () => {
  it('aceita apenas caminhos locais seguros', () => {
    expect(safeNext('/colecao')).toBe('/colecao');
    for (const value of ['https://example.com', '//example.com', '/\\example.com', null])
      expect(safeNext(value)).toBe('/');
  });
});
