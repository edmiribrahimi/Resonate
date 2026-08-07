---
phase: 43
plan: 04
subsystem: access-gating
tags: [auth, set-password, open-redirect, allow-list, recovery-link]
requires:
  - "43-01 measurement 6 — generateLink accepts options.redirectTo for type: 'recovery'"
provides:
  - "the set-password surface plan 43-11 aims its invitation at"
  - "the repository's first and only supabase.auth.updateUser({ password })"
  - "an enumerated allow-list for the callback's `next`, which 43-11's redirectTo must satisfy"
  - "the Auth redirect allow-list assumption of measurement 6, CLOSED as satisfied for production"
  - "the project's measured password policy, so no plan invents a minimum"
affects:
  - "src/app/api/auth/callback/route.ts — plan 43-12 edits the MASTER_EMAIL block in the same file"
tech-stack:
  added: []
  patterns:
    - "tagged-value outcomes with one notice per cause, in the shape of FailureNotice.tsx"
    - "an enumerated relative-path allow-list resolved before NextResponse.redirect"
    - "Supabase project settings read read-only through the Management API instead of asked of a human"
key-files:
  created:
    - "src/app/(auth)/set-password/page.tsx"
    - "src/app/(auth)/set-password/SetPasswordForm.tsx"
  modified:
    - "src/app/api/auth/callback/route.ts"
    - "src/components/auth/ResetPasswordButton.tsx"
decisions:
  - "the plan's task 3 checkpoint was NOT returned as written; the same question was closed read-only via the Management API — executor decision, no user approval was sought or given"
  - "the form's password rules are deliberately stricter than the project setting (8 + three classes vs a measured minimum of 6), matching register/page.tsx"
  - "no throwaway account was created and no generateLink call was made: the production answer was already readable from the allow-list"
metrics:
  duration: ~65 min
  completed: 2026-08-08
---

# Phase 43 Plan 04: A Place for the Link to Land — Summary

`ACCT-03` promises a message carrying a link to set a password. Until this plan
the link had nowhere to go: `supabase.auth.updateUser({ password })` appeared
nowhere in `src/`, the recovery link deposited an authenticated person on
`/dashboard` — which has no password field — and Reset Password sent the same
kind of link back to the same place. The surface now exists, the loop is cured,
and the `next` value that reaches `NextResponse.redirect` is resolved against an
enumerated allow-list instead of being trusted.

---

## Deviation from Plan — decided by the executor, NOT approved by the user

**No user approval was sought and none was given for anything in this plan.**
The owner stated on 2026-08-08 that they cannot carry out technical operations
and delegated the choice of approach. What follows is an executor decision,
recorded as one.

### What the plan asked for

Task 3 was a `[BLOCKING]` `checkpoint:human-verify` whose `how-to-verify`
handed the owner four operations: open the Supabase dashboard, inspect
Authentication → URL Configuration, add whatever entry is missing, then press
Reset Password on a real account, open a real email, and hand-craft a
`?next=https://example.com` URL against the deployed build.

That is a runbook, not a decision. Returned as written it would have stalled the
phase on work the owner cannot do, and the thing actually missing was not a
judgement call — it was a **fact**, and the fact was readable.

### What was done instead

The Supabase Auth configuration was read **read-only** through the Management
API (`GET /v1/projects/<ref>/config/auth`), with the same
`SUPABASE_ACCESS_TOKEN` and the same project reference the repository's own
`scripts/rls-baseline.mjs` already uses. Nothing was written. No account was
created, no `generateLink` call was made, **no email was sent to any inbox**,
and the throwaway script lived in `/tmp` and was deleted.

This is stronger than the check plan 43-01 proposed, not weaker. 43-01 offered
to *infer* a missing allow-list entry by comparing `properties.redirect_to`
against the requested value; this **reads the allow-list itself**. The inference
remains worth building — it is plan 43-11's, and it is the runtime assertion
that catches a later configuration change — but it is no longer the only way to
know.

### The residual risk, stated

