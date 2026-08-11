---
phase: 38
plan: 04
subsystem: production-apply-and-measurement
tags: [migration, production, rls, realtime, triggers, security-definer, door, measurement]
requires:
  - plan 38-02 — the migration file, written and deliberately unapplied
  - plan 38-01 — the pre-38 before-figure every probe here is read against
  - the owner's blocking authorisation, granted 2026-08-11
provides:
  - the phase's boundary EXISTING in production, not merely written
  - version `20260811111530` in the project's migration history
  - the after-figure — policies, triggers, the helper's ACL, the row snapshot on both sides
  - F1 closed in production, measured twice and by two different means
affects:
  - 38-03 (the client now has a channel that something actually sends to)
  - 38-05 (the door screen it wires up has a live boundary behind it)
  - 38-07 (P1 … P7 can now be run at all; P7 is what LIVE-06 still waits on)
tech-stack:
  added: []
  patterns:
    - "apply through /database/migrations so the project's history records the version"
    - "the cascade set enumerated by walking pg_constraint, never remembered"
    - "the boundary read from the catalogues, never from the file that asked for it"
    - "a refusal observed (0A000, 42501) is worth more than an ACL read and inferred"
key-files:
  created:
    - .planning/phases/38-live-attendance-freshness/baseline/38-BASELINE-realtime.post-38.json
  modified: []
decisions:
  - "The gated cascade set is the 25-table public closure plus the 2 private tables it reaches; the 13 auth tables are counted and reported but not gated, because the auth service writes them independently"
  - "The four wrappers' permissive proacl is not a finding — a RETURNS trigger function is not callable at all, and that was measured (0A000) rather than cited"
  - "LIVE-06 is NOT closed by this plan. The Management API bypasses RLS; P7 closes it"
metrics:
  duration: ~35 min
  completed: 2026-08-11
  tasks: 3
  commits: 3
---

# Phase 38 Plan 04: The Apply, and What It Actually Did — Summary

The migration is in production as version **`20260811111530`**, applied through
the migrations endpoint so the project's history records it. **Twenty-seven
tables in the cascade set hold an identical count on both sides of the apply —
81 rows before, 81 rows after.** The boundary was then read from the catalogues
rather than from the file that asked for it: one `SELECT` policy, zero write
policies, four triggers on four tables, and a fan-out helper that refuses a
direct call.

## The owner's authorisation — when it was spent, and that it is exhausted

**Granted:** 2026-08-11, by the project owner, against a described scope of *one
DDL transaction, zero row writes* on this exact file.

**Spent:** 2026-08-11 at **11:15:24 UTC**, on the single `POST` recorded below.
That is the only write this plan made to production.

**Exhausted.** It covered that one apply and the read-only probes after it. It
does **not** extend to writing, updating or deleting any data row, to a second
migration, to a config change (`private_only`, `worker`, realtime settings), or
to repairing the pre-existing migration-history drift. Anything in that list
needs a new authorisation.

**The file was verified byte-identical to what was authorised before it was
sent.** `git status` clean, unchanged since `1a39d67` (plan 38-02's last
commit), sha256 `4f92bee2…5421a`, and the description matched mechanically:

| The authorisation said | Measured on the file |
|---|---|
| 620 lines | 620 |
| one transaction | one `^BEGIN;`, one `^COMMIT;` |
| 5 functions | 5 `CREATE OR REPLACE FUNCTION` |
| 4 triggers | 4 `CREATE TRIGGER` |
| 1 policy | 1 `CREATE POLICY` |
| 1 revoke, no grant | 1 `REVOKE`, 0 `GRANT` |
| no `ALTER TABLE`, no table drop | 0 and 0 |
| zero data rows | 0 `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` statements |

An authorisation given against a description stops covering the file the moment
the file stops matching the description, so the match is checked rather than
assumed.

## Task 1 — the checkpoint, already answered

