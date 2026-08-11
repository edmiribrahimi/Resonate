---
phase: 38-live-attendance-freshness
plan: 07
subsystem: evidence collection — the phase's only proof
tags: [verification, door-procedures, LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06, LIVE-07, pending]
requires:
  - "38-01's written P1 … P7, with empty Results"
  - "38-04's applied migration, version 20260811111530, and its post-38 after-figure"
  - "38-03 / 38-05 / 38-06's before-figures for every structural check re-run here"
provides:
  - "the B / G / S evidence set, run in one sitting on 2026-08-11 and pasted with its output"
  - "each of P1 … P7 marked pending WITH the reason it is pending"
  - "the open list the verifier inherits: A1, A5, A6, the P4 divergence, and seven unrun procedures"
affects:
  - "38-VERIFICATION.md — which cannot mark LIVE-01 … LIVE-06 covered on the strength of anything in this file"
  - "the owner — P6 needs a fresh authorisation that has not been given"
tech-stack:
  added: []
  patterns:
    - "a structural check asserted to be able to fail, before its result is read"
    - "both figures recorded when a plan's own check is broken, never the convenient one substituted"
    - "pending written with its reason, so it cannot be misread as verified-by-inspection"
key-files:
  created:
    - .planning/phases/38-live-attendance-freshness/38-07-SUMMARY.md
  modified:
    - .planning/phases/38-live-attendance-freshness/38-PROCEDURES.md
decisions:
  - "P6 was NOT attempted and no snapshot was taken for it — the only production authorisation this phase held was spent by plan 38-04 and is recorded as exhausted"
  - "The plan's own <automated> block fails on the naive LIVE-07 grep; both figures are recorded and no code was bent to it — the same correction plans 38-03, 38-05 and 38-06 each made"
  - "The P4 divergence between VALIDATION and PLAN/RESEARCH is left open: neither version has been run, so choosing between them would be an editorial decision dressed as a finding"
metrics:
  duration: ~20 min
  tasks: 1 of 3 (tasks 2 and 3 are blocking checkpoints)
  files: 1
  completed: 2026-08-11
---

# Phase 38 Plan 07: The Mechanical Set Is Green, And It Reaches No Requirement — Summary

Everything a machine can check in this phase has been checked and pasted below:
the build, nine **G** structural checks and eight **S** read-only probes, each
against its before-figure. **None of it closes a requirement.**

Five of the phase's seven requirements end at a phone, a pocket or a queue, one
ends at a session this repository cannot mint, and one — **P6** — writes to
production and has no authorisation. So **P1 … P7 are all still `pending`**, and
each now carries in `38-PROCEDURES.md` the reason it is, because the difference
between *not verified* and *verified by inspection* is the whole reason
`38-VALIDATION.md` keeps `nyquist_compliant: false`.

---

## B — the build

Command, and it is `next build --webpack`. **Not Turbopack**: the Serwist plugin
is a webpack plugin, and switching would stop building the service worker — the
door's offline half — which this project has been caught by once already.

```bash
$ npm run build
> resonate@0.1.0 build
> next build --webpack

▲ Next.js 16.1.6 (webpack)
✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'...
✓ Compiled successfully in 6.5s
  Running TypeScript ...
✓ Generating static pages using 9 workers (39/39) in 169.0ms
```

```bash
$ npm run build > /dev/null 2>&1; echo "BUILD_EXIT=$?"
BUILD_EXIT=0
```

**What it proves:** the file compiles and the whole project typechecks — there
is no separate `typecheck` script, the build is the type gate.

**What it does not prove, and it is most of what this phase is about.** No
Supabase client in this repository is parameterised with `Database`, so **not a
single column name in any query is checked by the build**. It says nothing about
a policy, nothing about a channel, nothing about a topic matching on both sides.
**This repository has no test runner for the product** — no `test` script, no
`*.test.*`, no `*.spec.*` — so nothing here may be called "verified" on the
strength of a green build.

**Two environmental notes, neither of them about this change.** The build warns
that it inferred the workspace root because a second lockfile is visible above
the worktree; that is a property of running inside `…/.claude/worktrees/…`. And
the worktree carried no `node_modules`, so it was **symlinked** to the main
checkout's after proving both manifests byte-identical (`cmp -s` on
`package.json` and on `package-lock.json`: identical, both). **No package was
installed, added, removed or upgraded.** The symlink is git-ignored and appears
in no commit.

