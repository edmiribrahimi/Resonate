---
phase: 50-via-le-iscrizioni
plan: 01
subsystem: database
tags: [supabase, postgres, pg_constraint, management-api, seeding, rls-baseline]

requires:
  - phase: 49-comprare-senza-account
    provides: l'account leggero, la RPC `reserve_ticket_order`, il laboratorio seminato e la forma di un'autorizzazione datata
provides:
  - "`scripts/seed-lab-door.mjs` semina senza `profiles.status`: gira prima e dopo la migration dell'onda 1"
  - "una serata `free_rsvp` sul laboratorio, con capienza 4 e tier 'RSVP' a prezzo 0 — la precondizione di `P-50-7`"
  - "`memberSpare`, l'account senza biglietti su cui `P-50-3` prova la cancellazione riuscita"
  - "`scripts/container/seed.mjs` non nomina piu' lo stato ne' il vincolo che lo implicava"
  - "`50-MEASURES.md`: nove famiglie di misura su due database, in sola lettura, con ora UTC"
  - "l'insieme delle cascate ri-derivato da `pg_constraint`: undici vincoli bloccanti, non otto"
affects: [50-02, 50-03, 50-07, 50-11, 51]

tech-stack:
  added: []
  patterns:
    - "un `insert` che non nomina una colonna `NOT NULL DEFAULT` gira prima e dopo la sua cancellazione"
    - "le misure sulla produzione si prendono con `read_only: true` sulla Management API, e un runner che rifiuta cio' che non e' una `select`"

key-files:
  created:
    - .planning/phases/50-via-le-iscrizioni/50-MEASURES.md
    - .planning/phases/50-via-le-iscrizioni/deferred-items.md
  modified:
    - scripts/seed-lab-door.mjs
    - scripts/container/seed.mjs

key-decisions:
  - "Su produzione i profili in pending o rejected sono ZERO: D-50-02 non ha soggetti e l'autorizzazione del 50-11 dichiara zero cancellazioni"
  - "I vincoli che bloccano una cancellazione sono undici, non gli otto di 50-RESEARCH.md §4.1: il catalogo aggiunge attendances.checked_in_by, guest_list_entries.checked_in_by e ticket_refunds.processed_by"
  - "rsvps ed email_deliveries sono vuote in produzione: il debito di D-50-22 chiude a zero e la trappola del CHECK di §7.4 non puo' scattare"
  - "Le tre asserzioni su profiles_role_implies_approved escono dal banco del container con il vincolo che le riguardava: ROLE-02 resta senza prova automatica perche' il requisito e' ritirato, non perche' il gate sia stato spento"
  - "scripts/rls-baseline.mjs legge ancora profiles.status e non era in perimetro: differito invece che corretto di straforo"

patterns-established:
  - "Un banco di prova che dimagrisce dichiara in testa quante persone erano e quante restano, e perche'"
  - "Un elenco di cascate si ri-deriva dal catalogo e si riportano le DIFFERENZE, invece di confermarlo"

requirements-completed: [REG-02, REG-06]

duration: 38min
completed: 2026-09-21
---

# Phase 50 Plan 01: L'onda 0 Summary

**I due banchi di prova compilano il loro mondo senza `profiles.status`, il laboratorio ha la sua serata `free_rsvp` con il tier a zero, e le nove misure che nessuno aveva mai preso dicono che in produzione non c'e' niente da cancellare.**

## Performance

- **Duration:** ~38 min
- **Started:** 2026-09-21T11:47Z (circa)
- **Completed:** 2026-09-21T12:25Z
- **Tasks:** 3 su 3
- **Files modified:** 4 (2 script, 2 documenti)

## Accomplishments

- **La misura che cambia il piano 50-11.** In produzione i profili in `pending` o
  `rejected` sono **zero**: quattro profili, tutti `approved`. D-50-02 — *«gli
  account oggi in pending o rejected si cancellano»* — non ha soggetti, e
  l'autorizzazione datata che doveva coprire una cancellazione irreversibile la
  dichiara **a zero**.
- **Il catalogo smentisce la ricerca su tre colonne.** §4.1 dichiara sette
  vincoli bloccanti ed elenca otto colonne; `pg_constraint` ne conta **undici**,
  e due delle tre in piu' — `attendances.checked_in_by`,
  `guest_list_entries.checked_in_by` — **sono due porte**: registrano chi ha
  ammesso qualcuno. Sono state aggiunte alla misura e contate come le altre.
- **`P-50-7` diventa eseguibile.** Il laboratorio ha una serata `free_rsvp` con
  capienza 4 e un tier `RSVP` a prezzo 0. La capienza porta un valore piccolo di
  proposito: sotto il tetto per ordine (6, D-50-26), cosi' che il rifiuto sia
  della capienza e non del tetto.
