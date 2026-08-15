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
