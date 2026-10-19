'use client';
import Link from 'next/link';
import { Loader2, LockKeyhole, X, ArrowUpRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useApp } from './providers';
export function Spinner() {
  return (
    <div className="loading-state" role="status">
      <Loader2 className="spin" size={26} />
      <span>Carregando seu universo…</span>
    </div>
  );
}
export function Empty({
  icon: Icon,
  title,
  description,
  href,
  label,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={29} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {href && (
        <Link className="button button-gold" href={href}>
          {label}
          <ArrowUpRight size={16} />
        </Link>
      )}
      {onClick && (
        <button className="button button-gold" onClick={onClick}>
          {label}
          <ArrowUpRight size={16} />
        </button>
      )}
    </div>
  );
}
export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  if (loading) return <Spinner />;
  if (!user)
    return (
      <Empty
        icon={LockKeyhole}
        title="Sua coleção começa com uma conexão."
        description="Crie sua conta gratuita para organizar suas cartas, encontrar matches e trocar com duelistas de Lagarto."
        href="/login"
        label="Entrar na minha conta"
      />
    );
  return children;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      el?.close();
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? 'modal-wide' : ''}`}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
