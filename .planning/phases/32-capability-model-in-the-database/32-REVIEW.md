---
phase: 32-capability-model-in-the-database
reviewed: 2026-08-06T00:00:00Z
depth: deep
files_reviewed: 16
files_reviewed_list:
  - package.json
  - scripts/container/auth-shim.sql
  - scripts/container/seed.mjs
  - scripts/rls-baseline-compare.mjs
  - scripts/rls-baseline-container.mjs
  - scripts/rls-baseline.mjs
  - scripts/verify-capabilities.mjs
  - src/app/(admin)/admin/newsletter/actions.ts
  - src/lib/capabilities/keys.ts
  - src/lib/capabilities/server.ts
  - src/lib/supabase/middleware.ts
  - src/types/database.ts
  - supabase/migrations/20260807000000_capability_model.sql
  - supabase/migrations/20260807000100_capability_model_fk_index.sql
  - supabase/migrations/20260807010000_policies_to_capabilities.sql
  - supabase/migrations/20260807020000_wrap_auth_uid.sql
findings:
  critical: 2
  warning: 7
  info: 5
  total: 14
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-08-06
**Depth:** deep (cross-file, plus a mechanical re-derivation of the policy diff from the committed baselines)
**Files Reviewed:** 16
**Status:** issues_found

## Summary

**The permission model itself is sound. I could not find a widened permission,
and I looked for one mechanically rather than by reading.**

I re-derived the whole-phase policy diff independently of the phase's own
comparator, straight out of the two committed artefacts
(`baseline/32-BASELINE-policies.json` → `baseline/32-BASELINE-policies.final.json`),
and checked it against the original predicate sources
(`20260224_rbac_migration.sql:100-135`, `20260226200000_venues.sql:29-60`,
`20260226100000_artist_profiles.sql:28-60`) and against
`supabase/schema.sql:59-60`:

- 67 policies before, 67 after. **Zero added, zero dropped, zero renamed.**
  `cmd`, `permissive` and the `TO` role list are identical on all 67.
- 60 predicate clauses moved. Every one is either the `(select auth.uid())` wrap
  or one of the five enumerated predicates becoming a capability call.
- The eight capability keys and sixteen grant rows reproduce the five inherited
  predicates **exactly**, including the asymmetry the phase was told not to
  resolve: `catalogue.manage` carries `requires_approved = true` (the four
  `artists`/`venues` policies), `staff.manage` carries `false` (the 34
  `is_admin_or_organizer()` policies). They were **not** collapsed.
  `door.operate` is `false` on both grant rows, as required.
  `membership.active` and `membership.card.view` reproduce
  `get_user_status() = 'approved'` faithfully, and are safe against the "role
  outside the three" edge only because `public.profiles.role` is
  `not null … check (role in ('master','organizer','member'))`
  (`supabase/schema.sql:59`).
- Zero references to `is_admin_or_organizer()`, `is_master()`,
  `get_user_status()` or `get_user_role()` survive in `pg_policies`, and zero
  bare `auth.uid()` tokens survive: every occurrence in the final artefact sits
  inside a `SELECT auth.uid() AS uid` sub-select.
- Middleware verdicts are equivalent on all eleven personas. `/admin/scanner` is
  still tested before the general `/admin` branch, so an organizer is not judged
  by `admin.access` at the door.
- The SECURITY DEFINER surface is correctly built: `search_path = ''` on both new
  functions, every reference schema-qualified, `my_access_context()` argument-less
  and `REVOKE`d from `public`/`anon` before the `GRANT` to `authenticated`.
- Nothing in the diff touches `venue_reveal_sent`, `venue_secret`,
  `early_access_until` semantics, or any payment-status column. The monotone
  guards are intact, and `PROBE_PAYLOADS` deliberately keeps the write probes off
  all of them (`scripts/rls-baseline.mjs:906-916`).

**What is defective is the machinery around the model, not the model.** Two
findings are blocking: a new throwing failure path that the phase's own reference
conversion routes straight into a swallowing `.catch`, and an npm script whose
documented no-argument invocation destroys the committed pre-phase evidence and
fires read-write probes at production. The rest are guards that are asserted in
prose and enforced by nothing.

