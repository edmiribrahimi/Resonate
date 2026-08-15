---
phase: 44-the-production-calendar-comes-inside
plan: 04
subsystem: access-gating
tags: [capability-model, rls, migration, monotone-guard, production-calendar]
requires:
  - private.capabilities
  - private.role_capabilities
  - private.has_capability
  - public.profiles
  - public.production_plan
  - public.production_piece
  - public.production_commitment
  - public.production_checklist_item
  - public.production_import_run
  - public.production_pipeline_rule
provides:
  - CAP.PRODUCTION_READ
  - private.capabilities row `production.read` + two grants
  - six SELECT policies on the production tables
  - public.refuse_production_plan_renumber (trigger)
  - public.record_checklist_tick
affects:
  - 44-07 (applies this migration; verify:capabilities goes green there)
  - 44-09 (MOVES the capability-routes entry from `scope: "table"` to `routes:`)
  - 44-11 (the surface calls record_checklist_tick through 44-12)
  - 44-12 (owns the two write paths and the PostgREST error.details discipline)
  - 44-13 (the written manual procedure with five real accounts)
tech-stack:
  added: []
  patterns:
    - "a capability key named by the QUESTION, with the direction of each rejected reuse written out"
    - "the description string is shared bytes between keys.ts and the migration, asserted not eyeballed"
    - "the initplan-wrapped SELECT policy, one arm, no public arm, no write arm"
    - "a monotone guard as a BEFORE UPDATE trigger that survives the caller that forgot"
    - "refusals as RETURNED jsonb, never exceptions, because a constraint refusal carries the whole row"
key-files:
  created:
    - supabase/migrations/20260815120100_production_calendar_access.sql
  modified:
    - src/lib/capabilities/keys.ts
    - src/lib/routes/capability-routes.ts
    - scripts/verify-capabilities.mjs
decisions:
  - "D-44-27 (owner, 2026-08-15): requires_approved = false on both grants of production.read"
  - "EXECUTE on record_checklist_tick is granted to service_role alone, not authenticated — BUT the GRANT alone did not close the default: see the correction below"
  - "CORRECTED 2026-08-15 by migration 20260815120200: this plan wrote the GRANT without the REVOKE, and Postgres grants EXECUTE to PUBLIC by default, so after applying, the measured ACL was {=X,anon,authenticated,service_role}. Every claim in this file about the function being unreachable without a session was false until that migration ran; it is true now, measured: {postgres,service_role}"
  - "record_checklist_tick does NOT ask production.read inside itself; the gate is the caller's"
  - "the renumber guard refuses erasing a number as well as changing it"
  - "the capability-routes entry lands on scope: \"table\" and plan 44-09 moves it"
metrics:
  tasks: 3
  commits: 2
  duration: ~75 min
  completed: 2026-08-15
---

# Phase 44 Plan 04: The Capability Model in the Database Summary

The fourteenth key, its two grants, six read policies with no second arm of any kind, a
trigger that makes renumbering structurally impossible and a tick that records who
performed it — written, measured in a throwaway container, and applied nowhere.

## Task 1 — the owner's decision, recorded

**The question:** on both grants of `production.read`, is `requires_approved` **true** or
**false**?

**The answer, from the owner, dated: `requires_approved = false`. Recorded as D-44-27,
owner, 2026-08-15.** The plan's checkpoint was answered before dispatch and was not
re-asked.

**The owner's reason, verbatim in substance:** organizer accounts are created inside the
app by an admin or an organizer; nobody signs up any more, so `pending` is about to stop
meaning anything. An organizer created by the owner is trusted by construction, and gating
on a value that is about to stop varying is debt, not safety.

**The alternative, and why it lost.** `44-RESEARCH.md` §Access recommended **`true`**, on
the argument that the surface holds spaces under negotiation and unannounced dates, and an
organizer whose own access was never approved would be shown a calendar every row of which
is a secret. That recommendation is **correct for the model as it stands today** — it is
the eleven-key precedent for surfaces holding a secret, and it is the value `venue.reveal`
carries for an argument written out at `keys.ts:86-108`. It lost because it answers a
different question: the research is describing the model as it is, the owner is deciding
about the model as it is becoming. Both are recorded because a decision whose rejected
alternative is not written down gets re-litigated.