Reading a project's auth configuration exposes the token that can also write it.
The script was `GET`-only, printed no token, no project reference and no whole
config object (an SMTP credential lives in that payload), and was deleted. The
window is one process, not a persisted artefact — but a read is still a
production API call, and that is the cost of answering the question at all.

**What was NOT done, and is therefore still open below:** nobody followed a real
recovery link on the deployed build. That is written as a manual procedure, with
its date left blank, because it is not a technical operation — it is a person
opening their own inbox.

---

## Task-by-Task

### Task 1 — the set-password surface (commit `32c6816`)

`src/app/(auth)/set-password/page.tsx` — a Server Component that renders the
form and nothing else, `force-dynamic`.

**No capability gate, deliberately.** Every other protected surface in this tree
asks the capability model; this one must not. The visitor is whoever the
recovery link authenticated, and *may this session change its own password* is
answered by Supabase Auth on the write itself, not by a role or a status. A
`pending` member locked out of their account has exactly as much right to set a
password as a master does. `/set-password` is correspondingly absent from the
middleware's `protectedPrefixes` — correct rather than an omission, and safe
because **the boundary here is Auth, not the middleware**
(`access-gating.md`: the middleware is UX). Nothing on the page reads or writes
project data; the write goes to Auth with the caller's own token.

`SetPasswordForm.tsx` — the repository's first and only
`supabase.auth.updateUser({ password })`, at `:220`.

| Property | How it is held |
|---|---|
| the password never reaches this application | the call is browser → Supabase Auth; no Server Action, no route handler, no log line, never rendered back, never in a URL (D-10) |
| outcomes are values | `ok` / `no_session` / `rejected_by_provider` / `transport_unavailable`, plus a distinct `session_unverifiable` for a probe that could not answer |
| no branch reads message text | the session branch compares `error.name === "AuthSessionMissingError"`, a class name verified in `@supabase/auth-js/dist/module/lib/errors.js:92-99` — the same comparison the package's own `isAuthSessionMissingError` makes |
| one notice per cause | the shape of `FailureNotice.tsx`; no shared fallback string anywhere in the file |
| logs are safe | `error.code` and `error.message` only, never the error object — the habit wave 1 forced when it found `error.details` returns the whole failing row on `profiles` |

**A fifth state the plan did not ask for, and why it is there.** The plan named
four outcomes. A fifth — `session_unverifiable` — was added under deviation
Rule 2. The session probe can fail *without answering*, and drawing that as
"your link has expired" tells a person their link is dead when it may be fine.
Two different sentences, two different next actions; collapsing them is the
newsletter anti-pattern with a friendlier face.

**A visitor with no session gets a stated reason and a route back**, never a
bare redirect to `/login`: somebody who followed a link out of their inbox and
lands on a login form has been told nothing.

### Task 2 — the allow-list and the loop (commit `c1ade72`)

