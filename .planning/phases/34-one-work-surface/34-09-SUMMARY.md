---
phase: 34-one-work-surface
plan: 09
subsystem: auth
tags: [routing, route-groups, capabilities, page-collapse, catalogue]

requires:
  - phase: 34-one-work-surface
    plan: 05
    provides: "`src/app/(admin)/admin/(work)/layout.tsx` — both nav mounts and one access-context resolution"
  - phase: 34-one-work-surface
    plan: 06
    provides: "the measured verdict that `(work)/…` coexists with `admin/…` outside the group"
  - phase: 34-one-work-surface
    plan: 07
    provides: "R-WORK-ROUTES, and `admin/{artists,venues}/actions.ts` already at their final path"
provides:
  - "`/admin/artists` and `/admin/venues` as one file each, bound to `organizer.access`"
  - "The first two of the twelve pairs collapsed, and the precedent for the five plans that follow: a divergence is classified before it is merged"
  - "A recorded finding: the guard/map mismatch on these two addresses was live between wave 1 and this plan"
affects: [34-10, 34-11, 34-12, 34-13, 34-14, 34-15, 34-17]

tech-stack:
  added: []
  patterns:
    - "Every difference between two collapsed twins classified drift / guard / cosmetic before the merge, with a `private.role_capabilities` row named for each drift"

key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/(work)/artists/page.tsx (moved from `admin/artists/`, guard and heading rewritten, navs dropped)"
    - "src/app/(admin)/admin/(work)/venues/page.tsx (moved from `admin/venues/`, guard and heading rewritten, navs dropped)"
    - "src/app/(organizer)/organizer/artists/page.tsx (deleted)"
    - "src/app/(organizer)/organizer/venues/page.tsx (deleted)"

key-decisions:
  - "`organizer.access` on both, decided by the row `('organizer','organizer.access',false)` — not by either page, and not by 'the admin version is more complete'"
  - "The `role` / `status` pass-through dropped from the CONSUMERS here; the SQL payload's keys left alone, because removing those is a migration and this phase writes none"
  - "The plan's expected `StaffNav context` divergence did not exist to resolve — plan 34-04 had already replaced that prop with `capabilities`"

requirements-completed: [STAFF-01]

duration: 42min
completed: 2026-08-10
---

# Phase 34 Plan 09: artists and venues collapse onto `organizer.access` — Summary

**Four files became two, at `/admin/artists` and `/admin/venues`, guarded by the
key the route map already binds to those two addresses — and every difference
between each pair was classified before the merge, with a grant row named for
the only one that was a verdict.**

**Commit:** `0f942fd`

---

## Task 1 — both pairs diffed, difference by difference

Run individually, as research assumption A5 requires and as the precedent for the
five collapses that follow. `git status --porcelain` was empty when they ran: no
file was modified by this task.

### D1 — `artists`

`diff "src/app/(admin)/admin/artists/page.tsx" "src/app/(organizer)/organizer/artists/page.tsx"` → 5 hunks.

| # | Lines | The difference | Verdict | Resolution |
|---|---|---|---|---|
| 1 | `:5-6` vs `:7-8` | import order — `MobileNav` / `StaffNav` before vs after `getAccessContext` | **cosmetic** | moot: both imports were deleted, the layout mounts them |
| 2 | `:11` | `AdminArtistsPage` vs `OrganizerArtistsPage` | **cosmetic** | `AdminArtistsPage`, matching the surviving address |
| 3 | `:14-20` | `CAP.ADMIN_ACCESS` vs `CAP.ORGANIZER_ACCESS`, each with its own justifying comment | **guard** | `CAP.ORGANIZER_ACCESS` — the key `capability-routes.ts:251` binds to `/admin/artists` |
| 4 | `:24-26` | two different comments over the same two `as UserRole` / `as UserStatus` casts | **cosmetic** | moot: both casts deleted, `(work)/layout.tsx` performs them once |
| 5 | `:39` | `<h1>Admin</h1>` vs `<h1>Organizer</h1>` | **cosmetic** | `<h1>Artists</h1>` — the surface's own name, not the tree's |

