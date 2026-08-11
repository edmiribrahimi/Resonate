---
phase: 38-live-attendance-freshness
plan: 06
subsystem: check-in & offline (the door) — what the operator can see
tags: [live-attendance, freshness, LIVE-05, LIVE-02, derived-state, dark-venue]
requires:
  - "38-03's `lastFetchAtRef` — the monotonic age of the list, recorded only on a successful fetch"
  - "38-03's `requestReload(reason)` — the one entry point every reload trigger uses"
  - "38-03's `SAFETY_RELOAD_MS` (5 min) — reused as the staleness threshold, not re-declared"
  - "38-05's `channelLive` — written by `SUBSCRIBED` and lowered by the heartbeat, read by nothing until now"
  - "38-05's single `visibilitychange` listener, extended rather than duplicated"
provides:
  - "`formatListAge` / `stalenessBandText` — the two sentences this screen is allowed to say about freshness"
  - "`FRESHNESS_TICK_MS` (5 s) — the re-render pulse, guarded twice"
  - "`freshnessEpoch` — the render-visible shadow of the ref write, and the only signal that arrives strictly after it"
  - "`listAgeMs` / `listAgeLabel` / `listIsStale` — derived at render, the single expressions that answer how fresh the list is"
  - "the counter row as a labelled full-width `<button>` calling `requestReload(\"manual\")`"
  - "the staleness band, derived, beside the notices and outside their array"
affects:
  - "38-07 (the door procedures): P1 (a) and (c), P2 (b) and the LIVE-05 one-handed check are the only evidence any of this behaves"
tech-stack:
  added: []
  patterns:
    - "derived state rendered beside a stored family, because the store is replaced wholesale"
    - "a ref for the value, a counter state for the render — the counter is what an effect can depend on"
    - "an `aria-label` that carries the state as well as the action, because it replaces the button's contents"
key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/scanner/ScannerClient.tsx"
decisions:
  - "D-38-10 built: the existing counter row carries the age and IS the manual reload — no new element on the busiest screen"
  - "D-38-09 + D-38-19 built: the band is derived at render, never stored in `cacheNotices`"
  - "The band's third clause is `listAgeMs !== null` — before the first successful fetch of a night there is nothing to say about freshness"
  - "No haptic on the tap: every imported pattern is a scan **verdict** pattern (deviation, Rule 2)"
  - "The counter-row `aria-label` carries the counts as well as the action (deviation, Rule 2)"
  - "`lastFetchAtRef` reset on change of night — an age is a claim about a specific list (deviation, Rule 2)"
metrics:
  duration: ~50 min
  tasks: 2
  files: 1
  completed: 2026-08-11
---

# Phase 38 Plan 06: The Door Can See Its Own List — Summary

`ScannerClient.tsx` gains a 5-second freshness tick, an age on the counter row,
that row as a real full-width `<button>` that reloads on tap, and a staleness
band that is **computed at render** from `channelLive` and the age — rendered
beside the cache notices, deliberately not inside their array.

This is the plan that makes everything built in waves 1–3 reach a human. Until
now the reload discipline's only trace was a `console.info` and `channelLive` was
read by no expression. **This project has no error tracking** — `package.json`
carries no monitoring dependency — so the person holding the phone is the only
observer that exists, and this screen is the whole of it.

---

## What Was Built

### Task 1 — the age, ticking, on the row staff already read (`00da4ae`)

