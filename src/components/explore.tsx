'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ArrowLeftRight,
  BookOpen,
  ChevronDown,
  Compass,
  Filter,
  Heart,
  Layers3,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { Card, CollectionItem } from '@/types';
import {
  featuredCards,
  collectionCard,
  displayCardName,
  gameLabels,
  normalizeSearch,
} from '@/lib/catalog';
import { cardImage } from '@/lib/utils';
import { GameSwitch } from './game-switch';
import { createClient } from '@/lib/supabase/client';
import { useApp } from './providers';
import { CardTile, CardDetail, AddCardModal, ProposeModal } from './cards';
import { Empty } from './ui';
const yugiohCategories = [
  { id: '', label: 'Todas as cartas', icon: Layers3 },
  { id: 'monster', label: 'Monstros', icon: Zap },
  { id: 'spell', label: 'Magias', icon: Sparkles },
  { id: 'trap', label: 'Armadilhas', icon: ShieldCheck },
  { id: 'fusion', label: 'Fusão', icon: ArrowLeftRight },
  { id: 'synchro', label: 'Sincro', icon: Compass },
  { id: 'xyz', label: 'Xyz', icon: Layers3 },
  { id: 'link', label: 'Link', icon: ArrowUpRight },
];
export function Explore() {
  const { user, toast, game } = useApp(),
    [cards, setCards] = useState<Card[]>(featuredCards.slice(0, 12)),
    [query, setQuery] = useState(''),
    [type, setType] = useState(''),
    [attribute, setAttribute] = useState(''),
    [sort, setSort] = useState('name'),
    [local, setLocal] = useState(false),
    [filters, setFilters] = useState(false),
    [localItems, setLocalItems] = useState<CollectionItem[]>([]),
    [loading, setLoading] = useState(false),
    [more, setMore] = useState(true),
    [offset, setOffset] = useState(0),
    [total, setTotal] = useState(0),
    [catalogInfo, setCatalogInfo] = useState(''),
    [detail, setDetail] = useState<Card | null>(null),
    [add, setAdd] = useState<Card | null>(null),
    [proposal, setProposal] = useState<CollectionItem | null>(null),
    [stats, setStats] = useState({ people: 0, cards: 0, trades: 0 });
  const controller = useRef<AbortController | null>(null);
  const refreshStats = useCallback(async () => {
    const client = createClient();
    if (!client) return;
    const [p, c] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }),
      client
        .from('collection_items')
        .select('id', { count: 'exact', head: true })
        .eq('for_trade', true)
        .eq('game', game)
        .gt('quantity', 0),
    ]);
    if (!p.error && !c.error) setStats({ people: p.count || 0, cards: c.count || 0, trades: 0 });
  }, [game]);
  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);
  async function search(nextOffset = 0, append = false, searchQuery = query) {
    controller.current?.abort();
    const control = new AbortController();
    controller.current = control;
    setLoading(true);
    try {
      if (local) {
        const client = createClient();
        if (!client) {
          setLocalItems([]);
          return;
        }
        const q = client
          .from('collection_items')
          .select('*, profiles(*)')
          .eq('for_trade', true)
          .eq('game', game)
          .gt('quantity', 0)
          .abortSignal(control.signal)
          .order('created_at', { ascending: false });
        const { data, error } = await q;
        if (error) throw error;
        const filtered = (data || []).filter(
          (i) =>
            (!searchQuery || normalizeSearch(i.card_name).includes(normalizeSearch(searchQuery))) &&
            (!type ||
              (type === 'monster'
                ? /monster/i.test(i.card_type)
                : i.card_type.toLowerCase().includes(type.toLowerCase()))),
        );
        setLocalItems(filtered);
        setMore(false);
      } else {
        const r = await fetch(
          `/api/cards?game=${game}&q=${encodeURIComponent(searchQuery)}&type=${type}&attribute=${attribute}&offset=${nextOffset}&sort=${sort}`,
          { signal: control.signal },
        );
        if (!r.ok) throw Error();
        const d = await r.json();
        setCards((previous) => (append ? [...previous, ...d.data] : d.data));
        setMore(d.hasMore);
        setOffset(nextOffset);
        setTotal(d.total);
        setCatalogInfo(
          `${d.coverage?.imported?.toLocaleString('pt-BR') || ''} cartas · ${d.coverage?.withPortugueseName?.toLocaleString('pt-BR') || ''} nomes em português · catálogo de ${new Date(d.syncedAt).toLocaleDateString('pt-BR')}`,
        );
        if (d.fallback) toast('Catálogo temporariamente limitado. Exibindo cartas já salvas.');
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError'))
        toast('Não foi possível buscar as cartas. Tente novamente.', true);
    } finally {
      if (!control.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    setType('');
    setAttribute('');
    setCards([]);
    setOffset(0);
  }, [game]);
  useEffect(() => {
    void search();
    return () => controller.current?.abort();
  }, [game, type, local, attribute, sort]);
  const categories =
    game === 'pokemon'
      ? [
          { id: '', label: 'Todas as cartas', icon: Layers3 },
          { id: 'Pokemon', label: 'Pokémon', icon: Zap },
          { id: 'Trainer', label: 'Treinadores', icon: BookOpen },
          { id: 'Energy', label: 'Energias', icon: Sparkles },
        ]
      : yugiohCategories;
  function addCard(c: Card) {
    if (!user) {
      window.location.href = '/login?next=/colecao';
      return;
    }
    setAdd(c);
  }
  const displayed =
    sort === 'name'
      ? [...cards].sort((a, b) => displayCardName(a).localeCompare(displayCardName(b), 'pt-BR'))
      : cards;
  return (
    <div className="explore-page">
      <div className="welcome-line">
        <span>
          <span className="small-gold-dash" /> O PONTO DE ENCONTRO DOS DUELISTAS
        </span>
        <span>
          <MapPin size={13} /> LAGARTO, SERGIPE
        </span>
      </div>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-glow" />
        <div className="hero-copy">
          <div className="hero-tag">
            <span /> SUA COLEÇÃO TEM NOVAS POSSIBILIDADES
          </div>
          <h1>
            Sua próxima carta.
            <br />
            Sua próxima <span>conexão.</span>
          </h1>
          <p>
            Cartas que você tem. Cartas que você quer.
            <br />
            Yu-Gi-Oh! e Pokémon na comunidade de Lagarto.
          </p>
          <div className="hero-actions">
            <a href="#explorar" className="button button-gold">
              Explorar cartas <ArrowUpRight size={18} />
            </a>
            <Link href={user ? '/colecao' : '/cadastro'} className="button button-ghost">
              <PlusIcon />
              Montar minha coleção
            </Link>
          </div>
          <div className="hero-proof">
            <span className="hero-proof-icon">
              <ShieldCheck size={16} />
            </span>
            <span>Uma comunidade local. Infinitas possibilidades.</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <span className="orbital-star star-one">✧</span>
          <span className="orbital-star star-two">✦</span>
          <span className="hero-kanji">繋がる</span>
          <div className="floating-card card-behind-left">
            <img
              src={game === 'pokemon' ? cardImage('base1-2', 'pokemon') : '/cards/46986414.jpg'}
              alt=""
            />
          </div>
          <div className="floating-card card-behind-right">
            <img
              src={game === 'pokemon' ? cardImage('base1-15', 'pokemon') : '/cards/74677422.jpg'}
              alt=""
            />
          </div>
          <div className="floating-card card-in-front">
            <img
              src={game === 'pokemon' ? cardImage('base1-4', 'pokemon') : '/cards/89631139.jpg'}
              alt=""
            />
            <div className="hero-foil" />
          </div>
          <div className="floating-match">
            <span className="match-spark">
              <Sparkles size={17} />
            </span>
            <span>
              <strong>O match perfeito existe.</strong>
              <small>Encontre a peça que falta no seu deck.</small>
            </span>
            <CheckIcon />
          </div>
          <span className="visual-coordinate">35° · 10°55′ S · 37°39′ O</span>
        </div>
      </section>
      <div className="stats-strip">
        <div>
          <span className="stat-icon gold-soft">
            <Layers3 size={21} />
          </span>
          <span>
            <strong>Todo o universo TCG</strong>
            <small>Catálogo de {gameLabels[game]}</small>
          </span>
        </div>
        <div>
          <span className="stat-icon cyan-soft">
            <ArrowLeftRight size={21} />
          </span>
          <span>
            <strong>{stats.cards} cartas para trocar</strong>
            <small>Disponíveis na comunidade</small>
          </span>
        </div>
        <div>
          <span className="stat-icon purple-soft">
            <Users size={21} />
          </span>
          <span>
            <strong>
              {stats.people} {stats.people === 1 ? 'duelista conectado' : 'duelistas conectados'}
            </strong>
            <small>Novas conexões começam aqui</small>
          </span>
        </div>
        <Link href="/como-funciona">
          Como funciona
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <section id="explorar" className="catalog-section">
        <div className="catalog-title">
          <div>
            <span className="eyebrow">DESCUBRA. COLECIONE. CONECTE.</span>
            <h2>
              Encontre sua próxima carta<span className="gold-text">.</span>
            </h2>
            <p>A peça que falta no seu deck pode estar mais perto do que você imagina.</p>
          </div>
          <Link href="/desejos" className="text-link">
            <Heart size={16} /> Minha lista de desejos <ArrowUpRight size={15} />
          </Link>
        </div>
        <GameSwitch />
        <div className="catalog-tabs">
          <div>
            <button onClick={() => setLocal(false)} className={!local ? 'selected' : ''}>
              <Compass size={16} />
              Explorar catálogo
            </button>
            <button onClick={() => setLocal(true)} className={local ? 'selected' : ''}>
              <MapPin size={16} />
              Na comunidade <span className="tab-count">{stats.cards}</span>
            </button>
          </div>
          <span className="catalog-note">
            <span className="availability-dot" />
            {local
              ? 'Cartas de colecionadores de Lagarto'
              : `Catálogo ${game === 'pokemon' ? 'TCGdex' : 'YGOPRODeck'}`}
          </span>
        </div>
        <div className="catalog-controls">
          <form
            className="catalog-search"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <Search size={19} />
            <input
              aria-label="Buscar cartas"
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome em português, inglês, edição ou código…"
            />
            {query && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => {
                  setQuery('');
                  void search(0, false, '');
                }}
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" aria-label="Pesquisar cartas" className="catalog-search-submit">
              Buscar
            </button>
          </form>
          <button
            className={`button filter-button ${filters ? 'filter-active' : ''}`}
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={17} />
            Filtros{attribute && <i className="tiny-dot" />}
          </button>
          <label className="sort-select">
            <span className="sr-only">Ordenar cartas</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Nome: A a Z</option>
              <option value="name_desc">Nome: Z a A</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
        {filters && (
          <div className="expanded-filters">
            <label>
              {game === 'pokemon' ? 'Tipo Pokémon' : 'Atributo'}
              <select value={attribute} onChange={(e) => setAttribute(e.target.value)}>
                <option value="">Todos os atributos</option>
                {Object.entries(
                  game === 'pokemon'
                    ? {
                        Grass: 'Planta',
                        Fire: 'Fogo',
                        Water: 'Água',
                        Lightning: 'Elétrico',
                        Psychic: 'Psíquico',
                        Fighting: 'Lutador',
                        Darkness: 'Escuridão',
                        Metal: 'Metal',
                        Dragon: 'Dragão',
                        Colorless: 'Incolor',
                        Fairy: 'Fada',
                      }
                    : {
                        DARK: 'Trevas',
                        LIGHT: 'Luz',
                        EARTH: 'Terra',
                        WATER: 'Água',
                        FIRE: 'Fogo',
                        WIND: 'Vento',
                        DIVINE: 'Divino',
                      },
                ).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="text-link"
              onClick={() => {
                setAttribute('');
                setType('');
                setQuery('');
              }}
            >
              Limpar filtros <X size={14} />
            </button>
          </div>
        )}
        <div className="category-chips">
          {categories.map(({ id, label, icon: Icon }) => (
            <button key={id} className={type === id ? 'active' : ''} onClick={() => setType(id)}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <div className="results-caption">
          <span>
            {local
              ? `${localItems.length} cartas na comunidade`
              : `${total.toLocaleString('pt-BR')} cartas encontradas · ${displayed.length} exibidas`}
          </span>
          <span>Uma carta pode ser o começo de algo maior.</span>
        </div>
        {!local && catalogInfo && (
          <p className="field-hint catalog-coverage">
            {catalogInfo}. Cartas sem tradução mantêm o nome original.
          </p>
        )}
        {loading && offset === 0 ? (
          <div className="card-skeletons">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="card-skeleton" key={i} />
            ))}
          </div>
        ) : local ? (
          <>
            {localItems.length === 0 ? (
              <Empty
                icon={Layers3}
                title="As primeiras trocas começam com você."
                description="A comunidade está ganhando vida. Adicione suas cartas e ajude a conectar os primeiros duelistas de Lagarto."
                href={user ? '/colecao' : '/cadastro'}
                label="Adicionar minhas cartas"
              />
            ) : (
              <div className="cards-grid">
                {localItems.map((item) => {
                  const c = collectionCard(item);
                  return (
                    <CardTile
                      key={item.id}
                      card={c}
                      item={item}
                      onClick={() => setDetail(c)}
                      onAdd={() => {
                        if (item.user_id === user?.id) window.location.href = '/colecao';
                        else setProposal(item);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {displayed.length === 0 ? (
              <Empty
                icon={Search}
                title="Esta carta ainda não apareceu."
                description="Tente parte do nome em português ou inglês, o código da carta ou altere os filtros."
              />
            ) : (
              <div className="cards-grid">
                {displayed.map((c) => (
                  <CardTile key={c.id} card={c} onClick={() => setDetail(c)} onAdd={addCard} />
                ))}
              </div>
            )}
            {more && displayed.length > 0 && (
              <button
                className="button load-more"
                disabled={loading}
                onClick={() => {
                  void search(cards.length, true);
                }}
              >
                {loading ? <Loader2 className="spin" size={16} /> : <ArrowDown size={16} />}
                Descobrir mais cartas
              </button>
            )}
          </>
        )}
      </section>
      <section className="bottom-cta">
        <span className="cta-emblem">
          <ArrowLeftRight size={28} />
        </span>
        <div>
          <h3>O seu repetido pode ser o desejo de alguém.</h3>
          <p>Organize sua coleção e deixe as conexões acontecerem.</p>
        </div>
        <Link className="button button-gold" href={user ? '/colecao' : '/cadastro'}>
          Começar minha coleção <ArrowUpRight size={17} />
        </Link>
      </section>
      {detail && (
        <CardDetail
          card={detail}
          onClose={() => setDetail(null)}
          onAdd={() => {
            setDetail(null);
            addCard(detail);
          }}
        />
      )}
      {add && (
        <AddCardModal card={add} onClose={() => setAdd(null)} onSaved={() => void refreshStats()} />
      )}
      {proposal && <ProposeModal requested={proposal} onClose={() => setProposal(null)} />}
    </div>
  );
}
function PlusIcon() {
  return <span className="plus-icon">+</span>;
}
function CheckIcon() {
  return <span className="match-check">✓</span>;
}
