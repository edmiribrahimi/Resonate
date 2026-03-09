---
phase: 22-analytics-infrastructure
plan: 01
subsystem: analytics
tags: [posthog, recharts, analytics, instrumentation]
dependency_graph:
  requires: []
  provides: [posthog-client-init, posthog-server-singleton, user-identification, recharts-dependency]
  affects: [dashboard]
tech_stack:
  added: [posthog-js, posthog-node, recharts]
  patterns: [instrumentation-client, singleton-server-client, invisible-identify-component]
key_files:
  created:
    - src/instrumentation-client.ts
    - src/lib/posthog/server.ts
    - src/components/analytics/PostHogIdentify.tsx
  modified:
    - package.json
    - package-lock.json
    - src/app/(members)/dashboard/page.tsx
decisions:
  - PostHog init guarded with typeof window check + env var presence (no crash without config)
  - Server singleton uses no-op object when NEXT_PUBLIC_POSTHOG_KEY is missing (safe local dev)
  - PostHogIdentify placed in dashboard only (PostHog persists identity across pages via localStorage)
  - Role defaults to "member" when x-user-role header is null
metrics:
  duration_seconds: 136
  completed: "2026-03-09T20:16:21Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 22 Plan 01: PostHog + Recharts Infrastructure Summary

PostHog EU client/server init with automatic SPA pageview tracking, server-side capture singleton with immediate flush for serverless, and user identification on dashboard load. Recharts installed for subsequent analytics dashboard plans.

## What Was Built

### Task 1: Dependencies + PostHog Client/Server Init
**Commit:** `62c3931`

- Installed `posthog-js`, `posthog-node`, and `recharts` as dependencies
- Created `src/instrumentation-client.ts` using Next.js 16 instrumentation-client convention:
  - Uses `defaults: "2025-11-30"` for modern PostHog behaviors
  - `capture_pageview: "history_change"` for automatic SPA navigation tracking
  - `persistence: "localStorage+cookie"` for identity persistence
  - Guarded with `typeof window` and env var check
- Created `src/lib/posthog/server.ts` with singleton pattern:
  - `flushAt: 1` and `flushInterval: 0` for immediate flush (critical for serverless)
  - Returns no-op object when env vars are missing (safe for local dev without PostHog)
  - Exports `getPostHogServer()` function

### Task 2: PostHogIdentify Component + Dashboard Wiring
**Commit:** `5b4f0c2`

- Created `src/components/analytics/PostHogIdentify.tsx`:
  - Client component (`"use client"`) that renders null
  - Calls `posthog.identify(userId, { email, role })` in useEffect
  - Dependencies: `[userId, email, role]` to re-identify on changes
- Modified `src/app/(members)/dashboard/page.tsx`:
  - Added PostHogIdentify import and render with user.id, email, and role
  - Placed before visual content (renders null, position irrelevant)

## Verification Results

1. `npm run build` -- PASSED (zero errors)
2. `instrumentation-client.ts` contains `posthog.init` with EU host env var -- PASSED
3. `server.ts` exports `getPostHogServer` with `flushAt: 1` -- PASSED
4. `PostHogIdentify.tsx` has `"use client"` and `posthog.identify` -- PASSED
5. Dashboard page imports and renders PostHogIdentify -- PASSED
6. `recharts` in package.json dependencies -- PASSED

## Deviations from Plan

None -- plan executed exactly as written.

## Environment Setup Required

PostHog tracking activates when these env vars are set on Vercel:
- `NEXT_PUBLIC_POSTHOG_KEY` -- from PostHog EU Cloud Project Settings
- `NEXT_PUBLIC_POSTHOG_HOST` -- set to `https://eu.i.posthog.com`

## Self-Check: PASSED

- All 3 created files verified on disk
- Commit 62c3931 verified in git log
- Commit 5b4f0c2 verified in git log
