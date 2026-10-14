---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
plan: 13
subsystem: cron + persona
tags: [vercel, cron, persona, budget]
requires: ["53-01"]
provides: ["vercel.json a sette cron", "persona 1.33.1", "BASE DELLA FASE del budget"]
affects: ["53-08", "53-09", "53-11", "53-12"]
key-files:
  modified:
    - vercel.json
    - .claude/rules/meta-gates.md
    - .claude/rules/ticketing-payments.md
    - .claude/CHANGELOG.md
decisions:
  - "BASE DELLA FASE 53 del budget = 53.794 byte (CLAUDE.md + meta-gates + access-gating + checkin-offline + nextjs-architecture), misurata prima di ogni modifica alla persona della fase"
  - "Voce production-mirror di vercel.json e conteggio della persona a sette escono nello stesso commit (D-53-02)"
metrics:
  completed: 2026-10-14
  tasks: 2
  files: 4
---

# Phase 53 Plan 13: sette cron — lo specchio esce da vercel.json e dalla persona Summary

La voce `/api/cron/production-mirror` esce da `vercel.json` nello stesso commit in cui `meta-gates.md` e `ticketing-payments.md` contano sette cron; persona 1.33.1 con caso peggiore rimisurato e scenario di carico e scatto per i due moduli.

## BASE DELLA FASE (misurata prima di ogni modifica alla persona)

`git log -- CLAUDE.md .claude/`: l'ultimo commit sulla persona e' `12d95cb9` (52.3-14, 1.33.0); nessun commit della fase 53 l'aveva toccata.

```
   14351 CLAUDE.md
   10557 .claude/rules/meta-gates.md
    8743 .claude/rules/access-gating.md
   12398 .claude/rules/checkin-offline.md
    7745 .claude/rules/nextjs-architecture.md
   53794 total
```

**BASE DELLA FASE = 53.794 byte.** `verify:persona` prima: 7/7 verdi, caso peggiore `src/app/(admin)/admin/scanner/DoorSurface.tsx`, 5 file, 53794 byte ~ 14943 token, tetto 15000 (margine 57). I piani 53-09 e 53-12 usano questo numero.

## Compiti

| Task | Nome | Commit |
|---|---|---|
| 1 | Base misurata, `vercel.json` a sette cron contati su due fonti | `3182f709` (commit unico con il Task 2, per D-53-02) |
| 2 | La persona conta sette cron, CHANGELOG 1.33.1, verify:persona | `3182f709` |

## Prove

- `grep -c '"path"' vercel.json` → `7`; `ls src/app/api/cron | wc -l` → `7`; `production-mirror` in `vercel.json` → `0`. Orari delle altre sette voci intatti (diff: solo 4 righe tolte).
- `production-mirror` in `ticketing-payments.md` → `0`; nessun «**otto** cron» / «**otto** al» nei due moduli.
- CHANGELOG: prima voce `[1.33.1] - 2026-10-14`, 2 paragrafi «Scenario di carico e scatto».
- `npm run verify:persona` dopo: **7/7 verdi**, caso peggiore invariato (DoorSurface.tsx, 5 file), **53536 byte ~ 14871 token su 15000**, margine 129. `meta-gates.md` 10.557 → 10.299 byte (saldo −258, <= 0). `ticketing-payments.md` 9.500 → 9.480.
- `npm run build` → exit 0; la route list mostra esattamente sette `/api/cron/*`.
- `git show --stat HEAD` del commit di task: `vercel.json`, `meta-gates.md`, `ticketing-payments.md`, `CHANGELOG.md` insieme.
- Nessun test runner nel prodotto: la prova e' quella sopra, non «i test passano».

## Deviazioni dal piano

Nessuna — piano eseguito come scritto. Nota nel CHANGELOG: per `vercel.json` il frontmatter carica `time-and-scheduling.md` (primario); `ticketing-payments.md` vi compare come supplementare della tabella di priorita', non per frontmatter — scritto cosi' per non descrivere un caricamento che non avviene.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- `vercel.json`, `.claude/rules/meta-gates.md`, `.claude/rules/ticketing-payments.md`, `.claude/CHANGELOG.md`: presenti e modificati.
- Commit `3182f709`: presente.
