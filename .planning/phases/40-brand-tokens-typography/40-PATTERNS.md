# Phase 40: Brand Tokens & Typography — Pattern Map

**Mapped:** 2026-08-11
**Files analysed:** 10 (7 modified, 3 new)
**Analogs found:** 10 / 10
**Analogs read in full or in targeted ranges:** 5 —
`scripts/verify-media-strip.mjs` (the model), `src/app/globals.css`,
`src/app/layout.tsx`, `src/app/sw.ts`, `next.config.ts`

> **Repository safety.** This document names only colours, filenames and code
> already public in this tree before today. No venue, no unannounced date, no
> line-up, no personal name. `.planning/` is tracked and this repository is
> PUBLIC.

---

## 0. Three corrections to the target list, made by reading the tree

The brief asked that each named target be verified rather than trusted. Three
did not survive contact with the repo, and each would have cost the planner a
task.

| # | As given | As measured | Why it matters |
|---|---|---|---|
| **C1** | `src/app/(members)/.../menu/page.tsx` | **`src/app/(public)/events/[slug]/menu/page.tsx`** — verified by reading it; the second `next/font` call is at `:2` and `:21` | The menu page is a **public** route, not a members one. A plan step written against `(members)` finds no file, and the route group is not cosmetic: `(public)` is why the page has a guest token path at all |
| **C2** | *"Seven `scripts/verify-*.mjs` already exist"* (RESEARCH §7, §11) | **Seven `verify-*` scripts exist, but only six are `.mjs`.** `scripts/verify-organizer-redirects.sh` is **bash**, wired as `"verify:redirects": "bash scripts/verify-organizer-redirects.sh"` | The three new gates must be `.mjs`, Node built-ins only. A planner counting seven `.mjs` precedents could reasonably conclude either form is house style. It is not: `.mjs` is, six times to one |
| **C3** | *"a correct `next/font` call **with** `variable` from this codebase if one exists, and say so plainly if none does"* | **One exists**, and it is in the very file being modified: `src/app/layout.tsx:8-11` + `:55`. See §2.2 | The plan does not need to invent the shape. It needs to make the Inter call **symmetrical** with the Orbitron call three lines above it |

**A fourth item, not a correction but a finding the planner should carry:**
`src/app/(admin)/admin/formats/ColorSwatchPicker.tsx:105-111` declares the
catalogue's neutral swatch as `#8C82A6` — **the same value as `--soy`**, the
token D-40-06 keeps out because its meaning *«must be asked, not deduced»*. This
does not answer the open question and must not be read as answering it: the
catalogue's neutral is a **format identification colour stored on a row**, and
the artifact's `--soy` is a stylesheet token whose role is unknown. But the
coincidence is now on the record, it is one line for the owner rather than a
research task, and — load-bearing for this phase — **it means the new
verify scripts will see brand hexes in that file and must not fail on them.**
See §4.3.

---

## 1. File Classification

| File | New/Mod | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|---|
| `src/app/globals.css` | mod | config — the token layer | build-time transform (PostCSS → one CSS chunk) | **itself**, `globals.css:3-21` | exact (in-file) |
| `src/app/layout.tsx` | mod | root layout / document shell | request-response (server-rendered head + html class) | **itself**, `layout.tsx:3,8-11,55` | exact (in-file) |
| `src/app/(public)/events/[slug]/menu/page.tsx` | mod (deletion) | route page | request-response | `src/app/sw.ts:99-109`; `.claude/rules/nextjs-architecture.md` §*Il gruppo non e' piu' il pubblico* | convention-match |
| `public/manifest.json` | mod | config — OS-read static asset | file-I/O, read by the platform at install | `src/app/layout.tsx:13-22` (brand spelling with its rule) | partial — JSON carries no comment |
| `next.config.ts` | mod | config — build/SW wiring | build-time | **itself**, `next.config.ts:8-12` (`reloadOnOnline`) | exact (in-file, adjacent line) |
| `src/app/sw.ts` | mod | service worker | event-driven (SW lifecycle) | **itself**, `sw.ts:49-113` + `:116-128` | exact (in-file) |
| `scripts/verify-tokens.mjs` | **new** | verification script | batch file-I/O, walk + text match | `scripts/verify-media-strip.mjs` | exact |
| `scripts/verify-semantic-separation.mjs` | **new** | verification script | batch file-I/O, walk + text match | `scripts/verify-media-strip.mjs` | exact |
| `scripts/verify-sunset-gradient.mjs` | **new** | verification script | batch file-I/O, walk + text match | `scripts/verify-media-strip.mjs` | exact |
| `package.json` | mod | config — script registry | — | **itself**, the seven `verify:*` entries | exact (in-file) |

