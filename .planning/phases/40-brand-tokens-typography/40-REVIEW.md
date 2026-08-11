---
phase: 40-brand-tokens-typography
reviewed: 2026-08-11T19:43:26Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - next.config.ts
  - package.json
  - public/manifest.json
  - scripts/verify-semantic-separation.mjs
  - scripts/verify-sunset-gradient.mjs
  - scripts/verify-tokens.mjs
  - src/app/(public)/events/[slug]/menu/page.tsx
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/sw.ts
findings:
  critical: 2
  warning: 17
  info: 4
  total: 23
status: issues_found
---

# Phase 40: Code Review Report

**Reviewed:** 2026-08-11T19:43:26Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The token layer itself is in good shape: all three gates run green on this tree
(`verify-tokens` 6/6, `verify-semantic-separation` 5/5, `verify-sunset-gradient`
3/3), `KNOWN_TOKEN_NAMES` covers all 28 declared names with no omission, the
`@theme inline` mappings are one-to-one, and the brand-spelling work in
`layout.tsx` / `manifest.json` is correct and mechanically held.

The serious problems are in the two places the phase reasoned about hardest and
did not verify against the library it depends on.

**The `activate` purge in `src/app/sw.ts` deletes three caches that HTML
documents do not go into.** `@serwist/next`'s `pages` rule matches on the
**request's** `Content-Type` header, which a GET navigation never carries; the
document therefore falls through to the `others` NetworkFirst bucket, which the
purge does not touch. The unstyled-door scenario written out at `sw.ts:158-166`
— *"the cached document is served and the stylesheet it names is not on the
device"* — is still reachable after this change, and `caches.delete()` returning
`false` is indistinguishable from success, so nothing observable will say so.
The same hole leaves a venue-bearing `/tickets/[id]` document at rest across a
release, which is the exact thing the `/events/*` `NetworkOnly` rule above it
exists to prevent.

