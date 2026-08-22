import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import AppNav from "@/components/layout/AppNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { Chip, Badge } from "@/components/ui/Chip";
import { FOCUS_RING } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext, hasCapability } from "@/lib/capabilities/server";
import { CAP } from "@/lib/capabilities/keys";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import FormatMarker from "@/components/formats/FormatMarker";
import TierSelection from "./TierSelection";
import RsvpButton from "./RsvpButton";

import MyDrinks from "./MyDrinks";
import PendingIntentHandler from "./PendingIntentHandler";
import SecretVenueDialog from "./SecretVenueDialog";
import ShareButton from "./ShareButton";
import MediaGallerySection from "./MediaGallerySection";
import { logMoneyPathFailure } from "@/lib/failure/money-path";
import { formatTime } from "@/utils/formatTime";
import { CalendarIcon, ClockIcon, MapPinIcon, LockClosedIcon, MusicalNoteIcon } from "@/components/ui/Icons";
import type { UserRole, UserStatus, AccessType } from "@/types/database";
import { partyStartInstant, venueRevealHours } from "@/utils/datetime";

/**
 * One row of `public.venue_for_parties`, which after plan 37-02 is **the only
 * public road to a venue address**.
 *
 * The shape is the function's `RETURNS TABLE` and nothing else — it is a
 * contract, and it is written out here because `supabase.rpc()` is untyped in
 * this repository (no client is parameterised with a `Database` generic) and
 * `src/types/database.ts` deliberately does NOT declare this function: it does
 * not exist in the live schema yet, and a type that named it would be a type
 * that lies about an object's existence (`37-03-SUMMARY.md`). When
 * `20260810161000_venues_read_narrowed.sql` is applied and the types are
 * regenerated, this local shape is what gets replaced — not edited.
 *
 * A night is returned **with its venue or not at all**: absent means NO
 * ENTITLEMENT, and the caller renders the hint. There is no partial row.
 */
interface VenueForParty {
  party_id: string;
  venue_id: string;
  name: string;
  slug: string;
  address: string | null;
  google_maps_url: string | null;
}

/**
 * The one line a visitor reads to know what a night IS.
 *
 * `name` is already the decided string: the venue gate at the render site
 * chooses between the series public name and the format name, per night. There
 * is no `code` and no stored figure on this shape, and there is none on the
 * query that feeds it — a visitor reads the name only (D-36-09).
 */
interface PartyFormat {
  name: string;
  slug: string;
  color: string;
}

interface PartyWithTiers {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  end_time: string | null;
  venue_text: string | null;
  lineup: string[];
  venue_secret: boolean;
  venue_secret_hint: string | null;
  venue_reveal_hours: number | null;
  venue_reveal_on_purchase: boolean;
  /**
   * The instant somebody revealed this night's venue BY HAND, or `null`.
   *
   * It is NOT `venue_reveal_email_sent` under a new name, and the difference is
   * the whole reason a separate column exists: the cron raises that boolean
   * even on a night with ZERO recipients and without filtering on
   * `is_published` (`api/cron/venue-reveal/route.ts:108-115`), so a draft night
   * inside its own window carries it raised already. Reading it here would open
   * the page on a night that was merely swept. This one says *somebody pressed*,
   * and that is what makes the manual button OBSERVABLE on this page.
   */
  venue_revealed_at: string | null;
  /**
   * `null` when the reader was refused the format row — which means an
   * UNLISTED format, because the same policy gates both. No marker is rendered
   * then, and that is the correct answer rather than a defect to repair: a
   * placeholder would announce the format it was standing in for.
   */
  format: PartyFormat | null;
  /** The series' public name, or `null`. Whether it is USED is decided below. */
  series_name: string | null;
  access_type: AccessType;
  capacity: number | null;
  sort_order: number;
  tiers: {
    id: string;
    name: string;
    price: number;
    quantity: number | null;
    sold: number;
    available: number | null;
    /**
     * Whether `sold` is a MEASUREMENT or a placeholder.
     *
     * `sold` and `available` keep their types byte-for-byte, so `TierSelection`
     * — which is out of this plan's perimeter (D-46-11) — compiles with no prop
     * change. The third state lives here instead, and it has to, because
     * neither of the other two fields can carry it: to that component a `null`
     * `available` means *no quantity limit*, which is a legitimate value it
     * already renders correctly. Encoding *unknown* as `null` alone would
     * therefore say *unlimited*, which is the same defect one layer down.
     *
     * A third state that only the type knows about is a third state nobody has,
     * so this flag is what draws the sentence at the two control sites below.
     * The same field is declared on the event-level tier list; the two shapes
     * duplicate each other already, and a divergence between them would hide
     * exactly here.
     */
    soldKnown: boolean;
    show_remaining?: boolean;
    starts_at?: string | null;
    expires_at?: string | null;
  }[];
  userTicket: { id: string; tier_id: string | null } | null;
  userRsvp: { id: string } | null;
  spotsLeft: number | null;
  /**
   * Whether a `null` `spotsLeft` means *could not count* rather than *no
   * capacity is set*.
   *
   * Both reach the render guard below as the same `null` and the guard stays as
   * it is — suppressing the figure is the correct outcome in both cases. They
   * are not the same fact, though: one is a night with no cap, the other is a
   * night whose remaining places nobody could check, and only the second owes
   * the visitor a sentence.
   */
  spotsUnknown: boolean;
}

/**
 * ── The three-level model of D-37-02, as this page decides it ────────────────
 *
 * | Who                                   | Sees            | From when          |
 * |---------------------------------------|-----------------|--------------------|
 * | a ticket **or an RSVP** for the night | the address     | at once            |
 * | an approved member with neither       | hint, then addr | the reveal window  |
 * | no session, or not approved           | the hint only   | never              |
 *
 * TWO THINGS ARE NEW HERE AND EVERYTHING ELSE IS BYTE-FOR-BYTE THE OLD VERDICT.
 *
 *  1. **`hasRsvpForParty` joins level 1**, and it joins it OUTSIDE the
 *     `venueRevealOnPurchase` guard. An RSVP is not a purchase; binding it to
 *     that flag would mean switching the flag off on an RSVP night takes the
 *     address away from somebody who said they are coming **while the cron goes
 *     on mailing it to them** (`api/cron/venue-reveal/route.ts:63-68` never
 *     consults the flag). That is precisely the asymmetry D-37-10 exists to
 *     remove — so this is not an extra, it is the pre-existing defect the
 *     owner's decision makes it compulsory to close. On an RSVP night NOBODY
 *     holds a ticket, so without this branch nobody would see the address at
 *     once, on a night whose whole audience declared itself.
 *  2. **The level-2 branch, added at the tail** — an approved member with
 *     neither a ticket nor an RSVP. THE ONLY WIDENING OF THIS PHASE: today such
 *     a member never sees the address before the night. It is per-EVENT
 *     reasoning applied to a per-recipient secret, which `venue-secrecy.md`
 *     used to forbid outright; the owner took that decision on 2026-08-10 with
 *     the cost written down, and the gate is rewritten in the same commit as
 *     this branch (D-37-03) — otherwise it would keep flagging the intended
 *     behaviour as a violation until somebody "repaired" it.
 *
 * The branch **adds and never modifies** (D-37-04's constraint): it does not
 * name `hasTicketForParty` or `hasMasterTicket`, so nobody who reached a
 * verdict before reaches a different one now. Every earlier `if` is unchanged
 * and still returns first.
 *
 * ── This page is UX; the boundary is the database ────────────────────────────
 *
 * `CLAUDE.md` principle 2. This predicate decides what is RENDERED;
 * `public.venue_for_parties` decides what a caller may READ. They stay two
 * verdicts, ANDed at the render site, so the narrower always wins — which is
 * `venue-secrecy.md`'s *default chiuso* expressed as a conjunction rather than
 * as a promise.
 */
