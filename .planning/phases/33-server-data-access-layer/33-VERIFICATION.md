# Phase 33 — Server Data Access Layer: VERIFICATION

**Date:** 2026-08-07
**Requirement:** CAP-05
**Plans:** 33-01 … 33-14 (fourteen plans, three waves)
**Verdict:** criteria 1, 2 and 3 **MEASURED**. Criterion 4 **PARTLY MEASURED,
PARTLY OWED** — `CAP-03: clean` on both targets is measured; the eleven-persona
sweep is owed and has not been run.

> **There is no test runner for this product.** `package.json` has no `test`
> script and the repo contains no `*.test.*` or `*.spec.*` file. Nothing below
> is verified because "the tests pass". What is written here is the only
> evidence that exists, and it is separated throughout into **MEASURED** (a
> command was run and its output is quoted) and **ARGUED** (a claim derived
> from a measurement, not itself measured).

---

## 1. What the phase changed, in one line

Forty-four files derived a user's identity from `x-user-role` / `x-user-status` /
`x-user-id` — request headers manufactured by `src/lib/supabase/middleware.ts`.
Phase 33 replaced that transport with `public.my_access_context()`, reached
through `src/lib/capabilities/server.ts`, deleted the injection, and **kept** the
inbound strip.

---

## 2. CAP-05, requirement by requirement

`.planning/REQUIREMENTS.md` states CAP-05 as: *no server surface derives identity
or authorisation from a request header.*

### 2.1 The census — MEASURED

The instrument is `scripts/verify-no-header-identity.mjs`. It matches the literal
substring `x-user-`, **case-insensitively**, over 232 files under `src/`, exempts
exactly one path compared for equality (`EXEMPT_PATH` at
`scripts/verify-no-header-identity.mjs:121`), and **counts comments rather than
filtering them** (its decision 3).

| point | total lines naming the header outside the middleware | of which code | of which comment-shaped |
|---|---|---|---|
| pre-phase (33-02 baseline) | 98 | 97 | 1 (`src/types/database.ts:389`) |
| at plan 33-14's start | 5 | **0** | 5 |
| final | **0** | **0** | **0** |

```
$ npm run verify:no-header-identity
  ✓ A. no file outside src/lib/supabase/middleware.ts names an identity header.
  ✓ B. the strip is ARMED: exactly 3 live deletes, no live set.
EXIT=0
```

**Exit 0 for the first time in the phase.** The script's own header prints
`It is EXPECTED to exit 1 until plan 33-14 lands` — that expectation is now
discharged.

**The `-i` is load-bearing, not cosmetic.** HTTP header names are
case-insensitive and `headers().get()` is too, so `headers().get("X-User-Role")`
reads the same value a lower-case grep cannot see. The independent cross-check
was therefore run case-insensitively, so that it is not weaker than the
instrument it audits:

```
$ grep -rni 'x-user-' src/ | grep -v 'src/lib/supabase/middleware.ts' | wc -l
0
```

This repository has the recorded incident of exactly that class:
`grep -c 'CREATE POLICY' supabase/schema.sql` returns 0 while `grep -ci` returns
37, and that zero was written into `CLAUDE.md` as a fact (D-32-C).

### 2.2 The two numbers are not the same number — stated, not glossed

The safety-relevant figure and the assertion-relevant figure diverged at plan
33-14's start, and conflating them would have been the dishonest move:

- **0 code-level readers.** This is the number that made deleting the injection
  safe. It was measured **before any edit in 33-14**, with a comment filter
  applied to the census output:
  `grep -rni 'x-user-' src/ | grep -v '…/middleware.ts' | grep -vE ':[0-9]+: *(\*|//|/\*)' | wc -l` → `0`.
- **5 total naming lines.** Five explanatory comments in
  `src/lib/capabilities/guards.ts`, `src/lib/capabilities/server.ts` (×2) and
  `src/types/database.ts` (×2) spelled the header names while describing what
  replaced them.

**Decision, taken deliberately: the five comment-shaped survivors DO count
toward the verdict, and they were removed by rewording — the instrument was not
weakened.** The alternative was to teach the census to filter comments. That
would have been the wrong direction: after this phase the property worth holding
is the strong one — *no file except the middleware names these strings at all* —
because the most likely way a future reader reintroduces a trusted header is by
copying the literal out of a comment that explains why it used to be trusted. The
comments were rewritten to say "the injected identity header" instead. No claim
in them changed; only the string did.

### 2.3 The injection is gone, the strip is kept — MEASURED

- **Deleted:** the `if (user) { requestHeaders.set(…) ×3 }` block that stood at
  `src/lib/supabase/middleware.ts:219-223` before this plan. Commit `42eebba`.
- **Kept, as live code:** `src/lib/supabase/middleware.ts:238-240` —
  `requestHeaders.delete("x-user-role")`, `…("x-user-status")`, `…("x-user-id")`.
- **Comment rewritten:** `src/lib/supabase/middleware.ts:216-237`. The old
  comment justified the deletion by naming the reader it protected (the SumUp
  refund path). That reader was removed by plan 33-03, so the comment had
  outlived its argument. The new one states the reason that survives the phase.

```
$ grep -v '^[[:space:]]*//' src/lib/supabase/middleware.ts | grep -c 'requestHeaders.set("x-user-'
0
$ grep -v '^[[:space:]]*//' src/lib/supabase/middleware.ts | grep -c 'requestHeaders.delete("x-user-'
3
```

