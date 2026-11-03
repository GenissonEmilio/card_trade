// @ts-nocheck
import { qa, matches, cards, timestamp } from './fixtures';
const delay = () =>
  qa.state === 'loading' ? new Promise(() => {}) : new Promise((r) => setTimeout(r, 45));
const err = () => ({
  message: 'Não foi possível carregar os dados de demonstração. Tente novamente.',
  code: 'QA_ERROR',
});
const clone = (value) => structuredClone(value);
const callbacks = [];
function emit(table, event, row) {
  for (const cb of callbacks)
    if (cb.table === table && (cb.event === '*' || cb.event === event)) cb.fn({ new: clone(row) });
}
class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.kind = 'select';
    this.one = false;
    this.options = {};
    this.limitValue = Infinity;
    this.offset = 0;
  }
  select(columns = '*', options = {}) {
    this.columns = columns;
    this.options = options;
    return this;
  }
  eq(k, v) {
    this.filters.push((r) => r[k] === v);
    return this;
  }
  neq(k, v) {
    this.filters.push((r) => r[k] !== v);
    return this;
  }
  gt(k, v) {
    this.filters.push((r) => r[k] > v);
    return this;
  }
  gte(k, v) {
    this.filters.push((r) => r[k] >= v);
    return this;
  }
  lt(k, v) {
    this.filters.push((r) => r[k] < v);
    return this;
  }
  lte(k, v) {
    this.filters.push((r) => r[k] <= v);
    return this;
  }
  in(k, vs) {
    this.filters.push((r) => vs.includes(r[k]));
    return this;
  }
  is(k, v) {
    this.filters.push((r) => r[k] === v);
    return this;
  }
  not(k, op, v) {
    this.filters.push((r) => (op === 'is' ? r[k] !== v : !String(r[k]).includes(String(v))));
    return this;
  }
  ilike(k, v) {
    const q = v.replace(/%/g, '').toLowerCase();
    this.filters.push((r) =>
      String(r[k] || '')
        .toLowerCase()
        .includes(q),
    );
    return this;
  }
  or(expression) {
    const clauses = expression.split(',').map((c) => c.split('.'));
    this.filters.push((r) =>
      clauses.some(([k, op, ...parts]) => {
        const v = parts.join('.');
        return op === 'eq'
          ? String(r[k]) === v
          : op === 'ilike'
            ? String(r[k] || '')
                .toLowerCase()
                .includes(v.replace(/%/g, '').toLowerCase())
            : true;
      }),
    );
    return this;
  }
  match(record) {
    for (const [k, v] of Object.entries(record)) this.eq(k, v);
    return this;
  }
  order(key, opts = {}) {
    this.orderKey = key;
    this.ascending = opts.ascending !== false;
    return this;
  }
  limit(n) {
    this.limitValue = n;
    return this;
  }
  range(start, end) {
    this.offset = start;
    this.limitValue = end - start + 1;
    return this;
  }
  abortSignal(signal) {
    this.signal = signal;
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  maybeSingle() {
    this.one = true;
    return this;
  }
  insert(value) {
    this.kind = 'insert';
    this.value = value;
    return this;
  }
  upsert(value) {
    this.kind = 'upsert';
    this.value = value;
    return this;
  }
  update(value) {
    this.kind = 'update';
    this.value = value;
    return this;
  }
  delete() {
    this.kind = 'delete';
    return this;
  }
  async execute() {
    await delay();
    if (this.signal?.aborted) return { data: null, error: null, count: 0 };
    qa.log.push({ type: 'query', table: this.table, kind: this.kind });
    if (qa.state === 'error' || (qa.state === 'mutation-error' && this.kind !== 'select'))
      return { data: null, error: err(), count: 0 };
    const table = qa.tables[this.table] || (qa.tables[this.table] = []);
    let rows = table.filter((r) => this.filters.every((f) => f(r)));
    if (qa.state === 'empty' && this.table === 'profiles' && qa.screen === 'community') rows = [];
    if (this.kind === 'insert' || this.kind === 'upsert') {
      rows = (Array.isArray(this.value) ? this.value : [this.value]).map((v) => ({
        id: crypto.randomUUID(),
        created_at: timestamp,
        updated_at: timestamp,
        ...clone(v),
      }));
      table.push(...rows);
      for (const r of rows) emit(this.table, 'INSERT', r);
    }
    if (this.kind === 'update') {
      for (const r of rows) {
        Object.assign(r, clone(this.value));
        emit(this.table, 'UPDATE', r);
      }
    }
    if (this.kind === 'delete') qa.tables[this.table] = table.filter((r) => !rows.includes(r));
    if (this.kind !== 'select')
      qa.mutations.push({
        table: this.table,
        kind: this.kind,
        value: clone(this.value || {}),
        affected: rows.length,
      });
    if (this.orderKey)
      rows.sort(
        (a, b) =>
          String(a[this.orderKey] || '').localeCompare(String(b[this.orderKey] || ''), 'pt-BR') *
          (this.ascending ? 1 : -1),
      );
    const count = rows.length;
    rows = rows.slice(this.offset, this.offset + this.limitValue);
    return {
      data: this.options.head ? null : clone(this.one ? rows[0] || null : rows),
      error: null,
      count,
    };
  }
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
}
async function rpc(name, args = {}) {
  await delay();
  qa.log.push({ type: 'rpc', name, args });
  if (qa.state === 'error' || qa.state === 'mutation-error') return { data: null, error: err() };
  if (name === 'get_matches') {
    if (args.selected_game === 'pokemon' && qa.state !== 'empty') {
      const own = qa.tables.collection_items.find(
          (i) => i.user_id === 'qa-user' && i.game === 'pokemon',
        ),
        wanted = qa.tables.collection_items.find(
          (i) => i.user_id === 'qa-partner' && i.game === 'pokemon',
        );
      return { data: clone([{ ...matches[0], offered: [own], wanted: [wanted] }]), error: null };
    }
    return { data: clone(matches), error: null };
  }
  if (name === 'get_my_role') return { data: qa.role, error: null };
  if (name === 'marketplace_available_quantities')
    return {
      data: args.p_listing_ids.map((id) => ({
        listing_id: id,
        available_quantity: qa.tables.marketplace_listings.find((l) => l.id === id)?.quantity || 0,
      })),
      error: null,
    };
  qa.mutations.push({ rpc: name, args: clone(args) });
  if (name === 'transition_trade') {
    const row = qa.tables.trades.find((t) => t.id === args.trade);
    if (row) {
      if (args.action === 'confirm') {
        const uid = qa.role === 'admin' ? 'qa-admin' : 'qa-user';
        row[uid === row.proposer_id ? 'proposer_confirmed' : 'recipient_confirmed'] = true;
        if (row.proposer_confirmed && row.recipient_confirmed) row.status = 'completed';
      } else
        row.status =
          { accept: 'accepted', decline: 'declined', cancel: 'cancelled' }[args.action] ||
          row.status;
      emit('trades', 'UPDATE', row);
    }
  }
  if (name === 'seller_set_listing_status' || name === 'admin_moderate_listing') {
    const l = qa.tables.marketplace_listings.find((l) => l.id === args.p_listing_id);
    if (l) {
      l.status =
        name === 'admin_moderate_listing'
          ? args.p_approved
            ? 'active'
            : 'rejected'
          : args.p_status;
      if (args.p_reason) l.rejection_reason = args.p_reason;
    }
  }
  if (name === 'marketplace_order_action' || name === 'admin_resolve_marketplace_dispute') {
    const order = qa.tables.marketplace_orders.find((o) => o.id === args.p_order_id);
    if (order) {
      order.status =
        name === 'admin_resolve_marketplace_dispute'
          ? 'completed'
          : {
              ready: 'ready',
              complete: 'completed',
              cancel: 'cancelled',
              dispute: 'disputed',
              request_refund: 'disputed',
            }[args.p_action] || order.status;
      order.request_reason = args.p_reason || null;
      order.refund_requested = args.p_action === 'request_refund';
      emit('marketplace_orders', 'UPDATE', order);
    }
  }
  if (name === 'create_trade') return { data: 'trade-demo', error: null };
  if (name === 'submit_marketplace_listing') {
    let listing = qa.tables.marketplace_listings.find((l) => l.id === args.p_listing_id);
    if (!listing) {
      const item = qa.tables.collection_items.find((i) => i.id === args.p_collection_item_id);
      listing = {
        ...clone(qa.tables.marketplace_listings[0] || {}),
        id: crypto.randomUUID(),
        seller_id: qa.role === 'admin' ? 'qa-admin' : 'qa-user',
        collection_item_id: item?.id,
        game: item?.game,
        card_id: item?.card_id,
        card_name: item?.card_name,
        image_url: item?.image_url,
        condition: item?.condition,
        language: item?.language,
        rarity: item?.rarity,
        set_code: item?.set_code,
      };
      qa.tables.marketplace_listings.push(listing);
    }
    Object.assign(listing, {
      quantity: args.p_quantity,
      price_cents: args.p_price_cents,
      description: args.p_description,
      photos: args.p_photos,
      status: args.p_submit ? 'pending' : 'draft',
    });
    return { data: listing.id, error: null };
  }
  if (name === 'reserve_marketplace_order') return { data: 'order-demo', error: null };
  return { data: null, error: null };
}
const client = {
  from: (table) => new Query(table),
  rpc,
  auth: {
    getUser: async () => ({ data: { user: qa.role === 'guest' ? null : { id: 'qa-user' } } }),
    getSession: async () => ({
      data: { session: qa.role === 'guest' ? null : { user: { id: 'qa-user' } } },
    }),
    signOut: async () => {
      qa.mutations.push({ type: 'signOut' });
      return { error: null };
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  storage: {
    from: (bucket) => ({
      getPublicUrl: (key) => ({
        data: {
          publicUrl:
            bucket === 'avatars'
              ? '/brand/duelink-simbolo-pixel.svg'
              : key.includes('/back.')
                ? '/card-back.svg'
                : /^qa\/\d+\//.test(key)
                  ? `/cards/${key.split('/')[1]}.jpg`
                  : '/card-back.svg',
        },
      }),
      upload: async (path, file) => {
        qa.mutations.push({ type: 'storage.upload', bucket, path, size: file.size });
        return { data: { path }, error: qa.state === 'mutation-error' ? err() : null };
      },
      remove: async () => ({ error: null }),
    }),
  },
  channel: (name) => {
    const channel = {
      on(event, filter, fn) {
        callbacks.push({ channel: name, table: filter.table, event: filter.event, fn });
        return channel;
      },
      subscribe() {
        return channel;
      },
    };
    return channel;
  },
  removeChannel: async () => {},
};
export const isConfigured = true;
export const createClient = () => client;
client.auth.signOut = async () => {
  qa.mutations.push({ auth: 'signOut' });
  qa.role = 'guest';
  window.dispatchEvent(new Event('duelink-qa-auth'));
  return { error: null };
};
for (const method of [
  'signInWithPassword',
  'signUp',
  'resetPasswordForEmail',
  'updateUser',
  'signInWithOtp',
])
  client.auth[method] = async (args) => {
    await delay();
    qa.mutations.push({ auth: method, args: { email: args?.email || null } });
    return {
      data: {
        user: { id: 'qa-user' },
        session: method === 'signUp' ? null : { user: { id: 'qa-user' } },
      },
      error: qa.state === 'mutation-error' ? err() : null,
    };
  };
