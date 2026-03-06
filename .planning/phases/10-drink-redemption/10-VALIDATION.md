---
phase: 10
slug: drink-redemption
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual testing (no automated test suite in project) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit` + manual verification
- **Before `/gsd:verify-work`:** Full type check must be green + manual redemption flow test
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | DRNK-11 | type check | `npx tsc --noEmit` | N/A | pending |
| 10-01-02 | 01 | 1 | DRNK-09 | type check | `npx tsc --noEmit` | N/A | pending |
| 10-02-01 | 02 | 2 | DRNK-07 | manual | N/A - visual verification | N/A | pending |
| 10-02-02 | 02 | 2 | DRNK-08 | manual | N/A - interaction verification | N/A | pending |
| 10-02-03 | 02 | 2 | DRNK-09 | manual | N/A - animation verification | N/A | pending |
| 10-02-04 | 02 | 2 | DRNK-10 | manual | N/A - visual verification | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Type checking via `tsc` is the only automated verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| View purchased drink tokens on event page and dashboard | DRNK-07 | Visual layout verification | Navigate to event page with purchased drinks, confirm tokens display; check dashboard for same tokens |
| 3-second countdown confirmation dialog | DRNK-08 | Interaction timing verification | Tap "Redeem" on a purchased token, verify countdown circle fills over 3 seconds, confirm button activates after |
| Full-screen SERVED animation + DB update | DRNK-09 | Animation + DB state verification | Complete redemption, verify fullscreen animation displays, check DB token status = 'redeemed' |
| Already redeemed state display | DRNK-10 | Visual state verification | View a previously redeemed token, confirm it shows muted "Already redeemed" state with no redeem button |
| HMAC signature prevents forgery | DRNK-11 | Security verification | Attempt to call redeem server action with tampered token value, verify rejection |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