The three verify scripts are unusually well argued but carry the two failure
modes they warn about: one check that **can never fail** (sunset-gradient check
C), one that **will go red on a correct file** the first time a SunSet surface
legitimately applies `bg-grad-sunset` (tokens check D contradicts
sunset-gradient's own `ALLOW_LIST`), one case-sensitivity bug that lets the
retired black through in upper case, and a scan scope that includes gitignored
build output. And **nothing runs any of them**: there is no `.github/workflows`,
no aggregate `verify` script, and all three are deliberately out of `next build`.

Evidence for the cache claim was taken from the built worker, not from the
source comment: `public/sw.js` carries
`get("Content-Type")?.includes("text/html")&&a&&!t.startsWith("/api/")` and a
`cacheName:"others"` NetworkFirst rule after it.

---

## Critical Issues

### CR-01: The release purge deletes three caches; the documents are in a fourth

**File:** `src/app/sw.ts:260-264` (with `next.config.ts:24`)
**Classification:** BLOCKER

**Issue.** The listener purges `pages`, `pages-rsc`, `pages-rsc-prefetch`. In
`@serwist/next` 9.5.6 the rule that owns the `pages` cache is

```js
matcher: ({ request, url: { pathname }, sameOrigin }) =>
  request.headers.get("Content-Type")?.includes("text/html") && sameOrigin && !pathname.startsWith("/api/")
```

(`node_modules/@serwist/next/src/index.worker.ts:222-224`, and the same
expression is present in the built `public/sw.js`). That reads the **request's**
`Content-Type`. A top-level GET navigation has no request body and therefore no
`Content-Type` header, so the predicate is falsy and the navigation falls
through to the next rule:

```js
matcher: ({ url: { pathname }, sameOrigin }) => sameOrigin && !pathname.startsWith("/api/"),
handler: new NetworkFirst({ cacheName: "others", plugins: [ new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24*60*60 }) ] })
```

(`index.worker.ts:244-255`). Traced for `/door`: not a font/image/js/css
extension, not `/_next/data`, not `/api/*`, no `RSC` header, no request
`Content-Type` → **`others`**.

Consequences, in the order that matters:

1. The scenario the docblock is written for is **not closed**. Night N−1 the
   `/door` document enters `others`, not `pages`. A release ships; Serwist's
   `handleActivate` drops the old content-hashed stylesheet from the precache;
   this listener empties three buckets that do not hold the document. Night N,
   radio off, the old document is served from `others` and names a stylesheet
   that is gone. That is DS-10's failure, unchanged.
2. `pages-rsc` / `pages-rsc-prefetch` **are** purged (client navigations do send
   `RSC: 1`), so what the change actually delivers is: offline client-side
   navigation stops working after a release, while the stale document it was
   meant to remove survives. That is the cost paid without the benefit.
3. Nothing can report it. `caches.delete("pages")` resolves `false` when no such
   cache exists; `Promise.all` resolves `[false, false, false]` and the listener
   treats it exactly like success. The "If a delete fails" paragraph
   (`sw.ts:241-248`) covers a **rejection** only. There is no error tracking in
   this project, so a purge that deletes nothing is silent by construction —
   and `40-RELEASE-PASS.md` H3 step 4, cited as the observable, will read the
   same green either way.

**Fix.** Purge the bucket the documents are actually in, stop hardcoding names
the library exports, and make a `false` distinguishable from a delete:

```ts
import { defaultCache, PAGES_CACHE_NAME } from "@serwist/next/worker";

// Every Cache Storage bucket that can hold a DOCUMENT. `others` is on this list
// because the library's `pages` rule matches on the REQUEST's Content-Type,
// which a GET navigation never carries — so a navigation lands here, not in
// PAGES_CACHE_NAME.html. Verified in @serwist/next/src/index.worker.ts:222-255.
const DOCUMENT_CACHES = [
  PAGES_CACHE_NAME.html,
  PAGES_CACHE_NAME.rsc,
  PAGES_CACHE_NAME.rscPrefetch,
  "others",
];

self.addEventListener("activate", (event) => {
  (event as ExtendableActivateEvent).waitUntil(
    Promise.all(
      DOCUMENT_CACHES.map(async (name) => {
        const deleted = await caches.delete(name);
        // `false` is NOT success: it means nothing existed under that name, which
        // is what a library rename looks like. Distinguish it in the one place a
        // human reads during the release pass.
        console.warn(`[sw][activate] purge ${name}: ${deleted ? "deleted" : "ABSENT"}`);
      }),
    ),
  );
});
```

The durable form is to stop depending on where the library files a document at
all: add an explicit navigation route to `doorRuntimeCaching` with a cache name
this worker owns, then purge that name.

```ts
{
  matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
  handler: new NetworkFirst({ cacheName: "documents", plugins: [ /* expiration */ ] }),
},
```

Either way the release pass must be re-run: H3's outcome as recorded describes a
mechanism that was not doing what it says.

---

### CR-02: A venue-bearing document stays in Cache Storage across a release

**File:** `src/app/sw.ts:110-113` and `src/app/sw.ts:260-264`
**Classification:** BLOCKER (pre-existing gap, now load-bearing)

**Issue.** `doorRuntimeCaching` makes `/events/*` `NetworkOnly` with a long and
correct argument: an address must not be left at rest in Cache Storage on a
device (`sw.ts:53-97`, `venue-secrecy.md` gate *cache e pre-render*).
`/tickets/[id]` renders the same address — `src/app/(public)/tickets/[id]/page.tsx:40`
selects `event_parties(… venue_text)` and `:91` assigns
`const displayVenue = party?.venue_text ?? null` — and it is **not** in
`doorRuntimeCaching`. Its pathname is `/tickets/…`, so it falls to `others`:
`NetworkFirst`, 24 h, 32 entries, and per CR-01 it is not purged on activate.

`venue-secrecy.md` already flags this file as a reveal path that sits outside
the module's `paths:` — *"fuori dai `paths:` di questo modulo, e dichiarato
invece che taciuto"*. The declaration exists; the cache rule does not.

This predates phase 40. It is filed as a blocker because the phase's own
mechanism is presented as the document boundary and does not reach it, and
because the guard it violates is monotone: a copy that has been read cannot be
un-read.

**Fix — and this one is a decision, not a patch.** Two gates point opposite ways
and both are real:

- `venue-secrecy.md` wants the ticket page uncached, like `/events/*`.
- The member at the door needs their QR **without signal**, which is the whole
  reason a ticket page would ever be served from cache.

Do not resolve it silently in either direction. The narrow options are:

```ts
// (a) restrictive, consistent with /events/*: the ticket page no longer opens offline
{
  matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/tickets/"),
  handler: new NetworkOnly(),
},
```

or (b) keep the page cacheable and remove the address from the cacheable
surface — render `venue_text` from a client component fed by a `NetworkOnly`
endpoint, so the document at rest carries the QR and never the address. (b)
preserves both gates and is the only option that does not trade one away; it is
larger than a cache rule and belongs to a plan, not to this fix.

Whichever is chosen, write the disposition next to the rule the way `sw.ts:76-97`
already does for `/events/*`.

---

## Warnings

### WR-01: Cache names hardcoded when the same module already exports them

**File:** `src/app/sw.ts:262` (import at `:1`)

**Issue.** `["pages", "pages-rsc", "pages-rsc-prefetch"]` are string literals.
`@serwist/next/worker` — the module this file already imports `defaultCache`
from — exports `PAGES_CACHE_NAME = { rscPrefetch, rsc, html }`
(`node_modules/@serwist/next/src/index.worker.ts:4-8`). A library rename turns
the purge into three `false`s with no build error and no runtime signal.

**Fix.** `import { defaultCache, PAGES_CACHE_NAME } from "@serwist/next/worker";`
and reference the constant (see CR-01's snippet).

### WR-02: `verify-tokens` check D will go red on the first legitimate SunSet surface

**File:** `scripts/verify-tokens.mjs:339` and `:776-811`, against
`scripts/verify-sunset-gradient.mjs:149`

**Issue.** `grad-sunset` is in `KNOWN_TOKEN_NAMES` and has no `--color-*`
mapping, so it is in the 7 `unexposed` names check D scans for. But
`globals.css:383` declares `@utility bg-grad-sunset`, and
`verify-sunset-gradient` provides an `ALLOW_LIST` whose documented purpose is to
sanction the first file that applies it. Those two gates contradict each other.
Proven mechanically with the script's own `consumerPattern`:

```
"<div className=\"bg-grad-sunset p-4\">" -> [ 'bg-grad-sunset' ]   # check D FAILS
```

So the first correct SunSet surface makes `verify:tokens` red while
`verify:sunset-gradient` stays green. This is precisely the failure mode both
headers cite `verify-media-strip.mjs:51-62` about — *a gate that goes red on a
correct file gets switched off*.

**Fix.** Teach check D that a name may be exposed through `@utility` as well as
through a `--color-*` mapping, and say so where the exclusion is argued:

```js
/* A name is EXPOSED if it has a --color-* mapping OR an `@utility` rule that
 * reads it. `grad-sunset` is the second kind: no bg-/text- utility exists for
 * it, but `@utility bg-grad-sunset` is its one sanctioned application route
 * (globals.css:383), and verify-sunset-gradient's ALLOW_LIST — not this check —
 * owns who may use it. */
const utilityExposed = new Set(
  tokenLive.flatMap((l) => [...l.matchAll(/@utility\s+[a-z]+-([a-z0-9-]+)\s*\{/g)].map((m) => m[1]))
);
const unexposed = KNOWN_TOKEN_NAMES.filter((n) => !exposedNames.has(n) && !utilityExposed.has(n));
```

### WR-03: `verify-sunset-gradient` "check C" cannot fail

**File:** `scripts/verify-sunset-gradient.mjs:366-370`

**Issue.** Check C prints a `✓` unconditionally and is never pushed to
`failures`. Its two subjects are already handled elsewhere: the token file's
existence is a `refuse()` at `:271`, and the exclusion is the `continue` at
`:306` — which is itself dead, because `srcFiles` only holds
`.ts/.tsx/.js/.jsx/.mjs/.cjs` and can never contain `src/app/globals.css`. The
verdict line then reports *"all three checks passed"*, of which one measured
nothing. `ai-engineering.md`, gate *un gate deve poter fallire*: a check no
reachable situation violates is decoration that makes something look guarded.

**Fix.** Either drop C and renumber ("two checks"), or give it a subject that
can fail — e.g. assert the token file is genuinely inside the scanned set and
that its exclusion removed exactly one file:

```js
const excluded = scanned.length - srcFiles.length; // must be exactly 1
if (excluded !== 1) { console.log('  ✗ C  …'); failures.push('C'); }
```

### WR-04: The retired black is compared case-sensitively

**File:** `scripts/verify-tokens.mjs:366` and `:866`

**Issue.** `layoutRaw.includes(RETIRED_BLACK)` with `RETIRED_BLACK = '#0a0a0a'`.
Two lines above, `GROUND_HEX` is compared with `.toLowerCase()` on both sides
*"so a correct value in the other case never goes red"* (`:850-858`). The retired
value gets no such treatment: `"#0A0A0A".includes("#0a0a0a") === false`, so
`themeColor: "#0A0A0A"` — the same retired colour, upper case, which is the case
convention this very file uses for `#0A0712` — passes check F.

**Fix.**

```js
const layoutLower = layoutRaw.toLowerCase();
if (layoutLower.includes(RETIRED_BLACK.toLowerCase())) { … }
```

### WR-05: `themeColor` is asserted as an exact substring, quote style included

**File:** `scripts/verify-tokens.mjs:861`

**Issue.** `layoutRaw.includes(\`themeColor: "${GROUND_HEX}"\`)` requires exactly
one space after the colon, double quotes, and upper-case hex. `themeColor:'#0A0712'`,
`themeColor:  "#0a0712"`, or a formatter that breaks the line all make a
**correct** file red — the failure mode the same header spends a paragraph
avoiding for the glyph line number (`:138-145`). The mirror problem is also
present: `layoutRaw` is read raw at `:860`, not through `liveLines()`, so the
string satisfying the check inside a comment would pass, and the retired black
mentioned inside a comment explaining its retirement would fail.

**Fix.** Match the value, not the formatting, over comment-stripped lines:

```js
const layoutLive = liveLines(LAYOUT_FILE);
const themeColorLine = layoutLive.find((l) => /themeColor\s*:/.test(l));
if (themeColorLine === undefined || !new RegExp(GROUND_HEX, 'i').test(themeColorLine)) { … }
```

### WR-06: The glyph scan walks gitignored build output

**File:** `scripts/verify-tokens.mjs:873-876`, header claim at `:231-234`

**Issue.** `glyphScope` walks `public/` for `GLYPH_EXTENSIONS`, which includes
`.js`. `public/sw.js` (52 KB, generated by `next build`) is present on any
machine that has built and is `.gitignore`d at `.gitignore:40`; `SKIP_DIRS`
covers `node_modules`, `.next`, `.git` and nothing under `public/`. So the gate's
scope differs between a clean checkout and a developer's tree, and the header's
*"This script reads only committed files"* is false. Any generated asset that
happened to carry U+0258 would make check F red on a correct source tree.

**Fix.** Exclude generated worker output alongside the artwork exclusions, and
correct the header sentence:

```js
export const GLYPH_EXCLUDED_PREFIXES = ['public/images/', 'public/icons/'];
export const GLYPH_EXCLUDED_FILES = [/^public\/sw\.js$/, /^public\/swe-worker-.*\.js$/, /^public\/workbox-.*\.js$/];
```

### WR-07: Nothing asserts the font variables reach `<html>`

**File:** `src/app/layout.tsx:100`, `scripts/verify-tokens.mjs:349` and `:683`

**Issue.** `layout.tsx:16-20` states the hazard precisely — *"Una var() che non
risolve non e' un errore: la proprieta' viene semplicemente lasciata cadere, il
build resta verde e il prodotto scende in silenzio sulla coda system-ui"* — and
then no gate covers it. Check A **exempts** `--font-orbitron` / `--font-inter`
from needing a declaration (`:683`), which is correct for the token file and
means the only thing that makes them exist, `className={\`${orbitron.variable} ${inter.variable}\`}`,
is unguarded. Delete that `className` and all fourteen checks stay green while
every page in the product silently loses Inter. The menu page is now fully
dependent on it: its local `menuFont.className` was removed in this phase, so
`body { font-family: var(--font-sans) }` is its only source.

**Fix.** Add to check F (which already reads `LAYOUT_FILE`):

```js
for (const v of FONT_VARIABLES) {
  const cssVarName = v.slice('--font-'.length);            // orbitron | inter
  if (!new RegExp(`${cssVarName}\\.variable`).test(layoutRaw)) {
    manifestProblems.push(
      `${LAYOUT_FILE}: \`${cssVarName}.variable\` is not applied — ${v} would resolve to ` +
        'nothing and every surface would drop to the system-ui tail, silently'
    );
  }
}
```

### WR-08: The three scripts triplicate their helpers and duplicate their constants

**Files:** `scripts/verify-tokens.mjs:262-499`,
`scripts/verify-semantic-separation.mjs:192-351`,
`scripts/verify-sunset-gradient.mjs:136-188`

**Issue.** `TOKEN_FILE` is declared three times, `UTILITY_PREFIXES` twice,
`SCANNED_EXTENSIONS` and `SKIP_DIRS` three times, and `toRelative`,
`listScannableFiles`, `isCommentLine`, `liveLines`, `findBlock`,
`declarationsIn`, `refuse` are byte-comparable copies. `verify-tokens.mjs`
already `export`s all of them, so the duplication is not forced. The
correctness consequence is concrete: add a thirteenth colour-bearing utility
prefix to `verify-tokens`'s list and `verify-semantic-separation`'s check C
silently keeps looking for twelve — one gate narrows without a diff that says so.

**Fix.** Extract `scripts/lib/css-scan.mjs` with the shared helpers and the two
shared constants (`TOKEN_FILE`, `UTILITY_PREFIXES`) and import from all three.
Keep each script's own subject constants local.

### WR-09: Nothing runs the three gates

**File:** `package.json:17-19`

**Issue.** Three scripts were added, each deliberately outside `next build` for
a stated and good reason. There is no `.github/workflows` in this repository, no
aggregate `verify` script, and no pre-commit hook. So all three run only when a
human remembers three command names. `ai-engineering.md`: *un gate che non si
carica e' indistinguibile da un gate assente*.

**Fix.** At minimum an aggregate, so one name covers all of them:

```json
"verify": "npm run verify:persona && npm run verify:tokens && npm run verify:semantic-separation && npm run verify:sunset-gradient && npm run verify:capabilities && npm run verify:routes"
```

and name it in the phase's release procedure. A CI workflow is the durable form;
the aggregate is what makes the CI workflow one line.

### WR-10: The unlayered `.font-mono` rule cannot be overridden on the same element

**File:** `src/app/globals.css:308-310`

**Issue.** The rule is unlayered on purpose so it beats Tailwind's layered
utilities — and that is exactly what makes it unoverridable. `@layer utilities`
holds `proportional-nums`, `lining-nums`, `oldstyle-nums`; an unlayered
declaration wins over any layered one regardless of source order or specificity.
So `<span className="font-mono proportional-nums">` renders tabular anyway, and
the utility silently does nothing. The comment at `:298-306` reasons carefully
about **descendants** and does not mention the same-element case. Second effect:
`font-variant-numeric` is inherited, so every descendant of a `font-mono`
container gets tabular figures including text that is not mono.

There are no `proportional-nums` / `ordinal` / `slashed-zero` occurrences under
`src/` today, so this is latent, not live.

**Fix.** State the same-element case in the comment, and give the escape hatch a
name rather than leaving the next reader to discover `!important`:

```css
/* Same-element caveat: an unlayered rule beats @layer utilities, so
 * `font-mono proportional-nums` still renders tabular. When a surface genuinely
 * needs proportional figures in the mono face, use the arbitrary property
 * `[font-variant-numeric:proportional-nums]`, which is also unlayered-strength. */
