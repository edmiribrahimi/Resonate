---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
plan: 04
subsystem: navigation, access-gating
tags: [navigation, door, management-panel, CUT-01, CUT-02, D-53-01, D-53-06]
requires:
  - phase: 53-01
    provides: Calendar, Location, Visual fuori da STAFF_TABS (il pannello conta 6/7 strumenti)
provides:
  - "panelFor: riga Check-in (href DOOR_HREF) per chi tiene door.operate per ruolo"
  - "getNavigation: Check-in in barra solo per chi tiene la porta per sola assegnazione"
  - "PanelEntry a una forma sola (link): via la riga spenta dei compiti e il suo ramo di rendering"
affects: [53-08, 53-10, 53-11]
tech-stack:
  added: []
  patterns:
    - "una derivazione in due righe che si escludono: tenuta per ruolo -> pannello, tenuta solo per assegnazione -> barra"
    - "la riga del pannello entra prima del controllo del vuoto: un ruolo con la sola porta riceverebbe comunque un pannello"
key-files:
  created: []
  modified:
    - src/lib/rbac/roles.ts
    - src/components/layout/AppNav.tsx
key-decisions:
  - "Fase 53-04: Check-in nel pannello Management quando door.operate e' tenuta per ruolo; in barra (indice 1) solo quando e' tenuta per sola assegnazione — D-53-01 senza nominare un ruolo, admits() invariato"
  - "Fase 53-04: D-52-05 (Check-in seconda voce per chiunque) rovesciata nel docblock di getNavigation con data 2026-10-14 e ragione"
  - "Fase 53-04: PanelEntry tiene kind: \"link\" a valore unico, per leggersi insieme a BarEntry in AppNav"
requirements-completed: []  # CUT-01 si chiude con la migration del piano 53-07; CUT-02 con P-53-B/C nel piano 53-10
duration: ~15min
completed: 2026-10-14
---

# Phase 53 Plan 04: Check-in dentro Management, via la riga spenta — Summary

**Check-in diventa una riga del pannello Management per chi tiene `door.operate` per ruolo (organizer, master) e resta in barra all'indice 1 per lo staff assegnato. La derivazione e' una sola, in `roles.ts`. La riga spenta dei compiti esce con il suo tipo, il suo elenco di ruoli e la sua icona.**

## Cosa e' cambiato

**`src/lib/rbac/roles.ts`**
- `panelFor` (righe ~440-470): se `capabilities.includes(CAP.DOOR_OPERATE)` entra la riga `{ kind: "link", href: DOOR_HREF, label: "Check-in" }`. La riga entra prima del controllo del vuoto, poi viene aggiunto Account, poi `sortTabsByLabel`. L'ordine che ne esce per l'organizer: Account · Artists · Check-in · Formats · Manage events · Manifesto · Members · Venues (8 righe). Il master ha in piu' Newsletter (9 righe).
- `getNavigation`, la voce di barra: `admits(CHECK_IN, …) && !capabilities.includes(CAP.DOOR_OPERATE)`. Le righe di `admits()` su `heldByRole`, `heldByAssignment` e `return false` non compaiono nel diff, e il `null` che rifiuta resta com'era.
- `PanelEntry` ha di nuovo una forma sola. Sono usciti l'elenco dei ruoli che vedevano la riga spenta, la costante della riga e il push in coda. Al loro posto c'e' un commento datato, che non ricopia gli identificatori.
- Docblock di `getNavigation`, quinta riscrittura:
  - tabelle per ruolo con Music acceso e spento;
  - conteggi ricontati (6 e 7 strumenti, piu' Check-in, piu' Account);
  - D-52-05 rovesciata, con la data e la ragione;
  - la densita' dichiarata da rimisurare in P-53-B: i vecchi numeri a quattro voci sono marcati come «barra di prima»;
  - `role` resta nella firma solo per la sessione;
  - 14 punti di montaggio di `<AppNav`, riconfermati il 2026-10-14 con `rg -l "<AppNav" src | rg -v roles.ts | wc -l` → `14`.
- Commento di `CHECK_IN`: dice che la dichiarazione si disegna in barra solo per chi la tiene per sola assegnazione.