**Not in the file list, deliberately.** `ColorSwatchPicker.tsx` is named in
CONTEXT as *"the one place they must stop being a local literal"*, but UI-SPEC
rule 4 and §7 both keep it exactly as it is: its hexes are **database values**
(`formats_color_hex_check` wants `#RRGGBB`), not CSS tokens, and its
no-free-hex-field constraint is the thing DS-03 leans on. **The two documents
disagree, and the disagreement is resolved in favour of the UI-SPEC**, which is
the later and more specific of the two. Recorded here so the planner does not
open the file to "finish" DS-01 and delete a constraint. The 74
default-Tailwind files are Phase 41's and appear nowhere below.

---

## 2. Pattern Assignments

### 2.1 `src/app/globals.css` (config, build-time transform)

**Analog: itself.** The shape this phase needs already exists in the file; what
changes is what it declares, not how. Blast radius is the whole product — the
only file in the phase with that property.

**The two-block structure to keep** (`globals.css:1-21`, read today):

```css
@import "tailwindcss";

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
  --accent: #e5484d;
  --accent-hover: #f2555a;
  --card: #141414;
  --card-border: #262626;
  --muted: #a1a1aa;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-card: var(--card);
  --color-card-border: var(--card-border);
  --color-muted: var(--muted);
}
```

**The pattern, stated so it survives the rename:** every `@theme inline` entry
is `--color-<name>: var(--<name>)` — a one-to-one forward reference into
`:root`, never a literal. RESEARCH §2.1 verified the compiled output references
`var(--accent)` (the raw `:root` property), which is why the two blocks must
ship in one file. New tokens follow the same one-to-one shape.

**`body`, and D-40-09's one-line inversion** (`globals.css:28-33`):

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-orbitron), system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

The `font-family` line is the defect. Note the **existing fallback tail** —
`system-ui, -apple-system, sans-serif` — already present here; UI-SPEC §5.2's
tail is an extension of a habit this file already has, not a new idea.

**What gets deleted, and the shape of the deletion** (`globals.css:51-55`,
`:68-72`):

```css
@utility glow-accent {
  box-shadow:
    0 0 15px rgba(229, 72, 77, 0.15),
    0 0 30px rgba(229, 72, 77, 0.05);
}
/* … and glow-accent-strong at :68-72, same shape */
```

`rgba(229, 72, 77, …)` **is** `#e5484d` written as a literal inside the token
file. Zero consumers (RESEARCH §5 P5). The removal is safe; the **reason goes in
the commit**, per §3.1.

**`html` is untouched** (`globals.css:23-26`) — `color-scheme: dark` stays, and
D-40-07 says its absence of a light branch is a decision, not a gap.

---

### 2.2 `src/app/layout.tsx` (root layout, request-response)

**Analog: itself.** Three separate patterns to copy, all already in the file.

**Pattern A — a `next/font` call with `variable`, which is what Inter must
become** (`layout.tsx:3`, `:8-11`, `:55`):

```tsx
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

// …
<html lang="en" className={orbitron.variable}>
```

Compare with what exists today at
`src/app/(public)/events/[slug]/menu/page.tsx:21`:

```tsx
const menuFont = Inter({ subsets: ["latin"], display: "swap" });
```

**No `variable`.** It returns a `className`, applied on a `<div>` at `:152` —
not a custom property, and nothing `@theme inline` can point `--font-sans` at.
The plan's Inter call copies Orbitron's shape and keeps `display: "swap"`
(UI-SPEC §5.2 keeps it as a decision, not an inheritance):

```tsx
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
// <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
```

**Pattern B — a brand rule written as a comment above the value it governs**
(`layout.tsx:13-22`). This is the house form for "a value whose spelling is
load-bearing", and it is the form `manifest.json` cannot have:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://resonatemotion.com"),
  // `re:sonate` con la e normale, ovunque un motore di ricerca, un lettore di
  // schermo o un'anteprima di link possa leggerlo. La `ɘ` (U+0258) e' un segno
  // disegnato che vive solo dentro il logo — `brand-visual-system.md`, gate
  // *grafia del brand*. In un `title` produce un nome che la ricerca non trova
  // e uno screen reader pronuncia come un fonema.
  title: "re:sonate",
