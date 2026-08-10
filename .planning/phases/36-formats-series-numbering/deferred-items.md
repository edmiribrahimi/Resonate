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
