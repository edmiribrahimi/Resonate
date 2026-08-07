---
phase: 33-server-data-access-layer
plan: 10
subsystem: access-gating
tags: [capabilities, catalogue, server-actions, artists, venues, requires-approved]
requires:
  - "33-01: getAccessContext().userId, CAP keys"
provides:
  - "the four catalogue actions gate on a session-derived capability"
  - "assertStaffManage (module-local, one per file)"
affects:
  - "a future plan that hoists assertStaffManage into src/lib/capabilities/guards.ts"
  - "the deferred catalogue.manage question — CF-33-10-A below"
tech-stack:
  added: []
  patterns:
    - "a gate in a \"use server\" module is module-local and never exported"
    - "resolve getAccessContext() ONCE per Server Action invocation"
    - "identity narrowed by an explicit throw, never by `!`"
    - "two thrown categories — a refusal and an unanswered question — never one"
key-files:
  created: []
  modified:
    - src/app/(organizer)/organizer/artists/actions.ts
    - src/app/(organizer)/organizer/venues/actions.ts
decisions:
  - "D-33-10-A: option C — CAP.STAFF_MANAGE now, catalogue.manage divergence carried forward"
  - "D-33-10-B: assertStaffManage is module-local in each file, not shared, because guards.ts belongs to a plan running in parallel"
  - "D-33-10-C: the four prose refusal messages collapse into one category, because Next redacts them in production anyway"
metrics:
  duration: "~35 min"
  completed: 2026-08-07
  tasks: 3
  commits: 1
requirements: [CAP-05]
---

# Phase 33 Plan 10: The Four Catalogue Blocks Summary

Eighty lines of duplicated auth preamble across `createArtist`, `updateArtist`,
`createVenue` and `updateVenue` became one gate call each — on `staff.manage`,
the key whose predicate is byte-equal to the deleted code, so the measured
`organizer/pending` asymmetry is reproduced rather than tidied.

## What was built

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Owner decision — `catalogue.manage` or `staff.manage` | — (decision, no file changed) | — |
| 2 | Replace the four inline blocks with the chosen gate | `41b7f7d` | `artists/actions.ts`, `venues/actions.ts` |
| 3 | Verify the catalogue actions and the pending asymmetry | — (**owed**, see below) | — |

## Task 1 — the decision, and the selection verbatim

**Selected: option C — `CAP.STAFF_MANAGE` now, with the divergence recorded as a
carry-forward.**

The plan raised this as a blocking owner checkpoint with three options. It was
**resolved ahead of execution by the phase orchestrator**, not typed by the owner
in this session, and the resolution was handed down as a rule rather than as a
preference. Quoted verbatim from the executor's instructions:

> "The resolution rule: **this phase's contract is that behaviour does not
> change** (criterion 4 — every role still reaches exactly the surfaces it
> reached before). The planner's own analysis says neither option changes *which
> surfaces a role reaches*; what differs is the *shape of the refusal* for
> `organizer/pending`.
>
> **Therefore: choose the option that reproduces today's behaviour exactly,
> character for character.** Write the other options into your SUMMARY.md with
> what each would change, so the choice is visible and reversible — but do not
> make this phase the place where the refusal shape moves."

Option C rather than option A because the instruction to write the rejected
options into the summary *is* option C: the difference between A and C is
whether the deferral is recorded, and it is recorded — here, and in a comment
inside each converted file.

### The premise was verified before acting, not assumed

The instruction also said: *"If your reading of the code shows that the
behaviour-preserving option is NOT the one the plan assumes, say so and STOP."*
It is the one the plan assumes. Read directly out of the migration:

| | Grant | `requires_approved` | Source |
|---|---|---|---|
| `staff.manage` | `master`, `organizer` | **`false`** | `20260807000000_capability_model.sql:392-393` |
| `catalogue.manage` | `master`, `organizer` | **`true`** | same file, `:399-400` |
| `member` | holds neither | — | no row for either key |

The deleted predicate was `profile.role !== "organizer" && profile.role !==
"master"` — role only, status ignored, `member` refused. `staff.manage`'s grant
set is that predicate, character for character. Premise holds; execution
proceeded.

### The rejected options, and exactly what each would have changed

