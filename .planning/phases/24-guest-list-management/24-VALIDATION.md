---
phase: 24
slug: guest-list-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 24 — Validation Strategy

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
| GSTL-01 | Add guest by name/surname/email (email optional) | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-02 | View guest list with real-time status | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-03 | Send branded invitation email with QR | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-04 | Auto-register and auto-approve non-member guests | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-05 | Approved members get free ticket | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-06 | Pending members auto-approved + free ticket | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-07 | Remove guest with warning if ticket issued | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-08 | Per-party guest list granularity | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-09 | Auto-approve on registration matching guest email | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-10 | CSV bulk import with preview | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-11 | Clone guest list from previous event | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-12 | No-email guests check-in by name at door | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-13 | Invitation email with event details, QR, password link | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-14 | Profiles track approved_via method | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-15 | Ticket type tracking (purchased vs guest_list) | build + manual | `npm run build` | N/A | ⬜ pending |
| GSTL-16 | Email deliverability (SPF/DKIM/DMARC) | manual | DNS record check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install papaparse @types/papaparse` — CSV parsing library
- [ ] Supabase migration: `guest_list_entries` table, `profiles.approved_via`, `tickets.ticket_type`, `tickets.tier_id` nullable
- [ ] `handle_new_user()` trigger updated for guest_list auto-approval

*Schema migration and trigger update are prerequisites for all guest list tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Add guest flow | GSTL-01 | Interactive form | Add guest with/without email, verify entry created |
| Guest list status | GSTL-02 | Multi-state UI | Add guest, send invite, verify status transitions |
| Invitation email | GSTL-03, GSTL-13 | Email delivery | Add guest with email, check inbox for branded email with QR |
| Auto-registration | GSTL-04 | Auth flow | Add non-member guest, verify account created in Supabase auth |
| Free ticket generation | GSTL-05, GSTL-06 | Ticket lifecycle | Add approved member, verify free ticket with ticket_type=guest_list |
| Guest removal | GSTL-07 | Interactive warning | Remove guest with issued ticket, verify warning dialog |
| Party assignment | GSTL-08 | Multi-party event | Create multi-party event, assign guest to specific party |
| Registration auto-approve | GSTL-09 | Auth flow | Add guest, then register new account with that email, verify auto-approved |
| CSV import | GSTL-10 | File upload + preview | Upload CSV, verify parse/validate/deduplicate/preview |
| Clone guest list | GSTL-11 | Event-to-event flow | Clone from previous event, verify entries copied |
| Name check-in | GSTL-12 | Scanner UI | Search no-email guest by name at check-in |
| approved_via tracking | GSTL-14 | Data validation | Verify profile shows correct approval method |
| Ticket type separation | GSTL-15 | Sales dashboard | Verify paid vs free ticket counts in sales view |
| SPF/DKIM/DMARC | GSTL-16 | DNS records | Check DNS records for resonatemotion.com |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
