import { NextRequest, NextResponse } from 'next/server';
import { catalogAliases } from '@/lib/catalog-server';
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams,
    game = params.get('game');
  if (game !== 'yugioh' && game !== 'pokemon')
    return NextResponse.json({ error: 'Informe o jogo da consulta.' }, { status: 400 });
  const input = params.get('ids') || '';
  const ids = input ? input.split(',') : [];
  if (
    input.length > 8100 ||
    ids.length > 100 ||
    ids.some((id) => !/^[a-zA-Z0-9_.-]{1,80}$/.test(id))
  )
    return NextResponse.json(
      { error: 'Informe até 100 identificadores válidos.' },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      { game, aliases: catalogAliases(game, ids) },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'As traduções estão indisponíveis no momento.' },
      { status: 503 },
    );
  }
}