---

## G — the structural set, nine checks

`$f` is `src/app/(admin)/admin/scanner/ScannerClient.tsx` throughout — 3 449
lines. macOS/BSD, so `grep -E`.

### G1 — the five LIVE-02 extractions, with their before-figures

```bash
awk '/(const|async function|function) <fn>/,/^  \};?$/' "$f" \
  | grep -nE 'channel|Channel|realtime|Realtime|channelLive'
```

| # | Function | Body 38-03 | Body 38-05 | Body 38-06 | **Body now** | Output | Control |
|---|---|---|---|---|---|---|---|
| 1 | `handleVerify` | 55 | 55 | 55 | **55** | *(nothing)* | **7** |
| 2 | `ticketOffline` | 98 | 98 | 98 | **98** | *(nothing)* | **6** |
| 3 | `membershipOffline` | 54 | 54 | 54 | **54** | *(nothing)* | **2** |
| 4 | `ticketOnline` | 130 | 130 | 130 | **130** | *(nothing)* | **4** |
| 5 | `membershipOnline` | 87 | 87 | 87 | **87** | *(nothing)* | **2** |

The five bodies are **byte-for-byte the same size across all four measurements**
of this phase. Nothing entered a verdict path and nothing was displaced from one.

**Assertion that the check can fail, taken before its result was read.** An empty
grep over an empty extraction is a false green, and this project has a recorded
precedent for exactly that failure mode (`ai-engineering.md`, gate *prova per
mutazione*). Two controls, both run in the same pass as the extraction:

- **the extraction landed** — every `awk` range returned a non-empty body, sizes
  in the table;
- **the pipeline fires** — the same bodies grepped for a token that *is* present
  (`selectedPartyId|partyId`) return **7 / 6 / 2 / 4 / 2**, matching plan 38-06's
  control column exactly.

So the five empty results are a real green and not a broken pipe.

### G2 — the deferral guard inside `requestReload`

```bash
$ awk '/const requestReload = useCallback/,/\[fetchAttendance/' "$f"
    extracted lines: 36
$ … | grep -n 'isProcessingRef.current'
12:      if (isProcessingRef.current) {
$ … | grep -cE 'fetch\('
0
```

The lock is the **first** branch of the body, and there is no `fetch(` in it —
the reload goes through `fetchAttendance`, the site the scanner already had.

### G3 — its drain inside `dismissFlash`

```bash
$ awk '/const dismissFlash = useCallback/,/^  \}, \[/' "$f"
    extracted lines: 18
3:    isProcessingRef.current = false;
9:    if (pendingReloadRef.current) {
10:      pendingReloadRef.current = false;
14:    const scanner = scannerInstanceRef.current as { resume: () => void } | null;
16:      try { scanner.resume(); } catch { /* ignore if already running */ }
```

Order intact: the lock is released, **then** the deferred reload is drained,
**then** the camera resumes.

### G4 — `visibilityState` gates the safety timer

```bash
$ grep -n 'visibilityState' "$f"
1437:      if (document.visibilityState !== "visible") {
$ grep -cE 'window\.addEventListener\("visibilitychange"' "$f"
0
$ grep -cE 'document\.addEventListener\("visibilitychange"' "$f"
1
```

Zero on `window` is the point, not an accident: the event did not bubble to
`window` before Safari 14. **One** listener on `document` in the whole file —
plan 38-05's deviation 3 refused to add a second one on the same event.

### G5 — LIVE-07, both forms

```bash
$ grep -rl "offline/checkin-store" src --include='*.ts' --include='*.tsx'
src/app/api/tickets/checkin/route.ts
src/app/(admin)/admin/scanner/ScannerClient.tsx
    count: 2
$ grep -rln 'from "@/lib/offline/checkin-store"' src --include='*.ts' --include='*.tsx'
src/app/(admin)/admin/scanner/ScannerClient.tsx
    count: 1
```

**Both figures, not the convenient one.** The naive form counted **2 before this
phase began** — the route hit is prose, two docblock citations at `:34` and
`:220`, not an import. On the import form there is **one importer**, so
**LIVE-07 holds**: the door's offline mechanism is still the door's, and nothing
was extracted into a shared module. See the Deviation below, because this is the
figure the plan's own `<automated>` block gets wrong.