| Option | Key | What would change | What it would cost |
|---|---|---|---|
| **A** (rejected) | `STAFF_MANAGE` | Nothing observable — identical to C in code | Nothing in behaviour. Rejected only because it leaves the divergence unrecorded, and an unrecorded divergence is one nobody revisits |
| **B** (rejected) | `CATALOGUE_MANAGE` | `organizer`/`pending` would be refused **by the action**, with a sentence, instead of by RLS with a raw `42501` leaking out of the write. Zero change to *which* surfaces any role reaches | Owner-visible change of failure shape on a path that has one today — inside a phase that promised none. And it would stop exercising the RLS refusal on that path, so a future regression in the `artists`/`venues` policies would be **masked** by the action gate rather than caught by it |
| **C** (selected) | `STAFF_MANAGE` + carry-forward | Nothing observable now; the question survives in writing | One more phase with a known mismatch in place |

**Option B remains the better end state and is deferred, not declined.** The
argument for it is real: the TypeScript gate and the RLS policy should ask the
same key of the same authority, and today a pending organizer's refusal reaches
them as a database error code rather than a sentence.

### CF-33-10-A — the carried-forward question

> Should `createArtist`, `updateArtist`, `createVenue` and `updateVenue` gate on
> `CAP.CATALOGUE_MANAGE` instead of `CAP.STAFF_MANAGE`, accepting that
> `organizer`/`pending` sees a different refusal than they see today, and
> accepting that the RLS refusal on those four writes stops being exercised on
> that path?

It needs its own before/after evidence for one persona on one path — the same
treatment `D-32-A` got for `profiles_update_own`. It is **not** a code cleanup:
it is a product decision about what a pending organizer is told, and it is the
only user-visible change available anywhere in this phase.

The question is also written into both converted files, so a reader who never
opens `.planning/` still finds it.

## What changed in the code

Each of the four actions lost the same twenty lines — `supabase.auth.getUser()`,
a `public.profiles` select of `role`, and a two-arm role comparison — and gained
one call:

```ts
const supabase = await createClient();
const { userId } = await assertStaffManage();   // create*
await assertStaffManage();                      // update*
```

`supabase` stays: it is still needed for the insert/update. Only the auth
preamble went.

### Four decisions inside that one line

**1. The gate is module-local and deliberately NOT exported.** Every export of a
`"use server"` module is a public endpoint with a comfortable signature
(`nextjs-architecture.md`, gate *server action autorizzata*). A gate is not an
endpoint. It is `async function assertStaffManage()` with no `export`.

**2. It is defined twice, once per file, and that is a compromise — stated as
one.** Its correct home is `src/lib/capabilities/guards.ts`, beside
`ownsOrIsMaster`. That file belongs to a plan executing in parallel in another
worktree, and this plan's `files_modified` is exactly two files. So the plan's
`must_haves` truth *"four inline copies become one shared call"* landed as **four
copies became two four-line definitions with four call sites** — a real
consolidation of the twenty-line block, not the single shared definition the
plan named. Hoisting it is a follow-up (**CF-33-10-B**), and it is a pure move.

This is a duplicated *adapter*, not a duplicated *rule*: the rule lives in
`private.role_capabilities` and is asked through the one resolver. CAP-01 is not
violated. But two copies of a security-relevant helper is still two places to
edit, and it should not survive the phase.

**3. `getAccessContext()` resolves ONCE per invocation.** `cache()` does not
memoise inside a Server Action body — measured in phase 33's research, three
calls ran the body three times, identically in `next dev` and in a production
build (`src/lib/capabilities/server.ts:103-121`). Asserted mechanically: exactly
one `getAccessContext()` call site per file, inside the helper, and zero
`hasCapability` calls.

**4. `created_by` takes a narrowed identity, never a `!`.** `userId` is
`string | null`. No Supabase client in this repository carries a `Database`
generic, so `.insert({ created_by: null })` would have compiled **green** all the
way to runtime. The helper refuses a null identity with an explicit throw and
returns `{ userId: string }`, so the two `create*` actions receive a narrowed
type rather than an assertion.

That refusal is **strictly stricter** than what it replaces and admits nobody
new: today `auth.getUser()` already had to succeed before the role was read, so a
caller with no identity was already refused. The direction is monotone toward
refusal.

### Two categories, never one

- `forbidden.staff_manage_required` — the answer is no.
- `capabilities.identity_missing` — there is no answer, because the payload
  carried no `user_id`, which means `20260808000000_access_context_user_id.sql`
  has not been applied. It also logs a tagged `console.error` line.

