---
phase: 23
slug: analytics-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 23 — Validation Strategy

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
| ANLY-07 | Admin KPI dashboard (revenue, members, events, activity) | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-09 | Per-member spend profiles (tickets + drinks across events) | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-10 | Drink popularity ranking per event | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-11 | Market insights per event (avg spend, peak times) | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-12 | Repeat attendee rate across events | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-13 | Referral chain effectiveness | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-14 | Guest-to-member conversion tracking | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-15 | Drink purchase funnel visualization | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-16 | Side-by-side event comparison | build + manual | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No new dependencies needed — Recharts, PostHog already installed from Phase 22

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| KPI dashboard data accuracy | ANLY-07 | Requires real data | Login as admin, verify revenue/member/event totals match reality |
| Member spend profiles | ANLY-09 | Data validation | Check top spenders against known member activity |
| Drink popularity ranking | ANLY-10 | Visual + data | View per-event ranking, verify order matches sales data |
| Market insights | ANLY-11 | Data calculation | Verify avg spend and peak time calculations against raw data |
| Repeat attendee rate | ANLY-12 | Cross-event data | Verify percentage against manual count of repeat members |
| Referral chains | ANLY-13 | Relational data | Verify referrer -> referred -> spend chain with known referrals |
| Guest conversion | ANLY-14 | Lifecycle tracking | Create guest order, register, verify conversion tracked |
| Purchase funnel | ANLY-15 | Multi-source data | Verify funnel steps show decreasing counts (view > cart > payment > token) |
| Event comparison | ANLY-16 | Interactive UI | Select 2+ events, verify side-by-side metrics display correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
