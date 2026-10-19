'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Heart,
  Layers3,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import type { Card, CollectionItem } from '@/types';
import { cardImage, conditions, frameLabel, friendlyError, initials } from '@/lib/utils';
import { displayCardName } from '@/lib/catalog';
import { createClient } from '@/lib/supabase/client';
import { useApp } from './providers';
import { Modal } from './ui';
export function CardTile({
  card,
  onClick,
  onAdd,
  item,
  catalogLabel = 'No catálogo',
}: {
  card: Card;
  onClick: () => void;
  onAdd?: (card: Card) => void;
  item?: CollectionItem;
  catalogLabel?: string;
}) {
  const { user, wishes, refresh, toast } = useApp(),
    router = useRouter();
  const saved = wishes.some((w) => w.card_id === card.id),
    [busy, setBusy] = useState(false);
  async function wish() {
    if (!user) {
      router.push('/login?next=/desejos');
      return;
    }
    const client = createClient();
    if (!client) return;
    setBusy(true);
    const { error } = saved
      ? await client.from('wishlists').delete().eq('user_id', user.id).eq('card_id', card.id)
      : await client.from('wishlists').insert({
          user_id: user.id,
          card_id: card.id,
          card_name: card.name,
          card_type: card.type,
        });
    setBusy(false);
    if (error) toast(friendlyError(error.message), true);
    else {
      await refresh();
      toast(saved ? 'Carta removida dos desejos.' : 'Carta adicionada à lista de desejos.');
    }
  }
  return (
    <article className={`card-tile frame-${card.frameType || 'effect'}`}>
      <div className="card-art-wrap">
        <button
          className="card-art-button"
          onClick={onClick}
          aria-label={`Ver ${displayCardName(card)}`}
        >
          <img
            className="card-art"
            src={cardImage(card.card_images?.[0]?.id || card.id)}
            alt={displayCardName(card)}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/card-back.svg';
            }}
          />
          <div className="foil" />
        </button>
        <span className="card-kind">{frameLabel(card.type)}</span>
        <button
          className={`wish-button ${saved ? 'saved' : ''}`}
          disabled={busy}
          aria-label={`${saved ? 'Remover' : 'Adicionar'} ${displayCardName(card)} ${saved ? 'dos' : 'aos'} desejos`}
          onClick={wish}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {item && <span className="condition-badge">{item.condition}</span>}
      </div>
      <div className="card-meta">
        <small>{card.archetype || card.race || 'YU-GI-OH! TCG'}</small>
        <button className="card-name" onClick={onClick}>
          {displayCardName(card)}
        </button>
        <span className="card-original-name">{card.name}</span>
        <div className="card-bottom">
          {item ? (
            <span className="card-owner">
              <span className="micro-avatar">{initials(item.profiles?.display_name || 'D')}</span>
              {item.profiles?.display_name || 'Duelista'}
            </span>
          ) : (
            <span className="catalog-label">
              <span className="availability-dot" />
              {catalogLabel}
            </span>
          )}
          <button
            className="card-add"
            aria-label={`${item ? 'Propor troca de' : 'Adicionar à coleção:'} ${displayCardName(card)}`}
            onClick={() => onAdd?.(card)}
          >
            {item ? <ArrowUpRight size={17} /> : <Plus size={18} />}
          </button>
        </div>
      </div>
    </article>
  );
}
export function CardDetail({
  card,
  onClose,
  onAdd,
}: {
  card: Card;
  onClose: () => void;
  onAdd: () => void;
}) {
  return (
    <Modal title="Detalhes da carta" onClose={onClose} wide>
      <div className="card-detail">
        <div className="detail-illustration">
          <img src={cardImage(card.card_images?.[0]?.id || card.id)} alt={card.name} />
          <span className="holo-caption">
            <Sparkles size={13} /> Cada carta, uma nova possibilidade.
          </span>
        </div>
        <div>
          <span className="eyebrow">
            {frameLabel(card.type)} · {card.race}
          </span>
          <h2>{displayCardName(card)}</h2>
          <p className="muted">{card.name}</p>
          <div className="detail-stats">
            {card.attribute && (
              <span>
                Atributo<strong>{card.attribute}</strong>
              </span>
            )}
            {card.level !== undefined && (
              <span>
                Nível
                <strong>
                  <Star size={13} />
                  {card.level}
                </strong>
              </span>
            )}
            {card.atk !== undefined && (
              <span>
                ATK<strong>{card.atk}</strong>
              </span>
            )}
            {card.def !== undefined && (
              <span>
                DEF<strong>{card.def}</strong>
              </span>
            )}
          </div>
          <h3>Sobre a carta</h3>
          <p className="card-description">{card.desc}</p>
          {card.archetype && <span className="tag">{card.archetype}</span>}
          <p className="field-hint">
            Texto original do catálogo YGOPRODeck. Os nomes em português são exibidos quando
            disponíveis.
          </p>
          <button className="button button-gold full-width" onClick={onAdd}>
            <Plus size={17} /> Adicionar à minha coleção
          </button>
        </div>
      </div>
    </Modal>
  );
}
export function AddCardModal({
  card,
  onClose,
  onSaved,
  item,
}: {
  card: Card;
  onClose: () => void;
  onSaved: () => void;
  item?: CollectionItem;
}) {
  const { user, toast } = useApp(),
    router = useRouter();
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      router.push('/login?next=/colecao');
      return;
    }
    const client = createClient();
    if (!client) return;
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const values = {
      user_id: user.id,
      card_id: card.id,
      card_name: card.name,
      card_type: card.type,
      quantity: Number(form.get('quantity')),
      condition: String(form.get('condition')),
      language: String(form.get('language')),
      rarity: String(form.get('rarity')),
      set_code: String(form.get('set_code')).trim(),
      notes: String(form.get('notes')).trim(),
      for_trade: form.get('for_trade') === 'on',
    };
    const { error } = item
      ? await client
          .from('collection_items')
          .update(values)
          .eq('id', item.id)
          .eq('user_id', user.id)
      : await client.from('collection_items').insert(values);
    setBusy(false);
    if (error)
      toast(/reservada/.test(error.message) ? error.message : friendlyError(error.message), true);
    else {
      toast(item ? 'Carta atualizada.' : 'Carta adicionada à sua coleção!');
      onSaved();
      onClose();
    }
  }
  return (
    <Modal title={item ? 'Editar carta' : 'Uma nova carta na sua coleção'} onClose={onClose}>
      <div className="selected-card">
        <img src={cardImage(card.id)} alt="" />
        <div>
          <span className="eyebrow">{frameLabel(card.type)}</span>
          <h3>{displayCardName(card)}</h3>
          <p>{card.name}</p>
        </div>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <label>
            Quantidade
            <input
              name="quantity"
              type="number"
              min="1"
              max="999"
              required
              defaultValue={item?.quantity || 1}
            />
          </label>
          <label>
            Conservação
            <select name="condition" defaultValue={item?.condition || 'NM'}>
              {Object.entries(conditions).map(([v, t]) => (
                <option key={v} value={v}>
                  {v} · {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Idioma
            <select name="language" defaultValue={item?.language || 'PT'}>
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
              }).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Raridade
            <input
              name="rarity"
              list="rarities"
              maxLength={100}
              defaultValue={item?.rarity || card.card_sets?.[0]?.set_rarity || 'Common'}
              required
            />
            <datalist id="rarities">
              {[
                'Common',
                'Rare',
                'Super Rare',
                'Ultra Rare',
                'Secret Rare',
                'Quarter Century Secret Rare',
                'Starlight Rare',
              ].map((t) => (
                <option key={t} />
              ))}
            </datalist>
          </label>
        </div>
        <label>
          Código da edição <span className="optional">opcional</span>
          <input
            name="set_code"
            placeholder="Ex.: LOB-001"
            maxLength={40}
            defaultValue={item?.set_code || ''}
          />
        </label>
        <label>
          Observações <span className="optional">opcional</span>
          <textarea
            name="notes"
            placeholder="Conte um pouco sobre o estado da sua carta…"
            maxLength={500}
            defaultValue={item?.notes || ''}
          />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" name="for_trade" defaultChecked={item?.for_trade ?? true} />
          <span>
            Disponível para troca<small>Outros duelistas poderão encontrar esta carta.</small>
          </span>
        </label>
        <button className="button button-gold full-width" disabled={busy}>
          {busy ? <Loader2 className="spin" size={17} /> : <Check size={17} />}{' '}
          {item ? 'Salvar alterações' : 'Adicionar à coleção'}
        </button>
      </form>
    </Modal>
  );
}
export function CardSearchModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (card: Card) => void;
}) {
  const [query, setQuery] = useState(''),
    [results, setResults] = useState<Card[]>([]),
    [busy, setBusy] = useState(false),
    [searched, setSearched] = useState(false);
  const { toast } = useApp();
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSearched(true);
    try {
      const r = await fetch(`/api/cards?q=${encodeURIComponent(query)}`);
      if (!r.ok) throw Error();
      const d = await r.json();
      setResults(d.data);
    } catch {
      toast('Não foi possível consultar o catálogo.', true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Encontre sua carta no catálogo" onClose={onClose}>
      <form onSubmit={search} className="inline-search">
        <Search size={18} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome da carta em português ou inglês"
          minLength={2}
          required
        />
        <button
          className="button button-gold button-small"
          disabled={busy}
          aria-label="Buscar cartas no catálogo"
        >
          {busy ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
        </button>
      </form>
      <p className="field-hint">
        Busque no catálogo completo de Yu-Gi-Oh! pelo nome da carta. Para mais resultados, use o
        nome em inglês.
      </p>
      <div className="search-results">
        {results.map((c) => (
          <button className="search-result" key={c.id} onClick={() => onSelect(c)}>
            <img src={cardImage(c.id)} alt="" />
            <span>
              <strong>{displayCardName(c)}</strong>
              <small>
                {c.name} · {frameLabel(c.type)}
              </small>
            </span>
            <Plus size={19} />
          </button>
        ))}
        {searched && !busy && results.length === 0 && (
          <p className="muted">Nenhuma carta encontrada. Tente outro nome.</p>
        )}
      </div>
    </Modal>
  );
}
export function ProposeModal({
  requested,
  onClose,
}: {
  requested: CollectionItem;
  onClose: () => void;
}) {
  const { user, toast } = useApp(),
    router = useRouter();
  const [items, setItems] = useState<CollectionItem[] | null>(null),
    [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    const client = createClient();
    if (client)
      void client
        .from('collection_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('for_trade', true)
        .gt('quantity', 0)
        .then(({ data, error }) => {
          if (error) toast('Não foi possível carregar suas cartas.', true);
          setItems(data || []);
        });
  }, [user, toast]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const client = createClient();
    if (!client || !user) return;
    setBusy(true);
    const { data, error } = await client.rpc('create_trade', {
      offered_id: selected,
      requested_id: requested.id,
      introduction: new FormData(e.currentTarget).get('message') || '',
    });
    setBusy(false);
    if (error)
      toast(
        /reservada|disponív/.test(error.message) ? error.message : friendlyError(error.message),
        true,
      );
    else {
      toast('Proposta enviada. Boa troca!');
      router.push(`/trocas/${data}`);
      onClose();
    }
  }
  return (
    <Modal title="Uma nova conexão começa aqui" onClose={onClose}>
      <div className="selected-card">
        <img src={cardImage(requested.card_id)} alt="" />
        <div>
          <span className="eyebrow">VOCÊ RECEBE</span>
          <h3>{requested.card_name}</h3>
          <p>
            {requested.condition} · {requested.rarity} · {requested.language}
          </p>
        </div>
      </div>
      {!user ? (
        <p>
          Entre na sua conta para propor uma troca. <a href="/login">Entrar</a>
        </p>
      ) : items?.length === 0 ? (
        <div className="empty-inline">
          <p>Adicione uma carta disponível para troca à sua coleção.</p>
          <a href="/colecao" className="button button-gold">
            Montar minha coleção
          </a>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>
            Qual carta você oferece?
            <select required value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Selecione uma carta da sua coleção</option>
              {items?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.card_name} · {i.condition} · {i.rarity}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sua mensagem
            <textarea
              name="message"
              placeholder="Olá! Que tal combinarmos uma troca?"
              maxLength={2000}
            />
          </label>
          <p className="info-note">
            <ShieldCheck size={18} /> Uma carta de cada lado. Combine os detalhes e um ponto de
            encontro pelo chat da proposta.
          </p>
          <button className="button button-gold full-width" disabled={busy || !selected}>
            {busy ? <Loader2 className="spin" size={17} /> : <ArrowLeftRight size={17} />}Enviar
            proposta
          </button>
        </form>
      )}
    </Modal>
  );
}
