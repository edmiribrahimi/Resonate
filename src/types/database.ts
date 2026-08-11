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

/**
 * The catalogue of formats and of series — phase 36, plan 06 (FMT-01, FMT-05),
 * mirroring `supabase/migrations/20260810120000_formats_and_series.sql` §1 and §2.
 *
 * ── The honest limit, stated again here because this is where it will bite ────
 *
 * **None of the four Supabase clients is parameterised with `Database`**
 * (`src/lib/supabase/client.ts:4`, `server.ts:7`, `middleware.ts:211`,
 * `service.ts:4`), and this file declares no `Database` type at all. So the two
 * interfaces below are DOCUMENTATION AND NOT ENFORCEMENT: a `.select()` naming
 * `format_di` compiles, runs, and returns `undefined` — on a surface, with
 * nothing logged, in a repository with no error tracking (`meta-gates.md`).
 *
 * The sentence is not new — `MembershipActRow`, `EventMediaRow` and
 * `Attendance.entry_role` each carry their own copy, for their own columns. It
 * is repeated a fourth time because it is the reason **every later plan in this
 * phase verifies its queries by RUNNING them and not by compiling them**, and a
 * reader who arrives at `Format` from the migration rather than from one of
 * those three would otherwise not meet it. It is recorded in
 * `.planning/STATE.md` as well.
 *
 * `supabase-data.md`, gate *tipi allineati*, is still a hard requirement. It
 * just buys less than it looks like it does.
 */
