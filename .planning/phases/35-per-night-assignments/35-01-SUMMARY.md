---
phase: 35-per-night-assignments
plan: 01
subsystem: supabase-data
tags: [baseline, migration-queue, human-uat, wave-0, checkpoint-closed]

# Dependency graph
requires:
  - plan: 43-final
    provides: "le sei migration su cui poggia tutta la fase 35 — committate all'inizio di questo piano, APPLICATE in produzione il 2026-08-08 durante il suo checkpoint"
provides:
  - "la cattura `35-pre`, presa PRIMA della prima riga di DDL della fase 35 — 68 policy, 21 tabelle con RLS, 294 celle di lettura, 882 sonde di scrittura"
  - "la coda di applicazione manuale 6 + 8 + 1, scritta una volta sola, con la ragione per riga e il blocco «Dopo il deploy» separato"
  - "le righe 1–6 applicate e verificate contro la produzione: la fase 35 parte da un database reale, non da un presupposto"
  - "la dichiarazione del falso verde: `npm run build` e' verde senza che nessuna delle otto migration di questa fase sia applicata"
  - "il fatto che il registro `supabase_migrations.schema_migrations` non e' mantenuto e non va usato per sapere cosa e' applicato"
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
  - "Decisione del proprietario del 2026-08-08: «procedi. se riesci applica le migration autonomamente» — le sei della fase 43 sono state applicate durante il checkpoint"
  - "Lo stato di applicazione si legge dagli OGGETTI, mai dal registro `supabase_migrations.schema_migrations`, che in questo progetto non e' mantenuto"

# Metrics
metrics:
  duration: "~50 min"
  completed: 2026-08-08
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 01: la baseline e la coda — Summary

Cattura `35-pre` presa prima di qualunque DDL della fase 35, e coda di
applicazione manuale 6 + 8 + 1 scritta in `35-HUMAN-UAT.md` con la quindicesima
migration isolata in un blocco «Dopo il deploy» e la finestra che lascia aperta
dichiarata in cima invece che in fondo. **Il checkpoint bloccante e' stato
risposto e le prime sei righe della coda sono applicate in produzione.**

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | La cattura di baseline, prima di qualunque DDL | `c854094` | tre catture `35-pre` sotto `.planning/phases/32-capability-model-in-the-database/baseline/` |
| 2 | `35-HUMAN-UAT.md` — la coda 6 + 8 + 1 in testa | `2da1e3e` | `.planning/phases/35-per-night-assignments/35-HUMAN-UAT.md` |
| 3 | [BLOCKING] La coda letta e accettata prima di scrivere DDL | `af1fc27` | risposta registrata; documento riscritto sullo stato reale |

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

### 1. [Rule 2 — funzionalita' critica mancante] La riga zero — SOLLEVATA, ACCERTATA, CHIUSA

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
- **Come e' finita:** **accertata il 2026-08-08, ed e' applicata.** Interrogata
  in produzione, `public.my_access_context()` risponde con `user_id` presente nel
  payload. **La coda e' di quindici righe, non sedici.** Nella stessa verifica
  sono risultati presenti anche `private.has_capability` **con l'argomento
  `p_party_id`** — l'aggancio che questa fase estende —, `private.capabilities` e
  `private.role_capabilities`: le fasi 32 e 33 sono applicate per intero.
- **Perche' resta scritta anche se la risposta e' «era applicata»:** la domanda
  non era retorica. Se la risposta fosse stata l'opposta, la riga 14 avrebbe
  ridefinito `public.my_access_context()` sopra una versione piu' vecchia, e una
  chiave sarebbe sparita **senza che nessun messaggio lo dicesse**. Un controllo
  che passa non e' un controllo inutile: e' un controllo che ha fatto il suo
  lavoro. La sezione nel documento e' stata riscritta da *«da accertare»* a
  *«accertata e chiusa»*, con l'esito.
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
- **Nota, dopo l'applicazione:** WR-04 **era gia' chiuso** nel file committato —
  `20260808001000_role_implies_approved.sql:112-116` porta gia' il
  `DROP CONSTRAINT IF EXISTS`. La riga nel documento resta perche' vincola le
  **otto** migration che questa fase deve ancora scrivere, non le sei che erano
  gia' a posto.