function isVenueVisible(opts: {
  partyDate: string;
  partyTime: string;
  venueSecret: boolean;
  hasTicketForParty: boolean;
  hasMasterTicket: boolean;
  /** An RSVP for THIS night. Level 1 (D-37-10) — see the docblock above. */
  hasRsvpForParty: boolean;
  isApproved: boolean;
  isOrganizer: boolean;
  isMasterRole: boolean;
  venueRevealHours: number | null;
  /** The manual reveal instant, or `null`. Level 2 (D-37-04). */
  revealedAt: string | null;
  venueSecretHint: string | null;
  venueRevealOnPurchase: boolean;
}): { visible: boolean; hint: string | null } {
  if (!opts.venueSecret) return { visible: true, hint: null };
  if (opts.isMasterRole || opts.isOrganizer) return { visible: true, hint: null };
  // Ticket holders see venue immediately only if venue_reveal_on_purchase is
  // true — and an RSVP holder sees it regardless of that flag (D-37-10).
  if (
    (opts.venueRevealOnPurchase && (opts.hasTicketForParty || opts.hasMasterTicket)) ||
    opts.hasRsvpForParty
  ) {
    return { visible: true, hint: null };
  }
  const partyStart = partyStartInstant(opts.partyDate, opts.partyTime);
  const now = new Date();
  // The window, resolved ONCE for this call and read from the one place that
  // owns it. `venueRevealHours` applies DEFAULT_VENUE_REVEAL_HOURS = 25 — never
  // a literal written here, which is how a fallback ends up living in two files
  // and drifting between them (plan 37-04).
  const hours = venueRevealHours(opts.venueRevealHours);
  const hoursUntil = (partyStart.getTime() - now.getTime()) / 3600000;
  // A manual reveal counts only when it is a REAL instant. Absent, or a string
  // that does not parse, is treated as "not revealed" and yields the hint —
  // T-37-23, and `venue-secrecy.md` *default chiuso*: this is the one domain in
  // the project where the safe default is to refuse. Written as a positive test
  // rather than `!== null` on purpose: `undefined !== null` is TRUE, so a column
  // that stopped being selected would otherwise open the address on every
  // secret night, silently.
  const revealedByHand =
    typeof opts.revealedAt === "string" && !Number.isNaN(Date.parse(opts.revealedAt));
  // Past event → visible for approved members
  if (now > partyStart && opts.isApproved) return { visible: true, hint: null };
  // Approved member with ticket/rsvp → visible X hours before
  if (opts.isApproved && (opts.hasTicketForParty || opts.hasMasterTicket)) {
    if (hoursUntil <= hours) return { visible: true, hint: null };
  }
  // LEVEL 2 (D-37-02, D-37-04) — appended, and the only widening of this phase.
  // An OR of two entrances: the window, which trips by itself at an instant
  // nobody writes, and the manual act, which trips when somebody presses.
  if (opts.isApproved && (revealedByHand || hoursUntil <= hours)) {
    return { visible: true, hint: null };
  }
  return { visible: false, hint: opts.venueSecretHint };
}

/**
 * ── Dynamic BY DECLARATION, and no longer only by derivation (D-37-09) ───────
 *
 * This route already renders as `ƒ` because `createClient()` calls `cookies()`,
 * which excludes static rendering. **Nothing said so.** A later edit that moved
 * the session read — into a child, into a helper, behind a cache — would make
 * this page static again with no error and no warning, and nobody would notice
 * until an address was on a cached page.
 *
 * That risk is new, and it is the one D-37-09 names as the main one. The
 * predicate above now has a temporal component that **trips by itself at a
 * precise instant**: before, a night's visibility barely moved without somebody
 * writing something. A cached page CROSSES that instant. Served stale before
 * it, it shows the hint to somebody entitled to the address — an annoyance.
 * Served stale after it, to a DIFFERENT reader, it shows the address to
 * somebody who is not — a leak, and this is the one domain where the leak has
 * no remedy.
 *
 * The service worker is a second cache with a second answer, and it belongs to
 * plan 37-07; the proof that neither serves this page stale belongs to 37-13.
 *
 * THIS ROUTE EXPORTS NO METADATA FUNCTION, and the absence is a decision rather
 * than an omission (T-37-25). A social preview is public content cached by third
 * parties — a shared cache entirely outside our control — so an event page that
 * grew one would have to prove, forever, that no secret address can reach it.
 * `nextjs-architecture.md`, gate *metadata e Open Graph*, states the rule for
 * the day somebody adds one. (The identifier itself is not spelled here, so that
 * a mechanical check for "this page has none" measures the property it means
 * rather than failing on the paragraph that forbids it — same correction as
 * `37-02-SUMMARY.md`.)
 */
export const dynamic = "force-dynamic";

const WD_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WD_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MO_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MO_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * ── This surface's own refusal vocabulary, and why it is one member long ─────
 *
 * The construction is `src/lib/failure/money-path.ts` §1: constants, a union
 * built with `typeof` over those constants, then a `Record` total over the
 * union. It is total on purpose — a category added here without its sentence is
 * an `npm run build` error rather than a category that renders as nothing, and
 * in a repository with no test runner that build is the only automatic gate
 * there is.
 *
 * **The union is declared HERE and not in `money-path.ts`**, per §2 of that
 * module: each surface owns its own vocabulary. A category read by an anonymous
 * visitor standing in front of a purchase control and a category read by an
 * operator in a cron dashboard have different readers, different remedies and
 * different lifetimes; merging them yields a `Record` two thirds of which is
 * unreachable padding, which is how a totality check stops meaning anything.
 *
 * One member, because this page has exactly one cause: **the count could not be
 * read.** `money-path.ts` §4 — every union built for a failed read carries a
 * member meaning *the question could not be answered*, and it is never merged
 * with the *no*. Here there is no *no* to merge it with, by the owner's
 * decision: this page does not refuse the buyer.
 *
 * THE SENTENCE IS TAKEN VERBATIM from the approved list,
 * `.planning/phases/46-silent-failures-on-the-money-path/46-COPY.md` §3
 * (approved 2026-08-14, one pass over the whole list, D-46-10a). It is not
 * reworded here and it is not composed at run time: no tier name, no party
 * title, no capacity figure, no database code enters it (T-46-20). A count
 * nobody could read must not become a number on a public page by way of the
 * message that says it could not be read.
 *
 * What the sentence deliberately does NOT say, recorded so a later reader does
 * not "improve" it back:
 *   * it is **not a refusal of the buyer**. The owner's standing decision is
 *     that the control stays live and the server decides (46-FINDING-01,
 *     46-VALIDATION). Its whole job is to stop a number the page could not read
 *     from being presented as a fact;
 *   * it does **not promise the purchase will succeed**. The real capacity
 *     guard is `reserve_ticket` in the database, which locks the tier row
 *     `FOR UPDATE`, counts and raises — and it runs AFTER payment. A sentence
 *     reassuring about that window would be reassuring about precisely the
 *     window D-46-07 leaves silent by decision. It says less, and what it says
 *     is true.
 */
const PLACES_UNKNOWN = "places_unknown";

type EventPageRefusal = typeof PLACES_UNKNOWN;

const EVENT_PAGE_REFUSAL: Record<EventPageRefusal, string> = {
  [PLACES_UNKNOWN]:
    "How many places are left could not be checked just now, so no number is shown here. Buying is still open.",
};

/**
 * One line for a count that did not come back, and the two causes stay apart.
 *
 * Written once rather than three times because the fourth copy is where the
 * leak enters: `logMoneyPathFailure` takes a `SafeError`, and a whole PostgREST
 * error satisfies that shape structurally — so *never log the object* has to be
 * enforced at the call site, and there is now one call site instead of three.
 * `details` is the field that matters: on a constraint violation PostgREST
 * returns the entire rejected row, and a `tickets` or `profiles` row carries
 * `membership_code`, which is the door credential
 * (`.planning/todos/pending/postgrest-details-leaks-the-row.md`).
 *
 * The two causes get two scopes and are not collapsed (`meta-gates.md`, zero
 * silent failures): *the database refused* carries a code and will not fix
 * itself; *the count simply was not there* carries none and is the transport
 * case. `count === null` on a `head: true` read is not a legitimate zero — an
 * exact count answers with a number — so it is treated as unreadable rather
 * than as none sold.
 *
 * This is not observability on its own; the project has no error tracking, so
 * the log reaches nobody. The observable effect is the sentence above, drawn
 * beside the control.
 */
