# Phase 34: One Work Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `34-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-08-09
**Phase:** 34-one-work-surface
**Areas discussed:** Canonical address, Page fusion, Shape of a refusal, Route↔capability map — plus the three matched todos

**How this session ran.** Four gray areas and three todo matches were put to the
owner. The owner delegated all of them — *"se sono cose da tecnico informatico,
expert persona decide basandosi su ricerca approfondita"* and *"expert persona
decide il lato tecnico informatico. non ne capisco niente io, fermami solo se
c'è un dubbio vero"*. Every decision below was therefore taken under delegated
technical discretion, and each one is anchored in a measurement taken against
the current code on 2026-08-09 rather than a preference. **No decision was
escalated back**, because none of the four turned out to be a product or
identity question in disguise — the one that came closest (naming the collapsed
prefix) resolved on a domain fact rather than taste.

---

## Canonical address

| Option | Description | Selected |
|--------|-------------|----------|
| `/admin` canonical, `/organizer/*` redirects into it | Fewest moved addresses; the door keeps its home | ✓ |
| `/organizer` canonical | Symmetric cost, but `/admin` becomes a shell with a scanner exclusion | |
| A neutral third prefix (`/staff`, `/manage`, `/backstage`) | Most honest naming; both trees move and both need redirects | |

**Decision:** `/admin`, with the prefix stripped of meaning and the route map
carrying the authorisation (D-34-01, D-34-02).

**Why the neutral prefix lost, and it nearly won.** It is the naming that
matches the phase's own thesis — the surface is not per-role — and `/admin` will
be reached by organizers, which the word does not describe. Two facts beat it:

1. **`/staff` is actively wrong**, not merely unnecessary. Since Phase 43,
   `staff` is a role that grants free entry and **no work permission** (D-01,
   D-03). Naming the work surface after it would say the opposite of what the
   role means, in the most quoted place in the product.
2. **The door.** `/admin/scanner` must not move until Phase 39. Any canonical
   choice other than `/admin` turns `/admin` into a redirect shell that has to
   exclude the scanner — recreating, in a second place, the precedence hazard
   that `middleware.ts:346-351` declares load-bearing. The measurement that
   settled it: the two prefixes are near-symmetric in cost (48 hardcoded
   `/admin…` references against 51 `/organizer…`), so nothing else broke the tie.

Recorded as a deferred idea, to be reconsidered in Phase 39 when the door leaves.

---

## Page fusion

| Option | Description | Selected |
|--------|-------------|----------|
| One file per surface, differences become capability branches | Divergence treated as drift, resolved by the capability model | ✓ |
| Keep distinct pages sharing components | Preserves both behaviours, preserves the duplication | |
| Union of both behaviours | Simple, and would silently widen what an organizer sees | |

**Decision:** one page per surface; a divergence is a defect until proved
otherwise, and the verdict comes from `private.role_capabilities`, never from
either page (D-34-05). A divergence may be resolved *towards more* only where an
existing grant already says so (D-34-06).

**What made this decidable rather than aesthetic:** diffing the two members
pages showed the organizer version lacks the account-creation form that Phase
43's D-20 explicitly permits, and lacks the way into the register that Phase 43
grants organizers. **Two of the "differences" are not requirements — they are
the drift this phase exists to remove.** That is also why the guard in D-34-06
had to be written in the same breath: the same reasoning, applied without a
brake, would widen access by calling every difference a defect.

---

## Shape of a refusal

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to dashboard with a named cause | Reuses the existing `?access=` channel and its three non-collapsing causes | ✓ |
| 404 — the page does not exist for you | Hides the back office's shape | |
| 403 with a dedicated page | Explicit, and a second refusal surface for Phase 41 to restyle | |

**Decision:** three states that never collapse — no session, capability missing,
could not resolve (D-34-08).

