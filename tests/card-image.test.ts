import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/card-image/[id]/route';

describe('card image assets', () => {
  it('serves local cards without redirecting to the development bind address', async () => {
    const response = await GET(new Request('http://0.0.0.0:3000/api/card-image/89631139'), {
      params: Promise.resolve({ id: '89631139' }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it('serves the bundled card back for a Pokémon with no catalog image', async () => {
    const response = await GET(
      new Request('http://0.0.0.0:3000/api/card-image/not-in-catalog?game=pokemon'),
      {
        params: Promise.resolve({ id: 'not-in-catalog' }),
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
    expect(await response.text()).toContain('<svg');
  });

  it('rejects traversal before accessing a local asset', async () => {
    const response = await GET(new Request('http://localhost:3000/api/card-image/invalid'), {
      params: Promise.resolve({ id: '../logo' }),
    });
    expect(response.status).toBe(400);
  });
});
