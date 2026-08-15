---
phase: 44-the-production-calendar-comes-inside
plan: 13
subsystem: navigation, verification, written procedure
tags: [staff-nav, capability-model, ui-contract, mutation-proof, manual-procedure, venue-secrecy]
requires:
  - "44-09 — the calendar pages on disk, without which a static address is not in the generated route union"
  - "44-11 — the surfaces whose strings U1..U10 assert"
  - "44-12 — the two write paths, and the four-part procedure it specified for this plan to carry"
provides:
  - "the Calendar tab, resolved through CAPABILITY_ROUTES at module load"
  - "scripts/verify-calendar-surface.mjs — the ten assertions of 44-UI-SPEC.md §15, each proved by mutation"
  - "44-PROCEDURES.md — P1..P4, 67 numbered steps, 19 Result: pending"
affects:
  - "src/lib/routes/staff-tabs.ts — a seventh tab, and three counts corrected with it"
  - "scripts/verify-all.mjs — a fifteenth gate in the runner array"
  - "src/app/(admin)/admin/calendar/actions.ts — one constructed timestamp removed, because U3's exemption list reads none"
tech-stack:
  added: []
  patterns:
    - "page first, tab second — a static address enters the generated union only once a page.tsx serves it"
    - "a gate reads through scripts/lib/comments.mjs, never its own regex"
    - "a forbidden glyph is matched by code point and never written into the script that forbids it"
    - "a mutation is asserted to have LANDED before its result is read"
key-files:
  created:
    - "scripts/verify-calendar-surface.mjs"
    - ".planning/phases/44-the-production-calendar-comes-inside/44-PROCEDURES.md"
  modified:
    - "src/lib/routes/staff-tabs.ts"
    - "scripts/verify-all.mjs"
    - "package.json"
    - "src/app/(admin)/admin/calendar/actions.ts"
decisions:
  - "U3's empty exemption list was kept empty: the one live violation was resolved by changing the code, not by widening the gate"
  - "verify:calendar-surface belongs in verify-all's runner array and NOT in NEEDS_MATERIAL — it reads only tracked source"
  - "P3 is separated from the other three procedures: it writes to production and needs its own dated authorisation"
metrics:
  tasks: 3
  commits: 4
  completed: 2026-08-15
---

# Phase 44 Plan 13: The Navigation, the Ten Assertions and the Four Procedures — Summary

The calendar became reachable from the staff navigation, `44-UI-SPEC.md` §15's ten
string rules became a command registered in the aggregate, and the four things no
command in this repository can settle were written down as procedures with named
roles, named observations and a `Result:` per step — every one of them `pending`.

---

## What was built

### Task 1 — the Calendar tab (`f5392d4`)

A seventh entry in `src/lib/routes/staff-tabs.ts:130`, placed between Formats and
Newsletter: `/admin/calendar`, label `Calendar`, capability `CAP.PRODUCTION_READ`.

**Neither rejected workaround was used**, and the reason they were not needed is the
reason the entry could land now: plan 44-09 put `page.tsx` on disk at both
addresses, so both static addresses are in the generated route union and `Route`
accepts them. `grep -cE "as Route|@ts-expect-error|@ts-ignore"` returns 0.

The entry's comment carries the sentence that matters more here than on any other
tab: **hiding this tab protects nothing.** What this surface holds *is* the secret,
so a viewer who never sees the link is not thereby refused the rows — the refusal is
the middleware's, the page guard's, and the six RLS policies'. It is written on this
entry because a surface whose whole content is confidential is exactly where somebody
would be tempted to believe the menu is doing the work.

**Three counts were corrected from "six" to "seven"** (`:2`, `:88`, `:177`). A count
in a comment is a claim, and this repository says so in `capability-routes.ts:159`.

The module-load assertion at `:150-175` is the check for this task, and it is not
something that was added: it runs at import during `next build`, so `BUILD=0` does
mean the tab resolves through `CAPABILITY_ROUTES` to the same key it declares.

### Task 2 — `scripts/verify-calendar-surface.mjs` (`8f5d049`, `b7b3580`)

