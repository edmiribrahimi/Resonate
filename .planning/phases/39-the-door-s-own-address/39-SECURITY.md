---
phase: 39-the-door-s-own-address
audited: 2026-08-11
asvs_level: 1
block_on: high
threats_total: 17
threats_closed: 16
threats_open: 0
threats_na: 1
accepted_risks: 2
status: secured
resolved: 2026-08-11
verdict: >
  All sixteen live threats now have a disposition. Fifteen are closed against the code as it
  stands after the code-review repairs. T-39-06 — the module-load throw in the middleware
  bundle — was found OPEN by the audit and is **ACCEPTED**: measured on this tree, Phase 39
  added zero module-load throws (2 before, 2 after in middleware.ts; 10 across the bundle
  both times) and touched zero files under src/app/api/. The class belongs to Phase 34
  (f59776b). Removing the throw would trade a loud failure on a quiet day for a silently
  wrong door on the night of a party, in a product with no error tracking. Blast radius named
  in the accepted-risks log; reduction tracked as a todo, on compiler-verified ground.
---

# Phase 39 — Security Audit

**Phase:** 39 — The Door's Own Address
**ASVS level:** 1
**Audited against:** `HEAD` = `5ab6b5e`, phase base `09fd5c0`
**Register:** 16 live threats + 1 `n/a`, authored across `39-01-PLAN.md` … `39-04-PLAN.md`

> **This audit verifies the register. It does not scan for new vulnerabilities**, and it does
> not accept a plan's prose as evidence of its own mitigation. Where the shipped mitigation
> differs from the one the plan described — five of them do, after the code review — the
> verdict below is taken against **the code as it stands**, and the difference is named.

---

## What counts as evidence here

This repository has **no test runner for the product** (no `test` script, no `*.test.*` or
`*.spec.*` outside `node_modules`). Nothing below is closed because "tests pass". The four
classes of evidence used are:

| Class | Instances in this audit |
|---|---|
| Source assertion at a named `file:line` | every CLOSED verdict |
| Build / script exit code, run by this audit | `npm run build` → **exit 0**, with `ƒ /door` and `ƒ /admin/scanner` in the route table; `npm run verify:routes` → **PASS** (26 pages, 25 patterns under `/admin`); `npm run verify:persona` → **7/7**, worst case 11 339 tokens against a ceiling of 12 000 |
| Mutation, run by this audit in a throwaway `git worktree` | two mutations of the door binding, below |
| A written procedure with a recorded observation | **none available yet** — every `Result` in `39-DOOR-PASS.md` reads `pending`, correctly (D-39-07) |

**Mutation evidence, reproduced independently by this audit** (isolated worktree, working
tree left clean, `git worktree list` back to one entry):

| Mutation applied to `capability-routes.ts` | `npx tsc --noEmit` |
|---|---|
| `routes: ["/admin/scanner", "/door"]` → `["/admin/scanner"]` | `src/lib/rbac/roles.ts(83,7): error TS2322: Type '"/door"' is not assignable to type '"/admin/scanner"'.` |
| `/door` moved out of `door.operate` and into `admin.access` | same error, same line |

That is the T-39-01 guard failing on the two edits it exists to catch, and naming its own
file. It is a **compile-time** fact, reproduced rather than quoted.

---

## Threat verification