- **I due banchi girano prima e dopo la migration.** Nessuno dei due `insert`
  nomina `status`: oggi la colonna e' `NOT NULL DEFAULT 'approved'` e si
  soddisfa da sola, domani non esiste. Nessuna finestra fra onda 0 e onda 1.

## Task Commits

1. **Task 1: il banco della porta senza lo stato, con la serata gratuita** — `9980dde` (chore)
2. **Task 2: il banco del container senza le persone irrappresentabili** — `60861bb` (chore)
3. **Voce differita: `rls-baseline.mjs`** — `9d8697e` (docs)
4. **Task 3: le sette misure, su laboratorio e produzione** — `754461b` (docs)

## Files Created/Modified

- `scripts/seed-lab-door.mjs` — i quattro account perdono lo stato
  (`:178-183`), l'`insert` perde la colonna (`:226-228`), e dopo la serata
  segreta nasce la terza: `lab-free-night`, `free_rsvp`, capienza 4, tier `RSVP`
  a 0 (`:318-351`). `--verify` e `--teardown` estesi alle tre chiavi nuove, per
  chiave primaria (`:393-395`, `:431-433`). Il rifiuto del ref di produzione
  resta a `:85`, prima di qualunque `fetch`.
- `scripts/container/seed.mjs` — via ogni scrittura di `profiles.status`
  (i due `insert` a `:491` e `:515` nominano cinque colonne, non sei), via il
  drop/ripristino del vincolo, via le tre asserzioni che erano su di esso. La
  griglia perde l'asse dello stato: `buildPersonas` e' un ciclo solo
  (`:349-365`) e l'asserzione finale conta i ruoli (`:1104`). Il conto — dodici
  persone piu' sei scritture rifiutate, restano quattro — e' dichiarato in testa
  al file (`:26-30`).
- `.planning/phases/50-via-le-iscrizioni/50-MEASURES.md` — **nuovo.** Nove
  famiglie di misura su due database, ora UTC per misura, query alla lettera,
  risultato alla lettera, e le cascate ri-derivate dal catalogo con le
  differenze riportate.
- `.planning/phases/50-via-le-iscrizioni/deferred-items.md` — **nuovo.**

## Decisions Made

- **I due account `member` del laboratorio non sono un duplicato.** `memberSpare`
  (nessun biglietto, nessuna traccia) e' il soggetto su cui `P-50-3` prova la
  cancellazione **riuscita**; `member`, che porta il biglietto seminato, e'
  quello su cui prova il **rifiuto con la causa**. Due esiti opposti, nessuno dei
  due inventato durante la prova.
- **Le tre asserzioni sul vincolo `role implies approved` escono dal container
  con il vincolo.** Erano ROLE-02 e la sua unica prova automatica nel
  repository. Non sono state cancellate per far passare una corsa: il loro
  soggetto e' dropato dalla stessa migration che droppa la colonna. Dichiarato
  in un commento al posto in cui stavano, perche' un banco che dimagrisce in
  silenzio fa credere che qualcosa sia andato perso.
- **Il ref del laboratorio non e' scritto in `50-MEASURES.md`**, mentre quello di
  produzione si': il secondo e' gia' pubblico per costruzione (viaggia nel
  bundle del browser), il primo no, e `scripts/seed-lab-door.mjs:74-75` dice
  perche'. `.planning/` e' pubblico.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Tre colonne bloccanti che la misura richiesta non contava**

- **Found during:** Task 3
- **Issue:** Il task chiede il conteggio «per ognuno dei sette vincoli bloccanti
  di §4.1», elencandone otto colonne. La ri-derivazione da `pg_constraint` — che
  lo stesso task ordina — ne mostra **undici**: `attendances.checked_in_by`,
  `guest_list_entries.checked_in_by` e `ticket_refunds.processed_by` non sono in
  §4.1. Contare otto colonne su undici avrebbe prodotto **undici zeri mancanti
  di tre**, e la decisione D-50-16 (la cancellazione che rifiuta con la causa)
  sarebbe stata progettata su un elenco incompleto — con due porte dentro.
- **Fix:** Le tre colonne sono state aggiunte alla misura M9 ed eseguite su
  entrambi i database come le altre otto. La divergenza fra §4.1 e il catalogo
  e' riportata in `50-MEASURES.md`, come il task chiede (*«riportare le
  differenze, se ce ne sono, invece di confermare l'elenco»*).
- **Verification:** M9 restituisce undici righe su entrambi i database, tutte a
  zero; M10 le elenca con `ON DELETE` e nullabilita' letti dal catalogo.
- **Committed in:** `754461b`

**2. [Rule 3 - Blocking] I commenti nominavano il vincolo che il grep doveva non trovare**

