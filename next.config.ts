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
  // The visual section publishes the capitolato's palette, and D-45-09 says it
  // READS those values from the token file instead of restating them — six
  // colours written twice are six colours that diverge, and
  // `verify:semantic-separation` check B forbids the second copy outright.
  //
  // So `src/lib/production/sections/tokens.ts` opens `src/app/globals.css` at
  // run time. A stylesheet is an input to the build, not an output of it, so
  // nothing would otherwise put it beside the server bundle: file tracing
  // follows imports, and this is a `readFileSync` of a path assembled from
  // `process.cwd()`. Naming it here is what makes the read succeed in
  // production rather than in development only.
  //
  // If this line is ever removed the failure is DECLARED — the reader returns
  // `token_file_unreadable` and the page prints it — because a palette that
  // silently came back empty would be a void nobody declared, on the one page
  // whose subject is that a void must declare itself.
  outputFileTracingIncludes: {
    "/admin/visual": ["./src/app/globals.css"],
  },
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
