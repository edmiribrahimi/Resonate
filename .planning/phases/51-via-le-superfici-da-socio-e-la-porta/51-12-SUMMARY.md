---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 12
subsystem: supabase-data
tags: [migration, account-acts, membership-code, attendances, D-51-02, D-51-08, D-51-14, D-51-15, laboratorio]

requires:
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 11
    provides: "i nomi gia' scritti nel codice — `record_account_act`, `account_acts`, i due `CHECK`, la policy — che questa migration deve rispettare alla lettera"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 08
    provides: "il corpo di `reconcile_master` e di `handle_new_user` da cui questa migration riparte: `CREATE OR REPLACE` sostituisce, non fonde"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 05
    provides: "`51-CATALOG.md` — sette vincoli e tre indici invece di due e due, l'ACL letta dove vive davvero, e i conteggi di `attendances` a zero su entrambi i progetti"

provides:
  - "`supabase/migrations/20260922180000_drop_membership_code_and_rename_acts.sql` — un file, una transazione, sette passi"
  - "`scripts/purge-attendances.mjs` — cancellazione per chiave, con autorizzazione che si consuma una volta, provata sul laboratorio fino in fondo"
  - "il laboratorio senza `profiles.membership_code`, senza `public.attendances`, col registro che si chiama `account_acts` e sa ancora creare un account"
  - "`51-CATALOG.md` §4 — la prova sul laboratorio, con i numeri, le fonti e le ore UTC"

affects:
  - "51-13 — porta in produzione IL CODICE E POI QUESTA MIGRATION, dentro un solo atto autorizzato; fra i due passi la creazione di un account fallisce"
  - "51-13 — `51-AUTHORISATION.md` deve portare il blocco di concessione nella forma che `purge-attendances.mjs` legge, o lo strumento rifiuta"
  - "51-13 — la domanda sulla cancellazione delle presenze NON ha soggetti: si porta al proprietario il numero zero, non una richiesta di autorizzazione"
  - "la corsa «dopo» di P-51-1 — sul laboratorio il registro e la creazione di account funzionano da ora; prima erano rotti, ed era la finestra dichiarata"

tech-stack:
  added: []
  patterns:
    - "Un corpo `plpgsql` non e' risolto per nome alla creazione: e' la proprieta' che rende possibile il guasto silenzioso di un `DROP COLUMN`, e la stessa che permette a una migration di nominare gli oggetti come si chiameranno alla fine della propria transazione"
    - "Quando l'idempotenza non e' esprimibile (nessun `RENAME CONSTRAINT … IF EXISTS`), si dichiara il limite invece di metterne meta': un `IF EXISTS` parziale salta il primo passo in silenzio e fallisce sul secondo con la causa sbagliata"
    - "Prima di togliere un oggetto dallo schema si cerca chi lo NOMINA nel prodotto, non solo chi lo scrive: il lettore di un censimento e' un lettore, e rompendolo rompe una funzione che non c'entra"
    - "Un ramo che non gira non e' provato: se il conteggio reale e' zero, si fabbrica un soggetto usa-e-getta dove non costa nulla, o si consegna alla produzione un percorso mai eseguito"
    - "Uno zero che FERMA una decisione si prende da due fonti come uno zero che la conclude: altrimenti «non c'e' niente» e «ho guardato nel posto sbagliato» sono indistinguibili"
    - "Un pavimento si abbassa solo con la causa nota, dichiarata e datata PRIMA che il numero si muova — mai perche' e' scattato"

key-files:
  created:
    - "supabase/migrations/20260922180000_drop_membership_code_and_rename_acts.sql"
    - "scripts/purge-attendances.mjs"
  modified:
    - ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-CATALOG.md"
    - "src/app/(admin)/admin/members/actions.ts"
    - "src/app/(admin)/admin/members/MemberActionNotice.tsx"
    - "scripts/seed-lab-door.mjs"
    - "scripts/rls-baseline-container.mjs"
    - ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/deferred-items.md"

