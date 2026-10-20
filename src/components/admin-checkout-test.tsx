'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, FlaskConical, Loader2, RefreshCw } from 'lucide-react';
import type { MarketplaceCheckoutTest as CheckoutTest } from '@/types/marketplace';
import styles from './admin.module.css';
type Summary = {
  sandbox: true;
  amount_cents: number;
  commission_bps: number;
  commission_cents: number;
  tests: CheckoutTest[];
};
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
const date = (value: string) => new Date(value).toLocaleString('pt-BR');
function testStatus(test: CheckoutTest) {
  if (!test.payment_status) return test.preference_id ? 'Checkout preparado' : 'Em preparação';
  return (
    {
      approved: 'Pagamento fictício aprovado',
      pending: 'Pagamento fictício pendente',
      in_process: 'Pagamento fictício em análise',
      rejected: 'Pagamento fictício recusado',
      cancelled: 'Pagamento fictício cancelado',
      refunded: 'Pagamento fictício reembolsado',
    }[test.payment_status] || 'Situação recebida do provedor'
  );
}

export function AdminCheckoutTest({ commissionBps }: { commissionBps: number | null }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setSummary(null);
    void fetch('/api/admin/marketplace-test', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Não foi possível carregar os testes.');
        if (!controller.signal.aborted) setSummary(body);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : 'Não foi possível carregar os testes.');
      });
    return () => controller.abort();
  }, [commissionBps, attempt]);

  async function send(action: 'create' | 'refresh', testId?: string) {
    setBusy(testId || 'create');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/marketplace-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(testId ? { testId } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível concluir o teste.');
      const test = body.test as CheckoutTest;
      setSummary((previous) =>
        previous
          ? {
              ...previous,
              tests: [test, ...previous.tests.filter((item) => item.id !== test.id)].slice(0, 10),
            }
          : previous,
      );
      if (action === 'create') setCheckoutUrl(body.url);
      else
        setNotice(
          test.payment_status
            ? 'Consulta ao Mercado Pago concluída. Confira abaixo a última situação verificada.'
            : 'Consulta concluída: o Mercado Pago ainda não retornou nenhum pagamento para este teste.',
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir o teste.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={`panel ${styles.section}`} aria-labelledby="checkout-test-title">
      <h2 id="checkout-test-title">
        <FlaskConical size={19} aria-hidden="true" />
        Teste de pagamento
      </h2>
      <p>
        Use o vendedor fictício conectado e o comprador fictício autorizado para esta homologação,
        em contas diferentes. Este recurso é exclusivo da administração no ambiente de testes. Você
        pode usá-lo com as vendas fechadas.
      </p>
      <p className={styles.testNotice}>
        Nenhuma carta é anunciada ou entregue neste teste. Não use dinheiro, cartões ou contas
        reais. No teste com Pix, o resultado esperado é a geração das instruções e o pagamento
        pendente.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className={styles.success} role="status">
          {notice}
        </p>
      ) : null}
      {summary ? (
        <>
          <p>
            Valor fictício: <strong>{money(summary.amount_cents)}</strong>. Comissão:{' '}
            <strong>{money(summary.commission_cents)}</strong> ({summary.commission_bps / 100}%). As
            taxas do Mercado Pago são separadas.
          </p>
          <div className={styles.testActions}>
            <button
              className="button button-gold"
              type="button"
              disabled={busy !== null}
              onClick={() => void send('create')}
            >
              {busy === 'create' ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <FlaskConical size={16} />
              )}
              Criar checkout fictício
            </button>
            <Link className="text-link" href="/vender">
              Ver conexão do vendedor
            </Link>
          </div>
          {checkoutUrl ? (
            <p role="status">
              Checkout preparado. Abra-o usando a conta de comprador fictício.{' '}
              <a className="text-link" href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                Abrir checkout de teste <ExternalLink size={14} />
              </a>
            </p>
          ) : null}
          <div className={styles.testResults}>
            {summary.tests.length === 0 ? (
              <p>Nenhum teste de checkout registrado.</p>
            ) : (
              summary.tests.map((test) => (
                <article key={test.id} aria-label={`Teste de ${date(test.created_at)}`}>
                  <div>
                    <strong>{testStatus(test)}</strong>
                    <span>
                      {date(test.created_at)} · {money(test.amount_cents)} · comissão{' '}
                      {money(test.commission_cents)}
                    </span>
                    <span>
                      {test.payment_method === 'pix'
                        ? 'Pix'
                        : test.payment_method
                          ? 'Meio de pagamento confirmado pelo provedor'
                          : 'Aguardando tentativa de pagamento'}
                      {test.verified_at ? ` · Verificado em ${date(test.verified_at)}` : ''}
                    </span>
                    {test.identity_verified ? (
                      <span>
                        Comprador e vendedor fictícios conferidos.
                        {test.provider_live_mode === true
                          ? ' Ambiente informado pelo provedor: produção; identidades de teste verificadas.'
                          : test.provider_live_mode === false
                            ? ' Ambiente informado pelo provedor: teste.'
                            : ''}
                      </span>
                    ) : null}
                  </div>
                  <button
                    className="button button-small"
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void send('refresh', test.id)}
                    aria-label={`Consultar pagamento do teste de ${date(test.created_at)}`}
                  >
                    {busy === test.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Consultar pagamento
                  </button>
                </article>
              ))
            )}
          </div>
          <p>
            O retorno do checkout não confirma pagamento. A situação só muda após conferência com o
            Mercado Pago. Estes registros validam os pagamentos de teste; não representam pedidos,
            reservas ou retiradas de cartas.
          </p>
        </>
      ) : !error ? (
        <p role="status">Carregando testes…</p>
      ) : (
        <>
          <p>Confira as configurações dos pagamentos e a conexão do vendedor fictício.</p>
          <button className="button" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Tentar novamente
          </button>
        </>
      )}
    </section>
  );
}