The blocking checkpoint had been presented to the owner and answered before this
executor started, so it was not re-asked. It produced no file change and
therefore no commit; the evidence that its gate was honoured is the table above
plus the pre-flight below.

**The scheduling constraint was measured, not assumed.** The checkpoint asks
that the migration not be applied during a night, because the four triggers land
on the check-in write path and a DDL transaction takes locks on those tables for
the moment it runs (T-38-04-06).

| Pre-flight, 2026-08-11 11:14 UTC | Value |
|---|---|
| Nights dated today or yesterday | **0** |
| Nights dated today or tomorrow | **0** |
| Policies in schema `realtime` | 0 — the migration was genuinely unapplied |
| Triggers on the four source tables | 0 |
| `private.notify_attendance_changed` exists | no |
| Version already in the history | 0 |

Counts only reached the artifact — no name, no date, no venue. This repository
is public.

## Task 2 — snapshot, apply, snapshot

### The apply

| | |
|---|---|
| Endpoint | `POST /v1/projects/{ref}/database/migrations` |
| Name sent | `live_attendance_channel` |
| **Version assigned** | **`20260811111530`** |
| Sent | 32 756 bytes, 621 lines, byte for byte — no paraphrase, no comments stripped |
| Response | `200`, body `[]` |
| History head before | `20260811001927` · `20260810210214` · `20260810144239` |
| History head after | **`20260811111530 live_attendance_channel`** · `20260811001927` · `20260810210214` |

**Not `/database/query`.** That endpoint applies DDL and writes nothing into the
project's history; using it here would have added a nineteenth gap to the
eighteen that already predate this phase. Precedent: phase 36 applied
`20260810144239` this way, phase 37 `20260810210214`.

**The endpoint assigns its own wall-clock version** (`20260811111530`) rather
than adopting the filename's timestamp (`20260811120000`). Same behaviour as
phases 36 and 37, and the reason the version is recorded from the response
instead of inferred from the filename.

**The confirmation came from a different source than the one acted on.** The
`POST` returned `200` with an empty body — which says the request was accepted,
not that any object exists. Everything in task 3 is read from the catalogues.

### The cascade set, walked and not remembered

All **102** foreign keys in the database were read from `pg_constraint`
(`contype = 'f'`), and the graph was walked in **both directions** from the four
trigger tables until closure. Phase 37's precedent is why: it found the true
count was 18 tables and not 17, because `discount_code_tiers` arrives at two
hops through two different paths.

- **Gated set — 27 tables:** the 25-table `public` closure plus the two
  `private` tables the closure reaches. The migration creates into `private`, so
  those belong under the gate.
- **Observed but not gated — 13 tables:** the `auth` schema is in the full
  closure (`public.profiles` references `auth.users`), but the auth service
  writes `auth.sessions`, `auth.refresh_tokens` and `auth.one_time_tokens` on
  any login or token refresh, independently of this transaction. Gating on them
  would manufacture a false failure that hides the signal the gate exists to
  carry. **They were counted on both sides anyway, and they did not move
  either.**

**All seven tables of the D12 incident are inside the gated set** —
`drink_orders`, `drink_tokens`, `drink_items`, `pending_purchases`, `tickets`,
`ticket_tiers`, `guest_list_entries`. That is the point of the set: 63 rows were
lost on 2026-08-10 and this project has no PITR.

### Zero rows moved — demonstrated, not asserted

| | Before 11:14:35 UTC | After 11:15:39 UTC |
|---|---|---|
| Gated tables | 27 | 27 (same set) |
| Total rows | **81** | **81** |
| Cells that differ | — | **none** |
| Observed `auth` tables | 13 | 13, **none differ** |

The full per-table figures are in the artifact. Non-zero counts, for the reader
who wants to know the snapshot was not taken against an empty database:
`private.role_capabilities` 28, `private.capabilities` 13, `artists` 7,
`drink_items` 7, `party_series` 6, `venues` 5, `formats` 5, `profiles` 4,
`event_parties` 3, `events` 2, `ticket_tiers` 1. The remaining sixteen are at 0.