key-decisions:
  - "I sette vincoli col prefisso vecchio si rinominano TUTTI, non i tre `CHECK` soltanto: la ragione non e' funzionale ma di leggibilita' del catalogo — un residuo `membership_acts_*` su una tabella `account_acts` e' cio' che una fase successiva ritrova credendo che la tabella di prima esista ancora"
  - "L'indice della chiave primaria non si rinomina per nome: segue il proprio vincolo. I due indici senza vincolo si'"
  - "`DROP TABLE` senza `CASCADE`: la cascata in uscita e' misurata vuota, e se qualcosa fosse comparso dopo la misura un `CASCADE` se lo porterebbe via in silenzio mentre senza fallisce e lo nomina"
  - "Il file NON e' idempotente e lo dichiara: `RENAME CONSTRAINT` e `ALTER POLICY` non hanno forma `IF EXISTS`, e metterne meta' produrrebbe un fallimento con la causa sbagliata. Le due cancellazioni la tengono"
  - "Il messaggio del `RAISE EXCEPTION` dello scrittore cambia prefisso col nome della tabella: i chiamanti si diramano sull'`ERRCODE` (`P0002`), mai sul testo — verificato leggendo i tre siti"
  - "`purge-attendances.mjs` fa rispettare l'autorizzazione invece di ricordarla: legge il documento, verifica atto/concessione/data/non-esaurimento, e lo marca esaurito da solo dopo l'atto"
  - "A zero righe lo strumento prende COMUNQUE il contatore dalla seconda fonte, e questo va oltre la regola: e' il caso in cui una misura cieca costa di piu', perche' ferma una decisione"
  - "L'account di prova resta sul laboratorio (`@lab.invalid`, ruolo `attendee`): e' l'evidenza che la creazione funziona, ed e' additivo — nessun `--reset`, nessuna precondizione della corsa «dopo» toccata"

patterns-established:
  - "Una migration che rinomina dichiara in intestazione che la finestra esiste su ENTRAMBI i lati del deploy, e che l'asimmetria e' la DURATA: il criterio non e' «quale non rompe» ma «quale rompe per meno tempo»"

requirements-completed: [MEM-01, MEM-02]

duration: ~85min
completed: 2026-09-22
---

# Fase 51 Piano 12: la seconda migration, applicata al solo laboratorio — Riepilogo

**Il laboratorio non ha piu' `profiles.membership_code`, non ha piu'
`public.attendances`, il registro degli atti si chiama `account_acts` con i suoi
sette vincoli, tre indici e la policy rinominati uno per uno — e sa ancora
creare un account, provato creandone uno davvero. La produzione non e' stata
toccata.**

## Performance

- **Durata:** ~85 minuti
- **Task:** 3, piu' un commit di deviazione bloccante fra il primo e il terzo
- **File:** 2 creati, 6 modificati
- **Verifica:** `npm run build` **exit 0**; `verify:capabilities` **5/5 verde**
  contro il laboratorio; prova funzionale eseguita sul laboratorio. Nessun test
  runner esiste per il prodotto (`meta-gates.md`), e non si dice il contrario.

---

## Task 1 — la migration (`7de647d`)

`supabase/migrations/20260922180000_drop_membership_code_and_rename_acts.sql`,
913 righe, **zero `BEGIN;` e zero `COMMIT;`**, timestamp maggiore di quello del
piano 51-08 (`20260922120000`).

L'intestazione riproduce la forma della fase 50 con il contenuto della 51, e
porta due paragrafi che quel modello non aveva:

- **«I corpi nominano gia' gli oggetti come si chiameranno alla fine».** Le
  sezioni 1-3 scrivono `INSERT INTO public.account_acts` e
  `PERFORM public.record_account_act(…)` prima che le sezioni 4 e 5 creino quei
  nomi. Funziona perche' un corpo `plpgsql` non e' risolto per nome alla
  creazione — **la stessa proprieta'** che rende possibile il guasto silenzioso
  di un `DROP COLUMN`, usata nel verso utile.
- **«Si applica una volta sola, e lo dice invece di fingere».** Vedi la
  deviazione 4.

I sette passi, nell'ordine dichiarato: scrittore ridefinito su firma identica →
`handle_new_user` per intero senza il conio → i due chiamanti → `ALTER FUNCTION
… RENAME TO` → tabella e satelliti → `DROP COLUMN` → guardia e `DROP TABLE`.

**I corpi delle quattro funzioni sono stati riletti da `pg_get_functiondef` sul
laboratorio**, non ricopiati dalle migration storiche. Era il rischio nominato
dal piano 51-08 accanto a se' stesso (*«se le due si invertissero, quella del
51-12 riporterebbe qui il letterale vecchio»*): `CREATE OR REPLACE` sostituisce
il corpo per intero, e ripartire da un corpo di prima avrebbe resuscitato il
valore di ruolo che la migration precedente aveva appena tolto.