```

Note the comment is **in Italian**, matching the surrounding docblocks in this
repo's product code. (Planning documents are English; in-code prose is mixed and
this file is Italian. Match the file, not the document.)

**Pattern C — the one-line colour change** (`layout.tsx:41-47`):

```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",   // → #0A0712 (UI-SPEC §6.3, F3)
};
```

**Gate to carry from `.claude/rules/brand-visual-system.md`:** the `ɘ` at `:16`
is inside the comment that explains the rule. It is not a violation, and G7 must
be written so it stays green — see §4.3.

---

### 2.3 `src/app/(public)/events/[slug]/menu/page.tsx` (route page — a deletion)

**There is nothing to copy in; there is a convention for taking something out.**
The change is: delete the import at `:2`, delete the `menuFont` const and its
comment at `:19-21`, delete the `${menuFont.className}` application at `:152`.

**What exists today** (`menu/page.tsx:1-2`, `:19-21`):

```tsx
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
// …
// Inter — neutral, highly readable in low-light venues. Scoped to the menu
// page only so the rest of the app keeps Orbitron as its display font.
const menuFont = Inter({ subsets: ["latin"], display: "swap" });
```

**The convention analog — a reversal is written down, not deleted.** Two
precedents, both in files this phase touches or reads:

- `.claude/rules/nextjs-architecture.md`: *«La riga e' **rovesciata qui, non
  tolta in silenzio**, perche' una decisione rovesciata senza la sua ragione si
  legge come una svista.»*
- `src/app/sw.ts:99-109` — a docblock section headed *"What this rule does NOT
  do"*, kept next to the rule.

**Applied here:** the reason in that comment — *"neutral, highly readable in
low-light venues"* — is **not obsolete**; it is being **promoted** to the whole
product. So it does not vanish with the code: it moves to `layout.tsx` beside
the new Inter call, or into the commit body. A diff that deletes the only place
that sentence exists loses the argument that justified D-40-08.

**Measured side effect to assert after the change** (RESEARCH §1, UI-SPEC §5.2):
`ls .next/static/css` goes from **2** files to **1**. That directory listing is
gate G5 and the precondition for DS-10 clause 1.

---

### 2.4 `public/manifest.json` (config, OS-read static asset)

**Analog: `layout.tsx:13-22` — with one property that does not transfer.**

**Today** (`public/manifest.json:1-9`):

```json
{
  "name": "Resonate",
  "short_name": "Resonate",
  "description": "motion music hub",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
```

Four values change: `name` and `short_name` → `"re:sonate"` (DS-06);
`background_color` and `theme_color` → `"#0A0712"` (UI-SPEC §6.3).

**The pattern that does not transfer, and what to do instead.** `layout.tsx`
carries the brand rule as a comment beside the value. **JSON admits no comment.**
So the rule that governs these four values has nowhere to live in the file, and
the plan must place it deliberately:

1. in the commit body, and
2. as an assertion in `scripts/verify-tokens.mjs` or a sibling — G6 in
   RESEARCH §7 — which is the only reader that will still be looking in a year.

This is the same argument `verify-media-strip.mjs` makes for its own existence
(*"the property that makes the strip a gate is not 'the route is correct', it is
'there is nowhere else to go'"*): where a convention cannot be written next to
the thing, it has to be **checked**.

**Constraint from RESEARCH §4.2 the plan must carry, not discover:** editing
this file makes the label correct **for a fresh install only**. On iOS no
manifest field updates after installation; on Android `name`/`short_name` are
not in the update list, though `background_color` and `theme_color` are.
**Do not write an acceptance criterion an existing install can fail.**

---

### 2.5 `next.config.ts` (config — the `cacheOnNavigation` flag)

**Analog: the four lines immediately above the line being changed.** This is the
cleanest analog in the phase — same file, same object literal, same class of
decision.

**`next.config.ts:4-14`, read today:**

```ts
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
```

**The pattern to copy, verbatim in form:** *a boolean whose value is a decision
carries the decision in a comment directly above it, and the comment names the
concrete failure at the door.* `reloadOnOnline: false` has it;
`cacheOnNavigation: true` at `:7` **does not** — and RESEARCH §6.4 identifies
that missing comment as the evidence the flag was inherited rather than chosen
(the library default is `false`).

So the change is not "flip a boolean". It is **flip the boolean and give it the
comment its neighbour has**, naming: the never-refreshing writer
(`if (isPageCached) return;`), what is lost (documents reached only by
client-side navigation stop being pre-warmed), and why that is acceptable here
(`/events/*` is already `NetworkOnly`; the door is warmed by an explicit online
visit).

**Second-order effect to state in the plan, not discover:**
`shouldBuildSWEntryWorker = cacheOnNavigation`, so `public/swe-worker-*.js`
stops being generated and leaves the precache.

**Refused, with its reason, so nobody re-proposes it:** `deploymentId` is absent
from `nextConfig` (`:16-35`) and stays absent — RESEARCH §6.3 proves it would
append `?dpl=` to CSS chunk URLs and miss Serwist's precache, i.e. no JavaScript
at the door with the radio off.

---

### 2.6 `src/app/sw.ts` (service worker, event-driven)

**Analog: itself, twice over.**

**Pattern A — the registration shape the new listener sits beside**
(`sw.ts:116-128`):

```ts
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
```

The new `activate` listener is **additional**, placed after
`serwist.addEventListeners()` — an added listener, never a replacement.
Precedent for "add alongside, do not override" is `runtimeCaching` itself:
`[...doorRuntimeCaching, ...defaultCache]`, with the ordering reason written at
`sw.ts:28-30` (*"Serwist takes the first matching route, so these rules must be
spread before the inherited ones"*).

**Pattern B — the docblock that records what a rule does NOT do.** This is the
single most important prose pattern in the phase, and CONTEXT names it
explicitly as *"the pattern to extend when D-40-12's mechanism lands"*. Read
`sw.ts:49-113` in full before writing the new comment. Its sections, in order:

```
 * ── What it is protecting ────────────────────────────────────────────────
 * ── The cost, which is real and is accepted ──────────────────────────────
 * ── What this rule does NOT do ───────────────────────────────────────────
```

and the passage that must be extended rather than contradicted (`sw.ts:99-109`):

```ts
   * ── What this rule does NOT do ───────────────────────────────────────────
   *
   * It does not evict what is already there. Entries cached on devices that
   * opened the page BEFORE this deploy survive until they expire (24 h) or are
   * overwritten. `skipWaiting` and `clientsClaim` update the WORKER on the next
   * visit; they do not empty the buckets the old worker filled.
```

**The new listener's docblock inherits all three sections**, and the middle one
is not optional: RESEARCH §6.5 states the cost in the domain's own words — after
a release the first open of any page must be online, which is the runbook line
`checkin-offline.md:57` already requires. The docblock must also assert what
the purge **cannot** reach: the door's queue is **IndexedDB**
(`src/lib/offline/`), not Cache Storage, and `caches.delete` cannot touch it
(RESEARCH A4 — *assert it after implementing, do not reason about it*).

**Pattern C — a conflict between two gates is written out, not smoothed over**
(`sw.ts:76-97`). The `/events/*` `NetworkOnly` rule states both gates by name,
says which wins and why, and records the disposition (`T-37-27 … ACCEPT`). The
`activate` purge is the same species of decision — `checkin-offline.md`'s
warm-up cost against DS-10 — and takes the same treatment.

> **Classification note for the planner.** `sw.ts` and `next.config.ts` are
> **Critical** by `CLAUDE.md`'s table (they touch the door). RESEARCH Open
> Question 4 asks for the owner's confirmation before the purge lands. That is
> *misura due volte, taglia una*, not a formality.

---

### 2.7 The three new scripts (verification, batch file-I/O)

> **`scripts/verify-media-strip.mjs` is the model.** 573 lines; its header is
> lines 1-98. The three new scripts must be recognisably the same species.
> Everything below is quoted from it.

#### A. The header — five sections, in this order

```js
#!/usr/bin/env node
/**
 * verify-media-strip.mjs — one writer toward the public media bucket, and it
 * strips first.
 *
 * WHAT IT ASSERTS, in one sentence: **no file under `src/` writes into the
 * `event-media` bucket except `src/app/api/media/finalize/route.ts`, and in that
 * file the call to `stripImageMetadata` precedes every write.**
 *
 * WHY A STRUCTURAL CHECK AND NOT A TEST ON ONE FILE. A test that reads the
 * finalize route proves the finalize route. It says nothing about the second
 * writer somebody adds in four months … The property that makes the strip a
 * gate is not "the route is correct", it is "there is nowhere else to go".
 * Absence is checkable.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - It does NOT prove `sharp` actually removes the metadata. That is a
 *     RUNTIME property of a library on real bytes, and this script never
 *     executes anything. …
 *   - It does NOT mean the migration was APPLIED. …
 *     This script cannot see a database and will not pretend to.
 *   - It does NOT mean anybody is authorised. … **RLS is the security
 *     boundary** (`CLAUDE.md`, operating principle 2), not a script.
 *
 * ── THE FIVE CHECKS ─────────────────────────────────────────────────────────
 *
 *   A. No file under `src/`, other than the finalize route, writes to the
 *      `event-media` bucket.
 *   B. In the finalize route, the LAST `stripImageMetadata(` sits above the
 *      FIRST write to `event-media`.
 *   …
 *
 * ── THE PREFIX TRAP, WHICH IS THE WHOLE DIFFICULTY OF CHECK A ───────────────
 *
 * `event-media-quarantine` STARTS WITH `event-media`. A naive
 * `line.includes('event-media')` therefore flags every correct file … and a
 * check that fails on a correct file gets switched off, after which it guards
 * nothing.
 *
 * ── COMMENT HYGIENE, WHICH IS LOAD-BEARING HERE ─────────────────────────────
 *
 * Comment lines are removed BEFORE counting. Without that, this very file —
 * which names both `event-media` and `stripImageMetadata` in prose, repeatedly —
 * … would decide the verdict on their own. A check invalidated by its own
 * documentation is a precedent this repository has already recorded.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files, prints only paths, line
 * numbers and source lines, opens no network connection, reads no environment
 * variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate, and a type gate that starts
 * failing for a reason that is not a type teaches everyone to ignore it …
 *
 * Usage:
 *   npm run verify:media-strip
 *
 * Exit codes:
 *   0  every check passed
 *   1  at least one failed — each is printed with its file and line
 *   2  nothing was measured: `src/` is missing, the route has moved, or the walk
 *      found no scannable file. No verdict is implied by a 2.
 */
```

Every element above is mandatory in the three new scripts: shebang, one-sentence
assertion, *why structural*, **WHAT A GREEN DOES NOT MEAN**, the enumerated
checks, the trap specific to this check, the secrecy paragraph, the
zero-dependency / not-wired-into-build statement, `Usage`, `Exit codes`.

The *"what a green does not mean"* content for each new gate is already written
for you — RESEARCH §7 supplies it verbatim: a `grep` reads **declarations, not
intent**; it cannot see a semantic expressed as a raw hex nor a format colour
reached through a variable renamed on the way; G5 proves one chunk was
**emitted**, not that a device **received** it; none of them says a colour is
**right**.

#### B. Imports, root resolution and the three-way exit

`verify-media-strip.mjs:100-136`:

```js
import { readdirSync, readFileSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = `${ROOT}/src`;

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(2);
}
```

**`refuse()` / exit 2 is the pattern most likely to be dropped, and it is the
one that matters most here.** A `verify-tokens.mjs` that cannot find
`src/app/globals.css` must exit **2**, not 0 — because a green from a script
that measured nothing is exactly the silent failure `meta-gates.md` forbids, in
a repository with no error tracking to notice it.

#### C. The walk

`verify-media-strip.mjs:138-160` — note the symlink guard and the sorted output
(deterministic reports):

```js
export function toRelative(abs) {
  return abs.slice(ROOT.length + 1).split(sep).join('/');
}

export function listScannableFiles(dir) {
  const out = [];
  const walk = (abs) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const child = `${abs}/${entry.name}`;
      if (lstatSync(child).isSymbolicLink()) continue;
      if (entry.isDirectory()) { walk(child); continue; }
      if (!entry.isFile()) continue;
      if (!SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue;
      out.push(toRelative(child));
    }
  };
  walk(dir);
  return out.sort();
}
```

**Note for `verify-tokens.mjs`:** `SCANNED_EXTENSIONS` has no `.css`. G1 reads
**one** CSS file (the token file, by exact path, with a `refuse()` if it moved)
and walks `src/` for `.tsx`/`.ts` consumers. **No existing script parses CSS** —
this is the first, so the parse must be conservative: extract `--name` from
declaration lines, not from anywhere the two characters appear.

#### D. Comment hygiene and the quoted-literal match

`verify-media-strip.mjs:162-182`:

```js
/** Line-shape comment heuristic. See the hygiene paragraph for why not a parser. */
export function isCommentLine(raw) {
  const t = raw.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/');
}