- **Found during:** Task 2
- **Issue:** Il criterio di accettazione pretende
  `/usr/bin/grep -c "profiles_role_implies_approved" scripts/container/seed.mjs`
  a **0**. La prima stesura lasciava sette occorrenze, tutte in prosa: i commenti
  che spiegano il ritiro nominavano il vincolo alla lettera.
- **Fix:** I commenti dicono «phase 43's role-implies-approved CHECK» invece
  dell'identificativo. Il significato non cambia, il grep diventa un gate che
  puo' fallire davvero.
- **Verification:** il grep restituisce 0; `node --check` verde; `eslint` pulito.
- **Committed in:** `60861bb`

### Fuori perimetro, differito invece che corretto

**`scripts/rls-baseline.mjs` legge ancora `profiles.status`.** `resolvePersonas`
(`:742-746`) fa `select role, status … where status in (…)`, e dopo la migration
dell'onda 1 si ferma su un `42703`; `PERSONA_STATUSES` (`:674`) resta esportato
senza consumatori. Il task 2 dichiara `scripts/container/seed.mjs` e nient'altro,
e `50-02` aggiorna `rls-baseline-compare.mjs` ma non `rls-baseline.mjs`.
Registrato in `deferred-items.md` (`9d8697e`) invece di toccare un gate che
nessun criterio di accettazione stava guardando.

---

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 3) + 1 differita.
**Impact on plan:** Nessuno scostamento di perimetro. La prima correzione allarga
una misura, non il lavoro; la seconda rende verificabile un gate che il piano
aveva gia' chiesto.

## Issues Encountered

- **Il laboratorio era da riattivare?** No: interrogato all'inizio del task 3,
  rispondeva gia' `ACTIVE_HEALTHY`. Nessuna riattivazione necessaria.
- **`email_deliveries` a zero in produzione sembra un errore e non lo e'.** Le
  sette consegne del laboratorio sono quelle degli acquisti di prova della fase
  49; la produzione non ha mai venduto. Verificato con un `count(*)` diretto
  (C1), perche' un `group by` su una tabella vuota e un `group by` non eseguito
  restituiscono la stessa cosa — `[]`.

- **`gsd-sdk query state.update-progress` ha sovrascritto i contatori di
  progetto con quelli della sola milestone**, e con due numeri fra loro
  incoerenti: ha risposto `percent 83` (34 piani su 41) e ha scritto
  `percent: 25` (3 fasi su 12), al posto dei 361 piani su 371 che questo
  progetto registra da sempre. I contatori sono stati **riportati alla scala di
  progetto** e incrementati di uno per il piano appena chiuso. E' una
  correzione a mano su un numero, non sul contenuto dello stato.
- **`REQUIREMENTS.md` non esiste** in questo progetto: i requisiti stanno in
  `ROADMAP.md`. `requirements.mark-complete REG-02 REG-06` risponde
  `REQUIREMENTS.md not found`, ed e' corretto che non spunti nulla — REG-06 e'
  servito da questo piano solo nella sua precondizione (la serata seminata), non
  nella sua sostanza.
- **Nessuna sezione `Performance Metrics` in `STATE.md`**, quindi
  `state.record-metric` non ha registrato la metrica. Nessun dato perso: le
  durate sono nella sezione *Performance* di questo SUMMARY.

## User Setup Required

Nessuna. Il piano non installa pacchetti (T-50-SC: nessun checkpoint di
legittimita' necessario) e non chiede alcuna configurazione esterna.

## Next Phase Readiness

- **`P-50-7` e' eseguibile** appena il laboratorio viene riseminato: la serata
  gratuita e il tier a zero esistono nello script.
- **`P-50-3` ha i suoi due soggetti** seminati e distinti.
- **Il piano 50-11 ha i suoi numeri**, e sono tutti zero: nessun account da
  cancellare, nessun sottoinsieme non cancellabile, nessuna riga storica in
  `rsvps` o in `email_deliveries`.
- **Per l'onda 1:** la migration deve nominare **tre** `CHECK` su
  `public.profiles` (`profiles_status_check`, `profiles_role_implies_approved`,
  `profiles_approved_via_check`), misurati in C5 e stampati nella forma normale
  di Postgres.
- **Attenzione per 50-02 o per il piano della migration:**
  `scripts/rls-baseline.mjs` non e' ancora aggiornato e si fermera' su un
  `42703`. Vedi `deferred-items.md`.

---
*Phase: 50-via-le-iscrizioni*
*Completed: 2026-09-21*

## Self-Check: PASSED

Cinque file su cinque presenti, cinque commit su cinque trovati in `git log`,
e ogni `file:riga` citato qui sopra riletto dal file dopo la scrittura del
SUMMARY — due riferimenti erano sfalsati e sono stati corretti prima di questo
blocco.
