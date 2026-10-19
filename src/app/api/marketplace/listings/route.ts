import { createClient } from '@/lib/supabase/server';
import { matchingCatalogIds } from '@/lib/catalog-server';
import { PaymentError } from '@/lib/payments/core';
import { failure } from '@/lib/payments/server';
import type { MarketplaceListing } from '@/types/marketplace';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const game = params.get('game') || 'yugioh';
    if (game !== 'yugioh' && game !== 'pokemon') throw new PaymentError('Jogo inválido.');
    const query = (params.get('search') || '')
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
    if (query.length > 100) throw new PaymentError('Use até 100 caracteres na busca.');
    const number = (name: string, fallback: number | null) => {
      const value = params.get(name);
      if (value === null || value === '') return fallback;
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 0)
        throw new PaymentError('Filtro numérico inválido.');
      return parsed;
    };
    const limit = Math.min(number('limit', 24)!, 60),
      offset = number('offset', 0)!;
    if (limit < 1 || offset > 10000) throw new PaymentError('Página inválida.');
    const sort = params.get('sort') || 'recent';
    if (!['recent', 'price_asc', 'price_desc'].includes(sort))
      throw new PaymentError('Ordenação inválida.');
    const client = await createClient();
    if (!client) throw new PaymentError('O catálogo está temporariamente indisponível.', 503);
    const result = await client.rpc('search_marketplace_listings', {
      p_game: game,
      p_query: query,
      p_card_ids: query ? matchingCatalogIds(game, query) : [],
      p_sort: sort,
      p_min_price: number('min_price', null),
      p_max_price: number('max_price', null),
      p_condition: params.get('condition') || null,
      p_language: params.get('language') || null,
      p_offset: offset,
      p_limit: limit + 1,
    });
    if (result.error)
      throw new PaymentError('Não foi possível consultar os anúncios. Tente novamente.', 503);
    const rows = (result.data || []) as MarketplaceListing[];
    return Response.json(
      {
        listings: rows.slice(0, limit),
        has_more: rows.length > limit,
        next_offset: offset + limit,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}
