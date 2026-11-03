'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './providers';
import { createClient } from '@/lib/supabase/client';
import { DesignIcon, RibbonLabel } from './pixel-design';

const primaryLinks = [
  ['Explorar', '/'],
  ['Marketplace', '/mercado'],
  ['Meus decks', '/decks'],
  ['Comunidade', '/comunidade'],
  ['Minha coleção', '/colecao'],
] as const;
const secondaryLinks = [
  ['Vender cartas', '/vender'],
  ['Compras e vendas', '/pedidos'],
  ['Lista de desejos', '/desejos'],
  ['Meus matches', '/matches'],
  ['Minhas trocas', '/trocas'],
  ['Como funciona', '/como-funciona'],
  ['Configurações', '/configuracoes'],
] as const;
const credits = [
  ['Como funciona', '/como-funciona'],
  ['Privacidade', '/privacidade'],
  ['Regras do marketplace', '/termos-marketplace'],
  ['Portfólio de Genisson', 'https://genissondev.mage.dev.br'],
  ['Código no GitHub', 'https://github.com/GenissonEmilio/card_trade'],
  ['Catálogo YGOPRODeck', 'https://ygoprodeck.com'],
  ['Catálogo Pokémon TCGdex', 'https://tcgdex.dev'],
] as const;

