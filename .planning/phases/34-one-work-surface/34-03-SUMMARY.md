---
phase: 34-one-work-surface
plan: 03
subsystem: auth
tags: [middleware, capabilities, routing, redirects, door, refusal-states]

# Dependency graph
requires:
  - phase: 34-one-work-surface
    provides: "34-01 — `capability-routes.ts` (the map, its resolver, its ambiguity throw) and `organizer-redirects.ts` (the fifteen rows, `REDIRECT_STATUS`)"
  - phase: 34-one-work-surface
    provides: "34-02 — the pre-34 container baseline, and the written record that M-9 (before) was NOT run"
  - phase: 35-per-night-assignments
    provides: "the live-assignment arm on the door and on the per-night review, which this plan had to preserve verdict-for-verdict"
  - phase: 43-role-model-account-creation
    provides: "D-06 — `door.operate` with `requires_approved = false`, and the `staff` role that holds `door.operate` by assignment alone"
provides:
  - "One route-map lookup where three prefix rules stood; no `/admin` or `/organizer` prefix comparison survives in any quoting style"
  - "The `/organizer/*` address translation, emitted from `src/middleware.ts` before any session work"
  - "A module-load assertion binding `/admin/scanner` to `door.operate` AND to its assignment arm — the residue the map's own guards cannot see"
  - "`assignmentOpenable: true` on the door's map entry, restoring in data an arm wave 1 left behind"
  - "`keys.ts` no longer describes any capability as governing a URL prefix"
affects: [34-04, 34-05, 34-06, 34-08, 34-11, 34-16, 34-17, 39-door-moves]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An invariant that data cannot guard is asserted at module load, in the file whose job it is to honour it"
    - "A fence proved by the fact that it already fired, on the unmutated tree, before the fix it demanded"
    - "Segment comparison instead of prefix comparison for tree membership: `/administrators` is not `/admin`"
    - "A grep criterion a comment can defeat is a criterion nobody can run — so the comment names the token nowhere"

key-files:
  created: []
  modified:
    - src/middleware.ts
    - src/lib/supabase/middleware.ts
    - src/lib/capabilities/keys.ts
    - src/lib/routes/capability-routes.ts

key-decisions:
  - "The door's precedence is not preserved, it is made unnecessary: one rule has no order to invert. What remains is a module-load assertion, and the build does NOT carry it"
  - "`assignmentOpenable: true` added to `door.operate` in the map — a deviation outside `files_modified`, forced by a measured omission that would have refused the person rostered on the door"
  - "Tree membership tested by first SEGMENT, not by prefix, so `/administrators` cannot claim the work tree"
  - "`assignmentBounceCause()` has one call site, inside a ternary conditioned on `entry.assignmentOpenable` — today's code over-reported the cause on `/organizer` refusals with no assignment arm"
  - "Measured and recorded: importing `organizer-redirects.ts` from `src/middleware.ts` does NOT make its `/scanner` fence build-enforced. It stays a first-request throw"

patterns-established:
  - "Every mutation confirmed applied by `git diff --stat` or `git diff -U0` before its result was read"
  - "A runtime-only fence states, in the code, exactly which request fires it"

requirements-completed: [STAFF-02, STAFF-03]

# Metrics
duration: 95min
completed: 2026-08-09
---

# Phase 34 Plan 03: One lookup where three prefix rules were — Summary

**The middleware's three prefix rules are one `resolveRoute` call, the `/organizer/*` translation is emitted before any session is read, and the door's precedence is no longer preserved but made unnecessary — with one measured consequence that changes the plan's shape: the map as wave 1 left it did not carry the door's assignment arm, so the fence written to guard the door fired on the unmutated tree and the flag was added in the same commit.**

## Performance

- **Duration:** ~95 min
- **Tasks:** 2 of 3 executed; 1 deferred by owner decision
- **Files modified:** 4 (one of them outside `files_modified` — see Deviations)

## Task Commits

1. **Task 1: the address translation, before any session work** — `ff2737f` (feat)
2. **Task 2: three prefix rules become one map lookup** — `f59776b` (feat)
3. **Task 3: M-9 (after), the door with the radio off** — **no commit: not executed.** Deferred by owner decision of 2026-08-09. See *The measurement that was not taken, again*.

