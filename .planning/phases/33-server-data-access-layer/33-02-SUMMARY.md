---
phase: 33
plan: 02
subsystem: verification-instruments
tags: [cap-05, instruments, header-identity, forged-header-probe, wave-1]
requires: []
provides:
  - "I3 — npm run verify:no-header-identity, the CAP-05 criterion-1 burn-down meter"
  - "I4 — scripts/probe-forged-identity.sh, the CAP-05 criterion-2 procedure with its positive control"
  - "the pre-conversion census figure the whole phase is measured against: 98 lines / 45 files"
affects:
  - "every conversion plan in waves 2-3, which is now measurable rather than assertable"
  - "plan 33-12 (runs I4's live positive control)"
  - "plan 33-14 (I3 must reach 0; the census is its gate)"
tech-stack:
  added: []
  patterns:
    - "instrument written BEFORE the change it measures, so it is not shaped by the change"
    - "an empty or unreachable measurement REFUSES (exit 2) instead of returning a verdict"
    - "each failure names its own cause; no generic 'check failed'"
key-files:
  created:
    - scripts/verify-no-header-identity.mjs
    - scripts/probe-forged-identity.sh
  modified:
    - package.json
decisions:
  - "I3 counts comment lines toward its verdict, deliberately: the only comment parser available (WR-07) is unsound, and over-counting is the fail-safe direction for a burn-down meter"
  - "The pre-conversion LIVE probe run is recorded NOT EXECUTED, with its reason, rather than substituted by a number from elsewhere"
metrics:
  duration: ~50 min
  tasks: 2
  files_changed: 3
  completed: 2026-08-07
---

# Phase 33 Plan 02: Verification Instruments Summary

Built I3 and I4 — the two instruments CAP-05's criteria depend on — before a
single conversion, so the phase can be judged by a measurement instead of a
claim. Both were proved by mutation, with the mutation asserted applied through
the instrument's own reader before any result was read.

## What was built

| ID | Artefact | Verdict today | Why it is worth anything |
|---|---|---|---|
| **I3** | `scripts/verify-no-header-identity.mjs`, `npm run verify:no-header-identity` | **exit 1**, 98 lines / 45 files | Proved to catch an upper-case reader a case-sensitive check scores 0 on; proved its green state is reachable; proved it refuses rather than greens when it cannot measure |
| **I4** | `scripts/probe-forged-identity.sh` (executable, `sh -n` silent) | usage/refusal paths exercised; live run **not executed** — see below | Proved to FIRE against a simulated removed strip, which also proves it really sends the forged headers |

## The pre-conversion reference — the number waves 2–3 burn down

Measured on this worktree at base commit `0b3b8f7`:

```
npm run verify:no-header-identity     →  exit 1
                                         98 line(s) across 45 file(s)
                                         97 in code, 1 comment-shaped
                                         230 files scanned under src/
                                         exempt: src/lib/supabase/middleware.ts

grep -rni 'x-user-' src/ | grep -v 'src/lib/supabase/middleware.ts' | wc -l
                                      →  98
```

The instrument and the independent census agree exactly, and the census carries
`-i` as `33-VALIDATION.md:80` requires — an "independent" cross-check weaker than
the instrument it audits is not a cross-check. The single comment-shaped line is
`src/types/database.ts:389`, matching the figure recorded in `33-VALIDATION.md:97`.

**At the phase gate this must read 0.** It is expected to exit 1 until plan
33-14 lands, and it is deliberately not wired into `npm run build`.

## Mutation proofs — the mutation asserted applied FIRST, through the instrument's own reader

### I3, proof 1 — it fires, and its case-insensitivity is load-bearing

1. `src/__probe_header.ts` created with one line: `const r = h.get("X-USER-ROLE");`
   — upper-case on purpose.
2. **Mutation asserted applied, before any verdict was read**, using the
   instrument's own exported reader rather than a second grep:
   `listScannableFiles()` reported the file in the walked set (`true`) and
   `findHeaderLines('src/__probe_header.ts')` returned exactly one hit. Also
   confirmed by `git status --porcelain` → `?? src/__probe_header.ts`.
3. Verdict then read: **98 → 99 lines, 45 → 46 files**, with the new path listed.
4. The point of the upper case: `grep -rn 'x-user-' src/__probe_header.ts | wc -l`
   returns **0**. A lower-case-only check would have missed this reader entirely
   — which is the exact shape of the D-32-C incident.
5. Removed; reader re-queried → `false`; verdict back to **98 / 45**, exit 1;
   `git status --porcelain` clean.

### I3, proof 2 — the green state is REACHABLE, and the refusals fire

Defect class 5 from phase 32 was a check that could not PASS. I3 was run end to
end against a synthetic tree (one clean file, one `src/lib/supabase/middleware.ts`
containing `x-user-`):

