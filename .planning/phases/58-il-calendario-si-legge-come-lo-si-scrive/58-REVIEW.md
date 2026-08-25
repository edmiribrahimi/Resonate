---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
reviewed: 2026-08-25T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - scripts/import-production-calendar.mjs
  - scripts/verify-all.mjs
  - scripts/verify-calendar-surface.mjs
  - scripts/verify-ics-grammar.mjs
  - scripts/verify-ics-import.mjs
  - scripts/verify-ics-reachable.mjs
  - scripts/verify-mirror-guards.mjs
  - src/app/(admin)/admin/(work)/calendar/page.tsx
  - src/app/(admin)/admin/calendar/ImportRunSummary.tsx
  - src/app/(admin)/admin/calendar/PiecesSection.tsx
  - src/app/api/cron/production-mirror/route.ts
  - src/lib/production/ics/anchors.ts
  - src/lib/production/ics/classify.ts
  - src/lib/production/ics/guard.ts
  - src/lib/production/ics/index.ts
  - src/lib/production/ics/reconcile.ts
  - src/lib/production/ics/vocabulary.ts
  - src/types/database.ts
  - supabase/migrations/20260820120000_production_piece_flyering.sql
  - supabase/migrations/20260820121000_production_calendar_key.sql
  - supabase/migrations/20260820122000_refuse_renumber_comment.sql
  - supabase/migrations/20260820123000_production_calendar_key_not_null.sql
  - vercel.json (read as context for the new cron entry)
findings:
  critical: 3
  warning: 9
  info: 4
  total: 16
status: issues_found
---

# Phase 58: Code Review Report

**Reviewed:** 2026-08-25
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

The phase ships a new **unattended write path** (`src/app/api/cron/production-mirror/route.ts`) that
deletes and rewrites a whole calendar's rows with no transaction, no PITR and no snapshot, plus the
attended script that does the same with a snapshot. The guard architecture is genuinely well built:
`unattendedMirrorGuard` sits on the cron's path *before* the first `DELETE`, its two predicates read
the same lists the restore writer consumes, `MIRRORED_TODAY` is a real total `Record` over
`CALENDAR_KEYS` (`satisfies Record<CalendarKey, MirrorDeclaration>`), `mirrorGuard` was not softened,
and the migrations are forward-only and transactional.

The defects are in the places the design did not look at:

1. **The restore of the only irreplaceable state in the system counts attempts, not effects** — and
   there is a reachable, already-anticipated situation in which every one of those attempts writes
   nothing while the report says they were put back.
2. **The cron's authorisation fails open when `CRON_SECRET` is unset**, on the one route in the
   repository that performs unconditional bulk `DELETE`.
3. **`linksToRestore` is deliberately over-collected**, and the unattended guard consumes that
   over-collected list — so announcing a single RamaDub night permanently red-lines the nightly
   mirror for a link that `ICS-03b` guarantees is never at risk. That is exactly the "recurring
   expected red becomes wallpaper" failure the route's own header (D-46-06, deferred item 10) says
   it exists to avoid.

Defence 1 (the feed body never leaks) is asserted by check **U12** of `verify-calendar-surface.mjs`,
and U12 has two holes that matter: it only recognises an identifier at the *start* of a top-level
argument — so `+` concatenation, the dominant message-building idiom in both files it reads, evades
it entirely — and it does not cover the other channel by which third-party text reaches a retained
runtime log, `describe(error.message)`.

Per `CLAUDE.md` Guardrail 1 no fix below is "add a test": every actionable repair is either a code
change or a check in an existing `scripts/verify-*.mjs`, proved by mutation.

---

## Critical Issues

### CR-01: A checklist decision restore that writes nothing is reported as a decision put back

**File:** `scripts/import-production-calendar.mjs:3051-3083` · `src/app/api/cron/production-mirror/route.ts:1406-1427`
**Also:** `src/lib/production/ics/reconcile.ts:2097-2143` (`reconcileChecklist`)

**Issue:**

Both writers restore a decision with

```js
await step(... db.from("production_checklist_item").update({ ticked_at, ticked_by, ticked_by_name })
  .eq("plan_id", planId).eq("kind", decision.kind).eq("label", decision.label));
decisionsRestored += 1;   // route: decisionsPutBack += 1
```