Ten checks, U1 to U10, scoped to the two calendar directories and nothing else, over
13 files. Registered as `verify:calendar-surface` in `package.json:28` and in
`scripts/verify-all.mjs`'s **runner array** — not in `NEEDS_MATERIAL` beside
`verify:ics`, and the distinction is the whole reason that third list exists: this
gate reads tracked source under `src/`, needs no `docs/` and no server, so it runs on
every machine.

Every file is read through `scripts/lib/comments.mjs`. That is not tidiness:
`actions.ts:88` and `(work)/calendar/page.tsx:97` both say in their docblocks that a
venue word reaches no `console.*`, and a dozen more spell `normal-case` while
explaining why it is declared. A check reddening on the comment that explains why it
should be green is a check somebody disables.

### Task 3 — `44-PROCEDURES.md` (`e016db6`)

Four procedures, 67 numbered steps, **19 `Result:` lines and all 19 read `pending`**.
No venue, no unannounced date, no line-up, no personal name; `verify:persona` 7/7
green, including check F.

P3 and P4 **carry** 44-12-SUMMARY.md's parts C/D and A/B rather than re-deriving them,
which is what that plan asked for. P3 adds the one observation 44-12 wrote and
explicitly did not prove: the **anonymous read of the public event page, with no
cookie**, against the venue-secrecy decision.

---

## The mutation table

All ten broken, the mutation **asserted to have landed by reading the file back
before any verdict was read**, the check observed to fire naming that exact id, then
restored by a per-file `git checkout --` and asserted byte-identical. `git status
--porcelain` was clean after the tenth restoration, and the check exits 0 on the
restored tree.

| # | The mutation | Evidence it landed | Observed failure | Evidence it was restored |
|---|---|---|---|---|
| U1 | the candidate-mix word written contiguous into a live constant in `PiecesSection.tsx` | the contiguous token read back from disk | exit 1 — `U1 (1 occurrence)` | file byte-identical to pre-mutation |
| U2 | `type="date"` in a live string in `ChecklistSection.tsx` | `type="date"` read back | exit 1 — `U2 (1 occurrence)` | byte-identical |
| U3 | `new Date()` appended live to `dates.ts` | `new Date()` read back | exit 1 — `U3 (1 occurrence)` | byte-identical |
| U4 | `row.conforms_to_rule` appended to `CalendarList.tsx`, a `.tsx` | `row.conforms_to_rule` read back | exit 1 — `U4 (1 occurrence)` | byte-identical |
| U5 | in `ChecklistSection.tsx`, the formatter's argument renamed to a piece-bound one | `formatCivilDate(piece.dueDate)` read back | exit 1 — `U5 (1 occurrence)` | byte-identical |
| U6 | an `emphasis` badge on a third fact in `StageBadge.tsx` | `tone="emphasis">Announced` read back | exit 1 — `U6 (1 occurrence)` | byte-identical |
| U7 | an amber utility string in `StageBadge.tsx` | the amber token read back | exit 1 — `U7 (1 occurrence)` | byte-identical |
| U8 | the sigla span's class swapped from the transform-carrying constant to one without it | `<span className={REASON}>{row.sigla}</span>` read back | exit 1 — `U8 (1 occurrence)` | byte-identical |
| U9 | the reversed glyph inserted into `StageBadge.tsx`, written from its code point | the glyph read back | exit 1 — `U9 (1 occurrence)` | byte-identical |
| U10 | `console.error` interpolating a venue word appended to `actions.ts` | the interpolating call read back | exit 1 — `U10 (1 occurrence)` | byte-identical |

### Two of the ten did not fire on the first round, and that is the finding

The obligation earned its place twice in one sitting, in **both** error directions.

**U1 — the harness was wrong, not the gate.** The first mutation wrote the forbidden
word as two concatenated halves, so no such contiguous string existed, and the check
correctly saw nothing. Had the assertion been *"the file changed"* rather than *"the
token is present"*, this would have been recorded as a check that fires. It was
rewritten to land the token contiguous, and it fired.

