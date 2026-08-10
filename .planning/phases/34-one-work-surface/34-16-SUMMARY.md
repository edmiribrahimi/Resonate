---
phase: 34-one-work-surface
plan: 16
subsystem: routing
tags: [revalidate-path, cache, capabilities, cap-02, no-ci, verification]

requires:
  - phase: 34-one-work-surface
    provides: "`scripts/verify-routes.mjs` and its 29-entry worklist (plan 34-08)"
  - phase: 34-one-work-surface
    provides: "`src/lib/routes/capability-routes.ts` — the addresses a surviving call must name (plan 34-01)"
provides:
  - "`node scripts/verify-routes.mjs` exit 0 — every statically visible `revalidatePath` literal names a declared address"
  - "The seven collapsed pairs, each named with its enclosing function, for procedure M-8 to be checked against"
  - "A side-4 warning that states the question it does not ask, names the file that does, and carries finding F3"
  - "The CAP-02 chain and its weak link written in `verify-capabilities.mjs`'s docblock"
affects: [34-17, 39-door-moves]

tech-stack:
  added: []
  patterns:
    - "A sweep whose success criteria are all satisfiable by deleting the thing being swept is not a criterion — the after-count is recorded with its per-file breakdown so re-pointing and deleting are distinguishable"
    - "Every sweep criterion matches both quoting styles, because ten of the calls were backtick template literals"
    - "Proof by mutation of a latent branch, with the mutation asserted applied before its result was read"

key-files:
  created: []
  modified:
    - src/app/(admin)/admin/members/actions.ts
    - src/app/(admin)/admin/events/actions.ts
    - src/app/(admin)/admin/events/[id]/tickets/actions.ts
    - src/app/(admin)/admin/events/[id]/assignments/actions.ts
    - src/app/(admin)/admin/events/[id]/guest-list/actions.ts
    - src/app/(public)/tickets/refund-actions.ts
    - src/app/(admin)/admin/artists/actions.ts
    - src/app/(admin)/admin/venues/actions.ts
    - scripts/verify-capabilities.mjs

key-decisions:
  - "The four `/artists` and `/venues` no-ops were RE-POINTED at the staff listings rather than deleted or allow-listed — which is why the after-count is 33 and not 29, and that difference is the evidence of the re-point"
  - "The mutation for side 4 removed a key's only caller instead of inserting a thirteenth key: side 4 iterates the DATABASE catalogue, so a key added only to `keys.ts` never reaches its warning branch, and the catalogue is not this phase's to edit"
  - "The chain was written into the script's docblock only; `34-VERIFICATION.md` is plan 34-17's file and was not created here"

requirements-completed: [STAFF-03, CAP-02]

duration: ~55min
completed: 2026-08-10
---

# Phase 34 Plan 16: The Literal Sweep Summary

**The 29-entry worklist plan 34-08 left red is at zero, reached by re-pointing 22 calls and collapsing 7 matched pairs — never by deleting a call — and `verify:capabilities` side 4 now states the question it is not asking, proved by a mutation against a branch that does not otherwise execute.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2 of 2
- **Files modified:** 9 (8 action files, 1 script)
- **Files created:** 0

## Task Commits

1. **Task 1: the sweep** — `3b90084` (fix)
2. **Task 2: side 4 re-pointed** — `ccf9915` (docs)

---

## The counts, measured with the quote-agnostic pattern

`grep -rE 'revalidatePath\(\s*[` + "`" + `"]/(admin|organizer)' src/ | wc -l`, run against `1343dbb` (before) and the working tree (after):

| Measure | Before | After |
|---|---|---|
| `/admin` **or** `/organizer` | **36** | **33** |
| naming `/organizer` (either quoting style) | **25** | **0** |
| naming `/admin` | 11 | 33 |
| `node scripts/verify-routes.mjs` offenders | **29** | **0** |

### Per file