---

## Deviazione bloccante — i tre lettori vivi delle presenze (`d936852`)

**Prima di togliere una tabella si cerca chi la NOMINA, non solo chi la
scrive.** La ricerca ha trovato tre siti che il piano non elencava, e uno dei
tre e' la ragione per cui questo commit sta fra il task 1 e il task 3.

| File | Cosa era | Cosa sarebbe successo dopo il `DROP` |
|---|---|---|
| `src/app/(admin)/admin/members/actions.ts` | una voce di `BLOCKING_SETS`, il censimento che precede la cancellazione di un account | `42P01` → `censusBlockingSets` restituisce `null` → **nessun account si sarebbe piu' potuto cancellare**, con `write_failed` e senza dire perche' |
| `src/app/(admin)/admin/members/MemberActionNotice.tsx` | la copy del rifiuto corrispondente | il build non compila senza la voce dell'unione |
| `scripts/seed-lab-door.mjs` | la tabella nell'elenco di `--reset` | `--reset` si sarebbe fermato a meta' — lo stato che quel file dichiara **peggiore di uno non azzerato** |

Piu' un quarto, di natura diversa:

| File | Cosa era | Cosa sarebbe successo |
|---|---|---|
| `scripts/rls-baseline-container.mjs` | `FLOOR_RLS_ENABLED_TABLES = 20` | il container replica le migration, quindi da questo file in poi costruisce **19** tabelle RLS: il banco avrebbe stampato *«the schema did not build. Nothing was measured»* su uno schema costruito perfettamente |

Il pavimento e' passato a **19**, con la causa, la data e il numero di partenza
scritti accanto — `32-04-SUMMARY.md` registra `postgres 17.6, 20 tables with row-level
security`. **Non e' «il pavimento e' stato abbassato perche' e' scattato»**: la
regola che quel numero porta addosso vieta di reagire a un rosso, e qui la causa
e' nota e dichiarata prima che il numero si muova.

`npm run build` **exit 0** dopo il commit.

---

## Task 2 — lo strumento della cancellazione (`2411c97`)

`scripts/purge-attendances.mjs`. Le sette richieste del piano, e due cose in
piu' che sono deviazioni dichiarate sotto.

| Passo | Come |
|---|---|
| rifiuto | il ref di produzione e' rifiutato come **prima riga eseguita**; senza `--dry-run` o `--apply` rifiuta a sua volta — *uno strumento senza modo di default e' uno strumento che si usa per sbaglio* |
| autorizzazione | legge `51-AUTHORISATION.md`, verifica `act`, `granted`, `spent` e `granted_on` contro `--dated`, e **lo marca esaurito da solo** dopo l'atto |
| conteggio | per provenienza, `party_id` valorizzato e nullo **separati per tutto il referto** |
| cascata | dal catalogo, **due direzioni interrogate separatamente**, dichiarando quale non entra nell'istantanea |
| istantanea | file datato su percorso `.env*` — coperto da `.gitignore`: contiene righe, e `.planning/` e' pubblico |
| chiavi | catturate **dalla stessa interrogazione che le conta**, stampate nel referto |
| atto | `DELETE … WHERE id = ANY(ARRAY[…]::uuid)`, due statement per due popolazioni |
| controllo | **PostgREST** con la chiave di servizio, con una guardia che verifica che l'URL nomini il bersaglio dell'atto |

### La prova, e perche' non si e' fermata a zero

A tabella vuota il ramo della cancellazione **non gira**, e un ramo che non gira
non e' provato: sarebbe stato consegnato al piano 51-13 — cioe' alla produzione —
un percorso di cancellazione mai eseguito una volta. Quindi **una riga usa-e-getta
seminata sul laboratorio**, con `party_id` valorizzato ed `entry_role`
palesemente finto, e lo strumento lanciato su di lei.

| Corsa | Ora UTC | Esito |
|---|---|---|
| `--dry-run` a tabella vuota | 17:43:54Z | 0/0/0, cascata in uscita vuota, istantanea scritta, uscita **0** |
| `--apply` a tabella vuota | 17:43:56Z | *«zero righe, su entrambe le fonti»*, atto **non eseguito**, uscita **0** |
| `--dry-run` con una riga | 17:44:29Z | `party_id` valorizzato **1**, chiave catturata e stampata |
| `--apply` con una riga | 17:44:32Z | **1 riga cancellata per chiave**, PostgREST riconta **0**, uscita **0** |
| rilettura indipendente | 17:44:4xZ | `attendances` **0 righe**, **0** con l'etichetta della prova |
| `--apply --project <produzione>` | — | **RIFIUTO, uscita 2**, nessuna lettura |