---

## Critical Issues

### CR-01: The "every failure throws" contract is defeated at the reference conversion's own call site

**File:** `src/app/(admin)/admin/newsletter/BroadcastList.tsx:23` (defect surfaces
here), introduced by `src/lib/capabilities/server.ts:119-180` +
`src/app/(admin)/admin/newsletter/actions.ts:56-60`

**Issue:** `src/lib/capabilities/server.ts:33-53` states the requirement in its own
words — *"every failure throws, with a category in the message. There is no `catch`
in this file that returns a value"* — and claims the observable effect is *"the
surface fails to render rather than rendering as 'you may not do this'"*. That is
true for exactly one of the four call sites the phase created. The phase converted
`requireMaster()` (`actions.ts:56`) from a header read that could not fail into a
call that **can now throw**, and three of its four callers already swallow throws:

- `listBroadcasts()` → `BroadcastList.tsx:23`: `.catch(() => setBroadcasts([]))`.
  A `capabilities.resolve_failed` becomes **an empty broadcast list**, rendered as
  fact. A `master` sees "no broadcasts" and has no way to tell that from a
  database that answered.
- `deleteBroadcast()` → `BroadcastList.tsx:32-34`: `console.error` in the
  **browser** console, no UI change.
- `createAndSendBroadcast()` → `ComposeForm.tsx:25-27`: `setError(err.message)`,
  which in a production build is Next's redacted server-action message, not
  `capabilities.resolve_failed: <code>`.

Only `getSubscriberStats()` from `page.tsx:6` reaches the error boundary as
documented.

**Failure scenario:** the Supabase RPC endpoint returns a transient 5xx, or the
`GRANT EXECUTE … TO authenticated` on `public.my_access_context()` is lost by a
later migration. A master opens `/admin/newsletter`. The page renders. The
broadcast list is empty. Nothing tells anyone. This project has no error tracking
(`meta-gates.md`, verified 2026-08-05), so the only trace is one server log line
nobody watches — which is precisely the newsletter precedent
(`.planning/codebase/CONCERNS.md`) that `server.ts:44-46` cites as the thing it
avoids. `meta-gates.md` is binding: *"un fallimento che conta deve avere un
effetto osservabile"*. A blank list is the opposite of observable.

**Fix:** either propagate the category to the surface, or stop pretending the throw
is the mitigation. Concretely, in `BroadcastList.tsx`:

```tsx
const [loadError, setLoadError] = useState<string | null>(null);

listBroadcasts()
  .then((data) => { setBroadcasts(data as Broadcast[]); setLoadError(null); })
  .catch((err) => {
    // A resolve failure is NOT an empty list. Distinguish, or the operator
    // debugs the wrong table.
    setBroadcasts([]);
    setLoadError(
      String(err?.message ?? "").startsWith("capabilities.resolve_failed")
        ? "Permission lookup failed — this is an infrastructure fault, not a refusal."
        : "Could not load broadcasts."
    );
  })
  .finally(() => setLoading(false));
```

and render `loadError` above the list. Then re-state in
`src/lib/capabilities/server.ts` which call sites the throw is actually visible
at, since the current comment asserts more than the code delivers.

---

### CR-02: `npm run baseline:rls` with no arguments overwrites the committed pre-phase baselines and runs read-write probes against production

**File:** `scripts/rls-baseline.mjs:1518` (defaults), `:377-399` (`artefactPath` /
`writeArtefact`), `:21-24` (the documented usage)

**Issue:** the CLI defaults are
`{ target: 'production', only: ['B1','B2','B3','B5'], phasePoint: 'pre' }`, and
`artefactPath()` maps `phasePoint === 'pre'` to the **unsuffixed** filename.
`writeArtefact()` calls `writeFileSync` unconditionally — there is no `existsSync`
refusal, no `--force`, nothing. So the first command in the file's own usage block
(`npm run baseline:rls`, line 22) rewrites all four committed pre-phase artefacts
with today's post-phase state:

```
.planning/phases/32-.../baseline/32-BASELINE-policies.json
                              .../32-BASELINE-reads.json
                              .../32-BASELINE-writes.json
                              .../32-BASELINE-advisors.json
```

The header at `:366-375` claims the opposite: *"the pre-phase capture on production
is the unsuffixed file, so that … a later capture never overwrites it by
accident."* The mechanism described does not exist; `pre` is the **default**, which
makes accidental overwrite the path of least resistance rather than an unlikely
one.

The same invocation also selects **B3**, which sends 220+ `read_only: false`
transactions to the production database — `insert`/`update`/`delete` against
`tickets`, `ticket_refunds`, `drink_orders`, `door_scan_events`, `profiles` and
fifteen more tables. The two rollback clauses (`:1190-1204`, `:1214-1228`) are
genuinely good and I could not break them, but a default that writes to production
should be opt-in, not opt-out.

**Failure scenario:** anyone — a future phase, a new contributor, the phase author
six months from now — runs the command printed at line 22 to "re-check the
baseline". The `pre` artefacts are silently replaced by `final` data. Every later
`npm run baseline:compare --before=pre` then compares post-phase against
post-phase and reports **clean**, for the worst possible reason: the whole CAP-03
evidence chain becomes vacuous, and the comparator that exists to detect vacuous
agreement (`rls-baseline-compare.mjs`, and the floors at
`rls-baseline.mjs:129-130`) cannot see it, because the artefacts are internally
consistent. `git status` is the only warning, and it arrives after the fact.

**Fix:** refuse the overwrite and refuse the write-probe default.

```js
// in writeArtefact, before writeFileSync
const path = artefactPath(slug, phasePoint, targetSuffix ?? '');
if (existsSync(path) && !process.env.RLS_BASELINE_OVERWRITE) {
  throw new Error(
    `${relative(ROOT, path)} already exists. A captured baseline is evidence, not a ` +
    `cache: re-capturing over it makes every later comparison vacuous. Use a new ` +
    `--phase-point, or set RLS_BASELINE_OVERWRITE=1 and say why in the commit.`
  );
}
```

and change the CLI default to require the destructive parts explicitly, e.g.
`only: ['B1','B5']` by default with B2/B3 needing `--only=B1,B2,B3`, or refuse
`--target=production` together with B3 unless `--i-know-this-writes` is passed.

---

## Warnings

### WR-01: the B1 comparator validates the *shape* of the capability substitution but never *which* key was substituted

**File:** `scripts/rls-baseline-compare.mjs:282-348` (`explainPredicate`),
`:552-561` (the mapping is collected), `:598-610` (it is only printed)

**Issue:** `T2_RIGHT_HAND_SIDE` (`:242-243`) captures the capability key as a free
variable `([A-Za-z0-9_.]+)`. `explainPredicate` returns
`{ lhs: 'P1', key: 'whatever' }`, and `compareB1` pushes that into `mapping` and
**prints** it (`:605-610`). Nothing asserts that `P1` maps to `staff.manage`, that
`P3` maps to `catalogue.manage`, or that a single left-hand side maps consistently
across its 34 call sites.

This is exactly the defect the phase names as its single unrecoverable one
(`20260807010000_policies_to_capabilities.sql:41-54`, `32-PATTERNS.md`).

**Failure scenario:** a generator bug or a copy-paste writes
`catalogue.manage` into the 34 P1 policies. `explainPredicate` reports a legal T2
on all 34. `roles`, `permissive`, `policy_count` and `rls_enabled_tables` are all
unchanged. **B1 reports `clean`.** A `pending` organizer silently loses insert on
`ticket_tiers`, `events`, `guest_list_entries` and thirteen other tables — the
door-adjacent staff surfaces. The only artefact that would catch it is B3 on the
**container** target, which requires Docker and a separate invocation, and which
only discriminates on the two tables where `organizer/pending` differs.

**Fix:** pin the mapping in the comparator, next to `T2_LEFT_HAND_SIDES`:

```js
const T2_EXPECTED_KEY = {
  P1: 'staff.manage',
  P2: 'master.manage',
  P3: 'catalogue.manage',
  P4: 'master.manage',
  P5: 'membership.active',
};
// in compareB1, inside the `for (const entry of result.t2)` loop:
if (T2_EXPECTED_KEY[entry.lhs] !== entry.key) {
  defect('capability_key_wrong', `${rb.tablename}.${rb.policyname} (${rb.cmd}) ${clause}`,
    `${entry.lhs} was replaced by "${entry.key}", expected "${T2_EXPECTED_KEY[entry.lhs]}". ` +
    'P1 and P3 differ by a status check; collapsing them is the phase\'s named worst case.');
}
```

### WR-02: nothing mechanically defends `requires_approved`, and `door.operate` is the row that must not move

**File:** `supabase/migrations/20260807000000_capability_model.sql:414-417`,
`scripts/verify-capabilities.mjs:658-662`

**Issue:** `door.operate` is granted with `requires_approved = false` and the
migration says in prose *"These two rows must not become true"* (`:415`).
`verify-capabilities.mjs` states in its own closing note that
*"`private.role_capabilities` is not read here at all"* (`:660-661`). So the entire
grant table — the sixteen rows that **are** the behaviour (`:329-335`) — has no
check of any kind. `npm run build` cannot see it, `verify:capabilities` declines to
see it, and B1 cannot see it (a grant change does not touch a policy predicate).

**Failure scenario:** a later migration, or a hand-run statement in the Supabase SQL
editor, executes
`update private.role_capabilities set requires_approved = true where capability = 'door.operate';`
— a plausible "tidy up the two axes" change. `verify:capabilities` stays 4/4 green,
B1 stays clean, `npm run build` passes. An organizer who was promoted before
`updateMemberRole` started approving in the same write (or whose status was later
set back to `pending`) is bounced from `/admin/scanner` to `/dashboard`, at the
door, at 02:00, with a queue behind them and no message on screen. B2/B3 would only
catch it if someone re-ran them on the container.

**Fix:** add a fifth check to `verify-capabilities.mjs` that reads the grant table
and compares it to a pre-registered literal, the same way `EXPECTED_KEY_COUNT`
(`:104`) is pre-registered:

```js
const EXPECTED_GRANTS = [
  ['master','staff.manage',false], ['organizer','staff.manage',false],
  ['master','master.manage',false],
  ['master','catalogue.manage',true], ['organizer','catalogue.manage',true],
  ['master','membership.active',true], ['organizer','membership.active',true], ['member','membership.active',true],
  ['master','admin.access',false],
  ['master','organizer.access',false], ['organizer','organizer.access',false],
  ['master','door.operate',false], ['organizer','door.operate',false],
  ['master','membership.card.view',true], ['organizer','membership.card.view',true], ['member','membership.card.view',true],
];
// select role, capability, requires_approved from private.role_capabilities
// and diff against the literal above; a door.operate row with requires_approved
// = true is its own named failure message.
```

A `CHECK` constraint would be even cheaper and would refuse the write itself:

```sql
alter table private.role_capabilities
  add constraint door_operate_is_role_alone
  check (capability <> 'door.operate' or requires_approved = false);
```

### WR-03: the two `private` tables have no RLS, and the only defence lives outside git

**File:** `supabase/migrations/20260807000000_capability_model.sql:77-160`

**Issue:** `private.capabilities` and `private.role_capabilities` are created
without `ENABLE ROW LEVEL SECURITY` and without a policy. The migration argues
(`:128-153`) that unreachability is a stronger answer than a policy. Both halves of
that unreachability sit **outside this repository**: PostgREST's exposed-schema
list is a Supabase dashboard setting, and the absence of table grants depends on
Supabase's `ALTER DEFAULT PRIVILEGES` never being extended to `private`. This
directly contravenes `supabase-data.md`, gate *tabella nuova = policy nuova*, and
the argument presents the two options as exclusive when they are additive.