**No body difference.** The `select("id, name, slug, photo_url")`, the ordering,
the empty state, the map and the markup are byte-identical across the pair.

### D2 — `venues`

`diff "src/app/(admin)/admin/venues/page.tsx" "src/app/(organizer)/organizer/venues/page.tsx"` → the same 5 hunks in the same
positions, differing only in hunk 3's admin-side comment.

| # | Lines | The difference | Verdict | Resolution |
|---|---|---|---|---|
| 1 | `:5-6` vs `:7-8` | import order | **cosmetic** | moot — imports deleted |
| 2 | `:11` | `AdminVenuesPage` vs `OrganizerVenuesPage` | **cosmetic** | `AdminVenuesPage` |
| 3 | `:14-20` | `CAP.ADMIN_ACCESS` vs `CAP.ORGANIZER_ACCESS` | **guard** | `CAP.ORGANIZER_ACCESS` — the key `capability-routes.ts:252` binds to `/admin/venues` |
| 4 | `:24-26` | the two cast comments | **cosmetic** | moot — casts deleted |
| 5 | `:39` | `<h1>Admin</h1>` vs `<h1>Organizer</h1>` | **cosmetic** | `<h1>Venues</h1>` |

**No body difference.** Both sides ran the identical
`select("id, name, slug, address, photo_url")` and rendered the identical
`{venue.address && …}` block.

### The grant row that decided both guards

`('organizer', 'organizer.access', false)` in `private.role_capabilities`.

Named because D-34-05 requires the verdict to come from the capability table and
not from either page, and because Pitfall 6's forbidden sentence — *"the admin
version is more complete, so use it"* — decides nothing. Neither page is more
complete: they are the same page twice.

**Why this is not a widening in D-34-06's sense.** The address widens; the
surface does not. An organizer reached this identical page today at
`/organizer/artists` and `/organizer/venues` — same query, same rows, same
markup, proved by the `diff` above having no body hunk — and now reaches it at
the address the map binds to `organizer.access`. **No grant was added, no
`requires_approved` flipped, no key created.** The phase boundary held: if
closing either divergence had needed one, the merged surface would have taken
the more restrictive behaviour and this section would be a finding instead.

**And `catalogue.manage` is still refused, for a reason that changed shape.** The
comment it replaces argued why `admin.access` and not `catalogue.manage`; after
the collapse that argument is about a capability the page no longer asks. What
survives: `catalogue.manage` is the key the **actions** re-ask inside themselves,
it `requires_approved`, and a `pending` organizer reaches this listing today.
Asking it at the page would NARROW. Reaching a listing and changing a catalogue
are two verdicts asked in two places, and the collapse keeps them apart.

### Venue-secrecy cross-check — checked, with the line read

`.claude/rules/venue-secrecy.md` is the gate; the venues surface renders
`venues.address`, so it is asked and answered rather than assumed.

```
$ grep -rn "venue_reveal_sent\|venue_reveal_on_purchase\|secret" \
    "src/app/(admin)/admin/venues/page.tsx" \
    "src/app/(organizer)/organizer/venues/page.tsx" \
    "src/app/(admin)/admin/artists/page.tsx" \
    "src/app/(organizer)/organizer/artists/page.tsx"
src/app/(admin)/admin/venues/page.tsx:19:  // approved organizer. Nothing about `venue_reveal_sent` is touched.
```

**One match across the four files, and it is a `//` comment.** No code path in
any of the four reads or writes `venue_reveal_sent`,
`venue_reveal_on_purchase` or `venue_secret_hint_reveal_hours`. The read is
`src/app/(admin)/admin/venues/page.tsx:31-34` — `from("venues").select("id,
name, slug, address, photo_url")` — the catalogue address of a known venue, on a
staff surface behind a capability, not a public one. The monotone switch is
per-ticket and per-RSVP on the event path (`venue-secrecy.md`, *gate
autorizzazione per destinatario*), and this file never touches it.

**No reveal can be advanced by this merge**, and the audience of
`venues.address` is unchanged: the organizer twin already rendered the same
column through the same markup.

