# Phase 45: Production Sections, Section by Section - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Three production sections enter the product — **the sound manifesto, the visual
system, and location (scouting)** — and the calendar built in Phase 44 becomes a
**fourth section under the same model**. Each section is entitled separately,
because they do not carry the same risk: scouting holds open negotiations, the
visual system holds nothing secret.

**What this phase does NOT build.**

- **The legal and community sections.** The owner asked for five in one breath
  during Phase 44; this phase delivers three, and the other two stay outside the
  product where they are today (D-45-01). They are not "later" by omission —
  they are out of scope by decision.
- **The night model, the calendar, the checklist, the import of the `.ics`.**
  All of that shipped in Phase 44 and is not reopened. What this phase touches
  of Phase 44 is exactly one thing: the access key, which is split into four
  section keys (D-45-04).
- **A public surface of any kind.** Nothing in this phase is readable by an
  anonymous visitor or by a member. Every section is behind the work surface.

**The one thing that makes this phase different from a CRUD feature.** Its
content is the material this repository is forbidden to hold. `.planning/` is
tracked and therefore public (`ai-engineering.md`, *gate la pianificazione è
pubblica*), so this file — and every plan, research and verification document
downstream of it — carries **criteria and never candidates**: no space under
negotiation is named, no unannounced date, no line-up, no score, no contact.
That is not a style rule for the documents; it is the reason the sections exist
inside the product instead of inside the repository.

</domain>

<decisions>
## Implementation Decisions

### Sections, and who opens them

- **D-45-01:** **Three sections** enter the product — sound manifesto, visual
  system, location. Legal and community stay outside. *(Owner's choice over
  "five sections" and "three now, two declared empty".)*

- **D-45-02:** Entitlement is granted **to the role**, not to the person. Three
  keys, granted like the other fourteen. *(Owner's choice over a per-person
  grant modelled on per-night assignments, and over a hybrid.)*

- **D-45-03:** All three keys go to **master and organizer**. *(Owner's choice
  over a differentiated cut where location was narrower.)*

  **The consequence is accepted and was read before choosing, and planning must
  carry it rather than discover it.** Success criterion 1 reads *"a viewer
  holding one section is refused the others"*. With identical grants across the
  three keys and two roles holding all of them, **no subject exists in
  production for whom that refusal happens.** The criterion is therefore closed
  by structural evidence — the policies exist and are readable from the
  catalogue — plus a written manual procedure with a hand-made account, not by
  observation of a live refusal. **Say this in the verification document; do not
  let a green build read as a proof of refusal.** It is the same shape as Phase
  44's criterion 4, and it is the reason D-45-18 exists.

- **D-45-04 [BLOCKING — rewrites a live production access rule]:** The calendar
  becomes the **fourth section**. Today's single `production.read` key is split
  into four section keys under one naming schema, and the six SELECT policies
  applied by `20260815120100_production_calendar_access.sql` are rewritten to
  ask the calendar's own section key. One list of sections, read by the
  middleware, the page guard, the navigation and the row-level policies alike.
  *(Owner's choice over "leave the calendar alone and grow three keys beside it"
  and over "leave the key, declare the four together".)*

  **Constraints planning inherits:**
  1. **Owner checkpoint before applying**, as in Phase 44 — this touches access.
  2. **Order is migration → deploy, never the reverse.** The reverse leaves
     `/admin/calendar` asking for a key that no longer exists: pages down rather
     than degraded. This is the ordering Phase 37 already paid to learn.
  3. **The grants do not narrow or widen.** Master and organizer hold the
     calendar today and hold it after. A key rename that changes who can read is
     two changes in one diff and is not auditable against either question.
  4. `src/lib/routes/capability-routes.ts`, `src/lib/routes/staff-tabs.ts` and
     `src/types/database.ts` move in the same commit as the migration.

### Where the material comes from

