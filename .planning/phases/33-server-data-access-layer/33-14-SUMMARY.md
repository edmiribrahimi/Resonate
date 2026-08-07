---
phase: 33-server-data-access-layer
plan: 14
subsystem: access-gating
tags: [middleware, capabilities, cap-05, wr-04, phase-gate, verification]
requires:
  - "33-01 … 33-13 (all twelve conversion plans, merged into this plan's base)"
  - "public.my_access_context() with user_id (33-01)"
  - "scripts/verify-no-header-identity.mjs (33-02)"
  - "33-12's positive-controlled forged-identity probe"
provides:
  - "a middleware that manufactures no identity and still deletes every inbound one"
  - "assertion B: a mechanical, comment-filtered guard that the strip stays ARMED as live code"
  - "WR-04 closed: ?access=unavailable plus a dashboard notice that does not claim a refusal"
  - "33-VERIFICATION.md — the phase verdict, MEASURED vs OWED, 38 file:line citations"
  - "21 consolidated owed UAT items in phase 32's shape"
affects:
  - "phase 34 (STAFF-03): role/status leave the my_access_context() payload there, not here"
  - "phase 37: the venue-secrecy RLS narrowing"
  - "phase 43: attribution columns, which do not exist at schema level"
tech-stack:
  added: []
  patterns:
    - "a guard that measures the source file and asserts about the source file — same artefact on both sides"
    - "a line-based comment filter rather than a parser, because the repo's parser is defeatable (WR-07)"
key-files:
  created:
    - ".planning/phases/33-server-data-access-layer/33-VERIFICATION.md"
    - ".planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-*.33-final.json (5)"
  modified:
    - "src/lib/supabase/middleware.ts"
    - "src/app/(members)/dashboard/page.tsx"
    - "scripts/verify-no-header-identity.mjs"
    - "src/lib/capabilities/guards.ts"
    - "src/lib/capabilities/server.ts"
    - "src/types/database.ts"
decisions:
  - "The five comment-shaped survivors COUNT toward the verdict. They were removed by rewording; the meter was NOT taught to filter comments."
  - "The strip is KEPT permanently and its comment re-argued: it no longer protects a reader, it prevents one being born."
  - "The forged-identity probe was NOT re-run. Its positive control can no longer fire — no reader survives — and a green indistinguishable from a dead instrument is not reported as a pass."
  - "role/status locals removed from the middleware with their last consumer; the payload fields stay for phase 34."
metrics:
  duration: "~1 session"
  completed: "2026-08-07"
  tasks: "3 of 4 (task 4 is the human checkpoint, consolidated as owed)"
  commits: 3
---

# Phase 33 Plan 14: The Closure Summary

**The injection is deleted, the strip is kept and re-argued, WR-04 is closed, and
the phase's verdict is written — with the mechanical half measured and the
observable half owed and enumerated.**

The full evidence is
`.planning/phases/33-server-data-access-layer/33-VERIFICATION.md`. This summary
records what this plan did and what it decided; the verification records what
the phase proved.

---

## The order, and why task 1 was a gate and not a formality

Deleting the injection before the readers are gone makes every
`headers().get()` return `null`, so `role = null`, so
`if (role !== "master") redirect("/dashboard")`, so **every master is locked out
of every `/admin` surface**. It fails closed, so it is an availability break and
not a security one — but it is total, and `npm run build` cannot see it.

**The census ran before any edit, and it passed on the number that matters.**

| measurement | value |
|---|---|
| `npm run verify:no-header-identity` at plan start | **5 lines / 3 files, exit 1** |
| of those, **code-level readers** | **0** |
| of those, comment-shaped | 5 |
| independent case-insensitive cross-check, comment-filtered | **0** |
| pre-phase baseline (33-02) | 98 lines |

The cross-check was run with `-i` deliberately. HTTP header names are
case-insensitive and so is `headers().get()`, so a case-sensitive cross-check
would agree with the instrument for the wrong reason — and this repo has the
recorded incident of that class (D-32-C: `grep -c 'CREATE POLICY'` returns 0 on
a lowercase file, `grep -ci` returns 37, and that 0 is written in `CLAUDE.md` as
a fact).

---

## What changed

