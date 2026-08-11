/**
 * The fifteen `/organizer/*` addresses, and where each one now lives.
 *
 * ── One direction, and it is not a preference ────────────────────────────────
 *
 * Every `from` is under `/organizer` and every `to` is under `/admin`
 * (D-34-01, D-34-04). There is no reverse row and none may ever be added.
 *
 * The two prefixes were symmetric in cost — 48 hardcoded `/admin…` references
 * against 51 `/organizer…` — so the tie was broken by the door. `/admin/scanner`
 * must not move (STAFF-04 is Phase 39, alone, because a redirect needs a
 * network the door is designed not to have), and it already lives under
 * `/admin`. Any other canonical choice would turn `/admin` into a redirect
 * shell that has to **exclude** one address, recreating in a second place the
 * precedence hazard `src/lib/supabase/middleware.ts:345-352` exists to warn
 * about. *The collapse must not add a second place where the door's precedence
 * has to be remembered.* A reverse row would put that address one careless
 * entry away from being redirected, which is why the fence below is a throw
 * and not a paragraph.
 *
 * ── A table, not a catch-all ─────────────────────────────────────────────────
 *
 * Fifteen explicit rows, because D-34-04's own word is *"reviewed as a table"*,
 * because a `:path*` catch-all would silently alias any future `/admin/x` as
 * `/organizer/x`, and because a catch-all cannot express `/organizer` →
 * `/admin/events`.
 *
 * ── Where it is NOT declared, and why that is the same decision ──────────────
 *
 * Not in `next.config.ts` (D-34-14). A `next.config` redirect's **source enters
 * the generated route type union** — `/galleria`, `/presenze`, `/registrati`
 * and `/eventi/[[...path]]` sit in `StaticRoutes` today for exactly that
 * reason. Declaring these fifteen there would keep every stale
 * `/organizer/…` literal compiling and hand this phase a false green on the
 * one sweep it exists to perform. The status is emitted from the middleware
 * instead, in plan 34-03.
 *
 * ── What the build does NOT carry, measured rather than assumed ──────────────
 *
 * `src/middleware.ts` imports this module (plan 34-03), and **that did not make
 * the throws below build-enforced.** Plan 34-01 hoped it would; 34-03 measured
 * that it does not, with the import in place: a row naming the scanner still
 * exits `npm run build` 0, because importing a module gets it bundled and does
 * not get it evaluated. Module-load code in a middleware bundle runs when the
 * runtime instantiates the bundle — **the first request after deploy**.
 *
 * The one half the build DOES carry is the one-directionality, and it is a type
 * rather than a throw: `RedirectRow` types `from` as `/organizer…` and `to` as
 * `/admin…`, so a reverse row fails to compile. The `/scanner` half is a
 * first-request throw, and saying so is the point — a reader who assumed the
 * build covered it would be trusting a check that does not run. What the throw
 * buys instead is a loud 500 on every covered route on the first request, which
 * in a product with no error tracking beats a door that quietly refuses the
 * people rostered to work it.
 */

import { CAP } from "@/lib/capabilities/keys";
import {
  CAPABILITY_ROUTES,
  resolveRoute,
} from "@/lib/routes/capability-routes";

/** A row: where a request arrives, and the address that actually renders it. */
type RedirectRow = readonly [from: `/organizer${string}`, to: `/admin${string}`];

/**
 * 308 — permanent, since **2026-08-10**, and the order in which it got here is
 * the whole safeguard (D-34-04, D-34-15).
 *
 * A 308 is a fourth monotone guard in the sense of `.claude/rules/meta-gates.md`:
 * a browser caches it and it does not come back, so a wrong one cannot be
 * withdrawn from a client that has already seen it. The rule for the other three
 * applies unchanged — a change may only make it harder to trip.
 *
 * The table therefore ran at **307 for the whole phase**, and the flip happened
 * only **after** a green fifteen-row walk against a running server: fifteen rows,
 * each answering 307 at its declared destination, `/admin/scanner` answering the
 * unauthenticated bounce to `/login` and not a relocation. The walk was then
 * **re-run after the flip**, because a walk before and a walk after are two
 * different measurements and only the second one describes what ships. Both are
 * recorded in `.planning/phases/34-one-work-surface/34-VERIFICATION.md`.
 *
 * `scripts/verify-organizer-redirects.sh` reads this constant rather than
 * hardcoding a number, so re-walking after any future change to it needs no edit
 * to the script. Changing it back to a temporary status would not un-cache the
 * 308 already served, which is why there is no "revert" for this line — only a
 * new address.
 */
export const REDIRECT_STATUS = 308;

/**
 * `/organizer` points at `/admin/events` and **not** at `/admin`.
 *
 * Pitfall 5: every destination must be an address that renders, never another
 * redirect. `(admin)/admin/page.tsx` is itself a bare `redirect()`, so pointing
 * here at `/admin` would chain two hops — and with a 308 in front of it, cache
 * the chain.
 */
