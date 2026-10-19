'use client';
import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MarketplaceConfig, MarketplaceListing } from '@/types/marketplace';
import styles from './marketplace.module.css';

export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const gameName = (game: string) => (game === 'pokemon' ? 'Pokémon' : 'Yu-Gi-Oh!');
export const marketDate = (date: string) =>
  new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza',
  });
export function marketError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : '';
  if (/Failed to fetch|NetworkError|fetch failed/i.test(message))
    return 'Não foi possível conectar. Verifique sua conexão e tente novamente.';
  if (
    /[áàãéêíóôõúç]/i.test(message) &&
    !/constraint|schema|column|syntax|violates|relation|function|permission/i.test(message)
  )
    return message;
  return 'Não foi possível concluir esta ação. Tente novamente em instantes.';
}
export async function marketRequest<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Serviço indisponível. Tente novamente.');
  return result as T;
}
export function useMarketplaceConfig() {
  const [config, setConfig] = useState<MarketplaceConfig | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      setConfig(await marketRequest<MarketplaceConfig>('/api/marketplace/config'));
      setError('');
    } catch (e) {
      setError(marketError(e));
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { config, error, reload };
}
export function MarketError({ message }: { message: string }) {
  return message ? (
    <p className={`${styles.notice} ${styles.error}`} role="alert">
      <CircleAlert size={17} />
      <span>{message}</span>
    </p>
  ) : null;
}
export function photoUrl(path: string) {
  return createClient()?.storage.from('marketplace-photos').getPublicUrl(path).data.publicUrl || '';
}
export function listingImage(listing: MarketplaceListing) {
  if (listing.photos?.[0]) return photoUrl(listing.photos[0]);
  if (listing.image_url) return listing.image_url;
  return listing.game === 'yugioh' ? `/api/card-image/${listing.card_id}` : '';
}
export type AvailableListing = MarketplaceListing & { available_quantity: number };
export async function listingsWithAvailability(
  listings: MarketplaceListing[],
): Promise<AvailableListing[]> {
  const client = createClient();
  if (!client || !listings.length) return [];
  const quantities = new Map<string, number>();
  const chunks: MarketplaceListing[][] = [];
  for (let offset = 0; offset < listings.length; offset += 100)
    chunks.push(listings.slice(offset, offset + 100));
  const results = await Promise.all(
    chunks.map((chunk) =>
      client.rpc('marketplace_available_quantities', { p_listing_ids: chunk.map((l) => l.id) }),
    ),
  );
  for (const result of results) {
    if (result.error) throw result.error;
    for (const row of (result.data || []) as { listing_id: string; available_quantity: number }[])
      quantities.set(row.listing_id, row.available_quantity);
  }
  return listings.map((listing) => ({
    ...listing,
    available_quantity: quantities.get(listing.id) ?? 0,
  }));
}
export function availableQuantity(listing: MarketplaceListing) {
  return (listing as Partial<AvailableListing>).available_quantity ?? listing.quantity;
}
export function ListingPhoto({
  listing,
  className,
}: {
  listing: MarketplaceListing;
  className?: string;
}) {
  const src = listingImage(listing);
  return src ? (
    <img className={className} src={src} alt={listing.card_name} loading="lazy" />
  ) : (
    <ImageIcon size={30} aria-label="Foto indisponível" />
  );
}
const statuses: Record<string, string> = {
  draft: 'Rascunho',
  pending: 'Em análise',
  active: 'Publicado',
  rejected: 'Revisão necessária',
  paused: 'Pausado',
  sold: 'Esgotado',
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  ready: 'Pronto para retirada',
  completed: 'Retirado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
  refunded: 'Reembolsado',
  disputed: 'Em atendimento',
  payment_review: 'Pagamento em análise',
};
export function StatusBadge({ status }: { status: string }) {
  const kind = ['active', 'paid', 'completed'].includes(status)
    ? styles.positive
    : ['rejected', 'cancelled', 'refunded', 'expired'].includes(status)
      ? styles.negative
      : styles.gold;
  return <span className={`${styles.badge} ${kind}`}>{statuses[status] || status}</span>;
}
export function Gallery({ listing }: { listing: MarketplaceListing }) {
  const [selected, setSelected] = useState(0);
  const photos = listing.photos?.length
    ? listing.photos.map(photoUrl)
    : [listingImage(listing)].filter(Boolean);
  return (
    <div>
      {photos.length ? (
        <img
          className={styles.galleryMain}
          src={photos[selected] || photos[0]}
          alt={`Foto ${selected + 1} de ${listing.card_name}`}
        />
      ) : (
        <div className={styles.galleryMain}>
          <ImageIcon aria-label="Foto indisponível" />
        </div>
      )}
      {photos.length > 1 && (
        <div className={styles.thumbs}>
          {photos.map((src, i) => (
            <button
              type="button"
              key={src}
              onClick={() => setSelected(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={selected === i}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
      <p className={styles.hint}>
        {listing.photos?.length
          ? 'Fotos do exemplar enviadas pelo vendedor.'
          : 'Imagem de referência do catálogo.'}
      </p>
    </div>
  );
}
