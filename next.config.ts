import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
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