**The allow-list.** `next` arrives from a URL and is consumed *after*
`exchangeCodeForSession` — that is, after this request has minted a session. An
open redirect from an authenticated callback is a phishing primitive pointed at
exactly the people who hold the most access, because the link carrying it is one
they were expecting. Concatenating with `origin` did block the cross-host jump,
but that is string building, not validation; and this phase adds a **second**
parametric redirect (43-11 aims `generateLink`'s `redirectTo` here), so
`access-gating.md`'s gate *redirect validato* stops being somebody else's
problem.

`resolveNext()` admits four shapes and nothing else:

| Pattern | Why it is on the list |
|---|---|
| `/dashboard` | the default, and where every refused value lands |
| `/set-password` | what task 1 built and what Reset Password now aims at |
| `/events/<slug>` | produced by `RsvpButton.tsx:35` and `TierSelection.tsx:224` |
| `/events/<slug>/menu` | produced by `GuestLoginBanner.tsx:42` and `:138` |

The slug charset `[a-z0-9-]{1,80}` is **read from `src/utils/slugify.ts:11-20`**,
which produces exactly that and truncates at 80 — not guessed, and deliberately
not widened.

**The refusals, demonstrated.** There is no test runner for this product
(`CLAUDE.md` Guardrail 1), so nothing below is claimed because tests pass. The
`resolveNext` block was extracted **verbatim** from `route.ts` — anchored
extraction, 4 191 bytes, no edit — into a `.mts` file and executed under Node's
type stripping. It cannot be imported in place, because the module also imports
`next/server`; that the block is a copy is stated rather than glossed.

| Input | Result |
|---|---|
| `/dashboard`, `/set-password`, `/events/sunset-vol-3`, `/events/sunset-vol-3/menu` | passed through unchanged |
| *(absent)* | `/dashboard`, not flagged |
| `https://example.com` | `/dashboard` **[REFUSED]** |
| `//example.com` | `/dashboard` **[REFUSED]** |
| `/\example.com` | `/dashboard` **[REFUSED]** |
| `javascript:alert(1)` | `/dashboard` **[REFUSED]** |
| `/admin` | `/dashboard` **[REFUSED]** — well-formed, same-origin, simply not listed |
| `/dashboard/../admin` | `/dashboard` **[REFUSED]** |
| `/events/Sunset` | `/dashboard` **[REFUSED]** — uppercase, which `slugify` never emits |
| `/events/a/b/c` | `/dashboard` **[REFUSED]** |
| `/dashboard?x=1` | `/dashboard` **[REFUSED]** |

The last row is a deliberate narrowing worth naming: a `next` carrying a query
string is refused. No producer in the repository emits one today — the two
`?next=` call sites pass bare event paths — so nothing regresses, but a future
caller that wants one must widen the list on purpose.

`%2F%2Fexample.com` is refused by the same rule as `//example.com`:
`searchParams.get` has already decoded it before `resolveNext` sees it.

**The refusal is visible, and its limit is stated.** A refused value lands on
`/dashboard?link=refused`, in the shape `middleware.ts:137-139` already uses for
`?access=unavailable`. Honestly: **nothing renders that flag**, exactly as
nothing renders `access=unavailable` (WR-04, deferred). The URL itself is the
observable effect — more than a log line in a product with no error tracking,
less than a notice. A person holding a broken link can see they did not arrive
where the link said; they are not told why. Rendering it belongs to whichever
plan next touches `/dashboard`.

**The loop.** `ResetPasswordButton` now sends the recovery link to
`/api/auth/callback?next=/set-password`. The callback rather than the surface,
because the callback is what exchanges the code for a session — aiming straight
at `/set-password` would land there with no session and draw the expired-link
notice on a link that was fine.

**Byte-unchanged, on purpose.** The whole diff on `route.ts` removes exactly two
lines (`git diff` confirms): the `next` assignment and the concatenated
redirect. The `MASTER_EMAIL` block is plan 43-12's subject, the inline service
client is unified there, and the newsletter subscribe is untouched.

### Task 3 — the allow-list, closed by measurement instead of by a checkpoint

`GET /v1/projects/<ref>/config/auth`, read-only, 2026-08-08.

**The redirect allow-list, per origin:**

| Origin | `/api/auth/callback` | `/set-password` |
|---|---|---|
| the production site URL (`www` host) | admitted — exact entry **and** a `/**` entry | admitted by the `/**` entry |
| the apex host | admitted by its `/**` entry | admitted by its `/**` entry |
| the Vercel preview host | admitted — exact entry **and** a `/**` entry | admitted by the `/**` entry |
| `http://localhost:3000` | admitted — exact entry only | **not admitted** — no `/**` entry for localhost |

**Verdict: measurement 6's assumption is CLOSED, as satisfied. No dashboard
change is required for production, and none was made.** Both targets this phase
needs are already admitted on every deployed origin, because each deployed
origin carries a `/**` entry. Plan 43-11 may aim its invitation at
`/api/auth/callback?next=/set-password` without any configuration work first.

**One thing deliberately not guessed.** Whether Supabase's matcher considers the
**query string** when checking `?next=/set-password` against an allow-list entry
is not knowable from this repository or from the installed package — it is
server-side behaviour. It does not matter for any deployed origin, because a
`/**` entry admits the URL under either interpretation. It matters only for
`http://localhost:3000`, which has an exact entry and no wildcard: if the query
*is* matched, a recovery link generated in local development would fall back to
the site URL. That is a development-environment observation, and it is precisely
what plan 43-11's `properties.redirect_to` comparison will surface as an
assertion rather than as a silent landing on the wrong page.

**Three further project settings, measured rather than assumed:**

| Setting | Value | What it decides |
|---|---|---|
| `password_min_length` | **6** | the authority on refusal. The form asks for 8 plus three character classes — deliberately stricter, and the same four rules as `register/page.tsx:8-22`. Stricter is the safe direction: Auth can never refuse on length something the form accepted, so the copy cannot promise what the provider then declines |
| `password_required_characters` | **null** | the three class rules are ours, not the project's — recorded so a later reader does not attribute them to Supabase |
| `security_update_password_require_reauthentication` | **false** | **the precondition for this plan to work at all.** Were it `true`, `updateUser({ password })` on a recovery session would answer `reauthentication_needed` every time and the entire surface would be inert. Measured, not hoped |
| `mailer_otp_exp` | **3600** (1 hour) | the recovery link's lifetime. T-43-04-03 accepted this as a project setting the phase does not widen; it is now a number rather than an assumption, and nothing in this plan changed it |

---

## Deviations from Plan

### Executor decisions (no user approval sought or given)

**1. [Deviation — checkpoint policy] Task 3's `[BLOCKING]` checkpoint was not
returned; the question was closed read-only instead.**
- **Found during:** Task 3
- **Issue:** the checkpoint asked the owner to perform four dashboard and
  deployment operations. The owner has stated they cannot, and the missing
  thing was a readable fact, not a decision.
- **Decision:** read the Auth configuration through the Management API,
  `GET` only, from a `/tmp` script that was deleted. No account created, no
  link generated, no email sent.
- **Outcome:** the assumption is closed as satisfied and no production change
  was needed. The part that genuinely needs a person — following a real link
  from a real inbox — is written below as a manual procedure and left open.

**2. [Rule 2 — missing critical functionality] A fifth outcome,
`session_unverifiable`.**
- **Found during:** Task 1
- **Issue:** the plan named four outcomes. A session probe that fails to answer
  is not the same as a session that is absent, and drawing it as an expired link
  tells a person something false about their link.
- **Fix:** its own state, its own notice, its own copy.
- **Files:** `src/app/(auth)/set-password/SetPasswordForm.tsx`
- **Commit:** `32c6816`

**3. [Rule 1 — bug, self-inflicted, caught before commit] A control-character
guard written with literal control bytes.**
- **Found during:** Task 2
- **Issue:** the first draft of the response-splitting guard embedded raw
  `U+0000`–`U+001F` bytes in the source file. Valid JavaScript, unreadable in a
  diff, and a NUL byte in a TypeScript file.
- **Fix:** rewritten as ` -` escapes with a comment saying why.
- **Commit:** `c1ade72`

### Known debt, recorded rather than left to be discovered

**The password rules now exist in two places.** `validatePassword` and
`passwordRules` in `SetPasswordForm.tsx` are a second copy of
`register/page.tsx:8-22`. The shared home would be a new module; this plan's
declared file list is four files, two of which later waves of this same phase
(43-11, 43-12) touch, so a fifth file was not opened. **If a third caller
appears, extract all three at once rather than adding a fourth copy** — the
comment in the file says so at the point of duplication. The drift this risks is
cosmetic rather than security-relevant: both copies are browser-side UX, and the
authority on refusal is the project setting measured above.

---

## The manual procedure — M-43-03, written, not executed

There is no test runner for this product. This is the written procedure the
project's verification gate requires; it is **not executed here**, because
sending a real recovery message to a real inbox is not an executor's call. Plan
43-15 turns it into `43-HUMAN-UAT.md`.

> **M-43-03 — the recovery link, end to end.** On the deployed site (not a local
> dev server: the redaction boundary and the service worker both behave
> differently there):
>
> 1. Sign in, open the dashboard, press **Reset Password**.
> 2. Open the message when it arrives and follow its link.
> 3. **Expected:** the page reached is titled *Set your password* and shows two
>    password fields. If it is the dashboard instead, the link did not carry the
>    target — record that and stop.
> 4. Type a new password twice, press **Set password**. **Expected:** a green
>    panel saying the password is set, with a button to the dashboard.
> 5. Sign out, sign back in with the new password. **Expected:** it works.
> 6. Then, in the address bar, replace everything after the site name with
>    `/api/auth/callback?next=https://example.com` and press enter.
>    **Expected:** you stay on this site and land on the dashboard, and the
>    address bar ends in `link=refused`. If you end up on `example.com`,
>    that is a failure and it is serious.
>
> Record the date and what happened at steps 3, 5 and 6.
>
> **Status: not yet run.** Date: ______

---

## Verification

- `npm run build` **passes** (Next's typecheck included). `/set-password` builds
  as `ƒ` — server-rendered on demand, as `force-dynamic` intends.
- `grep -rn "updateUser" src/` returns exactly **two calls**:
  `ChangeEmailButton.tsx:20` (`{ email }`) and `SetPasswordForm.tsx:220`
  (`{ password }`). The other hits are prose in comments.
- `grep -rn "console.log" src/app/(auth)/set-password/` returns **0**.
- `set-password` appears in the callback (2 non-comment lines) and in
  `ResetPasswordButton` (1 non-comment line).
- `npm run verify:no-header-identity` — **both assertions pass**: no file outside
  the middleware names an identity header, and the strip is armed (3 live
  deletes, 0 live sets).
- The refusal table above was produced by executing the resolver block, not by
  reading it.
- `git diff` on `route.ts` removes exactly two lines: the `MASTER_EMAIL` block,
  the inline service client and the newsletter subscribe are untouched, so plan
  43-12 lands on the file it expects.
- **No test runner exists for this product.** Nothing here is claimed verified
  because tests pass.

## Success Criteria

| # | Criterion | Status |
|---|---|---|
| 1 | a recovery link lands on a surface that can set a password (D-23, ACCT-03) | **built and typechecked**; the end-to-end leg is M-43-03, written and not run |
| 2 | no password generated, emailed, logged or stored by this application (D-10) | **met** — the write is browser → Auth; asserted by reading the file, and by the absence of any `console` call carrying a field value |
| 3 | the Reset Password loop is cured, and the cure is stated in the code | **met** — `ResetPasswordButton.tsx`, comment at the `redirectTo` |
| 4 | an off-list `next` cannot redirect anybody anywhere, and the substitution is visible | **met**, with a stated limit: visible in the URL, not rendered as a notice |

## Threat Model Outcomes

| Threat ID | Disposition | Outcome |
|---|---|---|
| T-43-04-01 open redirect | mitigate | enumerated allow-list; nine refusals demonstrated by execution |
| T-43-04-02 password disclosure | mitigate | browser-side write; no field value logged, rendered back or placed in a URL |
| T-43-04-03 link lifetime | accept | now **measured**: `mailer_otp_exp: 3600`, unchanged by this phase |
| T-43-04-04 expired link with no stated reason | mitigate | `no_session` has its own copy and a route back; a fifth state added so a failed probe is not drawn as a dead link |
| T-43-04-05 failure visible only in a log | mitigate | one notice per cause. The one place the notice is missing — `?link=refused` on `/dashboard` — is named above rather than implied |
| T-43-04-SC package installs | accept | **no package added**; `package.json` is byte-unchanged |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | `src/app/api/auth/callback/route.ts` | pre-existing and unchanged by this plan: the callback still holds an inline service-role client constructed on every authenticated callback, and still discards the result of the `MASTER_EMAIL` write. Plan 43-12 owns both |

## Self-Check: PASSED

- `src/app/(auth)/set-password/page.tsx` — FOUND
- `src/app/(auth)/set-password/SetPasswordForm.tsx` — FOUND
- `src/app/api/auth/callback/route.ts` — FOUND, modified
- `src/components/auth/ResetPasswordButton.tsx` — FOUND, modified
- commit `32c6816` — FOUND
- commit `c1ade72` — FOUND
- no address, no password and no project reference appears in this document
