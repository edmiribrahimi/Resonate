# State: Resonate

## Project Reference

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** Phase 3 in progress -- Referral & Approval System.

## Current Position

**Phase:** 3 of 7 -- Referral & Approval System
**Plan:** 1 of 3
**Status:** In progress

```
[Phase Progress]  ███████░░░░░░░░░░░░░  1/3 plans in phase 3

[Overall]         ██████░░░░░░░░░░░░░░  2/7 phases complete
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans completed | 7 |
| Plans failed | 0 |
| Requirements done | 18/45 |
| Phases complete | 2/7 |

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 (Brand Foundation) | 89s | 2 | 4 |
| 01-02 (English Migration) | 340s | 2 | 14 |
| 01-03 (Bug Fixes) | 106s | 2 | 2 |
| 02-01 (Schema Migration) | 203s | 2 | 5 |
| 02-02 (Middleware RBAC) | 255s | 2 | 12 |
| 02-03 (Admin Members) | 161s | 2 | 4 |
| 03-01 (Referral Data Foundation) | 128s | 2 | 4 |

## Accumulated Context

### Key Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| 7 phases (comprehensive depth) | Roadmap | Natural delivery boundaries from 45 requirements across 6 categories; 8th phase would be artificial |
| UI/Branding split across Phase 1 and Phase 4 | Roadmap | Core UI (font, translation, logo) is independent; branded emails depend on approval system |
| APPR-04 placed in Phase 4 (not Phase 3) | Roadmap | Approval notification email needs branded template infrastructure |
| TICK-07 in Phase 6 (not Phase 3) | Roadmap | "Pending cannot buy tickets" is enforced by APPR-01 at the RBAC layer; TICK-07 is the payment-side guard |
| Phase 6 and 7 can parallelize | Roadmap | Media uploads and ticket payments are independent features once events exist |
| Orbitron for ALL text site-wide | Phase 1 | Geometric display font fits electronic music aesthetic; platform has short-form content where Orbitron stays readable at 14px+ |
| Graceful event query fallback | Phase 1 | Homepage renders cleanly even without DB connection or upcoming events via try/catch |
| Component function names renamed to English | Phase 1 | Renamed EventiPage, PresenzePage, etc. to English equivalents for codebase consistency |
| Auth check via getUser() on public page | Phase 1 | Uses supabase.auth.getUser() which reads cookies (not DB), keeping event page fast despite being dynamic |
| Real-time inline password validation | Phase 1 | Per-rule checkmark feedback in 2x2 grid rather than strength meter bar -- more informative and friendlier |
| CHECK constraints over PostgreSQL ENUMs | Phase 2 | Easier to extend in production (no ACCESS EXCLUSIVE lock), simpler ALTER operations |
| Service role client for master promotion | Phase 2 | User's session cannot modify own role via RLS; service role bypasses RLS entirely |
| Application-layer master detection | Phase 2 | PostgreSQL triggers cannot read Next.js env vars; auth callback is simpler |
| Inline route checks in middleware | Phase 2 | Edge runtime minimizes imports; route checks inlined as string comparisons rather than imported from roles.ts |
| Cookie preservation via pendingCookies array | Phase 2 | Creating new NextResponse for header injection loses Supabase cookies; tracking and re-applying prevents auth loss |
| Newsletter page server/client split | Phase 2 | Client components cannot use headers(); extracted form to client component so page can be server component |
| Shared MemberTable with showActions prop | Phase 2 | Avoids code duplication between admin and organizer member pages; single source of truth |
| Placeholder columns for Referred By and Events | Phase 2 | referred_by field added in Phase 3; event count requires attendances join from Phase 5 |
| Combined demote + deactivate in deactivateMember | Phase 2 | Prevents rejected-but-still-organizer state by resetting role to member in same update |
| Reuse membership_code as referral code | Phase 3 | No separate referral code or table needed -- membership_code (RSN-XXXXXXXX) already unique per member |
| referral_code omitted when empty | Phase 3 | Pass undefined instead of empty string so trigger avoids unnecessary membership_code lookup |
| Inline Suspense in register page | Phase 3 | Simplest approach for single page needing useSearchParams -- no parent layout change needed |

### Research Notes

- SumUp has no first-party Node.js SDK -- use raw fetch() to Checkout API
- Only 2 new npm packages needed: `@react-email/components` and `nanoid`
- SumUp API endpoints need verification against live docs before Phase 6
- Supabase Storage already partially configured (image remote patterns in next.config.ts)
- Supabase Auth email customization approach (Dashboard vs. full Resend replacement) needs investigation in Phase 4

### Blockers

None currently.

### Todos

- [x] Plan Phase 1 via `/gsd:plan-phase 1`
- [x] Execute Plan 01-02 (English migration)
- [x] Execute Plan 01-03 (Bug fixes)
- [x] Plan Phase 2
- [x] Execute Phase 2 (02-01, 02-02, 02-03 all complete)
- [x] Plan Phase 3 via `/gsd:plan-phase 3`
- [x] Execute Plan 03-01 (Referral Data Foundation)

## Session Continuity

**Last session:** 2026-02-24T23:16:42Z
**Stopped at:** Completed 03-01-PLAN.md
**What happened:** Executed Plan 03-01: Created migration adding referred_by UUID FK column to profiles. Updated handle_new_user trigger with referral logic -- reads referral_code from auth metadata, resolves referrer by membership_code + approved status, sets status=approved for valid referrals or pending otherwise. Updated registration page to capture ?ref URL parameter via useSearchParams and pass referral_code through signUp metadata. Wrapped in Suspense boundary. Column default for status remains 'approved' per user decision. Build passes. 2 tasks, 2 commits.
**Next step:** Execute Plan 03-02

---
*State initialized: 2026-02-24*
*Last updated: 2026-02-24T23:16:42Z*