**The bet, written down rather than left to be discovered.** `false` holds only while no
signup path can create a pending organizer. The day one is reopened, a pending organizer
reads every unannounced date and every space under negotiation. That sentence is in three
places on purpose — the capability description (and therefore in the database), the comment
beside the grant rows, and `ROLE_GRANTS` in `scripts/verify-capabilities.mjs`.

**The trap refused in the same breath.** `door.operate` and `staff.manage` also carry
`false`. They carry it to keep a person from being refused **in front of a queue**, and
nobody is standing in a queue in front of a production calendar. Three rows now agree on a
value for two different reasons, and each of the three says so beside itself, so the day
the door's reason is revisited this key does not move with it.

**Measured, not asserted:** in the container an **organizer with `status = 'pending'`** read
all six tables. That is D-44-27 behaving as decided, observed rather than described.

## What Was Built

| Task | Artefact | Commit |
|---|---|---|
| 1 | the decision above, with its date and its rejected alternative | — |
| 2 | `CAP.PRODUCTION_READ`, its description, the four-candidate argument | `2c3d8d6` |
| 3 | `supabase/migrations/20260815120100_production_calendar_access.sql` | `d4ae3e3` |

The migration, 570 lines, one transaction:

| § | Object | What it is for |
|---|---|---|
| 1 | `production.read` + two grants | the definition all three readers ask |
| 2 | six SELECT policies | the boundary — one arm each, no public arm |
| 3 | the no-write-policy paragraph | the absence declared as a decision |
| 4 | `refuse_production_plan_renumber` | a progressivo already written cannot change |
| 5 | `record_checklist_tick` | a tick is an act with an author, and it is reversible |
| 6 | one EXECUTE grant, and one deliberate absence | `service_role` and nothing wider |

**The file is not applied.** Plan 44-07 applies it and is the only plan permitted to.

## Verification — what was done, and what it does not mean

### Mechanical, in this repository

| Check | Result |
|---|---|
| `npm run build` | exits 0 (it is also the typecheck; there is no test runner) |
| `grep -c "PRODUCTION_READ: \"production.read\"" keys.ts` | 1 |
| `grep -c "\"production.read\":" keys.ts` | 1 |
| rejected candidates named in `keys.ts` | 10 → 16 matches (+6, criterion asked +4) |
| `grep -c "ENABLE ROW LEVEL SECURITY"` in the migration | 6 |
| `grep -c "FOR SELECT USING ((SELECT private.has_capability('production.read')))"` | 6 |
| `grep -ciE "FOR (INSERT\|UPDATE\|DELETE)"` | **0** |
| `grep -c "USING (true)"` | **0** |
| `grep -c "BEFORE UPDATE OF number ON public.production_plan"` | 1 |
| `grep -c "SET search_path = ''"` | 2 |
| date literals in the migration | **0** |
| uuid literals in the migration | **0** |
| `highest_assigned` mentions | 2, both in comments saying what is NOT being done |
| description byte-identity, TS ↔ SQL | **697 = 697, identical** — compared by a script, not by eye |

### In a throwaway `postgres:17.6` container — removed afterwards, nothing touched production

The device is plan 44-02's, used for the same purpose: stub relations for `auth.users`,
`profiles`, `formats`, `party_series`, `venues`, `event_parties` and the capability model,
then both migrations applied for real.

| Proof | Observed |
|---|---|
| first application | clean through `COMMIT`; the capability row and both grants land |
| **second** application | clean; **`INSERT 0 0` on both inserts** — idempotent, measured |
| policy census | exactly **6** policies on the six tables, **every one `cmd = SELECT`** |
| RLS flag | `relrowsecurity = t` on all six |
| function hardening | both `prosecdef = t`, both `proconfig = {"search_path=\"\""}` |
| execute ACL | `record_checklist_tick` → `service_role` only; `refuse_production_plan_renumber` → **no grant at all** |

