'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, MapPin, Search, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';
import type { Profile } from '@/types';
import { Empty, PageTitle, Spinner } from './ui';
import { useApp } from './providers';
export function Community() {
  const [people, setPeople] = useState<Profile[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState('');
  const { toast } = useApp();
  useEffect(() => {
    const client = createClient();
    if (!client) {
      setLoading(false);
      return;
    }
    void client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) toast('Não foi possível carregar a comunidade.', true);
        else setPeople(data || []);
      });
  }, [toast]);
  const filtered = people.filter((p) =>
    `${p.display_name} ${p.username} ${p.neighborhood}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page-content">
      <PageTitle
        eyebrow="OS MELHORES MATCHES ESTÃO POR PERTO"
        title="Duelistas. Vizinhos. Conexões."
        description="Conheça as pessoas que estão construindo a comunidade de Yu-Gi-Oh! de Lagarto."
      />
      <div className="inventory-toolbar">
        <div className="catalog-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar duelistas"
            placeholder="Busque por nome, usuário ou bairro…"
          />
        </div>
        <span className="inventory-total">{people.length} duelistas na comunidade</span>
      </div>
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty
          icon={Users}
          title={query ? 'Nenhum duelista encontrado.' : 'Uma comunidade começa com você.'}
          description={
            query
              ? 'Tente buscar por outro nome ou bairro.'
              : 'Seja um dos primeiros duelistas de Lagarto a conectar sua coleção.'
          }
          href="/cadastro"
          label="Fazer parte da comunidade"
        />
      ) : (
        <div className="community-grid">
          {filtered.map((p) => (
            <Link className="panel duelist-card" key={p.id} href={`/perfil/${p.username}`}>
              <div className="avatar">
                {p.avatar_url ? <img src={p.avatar_url} alt="" /> : initials(p.display_name)}
              </div>
              <h2>{p.display_name}</h2>
              <p>@{p.username}</p>
              <p>
                <MapPin size={11} style={{ display: 'inline' }} /> {p.neighborhood || 'Lagarto'}, SE
              </p>
              {p.bio && <p style={{ marginTop: 12 }}>{p.bio.slice(0, 120)}</p>}
              <span className="text-link">
                Ver coleção <ArrowUpRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