export interface Format {
  id: string;
  /**
   * The address: `/events?format=<slug>` (D-36-15). It travels inside a link
   * somebody may have sent to somebody else, so changing it breaks that link.
   */
  slug: string;
  /**
   * The string a visitor reads, stored verbatim — `re:sonate` with a normal e,
   * `SunSet` / `RamaDub` / `MotionLab` in CamelCase. No surface derives it from
   * the slug or from the code: FMT-05 says the label comes from the data.
   */
  name: string;
  /** Internal (`RSNT`, `SNST`, `RMDB`, `MTNLB`). Never a public surface alone. */
  code: string;
  /**
   * The identification colour, `#RRGGBB`, constrained by
   * `formats_color_hex_check`. In the data and not in a component (D-36-12), so
   * changing one needs no deploy — and because Tailwind cannot generate a class
   * from a runtime value, it reaches the DOM through an inline `style`.
   */
  color: string;
  /**
   * *A person has decided this may be seen.* NOT the same question as
   * `retired_at`, which says *no new night may be assigned to this* (D-36-17).
   * The public read policy `formats_select_listed` asks this column.
   */
  listed: boolean;
  /** Retirement is not deletion (D-36-10). `null` means active. */
  retired_at: string | null;
  /** Display order only. Freely rewritable — unlike `EventParty.number`. */
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One numbered run of one format. The SERIES carries the counter, never the
 * format: a format that visits several venues has one series per venue and the
 * progressivo restarts inside each (D-36-07).
 *
 * `name` is **the one string in this phase that publishes** — it may contain a
 * venue, which is why `public.party_series` is readable only through a
 * published night (`venue-acquisition.md`, gate *uno spazio non acquisito non
 * si nomina*; migration §4b).
 */
export interface PartySeries {
  id: string;
  format_id: string;
  /** The public name, verbatim. Same spelling rules as `Format.name`. */
  name: string;
  /** Internal (`BZ`, `MR`, `PRLN`, `RSNT`, `SNST`). Never public alone. */
  code: string;
  /** `null` means active. */
  retired_at: string | null;
  /**
   * The water level: the highest progressivo this series has ever handed out.
   * **Not** the count of its nights and **not** `max(number)` — the trigger
   * `event_parties_bump_series_watermark` raises it with `GREATEST`, so a
   * deleted night cannot lower it and a number already on a poster is never
   * proposed twice (`meta-gates.md`, monotone guard 3).
   */
  highest_assigned: number;
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
  /**
   * WHEN this night's address was let out BY HAND, or NULL if it never was.
   * `20260810160000_manual_venue_reveal.sql` §2, applied to production
   * 2026-08-10 as version `20260810210214`.
   *
   * ── IT IS NOT `venue_reveal_email_sent` UNDER A NEW NAME ────────────────────
   *
   * The two answer different questions, and the migration carries this same
   * sentence as a `COMMENT` so neither copy can drift alone.
   * `venue_reveal_email_sent` says **the mails have gone out** — a one-way
   * switch that NO branch of `public.record_venue_reveal_act` touches. This
   * column says **the page is open**, and the `re_hidden` act (D-37-22, master
   * only) sets it back to NULL.
   *
   * That asymmetry is the point, not an oversight: a night can return to secret
   * ON THE PAGE while the mails stay sent, which is the only honest pair of
   * states once an address has left. Lowering the mail flag instead would send
   * the cron to post the address a second time.
   *
   * NULL is the right value for every row that existed before this column —
   * none of them was revealed by hand, because there was no way to do it. The
   * column is nullable with no `DEFAULT` (`supabase-data.md`, gate *default
   * sulle righe esistenti*), and zero rows carried a value at the moment it was
   * added.
   *
   * The scheduled path never writes here: `src/app/api/cron/venue-reveal/`
   * marks `venue_reveal_email_sent` and nothing else. So a NULL means *nobody
   * pressed the button*, never *this night was not revealed*.
   *
   * NOTE, and it will bite the next reader: this interface does NOT declare
   * `venue_reveal_on_purchase` or `venue_reveal_email_sent`, both of which exist
   * on the table. That gap predates this column and is recorded in
   * `deferred-items.md`; do not read their absence here as their absence there.
   */
  venue_revealed_at: string | null;
  /**
   * WHAT THIS NIGHT IS, and WHICH RUN of it. Both `NOT NULL` after
   * `20260810120000_formats_and_series.sql` §9 — FMT-01: a night cannot be
   * saved without saying what format it is. Neither carries a database default,
   * deliberately: a constant default would write the same format onto every
   * night that any path forgot to set (§3).
   *
   * They cannot contradict each other. `event_parties_series_format_fk` points
   * at `party_series (id, format_id)`, so a night whose format disagrees with
   * the format of its own series is **not writable** — there is nothing to
   * reconcile because the contradiction cannot be stored.
   */
  format_id: string;
  series_id: string;
  /**
   * The progressivo of this night inside its series.
   *
   * **NULLABLE ON PURPOSE, and the plan for this file said otherwise.** The
   * migration sets `NOT NULL` on `format_id` and `series_id` only (§9); §9a
   * argues `number` at length and the column carries the same sentence as a
   * `COMMENT`. A night that is an ACT of another night — the first act of a
   * double bill — carries that night's format and that night's series and **no
   * number of its own**, because the code and the number COMPOSE a sigla and an
   * act has no sigla. One such row exists in production today.
   *
   * Typing this `number` would be a type that lies, and a type that lies is
   * worse than no type: the compiler would confirm an assumption the database
   * refuses. Do not tighten it here, and do not tighten the column.
   *
   * Uniqueness still holds: `event_parties_format_series_number_unique` refuses
   * two nights sharing the triple, and in Postgres two `NULL`s are DISTINCT —
   * so two numberless acts are not a duplicate. That is the correct reading and
   * not a hole.
   */
  number: number | null;
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

/**
 * One row of `public.event_media` — the file, and the NIGHT it belongs to.
 *
 * ── `party_id`, and the one reading the type cannot forbid ───────────────────
 *
 * The rule below is written in THREE places that must say the same thing: the
 * `COMMENT ON COLUMN` and the trigger comment of
 * `supabase/migrations/20260809004500_event_media_party_id.sql`, and here. Three
 * places because the next reader arrives from one of the three, and two
 * formulations of one rule are two rules.
 *
 * ── The honest limit, the same one `PartyAssignmentRow` and `PartyCreditRow`
 *    carry ──────────────────────────────────────────────────────────────────
 *
 * None of the four Supabase clients is parameterised with a `Database` generic
 * (`src/lib/supabase/server.ts:7`), so this interface is a CATALOGUE FOR THE
 * READER and not a constraint the compiler applies to a query. **A green
 * `npm run build` does not prove that any query writes `party_id`** — the
 * database proves that, by refusing the insert.
 */
export interface EventMediaRow {
  id: string;
  event_id: string;
  /**
   * The night this file belongs to.
   *
   * `null` means **LEGACY ROW, EVENT SCOPE**: uploaded before the column
   * existed, on an event with more than one night, where attributing a night
   * after the fact would be inventing it — and for a file shot inside a secret
   * venue the night is not a detail.
   *
   * A legacy row is **read and moderated exactly as today**: the guard is a
   * `BEFORE INSERT` trigger, so no update of an existing row is affected.
   *
   * A legacy row is **never a valid target for a new write**: the trigger
   * `event_media_require_party` refuses every `INSERT` without a night — the
   * service role included, because a policy does not reach it and a trigger
   * does — and the per-night test is an equality between identifiers
   * (`pa.party_id = p_party_id`, inside `private.has_capability`), so `null`
   * satisfies no arm.
   *
   * **`null` does NOT mean "every night"** — in italiano, perche' e' la lingua
   * in cui questa regola e' stata decisa e perche' e' l'unica frase di questo
   * file che non deve essere fraintesa: **`null` non significa «tutte le
   * serate».** Written exactly like that, twice, because it is the reading that
   * would turn a permission scoped to one evening into an unlimited one, and it
   * is the only wrong reading the type alone cannot prevent.
   */
  party_id: string | null;
  /** `null` once the uploading account is deleted — the column is nullable. */
  uploaded_by: string | null;
  url: string;
  type: "photo" | "video";
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  file_size: number | null;
  order: number;
  created_at: string;
}

/**
 * The older name for the same row, kept because it is exported.
 *
 * It is an ALIAS and not a second interface on purpose: two shapes describing
 * one table drift, and this one had already started to — it predates
 * `party_id`, and it typed `uploaded_by` as non-nullable where the column is
 * nullable (`20260225120000_phase7_media.sql:8`). Measured before collapsing
 * it: `grep -rn "EventMedia" src/` finds no reader outside this file, so the
 * correction costs nothing and the divergence cannot reopen.
 */
export type EventMedia = EventMediaRow;

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
  /**
   * `string | null` because the COLUMNS are nullable, not because any writer
   * produces a null: `public.record_membership_act` computes all four itself and
   * **no act has ever left one empty** (measured against a container —
   * `deferred-items.md`, voce 6, still open and out of phase).
   *
   * So read *"this act did not move that axis"* as **`before === after`**, never
   * as a NULL. The NULL semantics documented at
   * `20260808002000_membership_register.sql:244-246` describes an intention the
   * writer never carried out; a reader who waits for a null waits for a value
   * that does not come. See {@link MembershipActRow.party_id} for the case where
   * this matters most.
   */
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
   * ── The four register columns on those two acts, MEASURED ──────────────────
   *
   * **They do NOT stay NULL, and the difference is the whole point.**
   * `public.record_membership_act` computes the after-values itself, as
   * `coalesce(argument, before)`
   * (`20260808002000_membership_register.sql:459-460`), so an assignment act —
   * which passes NULL for both axes precisely so the writer skips its
   * `public.profiles` write — comes out with all four columns **non-null and
   * equal**: `role_before === role_after` and `status_before === status_after`.
   *
   * **`before === after` is how this register says an act did not move that
   * axis**, and for an assignment that is the true statement told in the shape
   * the writer actually produces. It is NOT the NULL that
   * `20260808002000_membership_register.sql:244-246` documents and that no
   * writer has ever produced — an open, out-of-phase debt
   * (`.planning/phases/35-per-night-assignments/deferred-items.md`, voce 6),
   * which names as its first reader exactly the surface that renders this
   * register.
   *
   * Where the measurement lives, so this comment is a citation and not a claim:
   * `supabase/migrations/20260809002000_assignment_acts.sql:423-430` — *«on an
   * assignment act all four come out NON-NULL and equal … Measured against a
   * container; the opposite was written here first, and was wrong»* — and
   * `src/lib/membership/acts.ts:55-67`, which draws the useful consequence: the
   * `assigned` act preserves the role its holder carried at the grant, the one
   * fact `party_assignments.assignee_role` is nulled out of when the assignment
   * is retired.
   *
   * This paragraph said the opposite until 2026-08-09 (WR-08). `supabase-data.md`,
   * gate *tipi allineati*: a type that lies is worse than a type that is absent.
   * No compiler reads a doc comment — the reader does, and the reader would have
   * concluded «that axis was touched» from a value that means the opposite.
   */
  party_id: string | null;
  /** Optional context, never a person's name or an address. */
  note: string | null;
}

/**
 * The act vocabulary of `public.venue_reveal_acts` — **THREE human acts, and
 * not two.** Read from the live `CHECK`, which is the authority:
 * `act IN ('revealed', 'completed', 're_hidden')`.
 *
 * The plan for this file said two, `'revealed'` and `'re_hidden'`, and the plan
 * was wrong — `'completed'` is D-37-20's *send it to the N who are missing*. It
 * sets nothing on the night, and it is recorded ANYWAY, because it mails the
 * address to N more people and is therefore exactly as attributable as the
 * first act. A two-value vocabulary would make the second, third and fourth
 * send invisible while each of them is a publication.
 *
 *   `revealed`  — the address was let out for the first time. The only act that
 *                 sets {@link EventParty.venue_revealed_at}.
 *   `completed` — the remainder went out. Sets nothing on the night.
 *   `re_hidden` — D-37-22, master only. Clears `event_parties.venue_revealed_at`
 *                 so the page goes back to secret, and touches
 *                 `venue_reveal_email_sent` not at all: the mails do not come
 *                 back, and pretending they might is the one thing this act
 *                 must not do.
 *
 * ── WHERE THIS TYPE SHOULD EVENTUALLY LIVE, and what NOT to do ───────────────
 *
 * Three vocabularies in this file are imported from modules that import nothing
 * — the door's outcome, the capability keys, the register's acts — precisely so
 * that a `CHECK`, a stored procedure and every caller cannot disagree. This one
 * belongs in the reveal module that plan 37-10 will create, on the same
 * inverted-import pattern. It is declared here because that module does not
 * exist yet and a type that is absent is worse than a type in the wrong file.
 *
 * **The next reader MOVES it and re-exports; nobody re-declares it.** A second
 * copy of these three literals is exactly the drift the other three imports
 * exist to prevent.
 */
export type VenueRevealAct = "revealed" | "completed" | "re_hidden";

/**
 * A row of `public.venue_reveal_acts` — phase 37's append-only trace of an
 * address becoming public (`20260810160000_manual_venue_reveal.sql` §3).
 *
 * ── Append-only by the ABSENCE of a write path ───────────────────────────────
 *
 * RLS is enabled and there is exactly ONE policy, a `SELECT` for `staff.manage`.
 * There is no `INSERT`, no `UPDATE` and no `DELETE` policy, so no session can
 * write or erase a row: the only writer is
 * `public.record_venue_reveal_act(p_party_id uuid, p_act text, p_actor_id uuid,
 * p_actor_name text, p_recipients_intended integer) RETURNS jsonb`, which is
 * `SECURITY DEFINER`, has `EXECUTE` revoked from `public`, `anon` and
 * `authenticated`, and granted to `service_role` alone. The omission of the
 * three write policies is deliberate and is what makes D-37-22 honest: a night
 * can go back to secret, and the record that it was once revealed cannot be
 * removed by anyone.
 *
 * ── This table holds no address, and that is structural ──────────────────────
 *
 * The subject of every row here is an address becoming public. Recording that
 * address alongside the act would file the act together with the thing it
 * released, in a row that outlives the night and can reach a screenshot. So the
 * venue's name and where it is are simply not columns — and the rule is kept by
 * the only writer, which composes {@link VenueRevealActRow.party_label} itself
 * from the event's title and the night's date, rather than by each caller
 * remembering it.
 *
 * ── The honest limit, the same one the other row types carry ─────────────────
 *
 * None of the four Supabase clients is parameterised with a generated schema,
 * so this interface DOCUMENTS the shape and does not make any query against it
 * type-checked. `npm run build` cannot tell you a column name is right.
 *
 * The refusal vocabulary of the writer — it returns typed refusals as VALUES
 * rather than raising, because on a constraint violation PostgREST hands back
 * the entire failing row and the failing row here is a night, carrying the
 * address — is NOT declared here. It is the contract of the server action, and
 * it belongs to plan 37-10's module next to {@link VenueRevealAct}.
 */
export interface VenueRevealActRow {
  id: string;
  /**
   * The night. `ON DELETE SET NULL`, deliberately NOT `CASCADE`: sixteen
   * constraints already cascade from `public.event_parties`, and this trace does
   * not become one of them. Deleting a night must not delete the proof that its
   * address was made public — that proof is worth most exactly where the row it
   * names has gone.
   */
  party_id: string | null;
  /**
   * Which night it WAS, denormalised so a row whose `party_id` has gone to NULL
   * still says what it was about. The event's title and the night's date, and
   * nothing else — never the venue's name.
   */
  party_label: string;
  act: VenueRevealAct;
  /** Who did it. `ON DELETE SET NULL`: someone who later leaves does not un-perform their acts. */
  actor_id: string | null;
  /**
   * The person's full name, and the divergence from `MembershipActRow` is
   * deliberate (D-37-18). There the subject is a person being JUDGED and the
   * label is a membership code; here the subject is a person who ACTED on a
   * staff surface, and accountability is the whole point — *revealed by
   * ORG-0042* answers nobody's question at 19:00 on a Friday.
   *
   * **The divergence is authorised in the database and stops there.** That name
   * does not enter a PLAN, a SUMMARY, a VERIFICATION or anything else under
   * `.planning/`, which is tracked and public. Artefacts name ROLES.
   */
  actor_name: string;
  /**
   * How many people this act meant to reach — the number the confirmation shows
   * (D-37-16) and the one reported back afterwards (D-37-12). Recipients after
   * de-duplication by email, never tickets plus rsvps, which double-counts
   * anybody holding both.
   */
  recipients_intended: number;
  /** The server clock. A device clock is evidence, never authority. */
  at: string;
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
   * **`null` means RETIRED** — revoked *or* expired — never *we do not know*.
   * The nullability is the mechanism, not a gap in the data: the composite
   * foreign key `(user_id, assignee_role) → public.profiles (id, role)` is
   * `MATCH SIMPLE`, so it is not enforced once this column is null — which is
   * what frees the holder's role from a row that is no longer about anything.
   * Read it as *this row constrains nobody any more*.
   *
   * It said *«null means REVOKED»* until 2026-08-09, and that was the whole of
   * CR-02: expiry released nothing, so an assignment that ended three weeks ago
   * and that nobody revoked blocked every role write on its holder for ever —
   * including `deactivateMember`, the urgent one.
   * `20260809007000_expired_assignments_release_role.sql` gives expiry the same
   * effect, and {@link PartyAssignmentRow.expired_at} says which of the two
   * happened.
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
  /**
   * When the row was RETIRED because its night was already over — CR-02.
   *
   * **Not a revocation, and deliberately not written as one.** `revoked_at`
   * stays `null`, so the offline drain can still ask *"was this live at
   * `scannedAt`?"* about 01:40 at 03:00, which is the whole of ASSIGN-03. What
   * the stamp does is release {@link PartyAssignmentRow.assignee_role}, so the
   * composite key stops refusing every role write on the holder.
   *
   * **There is no `expired_by`, and its absence is the statement.** Nobody
   * performs an expiry: time passes. Attributing it to a person would be false
   * and attributing it to `'system'` would put a non-act into the member
   * register, so the record of the expiry is this column and nothing else.
   *
   * `party_assignments_expiry_not_before_end` refuses a value earlier than
   * `ends_at`, which is what keeps *"a LIVE assignment blocks a demotion"* true:
   * the release cannot be back-dated into a way of unlocking one.
   */
  expired_at: string | null;
}

/** The four roles a credit may carry, mirrored by `party_credits_credit_check`. */
export type PartyCredit = "dj" | "photographer" | "host" | "visual";

/**
 * A row of `public.party_credits` — phase 35's public credit
 * (`supabase/migrations/20260809003000_party_credits.sql`).
 *
 * ── What this table is, in one sentence ──────────────────────────────────────
 *
 * One artist, credited in one role, on one night, recorded by somebody. It is an
 * ATTRIBUTION and nothing else.
 *
 * ── THE FIELD THAT IS NOT HERE, and why that is the guarantee ────────────────
 *
 * **This type has no account field, and it must never acquire one.** Not
 * `user_id`, not `profile_id`, not `auth_user_id`, not an optional one "for
 * later". A person can be credited on a night WITHOUT HAVING AN ACCOUNT — that
 * is ASSIGN-06 — and a credit grants access to nothing.
 *
 * A credit that TRIED to carry an account **would not compile**: there is no
 * field to put it in, and `npm run build` is this repository's type gate. That
 * is half of the automatic coverage ASSIGN-06 can have. The other half is
 * structural on the database side — the table has no such column either, so the
 * join somebody would write in good faith,
 * `join public.party_credits pc on pc.user_id = auth.uid()`, does not parse.
 * Adding either side takes a migration or an edit to this interface: a visible,
 * dated decision, never an autocomplete.
 *
 * `created_by` is NOT that field. It is the account that INSERTED the row, in
 * exactly the sense `public.artists.created_by` already uses
 * (`20260226100000_artist_profiles.sql:12`) — never who the artist is.
 *
 * ── The honest limit, the same one `PartyAssignmentRow` carries ──────────────
 *
 * None of the four Supabase clients is parameterised, so this interface
 * DOCUMENTS the shape and does not make a query against it type-checked. The
 * database refuses a row that disagrees with the two named constraints in that
 * migration; `npm run build` cannot tell you that it agrees.
 *
 * No personal data, and this is not a formality on this table. A credit is about
 * a night, and a night that has not been announced is material
 * (`sound-manifesto.md`, gate *la line-up e' materiale, non manifesto*). This
 * repository is PUBLIC: no artist name, no date and no venue belongs in this
 * file — only the shape of the row that holds them.
 */
export interface PartyCreditRow {
  id: string;
  /** The night. `ON DELETE CASCADE`: a credit on a night that no longer exists is about nothing. */
  party_id: string;
  /**
   * Which catalogue row is credited — a RELATION, never a name repeated here.
   * `ON DELETE RESTRICT`: detach the credit before deleting the artist.
   */
  artist_id: string;
  /** In which role. Mirrored by a SQL `CHECK`; nothing compares the two halves. */
  credit: PartyCredit;
  /** Display order only. It carries no meaning about seniority or fee. */
  sort_order: number;
  /**
   * Who RECORDED the row — never who the artist is. `null` once that account is
   * deleted, which costs attribution and disarms nothing.
   */
  created_by: string | null;
  /** The server clock. A device clock is evidence, never authority. */
  created_at: string;
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
 * payload for exactly two client components — `MobileNav` and `StaffNav`. The
 * sentence that stood here said both *take `role` and `status` as props*, and
 * that has not been true of either for a while: `StaffNav` has taken
 * serialisable capability keys since plan 34-04, and `MobileNav` takes them as
 * of plan 39-03 (D-39-06), where the Check-in entry started being drawn on
 * `door.operate`. Both are still `"use client"` and still cannot import the
 * data-access layer, so a Server Component parent still resolves and passes
 * down — that part was and remains the reason these fields exist here.
 *
 * What keeps `role` and `status` in the payload today is narrower: four of
 * `MobileNav`'s five entries are governed by no capability at all, so the nav
 * still needs to know who is signed in and whether they are approved. Removing
 * these two fields therefore waits on a capability that governs those entries,
 * not on a conversion that has already happened. Every new decision asks
 * `capabilities`.
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
