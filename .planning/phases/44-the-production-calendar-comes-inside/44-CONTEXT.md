# Phase 44: The Production Calendar Comes Inside - Context

**Gathered:** 2026-08-15
**Status:** Ready for planning

<domain>
## Phase Boundary

A night becomes readable inside the product carrying its format, its stored
series number, the acquisition stage of its space and its editorial anchors —
imported from local material into the database, **never through the
repository**.

**What this phase does NOT build.** The model of a night already exists:
`event_parties` carries `date`, `time`, `format_id`, `series_id`, `number`,
`venue_id`, `venue_secret` and `lineup`, and `formats` / `party_series` have
been in production since Phase 36. This phase builds what the calendar has **in
addition**: the production plan, the editorial anchors derived from a date, the
per-night checklist, and the import path that carries material in without
publishing it.

**Sections.** This phase delivers **calendar + checklist**. The manifesto,
visual and location sections are Phase 45, which builds them together with
per-section entitlement — scouting holds open negotiations and the visual
system holds nothing secret, so they cannot share one lock.

</domain>

<decisions>
## Implementation Decisions

### The import path

- **D-44-01:** The `.ics` file **stays the source of truth**. The app updates by
  re-importing; it does not become the place where the calendar is authored.
  *(Owner's choice over "the app becomes the source" and "import once, then the
  app".)*

- **D-44-02 (Claude's discretion, derived — not asked):** Therefore **the
  calendar surface is read-only**. An editable date field would be a change the
  next import silently discards, which is the silent-failure shape this project
  spent Phase 46 removing. Editing happens in the file.

- **D-44-03 (Claude's discretion, derived — not asked):** The import is
  **re-runnable by construction**: running it twice may not duplicate nights,
  and it may **never renumber** a series progressivo. A number already assigned
  is already on a printed poster — one of the project's three monotone guards
  (`meta-gates.md`). Append, never renumber.

- **D-44-04 [BLOCKING, and it governs every artifact of this phase]:** The
  material reaches the database **without passing through the repository**. The
  owner supplies an updated `.ics`; it is placed in `docs/`, which is
  gitignored and held there by check **F** of `npm run verify:persona`. It is
  **never** pasted into conversation-derived documents and **never** written
  into `.planning/`, which is tracked and therefore public. No venue under
  negotiation, no unannounced date and no line-up may appear in a migration, a
  seed, a fixture, a test or a planning document — this file included.
  *(The owner offered to paste the calendar inline; the constraint was stated
  back and accepted before any material moved.)*

- **D-44-05:** A night whose space is **not yet acquired** — MotionLab today —
  **exists in the calendar**, carrying the space's stage beside it: mapped /
  verified / contacted / acquired. The stage is visible wherever the space is
  named, and the name itself stays internal: it cannot reach any public
  surface. *(`venue-acquisition.md`: a ranking is not an availability, and
  acquired means in writing.)*

### Calendar and product: one table or two

- **D-44-06:** The calendar is a **separate production plan**, not the event.
  Announcing is an explicit act that generates the event from the plan row.
  **This is what makes D-44-01 safe:** with the file as the source, a re-import
  that reached `event_parties` directly could move a night that already has
  tickets on sale.

- **D-44-07:** After the announcement the plan row and the night **stay
  linked**, and a divergence between file and product is **signalled**, not
  left to be discovered. *(Same discipline as the calendar-beats-tracker gate:
  a divergence that blocks is better than one nobody sees.)*

- **D-44-08:** The calendar shows **past nights too** — the full archive, back to
  the file's earliest entry (Nov 2024). Its purpose is to make the rotation
  **checkable in the product instead of remembered** — which matters more than
  it did an hour ago: the file does not show the three-cycle rotation this
  project has been describing as unbroken (D-44-19). The archive is how a claim
  like that gets settled by looking rather than by recalling.

### Editorial anchors

- **D-44-09 [REVISED after reading the file — see D-44-09b]:** The anchors are
  **derived from the night's date and format**, per `production-calendar.md`:
  listing at −2, tonight on the day, recap and podcast cover at +4, timetable at
  −1 for the night, and the after movie anchored to the **next edition's
  listing** — never to a day count.

- **D-44-09b [supersedes the reading above, and is the operative rule]:** The
  updated calendar turned out to **already contain some pieces as entries of
  their own** — 14 listings, 7 timetables, 7 after movies, and **zero** podcasts,
  recaps or tonights. That measurement changed the question from *derive or not*
  to *what wins where*. The rule is three-part:

  1. **A date written in the file WINS.** It is a decision already taken,
     overrides included. Nothing recomputes it.
  2. **The product knows which pieces a format OWES**, because the pipeline is a
     written rule — a satellite owes listing, tonight, recap and podcast cover;
     the night owes timetable, one podcast per dj, and an after movie. This is
     what lets the checklist say a piece is *missing* rather than treating
     "never written" and "not needed" as the same fact.
  3. **A missing piece gets a PROPOSED date** from the rule (−2 / +4 / −1), and
     it is **marked as a proposal** until it is written in the file. Accepted
     consequence, stated when the choice was made: dates appear on screen that
     do not exist in the owner's calendar, and they must never read as settled.

  *(Route taken: the owner first chose "read only, compute nothing"; the
  collision that choice created with the checklist (D-44-15) and with the
  phase's own criterion 3 was surfaced, and the owner then chose the fuller
  rule. Both are recorded — a superseded decision without its reason reads as an
  oversight.)*

- **D-44-10:** A single piece's date **can be moved**, and the override is **not
  surfaced as a label**. *(Owner's choice over "the override is visible" and
  "the rule is absolute"; the stated cost — that after three months nobody can
  tell rule from exception on screen — was read and accepted.)*

- **D-44-11 (Claude's discretion, resolving a collision between D-44-01 and
  D-44-10):** An overridden date is **remembered internally as overridden**, so
  the re-import does not recompute and silently discard it. Nothing about that
  memory is drawn on screen — the owner rejected the label, not the durability.
  Without this, the two decisions above cannot both hold.

- **D-44-12:** When the after movie's anchor does not exist yet — the next
  edition is not in the calendar — the calendar **says it is waiting for that
  edition**, naming it. No date, and the reason beside it. *(Matches the
  already-recorded precedent where one night's after movie waits for the
  next.)*

- **D-44-13:** When a night's line-up is not yet decided, the podcast count
  **says it depends on the line-up** rather than showing a number. A count that
  could not be determined does not print a figure — the rule OBS-03 states for
  the money path, applied to the editorial plan.

### The checklist

- **D-44-14:** The checklist covers **the editorial pieces plus the production
  steps** — venue confirmed in writing, dj confirmed, photo arrived, and the
  exhibition space's approval of material where that applies. It covers what
  can make a date fail, not only what can be drawn.

- **D-44-15:** An unticked item whose date has passed is **flagged prominently**
  — the night reads as late from the list, without opening it. A checklist you
  only see once you are already late is not a checklist.

- **D-44-16:** A tick **warns but does not block**. Announcing a night with open
  items tells you and lets you proceed. It protects against distraction without
  ever standing in the way.

### What the calendar holds besides nights — measured, not assumed

The updated file was read for **structure** on 2026-08-15 (88 entries, Nov 2024
→ Jul 2027). Three findings changed the model, and each is a fact from the file
rather than a reading of any document:

- **D-44-18: a third kind of entry exists — the external commitment.** A share
  of the entries belong to a collective the owner takes part in. It is **not
  re:sonate production**, but it **occupies a day**, and the reason it is in the
  calendar is to avoid scheduling a night against it. It is neither a night nor
  a piece: importing it as a night would hand it a format and a progressivo it
  does not have, and those reach surfaces that name formats. The import must
  **recognise and separate** it, and the calendar must show the day as taken
  without implying a night. *(The collective's name is deliberately not written
  in this file: `.planning/` is public. The import reads it from the file.)*

- **D-44-19: MotionLab has no dates in the calendar.** Zero occurrences. Per the
  owner: **not yet programmed**, because the space is not acquired. Consequence
  outside this phase: `production-calendar.md` currently states a cadence
  ("one every 6 weeks") and a rotation ("unbroken across nine cycles") that the
  calendar does not support. The calendar wins and the module is the source to
  correct — **as its own commit, not inside this phase**, since a persona module
  change needs `verify:persona` and a changelog entry.

- **D-44-20: the import needs an explicit inclusion rule.** With nights, pieces
  and external commitments in one file — plus entries carrying no sigla at all —
  "import everything" is not a specification. What enters, as what kind, and
  what is skipped, must be declared and testable against the real file.

### Access

- **D-44-17:** The calendar is reachable by **master and organizer**. Staff
  assigned to the door stay out: they enter to let people in, not to see
  unannounced dates and open negotiations. This is the narrowest cut compatible
  with the work. Per criterion 4, the middleware, the page guard and the
  row-level policy must ask the same question of the same definition —
  `src/lib/routes/capability-routes.ts` is that definition.

### Claude's Discretion

The owner stated explicitly in this session: **every technical checkpoint is the
expert persona's call, not the owner's.** Decisions D-44-02, D-44-03 and D-44-11
were taken under that delegation and are marked as such above. Also delegated:
the shape of the import mechanism, the storage form of plan rows and anchors,
the capability key's name and whether it is new or reused, and the migration
strategy.

**A standing constraint on that delegation:** anything touching access, money,
the door or venue secrecy returns to the owner before it is applied, per the
project's own Critical classification. Delegation of technical choices is not
delegation of those four.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The production domain — criteria, never candidates
- `.claude/rules/production-calendar.md` — the four formats, the sigle, the
  pipeline and its anchors, the monotone numbering guard, and the rule that the
  calendar beats any older working document
- `.claude/rules/venue-acquisition.md` — the four stages (mapped, verified,
  contacted, acquired), and why a ranking is not an availability
- `.claude/rules/brand-visual-system.md` — the editorial pieces per format and
  what each one is
- `.claude/rules/sound-manifesto.md` — which formats have a written sound and
  which do not; relevant to Phase 45, cited here so the boundary is visible

### The rules that constrain how this phase may be documented
- `.claude/rules/ai-engineering.md` — *gate la pianificazione è pubblica*:
  `.planning/` is tracked, so every document this phase writes is a
  publication. Specs holding material that cannot ship live in `docs/`,
  uncommitted, with the reason written beside them
- `.claude/rules/meta-gates.md` — the three monotone guards, and the
  verification gate in a repository with no test runner

### The product this phase builds on
- `.planning/ROADMAP.md` §Phase 44 — the five success criteria
- `.planning/REQUIREMENTS.md` — PROD-01 (this phase), PROD-02 (Phase 45)
- `src/lib/routes/capability-routes.ts` — the single declaration the
  middleware, the page guard and the navigation all read
- `src/lib/routes/staff-tabs.ts` — the labelled view of that map; a new surface
  needs its entry here, and the file asserts against the map at module load
- `supabase/migrations/20260810120000_formats_and_series.sql` — formats and
  series as they exist in production

### The material — read locally, never committed
- `docs/Music-2026-08-15.ics` — **the current calendar**, supplied by the owner
  on 2026-08-15 and placed in `docs/`, which is gitignored (`.gitignore:67`) and
  held there by check F of `verify:persona`. Confirmed invisible to git before
  anything was read from it. 88 entries, Nov 2024 → Jul 2027. Read it for
  **structure and content when implementing the import** — and write neither
  into any tracked file
- `docs/Music-2026-08-02.ics` — the previous file, kept for comparison

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `event_parties`: already carries `date`, `time`, `format_id`, `series_id`,
  `number`, `venue_id`, `venue_secret`, `lineup`. The night model does not need
  rebuilding
- `formats` / `party_series`: in production since 2026-08-10. `party_series`
  carries `highest_assigned`, and `bump_series_watermark` raises it with
  `GREATEST` and never lowers it — the numbering guard already exists in the
  database and must be respected, not re-implemented
- `src/lib/routes/capability-routes.ts` + `staff-tabs.ts`: the pattern for
  binding a new surface, with a module-load assertion that a tab cannot point
  at an address nobody serves
- The eight shared primitives from Phase 41, and the token system from Phase 40:
  a new surface lands in the finished visual system rather than being converted
  afterwards — which is why the roadmap ordered this phase after 41

### Established Patterns
- Migrations are the security boundary; `supabase/schema.sql` holds no RLS
- Migrations are applied through the Management API's **migrations** endpoint,
  not `/database/query`, so the project's migration history stays truthful. The
  Supabase CLI is not installed here
- A refusal travels as a **returned value**, never as a thrown message — Next
  redacts messages thrown out of a Server Action in a production build
- No test runner exists: verification is `npm run build` plus written manual
  procedures

### Integration Points
- The new surface joins the work surface under `(admin)`, with its route file in
  `(work)` and any non-route module one level out (R-WORK-ROUTES)
- The announcement act (D-44-06) is where the plan meets `event_parties`; it is
  the one write path in this phase that can create something the public may
  eventually see, and it inherits the venue-secrecy gates

</code_context>

<specifics>
## Specific Ideas

- The updated `.ics` was supplied on 2026-08-15 and is at
  `docs/Music-2026-08-15.ics`. It was copied there and its gitignore status
  verified **before** being read — the order matters, and it is the order the
  next person should follow (D-44-04)
- "MotionLab today" is the concrete case for D-44-05: a format on the calendar
  whose space is not acquired. The stage must be visible without the name
  leaving the internal surface
- The three-cycle rotation and the unbroken 27-date record are the archive's
  reason for existing (D-44-08) — the calendar should make that checkable

</specifics>

<deferred>
## Deferred Ideas

- **Manifesto, visual and location sections** — Phase 45, together with
  per-section entitlement. Noted here because the owner asked for five sections
  in one breath and this phase delivers two of them
- **An `.ics` export from the app** — raised implicitly by D-44-01: with the
  file as the source, the app has no need to emit one today. If the app ever
  becomes the source, this is the first thing it owes back
- **What happens to a cancelled night, and two formats on the same day** —
  identified as gray areas but not discussed; the owner chose to proceed. Left
  to research and planning
- **Correcting `production-calendar.md`** — the module states a MotionLab
  cadence and an unbroken rotation the calendar does not support (D-44-19). The
  calendar wins; the module is the source to correct, in its own commit with a
  `verify:persona` run and a changelog entry. **Not** part of this phase

### Reviewed Todos (not folded)
- `form-untick-venue-secret-leaves-no-trace.md` (score 0.4, venue-secrecy) —
  matched on keywords, but it is a defect in the existing event form, not
  calendar work. Stays a todo
- `module-load-throws-500-the-whole-middleware-surface.md`,
  `postgrest-details-leaks-the-row.md` — matched weakly, unrelated to this
  phase's scope

</deferred>

---

*Phase: 44-the-production-calendar-comes-inside*
*Context gathered: 2026-08-15*