| State | Result |
|---|---|
| clean tree, exempt file holds the header | **exit 0**, green, exemption not reported |
| exempt file deleted (the `middleware` → `proxy` rename) | **exit 2**, refusal naming the path |
| `src/` absent | **exit 2**, refusal |

### I3, proof 3 — a silent green found and fixed while proving the above

**The reachability run initially printed nothing and exited 0.** Diagnosed, not
waved through: `/tmp` is a symlink to `private/tmp` on macOS, so
`resolve(process.argv[1])` and `fileURLToPath(import.meta.url)` disagreed, the
`invokedDirectly` guard evaluated false, and the script loaded its exports,
asserted nothing and **exited 0**. A passing gate that never ran is the worst
failure mode this repository records. Fixed by comparing `realpathSync` on both
sides (`scripts/verify-no-header-identity.mjs`, the `realOrSelf` guard). Re-run
through the same symlinked path: prints and exits 0 correctly.

### I4 — proved to fire, against a simulated middleware

The plan forbids running the live positive control here (wave 1 has converted
nothing; the *after* answer is what matters, and it belongs to 33-12). What was
proved instead is the **instrument**, against a throwaway local HTTP server that
renders `Add Item` only when `x-user-role: master` arrives:

| Simulated state | Expected | Observed |
|---|---|---|
| strip intact — header never reaches the render | pass | **exit 0**, `Add Item` 0 / 0 |
| strip removed — `canManage` decided from the forged header | **must fire** | **exit 1**, `Add Item` anon **0**, forged **1** |
| affordance rendered to anonymous too | distinct failure | **exit 1**, the "not the way this probe was aimed at" branch |
| slug unpublished → 404 | refuse | **exit 2** |
| server not listening | refuse | **exit 2** |

The second row proves something a live green never could: the probe **really
sends the forged headers**, because the simulated server keys on them. It
excludes the "probe forgot the header, therefore always green" class outright.

Also exercised: no arguments → exit 2 + usage; one argument → exit 2 naming the
count; unknown flag → exit 2; `--positive-control` → exit 0, 62 lines, mutating
nothing; server-action mode against a page hosting no action → says so and
explicitly does not touch the page-mode verdict.

## The live pre-conversion probe run: NOT EXECUTED, and why

`33-VALIDATION.md` sign-off style, and `32-VERIFICATION.md`'s precedent —
**deferred is not verified, and a deliberate false beats an unearned true.**

- This worktree has **no `.env.local`** (only `.env.local.example`), so the app
  cannot reach Supabase and `(public)/events/[slug]/menu` cannot render.
- A pre-existing `node` process holds port **3007** and answers **500** on both
  `/` and `/events`. It is not this plan's server and was not restarted or killed.
- Ports **3000** and **3002** are held by Docker, as `33-RESEARCH.md:1280` records.

The probe was pointed at that live port anyway, and the correct thing happened —
this is the real-server evidence of the guard, not a substitute for the run:

```
REFUSED: the page did not answer 200 (anonymous 500, forged 500).
500 — the SERVER errored before rendering. Nothing here says anything about headers.
      - the app has no environment (no .env.local: no Supabase URL or key)
      - a stale .next after a worktree merge — 'rm -rf .next' first
      - the port belongs to some OTHER process that is not this app
exit 2
```

**No number was invented and none was borrowed.** The pre-conversion *live*
reference that stands is the one already MEASURED and recorded in
`33-RESEARCH.md:538-541` (strip commented out → `Add Item` forged 1 / anon 0;
restored → 0 / 0). Plan 33-12 owns the run that produces the *after* half.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The direct-invocation guard was defeated by a symlinked path**
- **Found during:** Task 1, while proving the green state reachable
- **Issue:** The `invokedDirectly` idiom copied from `verify-capabilities.mjs:624`
  compares a `resolve()`d path against a symlink-resolved one. Under any
  symlinked path the script exits **0** having printed nothing and asserted
  nothing — a silent green from a check that never ran.
- **Fix:** `realpathSync` on both sides, wrapped so an unresolvable path cannot
  throw inside the guard. The incident is written into the file comment so the
  next reader does not re-introduce it.
- **Files modified:** `scripts/verify-no-header-identity.mjs`
- **Commit:** `5992959`

**2. [Rule 2 — Missing critical behaviour] I4's non-200 refusal explained only 404**
- **Found during:** Task 2, when the live attempt returned **500** and the
  message talked about published slugs.
- **Issue:** One message for several distinct causes is the newsletter-form
  anti-pattern this codebase already records (`meta-gates.md`, zero silent
  failures). A 500 caused by a missing environment reads as "your slug is wrong".
- **Fix:** The refusal branches on the status class — 404, 5xx, 3xx, other — and
  the 5xx branch names the three real causes in order of likelihood plus the
  `lsof` command to check what is actually listening. The 3xx branch says
  explicitly not to follow the redirect to make a number appear, because that is
  the insensitivity defect this phase has recorded three times.
