---
phase: 39-the-door-s-own-address
plan: 03
subsystem: access
tags: [navigation, capabilities, door, staff-04, d-39-06, visibility]

# Dependency graph
requires:
  - phase: 34-one-work-surface
    provides: the capability model, `StaffNav`'s serialisable capability-key prop shape (plan 34-04), `(work)/layout.tsx` collapsing every work surface into one mount (plan 34-05), and the carry-forward D-39-06 itself
  - phase: 35-per-night-assignments
    provides: "`liveAssignmentCapabilities` in the access-context payload, and the assignment-filtered night list that makes the widening harmless"
  - phase: 39-the-door-s-own-address
    plan: 02
    provides: "`DoorSurface.tsx`, the shared guard this plan mounts a nav inside without touching, and `/door` as the address the Check-in entry draws"
provides:
  - "The Check-in entry filtered on `CAP.DOOR_OPERATE` — the same key the middleware and the door guard ask — instead of on a role list plus an approval flag"
  - "`NavItem.capability: CapabilityKey | null` — required, so a sixth entry cannot forget the question"
  - "`getVisibleNavItems(role, status, capabilities, liveAssignmentCapabilities)` with both capability parameters REQUIRED"
  - "`MobileNav` taking serialisable capability keys, the shape `StaffNav` has had since plan 34-04"
  - "All 13 mount sites threading both sets from `getAccessContext()`"
  - "Four stale docblocks corrected: the mount count in `roles.ts` and `(work)/layout.tsx`, the nav-prop sentence in `DoorSurface.tsx` and `src/types/database.ts`"