**The six read proofs — who sees what, measured with a real policy evaluation:**

| Session | plan · piece · commitment · checklist · import_run · pipeline_rule |
|---|---|
| organizer, **`status = 'pending'`** | 2 · 0 · 0 · 1 · 0 · **14** — reads everything (D-44-27) |
| **staff, `status = 'approved'`** | **0 · 0 · 0 · 0 · 0 · 0** |
| member, approved | 0 |
| anon | 0 · 0 |

The staff row is the phase's load-bearing measurement: *a member of staff assigned to the
door stays out*, observed rather than described. It is refused **by role**, and it is not
routed around by an assignment either — this key is not one of the four a per-night
assignment may carry (`20260809000000_party_assignments.sql:340-342`).

**The write proofs — the absent policies are real:**

`GRANT INSERT, UPDATE, DELETE ON ALL TABLES` was given to `authenticated` on purpose, so
that the refusal could not be mistaken for a missing table privilege. With the privilege
held and the capability held:

- insert → `ERROR: new row violates row-level security policy for table "production_plan"`
- update → affects **0 rows**; `venue_word` still null on both rows afterwards
- delete → affects **0 rows**; both rows survive

**The renumber guard — four mutations, each observed:**

| Attempted | Result |
|---|---|
| change a number that is set (7 → 8) | **refused**, `production_plan.renumber_refused: <id>` |
| **erase** a number that is set (7 → null) | **refused** — the renumbering with an extra step |
| set a number that was null (null → 3) | **allowed** — append, never renumber |
| rewrite the same number (7 → 7) | **allowed** — a re-import is a no-op |

**The tick — six behaviours observed:**

| Attempted | Result |
|---|---|
| tick with an actor | `{"ok": true, "ticked": true, …}`; `ticked_by` and `ticked_by_name` both written |
| **untick** | `{"ok": true, "ticked": false, "ticked_at": null}`; the author is **re-recorded** as the person who unticked |
| actor id null | `{"ok": false, "reason": "actor_required", …}` — returned, not raised |
| actor name blank | `{"ok": false, "reason": "actor_required", …}` |
| actor unknown | `{"ok": false, "reason": "actor_unknown", …}` — its own code, not collapsed into the one above |
| item unknown | `{"ok": false, "reason": "item_not_found", …}` — carrying no label |
| `p_ticked` null | `{"ok": false, "reason": "arguments_required", …}` |

No refusal carried a label, a venue word or a date, and none of them raised, so the row was
unchanged after all five.

### What a green does NOT mean

- **None of this is applied.** The policies exist as text. Whether they hold against a real
  Supabase session is settled by plan 44-13's written procedure with five real accounts —
  the Management API runs as a role that bypasses RLS, so no query this repository can issue
  settles it.
- The container proves the SQL parses, executes and is idempotent against **stub** relations
  and a **transcribed** capability model. It does not prove the column names match
  production's real `profiles`; 44-07's read-back is what settles that.
- `npm run build` proves the TypeScript half. It proves nothing about the row, the policy or
  the string, for the reason `keys.ts:17-32` gives.

### ⚠ `npm run verify:capabilities` is RED from this commit until plan 44-07

Expected, documented at `keys.ts:168-172`, and stated here so it is not discovered by the
next person who runs `npm run verify`. It needs a live database and the fourteenth row does
not exist in one yet. Plan 44-07 task 3 already asserts it goes green there — and, thanks to
deviation 2 below, it now can.

`verify:capabilities` side 4 will also report `production.read` as a key nobody asks for
until plan 44-09 binds it to a route. That is a **warning**, deliberately unsilenced, the
same treatment the tenth to twelfth keys received.

## Deviations from Plan

### 1. [Rule 3 — blocking] `src/lib/routes/capability-routes.ts` had to change in this commit

