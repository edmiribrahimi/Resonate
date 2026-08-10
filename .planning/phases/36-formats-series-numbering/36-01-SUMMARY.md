---
phase: 36-formats-series-numbering
plan: 01
subsystem: database
tags: [rls, baseline, postgres, supabase, evidence, docker]

# Dependency graph
requires:
  - phase: 32-capability-model-in-the-database
    provides: "scripts/rls-baseline.mjs, scripts/rls-baseline-container.mjs, scripts/rls-baseline-compare.mjs e la cartella baseline/ dove vivono gli artefatti"
  - phase: 43-35-34
    provides: "le 54 migration che il container applica per costruire lo schema misurato"
provides:
  - "Il punto `pre-36` su entrambi i bersagli: sei artefatti, tutti con `phase_point: pre-36`"
  - "La figura di partenza del container: 54 migration, 23 tabelle con RLS, 72 policy, 14/14 persona, 966 sonde di scrittura, 1/1 sonda di vincolo che rifiuta come dichiarato"
  - "Il predicato di `event_parties_select_published` come la produzione lo tiene oggi — il gate che questa fase non deve aprire"
affects: [36-04 (allargamento della sonda di scrittura), 36-05 (applicazione della migration), 36-14 (baseline:compare di chiusura)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Doppia cattura prima del cambiamento: container per la verita' delle persona, produzione per la verita' dello schema"

key-files:
  created:
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.pre-36.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.pre-36.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.pre-36.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.pre-36.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.pre-36.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-advisors.pre-36.json
  modified: []

key-decisions:
  - "Nessun `--overwrite` passato: la refusal CR-02 e' rimasta il default su entrambe le catture"
  - "In produzione nessun artefatto B3: le scritture restano dietro `--i-know-this-writes` e una fotografia del prima non ha ragione di scrivere"
  - "La precondizione e' stata verificata come comando, non come impressione: `find supabase/migrations -name '*formats*'` a zero prima della cattura e a zero alla chiusura del piano"

patterns-established:
  - "La precondizione di un baseline si asserisce nello stesso comando che cattura, non prima e a memoria"

requirements-completed: [FMT-03, FMT-06]

# Metrics
duration: 12min
completed: 2026-08-10
---

# Phase 36 Plan 01: Baseline `pre-36` Summary

**Il punto `pre-36` catturato su entrambi i bersagli mentre `supabase/migrations` non conteneva ancora un solo file di questa fase — sei artefatti committati, e la prova che il "prima" e' davvero prima e' un comando, non una dichiarazione.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-10T13:40Z
- **Completed:** 2026-08-10T13:52Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments

- **Container, `pre-36`.** `postgres:17.6`, **54 file di migration applicati**, **23 tabelle con row-level security**, 46 coppie tabella/ruolo di grant verificate, 16 profili su **12/12 celle ruolo × stato**. B1 72 policy · B2 322 celle con **0 celle vacue**, 14/14 persona risolte · B3 966 sonde inviate, **249 rifiuti, 692 successi, 25 inconclusive**.
- **Sonde di vincolo che rifiutano come dichiarato: 1 su 1.** L'unica registrata oggi e' `ASSIGN-04` su `party_assignments`, che rifiuta con `23514 party_assignments_no_self_grant`. La figura e' **uno**, non «tutte»: e' esattamente il numero che i piani 36-04 e 36-05 devono far salire aggiungendo le due sonde di FMT-03 e della chiave composta. Se a fine fase questa riga dicesse ancora 1/1, la fase non avrebbe misurato i propri vincoli.
- **Clausola di sicurezza del container, riportata due volte come il file pretende:** 966 stringhe di sonda finiscono in `rollback` e non portano token proibiti (clausola 1/2), e 23/23 conteggi di riga sono stati riletti immutati dopo le 966 sonde (clausola 2/2).
- **Produzione, `pre-36`.** B1 72 policy su 23 tabelle con RLS · B2 322 celle, **4/14 persona risolte e 274 celle vacue** · B5 7 avvisi, 3 di performance e 4 di sicurezza.
- **`event_parties` porta cinque policy in produzione**, la figura attesa: il gate di pubblicazione piu' quattro policy di capability — `event_parties_select_published`, `event_parties_select_admin`, `event_parties_insert_admin`, `event_parties_update_own`, `event_parties_delete_own`.

### Il gate che questa fase non deve aprire, registrato verbatim

`event_parties_select_published`, `SELECT`, ruolo `public`, `qual`:

```
(EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_parties.event_id) AND (e.is_published = true))))
```

Nessun `with_check`. E' la riga contro cui si legge V3 di `36-VALIDATION.md`: una serata e' leggibile da chiunque **se e solo se** il suo evento e' pubblicato. Ogni policy nuova su questa tabella, e ogni tabella nuova che una superficie pubblica legge, va confrontata con questo predicato.

### Le 274 celle vacue della produzione non sono un risultato debole

La produzione tiene quattro profili e nessun `organizer`, nessun `staff`, nessuna riga non approvata: dieci persona su quattordici non esistono li' e le loro celle non possono che tornare vuote. E' la ragione dichiarata per cui il bersaglio container esiste (`rls-baseline-container.mjs:4-15`). La produzione porta la verita' dello **schema** e gli advisor; il container porta la verita' delle **persona**. Il baseline e' la coppia, non uno dei due.

## Task Commits

1. **Task 1: Capture the container point pre-36** — `e730af4` (chore)
2. **Task 2: Capture the production point pre-36** — `a3c701b` (chore)

## Files Created

- `32-BASELINE-policies.container.pre-36.json` — B1 sul container: 72 policy come Postgres le rende
- `32-BASELINE-reads.container.pre-36.json` — B2: matrice di lettura per 14 persona × 23 tabelle, senza celle vacue
- `32-BASELINE-writes.container.pre-36.json` — B3: 966 sonde di scrittura piu' le sonde di vincolo
- `32-BASELINE-policies.pre-36.json` — B1 in produzione: il testo delle policy come la produzione le tiene
- `32-BASELINE-reads.pre-36.json` — B2 in produzione: md5 delle chiavi primarie ordinate, mai il contenuto delle righe
- `32-BASELINE-advisors.pre-36.json` — B5: 7 avvisi Supabase piu' gli invarianti (`hook_custom_access_token_enabled: false`, `jwt_exp: 3600`)

## Decisions Made

- **Nessun `--overwrite`.** Le tre destinazioni container e le tre produzione erano libere: nessun `pre-36` esisteva. La refusal e' rimasta attiva per tutta la cattura, che e' la mitigazione T-36-01-02 applicata invece che descritta.
- **Nessun B3 in produzione.** Il set di default `B1+B2+B5` non scrive. T-36-01-03 chiuso non passando il flag.
- **La precondizione dentro il comando.** Il `find` a zero e' stato incatenato con `&&` alla cattura del container: se un file di fase 36 fosse comparso, la cattura non sarebbe partita. Ripetuto alla chiusura del piano, sempre zero.

## Controllo di segretezza prima del commit

Il repository e' pubblico e `.planning/` e' tracciato, quindi ogni artefatto qui e' una pubblicazione. Prima dei due commit, sui tre file di produzione:

- **Nessun host, nessun token, nessun JWT.** Grep per `https?://`, `sbp_`, `eyJ…` sui tre file: **zero occorrenze**.
- **Nessun contenuto di riga.** B2 memorizza `pk_md5`, un md5 delle chiavi primarie ordinate, piu' un conteggio — mai i valori. Riga d'esempio: `{"persona":"anon","table":"artists","count":7,"pk_md5":"0c19…","vacuous":false}`.
- **Nessun nome di sede, nessuna data, nessun nome di persona** in nessuno dei sei file: B1 porta testo di policy, B5 nomi di lint, il container porta dati seminati sinteticamente.

## Deviations from Plan

Nessuna deviazione di **esecuzione**: il piano e' stato eseguito esattamente come scritto, nessuna delle regole 1–4 e' scattata, nessun pacchetto e' stato installato (T-36-01-SC resta `accept` a costo zero: `package.json` non e' stato toccato).