export function ExploreShell({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, wishes, game } = useApp();
  const wishCount = wishes.filter((wish) => (wish.game || 'yugioh') === game).length;
  const wishBadge = (href: string) =>
    href === '/desejos' && wishCount > 0 ? (
      <span
        className="ds-nav-count"
        aria-label={`${wishCount} ${wishCount === 1 ? 'carta' : 'cartas'} na lista de desejos`}
      >
        {wishCount}
      </span>
    ) : null;
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isActive = (href: string) => (href === '/' ? isHome : pathname.startsWith(href));
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = menuRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  function closeMenu() {
    setOpen(false);
    toggleRef.current?.focus();
  }
  return (
    <div className={`pixel-app duelink-system ${isHome ? 'ds-home' : 'ds-interior'}`}>
      <a href="#main-content" className="pixel-skip">
        Ir para o conteúdo
      </a>
      <header className="pixel-header">
        <div className="pixel-wrap pixel-header-row">
          <Link href="/" className="pixel-brand" aria-label="Duelink — início">
            <img src="/brand/duelink-logo-pixel.svg" width="176" height="88" alt="Duelink" />
          </Link>
          <nav className="pixel-primary-nav" aria-label="Navegação principal">
            {primaryLinks.map(([label, href]) => (
              <Link href={href} key={href} aria-current={isActive(href) ? 'page' : undefined}>
                {label}
                {wishBadge(href)}
              </Link>
            ))}
          </nav>
          <div className="pixel-account">
            {user ? (
              <>
                <Link href="/configuracoes">{profile?.display_name || 'Minha conta'}</Link>
                <Link href="/colecao?adicionar=1" className="pixel-ribbon primary">
                  <RibbonLabel primary icon="cards-three">
                    Adicionar carta
                  </RibbonLabel>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">Entrar</Link>
                <Link href="/cadastro" className="pixel-ribbon primary">
                  <RibbonLabel primary icon="users-three">
                    Criar conta
                  </RibbonLabel>
                </Link>
              </>
            )}
            <button
              ref={toggleRef}
              className="pixel-menu-toggle"
              aria-label="Abrir menu"
              aria-expanded={open}
              aria-controls="pixel-mobile-menu"
              onClick={() => setOpen(true)}
            >
              <DesignIcon name="list" size={22} />
            </button>
          </div>
        </div>
        <div className="pixel-utility">
          <nav className="pixel-wrap" aria-label="Mais opções">
            {secondaryLinks.map(([label, href]) => (
              <Link href={href} key={href} aria-current={isActive(href) ? 'page' : undefined}>
                {label}
                {wishBadge(href)}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" aria-current={isActive('/admin') ? 'page' : undefined}>
                Administração
              </Link>
            )}
            <span>
              <DesignIcon name="map-pin" size={13} />
              Lagarto, SE
            </span>
          </nav>
        </div>
      </header>
      <dialog
        ref={menuRef}
        id="pixel-mobile-menu"
        className="pixel-mobile-menu"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeMenu();
        }}
      >
        <div className="pixel-menu-content">
          <div className="pixel-menu-heading">
            <strong>Olá, {profile?.display_name || 'duelista'}</strong>
            <button aria-label="Fechar menu" onClick={closeMenu}>
              ×
            </button>
          </div>
          <p>{user ? 'Minha conta' : 'Entre na comunidade'}</p>
          <nav aria-label="Navegação mobile">
            {[
              ...primaryLinks,
              ...secondaryLinks,
              ...(isAdmin ? [['Administração', '/admin']] : []),
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                <span className="ds-nav-label">
                  {label}
                  {wishBadge(href)}
                </span>
                <DesignIcon name="arrow-up-right" size={16} />
              </Link>
            ))}
          </nav>
          <div className="pixel-menu-account">
            {user ? (
              <button
                className="pixel-ribbon secondary"
                onClick={() => {
                  void createClient()?.auth.signOut();
                  closeMenu();
                }}
              >
                <RibbonLabel icon="arrow-up-right">Sair da conta</RibbonLabel>
              </button>
            ) : (
              <>
                <Link className="pixel-ribbon secondary" href="/login" onClick={closeMenu}>
                  <RibbonLabel icon="arrow-up-right">Entrar</RibbonLabel>
                </Link>
                <Link className="pixel-ribbon primary" href="/cadastro" onClick={closeMenu}>
                  <RibbonLabel primary icon="users-three">
                    Criar conta
                  </RibbonLabel>
                </Link>
              </>
            )}
          </div>
        </div>
      </dialog>
      <main id="main-content" className={isHome ? undefined : 'ds-main'} data-route={pathname}>
        {isHome ? children : <div className="ds-container">{children}</div>}
      </main>
      <footer className="pixel-footer">
        <div className="pixel-wrap">
          <div className="pixel-footer-top">
            <div className="pixel-footer-brand">
              <Link href="/" aria-label="Duelink — início">
                <img src="/brand/duelink-logo-pixel.svg" width="180" height="90" alt="Duelink" />
              </Link>
              <p>Uma nova conexão para sua coleção.</p>
              <p>Feito para duelistas de Lagarto</p>
            </div>
            <div className="pixel-footer-links">
              <nav aria-label="Sua comunidade">
                {secondaryLinks
                  .filter(([, href]) => href != '/como-funciona')
                  .map(([label, href]) => (
                    <Link href={href} key={href}>
                      {label}
                    </Link>
                  ))}
                {isAdmin && <Link href="/admin">Administração</Link>}
              </nav>
              <nav aria-label="Informações e créditos">
                {credits.map(([label, href]) =>
                  href.startsWith('https') ? (
                    <a href={href} target="_blank" rel="noreferrer" key={href}>
                      {label}
                    </a>
                  ) : (
                    <Link href={href} key={href}>
                      {label}
                    </Link>
                  ),
                )}
              </nav>
            </div>
            <div className="pixel-community">
              <strong>
                Seu próximo match
                <br />
                está por perto.
              </strong>
              <p>Sua coleção conecta você à comunidade de Lagarto.</p>
              <Link href={user ? '/colecao' : '/cadastro'}>Faça parte ↗</Link>
            </div>
          </div>
          <div className="pixel-legal">
            <Link href={user ? '/configuracoes' : '/login'}>
              {profile?.display_name || 'Olá, duelista'} ·{' '}
              {user ? 'Minha conta' : 'Entre na comunidade'}
            </Link>
            {user && (
              <button onClick={() => void createClient()?.auth.signOut()}>Sair da conta</button>
            )}
            <p>
              Projeto independente. Yu-Gi-Oh! © Kazuki Takahashi / Konami. Pokémon © Pokémon /
              Nintendo / Creatures / GAME FREAK.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
