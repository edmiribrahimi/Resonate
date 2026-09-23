---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 15
subsystem: produzione
tags: [production-act, migrations, deploy, gallery, rls, storage, authorisation]
requires:
  - phase: 52-14
    provides: "la corsa del proprietario sul laboratorio"
  - phase: 52-18
    provides: "difetti 2 e 3 chiusi"
  - phase: 52-19
    provides: "difetto 1 chiuso (campi a 16 px), laboratorio READY a 93cfbcc4"
provides:
  - "la fase 52 in produzione: M1 (20260923182638) → deploy READY 18:28:33Z (f671144b) → M2 (20260923182908)"
  - "gallery.view in produzione: 16 chiavi, 31 concessioni (16/14/1/0)"
  - "bucket event-media privato; event_media_select_gallery; «Anyone can view event media» tolta"
  - "52-AUTHORISATION.md ESAURITA con il registro d'uso"
affects: [52-16, 52-17]
tech-stack:
  added: []
  patterns: ["autorizzazione scritta prima della domanda, registrata alla lettera, esaurita con l'ora"]
key-files:
  created:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-15-SUMMARY.md
  modified:
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION.md
    - .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md
decisions:
  - "verify:refusal --section=gallery RIFIUTATO su 0 media e' l'esito onesto previsto prima della domanda, non un verde: non si seminano media in produzione per ottenerlo"
  - "Il primo tentativo negato dall'ambiente non e' stato aggirato: l'atto e' ripartito solo con la seconda approvazione del proprietario (18:25Z)"
metrics:
  duration: "~2h (autorizzazione 18:16Z → registro 18:31Z; atto 18:26:37Z → 18:29:09Z)"
  completed: 2026-09-23
---

# Phase 52 Plan 15: l'atto in produzione — M1, deploy, M2 Summary

La fase 52 e' in produzione dal **2026-09-23 18:28:33Z**: M1 (`gallery.view` a
master, organizer e staff; `storage_path` sui media) alle 18:26:38Z, il deploy
Vercel di `f671144b` `READY` alle 18:28:33Z, M2 (gallery chiusa sui dati, bucket
`event-media` privato) alle 18:29:08Z; `verify:capabilities` da rosso a
**verde** (16 · 31).

## Tasks

| Task | Nome | Commit | Esito |
|---|---|---|---|
| 1 | Autorizzazione scritta prima della domanda, numeri riletti `read_only` | `483bb4c7` | fatto |
| 2 | La domanda al proprietario (checkpoint:decision) | `2a057939` | «tutto» |
| 3a | Primo tentativo | `f671144b` | fermo al passo (a): diniego dell'ambiente, nessuna scrittura |
| 3b | L'atto, eseguito dall'orchestratore dopo la seconda approvazione («approvo m1, push, m2 e push finale. vai», 18:25Z); registro d'uso e chiusura | `b79435de` | ESAURITA 18:29Z |
| 3c | Esiti dell'atto e misura dello zoom sull'iPhone del proprietario | `78b0048f` | fatto |

## L'atto, per ore (UTC)

- **M1** 18:26:37.820Z → 18:26:38.564Z, HTTP 200, `20260923182638`; riletto
  18:27:09Z: 16 chiavi, 31 concessioni, `storage_path` e `url` nullable.
- **Push** 18:27:10Z, `65e9cc57..f671144b`, 94 commit; **deploy**
  `dpl_Dy9VYqPygXJiojRYrAf23jKvdDy1` creato 18:27:15Z, `READY` 18:28:33Z. Anonimi
  alle 18:28:47Z: `/events` 200, `/gallery` e `/door` 307 verso `/login?next=…`,
  `/login` 200.
- **M2** 18:29:08.085Z → 18:29:08.464Z, HTTP 200, `20260923182908`, dopo una
  guardia a 0 righe e 0 oggetti (residuo CDN zero per costruzione).
- **Gate** 18:29:08–09Z: `verify:capabilities` exit 0, 5/5;
  `verify:refusal --section=gallery` RIFIUTATO, una corsa sola.
- **(e)** senza soggetto, non eseguita.

## Deviations from Plan

1. **Criterio «verify:refusal verde» non raggiunto — previsto, non un difetto.**
   Il `must_have` chiedeva verde; con 0 media in produzione il controllo positivo
   non ha nulla da misurare e il gate rifiuta. L'autorizzazione lo scriveva
   **prima** della domanda (§1), e seminare media in produzione era fuori
   perimetro. La prova resta quella del laboratorio (52-13) e la rilettura del
   catalogo dopo M2.
2. **Esecuzione dall'orchestratore.** Il primo tentativo dell'executor e' stato
   negato dall'ambiente al passo (a) (`f671144b`); l'atto e' stato eseguito
   nella sessione principale dopo una seconda approvazione letterale. Questo
   piano ne registra i numeri, riletti in sola lettura alle 18:30:54–56Z.
3. **Push di 94 commit invece di 91**: i tre in piu' sono la documentazione di
   questo piano (`483bb4c7`, `2a057939`, `f671144b`), tutti sotto `.planning/`,
   come il §1(b) prevedeva.

## Anche registrato

Sull'iPhone 17 Pro del proprietario (iOS 26.7), tocchi nativi via Appium sul
laboratorio a `93cfbcc4`, 18:27Z: scala **1** su email (altezza visibile 457) e
password (377), scala 1 dopo il blur, `scrollWidth` 402 = `innerWidth`. Il
difetto 1 e' chiuso sul dispositivo reale.

## Verifica

Nessun test runner nel prodotto. Verifica: rilettura del catalogo `read_only` e
`verify:capabilities` (5/5, exit 0) alle 18:30:54Z; build della punta spinta
misurato alle 18:22:46Z (exit 0) su `1665af30`, da cui `f671144b` differisce per
un solo file sotto `.planning/`.

## Known Stubs

Nessuno: il piano non tocca codice.

## Self-Check: PASSED

- FOUND: `52-AUTHORISATION.md` (`status: ESAURITA`, `spent: yes`), `52-ESITI.md`, `52-15-SUMMARY.md`
- FOUND commit: `483bb4c7`, `2a057939`, `f671144b`, `b79435de`, `78b0048f`