### 1. The injection is gone

The `if (user) { requestHeaders.set(…) ×3 }` block that stood at
`src/lib/supabase/middleware.ts:219-223` is deleted. With it went the middleware's
`role` and `status` locals, which had exactly one consumer.

`role` and `status` **stay in the `my_access_context()` payload** — `MobileNav`
and `StaffNav` are `"use client"` components that take them as props and cannot
import the DAL, so a parent Server Component resolves and passes down. Removing
the payload fields is STAFF-03 in phase 34; doing it here would turn a transport
swap into a nav redesign. That reasoning is now written where the fields are, at
`src/lib/supabase/middleware.ts:75-86`.

### 2. The strip is KEPT, at `src/lib/supabase/middleware.ts:238-240`

Three uncommented `requestHeaders.delete(…)` lines, with the comment above them
rewritten (`:216-237`). The old comment justified the deletion by naming the
reader it protected — the SumUp refund path, which gated on the header and then
used a service-role client that bypasses every RLS policy. Plan 33-03 removed
that reader, so the comment had outlived its argument.

**The new argument, which is the one worth keeping.** The counter-case — *a
header nobody reads is a trap for the next person* — applies to the
**injection**, which manufactured a value that looked authoritative. It does not
apply to the **deletion**, which manufactures nothing and costs three lines. What
the strip now prevents is a *future* reader: the next person who writes
`headers().get("x-user-role")`, from muscle memory or by copying a pattern out of
this file's own git history, would otherwise get attacker input with no
protection at all. Three lines against a silent elevation of privilege.

Deleting the strip "because nothing reads them any more" is the exact mistake
this phase exists to make impossible.

### 3. WR-04 closed — the degraded bounce is visible

`bounceToDashboard()` now sets `?access=unavailable`
(`src/lib/supabase/middleware.ts:137-139`) when — and only when — the capability
lookup itself failed. `/dashboard` renders a distinct notice
(`src/app/(members)/dashboard/page.tsx:219-233`, flag at `:30`).

The wording is the point: *"We couldn't check your permissions just now … a
temporary problem on our side, not a decision about your account."* It does
**not** claim a permission refusal, because that is the opposite claim. The
project has no error tracking, so a header nothing reads and a log nobody
watches are the same thing; `meta-gates.md` requires an **observable effect**.

**No `try`/`catch` was added.** The boolean already existed in the middleware;
carrying it in the URL is transport, not error handling. The response header is
kept as well — it is the only signal on the non-redirect path.

### 4. A mechanical guard that the census structurally cannot provide

The census **exempts** the middleware, so by construction it says nothing about
the three lines that do the work. **Assertion B**
(`scripts/verify-no-header-identity.mjs:212-257`) closes that gap: the strip must
read exactly **3 live deletes and 0 live sets**, with comment lines filtered
before counting.

It is a line filter, not a parser — deliberately. `scripts/verify-capabilities.mjs`
is the cautionary case (WR-07: a string literal containing an apostrophe defeats
its parser, and one exists at `src/app/(auth)/register/page.tsx:13`).

**The assertion and the measurement name the same artefact.** `inspectStrip()`
reads the source file, and the property under test *is* the source file's
content. This is the gap 33-12 found — where both assertions read the source
while the artefact under test was a running server left stale by `EADDRINUSE` —
and it does not exist here because nothing in assertion B concerns runtime.

**Proved by mutation, each mutation asserted as applied before its result was
read:**

| mutation | naive unfiltered `grep -c` | assertion B |
|---|---|---|
| M1 — the three deletes commented out | **3 — a GREEN from a disarmed guard** | 0 deletes → **exit 1** |
| M2 — one `set` reintroduced | n/a | 3 deletes / **1 set** → **exit 1** |
| restored | 3 | ✓ exit 0 |

**M1 is the mutation that matters.** It reproduces the exact residue of a botched
restore after `scripts/probe-forged-identity.sh` runs its positive control — that
script comments out precisely these three lines. The naive grep the plan warned
about reports 3 for a tree whose guard is switched off.

### 5. The five comment survivors — the decision, stated

The meter counts comments by design (its decision 3). The five survivors named
the header strings while describing what replaced them.