export function namesPublicBucket(raw) {
  return (
    raw.includes(`"${PUBLIC_BUCKET}"`) ||
    raw.includes(`'${PUBLIC_BUCKET}'`) ||
    raw.includes(`\`${PUBLIC_BUCKET}\``)
  );
}
```

Both transfer directly and both are needed:

- **`isCommentLine`** — `verify-sunset-gradient.mjs` matches a gradient string
  that this repository writes down in prose in at least four places
  (`40-UI-SPEC.md:658`, `36-VISUAL-SOURCE.md`, and the docblock of
  `ColorSwatchPicker.tsx`, which deliberately *omits* it for exactly this
  reason). Without comment stripping the gate reports its own documentation.
- **The quoted-literal / prefix trap** — `verify-tokens.mjs` faces the same
  shape in a different coat: `--line` is a **prefix of** `--line-soft` and
  `--line-strong`; `--ink` of `--ink-2`; `--accent` of `--accent-hover`
  (which exists today at `globals.css:7`). A bare `includes('--line')` matches
  all three. Match to a boundary, not to a substring.

#### E. Preflight, per-check reporting, verdict

`verify-media-strip.mjs:340-383` and `:561-573`:

```js
if (!existsSync(SRC_DIR)) refuse('`src/` does not exist. Nothing was measured.');
// …
const files = listScannableFiles(SRC_DIR);
if (files.length === 0) {
  refuse('the walk of `src/` found no scannable file. A vacuous green is not a green.');
}