**Why the strip stays, since nothing reads the headers any more.** The
counter-argument — *a header nobody reads is a trap for the next person* —
applies to the **injection**, which manufactured a value that looked
authoritative. It does not apply to the **deletion**, which manufactures nothing
and costs three lines. The failure it prevents is silent and security-relevant:
the next person who writes `headers().get("x-user-role")`, from muscle memory or
by copying a pattern out of this file's own git history, would otherwise receive
attacker input with **no** protection at all. Three lines against a silent
elevation of privilege is the asymmetric-cost choice.

### 2.4 The mechanical guard, and its mutation proof — MEASURED

The census (assertion A) **exempts** the middleware, so by construction it can
say nothing about the three lines that do the work. That gap is now closed by
**assertion B**, added to the same script at
`scripts/verify-no-header-identity.mjs:212-257`
(`stripCounts()` / `inspectStrip()` / `EXPECTED_DELETES = 3`).

It is a **grep-shaped line filter, not a parser**, deliberately. The repo's
parser-based verifier is unsound: WR-07 records that a string literal containing
an apostrophe defeats `scripts/verify-capabilities.mjs`, and one exists at
`src/app/(auth)/register/page.tsx:13`.

**Same artefact on both sides.** `inspectStrip()` reads
`${ROOT}/src/lib/supabase/middleware.ts` from disk, and the property under test
*is* that file's content. There is no assertion/measurement gap of the kind
33-12 found, where both assertions read the source file while the artefact under
test was a running server left stale by `EADDRINUSE`. This check measures a
source file and asserts about a source file. Where a claim in this document
concerns runtime, it is marked as such and is not carried by this check.

| mutation | applied, asserted before reading | naive `grep -c` (unfiltered) | assertion B |
|---|---|---|---|
| **M1** — the three `delete` lines commented out | `git diff --stat` non-empty: `53 insertions(+), 31 deletions(-)` | **3 — a GREEN from a disarmed guard** | `strip: 0 live delete(s), 0 live set(s)` → **exit 1** |
| **M2** — one `requestHeaders.set("x-user-id", user.id)` reintroduced | live-count greps read `3` deletes / `1` set | n/a | `strip: 3 live delete(s), 1 live set(s)` → **exit 1** |
| **restored** | `git status --porcelain` clean at commit | 3 | `✓ B … exactly 3 live deletes, no live set` → exit 0 |

**M1 is the mutation that matters.** It reproduces the exact residue of a botched
restore after `scripts/probe-forged-identity.sh` runs its positive control — that
script comments out precisely these three lines and restores them afterwards. The
naive unfiltered `grep -c 'requestHeaders.delete("x-user-'` reports **3** for that
tree: a green, on the one line that protects every future reader, for a guard that
is switched off. Assertion B reports 0 and exits 1.

---

## 3. The four phase success criteria

### Criterion 1 — nothing under `src/` reads an identity header — **MEASURED**

Evidence: §2.1 and §2.4. The claim is **structural, not a sample**: a surface
that cannot read the header cannot be fooled by it, and the property is
re-checkable on every run of `npm run verify:no-header-identity`.

### Criterion 2 — a forged identity header is answered exactly as an anonymous request

**MEASURED by 33-12; the positive control can no longer be re-established here,
and that is stated rather than reported as a pass.**

33-12's four-row table, quoted verbatim from `33-12-SUMMARY.md:99-106`. Every row
had the running server's identity asserted (`.next/BUILD_ID` present in the
served HTML) **before its result was read**:

| # | middleware strip | menu page | `Add Item` forged / anon | bytes | exit |
|---|---|---|---|---|---|
| A | **armed** | converted | 0 / 0 | 28 363 / 28 363 | 0 |
| B | **REMOVED** | converted | 0 / 0 | 28 363 / 28 363 | 0 |
| C | **REMOVED** | **pre-conversion** | **1 / 0** | 38 406 / 28 360 | **1** |
| D | **armed** (restored) | converted | 0 / 0 | 28 363 / 28 363 | 0 |

**The two rows that carry the argument are C and B, and neither is a green.**

- **Row C is the positive control and it FIRED** — exit 1, `Add Item` forged 1 /
  anon 0, **+10 046 B**. The management affordance was served to an anonymous
  request that supplied its own master role header. This is the row proving the
  probe fires on the real application rather than on a fixture.
- **Row B is criterion 2 itself** — with the strip **REMOVED**, the converted
  page answered a forged master identity exactly as an anonymous one: 0 / 0,
  identical byte counts, exit 0. That is the criterion stated as a property of
  the page, independent of the middleware.
- Rows A and D alone prove nothing.

**The positive control cannot be re-run at the phase gate, and this is the
correct end state rather than a failure.** After 33-14 **no surface reads the
header at all** (§2.1). A probe run now would return 0 / 0 in all three states —
armed, mutated and restored — because there is no reader left to fool. That
green would be **indistinguishable from a dead instrument**, and reporting it as
a pass is precisely the shape this phase catalogued (a check that cannot fail).
It is therefore **not run and not reported**. Criterion 2's evidence is 33-12's
rows C and B, plus this plan's census.

**The money-path row of criterion 2 is recorded OWED, not green.**
`/admin/finance` is gated non-forgeably by
`src/lib/supabase/middleware.ts:187-190` on `admin.access`, granted to `master`
alone (`supabase/migrations/20260807000000_capability_model.sql:408`). Plan
33-03's forged-header steps therefore return the same answer before and after
the conversion, and are **not** criterion-2 evidence. What carries the money path
is 33-12's positive-controlled probe plus the census. It is not silently
upgraded: `32-VERIFICATION.md` set the precedent that a deliberate
`nyquist_compliant: false` beats an unearned `true`.

