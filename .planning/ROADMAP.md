# Roadmap: Resonate

## Completed Milestones

- [x] **v1.0** -- Trust-gated music events community: RBAC, referral/approval, SumUp ticketing, event media, branded emails (7 phases, 22 plans, 45 requirements) -- [archive](.planning/milestones/v1.0-ROADMAP.md)
- [x] **v1.1** -- SumUp embedded checkout + drink ordering system: embedded payments, drink menu CRUD, token redemption with anti-fraud, public QR menu for guests (5 phases, 9 plans, 18 requirements) -- [archive](.planning/milestones/v1.1-ROADMAP.md)
- [x] **v1.2** -- SumUp API deep integration: official SDK, admin finance dashboard, refunds, APMs (Satispay/MyBank/Apple Pay/Google Pay), menu closing + auto-refund (7 phases, 12 plans, 33 requirements) -- [archive](.planning/milestones/v1.2-ROADMAP.md)
- [x] **v1.3** -- Refinement & Intelligence: analytics (PostHog + Recharts dashboards), layout elegance (motion, skeletons, toast), guest list management, discount codes, navigation consolidation (9 phases, 19 plans, 60 requirements) -- [archive](.planning/milestones/v1.3-ROADMAP.md)
- [x] **v1.4** -- Check-in Overhaul: party selection, continuous QR scanner with flash/haptic, offline support, membership door check-in (2 phases, 5 plans, 16 requirements) -- [archive](.planning/milestones/v1.4-ROADMAP.md)

---

# Milestone v1.5 — Platform Layout, Access Model & Door Fixes

## Overview

v1.5 rebuilds four things that today sit on top of each other badly: the defects
live at the door and the bar right now, the permission model, the duplicated
work surfaces, and the visual system. The order is not a preference — it is the
whole plan. The live defects go first because they exist regardless of this
milestone and because one of them (an attendee-cache refresh that reverts an
unsynced check-in) turns from a rare race into the normal case the moment live
updates are switched on. Then the capability model is defined **in the
database**, once, so that a page, a server action and a row-level policy all ask
the same question of the same definition; the server data-access layer is built
on top of it and header trust ends there; the fourth role and account creation
land next, then per-night assignments, and **only then** do the duplicated route
trees collapse into one — so the collapse is built once, against four roles and
assignments that already exist, rather than once for three roles and again
afterwards. The format model and the design conversion follow the collapse for
the same reason. The door is never bundled with the routing work: a redirect
needs a network the door is designed not to need, so its address moves in a step
of its own, verified on a device with the network off. The design track runs
last, and the scanner is the last surface it touches — a visual regression there
is a safety issue, not a cosmetic one.

**A fifth thing was added on 2026-08-11:** the production material stops living
outside the product. The calendar, and then each production section under its own
entitlement, come inside (44, 45). They run **after** the visual track and not
before it, for the reason phase 41 states about itself — a surface converts whole
or not at all, and the production section is the largest set of new surfaces in
the project. Building it before the token layer and the shared primitives exist
would create the biggest half-converted surface in the product and force 41 and
42 to reopen every screen just written.

**Milestone numbering continues from v1.4:** phases run 31 → 45. Phase 43 was
added on 2026-08-06, after 34 and 35 had already been numbered and cited; it
executes between 33 and 35, not at the end. Phases **44 and 45 were added on
2026-08-11** (owner decision) and execute **after 42** — they carry PROD-01 and
PROD-02, promoted out of Future Requirements once the capability model (32) and
the format model (36) had both shipped, which were the only stated reasons they
were deferred. See the note below.

## Phases

**Phase Numbering:**