`supabase-js` `.update()` without `.select()` returns `{ data: null, error: null }` when **zero rows
match**. So `step()` succeeds, the counter is incremented, and the run prints
`put back: N checklist decision(s) … with the original actor and instant` for a restore that touched
nothing. The counter measures *attempts*, not *effects*, on the one row class the whole guard
architecture exists to protect — the state `guard.ts:220-229` says *no feed can rebuild*.

Two reachable ways the `UPDATE` matches nothing:

**(a) A surviving night that the file no longer carries.** `collectSurvivors`
(`reconcile.ts:1203-1219`) keeps every plan row with a `linked_party_id`, and flags
`absentFromFile` when the feed no longer carries its `source_uid` — a case the script explicitly
reports as *"a finding, not a tidy-up"* (`import-production-calendar.mjs:2888-2895`). But:

- step 1 of the removal deletes checklist items for **every** scoped plan id, survivors included
  (`route.ts:1163-1165`, `import-production-calendar.mjs:2757-2759`) — deliberately, per
  `reconcile.ts:748-756`;
- `reconcileChecklist` regenerates items only `for (const night of input.nights)` — the nights the
  **file** carries (`reconcile.ts:2097`). An absent survivor is not in `input.nights`, so it gets no
  items back;
- `collectStateToRestore` still collects its decisions (`reconcile.ts:1265-1285`), so the restore
  runs, matches nothing, and reports success.

Net effect: an announced night that disappears from the feed **permanently loses its entire
checklist and every tick and untick on it**, silently, with the report saying they were restored.
There is no snapshot on the cron path and no PITR.

**(b) An ordinary run in which the owed set changed.** Labels are `<Kind>` / `<Kind> N`
(`reconcile.ts:2113-2121`), where `N` is the ordinal among owed pieces of that kind. If the number of
LiveCuts changes because the line-up changed — which `lineupSlotCounts` makes routine — a decision
stored against `LiveCut 3` matches no regenerated row and is dropped, again silently.

**Fix:**

Make the writer read the effect, and make an unplaced decision a finding rather than a count:

```js
// scripts/import-production-calendar.mjs — and the same shape in the route
const applied = await db
  .from("production_checklist_item")
  .update({ ticked_at: decision.tickedAt, ticked_by: decision.tickedBy,
            ticked_by_name: decision.tickedByName })
  .eq("plan_id", planId).eq("kind", decision.kind).eq("label", decision.label)
  .select("id");                                  // ← the effect, not the attempt
if (applied.error) failPartway("restore_decision", describe(applied.error), completedSteps);
if ((applied.data ?? []).length === 0) {
  decisionsUnplaced += 1;                          // named, counted, never silent
  continue;
}
decisionsRestored += 1;
```

and, separately, close case (a) at its source: either regenerate checklist items for
`plansThatSurviveDeletion` as well as for `input.nights`, or exclude surviving plan ids from the
step‑1 `DELETE`. The two are different decisions — pick one and write down which.

On the cron path a non-zero `decisionsUnplaced` must reach the response as its own `MirrorCounts`
field and its own outcome, not be folded into `mirrored`.

**Guard (no test runner):** add a case to `scripts/verify-mirror-guards.mjs` alongside `R4`/`R15`
that asserts the restore path reports zero-row updates. Since the predicate reads the database, it
belongs with `R15` in `P-58-B` — but the *shape* check (that the source calls `.select()` on the
restore update, i.e. reads the effect) is a string assertion this gate can make today, by mutation:
delete the `.select("id")` and the gate must go red.

---

### CR-02: The cron authorises on `Bearer undefined` when `CRON_SECRET` is unset

**File:** `src/app/api/cron/production-mirror/route.ts:1473-1477`

**Issue:**

