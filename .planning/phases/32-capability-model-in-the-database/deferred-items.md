# Phase 32 — deferred items

Discoveries made while building the CAP-03 evidence harness that are **out of
scope for this phase** and must not be fixed inside it. Phase 32's contract is
that behaviour does not change; each item below would change behaviour, so each
is a decision for the owner, not an auto-fix.

---

## D-32-A — `UPDATE public.profiles` is impossible for every persona (`42P17`)

**Found:** plan `32-03`, task 2, while capturing B3 against production on
2026-08-06.

**What was measured.** Every one of the four personas production offers —
`anon`, `authenticated/no-profile`, `member/approved`, `master/approved` —
receives `42P17: infinite recursion detected in policy for relation "profiles"`
on an `UPDATE` of `public.profiles`. Reads are unaffected (`SELECT` returns 0,
1 and 4 rows for anon, member and master respectively).

Confirmed with a **bare** statement — no plpgsql wrapper, no `RETURNING` — in
four variants: own row as member, own row as master, another row as master, and
a `status` change as master. All four return `42P17`.

**Why.** `profiles_update_own`'s `WITH CHECK` sub-selects `public.profiles`
inside a policy on `public.profiles`:

```
((auth.uid() = id) AND (role = (SELECT profiles_1.role FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid()))) AND (status = (SELECT profiles_1.status …)))
```

Because permissive `WITH CHECK` clauses are OR'd and all are evaluated, the
recursion also takes down `profiles_update_master`, whose own predicate
(`(SELECT is_master())`) is a `SECURITY DEFINER` call and would not recurse on
its own.

**Why nothing is broken today.** Every profile-update call site in the
application goes through the **service-role client**, which bypasses RLS:
`src/app/api/auth/callback/route.ts:29` (the `MASTER_EMAIL` promotion),
`src/app/api/webhooks/sumup/route.ts:87`, and eight sites in
`src/app/(admin)/admin/members/actions.ts` (`:128`, `:154`, `:172`, `:200`,
`:234`, `:271`, `:316`). The two `UPDATE` policies on `profiles` are therefore
**dead**: nothing reaches them, and if anything did it would fail.

**Why it matters to this phase, and why it is still deferred.**
`profiles_update_own` is CAP-06's class E — one of the 26 policies this phase
rewrites. A rewrite that removes the recursion would turn two dead policies
into live ones. That is a **widening**, which CAP-03 forbids, and it would
happen as a side effect of a change made for a different reason. The honest
baseline is now recorded: the cell is `42P17`, not `42501`, and B3 will fail
the comparison if the rewrite changes it.

Note also that `profiles_update_own`'s `WITH CHECK` is the
**privilege-escalation guard** — the clause that stops a member setting their
own `role` to `master`. CAP-06's dedicated probe asserts that guard is
unchanged. Today the guard refuses by crashing rather than by denying. That
distinction has to be stated before the rewrite, not discovered after it.

**Decision owed to the owner, before the CAP-06 rewrite is written:** keep the
recursion (preserve behaviour exactly, as CAP-03 requires), or fix it as an
explicit, separately-declared change with its own before/after evidence. Do
not decide it implicitly inside a policy rewrite.

---

## D-32-B — `information_schema` is empty under the API's read-only role

**Found:** plan `32-03`, task 1.

Under `read_only: true` the Management API query endpoint runs as
`supabase_read_only_user`, and `information_schema.table_constraints` filters
by privilege: it returns **zero** rows for that user. A primary-key lookup
written against `information_schema` therefore reports "no primary key" for all
20 tables — a refusal for entirely the wrong reason.

Already handled inside `scripts/rls-baseline.mjs` (the key lookup reads
`pg_catalog`). Recorded here because any later plan that reads schema metadata
through this endpoint will hit the same wall, and the symptom looks like a
broken database rather than a privilege filter.