- Integer phases (31, 32, 33): Planned milestone work
- Decimal phases (32.1, 32.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

> **This list is in execution order, and execution order is NOT numerically
> ascending. That is deliberate.**
>
> **A phase number is an identity, not a position.** Phase 43 was added on
> 2026-08-06, when 34 and 35 were already numbered and already cited by twelve
> committed documents — citations that bind requirement IDs to phase numbers
> (*"Phase 34's CAP-02"*), one of them inside the closed verification record of a
> completed phase. Renumbering would make a closed record false, and a record is
> corrected only when it was wrong when written, never to match a decision taken
> afterwards. So the numbers stay fixed and **order is expressed by position in
> this list and by `Depends on`** — nowhere else.
>
> **Why the order moved (owner decision, 2026-08-06):** phase 34 collapses the
> admin and organizer trees into one capability-driven surface. Building it
> before the fourth role and before per-night assignments exist would mean
> building it once for three roles, and again for four roles plus assignments.
>
> Execution order: **33 → 43 → 35 → 34 → 36 → 37 → …**

- [x] **Phase 31: Live Defects at the Door and the Bar** - Correct the nine defects present in production today, before anything is built on top of them (completed 2026-08-06)
- [x] **Phase 32: Capability Model in the Database** - One definition of every permission, evaluated identically by pages, actions and row-level policies (completed 2026-08-06)
- [x] **Phase 33: Server Data-Access Layer** - Identity and capability resolved from the session in one server-only place; no surface trusts a request header (completed 2026-08-07)
- [x] **Phase 43: Role Model & Account Creation** - The fourth role grants entry and nothing else; master and organizer create accounts, and every act that changes who someone is is recorded with its author (executed 2026-08-08 — **verification `human_needed`: nothing deployed, 16/16 manual checks pending**, see `43-VERIFICATION.md`)
- [x] **Phase 35: Per-Night Assignments** - What a person can do on one night is granted for that night alone, separate from role and separate from public credit (completed 2026-08-09)
- [x] **Phase 34: One Work Surface** - The duplicated admin and organizer trees become a single capability-driven surface; the door is deliberately untouched (completed 2026-08-10)
- [x] **Phase 36: Formats & Series Numbering** - Each night carries its format and stored series number; the events surface filters to one format (completed 2026-08-10)
- [x] **Phase 37: Manual Venue Reveal** - The scheduled reveal stays the normal path, with a confirmed and recorded manual path for master and organizer (executed 2026-08-11 — NOT deployed, NOT verified; the anonymous address read is still open in production by owner decision)
- [ ] **Phase 38: Live Attendance Freshness** - The attendee list updates by itself while the network is there, and never stands between a scan and its verdict
- [ ] **Phase 39: The Door's Own Address** - The door moves to its permanent address in a step of its own, verified with the network off — *code executed 2026-08-11, four plans, all automated gates green; **not complete**: `39-VERIFICATION.md` is `human_needed` and criteria 2 and 3 close only at the end-of-v1.5 sitting (D-39-07), same night as Phase 38*
- [~] **Phase 40: Brand Tokens & Typography** - Colour, surface, line and type come from one token set, released whole (5/5 plans executed 2026-08-11 — **verification `human_needed`**, not complete: DS-10 and DS-06's home-screen half are proven only by `40-RELEASE-PASS.md` H1/H3, every `Result: pending`, in the end-of-v1.5 sitting. Scheduled is not verified.)
- [~] **Phase 41: Shared Primitives & Three-Tier Layout** - The shared layer is built and proven on its first eight whole surfaces (30/30 plans executed — **verification `human_needed`** at round 6, 2026-08-14, **0 gaps**: the reintroduction guard that held this phase at `gaps_found` for five consecutive rounds was closed by a LATER phase, 41.1-01's shared comment stripper, and re-derived three independent ways. Score stays 5/10 and the composition is the point — FAILED truths 1 → 0; what remains is seven human observations, H41-1…H41-7, unchanged since round 1, in the end-of-v1.5 sitting. **None of the seven requirements closes here**; RESP-01 closes only after 41.2)
- [~] **Phase 41.1: Work-Surface Conversion** - The 21 remaining work pages convert onto the layer, the work-surface gates stop being ratchets, and the three knots the work surface reaches — the event form, the refunds, the venue reveal — are taken on their own in the last wave (25/25 plans executed 2026-08-13, 16/16 gates green — **verification `human_needed`**, not complete: `41.1-VERIFICATION.md` verifies 5/5 success criteria in their mechanical half with 0 gaps, and leaves six human observations owed in the end-of-v1.5 sitting, one of them Critical — that the reveal confirmation's focus visibly lands on Cancel. **None of the five requirements closes here**; RESP-01 closes only in 41.2. The box was `[x]` from 2026-08-13 to 2026-08-14, ticked by `roadmap.update-plan-progress` when the last SUMMARY landed, while no verification document existed at all — the same failure recorded for Phase 39, corrected the same way)
- [~] **Phase 41.2: Public, Member and Money Surfaces** - The public and member surfaces convert, the bar is taken on its own, and the public event page — where money and the address genuinely meet — is taken on its own after it (22 plans in 9 waves executed 2026-08-14 — **verification `human_needed`**, 3/4 success criteria verified in their mechanical half, **0 gaps**. All four ratchets read **0** and the gates are absolutes; 38 surfaces declared with check F accounting for all 41 `page.tsx`; check E's pairing 12 = 12 in both directions. **Criterion 4 does not close and cannot: RESP-01 closes only by the written human pass**, `41.2-RESP-01-PASS.md`, 57 rows, every `Result: pending`. **RESP-03's criterion 5 is partly false by declared decision** — two controls sit below the 44px floor on purpose, because the floor would make the token-reverting tap easier to hit at a counter; exemptions D-41.2-06/07 and gate exemptions 9/10 carry their own reasons, and the gate prints them. Nine silent failures on the money path are recorded and unrepaired — five of them found during execution, none seen by the research)
- [~] **Phase 46: Silent Failures on the Money Path** - A failure on a path that carries money produces an effect somebody can see (7 plans in 2 waves executed 2026-08-14 — **verification `human_needed`**, 12/12 code truths confirmed against the tree, **0 gaps**. **The manual pass was DECLINED by the owner on 2026-08-14** — `46-UAT.md`, 1 skipped and 5 declined, none run. Do not read the `human_needed` status as *awaiting a pass*: it is awaiting a pass nobody intends to make. **So the mechanical half is verified and the half this phase exists for is not** — no test runner, no error tracking, and those six procedures were the only evidence that would ever exist that a failure now produces an effect a person can *see*. A green build proves a refusal category cannot exist without a sentence; it does not prove the sentence reaches a screen. The owner's grounds are recorded in `46-UAT.md` and are not unreasonable — the setup cost is high against a risk measured at zero on a past public edition. Two of the six need only DevTools at a live night, if it is ever reopened. *This phase had no checklist line until now: it was added to the details section on 2026-08-14 and never listed here.* **The perimeter is narrower than the roadmap section below**, by owner decision D-46-11 at discuss-phase — the members area is under review for removal, which took `DI-41.2-01`, `-07`, `-09`…`-12` and `-20` out of scope, and D-46-09 took the guest refund refusal with them. **Consequently success criterion 3 and the RSVP half of criterion 2 are knowingly unmet and cannot be met here** — their code is under review for deletion. `OBS-05` was therefore not created; `OBS-02`, `OBS-03`, `OBS-04` were. Three accepted risks are declared, not discovered: the advisory pre-check inside `purchaseTicket` **stays permissive** because the real guard is `reserve_ticket`, which locks the tier row and fails closed (D-46-05); **the window where a guest pays and the database then refuses stays silent** until the deferred seat-reservation phase (D-46-07); and no bar-side order lookup was built (D-46-10c). Two findings arrived after planning and are repaired: the refund cron's delete count was wrong in **two** ways, not one — `.delete()` returns `count === null` even on success without `{ count: "exact" }` — and `GuestTokenDisplay`'s poll bound sat inside the `try` after both early returns, so against a permanently failing endpoint it was **never evaluated** and the poll ran forever)
- [ ] **Phase 42: Scanner Conversion** - The scanner takes the visual system last, with its behaviour untouched — *eseguita 2026-08-18, NON completa: `roadmap.update-plan-progress` l'ha marcata `[x]` all'atterraggio del dodicesimo SUMMARY, `phase.complete` non e' mai stato lanciato. Corretta a `[ ]` con la ragione accanto, come gia' per la fase 39: il criterio 3 e' permanentemente non chiudibile (DEF-42-04) e nove procedure di `42-PROCEDURES.md` sono `pending`. Una spunta su una fase la cui unica prova mancante e' quella che conta e' il fallimento silenzioso che questo repo si e' scritto di non ripetere.*
- [~] **Phase 44: The Production Calendar Comes Inside** - The calendar stops living outside the product; it is imported into the database and never through the repository (13/13 plans executed 2026-08-15 in 7 waves — **verification `human_needed`**, not complete: all five success criteria have structural evidence and **0 gaps**, and four of them are BUILT rather than PROVEN. `44-PROCEDURES.md` carries P1–P4 with every `Result: pending`. **Criterion 4 cannot be closed by any tool in this repository**: nothing here authenticates as a role, and the Management API connects with a role that bypasses RLS — the read-back proves the six policies EXIST, never that they REFUSE, so P1 with real accounts is the first refusal evidence this project will ever have. **The calendar's content is NOT imported**: `production_plan` and `production_piece` hold 0 rows and `production_pipeline_rule` holds 16 — loading confidential material into production is the owner's act, and the authorisation spent in this phase covered the two migrations only. A third migration, `20260815120200`, closes a defect this phase introduced and applied: the tick function was EXECUTE-able by `anon` and `authenticated` because the access migration wrote the GRANT without the REVOKE; measured ACL now `{postgres, service_role}`. The box was `[x]` for a few minutes on 2026-08-15, ticked by `roadmap.update-plan-progress` when the last SUMMARY landed and before verification ran — the same failure recorded for Phase 39 and Phase 41.1, corrected the same way)
- [ ] **Phase 45: Production Sections, Section by Section** - Each production section is entitled separately, because they do not carry the same risk (18/18 plans executed 2026-08-18; **verification `gaps_found` — not complete**, see 45-VERIFICATION.md)

## Phase Details

*Sections below are in execution order, matching the checklist above.*

## v1.5 — Platform Layout, Access Model & Door Fixes · ARCHIVIATA 2026-08-19

18 fasi · 261 piani · **archiviata con debito dichiarato, non `passed`**: 14 requisiti su 76 chiusi, 88 voci `human_needed`, e il criterio 3 della fase 42 permanentemente non chiudibile (`DEF-42-04`). Dettaglio in [`milestones/v1.5-ROADMAP.md`](milestones/v1.5-ROADMAP.md) · audit in [`v1.5-MILESTONE-AUDIT.md`](v1.5-MILESTONE-AUDIT.md) · sedute di laboratorio in [`v1.5-LAB-SITTING.md`](v1.5-LAB-SITTING.md).

*`Executed*` = tutti i piani hanno un SUMMARY su disco, **non** che la fase sia deployata o verificata. Per la 37: il ramo e' 219 commit avanti a `origin/main`, la seconda migration e' applicata a zero, e undici voci `human_needed` restano aperte (`37-13-SUMMARY.md`).

## Decisions Fixed Before Planning

These were decided by the project owner and are not re-opened at plan time:

| Decision | Applies to |
|---|---|
| Live freshness uses a **push channel**, not polling — with a mandatory full reload on every reconnection and an infrequent safety reload underneath | Phase 38 |
| Undoing a check-in requires a **supervising capability**; a person assigned to the door for one night cannot undo unless they are also an organizer | Phase 35 |
| The venue reveal stays scheduled **plus** a manual path for master and organizer, behind confirmation and recorded | Phase 37 |
| A staff role **implies `approved`, enforced by the database** — and the baseline harness keeps the ability to seed the four personas that rule forbids | Phase 43 |
| `door.operate` keeps `requires_approved = false`; it is not redundant with the constraint above and is not removed as tidying | Phase 43 |
| **Phase numbers are identity, not position.** No phase is renumbered to match an ordering decision taken after it was cited | All phases |
| The interface stays **English only** — no translation work in this milestone | All phases |

## Ordering Constraints

Not preferences — each one has a failure mode behind it.

- **Live defects first.** They exist in production today and are independent of the new architecture. The attendee-cache merge fix (FIX-05, FIX-06) must land before Phase 38: the live channel's whole purpose is to run that refresh constantly, which turns a rare race into the normal case.
- **Database before application.** The capability definition (32) exists before the data-access layer (33) calls it, before the role model (43) adds a fourth role to it, before assignment policies (35) reuse it, before the route map (34) maps to it, and before the channel authorisation (38) reuses it a third time. One definition, several callers, only works if the definition comes first.
- **The role model and assignments before the route collapse.** Phase 34 renders one surface from what the viewer is entitled to. Built before the fourth role (43) and before per-night assignments (35) exist, it would be built once for three roles and again for four roles plus assignments — the same "build it twice" cost the collapse exists to remove, relocated rather than avoided.
- **Route collapse before formats and design.** Otherwise each is built twice, once per duplicated tree — the exact cost the collapse exists to remove.
- **The door is not part of routing.** Its address moves in Phase 39, alone, because a redirect needs a network the door is designed not to need.
- **The scanner is converted last** (42), and only after the door's behavioural corrections (31, 39) have shipped and been used at a real night.

### Phase 44: The Production Calendar Comes Inside

**Goal**: The production calendar stops living outside the product. A night's format, series number, venue state and editorial anchors are readable in the app by the people entitled to them — imported from the local material into the database, and never through the repository.
**Depends on**: Phase 32 (capability model), Phase 36 (format model and series numbering), Phase 41 (shared primitives, so the surface lands in the finished visual system rather than being converted afterwards)
**Requirements**: PROD-01
**Success Criteria** (what must be TRUE):

  1. A night is readable in the product carrying its format, its series number, its venue state and its editorial anchors — nobody opens a document outside the app to know what is on
  2. The material reaches the database **without passing through the repository**: no venue under negotiation, no unannounced date and no line-up appears in a migration, a seed, a fixture, a test or a planning document
  3. A night's editorial pieces are **derived** from its date and format rather than typed in, using the **weekday** rules measured on the real calendar on 2026-08-15 and recorded in `.claude/rules/production-calendar.md` (persona 1.14.0) — satellites: listing Tue, tonight Thu, recap Mon, LiveCut Mon; SunSet: listing Tue, LiveCut Mon+Tue; the night: timetable on the night itself, LiveCut Tue/Wed/Thu of the **next** night's week, after movie the Mon before the next edition's listing. **The anchors are weekdays, not day-offsets** — the night falls Friday *or* Saturday, so a stored offset turns one rule into two and flags a correct night as an error. *(This criterion previously read "listing at −2 … timetable at −1 … podcast cover at +4"; every one of those figures was wrong against the calendar, and the piece is called LiveCut, not podcast. Corrected rather than deleted so the change is visible.)*
  4. The calendar is reachable only by someone the capability model admits, and the middleware, the page guard and the row-level policy ask the same question of the same definition
  5. Moving a night recomputes everything downstream of it, and a series progressivo is appended, never renumbered

**Plans**: 13 plans, in 7 waves

Plans:
**Wave 1**

- [x] 44-01-PLAN.md — The pure `.ics` reader: the literal source, RFC 5545 unfolding, and a nesting parser that constructs no `Date`
- [x] 44-02-PLAN.md — The structural migration: six tables, the `ics_alias` column, and the published pipeline stored as weekday and anchor — zero rows of production material

**Wave 2** *(blocked on Wave 1)*

- [x] 44-03-PLAN.md — The classifier and the anchor resolver: four classes, three grammars, and three refusals that stay three
- [x] 44-04-PLAN.md — The fourteenth capability key, six SELECT policies, the number-refusing trigger and the author-recording tick *(owner checkpoint: `requires_approved`)*
- [x] 44-05-PLAN.md — The presentation layer: the date renderer that cannot render a bare date, the stage badge that cannot disappear, the commitment row that cannot draw a format

**Wave 3** *(blocked on Wave 2)*

- [x] 44-06-PLAN.md — The reconciler: a plan of writes, returned and never applied, keyed on `UID`, generating no number
- [x] 44-07-PLAN.md — **[BLOCKING]** Apply both migrations through the Management API migrations endpoint, read back from the catalogues, prove nothing moved *(owner checkpoint: production write)*

**Wave 4** *(blocked on Wave 3)*

- [x] 44-08-PLAN.md — The golden-file check that makes the hand parser defensible, with a mutation proof per assertion
- [x] 44-09-PLAN.md — S1: the map entry, the chronological archive, and the last import's effect at its foot

**Wave 5** *(blocked on Wave 4)*

- [x] 44-10-PLAN.md — The local import runner, the dry run, the real import, and the second run that must change nothing *(owner checkpoint: the dry run)*
- [x] 44-11-PLAN.md — S2: one night, its pieces through the five-variant date renderer, and its checklist

**Wave 6** *(blocked on Wave 5)*

- [x] 44-12-PLAN.md — The two writes: the checklist tick, and the announcement that is the single bridge to `event_parties` *(owner checkpoints: the venue on an unacquired space, and the confirmation's wording)*

**Wave 7** *(blocked on Wave 6)*

- [x] 44-13-PLAN.md — The tab, the ten surface assertions as a command, and the four procedures no command in this repository can settle

**UI hint**: yes

### Phase 45: Production Sections, Section by Section

**Goal**: Each production section is entitled separately, because they do not carry the same risk — scouting holds open negotiations, the visual system holds nothing secret. Holding one section grants no other.
**Depends on**: Phase 44
**Requirements**: PROD-02
**Success Criteria** (what must be TRUE):

  1. Entitlement is **per section**, not per role: a viewer holding one section is refused the others, and the refusal comes from the row-level policy — not from the navigation hiding a link
  2. A space in the scouting section carries its stage — mapped, verified, contacted, acquired — and a stage that is not `acquired` is visible as such wherever the space is named
  3. A section whose content is not yet written **declares the emptiness** instead of filling it, and no surface implies a decision the owner has not taken
  4. Every section's read path is proven refused by a session that lacks its capability, exercised with a real role rather than a service key

**Plans**: 18 plans, in 9 waves

Plans:
**Wave 1**

- [x] 45-01-PLAN.md — The vocabularies, the two structural migrations and the five row types
- [x] 45-02-PLAN.md — The instrument that authenticates as a real role, and its first authorised run
- [x] 45-03-PLAN.md — The naming decision, and the key split as two migrations around one deploy

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 45-04-PLAN.md — The read arms for the five new tables, and the private archive bucket
- [x] 45-05-PLAN.md — The declarations: four keys, four bindings, the calendar moved off the old string
- [x] 45-06-PLAN.md — The two source gates, the reachability census, and 45-PROCEDURES.md
- [x] 45-07-PLAN.md — Scores computed never stored, the shared stage badge, the two cells

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 45-08-PLAN.md — **[BLOCKING]** Apply the five additive migrations, read back from the catalogues, leave the old key granted

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 45-09-PLAN.md — **[BLOCKING]** Retire `production.read` once the deploy is live
- [x] 45-10-PLAN.md — The seed: the desk archive at stage `mapped`, re-runnable, under its own authorisation
- [x] 45-11-PLAN.md — The location surfaces, and the binding that moves with them

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 45-12-PLAN.md — The manifesto and visual surfaces, the three states, and the palette read at runtime
- [x] 45-13-PLAN.md — The location writes: the gate first, the refusals named, two fields in every log

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 45-14-PLAN.md — The promotion act: the one crossing into `venues`, and the confirmation that says so
- [x] 45-15-PLAN.md — The manifesto and visual writes, and the form that takes no state decision

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 45-16-PLAN.md — The export: two documents, declared tables, and a closure walk that proves the rest unreachable

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 45-17-PLAN.md — The dj photo archive, on the upload path that already strips

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 45-18-PLAN.md — The four tabs, the full sweep, and the four things only a person can see

**UI hint**: yes

### Phase 46: Silent Failures on the Money Path

**Goal**: A failure on a path that carries money produces an effect somebody can see. Today nine of them produce a confident, well-formatted, wrong statement instead — and this repository has **no error tracking**, so none of them reaches a human by itself.

**Depends on**: nothing structural. **Runs BEFORE Phase 42** — the numbering is sequential because *a progressivo assigned is never renumbered*, and this roadmap already decouples number from order (33 → 43 → 35 → 34 → 36 → …).
**Requirements**: OBS-02, OBS-03, OBS-04 — **created by this phase** in `.planning/REQUIREMENTS.md` under a new `### Observable Failure on the Money Path` heading (plan 46-01). `OBS-05` was proposed by the research and is **not** created: it covered `DI-41.2-09`, which left the perimeter with D-46-11.

> **Why this phase exists and why it is not a bug list.** All nine were found by Phase 41.2 and are recorded, with `file:line` and consequence, in that phase's `deferred-items.md` **Group M**. Four came from research before any conversion; **five were found during execution and the research never saw them**. Every one was deliberately **recorded and not repaired**, because repairing them is *new copy on a money path* or *a payload change* — stop condition 2 — and a visual conversion is not where the product decides what someone is told when their money does something unexpected.
>
> **They are not nine catches that say the wrong thing.** Two have no handler at all; one coalesces a failed count to a legitimate value; one writes a value and never reads it. They are **four different ways to produce a confident, well-formatted, wrong statement** — which is worse than a blank screen, because a blank screen is distrusted.

**Success Criteria** (what must be TRUE):

  1. Every one of the nine has an **observable effect** — visible to the person affected, or to staff, or as a measurable consequence in the data. `meta-gates.md` is explicit that with no error tracking, *logging the error is not sufficient*: the log is a place nobody looks
  2. A refusal that has **distinguishable causes says which one**, wherever the next step differs. The recorded cases include five RSVP refusals arriving as one opaque sentence, and a refund refusal whose third cause is the only one where the right advice is *wait*
  3. **The one that charges the wrong amount is fixed first**: a discount applied before signing up is written into the saved purchase intent and never read back, so a returning guest **pays full price with no refusal and no trace**. It is the only one of the nine that takes money that was not owed
  4. **The monotone guards are untouched.** A payment reaching completion still corrects forward; nothing makes an amount that was taken look like it was not; no reveal becomes reachable earlier
  5. Each fix is proved by an **observable outcome**, not by a log line — and where the outcome can only be seen by a person, it goes in a written procedure with its `Result: pending`, because there is still no test runner

**Plans:** 7/7 plans complete

Plans:
**Wave 1**

- [x] 46-01-PLAN.md — the three requirements, and every sentence this phase ships, approved in one pass (blocking checkpoint)
- [x] 46-02-PLAN.md — the one refusal shape, and a comment on the accidental fallback that must survive

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 46-03-PLAN.md — the three permissive reads inside `purchaseTicket` say which failure they had (F-46-01, DI-TODO-A)
- [x] 46-04-PLAN.md — the organizer's menu-closing command gets two distinguishable outcomes (DI-41.2-06, -06b)
- [x] 46-05-PLAN.md — what a guest sees when the browser cannot hold their receipt (DI-41.2-02, -03, -04)
- [x] 46-06-PLAN.md — the public event page stops printing counts it could not read (DI-41.2-08) — Critical, owner in the loop
- [x] 46-07-PLAN.md — the refund cron tells the truth and terminates as failed (DI-TODO-B)

**UI hint**: partial — several fixes are copy a person reads, which is a product decision before it is a visual one

> **Two success criteria above are NOT met by this phase, and it is written here rather than discovered at verification.** Criterion 3 — the one that charges the wrong amount (`DI-41.2-09`) — and criterion 2's *"five RSVP refusals"* (`DI-41.2-20`) both live in code that D-46-11 put under review for deletion, together with `DI-41.2-01`, `-07`, `-09` … `-12` and `DEF-41.2-A`. The perimeter this phase was planned against is `46-CONTEXT.md` `<domain>`, which is narrower than the nine. If the members area survives that decision, those items return as their own phase.
>
> **And one risk is accepted rather than closed** (D-46-07): the window in which a guest pays and no ticket is issued stays silent. The fix is an architecture change — hold the seat before payment — and it is the deferred phase that runs immediately after this one.

> **The nine, by identifier**, in `41.2-deferred-items.md` Group M: `DI-41.2-01` … `DI-41.2-04` (research), `DI-41.2-06` … `DI-41.2-09` (execution), `DEF-41.2-A` (the refund refusal). `DI-41.2-10` … `DI-41.2-12` are adjacent intent-handling cases found alongside them and should be scoped in or out deliberately, not by accident.

---
*Last updated: 2026-08-14 — Phase 46 added (silent failures on the money path), to run BEFORE Phase 42. Execution order stays decoupled from numbering: 33 → 43 → 35 → 34 → 36 → … → 41.2 → 46 → 42 → 44 → 45, with no phase renumbered*
