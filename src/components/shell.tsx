'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Compass,
  Heart,
  HelpCircle,
  Layers3,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Settings2,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from './providers';
import { createClient } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';
const links = [
  { href: '/', label: 'Explorar', icon: Compass },
  { href: '/colecao', label: 'Minha coleção', icon: Layers3 },
  { href: '/desejos', label: 'Lista de desejos', icon: Heart },
  { href: '/matches', label: 'Meus matches', icon: Sparkles },
  { href: '/trocas', label: 'Minhas trocas', icon: MessageCircle },
  { href: '/comunidade', label: 'Comunidade', icon: Users },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { user, profile, wishes } = useApp(),
    [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <img src="/logo.svg" alt="" />
          <span>
            DUEL<span className="gold-text">INK</span>
            <small>CONNECT. TRADE. DUEL.</small>
          </span>
        </Link>
        <div className="location-pill">
          <span className="location-dot" />
          <MapPin size={14} />
          <span>Lagarto, SE</span>
          <ChevronDown size={13} />
        </div>
        <span className="nav-caption">SEU UNIVERSO</span>
        <nav>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              onClick={() => setOpen(false)}
              key={href}
              href={href}
              className={`nav-item ${(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {href === '/desejos' && wishes.length > 0 && <small>{wishes.length}</small>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="community-mini">
            <div className="mini-orb">
              <Zap size={19} />
            </div>
            <strong>
              Seu próximo match
              <br />
              está por perto.
            </strong>
            <p>Sua coleção conecta você à comunidade de Lagarto.</p>
            <Link href={user ? '/colecao' : '/cadastro'}>
              Faça parte <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link href="/como-funciona" className="nav-item">
            <HelpCircle size={18} />
            <span>Como funciona</span>
          </Link>
          <Link href="/configuracoes" className="nav-item">
            <Settings2 size={18} />
            <span>Configurações</span>
          </Link>
          <div className="sidebar-profile">
            <div className="avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" />
              ) : (
                initials(profile?.display_name || 'Duelista')
              )}
            </div>
            <Link href={user ? '/configuracoes' : '/login'}>
              <strong>{profile?.display_name || 'Olá, duelista'}</strong>
              <small>{user ? 'Minha conta' : 'Entre na comunidade'}</small>
            </Link>
            {user && (
              <button
                aria-label="Sair da conta"
                onClick={() => void createClient()?.auth.signOut()}
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-column">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <div className="breadcrumb">
            <span>Comunidade</span>
            <span>/</span>
            <strong>
              {links.find((l) => (l.href === '/' ? path === '/' : path.startsWith(l.href)))
                ?.label || 'Duelink'}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="top-local">
              <span className="location-dot" />
              Feito para duelistas de Lagarto
            </span>
            {user ? (
              <Link className="button button-gold button-small" href="/colecao?adicionar=1">
                <Layers3 size={16} /> Adicionar carta
              </Link>
            ) : (
              <>
                <Link className="login-link" href="/login">
                  Entrar
                </Link>
                <Link className="button button-gold button-small" href="/cadastro">
                  Criar conta <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <Link className="footer-brand" href="/">
            DUELINK<span>Uma nova conexão para sua coleção.</span>
          </Link>
          <div>
            <Link href="/como-funciona">Como funciona</Link>
            <Link href="/privacidade">Privacidade</Link>
            <a href="https://ygoprodeck.com" target="_blank" rel="noreferrer">
              Catálogo YGOPRODeck <ArrowUpRight size={12} />
            </a>
          </div>
          <small>Projeto independente de fãs. Yu-Gi-Oh! © Kazuki Takahashi / Konami.</small>
        </footer>
      </div>
    </div>
  );
}