```ts
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

When `CRON_SECRET` is absent from an environment, the template evaluates to the literal string
`"Bearer undefined"`, and any unauthenticated caller sending `Authorization: Bearer undefined`
passes. The idiom is inherited from the five existing crons
(`event-reminders`, `venue-reveal`, `refund-expired-tokens`, `reconcile-refunds`,
`reconcile-email-deliveries`), but **the blast radius is new**: this is the only route in the
repository whose success path is an unconditional bulk `DELETE` across four production tables,
followed by a rewrite from an external address, with no transaction and no snapshot on this path.

The concrete scenario is not hypothetical on this platform: a preview deployment that does not carry
`CRON_SECRET` (env vars scoped to Production only) still resolves `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` if those *are* shared — and the service client bypasses every RLS policy
(`src/lib/supabase/service.ts:1-9`). One `curl` then wipes and rewrites the `rmdb` calendar.

Secondary: the comparison is a non-constant-time string equality, so it leaks the secret's length and
prefix under repeated probing. `access-gating.md` records that **this repository has no rate
limiting at all**, so there is no cost ceiling on that probing.

**Fix:**

Fail closed on an absent secret, before anything else, and compare in constant time:

```ts
import { timingSafeEqual } from "node:crypto";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // A missing secret is a REFUSAL, never an accidental password. This route deletes.
  if (typeof secret !== "string" || secret.length === 0) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    console.error("[production_mirror.unauthorised]"); // no header, no secret, no length
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  …
}
```

**Guard:** `scripts/verify-calendar-surface.mjs` already reads this file by name for U12. Add a U13
that asserts the file contains no direct `!==` comparison against a template interpolating
`process.env.CRON_SECRET`, and that an explicit emptiness refusal precedes the comparison. Prove it
by mutation: restore the old line and U13 must go red.

---

### CR-03: `linksToRestore` is over-collected by design, and the unattended guard consumes it — one announced night red-lines the mirror forever

**File:** `src/lib/production/ics/reconcile.ts:1265-1271` · `src/lib/production/ics/guard.ts:421-434` · `src/app/api/cron/production-mirror/route.ts:1085-1091`

**Issue:**

`collectStateToRestore` pushes a `linksToRestore` entry for **every** plan row carrying a
`linked_party_id`, and says so explicitly: *"Both restores are therefore no-ops today, and both are
emitted anyway"* (`reconcile.ts:1245-1263`). But every one of those rows is also in
`plansThatSurviveDeletion` (`collectSurvivors`, same predicate, `reconcile.ts:1211`) — meaning the
row **never enters the deletion at all** and its link is structurally never at risk.

The cron then passes that list's length as the guard's risk measure:

```ts
const unattendedVerdict = unattendedMirrorGuard({
  supervision,
  decisionsAtRisk: plan.decisionsToRestore.length,
  linksAtRisk: plan.linksToRestore.length,        // ← never actually at risk
  restorePathVerified: MIRROR_RESTORE_PATH_VERIFIED,  // ← false
});
if (unattendedVerdict !== "ok") stop("unattended_state_at_risk", measured);
```

`guard.ts:430` treats any `count > 0` as at risk. So:

- the moment a single `rmdb` night is announced — `linked_party_id` set, which is the ordinary act of
  D-44-06 — `linksAtRisk` becomes ≥ 1;
- `MIRROR_RESTORE_PATH_VERIFIED` is `false` and flipping it requires an owner authorisation that does
  not exist (`guard.ts:313-337`);
- so `mirrorOneCalendar` answers `unattended_state_at_risk` → **409, every night, forever**, for a
  link the design proves cannot be lost.

This is the failure the route's own header names as the accepted cost of a non-2xx refusal
(`route.ts:103-105`, D-46-06): *"if it fails often, the red becomes wallpaper"* — and
`WITHHELD_REASONS`'s own comment on `no_declared_dates` says a recurring expected red *"is the noise
that teaches people to ignore the channel"*. The declaration mechanism (`MIRRORED_TODAY`) cannot
prevent it, because this is the guard firing, not the declaration.

Note the asymmetry: `decisionsAtRisk` is correct — checklist items of survivors **are** deleted by
step 1 — so only the link half is wrong.

**Fix:**

Keep the over-collection (the snapshot needs it), but stop reading it as a risk measure. Emit the
narrowed count from the module that owns the definition, so the two do not drift:

```ts
// src/lib/production/ics/reconcile.ts — beside linksToRestore
/**
 * The links a run could actually LOSE: those whose plan row enters the deletion.
 * Today ICS-03b makes this empty by construction, and that is the point — the
 * guard must read what is at risk, never what exists.
 */
