---
phase: 38
plan: 01
subsystem: evidence-baseline
tags: [realtime, rls, baseline, door-procedures, security-definer]
requires:
  - a Supabase Management API access token in `.env.local`
  - `private.has_capability` as defined by phase 32
provides:
  - the `pre-38` realtime baseline — the zero against which plan 38-02's policy is a statement
  - the measured `SECURITY DEFINER` clause plan 38-02 must write on its four trigger wrappers
  - P1 … P7 in writing, with empty Results, for plan 38-07 to fill in
affects:
  - 38-02 (the migration's `SECURITY DEFINER` clause and the F1 revoke)
  - 38-04 (the after-figure probes read against this before-figure)
  - 38-07 (executes P1 … P7)
tech-stack:
  added: []
  patterns:
    - "read-only Management API probes (`read_only: true`, runs as `supabase_read_only_user`)"
    - "the precondition asserted by the same command that captures, never declared in prose afterwards"
key-files:
  created:
    - .planning/phases/38-live-attendance-freshness/baseline/38-BASELINE-realtime.pre-38.json
    - .planning/phases/38-live-attendance-freshness/38-PROCEDURES.md
  modified: []
decisions:
  - "The four trigger wrappers of plan 38-02 are SECURITY DEFINER, owned by the migration role — decided by measurement, not by style"
  - "The empty `information_schema.role_table_grants` result is an artefact of the probe, not a fact; the ACL is read from `pg_class.relacl`"
  - "P4 is written as *degraded, not dropped*, following PLAN and RESEARCH over VALIDATION's table, and the resulting uncovered scenario is stated"
metrics:
  duration: ~25 min
  completed: 2026-08-11
  tasks: 3
  commits: 3
---

# Phase 38 Plan 01: The Before-Figure and the Written Procedures — Summary

The realtime surface starts closed — **zero policies in schema `realtime`, RLS on
`realtime.messages`** — recorded while no migration of this phase existed on
disk, and the emit path was measured rather than assumed: `realtime.send` is
`SECURITY INVOKER`, so plan 38-02's four trigger wrappers must be
`SECURITY DEFINER` or the emit silently never happens.

## What was built

Two artifacts, no product code, no writes to production.

| Artifact | What it carries |
|----------|-----------------|
| `baseline/38-BASELINE-realtime.pre-38.json` | the zero, the RLS state and ACL of `realtime.messages`, the pre-existing trigger set on the four source tables, the current `private.has_capability` definition, the Realtime project config, and the `emit_path` measurement with its finding |
| `38-PROCEDURES.md` | P1 … P7, five fixed sections each, every Result empty and reading `pending` |

## The zero, and the ordering claim

```
realtime_policies:                []
messages_relstate.relrowsecurity: true
messages_relstate.relforcerowsecurity: false
realtime.messages owner:          supabase_realtime_admin
source_table_triggers:            []   (the before-set for the four tables)
realtime_config.suspend:          false
newest migration on disk:         20260810161000_venues_read_narrowed.sql
captured_at:                      2026-08-11T10:46Z
```

**The `[BLOCKING]` precondition was asserted mechanically, not remembered.** The
capture script begins by listing `supabase/migrations/` and exits non-zero,
writing nothing, if any filename contains `live_attendance_channel`. It was
re-asserted after all three commits: still zero. A baseline taken after the
change is not a baseline, and a precondition declared in prose is not a
precondition.

`private_only` is **not** returned by `GET /v1/projects/{ref}/config/realtime`;
its absence is recorded in the file rather than papered over, so a later claim
that it was applied needs a behavioural proof and not this key.

## The emit-path finding, in full

> The four trigger wrappers of plan 38-02 **MUST be `SECURITY DEFINER`**, owned
> by the migration role. `realtime.send` is `prosecdef = false` — `SECURITY
> INVOKER` — so its `INSERT` into `realtime.messages` executes with the
> privileges of whichever role performed the write that fired the trigger, and
> `realtime.messages` has `relrowsecurity = true` with zero policies. The plan's
> first case required `prosecdef = true`; it is false, so the second case holds.
> A `SECURITY INVOKER` wrapper would have its emit refused by
> RLS-with-no-`INSERT`-policy for any writing role without `rolbypassrls`,
> `realtime.send` would swallow that refusal in its own `EXCEPTION WHEN OTHERS
> THEN RAISE WARNING`, the emit would never happen, no error would surface
> anywhere, and the 5-minute safety reload would keep every door screen looking
> correct — LIVE-01 silently degraded into LIVE-04. `SECURITY DEFINER` owned by
> the migration role closes it: `public.door_scan_events.relowner` is `postgres`
> (measured, not assumed) and `postgres` has `rolbypassrls = true`.

The query results it rests on:

| Fact | Value |
|------|-------|
| `realtime.send` `prosecdef` | `false` |
| `realtime.send` owner / `proacl` | `supabase_realtime_admin` / `=X/…` (EXECUTE held by PUBLIC) |
| `realtime.messages` owner | `supabase_realtime_admin` |
| `public.door_scan_events` `relowner` | `postgres` |
| `rolbypassrls` | `postgres` true · `service_role` true · `supabase_admin` true · `authenticated` **false** · `anon` **false** · `authenticator` **false** · `supabase_realtime_admin` **false** |

**Why today's behaviour does not settle it.** Every write path this phase hangs
a trigger on runs today through the service client — verified at
`src/app/(admin)/admin/events/[id]/guest-list/actions.ts:108` (`getServiceClient`)
and in the check-in route — and `service_role` carries `rolbypassrls = true`. So
a `SECURITY INVOKER` wrapper would *happen* to work today. That is a property of
the callers, not of the schema, and nothing in the database pins it. The first
write path that reaches one of these four tables through a session client turns
every emit on that path into silence.

**F1 is recorded and left to plan 38-02.** The fan-out helper takes two `uuid`
arguments, so it is not a trigger function: with the default `EXECUTE` to
`PUBLIC` it is reachable over `/rest/v1/rpc/` by any signed-in session, which
could forge "the list changed" on any night whose id it knows. Closed in 38-02
by the `private` schema plus `REVOKE ALL … FROM public, anon, authenticated`,
not here.

**The `event_media_party_id` paragraph transfers only half.** Leg (a) — a
`RETURNS trigger` function cannot be called directly (`0A000`) and `EXECUTE` is
checked at `CREATE TRIGGER` time — transfers verbatim to the four wrappers. Leg
(b) — "it is `SECURITY INVOKER` and writes nothing" — does **not**. Quoting the
two as one paragraph would justify omitting a revoke with a premise this
measurement just falsified.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] `messages_grants` measured nothing, and would have read as a fact**