---

## The finding that changed this plan — the door's assignment arm was not in the map

This is the substantive result of the plan and it is not a footnote.

### What the plan asked for

*"The route is opened by role when the resolved capability set has `entry.capability`; opened by assignment when `entry.assignmentOpenable === true` **and** `holdsByAssignment(entry.capability)`."*

### What the map said

`CAPABILITY_ROUTES[door.operate]` carried `routes: ["/admin/scanner"]` and `alsoGatesTables: true`, and **no `assignmentOpenable`**. Plan 34-01's own probe recorded it: `/admin/scanner` → `{"key":"door.operate","assignmentOpenable":false}`.

### What the code being replaced actually did

```ts
if (pathname.startsWith("/admin/scanner")) {
  if (
    !capabilities.has(CAP.DOOR_OPERATE) &&
    !holdsByAssignment(CAP.DOOR_OPERATE)   // ← the arm
  ) {
    return bounceToDashboard(assignmentBounceCause());
  }
}
```

The door has had an assignment arm since phase 35. Executing the plan to the letter would have deleted it.

### Why that is the worst available outcome, not a cosmetic regression

`staff` does **not** hold `door.operate` by role — it is one of the six declared refusals of the role (`20260808000500_staff_role.sql`). A member of staff rostered on tonight's door holds it **by assignment and by nothing else**. Without the flag, the middleware bounces them to `/dashboard` before the scanner page exists at all: a false refusal, in front of a queue, at two in the morning — the asymmetry `checkin-offline.md` names as the worse of the two errors, produced by the plan whose stated purpose was that the door behaves exactly as before.

The scanner page itself makes the requirement explicit (`src/app/(admin)/admin/scanner/page.tsx`): *"Role **or** live assignment, read from the same two fields of the same payload. Not 'similar to': the same… Anybody who clears the coarse gate clears this one. If the two ever diverge, this is the copy that is wrong."*

### Why wave 1 missed it, which matters more than that it did

34-01 transcribed the allow-list of the **`/organizer`** arm — one route, `review` — because that arm had a docblock to travel with. The door's arm was a **separate widening**, added by phase 35 inside the `/admin/scanner` branch, with no allow-list and no list-shaped artefact. A transcription task finds the thing shaped like a list. It does not find the thing shaped like a second `||`.

### How it was caught

Not by review. By a check written to fail:

```
⨯ Error: middleware: "/admin/scanner" is bound to "door.operate" but is not
  assignment-openable. A member of staff assigned to tonight's door holds that
  capability by assignment and by no other route, so without this flag the
  middleware refuses the person rostered to work the door.
```

Observed on the **first request** to `http://localhost:3119/login` against the map as wave 1 left it — HTTP 500, dev log line 20. `ai-engineering.md` asks of every new gate: *which concrete situation would trip it?* This one had already tripped before the question could be asked.

### The fix

`assignmentOpenable: true` on the door's entry in `src/lib/routes/capability-routes.ts`, with the reasoning in its docblock. **Not a widening:** it restores in data the arm the code being replaced already had. Every role's reach is identical before and after.

---

## The door's precedence: not preserved, made unnecessary — and what is left over

The plan's brief said the replacement must make the hazard *impossible to get wrong when someone adds an entry six months from now, not merely correct for today's entries.* Three layers, and each was measured rather than asserted.

| Layer | Mechanism | Where it lives | Measured |
|---|---|---|---|
| Position no longer decides | `resolveRoute` picks by fewest dynamic segments; segment counts are necessarily equal among matches | `capability-routes.ts` | 34-01 mutation C: door declared **last**, still wins |
| Two entries claiming one address | module-load ambiguity throw, naming both | `capability-routes.ts` | fired, this plan, transcript below |
| The address moved to the wrong key | **new:** module-load assertion in the middleware | `src/lib/supabase/middleware.ts` | fired, this plan, and `npm run build` is **green** under the same mutation |

### The gap the map cannot see, and its proof