| Anchor | Line | What it is |
|---|---|---|
| `formatListAge` | `:302` | `updated Ns ago` below a minute, `updated Nm ago` above it |
| `FRESHNESS_TICK_MS` | `:415` | `5_000`, with the reason it is not `1_000` |
| `freshnessEpoch` | `:1058` | the render-visible shadow of the ref write |
| the re-render pulse | `:1060` | `const [, setAgeTick] = useState(0)` — a value nobody reads |
| `docVisible` | `:1065` | written by the file's one `visibilitychange` listener |
| the tick effect | `:1085-1093` | two early returns, cleanup in the effect that armed it |
| `setFreshnessEpoch` | `:1323` | immediately after `lastFetchAtRef.current = performance.now()` (`:1317`) |
| `setDocVisible(false)` / `(true)` | `:1441` / `:1458` | inside 38-05's existing handler, not a second one |
| `lastFetchAtRef.current = null` | `:2515` | in `handleChangeParty` |
| `listAgeMs` / `listAgeLabel` | `:2604-2607` / `:2608` | derived in the render body |
| the counter row as a button | `:2983-3037` | `type="button"`, `w-full text-left`, `py-2.5`, `requestReload("manual")` |

**Why two pieces of state and not one.** `lastFetchAtRef` is a ref, so writing it
re-renders nothing and no effect can depend on it. Keying the tick on
`attendance` — the obvious alternative — is **broken on the first fetch of a
night**: `setAttendance` runs at `:1154`, several `await`s before the age is
recorded at `:1317`, so the effect would re-run while the ref was still `null`,
take its early return, and never arm at all. `freshnessEpoch` is bumped on the
line immediately after the ref write, which makes it the only signal that arrives
strictly *after* the value it is reporting on.

**The age is computed in the render body, not stored.** What appears is therefore
the value at paint time, not the value at the last tick, and there is exactly one
expression in the file that can answer "how fresh is it". The interval exists
only to force the paint.

