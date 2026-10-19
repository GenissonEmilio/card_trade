import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import path from 'node:path';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,10}$/.test(id)) return new NextResponse(null, { status: 400 });
  if (existsSync(path.join(process.cwd(), 'public', 'cards', `${id}.jpg`)))
    return NextResponse.redirect(new URL(`/cards/${id}.jpg`, _request.url));
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
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
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
