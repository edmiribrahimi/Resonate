import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { musicPageEnabled } from "@/lib/livecuts/enabled";

/**
 * The switch, read ABOVE the loading boundary — and that is the only reason
 * this file exists.
 *
 * `loading.tsx` wraps `page.tsx` in a Suspense boundary, so the response starts
 * streaming with status 200 before the page runs. A `notFound()` thrown from
 * the page then renders the 404 content under a 200 status (measured on the
 * laboratory on 2026-10-03: `NEXT_HTTP_ERROR_FALLBACK;404` in the body, `200`
 * on the wire). A layout renders outside that boundary, so the same call here
 * answers a real 404 before anything is streamed, and no query is made.
 *
 * The page keeps its own check as its first line: the two read the same
 * function (`musicPageEnabled`), so they cannot disagree.
 */
export default function MusicLayout({ children }: { children: ReactNode }) {
  if (!musicPageEnabled()) notFound();
  return children;
}