**Failure scenario:** an operator adds `private` to the exposed schemas — the exact
mistake the comment at `:147-153` says it exists to prevent — while chasing an
unrelated problem, or a future migration writes
`grant select on all tables in schema private to authenticated`. With RLS off,
every row of the grant table becomes readable, which is a map of the whole
permission model. With `ENABLE ROW LEVEL SECURITY` and zero policies, the same two
mistakes yield an empty result set instead. The phase does capture `db_schema` in
B5's invariants (`rls-baseline.mjs:1461-1471`), but B5 is a manual capture against
production, not a control.

**Fix:** two lines, no behaviour change, in a new forward migration:

```sql
alter table private.capabilities       enable row level security;
alter table private.role_capabilities  enable row level security;
-- No policy, deliberately: RLS with zero policies denies every non-owner role.
-- private.has_capability is SECURITY DEFINER and reads these as its owner, so
-- the resolver is unaffected. This is defence in depth behind the exposed-schema
-- setting, not a replacement for it.
```

### WR-04: the middleware now hard-depends on a database function, and the degraded path's only signal is a header the code says is never read

**File:** `src/lib/supabase/middleware.ts:84-97`, `:8-21`, `:123-131`

**Issue:** the middleware's route protection previously depended on a `select` from
a table that has existed since phase 2. It now depends on
`public.my_access_context()` existing **and** on `authenticated` holding EXECUTE on
it. On failure the code fails closed and sets `x-capabilities-resolve-failed: 1`,
about which the file itself says: *"It is never read. Nothing downstream branches
on it"* (`:18-19`). `meta-gates.md` is explicit that in this project a log is not
enough and that a failure that matters needs *"un effetto osservabile — visibile
all'utente, allo staff sul posto, o come conseguenza misurabile nei dati"*. A
response header is none of those three: it is invisible without devtools.

**Failure scenario:** the Vercel deploy lands before `20260807000000` is applied to
the Supabase project (they are independent operations in this repo — there is no
migration step in `package.json`), or the migration is rolled back. Every
authenticated request gets `PGRST202`. Every master and every organizer is bounced
from `/admin`, `/organizer`, `/admin/scanner` and `/membership-card` to
`/dashboard`. The user-visible symptom is identical to a permissions refusal. The
diagnostic exists only on the wire.

**Fix:** give the degraded path an effect a human meets. Minimum: redirect to a
distinct path rather than `/dashboard` when `capabilitiesResolveFailed` is true —

```ts
const bounceToDashboard = () => {
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard";
  if (capabilitiesResolveFailed) url.searchParams.set("access", "unavailable");
  const response = NextResponse.redirect(url);
  if (capabilitiesResolveFailed) response.headers.set(CAPABILITY_DIAGNOSTIC_HEADER, "1");
  return response;
};
```

— and render a one-line banner on `/dashboard` for `?access=unavailable` saying the
permission lookup failed. That is the difference between "you may not do this" and
"we could not find out", which is the whole point the file argues for.

### WR-05: `assertUuid` guards the persona subject but not the values interpolated into the write probes

**File:** `scripts/rls-baseline.mjs:1123-1141` (`resolveProbeKeys`,
`substituteReferences`), `:1165-1176` (`buildProbeStatement`), against `:569-579`
(`assertUuid`, and the comment that states the rule)

**Issue:** the file declares the rule at `:569` — *"A subject uuid is embedded in a
SQL literal; refuse anything that is not one"* — and enforces it for the persona
`sub` claim (`:643`) and the persona subject (`:626`). It is **not** enforced for
the two other classes of value that reach a SQL literal:
`refs[table]` from `resolveProbeReferences` (`:1102-1117`) is interpolated by
`substituteReferences` as `'${refs[table]}'::uuid` (`:1139`), and `keys[table]`
from `resolveProbeKeys` is interpolated into the `WHERE` clause as
`(${pkExpression}) = '${key}'` (`:1166`). Both come from `min(<pk>::text)` on a
live table. These strings then run in a `read_only: false` transaction against
**production**.

