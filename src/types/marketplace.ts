import type { Profile } from './index';

export type MarketplaceListingStatus =
  'draft' | 'pending' | 'active' | 'rejected' | 'paused' | 'sold';
export type MarketplaceOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'disputed'
  | 'payment_review';
export type MarketplaceConfig = {
  enabled: boolean;
  commission_bps: number | null;
  pickup_instructions: string;
  terms_version: string;
  payments_ready: boolean;
  payment_methods: string[];
};
export type SellerPaymentAccount = { seller_id: string; connected: boolean; updated_at: string };
export type MarketplaceListing = {
  id: string;
  seller_id: string;
  collection_item_id: string;
  game: 'yugioh' | 'pokemon';
  card_id: string;
  card_name: string;
  image_url: string | null;
  condition: string;
  language: string;
  rarity: string;
  set_code: string;
  description: string;
  price_cents: number;
  quantity: number;
  photos: string[];
  status: MarketplaceListingStatus;
  rejection_reason: string | null;
  seller_commission_bps: number | null;
  seller_terms_version: string;
  created_at: string;
  updated_at: string;
  seller?: Profile;
};
export type MarketplaceOrderItem = {
  listing_id: string;
  collection_item_id: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  listing_snapshot: MarketplaceListing;
};
export type MarketplaceOrder = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  collection_item_id: string;
  listing_snapshot: MarketplaceListing;
  items: MarketplaceOrderItem[];
  quantity: number;
  subtotal_cents: number;
  commission_bps: number;
  commission_cents: number;
  seller_net_cents: number;
  refunded_cents: number;
  refunded_commission_cents: number;
  terms_version: string;
  pickup_instructions: string;
  status: MarketplaceOrderStatus;
  expires_at: string;
  payment_id: string | null;
  payment_status: string | null;
  request_reason: string | null;
  refund_requested: boolean;
  created_at: string;
  updated_at: string;
  buyer?: Profile;
  seller?: Profile;
};

export type MarketplacePayment = {
  payment_id: string;
  order_id: string;
  status: string;
  amount_cents: number;
  refunded_cents: number;
  updated_at: string;
};
/** Observação de homologação; não representa pedido nem entrega de carta. */
export type MarketplaceCheckoutTest = {
  id: string;
  created_at: string;
  expires_at: string;
  preference_id: string | null;
  payment_id: string | null;
  payment_status: string | null;
  payment_method: string | null;
  verified_at: string | null;
  amount_cents: number;
  commission_cents: number;
  commission_bps: number;
  provider_live_mode: boolean | null;
  identity_verified: boolean;
};
