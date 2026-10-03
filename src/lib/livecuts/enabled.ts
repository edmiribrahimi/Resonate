/**
 * The Music page switch, read in exactly one place.
 *
 * ── Why a `NEXT_PUBLIC_*` variable ───────────────────────────────────────────
 *
 * `getNavigation` also runs on the client (`AppNav.tsx` is a client
 * component), so the switch must exist in the browser bundle too. Next inlines
 * a public variable only when it is read by its LITERAL name —
 * `process.env.NEXT_PUBLIC_MUSIC_PAGE_ENABLED` — never through
 * `process.env[name]`. Because it is inlined at build time, changing it asks
 * for a redeploy: flipping it in the dashboard alone changes nothing.
 *
 * ── The only reader ──────────────────────────────────────────────────────────
 *
 * This module is the ONLY file under `src/` that names the variable. Every
 * other surface — the navigation, the `/music` page, the admin LiveCuts page,
 * the event list in admin — imports `musicPageEnabled()` from here. A second
 * reader would be a second switch, and two switches drift.
 *
 * ── Off by default, strict comparison ────────────────────────────────────────
 *
 * Only the exact string `"true"` turns it on (same rule as
 * `ORDER_RESUME_EMAIL_ENABLED` in `src/lib/tickets/order-resume.ts`): unset,
 * empty, `"1"`, `"TRUE"` are all off. Off means: no entry in the navigation,
 * `/music` answers 404, the admin LiveCuts page answers 404 and is hidden, and
 * no query to the LiveCut tables is made.
 */
export function musicPageEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MUSIC_PAGE_ENABLED === "true";
}