- **D-45-05:** All three sections are **written inside the app**. The product
  becomes the source for them — deliberately unlike the calendar, where
  D-44-01 keeps the `.ics` as the source. *(Owner's choice over "local import
  for all three" and over "it depends on the section".)*

  **The cost was stated and accepted:** the names of spaces under negotiation
  now travel from a browser through a Vercel server. Phase 44 declined an
  in-product upload surface (D-44-26) on exactly this reasoning. The difference
  the owner is buying is that these sections are *authored* prose, corrected
  often, where the calendar is *derived* data imported whole. **D-45-17 is the
  mitigation and is not optional.**

- **D-45-06:** **Whoever reads a section, writes it.** One key per section
  covers read and write. *(Owner's choice over "master writes, organizer reads"
  and over "everything except moving a space to acquired".)* This keeps the
  thing criterion 1 asks to prove to a single door per section rather than two.

- **D-45-07:** The location section **seeds once**, with a local script, from
  the scouting research that already exists locally — **all rows at stage
  `mapped`** — and is edited from the page afterwards. *(Owner's choice over
  "starts empty and fills when somebody phones" and over "a handful typed by
  hand".)*

  **Constraints planning inherits:**
  1. This is a **production write** and needs its own owner checkpoint, spent
     once, for exactly what was described (`ai-engineering.md`, *gate
     l'autorizzazione a scrivere in produzione è un atto*).
  2. The script is **re-runnable without duplicating** — the same discipline as
     the calendar import (D-44-03), for the same reason.
  3. The source files are **gitignored and stay that way**. Nothing read from
     them is written into a tracked file, this one included.
  4. Every seeded row lands at `mapped`. **Nobody has been called** — the whole
     scouting body is desk work, and a row that arrived at a higher stage
     because a score was high would be the *ranking-is-not-availability* error
     encoded into data.

  **[RESOLVED 2026-08-17 — the source the researcher could not find.]** The
  research pass reported that the normalised records were gone: `.firecrawl/`
  holds raw crawl artefacts, and the working directory that held the structured
  array no longer exists. Both true. **The records survive in the owner's
  production artifact**, and were recovered from it and written to
  `docs/scouting-2026-08-17.json` on 2026-08-17 — **184 records, 27 fields,
  gitignored (`.gitignore:67`), confirmed invisible to git before anything else
  happened**. That file is the seeding script's input. The route back to the
  source, if it is ever needed again, is a fetch of the artifact URL followed by
  a bracket-matched extraction of its data array — not a crawler.

  **The seeding script therefore reads exactly one local file** and needs no
  network. Its shape is known in advance, which means the plan can specify the
  field mapping instead of discovering it at execution time.

- **D-45-08:** The visual section holds **the rules and the material together**
  — the capitolato (palette, typography, grid-safe zone, publication order,
  what is fixed and what is variable) beside the produced pieces, including the
  dj photo archive the Tuesday listing depends on. *(Owner's choice over
  "rules only" and "material only".)*

  **Consequence:** this pulls file upload into the phase. It is not built from
  scratch — see `<code_context>`.

### The spaces

- **D-45-09 (Claude's discretion, announced during the discussion):** The visual
  section **reads the palette from the design tokens** in
  `src/app/globals.css`, and never restates hex values in prose or in a row. Six
  colours written twice are six colours that diverge, and Phase 40 already made
  one place authoritative.

- **D-45-10:** Scouted spaces live in a **production list separate from
  `venues`**. When a space reaches `acquired`, an **explicit act** promotes it
  into `venues` — the same shape as announcing a night from a production plan
  (D-44-06). *(Owner's choice over "same table with a stage column" and over
  "same table, and the picker filters".)*

  **The measured reasoning, because the obvious version of it is wrong.** Read
  exposure would not have changed: Phase 37 dropped `venues_select_public`,
  there is deliberately no `anon` SELECT policy, and the one remaining read
  policy `venues_select_staff` asks `staff.manage` — held by **master and
  organizer only**, not by staff despite the key's name. That is the same
  audience D-45-03 gives the location section. **The real risk is the write
  side:** a scouted row inside `venues` sits in the same picker from which a
  night's venue is chosen, and one wrong selection puts it on a night, from
  where `venue_for_parties` serves its name and address **to the public**. A
  space under negotiation named on a public page is a negotiation closed badly,
  and it does not un-publish. With a separate list that selection does not
  exist.

- **D-45-11:** A space carries its **stage**, the **four answers that close a
  "to verify" column** — what rig is there, how many people actually fit,
  whether a guest dj may play, and until what hour — and **per-format scores**,
  each marked **derived** or **field-verified**. *(Owner's choice over
  "stage and the four answers only" and over "also regime and neighbours".)*

  **Two mitigations planning must build, because the owner accepted a stated
  cost rather than avoiding it:**
  1. **The stage is visible wherever the space is named** — success criterion 2
     says so, and it is what stops a score reading as an availability.
  2. **Derived and field-verified are distinguishable on screen**, not only in
     the data. A score computed from a public listing is a hypothesis; one
     checked on site for that format is a datum.

  **[REVISED 2026-08-17 after measuring the real source — this supersedes the
  storage shape implied above, not the decision.]** The archive was recovered
  and its 184 records inspected. Two findings change how this is built:

  - **A score is COMPUTED, never stored.** There is no score field in the
    source and there must not be one in the database. What the records carry is
    **attributes** — outdoor/sunset, music-already-at-home, rig, console,
    capacity band, exclusivity, evening licence, late hours, and others — and a
    score per format is derived from them with that format's declared weights.
    A hand-written score detaches from its attributes at the first edit; the
    archive already avoided that and the product must too.
  - **"To verify" is already encoded PER ATTRIBUTE, not per record.** Five
    attributes take the literal value `verifica` where the answer has not been
    asked. That is finer than the per-record derived/verified flag this decision
    originally implied, and it is the form to build: the four phone questions
    map onto existing attributes, and an unanswered one is visibly unanswered.

  Also measured: **numeric capacity is null on all 184** — only a size band
  exists. *"How many people actually fit"* therefore has no answer for any space
  today, and the surface must show it missing rather than inferring it from the
  band.

- **D-45-12:** Moving a space to **`acquired` requires a mandatory line saying
  where the agreement is** — a mail of such a date, a signed contract, an
  agreement in writing. A pointer, not an attachment. *(Owner's choice over "a
  stage change like any other" and over "a two-step confirmation".)* Acquired
  means **in writing**, and it is the stage that unlocks naming the space in a
  material.

- **D-45-13:** **No space is ever deleted.** A space that leaves the race keeps
  its row and carries **why** — out of identity, or it refused, and when.
  *(Owner's choice over archiving refusals to a separate view, and over adding a
  "worth asking again" date.)* Deleting loses the memory of the choice, and the
  choice gets remade from scratch at the first difficulty.

### The section that is not written yet

- **D-45-14:** A section carries **three states** — *written* / *coordinates
  declared* / *not decided* — and a not-decided section **says what is missing
  and whose call it is**. *(Owner's choice over two states, and over three
  states without the pending-decision register.)*

  This is the phase's answer to success criterion 3, and it is three states
  rather than two because the domain names two opposite errors: inventing where
  a rule already exists, and answering *"not decided"* where a coordinate has
  been declared. Concretely and already true today: one format's manifesto is
  written and closed; another is unwritten but carries declared coordinates
  including an explicit negative; another is unwritten with nothing declared.
  **A two-state model makes the middle one read as free.**

- **D-45-15:** An open question **warns and lets you proceed** — it does not
  block. *(Owner's choice over blocking the dependent piece, and over listing
  the question without any warning on the piece.)* Same rule the Phase 44
  checklist already follows (D-44-16), for the same reason: a block that fires
  under deadline is a block somebody routes around.

- **D-45-16:** A format **without a palette declares the void and shows the
  interim rule** — the materials stay neutral. The **identification colour**
  that every format carries in `formats.color` is never drawn as if it were a
  palette; it stays what the migration says it is, the dot on a chip. *(Owner's
  choice over declaring the void with nothing beside it, and over showing the
  identification colour with a label.)*

  **This is a real collision, not a hypothetical one.** `formats.color` is
  `NOT NULL`, so every format has one, including the one with no palette. A
  visual section that rendered that value large would hand a format a palette
  nobody decided — the exact way a format loses its identity before having one.

- **D-45-17:** There **is** an export, and it is **narrow by construction**:
  pressing export on the manifesto yields the manifesto, pressing it on the
  capitolato yields the capitolato. It cannot carry an address or an unannounced
  date **because it does not read those tables**, not because whoever presses it
  is careful. *(Owner's choice over no export at all, and over deferring it.)*

  **Constraints planning inherits.** These two documents are built to **leave
  the perimeter** — the manifesto goes to whoever plays, the capitolato to the
  external designer. The narrowness must be structural and testable: the export
  path reads the section's own tables and nothing else, and a plan proves it by
  showing what it cannot reach. `venue-secrecy.md` calls the capitolato an exit
  route; this is that exit route, built once and built tight.

### Answered after the research pass — 2026-08-17

These four came back from the researcher as open questions and were settled by
the owner the same day. They are **not** discretionary: three touch access or
venue secrecy.

- **D-45-20:** The three new section keys carry **`requires_approved = false`**,
  like `production.read`. Owner: accounts are created inside the app, nobody
  signs up, so `pending` is about to stop varying and gating on a value that
  does not vary is debt rather than safety. **This inherits the bet already
  written into `20260815120100_production_calendar_access.sql`:** if a path that
  can create a `pending` organizer is ever reopened, this flag is reconsidered
  **in the same commit**. Carry that sentence into the new migration's prose —
  a bet that is not written down is an assumption.

- **D-45-21 [raises the location section to Critical]:** **A scouting record
  carries a street address.** Confirmed by the owner and then measured in the
  source: field `z`, populated on all 184 records, 124 of which match a
  street/corso/piazza pattern and 81 carry a house number.

  **Four consequences planning must build, not assume:**
  1. The scouting table has **no foreign key, no view and no function** that can
     surface a row through `venue_for_parties` — the only public road to an
     address. D-45-10's separate list is what makes this structural; a plan must
     **demonstrate** the absence, not assert it.
  2. **The location section has no export.** D-45-17 covers the manifesto and
     the capitolato only. Location is the one section whose content must not
     leave the perimeter, and the export path must not be able to reach it.
  3. **D-45-18 is promoted from hygiene to Critical.** What a whole-error log
     line can now leak is the address of a space under negotiation, into logs
     nobody watches because there is no error tracking.
  4. The promotion act (D-45-10) is where the address crosses into `venues` and
     becomes subject to the reveal guard. It is the only crossing that exists.

- **D-45-22:** The `regime` field — present on all 184 source records, values
  `libera` / `privata` / `verifica` — **stays out of the product.** *(Owner's
  choice over importing it, and over importing it as a blocker on promotion.)*
  The cost is stated and reversible: the field survives in the local export, so
  recovering it later is a second import rather than new research. The
  neighbourhood constraint is absent from the source and stays out either way.

- **D-45-23 (not a decision — an authorisation consumed):** No hand-made `staff`
  account is needed. Two `member` accounts already exist and the production
  grants go only to `master` and `organizer`, so **criterion 4's refusal can be
  proven with accounts that already exist**. Criterion 1 remains unprovable by
  observation under D-45-03, and **no plan may fabricate a role grant in
  production to make it provable.**

### Claude's Discretion

The owner's standing delegation from Phase 44 holds: **every technical
checkpoint is the expert persona's call**, with the constraint that anything
touching access, money, the door or venue secrecy returns to the owner before
it is applied. Taken under that delegation, and announced during the discussion:

- **D-45-09** (above) — the visual section reads colours from the tokens.

- **D-45-18: the new write paths log `error.code` and `error.message`, never
  the whole error object and never `error.details`.** There is a measured,
  still-open defect: on a constraint violation PostgREST returns **the entire
  failing row** in the error detail, and roughly twenty existing sites do
  `console.error("<category>", error)` with the whole object. Until now what
  reached the logs was a profile row. **With D-45-05 what can reach them is the
  name of a space under negotiation**, and this project has no error tracking,
  so nobody would notice. This constraint binds every write path this phase
  creates. The ~20 pre-existing sites stay with their todo — see `<deferred>`.

- **D-45-19: this phase builds the instrument that authenticates as a real
  role**, and uses it to close success criterion 4. Nothing in this repository
  signs in as a role today, and the Management API connects with a role that
  bypasses RLS — which is precisely why Phase 44's criterion 4 could prove the
  six policies *exist* and never that they *refuse*. The instrument signs in
  against the auth API with real credentials, then reads each section's tables
  with that session and records the refusal.

  **This is the first refusal evidence this project will ever have**, and it is
  in scope here because criterion 4 demands it in its own words — *"exercised
  with a real role rather than a service key"*. Two boundaries: it is a
  **read-only** instrument (it never writes to production, per the rules this
  project wrote after the Phase 36 incident), and its credentials come from the
  environment, never from a tracked file. Whether it later retires part of the
  88 outstanding `human_needed` items across earlier phases is **out of scope
  and must not be claimed here** — see `<deferred>`.

### Folded Todos

- **`postgrest-details-leaks-the-row.md` — partially folded, as a constraint.**
  The todo's *rule* becomes D-45-18 and binds this phase's new write paths. The
  todo itself **stays open** for the ~20 existing sites, which no plan here
  owns. Folding the rule without folding the todo is deliberate: closing it
  would claim a cleanup this phase does not perform.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The production domain — criteria, never candidates
- `.claude/rules/venue-acquisition.md` — the four stages (mapped, verified,
  contacted, acquired), the per-format weightings, the four questions that close
  a "to verify" column, *derived is not verified*, *out of identity stays
  visible at zero*, and why a ranking is not an availability. **The single most
  important module for the location section.**
- `.claude/rules/sound-manifesto.md` — which formats have a written manifesto
  and which do not; the *unwritten is an answer, invented is not* / *unwritten
  is not unconstrained* pair that D-45-14's three states encode; the rule that
  the brief leaves the perimeter and must be stripped before it does (D-45-17)
- `.claude/rules/brand-visual-system.md` — the capitolato the visual section
  holds, the palette's exclusivity per format, *a format without a palette stays
  neutral* (D-45-16), *the archive precedes the listing* (why the dj photo
  archive is in D-45-08), and *a space not acquired is not named in any material*
- `.claude/rules/production-calendar.md` — the four formats, the sigle, the
  pipeline; read because the calendar becomes the fourth section (D-45-04)
- `.claude/rules/legal-compliance.md` — read for the **boundary**: the regime of
  a space and the neighbourhood constraints were offered and **declined** for
  this phase (D-45-11). A planner must not add them back as "obviously useful"

### The rules that constrain how this phase may be documented and verified
- `.claude/rules/ai-engineering.md` — *gate la pianificazione è pubblica*
  (`.planning/` is tracked; criteria here, candidates never), *gate una
  rimozione si fa per chiave*, *gate il contatore di controllo non legge la
  superficie che sta muovendo*, *gate un'istantanea prima copre ciò che si
  tocca*, and *gate l'autorizzazione a scrivere in produzione è un atto* — all
  four bind D-45-07's seeding run
- `.claude/rules/meta-gates.md` — the three monotone guards, the cross-domain
  impact pattern, and the verification gate in a repository with no test runner
- `.claude/rules/venue-secrecy.md` — the capitolato as an exit route (D-45-17),
  and the irreversibility that makes D-45-10 a structural choice rather than a
  tidiness one

### The phase's own contract
- `.planning/ROADMAP.md` §Phase 45 — the goal, `Depends on: Phase 44`, PROD-02,
  and the four success criteria this context answers one by one
- `.planning/REQUIREMENTS.md` — PROD-02 (this phase), PROD-01 (Phase 44)
- `.planning/phases/44-the-production-calendar-comes-inside/44-CONTEXT.md` —
  the direct dependency's 27 decisions. **D-44-04** (material never through the
  repository), **D-44-05** (a space not acquired carries its stage), **D-44-16**
  (warn, never block — D-45-15 inherits it), **D-44-26** (no upload surface —
  D-45-05 knowingly departs from it and D-45-18 pays for the departure) and
  **D-44-27** (opened by role, not by approval state) all bind here

### The product this phase builds on
- `src/lib/routes/capability-routes.ts` — the single declaration the middleware,
  the page guard and the navigation all read; the four section keys land here
- `src/lib/routes/staff-tabs.ts` — the labelled view of that map, with a
  module-load assertion that a tab cannot point at an address nobody serves
- `supabase/migrations/20260815120100_production_calendar_access.sql` — the key
  and the six SELECT policies D-45-04 rewrites. Read the whole file, including
  the prose: it records why `requires_approved` is `false` and what would
  reopen that question
- `supabase/migrations/20260810161000_venues_read_narrowed.sql` — the narrowed
  public road to an address, `venue_for_parties`, and the deliberate absence of
  an `anon` SELECT policy. This is the file that makes D-45-10's reasoning
  measurable rather than assumed
- `supabase/migrations/20260810120000_formats_and_series.sql` §the `color`
  column — the identification colour, `NOT NULL`, explicitly not a palette
  (D-45-16)
- `supabase/migrations/20260807000000_capability_model.sql` — the grant table
  and the shape a new capability row takes
- `src/app/globals.css` — the brand tokens the visual section reads (D-45-09)

### The material — read locally, never committed
- `docs/scouting-2026-08-17.json` — **the seeding input for D-45-07.** 184
  records, 27 fields, recovered from the owner's production artifact on
  2026-08-17. Gitignored via `.gitignore:67` and verified invisible to git.
  **Read it when implementing the import; write nothing from it into any
  tracked file, this document included.** Its field shape is recorded in
  `<code_context>` below — that is structure, and structure is publishable;
  its rows are candidates, and candidates are not
- `.firecrawl/` — 452 raw crawl artefacts, the material the archive was built
  *from*. **Not** the seeding input: these are downloaded web pages, not
  records. Gitignored and held there by check F of `npm run verify:persona`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **The section pattern already exists, once.** Phase 44 bound a production
  surface end to end: a capability row with its grants, RLS on six tables, an
  entry in `capability-routes.ts`, a tab in `staff-tabs.ts`, and a page under
  `(admin)/admin/(work)/`. The three new sections are that pattern three more
  times — which is why D-45-04's unification is worth its cost rather than being
  tidiness.
- **Media upload is not built from scratch.** The project already has event
  media with a **quarantine bucket** and **server-only upload**
  (`20260809004600_event_media_quarantine_bucket.sql`,
  `20260809006000_event_media_server_upload_only.sql`) plus
  `src/components/media/**`. The dj photo archive of D-45-08 reuses that path;
  a second upload mechanism beside it would be a second thing to secure.
- **A colour picker already exists** — `src/app/(admin)/admin/formats/
  ColorSwatchPicker.tsx` — and the brand tokens live in `src/app/globals.css`.
  D-45-09 is a reuse decision, not a new component.
- **The eight shared primitives (Phase 41) and the token system (Phase 40)**:
  the three sections land in the finished visual system rather than being
  converted afterwards.
- **The promotion act has a precedent.** D-45-10's *promote an acquired space
  into `venues`* is shaped like Phase 44's *announce a night from a production
  plan* — a deliberate, single bridge between an internal plan and something the
  public may eventually see. Read `AnnounceNightDialog.tsx` and the write it
  performs before designing the promotion.

### Established Patterns
- **Migrations are the security boundary**; `supabase/schema.sql` holds no RLS.
- Migrations are applied through the Management API's **migrations** endpoint,
  not `/database/query`, so the migration history stays truthful. The Supabase
  CLI is not installed here.
- **A refusal travels as a returned value, never as a thrown message** — Next
  redacts messages thrown out of a Server Action in a production build.
- **No test runner exists.** Verification is `npm run build` (which is also the
  typecheck) plus written manual procedures — plus, for this phase, the
  instrument of D-45-19. The repo does carry many `verify:*` scripts, and a
  section-surface assertion in that family is the natural mechanical half.
- **`npm run verify:persona` must stay green** if any `.claude/rules/**` file is
  touched. It is not expected that this phase touches one; if it does, the
  changelog entry and the version bump go in the same commit.

### The scouting source's shape — measured 2026-08-17, structure only

184 records, 27 fields. Recorded here so the plan can specify a field mapping
rather than discover one. **Field names and value shapes only — no row of this
data appears in this repository.**

| Group | Fields | Shape |
|---|---|---|
| Identity | name, short description, **address**, category, source | free text; category is an 11-value enum (club, live club, bar/cocktail, brewery, restaurant, wine bar, institution, gallery, project space, hybrid, historic house) |
| Format fit | home format | 4-value enum, one per format |
| Attributes | outdoor/sunset, artistic frame, aperitivo vocation, exclusivity | 4-value scale: `top` / `buono` / `limitato` / `no` |
| To-verify attributes | evening licence, events, music already at home, audio, console, partnership | 3–4 value enums **whose lowest value is literally `verifica`** — the unanswered marker |
| Capacity | size band; numeric capacity | band is a 4-value enum; **numeric is null on all 184** |
| Flags | already used, in use, natural-wine guide | 0/1 |
| Legal | regime | `libera` / `privata` / `verifica` — **excluded from the product by D-45-22** |
| Prose | three note fields | free text, longest 664 chars |

**Absent from the source, and each absence is informative:** no stage field
(everything enters at `mapped` — nobody has been called); no score field (scores
are computed from attributes, per the revision to D-45-11); no contact field, no
phone, no email.

**The address is one field.** Whatever the plan does to protect it, it protects
one column — which is what makes the structural guarantee of D-45-21 provable
rather than argued.

### Integration Points
- The three sections join the work surface under `(admin)`, route files in
  `(work)` and non-route modules one level out (R-WORK-ROUTES).
- **D-45-04 is the phase's only edit to something already live.** Everything
  else is additive. Planning should isolate it in its own blocking plan so the
  rest of the phase cannot be blamed for, or blocked by, an access rewrite.
- **The seeding script of D-45-07 is a second production write**, independent of
  D-45-04, and needs its own snapshot-and-authorisation ritual. Its tables are
  new, so nothing existing cascades from them — **but that must be read from the
  constraints, not assumed**, which is what the project's own gate demands.

</code_context>

<specifics>
## Specific Ideas

- The location section's first day is **the whole existing research at stage
  `mapped`** — the desk work made checkable in the product, with the fact that
  **nobody has been called** encoded in the data rather than remembered.
- The dj photo archive is not a nice-to-have inside D-45-08: the listing goes
  out two days before a night, so **that night's photo cannot exist yet**, and
  from an artist's second date the piece is pulled from an archive somebody has
  to build. The visual section is where that archive lives.
- The pending-decision register of D-45-14 has real first entries, all of them
  already declared open in the domain modules: whether a touring format sounds
  the same at every venue or each keeps its own margin; whether *never the same
  space twice* holds forever or only within a season; and a weekday that is
  still a placeholder. The register's job is to stop those resolving themselves
  by habit, one material at a time.

</specifics>

<deferred>
## Deferred Ideas

- **The legal and community sections** — declined for this phase (D-45-01).
  Both govern real decisions that are currently written nowhere: the regime of a
  space, the closing hour, who holds the licence; and the approval criterion,
  the maximum waiting time, the wording of a rejection. They remain outside the
  product.
- **A space's regime and its acoustic/neighbour constraints** — offered as part
  of D-45-11 and declined. They are the two things that stop an already-confirmed
  night, so they will come back; they come back as a decision, not as a planner's
  addition.
- **The ~20 existing `console.error("<category>", error)` sites** — D-45-18
  binds this phase's own write paths only. The pre-existing sites stay with
  `postgrest-details-leaks-the-row.md`.
- **Whether the instrument of D-45-19 retires any of the 88 outstanding
  `human_needed` items in phases 34, 35, 37–41.2, 43, 44 and 46** — plausible,
  out of scope, and **must not be claimed** by this phase's verification. If it
  turns out to help, that is a separate audit with its own evidence.
- **A per-person section grant** — rejected in favour of role grants (D-45-02).
  The case that would reopen it is concrete: an external collaborator who should
  hold one section and nothing else.
- **A differentiated grant across the three sections** — rejected (D-45-03).
  Reopening it is also the only way success criterion 1 gains an observable
  subject in production.

### Reviewed Todos (not folded)
- `form-untick-venue-secret-leaves-no-trace.md` (score 0.4, venue-secrecy) —
  matched on keywords, and it is a real defect on the venue-secrecy path, but it
  lives in the existing event form, not in a production section. Stays a todo,
  as it did at Phase 44.
- `module-load-throws-500-the-whole-middleware-surface.md` (score 0.2) —
  unrelated to this phase's scope, though worth a glance by whoever writes
  D-45-04's migration, since that plan does touch a module the middleware reads.
- `profiles-email-not-unique.md` (score 0.2) — unrelated; belongs to the account
  model.

</deferred>

---

*Phase: 45-production-sections-section-by-section*
*Context gathered: 2026-08-17*
