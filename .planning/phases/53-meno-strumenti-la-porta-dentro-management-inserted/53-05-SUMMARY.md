---
phase: 53-meno-strumenti-la-porta-dentro-management-inserted
plan: 05
subsystem: gates, tooling
tags: [verify, gates, capabilities, conversion-manifest, CUT-01, CUT-05, D-53-03, D-53-04]
requires:
  - phase: 53-01
    provides: superfici Calendar/Location/Visual tolte dal codice, CAP a 11 chiavi
provides:
  - "package.json a 24 voci verify:* (erano 29), senza import:calendar, restore:mirror-snapshot, seed:spaces"
  - "verify-all.mjs senza le cinque voci tolte; NEEDS_MATERIAL vuota e dichiarata (2d)"
  - "verify-section-surface ristretto a Manifesto (controlli C ed E, lettere tenute)"
  - "verify-section-export a un solo documento, censimento sulle tabelle del manifesto"
  - "conversion-manifest: PENDING_SURFACES = manifesto; 1 + 18 + 1 = 20 page.tsx sotto (work)"
  - "verify-capabilities a 11/20 con il rosso della fase 53 riconosciuto per forma"
affects: [53-07, 53-08, 53-11, 53-13]
tech-stack:
  added: []
  patterns:
    - "un rosso dichiarato si riconosce per FORMA (conteggi, prefisso, suffisso), mai per nome delle chiavi uscenti"
    - "un controllo esce solo quando esce la superficie che misura; quelli che restano non cambiano soglia"
key-files:
  created: []
  modified:
    - package.json
    - scripts/verify-all.mjs
    - scripts/verify-section-surface.mjs
    - scripts/verify-section-export.mjs
    - scripts/conversion-manifest.mjs
    - scripts/verify-capabilities.mjs
    - scripts/verify-refusal.mjs
    - scripts/verify-routes.mjs
    - scripts/verify-media-strip.mjs
    - scripts/verify-touch-targets.mjs
  deleted:
    - scripts/verify-calendar-surface.mjs
    - scripts/verify-ics-import.mjs
    - scripts/verify-ics-reachable.mjs
    - scripts/verify-ics-grammar.mjs
    - scripts/verify-mirror-guards.mjs
    - scripts/import-production-calendar.mjs
    - scripts/restore-mirror-snapshot.mjs
    - scripts/seed-production-spaces.mjs
    - scripts/check-first-mirror-run.mjs
key-decisions:
  - "Fase 53-05: verify-section-surface tiene le lettere C ed E invece di rinumerare, perche' SectionVoid.tsx cita «check C» come sua prova"
  - "Fase 53-05: verify-section-export — la sorveglianza della directory d'esportazione diventa piu' stretta (qualunque modulo non dichiarato e' un reperto); il censimento passa da scouting↔strada a tabelle del manifesto↔strada, zero archi attesi"
  - "Fase 53-05: verify-capabilities 11 chiavi / 44 coppie / 20 concessioni / 24 rifiuti; il blocco DBT-13 sostituito da quello della fase 53, riconosciuto per forma"
requirements-completed: []  # CUT-01 si chiude con la migration del piano 53-07; CUT-05 con il verde pieno dopo 53-08/53-11
duration: ~35min
completed: 2026-10-14
---

# Phase 53 Plan 05: I gate seguono la cancellazione — Summary

**Nove script escono con le loro voci; i gate di Manifesto misurano solo Manifesto; `verify:capabilities` attende 11 chiavi e 20 concessioni e nomina il proprio rosso riconoscendolo per forma. `npm run verify`: 21 verdi, 1 rosso dichiarato, 0 rifiutati.**

## Conteggi

- `rg -c '"verify:' package.json` prima: **29**. Dopo: **24**.
- Voci tolte da `package.json`: `verify:calendar-surface`, `verify:ics`, `verify:ics-reachable`, `verify:ics-grammar`, `verify:mirror-guards`, `import:calendar`, `restore:mirror-snapshot`, `seed:spaces` (8).
- `find 'src/app/(admin)/admin/(work)' -name page.tsx | wc -l` → **20** = 1 reindirizzamento + 18 dichiarati in `CONVERTED` + 1 recintato (manifesto). Il paragrafo «RE-MEASURED 2026-10-14 by plan 53-05» in `conversion-manifest.mjs` porta lo stesso numero; `CONVERTED` conta 36 voci su tutto `src/app`.

## Cosa e' cambiato

