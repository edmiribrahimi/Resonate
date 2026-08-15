# Deferred items — phase 44

Discovered while executing a plan, out of that plan's scope, and logged rather
than fixed.

---

## D1 — `verify:touch-targets` and `verify:conversion` fail on a stale manifest

**Found during:** plan 44-05, task 3 (running the verifiers the plan names).

**What happens.** Both scripts refuse before they measure anything:

```
FATAL: the manifest refuses, with 4 reason(s):
   CONVERTED names /admin/analytics/members at src/app/(admin)/admin/(work)/analytics/members/page.tsx, which is not on disk
   CONVERTED names /admin/analytics          at src/app/(admin)/admin/(work)/analytics/page.tsx,         which is not on disk
   CONVERTED names /admin/analytics/compare  at src/app/(admin)/admin/(work)/analytics/compare/page.tsx, which is not on disk
   CONVERTED names /admin/finance            at src/app/(admin)/admin/(work)/finance/page.tsx,           which is not on disk
```

**Why it is not this plan's.** The four surfaces were deleted by commit
`763ade8` — *«Finance e Analytics eliminate per intero, non nascoste»* — a
milestone decision that predates phase 44 entirely. The manifests inside
`scripts/verify-touch-targets.mjs` and `scripts/verify-conversion.mjs` were not
updated in the same commit, so both have been red since. Neither script names a
single file under `src/app/(admin)/admin/calendar/`: `verify:touch-targets 2>&1
| grep -i calendar` returns nothing.

**What it costs while it stays.** More than a red tick. Both scripts refuse
**before measuring**, so nothing on the touch-target and conversion gates is
being checked at all right now — including on surfaces that were converted after
`763ade8`. A gate that fails for a reason nobody reads is indistinguishable from
a gate that is not running, which is the shape `ai-engineering.md` names in *gate
un gate deve poter fallire*.

**The repair, when somebody takes it.** Remove the four dead `CONVERTED`
entries, and check in the same pass whether any *other* entry names a path that
moved. It is a manifest edit, not a code change.

**Verified green in the same run**, so the failure is isolated to the two
manifests: `verify:tables`, `verify:breakpoints`, `verify:dialogs`,
`verify:tokens`, `verify:no-viewport-read` — all exit 0.

---

## D2 — the four production steps of the checklist have no anchor, so they can never read as late

**Found during:** plan 44-06, task 1 (building the checklist half of the
reconciler).

**What happens.** `production_checklist_item` holds five kinds: the editorial
pieces collapsed into `piece`, plus `venue_confirmed`, `dj_confirmed`,
`photo_arrived` and `space_approval`. A `piece` item takes its `due_date` from
the piece it belongs to, which the pipeline rules place. The other four take
`null`, because **nothing in the product says what they are anchored to**:
`production_pipeline_rule` carries the editorial anchors and no others.

**Why the reconciler did not fill them in.** Because filling them in means
inventing a rule. `production-calendar.md`'s gate *il calendario e' la fonte*
says the correct answer to an undeclared coordinate is *not yet decided*, and
this directory's whole discipline — an alias map as an argument, pipeline rules
as rows — is built on the same refusal. A due date derived here would be a second
rule table, disagreeing with the first the week somebody edits one of them.

**What it costs while it stays.** Exactly one thing, and it is precise. Lateness
is computed, never stored: `ticked_at IS NULL AND due_date < current_date`
(D-44-15). An item with no due date therefore **never reads as late**, so four of
the five checklist kinds are invisible to the *late from the list* behaviour the
decision was taken for. A night whose space was never confirmed in writing will
look as calm as one whose space was signed a month ago.

That is the direction that hides work rather than inventing it, which is the
better of the two directions to fail in — but it is not nothing, and the
checklist is the surface D-44-14 says covers *what can make a date fail, not only
what can be drawn*.

**The repair, when somebody takes it.** Four anchors, decided by the owner and
written as rows rather than as code — the same storage form the editorial ones
already use, `(anchor kind, weekday, direction)`, so the four join the sixteen
instead of becoming a special case. `brand-visual-system.md` already carries one
of them in prose: the exhibition space's approval sits **inside** the two days
before the listing, not after them. The other three — venue confirmed in
writing, dj confirmed, photo arrived — are not written down anywhere yet.

## D3 — a stale checklist item outlives the piece it was created for

**Found during:** plan 44-06, task 1.

**What happens.** A checklist item's identity is `(plan, kind, label)`, and the
import writes it `ON CONFLICT DO NOTHING` so a re-import can neither duplicate an
item nor reopen a ticked one. The reconciler refreshes a due date that moved
(`checklistItemsToUpdate`), but it has **no way to retire an item that is no
longer owed** — because this phase builds no removal path at all, by design:
absence is a stamp and a report, never a removal.

The reachable case is narrow and real: a series whose pipeline rules change from
three LiveCuts to two leaves a `LiveCut 3` item on every night created under the
old rule. Its underlying piece row is stamped `no_longer_owed` by the reconciler;
the checklist item beside it is not.

**What it costs while it stays.** One item too many on some nights' checklists —
a count of open items larger than the work that exists. The migration's own
comment names this direction as the one that matters, about doubling; a single
stale item is far short of that, but it is the same axis.