const failures = [];

console.log('\nverify-media-strip — one writer toward the public bucket, and it strips first');
console.log(`  scanned ${files.length} file(s) under src/`);
console.log(`  exemption (exactly one): ${FINALIZE_ROUTE}\n`);

// ── A. nobody else names the public bucket ─────────────────────────────────
if (strayHits.length === 0) {
  console.log('  ✓ A  no file under src/ other than the finalize route writes to the public bucket');
} else {
  console.log(`  ✗ A  ${strayHits.length} line(s) outside the finalize route write to "${PUBLIC_BUCKET}":`);
  for (const h of strayHits) console.log(`         ${h.path}:${h.line}: [${h.kind}] ${h.text}`);
  console.log(
    `\n       Each is a SECOND path toward a public bucket. …\n` +
      `       Deposit into "${QUARANTINE_BUCKET}" and call POST /api/media/finalize instead.\n`
  );
  failures.push('A');
}

// ── verdict ────────────────────────────────────────────────────────────────
console.log('');
if (failures.length === 0) {
  console.log('  MEDIA_STRIP_OK — all five checks passed.');
  console.log(
    '  Read the header before treating this as safety: it says nothing about whether sharp\n' +
      '  really removes metadata, nothing about videos, and nothing about row 15 being\n' +
      '  APPLIED.\n'
  );
  process.exit(0);
}
console.log(`  MEDIA_STRIP_FAIL — ${failures.length} check(s) failed: ${failures.join(', ')}\n`);
process.exit(1);
```

Transfers exactly:

- a banner naming what was scanned and how many files;
- `✓ <letter>` / `✗ <letter>` per check, one line each;
- every failure printed as `path:line: text` — **never a count alone**;
- a remediation paragraph after a failure, saying what to do instead;
- `<NAME>_OK` / `<NAME>_FAIL` sentinel tokens, uppercase, greppable;
- the green line **repeats the limits of the green** rather than letting the
  reader forget the header;
- `process.exit(0 | 1 | 2)`.

Suggested sentinels, following the form: `TOKENS_OK`/`TOKENS_FAIL`,
`SEMANTIC_SEPARATION_OK`/`_FAIL`, `SUNSET_GRADIENT_OK`/`_FAIL`.

#### F. The exemption pattern — needed by two of the three new gates

`verify-media-strip.mjs:108-115` + `:342-348`:

```js
/** The one file allowed to write the public bucket. An exact path, compared for equality. */
export const FINALIZE_ROUTE = 'src/app/api/media/finalize/route.ts';

