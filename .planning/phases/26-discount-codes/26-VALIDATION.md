---
phase: 26
slug: discount-codes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual testing (no test framework in project) |
| **Config file** | None |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Manual browser verification of changed functionality
- **Before `/gsd:verify-work`:** Full manual flow test (create code -> apply code -> purchase -> verify ticket record -> check sales dashboard)
- **Max feedback latency:** 15 seconds (TypeScript check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | SC-01 (CRUD) | manual + tsc | `npx tsc --noEmit` | N/A | ⬜ pending |
| 26-01-02 | 01 | 1 | SC-02 (buyer input) | manual + tsc | `npx tsc --noEmit` | N/A | ⬜ pending |
| 26-01-03 | 01 | 1 | SC-03 (validation) | manual + tsc | `npx tsc --noEmit` | N/A | ⬜ pending |
| 26-01-04 | 01 | 1 | SC-04 (SumUp + tracking) | manual + tsc | `npx tsc --noEmit` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Discount code CRUD operations | SC-01 | No test framework; requires Supabase | Create/edit/delete codes on organizer ticket page |
| Discount code input + price display | SC-02 | Browser UI interaction | Enter valid/invalid codes, verify strikethrough prices |
| Case-insensitive validation + limits | SC-03 | Requires Supabase + SumUp | Test with mixed-case codes, usage limits, price guards |
| SumUp discounted checkout + traceability | SC-04 | End-to-end payment flow | Complete purchase with code, verify ticket record + dashboard |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: TypeScript check after every task
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
