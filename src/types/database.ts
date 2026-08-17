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
// The fourth import, same inverted direction and the same reason as the three
// above. The production calendar's vocabularies are each shared by a SQL `CHECK`,
// an importer and every TypeScript caller, so they are defined once in
// `@/lib/production/ics/vocabulary`, which imports nothing precisely so this
// direction is the only possible one, and are read from here. A second copy in
// this file would be a second truth that nothing checks — and the two sets would
// be compared by nobody, because a `CHECK` constraint is invisible to `tsc`.
import type {
  AnchorDirection,
  AnchorKind,
  CivilDate,
  CivilTime,
  EntryClass,
  NamingConvention,
  PieceDateOrigin,
  PieceKind,
  UnresolvedReason,
  VenueStage,
} from "@/lib/production/ics/vocabulary";
// The fifth import, same inverted direction and the same reason as the four
// above. The three production sections' vocabularies are each shared by a SQL
// `CHECK`, a seeding script and every TypeScript caller, so they are defined
// once in `@/lib/production/sections/vocabulary` and are read from here.
//
// `VenueStage` is deliberately NOT re-imported from there: that module
// re-exports it rather than restating it, and taking it from its original home
// above keeps one name with one source. Two import paths for one type is the
// beginning of two types.
import type {
  AnswersSource,
  AttributeKey,
  AttributeProvenance,
  AttributeValue,
  ExitReason,
  ExtendedHoursStance,
  SectionKind,
  SectionState,
  SizeBand,
  SpaceCategory,
  VisualAssetKind,
} from "@/lib/production/sections/vocabulary";

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
  /**
   * The venue word this series is written as in the production calendar, so a
   * piece naming a series code can be joined to a night naming a venue word.
   *
   * The mapping is an **abbreviation, not a derivation**: nothing computes a
   * two- or four-letter code from a venue word, so it has to be declared by
   * somebody who knows both halves. Two satellite series legitimately share the
   * progressivo 001 and are told apart only by this word — a join on format plus
   * number alone was measured placing a listing *after* the night it announces.
   *
   * **The column is public; the values are not written into this repository.**
   * They arrive at runtime, behind the row-level security of the production
   * tables, because a venue word may name a space that has not been acquired in
   * writing (`venue-acquisition.md`). Read back on 2026-08-15: the column exists
   * and holds `null` on every one of the six series rows.
   */
  ics_alias: string | null;
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

// =============================================================================
// The production calendar — six row types
// =============================================================================
//
// ⚠ WHAT A GREEN `npm run build` DOES AND DOES NOT PROVE ABOUT THE SIX BELOW.
//
// **No Supabase client in this repository is parameterised with a `Database`
// generic** — measured at four call sites. So `.select("…")` returns values the
// compiler cannot relate to a column, and every consumer casts. A green build
// therefore proves that the code reading these declarations type-checks
// *against the declarations*; it proves nothing whatever about whether a column
// is spelled the way the applied migration spells it.
//
// **That distinction is not theoretical here.** The build passed before plan
// 44-07 ran, with none of this schema live at all: the types come from this
// generated file and not from the database, so a green was available while the
// six tables did not exist. Do not read a past green as evidence about the
// database.
//
// **WHAT WAS ACTUALLY DONE INSTEAD, and it is a better check than the
// neighbours in this file got.** Every name below was read out of
// `20260815120000_production_calendar.sql` and
// `20260815120100_production_calendar_access.sql` by hand, and then confirmed
// against a catalogue read-back of the APPLIED production database on
// 2026-08-15 — `information_schema.tables`, `pg_constraint`, `pg_policies`,
// `pg_proc` and `pg_trigger`, quoted in `44-07-SUMMARY.md`. The neighbours above
// were confirmed against a migration file only.
//
// The vocabularies are IMPORTED and never restated: see the fourth import at the
// head of this file.