**Decision: they count, and they were removed by rewording. The instrument was
not weakened.** The alternative — teaching the census to filter comments — was
the wrong direction. After this phase the property worth holding is the strong
one, *no file except the middleware names these strings at all*, because the most
likely way a future reader reintroduces a trusted header is by copying the
literal out of a comment explaining why it used to be trusted. No claim in any of
the five changed; only the string did.

The script's own header prose was corrected too: it said the exempt file is *"the
only file permitted to SET them"*. Nothing may set them any more, and a guard
whose own prose authorises the thing the phase removed is an invitation.

---

## Results

```
npm run verify:no-header-identity   exit 0   (first time in the phase — A and B both green)
npm run verify:capabilities         exit 0   4/4 green, 0 warnings
rm -rf .next && npm run build       exit 0
grep -rni 'x-user-' src/ | grep -v middleware.ts | wc -l          →  0
grep -rniE 'role !== ?"(master|organizer)"' src/ | comment-filter →  0   (was 50)
grep -rl '46 files' src/ | wc -l                                  →  0
```

```
CAP-03: clean — production, B1+B2, 33-pre → 33-final
CAP-03: clean — container,  B1+B2+B3, 33-pre → 33-final
```

**Reported verbatim, including the unflattering figures**, because they are the
instruments' own words: production B2 is **78.2% vacuous** (172/220 cells agreed
with a count of zero on a globally empty table, and only 4 of 11 personas resolve
on that target); container B3 **proves nothing on 19/660 cells**. Nothing is
unexplained on either target. Advisor lints were not compared (`--only=B1,B2[,B3]`);
nothing was pinned and `--allow-lint-move` was not passed.

**Hard constraints, all holding:**

| constraint | measured |
|---|---|
| `door.operate` still `requires_approved = false` | `…capability_model.sql:416-417` |
| `organizer/pending` INSERT `ticket_tiers` | `ok:1` |
| `organizer/pending` INSERT `venues` | `42501` |
| `profiles` UPDATE, all 11 personas (D-32-A) | `42P17` — observably still out of bounds |

---

## What is NOT claimed

### The forged-identity probe was not re-run, and that is the correct end state

After this plan **no surface reads the header at all**. A probe run now returns
0/0 in every state — armed, mutated, restored — because there is no reader left
to fool. That green would be **indistinguishable from a dead instrument**.
Reporting it as a pass is the shape this phase spent fourteen plans cataloguing,
so it is not run and not reported.

Criterion 2's evidence is 33-12's four-row table — specifically **row C** (strip
removed, pre-conversion page: forged 1 / anon 0, **+10 046 B**, exit **1**, the
positive control FIRING on the real application) and **row B** (strip removed,
converted page: 0/0, identical bytes, exit 0, the criterion itself) — plus this
plan's census. The green rows alone prove nothing.

### The money-path row of criterion 2 stays OWED

`/admin/finance` is gated non-forgeably by the middleware on `admin.access`,
granted to `master` alone, so the forged-header steps answer the same before and
after the conversion. Not criterion-2 evidence, and not silently upgraded.

### One of the plan's own assertions failed, and is reported rather than reconciled

`grep -rn 'function verifyOrganizer\|function verifyEventOwnership' src/` returns
**1**, not the expected 0:
`src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:79`. It is a
**prefix false positive** — `verifyOrganizer` matching `verifyOrganizerAccess`,
whose body is three lines delegating to `assertStaffManage()` and
`assertEventOwnership()`. The duplicated predicate is gone; a wrapper *name*
survives. This is itself shape 4 — a grep matching something shaped like the
thing — and quietly reconciling it to zero would have been the sixth instance of
the failure class this phase exists to name.

---

## Deviations from Plan

### 1. [Rule 3 — blocking] `role` / `status` removed from the middleware entirely

Deleting the injection left both locals assigned and never read. The plan's edit
(a) covers only the injection block, but leaving write-only locals risks the
typecheck and misleads the next reader. Removed, with the reason written in place.
Commit `42eebba`.

### 2. [Rule 2 — missing critical information] The five comment survivors reworded

