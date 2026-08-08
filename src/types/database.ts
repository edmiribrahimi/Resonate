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
// The second import, same inverted direction and the same reason. The nine
// capability keys are shared by a policy body, a catalogue row and every
// TypeScript caller, so they are defined once in `@/lib/capabilities/keys`,
// which imports nothing, and are read from here.
import type { CapabilityKey } from "@/lib/capabilities/keys";
// The third import, same inverted direction. The register's two vocabularies are
// shared by a SQL `CHECK`, a stored procedure's arguments and every TypeScript
// caller, so they are defined once in `@/lib/membership/acts`, which imports
// nothing, and are read from here.
import type { MembershipAct, MembershipActorKind } from "@/lib/membership/acts";

// `staff` is the fourth role (phase 43, D-01), and the measured consequence of
// adding it here is the opposite of what a reader expects: **this widening
// produces no new build errors.** Seventeen of the twenty-one sites that
// enumerate a role write `role as UserRole` on a value read from the database,
// and a cast tells the compiler to stop checking — so the switches, the
// filters and the badge maps that now need a fourth branch are invisible to
// `npm run build`. The only compile-detectable site is `updateMemberRole`'s
// parameter type (`src/app/(admin)/admin/members/actions.ts:113-115`), widened
// deliberately by plan 43-09.
//
// The list to walk is `43-RESEARCH.md` § G.1; plan 43-14 walks its interface
// half. Do not read a green build as evidence that the four-role model is
// wired — it is evidence of the casts.
export type UserRole = "master" | "organizer" | "staff" | "member";
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
  /**
   * What this entry WAS, taken at the door and written at the door — phase 43,
   * plan 10, ACCT-05/D-13 (`20260808003000_attendances_entry_role.sql`).
   *
   * Typed `string | null` and deliberately **not** `UserRole | null`, which
   * would be the tidier line and the false one. The column has no CHECK (the
   * migration says why: a fourth role enumeration would raise a `23514` inside
   * the door's insert, in front of a queue), so the database can hold a label
   * this union cannot name. A type that promised `UserRole` would be a type
   * that lies, and `supabase-data.md` prefers an absent type to a lying one.
   *
   * NULL means **"written before this column existed"** — or, on a row written
   * after it, "the door sent a label nobody could recognise". It never means
   * "this entry was an ordinary member". A night report that counts NULLs as
   * members prints a fabricated number.
   *
   * The value is denormalised at write time with no foreign key: it may
   * disagree with `Profile.role` and the disagreement is the record working,
   * not a defect.
   *
   * As plan 43-07 noted for the register, and for the same reason: **no
   * Supabase client in this repository is parameterised with `Database`**
   * (`src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `service.ts`),
   * so this field name is checked by nothing at any call site. A typo here and
   * a typo in the insert would both compile, and the first thing that would
   * notice either is a real scan at a real door.
   */
  entry_role: string | null;
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

/**
 * One act on an account's role or status. Append-only.
 *
 * ── This interface protects NOTHING, and that has to be said here ────────────
 *
 * **No Supabase client in this repository is parameterised with `Database`**
 * (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:15`,
 * `service.ts:4`), and this file declares no `Database` type at all. So the
 * column names below are checked by nothing at any call site: a `select` naming
 * `subject_lable` compiles, runs, and returns `undefined`. A reader who finds a
 * typed interface next to a table will assume the queries are being held to it,
 * and they are not — the interface documents the shape and satisfies
 * `supabase-data.md`'s gate *tipi allineati* in the same commit as the DDL.
 *
 * ── What IS enforced, on each side separately ────────────────────────────────
 *
 * `act` and `actor_kind` are the two unions of `@/lib/membership/acts`, imported
 * rather than re-declared, and mirrored by SQL `CHECK` constraints on
 * `public.membership_acts`. `npm run build` holds the TypeScript half; the
 * database refuses a row that disagrees with the SQL half. Nothing compares the
 * two, which is why that module states the one-commit rule.
 *
 * `role_before` / `role_after` / `status_before` / `status_after` are plain
 * `string`, deliberately, and NOT `UserRole` / `UserStatus`: they are evidence
 * of what was true then. Typing them to the current enumerations would make the
 * history of a retired role unrepresentable, and the migration refuses the same
 * thing on the SQL side by giving them no CHECK.
 *
 * `subject_label` is a MEMBERSHIP CODE. Never an address, never a full name —
 * this repository is public and a register row reaches artefacts.
 */
export interface MembershipActRow {
  id: string;
  act: MembershipAct;
  /** NULL once the account is deleted. The act outlives its subject. */
  subject_id: string | null;
  /** The subject's membership code, denormalised so the row survives them. */
  subject_label: string;
  /** NULL for a `system` act, and only then — the table refuses the other three combinations. */
  actor_id: string | null;
  actor_kind: MembershipActorKind;
  /** NULL means *this act did not touch that axis*, never *the value was null*. */
  role_before: string | null;
  role_after: string | null;
  status_before: string | null;
  status_after: string | null;
  /** The server clock. A device clock is evidence, never authority. */
  at: string;
  /**
   * Which night the act was about. Phase 35 writes it, for the acts `'assigned'`
   * and `'unassigned'`; NULL on every act that is about the account itself.
   *
   * Both role pairs and both status pairs stay NULL on those two acts, and that
   * is not an omission: an assignment moves neither axis. It grants a capability
   * for one night — `public.party_assignments` holds that — and the register
   * holds who did it and when.
   */
  party_id: string | null;
  /** Optional context, never a person's name or an address. */
  note: string | null;
}

