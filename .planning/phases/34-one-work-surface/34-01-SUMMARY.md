---
phase: 34-one-work-surface
plan: 01
subsystem: auth
tags: [routing, capabilities, typed-routes, nextjs, middleware, redirects]

requires:
  - phase: 32-capability-model-in-the-database
    provides: "The twelve capability keys and `CAP_DESCRIPTIONS` as the total-`Record` precedent"
  - phase: 35-per-night-assignments
    provides: "`party.manage`, `door.supervise`, `media.upload`, and the assignment allow-list this map must be able to express"
  - phase: 43-role-model-account-creation
    provides: "`register.read`, the staff role, and D-06 (`door.operate` with `requires_approved = false`)"
provides:
  - "`src/lib/routes/capability-routes.ts` — the one route↔capability declaration, total over `CapabilityKey`, with a specificity resolver that reads the pattern and never the position"
  - "`src/lib/routes/organizer-redirects.ts` — the fifteen one-directional rows and three module-load fences"
  - "`typedRoutes: true`, and the fourteen href sites it surfaced now typed"
  - "CAP-02's build gate, proved by mutation in both directions"
affects: [34-02, 34-03, 34-06, 34-08, 34-11, 34-17, 39-door-moves]

tech-stack:
  added: []
  patterns:
    - "`as const satisfies Record<CapabilityKey, Binding>` — totality from `satisfies`, literal tuples from `as const`"
    - "A type-level totality assertion read from the VALUE of a map, never from the type of its element union"
    - "Segment-walk route matching: no pattern language, no first-match-wins, ambiguity thrown at module load"
    - "A fence expressed as a `throw`, because the paragraph is read once and the throw runs on every import"

key-files:
  created:
    - src/lib/routes/capability-routes.ts
    - src/lib/routes/organizer-redirects.ts
  modified:
    - next.config.ts
    - src/lib/rbac/roles.ts
    - src/components/staff/StaffNav.tsx
    - src/components/account/ManagementSection.tsx
    - src/components/events/EventList.tsx
    - src/app/(admin)/admin/analytics/compare/page.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/register/page.tsx
    - src/app/(public)/payment/callback/actions.ts

key-decisions:
  - "The research's `Extract<Binding, …>` form for the second totality is vacuous and was replaced by a value-derived form; proved by mutation B2, which is green under the research form and red under this one"
  - "`StaffRoute` excludes `RouteImpl`'s query and fragment arms, without which the assertion is red on a clean tree"
  - "`resolveRoute` matches patterns EXACTLY, not as prefixes, so the research's `most segments` tiebreak has no live case and was deliberately not written as an unreachable branch"
  - "`redirectTo` in the payment callback was typed at the SOURCE rather than cast at the call site — no `as Route` anywhere"
  - "The `/scanner` half of the redirect fence is a runtime throw and is NOT carried by `npm run build` today, because nothing imports the module until plan 34-03; recorded rather than glossed"

patterns-established:
  - "Proof by mutation with the mutation confirmed applied first: `git diff --stat` before every read"
  - "A docblock that names what was NOT measured, in the house style of `verify-capabilities.mjs`"

requirements-completed: [CAP-02, STAFF-02, STAFF-03]

duration: 78min
completed: 2026-08-09
---

# Phase 34 Plan 01: The Route Map Summary

**The two prefix trees now have one declaration behind them: a total `Record` over the twelve capability keys whose specificity comes from the pattern and never from the position, plus a fifteen-row one-directional redirect table whose three fences are throws — and both directions of CAP-02 are proved by mutation rather than asserted.**

## Performance

- **Duration:** ~78 min
- **Tasks:** 3 of 3
- **Files created:** 2
- **Files modified:** 9

## Accomplishments

- **`typedRoutes: true` is on**, and the fourteen href sites it surfaced are typed by one of the plan's three legitimate forms. No `as Route` cast anywhere — the check this task exists to switch on was not switched back off at a single site.
- **`CAPABILITY_ROUTES` is total over all twelve keys**: seven carry routes, five declare `scope: "table"` with a reason that names the guard or the policy family enforcing them. Adding a thirteenth key fails `npm run build`.
- **The second totality is real, not decorative.** The research's sketch was vacuous; the value-derived form catches both a deleted route and — the failure that actually happens — a misspelt one.
- **The door's precedence is now a property of the data.** `resolveRoute("/admin/scanner")` returns `door.operate` with the entry declared last in the object, measured.
- **Three fences that were paragraphs are now throws**, and the one-directionality is additionally carried by the type system, so a source under `/admin` fails the build today.

