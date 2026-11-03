// @ts-nocheck
import { qa, cards, config, adminData, settings, timestamp } from './fixtures';
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
export function installApi() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) throw new Error('QA isolada: rede externa desativada.');
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);
    qa.log.push({ type: 'fetch', url: url.pathname + url.search, method: init.method || 'GET' });
    if (qa.state === 'loading') return new Promise(() => {});
    if (qa.state === 'error')
      return json(
        { error: 'Não foi possível carregar os dados de demonstração. Tente novamente.' },
        503,
      );
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const body = init.body ? JSON.parse(String(init.body)) : {};
    if (init.method && init.method !== 'GET') {
      qa.mutations.push({ api: url.pathname, body });
      if (qa.state === 'mutation-error')
        return json({ error: 'Não foi possível salvar. Tente novamente.' }, 422);
    }
    if (url.pathname === '/api/marketplace/config') return json(config);
    if (url.pathname === '/api/marketplace/listings') {
      const q = url.searchParams;
      let listings = qa.tables.marketplace_listings.filter(
        (l) => l.status === 'active' && l.game === (q.get('game') || qa.game),
      );
      const search = q.get('search')?.toLowerCase();
      if (search) listings = listings.filter((l) => l.card_name.toLowerCase().includes(search));
      for (const key of ['language', 'condition'])
        if (q.get(key)) listings = listings.filter((l) => l[key] === q.get(key));
      if (q.get('min_price'))
        listings = listings.filter((l) => l.price_cents >= Number(q.get('min_price')));
      if (q.get('max_price'))
        listings = listings.filter((l) => l.price_cents <= Number(q.get('max_price')));
      if (q.get('sort')?.startsWith('price'))
        listings.sort(
          (a, b) => (a.price_cents - b.price_cents) * (q.get('sort') === 'price_desc' ? -1 : 1),
        );
      return json({ listings, has_more: false, next_offset: listings.length });
    }
    if (url.pathname === '/api/cards') {
      const q = url.searchParams;
      let rows = cards.filter((c) => c.game === (q.get('game') || qa.game));
      if (q.get('id')) rows = rows.filter((c) => c.id === q.get('id'));
      if (q.get('q'))
        rows = rows.filter((c) =>
          JSON.stringify([c.name, c.localized_name, c.id])
            .toLowerCase()
            .includes(q.get('q').toLowerCase()),
        );
      if (qa.state === 'empty') rows = [];
      return json({
        data: rows,
        total: rows.length,
        hasMore: false,
        syncedAt: timestamp,
        coverage: { imported: rows.length, withPortugueseName: rows.length },
      });
    }
    if (url.pathname === '/api/admin') {
      if (qa.role !== 'admin') return json({ error: 'Acesso reservado à operação.' }, 403);
      if (init.method === 'POST') {
        if (body.action === 'settings')
          Object.assign(settings, body, { updated_at: new Date().toISOString() });
        if (body.action === 'role') {
          const member = adminData.members.find((m) => m.id === body.user_id);
          if (member) member.role = body.role;
        }
        adminData.audit.unshift({
          id: crypto.randomUUID(),
          actor_id: 'qa-admin',
          action: body.action + '.update',
          entity_id: body.user_id || 'marketplace-settings',
          created_at: timestamp,
          before_data: {},
          after_data: body,
        });
      }
      return json(adminData);
    }
    if (url.pathname === '/api/admin/marketplace-test') {
      if (qa.role !== 'admin') return json({ error: 'Acesso reservado à operação.' }, 403);
      if (init.method === 'POST')
        return json({ error: 'Checkout externo desativado na revisão visual isolada.' }, 422);
      return json({
        sandbox: true,
        amount_cents: 1000,
        commission_bps: 800,
        commission_cents: 80,
        tests:
          qa.state === 'empty'
            ? []
            : [
                {
                  id: 'checkout-test-qa',
                  created_at: timestamp,
                  expires_at: '2026-12-30T12:00:00Z',
                  preference_id: 'qa-preference',
                  payment_id: 'qa-payment',
                  payment_status: 'approved',
                  payment_method: 'pix',
                  verified_at: timestamp,
                  amount_cents: 1000,
                  commission_cents: 80,
                  commission_bps: 800,
                  provider_live_mode: false,
                  identity_verified: true,
                },
              ],
      });
    }
    if (['/api/marketplace/checkout', '/api/marketplace/connect'].includes(url.pathname))
      return json({ error: 'Pagamento e conexão externa desativados no harness de revisão.' }, 422);
    if (url.pathname === '/api/marketplace/reconcile') return json({ ok: true });
    if (url.pathname === '/api/marketplace/refund') return json({ ok: true });
    return json({ error: 'Endpoint não implementado no fixture de QA: ' + url.pathname }, 501);
  };
}
