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
