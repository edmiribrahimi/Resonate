---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 04
subsystem: events-public
tags: [NAV-06, venue-secrecy, format-chips, rls]
requires: []
provides:
  - "chip dei format ricavati dall'array di serate gia' filtrato dalla RLS (D-52-15)"
  - "format ritirato con serate visibili mostra il chip (D-52-16)"
  - "riga dei chip assente con zero serate visibili (D-52-17)"
affects:
  - src/app/(public)/events/page.tsx
  - src/app/(public)/events/FormatFilterRow.tsx
tech-stack:
  added: []
  patterns:
    - "derivazione dall'array gia' letto invece di una seconda interrogazione (nessun side channel)"
key-files:
  created: []
  modified:
    - src/app/(public)/events/page.tsx
    - src/app/(public)/events/FormatFilterRow.tsx
decisions:
  - "L'allow-list di ?format= e' la riga dei chip: un format senza serate visibili risolve come uno sconosciuto (nessun filtro, All corrente, nessun redirect)"
  - "Dall'array si prende solo lo slug; nome, colore e ordine restano del catalogo, perche' CardFormat.name puo' essere il nome di una serie e una serie quello di una sede"
metrics:
  duration: "~15 min"
  completed: 2026-09-23
  tasks: 2
  files: 2
---

# Fase 52 Piano 04: i chip dei format dalle serate visibili — Summary

I chip della pagina eventi nascono dal `Set` degli slug delle serate che la RLS ha gia' restituito a chi guarda, calcolato prima del filtro per format: nessuna query nuova, una sola lettura di `formats`, e con zero serate visibili la riga non si monta.

## Cosa e' cambiato

**Task 1 — `src/app/(public)/events/page.tsx`** (commit `52f3f81`)
- Catalogo: tolto `.is("retired_at", null)` (D-52-16); resta `.eq("listed", true)` (`page.tsx:224`), fuori dal try, col suo `throw [events.catalogue_read_failed]`. Unica lettura `.from("formats")` (`page.tsx:222`).
- Commento di testa riscritto: la regola «the chip row must not vary with the data OR with the viewer» (D-36-13/D-36-16) e' dichiarata **rovesciata il 2026-09-23 da D-52-15**, con la ragione; il paragrafo su `retired_at` dice ora «ritirato = nessuna serata nuova» (D-52-16); il paragrafo «No count, no join…» e' rimasto invariato.
- `chips` e `activeFormatOption` dichiarati fuori dal try (`page.tsx:260-261`), risolti dentro: `allEvents` (`:599`) → `visibleFormatSlugs` (`:607`) → `chips = formatOptions.filter(...)` (`:610`) → `activeFormatOption = chips.find(...)` (`:611`) → `shownEvents` (`:619`). Nel `catch` tornano vuoti; `activeFormat` si ricava dopo il catch (`:639`).
- `FormatFilterRow` riceve `chips` (`:703`); lo stato vuoto filtrato continua a leggere `activeFormatOption`.
- Le due stringhe pinnate da `verify:venue-surfaces` non sono state toccate (`nightIsSecret` a `:478`).

**Task 2 — `src/app/(public)/events/FormatFilterRow.tsx`** (commit `36059a2`)
- `if (formats.length === 0) return null;` (`FormatFilterRow.tsx:137`) con il commento D-52-17: niente `<nav>`, niente «All» da solo.
- La docblock e il commento della prop `formats` dicevano che la riga e' identica per tutti: riscritti con D-52-15/D-52-16/D-52-17. Nessuna classe dei chip cambiata (diff limitato a commenti e ramo vuoto).

## Verifica

- `npm run build`: verde dopo ciascun task (typecheck compreso). **Non esiste test runner: nessun test e' stato eseguito, nessuno e' dichiarato passato.**
- `npm run verify:venue-surfaces`: PASSED.
- Controlli grep del piano: 0 `is("retired_at", null)`, 1 `.from("formats")`, `visibleFormatSlugs` e `D-52-15` presenti in `page.tsx`; `D-52-17` e `formats.length === 0` presenti in `FormatFilterRow.tsx`.

### Procedura manuale (P-52-D, da percorrere sul laboratorio, `npm run dev:lab` — mai in produzione)

Non eseguita da questo agente (worktree senza env). Passi:
1. Nel lab, con un organizer, creare una serata **non pubblicata** assegnata a un format che non ha altre serate (pubblicate o passate).
2. **Anonimo** (finestra privata) su `/events`: il chip di quel format **non compare**; compaiono solo i chip dei format con serate pubblicate. Ragione: la RLS su `public.events` non restituisce la bozza ad `anon`, quindi il suo slug non entra in `visibleFormatSlugs`.
3. **Anonimo** su `/events?format=<slug di quel format>`: nessun filtro, «All» corrente, lista completa, nessun redirect — identico a uno slug inventato.
4. **Organizer** (tiene `staff.manage`) su `/events`: il chip compare, perche' la bozza e' gia' nella sua lista con il badge di bozza. Il chip non dice nulla che la lista non dica gia'.
5. Selezionare un chip: gli altri chip restano visibili (calcolati prima del filtro).
6. Ritirare (`retired_at`) un format che ha serate visibili: il chip resta (D-52-16). Un format ritirato senza serate visibili sparisce.
7. Con zero serate visibili (lab senza eventi pubblicati, anonimo): nessuna riga di chip, nessun «All»; resta lo stato vuoto di `EventTabs`.
8. Dopo la prova, cancellare la bozza per chiave primaria.

## Deviazioni dal piano

Nessuna sostanziale. Dettaglio: dentro il try la variabile dello slug attivo si chiama `activeSlug` invece di `activeFormat`, per non ombreggiare la `const activeFormat` dichiarata dopo il catch per il render. Nessun effetto sul comportamento.

## Threat Flags

Nessuna superficie nuova: nessuna query aggiunta, nessun dato nuovo passato ai figli. T-52-10/11/12/13 mitigati come da piano (conteggio `.from("formats")` = 1; nome dal catalogo; allow-list = chip senza redirect; `verify:venue-surfaces` verde).

## Known Stubs

Nessuno.

## Self-Check: PASSED

- `src/app/(public)/events/page.tsx` — FOUND, commit `52f3f81`
- `src/app/(public)/events/FormatFilterRow.tsx` — FOUND, commit `36059a2`
- STATE.md, ROADMAP.md, EventTabs.tsx — non toccati