**The pre-existing history drift was not touched.**
`20260508000000_drink_token_active_state.sql` is applied in production but absent
from the history (STATE.md:276-281); repairing it is the owner's call and is
outside the authorisation this plan spent.

## Task 3 — the boundary as Postgres renders it

Every probe read-only, each against its `pre-38` counterpart.

| Probe | pre-38 | post-38 | Reading |
|---|---|---|---|
| `realtime_policies` | `[]` | **1** | `realtime_messages_select_door_assigned`, `cmd` = `SELECT`, `TO {authenticated}` |
| `write_policies` | `[]` | **0** | no `INSERT`/`UPDATE`/`DELETE`/`ALL` policy exists |
| `source_table_triggers` | `[]` | **4** | **+4**, one per table, on four and not three |
| `helper_acl` | did not exist | **1 row** | `private`, `prosecdef` true, `search_path=""`, `proacl` **`{postgres=X/postgres}`** |
| `realtime_send_body` | wraps `EXCEPTION WHEN OTHERS` | **still does** | the money-table triggers still cannot raise |
| `wrapper_bodies` | none existed | **3** | each with `IS DISTINCT FROM` and two helper calls |
| `realtime_config.suspend` | `false` | **`false`** at 2026-08-11T11:16Z | |

### The policy, read as Postgres renders it and not as the file reads

```
CASE
    WHEN (extension <> 'broadcast'::text) THEN false
    WHEN (( SELECT realtime.topic() AS topic) ~ '^door:[0-9a-f]{8}-…-[0-9a-f]{12}'::text)
      THEN ( SELECT private.has_capability('door.operate'::text,
             (SUBSTRING(( SELECT realtime.topic() AS topic) FROM 6))::uuid) AS has_capability)
    ELSE false
END
```

Three things survive the round trip through the catalogue, and each was the
point of reading it there rather than in the diff:

- **The topic regex is still evaluated in a `CASE` arm before the `::uuid`
  cast.** The other order raises `22P02` on a malformed topic, and an error
  inside a policy is a *refused connection*, not a `false` — a door turned away
  on the night somebody typed a topic wrong.
- **The predicate names `private.has_capability` and the literal
  `'door.operate'`, and nothing else.** No second definition of "assigned to
  this night" was introduced, which is the failure phase 32 exists to prevent.
- **The regex is still case-sensitive `[0-9a-f]`.** A case mismatch is refused
  loudly at join time, which shows the band, instead of joining cleanly and
  delivering nothing.

Phase 36 is the precedent for why this is read from `pg_policies.qual`: an
unqualified join would have been `USING (true)` in disguise, and it read
correctly in the diff.

### The empty `write_policies` is the boundary

Zero is the answer that matters. With `relrowsecurity = true` — re-confirmed
after the apply — and `anon` and `authenticated` each already holding table-level
`arw` on `realtime.messages` (38-01, `messages_acl_expanded`), the **absence** of
any `INSERT` policy is the only thing standing between a signed-in member and the
ability to broadcast "the list changed" on a door's topic. The database is the
only sender. The gap is the design, not unfinished work.

### F1 closed in production — twice, and by two different means

**By ACL.** `proacl` is `{postgres=X/postgres}`. It is **non-null**, which is the
half that matters: a null `proacl` would have meant the default `EXECUTE` to
`PUBLIC` still applied and the `REVOKE` had not taken — a failure, not a missing
datum. It grants `EXECUTE` to the owner and to nobody else: no bare `=X/` entry,
no `anon`, no `authenticated`.

**By refusal.** The plan did not ask for this and it is the stronger evidence, so
it was taken (Rule 2). Each call went through `/database/query` with
`read_only: true`, so the whole transaction was READ ONLY and no write could have
landed whatever the answer was:

| Call | Answer |
|---|---|
| `select private.notify_attendance_changed(null, null)` | **`42501: permission denied for function notify_attendance_changed`** |
| `select public.tickets_notify_attendance()` | `0A000: trigger functions can only be called as triggers` |
| `select public.door_scan_events_notify_attendance()` | `0A000: trigger functions can only be called as triggers` |

The `42501` **is** F1 closed, observed from a role that is not the owner, rather
than inferred from an ACL string.

The `0A000` pair settles a question the ACL would otherwise have raised: **the
four wrappers carry a permissive `proacl`** — `{=X/postgres, anon=X/postgres,
authenticated=X/postgres, service_role=X/postgres}`, the Supabase default for a
function created in `public` by `postgres`. That grants nobody anything, because
a `RETURNS trigger` function cannot be called directly at all. That is leg (a) of
the `event_media_party_id:253-262` paragraph — **measured on this project rather
than quoted**, which is what plan 38-01 asked for when it refused to let the two
legs travel as one.

### The fourth wrapper, read separately on purpose

`door_scan_events_notify_attendance` has **one** helper call and **no**
`IS DISTINCT FROM`, and that is correct: `public.door_scan_events` is append-only
by construction, so there is no update whose old night could differ from its new
one. It was read under its own key rather than dropped into the set of three —
counting it there would have let a real regression in one of the other three hide
behind a total of four.

### The trigger set, stated as a difference

Before: **0** across the four tables. After: **4**.

| Table | Trigger | Timing |
|---|---|---|
| `door_scan_events` | `door_scan_events_notify_attendance` | `AFTER INSERT` |
| `tickets` | `tickets_notify_attendance` | `AFTER INSERT OR DELETE OR UPDATE` |
| `guest_list_entries` | `guest_list_entries_notify_attendance` | `AFTER INSERT OR DELETE OR UPDATE` |
| `ticket_refunds` | `ticket_refunds_notify_attendance` | `AFTER INSERT OR UPDATE` |

## What these probes cannot settle — and this is not a formality

**The Management API bypasses RLS.** Every probe above ran as
`supabase_read_only_user`. Not one of them shows that a real member session is
refused.

**LIVE-06 is NOT closed by this plan.** The policy exists, it is a `SELECT`
policy, its rendered predicate asks the door question — and all three of those
are statements about the catalogue, not about an authenticated browser. What
closes LIVE-06 is **procedure P7** in plan 38-07, and nothing before it.

**LIVE-01 likewise.** The four triggers exist and the helper is unreachable, but
no message has been observed arriving at a subscribed client. That is **P1** and
**P2**. A trigger in `pg_trigger` is not an emit on a wire.

And the one that no query here or anywhere can reach: the client must send
`{ config: { private: true } }` with a lowercase `door:<uuid>` topic. If the two
sides disagree the channel joins, reports `SUBSCRIBED`, and delivers nothing —
the door looks healthy while only the 5-minute parachute keeps its list alive.
No automated check catches it; a person at a door does.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The cascade walk reaches the whole `auth` schema, whose tables move on their own**

- **Found during:** Task 2
- **Issue:** the plan says walk `pg_constraint` "in both directions". Done
  literally, the closure from `tickets` reaches `auth.users` through
  `public.profiles` and from there the entire `auth` schema — 13 tables,
  including `auth.sessions`, `auth.refresh_tokens` and `auth.one_time_tokens`.
  Those are written by the auth service on any login or token refresh, so a
  single sign-in during the sixty-four seconds between the two snapshots would
  have failed the gate and stopped the plan — reporting "rows moved during a
  DDL-only migration" about something the migration cannot touch. A gate that
  fires on noise is a gate that gets ignored the second time.
- **Fix:** the equality gate covers the 25-table `public` closure plus the two
  `private` tables it reaches (27). The 13 `auth` tables are **still counted on
  both sides** and reported under their own keys — excluded from the gate, not
  from the measurement.