Move `/admin/scanner` out of `door.operate` and into `admin.access`. The totality assertion still sees a bound route. `_everyStaffRouteIsBound` still sees `/admin/scanner` in `Listed`. The ambiguity throw sees one pattern. **`npm run build` exits 0** — measured, `Compiled successfully`, on exactly that mutation. The door would be master-only, silently: the identical outcome to the inverted `if / else if` the deleted paragraph warned about, arriving through the door the collapse opened.

Mutation applied and confirmed before reading (`git diff -U0`):

```
-    routes: ["/admin/scanner"],
+    routes: [],
+      "/admin/scanner",     (added to admin.access)
```

First request:

```
⨯ Error: middleware: "/admin/scanner" resolves to "admin.access", not
  "door.operate". The door's address is judged by the door's capability, and by
  no other. Fix the binding in src/lib/routes/capability-routes.ts.
```

Reverted; `git diff` on the map shows only the intended `assignmentOpenable` line and two docblocks.

### The intermediate state, also observed

With `/admin/scanner` listed under **both** keys, 34-01's ambiguity throw fires first:

```
⨯ Error: capability-routes: ambiguous patterns "/admin/scanner" (door.operate)
  and "/admin/scanner" (admin.access) — they can match the same path and neither
  is more specific. Resolve it here, not at request time.
```

### Where these throws fire — the answer is not "at build time"

Stated in `src/middleware.ts` and in `src/lib/supabase/middleware.ts`, not only here.

**Measured:** with `src/middleware.ts` importing `organizer-redirects.ts`, a row naming the scanner (`["/organizer/venues", "/admin/scanner"]`, mutation confirmed by `git diff --stat`, `1 file changed`) still exits `npm run build` **0**. Importing a module gets it bundled; it does not get it evaluated. Module-load code in a middleware bundle runs when the runtime instantiates the bundle — **the first request after deploy**.

So this answers 34-01's Finding 1 directly, and the answer is the less convenient one: **being the first importer did not make the fence build-enforced.** What these throws buy is a loud, immediate 500 on every covered route on the first request — worse than a red build, and enormously better than a door that quietly refuses the people rostered to work it in a product with no error tracking. The half the build *does* carry is unchanged and is a type, not a throw: `RedirectRow` fails to compile on a reverse row.

---

## Task 1 — the address translation

`resolveOrganizerRedirect(request.nextUrl.pathname)` is the first statement of `middleware()`. On a hit it clones `nextUrl`, sets `pathname`, and returns `NextResponse.redirect(url, REDIRECT_STATUS)`. `updateSession` is not reached.

### Observed against `npm run dev`, no cookie sent

| Request | Status | `Location` |
|---|---|---|
| `/organizer/members` | 307 | `/admin/members` |
| `/organizer` | 307 | `/admin/events` |
| `/organizer/venues` | 307 | `/admin/venues` |
| `/organizer/events/abc123/review?party=night-1` | 307 | `/admin/events/abc123/review?party=night-1` |
| `/admin/scanner` | 307 | `/login?redirect=%2Fadmin%2Fscanner` |
| `/events` | 200 | — |
| `POST /api/tickets/checkin` | 401 (its own guard) | — |

The redirect is emitted with **no session read**, which is the requirement: a response that varies by viewer without a `Vary` is one a shared cache can serve to the wrong person, and `REDIRECT_STATUS` is due to become 308.

The query string survives (`?party=night-1`), and that is load-bearing rather than tidy: `?party=` is the parameter the per-night gate downstream resolves the night from. Dropping it would turn a working link into a refusal that looks like a permission problem.

### Acceptance criteria

- ✅ `resolveOrganizerRedirect` called before `updateSession`; no `await supabase`, no `getUser` on that path
- ✅ `grep -c "capabilit" src/middleware.ts` → **0**
- ✅ `config.matcher` byte-identical — `git diff src/middleware.ts` shows no line inside the `config` object
- ✅ Still `middleware.ts`; no `proxy.ts` exists
- ✅ `rm -rf .next && npm run build` exits 0

