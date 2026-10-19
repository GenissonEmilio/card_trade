'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardImage, friendlyError, initials } from '@/lib/utils';
import type { Message, Trade } from '@/types';
import { useApp } from './providers';
import { Empty, Modal, PageTitle, Protected, Spinner } from './ui';
const tradeSelect =
  '*, offered:offered_snapshot, requested:requested_snapshot, proposer:profiles!trades_proposer_id_fkey(*), recipient:profiles!trades_recipient_id_fkey(*)';
const statuses = {
  pending: 'Aguardando resposta',
  accepted: 'Troca combinada',
  completed: 'Concluída',
  declined: 'Recusada',
  cancelled: 'Cancelada',
};
export function Trades() {
  return (
    <div className="page-content">
      <Protected>
        <TradeList />
      </Protected>
    </div>
  );
}
function TradeList() {
  const { user, toast, game } = useApp(),
    [trades, setTrades] = useState<Trade[]>([]),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState('all');
  useEffect(() => {
    const client = createClient();
    if (!client || !user) return;
    void client
      .from('trades')
      .select(tradeSelect)
      .or(`proposer_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) toast('Não foi possível carregar suas trocas.', true);
        else setTrades((data || []) as unknown as Trade[]);
      });
  }, [user, toast]);
  const visible = trades.filter(
    (t) =>
      (t.offered.game || 'yugioh') === game &&
      (filter === 'all' ||
        (filter === 'active' && ['pending', 'accepted'].includes(t.status)) ||
        (filter === 'completed' && t.status === 'completed')),
  );
  return (
    <>
      <PageTitle
        eyebrow="CARTAS QUE CONECTAM PESSOAS"
        title="Suas próximas trocas."
        description="Acompanhe propostas, converse com outros duelistas e combine sua troca."
      />
      <div className="filter-tabs">
        {[
          { id: 'all', label: 'Todas as trocas' },
          { id: 'active', label: 'Em andamento' },
          { id: 'completed', label: 'Concluídas' },
        ].map((t) => (
          <button
            key={t.id}
            className={filter === t.id ? 'active' : ''}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Empty
          icon={ArrowLeftRight}
          title="Sua próxima troca começa com um oi."
          description="Explore as cartas da comunidade ou encontre um match para enviar sua primeira proposta."
          href="/matches"
          label="Encontrar meus matches"
        />
      ) : (
        <div className="trade-list">
          {visible.map((t) => {
            const other = t.proposer_id === user?.id ? t.recipient : t.proposer;
            return (
              <Link className="trade-row" href={`/trocas/${t.id}`} key={t.id}>
                <div className="trade-thumbs">
                  <img
                    src={
                      t.offered.image_url ||
                      cardImage(t.offered.card_id, t.offered.game || 'yugioh')
                    }
                    alt={t.offered.card_name}
                  />
                  <ArrowLeftRight size={16} />
                  <img
                    src={
                      t.requested.image_url ||
                      cardImage(t.requested.card_id, t.requested.game || 'yugioh')
                    }
                    alt={t.requested.card_name}
                  />
                </div>
                <div className="trade-row-copy">
                  <h3>Uma conexão com {other.display_name}</h3>
                  <p>
                    {t.offered.card_name} ↔ {t.requested.card_name}
                  </p>
                </div>
                <span className={`status status-${t.status}`}>{statuses[t.status]}</span>
                <ArrowUpRight size={18} />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
export function TradeDetail({ id }: { id: string }) {
  return (
    <div className="page-content">
      <Protected>
        <TradeDetailContent id={id} />
      </Protected>
    </div>
  );
}
function TradeDetailContent({ id }: { id: string }) {
  const { user, toast, refresh } = useApp(),
    [trade, setTrade] = useState<Trade | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [sending, setSending] = useState(false),
    [message, setMessage] = useState(''),
    [confirmAction, setConfirmAction] = useState<string | null>(null),
    [reviewed, setReviewed] = useState(false),
    [reviewing, setReviewing] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const client = createClient();
    if (!client || !user) return;
    const { data, error } = await client.from('trades').select(tradeSelect).eq('id', id).single();
    setLoading(false);
    if (error) {
      setTrade(null);
      return;
    }
    setTrade(data as unknown as Trade);
  }, [id, user]);
  useEffect(() => {
    void load();
    const client = createClient();
    if (!client || !user) return;
    void client
      .from('messages')
      .select('*')
      .eq('trade_id', id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) toast('Não foi possível carregar as mensagens.', true);
        else setMessages((data || []).reverse());
      });
    void client
      .from('reviews')
      .select('id')
      .eq('trade_id', id)
      .eq('reviewer_id', user.id)
      .maybeSingle()
      .then(({ data }) => setReviewed(Boolean(data)));
    const channel = client
      .channel(`trade-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `trade_id=eq.${id}` },
        (payload) =>
          setMessages((p) =>
            p.some((m) => m.id === payload.new.id) ? p : [...p, payload.new as Message],
          ),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trades', filter: `id=eq.${id}` },
        () => void load(),
      )
      .subscribe();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      void client.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [id, user, load, toast]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);
  useEffect(() => {
    if (trade?.status === 'completed') void refresh();
  }, [trade?.status, refresh]);
  async function action(name: string) {
    const client = createClient();
    if (!client) return;
    setBusy(true);
    const { error } = await client.rpc('transition_trade', { trade: id, action: name });
    setBusy(false);
    setConfirmAction(null);
    if (error)
      toast(
        /disponív|reservada|inválida/.test(error.message)
          ? error.message
          : friendlyError(error.message),
        true,
      );
    else {
      toast(name === 'confirm' ? 'Sua confirmação foi registrada.' : 'Proposta atualizada.');
      await load();
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !user) return;
    const client = createClient();
    if (!client) return;
    setSending(true);
    const { data, error } = await client
      .from('messages')
      .insert({ trade_id: id, sender_id: user.id, content: message.trim() })
      .select()
      .single();
    setSending(false);
    if (error) toast('Não foi possível enviar sua mensagem.', true);
    else {
      setMessage('');
      if (data) setMessages((p) => (p.some((m) => m.id === data.id) ? p : [...p, data]));
    }
  }
  async function review(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const client = createClient();
    if (!client || !user || !trade) return;
    setReviewing(true);
    const f = new FormData(e.currentTarget);
    const { error } = await client.from('reviews').insert({
      trade_id: id,
      reviewer_id: user.id,
      reviewed_id: trade.proposer_id === user.id ? trade.recipient_id : trade.proposer_id,
      rating: Number(f.get('rating')),
      comment: String(f.get('comment')).trim(),
    });
    setReviewing(false);
    if (error) toast(friendlyError(error.message), true);
    else {
      setReviewed(true);
      toast('Avaliação enviada. Obrigado por fortalecer a comunidade!');
    }
  }
  if (loading) return <Spinner />;
  if (!trade)
    return (
      <Empty
        icon={MessageCircle}
        title="Troca não encontrada."
        description="Esta proposta não existe ou você não faz parte dela."
        href="/trocas"
        label="Voltar para minhas trocas"
      />
    );
  const proposer = trade.proposer_id === user?.id,
    other = proposer ? trade.recipient : trade.proposer,
    confirmed = proposer ? trade.proposer_confirmed : trade.recipient_confirmed;
  return (
    <>
      <Link className="text-link" href="/trocas">
        <ArrowLeft size={15} />
        Voltar para minhas trocas
      </Link>
      <PageTitle
        eyebrow="UMA CARTA. UMA NOVA CONEXÃO."
        title={`Sua troca com ${other.display_name}`}
        description="Combine os detalhes pelo chat e encontre-se em um local público de Lagarto."
      />
      <div className="trade-detail-layout">
        <div className="panel trade-details">
          <span className={`status status-${trade.status}`}>{statuses[trade.status]}</span>
          {[
            { person: trade.proposer, item: trade.offered, label: 'OFERECE' },
            { person: trade.recipient, item: trade.requested, label: 'OFERECE EM TROCA' },
          ].map(({ person, item, label }) => (
            <div className="trade-party" key={person.id}>
              <Link href={`/perfil/${person.username}`}>
                <strong>{person.id === user?.id ? 'Você' : person.display_name}</strong>
              </Link>
              <small>{label}</small>
              <div className="selected-card">
                <img
                  src={item.image_url || cardImage(item.card_id, item.game || 'yugioh')}
                  alt={item.card_name}
                />
                <div>
                  <h3>{item.card_name}</h3>
                  <p>
                    1 carta · {item.condition} · {item.language}
                  </p>
                  <p>
                    {item.rarity}
                    {item.set_code ? ` · ${item.set_code}` : ''}
                  </p>
                </div>
              </div>
              {item.notes && <p className="field-hint">{item.notes}</p>}
            </div>
          ))}
          <div className="trade-buttons">
            {trade.status === 'pending' && !proposer && (
              <>
                <button
                  className="button button-gold"
                  disabled={busy}
                  onClick={() => void action('accept')}
                >
                  <Check size={15} />
                  Aceitar troca
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => setConfirmAction('decline')}
                >
                  Recusar
                </button>
              </>
            )}
            {trade.status === 'accepted' && (
              <button
                className="button button-gold full-width"
                disabled={busy || confirmed}
                onClick={() => setConfirmAction('confirm')}
              >
                <CheckCircle2 size={15} />
                {confirmed ? 'Sua entrega foi confirmada' : 'Confirmar que recebi a carta'}
              </button>
            )}
            {(trade.status === 'accepted' || (trade.status === 'pending' && proposer)) && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => setConfirmAction('cancel')}
              >
                Cancelar proposta
              </button>
            )}
          </div>
          {trade.status === 'accepted' && (
            <p className="field-hint">
              As cartas estão reservadas. A troca só é concluída quando os dois participantes
              confirmam o recebimento.
            </p>
          )}
          {trade.status === 'completed' && (
            <p className="info-note">
              <CheckCircle2 size={17} />
              Troca concluída! As cartas recebidas já estão na coleção pessoal de cada duelista.
            </p>
          )}
          <p className="field-hint">
            <ShieldCheck size={13} /> Verifique estado, edição e autenticidade pessoalmente antes de
            confirmar. O Duelink não recebe pagamentos nem faz custódia.
          </p>
        </div>
        <div>
          <div className="panel chat-panel">
            <div className="chat-header">
              <div className="avatar">
                {other.avatar_url ? (
                  <img src={other.avatar_url} alt="" />
                ) : (
                  initials(other.display_name)
                )}
              </div>
              <div>
                <h2>{other.display_name}</h2>
                <p>Conversa privada desta proposta</p>
              </div>
            </div>
            <div className="messages" aria-live="polite">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <MessageCircle size={28} />
                  <p>
                    Uma boa troca começa com uma boa conversa.
                    <br />
                    Diga oi e combine os detalhes.
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`message ${m.sender_id === user?.id ? 'mine' : ''}`}>
                    <p>{m.content}</p>
                    <time dateTime={m.created_at}>
                      {new Date(m.created_at).toLocaleString('pt-BR', {
                        timeZone: 'America/Fortaleza',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                ))
              )}
              <div ref={end} />
            </div>
            {['pending', 'accepted'].includes(trade.status) ? (
              <form className="chat-input" onSubmit={send}>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva uma mensagem…"
                  aria-label="Sua mensagem"
                  maxLength={2000}
                  required
                />
                <button
                  className="button button-gold"
                  disabled={sending || !message.trim()}
                  aria-label="Enviar mensagem"
                >
                  {sending ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
                </button>
              </form>
            ) : (
              <p className="field-hint" style={{ padding: '0 22px' }}>
                A conversa foi encerrada com esta proposta.
              </p>
            )}
          </div>
          {trade.status === 'completed' && !reviewed && (
            <div className="panel review-form">
              <h2>Como foi essa conexão?</h2>
              <form className="form" onSubmit={review}>
                <label>
                  Sua avaliação
                  <select name="rating" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {'★'.repeat(n)} · {n} {n === 1 ? 'estrela' : 'estrelas'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Conte sua experiência
                  <textarea
                    name="comment"
                    maxLength={500}
                    placeholder="Como foi trocar com este duelista?"
                  />
                </label>
                <button className="button button-gold" disabled={reviewing}>
                  <Star size={15} />
                  Publicar avaliação
                </button>
              </form>
            </div>
          )}
          {reviewed && trade.status === 'completed' && (
            <p className="info-note" style={{ marginTop: 20 }}>
              <CheckCircle2 size={17} />
              Sua avaliação já foi registrada.
            </p>
          )}
        </div>
      </div>
      {confirmAction && (
        <Modal
          title={
            confirmAction === 'confirm'
              ? 'Você já recebeu a carta?'
              : confirmAction === 'decline'
                ? 'Recusar esta proposta?'
                : 'Cancelar esta troca?'
          }
          onClose={() => setConfirmAction(null)}
        >
          <p className="muted">
            {confirmAction === 'confirm'
              ? 'Confirme apenas após receber e conferir a carta física. Quando ambos confirmarem, a troca será concluída e as coleções serão atualizadas.'
              : 'Esta proposta será encerrada. As cartas continuarão nas coleções de seus donos.'}
          </p>
          <div className="trade-buttons">
            <button className="button" onClick={() => setConfirmAction(null)}>
              Voltar
            </button>
            <button
              className="button button-gold"
              disabled={busy}
              onClick={() => void action(confirmAction)}
            >
              {busy ? <Loader2 className="spin" size={15} /> : <Check size={15} />}Confirmar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