- **Result:** neither set moved. The distinction cost nothing this time and is
  the reason the result is readable.
- **Files:** `baseline/38-BASELINE-realtime.post-38.json`
- **Commit:** `298aa88`

**2. [Rule 2 — Missing critical measurement] The wrappers' permissive ACL needed an answer, not a citation**

- **Found during:** Task 3
- **Issue:** `helper_acl` closes F1 on the helper, but reading the four wrappers
  showed `anon=X/postgres, authenticated=X/postgres` and a bare `=X/postgres` on
  each of them. Left in the artifact unexplained, the next reader finds four
  `SECURITY DEFINER` functions in `public` with `EXECUTE` to `PUBLIC` and has to
  either trust a paragraph in another migration or repeat the investigation.
- **Fix:** three direct-call probes, all under `read_only: true` so the
  transaction was READ ONLY regardless of the answer. The wrappers refuse with
  `0A000`; the helper refuses with `42501`.
- **Result:** leg (a) is measured on this project instead of quoted, and F1 has a
  behavioural proof on top of its ACL proof.
- **Files:** `baseline/38-BASELINE-realtime.post-38.json`
- **Commit:** `cd1c3d6`

**3. [Rule 3 — The probe named a column that does not exist] `event_parties` has `date` + `time`, not `start_time`**

- **Found during:** Task 2, pre-flight
- **Issue:** the night-in-progress check was first written against
  `start_time`/`end_time` and was refused with `42703`. That refusal is the
  database being right: `public.event_parties` carries a `date` column and
  separate `time` / `end_time` columns of type `time without time zone`.
- **Fix:** the window is expressed on `date` in `Europe/Rome`, from yesterday
  through tomorrow — wide on purpose, because a night that runs 22:00 → 06:00 has
  `end_time < time` and belongs to two calendar days.
- **Result:** zero nights in the window. The apply ran outside a night.
- **Commit:** `298aa88`

### Recorded, not acted on

**A line in `STATE.md` has gone stale.** The migration history now carries
version `20260811001927 venues_read_narrowed`, applied on 2026-08-11 at 00:19.
`STATE.md:178` still records that migration as deliberately left applied to zero
by the owner's choice. Somebody applied it after that line was written. This plan
does not own `STATE.md` and did not edit it; the orchestrator or the owner should
decide what the line should say.

## Cross-domain impact

- **`ticketing-payments.md`** — two of the four triggers now sit on the money
  tables in production. `realtime.send` was re-read after the apply and still
  wraps its insert in `EXCEPTION WHEN OTHERS THEN RAISE WARNING`, so it cannot
  raise and cannot abort a purchase, a check-in or a refund. Zero new ways to
  fail were added, and that is re-asserted rather than carried over from 38-02.
- **`meta-gates.md`, the three monotone guards** — untouched, and now verifiable
  rather than argued: `venue_reveal_acts` and `venues` hold the same counts
  before and after; no payment state was read or written; `party_series` is
  unchanged at 6, so no progressivo moved.
- **`meta-gates.md`, zero silent failures** — the honest half is stated above:
  because `realtime.send` cannot raise, a refused emit is invisible outside the
  Postgres log, and this repository has no error tracking. The observability
  lives at the door — the 5-minute parachute and the staleness band — because it
  cannot live in the database.
- **`access-gating.md`** — the boundary is now a policy in production, and it
  asks the question phase 32 defined. The rendered `qual` was checked for a
  second predicate resolving "assigned to this night": there is none.
- **`supabase-data.md`, gate RLS contestuale** — `realtime.messages` held zero
  policies before (38-01) and holds exactly one now, so nothing is being OR'd
  onto an existing permissive policy. Confirmed after the apply, not before.
- **`supabase-data.md`, gate tipi allineati** — no table, column or type changed,
  so `src/types/database.ts` is unaffected. No product file was touched by this
  plan.
