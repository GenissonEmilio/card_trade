// @ts-nocheck
import { qa, params } from './fixtures';
export const paths = {
  explore: '/',
  library: '/colecao',
  wishlist: '/desejos',
  decks: '/decks',
  settings: '/configuracoes',
  profile: '/perfil/bruno_tcg',
  community: '/comunidade',
  matches: '/matches',
  trades: '/trocas',
  'trade-detail': '/trocas/trade-demo',
  marketplace: '/mercado',
  seller: '/vender',
  orders: '/pedidos',
  'order-detail': '/pedidos/order-demo',
  admin: '/admin',
  moderation: '/admin/mercado',
  login: '/login',
  register: '/cadastro',
  forgot: '/recuperar-senha',
  reset: '/recuperar-senha',
  components: '/qa-components',
};
export function hrefFor(href) {
  if (typeof href !== 'string') href = href?.pathname || '/';
  if (href.startsWith('#')) return href;
  if (/^https?:/.test(href)) return '#qa-external-disabled';
  const url = new URL(href, location.origin);
  let screen = Object.keys(paths).find((k) => paths[k] === url.pathname);
  if (!screen)
    screen = url.pathname.startsWith('/trocas/')
      ? 'trade-detail'
      : url.pathname.startsWith('/pedidos/')
        ? 'order-detail'
        : url.pathname.startsWith('/perfil/')
          ? 'profile'
          : 'library';
  const p = new URLSearchParams(location.search);
  p.set('screen', screen);
  p.delete('id');
  p.delete('username');
  if (screen === 'trade-detail' || screen === 'order-detail')
    p.set('id', url.pathname.split('/').pop());
  if (screen === 'profile') p.set('username', url.pathname.split('/').pop());
  for (const [k, v] of url.searchParams) p.set(k, v);
  return '/?' + p.toString();
}
export const usePathname = () => paths[qa.screen] || '/';
export const useSearchParams = () => params;
export const useParams = () => ({
  id: qa.screen === 'trade-detail' ? 'trade-demo' : 'order-demo',
  username: 'bruno_tcg',
});
const router = {
  push: (href) => location.assign(hrefFor(href)),
  replace: (href) => location.replace(hrefFor(href)),
  refresh: () => location.reload(),
  back: () => history.back(),
  prefetch: () => {},
};
export const useRouter = () => router;
export function redirect(href) {
  router.replace(href);
}
export function notFound() {
  throw new Error('QA: página não encontrada');
}
