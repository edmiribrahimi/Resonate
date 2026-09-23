---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 11
subsystem: navigazione (visibilita', non accesso)
tags: [nav-03, nav-04, appnav, staffnav, striscia, sticky]
requires:
  - "52-07: AppNav a quattro voci, pannello Management in colonna, sortTabsByLabel in staff-tabs.ts"
  - "52-05: la dipendenza d'onda dichiarata dal piano"
provides:
  - "AppNav senza la prop workNav: in colonna una lista sola, il pannello Management (D-52-08)"
  - "StaffNav a una forma: la striscia da telefono, appesa (sticky top-0 z-10, opaca), in ordine alfabetico (NAV-04, D-52-11, D-52-27)"
affects:
  - "52-14: percorre P-52-C (la striscia appesa su telefono) e P-52-A sul laboratorio"
tech-stack:
  added: []
  patterns:
    - "un ordine solo, calcolato al rendering con la stessa funzione del pannello; la dichiarazione non si riordina"
    - "elemento appiccicoso opaco senza backdrop-filter (difetto iOS del 2026-08-14)"
key-files:
  created: []
  modified:
    - src/components/layout/AppNav.tsx
    - src/app/(admin)/admin/(work)/layout.tsx
    - src/components/staff/StaffNav.tsx
    - scripts/verify-touch-targets.mjs
    - scripts/conversion-manifest.mjs
decisions:
  - "La prop form di StaffNav esce del tutto (non resta a un valore): un solo albero, un solo chiamante aggiornato"
  - "La riga scorrevole della striscia dichiara min-h-11: era la forma column a portare la dichiarazione che l'esenzione 2 di verify:touch-targets pretende nel file; messa sull'elemento che ha davvero quell'altezza, invece di toccare il gate"
metrics:
  duration: "~20 min"
  completed: 2026-09-23
---

# Fase 52 Piano 11: una lista sola in colonna, la striscia appesa — Summary

Da tablet in su la colonna di navigazione porta una lista sola, il pannello
Management di `AppNav` (aperto dentro uno strumento); la sezione `Work` e la
prop che la alimentava non esistono piu'. Da telefono la striscia degli
strumenti resta appesa in cima mentre si scorre uno strumento lungo, opaca e
senza blur, nello stesso ordine alfabetico del pannello.

## Cosa e' stato fatto

### Task 1 — via la colonna Work (`d565acb`)

- `src/components/layout/AppNav.tsx`: esce `workNav` da `AppNavProps` e dal
  destrutturamento; esce il blocco `!isPhone && workNav` con il suo
  `SectionHeading` e l'import di `SectionHeading` (senza altri usi). Al posto
  della prop un commento datato che dice perche' e' uscita; la docblock dice
  che la colonna porta **una lista sola** (D-52-08) e che la striscia resta
  appesa sulle pagine di lavoro.
- `src/app/(admin)/admin/(work)/layout.tsx`: `<AppNav>` senza `workNav`;
  `<StaffNav capabilities={staffCapabilities} />` senza `form`. Il wrapper
  `md:[--nav-inset-inline-start:14rem]` e il suo commento **restano** (controllo
  E di `verify:conversion` verde). La docblock del layout racconta la nuova
  forma e cosa c'era prima.
- `src/components/staff/StaffNav.tsx`: escono la forma `"column"`,
  `COLUMN_ENTRY`, l'import di `FOCUS_RING` e la prop `form`; la docblock «Two
  forms» diventa «One form: the phone strip. The column is `AppNav`'s
  Management panel», con la data e D-52-08.
- Nessuno degli altri dodici mount di `<AppNav>` e' stato toccato.

### Task 2 — la striscia appesa, in ordine alfabetico (`5790d85`)

- `<nav aria-label="Work surfaces" className="sticky top-0 z-10 mb-6 border-b
  border-line bg-ground px-6 py-2 md:hidden">`: opaca, **nessun
  `backdrop-blur`**, con il commento che rimanda alla causa documentata in
  `AppNav.tsx` (iOS, 2026-08-14) e alla ragione per cui `viewportFit` non si
  imposta a `cover`. `z-10` e' il rango della barra fissa della porta: nessun
  rango nuovo. La costruzione dello scorrimento (`staff-nav-scroll`, `-mx-6
  px-6`) resta.
- Le tab: `sortTabsByLabel(visibleStaffTabs(capabilities))` (D-52-27). Il
  `Chip` gestisce gia' `scrollMarginInline: 24px` sul selezionato; nulla da
  aggiungere. `DECLARED` in `staff-tabs.ts` non e' stato toccato.
- `scripts/verify-touch-targets.mjs:701` → «the work tabs as one pinned strip,
  alphabetical»; `scripts/conversion-manifest.mjs:195` → «the work tabs as one
  pinned strip — mounted by the work layout; the column is AppNav's Management
  panel since phase 52». Nessun'altra riga dei due file.

## Accesso — cosa NON e' cambiato

La navigazione decide la visibilita', mai l'accesso. Togliere la sezione `Work`
toglie un **doppione**, non un cancello: ogni riga che la sezione mostrava
arrivava da `visibleStaffTabs(capabilities)`, ed e' la stessa sorgente da cui
`getNavigation` costruisce il pannello (piano 52-07). Stessi ruoli, stesse
capability, stesse voci; l'ordinamento non aggiunge ne' toglie nulla (T-52-51).
Middleware, guardie di pagina e RLS non sono stati toccati.

## Porta (`checkin-offline.md`)

La porta (`/door`, `/admin/scanner`) sta fuori da `(work)` e non monta
`StaffNav`: la striscia appesa non vi compare e non sposta la sua barra fissa.
`AppNav form="phone"` perde solo una prop che la porta non passava.

## Verifica

Non esiste un test runner: nessuna affermazione qui dice che «i test passano».

| Controllo | Esito |
|---|---|
| `npm run build` (typecheck incluso), dopo ogni task | exit 0 |
| `verify:conversion` (controllo E incluso), dopo ogni task | exit 0 |
| `verify:touch-targets` | exit 0 (dopo la correzione descritta sotto) |
| `verify:no-viewport-read` | exit 0 |
| `verify:tokens` | exit 0 |
| `verify:breakpoints` | exit 0 |
| grep del piano: zero `workNav` in `AppNav.tsx` e nel layout, zero `"column"` in `StaffNav.tsx`, `sticky top-0 z-10` presente, zero `backdrop-blur`, `sortTabsByLabel` presente, zero «in two forms» nei due script | tutti verdi |
| `verify:capabilities` | **non eseguito**: dichiarato rosso contro la produzione fino al 52-15 |

**Procedura manuale:** P-52-C (e P-52-A) in `52-PROCEDURES.md`, non riscritte.
Si percorrono sul laboratorio nel piano 52-14; qui non sono state percorse, e
nessun render nel browser e' stato osservato (il worktree non ha file
d'ambiente). In particolare **non e' stato osservato** su iPhone che la
striscia resti sotto la barra di stato in modalita' standalone: e' il passo di
P-52-C che lo dice.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `verify:touch-targets` rosso dopo la rimozione della forma colonna**
- **Trovato durante:** task 1
- **Problema:** l'esenzione 2 del gate (`PRIMITIVE_COMPONENTS`) pretende che
  `StaffNav.tsx` dichiari un `min-h-11` non prefissato da qualche parte;
  l'unico stava in `COLUMN_ENTRY`, uscito con la colonna. Il gate falliva con
  «the exemption's premise is false».
- **Correzione:** `min-h-11` sulla riga scorrevole della striscia, che ha
  davvero quell'altezza (i chip sono a 44 px), con un commento che dice perche'
  e' scritto li'. Il gate non e' stato toccato oltre alla descrizione chiesta
  dal piano; l'alternativa (togliere `StaffNav` dall'elenco) avrebbe violato
  «nessun altro cambiamento alla riga o al gate».
- **File:** `src/components/staff/StaffNav.tsx`
- **Commit:** `d565acb`

## Deferred Issues

- Riferimenti a riga ormai stantii in commenti di altri file
  (`EventTabs.tsx:514` cita `StaffNav.tsx:164-171`, `staff-tabs.ts:167` cita
  `StaffNav.tsx:68-73`, `AppNav.tsx:31` cita `StaffNav.tsx:25-32`): fuori dal
  perimetro del piano, non toccati.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: src/components/layout/AppNav.tsx, src/app/(admin)/admin/(work)/layout.tsx, src/components/staff/StaffNav.tsx, scripts/verify-touch-targets.mjs, scripts/conversion-manifest.mjs
- FOUND: d565acb, 5790d85