```

### WR-11: Orbitron is loaded and preloaded at the root with zero consumers

**File:** `src/app/layout.tsx:42-45`, `:100`; `src/app/globals.css:285`, `:330-335`

**Issue.** `globals.css:330-335` records the consequence — *"da qui Orbitron non
rende NULLA finche' una superficie non applica il ruolo display, e la prima sara'
della fase 41"* — and `grep -rE "font-display|orbitron" src` returns only
`layout.tsx` itself. Because `orbitron.variable` sits on `<html>`, `next/font`
treats the face as used and emits its `<link rel="preload" as="font">` on every
route. So every page in the product, including the door's one online warm-up
before a night, fetches a font that paints nothing.

**Fix.** Until phase 41 lands the first display surface:

```ts
const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  // No surface applies the display role until phase 41 (globals.css:330-335).
  // `preload: false` keeps the face declared and its token resolvable while
  // dropping a per-page font fetch that paints nothing — flip it back in the
  // same commit as the first display surface.
  preload: false,
  variable: "--font-orbitron",
});
```

### WR-12: `--faint` is exposed as a utility although it fails AA on every ground

**File:** `src/app/globals.css:26-32`, `:236`

**Issue.** The comment measures `--faint` at 3.12–3.54:1 against all four
grounds and states it *"FAILS AA for body text on EVERY ground"*, admissible
only at ≥24 px or as non-informational graphic. `--color-faint` is nevertheless
mapped at `:236`, so `text-faint` is a one-word reach from any component, and
the constraint lives only in a comment in a file most consumers never open. The
phase built mechanical gates for DS-02 and DS-03 and none for this. There are no
`*-faint` consumers under `src/` today, so nothing is currently wrong on screen.

**Fix.** Either keep the token unexposed (it then falls under check D's
zero-consumer rule for free, which is the mechanism already in the file for the
sunset scale), or add a check that every `text-faint` occurrence carries a
text-size utility of `text-2xl` or larger on the same line. The first is one
line and costs nothing today.

### WR-13: Check B has no exemption for `src/emails/**`, where a literal hex is mandatory

**File:** `scripts/verify-semantic-separation.mjs:568-600`, header at `:44-46`

**Issue.** Check B flags any hex declared in `:root` that appears anywhere under
`src/` outside two exact paths. Email clients do not resolve CSS custom
properties — a brand colour in `src/emails/**` **has** to be a literal. The
header notes DI-40-01 is "deferred, not covered", but that is only true while no
email uses a colour that is also a token. The moment one adopts `#FF5C93`
(*rosa caldo*, the brand's primary accent), a gate goes red on a file that had no
other correct form, and the repair pressure will be on the gate.

**Fix.** Add the exemption now, by prefix and with its reason, before the red
appears:

```js
/* Exemption 3 — src/emails/**. An email client resolves no CSS custom property:
 * a brand colour in a mail is a literal or it is nothing. This is a PREFIX and
 * not an exact path because the directory holds many files with one reason.
 * DI-40-01 owns making that palette a single exported constant; until then the
 * literals are correct, and a gate that reddened on them would be switched off. */
