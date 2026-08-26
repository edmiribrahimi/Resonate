/**
 * next-redirect.ts — where a `next` value is allowed to send somebody.
 *
 * ── Why this is a module, and why it is in `src/lib/routes/` ─────────────────
 *
 * Everything below **moved out of** `src/app/api/auth/callback/route.ts`, where
 * it had one caller. It now has two: that callback, and
 * `src/app/(auth)/login/page.tsx`, which until plan 37-12 wrote
 * `searchParams.get("next")` straight into `window.location.href` with no
 * validation at all — the twin of a defence this project already had.
 *
 * **It was moved rather than copied, and that is the entire reason this file
 * exists.** A second hand-written allow-list diverges from the first at the
 * first new address: somebody adds a path to one list, the other keeps
 * refusing it, and the two halves of the same product disagree about where a
 * person may land. The directory is the one `capability-routes.ts` already
 * established for "one declaration, several readers".
 *
 * ── What this module must NOT become ─────────────────────────────────────────
 *
 * Not `"use server"`, which publishes every export as an endpoint, and not
 * `import "server-only"`, which would make it unimportable from the login page
 * — a `"use client"` component. It is a pure function on a string; it reaches
 * no database, no session and no request, so a client bundle carrying it leaks
 * nothing. What it carries is the list of addresses the product already ships
 * in its own links, which is not a secret (`nextjs-architecture.md`, gate
 * *segreti nel bundle*).
 *
 * ── And what it is not ───────────────────────────────────────────────────────
 *
 * A destination filter, not an access control. Resolving to `/dashboard` says
 * the value was not on the list; it says nothing about whether the person may
 * read what is there. That is the RLS, as always (`access-gating.md`, gate
 * *RLS-e'-il-confine*).
 */

/** Where a `next` value that is not on the list below ends up. */
export const DEFAULT_NEXT = "/dashboard";

/**
 * The complete set of relative paths a `next` value may resolve to.
 *
 * ── Why this list exists at all ──────────────────────────────────────────────
 *
 * `next` arrives from a URL. It is attacker-controlled, and it is consumed
 * **after** `exchangeCodeForSession` — that is, after this request has minted a
 * session. An open redirect from an authenticated callback is not a cosmetic
 * defect: it is a phishing primitive aimed at exactly the people who hold the
 * most access, because the link that carries it is a link they were expecting.
 *
 * Concatenating with `origin` (what stood in the callback) prevents a jump to
 * another host, and that is genuinely most of the risk — but it is not
 * validation, it is an accident of string building, and phase 43 adds a
 * **second** parametric redirect: plan 43-11 aims an invitation here through
 * `generateLink`'s `redirectTo`. `access-gating.md`'s gate *redirect validato*
 * says every new parametric redirect uses an allow-list of relative paths, so
 * the pre-existing one stops being somebody else's problem the moment a second
 * one arrives.
 *
 * **The client-side twin had no such string building to hide behind.**
 * `window.location.href = nextUrl` navigates to whatever it is given, so on
 * that path an absolute URL was not "most of the risk avoided by accident": it
 * was the whole risk, measured with a real request in plan 37-12 and landing on
 * another origin one keystroke after the password.
 *
 * ── What is on the list, and why each entry ──────────────────────────────────
 *
 *   /dashboard          the default, and where every unrecognised value lands
 *   /set-password       what plan 43-04 built and what Reset Password now aims at
 *   /events/<slug>      produced by `?next=` on RsvpButton.tsx:35 and
 *                       TierSelection.tsx:224, forwarded through
 *                       register/page.tsx:45
 *   /events/<slug>/menu produced by GuestLoginBanner.tsx:42 and :138
 *
 * The slug charset is not a guess: `src/utils/slugify.ts:11-20` produces exactly
 * `[a-z0-9-]` and truncates at 80. Widening this pattern by hand would admit
 * path segments the product never generates.
 *
 * **Adding an entry is an access decision.** A pattern with a `.*` in it, or one
 * that does not anchor both ends, re-opens what this list closes.
 */
