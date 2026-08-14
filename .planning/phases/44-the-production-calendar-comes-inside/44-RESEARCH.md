# Phase 44: The Production Calendar Comes Inside — Research

**Researched:** 2026-08-15
**Domain:** iCalendar ingestion · production-plan data model · capability-bound staff surface
**Confidence:** HIGH on the file's structure (measured directly, this session) · HIGH on the codebase mechanics (read from source) · MEDIUM on the import-path recommendation (a judgement between two viable shapes, both stated)

---

## A note on this document, before anything else

`.planning/` is tracked and `github.com/edmiribrahimi/Resonate` is public, so **this
file is a publication**. `docs/Music-2026-08-15.ics` was read for **structure**;
nothing from it is reproduced here.

What appears below: field names, entry grammars, counts, weekday patterns, relative
offsets, and the sigle already published in `.claude/rules/production-calendar.md`.

What deliberately does **not** appear: any date, any venue word that is not already
running in public, any line-up, any third-party name, any verbatim `SUMMARY`. Where an
example is needed it is written as a **grammar** (`Listing - RSNT-NNN`), never as an
instance. Two structural facts were also withheld on purpose — the two IANA timezone
identifiers present in the file, and the per-edition weekday table — because neither is
needed to plan against and each narrows an unannounced date. The planner needs "there
are two distinct TZIDs" and "nights fall Friday or Saturday"; it does not need which,
and which is not written here.

Per-edition attribution of measured offsets was also collapsed to multisets for the
same reason. The engineering conclusion is unaffected.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**The import path**

- **D-44-01:** The `.ics` file **stays the source of truth**. The app updates by
  re-importing; it does not become the place where the calendar is authored.