| ID | Category | Disposition | Verdict | Evidence |
|---|---|---|---|---|
| T-39-01 | Elevation of Privilege | mitigate | **CLOSED** | Three layers, all three present. (a) one map entry opens both addresses — `src/lib/routes/capability-routes.ts:243-247`, `routes: ["/admin/scanner", "/door"]`, no second predicate. (b) module-load assertion over **both**, derived from the map — `src/lib/supabase/middleware.ts:195-218`; plus the fail-closed branch now reaching the door's tree — `middleware.ts:250-253`, `WORK_TREE_ROOTS = new Set(["admin","door"])`, consumed at `:599`. (c) one guard mounted by both addresses by construction — `src/app/(admin)/admin/scanner/DoorSurface.tsx:121-128`, mounted from `src/app/(admin)/door/page.tsx:23-25` and `src/app/(admin)/admin/scanner/page.tsx:16-18`, each of which is three lines with nothing in it to diverge. Compile-time half mutation-proven above |
| T-39-02 | Spoofing (of entitlement) | transfer (39-02) → mitigate (39-03) | **CLOSED** | Transfer documented in the 39-02 register and received in the 39-03 register — the seam is visible in both, not assumed. Mitigation shipped: the Check-in entry is filtered on the same key the server refuses on — `src/lib/rbac/roles.ts:227-234` (`capability: CAP.DOOR_OPERATE`, `roles: null`, `requireApproved: false`) and `roles.ts:352-361` (`heldByRole || heldByAssignment`, `null` refuses). Same predicate as `middleware.ts:577-579` and as the page guard at `DoorSurface.tsx:121-124`. Residual R2 below |
| T-39-03 | Information Disclosure (Cache Storage) | mitigate | **CLOSED** | The mitigation was *add no cache rule*, and none was added. `src/app/sw.ts` has **zero commits** in `09fd5c0..HEAD` and an empty diff; `public/manifest.json` and `next.config.ts` likewise. A scan of every added line under `src/`, `public/` and `next.config.ts` in the phase diff finds **two** lines mentioning cache and both are comments. Neither address is statically renderable: `npm run build` marks both `ƒ` (server-rendered on demand), so there is no rendered document for an install-time `cache.put` to capture |
| T-39-04 | Information Disclosure — **irreversible** | **accept** (T-37-27 unchanged) | **CONFIRMED NOT LOOSENED** | `git log 09fd5c0..HEAD -- src/app/sw.ts` → empty; `git diff --stat` → empty. The rule stands byte-identical at `src/app/sw.ts:110-113` (`sameOrigin && url.pathname.startsWith("/events/")` → `new NetworkOnly()`). Logged in the accepted-risks section below. Monotone guard: only harder-to-trip is permitted, and it is already at the hardest setting |
| T-39-05 | Denial of Service at the door | mitigate | **CLOSED** | Fence 1 reads the door's addresses from the map and matches on a **segment boundary** — `src/lib/routes/organizer-redirects.ts:191-218`. Both halves checked, as required: *(i) it can fire* — the reachable comparison is a `to` naming or nesting under `/admin/scanner`, and `startsWith(\`${address}/\`)` / `startsWith(\`${address}?\`)` restores the sub-address coverage equality had given up, without claiming `/administrators`; *(ii) the type really forbids what the comment says* — `RedirectRow` at `organizer-redirects.ts:74` types `from` as `` `/organizer${string}` `` and `to` as `` `/admin${string}` ``, so a `to` of `/door` and a `from` of either door address are compile errors, not rows the fence must catch. The comment's claim is accurate. Caveat C1 below |
| T-39-06 | Denial of Service | mitigate | **OPEN** | See *Open threats* below. Declared mitigation had two halves; half one is not what shipped, half two is a scheduling rule that has not been executed |
| T-39-07 | DoS / availability at the door | mitigate | **CLOSED** | `"/door"` is present in `protectedPrefixes` — `src/lib/supabase/middleware.ts:524-530` — and consumed on the unauthenticated branch at `:534`. A signed-out door phone is now bounced to sign-in instead of meeting the page guard and being sent to the dashboard. Residual R1 below: it is bounced, but its destination is still lost, and that is pre-existing |
| T-39-08 | Information Disclosure (public repo) | mitigate | **CLOSED** | Verified as a document, mechanically. Every line **added** to `.planning/`, `.claude/` and `CLAUDE.md` in `09fd5c0..HEAD` was scanned: 25 lines carry a date-shaped string and **every one is the engineering date of the work itself**; **zero** added lines name a venue, a line-up or a person; **zero** carry an email address or a social handle. `39-DOOR-PASS.md:18` states the rule in the document that most needed it, and its `accounts:` frontmatter names roles (`an account holding door.operate`, `an organizer account in status pending`). `npm run verify:persona` control **F** green: production material present and ignored |
| T-39-09 | Repudiation | mitigate | **CLOSED** | One record of record and one producer of observations, stated in both files and not left to memory: `38-PROCEDURES.md:22-27` and `39-DOOR-PASS.md:26-28` — *neither may declare an outcome the other does not*. Counted mechanically in the shipped document: **25 `Result:` lines, 25 read exactly `Result: pending`**, zero divergence; §9's results table has 26 rows and every one reads `pending`. Nothing is ticked that nobody earned |
| T-39-10 | Tampering (production rows) | mitigate | **CLOSED** | P6 excluded by name, with its reason, in three places: `39-DOOR-PASS.md:7` (frontmatter `excluded:`), `39-DOOR-PASS.md:485` (closing block), `38-PROCEDURES.md:28` and `:326`. The primary-key discipline is carried verbatim at `39-DOOR-PASS.md:502-511` — capture the key at creation, delete by that key, enumerate the cascade from `pg_constraint`, confirm from a different source — and the stop rule (*if a step needs to create a night or a guest-list entry, it has drifted into P6 and must stop*) is written above it |
| T-39-11 | Elevation of Privilege (nav mistaken for authorisation) | mitigate | **CLOSED** | The server-side guard is **unchanged by this phase**, proven by comparison rather than by assertion: the predicate and refusal at `DoorSurface.tsx:121-128` are byte-identical to the pre-phase original at `09fd5c0:src/app/(admin)/admin/scanner/page.tsx:92-99` (the file was extracted, not rewritten). `src/lib/door/`, `src/app/api/tickets/` and `src/app/api/membership/` appear **nowhere** in `git diff --name-only 09fd5c0..HEAD`, so `requireDoorOperator({ partyId })` — the real boundary on the door's data, which writes with the service client and meets no policy — is untouched |
| T-39-12 | Information Disclosure (public surfaces) | mitigate | **CLOSED** | For an anonymous visitor the serialised array is empty: `src/lib/capabilities/server.ts:289-295`, `ANONYMOUS_CONTEXT` carries `new Set<CapabilityKey>()` and an empty live-assignment set, and the Check-in entry also carries `requireAuth: true` (`roles.ts:232`), so two independent clauses refuse. All 13 mount sites were read: each derives its props from **its own** `getAccessContext()` and passes `[...ctx.capabilities]` — the keys the viewer already holds. No capability **grant**, and no other subject's set, crosses the boundary anywhere |
| T-39-13 | Denial of Service at the door | mitigate | **CLOSED** | All 13 mount sites carry both new props, verified per file (14 `<MobileNav` matches across 13 files; the fourteenth is a prose mention inside `DoorSurface.tsx`'s docblock). Both props are **required, not defaulted** — `src/components/layout/MobileNav.tsx:43` and `:49`, no `?` — and `getVisibleNavItems` takes four required parameters (`roles.ts:302-307`), so a fourteenth mount that forgets is a build error naming the file. Atomicity holds: the threading landed in one commit (`4596cbe`) |
| T-39-14 | Elevation of Privilege (assistant, gate omitted) | mitigate | **CLOSED** | All three declarations present and in one commit (`c9ca794`): `.claude/rules/checkin-offline.md:10` (`"src/app/(admin)/door/**"` in `paths:`), `CLAUDE.md:232` (index row), `.claude/rules/meta-gates.md:63` (path-priority row, `checkin-offline` primary). `npm run verify:persona` controls **A**, **B** and **G** green, run by this audit |
| T-39-15 | Tampering (routing table drifts) | mitigate | **CLOSED** | Control **G** covers the new row and is green: `26 righe verificate contro i frontmatter` (25 before). The table is no longer a second index nobody verifies — the declared primary is asserted to load on the files the row owns |
| T-39-16 | DoS of instruction (budget) | mitigate | **CLOSED against the current numbers, not the plan's** | The plan cited a margin of 805; persona 1.11.1 changed that. Re-measured by this audit: worst case `src/app/(public)/events/EventTabs.tsx` at **40 822 bytes ≈ 11 339 tokens, margin 661**; the door candidate `src/app/(admin)/door/page.tsx` at **40 587 bytes ≈ 11 274 tokens, margin 726** (recomputed independently with the script's own 3.6 B/token ratio). The ceiling was **not raised**: `scripts/verify-persona.mjs:62`, `BUDGET_CEILING_TOKENS = 12000`, and the script is not in the phase diff |
| T-39-SC | Tampering (supply chain) | n/a | **CONFIRMED n/a** | `git diff --stat 09fd5c0..HEAD -- package.json package-lock.json` is empty. No dependency, no lockfile change. The Package Legitimacy Gate does not apply, and that is a fact about the phase rather than a skipped step |