**Failure scenario:** a future RLS-enabled table in `public` has a `text` primary
key populated from user input — a slug, a discount code, a membership code — and
`min(pk)` returns a value containing a single quote. `buildProbeStatement` emits
`delete from public."t" where ("pk"::text) = '<injected>';`, and the injected tail
executes inside the probe transaction. The `rollback;` guard limits the damage but
does not prevent it: `assertProbesRollBack` (`:1190-1204`) only checks that the
string ends in `rollback;` and contains no `commit`, and a `SELECT`-based
exfiltration or a `SET` needs neither. Not reachable today — every RLS-enabled
table's primary key is a uuid — which is why this is a WARNING and not a BLOCKER.

**Fix:** apply the file's own rule uniformly.

```js
// resolveProbeKeys / resolveProbeReferences
const SQL_LITERAL_SAFE = /^[0-9A-Za-z_:|@.-]*$/;
function assertLiteralSafe(value, what) {
  if (!SQL_LITERAL_SAFE.test(String(value ?? ''))) {
    throw new Error(`${what} contains a character that cannot be embedded in a SQL literal — refusing to build SQL from it`);
  }
  return value;
}
```

…called on every `row.ref` and every `row.key` before they are stored. Or, better,
send the probes as parameterised statements on the container target and keep the
Management API target read-only.

### WR-06: the stated reason for choosing `language sql` is false for this function

**File:** `supabase/migrations/20260807000000_capability_model.sql:173-175`

**Issue:** the migration justifies diverging from the four `plpgsql` helpers with
*"A SQL body can be inlined by the planner and is the shape Supabase's own examples
use."* PostgreSQL's SQL-function inliner refuses **both** of the properties this
function carries: it will not inline a function with `prosecdef` set
(`SECURITY DEFINER`) and it will not inline a function with a non-null `proconfig`
(`SET search_path = ''`). `private.has_capability` has both. It is never inlined,
under any plan. The chosen language is fine; the reason recorded for it is not.

**Failure scenario:** the next engineer reads `:173-175`, believes the resolver is
inlined and therefore free, and adds the second OR arm the body invites at
`:201-204` (the per-night assignment) as a correlated sub-select — expecting the
planner to fold it into the outer query. It will not: the function is an opaque
call, evaluated once per InitPlan site per statement, and the new arm runs inside
it. The performance reasoning that gets built on a false premise is the defect, and
in a file this carefully argued a wrong sentence carries more weight than usual.

**Fix:** replace the sentence with the true one — `language sql` is chosen for
legibility and because the body is a single `EXISTS`; the once-per-statement
evaluation comes entirely from the `(select …)` wrapper at the call sites, which
the same file already states correctly at `:177-184`.

### WR-07: `verify-capabilities.mjs`'s TypeScript reader is unsound in two ways

**File:** `scripts/verify-capabilities.mjs:280-300` (`readCapObject`),
`:167-263` (`splitCodeAndComments`)

**Issue A — `readCapObject`:** `const close = code.indexOf('}', open)` takes the
**first** closing brace after the object opens. Any nested object, any inline type
annotation with braces, any template-literal `${…}` inside a value silently
truncates the parse. The failure is quiet at the parse site and only surfaces
through the `EXPECTED_KEY_COUNT` check at `:500-518` — i.e. it reports "TS has 3
keys, expected 8" and points the reader at *the capability model* (`:510-512`),
which is the wrong place to look.

**Issue B — `splitCodeAndComments`:** the doc comment at `:168` claims it leaves
"string, template and regex contents intact", but there is no regex-literal branch.
A `'` or `"` inside a regex literal opens a phantom string that runs to the next
matching quote, possibly many lines away. This is not hypothetical:
`src/app/(auth)/register/page.tsx:13` contains
`/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/` — both quote characters, inside a regex.
Everything from that `'` to the next `'` in the file is classified as a string, so
`//` line comments inside that span are not stripped and land in `code`.

