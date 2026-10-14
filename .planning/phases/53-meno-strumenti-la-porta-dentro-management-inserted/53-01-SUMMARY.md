---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
plan: 01
subsystem: admin-surfaces
tags: [cut, capabilities, typedRoutes, next-config, production-sections]

requires:
  - phase: 52.4
    provides: main con la v1.6 corrente, base del ramo feat/53-meno-strumenti
provides:
  - Calendar, Location, Visual e lo specchio ICS fuori dal codice (46 file di src/)
  - catalogo delle chiavi in codice a undici (CAP, CAP_DESCRIPTIONS, CAPABILITY_ROUTES)
  - sette linguette di lavoro (STAFF_TABS), senza Check-in (D-53-06)
  - Manifesto districato: rivalida solo se stesso, SECTION_KINDS = ["manifesto"]
affects: [53-04, 53-05, 53-06, 53-07, 53-08, 53-11, 53-12, 53-13]

tech-stack:
  added: []
  patterns:
    - "Lapide datata al posto del codice uscito, senza ricopiare l'identificatore cancellato"
    - "Conteggi nei commenti ricontati sul file e datati, con la riga precedente conservata"

key-files:
  created: []
  modified:
    - src/types/database.ts
    - src/lib/production/sections/vocabulary.ts
    - src/app/(admin)/admin/manifesto/actions.ts
    - next.config.ts
    - src/lib/capabilities/keys.ts
    - src/lib/routes/capability-routes.ts
    - src/lib/routes/staff-tabs.ts

key-decisions:
  - "Fase 53-01: le tre chiavi di sezione (calendario, Location, visual) escono dal codice prima che dal catalogo; il database le tiene fino alla migration 53-07, dopo il deploy — verify:capabilities rosso per costruzione fino a li'"
  - "Fase 53-01: alsoGatesTables ricontato 5 su 11 il 2026-10-14 (door.operate, register.read, party.manage, catalogue.manage, production.manifesto.manage)"

patterns-established:
  - "Mirror SQL volutamente asimmetrico fino alla migration: il codice e' il lato piu' stretto (SECTION_KINDS ha solo manifesto, il CHECK applicato ammette ancora il secondo valore)"

requirements-completed: [CUT-01]

duration: 6min
completed: 2026-10-14
---

# Fase 53 Piano 01: Calendar, Location, Visual e lo specchio escono dal codice — Summary

**46 file di `src/` cancellati (pagine, azioni, librerie ICS e di sezione, route del cron dello specchio e dell'archivio), catalogo in codice da quattordici a undici chiavi, sette linguette, Manifesto unica sezione di produzione; `npm run build` verde sul commit 2/2.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-14T10:02:48Z
- **Completed:** 2026-10-14T10:08:42Z
- **Tasks:** 3/3
- **Files:** 46 cancellati, 7 riscritti

## Accomplishments

- Le rotte `/admin/calendar`, `/admin/calendar/[id]`, `/admin/location`, `/admin/location/[id]`, `/admin/visual` non esistono piu' come pagine, ne' in `CAPABILITY_ROUTES`, ne' in `STAFF_TABS`. Nel build, sotto `/admin`, resta solo `/admin/manifesto` fra le superfici di produzione.
- `src/app/api/cron/` ha **7** directory (prima 8). La voce `/api/cron/production-mirror` e' **ancora in `vercel.json:27`**: esce nel piano 53-13, come da piano.
- `src/types/database.ts`: restano solo `ProductionSection` e `ProductionOpenQuestion`; via i tipi delle sette tabelle del calendario, delle due di Location e di quella dell'archivio, e la colonna della parola-sede dal tipo della serie. Lapide datata al posto del blocco.
- `sections/vocabulary.ts` da 441 a ~100 righe: `SECTION_KINDS = ["manifesto"] as const`, nessun import (prima riesportava gli stadi dal vocabolario ICS).
- `next.config.ts`: via `outputFileTracingIncludes` (serviva solo al visual); `cacheOnNavigation: false` e `reloadOnOnline: false` intatti.
- `keys.ts`: `CAP` ha 11 chiavi (contate con un parser sul file, non dedotte); `CAP_DESCRIPTIONS` segue (Record totale).
- `capability-routes.ts`: `rg -c "^\s+alsoGatesTables: true,"` = **5** (prima 8); voce della porta con `assignmentOpenable` e voce Manifesto intatte.
- `staff-tabs.ts`: sette voci in `DECLARED` (Manage events, Members, Artists, Venues, Formats, Manifesto, Newsletter); niente `"/door"` ne' `label: "Check-in"`.

## Task Commits

1. **Task 1+2: cancellazione, tipi, vocabolario, Manifesto, next.config** — `b7bb6e15` `refactor(53-01): … (1/2 — build rosso per costruzione …)`. **Commit intermedio dichiarato rosso**: il build non e' stato lanciato su questo commit, come prescrive il piano. Il ramo non e' stato spinto.
2. **Task 3: chiavi, mappa, linguette** — `711c1e1d` `refactor(53-01): undici chiavi — … (2/2, build verde)`. E' il commit che porta il build a verde.

## Verifica

Nessun test runner nel repo: la prova e' il build e i grep.

- `npm run build` sul commit `711c1e1d`: **exit 0** — `✓ Compiled successfully in 7.0s`, typecheck incluso; nessuna rotta `/admin/(calendar|location|visual)`, `production-mirror` o `finalize-archive` nell'elenco delle rotte.
- Grep P1 (senza `\bTASK\b`) + P2 sui sette file riscritti dal piano: **0** righe.
- Verifica del Task 1: nessuna delle dieci directory/file uscenti esiste; grep sui tipi e sul vocabolario = 0; `^export (interface|type) Production` elenca solo `ProductionSection` e `ProductionOpenQuestion`.
- `git diff HEAD~2 --stat -- src/lib/offline src/app/sw.ts src/middleware.ts 'src/app/(admin)/admin/scanner' src/lib/supabase/middleware.ts`: **vuoto**. La porta non e' toccata.
- `npm run verify` non e' un criterio di questo piano: e' rosso per costruzione fino al 53-05 (gate sulle superfici tolte) e, su `verify:capabilities`, fino alla migration di produzione (53-11).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - prosa che puntava a moduli cancellati] Riferimenti a identificatori usciti nei file del piano**
- **Trovati durante:** Task 1 e Task 3
- **Problema:** il criterio "grep P1/P2 = 0 sui file del piano" falliva anche su commenti storici: in `keys.ts` (le tre sezioni di prosa sulla quattordicesima, sedicesima e diciassettesima chiave, e il paragrafo su `media.upload` che citava la guardia dell'archivio), in `capability-routes.ts` (il conteggio storico di `alsoGatesTables`, la docblock del modulo, la lapide di `media.upload`, la lista dei pattern della voce Manifesto), in `manifesto/actions.ts:36` (un rimando `file:riga` a un modulo uscito), in `sections/vocabulary.ts` (un'etichetta di un vocabolario uscito citata come precedente) e nel docblock di `ProductionOpenQuestion`.
- **Correzione:** ogni passaggio e' diventato una lapide datata 2026-10-14 che **descrive** cio' che c'era e perche' e' uscito, senza ricopiare l'identificatore; la ragione contenuta (es. "un predicato in un file `use server` pubblica un oracolo") e' stata conservata dove serve ancora. Ordinali delle chiavi non rinumerati.
- **Commit:** `b7bb6e15`, `711c1e1d`

