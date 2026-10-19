'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, ClipboardCheck, Loader2, ShieldCheck, Store, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MarketplaceListing, MarketplaceOrder } from '@/types/marketplace';
import { useApp } from './providers';
import { Empty, Modal, PageTitle, Protected, Spinner } from './ui';
import {
  Gallery,
  ListingPhoto,
  MarketError,
  StatusBadge,
  gameName,
  marketDate,
  marketError,
  money,
  useMarketplaceConfig,
} from './marketplace-shared';
import { OrderRow } from './marketplace-orders';
import styles from './marketplace.module.css';

export function MarketplaceModeration() {
  return (
    <div className="page-content">
      <Protected>
        <AdminContent />
      </Protected>
    </div>
  );
}
function AdminContent() {
  const { isAdmin, toast } = useApp();
  const { config, error: configError } = useMarketplaceConfig();
  const [tab, setTab] = useState('listings'),
    [status, setStatus] = useState('pending'),
    [orderStatus, setOrderStatus] = useState('all'),
    [game, setGame] = useState('all');
  const [listings, setListings] = useState<MarketplaceListing[]>([]),
    [orders, setOrders] = useState<MarketplaceOrder[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [detail, setDetail] = useState<MarketplaceListing | null>(null);
  const load = useCallback(async () => {
    const client = createClient();
    if (!client || !isAdmin) return;
    setLoading(true);
    const result = await Promise.all([
      client
        .from('marketplace_listings')
        .select('*,seller:profiles!marketplace_listings_seller_id_fkey(*)')
        .order('created_at', { ascending: false }),
      client
        .from('marketplace_orders')
        .select(
          '*,buyer:profiles!marketplace_orders_buyer_id_fkey(*),seller:profiles!marketplace_orders_seller_id_fkey(*)',
        )
        .order('created_at', { ascending: false }),
    ]);
    setLoading(false);
    const failure = result.find((i) => i.error)?.error;
    if (failure) setError(marketError(failure));
    else {
      setError('');
      setListings((result[0].data || []) as MarketplaceListing[]);
      setOrders((result[1].data || []) as MarketplaceOrder[]);
    }
  }, [isAdmin]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!isAdmin)
    return (
      <Empty
        icon={ShieldCheck}
        title="Acesso reservado à operação."
        description="Este painel está disponível apenas para administradores autorizados."
        href="/mercado"
        label="Voltar ao marketplace"
      />
    );
  const pending = listings.filter((l) => l.status === 'pending').length;
  const confirmed = orders.filter((o) =>
    ['paid', 'ready', 'completed', 'disputed', 'refunded'].includes(o.status),
  );
  const rows = listings.filter(
    (l) => (status === 'all' || l.status === status) && (game === 'all' || l.game === game),
  );
  const orderRows = orders.filter((o) => orderStatus === 'all' || o.status === orderStatus);
  return (
    <>
      <PageTitle
        eyebrow="OPERAÇÃO DO MARKETPLACE"
        title="Uma vitrine bem cuidada."
        description="Confira os exemplares, acompanhe os pedidos e mantenha as condições da oferta transparentes."
      >
        <Link className="button" href="/admin">
          Configuração da operação <ArrowRight size={14} />
        </Link>
      </PageTitle>
      <MarketError message={error || configError} />
      {config && (!config.enabled || !config.payments_ready || config.commission_bps == null) && (
        <div className={styles.notice}>
          <ShieldCheck size={18} />
          <span>
            Abertura das vendas pendente. Confira os dados da operadora, retirada, comissão e
            provedor em <Link href="/admin">Configuração da operação</Link>. Não aprove anúncios sem
            revisar as condições que os participantes aceitarão.
          </span>
        </div>
      )}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <small>Anúncios aguardando revisão</small>
          <strong>{pending}</strong>
        </div>
        <div className={styles.metric}>
          <small>Vendas confirmadas, menos reembolsos</small>
          <strong>
            {money(confirmed.reduce((sum, o) => sum + o.subtotal_cents - o.refunded_cents, 0))}
          </strong>
        </div>
        <div className={styles.metric}>
          <small>Comissões registradas, menos reversões</small>
          <strong>
            {money(
              confirmed.reduce(
                (sum, o) => sum + o.commission_cents - o.refunded_commission_cents,
                0,
              ),
            )}
          </strong>
        </div>
      </div>
      <p className={styles.hint}>
        Os valores são um resumo dos pedidos deste painel. A conciliação dos recebimentos, tarifas e
        repasses depende da confirmação do provedor; não representam saldo bancário ou lucro da
        parceria.
      </p>
      <div className="filter-tabs">
        <button className={tab === 'listings' ? 'active' : ''} onClick={() => setTab('listings')}>
          Revisar anúncios {pending > 0 && `(${pending})`}
        </button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
          Pedidos e atendimento
        </button>
      </div>
      {tab === 'listings' ? (
        <>
          <div className={styles.toolbar}>
            <label>
              Situação
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending">Aguardando análise</option>
                <option value="active">Publicados</option>
                <option value="rejected">Revisão necessária</option>
                <option value="paused">Pausados</option>
                <option value="draft">Rascunhos</option>
                <option value="sold">Esgotados</option>
                <option value="all">Todos</option>
              </select>
            </label>
            <label>
              Jogo
              <select value={game} onChange={(e) => setGame(e.target.value)}>
                <option value="all">Ambos os jogos</option>
                <option value="yugioh">Yu-Gi-Oh!</option>
                <option value="pokemon">Pokémon</option>
              </select>
            </label>
            <span className={styles.count}>
              {rows.length} anúncio{rows.length === 1 ? '' : 's'}
            </span>
          </div>
          {loading ? (
            <Spinner />
          ) : !rows.length ? (
            <Empty
              icon={ClipboardCheck}
              title="Nenhum anúncio nesta fila."
              description="Os exemplares enviados para revisão aparecerão aqui com as fotos e condições informadas pelo vendedor."
            />
          ) : (
            <div className={styles.rows}>
              {rows.map((listing) => (
                <article className={styles.row} key={listing.id}>
                  <ListingPhoto className={styles.rowPhoto} listing={listing} />
                  <div className={styles.rowBody}>
                    <h2>{listing.card_name}</h2>
                    <p>
                      {gameName(listing.game)} · {listing.condition} · {listing.language}
                      <br />
                      Vendedor: {listing.seller?.display_name ||
                        listing.seller_id.slice(0, 8)} · {marketDate(listing.created_at)}
                      <br />
                      {listing.quantity} unidade{listing.quantity === 1 ? '' : 's'} ·{' '}
                      {money(listing.price_cents)} cada
                    </p>
                    {listing.rejection_reason && (
                      <p className={styles.reason}>{listing.rejection_reason}</p>
                    )}
                    <div className={styles.actions}>
                      <button className="button" onClick={() => setDetail(listing)}>
                        Conferir exemplar <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                  <StatusBadge status={listing.status} />
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.toolbar}>
            <label>
              Situação do pedido
              <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                <option value="all">Todos</option>
                <option value="pending_payment">Aguardando pagamento</option>
                <option value="payment_review">Conferência financeira</option>
                <option value="paid">Pagos</option>
                <option value="ready">Prontos para retirada</option>
                <option value="completed">Retirados</option>
                <option value="disputed">Atendimento solicitado</option>
                <option value="refunded">Reembolsados</option>
                <option value="cancelled">Cancelados</option>
                <option value="expired">Expirados</option>
              </select>
            </label>
            <span className={styles.count}>
              {orderRows.length} pedido{orderRows.length === 1 ? '' : 's'}
            </span>
          </div>
          {loading ? (
            <Spinner />
          ) : !orderRows.length ? (
            <Empty
              icon={Store}
              title="Nenhum pedido nesta situação."
              description="Os pedidos ficarão disponíveis para conferência e atendimento após o início das compras."
            />
          ) : (
            <div className={styles.rows}>
              {orderRows.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
      {detail && (
        <ModerationModal
          listing={detail}
          onClose={() => setDetail(null)}
          onDone={(approved) => {
            setDetail(null);
            toast(approved ? 'Anúncio aprovado.' : 'Revisão solicitada ao vendedor.');
            void load();
          }}
        />
      )}
    </>
  );
}
function ModerationModal({
  listing,
  onClose,
  onDone,
}: {
  listing: MarketplaceListing;
  onClose: () => void;
  onDone: (approved: boolean) => void;
}) {
  const [reason, setReason] = useState(''),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const canModerate = ['pending', 'active', 'paused'].includes(listing.status);
  async function moderate(approved: boolean) {
    const client = createClient();
    if (!client) return;
    setBusy(true);
    setError('');
    const result = await client.rpc('admin_moderate_listing', {
      p_listing_id: listing.id,
      p_approved: approved,
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (result.error) setError(marketError(result.error));
    else onDone(approved);
  }
  return (
    <Modal
      title="Revisar anúncio"
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className={styles.detail}>
        <Gallery listing={listing} />
        <div>
          <span className="eyebrow">{gameName(listing.game)}</span>
          <h2>{listing.card_name}</h2>
          <StatusBadge status={listing.status} />
          <dl className={styles.detailsList}>
            <div>
              <dt>Vendedor</dt>
              <dd>{listing.seller?.display_name || listing.seller_id}</dd>
            </div>
            <div>
              <dt>Preço e quantidade</dt>
              <dd>
                {money(listing.price_cents)} · {listing.quantity} un.
              </dd>
            </div>
            <div>
              <dt>Estado e idioma</dt>
              <dd>
                {listing.condition} · {listing.language}
              </dd>
            </div>
            <div>
              <dt>Edição e raridade</dt>
              <dd>
                {listing.set_code || 'Não informada'} · {listing.rarity}
              </dd>
            </div>
          </dl>
          <p className={styles.description}>{listing.description || 'Sem descrição adicional.'}</p>
          <MarketError message={error} />
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void moderate(true);
            }}
          >
            <label>
              Motivo da revisão ou observação
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
                rows={3}
                disabled={busy}
                placeholder="Explique com clareza o que precisa ser corrigido."
              />
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                disabled={busy}
              />
              <span>
                Conferi frente, verso, conservação, edição, quantidade e condições da oferta. A
                moderação não equivale a uma certificação profissional de autenticidade.
              </span>
            </label>
            <div className={styles.actions}>
              <button
                className="button button-gold"
                disabled={busy || !canModerate || !checked || listing.photos.length < 2}
              >
                {busy ? <Loader2 className="spin" size={15} /> : <Check size={15} />}Aprovar anúncio
              </button>
              <button
                type="button"
                className="button"
                disabled={busy || !canModerate || reason.trim().length < 10}
                onClick={() => void moderate(false)}
              >
                <X size={15} />
                Solicitar correção
              </button>
            </div>
            <p className={styles.hint}>
              {!canModerate &&
                'Este anúncio precisa ser enviado para análise pelo vendedor antes de uma nova decisão. '}
              Para solicitar correção, descreva o motivo com pelo menos 10 caracteres. Somente
              anúncios com fotos suficientes podem ser aprovados.
            </p>
          </form>
        </div>
      </div>
    </Modal>
  );
}
