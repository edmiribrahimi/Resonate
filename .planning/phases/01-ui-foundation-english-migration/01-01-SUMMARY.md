---
phase: 01-ui-foundation-english-migration
plan: 01
subsystem: ui-foundation
tags: [font, branding, homepage, logo]
dependency_graph:
  requires: []
  provides: [orbitron-font, logo-asset, homepage-redesign]
  affects: [layout, globals-css, homepage]
tech_stack:
  added: []
  patterns: [next-font-google-css-variable, server-component-supabase-query]
key_files:
  created:
    - public/images/logo-white.png
  modified:
    - src/app/layout.tsx
    - src/app/globals.css
    - src/app/page.tsx
decisions:
  - Orbitron used for ALL text site-wide (geometric display font fits electronic music aesthetic with short-form content)
  - Homepage event preview uses try/catch for graceful Supabase query fallback
  - Logo displayed at 320x90 (3.54:1 aspect ratio from native 3232x914)
metrics:
  duration: 89s
  completed: 2026-02-24T20:17:44Z
---

# Phase 1 Plan 01: Brand Foundation Summary

JWT-free brand identity layer: Orbitron font via next/font/google CSS variable, white logo asset, and async homepage with Supabase event preview query.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Orbitron font setup + root layout update | 775e00f | src/app/layout.tsx, src/app/globals.css |
| 2 | Logo asset + homepage redesign | 17446d4 | public/images/logo-white.png, src/app/page.tsx |

## What Was Built

### Task 1: Orbitron Font Setup + Root Layout Update
- Imported Orbitron from `next/font/google` with CSS variable `--font-orbitron`
- Applied `orbitron.variable` className to the `<html>` element
- Changed `<html lang="it">` to `<html lang="en">`
- Updated body `font-family` in globals.css to `var(--font-orbitron), system-ui, -apple-system, sans-serif`
- manifest.json already had English description -- no change needed

### Task 2: Logo Asset + Homepage Redesign
- Copied white logo (transparent background) from user's local files to `public/images/logo-white.png`
- Replaced text heading with `next/image` component displaying the logo at 320x90px
- Added "motion music hub" tagline (uppercase, tracking-widest, muted text)
- Added async Supabase query for next upcoming published event with graceful error handling
- Event preview displays as a bordered card with event title + en-US formatted date
- Two English CTA buttons: "Discover Events" (/events) and "Join" (/register)
- Preserved MobileNav component at bottom

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx next build` completes successfully (0 errors)
- Orbitron CSS variable `--font-orbitron` set on `<html>` element via `orbitron.variable`
- `<html lang="en">` in layout.tsx
- Homepage displays logo image via `next/image`, not text heading
- "motion music hub" tagline rendered below logo
- No Italian text on homepage (CTAs are "Discover Events" and "Join")
- Homepage is now dynamic (`f`) due to server-side Supabase query -- correct behavior

## Decisions Made

1. **Orbitron for all text site-wide** -- Per CONTEXT.md, Orbitron is a geometric futuristic display font matching the electronic music aesthetic. The platform has short-form content (labels, listings, cards) where Orbitron remains readable. A secondary body font can be introduced later if readability issues emerge.
2. **Graceful event query fallback** -- Wrapped Supabase query in try/catch so the homepage renders cleanly even with no database connection or no upcoming events.
3. **Logo display size** -- Native logo is 3232x914 (3.54:1 ratio). Displayed at 320x90 for mobile-friendly sizing with `priority` loading.

## Notes for Next Plans

- CTA buttons link to `/events` and `/register` which do not exist yet -- these English routes will be created in Plan 02 (route migration). Temporary 404 is expected and acceptable.
- MobileNav component still contains Italian text -- will be translated in Plan 02.

## Self-Check: PASSED

All created/modified files verified on disk. Both task commits (775e00f, 17446d4) verified in git log.
