---
phase: 35-per-night-assignments
plan: 01
subsystem: supabase-data
tags: [baseline, migration-queue, human-uat, wave-0, checkpoint-open]

# Dependency graph
requires:
  - plan: 43-final
    provides: "le sei migration committate e NON applicate su cui poggia tutta la fase 35 (`43-VERIFICATION.md`: migrations_applied 0, deployed false)"
provides:
  - "la cattura `35-pre`, presa PRIMA della prima riga di DDL della fase 35 — 68 policy, 21 tabelle con RLS, 294 celle di lettura, 882 sonde di scrittura"
  - "la coda di applicazione manuale 6 + 8 + 1, scritta una volta sola, con la ragione per riga e il blocco «Dopo il deploy» separato"
  - "la dichiarazione del falso verde: `npm run build` e' verde senza che nessuna migration sia applicata"
  - "una riga zero da accertare che nessun documento precedente aveva sollevato"
affects: [35-02, 35-03, 35-04, 35-05, 35-06, 35-14, 35-18, 35-21]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "la baseline si cattura prima della DDL, e la prova che sia stata catturata prima e' meccanica: nessun file `supabase/migrations/202608090*` nella stessa revisione"
    - "una coda di migration applicata a mano si scrive una volta, in un ordine unico, e i piani successivi la leggono invece di ricostruirla"
    - "quando una migration deve rompere la regola migration→codice, si sceglie la direzione che lascia lo stato invariato invece di quella che lo peggiora, e la si dichiara"

key-files:
  created:
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-pre.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-pre.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-pre.json
    - .planning/phases/35-per-night-assignments/35-HUMAN-UAT.md
  modified: []

key-decisions:
  - "La riga 15 si applica DOPO il deploy: applicarla prima romperebbe i caricamenti dei membri, applicarla dopo lascia aperta per la durata del deploy la stessa porta che e' aperta oggi. Fra un peggioramento e uno stato invariato si sceglie lo stato invariato"
  - "I segnaposto delle verifiche manuali sono DIECI, non sette: il conteggio del piano contraddiceva la propria fonte, e la fonte (`35-VALIDATION.md`) vince"
  - "La migration della fase 33 datata 20260808000000 entra nel documento come «riga zero da accertare»: la sua applicazione non risulta registrata da nessuna parte, e la riga 14 ridefinisce la stessa funzione"

# Metrics
metrics:
  duration: "~35 min"
  completed: 2026-08-08
  tasks_completed: 2
  tasks_total: 3
  checkpoint_open: true
---

# Fase 35 Piano 01: la baseline e la coda — Summary

Cattura `35-pre` presa prima di qualunque DDL della fase 35, e coda di
applicazione manuale 6 + 8 + 1 scritta in `35-HUMAN-UAT.md` con la quindicesima
migration isolata in un blocco «Dopo il deploy» e la finestra che lascia aperta
dichiarata in cima invece che in fondo.

**Il piano non e' completo: il task 3 e' un checkpoint bloccante ancora aperto.**

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | La cattura di baseline, prima di qualunque DDL | `c854094` | tre catture `35-pre` sotto `.planning/phases/32-capability-model-in-the-database/baseline/` |
| 2 | `35-HUMAN-UAT.md` — la coda 6 + 8 + 1 in testa | `2da1e3e` | `.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md` |
| 3 | [BLOCKING] La coda letta e accettata prima di scrivere DDL | — | **aperto: attende la risposta del proprietario** |

### Task 1 — i numeri della cattura

`npm run baseline:container -- --phase-point=35-pre`, senza `--overwrite`, exit 0.
Il container `postgres:17.6` ha applicato lo shim, lo schema base e **44 file di
migration**, seminato 12 profili su 12 celle ruolo × stato, catturato e si e'
distrutto.

| Cattura | File | Numeri |
|---|---|---|
| B1 policy | `32-BASELINE-policies.container.35-pre.json` | **68 policy**, postgres 17.6, **21 tabelle con RLS** |
| B2 letture | `32-BASELINE-reads.container.35-pre.json` | **294 celle**, 14/14 persone risolte, 21 tabelle, **0 celle vacue** |
| B3 scritture | `32-BASELINE-writes.container.35-pre.json` | **882 sonde**, 221 rifiuti, 639 successi, 22 inconcludenti |

**68 policy e' il numero contro cui si confrontera' ogni wave successiva.** Le
sei scritture vietate dal vincolo `role ⇒ approved` sono state rifiutate con
`23514` sotto il nome dichiarato, e i 21 conteggi di riga sono stati riletti
identici dopo le 882 sonde: la cattura non ha lasciato residui nel proprio
soggetto.

La prova che questa sia una baseline e non una fotografia del risultato e'
meccanica, non narrativa: nella revisione `c854094` **non esiste alcun file
`supabase/migrations/202608090*`**. Verificato prima del commit.

### Task 2 — cosa dice il documento