**One self-inflicted correction worth recording.** The first two drafts of the comment explaining the criterion *contained the token the criterion forbids* — once by naming it, once by quoting the grep command itself. Both were caught by running the criterion rather than by reading the code. The comment now describes the token and spells it nowhere, and says why. A criterion a comment can defeat is a criterion nobody can run.

---

## Task 2 — three rules become one lookup

### The shape

```ts
const entry = resolveRoute(pathname);

if (entry !== null) {
  const openedByRole = capabilities.has(entry.key);
  const openedByAssignment =
    entry.assignmentOpenable && holdsByAssignment(entry.key);

  if (!openedByRole && !openedByAssignment) {
    return bounceToDashboard(
      entry.assignmentOpenable ? assignmentBounceCause() : null
    );
  }
} else if (isUnderWorkTree(pathname)) {
  return bounceToDashboard();
}
```

### Tree membership is a segment comparison, not a prefix

`isUnderWorkTree` compares `pathname.split("/")[1]` against `"admin"`. A prefix test would claim `/administrators` for the work tree; a first-segment comparison does not. It decides no capability — the map does that — it only answers *is this an address the map is supposed to have an opinion about*, which is what turns an unmapped staff path into a refusal instead of a fall-through (T-34-13).

### What the cause ternary changes, deliberately

Today's code called `assignmentBounceCause()` on **every** `/organizer` refusal, including `/organizer/artists`, which has no assignment arm. That over-reported: it explained a decision that was never taken that way. The new call site fires only where the route entry declares the arm — the door and the per-night review. All three cause values remain reachable: `context-stale` and `not-assigned-here` from those two entries, `unavailable` from `capabilitiesResolveFailed` on any bounce at all. **Three causes, none collapsed.**

### `/organizer` out of `protectedPrefixes` — dead, not relaxed

Measured, not assumed: the redirect table's **fifteen rows are exactly the fifteen `page.tsx` files under `src/app/(organizer)`, one for one**. Every organizer address that renders anything is translated before `updateSession` is called; every other one has no page behind it. The other four prefixes are untouched, and that branch stays a prefix test on purpose — it decides only whether an anonymous caller is sent to sign in with `?redirect=`, which is refusal state 1 and not a capability question.

### `/membership-card` and `/attendance` through the same lookup

Both are in the map (`membership.card.view`), so both are now judged by `resolveRoute` like everything else. Verified there are **no sub-routes** under either — `find src/app -path '*membership-card*' -o -path '*attendance*'` returns only `page.tsx` and one `loading.tsx` — so exact matching is verdict-identical to the prefix test it replaces. `/api/tickets/attendance` is unaffected: it never matched the old prefix either.

### Grep criteria, measured before and after

| Criterion | Before | After | Required |
|---|---|---|---|
| `grep -cE 'startsWith\(\s*[\`"]/(admin\|organizer)'` | **4** | **0** | 0 |
| `grep -c "ORGANIZER_ASSIGNMENT_ROUTES"` | 3 | **0** | 0 |
| `grep -c "isOrganizerAssignmentRoute"` | 2 | **0** | 0 |
| `grep -c "try {"` | **0** | **0** | not greater |
| `grep -c '(organizer)/organizer'` | **2** | **0** | 0 |
| `assignmentBounceCause()` call sites | 2 | **1** | 1, inside the `assignmentOpenable` branch |
| `grep -cE '/(admin\|organizer)/\*' keys.ts` | 2 | **0** | 0 |
| `grep -c "capabilit" src/middleware.ts` | 0 | **0** | 0 |

The `try {` count is **0 before and 0 after**. No `try/catch` was added anywhere near `resolveRoute` or the capability resolution: `capabilities.resolve_failed` stays a throw in the DAL and a `capabilitiesResolveFailed` flag here, and D-34-08 state 3 is intact. `assignmentBounceCause` appears on two lines — one call and one comment naming it — and `git grep` for `assignmentBounceCause()` returns one executable call site, at the ternary.

`protectedPrefixes` now reads `/dashboard`, `/membership-card`, `/attendance`, `/admin`.

