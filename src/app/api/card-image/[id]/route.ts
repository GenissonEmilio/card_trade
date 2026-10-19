import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getCatalog } from '@/lib/catalog-server';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = new URL(request.url).searchParams.get('game') === 'pokemon' ? 'pokemon' : 'yugioh';
  if (game === 'pokemon') {
    if (!/^[a-zA-Z0-9.-]{1,80}$/.test(id)) return new NextResponse(null, { status: 400 });
    const card = getCatalog().cards.find((c) => c.game === 'pokemon' && c.id === id);
    if (!card?.image_url) return NextResponse.redirect(new URL('/card-back.svg', request.url));
    // Only trusted URLs from our versioned catalog are fetched; clients cannot supply a URL.
    const image = new URL(card.image_url);
    if (image.hostname !== 'assets.tcgdex.net' || image.protocol !== 'https:')
      return new NextResponse(null, { status: 400 });
    try {
      const res = await fetch(image, {
        next: { revalidate: 31536000 },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok || !res.headers.get('content-type')?.startsWith('image/'))
        return NextResponse.redirect(new URL('/card-back.svg', request.url));
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 3000000) return new NextResponse(null, { status: 413 });
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch {
      return NextResponse.redirect(new URL('/card-back.svg', request.url));
    }
  }
  if (!/^\d{1,10}$/.test(id)) return new NextResponse(null, { status: 400 });
  if (existsSync(path.join(process.cwd(), 'public', 'cards', `${id}.jpg`)))
    return NextResponse.redirect(new URL(`/cards/${id}.jpg`, request.url));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_EDGE_ANON_KEY;
  if (url && key) {
    try {
      const res = await fetch(`${url}/functions/v1/card-image?id=${id}`, {
        headers: { Authorization: `Bearer ${key}` },
        next: { revalidate: 31536000 },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return new NextResponse(null, { status: 404 });
      return new NextResponse(await res.arrayBuffer(), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return new NextResponse(null, { status: 502 });
    }
  }
  return new NextResponse(null, { status: 503 });
}
