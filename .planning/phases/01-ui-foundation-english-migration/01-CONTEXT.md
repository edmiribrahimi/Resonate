# Phase 1: UI Foundation & English Migration - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Translate the entire platform from Italian to English (all text and URL routes), apply Resonate brand identity (Orbitron font, logo, dark theme), and fix UI bugs (event page member prompt, password strength). No new capabilities — this is polish and migration.

</domain>

<decisions>
## Implementation Decisions

### Homepage & Logo
- Dark background across the entire site — nightlife/club aesthetic, not just homepage
- White logo variant ("re:sonate") on dark background
- "motion music hub" tagline displayed below the logo
- Below logo + tagline: minimal next event preview showing event name + date only, tap for details
- Homepage serves as a landing page with the event preview prompting join/login

### Dark Theme
- Site-wide dark theme — all pages, all components
- Consistent dark aesthetic throughout (not just homepage splash)
- This affects every page: events, dashboard, membership card, admin, registration, login

### Event Preview on Homepage
- Minimal display: event name + date, nothing more
- Tapping leads to event detail page
- If no upcoming events: show logo + tagline only (no empty state clutter)

### Claude's Discretion
- Mobile bottom navigation styling — match the dark theme, Claude picks specific approach (dark bg with light icons, accent colors, etc.)
- Orbitron font application — Claude decides whether Orbitron is used for all text or headings-only with a readable body font (consider readability for body text)
- English translation tone — casual or formal, Claude picks what fits a music community
- Password validation UX — real-time feedback, strength meter, or submit-time error. Claude picks.
- Italian URL redirect strategy — old paths should redirect to new English paths. Implementation details at Claude's discretion.
- Color palette for dark theme — dark grays, blacks, accent colors. Claude designs.

</decisions>

<specifics>
## Specific Ideas

- Logo files provided by user: white text on transparent background (for dark bg) and black text on transparent background (for light bg). Located at `/Users/etiesse/Documents/Resonate/Logo/`
- The brand is "re:sonate" (stylized with colon) — "motion music hub" is the tagline
- Orbitron is specifically requested as the site font (Google Fonts) — this is a geometric, futuristic display font that matches the electronic music aesthetic
- The existing site has Italian text hardcoded in components — needs systematic replacement, not i18n framework
- URL migration: /eventi → /events, /registrati → /register, /presenze → /attendance, /galleria → /gallery
- Password requirements: minimum 8 characters, at least one uppercase, one number, one special character (from UIBR-08)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-ui-foundation-english-migration*
*Context gathered: 2026-02-24*