### G6 — no new file under `src/lib/`

```bash
$ git status --porcelain src/lib | grep -cE '^\?\?'
0
```

### G7 — `src/lib/supabase/client.ts` unmodified

```bash
$ git diff --quiet HEAD -- src/lib/supabase/client.ts; echo $?
0
```

### G8 — LIVE-06's structural row, on the migration

```bash
$ m='supabase/migrations/20260811120000_live_attendance_channel.sql'   # 620 lines
$ grep -nE "has_capability\('door\.operate'" "$m"
27:--    realtime.messages, resolved by `private.has_capability('door.operate', …)`
580:        (SELECT private.has_capability('door.operate',
    count: 2
$ grep -cE 'is_assigned|assigned_to_party|can_operate' "$m"
0
$ grep -cE '^CREATE POLICY' "$m"
1
$ grep -c 'realtime.messages' "$m"      # control: the pipeline fires
14
```

The predicate is the one phase 32 already defined, and **no second definition of
"assigned to this night" was introduced** — which is the failure phase 32 exists
to prevent. One policy in the file.

### G9 — how long `client.ts` has been untouched

```bash
$ git log --oneline -1 -- src/lib/supabase/client.ts
dd2a2c2 Initial scaffolding: Next.js + Supabase + Tailwind + PWA
```

Stronger than the diff: the shared browser-client factory has not been touched
since the project was scaffolded. **D-38-14** — `worker: true` not adopted — is
not merely respected by this phase, it is respected by every phase.

---

## S — the read-only probes, eight of them, each against its `pre-38` counterpart

Every call went to `POST /v1/projects/{ref}/database/query` with
**`read_only: true`**, so each whole transaction was READ ONLY and no write could
have landed whatever the answer was. **Zero data rows were written, updated or
deleted by this plan.** Probed at **2026-08-11T11:49:42Z**.

### S0 — who is asking, so an empty answer is readable

```json
"probe_role": [{ "current_user": "supabase_read_only_user",
                 "session_user":  "supabase_read_only_user" }]
```

Recorded first on purpose. Plan 38-01 was caught by an empty result that meant
*"you may not see them"* and not *"there are none"*; naming the role is what
makes every zero below readable.

### S1 — exactly one policy in schema `realtime`, and it is a `SELECT`

```sql
select policyname, cmd, roles::text, permissive, qual
  from pg_policies where schemaname = 'realtime'
```

| | `pre-38` (2026-08-11T10:46Z) | **now** (11:49Z) |
|---|---|---|
| policies in schema `realtime` | **`[]`** | **1** |
| name | — | `realtime_messages_select_door_assigned` |
| `cmd` | — | **`SELECT`** |
| `roles` | — | `{authenticated}` |
| `permissive` | — | `PERMISSIVE` |

The rendered `qual`, read from the catalogue and not from the file that asked
for it:

```
CASE
    WHEN (extension <> 'broadcast'::text) THEN false
    WHEN (( SELECT realtime.topic() AS topic) ~ '^door:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text)
      THEN ( SELECT private.has_capability('door.operate'::text,
             (SUBSTRING(( SELECT realtime.topic() AS topic) FROM 6))::uuid) AS has_capability)
    ELSE false
END
```

It names `has_capability` and the literal `door.operate`, as the plan's criterion
requires. Three properties survived the round trip, and each is why it is read
here rather than in a diff: the topic regex is still evaluated **in a `CASE` arm
before** the `::uuid` cast (the other order raises `22P02` on a malformed topic,
and an error inside a policy is a *refused connection*, not a `false` — a door
turned away because somebody typed a topic wrong); the regex is still
case-sensitive `[0-9a-f]`, so a case mismatch is refused **loudly** at join time
and shows the band instead of joining cleanly and delivering nothing; and there
is exactly one predicate.

### S2 — no policy with any other `cmd`

```sql
select policyname, cmd from pg_policies
 where schemaname = 'realtime' and cmd <> 'SELECT'
```

| | `pre-38` | **now** |
|---|---|---|
| write policies | `[]` | **`[]`** |