---

## Task 2 — the merge

`git mv` on the two `(admin)` pages into `(work)/{artists,venues}/`, following
the arrangement plan 34-06 measured and the compiler accepted. Then, in each:

- guard changed to `CAP.ORGANIZER_ACCESS`, comment rewritten to the measured
  truth rather than carried
- `StaffNav` and `MobileNav` mounts and imports deleted, the two casts deleted,
  the `@/types/database` import deleted with them (nothing else used it)
- `role` and `status` dropped from the `getAccessContext()` destructure
- `<h1>` set to the surface's own name

Then `git rm` on the two `(organizer)` twins.

**No relative `./actions` import existed on either page**, so the rewrite the
plan provisions for was not needed. Neither `actions.ts` moved, and neither is in
the diff.

### `capabilities/server.ts:200-208` — which of the two was done

**Dropped from the consumers here.** Both merged pages stop reading `role` and
`status` entirely; the casts are gone from the pages and live once in
`(work)/layout.tsx`, which keeps them because `MobileNav` is mounted on 44 pages
including the door's and its signature did not change (plan 34-05).

**The SQL payload's keys were left alone.** Removing them is a migration, and
this phase writes none — the phase boundary is explicit that
`private.role_capabilities` is not edited and no capability is granted, revoked
or re-scoped.

### No visual change beyond the heading

No token, no typography, no spacing, no component restyle. There is deliberately
no `UI-SPEC.md` for this phase, and the vocabulary question — whether these
surfaces should say `Artists` or something else — belongs to Phases 40 and 41.
The heading collapse was decided here by necessity, nothing more.

---

## Findings

### F-09-1 — the plan's expected `StaffNav context` divergence did not exist

The plan lists *"the `StaffNav context` prop"* among the differences to resolve,
inherited from `34-CONTEXT.md`'s measurement of 2026-08-09
(`StaffNav.tsx:9` — `context: "admin" | "organizer"`). **Measured today: neither
page passed a `context` prop.** Both passed `capabilities={[...capabilities]}`,
because plan 34-04 replaced that prop with the held capability keys in wave 2.

Nothing to resolve, so nothing was. Recorded because five sibling plans carry the
same sentence, and the next executor should expect to find it already gone rather
than go looking for a divergence that a previous wave closed.

### F-09-2 — the guard/map mismatch on these two addresses was live, not hypothetical

Between wave 1 and this commit, `/admin/artists` and `/admin/venues` were in a
state D-34-09 exists to forbid: `src/lib/routes/organizer-redirects.ts:78-79`
already sent `/organizer/artists` and `/organizer/venues` to them with a 307,
while the pages still guarded on `ADMIN_ACCESS`. An organizer following the
redirect was bounced to `/dashboard` — granted the capability, refused the
address, by the two readers disagreeing.

It is closed by this commit. Recorded rather than passed over because it is the
in-flight shape of the same defect the folded todo
`register-read-unreachable-for-organizers.md` describes, and because it is a real
cost of collapsing addresses in one wave and guards in another. **Any sibling
plan in this wave whose surface is already in `organizer-redirects.ts` carries
the same window until it lands.**

---

## Deviations from Plan

**None of Rules 1–4 fired.** No bug, no missing critical functionality, no
blocking issue, no architectural question. The plan's two tasks executed as
written; the two departures from its prose are F-09-1 (a divergence that a prior
wave had already removed) and the unneeded `./actions` rewrite, both recorded
above rather than treated as deviations, because neither changed what was built.

---

## Verification

