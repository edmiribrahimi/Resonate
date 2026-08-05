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