Not in the plan, which assumed the meter would already read 0. Required to make
task 1's `done` criterion (`exit 0`) reachable without weakening the instrument.
Decision and reasoning recorded above and in `33-VERIFICATION.md` §2.2.

### 3. [Rule 2] Assertion B added to the guard script

The plan asked for the strip's live-code counts as shell assertions in the plan
body. Shell assertions in a plan do not survive the plan. Folding them into
`npm run verify:no-header-identity` makes the property re-checkable by anyone,
forever, and proved by mutation. Commit `42eebba`.

### 4. [Rule 2] The guard script's own prose corrected

It described the exempt file as *"the only file permitted to SET them"*. After
this plan nothing may set them.

### 5. Container capture flag, as 33-01 already recorded

`scripts/rls-baseline-container.mjs` does not accept `--only`
(`FATAL: unknown flag`). It captures B1+B2+B3 by default; the default run was
used. The instrument was **not** edited.

### 6. `.env.local` copied in, used, and deleted

This worktree has no environment of its own (`.env*` is gitignored, so worktrees
do not inherit it), and `verify:capabilities` and the baselines need one. The
main checkout's file was copied in, used, and **deleted before any commit**. It
was gitignored in the worktree throughout (`git check-ignore` confirmed), and the
new baseline artefacts were scanned for `service_role`, `jwt_secret`, `sbp_`,
JWT prefixes, `password` and `secret` before staging — **no match**. Nothing was
persisted.

### 7. `33-CARRY-FORWARD.md` not written by this plan

Task 3 step 7 asks for it. `fabc08f` in this plan's base already carries
*"carry-forward for phases 33-35, and the medium granularity lever"*, so a second
document would fork the source. The items this plan would have added —
`role`/`status` leaving the payload in phase 34, the venue-secrecy narrowing in
phase 37, the attribution columns in phase 43, and the rule *name the mechanism
that would make a check fail before writing the check* — are recorded in
`33-VERIFICATION.md` §8 and §6 instead, where the evidence sits beside them.
**Flagged for the orchestrator** rather than decided silently.

---

## Known Stubs

**None.** No TODO, FIXME, stub or mock was introduced. No dependency was added.

---

## Threat Flags

**None new.** One finding from a sibling belongs on the record and is carried in
`33-VERIFICATION.md` §5.1: `fetchGuestList` had **no gate at all** — a public
Server Action taking a caller-chosen `eventId` to a service client and returning
every guest's name and email. Closed by 33-09. It was **not** in the phase's
threat register, and it is a real behaviour change in the narrowing direction.

A **pre-existing** venue-secrecy finding exists, was verified, and is **not**
caused or widened by this phase. Its details are documented **outside this
repository** — the repo is public and a commit is an irreversible publication.
Owner's decision: page filter first, RLS narrowing in phase 37.

---

## Task 4 — the human checkpoint

Not executed. The owner deferred manual verification to the end of the build
(decision 12). Task 4's eleven-persona sweep, session check, degraded path, door
scan and forged-header requests are consolidated with every owed item from the
other twelve summaries into **21 UAT items, `result: [pending]`**, in
`33-VERIFICATION.md` §7 — in phase 32's shape, role / URL / steps / expected /
result.

The two that lead: **U-01, the door** — a `pending` organizer opens
`/admin/scanner` and admits a ticket; *if that fails, a status check has crept in
and the phase stops*. **U-03 / U-04, the money** — a master still reaches
`/admin/finance`, an organizer is still refused.

**Deferred is not verified.** `32-VERIFICATION.md` set that precedent and this
document keeps it.

---

## Self-Check: PASSED

- `src/lib/supabase/middleware.ts` — FOUND, 3 live deletes / 0 live sets
- `src/app/(members)/dashboard/page.tsx` — FOUND, banner at `:219`
- `scripts/verify-no-header-identity.mjs` — FOUND, exit 0, assertion B mutation-proved
- `.planning/phases/33-server-data-access-layer/33-VERIFICATION.md` — FOUND, 38 `file:line` citations
- 5 × `32-BASELINE-*.33-final.json` — FOUND
- Commits `42eebba`, `5b45e0c` — present in `git log`
- `npm run build` — exit 0 from a cleared `.next`
- STATE.md and ROADMAP.md — **not modified**, as instructed
