# Codebase Concerns

**Analysis Date:** 2026-02-24

## Tech Debt

**Incomplete Data Integration:**
- Issue: Multiple critical pages contain TODO comments with hardcoded mock data instead of actual Supabase queries
- Files:
  - `src/app/(public)/eventi/[slug]/page.tsx` (lines 4-5, 14-29, 28-29)
  - `src/app/(public)/eventi/page.tsx` (line 4, mock events throughout)
  - `src/app/(public)/galleria/page.tsx` (line 3)
  - `src/app/(members)/presenze/page.tsx` (line 13)
  - `src/app/(members)/membership-card/page.tsx` (line 16)
  - `src/app/api/membership/verify/route.ts` (lines 14, 27)
- Impact: Event details, attendances, gallery content, and membership verification will not work with real data. Users cannot view actual event information or verify memberships.
- Fix approach: Implement proper Supabase queries for each page. Create server components that fetch from events, attendance, and profiles tables with proper error handling.

**Hardcoded Membership Code:**
- Issue: Membership card page returns hardcoded demo code "RSN-DEMO1234" instead of fetching from database
- Files: `src/app/(members)/membership-card/page.tsx` (line 17)
- Impact: All members see the same QR code instead of their personal membership code. QR scanning will not distinguish between users.
- Fix approach: Query profiles table for logged-in user's membership_code before rendering component.

## Known Bugs

**Potential Unhandled Query Failures:**
- Symptoms: Silent failures if database query returns no results
- Files: `src/app/api/membership/verify/route.ts` (line 20, .single() call)
- Trigger: When a membership code doesn't exist in database or duplicate codes exist
- Current behavior: `.single()` throws if 0 or >1 rows returned, but error is not explicitly caught
- Workaround: Need explicit error handling around database queries

**Newsletter Error Message Suppression:**
- Symptoms: Generic error shown without details of what failed
- Files: `src/app/(public)/newsletter/page.tsx` (lines 24-27)
- Trigger: Any error from Resend API or network issue
- Current behavior: Catches all errors with generic message "Qualcosa è andato storto"
- Impact: Users and developers cannot debug newsletter subscription issues

## Security Considerations

**Admin Route Protection Missing Role Check:**
- Risk: Any authenticated user can access admin routes by simply being logged in
- Files: `src/lib/supabase/middleware.ts` (lines 34-49)
- Current mitigation: Only checks if user exists, no role/permission verification
- Recommendations:
  - Add role field to profiles table (e.g., 'admin', 'member', 'public')
  - Check user role in middleware before allowing access to /admin routes
  - Implement RLS (Row-Level Security) policies in Supabase to prevent database access

**Open Redirect Vulnerability in Auth Callback:**
- Risk: `next` parameter in auth callback can redirect to arbitrary URLs
- Files: `src/app/api/auth/callback/route.ts` (lines 7, 13)
- Current mitigation: None
- Recommendations:
  - Validate redirect URL to ensure it's relative (starts with /) and not a full URL
  - Maintain whitelist of allowed redirect paths
  - Use URL validation before passing to NextResponse.redirect

**Membership Code Predictability:**
- Risk: Membership codes generated using simple random selection from fixed charset
- Files: `src/utils/qr.ts` (lines 15-22)
- Current mitigation: Uses 8-character random code from 31-character set (worst case ~36 bits entropy)
- Recommendations:
  - Use cryptographic random generation (crypto.getRandomValues)
  - Consider larger code length or larger character set for higher entropy
  - Add rate limiting to membership verification endpoint to prevent brute force attempts

**Missing RESEND_AUDIENCE_ID Validation:**
- Risk: Newsletter subscription fails silently if environment variable not configured
- Files: `src/app/api/newsletter/route.ts` (line 19)
- Current mitigation: Uses non-null assertion (!) without checking if value exists
- Recommendations:
  - Add explicit check for RESEND_AUDIENCE_ID before using
  - Return 503 or 500 error with clear message if not configured
  - Add environment validation at startup/middleware level

**QR Code URL Generation Using Unvalidated Environment Variable:**
- Risk: If NEXT_PUBLIC_APP_URL not set or incorrect, generated QR codes won't work
- Files: `src/utils/qr.ts` (line 4)
- Current mitigation: None
- Recommendations:
  - Validate NEXT_PUBLIC_APP_URL format at application startup
  - Handle gracefully if variable is missing
  - Consider making this a server-side function with better error handling

## Performance Bottlenecks

**No Caching Strategy for Event Data:**
- Problem: Each page load will fetch fresh data from Supabase without any caching
- Files: Event pages will be affected: `src/app/(public)/eventi/page.tsx`, `src/app/(public)/eventi/[slug]/page.tsx`
- Cause: Supabase client queries directly without using Next.js cache mechanisms
- Improvement path: Use Next.js fetch with revalidate options or Supabase's realtime subscriptions for live data with caching for static content

**Missing Database Indexes:**
- Problem: Queries on membership_code, event_id, user_id without known index structure
- Files: `src/app/api/membership/verify/route.ts` (line 18-19)
- Cause: No visible schema definition with index specifications
- Improvement path: Ensure database indexes on frequently queried columns (membership_code in profiles, event_id in attendance/rsvp, user_id)

**QR Code Generation on Every Render:**
- Problem: QR code regenerated in useEffect on every component mount, even if code unchanged
- Files: `src/components/membership/MembershipCardView.tsx` (lines 19-21)
- Cause: useEffect dependency only has membershipCode, but component may re-mount
- Improvement path: Consider memoizing QR generation or moving to server component