`BOUNCE_RESOLVE_FAILED`, `BOUNCE_CONTEXT_STALE` and `BOUNCE_NOT_ASSIGNED_HERE` all still exist (`:49-51`) and all three are still reachable (`:390`, `:391`, `:423`).

### The `:66-74` comment block, re-measured rather than carried

The deleted paragraph claimed two pages under `/organizer` had no server-side check. On this tree, **2026-08-09, it is wrong in both directions**:

- the media surface's organizer twin **does** gate, on `CAP.STAFF_MANAGE`, at line 63 of its page — plan 35-16 gave it that gate and the comment was never re-measured;
- `src/app/(admin)/admin/events/[id]/media/page.tsx:17` — the `/admin` copy, which the paragraph never mentioned — has **only** `if (!user) redirect("/login")`.

Both citations were verified by reading the files, not by trusting the plan. The block now records F1 with the `file:line` of the ungated `/admin` page. The organizer group's own paths are named by route rather than by group path, because plan 34-07 sweeps that string across the rest of `src/` and is forbidden from touching this file — so these two occurrences had to go, and nothing else may correct them.

### `keys.ts` — two docblocks, twelve lines, nothing else

`git diff --stat src/lib/capabilities/keys.ts` → **12 lines** (10 insertions, 2 deletions), against a cap of 12. `git diff` contains no hunk touching a key, a value, `CAP_DESCRIPTIONS` or the ordering.

- `admin.access` — was *"Middleware `/admin/*` except the scanner"*. Now names the six master-only surfaces and points at `src/lib/routes/capability-routes.ts`.
- `organizer.access` — was *"Middleware `/organizer/*`"*, a prefix that no longer exists. Now: the least capability any collapsed staff surface needs, including the `/admin` root, with the same pointer.

---