function logUnreadableCount(
  scope: string,
  error: { code?: string | null; message?: string | null } | null
): void {
  logMoneyPathFailure(
    error ? `${scope}_refused` : `${scope}_absent`,
    error ? { code: error.code, message: error.message } : null
  );
}

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const sorted = [...new Set(dates)].sort();
  if (sorted.length === 1) {
    const d = new Date(sorted[0] + "T00:00:00");
    return `${WD_LONG[d.getDay()]}, ${d.getDate()} ${MO_LONG[d.getMonth()]} ${d.getFullYear()}`;
  }
  const start = new Date(sorted[0] + "T00:00:00");
  const end = new Date(sorted[sorted.length - 1] + "T00:00:00");
  const fmt = (d: Date) => `${WD_SHORT[d.getDay()]} ${d.getDate()} ${MO_SHORT[d.getMonth()]}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Check auth status
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Role, status and capabilities from the SESSION, not from an inbound header.
  const { capabilities, role, status, liveAssignmentCapabilities } =
    await getAccessContext();

  // ⚠️ VENUE SECRECY. These two keep their `role` / `status` form and only
  // their SOURCE changed — and that is deliberate, because they are NOT merely
  // presentational. They are passed into `isVenueVisible`, which decides
  // whether a SECRET VENUE ADDRESS is rendered: `isMasterRole` short-circuits
  // it to visible, and `isApproved` opens the time branches.
  //
  // `venue_reveal_sent` is a MONOTONE one-way switch (meta-gates.md), so the
  // only admissible direction is "no easier to trip" — SAVE FOR AN EXPLICIT
  // AUTHORISATION DOCUMENTED IN THE COMMIT, which is the clause phase 37 uses.
  //
  // ── REWRITTEN 2026-08-10, and the superseded sentence is quoted, not deleted
  //
  // Until phase 37 this paragraph ended: *"Converting either of these to a
  // capability key would be a VERDICT change on a reveal path and is explicitly
  // out of this plan's scope."* That was correct for phase 34, whose scope was
  // to move the SOURCE of these two values from a forgeable header to the
  // session while keeping every verdict byte-identical.
  //
  // **D-37-02 authorises a verdict change on this path**, and it is the only
  // one in the phase: an approved member with neither a ticket nor an RSVP now
  // sees the address once the reveal window opens, or as soon as somebody
  // reveals by hand (level 2, the tail branch of `isVenueVisible`). Owner's
  // decision, 2026-08-10, taken with the cost written down — more people know
  // the address than walk in, on rooms of 150-300 in private spaces with no
  // public-entertainment licence (`legal-compliance.md`).
  //
  // WHAT SURVIVES THE REWRITE, and it is the part a later reader needs: the
  // two values are still NOT presentational, `isApproved` is now load-bearing
  // on MORE branches than before rather than fewer, and any further change to
  // either of them is still a verdict change on a reveal path — which now needs
  // its own written authorisation, exactly as this one has. Converting them to
  // capability keys remains out of scope and is a decision, not an omission.
  const isApproved = status === "approved";
  const isMasterRole = role === "master";

  // Fetch event by slug — admin/organizer can see drafts too. This NARROWS THE
  // QUERY below, so it is a data-access decision and becomes a capability
  // question. It governs `is_published` and NOTHING ELSE — it is not an input
  // to `isVenueVisible`, which is the one expression that governs the venue.
  // `staff.manage` is byte-equal to the `isMasterRole || role === "organizer"`
  // it replaces, so no role's reach changes.
  const canSeeDrafts = capabilities.has(CAP.STAFF_MANAGE);
  const eventQuery = supabase
    .from("events")
    .select("id, slug, title, description, date, venue_secret, lineup, cover_image, is_published, early_access_until, created_by")
    .eq("slug", slug);

  if (!canSeeDrafts) {
    eventQuery.eq("is_published", true);
  }

  // The error is READ, and it was not — WR-07, the fourth of this family in this
  // phase and the last one left on this page, two reads above the two already
  // corrected below.
  //
  // Written `const { data: event } = …`, an RLS refusal, a changed policy or any
  // `PGRST…` produced `event === null` and therefore a **404**: the night stops
  // existing, for everybody, and nobody knows. *«Not found»* and *«could not find
  // out»* are two different sentences and this page must not render one for the
  // other.
  //
  // `PGRST116` is `.single()`'s way of saying **no row matched**, which here is
  // genuinely a 404 and stays one. Everything else is thrown, and that includes
  // the case with NO code — which is where this differs, deliberately, from the
  // parties read below, whose transport failure is left to degrade. That one has
  // a degraded middle available: an event rendered without its nights is poorer,
  // not false. This read has none. Its only alternative to the truth is claiming
  // the event does not exist — to a visitor, and to a crawler — so a transient
  // failure gets the error boundary, which is honest and which a reload fixes.
  const { data: event, error: eventError } = await eventQuery.single();

  if (eventError && eventError.code !== "PGRST116") {
    console.error(
      `[event_detail.event_query_refused] ${eventError.code || "transport"}: ${eventError.message}`
    );
    throw new Error(
      `[event_detail.event_query_refused] ${eventError.code || "transport"}`
    );
  }

  if (!event) {
    notFound();
  }

  const isOrganizer = !!user && event.created_by === user.id;

  // Service client for counting tickets (anon users can't read tickets via RLS)
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch parties for this event (with venue join)
  //
  // ── The two new embeds, and the hint that is not decoration ────────────────
  //
  // `!event_parties_series_id_fkey` is REQUIRED. Measured against production
  // with the anonymous key on 2026-08-10 (plan 36-11, same embed on `/events`):
  // the unqualified form answers `HTTP 300 PGRST201`, *"more than one
  // relationship was found for 'event_parties' and 'party_series'"* — because
  // the migration declares two, the plain `series_id` reference and the
  // composite `event_parties_series_format_fk`. The `formats` embed needs no
  // hint: `format_id` is the only reference between those two tables.
  //
  // And it fails SILENTLY: PostgREST answers `data: null` with no exception, so
  // nothing throws and the page renders an event with no nights at all. A green
  // build says nothing about this — no Supabase client here is parameterised
  // with the generated types, so a query is documentation until it is run.
  //
  // NEITHER THE STORED NUMBER NOR EITHER INTERNAL CODE IS SELECTED. The
  // disclosure matrix says never, on any public surface, and not fetching them
  // is the narrowest way to keep that true: a column that never arrives cannot
  // be rendered by a later edit that was not thinking about the rule.
  //
  // ── THE VENUE IS NO LONGER EMBEDDED HERE, AND THAT IS THE POINT ──────────
  //
  // The nested embed of `public.venues` is gone. After plan 37-02 that table
  // grants nothing to a reader without `staff.manage`, and **a refused embed
  // returns empty rather than an error** (D-37-25): left in place it would strip
  // the venue name from every night, in silence, on a public surface, in a
  // project with no error tracking. The address now comes from
  // `public.venue_for_parties` below — one call, and the only road there is.
  //
  // ── `venue_revealed_at` IS SELECTED, AND IT HAS TO BE ────────────────────
  //
  // It is the level-2 entrance of D-37-04 and the ONE thing that makes the
  // manual reveal button observable on this page. Dropped from this list it
  // arrives `undefined`, the tail branch of `isVenueVisible` never opens, and
  // the button silently stops having any effect a visitor could see — which is
  // the exact defect phase 37 exists to avoid producing. It is not a secret in
  // itself: it is an instant, never an address, and the address still comes
  // only from `public.venue_for_parties` below.
  const { data: rawParties, error: partiesError } = await supabase
    .from("event_parties")
    .select("id, title, description, date, time, end_time, venue_text, lineup, venue_secret, venue_secret_hint, venue_reveal_hours, venue_reveal_on_purchase, venue_revealed_at, access_type, capacity, sort_order, formats(name, slug, color), party_series!event_parties_series_id_fkey(name)")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  // This error was discarded before this phase, and adding two embeds is what
  // makes discarding it untenable — see the paragraph above. The two causes are
  // separated because they deserve opposite answers, exactly as `/events` does:
  //
  //   * a refusal FROM THE DATABASE carries a SQLSTATE or a `PGRST…` code. It
  //     is a defect, it will never fix itself, and an event page that quietly
  //     lost every one of its nights is a healthy-looking lie on a public
  //     surface — with no error tracking in this project, a log alone reaches
  //     nobody. It is thrown, so it reaches the error boundary;
  //   * a transport failure carries no code, and that is the transient case.
  //     Its behaviour is left exactly as it was.
  if (partiesError) {
    console.error(
      `[event_detail.parties_query_refused] ${partiesError.code || "transport"}: ${partiesError.message}`
    );
    if (partiesError.code) {
      throw new Error(`[event_detail.parties_query_refused] ${partiesError.code}`);
    }
  }

  // Check if user has a master ticket (event-level, party_id IS NULL)
  let hasMasterTicket = false;
  let masterTicketId: string | null = null;
  if (isAuthenticated && user) {
    const { data: masterTk } = await supabase
      .from("tickets")
      .select("id")
      .eq("event_id", event.id)
      .is("party_id", null)
      .eq("user_id", user.id)
      .maybeSingle();
    if (masterTk) {
      hasMasterTicket = true;
      masterTicketId = masterTk.id;
    }
  }

  const parties: PartyWithTiers[] = await Promise.all(
    (rawParties ?? []).map(async (rawParty: Record<string, unknown>) => {
      const party = rawParty as { id: string; title: string; description: string | null; date: string; time: string; end_time: string | null; venue_text: string | null; lineup: string[] | null; venue_secret: boolean; venue_secret_hint: string | null; venue_reveal_hours: number | null; venue_reveal_on_purchase: boolean | null; venue_revealed_at: string | null; formats: PartyFormat | PartyFormat[] | null; party_series: { name: string } | { name: string }[] | null; access_type: string; capacity: number | null; sort_order: number };
      // An embed arrives as an object or as a one-element array depending on
      // how PostgREST resolves the relationship; both shapes are unwrapped the
      // same way.
      const formatData = party.formats;
      const format: PartyFormat | null = formatData ? (Array.isArray(formatData) ? formatData[0] ?? null : formatData) : null;
      const seriesData = party.party_series;
      const series = seriesData ? (Array.isArray(seriesData) ? seriesData[0] ?? null : seriesData) : null;

      // Fetch tiers for paid parties (party-specific)
      let tiers: PartyWithTiers["tiers"] = [];
      if (party.access_type === "paid") {
        const { data: rawTiers } = await supabase
          .from("ticket_tiers")
          .select("*")
          .eq("party_id", party.id)
          .order("price", { ascending: true });

        tiers = await Promise.all(
          (rawTiers ?? []).map(async (tier: { id: string; name: string; price: number; quantity: number | null; show_remaining?: boolean; starts_at?: string | null; expires_at?: string | null }) => {
            // THE ERROR IS READ, and a count that did not come back is no
            // longer written down as zero.
            //
            // This read is the one that decides whether a night looks open.
            // Written `const { count } = …`, an RLS refusal, a changed policy
            // or a transport failure produced `count === null`, the coalesce
            // turned it into `0`, and `available` became the tier's full
            // quantity: a sold-out night rendered as wide open, with a
            // remaining figure that was not a measurement, beside the control
            // that takes money.
            //
            // On failure `available` goes to `null` so no figure is printed —
            // BUT `null` IS NOT ENOUGH ON ITS OWN, and that is the whole reason
            // `soldKnown` exists. `TierSelection.tsx:124-125` reads
            // `available !== null && available <= 0` as sold out and
            // `:364-366` prints the remaining figure only when it is not null,
            // so to that component a null `available` says *this tier has no
            // quantity limit* — a legitimate value, quietly wrong here. The
            // honest state travels in `soldKnown`, and the sentence drawn
            // beside the control is what makes it visible to a person.
            const { count, error: soldError } = await serviceClient
              .from("tickets")
              .select("*", { count: "exact", head: true })
              .eq("tier_id", tier.id);
            if (soldError || count === null) {
              logUnreadableCount("event_detail.party_tier_sold_count", soldError);
              return { ...tier, sold: 0, available: null, soldKnown: false };
            }
            const sold = count;
            return { ...tier, sold, available: tier.quantity !== null ? tier.quantity - sold : null, soldKnown: true };
          })
        );
      }

      // Check if user has ticket/rsvp for this party
      let userTicket: { id: string; tier_id: string | null } | null = null;
      let userRsvp: { id: string } | null = null;

      if (isAuthenticated && user) {
        if (party.access_type === "paid") {
          const { data: ticket } = await supabase
            .from("tickets")
            .select("id, tier_id")
            .eq("party_id", party.id)
            .eq("user_id", user.id)
            .maybeSingle();
          userTicket = ticket;
        }

        if (party.access_type === "free_rsvp") {
          const { data: rsvp } = await supabase
            .from("rsvps")
            .select("id")
            .eq("party_id", party.id)
            .eq("user_id", user.id)
            .maybeSingle();
          userRsvp = rsvp;
        }
      }

      // Calculate spots left
      //
      // `spotsUnknown` distinguishes the two roads to `null` below. The render
      // guard is unchanged and still tests `spotsLeft !== null`, which is
      // correct for both: a figure that is not a measurement is not printed.
      // The flag exists because only ONE of the two owes a sentence.
      let spotsLeft: number | null = null;
      let spotsUnknown = false;
      if (party.capacity) {
        if (party.access_type === "paid" && tiers.length > 0) {
          // A sum is only as trustworthy as its weakest term. If ANY tier's
          // count came back unreadable, the total is not a measurement — and
          // subtracting a partial sum from the capacity would print a figure
          // that is too HIGH, on a night that may already be full.
          if (tiers.some((t) => !t.soldKnown)) {
            spotsLeft = null;
            spotsUnknown = true;
          } else {
            const totalSold = tiers.reduce((sum, t) => sum + t.sold, 0);
            spotsLeft = party.capacity - totalSold;
          }
        } else if (party.access_type === "free_rsvp") {
          const { count: rsvpCount, error: rsvpError } = await serviceClient
            .from("rsvps")
            .select("*", { count: "exact", head: true })
            .eq("party_id", party.id);
          // The old coalesce is gone, and its second defect went with it: it
          // was written with `||`, which also swallowed a genuine zero and
          // recomputed it to the same value by luck rather than by reading. A
          // count that did not arrive now suppresses the figure instead of
          // reporting a night with every place still free.
          //
          // (The removed expression is not quoted here. A comment that spells
          // it would satisfy the grep asserting its absence, which is the same
          // correction the metadata paragraph at the top of this file already
          // carries.)
          if (rsvpError || rsvpCount === null) {
            logUnreadableCount("event_detail.party_rsvp_count", rsvpError);
            spotsLeft = null;
            spotsUnknown = true;
          } else {
            spotsLeft = party.capacity - rsvpCount;
          }
        }
      }

      return {
        id: party.id,
        title: party.title,
        description: party.description,
        date: party.date,
        time: party.time,
        end_time: party.end_time,
        venue_text: party.venue_text,
        lineup: party.lineup ?? [],
        venue_secret: party.venue_secret ?? false,
        venue_secret_hint: party.venue_secret_hint ?? null,
        venue_reveal_hours: party.venue_reveal_hours ?? null,
        venue_reveal_on_purchase: party.venue_reveal_on_purchase ?? true,
        // `?? null` and not a bare read: an absent column arrives `undefined`,
        // and the predicate must never be handed anything but a string or
        // `null` on a path that decides an address (T-37-23).
        venue_revealed_at: party.venue_revealed_at ?? null,
        format,
        series_name: series?.name ?? null,
        access_type: party.access_type as AccessType,
        capacity: party.capacity,
        sort_order: party.sort_order,
        tiers,
        userTicket,
        userRsvp,
        spotsLeft,
        spotsUnknown,
      };
    })
  );

  // ── The venue, from the one function entitled to hand one out ───────────────
  //
  // ONE call for every night on this page, indexed by `party_id`. Not one per
  // night: the function takes an array precisely so that a page with N nights
  // costs one round trip, and it resolves the caller from `auth.uid()` — there
  // is no subject argument, so it cannot be asked about anybody else.
  //
  // WHY THIS IS THE BOUNDARY AND THE PREDICATE ABOVE IS NOT. `CLAUDE.md`
  // principle 2: `isVenueVisible` decides what is RENDERED and this decides
  // what may be READ. The render site ANDs the two, so the narrower always
  // wins — which is `venue-secrecy.md` *default chiuso* made structural instead
  // of promised. Five arms decide entitlement per night (D-37-02): the night is
  // not secret · `staff.manage` · a ticket or a master ticket · an RSVP · an
  // approved member at the window or after a manual reveal.
  //
  // THE ERROR IS NOT DISCARDED, and the two causes get opposite answers — the
  // same split the nights query above already applies, for the same reason:
  //   * a refusal FROM THE DATABASE carries a code. It will never fix itself,
  //     and a public page that quietly lost every venue is a healthy-looking
  //     lie. It is thrown, so it reaches the error boundary;
  //   * a transport failure carries no code and is the transient case. Logged,
  //     and the page renders with no venue — which on a secret night is the
  //     hint, and on a public one is a missing name rather than a leak.
  //
  // ⚠️ DEPLOY: `public.venue_for_parties` DOES NOT EXIST in the live database
  // yet. `20260810161000_venues_read_narrowed.sql` was deliberately NOT applied
  // (owner's decision, `37-03-SUMMARY.md`). Until it is, this call answers
  // `PGRST202` and the throw above fires. **This file and that migration ship
  // as ONE act.**
  const venueByParty = new Map<string, VenueForParty>();
  if (parties.length > 0) {
    const { data: venueRows, error: venueError } = await supabase.rpc(
      "venue_for_parties",
      { p_party_ids: parties.map((p) => p.id) }
    );

    if (venueError) {
      console.error(
        `[event_detail.venue_for_parties_refused] ${venueError.code || "transport"}: ${venueError.message}`
      );
      if (venueError.code) {
        throw new Error(`[event_detail.venue_for_parties_refused] ${venueError.code}`);
      }
    }

    for (const row of (venueRows ?? []) as VenueForParty[]) {
      // Shape-checked rather than trusted: `.rpc()` is untyped here, so a
      // function redefined underneath this caller would otherwise put
      // `undefined` where a name is rendered.
      if (row && typeof row.party_id === "string" && typeof row.name === "string") {
        venueByParty.set(row.party_id, row);
      }
    }
  }

  // Fetch event-level tiers (party_id IS NULL) -- only when multiple parties exist
  // `soldKnown` is declared here TOO, and the duplication is the point: this
  // inline annotation and `PartyWithTiers["tiers"]` above already describe the
  // same shape twice, so the two must move together. A third state added to one
  // and not the other would compile, and the surface that kept the old shape
  // would go on rendering a count nobody could read as a number.
  let eventTiers: { id: string; name: string; price: number; quantity: number | null; sold: number; available: number | null; soldKnown: boolean; show_remaining?: boolean; starts_at?: string | null; expires_at?: string | null }[] = [];
  if (parties.length > 1) {
    const { data: rawEventTiers } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", event.id)
      .is("party_id", null)
      .order("price", { ascending: true });

    eventTiers = await Promise.all(
      (rawEventTiers ?? []).map(async (tier: { id: string; name: string; price: number; quantity: number | null; show_remaining?: boolean; starts_at?: string | null; expires_at?: string | null }) => {
        // Byte-identical to the per-party read above except for its scope, and
        // it carries the same reasoning: the error is read, a count that did
        // not arrive is not written down as zero, and `available` goes to
        // `null` so no figure is printed while `soldKnown` carries the fact
        // that nobody could look.
        const { count, error: soldError } = await serviceClient
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("tier_id", tier.id);
        if (soldError || count === null) {
          logUnreadableCount("event_detail.event_tier_sold_count", soldError);
          return { ...tier, sold: 0, available: null, soldKnown: false };
        }
        const sold = count;
        return { ...tier, sold, available: tier.quantity !== null ? tier.quantity - sold : null, soldKnown: true };
      })
    );
  }

  // Check if user has attended this event (scanned at entry)
  let hasAttended = false;
  if (isAuthenticated && user) {
    const { data: attendance } = await supabase
      .from("attendance")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    hasAttended = !!attendance;
  }

  // Fetch approved media for this event
  const { data: approvedMedia } = await supabase
    .from("event_media")
    .select("id, url, type, uploaded_by, created_at")
    .eq("event_id", event.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const mediaItems: { id: string; url: string; type: "photo" | "video"; uploaded_by?: string }[] =
    (approvedMedia ?? []).map((m: { id: string; url: string; type: string; uploaded_by: string }) => ({
      id: m.id,
      url: m.url,
      type: m.type as "photo" | "video",
      uploaded_by: m.uploaded_by,
    }));

  // Check if any drinks are available across parties
  const { count: drinkItemCount } = await supabase
    .from("drink_items")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("is_available", true);

  // Fetch user's drink tokens for this event
  let userDrinkTokens: import("@/types/database").DrinkToken[] | null = null;
  if (user) {
    const { data } = await supabase
      .from("drink_tokens")
      .select("id, drink_name, price, token, status, redeemed_at")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    userDrinkTokens = data as import("@/types/database").DrinkToken[] | null;
  }

  // Fetch artist profiles for lineup names (event-level + party-level)
  const allLineupNames = new Set<string>();
  if (event.lineup) {
    for (const name of event.lineup) allLineupNames.add(name);
  }
  for (const p of parties) {
    for (const name of p.lineup) allLineupNames.add(name);
  }
  const artistSlugs = new Map<string, string>();
  if (allLineupNames.size > 0) {
    const { data: artists } = await supabase
      .from("artists")
      .select("name, slug")
      .in("name", [...allLineupNames]);

    if (artists) {
      for (const a of artists) {
        artistSlugs.set(a.name, a.slug);
      }
    }
  }

  // ── The nights this person may upload to ────────────────────────────────────
  //
  // WHY A LOOP IS RIGHT HERE AND WRONG IN THE PREDICATE. `mayUploadToParty`
  // (plan 35-16) answers *"may they upload to THIS night?"* — singular, one
  // resolution, and a loop inside it would be the per-event permission coming
  // back through the window. This surface asks the other question, *"which
  // nights may they upload to?"*, which is plural by construction because it has
  // to draw a list. One resolution per night is the minimum that question has.
  //
  // THE CEILING, AND THE FACT THAT IT IS GONE. Plan 35-21 justified this loop
  // with `UNIQUE (event_id, type)` — "at most three". That constraint, and the
  // `type` column itself, were **dropped on 2026-02-26**
  // (`20260226300000_multi_sub_events.sql:11-17`): an event may carry N
  // sub-nights today. So this is N resolutions, not three, and the bound worth
  // naming is the real one — `parties` is the list this page already renders, so
  // the cost is one round trip per night ALREADY DRAWN on the page, resolved in
  // parallel, on a render and never on the door path. If a night ever stops
  // being rendered, this loop must stop iterating it too.
  //
  // THE READ PERIMETER DOES NOT WIDEN — and it does not widen by ZERO, not by a
  // little. No new query is issued and no new column is selected: `parties` is
  // the array built at :200 from the `event_parties` read at :177, with the
  // caller's own privileges, and `id`, `title` and `date` are already rendered
  // into this page's HTML for this same viewer. The secret-venue flag this page
  // reads at :179 and :278 for the venue dialog is deliberately NOT carried into
  // anything below: `venue-secrecy.md`, gate *percorsi enumerati* — this page IS
  // one of the enumerated exits, so what crosses to the client here is exactly
  // what already crossed before this block existed. (The flag is named by line
  // rather than spelled here so that the acceptance criterion of plan 35-21 —
  // "no added line names it" — measures the property it means, instead of
  // failing on a paragraph that exists to forbid the very read it looks for.
  // Same class of correction as `35-20-SUMMARY.md`, deviation 5.)
  //
  // A RESOLVER FAULT IS NOT A REFUSAL, AND IS ALSO NOT A 500 ON THIS PAGE.
  // `hasCapability` throws rather than returning a degraded answer
  // (`capabilities/server.ts`, and that is correct there). Letting it escape
  // here would turn a bad database minute into a crash of the **ticket-buying
  // surface** — `ticketing-payments.md` is explicit that an auxiliary read must
  // not abort the money path. So each night is caught on its own and, when
  // unresolved, is NOT offered: fail closed, which is the direction
  // `media-and-storage.md` and `venue-secrecy.md` both require on this path.
  //
  // The cost of that choice, named rather than left to be found: for someone
  // whose ONLY route to the box is an assignment, an unresolved night is
  // indistinguishable from an unassigned one — the box simply does not appear.
  // There is no error tracking in this product (`meta-gates.md`), so the
  // `console.error` below reaches a log nobody reads. When the other two arms
  // hold, the box does appear with an empty list and `MediaUpload` draws a
  // distinguishable error state instead of a mute control.
  let uploadableParties: { id: string; title: string; date: string }[] = [];
  if (isAuthenticated && user && parties.length > 0) {
    const resolved = await Promise.all(
      parties.map(async (p) => {
        try {
          // `getPartyAccessContext` is memoised per `partyId` within one render,
          // so asking here does not re-ask anything asked elsewhere on this page.
          const allowed = await hasCapability(CAP.MEDIA_UPLOAD, { partyId: p.id });
          return allowed ? { id: p.id, title: p.title, date: p.date } : null;
        } catch (cause) {
          // Category, and nothing about the person. `35-PATTERNS.md` S5 and S7.
          console.error(
            `[media_upload.night_unresolved] could not resolve ${CAP.MEDIA_UPLOAD} ` +
              `for night ${p.id}: ${cause instanceof Error ? cause.message : "unknown"}. ` +
              `This is NOT a refusal — the night is withheld because the question ` +
              `went unanswered.`
          );
          return null;
        }
      })
    );
    uploadableParties = resolved.filter(
      (p): p is { id: string; title: string; date: string } => p !== null
    );
  }

  // The two arms of today are unchanged, and the attendance arm is unchanged
  // WORD FOR WORD — defective table name included (`:319` reads `attendance`,
  // the table is `public.attendances`). Repairing it WIDENS who may upload,
  // which is an access decision and belongs to none of this phase's eight
  // requirements. Plan 35-16 froze it for the same reason; see also
  // `access-gating.md`.
  const canUpload =
    isAuthenticated &&
    ((isApproved && hasAttended) ||
      isOrganizer ||
      isMasterRole ||
      uploadableParties.length > 0);
  const partyDates = parties.map((p) => p.date);
  const dateRangeDisplay = formatDateRange(partyDates);
  const isUpcoming = parties.some((p) => p.date >= new Date().toISOString().split("T")[0]);

  function formatPartyDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return `${WD_SHORT[d.getDay()]} ${d.getDate()} ${MO_SHORT[d.getMonth()]}`;
  }

  return (
    <>
      {/*
        The other half of the pairing check E of scripts/verify-conversion.mjs
        asserts in both directions: the files declaring the leading-edge column
        clearance are exactly the files mounting the responsive navigation form.
        Reaching the navigation THROUGH the phone-locked wrapper does not count —
        the gate's route table says this surface already mounts one and its
        pairing says it does not, and the pairing is the half that fails.

        It carries an arbitrary-property utility at the md tier setting the
        inline-start navigation-inset custom property to fourteen rems, which the
        shell below reads with its own inline-start padding. Without it the
        content would slide UNDER the 224 px column from 768 px up.

        The utility is written whole in the class list and is not spelled here,
        and the line is copied byte-for-byte from
        src/app/(public)/gallery/page.tsx:110 — Tailwind scans comments, cannot
        tell a description from a use, and an abbreviated one emits a malformed
        rule and a build warning (DEF-41-01).

        ── WHY THE BODY BELOW IS TWO LEVELS SHALLOWER THAN ITS WRAPPERS ────────

        The shell and this div moved the markup two levels deeper and the body
        was NOT re-indented. That is the record rather than a slip, and the
        reason is the venue block further down: its guard, its three branches
        and its else-null are asserted BYTE-IDENTICAL before and after this
        conversion, indentation included, and re-indenting would have cost that
        claim its qualifier-free form. *Byte-identical* would have become
        *byte-identical apart from whitespace*, which is a weaker claim than a
        one-way switch with no undo deserves. `41.2-08-SUMMARY.md` made the same
        choice on the ticket surface, for the same reason, and this file follows
        it rather than inventing a second answer.
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        <PageShell width="default">
      {isAuthenticated && <PendingIntentHandler eventSlug={slug} />}

      {/* Cover */}
      <AnimatedSection className="relative">
        <Link
          href="/events"
          className={`absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ground/80 backdrop-blur-sm active:scale-95 active:opacity-80 transition-transform ${FOCUS_RING}`}
        >
          &larr;
        </Link>
        {event.cover_image ? (
          <Image
            src={event.cover_image}
            alt={event.title}
            width={800}
            height={400}
            className="w-full max-h-80 object-cover rounded-2xl"
            priority
          />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl bg-surface text-muted">
            <MusicalNoteIcon className="h-12 w-12" />
          </div>
        )}
      </AnimatedSection>

      <div className="pt-6">
        {/* Date range, Title + Share, Description */}
        <AnimatedSection delay={0.1}>
          <p className="mb-1 text-sm font-medium text-accent">
            {dateRangeDisplay}
          </p>

          <div className="mb-4 flex items-start justify-between gap-3">
            <PageTitle>{event.title}</PageTitle>
            <ShareButton title={event.title} description={event.description} />
          </div>

          {event.description && (
            <p className="mb-6 text-muted whitespace-pre-line">
              {event.description}
            </p>
          )}
        </AnimatedSection>

        {/* Lineup (event-level only — party lineups are shown inside each party card) */}
        <AnimatedSection scrollTriggered>
        {(() => {
          const allPartyLineupNames = new Set(parties.flatMap((p) => p.lineup));
          const eventLineup = (event.lineup ?? []) as string[];
          const eventOnlyLineup = eventLineup.filter(
            (name) => !allPartyLineupNames.has(name)
          );
          // Show event-level lineup if it has unique names, or if no parties have lineups and event has lineup
          const lineupToShow: string[] =
            eventOnlyLineup.length > 0
              ? eventOnlyLineup
              : !allPartyLineupNames.size && eventLineup.length
                ? eventLineup
                : [];
          if (lineupToShow.length === 0) return null;
          const unique = [...new Set(lineupToShow)].sort();

          return (
            <div className="mb-6">
              <SectionHeading>Lineup</SectionHeading>
              {/*
                A lineup pill that is a <Link> is a CHIP, at 44 px — not a badge
                shrunk to fit. `41-UI-SPEC.md` §6.4 records this exact site by
                file and line, and §8.5 states the rule that decides it: a badge
                that is a <Link> or a <button> is a Chip. The pill that has no
                artist page is not a target and is therefore a Badge, which
                renders a <span> and has no prop that would make it one.

                The accent tint goes with the change. §5.1 lists the lineup pills
                among the four things the accent is for, so this is a loss and
                not a correction — but the chip's unselected form is the shape
                the contract assigns, its selected form is an accent FILL that
                also emits aria-current, and a pill that is not "current" may not
                claim to be. Declared, and owed to a person to look at.
              */}
              <div className="flex flex-wrap gap-2">
                {unique.map((artist: string) => {
                  const slug = artistSlugs.get(artist);
                  return slug ? (
                    <Chip key={artist} href={`/artists/${slug}`}>
                      {artist}
                    </Chip>
                  ) : (
                    <Badge key={artist}>{artist}</Badge>
                  );
                })}
              </div>
            </div>
          );
        })()}
        </AnimatedSection>

        {/* Event Pass section (event-level tiers) -- only show when multiple parties exist */}
        {parties.length > 1 && eventTiers.length > 0 && (
          <AnimatedSection scrollTriggered className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
            {hasMasterTicket ? (
              <div className="rounded-xl border border-sem-done/30 bg-sem-done/10 p-4 text-center">
                <p className="text-sm font-medium text-sem-done mb-3">
                  You have an Event Pass
                </p>
                {/*
                  A <Link>, never `Button` with an `href`: the button ladder's
                  href branch renders a BARE ANCHOR on a `string`, so an internal
                  address loses client-side navigation, prefetching and the
                  build-time check that the route exists — silently, all three.
                  `Chip.tsx` states that constraint at the foot of the file. The
                  geometry, the fill and the focus expression are the ladder's md
                  rung, declared at the call site on the correct element.
                */}
                <Link
                  href={`/tickets/${masterTicketId}`}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-ground transition-colors hover:bg-accent-hover active:scale-95 active:opacity-80 ${FOCUS_RING}`}
                >
                  View Your Event Pass
                </Link>
              </div>
            ) : isUpcoming && (!isAuthenticated || isApproved || status === "pending") ? (
              <>
                {/*
                  ── The sentence, and THE CONTROL BELOW IT STAYS LIVE ────────

                  Three things a later reader needs, and all three are
                  decisions rather than oversights:

                  1. **The control is still rendered, deliberately.** No
                     condition removes it, nothing disables it and no prop of
                     it changed. That is the owner's standing decision on this
                     finding — the control stays live and the SERVER refuses
                     (`46-FINDING-01.md`, `46-VALIDATION.md`). The real guard
                     is `reserve_ticket` in the database, which locks the tier
                     row `FOR UPDATE`, counts and raises `Tier sold out`; in
                     plpgsql a failed read RAISES rather than coalescing, so
                     that guard already fails closed. Refusing here on a
                     transient read error would refuse a buyer the database
                     would have accepted.
                  2. **The sentence's job is not to refuse.** It exists to stop
                     a number this page could not read from being presented as
                     a fact. It replaces the figure; it does not replace the
                     sale.
                  3. **The residual stays, and it is accepted with its cost in
                     writing.** A payment can complete for a seat that is not
                     there — the last discount use, a double submit — and
                     nobody is told, because `reserve_ticket` runs at webhook
                     time, AFTER the money moved. That is D-46-07, the owner's
                     call. Nothing here narrows it and this sentence must never
                     be reworded to imply it does; the deferred
                     seat-reservation phase is its fix, by making the window
                     impossible instead of visible.
                */}
                {eventTiers.some((t) => !t.soldKnown) && (
                  <div
                    role="status"
                    className="mb-4 rounded-2xl border border-sem-warn/30 bg-sem-warn/10 p-4"
                  >
                    <p className="text-sm text-sem-warn">
                      {EVENT_PAGE_REFUSAL[PLACES_UNKNOWN]}
                    </p>
                  </div>
                )}
              {/*
                The control's own lines KEEP THEIR ORIGINAL INDENTATION, one
                level shallower than the fragment that now holds them, and that
                is deliberate rather than sloppy. This is the file where a wrong
                edit publishes an address, so its diff is read by a human
                line-by-line before it ships. Re-indenting an untouched control
                would show every prop of it as removed and re-added, and the one
                property the reader most needs to confirm — that nothing about
                the control that takes money changed — would be buried under
                whitespace. Same class of correction as the metadata paragraph
                at the top of this file: keep the mechanical check measuring the
                property it means.
              */}
              <TierSelection
                partyId={null}
                tiers={eventTiers}
                label="Event Pass"
                isAuthenticated={isAuthenticated}
                eventSlug={slug}
              />
              </>
            ) : null}
          </AnimatedSection>
        )}

        {/* Party sections */}
        {parties.map((party) => {
          const hasTicketForParty = !!party.userTicket;
          const { visible: venueVisible, hint: venueHint } = isVenueVisible({
            partyDate: party.date,
            partyTime: party.time,
            venueSecret: party.venue_secret,
            hasTicketForParty,
            hasMasterTicket,
            // `userRsvp` is populated ONLY when `access_type === "free_rsvp"`,
            // and `userTicket` only when it is `"paid"` (see the block above,
            // where both are read). That condition is CORRECT and is not to be
            // touched: an RSVP night sells no tickets and a paid night takes no
            // RSVPs, so exactly one of the two can ever be non-null. Written
            // out because the next reader, finding this `null` on a paid night,
            // would otherwise call it a bug and "fix" it into a second query.
            hasRsvpForParty: !!party.userRsvp,
            isApproved,
            isOrganizer,
            isMasterRole,
            venueRevealHours: party.venue_reveal_hours,
            revealedAt: party.venue_revealed_at ?? null,
            venueSecretHint: party.venue_secret_hint,
            venueRevealOnPurchase: party.venue_reveal_on_purchase,
          });
          // The second verdict. `undefined` here is a REFUSAL and not a gap:
          // the function returns a night with its venue or not at all.
          const venueRow = venueByParty.get(party.id);

          return (
            <Card key={party.id} className="mb-6">
              {/* Party header */}
              <div className="mb-3">
                {/*
                  ── The format, per night, above its title ───────────────────
                  ────────────────────────────────────────────────────────────
                  The format is the SOURCE of the name; the title is free text
                  beneath it. A visitor reads THE NAME ONLY — never the stored
                  figure, never the raw internal code (D-36-09) — and neither
                  is fetched by this page, so neither can arrive here.

                  Carrying the reason, because it is the thing a later "why not
                  show it?" would undo: THE STORED FIGURE IS ITSELF A CHANNEL.
                  *"the eighteenth"* says that eighteen exist, which announces
                  every night nobody announced, without showing one — so no
                  visual inspection of this page could ever catch it. Keeping it
                  off public surfaces removes that channel before it exists.

                  ── Which name, and WHICH PREDICATE decides ──────────────────

                  A series public name is a stored string published on every
                  surface its nights touch, so a series named after a venue
                  publishes that venue every time it renders. When this night is
                  secret, the marker degrades to the format name.

                  THE PREDICATE IS THE STORED FLAG `venue_secret`, and saying so
                  is half the decision, because this page holds a second
                  candidate five lines above: the verdict `isVenueVisible`
                  returns, which is time- and entitlement-dependent — it opens
                  once the night has passed, or hours before it for a holder of
                  a ticket. THEY ARE NOT THE SAME PREDICATE. The stored flag is
                  the narrower of the two (a night whose venue has since been
                  revealed still shows the format name), `venue-secrecy.md`'s
                  default-closed gate says the narrower wins, and it is the same
                  one the event card uses — so the same night cannot say two
                  different names in two places.

                  `!== false` and not `=== true`: anything that is not a stored
                  `false` is treated as secret. The fallback is always the
                  narrower string.
                */}
                {party.format && (
                  <div className="mb-1">
                    <FormatMarker
                      name={
                        party.venue_secret !== false
                          ? party.format.name
                          : party.series_name ?? party.format.name
                      }
                      color={party.format.color}
                    />
                  </div>
                )}
                <p className="text-ink font-medium">{party.title}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon /> {formatPartyDate(party.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon /> {formatTime(party.time)}
                    {party.end_time && ` - ${formatTime(party.end_time)}`}
                  </span>
                </div>

                {/*
                  ── The venue, and the two verdicts that have to agree ───────
                  ────────────────────────────────────────────────────────────
                  `venueVisible && venueRow` — and they stay two. The predicate
                  is UX and the function is the boundary (`CLAUDE.md` principle
                  2); ANDed, the narrower always wins, which is the gate
                  *default chiuso* written as a conjunction. If the reveal state
                  is not determinable for either of them, the address does not
                  render.

                  ── The address is rendered HERE, not linked ────────────────

                  There is no link to `/venues/<slug>` any more. That surface
                  leaves the public tree (D-37-23, plan 37-09), and after the
                  move the link would send a visitor to an address the
                  middleware refuses. The name stays readable for everyone
                  entitled to it, and nobody needs to know where the work
                  surface went. The Maps link is the venue's own stored one,
                  never a constructed search.

                  ── WHERE AN ADDRESS CAN LEAVE THIS PAGE, RE-ENUMERATED ─────

                  `venue-secrecy.md`, gate *percorsi enumerati*, requires this
                  list to be rebuilt by READING the code, because it is dated by
                  construction. Read on 2026-08-10, for this page only:

                    1. this block — name, address and Maps link, gated by both
                       verdicts above;
                    2. `SecretVenueDialog`, below — the HINT and never the
                       address. The hint is shown only to a signed-in reader,
                       and `venue-secrecy.md` requires it not to identify the
                       place on its own;
                    3. `party.venue_text` — free text on the night, for a night
                       with no venue row attached. It is NOT gated by the
                       function, and it is unchanged from before this phase:
                       whoever types an address into it has published it, and
                       that is a content decision this code cannot police.

                  What is NO LONGER an exit from this page: the nested embed of
                  the venues table (removed above) and the link to the public
                  venue page (removed here). This route exports no metadata
                  function either, so there is no social-preview exit — an
                  absence that is a choice (T-37-25, and the docblock at the top
                  of this file).
                */}
                {(venueRow || party.venue_text || party.venue_secret) && (
                  <div className="mt-1">
                    {venueVisible && venueRow ? (
                      <div className="text-sm">
                        <p className="inline-flex items-center gap-1 text-ink">
                          <MapPinIcon /> {venueRow.name}
                        </p>
                        {venueRow.address && (
                          <p className="mt-0.5 text-muted">{venueRow.address}</p>
                        )}
                        {venueRow.google_maps_url && (
                          <a
                            href={venueRow.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-0.5 inline-flex min-h-11 items-center text-accent hover:text-accent-hover active:scale-95 active:opacity-80 transition-transform ${FOCUS_RING}`}
                          >
                            Open in Maps
                          </a>
                        )}
                      </div>
                    ) : venueVisible && party.venue_text ? (
                      <p className="inline-flex items-center gap-1 text-sm text-muted">
                        <MapPinIcon /> {party.venue_text}
                      </p>
                    ) : party.venue_secret ? (
                      /*
                        `revealHours` is the window ALREADY RESOLVED by the
                        server. The dialog used to receive the STORED value and,
                        on `NULL`, wrote "closer to the event" while the logic
                        applied the fallback — the page promising one thing and
                        the system doing another. Resolved here, the client
                        component never learns the fallback exists and therefore
                        cannot diverge from it; the way to get it wrong goes away
                        with it. Plan 37-07 owns that file and narrows the prop
                        type to `number`.
                      */
                      <SecretVenueDialog
                        hint={venueHint}
                        isAuthenticated={isAuthenticated}
                        isApproved={isApproved}
                        revealHours={venueRevealHours(party.venue_reveal_hours)}
                        revealOnPurchase={party.venue_reveal_on_purchase}
                      />
                    ) : null}
                  </div>
                )}

                {party.description && (
                  <p className="mt-2 text-sm text-muted whitespace-pre-line">
                    {party.description}
                  </p>
                )}
              </div>

              {/* Party lineup (inside the card) */}
              {party.lineup.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {/* §6.4 names this pill by file and line — 20 px, a <Link>,
                      and therefore a Chip at 44 px. See the note on the
                      event-level row above. */}
                  {[...party.lineup].sort().map((artist) => {
                    const slug = artistSlugs.get(artist);
                    return slug ? (
                      <Chip key={artist} href={`/artists/${slug}`}>
                        {artist}
                      </Chip>
                    ) : (
                      <Badge key={artist}>{artist}</Badge>
                    );
                  })}
                </div>
              )}

              {/* Capacity — hidden for past parties */}
              {isUpcoming && party.capacity !== null && party.spotsLeft !== null && (
                <p
                  className={`mb-3 text-sm ${
                    party.spotsLeft <= 0
                      ? "text-sem-crit font-medium"
                      : "text-muted"
                  }`}
                >
                  {party.spotsLeft <= 0 ? "Sold out" : `${party.spotsLeft} spots left`}
                </p>
              )}

              {/* Already has ticket for this party */}
              {isAuthenticated && party.userTicket && (
                <div className="rounded-xl border border-sem-done/30 bg-sem-done/10 p-4 text-center">
                  <p className="text-sm font-medium text-sem-done mb-3">
                    You have a ticket for this
                  </p>
                  {/*
                    ── UNA FRASE, AGGIUNTA IL 2026-08-22 ────────────────────────

                    E' l'unica modifica di questo file in questo lavoro, ed e'
                    additiva: nessuna condizione, nessuna lettura, nessun
                    predicato di rivelazione e nessuna colonna e' toccata. La
                    riga sopra e il link sotto sono quelli che c'erano.

                    Serve perche' questa e' la superficie su cui atterra chi ha
                    ripreso un acquisto interrotto: quel percorso ricarica la
                    pagina della serata, e fino a oggi nessuno gli diceva che il
                    biglietto non sta nella posta. Detto qui, arriva anche a lui
                    senza toccare il file che decide se un acquisto riprende.

                    Non promette un account — vincolo del proprietario del
                    2026-08-22 sull'acquisto da ospite — e non nomina nessuna
                    sede: dice dove sta il biglietto e che la mail non serve.
                  */}
                  <p className="text-xs text-muted mb-3">
                    You never need to open the email — showing the QR code from
                    the ticket is enough.
                  </p>
                  <Link
                    href={`/tickets/${party.userTicket.id}`}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-ground transition-colors hover:bg-accent-hover active:scale-95 active:opacity-80 ${FOCUS_RING}`}
                  >
                    View Your Ticket
                  </Link>
                </div>
              )}

              {/* Master ticket holder sees "covered" badge */}
              {isAuthenticated && hasMasterTicket && !party.userTicket && (
                <div className="rounded-xl border border-sem-done/30 bg-sem-done/10 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-sem-done">
                    Covered by your Event Pass
                  </p>
                </div>
              )}

              {/* Paid party: tier selection (upcoming only) */}
              {isUpcoming &&
                !party.userTicket &&
                !hasMasterTicket &&
                party.access_type === "paid" &&
                party.tiers.length > 0 &&
                (!isAuthenticated || isApproved || status === "pending") &&
                (
                  <>
                    {/*
                      ── The same sentence, and THIS CONTROL STAYS LIVE TOO ───

                      The three notes at the event-level site above apply here
                      unchanged, and they are the reason this is not an
                      oversight: the control stays rendered by the owner's
                      standing decision (`46-FINDING-01.md`,
                      `46-VALIDATION.md`) because the authoritative guard is
                      `reserve_ticket` in the database, which fails closed;
                      the sentence exists to stop a number nobody could read
                      from being presented as a fact, not to refuse the buyer;
                      and the residual — a payment completing for a seat that
                      is not there, with nobody told — is D-46-07, accepted
                      with its cost in writing, whose fix is the deferred
                      seat-reservation phase.

                      ONE WORDING, BOTH SITES, taken verbatim from the approved
                      list. Two wordings for one fact is how a register
                      fragments (`community-membership.md`: the text is written
                      once and used always).

                      **THE TWO NULLS ARE NOT THE SAME NULL.** The *spots left*
                      block above tests `spotsLeft !== null` and vanishes for
                      both of them — which is right, since neither is a figure
                      worth printing. Only one of them is a failure, though, so
                      the condition here reads `spotsUnknown` and NOT
                      `spotsLeft === null`: a night with no capacity set gets
                      no sentence, because nothing went wrong on it. Making the
                      two look alike would be this plan's own defect, one layer
                      up from where it was fixed.

                      Scope, stated rather than left to be noticed: this
                      sentence is drawn at the PAID control only. It ends
                      *"Buying is still open"*, which is not a true thing to
                      say beside an RSVP button, and the approved list holds no
                      second wording for a free night — a plan that wanted one
                      would amend the list and re-present it whole (D-46-10a).
                      On a free RSVP night whose count failed, the figure still
                      disappears; what is missing is the explanation, on a path
                      where no money moves.
                    */}
                    {(party.spotsUnknown || party.tiers.some((t) => !t.soldKnown)) && (
                      <div
                        role="status"
                        className="mb-4 rounded-2xl border border-sem-warn/30 bg-sem-warn/10 p-4"
                      >
                        <p className="text-sm text-sem-warn">
                          {EVENT_PAGE_REFUSAL[PLACES_UNKNOWN]}
                        </p>
                      </div>
                    )}
                  {/* Original indentation kept, for the reason given at the
                      event-level site above: on this file the diff must show
                      the money control untouched, not re-indented. */}
                  <TierSelection
                    partyId={party.id}
                    tiers={party.tiers}
                    isAuthenticated={isAuthenticated}
                    eventSlug={slug}

                  />
                  </>
                )}

              {/* Free RSVP party: RSVP button (upcoming only) */}
              {isUpcoming &&
                party.access_type === "free_rsvp" &&
                (!isAuthenticated || isApproved) &&
                (
                  <RsvpButton
                    partyId={party.id}
                    eventId={event.id}
                    hasRsvp={!!party.userRsvp}
                    isAuthenticated={isAuthenticated}
                    eventSlug={slug}
                  />
                )}

              {/* Free public party: badge (upcoming only) */}
              {isUpcoming && party.access_type === "free_public" && (
                <div className="rounded-xl bg-sem-done/10 border border-sem-done/30 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-sem-done">
                    Free Entry
                  </p>
                </div>
              )}

            </Card>
          );
        })}


        {/* Drink Menu — link for master/organizer only */}
        {canSeeDrafts && (drinkItemCount ?? 0) > 0 && (
          <AnimatedSection scrollTriggered className="mb-6">
            {/* Still an <a> and not a <Link>: converting the element would swap
                a full document load for a client navigation, which is a
                behaviour change dressed as a styling one. The card-sized link
                declares the floor and the focus ring at its own call site, as
                the converted night card on /events does. */}
            <a
              href={`/events/${event.slug}/menu`}
              className={`block min-h-11 w-full rounded-xl border border-line bg-surface p-4 text-center transition-colors hover:border-accent/50 ${FOCUS_RING}`}
            >
              <p className="text-sm font-medium text-ink">Drink Menu</p>
              <p className="mt-1 text-xs text-muted">View available drinks</p>
            </a>
          </AnimatedSection>
        )}

        {/* My Drinks — user's purchased drink tokens */}
        {userDrinkTokens && userDrinkTokens.length > 0 && (
          <AnimatedSection scrollTriggered className="mb-6">
            <MyDrinks tokens={userDrinkTokens} />
          </AnimatedSection>
        )}

        {/* Event Gallery */}
        <AnimatedSection scrollTriggered className="mb-6">
          <SectionHeading>Gallery</SectionHeading>
          <MediaGallerySection
            media={mediaItems}
            canUpload={canUpload}
            eventId={event.id}
            uploadableParties={uploadableParties}
          />
        </AnimatedSection>
      </div>
        </PageShell>
      </div>

      {/* Presentation. Cast at the page boundary because the navigation is a
          client component; phase 34 (STAFF-03) owns the nav vocabulary.

          The mount moved UP A LEVEL, out of the deleted page root and into the
          fragment, and it is a SIBLING of the declaring div rather than a child
          of it — inside, it would still satisfy the textual pairing and would
          pad the column by its own clearance. The shape is
          src/app/(public)/gallery/page.tsx:88-133.

          The four props are the four the phone-locked wrapper received, in the
          same order. Width may change layout, never membership: the server
          decides which entries exist and CSS decides only how they sit. NO
          CAPABILITY CHECK IS TOUCHED. */}
      <AppNav
        role={role as UserRole | null}
        status={status as UserStatus | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
