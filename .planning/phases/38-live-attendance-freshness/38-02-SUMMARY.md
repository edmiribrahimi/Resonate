---
phase: 38
plan: 02
subsystem: realtime-channel-migration
tags: [migration, rls, realtime, triggers, security-definer, door]
requires:
  - phase 32 — `private.has_capability(text, uuid)` and the `private` schema
  - plan 38-01 — the measured emit path that decides the `SECURITY` clause
provides:
  - the one migration the phase needs, WRITTEN and not applied
  - `private.notify_attendance_changed(uuid, uuid)` — the single definition of "which topic does this row belong to"
  - four `AFTER` triggers covering every write path that reaches the attendee list
  - `realtime_messages_select_door_assigned` — the one SELECT policy, LIVE-06
affects:
  - 38-03 (the client must send `{ config: { private: true } }` and a lowercase `door:<uuid>` topic)
  - 38-04 (applies this file behind the owner's blocking checkpoint, then re-asserts it with S probes)
tech-stack:
  added: []
  patterns:
    - "an emit from a trigger, `SECURITY DEFINER` because `realtime.send` is INVOKER and cannot raise"
    - "a fan-out over `public.event_parties` when the row names no night"
    - "a policy on a schema this project does not own, guarded by `CASE` because the topic is untrusted text"
key-files:
  created:
    - supabase/migrations/20260811120000_live_attendance_channel.sql
  modified: []
decisions:
  - "The four trigger wrappers are SECURITY DEFINER — from 38-01's measurement (realtime.send is prosecdef = false), not from style"
  - "The policy is realtime_messages_select_door_assigned, the house form, not the name research proposed"
  - "The fan-out helper lives in `private` AND carries REVOKE ALL with no re-grant — both, per D-38-18"
  - "The old-night emit (D-38-24) is guarded by row-wise IS DISTINCT FROM in the function body, never by AFTER UPDATE OF on the trigger"
metrics:
  duration: ~45 min
  completed: 2026-08-11
  tasks: 3
  commits: 3
---

# Phase 38 Plan 02: The Live Attendance Channel Migration — Summary

One file, 620 lines, one `BEGIN; … COMMIT;`: a fan-out helper that emits an
empty signal, four `AFTER` triggers that call it, and a single `SELECT` policy
that decides who may hear it. **The migration is written and deliberately not
applied** — plan 38-04 applies it, behind a blocking checkpoint, after the owner
has read the SQL.

## What was built

`supabase/migrations/20260811120000_live_attendance_channel.sql` — the timestamp
sorts after `20260810161000_venues_read_narrowed.sql`, which was the newest file
on disk.

| Section | Object | What it decides |
|---------|--------|-----------------|
| 1 | `private.notify_attendance_changed(uuid, uuid)` | which topic a changed row belongs to — and the fan-out when it names no night |
| 2 | `public.door_scan_events_notify_attendance()` + trigger, `AFTER INSERT` | the whole door: check-in, membership admission, undo, and the offline drain |
| 3 | `public.tickets_notify_attendance()` + trigger, `AFTER INSERT OR UPDATE OR DELETE` | bought, checked in, moved between nights, deleted on refund |
| 4 | `public.guest_list_entries_notify_attendance()` + trigger, same four verbs | the unpaid entrance |
| 5 | `public.ticket_refunds_notify_attendance()` + trigger, `AFTER INSERT OR UPDATE` | how a night learns a holder is no longer expected |
| 6 | `realtime_messages_select_door_assigned` | who may listen, LIVE-06 |
| 7 | *(nothing)* | the write policy this file refuses to create, and why the refusal is the boundary |

## The three things the plan asked this summary to record

### 1. The `SECURITY` clause, and the finding it came from

**All four wrappers — and the helper — are `SECURITY DEFINER`.**

Plan 38-01 measured `realtime.send` on this project to be `prosecdef = false`,
i.e. **SECURITY INVOKER**. The plan's first case expected `true`; it is false, so
the second case holds. Its INSERT into `realtime.messages` therefore runs with
the privileges of whichever role performed the write that fired the trigger, and
`realtime.messages` has `relrowsecurity = true` with no INSERT policy (section 7,
on purpose).

A `SECURITY INVOKER` wrapper would have its emit refused by
RLS-with-no-INSERT-policy for any writing role without `rolbypassrls`,
`realtime.send` would swallow the refusal in its own `EXCEPTION WHEN OTHERS THEN
RAISE WARNING`, no error would surface anywhere, and the 5-minute safety reload
would keep every door screen **looking correct**. LIVE-01 would have silently
become LIVE-04.

The trap is written into the file at section 1 so it cannot be "simplified"
away: an INVOKER wrapper **would work today**, because every write path this file
hangs a trigger on currently runs through the service client and `service_role`
carries `rolbypassrls = true`. That is a property of today's callers, not of the
schema, and nothing pins it.

The `event_media_party_id:253-262` paragraph was used **only for leg (a)** — a
`RETURNS trigger` function cannot be called directly (`0A000`), so the four
wrappers need no grant pair. Leg (b) — "it is SECURITY INVOKER and writes
nothing" — is false here and is not quoted; the helper's REVOKE is argued on its
own merits instead (section 1, last paragraph).

### 2. The policy name, and why it is not the one research proposed

`realtime_messages_select_door_assigned` (D-38-17).

`38-RESEARCH.md` § Pattern 5 proposed `door_attendance_broadcast_read` — verb
last, question in the middle. The house form, used by every policy written since
`20260805120000_door_scan_events.sql`, is `<subject>_<verb>_<question>` with the
subject slot naming **the object the policy sits on**:
`door_scan_events_select_admin`, `event_media_quarantine_insert_approved`. This
policy sits on `realtime.messages`.

The research name is perfectly readable, and it is not taken because two naming
forms coexisting is how a greppable convention stops being one — the next person
greps twice, and the time after that, not at all.

### 3. The figure that makes the missing INSERT policy load-bearing

From 38-01's `messages_acl_expanded`, read via `pg_class.relacl` + `aclexplode`
on 2026-08-11: **`anon = arw` and `authenticated = arw` on `realtime.messages`**
— table-level INSERT, SELECT and UPDATE, already granted.

So RLS with no INSERT policy is not a formality: it is the only thing standing
between a signed-in member and the ability to broadcast "the list changed" on a
door's topic. **The database is the only sender.** The omission is written into
section 7 with the two in-repo precedents beside it
(`20260805120000_door_scan_events.sql:158-163`,
`20260808002000_membership_register.sql:345-349`) so the next reader recognises a
pattern instead of repairing a gap.

Section 7 also records why that grant was nearly invisible: 38-01's first probe
read `information_schema.role_table_grants` and came back empty, which means
*"you may not see them"* and not *"there are none"*.

## Verification

`npm run build` proves nothing here — a migration is not type-checked by anything
in this repository, and no Supabase client in it is parameterised with
`Database`. It was not run, and this plan claims no **B** evidence.

### G — the plan's own structural checks

| Check | Result |
|-------|--------|
| Task 1 — helper revoked, in `private`, fan-out present, no re-grant | `helper ok: revoked, private, fan-out present, no re-grant` |
| Task 2 — four triggers, old-night emit guarded on three | `four triggers ok, old-night emit guarded on three (helper calls: 10, IS DISTINCT FROM: 3)` |
| Task 3 — one SELECT policy, one arm, CASE-guarded, no write policy | `policy ok: one SELECT policy, one arm, CASE-guarded, no write policy` |
| Task 2's checks **re-run against the finished file** | pass (see deviation 4) |
| `public.notify_attendance_changed` anywhere | `0` |
| `ON public.attendances` (D-38-20) | `0` |
| bare `event_parties` on non-comment lines | `0` — every reference is `public.`-qualified |
| project ref / key / URL in the file | `0` |

### D — a local parse and behaviour harness, beyond what the plan required

The plan states its evidence is **G-only** and "deliberately incomplete on its
own". A structural grep cannot tell a well-formed file from one that fails to
parse, and a plpgsql syntax error would have surfaced only at 38-04's
owner-gated apply — the most expensive place to find it. So the file was run
against a **throwaway local `postgres:17.6` container** (the same image this
repository's own migrations record measuring against), with stub tables and stub
functions carrying the signatures read from the real migrations.

**What this proves:** the file parses, resolves, and applies as one transaction;
re-running it succeeds (idempotence, no `42710`); the row-wise
`(OLD.…) IS DISTINCT FROM (NEW.…)` construct is valid.

**What it does not prove, said plainly:** nothing about the real
`realtime.messages`, the real `realtime.send`, the real policy evaluation, or
production. The stubs have the right shapes and no behaviour. The **S** probes in
plan 38-04 remain the only proof of what actually lands.

Then `realtime.send` was replaced with a recorder and each branch exercised:

| Branch | Expected | Observed |
|--------|----------|----------|
| A `door_scan_events` INSERT | 1 emit on `door:P1` | 1 emit, `door:P1`, payload `{}`, private `t` |
| B `tickets` INSERT with `party_id NULL` on E1 | **fan-out**, 2 emits | `door:P1`, `door:P2` |
| C `tickets` UPDATE `checked_in` only (the hot path) | unchanged, guard must NOT fire | 2 emits, not 4 |
| D `tickets` UPDATE `NULL → P1` | new pair + old fan-out = 3 | `door:P1` ×2, `door:P2` ×1 |
| E `tickets` UPDATE `P1/E1 → P3/E2` across events | new + old | `door:P3`, `door:P1` |
| F `tickets` DELETE | reads `OLD` | `door:P3` |
| G `guest_list_entries` UPDATE `P1 → P2` | new + old | `door:P2`, `door:P1` |
| H `ticket_refunds` INSERT, both columns null | 0 emits — no night to tell | 0 |
| I `ticket_refunds` UPDATE naming P2 | 1 emit | `door:P2` |
| J every send | payload exactly `{}`, private, event `attendance_changed` | one distinct row: `{}` / `t` / `attendance_changed` |

Branch **D** is the one that matters most: it is exactly the transition on which
`<>` answers `NULL` — neither true nor false — and where a `<>` guard would have
left the event level unnotified. `IS DISTINCT FROM` answered.

**One observed cost, recorded rather than smoothed over.** In branch D,
`door:P1` receives **two** messages from a single statement: one for the new pair
and one from the old pair's fan-out. That is the "one too wide costs a single
GET" direction D-38-21 chose on purpose, and the client's coalescing debounce
absorbs it. It is not a defect, but it is a fact the next reader should not have
to rediscover.

Probe scripts live in the session scratchpad; nothing was added to `scripts/`,
and the container was removed.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — Blocking correctness of the committed artifact] `COMMIT;` closes the file at every commit, not only at task 3**

- **Found during:** Task 1
- **Issue:** the plan says "Open `BEGIN;`. The file closes with `COMMIT;` at the
  end of task 3." Followed literally, tasks 1 and 2 would each publish to git a
  migration file holding an **unterminated transaction** — a file that is broken
  if anything reads or applies it in between. The header of this very file claims
  "the interrupted state cannot survive"; committing an interrupted file would
  have made that sentence false about the file itself.
- **Fix:** each task's commit closes the transaction, and the following task
  moves the `COMMIT;` to the new end. Every commit in this plan holds a
  syntactically complete migration.
- **Result:** the final file has exactly one `^BEGIN;` and one `^COMMIT;`, which
  is what task 3's check requires.
- **Commits:** `38b262b`, `c8a1652`, `1a39d67`

**2. [Rule 2 — Refusing to write dead code] No `TG_OP = 'DELETE'` branch on the two wrappers whose triggers carry no `DELETE`**

- **Found during:** Task 2
- **Issue:** the plan says "each wrapper declares two local variables, assigns
  them from `OLD` when `TG_OP = 'DELETE'` and from `NEW` otherwise". But
  `door_scan_events` carries `AFTER INSERT` only and `ticket_refunds` carries
  `AFTER INSERT OR UPDATE` — both per the plan's own per-table specification. A
  `DELETE` branch on either is unreachable code, and unreachable code in a
  security-relevant file is worse than absent code: it tells the next reader that
  a case is handled which never occurs, and invites them to widen the trigger to
  match it.
- **Fix:** both read `NEW` directly, and each carries the sentence saying why.
  `door_scan_events` says it is append-only **by construction** (no write policy
  at all) and that the missing UPDATE branch is deliberate — the plan explicitly
  asked for that sentence. `ticket_refunds` says a refund row is a durable record
  and is not removed.
- **Result:** the acceptance criteria still hold — `TG_OP = 'DELETE'` appears
  (on `tickets` and `guest_list_entries`), and `IS DISTINCT FROM` appears three
  times, one per update-capable wrapper.
- **Commit:** `c8a1652`

**3. [Rule 3 — DDL that cannot run in the stated order] Function idempotence is `CREATE OR REPLACE`, not `DROP FUNCTION IF EXISTS`**

- **Found during:** Task 2
- **Issue:** the plan asks for each `CREATE` to be preceded by its
  `DROP … IF EXISTS`. For a trigger function that is not merely stylistic — it is
  ordering-sensitive: `DROP FUNCTION IF EXISTS public.tickets_notify_attendance()`
  **fails** while its trigger still exists, because the trigger depends on it.
- **Fix:** functions use `CREATE OR REPLACE` — the form the house analog
  `20260810120000_formats_and_series.sql:590` uses — and the four triggers and the
  one policy each carry their `DROP … IF EXISTS`. The header states both
  mechanisms explicitly rather than claiming a single one, so the idempotence
  sentence is true rather than approximate.
- **Result:** proved, not asserted: the file was applied twice in a row against
  the local harness and the second run succeeded.
- **Commit:** `c8a1652`

**4. [Rule 1 — A check that only passes on a snapshot is a broken check] The second `WHEN` in the policy breaks before its parenthesis**

- **Found during:** Task 3
- **Issue:** task 2's structural check asserts zero `WHEN (` in the file, meaning
  "no trigger carries a `WHEN` clause". The policy's `CASE` in task 3 naturally
  reads `WHEN (SELECT realtime.topic()) ~ …`, which matches that grep. The check
  would therefore have been green at task 2 and red against the finished file —
  a check that only passes at one moment in history, which costs somebody an
  investigation every time it is re-run.
- **Fix:** the `WHEN` sits on its own line, above its condition. Semantically
  identical, and arguably more readable given the length of the uuid regex. One
  short comment in the file records that the break is deliberate, so a
  reformatter does not silently break the phase's own check.
- **Result:** task 2's checks were **re-run against the completed file** and pass.
- **Commit:** `1a39d67`

### Corrected in place, worth naming

`has_capability('door.operate'` was initially split across two lines for
readability, which broke task 3's own `grep -qE "has_capability\('door\.operate'"`.
Recompacted onto one line. The check caught it, which is the check doing its job.

## Cross-domain impact

- **`ticketing-payments.md`** — two of the four triggers sit on the money tables.
  The header answers before the reader asks: `AFTER` triggers, returning `NULL`,
  performing no write of their own, calling a function whose only action is
  `realtime.send`, which wraps its insert in `EXCEPTION WHEN OTHERS THEN RAISE
  WARNING` and therefore **cannot raise**. Adding them introduces zero new ways
  for a purchase, a check-in or a refund to fail.
- **`meta-gates.md`, the three monotone guards** — none is touched.
  `venue_reveal_sent` is neither read nor written; no payment state is read or
  written; no series progressivo is read or written. `public.event_parties` is
  read for `id` and `event_id` only, and never written.
- **`meta-gates.md`, zero silent failures** — stated in the header rather than
  hidden: because `realtime.send` cannot raise, a failed emit is invisible except
  in the Postgres log, and this repository has no error tracking. That is exactly
  why the DEFINER clause is not optional and why the door carries the 5-minute
  parachute and a visible staleness band. The observability lives at the door,
  because it cannot live in the database.
- **`access-gating.md`** — the boundary is a policy, not a client filter, and it
  asks the question phase 32 already defined. No new predicate resolving
  "assigned to this night" was introduced (`grep` for
  `is_assigned|assigned_to_party|can_operate` returns 0).
- **`supabase-data.md`, gate RLS contestuale** — `realtime.messages` held **zero**
  policies before this file (38-01's baseline). This adds exactly one, so nothing
  is being OR'd onto an existing permissive policy.
- **`supabase-data.md`, gate tipi allineati** — no table, column or type changes,
  so `src/types/database.ts` is unaffected. Nothing outside
  `supabase/migrations/` was touched.

## For plan 38-03 (the client, running in parallel)

Two contract points this file fixes, both invisible to any automated check:

- **The topic is `door:<party uuid>`, lowercase.** The policy's regex is
  case-sensitive `[0-9a-f]` on purpose: a case mismatch is refused loudly at join
  time — which sets `channelLive` false and shows the band — instead of joining
  cleanly and delivering nothing.
- **The channel must be `{ config: { private: true } }`.** The trigger sends with
  `private = true`. If the two sides disagree the channel joins, reports
  `SUBSCRIBED`, and delivers nothing: the door looks healthy while only the
  5-minute parachute keeps its list alive.
- The event name is `attendance_changed` and the payload is `{"id": "<uuid>"}` —
  the random id `realtime.send` adds and nothing else. There is no field to read.

## For plan 38-04

- Apply this file **behind the owner's blocking checkpoint**. It was not applied
  by this plan; production schema is unchanged.
- The **S** probes read against 38-01's baseline of `realtime_policies: []` and
  `source_table_triggers: []`.
- Task 3's re-assertion of `pg_get_functiondef` should cover the **three**
  update-capable wrappers (`tickets`, `guest_list_entries`, `ticket_refunds`) —
  `door_scan_events` correctly has no old-pair branch.
- `proacl` on `private.notify_attendance_changed` must grant `EXECUTE` to nobody.

## What is deliberately not proved yet

The migration is **written, not applied**. Until 38-04 this phase has a written
intention and not a boundary: the policy does not exist in production, the four
triggers do not exist in production, and no door is listening to anything. That
is the plan's design, not an omission — and it is why 38-04 is `autonomous:
false`.

## Threat Flags

None. Every object in this file is already in the plan's threat register
(T-38-02-01 … T-38-02-07). No new network endpoint, no new auth path, no new file
access pattern, and no schema change at a trust boundary was introduced.

## Known Stubs

None in the product. The stub tables and stub functions used for the local parse
and behaviour harness live in the session scratchpad and were never written to
the repository; the container was removed after the run.

## Publication check

The file names roles — `master`, `organizer`, `staff`, `authenticated`, `anon`
— and never people. No venue, no date of a night, no line-up, no project ref, no
key, no URL (`grep -cE 'supabase\.co|sbp_|eyJ|https?://'` returns 0).

## Self-Check: PASSED

- `FOUND: supabase/migrations/20260811120000_live_attendance_channel.sql` (620 lines)
- `FOUND: 38b262b` · `FOUND: c8a1652` · `FOUND: 1a39d67`
- `STATE.md` and `ROADMAP.md` untouched by this plan, as instructed — the
  orchestrator owns those writes
- Only `supabase/migrations/` was modified