---

## Open threats

**None.** T-39-06 was the only one and was disposed as ACCEPTED on 2026-08-11 —
see the accepted-risks log. The audit's finding is kept verbatim below, because a
finding rewritten after its disposition stops being evidence of what was found.

### T-39-06 — the module-load throw in the middleware bundle · DoS · **found OPEN by the audit, then ACCEPTED**

**What was declared.** Two halves: *(i)* "the assertion lands in the **same commit** as the
map edit, so they cannot be deployed apart", and *(ii)* the deploy rule, written into the
source comment and into `39-DOOR-PASS.md` §0.6.

**What shipped.**

- **Half (i) is not what happened.** `/door` entered the map in **`e39123d`**
  (`git log -S'"/door"' -- src/lib/routes/capability-routes.ts` → one commit); the assertion
  loop entered the middleware in **`f6971ee`** (`git log -S'DOOR_ADDRESSES' --
  src/lib/supabase/middleware.ts` → one commit). Two different commits.
  **The realised risk is nil and the reason is the order, not the plan**: the map edit landed
  *first*, so no intermediate commit asserts an address the map does not carry, and `f6971ee`
  has `e39123d` as an ancestor. But the mitigation as written is not present, and a mitigation
  that reads as satisfied while resting on an accident is exactly what this audit exists to
  surface.