**2. [Rule 1 - conteggi scaduti] Intestazioni con numeri superati**
- `keys.ts:2` diceva "fifteen" (era gia' scaduto prima di questo piano), `staff-tabs.ts:2` "ten": ricontati e datati ("eleven", "seven"), con la storia conservata dove il file la tiene.

**3. Trailer di attribuzione**
- Il primo commit e' stato creato con il trailer indicato nel prompt dell'orchestratore e subito corretto (`--amend`, commit non spinto) con quello del system-reminder della sessione, come prescrive il piano. Nessun effetto sul contenuto.

## Residui fuori perimetro (non toccati, di altri piani)

Il grep P1|P2 sull'intero `src/` trova ancora **10 file**, tutti fuori dall'elenco di questo piano e tutti con riferimenti in **prosa/commenti** (il build e' verde, quindi nessun import vivo): `manifesto/SectionForm.tsx`, `manifesto/SectionStateBadge.tsx`, `manifesto/SectionVoid.tsx`, `api/media/finalize-cover/route.ts`, `lib/media/finalize.ts`, `sections/export-contract.ts`, `sections/write-contract.ts`, `lib/routes/next-redirect.ts`, `lib/supabase/middleware.ts` (piano 53-06), `lib/venue-reveal/reveal-party-venue.ts`. In `scripts/` i file con riscontri sono 18 (piani 53-05 e 53-07). Il grep a zero su `src/ scripts/` e' il criterio del piano 53-07.

## Rischi dichiarati

- **Nessun deploy prima del piano 53-13**: `vercel.json` chiama ancora ogni mattina una route che ora risponde 404. Il merge su `lab` (53-08) dipende da 53-13 (T-53-04).
- **Il database tiene ancora tabelle, concessioni e la colonna della parola-sede** fino alla migration del piano 53-07, applicata dopo il deploy; le policy RLS continuano a rifiutare la lettura a chi non ha la chiave. I tipi ora sono un sottoinsieme dello schema applicato, per scelta (un tipo senza lettori invita a scrivere una query).
- `SECTION_KINDS` ha solo `manifesto` mentre il `CHECK` applicato ammette ancora il secondo valore: il codice e' il lato piu' stretto, quindi nessuna scrittura puo' essere rifiutata dal database.
- Nessuna superficie toccata mostra un venue: niente cambia per `venue_reveal_sent`.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: `src/lib/routes/capability-routes.ts` contiene `PRODUCTION_MANIFESTO_MANAGE`
- FOUND: `src/types/database.ts` contiene `ProductionOpenQuestion`
- FOUND: commit `b7bb6e15`
- FOUND: commit `711c1e1d`
