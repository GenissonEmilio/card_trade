'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ClipboardList,
  Loader2,
  Settings2,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { PageTitle, Spinner } from './ui';
import { useApp } from './providers';
import styles from './admin.module.css';
type Settings = {
  commission_bps: number | null;
  enabled: boolean;
  pickup_instructions: string;
  operator_name: string;
  operator_contact: string;
  terms_version: string;
  updated_at: string;
};
type Member = {
  id: string;
  username: string;
  display_name: string;
  role: 'admin' | 'user';
  created_at: string;
};
type Audit = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_id: string;
  created_at: string;
  before_data: unknown;
  after_data: unknown;
};
type Dashboard = {
  settings: Settings;
  members: Member[];
  audit: Audit[];
  payments: { mode: string; checks: { label: string; configured: boolean }[] };
};
export function AdminDashboard() {
  const { user, refresh } = useApp();
  const [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [memberQuery, setMemberQuery] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o painel.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function send(body: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
      setNotice('Alteração salva e registrada no histórico.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      raw = String(f.get('commission')).replace(',', '.').trim();
    const bps = raw === '' ? null : Math.round(Number(raw) * 100);
    if (bps !== null && (!Number.isFinite(bps) || bps < 0 || bps > 10000)) {
      setError('Informe uma taxa entre 0 e 100%.');
      return;
    }
    await send({
      action: 'settings',
      commission_bps: bps,
      enabled: f.get('enabled') === 'on',
      pickup_instructions: String(f.get('pickup_instructions')),
      operator_name: String(f.get('operator_name')),
      operator_contact: String(f.get('operator_contact')),
    });
  }
  return (
    <div className="page-content">
      <PageTitle
        eyebrow="GESTÃO DO DUELINK"
        title="Sua operação, em um lugar."
        description="Configure a comissão, acompanhe a operação e gerencie o acesso à administração."
      >
        <Link href="/admin/mercado" className="button button-gold">
          <Store size={17} />
          Gerenciar marketplace
        </Link>
      </PageTitle>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.success} role="status">
          <Check size={17} />
          {notice}
        </p>
      )}
      {!data ? (
        error ? (
          <button className="button" onClick={() => void load()}>
            Tentar novamente
          </button>
        ) : (
          <Spinner />
        )
      ) : (
        <>
          <div className={styles.summary}>
            <div className="panel">
              <Store size={21} />
              <small>VENDAS</small>
              <strong>
                {data.settings.enabled ? 'Abertas na configuração' : 'Ainda fechadas'}
              </strong>
              <span>A disponibilidade também depende do provedor.</span>
            </div>
            <div className="panel">
              <Settings2 size={21} />
              <small>COMISSÃO POR VENDA</small>
              <strong>
                {data.settings.commission_bps === null
                  ? 'A definir'
                  : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(data.settings.commission_bps / 100)}%`}
              </strong>
              <span>Aplicada ao subtotal das cartas no pedido.</span>
            </div>
            <div className="panel">
              <Users size={21} />
              <small>COMUNIDADE</small>
              <strong>{data.members.length} contas</strong>
              <span>{data.members.filter((m) => m.role === 'admin').length} com administração</span>
            </div>
          </div>
          <div className={styles.columns}>
            <section className={`panel ${styles.section}`}>
              <h2>
                <Settings2 size={19} />
                Taxas e operação
              </h2>
              <p>
                A taxa vale para os novos pedidos. Pedidos já criados mantêm a comissão contratada.
              </p>
              <form className="form" onSubmit={save} key={data.settings.updated_at}>
                <label>
                  Comissão da plataforma em %
                  <input
                    name="commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue={
                      data.settings.commission_bps === null
                        ? ''
                        : data.settings.commission_bps / 100
                    }
                    placeholder="Ainda não definida"
                  />
                  <small>
                    Exemplo: 8,5 representa R$ 8,50 em uma venda de R$ 100. Taxas do Mercado Pago
                    são separadas.
                  </small>
                </label>
                <label>
                  Nome da operação
                  <input
                    name="operator_name"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={data.settings.operator_name}
                  />
                </label>
                <label>
                  Contato de atendimento
                  <input
                    name="operator_contact"
                    required
                    minLength={5}
                    maxLength={200}
                    defaultValue={data.settings.operator_contact}
                  />
                </label>
                <label>
                  Como combinar a retirada
                  <textarea
                    name="pickup_instructions"
                    maxLength={1000}
                    defaultValue={data.settings.pickup_instructions}
                    placeholder="Informe a região atendida e como comprador e vendedor combinam local e horário."
                  />
                  <small>
                    Não informe endereço residencial. Estas instruções aparecem na revisão da
                    compra.
                  </small>
                </label>
                <label className={styles.checkbox}>
                  <input type="checkbox" name="enabled" defaultChecked={data.settings.enabled} />
                  <span>Abrir vendas após configurar taxa, retirada e pagamentos</span>
                </label>
                <button className="button button-gold" disabled={busy}>
                  {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}Salvar
                  configurações
                </button>
              </form>
            </section>
            <section className={`panel ${styles.section}`}>
              <h2>
                <ShieldCheck size={19} />
                Preparação dos pagamentos
              </h2>
              <p>
                Checkout hospedado pelo Mercado Pago, com Pix e cartão. Cada vendedor conecta a
                própria conta para receber suas vendas.
              </p>
              <ul className={styles.checks}>
                {data.payments.checks.map((c) => (
                  <li key={c.label}>
                    <span className={c.configured ? styles.ok : styles.pending}>
                      {c.configured ? 'Configurado' : 'Pendente'}
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
              <p>
                Ambiente:{' '}
                <strong>
                  {data.payments.mode === 'production'
                    ? 'produção'
                    : data.payments.mode === 'sandbox'
                      ? 'testes'
                      : 'a configurar'}
                </strong>
                .
              </p>
              <p>
                A habilitação depende da aprovação do Mercado Pago. O painel não apresenta
                pagamentos pendentes de configuração como concluídos.
              </p>
              <Link className="text-link" href="/termos-marketplace">
                Consultar regras de venda e compra <ArrowUpRight size={14} />
              </Link>
            </section>
          </div>
          <section className={`panel ${styles.section}`}>
            <h2>
              <Users size={19} />
              Contas e permissões
            </h2>
            <p>
              Administradores podem alterar taxas e gerenciar anúncios, pedidos e acessos. Conceda
              esse acesso apenas a pessoas responsáveis pela operação.
            </p>
            <label className={styles.search}>
              Buscar pessoa
              <input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Nome ou usuário"
              />
            </label>
            <div className={styles.members}>
              {data.members
                .filter((m) =>
                  `${m.display_name} ${m.username}`
                    .toLocaleLowerCase('pt-BR')
                    .includes(memberQuery.toLocaleLowerCase('pt-BR')),
                )
                .map((m) => (
                  <div key={m.id}>
                    <div>
                      <strong>{m.display_name}</strong>
                      <span>
                        @{m.username}
                        {m.id === user?.id ? ' · você' : ''}
                      </span>
                    </div>
                    <span className="tag">{m.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                    <button
                      className="button button-small"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            m.role === 'admin'
                              ? `Remover o acesso administrativo de ${m.display_name}?`
                              : `Conceder acesso administrativo a ${m.display_name}? Essa pessoa poderá alterar taxas e gerenciar o site.`,
                          )
                        )
                          void send({
                            action: 'role',
                            user_id: m.id,
                            role: m.role === 'admin' ? 'user' : 'admin',
                          }).then((ok) => {
                            if (ok) void refresh();
                          });
                      }}
                    >
                      {m.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                    </button>
                  </div>
                ))}
            </div>
          </section>
          <section className={`panel ${styles.section}`}>
            <h2>
              <ClipboardList size={19} />
              Histórico administrativo
            </h2>
            <p>Mudanças nas taxas e nos acessos ficam registradas com autor e horário.</p>
            {data.audit.length === 0 ? (
              <p>Nenhuma alteração registrada.</p>
            ) : (
              <div className={styles.audit}>
                {data.audit.map((a) => (
                  <details key={a.id}>
                    <summary>
                      <strong>
                        {a.action === 'settings.update'
                          ? 'Configurações da operação'
                          : a.action === 'role.update'
                            ? 'Permissão de usuário'
                            : a.action}
                      </strong>
                      <time>{new Date(a.created_at).toLocaleString('pt-BR')}</time>
                      <span>
                        {data.members.find((m) => m.id === a.actor_id)?.display_name || 'Operação'}
                      </span>
                    </summary>
                    <div>
                      <p>Antes</p>
                      <pre>{JSON.stringify(a.before_data, null, 2)}</pre>
                      <p>Depois</p>
                      <pre>{JSON.stringify(a.after_data, null, 2)}</pre>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