| File | Before (of which `/organizer`) | After | What happened |
|---|---|---|---|
| `admin/members/actions.ts` | 16 (6) | **10** | 6 pairs collapsed |
| `admin/events/[id]/tickets/actions.ts` | 6 (6) | **6** | 6 template literals re-pointed |
| `admin/events/actions.ts` | 6 (5) | **5** | 1 pair collapsed, 4 lone calls re-pointed |
| `(public)/tickets/refund-actions.ts` | 4 (4) | **4** | 4 lone calls re-pointed |
| `admin/events/[id]/assignments/actions.ts` | 2 (2) | **2** | 2 template literals re-pointed |
| `admin/events/[id]/guest-list/actions.ts` | 2 (2) | **2** | 2 template literals re-pointed |
| `admin/artists/actions.ts` | 0 | **2** | 2 `"/artists"` re-pointed — see below |
| `admin/venues/actions.ts` | 0 | **2** | 2 `"/venues"` re-pointed — see below |
| **Total** | **36 (25)** | **33** | |

### Why 33 and not the plan's predicted 29 — and why the difference is the proof

The plan predicted 29 = 36 − 7 organizer halves. That arithmetic is exactly right **for the six declared files**: 36 − 7 = 29 calls remain across them, all naming `/admin`.

The extra 4 are the `/artists` and `/venues` calls of 34-08's Finding 1. They were **outside** the before-count because neither string matches `/(admin|organizer)`, and they entered the after-count **by being re-pointed into the `/admin` namespace**.

That is the load-bearing detail of this plan. Had those four been deleted — the outcome every mechanical criterion in the plan also accepts — the after-count would read **29**, matching the prediction exactly, and the sweep would have looked more correct while doing less. **29 would have been the number produced by removing four refreshes; 33 is the number produced by fixing them.** The difference between the predicted number and the measured one is the only place that distinction is visible, which is why it is written here rather than reconciled away.

---

## The seven collapsed pairs, each with its enclosing function

Verified **per pair** before either half was touched: both calls in the same function, revalidating the same surface for the same event. Adjacency alone was not accepted as proof — the earlier reading of five pairs in the members actions was low, and the corrected reading is six.

| # | File | Function | Lines (before) | Surface |
|---|---|---|---|---|
| 1 | `admin/members/actions.ts` | `deactivateMember` | 1693 / 1694 | the members list, after a withdrawal |
| 2 | `admin/members/actions.ts` | `reactivateMember` | 1738 / 1739 | the members list, after a readmission |
| 3 | `admin/members/actions.ts` | `approveMember` | 1786 / 1787 | the members list, after an approval |
| 4 | `admin/members/actions.ts` | `rejectMember` | 1844 / 1845 | the members list, after a refusal |
| 5 | `admin/members/actions.ts` | `runBulk` | 2061 / 2062 | the members list, after a batch (`if (succeeded > 0)`) |
| 6 | `admin/members/actions.ts` | `createAccount` (success path) | 2580 / 2581 | the members list, after an account is created |
| 7 | `admin/events/actions.ts` | `revalidateEventPaths` | 212 / 213 | the events list, on every event mutation |

In every case the `/organizer` half was deleted and the `/admin` half kept.

**What was deliberately NOT treated as a pair.** Four `/admin/members` calls stand alone and were left untouched: `:1455` in `updateMemberRole`, and `:2531`, `:2551`, `:2571` — the three **failure** paths of `createAccount` (`invitation_link_failed`, `invitation_link_misaimed`, `invitation_send_failed`). Each is a single call in its own early return. Reading one of them as half of a pair and deleting it would have removed a refresh on a path that already reports a failure to an operator.

## The eighteen lone `/organizer` calls, re-pointed

| Count | File | Change |
|---|---|---|
| 4 | `(public)/tickets/refund-actions.ts` | `"/organizer/events"` → `"/admin/events"` |
| 4 | `admin/events/actions.ts` | `"/organizer/events"` → `"/admin/events"` (the four drink-item mutations: add, update, remove, reorder) |
| 6 | `admin/events/[id]/tickets/actions.ts` | `` `/organizer/events/${eventId}/tickets` `` → `` `/admin/events/${eventId}/tickets` `` |
| 2 | `admin/events/[id]/assignments/actions.ts` | `` …/assignments `` — same, prefix only |
| 2 | `admin/events/[id]/guest-list/actions.ts` | `` …/guest-list `` — same, prefix only |