- **Found during:** Task 2, before writing a line of it.
- **Issue:** `CAPABILITY_ROUTES` is `as const satisfies Record<CapabilityKey, Binding>`
  (`capability-routes.ts:481`). **A key added to `CAP` with no entry there is a `npm run
  build` error.** The plan scopes this file to plan 44-09, which is **wave 4**; this plan is
  wave 2. Left alone, the tree would have been RED for two waves — including for 44-06 and
  44-07, whose own acceptance criteria are a green build.
- **Fix:** the entry lands here on the **`scope: "table"`** branch with a mandatory `reason`,
  which is the *only true* declaration available at this commit: the key gates six tables
  and no address, because `/admin/calendar` is not on disk and a static address enters the
  generated `Route` union only once a `page.tsx` serves it.
- **⚠ The obligation this creates, and it is the one thing in this plan that can go wrong
  silently.** Plan 44-09 must **move** the entry to
  `routes: ["/admin/calendar", "/admin/calendar/[id]"]` **with `alsoGatesTables: true`**.
  If it does not, `/admin/calendar` is unreachable **for everyone**: `resolveRoute` returns
  `null`, the middleware fails closed, and there is **no build error and nothing in a log**.
  That trap is recorded twice already in that file, at the `CATALOGUE_MANAGE` and
  `VENUE_REVEAL` entries — and `CATALOGUE_MANAGE` is also the precedent that this branch
  change is legitimate, having made exactly the same move when `/admin/formats` landed.
  The obligation is written into the entry's own docblock and into its `reason` string, so
  the next reader of that line meets it rather than the symptom.
- **Commit:** `2c3d8d6`

### 2. [Rule 2 — missing critical functionality] `scripts/verify-capabilities.mjs` had to declare the fourteenth key

- **Found during:** Task 2.
- **Issue, and it is the substantive one.** That script's side 5 holds a hand-written
  `ROLE_GRANTS` declaring **every** (role × capability) pair as a grant or as `REFUSED`, with
  `EXPECTED_PAIR_COUNT` / `GRANT` / `REFUSAL` asserted as numbers **before any database is
  read**. A fourteenth key with no pairs there fails the arithmetic on every run, for a
  reason that has nothing to do with the migration not being applied — and it would keep
  failing **after** 44-07 applied it. **Plan 44-07 task 3 asserts `npm run verify:capabilities`
  exits 0, and it could not have.** No plan in the phase owned this file.
- **Fix:** `EXPECTED_KEY_COUNT` 13 → 14; four pairs declared — `master: false`,
  `organizer: false`, `staff: 'REFUSED'`, `member: 'REFUSED'` — each with its reason;
  arithmetic 52/28/24 → **56/30/26**, appended to the constant's own changelog of the four
  previous moves rather than silently overwritten.
- **Why it belongs to THIS plan and not a later one.** The `staff` pair is the **only place
  in the repository where the phase's own critical invariant — *a door-assigned staff
  session stays out of the calendar* — becomes machine-asserted.** Everywhere else it is
  prose. A refusal that is only an absence of a row is indistinguishable, six months later,
  from a capability nobody considered; that is the whole argument of D-02, and the file says
  so. Declaring the key without declaring its refusals would have shipped the invariant as a
  comment.
- **Commit:** `2c3d8d6`

### 3. [Rule 1 — bug] The shared description string carried a date, which the migration forbids

- **Found during:** Task 3.
- **Issue:** the description string must be **byte-identical** in `keys.ts` and in the SQL,
  and the migration must contain **zero** date literals (the *no material* criterion, and the
  publication rule behind it). The first draft wrote `(D-44-27, the owner, 2026-08-15)` into
  the description — which would have put a `20\d\d-\d\d-\d\d` into a public migration and
  tripped the criterion.
- **Fix:** the date was removed from the shared string, which now reads `(D-44-27, the
  owner)`. The **date is not lost**: it is in this SUMMARY, in `ROLE_GRANTS`'s comment and in
  the arithmetic changelog, none of which is a migration. The task-2 commit was amended
  rather than followed by a fix-up, because *same commit, same bytes* is the rule the two
  files are held to and a drift that existed for one commit is a drift.
