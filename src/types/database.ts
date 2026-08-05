// The one import in this file, and the direction is inverted on purpose. The
// door's contract is shared by three places at once — the wire, the client and
// the `door_scan_events` table — so it is defined once in `@/lib/door/outcome`,
// which imports nothing, and is read from here. Re-declaring the literals would
// mean a divergence between the table and the response could survive until a
// night; importing them makes it a `npm run build` error, which in a repository
// with no test runner is the only automatic gate there is.
import type {
  DoorSubjectType,
  DoorScanOutcomeKind,
  DoorScanCause,
  DoorScanSource,
} from "@/lib/door/outcome";

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
  approved_via: 'referral' | 'guest_list' | 'admin_manual' | null;
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
  /** NULL means the presence is event-level, not that a party is missing. */
  party_id: string | null;
  // `checked_in_at` has a default but no NOT NULL, and `checked_in_by` has
  // neither (schema.sql:235-236). Both were typed non-nullable here until
  // 2026-08-05; the correction is not an addition.
  checked_in_at: string | null;
  checked_in_by: string | null;
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

export interface DiscountCode {
  id: string;
  party_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_amount: number;
  max_uses: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscountCodeTier {
  discount_code_id: string;
  tier_id: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  party_id: string | null;
  tier_id: string | null;
  user_id: string;
  sumup_checkout_id: string | null;
  sumup_transaction_code: string | null;
  amount_paid: number;
  ticket_type: 'purchased' | 'guest_list';
  discount_code_id: string | null;
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
  /**
   * Nullable since 2026-08-05: the foreign key is now ON DELETE SET NULL, so
   * this goes to NULL when the refunded ticket is deleted. The correction is
   * the point of the change, not a side effect — read `refunded_ticket_id`
   * for which ticket it was.
   */
  ticket_id: string | null;
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
  // The refund's evidence. Deliberately not foreign keys in SQL, so that they
  // survive the ticket they name. On a row written before 2026-08-05 these are
  // NULL and mean *unknown*, never *none* — the tickets were already gone.
  refunded_ticket_id: string | null;
  refunded_party_id: string | null;
  refunded_event_id: string | null;
  refunded_at: string | null;
}

export interface PendingPurchase {
  id: string;
  event_id: string;
  party_id: string | null;
  tier_id: string;
  user_id: string;
  sumup_checkout_id: string;
  status: "pending" | "completed" | "failed" | "expired";
  discount_code_id: string | null;
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

export type DrinkTokenStatus = "purchased" | "active" | "redeemed" | "refunded";

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
  status: DrinkTokenStatus;
  activated_at: string | null;
  redeemed_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export type GuestListStatus = 'pending' | 'invited' | 'registered' | 'ticket_issued' | 'checked_in' | 'already_has_ticket' | 'failed';

export interface GuestListEntry {
  id: string;
  event_id: string;
  party_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  added_by: string;
  status: GuestListStatus;
  profile_id: string | null;
  ticket_id: string | null;
  error_message: string | null;
  // NULL means *not recorded*, including on a row already at 'checked_in':
  // the moment and the operator had nowhere to be written before 2026-08-05.
  // Read `status` for whether the guest was checked in.
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A single read at the door, and its outcome. Append-only.
 *
 * FIX-13: the subject is a ticket, an entry or a membership — never a person.
 * FIX-12: there is no field here holding a member's name or their address,
 * because the table has no such column; the copyable technical view renders
 * these fields straight and therefore cannot export personal data.
 * FIX-04a: `cause` is NULL on every row the scanner writes. Classification is
 * applied afterwards, over these rows, never at the phone.
 */
export interface DoorScanEvent {
  id: string;
  party_id: string;
  event_id: string;
  subject_type: DoorSubjectType;
  ticket_id: string | null;
  guest_entry_id: string | null;
  subject_user_id: string | null;
  outcome: DoorScanOutcomeKind;
  cause: DoorScanCause | null;
  scanned_at: string;
  recorded_at: string;
  operator_id: string;
  device_id: string;
  source: DoorScanSource;
  token_fingerprint: string | null;
  /** A reversal is a further event, not an erasure of the admission. */
  is_undo: boolean;
}