- **Found during:** Task 1
- **Issue:** the plan's probe on `information_schema.role_table_grants` returned
  `[]`. That view is filtered to grants where the current user is the grantor,
  the grantee, or a member of the grantee role — and `read_only: true` runs as
  `supabase_read_only_user`, which is none of those. An empty result meant two
  incompatible things ("no grants exist" and "you cannot see them"), and the
  acceptance criterion would have been read as *"`authenticated` does not hold
  `INSERT`"* — which would have removed the entire reason the missing `INSERT`
  policy is the boundary.
- **Fix:** added `probe_role` (records `current_user`), `messages_acl` and
  `messages_acl_expanded`, read from `pg_class.relacl` via `aclexplode`, which is
  not filtered. Added `messages_grants_note` explaining the artefact, and kept
  the empty original rather than replacing it, so the next reader does not repeat
  the same probe and misread it.
- **Result:** `anon = arw` and `authenticated = arw` on `realtime.messages` —
  both hold `INSERT`, `SELECT`, `UPDATE`. **The acceptance criterion is met, via
  the unfiltered probe.** With RLS on and no `INSERT` policy, refusing every row
  is the boundary; the grant being present is what makes that refusal
  load-bearing rather than incidental.
- **Files:** `baseline/38-BASELINE-realtime.pre-38.json`
- **Commit:** `6dfa236`

**2. [Rule 2 — Missing critical measurement] `service_role` and `authenticator` were not in the plan's role list**

- **Found during:** Task 2
- **Issue:** the plan's `owner_attrs` probe named `postgres`, `supabase_admin`,
  `supabase_realtime_admin`, `authenticated`, `anon`. But a `SECURITY INVOKER`
  wrapper's fate is decided by the `rolbypassrls` of the role that **performed
  the write** — which today is `service_role`, absent from the list. The finding
  would have been correct in its conclusion and unfounded in its argument.
- **Fix:** extended the probe to `service_role`, `authenticator` and
  `supabase_read_only_user`, and wrote
  `emit_path.why_todays_write_paths_do_not_settle_it` from the result.
- **Files:** `baseline/38-BASELINE-realtime.pre-38.json`
- **Commit:** `cf1a672`

**3. [Rule 3 — Blocking ambiguity] P4 is described differently in two phase documents**