Il vicinato misurato dalle corse coincide **riga per riga** con `51-CATALOG.md`
§3d, letto quattro ore prima e da una corsa diversa.

I numeri, le fonti e i limiti sono in `51-CATALOG.md` §4.

---

## Task 3 — applicata al LABORATORIO, e riletta dal catalogo

**Applicata alle 17:45:54Z** con
`POST /v1/projects/$LAB_PROJECT_REF/database/migrations`, `HTTP 200`,
version **`20260922180000`**, name `drop_membership_code_and_rename_acts`.

**La risposta del `POST` non e' una prova.** Le sette riletture, dal catalogo,
**alle 17:46:10Z**, confrontate con la linea di base presa alle **17:45:40Z**
sullo stesso progetto (e coincidente con `51-CATALOG.md` §2):

| | Prima (17:45:40Z) | Dopo (17:46:10Z) |
|---|---|---|
| **(a)** `profiles.membership_code` | colonna `text`, vincolo `profiles_membership_code_key`, indice omonimo | **nessuna delle tre righe torna** — colonna, `UNIQUE` e indice assenti |
| **(b)** `to_regclass` | `membership_acts` ✓, `account_acts` `NULL` | `membership_acts` **`NULL`**, `account_acts` ✓ |
| **(c)** vincoli / indici / policy | 7 vincoli, 3 indici, 1 policy — **tutti col prefisso vecchio** | 7 vincoli, 3 indici, 1 policy — **tutti col prefisso nuovo**, zero residui |
| **(d)** ACL (`pg_class.relacl`, `aclexplode`) | `service_role`: `MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE` | **identica**, carattere per carattere. Il `REVOKE` di `20260808005000` e' sopravvissuto al rinomina |
| **(e)** le quattro funzioni | `record_membership_act/8` | `record_account_act/8`; tutte e quattro `prosecdef = true`, `proconfig = search_path=""` |
| **(f)** `to_regclass('public.attendances')` | `attendances` | **`NULL`**, e zero policy residue |
| **(g)** prova funzionale | — | vedi sotto |

Il `COMMENT ON TABLE` riletto misura **876** caratteri (erano 461, identici su
lab e produzione): e' stato riscritto, non ereditato.

### (g) La prova funzionale — un account creato davvero

Un `SELECT` sul catalogo non direbbe mai che una funzione `plpgsql` si e' rotta.
Quindi il percorso di `createAccount` e' stato riprodotto sul laboratorio:
`auth.admin.createUser` (che fa scattare `handle_new_user`) e poi
`rpc("record_account_act", …)`.

    account creato : d37e6042-…
    atto registrato: 15ee9e78-…
    subject_label  : d37e6042   ← atteso d37e6042 — COINCIDE
    profilo dal trigger: role = "attendee", full_name valorizzato

**Entrambe le funzioni che il `DROP COLUMN` avrebbe rotto in silenzio
funzionano**, e `subject_label` porta le prime 8 cifre dell'identificativo del
soggetto (D-51-15).

### Una prova in piu', che il piano non chiedeva

`reconcile_master` **gira a ogni deploy** ed e' il secondo chiamante dello
scrittore, ma il suo ramo di retrocessione — quello che chiama davvero
`record_account_act` — non si percorre in stato stazionario. Provato dentro un
**rollback voluto**: un blocco `DO` fabbrica un secondo master, chiama la
funzione, legge il risultato e solleva.

    PROVA outcome=reconciled promoted=false demoted=1 masters=1 atti_di_riconciliazione=1

Cioe': il ramo e' stato percorso, `PERFORM public.record_account_act(…)` si e'
risolto e ha inciso la sua riga. **Rilettura dopo: zero atti di riconciliazione
residui, e i ruoli invariati** (1 master, 1 organizer, 1 staff). Il rollback ha
tenuto. Se il nome non si fosse risolto l'errore sarebbe stato `42883` invece di
quello voluto — cioe' la prova distingue i due casi.

### I gate