linksAtRisk: AnnouncedNightLinkRestore[];
```

populate it in `collectStateToRestore` only for rows **not** in the survivor set, and change both
callers to pass `plan.linksAtRisk.length`. If `ICS-03b` is ever narrowed, the list refills by itself
and the guard tightens with it — which is the property `guard.ts:370-375` asks for.

**Guard:** `scripts/verify-mirror-guards.mjs` already exercises `unattendedMirrorGuard` as a pure
predicate. Add a case that runs `reconcile` over a synthetic snapshot holding one linked plan row and
asserts `linksAtRisk === 0` while `linksToRestore.length === 1`. It needs no database and no
material, so it belongs in the same offline family as the other seven cases.

---

## Warnings

### WR-01: U12 misses the concatenation shape, which is the idiom both files it reads actually use

**File:** `scripts/verify-calendar-surface.mjs:1084-1143`

**Issue:** Shape (b) of U12 tests each top-level argument with

```js
const passed = new RegExp("^" + holder + "\\b");
if (pieces.some((piece) => passed.test(piece))) { … }
```

The identifier must be at the **start** of an argument. But both files U12 reads build every message
by `+` concatenation — `import-production-calendar.mjs` does it in every single `refuse()` call, and
the route does it in every `console.error`. So

```js
refuse("feed_not_a_calendar", "what arrived was: " + body);
console.error("[production_mirror] " + feedBody.slice(0, 200));
```

are both invisible to U12: neither is a template (shape a), and neither argument *starts* with the
holder (shape b). The check's own header calls itself *"the only form in which that defence exists"*,
and the shape most likely to be written by a distracted hand is the one it cannot see.

Two smaller gaps in the same check:

- `EMITTERS` (line 1023-1034) has no entry for `throw` — `throw new Error(\`…${feedBody}…\`)` reaches
  a retained runtime log with a stack trace and is not flagged;
- `argumentsFrom` (line 334-344) counts parentheses inside string literals, so
  `console.error("a ) b", feedBody)` closes early and the second argument is never inspected. That
  direction hides a hit.

**Fix:** test membership rather than prefix, and add the missing emitter:

```js
// (b) passed as an argument, or concatenated into one, whole or through a member/slice.
const passed = new RegExp("(?:^|[^A-Za-z0-9_$.])" + holder + "\\b");
if (pieces.some((piece) => passed.test(piece))) { … }
```

```js
const EMITTERS = [ …, "throw" + " ", "Response" + "." + "json(" ];
```

and make `argumentsFrom` skip string literals. Prove each by mutation: add
`refuse("x", "y: " + body)` to a scratch copy and confirm U12 goes red before removing it.

---

### WR-02: `verify:ics-reachable`'s expected-symbol list is stale by six names

**File:** `scripts/verify-ics-reachable.mjs:156-180`

**Issue:** The list's own docblock states it is read from the three consumers with

```
grep -oE "ics\.[a-zA-Z_]+" scripts/import-production-calendar.mjs scripts/verify-ics-import.mjs scripts/verify-ics-grammar.mjs | sort -u
```

Re-running that command today yields **29** names; `attesi` holds **23**. Missing:

`MIRROR_RESTORE_PATH_VERIFIED`, `MIRROR_SNAPSHOT_SHAPE`, `readNoteDeclaration`, `readNoteSlots`,
`runSupervision`, `unattendedMirrorGuard`.

`readNoteDeclaration` and `MIRROR_SNAPSHOT_SHAPE` are called **only** through the runtime-constructed
`import()` — nothing statically imports them — so `npm run build` cannot see them either. That is
precisely finding B-2 of the v1.5 audit, which this gate exists to close: renaming
`MIRROR_SNAPSHOT_SHAPE` would leave every snapshot stamped `undefined`, and the snapshot is the only
copy of a tick when a run dies in the gap.

**Fix:** append the six names and, in the same commit, add the four the phase's own reviewer will
add next. Better: replace the hand-list with the grep, executed by the gate against the three
consumers, so the list cannot go stale again — the same "read it, never remember it" discipline the
file's own comment claims.

---

### WR-03: `catalogue_unreadable` collapses a missing credential with a failed read, and that branch logs nothing

**File:** `src/app/api/cron/production-mirror/route.ts:694-698`

**Issue:**

```ts
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  stop("catalogue_unreadable");
}
```

`MIRROR_REPORT.catalogue_unreadable` reads *"Something this run has to read before it may plan could
not be read."* — which sends an operator to look at the database when the actual cause is an unset
deployment variable. The file's own defence 3 (`route.ts:68-72`) forbids exactly this: *"One outcome
per cause, and no member that means something went wrong."* The script keeps them apart
(`missing_credential` vs `catalogue_unreadable`, `import-production-calendar.mjs:855-862`); the route
does not.

This branch is also the only `stop()` in the file with no `console.error` beside it, so it leaves no
trace at all beyond the 409.

**Fix:** add `"credential_not_configured"` to `MIRROR_OUTCOMES` with its own `MIRROR_HTTP` (409) and
`MIRROR_REPORT` entry naming the variable *by name only* (both names are public), and log it:

```ts
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`[production_mirror.credential_not_configured] calendar=${calendarKey}`);
  stop("credential_not_configured");
}
```

Both `Record`s are `satisfies`-typed and total, so the compiler will demand both entries.

---

### WR-04: The unexpected-throw branch drops every count, including the one `P-58-C` reads first

**File:** `src/app/api/cron/production-mirror/route.ts:1516-1535`

**Issue:** The generic `catch` reports

```ts
results.push({ calendarKey, outcome: "write_stopped_partway",
               report: MIRROR_REPORT.write_stopped_partway, counts: {} });
```

`MirrorCounts.writeStepsCompleted` is documented as *"How many write steps completed before a
failure. `P-58-C` reads this first"* (`route.ts:489-490`) — and this is the exact branch where the
handler admits it *"cannot know which side of the first removal it happened on"*, i.e. the branch
where that number matters most. It is discarded because `writeStepsCompleted` is a local of
`mirrorOneCalendar` and never escapes.

**Fix:** hoist the counter into a mutable object the caller owns and pass it in, so the catch can
report it without reading the caught value:

```ts
const progress: { counts: MirrorCounts } = { counts: {} };
try {
  const counts = await mirrorOneCalendar(calendarKey, redactor, progress);
  …
} catch (caught) {
  if (caught instanceof MirrorStop) { … }
  console.error(`[production_mirror.write_stopped_partway] calendar=${calendarKey} unexpected`);
  results.push({ calendarKey, outcome: "write_stopped_partway",
                 report: MIRROR_REPORT.write_stopped_partway, counts: progress.counts });
}
```

with `mirrorOneCalendar` writing `progress.counts = withCounts()` after each `step()`. Nothing of the
caught value is read, so defence 1 is untouched.

---

### WR-05: `describe(error.message)` is third-party text on a retained-log path, and U12 does not cover it

**File:** `src/app/api/cron/production-mirror/route.ts:534-536, 729, 774, 870, 891, 1150, 1237, 1302, 1443` · `scripts/import-production-calendar.mjs:1223-1226`

**Issue:** Both files state that only `code` and `message` travel, never PostgREST's `details`, *"which
carries the whole rejected row"*. That is the right rule and it closes the largest vector. But
`message` is a string written by Postgres/PostgREST from the rejected statement, and several classes
of it interpolate a value: `malformed array literal: "…"` (the mirror inserts
`artists: held.slot.artists`, a `text[]` built from note lines that carry who is playing),
`invalid input syntax for type …: "…"`, `value too long for type character varying(N)`. Those land
in `console.error` on a platform whose runtime logs are retained.

The date columns are safe — `parseCivilStamp` (`parse.ts:489-515`) validates `YYYYMMDD` fully before
slicing, so no date fragment can reach a syntax error. The array and text columns are not.

U12 measures only identifiers bound to `.text()`, so this path is outside what the gate asserts,
while the file's header claims defence 3 as *"Faults are reported by category, never by echo."* The
claim is stronger than the code.

**Fix:** report `code` only on the automated path, and keep `message` for the attended script where a
person is reading and can be told to be careful:

```ts
/** The code, and never the message: a message is written by somebody else from the rejected row. */
function describe(fault: { code?: string } | null): string {
  return fault?.code ?? "no_code";
}
```

If a message is genuinely needed for triage, pass it through `redactor.redact` **and** truncate to a
fixed prefix that cannot contain a quoted value — but the honest answer here is *say less*, which is
the repair this phase prescribes everywhere else.

---

### WR-06: The 60-second budget is not derived from the declared worst case

**File:** `src/app/api/cron/production-mirror/route.ts:187-195, 591-592, 1481`

**Issue:** `maxDuration = 60`, `FEED_TIMEOUT_MS = 20_000`, and the calendars run **in sequence** over
all three `CALENDAR_KEYS`. The header states the budget as *"Three calendars, each with a network
read and a handful of statements."* Three feeds that hang to their timeout consume the entire 60 s
before a single statement runs; add the catalogue reads, the deletes and the write-back and the
budget is exceeded well before that.

Today only `rmdb` is `{ mirrored: true }`, so the live worst case is ~20 s + statements. But
`MIRRORED_TODAY` is designed to be flipped — the doc at `route.ts:264-269` describes flipping a
`false` to a `true` as a routine decision with a shape — and nothing in that decision's shape
mentions the time budget. A platform kill lands **between the `DELETE` and the write-back**, with no
response body, no `console.error` and no snapshot on this path.

The register row does stay open with a null `finished_at`, and `ImportRunSummary` draws
`Did not finish` — so the state is observable. The gap is that the budget is asserted rather than
computed.

**Fix:** derive the bound instead of choosing it, and refuse rather than truncate:

```ts
/** Enough for every declared calendar's feed plus a working margin for the statements. */
const MIRRORED_COUNT = CALENDAR_KEYS.filter((k) => MIRRORED_TODAY[k].mirrored).length;
export const maxDuration = 60;
// Asserted at module load: flipping a MIRRORED_TODAY entry to `true` must not silently
// push the worst case past the ceiling.
const WORST_CASE_MS = MIRRORED_COUNT * FEED_TIMEOUT_MS + STATEMENT_BUDGET_MS;
```

and add the arithmetic to the "changing a `false` to a `true` is a decision with a shape" paragraph
so the next person reads it. A check in `verify-calendar-surface.mjs` that recomputes
`mirroredCount * FEED_TIMEOUT_MS` from this source and compares it against `maxDuration` is a string
assertion the gate can already make.

---

### WR-07: `--adopt-unkeyed-rows` is dead code advertised as a live affordance on a production writer

**File:** `scripts/import-production-calendar.mjs:290-294, 506-519, 733-744, 2713-2723` · `supabase/migrations/20260820123000_production_calendar_key_not_null.sql`

**Issue:** The `20260820123000` migration sets `calendar_key NOT NULL` on `production_plan`,
`production_piece` and `production_commitment`. Every path in the script that looks for key-less rows
is therefore unreachable:

- `readScoped`'s second read, `.is("calendar_key", null)`, can only ever return `[]`;
- `unkeyedRowsAdopted` is always `0`, so the `UPDATE … .is("calendar_key", null)` loop at 2713 never
  runs;
- `--help` still advertises *"ONE-OFF: give the declared key to the rows that predate it"*, and the
  report still prints a paragraph about a claim somebody is making.

The migration's own header names plan 58-11 as the closer of the transition, so the intent is clear —
the removal simply did not land with the closer. Live-looking dead code on a writer that deletes
production rows is worse than dead code elsewhere: it invites somebody to reach for a flag that will
silently do nothing and then wonder why their rows were not touched.

**Fix:** delete the argument, the second read, the adoption loop and the two report paragraphs, and
replace the `--help` line with nothing. Keep the header paragraph explaining that the transition
closed on 2026-08-20 and pointing at `20260820123000` — the reason survives, the affordance does not.

---

### WR-08: Three modules cite the cancelled format by name, against the project's own gate

**File:** `src/lib/production/ics/vocabulary.ts:186` · `src/lib/production/ics/anchors.ts:55, 102, 346, 509, 510`

**Issue:** `production-calendar.md` gate *una sigla ritirata non si cita* is explicit that the format
cancelled by `CAT-01` on 2026-08-20 **is not named, not even to explain the history**, and
`brand-visual-system.md` repeats it for materials. `anchors.ts` names it five times inside the
docblocks that govern how a piece's date is derived, including in the paragraph that justifies
`not_derivable` (`anchors.ts:346`, `vocabulary.ts:186`), and `vocabulary.ts:186` states the rule as
*"The night's and SunSet's listings"*.

This is not only a naming gate: `UNRESOLVED_REASONS.not_derivable` is documented as covering *two*
series, one of which no longer exists. The next reader deriving the rule from the comment will look
for a second series that is gone, and the comment gives no signal that the rule now covers one.

**Fix:** rewrite the five doc paragraphs to state the rule in terms of the format it actually covers
today — the night — and to say that a second format once shared it and was removed from the
catalogue, **without naming it**, exactly as `production-calendar.md` does. Re-run
`npm run verify:persona` afterwards, since these are persona-governed surfaces.

---

### WR-09: `PiecesSection` documents the LiveCut count with the rule the phase corrected, and points at the wrong source

**File:** `src/app/(admin)/admin/calendar/PiecesSection.tsx:38-47, 141-153`

**Issue:** The docblock says the audio piece is *"one per dj who played it"*, and the `LINEUP_DEPENDENT`
comment says the count *"comes from the structured line-up on `party_credits`"*.

Both are the defect this phase measured and fixed. `import-production-calendar.mjs:760-786` records
it in as many words: counting `party_credits` rows counted **people**, so a night with six names in
five slots was told it owed six episodes — *"The sixth cannot exist, and nobody would have found out
until the day it was due."* `production-calendar.md` carries it as a gate: *un LiveCut per slot*, a
b2b is one. The count now comes from `production_lineup_slot`, built from the calendar's own notes
(`reconcile.ts:455-465`, `route.ts:851-853`).

The comment sits in the file that **draws** the pieces, so it is the one a maintainer reads before
touching that surface, and it instructs them to count the wrong thing.

**Fix:**

```tsx
 * The audio piece is a `LiveCut` — the recording of a SET somebody played at one
 * of **our** nights, one per SLOT of the timetable and never one per name: two
 * artists back to back are one set and one recording.
```

and, for `LINEUP_DEPENDENT`, replace the `party_credits` parenthesis with the slot table read from
the calendar's notes. Do not add a count to the component — the section deliberately prints none.

---

## Info

### IN-01: `PieceRowView.kind` says "one of the six"

**File:** `src/app/(admin)/admin/calendar/PiecesSection.tsx:94`
**Issue:** `PIECE_KINDS` has seven members since D-58-04 (`flyering`), and this file renders through
the total `PIECE_KIND_LABELS` record, so the code is correct and only the comment is off by one.
**Fix:** `/** One of the seven the pipeline produces. Drawn through `PIECE_KIND_LABELS`. */`

### IN-02: `registerSecret` uses two different length floors in the two readers

**File:** `scripts/import-production-calendar.mjs:359-361` (`length >= 4`) · `src/app/api/cron/production-mirror/route.ts:440-445` (`length > 4`)
**Issue:** Two spellings of one policy, in two files that redact the same values — the shape both
files elsewhere refuse ("two spellings of one fact are how the two start to differ"). A four-character
host label would be registered by one and not the other.
**Fix:** pick one bound, state the reason once, and derive the other from it — or move the redactor to
a shared pure module under `src/lib/production/` and have both import it.

### IN-03: A stale source reference in the script's header

**File:** `scripts/import-production-calendar.mjs:222`
**Issue:** The header cites `scripts/verify-all.mjs:319` for the prefix filter that collects gates.
That filter is now at `verify-all.mjs:485` (`Object.keys(scripts).filter(name => name.startsWith("verify:"))`).
The argument the citation supports is still correct.
**Fix:** cite the symbol (`declared`) rather than the line number — a line number in a 850-line file is
a citation that goes stale on the next edit.

### IN-04: `lineupLinesWithoutWindow` assumes every note's first line is the declaration

**File:** `scripts/import-production-calendar.mjs:352-356`
**Issue:** `Math.max(0, lines.length - 1 - slots)` subtracts one line for the declaration
unconditionally, but `entriesWithNote` includes notes for which `readNoteDeclaration` returned `null`
— which the run reports separately as *"declared UNREAD"*. For those the figure under-counts by one.
It is a diagnostic count only; nothing branches on it.
**Fix:** subtract the declaration only where one was read:
`const head = ics.readNoteDeclaration(event.description) === null ? 0 : 1;`

---

## What this review did NOT establish

- **Nothing here was executed.** `npm run build` and `npm run verify:mirror-guards` were not run;
  every finding is read from the source. `CLAUDE.md` Guardrail 1 applies: there is no test runner for
  the product, so no claim below rests on a passing suite.
- **CR-01 case (a) and CR-03 are reasoned from the code paths, not observed against a database.** Both
  belong in `P-58-B` with the catalogue in front of them, measured with a different instrument than
  the one that caused the effect.
- **The RLS posture of the six production tables was not re-read.** The migrations under review
  create no policy and alter no grant, and each states so; that statement was taken at its word.
- **`classify.ts`, `parse.ts`, `anchors.ts` and `reconcile.ts` were read selectively** — around the
  survival, restore, checklist and date-parsing paths the mirror depends on. Their grammar and
  anchor-conformance logic was not reviewed line by line.

---

_Reviewed: 2026-08-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