## Task Commits

1. **Task 1: Enable typedRoutes and clear the type errors it surfaces** — `11fb38d` (feat)
2. **Task 2: Write the route↔capability map and the fifteen-row redirect table** — `6566662` (feat)
3. **Task 3: Prove CAP-02 by mutation, in both directions** — no code change by construction: all four mutations were applied, confirmed, read and reverted, and the working tree at the end of Task 3 is byte-identical to the end of Task 2 (`git status --porcelain` empty). The artefact of Task 3 is the evidence recorded below.

## Files Created/Modified

**Created**

- `src/lib/routes/capability-routes.ts` — the one declaration the middleware, the page guards and the navigation will all read. Twelve entries, a segment-walk resolver, a module-load ambiguity throw, and the two type-level totality assertions.
- `src/lib/routes/organizer-redirects.ts` — fifteen `[from, to]` rows, `REDIRECT_STATUS = 307`, `resolveOrganizerRedirect`, and three module-load fences.

**Modified**

- `next.config.ts` — one line: `typedRoutes: true`. `redirects()` untouched; `grep -c 'organizer' next.config.ts` returns 0.
- `src/lib/rbac/roles.ts` — `NavItem.href` typed `Route`.
- `src/components/staff/StaffNav.tsx` — `STAFF_TABS` now writes both addresses per tab instead of concatenating a bare segment onto a base resolved from `context`; a tab absent from a tree is `null` rather than an entry filtered by a `contexts` array. Same visible behaviour.
- `src/components/account/ManagementSection.tsx` — both link lists typed `ManagementLink[]` with `href: Route`.
- `src/components/events/EventList.tsx` — `basePath` narrowed from `string` to the two literals actually passed; the six templates stay unannotated and are now checked. The `/organizer/events` default survives, as the plan requires (plan 34-11 owns its removal).
- `src/app/(admin)/admin/analytics/compare/page.tsx` — the two mode-toggle hrefs split into literal branches and annotated `Route`.
- `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx` — the `?next=` links split into two literal branches.
- `src/app/(public)/payment/callback/actions.ts` — `PaymentCallbackResult.redirectTo` typed instead of `string`, and the drink destination built with `URLSearchParams` so it keeps a literal type.

## The literal sweep — measured, not quoted

`npx tsc --noEmit -p tsconfig.json` with `typedRoutes: true` on the otherwise-unchanged tree, 2026-08-09. **Fourteen errors, confirming the research's count exactly** — but across **eight** files, not the four `34-01-PLAN.md` named in `files_modified`:

| File | Lines | Count | Form applied |
|---|---|---|---|
| `src/app/(admin)/admin/analytics/compare/page.tsx` | 90, 100 | 2 | 3 (annotated `Route`) |
| `src/app/(auth)/login/page.tsx` | 94 | 1 | 2 (unannotated, literal branches) |
| `src/app/(auth)/register/page.tsx` | 144 | 1 | 2 |
| `src/app/(public)/payment/callback/page.tsx` | 45 | 1 | 3, applied in `actions.ts` |
| `src/components/account/ManagementSection.tsx` | 39 | 1 | 1 (typed data) |
| `src/components/events/EventList.tsx` | 163, 170, 177, 184, 191, 198 | 6 | 2 |
| `src/components/layout/MobileNav.tsx` | 60 | 1 | 1, applied in `roles.ts` |
| `src/components/staff/StaffNav.tsx` | 56 | 1 | 1 |

**Form 4 (`` `${string}/${string}` ``) was not needed anywhere.** No cast was used.

**The unannotated form is checked, verified by mutation, not assumed.** Changing `` `${basePath}/${event.id}/edit` `` to `/nonsense` in `EventList.tsx` — mutation confirmed applied by `git diff --stat`, `1 file changed` — produced:

```
src/components/events/EventList.tsx(176,15): error TS2322:
  Type '`/organizer/events/${string}/nonsense` | `/admin/events/${string}/nonsense`'
  is not assignable to type 'UrlObject | RouteImpl<…>'.
```

