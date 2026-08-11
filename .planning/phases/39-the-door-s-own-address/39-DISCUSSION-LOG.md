# Phase 39: The Door's Own Address - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-11
**Phase:** 39-the-door-s-own-address
**Areas discussed:** The address · Already-installed phones · The door pass · The inherited nav item

---

## Area selection

Four gray areas were presented. The owner did not select from them; they asked
the prior question:

> *"sono decisioni tecnico informatiche da expert persona o c'è qualche decisione
> che devo prendere io?"*

That was the right question and the presentation had failed to answer it. The
four had been offered as if they were equivalent, and they are not: two were
engineering readings with a defensible answer, one was operational (the owner's
time), and one was brand (a name on a real phone's home screen). The flow was
corrected by triaging them out loud and returning only what was genuinely the
owner's.

**Standing working rule this follows:** technical checkpoints are decided by the
expert and not handed to the owner.

---

## Decided by Claude, with reasons stated to the owner

| Item | Decision | Reason given |
|---|---|---|
| The address | `/door` | Short enough to type at 2am; and out of `/admin`, where the door was only ever placed by address and never by authorisation. The person at the door is not an administrator |
| The old address | `/admin/scanner` serves the door permanently, as a real page, never a redirect | A redirect needs a network the door is designed not to have — the literal justification STAFF-04 gives for existing as its own phase |
| STAFF-04 vs the ROADMAP goal | Not a contradiction | "Keeps an address of its own, not moved with the rest" and "moves to its permanent address in a step of its own" hold together. A reading, not a preference |
| `start_url` | Unchanged | Pointing it at the door would make every install, members included, open the door |
| The Phase 34 carry-forward | Closed here | It touches `MobileNav`'s props, i.e. the door's own page — the same file this phase opens anyway. Deferring it means opening that file twice |

---

## The door pass

| Option | Description | Selected |
|---|---|---|
| One trip, at the end of v1.5 | This phase's door pass absorbs Phase 38's seven deferred procedures — same room, same two phones, same night | ✓ |
| Two separate passes | Phase 39 runs its own as soon as the move is ready; Phase 38 waits for the batch | — |

**User's choice:** *Una sola, a fine v1.5.*
**Consequence recorded:** Phase 39 does not close before that night either. P6 stays
separate — it writes to production and needs its own fresh authorisation.

## The installable identity

| Option | Description | Selected |
|---|---|---|
| Yes — a separate installable door, owner names it | Second manifest scoped to `/door` with its own `start_url`; launching it opens the door. Name and icon are brand, so the owner picks them | — |
| No — one app | One manifest, `start_url: "/"` unchanged. Simpler to maintain | ✓ |
| Claude decides | — | — |

**User's choice:** *No, resta una sola app.*

**Consequence raised immediately, and written into CONTEXT.md as D-39-05 rather
than left to be discovered:** with one app and `start_url: "/"`, *"launched from
the home screen"* means landing on `/`, the members' home — not on the door. So
success criterion 2 is not a question about the old URL at all; it is *"with the
network off, can the person working the door get from the home screen to a
working door?"*, and it is carried by the service worker's precache, not by any
redirect.

---

## Measured during the discussion, not assumed

- `public/manifest.json`: `start_url: "/"`, `display: standalone`, **no `scope`**.
  So "a device that installed the door" does not exist today as distinct from
  "a device that installed the app". This predates the phase and is not caused by
  the move.
- `src/app/sw.ts`: the door's four `NetworkOnly` rules match on **API pathnames**,
  so they survive an address change untouched. The `/events/**` `NetworkOnly` rule
  is a deliberate venue-secrecy resolution (T-37-27, disposition ACCEPT) and is
  not this phase's to loosen.
- `src/lib/routes/capability-routes.ts`: the door's entry already carries
  `assignmentOpenable: true`, restored by plan 34-03 after being left behind — so
  a member of staff rostered by assignment, holding `door.operate` by nothing
  else, is not refused in front of a queue.

## Deferred Ideas

- A separate installable door app with its own icon and name — declined for now;
  if revisited, the name and icon are brand, not engineering
- Retiring `/admin/scanner` — refused rather than deferred: D-39-02 makes it
  permanent. Recorded so a future tidy-up does not read it as leftovers
