# Phase 44: The Production Calendar Comes Inside - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-15
**Phase:** 44-the-production-calendar-comes-inside
**Areas discussed:** The import path, Calendar and product (one table or two), Editorial anchors, The checklist, Access

> **A note on what this file may contain.** `.planning/` is tracked and this
> repository is public. The discussion referenced the production material; this
> log records the **shape** of each choice and never the material — no
> unannounced date, no space under negotiation, no line-up. The one format named
> below, MotionLab, is already public, and it is named without its candidate
> space.

---

## The import path

| Option | Description | Selected |
|--------|-------------|----------|
| In the app — it becomes the source | File and tracker become archive; one place, no divergence, but the calendar leaves the phone until the app exports | |
| Outside — the app re-reads | Work continues where it happens today; the app updates by re-importing, at the cost of two places that can diverge | ✓ |
| Import once, then the app | History enters once, then the app owns it | |

**User's choice:** Outside — the app re-reads.
**Notes:** Two consequences were derived rather than re-asked and recorded as
Claude's discretion: the calendar surface must be read-only, and the import must
be re-runnable without duplicating nights or renumbering a progressivo.

| Option | Description | Selected |
|--------|-------------|----------|
| Everything: past and future | The app becomes the memory too | |
| Only from today forward | Faster; progressivi stated by hand | |
| Future plus last edition per series | Just enough for numbering and the after-movie anchor | |

**User's choice:** Free text — the owner will supply an updated `.ics`
reflecting recent changes, and asked when to hand it over.
**Notes:** The offer was to paste it inline. **Declined, with the reason
given:** a production `.ics` carries unannounced dates, spaces under
negotiation and line-ups, and material pasted into the conversation feeds the
documents written from it — which live in `.planning/`, tracked and public. The
file goes into `docs/` instead, which is gitignored and held there by check F of
`verify:persona`. It was also established that nothing is needed yet: designing
the import requires the file's **structure**, readable from the existing
`docs/Music-2026-08-02.ics`.

| Option | Description | Selected |
|--------|-------------|----------|
| Exists, with the venue marked not acquired | Stage shown beside the date; name stays internal | ✓ |
| Exists, but with no venue name | Safest against leaks, blindest to what is being worked on | |
| Does not enter until the venue exists | The in-app calendar becomes "what is certain" | |

**User's choice:** Exists, with the venue marked not acquired.

---

## Calendar and product: one table or two

| Option | Description | Selected |
|--------|-------------|----------|
| A separate plan — announcing is an act | Re-import cannot move a night already on sale | |
| Already the event, unpublished | One row, simplest, but re-import reaches a night that may have sold tickets | |
| Separate plan, but linked after the announcement | As above, plus divergence between file and product is signalled | ✓ |

**User's choice:** Separate plan, but linked after the announcement.
**Notes:** This choice is what makes "the file is the source" safe. The risk was
stated in the option text rather than discovered later.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — the archive is needed | Makes the three-cycle rotation verifiable | ✓ |
| No — today forward only | A working tool, not an archive | |
| Yes, but collapsed | Archive on demand | |

**User's choice:** Yes — the archive is needed.

---

## Editorial anchors

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, but the override is visible | An exception stays a visible decision | |
| No, the rule is absolute | Simple; the first real exception is handled outside the app | |
| Yes, without distinction | Fastest; after three months rule and exception are indistinguishable | ✓ |

**User's choice:** Yes, without distinction.
**Notes:** The stated cost was read and accepted. **A collision was then
surfaced by Claude rather than left to execution:** with the file as the source
(first area) and no record of an override, a re-import would recompute an
overridden date and discard it silently. Resolved without reopening the choice —
the override is remembered internally so the import cannot trample it, and
nothing is drawn on screen, since the owner rejected the label and not the
durability.

| Option | Description | Selected |
|--------|-------------|----------|
| Says it is waiting for the next edition | No date, reason named beside it | ✓ |
| An estimated date, marked as such | Useful for planning; an estimate can be read as a deadline | |
| Does not appear until computable | The screen never lies, but a due piece nobody sees is forgotten | |

**User's choice:** Says it is waiting for the next edition.

| Option | Description | Selected |
|--------|-------------|----------|
| Says it depends on the line-up | No invented number | ✓ |
| Zero until there is a line-up | Zero and "not known yet" become indistinguishable | |
| A per-format reference number | A prediction to confirm | |

**User's choice:** Says it depends on the line-up.
**Notes:** Consistent with OBS-03, closed in Phase 46 on the money path: a count
that could not be read does not print a figure.

---

## The checklist

| Option | Description | Selected |
|--------|-------------|----------|
| Only the editorial pieces | What the pipeline produces, per format | |
| The pieces plus the production steps | Also venue confirmed, dj confirmed, photo arrived, space's approval | ✓ |
| A list you write per night | Maximum freedom, nothing reminds you of an omission | |

**User's choice:** The pieces plus the production steps.

| Option | Description | Selected |
|--------|-------------|----------|
| Flags it prominently | Late reads from the list without opening the night | ✓ |
| Shows it only inside the night | Calmer screen, needs remembering | |
| Nothing — it is only memory | No judgement about lateness | |

**User's choice:** Flags it prominently.

| Option | Description | Selected |
|--------|-------------|----------|
| No, it blocks nothing | Shared memory; a wrong tick does no damage | |
| Yes, announcing requires its ticks | A real guard, at the cost of being blocked by a forgotten tick | |
| Warns but does not block | Protects against distraction without standing in the way | ✓ |

**User's choice:** Warns but does not block.

---

## Access

| Option | Description | Selected |
|--------|-------------|----------|
| Master and organizer | The people who produce the nights; door staff stay out | ✓ |
| Only master | Narrowest, but organizers go back to asking for dates by voice | |
| Master, organizer and staff | Widest; exposes open negotiations to whoever is on the door | |

**User's choice:** Master and organizer.

---

## Claude's Discretion

The owner stated it outright when selecting the areas: *"ciò che è di competenza
tecnico informatico sceglie expert persona."* Taken under that delegation:

- The calendar surface is read-only (derived from the file-as-source choice)
- The import is re-runnable and never renumbers a progressivo
- An overridden piece date is remembered internally, invisibly
- The import mechanism's shape, the storage form of plan rows and anchors, the
  capability key's name, and the migration strategy

**The delegation has a stated limit:** anything touching access, money, the door
or venue secrecy returns to the owner before it is applied. Technical delegation
is not delegation of the four Critical domains.

## Deferred Ideas

- Manifesto, visual and location sections → Phase 45, with per-section
  entitlement
- An `.ics` export from the app → not needed while the file is the source; the
  first thing owed back if that ever inverts
- A cancelled night, and two formats falling on the same day → identified as
  gray areas, not discussed; left to research and planning