// …
if (!existsSync(`${ROOT}/${FINALIZE_ROUTE}`)) {
  refuse(
    `${FINALIZE_ROUTE} does not exist. The exemption cannot be applied to a file that\n` +
      '       has moved, and exempting whatever moved into the name would be worse than\n' +
      '       refusing. Nothing was measured.'
  );
}
```

**An exemption is an exact path, compared for equality, and its disappearance is
a `refuse()`, not a pass.** Two new gates need exactly this:

- `verify-sunset-gradient.mjs` — UI-SPEC §7 clause 4: the check **excludes its
  own declaration site**, `src/app/globals.css`. Same shape, same `refuse()` if
  the token file moves.
- `verify-semantic-separation.mjs` — the format identification hexes live in
  `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx:105-111` as **data**
  (`{ hex: "#FFB25E", label: "Amber" }` and five more), which is UI-SPEC rule 4
  working correctly, not a violation. Exempt it by exact path, and say **in the
  header** why the exemption exists — otherwise the next reader deletes it.

#### G. Two BSD/macOS constraints

- `sed -n "$n,+5p"` **fails on BSD** (`sed: 1: ",+5p": invalid command code ,`,
  RESEARCH §5 P4). The three gates are Node — they read files with
  `readFileSync` and never shell out — which sidesteps it entirely. Any *plan
  step* that scripts a file read must use `sed -n "start,endp"` with both bounds.
- `grep -E` for extended regex in any plan-step command (`CLAUDE.md` guardrail 6).

---

### 2.8 `package.json` (config — script registry)

**Analog: itself.** The seven existing entries, read today:

```json
    "verify:persona": "node scripts/verify-persona.mjs",
    "verify:capabilities": "node scripts/verify-capabilities.mjs",
    "verify:no-header-identity": "node scripts/verify-no-header-identity.mjs",
    "verify:no-credit-account": "node scripts/verify-no-credit-account.mjs",
    "verify:media-strip": "node scripts/verify-media-strip.mjs",
    "verify:redirects": "bash scripts/verify-organizer-redirects.sh",
    "verify:routes": "node scripts/verify-routes.mjs",
