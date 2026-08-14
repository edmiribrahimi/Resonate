---
phase: 46-silent-failures-on-the-money-path
plan: 01
subsystem: planning-artifacts
tags: [requirements, copy, observability, money-path, checkpoint]
status: complete
requires: []
provides:
  - "OBS-02, OBS-03 and OBS-04 declared in .planning/REQUIREMENTS.md with traceability rows"
  - "46-COPY.md — every sentence phase 46 will ship, in one list, APPROVED in one pass 2026-08-14"
affects:
  - "46-04, 46-05, 46-06, 46-07 — RELEASED by the approval at 46-COPY.md"
tech-stack:
  added: []
  patterns:
    - "the refusal-category sentence written once and reused (community-membership.md)"
key-files:
  created:
    - .planning/phases/46-silent-failures-on-the-money-path/46-COPY.md
  modified:
    - .planning/REQUIREMENTS.md
decisions:
  - "OBS-05 is not created: it covered DI-41.2-09, out of perimeter under D-46-11"
  - "The traceability rows name every in-perimeter site explicitly rather than saying 'the in-perimeter sites'"
  - "The coverage figure was recounted by command (76), not derived by adding three to the printed 73"
  - "D-46-13 (owner, 2026-08-14): refundErrors > 0 terminates the refund cron run as failed, not 200"
  - "D-46-14 (owner, 2026-08-14): no channel is named to a guest who loses their receipts; the drink menu is QR-only at the bar and no staff surface shows orders"
  - "D-46-15 (owner, 2026-08-14): RECEIPT_KEEP_TAB_OPEN added — a preventive warning shown on a healthy state, explicitly NOT a member of any refusal union"
metrics:
  tasks_completed: 3
  tasks_total: 3
  completed: 2026-08-14
---

# Phase 46 Plan 01: Requirements and the Sentence List — Summary

Declared the three requirements this phase is measured against, drafted every
sentence it will ship into one document, and had that list approved by the owner
in a single pass with both open decisions answered.

**Status: COMPLETE.** No sentence was merged into any source file — this plan
opened none. **Plans 46-04, 46-05, 46-06 and 46-07 are released.**

---

## What was built

### Task 1 — `.planning/REQUIREMENTS.md` (commit `a8be947`)

A new section `### Observable Failure on the Money Path`, placed between
`### Production` and `## Future Requirements`, declaring three requirements and
no fourth:

- **OBS-02** — a failure on a money path produces an effect the person affected
  can see, or, where only staff can act, an effect staff can see. A log line
  does not discharge it: there is no error tracking, so a log is a place nobody
  looks.
- **OBS-03** — a failed read is never rendered as a legitimate value.
- **OBS-04** — a refusal with distinguishable causes says which one, wherever
  the next step differs; each wording is written once and travels as a returned
  value, never a thrown message.

`OBS-01` was left untouched in `## Future Requirements`.

Three traceability rows were added between the `RESP-04` row and the
`DS-04 | Phase 42` row, so the table keeps its execution order. Each names its
sites **by identifier** rather than gesturing at "the in-perimeter sites":

| Row | Sites named |
|---|---|
| OBS-02 | `DI-41.2-02`, `DI-41.2-04`, `DI-41.2-06`, `DI-41.2-06b`, `DI-TODO-B` |
| OBS-03 | `DI-41.2-03`, `DI-41.2-08`, `F-46-01`, `DI-TODO-A`, `DI-TODO-B` |
| OBS-04 | `DI-41.2-06`, `DI-41.2-06b` |

The `DS-08` row's Phase cell was repaired from `Phase 41 → 41.2` to
`Phase 41 → 41.1 → 41.2`, the three-phase form the `DS-07` and `RESP-01` rows
already use. Its prose is **byte-identical** — the diff touches the second cell
and nothing else, verified by `git diff -U0` on that row. The drift had been
recorded in prose by `41.2-VERIFICATION.md:420` and never applied to the cell.

### Task 2 — `46-COPY.md` (commit `ac0dc7f`)

302 lines, fifteen table rows across four plans, each carrying a constant name,
the owning plan, a re-measured `file:` predicate, the cause in one clause, and
the sentence.

| Plan | Rows | Surface |
|---|---|---|
| 46-04 | 3 constants + 1 caller fallback | the organizer's menu-closing command |
| 46-05 | 6 refusals **+ 1 preventive warning** (added at approval) | the guest's drink receipts |
| 46-06 | 1 | the public event page |
| 46-07 | 4 | the refund cron's report |
| 46-03 | **0, stated out loud** | observability, not a new refusal (D-46-08) |

Plus `## Two decisions inside this approval`, holding exactly the two questions
the plan defers to the owner — both now answered in place.

### Task 3 — the approval (commit `db406f1`)

The list was presented whole and approved whole. The document was then amended
with what the approval settled: the two answers recorded in place beside the
questions that produced them, the added sentence, the domain facts behind
Decision 2, and a disposition note on the refund cron string.

---

## The counted traceability row figure

