export type UserRole = "master" | "organizer" | "member";
export type UserStatus = "pending" | "approved" | "rejected";
export type AccessType = "free_public" | "free_rsvp" | "paid";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  membership_code: string;
  role: UserRole;
  status: UserStatus;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  venue_secret: boolean;
  lineup: string[];
  cover_image: string | null;
  is_published: boolean;
  early_access_until: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventParty {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  end_time: string | null;
  menu_closes_at: string | null;
  venue_text: string | null;
  access_type: AccessType;
  capacity: number | null;
  venue_id: string | null;
  lineup: string[];
  venue_secret: boolean;
  venue_secret_hint: string | null;
  venue_reveal_hours: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RSVP {
  id: string;
  event_id: string;
  party_id: string;
  user_id: string;
  reminder_sent: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  checked_in_at: string;
  checked_in_by: string;
}

export interface EventMedia {
  id: string;
  event_id: string;
  uploaded_by: string;
  url: string;
  type: "photo" | "video";
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  file_size: number | null;
  order: number;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

export interface TicketTier {
  id: string;
  event_id: string;
  party_id: string | null;
  name: string;
  price: number;
  quantity: number | null;
  show_remaining: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  party_id: string | null;
  tier_id: string;
  user_id: string;
  sumup_checkout_id: string | null;
  sumup_transaction_code: string | null;
  amount_paid: number;
  reminder_sent: boolean;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  website_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  address: string | null;
  google_maps_url: string | null;
  photo_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketRefund {
  id: string;
  ticket_id: string;
  requested_by: string;
  processed_by: string | null;
  reason: string | null;
  admin_note: string | null;
  amount: number;
  status: "pending" | "approved" | "rejected";
  sumup_status: "pending" | "completed" | "failed" | null;
  type: "user_request" | "admin_initiated";
  created_at: string;
  processed_at: string | null;
}

export interface PendingPurchase {
  id: string;
  event_id: string;
  party_id: string | null;
  tier_id: string;
  user_id: string;
  sumup_checkout_id: string;
  status: "pending" | "completed" | "failed" | "expired";
  ticket_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrinkItem {
  id: string;
  event_id: string;
  party_id: string | null;
  name: string;
  price: number;
  sort_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DrinkOrder {
  id: string;
  event_id: string;
  party_id: string | null;
  user_id: string | null;
  sumup_checkout_id: string;
  total_amount: number;
  status: "pending" | "completed" | "failed" | "expired";
  items: DrinkOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface DrinkOrderItem {
  drink_item_id: string;
  drink_name: string;
  price: number;
  quantity: number;
}

export interface DrinkToken {
  id: string;
  order_id: string;
  event_id: string;
  party_id: string | null;
  user_id: string | null;
  drink_item_id: string | null;
  drink_name: string;
  price: number;
  token: string;
  status: "purchased" | "redeemed";
  redeemed_at: string | null;
  created_at: string;
}
