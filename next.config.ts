import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
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