### Criterion 3 — the duplicated role predicates are gone — **MEASURED, with one honest exception**

```
$ grep -rniE 'role !== ?"(master|organizer)"' src/ | grep -vE ':[0-9]+: *(\*|//|/\*)' | wc -l
0
$ grep -rniE 'role !== ?"(master|organizer)"' src/ | wc -l      # unfiltered, for contrast
6
```

Measured **50** (comment-filtered; 52 unfiltered) across 44 files before the
phase. Now **0**.

The pattern is deliberately case-insensitive, **variable-agnostic** and
comment-filtered, and each property was chosen against a recorded failure:

- Not `grep -rnF 'profile.role !== '`. That literal scores **0** on
  `src/app/api/membership/verify/route.ts:104`, whose line reads
  `(userProfile.role !== "master" && userProfile.role !== "organizer")` —
  lower-case `profile` does not occur inside `userProfile`. Dead code could sit
  beside its replacement on the route deciding whether a membership card is
  honoured, and the check would report a clean zero.
- The comment filter matters in the other direction: the six unfiltered hits are
  all prose, including `src/app/(admin)/admin/newsletter/actions.ts:20` and `:29`,
  which *document* the removed predicate. An unfiltered count would fail on a
  correct repository — which teaches the next reader to wave the check through.

**The exception, reported rather than passed.** The plan's third criterion-3
assertion was `grep -rn 'function verifyOrganizer\|function verifyEventOwnership' src/` →
expect 0. It returns **1**:

```
src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:79: async function verifyOrganizerAccess(eventId: string): Promise<string>
```

This is a **false positive of the plan's own grep** — a prefix match on
`verifyOrganizer` catching `verifyOrganizerAccess`, whose body
(`…/guest-list/actions.ts:79-90`) is three lines delegating to the shared guards
`assertStaffManage()` and `assertEventOwnership()`. The duplicated predicate is
gone; a wrapper *name* survives. This is itself shape 4 — a grep matching
something shaped like the thing rather than the thing — and it is recorded here
rather than being quietly reconciled to zero.

`grep -rn 'created_by !== ' src/` returns 5 lines, **all of them comments**
(`src/lib/capabilities/guards.ts:18,20,42,44` and
`src/app/(organizer)/organizer/events/actions.ts:938`), documenting the removed
pattern and the null-identity trap. No live ownership comparison survives outside
`assertEventOwnership`.

### Criterion 4 — every role reaches exactly what it reached before

**PARTLY MEASURED (CAP-03), PARTLY OWED (the sweep).**

#### 4a. CAP-03 — MEASURED, clean on both targets

```
$ npm run baseline:compare -- --target=production --only=B1,B2 --before-point=33-pre --after-point=33-final
  ✓ B1 — 67 policies, every difference explained by the whitelist
      67 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained
  ✓ B2 — 220 cells compared, 4/11 personas resolved on this target
      B2 vacuous fraction: 172/220 (78.2%)
CAP-03: clean — B1, B2 compared, nothing moved that the whitelist does not explain.
```

```
$ npm run baseline:compare -- --target=container --only=B1,B2,B3 --before-point=33-pre --after-point=33-final
  ✓ B1 — 67 policies, every difference explained by the whitelist
      67 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained
  ✓ B2 — 220 cells compared, 11/11 personas resolved, vacuous fraction 0/220 (0.0%)
  ✓ B3 — 660 cells compared
      B3 proves nothing on 19/660 cells (2.9%) … 641 of 660 cells carry real evidence.
CAP-03: clean — B1, B2, B3 compared, nothing moved that the whitelist does not explain.
```

**Reported verbatim, including what is unflattering.** Both verdicts print
`clean` and **nothing is unexplained on either target**. Two figures qualify how
much that is worth, and they are the instruments' own words, not a gloss:

- **Production B2 is 78.2% vacuous** — 172 of 220 cells agreed with a count of
  zero on a globally empty table. That agreement has nothing to do with a policy.
  Only ~48 production cells carry evidence, and only 4 of 11 personas resolve
  there at all (production holds no `organizer` row).
- **Container B3 proves nothing on 19/660 cells** — a probe ran but a
  constraint, not a policy, answered.

The **container** carries the persona truth; production carries the real data.
Neither alone is the verdict, and the phase used both.

**Advisor lints were not compared.** Both comparisons ran `--only=B1,B2[,B3]`, so
no advisor delta is asserted here. Nothing was pinned and
`--allow-lint-move` was not passed. `unused_index` was not pinned and must never
be — it counts indexes not scanned since the last statistics reset, so it moves
with use, not with schema (`33-VALIDATION.md`, *Advisor lints*).
`multiple_permissive_policies` (46) and `unindexed_foreign_keys` (35) are
structural.

#### 4b. The hard constraints — MEASURED

Read from `32-BASELINE-writes.container.33-final.json`, the capture taken **after**
all fourteen plans:

| constraint | measured | conclusive |
|---|---|---|
| `door.operate` still `requires_approved = false` | `supabase/migrations/20260807000000_capability_model.sql:416-417` — `('master','door.operate',false)`, `('organizer','door.operate',false)` | source |
| `organizer/pending` INSERT `ticket_tiers` | `ok:1` | **true** |
| `organizer/pending` INSERT `venues` | `42501` | **true** |
| `profiles` UPDATE, all 11 personas (D-32-A, out of bounds) | `42P17` on every one | `conclusive_for_rls: false` |

