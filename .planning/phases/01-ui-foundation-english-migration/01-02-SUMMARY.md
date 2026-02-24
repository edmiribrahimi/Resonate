---
phase: 01-ui-foundation-english-migration
plan: 02
subsystem: english-migration
tags: [translation, routing, redirects, i18n, middleware]
dependency_graph:
  requires: [orbitron-font, logo-asset, homepage-redesign]
  provides: [english-routes, english-ui-text, italian-redirects, english-middleware]
  affects: [all-pages, navigation, middleware, next-config]
tech_stack:
  added: []
  patterns: [next-config-redirects, git-mv-route-rename]
key_files:
  created: []
  modified:
    - next.config.ts
    - src/lib/supabase/middleware.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/register/page.tsx
    - src/app/(public)/events/page.tsx
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/gallery/page.tsx
    - src/app/(public)/newsletter/page.tsx
    - src/app/(members)/dashboard/page.tsx
    - src/app/(members)/membership-card/page.tsx
    - src/app/(members)/attendance/page.tsx
    - src/app/(admin)/admin/scanner/page.tsx
    - src/components/layout/MobileNav.tsx
    - src/components/membership/MembershipCardView.tsx
decisions:
  - Renamed Italian component functions to English equivalents (EventiPage->EventsPage, PresenzePage->AttendancePage, etc.) for codebase consistency
key_decisions:
  - Component function names renamed to English for consistency
metrics:
  duration: 340s
  completed: 2026-02-24T20:25:51Z
---

# Phase 1 Plan 02: English Migration Summary

Full Italian-to-English migration: 4 route directories renamed via git mv, permanent redirects configured in next.config.ts, 12 page/component files translated with en-US date formatting, and middleware updated for /attendance route protection.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Rename route directories + configure redirects + update middleware | 24b511e | next.config.ts, src/lib/supabase/middleware.ts, 5 renamed dirs |
| 2 | Translate all Italian text to English in every page and component | f1b893d | 12 page/component files |

## What Was Built

### Task 1: Rename Route Directories + Configure Redirects + Update Middleware
- Renamed 4 route directories using `git mv` to preserve history:
  - `src/app/(public)/eventi/` -> `src/app/(public)/events/`
  - `src/app/(auth)/registrati/` -> `src/app/(auth)/register/`
  - `src/app/(members)/presenze/` -> `src/app/(members)/attendance/`
  - `src/app/(public)/galleria/` -> `src/app/(public)/gallery/`
- Added `async redirects()` function to `next.config.ts` with 4 permanent redirects:
  - `/eventi/:path*` -> `/events/:path*`
  - `/registrati` -> `/register`
  - `/presenze` -> `/attendance`
  - `/galleria` -> `/gallery`
- Updated middleware `memberRoutes` array: `/presenze` -> `/attendance`

### Task 2: Translate All Italian Text to English
- **Login page:** "Accedi" -> "Sign In", error messages, link text, href `/registrati` -> `/register`
- **Register page:** "Diventa membro" -> "Become a Member", "Controlla la tua email" -> "Check your email", placeholder "Nome completo" -> "Full name", removed Italian password hint
- **Events listing:** "Eventi" -> "Events", all `it-IT` locale -> `en-US`, hrefs `/eventi/` -> `/events/`
- **Event detail:** Back link `/eventi` -> `/events`, location text translated, RSVP button "Ci saro" -> "I'm going", registration CTA translated, hrefs `/registrati` -> `/register`
- **Gallery:** "Galleria" -> "Gallery", description translated
- **Newsletter:** "Iscritto!" -> "Subscribed!", "Iscriviti" -> "Subscribe", error message, placeholder translated
- **Dashboard:** "Ciao," -> "Hey,", "Membro" -> "Member", all Italian labels translated, hrefs `/presenze` -> `/attendance`, `/eventi` -> `/events`
- **Membership card:** "Come usare la card" -> "How to use your card", all instruction steps translated, wallet button translated
- **Attendance:** "Le tue presenze" -> "Your Attendance", singular/plural "evento/eventi" -> "event/events", empty state translated, `it-IT` -> `en-US`
- **Scanner:** "Scanner QR" -> "QR Scanner", status messages translated
- **MobileNav:** "Eventi" -> "Events", "Galleria" -> "Gallery", "Area Membri" -> "Members", hrefs updated
- **MembershipCardView:** "Membro dal" -> "Member since", `it-IT` -> `en-US`

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx next build` completes successfully (0 errors, 16 routes)
- `grep -r "it-IT" src/` returns zero matches (PASS)
- `grep href="/eventi" src/` returns zero matches (PASS)
- `grep href="/registrati" src/` returns zero matches (PASS)
- `grep href="/presenze" src/` returns zero matches (PASS)
- `grep href="/galleria" src/` returns zero matches (PASS)
- All 4 old Italian directories confirmed deleted
- All 4 new English directories confirmed present with correct contents

## Decisions Made

1. **Component function names renamed to English** -- Renamed `EventiPage` -> `EventsPage`, `PresenzePage` -> `AttendancePage`, `GalleriaPage` -> `GalleryPage`, `RegistratiPage` -> `RegisterPage` for codebase consistency, even though Next.js only cares about the default export.

## Notes for Next Plans

- Two empty admin directories remain with Italian names (`src/app/(admin)/admin/eventi/` and `src/app/(admin)/admin/membri/`) -- these are empty placeholder directories and will be addressed when admin features are built.
- The `package.json` and `package-lock.json` have unrelated modifications (not staged or committed by this plan).

## Self-Check: PASSED
