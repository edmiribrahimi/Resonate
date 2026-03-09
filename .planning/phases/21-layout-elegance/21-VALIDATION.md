---
phase: 21
slug: layout-elegance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test infrastructure exists |
| **Config file** | none — see Wave 0 |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint && npm run build`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full build must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| UI-01 | Component enter animations (fade + translateY) | manual + build | `npm run build` | N/A | ⬜ pending |
| UI-02 | Skeleton loading states for async content | manual + build | `npm run build` | N/A | ⬜ pending |
| UI-03 | Press/tap feedback on buttons and cards | manual | Visual check | N/A | ⬜ pending |
| UI-04 | Smooth scroll for anchor links | manual | Visual check | N/A | ⬜ pending |
| UI-05 | Toast notifications with slide-in and auto-dismiss | manual + build | `npm run build` | N/A | ⬜ pending |
| UI-06 | Primary button hover/tap micro-interactions | manual | Visual check | N/A | ⬜ pending |
| UI-07 | Staggered list animations (50-80ms delay) | manual + build | `npm run build` | N/A | ⬜ pending |
| UI-08 | Scroll-triggered animations (whileInView) | manual | Visual check on scroll | N/A | ⬜ pending |
| UI-09 | CountUp animation for KPI cards | manual + build | `npm run build` | N/A | ⬜ pending |
| UI-10 | Ambient glow effects on dark mode accents | manual | Visual check | N/A | ⬜ pending |
| UI-11 | Card hover elevation + press feedback | manual | Visual check desktop/mobile | N/A | ⬜ pending |
| UI-12 | prefers-reduced-motion respected | manual | Enable reduced motion in OS, verify no animations | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install motion` — Motion v12.35.x animation library
- [ ] LazyMotion + MotionConfig provider in app layout

*Motion library installation is prerequisite for all animation tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Enter animations | UI-01 | Visual animation behavior | Navigate between pages, verify fade+translateY on load |
| Skeleton states | UI-02 | Visual loading behavior | Throttle network, verify skeleton placeholders appear |
| Press feedback | UI-03 | Touch/gesture behavior | Tap buttons/cards on mobile, verify scale feedback |
| Smooth scroll | UI-04 | Scroll behavior | Click anchor links, verify smooth scrolling |
| Toast system | UI-05 | Notification behavior | Trigger actions (save, delete), verify toast slide-in/dismiss |
| Button micro-interactions | UI-06 | Hover/tap behavior | Hover primary buttons on desktop, tap on mobile |
| Staggered lists | UI-07 | Animation timing | Load event list, verify items appear with staggered delay |
| Scroll animations | UI-08 | Scroll trigger | Scroll down page, verify sections animate into view |
| CountUp | UI-09 | Number animation | View KPI cards, verify numbers count up from 0 |
| Ambient glow | UI-10 | Visual CSS effect | View dark mode, verify subtle glow on accent elements |
| Card elevation | UI-11 | Hover/press behavior | Hover cards desktop (elevation), tap cards mobile (scale) |
| Reduced motion | UI-12 | Accessibility | Enable prefers-reduced-motion in OS settings, verify no animations play |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