Reverted.

## The four mutation proofs

This project has a recorded incident of a green read taken from a mutation that had not applied, so `git diff --stat` was run and read **before** every build in all four.

### Mutation A — a key with no route

```
$ git diff --stat src/lib/capabilities/keys.ts
 src/lib/capabilities/keys.ts | 1 +
 1 file changed, 1 insertion(+)
```

`rm -rf .next && npm run build` → **fails**. Two errors, and the plan's prediction holds in both:

```
src/lib/capabilities/keys.ts(137,14): error TS2741: Property '"proof.only"' is missing
  in type '{ … }' but required in type 'Record<CapabilityKey, string>'.

src/lib/routes/capability-routes.ts(315,12): error TS1360: Type '{ readonly "door.operate": … }'
  does not satisfy the expected type 'Record<CapabilityKey, Binding>'.
  Property '"proof.only"' is missing …
```

`capability-routes.ts:315` **is** the `as const satisfies Record<CapabilityKey, Binding>` line — verified by reading it back. The error code is **TS1360**, as measured in the plan, and it does **not** contain the identifier `CAPABILITY_ROUTES`: `satisfies` names the object literal's type, never the identifier. A criterion demanding that string would be unsatisfiable, which is why the plan said so first.

The `CAP_DESCRIPTIONS` failure (TS2741) is expected and is the precedent D-34-11 reuses. **CAP-02's gate is the `capability-routes.ts` one.** A third error, TS2339 at `:349`, is the `Listed` alias indexing the map by the now-larger key union — a consequence, not a separate gate.

Reverted with `git checkout -- src/lib/capabilities/keys.ts`; `git status --porcelain` empty.

### Mutation B1 — a staff route deleted from the map

`register.read`'s `routes` emptied.

```
$ git diff --stat src/lib/routes/capability-routes.ts
 src/lib/routes/capability-routes.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ grep -n 'routes: \[\],' src/lib/routes/capability-routes.ts
248:    routes: [],
```

`rm -rf .next && npm run build` → **fails**:

```
./src/lib/routes/capability-routes.ts:365:7
Type error: Type 'boolean' is not assignable to type '["UNBOUND", "/admin/members/register"]'.
```

The error names the route. Reverted.

### Mutation B2 — the typo, which is the failure that actually happens

`"/admin/newsletter"` → `"/admin/newsleter"` in `admin.access`.

```
$ git diff --stat src/lib/routes/capability-routes.ts
 src/lib/routes/capability-routes.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ grep -n 'newsleter' src/lib/routes/capability-routes.ts
206:      "/admin/newsleter",
```

`rm -rf .next && npm run build` → **fails**:

```
./src/lib/routes/capability-routes.ts:365:7
Type error: Type 'boolean' is not assignable to type '["UNBOUND", "/admin/newsletter"]'.
```

It names **`/admin/newsletter`** — the route that lost its binding, not the one that was written. **This is the mutation that proves the assertion is not vacuous:** under the research's `Binding`-derived form both B1 and B2 compile green, because the second arm of `RoutePattern` widens the element type to `string` and every staff route extends it. Reverted.

### Mutation C — the door's precedence

The `door.operate` entry moved from the first property of the object to the last.

```
$ git diff --stat src/lib/routes/organizer-redirects.ts   # (map file)
 src/lib/routes/capability-routes.ts | 10 +++++-----
 1 file changed, 5 insertions(+), 5 deletions(-)
$ grep -n "CAP.DOOR_OPERATE\|} as const satisfies" src/lib/routes/capability-routes.ts
311:  [CAP.DOOR_OPERATE]: {
315:} as const satisfies Record<CapabilityKey, Binding>;
```

The entry is the last property. A throwaway `node --experimental-strip-types` probe (deleted afterwards, along with its directory):

```
door.operate declared LAST -> {"key":"door.operate","assignmentOpenable":false,"pattern":"/admin/scanner"}
```

Specificity comes from the pattern. Reverted.