Collapsing these is the recorded newsletter defect (`meta-gates.md`,
`.planning/codebase/CONCERNS.md`). There is no `catch` in either file that
returns a value.

**And neither string can be branched on from a client.** Next redacts the message
of an error thrown out of a Server Action in a production build (CR-01,
`32-REVIEW.md`). A caller needing the category must carry it as a tagged value
decided by **position**. The four `CreateArtistModal` / `EditVenueButton`-family
callers do not branch on the message today; they render the thrown error's text,
which is redacted in production both before and after this change.

### The four prose messages collapsed on purpose

`"Forbidden: only organizers can create artist profiles"` and its three siblings
differed only in the noun. They are now one category. This loses nothing
observable, for the same redaction reason: those four sentences only ever
rendered under `next dev`. Said in the commit so the diff does not read as a lost
diagnostic.

## The header-identity meter

**Base: 102 lines / 47 files. After this plan: 102 lines / 47 files. Delta: 0.**

Measured with the repository's own instrument, `npm run
verify:no-header-identity`, before and after — not with an ad-hoc grep. It counts
case-insensitively, counts comment-shaped mentions toward the verdict, and
exempts only `src/lib/supabase/middleware.ts`.

**The zero is correct and expected, not a failure.** The two files this plan
converts never read an identity header: they read `supabase.auth.getUser()` and
`public.profiles`. They are not among the 47 files the meter names, so no
arithmetic this plan performs could move it. This plan advances criterion 3 (the
inline duplicates) and pays nothing toward the meter, which plan 33-14 closes.

The 102/47 figure was independently reconciled here and matches the number three
sibling plans reported — not the 98/45 in `33-02-SUMMARY.md`, which predates wave
1 adding comment-shaped mentions of the header names.

## Verification

**There is no test runner for this product, and none was added. Nothing below is
verified because tests pass.** What was actually run:

| Check | Form used | Result |
|---|---|---|
| `rm -rf .next && npm run build` | — | **exit 0** |
| any role comparison, variable-agnostic + case-insensitive | `grep -rniE '\.role[[:space:]]*(!==\|===\|==\|!=)'` | **0** |
| any `profiles` table read | `grep -rniE 'from\([[:space:]]*.profiles.'` | **0** |
| any `select` naming `role` (catches `select("role, status")`) | `grep -rniE 'select\([[:space:]]*.[^)]*role'` | **0** |
| any `auth.getUser` | `grep -rniE 'auth\.getUser'` | **0** |
| any `!` assertion on identity, any surviving `user.id` | `grep -rnE 'userId!\|user\.id'` | **0** |
| any role literal left in either file | `grep -rniE '"(organizer\|master\|member)"'` | **0** |
| `getAccessContext()` call sites | `grep -rnE 'getAccessContext\(\)'` | **1 per file**, inside the helper |
| `hasCapability` call sites | `grep -rcE 'hasCapability'` | **0 per file** |
| `npm run verify:no-header-identity` | — | 102 / 47, **unchanged** |

**The assertion form is deliberate.** The plan specified
`grep -rc 'profile.role !== '` and `grep -rc 'from("profiles")'` — literal
strings tied to one variable name and one quoting style. A `select("role")`
assertion scores 0 against code that writes `select("role, status")`, and this
has now bitten three times in this phase. Every check above is
variable-agnostic, quote-agnostic and case-insensitive, and each is broader than
the code it must catch.

### `verify:capabilities` was NOT run — and that is recorded, not skipped

`npm run verify:capabilities` exits with `FATAL: missing environment variable(s):
SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL` in this worktree. It reads the
live `private.capabilities` catalogue and there are no credentials here. **No
substitute was run and no green is claimed.**

Its expected result is unchanged parity: this plan adds no capability key,
changes no migration, and touches no grant. Even had it run, it reads the
*catalogue*, never the *grants* — a green there is not a statement about who can
do what (D-32-L).

### Mutation proofs — each mutation asserted applied before its result was read

`ai-engineering.md`, gate *prova per mutazione*.

| # | Mutation | Asserted applied | Build | Verdict |
|---|---|---|---|---|
| 1 | `CAP.STAFF_MANAGE` → `CAP.STAFF_MANAGE_TYPO` | typo present ×1, original ×0 | **exit 1** — `Property 'STAFF_MANAGE_TYPO' does not exist`, pointing at line 79 of the converted file | ✓ flips — and proves the build gate really sees this file |
| 2 | `if (!capabilities.has(…))` → `if (capabilities.has(…))` | inverted ×1, original ×0 | **exit 0**, zero type errors | ✗ **does not flip** |
| — | restore | `cmp` byte-identical to pre-mutation state; original ×1, mutants ×0 | exit 0 | ✓ |

**Mutation 2 is the finding that matters, and it is worse than "the build is
blind to polarity".** Trace what that inverted gate actually does:

- a `master` or `organizer` holds `staff.manage` → **thrown out**, every one of them;
- a `member`/`approved` does **not** hold it → falls through the capability arm,
  has a real `userId`, passes the identity arm, and **reaches the insert**;
- only RLS then refuses them, with `42501`.

So a one-character edit inverts the population entirely — refuses all staff,
admits every member into the action body — and `npm run build` ships it clean.
The build proves the **key spelling** (mutation 1) and proves **nothing about who
is refused**. This is why task 3's manual procedure is not optional, and why the
persona forbids saying a product change is verified because a command exited 0.

## Manual verification still owed

**Task 3 was not executed.** The owner has deferred manual verification to the
end of the build, so it was neither run nor substituted for. It requires two live
sessions (`organizer`/`approved` and `organizer`/`pending`) that this worktree
does not have.

`32-VERIFICATION.md` set the precedent that **deferred is not verified**. This is
deferred. The procedure, unchanged from the plan, so it survives without it:

`rm -rf .next && npm run build && PORT=3007 npm run start`

1. **`organizer`/`approved` creates a venue** at `/organizer/venues`.
   **Expect:** created, exactly as before.
2. **`organizer`/`approved` creates an artist** at `/organizer/artists`.
   **Expect:** created.
3. **`organizer`/`pending` attempts to create a venue.**
   **Expect, given option C:** the action gate **passes** (a pending organizer
   holds `staff.manage`), the write is refused by RLS, and the failure surfaces
   as it did before this phase. If instead the refusal arrives *before* any
   write, the wrong key shipped — that would be option B's behaviour.
4. **`organizer`/`pending` attempts to create a ticket tier. Expect: succeeds.**
   This is the other half of the intentional asymmetry and the step that catches
   the worst failure — a pending organizer refused here would mean
   `catalogue.manage` leaked outside the two tables it belongs to, which
   `32-CARRY-FORWARD.md` §3 names as this model's worst-case defect. It is also
   the step most likely to be skipped, because it touches a file this plan never
   opened.
5. **`member`/`approved` cannot reach either page. Expect:** bounced, as before.

**Two steps the plan did not list, added because this conversion created them:**

6. **A signed-out caller invokes `createVenue` directly** (the action is a public
   endpoint; a page-level check does not extend into it). **Expect:** refused.
   Before: `"Not authenticated"` from `auth.getUser()`. After:
   `forbidden.staff_manage_required` — the anonymous context is the empty
   capability set. Both refuse; both messages are redacted in production. Record
   which was observed.
7. **Confirm no `capabilities.identity_missing` line appears in the server log**
   during steps 1–2. If one does, `20260808000000_access_context_user_id.sql` is
   not applied on that environment, and every `create*` would be refused.

## Cross-domain impact check

**Venue secrecy — the domain that owns half this plan's subject.**
`createVenue` / `updateVenue` write `venues.address` and
`venues.google_maps_url`. Enumerated by reading the code, not from memory:
nothing in either file touches `venue_reveal_sent`, `venue_reveal_on_purchase`,
`venue_secret_hint_reveal_hours`, the per-ticket / per-RSVP entitlement, the
reveal cron or the reveal email. The set of callers permitted to write an address
is byte-identical before and after — `staff.manage` holders, exactly the
`{organizer, master}` of the deleted line. **The monotone one-way switch is not
made easier to trip.** The only direction the gate moved at all is stricter
(a null identity is now refused explicitly).

**`door.operate` stays `requires_approved = false`.** Untouched: no shared helper
was created that could move it, no migration was written, and the helper added
here names `staff.manage` and nothing else.

**Middleware is UX; RLS is the boundary.** No comment added implies otherwise —
both file comments state explicitly that `catalogue.manage`'s RLS policies remain
the layer that refuses a pending organizer.

**`member` is not `approved`.** The two axes stay separate: this plan asks a
capability that ignores status, precisely because the deleted code did, and the
status half of the question stays where it already lives, in
`requires_approved` on `catalogue.manage`.

**Out of bounds and untouched:** `profiles_update_own` / `42P17` (owner-deferred,
D-32-A). Not read, not referenced, not changed.

## Deviations from Plan

**1. [Rule 3 — blocking] The plan's option A/C code shape does not compile as
written.** It shows `const ctx = await assertStaffManage();` importing a function
that does not exist in `guards.ts` — and the same task forbids editing
`guards.ts`, because plans 33-01 and 33-09 own it. The two instructions cannot
both be satisfied by an import. Resolved by defining the helper module-locally in
each file, which is what the plan's own option-B branch prescribes for exactly
this reason ("add the gate inline in these two files rather than editing a file
another wave-2 plan owns"). Recorded above as D-33-10-B and CF-33-10-B, and the
`must_haves` string `assertStaffManage` is present in
`src/app/(organizer)/organizer/artists/actions.ts` as required. Commit `41b7f7d`.

**2. [Rule 2 — missing critical verification] The plan's automated checks are
literal-string greps and would score 0 against code that still contained the
defect.** `grep -rc 'profile.role !== '` misses `profile.role!==`,
`p.role !== `, and any other variable name; `grep -rc 'from("profiles")'` misses
single quotes and whitespace. Both were replaced with broader case-insensitive,
variable-agnostic, quote-agnostic forms, and five further assertions were added
(`auth.getUser`, `user.id`, role literals, resolve-count, `hasCapability` count).
The plan's original forms also pass. The instrument was **not** edited — these
are executor-side assertions, and `verify:no-header-identity` was run as shipped.

**3. Task 1 was not executed as a blocking checkpoint.** It was pre-resolved by
the orchestrator before execution began, with the premise verified against the
migration first. Recorded in full above rather than silently absorbed.

**4. Task 3 was not executed.** Deferred by owner policy, not by omission. See
*Manual verification still owed*.

## Deferred / noted, not fixed here

- **CF-33-10-A** — the `catalogue.manage` question (full text above). Needs its
  own persona-level before/after evidence.
- **CF-33-10-B** — hoist `assertStaffManage` from the two action files into
  `src/lib/capabilities/guards.ts` once no plan holds that file. A pure move; the
  two definitions are byte-identical in body.
- `npm run verify:capabilities` could not run here (no credentials in the
  worktree). Not claimed as green.
- Pre-existing `npm run lint` state (~21 errors / ~108 warnings) untouched and
  unrelated — neither converted file was among them, and none was introduced.
- `server-only` was not adopted; no package was installed by this plan.

## Known Stubs

None. All four actions are fully wired: the gate resolves a real capability from
a real session, `created_by` receives a real narrowed identity, and no branch
returns a placeholder or an empty value.

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema was added —
the four Server Actions already existed as public endpoints and their entry
conditions are byte-equal.

Register dispositions from the plan, as they actually landed:

| Threat ID | Disposition | How it landed |
|---|---|---|
| T-33-52 | mitigate | The keys were not collapsed: `catalogue.manage` keeps its grants and `requires_approved = true`, verified by reading `20260807000000_capability_model.sql:392-400` before editing. The observation half — that `organizer/pending` still inserts a `ticket_tier` — is **owed** (step 4) |
| T-33-53 | mitigate | Each of the four actions keeps its own gate; none relies on a page-level check |
| T-33-54 | **accept**, as option C specifies | The `42501` still surfaces as a raw failure for `organizer`/`pending`. Recorded deliberately as CF-33-10-A, not left as an accident of the refactor |
| T-33-55 | mitigate | No `!` assertion anywhere in either file (asserted mechanically, 0 matches); identity narrowed by an explicit throw with its own category |
| T-33-56 | accept | No dependency added, no package-manager install run |

## Self-Check: PASSED

- `src/app/(organizer)/organizer/artists/actions.ts` — FOUND (modified)
- `src/app/(organizer)/organizer/venues/actions.ts` — FOUND (modified)
- commit `41b7f7d` — FOUND in `git log`
- `npm run build` after the task commit — exit 0
- working tree clean apart from this summary; no file outside `files_modified`
  touched; `STATE.md`, `ROADMAP.md` and `deferred-items.md` not modified
