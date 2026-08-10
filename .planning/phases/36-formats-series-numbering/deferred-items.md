# Phase 36 — deferred items

> Work discovered during execution that belongs to this phase but not to the
> plan that found it. Each entry names the plan that must close it.

---

## D1 — The `Formats` staff tab

**Found by:** plan 36-06, task 2.
**Must be closed by:** plan 36-09 (the plan that creates the page).
**File:** `src/lib/routes/staff-tabs.ts` — the line is written out, commented,
next to `Venues`.

**What is done.** `/admin/formats` is bound to `CAP.CATALOGUE_MANAGE` in
`src/lib/routes/capability-routes.ts`, on the branch that opens addresses, with
`alsoGatesTables: true`. The middleware and the page guard both read that entry,
so the address is reachable for the key that opens it and refused for everyone
else the moment a page serves it.

**What is not done, and why.** The tab itself. `StaffTab.href` is typed `Route`,
and a static address enters the generated union only after a `page.tsx` serves
it — so the line fails the build today:

```
Type error: Type '"/admin/formats"' is not assignable to type 'Route'.
src/lib/routes/staff-tabs.ts:92:5
```

Three ways out were weighed and two rejected:

| Option | Cost | Verdict |
|---|---|---|
| Widen `StaffTab.href` to `Route \| (string & {})` | `typedRoutes` stops checking all seven existing tabs, and both consumers (`StaffNav.tsx:68-73`, `ManagementSection.tsx:51`) pass `tab.href` into `<Link href>`, so the loosening spreads to two more files | rejected |
| `"/admin/formats" as Route` on the one entry | Compiles; becomes dead weight the day the page lands and a permanent hole for a future typo, on the one file whose job is that a menu cannot promise an address nobody serves | rejected |
| Add the tab in the plan that creates the page | The tab is absent between wave 3 and wave 7 | **taken** |

**Nothing is unprotected by the wait.** Hiding a nav entry was never protection
(`access-gating.md`, gate *coerenza navigazione/permessi*); the refusal is the
middleware's and it is already in place. What the wait avoids is the opposite
failure — a staff member drawn a link to a 404.

---

## D2 — Every validation message of `admin/events/actions.ts` is redacted in production

**Found by:** plan 36-10, task 1.
**Must be closed by:** a later plan — it is **not** phase 36's, and phase 36 made
it neither better nor worse.
**File:** `src/app/(admin)/admin/events/actions.ts`, `validateEventData` and the
`throw new Error` sites around it.

**The fact.** `validateEventData` refuses with fifteen-odd distinct sentences
(*"Title must be between 3 and 100 characters"*, and now *"Pick a format. A night
cannot be saved without one."*). Next **redacts** the message of an error thrown
out of a Server Action in a production build
(`src/lib/capabilities/server.ts:59-63`), so every one of them reaches a person
in `next dev` and none of them reaches a person in production, where the form
shows Next's generic replacement instead.

**Why plan 36-10 did not fix it.** It is pre-existing and file-wide: converting
three of the fifteen throws to returned values would leave one function speaking
two languages, and converting all fifteen is a rewrite of the whole validation
contract plus every caller. The three causes this plan added follow the loop's
existing form on purpose, and the gap is compensated where a person actually
meets it: `format` and `series` are `required` in the browser, so those two
refusals happen before the action is called at all. The **database** refusals —
duplicate number, series/format mismatch — do travel as returned values, which
is the half that could not be compensated any other way.

**What would close it.** A `ValidationRefusal` union alongside `NightRefusal`,
returned rather than thrown, and `EventForm` rendering it per field.

---

## D3 — A refused create still costs a slug

**Found by:** plan 36-10, task 1.
**Must be closed by:** a later plan.
**File:** `src/app/(admin)/admin/events/actions.ts`, `createEvent`.

`createEvent` inserts the event row first and its nights second. When the nights
are refused, plan 36-10 now deletes the event row it just created — otherwise a
mistyped number would leave an empty draft behind every time, and after phase 36
a mistyped number is an ordinary outcome rather than a rarity.

**What is still true.** The slug uniqueness probe runs before the insert, so a
retried save after a refusal may produce a `-<suffix>` slug where the first
attempt would have had a clean one, if anything else claimed the name in between.
Small, cosmetic, and named here so it is not rediscovered as a bug.

---

## D4 — The current chip is not scrolled into view on mount

**Found by:** plan 36-11, task 3.
**Must be closed by:** a later plan, or accepted — it is a nicety, not a gate.
**File:** `src/app/(public)/events/FormatFilterRow.tsx`.

`36-UI-SPEC.md` §S1 asks that the current chip be scrolled into view on mount.
That needs JavaScript, and the same section requires this component to be a
**server** component so the filter works without any. The two asks meet here and
the second wins, because it is the one FMT-04 depends on.

**What is done instead.** The current chip carries `scroll-margin-inline: 24px`,
so any scroll the browser performs on its own — the one it does when a chip
receives keyboard focus — lands it on the page gutter rather than flush against
the edge.

**What is not done.** Nothing scrolls the row on first paint. With four chips
plus `All` the current one is reachable on a phone without scrolling, so the gap
is invisible today; it becomes visible the day the catalogue grows, which
`36-UI-SPEC.md` already names as the signal to revisit this surface rather than
let the row wrap.

---

## D5 — `npm run lint` fails on `EventTabs.tsx`, and did before this phase

**Found by:** plan 36-12, task 1.
**Must be closed by:** a later plan, or accepted deliberately.
**File:** `src/app/(public)/events/EventTabs.tsx`, the swipe machinery.

Four `react-hooks/refs` errors — *"Cannot access refs during render"* — on the
two lines that read a ref while rendering: the viewport width used to convert a
drag in pixels into a percentage, and the `touchAction` style that depends on
which axis the gesture locked onto.

**Why it was not fixed here.** Both lines are **older than this phase** and
untouched by it (`git diff` for this plan contains neither). The scope-boundary
rule says a plan repairs what its own changes broke; repairing the drag maths
means changing how the gesture measures itself, which is the one behaviour this
plan was written to conserve.

**What it costs today.** `npm run lint` is red on this file, so it cannot be used
as a gate for the surface — `npm run build` and `npx tsc --noEmit` were used
instead, and both are green. Whoever closes it should move the two reads into
state or into the handlers, and check the swipe by hand afterwards: the rule is
about correctness under concurrent rendering, so a green lint here proves less
than a finger on a phone.
