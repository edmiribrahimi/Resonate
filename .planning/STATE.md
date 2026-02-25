# State: Resonate

## Project Reference

**Core Value:** Members can discover events, confirm attendance, and buy tickets within a trusted, curated community -- the gating mechanism (referral + approval) is what makes the community valuable.

**Stack:** Next.js 16 + Supabase + Tailwind CSS v4 + PWA (Vercel hosting)

**Current Focus:** Phase 7 complete -- Event Media. All 3/3 plans done. All 7 phases complete!

## Current Position

**Phase:** 7 of 7 -- Event Media
**Plan:** 3 of 3
**Status:** Complete

```
[Phase Progress]  ████████████████████  3/3 plans in phase 7

[Overall]         ████████████████████  7/7 phases complete
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans completed | 22 |
| Plans failed | 0 |
| Requirements done | 42/45 |
| Phases complete | 7/7 |

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 01-01 (Brand Foundation) | 89s | 2 | 4 |
| 01-02 (English Migration) | 340s | 2 | 14 |
| 01-03 (Bug Fixes) | 106s | 2 | 2 |
| 02-01 (Schema Migration) | 203s | 2 | 5 |
| 02-02 (Middleware RBAC) | 255s | 2 | 12 |
| 02-03 (Admin Members) | 161s | 2 | 4 |
| 03-01 (Referral Data Foundation) | 128s | 2 | 4 |
| 03-02 (Referral Link Display) | 95s | 1 | 3 |
| 03-03 (Approval Queue & Admin UI) | 220s | 2 | 4 |
| 04-01 (Email Infrastructure) | 115s | 2 | 6 |
| 04-02 (Approval/Rejection Emails) | 107s | 2 | 3 |
| 05-01 (Event Data Foundation) | 148s | 2 | 5 |
| 05-02 (Organizer/Admin Event UI) | 192s | 2 | 7 |
| 05-03 (Public Event Pages) | 140s | 2 | 3 |
| 06-01 (Ticketing Data Foundation) | 102s | 2 | 5 |
| 06-02 (Ticket Tier Management) | 172s | 2 | 5 |
| 06-03 (Purchase Flow & Webhook) | 304s | 2 | 7 |
| 06-04 (Sales Dashboard & My Tickets) | 176s | 2 | 6 |
| 07-01 (Media Data Foundation) | 60s | 2 | 3 |
| 07-02 (Upload UI & Event Gallery) | 153s | 2 | 5 |
| 07-03 (Moderation & Profile Media) | 200s | 2 | 6 |

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
| Shared CopyReferralLink component | Phase 3 | Extracted to src/components/membership/ for reuse on dashboard and membership card pages |
| Dual guard on membership card referral link | Phase 3 | Check profile.status === approved AND membershipCode !== RSN-UNKNOWN for defense in depth |
| Service-role client for approve/reject | Phase 3 | Organizers lack RLS write on profiles; service-role bypasses for approve/reject operations |
| callerRole prop on MemberTable | Phase 3 | Single component renders different action sets for master vs organizer, avoids duplication |
| Client-side referral count computation | Phase 3 | referralCounts Map built from loaded data; no extra DB query needed |
| NEXT_PUBLIC_APP_URL for email logo URL | Phase 4 | Dynamic resolution with resonate.app fallback; works in dev and production |
| Outlook VML fallback in static HTML template | Phase 4 | Rounded button renders correctly in Outlook's Word-based HTML engine |
| Dual template format (React + static HTML) | Phase 4 | React Email component for programmatic use; static HTML for Supabase Dashboard paste |
| Fire-and-forget email delivery | Phase 4 | DB update is the critical operation; email is best-effort notification that never blocks admin actions |
| Sequential bulk email via IIFE | Phase 4 | For-of loop respects Resend rate limits; IIFE pattern runs in background without blocking response |
| Pre-fetch member data before status update | Phase 4 | Query email/name before update to ensure data availability regardless of timing |
| ON DELETE SET NULL for created_by | Phase 5 | Events should be preserved even if the creating user is deleted; orphaned events managed by master |
| Slug uniqueness via timestamp base36 suffix | Phase 5 | Low-volume event creation makes collision rare; base36 timestamp is short and unique enough |
| Validation: title 3-100, description 10-5000 | Phase 5 | Balances minimum quality (no empty entries) with practical limits for event content |
| Separate EventTabs client component | Phase 5 | Tab interactivity requires "use client" but data fetching stays in server component for performance |
| Capacity as number on list, spots left on detail | Phase 5 | List view shows raw capacity for quick scanning; detail page shows computed spots left for actionability |
| Lock emoji for secret location in list view | Phase 5 | Distinct from pin emoji for regular locations; communicates exclusivity at a glance |
| Shared EventList client component | Phase 5 | Both organizer and admin pages need identical interactive list behavior; single component avoids duplication |
| Bound server action for edit page | Phase 5 | Closure over eventId in server component is cleaner than hidden form fields; leverages Next.js server action closures |
| window.confirm() for delete confirmation | Phase 5 | Simple, native, accessible; no need for custom modal for a single confirmation prompt |
| SELECT FOR UPDATE row-level locking in reserve_ticket | Phase 6 | Atomic oversell prevention -- DB-level locking is more reliable than application-layer mutex |
| Extended sendEmail with optional attachments via spread | Phase 6 | Backward compatible -- existing callers unaffected; enables CID inline images for QR codes |
| Separate AddTierForm and TierCard client components | Phase 6 | Clean server/client boundary; page.tsx stays server component for data fetching |
| Delete button hidden (not disabled) when tier has sales | Phase 6 | Cleaner UX -- no confusing disabled button; action simply not available |
| Lazy Resend initialization in email.ts | Phase 6 | Prevents build-time errors when env vars unavailable during page data collection |
| Co-located TierSelection client component | Phase 6 | Interactive tier selection with server action call; co-located with event detail page |
| QR code transparent background with light foreground | Phase 6 | Dark theme consistency; QR renders cleanly on dark card backgrounds |
| basePath prop on EventList scoped to Sales link only | Phase 6 | Edit and Manage Tickets routes only exist under /organizer; applying basePath to all links would create dead links in admin context |
| Upcoming tickets sorted before past with reduced opacity | Phase 6 | Visual distinction between actionable upcoming events and historical past tickets on member dashboard |
| Ticket ownership as attendance gate | Phase 7 | Query tickets table for (event_id, user_id) match rather than separate attendance/check-in table |
| Separate event-media bucket from event-images | Phase 7 | Member uploads (100MB limit for videos) separate from organizer cover images |
| Granular RLS replacing broad event_media policies | Phase 7 | 7 fine-grained policies for select/insert/delete/update by role instead of 2 overly-broad ones |
| Native dialog element for lightbox | Phase 7 | Built-in Escape key, backdrop click, focus trapping, screen reader accessibility without libraries |
| Simple upload status states over percentage progress | Phase 7 | Supabase JS .upload() lacks progress callbacks; pending/uploading/done/error is sufficient |
| Co-located MediaGallerySection in event slug dir | Phase 7 | Tightly coupled to event detail page data flow and server/client boundary |
| basePath pattern for Media link follows Sales convention | Phase 7 | Both organizer and admin need media review routing; basePath handles context |
| Dedicated MediaReviewGrid over generic MediaGrid | Phase 7 | Plan 02 not yet executed; purpose-built component with approve/reject actions |
| Inline lightbox in MyMediaSection | Phase 7 | Simple overlay for dashboard media viewing; no external dependency needed |

### Research Notes

- SumUp has no first-party Node.js SDK -- use raw fetch() to Checkout API
- Only 2 new npm packages needed: `@react-email/components` and `nanoid`
- SumUp API endpoints need verification against live docs before Phase 6
- Supabase Storage already partially configured (image remote patterns in next.config.ts)
- Supabase Auth email customization: Dashboard HTML template editor for registration confirmation; Resend from server actions for approval/rejection (resolved in Phase 4)

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
- [x] Execute Plan 03-02 (Referral Link Display)
- [x] Execute Plan 03-03 (Approval Queue & Admin UI)
- [x] Execute Plan 04-01 (Email Infrastructure & Registration Confirmation)
- [x] Execute Plan 04-02 (Approval/Rejection Email Templates)
- [x] Execute Plan 05-01 (Event Data Foundation)
- [x] Execute Plan 05-03 (Public Event Pages)
- [x] Execute Plan 05-02 (Organizer/Admin Event Management UI)
- [x] Execute Plan 06-01 (Ticketing Data Foundation)
- [x] Execute Plan 06-02 (Ticket Tier Management)
- [x] Execute Plan 06-03 (Purchase Flow & Webhook)
- [x] Execute Plan 06-04 (Sales Dashboard & My Tickets)
- [x] Execute Plan 07-01 (Media Data Foundation)
- [x] Execute Plan 07-02 (Upload UI & Event Gallery)

## Session Continuity

**Last session:** 2026-02-25T13:55:00Z
**Stopped at:** Completed 07-02-PLAN.md
**What happened:** Executed Plan 07-02: Upload UI and event gallery -- MediaGrid, Lightbox, MediaUpload shared components with drag-drop upload, file validation, native dialog lightbox. Gallery section on event detail page with approved media query and upload eligibility. 2 tasks, 2 commits.
**Next step:** Execute Plan 07-03 (Moderation & Profile Media)

---
*State initialized: 2026-02-24*
*Last updated: 2026-02-25T13:55:00Z*