Una deviazione di **contabilita'**, dichiarata invece che eseguita in silenzio:

**1. [CLAUDE.md — zero fallimenti silenziosi] FMT-03 e FMT-06 NON sono stati marcati completi in `REQUIREMENTS.md`**
- **Trovato durante:** l'aggiornamento di stato a fine piano
- **Questione:** il frontmatter di questo piano dichiara `requirements: [FMT-03, FMT-06]`, e il flusso di esecuzione prescrive di marcarli completi alla chiusura. Ma FMT-03 e' *«il database rifiuta due serate con la stessa terna»* e FMT-06 e' *«nessun conteggio, etichetta o codice su una superficie pubblica rivela una serata non annunciata»*. **Questo piano non implementa ne' l'uno ne' l'altro**: cattura una fotografia del prima. Il vincolo di FMT-03 lo scrive il piano 36-05; FMT-06 si prova solo con la procedura manuale V3 di `36-VALIDATION.md`, in una finestra privata, leggendo il sorgente reso.
- **Decisione:** lasciati `Pending`. Gli stessi due requisiti sono rivendicati da altri sette piani della fase (36-03, 36-04, 36-05, 36-07, 36-10, 36-11, 36-12, 36-13): marcarli completi qui metterebbe una spunta verde su due righe che nessuna riga di codice soddisfa ancora, ed e' esattamente il verde-che-significa-il-contrario contro cui `36-VALIDATION.md` mette in guardia.
- **File non modificato:** `.planning/REQUIREMENTS.md` — FMT-03 riga 97 e FMT-06 riga 100 restano `- [ ]`, la tabella di tracciabilita' resta `Pending`.
- **Chi le chiude:** FMT-03 il piano 36-05 con la sonda di vincolo che il piano 36-04 avra' aggiunto; FMT-06 la procedura V3, eseguita e datata.