- **Commit:** `2c3d8d6` (amended)

### 4. [Rule 2 — narrowing] `GRANT EXECUTE` went to `service_role` alone, not to `authenticated`

- **Found during:** Task 3.
- **Issue:** the plan's action text says *"`GRANT EXECUTE` on both functions to
  `authenticated` and `service_role` **as the analog does**"*. The analog does not: it grants
  to `service_role` alone (`20260810160000:606-607`). The plan contradicts itself, and its
  own closing words are *"and nothing wider"*.
- **Fix, resolved toward the restrictive reading** (`meta-gates.md`: where two requirements
  conflict, the more restrictive wins, and the conflict is documented in the commit):
  - `record_checklist_tick` → `service_role` **only**. The reason is this function's own:
    **the actor is an argument.** A function reachable with a user JWT would let any caller
    attribute a tick to anybody they can name — the author column would stop being a trace
    and become a claim, which defeats T-44-15 entirely. Verified in the container: the ACL is
    `service_role=X` and nothing else.
  - `refuse_production_plan_renumber` → **no grant**. It is `RETURNS trigger`: it cannot be
    called directly, it runs with the trigger's privileges, and a grant on it would advertise
    an entry point that does not exist. `bump_series_watermark` carries none either.
- **Commit:** `d4ae3e3`

### 5. [Rule 4-adjacent, resolved in writing] The tick does not ask `production.read` inside itself

- **Found during:** Task 3.
- **Issue:** the plan asks the tick to refuse *"when the caller does not hold
  `production.read`"*. **That check cannot be written here without either breaking the
  function or violating two existing decisions:**
  - `private.has_capability` answers about `auth.uid()`, which is **null on every path that
    reaches this function** (the service client — measured, `32-06-SUMMARY.md` § F1). The
    check would refuse **every legitimate tick**.
  - Re-deriving the profiles-to-grants join for `p_actor_id` would create a **second
    implementation of the one table-driven rule** CAP-01 keeps single
    (`20260807000000_capability_model.sql`: *two definitions drift*), and would turn the
    function into an entitlement **oracle** answering about an arbitrary identifier — D-04
    refuses that shape, because this repository has **no rate limiting anywhere**.
- **Resolution, and it is the plan's own threat model's position:** the entitlement gate is
  the **caller's**, and the threat register of this very plan already says so — *"the
  boundary in front of \[the service client] is the capability check in the caller, and that
  check is plan 44-09's and 44-12's."* What makes the caller the **only reachable** path is
  deviation 4's grant. The whole argument is written into the function's header and into its
  `COMMENT`, so it reads as a decision and not as an omission.
- **What the function checks instead**, and these are guards that can actually fire: an
  anonymous tick (`actor_required`), an actor who does not exist (`actor_unknown`), a missing
  argument (`arguments_required`), an unknown item (`item_not_found`). All four were observed
  firing.
- **Commit:** `d4ae3e3`

### 6. [Rule 1] Three prohibition sentences tripped their own greps

- **Found during:** Task 3, running the acceptance criteria.
- **Issue:** the same defect plan 44-02 recorded. Writing the RLS-enabling command inside
  the idempotence list made `grep -c "ENABLE ROW LEVEL SECURITY"` return **7** instead of 6,
  and quoting `SET search_path = ''` in two explanatory paragraphs made that grep return
  **4** instead of 2.
- **Fix:** all three rewritten without the literal — *"enabling row level security is
  idempotent"*, *"the search_path is pinned empty below"*. `formats/actions.ts:58-63` is the
  reason: *a grep whose only match is the sentence forbidding the thing is a grep that gets
  ignored the third time it goes red.*