**U8 — the gate was wrong, and it was blind.** The first version asked that the text
between an element's `>` and the literal be whitespace and an opening brace. That is
true of `{nightTitle(row)}` and **false of two shapes actually on this surface**:
`{row.sigla}`, where the matched subject sits mid-expression, and the brand written
as an element's own text. Both were being silently skipped — U8 had never checked
them, and would have shipped green forever. It now asks the only thing that matters:
**no tag opens between the element and the literal**, which holds for an expression
child and a text child alike. A closing tag is skipped rather than guessed at, because
reddening correct code is the direction that gets a gate deleted. Fixed in `b7b3580`,
re-mutated, fired, and no false red on the clean tree.

---

## Deviations from Plan

### 1. [Rule 1 — Bug] U3 went red on its first run, and the code changed, not the gate

- **Found during:** Task 2, first execution of the new check.
- **Issue:** `src/app/(admin)/admin/calendar/actions.ts:806` built a timestamp with
  `new Date().toISOString()` for `updated_at` on the announce-link update. U3's
  exemption list in `44-UI-SPEC.md` §15 reads **`none`**, and it was written before
  any of this code existed — which is the only order in which an exemption list means
  anything.
- **Why it was not exempted.** U3's *rationale* is about a civil date, and an instant
  cannot move a weekday, so calling this an exception was the obvious move. It was
  refused because the exception could only be spelled as a file-and-line allow-list —
  no string check can tell an instant from a civil date — and an allow-list rots while
  the sentence beside it goes on claiming the rule holds. The recorded precedent is
  `verify:touch-targets`, which went red on two real elements on its first run and
  had the elements fixed.
- **Fix:** the field was removed from the payload, which now carries the link and
  nothing else, with the full reasoning written beside it. **Nothing is lost:** no
  product code reads `production_plan.updated_at` (the import script maintains its own
  on the rows it touches), and the instant this write happened is recorded where it
  belongs — on the night the action just created, whose `created_at` defaults to
  `now()` and which is reachable through `linked_party_id`.
- **⚠ It touches the announcement act, and the owner should see it before P3 runs.**
  It cannot affect the link, the series number, the venue or any refusal — it removes
  an audit field nothing reads — but the file is Critical by domain and the change was
  not in the plan.
- **Files modified:** `src/app/(admin)/admin/calendar/actions.ts`
- **Commit:** `8f5d049`

### 2. [Rule 1 — Bug] U8 was blind to two shapes present on the surface

Described in full above. Found by the mutation obligation, not by review.
**Commit:** `b7b3580`

### 3. [Rule 2 — Missing critical] Three stale counts in `staff-tabs.ts`

The file said "six" in three places and there are now seven. `capability-routes.ts:159`
states the rule this repository applies to exactly this: *a count in a comment is a
claim*. Corrected in the same commit as the tab.
**Commit:** `f5392d4`

---

## Verification

| What | Result |
|---|---|
| `npm run build` | **0** — and the module-load assertion runs at import, so this does mean the tab resolves through the map |
| `npm run verify:routes` | **0** — 24 pages, 23 patterns, every page resolves |
| `node scripts/verify-calendar-surface.mjs` | **0** — 10 of 10, 13 files |
| `npm run verify:persona` | **0** — 7/7, check F included |
| `npm run verify` | **2 — REFUSED**, and it is not this plan's tree. See below |

**`npm run verify` exits 2, and the reason is pre-existing and already registered.**
14 gates passed — including `verify:calendar-surface`, which appears in the table at
exit 0, so the registration works. Three refused, none of them touched by this plan:

- `verify:capabilities` — no Supabase credentials on this machine. Its own note in
  `verify-all.mjs` says this is its honest state anywhere they are absent.
- `verify:conversion` and `verify:touch-targets` — both refuse **before measuring** on
  the shared conversion manifest, which still names the Finance and Analytics pages
  the owner had deleted on 2026-08-14. Already recorded as **D1 in
  `deferred-items.md`** by an earlier plan in this phase; nothing was added and
  nothing was fixed, per the scope boundary.

**A refusal is not a failure and it is not a pass**: nothing was measured by those
three, and this summary does not borrow their silence as evidence.

### What a green does NOT mean — the phase's closing sentence

Every automated check in this repository reads **declarations or files**. Not one of
them opens a session. `verify:routes` reads a map; `verify:calendar-surface` reads
strings; `verify:capabilities` reads rows through the Management API, **which connects
with a role that bypasses RLS** — so its read-back proves the six policies exist and
never that they refuse.

