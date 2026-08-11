import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Off, and this is a behaviour change rather than tidying. When on, a client
  // hook patches history.pushState/replaceState and posts each URL to a
  // dedicated worker, which writes STRAIGHT into caches.open("pages") — past
  // doorRuntimeCaching and defaultCache both, so even a route this repository
  // deliberately made NetworkOnly could acquire a document copy that way. And
  // `if (isPageCached) return;` means a document written under the old release
  // is NEVER rewritten: it is the second route to a document outliving the
  // stylesheet it names, which the activate purge in sw.ts closes on the first.
  // It was never a decision — the library default is false
  // (@serwist/next/dist/lib/types.d.ts) and, unlike its neighbour below, it
  // carried no written reason, which is the evidence it was inherited.
  // What it costs: documents reached only by client-side navigation are no
  // longer pre-warmed for offline. Small here — /events/* is already
  // NetworkOnly (sw.ts:110-113) and the door is warmed by an explicit online
  // visit (checkin-offline.md:57) — but real, and it belongs in the file.
  // Second-order effect: shouldBuildSWEntryWorker = cacheOnNavigation, so
  // public/swe-worker-*.js stops being generated and leaves the precache.
  cacheOnNavigation: false,
  // Deliberately false, not defaulted. On the door device a reload when the
  // signal returns tears down the camera stream, the selected party and the
  // in-memory undo list (ScannerClient's scanHistory) while entries are still
  // queued — and that undo list is the door's only correction mechanism.
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  typedRoutes: true,
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/eventi/:path*", destination: "/events/:path*", permanent: true },
      { source: "/registrati", destination: "/register", permanent: true },
      { source: "/presenze", destination: "/attendance", permanent: true },
      { source: "/galleria", destination: "/gallery", permanent: true },
    ];
  },
};

export default withSerwist(nextConfig);
