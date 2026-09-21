---
phase: 51
slug: via-le-superfici-da-socio-e-la-porta
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-21
---

# Phase 51 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derivato da `51-RESEARCH.md` §8 (Validation Architecture) e §8.1 (`P-51-1`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | nessun test runner (Guardrail 1 di `CLAUDE.md`): i controlli automatici sono `next build` (typecheck) e gli script `verify:*` |
| **Config file** | none — e Wave 0 **non** ne installa uno: un runner introdotto per una fase di rimozione sarebbe scope nuovo |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run verify` (tutti i gate; i rossi pre-esistenti sono dichiarati in `51-RESEARCH.md` §6) |
| **Estimated runtime** | build ~90 s · verify ~120 s |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run verify` — piu' `npm run verify:persona` quando un'onda tocca `.claude/**`
- **Before `/gsd:verify-work`:** `npm run verify` verde salvo i rossi pre-esistenti nominati in §6 della ricerca, e `P-51-1` percorsa e registrata
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (il planner compila una riga per task; ogni riga porta `npm run build` o un `verify:*` specifico, e le cancellazioni in produzione portano `manual` con il conteggio da catalogo) | | | MEM-01..04 | — | | build / verify:* / manual | | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements: `npm run build`, `npm run verify` (`verify:persona`, `verify:capabilities`, `verify:conversion`, `verify:routes`, `verify:venue-surfaces`, `verify:refusal` su autorizzazione) esistono gia'. Nessun runner da installare.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| La porta a rete spenta, prima e dopo la rimozione | MEM-04 | il service worker e la coda IndexedDB si provano solo su un telefono con la radio spenta davvero | `P-51-1`, `51-RESEARCH.md` §8.1: i sei passi di `P-50-8` piu' tre — guest list senza email riconosciuta offline, testata dello scanner che resta in vista, dispositivo con una voce `membership` gia' in coda che si aggiorna senza errori. Eseguita dal proprietario sul laboratorio, esito e data nel VERIFICATION |
| Cancellazione di `attendances` e della colonna `membership_code` in produzione | MEM-02, D-51-02, D-51-14 | scrittura in produzione: conteggio dal catalogo prima, istantanea, autorizzazione datata | procedura scritta nel piano: `SELECT count(*)` per tabella, cascata da `pg_constraint`, istantanea, migration via endpoint `migrations`, conteggio dopo da una fonte diversa |
| Rinomina `member` → `attendee` | D-51-06 | migration sul lab poi produzione | catalogo prima e dopo su entrambi i progetti: `pg_constraint`, `pg_proc`, `pg_policies`; `verify:refusal` esce 2 finche' la sua query non e' aggiornata |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-22 — verifica dei piani: 0 blocker, 4 avvertenze documentali corrette
