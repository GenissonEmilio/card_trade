// @ts-nocheck
import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from './providers';
import { qa, params } from './fixtures';
import { installApi } from './api';
import { Shell } from '../../../src/components/shell';
import { Library } from '../../../src/components/library';
import { Decks } from '../../../src/components/decks';
import { Settings } from '../../../src/components/settings';
import { Profile } from '../../../src/components/profile';
import { Matches } from '../../../src/components/matches';
import { Trades, TradeDetail } from '../../../src/components/trades';
import { Marketplace, SellerMarketplace } from '../../../src/components/marketplace';
import {
  MarketplaceOrders,
  MarketplaceOrderDetail,
} from '../../../src/components/marketplace-orders';
import { AdminDashboard } from '../../../src/components/admin';
import { MarketplaceModeration } from '../../../src/components/marketplace-admin';
import { Community } from '../../../src/components/community';
import { Explore } from '../../../src/components/explore';
import { AuthForm } from '../../../src/components/auth-form';
import { ComponentsReview } from './components';
installApi();
document.addEventListener(
  'click',
  (event) => {
    const anchor = event.target.closest?.('a');
    if (anchor?.href && new URL(anchor.href).origin !== location.origin) {
      event.preventDefault();
      qa.log.push({ type: 'blocked-external-navigation', url: anchor.href });
    }
  },
  true,
);
const screens = {
  library: <Library />,
  wishlist: <Library wishlist />,
  decks: <Decks />,
  settings: <Settings />,
  profile: <Profile username={params.get('username') || 'bruno_tcg'} />,
  community: <Community />,
  matches: <Matches />,
  trades: <Trades />,
  'trade-detail': <TradeDetail id={params.get('id') || 'trade-demo'} />,
  marketplace: <Marketplace />,
  seller: <SellerMarketplace />,
  orders: <MarketplaceOrders />,
  'order-detail': <MarketplaceOrderDetail id={params.get('id') || 'order-demo'} />,
  admin: <AdminDashboard />,
  moderation: <MarketplaceModeration />,
  explore: <Explore />,
  login: <AuthForm mode="login" />,
  register: <AuthForm mode="signup" />,
  forgot: <AuthForm mode="forgot" />,
  reset: <AuthForm mode="reset" />,
  components: <ComponentsReview />,
};
class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error: String(error) };
  }
  componentDidCatch(error) {
    qa.log.push({ type: 'render-error', error: String(error) });
  }
  render() {
    return this.state.error ? (
      <main data-qa-error style={{ padding: 40 }}>
        <h1>Falha no harness de revisão</h1>
        <pre>{this.state.error}</pre>
      </main>
    ) : (
      this.props.children
    );
  }
}
document.documentElement.lang = 'pt-BR';
document.title = `QA isolada · ${qa.screen} · ${qa.state} · ${qa.role}`;
createRoot(document.getElementById('root')).render(
  <Boundary>
    <Providers>
      {params.get('shell') === '0' ? (
        screens[qa.screen]
      ) : (
        <Shell>{screens[qa.screen] || screens.library}</Shell>
      )}
    </Providers>
  </Boundary>,
);
