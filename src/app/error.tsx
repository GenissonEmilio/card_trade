'use client';
import { ActionButton } from '@/components/design-system';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>Algo saiu do esperado.</h1>
      <p>Não foi possível carregar esta página. Tente novamente.</p>
      <ActionButton className="button button-gold" onClick={reset}>
        Tentar novamente
      </ActionButton>
    </div>
  );
}