The same probe, on the unmutated tree, also recorded the resolutions the collapse depends on: `/admin` → `organizer.access`; `/admin/members/register` → `register.read` (**the folded todo, closing with no permission edited**); `/admin/members/growth` → `admin.access`; `/admin/events/<id>/media` → `staff.manage`; `/admin/events/<id>/review` → `party.manage` with `assignmentOpenable = true`; `/admin/newsleter`, `//admin/finance` and `/admin/scanner/` → `null`, which the middleware must treat as a refusal (T-34-02, T-34-03).

### Mutation D — the redirect fence, both directions

**D1, source is the door.** Sixteenth row `["/admin/scanner", "/admin/events"]`.

```
$ git diff --stat src/lib/routes/organizer-redirects.ts
 src/lib/routes/organizer-redirects.ts | 1 +
 1 file changed, 1 insertion(+)
```

`npm run build` → **fails**:

```
Type error: Type '"/admin/scanner"' is not assignable to type '`/organizer${string}`'.
```

and the module-load throw fires on direct import:

```
organizer-redirects: row "/admin/scanner" -> "/admin/events" has a source under /admin.
The table is one-directional: /organizer to /admin, never the reverse.
```

**D2, destination is the door.** Row `["/organizer/scanner", "/admin/scanner"]`.

```
$ git diff --stat src/lib/routes/organizer-redirects.ts
 src/lib/routes/organizer-redirects.ts | 1 +
 1 file changed, 1 insertion(+)
```

The module-load throw fires on direct import:

```
organizer-redirects: row "/organizer/scanner" -> "/admin/scanner" names the scanner.
The door keeps its address and no redirect may match it or point at it.
```

**But `npm run build` passes under D2 — measured, `Compiled successfully`, exit 0.** See Finding 1. Reverted; `git status --porcelain` empty.

## Findings — recorded, not designed

### Finding 1 — the `/scanner` fence is a runtime throw and the build does not carry it yet

`34-01-PLAN.md` states for Mutation D that *"`npm run build` must fail"*. Measured, it does not, for the D2 variant. Two independent reasons, both worth carrying into plan 34-03:

1. **Nothing imports `organizer-redirects.ts` yet.** Webpack does not bundle an unreachable module, so its module-load code never runs during a build. The build's TypeScript step does typecheck the file — which is why D1 fails, since the one-directionality is expressed in `RedirectRow`'s type — but a `throw` is not a type.
2. **Even once 34-03 imports it from `src/middleware.ts`, a module-load throw in the middleware surfaces on the first request, not necessarily at build time.** A phase whose acceptance rests on that throw must say where it fires.

This is stated in the module docblock, not only here. The half the build **does** carry today is the one-directionality; the `/scanner` half is proved by importing the module, which is what mutation D did. Nothing was weakened to make a green appear.

### Finding 2 — `resolveRoute` matches exactly, so one of the research's two tiebreaks has no live case

`matchesPattern` requires equal segment counts, so `/admin` opens `/admin` and nothing beneath it: every address is declared, and prefix semantics are gone (D-34-02, made literal). A consequence is that the research's first tiebreak — *most segments* — can never decide anything, because all matching patterns necessarily have the same segment count. **It was deliberately not written as a branch that can never run**, per `ai-engineering.md`'s *«un gate deve poter fallire»*: a safeguard nothing can reach is a decoration that makes something look guarded. The tiebreak that does decide real cases — fewest dynamic segments — is implemented, and the module-load ambiguity throw covers the remaining case, an overlap with equal dynamic counts.

The plan's action text specifies both. This is a divergence from the letter of the plan in the direction of honesty, and it is the only one in Task 2.

### Finding 3 — two acceptance criteria of Task 2 are, as literally written, unsatisfiable

- *"`assignmentOpenable` appears exactly once in the file"* — it cannot. The field must be declared in the `Binding` type, read by the compiler that builds the pattern table, and returned by `resolveRoute` so the middleware can consult it. **Measured: 7 occurrences.** The criterion's intent — Pitfall 2, *`assignmentOpenable` lives on the route entry, never on the key and never on a prefix* — **is** satisfied: it appears **exactly once in the map data**, on `party.manage`'s `/admin/events/[id]/review` entry, and it is a sibling of `routes`, never of `scope`.
- *"`grep -c "scanner" src/lib/routes/organizer-redirects.ts` returns hits only inside the assertion, never in a row"* — the word also appears in the module docblock, where it explains why `/admin` is the canonical prefix. Five hits, none in a row: lines 10 and 46 (docblock), 117 (fence comment), 128 and 130 (the fence itself). The criterion's substance holds.