export const ORGANIZER_REDIRECTS: readonly RedirectRow[] = [
  ["/organizer", "/admin/events"],
  ["/organizer/artists", "/admin/artists"],
  ["/organizer/venues", "/admin/venues"],
  ["/organizer/members", "/admin/members"],
  ["/organizer/events", "/admin/events"],
  ["/organizer/events/new", "/admin/events/new"],
  ["/organizer/events/[id]/analytics", "/admin/events/[id]/analytics"],
  ["/organizer/events/[id]/assignments", "/admin/events/[id]/assignments"],
  ["/organizer/events/[id]/drinks", "/admin/events/[id]/drinks"],
  ["/organizer/events/[id]/edit", "/admin/events/[id]/edit"],
  ["/organizer/events/[id]/guest-list", "/admin/events/[id]/guest-list"],
  ["/organizer/events/[id]/media", "/admin/events/[id]/media"],
  ["/organizer/events/[id]/review", "/admin/events/[id]/review"],
  ["/organizer/events/[id]/sales", "/admin/events/[id]/sales"],
  ["/organizer/events/[id]/tickets", "/admin/events/[id]/tickets"],
];

/** `"/organizer/events/x/edit"` becomes `["organizer", "events", "x", "edit"]`. */
function splitSegments(path: string): readonly string[] {
  return path.split("/").slice(1);
}

interface CompiledRow {
  readonly from: string;
  readonly to: string;
  readonly fromSegments: readonly string[];
  readonly toSegments: readonly string[];
}

const COMPILED_ROWS: readonly CompiledRow[] = (() => {
  const rows: CompiledRow[] = ORGANIZER_REDIRECTS.map(([from, to]) => ({
    from,
    to,
    fromSegments: splitSegments(from),
    toSegments: splitSegments(to),
  }));

  // ── Fence 1: the door's addresses, and the table's one direction. ──────────
  //
  // Expressed as a throw and not as a comment, because the paragraph above is
  // read once and this runs on every import. **No address of the door** may
  // appear on either side of a row: not as a source, which would redirect the
  // door, and not as a destination, which would point somebody at it through a
  // rule nobody re-reads.
  //
  // ── Phase 39: the fence follows the MAP, not a spelling ────────────────────
  //
  // Until Phase 39 this test matched the substring `/scanner`, which protected
  // exactly one address — so after the move a sixteenth row pointing at the
  // door's new address would have **passed**. Reading
  // `CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes` instead removes one more place
  // where the door's address has to be remembered, which is the same argument
  // `src/lib/rbac/roles.ts` already makes about itself. The comparison is by
  // **equality**, not by substring: a fence that matched loosely would also
  // claim an unrelated future address that happened to contain the word.
  const doorAddresses: readonly string[] =
    CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes;

  for (const row of rows) {
    if (row.from.startsWith("/admin")) {
      throw new Error(
        `organizer-redirects: row "${row.from}" -> "${row.to}" has a source under /admin. ` +
          `The table is one-directional: /organizer to /admin, never the reverse.`
      );
    }
    const matchedDoorAddress = doorAddresses.find(
      (address) => row.to === address || row.from === address
    );
    if (matchedDoorAddress !== undefined) {
      throw new Error(
        `organizer-redirects: row "${row.from}" -> "${row.to}" names the door's address ` +
          `"${matchedDoorAddress}". The door keeps its addresses and no redirect may ` +
          `match one or point at one.`
      );
    }
  }

  // ── Fence 2: no destination outside the route map (Pitfall 5). ─────────────
  //
  // A destination with no binding would be refused by the middleware after the
  // hop, which is a refusal caused by this table and blamed on the capability
  // model. `resolveRoute` accepts the `[id]` spelling directly: a dynamic
  // segment matches any single non-empty segment, and `[id]` is one.
  for (const row of rows) {
    if (resolveRoute(row.to) === null) {
      throw new Error(
        `organizer-redirects: destination "${row.to}" (from "${row.from}") is not bound in ` +
          `CAPABILITY_ROUTES. Every destination must be an address the map can judge.`
      );
    }
  }

  // ── Fence 3: fifteen rows, each source once. ───────────────────────────────
  if (rows.length !== 15) {
    throw new Error(
      `organizer-redirects: expected 15 rows, found ${rows.length}. The count is part of ` +
        `the review: a row added without one is a row nobody read.`
    );
  }
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.from)) {
      throw new Error(
        `organizer-redirects: duplicate source "${row.from}". Two rows for one address ` +
          `means the destination depends on declaration order.`
      );
    }
    seen.add(row.from);
  }

  return rows;
})();

/**
 * Resolve an incoming `/organizer/*` pathname to its collapsed twin, or `null`
 * when the table says nothing about it.
 *
 * The same segment walk as the route map, for the same reason: a dynamic
 * segment matches exactly one non-empty segment, lengths are compared, and no
 * pattern language is involved. The concrete id is carried across into the
 * destination position for position — nothing user-supplied enters the
 * destination except that one segment, which came from the path Next already
 * normalised (T-34-04).
 */
export function resolveOrganizerRedirect(pathname: string): string | null {
  const segments = splitSegments(pathname);

  for (const row of COMPILED_ROWS) {
    if (row.fromSegments.length !== segments.length) continue;

    const captured: string[] = [];
    let matches = true;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (segment.length === 0) {
        matches = false;
        break;
      }
      const patternSegment = row.fromSegments[i];
      if (patternSegment.startsWith("[")) {
        captured.push(segment);
        continue;
      }
      if (patternSegment !== segment) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;

    let nextCapture = 0;
    const destination: string[] = [];
    for (const patternSegment of row.toSegments) {
      if (patternSegment.startsWith("[")) {
        destination.push(captured[nextCapture]);
        nextCapture += 1;
        continue;
      }
      destination.push(patternSegment);
    }
    return `/${destination.join("/")}`;
  }

  return null;
}
