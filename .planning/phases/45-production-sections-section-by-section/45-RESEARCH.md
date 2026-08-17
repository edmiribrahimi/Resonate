# Phase 45: Production Sections, Section by Section — Research

**Researched:** 2026-08-17
**Domain:** capability model (a live key split), row-level security, in-app authoring of confidential production material, a session-authenticating verification instrument
**Confidence:** HIGH on everything measured against the tree and the live catalogue; MEDIUM on the seeding source of D-45-07, which is a **finding**, not a detail; MEDIUM on the shape of the three new sections' tables, which are a recommendation and not a measurement

---

## A note on this document, before anything else

`.planning/` is tracked and `github.com/edmiribrahimi/Resonate` is public. Everything
below is therefore a **publication**, and a publication is irreversible.

So: **criteria, never candidates.** No space under negotiation is named here, no
unannounced date, no line-up, no score, no contact. Where the scouting material had
to be characterised — for the seeding design of D-45-07 — it is characterised by
**shape**: file counts, extensions, directory layout, the *kind* of field a record
carries. Nothing from inside a record is written down.

`.firecrawl/` and `docs/` were inspected for **structure only**. `git check-ignore`
holds both (`.gitignore:67-68`), and check **F** of `npm run verify:persona` asserts
both that they are ignored and that nothing inside them is already tracked.

**Every claim about the codebase below was measured this session** — against the
tree, against `pg_catalog` through a `read_only: true` Management API query, or
against a command whose output is quoted. `.planning/codebase/` is dated 2026-02-24
and was not consulted (`ai-engineering.md`, *gate documentazione datata*).

**No production write was performed.** Five catalogue reads were issued with
`read_only: true` and are reproduced verbatim where they are used.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-45-01:** **Three sections** enter the product — sound manifesto, visual system,
  location. Legal and community stay outside.
- **D-45-02:** Entitlement is granted **to the role**, not to the person. Three keys,
  granted like the other fourteen.
- **D-45-03:** All three keys go to **master and organizer**. *The consequence is
  accepted:* with identical grants and two roles holding all of them, **no subject
  exists in production for whom criterion 1's refusal happens.** The criterion closes
  on structural evidence plus a written manual procedure with a hand-made account —
  never on a green build.
- **D-45-04 [BLOCKING — rewrites a live production access rule]:** The calendar becomes
  the **fourth section**. Today's single `production.read` is split into four section
  keys under one naming schema, and the six SELECT policies of
  `20260815120100_production_calendar_access.sql` are rewritten to ask the calendar's
  own section key. Constraints inherited: (1) **owner checkpoint before applying**;
  (2) **order is migration → deploy, never the reverse**; (3) **the grants do not
  narrow or widen**; (4) `capability-routes.ts`, `staff-tabs.ts` and
  `src/types/database.ts` move in the same commit as the migration.
- **D-45-05:** All three sections are **written inside the app**. D-45-17 is the
  mitigation and is not optional.
- **D-45-06:** **Whoever reads a section, writes it.** One key per section covers read
  and write.
- **D-45-07:** The location section **seeds once**, with a local script, from the
  scouting research that already exists locally — **all rows at stage `mapped`**.
  Constraints: its own owner checkpoint; re-runnable without duplicating; source files
  gitignored and staying that way; every seeded row lands at `mapped`.
- **D-45-08:** The visual section holds **the rules and the material together** — the
  capitolato beside the produced pieces, including the dj photo archive.