So criterion 4's real question — *is the calendar refused to somebody the capability
model does not admit* — **has no automated answer in this repository**. It has a
written procedure and a role. Until that procedure has a result, the criterion is open.

---

## The four procedures: run or deferred

**All four are DEFERRED. Every one of the 19 `Result:` lines reads `pending`.**

**Deferred is not verified.** This project has already said that sentence once, about
thirty-two entries, and it exists so a `[x]` never lands on a phase whose only open
point is that it is not yet proved.

| # | What it closes | Status | Why it could not run here |
|---|---|---|---|
| **P1** | criterion 4 — five roles × three levels | **deferred, pending** | needs five real sessions and each session's **own** access token. Nothing in this repository can authenticate as a role |
| **P2** | criterion 3 — does a proposal read as settled | **deferred, pending** | needs a second person who has **not** read the UI contract. Not a measurement; a judgement |
| **P3** | the announcement act, end to end | **deferred, pending — AND FLAGGED SEPARATELY** | see below |
| **P4** | the tick, and the two refusals staying two | **deferred, pending** | needs an approved organizer session and a door-assigned staff session |

**Batching.** P1, P2 and P4 create nothing and may be batched with the
end-of-milestone session, which is this project's standing pattern for
role-dependent checks. Recorded here as the recommendation, and it is the owner's to
accept.

**⚠ P3 cannot ride along, and this is the flag the plan asked for.** It **writes to
production**: it creates a container and a night, and it spends a series
progressivo — one of the three monotone guards, a number that is already on a poster
once assigned. It also creates something the public may see. It therefore needs its
**own authorisation, given on the day and naming P3**, and the document reserves a
step for writing that authorisation down and a later step for recording that it was
spent. `44-PROCEDURES.md` P3.0 also requires the snapshot to cover **every table
reachable by cascade, enumerated by reading the constraints**, and the removal to be
**by primary key from a list captured before the write** — the 2026-08-10 incident
recovered its events and nights from a snapshot and lost 63 rows across seven tables
that the snapshot did not cover.

---

## Known Stubs

None. No hardcoded empty value, no placeholder text and no unwired component was
introduced. The `pending` Results in `44-PROCEDURES.md` are not stubs: they are the
document's designed initial state, and the plan requires them.

---

## Threat Flags

None. No file changed here introduces a network endpoint, an auth path, a file-access
pattern or a schema change. The one product change **removes** a written field from an
existing update.

---

## Repository Safety

`.planning/` is tracked and this repository is public.

- `44-PROCEDURES.md` names **roles only** — *the account holding `production.read`
  through the `master` role*, *an organizer account in status `pending`*, *a `staff`
  account assigned to the door*. No name, no shift, no venue, no unannounced date, no
  line-up. A step says *open the first row* and never what the row says; where a count
  is recorded, the step says **the count only, never a row**.
- `verify-calendar-surface.mjs` prints file paths, line numbers and the offending
  token. Never a row's content.
- The reversed glyph is written in **neither** new file: the check builds it from
  U+0258 at run time, and `grep -c` on the procedures document returns 0.
- `re:sonate` is written with a normal `e` throughout.
- No utility class string is spelled as a literal in the new script (DEF-41-01):
  Tailwind compiles class strings out of comments, and `scripts/` is not ignored.

---

## Self-Check: PASSED

Files claimed, checked on disk:

- FOUND `scripts/verify-calendar-surface.mjs`
- FOUND `.planning/phases/44-the-production-calendar-comes-inside/44-PROCEDURES.md`
- FOUND `src/lib/routes/staff-tabs.ts` (modified)

Commits claimed, checked in `git log`:

- FOUND `f5392d4` — the Calendar tab
- FOUND `8f5d049` — the ten assertions, registered
- FOUND `b7b3580` — U8's blindness, found by mutation
- FOUND `e016db6` — the four procedures

Numbers claimed, re-measured against the files: 19 `Result:` lines and 19 of them
`pending`; 4 procedures; 67 numbered steps with no duplicate; 0 occurrences of the
reversed glyph; `grep -c 'label: "Calendar"'` = 1; `grep -cE "as Route|@ts-expect-error|@ts-ignore"` = 0.
