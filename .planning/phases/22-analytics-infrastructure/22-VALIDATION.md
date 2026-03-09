---
phase: 22
slug: analytics-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 22 — Validation Strategy

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
| ANLY-08 | PostHog client init via instrumentation-client.ts | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-08 | PostHog server-side capture singleton | build | `npm run build` | N/A | ⬜ pending |
| ANLY-08 | PostHog user identification on auth | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-01 | Revenue summary per event (gross/net ticket + drink) | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-02 | Ticket sales velocity chart (daily bars) | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-03 | Drink sales breakdown with per-item detail | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-04 | Attendance rate (sold vs checked-in) | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-05 | Member growth over time (referral vs organic) | build + manual | `npm run build` | N/A | ⬜ pending |
| ANLY-06 | Token lifecycle rate (redeemed vs refunded) | build + manual | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install posthog-js posthog-node recharts` — Analytics and charting libraries
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` env vars documented

*PostHog + Recharts installation is prerequisite for all analytics tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PostHog pageview tracking | ANLY-08 | Requires PostHog dashboard to verify events arrive | Navigate between pages, check PostHog EU dashboard for pageview events |
| PostHog custom events | ANLY-08 | Requires PostHog dashboard | Trigger purchase/redeem actions, verify custom events in PostHog |
| Revenue numbers accuracy | ANLY-01 | Requires real data comparison | Compare displayed revenue with SumUp transaction totals |
| Velocity chart rendering | ANLY-02 | Visual chart rendering | View event analytics, verify daily bars appear with correct dates |
| Drink breakdown accuracy | ANLY-03 | Requires data validation | Compare per-drink totals with drink_orders table |
| Attendance rate display | ANLY-04 | Visual + data validation | Check-in some attendees, verify percentage updates |
| Member growth chart | ANLY-05 | Visual chart rendering + admin-only access | Login as admin, verify area chart with referral/organic split |
| Token lifecycle display | ANLY-06 | Requires token state transitions | View event with redeemed + refunded tokens, verify percentages |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