- **Files modified:** `scripts/probe-forged-identity.sh`
- **Commit:** `082a2d1`

### Deliberate divergences from the plan text, each with its reason

**3. I3 counts comment lines toward its verdict.**
The global execution constraint asks for every text search to be
*comment-filtered*; the plan forbids the only comment parser in the repository
(WR-07: a regex literal containing a quote defeats it, and one exists at
`src/app/(auth)/register/page.tsx:13`) and pre-registers the expected count as
**98**, which includes the stale comment at `src/types/database.ts:389`. Writing
a second parser would re-import the defect it was rejected for. Resolution:
comments are counted, the choice and its consequence are stated in the file
comment, and each hit is *labelled* `code` or `comment?` by a heuristic that is
**presentational only and never touches the verdict** — so a mislabel costs a
reader one glance and costs the assertion nothing. The error direction is the
safe one: the meter can only demand more deletion, never less, so it cannot pass
a tree that still reads the header.

**4. `splitCodeAndComments` is named in I3's file comment.**
Task 1's `<done>` says the script contains "no reference to
`splitCodeAndComments`"; threat T-33-08's mitigation says "the parser is named
and excluded in the file comment". The threat register is the more specific
requirement and removing the name would remove the recorded reason. The name
appears **once, in prose, in the file header**. There is no import, no call and
no executable dependency — verified: `grep -n 'splitCodeAndComments'` returns one
line, inside the comment block. Likewise `RegExp` appears once, in prose, saying
the match is done without one.

## Known Stubs

None. Both instruments are complete and were exercised on every branch they
have.

## Threat Flags

None. Neither script is imported by the application, neither opens a network
connection to anything but a host passed as an argument, neither reads an
environment variable, and neither writes inside the repository. No new endpoint,
auth path, file-access pattern or schema change.

Two secrecy notes, both applied: I4 forges the all-zero UUID rather than any
real member id, so a transcript of a run names nobody; and the base URL and slug
are arguments rather than constants, so no host of this project is written into
a public repository.

## Observations logged, NOT fixed (out of scope)

- **`scripts/verify-capabilities.mjs:624` carries the same symlink-defeated
  `invokedDirectly` comparison** that was fixed in deviation 1. It is not this
  plan's file and its current invocation path is not symlinked, so it does not
  misfire today. Recorded here rather than in the shared `deferred-items.md`,
  which this executor must not modify.
- **A stale `node` process on port 3007 answers 500.** Not this plan's process;
  left alone.

## Verification

| Claim | Evidence |
|---|---|
| `npm run verify:no-header-identity` exists and runs | `package.json:12`; `npm run verify:no-header-identity` → exit **1** |
| its count matches the independent census | **98** from the instrument, **98** from `grep -rni … \| wc -l` |
| it is literal-substring and case-insensitive | `scripts/verify-no-header-identity.mjs`, `HEADER_NEEDLE` + `raw.toLowerCase().includes(...)`; no `RegExp` over source text |
| it exempts exactly one path by exact equality | `EXEMPT_PATH` is a scalar `const`, compared with `!==`; printed on every run |
| it detects an upper-case reader a case-sensitive check misses | 98 → 99 with `X-USER-ROLE`; case-sensitive grep on that file → **0** |
| `probe-forged-identity.sh` is executable and syntactically valid | committed mode **100755**; `sh -n` silent |
| it prints usage and exits 2 with no arguments | observed, exit **2** |
| it asserts on an affordance, not bytes | `OBSERVABLE='Add Item'`; byte columns printed and labelled "CONTEXT ONLY" |
| it handles the server-action `Origin` requirement | `-H "Origin: ${BASE}"` in the action POST, with the 500-before-the-body mechanic in the comment above it |
| it carries the positive-control procedure with its assert-before-reading step | `--positive-control`, 62 lines, `git diff --stat` step, dev-server-only warning, restore-and-confirm |
| neither depends on `splitCodeAndComments` or any new package | one prose mention, no import; `package.json` dependencies untouched — only one `scripts` entry added |
| the build still typechecks | `rm -rf .next && npm run build` → exit **0** |
| the tree is clean after both mutation proofs | `git status --porcelain` empty |

**There is no test runner for the product and nothing here was verified because
"tests pass."** `CLAUDE.md` Guardrail 1 stands: nothing in this plan touches the
application, and the evidence above is mechanical output and observed exit codes.

## Self-Check: PASSED

- `scripts/verify-no-header-identity.mjs` — FOUND, 318 lines
- `scripts/probe-forged-identity.sh` — FOUND, 424 lines, mode 100755
- `package.json` — `verify:no-header-identity` present
- commit `5992959` — FOUND
- commit `082a2d1` — FOUND
- no modification to `STATE.md`, `ROADMAP.md`, `deferred-items.md`, or any file
  owned by plan 33-01 (`src/lib/capabilities/**`, the middleware, the migration)
