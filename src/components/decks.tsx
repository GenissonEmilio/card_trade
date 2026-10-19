'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Layers3,
  Loader2,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import type { Card, CollectionItem, Deck, DeckCard } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { cardImage, friendlyError } from '@/lib/utils';
import { displayCardName, gameLabels } from '@/lib/catalog';
import { exportDeck, validateDeck } from '@/lib/decks';
import { useApp } from './providers';
import { CardDetail, CardSearchModal } from './cards';
import { Empty, Modal, PageTitle, Protected, Spinner } from './ui';
import { GameSwitch } from './game-switch';
export function Decks() {
  const params = useSearchParams(),
    viewId = params.get('ver');
  return (
    <div className="page-content">
      {viewId ? (
        <DecksContent viewId={viewId} />
      ) : (
        <Protected>
          <DecksContent />
        </Protected>
      )}
    </div>
  );
}
function DecksContent({ viewId }: { viewId?: string }) {
  const { user, game, toast } = useApp();
  const [decks, setDecks] = useState<Deck[]>([]),
    [selected, setSelected] = useState<Deck | null>(null),
    [lines, setLines] = useState<DeckCard[]>([]),
    [owned, setOwned] = useState<CollectionItem[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [creating, setCreating] = useState(false),
    [picker, setPicker] = useState(false),
    [detail, setDetail] = useState<Card | null>(null),
    [error, setError] = useState(''),
    [deleting, setDeleting] = useState(false);
  const editable = !!selected && selected.user_id === user?.id;
  const loadDeck = useCallback(async (deck: Deck) => {
    setSelected(deck);
    setLines([]);
    setError('');
    setLoading(true);
    const client = createClient();
    if (!client) {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await client
      .from('deck_cards')
      .select('*')
      .eq('deck_id', deck.id)
      .order('card_name');
    if (loadError) setError('Não foi possível carregar as cartas deste deck.');
    else setLines(data || []);
    setLoading(false);
  }, []);
  const loadDecks = useCallback(async () => {
    const client = createClient();
    if (!client) {
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    let query = client.from('decks').select('*');
    if (viewId) query = query.eq('id', viewId);
    else if (user) query = query.eq('user_id', user.id).eq('game', game);
    else {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await query.order('updated_at', { ascending: false });
    if (loadError) {
      setError('Não foi possível carregar os decks.');
      setLoading(false);
      return;
    }
    setDecks(data || []);
    if (data?.[0]) await loadDeck(data[0]);
    else {
      setSelected(null);
      setLines([]);
      setLoading(false);
    }
  }, [user, game, viewId, loadDeck]);
  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);
  useEffect(() => {
    const client = createClient();
    if (!client || !user) {
      setOwned([]);
      return;
    }
    void client
      .from('collection_items')
      .select('*')
      .eq('user_id', user.id)
      .gt('quantity', 0)
      .then(({ data }) => setOwned(data || []));
  }, [user]);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = createClient();
    if (!client || !user) return;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const { data, error: saveError } = await client
      .from('decks')
      .insert({
        user_id: user.id,
        game,
        name: String(form.get('name')).trim(),
        description: '',
        format: 'casual',
        visibility: 'private',
      })
      .select()
      .single();
    setBusy(false);
    if (saveError) setError(friendlyError(saveError.message));
    else {
      setCreating(false);
      setDecks((previous) => [data, ...previous]);
      void loadDeck(data);
      toast('Seu novo deck está pronto para receber cartas.');
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = createClient();
    if (!client || !selected || !editable) return;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get('name')).trim(),
      description: String(form.get('description')).trim(),
      format: String(form.get('format')),
      visibility: String(form.get('visibility')) as Deck['visibility'],
      updated_at: new Date().toISOString(),
    };
    const { data, error: saveError } = await client
      .from('decks')
      .update(values)
      .eq('id', selected.id)
      .eq('user_id', user!.id)
      .select()
      .single();
    setBusy(false);
    if (saveError) setError(friendlyError(saveError.message));
    else {
      setSelected(data);
      setDecks((previous) => previous.map((d) => (d.id === data.id ? data : d)));
      toast('Deck salvo. Você pode continuar editando o rascunho.');
    }
  }
  async function addCard(card: Card) {
    const client = createClient();
    if (!client || !selected || !editable || card.game !== selected.game) return;
    setPicker(false);
    setBusy(true);
    setError('');
    const section =
      card.game === 'yugioh' && /fusion|synchro|xyz|link/i.test(card.type) ? 'extra' : 'main';
    const existing = lines.find((line) => line.card_id === card.id && line.section === section);
    const result = existing
      ? await client
          .from('deck_cards')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id)
          .select()
          .single()
      : await client
          .from('deck_cards')
          .insert({
            deck_id: selected.id,
            game: selected.game,
            card_id: card.id,
            card_name: displayCardName(card),
            card_data: card,
            quantity: 1,
            section,
          })
          .select()
          .single();
    setBusy(false);
    if (result.error) setError(friendlyError(result.error.message));
    else
      setLines((previous) =>
        existing
          ? previous.map((line) => (line.id === existing.id ? result.data : line))
          : [...previous, result.data],
      );
  }
  async function updateLine(line: DeckCard, quantity: number, section = line.section) {
    const client = createClient();
    if (!client || !editable) return;
    setBusy(true);
    setError('');
    const result =
      quantity < 1
        ? await client.from('deck_cards').delete().eq('id', line.id)
        : await client
            .from('deck_cards')
            .update({ quantity, section })
            .eq('id', line.id)
            .select()
            .single();
    setBusy(false);
    if (result.error)
      setError(
        /unique/i.test(result.error.message)
          ? 'Esta carta já está nesta seção. Ajuste a quantidade na linha existente.'
          : friendlyError(result.error.message),
      );
    else
      setLines((previous) =>
        quantity < 1
          ? previous.filter((l) => l.id !== line.id)
          : previous.map((l) => (l.id === line.id ? { ...l, quantity, section } : l)),
      );
  }
  async function duplicate() {
    const client = createClient();
    if (!client || !selected || !user) return;
    setBusy(true);
    setError('');
    const { data, error: copyError } = await client
      .from('decks')
      .insert({
        user_id: user.id,
        game: selected.game,
        name: `${selected.name.slice(0, 85)} (cópia)`,
        description: selected.description,
        format: selected.format,
        visibility: 'private',
      })
      .select()
      .single();
    if (copyError) {
      setBusy(false);
      setError(friendlyError(copyError.message));
      return;
    }
    const result = lines.length
      ? await client.from('deck_cards').insert(
          lines.map((line) => ({
            deck_id: data.id,
            game: data.game,
            card_id: line.card_id,
            card_name: line.card_name,
            card_data: line.card_data,
            quantity: line.quantity,
            section: line.section,
          })),
        )
      : { error: null };
    if (result.error) {
      await client.from('decks').delete().eq('id', data.id);
      setError('Não foi possível copiar todas as cartas. Tente novamente.');
    } else {
      setDecks((previous) => [data, ...previous]);
      void loadDeck(data);
      toast('Cópia privada criada na sua conta.');
    }
    setBusy(false);
  }
  async function remove() {
    const client = createClient();
    if (!client || !selected || !editable) return;
    setBusy(true);
    setError('');
    const { error: deleteError } = await client
      .from('decks')
      .delete()
      .eq('id', selected.id)
      .eq('user_id', user!.id);
    setBusy(false);
    if (deleteError) setError(friendlyError(deleteError.message));
    else {
      setDeleting(false);
      toast('Deck removido. Suas cartas na coleção foram preservadas.');
      void loadDecks();
    }
  }
  function download() {
    if (!selected) return;
    const blob = new Blob([exportDeck(selected, lines)], { type: 'text/plain;charset=utf-8' }),
      url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = `duelink-${selected.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function share() {
    if (!selected) return;
    if (selected.visibility !== 'public') {
      setError('Salve a visibilidade como público antes de compartilhar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/decks?ver=${selected.id}`);
      toast('Link público copiado.');
    } catch {
      setError(`Seu link público: ${window.location.origin}/decks?ver=${selected.id}`);
    }
  }
  const validation = selected ? validateDeck(selected, lines) : null;
  return (
    <>
      <PageTitle
        eyebrow="SUA PRÓXIMA ESTRATÉGIA"
        title={viewId ? 'Um deck para se inspirar.' : 'Monte o seu próximo deck.'}
        description="Planeje suas listas de Yu-Gi-Oh! e Pokémon. Veja as cartas que você já tem e o que ainda falta."
      >
        {!viewId && (
          <button
            className="button button-gold"
            onClick={() => {
              setError('');
              setCreating(true);
            }}
          >
            <Plus size={17} />
            Criar deck
          </button>
        )}
      </PageTitle>
      {!viewId && <GameSwitch />}
      {error && !creating && !deleting && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {!selected && loading ? (
        <Spinner />
      ) : !selected ? (
        <Empty
          icon={BookOpen}
          title={
            viewId ? 'Este deck não está disponível.' : `Seu primeiro deck de ${gameLabels[game]}.`
          }
          description={
            viewId
              ? 'O link pode ter sido removido ou o deck está privado.'
              : 'Comece um rascunho. Você pode incluir cartas que ainda não possui e completar sua coleção depois.'
          }
          {...(!viewId
            ? { onClick: () => setCreating(true), label: 'Criar meu primeiro deck' }
            : {})}
        />
      ) : (
        <div className={`decks-workspace ${viewId ? 'shared-deck' : ''}`}>
          {!viewId && (
            <aside className="deck-list panel" aria-label="Meus decks">
              {decks.map((deck) => (
                <button
                  className={selected.id === deck.id ? 'selected' : ''}
                  key={deck.id}
                  onClick={() => void loadDeck(deck)}
                >
                  <Layers3 size={18} />
                  <span>
                    <strong>{deck.name}</strong>
                    <small>
                      {deck.visibility === 'public' ? 'Público' : 'Privado'} ·{' '}
                      {gameLabels[deck.game]}
                    </small>
                  </span>
                </button>
              ))}
            </aside>
          )}
          <section className="panel deck-editor">
            {editable ? (
              <form
                key={selected.id + selected.updated_at}
                className="form deck-settings"
                onSubmit={save}
              >
                <div className="form-row">
                  <label>
                    Nome do deck
                    <input name="name" maxLength={100} required defaultValue={selected.name} />
                  </label>
                  <label>
                    Formato
                    <select name="format" defaultValue={selected.format}>
                      <option value="casual">Casual</option>
                      {selected.game === 'pokemon' ? (
                        <>
                          <option value="standard">Padrão (Standard)</option>
                          <option value="expanded">Expandido</option>
                        </>
                      ) : (
                        <option value="advanced">TCG Avançado</option>
                      )}
                    </select>
                  </label>
                </div>
                <label>
                  Descrição
                  <textarea
                    name="description"
                    maxLength={1000}
                    defaultValue={selected.description}
                    placeholder="Qual é a ideia da sua estratégia?"
                  />
                </label>
                <div className="deck-visibility">
                  <label>
                    Visibilidade
                    <select name="visibility" defaultValue={selected.visibility}>
                      <option value="private">Privado · somente eu</option>
                      <option value="public">Público · acessível pelo link</option>
                    </select>
                  </label>
                  <button className="button button-gold" disabled={busy}>
                    <Check size={16} />
                    Salvar deck
                  </button>
                </div>
              </form>
            ) : (
              <div className="deck-read-heading">
                <span className="eyebrow">
                  {gameLabels[selected.game]} · {selected.format}
                </span>
                <h2>{selected.name}</h2>
                <p className="muted">
                  {selected.description || 'Uma nova estratégia para a comunidade.'}
                </p>
              </div>
            )}
            <div className="deck-toolbar">
              {editable && (
                <button
                  className="button button-gold"
                  disabled={busy}
                  onClick={() => setPicker(true)}
                >
                  <Plus size={16} />
                  Adicionar carta
                </button>
              )}
              <button className="button" onClick={download}>
                <Download size={16} />
                Exportar lista
              </button>
              <button className="button" onClick={() => void share()}>
                <Share2 size={16} />
                Compartilhar
              </button>
              {user && (
                <button className="button" disabled={busy} onClick={() => void duplicate()}>
                  <Copy size={16} />
                  Duplicar
                </button>
              )}
              {editable && (
                <button
                  className="icon-button danger"
                  aria-label="Excluir deck"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
            {validation && (
              <div className={`deck-validation ${validation.errors.length ? '' : 'valid'}`}>
                <strong>
                  {validation.total} cartas ·{' '}
                  {selected.game === 'pokemon'
                    ? 'Pokémon TCG'
                    : `Main ${validation.totals.main} / Extra ${validation.totals.extra} / Side ${validation.totals.side}`}
                </strong>
                {validation.errors.length ? (
                  <ul>
                    {validation.errors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Estrutura básica completa.</p>
                )}
                <small>
                  Rascunhos podem ser salvos a qualquer momento. A validação confere composição e
                  cópias; banlists, rotações e restrições especiais dos efeitos precisam ser
                  verificadas nas regras oficiais do formato.
                </small>
              </div>
            )}
            {loading ? (
              <Spinner />
            ) : !lines.length ? (
              <div className="empty-inline">
                <p>Este deck ainda não tem cartas.</p>
                {editable && (
                  <button className="text-link" onClick={() => setPicker(true)}>
                    Buscar no catálogo <Plus size={15} />
                  </button>
                )}
              </div>
            ) : (
              <div className="deck-lines">
                {(['main', 'extra', 'side'] as const).map((section) => {
                  const sectionLines = lines.filter((line) => line.section === section);
                  if (!sectionLines.length) return null;
                  return (
                    <div className="deck-section" key={section}>
                      <h3>
                        {section === 'main'
                          ? 'Deck principal'
                          : section === 'extra'
                            ? 'Extra Deck'
                            : 'Side Deck'}{' '}
                        <span>{validation?.totals[section]}</span>
                      </h3>
                      {sectionLines.map((line) => {
                        const ownCount = owned
                          .filter(
                            (item) =>
                              (item.game || 'yugioh') === selected.game &&
                              String(item.card_id) === line.card_id,
                          )
                          .reduce((total, item) => total + item.quantity, 0);
                        return (
                          <div className="deck-line" key={line.id}>
                            <button
                              className="deck-card-info"
                              onClick={() => setDetail(line.card_data)}
                            >
                              <img src={cardImage(line.card_id, selected.game)} alt="" />
                              <span>
                                <strong>{displayCardName(line.card_data)}</strong>
                                <small>
                                  {line.card_data.set_id
                                    ? `${line.card_data.set_id} · ${line.card_data.local_id}`
                                    : line.card_id}
                                </small>
                                {user && (
                                  <small className={ownCount >= line.quantity ? 'deck-owned' : ''}>
                                    Na coleção: {ownCount} · Faltam:{' '}
                                    {Math.max(0, line.quantity - ownCount)}
                                  </small>
                                )}
                              </span>
                            </button>
                            {editable ? (
                              <div className="deck-line-controls">
                                {selected.game === 'yugioh' && (
                                  <select
                                    aria-label={`Seção de ${line.card_name}`}
                                    value={line.section}
                                    disabled={busy}
                                    onChange={(e) =>
                                      void updateLine(
                                        line,
                                        line.quantity,
                                        e.target.value as DeckCard['section'],
                                      )
                                    }
                                  >
                                    <option value="main">Main</option>
                                    <option value="extra">Extra</option>
                                    <option value="side">Side</option>
                                  </select>
                                )}
                                <button
                                  className="icon-button"
                                  disabled={busy}
                                  aria-label={`Diminuir ${line.card_name}`}
                                  onClick={() => void updateLine(line, line.quantity - 1)}
                                >
                                  −
                                </button>
                                <strong>{line.quantity}×</strong>
                                <button
                                  className="icon-button"
                                  disabled={busy || line.quantity >= 999}
                                  aria-label={`Aumentar ${line.card_name}`}
                                  onClick={() => void updateLine(line, line.quantity + 1)}
                                >
                                  +
                                </button>
                                <button
                                  className="icon-button"
                                  disabled={busy}
                                  aria-label={`Remover ${line.card_name} do deck`}
                                  onClick={() => void updateLine(line, 0)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            ) : (
                              <strong>{line.quantity}×</strong>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
      {creating && (
        <Modal title={`Novo deck de ${gameLabels[game]}`} onClose={() => setCreating(false)}>
          <form className="form" onSubmit={create}>
            <label>
              Nome do deck
              <input
                name="name"
                autoFocus
                required
                maxLength={100}
                placeholder="Ex.: Minha próxima estratégia"
              />
            </label>
            <p className="field-hint">
              O deck começa como rascunho privado. Cartas de outros jogos ficam em listas separadas.
            </p>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-gold full-width" disabled={busy}>
              {busy ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}Criar deck
            </button>
          </form>
        </Modal>
      )}
      {picker && selected && (
        <CardSearchModal
          game={selected.game}
          onClose={() => setPicker(false)}
          onSelect={(card) => void addCard(card)}
        />
      )}
      {detail && (
        <CardDetail
          card={detail}
          addLabel="Adicionar ao deck"
          hideAdd={!editable}
          onClose={() => setDetail(null)}
          onAdd={() => {
            const card = detail;
            setDetail(null);
            if (editable) void addCard(card);
          }}
        />
      )}
      {deleting && (
        <Modal title="Excluir este deck?" onClose={() => setDeleting(false)}>
          <p className="muted">A lista será excluída. Suas cartas na coleção continuam com você.</p>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="trade-buttons">
            <button className="button" onClick={() => setDeleting(false)}>
              Voltar
            </button>
            <button className="button button-gold" disabled={busy} onClick={() => void remove()}>
              Excluir deck
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
