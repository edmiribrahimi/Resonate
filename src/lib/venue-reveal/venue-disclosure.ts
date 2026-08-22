import { partyStartInstant, venueRevealHours } from "@/utils/datetime";

/**
 * venue-disclosure.ts — the ONE place that decides whether a SURFACE may carry a
 * secret night's venue.
 *
 * ── The rule this file encodes, and who set it ───────────────────────────────
 *
 * Owner's decision, 2026-08-22, recorded in
 * `.planning/todos/pending/secret-venue-three-surfaces.md` and confirmed there
 * with three verification questions:
 *
 * | surface                              | before the reveal | after the reveal |
 * |--------------------------------------|-------------------|------------------|
 * | the public event surfaces            | `Secret Venue`    | `Secret Venue`   |
 * | the mail to ticket holders           | —                 | the address      |
 * | the holder's own ticket page         | nothing           | the venue, at once |
 *
 * **The property it establishes, and the criterion every future change is judged
 * against: the reveal does not make the address public — it makes it known to
 * whoever bought.** A secret night's address never appears on a surface open to
 * anyone, at any moment of that night's life, the night itself included.
 *
 * ── Why this is ONE file and not a predicate per page ───────────────────────
 *
 * Two expressions deciding the same thing in two files diverge, and here
 * divergence means publishing an address. The project has the precedent in its
 * own vocabulary files: a second literal of the same decision is a second answer
 * waiting to be given. So the two callers below read from here and write no
 * predicate of their own.
 *
 * ── The direction of the change, because the guard is monotone ──────────────
 *
 * `meta-gates.md` allows a change to a reveal path only in the direction that
 * makes the reveal HARDER to trip, save an explicit authorisation documented in
 * the commit. Both callers of this module got strictly narrower on the day it
 * landed:
 *
 *   * the public event page rendered the address once its reveal verdict opened
 *     — a window, a manual act, a role, a past night. It renders it **never**
 *     for a secret night now.
 *   * the ticket page rendered the night's free venue text **unconditionally**
 *     to the holder. It renders it only once the reveal has fired now.
 *
 * **Nothing here widens anything, and nothing here touches the reveal itself.**
 * The window, the manual act, the per-recipient marks, the cron's order of steps
 * and the mail are all read-only to this module: {@link hasRevealFired} asks the
 * SAME question the rest of the product already asks, and only the surfaces that
 * honour the answer changed.
 *
 * ── The one thing this module is NOT ────────────────────────────────────────
 *
 * It is not a boundary. `CLAUDE.md` principle 2: the page is UX, the database is
 * security. What a caller may READ is decided by RLS and by
 * `public.venue_for_parties`; what a surface may SHOW is decided here. The two
 * verdicts stay two, and a surface is never wider than the boundary under it —
 * which after this change is trivially true, because every surface got smaller
 * and no policy moved.
 */

/**
 * Everything the reveal question needs about one night, and nothing else.
 *
 * The four reveal inputs are exactly the columns the public event page already
 * selects as an ordinary reader, which is why they are these four and not a
 * wider set: a surface that has to widen its select to answer this question
 * would be asking the database for something it has not been shown it may have.
 */
export interface NightVenueState {
  /** `event_parties.venue_secret`. Nullable on purpose — see {@link isNightSecret}. */
  venueSecret: boolean | null | undefined;
  /** `event_parties.date`. */
  partyDate: string;
  /** `event_parties.time`. */
  partyTime: string | null;
  /** `event_parties.venue_reveal_hours`, RAW. The effective window is resolved here. */
  venueRevealHours: number | null;
  /** `event_parties.venue_revealed_at` — the instant somebody revealed by hand. */
  venueRevealedAt: string | null;
}

/**
 * Is this night secret?
 *
 * `!== false` and not `=== true`, which is the same reading the two public
 * surfaces already apply to this column: **anything that is not a stored
 * `false` is treated as secret** — a missing row, a failed join, a column that
 * stopped being selected. `venue-secrecy.md` *gate default chiuso*: this is the
 * one domain in the project where the safe answer is to refuse.
 *
 * Written as a positive test rather than as a bare read for exactly that reason.
 * A bare `venueSecret` would evaluate `undefined` — hence falsy, hence *not
 * secret* — on any row whose select forgot the column, and the failure would be
 * a published address with no error anywhere.
 */
export function isNightSecret(venueSecret: boolean | null | undefined): boolean {
  return venueSecret !== false;
}