The `organizer`/`pending` asymmetry survives the phase intact, and it is the
asymmetry with the highest cost if lost: a pending organizer refused on
`ticket_tiers` would mean `catalogue.manage` leaked outside the two tables it
belongs to, which `32-CARRY-FORWARD.md` §3 names as this model's worst-case
defect.

**D-32-A is observably still out of bounds.** All eleven `profiles` UPDATE cells
still report `42P17` — the recursion in `profiles_update_own` — exactly as
before. "Out of bounds" had to be observably so, and it is.

#### 4c. `npm run build` — MEASURED

```
$ rm -rf .next && npm run build
ƒ Proxy (Middleware)
BUILDEXIT=0
```

Run from a cleared `.next`, because a stale cache after a worktree merge gives a
false failure (P-6). This is the typecheck gate: there is no separate
`typecheck` script; `next build` is it.

#### 4d. `npm run verify:capabilities` — MEASURED, **with what it does not say**

```
$ npm run verify:capabilities
  measured against: production (Management API, read_only)
      TS 8 · DB 8 · POLICY 4 (45 call sites in 67 policies) · SRC 6 (233 files walked)
  ✓ 0 · both declarations hold the pre-registered 8 keys
  ✓ 1 · TS and DB name the same keys
  ✓ 2 · every key a policy asks for exists in the catalogue
  ✓ 3 · every key application code asks for exists in the catalogue
  ✓ 4 · every catalogue key is asked for by a policy or by src/
4/4 green, 0 warnings.
```

**A command named `verify` will otherwise be cited as if it said more than it
does.** It reads the **catalogue** (`private.capabilities`) and never the
**grants** (`private.role_capabilities`), so a green here is **not** a statement
about who can do what (D-32-L). The script prints this itself. It is also the
script whose parser WR-07 shows to be defeatable by an apostrophe in a string
literal, which is why the CAP-05 guard added in §2.4 does not use it.

---

## 4. IN-01 and WR-04 — both closed

### IN-01 — closed by construction

`32-REVIEW.md` IN-01 records that when the RPC failed, `role` / `status` fell
back to `member` / `pending` and were injected **as fact** into headers that 44
files read — those files received an assertion, not an unknown. After this phase
the fallback lives in one place (`getAccessContext()`'s throw in
`src/lib/capabilities/server.ts`) and **there is no transport to inject it into**:
the middleware no longer keeps `role` / `status` as values at all
(`src/lib/supabase/middleware.ts:75-86`, and the destructure at `:105-107` no
longer names them). IN-01 closes here.

### WR-04 — closed, with `file:line`

Before: `capabilitiesResolveFailed` set `x-capabilities-resolve-failed` on the
response, and the file's own comment admitted *"It is never read"*
(`src/lib/supabase/middleware.ts:17`). This project has **no error tracking** —
`package.json` has no monitoring dependency — so a header nothing reads and a log
nobody watches are the same thing: the user saw an ordinary bounce to
`/dashboard` and could not tell an infrastructure fault from a permissions
refusal.

- **The search param is set at `src/lib/supabase/middleware.ts:137-139`** —
  `url.searchParams.set("access", "unavailable")`, inside
  `bounceToDashboard()`, guarded by `capabilitiesResolveFailed` alone.
- **The banner renders at `src/app/(members)/dashboard/page.tsx:219-233`**, from
  the flag computed at `:30-31`.
- The response header is kept as well (`:141-143`) — it costs nothing and is the
  only signal available on the non-redirect path at `:253-255`.

**The wording does not claim a refusal.** It reads *"We couldn't check your
permissions just now … This is a temporary problem on our side, not a decision
about your account. Nothing has changed about what you have access to."* That
distinction is the whole point: collapsing a network fault, a missing grant and a
genuine refusal into one message is the recorded newsletter defect
(`.planning/codebase/CONCERNS.md`, *"Qualcosa è andato storto"*), and
`meta-gates.md` requires an **observable effect**, not a log line.

**No `try`/`catch` was added to produce it.** The signal already existed as a
boolean in the middleware; carrying it in the URL is transport, not error
handling.

---

## 5. Findings inherited from the wave, each with evidence

These belong in the phase's verdict because they were discovered by it, whether
or not it fixed them.

### 5.1 `fetchGuestList` had NO gate at all — CLOSED by 33-09

A **public POST endpoint** (a Server Action is one, with a comfortable
signature) took a caller-chosen `eventId` straight to a **service client** — which
bypasses every RLS policy — and returned every guest's **name and email**. Any
authenticated caller, including a plain `member`, could read any event's guest
list.

- Closed by 33-09: `src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:79-90`
  (`verifyOrganizerAccess` → `assertStaffManage` + `assertEventOwnership`), now
  the **first statement** of `addGuest`, `removeGuest` and `fetchGuestList`.
- **This is a real behaviour change, in the narrowing direction**, and it was
  **not** in the phase's threat register. A phase whose contract was "change the
  transport, move no permission" found and closed a genuine data exposure. That
  is a deviation worth naming, not burying: criterion 4 says no role's reach
  moved, and this one did — a member's reach **narrowed**, correctly.

### 5.2 `getDrinkItems` stays ungated — DELIBERATE, recorded

The same shape, the opposite decision. `anon` must be able to read `drink_items`
or every guest is refused at the bar. Recorded so a future reader does not "fix"
it by symmetry with 5.1.

### 5.3 The door's error message is decided by HTTP status — NAMED, not fixed

