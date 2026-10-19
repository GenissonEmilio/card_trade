'use client';
import { useEffect, useRef, useState } from 'react';
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
import { featuredCards } from '@/lib/catalog';
import { createClient } from '@/lib/supabase/client';
import { useApp } from './providers';
import { CardTile, CardDetail, AddCardModal, ProposeModal } from './cards';
import { Empty } from './ui';
const categories = [
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
  const { user, toast } = useApp(),
    [cards, setCards] = useState<Card[]>(featuredCards.slice(0, 12)),
    [query, setQuery] = useState(''),
    [type, setType] = useState(''),
    [attribute, setAttribute] = useState(''),
    [sort, setSort] = useState('featured'),
    [local, setLocal] = useState(false),
    [filters, setFilters] = useState(false),
    [localItems, setLocalItems] = useState<CollectionItem[]>([]),
    [loading, setLoading] = useState(false),
    [more, setMore] = useState(true),
    [offset, setOffset] = useState(0),
    [detail, setDetail] = useState<Card | null>(null),
    [add, setAdd] = useState<Card | null>(null),
    [proposal, setProposal] = useState<CollectionItem | null>(null),
    [stats, setStats] = useState({ people: 0, cards: 0, trades: 0 });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const client = createClient();
    if (!client) return;
    void Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }),
      client
        .from('collection_items')
        .select('id', { count: 'exact', head: true })
        .eq('for_trade', true)
        .gt('quantity', 0),
    ]).then(([p, c]) => setStats({ people: p.count || 0, cards: c.count || 0, trades: 0 }));
  }, []);
  async function search(nextOffset = 0, append = false) {
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
        let q = client
          .from('collection_items')
          .select('*, profiles(*)')
          .eq('for_trade', true)
          .gt('quantity', 0)
          .order('created_at', { ascending: false });
        const { data, error } = await q;
        if (error) throw error;
        const filtered = (data || []).filter(
          (i) =>
            (!query || i.card_name.toLowerCase().includes(query.toLowerCase())) &&
            (!type ||
              (type === 'monster'
                ? !/spell|trap/i.test(i.card_type)
                : i.card_type.toLowerCase().includes(type))),
        );
        setLocalItems(filtered);
        setMore(false);
      } else {
        const r = await fetch(
          `/api/cards?q=${encodeURIComponent(query)}&type=${type}&attribute=${attribute}&offset=${nextOffset}`,
          { signal: control.signal },
        );
        if (!r.ok) throw Error();
        const d = await r.json();
        setCards((previous) => (append ? [...previous, ...d.data] : d.data));
        setMore(d.hasMore);
        setOffset(nextOffset);
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
    if (!type && !local && !attribute && !query) {
      setCards(featuredCards.slice(0, 12));
      setMore(true);
      setOffset(0);
      return;
    }
    void search();
    return () => controller.current?.abort(); /* Changes to the query are submitted explicitly. */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, local, attribute]);
  function addCard(c: Card) {
    if (!user) {
      window.location.href = '/login?next=/colecao';
      return;
    }
    setAdd(c);
  }
  const displayed =
    sort === 'name' ? [...cards].sort((a, b) => a.name.localeCompare(b.name)) : cards;
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
            Conecte-se com duelistas de Lagarto e faça a troca acontecer.
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
            <img src="/cards/46986414.jpg" alt="" />
          </div>
          <div className="floating-card card-behind-right">
            <img src="/cards/74677422.jpg" alt="" />
          </div>
          <div className="floating-card card-in-front">
            <img src="/cards/89631139.jpg" alt="" />
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
            <small>Catálogo completo de Yu-Gi-Oh!</small>
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
            {local ? 'Cartas de duelistas de Lagarto' : 'Atualizado com YGOPRODeck'}
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busque uma carta, um arquétipo, uma nova possibilidade…"
            />
            {query && (
              <button type="button" aria-label="Limpar busca" onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            )}
            <kbd>↵</kbd>
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
              <option value="featured">Em destaque</option>
              <option value="name">Nome: A a Z</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
        {filters && (
          <div className="expanded-filters">
            <label>
              Atributo
              <select value={attribute} onChange={(e) => setAttribute(e.target.value)}>
                <option value="">Todos os atributos</option>
                {Object.entries({
                  DARK: 'Trevas',
                  LIGHT: 'Luz',
                  EARTH: 'Terra',
                  WATER: 'Água',
                  FIRE: 'Fogo',
                  WIND: 'Vento',
                  DIVINE: 'Divino',
                }).map(([v, t]) => (
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
              : `${displayed.length} cartas para você descobrir`}
          </span>
          <span>Uma carta pode ser o começo de algo maior.</span>
        </div>
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
                  const c = featuredCards.find((c) => c.id === item.card_id) || {
                    id: item.card_id,
                    name: item.card_name,
                    type: item.card_type,
                    frameType: 'effect',
                    race: 'Yu-Gi-Oh! TCG',
                    desc: '',
                    card_images: [
                      {
                        id: item.card_id,
                        image_url: '',
                        image_url_small: '',
                        image_url_cropped: '',
                      },
                    ],
                  };
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
                description="Tente outro nome, busque pelo nome em inglês ou altere os filtros."
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
                  if (!type && !query && !attribute && cards.length === 12) {
                    setCards(featuredCards);
                    setMore(true);
                  } else void search(offset + 24, true);
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
      {add && <AddCardModal card={add} onClose={() => setAdd(null)} onSaved={() => {}} />}
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