| Gate | Result |
|---|---|
| `rm -rf .next && npm run build` | **exit 0** — `✓ Compiled successfully in 16.5s`, zero type errors |
| `npm run verify:persona` | **exit 0 — 7/7 verdi.** Check A not yet due: `src/app/(organizer)/**` still matches remaining files; the persona edit belongs to 34-15, in the same commit as the deletion (D-34-17) |
| Route manifest | `├ ƒ /admin/artists` and `├ ƒ /admin/venues` — no `(work)` in either address |
| `find "src/app/(admin)" -path '*artists*' -name page.tsx \| wc -l` | **1** |
| `find "src/app/(admin)" -path '*venues*' -name page.tsx \| wc -l` | **1** |
| `src/app/(admin)/admin/{artists,venues}/actions.ts` | **both present at those exact paths**, outside `(work)`; no `(work)/…/actions.ts` was created |
| `git diff --name-only` contains `EventForm.tsx` | **0 matches** — it is plan 34-11's file, in this same wave |
| `git diff --name-only` contains `actions.ts` | **0 matches** — neither a hunk nor a rename for either |
| `src/app/(organizer)/organizer/{artists,venues}/page.tsx` | **gone**; both directories no longer exist |
| `grep -c ORGANIZER_ACCESS` in each merged page | **1** and **1** |
| `grep -cE 'StaffNav\|MobileNav\|as UserRole\|as UserStatus'` in each merged page | **0** and **0** |
| `curl -sI …/organizer/artists` | **307 → `location: /admin/artists`** |
| `curl -sI …/organizer/venues` | **307 → `location: /admin/venues`** |
| `scanner` in the staged diff | **0 matches** — the door is untouched and unmatched |
| STATE.md / ROADMAP.md | **untouched**, as the orchestrator requires |

The 307 rather than 308 is D-34-15 holding: the redirects run temporary while the
phase is in flight, and the flip to permanent belongs to plan 34-17 after the
fifteen-address walk is green. It was served from `npm run dev` on a spare port,
before `updateSession` runs — which is why it answers in a worktree with no
Supabase credentials.

**Not claimed: that an organizer can use these surfaces.** There is no test
runner for this product, and nothing here may be called verified because tests
pass. What is claimed is that the two files compile at one address each, ask the
key the map binds, and that a `diff` showed no body difference to resolve. The
behavioural proof is **M-2** — an `organizer` / `approved` account rendering both
surfaces — and it is owed to plan 34-17, not to this one.

---

## Known Stubs

None. No placeholder, no TODO, no hardcoded empty value. This plan wrote no new
logic: it deleted a duplicate, changed one capability constant per file, and
moved two files.

---

## Threat Flags

None. No network endpoint, no auth path, no file-access pattern and no schema
change was introduced. On the register's own terms:

- **T-34-43** (bound wider than either original) — mitigated: `organizer.access`
  is the key the organizer twin already asked, the grant row is named above, and
  no grant was edited.
- **T-34-44** (venue addresses reaching a wider audience) — mitigated: the
  organizer twin already rendered the same column through the same markup, so the
  audience is unchanged; recorded as checked with the grep and the file:line.
- **T-34-45** (an action's `catalogue.manage` check weakened) — mitigated: both
  `actions.ts` are absent from the diff, in contents and in path.
- **T-34-46** (a divergence resolved by preference) — mitigated: every difference
  is classified above, the guard names its grant row, and the forbidden sentence
  was not written.
- **T-34-46b** (the catalogue actions made unimportable) — mitigated:
  R-WORK-ROUTES held; `EventForm.tsx` is not in the diff.
- **T-34-SC** — no package installed.

---

## Self-Check: PASSED

Files claimed present:

```
FOUND: src/app/(admin)/admin/(work)/artists/page.tsx
FOUND: src/app/(admin)/admin/(work)/venues/page.tsx
FOUND: src/app/(admin)/admin/artists/actions.ts
FOUND: src/app/(admin)/admin/venues/actions.ts
```

Files claimed gone:

```
GONE: src/app/(admin)/admin/artists/page.tsx
GONE: src/app/(admin)/admin/venues/page.tsx
GONE: src/app/(organizer)/organizer/artists/page.tsx
GONE: src/app/(organizer)/organizer/venues/page.tsx
```

Commit: `FOUND: 0f942fd`

`must_haves.artifacts` — both merged pages contain `ORGANIZER_ACCESS` (1 each).
`must_haves.key_links` — each merged page asks `CAP.ORGANIZER_ACCESS`, the key
`src/lib/routes/capability-routes.ts:248-252` binds to `/admin/artists` and
`/admin/venues`.