**Zero is the answer that matters.** `realtime.messages` has
`relrowsecurity = true` and `anon` and `authenticated` each already hold
table-level `arw` on it (38-01's `messages_acl_expanded`). So the **absence** of
any `INSERT` policy is the only thing standing between a signed-in member and the
ability to broadcast *"the list changed"* on a door's topic. The database is the
only sender. The gap is the design.

### S3 — the four triggers, stated as the difference from the before-set

```sql
select tgname, tgrelid::regclass::text as tbl from pg_trigger
 where not tgisinternal
   and tgrelid::regclass::text in ('door_scan_events','tickets','guest_list_entries','ticket_refunds')
```

| | `pre-38` | **now** |
|---|---|---|
| non-internal triggers on the four tables | **`[]`** (0) | **4** |

| Table | Trigger |
|---|---|
| `door_scan_events` | `door_scan_events_notify_attendance` |
| `guest_list_entries` | `guest_list_entries_notify_attendance` |
| `ticket_refunds` | `ticket_refunds_notify_attendance` |
| `tickets` | `tickets_notify_attendance` |

**+4, one per table, on four and not three.** Stated as a difference because
"four triggers exist" is only evidence if the before-figure was zero — and it
was, captured while no migration of this phase existed on disk.

### S4 — `proacl` on `private.notify_attendance_changed` grants `EXECUTE` to no client role

```sql
select n.nspname, p.proname, p.prosecdef, p.proacl::text, p.proconfig::text
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'private' and p.proname = 'notify_attendance_changed'
```

| Field | `pre-38` | **now** |
|---|---|---|
| exists | **did not exist** | yes, in `private` |
| `prosecdef` | — | **`true`** |
| `proacl` | — | **`{postgres=X/postgres}`** |
| `proconfig` | — | `{"search_path=\"\""}` |

`proacl` is **non-null**, which is the half that matters: a null `proacl` would
mean the default `EXECUTE` to `PUBLIC` still applied and the `REVOKE` had not
taken — a failure, not a missing datum. It grants `EXECUTE` to the owner and to
nobody else: no bare `=X/` entry, no `anon`, no `authenticated`. **F1 closed.**

### S5 — the same claim observed as a refusal rather than read from a string

```sql
select private.notify_attendance_changed(null, null)   -- read_only: true
```

```
400 — ERROR:  42501: permission denied for function notify_attendance_changed
```

Identical to plan 38-04's reading, re-observed today from a role that is **not**
the owner. A refusal observed is worth more than an ACL read and inferred.

### S6 — `realtime.send` still cannot raise

```sql
select position('EXCEPTION' in pg_get_functiondef(p.oid)) > 0     as has_exception_block,
       position('RAISE WARNING' in pg_get_functiondef(p.oid)) > 0 as has_raise_warning
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'realtime' and p.proname = 'send'
```

| | `pre-38` | **now** |
|---|---|---|
| `has_exception_block` | wraps `EXCEPTION WHEN OTHERS` | **`true`** |
| `has_raise_warning` | `RAISE WARNING` | **`true`** |

This is what makes the two triggers on the **money tables** safe: the emit cannot
raise, so it cannot abort a purchase, a check-in or a refund
(`ticketing-payments.md`). And it is also the honest half — because it cannot
raise, **a refused emit is invisible outside the Postgres log, and this
repository has no error tracking**. The observability lives at the door: the
5-minute parachute and the staleness band. It cannot live in the database.

### S7 — the fifth probe the plan added: Realtime is not suspended

```
GET /v1/projects/{ref}/config/realtime  →  200
read at 2026-08-11T11:49:45Z
```

| Key | `pre-38` (10:46Z) | 38-04 (11:16Z) | **now (11:49Z)** |
|---|---|---|---|
| `suspend` | `false` | `false` | **`false`** |

Also returned, and worth having on the record beside the phase's own design
choices: `max_joins_per_second: 100` (which is why plan 38-05 refused to add a
second backoff of its own — two competing retry loops are a join storm),
`max_concurrent_users: 200`, `max_events_per_second: 100`,
`max_channels_per_client: 100`, `presence_enabled: false`.

**The time on that reading is not decoration.** `suspend: true` at 22:00 makes
this entire phase a no-op **with no error anywhere** — no exception, no band, no
log — while the 5-minute parachute keeps every screen looking correct. This
reading was taken hours before any door opens. **It does not transfer to a later
night and must be re-read on the day.**

### The sentence that keeps the S class honest

**Every probe above ran through the Management API as
`supabase_read_only_user`, which bypasses RLS. Not one of them shows that a real
member session is refused.**

The policy exists, it is a `SELECT` policy, its rendered predicate asks the door
question, and no write policy exists. All four are statements about **the
catalogue**, not about an authenticated browser. **LIVE-06 is not closed by this
task and is not closed by anything before P7.**

The same limit applies one step further out, and it is the more dangerous one:
four triggers in `pg_trigger` are **not a message on a wire**. Whether the client
sends `{ config: { private: true } }` with a topic whose case matches what
Postgres renders is settled by **P5** and by nothing else. If the two sides
disagree the channel joins, reports `SUBSCRIBED`, no error is raised anywhere,
the band never appears because the channel genuinely *is* live — and the list
still only ever changes every five minutes.

---

## D — the seven procedures, and the LIVE-05 check

**All eight are `pending`. Pending means not verified.** Each carries its reason
in `38-PROCEDURES.md`; the short form:

| Check | Requirement | State | Why |
|---|---|---|---|
| **P5** | LIVE-01, **Pitfall 2** | **pending** | two devices, two accounts holding `door.operate` on one night, and a valid code to check in |
| the LIVE-05 tap check | LIVE-05 | **pending** | a question about a thumb, in the dark, at minimum brightness |
| **P1** | LIVE-02, LIVE-04, LIVE-05 | **pending** | a browser with the socket blocked, a scan, and five minutes of watching a band |
| **P2** | LIVE-02, **LIVE-03**, LIVE-05 | **pending** | a real network cut and restored; the load-bearing half is *"nobody touched the screen"* |
| **P4** | LIVE-02, Pitfall 6 | **pending** | a latency comparison at a device |
| **P3** | LIVE-03, assumption **A1** | **pending** | the staff phone locked in a pocket ≥ 65 min, past the token's 3600 s |
| **P6** | LIVE-01, **Pitfall 1**, D-38-24 | **pending — refused** | it writes to production and there is **no authorisation** |
| **P7** | **LIVE-06**, Pitfall 5 | **pending** | a real approved `member` session, which cannot be minted here |

### P6 was not attempted, and that is a decision rather than a limitation

The only production authorisation this phase has ever held was granted on
**2026-08-11** for plan 38-04, scoped to *one DDL transaction, zero row writes*,
**spent at 11:15:24 UTC** and recorded in `38-04-SUMMARY.md` as **exhausted** —
explicitly not extending to writing, updating or deleting any data row. Creating
a guest-list entry is outside it. An authorisation given against a description
stops covering anything the moment the description stops matching.

**No snapshot was taken either.** The snapshot is the first of P6's four rules,
and taking it would have been the first step of a procedure that has no
permission to run. **P6 needs a fresh, separate authorisation.**

The context for why the four rules exist at all is `STATE.md`'s D12: on
2026-08-10 a verification script deleted the two production events and, by
cascade, **63 rows across seven tables**. The events came back from a snapshot;
the 63 rows did not, and this project has no PITR.

### The two failures nothing else in this phase can see

Both are invisible to every check pasted above, and both look like success:

- **Pitfall 2** (only **P5** sees it) — `private: true` or the topic's case
  failing to match on both sides. The channel joins, reports healthy, delivers
  nothing, and the 5-minute parachute keeps every screen correct. The phase looks
  finished; LIVE-01 is not delivered.
- **Pitfall 1** (only **P6** sees it) — a changed row carrying no party emitting
  to `door:NULL` and reaching nobody. **LIVE-01 degrades into LIVE-04 with no
  error anywhere.** And its sibling, **D-38-24**: the origin door of a
  reassignment refreshing at five minutes instead of live — which looks like
  success precisely because both doors do end up correct.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — a plan check that is red before the work starts] The plan's `<automated>` block asserts one importer of `checkin-store` on the naive grep, which has counted 2 since before the phase began**