export const EXEMPT_PREFIXES = ['src/emails/'];
```

### WR-14: `menuUrl` interpolates an environment variable with no guard

**File:** `src/app/(public)/events/[slug]/menu/page.tsx:144`

**Issue.** `const menuUrl = \`${process.env.NEXT_PUBLIC_APP_URL}/events/${slug}/menu\``.
If the variable is unset on a deployment, the string becomes
`undefined/events/<slug>/menu` and is handed to `<EventQRCode url={menuUrl}>` at
`:172` — a QR code an organizer prints or shows at a party, which scans to a
broken URL, with no error anywhere. `MEMORY.md` already records one incident
class around this variable (a trailing newline breaking the SumUp webhook URL),
so it is not a hypothetical value to trust. Predates this phase; the file is in
scope and the failure is silent, which this project treats as its own defect
class.

**Fix.**

```ts
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  // Distinguishable, and visible where it matters: a QR that scans to
  // `undefined/...` is worse than no QR, because somebody prints it.
  console.error("[menu] NEXT_PUBLIC_APP_URL is not set — the menu QR cannot be built");
}
const menuUrl = appUrl ? `${appUrl}/events/${slug}/menu` : null;
```

and render the QR block only when `menuUrl !== null`, with a visible note to the
organizer in its place.