Le sei righe della fase 43 stanno prime, senza eccezioni. Le otto della fase 35
seguono con la dipendenza dichiarata riga per riga — la 7 ha bisogno del ruolo e
del vincolo, la 8 legge la tabella della 7, la 9 allarga il `CHECK` che nasce
alla 3, la 11 usa il predicato che la 8 ha esteso, la 12 chiama
`private.has_capability` con la serata, la 13 e' puramente additiva, la 14 tocca
la funzione che il middleware chiama a **ogni richiesta**.

La quindicesima sta in un blocco a se' con la sua eccezione scritta a lettere
piene, e con la frase che il piano pretendeva in cima e non in fondo: **finche'
la riga 15 non e' applicata, il gate EXIF e' aggirabile** — chiunque abbia una
sessione di membro approvato puo' scrivere direttamente nel bucket `event-media`
saltando la rotta che spoglia i metadati.

Quella frase non e' derivata da un ragionamento: e' verificata alla fonte.
`supabase/migrations/20260225120000_phase7_media.sql:70-75` porta la policy che
oggi permette a un membro approvato di caricare nel bucket dal browser. E' la
porta che la riga 15 chiude.

---

## Deviazioni dal piano

### 1. [Rule 2 — funzionalita' critica mancante] La riga zero, che nessun documento aveva sollevato

- **Trovata durante:** task 2, verificando alla fonte quali migration `20260808*`
  esistono davvero nel repository.
- **Il fatto:** oltre alle sei della fase 43 esiste **una settima migration con
  quel prefisso**, datata `20260808000000`, che appartiene alla **fase 33**
  (`d3ee90b`) e porta `user_id` dentro il payload di `public.my_access_context()`.
  **La sua applicazione in produzione non risulta registrata da nessuna parte**:
  non in `43-VERIFICATION.md`, non in `.planning/STATE.md`, e non nelle catture
  di baseline di produzione, che portano `captured_at: 2026-08-07` — anteriori al
  giorno in cui quel file e' stato scritto. `33-HUMAN-UAT.md` e' `status: partial`
  e il passo 7 del piano 33-10 elenca proprio quel controllo come da fare.
- **Perche' conta, e non e' pedanteria:** `33-REVIEW.md:399-403` descrive il
  fallimento se non e' applicata — rimborsi che falliscono con *«Not
  authenticated»* a un master connesso, guest list con `capabilities.resolve_failed`,
  venue con `capabilities.identity_missing`: **tre sintomi scollegati di una sola
  migration mancante, in un prodotto senza error tracking**. E la **riga 14** di
  questa coda **ridefinisce la stessa funzione**: applicarla sopra una definizione
  piu' vecchia e' il modo piu' rapido per far sparire una chiave senza che nessun
  messaggio lo dica.
- **Cosa e' stato fatto:** aggiunta al documento la sezione *«La riga zero, da
  accertare prima di cominciare»*, con il modo di accertarlo (chiamare
  `public.my_access_context()` con una sessione autenticata e guardare se il
  payload porta `user_id`) e la conseguenza (se non lo porta, quella migration
  entra in coda come riga 0).
- **Una scelta di forma, dichiarata invece di nascosta:** in quella sezione il
  file e' nominato per **timestamp e descrizione**, non con il nome completo
  seguito da `.sql`. Il `<automated>` del piano pretende che il documento
  contenga **esattamente sei** file `20260808*.sql`, ed e' un'uguaglianza, non un
  minimo: scrivere il settimo nome per esteso avrebbe fatto fallire il controllo.
  **La forma e' stata piegata, il fatto no.** Se un piano futuro promuove la riga
  zero a riga di tabella, quel controllo va allargato a sette nello stesso commit.
- **File:** `.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md`
- **Commit:** `2da1e3e`

### 2. [Rule 1 — il piano contraddice la propria fonte] Sette segnaposto o dieci

- **Trovata durante:** task 2, punto 5 dell'azione.
- **Il fatto:** il piano chiede *«un elenco segnaposto delle **sette** verifiche
  manual-only di `35-VALIDATION.md`»*, e il suo `<done>` ripete «sette»; il
  `<how-to-verify>` del checkpoint dice invece «le **sei** di questa». La tabella
  *Manual-Only Verifications* di `35-VALIDATION.md:148-159` ne contiene **dieci**.
  Tre conteggi diversi per la stessa cosa.
- **Cosa e' stato fatto:** scritte **tutte e dieci**. Scriverne sette avrebbe
  significato scegliere quali tre verifiche manuali far sparire da un documento
  che esiste perche' nessuno strumento le puo' eseguire — e le tre che si
  perderebbero non sono cosmetiche: fra le voci in eccesso ci sono
  *«una persona `staff` assegnata alla porta RAGGIUNGE lo scanner»* e
  *«i metadati escono davvero dal file»*.
- **Regola applicata:** la fonte vince sul conteggio. Il numero e' un'affermazione
  sulla fonte, non un requisito indipendente.
- **Commit:** `2da1e3e`