Counted by command rather than derived by adding three to the printed figure,
because the printed figure and the note beneath it already disagreed by two:

```
LC_ALL=C /usr/bin/grep -cE '^\| [A-Z]+-[0-9]+[a-z]? \| Phase ' .planning/REQUIREMENTS.md
→ 76

LC_ALL=C /usr/bin/grep -cE '^- \[[ x]\] \*\*[A-Z]+-[0-9]+[a-z]?\*\*' .planning/REQUIREMENTS.md
→ 76
```

Before the edit both counts read **73**, while the note beneath the coverage
line still read **71**. Both the coverage line and the note now carry **76**,
and the note keeps its sentence about a count being corrected when it was wrong
at the time it was written, extended to record its own two-behind drift.

---

## The approved list's location

`.planning/phases/46-silent-failures-on-the-money-path/46-COPY.md`

**Approval state: APPROVED, 2026-08-14, by the project owner, in one pass over
the whole list** (D-46-10a).

**Rounds of amendment: 1.** The list was approved **as presented, with no
correction to any sentence**, and **one sentence was added in the same pass**.
The addition did not reopen anything already on the list, so the one-pass
property holds rather than degrading into a second round.

`git diff --stat src/` was empty at the moment of approval: no sentence had been
merged before the list was approved.

---

## The owner's verbatim answers to the two decisions

### The approval itself, verbatim

> **La lista delle frasi: APPROVATA**
>
> Approvata in blocco, in un passaggio solo, senza correzioni al testo
> presentato.

### Decision 1 — does `refundErrors > 0` make the refund cron run go red?

> **RISPOSTA: A — sì, rosso.**
>
> Con `refundErrors > 0` la run del cron termina come **fallita** (non-2xx),
> esattamente come già deciso per il delete di pulizia fallito (D-46-06).
> Ragione messa a verbale dal proprietario: è l'unico percorso della fase in cui
> del denaro deve tornare indietro e non torna, e senza error tracking un
> contatore dentro un 200 è una riga di log — un posto dove nessuno guarda. La
> fase che dichiara OBS-02 non può violarlo proprio lì.

**Carried into `46-COPY.md`** as a disposition note beside
`CRON_REFUND_REFUNDS_FAILED`: that string accompanies a **failed** run, not a
200. `CRON_REFUND_OK` stays a 200; the two delete strings were already failed
runs under D-46-06. Plan 46-07 implements it.

### Decision 2 — what a guest is told when the browser cannot hold their receipt, given that D-46-10c ships no bar-side lookup

> **RISPOSTA: A — le frasi restano come scritte. Nessun canale nominato.**

The owner supplied four domain facts during the approval, and they are the
**reason** rather than a preference. They are recorded in `46-COPY.md` §2
alongside the sentences, because a reason kept only in a summary is a reason the
next reader will not find before adding the missing route back in:

1. **The drink menu is reachable only by scanning a QR code at the bar**, and
   not before the night. Nobody buys who is not inside the venue with the code
   in front of them.
2. **The cross-browser loss scenario is therefore unreachable** — the camera
   opens the system browser, so the purchase and the re-read share one storage.
3. **No staff surface shows orders or tokens.** `DrinkMenuManager.tsx` manages
   the price list, not the orders. *Ask at the bar* would be a promise the
   product does not keep.
4. **The counter-side screen stays deferred** and no sentence anticipates it.

Owner's position, recorded: **the only real way to lose the tokens is to browse
privately and close the tab.** The menu ran without trouble at a past public
edition.

### The sentence added in the same pass

Verified by the orchestrator with `LC_ALL=C /usr/bin/grep` over `menu/`: **zero**
occurrences of any *don't close this tab* notice. The owner believed one was
already there. It was not.

> **Keep this tab open until your drinks are served — if you are browsing
> privately, closing it will lose them.**

Recorded in `46-COPY.md` §2b as `RECEIPT_KEEP_TAB_OPEN`, owned by plan 46-05,
rendered at `GuestTokenDisplay.tsx:637-663` above the grid at `:652`, on the
predicate the card already uses (`token.status === "active"`, `:441`).

**It is annotated, twice and in bold, as NOT a refusal and NOT a member of any
refusal union.** It is drawn when the state is healthy — a warning that arrives
before the failure it prevents, which is the opposite of every other row in the
document. Folding it into the union would make a `Record` total over a set that
no longer describes one thing.

---

## Verification performed

No test runner exists in this repository, so nothing here is claimed as verified
because tests pass. This plan opened no source file, so `npm run build` was not
the gate — the gate is the derivations below, each run and recorded.

