---
phase: 20
slug: navigation-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 20 — Validation Strategy

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
| NAV-01 | Bottom nav shows correct tabs per role | manual + build | `npm run build` (type check) | N/A | ⬜ pending |
| NAV-02 | Account page shows role-aware sections | manual + build | `npm run build` | N/A | ⬜ pending |
| NAV-03 | Check-in tab one tap away for staff | manual | Visual check: tap Check-in from any page | N/A | ⬜ pending |
| NAV-04 | Check-in page has attendee list + name search + QR scan | manual + build | `npm run build` | N/A | ⬜ pending |
| NAV-05 | Management shows quick-stats cards | manual + build | `npm run build` | N/A | ⬜ pending |
| NAV-06 | Management section expand/collapse | manual | Visual check: toggle animation | N/A | ⬜ pending |
| NAV-07 | Visual separation between My Stuff and Management | manual | Visual check: divider/background | N/A | ⬜ pending |
| NAV-08 | StaffNav used consistently | grep | `grep -r "AdminNav\|OrganizerNav" src/app/ src/components/` returns 0 | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No test framework needed — validation is lint + build + manual visual testing
- [ ] `grep` check for old component imports serves as automated verification for NAV-08

*Existing infrastructure (ESLint + TypeScript build) covers automated verification needs for this UI refactor phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tab count per role | NAV-01 | Visual UI — no test framework | Login as member (3 tabs), organizer (4 tabs), master (4 tabs) |
| Role-aware sections | NAV-02 | Visual UI | Login as member (My Stuff only), staff (My Stuff + Management) |
| Check-in one tap | NAV-03 | Interaction flow | From any page, tap Check-in tab as organizer — direct navigation |
| Attendee list + search | NAV-04 | Complex UI interaction | Open Check-in, verify QR present, type name, verify filtering |
| Quick-stats data | NAV-05 | Server data rendering | Login as staff, verify pending count, next event, revenue display |
| Expand/collapse | NAV-06 | Animation behavior | Tap Management header, verify smooth open/close |
| Section separation | NAV-07 | Visual design | Verify clear divider between My Stuff and Management |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
