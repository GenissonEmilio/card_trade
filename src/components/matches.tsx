'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeftRight, MapPin, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardImage, initials } from '@/lib/utils';
import type { Match } from '@/types';
import { useApp } from './providers';
import { Empty, PageTitle, Protected, Spinner } from './ui';
import { ProposeModal } from './cards';
export function Matches() {
  return (
    <div className="page-content">
      <Protected>
        <MatchesContent />
      </Protected>
    </div>
  );
}
function MatchesContent() {
  const { toast, user } = useApp(),
    [matches, setMatches] = useState<Match[]>([]),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<Match | null>(null);
  useEffect(() => {
    const client = createClient();
    if (!client) return;
    void client.rpc('get_matches').then(({ data, error }) => {
      setLoading(false);
      if (error) toast('Não foi possível consultar seus matches.', true);
      else setMatches(data || []);
    });
  }, [user, toast]);
  return (
    <>
      <PageTitle
        eyebrow="AS COLEÇÕES SE ENCONTRAM AQUI"
        title="O match perfeito existe."
        description="Você tem o que alguém procura. Alguém tem o que falta no seu deck."
      />
      <div className="wishlist-note">
        <Sparkles size={19} />O match é recíproco: considera suas cartas para troca e sua lista de
        desejos. Estado, edição e detalhes são combinados na proposta.
      </div>
      {loading ? (
        <Spinner />
      ) : matches.length === 0 ? (
        <Empty
          icon={Sparkles}
          title="As conexões estão a caminho."
          description="Mantenha sua coleção e sua lista de desejos atualizadas. Quando dois duelistas tiverem cartas que o outro procura, o match aparece aqui."
          href="/desejos"
          label="Atualizar meus desejos"
        />
      ) : (
        <div className="match-grid">
          {matches.map((m) => (
            <article className="panel match-card" key={m.partner_id}>
              <div className="match-top">
                <div className="avatar">
                  {m.avatar_url ? <img src={m.avatar_url} alt="" /> : initials(m.display_name)}
                </div>
                <div>
                  <h2>
                    <Link href={`/perfil/${m.username}`}>{m.display_name}</Link>
                  </h2>
                  <p>
                    <MapPin size={12} />
                    {m.neighborhood || 'Lagarto'}, SE
                  </p>
                </div>
                <span className="tag">
                  <Sparkles size={11} /> MATCH RECÍPROCO
                </span>
              </div>
              <div className="match-cards">
                <div>
                  <small>VOCÊ OFERECE</small>
                  <img src={cardImage(m.offered[0].card_id)} alt={m.offered[0].card_name} />
                  <strong>{m.offered[0].card_name}</strong>
                </div>
                <ArrowLeftRight size={22} />
                <div>
                  <small>VOCÊ ENCONTRA</small>
                  <img src={cardImage(m.wanted[0].card_id)} alt={m.wanted[0].card_name} />
                  <strong>{m.wanted[0].card_name}</strong>
                </div>
              </div>
              <p className="field-hint">
                {m.wanted.length}{' '}
                {m.wanted.length === 1 ? 'carta que você procura' : 'cartas que você procura'} ·{' '}
                {m.offered.length}{' '}
                {m.offered.length === 1
                  ? 'carta sua na lista de desejos'
                  : 'cartas suas na lista de desejos'}
              </p>
              <button className="button button-gold full-width" onClick={() => setSelected(m)}>
                <ArrowLeftRight size={16} />
                Propor troca
              </button>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <ProposeModal requested={selected.wanted[0]} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
