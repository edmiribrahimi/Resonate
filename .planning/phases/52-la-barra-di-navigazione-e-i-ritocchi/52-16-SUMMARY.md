---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 16
subsystem: produzione
tags: [production-act, media, storage, exif, moderation, authorisation]
requires:
  - phase: 52-09
    provides: "scripts/purge-media-orphans.mjs, provato sul laboratorio"
  - phase: 52-10
    provides: "scripts/restrip-event-media.mjs, provato sul laboratorio"
  - phase: 52-15
    provides: "M2 in produzione alle 18:29:08Z — il confine della soglia"
provides:
  - "52-AUTHORISATION-MEDIA.md ESAURITA alle 18:43:33Z, risposta `entrambe` (18:42:23Z)"
  - "D-52-30 e D-52-31 veri in produzione per assenza di soggetto: R 0 · O 0 · P 0 · V 0"
  - "52-ESITI.md — sezione «L'atto 2 (piano 52-16)»"
affects: [52-17]
tech-stack:
  added: []
  patterns: ["atto a zero soggetti: gli strumenti non spendono, l'atto si chiude per data e lo dice"]
key-files:
  created:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION-MEDIA.md
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-16-SUMMARY.md
  modified:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md
decisions:
  - "Soglia della ri-spogliatura 2026-09-23T18:29:09Z (primo secondo intero dopo M2), perche' 20260809006000 non e' nella history di produzione e il verso dell'errore piu' economico e' una soglia tardi"
  - "A zero soggetti `spent` resta `no` nei due blocchi e non si scrive a mano: l'atto e' esaurito per data (granted_on = --dated), e il §4 lo dichiara"
metrics:
  duration: "~5 min dalla risposta (18:42:23Z → 18:43:33Z chiusura); atto scritto alle 18:40Z"
  completed: 2026-09-23
---

# Phase 52 Plan 16: il secondo atto in produzione — rimozione e ri-spogliatura dei media Summary

Il proprietario ha concesso **`entrambe`** alle 18:42:23Z; i due strumenti sono
stati lanciati contro la produzione nell'ordine — rimozione, poi ri-spogliatura,
ciascuno `--dry-run` poi `--apply` — e hanno trovato **zero soggetti**:
R 0 · O 0 · in volo 0 · P 0 · V 0, riconfermati da una seconda fonte. Nessuna
scrittura, nessuna istantanea. L'atto e' **ESAURITO alle 18:43:33Z**.

## Tasks

| Task | Nome | Commit |
|---|---|---|
| 1 | `52-AUTHORISATION-MEDIA.md` scritta prima della domanda, numeri di oggi | 8c5d84cc |
| 2 | Risposta del proprietario `entrambe`, `granted: yes` nei due blocchi | 171dc3f8 |
| 3 | Corse contro la produzione, atto ESAURITO, sezione in `52-ESITI.md` | bb597302 |

## Le corse

| Corsa | UTC | Uscita | Esito |
|---|---|---|---|
| `purge-media-orphans --dry-run` | 18:42:45Z → 18:42:47Z | 0 | R 0 · O 0 · in volo 0; rejected Management API 0 · PostgREST 0 |
| `purge-media-orphans --apply` | 18:42:51Z → 18:42:53Z | 0 | identico, nessuna scrittura |
| `restrip-event-media --dry-run` senza `--env-file` | 18:43Z | 2 | rifiuto d'invocazione, nessuna lettura |
| `restrip-event-media --dry-run` | 18:43:12Z → 18:43:13Z | 0 | foto 0 · video 0 · altro 0 |
| `restrip-event-media --apply` | 18:43:19Z → 18:43:20Z | 0 | identico, nessuna scrittura |
| riconteggio proprio (PostgREST + Storage) | 18:43:29Z | — | righe 0 · pre-soglia 0 · rejected 0 · bucket 0 · quarantena 0 |

Istantanee nella radice del repo: 15 prima, 15 dopo, gli stessi nomi (tutte del
laboratorio). Nessuna cancellata: e' un passo datato del piano 52-17.

## Deviations from Plan

### 1. [Rule 3 - Blocking] `restrip-event-media` lanciato senza `--env-file`
- **Found during:** Task 3, passo (b)
- **Issue:** a differenza di `purge-media-orphans`, questo strumento non carica
  `.env.local` da se': il primo `--dry-run` e' uscito 2 (*variabili assenti*),
  **prima di ogni lettura**.
- **Fix:** rilanciato nella forma che il suo docblock prescrive per la produzione,
  `node --env-file=.env.local scripts/restrip-event-media.mjs …`. Non e' una
  seconda corsa dopo una scrittura: non c'era stata ne' lettura ne' scrittura.
  Registrato come corsa (b)0 nel §3 dell'atto.

### 2. [Esito a zero soggetti] La riga di verifica automatica del Task 3 non passa, per costruzione
- **La riga:** `grep ESAURITA && (nessun "^spent: no" OR almeno un "^granted: no")`.
- **Perche' fallisce:** con R = O = P = 0 gli strumenti escono 0 **senza
  consumare** il blocco (*«una decisione senza soggetti non si esegue»*), quindi
  entrambi i blocchi restano `granted: yes · spent: no`. La riga era scritta per
  il caso con soggetti o per un rifiuto; il caso zero-soggetti — previsto e
  dichiarato nell'atto prima della domanda — non la soddisfa.
- **Cosa non si e' fatto:** portare `spent: yes` a mano. Sarebbe attestare una
  scrittura che non e' avvenuta, e il campo e' degli strumenti.
- **Cosa lo sostituisce:** l'atto e' `status: ESAURITA`, `exhausted:
  2026-09-23T18:43:33Z`, §4 con la ragione; `granted_on: 2026-09-23` fa rifiutare
  (uscita 2) qualunque lancio con un altro `--dated`. Anche il criterio
  «ogni blocco concesso porta `spent: yes` e `spent_at`» non e' soddisfatto per
  la stessa ragione.

### 3. Riconteggio da seconda fonte fatto a mano per la ri-spogliatura
- `restrip-event-media`, a zero foto, esce senza ricontare da un'altra fonte
  (`purge-media-orphans` invece lo fa). Il riconteggio e' stato fatto in sola
  lettura da PostgREST e API Storage alle 18:43:29Z, stampando solo numeri.

## Verifica

Nessun test runner nel prodotto; questo piano non tocca codice. Evidenza: i
referti degli strumenti (uscite e numeri sopra), il riconteggio indipendente,
il conteggio delle istantanee prima/dopo. Verify del Task 1 e del Task 2 verdi;
del Task 3 vedi deviazione 2.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: 52-AUTHORISATION-MEDIA.md (ESAURITA, `answer: entrambe`, due blocchi `granted: yes`)
- FOUND: 52-ESITI.md, sezione «L'atto 2 (piano 52-16)»
- FOUND: commit 8c5d84cc, 171dc3f8, bb597302
