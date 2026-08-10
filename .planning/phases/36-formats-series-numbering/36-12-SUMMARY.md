---
phase: 36-formats-series-numbering
plan: 12
subsystem: public-surface
tags: [url-state, transition, swipe, disclosure, venue-secrecy, postgrest-embed, measured, looked-at]

# Dependency graph
requires:
  - phase: 36-formats-series-numbering
    provides: "the two parameters, the catalogue query and the chip row (36-11)"
  - phase: 36-formats-series-numbering
    provides: "FormatMarker, with its explicit casing declaration (36-06)"
provides:
  - "The time axis in the address: a tab that survives navigation, a reload, Back and a share"
  - "The swipe conserved — the panel still moves on local state, the navigation runs inside a transition"
  - "The format marker row on the event card, between the date and the title"
  - "The format marker on every night of the detail page, gated per night"
  - "The four empty states, with one filtered sentence shared by every format"
  - "The PostgREST embed hint carried onto the second public surface, re-measured"
affects: [36-13, 36-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A client component that writes a search parameter: local state drives the animation, `router.replace` inside `useTransition` drives the address, a `useEffect` resyncs from the prop. New to this codebase — the three prior readers of the query string only read on mount"
    - "An href passed to `router.replace` compiles under typed routes when it is a template literal AT THE CALL SITE; the ternary that keeps every branch a literal is the same workaround the anchors already use"
    - "The per-night venue gate is the STORED flag, not the time-and-entitlement verdict the same page computes ten lines away — the two are named side by side so the distinction cannot be collapsed by a reader in a hurry"

key-files:
  created:
    - .planning/phases/36-formats-series-numbering/36-12-SUMMARY.md
  modified:
    - src/app/(public)/events/EventTabs.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/page.tsx
    - .planning/phases/36-formats-series-numbering/deferred-items.md

key-decisions:
  - "Il tab resta uno stato locale e l'indirizzo lo segue dentro una transizione: il pannello non aspetta mai un round trip, che e' la conservazione di un comportamento esistente, non una scelta nuova"
  - "I due tab restano `<button>` e non diventano ancore: il tap e lo swipe devono passare per lo stesso identico percorso, altrimenti la stessa transizione di stato ha due meccanismi"
  - "Il gate del venue sul detail e' `venue_secret` per notte — lo stesso predicato della card, dichiarato in entrambi i file"
  - "L'errore della query delle notti del detail non viene piu' ingoiato, split per causa come su `/events`"
  - "Il link `Show all events` non usa l'accent: quella tinta e' riservata e l'asse dei format non la prende in prestito"
  - "`page.tsx` risolve la riga del format invece del solo slug — una lookup sola, due meta' per due figli"
  - "Nessun `FMT-*` spuntato in REQUIREMENTS.md — D-36-19"

patterns-established:
  - "Una misura ripetuta vale la seconda esecuzione: il `PGRST201` di 36-11 e' stato riprodotto oggi prima di scrivere la seconda query, e la stessa sonda ha trovato un fatto che 36-11 non poteva vedere"

requirements-completed: []  # deliberately empty — D-36-19

# Metrics
duration: 70min
completed: 2026-08-10
---

# Phase 36 Plan 12: The tab in the address, and the format on every night — Summary

**The Upcoming/Past choice now lives in the URL and survives a reload, a share
and the Back button while the swipe still moves at the speed of a finger — and
the night-detail page grew the same embed, the same hint, and the same per-night
venue gate as the card. Two things were done that no plan in this phase had done
yet: the defect 36-11 measured was re-measured before the second query was
written, and somebody finally looked at the surface in a browser.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 2 of 2
- **Commits:** 2 of task + 1 of deferred item + 1 of documentation
- **Database writes:** zero. Every probe was a `GET` with the anonymous key.

---

## What was built

### Task 1 — the tab in the address, the marker row, the four empty states (`366beff`)

**The shape, and why each half of it is there.** `activeTab` stays local state,
because it derives `baseOffset` and therefore the panel translation. Every
change — tap or swipe — does **both** things, in this order:

1. `setActiveTab` immediately, so the panel moves without waiting on anything;
2. `router.replace(href, { scroll: false })` inside `useTransition`, so the
   address follows without the navigation blocking the gesture.

`/events` is a Request-time page: a navigation here is a real round trip, and a
swipe that waits on the network is a broken swipe on the page that is the shop
window. Both lists stay props, so the navigation changes nothing the component
holds.

A `useEffect` resyncs the local tab from the prop. That single line is what makes
a shared link and the **Back button** work: without it, Back would move the
address while the panel stayed where it was.

`replace`, not `push` — `handleTouchEnd` can fire on every gesture, and pushing
would fill the history with the same page. The chips push, from anchors, because
choosing a format is a deliberate act worth a Back.

**No client-side reader of the query string.** The value arrives as a prop from
the Server Component; reading it here would force a `<Suspense>` boundary and
move the read out of the one construction path this phase requires.

**The marker row** sits between the date line and the title, one marker per
distinct format in the order the page collected them, duplicates already
collapsed. The joiner is `aria-hidden` and supplied by the UI; the lower-case
letter inside a series name is a different glyph and comes from the stored
string.

**The four empty states** carry the contract's copy. The filtered sentence is the
**same string for every format** and is computed from the array already on
screen — `events.length === 0`, never a second read. A sentence that differed per
format would be a tally with one bit of resolution.

### Task 2 — the night detail (`9967656`)

The `event_parties` query gained two embeds, one of them carrying
`!event_parties_series_id_fkey`, and the per-night marker went above
`party.title`.

Three things are enforced **at the query** rather than at the template: neither
internal code nor the stored figure is selected, on either side of either embed.
A column that never arrives cannot be rendered by a later edit that was not
thinking about the rule. The reason is carried into the code, because it is what
a later *"why not show it?"* would undo: the stored figure is itself a channel —
*"the eighteenth"* says that eighteen exist.

**The predicate is written down, and so is the one it is not.** This page holds
two candidates ten lines apart, and they are not the same:

| | |
|---|---|
| Predicate used | the **stored flag** `event_parties.venue_secret`, per night |
| Predicate **not** used | `isVenueVisible`, the time- and entitlement-dependent verdict computed for the venue block |
| Test written | `party.venue_secret !== false ? format.name : series.name ?? format.name` |
| Why the stored flag | it is the narrower of the two — it does not open when a night has passed or when the reader holds a ticket — and `venue-secrecy.md`'s default-closed gate says the narrower wins |
| Why it matters | it is the card's predicate too, so the same night cannot say two different names on two surfaces |

**The parties query error is no longer discarded** (Rule 2, below). Adding an
embed that can be refused is what made discarding it untenable.

---

## Verification — what was run, and what each thing can prove

| Gate | Result |
|---|---|
| `npm run build` after each task | green |
| `npx tsc --noEmit` | **0 errors** |
| `npx eslint` on both files | see *Deferred Issues* — 4 pre-existing errors, 0 new |
| Production probe of the new embed, anonymous key, read-only | **reproduced the defect**, see below |
| The rendered source of five addresses, dev server | see below |
| **The surface, in a browser, at phone width** | **looked at — first time in this phase** |

### The defect, re-measured rather than inherited on trust

Run against production with the anonymous key **before** the second query was
written, because a green build checks no column name:

```
A: unqualified party_series embed  → HTTP 300 — code=PGRST201
   "Could not embed because more than one relationship was found for
    'event_parties' and 'party_series'"
B: with !event_parties_series_id_fkey → HTTP 200 — rows=3
```

The `formats` embed needs no hint: `format_id` is the only reference between
those two tables, and the 200 confirms it.

### And the probe found something 36-11 could not see

36-11 recorded that **the series-name branch had never been taken** in
production, because it gates per **card** and both published cards carry a secret
night. Per **night**, the picture is different — and the branch **is** exercised:

| Night | `venue_secret !== false` | series row present | branch taken | rendered string differs from the format name |
|---|---|---|---|---|
| 1 | yes | yes | format name | no |
| 2 | yes | yes | format name | no |
| 3 | **no** | yes | **series name** | **no** |

**Read the last column before concluding anything.** The series-name branch now
executes on a real night — which 36-11 could not say — but its **output is
byte-equal to the fallback**, because that series' stored public name is the same
string as its format's name today. So the branch is **reached and not
observable**: nothing on screen distinguishes it from the degraded path. Proving
the two apart still needs a series whose public name differs, which is 36-13's
procedure to seed.

Every probe printed shapes and booleans only — no name, no slug, no address, no
key — and both probes live outside the repository, which is public.

### The rendered source, five addresses

| Address | HTTP | `aria-current="true"` | List | Empty-state copy |
|---|---|---|---|---|
| `/events` | 200 | 1 (`All`) | complete | `No upcoming events` / `Check back soon.` |
| `/events?tab=past` | 200 | 1 (`All`) | complete, **opens on Past** | — |
| `/events?format=<unknown>` | 200 | **1 (`All`)** | **complete** | as the bare address |
| `/events?format=<a listed one>` | 200 | 1 (that chip) | filtered | `Nothing announced for {name}` + `Show all events` |
| `/events?format=<another>&tab=past` | 200 | 1 (that chip) | filtered | `No past events for {name}` + `Show all events` |

- **No redirect on any value** — every response is a `200`, an unknown slug
  included. The uniform answer is what keeps the page from being an oracle.
- **Both parameters compose.** With `?tab=past` set, every chip href carries
  `&tab=past`; with a format set, both tab hrefs carry `?format=`.
- The rendered strings are exact: `Nothing announced for re:sonate` with the
  normal e, `No past events for SunSet` with its CamelCase intact.
- The card's marker row was read out of the rendered HTML in position: it sits
  between the `<p>` of the date and the `<div>` of the title, its swatch is
  `aria-hidden`, and the name element carries the casing declaration.

### What was seen, at 390×844

`36-06-SUMMARY.md` asked that the first plan to mount `FormatMarker` look at it;
`36-11-SUMMARY.md` recorded that it had not. It has now been looked at — headless
Chrome over the debugging protocol at phone width, because the static screenshot
mode never runs the entry animation and returns a black page.

What was actually visible:

- **The chip row reads as navigation, not as a control panel.** `All` current
  with the card ground, the rest transparent, one line that scrolls with a
  partially visible chip at the right edge — the affordance the spec asked for,
  working without any script.
- **The two typographic registers sit one above the other and do not blur.** The
  tab labels are shouted and letter-spaced; the chips directly above them are
  not. `re:sonate` keeps its lower-case opening and `SunSet` its capital S, eight
  pixels from two elements that would have flattened both. This is the invariant
  whose violation publishes to every visitor at once, and it is now a thing
  somebody has seen rather than a class name somebody trusted.
- **The off-state swatches are dim but present** — the measured 1.83–2.63:1 that
  `36-UI-SPEC.md` accepted as redundant decoration. On the real ground it reads
  as intended: the name carries the identity, the square only seconds it.
- **On the card, the marker sits where it was drawn**, between the date and the
  title, and the violet square does not compete with the accent-red lineup pills
  below it — the collision the spec anticipated does not occur, because the two
  never take the same role.
- **On the night detail**, each night carries its own marker above its title,
  and the page shows no figure and no internal code anywhere.

Two honest limits on that look: it is a **headless** render of the **dev** server,
so it says nothing about a real device's touch behaviour, and **the swipe was not
performed by a finger.** The gesture path is conserved code plus one call added
inside a transition; that it does not wait is an argument from the shape, not an
observation. 36-13's procedure should end with a thumb.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking] `EventTabs` could not preserve `?format=` without being told it**

- **Found during:** Task 1.
- **Issue:** the plan requires every tab href to preserve the format parameter,
  and the filtered empty states to name the format. Neither is derivable inside
  the component: the client must not read the query string (D-36-16), so both the
  slug and the name have to arrive as props. `src/app/(public)/events/page.tsx`
  is not in this plan's `files_modified`.
- **Fix:** the page now resolves the active format to its **row** rather than to
  its slug alone, and passes two fields — `{ slug, name }` — to `EventTabs`. One
  lookup, one answer: two lookups would be two places for the allow-list to
  drift. Nothing else about the page changed, and no total, tally or aggregate
  crosses the boundary.
- **Why this was safe to do to another plan's file:** 36-11 owns it and is
  complete; no plan ahead lists it in `files_modified` (36-08, the only plan
  executing in parallel, touches `src/app/(admin)/admin/formats/**` alone).
- **Files modified:** `src/app/(public)/events/page.tsx`
- **Commit:** `366beff`

**2. [Rule 2 — Missing critical] The night-detail parties query discarded its error**

- **Found during:** Task 2.
- **Issue:** the line was `const { data: rawParties } = await …`. Adding an embed
  that PostgREST can refuse makes that untenable — and the refusal it can return
  was measured today, on this exact query. PostgREST answers `data: null` with
  **no exception**, and this page has no `try/catch` around that read, so the
  page would render an event with **no nights at all**: no times, no venue block,
  no ticket selection, no marker. A healthy-looking lie on a public surface that
  nothing in this project would report, since there is no error tracking here.
- **Fix:** the error is destructured, logged under its own category, and split by
  cause exactly as `/events` splits it. A refusal carrying a SQLSTATE or `PGRST…`
  code is a defect and is thrown, so it reaches Next's error boundary. A
  transport failure carries no code, and **its behaviour is left exactly as it
  was.**
- **Files modified:** `src/app/(public)/events/[slug]/page.tsx`
- **Commit:** `9967656`

**3. [Rule 2 — Missing critical] The filtered empty state renders a format name outside `FormatMarker`**

- **Found during:** Task 1.
- **Issue:** `Nothing announced for {Format}` is the one place on this surface
  where a format name is rendered by an element that is not `FormatMarker` — and
  the casing property is **inherited**, so "we did not ask for a transform" holds
  only until an ancestor asks for one. Two elements on this very page ask for one.
- **Fix:** that paragraph carries the casing declaration itself, with the reason
  beside it. Same rule, same enforcement, one more element.
- **Files modified:** `src/app/(public)/events/EventTabs.tsx`
- **Commit:** `366beff`

### Departures from the plan text, deliberate and stated

1. **The two tabs stay `<button>`s and did not become anchors.** `36-UI-SPEC.md`
   §S1 describes the time axis as `<Link replace>` and its accessibility contract
   claims the tab links work without JavaScript. This plan's action text is
   explicit about the mechanism instead — `setActiveTab` plus `router.replace`
   inside a transition — and the two asks cannot both be met by one element: a
   `<Link>` click would move the panel only after the navigation resolved, which
   is the exact failure the plan was written to prevent. Buttons were kept so
   **tap and swipe traverse the same code path**; two mechanisms for one state
   transition is how they drift apart. The tab row was already script-only before
   this plan, so nothing regressed — and the filter row, which is the control
   FMT-04 depends on, remains anchors and still works with no script.
2. **The `Show all events` link is not in the interaction accent.**
   `36-UI-SPEC.md` reserves that hue for a named list this link is not on. It is
   `text-foreground` with an underline instead.
3. **The acceptance grep for the client query-string reader is satisfied
   literally, not merely reported.** The comment that explains the absence was
   rewritten to carry the meaning without naming the hook, so
   `grep -c "useSearchParams"` returns **0** rather than 1 — the pattern 36-11
   established, applied where prose could carry the meaning.

### Not done, on purpose

- **No `FMT-*` ticked in `REQUIREMENTS.md`** — D-36-19. FMT-06 in particular
  cannot be proved from this surface: `/events` reports "no difference" because
  RLS refuses unpublished rows to `anon` regardless of what the page decides, and
  the page says so in its own comment. The proof is 36-13's written procedure
  against a night seeded unpublished on purpose.
- **Nothing under `src/app/(admin)/admin/formats/` was touched** — 36-08 owns
  those files and was executing in parallel.
- **`FormatMarker` was mounted, not edited.** It already carried everything both
  surfaces needed.

---

## The acceptance greps, honestly

`src/app/(public)/events/EventTabs.tsx`:

| Gate | Asked | Got |
|---|---|---|
| the client query-string reader | 0 | **0** |
| `useTransition` | ≥1, every `router.replace` inside it | 2 (import + call); both `router.replace` calls sit inside `startTabNavigation` |
| `router.push` | 0 | **0** |
| `Nothing announced for` | 1 | **1** |
| a figure in any empty state, heading or link | none | none |
| the shouting classes | only the pre-existing tab labels | **2 hits, both on those two labels** |
| the reversed e | 0 | **0** |
| marker row between the date and the title, joiner `aria-hidden` | yes | verified in the rendered HTML |
| every tab href a template literal preserving `?format=` | yes | verified in the rendered HTML |

`src/app/(public)/events/[slug]/page.tsx`:

| Gate | Asked | Got |
|---|---|---|
| `FormatMarker` | ≥1, above `party.title` | **2** (import + mount), mounted directly above it |
| `.select(… code | number …)` | 0 | **0** |
| the predicate, and why it is not the other one | stated in a comment | stated, with a paragraph on the difference |
| the reversed e | 0 | **0** |

`isVenueVisible` appears five times in that file: the function, three
pre-existing lines, and the one comment this plan added to name the predicate it
does **not** use — which the plan's own action text required be written down.

---

## Deferred Issues

**`npm run lint` is red on `EventTabs.tsx`, and was before this phase.** Four
`react-hooks/refs` errors on two lines that read a ref during render — the drag
maths and the `touchAction` style. Both lines are older than this plan and
untouched by it (this plan's diff contains neither), so they fall outside the
scope boundary; repairing them means changing how the gesture measures itself,
which is the one behaviour this plan was written to conserve. Recorded as **D5**
in `deferred-items.md`. `npm run build` and `npx tsc --noEmit` were used as the
gate instead, and both are green. The one warning on the night-detail page — an
unused icon import — is likewise pre-existing.

---

## Known Stubs

None. No placeholder string, no mock, no default colour, no hardcoded empty
value. The one case that renders nothing — a night whose format row the reader
was refused — is a **decision** with its reason in the code: the refusal comes
from the same policy that gates the catalogue, so an absent row means a format
nobody has announced, and a placeholder there would announce it.

## Threat Flags

Each entry of this plan's register, with what closed it:

| Threat | Closed by |
|---|---|
| T-36-12-01 · the filtered empty state as a channel | One string for every format, computed from the rendered array; no second query exists on either surface |
| T-36-12-02 · the series name on a secret night | The per-night stored flag, `!== false`, declared in the code beside the predicate it is not |
| T-36-12-03 · the figure or the codes reaching a public surface | Neither is fetched by either surface; enforced at the query, not at the template |
| T-36-12-04 · a swipe waiting on a navigation | Local state drives the animation; the navigation runs inside a transition; both arrays stay props |
| T-36-12-05 · the history stack flooded by a gesture | `replace` on both paths; `grep -c "router.push"` is 0 |
| T-36-12-SC · package installs | No package installed |

No security surface beyond the register. One note that is not a flag: the two
probes read production with the anonymous key, both were `GET`, both printed
shapes and booleans only, and both live outside this repository.

## Self-Check: PASSED

- `src/app/(public)/events/EventTabs.tsx` — present, contains `router.replace` and `useTransition`
- `src/app/(public)/events/[slug]/page.tsx` — present, contains `FormatMarker`
- `src/app/(public)/events/page.tsx` — present, passes the active format's two fields
- `366beff`, `9967656`, `5b94277` — all present in `git log`
- No tracked file deleted by any commit (`git diff --diff-filter=D` empty for each)
- `npm run build` exits 0; `npx tsc --noEmit` exits 0
- No venue name, unannounced date, line-up or personal name appears in this file

---
*Phase: 36-formats-series-numbering*
*Written and verified: 2026-08-10. Two green builds, one clean typecheck, two
read-only production probes — and one browser, finally.*
