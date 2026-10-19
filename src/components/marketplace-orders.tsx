'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Receipt,
  Send,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MarketplaceOrder, MarketplaceListing } from '@/types/marketplace';
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
  marketRequest,
  money,
} from './marketplace-shared';
import styles from './marketplace.module.css';

type OrderItem = {
  listing_id: string;
  collection_item_id: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  listing_snapshot: MarketplaceListing;
};
type OrderEvent = {
  id: string;
  order_id: string;
  actor_id: string | null;
  event: string;
  message: string | null;
  created_at: string;
};
type OrderMessage = {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};
type OrderPayment = {
  payment_id: string;
  order_id: string;
  status: string;
  amount_cents: number;
  refunded_cents: number;
  updated_at: string;
};
function orderItems(order: MarketplaceOrder): OrderItem[] {
  const items = (order as MarketplaceOrder & { items?: OrderItem[] }).items;
  return items?.length
    ? items
    : [
        {
          listing_id: order.listing_id,
          collection_item_id: order.collection_item_id,
          quantity: order.quantity,
          unit_price_cents: order.listing_snapshot.price_cents,
          subtotal_cents: order.subtotal_cents,
          listing_snapshot: order.listing_snapshot,
        },
      ];
}

export function MarketplaceOrders() {
  return (
    <div className="page-content">
      <Protected>
        <OrdersContent />
      </Protected>
    </div>
  );
}
function OrdersContent() {
  const { user } = useApp();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]),
    [filter, setFilter] = useState('purchases'),
    [status, setStatus] = useState('all'),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    const client = createClient();
    if (!client || !user) return;
    setLoading(true);
    const result = await client
      .from('marketplace_orders')
      .select(
        '*,buyer:profiles!marketplace_orders_buyer_id_fkey(*),seller:profiles!marketplace_orders_seller_id_fkey(*)',
      )
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (result.error) setError(marketError(result.error));
    else {
      setError('');
      setOrders((result.data || []) as MarketplaceOrder[]);
    }
  }, [user]);
  useEffect(() => {
    void load();
  }, [load]);
  const rows = orders.filter(
    (o) =>
      (filter === 'purchases' ? o.buyer_id === user?.id : o.seller_id === user?.id) &&
      (status === 'all' || o.status === status),
  );
  return (
    <>
      <PageTitle
        eyebrow="CADA CARTA, UM NOVO CAPÍTULO"
        title="Seus pedidos e suas vendas."
        description="Acompanhe o pagamento, combine a retirada e encontre todo o histórico da compra em um só lugar."
      >
        <Link className="button" href="/mercado">
          Explorar o marketplace <ArrowRight size={15} />
        </Link>
      </PageTitle>
      <div className="filter-tabs">
        <button
          className={filter === 'purchases' ? 'active' : ''}
          onClick={() => setFilter('purchases')}
        >
          <ShoppingLabel /> Minhas compras
        </button>
        <button className={filter === 'sales' ? 'active' : ''} onClick={() => setFilter('sales')}>
          <Store size={14} /> Minhas vendas
        </button>
      </div>
      <MarketError message={error} />
      <div className={styles.toolbar}>
        <label>
          Situação
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos os pedidos</option>
            <option value="pending_payment">Aguardando pagamento</option>
            <option value="paid">Pagos</option>
            <option value="ready">Prontos para retirada</option>
            <option value="completed">Retirados</option>
            <option value="refunded">Reembolsados</option>
            <option value="disputed">Em atendimento</option>
            <option value="cancelled">Cancelados</option>
            <option value="expired">Expirados</option>
          </select>
        </label>
        <span className={styles.count}>
          {rows.length} pedido{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      {loading ? (
        <Spinner />
      ) : !rows.length ? (
        <Empty
          icon={Receipt}
          title={
            filter === 'purchases'
              ? 'Sua próxima carta ainda está na vitrine.'
              : 'Suas vendas aparecerão aqui.'
          }
          description={
            filter === 'purchases'
              ? 'Quando você iniciar uma compra, poderá acompanhar o pagamento e a retirada por aqui.'
              : 'Crie anúncios com fotos e acompanhe cada pedido recebido.'
          }
          href={filter === 'purchases' ? '/mercado' : '/vender'}
          label={filter === 'purchases' ? 'Encontrar cartas' : 'Preparar meus anúncios'}
        />
      ) : (
        <div className={styles.rows}>
          {rows.map((order) => (
            <OrderRow key={order.id} order={order} selling={filter === 'sales'} />
          ))}
        </div>
      )}
    </>
  );
}
function ShoppingLabel() {
  return <Receipt size={14} />;
}
export function OrderRow({ order, selling }: { order: MarketplaceOrder; selling?: boolean }) {
  const items = orderItems(order);
  return (
    <Link className={styles.row} href={`/pedidos/${order.id}`}>
      <ListingPhoto className={styles.rowPhoto} listing={items[0].listing_snapshot} />
      <div className={styles.rowBody}>
        <h2>
          {items[0].listing_snapshot.card_name}
          {items.length > 1 ? ` + ${items.length - 1} anúncio${items.length > 2 ? 's' : ''}` : ''}
        </h2>
        <p>
          Pedido {order.id.slice(0, 8).toUpperCase()} · {marketDate(order.created_at)}
          <br />
          {selling
            ? `Comprador: ${order.buyer?.display_name || 'membro da comunidade'}`
            : `Vendedor: ${order.seller?.display_name || 'membro da comunidade'}`}
        </p>
      </div>
      <div className={styles.rowAside}>
        <StatusBadge status={order.status} />
        <strong className="gold-text">{money(order.subtotal_cents)}</strong>
        <span className={styles.meta}>
          Ver pedido <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}

export function MarketplaceOrderDetail({ id }: { id: string }) {
  return (
    <div className="page-content">
      <Protected>
        <OrderDetailContent id={id} />
      </Protected>
    </div>
  );
}
function OrderDetailContent({ id }: { id: string }) {
  const { user, isAdmin, toast } = useApp();
  const [order, setOrder] = useState<MarketplaceOrder | null>(null),
    [events, setEvents] = useState<OrderEvent[]>([]),
    [messages, setMessages] = useState<OrderMessage[]>([]),
    [payments, setPayments] = useState<OrderPayment[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [content, setContent] = useState(''),
    [messageError, setMessageError] = useState(''),
    [sending, setSending] = useState(false),
    [action, setAction] = useState<string | null>(null),
    [refund, setRefund] = useState(false),
    [snapshot, setSnapshot] = useState<MarketplaceListing | null>(null);
  const load = useCallback(async () => {
    const client = createClient();
    if (!client || !user) return;
    const result = await Promise.all([
      client
        .from('marketplace_orders')
        .select(
          '*,buyer:profiles!marketplace_orders_buyer_id_fkey(*),seller:profiles!marketplace_orders_seller_id_fkey(*)',
        )
        .eq('id', id)
        .maybeSingle(),
      client.from('marketplace_order_events').select('*').eq('order_id', id).order('created_at'),
      client.from('marketplace_order_messages').select('*').eq('order_id', id).order('created_at'),
      client.from('marketplace_payments').select('*').eq('order_id', id).order('updated_at'),
    ]);
    const failure = result.find((i) => i.error)?.error;
    setLoading(false);
    if (failure) setError(marketError(failure));
    else {
      setOrder(result[0].data as MarketplaceOrder | null);
      setEvents((result[1].data || []) as OrderEvent[]);
      setMessages((result[2].data || []) as OrderMessage[]);
      setPayments((result[3].data || []) as OrderPayment[]);
      setError('');
    }
  }, [id, user]);
  useEffect(() => {
    void load();
    const client = createClient();
    const channel = client
      ?.channel(`marketplace-order-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_orders', filter: `id=eq.${id}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_order_messages',
          filter: `order_id=eq.${id}`,
        },
        () => void load(),
      )
      .subscribe();
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 20000);
    return () => {
      clearInterval(poll);
      if (channel && client) void client.removeChannel(channel);
    };
  }, [load, id]);
  async function pay() {
    setError('');
    setBusy(true);
    try {
      const result = await marketRequest<{ url: string }>('/api/marketplace/checkout', {
        orderId: id,
      });
      const url = new URL(result.url);
      if (url.protocol !== 'https:')
        throw new Error('Não foi possível abrir o pagamento com segurança.');
      window.location.assign(url.href);
    } catch (e) {
      setError(marketError(e));
      setBusy(false);
    }
  }
  async function reconcile() {
    setError('');
    setBusy(true);
    try {
      await marketRequest('/api/marketplace/reconcile', { orderId: id });
      await load();
      toast('Conferência realizada com o Mercado Pago. Veja o status atual do pedido.');
    } catch (e) {
      setError(marketError(e));
    } finally {
      setBusy(false);
    }
  }
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const client = createClient();
    if (!client || !user || !content.trim()) return;
    setSending(true);
    setMessageError('');
    const result = await client
      .from('marketplace_order_messages')
      .insert({ order_id: id, sender_id: user.id, content: content.trim() });
    setSending(false);
    if (result.error) setMessageError(marketError(result.error));
    else {
      setContent('');
      void load();
    }
  }
  if (loading) return <Spinner />;
  if (!order)
    return (
      <>
        <MarketError message={error} />
        <Empty
          icon={Package}
          title="Pedido não encontrado."
          description="Entre na conta participante da compra ou confira o endereço do pedido."
          href="/pedidos"
          label="Ver meus pedidos"
        />
      </>
    );
  const buyer = order.buyer_id === user?.id,
    seller = order.seller_id === user?.id;
  const items = orderItems(order),
    refundable =
      ['paid', 'ready', 'completed', 'disputed'].includes(order.status) &&
      order.refunded_cents < order.subtotal_cents;
  const refundablePayment = payments.some(
    (p) => p.status === 'approved' && p.refunded_cents < p.amount_cents,
  );
  return (
    <>
      <Link
        className={styles.topLink}
        href={isAdmin && !buyer && !seller ? '/admin/mercado' : '/pedidos'}
      >
        <ArrowLeft size={15} />
        Voltar aos pedidos
      </Link>
      <PageTitle
        eyebrow={`PEDIDO ${order.id.slice(0, 8).toUpperCase()}`}
        title="Uma nova história para estas cartas."
        description={`Criado em ${marketDate(order.created_at)}. ${buyer ? 'Acompanhe sua compra e a retirada.' : seller ? 'Acompanhe sua venda e o atendimento.' : 'Acompanhamento administrativo do pedido.'}`}
      >
        <StatusBadge status={order.status} />
      </PageTitle>
      <MarketError message={error} />
      <div className={styles.orderLayout}>
        <div>
          <section className={`${styles.card} ${styles.section}`}>
            <h2>Os exemplares do pedido</h2>
            <div className={styles.rows}>
              {items.map((item) => (
                <div className={styles.row} key={item.listing_id}>
                  <ListingPhoto className={styles.rowPhoto} listing={item.listing_snapshot} />
                  <div className={styles.rowBody}>
                    <h3>{item.listing_snapshot.card_name}</h3>
                    <p>
                      {gameName(item.listing_snapshot.game)} ·{' '}
                      {item.listing_snapshot.set_code || 'Edição não informada'}
                      <br />
                      {item.listing_snapshot.condition} · {item.listing_snapshot.language} ·{' '}
                      {item.listing_snapshot.rarity}
                      <br />
                      {item.quantity}× {money(item.unit_price_cents)} = {money(item.subtotal_cents)}
                    </p>
                    {item.listing_snapshot.description && (
                      <p className={styles.description}>{item.listing_snapshot.description}</p>
                    )}
                    <button
                      className="text-link"
                      onClick={() => setSnapshot(item.listing_snapshot)}
                    >
                      Ver fotos preservadas da oferta <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className={styles.hint}>
              Dados e condições preservados no momento da compra. Termos aceitos:{' '}
              {order.terms_version}.
            </p>
          </section>
          <section className={`${styles.card} ${styles.section}`}>
            <h2>
              <MapPin size={17} /> Retirada em Lagarto
            </h2>
            <p>{order.pickup_instructions}</p>
            <p className={styles.hint}>
              Combine o horário pelo atendimento do pedido. Confira os exemplares na retirada e
              confirme o recebimento somente após a entrega física.
            </p>
            <div className={styles.actions}>
              {buyer && order.status === 'pending_payment' && (
                <button className="button button-gold" disabled={busy} onClick={() => void pay()}>
                  {busy ? <Loader2 className="spin" size={15} /> : <CreditCard size={15} />}
                  Continuar pagamento <ExternalLink size={14} />
                </button>
              )}
              {seller && order.status === 'paid' && (
                <button className="button button-gold" onClick={() => setAction('ready')}>
                  <Package size={15} />
                  Marcar pronto para retirada
                </button>
              )}
              {buyer && order.status === 'ready' && (
                <button className="button button-gold" onClick={() => setAction('complete')}>
                  <CheckCircle2 size={15} />
                  Confirmar que retirei as cartas
                </button>
              )}
              {(buyer || seller) && order.status === 'pending_payment' && (
                <button className="button" onClick={() => setAction('cancel')}>
                  Cancelar pedido
                </button>
              )}
            </div>
            {order.status === 'pending_payment' && (
              <p className={styles.hint}>
                Reserva até {marketDate(order.expires_at)}. O status é atualizado pela confirmação
                do Mercado Pago. Retornar do checkout não confirma o pagamento.
              </p>
            )}
            {['pending_payment', 'payment_review', 'disputed'].includes(order.status) && (
              <button className="text-link" disabled={busy} onClick={() => void reconcile()}>
                Conferir pagamento com o provedor <ArrowRight size={13} />
              </button>
            )}
            {order.status === 'payment_review' && (
              <div className={styles.notice}>
                <ShieldCheck size={17} />
                <span>
                  O pagamento precisa de conferência. Aguarde a operação verificar o recebimento e o
                  estoque antes de combinar a entrega.
                </span>
              </div>
            )}
          </section>
          <section className={`${styles.card} ${styles.section}`}>
            <h2>
              <MessageCircle size={17} /> Atendimento deste pedido
            </h2>
            <p className={styles.hint}>
              Converse com a outra parte e com a operação sobre os exemplares e a retirada. Não
              envie senhas, documentos ou números de cartão.
            </p>
            <div className={styles.messageList} role="log" aria-label="Mensagens do pedido">
              {!messages.length && <p>A conversa deste pedido começa aqui.</p>}
              {messages.map((message) => (
                <div className={styles.message} key={message.id}>
                  <small>
                    {message.sender_id === user?.id
                      ? 'Você'
                      : message.sender_id === order.buyer_id
                        ? order.buyer?.display_name || 'Comprador'
                        : message.sender_id === order.seller_id
                          ? order.seller?.display_name || 'Vendedor'
                          : 'Operação'}
                  </small>
                  <p>{message.content}</p>
                  <time dateTime={message.created_at}>{marketDate(message.created_at)}</time>
                </div>
              ))}
            </div>
            <MarketError message={messageError} />
            <form className="form" onSubmit={(e) => void send(e)}>
              <label>
                Mensagem
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={2000}
                  minLength={1}
                  required
                  rows={3}
                  placeholder="Combine a retirada ou descreva sua dúvida…"
                  disabled={sending}
                />
              </label>
              <button className="button" disabled={sending || !content.trim()}>
                {sending ? <Loader2 className="spin" size={15} /> : <Send size={15} />}Enviar
                mensagem
              </button>
            </form>
          </section>
        </div>
        <aside>
          <section className={`${styles.card} ${styles.section}`}>
            <h2>Resumo da compra</h2>
            <p>
              Comprador: {order.buyer?.display_name || 'Membro da comunidade'}
              <br />
              Vendedor: {order.seller?.display_name || 'Membro da comunidade'}
            </p>
            <div className={styles.summary}>
              <div>
                <span>Cartas</span>
                <strong>{money(order.subtotal_cents)}</strong>
              </div>
              <div>
                <span>Entrega</span>
                <strong>Retirada local</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{money(order.subtotal_cents)}</strong>
              </div>
            </div>
            {order.refunded_cents > 0 && (
              <p>
                Valor reembolsado:{' '}
                <strong className="gold-text">{money(order.refunded_cents)}</strong>
              </p>
            )}
            {(seller || isAdmin) && (
              <>
                <h2>Recebíveis</h2>
                <p>
                  Comissão da operação ({(order.commission_bps / 100).toLocaleString('pt-BR')}%):{' '}
                  {money(order.commission_cents)}
                  <br />
                  Comissão revertida: {money(order.refunded_commission_cents)}
                  <br />
                  Estimativa restante do vendedor antes das tarifas do Mercado Pago:{' '}
                  {money(
                    Math.max(
                      0,
                      order.seller_net_cents -
                        order.refunded_cents +
                        order.refunded_commission_cents,
                    ),
                  )}
                </p>
                <p className={styles.hint}>
                  A conciliação, as taxas e os prazos efetivos de liberação seguem os registros do
                  Mercado Pago. A conclusão da retirada não constitui uma promessa de liberação
                  financeira.
                </p>
              </>
            )}
          </section>
          {payments.length > 0 && (
            <section className={`${styles.card} ${styles.section}`}>
              <h2>Cobranças do pedido</h2>
              {payments.map((payment) => (
                <div className={styles.summary} key={payment.payment_id}>
                  <div>
                    <span>Identificador</span>
                    <strong>{payment.payment_id}</strong>
                  </div>
                  <div>
                    <span>Situação</span>
                    <strong>{paymentStatus(payment.status)}</strong>
                  </div>
                  <div>
                    <span>Valor / devolvido</span>
                    <strong>
                      {money(payment.amount_cents)} / {money(payment.refunded_cents)}
                    </strong>
                  </div>
                </div>
              ))}
              {payments.length > 1 && (
                <p className={styles.hint}>
                  Há mais de uma cobrança vinculada a este pedido. A operação deve conferir qual
                  pagamento corresponde à compra e tratar eventuais valores excedentes. O valor
                  total das cobranças não representa novas unidades de cartas.
                </p>
              )}
            </section>
          )}
          <section className={`${styles.card} ${styles.section}`}>
            <h2>Histórico</h2>
            <div className={styles.timeline}>
              <div className={styles.event}>
                <strong>Pedido criado</strong>
                <time dateTime={order.created_at}>{marketDate(order.created_at)}</time>
              </div>
              {events
                .filter((e) => !['created', 'order_created'].includes(e.event))
                .map((event) => (
                  <div className={styles.event} key={event.id}>
                    <strong>
                      {event.message && ['paid', 'ready', 'completed'].includes(event.event)
                        ? 'Atendimento registrado'
                        : eventTitle(event.event)}
                    </strong>
                    {event.message && <p>{event.message}</p>}
                    <time dateTime={event.created_at}>{marketDate(event.created_at)}</time>
                  </div>
                ))}
            </div>
          </section>
          <section className={`${styles.card} ${styles.section}`}>
            <h2>Precisa de ajuda?</h2>
            <p>
              Registre um problema no pedido. Cancelamentos e devoluções seguem os direitos e
              condições aplicáveis; confirmar a retirada não elimina esses direitos.
            </p>
            {order.refund_requested && (
              <p className={styles.reason}>
                Solicitação de reembolso registrada:{' '}
                {order.request_reason || 'aguardando análise da operação'}.
              </p>
            )}
            <div className={styles.actions}>
              {buyer && refundable && !order.refund_requested && (
                <button className="button" onClick={() => setAction('request_refund')}>
                  Solicitar devolução ou reembolso
                </button>
              )}
              {(buyer || seller) && ['paid', 'ready', 'completed'].includes(order.status) && (
                <button className="button" onClick={() => setAction('dispute')}>
                  Relatar um problema
                </button>
              )}
              {isAdmin && order.status === 'disputed' && order.payment_status === 'approved' && (
                <button className="button" onClick={() => setAction('resolve_dispute')}>
                  Registrar resolução do atendimento
                </button>
              )}
              {(seller || isAdmin) && (refundable || refundablePayment) && (
                <button className="button" onClick={() => setRefund(true)}>
                  Processar reembolso
                </button>
              )}
              <Link className="text-link" href="/termos-marketplace">
                Consultar termos <ArrowRight size={13} />
              </Link>
            </div>
          </section>
        </aside>
      </div>
      {action && (
        <OrderActionModal
          action={action}
          order={order}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            toast('Pedido atualizado.');
            void load();
          }}
        />
      )}
      {refund && (
        <RefundModal
          order={order}
          payments={payments}
          onClose={() => setRefund(false)}
          onDone={() => {
            setRefund(false);
            toast('Reembolso solicitado ao provedor. Acompanhe o resultado no pedido.');
            void load();
          }}
        />
      )}
      {snapshot && (
        <Modal
          title={`Exemplar do pedido: ${snapshot.card_name}`}
          onClose={() => setSnapshot(null)}
        >
          <Gallery listing={snapshot} />
          <p className={styles.hint}>
            Fotografias e condições registradas no momento da compra. {snapshot.condition} ·{' '}
            {snapshot.language} · {snapshot.set_code}.
          </p>
        </Modal>
      )}
    </>
  );
}
function eventTitle(event: string) {
  const titles: Record<string, string> = {
    paid: 'Pagamento confirmado',
    ready: 'Pronto para retirada',
    completed: 'Retirada confirmada',
    cancelled: 'Pedido cancelado',
    expired: 'Reserva expirada',
    refunded: 'Reembolso registrado',
    disputed: 'Atendimento solicitado',
    request_refund: 'Devolução ou reembolso solicitado',
    refund_requested: 'Reembolso solicitado',
    payment_review: 'Conferência financeira',
    payment_updated: 'Pagamento atualizado',
    refund: 'Reembolso atualizado',
  };
  return titles[event] || 'Atualização do pedido';
}
function paymentStatus(status: string) {
  return (
    (
      {
        approved: 'Confirmado',
        pending: 'Pendente',
        in_process: 'Em análise',
        authorized: 'Autorizado',
        rejected: 'Recusado',
        cancelled: 'Cancelado',
        refunded: 'Reembolsado',
        charged_back: 'Contestado no provedor',
      } as Record<string, string>
    )[status] || 'Em conferência'
  );
}
function OrderActionModal({
  action,
  order,
  onClose,
  onDone,
}: {
  action: string;
  order: MarketplaceOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const needsReason = ['dispute', 'request_refund', 'resolve_dispute'].includes(action);
  const title =
    action === 'ready'
      ? 'As cartas estão prontas para retirada?'
      : action === 'complete'
        ? 'Você já recebeu os exemplares?'
        : action === 'cancel'
          ? 'Cancelar este pedido?'
          : action === 'request_refund'
            ? 'Solicitar devolução ou reembolso'
            : action === 'resolve_dispute'
              ? 'Registrar resolução do atendimento'
              : 'Relatar um problema';
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const client = createClient();
    if (!client) return;
    setBusy(true);
    setError('');
    const result =
      action === 'resolve_dispute'
        ? await client.rpc('admin_resolve_marketplace_dispute', {
            p_order_id: order.id,
            p_reason: reason.trim(),
          })
        : await client.rpc('marketplace_order_action', {
            p_order_id: order.id,
            p_action: action,
            p_reason: reason.trim(),
          });
    setBusy(false);
    if (result.error) setError(marketError(result.error));
    else onDone();
  }
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <MarketError message={error} />
      <form className="form" onSubmit={(e) => void submit(e)}>
        <p className={styles.hint}>
          {action === 'complete'
            ? 'Confirme apenas após a entrega física e a conferência das cartas. Seus direitos legais de atendimento e devolução continuam preservados.'
            : action === 'ready'
              ? 'O comprador será informado de que as cartas estão prontas. Combine o horário pelo atendimento antes da retirada.'
              : action === 'cancel'
                ? 'O pedido ainda sem pagamento será cancelado e a reserva dos exemplares será liberada. Se houver um pagamento posterior, ele precisará de conferência.'
                : action === 'resolve_dispute'
                  ? 'Registre como o atendimento foi resolvido. O pedido retomará o estado anterior ao problema interno. Esta ação não resolve chargebacks ou contestações abertas no Mercado Pago e não movimenta valores.'
                  : 'Descreva o ocorrido. O registro ficará disponível para a outra parte e para a operação. O pedido de reembolso será analisado; este formulário não conclui um estorno automaticamente.'}
        </p>
        {needsReason && (
          <label>
            Descreva o motivo
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
          </label>
        )}
        <div className={styles.actions}>
          <button type="button" className="button" disabled={busy} onClick={onClose}>
            Voltar
          </button>
          <button
            className="button button-gold"
            disabled={busy || (needsReason && reason.trim().length < 10)}
          >
            {busy && <Loader2 className="spin" size={15} />}
            {needsReason ? 'Registrar solicitação' : 'Confirmar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function RefundModal({
  order,
  payments,
  onClose,
  onDone,
}: {
  order: MarketplaceOrder;
  payments: OrderPayment[];
  onClose: () => void;
  onDone: () => void;
}) {
  const candidates = payments.filter(
    (p) => p.status === 'approved' && p.refunded_cents < p.amount_cents,
  );
  const [paymentId, setPaymentId] = useState(
    candidates.length === 1 ? candidates[0].payment_id : '',
  );
  const selected = candidates.find((p) => p.payment_id === paymentId);
  const remaining = selected ? selected.amount_cents - selected.refunded_cents : 0;
  const [amount, setAmount] = useState((remaining / 100).toFixed(2).replace('.', ',')),
    [reason, setReason] = useState(''),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setAmount((remaining / 100).toFixed(2).replace('.', ','));
    setAccepted(false);
  }, [remaining, paymentId]);
  const amountCents = /^\d+(?:[,.]\d{1,2})?$/.test(amount)
    ? Math.round(Number(amount.replace(',', '.')) * 100)
    : 0;
  async function refund(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await marketRequest('/api/marketplace/refund', {
        orderId: order.id,
        paymentId,
        amountCents,
        reason: reason.trim(),
      });
      onDone();
    } catch (e) {
      setError(marketError(e));
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Autorizar reembolso pelo Mercado Pago"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <MarketError message={error} />
      <form className="form" onSubmit={(e) => void refund(e)}>
        <div className={styles.notice}>
          <ShieldCheck size={18} />
          <span>
            Esta ação solicita uma devolução financeira real ao comprador. A comissão correspondente
            deve ser reconciliada. O provedor pode exigir saldo e aplicar regras próprias sobre
            taxas e prazos.
          </span>
        </div>
        <label>
          Cobrança a reembolsar
          <select
            required
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            disabled={busy}
          >
            <option value="">Selecione e confira a cobrança</option>
            {candidates.map((payment) => (
              <option key={payment.payment_id} value={payment.payment_id}>
                {payment.payment_id} · {money(payment.amount_cents)} ·{' '}
                {payment.payment_id === order.payment_id
                  ? 'pagamento principal'
                  : 'outra cobrança deste pedido'}
              </option>
            ))}
          </select>
          <span className={styles.hint}>
            Para cobranças excedentes, escolha o identificador correspondente. Reembolsar o
            pagamento principal pode cancelar a compra.
          </span>
        </label>
        <label>
          Valor a devolver (R$)
          <input
            required
            inputMode="decimal"
            value={amount}
            maxLength={10}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
          />
          <span className={styles.hint}>Saldo máximo de reembolso: {money(remaining)}.</span>
        </label>
        <label>
          Motivo
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            disabled={busy}
          />
          <span>
            Conferi o pedido e autorizo solicitar a devolução de {money(amountCents)} ao comprador.
          </span>
        </label>
        <div className={styles.actions}>
          <button type="button" className="button" disabled={busy} onClick={onClose}>
            Voltar
          </button>
          <button
            className="button button-gold"
            disabled={
              busy ||
              !paymentId ||
              !accepted ||
              amountCents <= 0 ||
              amountCents > remaining ||
              reason.trim().length < 10
            }
          >
            {busy && <Loader2 className="spin" size={16} />}Solicitar reembolso financeiro
          </button>
        </div>
      </form>
    </Modal>
  );
}