- **Commit:** `2da1e3e`

### 4. [Rule 1 — una frase diventata falsa] La precisione del falso verde

- **Trovata durante:** task 3, riscrivendo il documento dopo l'applicazione.
- **Il fatto:** il documento diceva *«`npm run build` sara' verde per tutta questa
  fase senza che nessuna migration sia applicata»*. Dopo il 2026-08-08 quella
  frase e' **letteralmente falsa**: sei migration sono applicate.
- **Cosa e' stato fatto:** corretta in *«senza che nessuna delle otto migration di
  questa fase sia applicata»*, con una riga aggiunta che dice che **aver applicato
  le sei della fase 43 non cambia il significato del verde di una virgola**.
  Sostanza e forza dell'avvertimento invariate.
- **Perche' non e' stata lasciata com'era:** una frase esatta ieri e falsa oggi,
  dentro un documento che esiste per denunciare le verifiche falso-positive,
  avrebbe insegnato a non fidarsi del documento — che e' il modo in cui un
  avvertimento smette di funzionare.
- **Commit:** `af1fc27`

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
| I sei controlli sopra, ri-eseguiti dopo la riscrittura del task 3 | gli stessi | **PASS** — 6 e 9 invariati, riga 15 e blocco «dopo il deploy» intatti |
| Le sei migration applicate hanno prodotto gli oggetti attesi | interrogazione del catalogo di produzione, otto oggetti | **PASS** — vedi la tabella prima/dopo |

**Cosa queste verifiche NON provano.** I sei controlli sul documento sono
**controlli di forma**: dicono che i nomi ci sono e sono nell'ordine giusto, non
che l'ordine sia giusto. L'unica verifica di sostanza di questo piano e'
l'interrogazione del catalogo di produzione dopo l'applicazione — e prova che
**gli oggetti esistono**, non che il prodotto funzioni con essi: quello si vede
solo deployando il codice ed eseguendo le prove manuali.

**In particolare, e va detto perche' e' la cosa piu' facile da fraintendere:
nessuna prova manuale della fase 43 e' stata eseguita.** Applicare sei migration
non chiude nessuna delle diciotto voci di `43-HUMAN-UAT.md`: le rende
**possibili**. Rimandato non e' verificato.

`npm run build` non e' stato eseguito perche' **questo piano non tocca una sola
riga di codice del prodotto**: eseguirlo avrebbe prodotto un verde che non
significa niente — esattamente il falso verde che il documento appena scritto
esiste per denunciare.

---

## Il checkpoint bloccante, risposto

Il **task 3** e' `checkpoint:human-verify` con `gate="blocking"`, e questo piano
e' `autonomous: false`. **Non e' stato auto-approvato**: e' stato presentato al
proprietario e l'esecuzione si e' fermata fino alla risposta.

**Risposta del proprietario, alla lettera:**

> «procedi. se riesci applica le migration autonomamente»

**Data: 2026-08-08.**

I tre punti del checkpoint sono quindi accettati — l'ordine della coda, il falso
verde del build, e la decisione gia' presa di rimandare la verifica manuale alla
fine della costruzione (`ACCESS-MODEL-DECISIONS.md § 12`, con il prezzo
dichiarato). La seconda frase della risposta ha aggiunto un mandato che il
checkpoint non prevedeva, ed e' stato eseguito.

### Cosa e' stato applicato, e cosa e' stato osservato dopo

**Le sei migration della fase 43 sono applicate in produzione**, in ordine,
ognuna senza errore. Prima di applicarle e' stato contato quanto sarebbe stato
violato dal vincolo nuovo: **i quattro profili di produzione — uno
`master/approved` e tre `member/approved` — lo soddisfano tutti**, e nessun
oggetto della fase 43 era gia' presente. Nessuna applicazione a meta' da
districare, nessuna decisione per riga da prendere.