- **`checkin-offline.md`** — the offline drain POSTs to the check-in route, so it
  reaches `door_scan_events` and its new trigger for free. Nothing in
  `src/lib/offline/` was touched.

## Verification

`npm run build` proves nothing here and was not run: no product code was touched,
a migration is not type-checked by anything in this repository, and no Supabase
client in it is parameterised with `Database`. **This plan claims no B
evidence.** The evidence is entirely **S** — read-only probes against the real
database — plus the **G** publication checks.

| Check | Result |
|---|---|
| Task 2's automated gate | `applied as version 20260811111530; 27 tables identical before and after` |
| Task 3's automated gate | `boundary measured: 1 SELECT policy, 0 write policies, 4 triggers, helper private and unreachable` |
| Both gates re-run against the **finished** file | pass |
| **(G)** endpoint used | `/database/migrations` for the apply; `/database/query` appears only with `read_only: true` |
| **(G)** the phase's secret grep on the JSON (project host, JWT prefix, token prefix) | `0` — and the composer refuses to write the file at all if the ref, a JWT or the token reaches the output. The pattern itself is not quoted here on purpose: a check whose own description matches it is a check that cries wolf every time it is re-run |
| **(G)** files modified outside the phase baseline directory | none |

## Security and publication

- **One write to production**, and it is the authorised one. Every other request
  in this plan was `read_only: true` or a `GET`.
- The project ref, the access token and the anon key were derived and read inside
  the process from `.env.local` in the main checkout (gitignored, absent from the
  worktree, read by absolute path). None was printed, none reached a file, none
  reached a commit message.
- The artifact names **roles** — `postgres`, `authenticated`, `anon`,
  `service_role`, `supabase_realtime_admin`, `supabase_read_only_user` — and
  never people. No venue, no night's date, no line-up. The night-in-progress
  check emitted counts only.
- Probe scripts live in the session scratchpad. Nothing was added to `scripts/`.

## Threat Flags

None. This plan added no network endpoint, no auth path and no file access
pattern of its own. The schema change it applied at a trust boundary is exactly
the one already registered as T-38-02-01 … T-38-02-07 and re-registered here as
T-38-04-01 … T-38-04-06, and each of those dispositions was carried out: the
migrations endpoint (01), the row snapshot (02), `proacl` read and the call
refused (03), the predicate read as rendered (04), the secret grep (05), the
outside-a-night pre-flight (06).

## Known Stubs

None. Every object this plan measured exists in production; nothing was recorded
as present that is not.

What is **open** rather than stubbed, and is stated above rather than hidden:
LIVE-06 waits on P7 and LIVE-01 waits on P1/P2, because the Management API
bypasses RLS and a trigger in a catalogue is not a message on a wire.

## For the next plans

- **38-05 / 38-03:** the channel now has something sending to it. Topic is
  `door:<party uuid>` **lowercase**, channel config must be
  `{ config: { private: true } }`, event name `attendance_changed`, payload
  `{"id": "<uuid>"}` with no field to read.
- **38-07:** P1 … P7 are now runnable. **P7 is what closes LIVE-06** — nothing
  here does. Check `realtime_config.suspend` again on the day of the first night;
  it was `false` at 2026-08-11T11:16Z, and a `true` at 22:00 makes the whole
  phase a no-op with no error anywhere.
- **The owner:** two things are yours to decide, and neither is inside the
  authorisation this plan spent — the eighteen-entry migration-history drift, and
  the stale `STATE.md:178` line about `venues_read_narrowed`.

## Self-Check: PASSED

- `FOUND: .planning/phases/38-live-attendance-freshness/baseline/38-BASELINE-realtime.post-38.json`
- `FOUND: 298aa88` · `FOUND: cd1c3d6`
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — **not touched** (plan 38-05 owns it)
- `STATE.md` and `ROADMAP.md` — **not touched**; the orchestrator owns those writes
- Only `.planning/phases/38-live-attendance-freshness/` was modified