`src/components/scanner/ScannerClient.tsx:81-87` builds the headline from the
HTTP status code, so an **authorisation** refusal reads *"The scan was not
written to the record"* while the true reason sits at
`src/app/api/tickets/checkin/route.ts:946-965`. A staff member at the door, at
two in the morning, is told a write failed when in fact they were refused.

This is a **zero-silent-failures** defect (`meta-gates.md`) on the surface where
it costs most: the asymmetry at the door is that refusing a valid guest is worse
than admitting a duplicate, because the first error happens in front of a queue.
**Named gap. Not fixed in this phase** — it is a UI change to the door, and
folding one into a transport swap is exactly the coupling this phase refused
elsewhere.

### 5.4 Attribution does not exist at schema level

```
$ grep -rniE "approved_by|rejected_by|promoted_by|updated_by" supabase/
(no output)
```

Decision 5 of `.planning/ACCESS-MODEL-DECISIONS.md` — *who approved, who
rejected, who promoted, recorded with when* — is a **stated requirement, not an
implemented one**. It is phase 43's work. `community-membership.md` (gate *chi
decide è tracciato*) and `checkin-offline.md` both depend on it. Recording it
here so nobody reads decision 5 as a description of the database.

### 5.5 `?redirect=` vs `?next=` — pre-existing, unfixed

`src/lib/supabase/middleware.ts:163` sets `url.searchParams.set("redirect", pathname)`.
`src/app/(auth)/login/page.tsx:11` reads `next`. **They never meet**: a user
bounced to login does not return where they were. Pre-existing, not introduced or
widened by this phase, and not fixed here — it is a UX repair to the auth path
and belongs in its own change.

### 5.6 `isApproved` / `isMasterRole` on the event page are on a reveal path

They feed `isVenueVisible`. **They are not presentational.** Phase 34 must not
"tidy" them into the nav-affordance family without a venue-secrecy impact
analysis: `venue_reveal_sent` is a one-way switch, and code that can advance a
reveal is Critical code.

### 5.7 A venue-secrecy finding exists — pre-existing, NOT caused by this phase

A venue-secrecy finding was identified and **verified** during this phase. It is
**pre-existing** and this phase neither introduced nor widened it. Its details
are **documented outside this repository**, deliberately: this repo is public and
a commit is an irreversible publication, so writing the path here would publish
it (`CLAUDE.md` Guardrail 5; `ai-engineering.md`, gate *la pianificazione è
pubblica*).

**Owner's decision, recorded:** page-level filter first, RLS narrowing in phase
37.

### 5.8 `MASTER_EMAIL` still promotes and never demotes

`src/app/api/auth/callback/route.ts:27`. A one-way privilege switch. Not this
phase's: folding a Critical repair into a mechanical phase is the coupling this
phase exists to avoid.

### 5.9 `middleware.ts` → `proxy.ts` deprecation is real and visible

`ƒ Proxy (Middleware)` in the build output. **Deliberately not done here**: it
renames the file this phase edits, on a path that carries every request including
the door.

### 5.10 Two surfaces this phase did not fully fix

- `src/app/(public)/events/[slug]/menu/page.tsx` still branches a service-client
  read on a TypeScript boolean. `canManage` is now **session-derived** — the part
  this phase was asked to fix — but it remains a legitimate concentration of
  trust in code, on the one page with neither a middleware prefix gate nor an RLS
  backstop.
- The guest-list **ownership read** still uses the service client where its two
  siblings use the cookie client
  (`src/app/(organizer)/organizer/events/[id]/guest-list/actions.ts:88`). Carried
  forward with 33-09's evidence: the container matrix would allow the swap, but
  the production matrix leaves `organizer/*` `resolved: false` because no such
  account exists there, so the swap cannot be shown safe on both targets. Not
  decided here.

---

## 6. Anti-patterns found in the phase's own instruments

The phase found **five** shapes of a check that is green for the wrong reason.
They are recorded because the next phase's checks must not be a sixth.

1. **A probe that cannot fail** — an RLS-refused UPDATE raises nothing and
   matches no row, so the probe reported success for the refusals too.
2. **A count right by coincidence** — a census read 46 before and 46 after
   because it counted comments as readers.
3. **A criterion no database could satisfy** — the advisor stops emitting a lint
   rather than reporting 0, so `expect = 0` was unsatisfiable.
4. **A grep blind to what it checks** — `profile.role !== ` scores 0 on a file
   whose variable is `userProfile`; `grep -c 'CREATE POLICY' supabase/schema.sql`
   returns 0 because that file is lowercase, and **that zero is still written in
   `CLAUDE.md` as a fact** (D-32-C).
5. **The assertion and the measurement naming different artefacts** — 33-12
   asserted its mutation twice, including in comment-filtered form, but both
   assertions read the **source file** while the artefact under test was the
   **running server**, which `EADDRINUSE` had left as the *previous* build. Its
   fix: read `.next/BUILD_ID` and require it in the served HTML.

Two operational corollaries, both measured in this phase:

- **`grep -c` exits 1 on a count of zero**, so a correct state fails a naive gate.
- **`grep -c 'requestHeaders.delete("x-user-'` returns 3 even when all three
  lines are commented out** — proved as mutation M1 in §2.4.

**The rule this phase pays for, stated as a rule and not an anecdote: name the
mechanism that would make a check fail *before* writing the check.** Three
incidents have now bought it — D-32-I, the case-insensitive `/events` probe, and
the `/admin/finance` checkpoint corrected in 33-03.