- **D-44-02 (Claude's discretion, derived):** Therefore **the calendar surface is
  read-only**. An editable date field would be a change the next import silently
  discards. Editing happens in the file.
- **D-44-03 (Claude's discretion, derived):** The import is **re-runnable by
  construction**: running it twice may not duplicate nights, and it may **never
  renumber** a series progressivo. Append, never renumber.
- **D-44-04 [BLOCKING, and it governs every artifact of this phase]:** The material
  reaches the database **without passing through the repository**. The owner supplies
  an updated `.ics`; it is placed in `docs/`, which is gitignored and held there by
  check **F** of `npm run verify:persona`. It is **never** pasted into
  conversation-derived documents and **never** written into `.planning/`. No venue
  under negotiation, no unannounced date and no line-up may appear in a migration, a
  seed, a fixture, a test or a planning document — this file included.
- **D-44-05:** A night whose space is **not yet acquired** — MotionLab today —
  **exists in the calendar**, carrying the space's stage beside it: mapped / verified /
  contacted / acquired. The stage is visible wherever the space is named, and the name
  itself stays internal: it cannot reach any public surface.

**Calendar and product: one table or two**

- **D-44-06:** The calendar is a **separate production plan**, not the event.
  Announcing is an explicit act that generates the event from the plan row.
- **D-44-07:** After the announcement the plan row and the night **stay linked**, and a
  divergence between file and product is **signalled**, not left to be discovered.
- **D-44-08:** The calendar shows **past nights too** — the full archive. Its purpose
  is to make the rotation **checkable in the product instead of remembered**.

**Editorial anchors**

- **D-44-09b (operative, supersedes D-44-09):** Three-part rule.
  1. **A date written in the file WINS.** Nothing recomputes it.
  2. **The product knows which pieces a format OWES**, so the checklist can say a piece
     is *missing* rather than treating "never written" and "not needed" as the same fact.
  3. **A missing piece gets a PROPOSED date** from the rule, **marked as a proposal**
     until written in the file. Accepted consequence: dates appear on screen that do not
     exist in the owner's calendar, and they must never read as settled.
- **D-44-10:** A single piece's date **can be moved**, and the override is **not
  surfaced as a label**.
- **D-44-11 (Claude's discretion):** An overridden date is **remembered internally as
  overridden**, so the re-import does not recompute and silently discard it. Nothing
  about that memory is drawn on screen.
- **D-44-12:** When the after movie's anchor does not exist yet, the calendar **says it
  is waiting for that edition**, naming it. No date, and the reason beside it.
- **D-44-13:** When a night's line-up is not yet decided, the LiveCut count **says it
  depends on the line-up** rather than showing a number.

**The checklist**

- **D-44-14:** The checklist covers **the editorial pieces plus the production steps** —
  venue confirmed in writing, dj confirmed, photo arrived, and the exhibition space's
  approval of material where that applies.
- **D-44-15:** An unticked item whose date has passed is **flagged prominently** — the
  night reads as late from the list, without opening it.
- **D-44-16:** A tick **warns but does not block**.

**What the calendar holds besides nights**

- **D-44-18:** A third kind of entry exists — **the external commitment**. Not re:sonate
  production, but it **occupies a day**. The import must **recognise and separate** it;
  importing it as a night would hand it a format and a progressivo it does not have.
- **D-44-19:** MotionLab has **no dates** in the calendar. Zero occurrences.
- **D-44-25 (supersedes the anchor list in D-44-09 for the NIGHT):** timetable on the
  night itself; LiveCut Tue/Wed/Thu of the **next** night's week; after movie the Monday
  before the next edition's listing. **The pipeline is expressed in DAYS OF THE WEEK,
  not in offsets.** Any anchor computation resolves a weekday relative to the anchor
  event, never a day count.
- **D-44-21:** The file uses **two naming conventions**, and the import must join across
  them. Matching pieces to nights by sigla alone finds no night at all.
- **D-44-22:** The piece is called **`LiveCut`**. A night carries one per dj.
- **D-44-23:** **SunSet does not follow the satellites' pipeline.** Its listing runs far
  ahead and the anticipation is **not a fixed number**, so nothing may derive a SunSet
  listing date. Proposals must be **withheld** for SunSet listings.
- **D-44-24:** One real override already exists in the archive; the import must not
  "repair" it. *(This decision's specific claim is corrected by measurement — see
  §Corrections below. The principle stands; the instance named was wrong.)*
- **D-44-20:** The import needs an **explicit inclusion rule**. What enters, as what
  kind, and what is skipped, must be declared and testable against the real file.

**Access**

- **D-44-17:** The calendar is reachable by **master and organizer**. Staff assigned to
  the door stay out. The middleware, the page guard and the row-level policy must ask
  the same question of the same definition — `src/lib/routes/capability-routes.ts` is
  that definition.

### Claude's Discretion

Delegated by the owner in session: **every technical checkpoint is the expert persona's
call.** Specifically: the shape of the import mechanism, the storage form of plan rows
and anchors, the capability key's name and whether it is new or reused, and the
migration strategy.

**Standing constraint on that delegation:** anything touching access, money, the door or
venue secrecy returns to the owner before it is applied. Delegation of technical choices
is not delegation of those four. **This phase touches access** (a new capability, a new
gated surface) **and venue secrecy** (a plan row carries a venue not yet acquired) — so
the capability grant and the venue-visibility rule are owner checkpoints, not ours.

### Deferred Ideas (OUT OF SCOPE)

- **Manifesto, visual and location sections** — Phase 45, with per-section entitlement.
- **An `.ics` export from the app** — not needed while the file is the source.
- **What happens to a cancelled night, and two formats on the same day** — gray areas,
  left to research and planning. *(Addressed below in §Open Questions.)*
- **Correcting `production-calendar.md`** — the module's MotionLab cadence and rotation
  claims. Its own commit, with `verify:persona` and a changelog entry. **Not this phase.**
</deferred>
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROD-01 | The production calendar lives in the product rather than outside it — an import, not a migration, and the material reaches the database without passing through the public repository | §Import Path (the two viable shapes and the recommendation); §Migration Shape (structure only, zero seeded rows — this is what makes it "an import, not a migration"); §Confidentiality Controls (the mechanical checks that keep material out of tracked files) |

### The five success criteria, and where each is answered

| # | Criterion | Where |
|---|-----------|-------|
| 1 | A night is readable carrying format, series number, venue state and editorial anchors | §Migration Shape (`production_plan`, `production_piece`), §Entry Grammars |
| 2 | The material reaches the database without passing through the repository | §Import Path, §Confidentiality Controls |
| 3 | Editorial pieces are **derived** using the **weekday** rules, not offsets | §The Anchor Model — including the measured cases where derivation must be **withheld** |
| 4 | Reachable only by someone the capability model admits; middleware, page guard and RLS ask the same question of the same definition | §Access |
| 5 | Moving a night recomputes everything downstream; a progressivo is appended, never renumbered | §The Anchor Model, §Idempotence and the Monotone Guard |
</phase_requirements>

---

## Summary

The file is an Apple-authored iCalendar export: **92 `VEVENT`s**, Nov 2024 → Jul 2027,
one `VCALENDAR`, two `VTIMEZONE`s, forty `VALARM`s. Every `VEVENT` carries `UID`,
`SUMMARY`, `DTSTART`, `DTEND`, `DTSTAMP`, `CREATED`, `LAST-MODIFIED`, `SEQUENCE` and
`TRANSP`; all 92 UIDs are unique; every `DTSTART` is a floating local datetime with a
`TZID` parameter and no `VALUE=DATE` anywhere. Three lines are folded, so unfolding is
mandatory. **One** `VEVENT` carries an `RRULE`. The whole subset a correct parser must
handle is therefore small, closed and measured — which is why the recommendation is to
parse it directly and add no dependency.

The classification problem is bigger than the parsing problem, and it is bigger than
`44-CONTEXT.md` recorded. The file uses **three** `SUMMARY` grammars, not two: a
canonical piece form (`Kind - SIGLA-NNN`), a **legacy inverted** piece form
(`Format NNN - Kind`, three occurrences, confined to the two earliest editions), and a
night form carrying no kind token and no sigla at all. Joining pieces to nights
therefore needs a normaliser **and** a declared alias mapping from the venue word in a
night's title to the series code in a piece's sigla — and that mapping is not derivable
from the strings. This was proved, not assumed: keying on the number alone put one
satellite's listing at a positive offset from its night, because two satellite nights
legitimately share the progressivo `001` under different series.

The anchor model is the part the phase must get exactly right, and the measurements
support the roadmap's corrected criterion 3 completely — while adding one finding that
extends it. Anchors resolve to **weekdays relative to an anchor event**, and the anchor
is frequently *not the night itself*: a night's LiveCuts fall in the ISO week of the
**next** night (6 of 6 editions, without exception), and its after movie is the day
before the next edition's listing (6 of 7; the seventh is one of the legacy-form
entries). Measured from their own night those same pieces look wildly irregular —
spreads of 9 to 143 days — which is exactly the false-alarm shape `production-calendar.md`
records. The new finding: **the night's listing is not derivable either.** Like SunSet's,
it falls on a Tuesday but one to two and a half weeks out, with no fixed anticipation.
D-44-23 withholds proposals for SunSet listings; the measurement says the same
withholding must apply to the night's.

**Primary recommendation:** one pure module under `src/lib/production/ics/` doing
parse → classify → normalise → anchor-resolve, with **two thin callers** — a capability-guarded
Server Action taking the file as an upload (the product path, satisfying D-44-01/02) and
a `scripts/` runner reading `docs/` with the service key (the first-run and recovery
path). No new npm dependency. A new capability key rather than a reused one. A
structure-only migration with **zero seeded rows**, whose plan table refuses a `number`
change in a trigger, and which never writes `event_parties` — the announcement act is
the only bridge, which is what makes renumbering structurally impossible rather than
merely forbidden.

---

## Corrections to prior documents, measured this session

The persona module and `44-CONTEXT.md` were both written before this file was measured
end to end. Four claims are wrong, and one of them changes what the checklist will say.
Per `production-calendar.md`, gate *il calendario batte il tracker*: **the calendar wins,
and the other document is the source to correct.**

| # | Claim, and where | Measured | Consequence |
|---|------------------|----------|-------------|
| C1 | *"zero podcasts, **recaps** or **tonights**"* — D-44-09b | **2 Recaps and 2 Tonights** are present — one of each for each of the two planned satellite dates. Zero `Podcast`: that half is right. | The two satellite dates are **complete** on all four owed pieces. A checklist built on D-44-09b as written would report four pieces missing that exist. **This is the correction with product consequences.** |
| C2 | *"`RSNT-002` carries its timetable on the night itself, while nights 003→008 all carry it at −1"* — D-44-24 | **All seven timetables fall on the night itself.** There is no timetable at −1 anywhere in the file. | The timetable rule is uniform and safely derivable. D-44-24's *principle* (a written date wins, the import must not repair it) stands; the *instance* does not exist. |
| C3 | *"l'unica a −1 è `RSNT-003`"* — `production-calendar.md` 1.14.0, timetable line | Same measurement as C2: `RSNT-003`'s timetable is on its night. | The module's parenthetical is wrong. Correcting it belongs to the deferred persona commit, not to this phase — but the phase must **build against the measurement**, not the prose. |
| C4 | *"the file uses TWO naming conventions"* — D-44-21 | **Three.** A legacy inverted form exists — `Format NNN - Kind` — with 3 occurrences, all in the two earliest editions. | The import's inclusion rule (D-44-20) must name three grammars. A two-grammar parser silently drops three real pieces, two of which are the file's only genuine anchor overrides. |

**Two genuine overrides do exist**, and both are in the legacy form: one listing on a
Monday where every other listing is a Tuesday, and one after movie on a Tuesday where
every other is a Monday. That is D-44-24's phenomenon, correctly located. It also means
the legacy grammar is not cosmetic: **dropping it drops the overrides**, which is the
one class of entry the rule must never recompute.

`44-CONTEXT.md` also records the file as **88 entries**; it holds **92 `VEVENT`s**.
Whether the difference is a changed file or a differently-drawn boundary was not
determined. The planner should treat 92 as the number to assert against and re-measure
if the file is replaced.

[VERIFIED: direct measurement of `docs/Music-2026-08-15.ics`, 2026-08-15, structural
parse only]

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Reading and unfolding the `.ics` | Frontend server (Node runtime) | Local script | Pure text work with no I/O and no secret; must be identical in both callers, so it belongs in a shared pure module neither tier owns exclusively |
| Classifying an entry (night / piece / commitment / unclassified) | Frontend server (same pure module) | — | Depends only on the string and a declared alias table; no database read is required to decide the *kind* |
| Resolving the venue word to a series code | API / Backend (database) | — | The alias table must live in **data**, not in tracked source: a venue word not yet acquired cannot be written into a public repository (D-44-04, `venue-acquisition.md`) |
| Anchor resolution (weekday relative to an anchor event) | Frontend server (pure module) | — | Pure civil-date arithmetic over already-loaded rows; putting it in SQL would make it untestable by the one check this repo can run |
| Persisting plan rows, pieces, commitments | API / Backend (Supabase, service role) | — | Writes must bypass no policy accidentally; they happen behind a capability check, never in front of one |
| Refusing a renumber | Database | — | A trigger is the only place a guard survives a caller that forgot it. `bump_series_watermark` set this precedent |
| Deciding who may see the calendar | API / Backend (RLS) | Frontend server (middleware + page guard) | *The middleware is UX; the RLS is the boundary* — `CLAUDE.md` principle 2, restated in `capability-routes.ts`'s own docblock |
| Announcing a plan row into `event_parties` | API / Backend (Server Action) | — | The one write path that can create something the public may eventually see; inherits the venue-secrecy gates |
| Drawing proposals distinguishably from written dates | Browser / client | — | Presentation, but constrained: the distinction is a **column**, not a render-time inference |

---

## Standard Stack

### Core — nothing new

| Library | Version | Purpose | Why standard |
|---------|---------|---------|--------------|
| *(none added)* | — | `.ics` parsing | The required subset is closed and measured; every candidate library brings a timezone engine this phase must **not** use. See §Don't Hand-Roll for the inversion of the usual advice, and why it is justified here rather than assumed |

**Installation:** no `npm install` step in this phase.

### Supporting — already present, and the versions were confirmed

| Library | Version in `package.json` | Purpose here |
|---------|---------------------------|--------------|
| `next` | `16.1.6` | Server Action receiving the upload; `typedRoutes: true` is on, which is what makes the `staff-tabs.ts` ordering constraint real |
| `@supabase/supabase-js` | `^2.97.0` | Service-role client for the import write path |
| `@supabase/ssr` | `^0.8.0` | Cookie-bound client for the capability check |

[VERIFIED: read from `/Users/etiesse/Resonate/package.json`, 2026-08-15]

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| A hand parser | `ical.js` 2.2.1 | Mature (npm since 2014, repo `github.com/kewisch/ical.js`), zero runtime deps. **Rejected:** its value is the parts this phase must not use — timezone resolution and `Date` construction. The anchors are weekdays of a **civil** date; the correct operation is to take the `YYYYMMDD` prefix verbatim and never build a `Date`. A library that helpfully converts is a library that can shift a day |
| A hand parser | `node-ical` 0.27.1 | Convenient (`parseFile`, RRULE expansion built in). **Rejected:** pulls `temporal-polyfill` and `rrule-temporal` transitively — a large surface for a 39 KB file, and it makes the timezone conversion the default rather than the exception |
| A hand parser | `rrule` 2.8.1 | Would cover the one recurring entry. **Rejected:** one entry, one `FREQ=WEEKLY;BYDAY=…;UNTIL=…`. See §RRULE for the recommended treatment, which is smaller than a dependency and louder than one |
| Reusing `organizer.access` | — | See §Access: it is the wrong *question*, and it leaves Phase 45 nothing to take away |

**Version verification:** `npm view <pkg> version` run for each candidate on 2026-08-15.
No candidate is adopted, so none enters `package.json`.

---

## Package Legitimacy Audit

No package is installed by this phase. The three candidates were nonetheless audited,
because "we decided not to" is only a defensible answer if the alternative was actually
examined.

| Package | Registry | Age | Source repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `ical.js` | npm | created 2014-05, last published 2025-08 | `github.com/kewisch/ical.js` | `[OK]` | **Not adopted** — for the timezone-engine reason, not a legitimacy reason |
| `node-ical` | npm | created 2017-02, last published 2026-07 | `github.com/jens-maus/node-ical` | `[OK]` (with a note: *"name starts with `node-` — classic LLM naming pattern … but package is established"*) | **Not adopted** — transitive weight |
| `rrule` | npm | created 2012-08, last published 2023-11 | `github.com/jakubroztocil/rrule` | `[OK]` | **Not adopted** — one recurring entry |

**Packages removed due to a `[SLOP]` verdict:** none.
**Packages flagged `[SUS]`:** none.

### An operational finding about the audit tool itself

**`slopcheck install <pkgs>` actually performs `npm install`.** Running it in this
repository added the three candidates plus four transitive packages to `package.json`
and `package-lock.json`. Reverted immediately with
`git checkout -- package.json package-lock.json && npm prune`, and the working tree was
confirmed clean afterwards with `git status --porcelain` returning nothing.

Use **`slopcheck scan`** — the subcommand list is `{install, scan, init, allow}` — or run
the tool from a scratch directory. A verification tool that mutates the thing it is
verifying is the same shape as *«il contatore di controllo non legge la superficie che
sta muovendo»* (`ai-engineering.md`), and it is worth writing down before somebody runs
it under time pressure and commits the diff.

[VERIFIED: `npm view` for each package; `slopcheck install` run and its side effect
observed and reverted, 2026-08-15]

---

## The File's Structure — measured

### Container

| Fact | Value | Why it matters |
|------|-------|----------------|
| `VEVENT` count | **92** | The assertion the golden-file check anchors on. `44-CONTEXT.md` says 88; re-measure if the file changes |
| Components present | `VCALENDAR` ×1, `VTIMEZONE` ×2, `DAYLIGHT` ×2, `STANDARD` ×2, `VEVENT` ×92, `VALARM` ×40 | The parser must track **nesting**. A flat line scanner reads `VTIMEZONE`'s four `DTSTART`s as events and `VALARM`'s `TRIGGER` as an event property |
| Line endings | **LF only** | RFC 5545 mandates CRLF. A parser that splits on `\r\n` reads this file as one line. Split on `\r?\n` |
| Folded lines | **3** | Unfolding is not optional. RFC 5545 §3.1: a line beginning with space or tab continues the previous one, and the leading character is removed |
| `SUMMARY` escapes today | **0** | But `\,` `\;` `\n` `\\` are legal and the `SUMMARY` is the **join key**. Unescape before matching, or the first venue name containing a comma silently fails to join |
| Distinct `UID`s | **92 of 92** | Every entry has a stable, unique identity. This is the idempotence key |
| `UID` shape | five hex groups (UUID-like), Apple-generated | Opaque; never parse it, only compare it |
| `SEQUENCE` values observed | 0 … 18 | It moves, so it is usable for change detection |
| `LAST-MODIFIED` | present on all 92, and **not** equal to `DTSTAMP` on every row | Maintained rather than copied — usable as a second change signal |
| `RRULE` on a `VEVENT` | **1** (plus 4 inside `VTIMEZONE`, which are not events) | See §RRULE |
| `RECURRENCE-ID` / `EXDATE` / `RDATE` | **0** | No exception instances to reconcile today. The parser should still refuse them loudly rather than ignore them |

### Dates and times

Every `VEVENT` `DTSTART` and `DTEND` has the form `YYYYMMDDTHHMMSS` with a `TZID`
parameter — no `Z` suffix, no `VALUE=DATE`, no all-day entries. **Two distinct IANA
timezone identifiers appear**, in the same UTC-offset family; their distribution across
entry kinds is thoroughly mixed, so **`TZID` carries no classification signal** and must
not be used as one. It reflects where the entry was authored, nothing else.

**The rule this imposes, and it is the single most important line in this section:**
take `DTSTART[0..8]` as a **civil date** and never construct a `Date`, never call
`toISOString`, never convert to UTC. The anchors are weekdays of a local calendar; a
conversion that moves a 22:00 entry across midnight moves its weekday, and a weekday that
moves turns a conforming night into a reported error. This is the same failure the
roadmap's criterion 3 was corrected to prevent, arriving through a different door.

[VERIFIED: structural parse of the real file, 2026-08-15]

---

## Entry Grammars — the classification rule (D-44-20, D-44-21)

Ninety-two summaries reduce to **four classes** and **three grammars**. Below,
`Wrd` stands for a redacted word, `NNN` for a progressivo, `SIGLA` for one of the
already-public series codes.

### Class A — the canonical piece form

```
<Kind> - <SIGLA>-<NNN>[ - <PartMarker>]
```

Kind vocabulary measured, in full: **`Listing`, `Timetable`, `LiveCut`, `After Movie`,
`Recap`, `Tonight`**. Zero `Podcast` — confirming `production-calendar.md`'s gate that a
calendar entry saying `Podcast` today is an error.

Series codes measured in this form: `RSNT`, `SNST`, `RSNT-PRLN`, `RMDB-BZ`, `RMDB-MR`.
No `MTNLB` (D-44-19 confirmed: MotionLab has no dates).

The optional third segment is the per-dj part marker, present only on `LiveCut` for
`RSNT` and `SNST`. `RSNT-PRLN` LiveCuts carry none — one episode, matching the light
pipeline `production-calendar.md` records for that series.

**Counts:** Listing 13 · LiveCut 27 · Timetable 6 · After Movie 6 · Recap 2 · Tonight 2.
**56 entries.**

### Class B — the legacy inverted piece form *(new finding, C4)*

```
<FormatName> <NNN> - <Kind>
```

**3 entries**, all confined to the two earliest editions of the night. Same kind
vocabulary, no sigla, the number attached to the format word instead. Adding these to
class A gives Listing 14, Timetable 7, After Movie 7 — which reconciles exactly with the
totals `44-CONTEXT.md` recorded, so the CONTEXT's counting tool did see them; it is the
written spec (D-44-21) that records only two grammars.

**These three entries carry both of the file's genuine anchor overrides.** A parser that
handles two grammars drops them, and with them the only live evidence that D-44-09b part
1 is needed at all.

### Class C — the night form

```
<FormatName>[ x <VenueWord>] <NNN>
```

No kind token, **no sigla**. Format words measured: the four public format names, of
which three appear. **14 entries**, spanning the venue-suffixed and unsuffixed shapes.

This is D-44-21's core problem, and it is measurable: **a matcher keyed on sigle finds
zero nights.**

### Class D — everything else

**19 entries** the three grammars do not describe. Two sub-shapes:

- **16** carrying no format word at all — one-word and short multi-word titles, spread
  across every weekday, with start hours and durations that match nothing in the
  production pipeline. These are D-44-18's external commitments: they occupy a day and
  nothing more.
- **3** carrying a **format word but no recognisable kind and no progressivo** — a
  format word with a non-kind suffix, at times and durations matching neither a night
  (4–8 h, evening) nor a piece (30 min, late morning). These are the entries D-44-20 was
  written for. **They must be recorded as `unclassified` with their UID and counted, not
  guessed and not dropped.** Guessing gives one of them a format and a progressivo it
  does not have — the precise harm D-44-18 names.

### A corroborating signal that must never become a classifier

Every piece in the file is a **30-minute block in the late morning**. Nights are 4-, 7-
or 8-hour blocks starting in the evening. Class D is heterogeneous on both axes.

Use this as a **warning**: when the grammar says *piece* and the duration says *night*,
report the disagreement. Do not use it to decide, because the day the owner books a piece
at a different hour, a duration-based classifier silently reclassifies it.

### The join, and why it needs a declared alias table

Pieces name a **series code**; nights name a **format word and sometimes a venue word**.
Neither string contains the other's key. Two facts make this more than a string
transformation:

1. **Two satellite nights legitimately share the progressivo `001`**, under different
   series, distinguished only by the venue word. Measured directly: a join keyed on
   format + number alone put one satellite's listing at a **positive** offset from its
   night — a piece published after the night it announces. The join was wrong, not the
   calendar.
2. The venue word → series code mapping is an **abbreviation**, not a derivation. It
   cannot be computed and must be declared.

**Where the alias table must live: in the database, never in tracked source.** A venue
word for a space not yet acquired cannot be written into a public repository
(D-44-04; `venue-acquisition.md`, *uno spazio non acquisito non si nomina*). Two viable
homes, both in data:

- an `ics_alias text` column on `public.party_series` (add via migration; the **column**
  is public, the **values** arrive at runtime), or
- resolution against `public.venues.name`, with the series code taken from the series
  already attached to that venue.

The first is more explicit and does not depend on venue naming staying stable. Either
way the migration seeds **nothing**.

---

## RRULE — recognise, expand narrowly, refuse loudly

Exactly one `VEVENT` recurs: `FREQ=WEEKLY` with a `BYDAY` list of two weekdays and a
bounded `UNTIL`. It belongs to class D — an external commitment — and its window closed
in the past, so expansion has **no forward value today**.

That is precisely why the tempting answer is wrong. "It doesn't matter, it's in the past"
is true this week and false the week the owner adds a recurring commitment for next
season; and a recurring day that is not expanded is a day the calendar shows as free
while it is taken, which defeats D-44-18's entire reason for existing.

**Recommendation:**

- Expand **exactly** `FREQ=WEEKLY` + `BYDAY` + `UNTIL` (+ `INTERVAL` if trivially
  supported), on civil dates, capped at a declared maximum number of occurrences.
- Store each occurrence as its own commitment row with `expanded_from` pointing at the
  parent and a synthetic key of `UID + occurrence date` — because one `UID` covers many
  days, and `UID` alone is no longer unique across occupied days.
- **Refuse loudly** on anything else: another `FREQ`, `COUNT`, `BYSETPOS`, `BYMONTHDAY`,
  `EXDATE`, `RDATE`, `RECURRENCE-ID`. Refusing means *reported in the import run's
  summary as an unsupported entry*, never a silent skip and never a partial expansion.
  None of these appear today, which is exactly when the refusal is cheap to write.

---

## The Anchor Model

### The primitive: ISO week + weekday, on civil dates

Every rule below resolves as *"the &lt;weekday&gt; of/before/after &lt;anchor event&gt;"*.
Never a day count. The roadmap's criterion 3 says why; the measurements say how much.

### Measured conformance

| Format family | Piece | Anchor | Rule | Conformance measured |
|---|---|---|---|---|
| The night | Timetable | itself | the night's own day | **7 / 7** — offset 0 in every case, no exception (corrects C2/C3) |
| The night | LiveCut | the **next** edition | Tue, Wed, Thu of the ISO week containing the next night | **6 / 6** editions where a next edition exists; every LiveCut fell in that ISO week |
| The night | After Movie | the **next** edition's listing | the day before it (a Monday, because the listing is a Tuesday) | **6 / 7** exactly −1; the 7th is a legacy-form override |
| The night | Listing | — | Tuesday, **but the week is not fixed** | Multiset of offsets: {−11 ×4, −17, −18} — see below |
| SunSet | LiveCut | itself | Monday **and** Tuesday following | **6 / 6** (3 editions × 2 episodes) |
| SunSet | Listing | — | Tuesday, week not fixed | {−11 ×2, −18} — matches `production-calendar.md` exactly |
| Satellite | Listing | itself | the nearest preceding Tuesday | **1 / 1** cleanly measured; the second was blocked by the alias ambiguity described above — `production-calendar.md` reports 2/2 |
| Satellite | Tonight | itself | the night's own day | **2 / 2** |
| Satellite | Recap, LiveCut | itself | the nearest following Monday | **2 / 2** each |
| Perlone series | Listing | itself | the nearest preceding Tuesday | **2 / 2** |
| Perlone series | LiveCut | itself | the nearest following Monday, one episode | **2 / 2** |

### The finding that extends D-44-23

**The night's listing is no more derivable than SunSet's.** All night listings fall on a
Tuesday, but one to two and a half weeks ahead, with three distinct anticipations across
six editions. D-44-23 withholds proposals for SunSet listings because *"the anticipation
is not a fixed number, so nothing may derive a SunSet listing date"*. The identical
sentence is true of the night, and the plan must withhold there too.

Only **satellite and Perlone** listings sit on the nearest preceding Tuesday and may be
proposed.

### Why "measured from the night" is the wrong measurement, with numbers

The same pieces that conform perfectly against their true anchor look chaotic against
the night: after-movie spreads of 9, 16, 80 and 143 days; LiveCut spreads from the low
twenties to over 150. **The variability is in the point of observation, not in the data**
— `44-CONTEXT.md` D-44-25 says exactly this, and the measurement confirms it at full
scale. A plan storing offsets would flag most of the archive as broken.

### Three distinct reasons a date cannot be computed, and they must stay three

Collapsing them into one "unknown" is the collapsed-`catch` pattern this project has
already paid for once (`meta-gates.md`, the newsletter precedent).

| Reason | When | What the surface says |
|---|---|---|
| `awaiting_next_edition` | The anchor edition is not in the calendar | *waiting for `<series>-<N+1>`*, naming it, with no date (D-44-12 — and it covers **LiveCut** as well as the after movie) |
| `depends_on_lineup` | The number of LiveCuts is not knowable | *depends on the line-up*, no figure (D-44-13). Measured: one archived edition carries two LiveCuts rather than three, so **three is not a constant** |
| `not_derivable` | Night and SunSet listings | No proposal at all, by rule — the anticipation is not a number (D-44-23, extended) |

One edition in the file has a listing and a timetable but **no LiveCut and no after
movie**, because the following edition is not in the calendar. That is the rule behaving
correctly and must not be "fixed" — `production-calendar.md` records the same case.

### D-44-10 and D-44-11 dissolve, and the planner should know why

D-44-11 exists to stop a re-import silently discarding an override. **With the file as
the source (D-44-01) and the surface read-only (D-44-02), there is nothing to discard.**
An override is simply a date written in the file that differs from the rule. The
re-import re-reads it every time.

So the storage form is two plain columns, not a memory of an edit:

- `origin` — `'file'` or `'proposed'`. A written date always wins (D-44-09b part 1).
- `conforms_to_rule` — computed at import, stored for internal use, **never drawn**.

That satisfies D-44-10 (no label on screen), satisfies D-44-11 (durable, and the import
cannot lose it), and removes a stateful "remembered override" flag that would have to be
kept correct across re-imports. `conforms_to_rule` earns its place by feeding the
divergence report of D-44-07, not the UI.

---

## The Import Path

### The constraint that decides the shape

`docs/` is gitignored (`.gitignore:67`) and held there by check **F** of
`npm run verify:persona`, which requires both that the directory is ignored **and** that
nothing inside it is already tracked. **It is therefore not deployed.** A production
Next.js server on Vercel cannot read `docs/Music-*.ics`; the file exists only on the
owner's machine. Any design premised on the server reading the path is not implementable.

### The two viable shapes

**Shape 1 — a capability-guarded upload inside the product.** The owner opens the
calendar surface, picks the `.ics` from disk, and a Server Action parses it server-side
and writes the derived rows. The raw file is **never persisted** — not to Storage, not to
a column, not to a log.

- Honours D-44-01/D-44-02 literally: *the app updates by re-importing*.
- Never touches the repository.
- Works from any machine, with no terminal.
- Cost: the file transits a serverless function. Mitigations are mandatory and cheap —
  never log the body, never echo a `SUMMARY` in a returned error, construct the
  service-role client **after** the capability check.
- Size: Server Action bodies default to **1 MB**, configurable at
  `experimental.serverActions.bodySizeLimit`. `next.config.ts` sets no
  `experimental.serverActions` today, so the default applies. The file is ~39 KB — about
  25× headroom. No config change needed; the number should be asserted at parse time so
  a future 1 MB file fails with a sentence rather than a framework error.
  [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/serverActions]

**Shape 2 — a local script under `scripts/`.** Reads `docs/*.ics` directly and writes
with `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

- The material never leaves the machine at all — the strongest possible reading of *gate
  riservatezza prima della comodità*.
- Needs no new HTTP surface, no upload guard, no write policy.
- Cost: it is not "the app". And it is the only path available **before the surface
  exists**, which the first import necessarily is.

**Rejected — a Supabase Storage bucket.** It creates a durable second home for the
confidential file, plus a bucket policy to get wrong, for no benefit: the parse is
stateless and the derived rows are the deliverable.

### Recommendation

**Build both, over one shared definition.** Shape 2 first (it is required for the first
import), Shape 1 as the product path the phase's goal describes.

```
src/lib/production/ics/
  unfold.ts        # RFC 5545 line unfolding, CRLF-tolerant
  parse.ts         # component nesting -> typed VEVENT records
  classify.ts      # the four classes, three grammars, declared inclusion rule
  anchors.ts       # ISO-week + weekday resolution; the three not-computable reasons
  reconcile.ts     # UID-keyed upsert plan, divergence report — returns, never writes
  index.ts
```

Every module here is **pure**: no `next/headers`, no Supabase client, no `fs`. That is
what lets the same code be exercised by a script, by a Server Action, and by the
golden-file check — and this repository has a strong precedent for the pattern and for
what happens without it (three menus, ten ownership checks, both recorded in
`staff-tabs.ts` and `guards.ts`).

`reconcile.ts` **returns a plan and performs no writes.** The caller applies it. That is
what makes a dry run possible, and a dry run is the only rehearsal available in a
repository with no test runner.

**Where the callers go**, per the measured `(work)` convention — `formats` does exactly
this: the page at `src/app/(admin)/admin/(work)/formats/page.tsx`, its modules and
`actions.ts` one level out at `src/app/(admin)/admin/formats/`. The sibling directory has
no `page.tsx`, so it contributes no route.

**A `"use server"` file publishes every export as a public endpoint.** The parser must
not be re-exported from `actions.ts` — the reason `src/lib/media/may-upload.ts` is a
plain module rather than an export of its neighbour, stated in that file.

---

## Idempotence and the Monotone Guard

### The key is `UID`

92 of 92 are unique and Apple maintains them across edits. Not the `SUMMARY` (it changes
when the owner renames a night), not `(date, title)` (both change), not a content hash
(it changes on every edit, which is the opposite of what an identity needs).

`source_uid UNIQUE` on each imported table, and the write is
`ON CONFLICT (source_uid) DO UPDATE`. Re-running the import twice is then a no-op by
construction, not by care (D-44-03).

For expanded recurrences the key is `UID + occurrence date`, because one `UID` covers
many days.

### Change detection

`SEQUENCE` (observed range 0–18, so it genuinely moves) and `LAST-MODIFIED` (present and
maintained). Store both. A **decreasing** `SEQUENCE` for a known `UID` is an anomaly —
report it, do not silently accept it.

### Disappearance is not deletion

An entry present in a previous run and absent now must **not** be deleted. It may be a
`UID` change, a partial export, or the wrong file. Mark `absent_since` and report the
count. A plan row already linked to an announced night must survive absence
unconditionally — deleting it would orphan a night with tickets on sale, which is exactly
the harm D-44-06 separates the two tables to prevent.

### What makes renumbering structurally impossible

Three layers, in increasing order of how hard they are to bypass:

1. **The number is read from the file, never generated.** No counter, no `max()+1`.
2. **The import never writes `event_parties`.** `bump_series_watermark` fires on
   `event_parties` writes and raises `party_series.highest_assigned` with `GREATEST`,
   never lowering it — it is `SECURITY DEFINER` with `SET search_path = ''` because
   `party_series` carries no write policy. The import writing to its own tables cannot
   move that watermark at all. The **announcement act** (D-44-06) is the single bridge,
   and it is the single place the watermark can rise.
3. **A `BEFORE UPDATE` trigger on the plan table refuses any change to `number`.** A
   re-import that reads a different number for a known `UID` is a **reported divergence**
   (D-44-07), not an update. A guard in a trigger survives the caller that forgot it; a
   guard in application code does not.

Note the guard is deliberately *"number never changes"* and **not** *"number must exceed
the watermark"*. The archive legitimately contains numbers far below it (D-44-08), and a
watermark comparison would refuse the entire past.

[VERIFIED: `supabase/migrations/20260810120000_formats_and_series.sql` §5, read directly]

---

## Migration Shape

The smallest structure supporting plan rows, pieces, the checklist and external
commitments — given that `event_parties` already exists and the calendar is a **separate
plan** (D-44-06).

### What `event_parties` already has, confirmed against the migrations

`date` (a real `date` column, added 2026-02-26), `time`, `end_time`, `venue_text`,
`venue_id`, `venue_secret`, `venue_secret_hint`, `lineup text[]`, `format_id`,
`series_id`, `number`, `event_id`. Also relevant: `public.party_credits` is the
**structured** line-up while `event_parties.lineup` is *the communicated text* — the
migration says so in as many words. **The LiveCut count of D-44-13 should read
`party_credits`, not the text array.**

### Five tables

1. **`public.production_plan`** — one row per class-C entry.
   `source_uid` UNIQUE · `source_sequence` · `source_last_modified` · `date` (civil) ·
   `start_time` · `end_time` · `format_id` FK · `series_id` FK · `number` ·
   `venue_word text` *(internal, never public)* · `venue_id` FK nullable ·
   `venue_stage text CHECK IN ('mapped','verified','contacted','acquired')` (D-44-05,
   vocabulary already public in `venue-acquisition.md`) ·
   `linked_party_id uuid REFERENCES public.event_parties` nullable (D-44-06/07) ·
   `first_seen_at` · `last_seen_at` · `absent_since`.

2. **`public.production_piece`** — one row per piece, written **or proposed**.
   `source_uid` UNIQUE nullable *(null for proposals)* · `plan_id` FK **nullable** ·
   `series_code` · `number` · `kind text CHECK IN ('listing','tonight','recap','livecut','timetable','after_movie')` ·
   `part_marker` · `date` nullable · `origin text CHECK IN ('file','proposed')` ·
   `unresolved_reason text CHECK IN ('awaiting_next_edition','depends_on_lineup','not_derivable')` nullable ·
   `conforms_to_rule boolean` nullable · `naming_convention text CHECK IN ('canonical','legacy')`.

   `plan_id` is nullable because **an orphan piece exists in the file**: one after movie
   whose night is not in the calendar at all. `series_code` + `number` are kept so it can
   join later if that night is ever added.

   Two CHECKs earn their place: exactly one of (`date`, `unresolved_reason`) is non-null;
   and `origin = 'proposed'` requires `source_uid IS NULL`. Together they make "a
   proposal that pretends to come from the file" unrepresentable.

3. **`public.production_commitment`** — class D (D-44-18).
   `source_uid` · `occurrence_date` · `start_time` · `end_time` ·
   `recurrence_raw text` · `expanded_from uuid` · UNIQUE `(source_uid, occurrence_date)`.
   **No `format_id`, no `series_id`, no `number` — deliberately.** The columns do not
   exist, so a commitment cannot be handed a progressivo by a bug. That is the difference
   between a rule and a guarantee.

4. **`public.production_checklist_item`** — D-44-14.
   `plan_id` FK · `kind` (the production steps: venue confirmed in writing, dj confirmed,
   photo arrived, exhibition-space approval) · `due_date` nullable · `ticked_at` ·
   `ticked_by`.
   **Late is computed, never stored:** `ticked_at IS NULL AND due_date < current_date`
   (D-44-15). A stored flag needs a cron to stay true, and this project has four crons
   nobody is notified about.

5. **`public.production_import_run`** — the observable effect.
   `started_at` · `finished_at` · `file_byte_size` · `entries_seen` ·
   `entries_by_class jsonb` · `unclassified_count` · `divergences jsonb` ·
   `unsupported_recurrences jsonb`.

   This table is not bookkeeping, it is the phase's answer to `meta-gates.md`: *«non
   esiste alcun error tracking … un fallimento che conta deve avere un effetto
   osservabile»*. A log line is a place nobody looks. A row the surface renders — *"last
   import: 92 entries, 19 unclassified, 1 divergence"* — is an effect a human sees.
   `divergences` must never contain a `SUMMARY`; a UID and a reason code are enough and
   are safe to read anywhere.

### RLS

- **SELECT:** `(SELECT private.has_capability('<the new key>'))` on all five, matching
  the `formats_select_catalogue_manage` / `party_series_select_catalogue_manage` shape
  already in production.
- **INSERT / UPDATE / DELETE:** **no policy at all** → only `service_role` writes. Same
  shape as `party_series`. The import runs as service role behind a capability check.
- **The one exception:** the checklist tick must be writable (D-44-16 — a tick warns but
  does not block). Do it as a `SECURITY DEFINER` function with `SET search_path = ''`,
  recording `ticked_by`, so the tick is an **act with an author** rather than a bare
  UPDATE policy. `bump_series_watermark` is the established shape.

  **Note for the planner:** D-44-02's *read-only* governs the calendar **dates**, not the
  checklist. Over-applying it produces an unusable checklist.

### The migration contains no material

Structure only. Every CHECK vocabulary above is already published in the persona
(`listing`/`tonight`/`recap`/`livecut`/`timetable`/`after_movie` in
`production-calendar.md`; the four stages in `venue-acquisition.md`). **Zero seeded
rows.** Every date, venue word and line-up arrives at runtime through the import. That
sentence is criterion 2, and it should be written into the migration header the way
`20260810120000` writes its own — that file's header is the model to copy, including its
paragraph on why MotionLab ships with no series.

### How it is applied

`POST https://api.supabase.com/v1/projects/{ref}/database/migrations` — the **migrations**
endpoint, not `/database/query`, so the project's migration history stays truthful. The
Supabase CLI is not installed; `supabase db push` is not a step anybody can run here.
`SUPABASE_ACCESS_TOKEN` is in `.env.local`. Precedent and rationale are written into
`20260810120000_formats_and_series.sql`'s header.

---

## Access

### A new capability key, not a reused one

`keys.ts` states the rule this decision follows: keys are **named by the question, not by
the predicate**, because three keys resolving to the same predicate today must remain
separable tomorrow.

| Candidate | Why not |
|---|---|
| `organizer.access` | The question is *may they reach the organizer area* — a routing question about the account. Reusing it makes the calendar reachable by every organizer permanently, and leaves **Phase 45 nothing to take away** when entitlement becomes per-section (PROD-02). Un-widening later is the direction `meta-gates.md` allows only with an explicit authorisation |
| `catalogue.manage` | *May they create an artist or a venue.* Wrong question; ties calendar reach to a catalogue grant |
| `admin.access` | Master-only. D-44-17 wants organizer as well |
| `staff.manage` | `requires_approved = false` **on purpose**, so a pending organizer is not refused in front of a queue. Nobody is standing in a queue in front of a production calendar; the reason does not travel. This is the argument `keys.ts` already makes, in writing, for `venue.reveal` |

**Recommended:** a fourteenth key — name is the owner's call, `production.read` is the
obvious shape — granted to `master` and `organizer` with **`requires_approved = true`**.
The surface holds spaces under negotiation and unannounced dates; an organizer whose own
access was never approved should be refused at the address, not shown a calendar whose
every row is a secret.

**This is an owner checkpoint, not ours.** The standing constraint in `44-CONTEXT.md`
returns anything touching access or venue secrecy to the owner. This touches both.

### The eight mechanical steps a new key requires — measured, not assumed

1. Row in `private.capabilities` + two grants, in a migration.
2. `CAP.<KEY>` in `src/lib/capabilities/keys.ts` **and** an entry in `CAP_DESCRIPTIONS`,
   which is a **total** `Record` — a missing description is a `npm run build` error. Edit
   the migration in the same commit; `keys.ts` says so and says why.
3. An entry in `CAPABILITY_ROUTES` on the **`routes`** branch, not `scope: "table"`.
   The trap is documented in that file at the `CATALOGUE_MANAGE` entry: a page bound to a
   table-only key is unreachable **for everyone**, with no build error and nothing in a
   log, because `resolveRoute` returns `null` and the middleware fails closed.
4. `alsoGatesTables: true` on that entry, since the key also gates the five tables.
   Omitting it produces no error — and is *"a declaration that lies by omission"*, the
   lie D-34-11 exists to prevent.
5. An entry in `staff-tabs.ts` — **only after the page exists on disk.** `StaffTab.href`
   is `Route`, and a static address enters the generated union only once a `page.tsx`
   serves it. The Formats tab could not land before its page for exactly this reason, and
   both workarounds were weighed and rejected in that file. Sequence the plans
   accordingly: page first, tab second.
6. RLS policies on the five tables asking the same key.
7. `npm run verify:capabilities` (needs a live database; **RED between the commit that
   adds the key and the deploy that applies the migration** — expected, not a failure),
   `npm run verify:routes`, `npm run build`.
8. Ambiguity check. `/admin/calendar` is two segments, both literal. Every existing
   two-segment `/admin/*` pattern in the map is literal and distinct, and there is no
   two-segment dynamic pattern, so the load-time ambiguity throw at the foot of
   `capability-routes.ts` will not fire. **Verify this again if the chosen address is
   dynamic** — that throw kills the whole application on first import, by design.

### The sentence that must survive into the plan

*The middleware is UX; the RLS is the boundary.* The map decides where a **redirect**
happens. It stops somebody arriving on a page; it stops nobody reading a row. Criterion 4
asks all three readers to ask the same **question of the same definition** — it does not
promote the map to a security control, and the plan must not describe it as one.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Series numbering / watermark | A counter, a `max()+1`, a second monotone guard | `party_series.highest_assigned` + `bump_series_watermark` | Already in production, `GREATEST`, `SECURITY DEFINER`, never lowers. A second guard is a second truth |
| Route ↔ capability binding | A prefix rule, a second menu, a hardcoded role check | `CAPABILITY_ROUTES` + `visibleStaffTabs` | Three menus already disagreed once; `staff-tabs.ts` throws at module load rather than letting it happen again |
| Event ownership | A fresh `created_by` comparison | `guards.ownsOrIsMaster` / `assertEventOwnership` | The `null !== null` trap is documented with its three-way mutation result. Do not re-derive it |
| Refusing out of a Server Action | `throw new Error("forbidden.…")` where a client must branch on it | A **returned discriminated value** | Next redacts messages thrown out of a Server Action in a production build. The refusal works in `next dev` and silently stops working where it matters |
| Timezone conversion of calendar dates | `new Date(...)`, `toISOString`, any tz library | The `YYYYMMDD` prefix, verbatim, as a civil date | The anchors are weekdays of a local calendar. A conversion that crosses midnight moves the weekday, and a moved weekday reports a conforming night as an error |
| Structured line-up | Splitting `event_parties.lineup` | `public.party_credits` | The migration states it outright: `lineup` is *the communicated text*; `party_credits` is the structured record. D-44-13's count comes from the latter |

**Where the usual advice inverts, and why that is a decision rather than an oversight:**
`.ics` parsing normally deserves a library. Here the required subset is closed and
measured (§The File's Structure), and every candidate's headline feature — timezone
resolution and `Date` construction — is the one operation this phase must not perform. A
hand parser of roughly 150 lines, held honest by a golden-file check against the real
file, is smaller than the dependency and does not have to be argued out of converting.
**This is only defensible with the golden-file check.** Without it, adopt `ical.js` and
take the civil date from its raw property value.

---

## Common Pitfalls

### Pitfall 1: Splitting on `\r\n`
**What goes wrong:** the whole file parses as one line, or as nothing.
**Why:** RFC 5545 mandates CRLF; this file is LF-only.
**Avoid:** split on `/\r?\n/`. **Warning sign:** an event count of 0 or 1.

### Pitfall 2: Not unfolding
**What goes wrong:** three properties are truncated mid-value; if one is a `SUMMARY`, its
entry misclassifies or fails to join.
**Avoid:** unfold before parsing — a line starting with space or tab continues the
previous one, minus that character. **Warning sign:** an entry whose grammar almost
matches.

### Pitfall 3: A flat line scanner
**What goes wrong:** `VTIMEZONE`'s four `DTSTART`s become events; `VALARM`'s `TRIGGER`
lands on the enclosing event.
**Avoid:** track `BEGIN`/`END` nesting and only collect properties at `VEVENT` depth.
**Warning sign:** 96 `DTSTART`s for 92 events.

### Pitfall 4: Joining pieces to nights by sigla
**What goes wrong:** **zero** nights match. Measured; and `44-CONTEXT.md` records a first
pass that reported 13 nights missing for this exact reason.
**Avoid:** normalise all three grammars to one key, through a declared alias table.
**Warning sign:** a "missing nights" count equal to the night count.

### Pitfall 5: Joining on format + number without the venue word
**What goes wrong:** two satellite nights share progressivo `001` under different series.
Measured: one satellite's listing resolved to a **positive** offset from its night.
**Avoid:** resolve the venue word to a series code first.
**Warning sign:** any piece dated after the night it announces.

### Pitfall 6: Storing anchors as day offsets
**What goes wrong:** the night falls Friday **or** Saturday, so one rule becomes two and
correct nights are flagged. Already happened once, in the discussion that produced
D-44-25.
**Avoid:** store `(anchor kind, weekday, direction)`; resolve with ISO week + weekday.
**Warning sign:** a conformance check whose failures cluster on one weekday.

### Pitfall 7: Deriving a night's or a SunSet's listing
**What goes wrong:** a proposal roughly a week and a half wrong, drawn beside real dates.
**Avoid:** `not_derivable` for both; propose only satellite and Perlone listings.
**Warning sign:** every night suddenly has a complete piece set.

### Pitfall 8: Treating "no next edition" as an error
**What goes wrong:** the import invents LiveCuts and an after movie for an edition that
does not exist.
**Avoid:** `awaiting_next_edition`, naming it (D-44-12).
**Warning sign:** the last edition in the file is the only complete one.

### Pitfall 9: Deleting rows absent from the current file
**What goes wrong:** a partial export, a renamed `UID` or the wrong file wipes the
archive — and can orphan a night already announced.
**Avoid:** `absent_since` + a reported count; deletion is a separate, explicit act.

### Pitfall 10: Logging or echoing a `SUMMARY`
**What goes wrong:** an unannounced date, a venue under negotiation or a line-up lands in
a Vercel log, an error toast, or — worst — a plan or verification document. Irreversible
in the last case.
**Avoid:** diagnostics carry `UID` + reason code, never the text. Verification scripts
print counts.

### Pitfall 11: Building the service-role client before the capability check
**What goes wrong:** an ordering slip turns the upload into an unauthenticated write path.
**Avoid:** check first, construct second; the guard returns the resolved context and the
client is created after it.
**Note:** `assertStaffManage` returns the context precisely so a caller does not re-ask —
*more than one `await assert…(` in one exported action is the defect*, and no build sees it.

### Pitfall 12: Claiming the phase is verified because something passed
**What goes wrong:** there is no test runner for the product. `npm run verify:persona`
covers the **persona**, not the product; `npm run verify` covers structural invariants,
not correctness.
**Avoid:** verification is `npm run build` + the golden-file check + written manual
procedures with `file:line` evidence, per the VERIFICATION.md gate in `CLAUDE.md`.

---

## Code Examples

Patterns from this repository, cited by file. No invented API surface.

### The load-time assertion pattern, which is this repo's substitute for a test

```ts
// Source: src/lib/routes/staff-tabs.ts:156-175 (abridged)
for (const tab of DECLARED) {
  const resolution = resolveRoute(tab.href);
  if (resolution === null) throw new Error(/* a tab pointing nowhere */);
  if (resolution.key !== tab.capability) throw new Error(/* a tab claiming the wrong key */);
}
```
Two failures, **two sentences** — one message covering both would be the collapsed-catch
pattern this project has already paid for. The import's classifier should follow the same
discipline: *unclassified*, *unsupported recurrence* and *divergent number* are three
findings, never one "problem".

### The monotone guard, and the shape a new guard should copy

```sql
-- Source: supabase/migrations/20260810120000_formats_and_series.sql §5 (abridged)
CREATE OR REPLACE FUNCTION public.bump_series_watermark()
RETURNS trigger
SECURITY DEFINER
SET search_path = ''
AS $$ ... SET highest_assigned = GREATEST(highest_assigned, NEW.number) ... $$;
```
`GREATEST`, never a plain assignment. `SECURITY DEFINER` because the table carries no
write policy. `SET search_path = ''` with every reference fully qualified — mandatory
under `SECURITY DEFINER`.

### The RLS read shape to copy

```sql
-- Source: supabase/migrations/20260810120000_formats_and_series.sql:449-450
CREATE POLICY party_series_select_catalogue_manage ON public.party_series
  FOR SELECT USING ((SELECT private.has_capability('catalogue.manage')));
```
Note the `(SELECT …)` wrapper — the initplan form the whole policy set uses.

### The refusal that survives a production build

```ts
// Source: src/lib/capabilities/guards.ts:73-79 (the rule, in prose)
// Next redacts the message of an error thrown out of a Server Action in a production
// build. A caller that needs to branch on the category must carry it as a tagged value
// decided by position — a discriminated result returned from the action.
```

---

## Runtime State Inventory

Not a rename, but the material lives outside the repository, so the categories are worth
answering explicitly.

| Category | Items found | Action required |
|---|---|---|
| Stored data | Supabase production: `event_parties`, `formats`, `party_series`, `party_credits` already hold night data. The five new tables start empty | The import populates them; **no data migration** — nothing existing is rewritten |
| Live service config | None. This phase adds no cron, no webhook, no external service | — |
| OS-registered state | None | — |
| Secrets / env vars | `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ACCESS_TOKEN` present in `.env.local` (names verified, values not read). No new secret | — |
| Build artifacts | None. No dependency added, so no lockfile change | — |
| **Material outside git** | `docs/Music-2026-08-15.ics` (current) and `docs/Music-2026-08-02.ics` (previous, kept for comparison). Gitignored at `.gitignore:67`, held by check **F** | Never commit. Re-measure the golden-file assertions if the owner supplies a newer file |

---

## Confidentiality Controls (criterion 2, made mechanical)

Criterion 2 is not satisfied by intention; it is satisfied by things that can be checked.

1. **The migration seeds nothing.** Every date, venue word and line-up arrives at
   runtime. Assertable by reading the file: zero `INSERT` of production material.
2. **The alias table is data, not source.** A venue word for an unacquired space in a
   tracked `.ts` or `.sql` file is a publication.
3. **Diagnostics carry UIDs, never text.** Applies to the import run row, the divergence
   report, error returns and every verification script's output.
4. **The golden-file check prints counts only** and skips loudly when `docs/` is absent —
   it must not be added to `npm run verify`, which runs on machines without `docs/`. A
   green `verify:all` that silently skipped a check is a lie about coverage.
5. **`npm run verify:persona` check F** already asserts both that `docs/` is ignored and
   that nothing inside it is tracked — `.gitignore` does not untrack what is already
   indexed. Run it in this phase, since the phase's whole subject is that directory.
6. **Every plan, summary and verification document this phase writes** is subject to the
   same rule as this file. `ai-engineering.md`: *when a spec holds material that cannot
   ship, keep it in `docs/`, uncommitted, and say why.*

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node / npm | everything | ✓ | project uses `next@16.1.6`, `typescript@^5` | — |
| Supabase CLI | applying migrations | ✗ | — | **Management API migrations endpoint** — the established path, documented in `20260810120000`'s header |
| `SUPABASE_ACCESS_TOKEN` | Management API | ✓ | `.env.local` | — |
| `SUPABASE_SERVICE_ROLE_KEY` | the import write path | ✓ | `.env.local` | — |
| `docs/Music-2026-08-15.ics` | import + golden-file check | ✓ (local only) | 92 `VEVENT`s | none — the check must skip loudly, never fail, on a machine without it |
| Test runner | — | ✗ | — | `npm run build` + `scripts/verify-*.mjs` + written manual procedures. **Do not add one in this phase** |
| Error tracking / monitoring | observing a failed import | ✗ | — | `production_import_run` rendered on the surface — the observable effect `meta-gates.md` requires |
| CI | any of the above running automatically | ✗ | — | every check is a written pre-deploy step |

**Missing with no fallback:** none blocking.
**Missing with fallback:** the Supabase CLI (Management API), the test runner (build +
scripts + manual procedures), error tracking (the import-run row).

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` → treated as enabled.

### Test framework

| Property | Value |
|---|---|
| Framework | **None exists, and none is added.** `package.json` has no `test` script and no `*.test.*` / `*.spec.*` file. The repository's actual mechanism is `scripts/verify-*.mjs` + `npm run verify` |
| Config file | none — see Wave 0 |
| Quick run command | `npm run build` (which is also the typecheck: `next build --webpack`) |
| Full suite command | `npm run verify` **plus** `node scripts/verify-ics-import.mjs` (new, and deliberately outside `verify:all` — see below) |

### Phase requirements → check map

| Req / Criterion | Behaviour | Type | Automated command | Exists? |
|---|---|---|---|---|
| PROD-01 / crit. 1 | The five tables exist with their constraints | manual | applied via Management API; confirmed by a read-back query | ❌ manual |
| PROD-01 / crit. 2 | No production material in any tracked file | scripted | `node scripts/verify-ics-import.mjs --no-material` + `npm run verify:persona` (check F) | ❌ Wave 0 |
| crit. 3 | Anchors resolve by weekday; conformance counts match the measurements | scripted | `node scripts/verify-ics-import.mjs` | ❌ Wave 0 |
| crit. 3 | Parser handles unfolding, nesting, escaping, LF-only, two TZIDs | scripted | same script | ❌ Wave 0 |
| crit. 4 | Middleware, page guard and RLS ask the same key | scripted + manual | `npm run verify:routes`, `npm run verify:capabilities` (needs live DB), plus a written procedure with a real staff session | partially ✓ |
| crit. 4 | A door-assigned staff session is refused | manual | written procedure, real role, not a service key | ❌ manual |
| crit. 5 | A second import changes nothing | scripted | dry-run: `reconcile()` returns an empty plan on the second pass | ❌ Wave 0 |
| crit. 5 | A `number` change is refused | manual | one `UPDATE` against the trigger, expecting the exception | ❌ manual |
| D-44-06 | The import never writes `event_parties` | scripted | grep assertion: no `from("event_parties")` in `src/lib/production/ics/**` | ❌ Wave 0 |

### The golden-file check — what it asserts

`scripts/verify-ics-import.mjs`, run **locally only**, over `docs/Music-*.ics`:

- container: 92 `VEVENT`s · 92 unique `UID`s · 3 folded lines unfolded · 0 `VALUE=DATE`
  · 1 event-level `RRULE` · 0 `RECURRENCE-ID`/`EXDATE`/`RDATE`
- classification: class A 56 · class B 3 · class C 14 · class D 19 · kind vocabulary is
  exactly the six · zero `Podcast`
- join: zero nights matched by sigla alone (the negative control) · zero pieces dated
  after the night they announce
- anchors: timetable 7/7 same-day · night LiveCut 6/6 in the next night's ISO week ·
  after movie 6/7 at next-listing −1 · satellite Tonight 2/2 same-day · satellite
  Recap & LiveCut 2/2 next Monday · SunSet LiveCut 6/6 Mon+Tue · night & SunSet listings
  reported `not_derivable`, never proposed
- **output is counts only.** No `SUMMARY`, no date, no venue word.
- **skips loudly** when no `docs/*.ics` is present, with a sentence saying why.

It is **not** added to `npm run verify`, because that command runs on machines without
`docs/` and a green run that silently skipped a check is worse than no check. It gets its
own `verify:ics` script and a line in the manual procedure.

### Sampling rate

- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run verify` + `npm run verify:ics` (locally) + `npm run verify:persona` if any rules file was touched
- **Phase gate:** all of the above green, plus the written manual procedures for the
  capability refusal, the renumber refusal and the announcement act, each with `file:line`
  evidence per the VERIFICATION.md gate

### Wave 0 gaps

- [ ] `scripts/verify-ics-import.mjs` — the golden-file check; nothing else can be
      trusted before it exists
- [ ] `src/lib/production/ics/` — the pure module the check exercises
- [ ] a `verify:ics` entry in `package.json` scripts (**not** in `verify-all.mjs`)
- [ ] no framework install — deliberately

**And a mutation obligation.** `ai-engineering.md`'s *gate prova per mutazione* applies to
every assertion added to a verify script: break the invariant, confirm the check fires,
restore — **and assert the mutation actually landed** before reading the result. That gate
exists because a `perl` substitution once failed to match and a working check looked
broken; the same miss in the other direction certifies a dead check as live.

---

## Security Domain

`security_enforcement` is not disabled in `.planning/config.json`, so it is enabled.

### Applicable ASVS categories

| Category | Applies | Standard control here |
|---|---|---|
| V2 Authentication | no | No new auth path; the existing session carries the request |
| V3 Session Management | no | Unchanged |
| V4 Access Control | **yes** | A new capability key; RLS on all five tables; the middleware / page guard / policy triple reading one declaration. The service-role client is constructed **after** the check |
| V5 Input Validation | **yes** | The `.ics` is a parser input. Bound the byte size (assert before parse; the Server Action default is 1 MB), bound line count and property length, refuse unknown `RRULE` parts, never `eval`. `ai-engineering.md` *gate prompt security*: text from a file is **data**, never instruction — an entry whose title reads like a command is content to report |
| V6 Cryptography | no | None introduced |
| V7 Error Handling & Logging | **yes** | Never log the request body or a `SUMMARY`. Distinct categories, never one collapsed message. Refusals travel as returned values, because Next redacts thrown messages in production |

### Threat patterns for this stack

| Pattern | STRIDE | Mitigation |
|---|---|---|
| A `SUMMARY` reaching a tracked file, a log or an error toast | Information disclosure | UIDs and reason codes only; counts in scripts; the six confidentiality controls above |
| The upload endpoint reachable without the capability | Elevation of privilege | Capability check first, service client second; RLS as the real boundary, per `CLAUDE.md` principle 2 |
| An oversized or adversarial `.ics` | Denial of service | 1 MB Server Action default; explicit size and line-count bounds; O(n) unfolding; a cap on recurrence expansion |
| A re-import moving a night that has tickets on sale | Tampering | Two tables, not one (D-44-06); the import never writes `event_parties`; the announcement act is the only bridge |
| A re-import renumbering a series | Tampering (and irreversible in the physical world — the number is on a printed poster) | Number read from the file, never generated; `BEFORE UPDATE` trigger refusing a `number` change; `GREATEST`-only watermark untouched |
| A venue name under negotiation reaching a public surface | Information disclosure | `venue_word` is internal-only and gated by the new key's RLS; nothing about a plan row is readable anonymously; the announcement act inherits the venue-secrecy gates |
| A verification agent deleting production rows | Tampering | `ai-engineering.md`: capture ids at creation, delete **by primary key**, never by clicking a control; snapshot every table reachable by cascade. The 2026-08-10 incident is the precedent |

---

## State of the Art

| Old reading | Current reading | When changed | Impact |
|---|---|---|---|
| Anchors are day offsets (−2 / +4 / −1) | Anchors are **weekdays relative to an anchor event** | persona 1.14.0, 2026-08-15 | A stored offset flags correct nights as errors. Criterion 3 was corrected for this |
| The piece is called `Podcast` | It is called **`LiveCut`**; `Podcast` is a different, not-yet-existing thing | persona 1.12.0 | The product must use production's word. A calendar entry saying `Podcast` today is an error |
| Two naming conventions | **Three** — a legacy inverted form exists | this research, 2026-08-15 | A two-grammar parser drops both real overrides |
| Zero recaps and tonights | **Two of each** | this research, 2026-08-15 | The two satellite dates are complete, not missing four pieces |
| One timetable at −1 | **All seven on the night itself** | this research, 2026-08-15 | The timetable rule is uniform and derivable |
| Night listings sit on the preceding Tuesday | A Tuesday, **1–2½ weeks out, not fixed** | this research, 2026-08-15 | Withhold night listing proposals, as D-44-23 already does for SunSet |
| The rotation ran unbroken across 27 dates | It is **a plan, not a history** — no satellite has aired | persona 1.15.0, 2026-08-15 | The archive surface (D-44-08) is how such a claim gets settled by looking |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | The three class-D entries carrying a format word are not nights and not pieces | Entry Grammars | If one is a real night, it is missing from the calendar. **Mitigated by design:** they are recorded as `unclassified` and counted, so the owner sees them rather than the import guessing. Confirm with the owner |
| A2 | The legacy inverted grammar is closed — it will not appear on new entries | Entry Grammars | Both grammars are supported anyway, so a new one costs nothing. Low risk |
| A3 | `party_credits` is the right source for the LiveCut count | Migration Shape | The migration states the distinction explicitly; if `party_credits` is sparsely populated, the count falls back to `depends_on_lineup` — which is D-44-13's correct answer anyway |
| A4 | A new capability key, `requires_approved = true`, master + organizer | Access | **Owner checkpoint.** Touches access; the standing constraint returns it to the owner |
| A5 | The upload Server Action is acceptable transport for the material | Import Path | If the owner judges the transit unacceptable, Shape 2 alone satisfies every locked decision except the literal reading of "the app updates". Both shapes share one module, so this is a caller-level reversal, not a redesign. **Owner's call** |
| A6 | The 88-vs-92 entry-count difference is a changed file, not a boundary disagreement | Corrections | If it is a boundary disagreement, the golden-file assertions need re-deriving. Cheap to settle: re-run the check when the file is next supplied |
| A7 | `/admin/calendar` (two literal segments) is the address | Access | If the address is dynamic, step 8's ambiguity check must be redone — that throw kills the whole application on first import |

---

## Open Questions

1. **A cancelled night** *(deferred in CONTEXT, unresolved here)*
   - Known: the file is the source, so a cancellation is an entry the owner deletes or
     renames. §Idempotence already refuses to delete on absence.
   - Unclear: whether a cancelled night keeps its progressivo. The monotone guard says a
     number is already on a poster, which argues that it does — the number is spent, and
     the next night takes the following one.
   - Recommendation: treat absence as `absent_since` + a report, never a deletion; do not
     build a cancellation concept this phase. Ask the owner whether a cancelled
     progressivo is retired or reused — it is a numbering decision, which is his.

2. **Two formats on the same day** *(deferred in CONTEXT)*
   - Known: it already happens by design — the tramonto and the night are two entries on
     one day, communicated as a pair.
   - Unclear: whether the surface should group them.
   - Recommendation: nothing in the data model forbids it (`production_plan` has no
     uniqueness on `date`). Leave grouping to presentation; do not add a constraint that
     would refuse the pairing the format is built on.

3. **Which piece kinds a format OWES** (D-44-09b part 2)
   - Known: `production-calendar.md` states the pipeline per format, and the file's two
     planned satellite dates carry all four pieces.
   - Unclear: whether the *owed* set is a rule in code or a row in `formats`.
   - Recommendation: a row. It changes with the pipeline, and the pipeline has changed
     twice this month. A rule in code makes the next change a deploy.

4. **The venue stage's source** (D-44-05)
   - Known: the four stages are public vocabulary; the calendar entry does not carry a
     stage.
   - Unclear: where a stage is authored, since the scouting material is Phase 45's.
   - Recommendation: a nullable column now, defaulting to *unknown*, filled by hand or by
     Phase 45. Do not infer a stage from the file — an inferred *acquired* is exactly the
     harm `venue-acquisition.md` names.

---

## Project Constraints (from CLAUDE.md)

Directives the plan must satisfy, extracted verbatim in substance:

- **Guardrail 1 — no test runner.** No plan step may claim a product change is verified
  because tests pass. Verification is `npm run build` + written manual procedures.
- **Guardrail 2 — the typecheck is the build.** There is no separate `typecheck` script.
- **Guardrail 3 — migrations are the schema truth.** `supabase/schema.sql` holds no RLS.
- **Guardrail 4 — `.planning/codebase/` is stale** (dated 2026-02-24). Verify any citation
  from it against current code.
- **Guardrail 5 — the repository is PUBLIC.** Every commit is an irreversible publication.
  `docs/` and `.firecrawl/` stay out, verified by check F.
- **Guardrail 6 — macOS/BSD.** `grep -E`, `sed -i ''`.
- **Response gate.** Every response carries a classification header; this phase is
  **Critical** (access + venue secrecy), so impact analysis and owner validation precede
  action on those two points.
- **Principle 2.** The middleware is UX; the RLS is the boundary.
- **Principle 5.** The venue secret is monotone.
- **Principle 6.** Zero silent failures — and with no error tracking, a failure that
  counts needs an **observable effect**, not a log line.
- **Principle 7.** Production has invariants as binding as code.
- **Principle 8.** Lexical precision: a *format* is not an *event*; `member` is not
  `approved`; `LiveCut` is not `Podcast`.
- **VERIFICATION.md gate.** A verification without a single `file:line` citation does not
  satisfy it.

---

## Sources

### Primary (HIGH confidence)
- `docs/Music-2026-08-15.ics` — structural parse performed this session: component
  nesting, property census, grammar masking, weekday/ISO-week join analysis. Content not
  reproduced
- `src/lib/routes/capability-routes.ts`, `src/lib/routes/staff-tabs.ts`,
  `src/lib/capabilities/keys.ts`, `src/lib/capabilities/guards.ts` — read in full
- `supabase/migrations/20260810120000_formats_and_series.sql` (watermark, policies,
  header), `20260225150000_party_architecture.sql`, `20260226300000_multi_sub_events.sql`,
  `20260226400000_party_lineup_venue_secret.sql`, `20260809003000_party_credits.sql`
- `package.json`, `next.config.ts`, `.gitignore`, `.planning/config.json`
- `.claude/rules/production-calendar.md` (persona 1.15.0), `venue-acquisition.md`,
  `ai-engineering.md`, `meta-gates.md`, `brand-visual-system.md`, `CLAUDE.md`
- `.planning/phases/44-the-production-calendar-comes-inside/44-CONTEXT.md`,
  `.planning/ROADMAP.md` §Phase 44, `.planning/REQUIREMENTS.md`

### Secondary (MEDIUM confidence)
- nextjs.org — `serverActions` config reference (doc version 16.3.1, updated 2026-06-25):
  default `bodySizeLimit` 1 MB at `experimental.serverActions.bodySizeLimit`. The project
  runs `next@16.1.6`; the default has been 1 MB across 14–16 but was not verified against
  16.1.6's own docs
- `npm view` for `ical.js` 2.2.1, `node-ical` 0.27.1, `rrule` 2.8.1, `ics` 3.12.0,
  `ical-generator` 11.1.0 — versions, creation dates, repositories, transitive deps
- `slopcheck` verdicts for the three candidates

### Tertiary (LOW confidence)
- The interpretation that the legacy inverted grammar is a superseded convention rather
  than an active one. Consistent with its confinement to the two earliest editions, but
  it is an inference. Both grammars are supported regardless

---

## Metadata

**Confidence breakdown:**
- File structure & grammars: **HIGH** — measured directly, counts reconcile to 92
- Anchor conformance: **HIGH** — every rule measured with its n, and its exceptions named
- Codebase mechanics (capability chain, watermark, RLS shapes, route conventions): **HIGH**
  — read from source with `file:line`
- Import-path recommendation: **MEDIUM** — a judgement between two viable shapes; both
  documented, the reversal is caller-level
- Capability key choice: **MEDIUM** — the reasoning is the project's own written rule, but
  the grant is an owner checkpoint
- Migration shape: **MEDIUM** — derived from measured requirements; the five-table split
  is a design proposal, not a measurement

**Research date:** 2026-08-15
**Valid until:** the moment the owner supplies a new `.ics`. Every count in this document
is an assertion about **that file**; a new file re-opens §The File's Structure and
§Entry Grammars, and the golden-file check exists to say so out loud.