| Comando | Bersaglio | Esito |
|---|---|---|
| `npm run build` | — | **exit 0** |
| `npm run verify:capabilities` | **laboratorio** | **5/5 verde, 0 warning** |
| `npm run verify:capabilities` | produzione (senza `.env.lab.local`) | **3/5** — le due chiavi che il piano 51-08 toglie sono ancora li'. E' la finestra che chiude il 51-13, non una regressione |
| `npm run verify:refusal` | laboratorio | **uscita 2**, 10 righe su 11 rifiutano — **D-51-08-B**, gia' registrata: le tabelle del calendario di produzione sono vuote sul laboratorio, e riempirle violerebbe il guardrail 5. L'unica riga misurabile, `production_pipeline_rule`, **ha tenuto**: 16 contro 0 |
| `npm run verify` | produzione (nessun env di lab) | `VERIFY_FAIL — 3`: `verify:capabilities` (riga sopra), `verify:venue-surfaces` (G2, gia' differita), `verify:touch-targets` (3 elementi, rosso preesistente gia' differito). **Nessuno dei tre e' di questo piano** |
| `npm run baseline:rls` | laboratorio | non gira — vedi sotto |

`baseline:rls` si e' fermato prima di misurare: *«3 artefacts for
`--phase-point=pre` already exist»*. E' la sua regola *«a captured artefact is
never overwritten»*, non un esito sullo schema. Il controllo che **questa fase**
governa — quello a due vie fra `PROBE_PAYLOADS` e le tabelle RLS del bersaglio —
e' stato isolato e interrogato a parte:

    tabelle RLS sul laboratorio : 40   (pavimento del banco ospitato: 20)
    «not RLS-enabled tables»    : nessuna      ← il lato di questa fase, pulito
    account_acts fra le RLS     : true
    membership_acts / attendances : assenti

Il lato «has no entry for» conta **16** tabelle, tutte nate fra la fase 44 e la
49. E' un debito precedente e non di questo piano: registrato come
**D-51-12-A**.

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] I tre lettori vivi delle presenze, piu' il pavimento del container

Raccontata sopra. Quattro file fuori da `files_modified`, e senza il primo il
`DROP TABLE` avrebbe tolto la possibilita' di cancellare un account — **in
silenzio**, perche' il messaggio all'operatore sarebbe stato `write_failed`.
D-51-14 autorizza esplicitamente l'estensione: *«la tabella va con le sue policy,
i suoi vincoli, i suoi indici e ogni oggetto che la nomina»*.

### 2. [Rule 2] Il secondo conteggio anche sul ramo «zero righe»

Il piano chiede il contatore da una fonte diversa **dopo l'atto**. Lo strumento
lo prende **anche quando l'atto non avviene**, perche' quello zero non e'
neutro: **ferma una decisione**. Letto da una fonte sola, *«non c'e' niente»* e
*«ho guardato nel posto sbagliato»* sono indistinguibili — e la guardia sull'URL
del contatore e' l'altra meta' della stessa risposta. Se le due fonti
divergessero lo strumento si ferma e lo dice, invece di scegliere.

### 3. [Rule 2] Una riga usa-e-getta, per provare il ramo che non girava

Raccontata sopra. Additiva, sul laboratorio, cancellata dallo strumento stesso
nello stesso minuto, e riletta a zero da due fonti.

### 4. [CLAUDE.md] Il file non e' idempotente, e lo dichiara

`supabase-data.md` (gate *idempotenza DDL*) chiede `IF EXISTS`. **Su un rinomina
quella forma non esiste**: PostgreSQL non ha `RENAME CONSTRAINT … IF EXISTS` ne'
`ALTER POLICY … IF EXISTS`, e la sezione 5 ne fa otto in fila.

Metterlo solo dove la sintassi lo permette produrrebbe il caso **peggiore**: alla
seconda esecuzione il rinomina della tabella verrebbe saltato in silenzio e la
riga dopo fallirebbe comunque, nominando un vincolo su una tabella che non si
chiama piu' cosi'. Un fallimento con la causa sbagliata e' peggio di un
fallimento con la causa giusta. Le due **cancellazioni** tengono `IF EXISTS`:
li' la forma costa nulla e sono i due passi irreversibili.

**Conseguenza sul controllo automatico del task 1.** Il piano cerca
`DROP TABLE public.attendances`; il file scrive
`DROP TABLE IF EXISTS public.attendances`. Il criterio di accettazione —
*«il `DROP TABLE` e' preceduto dalla guardia che solleva se non e' vuota»* — e'
soddisfatto; il `grep` letterale no. Non e' stato aggirato scrivendo la stringa
in un commento.