Beyond these: **no TODO, FIXME, stub or mock was introduced by this phase.** No
dependency was added by any of the fourteen plans; `33-RESEARCH.md`'s only
candidate (`server-only`, `[OK]`) was not adopted.

---

## 7. Owed manual verification — consolidated, in phase 32's UAT shape

**The owner deferred manual verification to the end of the build (decision 12 of
`.planning/ACCESS-MODEL-DECISIONS.md`).** None of the items below has been run.
None was substituted for, inferred, or upgraded. `32-VERIFICATION.md` set the
precedent: **deferred is not verified.**

Environment for every item:
`rm -rf .next && npm run build && PORT=3007 npm run start`
(ports 3000 and 3002 are held by Docker on the development machine; 3017 was used
by 33-03 when 3007 was held by a parallel plan). A worktree has no `.env.local` of
its own — whoever runs these must supply the environment.

Roles only. The repo is public; no person is named.

---

### U-01 — THE DOOR. A `pending` organizer admits a ticket 🚪

- **role:** `organizer` / **`pending`**
- **url:** `/admin/scanner`
- **steps:** sign in; open the scanner; scan and admit a **valid** ticket.
- **expected:** the page is reachable and the ticket is admitted.
- **why it leads:** `door.operate` is granted with `requires_approved = false`
  deliberately (`supabase/migrations/20260807000000_capability_model.sql:416-417`),
  and `/admin/scanner` is tested **before** the general `/admin` branch
  (`src/lib/supabase/middleware.ts:181-190`). **If this fails, a status check has
  crept in and the phase stops** — a refusal here happens in front of a queue.
- **result:** [pending]

### U-02 — THE DOOR, offline 🚪

- **role:** `organizer` / `pending`
- **steps:** with U-01 still open, turn the network off; scan a ticket.
- **expected:** the scan **queues**, and drains when the network returns.
- **result:** [pending]

### U-03 — THE MONEY. A master still reaches `/admin/finance` 💶

- **role:** `master`, any status (`admin.access` is `requires_approved = false`)
- **url:** `/admin/finance`
- **expected:** the transaction list loads with **real SumUp rows** — not an
  empty state, not a redirect, not a "not configured"-shaped notice pointing at
  the wrong system.
- **evidence if it fails:** `src/app/(admin)/admin/finance/actions.ts`
  `requireMaster()`; grant row
  `supabase/migrations/20260807000000_capability_model.sql:408`.
- **stop condition:** *if U-03 or U-04 diverges, STOP: a money surface has moved,
  and this phase does not have permission to move one.*
- **result:** [pending]

### U-04 — THE MONEY. An organizer is still refused 💶

- **role:** `organizer`, any status
- **url:** `/admin/finance`
- **expected:** redirected to `/dashboard`, exactly as before. No row grants
  `admin.access` to `organizer`.
- **result:** [pending]

### U-05 — The eleven-persona sweep (criterion 4's observable half)

Phase 32's verdict table is the reference; re-run it.

1. **`master` / `approved`** — `/admin`, `/admin/finance`, `/admin/members`,
   `/admin/events`, `/admin/scanner`, `/organizer/events`, `/dashboard`,
   `/membership-card`. **Expected:** all reachable. *This is the step the removal
   order exists for: had the injection been deleted before the readers, every one
   of these would bounce.*
2. **`organizer` / `approved`** — `/organizer/*` reachable; `/admin/finance`
   bounces to `/dashboard`; `/admin/scanner` reachable.
3. **`organizer` / `pending`** — `/admin/scanner` reachable; `/organizer/events`
   reachable; venue creation still refused.
4. **`member` / `approved`** — `/dashboard`, `/membership-card`, `/attendance`
   reachable; `/admin/*` and `/organizer/*` bounce.
5. **`member` / `pending`** — `/dashboard` reachable with the pending notice;
   `/membership-card` and `/attendance` bounce.
6. **Anonymous** — public pages render; `/dashboard` redirects to `/login`.
- **result:** [pending]

### U-06 — The session check, which is not about permissions

- **steps:** sign in and navigate between **five** pages.
- **expected:** you stay signed in.
- **why:** the deleted injection block sat directly above the cookie
  re-application loop (`src/lib/supabase/middleware.ts:259-273`), whose comment
  says *"Without this, users would be logged out on every navigation"*. Being
  logged out means the edit disturbed something below the strip.
- **result:** [pending]

### U-07 — The degraded path (WR-04)

- **url:** `/dashboard?access=unavailable`
- **expected:** the notice appears and says the system **could not check**
  permissions — **not** that you lack access. Confirm the wording distinguishes
  the two.
- **result:** [pending]

### U-08 — The forged header, last

- **steps:** signed out, request `/admin/finance`, `/events/<slug>/menu` and
  `/api/tickets/checkin` with
  `-H 'x-user-role: master' -H 'x-user-status: approved' -H 'x-user-id: 00000000-0000-0000-0000-000000000000'`.
- **expected:** identical responses to the same requests without the headers.
- ⚠️ **Only the middle one is a sensitive surface.** `/admin/finance` is refused
  by the middleware's `admin.access` rule and `/api/tickets/checkin` never read a
  header at all, so both answer as they did before this phase. Record all three
  and record **which one carries the evidence**.
- **result:** [pending]

### U-09 — Ownership refusal through the new path (owed since 33-01/33-07/33-08)

1. `organizer` / `approved` who does **not** own event *E*: open
   `/organizer/events/<E>/edit`. **Observe:** `notFound()` / redirect, not the form.
