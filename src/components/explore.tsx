'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Layers3, Loader2, Search, X } from 'lucide-react';
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
import { DesignIcon, PixelArt, RibbonLabel, type DesignIconName } from './pixel-design';
const yugiohCategories = [
  { id: '', label: 'Todas as cartas', icon: 'cards-three' },
  { id: 'monster', label: 'Monstros', icon: 'sword' },
  { id: 'spell', label: 'Magias', icon: 'magic-wand' },
  { id: 'trap', label: 'Armadilhas', icon: 'shield' },
  { id: 'fusion', label: 'Fusão', icon: 'intersect' },
  { id: 'synchro', label: 'Sincro', icon: 'circles-three' },
  { id: 'xyz', label: 'Xyz', icon: 'stack' },
  { id: 'link', label: 'Link', icon: 'link' },
] satisfies { id: string; label: string; icon: DesignIconName }[];
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
          { id: '', label: 'Todas as cartas', icon: 'cards-three' as const },
          { id: 'Pokemon', label: 'Pokémon', icon: 'pokemon' as const },
          { id: 'Trainer', label: 'Treinadores', icon: 'cards' as const },
          { id: 'Energy', label: 'Energias', icon: 'sparkle' as const },
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
      <section className="pixel-hero" aria-labelledby="hero-heading">
        <picture>
          <source media="(max-width: 767px)" srcSet="/brand/pixel/band-top-mobile.svg" />
          <img
            className="pixel-band top"
            src="/brand/pixel/band-top.svg"
            alt=""
            aria-hidden="true"
          />
        </picture>
        <div className="pixel-aura left" />
        <div className="pixel-aura right" />
        <PixelArt name="orbit" className="pixel-orbit" />
        <PixelArt name="tiles" className="pixel-tiles left" />
        <PixelArt name="tiles" className="pixel-tiles right" />
        <div className="pixel-hero-card left" aria-hidden="true">
          <PixelArt name="panel-hero" />
          <img
            src={game === 'pokemon' ? cardImage('base1-2', 'pokemon') : '/cards/46986414.jpg'}
            alt=""
          />
        </div>
        <div className="pixel-hero-card right" aria-hidden="true">
          <PixelArt name="panel-hero" />
          <img
            src={game === 'pokemon' ? cardImage('base1-4', 'pokemon') : '/cards/89631139.jpg'}
            alt=""
          />
        </div>
        <PixelArt name="star" className="pixel-spark a" />
        <PixelArt name="star" className="pixel-spark b" />
        <div className="pixel-hero-copy">
          <div className="eyebrow">O PONTO DE ENCONTRO DOS DUELISTAS</div>
          <div className="pixel-hero-tag">SUA COLEÇÃO TEM NOVAS POSSIBILIDADES</div>
          <h1 id="hero-heading">
            Sua próxima carta.<span>Sua próxima conexão.</span>
          </h1>
          <p>
            Cartas que você tem. Cartas que você quer.
            <br />
            Yu-Gi-Oh! e Pokémon na comunidade de Lagarto.
          </p>
          <div className="hero-actions">
            <a href="#explorar" className="pixel-ribbon primary">
              <RibbonLabel primary icon="cards">
                Explorar cartas
              </RibbonLabel>
            </a>
            <Link href={user ? '/colecao' : '/cadastro'} className="pixel-ribbon secondary">
              <RibbonLabel icon="cards-three">Montar minha coleção</RibbonLabel>
            </Link>
          </div>
          <div className="pixel-hero-proof">
            <DesignIcon name="seal-check" size={16} />
            <span>Uma comunidade local. Infinitas possibilidades.</span>
          </div>
        </div>
        <div className="pixel-match">
          <PixelArt name="panel-match" />
          <span className="pixel-match-icon">
            <DesignIcon name="sparkle" size={22} />
          </span>
          <div>
            <strong>O match perfeito existe.</strong>
            <small>Encontre a peça que falta no seu deck.</small>
          </div>
        </div>
        <span className="pixel-coordinate">35° · 10°55′ S · 37°39′ O</span>
        <span className="pixel-location">LAGARTO, SERGIPE</span>
        <picture>
          <source media="(max-width: 767px)" srcSet="/brand/pixel/band-bottom-mobile.svg" />
          <img
            className="pixel-band bottom"
            src="/brand/pixel/band-bottom.svg"
            alt=""
            aria-hidden="true"
          />
        </picture>
      </section>
      <div className="stats-strip">
        <div>
          <span className="stat-icon gold-soft">
            <DesignIcon name="cards-three" size={21} />
          </span>
          <span>
            <strong>Todo o universo TCG</strong>
            <small>Catálogo de {gameLabels[game]}</small>
          </span>
        </div>
        <div>
          <span className="stat-icon cyan-soft">
            <DesignIcon name="arrows-clockwise" size={21} />
          </span>
          <span>
            <strong>{stats.cards} cartas para trocar</strong>
            <small>Disponíveis na comunidade</small>
          </span>
        </div>
        <div>
          <span className="stat-icon purple-soft">
            <DesignIcon name="users-three" size={21} />
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
          <DesignIcon name="arrow-up-right" size={17} />
        </Link>
      </div>
      <section id="explorar" className="catalog-section">
        <div className="catalog-title">
          <div>
            <span className="eyebrow">DESCUBRA. COLECIONE. CONECTE.</span>
            <h2>
              Encontre sua próxima carta<span>.</span>
            </h2>
            <p>A peça que falta no seu deck pode estar mais perto do que você imagina.</p>
          </div>
          <Link href="/desejos" className="text-link">
            <DesignIcon name="heart" size={16} /> Minha lista de desejos{' '}
            <DesignIcon name="arrow-up-right" size={15} />
          </Link>
        </div>
        <GameSwitch pixel />
        <div className="catalog-tabs">
          <div>
            <button
              onClick={() => setLocal(false)}
              aria-pressed={!local}
              className={!local ? 'selected' : ''}
            >
              <DesignIcon name="cards" size={16} />
              Explorar catálogo
            </button>
            <button
              onClick={() => setLocal(true)}
              aria-pressed={local}
              className={local ? 'selected' : ''}
            >
              <DesignIcon name="map-pin" size={16} />
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
            <DesignIcon name="magnifying-glass" size={19} />
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
              <span className="control-label">Buscar</span>
            </button>
          </form>
          <button
            className={`button filter-button ${filters ? 'filter-active' : ''}`}
            onClick={() => setFilters(!filters)}
            aria-expanded={filters}
            aria-controls="catalog-expanded-filters"
          >
            <RibbonLabel icon="faders-horizontal">Filtros</RibbonLabel>
            {attribute && <i className="tiny-dot" />}
          </button>
          <label className="sort-select">
            <span className="sr-only">Ordenar cartas</span>
            <span className="ribbon-icon purple">
              <DesignIcon name="arrow-down" size={18} />
            </span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Nome: A a Z</option>
              <option value="name_desc">Nome: Z a A</option>
            </select>
            <DesignIcon name="caret-down" size={14} />
          </label>
        </div>
        {filters && (
          <div className="expanded-filters" id="catalog-expanded-filters">
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
          {categories.map(({ id, label, icon }) => (
            <button
              key={id}
              className={type === id ? 'active' : ''}
              onClick={() => setType(id)}
              aria-pressed={type === id}
            >
              <RibbonLabel primary icon={icon}>
                {label}
              </RibbonLabel>
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
          <p className="catalog-coverage">
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
                      pixel
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
                  <CardTile
                    pixel
                    key={c.id}
                    card={c}
                    onClick={() => setDetail(c)}
                    onAdd={addCard}
                  />
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
                <RibbonLabel icon="arrow-down">
                  {loading && <Loader2 className="spin" size={16} />}Descobrir mais cartas
                </RibbonLabel>
              </button>
            )}
          </>
        )}
      </section>
      <section className="pixel-closing">
        <PixelArt name="transition" className="pixel-transition" />
        <div className="pixel-wrap">
          <div className="pixel-closing-copy">
            <span className="eyebrow">CONNECT. TRADE. DUEL.</span>
            <h3>O seu repetido pode ser o desejo de alguém.</h3>
            <p>Organize sua coleção e deixe as conexões acontecerem.</p>
          </div>
          <Link className="pixel-ribbon primary" href={user ? '/colecao' : '/cadastro'}>
            <RibbonLabel primary icon="cards-three">
              Começar minha coleção
            </RibbonLabel>
          </Link>
        </div>
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