### 3. [Rule 2 — vincolo di progetto assente dal piano] L'idempotenza delle migration

- Aggiunta al documento la riga che pretende `DROP … IF EXISTS` prima di ogni
  `ADD` per le migration di questa fase, citando il difetto WR-04 registrato
  dalla fase 43. Il piano non lo chiedeva; il contesto di fase lo dichiara
  vincolante, e una coda che si applica a mano si riapplica a mano.
- **Commit:** `2da1e3e`

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Cattura presa prima della DDL | `ls …/baseline/ \| grep 35-pre` + assenza di `supabase/migrations/202608090*` | **PASS** — tre file `35-pre`, zero migration `202608090*` nella revisione `c854094` |
| Sei file `20260808*.sql` nel documento | `grep -o '20260808[0-9]*_[a-z_]*\.sql' \| sort -u \| wc -l` | **6** |
| Nove file `20260809*.sql` nel documento | `grep -o '20260809[0-9]*_[a-z_]*\.sql' \| sort -u \| wc -l` | **9** |
| La riga 15 e' nominata | `grep -q 20260809006000_event_media_server_upload_only.sql` | **PASS** |
| Il blocco «dopo il deploy» esiste | `grep -qi 'dopo il deploy'` | **PASS** |
| Nessun indirizzo di posta nel documento | `grep -nE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'` | **PASS** — nessun match |

**Cosa queste verifiche NON provano.** Nessuna di esse dice che una migration
sia applicata, che un ordine sia giusto in produzione o che il prodotto
funzioni. Sono controlli di forma su un documento e sull'ordine di due commit.
`npm run build` non e' stato eseguito perche' **questo piano non tocca una sola
riga di codice del prodotto**: eseguirlo avrebbe prodotto un verde che non
significa niente — esattamente il falso verde che il documento appena scritto
esiste per denunciare.

---

## Il checkpoint bloccante, ancora aperto

Il **task 3** e' `checkpoint:human-verify` con `gate="blocking"`, e questo piano
e' `autonomous: false`. **Non e' stato auto-approvato e non poteva esserlo.**

**Nessuna migration e' stata applicata da questo piano. Nessun deploy e' stato
eseguito. Nessun file del prodotto e' stato toccato.**

Cosa serve dal proprietario, in una risposta sola:

1. che le prime sei della coda sono **esattamente** quelle della fase 43, che
   nessuna delle otto nuove le precede, e che la quindicesima sta in un blocco a
   parte perche' e' l'unica che si applica dopo il deploy — **e che finche' non e'
   applicata la sanitizzazione dei metadati e' aggirabile scrivendo direttamente
   nel bucket dal browser**;
2. di aver letto la frase sul falso verde: per tutta questa fase `npm run build`
   sara' verde **senza che nessuna migration sia applicata**, e il verde non e'
   evidenza;
3. la conferma della decisione gia' presa e non riaperta qui
   (`ACCESS-MODEL-DECISIONS.md § 12`): tutta la verifica manuale si esegue alla
   fine della costruzione, con il prezzo dichiarato.

E c'e' una **quarta domanda che questo piano ha aggiunto**, e che non era nel
checkbox originale: la **riga zero**. Va accertato se la migration della fase 33
datata `20260808000000` sia applicata in produzione, perche' se non lo e' la coda
non parte da quindici righe ma da sedici — e la riga 14 ci passa sopra.

**Finche' questa risposta non e' registrata qui con la data e con le parole con
cui e' stata data, il `35-VERIFICATION.md` non puo' scrivere «verificato» su
nulla di questa fase.**

- **Risposta del proprietario:** *(nessuna — checkpoint aperto al 2026-08-08)*
- **Data:** —

---

## Threat Flags

Nessuna nuova superficie di sicurezza introdotta: questo piano non tocca codice,
non tocca migration e non muove policy. Le due voci del threat register del piano
sono coperte:

| ID | Disposizione | Come |
|---|---|---|
| T-35-01 | mitigato | l'assenza di `supabase/migrations/202608090*` nella revisione della cattura e' asserita, non affermata |
| T-35-02 | mitigato | ruoli mai persone; nessun indirizzo, nessun codice di membership; controllo `grep` eseguito |
| T-35-03 | mitigato | tabella ordinata con la ragione per riga, le sei della fase 43 dichiarate prime senza eccezioni |
| T-35-SC | non applicabile | nessun pacchetto installato o modificato da questo piano |

---

## Known Stubs

Nessuno stub di codice: il piano non produce codice.

`35-HUMAN-UAT.md` porta **dieci voci `pending` senza procedura**, ed e'
deliberato e dichiarato nel documento stesso: le procedure passo-per-passo
arrivano con il piano **35-14**. Il file resta `status: partial` fino ad allora.

---

## Self-Check: PASSED

- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-pre.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-reads.container.35-pre.json` — FOUND
- `.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-writes.container.35-pre.json` — FOUND
- `.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md` — FOUND
- commit `c854094` — FOUND
- commit `2da1e3e` — FOUND
