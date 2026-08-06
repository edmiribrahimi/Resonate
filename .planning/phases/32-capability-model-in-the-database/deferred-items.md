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

---

## D-32-C — `CLAUDE.md` Guardrail 3 is wrong about `supabase/schema.sql`

**Found:** plan `32-04`, task 1, while working out what the container must be
built from, on 2026-08-06.

**The claim.** `CLAUDE.md` Environment Guardrail 3 states that
`supabase/schema.sql` contains *«zero `ENABLE ROW LEVEL SECURITY` e zero
`CREATE POLICY`»*, and concludes that all RLS lives in the migrations.

**What is actually there.** `grep -c 'create policy\|CREATE POLICY'` returns
**37**; `grep -ic 'enable row level security'` returns **11**.

**Why the guardrail still points the right way.** Its *conclusion* holds and is
the important half: the migrations are the source of truth for what is applied,
and `schema.sql` has drifted. This plan measured how far — the file was updated
alongside five migrations up to phase 26 and then abandoned, so it is neither
the pre-migration base nor the current schema, and it cannot be replayed
against the migration chain (see `baseline/README.md` § F2). Reading it and
concluding "there is no RLS" would be an error; reading it and concluding "this
is the schema" is now a *different* error, and the guardrail warns against
neither precisely.

**Why it is deferred.** `CLAUDE.md` is the persona. `ai-engineering.md` requires
that any change to it carry a semantic-version bump, a `.claude/CHANGELOG.md`
entry, a cross-domain coherence review and a green `npm run verify:persona` — a
piece of work with its own gates, and one this phase has no business doing
inside a plan about capability policies. Two agents touching the persona in
parallel must be sequenced, not parallelised.

**Decision owed to the owner:** correct Guardrail 3 in its own change, stating
what `schema.sql` *is* — a partially-maintained snapshot that is neither the
base nor the current schema — rather than only what it lacks.

**Measured again at the phase gate, and it is wrong in TWO files, not one:**
`CLAUDE.md:140` **and** `.claude/rules/supabase-data.md:18` carry the same
sentence. The second was not previously recorded. Both must move in the same
change, or the corrected one will be contradicted by the other.

---

## D through N — added after wave 3, and recorded here so this file is not a stale index

Waves 4 to 9 produced eleven more items. They were written into the plan
SUMMARYs while parallel executors were running, because two agents on one file
are sequenced rather than parallelised. **They are collected in full, with their
evidence, in `32-VERIFICATION.md`.** This section exists so that a reader who
opens *this* file does not conclude the phase deferred three things.

| ID | One line | Full entry |
|---|---|---|
| **D-32-D** | `32-07-PLAN.md`'s "43 policies" is **45** | `32-07-SUMMARY.md` § Finding 1 |
| **D-32-E** | `T-32-07-03` says one policy carries `TO authenticated`; it is **20 of 67**, 12 of them among the 45 rewritten | `32-07-SUMMARY.md` § Deferred |
| **D-32-F** | superseded by **D-32-H** — do not cite it alone | below |
| **D-32-G** | `--allow-lint-move` is **lint-wide, not entity-wide**; every use needs a hand-diff of the entity list | `32-07-SUMMARY.md`, repeated 32-09 |
| **D-32-H** | **neither artefact is the safety net; the PAIR is.** B1 passes a capability collapse that only the container's B3 catches (32-07); B3 passes a misapplied wrap that only B1 catches (32-09); and neither catches a key misspelled between `keys.ts` and the catalogue, which only `verify:capabilities` catches (32-10) | `32-VERIFICATION.md` § CAP-03 |
| **D-32-I** | an RLS write probe **must end in `returning id`** — a refused `UPDATE` raises nothing and matches no row, so a naive probe reports success for refusals too | `32-VERIFICATION.md` § CAP-06 |
| **D-32-J** | `32-09-PLAN.md`'s class-D occurrence count is wrong; the residual is **25 tokens, not 23** | `32-09-SUMMARY.md` § Finding 1 |
| **D-32-K** | the eight keys **partition exactly**: four consumed only by policies, four only by `src/`. **Phase 34's CAP-02, written as "every capability has a route", fails on half the model on day one** | `32-VERIFICATION.md` § Deferred |
| **D-32-L** | `verify:capabilities` reads the **catalogue, not the grants**. `private.role_capabilities` is never read, so a green there is **not** a statement about who can do what | `32-VERIFICATION.md` § Deferred |
| **D-32-M** | when the Management API throttles, the capture's **safety clause in the `finally` throws too** — the run reports `clause 1/2` and never prints `clause 2/2`. Clause 1 still holds (it is asserted before any byte is sent), but the row-count assertion is not *made*. The re-read should retry, or say plainly that it could not be made | `32-VERIFICATION.md` § Operational notes |
| **D-32-N** | `32-11-PLAN.md`'s expected `x-user-` census of **45** is produced by neither command: the loose count is **46**, the reader count **44** | `baseline/32-BASELINE-surfaces.post.md` § 6 |

**D-32-A is unchanged and remains the largest open decision of this phase.**
Confirmed a fourth time at `--phase-point=final`: the `profiles` UPDATE cells are
`42P17` × 4 on production and × 11 on the container, unmoved at every phase
point. Options **A–D** and the five-probe starting evidence are in
`32-VERIFICATION.md` § Deferred.