- **Half (ii) is present as text and unexecuted as a fact.** The rule is at
  `src/lib/supabase/middleware.ts:179-186` and at `39-DOOR-PASS.md:123-135`. Its
  `Result:` reads **`pending`**. The deploy has not happened.

**Blast radius, re-measured and unchanged by `00fcdd4`.** `src/middleware.ts:93-97` excludes
only static assets, so a throw at `middleware.ts:200-217` is a 500 on `/api/webhooks/sumup`
(the money path), on the four `/api/cron/*` jobs, and on `/api/tickets/checkin` — **the
door's own scan path**. Deriving `DOOR_ADDRESSES` from the map removed the hand-copy drift
and covers a third address for free; it did not narrow what a wrong map costs.

**Is a procedure an adequate mitigation for this? Plainly: no.** A scheduling rule does not
reduce the blast radius by one route; it changes **who discovers it** — and that is worth
having, because in a product with no error tracking the alternative discoverer is the person
at the door. But it is a mitigation of *consequence-to-the-night*, not of *consequence-to-the
-system*, and it depends on a human remembering it on a day nobody is watching. Two
properties make it thinner than it reads:

1. **It is not the only first-request throw.** Fence 1 in `organizer-redirects.ts:202-218`
   and fences 2 and 3 below it are module-load throws in a module `src/middleware.ts`
   imports, so they share the same trigger and the same radius (caveat C1).
2. **Nothing observes the deploy.** There is no CI (D-34-12) and no monitoring, so a deploy
   that skips §0.6 leaves no trace that it skipped it.

**Recommended disposition — not a code change.** Either execute §0.6 and record its two
timestamps, closing this by observation; or re-dispose T-39-06 as an **accepted** risk with
the blast radius named, so that "mitigated" stops meaning "a document says to be careful".
The one code-shaped option worth someone's judgement — moving the assertion out of the
middleware bundle to a place whose failure is not a site-wide 500 — is out of scope for this
phase and is **raised, not taken**.

---

## Accepted risks log

### T-39-06 · the module-load throw in the middleware bundle · DoS · **ACCEPTED 2026-08-11**

**Disposition changed from `mitigate` to `accept` after this audit, by the expert persona
under the owner's standing delegation.** The audit was right that the declared mitigation is
not what shipped. It was wrong about whose risk this is, and the measurement is the reason.

**Measured on this tree, 2026-08-11:**

| | before Phase 39 (`09fd5c0`) | now |
|---|---|---|
| `throw new Error` at module scope in `src/lib/supabase/middleware.ts` | **2** | **2** |
| module-load throws reachable from the middleware bundle | 10, across 5 files | 10, across 5 files |
| files under `src/app/api/` touched by Phase 39 | — | **0** |

**Phase 39 added no throw.** It widened one existing assertion from one address to two. The
class was introduced deliberately by Phase 34 (`f59776b`, 2026-08-09) and documented there as
measured. Blocking Phase 39 on it would be charging this phase for a decision taken two
phases ago, while leaving the other nine throws untouched.

**The blast radius, named rather than softened.** If the map is wrong, the first request
after deploy throws while the middleware bundle instantiates, and the middleware covers
**every** matched route — `/api/webhooks/sumup`, the four cron endpoints, and
`/api/tickets/checkin` among them. A door misconfiguration takes down the money path. That
coupling is real, nobody chose it, and it exists through the shared bundle, not through any
edit this phase made.

