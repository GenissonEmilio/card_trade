'use client';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Heart, Layers3, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from './providers';
import { Empty, PageTitle, Protected, Spinner, Modal } from './ui';
import { createClient } from '@/lib/supabase/client';
import { featuredCards } from '@/lib/catalog';
import { friendlyError } from '@/lib/utils';
import { AddCardModal, CardDetail, CardSearchModal, CardTile } from './cards';
import type { Card, CollectionItem, Wish } from '@/types';
function isCollection(item: CollectionItem | Wish): item is CollectionItem {
  return 'quantity' in item;
}
export function itemCard(item: { card_id: number; card_name: string; card_type: string }): Card {
  return (
    featuredCards.find((c) => c.id === item.card_id) || {
      id: item.card_id,
      name: item.card_name,
      type: item.card_type,
      frameType: /spell/i.test(item.card_type)
        ? 'spell'
        : /trap/i.test(item.card_type)
          ? 'trap'
          : 'effect',
      race: 'Yu-Gi-Oh! TCG',
      desc: 'Consulte o catálogo para ver o texto completo desta carta.',
      card_images: [
        { id: item.card_id, image_url: '', image_url_small: '', image_url_cropped: '' },
      ],
    }
  );
}
export function Library({ wishlist = false }: { wishlist?: boolean }) {
  return (
    <div className="page-content">
      <Protected>
        <LibraryContent wishlist={wishlist} />
      </Protected>
    </div>
  );
}
function LibraryContent({ wishlist }: { wishlist: boolean }) {
  const { user, wishes, refresh, toast } = useApp(),
    params = useSearchParams();
  const [items, setItems] = useState<CollectionItem[]>([]),
    [loading, setLoading] = useState(!wishlist),
    [query, setQuery] = useState(''),
    [picker, setPicker] = useState(params.get('adicionar') === '1'),
    [add, setAdd] = useState<Card | null>(null),
    [editing, setEditing] = useState<CollectionItem | undefined>(),
    [detail, setDetail] = useState<Card | null>(null),
    [deleting, setDeleting] = useState<CollectionItem | null>(null),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState('all');
  const load = useCallback(async () => {
    if (!user || wishlist) return;
    const client = createClient();
    if (!client) return;
    setLoading(true);
    const { data, error } = await client
      .from('collection_items')
      .select('*')
      .eq('user_id', user.id)
      .gt('quantity', 0)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) toast('Não foi possível carregar sua coleção.', true);
    else setItems(data || []);
  }, [user, wishlist, toast]);
  useEffect(() => {
    void load();
  }, [load]);
  const addRequested = params.get('adicionar') === '1';
  useEffect(() => {
    if (addRequested) setPicker(true);
  }, [addRequested]);
  async function select(card: Card) {
    setPicker(false);
    if (wishlist) {
      const client = createClient();
      if (!client || !user) return;
      const { error } = await client
        .from('wishlists')
        .insert({ user_id: user.id, card_id: card.id, card_name: card.name, card_type: card.type });
      if (error) toast(friendlyError(error.message), true);
      else {
        await refresh();
        toast('Carta adicionada aos seus desejos.');
      }
    } else {
      setEditing(undefined);
      setAdd(card);
    }
  }
  async function remove() {
    const client = createClient();
    if (!client || !deleting) return;
    setBusy(true);
    const { error } = await client
      .from('collection_items')
      .delete()
      .eq('id', deleting.id)
      .eq('user_id', user!.id);
    setBusy(false);
    if (error)
      toast(/reservada/.test(error.message) ? error.message : friendlyError(error.message), true);
    else {
      setDeleting(null);
      toast('Carta removida da coleção.');
      void load();
    }
  }
  const rows = (wishlist ? wishes : items).filter(
    (i) =>
      i.card_name.toLowerCase().includes(query.toLowerCase()) &&
      (wishlist ||
        filter === 'all' ||
        ('for_trade' in i && (filter === 'trade' ? i.for_trade : !i.for_trade))),
  );
  return (
    <>
      <PageTitle
        eyebrow={wishlist ? 'AS PRÓXIMAS PEÇAS DO SEU DECK' : 'CADA CARTA TEM UMA HISTÓRIA'}
        title={wishlist ? 'Sua lista de desejos.' : 'Sua coleção, seu universo.'}
        description={
          wishlist
            ? 'Diga o que você procura. A gente ajuda a encontrar a conexão.'
            : 'Organize suas cartas e escolha quais estão prontas para uma nova conexão.'
        }
      >
        <button className="button button-gold" onClick={() => setPicker(true)}>
          <Plus size={17} />
          {wishlist ? 'Adicionar desejo' : 'Adicionar carta'}
        </button>
      </PageTitle>
      {wishlist && (
        <div className="wishlist-note">
          <Sparkles size={19} />
          Os matches aparecem quando alguém tem uma carta que você quer e também procura uma das
          suas.
        </div>
      )}
      <div className="inventory-toolbar">
        <div className="catalog-search">
          <Search size={17} />
          <input
            aria-label="Filtrar minhas cartas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Encontre uma carta na sua pasta…"
          />
        </div>
        <span className="inventory-total">
          {wishlist
            ? `${wishes.length} desejos`
            : `${items.reduce((s, i) => s + i.quantity, 0)} cartas · ${items.filter((i) => i.for_trade).length} disponíveis para troca`}
        </span>
      </div>
      {!wishlist && (
        <div className="filter-tabs">
          {[
            { id: 'all', label: 'Todas as cartas' },
            { id: 'trade', label: 'Para troca' },
            { id: 'private', label: 'Minha coleção pessoal' },
          ].map((f) => (
            <button
              className={filter === f.id ? 'active' : ''}
              key={f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          icon={wishlist ? Heart : Layers3}
          title={
            query
              ? 'Nenhuma carta com esse nome.'
              : wishlist
                ? 'O que falta no seu deck?'
                : 'Abra espaço para novas histórias.'
          }
          description={
            query
              ? 'Tente buscar por outro nome.'
              : wishlist
                ? 'Adicione as cartas que você está procurando para descobrir trocas perfeitas.'
                : 'Adicione sua primeira carta e comece a montar sua pasta virtual de Yu-Gi-Oh!.'
          }
          onClick={() => setPicker(true)}
          label={wishlist ? 'Adicionar primeiro desejo' : 'Adicionar minha primeira carta'}
        />
      ) : (
        <div className="cards-grid">
          {rows.map((i) => {
            const card = itemCard(i);
            return (
              <div className="inventory-card" key={i.id}>
                <CardTile
                  card={card}
                  onClick={() => setDetail(card)}
                  onAdd={() => {
                    setEditing(undefined);
                    setAdd(card);
                  }}
                />
                {!wishlist && isCollection(i) && (
                  <div className="inventory-actions">
                    <span className={`inventory-badge ${!i.for_trade ? 'private' : ''}`}>
                      {i.quantity}× · {i.condition} · {i.for_trade ? 'Troca' : 'Pessoal'}
                    </span>
                    <button
                      className="text-link"
                      aria-label={`Editar ${i.card_name}`}
                      onClick={() => {
                        setEditing(i);
                        setAdd(card);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="text-link"
                      aria-label={`Remover ${i.card_name}`}
                      onClick={() => setDeleting(i)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {picker && (
        <CardSearchModal onClose={() => setPicker(false)} onSelect={(c) => void select(c)} />
      )}{' '}
      {add && (
        <AddCardModal
          card={add}
          item={editing}
          onClose={() => {
            setAdd(null);
            setEditing(undefined);
          }}
          onSaved={() => void load()}
        />
      )}{' '}
      {detail && (
        <CardDetail
          card={detail}
          onClose={() => setDetail(null)}
          onAdd={() => {
            setDetail(null);
            setEditing(undefined);
            setAdd(detail);
          }}
        />
      )}
      {deleting && (
        <Modal title="Remover carta da coleção?" onClose={() => setDeleting(null)}>
          <p className="muted">
            A carta {deleting.card_name} será removida da sua pasta. Você pode adicioná-la novamente
            pelo catálogo.
          </p>
          <div className="trade-buttons">
            <button className="button" onClick={() => setDeleting(null)}>
              Voltar
            </button>
            <button className="button button-gold" disabled={busy} onClick={() => void remove()}>
              Remover carta
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
