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

/**
 * The release boundary — every cached DOCUMENT dropped when a new worker takes
 * over, and the cost of that written here rather than discovered at a door.
 *
 * This is an ADDITIONAL listener, never a replacement for the call above. The
 * precedent for *add alongside, do not override* is `runtimeCaching` itself at
 * :125 — `[...doorRuntimeCaching, ...defaultCache]` — whose ordering reason is
 * written at :28-30.
 *
 * An `activate` event fires only when the worker's bytes changed, which is to
 * say only on a release. The release boundary is therefore ALREADY an event,
 * and there is no version bookkeeping to invent: no constant compared against
 * a stored one, no `/version.json` poll, no update-notice component. Each of
 * those is a thing this project decided not to hand-roll.
 *
 * ── What it is protecting ──────────────────────────────────────────────────
 *
 * A moment before this listener runs, `Serwist.handleActivate` has deleted
 * from the precache every entry absent from the NEW manifest
 * (`serwist/dist/index.js:1228-1245`). CSS filenames are CONTENT hashes, so a
 * release that changes one style changes the stylesheet's URL — and the
 * previous stylesheet is gone the instant this worker activates, while the old
 * page is still open, because `skipWaiting: true` at :122 hands control over
 * immediately.
 *
 * A document kept past that point names a stylesheet that is no longer on the
 * device and, offline, cannot be fetched. That is an unstyled page, and the
 * page this matters for is `/door`:
 *
 *   Night N−1: `/door` is opened online on the staff phone. Its document
 *   enters `pages`, its `<link>` naming a stylesheet. A release ships. Night
 *   N, within 24 h, radio off: the cached document is served and the
 *   stylesheet it names is not on the device. An unstyled door, in a dark
 *   room, in front of a queue.
 *
 * After this purge a page renders WHOLE, or it does not render at all. It
 * never renders half. That is DS-10, and D-40-13 is the decision that chose
 * this mechanism — the one that needs no reload — over every alternative.
 *
 * ── The cost, which is real and is accepted ────────────────────────────────
 *
 * After a release, the first open of any page on that device must be ONLINE.
 *
 * For `/door` that is the runbook line `checkin-offline.md:57` already
 * requires — *open the door, online, on that phone, that evening, at the
 * address that phone will actually be sent to*. This adds no step; it makes an
 * existing step load-bearing in one more situation.
 *
 * It is the same species of conflict the `/events/*` rule above resolves at
 * :76-97, and it takes the same treatment — both gates named, one declared the
 * winner, the disposition recorded:
 *
 *   - `checkin-offline.md` charges a warm-up cost, and would rather the door
 *     opened from yesterday's cache than not at all.
 *   - DS-10 wants a version boundary: no device left serving a mixture, ever.
 *
 * The more restrictive reading wins, and this is not a new trade — it is the
 * one the owner decided on 2026-08-11 (`checkin-offline.md:59`), in the
 * direction it was decided: *a door served by yesterday's cache is a stale
 * door*, and *the warm-up is not a migration step, it is a cost of every
 * night*. A door served against a deleted stylesheet is the same hazard in a
 * different coat. This is T-40-24 in plan 40-05's threat register, disposition
 * ACCEPT, settled by D-40-13 and not re-opened here.
 *
 * ── What this rule does NOT do ─────────────────────────────────────────────
 *
 * It does not touch the door's queue. That queue lives in **IndexedDB**
 * (`src/lib/offline/`) — a different storage API, not a Cache Storage bucket —
 * and a Cache Storage purge cannot reach it. A scan taken offline and not yet
 * synced survives a release. This is asserted rather than reasoned about, and
 * observed at the door: `40-RELEASE-PASS.md` H3 step 5 checks a queued scan is
 * still present after a release, with the radio still off.
 *
 * It does not reload anything, and nothing in this phase does. D-40-11 is
 * absolute — a page that reloads itself during a scan tears down the camera,
 * the selected party and the in-memory undo list — and this mechanism honours
 * it BY CONSTRUCTION, which is the reason it was chosen. Nothing is to be
 * added on top of it.
 *
 * It does not shorten the 24 h window. It removes documents of the PREVIOUS
 * generation only; a document cached after this activation lives its normal
 * life under the `NetworkFirst` rules.
 *
 * It does not evict the precache. `cleanupOutdatedCaches` at :119 and
 * `handleActivate` already own that, and they are different mechanisms
 * (`serwist/dist/chunks/waitUntil.js:417-431` deletes whole caches by name).
 *
 * It does not weaken the `/events/*` `NetworkOnly` rule above. It only ever
 * REMOVES copies, which is the direction `venue-secrecy.md` wants.
 *
 * ── Two mechanisms refused, recorded here so they are not re-proposed ───────
 *
 * A refusal that lives only in a commit body re-proposes itself, because the
 * commit body is not where the next reader looks.
 *
 * **`deploymentId` is not set and must not be.** Next appends `?dpl=<id>` to
 * CSS chunk URLs as well as JS (`next/dist/client/app-webpack.js:12-18`), and
 * Serwist's precache strips only `utm_*` and `fbclid`
 * (`serwist/dist/chunks/printInstallDetails.js:1345-1348`), while the injected
 * manifest holds bare paths. Composed, every asset request would MISS the
 * precache and fall through to the network — at the door with the radio off,
 * no JavaScript at all, introduced by a setting added to improve release
 * safety. If a future phase wants it anyway, that is a Critical change to the
 * door and it must extend `precacheOptions.ignoreURLParametersMatching` with
 * `/^dpl$/` IN THE SAME COMMIT.
 *
 * **`navigateFallback` is refused too.** Precaching a document is forbidden by
 * `checkin-offline.md` — *zero HTML, zero routes, zero RSC payloads* — and it
 * would put a venue-bearing page at rest on a device, which `venue-secrecy.md`
 * has no rollback for.
 *
 * ── If a delete fails ──────────────────────────────────────────────────────
 *
 * There is no error tracking in this project, so a log is a place nobody
 * looks. The rejection is therefore not swallowed here — no `catch` pretends
 * it was handled — and its consequence is stated instead: a failed delete
 * leaves that bucket as it is today, which is the behaviour this listener
 * replaces, not a new hazard. It becomes observable in the one place it
 * matters, `40-RELEASE-PASS.md` H3 step 4, whose outcome is recorded verbatim.
 */
/**
 * `tsconfig.json` declares `lib: ["dom", "dom.iterable", "esnext"]` and NOT
 * `webworker`, so `ExtendableEvent` has no global type here and the activate
 * event arrives typed as a plain `Event`. The shape is declared locally and
 * narrowed at the one call site, deliberately: adding `webworker` to `lib`
 * would change the global types of all 181 `.tsx` files in the product to fix
 * one line in the service worker.
 */
type ExtendableActivateEvent = Event & { waitUntil(promise: Promise<unknown>): void };

self.addEventListener("activate", (event) => {
  (event as ExtendableActivateEvent).waitUntil(
    Promise.all(["pages", "pages-rsc", "pages-rsc-prefetch"].map((name) => caches.delete(name))),
  );
});