- **Found during:** Task 1 verification.
- **Issue:** the plan's block runs
  `n=$(grep -rl "offline/checkin-store" src … | wc -l); test "$n" -eq 1`. It
  returns **2**, because `src/app/api/tickets/checkin/route.ts` cites the store
  twice **in docblocks** (`:34`, `:220`) and imports nothing from it. Run
  verbatim the block exits 1 on `checkin-store has 2 importers` — a gate that was
  red before this plan wrote a line, and therefore says nothing about this plan.
- **Fix:** **no code was bent to a grep.** Both figures are recorded above: the
  naive form **2** (unchanged since before the phase), the import form
  `grep -rln 'from "@/lib/offline/checkin-store"' src` → **1**. This is the same
  correction plans 38-03 (deviation 4), 38-05 and 38-06 each recorded on the same
  grep; the plan's check was written from the naive form and inherited the error.
- **Evidence, both runs:**
  ```
  $ bash plan-automated.sh              # the block verbatim
  checkin-store has 2 importers
  EXIT=1

  $ bash plan-automated-corrected.sh    # one line changed, to the import form
  B and G classes clean
  EXIT=0
  ```
- **Files modified:** none.
- **Commit:** n/a (verification only).

### Recorded, not acted on

**The P4 divergence stays open.** `38-VALIDATION.md` § *Manual-Only
Verifications* describes P4 as the never-established/airplane-mode door with a
run of queued scans; `38-RESEARCH.md` and `38-01-PLAN.md` describe it as
*degraded, not dropped* (Slow 3G). Plan 38-01 wrote it the second way and stated
the consequence — **the fully-offline door is not covered by P1 … P7 as
written**. This plan did not close it, and the reason is not deference: **neither
version has been performed**, so choosing between them now would be an editorial
decision dressed as a finding. It goes to the verifier with the pendings.

