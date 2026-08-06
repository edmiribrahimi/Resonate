---
status: partial
phase: 32-capability-model-in-the-database
source: [32-VERIFICATION.md]
started: 2026-08-06
updated: 2026-08-06
---

## Current Test

[awaiting human testing — start with M-12, the door]

## Tests

### 1. M-12 — the door 🚪 (run this one first)
role: organizer, status pending — **this persona does not exist in production; creating it is part of the test**
steps: sign in as that account, visit `/admin/scanner`
expected: the page LOADS. A bounce means `door.operate` acquired a status check and a pending organizer is locked out of the door in front of a queue — the single most dangerous regression in this phase.
evidence if it fails: `supabase/migrations/20260807000000_capability_model.sql:416-417`, the two grant rows commented "These two rows must not become true."
result: [pending]

### 2. M-01 — CAP-04, a permission change takes effect on the next request ⚠️ the phase gate
role: owner, with a signed-in `member` account and the Supabase SQL editor
steps: six steps, ~2 minutes, written out in full in `32-VERIFICATION.md` § M-01. It REVOKES a grant and restores it — deliberately in that order, because granting would widen access for every member for the length of the test.
expected: five timestamps; the two intervals both under one minute and neither an hour; the member never signed out and the tab never closed; `select count(*) from private.role_capabilities` back at **16**.
stop condition: if the reload does not change the verdict, STOP — a capability is cached somewhere it must not be, and CAP-04 fails.
result: [pending]
note: `nyquist_compliant` flips to true only when this is recorded.

### 3. M-02 — `/admin` as master
expected: must load. A bounce means `admin.access` is not resolving.
result: [pending]

### 4. M-03 — `/admin/scanner` as master
expected: must load
result: [pending]

### 5. M-04 — `/organizer` as master
expected: must load
result: [pending]

### 6. M-05 — `/membership-card` as master
expected: must load if the account is `approved`; must bounce if `pending` — that is correct and unchanged
result: [pending]

### 7. M-06 — `/admin` as approved member
expected: must bounce to `/dashboard`
result: [pending]

### 8. M-07 — `/admin/scanner` as approved member
expected: must bounce to `/dashboard`
result: [pending]

### 9. M-08 — `/organizer` as approved member
expected: must bounce to `/dashboard`
result: [pending]

### 10. M-09 — `/membership-card` as approved member
expected: must load
result: [pending]

### 11. M-10 — the converted server action, as master
steps: open `/admin/newsletter`, let the subscriber count load
expected: must succeed
result: [pending]

### 12. M-11 — the converted server action, as approved member
expected: must redirect to `/dashboard`, exactly as before
result: [pending]

### 13. M-13 — the degraded path
steps: temporarily misspell the RPC name at `src/lib/supabase/middleware.ts:84`, reload a gated route while signed in, then revert and `diff` against the pristine file rather than trusting the eye
expected: all three at once — the bounce to `/dashboard`; `x-capabilities-resolve-failed: 1` on **the redirect entry, not the final document**; one `[capabilities.resolve_failed]` line in the server log carrying the PostgREST code
result: [pending]
note: exercised in 32-08 with two asserted mutations and a `curl`; never through a real authenticated browser session.

### 14. CR-01 follow-up — the browser-side failure notice
steps: revoke `EXECUTE` on `public.my_access_context()`, reload `/admin/newsletter` as `master`, observe, then restore
expected: an alert panel saying the list could not be loaded — **not** an empty list, and **not** "Newsletter not configured"
result: [pending]
note: the mutation proof covered the server action boundary and the server-rendered notice; `BroadcastList`'s browser-side effect path could not be covered because `useEffect` does not run during SSR. Full procedure in `32-REVIEW.md`.

## Summary

total: 14
passed: 0
issues: 0
pending: 14
skipped: 0
blocked: 0

## Gaps

Any single verdict that differs from the 40-cell table in `32-08-SUMMARY.md` is a
CAP-03 defect. The middleware is UX, but a UX rule that changed is still a rule
that changed.

The honest limit of this whole set: it exercises the **transport** — cookie →
session → RPC → redirect. What the database itself permits is the subject of B1,
B2 and B3, and those are measured, on both targets, at every phase point.