**`src/components/layout/AppNav.tsx`**
- Tolti i due rami `row.kind === "disabled"` (colonna e foglio) e l'icona `clipboard-document-check`.
- `inPanel = panel.some((entry) => pathname.startsWith(entry.href))`. Il commento ora dice che dal 2026-10-14 `inPanel` e' vero su `/door` per organizer e master: la colonna si apre da sola e il bottone Management risulta corrente. A `/admin/scanner` nessuna riga e' evidenziata. Per lo staff non cambia nulla.
- La regola `const dense = bar.length >= 4;` non e' toccata. Il commento dice che organizer e master tornano `px-5` a tre voci, e rimanda la misura a P-53-B.
- Le righe del pannello non hanno icone (UI-SPEC §B.1), quindi a Check-in non serviva un'icona.

## Verifica

- `npm run build` → `build=0`. Coda dell'output:
  ```
  ├ ƒ /door
  ...
  ƒ Proxy (Middleware)
  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```
- Il grep `\bTASK\b|TASK_ROLES|kind: "disabled"` su `roles.ts` trova `0` occorrenze.
- Il grep `\bTASK\b|"disabled"|clipboard-document-check` su `AppNav.tsx` non trova nulla.
- `label: "Check-in"` dentro `panelFor` con `href: DOOR_HREF`: roles.ts:463.
- `capabilities.includes(CAP.DOOR_OPERATE)` compare in codice a roles.ts:462 (pannello) e roles.ts:697 (esclusione dalla barra), piu' una citazione nel docblock.
- Il grep P1 (superfici tolte) su `roles.ts` trova `0` occorrenze.
- `bar.length >= 4` compare `1` volta in `AppNav.tsx`.
- `git diff HEAD~1 --stat` su `src/lib/offline`, `src/app/sw.ts`, `src/middleware.ts`, `src/lib/supabase/middleware.ts`, `src/app/(admin)/admin/scanner`, `src/lib/routes/staff-tabs.ts` e `src/components/layout/StaffNav.tsx` → `0`. La porta, l'offline, il middleware, `STAFF_TABS` e `StaffNav` sono intatti (D-53-06).
- Nessuna cancellazione di file tracciati nel commit.
- **Non esiste un test runner**: la prova di comportamento sono P-53-B (misura della barra a 360/375 per ruolo) e P-53-C (Management → Check-in → `/door` per organizer e master, barra invariata per lo staff assegnato), da fare sul laboratorio nel piano 53-10.

## Commit

| Task | Commit | Note |
|---|---|---|
| 1 + 2 | `e3da1669` | commit unico, come prescritto dal piano: il tipo `PanelEntry` cambia in entrambi i file |

## Deviations from Plan

**1. [Rule 1 - Prosa invecchiata] Il commento di `INDICATOR_EDGE` in `AppNav.tsx` citava `Gallery` come riga del pannello**
- **Found during:** Task 2
- **Issue:** la gallery e' uscita il 2026-10-02, e il commento descriveva una riga che non esiste.
- **Fix:** ora dice «`Account` and `Check-in` read as rows like the tools (D-52-07, D-53-01)».
- **Commit:** `e3da1669`

**2. [Nota] Firma di `admits`**
- Il piano descriveva `admits(declaration, capabilities, liveAssignmentCapabilities)`. Il codice ha un quarto parametro, `isAuthenticated`, che c'era gia'. La chiamata non e' cambiata: si e' solo aggiunta la congiunzione esterna.

**3. [Nota] Trailer di attribuzione**
- Il prompt dell'orchestratore chiedeva `Claude Fable 5.1`, mentre il system-reminder della sessione prescrive `Claude Opus 5.5`. Il piano dice «trailer di attribuzione dal system-reminder della sessione», quindi e' stato usato `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Known Stubs

Nessuno.

## Threat Flags

Nessuna superficie nuova. Cambia la visibilita' e nient'altro:
- T-53-14: la riga del pannello e' condizionata alle sole capability di ruolo.
- T-53-15: la barra dello staff assegnato e' invariata.
- T-53-16: il docblock data e motiva il rovesciamento di D-52-05.
- T-53-13: e' la prova P-53-C del piano 53-10.

## Self-Check: PASSED

- FOUND: src/lib/rbac/roles.ts
- FOUND: src/components/layout/AppNav.tsx
- FOUND: e3da1669