**One publication-grep match, and it is a placeholder.** The phase's secret grep
over `38-PROCEDURES.md` returns **1**:

```
93:project's Realtime WebSocket endpoint (`wss://<project-ref>.supabase.co/realtime/*`;
```

`<project-ref>` is literally that — a placeholder written by plan 38-01, on a
line that goes on to say *"the concrete ref stays in `.env.local` and is not
written here"*. No ref, no key and no URL to the project is in the file. Recorded
rather than silently excluded from the pattern, because a check whose exceptions
are invisible stops being a check.

---

## What is still open

| Item | State | Settled by |
|---|---|---|
| **LIVE-01** | open | P5 (the two-device headline) and P6 (the null-party fan-out) |
| **LIVE-02** | structurally sound, behaviourally open | P1, P2, P4 |
| **LIVE-03** | open | P2 (c) and P3 (a) |
| **LIVE-04** | open | P1 (c) |
| **LIVE-05** | open | the one-handed tap check, P1 (c), P2 (b) |
| **LIVE-06** | **open** — every probe here bypasses RLS | **P7, and nothing before it** |
| **LIVE-07** | **held** — one importer, zero new files under `src/lib`, `client.ts` untouched since scaffolding | G5, G6, G7, G9 |
| assumption **A1** | open — an iOS home-screen PWA's composed wake signal | P3 |
| assumption **A5** | **accepted, not closed** — a mid-night revocation does not disconnect an already-joined listener, because Realtime caches a connection's access policies for its lifetime. What *is* refused immediately is that account's read of `/api/tickets/attendance`, and the reload is what carries the data. Residual exposure: *"hears that something changed on a night whose id they already knew"*, never *"sees who"* | recorded, deliberately not engineered around |
| assumption **A6** | open, in the dangerous direction — the band staying hidden while the channel is down | P1 (c), P2 (b) |
| the **P4** divergence | open | the verifier |
| **P6's authorisation** | **not granted** | the owner |

`38-VALIDATION.md`'s `nyquist_compliant: false` stays false, and the reason stays
with it.

---

## Cross-domain impact

- **`checkin-offline.md`, gate *provato prima della porta*.** The gate is **not**
  satisfied by this plan and this file does not claim it is: the path is proved
  that day, on that device, with that account, and none of the three happened
  here. Every mechanical check above is a desk check.
- **`ticketing-payments.md`.** Two of the four triggers sit on the money tables
  in production. `realtime.send` was re-read today (S6) and still wraps its
  insert in `EXCEPTION WHEN OTHERS THEN RAISE WARNING`, so it cannot raise and
  cannot abort a purchase, a check-in or a refund. Re-asserted, not carried over.
- **`meta-gates.md`, the three monotone guards.** None is touched: this plan made
  **zero writes of any kind** to production. No venue reveal, no payment state,
  no series progressivo was read or written.
- **`meta-gates.md`, zero silent failures.** Stated rather than implied: a
  refused emit is invisible outside the Postgres log, and there is **no error
  tracking** in this project. That is why the only observability this phase has
  is the band and the counter row on the door's screen — and why the procedures
  that check them are the phase's evidence rather than a supplement to it.
- **`access-gating.md`.** The boundary is a policy in production asking phase 32's
  own question, and the rendered `qual` was re-checked for a second predicate
  resolving "assigned to this night": there is none (G8: **0**).
- **`supabase-data.md`.** No migration, no schema change, no type change. Every
  database call carried `read_only: true`.

---

## Threat Flags

None. This plan added no network endpoint, no auth path, no file access pattern
and no schema change.

The register's dispositions:

| Threat | Disposition | How |
|---|---|---|
| T-38-07-01 | **mitigate — by not proceeding** | P6 was not attempted; no row was created, so none had to be removed, and no snapshot was needed because nothing was touched. Zero writes to production |
| T-38-07-02 | mitigate | every Result reads `pending` **with its reason**; the two S readings that are preconditions carry their wall-clock time; nothing was written from inference |
| T-38-07-03 | mitigate | roles only — *"an account holding `door.operate` for that night"*. No venue, no date of a night, no line-up, no person. Secret grep on `38-PROCEDURES.md`: one match, the `<project-ref>` placeholder, shown above |
| T-38-07-04 | accept | assumption A5 recorded above as open, exactly as `38-VALIDATION.md` has it |
| T-38-07-05 | mitigate | `nyquist_compliant: false` untouched; seven procedures plus the LIVE-05 check carried forward as `pending` with reasons, into a file the verifier reads |
| T-38-07-SC | mitigate | **no package was installed, added, removed or upgraded.** `node_modules` was symlinked after proving both manifests byte-identical |

---

## Known Stubs

**The seven `Result` lines in `38-PROCEDURES.md` are still `pending`, and that is
the correct state of this artifact after this run** — not an omission. What
changed is that each now says *why*, so a later reader cannot mistake an unrun
procedure for one that passed quietly.

**The phase must not be marked complete on the strength of this file.** Five of
its seven requirements have no automated proof here at all.

---

## Publication check

`.planning/` is tracked and this repository is public. This file and
`38-PROCEDURES.md` name **roles** — *"an account holding `door.operate` for that
night"*, *"the operator"*, *"the person holding the phone"* — and never people.
No venue, no date of a night, no line-up, no project ref, no key. The one
`supabase.co` string in `38-PROCEDURES.md` is the `<project-ref>` placeholder
described above.

The project ref, the access token and the anon key were read inside the probe
process from `.env.local` in the main checkout (gitignored, absent from the
worktree, read by absolute path). None was printed, none reached a file, none
reached a commit message — and the probe composer refuses to write its output at
all if the ref or anything matching the secret pattern reaches it.

---

## Checkpoint state

**Task 1 is complete and committed.** Tasks 2 and 3 are `checkpoint:human-verify`
with `gate="blocking"`, and execution stops at Task 2. Both need a person with
devices, a night, a real session — and, for P6, a fresh production authorisation
the owner has not given.

| Task | Name | State | Commit |
|---|---|---|---|
| 1 | Run every mechanical check the phase has, and paste it | **done** | `6ce8543` |
| 2 | The device session — P1, P2, P4, P5 and the LIVE-05 check | **checkpoint, blocking** | — |
| 3 | The pocket, the null-party fan-out, and the person who is not assigned | **checkpoint, blocking** | — |

---

## Self-Check: PASSED

| Claim | Command | Result |
|---|---|---|
| `38-PROCEDURES.md` exists and was modified | `git status --short` before staging | one path ✓ |
| `38-07-SUMMARY.md` exists | written and committed by this plan | ✓ |
| commit `6ce8543` exists | `git rev-parse --short HEAD` after the commit | present ✓ |
| the commit deleted nothing | `git diff --diff-filter=D --name-only HEAD~1 HEAD` | empty ✓ |
| build green | `npm run build > /dev/null 2>&1; echo $?` | `0` ✓ |
| **zero production writes** | every `/database/query` carried `read_only: true`; the only non-query call was a `GET` on the Realtime config | ✓ |
| `STATE.md` / `ROADMAP.md` untouched | not staged, not committed | ✓ — the orchestrator owns those writes |
| no procedure Result left bare | `grep -cE '^\*\*Result\*\* — \*pending\*$'` | `0` ✓ |
| all seven Results present | `grep -n '^\*\*Result\*\*'` | 7 lines ✓ |