const NEXT_ALLOW_LIST: readonly RegExp[] = [
  /^\/dashboard$/,
  /^\/set-password$/,
  /^\/events\/[a-z0-9-]{1,80}$/,
  /^\/events\/[a-z0-9-]{1,80}\/menu$/,
  // ── Added 2026-08-26, closing blocker D7's second half ─────────────────────
  //
  // ⚠ **Adding these IS an access decision**, as the note above says, so here is
  // the reasoning rather than just the patterns.
  //
  // Until today `src/lib/supabase/middleware.ts` bounced an anonymous caller off
  // a protected address with `?redirect=`, which this file's reader never looks
  // at — so the destination was lost and everybody landed on `/dashboard`
  // (blocker D7). Aligning the name was only half the repair: with the list as
  // it stood, a caller bounced off `/admin/calendar` would have arrived with a
  // `next` this list refuses and landed on `/dashboard` anyway.
  //
  // **What the addition does and does not grant.** This is a destination filter,
  // not an access control — the sentence at the top of this file, and it matters
  // most here. Landing on `/admin/calendar` does not mean being admitted to it:
  // the page's own capability check and the RLS decide that, exactly as they did
  // before. What this list decides is only whether somebody who was already
  // going there gets taken back there after signing in.
  //
  // **Why the risk does not grow.** The dangerous shape of an open redirect is a
  // jump to another origin, and that is refused before the list is consulted —
  // no leading `/`, a `//`, a backslash, a scheme or a control character never
  // reaches these patterns. What remains is same-origin, which is the product's
  // own surface.
  //
  // **Anchored at both ends, with a charset and a depth, and no `.*`.** The
  // segment charset is the one the product generates: slugs from
  // `src/utils/slugify.ts` and uuids, both inside `[a-z0-9-]`. Four segments is
  // more than the deepest address the work surface has
  // (`/admin/events/<id>/media`) and far short of unbounded.
  /^\/membership-card$/,
  /^\/attendance$/,
  /^\/door$/,
  /^\/admin(?:\/[a-z0-9-]{1,64}){0,4}$/,
];

/**
 * The address prefixes an anonymous caller is bounced away from.
 *
 * ⚠ **Declared HERE, and imported by the middleware, so that the bouncer and
 * the allow-list cannot drift apart again.** They did drift, and the cost was
 * blocker D7: the middleware wrote a parameter name the reader did not read, and
 * nothing anywhere compared the two. `scripts/verify-routes.mjs` now asserts
 * that every prefix below resolves through {@link resolveNext} without being
 * substituted — so a sixth prefix added to this list without a matching pattern
 * above turns the gate red instead of silently sending that address's callers to
 * `/dashboard`.
 *
 * The order is the middleware's `startsWith` order and carries no meaning.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/membership-card",
  "/attendance",
  "/admin",
  "/door",
] as const;

/**
 * Resolve an inbound `next` to a path that is safe to put in a `Location`
 * header, and say whether a substitution happened.
 *
 * The guards below are redundant against the anchored patterns above — nothing
 * with a scheme, a backslash or a leading `//` can match them. They are written
 * out anyway, because they are what a future entry on that list is checked
 * against, and because each one names a concrete refusal:
 *
 *   `https://example.com`   an absolute URL — refused: no leading `/`
 *   `//example.com`         protocol-relative, the classic bypass — refused
 *   `%2F%2Fexample.com`     the same thing pre-encoded; `searchParams.get`
 *                           has already decoded it by the time it arrives here,
 *                           so it is refused by the same rule
 *   `/\example.com`         a backslash, which several browsers normalise to
 *                           `/` — refused
 *   `javascript:alert(1)`   a scheme — refused
 *   `/admin`                well-formed, same-origin, and simply not on the
 *                           list — refused, because an allow-list refuses by
 *                           default rather than by enumeration of what is bad
 *
 * Two of those six are no longer only reasoning. `https://example.org` and
 * `//example.org` were each put through a real sign-in on the login page before
 * this guard was applied to it (plan 37-12), and both ended the flow on
 * `https://example.org/`. The list above is what those two now meet.
 */
export function resolveNext(raw: string | null): {
  path: string;
  refused: boolean;
} {
  if (raw === null) return { path: DEFAULT_NEXT, refused: false };

  const wellFormed =
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.includes("\\") &&
    !raw.includes(":") &&
    // A CR, an LF or any other control character in a value bound for a
    // `Location` header is a response-splitting attempt. Written as escapes,
    // never as literal control bytes in this source file.
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(raw);

  if (wellFormed && NEXT_ALLOW_LIST.some((pattern) => pattern.test(raw))) {
    return { path: raw, refused: false };
  }

  return { path: DEFAULT_NEXT, refused: true };
}