### Finding 4 — M-9's "before" observation is expiring

Not this plan's task, but this plan opens the wave and the window is open now. `34-VALIDATION.md` M-9 requires the offline door scan to be run **before and after** the middleware plan (34-03). A "before" baseline **cannot be captured after the change it baselines** — deferring it does not postpone the observation, it destroys it. The owner's decision of 2026-08-09 defers all manual procedures to the end of v1.5; under that decision M-9's "before" half is **lost unless it is run before plan 34-03 merges**, and its cost is that a door regression introduced by 34-03 would have nothing to be compared against. Recorded here so the decision is taken knowingly rather than by omission.

## Decisions Made

1. **The second totality reads the value, not the type.** The research's `Binding`-derived form is vacuous; mutation B2 is the discriminating test and it is recorded above with both outcomes.
2. **`StaffRoute` strips `RouteImpl`'s query and fragment arms.** Without the `Exclude` the assertion is red on a clean tree — a permanently red gate under pressure to ship green is exactly how the vacuous form arrived the first time.
3. **`RoutePattern` keeps `| (string & {})`.** `/admin/events/[id]/assignments` and `/admin/events/[id]/review` do not exist on disk until plan 34-06. The price — `typedRoutes` checks none of the map's 25 strings — is written into the docblock rather than left for someone to discover.
4. **`redirectTo` typed at the source.** The alternative was a cast at `router.replace()`, which the plan forbids. This is a money path: the destination after a paid checkout is where a wrong address costs somebody the thing they just bought.
5. **`StaffNav`'s `contexts` array became two explicit addresses.** The old shape could not be typed: the filter, not the type, was what stopped `/organizer/finance` — an address that does not exist — from ever being built. The `context` prop itself survives for STAFF-03 to remove.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Five files outside `files_modified` had to be typed**

- **Found during:** Task 1
- **Issue:** `typedRoutes: true` surfaced errors in `src/app/(admin)/admin/analytics/compare/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(public)/payment/callback/page.tsx` and `src/lib/rbac/roles.ts` — none named in the plan's `files_modified`. The plan named `MobileNav.tsx`, but `MobileNav`'s error is caused by `NavItem.href: string` in `roles.ts`, so the fix belongs there.
- **Fix:** Each typed with one of the plan's forms 1–3. No cast, no `@ts-expect-error`, no widening.
- **Verification:** `rm -rf .next && npm run build` exits 0; the `EventList` probe above confirms the check is real.
- **Committed in:** `11fb38d`

**2. [Rule 3 — Blocking] `payment/callback/actions.ts` edited instead of `page.tsx`**

- **Found during:** Task 1
- **Issue:** The error is at `router.replace(result.redirectTo)` in `page.tsx`, but `redirectTo` is `string` because the server action declares it so. Fixing it at the call site would have required a cast, which the plan forbids.
- **Fix:** `PaymentCallbackResult.redirectTo` typed as the union of the two shapes the action actually returns; the drink destination built with `URLSearchParams` instead of `URL.pathname + URL.search` so the value keeps a literal type. **The strings produced are unchanged** — same two parameters, same order, same encoding.
- **Cross-domain note:** this file is `ticketing-payments`. No money logic, no idempotency and no status handling was touched; the change is the return type and the way one string is assembled.
- **Committed in:** `11fb38d`

**3. [Rule 2 — Missing critical guard] The redirect table's one-directionality made a compile-time check as well as a throw**

- **Found during:** Task 2
- **Issue:** With nothing importing the module in Wave 1, all three fences would have been runtime-only and `npm run build` would have carried none of them.
- **Fix:** `RedirectRow` types `from` as `` `/organizer${string}` `` and `to` as `` `/admin${string}` ``, so a reverse row fails the build today. The throws are unchanged and remain the mechanism for the `/scanner` half.
- **Verification:** Mutation D1 fails the build with `Type '"/admin/scanner"' is not assignable to type '\`/organizer${string}\`'`.
- **Committed in:** `6566662`

---