### WR-15: Commented-out import and JSX block left in the menu page

**File:** `src/app/(public)/events/[slug]/menu/page.tsx:11-13`, `:176-183`

**Issue.** The `GuestLoginBanner` import and its render site are commented out
and annotated *"kept compilable-on-re-enable"* — which is precisely what
commented-out code is not: nothing compiles it, so the claim decays silently.
The phase touched this file's imports and left it in place.

**Fix.** Delete both blocks. The restoration lives in git history, and the
comment at `:11-12` already names the component, which is what a future reader
needs.

### WR-16: The viewport blocks pinch-zoom

**File:** `src/app/layout.tsx:84-85`

**Issue.** `maximumScale: 1, userScalable: false` prevents zoom on every surface
(WCAG 2.x 1.4.4). This sits in a phase whose subject is legibility, in a file
this phase edited, and next to a token (`--faint`) documented as failing AA. It
also removes the user's only remedy for the small-text cases the token file
warns about. Predates this phase.

**Fix.** Drop both properties; iOS 10+ ignores them for zoom anyway and their
only reliable effect today is on Android.

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0712",
};
```

If they are being kept to suppress the iOS focus-zoom on inputs, the correct
remedy is a ≥16 px font-size on form controls, which the type roles can now
carry.

### WR-17: The purge leaves the expiration plugin's IndexedDB index behind

**File:** `src/app/sw.ts:260-264`

**Issue.** The three purged caches each carry an `ExpirationPlugin`
(`maxEntries: 32, maxAgeSeconds: 86400`) whose bookkeeping lives in its own
IndexedDB database, not in Cache Storage. `caches.delete(name)` removes the
bucket and leaves up to 32 phantom records per cache pointing at URLs that no
longer exist. Until they age out, `maxEntries` accounting counts entries that are
not there, so the cache under-fills after each release. It self-heals and nothing
breaks; it is filed because the docblock's *"What this rule does NOT do"* section
enumerates four things it does not touch and this is a fifth.

**Fix.** State it in that section, or clear the metadata alongside the bucket —
in a `try`/`catch` that reports rather than swallows, since the database name is
a library detail:

```ts
await Promise.all(DOCUMENT_CACHES.map((n) => caches.delete(n)));
// Best-effort: the expiration plugin's index is a separate storage API and is
// not reachable by a Cache Storage delete. Leaving it costs one under-filled
// cache generation, never a wrong response.
```

---

## Info

### IN-01: Manifest omits `id` and `scope`, and uses the combined `purpose`

**File:** `public/manifest.json:1-24`

No `id` (installed-app identity is then derived from `start_url`, so a later
`start_url` change orphans installs) and no `scope`. `"purpose": "any maskable"`
is spec-valid but Chrome recommends separate entries, because one artwork rarely
satisfies both the maskable safe zone and the unmasked frame. Neither is touched
by this phase; both are cheap to add while the file is being edited.

### IN-02: Check B's "never a chain" holds by shape, not in fact

**File:** `scripts/verify-tokens.mjs:705-739`, `src/app/globals.css:205-208`

Check B's message says a mapping must never be *"a chain to a differently-named
token"*. `--color-background: var(--background)` satisfies it, and
`--background: var(--ground)` in `:root` is exactly such a chain, one level
lower, where check B does not look. That is intended for the phase-41 aliases —
worth one sentence in the check's own text so the next reader does not conclude
chains are impossible.

### IN-03: `orbitron` relies on the default `display`, `inter` states it

**File:** `src/app/layout.tsx:42-51`

`inter` sets `display: "swap"` with a paragraph explaining why swap and not
optional; `orbitron` sets nothing and inherits the same value from `next/font`'s
default. Same outcome, asymmetric reading — an omission is indistinguishable from
a decision.

### IN-04: `next.config.ts` pins line numbers in `sw.ts`

**File:** `next.config.ts:20`

The comment cites `sw.ts:110-113`. `verify-tokens.mjs:138-145` argues in this
same phase that a line-pinned reference *"would have been invalidated by the
commit that wrote it"*. Cite the rule (`the /events/* NetworkOnly rule in
doorRuntimeCaching`) rather than its coordinates.

---

## What a green from the three gates does not cover

Recorded so the phase's own artefacts are not read as more than they are:

- All three scripts run green on this tree. None of them reads
  `src/app/sw.ts`, `next.config.ts` or the service-worker behaviour, so CR-01
  and CR-02 are outside every gate this phase built.
- `npm run build` is the only automatic check that runs today, and it is blind
  to all six token checks by design (measured in `verify-tokens.mjs:16-31`) and
  to cache-name drift.
- There is no test runner for the product. Every fix above needs a written
  manual procedure; for CR-01 and CR-02 that procedure is a release pass with the
  radio off, and its result must be recorded verbatim rather than inferred from
  the absence of a complaint.

---

_Reviewed: 2026-08-11T19:43:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
