export type Card = {
  id: number;
  name: string;
  type: string;
  frameType: string;
  desc: string;
  race: string;
  atk?: number;
  def?: number;
  level?: number;
  attribute?: string;
  archetype?: string;
  card_images: {
    id: number;
    image_url: string;
    image_url_small: string;
    image_url_cropped: string;
  }[];
  card_sets?: { set_name: string; set_code: string; set_rarity: string; set_price: string }[];
};
export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  neighborhood: string;
  city: string;
  avatar_url: string | null;
  created_at: string;
};
export type CollectionItem = {
  id: string;
  user_id: string;
  card_id: number;
  card_name: string;
  card_type: string;
  quantity: number;
  condition: string;
  language: string;
  rarity: string;
  set_code: string;
  for_trade: boolean;
  notes: string;
  created_at: string;
  photo_url: string | null;
  profiles?: Profile;
};
export type Wish = {
  id: string;
  user_id: string;
  card_id: number;
  card_name: string;
  card_type: string;
  created_at: string;
};
export type Match = {
  partner_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  neighborhood: string;
  offered: CollectionItem[];
  wanted: CollectionItem[];
  score: number;
};
export type Trade = {
  id: string;
  proposer_id: string;
  recipient_id: string;
  offered_item_id: string;
  requested_item_id: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined' | 'cancelled';
  proposer_confirmed: boolean;
  recipient_confirmed: boolean;
  created_at: string;
  updated_at: string;
  offered: CollectionItem;
  requested: CollectionItem;
  proposer: Profile;
  recipient: Profile;
};
export type Message = {
  id: string;
  trade_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};