For the ten template literals the interpolation `${eventId}` and the trailing segment are byte-identical; only the prefix moved. **A double-quoted grep returns 0 on all ten**, which is why every criterion in this plan and every measurement above uses `` [`"] ``.

## The four Finding-1 calls — re-pointed, not allow-listed, not deleted

`revalidatePath("/artists")` ×2 in `admin/artists/actions.ts` (`createArtist`, `updateArtist`) and `revalidatePath("/venues")` ×2 in `admin/venues/actions.ts` (`createVenue`, `updateVenue`).

Neither bare address has ever been served by a page — corroborated independently by this plan's own build output, whose route table lists `/artists/[slug]` and `/venues/[slug]` and **no bare `/artists` or `/venues`**. They were pre-existing no-ops, not collapse debris.

They now name **`/admin/artists`** and **`/admin/venues`**: the staff listings the mutation is performed from, both declared patterns in the map. The sibling calls `` revalidatePath(`/artists/${artistId}`) `` and `` revalidatePath(`/venues/${venueId}`) `` were left untouched — the public detail pages exist and were already correct; only the listing half missed.

**Venue-secrecy check, since `updateVenue` writes `venues.address` and `venues.google_maps_url`.** The change moves a refresh from an address **nobody** is served to a **capability-gated staff** address. It cannot advance a reveal: it publishes nothing, touches no `venue_reveal_sent`, and the public `/venues/[slug]` call is unchanged. The monotone guard is strictly no easier to trip than before.

---

## Task 2 — side 4, and the branch that does not run

### The message, re-pointed

Side 4 remains a **warning**. Its computation is unchanged: `orphans = dbKeys.filter(k => !asked.has(k))`, where `asked` is the union of the policy side and the `src/` side. Promoting it to the build gate would make `npm run build` depend on a live database, which is precisely what D-34-11 avoided so CAP-02 can hold on a production build with no credential.

The message now states:
- **what it asks** — does a policy body or a `src/` call site ask for this key?
- **what it does not ask** — is this key bound to a route?
- **where that question lives** — `src/lib/routes/capability-routes.ts`, asserted by `npm run build`. Named, not gestured at: a message that says "handled elsewhere" without saying where sends the next reader looking.

The green-path detail line was extended too, because that half **is** visible on every run:

```
✓ 4 · every catalogue key is asked for by a policy or by src/
    12 keys, all reached: 7 by policy, 12 by src/ — asked-for, NOT route-bound;
    routes are capability-routes.ts + `npm run build`
```

### Finding F3, written into the docblock

Two reasons a green side 4 misleads:

- **(a) The route map IS `src/`.** `capability-routes.ts` lives under `src/` and names keys as `CAP.` members, so **binding a key to a route makes that key "asked for" by side 4's own definition**. Binding produces the green; the green does not evidence the binding. Only `npm run build` evidences it.
- **(b) Two keys were already green before this phase, for an unrelated reason.** `door.supervise` is asked for by `src/lib/door/require-operator.ts` and `media.upload` by `src/lib/media/may-upload.ts`. Both are `scope: "table"` in the map — they gate Route Handlers, not addresses (D-34-13) — so side 4 is green for them **because their guards landed, not because any route did**.

**(a) is not theoretical.** `CAP.MEMBERSHIP_CARD_VIEW` has exactly **one** reference anywhere under `src/`, and it is line 311 of `capability-routes.ts` — the map itself. That key's green on side 4 is produced entirely by its route binding. This is also what made the mutation proof below possible.

### The chain, and the link with no automation (D-34-12)

Written into the docblock in the plainest words available:

1. `private.capabilities` ↔ `CAP` — asserted by `npm run verify:capabilities`, **which needs a live database**.
2. `CAP` ↔ routes — asserted by `npm run build`, **which needs no credential**.
3. the map ↔ pages on disk — asserted by `node scripts/verify-routes.mjs`.

> **There is no CI in this repository.** `.github/` is absent and `package.json` carries no test or CI script. So link 1 runs only when a person runs it: it is a **written pre-deploy step, not an automation.** A deployer who assumes the Vercel build covers link 1 is assuming a check that does not exist.

The same three lines already sit at the top of `src/lib/routes/capability-routes.ts` (plan 34-01, `:33-53`), verified present rather than assumed — so the sentence is findable from either end. **`34-VERIFICATION.md` was NOT created here**: it is plan 34-17's declared artefact (`34-17-PLAN.md:9`), and the paragraph owed to it is handed over verbatim below.

---

## F3b — the proof, because the message never prints

`npm run verify:capabilities` is **5/5 green with zero warnings** today: all twelve catalogue keys have a caller, so the `if (problems.length)` branch at side 4 **does not execute**. The re-pointed message is latent source text. It cannot be confirmed by watching the output change.

### The mutation, and why it is not the one the plan named

The plan asked for *"a thirteenth capability key with no caller"*. **That mutation cannot reach the branch**, and saying so is part of the proof: side 4 iterates `dbKeys` — the rows of `private.capabilities` — so a key added only to `keys.ts` would trip sides 0 and 1 (a TS/DB count mismatch) and would never appear as an orphan. Producing a real thirteenth row means writing to the capability catalogue, which this phase's boundary forbids outright.

The equivalent mutation that does reach the branch is its mirror image: **remove a key's only caller.** `CAP.MEMBERSHIP_CARD_VIEW` at `capability-routes.ts:311` is the sole `src/` reference to `membership.card.view`, and no policy asks for it. Replacing the computed key with a plain string literal removes the `CAP.` reference and leaves the catalogue untouched. It also demonstrates F3(a) directly.

### Assert the mutation applied, before reading its result

```
$ git diff --stat src/lib/routes/capability-routes.ts
 src/lib/routes/capability-routes.ts | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
$ grep -n 'MUTATION 34-16' src/lib/routes/capability-routes.ts
311:  ["membership.card.view"]: { /* MUTATION 34-16 */
$ grep -rc 'CAP\.MEMBERSHIP_CARD_VIEW' src/ | grep -v ':0$' | wc -l
       0
```

### Then the result

```
  ! 4 · every catalogue key is asked for by a policy or by src/
      "membership.card.view" is in the catalogue but NEITHER a policy NOR src/ asks for it.
      WHAT THIS SIDE ASKS: does a policy body or a src/ call site ask for this key?
      WHAT IT DOES NOT ASK: is this key bound to a ROUTE? That question lives in
      src/lib/routes/capability-routes.ts — a total Record<CapabilityKey, …> since
      plan 34-01 — and it is asserted by `npm run build`, which needs no database
      credential. Do not read a green here as evidence of a route binding: the map
      is itself under src/, so binding a key MAKES it asked-for by this side
      (finding F3 in the docblock). This stays a WARNING because promoting it would
      make the production build depend on a live database (D-34-11/D-34-12), and
      because five of the twelve keys gate TABLES rather than routes — each with its
      reason written beside it in that same file.
```

`5/5 green, 1 warning(s)`, **exit 0**. Side 4 is still a warning: the mutation did not make the command fail.

### And assert the revert applied too

```
$ git diff --stat src/lib/routes/capability-routes.ts     # (empty)
$ grep -c 'MUTATION 34-16' src/lib/routes/capability-routes.ts
0
$ grep -n 'CAP\.MEMBERSHIP_CARD_VIEW' src/lib/routes/capability-routes.ts
311:  [CAP.MEMBERSHIP_CARD_VIEW]: {
$ git status --porcelain
 M scripts/verify-capabilities.mjs
```

Only this plan's own edit remained.

---

## `verify:capabilities` output, compared line by line against `34-02-SUMMARY.md`

Full post-phase output, exit **0**:

```
verify-capabilities — one capability set, five sides

  measured against: production (Management API, read_only)
      TS 12 · DB 12 · POLICY 7 (50 call sites in 72 policies) · SRC 12 (238 files walked) · GRANT 26 rows

  ✓ 0 · both declarations hold the pre-registered 12 keys
      12 in src/lib/capabilities/keys.ts, 12 in private.capabilities
  ✓ 1 · TS and DB name the same keys
      12 keys, both directions
  ✓ 2 · every key a policy asks for exists in the catalogue
      7 keys used by policies: catalogue.manage, door.operate, master.manage, membership.active, party.manage, register.read, staff.manage
  ✓ 3 · every key application code asks for exists in the catalogue
      12 keys used in src/: admin.access, catalogue.manage, door.operate, door.supervise, master.manage, media.upload, membership.active, membership.card.view, organizer.access, party.manage, register.read, staff.manage
  ✓ 4 · every catalogue key is asked for by a policy or by src/
      12 keys, all reached: 7 by policy, 12 by src/ — asked-for, NOT route-bound; routes are capability-routes.ts + `npm run build`
  ✓ 5 · every role holds exactly the declared set of capabilities
      26 grants and 22 refusals over 4 roles × 12 keys, both directions, 26 rows read

  measures:
    by policy : catalogue.manage, door.operate, master.manage, membership.active, party.manage, register.read, staff.manage
    by src/   : admin.access, catalogue.manage, door.operate, door.supervise, master.manage, media.upload, membership.active, membership.card.view, organizer.access, party.manage, register.read, staff.manage
    named only in comments (not counted as callers): door.operate, master.manage, media.upload, staff.manage

5/5 green, 0 warnings.
```

| Line | Pre-phase (`34-02-SUMMARY.md:110-139`) | Post-phase | Verdict |
|---|---|---|---|
| header | `SRC 12 (**249** files walked)` | `SRC 12 (**238** files walked)` | **differs — explained below** |
| header, all other counts | TS 12 · DB 12 · POLICY 7 (50/72) · GRANT 26 | identical | unchanged |
| side 0 | 12 / 12 | identical | unchanged |
| side 1 | 12 keys, both directions | identical | unchanged |
| side 2 | same 7 keys, same order | identical | unchanged |
| side 3 | same 12 keys, same order | identical | unchanged |
| side 4 | `12 keys, all reached: 7 by policy, 12 by src/` | same counts **+ the boundary clause this plan added** | changed **by this plan, deliberately** |
| side 5 | 26 grants, 22 refusals, 26 rows | identical | unchanged |
| measures block | three lines, same keys | identical | unchanged |
| exit | 5/5 green, 0 warnings | 5/5 green, 0 warnings | unchanged |

**Sides 1–3 and 5 are unchanged, key for key.** This phase edited no migration and no grant, so that is the expected reading rather than a success.

**The one difference is `249 → 238 files walked`, and it is not a finding.** That number is the count of files the `src/` walk visits, not a capability measurement. Eleven fewer files exist because waves 2–4 of this phase collapsed duplicated pages. It will drop further once plan 34-15 — running in parallel in this same wave — deletes what remains of `src/app/(organizer)/`, so a reader comparing against this record after the merge should expect a smaller number again and should not treat it as drift.

---

## Decisions Made

1. **Re-point, never delete.** Every mechanical criterion in this plan is also satisfied by deleting the calls: the script cannot see a call that is not there, the grep returns 0, the build passes. 22 calls were re-addressed and 7 pair-halves removed; no call was deleted to make a check green. The after-count with its per-file breakdown is the record that makes the two outcomes distinguishable.
2. **The four Finding-1 no-ops were re-pointed at the staff listings.** Allow-listing them would have hidden two true positives behind a comment; deleting them would have removed two refreshes that were merely mis-addressed. `/admin/artists` and `/admin/venues` are declared patterns and are the listings the mutation is performed from.
3. **A prefix change and nothing else.** The four drink-item calls in `admin/events/actions.ts` arguably want `/admin/events/[id]/drinks` rather than the events listing. That is a behaviour change, unverifiable in this repository, and outside a plan that touches one function argument at a time. `/organizer/events` → `/admin/events` preserves exactly the intent that was there.
4. **The mutation proof was inverted rather than skipped.** See F3b above: the plan's literal mutation cannot reach the branch, and forcing it to would mean writing to the capability catalogue.
5. **`34-VERIFICATION.md` was not created.** It is plan 34-17's artefact. Writing it here would have produced a second author for one file in a parallel wave.

## Deviations from Plan

**1. [Rule 3 — Blocking] Two files outside `files_modified` were edited**

- **Found during:** Task 1, after the six declared files were swept
- **Issue:** `verify-routes.mjs` still reported 4 offenders — the `/artists` and `/venues` calls, now living at `src/app/(admin)/admin/{artists,venues}/actions.ts` after wave 2/3 moved them. The plan's own success criterion (*exit 0*) is unreachable without them, and the plan explicitly forbids the two alternatives (allow-listing, and — by the floor criterion — deleting).
- **Fix:** `"/artists"` → `"/admin/artists"` (×2), `"/venues"` → `"/admin/venues"` (×2). Same one-argument discipline as the declared files; `git diff -U0` still contains no line outside a `revalidatePath` statement.
- **Cross-domain check:** `venue-secrecy.md` — `updateVenue` writes a venue address, so the change was checked for reveal advancement. It moves a refresh from an unserved address to a capability-gated staff one; no reveal is advanced and no monotone guard is loosened.
- **Neither file is touched by plan 34-15**, the sibling running in this wave (its `files_modified` are `(organizer)/organizer/page.tsx` and four persona files).
- **Committed in:** `3b90084`

**2. [Rule 3 — Blocking] The side-4 mutation was inverted**

- **Found during:** Task 2, F3b
- **Issue:** The plan's mutation — a thirteenth key with no caller — cannot reach side 4's warning branch, which iterates the database catalogue. Adding a key to `keys.ts` alone trips sides 0 and 1 instead; adding a real row means editing `private.capabilities`, which the phase boundary forbids.
- **Fix:** The mirror mutation — remove a key's only `src/` caller — which reaches the branch, touches no database, and demonstrates finding F3(a) at the same time. Mutation and revert both asserted applied before their results were read.
- **Committed in:** no code change; the artefact is the evidence above.

---

**Total deviations:** 2 auto-fixed (both Rule 3)
**Impact on plan:** No scope creep. No capability granted, revoked or re-scoped; no new key; no migration; no dependency; no test script; no test framework. `/admin/scanner` did not move and appears in no diff. `scripts/verify-routes.mjs` was not modified.

## Issues Encountered

- **The worktree had no `node_modules`.** `npm ci` restored the declared lockfile; `git diff package-lock.json` is empty and no package was added.
- **`verify:capabilities` needs a live database and there is no CI** — which is the whole point of D-34-12. The repository's gitignored `.env.local` was copied into the worktree to run link 1, and **deleted immediately afterwards**; `git check-ignore -v .env.local` confirmed `.gitignore:34` covers it, and `git status --porcelain` was empty of it before the SUMMARY was written. The script queries the Management API `read_only` and reads no `profiles` row.
- **No test framework was installed and none is proposed.** Nothing here is verified because tests pass; there are none.

## Verification Run

| Command | Result |
|---|---|
| `node scripts/verify-routes.mjs` | **exit 0** — both checks green, 47 literals read, 0 offenders |
| `` grep -rE 'revalidatePath\(\s*[`"]/organizer' src/ \| wc -l `` | **0** |
| `` grep -rE 'revalidatePath\(\s*[`"]/(admin\|organizer)' src/ \| wc -l `` | **33** (before: 36) |
| `git diff -U0 1343dbb..HEAD` lines outside a `revalidatePath` statement, in the 8 action files | **0** |
| `git diff --name-only 1343dbb..HEAD \| grep verify-routes` | **0** — the check was not weakened |
| `git diff --diff-filter=D --name-only 1343dbb..HEAD` | **empty** — no file deleted |
| `rm -rf .next && npm run build` | **exit 0**, `Compiled successfully` |
| `npm run verify:capabilities` | **exit 0**, 5/5 green, 0 warnings |
| `npm run verify:capabilities` (under mutation) | **exit 0**, 5/5 green, **1 warning** naming `membership.card.view` |
| `git status --porcelain` before this SUMMARY | empty |
| `STATE.md` / `ROADMAP.md` | **not touched** — the orchestrator owns those writes |

`npm run verify:persona` was **not** run: this plan modifies no file under `CLAUDE.md` or `.claude/`. Plan 34-15 owns the persona edit in this wave.

## Known Stubs

None. No placeholder, no TODO and no hardcoded empty value was introduced. The four `/artists` / `/venues` calls were no-ops before this plan and are not after it.

## What is NOT claimed

- **Not that every `revalidatePath` in this repository is correct.** `verify-routes.mjs` reads statically visible literals; a concatenated path and a variable argument are invisible to it, and its own docblock says so. The count of invisible arguments is currently **0**, so that blind spot is a number rather than an impression.
- **Not that any surface was observed refreshing.** There is no test runner for this product. The behavioural proof is procedure **M-8**, owed to plan 34-17, and it now carries three observations rather than one — see below.
- **Not that CAP-02's first link is automated.** It is not. See the chain above.

## Owed to plan 34-17

**M-8, three observations, because ten of the calls this plan fixed are on surfaces the original single members observation could never see:**

- **M-8a** — approve a `pending` account from `/admin/members` and observe the row move **without a manual reload**. This is the only observable proof that the surviving half of each of the six members pairs was the right half.
- **M-8b** — change a ticket tier from `/admin/events/[id]/tickets` and observe the surface refresh without a reload.
- **M-8c** — add or remove a guest-list entry from `/admin/events/[id]/guest-list` and observe the same.

**A named blind spot, not covered by implication:** the two calls in `admin/events/[id]/assignments/actions.ts` stay **unobserved**. A live per-night assignment cannot be produced on demand, and no procedure in this phase substitutes for one. Recorded as a gap rather than folded into M-8b.

**The paragraph owed to `34-VERIFICATION.md`, verbatim:**

> CAP-02 holds as a chain. `private.capabilities` ↔ `CAP` is asserted by `npm run verify:capabilities`, **which needs a live database**. `CAP` ↔ routes is asserted by `npm run build`, which needs no credential. The map ↔ the pages on disk is asserted by `node scripts/verify-routes.mjs`. **There is no CI in this repository** — `.github/` is absent and `package.json` carries no test or CI script — so the first and third links run only when a person runs them. They are **written pre-deploy steps, not automations**, and a deployer who assumes the Vercel build covers them is assuming a check that does not exist.

## Threat Flags

None. No network endpoint, no auth path, no schema change and no new file write was introduced. Every threat in the plan's register has a mechanism above:

| Threat | Mechanism |
|---|---|
| T-34-77 | `verify-routes.mjs` exit 0; seven pairs listed with their functions; M-8a owed to 34-17 |
| T-34-77b | The three template-literal files swept with a quote-agnostic criterion; M-8b and M-8c added; the two assignments calls recorded as a **named blind spot** |
| T-34-78 | Each pair verified in its enclosing function before either half was touched; before/after counts recorded per file |
| T-34-79 | `scripts/verify-routes.mjs` absent from the diff; side 4 still a warning, computation unchanged; `PUBLIC_ALLOW` not widened |
| T-34-80 | Finding F3 written into the docblock, with `membership.card.view` as the measured instance |
| T-34-81 | Stated, not solved: the first link is a written pre-deploy step, recorded in the docblock and handed to `34-VERIFICATION.md` |
| T-34-82 | `git diff -U0` contains no line outside a `revalidatePath` statement across all eight action files |
| T-34-SC | No package installed; `package-lock.json` unchanged |

## Self-Check: PASSED

- `.planning/phases/34-one-work-surface/34-16-SUMMARY.md` — this file
- Commit `3b90084` — present in `git log`, 8 files, 22 insertions / 29 deletions
- Commit `ccf9915` — present in `git log`, 1 file, 66 insertions / 11 deletions
- `scripts/verify-capabilities.mjs` — present, `node --check` clean, runs 5/5 green
- `scripts/verify-routes.mjs` — present, **unmodified**, exit 0
- `src/lib/routes/capability-routes.ts` — present, **unmodified** (mutation reverted, `git diff --stat` empty)
- `.env.local` — removed from the worktree
- `STATE.md` and `ROADMAP.md` — **not touched**

---
*Phase: 34-one-work-surface*
*Completed: 2026-08-10*