**Why removing the throw would be worse, and this is the whole argument.** There is no error
tracking in this product (`meta-gates.md`): a failure with no observable effect reaches
nobody. Drop the assertion and a wrong map becomes a **silently wrong door** — a person
refused at the entrance, at two in the morning, in front of a queue, with nothing in any log
that anyone reads. `checkin-offline.md` sets the asymmetry: refusing a valid guest is the
expensive error. A loud total failure on a day nobody is working is a worse *blast radius*
and a better *failure mode* than a quiet wrong answer on the night of a party.

**What reduces the exposure, and what does not.** `39-DOOR-PASS.md` §0.6 — deploy on a day
with no night scheduled, make the first request yourself — is a **reduction of exposure, not
a mitigation**: it does not narrow the radius by one route, it changes who discovers it. It
is recorded as such. Its `Result` reads `pending` because the deploy has not happened, and
that is honest rather than incomplete.

**Detection before it can fire**, which is why the residual probability is low: `npm run
build` (typecheck), `npm run verify:routes` (on-disk route census, PASS), and — since
`9f64e81` — a compile-time type constraint in `roles.ts` derived from the map, mutation-proven
twice. Three layers stand between a wrong map and a deploy. None is CI (D-34-12).

**Standing conditions on this acceptance:**

1. It covers the **existing** class. Any *new* module-load throw added to a middleware-reachable
   module is a new decision and does not inherit this acceptance.
2. The deploy rule is not optional while this stands. §0.6 is executed and its timestamps
   recorded on the first deploy that carries this phase.
3. The reduction is tracked, not forgotten — see the todo below. An accepted risk that nobody
   writes down again is an ignored one.

**Reduction opened as a todo, on verified ground.** Two of the assertion's three concerns are
now provable at compile time, and this was checked with the compiler rather than assumed:
`DOOR_ADDRESSES` derives from `CAPABILITY_ROUTES[CAP.DOOR_OPERATE].routes` (`middleware.ts:195`),
so *"these addresses are bound to `door.operate`"* is true **by construction**; and
`assignmentOpenable` carries the literal type `true` under `as const satisfies`, so a type-level
assertion holds it. Only **resolver shadowing** — another entry whose pattern also matches —
genuinely needs runtime. Moving the provable parts to the type level shrinks the class across
all ten throws rather than one. Not done here: it is a change to a Critical file for a phase
whose code is already executed and whose remaining blocker is a dark room.

---

### T-39-04 · `/events/**` is `NetworkOnly` · irreversible · ACCEPTED (inherited, T-37-27)

A venue address served from a stale cached copy on a handed-over staff phone has **no
rollback**. The resolution taken in phase 37 was to remove `/events/**` from Cache Storage
entirely. The collateral is deliberate: `/events/<slug>/menu` loses its cached copy too, and
a day-old drinks page is its own hazard.

**This audit's only job here was to confirm the rule was not loosened, and it was not.**
Zero commits, empty diff, rule intact at `src/app/sw.ts:110-113`. The plausible path to
breaking it ran straight through this phase — *discover that no document is precached, reach
for a broader page-caching rule* — and was not taken: the landmine is named in the plan, and
`39-DOOR-PASS.md`'s closing block re-states that no answer to the cache question may re-admit
`/events/**` to Cache Storage.

**Standing condition.** This acceptance is monotone. A future change may only make the rule
harder to trip. The open question about *how long a door document may live* (24 h, now a
chosen ceiling rather than an inherited default) must be answered without touching this rule.

---

## Residuals and caveats — none of these is a blocker

- **R1 · A signed-out door phone is bounced, but its destination is still dropped.**
  `middleware.ts:537` writes `?redirect=`; `src/app/(auth)/login/page.tsx:33` reads `?next=`.
  The names do not match (blocker D7, pre-existing, explicitly not repaired here). And even
  once they do, `/door` is **not on the allow-list** — `src/lib/routes/next-redirect.ts:82-87`
  lists `/dashboard`, `/set-password` and two event patterns only, and everything else falls
  back to `/dashboard` (`:136`). So the person working the door still signs in and arrives at
  the dashboard. Phase 39 did not cause this and did not worsen it; it is recorded because
  the door's availability is the security property in this domain, and two independent
  reasons now stand between a re-authenticated door phone and the door.
