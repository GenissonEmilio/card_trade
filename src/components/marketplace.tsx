'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Wallet,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { conditions } from '@/lib/utils';
import type { CollectionItem } from '@/types';
import type {
  MarketplaceConfig,
  MarketplaceListing,
  SellerPaymentAccount,
} from '@/types/marketplace';
import { useApp } from './providers';
import { Empty, Modal, PageTitle, Protected, Spinner } from './ui';
import {
  Gallery,
  ListingPhoto,
  MarketError,
  StatusBadge,
  availableQuantity,
  gameName,
  listingsWithAvailability,
  marketError,
  marketRequest,
  money,
  photoUrl,
  useMarketplaceConfig,
} from './marketplace-shared';
import styles from './marketplace.module.css';

type CartItem = { listing_id: string; quantity: number };
const cartKey = 'duelink.marketplace.cart.v1';

export function Marketplace() {
  const { game, setGame, user, loading: authLoading, toast } = useApp();
  const { config, error: configError, reload: reloadConfig } = useMarketplaceConfig();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [query, setQuery] = useState(''),
    [sort, setSort] = useState('recent'),
    [language, setLanguage] = useState(''),
    [condition, setCondition] = useState(''),
    [minPrice, setMinPrice] = useState(''),
    [maxPrice, setMaxPrice] = useState(''),
    [hasMore, setHasMore] = useState(false),
    [nextOffset, setNextOffset] = useState(0),
    [adding, setAdding] = useState(false);
  const requestIndex = useRef(0),
    addingRef = useRef(false);
  const [detail, setDetail] = useState<MarketplaceListing | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]),
    [cartLoaded, setCartLoaded] = useState(false),
    [showCart, setShowCart] = useState(false);
  const [addingError, setAddingError] = useState('');
  const load = useCallback(
    async (offset = 0, append = false) => {
      const current = ++requestIndex.current;
      setLoading(true);
      const params = new URLSearchParams({
        game,
        search: query.trim(),
        sort: sort === 'low' ? 'price_asc' : sort === 'high' ? 'price_desc' : 'recent',
        language,
        condition,
        offset: String(offset),
        limit: '24',
      });
      if (minPrice) params.set('min_price', String(Math.round(Number(minPrice) * 100)));
      if (maxPrice) params.set('max_price', String(Math.round(Number(maxPrice) * 100)));
      try {
        const result = await marketRequest<{
          listings: MarketplaceListing[];
          has_more: boolean;
          next_offset: number;
        }>(`/api/marketplace/listings?${params}`);
        const available = await listingsWithAvailability(result.listings);
        if (current !== requestIndex.current) return;
        setListings((old) =>
          append
            ? [
                ...old.filter((item) => !available.some((next) => next.id === item.id)),
                ...available,
              ]
            : available,
        );
        setHasMore(result.has_more);
        setNextOffset(result.next_offset);
        setError('');
      } catch (e) {
        if (current === requestIndex.current) setError(marketError(e));
      } finally {
        if (current === requestIndex.current) setLoading(false);
      }
    },
    [game, query, sort, language, condition, minPrice, maxPrice],
  );
  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => {
      clearTimeout(timer);
      requestIndex.current += 1;
    };
  }, [load]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(cartKey) || '[]');
      if (Array.isArray(saved))
        setCart(
          saved
            .filter(
              (i): i is CartItem =>
                typeof i?.listing_id === 'string' &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0 &&
                i.quantity <= 999,
            )
            .slice(0, 20),
        );
    } catch {
      /* An unreadable local cart starts empty. */
    }
    setCartLoaded(true);
  }, []);
  useEffect(() => {
    if (cartLoaded) {
      try {
        localStorage.setItem(cartKey, JSON.stringify(cart));
      } catch {
        /* The cart remains usable without local persistence. */
      }
    }
  }, [cart, cartLoaded]);
  const filtered = listings.filter((listing) => listing.game === game);
  async function addToCart(listing: MarketplaceListing, quantity: number) {
    if (addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    setAddingError('');
    try {
      const client = createClient();
      if (!client) throw new Error('O carrinho está indisponível.');
      if (cart.length && cart[0].listing_id !== listing.id) {
        const result = await client
          .from('marketplace_listings')
          .select('seller_id')
          .eq('id', cart[0].listing_id)
          .eq('status', 'active')
          .maybeSingle();
        if (result.error) throw result.error;
        if (!result.data)
          throw new Error(
            'Um anúncio do carrinho está indisponível. Abra o carrinho e confira os itens antes de continuar.',
          );
        if (result.data.seller_id !== listing.seller_id)
          throw new Error(
            'Seu carrinho já tem cartas de outro vendedor. Finalize a compra ou remova os itens antes de trocar de vendedor.',
          );
      }
      const existing = cart.find((c) => c.listing_id === listing.id);
      if (!existing && cart.length >= 20)
        throw new Error(
          'Você pode comprar até 20 anúncios em cada pedido. Finalize este carrinho antes de adicionar outros.',
        );
      if ((existing?.quantity || 0) + quantity > availableQuantity(listing))
        throw new Error('Esta quantidade ultrapassa o estoque disponível. Confira seu carrinho.');
      setCart((items) =>
        existing
          ? items.map((i) =>
              i.listing_id === listing.id ? { ...i, quantity: i.quantity + quantity } : i,
            )
          : [...items, { listing_id: listing.id, quantity }],
      );
      setDetail(null);
      toast('Carta adicionada ao carrinho.');
    } catch (e) {
      setAddingError(marketError(e));
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }
  return (
    <div className="page-content">
      <section className={styles.hero}>
        <div>
          <span className="eyebrow">DA COLEÇÃO PARA O SEU PRÓXIMO DECK</span>
          <h1>
            Encontre a carta.
            <br />
            <span className="gold-text">Conheça quem vende.</span>
          </h1>
          <p>
            Cartas de verdade, de colecionadores da comunidade. Confira o exemplar e combine a
            retirada em Lagarto.
          </p>
          <div className={styles.actions}>
            <Link className="button button-gold" href="/vender">
              <Plus size={16} /> Anunciar minhas cartas
            </Link>
            <button className="button" onClick={() => setShowCart(true)}>
              <ShoppingBag size={16} />
              Carrinho {cart.length > 0 && `(${cart.reduce((n, i) => n + i.quantity, 0)})`}
            </button>
          </div>
        </div>
        <div className={styles.heroMark} aria-hidden="true">
          <Store size={44} strokeWidth={1.2} />
        </div>
      </section>
      <MarketError message={configError || error} />
      {config && !config.enabled && (
        <div className={styles.notice}>
          <ShieldCheck size={18} />
          <span>
            As vendas estão em preparação. Você já pode organizar seus anúncios; o pagamento será
            liberado quando a operação e os recebimentos estiverem habilitados.
          </span>
        </div>
      )}
      <div className={styles.toolbar}>
        <label className={styles.search}>
          Buscar cartas à venda
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome da carta, edição ou vendedor"
            type="search"
          />
        </label>
        <label>
          Jogo
          <select value={game} onChange={(e) => setGame(e.target.value as 'yugioh' | 'pokemon')}>
            <option value="yugioh">Yu-Gi-Oh!</option>
            <option value="pokemon">Pokémon</option>
          </select>
        </label>
        <label>
          Idioma
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries({
              PT: 'Português',
              EN: 'Inglês',
              ES: 'Espanhol',
              JP: 'Japonês',
              DE: 'Alemão',
              FR: 'Francês',
              IT: 'Italiano',
              KR: 'Coreano',
              ZH: 'Chinês',
            }).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordenar
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Mais recentes</option>
            <option value="low">Menor preço</option>
            <option value="high">Maior preço</option>
          </select>
        </label>
        <label>
          Conservação
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">Todos os estados</option>
            {Object.entries(conditions).map(([value, label]) => (
              <option value={value} key={value}>
                {value} · {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preço mínimo (R$)
          <input
            type="number"
            min={0}
            max={100000}
            step="0.01"
            placeholder="0,00"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </label>
        <label>
          Preço máximo (R$)
          <input
            type="number"
            min={0}
            max={100000}
            step="0.01"
            placeholder="Sem limite"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </label>
        <span className={styles.count}>
          {filtered.length}
          {hasMore ? '+' : ''} anúncio{filtered.length === 1 ? '' : 's'}
        </span>
      </div>
      {loading && !listings.length ? (
        <Spinner />
      ) : !filtered.length ? (
        <Empty
          icon={ShoppingBag}
          title="Uma nova vitrine para a comunidade."
          description={
            query || language || condition || minPrice || maxPrice
              ? 'Nenhum anúncio corresponde a estes filtros. Tente outro nome ou idioma.'
              : `Ainda não há anúncios publicados de ${gameName(game)}. Seja uma das primeiras pessoas a anunciar suas cartas.`
          }
          href="/vender"
          label="Preparar meu anúncio"
        />
      ) : (
        <div className={styles.grid}>
          {filtered.map((listing) => (
            <article className={styles.listing} key={listing.id}>
              <div className={styles.cover}>
                <ListingPhoto listing={listing} />
                <span className={styles.game}>{gameName(listing.game)}</span>
              </div>
              <div className={styles.listingBody}>
                <h2>{listing.card_name}</h2>
                <p className={styles.meta}>
                  {listing.set_code || 'Edição informada pelo vendedor'}
                  <br />
                  {listing.condition} · {listing.language} · {listing.rarity}
                </p>
                <div className={styles.priceRow}>
                  <strong className={styles.price}>
                    {money(listing.price_cents)} <small>/ un.</small>
                  </strong>
                  <span className={styles.meta}>
                    {availableQuantity(listing)}{' '}
                    {availableQuantity(listing) === 1 ? 'disponível' : 'disponíveis'}
                  </span>
                </div>
                <span className={styles.seller}>
                  <Store size={13} />
                  {listing.seller?.display_name || 'Vendedor da comunidade'}
                </span>
                <button
                  className="button button-gold"
                  onClick={() => {
                    setAddingError('');
                    setDetail(listing);
                  }}
                >
                  Ver exemplar <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {loading && listings.length > 0 && (
        <p className={styles.hint} role="status">
          Atualizando anúncios…
        </p>
      )}
      {hasMore && filtered.length > 0 && (
        <div className={styles.actions}>
          <button className="button" disabled={loading} onClick={() => void load(nextOffset, true)}>
            {loading && <Loader2 className="spin" size={15} />}Carregar mais anúncios{' '}
            <ArrowRight size={14} />
          </button>
        </div>
      )}
      {detail && (
        <ListingDetail
          listing={detail}
          own={detail.seller_id === user?.id}
          error={addingError}
          onClose={() => setDetail(null)}
          onAdd={(q) => void addToCart(detail, q)}
          busy={adding}
          onCart={() => {
            setDetail(null);
            setShowCart(true);
          }}
        />
      )}
      {showCart && (
        <CartModal
          cart={cart}
          setCart={setCart}
          listings={listings}
          config={config}
          userReady={!authLoading && !!user}
          onClose={() => setShowCart(false)}
          onRefresh={() => {
            void load();
            void reloadConfig();
          }}
        />
      )}
    </div>
  );
}

function ListingDetail({
  listing,
  own,
  busy,
  error,
  onClose,
  onAdd,
  onCart,
}: {
  listing: MarketplaceListing;
  own: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onAdd: (quantity: number) => void;
  onCart: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  return (
    <Modal title="Conheça este exemplar" onClose={onClose} wide>
      <div className={styles.detail}>
        <Gallery listing={listing} />
        <div>
          <span className="eyebrow">{gameName(listing.game)}</span>
          <h2>{listing.card_name}</h2>
          <Link className={styles.seller} href={`/perfil/${listing.seller?.username || ''}`}>
            <Store size={14} />
            {listing.seller?.display_name || 'Vendedor da comunidade'}
          </Link>
          <dl className={styles.detailsList}>
            <div>
              <dt>Estado de conservação</dt>
              <dd>{listing.condition}</dd>
            </div>
            <div>
              <dt>Idioma físico</dt>
              <dd>{listing.language}</dd>
            </div>
            <div>
              <dt>Edição e raridade</dt>
              <dd>
                {listing.set_code || 'Não informada'} · {listing.rarity}
              </dd>
            </div>
            <div>
              <dt>Estoque disponível</dt>
              <dd>
                {availableQuantity(listing)} unidade{availableQuantity(listing) === 1 ? '' : 's'}
              </dd>
            </div>
          </dl>
          <p className={styles.description}>
            {listing.description ||
              'Confira as fotos do exemplar. Dúvidas sobre a oferta podem ser esclarecidas com o vendedor.'}
          </p>
          <strong className={styles.price}>
            {money(listing.price_cents)} <small>/ unidade</small>
          </strong>
          <p className={styles.hint}>
            <MapPin size={13} /> Retirada local combinada em Lagarto, SE. Confira as instruções
            antes do pagamento.
          </p>
          {own ? (
            <Link className="button" href="/vender">
              Gerenciar meu anúncio
            </Link>
          ) : (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                onAdd(quantity);
              }}
            >
              <label>
                Quantidade
                <input
                  type="number"
                  min={1}
                  max={availableQuantity(listing)}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </label>
              <MarketError message={error} />
              <button
                className="button button-gold"
                disabled={
                  busy ||
                  !Number.isInteger(quantity) ||
                  quantity < 1 ||
                  quantity > availableQuantity(listing)
                }
              >
                <ShoppingBag size={16} /> Adicionar ao carrinho
              </button>
              {error && (
                <button type="button" className="text-link" onClick={onCart}>
                  Abrir carrinho atual <ArrowRight size={14} />
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CartModal({
  cart,
  setCart,
  listings,
  config,
  userReady,
  onClose,
  onRefresh,
}: {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  listings: MarketplaceListing[];
  config: MarketplaceConfig | null;
  userReady: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [fresh, setFresh] = useState<MarketplaceListing[]>(listings),
    [loading, setLoading] = useState(true),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [orderId, setOrderId] = useState<string | null>(null),
    [refreshIndex, setRefreshIndex] = useState(0);
  const ids = cart
    .map((i) => i.listing_id)
    .sort()
    .join(',');
  useEffect(() => {
    let alive = true;
    async function reload() {
      const client = createClient();
      if (!client || !ids) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await client
        .from('marketplace_listings')
        .select('*,seller:profiles!marketplace_listings_seller_id_fkey(*)')
        .in('id', ids.split(','))
        .eq('status', 'active');
      if (!alive) return;
      if (error) setError(marketError(error));
      else {
        try {
          const available = await listingsWithAvailability((data || []) as MarketplaceListing[]);
          if (alive) setFresh(available);
        } catch (e) {
          if (alive) setError(marketError(e));
        }
      }
      if (alive) setLoading(false);
    }
    void reload();
    return () => {
      alive = false;
    };
  }, [ids, refreshIndex]);
  useEffect(() => {
    setAccepted(false);
  }, [config?.terms_version, config?.commission_bps, config?.pickup_instructions]);
  const rows = cart.map((i) => ({ ...i, listing: fresh.find((l) => l.id === i.listing_id) }));
  const total = rows.reduce((n, i) => n + (i.listing?.price_cents || 0) * i.quantity, 0);
  const invalid =
    rows.some((i) => !i.listing || i.quantity > availableQuantity(i.listing)) ||
    new Set(rows.map((i) => i.listing?.seller_id)).size > 1;
  useEffect(() => {
    setAccepted(false);
  }, [total]);
  async function checkout() {
    setError('');
    setBusy(true);
    try {
      let id = orderId;
      if (!id) {
        const client = createClient();
        if (!client || !config) throw new Error('Serviço de pagamento indisponível.');
        const result = await client.rpc('reserve_marketplace_order', {
          p_items: cart,
          p_terms_version: config.terms_version,
        });
        if (result.error) throw result.error;
        id = String(result.data);
        setOrderId(id);
        setCart([]);
        onRefresh();
      }
      const result = await marketRequest<{ url: string }>('/api/marketplace/checkout', {
        orderId: id,
      });
      const url = new URL(result.url);
      if (url.protocol !== 'https:')
        throw new Error('Não foi possível abrir o pagamento com segurança.');
      window.location.assign(url.href);
    } catch (e) {
      setError(marketError(e));
      setRefreshIndex((n) => n + 1);
      onRefresh();
      setBusy(false);
    }
  }
  return (
    <Modal
      title={orderId ? 'Seu pedido foi reservado' : 'Revise sua compra'}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <MarketError message={error} />
      {orderId ? (
        <>
          <div className={styles.notice}>
            <Package size={18} />
            <span>
              A reserva foi criada. Se o pagamento não abriu, tente novamente pelo mesmo pedido para
              evitar duplicidade. A disponibilidade depende do prazo indicado no pedido.
            </span>
          </div>
          <div className={styles.actions}>
            <Link href={`/pedidos/${orderId}`} className="button">
              Ver pedido
            </Link>
            <button className="button button-gold" disabled={busy} onClick={() => void checkout()}>
              {busy && <Loader2 className="spin" size={15} />}Abrir pagamento seguro{' '}
              <ExternalLink size={15} />
            </button>
          </div>
        </>
      ) : loading ? (
        <Spinner />
      ) : !cart.length ? (
        <Empty
          icon={ShoppingBag}
          title="Seu carrinho está esperando novas cartas."
          description="Explore os anúncios e adicione exemplares do mesmo vendedor para pagar juntos."
          onClick={onClose}
          label="Continuar explorando"
        />
      ) : (
        <>
          <div className={styles.rows}>
            {rows.map(({ listing_id, quantity, listing }) => (
              <div className={styles.row} key={listing_id}>
                {listing && <ListingPhoto className={styles.rowPhoto} listing={listing} />}
                <div className={styles.rowBody}>
                  <h3>{listing?.card_name || 'Anúncio indisponível'}</h3>
                  <p>
                    {listing
                      ? `${listing.condition} · ${listing.language} · ${money(listing.price_cents)} por unidade`
                      : 'Remova este item para continuar.'}
                  </p>
                  {listing && (
                    <label className={styles.hint}>
                      Quantidade{' '}
                      <input
                        aria-label={`Quantidade de ${listing.card_name}`}
                        type="number"
                        min={1}
                        max={availableQuantity(listing)}
                        value={quantity}
                        onChange={(e) =>
                          setCart((items) =>
                            items.map((i) =>
                              i.listing_id === listing_id
                                ? { ...i, quantity: Math.max(1, Number(e.target.value)) }
                                : i,
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                  {listing && quantity > availableQuantity(listing) && (
                    <p className={styles.reason}>
                      Estoque alterado. Escolha até {availableQuantity(listing)} unidade
                      {availableQuantity(listing) === 1 ? '' : 's'}.
                    </p>
                  )}
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remover ${listing?.card_name || 'anúncio'} do carrinho`}
                  onClick={() =>
                    setCart((items) => items.filter((i) => i.listing_id !== listing_id))
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          {invalid && (
            <MarketError message="Confira os itens indisponíveis e as quantidades. Cada pedido deve conter cartas de um único vendedor." />
          )}
          <div className={styles.summary}>
            <div>
              <span>Cartas</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Entrega</span>
              <strong>Retirada local · sem frete</strong>
            </div>
            <div>
              <span>Total a pagar</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
          <div className={styles.notice}>
            <MapPin size={17} />
            <span>
              {config?.pickup_instructions ||
                'As instruções de retirada serão disponibilizadas pela operação antes de liberar o pagamento.'}
            </span>
          </div>
          <p className={styles.hint}>
            O estoque é reservado ao iniciar o pagamento. Pagamento, entrega e eventuais devoluções
            seguem as condições da oferta e os direitos aplicáveis. Pix ou cartão são concluídos na
            página do Mercado Pago; a disponibilidade de cada método depende da conta e da análise
            do provedor.
          </p>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              Conferi os exemplares, valores e retirada e aceito os{' '}
              <Link href="/termos-marketplace" target="_blank">
                termos do marketplace
              </Link>
              {config?.terms_version ? ` (${config.terms_version})` : ''}.
            </span>
          </label>
          <p className={styles.hint}>
            Vendedor: {rows[0]?.listing?.seller?.display_name || 'identificado no anúncio'}.
          </p>
          {!userReady ? (
            <Link className="button button-gold" href="/login?next=%2Fmercado">
              Entrar para comprar <ArrowRight size={15} />
            </Link>
          ) : (
            <button
              className="button button-gold"
              disabled={
                busy ||
                !accepted ||
                invalid ||
                !config?.enabled ||
                !config.payments_ready ||
                !config.terms_version
              }
              onClick={() => void checkout()}
            >
              {busy ? <Loader2 className="spin" size={16} /> : <CreditCard size={16} />}{' '}
              {busy ? 'Preparando seu pedido…' : 'Ir para o pagamento seguro'}
            </button>
          )}
          {(!config?.enabled || !config.payments_ready) && (
            <p className={styles.hint}>
              O pagamento ainda não está habilitado pela operação. Nenhum valor será cobrado aqui.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

export function SellerMarketplace() {
  return (
    <div className="page-content">
      <Protected>
        <SellerContent />
      </Protected>
    </div>
  );
}

function SellerContent() {
  const { user, game, toast } = useApp();
  const { config, error: configError } = useMarketplaceConfig();
  const [connectionNotice, setConnectionNotice] = useState(''),
    [connectionError, setConnectionError] = useState('');
  const [listings, setListings] = useState<MarketplaceListing[]>([]),
    [items, setItems] = useState<CollectionItem[]>([]),
    [account, setAccount] = useState<SellerPaymentAccount | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('all'),
    [editor, setEditor] = useState<MarketplaceListing | 'new' | null>(null),
    [consent, setConsent] = useState(false),
    [busyId, setBusyId] = useState('');
  const load = useCallback(async () => {
    const client = createClient();
    if (!client || !user) return;
    setLoading(true);
    const result = await Promise.all([
      client
        .from('marketplace_listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),
      client
        .from('collection_items')
        .select('*')
        .eq('user_id', user.id)
        .gt('quantity', 0)
        .order('card_name'),
      client.from('seller_payment_accounts').select('*').eq('seller_id', user.id).maybeSingle(),
    ]);
    setLoading(false);
    const failure = result.find((i) => i.error)?.error;
    if (failure) setError(marketError(failure));
    else {
      setError('');
      setListings((result[0].data || []) as MarketplaceListing[]);
      setItems((result[1].data || []) as CollectionItem[]);
      setAccount(result[2].data as SellerPaymentAccount | null);
    }
  }, [user]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('conexao') === 'sucesso')
      setConnectionNotice(
        'Sua conta Mercado Pago foi conectada. Confira a situação dos recebimentos abaixo.',
      );
    if (params.get('conexao') === 'erro') {
      const reasons: Record<string, string> = {
        configuracao:
          'A conexão com o Mercado Pago ainda não foi configurada pela operação. Você pode continuar preparando seus anúncios.',
        login: 'Entre novamente na sua conta Duelink e inicie a conexão pelo painel de vendas.',
        autorizacao:
          'A autorização não foi concluída ou expirou. Tente conectar sua conta novamente pelo painel abaixo.',
        indisponivel: 'Não foi possível conectar sua conta agora. Tente novamente em instantes.',
      };
      setConnectionError(reasons[params.get('motivo') || ''] || reasons.indisponivel);
    }
  }, []);
  async function status(listing: MarketplaceListing, next: 'paused' | 'pending') {
    const client = createClient();
    if (!client) return;
    setBusyId(listing.id);
    setError('');
    const result = await client.rpc('seller_set_listing_status', {
      p_listing_id: listing.id,
      p_status: next,
    });
    setBusyId('');
    if (result.error) setError(marketError(result.error));
    else {
      toast(next === 'paused' ? 'Anúncio pausado.' : 'Anúncio enviado para revisão.');
      void load();
    }
  }
  const rows = listings.filter((l) => l.game === game && (filter === 'all' || l.status === filter));
  return (
    <>
      <PageTitle
        eyebrow="DÊ UM NOVO DESTINO À SUA COLEÇÃO"
        title="Suas cartas. Sua vitrine."
        description="Prepare anúncios reais, acompanhe a revisão e gerencie suas vendas com retirada em Lagarto."
      >
        <button className="button button-gold" onClick={() => setEditor('new')}>
          <Plus size={16} /> Criar anúncio
        </button>
      </PageTitle>
      <MarketError message={error || configError} />
      <MarketError message={connectionError} />
      {connectionNotice && (
        <div className={styles.notice} role="status">
          <Check size={17} />
          <span>{connectionNotice}</span>
        </div>
      )}
      <section className={styles.connection}>
        <Wallet size={27} />
        <div className={styles.connectionBody}>
          <h2>{account?.connected ? 'Mercado Pago conectado' : 'Prepare seus recebimentos'}</h2>
          <p>
            {account?.connected
              ? 'Sua conta foi conectada. A disponibilidade de pagamentos, valores e prazos de recebimento segue as condições do Mercado Pago e a habilitação da operação.'
              : 'Conecte sua própria conta Mercado Pago para vender. A identificação e a habilitação financeira são feitas pelo provedor; não solicitamos senha nem documentos bancários neste formulário.'}
          </p>
          {!account?.connected && (
            <>
              <label className={`${styles.check} ${styles.hint}`}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Li os{' '}
                  <Link href="/termos-marketplace" target="_blank">
                    termos de venda e intermediação
                  </Link>{' '}
                  e quero conectar minha conta.
                </span>
              </label>
              <div className={styles.actions}>
                <button
                  className="button button-gold"
                  disabled={!consent || !config?.payments_ready}
                  onClick={() => window.location.assign('/api/marketplace/connect')}
                >
                  Conectar Mercado Pago <ExternalLink size={14} />
                </button>
              </div>
              {!config?.payments_ready && (
                <p className={styles.hint}>
                  A conexão será liberada quando o provedor estiver configurado. Você já pode
                  preparar rascunhos.
                </p>
              )}
            </>
          )}
          <div className={styles.actions}>
            <Link className="text-link" href="/pedidos">
              Acompanhar minhas vendas <ArrowRight size={14} />
            </Link>
            {account?.connected && (
              <button
                className="text-link"
                onClick={() => window.location.assign('/api/marketplace/connect')}
              >
                Atualizar conexão <ExternalLink size={13} />
              </button>
            )}
          </div>
        </div>
      </section>
      {config?.commission_bps !== null && config?.commission_bps !== undefined ? (
        <p className={styles.notice}>
          <ShieldCheck size={17} />
          <span>
            Comissão da operadora: {(config.commission_bps / 100).toLocaleString('pt-BR')}% sobre o
            valor das cartas. As taxas do provedor são tratadas conforme os termos e podem reduzir o
            recebimento líquido. O resumo do anúncio mostra uma estimativa antes dessas taxas.
          </span>
        </p>
      ) : (
        <p className={styles.notice}>
          <ShieldCheck size={17} />
          <span>
            A comissão da operação ainda será definida. Você pode salvar rascunhos; as condições
            precisam estar disponíveis para publicar e vender.
          </span>
        </p>
      )}
      <div className={styles.toolbar}>
        <label>
          Situação
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todos os anúncios</option>
            <option value="draft">Rascunhos</option>
            <option value="pending">Em análise</option>
            <option value="active">Publicados</option>
            <option value="rejected">Revisão necessária</option>
            <option value="paused">Pausados</option>
            <option value="sold">Esgotados</option>
          </select>
        </label>
        <span className={styles.count}>
          {gameName(game)} · {rows.length} anúncio{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      {loading ? (
        <Spinner />
      ) : !rows.length ? (
        <Empty
          icon={Store}
          title="Sua primeira carta à venda começa aqui."
          description={`Selecione uma carta de ${gameName(game)} da sua coleção, fotografe o exemplar e prepare seu anúncio.`}
          onClick={() => setEditor('new')}
          label="Criar anúncio"
        />
      ) : (
        <div className={styles.rows}>
          {rows.map((listing) => (
            <article className={styles.row} key={listing.id}>
              <ListingPhoto className={styles.rowPhoto} listing={listing} />
              <div className={styles.rowBody}>
                <h2>{listing.card_name}</h2>
                <p>
                  {listing.set_code || 'Edição não informada'} · {listing.condition} ·{' '}
                  {listing.language}
                  <br />
                  {listing.quantity} unidade{listing.quantity === 1 ? '' : 's'} ·{' '}
                  {money(listing.price_cents)} cada
                </p>
                {listing.rejection_reason && (
                  <p className={styles.reason}>Revisão: {listing.rejection_reason}</p>
                )}
                <div className={styles.actions}>
                  {listing.status !== 'sold' && (
                    <button className="button" onClick={() => setEditor(listing)}>
                      Editar anúncio
                    </button>
                  )}
                  {listing.status === 'active' && (
                    <button
                      className="button"
                      disabled={busyId === listing.id}
                      onClick={() => void status(listing, 'paused')}
                    >
                      Pausar
                    </button>
                  )}
                  {['paused', 'rejected'].includes(listing.status) && (
                    <button
                      className="button"
                      disabled={busyId === listing.id}
                      onClick={() => void status(listing, 'pending')}
                    >
                      {busyId === listing.id ? 'Enviando…' : 'Enviar para análise'}
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.rowAside}>
                <StatusBadge status={listing.status} />
              </div>
            </article>
          ))}
        </div>
      )}
      {editor && (
        <ListingEditor
          key={editor === 'new' ? 'new' : editor.id}
          listing={editor === 'new' ? undefined : editor}
          items={items.filter((i) => (i.game || 'yugioh') === game)}
          config={config}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function ListingEditor({
  listing,
  items,
  config,
  onClose,
  onSaved,
}: {
  listing?: MarketplaceListing;
  items: CollectionItem[];
  config: MarketplaceConfig | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user, toast } = useApp();
  const [itemId, setItemId] = useState(listing?.collection_item_id || ''),
    [price, setPrice] = useState(
      listing ? (listing.price_cents / 100).toFixed(2).replace('.', ',') : '',
    ),
    [quantity, setQuantity] = useState(listing?.quantity || 1),
    [description, setDescription] = useState(listing?.description || ''),
    [photos, setPhotos] = useState<string[]>(listing?.photos || []),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  const item = items.find((i) => i.id === itemId);
  const parsed = Number(price.replace(',', '.'));
  const cents =
    /^\d+(?:[,.]\d{1,2})?$/.test(price) && Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  const fee =
    config?.commission_bps == null ? null : Math.round((cents * config.commission_bps) / 10000);
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    const client = createClient();
    if (!client || !user || !files.length) return;
    setError('');
    if (files.length + photos.length > 6) {
      setError('Envie até seis fotos por anúncio.');
      return;
    }
    if (
      files.some(
        (f) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024,
      )
    ) {
      setError('Use fotos JPG, PNG ou WebP de até 5 MB cada.');
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[
          file.type
        ];
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const result = await client.storage
          .from('marketplace-photos')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (result.error) throw result.error;
        setPhotos((previous) => [...previous, path]);
      }
    } catch (e) {
      setError(marketError(e));
    } finally {
      setUploading(false);
    }
  }
  async function save(submit: boolean) {
    const client = createClient();
    if (!client || !user) return;
    setError('');
    if (
      !item ||
      cents < 100 ||
      cents > 10000000 ||
      busy ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > item.quantity
    ) {
      setError(
        'Selecione uma carta, informe um preço válido e confira a quantidade da sua coleção.',
      );
      return;
    }
    if (photos.length < 1 || (submit && photos.length < 2)) {
      setError('Envie ao menos uma foto da frente e uma do verso do exemplar.');
      return;
    }
    if (!accepted || !config?.terms_version || (submit && config.commission_bps == null)) {
      setError('Confira os termos e a comissão antes de enviar para análise.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Descreva o estado e os detalhes do exemplar em pelo menos 10 caracteres.');
      return;
    }
    setBusy(true);
    const result = await client.rpc('submit_marketplace_listing', {
      p_collection_item_id: itemId,
      p_quantity: quantity,
      p_price_cents: cents,
      p_description: description.trim(),
      p_photos: photos,
      p_listing_id: listing?.id || null,
      p_submit: submit,
      p_terms_version: config.terms_version,
    });
    setBusy(false);
    if (result.error) setError(marketError(result.error));
    else {
      toast(submit ? 'Anúncio enviado para análise.' : 'Rascunho salvo.');
      onSaved();
    }
  }
  return (
    <Modal
      title={listing ? 'Editar anúncio' : 'Um novo exemplar na vitrine'}
      onClose={() => {
        if (!busy && !uploading) onClose();
      }}
      wide
    >
      {!items.length ? (
        <Empty
          icon={Package}
          title="Primeiro, adicione o exemplar à coleção."
          description="O anúncio usa o mesmo estoque das trocas. Assim sua carta não é comprometida em duas operações."
          href="/colecao?adicionar=1"
          label="Adicionar carta à coleção"
        />
      ) : (
        <>
          <div className={styles.steps} aria-label="Etapas do anúncio">
            <span>
              <b>1</b>Exemplar da coleção
            </span>
            <span>
              <b>2</b>Fotos e condição
            </span>
            <span>
              <b>3</b>Preço e revisão
            </span>
          </div>
          <MarketError message={error} />
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void save(true);
            }}
          >
            <label>
              Carta da sua coleção
              <select
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                disabled={busy || uploading || !!listing}
              >
                <option value="">Selecione o exemplar</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.card_name} · {i.set_code || 'sem código'} · {i.condition} · {i.language} ·{' '}
                    {i.quantity} un.
                  </option>
                ))}
              </select>
            </label>
            {item && (
              <p className={styles.notice}>
                <Package size={17} />
                <span>
                  {item.condition} · {item.language} · {item.rarity || 'Raridade não informada'} ·{' '}
                  {item.set_code || 'Edição não informada'}. Para corrigir estes dados, edite o
                  exemplar na coleção antes de anunciar. Nenhuma unidade extra é criada pelo
                  anúncio.
                </span>
              </p>
            )}
            <div className="form-row">
              <label>
                Preço por unidade (R$)
                <input
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="De 1,00 a 100.000,00"
                  maxLength={10}
                  pattern="[0-9]+([,.][0-9]{1,2})?"
                  disabled={busy}
                />
              </label>
              <label>
                Quantidade anunciada
                <input
                  required
                  type="number"
                  min={1}
                  max={item?.quantity || 999}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  disabled={busy}
                />
              </label>
            </div>
            <label>
              Descrição e detalhes do estado
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                placeholder="Descreva marcas, riscos, desgaste e qualquer detalhe importante do exemplar."
                disabled={busy}
              />
            </label>
            <div className={styles.photoInput}>
              <label>
                <span>
                  <Camera size={16} /> Fotografias próprias do exemplar
                </span>
                <span className={styles.hint}>
                  Primeiro a frente, depois o verso; acrescente detalhes de eventuais defeitos. Até
                  seis imagens JPG, PNG ou WebP de 5 MB. Evite documentos, rostos e dados pessoais
                  nas fotos.
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy || uploading || photos.length >= 6}
                  onChange={(e) => void upload(e)}
                />
              </label>
              {uploading && (
                <p className={styles.hint} role="status">
                  Enviando fotografias…
                </p>
              )}
              <div className={styles.photoGrid}>
                {photos.map((path, i) => (
                  <div className={styles.photoPreview} key={path}>
                    <img src={photoUrl(path)} alt={`Foto ${i + 1} do exemplar`} />
                    <span>{i === 0 ? 'Frente / capa' : i === 1 ? 'Verso' : 'Detalhe'}</span>
                    <button
                      type="button"
                      disabled={busy || uploading}
                      onClick={() => setPhotos((old) => old.filter((p) => p !== path))}
                    >
                      Remover foto {i + 1}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.summary}>
              <div>
                <span>Preço por unidade</span>
                <strong>{money(cents)}</strong>
              </div>
              <div>
                <span>
                  Comissão da operadora
                  {config?.commission_bps != null
                    ? ` (${(config.commission_bps / 100).toLocaleString('pt-BR')}%)`
                    : ''}
                </span>
                <strong>{fee == null ? 'Ainda não definida' : money(fee)}</strong>
              </div>
              <div>
                <span>Estimativa antes das taxas do Mercado Pago</span>
                <strong>{fee == null ? 'A definir' : money(cents - fee)}</strong>
              </div>
            </div>
            <p className={styles.hint}>
              Retirada local marcada em Lagarto. O comprador verá as instruções da operação antes de
              pagar. Editar um anúncio publicado o encaminha novamente para revisão.
            </p>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={busy}
              />
              <span>
                As fotos e os dados correspondem ao exemplar que possuo. Aceito os{' '}
                <Link href="/termos-marketplace" target="_blank">
                  termos do marketplace
                </Link>{' '}
                e as condições apresentadas
                {config?.terms_version ? ` (${config.terms_version})` : ''}.
              </span>
            </label>
            <div className={styles.actions}>
              <button
                type="button"
                className="button"
                disabled={busy || uploading || !accepted || !config?.terms_version}
                onClick={() => void save(false)}
              >
                Salvar rascunho
              </button>
              <button
                className="button button-gold"
                disabled={
                  busy ||
                  uploading ||
                  !accepted ||
                  photos.length < 2 ||
                  config?.commission_bps == null ||
                  !config?.terms_version
                }
              >
                {busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />}Enviar para
                análise
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
