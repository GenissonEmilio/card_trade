import { NextRequest, NextResponse } from 'next/server';
import { getCatalogCard, searchCatalog } from '@/lib/catalog-server';
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const game = p.get('game') === 'pokemon' ? 'pokemon' : 'yugioh';
  const id = p.get('id');
  if (id) {
    if (!/^[a-zA-Z0-9.-]{1,80}$/.test(id))
      return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
    const card = await getCatalogCard(game, id);
    return card
      ? NextResponse.json(
          { data: [card] },
          { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' } },
        )
      : NextResponse.json({ error: 'Carta não encontrada.' }, { status: 404 });
  }
  const offset = Math.max(0, Math.min(Number(p.get('offset')) || 0, 100000));
  try {
    return NextResponse.json(
      searchCatalog({
        game,
        query: (p.get('q') || '').trim().slice(0, 100),
        offset,
        type: p.get('type') || '',
        attribute: p.get('attribute') || '',
        sort: p.get('sort') || 'name',
      }),
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'O catálogo está indisponível. Tente novamente em instantes.' },
      { status: 503 },
    );
  }
}