/**
 * May a surface **open to anyone** render this night's venue?
 *
 * One term, and that is the whole of the owner's rule for public surfaces: a
 * secret night, never. Not at the window, not after a manual reveal, not once
 * the mail has gone out, not after the doors have closed.
 *
 * ── Why no reader is exempt, staff included ─────────────────────────────────
 *
 * There is no role term here and its absence is the decision. The criterion the
 * owner set is the SURFACE, not the reader — and a page that shows one thing to
 * staff and another to a visitor cannot be checked by looking at it. With this
 * predicate, an organiser opening the public page sees exactly what a stranger
 * sees, which turns "does this page leak?" into a question a person can answer
 * with their eyes instead of with a session.
 *
 * Staff keep every road they had: the work surfaces under `admin/`, and the
 * database, which this module does not touch.
 */
export function mayShowVenueOnPublicSurface(night: {
  venueSecret: boolean | null | undefined;
}): boolean {
  return !isNightSecret(night.venueSecret);
}

/**
 * Has this night's reveal fired?
 *
 * **This function decides nothing new.** It asks the question the product
 * already answers in two other places — `public.venue_for_parties`' fifth arm,
 * and the reveal cron's own window filter — and it asks it with the same terms,
 * read from the same single home for the window
 * (`DEFAULT_VENUE_REVEAL_HOURS` in `src/utils/datetime.ts`). No literal number
 * is written here, because a copy of that number would be its third home and
 * drift is what a third home is for.
 *
 * The three terms, each with its own job:
 *
 *   * **the manual act** — an instant somebody wrote. It is what makes the
 *     button observable: pressed before the window, the holder's ticket opens.
 *   * **the window** — the night's start, less its effective window. This is
 *     the term that keeps the two roads to the holder INDEPENDENT: the ticket
 *     page opens whether or not the mail left, so a silently failing cron costs
 *     the mail and not the address. The decision card asks for exactly that
 *     redundancy — *if one of the two roads gives way, the other holds*.
 *   * **the night has started** — it looks subsumed by the window and is not,
 *     for a negative `venue_reveal_hours`: the column is a bare integer with no
 *     `CHECK`, and on a negative value the window term opens AFTER the doors
 *     while this one still opens at them.
 *
 * An unparseable date, time or reveal instant answers **false**. Default closed,
 * again: the one domain where a value nobody can read means *refuse*.
 */
export function hasRevealFired(night: NightVenueState): boolean {
  // A manual reveal counts only when it is a REAL instant. Absent, or a string
  // that does not parse, is "not revealed". Written as a positive test because
  // `undefined !== null` is TRUE, and a column that stopped being selected would
  // otherwise open every secret night at once, silently.
  if (
    typeof night.venueRevealedAt === "string" &&
    !Number.isNaN(Date.parse(night.venueRevealedAt))
  ) {
    return true;
  }

  const start = partyStartInstant(night.partyDate, night.partyTime).getTime();
  if (Number.isNaN(start)) return false;

  const now = Date.now();
  if (now > start) return true;

  const hours = venueRevealHours(night.venueRevealHours);
  return start - now <= hours * 3_600_000;
}

/**
 * May the HOLDER'S OWN ticket page render this night's venue?
 *
 * Two terms and no role: the entitlement is holding the ticket, which the caller
 * has already established by fetching the row under its own user id, and the
 * timing is the night's reveal.
 *
 * ── What is deliberately NOT a term here ────────────────────────────────────
 *
 * `venue_reveal_on_purchase`. On a night configured to unlock the address at
 * purchase, the holder still waits for the reveal on this surface, because the
 * owner's table says *nothing* before the reveal on the ticket page and says it
 * without an exception. The flag is not dead — it still governs the third arm of
 * `public.venue_for_parties`, which is the boundary — but it no longer moves a
 * pixel on either surface, and that is a narrowing, stated rather than
 * discovered.
 *
 * ── The half this predicate cannot reach, said plainly ──────────────────────
 *
 * The field it gates is FREE TEXT SOMEBODY TYPED. If a person wrote `Secret
 * Venue` into it, nothing leaves whatever this returns; if they wrote a street
 * and a number, this decides WHEN it leaves and never WHETHER it was ever
 * appropriate to store it there. That is a content decision no code can police,
 * and it is why the answer here is *when the night's reveal has fired* rather
 * than *always*.
 */
export function mayShowVenueToTicketHolder(night: NightVenueState): boolean {
  if (!isNightSecret(night.venueSecret)) return true;
  return hasRevealFired(night);
}