**The repair, when somebody takes it.** Not a change to the reconciler. It is the
**removal act** this phase deliberately does not build — one place, deliberate,
audited, covering the plan row, the piece and the item together — and it is worth
building only once somebody has decided what removal means for a row that a
person may have ticked.

---

## D4 — `absent_since` is not drawn on S1, so a row that has left the file looks like one that is still in it

**Found during:** plan 44-09, task 2 (the calendar page's read).

**What happens.** `production_plan`, `production_piece` and
`production_commitment` all carry `absent_since`: an entry present in a previous
run and missing from the current one is **stamped, never deleted**, because
deleting on absence would let one bad export wipe the archive. S1 reads the
tables without filtering that column and draws every row the same way.

**Why the page neither filters nor marks.** Both available answers are a decision
this plan was not given. Filtering `absent_since IS NOT NULL` would **hide rows
silently** — and if a future import bug stamped everything absent, the calendar
would empty out and the page would say *the import ran and read no nights*, which
is a plausible sentence covering a fault: exactly the shape OBS-03 refuses.
Marking them needs a badge and a string, and `44-UI-SPEC.md` §8.3 declares four
marks and this is not one of them; §13.4 lists every string the phase ships and
this is not one either. Adding either without the contract being edited would be
a surface deciding a question the contract owns.

**What it costs while it stays.** A night whose entry has left the calendar file
reads exactly like a night that is still in it. The direction is the safer of the
two — the row is shown rather than hidden, so nothing disappears — but somebody
reading the list to check the rotation may count an edition that is no longer
planned.

**The repair, when somebody takes it.** A fifth mark in §8.3 with its string in
§13.4, decided by whoever owns the contract, and then one branch on the page.
Not a filter: a row that has left the file is a finding, and a finding this phase
draws rather than swallows everywhere else.

---

## D5 — the plan's verification names `verify:ics`, which is not a script in `package.json`

**Found during:** plan 44-09, verification.

**What happens.** `44-09-PLAN.md` §verification asks that `npm run verify` *"exits
0 and names `verify:ics` among the gates it did not run."* `package.json` declares
seventeen `verify:*` entries and **none of them is `verify:ics`**; the aggregate's
NOT RUN section names one gate, `verify:redirects`, which needs a dev server.

`npm run verify` also exits **2**, not 0, and the reason is D1 plus one more:
three gates REFUSED before measuring — `verify:touch-targets` and
`verify:conversion` on D1's stale manifest, and `verify:capabilities` because it
needs `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL`, which a worktree
does not carry. **Thirteen gates reached a verdict and none failed**, which is the
narrower and true statement the aggregate's own footer insists on.

**Why it is not this plan's.** No calendar file is named by any of the three, and
a missing script is a planning artefact rather than a defect in the tree.

**The repair, when somebody takes it.** Either the `verify:ics` gate gets written
— it would presumably assert that no committed file parses or embeds the calendar
file, which nothing checks today — or the expectation is struck from whichever
later plan inherited it. D1's manifest edit closes two of the three refusals; the
third closes itself wherever the environment carries the two variables.

**Update, 2026-08-15, plan 44-10.** The first half of this is now closed and the
note is left here rather than deleted, because a stale deferred item is a silent
falsehood: `verify:ics` **does** exist in `package.json`, plan 44-08 wrote it,
and `verify-all.mjs` names it in `NEEDS_MATERIAL` with the reason it is not run.
It was measured green — all eight checks — against the current material during
plan 44-10. What this entry still describes correctly is the exit code of the
aggregate in a worktree, which is unchanged.

---

## D6 — a dry run writes no `production_import_run` row, and the migration expects one

**Found during:** plan 44-10, task 1.

**The conflict, and it is between two documents this phase wrote itself.**
`20260815120000_production_calendar.sql:608-611` says, in as many words, that **a
dry run is a real row**: the import can produce its plan without applying it, and
that run is recorded as one — *otherwise the only evidence that somebody checked
before writing is their memory of having checked.* `44-10-PLAN.md` says a dry run
**writes nothing**, and lists that among its must-haves.

Both are reasonable and they cannot both hold.

**How it was resolved, and the cost, stated rather than absorbed.**
`meta-gates.md` settles a contradiction between two gates in favour of the more
restrictive one, so the runner's dry run opens no transaction and inserts no row.
The exact cost: **`production_import_run.dry_run` has no writer today**, so the
table records applied runs only, and the audit trail of *somebody looked before
writing* lives in a terminal instead of in a row. That is precisely the thing the
column exists to stop being ephemeral.

**Why it is not fixed here.** Reversing it is a one-line change and a decision,
not a repair: it makes `--dry-run` a mode that writes, and the whole argument for
the flag being the default is that it does not. That trade belongs to the owner.

**The repair, when somebody takes it.** Either the runner inserts a row with
`dry_run = true` at the point where it currently stops — the counts it would carry
are already computed at that line — or the column is removed by a forward
migration and the comment that promised it is corrected in the same commit. What
must not happen is the third option: leaving a column whose comment describes a
behaviour nothing performs.
