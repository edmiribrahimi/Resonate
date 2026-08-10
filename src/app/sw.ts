import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

// Serwist precache manifest injection point
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

/**
 * The door's runtime caching, chosen route by route instead of inherited.
 *
 * The offline cache for the door is IndexedDB (`src/lib/offline/`), never Cache
 * Storage. Two caches holding the same data with different lifetimes is the
 * defect, not a redundancy: the library's inherited rules include a
 * `NetworkFirst` for every same-origin `GET /api/*` (`cacheName: "apis"`,
 * `maxAgeSeconds: 86400`, `networkTimeoutSeconds: 10`), so on a weak signal the
 * attendee fetch resolves from a day-old payload while `navigator.onLine` is
 * still `true`, and the scanner writes that stale list over the good local one.
 * And `/api/membership/list` returns the whole member roster — every full name
 * and membership code — which must not be left at rest in a browser cache
 * bucket on a staff phone we do not control.
 *
 * Order matters: Serwist takes the first matching route, so these rules must be
 * spread before the inherited ones, or the inherited `/api/*` rule keeps
 * winning.
 */
const doorRuntimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/tickets/attendance",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/tickets/checkin",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/membership/list",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/membership/verify",
    handler: new NetworkOnly(),
  },
  /**
   * The event detail, out of all three page caches — and the cost of that,
   * written here rather than discovered later.
   *
   * ── What it is protecting ────────────────────────────────────────────────
   *
   * Since plan 37-06 the venue predicate has a TIME component that trips by
   * itself, at an instant nobody presses: an approved member sees the address
   * `DEFAULT_VENUE_REVEAL_HOURS` before the night starts. A copy of the page in
   * Cache Storage crosses that instant without knowing it did.
   *
   * The inherited rules put this page in Cache Storage for 24 hours in THREE
   * forms — the HTML document (`pages`), the RSC payload (`pages-rsc`) and the
   * RSC prefetch (`pages-rsc-prefetch`) — each `NetworkFirst`, which means the
   * copy IS served whenever the network is missing or slow. Served stale
   * BEFORE the instant it shows the hint to somebody who is by then entitled to
   * the address: annoying, and at two in the morning in front of a door,
   * seriously annoying. Served stale AFTER the instant it keeps an address at
   * rest on a device — and on a shared or handed-over phone that is a reader
   * who must not have it. There is no rollback for that one
   * (`venue-secrecy.md`, gate *cache e pre-render*).
   *
   * Matching is on the PATH, not on `Content-Type`, exactly like the four door
   * rules above: the three forms differ by header and query string, not by
   * pathname, so a content-type filter would catch one of the three and leave
   * two.
   *
   * ── The cost, which is real and is accepted ──────────────────────────────
   *
   * **Without network, this page no longer opens at all.** Not stale — not at
   * all. That is a deliberate conflict between two gates of this project, and
   * it is resolved the way `meta-gates.md` says to resolve one:
   *
   *   - `checkin-offline.md` wants the opposite. At the door the default is to
   *     ADMIT, because the error there is recoverable: a double entry is
   *     noticed, a valid guest turned away happens in front of a queue.
   *   - `venue-secrecy.md` wants the default CLOSED, because here the error is
   *     NOT recoverable: an address shown once has been published.
   *
   * The more restrictive wins, and the conflict is written down instead of
   * being smoothed over. This is T-37-27 in the plan's threat register,
   * disposition ACCEPT. The door is untouched by it: the scanner's offline
   * store is IndexedDB (`src/lib/offline/`), it does not live under `/events/`,
   * and the four rules above are unchanged.
   *
   * Collateral, and it is deliberate: `/events/<slug>/menu` sits under the same
   * prefix and loses its cached copy too. That page shows drink prices and the
   * menu's closing time — a surface where a day-old copy is its own hazard, so
   * covering it is not an accident to be trimmed away.
   *
   * ── What this rule does NOT do ───────────────────────────────────────────
   *
   * It does not evict what is already there. Entries cached on devices that
   * opened the page BEFORE this deploy survive until they expire (24 h) or are
   * overwritten. `skipWaiting` and `clientsClaim` update the WORKER on the next
   * visit; they do not empty the buckets the old worker filled.
   *
   * Operational consequence for plan 37-13: the first cache measurement is
   * taken in a PRIVATE window, or it measures the old worker and reports a
   * result about code that is no longer running.
   */
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/events/"),
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    concurrency: 10,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...doorRuntimeCaching, ...defaultCache],
});

serwist.addEventListeners();