2. `master`: same URL. **Observe:** the form renders.
3. `organizer` / `approved` who owns one event and not another: open
   `/organizer/events`. **Observe:** only their own is listed.
4. `master`: `/organizer/events`. **Observe:** both.
- **result:** [pending]

### U-10 — Ownership, MUTATION PROOF (must not be skipped)

- In a transaction, revoke `master.manage` from `master` in
  `private.role_capabilities`. **Assert the delete affected exactly 1 row before
  reloading anything.** Reload as `master`. **Observe the refusal.** Roll back;
  re-assert the row is present; reload; observe the page return.
- **why it must not be skipped:** without it, U-09 cannot distinguish "the guard
  refuses" from "the guard is inert and the middleware did the work".
- **result:** [pending]

### U-11 — The eight admin surfaces (33-05)

- `master` / `approved`: `/admin/analytics`, `/admin/analytics/compare`,
  `/admin/analytics/members`, `/admin/artists`, `/admin/venues`,
  `/admin/newsletter`, `/admin/members`, `/admin/members/growth`.
  **Observe:** each renders, **and** the staff tab bar shows *Finance* and
  *Analytics* — the two tabs `StaffNav.tsx:20-28` renders only for
  `role === "master"`. *If the cast produced `null`, those two tabs would
  disappear while the pages still rendered — which is what makes this a real
  check on the new source of `role`.*
- `organizer` / `approved` and `member` / `approved`: `/admin/analytics`.
  **Observe:** `/dashboard`, with no flash of admin content.
- **result:** [pending]

### U-12 — The viewer's own row (33-05, the falsifiable one)

- As `master`, open `/admin/members` and find your own row. **Observe:** its
  actions cell shows `--`, not buttons; every other row shows buttons.
- **why:** `userId` resolving to `null` / `""` — the exact failure mode of that
  task's rewire — makes the own row show buttons like any other. **This is the
  one step that observes the rewired identity directly. Do not skip it.**
- **result:** [pending]

### U-13 — The eight event-admin surfaces (33-06)

- `master` / any status: `/admin/events`, `/admin/events/new`, and for a known
  event id `/admin/events/<E>/{analytics,drinks,edit,tickets,sales,guest-list}`.
  **Observe:** each renders as before; buyer names present on `tickets` and
  `sales`; entries present on `guest-list`.
- `organizer` / `approved`, then `member` / `pending`: the same eight.
  **Observe:** a **redirect** to `/dashboard` on every one — not a partial
  render, not an empty list.
- **result:** [pending]

### U-14 — Admin-events MUTATION PROOF (must not be skipped)

- With a `master` session, in a transaction:
  `delete from private.role_capabilities where role = 'master' and capability = 'admin.access';`
  **Assert the delete affected exactly 1 row before reloading.** Reload
  `/admin/events/<E>/guest-list`. **Observe the redirect.** Roll back; reload;
  observe the page return.
- **why:** this is the step distinguishing "the gate refuses" from "the gate is
  inert and the middleware did the work" — and the one the build gate provably
  cannot do.
- **result:** [pending]

### U-15 — Guest list, attribution and refusal (33-09)

1. `organizer` / `approved` who **owns** *E*: `/organizer/events/<E>/guest-list`,
   add a guest with an email. **Observe:** the guest appears, and
   `guest_list_entries.added_by` holds **that organizer's** `auth.uid()` — not
   null, not another id.
2. Same session, against **another organizer's** event id. **Observe:** refused,
   and that event's guest list unchanged.
3. `master`, same target. **Observe:** permitted — the master short-circuit runs
   before the ownership read.
4. **`member` / `approved`**: call `fetchGuestList` with any event id.
   **Observe:** refused. *Before 33-09 this returned every guest's name and
   email.* (§5.1)
- **result:** [pending]

### U-16 — Guest list, MUTATION PROOF (must not be skipped)

- In a transaction, revoke `staff.manage` from `organizer`; **assert the delete
  affected 1 row before reading any result**; reload; **observe the refusal**;
  roll back and re-read to confirm the grant is restored.
- **why:** without it, U-15 cannot distinguish a working gate from no gate at all.
- **result:** [pending]

### U-17 — The organizer/pending asymmetry, observed in the app (33-10)

1. `organizer` / `approved` creates a **venue** at `/organizer/venues`.
   **Expect:** created, exactly as before.
2. `organizer` / `approved` creates an **artist** at `/organizer/artists`.
   **Expect:** created.
3. `organizer` / **`pending`** attempts to create a **venue**. **Expect (option
   C):** the action gate **passes** (a pending organizer holds `staff.manage`),
   the write is refused by **RLS**, and the failure surfaces as it did before. If
   the refusal arrives *before* any write, the wrong key shipped.
4. `organizer` / **`pending`** attempts to create a **ticket tier**. **Expect:
   succeeds.** *This is the step most likely to be skipped, because it touches a
   file 33-10 never opened — and the one that catches the worst failure:
   `catalogue.manage` leaking outside the two tables it belongs to.*
- **cross-check:** the container matrix already agrees — `ticket_tiers` insert
  `ok:1`, `venues` insert `42501` (§3, 4b). This item observes it **through the
  app**, which the matrix cannot.
- **result:** [pending]

### U-18 — The public surfaces and the anonymous visitor (33-11)

