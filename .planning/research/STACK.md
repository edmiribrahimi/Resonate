# Stack Research: v1.5 — Platform Layout, Access Model & Door Fixes

**Domain:** Design-system pass + three-tier responsive layout + first Realtime use + Postgres capability model, on a shipped Next.js 16 / React 19 / Supabase / Tailwind 4 PWA
**Researched:** 2026-08-05
**Confidence:** HIGH (Context7 + official docs + installed-source inspection + registry verification)

**Verdict in one line: this milestone needs zero new npm packages. It needs two version bumps, two `next/font` calls, one publication migration, and a decision about Orbitron.**

---

## Baseline — what is actually installed today

Read from `node_modules`, not from `package.json` carets.

| Package | Installed | Latest published | Gap |
|---|---|---|---|
| `next` | 16.1.6 | 16.3.0 | 2 minors — out of scope for this milestone |
| `react` / `react-dom` | 19.2.3 | 19.2.8 | patch — out of scope |
| `tailwindcss` | **4.2.1** | **4.3.3** | one minor — **recommended bump** |
| `@tailwindcss/postcss` | **4.2.1** | **4.3.3** | must move in lockstep |
| `@supabase/supabase-js` | **2.97.0** | **2.112.1** | 15 minors — **recommended bump** |
| `@supabase/realtime-js` | 2.97.0 (transitive) | 2.112.1 | moves with the above |
| `@supabase/ssr` | 0.8.0 | — | unchanged |
| `@serwist/next` / `serwist` | 9.5.6 | — | **do not touch** |
| `idb` | 8.0.3 | — | unchanged |
| `motion` | 12.35.2 | — | unchanged |

Codebase facts that drive the recommendations below:

- `src/components/ui/` contains **3 files** (`AutocompleteInput`, `Icons`, `Skeleton`). There is no primitive layer.
- Breakpoint prefixes across all `.tsx`: `sm:` ×46, `md:` ×1, `lg:` ×6, `xl:` ×0, `2xl:` ×0. The app is effectively single-tier.
- **15 files** build an overlay with `fixed inset-0`; only **2** files handle `Escape` anywhere.
- **3 files already use the native `<dialog>` + `showModal()` pattern** (`CreateVenueModal`, `CreateArtistModal`, `Lightbox`). The correct pattern is already in the repo — it is just not extracted.
- **6 files** render a `<table>`; all are read-only display tables. Pagination is already server-side (cursor-based, shipped v1.2).
- There is **no `cn()` helper and no `clsx`**. 65 `className={\`…\`}` template literals.
- `grep -rn "realtime\|\.channel("` over `src/` returns **nothing**. Realtime is genuinely unused.
- `src/app/globals.css` already uses the correct v4 shape: raw values in `:root`, mapped through `@theme inline`, custom utilities via `@utility`. **The token architecture is already right. It only needs extending.**

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|---|---|---|---|
| `tailwindcss` + `@tailwindcss/postcss` | **4.2.1 → 4.3.3** | Design tokens, three-tier layout, container queries | 4.3.3 fixes the default `--font-sans` stack to use explicit platform fonts instead of bare `system-ui`/`ui-sans-serif` (PR #20318). This milestone's interface face *is* the default sans stack — taking the fix is the cheapest way to get a correct one. 4.3.0 also adds `@container-size`, `scrollbar-*`, `scrollbar-gutter-*`, `zoom-*` and `tab-*` utilities, and stacked/compound `@variant`. `scrollbar-gutter-*` matters the moment desktop panes appear. Both packages must be the same version. |
| `@supabase/supabase-js` | **2.97.0 → 2.112.1** | Realtime subscriptions (new), everything else (unchanged) | Four realtime fixes landed after 2.97.0 that bear directly on this milestone's gates — see the table below. This is a version bump on an existing dependency, not a new dependency. |
| `next/font/google` | bundled with `next@16.1.6` | Anton (display) + Space Mono (data) | Ships inside Next. Self-hosts the files at build time, emits `@font-face` with metric-adjusted fallbacks, and removes the request to `fonts.gstatic.com` at runtime. **Zero packages added.** |
| Native `<dialog>` + `showModal()` | platform | Modal primitive | Baseline *widely available* since March 2022 (MDN). Gives top-layer stacking, focus trap, `Escape`, `::backdrop` and inert-background for free — all four of which 13 of the 15 current overlays lack. Already proven in 3 files in this repo. |
| Postgres enums + tables + `SECURITY DEFINER` functions + RLS | Postgres 15+ (Supabase) | Capability model | The security boundary in this project is RLS (project principle #2). Any JS authorization library sits on the wrong side of that boundary. Detail in *Permission layer* below. |

**Why the supabase-js bump is not cosmetic**, from the published changelog:

| Version | Change | Why it matters here |
|---|---|---|
| 2.103.x | `realtime:` guard `sessionStorage` access in restricted-storage browsers (#2339) | The app is an installed PWA used on staff phones. iOS restricted-storage modes are exactly the environment 2.97.0 can throw in. |
| 2.105.4 | `realtime:` surface a real `Error` on transport-level `CHANNEL_ERROR` (#2299) | On 2.97.0 a transport failure reaches your callback as a stringified blob. **This is the zero-silent-failures gate**: you cannot log a distinguishable category from what 2.97.0 hands you. |
| 2.109.0 | `realtime:` postgres_changes filter builder, new operators, and **column `select`** (#2463) | `select: ['id','checked_in_at']` means the door device receives only the columns it caches instead of every column of every ticket row. Smaller payloads on a bad network, and less attendee PII crossing the socket than necessary. |
| 2.110.7 / 2.112.1 | `realtime:` set auth on `INITIAL_SESSION`; `setAuth` no longer disables token refresh (#2531, #2592) | Both are auth-token-on-socket bugs. RLS on realtime is enforced from that token. On 2.97.0 a long-lived door session can end up subscribed with a token the client stopped refreshing. |

⚠️ **2.110.0 dropped Node.js 20 support** (#2482). Confirm the Vercel project's Node.js runtime is 22 or 24 *before* the bump, not after a failed deploy.

### Supporting Libraries

**None.** That is the finding, not an omission.

| Candidate | Verdict | Reasoning |
|---|---|---|
| `clsx` / `tailwind-merge` / `class-variance-authority` | **Write a 6-line local `cn()`** | With hand-rolled primitives you own the variant maps, so there is no class conflict to resolve — `tailwind-merge`'s entire job. `cva` is a typed lookup table you can express as a `Record<Variant, string>`. Ship `src/lib/cn.ts` returning `args.filter(Boolean).join(' ')`. **Trip-wire for reconsidering:** the first time a *consumer* passes overriding utility classes into a primitive and expects last-wins, add `tailwind-merge` (3.6.0) and nothing else. Not before. |
| `@tanstack/react-table` (9.0.0) | **No** | 6 tables, all read-only, all server-paginated already. TanStack Table earns its weight at client-side sorting + filtering + column visibility + virtualisation. None of that is in scope. |
| A realtime-sync helper / React Query / SWR | **No** | `src/lib/offline/checkin-store.ts` + `sync-manager.ts` already own the cache and the queue. A second cache layer would create two answers to "is this ticket checked in?" — at the door, on the same screen. |

### Development Tools

| Tool | Purpose | Notes |
|---|---|---|
| `npm run build` | Only verification gate that exists | `next build` runs the typecheck. There is no test runner for the product. Nothing in this milestone changes that. |
| `npm run verify:persona` | Persona coherence | Required if `.claude/**` or `CLAUDE.md` is touched during the milestone. |
| Supabase Dashboard → Database → Publications | Enabling Realtime per table | Realtime replication is **off by default**. Prefer the SQL form in a migration so it is reviewable (see below). |
| Supabase Dashboard → Authentication → Hooks | Custom Access Token Hook | Only needed if the general role goes into the JWT. See *Permission layer*. |

---

## Installation

```bash
# Version bumps on existing dependencies — no new packages
npm install @supabase/supabase-js@^2.112.1
npm install -D tailwindcss@^4.3.3 @tailwindcss/postcss@^4.3.3

# Fonts: nothing to install. next/font is part of next.
```

Migration required for Realtime (this is the step everyone forgets — the subscription
will connect, report `SUBSCRIBED`, and silently never fire):

```sql
-- supabase/migrations/<ts>_enable_realtime_for_door.sql
alter publication supabase_realtime add table public.tickets;
-- add only the tables the door actually caches; every table in the
-- publication costs WAL decoding work on every write, forever.
```

---

## Tailwind v4 token architecture — what to do, and what changed vs v3

### The pattern already in the repo is the correct one

```css
@import "tailwindcss";

:root {                      /* raw values live here */
  --background: #0a0a0a;
}

@theme inline {              /* mapped into Tailwind's namespaces here */
  --color-background: var(--background);
}
```

Keep this shape. Three rules govern which `@theme` flavour to use:

| Flavour | Use when | Consequence if you get it wrong |
|---|---|---|
| `@theme inline` | The value **references another variable** — every colour above, and **every `next/font` variable** | Without `inline`, `var(--font-display)` is resolved *where `--font-display` is defined* (`:root`), not where it is used. If the font variable is set on a nested element the type silently falls back. This is the documented failure mode. |
| `@theme` (plain) | Literal values with no indirection — `--breakpoint-*`, `--radius-*`, `--spacing` | Harmless either way, but `inline` loses the runtime-overridable CSS variable. |
| `@theme static` | Tokens consumed **only from JavaScript**, never as a utility class | **This is a real trap in this repo.** Tailwind only emits variables it sees used. Recharts takes colours as JS string props (`fill`, `stroke`), so a chart palette declared in plain `@theme` is never scanned, never emitted, and `getComputedStyle` returns empty at runtime. Declare the chart palette under `@theme static`. |

### Namespaces this milestone will use

| Namespace | Generates | Note for v1.5 |
|---|---|---|
| `--color-*` | `bg-*`, `text-*`, `border-*` | Brand palette. Use `oklch()` — it is what Tailwind's own defaults use and it interpolates correctly for opacity modifiers. |
| `--font-*` | `font-*` | `--font-display` (Anton), `--font-mono` (Space Mono), and **leave `--font-sans` alone** — see below. |
| `--text-*` | `text-xl` etc. | Supports paired sub-variables: `--text-hero--line-height`, `--text-hero--letter-spacing`, `--text-hero--font-weight`. |
| `--tracking-*`, `--leading-*` | `tracking-*`, `leading-*` | Anton at display sizes needs negative tracking; encode it as a token, not as a per-heading arbitrary value. |
| `--radius-*`, `--shadow-*` | `rounded-*`, `shadow-*` | The existing `glow-accent` `@utility` blocks should become `--shadow-glow` / `--shadow-glow-strong` tokens so they respond to the palette. |
| `--spacing` | the whole spacing scale | A single root value; every `p-4`, `gap-6`, `max-h-16` derives from it via `calc()`. |
| `--breakpoint-*` | `sm:` … `2xl:` variants | **Do not add any.** See below. |
| `--container-*` | `@sm:` … container-query variants **and `max-w-*`** | ⚠️ Overriding `--container-md` also changes `max-w-md`. One namespace, two consumers. |
| `--ease-*`, `--animate-*` | `ease-*`, `animate-*` | `@keyframes` may be nested inside `@theme` alongside its `--animate-*` variable; keyframes defined *outside* `@theme` are always emitted. The existing `flash-in` keyframe sits outside — correct, since the scanner cannot see how the scanner flash uses it. |

### Fonts in `@theme inline` — including the one you should not define

```css
@theme inline {
  --font-display: var(--font-anton);       /* from next/font */
  --font-mono:    var(--font-space-mono);  /* from next/font */
  /* --font-sans:  deliberately NOT redefined */
}
```

The third face the milestone asks for — "a system-ui sans for interface text" — **already exists**. Tailwind v4's default `--font-sans` *is* a platform stack, and 4.3.3 improved it specifically so it respects the page's `lang` attribute on Windows instead of leaning on bare `system-ui`. Hand-rolling a stack in 2026 means shipping a worse version of a thing you already have and maintaining it forever.

The corresponding action is a **removal**: `src/app/globals.css` currently forces `font-family: var(--font-orbitron), system-ui, …` on `body`. Delete that declaration and let `font-sans` be the default.

### Three tiers: use the defaults, the gap is usage not configuration

Tailwind v4 defaults, verified:

| Prefix | Min width | Maps to |
|---|---|---|
| `sm` | 40rem / 640px | large phone landscape |
| `md` | 48rem / 768px | **tablet** |
| `lg` | 64rem / 1024px | **desktop** |
| `xl` | 80rem / 1280px | wide desktop |
| `2xl` | 96rem / 1536px | — |

The repo has 46 `sm:`, 1 `md:`, 6 `lg:`, 0 `xl:`. That is not a configuration problem, so **do not define custom breakpoints**. Adding `--breakpoint-tablet` / `--breakpoint-desktop` would give the team new names for the same numbers plus a translation step in every review. If a custom breakpoint is ever genuinely needed, it must be declared in `rem` — mixing units breaks Tailwind's sort order and produces breakpoint classes that override each other in the wrong direction.

### Prefer container queries for the 8 primitives

Container queries are **core in v4** — the `@tailwindcss/container-queries` plugin is a v3 artefact and must not be installed.

```html
<div class="@container">
  <article class="flex flex-col @md:flex-row">…</article>
</div>
```

A Card that must survive a one-column phone stack, a two-column tablet grid and a three-column desktop grid should query *the space it was given*, not the viewport. Viewport queries make the card wrong in exactly the case this milestone introduces: a narrow desktop side panel. Default container sizes run `@3xs` (16rem) to `@7xl` (80rem); `@max-*` and stacked ranges (`@sm:@max-md:`) are available, as are named containers (`@container/main` → `@sm/main:`).

### v3 idioms that are now wrong

| v3 | v4 | Status in this repo |
|---|---|---|
| `tailwind.config.js` + `theme.extend` | `@theme` in CSS | No config file exists. Correct. |
| `content: [...]` globs | automatic source detection + `@source` | Correct. |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Correct. |
| `@layer utilities { .foo {} }` | `@utility foo {}` | Already uses `@utility`. Correct. |
| `theme('colors.x')` in CSS | `var(--color-x)` | N/A. |
| `@tailwindcss/container-queries` plugin | core | Not installed. Keep it that way. |
| `screens` in JS config | `--breakpoint-*` | N/A. |

---

## `next/font` with Anton + Space Mono

### Both faces are static, not variable — `weight` is mandatory

Verified against the Google Fonts CSS API on 2026-08-05:

| Face | Weights | Styles | Subsets offered | Role |
|---|---|---|---|---|
| **Anton** | `400` only | normal | latin, latin-ext, vietnamese | display |
| **Space Mono** | `400`, `700` | normal + italic | latin, latin-ext, vietnamese | data / numeric |

Neither is a variable font, so `next/font/google` **requires** an explicit `weight`. Omitting it is a build-time error, not a runtime fallback.

```tsx
// src/app/layout.tsx
import { Anton, Space_Mono } from "next/font/google";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-anton",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

// <html className={`${anton.variable} ${spaceMono.variable}`}>
```

### `display` strategy and layout shift

`display: 'swap'` is the next/font default and is the right choice here — but it is **not** the lever that controls layout shift.

The lever is **`adjustFontFallback`**, which defaults to `true` for `next/font/google`. It generates a synthetic `@font-face` for the fallback with `ascent-override`, `descent-override`, `line-gap-override` and `size-adjust` derived from the real face's metrics, so the fallback occupies close to the same box. Leave it at `true`. **Do not set `adjustFontFallback: false`.**

Anton is the case where this matters most: it is a heavy condensed grotesque whose metrics are nothing like Arial's, so an unadjusted swap on a large heading moves everything below it.

Rejected alternatives, with reasons:

- `display: 'optional'` — on a slow first load the brand display face simply never renders. For a face that *is* the brand identity, silently not showing it is worse than a corrected swap.
- `display: 'block'` — invisible headings for up to 3s. On a phone at the door this reads as a broken app.
- `preload: false` — `preload` defaults to `true` whenever `subsets` is given, which is what you want for two faces that appear above the fold on every surface. Serwist precaches the emitted `/_next/static/media/*.woff2` on subsequent visits, so the cost is a first-visit cost only. Measure before changing it.

### ⚠️ Subset trap specific to this project — the reversed `ɘ`

`subsets: ['latin']` covers `U+0000–00FF`, which includes every accented character Italian venue names and words need (`à è é ì ò ù`). Correct default for an English-only UI.

But the wordmark glyph **`ɘ` (U+0258, LATIN SMALL LETTER REVERSED E) is *not* in the `latin` subset** — it falls in `latin-ext` (`U+0100–02BA`). Today that is safe, because per the brand rules the reversed e appears only in the logo (an image asset) and in `metadata.title` (rendered by browser chrome, not by a webfont).

**The moment any heading renders `re:sonatɘ` as live text in Anton or Space Mono, that single glyph silently falls back to a different typeface mid-word** — the ugliest possible failure for a wordmark. If that happens, add `subsets: ['latin', 'latin-ext']` to the affected face. Flag this for whichever phase touches headings.

### The Orbitron decision — must be made, not drifted into

`.planning/PROJECT.md` still lists **"Font: Orbitron — Google Font, must be applied globally"** under **Constraints**, and `layout.tsx` loads it and `globals.css` forces it on `body`. This milestone introduces Anton + Space Mono + system sans, which is a three-face system with no slot for Orbitron.

Two coherent outcomes; pick one explicitly:

1. **Retire Orbitron.** Remove the `next/font` call, remove the `body` font-family, and **strike the constraint from `PROJECT.md`** in the same commit. Leaving a dead constraint in the project charter is how a future milestone re-introduces it.
2. **Keep Orbitron** for one named role (e.g. the nav wordmark only) — then it is a fourth font on the wire, and that cost should be stated rather than inherited.

Silently leaving the import in place while nothing uses it is the failure mode: a preloaded woff2 downloaded on every first visit for zero rendered glyphs.

---

## Supabase Realtime — current API, and what it does not promise

### The API, verified against current docs (2026-08-05)

```ts
const channel = supabase
  .channel(`party:${partyId}:attendees`)      // any string except 'realtime'
  .on(
    "postgres_changes",
    {
      event: "*",                              // INSERT | UPDATE | DELETE | *
      schema: "public",
      table: "tickets",
      filter: `party_id=eq.${partyId}`,        // evaluated server-side
      select: ["id", "checked_in", "checked_in_at"], // ≥ 2.109.0
    },
    (payload) => { /* … */ }
  )
  .subscribe((status, err) => { /* SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT | CLOSED */ });
```

Confirmed from the installed source (`REALTIME_SUBSCRIBE_STATES` in `RealtimeChannel.js`): the four callback statuses are exactly `SUBSCRIBED`, `TIMED_OUT`, `CLOSED`, `CHANNEL_ERROR`. **All four must be handled and logged with distinguishable categories** — this is the zero-silent-failures gate applied to a socket. `CHANNEL_ERROR` also fires with a specific `Error` when server and client `postgres_changes` bindings mismatch, which is what a stale publication looks like from the client.

New in **2.109.0** and worth taking: `postgresChangesFilter()`, a typed builder that handles operators, `not.`, `AND` composition and PostgREST-style quoting of reserved characters (`,` `(` `)` `"` `\`).

```ts
import { postgresChangesFilter } from "@supabase/supabase-js";
const filter = postgresChangesFilter().eq("party_id", partyId).is("voided_at", null);
```

Setup requirements, in order:

1. Table added to the `supabase_realtime` publication (migration above). **Off by default.**
2. An RLS `SELECT` policy that lets the subscribing role read the row. Realtime authorises **per subscriber, per event**, using that policy.
3. Bindings declared **before** `.subscribe()` — since 2.100.0 the client blocks adding a `postgres_changes` listener after joining.
4. `replica identity full` on the table **only if** you need `payload.old` on UPDATE/DELETE. It costs WAL volume on every write; do not set it reflexively.

### How RLS applies — and the two places it does not

- Every event is authorised against every subscriber individually. One row change with N subscribers = N authorization checks. Keep the policy cheap and indexed.
- **RLS is not applied to `DELETE` events** — Postgres cannot verify access to a row that no longer exists. With RLS on and `replica identity full`, the `old` record on a delete contains **only the primary key**.
- **`DELETE` events cannot be filtered** at all. A `filter:` on a channel does not constrain deletes.

Neither is a blocker for the door — check-in is an UPDATE, and a refunded ticket is an UPDATE, not a DELETE — but both must be known before someone designs a "ticket removed" path around a delete event.

### What the client does **not** guarantee

This is the part that decides the architecture, so it is stated plainly:

- **Events that occur while the socket is down are gone.** `postgres_changes` has no replay, no cursor, no sequence number. On reconnect the client rejoins the channel and starts receiving *new* events. Nothing tells you what you missed, and nothing tells you that you missed anything.
- **Reconnection is automatic but lossy.** Verified from `RealtimeClient.js`: heartbeat on an interval, stepped-backoff reconnect (`reconnectAfterMs`), `DEFAULT_TIMEOUT` 10 000 ms, and an outbound push buffer capped at `MAX_PUSH_BUFFER_SIZE = 100`. Rejoin restores the *subscription*, not the *history*.
- **`SUBSCRIBED` means "the channel joined"**, not "the cache is correct".
- Free-plan ceilings (documented): 200 concurrent connections, 100 messages/sec, 100 channel joins/sec, 100 channels per connection, 1 024 KB postgres-changes payload. Orders of magnitude above a staff-sized door.

### Recommendation: `postgres_changes` + authoritative refetch on every `SUBSCRIBED`

**Do not make the event stream load-bearing.** Treat a realtime event as a *hint that the cache is stale*, and make the IndexedDB store correct by refetching:

```
on SUBSCRIBED (first join AND every rejoin) → full refetch of the party's
                                              attendee set into IndexedDB
on postgres_changes event                   → patch the single cached row
on CHANNEL_ERROR / TIMED_OUT / CLOSED       → log a distinct category,
                                              surface the degraded state
                                              in the door UI, keep scanning
                                              from cache
```

Because a rejoin always triggers a refetch, "missed events while disconnected" stops being a correctness question and becomes a latency question. That is the property the door needs — and it is the property `postgres_changes` alone cannot give you.

**Why not Broadcast from Database**, even though Supabase's own docs call it "the recommended method for scalability and security":

| | `postgres_changes` | Broadcast from Database |
|---|---|---|
| Setup | publication + RLS SELECT policy | trigger fn + trigger + `realtime.messages` RLS policy + `setAuth()` + private channel |
| New DB surface | none | a `SECURITY DEFINER` trigger function per table |
| Replay after a network drop | none | `broadcast.replay { since, limit }` — **but ≤ 25 messages**, 72 h retention, ≥ supabase-js 2.74.0 |
| Scaling ceiling | ~3 000 concurrent subscribers (Supabase's own stated threshold) | far higher |
| Fit here | ~5–10 staff devices per night | solving a problem this project does not have |

Broadcast's one genuine advantage — replay — is capped at **25 messages**. A party where 200 people check in produces far more than 25 events during a five-minute network outage, so replay would *partially* fill the gap and leave the cache confidently wrong. The refetch fills it completely. Broadcast's scaling advantage is ~3 orders of magnitude beyond this project's load.

Migrating later is a server-side change (add the trigger, flip `config.private`, swap `.on('postgres_changes')` for `.on('broadcast')`) and does not disturb the offline store. The door principle applies to the choice itself: **when in doubt, admit and record** — the refetch is the recording, not the socket.

### React integration notes

- Subscribe in a `useEffect` guarded by `channelRef.current?.state === 'subscribed'`. Under React 19 Strict Mode the effect runs twice in dev; without the guard you get duplicate channels and duplicate handlers.
- Always `supabase.removeChannel(channel)` in cleanup and null the ref.
- Do not open one channel per row. Open one channel per party, filtered server-side.

---

## Permission layer — plain Postgres, no library

**Recommendation: no authorization library. Enums + tables + `SECURITY DEFINER` functions + RLS.**

The reason is structural, not a matter of taste. This project's own principle #2 says the middleware is UX and RLS is the security boundary. Every JS authorization library — CASL, Casbin, Oso, Permit.io — evaluates policy **in the application process**, which is the side of the boundary that already has `src/lib/rbac/roles.ts` doing UX-level gating in ~100 lines. Adding one would produce a second policy definition that has to be kept in sync with the RLS policies by hand, forever, with no test runner to catch the drift. That is a new class of access bug in exchange for a nicer API on the side that was never the boundary.

### Shape

Following Supabase's documented RBAC pattern:

```sql
create type public.app_role       as enum (...);   -- named, general capability
create type public.app_permission as enum (...);   -- verbs

create table public.user_roles       (user_id uuid, role app_role,       unique (user_id, role));
create table public.role_permissions (role app_role, permission app_permission, unique (role, permission));

-- per-night assignments: local to one night, NOT a role
create table public.party_assignments (
  user_id uuid, party_id uuid, assignment app_assignment,
  unique (user_id, party_id, assignment)
);
create index on public.party_assignments (user_id, party_id);
```

### ⚠️ The critical split: general role MAY be a JWT claim; per-night assignments MUST NOT

A Custom Access Token Hook writes a claim into the JWT **at token issue**. The claim then changes only when the access token refreshes.

Concretely: a staff member logs in at 21:00. At 23:00 an organizer assigns them to the door for that night. Their JWT still says otherwise until it refreshes. **The result is a staff member standing at the entrance, holding a phone that says they are not authorised, in front of a queue.** That is the exact asymmetry the door principle forbids.

So:

- **General role** (organizer, staff, member) — changes rarely, safe in the JWT via the hook, read in policies as `(select auth.jwt() ->> 'user_role')`.
- **Per-night assignment** — changes during the night, **must be read from `party_assignments` at query time**, never from a claim. This costs one indexed lookup per policy evaluation and buys correctness at the only moment that matters.
- **Public credits** (dj, photographer) live in their own table and appear in **no** policy. A credit is something the audience reads; it is not a capability. Keeping them in the same table as assignments is how a photographer ends up able to check people in.

### RLS performance rules, with measured numbers from Supabase's own benchmark

| Rule | Before | After |
|---|---|---|
| Wrap function calls so the planner builds an `initPlan` and caches the result: `(select authorize('x'))` not `authorize('x')` | 11 000 ms | **7 ms** |
| Same for a role lookup: `(select has_role()) = role` | 178 000 ms | **12 ms** |
| Index every non-PK column used in a policy | 171 ms | **< 0.1 ms** |
| Add `to authenticated` to every policy so `anon` is rejected before the predicate runs | 170 ms | **< 0.1 ms** |
| Invert joins: `party_id in (select party_id from … where user_id = auth.uid())`, never `auth.uid() in (select … where … = table.party_id)` | 9 000 ms | **20 ms** |

Declare helper functions `language plpgsql stable security definer set search_path = ''`. The empty `search_path` is not optional — a `SECURITY DEFINER` function without it is a privilege-escalation vector. And remember that any function usable in a policy is also **callable from the API**; if its result would leak information, put it in a non-exposed schema.

The realtime subscription inherits all of this: the door device receives an event only if the same `SELECT` policy admits it. **One policy, two consumers.** Get it wrong and the symptom is a subscription that connects cleanly and never fires.

---

## Alternatives Considered

| Recommended | Alternative | When the alternative would win |
|---|---|---|
| Native `<dialog>` | Radix (`radix-ui` 1.6.7) | If the primitive set grew a **combobox, listbox, or menu with typeahead** — real WAI-ARIA state machines with roving tabindex and virtual focus that are genuinely hard to hand-roll. None of the 8 primitives is one. |
| Native `<dialog>` | Headless UI 2.2.10 | Same trigger, and it is Tailwind-Labs-adjacent so the styling story is smoother. Still a dependency for behaviour the platform ships. |
| Native `<dialog>` | Base UI 1.0.0-rc.0 | Not until it is out of release candidate. A pre-1.0 dependency in a code path used at the door is an unforced risk. |
| Native `<dialog>` | React Aria Components 1.20.0 | If a formal WCAG audit becomes a requirement. Heaviest of the four; earns it only under that constraint. |
| `postgres_changes` + refetch | Broadcast from Database | Above ~3 000 concurrent subscribers, or if a *complete* audit trail of changes had to survive a client outage without a refetch (and even then, 25-message replay does not deliver it). |
| Plain Postgres RLS | Permit.io / Oso Cloud | If authorization had to be shared across several services that are not all Postgres clients. There is one service. |
| Local `cn()` | `tailwind-merge` 3.6.0 | The first time a consumer overrides a primitive's classes and needs last-wins conflict resolution. |
| Tailwind default breakpoints | Custom `--breakpoint-*` | Only if a real device class sits between the defaults. `md`/`lg` already are tablet/desktop. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|---|---|---|
| **Any headless UI library** for these 8 primitives | 6 of the 8 (Card, Chip, Button, SectionHeader, EmptyState, StickyTabs) have **no interactive behaviour at all** — they are styled boxes. DataTable is 6 read-only, server-paginated tables. Only Modal has real a11y complexity, and the platform solves it. Importing a library to style a `<div>` is pure weight. | Native `<dialog>` for Modal; `position: sticky` + `role="tablist"` for StickyTabs; plain semantic markup for the rest. Extract the existing `CreateVenueModal` pattern into one `<Modal>` and migrate the 13 non-compliant overlays to it. |
| `@tanstack/react-table` 9.0.0 | Six read-only tables, already server-paginated. Its value is client-side sorting/filtering/virtualisation state. | `<table>` + `overflow-x-auto` on phone, full layout at `md:`+. |
| `class-variance-authority` / `clsx` / `tailwind-merge` | You own both sides of every primitive, so there are no class conflicts to merge and no untyped variant strings to validate. | `src/lib/cn.ts`, six lines. |
| **Any JS authorization library** (CASL / Casbin / Oso / Permit.io) | Enforces on the wrong side of the security boundary and creates a second source of truth that will drift from the RLS policies, in a repo with no test runner to catch it. | Postgres enums + `role_permissions` + `party_assignments` + `SECURITY DEFINER` + RLS. |
| `@supabase/supabase-js` **v3** (`3.0.0-next.29`) | Prerelease. Nothing in this milestone needs it. | `2.112.1` from the stable line. |
| `experimental.useOffline` / `cacheComponents` / `partialPrefetching` (Next 16) | The Next.js docs state verbatim: *"This feature is currently experimental and subject to change, it's not recommended for production."* It also does not do what this app needs — it retries RSC navigations and Server Actions; it has no opinion about an IndexedDB attendee cache. | `@serwist/next` 9.5.6 + `src/lib/offline/*`, already shipped and proven at the door in v1.4. Do not touch. |
| `@tailwindcss/container-queries` | v3 plugin. Container queries are **core** in v4. | `@container` / `@sm:` / `@max-md:` out of the box. |
| `@tailwindcss/turbopack` | Present only in Tailwind's **Unreleased** changelog section. | `@tailwindcss/postcss`, which is what the project already uses under `turbopack: {}`. |
| A `<link href="fonts.googleapis.com">` for the new faces | Breaks the PWA offline story, adds a third-party connection on every cold load, leaks visitor IPs to Google, and forfeits the metric-adjusted fallback that controls CLS. | `next/font/google`, which self-hosts at build time. |
| `adjustFontFallback: false` | Removes the `size-adjust`/`ascent-override` fallback — the single mechanism that keeps a heavy condensed display face from shifting the page on swap. | Leave it at its default `true`. |
| Leaving Orbitron loaded but unused | A preloaded woff2 fetched on every first visit for zero rendered glyphs, plus a stale **Constraint** in `PROJECT.md` that will resurrect it. | Decide: retire it *and* strike the constraint, or assign it one named role and state the cost. |
| `replica identity full` "just in case" | Costs WAL volume on every write to that table, forever. | Set it only on tables where a policy or handler genuinely needs `payload.old`. |
| Adding every table to `supabase_realtime` | Every table in the publication is decoded from WAL on every write. | Add only the tables the door caches. |

---

## Stack Patterns by Variant

**If a primitive has zero interactive behaviour** (Card, Chip, SectionHeader, EmptyState):
- Hand-roll it as a typed-props component over semantic markup.
- Drive every variant from `@theme` tokens, never from hard-coded hex or px.
- Use `@container` rather than viewport breakpoints, so the same component is correct in a phone stack and a desktop side panel.

**If a primitive is a modal or overlay** (Modal, and the 15 `fixed inset-0` sites):
- Native `<dialog>` + `showModal()` / `close()`. Copy the pattern already working in `CreateVenueModal`.
- Keep the existing z-index convention (`z-[60]` above the `z-50` MobileNav) for anything that cannot move to `<dialog>` — though `<dialog>` in the top layer sidesteps z-index entirely.
- Keep the bottom-sheet safe-area padding convention on phone.

**If a surface must stay usable offline** (door, scanner, attendee list):
- Realtime is an optimisation. The IndexedDB store is the source of truth for the scan decision.
- Every socket state transition gets a distinct log category and a visible degraded indicator. `CHANNEL_ERROR` must never be swallowed into the same message as `TIMED_OUT` — that is the newsletter anti-pattern recorded in `CONCERNS.md`, reproduced on a socket.
- Refetch on `SUBSCRIBED`, always, including rejoins.

**If a change touches roles, assignments, or policies:**
- Migration first, `src/types/database.ts` regenerated second, queries third.
- Every new policy carries `to authenticated` and wraps its function calls in `(select …)`.
- Manual verification procedure written out per role, since `npm run build` proves nothing about a policy.

---

## Version Compatibility

| Package A | Compatible with | Notes |
|---|---|---|
| `@supabase/supabase-js@2.112.1` | Node **≥ 22** | 2.110.0 dropped Node 20. **Check the Vercel Node.js runtime setting before bumping.** |
| `@supabase/supabase-js@2.112.1` | `@supabase/ssr@0.8.0` | No breaking change in the 2.x line; `ssr` wraps `createClient` and is unaffected. |
| `postgresChangesFilter()` + `select: [...]` | supabase-js **≥ 2.109.0** | Not present in the installed 2.97.0 — verified by grep over `node_modules`. |
| Broadcast replay (`broadcast.replay`) | supabase-js **≥ 2.74.0** | Already satisfied. Relevant only if the Broadcast path is ever taken. |
| `tailwindcss@4.3.3` | `@tailwindcss/postcss@4.3.3` | Must be the **same** version. Bump together or the build breaks. |
| `tailwindcss@4.3.3` | `next@16.1.6` with `turbopack: {}` | Runs through `@tailwindcss/postcss` today. Ignore `@tailwindcss/turbopack` until it ships. |
| `next/font/google` | `next@16.1.6` | Bundled. Fonts are fetched **at build time**, so the Vercel build needs network access to Google Fonts; this is already true for Orbitron. |
| Anton / Space Mono | `next/font/google` | Static faces — `weight` is **required**. Omitting it fails the build. |
| `@serwist/next@9.5.6` | `next@16.1.6` | Working. Out of scope. Do not upgrade opportunistically inside this milestone. |
| Realtime | RLS `SELECT` policies | The subscription is authorised by the same policy as the query. Changing one changes the other. |

---

## Open Questions for the Roadmap

1. **Orbitron** — retire, or keep for one named role? Requires striking or rewriting a **Constraint** in `PROJECT.md`, not just deleting an import.
2. **Which tables enter the `supabase_realtime` publication?** Should be the minimum set the door caches. Each addition is permanent WAL cost.
3. **Is the general role going into the JWT** via the Custom Access Token Hook, or read from a table like the assignments? The hook is faster in policies but adds a dashboard-configured dependency and a token-refresh latency. Per-night assignments are settled — table, not claim.
4. **Does the `ɘ` ever render as live text** in a display heading? If yes, `latin-ext` is required on that face.

---

## Sources

- `/websites/supabase` (Context7) — realtime `postgres_changes`, private channels, `realtime.broadcast_changes`, `realtime.send`, RLS on `realtime.messages` — **HIGH**
- `/websites/tailwindcss` (Context7) — `@theme`, `@theme inline`, `@theme static`, namespaces, `--breakpoint-*`, `--container-*`, font-feature/variation sub-variables — **HIGH**
- https://supabase.com/docs/guides/realtime/postgres-changes — filters, `postgresChangesFilter()`, column `select`, delete-event limitations, per-subscriber authorization, the ~3 000-subscriber threshold — **HIGH**
- https://supabase.com/docs/guides/realtime/subscribing-to-database-changes — Broadcast vs Postgres Changes, trigger + private-channel setup — **HIGH**
- https://supabase.com/docs/guides/realtime/broadcast — Broadcast Replay: `since`/`limit ≤ 25`, 72 h daily-partition retention, ≥ 2.74.0 — **HIGH**
- https://supabase.com/docs/guides/realtime/limits — per-plan connection, message, channel and payload ceilings — **HIGH**
- https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac — `app_role`/`app_permission`, `custom_access_token_hook`, `authorize()` — **HIGH**
- https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv (last edited 2026-07-07) — `initPlan` wrapping, indexing, `to authenticated`, join inversion, with measured timings — **HIGH**
- https://nextjs.org/docs/app/api-reference/components/font — `weight`, `subsets`, `display`, `preload`, `fallback`, `adjustFontFallback`, `variable`, Tailwind v4 `@theme inline` integration — **HIGH**
- https://nextjs.org/docs/app/guides/offline-support — `experimental.useOffline` explicitly not production-recommended — **HIGH**
- https://tailwindcss.com/docs/responsive-design — default breakpoint table, container queries, container size reference, `@container-size` — **HIGH**
- https://tailwindcss.com/docs/theme — namespace table, `inline`/`static` semantics, keyframes in `@theme` — **HIGH**
- https://raw.githubusercontent.com/supabase/supabase-js/master/CHANGELOG.md — 2.109.0 filter builder + `select`; 2.110.0 Node 20 drop; 2.105.4 real `Error` on `CHANNEL_ERROR`; 2.112.1 `setAuth` / token refresh — **HIGH**
- https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/CHANGELOG.md — 4.3.0 `@container-size` / `scrollbar-*` / `zoom-*` / `tab-*`; 4.3.3 explicit platform fonts in the default sans stack (#20318); `@tailwindcss/turbopack` still Unreleased — **HIGH**
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog — Baseline widely available since March 2022 — **HIGH**
- Google Fonts CSS API (`fonts.googleapis.com/css2`, queried 2026-08-05) — Anton weight 400 only; Space Mono 400/700 + italic; both latin / latin-ext / vietnamese; unicode-ranges confirming `U+0258` sits in latin-ext — **HIGH**
- npm registry (queried 2026-08-05) — `tailwindcss` 4.3.3, `@supabase/supabase-js` 2.112.1 (v3 at `3.0.0-next.29`), `next` 16.3.0, `radix-ui` 1.6.7, `@headlessui/react` 2.2.10, `@base-ui-components/react` 1.0.0-rc.0, `@ark-ui/react` 5.38.0, `react-aria-components` 1.20.0, `@tanstack/react-table` 9.0.0, `tailwind-merge` 3.6.0 — **HIGH**
- Installed source inspection — `node_modules/@supabase/realtime-js` (`REALTIME_SUBSCRIBE_STATES`, `DEFAULT_TIMEOUT` 10 000, `MAX_PUSH_BUFFER_SIZE` 100, stepped-backoff `reconnectAfterMs`); absence of `postgresChangesFilter` at 2.97.0 — **HIGH**
- Repo survey — breakpoint-prefix counts, 15 `fixed inset-0` sites vs 2 `Escape` handlers, 3 existing native-`<dialog>` implementations, 6 `<thead>` tables, absence of `clsx`/`cn`, absence of any `.channel(` call — **HIGH**

---
*Stack research for: v1.5 — Platform Layout, Access Model & Door Fixes*
*Researched: 2026-08-05*