| Oggetto | Prima | Dopo |
|---|---|---|
| `profiles_role_check` | `master, organizer, member` | `master, organizer, staff, member` |
| `profiles_role_implies_approved` | assente | presente |
| `public.membership_acts` | assente | tabella presente |
| `attendances.entry_role` | assente | presente |
| `reconcile_master()` | assente | presente |
| `record_membership_act()` | assente | presente |
| `private.capabilities` | 8 righe | **9 righe** |
| `private.role_capabilities` | 16 righe | **20 righe** |

**Nessuna riga di `profiles` e' stata rifiutata, cancellata o riscritta.**

**WR-04 era gia' chiuso nel file committato**, non e' stato aggiustato per
l'occasione: `20260808001000_role_implies_approved.sql:112-116` porta gia'
`DROP CONSTRAINT IF EXISTS` prima dell'`ADD`. Nessun file di migration e' stato
modificato da questo piano.

**Il codice della fase 43 resta non deployato, e va bene cosi':** e' il verso
sicuro dell'accoppiamento — migration applicate con codice vecchio, verificato
percorso per percorso dal piano 43-06. Il verso opposto e' quello che rompe.

### Un fatto osservato, non un difetto introdotto qui

Il registro della CLI, `supabase_migrations.schema_migrations`, **si ferma a
`20260806161753`, ed era gia' cinque righe indietro prima di qualunque cosa
fatta da questo piano.** In questo progetto le migration si applicano a mano e
quel registro non viene mantenuto. **E' stato lasciato intatto di proposito**:
riallinearlo di soppiatto avrebbe fabbricato una storia che nessuno ha vissuto.

La conseguenza operativa e' scritta anche in `35-HUMAN-UAT.md`, perche' chi
applichera' le righe 7–14 la incontrera': **lo stato di applicazione si legge
dagli oggetti — il vincolo, la tabella, la colonna, la funzione — mai dal
registro.** Leggere il registro e concluderne che non e' applicato niente e' un
errore raggiungibile oggi.

### Cosa NON e' stato fatto

- **Nessuna delle otto migration di questa fase e' stata applicata**: non
  esistono ancora, questo piano non produce DDL.
- **Nessun deploy** del codice.
- **Nessun file del prodotto toccato.**
- **`43-VERIFICATION.md` non e' stato modificato**: e' fuori dal perimetro di
  questo piano, e il suo aggiornamento spetta all'orchestratore.
- **`npm run verify:capabilities` non e' stato eseguito.** I due conteggi che lo
  script pretende — 9 capability e 20 grant — sono stati **letti dal catalogo** e
  coincidono con i 36/20/16 dichiarati oggi, ma **due conteggi letti non sono
  un'esecuzione verde**, e la differenza e' scritta anche nel documento.

---

## Threat Flags

**Nessun file di codice e nessun file di migration e' stato scritto o modificato
da questo piano.** Ma sei migration sono state **applicate**, e questo muove
davvero il confine di sicurezza in produzione: va guardato, non liquidato.

**La direzione e' monotona verso il rifiuto**, che e' il verso permesso:

- `role ⇒ approved` **restringe** chi puo' tenere un ruolo di staff — non
  concede niente a nessuno, e i quattro profili esistenti lo soddisfacevano gia';
- `membership_acts` append-only **toglie** a chi scrive nel registro il potere di
  riscriverlo;
- il quarto ruolo `staff` **non raggiunge niente che `member` non raggiunga
  gia'** — misurato cella per cella dalla fase 43 su 21 tabelle e 3 operazioni;
- le 4 righe in piu' in `private.role_capabilities` sono le due di `staff` e le
  due di `register.read`, tutte gia' dichiarate e contate.

**Nessun allargamento di accesso e' stato applicato.** Se lo fosse stato, sarebbe
stata una decisione da presentare prima, non un effetto collaterale
dell'esecuzione di un checkpoint.

Le voci del threat register del piano sono coperte:

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
- commit `af1fc27` — FOUND
- `.planning/STATE.md` e `.planning/ROADMAP.md` — **NON MODIFICATI**, come da
  contratto worktree
- `.planning/phases/43-role-model-account-creation/43-VERIFICATION.md` — **NON
  MODIFICATO**, fuori perimetro