- **D-45-09 (Claude's discretion):** The visual section **reads the palette from the
  design tokens** in `src/app/globals.css`, and never restates hex values in prose or
  in a row.
- **D-45-10:** Scouted spaces live in a **production list separate from `venues`**. An
  **explicit act** promotes an `acquired` space into `venues`.
- **D-45-11:** A space carries its **stage**, the **four answers**, and **per-format
  scores** each marked **derived** or **field-verified**. Two mitigations must be
  built: the stage is visible wherever the space is named; derived and field-verified
  are distinguishable **on screen**.
- **D-45-12:** Moving a space to **`acquired` requires a mandatory line saying where
  the agreement is**. A pointer, not an attachment.
- **D-45-13:** **No space is ever deleted.** A space that leaves the race keeps its row
  and carries **why**, and when.
- **D-45-14:** A section carries **three states** — *written* / *coordinates declared*
  / *not decided* — and a not-decided section **says what is missing and whose call it
  is**.
- **D-45-15:** An open question **warns and lets you proceed** — it does not block.
- **D-45-16:** A format **without a palette declares the void and shows the interim
  rule**. `formats.color` is never drawn as if it were a palette.
- **D-45-17:** There **is** an export, **narrow by construction**: it cannot carry an
  address or an unannounced date **because it does not read those tables**. The
  narrowness must be structural and testable, and a plan proves it by showing what the
  export path cannot reach.
- **D-45-18:** The new write paths log `error.code` and `error.message`, **never** the
  whole error object and **never** `error.details`.
- **D-45-19:** This phase builds **the instrument that authenticates as a real role**
  and uses it to close success criterion 4. **Read-only**; credentials from the
  environment, never from a tracked file.

### Claude's Discretion

The owner's standing delegation from Phase 44 holds: **every technical checkpoint is
the expert persona's call**, with the constraint that anything touching access, money,
the door or venue secrecy returns to the owner before it is applied. D-45-09, D-45-18
and D-45-19 were taken under that delegation.

### Deferred Ideas (OUT OF SCOPE)

- The **legal and community sections** (D-45-01).
- A space's **regime** and its **acoustic/neighbour constraints** — offered as part of
  D-45-11 and **declined**. A planner must not add them back as "obviously useful".
- The **~20 existing `console.error("<category>", error)` sites** — D-45-18 binds this
  phase's own write paths only.
- Whether D-45-19's instrument **retires any of the outstanding `human_needed` items**
  in earlier phases — plausible, out of scope, and **must not be claimed**.
- A **per-person section grant** (rejected, D-45-02).
- A **differentiated grant** across the three sections (rejected, D-45-03).

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research support |
|----|-------------|------------------|
| **PROD-02** | Production sections are visible **per section** to the staff entitled to them, because the sections do not carry the same risk | §A gives the exact current state of the one key that exists and the safe sequence that turns it into four; §C gives the table shapes whose SELECT policies each ask a different section key; §B gives the instrument that proves a policy **refuses** rather than merely **exists**, which is the only thing that turns "per section" from a declaration into a fact |

**Success criteria, mapped to the sections of this document:**

| # | Criterion | Where answered | Closable how |
|---|-----------|----------------|--------------|
| 1 | Entitlement per section; refusal from the row-level policy, not the navigation | §A (keys), §C (policies), §F (why hiding a tab protects nothing) | **Structural evidence + a written manual procedure with a hand-made account.** D-45-03 removes the production subject; see §G1 |
| 2 | A scouting space carries its stage, and a non-`acquired` stage is visible wherever the space is named | §C2 (the CHECK vocabulary and the two mandatory columns), §F (StageBadge already exists) | Structural (constraint) + a person reading a screen |
| 3 | A section not yet written declares the emptiness instead of filling it | §C3 (the three-state marker and the pending-decision register) | Structural (NOT NULL state column, no default that means "written") + a person reading a screen |
| 4 | Every section's read path is proven refused by a session that lacks its capability, **with a real role rather than a service key** | §B — the whole of it | **The instrument.** This is the first refusal evidence this project will ever have |

</phase_requirements>

---

## Summary

Phase 45 is three additive sections and **one edit to something already live**. The
additive part is well-trodden: Phase 44 walked the whole binding — capability row,
grants, RLS, `capability-routes.ts`, `staff-tabs.ts`, a page under
`(admin)/admin/(work)/` — once, and left a legible trail. The one edit is the key
split of D-45-04, and it is the plan that has to be isolated, checkpointed and ordered.

Three things this research changes about the shape of the phase:

1. **The key split is far less dangerous than it reads, and the measurement says so.**
   All six `production_*` tables are **empty except `production_pipeline_rule` (16
   rows)** — the calendar import has never been run against production. And the split
   has a **zero-window sequence** nobody has written down yet: an *additive* migration
   that mints the four section keys, grants them to the same two roles, and rewrites
   the six policies to the calendar key **while leaving `production.read` granted**,
   followed by the deploy, followed by a small **retirement** migration. In that
   sequence there is no instant at which any entitled reader is refused anything. See
   §A4.

2. **D-45-19's instrument already exists on this machine, outside the repository, and
   it does not need a password.** `docs/36-13-v3/mint-session.mjs` (83 lines, Phase 36,
   owner-authorised 2026-08-10) mints a real user session via
   `auth.admin.generateLink({type:'magiclink'})` → `anon.auth.verifyOtp(...)`, and
   `docs/36-13-v3/revoke.mjs` revokes it globally and verifies the revocation. That is
   the mechanism; what is missing is the **assertion harness** around it. And the live
   subject exists today: `public.profiles` holds **1 master, 1 organizer, 2 members,
   all approved, and zero staff** — a member session genuinely lacks every production
   key. See §B.

3. **The refusal is an empty array, not an error, and on empty tables that is
   indistinguishable from nothing being there.** Measured: `anon` and `authenticated`
   both hold full `arwdDxtm` on all six `production_*` tables, so the privilege system
   never fires and PostgREST answers **200 with `[]`**. The only table that currently
   carries rows is `production_pipeline_rule` (16) — which makes it the **one usable
   probe subject today** and makes a **positive control mandatory**: without a session
   that *does* read rows on the same query, a green refusal proves nothing. See §B4.

Two collisions the planner must resolve rather than discover:

- **The capitolato needs hex values and `npm run verify:semantic-separation` forbids
  them.** Check B of that gate asserts that no file under `src/`, other than two
  exact-path exemptions, contains any hex declared in `globals.css`'s `:root`
  (`scripts/verify-semantic-separation.mjs:60-62`, `:197-203`). D-45-09 is therefore
  **already machine-enforced** — and it means the visual section's export must derive
  its hexes at runtime from the token file, never carry a literal. See §E3.
- **The scouting archive is not where the phase assumes it is.** `.firecrawl/` holds
  514 raw crawl artefacts (302 `.json`, 172 `.md`, 39 `.jpg`), not a normalised list of
  spaces. The normalised records live in an artifact HTML whose local source was a
  scratchpad path of a session that **no longer exists on this machine** (verified:
  `find /private/tmp/claude-501 -name "resonate-production*.html"` returns nothing).
  D-45-07 needs an owner-supplied export into `docs/`, on the D-44-04 ritual. See §C2.5.

**Primary recommendation:** split D-45-04 into **two migrations** (additive, then
retirement) around one deploy, isolate it in its own blocking plan, and build the
D-45-19 instrument **before** the split rather than after — it is the only thing that
can tell you the six policies still refuse the same people after the rewrite.

---

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|------------|--------------|----------------|-----------|
| Per-section entitlement (the boundary) | **Database (RLS)** | — | `CLAUDE.md` operating principle 2, and `capability-routes.ts:583-590` says it in its own words: the map decides where a *redirect* happens; it stops nobody reading a row |
| Per-section entitlement (the routing) | **Frontend server (middleware + page guard)** | Client (nav filter) | `src/lib/routes/capability-routes.ts` is the one declaration all three read |
| Section reads | **Frontend server (RSC, cookie-bound client)** | — | The calendar's precedent: `(work)/calendar/page.tsx:115` reads with `createClient()`, deliberately, because *a read that bypasses the policy proves nothing about the policy* |
| Section writes (D-45-05) | **Frontend server (Server Action)** | Database (service client) | Calendar precedent, `admin/calendar/actions.ts`: the action asks the capability, then constructs the service client |
| Seeding (D-45-07) | **Local script only** | — | D-44-26's reasoning applies unchanged to the seed: the material must not transit a Vercel function |
| Promotion to `venues` (D-45-10) | **Frontend server (Server Action)** | Database | Shaped on `announceNight`, `admin/calendar/actions.ts:598-932` |
| Export (D-45-17) | **Frontend server** | — | Narrowness is a property of *what the module imports and queries*; it can only be asserted against source |
| Refusal evidence (D-45-19) | **Local script, authenticating as a real role** | — | The Management API connects as a role that bypasses RLS; nothing in-tree can produce this evidence |
| Palette (D-45-09, D-45-16) | **Token layer (`globals.css`)** | Database (`formats.color`, and it is *not* a palette) | Already enforced by `verify:semantic-separation` checks B, C, E |

---

## A. The key split (D-45-04) — the only edit to something already live

### A1. The exact current state, measured

**In the tree** (`supabase/migrations/20260815120100_production_calendar_access.sql`):

| What | Lines |
|------|-------|
| The capability row, `ON CONFLICT (key) DO NOTHING` | `:76-81` |
| The two grants, `ON CONFLICT (role, capability) DO NOTHING` | `:83-115` |
| The declared refusals (`staff`, `member`, `anon`) as prose | `:117-138` |
| Six `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + six `DROP POLICY IF EXISTS` + six `CREATE POLICY` | `:176-251` |
| The paragraph declaring the absent write policies a decision | `:253-284` |
| `refuse_production_plan_renumber()` + its trigger | `:328-355` |
| `record_checklist_tick(uuid, boolean, uuid, text)` | `:442-538` |
| `GRANT EXECUTE … TO service_role` | `:567-568` |

**The ACL fix** is `20260815120200_production_checklist_tick_revoke.sql:48-52` — a
`REVOKE ALL … FROM public, anon, authenticated` before the `GRANT`, because *Postgres
grants EXECUTE to PUBLIC by default on every new function* and the access migration
cited only the GRANT half of `record_venue_reveal_act`'s pair. **Any new function this
phase adds inherits that lesson: REVOKE first, GRANT second, two statements.**

**In the live database** (Management API, `read_only: true`, 2026-08-17):

```
CAPS      admin.access · catalogue.manage · door.operate · door.supervise ·
          master.manage · media.upload · membership.active · membership.card.view ·
          organizer.access · party.manage · production.read · register.read ·
          staff.manage · venue.reveal                                    → 14 rows

GRANTS    {"role":"master",   "capability":"production.read","requires_approved":false}
          {"role":"organizer","capability":"production.read","requires_approved":false}

POLICIES  production_checklist_item_select_production_read   SELECT
          production_commitment_select_production_read       SELECT
          production_import_run_select_production_read       SELECT
          production_piece_select_production_read            SELECT
          production_pipeline_rule_select_production_read    SELECT
          production_plan_select_production_read             SELECT
          — every qual identical:
            ( SELECT private.has_capability('production.read'::text) AS has_capability)

ROWS      production_checklist_item 0 · production_commitment 0 ·
          production_import_run 0 · production_piece 0 · production_plan 0 ·
          production_pipeline_rule 16

ACL       all six: {postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres,
                    authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres}

MIGRATION HISTORY (tail)  20260815015048 · 20260815014107 · 20260815014103 ·
                          20260811111530 · 20260811001927 · …
```

Four things follow, and each changes a planning decision:

1. **The applied state matches the file byte for byte in substance.** The rewrite is
   against a known object, not a guessed one.
2. **The `(SELECT …)` wrapper survived into `pg_policies`.** The rewritten policies
   must keep it. It is not `STABLE` that makes the call once-per-statement — the
   InitPlan wrapper does, and `20260807000000_capability_model.sql:177-184` records
   that `EXPLAIN` disproved the older belief. 26 policies in this repository were
   written unwrapped on the strength of the wrong comment; six more were not.
3. **Five of the six tables are empty.** The split touches no rows. The one populated
   table is the one holding *no material at all* (§2f of the access migration: sixteen
   rows saying which pieces a format owes).
4. **`anon` and `authenticated` hold table-level `arwdDxtm`.** The refusal is 100%
   RLS. This is the single most important fact for §B.

### A2. Every code site that references the key

Measured with `/usr/bin/grep -rn "production\.read\|PRODUCTION_READ" --include='*.ts'
--include='*.tsx' --include='*.mjs' --include='*.sql' --include='*.sh' src scripts
supabase`. **22 hits outside `.planning/`**, in 9 files:

| File | Lines | What must change |
|------|-------|------------------|
| `src/lib/capabilities/keys.ts` | `:112`, `:209`, `:262` | The `CAP` member, the `CAP_DESCRIPTIONS` entry (a **total** `Record`, so the compiler catches a missing one), and the docblock explaining the fourteenth key |
| `src/lib/routes/capability-routes.ts` | `:159`, `:180`, `:594-596` | The binding; it is `as const satisfies Record<CapabilityKey, Binding>`, so **a new key with no entry is a build error** and a removed key leaves an unreachable entry that is also one |
| `src/lib/routes/staff-tabs.ts` | `:146`, `:151`, `:153` | The Calendar tab's `capability:`. The module-load loop at `:179-198` throws if the tab and the map disagree — during `next build`, since staff pages are prerendered |
| `src/app/(admin)/admin/calendar/actions.ts` | `:114`, `:120`, `:371` | `assertProductionRead()` and two log strings that name the key |
| `src/app/(admin)/admin/(work)/calendar/page.tsx` | `:42`, `:65`, `:111` | The page guard and two docblock references |
| `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx` | `:41`, `:60`, `:184` | Same |
| `src/app/(admin)/admin/(work)/calendar/loading.tsx` | `:12` | Docblock only |
| `src/app/(admin)/admin/(work)/calendar/[id]/loading.tsx` | `:12` | Docblock only |
| `scripts/verify-capabilities.mjs` | `:195`, `:318`, `:369`, `:470`, `:509`, `:523-527` | **The pre-registered expectation.** See A5 |

`src/types/database.ts` carries **no** occurrence of the string — it imports
`CapabilityKey` from `keys.ts` (`keys.ts:5-8` states the direction). D-45-04's
constraint 4 names it because the section tables are added there in the same commit,
not because the key lives there.

### A3. How `private.has_capability` resolves a key

`supabase/migrations/20260807000000_capability_model.sql:192-222`:

```sql
select exists (
  select 1
  from public.profiles p
  join private.role_capabilities rc on rc.role = p.role
  where p.id = (select auth.uid())
    and rc.capability = p_capability
    and (not rc.requires_approved or p.status = 'approved')
);
```

`LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`, `SET search_path = ''`, granted to
`authenticated` **and** `anon` (`:224`). Consequences that bear on the split:

- **A key with no grant row resolves `false` for everyone, including the master.** The
  resolver is an `EXISTS` over `private.role_capabilities` and knows no special case
  for a role. A migration that creates a key and forgets its grants closes a surface
  silently.
- **A key that does not exist at all resolves `false` too** — the join simply finds
  nothing. There is no error, no log line, and nothing in this product would report it.
  **This is why the ordering of D-45-04's constraint 2 matters and why §A4 removes the
  window entirely rather than shortening it.**
- **`p_party_id` is accepted and unused.** The per-night assignment arm is a second arm
  of the same OR, added by editing this body. This phase adds no arm — a section key is
  not one of the four a per-night assignment may carry
  (`20260809000000_party_assignments.sql:340-342`).

### A4. The safe sequence — additive, then deploy, then retirement

D-45-04's constraint 2 says *migration → deploy, never the reverse*, and gives the
reason: the reverse leaves `/admin/calendar` asking for a key that no longer exists.
**Both single-transaction orders have a window**, and the window is the same shape in
each:

| Order | The window | What a master sees during it |
|-------|-----------|------------------------------|
| One migration (mint 4, rewrite 6, delete `production.read`) → deploy | Between apply and deploy | Old code asks `production.read`; the key is gone; `has_capability` → `false`; the page guard redirects to `/dashboard`. **The calendar is down.** |
| Deploy → migration | Between deploy and apply | New code asks four keys that do not exist; all four resolve `false`. **All four sections are down.** |

**There is a third sequence with no window at all**, and it is available precisely
because D-45-04 constraint 3 forbids the grants from narrowing or widening:

**Migration 1 — additive.** In one transaction:
- `INSERT` the four section capability rows, `ON CONFLICT (key) DO NOTHING`.
- `INSERT` the eight grants — four keys × {master, organizer}, `requires_approved =
  false` for the calendar key (unchanged from today, D-44-27) and the value chosen for
  the three new ones (see the open question in §A6), `ON CONFLICT (role, capability) DO
  NOTHING`.
- `DROP POLICY IF EXISTS` + `CREATE POLICY` on all six `production_*` tables, asking the
  **calendar section key** with the `(SELECT …)` wrapper.
- **Leave `production.read`'s row and its two grants in place.**

At every instant of the window that follows: the old code's guard asks
`production.read` (still granted → `true`), and the six policies ask the calendar key
(granted to the same two roles → `true`). **Nobody is refused anything.**

**The deploy.** `keys.ts`, `capability-routes.ts`, `staff-tabs.ts`,
`verify-capabilities.mjs` and the new pages, in one commit, per constraint 4.

**Migration 2 — retirement.** `DELETE` the two `production.read` grants and then the
row. Small, separate, and it is the one that makes the split *auditable against the
question "who could read the calendar before, and who can read it after"*: the answer
is read off two `INSERT` blocks and one `DELETE`, none of which touch a role list.

`ai-engineering.md`'s *gate una rimozione si fa per chiave* applies to migration 2:
delete by `key = '…'` and `(role, capability)`, never by a `LIKE 'production%'`
selector — which after this phase would match the four new keys.

**Why additive-then-retire rather than one transaction, stated so it is not
re-litigated:** the two-migration form is *more* files and *fewer* moments at which
somebody is refused. In a repository with no error tracking, a surface that is down for
the length of a deploy is a surface nobody would learn was down except by opening it.
And the retirement migration is exactly the file an auditor reads to answer *did the
reach change*.

### A5. What `verify:capabilities` will say, and when

`scripts/verify-capabilities.mjs` carries a **pre-registered expectation**, and the
numbers are constants:

| Constant | Line | Today | After the split |
|----------|------|-------|-----------------|
| `EXPECTED_KEY_COUNT` | `:200` | `14` | `17` (14 − 1 + 4) |
| `ROLE_GRANTS` (4 roles × keys) | `:247-546` | — | `production.read` row removed; four section rows added, each `master`/`organizer` granted, `staff`/`member` `REFUSED` |
| `EXPECTED_PAIR_COUNT` | `:547` | `56` | `68` (17 × 4) |
| `EXPECTED_GRANT_COUNT` | `:548` | `30` | `36` (30 − 2 + 8) |
| `EXPECTED_REFUSAL_COUNT` | `:549` | `26` | `32` (68 − 36) |

The gate **needs a live database**; `scripts/verify-all.mjs:225-231` registers it with
the note that without credentials it *REFUSES (exit 2) and nothing about the capability
model was measured — that is its honest state, and it is not a pass*.

**It will be RED between migration 1 and the deploy**, because during that window the
database holds 18 keys (14 + 4) while `keys.ts` still declares 14, and after the deploy
but before migration 2 it holds 18 while `keys.ts` declares 17. That is the gate doing
its job, and the plan should **say so in advance** rather than let a red arrive as a
surprise mid-sequence. Side 4 reports an orphan key as *a key nobody asks for* — a
WARNING, not a failure (`:42-76`).

Side 5 is where the **refusals are asserted rather than written in a comment**
(`20260815120100:131-138` says so explicitly): `ROLE_GRANTS` declares every
(role × capability) pair and exits 1 naming the pair both when a declared refusal
acquires a row and when a declared grant loses one. **The four new keys' `staff` and
`member` refusals belong there, in the same commit as `keys.ts`.**

### A6. The naming schema

D-45-04 asks for "four section keys under one naming schema". `keys.ts:38-45` states
the rule the schema must satisfy: **named by the question, not by the predicate** —
three keys already resolve to the same predicate and are deliberately three keys,
because a key named after its predicate cannot later be taken away on its own.

Two candidate schemas, with the precedent each rests on:

| Schema | Example | Precedent | Cost |
|--------|---------|-----------|------|
| **Three segments** | `production.calendar.manage`, `production.manifesto.manage`, `production.visual.manage`, `production.location.manage` | `membership.card.view` is **already** a three-segment key (`keys.ts:194`) | Longest strings; the verb must be honest about D-45-06 (one key covers read *and* write, so `manage` is right and `read` would under-claim) |
| **Two segments, section as the noun** | `calendar.produce`, `manifesto.produce`, … | none — every existing key's first segment is a domain (`staff`, `door`, `venue`, `production`) | Loses the `production.` prefix that groups them; a later `grep` for the production surface finds four unrelated words |

**Recommendation: three segments, `production.<section>.manage`.** It keeps the
grouping prefix, it is precedented, and `manage` is the verb three existing keys
already use for *read-and-write over a surface* (`staff.manage`, `catalogue.manage`,
`party.manage`). Whether the calendar's key keeps `requires_approved = false` (it must
— D-44-27, and constraint 3 forbids a change) and whether the three **new** keys carry
`false` or `true` is a question for §Open Questions: the reasoning that produced
`false` was about the calendar's audience under a signup path that is closing, and
"the reason does not travel" is a sentence this repository has now written three times
(`keys.ts:93-97`, `:136-143`, `20260815120100:104-108`).

**What must be written into the new migration's prose, because the old file wrote it
and deleting it would lose it:** the four rejected reuses (`organizer.access`,
`catalogue.manage`, `admin.access`, `staff.manage`), each with the *direction* of its
mistake (`keys.ts:118-143`); the reason `requires_approved` is what it is and the bet
it rests on (`20260815120100:90-108`); and the paragraph declaring the absent write
policies a decision (`:253-284`). A rewrite that carries the policies and drops the
reasons is how the next reader "repairs" the gap with one `CREATE POLICY`.

---

## B. The instrument that authenticates as a real role (D-45-19)

This is the highest-value unknown in the phase, and the answer is better than expected:
**the mechanism already exists on this machine, it is proven, and it needs no
password.**

### B1. Nothing in the repository can do this today — confirmed

`/usr/bin/grep -rn "signInWithPassword\|createClient\|ANON_KEY\|SERVICE_ROLE" scripts/`
returns **five hits, all in `scripts/import-production-calendar.mjs`, all constructing a
service-role client**. No script signs in. `scripts/rls-baseline.mjs:215-216, 262-288`
connects to the Management API (`https://api.supabase.com/v1/projects/{ref}`) with
`SUPABASE_ACCESS_TOKEN` — a role that **bypasses RLS**, which is why Phase 44's
criterion 4 could prove the six policies *exist* and never that they *refuse*
(`44-VERIFICATION.md`, criterion 4, in its own words).

`STATE.md` records the same gap as a project-level debt, in Italian and with a count:
*«nessuno strumento di questo repository puo' autenticarsi come un ruolo»*, and Phase
36's V3 note records the one time it was done and how.

### B2. The mechanism, already written and already authorised once

`docs/36-13-v3/mint-session.mjs` — 83 lines, gitignored, Phase 36, **owner-authorised
2026-08-10 after the executor stopped to ask rather than procure it**:

1. Read `.env.local` into a map (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MASTER_EMAIL`).
2. `admin.auth.admin.generateLink({ type: "magiclink", email })` with the **service**
   client → yields `properties.hashed_token`.
3. `anon.auth.verifyOtp({ token_hash, type: "email" })` with the **anon** client →
   yields a real `session` with `access_token`, `refresh_token`, `user`.
4. Encode it in the exact shape `@supabase/ssr` 0.8 writes
   (`base64-` + base64url(JSON), chunked at `MAX_CHUNK_SIZE = 3180`) under
   `sb-<project-ref>-auth-token`, for feeding to a browser.

`docs/36-13-v3/revoke.mjs` — 13 lines: `admin.auth.admin.signOut(access_token,
"global")`, then `anon.auth.getUser(access_token)` and **prints whether the token still
resolves**, so the revocation is verified and not assumed.

The script's own header states the two disciplines the new instrument inherits verbatim:
*«It PRINTS NO TOKEN and NO EMAIL. It prints cookie names and lengths»*, and *«it lives
outside the repository because the repository is PUBLIC»*.

**Why this beats `signInWithPassword`:** no password needs to exist in an environment
variable, in a password manager entry shared with a script, or in a shell history. The
service key is already present and already governs everything. The trade is that
minting is an **act on a real person's identity** and therefore needs the same
authorisation ritual Phase 36 paid, plus the revoke.

**What the instrument does *not* need the browser cookie for.** Steps 1–3 alone yield
an `access_token`. For a PostgREST read it is enough to construct a second client:

```js
const asRole = createClient(URL, ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${session.access_token}` } },
});
```

The cookie encoding of step 4 is only needed to drive a *browser*, which this
instrument does not do.

### B3. The subject: who lacks the capability, today

Measured (`read_only: true`, aggregate, no identities read):

```
{"role":"master",   "status":"approved","count":1}
{"role":"member",   "status":"approved","count":2}
{"role":"organizer","status":"approved","count":1}
```

Four profiles. **No `staff` account exists.** So:

| Subject | Holds a production key? | Available today | What its refusal proves |
|---------|------------------------|-----------------|-------------------------|
| `master` | yes (all four, after the split) | ✅ 1 account, and its address is in `MASTER_EMAIL` | **The positive control.** Without it a green refusal is indistinguishable from a broken query |
| `organizer` | yes (all four) | ✅ 1 account | Second positive control; also the D-45-03 subject that makes criterion 1 unobservable |
| `member` | **no** | ✅ 2 accounts | **The refusal.** A signed-in subject with a real `auth.uid()`, a real profile row, and no grant — the resolver's `EXISTS` finds nothing and the policy returns no rows |
| `staff` | no | ❌ **zero accounts** | The refusal the migration's prose describes at `:118-123`; needs a hand-made account |
| `anon` | no | ✅ no minting needed | A weaker refusal: `auth.uid()` is null (`capability_model.sql:55-57`), so it proves the *null* path, not the *capability* path |

**The member session is the subject criterion 4 asks for**, and it exists. A hand-made
`staff` account would be stronger (it is the refusal D-44-17 argued for by name), and it
is a **production write** with its own authorisation cost — see §G2.

### B4. The refusal is `200 []`, and that is a trap on empty tables

Measured ACLs: `anon` and `authenticated` hold `arwdDxtm` on all six `production_*`
tables. So a request from an unentitled session is **not** refused by the privilege
system (`42501`, HTTP 403) — it passes the privilege check, meets the policy, matches no
row, and returns **HTTP 200 with `[]`**.

`production_plan`, `production_piece`, `production_commitment`,
`production_checklist_item` and `production_import_run` all hold **0 rows**. On those
five tables, *an entitled master and an unentitled member get byte-identical answers
today.* An instrument asserting "the member got `[]`" against them would be **green and
meaningless** — the exact "probe that has never been shown to fire" that
`scripts/probe-forged-identity.sh:44-46` refuses to accept as evidence.

**Three ways out, and the plan should take the first and the third:**

1. **Assert a pair, never a single value.** For every table, the instrument runs the
   same query under a master session and under a member session, and asserts
   `master.rowCount > 0 && member.rowCount === 0`. If `master.rowCount === 0` it
   **REFUSES (exit 2)** — the measurement did not happen — rather than reporting a
   pass. This is `verify-all.mjs:26-36`'s distinction between a failure and a refusal,
   applied at the assertion level.
2. `production_pipeline_rule` carries **16 rows** and is the one table on which the pair
   already discriminates today. It is a legitimate first subject and a natural smoke
   test, but it is *one of six*, and §2f of the access migration says out loud that the
   uniform arm exists so nobody reasons *this table is harmless on its own*.
3. **The three new sections' tables will hold rows** the moment D-45-07 seeds and the
   manifesto/visual sections are authored. The instrument's real subjects are
   therefore the section tables, and the calendar's five empty tables should be
   asserted as **REFUSED-not-measured** until the owner runs the import.

### B5. The read-only guarantee

`STATE.md` records the incident this constraint exists for (D12, 63 production rows) and
the discipline that followed. Concretely, for this instrument:

- **It constructs no service client for anything but `generateLink`.** The service key
  is used for exactly two calls — `auth.admin.generateLink` and
  `auth.admin.signOut` — and never for a `.from(...)`. That is auditable by grep and
  should be asserted by the script's own header the way `may-upload.ts:1-15` asserts
  `server-only` in its first three lines for a check that greps `head -3`.
- **Every PostgREST call is a `.select()`.** No `.insert`, `.update`, `.upsert`,
  `.delete`, `.rpc`. A one-line self-check at the top of the file — a grep of its own
  source for the four write verbs — is the shape `verify-conversion.mjs` uses to keep a
  gate from going green on the sentence forbidding the thing.
- **It never runs `--apply`, never touches `docs/`, never reads `.firecrawl/`.**
- **The session is revoked at the end, and the revocation is verified**, on
  `revoke.mjs`'s pattern: sign out globally, then re-read the token and print whether it
  still resolves.
- **It prints no token, no email, no row content.** Counts and table names only. A
  refusal probe that printed a row would be printing exactly the material the policies
  exist to hold.

### B6. Where it goes, and how it is registered

- **File:** `scripts/` is the family, but this script needs credentials *and* an
  owner's authorisation to mint a session on a real identity. It belongs in
  `scripts/` (tracked, so the method is reviewable) with the **credentials and the
  authorisation** outside it — `.env.local` for the former, a dated line in the phase's
  procedures document for the latter. The minting helpers in `docs/36-13-v3/` are the
  reference implementation and stay gitignored.
- **Registration:** `scripts/verify-all.mjs` has three lists — `OFFLINE` (`:220-267`),
  `NEEDS_SERVER` (`:274-279`), `NEEDS_MATERIAL` (`:288-299`). This instrument fits none
  of them: it needs credentials *and* an act. **A fourth list — `NEEDS_AUTHORISATION`
  — declared and never run**, printed on every run with its reason, is the honest
  shape, and it follows the file's own stated contract: *«Adding a NAME to a list is
  not adding a RUNNER: nothing below spawns these, on purpose»* (`:290-293`).
- **npm script:** `verify:refusal` (or similar), consistent with the sixteen existing
  `verify:*` entries in `package.json:6-27`.

### B7. What the instrument must assert, per section

| Assertion | Subject | Passing shape |
|-----------|---------|---------------|
| Positive control | master session | ≥ 1 row from each of the section's tables |
| Positive control | organizer session | same |
| **The refusal** | member session | **0 rows**, HTTP 200, on every table of every section |
| The anonymous floor | no session, anon key only | 0 rows, on every table of every section |
| Cross-section (structural only, D-45-03) | — | The four policy quals read from `pg_policies` name **four different keys** — the machine half of criterion 1 |
| The function is unreachable | member session | any new `SECURITY DEFINER` function this phase adds answers `42501` at `/rest/v1/rpc/…`, per the `20260815120200` lesson |

**What it must not claim.** It cannot close criterion 1, because D-45-03 leaves no
production subject holding one section and not another. It proves *the four policies ask
four different keys*, which is a different sentence and must be written as such.

---

## C. The data model for the three sections

### C1. The house style, so the new tables match rather than invent

Read from `20260815120000_production_calendar.sql` (1050+ lines, six tables):

| Pattern | Where | What it means for Phase 45 |
|---------|-------|----------------------------|
| `CREATE TABLE IF NOT EXISTS`, **every constraint declared inside the CREATE** | `:43-52` | Not `DROP CONSTRAINT IF EXISTS` + `ADD` — measured to leave the transaction in rollback (`:827-830`). Where a constraint must be added to an existing table, the `DO` block form (`:840-846`) |
| A closed vocabulary as a **named** SQL `CHECK`, mirrored in TypeScript | `:286-287` ↔ `src/lib/production/ics/vocabulary.ts:187-195` | Named so a bad value arrives as `production_plan_venue_stage_check`, not an anonymous `23514`. **Editing either set means editing both, in the same commit** — the build sees the TS side, the CHECK sees the SQL side, and they agree only because they were written once and copied |
| **XOR** between a value and its reason | `:439-440` `CHECK ((date IS NULL) <> (unresolved_reason IS NULL))` | The exact shape D-45-13's exit reason needs |
| A conditional requirement | `:1009-1010` `CHECK (anchor_direction = 'on' OR anchor_weekday IS NOT NULL)` | The exact shape D-45-12's mandatory evidence line needs |
| A monotone guard as a **trigger**, not a caller check | `:328-355` | *a guard in the database survives the caller that forgot it, and a guard in application code does not* |
| Refusals as **returned values**, never exceptions | `:370-380`, `:456-499` | Because PostgREST returns the entire failing row in the error detail, and the caller cannot branch on a cause Next has redacted |
| `⚠ INTERNAL, NEVER PUBLIC` banner on any column that can hold a space's name | `:229-238` | Every "name of a space" column in the location section carries the same banner |
| Partial unique index where retirement releases a value | `:183-184` | The model for anything that must be unique among *live* rows only |
| Indexes on the columns actually read | `:292-301` | The location list is read by stage and by name; the score table by space |

### C2. The location section

**Two tables**, not one, and the split is the same one `production_plan` /
`production_piece` already makes: a space is one row; its per-format scores are many.

#### `public.production_space` — the scouted space

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `name` | `text NOT NULL` | **⚠ INTERNAL, NEVER PUBLIC.** Same banner as `production_plan.venue_word:229-238`. It may name a space under negotiation; no surface an unauthenticated visitor can reach may render it, and no log line, error message or `.planning/` document may echo it |
| `stage` | `text NOT NULL DEFAULT 'mapped'` | `CHECK (stage IN ('mapped','verified','contacted','acquired'))`, **named**. Mirrored in TS. Note the divergence from `production_plan.venue_stage`, which is **nullable** because the calendar entry carries no stage and *an inferred `acquired` is exactly the harm* (`:249-252`); here the stage is always known, because a row exists only because somebody mapped it |
| `rig` | `text` | Answer 1 — what rig is there |
| `real_capacity` | `integer` | Answer 2 — how many people actually fit. `CHECK (real_capacity IS NULL OR real_capacity > 0)` |
| `guest_dj_allowed` | `boolean` | Answer 3 — may a guest dj play |
| `closing_time` | `time` | Answer 4 — until what hour. **`time` and not `timestamptz`**, for `production_plan:197-201`'s reason: a night runs past midnight and a conversion moves a weekday |
| `answers_source` | `text` | `CHECK IN ('not_asked','phone','on_site','public_listing')` — because "closing time is 01:00 per the venue's public page" and "…because they said so on the phone" are different facts, and `venue-acquisition.md`'s *gate le quattro domande* says the public listing answers the wrong question |
| `agreement_evidence` | `text` | **D-45-12.** A pointer — a mail of such a date, a signed contract — never an attachment |
| `exited_at` | `timestamptz` | **D-45-13.** Never a delete |
| `exit_reason` | `text` | `CHECK IN ('out_of_identity','refused','unreachable','other')` |
| `promoted_venue_id` | `uuid REFERENCES public.venues(id)` | **D-45-10.** See §D3 for why this direction is safe |
| `first_seen_at` / `created_at` / `updated_at` / `created_by` | | `created_by uuid REFERENCES public.profiles ON DELETE SET NULL`, per `formats_and_series.sql:161-166` |

**Three constraints that carry decisions rather than tidiness:**

```sql
-- D-45-12, structural: acquired means IN WRITING, and the database is where
-- that is true rather than where it is remembered.
CONSTRAINT production_space_acquired_needs_evidence
  CHECK (stage <> 'acquired' OR btrim(coalesce(agreement_evidence, '')) <> ''),

-- D-45-13: a row that left the race carries WHY and WHEN, and the two travel
-- together. The XOR shape of production_piece_date_xor_reason:439-440.
CONSTRAINT production_space_exit_xor_reason
  CHECK ((exited_at IS NULL) = (exit_reason IS NULL)),

-- D-45-10: only an acquired space can have been promoted. A promotion from any
-- other stage is the ranking-is-not-availability error, encoded.
CONSTRAINT production_space_promotion_needs_acquired
  CHECK (promoted_venue_id IS NULL OR stage = 'acquired')
```

**What is deliberately absent:** a `regime` column and a `neighbours` column. Both were
offered as part of D-45-11 and **declined**. `legal-compliance.md` and
`venue-acquisition.md` both argue for them, which is exactly why a planner will be
tempted to add them back as obviously useful. They come back as a decision.

#### `public.production_space_score` — per format, and never a bare number

| Column | Type | Notes |
|--------|------|-------|
| `space_id` | `uuid NOT NULL REFERENCES public.production_space(id) ON DELETE RESTRICT` | `RESTRICT` and not `CASCADE`: D-45-13 says no space is ever deleted, so a cascade is a path that should not exist |
| `format_id` | `uuid NOT NULL REFERENCES public.formats(id)` | The catalogue is in production since 2026-08-10 |
| `score` | `numeric NOT NULL` | `CHECK (score >= 0)`. **Zero is a real value** — `venue-acquisition.md`'s *gate fuori identita' resta visibile* keeps an out-of-identity space listed at zero rather than deleted |
| `provenance` | `text NOT NULL` | `CHECK (provenance IN ('derived','field_verified'))`, **NOT NULL and no default**. This is D-45-11 mitigation 2 made structural: a score cannot exist without saying which it is |
| `scored_at` | `timestamptz NOT NULL DEFAULT now()` | |
| | | `UNIQUE (space_id, format_id)` |

`venue-acquisition.md`'s weightings are **per format and not comparable across
formats** — the module says the score *«si legge per format, mai come un giudizio
assoluto»*. A single `score` column on the space row would encode the opposite. This
table shape is the module's rule made unrepresentable-otherwise.

#### C2.5. The seeding source of D-45-07 — a finding, not a detail

D-45-07 says the section *«seeds once, with a local script, from the scouting research
that already exists locally»*. Measured:

```
find .firecrawl -type f | wc -l          → 514
extensions                                → 302 .json · 172 .md · 39 .jpg · 1 .DS_Store
top-level dirs                            → .firecrawl/{.firecrawl, ll, comp, denver}
```

These are **raw crawl artefacts** — scraped pages, API responses, images — not a
normalised list of spaces with stages and per-format scores. The normalised records
exist, but not here: the project's own memory note records that the scouting archive is
a **single artifact HTML, re-published in place**, whose local source lived at a
scratchpad path of another session and is patched by `patch-*.js` scripts that `eval`
an embedded `const data = [...]` array.

**That path is gone.** Verified:

```
find /private/tmp/claude-501 -name "resonate-production*.html"   → (nothing)
find /private/tmp/claude-501 -name "patch-*.js"                  → (nothing)
find /Users/etiesse -maxdepth 6 -name "resonate-production*"     → (nothing)
ls docs/                                                          → no scouting file
```

**Consequence for planning.** D-45-07's seeding script has **no input on this machine
today**. Three routes, and the first is the one that matches every rule this project
already wrote:

1. **The owner exports the artifact's record array to a file and places it in
   `docs/`** — gitignored, verified ignored *before* being read, exactly the D-44-04
   ritual and in that order. The seeding script then reads a declared, stable shape.
   This is the recommendation.
2. Rebuild the normalised list from `.firecrawl/`'s 474 json+md files. This is
   **re-doing the scoring**, not importing it, and it would produce numbers nobody
   decided — the *gate derivato non e' verificato* violated by the tool meant to
   respect it.
3. Type a handful by hand — explicitly rejected by D-45-07.

**And the count is a question, not a fact.** The domain module states 184 spaces; the
memory note's last recorded figure is 183 at the close of the "residui" pass. Neither is
a measurement of the file that will actually be supplied. **The seeding script must
report what it read and what it wrote**, in a run row, and the plan must not write an
expected count into an acceptance criterion it cannot check.

**Every seeded row lands at `mapped`** (D-45-07 constraint 4). With
`stage NOT NULL DEFAULT 'mapped'` and the seeding script **not writing the column at
all**, that is structural rather than remembered. A script that wrote `stage` from a
score would be *ranking-is-not-availability* encoded into data, and the constraint
above would not catch it — only the omission does.

**Re-runnability** (constraint 2): the calendar's discipline is a natural key plus
`ON CONFLICT … DO UPDATE` (`production_plan_source_uid_unique:279`). The scouting
records need the same — an identity that survives an edit. If the export carries a
stable record id, that is the key; if it carries only a name, the key is a normalised
name and the script must say so, because a renamed space would then arrive as a new row.
**This is a question for the owner's export, not a choice a planner can make blind.**

### C3. The manifesto and visual sections — the three states and the register

#### `public.production_section` — the state of a body of rules

D-45-14 asks for three states because the domain names **two opposite errors**:
inventing where a rule already exists, and answering *"not decided"* where a coordinate
has been declared. `sound-manifesto.md` states both as gates, and both are live today:
one format's manifesto is written and closed; one is unwritten but carries declared
coordinates *including an explicit negative*; one is unwritten with nothing declared.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `section` | `text NOT NULL` | `CHECK IN ('manifesto','visual')` — the two authored sections. Mirrored in TS |
| `format_id` | `uuid REFERENCES public.formats(id)` | Nullable: a rule can belong to the whole brand rather than to one format |
| `state` | `text NOT NULL` | `CHECK IN ('written','coordinates_declared','not_decided')`. **No default.** A default of `'written'` would fill the void; a default of `'not_decided'` would answer for a coordinate that exists. The author says which |
| `body` | `text` | The prose, when there is prose |
| `missing` | `text` | **D-45-14:** what is missing. Required when `state = 'not_decided'` |
| `decision_owner` | `text` | **D-45-14:** whose call it is. Required when `state = 'not_decided'` |
| `updated_at`, `updated_by` | | |

```sql
-- D-45-14: a not-decided section SAYS what is missing and whose call it is.
-- Without this, "not decided" is a shrug, and a shrug reads as "nobody's job".
CONSTRAINT production_section_not_decided_names_its_gap
  CHECK (
    state <> 'not_decided'
    OR (btrim(coalesce(missing, '')) <> '' AND btrim(coalesce(decision_owner, '')) <> '')
  ),

-- The mirror: a written section has a body. An empty 'written' row is the
-- emptiness NOT declared, which is criterion 3 failing quietly.
CONSTRAINT production_section_written_has_a_body
  CHECK (state <> 'written' OR btrim(coalesce(body, '')) <> '')
```

`coordinates_declared` deliberately requires **neither**: it is the state where a
coordinate exists (a genre excluded, a register named) without a manifesto, and forcing
a `missing` line there would push the author into inventing the gap.

**The explicit negative is not a separate column.** `sound-manifesto.md`'s *gate il
fatto negativo si cita* says exclusions are decisions as much as inclusions and must be
*reported, not re-derived each time*. That belongs in `body` for a `written` section and
in a `coordinates_declared` row's `body` for the middle state — a `negatives` column
would invite a surface that shows the positives and drops them.

#### `public.production_open_question` — the pending-decision register

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `question` | `text NOT NULL` | |
| `decision_owner` | `text NOT NULL` | |
| `section` | `text` | Which section it warns on |
| `format_id` | `uuid REFERENCES public.formats(id)` | Nullable — some open questions are per-format, some are not |
| `opened_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `closed_at` | `timestamptz` | |
| `resolution` | `text` | |
| | | `CHECK ((closed_at IS NULL) = (resolution IS NULL))` — the XOR shape again: a question closed without its answer is a question that will be reopened |

**D-45-15: it warns and does not block.** There is no constraint here that refuses
anything, and there must not be one — the calendar's checklist made the same choice
(D-44-16) for the reason both decisions give: *a block that fires under deadline is a
block somebody routes around*. The warning is a **surface** obligation, and it belongs
in the section-surface assertion of §E4.

The register's real first entries are already declared open in the domain modules —
whether a touring format sounds the same at every venue; whether *never the same space
twice* holds forever or only within a season; a weekday still marked a placeholder. All
three are criteria, not candidates, and all three are safe to name in a plan.

#### D-45-08 and D-45-16 — the material beside the rules

The visual section holds the produced pieces and the dj photo archive. **That is file
upload, and it is not built from scratch** — see §F4.

**D-45-16 is a real collision, and the measurement confirms it.**
`20260810120000_formats_and_series.sql:124` declares `color text NOT NULL` with
`:173` `CHECK (color ~ '^#[0-9A-Fa-f]{6}$')`, and `:118-124` says in the migration's own
prose that it is *«the IDENTIFICATION colour — the dot on a chip, the marker on a card —
and not the palette of the materials, which is a different thing that shares a word»*.
Every format has one, including the one with no palette. **A visual surface that
rendered that value large would hand a format a palette nobody decided.**

Mechanically, `npm run verify:semantic-separation` already asserts three halves of this:

- **check C** — no LINE under `src/` carries both a `sem-`-prefixed colour utility and a
  format identifier (the string `color_hex`, or a CamelCase format name);
- **check E** — no token in `:root` and no `--color-*` mapping is named after a format
  or a sigla;
- **check B** — see §E3.

What it cannot assert is *size*: a `formats.color` swatch rendered at 4 px and at 200 px
are the same source line. **That is a person's judgement and belongs in a written
procedure**, exactly as `44-UI-SPEC.md` §15 declared for whether a proposed date reads
as settled.

### C4. Policies for the new tables

Follow the six existing arms exactly:

```sql
ALTER TABLE public.production_space ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_space_select_location ON public.production_space;
CREATE POLICY production_space_select_location ON public.production_space
  FOR SELECT USING ((SELECT private.has_capability('production.location.manage')));
```

`TO authenticated` is available and is what `venues_select_staff` chose
(`20260810161000:236-241`) — narrower than the six production policies, and free, since
for `anon` the predicate can only ever answer `false`. **Whichever is chosen, choose it
once for all the new tables and say why**, because the asymmetry with the six existing
arms will otherwise read as an accident.

**Write policies: the open question.** The six existing tables carry read arms and
nothing else, and `20260815120100:253-284` declares the absence a decision — writes
arrive with the service client, which bypasses every policy, so a write policy would
constrain nothing on the only path that writes *while reading to the next person as
though the boundary were covered*. Two options, and the trade is real:

| Option | Boundary | Cost |
|--------|----------|------|
| **A — service client + action guard** (the calendar's shape) | The Server Action. The RLS covers reads only, and the absence is declared in prose | Consistent with five other tables in this repository that omit write policies on purpose. Criterion 4 is about *read* paths, so this satisfies it |
| **B — cookie-bound client + INSERT/UPDATE policies asking the section key** | The database, for writes too | Stronger, and it gives D-45-19 a write-refusal to assert. But it diverges from the house shape, and a refused write returns a PostgREST error to a caller — which is the surface D-45-18 exists to keep from being logged whole |

**Recommendation: A**, with the declaring paragraph carried across verbatim, because
D-45-06 is about *which key* covers write, not about *where the check lives*, and
criterion 4 asks about read paths. If B is chosen it must be chosen deliberately and the
prose paragraph must be rewritten rather than deleted.

---

## D. The promotion act (D-45-10)

### D1. The precedent, read

`announceNight` — `src/app/(admin)/admin/calendar/actions.ts:598-932` — is the shape.
What it does, in order, and what each step buys:

1. **One gate, asked once.** `assertProductionRead()` (`:110-127`) resolves the access
   context and throws two *different* categories: `forbidden.production_read_required`
   for a refusal on the merits, and `capabilities.identity_missing` for an unresolvable
   identity, which *«is NOT a refusal on the merits»*. `cache()` does not memoise inside
   a Server Action body, so **more than one `await assert…(` in one export is the
   defect** (`:104-107`).
2. **The idempotence check first.** `if (plan.linked_party_id !== null) return { ok:
   false, reason: "already_announced" }` — *«announcing twice is not idempotent — it
   spends a second number»* (`:655`).
3. **The refusals are named one by one**, never collapsed: `format_not_resolved`,
   `series_not_resolved`, `start_time_missing`, `venue_stage_not_acquired` (`:657-676`).
4. **The stage gate carries the stage back and names no space** (`:668-676`).
5. **The count that never gates** — open checklist items are counted *before* anything
   is written and are reported, not enforced (`:678`, D-44-16).
6. **The write says what it deliberately does not carry** (`:748-770`): not the venue in
   either form, not a line-up, not `access_type`. And it writes
   `venue_reveal_on_purchase: false` **explicitly**, because the column's default is
   `true` and leaving it alone would release an address without anybody deciding to.
7. **The orphan cleanup is by primary key**, on the id this call just created —
   *«never by a selector over a list»* (`:801-812`).
8. **The link is written last** and is what makes a later divergence signalled rather
   than discovered.
9. **Every log line is `code=… message=…`** and never the error object (`:740-746`,
   `:800-806`) — D-45-18's rule, already applied here.

### D2. What the promotion must write, and what it must refuse

**Writes** (into `public.venues`, whose measured columns are `id, name, slug, bio,
address, google_maps_url, photo_url, instagram_url, website_url, created_by, created_at,
updated_at`):

- `name` — from the scouting row.
- `slug` — **derived once, at creation, with a suffix on collision, never an
  overwrite**, exactly `announceNight`'s treatment (`:687-700`) and `createFormat`'s
  before it. A venue slug is an address somebody may send to somebody else.
- `created_by` — the acting profile.
- **Nothing else by default.** `address` in particular: a scouting row's address (if the
  export carries one) is the most consequential field in this phase, and writing it into
  `venues` puts it one wrong night-selection away from `venue_for_parties`. If the act
  writes an address it must say so in its confirmation, in the same breath, on
  `AnnounceNightDialog`'s pattern.

**Then, back on the scouting row:** `promoted_venue_id = <new id>`. That link is what
makes a second press idempotent, on `linked_party_id`'s exact model.

**Refuses**, each with its own reason code:

| Reason | Condition |
|--------|-----------|
| `not_acquired` | `stage <> 'acquired'` — and it carries the stage back, naming no space |
| `no_agreement_evidence` | belt-and-braces against the CHECK; the constraint is the boundary, the code is the sentence |
| `already_promoted` | `promoted_venue_id IS NOT NULL` — the second press |
| `space_exited` | `exited_at IS NOT NULL` — a space that left the race is not promoted |
| `slug_taken` / `write_failed` | the two database outcomes, kept apart |

**And it must refuse as a returned value, never a thrown message.** Next redacts
messages thrown out of a Server Action in a production build
(`src/lib/capabilities/server.ts:59-63`).

### D3. Why the scouting table must have no path to `venue_for_parties` — and why a
foreign key *to* `venues` is nonetheless safe

The public road to an address is one function, and its body is measurable
(`20260810161000_venues_read_narrowed.sql:371-397`):

```sql
FROM public.event_parties ep
JOIN public.events e   ON e.id = ep.event_id
JOIN public.venues v   ON v.id = ep.venue_id
WHERE ep.id = ANY(p_party_ids) AND ( … )
```

It returns `party_id, venue_id, name, slug, address, google_maps_url`, is
`SECURITY DEFINER` with `search_path = ''`, and is granted to `anon, authenticated`
(`:552-561`). **It walks `event_parties → events → venues` and reads nothing else.**

So:

- **`production_space.promoted_venue_id → venues` is safe.** The direction is
  scouting → venues, and the function never traverses it. Nothing in the function's
  `FROM` clause can reach a scouting row.
- **The dangerous shapes, named so they are recognised if proposed:** (a) a scouting
  row *inside* `public.venues` — D-45-10's whole point, because that row then sits in
  the picker from which a night's venue is chosen; (b) any **view** joining
  `production_space` to `event_parties` or `venues` and living in `public`, which
  PostgREST would serve; (c) any column on `venues` referencing a scouting row, which
  would make the scouting id readable through `venues_select_staff`.

**And the measured reasoning D-45-10 rests on is confirmed:** `venues` has exactly four
policies, and the read one is `venues_select_staff`, `SELECT`, `TO {authenticated}`,
asking `staff.manage`. There is **no `anon` SELECT policy**. `staff.manage` is held by
master and organizer only, despite the key's name — the same audience D-45-03 gives the
location section. **Read exposure would not have changed. The risk was always the write
side**, and the separate list removes the selection entirely.

The three write policies (`20260807010000_policies_to_capabilities.sql:401-417`) are
`venues_delete_master` (`master.manage`), `venues_insert_organizer` and
`venues_update_organizer` (both `catalogue.manage`, which **requires an approved
status**). **The promotion writes through them or around them**, and that is a decision
to take rather than inherit: `catalogue.manage` is a *different key* from the location
section key, so a promotion performed with the cookie-bound client would require the
actor to hold both. Performed with the service client it requires neither, and the
guard is the action's. **Recommendation: the action asks the location section key **and**
`catalogue.manage`, then writes with the service client** — because creating a venue is
a catalogue act, and *may this subject work the location section* is not *may this
subject create a venue*. That is `keys.ts:38-45`'s naming rule applied to a bridge.

---

## E. The export (D-45-17)

### E1. What "narrow by construction" has to mean

D-45-17: the export *«cannot carry an address or an unannounced date because it does not
read those tables, not because whoever presses it is careful»*, and *«a plan proves it
by showing what it cannot reach»*.

That is a statement about a **module's import and query closure**, and it is exactly the
property two gates in this repository already assert about other things:

- `scripts/verify-conversion.mjs` — *«a surface is declared converted when what it
  REACHES is converted»*; it walks the import closure from a declared page file and
  proves no unconverted file is reachable.
- `scripts/verify-calendar-surface.mjs` (778 lines) — ten string-level assertions over
  two named directories, with an explicit, prominent **"what a green does not mean"**
  section, and every file read through `scripts/lib/comments.mjs` so a docblock
  explaining why a token is forbidden does not redden the check that forbids it.

### E2. The shape to build

**One module per exportable document**, each with a declared table list:

```
src/lib/production/export/manifesto.ts   reads: production_section (section='manifesto'),
                                                formats (name, code) — nothing else
src/lib/production/export/capitolato.ts  reads: production_section (section='visual'),
                                                the token file — nothing else
```

**The assertion** — `scripts/verify-section-export.mjs`, in the
`verify-calendar-surface` family:

| Check | What it asserts |
|-------|-----------------|
| **A** | The export modules' **import closure** contains no module that queries `production_plan`, `production_piece`, `production_commitment`, `production_space`, `event_parties` or `venues`. Walked from the entry file, the way `verify-conversion.mjs` walks |
| **B** | The export modules contain **no `.from("<forbidden table>")` call**, for a declared list of forbidden table names, read through the comment stripper |
| **C** | The **positive** half — each export module names its own tables, so the check is not vacuous the day somebody deletes the query |
| **D** | The declared forbidden list is **complete**: it is derived from the set of tables carrying a `venue`/`date` column rather than typed by hand, so a seventh production table added later is covered by construction |
| **E** | No export module imports the service client (`@/lib/supabase/service`) — an export that bypasses the policy of the section it exports is an export that can carry another section's rows |

**The positive check C is not decoration.** `verify-conversion.mjs:75` and
`probe-forged-identity.sh:44-46` both record the same lesson: a check that has never
been shown to fire proves nothing. A negative-only assertion goes green on a deleted
file.

### E3. The collision the capitolato creates with `verify:semantic-separation`

`brand-visual-system.md` says the capitolato carries the palette, and D-45-09 says the
visual section reads it from the tokens. **The gate already enforces the second and would
red-flag the naive form of the first.**

`scripts/verify-semantic-separation.mjs`, check **B**: *«One home for a brand hex. No
file under `src/`, other than the two exemptions, contains any hex declared in the token
file's `:root`.»* The exemptions are exact paths (`:197-203`):
`src/app/(admin)/admin/formats/ColorSwatchPicker.tsx` (format identification colours are
data on a row) and `src/app/layout.tsx` (the browser paints `themeColor` before any
stylesheet loads).

`src/app/globals.css` declares the six brand hexes at `:213-218` (`--amber`, `--orange`,
`--pink`, `--pink-soft`, `--violet`, `--violet-deep`) plus the sunset gradient at `:219`.

**So a capitolato page or export module containing `#FF5C93` as a literal turns
`verify:semantic-separation` red.** That is the gate working. The resolution is the one
D-45-09 already chose:

- The export **parses `src/app/globals.css`'s `:root` at build or request time** and
  emits the values it reads — a runtime value, not a literal, and invisible to a grep
  over source.
- **Do not add a third exemption path.** `verify-tokens.mjs:154` records the reason a
  check must not be able to go green on the sentence describing its own prohibition, and
  an exemption granted to the surface whose whole job is to publish the palette would
  make check B meaningless for the one file it most needs to cover.
- **Do not restate the gradient.** `npm run verify:sunset-gradient` exists as a separate
  gate; `brand-visual-system.md` calls the gradient SunSet's exclusive signature.

### E4. The section-surface assertion

The `verify-calendar-surface` family is the natural home for the mechanical half of
criteria 2 and 3:

| Check | Criterion | What it reads |
|-------|-----------|---------------|
| Stage beside the name | 2 | No component renders `production_space.name` without `StageBadge` (or its successor) in the same JSX subtree — string-scoped, and its limits stated |
| Provenance beside the score | D-45-11 mitigation 2 | Every render of `score` is accompanied by a render of `provenance` |
| The void is declared | 3 | The `not_decided` branch renders `missing` and `decision_owner`; there is no branch that renders an empty section as a blank panel |
| `formats.color` is not a palette | D-45-16 | The visual section's files contain no large-swatch utility applied to a `color`-derived value — **weak**, and the check must say so; the real gate is a written procedure |
| No venue word to a `console.*` | D-44-04 | The scan already exists in spirit at `verify-calendar-surface`; extend the directory scope |

**And it must carry the same "what a green does not mean" paragraph.** These are string
assertions over source. They render nothing, open no session, and prove no perception.

---

## F. The surfaces

### F1. Where the files go

`nextjs-architecture.md:64-71`, **R-WORK-ROUTES** (declared by plan 34-07): route files
inside `(work)`, every co-located Server Action and client component **one level out**,
imported with the absolute specifier `@/app/(admin)/admin/…`. *«A route group governs
routing and nothing else.»*

The calendar walked it exactly, and it is the layout to copy:

```
src/app/(admin)/admin/(work)/calendar/page.tsx          route
src/app/(admin)/admin/(work)/calendar/loading.tsx       route
src/app/(admin)/admin/(work)/calendar/[id]/page.tsx     route
src/app/(admin)/admin/calendar/actions.ts               action     ← one level out
src/app/(admin)/admin/calendar/CalendarList.tsx         component  ← one level out
src/app/(admin)/admin/calendar/StageBadge.tsx           component
src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx  component
…
```

### F2. The binding sequence, which is forced and not chosen

`capability-routes.ts:578-582` records it, and `staff-tabs.ts:108-131` records it again
with the reason: **`StaffTab.href` is `Route`, not `string`**, and a static address
enters the generated `typedRoutes` union **only once a `page.tsx` serves it**. So:

1. Page file on disk.
2. Entry in `CAPABILITY_ROUTES` (`as const satisfies Record<CapabilityKey, Binding>` —
   a key with no entry is a build error).
3. Tab in `staff-tabs.ts` — **in a later plan than the page**, and the module-load loop
   at `:179-198` throws if the tab and the map disagree.

The two ways to make a tab compile early — widening `href`, or asserting the type on one
entry — are **rejected in writing** at `staff-tabs.ts:117-126` and stay rejected.

**Ambiguity check.** The loop at the foot of `capability-routes.ts` throws on the first
import when two patterns tie, and it runs at **module load inside a middleware bundle**,
not at `npm run build` — so a tie is *«a 500 on every route the middleware covers, the
payments webhook and the door's scan path included»*. Four new one- or two-segment
static addresses under `/admin/` must be checked against the existing patterns before
they are written. `node scripts/verify-routes.mjs --print-patterns` lists them.

**The deploy rule follows from that**, and `STATE.md` records it twice: ship on a day
without a night, and make the first request yourself. The pending todo
`module-load-throws-500-the-whole-middleware-surface.md` is about precisely this file and
is worth a glance by whoever writes D-45-04's plan.

### F3. What the pages reuse

**Primitives (Phase 41, `41-UI-SPEC.md` §8, all present in `src/components/ui/`):**
`PageShell` (§8.1) · `StaffNav`/`AppNav` (§8.2) · `Dialog` (§8.3) · `Card` (§8.4) ·
`Button`/`IconButton`/`Chip`/`Badge` (§8.5) · `Input`/`Textarea`/`Select`/`Checkbox`/
`Switch` (§8.6) · `PageTitle`/`SectionHeading`/`Wordmark` (§8.7) · `DataTable` (§8.8) ·
`Skeleton` (§8.9) · `Toast` (§8.10). `41-UI-SPEC.md` §8.11 lists what deliberately does
**not** become a component.

**Tokens (Phase 40, `src/app/globals.css`):** `--ground/--surface/--raised/--sunk`,
`--ink/--muted/--faint`, `--line-soft/--line/--line-strong`, `--control`,
`--accent/--accent-hover`, `--sem-crit/--sem-warn/--sem-info/--sem-done`, and the brand
family at `:213-219`. Reached through `@theme inline`'s `--color-*` mappings.

**Two traps in the token layer that bear directly on this phase:**
- `--sem-warn` **is** `--amber` **is** SunSet's identification colour
  (`verify-semantic-separation.mjs:35-39`), so an amber mark cannot tell a reader
  *caution* from *this format* by hue alone. **Anything amber carries text.** D-45-15's
  open-question warning is amber-shaped and must be a word, not a colour.
- The **`--grad-sunset` gradient is SunSet's exclusive signature.** A visual section
  showing "the palette" must not spend it as chrome.

**Already built and directly reusable:**
- `src/app/(admin)/admin/calendar/StageBadge.tsx` — the four-stage badge, built for
  D-44-05, which is the same vocabulary D-45-11 needs. **Reuse it or move it to a shared
  location; do not write a second one.**
- `src/app/(admin)/admin/formats/ColorSwatchPicker.tsx` — the swatch picker, and a
  **named exemption in two gates** (`verify-conversion.mjs:671`,
  `verify-semantic-separation.mjs:197`). D-45-09 is a reuse decision.
- `src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx` — the confirmation-for-a-
  consequential-non-destructive-act pattern, with cancel first, cancel focused, no
  Enter-to-confirm, and the outcome reported **in the dialog's own panel**
  (`Dialog.tsx:173-192`) rather than a transient notification, which `verify:dialogs`
  check C asserts is absent.

### F4. The upload path for D-45-08

**Do not build a second one.** The existing path, measured:

- **Client → private quarantine bucket** (`20260809004600_event_media_quarantine_bucket.sql`,
  `20260809006000_event_media_server_upload_only.sql`), then a **JSON** call to
  `POST /api/media/finalize` with the object key.
- `src/app/api/media/finalize/route.ts:20-52` records **why the bytes do not travel
  through the request**: a Vercel Function refuses a body over **4.5 MB**
  (`413 FUNCTION_PAYLOAD_TOO_LARGE`, read at source 2026-08-09) and the product accepts
  photographs up to **50 MB** (`MediaUpload.tsx:11`). *«Whoever comes to 'simplify' this
  route into one that accepts the file must read the two numbers above first.»*
- The route picks the bytes up with the service role, **strips metadata**
  (`src/lib/media/strip-metadata.ts`, asserted by `npm run verify:media-strip`), and only
  then writes to the public bucket. *«A file that has not been stripped is reachable by
  nobody.»*
- The permission predicate is a **plain module**, not an export of a `"use server"`
  file — `src/lib/media/may-upload.ts:27-34`: *«A file marked `"use server"` publishes
  every export as a public endpoint»*, so leaving the predicate there would publish an
  oracle.

**What Phase 45 must decide, and it is a real question:** `mayUploadToParty` is
**per-night** by signature, on purpose (`may-upload.ts:36-48` records the rename and the
blast radius that forced it). A dj photo archive has **no night** — the whole point of
D-45-08 is that the archive precedes the listing, and the listing precedes the night.
So the archive needs either a second predicate (`mayUploadToVisualSection`, asking the
visual section key) or a nullable-party arm on the existing table. **Recommendation: a
second predicate in the same module, and a `party_id`-less row**, because widening
`mayUploadToParty` to accept a null night is exactly the direction its own docblock
warns against. And the **public bucket** is the wrong destination for an archive photo
that has not been published yet — the destination is a question the plan must answer,
not assume.

### F5. The conversion manifest

`scripts/conversion-manifest.mjs:488+` (`CONVERTED`) is the Phase 41 conversion
manifest. **The calendar surface is not in it** — grep returns one prose mention at
`:612` and no entry — because it was built *after* the conversion, directly on the
primitives. The three new sections are in the same position: **no manifest entry
needed**, and `verify:conversion`'s scope is the manifest and nothing else
(`verify-conversion.mjs:121`).

**The consequence to state rather than discover:** these surfaces are therefore
**outside** `verify:conversion`'s walk. The mechanical half is the section-surface gate
of §E4, and if that gate is not built, nothing automatic looks at these files at all.

---

## G. Risks and unknowns

### G1. Criterion 1 has no observable subject in production — and no workaround

**D-45-03 is a locked decision and the consequence was read before choosing.** All three
new keys go to master and organizer; both roles hold all of them. There is no account for
which "holds one section, refused the others" is a true sentence.

**What closes it:** structural evidence — the four policy quals read from `pg_policies`
naming four different keys, and the four grant sets read from
`private.role_capabilities` — **plus** a written manual procedure with a hand-made
account. That procedure's result is a `human_needed` line, and
`44-VERIFICATION.md`'s frontmatter is the format.

**What must not be proposed:** fabricating a differentiated role in production to make
the criterion green. Creating an account is a production write; granting it one section
and not the others is a **change to the access model** that D-45-03 explicitly rejected.
A criterion made green by changing the thing it measures is worse than an open criterion.

**What the verification document must say, in its own words:** that a green build is not
a proof of refusal. It is the same shape as Phase 44's criterion 4 and it is the reason
D-45-18 and D-45-19 exist.

### G2. A hand-made `staff` account is a production write with its own cost

`profiles` holds zero `staff` rows. A staff account is the strongest subject for
criterion 4 (it is the refusal `20260815120100:118-123` argues for by name) and for
criterion 1's manual procedure.

Creating one is a **production write** and needs its own dated authorisation, per
`ai-engineering.md`'s *gate l'autorizzazione a scrivere in produzione e' un atto* — the
same ritual D-45-07's seeding needs, and **not the same authorisation**: one act, one
grant, spent once. Phase 38's P6 is the recorded precedent of an executor stopping before
even the snapshot because the authorisation to start did not exist.

**The member account is available without any of that**, holds no production key, and
produces a genuine refusal. The plan should use it as the primary subject and treat the
staff account as an escalation the owner may or may not authorise.

### G3. The `error.details` hazard, and what D-45-18 actually binds

`.planning/todos/pending/postgrest-details-leaks-the-row.md` (measured 2026-08-08, plan
43-01, still open):

- On a `CHECK` violation, PostgREST's `error.details` contains `Failing row contains
  (<uuid>, <address>, <full_name>, <membership_code>, …)` — **the whole row**.
- **No endpoint sends the error object to a client**: zero `NextResponse.json({… error
  …})` under `src/app/api/`, and `error.details` is read nowhere in `src/`.
- The leak reaches **server logs**, through `console.error("<category>", error)`.

**Measured this session, on the current tree:**
`/usr/bin/grep -rn 'console\.error(["\`'"'"'][^"\`'"'"']*["\`'"'"'], *error)' src` →
**31 sites**. The todo says ~20; the difference is that this pattern also matches
`catch (error)` handlers where the object is not a PostgREST error. Either way, **the
order of magnitude is right and the direction is worse, not better.**

**Why it gets sharper in this phase, and this is the part that is new:** until now what
could reach a log was a profile row. **With D-45-05 what can reach it is the name of a
space under negotiation.** And this project has **no error tracking** — no monitoring
dependency in `package.json:39-61` — so nobody would notice.

D-45-18 binds **this phase's own write paths only**. The `announceNight` and
`tickChecklistItem` paths already comply (`actions.ts:740-746`, `:800-806`:
`code=${e?.code ?? "unknown"} message=${e?.message ?? …}`). Every new write path copies
that form. **The pre-existing sites stay with the todo, and closing the todo would claim
a cleanup this phase does not perform.**

### G4. The remaining risks, named with their situation

| Risk | The concrete situation | Mitigation |
|------|------------------------|------------|
| **A window in the key split** | The migration is applied, the deploy is delayed by a failed build, and `/admin/calendar` is a redirect to `/dashboard` for the master, with nothing in a log | §A4's additive-then-retire sequence removes the window entirely |
| **`verify:capabilities` red mid-sequence** | Somebody reads a red as a failure and "repairs" it by editing the constants ahead of the deploy | Declare the red in advance, in the plan, with the two intervals named |
| **A route-pattern tie** | Four new static `/admin/<section>` addresses; a tie throws at module load in a **middleware** bundle → 500 on the payments webhook and the door | `node scripts/verify-routes.mjs --print-patterns` before writing; deploy on a day without a night; make the first request yourself |
| **The tab lands before the page** | `staff-tabs.ts` refuses by name at build time — this one is *safe*, and it is the reverse (a map entry with no page) that is silent | Page → map → tab, three plans, in that order |
| **A second upload mechanism** | The archive gets its own upload because the existing one is per-night | §F4: a second predicate, one path |
| **The capitolato carries a hex literal** | `verify:semantic-separation` check B goes red on the visual section | §E3: read from the token file at runtime; do not add an exemption |
| **A `formats.color` swatch drawn large** | A format with no palette is handed one, and it is *«the exact way a format loses its identity before having one»* | No automatic check sees size. A written procedure with a named observer |
| **The seeding script has no input** | D-45-07 cannot run; the location section ships empty and the phase's headline capability is unexercised | §C2.5: the owner exports to `docs/` on the D-44-04 ritual, **before** the seeding plan is scheduled |
| **A seeded row above `mapped`** | A high score becomes a stage; *ranking-is-not-availability* encoded into data | The script does not write the column at all; the default does it |
| **A view joins scouting to `venues`** | PostgREST serves it; a space under negotiation becomes reachable | §D3: no view in `public` joining the two, asserted by the export gate's closure walk |
| **The refusal probe goes green on emptiness** | Five of six calendar tables hold 0 rows; `[]` from a master and `[]` from a member are the same bytes | §B4: assert a pair; REFUSE (exit 2) when the positive control returns 0 |
| **A minted session outlives the run** | A real person's session token exists after the procedure | `revoke.mjs`'s pattern: sign out globally, then **verify** the token no longer resolves |

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Binding a surface to a capability | A second map, a prefix rule, a role check in a page | `CAPABILITY_ROUTES` + `resolveRoute` + `staff-tabs.ts` | The compiler holds two directions of it; the tab loop holds a third; `verify:routes` holds the fourth |
| The four stages badge | A new badge | `admin/calendar/StageBadge.tsx` | Same vocabulary, already built for D-44-05 |
| A colour swatch | A new picker | `admin/formats/ColorSwatchPicker.tsx` | Already a named exemption in two gates |
| File upload | A new route that accepts a file | quarantine bucket + `POST /api/media/finalize` | The 4.5 MB / 50 MB numbers, and the metadata stripper |
| A confirmation for a consequential act | A `window.confirm`, a toast | `Dialog` + `AnnounceNightDialog`'s shape | `verify:dialogs` counts the native shells that are left |
| Minting a session | `signInWithPassword` with a password in an env var | `generateLink` + `verifyOtp` (`docs/36-13-v3/mint-session.mjs`) | No password needs to exist anywhere; already authorised and proven once |
| An export document format | A PDF library | Markdown or a print-ready HTML view | **No PDF dependency exists** (`package.json:39-61`). A new package is a new supply-chain surface for a document the owner can print |
| A capability resolver | Re-deriving the profiles→grants join in a function | `private.has_capability` | CAP-01 keeps that join in exactly one place because two implementations of one table-driven rule drift; and D-04 refuses a function answering a yes/no about an arbitrary identifier, since this repository has **no rate limiting anywhere** |
| A monotone guard in application code | A check in the caller | A `BEFORE UPDATE` trigger | *A guard in the database survives the caller that forgot it* |

**Key insight:** almost nothing in this phase is a new mechanism. Phase 44 built the
section pattern once and Phase 41 built the visual layer; Phase 45's genuinely new
artefacts are **two** — the four-way key split, and the instrument that authenticates as
a real role. Everything else is the pattern three more times, and a plan that treats it
as three greenfield features will re-solve problems this repository has already paid for.

---

## Common Pitfalls

### P1. Reading `supabase/schema.sql` and concluding there is no RLS
`schema.sql` holds **zero** `ENABLE ROW LEVEL SECURITY` and **zero** `CREATE POLICY`.
All of it is in `supabase/migrations/`. **Warning sign:** any sentence beginning "the
schema does not enforce…".

### P2. Editing an applied migration
`20260815120100` is applied. `20260815120200` exists **because** the correction travelled
forward instead of rewriting it — *«rewriting a file that has been applied makes the
history a description of something that never ran»*. **Warning sign:** a diff touching a
migration whose version is in `supabase_migrations.schema_migrations`.

### P3. Adding a policy beside an unconditional one
PERMISSIVE policies are **OR'd**. `venues_select_public` had to be **dropped**, not
narrowed beside (`20260810161000:200-204`). **Warning sign:** a new policy described as
"restricting" an existing one.

### P4. Dropping the `(SELECT …)` wrapper when rewriting the six policies
It is what makes the call an InitPlan, once per statement. `STABLE` does not do it, and
`20260224_rbac_migration.sql:97-98` says it does — 26 policies were written unwrapped on
the strength of that comment. **Warning sign:** a rewritten policy whose `qual` in
`pg_policies` no longer begins `( SELECT `.

### P5. A capability key with no grant row
Resolves `false` for everyone including the master, silently. **Warning sign:** a
surface that is empty for the account that built it.

### P6. Forgetting the `REVOKE` before a function `GRANT`
Postgres grants EXECUTE to PUBLIC by default. `20260815120200` exists entirely because
of this. **Warning sign:** a `GRANT EXECUTE` with no `REVOKE ALL` above it.

### P7. An unqualified PostgREST embed
An embed through a table with more than one relationship to the embedded table answers
`HTTP 300 PGRST201` — and **fails silently through this client**: `data` comes back null
with no exception, and the page renders nothing. Measured precedent: `party_series`
through `event_parties`. **Every new embed must be checked against the foreign keys in
the migration**, the way `(work)/calendar/page.tsx:117-139` documents its four.

### P8. Throwing a refusal out of a Server Action
Next redacts the message in a production build. Refusals travel as returned values, with
one sentence per cause and never a shared *something went wrong* — the newsletter
precedent this project has already paid for once.

### P9. Believing a green from a gate that never fires
`verify-conversion.mjs:75` and `probe-forged-identity.sh:44-46` both say it. Every
negative assertion in this phase needs a positive control beside it.

### P10. A grep reddened by the sentence forbidding the thing
`formats/actions.ts:58-63`: *a grep whose only match is the sentence forbidding the thing
is a grep that gets ignored the third time it goes red.* Every source-scanning gate in
this repository reads through `scripts/lib/comments.mjs`, the one stripper, whose stated
error direction is *blanks more, never less*, and which **refuses** rather than reporting
a green on a file whose comment never closes.

### P11. Using a bare `grep` on this machine
`MEMORY.md` records a live trap: `grep` resolves to `ugrep`, which **silently skips**
files containing NUL bytes (`-I`). Use `/usr/bin/grep` or the Read tool. Every grep in
this document used `/usr/bin/grep`.

---

## Runtime State Inventory

**This phase renames a live capability key**, so this section applies. The question is:
*after every file in the repo is updated, what runtime systems still hold the old
string?*

| Category | Items found | Action required |
|----------|-------------|-----------------|
| **Stored data** | `private.capabilities` — **1 row**, `key = 'production.read'`. `private.role_capabilities` — **2 rows**, `(master, production.read, false)` and `(organizer, production.read, false)`. Measured 2026-08-17 | **Data migration.** Not a code edit: the rows are the model. Migration 1 adds, migration 2 removes, `DELETE … WHERE key = '…'` **by key**, never by a `LIKE 'production%'` selector |
| **Policy bodies** | **6 policy `qual`s** in `pg_policies`, each containing the literal string `'production.read'`. A policy body is compiled SQL text in the catalogue, not a file | **Data migration.** `DROP POLICY IF EXISTS` + `CREATE POLICY` on all six, in the same transaction as the key mint |
| **Live service config** | **None.** No external service holds this string. Vercel env vars carry no capability key (`.env.local` names 11 variables, none of them a key). Verified: the eleven names are `SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `NEXT_PUBLIC_APP_URL`, `MASTER_EMAIL`, `TICKET_SIGNING_SECRET`, `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE` | None |
| **OS-registered state** | **None.** No cron, task or launchd entry references a capability key. `vercel.json`'s cron paths are URLs | None |
| **Secrets / env vars** | **None** — see above | None |
| **Build artifacts** | **The deployed Vercel bundle.** `capability-routes.ts` and `keys.ts` are compiled into the middleware bundle and every page bundle; the old key string lives there until the deploy replaces it. **This is precisely why the order matters** | The deploy. And the module-load assertion in the middleware bundle fires on the **first request after the deploy**, not at `npm run build` |
| **Cached client state** | The service worker (`src/app/sw.ts`) caches **documents**, not capability strings. A stale `/admin/calendar` document served from a `NetworkFirst` 24 h cache would render a page whose server-side guard has already been replaced — the guard runs on the server, so the cached document is a **display** risk, not an access one | None, but worth one line in the deploy note |

**Nothing found in a category is stated explicitly above.** A blank cell would not
distinguish *checked and empty* from *not checked*.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | ✓ | (repo runs `next build` today) | — |
| `@supabase/supabase-js` | D-45-19's instrument, D-45-07's seed | ✓ | `^2.97.0` (`package.json:41`) | — |
| `@supabase/ssr` | the cookie-bound read path | ✓ | `^0.8.0` (`package.json:40`) | — |
| Supabase **Management API** | applying migrations, catalogue read-back | ✓ | `SUPABASE_ACCESS_TOKEN` present in `.env.local`; five `read_only` queries succeeded this session | — |
| Supabase **CLI** | — | ✗ | — | **Not needed.** Migrations are applied through the Management API's *migrations* endpoint, which is what keeps the history truthful |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | minting and reading as a role | ✓ | legacy JWT form (`eyJhbGciOiJI…`), so `@supabase/supabase-js` accepts it as an `apikey` | — |
| `SUPABASE_SERVICE_ROLE_KEY` | `generateLink` / `signOut` only | ✓ | present | — |
| `MASTER_EMAIL` | the positive control | ✓ | present | — |
| **A member account's email** | the refusal subject | ✗ **not in the environment** | — | Read it at run time from `public.profiles` with the service client, **inside the instrument**, and never print it. Or add a dedicated env var |
| A **`staff`** account | the strongest refusal subject | ✗ **zero rows** | — | Use a member; escalate to the owner if a staff subject is wanted (§G2) |
| The **scouting export** | D-45-07 | ✗ **not on this machine** | — | Owner supplies it into `docs/` on the D-44-04 ritual (§C2.5) |
| A PDF library | D-45-17 | ✗ | — | **Not needed** — Markdown or a print view |
| A test runner | — | ✗ | — | **Not available and not coming.** `package.json` has no `test` script and there are no `*.test.*` / `*.spec.*` files |
| Error tracking | observability | ✗ | — | **None.** A logged error reaches nobody; a failure that matters needs an observable effect |

**Missing with no fallback:** the scouting export (blocks D-45-07's plan, not the phase).
**Missing with a fallback:** the staff account, the member email.

---

## Validation Architecture

`.planning/config.json` does not set `workflow.nyquist_validation`, so it is **enabled**.

### Test framework

| Property | Value |
|----------|-------|
| Framework | **None.** No `test` script in `package.json:6-27`; no `*.test.*` / `*.spec.*` in the tree |
| Config file | none |
| Quick run | `npm run build` — which **is** the Next typecheck; there is no separate `typecheck` script |
| Full suite | `npm run verify` (`scripts/verify-all.mjs`, 16 offline gates) + `npm run build` |

**This is a `CLAUDE.md` Guardrail 1 repository. No plan step may claim "the tests will
catch it."**

### Phase requirements → evidence map

| # | Behaviour | Kind | Command | Exists? |
|---|-----------|------|---------|---------|
| 1a | Four policies ask four different keys | catalogue read | `npm run verify:capabilities` (extended: side 2 already reads policy keys, `verify-capabilities.mjs:969-999`) | ✅ extend |
| 1b | Grants are the same two roles on all four keys | catalogue read | `npm run verify:capabilities` side 5 | ✅ extend |
| 1c | A holder of one section is refused the others | **manual, hand-made account** | written procedure | ❌ **Wave 0 — a procedures document** |
| 2a | `stage` cannot be absent or invalid | constraint | probe the CHECK in a throwaway container, `scripts/rls-baseline-container.mjs`'s pattern | ❌ new |
| 2b | `acquired` is impossible without an evidence line | constraint | same | ❌ new |
| 2c | The stage is **visible** wherever the space is named | source assertion + a person | `verify:section-surface` (new) + written procedure | ❌ **Wave 0** |
| 3a | `not_decided` cannot exist without `missing` + `decision_owner` | constraint | container probe | ❌ new |
| 3b | The void reads as declared, not as broken | **manual** | written procedure | ❌ **Wave 0** |
| 4 | Every section's read path is refused by a session lacking its key | **the instrument** | `npm run verify:refusal` (new) | ❌ **Wave 0 — the phase's headline artefact** |
| D-45-17 | The export cannot reach the forbidden tables | source assertion | `npm run verify:section-export` (new) | ❌ new |
| D-45-18 | New write paths log `code`/`message` only | source assertion | a check in the section-surface gate | ❌ new |
| D-45-09 | No hex literal outside the two exemptions | source assertion | `npm run verify:semantic-separation` **already covers it** | ✅ exists |
| D-45-16 | No `sem-` utility on a line with a format identifier | source assertion | `verify:semantic-separation` check C | ✅ exists |
| D-45-04 | The map, the tabs and the disk agree | build + script | `npm run build` + `npm run verify:routes` | ✅ exists |

### Sampling rate

- **Per task commit:** `npm run build`.
- **Per wave merge:** `npm run build` + `npm run verify` (16 offline gates) + `npm run
  verify:capabilities` **when a database is reachable and the key sequence is settled**.
- **Phase gate:** all of the above, plus `npm run verify:refusal` run once with its
  owner authorisation, plus every written procedure carrying a `Result:` other than
  `pending`.
- **`npm run verify:persona`** only if any `.claude/rules/**` file is touched — with the
  changelog entry and version bump in the same commit.

### Wave 0 gaps

- [ ] `scripts/verify-refusal.mjs` — criterion 4, and the phase's headline artefact
- [ ] `scripts/verify-section-export.mjs` — D-45-17's structural proof
- [ ] `scripts/verify-section-surface.mjs` — criteria 2 and 3's mechanical half, plus
      D-45-18's grep
- [ ] `45-PROCEDURES.md` — the written procedures for 1c, 2c, 3b and the `formats.color`
      size judgement, on `44-PROCEDURES.md`'s model, with every `Result:` starting at
      `pending`
- [ ] A fourth list in `scripts/verify-all.mjs` — `NEEDS_AUTHORISATION`, declared and
      never run
- [ ] The scouting export in `docs/` — **an owner act, and it gates D-45-07's plan**

**`45-VALIDATION.md` will be `nyquist_compliant: false`, deliberately**, and for the
same reason Phases 36, 31 and 44 were: the criteria that matter close on a person's
observation, and pretending otherwise is the failure this repository is built to avoid.

---

## Security Domain

| ASVS category | Applies | Standard control here |
|---------------|---------|----------------------|
| **V1 Architecture** | yes | The boundary is RLS; the middleware is UX. Written in `CLAUDE.md` principle 2 and repeated in `capability-routes.ts:583-590` |
| **V2 Authentication** | yes | Supabase Auth. **This phase mints a session** (D-45-19) — an act on a real identity, requiring authorisation and a verified revocation |
| **V3 Session Management** | yes | `@supabase/ssr` cookie chunking. The instrument must revoke globally and **verify** the revocation |
| **V4 Access Control** | **yes — this is the phase** | `private.has_capability` + one SELECT policy per table per section key. **Deny by default:** a key with no grant resolves `false` for everyone |
| **V5 Input Validation** | yes | No validation library in `package.json`; the house pattern is a named SQL `CHECK` mirrored in a TypeScript `as const` tuple, plus a `UUID_PATTERN` regex in the action (`actions.ts:133-135`). **Do not add a validation dependency for this** |
| **V6 Cryptography** | no | Nothing new is signed or encrypted |
| **V7 Error Handling & Logging** | **yes — and it is the sharpest one** | D-45-18. And there is **no error tracking**, so a log is a place nobody looks: any failure that matters needs an **observable effect** |
| **V8 Data Protection** | **yes** | The whole content of these sections is the secret. `.planning/` is public; `docs/` and `.firecrawl/` are gitignored and held there by check F |
| **V12 Files** | yes | D-45-08's archive rides the quarantine bucket + metadata stripper, not a new path |
| **V13 API** | yes | Every export of a `"use server"` module is a public endpoint (`may-upload.ts:27-34`). The gate helper stays unexported |

### Threat patterns for this stack

| Pattern | STRIDE | Mitigation, as this repository already writes it |
|---------|--------|--------------------------------------------------|
| A space under negotiation reaches a public page | **Information disclosure** | D-45-10's separate list; `venue_for_parties` reads only `event_parties→events→venues`; no view joining scouting to either |
| A space under negotiation reaches a **server log** | Information disclosure | D-45-18: `code` and `message`, never the object, never `details` |
| A space under negotiation reaches **`.planning/`** | Information disclosure, irreversible | Criteria never candidates; this document included |
| A capability key resolves `false` and closes a surface silently | **Denial of service** | §A4's zero-window sequence; `verify:capabilities` side 5 |
| A widened read arm on a "harmless" table | Elevation of privilege by degrees | `20260815120100:236-244` names the reasoning and refuses it |
| A `SECURITY DEFINER` function reachable by `authenticated` | Elevation of privilege | REVOKE-then-GRANT, two statements; `20260815120200` is the receipt |
| A function that answers yes/no about an arbitrary identifier | Information disclosure | D-04 refuses the shape — **there is no rate limiting anywhere in this product** |
| A minted session outliving its procedure | Spoofing | Global sign-out and a **verified** revocation |
| A route-pattern tie taking down the middleware | Denial of service | `verify:routes --print-patterns`; deploy without a night; first request by hand |

---

## Package Legitimacy Audit

**This phase installs no external packages.**

Every capability it needs is already a dependency (`@supabase/supabase-js ^2.97.0`,
`@supabase/ssr ^0.8.0`) or a platform primitive (`fetch`, `node:fs`). The two candidate
temptations were weighed:

| Temptation | Verdict |
|------------|---------|
| A PDF library for D-45-17 | **Refused.** Markdown or a print view. A new dependency for a document the owner can print is supply-chain surface bought for nothing |
| A validation library for the section forms | **Refused.** The house pattern is a named SQL `CHECK` mirrored in a TypeScript `as const` tuple, and it is the pattern eight tables already use |

| Package | Registry | Disposition |
|---------|----------|-------------|
| *(none)* | — | No install step in this phase |

`slopcheck` was not run, because there is nothing to check. **If a plan later proposes a
package, it runs the legitimacy gate first and the install sits behind a
`checkpoint:human-verify`.**

---

## Project Constraints (from CLAUDE.md)

Extracted as directives, because a plan is checked against them:

1. **Respond in Italian** (global directive). This document is English by explicit
   instruction, matching the corpus.
2. **Classification header on every response.** Phase 45 is **Critical** — it touches
   access and venue secrecy. Impact analysis and owner validation **before** acting.
3. **The gating is the product.** Any change to who sees what is not a convenience.
4. **The middleware is UX; the RLS is the boundary.**
5. **The money path's verify-never-trust rule** — untouched here, and no new path
   inherits it.
6. **The venue secret is monotone.** Untouched, and nothing here may bring a reveal
   forward.
7. **Zero silent failures.** Every error path logs a distinguishing category **and** has
   an observable effect.
8. **Production has invariants as strict as code.** The four stages, the pipeline
   anchors, the numbering.
9. **Lexical precision.** A *format* is not an *event*; `member` is not `approved`; a
   *LiveCut* is not a *Podcast*; **`re:sonate` with a normal `e`**, `SunSet` / `RamaDub`
   / `MotionLab` in CamelCase.
10. **Guardrail 1 — no test runner.** Verification is `npm run build` plus written
    procedures.
11. **Guardrail 3 — migrations are the schema's truth**, not `schema.sql`.
12. **Guardrail 4 — `.planning/codebase/` is stale.** Verify against the tree.
13. **Guardrail 5 — the repository is PUBLIC.** Every commit is a publication.
14. **Guardrail 6 — macOS/BSD.** `grep -E`, `sed -i ''`. And `/usr/bin/grep`, never bare
    `grep`.
15. **The VERIFICATION.md gate.** Requirements covered, **concrete evidence per
    requirement** — `file:line`, an observable behaviour, a manual step actually
    performed — anti-patterns found, deferred debt. *A VERIFICATION.md without a single
    `file:line` citation does not satisfy the gate.*

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Three-segment keys (`production.<section>.manage`) are acceptable to the owner | §A6 | A rename after the split — the one thing D-45-04's sequencing exists to avoid doing twice |
| A2 | The three **new** keys carry `requires_approved = false` like the calendar's | §A6 | A pending organizer reads a section, or an approved one is refused. **This is an owner question**, and the calendar's `false` came from D-44-27, not from a general rule |
| A3 | The scouting export will carry a stable per-record identity | §C2.5 | The seed is not re-runnable without duplicating, breaking D-45-07 constraint 2 |
| A4 | The scouting export carries scores already computed per format | §C2 | Either the score table ships empty, or somebody re-derives scores — the *derived is not verified* error committed by the tool built to prevent it |
| A5 | Writes go through the service client with the guard in the action (option A) | §C4 | If option B is wanted, the policies and the error-handling shape both change |
| A6 | The `production_space` table name | §C2 | Cosmetic, but it must not contain the word `venue`: a table called `production_venue` invites exactly the confusion D-45-10 exists to prevent |
| A7 | The dj photo archive's destination bucket is **not** the public one | §F4 | An unpublished archive photo becomes publicly reachable |
| A8 | 31 whole-error `console.error` sites, of which the todo's "~20" are PostgREST paths | §G3 | Only affects how the deferred todo is described; D-45-18 binds new paths regardless |
| A9 | `NEEDS_AUTHORISATION` as a fourth `verify-all` list is the right registration | §B6 | Cosmetic; the requirement is that the instrument is *declared and not spawned* |

---

## Open Questions

1. **`requires_approved` on the three new keys.**
   - **Known:** the calendar's `false` is D-44-27's, and the migration writes down that
     it is *«a BET on the signup path staying closed»*. `keys.ts` has now argued three
     times that the door's reason for `false` **does not travel**.
   - **Unclear:** nobody is standing in a queue in front of a manifesto either — so the
     door's reason does not apply, but neither does its opposite.
   - **Recommendation:** carry D-44-27's answer to all four, since it is about the
     account model rather than the surface, and **say so in the migration's prose with
     the bet restated**. It touches access, so it returns to the owner.

2. **Write policies on the new tables — option A or B (§C4).**
   - **Recommendation:** A, with the declaring paragraph carried across verbatim. Flag
     it for the owner only if B is chosen, since B changes what a refused write returns.

3. **Where the scouting export comes from, and in what shape (§C2.5).**
   - **Blocking for D-45-07's plan only.** The rest of the phase does not wait on it.
   - **Recommendation:** the owner exports the record array to `docs/`, gitignore
     verified before it is read, D-44-04's order exactly.

4. **Whether a `staff` account is created for the manual procedures (§G2).**
   - A production write with its own authorisation. The member account works without it.
   - **Recommendation:** plan with the member; offer the staff account as an escalation.

5. **`production_space.address` — does the scouting row carry one at all?**
   - If it does, it is the most consequential column in the phase and the promotion must
     decide explicitly whether it travels to `venues`.
   - **Recommendation:** the seed writes no address unless the owner asks for it. An
     address the product does not hold is an address the product cannot leak.

6. **The dj photo archive's bucket and lifecycle (§F4).**
   - The existing path publishes to a public bucket after stripping. An archive photo is
     not published.
   - **Recommendation:** a third bucket, or the quarantine bucket with a longer life and
     a section-key read policy. **This must be decided before the upload plan is
     written**, not inside it.

7. **Does `verify:refusal` become a phase gate for later phases too?**
   - Out of scope to claim (`<deferred>`), but the plan should not *prevent* it: keep
     the section list a declared constant so a later phase adds a row rather than a
     script.

---

## Sources

### Primary — measured this session (HIGH confidence)

- The live catalogue, five `read_only: true` Management API queries: `private.capabilities`
  (14 rows), `private.role_capabilities` (production grants), `pg_policies`
  (6 production policies + 4 venues policies), `pg_stat_user_tables` (row counts),
  `pg_class.relacl` (table ACLs), `information_schema.columns` (venues),
  `supabase_migrations.schema_migrations` (tail), `public.profiles` grouped by
  role/status (aggregate only).
- `supabase/migrations/20260815120100_production_calendar_access.sql` — read in full.
- `supabase/migrations/20260815120200_production_checklist_tick_revoke.sql` — read in full.
- `supabase/migrations/20260807000000_capability_model.sql` — §1–§5, `:120-125`, `:192-224`.
- `supabase/migrations/20260807010000_policies_to_capabilities.sql:395-417`.
- `supabase/migrations/20260810161000_venues_read_narrowed.sql:99-102, 162-165, 190-260, 371-397, 548-561`.
- `supabase/migrations/20260810120000_formats_and_series.sql:118-190`.
- `supabase/migrations/20260815120000_production_calendar.sql:43-52, 168-301, 328-465, 495-540, 568, 648-728, 827-846, 942-1053`.
- `src/lib/capabilities/keys.ts` — read in full (264 lines).
- `src/lib/routes/staff-tabs.ts` — read in full (219 lines).
- `src/lib/routes/capability-routes.ts:159-320, 560-700`.
- `src/app/(admin)/admin/calendar/actions.ts:60-140, 640-830`.
- `src/app/(admin)/admin/calendar/AnnounceNightDialog.tsx:1-120`.
- `src/app/(admin)/admin/(work)/calendar/page.tsx:100-140`.
- `src/lib/media/may-upload.ts:1-60`; `src/app/api/media/finalize/route.ts:1-52`.
- `src/app/globals.css:14-430`.
- `scripts/verify-all.mjs:180-300`; `scripts/verify-capabilities.mjs:42-76, 147-200, 247, 547-555, 919-999`;
  `scripts/verify-calendar-surface.mjs:1-70`; `scripts/verify-semantic-separation.mjs:30-70, 190-215`;
  `scripts/verify-routes.mjs:1-30`; `scripts/verify-conversion.mjs:75, 121, 206, 671`;
  `scripts/conversion-manifest.mjs:488-530`; `scripts/rls-baseline.mjs:82, 215-300`;
  `scripts/probe-forged-identity.sh:1-60, 225-260`.
- `docs/36-13-v3/mint-session.mjs` (83 lines) and `docs/36-13-v3/revoke.mjs` (13 lines) —
  gitignored, read locally, **nothing from them written here but the mechanism**.
- `.firecrawl/` and `docs/` — **structure only**: file counts, extensions, directory names.
- `find /private/tmp/claude-501 -name "resonate-production*.html"` → empty;
  `find /Users/etiesse -maxdepth 6 -name "resonate-production*"` → empty.
- `/usr/bin/grep` censuses: 22 `production.read` sites in 9 files; 31 whole-error
  `console.error` sites; 514 files under `.firecrawl/`.

### Secondary — project documents (HIGH, they are this project's own decisions)

- `.planning/phases/45-…/45-CONTEXT.md`, `.planning/phases/44-…/44-CONTEXT.md`,
  `44-VERIFICATION.md`, `44-RESEARCH.md` (structure), `41-UI-SPEC.md` §8.
- `.planning/ROADMAP.md` §Phase 45; `.planning/REQUIREMENTS.md:147-148, 269-270`;
  `.planning/STATE.md`; `.planning/config.json`; `.planning/todos/pending/*`.
- `.claude/rules/`: `venue-acquisition.md`, `sound-manifesto.md`,
  `brand-visual-system.md`, `production-calendar.md`, `legal-compliance.md`,
  `meta-gates.md`, `supabase-data.md`, `nextjs-architecture.md:64-102`.
- `CLAUDE.md`.

### Tertiary — LOW, flagged

- The scouting archive's location and record shape: from the project's **memory note**,
  not from a file that exists today. Treated as a **finding to confirm with the owner**
  (§C2.5), never as a specification.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| The key split's current state | **HIGH** | Read from `pg_catalog` and from the migration file, and the two agree |
| The zero-window sequence | **HIGH** | Follows from the resolver's body, which was read, and from the grant constraint D-45-04 already imposes |
| The session-minting mechanism | **HIGH** | A working script on this machine, used once under owner authorisation, with its revoke beside it |
| The refusal's shape (`200 []`) | **HIGH** | ACLs read from `pg_class.relacl`; the privilege system cannot fire |
| The subject population | **HIGH** | Aggregate query, 2026-08-17 |
| The three tables' shape | **MEDIUM** | A recommendation built from eight measured house patterns, not a measurement. The scouting columns depend on an export nobody has seen |
| The seeding source | **MEDIUM** | The absence is measured; what replaces it is the owner's |
| The export's mechanism | **MEDIUM-HIGH** | The gate family and the `verify:semantic-separation` collision are measured; the document format is a recommendation |
| Pitfalls | **HIGH** | Every one of them is a defect this repository already paid for, with the file that records it |

**Research date:** 2026-08-17
**Valid until:** ~2026-09-16 for the codebase claims (nothing here moves fast), but
**invalid the moment the calendar import runs** — the row counts in §A1 and §B4 are what
make the refusal probe's design what it is, and a populated `production_plan` changes
which tables are usable subjects. Re-read the counts before writing the probe.