## Fragile Areas

**Authentication State Management:**
- Files: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- Why fragile: Session state managed across client and server with cookie synchronization. Middleware relies on proper cookie handling which can fail in various scenarios (SSR cache issues, concurrent requests).
- Safe modification: When changing auth flow, test thoroughly with: concurrent requests, server component re-renders, middleware edge cases
- Test coverage: No tests exist for auth flow

**Page Protection Relying on Redirects:**
- Files: `src/app/(members)/dashboard/page.tsx`, `src/app/(members)/presenze/page.tsx`, `src/app/(members)/membership-card/page.tsx`
- Why fragile: Each page independently calls getUser() and redirects. If middleware doesn't work, pages can still render unauthorized content momentarily.
- Safe modification: Consider moving auth check to layout file for group routes, or middleware wrapper
- Test coverage: No tests for protected routes

**Database Query with .single() Without Explicit Error Handling:**
- Files: `src/app/api/membership/verify/route.ts` (line 20)
- Why fragile: .single() throws on 0 or multiple results but throwing is not explicitly caught or handled
- Safe modification: Wrap in try-catch or use .eq().maybeSingle() and explicitly check for null
- Test coverage: No tests for edge cases (non-existent code, duplicate codes)

**Dynamic Supabase URL in QR Code:**
- Files: `src/utils/qr.ts` (line 4)
- Why fragile: Uses environment variable that may not be set or may be wrong. QR codes become invalid if URL changes.
- Safe modification: Ensure NEXT_PUBLIC_APP_URL is set in all environments. Consider verifying URL validity.
- Test coverage: No tests for URL generation

## Scaling Limits

**No Query Result Pagination:**
- Current capacity: Will load all events/attendances into memory
- Limit: Performance degrades when tables grow beyond 1000s of rows
- Scaling path: Implement pagination or cursor-based pagination in event lists and attendance history pages

**Real-time Subscriptions Not Implemented:**
- Current capacity: Pages will only show data as of page load time
- Limit: Member attendance won't update in real-time, admin scanner won't see new data without refresh
- Scaling path: Replace fetch-based approach with Supabase realtime subscriptions for dynamic data like attendance

**No Rate Limiting on Public APIs:**
- Current capacity: Unlimited requests to /api/membership/verify and /api/newsletter endpoints
- Limit: Vulnerable to spam/DDoS attacks
- Scaling path: Implement rate limiting middleware (IP-based or user-based) for public endpoints

## Dependencies at Risk

**html5-qrcode Library:**
- Risk: Dependency for browser-based QR scanning, adds significant bundle size
- Current version: ^2.3.8 (installed via `src/app/(admin)/admin/scanner/page.tsx`)
- Impact: If library is abandoned or has security issues, QR scanning feature breaks
- Migration plan: Consider barcode-worker or zxing-wasm as alternatives if needed

**Next.js PWA Configuration:**
- Risk: @ducanh2912/next-pwa is third-party PWA wrapper, not official Next.js feature
- Current version: ^10.2.9
- Impact: If maintainer stops supporting, PWA features may break with Next.js updates
- Migration plan: Consider migrating to native Next.js PWA support or workbox configuration

## Missing Critical Features

**No Email Verification Before Access:**
- Problem: Users can sign up without verifying email. Supabase sends confirmation email but unverified users can log in.
- Blocks: Can't trust email addresses for event notifications. Users may use wrong emails by mistake.
- Recommended fix: Check email_confirmed in middleware before granting access to member routes

**No Password Reset Flow:**
- Problem: No mechanism for users to reset forgotten passwords
- Blocks: Locked-out users cannot regain access
- Recommended fix: Add /forgot-password page and integrate with Supabase password reset emails

**No User Profile Management:**
- Problem: Users cannot edit their name, email, or other profile information after signup
- Blocks: Users stuck with registration data; no profile updates without admin intervention
- Recommended fix: Create profile edit page with safe update patterns

**No Event RSVP Persistence:**
- Problem: Event detail page has TODO for RSVP status checking but no actual RSVP implementation
- Blocks: Cannot track attendance commitments or capacity planning
- Recommended fix: Create RSVP table and integrate with event detail page

**No Admin Event Management UI:**
- Problem: No way to create/edit events through UI; scanner admin page exists but no event admin
- Blocks: Events must be created via direct database manipulation
- Recommended fix: Build comprehensive event management dashboard

## Test Coverage Gaps

**No Unit or Integration Tests:**
- What's not tested: All business logic - auth flows, data queries, API endpoints, utility functions
- Files: Entire codebase lacks test files
- Risk: Changes break functionality without immediate feedback. Regressions in auth or membership verification can ship undetected.
- Priority: High - recommend starting with critical paths: auth callback flow, membership verification API, RSVP logic

**No E2E Tests:**
- What's not tested: Complete user journeys (signup → verify email → view events → RSVP → scan QR)
- Files: No E2E test framework configured
- Risk: Workflow-breaking bugs only caught by manual testing
- Priority: High - critical for membership verification and scanner flows

**No API Integration Tests:**
- What's not tested: Newsletter subscription endpoint error cases, membership verification with invalid codes
- Files: `src/app/api/*` endpoints lack test coverage
- Risk: API changes can break integrations with no safety net
- Priority: Medium - endpoints are critical but have fallback error messages

---

*Concerns audit: 2026-02-24*