- **R2 · The Check-in tab is drawn wider than the real permission, in the safe direction.**
  `liveAssignmentCapabilities` does not name a night (`capabilities/server.ts`), so an account
  rostered to a *different* night is drawn the tab, admitted by the middleware and admitted by
  the page — and then does not find that night in the list. No refusal anywhere. This is the
  asymmetry `checkin-offline.md` optimises for and it is recorded in the code rather than
  absorbed (`roles.ts:198-215`). Related and also recorded in code: an organizer or master in
  status `rejected` holds `door.operate`, because the grant carries
  `requires_approved = false` and `has_capability` therefore never consults status. The
  navigation now **agrees** with the server there rather than diverging from it, and the row
  is unrepresentable in production under the `role_implies_approved` CHECK. Whether the grant
  itself should exclude `rejected` is a capability-model question — **raised, not decided
  here**, and it would be a Critical-class migration under `access-gating.md`.
- **C1 · Fence 1 shares T-39-06's trigger.** `organizer-redirects.ts` is imported by
  `src/middleware.ts`, and its throws are module-load throws. A fence firing is the same
  first-request 500 as a wrong map. The fence is correct; its failure mode is the open threat.
- **C2 · `protectedPrefixes` is a prefix test in the file that argues against prefix tests.**
  `middleware.ts:534` uses `startsWith`, so `/doorway`, `/doors` and `/door-policy` are
  claimed. No route collides today and the branch reads no capability — it only bounces an
  unauthenticated caller to sign-in — so the effect is nil. Logged as review finding IN-01,
  left open by the review as informational; this audit agrees it is not a security defect.
- **C3 · `39-VERIFICATION.md` cites the middleware as it stood before `00fcdd4`.** It
  describes `DOOR_ADDRESSES` as a hand-written `["/admin/scanner", "/door"] as const`; the
  shipped code derives it from the map (`middleware.ts:195`). The verification is *stale in
  one citation*, not wrong in its verdict. Noted so the next reader does not take that line as
  the current shape.

---

## Threat flags declared during implementation

| Plan | `## Threat Flags` | Mapping |
|---|---|---|
| 39-01 | present — **None**, with the public-repo boundary named and the date-count criterion cited | informational; consistent with T-39-08 as verified |
| 39-02 | present — **None**; states `sw.ts` was not opened and landmine 5 not taken | informational; independently confirmed (zero commits on `sw.ts`) |
| 39-03 | present — **None**; states that keys the viewer holds cross the client boundary, never a grant | informational; independently confirmed at all 13 mount sites |
| 39-04 | **ABSENT** — the summary has no `## Threat Flags` section at all | **WARNING, process** — see below |

### Unregistered flags

**None found.** The 39-04 summary omits the section, so this audit derived the answer instead
of accepting one: plan 39-04's three commits (`c9ca794`, `28f7acd`, `7534c26`) touch
`.claude/rules/checkin-offline.md`, `.claude/rules/meta-gates.md`, `CLAUDE.md`,
`.claude/CHANGELOG.md` and its own summary — **no file under `src/`**, no endpoint, no auth
path, no schema change. The correct answer was *None*; it simply was not written down. The
gap is in the record, not in the attack surface.

---

## What this audit could not verify, and will not pretend to

The phase is `human_needed`, and that is the correct state (D-39-07). Five things are
unverifiable from source and are **not** counted as closed anywhere above:

1. **That neither address answers with a 3xx on the wire** (§1.3). A redirect is a response,
   not a line of code. Both pages are three lines and call no `redirect(`, and the build
   marks both `ƒ` — that is as far as static reading goes.
2. **That a device with the radio off reaches a working door** at either address (§8.2-§8.4,
   §8.8), and what the warm-up reads in Cache Storage per address (§0.5). Nothing in this
   repository can hold a phone.
3. **That an organizer account in status `pending` is actually drawn the tab** (§1.5) — and
   that persona is unrepresentable in production under the `role_implies_approved` CHECK, so
   the reading can only happen in the seeded container.
4. **That the deploy followed §0.6.** This is T-39-06 and it is open.
5. **Every behavioural observation inherited from the six absorbed procedures** (§2-§7).

A mitigation whose only effect is a log entry is not observable in this product — there is no
error tracking — and none of the fifteen closures above rests on one.

---

*Audited: 2026-08-11 · Implementation files read-only throughout; the working tree was clean
before and after, and the mutation testing was performed in a throwaway worktree that has
been removed.*