**The two guards on the tick are decisions.** No interval before the first
successful fetch — there is no age yet, and an interval ticking a number nothing
renders is battery with no reader. No interval while the document is hidden —
moot on the device this door runs on (an iOS home-screen PWA is *suspended*, not
throttled, as the safety timer's docblock already states) but real on Android,
where it would repaint a screen in somebody's pocket for eight hours.

**`performance.now()`, never `Date.now()`.** The rule was already written on
`lastFetchAtRef` by plan 38-03 and it extends here unchanged: the device clock is
**evidence, never authority**. `Date.now()` can step backwards on an NTP
correction — which happens exactly when the network returns, the worst possible
moment — and would print a negative age at a door. `grep -cE 'Date\.now\(\)'`
inside the counter-row block returns **0**.

**And there is no clamp at zero, on purpose.** `performance.now()` is monotonic,
so the age cannot go negative; if it ever did, `updated -3s ago` is a fault a
human can see and report, whereas clamping would print `updated 0s ago` — a claim
that the list is fresh. Of the two ways to be wrong, only one lies in the
direction of a door trusting a list it should not.

**Nothing on the row was replaced.** `Checked in`, the `x / y` figure, the
guest-list span, the percentage span and the progress bar are all still there;
the age was added beside `Checked in` as `· updated 12s ago`, in the same
`text-xs text-muted` — no dimmed variant, because the screen is read at minimum
brightness in a dark room.

### Task 2 — the band, derived, and outside the array that would erase it (`0c8b924`)

| Anchor | Line | What it is |
|---|---|---|
| `stalenessBandText` | `:317` | a transport fact and an age — never a sentence about the operator |
| `listIsStale` | `:2626-2627` | the derived boolean, three clauses |
| the F2 paragraph | `:3133-3165` | written where a reader tempted to "simplify" will be |
| the band | `:3166-3182` | `role="status" aria-live="polite"`, the two tone class sets, `requestReload("band")` |

**The threshold expression, as written:**

```tsx
  const listIsStale =
    listAgeMs !== null && (!channelLive || listAgeMs > SAFETY_RELOAD_MS);
```

`SAFETY_RELOAD_MS` is reused, not re-declared: five minutes is the threshold
because it is the point at which the parachute has **itself** already failed.
Before that, silence is accurate — and a screen that cried wolf every time a
night was opened would be a screen nobody reads by 01:00.

**The third clause is deliberate.** Before the first successful fetch of a night
there is nothing to say about freshness, and the failure that matters there
already has a voice: each of `fetchAttendance`'s three early-return branches
raises its own notice, and with the radio off the Offline pill is already saying
so. Its cost is stated under *Accepted costs* below.

**F2, resolved rather than papered over.** `setCacheNotices` replaces its array
**wholesale** on every fetch, including on the three early-return failure
branches at `:1112`, `:1135` and `:1169`. A band pushed into that array would be
erased by a **failed** refresh — precisely the moment it is the only thing
telling anyone that the list cannot be trusted. It would vanish exactly when it
mattered, and it would look correct in review. So the band is derived at render
and rendered as its own element immediately above the notices, inside the same
`role="status" aria-live="polite"` semantics and reusing the same two tone class
sets. Same visual and semantic family; separate storage. The paragraph saying so
sits above the JSX, not in this file.

**Tone follows which failure it is.** Yellow (`warn`) when the list is merely
old; red (`error`) when the channel is not live. A dead channel has no parachute
behind it and an old list does — the parachute is what will fix the second and
cannot fix the first.

**The band never names a permission** (D-38-04). `channelLive` being false covers
an expired token, a join rate limit and a Realtime restart exactly as readily as
a refused join; those four are indistinguishable from this device, so the band
reports what it can observe — *this device is not receiving live updates* — and
does not guess. `grep -icE 'not authoriz|not authoris|no permission|non
autorizzat'` over the whole file returns **0**.

**Two absences, both decisions, both commented.** Nothing at all renders while
healthy — not an empty container, not a green tick: a badge that says "fine" 99%
of the night is how the 1% stops being read. And no toast and no second notice
mechanism were added; the existing notices block is byte-identical.

**38-05's Known Stub is closed.** `channelLive` is now read by three expressions
— the derived boolean (`:2627`), the tone class (`:3173`) and the band's text
(`:3178`).

---

## Verification Evidence

`npm run build` → **exit 0**, run after every task (`next build --webpack`; there
is no separate `typecheck` script — the build is the type gate).

### What the green build proves, and what it cannot

**Proves:** the file compiles and typechecks as a whole; the JSX is well-formed;
`stalenessBandText` and `formatListAge` are called with the types they declare;
`listAgeMs` is narrowed to `number` before every use that requires it.

**Cannot prove — and this is most of what this plan is for:**

| Not proved | What settles it |
|---|---|
| that the number climbs, and that tapping returns it to zero | procedure **P1** (a) and the LIVE-05 one-handed check |
| that the band appears when the channel is blocked from the start | procedure **P1** (c) |
| that the band appears when the channel dies mid-night | procedure **P2** (b) |
| that the row is legible and hittable one-handed at minimum brightness | the LIVE-05 check — a build cannot answer a question about a thumb in the dark |

All four run in plan 38-07, from the text written in plan 38-01. The standing
caveat holds: **this repository has no test runner for the product** — no `test`
script, no `*.test.*`, no `*.spec.*`. Nothing here may be called "verified" on
the strength of a green build.

Assumption **A6** stays open, and it names the dangerous direction: the band
staying hidden while the channel is down. P1 (c) and P2 (b) are the only things
that check it.

### Task-1 structural checks

| Check | Result |
|---|---|
| `grep -cE 'requestReload\("manual"\)'` | **1** |
| `<button` inside the counter-row block | present at block line 17 (the two other matches are prose in the block's own comment) |
| `type="button"` inside the block | **1** |
| `aria-label` inside the block | present at block line 20 |
| `Date\.now\(\)` inside the block | **0** |
| `grep -cE '5_000'` | **1** — `FRESHNESS_TICK_MS` |
| `grep -c 'performance.now()'` | **4** → **2 real** (`:1317` the record, `:2607` the render) plus 2 prose citations |
| the row still renders `Checked in` / `x / y` / guest list / percentage | all four present in the extracted block |
| the tick's cleanup | `return () => clearInterval(tick)` in the effect that armed it |

The counter-row block was extracted with the plan's own range,
`awk '/Progress bar for selected party/,/^        \)\}/'` → **53 lines**, ending
on the block's real closing `)}`.

### Task-2 structural checks

| Check | Result |
|---|---|
| `grep -cE 'requestReload\("band"\)'` | **1** |
| `grep -cE 'setCacheNotices\(\[[^]]*stale'` | **0** — the band is not in the array |
| any state holding the band (`useState.*[Ss]tale\|setStale\|setBand`) | **0** — it is derived, mechanically asserted |
| `grep -cE 'role="status"'` | **3** (camera fault, the band, the notices) |
| `grep -cE 'aria-live="polite"'` | **3** |
| permission wording, whole file | **0** |
| `channelLive` read by an expression | `:2627`, `:3173`, `:3178` |

### The `setCacheNotices` figure — both forms, because the plan's own check is unsatisfiable

The plan's criterion is `grep -c 'setCacheNotices'` **= 6**. It returns **8**,
and the two extra lines are the F2 comment **the same plan instructed me to
write** — a comment that must name `setCacheNotices` twice to say why the band is
not in it. The check and the instruction cannot both be satisfied. Code was not
bent to the grep; the invariant was re-measured on the form the criterion means.

| Form | Base `c9aa0ab` | Now | Reading |
|---|---|---|---|
| `grep -c 'setCacheNotices'` (the plan's) | **6** | **8** | +2, both prose in the F2 paragraph |
| `grep -cE 'setCacheNotices\('` (call sites) | **5** | **5** | **the invariant: the band adds no writer** |

The five call sites are unchanged and in the same places: `:1112`, `:1135`,
`:1169` (the three early-return failure branches), `:1305` (the commit) and
`:2522` (the reset in `handleChangeParty`). `setCacheNotices` remains the single
writer of its own array.

### LIVE-02 — re-measured after the wave, beside 38-03's before-figure

```bash
awk '/(const|async function|function) <fn>/,/^  \};?$/' "$f" \
  | grep -cE 'channel|Channel|realtime|Realtime|channelLive'
```

| # | Function | Body (38-03) | Body (38-05) | Body (now) | Hits | Control |
|---|---|---|---|---|---|---|
| 1 | `handleVerify` | 55 | 55 | **55** | **0** | 7 |
| 2 | `ticketOffline` | 98 | 98 | **98** | **0** | 6 |
| 3 | `membershipOffline` | 54 | 54 | **54** | **0** | 2 |
| 4 | `ticketOnline` | 130 | 130 | **130** | **0** | 4 |
| 5 | `membershipOnline` | 87 | 87 | **87** | **0** | 2 |

**Assertion that the check can fail, taken before reading its result.** An empty
grep over an empty extraction is a false negative, and this project has a
recorded precedent for exactly that. The control column greps each same body for
a token that **is** present (`selectedPartyId` / `partyId`) and returns
7 / 6 / 2 / 4 / 2. The pipeline fires; the five zeroes are a real green.

The five bodies are byte-for-byte the same size as in both prior plans: this plan
added a display, and it did not put anything between a scan and its verdict.

### LIVE-07 — the door's mechanism is still only the door's

| Command | Output | Reading |
|---|---|---|
| `grep -rl "offline/checkin-store" src --include='*.ts' --include='*.tsx'` | `checkin/route.ts`, `ScannerClient.tsx` | **the naive form, and it counted 2 before this phase began.** The route hit is prose — two docblock citations, not an import |
| `grep -rln 'from "@/lib/offline/checkin-store"' src` | `ScannerClient.tsx` | **1 importer. LIVE-07 holds** |
| `git diff --name-only c9aa0ab` | `src/app/(admin)/admin/scanner/ScannerClient.tsx` | **one file, whole repo** |

Both figures are recorded rather than the convenient one being substituted — the
same discipline plans 38-03 and 38-05 applied to the same grep.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — a plan check that cannot be satisfied alongside the plan's own instruction] The `setCacheNotices` count**

- **Found during:** Task 2 verification.
- **Issue:** the plan's `(G)` check asserts `grep -c 'setCacheNotices'` **= 6**,
  while the plan's own action text requires writing F2 as a comment that names
  `setCacheNotices` and explains that its array is replaced wholesale. The naive
  grep counts prose, so the comment pushes the figure to 8. Satisfying the check
  literally would mean deleting the paragraph whose entire job is to stop the
  next reader undoing the design.
- **Fix:** no code was bent to a grep. The invariant was re-measured on the call
  form, `grep -cE 'setCacheNotices\('` → **5 before, 5 after**. Both figures are
  in the table above.
- **Files modified:** none.
- **Commit:** n/a (verification only).

**2. [Rule 3] The permission-wording tripwire fired on my own comment**

- **Found during:** Task 2 verification.
- **Issue:** `grep -icE 'not authoriz|not authoris|no permission|non autorizzat'`
  returned **1** — a bullet in the F2 paragraph that began *"No permission
  sentence, ever"*. Nothing was rendered; the match was prose. But unlike
  deviation 1 this one was worth fixing in the file rather than around it: this
  grep's whole job is to be a tripwire on that vocabulary **anywhere**, and prose
  that trips it teaches the next reader to ignore a red result.
- **Fix:** the bullet was reworded to the plan's own phrasing — *"The band never
  names a permission"* — which says the same thing and does not collide. **Both
  figures:** 1 before the rewording, **0** after, with the sentence's meaning
  intact and expanded.
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`.
- **Commit:** `0c8b924`.

**3. [Rule 2 — missing critical functionality] `lastFetchAtRef` is reset on a change of night**

- **Found during:** Task 1.
- **Issue:** the age is a claim about a specific list, and nothing reset it when
  the list changed. `setAttendance(eventData)` runs several `await`s before
  `lastFetchAtRef.current` is written, so there is a real window in which the row
  for a newly opened night would display **the previous night's** freshness. A
  number that names the wrong list is worse than no number.
- **Fix:** `lastFetchAtRef.current = null` in `handleChangeParty` (`:2515`), with
  the reason beside it. `null` means *not refreshed on this device for this
  night*, so nothing is rendered until the new night's first fetch lands.
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`.
- **Commit:** `00da4ae`.

**4. [Rule 2] The counter row's `aria-label` carries the counts as well as the action**

- **Found during:** Task 1.
- **Issue:** the plan specifies an `aria-label` naming the action, *"for example
  a label naming the action of reloading the attendee list now"*. Written that
  way literally it is a regression: an `aria-label` on a button **replaces**
  everything inside it for a screen reader, so the one screen carrying the
  counts would become the one place a screen reader cannot read them. It would
  also fail WCAG 2.5.3 (Label in Name), since the accessible name would contain
  none of the visible text.
- **Fix:** the label is composed and still ends by naming the action:
  ``aria-label={`Checked in ${totalCheckedIn} of ${totalAttendees}${listAgeLabel ? `, ${listAgeLabel}` : ""}. Reload the attendee list now.`}``
  — e.g. *"Checked in 12 of 40, updated 12s ago. Reload the attendee list now."*
  The plan's purpose (the label says what tapping does, because the visible text
  says something else) is intact.
- **Files modified:** `src/app/(admin)/admin/scanner/ScannerClient.tsx`.
- **Commit:** `00da4ae`.

**5. [Rule 2] No haptic on the tap — every imported pattern is a scan *verdict* pattern**

- **Found during:** Task 1.
- **Issue:** the plan says to give the tap a haptic *"if the file's existing
  haptics helper is already imported"*. It is — `vibrateSuccess`,
  `vibrateError`, `vibrateAlreadyRecorded`. But `haptics.ts` states in its own
  docblock why those three exist: *"The pattern is what tells the three outcomes
  apart when the screen is barely looked at."* They are a **vocabulary of scan
  verdicts**. Firing `vibrateSuccess` for a reload would put the word "admitted"
  on a non-verdict action, at a door, in the dark — and the asymmetry of this
  domain says a false "admitted" is the expensive direction.
- **Fix:** no haptic, with the alternatives rejected for stated reasons. A fourth
  pattern in `haptics.ts` is out of this plan's scope (one file), and an inline
  `navigator.vibrate` in `ScannerClient.tsx` would split the vocabulary across
  two files — the thing that docblock exists to prevent. The tap's non-colour
  feedback is instead the `active:` press state, the focus ring, and the age
  itself returning to `updated 0s ago` when the reload lands.
- **Files modified:** none (a deliberate omission).
- **Commit:** n/a.

**6. [Rule 3 — blocking, environment] The worktree had no `node_modules`**

- **Found during:** Task 1 verification.
- **Issue:** a git worktree carries no installed dependencies, and without them
  there is no build — the only automatic gate this repository has on product code.
- **Fix:** `node_modules` was **symlinked** to the main checkout's, after
  verifying `package.json` and `package-lock.json` are byte-identical between the
  two (`cmp -s` on both: identical). **No package was installed, added, removed
  or upgraded.** The symlink is git-ignored and appears in no commit
  (`git status --short` after both commits: empty).
- **Files modified:** none.
- **Commit:** n/a.

### Accepted costs, said out loud

**A red band can flash briefly when a night is opened.** The band's condition
becomes evaluable the moment the first fetch of a night succeeds; if the channel
has not reported `SUBSCRIBED` by then, the band shows red until it does. In
practice the HTTP fetch is the slower of the two (a round trip, an IndexedDB
merge and a second fetch for the member roster, against a WebSocket join), so it
usually will not appear — but it is not guaranteed, and **the direction of this
error is the one A6 demands**: showing a band that clears itself costs a glance,
hiding one costs a stale list nobody knows about.

**With no network from the moment a night is opened, there is no counter row and
no band.** The row already required `attendance`, which only a successful fetch
sets, and the band's third clause requires an age. In that case the Offline pill
and the notice mechanism are what speak — which they already did before this
plan. Stated rather than left for someone to discover; it is a property of this
design, not an unrelated find, so `deferred-items.md` was not used.

**The band and the counter row are two tap targets for one action.** That is
D-38-10 and D-38-09 together, and it is deliberate: the row is always available
(*"force a reload by hand at any moment"*), the band is what appears in the place
the eye goes when something is wrong. The reasons are distinguishable in the log
— `"manual"` and `"band"` — so the two are countable separately over a night.

**The build's workspace-root warning is environmental.** `next build` warns that
it inferred the workspace root because a second lockfile is visible above the
worktree. It is a property of running inside `…/Resonate/.claude/worktrees/…`,
not of this change.

---

## Cross-domain Impact

- **Check-in & offline (primary).** Nothing was added between a scan and its
  verdict — the five resolution paths are byte-identical in size and contain no
  reference to the channel, measured above. The reload the row triggers goes
  through `requestReload`, which defers behind `isProcessingRef` before it can
  reach IndexedDB, so a tap during a scan cannot delay a verdict either.
  **`checkin-offline.md`, gate *il fallimento va visto, non solo gestito*: this
  plan is that gate being satisfied** — the stale list and the dead channel now
  have an observable effect on the screen of the only observer that exists.
- **Next.js architecture, dark-venue gate.** The reload is a real `<button>`,
  full width at the house `py-2.5`, with a focus ring and an `active:` press
  state; it is reachable one-handed without moving the camera. Colour is never
  the only channel: the band carries a **sentence**, the age carries a **number**,
  and the tone classes only reinforce them. No new element was added to the
  busiest screen in the product — the row already existed. What a build cannot
  settle here is legibility at minimum brightness and hittability with a thumb;
  that is the LIVE-05 check in plan 38-07.
- **Access & gating.** Nothing here reads or writes `doorAuth` or `cacheDoorAuth`,
  re-derives no capability, and renders no sentence about the operator. D-38-04
  is enforced by the shape of `stalenessBandText`, which takes a boolean and a
  number and can say nothing else.
- **Supabase & data.** No migration, no schema change, no type change, **no
  production write of any kind**. No query was added; the only network call this
  plan can cause is the GET that `fetchAttendance` already makes.
- **Monotone guards** (`meta-gates.md`): none of the three is touched — no venue
  reveal, no payment state, no series numbering.
- **Zero silent failures.** No new `catch` and no new error path, so no new
  category was needed; the existing `scanner:reload` line already carries
  `reason`, and this plan adds two values to it (`"manual"`, `"band"`) so a tap
  is attributable to which surface produced it. The project's standing caveat is
  the reason this plan exists rather than a caveat against it: a log is a place
  nobody looks, and the band is the effect that a human can actually see.

---

## Threat Flags

None. No new network endpoint, no new auth path, no new file access pattern, no
schema change at a trust boundary. Nothing new leaves the device.

The register's dispositions were honoured:

| Threat | Disposition | How |
|---|---|---|
| T-38-06-01 | mitigate | the counter row always shows the age, so a clean screen is distinguishable from a screen that has not noticed — the half of LIVE-05 silence cannot satisfy |
| T-38-06-02 | mitigate | the band is derived at render and never enters `cacheNotices`; call sites of `setCacheNotices` 5 before and 5 after, and no state holds the band (**0** matches) |
| T-38-06-03 | mitigate | `performance.now()`, monotonic, driving exactly one branch. `Date.now()` inside the counter-row block: **0**. No verdict, refusal or admission reads it |
| T-38-06-04 | mitigate | the band reports a transport fact and an age; permission wording over the whole file: **0** |
| T-38-06-05 | accept | a full-width `<button>` at the house `py-2.5`; the worst outcome of a mis-tap is one extra GET, coalesced at 500 ms |
| T-38-06-SC | mitigate | **no package was installed, added, removed or upgraded.** `node_modules` was symlinked after proving both manifests byte-identical |

---

## Known Stubs

None. This plan closes 38-05's — `channelLive` is now read by three expressions.

What remains unrendered is not a stub but a stated boundary: **the migration this
whole phase depends on is still written-only**, behind plan 38-04's owner
checkpoint. Until it is applied, `channelLive` can be true and no message will
ever arrive — which is Pitfall 2's most deceptive failure and is exactly what
procedure **P5** exists to catch.

---

## Publication Check

`.planning/` is tracked and this repository is public. This file names roles —
"the operator", "the person holding the phone", "staff" — and never people. No
venue, no date of a night, no line-up, no project ref, no key, no URL.

---

## Self-Check: PASSED

| Claim | Command | Result |
|---|---|---|
| `ScannerClient.tsx` is the only file changed | `git diff --name-only c9aa0ab` | one path ✓ |
| commit `00da4ae` exists | `git log --oneline c9aa0ab..HEAD` | present ✓ |
| commit `0c8b924` exists | `git log --oneline c9aa0ab..HEAD` | present ✓ |
| build green | `npm run build` | exit 0, run after each task ✓ |
| no file deleted by either commit | `git diff --diff-filter=D --name-only HEAD~1 HEAD`, per commit | empty ✓ |
| no untracked files left behind | `git status --short` after each commit | empty ✓ |
| `STATE.md` / `ROADMAP.md` untouched | `git diff --name-only c9aa0ab` | absent ✓ — the orchestrator owns those writes |
| no production write | no migration, no probe, no `supabase` CLI invoked | ✓ |