**2. Metrica di performance non registrata** — `STATE.md` non ha una sezione *Performance Metrics*, quindi `state.record-metric` non ha dove scrivere (`recorded: false`). Non e' un fallimento della cattura: e' una sezione che questo file non ha mai avuto. Le figure stanno qui sopra.

## Issues Encountered

Uno solo, di forma e non di sostanza: la shell qui e' `zsh`, dove `ls supabase/migrations/*formats*` senza corrispondenze **fallisce con «no matches found»** invece di stampare zero righe, quindi il comando di verifica del piano non poteva distinguere «nessun file» da «comando fallito». Sostituito con `find supabase/migrations -name '*formats*' | wc -l`, che restituisce `0` in entrambi i casi e rende la precondizione asseribile. E' `CLAUDE.md` Guardrail 6 — macOS/BSD — applicato a un glob invece che a una regex.

## Cosa questo piano NON prova

Scritto invece che sottinteso, perche' un baseline si cita a fine fase e chi lo cita deve sapere cosa non contiene.

1. **Non dice che una policy sia giusta.** Dice qual e' l'insieme applicato, nella resa di Postgres, perche' una cattura successiva possa essere confrontata. La correttezza e' un giudizio umano su quel confronto (`rls-baseline.mjs:12-17`).
2. **Non prova che il gate rifiuti qualcuno.** Nessuno strumento di questo repository puo' autenticarsi come un ruolo reale: e' il debito di 32 voci `human_needed` che la fase 36 non consuma e non peggiora.
3. **Il container non e' la produzione.** `profiles_role_implies_approved` e' ripristinato `NOT VALID` nel container (`convalidated=false` qui, `true` in produzione): la cattura lo asserisce esplicitamente perche' nessun artefatto legge `pg_constraint`.

## User Setup Required

None.

## Next Phase Readiness

- Il vincolo `[BLOCKING]` di `36-VALIDATION.md` § *Wave 0 Requirements*, ultima casella, e' **chiuso**: il punto `pre-36` esiste su entrambi i bersagli e precede ogni file di questa fase.
- `npm run baseline:compare --target=container --before-point=pre-36 --after-point=<x>` ha ora un prima da leggere.
- **Rimane il rischio dichiarato dalla stessa sezione**, e non e' di questo piano: la sonda di scrittura su `event_parties` fornisce oggi solo `event_id, title, time` (`rls-baseline.mjs:1226-1229`). Con una colonna `NOT NULL` in piu' fallirebbe `23502` per ogni persona, e `baseline:compare` etichetterebbe come *movimento* una riga che ha semplicemente smesso di misurare. **Il piano 36-04 deve allargarla prima che la migration del piano 36-05 venga applicata**, altrimenti il verde di fine fase significa il contrario di quello che sembra.
- Le tre figure contro cui si misurera' la chiusura: **72 policy**, **23 tabelle con RLS**, **1/1 sonde di vincolo che rifiutano come dichiarato**.

## Self-Check: PASSED

Sette file su sette presenti su disco, due commit su due presenti in `git log`.
La precondizione riverificata alla chiusura: `find supabase/migrations -name
'*formats*'` restituisce **0**.

---
*Phase: 36-formats-series-numbering*
*Completed: 2026-08-10*