/**
 * A row of `public.party_assignments` — phase 35's per-night assignment
 * (`supabase/migrations/20260809000000_party_assignments.sql`).
 *
 * ── What this table is, in one sentence ──────────────────────────────────────
 *
 * One capability, granted to one account, for one night, by somebody, until a
 * stated instant — and, if it was taken away, when and by whom. **A revocation
 * updates this row; it never deletes it.**
 *
 * ── The honest limit, the same one `MembershipActRow` carries ────────────────
 *
 * None of the four Supabase clients is parameterised, so this interface
 * DOCUMENTS the shape and does not make a query against it type-checked. The
 * database refuses a row that disagrees with the five named constraints in that
 * migration; `npm run build` cannot tell you that it agrees.
 *
 * No personal data. The type carries no name, no address and no membership code:
 * an assignment is about a ROLE at a door, and this repository is public.
 */
export interface PartyAssignmentRow {
  id: string;
  /** The night. `ON DELETE CASCADE`: an assignment to a night that no longer exists cannot be resolved. */
  party_id: string;
  /** Who holds it. */
  user_id: string;
  /** One of the four assignable keys — never the whole capability catalogue. */
  capability: string;
  /**
   * The role the holder carried when it was granted.
   *
   * **`null` means REVOKED**, never *we do not know*. The nullability is the
   * mechanism, not a gap in the data: the composite foreign key
   * `(user_id, assignee_role) → public.profiles (id, role)` is `MATCH SIMPLE`,
   * so it is not enforced once this column is null — which is what frees the
   * holder's role from a row that is no longer about anything. Read it as *this
   * row constrains nobody any more*.
   */
  assignee_role: "master" | "organizer" | "staff" | null;
  /** Who granted it. Never equal to `user_id` — the database refuses that with `23514`. */
  assigned_by: string;
  /** The server clock at the grant. */
  granted_at: string;
  /**
   * When it stops. Computed AT THE GRANT from the night, **never sent by a
   * client**: a device clock is evidence, never authority, and a boundary chosen
   * by the caller is a permission window chosen by whoever is being checked.
   */
  ends_at: string;
  /**
   * **`null` means LIVE.**
   *
   * A revocation is an update of this column and of `revoked_by`, paired by
   * `party_assignments_revocation_paired` — **never a `DELETE`**. The offline
   * drain has to be able to ask *"was this live at `scannedAt`?"* after the
   * revocation, because a phone that was at the door at 01:40 syncs at 03:00 and
   * the answer must be about 01:40.
   */
  revoked_at: string | null;
  /** Who revoked it. `null` while live, and `null` again if that account is later deleted. */
  revoked_by: string | null;
}

/**
 * The two `private` tables, and the payload of the one exposed function.
 *
 * ── The honest limit of these three declarations ─────────────────────────────
 *
 * This file has no `Database` type and no `Functions` map, and none of the four
 * Supabase clients is parameterised (`src/lib/supabase/client.ts:4`,
 * `server.ts:7`, `middleware.ts:15`, `service.ts:4`). So the interfaces below
 * **document** the shapes and do **not** make `supabase.rpc("my_access_context")`
 * type-checked: a misspelled function name is still a runtime error, an unknown
 * capability key still resolves to `false`, and a caller that casts the RPC
 * result to `AccessContext` is asserting, not proving. `npm run build` cannot
 * tell you that the database agrees.
 *
 * Neither table is reachable over the API — PostgREST serves
 * `public,graphql_public` only — so `Capability` and `RoleCapability` describe
 * rows no client will ever receive. They are here so that a script or a
 * migration reader has one place to check the shape against, and so the
 * `supabase-data.md` gate *tipi allineati* is satisfied in the same commit as
 * the DDL.
 */
export interface Capability {
  key: CapabilityKey;
  description: string;
}

export interface RoleCapability {
  role: UserRole;
  capability: CapabilityKey;
  /**
   * The inherited inconsistency, carried as data. `false` reproduces the 34
   * policies that ignore status; `true` reproduces the four `artists`/`venues`
   * policies that require `approved`. It is not a setting to tidy.
   */
  requires_approved: boolean;
}

/**
 * What `public.my_access_context()` returns. Exactly one row, always.
 *
 * `user_id` is the caller's own `auth.uid()` — the `sub` of the JWT Postgres
 * already verified to authenticate the request. It was added by
 * `supabase/migrations/20260808000000_access_context_user_id.sql` so that the
 * ten sites deciding `events.created_by === <me>` can stop reading an
 * attacker-supplied identity header. It is null only for a caller with no
 * session, which the `REVOKE … FROM anon` makes unreachable through the granted
 * path — so a null here on a signed-in caller means the migration has not been
 * applied, and every consumer refuses on it rather than guessing.
 *
 * `role` and `status` are null when the subject has no profile row — which is
 * also the case in which `capabilities` is empty.
 *
 * **No new caller may branch on `role` or `status`.** They survive in this
 * payload for exactly two client components — `MobileNav` and `StaffNav` — which
 * take both as props and cannot import the data-access layer, so a Server
 * Component parent must resolve them and pass them down. Phase 34 (STAFF-03)
 * converts those two to capabilities and owns removing these fields. Every new
 * decision asks `capabilities`.
 *
 * (The file count previously written here was wrong — it read 46: the measured count
 * of files reading the injected role/status headers is **44**, and phase 33 takes
 * it to **0**. See the supersession note in
 * `20260808000000_access_context_user_id.sql`.)
 */
export interface AccessContext {
  capabilities: CapabilityKey[];
  user_id: string | null;
  role: UserRole | null;
  status: UserStatus | null;
}