- **Commit:** `d4ae3e3`

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | **owned by plan 44-12**, not by this plan | Wave 1 **measured** — not anticipated — that every constraint refusal on these tables prints a `DETAIL:` line containing the entire failing row, and that a `production_plan` row carries `venue_word`. **Re-measured here for the contrast:** a `CHECK`/`NOT NULL` refusal on `production_piece` printed `DETAIL: Failing row contains (…)` with all nineteen columns, while `refuse_production_plan_renumber`'s deliberate `RAISE` printed **no `DETAIL` line at all** — only its message, naming the plan id. PostgREST exposes the first as `error.details`. **This plan closed every refusal path it owns** (the tick returns codes; the one `RAISE` names an identifier). **It does not own the two write paths that will call these objects — plan 44-12 does**, and every action there must log `error.code` and `error.message` only, never the error object and never the third field. Scope was deliberately not widened to reach into 44-12. |
| threat_flag: unreachable-surface | `src/lib/routes/capability-routes.ts` | Deviation 1 leaves a `scope: "table"` entry that **plan 44-09 must move to the `routes:` branch with `alsoGatesTables: true`**. Forgetting it makes `/admin/calendar` unreachable for everyone with no build error and nothing in a log. Not a new surface — a new **obligation**, recorded so it is not carried implicitly. |

No new network endpoint, no new auth path, no new file access and no schema change at a
trust boundary were introduced beyond what the plan's `<threat_model>` already registers.

## Threat register — dispositions honoured

| Threat ID | How it was met | Evidence |
|---|---|---|
| T-44-02 | one SELECT arm per table asking `production.read`; no public arm, no write arm; the key is NEW, so Phase 45 has something to take away | policy census: 6 policies, all `cmd = SELECT`; staff and anon read 0 from all six |
| T-44-03 | `BEFORE UPDATE OF number` refusing any change to a non-null number, including erasure; `SECURITY DEFINER` + empty `search_path`; no watermark comparison | four mutations observed, two refused and two allowed; `proconfig = {"search_path=\"\""}` |
| T-44-01 | refusals returned as jsonb reason codes; the one `RAISE` names a plan id and nothing else | five refusals observed carrying no label, no venue word, no date; the `RAISE` printed no `DETAIL` line |
| T-44-15 | actor id and name are arguments and are recorded in **both** directions; an anonymous tick is refused by name | `ticked_by`/`ticked_by_name` written on tick and re-written on untick; `actor_required` and `actor_unknown` observed |
| T-44-18 | `staff` holds neither grant; `door.operate` is a different key and is not consulted | **staff/approved read 0 from all six** in the container; the pair is declared in `ROLE_GRANTS` so it fails loudly if it ever acquires a row. Plan 44-13's real-account procedure remains the production proof |
| T-44-SC | no package was installed | `package.json` untouched |

## Known Stubs

None. Every object in the migration is complete and was exercised. The one thing that is
deliberately incomplete is declared as such: the `capability-routes.ts` entry is on the
branch that is true today and carries, in its own text, the plan that must move it.

## What This Plan Deliberately Did Not Do

- **Did not apply the migration.** Plan 44-07 owns applying, with its own authorisation.
- **Did not add a write policy, a public read arm or an `assignmentOpenable` flag.**
- **Did not re-implement `bump_series_watermark`**, and did not compare any number to
  `party_series.highest_assigned` — the archive holds numbers below it (D-44-08).
- **Did not touch `STATE.md` or `ROADMAP.md`.**
- **Did not open `docs/Music-*.ics`.**
- **Did not widen scope into plan 44-12's write paths**, even though this plan measured the
  disclosure they must handle. The finding is flagged with the plan that owns the fix.

## Self-Check: PASSED

- `supabase/migrations/20260815120100_production_calendar_access.sql` — FOUND
- `src/lib/capabilities/keys.ts` — FOUND, modified
- `src/lib/routes/capability-routes.ts` — FOUND, modified
- `scripts/verify-capabilities.mjs` — FOUND, modified
- commit `2c3d8d6` — FOUND
- commit `d4ae3e3` — FOUND
- `npm run build` exits 0 — verified after both commits
- description strings byte-identical (697 = 697) — verified by script
- six tables, six SELECT policies, zero write policies, zero public arms — verified in a
  live Postgres, not only by grep
- `STATE.md` and `ROADMAP.md` untouched — verified
- throwaway container removed — verified (`docker ps -a` shows none)