---

## Cosa NON e' stato fatto, e perche'

- **La produzione non e' stata toccata.** Nessuna chiamata a
  `POST /v1/projects/cjsfocnhfzycbbgkwocx/…`, in nessun modo, in nessun momento.
  Ogni interrogazione di questo piano e' passata dal ref del laboratorio, e ogni
  strumento scritto o usato rifiuta il ref di produzione come prima riga
  eseguita. Nessun `git push`, nessun deploy. Il deploy del laboratorio lo fa
  l'orchestratore dopo questo piano; la produzione la fa il piano 51-13, sotto
  autorizzazione datata.
- **Nessun `--reset` sul laboratorio.** Le precondizioni vive della corsa
  «dopo» — la voce di guest list ancora `invited`, i due biglietti non
  scansionati, la riga di scansione della corsa `P-50-8` — sono intatte:
  misurate dopo la migration, `door_scan_events` = 2, `tickets` = 5,
  `event_parties` = 3.
- **L'account di prova resta** (`@lab.invalid`, ruolo `attendee`). E' additivo,
  e' l'evidenza che la creazione funziona, e cancellarlo passerebbe da
  `deleteAccount`, che e' una superficie e non uno strumento di verifica.
- **Il ramo dell'autorizzazione non e' stato percorso fino in fondo.**
  `51-AUTHORISATION.md` non esiste ancora — lo scrive il 51-13 — quindi sono
  stati provati solo i suoi **rifiuti**. La forma esatta che quel documento deve
  avere e' un **contratto**, scritto nel docblock in testa allo strumento.
- **`src/utils/qr.ts:52-58` e `src/types/database.ts:968`** nominano ancora la
  credenziale della porta, e **non sono di nessuno**: registrate come
  **D-51-12-B**. La citazione e' corretta finche' il piano che la chiude non ha
  chiuso, e chiude con il 51-13.
- **`supabase/schema.sql:58`** resta com'e': e' lo schema di base, non la fonte
  di verita' dello schema (guardrail 3), e il banco del container lo legge nella
  versione del commit iniziale.
- **`npm run verify:persona`** non e' stato lanciato: nessun file di
  `.claude/**` ne' `CLAUDE.md` e' stato toccato.

---

## Tracking — a mano, e perche'

`gsd-sdk query state.*` **non e' stato invocato**: il piano 51-11 ha misurato
che su questo `STATE.md` scrive contatori che non corrispondono a nessuna
posizione reale e riscrive prosa dentro il racconto di un'altra fase. Al suo
posto:

- `ROADMAP.md`: `51-12-PLAN.md` spuntato, e **12/15 → 13/15**, contato dai
  SUMMARY su disco.
- `STATE.md`: **solo il frontmatter**, `last_updated` e
  `completed_plans 46 → 47`. Il contatore globale era gia' indietro prima di
  questa fase e **non e' stato ricalcolato**.
- `requirements.mark-complete` non eseguito: questo progetto non ha un
  `REQUIREMENTS.md` — i requisiti stanno nelle tabelle di `ROADMAP.md`.

---

## Threat Flags

Nessuna superficie di sicurezza nuova: questa migration ne **toglie** una
(`profiles.membership_code`, una credenziale che nessuna porta verificava piu').
Le disposizioni `mitigate` del registro del piano sono tutte applicate e
verificate — T-51-51 dalla prova funzionale (g), T-51-52 dalla cancellazione per
chiave davvero eseguita, T-51-53 dalla guardia `DO`, T-51-54 dall'ACL riletta,
T-51-55 dal limite scritto dentro la migration, T-51-56 dal rifiuto come prima
riga eseguita.

---

## Self-Check: PASSED

Verificato dopo la scrittura di questo riepilogo:

- `supabase/migrations/20260922180000_drop_membership_code_and_rename_acts.sql` — **FOUND**
- `scripts/purge-attendances.mjs` — **FOUND**, `PRODUCTION_REF` e `= ANY` presenti
- `51-CATALOG.md` §4 «la prova sul laboratorio» — **FOUND**
- `deferred-items.md` D-51-12-A e D-51-12-B — **FOUND**
- commit `7de647d`, `d936852`, `2411c97` — **tutti presenti in `git log`**
- laboratorio: `account_acts` presente, `membership_acts` e `attendances`
  assenti, `profiles.membership_code` assente — **riletto dal catalogo**
- `npm run build` — **exit 0**
