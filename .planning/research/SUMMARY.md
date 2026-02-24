# Research Summary: Resonate Milestone Additions

**Domain:** Private music events community platform -- payment, referral, RBAC, media, email features
**Researched:** 2026-02-24
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

Resonate's existing stack (Next.js 16, Supabase, Tailwind CSS v4, PWA) is well-suited for all planned features. The milestone additions require remarkably few new dependencies -- only two new npm packages (`@react-email/components` for branded email templates and `nanoid` for referral code generation). Everything else builds on existing infrastructure.

The most complex integration is SumUp payments, which requires server-side REST API calls, a webhook handler for payment confirmation, and new database tables for ticket tiers and orders. SumUp does not provide a first-party Node.js SDK, so the integration uses raw `fetch()` calls to their Checkout API. This is straightforward but requires careful attention to the payment flow (checkout creation, redirect, webhook verification, order status updates).

Role-based access control replaces the existing `is_admin` boolean with a proper `role` enum column on `profiles`, leveraging Supabase's Row Level Security policies that are already in use throughout the schema. The referral and approval systems are primarily database schema and application logic features, not library-heavy additions.

Media uploads use Supabase Storage, which is already partially configured (image remote patterns in `next.config.ts`). The main work is creating storage buckets, updating RLS policies to allow member uploads (currently admin-only), and building the upload UI.

## Key Findings

**Stack:** Two new npm packages total (`@react-email/components`, `nanoid`). SumUp via REST API. Everything else uses existing Supabase and Next.js capabilities.
**Architecture:** All features follow the existing pattern -- Supabase for data/auth/storage, Next.js API routes for server logic, RLS for authorization.
**Critical pitfall:** SumUp's API documentation and webhook behavior must be verified against live docs before implementation. Training data may be stale on exact endpoints.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Schema & RBAC Foundation** - Migrate `is_admin` to `role` enum, add `status`, `referral_code`, `referred_by` columns, update all RLS policies
   - Addresses: Role-based access, approval flow database layer
   - Avoids: Building features on top of the old `is_admin` field that will need migration later

2. **Referral & Approval System** - Referral code generation, registration flow changes, admin approval UI
   - Addresses: Referral links, auto-approval for referred members, pending state
   - Avoids: Payment integration before the user lifecycle is solid

3. **Branded Emails & Font** - React Email templates, Resend transactional emails, Orbitron font integration
   - Addresses: Confirmation emails, approval notifications, brand consistency
   - Avoids: Having unbrandable emails when the payment receipts phase arrives

4. **Media Uploads** - Storage bucket setup, upload UI, gallery integration
   - Addresses: Event photos/videos, member-uploaded content
   - Avoids: Coupling media uploads with payment flow complexity

5. **SumUp Payments & Ticketing** - Ticket tiers, checkout flow, webhook handler, order management
   - Addresses: Ticket purchases, payment processing, sales visibility
   - Avoids: Payment integration before roles and approval flow are stable

**Phase ordering rationale:**
- RBAC must come first because every other feature depends on knowing who can do what
- Referral/approval second because it defines the member lifecycle that payments and media depend on
- Emails third because payment receipts and approval notifications need branded templates
- Media before payments because it is simpler and provides visible community value early
- Payments last because it is the most complex integration and depends on all prior systems (roles, approved members, email templates for receipts)

**Research flags for phases:**
- Phase 5 (SumUp Payments): Likely needs deeper research -- verify SumUp API endpoints, webhook format, and OAuth flow against live documentation
- Phase 1 (Schema): Standard patterns, unlikely to need research
- Phase 3 (Emails): May need research on customizing Supabase Auth email templates vs. fully replacing them

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Two new packages are well-known. SumUp API details need live verification. |
| Features | HIGH | Feature requirements are clearly defined in PROJECT.md. |
| Architecture | HIGH | All features follow established patterns already in the codebase. |
| Pitfalls | MEDIUM | SumUp-specific pitfalls based on training data, not live testing. |

## Gaps to Address

- SumUp API: Exact endpoint URLs, authentication flow, webhook format need verification against live docs
- SumUp account setup: Merchant account, API key provisioning, test/sandbox environment availability
- Supabase Storage plan limits: Verify storage quota and bandwidth limits on current Supabase plan
- React Email exact version: Verify latest stable version at installation time
- Supabase Auth email customization: Test whether customizing templates in Dashboard is sufficient or if full replacement via Resend is needed
- Video upload size limits: Determine practical limits for mobile uploads on the Supabase plan in use

---

*Research summary: 2026-02-24*