**Total deviations:** 3 auto-fixed (2 × Rule 3, 1 × Rule 2)
**Impact on plan:** No scope creep. Deviations 1 and 2 were required for a green build; deviation 3 strengthens a fence around the door without loosening anything. No capability was granted, revoked or re-scoped; no migration was touched; no new capability key exists; `/admin/scanner` did not move and nothing matches it.

## Issues Encountered

- **The build stops at the first type error**, so `npm run build` alone cannot enumerate a sweep. `npx tsc --noEmit -p tsconfig.json` was used to *count* — it runs the same check over the same `tsconfig` — and `npm run build` was used as the *gate* at every commit and after every mutation.
- **No test framework was installed and none is proposed.** Nothing in this plan is verified because tests pass; there are none.

## Verification Run

| Command | Result |
|---|---|
| `rm -rf .next && npm run build` | exit 0, with `_everyStaffRouteIsBound` present, unmodified and uncommented |
| `npm run verify:persona` | exit 0 — 7/7 |
| `npm run verify:no-header-identity` | exit 0 |
| `npx eslint src/lib/routes/` | clean |
| `git status --porcelain` after Task 3 | empty — no mutation residue |

`npm run verify:capabilities` was **not** run: it needs a live database, there is no CI, and this plan edits no migration and no key. It remains a written pre-deploy step (D-34-12).

## Grep criteria, measured

| Criterion | Expected | Measured |
|---|---|---|
| `grep -c 'server-only' capability-routes.ts` | 0 | 0 |
| non-comment `scope: "table"` | 5 | 5 |
| `grep -c '\.find(' capability-routes.ts` | 0 | 0 |
| `grep -c 'RegExp' capability-routes.ts` | 0 | 0 |
| `grep -c 'as const satisfies Record<CapabilityKey'` | 1 | 1 |
| `grep -c 'Extract<Binding'` | 0 | 0 |
| `grep -c 'Exclude<'` | ≥1 | 3 |
| `grep -cE 'ts-expect-error\|ts-ignore'` | 0 | 0 |
| `grep -c 'organizer' next.config.ts` | 0 | 0 |
| `git diff --stat next.config.ts` | ≤2 lines | 1 insertion |
| redirect rows | 15 | 15 |
| imports of `capability-routes.ts` | `@/lib/capabilities/keys`, `next` | exactly those two |

The five `scope: "table"` keys are exactly `master.manage`, `catalogue.manage`, `membership.active`, `door.supervise`, `media.upload`, each with a non-empty `reason` naming its guard or policy family.

## Known Stubs

None. Both modules are complete as specified. Two addresses in the map — `/admin/events/[id]/assignments` and `/admin/events/[id]/review` — have no `page.tsx` on disk yet; that is plan 34-06's work, is declared in the module docblock, and is the reason `RoutePattern` keeps its second arm. It is a plan not yet run, not a stub.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no file access and no schema change. Every threat in the plan's register is addressed by a mechanism recorded above, with one honest qualification on T-34-04: the redirect fence's `/scanner` half is a runtime throw until plan 34-03 imports the module (Finding 1).

## User Setup Required

None.

## Next Phase Readiness

Waves 2 and 3 can fan out: every later plan in the phase **reads** these two modules and none extends them, which is what buys the parallelism Phase 32 lost.

Carried forward, explicitly:

- **Plan 34-03** must import `organizer-redirects.ts` from `src/middleware.ts`, and must state where the module-load throws actually fire once it does (Finding 1). It must also treat `resolveRoute(...) === null` as a refusal, never as a fall-through (T-34-03), and must call `assignmentBounceCause()` only on entries whose `assignmentOpenable` is true.
- **Plan 34-06** creates `/admin/events/[id]/assignments` and `/admin/events/[id]/review`. Once both exist on disk, `RoutePattern` **may** be narrowed to `Route` — and doing so would make `typedRoutes` check all 25 strings in the map, which is the largest single strengthening available to this phase. It is not this plan's to do.
- **Plan 34-08** owns the third link of the CAP-02 chain: `scripts/verify-routes.mjs`, which enumerates `page.tsx` from disk and is the only instrument that can see the dynamic routes the type system was never given.
- **Plan 34-17** flips `REDIRECT_STATUS` to 308 and re-runs the fifteen-address walk after the flip (D-34-15).
- **Before plan 34-03 merges:** M-9's "before" observation (Finding 4).

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-09*