## Verification Run

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` | exit **0** — run after every task commit and after every mutation revert |
| `npm run verify:no-header-identity` | exit **0** |
| `npx eslint` on the four touched files | 1 error, **pre-existing** — see Deferred Issues |
| Fifteen-row redirect walk against `npm run dev` | six representative addresses observed above; the full mechanical walk is plan 34-08's `verify-organizer-redirects.sh` |
| `git status --porcelain` | empty after every mutation revert |

**Not claimed, and it must not be inferred:** no capability refusal was observed with a session. `curl` has no cookie, so everything above exercises refusal state 1 (no session) and the redirect table. Whether an organizer now reaches `/admin/members/register`, whether a master still reaches `/admin/finance`, and whether an unmapped staff path bounces rather than falls through are **M-1 … M-7**, and they are unrun. The build proves the code compiles; it proves nothing about who reaches which address.

`npm run verify:capabilities` was **not** run: it needs a live database, this plan edits no migration and no key, and its pre-phase output is already recorded in `34-02-SUMMARY.md`. It remains a written pre-deploy step (D-34-12).

---

## The measurement that was not taken, again — M-9 (after)

**Status: `human_needed`. Not done, not dropped, not passed.**

Task 3 is a `checkpoint:human-verify` gate. It was **not executed**, by the project owner's decision of 2026-08-09 that every manual procedure of this milestone runs together at the end of v1.5.

**The cost, stated exactly and not softened.** M-9 (before) was never observed — plan 34-02 recorded it as `human_needed` for the same reason, and its window closed when `f59776b` landed. So the "after" run has **nothing to compare against**. It will remain possible to observe that the door works. It will never be possible to observe that it works *the same as before this commit*.

**`34-VERIFICATION.md` is required to write it as:** *"the door was observed after the change; it was not observed before it, so no comparison was made."* Never as a before/after pair, which would imply a comparison that cannot happen.

The observations that are therefore unrecoverable for this phase: whether `/admin/scanner` rendered and a night could be selected before the rewrite; the scan outcome with the radio off and whether the entry queued; the bottom-navigation entries present; the final URL. **No pass is reported for any of them.**

Still owed, and still possible, because their subject exists after the change as well as before:

1. **M-9 (after), both arms.** A role holding `door.operate` opens `/admin/scanner`, selects a night, radio off, scans, records the outcome and whether the entry queues. Then — the arm that is easy to skip — an **`organizer` whose status is `pending`** opens `/admin/scanner` and it must **render**. `door.operate` carries `requires_approved = false` by D-06 of Phase 43, and that observation is what defends the decision against being tidied away as redundant.
2. **The staff arm, which this plan makes newly worth observing.** A member of `staff` **assigned to tonight's door** opens `/admin/scanner`. It must render. That is the arm the map did not carry until this commit, and the only end-to-end evidence that the restoration works is a person doing it.

Roles only. No person is named.

---

## Deviations from Plan

### Auto-fixed

**1. [Rule 2 — missing critical guard] `assignmentOpenable: true` added to `door.operate` in `src/lib/routes/capability-routes.ts`**

- **Found during:** Task 2, by the assertion written in the same task, on the first request against the unmutated tree.
- **Issue:** The map carried no assignment arm on the door. Executing the plan's refusal branch literally would have refused the member of staff rostered on tonight's door — a false refusal in front of a queue.
- **Fix:** one data line plus a docblock recording why it was missing and why restoring it is not a widening. The `party.manage` docblock, which said it was *"the only entry in this map carrying that flag"*, was corrected in the same commit — a comment that says "the only" when there are two is precisely the class of stale reference this phase exists to remove.
- **Scope note, stated plainly:** `capability-routes.ts` is **not** in this plan's `files_modified`. It was edited anyway because the alternative was shipping the regression or special-casing the door back into the middleware, which is the thing the phase removes. Checked before editing: none of the four sibling plans running in this wave (34-04, 34-05, 34-07, 34-08) declares this file. Total change: `assignmentOpenable: true`, two docblocks, one dangling reference.
- **Committed in:** `f59776b`

**2. [Rule 2 — missing critical guard] A module-load assertion on the door's binding, in `src/lib/supabase/middleware.ts`**

- **Found during:** Task 2, reasoning about what the deleted precedence paragraph was actually protecting.
- **Issue:** 34-01 removed precedence-by-position, but the binding became **data**, and no check in 34-01 objects to `/admin/scanner` being moved to another key. Measured: `npm run build` is green under exactly that mutation.
- **Fix:** two clauses — the address resolves to `door.operate`, and that entry is assignment-openable. Both proved to fire, transcripts above.
- **Committed in:** `f59776b`

**3. [Rule 1 — bug in a stale comment] The dangling reference in `capability-routes.ts`**

- **Issue:** The `Binding.assignmentOpenable` docblock cited *"the docblock of `ORGANIZER_ASSIGNMENT_ROUTES` (`src/lib/supabase/middleware.ts:60-90`)"* — an identifier this plan deletes.
- **Fix:** rewritten to say the identifier no longer exists, that the paragraph was confirmed present here **before** the expressions were deleted, and that this is now the only copy. Deleting a safety rule and the expression it guards in one commit is how a rule becomes folklore.
- **Committed in:** `f59776b`

**Total deviations:** 3, all Rule 1/2, all in the direction of preserving today's verdicts. No capability granted, revoked or re-scoped. No migration. No new key. No package installed. `/admin/scanner` did not move, no redirect row names it, and `src/app/(admin)/admin/scanner/page.tsx` was not modified.

---

## Findings — recorded, not designed

### Finding 1 — being the first importer did not make the redirect fences build-enforced

34-01's Finding 1 offered two reasons the `/scanner` fence was not carried by the build, and hoped the first would dissolve when 34-03 imported the module. **It did not.** Measured with the import in place: the mutation still exits `npm run build` 0. The second reason is the operative one, and it is now written into `src/middleware.ts` rather than left in a plan document.

### Finding 2 — two redirect destinations have no page on disk until plan 34-06

`/organizer/events/[id]/assignments` and `/organizer/events/[id]/review` translate to `/admin/…` addresses that **do not exist yet** — 34-06 creates them. Between this commit and that one, an entitled organizer following either link is redirected to a 404 instead of being refused. It resolves inside the phase; it is recorded because during that window the symptom looks like a broken link and is not.

### Finding 3 — the `/admin` media page stands behind a redirect and nothing else

`src/app/(admin)/admin/events/[id]/media/page.tsx:17` has only `if (!user) redirect("/login")`. The map binds that address to `staff.manage`, which is the twin's own predicate, so **no audience changes**: an organizer already saw this surface at the other address under the same key, and staff and members are refused before and after. What is true is that `access-gating.md` is explicit that a redirect is not a boundary, and this page has no gate of its own. Giving it the twin's gate belongs to the page-collapse plans that own the file. Recorded here and in the code, not fixed from this plan.

### Finding 4 — a master reaching an unmapped `/admin/*` address now bounces instead of 404-ing

`/admin/typo` previously passed `admin.access` for a master and produced a 404. It now fails closed to `/dashboard`. That is T-34-13 working as specified, and the trade is written into the code: losing a page to a typo is the acceptable half; admitting on `null` is the other half.

---

## Deferred Issues

- **`prefer-const` on `pendingCookies`** — `src/lib/supabase/middleware.ts:203`, `let` where `const` would do. **Pre-existing**, untouched by this plan, and not part of the build gate (`next build` is green). Out of scope per the scope boundary: it is not an issue this task's changes caused.

## Known Stubs

None. Both tasks are complete as specified. The two map entries with no page on disk (Finding 2) are a plan not yet run, not a stub.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no file access and no schema change. Every threat in the register is addressed by a mechanism recorded above:

| Threat | Disposition | Evidence |
|---|---|---|
| T-34-12 — the door judged by the wrong key | mitigated | specificity from the pattern (34-01 mutation C) **plus** the new module-load assertion, which fired twice under mutation; scanner page not modified |
| T-34-13 — unbound staff path admitted by fall-through | mitigated | `else if (isUnderWorkTree(pathname)) return bounceToDashboard()`, by segment not by prefix |
| T-34-14 — `assignmentOpenable` spreading | mitigated | read from the route entry only; two entries carry it, both named, both with their own server-side gate |
| T-34-15 — session-conditioned redirect cached for the wrong viewer | mitigated | the redirect runs before any auth work; `grep -c "capabilit" src/middleware.ts` = 0 |
| T-34-16 — a resolution failure rendered as a refusal | mitigated | `try {` count 0 → 0; `capabilities.resolve_failed` stays a throw; `unavailable` still outranks both assignment causes |
| T-34-17 — inbound identity headers | accepted, unchanged | `npm run verify:no-header-identity` exit 0; the three `delete` calls untouched |
| T-34-18 — a Server Function at a route the matcher no longer covers | mitigated | matcher byte-identical, asserted by `git diff` |
| T-34-SC — package installs | mitigated | none attempted |

## User Setup Required

None.

## Next Phase Readiness

- **Plan 34-06** creates `/admin/events/[id]/assignments` and `/admin/events/[id]/review`, closing Finding 2.
- **Plan 34-08**'s `verify-organizer-redirects.sh` now has a live target: the fifteen rows are emitted by the middleware and observable with `curl -sI` against `npm run dev`, with no deploy.
- **Plan 34-17** flips `REDIRECT_STATUS` to 308 and re-runs the walk. The 307 is stated as in-flight in `src/middleware.ts`, so the flip has a named home.
- **The page-collapse plans** own Finding 3.
- **Owed before v1.5 closes:** M-1 … M-9. M-9 has an after and no before; the staff-assignment arm at the door (item 2 above) is newly worth observing and was not worth observing before this commit.

## Self-Check: PASSED

Verified against the committed tree, not against this document:

- `src/middleware.ts` — present, 97 lines, `resolveOrganizerRedirect` before `updateSession`
- `src/lib/supabase/middleware.ts` — present, 608 lines, `resolveRoute` present, no prefix comparison
- `src/lib/capabilities/keys.ts` — present, 12-line diff, no key or value touched
- `src/lib/routes/capability-routes.ts` — present, `assignmentOpenable: true` on the door
- Commits `ff2737f` and `f59776b` — both present in `git log`
- `git diff --diff-filter=D HEAD~1 HEAD` — no deletions
- `git status --porcelain` — clean before this file was written
- `STATE.md` and `ROADMAP.md` — **not touched**; the orchestrator owns those writes

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-09*