- **Found during:** Task 3
- **Issue:** `38-VALIDATION.md` § *Manual-Only Verifications* describes **P4** as
  the never-established/airplane-mode door with a run of queued scans;
  `38-RESEARCH.md` § *The LIVE-02 Proof* and `38-01-PLAN.md` both describe **P4**
  as *degraded, not dropped* (Slow 3G). Writing one silently would have left the
  other reader believing a procedure had gone missing.
- **Fix:** P4 written as PLAN and RESEARCH say (they agree, and the plan is the
  instruction executed). The divergence and its consequence are stated in
  `38-PROCEDURES.md` § *Coverage*: **the fully-offline door — no network before
  the door opens, scans queued, then reconnect and drain — is not covered by
  P1 … P7 as written.** Left as a stated gap for plan 38-07 or the verifier;
  `38-VALIDATION.md` was **not** edited, because it is not this plan's file.
- **Files:** `38-PROCEDURES.md`
- **Commit:** `e750d4f`

### Not deviations, recorded because they were expected to be otherwise

- `source_table_triggers` came back `[]`. There are no non-internal triggers on
  `door_scan_events`, `tickets`, `guest_list_entries` or `ticket_refunds` today.
  That is the before-set, and it makes "the four new triggers" a statement
  plan 38-04 can check rather than a hope.

## Authentication gates

None. `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL` were present in
`.env.local` (main checkout — the file is gitignored and therefore absent from
the worktree; it was read by absolute path, inside the process).

## Verification

No product code was touched, so `npm run build` was not run — this plan has no B
evidence and does not claim any. The evidence is the three automated checks from
the plan, all run and all passing:

| Check | Result |
|-------|--------|
| Task 1 — zero policies, RLS on, suspend false, capture metadata complete | `pre-38 baseline ok: 0 realtime policies, RLS on, suspend false` |
| Task 2 — `emit_path` complete, finding names the clause, ≥ 80 chars | `emit path measured: The four trigger wrappers of plan 38-02 MUST be SECURITY DEFINER…` |
| Task 3 — P1 … P7, 7 of each section, all Results pending | `P1-P7 written, 7 of each section, results pending` |
| **(G)** finding not hedged — `grep -icE 'probably\|presumably\|should be fine'` | `0` |
| **(G)** no secret in the JSON — `grep -cE 'supabase\.co\|eyJ\|sbp_'` | `0` |
| **(G)** ordering claim re-asserted after all three commits | `0` matching migrations |

## Security and publication

- Every database probe used `POST /database/query` with `read_only: true`,
  confirmed to run as `supabase_read_only_user` (recorded in `probe_role`).
  **Nothing was written to production by this plan.**
- The project ref, access token and anon key were derived and read inside the
  process. The capture script refuses to write the file at all if any of them —
  or anything matching `supabase.co|eyJ|sbp_` — reaches the output.
- Both written files name **roles** ("an account holding `door.operate` for that
  night"), never people. No venue, no night's date, no line-up. The two dates in
  `38-PROCEDURES.md` are the document's own and the already-published
  2026-08-10 incident.
- Probe scripts live in the session scratchpad. Nothing was added to `scripts/`.

## Threat Flags

None. This plan added no network endpoint, no auth path, no file access pattern
and no schema change.

## Known Stubs

The seven **Result** lines in `38-PROCEDURES.md` are empty and read `pending`.
This is intentional and is the point of the artifact: plan 38-07 fills them in
with observations and times. An empty Result reads as an unrun procedure, which
is what it is.

## For the next plan

- **38-02:** write `SECURITY DEFINER` on all four trigger wrappers, with the
  reason named in the comment (the emit inserts into `realtime.messages`, and no
  client session may). Close F1 on the two-`uuid` helper. Do not quote the
  `event_media_party_id` paragraph as a whole — only leg (a).
- **38-04:** the after-figure probes read against `realtime_policies: []` and
  `source_table_triggers: []` in this file.
- **38-07:** P1 … P7 are written; do not rewrite them, fill the Results. P6's
  production authorisation is spent once and its four rules are in the procedure
  text.

## Self-Check: PASSED

- `FOUND: .planning/phases/38-live-attendance-freshness/baseline/38-BASELINE-realtime.pre-38.json`
- `FOUND: .planning/phases/38-live-attendance-freshness/38-PROCEDURES.md`
- `FOUND: 6dfa236` · `FOUND: cf1a672` · `FOUND: e750d4f`