| Check | Command | Result |
|---|---|---|
| the section exists once | `grep -c 'Observable Failure on the Money Path'` | `1` ✅ |
| three requirements, bold, house style | `grep -cE '\*\*OBS-0[234]\*\*'` | `3` ✅ |
| **OBS-05 does not exist anywhere** | `grep -c 'OBS-05' .planning/REQUIREMENTS.md` | `0` ✅ |
| three traceability rows | `grep -cE '^\| OBS-0[234] \| Phase 46 \|'` | `3` ✅ |
| no OBS row cites an out-of-perimeter item | `grep -nE '^\| OBS-0[234] \|' \| grep -cE 'DEF-41\.2-A\|DI-41\.2-(01\|07\|09\|10\|11\|12\|20)'` | `0` ✅ |
| DS-08 prose untouched | `git diff -U0` on that row | only the second cell changed ✅ |
| coverage figure equals the counted rows | both greps above | `76 = 76` ✅ |
| `46-COPY.md` exists and names its plans | `grep -c '46-0[4-7]'` | `26` ✅ |
| the reversed e appears nowhere | `grep -c 'ɘ'` | `0` ✅ |
| no sentence composed at run time | `grep -n '\${'` | no hits ✅ |
| the two-decisions section exists | `grep -c '^## Two decisions inside this approval'` | `1` ✅ |
| the added sentence is present and attributed | `grep -c 'RECEIPT_KEEP_TAB_OPEN'` | `4` ✅ |
| fifteen constant-bearing rows after the addition | `grep -cE '^\| \`[A-Z_]+\`'` | `15` ✅ |
| no *don't close this tab* notice exists today | `LC_ALL=C /usr/bin/grep` over `src/app/(public)/events/[slug]/menu/` | `0` — the reason the sentence was added ✅ |
| the render predicate for the added sentence is real | `grep -n 'token.status === "active"'` | `GuestTokenDisplay.tsx:441` ✅ |
| **no source file was opened** | `git diff --stat src/` | empty ✅ |
| no migration, no package change | `git diff --stat supabase/ package.json` | empty ✅ |
| **`npm run verify` never run** | — | confirmed; it reaches the Supabase Management API against production ✅ |

All coordinates cited in `46-COPY.md` were re-measured on 2026-08-14 with
`LC_ALL=C /usr/bin/grep -n` against the current tree, per this phase's standing
constraint that six of eight handed-down coordinates were stale.

---

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — coordinate correction] `capabilities/server.ts` cited at `:59-63`, not `:58-63`**

- **Found during:** Task 1, drafting OBS-04
- **Issue:** the plan's `<action>` cites `src/lib/capabilities/server.ts:58-63`
  for the redaction argument. Re-measured by predicate (`grep -n "redact"`),
  the paragraph runs `:59-63`; `:58` is an empty comment line.
- **Fix:** OBS-04 cites `:59-63`, which is also what `46-CONTEXT.md`
  `<code_context>` and `46-PATTERNS.md` §S2 already say.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Commit:** `a8be947`

**2. [Rule 2 — the note beneath the coverage line]**

- **Found during:** Task 1
- **Issue:** the plan asked that the note's figure be set to the counted value
  while keeping its existing sentence. Kept — and one clause added, recording
  that the note had itself drifted two behind the line it explains. Without it
  the next reader sees a note whose arithmetic no longer reconstructs from
  anything in the file.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Commit:** `a8be947`

### Not deviations, recorded so verification does not find them by surprise

- **`OBS-05` was deliberately not created** (D-46-11 removed the ground under
  `DI-41.2-09`). Asserted at `0` occurrences.
- **Roadmap success criterion 3** and **criterion 2's "five RSVP refusals"** are
  not met by this phase and cannot be — their code is under review for deletion.
  Stated in the plan's `<scope_limits>` and repeated here.

---

## Threat Flags

None. This plan opened no source file and introduced no network endpoint, auth
path, file access pattern or schema change.

Two threat-register dispositions were applied rather than merely noted:

- **T-46-01** (information disclosure in a sentence) — no sentence in
  `46-COPY.md` names another person's data, an order id, a membership code, an
  internal row value or a database code. The single permitted run-time value, a
  PostgREST `code` on the staff-facing menu-closing refusal, is documented as a
  note beside the sentence rather than interpolated into it, so the sentence
  itself stays static and the `grep '\${'` check holds.
- **T-46-02** (a public repository) — roles only; no venue, no unannounced date,
  no line-up, no contact.

---

## Known Stubs

None. Both decision blocks now carry the owner's answer verbatim; neither is
left as *to be decided during execution*.

## Deferred, and named so it is not mistaken for an omission

- **The counter-side lookup** stays deferred (D-46-10c, reaffirmed in this
  approval). No sentence in the approved list anticipates it.
- **`OBS-01`**, error tracking, stays in `## Future Requirements`. It is the
  reason OBS-02 is worded as *an effect somebody can see* rather than *an error
  that is logged*.

---

## Self-Check: PASSED

- `FOUND: .planning/phases/46-silent-failures-on-the-money-path/46-COPY.md`
- `FOUND: .planning/REQUIREMENTS.md`
- `FOUND: a8be947` — `docs(46-01): OBS-02, OBS-03 e OBS-04 …`
- `FOUND: ac0dc7f` — `docs(46-01): la lista delle frasi …`
- `FOUND: db406f1` — `docs(46-01): lista approvata in un passaggio …`