**Failure scenario for B:** a developer comments out a call —
`// await hasCapability(CAP.DOOR_OPERATE)` — inside a file whose earlier lines
contain a regex with a quote. The comment is scanned as code, `CAP.DOOR_OPERATE` is
counted as a live caller, and check 4 stops warning that a catalogue key has no
caller. The script's own stated purpose — *"a key named only in a comment is not a
caller, and counting it as one is how a census reads unchanged while the thing it
counts has moved"* (`:38-40`) — is defeated by the parser meant to enforce it.

**Fix:** for A, brace-match instead of `indexOf`:

```js
let depth = 0, close = -1;
for (let i = open; i < code.length; i++) {
  if (code[i] === '{') depth++;
  else if (code[i] === '}' && --depth === 0) { close = i; break; }
}
```

For B, add a regex-literal branch (a `/` is a regex start when the previous
non-space code character is one of ``( , = : [ ! & | ? { ; return``), or state the
limitation honestly in the header instead of claiming regex contents are handled.

---

## Info

### IN-01: the degraded path still asserts `member` / `pending` to 45 downstream files

**File:** `src/lib/supabase/middleware.ts:109-110`, `:220-222`

When the RPC fails, `role`/`status` fall back to `member`/`pending` and are injected
into `x-user-role` / `x-user-status`, which 45 files under `src/` read. Those files
receive an assertion, not an unknown — and unlike the middleware's own four rules,
they get no diagnostic at all (the header is set on the *response*, and the inbound
copy is correctly deleted at `:217`). This preserves the pre-phase verdicts as
CAP-03 requires, so it is not a defect of this phase; it is the shape the header
transport imposes, and it is worth naming in the phase that deletes that transport.

### IN-02: one round trip, eight profile lookups

**File:** `supabase/migrations/20260807000000_capability_model.sql:275-291`

`public.my_access_context()` derives the capability array by calling
`private.has_capability` once per catalogue row — eight calls, eight
`profiles ⋈ role_capabilities` lookups — and since the resolver cannot be inlined
(see WR-06) they are eight real function invocations. The claim of "one round trip"
is true and is the right trade; the claim that it costs nothing more than the old
`select role, status` is not quite. The middleware matcher includes `/api/*`, so
this runs before every door scan. Out of v1 review scope as a performance matter,
recorded because the door is the surface where it would be felt.

### IN-03: `private.has_capability` keeps PUBLIC's default EXECUTE

**File:** `supabase/migrations/20260807000000_capability_model.sql:224`

`public.my_access_context()` is explicitly revoked from `public` and `anon` before
being granted (`:296-297`), with a correct explanation. `private.has_capability`
gets an explicit `GRANT` to `authenticated, anon` but no matching `REVOKE … FROM
public`, so PUBLIC retains Postgres's default EXECUTE — which makes the explicit
grant redundant and means any future role gets it for free. Harmless today
(`private` is not served by PostgREST and the function answers only about
`auth.uid()`), and worth making symmetric with section 5 for the same reason
section 5 gives.

### IN-04: `private.role_capabilities.role`'s CHECK is a third copy of `UserRole`

**File:** `supabase/migrations/20260807000000_capability_model.sql:121`

`check (role in ('master','organizer','member'))` mirrors `src/types/database.ts:15`
and `supabase/schema.sql:59`. If a fourth role is ever added, the CHECK refuses the
grant rows loudly (fail-closed, which is right), but the failure arrives at insert
time rather than at review time, and `verify-capabilities.mjs` would not mention it.
Worth folding into the WR-02 grant check when that is written.

### IN-05: unqualified `profiles` / `events` inside two re-created policy bodies

**File:** `supabase/migrations/20260807010000_policies_to_capabilities.sql:227`,
`:245`; `20260807020000_wrap_auth_uid.sql:135-139`, `:149-153`, `:213-217`

These are Postgres's own re-print pasted back, which is the right method — but the
pasted text carries unqualified relation names, so the migration's meaning depends
on `search_path` at apply time. It fails loudly (relation does not exist) rather
than resolving to something else, and the whole file is one transaction, so the
risk is a failed deploy rather than a wrong policy. Noted because every other
object this phase creates is scrupulously schema-qualified, and the inconsistency
will read as an oversight to the next person.

---

_Reviewed: 2026-08-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