/**
 * The kinds of thing a night owes.
 *
 * ⚠ **This is the one vocabulary of this phase with no home in
 * `@/lib/production/ics/vocabulary`, and the asymmetry is stated rather than
 * left to be noticed.** The other seven describe what the calendar FILE
 * contains, so they belong to the parser; a checklist kind describes what
 * PRODUCTION owes, which the file knows nothing about. It is declared here, and
 * its only other copy is the `production_checklist_item_kind_check` constraint
 * in the applied migration — the same relationship every other literal union in
 * this file has with its `CHECK`, and one `tsc` cannot see.
 *
 * The four production steps are separate members rather than one `step`, because
 * they fail for different reasons and are chased by different people.
 * `space_approval` in particular is not a courtesy: an exhibition space that
 * must approve the material naming it is a stage of production with its own
 * duration, and it sits INSIDE the two days before the listing rather than after
 * them (`brand-visual-system.md`).
 */
export type ProductionChecklistKind =
  | "piece"
  | "venue_confirmed"
  | "dj_confirmed"
  | "photo_arrived"
  | "space_approval";

/**
 * One entry of the owner's calendar that the import classified as a night of
 * ours.
 *
 * ⚠ **It is not `EventParty`, and the separation is the point.** The file stays
 * the source of truth, so a re-import that reached the announced night directly
 * could move a date that already has tickets on sale. `linked_party_id` is the
 * only bridge between the two, and it points at the night rather than reaching
 * into it.
 *
 * The archive lives in here too, back to the file's earliest entry — so this
 * table legitimately holds numbers far below `PartySeries.highest_assigned`, and
 * nothing may compare the two. A watermark test would refuse the entire past.
 */