**Task 1 — script e runner**
- `git rm` dei nove script del frontmatter.
- `verify-all.mjs`: tolte le righe di `verify:ics-reachable`, `verify:ics-grammar`, `verify:mirror-guards`, `verify:calendar-surface` (da `OFFLINE`) e `verify:ics` (da `NEEDS_MATERIAL`, che resta **vuota e dichiarata**: paragrafo 2d nuovo nell'intestazione). Riscritte le descrizioni di `verify:section-surface` (la sezione del manifesto, tre directory) e di `verify:section-export` (un modulo). La riconciliazione in due direzioni non e' stata toccata: chiude a 24/24.

**Task 2 — Manifesto (D-53-04)**
- `verify-section-surface.mjs`: `SCOPE` a tre directory; escono A (stadio accanto al nome), B (provenienza) e D (palette) con costanti e funzioni che servivano solo a loro. Restano **C** (*the void is declared*) ed **E** (forma del log), interi. Le lettere restano C ed E, con la ragione scritta: il docblock di `SectionVoid.tsx` cita «check C». Il rifiuto exit 2 su directory mancante resta. La prosa che citava il renderer della data di un pezzo lo descrive senza il nome del file.
- `verify-section-export.mjs`: un solo `ENTRY_FILES` (`export/manifesto.ts`); `DECLARED_READS` ora dichiara anche `production_open_question`, che il modulo gia' leggeva (il controllo positivo copre di piu', non di meno); `DERIVED_BASELINE` da 9 a 5 (escono le quattro tabelle del calendario e dello scouting: il parser legge CREATE e non DROP, quindi puo' ancora derivarle — direzione sicura); `PINNED` vuoto e dichiarato. Il controllo sulla directory d'esportazione **si stringe**: prima falliva su un modulo col nome della sezione location, ora su qualunque modulo non dichiarato. Il censimento: da scouting↔strada a `production_section`/`production_open_question`↔`venues/events/event_parties`, **zero archi attesi** (prima uno, uscito con la sua tabella).
- `conversion-manifest.mjs`: `PENDING_SURFACES` perde calendar, location, visual; paragrafo datato sopra la lista e riconteggio misurato.

**Task 3 — capacita' e prosa**
- `verify-capabilities.mjs`: `EXPECTED_KEY_COUNT = 11`, `EXPECTED_PAIR_COUNT = 44`, `EXPECTED_GRANT_COUNT = 20`, `EXPECTED_REFUSAL_COUNT = 24`. Paragrafo «Da 14 a 11 il 2026-10-14, fase 53 — ed e' una RIMOZIONE» con le sei concessioni uscenti, staff a zero, e il blocco ⚠ del rosso. Lapidi di riga nelle quattro matrici (master, organizer, staff, attendee), descrittive. `DBT13_LEAVING` esce con una lapide (intervallo chiuso dal 52.1-25); il blocco nuovo riconosce `tsKeys.length === 11 && dbMissing.length === 0 && dbExtra.length === 3 && dbExtra.every(production.*.manage) && tsKeys.some(production.)`. Anche la prosa storica che spelava le tre chiavi e' stata riscritta in forma descrittiva (`production.<section>.manage`): le tre stringhe compaiono 0 volte nel file.
- `verify-refusal.mjs`: `SECTION_TARGETS` a due righe (manifesto → `production_section`; il registro → `production_open_question`), con lapide senza i nomi delle tabelle; output finale ritoccato. **Solo `node --check`: NON eseguito.**
- `verify-routes.mjs` (due esempi in commento → `/admin/artists`, `/admin/venues/[slug]`), `verify-media-strip.mjs` (la cover e' l'unico percorso d'immagine), `verify-touch-targets.mjs` (il componente d'upload dell'archivio descritto, non nominato). Nessuna logica toccata.

## Verifica

- `node --check` su tutti i nove script toccati: passa.
- Grep di accettazione Task 1, Task 2, Task 3: **0** righe ciascuno.
- `node scripts/verify-section-surface.mjs` → exit 0 (`SECTION_SURFACE_OK — 2 check(s) passed`).
- `npm run verify:conversion` → exit 0.
- `node scripts/verify-section-export.mjs` → exit 0, **misurato contro il laboratorio**: 10 derivate · 0 fissate · closure del manifesto 9 moduli · «0 catalogue row(s) matched the census; zero are expected».
- `npm run verify` (vedi sotto) → exit 1, solo `verify:capabilities` rosso.
- `npm run build` → **exit 0** (package.json cambiato).

### `npm run verify`, gate per gate

Eseguito con `NEXT_PUBLIC_SUPABASE_URL` del **laboratorio** esportata nell'ambiente: `process.loadEnvFile` non sovrascrive variabili gia' presenti (provato in scratch), quindi la lettura del catalogo (Management API, `read_only`) e' andata al laboratorio e non alla produzione. L'etichetta stampata «measured against: production (Management API, read_only)» e' fissa nel codice di `verify-capabilities.mjs` e non descrive il bersaglio reale.

| gate | exit | esito |
|---|---|---|
| verify:persona | 0 | passed |
| verify:capabilities | 1 | **FAILED — rosso dichiarato** |
| verify:no-header-identity | 0 | passed |
| verify:no-credit-account | 0 | passed |
| verify:media-strip | 0 | passed |
| verify:routes | 0 | passed |
| verify:tokens | 0 | passed |
| verify:semantic-separation | 0 | passed |
| verify:sunset-gradient | 0 | passed |
| verify:conversion | 0 | passed |
| verify:scan-legibility | 0 | passed |
| verify:dialogs | 0 | passed |
| verify:tables | 0 | passed |
| verify:breakpoints | 0 | passed |
| verify:no-viewport-read | 0 | passed |
| verify:external-tickets | 0 | passed |
| verify:seed-readonly | 0 | passed |
| verify:comment-stripper | 0 | passed |
| verify:section-surface | 0 | passed |
| verify:section-export | 0 | passed |
| verify:venue-surfaces | 0 | passed |
| verify:touch-targets | 0 | passed |
| verify:redirects | — | non eseguito: serve un server |
| verify:refusal | — | non eseguito: serve un'autorizzazione (vietato in questa fase) |

Conteggio: dichiarati 24 · eseguiti 22 (21 passed, 1 FAILED, 0 REFUSED) · server 1 · materiale 0 · autorizzazione 1 · contati 24.

Il rosso di `verify:capabilities`, come stampato:

```
TS 11 · DB 14 · POLICY 10 (82 call sites in 96 policies) · SRC 11 (305 files walked) · GRANT 26 rows
✗ 0 · both declarations hold the pre-registered 11 keys
    DB has 14 keys, expected 11: ...
    DECLARED RED INTERVAL (phase 53, D-53-03): the code dropped three production keys; the catalogue loses them with supabase/migrations/20261014120000_production_tools_removal.sql — on the lab in plan 53-08, in production in plan 53-11, each AFTER the deploy of the code. This red closes by applying the migration, never by editing EXPECTED_KEY_COUNT.
✗ 1 · TS and DB name the same keys
✓ 2 · ✓ 3 · ✓ 4
✗ 5 · every role holds exactly the declared set of capabilities
```

Database a 14/26 contro 11/20 del file: e' il gate che funziona, e il riconoscimento per forma e' scattato sul catalogo reale del laboratorio. Si chiude **applicando la migration del piano 53-07** (laboratorio 53-08, produzione 53-11), mai editando la costante.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correttezza] Prosa storica di `verify-capabilities.mjs` che spelava le tre chiavi**
- **Found during:** Task 3
- **Issue:** il criterio d'accettazione chiede 0 occorrenze delle tre stringhe delle chiavi uscenti, ma due paragrafi storici (piano 45-05 e DBT-13) le citavano.
- **Fix:** riscritte in forma descrittiva (`production.<section>.manage`, «la chiave della sezione visual»), con il rinvio alla fase 53.
- **Commit:** 7b288758

**2. [Rule 2 - Correttezza] `DECLARED_READS` del manifesto incompleto**
- **Found during:** Task 2
- **Issue:** `export/manifesto.ts` legge `production_open_question` ma il controllo positivo C non lo dichiarava.
- **Fix:** aggiunto; il controllo copre di piu'.
- **Commit:** 7b288758

**3. [Scelta d'esecuzione] Lettere C ed E tenute in `verify-section-surface.mjs`**
- Il piano chiedeva «numerazione/etichette ricontate». Rinumerare avrebbe reso falsa la citazione «check C» nel docblock di `SectionVoid.tsx` (file non di questo piano). Le lettere restano e la ragione e' scritta nel file.

**4. [Scelta d'esecuzione] `npm run verify` puntato al laboratorio**
- Vincolo dell'orchestratore: letture del database solo contro il ref del laboratorio. `.env.local` punta alla produzione, quindi i gate con catalogo sono stati lanciati con l'URL del laboratorio nell'ambiente. Nessuna lettura della produzione in questo piano.

## Threat Flags

Nessuna superficie nuova. T-53-17: nessuna soglia abbassata — escono solo i controlli la cui superficie e' uscita; il controllo sulla directory d'esportazione si stringe. T-53-18: `verify:refusal` non eseguito. T-53-19: rosso di `verify:capabilities` dichiarato per nome nel file e nell'output.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- Commit `7b288758` presente su `feat/53-meno-strumenti`.
- I nove script cancellati non esistono; i dieci file modificati esistono.