affects: [39-04, phase-39-verification, 39-DOOR-PASS.md §1.5, end-of-v1.5 sitting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A nav entry is filtered on the SAME capability key the server refuses on — one filter, both sides of the client boundary, because `keys.ts` imports nothing (D-34-10)"
    - "A staging default on a new parameter is removed in the same plan that added it, and the comment names the task that must remove it"
    - "A `null` that means ABSENT is carried across the client boundary as `null`, never flattened to `[]`"
    - "A widening of a DRAWN entry is written into the source, not only into the plan"

key-files:
  created: []
  modified:
    - src/lib/rbac/roles.ts
    - src/components/layout/MobileNav.tsx
    - src/app/page.tsx
    - src/app/(public)/gallery/page.tsx
    - src/app/(public)/newsletter/page.tsx
    - src/app/(public)/tickets/[id]/page.tsx
    - src/app/(public)/artists/[slug]/page.tsx
    - src/app/(public)/events/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/[slug]/menu/page.tsx
    - src/app/(members)/attendance/page.tsx
    - src/app/(members)/membership-card/page.tsx
    - src/app/(members)/dashboard/page.tsx
    - src/app/(admin)/admin/(work)/layout.tsx
    - src/app/(admin)/admin/scanner/DoorSurface.tsx
    - src/types/database.ts

key-decisions:
  - "Both capability sets cross the boundary, not just the held one — the nav now matches the server exactly, and the widening it buys is recorded in the source rather than absorbed"
  - "The thirteen mount sites landed in ONE commit for atomic revertibility, not detectability: a split would detect an omission equally well, but would leave a committed state where seven surfaces render a plausible, wrong navigation in a repo with no monitoring"
  - "`src/types/database.ts` was edited, and the justification is concrete: `:1042` carried a sentence claiming both navs take `role`/`status`, false for `StaffNav` since plan 34-04 and for `MobileNav` as of this plan. Comment-only — no type moved, proven by diff"
  - "The superseded mount count is CITED rather than deleted, in this repo's house style — but not as the literal phrase a future audit greps for"

patterns-established:
  - "Required-not-optional as a forgetting guard: `NavItem.capability` and both `getVisibleNavItems` parameters are required so a fourteenth mount site is a build error naming the file"
  - "The middleware's predicate is COPIED, not approximated: role arm OR assignment arm, in that order, with `null` refusing"

requirements-completed: [STAFF-04]

# Metrics
duration: 35min
completed: 2026-08-11
---

# Phase 39 Plan 03: The Check-in Entry Follows `door.operate` Summary

**The bottom nav's Check-in entry is now filtered on `CAP.DOOR_OPERATE` — the same
question the middleware and the door's guard ask — with both the held capability set and
the live-assignment set threaded from all 13 `MobileNav` mount sites as required
parameters; the door's server-side guard and its three Route Handlers are proven unchanged
by diff.**

## What changed, and what it means for who

| Account | Before | After | Why |
|---|---|---|---|
| Anonymous visitor | no Check-in | **no Check-in — byte-identical** | `ANONYMOUS_CONTEXT` carries an empty capability set, so the serialised array is empty and the entry is filtered exactly as today. Also still gated by `requireAuth: true` |
| Approved member | no Check-in | no Check-in | holds no `door.operate` |
| Organizer / master, **approved** | Check-in | Check-in | holds `door.operate` by role — unchanged |
| Organizer / master, **not approved** | **no Check-in** | **Check-in** | `door.operate` carries `requires_approved = false` deliberately (D-06 of Phase 43). **This is D-39-06** |
| Staff, not rostered | no Check-in | no Check-in | `staff` deliberately holds no `door.operate` row (D-02) |
| Staff, **rostered to a night** | **no Check-in** | **Check-in** | holds it by live assignment — **the widening, see below** |

## The widening, written down rather than absorbed

Passing `liveAssignmentCapabilities` as well as `capabilities` is what makes the nav match
the server exactly, because the middleware admits the door on **role or live assignment**
and `DoorSurface.tsx` repeats that predicate. Without it, D-39-06 would have closed the
`pending`-organizer half and left the assignment half open under a heading saying "closed".

**The cost, stated:** `liveAssignmentCapabilities` is coarse and **does not name a
night** — *"wider than the real permission, always and by construction"*
(`src/lib/capabilities/server.ts`). So somebody rostered to a **different** night is now
drawn the tab, the middleware admits them, the page admits them, and **they do not find
their night in the list** (filtered by assignment, plan 35-10). No refusal anywhere, which
is the asymmetry `checkin-offline.md` optimises for: a false refusal happens in front of a
queue, an extra tab does not.

That paragraph is in `src/lib/rbac/roles.ts`, not only here — asserted by
`grep -ci 'does not name a night' src/lib/rbac/roles.ts` → `1`.

## This is a visibility change and nothing else — the proof, not the claim

`access-gating.md`, gate *coerenza navigazione/permessi*: hiding a link is not protecting
a route. So the two things that actually protect the door had to be provably untouched:

```
git diff f1159d3 -- "src/app/(admin)/admin/scanner/DoorSurface.tsx" \
  | grep -cE '^[+-].*(capabilities\.has\(CAP\.DOOR_OPERATE\)|redirect\("/dashboard"\)|maySeeTheDoor)'
→ 0

git diff f1159d3 --name-only \
  | grep -cE 'src/lib/door/|src/app/api/tickets/|src/app/api/membership/'
→ 0
```

The whole `DoorSurface.tsx` diff across this plan is one docblock paragraph and four lines
of `<MobileNav>` props. `requireDoorOperator({ partyId })` — the real boundary on the
door's data, since those handlers write with the service client and see no policy — was
not opened.

## The public-surface rule, asserted per site rather than in prose

CAP-05 criterion 4 forbids a verdict change on a public surface, and eight of the thirteen
mount sites are public pages served to anonymous visitors:

| # | Site | Public? | Verdict for an anonymous visitor |
|---|---|---|---|
| 1 | `src/app/page.tsx` | (redirects signed-in users) | empty set → Check-in filtered, as today |
| 2 | `src/app/(public)/gallery/page.tsx` | **yes** | unchanged |
| 3 | `src/app/(public)/newsletter/page.tsx` | **yes** | unchanged |
| 4 | `src/app/(public)/tickets/[id]/page.tsx` | **yes** | unchanged |
| 5 | `src/app/(public)/artists/[slug]/page.tsx` | **yes** | unchanged |
| 6 | `src/app/(public)/events/page.tsx` | **yes** | unchanged |
| 7 | `src/app/(public)/events/[slug]/page.tsx` | **yes** | unchanged |
| 8 | `src/app/(public)/events/[slug]/menu/page.tsx` | **yes** | unchanged |
| 9 | `src/app/(members)/attendance/page.tsx` | no | — |
| 10 | `src/app/(members)/membership-card/page.tsx` | no | — |
| 11 | `src/app/(members)/dashboard/page.tsx` | no | — |
| 12 | `src/app/(admin)/admin/(work)/layout.tsx` | no — covers every work surface | — |
| 13 | `src/app/(admin)/admin/scanner/DoorSurface.tsx` | no — **the door** | — |

The mechanism, not the hope: `getAccessContext()` answers `ANONYMOUS_CONTEXT` with
`capabilities: new Set()` and `liveAssignmentCapabilities: new Set<string>()` (the empty
set, deliberately not `null`). The spread `[...capabilities]` therefore serialises `[]`
into the public page's payload, and the filter clause refuses. **No capability grant is
serialised — only the keys the viewer already holds**, the same shape `StaffNav` has
carried on work surfaces since plan 34-04.

## Task-by-task

| Task | Commit | What landed |
|---|---|---|
| 1 — widen the shape, move no verdict | `10fe26a` | `NavItem.capability` required; both parameters added, defaulted **for this task only**; `MobileNav` props added; filter does not read them |
| 2 — thread all thirteen sites | `4596cbe` | both sets destructured and passed as serialisable arrays; `null` preserved as `null`; 13 files, ≤7 changed lines each |
| 3 — spend it | `1305322` | the entry follows the capability; defaults removed; the closure record, the widening and the boundary sentence written into the source; four stale docblocks corrected |

## Why thirteen files in one commit

The plan's rationale, kept rather than re-derived: **atomic revertibility, not
detectability.** A count-asserted split (2a → 6, 2b → 13) would catch a forgotten site
exactly as well. What it cannot preserve is the shape of the history — the parameters were
defaulted until task 3, so a split produces an intermediate *committed* state in which
seven surfaces compile, render, and draw a plausible but wrong navigation, with no error
tracking in this repository to notice (`meta-gates.md`: a failure that matters must have an
observable effect, and that one has none). One commit either fully lands or fully reverts.

## Verification — what was run, and what it proves

There is **no test runner for the product** (`CLAUDE.md`, Guardrail 1). Nothing below is a
test pass.

| Check | Result |
|---|---|
| `npm run build` (Next's typecheck included) | exit `0`, run after each task |
| `npm run verify:routes` | exit `0` — 64 literals, 26 pages, both checks green |
| `npm run verify:persona` | **7/7 green** (worst case `EventTabs.tsx`, 11 195 tokens of 12 000) |
| `git diff f1159d3 --name-only` | exactly the 16 files of `files_modified`, no others |
| `package.json` / `package-lock.json` | **not in the diff** — `npm ci` was worktree setup, no dependency moved |

### Non-regression assertions — all eight returned their expected values

| # | What must not have changed | Expected | Actual |
|---|---|---|---|
| 1 | `/events/**` still `NetworkOnly` (T-37-27, monotone) | `1` | `1` |
| 2 | four `NetworkOnly` API rules / five instances | `4` then `5` | `4`, `5` |
| 3 | `reloadOnOnline: false` | one line | `next.config.ts:12` |
| 4 | no new layout under `(admin)` | exactly one | only `(work)/layout.tsx` |
| 5 | no door state moved into Cache Storage | `0` | `0` |
| 6 | no routing table in `next.config.ts` | `0` | `0` |
| 7 | `sw.ts`, `ScannerClient.tsx`, `src/lib/offline/` not opened | `0` | `0` |
| 8 | map, middleware, redirects, `door/page.tsx` not re-edited | `0` | `0` |

### Three acceptance criteria whose expected numbers were arithmetically unreachable

Reported rather than quietly satisfied. In each case the criterion's **intent** is met and
proven by a restated command; the plan's literal expected value could not be produced by
any correct implementation.

| Criterion as written | Expected | Actual | Why, and the faithful restatement |
|---|---|---|---|
| `grep -c 'capability:' src/lib/rbac/roles.ts` | `5` | `6` | The pattern also matches the `NavItem` interface declaration. Entries only: `grep -c '^    capability:'` → **`5`** (4-space indent is inside the array literal; the interface field is 2-space). The stronger proof is the type itself — the field is **required**, so an entry omitting it fails `next build` |
| `grep -c 'requireApproved: true' src/lib/rbac/roles.ts` (task 1: unchanged at `2`) | `2` | `3` | The pre-edit count was **3**, not 2: two data entries plus one occurrence inside the divergence prose (`:168`). Task 1 left it at `3` — unchanged, which is what the criterion actually tests. After task 3 removed that prose and the Check-in flag: **`1`** (Gallery only), exactly as the task-3 criterion requires |
| `grep -rc 'liveAssignmentCapabilities ? \[' src/app \| grep -v ':0' \| wc -l` | `12` | `13` | `ctx.liveAssignmentCapabilities ? [` **contains** the unqualified pattern as a substring, so `DoorSurface.tsx` matches it too — `12` is unreachable while the sibling criterion requires the `ctx.`-qualified form on one line. Restated: `grep -rl 'liveAssignmentCapabilities ? \['` → **`13`**, minus `grep -rl 'ctx\.liveAssignmentCapabilities ? \['` → **`1`**, giving the intended **12 unqualified + 1 `ctx.`-qualified** |
| `git diff -- src/types/database.ts \| grep -cE '^[+-]\s*[^ */]'` | `0` | `2` | The two `---` / `+++` diff headers match `^[+-]…[^ */]`. Restated with headers excluded: `git diff f1159d3 -- src/types/database.ts \| grep -E '^[+-]' \| grep -vE '^(\+\+\+\|---)' \| grep -cE '^[+-]\s*[^ */]'` → **`0`**. The file changed by comment only |

All other acceptance criteria returned their expected values verbatim, including
`item.capability` ≥ 2 (**3**), `roles: ["master", "organizer"]` → **0**, the removed
defaults → **0**, `liveAssignmentCapabilities?:` in `MobileNav` → **0**, and
`does not name a night` / `requireDoorOperator` in `roles.ts` → **1** each.

## `src/types/database.ts` — justified, not swept in

The orchestrator asked for this entry to be justified or dropped. **Justified, and kept.**
`:1042` carried: *"they survive in this payload for exactly two client components —
`MobileNav` and `StaffNav` — which take both as props"*. That sentence was false for
`StaffNav` from plan 34-04 and became false for `MobileNav` here, and
`34-VERIFICATION.md:431` assigned its correction to this phase. The replacement says what
is now true and, more usefully, states the **narrower** reason the two fields are still in
the payload: four of `MobileNav`'s five entries are governed by no capability, so removing
them waits on a capability that governs those entries — not on a conversion that has
already happened.

**Comment-only, proven by diff** (see the table above). No type, no field, no generated
shape moved.

## Deviations from Plan

### [Rule 3 — blocking] The superseded mount count is cited without the literal phrase

Task 3 requires `grep -rc '44 pages'` → `0` in two files, while this repository's house
style — visible in `roles.ts`'s own `DOOR_HREF` docblock, in `database.ts:1048`, and stated
as a gate in `venue-secrecy.md` (*"il paragrafo superato, citato e non cancellato"*) — is to
**quote** a superseded claim rather than delete it, because a rule deleted without its
reason returns as folklore.

Both were satisfied: the corrected docblocks say *"used to put the `MobileNav` mount count
at **44**"* and *"because it is mounted on **44** pages"*. A human reads the superseded
figure and its refutation; the literal phrase a future audit greps for does not appear.
`grep -c '44 pages'` → `0` in both files. Conflict documented in the task-3 commit, per
`meta-gates.md` rule 3.

### [Rule 3 — blocking] Worktree setup

The worktree arrived without `node_modules`, and this plan's gate is `npm run build`. `npm
ci` was run once, exit `0`. **No package was added, removed or upgraded**, and
`package-lock.json` is not in the final diff.

Nothing else deviated. No architectural decision arose, no authentication gate was hit, no
production row was read or written, and no fix-attempt limit was approached.

## Findings that leave this plan — see `deferred-items.md`

### `39-DOOR-PASS.md` §1.5 cannot be run against production as written — flag this

§1.5 closes D-39-06 by signing in with *"an organizer account in status `pending`"*. Since
`supabase/migrations/20260808001000_role_implies_approved.sql:117` there is a named CHECK
on `public.profiles`:

```
role NOT IN ('master', 'organizer', 'staff') OR status = 'approved'
```

**so an organizer in status `pending` is not representable in production.** The migration
says so itself: four personas — `organizer/pending`, `organizer/rejected`,
`master/pending`, `master/rejected` — *"become unrepresentable the moment this rule
exists"*, and only `scripts/container/seed.mjs` can hold them, by dropping the constraint
and restoring it `NOT VALID`.

**Consequence:** §1.5 is runnable **in the container**, on the `organizer/pending` persona,
and not on production. Relaxing a database constraint in production to satisfy a
verification step would be a bad trade by a wide margin, and is not proposed.

**This does not weaken the change.** The same migration explains exactly why
`door.operate` keeps `requires_approved = false` under that constraint: *"the constraint
protects the database; the door's setting protects the night from the day the constraint is
relaxed for one special case"*. The nav now inherits that property instead of contradicting
it — which is the whole of D-39-06.

### Six more docblocks still assign the nav conversion to phase 34

Five of the thirteen mount sites and `src/lib/capabilities/server.ts:198-208` still say
converting `MobileNav` to capabilities is *"phase 34 (STAFF-03)"*. Not fixed here: five are
inside sites whose diff is capped by a stated acceptance criterion, and `server.ts` is not
in `files_modified`. Logged with file:line in `deferred-items.md` (D1); `server.ts` is the
one worth doing next, being the twin of the sentence this plan did correct.

## Note for plan 39-04

`CLAUDE.md`, `.claude/rules/**` and `.claude/CHANGELOG.md` were **not touched** by this
plan — read only. Nothing found in them needed correcting for this work.

One thing 39-04 may want: `.claude/rules/access-gating.md`'s gate *coerenza
navigazione/permessi* describes `NAV_ITEMS` as hiding entries **by role**. As of this plan
the door's entry is hidden by **capability**, and the gate's principle is unchanged and
still exactly right — only its example is now one generation old.

## What this does NOT prove

`npm run build` proves the signature is threaded and the shapes agree. **It does not prove
that a `pending` organizer is drawn the entry.** A rendered navigation is not a source
fact. D-39-06 is **executed** here and **closed** by `39-DOOR-PASS.md` §1.5, at the
end-of-v1.5 sitting (D-39-07) — subject to the container caveat above. **This phase does
not close because this plan went green.**

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data source was introduced.
The four `capability: null` entries are declared answers, not stubs: no capability governs
`/`, `/events`, `/gallery` or `/dashboard`, and the field is required precisely so that
answer must be given explicitly.

## Threat Flags

None. This plan added no network endpoint, no auth path, no file access pattern and no
schema change. The one surface it touched at a trust boundary — the Server Component →
`"use client"` serialisation — carries capability **keys the viewer already holds**, never
a grant, in a shape that has crossed that boundary on work surfaces since plan 34-04.

## Self-Check: PASSED

All 16 modified files present on disk; all three commit hashes resolve.