- **Anonymous, private window:** `/` renders the landing page with the logo and
  three links — *not* a redirect to `/dashboard`, no error boundary. Then
  `/gallery`, `/newsletter`, `/venues/<slug>`, `/artists/<slug>`: each renders as
  before; bottom nav shows the logged-out set; **no edit button on either
  catalogue page**. On `/venues/<slug>`, the address block and Maps link are
  **exactly** what they were — nothing newly shown, nothing newly hidden.
- **`member` / `approved`:** `/` redirects to `/dashboard`; no edit button on the
  catalogue pages; `/tickets/<own id>` shows the ticket, the QR and the venue
  line as before.
- **`organizer` / `approved` then `organizer` / `pending`** — the pair that
  proves D-33-11-C: on `/artists/<slug>` and `/venues/<slug>` the edit button
  appears for **both**; saving **succeeds** for `approved` and **fails** for
  `pending`, refused by RLS and surfaced by the modal's error state.
- **result:** [pending]

### U-19 — Member moderation, the coupling, and the asymmetry (33-13)

1. `organizer` / `approved` on `/admin/members` (or `/organizer/members`):
   approve a `pending` member. **Observe:** succeeds; status becomes `approved`.
2. Same session: attempt a **role change**. **Observe:** refused. In `next dev`
   the message reads `forbidden.master_manage_required`; in production it is
   redacted, so the observable is that the row's `role` is **unchanged in the
   database**.
3. `master`: change that member's role to `organizer`. **Observe:** succeeds
   **and** the same write sets `status = 'approved'` — the 2026-08-06 coupling.
   Demote to `member`. **Observe:** `status` stays `approved`.
4. `organizer` / **`pending`**: moderating media, deleting another member's
   media, and setting `menu_closes_at` all still **succeed**.
5. `member` / `approved` who uploaded a photo: delete **their own** — succeeds.
   Delete **someone else's** — refused, and that row still exists in
   `event_media`.
- **result:** [pending]

### U-20 — Member moderation, MUTATION PROOF (must not be skipped)

- In a transaction, delete `('organizer','staff.manage')` from
  `private.role_capabilities`; **assert `select count(*) … → 0` before reading
  any result**; reload as the organizer; attempt an approval; **observe the
  refusal**; roll back and re-assert the row is present.
- **why:** without it, nothing in U-19 distinguishes a correct gate from an
  inverted one.
- **result:** [pending]

### U-21 — 33-12's step 5 is a criterion-4 REGRESSION CHECK, not a criterion-2 probe

Recorded separately and explicitly so the weaker item cannot stand in for the
stronger one. 33-12's step 5 observes that a converted page still serves the same
content to the same role — that is **criterion 4** (no reach moved). It is **not**
the forged-identity comparison, which is **U-08** plus 33-12's rows C and B
(§3, criterion 2). Do not report U-21 as satisfying criterion 2.

- **result:** [pending]

---

## 8. Deferred debt, carried out of this phase

| item | where | owner phase |
|---|---|---|
| The door's error headline is decided by HTTP status (§5.3) | `ScannerClient.tsx:81-87` vs `checkin/route.ts:946-965` | not assigned |
| Attribution columns do not exist (§5.4) | `supabase/` — no `approved_by` / `rejected_by` / `promoted_by` | 43 |
| `?redirect=` vs `?next=` never meet (§5.5) | `middleware.ts:163` vs `(auth)/login/page.tsx:11` | not assigned |
| Venue-secrecy finding, pre-existing (§5.7) | documented **outside** this repo | page filter first, RLS narrowing in **37** |
| `MASTER_EMAIL` promotes, never demotes (§5.8) | `api/auth/callback/route.ts:27` | not assigned |
| `middleware.ts` → `proxy.ts` deprecation (§5.9) | build output `ƒ Proxy (Middleware)` | not assigned |
| Menu page branches a service-client read on a boolean (§5.10) | `(public)/events/[slug]/menu/page.tsx` | not assigned |
| Guest-list ownership read uses the service client (§5.10) | `…/guest-list/actions.ts:88` | not assigned |
| `role` / `status` still in the `my_access_context()` payload | `MobileNav`, `StaffNav` are client components | **34** (STAFF-03) |
| `profiles_update_own` / `42P17` recursion | out of bounds by D-32-A; still `42P17` on all 11 personas | deferred by owner |
| `src/utils/qr.ts:49` generates the membership code with `Math.random()` | pre-existing, confirmed | not assigned |
| `verify-capabilities.mjs` parser defeated by an apostrophe (WR-07) | `(auth)/register/page.tsx:13` | not assigned |
| D-32-C is a false guardrail written into `CLAUDE.md` | `grep -ci 'CREATE POLICY' supabase/schema.sql` → 37, not 0 | not assigned |

---

## 9. Verdict

| criterion | status | carried by |
|---|---|---|
| 1 — nothing reads an identity header | **MEASURED** | §2.1, §2.4 — `verify:no-header-identity` exit 0, both assertions, mutation-proved |
| 2 — a forged header is answered as anonymous | **MEASURED (33-12 rows C, B)**; money path **OWED**; positive control **no longer establishable, stated** | §3 |
| 3 — the duplicated predicates are gone | **MEASURED**, 50 → 0, with one grep false positive reported | §3 |
| 4 — no role's reach moved | **PARTLY MEASURED** (`CAP-03: clean` ×2, hard constraints, build) · **PARTLY OWED** (U-01 … U-21) | §3, §7 |
| 5 — WR-04 closed, IN-01 closed | **MEASURED** | §4 |

**The phase's mechanical half is complete and re-checkable. Its observable half
is written and owed.** In a repository with no test runner, saying which is which
is the verification.
