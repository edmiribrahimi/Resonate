import posthog from "posthog-js";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    defaults: "2025-11-30",
    capture_pageview: "history_change",
    capture_pageleave: "if_capture_pageview",
    persistence: "localStorage+cookie",
  });
}