```

**The form:** `verify:<kebab-name>` → `node scripts/verify-<same-kebab-name>.mjs`,
the script name after the colon matching the filename suffix exactly. Six of
seven follow it (`verify:redirects` is the one exception, and it is also the one
bash script). New entries, appended after `verify:routes` — **appended, not
alphabetised**, since the existing list is in the order the scripts were written:

```json
    "verify:tokens": "node scripts/verify-tokens.mjs",
    "verify:semantic-separation": "node scripts/verify-semantic-separation.mjs",
    "verify:sunset-gradient": "node scripts/verify-sunset-gradient.mjs",
```

**Not wired into `build`.** `"build": "next build --webpack"` stays as it is —
the model script states the reason in its own header: *"a type gate that starts
failing for a reason that is not a type teaches everyone to ignore it"*.

---

## 3. Shared Patterns

### 3.1 A decision is written beside the thing it governs — or checked

**Sources:** `next.config.ts:8-12` · `src/app/sw.ts:49-113` ·
`src/app/layout.tsx:15-19` · `ColorSwatchPicker.tsx:5-60`
**Apply to:** every file in this phase.

The repository's dominant prose pattern is not "comment the code" — it is
**record the decision, its cost, and what it does not do, next to the value it
governs.** `reloadOnOnline: false` shows the minimal form (four lines); `sw.ts`
shows the full form (three named sections). Where the format admits no comment —
`public/manifest.json` — the rule must be carried by a script instead (§2.4).

### 3.2 A reversal is written down, not deleted

**Sources:** `.claude/rules/nextjs-architecture.md` §*Il gruppo non e' piu' il
pubblico* · `ColorSwatchPicker.tsx:29-35` · CONTEXT *Established patterns*
**Apply to:** `globals.css` (the `glow-accent` removal, D-40-04's `#e5484d`
retarget), `menu/page.tsx` (the local Inter escape), `next.config.ts`
(`cacheOnNavigation`).

Four values leave this phase: `--accent: #e5484d`, the two `glow-accent`
utilities, the menu page's font escape, and `cacheOnNavigation: true`. Each
carries its reason into the commit body. D-40-07 (no light theme) is the same
pattern applied pre-emptively — recorded so a later tidy-up does not read the
absence as an omission.

### 3.3 A check whose only match is its own prohibition gets ignored

**Sources:** `ColorSwatchPicker.tsx:22-27` (states the rule and applies it by
*omitting* the gradient string from the file) ·
`verify-media-strip.mjs:64-78` (comment hygiene)
**Apply to:** all three new scripts, `verify-sunset-gradient.mjs` above all.

Two mechanisms, both needed: strip comment lines before counting **and** exempt
the declaration site by exact path.

### 3.4 Absence is checkable; intent is not

**Source:** `verify-media-strip.mjs:10-15`, `:227-233`
**Apply to:** the framing of all three gates, and to the plan's acceptance
criteria.

The model states its own hole rather than leaving it to be found: *"a bucket
name assembled at runtime … is invisible to both rules. This script cannot
follow a value; it reads text."* Each new gate states the equivalent — a colour
written as a raw hex, a token reached through a renamed variable, a utility
built by string concatenation.

### 3.5 Zero silent failures, in a repo with no error tracking

