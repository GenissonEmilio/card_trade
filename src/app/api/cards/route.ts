import { NextRequest, NextResponse } from 'next/server';
import { featuredCards, localizedNames } from '@/lib/catalog';
const filters: Record<string, string> = {
  monster:
    'Normal Monster,Effect Monster,Fusion Monster,Synchro Monster,XYZ Monster,Link Monster,Ritual Effect Monster',
  spell: 'Spell Card',
  trap: 'Trap Card',
  fusion: 'Fusion Monster',
  synchro: 'Synchro Monster',
  xyz: 'XYZ Monster',
  link: 'Link Monster',
};
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const query = (p.get('q') || '').trim().slice(0, 100);
  const offset = Math.max(0, Math.min(Number(p.get('offset')) || 0, 20000));
  const type = p.get('type') || '';
  const url = new URL('https://db.ygoprodeck.com/api/v7/cardinfo.php');
  url.searchParams.set('num', '24');
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('sort', 'name');
  if (query) {
    const known = Object.entries(localizedNames).find(([, name]) =>
      name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
    );
    if (known) url.searchParams.set('id', known[0]);
    else url.searchParams.set('fname', query);
  }
  if (filters[type]) url.searchParams.set('type', filters[type]);
  if (
    p.get('attribute') &&
    ['DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE'].includes(p.get('attribute')!)
  )
    url.searchParams.set('attribute', p.get('attribute')!);
  try {
    const result = await fetch(url, {
      next: { revalidate: 86400 },
      headers: { 'User-Agent': 'Duelink/1.0 (community card catalog)' },
      signal: AbortSignal.timeout(15000),
    });
    if (result.status === 400) return NextResponse.json({ data: [], hasMore: false, total: 0 });
    if (!result.ok) throw new Error('Upstream unavailable');
    const body = await result.json();
    return NextResponse.json(
      {
        data: body.data || [],
        hasMore: Boolean(body.meta?.next_page),
        total: body.meta?.total_rows || body.data?.length || 0,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' } },
    );
  } catch {
    const data = featuredCards.filter(
      (c) =>
        (!query ||
          `${c.name} ${localizedNames[c.id] || ''}`.toLowerCase().includes(query.toLowerCase())) &&
        (!type ||
          (type === 'monster' ? !/spell|trap/i.test(c.type) : c.type.toLowerCase().includes(type))),
    );
    return NextResponse.json(
      { data, hasMore: false, total: data.length, fallback: true },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
}