export interface ProductionPlan {
  id: string;
  /**
   * The calendar entry's own `UID`, and the identity is the file's rather than
   * ours. The alternatives were measured and rejected: a title changes when the
   * owner renames a night, `(date, title)` changes twice over, and a content
   * hash changes on every edit — which is the opposite of an identity.
   */
  source_uid: string;
  /**
   * Change detection, stored and not interpreted. A **decreasing** sequence for
   * a known uid is an anomaly to report, never to accept silently — and the
   * report is a `ProductionImportRun` row, because a log line is a place nobody
   * looks.
   */
  source_sequence: number | null;
  source_last_modified: string | null;
  /**
   * Taken verbatim from the file's `YYYYMMDD` prefix, never the product of a
   * timezone conversion: the whole pipeline resolves WEEKDAYS, and a conversion
   * that moves a 22:00 entry across midnight moves its weekday — which turns a
   * conforming night into a reported error.
   */
  date: CivilDate;
  /**
   * A civil time and never an instant, for the same reason. The night runs 22:00
   * to 06:00, so `end_time` is legitimately **smaller** than `start_time` and no
   * constraint forbids it: `end_time > start_time` would refuse the project's
   * principal format.
   */
  start_time: CivilTime | null;
  end_time: CivilTime | null;
  /**
   * Resolved by the import against the catalogue. Null is a finding to report,
   * not a row to refuse — refusing it would lose the day, which is the one thing
   * the calendar is for.
   */
  format_id: string | null;
  series_id: string | null;
  /**
   * The progressivo, **read from the file and never generated**.
   *
   * Nullable, and do not tighten it: a night that is the OPENING ACT of another
   * night has no progressivo of its own, because a code and a number compose a
   * sigla and an act has no sigla.
   *
   * Changing a number that is already set is refused in the database by the
   * `production_plan_refuse_renumber` trigger — including erasing it, since a
   * null counts as a different value. A progressivo is already on a poster:
   * append, never renumber.
   */
  number: number | null;
  /**
   * ⚠ **INTERNAL, NEVER PUBLIC.** The venue word exactly as the calendar writes
   * it, which may name a space under negotiation.
   *
   * No surface an unauthenticated visitor can reach may render it, and no
   * diagnostic, log line, error message or `.planning/` document may echo it.
   * The column is public — it is declared right here; the values arrive at
   * runtime and stay behind the table's row-level security.
   */
  venue_word: string | null;
  venue_id: string | null;
  /**
   * How far the space actually is. **Null means NOT RECORDED and is never read
   * as `acquired`**: the calendar entry carries no stage, so the import must not
   * infer one. An inferred *acquired* would arrive with the authority of a
   * database column, and it is exactly the harm `venue-acquisition.md` names.
   */
  venue_stage: VenueStage | null;
  /** The bridge to the announced night. Null is the normal state. */
  linked_party_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  /**
   * ⚠ **Disappearance is not deletion.** An entry present in a previous run and
   * absent now may be a changed uid, a partial export, or simply the wrong file.
   * The import stamps this and reports the count; deleting on absence would let
   * one bad export wipe the archive.
   */
  absent_since: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One editorial piece — either one the file already carries, or one the pipeline
 * says a format owes and the file does not carry yet.
 *
 * ⚠ **A row here is not a truth about the world; it is a row about a file.**
 * `origin` says which of the two it is, and a date written in the file WINS
 * always: nothing recomputes it.
 *
 * The audio piece is called `livecut` and the word *podcast* appears nowhere.
 * The two are not synonyms — a LiveCut is the recording of OUR night, one per dj
 * who played it; a Podcast is a mix sent in by somebody who is **not** in a
 * line-up, and it does not exist yet.
 */
export interface ProductionPiece {
  id: string;
  /**
   * Nullable, unlike a plan's: **a proposal has no uid**, because it does not
   * exist in the file. Two nulls are distinct in Postgres, so the unique
   * constraint does not collapse every proposal into one row — that is the
   * correct reading and not a hole. Do not close it.
   */
  source_uid: string | null;
  /**
   * Nullable, and the reason is measured rather than defensive: **an orphan
   * piece exists.** One after movie in the file announces a night that is not in
   * the calendar at all. Refusing it would lose a real piece; attaching it to
   * the wrong night would be worse. `series_code` and `number` are kept beside
   * it so it joins later if that night is ever added.
   */
  plan_id: string | null;
  /** What was WRITTEN. Text and not a key: an unresolvable code survives as evidence. */
  series_code: string | null;
  number: number | null;
  kind: PieceKind;
  /** `PT1`, `PT2` and their kin — a label the file carries, not a fact we decide. */
  part_marker: string | null;
  /** A date, or nothing — and if nothing, the reason is in `unresolved_reason`. */
  date: CivilDate | null;
  /**
   * A proposed date must **never** read as settled: it is a date that does not
   * exist in the owner's calendar. The surface draws the two differently, and a
   * person acts on the difference.
   */
  origin: PieceDateOrigin;
  /**
   * ⚠ **Three reasons, and they must stay three.** Collapsing them into one
   * *unknown* is the collapsed-`catch` this project has already paid for once: a
   * reader who cannot tell *waiting for an edition* from *depends on the
   * line-up* cannot act on either.
   *
   * The database makes the incoherent row unrepresentable rather than merely
   * discouraged — `production_piece_date_xor_reason` requires exactly one of a
   * date and a reason, and `production_piece_proposal_has_no_source` stops a
   * proposal wearing the file's authority.
   */
  unresolved_reason: UnresolvedReason | null;
  /**
   * Computed at import, stored, and **never drawn**. It feeds the divergence
   * report; it does not feed a pixel. Nullable, because *we could not work it
   * out* is a third answer and must not arrive dressed as `false`.
   */
  conforms_to_rule: boolean | null;
  /**
   * Which of the file's two naming grammars this piece was written in. Kept
   * because a join that fails is debugged by knowing which grammar it was
   * reading — a first pass keyed on one form alone reported thirteen nights as
   * missing, and the tool was wrong, not the calendar.
   */
  naming_convention: NamingConvention;
  source_sequence: number | null;
  source_last_modified: string | null;
  first_seen_at: string;
  last_seen_at: string;
  absent_since: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A day that is taken by something which is **not** our production.
 *
 * ⚠ **This interface has no format field, no series field and no progressivo,
 * and that absence is the deliverable.** Importing one of these as a night would
 * hand it an identity it does not have, and those values do not stay in the
 * database — they reach surfaces that name formats and print sigle. A rule
 * saying *do not assign a format to a commitment* is a sentence somebody has to
 * remember; a type with no such field is a guarantee, and it survives the caller
 * who never read the sentence.
 *
 * **The corollary, for whoever builds the surface:** the component that draws a
 * commitment must receive no such prop either. A guarantee that stops at the
 * type is a guarantee with a hole above it.
 */
export interface ProductionCommitment {
  id: string;
  source_uid: string;
  /**
   * **One** day this commitment occupies, not *the* day: a recurring commitment
   * expands into one row per occurrence, which is why the key is the pair
   * `(source_uid, occurrence_date)`. A single-column key would collapse a season
   * of occupied Thursdays into one row and leave every other Thursday looking
   * free — which defeats this table's only purpose.
   */
  occurrence_date: CivilDate;
  start_time: CivilTime | null;
  end_time: CivilTime | null;
  /** The entry's own title. It is not ours, and it is not public. */
  title: string | null;
  /**
   * The recurrence rule, verbatim and uninterpreted, so a rule the import
   * refuses to expand is still visible afterwards rather than lost: a refusal
   * that erases its own input cannot be diagnosed.
   */
  recurrence_raw: string | null;
  /** Which parent this occurrence came from. Null means the row is the entry itself. */
  expanded_from: string | null;
  first_seen_at: string;
  last_seen_at: string;
  absent_since: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * What one run of the import actually did.
 *
 * ⚠ **This is not bookkeeping.** There is no error tracking in this repository —
 * `package.json` carries no monitoring dependency — so no production failure
 * reaches a human on its own. Under that constraint *the error is logged* is not
 * a mitigation: a log is a place nobody looks. A row here, rendered at the foot
 * of the calendar, is the OBSERVABLE EFFECT that distinguishes an import which
 * quietly did half its job from one a person can see did half its job.
 */
export interface ProductionImportRun {
  id: string;
  started_at: string;
  /**
   * **Null means the run did not finish** — which is itself the observation, and
   * it must not be back-filled with `started_at` to make a table look tidy.
   */
  finished_at: string | null;
  /**
   * Which file, without naming it. A byte size distinguishes *the owner sent a
   * new export* from *the same file was imported twice*, and says nothing about
   * any date, any space or anybody's name. A filename would have said more than
   * it needed to.
   */
  file_byte_size: number | null;
  entries_seen: number | null;
  /** Counts by class. `jsonb` because the classes are a vocabulary that may gain a member. */
  entries_by_class: Partial<Record<EntryClass, number>> | null;
  /**
   * Counted separately from the breakdown on purpose: this is the number a
   * person is meant to look at, and a figure buried inside a blob is a figure
   * nobody reads.
   */
  unclassified_count: number | null;
  /**
   * ⚠ **A divergence carries a uid and a reason code. Never a title, never a
   * date, never a venue word.**
   *
   * These are read by whoever is debugging an import, which means they end up in
   * a terminal, in a screenshot, and — the irreversible one — in a document
   * under `.planning/`, which is tracked and public. A uid names nothing to
   * anybody outside the file; a title names an unannounced date.
   *
   * The shape below is DECLARED HERE and is not enforced by the column: `jsonb`
   * accepts anything. It is written narrow so that the prohibition is visible at
   * the call site rather than only in a comment.
   */
  divergences: { source_uid: string; reason: string }[] | null;
  unsupported_recurrences: { source_uid: string; reason: string }[] | null;
  /**
   * **A dry run is a real row.** The import can produce its plan without
   * applying it, and that run is recorded as one — otherwise the only evidence
   * that somebody checked before writing is their memory of having checked.
   */
  dry_run: boolean;
}

/**
 * One thing that has to happen before a night can happen — the editorial pieces
 * and the production steps both.
 *
 * ⚠ **The checklist covers what can make a date fail, not only what can be
 * drawn.** A night with all four pieces designed and no signed space is not
 * nearly ready; it is a night that does not exist. A checklist that tracked only
 * artwork would report the first as green.
 *
 * ⚠ **A tick is writable, and that is not a contradiction of the calendar being
 * read-only.** The calendar is read-only about DATES, because the file is the
 * source and an edit here would be silently discarded by the next import. A tick
 * is about neither the file nor a date: it is a person recording that something
 * got done.
 *
 * ⚠ **And a tick is REVERSIBLE.** It is not a monotone guard, and the nearest
 * precedents in this repository all are — `venue_reveal_sent`, a payment
 * reaching `completed`, a series progressivo. None of their reasoning travels
 * here: nothing has left the building because somebody ticked a box, so
 * un-ticking one ticked by mistake costs a trace line and nothing else. Do not
 * copy a one-way switch onto this type.
 */
export interface ProductionChecklistItem {
  id: string;
  /**
   * ⚠ `ON DELETE CASCADE`, and it is the one cascade of this phase. A cascade is
   * a write path nobody declared — it is declared here, and it is the reason a
   * snapshot taken before touching `production_plan` must cover this table too.
   */
  plan_id: string;
  kind: ProductionChecklistKind;
  /**
   * What this item is, in production's own words. Text and not a key: the
   * checklist has to be able to say *LiveCut PT2* and *the photo for the dj*
   * without either becoming a schema change.
   */
  label: string;
  /** Nullable: an item can be owed without a date being computable. */
  due_date: CivilDate | null;
  sort_order: number;
  /**
   * ⚠ **Late is COMPUTED, never stored**, and the predicate lives in the query:
   *
   * ```
   * ticked_at IS NULL AND due_date < current_date
   * ```
   *
   * There is deliberately no stored lateness field of any name. A stored flag is
   * only true at the moment it is written, and keeping it true would need a
   * fifth nightly cron in a project whose four existing crons tell nobody when
   * they fail — giving the checklist a way to be quietly wrong in the one
   * direction that matters, showing a night as on time while it is late.
   * Computed, the answer cannot rot: it is recomputed by the act of asking.
   */
  ticked_at: string | null;
  /**
   * Who ticked it. Both the id and the name, because a trace that says *ticked by
   * ORG-0042* answers nobody's question.
   *
   * ⚠ The name is authorised **in the database** and stops there: it does not
   * enter a PLAN, a SUMMARY, a VERIFICATION or anything else under `.planning/`,
   * which is tracked and public. Artefacts name ROLES.
   */
  ticked_by: string | null;
  ticked_by_name: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One obligation: *this format owes a piece of this kind, and it falls on this
 * weekday relative to this anchor.*
 *
 * ⚠ **The storage form is (anchor kind, WEEKDAY, direction) and never a day
 * offset**, and there is no offset field below of any name.
 *
 * The night falls Friday **or** Saturday, so the same Tuesday sits four days
 * before a Saturday and three before a Friday. Code that stores offsets
 * therefore sees two rules where there is one, and reports a perfectly correct
 * night as an error. **That has already happened once**: a check written during
 * this phase's discussion reported one night as out of rule on three pieces, the
 * owner answered *the next night falls on a Friday*, and the re-measurement
 * proved him right. A checker that cries wolf is a checker that gets switched
 * off.
 *
 * The same lesson from the other side: measured from the night, an after movie
 * looks irregular — spreads of nine, sixteen, eighty and a hundred and
 * forty-three days. Measured from the anchor the rule actually names, it is
 * minus one, always. The variability was in the point of observation.
 *
 * **Why a row and not a rule in code:** the pipeline changed twice inside one
 * month. A rule in code makes the next such change a deploy; a row makes it an
 * edit.
 */
export interface ProductionPipelineRule {
  id: string;
  format_id: string;
  /**
   * **Null means the format's default; set means this series overrides it**, and
   * the more specific level wins.
   *
   * The two levels are not tidiness. The Nizza series is a series of the night's
   * format and not a fifth format, but it runs the LIGHT pipeline: its listing
   * IS derivable from the nearest preceding Tuesday where the night's is not,
   * and its LiveCut is a single episode anchored to itself where the night's are
   * anchored to the FOLLOWING edition. Two of its rules contradict the night's
   * on the same `(format, piece kind)` pair, so a single level would have
   * dropped them in silence — and the surface would then have read the night's
   * rule for a Nizza date and reported a conforming series as diverging.
   */
  series_id: string | null;
  piece_kind: PieceKind;
  /** Which event the weekday is counted from. */
  anchor_kind: AnchorKind;
  /**
   * ISO-8601, Monday = 1 … Sunday = 7. **Null means the anchor's own day**,
   * whichever weekday that turns out to be — which is the only correct way to
   * say it for a night that may be a Friday or a Saturday.
   *
   * A direction of `before` or `after` requires one: *the nearest preceding
   * nothing* is not a rule, and the database refuses the combination.
   */
  anchor_weekday: number | null;
  anchor_direction: AnchorDirection;
  /**
   * Whether a missing piece may be proposed at all.
   *
   * ⚠ **`false` is not *we have not worked it out yet*. It is a MEASURED
   * REFUSAL**: for two of the sixteen seeded rules the anticipation is not a
   * fixed number, so no rule exists to derive one from, and a proposal would be
   * a date roughly a week and a half wrong drawn beside real ones. Withholding
   * is the correct behaviour — and a night that suddenly has a complete set of
   * pieces is the warning sign that somebody removed this.
   */
  derivable: boolean;
  /**
   * Whether the number of episodes is a property of the LINE-UP rather than of
   * the format. Where it is true the surface says *depends on the line-up* and
   * prints **no figure**: a count that could not be determined does not print
   * one.
   */
  episodes_from_lineup: boolean;
  /**
   * How many episodes, where that is a property of the format. The number of
   * episodes descends from the line-up — changing the line-up changes the plan
   * of publication — so where a count is written it is the measured norm for a
   * format whose line-up has been stable, and **this row** is where a change
   * lands: a row, not a deploy.
   */
  episode_count: number | null;
  /** Free text, carrying CRITERIA ONLY. No date, no space, no name. */
  note: string | null;
  created_at: string;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE THREE PRODUCTION SECTIONS — five row types, and what a green build proves
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ⚠ **No Supabase client in this repository is parameterised with `Database`.**
 * The consequence is the same one the calendar's row types already carry, and it
 * is repeated here rather than referenced because it is the sentence a reader
 * most needs at the moment they trust one of these interfaces:
 *
 * A green `npm run build` proves that the code consuming these declarations
 * type-checks **against the declarations**. It proves nothing whatever about
 * whether a column is spelled the way the applied migration spells it, whether
 * it is nullable, or whether it exists. The build would pass identically against
 * an empty database.
 *
 * Every name below was read out of `20260817120100_production_location.sql` and
 * `20260817120200_production_sections.sql` by hand, in the commit that wrote
 * them. The catalogue read-back of plan 45-08 is what turns that into a fact;
 * until then, the hand check is the only verification performed and saying so is
 * part of the deliverable.
 *
 * **The vocabularies are not restated here.** They are imported from
 * `@/lib/production/sections/vocabulary`, which is the one place that declares
 * them and the one place the SQL `CHECK`s were copied from. A second copy in
 * this file would be a second truth that nothing compares — a `CHECK` constraint
 * is invisible to `tsc`, so the divergence would survive until somebody typed a
 * value on a page.
 */

/**
 * One scouted space.
 *
 * ⚠ **A row here is desk work, and nothing about it is an availability.**
 * Nobody has been called. The stage travels with the name everywhere the name is
 * rendered, because that is the only thing that stops a list of places from
 * reading as a list of venues.
 *
 * It is deliberately **not** a `Venue`. The reason is the write side rather than
 * the read side: a scouted row inside `venues` would sit in the picker a night's
 * venue is chosen from, and one wrong selection puts a space under negotiation
 * on a night — from where the public road serves its name and its address to
 * anybody. `promoted_venue_id` is the single crossing, it points outward, and
 * the database refuses it from any stage but `acquired`.
 */
export interface ProductionSpace {
  id: string;
  /**
   * ⚠ **INTERNAL, NEVER PUBLIC.** The space's name as the scouting wrote it,
   * which may name a space under negotiation.
   *
   * No surface an unauthenticated visitor can reach may render it; no material,
   * caption or capitolato may carry it before the space is acquired **in
   * writing**; and no diagnostic, log line, error message or `.planning/`
   * document may echo it.
   */
  name: string;
  /**
   * ⚠ **INTERNAL, NEVER PUBLIC — and this one is a STREET ADDRESS.**
   *
   * The difference from the field above is not one of degree. A venue *word* is
   * shorthand that can stay ambiguous to a reader who does not already know; an
   * address is the thing itself, and a large minority of these carry a house
   * number.
   *
   * It is exactly the payload `venue_for_parties` exists to release
   * **deliberately** — per night, never partially, absence meaning no
   * entitlement. Nothing may carry a row of this table into that road: no
   * foreign key, no view, no function. The export of this phase covers the
   * manifesto and the capitolato and **cannot reach this table at all**.
   */
  address: string | null;
  category: SpaceCategory | null;
  /** Where the record came from. Provenance of the RECORD, not of an answer. */
  source: string | null;
  /** The scouting's prose. Criteria and observation only — no contact, no person. */
  short_description: string | null;
  /** Which format it was scouted for. Null is ordinary, not a gap. */
  home_format_id: string | null;
  /**
   * How far the space has got — and unlike `ProductionPlan.venue_stage` this is
   * **never null**, because the act of entering this list *is* the mapping.
   *
   * The column defaults to the lowest member, which is what makes a default safe
   * here: it can never manufacture progress. Every seeded row lands at the
   * bottom, not because the seeder is careful but because nothing else is
   * reachable without somebody typing it.
   */
  stage: VenueStage;
  /**
   * ⚠ **A band is not a capacity.** Nothing may infer `real_capacity` from it:
   * the target for a night is 150 to 300 people and a band cannot answer whether
   * a given room is inside that.
   */
  size_band: SizeBand | null;
  /**
   * How many people actually fit — the second of the four questions, and the one
   * only somebody standing in the room can close.
   *
   * **Null is the ordinary state**, and the surface shows it MISSING rather than
   * deriving it from the band.
   */
  real_capacity: number | null;
  /** What rig is there — the first of the four questions. A description, not a value. */
  rig: string | null;
  /**
   * Whether a guest dj may play — the third question.
   *
   * **Null means nobody has asked**, and a surface printing *no* for a null
   * would be reporting ignorance as a refusal. The unasked case for the group of
   * four is carried by `answers_source`.
   */
  guest_dj_allowed: boolean | null;
  /**
   * Until what hour one may play — the fourth question, and the one that screens
   * out the most candidates.
   *
   * A civil time and never an instant: a night runs 22:00 to 06:00, so this is
   * legitimately smaller than the hour the night starts, and a conversion that
   * moves an entry across midnight moves its weekday.
   */
  closing_time: CivilTime | null;
  /**
   * The hours the venue actually keeps. A **published fact**, so it may be
   * researched. Free text with a sentinel default, never blank: the sentinel is
   * a value, and a blank is not an answer.
   */
  published_hours: string;
  /**
   * Whether they will even discuss hours beyond those.
   *
   * ⚠ **No crawl, no inference and no default may ever move this off the unasked
   * value.** It is absent from every source *by nature* — it is not a fact about
   * the place, it is the answer to a phone call. A derived value here is
   * *derived is not verified* committed in the one field built to prevent it.
   */
  extended_hours_stance: ExtendedHoursStance;
  /** How the four answers were obtained. A public listing answers the wrong question. */
  answers_source: AnswersSource;
  /**
   * Where the agreement is — a pointer, never an attachment.
   *
   * The database refuses `acquired` without it. Acquired means **in writing**,
   * and it is the stage that unlocks naming the space in a material, so it is
   * not a good place to trust a form or a tired reviewer.
   */
  agreement_evidence: string | null;
  /**
   * ⚠ **Leaving the race is a state, never a deletion.** A space discarded
   * because it contradicts the identity stays listed, at zero, forever: deleting
   * it loses the memory of the choice, and the choice gets remade from scratch
   * at the first difficulty.
   *
   * The pair is inseparable in the database — an exit carries why and when, or
   * it is not an exit.
   */
  exited_at: string | null;
  exit_reason: ExitReason | null;
  /**
   * The one crossing that exists, and it points **outward**. Refused by the
   * database from any stage but `acquired`: a promotion from the bottom is a
   * desk exercise turned into a place somebody can put on a poster.
   */
  promoted_venue_id: string | null;
  /**
   * The re-runnability key of the seeding script. Nullable on purpose — a space
   * typed by hand came from no import, and two nulls are distinct in Postgres.
   */
  source_key: string | null;
  /** Facts about US rather than about the space, which is why they are not attributes. */
  already_used: boolean;
  in_use: boolean;
  /** Free text, criteria and observation only. No contact, no person, no price. */
  note: string | null;
  first_seen_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * One attribute of one space, its value, and where that value came from.
 *
 * ⚠ **There is no stored figure of suitability anywhere in this phase**, on this
 * interface or on `ProductionSpace`. How well a space suits a format is computed
 * from these rows with that format's declared weights, at the moment somebody
 * asks. A stored number detaches from its inputs at the first edit, and a single
 * one would say one thing about a place across four formats that weigh the same
 * attributes differently.
 */
export interface ProductionSpaceAttribute {
  id: string;
  space_id: string;
  attribute: AttributeKey;
  /**
   * ⚠ **The unasked value is a VALUE, not an absence**, which is why this is not
   * nullable. The archive encodes *to verify* per attribute rather than per
   * record — on evening viability it is the value on a clear majority of rows —
   * and a surface rendering that as an empty cell would report ignorance as a
   * negative.
   */
  value: AttributeValue;
  /**
   * Where the value came from, and it has **no default** in the database: a
   * value cannot exist without saying which it is.
   *
   * A value read off a public profile is a hypothesis; one checked on site, for
   * that format, is a datum. A computed suitability is only as verified as its
   * weakest input — one field-checked attribute beside nine desk-read ones does
   * not make the result a datum.
   */
  provenance: AttributeProvenance;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One rule of one authored section, and how settled its content is.
 *
 * ⚠ **Three states, and the middle one is the reason the table is shaped like
 * this.** The domain names two opposite errors: inventing where a rule already
 * exists, and answering *not decided* where a coordinate has been declared. A
 * two-state model can only defend against one of them, and folding the middle
 * state makes an unwritten-but-constrained format read as FREE — which is how a
 * format gets written by whoever is under deadline.
 *
 * **The explicit negatives live in `body`, not in a field of their own.** A
 * separate one would invite a surface that renders the positives and drops them,
 * which is the exact failure the exclusions were written to prevent.
 */
export interface ProductionSection {
  id: string;
  section: SectionKind;
  /**
   * Null means the rule belongs to the whole brand rather than to one format —
   * the spelling, the grid-safe square, the order of publication. Filing those
   * per format would be four places for one rule to diverge.
   */
  format_id: string | null;
  title: string;
  /**
   * ⚠ **No default in the database, and the absence is the decision.** A default
   * of *written* fills the void; a default of *not decided* answers for a
   * coordinate that has been declared. The author says which.
   */
  state: SectionState;
  body: string | null;
  /**
   * What is missing. Required by the database **only** in the not-decided state:
   * forcing it on the middle state would push the author into inventing a gap.
   */
  missing: string | null;
  /**
   * Whose call it is. A **role**, never a person — this project's artefacts name
   * roles, and a decision attributed to a name ages badly the moment somebody
   * leaves.
   */
  decision_owner: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Something that has not been decided, and whose call it is.
 *
 * ⚠ **It warns; it never blocks.** Nothing in this table refuses a piece of
 * work, and nothing may be added that does: a block that fires under deadline is
 * a block somebody routes around — and a routed-around block also teaches people
 * to route around the next one.
 *
 * `section` is free text rather than a `SectionKind` on purpose: the register
 * spans all four sections, including location and the calendar, while that union
 * names only the two that hold authored prose.
 */
export interface ProductionOpenQuestion {
  id: string;
  question: string;
  /** Not null. A question with no owner is the state this register abolishes. */
  decision_owner: string;
  section: string | null;
  format_id: string | null;
  opened_at: string;
  /**
   * ⚠ **Both or neither**, enforced in the database. A closing date with no
   * resolution loses the thing the register was keeping; a resolution with no
   * date leaves the question looking open to everybody reading the list.
   */
  closed_at: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * One produced piece, or one photograph of an artist.
 *
 * **Why the photo archive is not a nice-to-have:** the listing goes out two days
 * before the night, so *that night's photograph cannot exist yet*. At an
 * artist's first date there is only their press photo; from the second, the
 * piece is pulled from an archive somebody has to have been building — or the
 * format stays dependent on what arrives on the Monday for the Tuesday.
 *
 * The bytes are not here. `object_key` points at storage, and the upload path is
 * the quarantine bucket with a server-only write that this product already has.
 */
export interface ProductionVisualAsset {
  id: string;
  kind: VisualAssetKind;
  object_key: string;
  /**
   * ⚠ **INTERNAL, NEVER PUBLIC**, and the banner is narrower than a venue's.
   *
   * A venue word is internal until the space is acquired; **a name in a line-up
   * is internal until the date is announced**, and the two are the same kind of
   * fact. Publishing it early is an announcement made by accident — and it is
   * read as an announcement whether or not it was one.
   *
   * No surface an unauthenticated visitor can reach may render it, and no log
   * line may echo it. The spelling is verified at the source before anything is
   * produced: it is irrecoverable once published, and it is a discourtesy to
   * whoever plays.
   */
  artist_name: string | null;
  format_id: string | null;
  /** Criteria and description only: no address, and no date not yet communicated. */
  caption: string | null;
  /** A date and not a timestamp: nobody needs the hour, and an hour drags a zone in. */
  taken_on: CivilDate | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