**Source:** `.claude/rules/meta-gates.md` · RESEARCH §5 P1 (proven: a utility
whose token does not exist emits no rule, no warning, no error, exit clean)
**Apply to:** the whole phase, and it is why §2.7 exists.

The consequence for the plan: G1 (`verify-tokens.mjs`) must run **from the wave
that first renames a token**, not at the end. A rename is silent, so late
detection means an unknown number of commits already carrying it.

### 3.6 Nothing reloads a page by itself

**Source:** D-40-11 · `next.config.ts:8-12` · `.claude/rules/checkin-offline.md`
**Apply to:** `sw.ts`, `next.config.ts`, and any mechanism proposed for D-40-12.

DS-10 is satisfied by making a mixture impossible or visible, never by
reloading. A hard navigation on a link the person tapped is not a reload.

---

## 4. Notes the planner will otherwise have to rediscover

### 4.1 There is no analog for parsing CSS

None of the six existing `.mjs` scripts reads a stylesheet: they read `.ts`/
`.tsx` (`verify-media-strip`, `verify-routes`), `.sql` migrations
(`verify-media-strip` check D), `package.json` (check E) and Markdown
(`verify-persona`). `verify-tokens.mjs` is the first to parse CSS. The **file
handling** pattern transfers (`readFileSync`, line-indexed hits, `path:line:
text` reports); the **matching** does not, and must be written conservatively.

### 4.2 There is no analog for a service-worker lifecycle listener either

`src/app/sw.ts` today registers routes and calls `serwist.addEventListeners()`.
It adds **no** hand-written `self.addEventListener`. RESEARCH §14 supplies the
code and its docblock; the *shape* of the docblock comes from `sw.ts:99-113`,
which is in the same file. So: the prose has an analog, the code does not.

### 4.3 Three things the new gates must not fail on

Each is correct today, and a gate that goes red on a correct file gets switched
off — the failure mode `verify-media-strip.mjs:51-62` was written to prevent.

| Must stay green | Where | Why |
|---|---|---|
| The `ɘ` at `src/app/layout.tsx:16` | inside the comment explaining the rule | It is the rule's own documentation. G7 expects **exactly one** hit, at that `file:line` |
| Six brand hexes in `ColorSwatchPicker.tsx:105-111` | `{ hex: "#FFB25E", label: "Amber" }` and five more | Format identification colours are **data on a row** (UI-SPEC rule 4), not tokens. Exempt by exact path, with the reason in the header |
| Nine two-stop accent fades | `tickets/[id]/page.tsx:119`, `dashboard/page.tsx:407,449,514`, +5 | `bg-gradient-to-br from-accent/30 to-accent/5` — accent fades, not the sunset gradient. Match the **four-stop `94deg` signature**, never the word "gradient" |

### 4.4 The mechanical acceptance criterion already exists

`ls .next/static/css` returns **2** files today and must return **1** after
`menu/page.tsx`'s local font import is deleted. CSS filenames are content
hashes — RESEARCH proved it with a byte-identical rebuild — so this is a
directory listing, not a claim. It is G5 and DS-10 clause 1 in one command.

---

## 5. No Analog Found

| File | Role | Data flow | Reason |
|---|---|---|---|
| *(none)* | — | — | Every file in this phase has either an in-file precedent or `verify-media-strip.mjs`. The two gaps are **partial**, not total, and both are recorded in §4.1 and §4.2: CSS parsing has no matching precedent, and a hand-written SW lifecycle listener has no code precedent — in both cases the surrounding conventions (file walking, reporting, docblock structure) do have one |

---

## Metadata

**Analog search scope:** `scripts/`, `src/app/` (root layout, `globals.css`,
`sw.ts`, the `(public)/events/[slug]/menu` route, `(admin)/admin/formats`),
`public/`, `next.config.ts`, `package.json`
**Files read:** 11 — `40-CONTEXT.md`, `40-RESEARCH.md`, `40-UI-SPEC.md`
(targeted sections), `scripts/verify-media-strip.mjs`, `scripts/verify-routes.mjs`
(header only), `src/app/globals.css`, `src/app/layout.tsx`, `src/app/sw.ts`,
`next.config.ts`, `public/manifest.json`,
`src/app/(public)/events/[slug]/menu/page.tsx`,
`src/app/(admin)/admin/formats/ColorSwatchPicker.tsx`
**Directory listings:** `scripts/` (7 `verify-*`, 6 `.mjs` + 1 `.sh`)
**Pattern extraction date:** 2026-08-11
**Read-only:** no source file was modified. This document is the only file
written.