**Why 404 lost.** It is the tidier answer to *"refused, not rendered"*, and it
fails the project's own rule. With **no error tracking anywhere**, a 404 makes a
legitimate operator's refusal indistinguishable from a typo: the person cannot
tell what to ask for, and nobody is told either. The existing
`bounceToDashboard(cause)` already carries distinguishable causes on `?access=`
(`dashboard/page.tsx:39`) — inventing a second refusal surface would duplicate a
mechanism that works and hand Phase 41 two things to restyle instead of one.

**The third state is the one that matters and is easy to lose.** The DAL throws
`capabilities.resolve_failed: <code>` and must keep throwing: no `try/catch`
around a route guard may convert a resolution failure into a refusal. That is
the Phase 32 lesson restated — an infrastructure fault dressed as a permission
denial is a silent failure with an alibi.

---

## Route↔capability map and the CAP-02 build gate

| Option | Description | Selected |
|--------|-------------|----------|
| Total `Record<CapabilityKey, …>` checked by `next build` | No credentials at build time; reuses a proved pattern | ✓ |
| Promote `verify-capabilities.mjs` side 4 from warning to error | Reads the real catalogue — and makes the build need a database | |
| A separate prebuild script comparing map to catalogue | Same database dependency, one more moving part | |

**Decision:** the map is a pure data module with no `server-only`, importable by
the client navs; CAP-02 is enforced as a total `Record` over `CapabilityKey`,
with each key declaring either its routes or `scope: "table"` and a reason
(D-34-10, D-34-11). Side 4 stays a warning, re-pointed at the map (D-34-12).

**The fact that decided it:** `scripts/verify-capabilities.mjs:44` states that
**five of the twelve keys gate tables rather than routes** — which is why side 4
was written as a warning and why a naive "every key must have a route" gate
would be satisfied only by a lie. And side 4 reads `private.capabilities` over
the network: making it the build gate would make a Vercel production build
depend on a live database.

**The seam, stated rather than glossed.** CAP-02 says *a capability that exists
in the database*. The chain that delivers it is: database ↔ `CAP` asserted by
`npm run verify:capabilities`, `CAP` ↔ routes asserted by `next build`. **There
is no CI in this repository**, so the first link is a written pre-deploy step,
not an automation. Writing the gate without writing that sentence would have
produced a gate that looks stronger than it is — the failure mode
`ai-engineering.md` calls a decoration.

**Why the total `Record` and not something new:** `CAP_DESCRIPTIONS`
(`keys.ts:126`) is exactly this pattern, and it has already held four times in
this repository — when the ninth key landed, and again when the tenth, eleventh
and twelfth did. In a repository with no test runner, reusing a mechanism with a
track record beats inventing one with an argument.

---

## Todos

| Todo | Decision |
|------|----------|
| `register-read-unreachable-for-organizers.md` | **Folded.** Plan 43-14's executor deliberately did not loosen the middleware and wrote that the collapse belongs here. Closes by construction. |
| `postgrest-details-leaks-the-row.md` | Not folded — error hygiene across ~20 existing sites, not route collapse. Folding an unrelated sweep into a Critical access change is how a phase stops being reviewable. |
| `profiles-email-not-unique.md` | Not folded — schema work needing a production measurement first. Unrelated to the route trees. |

The folded one is worth its own line: **it is the phase's acceptance test in
miniature.** If the collapse is real, an organizer reaches the register without
anyone editing a permission. If closing it needs a grant touched, something was
special-cased instead of collapsed.

---

## Claude's Discretion

Everything above, by the owner's explicit delegation. Left further to research
and planning, each to be justified in the plan: the route map's pattern syntax
and dynamic-segment handling; sweep versus tranches and their order; how the
redirect table is expressed and verified; whether the two navs converge into
one; what a staff role sees of the members list and the takings within D-34-06;
whether `getVisibleNavItems` is replaced or re-expressed.

## Deferred Ideas

- A neutral third prefix — reconsider at Phase 39, when the door leaves `/admin`
  and the prefix no longer has to stay still for it.
- Retiring the `admin` vocabulary from headings and URLs — Phase 40/41.
- Capability-gating the public and member navigation — out of scope; those
  entries are not capability-gated.
