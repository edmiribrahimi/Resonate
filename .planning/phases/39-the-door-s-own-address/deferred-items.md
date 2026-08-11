# Deferred items — phase 39

Out-of-scope discoveries logged rather than fixed in passing. Each names the
file, what is stale or wrong, and why it was not touched.

## From plan 39-03 (2026-08-11)

### D1 — six more docblocks still assign the nav conversion to phase 34

Plan 39-03 corrected four stale docblocks by name (`src/lib/rbac/roles.ts`,
`src/app/(admin)/admin/(work)/layout.tsx`,
`src/app/(admin)/admin/scanner/DoorSurface.tsx`, `src/types/database.ts`). Six
further sites still carry a sentence that says converting `MobileNav` to consume
capabilities is *"phase 34 (STAFF-03)"*. As of plan 39-03 it is done, so those
sentences point a reader at a phase that already closed:

| File:line | What it says |
|---|---|
| `src/app/(public)/newsletter/page.tsx:10` | *"Converting the nav itself to consume capabilities is phase 34 (STAFF-03)"* |
| `src/app/(public)/events/page.tsx:566` | *"phase 34 (STAFF-03) owns the nav vocabulary"* |
| `src/app/(public)/events/[slug]/page.tsx:1272` | same |
| `src/app/(public)/events/[slug]/menu/page.tsx:234` | *"phase 34 (STAFF-03) owns converting the nav itself"* |
| `src/app/(public)/artists/[slug]/page.tsx:102` | *"(STAFF-03) owns both ends and changes them together"* |
| `src/lib/capabilities/server.ts:198-208` | the same claim as `database.ts:1042` — *"two `"use client"` components that take `role` and `status` as props"* — in the module that defines the payload |

**Why not fixed here.** Five of the six are inside the thirteen mount sites, and
plan 39-03 task 2 requires the diff at each site to be *"the destructuring line
and the `<MobileNav>` element and nothing more"*, with a diff-size acceptance
criterion. `src/lib/capabilities/server.ts` is not in the plan's
`files_modified` at all. Fixing them would have broken a stated acceptance
criterion to correct prose that misleads nobody about behaviour.

**`src/lib/capabilities/server.ts:198-208` is the one worth doing next**, because
it is not a page comment: it is the docblock on `AccessContextResult`, the paragraph
that explains why `role` and `status` are still in the payload at all. It is the
twin of the sentence plan 39-03 did correct in `src/types/database.ts`.

### D2 — `39-DOOR-PASS.md` §1.5 cannot be run against production as written

§1.5 says *"Sign in with an organizer account in status `pending`"*. Since
`supabase/migrations/20260808001000_role_implies_approved.sql:117` there is a
named CHECK on `public.profiles`:

```
role NOT IN ('master', 'organizer', 'staff') OR status = 'approved'
```

so **an organizer in status `pending` is not representable in production.** The
migration's own "THE SEAM" section says as much: four seeded personas —
`organizer/pending`, `organizer/rejected`, `master/pending`, `master/rejected` —
"become unrepresentable the moment this rule exists", and only
`scripts/container/seed.mjs` can hold them, by dropping the constraint and
restoring it `NOT VALID`.

**Consequence for the door pass:** §1.5 is runnable **in the container**, on the
`organizer/pending` persona, and not on production. Relaxing the constraint in
production to satisfy a verification step would be the wrong trade by a wide
margin — the constraint is a database guard, and a verification is not a reason
to open one.

Not edited here because `39-DOOR-PASS.md` is not in plan 39-03's
`files_modified`.
