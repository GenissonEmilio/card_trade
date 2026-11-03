'use client';
import Link from 'next/link';
import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { Loader2 } from './system-icons';

type ActionVariant = 'primary' | 'secondary' | 'danger' | 'quiet';
function variantFromClass(className = '', variant?: ActionVariant) {
  return (
    variant ||
    (className.includes('danger')
      ? 'danger'
      : className.includes('button-gold')
        ? 'primary'
        : 'secondary')
  );
}
function ActionContent({ children, loading = false }: { children: ReactNode; loading?: boolean }) {
  let iconPlaced = false;
  const content = Children.toArray(children).map((child, index) => {
    const icon =
      isValidElement<{ size?: number; className?: string }>(child) &&
      child.type !== 'span' &&
      (child.props.size || child.props.className?.includes('spin'));
    if (!icon || iconPlaced) return child;
    iconPlaced = true;
    return (
      <span className="ds-action-icon" aria-hidden="true" key={`icon-${index}`}>
        {loading ? <Loader2 size={18} className="spin" /> : child}
      </span>
    );
  });
  if (loading && !iconPlaced)
    content.unshift(
      <span className="ds-action-icon" aria-hidden="true" key="loading">
        <Loader2 size={18} className="spin" />
      </span>,
    );
  return <>{content}</>;
}

export function ActionButton({
  children,
  className = '',
  variant,
  size = 'regular',
  loading = false,
  ...props
}: ComponentProps<'button'> & {
  variant?: ActionVariant;
  size?: 'small' | 'regular';
  loading?: boolean;
}) {
  const busy =
    loading ||
    Children.toArray(children).some(
      (child) =>
        isValidElement<{ className?: string }>(child) && child.props.className?.includes('spin'),
    );
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      aria-busy={props['aria-busy'] ?? (busy || undefined)}
      className={`button ds-action ds-action-${variantFromClass(className, variant)} ds-action-${size} ${className}`}
    >
      <ActionContent loading={loading}>{children}</ActionContent>
    </button>
  );
}
export function ActionLink({
  children,
  className = '',
  variant,
  size = 'regular',
  ...props
}: ComponentProps<typeof Link> & { variant?: ActionVariant; size?: 'small' | 'regular' }) {
  return (
    <Link
      {...props}
      className={`button ds-action ds-action-${variantFromClass(className, variant)} ds-action-${size} ${className}`}
    >
      <ActionContent>{children}</ActionContent>
    </Link>
  );
}
export function Panel({
  children,
  className = '',
  tone = 'default',
  ...props
}: ComponentProps<'div'> & { tone?: 'default' | 'soft' | 'dark' }) {
  return (
    <div {...props} className={`panel ds-panel ds-panel-${tone} ${className}`}>
      {children}
    </div>
  );
}
export function StatusBadge({
  children,
  tone = 'neutral',
  className = '',
  ...props
}: ComponentProps<'span'> & { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return (
    <span {...props} className={`ds-badge ds-badge-${tone} ${className}`}>
      {children}
    </span>
  );
}
