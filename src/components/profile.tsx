'use client';
import { useEffect, useState } from 'react';
import { Layers3, MapPin, Star, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';
import type { CollectionItem, Profile as ProfileType } from '@/types';
import { Empty, Spinner } from './ui';
import { CardTile, CardDetail, ProposeModal } from './cards';
import { itemCard } from './library';
import { useApp } from './providers';
type Review = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: { display_name: string };
};
export function Profile({ username }: { username: string }) {
  const { user, toast, game } = useApp();
  const [profile, setProfile] = useState<ProfileType | null>(null),
    [items, setItems] = useState<CollectionItem[]>([]),
    [reviews, setReviews] = useState<Review[]>([]),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<CollectionItem | null>(null);
  useEffect(() => {
    const client = createClient();
    if (!client) {
      setLoading(false);
      return;
    }
    let alive = true;
    async function load() {
      const { data, error } = await client!
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        toast('Não foi possível carregar este perfil.', true);
        setLoading(false);
        return;
      }
      setProfile(data);
      if (data) {
        const [c, r] = await Promise.all([
          client!
            .from('collection_items')
            .select('*')
            .eq('user_id', data.id)
            .eq('for_trade', true)
            .eq('game', game)
            .gt('quantity', 0)
            .order('created_at', { ascending: false }),
          client!
            .from('reviews')
            .select('*, reviewer:profiles!reviews_reviewer_id_fkey(display_name)')
            .eq('reviewed_id', data.id)
            .order('created_at', { ascending: false })
            .limit(100),
        ]);
        if (alive) {
          setItems(c.data || []);
          setReviews((r.data || []) as unknown as Review[]);
        }
      }
      if (alive) setLoading(false);
    }
    setLoading(true);
    setSelected(null);
    void load();
    return () => {
      alive = false;
    };
  }, [username, toast, game]);
  if (loading) return <Spinner />;
  if (!profile)
    return (
      <div className="page-content">
        <Empty
          icon={UserRound}
          title="Duelista não encontrado."
          description="Este perfil pode ter mudado de nome. Encontre-o na comunidade."
          href="/comunidade"
          label="Explorar comunidade"
        />
      </div>
    );
  const rating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  return (
    <div className="page-content">
      <div className="profile-hero">
        <div className="avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            initials(profile.display_name)
          )}
        </div>
        <div>
          <span className="eyebrow">DUELISTA DA COMUNIDADE</span>
          <h1>{profile.display_name}</h1>
          <p>
            @{profile.username} · <MapPin size={11} style={{ display: 'inline' }} />{' '}
            {profile.neighborhood || 'Lagarto'}, SE
          </p>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <p style={{ marginTop: 10 }}>
            {rating
              ? `★ ${rating} · ${reviews.length} avaliações recentes`
              : 'Novo por aqui · Ainda sem avaliações'}{' '}
            · {items.reduce((total, item) => total + item.quantity, 0)} cartas para troca de{' '}
            {game === 'pokemon' ? 'Pokémon' : 'Yu-Gi-Oh!'}
          </p>
        </div>
      </div>
      <h2 className="section-heading">Uma coleção cheia de possibilidades.</h2>
      {items.length === 0 ? (
        <Empty
          icon={Layers3}
          title="As cartas estão sendo organizadas."
          description="Este duelista ainda não tem cartas disponíveis para troca."
        />
      ) : (
        <div className="cards-grid profile-card-grid">
          {items.map((item) => (
            <CardTile
              key={item.id}
              card={itemCard(item)}
              item={{ ...item, profiles: profile }}
              onClick={() => setSelected(item)}
              onAdd={() => setSelected(item)}
            />
          ))}
        </div>
      )}
      <h2 className="section-heading">Conexões que viraram boas trocas.</h2>
      {reviews.length === 0 ? (
        <p className="muted">As avaliações aparecem após trocas concluídas pelos dois duelistas.</p>
      ) : (
        <div className="reviews">
          {reviews.map((r) => (
            <article className="panel review-card" key={r.id}>
              <div className="review-stars" aria-label={`${r.rating} estrelas`}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)}
              </div>
              <p>{r.comment || 'Troca avaliada sem comentário.'}</p>
              <small>
                {r.reviewer.display_name} ·{' '}
                {new Date(r.created_at).toLocaleDateString('pt-BR', {
                  timeZone: 'America/Fortaleza',
                })}
              </small>
            </article>
          ))}
        </div>
      )}
      {selected && selected.user_id !== user?.id && (
        <ProposeModal requested={selected} onClose={() => setSelected(null)} />
      )}
      {selected && selected.user_id === user?.id && (
        <CardDetail
          card={itemCard(selected)}
          onClose={() => setSelected(null)}
          onAdd={() => {
            window.location.href = '/colecao';
          }}
        />
      )}
    </div>
  );
}
