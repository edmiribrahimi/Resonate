---
status: written
phase: 35-per-night-assignments
source: [35-01-PLAN.md, 35-14-PLAN.md, 35-VALIDATION.md, 43-HUMAN-UAT.md, ACCESS-MODEL-DECISIONS.md]
started: 2026-08-08
updated: 2026-08-09
queue_rows_applied: 6
queue_rows_total: 15
procedures_total: 13
procedures_closed: 0
closing_windows: [12, 7, 10, "11-C"]
---

# Fase 35 — le prove da fare a mano

> **A cosa serve questo file.** In questo progetto **non esistono test
> automatici del prodotto**: nessuna macchina puo' dire se una cosa funziona
> davvero. L'unica prova che esistera' e' una persona che guarda uno schermo e
> scrive cosa ha visto. Questo file e' quella lista — e, prima ancora, **l'unico
> posto in cui l'ordine di applicazione delle migration e' scritto per intero**.
> Nessun piano successivo della fase 35 lo ricostruisce: lo legge da qui.
>
> **Cosa c'e' oggi.** Il file e' **completo**: la coda di applicazione, il falso
> verde del build, le **finestre che si chiudono**, **tredici procedure**
> passo-per-passo, la dichiarazione di copertura e il debito differito con il suo
> nome. La versione di Wave 0 (piano 35-01) aveva la coda e i segnaposto; il
> piano **35-14** ha sostituito i segnaposto con le procedure.
>
> **Scritto non e' eseguito.** Tutte e tredici portano `status: pending`:
> nessuna e' stata fatta, e nessuna riga di questo file va letta come un esito.
>
> **Ruoli, mai persone.** Questo repository e' pubblico. Qui non compare nessun
> nome, nessun indirizzo di posta e nessun codice di membership: si scrive
> *«l'account di prova»*, *«una sessione staff»*, *«il valore configurato»*.

---

## Prima di tutto: l'ordine di applicazione

**Le prime sei righe di questa coda sono state applicate in produzione il
2026-08-08, e lo stato risultante e' stato verificato interrogando il database,
non dedotto.** Il ruolo `staff`, la regola *«un ruolo di staff implica
approvato»* e il registro degli atti **esistono ora nel database di produzione**.
E' il presupposto su cui poggia ogni riga della fase 35, e non e' piu' un
presupposto: e' un fatto misurato.

La coda resta di **quindici** migration: **sei** della fase 43 — **fatte** —,
**otto** della fase 35 — **da fare** —, e **una** che sta in un blocco a se'
perche' e' l'unica che si applica **dopo** il deploy del codice.

L'ordine **non e' un suggerimento**: sbagliarlo fa fallire l'applicazione nel
momento peggiore, cioe' mentre la si sta facendo.

> **Il codice della fase 43 non e' deployato, e va bene cosi'.** Il database ha
> le sei migration, l'applicazione online e' ancora quella vecchia. E' **il verso
> sicuro** dell'accoppiamento descritto piu' avanti: le migration applicate con
> il codice ancora vecchio non rompono niente — verificato percorso per percorso
> dal piano 43-06 su dieci punti del prodotto che scrivono ruolo o stato. Il
> verso opposto e' quello che rompe.

### Blocco A1 — le righe 1–6, APPLICATE il 2026-08-08

| # | File | Perche' doveva stare qui | Esito |
|---|---|---|---|
| 1 | `20260808000500_staff_role.sql` | crea il quarto ruolo `staff`. Tutto il resto lo nomina | applicata |
| 2 | `20260808001000_role_implies_approved.sql` | la regola **nomina** `staff`: prima della riga 1 non avrebbe senso | applicata |
| 3 | `20260808002000_membership_register.sql` | crea `membership_acts`, il registro degli atti | applicata |
| 4 | `20260808003000_attendances_entry_role.sql` | la colonna che segna com'e' stato un ingresso | applicata |
| 5 | `20260808004000_master_reconcile.sql` | la riconciliazione dell'account proprietario | applicata |
| 6 | `20260808005000_membership_acts_append_only.sql` | toglie a chi scrive nel registro il potere di riscriverlo. Agisce sulla tabella della riga 3 | applicata |

**Cosa e' stato osservato dopo, contro il database di produzione** — sono le
righe che rendono questa una verifica e non un'affermazione:

| Oggetto | Prima | Dopo |
|---|---|---|
| `profiles_role_check` | `master, organizer, member` | `master, organizer, staff, member` |
| `profiles_role_implies_approved` | assente | `CHECK ((role <> ALL (ARRAY['master','organizer','staff'])) OR (status = 'approved'))` |
| `public.membership_acts` | assente | tabella presente |
| `attendances.entry_role` | colonna assente | presente |
| `reconcile_master()` | assente | presente |
| `record_membership_act()` | assente | presente |
| `private.capabilities` | 8 righe | **9 righe** |
| `private.role_capabilities` | 16 righe | **20 righe** |

**Nessuna riga e' stata rifiutata, cancellata o riscritta.** Prima di applicare
e' stato contato quanto sarebbe stato violato dal vincolo nuovo: i quattro
profili in produzione — uno `master/approved` e tre `member/approved` — lo
soddisfano **tutti**, quindi non c'era nessuna decisione per riga da prendere. E
nessun oggetto della fase 43 era gia' presente: non c'era nessuna applicazione a
meta' da districare.

> **Non fidarsi del registro delle migration per sapere cosa e' applicato.** La
> tabella `supabase_migrations.schema_migrations` — il registro che tiene la CLI
> — si ferma a `20260806161753`, ed era **gia' cinque righe indietro prima di
> tutto questo**: in questo progetto le migration si applicano a mano, e quel
> registro non viene mantenuto. E' stato lasciato intatto di proposito.
>
> **Conseguenza operativa: chi vuole sapere se una riga di questa coda e'
> applicata deve guardare l'oggetto, non il registro** — il vincolo, la tabella,
> la colonna, la funzione. Leggere il registro e concluderne che non e' applicato
> niente e' un errore che questo file esiste per prevenire.

### Blocco A2 — le righe 7–14, da applicare PRIMA del deploy del codice di questa fase

| # | File | Perche' deve stare qui |
|---|---|---|
| 7 | `20260809000000_party_assignments.sql` | crea la tabella delle assegnazioni per serata: ha bisogno del ruolo `staff` (riga 1) e del vincolo `role ⇒ approved` (riga 2) |
| 8 | `20260809001000_assignment_resolver.sql` | modifica il corpo del resolver e **legge la tabella della riga 7** |
| 9 | `20260809002000_assignment_acts.sql` | allarga il `CHECK` di `membership_acts`, che nasce alla riga 3 |
| 10 | `20260809003000_party_credits.sql` | indipendente dalle altre quattro; sta qui per non spezzare la lettura, non per una dipendenza |
| 11 | `20260809004000_door_scan_events_by_assignment.sql` | riscrive una policy di `door_scan_events` usando il predicato che la riga 8 ha appena esteso |
| 12 | `20260809004500_event_media_party_id.sql` | aggiunge `party_id` a `event_media`; ha bisogno del resolver della riga 8, perche' la policy di inserimento che riscrive chiama `private.has_capability` con la serata |
| 13 | `20260809004600_event_media_quarantine_bucket.sql` | crea il bucket **privato** di quarantena. E' puramente additiva: non rompe niente in nessun ordine |
| 14 | `20260809005000_live_assignment_flag.sql` | aggiunge **una chiave** al payload di `public.my_access_context()` leggendo la tabella della riga 7. Chiude il blocco perche' quella funzione e' chiamata dal middleware a **ogni richiesta**: si applica quando tutto il resto e' gia' in piedi. Se resta non applicata, la chiave semplicemente non arriva e il gate grossolano si comporta come oggi |

**Le otto della fase 35 vengono dopo tutte e sei quelle della fase 43, senza
eccezioni** — e da oggi quella condizione e' **soddisfatta**, non piu' da
attendere. Non c'e' mai stato un caso in cui convenisse anticiparne una: le
righe 7, 9 e 14 nominano oggetti che le righe 1, 2 e 3 creano.

Fra loro, invece, l'ordine 7 → 14 **e' ancora tutto da rispettare**: e' l'unica
parte della coda che nessuno ha ancora percorso.

### Blocco B — «Dopo il deploy», e la sua eccezione scritta a lettere piene

| # | File | Quando | Perche' proprio qui |
|---|---|---|---|
| 15 | `20260809006000_event_media_server_upload_only.sql` | **dopo** il deploy del codice di questa fase | toglie al browser il permesso di scrivere nel bucket `event-media` |

Questa e' **l'unica riga della coda che rompe la regola migration→codice**, e la
rompe in una sola direzione. Da quando e' applicata, `event-media` accetta
scritture **solo dal service role**, cioe' solo dalla rotta che spoglia i
metadati.

- **Applicarla prima del deploy** lascerebbe i caricamenti dei membri **rotti**
  fino al deploy, perche' il codice vecchio scrive ancora dal browser — ed e' il
  comportamento di oggi: la policy in vigore permette a un membro approvato di
  caricare direttamente nel bucket.
- **Applicarla dopo** lascia aperta, per la durata del deploy, **la stessa porta
  che e' aperta oggi**. Non peggiora nulla rispetto allo stato attuale.

Fra un peggioramento e uno stato invariato si sceglie lo stato invariato, e **lo
si dichiara invece di scoprirlo**.

> **Finche' la riga 15 non e' applicata, il gate EXIF e' aggirabile.** Chiunque
> abbia una sessione di membro approvato puo' scrivere nel bucket `event-media`
> **saltando la rotta che spoglia i metadati**, e quindi caricare un file con
> dentro le coordinate GPS di dove e' stato scattato. Sta scritto qui, in cima, e
> non in fondo: e' una finestra aperta, con una data di chiusura che dipende da
> un'operazione manuale.

### La riga zero, accertata e chiusa il 2026-08-08

C'era **una migration della fase 33, datata `20260808000000`** — quella che porta
`user_id` dentro il payload di `public.my_access_context()` — la cui applicazione
in produzione non risultava registrata da nessuna parte: non in
`43-VERIFICATION.md`, non in `.planning/STATE.md`, e non nelle catture di
baseline di produzione, tutte anteriori al giorno in cui quel file e' stato
scritto.

**E' stata accertata, ed e' applicata.** Interrogata in produzione,
`public.my_access_context()` risponde con la chiave `user_id` presente nel
payload. **La coda e' di quindici righe, non sedici.**

Nella stessa verifica sono stati trovati presenti anche `private.has_capability`
**con l'argomento `p_party_id`** — l'aggancio che questa fase estende —,
`private.capabilities` e `private.role_capabilities`: le fasi 32 e 33 sono
applicate per intero.

**Perche' valeva la pena accertarlo, e resta scritto:** se non fosse stata
applicata, ogni percorso che crea un artista, una venue o una guest list sarebbe
gia' fallito con `capabilities.identity_missing`, e `33-REVIEW.md` avverte che i
sintomi sono **tre** e la causa **una sola** — in un prodotto senza error
tracking. E la **riga 14** ridefinisce proprio `public.my_access_context()`:
applicarla sopra una definizione piu' vecchia sarebbe stato il modo piu' rapido
per far sparire una chiave senza che nessun messaggio lo dicesse.

---

## Le finestre che si chiudono

Quasi tutte le prove di questo file si possono fare domani o fra un mese: la
decisione del proprietario (§ in fondo) le rimanda alla fine della costruzione, e
va bene. **Quattro no.** Non perche' siano piu' importanti, ma perche' dopo un
certo momento **non c'e' piu' niente da guardare** — l'occasione di osservarle si
chiude da sola, e chiuderla significa perdere la prova, non rimandarla.

| Prova | La finestra | Cosa si perde se si aspetta |
|---|---|---|
| **12** — l'upgrade di IndexedDB v4 → v5 su una coda non vuota | **prima della prima serata reale**, e prima che qualunque telefono della porta abbia aggiornato il bundle | E' l'unica **irreversibile** di questa fase. Il suo fallimento distrugge **dati**, non codice: presenze gia' scansionate che spariscono da un telefono, in silenzio, senza error tracking che lo dica. Dopo l'aggiornamento non si puo' piu' costruire lo stato «coda piena su v4» senza reinstallare un bundle vecchio |
| **7** — una persona `staff` assegnata **raggiunge** lo scanner | **prima della prima serata reale** | Il suo fallimento si scoprirebbe altrimenti **davanti a una fila**, alle due di notte, con l'unica persona che poteva fare i biglietti rimbalzata su `/dashboard`. Non e' irreversibile, e' semplicemente il momento sbagliato per scoprirlo |
| **10** — i metadati escono davvero dal file | **prima che un fotografo assegnato carichi il primo file da dentro una sede segreta** | E' l'unico momento in cui il suo fallimento diventa irreversibile: una foto pubblicata con le coordinate GPS **e' una rivelazione di sede in corso**, e `venue-secrecy.md` non ha rollback. Prima di quel primo caricamento la prova costa un file di test; dopo, costa una sede |
| **11**, caso **C** — nessuno riceve un 503 nella finestra fra deploy e coda | **fra il deploy del codice e l'applicazione della riga 8**, e in nessun altro momento | Vedi la nota in testa alla prova 11: **applicando la coda per prima il caso C non e' rimandato, e' perso** |

**Le altre nove non hanno una finestra** e seguono la decisione del proprietario.
Dirlo e' parte del deliverable: una lista in cui tutto e' urgente e' una lista in
cui niente lo e'.

---

## Il falso verde: quello che `npm run build` non prova

**`npm run build` sara' verde per tutta questa fase senza che nessuna delle otto
migration di questa fase sia applicata.** Il typecheck di Next legge i tipi da
`src/types/database.ts`, un file del repository, **non dal database vivo**:
nessuna riga di quel file sa se una tabella esiste davvero da qualche parte.

**Aver applicato le sei della fase 43 non cambia questo di una virgola.** Il
verde di ieri e il verde di domani sono lo stesso verde, e nessuno dei due sa
niente del database.

Quindi un build verde qui e' **uno stato di verifica falso-positivo**, non una
prova. Dire *«compila, quindi funziona»* in questa fase e' esattamente
l'affermazione che il progetto non puo' permettersi, perche' non ci sono test a
smentirla.

L'unico posto in cui la DDL di questa fase viene **davvero esercitata** prima che
una persona la applichi a mano e' `npm run baseline:container`: costruisce un
`postgres:17.6` usa e getta, applica lo schema e **tutta** la coda di migration,
semina, cattura e distrugge il container. Se una migration di questa fase e'
sintatticamente rotta o fuori ordine, e' li' che si vede — e in nessun altro
posto.

### Due trappole del comparatore, misurate e non dedotte

**1. Non confrontare contro una cattura anteriore al terzo asse.** Il piano
35-06 ha aggiunto al seed **tre account e tre assegnazioni** (commit `6f40458`):
da li' in poi ogni cattura precedente ha un seed diverso, e il comparatore
riporta differenze che **non vengono dalla migration in esame**. Misurato dal
piano 35-18: contro `35-19` escono **12 difetti `b2_count_changed`** su
`profiles` (12 → 15 righe) e `party_assignments` (2 → 5). Il piano 35-15 e'
inciampato nella stessa cosa e l'ha risolta con una **cattura di controllo a
seed identico**.

`35-19` e' la trappola peggiore perche' **il nome sembra recente**: e' stata
presa in un worktree parallelo piu' vecchio del terzo asse. La regola, scritta
una volta: **si confronta contro `35-06-final` o piu' recente** — oggi
`35-final` — e mai contro un punto anteriore, salvo il confronto di fase contro
`35-pre`, che e' voluto e i cui `+4` sono gia' attribuiti.

**2. Un `baseline:container` verde NON prova che la porta dello storage sia
chiusa.** La cattura registra **solo lo schema `public`**: `grep -c '"storage"'`
= **0** su ogni cattura di questa fase, quindi il bucket non c'e' dentro. E un
`DROP POLICY IF EXISTS` con il nome **sbagliato** e' un no-op che si applica
pulito — il caso peggiore possibile: **verde e bucato**. Il piano 35-21 ha
quindi provato la riga 15 contro **due container** costruiti apposta, uno senza
e uno con:

| | policy `Members can upload event media` |
|---|---|
| 52 migration (senza la riga 15) | **presente**, `INSERT`, `{authenticated}` |
| 53 migration (con la riga 15) | **assente** |

**Chi verifica deve fare lo stesso, non fidarsi della cattura.** E il presidio
strutturale che tiene la linea nel tempo e' il controllo **D** di
`npm run verify:media-strip`, che confronta byte per byte il nome droppato con
quello che la migration originale ha **creato**.

---

## La regola: le migration prima, il codice dopo. Mai il contrario

Vale per le righe 1–14 senza eccezioni. La riga 15 e' l'unica eccezione, ed e'
dichiarata sopra.

**Ed e' esattamente lo stato in cui si trova la produzione oggi:** le sei
migration della fase 43 sono applicate, il codice della fase 43 **non e'
deployato**. Non e' una situazione a meta': e' il verso sicuro, quello descritto
qui sotto.

Il motivo non e' prudenziale, e' **misurato**. Il piano 43-12 ha registrato un
accoppiamento duro: se il codice viene deployato senza la migration numero 5,
**ogni singolo login finisce con `master=unavailable` nella barra degli
indirizzi**, per tutti, ogni volta. Senza la numero 3, la pagina del registro
mostra il proprio messaggio di lettura fallita e ogni approvazione o cambio di
ruolo fallisce con *«The write failed»*.

**Il verso opposto e' sicuro**: le migration applicate con il codice ancora
vecchio non rompono niente. E' stato verificato percorso per percorso dal piano
43-06 — dieci punti del prodotto che scrivono ruolo o stato restano compatibili
con la regola nuova. Il codice vecchio semplicemente non usa le cose nuove.

**E le migration di questa fase vanno scritte idempotenti** — `DROP … IF EXISTS`
prima di ogni `ADD` — perche' si applicano a mano, e una coda che si applica a
mano si riapplica a mano. La fase 43 ha registrato la mancanza come difetto
(WR-04): non e' una preferenza di stile, e' cio' che rende ripetibile un'operazione
che qualcuno fara' di sera, una volta sola, senza rete di sicurezza.

---

## La prova piu' economica, subito dopo l'applicazione

**[serve una mano tecnica]** Un solo comando:

```
npm run verify:capabilities
```

Deve diventare **verde**. Se resta rosso, l'applicazione e' andata a meta' — ed
e' la maniera piu' rapida e piu' economica di scoprirlo, prima che lo scopra
qualcuno alla porta.

**Dopo le sei della fase 43, i due conteggi che lo script pretende sono stati
letti in produzione e coincidono**: `private.capabilities` porta **9 righe** e
`private.role_capabilities` ne porta **20**, cioe' i 36/20/16 che lo script
dichiara oggi. **Il comando non e' stato eseguito**: sono due conteggi letti dal
catalogo, non un'esecuzione verde. La differenza si scrive, perche' e'
esattamente il tipo di scorciatoia che questo file esiste per impedire.

**Attenzione: in questa fase i conteggi attesi cambiano, ed e' voluto.** Lo
script pre-registra la propria aritmetica accanto alla dichiarazione che conta
(`scripts/verify-capabilities.mjs:347-349`):

| | oggi | dopo la fase 35 |
|---|---|---|
| coppie ruolo × capability | **36** | **48** |
| grant dichiarati | **20** | **26** |
| rifiuti dichiarati | **16** | **22** |

La fase 35 conia **tre chiavi nuove**: 4 ruoli × 3 chiavi = 12 coppie in piu',
che si dividono in 6 grant e 6 rifiuti. **Abbassare un totale per far passare una
esecuzione e' il fallimento che quelle costanti esistono per intercettare**, ed
e' gia' successo una volta (mutazione C del piano 43-02). I numeri si muovono
solo quando si muove il **modello**, e in questa fase si muove.

Gli altri conti automatici della fase, tutti `[serve una mano tecnica]`:

| Comando | Cosa deve dire |
|---|---|
| `npm run build` | `✓ Compiled successfully` — **e nient'altro**: vedi il falso verde |
| `npm run verify:capabilities -- --target=container` | verde, con i totali nuovi |
| `npm run verify:no-header-identity` | zero lettori di header fuori dal middleware |
| `npm run verify:no-credit-account` | il percorso del credito non importa l'admin API |
| `npm run verify:media-strip` | i cinque controlli, ognuno provato per mutazione |
| `npm run baseline:container` + `npm run baseline:compare` | il confronto contro la cattura **pre-fase** `35-pre` |

La cattura di riferimento e' stata presa **prima della prima riga di DDL di
questa fase**, il 2026-08-08:
`.planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.container.35-pre.json`
e le due sorelle — **68 policy, 21 tabelle con RLS, 294 celle di lettura, 882
sonde di scrittura**. Ogni confronto di questa fase si misura contro quei numeri.

---

## Le prove da fare a mano

Sono **tredici**: dieci prese da `35-VALIDATION.md § Manual-Only Verifications`,
la **11**, che non viene da li' perche' il buco che prova e' stato trovato
**durante l'esecuzione** — dal piano 35-12, e chiuso dal piano **35-22** — e le
**12** e **13**, che nascono da cio' che questa fase ha **costruito** e che
nessuna tabella prevedeva.

**Le procedure ci sono, e cominciano dopo questa tabella.** La versione di Wave 0
di questo file aveva solo i segnaposto; il piano **35-14** li ha sostituiti con i
passi, il ruolo, le precondizioni e cosa deve succedere.

Nessuna di queste e' rimandabile a uno strumento. Ognuna esiste perche' un
comando di questo repository **non puo'** rispondere alla domanda che pone.

> **Sulla numerazione, per chi arriva da `35-14-PLAN.md`.** Quel piano chiede
> *dodici* procedure e le numera per conto suo. La numerazione **che vale e'
> quella di questo file**, perche' era gia' pubblicata quando il piano e' stato
> scritto ed e' gia' citata da `deferred-items.md` voce 11, da `35-22-SUMMARY.md`
> e dalla dichiarazione di copertura in fondo. Rinumerare per far tornare un
> piano avrebbe rotto tre riferimenti vivi. La corrispondenza, per intero:
>
> | Piano 35-14 | Questo file | | Piano 35-14 | Questo file |
> |---|---|---|---|---|
> | 1 (ASSIGN-02, offline) | **1** | | 7 (IndexedDB v4→v5) | **12** |
> | 2 (ASSIGN-03, coda) | **2** | | 8 (demozione bloccata) | **13** |
> | 3 (ASSIGN-05, frase) | **3** | | 9 (la porta) | **7** |
> | 4 (ASSIGN-05, offline) | **4** | | 10 (il fotografo) | **8** |
> | 5 (ASSIGN-08) | **5** | | 11 (l'organizer di una notte) | **9** |
> | 6 (la superficie) | **6** | | 12 (i metadati) | **10** |
>
> La **11** di questo file non e' fra le dodici del piano: e' arrivata dopo, dal
> piano 35-22. Le prove sono quindi **tredici**, non dodici, e il numero piu'
> alto non e' un errore di conteggio.

| # | Cosa deve essere vero | Req | Perche' nessuno strumento ci arriva | status |
|---|---|---|---|---|
| 1 | L'accesso a una notte finita non funziona su un dispositivo che non vede la rete da ore | ASSIGN-02 | nessuno strumento del repository raggiunge un telefono con la radio spenta, e l'orologio del telefono e' **evidenza, mai autorita'** | `pending` |
| 2 | Una scansione gia' in coda non resta appesa quando l'assegnazione viene revocata | ASSIGN-03 | la coda vive in IndexedDB, sul dispositivo | `pending` |
| 3 | Il rifiuto dell'undo arriva come **frase distinguibile**, non come «qualcosa e' andato storto» | ASSIGN-05 | Next redige i messaggi delle Server Action **solo in produzione**: una prova in sviluppo non dice niente | `pending` |
| 4 | L'undo locale con la radio spenta non aggira la supervisione | ASSIGN-05 | il ramo vive nel client dello scanner, sul dispositivo | `pending` |
| 5 | L'autorizzazione si risolve **una volta sola**, all'apertura | ASSIGN-08 | «quante volte una chiamata parte» e' comportamento del client: N scansioni ⇒ N check-in e **zero** chiamate d'autorizzazione | `pending` |
| 6 | La superficie di assegnazione fa quello che dice, e l'atto finisce nel registro con autore e ora | ASSIGN-01, ASSIGN-06 | interfaccia | `pending` |
| 7 | Una persona `staff` assegnata alla porta **RAGGIUNGE** lo scanner | ASSIGN-01 | il rimbalzo avviene nel middleware, prima che qualunque pagina esista: nessuna matrice e nessun typecheck lo vede. **Senza la riga 14 applicata la prova e' falsa-negativa per configurazione** | `pending` |
| 8 | L'assegnazione «photo» sblocca il caricamento, e senza non lo sblocca | ASSIGN-01 | il gate vive in due Server Action e l'esito si vede solo dall'interfaccia pubblica dell'evento | `pending` |
| 9 | L'organizer di una notte vede quella notte e non l'altra | ASSIGN-01 | e' un gate che **deve poter fallire**, e il fallimento si osserva cambiando la serata nell'indirizzo a mano | `pending` |
| 10 | I metadati escono davvero dal file, e il video verso una notte segreta e' rifiutato | ASSIGN-01 | nessuno strumento del repository apre un file e ne legge l'EXIF: la spoglia e' una proprieta' **a tempo d'esecuzione**. Vale **solo con la riga 15 applicata** | `pending` |
| 11 | Una persona `staff` assegnata alla porta **SCANSIONA** quella notte — e non un'altra — e prima che la coda sia applicata nessuno riceve un 503 | ASSIGN-01, ASSIGN-08 | il permesso per-notte non esiste finche' la riga 8 non e' applicata, quindi **nessun comando di questo repository puo' osservarlo**: `npm run build` e' verde con zero migration applicate. E il terzo caso vive in una finestra che si chiude da sola. Procedura **sotto**, non in 35-14 | `pending` |
| 12 | L'upgrade di IndexedDB **v4 → v5** su un dispositivo che porta gia' una coda non vuota non perde nemmeno una presenza | ASSIGN-02, ASSIGN-08 | lo step di upgrade gira **dentro il browser di quel telefono**, su dati che esistono solo li': nessuno script di questo repository apre un IndexedDB. **Finestra irreversibile** | `pending` |
| 13 | La demozione bloccata da un'assegnazione viva **nomina le serate** e offre l'uscita | ASSIGN-01, ASSIGN-03 | il rifiuto e' un `23503` classificato per **nome di vincolo** e arricchito con una seconda lettura: cosa arrivi sullo schermo si vede solo sullo schermo | `pending` |

**Due dipendenze dalla coda, dichiarate qui perche' cambiano l'esito e non solo
il calendario.** La prova **7** e' falsa-negativa finche' la riga 14 non e'
applicata: la sessione `staff` verrebbe rimbalzata per una ragione diversa da
quella che la prova cerca. La prova **10** e' falsa-positiva finche' la riga 15
non e' applicata: si puo' osservare un file spogliato dalla rotta **mentre** la
porta del browser resta aperta accanto.

> **Una nota di numerazione che evita un errore reale.** `35-VALIDATION.md`, nella
> riga *«Una persona `staff` assegnata alla porta RAGGIUNGE lo scanner»*, dice
> *«senza la migration 12»*. **Intende questa stessa riga, che oggi e' la 14**:
> `20260809005000_live_assignment_flag.sql`. Quando quel documento e' stato
> scritto la coda della fase 35 era di otto righe e quel file era il dodicesimo;
> il piano 35-18 ne ha poi inserite due prima di lui (`…004500` e `…004600`) e
> l'ha spinto in fondo. **La numerazione autorevole e' quella di questo file** —
> il documento in cui la coda e' scritta per intero — e chi applica va per **nome
> di file**, mai per numero d'ordine ricordato a memoria. `35-VALIDATION.md` non
> e' stato corretto di proposito: la sua tabella e' una dichiarazione onesta di
> cosa un comando puo' provare, e non si ritocca per farla concordare a valle.

**E una terza, di segno opposto.** I casi **A** e **B** della prova **11**
pretendono la riga 8 applicata; il caso **C** pretende che **non** lo sia. Non e'
una contraddizione: sono due momenti diversi della stessa sera di lavoro, e
l'ordine fra loro non e' negoziabile — **C prima, poi la coda, poi A e B**.

---

## Come si leggono le procedure

Ogni prova dice **chi la fa**, **cosa serve prima**, **i passi uno per uno**,
**cosa deve succedere** e **cosa significa se non succede**. L'ultima riga non e'
una cortesia: senza, chi esegue non sa distinguere una prova passata da un
fallimento che sembra plausibile — ed e' quella la maniera tipica in cui una
verifica manuale produce un verde falso.

**Chi.** I ruoli usati nelle tabelle, sempre gli stessi:

| Nome nella procedura | Cos'e' |
|---|---|
| **il proprietario** | l'account `master`. Fa i passi che non richiedono competenza tecnica |
| **un organizer** | un account `organizer`, `approved` |
| **l'assegnatario** | un account `staff`, `approved`, **senza** capability di porta o media dal ruolo: l'unico modo in cui puo' fare qualcosa e' l'assegnazione. E' il soggetto della meta' di questa fase |
| **un secondo `staff`** | come sopra, ma **assegnato a nessuna notte**. Serve a distinguere i rifiuti |
| **[serve una mano tecnica]** | il passo pretende terminale, DevTools, `exiftool`, o l'applicazione di una riga della coda. **Non e' un passo per il proprietario** |

**Ruoli, mai persone.** Questo file e' pubblico: non contiene nomi, indirizzi di
posta, codici di membership, date non annunciate ne' sedi. Chi esegue sostituisce
mentalmente gli account di prova ai ruoli, e **non li scrive qui**.

**Il campo di prova, comune a quasi tutte.** Un **evento pubblicato con due
serate distinte**, `notte A` e `notte B` — e per la prova 8 ne serve uno con
**tre**. Due serate sono il minimo per cui *«per-notte»* e *«per-evento»*
producono risultati diversi: con una sola serata **ogni prova di questa fase
passa per costruzione**, ed e' la forma piu' educata di vacuita'.

**Come si scrive l'esito.** Accanto alla prova: la data, chi l'ha eseguita (per
ruolo), e **cosa e' stato osservato** — non «ok». In un repository senza test
runner quella riga e' l'unica prova che esistera'.

---

## Prova 1 — la notte finita, su un dispositivo che non vede la rete da ore

**Requisito:** ASSIGN-02 · **status: pending** · nessuna finestra

**Chi la fa.** Un organizer, con un telefono. Nessuna mano tecnica per i passi
1–4; il passo 5 chiede DevTools.

**Cosa serve prima.** Le righe 7–14 applicate e il codice in deploy. Una serata
il cui orario di fine sia **gia' passato**, e una **senza** orario di fine.

**La domanda che pone.** `validUntil` — l'istante oltre il quale l'assegnazione
non vale piu' — e' una **cortesia** o un **confine**? Deve essere una cortesia:
il confine vive nel database, sull'orologio del server, dentro
`private.has_capability`. Se il telefono comincia a rifiutare da solo, l'orologio
del dispositivo e' diventato autorita' — e un orologio storto rifiuta un ospite
valido davanti a una fila.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | organizer | Aprire `/admin/scanner` su `notte A` **prima** della fine della notte, attendere il caricamento della lista, poi mettere il telefono in **modalita' aereo** | La lista si popola. Il verdetto della porta e' stato risolto **ora**, ed e' l'unica volta |
| 2 | organizer | Restare in aereo fino **oltre** l'ora di fine della serata, poi guardare lo schermo senza toccarlo | Il bottone **QR Scan sparisce** e compare una riga gialla: *«This night is over — it ended at HH:MM. Nothing has been removed…»*, con un bottone **Scan anyway** |
| 3 | organizer | Contare le voci in coda | Il chip `Pending` mostra **lo stesso numero di prima**. **Nessuna voce e' sparita** |
| 4 | organizer | Premere **Scan anyway** e scansionare | Il bottone QR Scan **torna** e la scansione avviene. La notte finita **nasconde**, non vieta |
| 5 | **[mano tecnica]** | DevTools → Application → IndexedDB → `resonate-checkin` | Nessuna riga rimossa dalla coda, e i `scannedAt` originali sono intatti |
| 6 | organizer | Aprire una serata **senza** orario di fine | **Non compare nessuna riga** e non si nasconde niente: dove non c'e' una scadenza non se ne inventa una |
| 7 | organizer | Spostare l'orologio del telefono **avanti di due ore** e riaprire una notte **in corso** | Compare la riga della deriva: *«This device's clock is N min ahead of the server…»*. La riga «notte finita» **puo'** comparire — ed e' esattamente per questo che «Scan anyway» esiste. **Nessuna scansione viene rifiutata dal dispositivo** |

**Cosa significa se la coda si svuota** (passo 3 o 5). `validUntil` e' stato
trattato come un **confine** invece che come una cortesia, e quel confine ha
cancellato dati. Sono presenze di persone che hanno pagato, perse su un telefono
che nessuno puo' interrogare. **E' un difetto da correggere prima della serata
successiva**, non da annotare.

**Cosa significa se al passo 7 una scansione viene rifiutata.** L'orologio del
dispositivo ha deciso. E' l'errore peggiore dei due — *«rifiutare un ospite
valido e' peggio che ammetterne uno doppio»* — perche' avviene davanti a una
fila e senza appello.

**Osservare quale delle due parti decide.** In aereo decide il **dispositivo**, e
puo' solo nascondere; online decide il **server**, e puo' rifiutare. Se il
dispositivo rifiuta, le due parti si sono scambiate il ruolo.

---

## Prova 2 — una scansione in coda non resta appesa quando l'assegnazione viene revocata

**Requisito:** ASSIGN-03 · **status: pending** · nessuna finestra

**Chi la fa.** L'assegnatario, con un telefono, e un organizer da un secondo
dispositivo. Il passo 5 chiede DevTools.

**Cosa serve prima.** Righe 7–14 applicate, codice in deploy. L'assegnatario
assegnato alla **porta** di `notte A`. Un biglietto valido e non usato.

**La domanda che pone.** Il drain giudica una scansione al tempo in cui e'
**avvenuta** (`scannedAt`) o al tempo in cui **arriva**? Deve essere il primo:
una persona e' entrata quando e' entrata, e una revoca decisa dopo non puo'
cambiare cosa e' successo alla porta.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | assegnatario | Aprire `/admin/scanner` su `notte A` online, attendere il caricamento | La lista si popola |
| 2 | assegnatario | **Modalita' aereo.** Scansionare il biglietto | Flash verde. Il chip `Pending` sale di uno |
| 3 | organizer | Da un altro dispositivo, su `/organizer/events/[id]/assignments`, **revocare** l'assegnazione dell'assegnatario su `notte A` | Esito positivo. La riga sparisce dall'elenco «chi lavora» |
| 4 | assegnatario | Riaccendere la radio e **attendere il drain** | La scansione si **risolve**, e il chip `Pending` **scende**. L'ingresso compare in `door_scan_events` con `source = 'offline_sync'` |
| 5 | **[mano tecnica]** | DevTools → Application → IndexedDB → `resonate-checkin` | La voce non e' piu' in `pendingCheckins`, e **non e' finita in `blocked`** |
| 6 | **[mano tecnica]** | Interrogare `party_assignments` per quell'account e quella notte | La riga **esiste ancora**, con `revoked_at` valorizzato. Se e' **sparita**, la revoca e' una `DELETE`: la storia della serata e' stata riscritta e questa prova non ha piu' senso |

**Il segnale d'allarme, scritto perche' non venga scambiato per lentezza: il
contatore «ancora in attesa» che non scende dopo una riconnessione.** Se non
scende, la voce e' finita nel bucket `blocked` — che aspetta **un nuovo login**.
Un nuovo login non restituisce un'assegnazione revocata, quindi quella voce
resterebbe li' **per sempre**: una presenza che nessuno sa di aver perso, su un
telefono che nessuno guarda.

**Cosa significa se la voce riparte in continuazione** invece di fermarsi. E'
finita nel bucket **retry**, tipicamente per un `503`: ogni evento `online` la
fa ripartire, tutta la notte, su una rete debole. E' lo stesso fallimento visto
dall'altro lato, ed e' descritto anche nella prova 11, caso C.

---

## Prova 3 — il rifiuto arriva come frase distinguibile

**Requisito:** ASSIGN-05 · **status: pending** · nessuna finestra ·
**vale SOLO in un build di produzione**

> **Perche' solo in produzione, e per quale meta'.** Next **redige i messaggi
> d'errore delle Server Action** soltanto nel build di produzione: in `next dev`
> il messaggio grezzo arriva al client, quindi una prova fatta li' **non prova
> niente** — mostrerebbe una frase precisa che gli utenti veri non vedranno mai.
> Vale per il caricamento media, che passa da due Server Action.
>
> **La meta' dell'annullamento non dipende dalla redazione, e va detto invece di
> lasciarlo scoprire.** `POST /api/tickets/checkin/undo` e' una **route**, non
> una Server Action: il rifiuto torna come **valore** nel corpo
> (`"status":"door_supervision_required"`) e il client lo legge da li', **mai da
> `err.message`**. Quella frase si vede anche in sviluppo. **La prova si fa
> comunque in produzione**, perche' e' li' che il prodotto vive e perche' una
> regressione verso `err.message` sarebbe **invisibile** in sviluppo e totale in
> produzione.

**Chi la fa.** L'assegnatario e un organizer. Serve un build di produzione
raggiungibile.

**Cosa serve prima.** Righe 7–14 applicate. L'assegnatario assegnato alla **sola
porta** di `notte A` — **senza** `door.supervise`. Un check-in gia' registrato
sul server per `notte A`.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | assegnatario | **Online**, su `notte A`, premere **Undo** su un check-in gia' riportato al server e confermare | **Rifiutato.** Nel Network: `403`, con `"status":"door_supervision_required"` nel corpo. Sullo schermo la frase di **supervisione**, che dice **cosa fare**: chiedere a un organizer **di questa notte** |
| 2 | assegnatario | Rileggere la frase | **Non** deve essere *«This account is not allowed to check people in»* — quello e' il rifiuto generico di porta, ed e' un'altra cosa. E **non** deve essere «qualcosa e' andato storto» |
| 3 | organizer | Stessa azione, stesso check-in, con un account organizer | **Procede.** L'annullamento avviene e la lista di revisione della serata lo mostra |
| 4 | assegnatario | Tentare un caricamento media senza esserne assegnato (vedi prova 8) | Due frasi **diverse** a seconda di **quale** delle due Server Action ha rifiutato: la validazione o la scrittura. La distinzione e' fatta **per posizione nella sequenza**, non leggendo il messaggio — che in produzione non c'e' |

**Cosa significa se i due esiti sono uguali** (passi 1 e 3). Il gate di
supervisione non c'e': chi ha solo la porta puo' annullare, e ASSIGN-05 e' vuota.

**Cosa significa se la frase e' generica.** E' il precedente registrato del form
newsletter — *«Qualcosa e' andato storto»* — su un percorso che qualcuno
percorrera' **alle due di notte con una persona davanti**. Un rifiuto che non
dice cosa fare, alla porta, e' indistinguibile da un guasto.

---

## Prova 4 — l'annullamento locale con la radio spenta non aggira la supervisione

**Requisito:** ASSIGN-05 · **status: pending** · nessuna finestra

**Chi la fa.** L'assegnatario e un organizer, con un telefono. Il passo 5 chiede
DevTools.

**Cosa serve prima.** Righe 7–14 applicate, codice in deploy. Assegnatario sulla
**sola porta** di `notte A`.

**La domanda che pone.** La regola di supervisione vive **solo** nella route?
Se si', si aggira **spegnendo la radio**: prima di questa fase l'annullamento
offline cancellava la riga dalla coda senza chiedere niente a nessuno.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | assegnatario | Aprire `notte A` **online** e attendere il caricamento | Il verdetto e' risolto e messo in cache **ora**: e' l'unica volta |
| 2 | assegnatario | **Modalita' aereo.** Scansionare un biglietto | Flash verde, `Pending` sale di uno |
| 3 | assegnatario | Premere **Undo** su quella scansione e confermare | **RIFIUTATO ad alta voce.** Titolo *«This check-in was NOT undone»*, dettaglio *«Undoing a check-in needs a supervisor. Ask an organizer for this night.»* Il chip `Pending` **non cambia** e la persona resta entrata |
| 4 | organizer | Ripetere i passi 1–3 con un account organizer | **L'annullamento riesce.** Titolo *«Undone on this device»*, dettaglio *«… — held here, not yet reported»*. `Pending` scende di uno e **compare** il conteggio *«Undone at the door, held on this device (1)»* |
| 5 | **[mano tecnica]** | DevTools → IndexedDB → `resonate-checkin` | La voce **esiste ancora**, con `state: "undone"`, `undoneAt` e `undoneBy` valorizzati. **Non e' sparita** |
| 6 | organizer | Tornare online e attendere il drain | La voce annullata **non viene inviata**, non compare fra i falliti, e il conteggio viola resta. **Nessuna riga di ammissione** per quella persona compare in `door_scan_events` |
| 7 | assegnatario | Svuotare i dati del sito, mettere in aereo **senza aver mai aperto la notte online**, aprire lo scanner e tentare un annullamento | **Terzo esito, distinto.** Titolo *«This device has not been told who may undo tonight»*, e il dettaglio dice che **non e' un rifiuto dell'account**: la domanda non ha avuto risposta |

**Cosa significa se al passo 4 la voce sparisce dalla coda** invece di restare
marcata. Il record della serata non contiene l'annullamento, e *«il percorso piu'
semplice per far rientrare qualcuno»* e' tornato invisibile. Il conteggio viola
esiste apposta: **escluso dal drain** e' accettabile, **invisibile** no.

**Cosa significa se al passo 6 compare un ingresso in `door_scan_events`** per la
persona annullata. Il drain ha riportato l'**ammissione** che la reversione
annulla: ha rimesso dentro qualcuno che era stato tolto alla porta.

**Cosa significa se il passo 7 mostra la frase del passo 3.** I due esiti sono
stati **collassati**: un rifiuto di permesso e un *«non lo so»* sono diventati la
stessa frase, e chi la legge andra' a cercare il problema nel posto sbagliato.

---

## Prova 5 — l'autorizzazione si risolve una volta sola

**Requisito:** ASSIGN-08 · **status: pending** · nessuna finestra

**Chi la fa.** Un organizer. **[serve una mano tecnica]**: il telefono va
collegato a DevTools.

**Cosa serve prima.** Righe 7–14 applicate, codice in deploy. Tre biglietti
validi e non usati per `notte A`.

**La domanda che pone.** Quante richieste parte per ogni persona che entra? Deve
esserne **una**: quella del check-in. Il verdetto della porta viaggia sulla
risposta che lo scanner **gia' chiede** all'apertura della notte, quindi non
esiste nessun endpoint di autorizzazione da chiamare — ed e' questo che rende il
conteggio possibile.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | **[mano tecnica]** | Telefono collegato via `chrome://inspect`, tab **Network**, filtro `Fetch/XHR` | Il pannello e' pronto |
| 2 | organizer | Aprire `notte A`, attendere il caricamento completo, poi **svuotare il pannello Network** | Il pannello e' vuoto. Tutto cio' che accade da qui e' attribuibile alle scansioni |
| 3 | organizer | Scansionare **tre** biglietti di fila, online | Nel pannello: **esattamente tre** `POST /api/tickets/checkin`. Piu' le `GET /api/tickets/attendance` di **rinfresco della lista**, che sono la richiesta di sempre e vanno riconosciute come tali |
| 4 | **[mano tecnica]** | Contare, e **scrivere il numero** | **N scansioni ⇒ N check-in e ZERO chiamate d'autorizzazione.** In particolare **nessuna** `GET /api/tickets/attendance?partyId=…` innescata *dalla scansione* invece che dal rinfresco |

**E' un conteggio, non un'impressione.** Il numero va scritto: «tre scansioni,
tre `POST /api/tickets/checkin`, zero richieste d'autorizzazione». *«Mi e'
sembrato veloce»* non e' un esito.

**Cosa significa una richiesta in piu' per ogni scansione.** E' un round trip per
persona, su un telefono, su una rete debole, davanti a una fila — e sulla rete
che c'e' alla porta e' esattamente la differenza fra una coda che scorre e una
che si ferma. E' l'anti-pattern che ASSIGN-08 esiste per vietare.

---

## Prova 6 — la superficie delle assegnazioni fa quello che dice

**Requisito:** ASSIGN-01, ASSIGN-06 · **status: pending** · nessuna finestra

**Chi la fa.** Un organizer per i passi 1–6; **[serve una mano tecnica]** per i
passi 7–9.

**Cosa serve prima.** Righe 7–14 applicate, codice in deploy. Un evento
pubblicato con `notte A` e `notte B`, di cui l'organizer sia proprietario.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | organizer | Aprire `/organizer/events/[id]/assignments` | Per **ogni** serata dell'evento: chi ci lavora, con quale mestiere, e i due controlli. Se una lettura fallisce, la pagina lo **dice** e nomina il codice — una notte senza staff e una lettura fallita non si assomigliano |
| 2 | organizer | Assegnare l'assegnatario alla **porta** di `notte A` | Esito positivo, con una frase che nomina la serata e il mestiere |
| 3 | organizer | Ripetere **la stessa** assegnazione | Rifiuto **distinguibile**: dice che esiste gia', non «la scrittura e' fallita» |
| 4 | organizer | **Revocare** l'assegnazione del passo 2 | Esito positivo, e la riga sparisce dall'elenco «chi lavora» |
| 5 | **[mano tecnica]** | Interrogare `membership_acts` per quell'account | **Due** atti — l'assegnazione **e** la revoca — ognuno con **autore** (l'organizer che ha agito, non il soggetto) e **timestamp**. Un solo atto significa che la revoca non e' registrata: il gate *chi decide e' tracciato* non e' soddisfatto |
| 6 | **[mano tecnica]** | Interrogare `party_assignments` | La riga revocata **c'e' ancora**, con `revoked_at`. Non e' stata cancellata |
| 7 | organizer | Cercare un account `member` nell'elenco degli assegnabili | **Non c'e'.** L'elenco filtra `role in ('master','organizer','staff')`: offrire un `member` produrrebbe un rifiuto che l'interfaccia poteva evitare |
| 8 | **[mano tecnica]** | Forzare l'assegnazione di un `member` **sul filo** (la sola strada, visto il passo 7) | Rifiuto che dice che l'account **va prima promosso a staff** — non un errore di scrittura. E' la decisione D-A resa osservabile: `member` non e' un mestiere della notte |
| 9 | **[mano tecnica]** | Cambiare il ruolo di un account **assegnato a una notte viva** | Rifiuto `23503` che **nomina le serate** che bloccano. Vale per una **promozione** quanto per una demozione: la chiave composta lega `(user_id, assignee_role)`, quindi **qualunque** movimento del ruolo la rompe. Procedura completa: **prova 13** |

### Il credito pubblico, e perche' questa parte non si fa dall'interfaccia

Il piano chiede di *«creare un credito per una persona senza account»* dalla
superficie. **Quella superficie non esiste**, e dirlo e' obbligatorio: nessun
file di `src/` scrive o legge `public.party_credits` — solo il tipo di riga in
`src/types/database.ts` la nomina. Il piano 35-05 ha spedito la **tabella**, le
sue due policy di lettura e il comando di verifica; la **superficie di catalogo
dei crediti** e' di una fase che non e' questa.

Quindi la meta' di ASSIGN-06 e ASSIGN-07 osservabile oggi e' questa, e va
eseguita cosi':

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 10 | **[mano tecnica]** | Inserire a mano un credito verso una riga di `artists`, per una persona **senza account** | La riga si scrive. **Non compare nessun account nuovo**: la tabella non ha nessuna colonna che nomini un account — non `user_id`, non `profile_id`, non `auth_user_id` — quindi un credito che *provasse* a portarne uno **non parsa** |
| 11 | **[mano tecnica]** | Verificare la matrice di quella persona | Un credito **non concede niente**: chi ha un credito e nessuna assegnazione ha la stessa matrice di un `member` |
| 12 | **[mano tecnica]** | `npm run verify:no-credit-account` | Esce **0**. Esce **1**, nominando file e riga, se il percorso del credito acquista la capacita' di **creare** un account |

**Cosa significa se compare un account.** ASSIGN-07 e' violata, e la violazione
non e' un dettaglio di prodotto: un account creato senza che nessuno lo abbia
chiesto e' una persona dentro la community che nessuno ha approvato — cioe' il
gating aggirato dal lato che nessuno guarda.

**Il limite di `verify:no-credit-account`, scritto perche' il verde non venga
letto per piu' di quel che vale.** E' un controllo **strutturale** su un
perimetro di file, e oggi quel perimetro contiene **un solo file di
dichiarazioni**, perche' la superficie non esiste. Il verde vale esattamente
quanto quella lista: quando la superficie arrivera', entrera' nella misura da
sola — e allora, e non prima, il comando dira' qualcosa sul percorso vero.

---

## Prova 7 — una persona `staff` assegnata alla porta RAGGIUNGE lo scanner

**Requisito:** ASSIGN-01 · **status: pending** ·
**FINESTRA: da fare prima della prima serata reale** ·
**[serve una mano tecnica]**

> **Senza la riga 14 applicata questa prova e' falsa-negativa PER
> CONFIGURAZIONE.** `20260809005000_live_assignment_flag.sql` e' la riga che
> aggiunge `live_assignment_capabilities` al payload che il middleware legge a
> **ogni** richiesta. Finche' non e' applicata, la chiave non arriva, il gate
> grossolano si comporta **esattamente come prima**, e l'assegnatario viene
> rimbalzato — ma **per la ragione sbagliata**. Chi non lo sapesse
> registrerebbe un fallimento di ASSIGN-01 dove c'e' solo una migration non
> applicata, e andrebbe a «correggere» un codice corretto.
>
> Il segnale che lo dice, e che e' rumoroso **di proposito**: finche' la chiave
> manca, ogni rimbalzo delle due regole allargate porta la causa
> `context-stale`, e il dashboard mostra l'avviso che dice che e' un problema di
> **configurazione**, non un rifiuto di permesso. **E' l'unico segnale che il
> deploy e' avanti al database**, e si spegne da solo quando la riga atterra.

**Chi la fa.** L'assegnatario, un secondo `staff`, un organizer.

**Cosa serve prima.** Righe 7–14 applicate — **la 14 compresa** — e codice in
deploy.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | assegnatario | **Senza nessuna assegnazione**, aprire `/admin/scanner` | **Rimbalza** su `/dashboard`. Sul dashboard compare l'avviso del rifiuto ordinario |
| 2 | organizer | Assegnare l'assegnatario alla **porta** di `notte A` | Esito positivo |
| 3 | assegnatario | Ricaricare e riaprire `/admin/scanner` | **Entra.** La pagina rende, e il gate lato server usa **lo stesso** predicato del middleware — se i due divergessero si prenderebbe un secondo rifiuto **dopo** essere passati dal primo, cioe' davanti alla porta |
| 4 | assegnatario | Guardare la lista delle serate | Compare **`notte A` e nessun'altra**. `notte B` **non c'e'**: chi arriva per sola assegnazione vede le sue notti. Un organizer sulla stessa pagina le vede **entrambe**, e questo non e' un difetto: l'insieme d'ammissione si allarga, non si restringe |
| 5 | organizer | Revocare l'assegnazione | — |
| 6 | assegnatario | Ricaricare | Rimbalza di nuovo. Il permesso e' **vivo**, non permanente |

### Le tre cause del rimbalzo devono essere tre schermate diverse

| Causa | Quando | Cosa deve dire |
|---|---|---|
| `unavailable` | il contesto d'accesso **non si e' risolto** | e' un disservizio, non un permesso negato |
| `context-stale` | la chiave **non e' arrivata** nel payload — riga 14 non applicata | e' un problema di **configurazione**, e non va letto come un rifiuto |
| `not-assigned-here` | l'assegnazione **esiste** ma non copre **questo** strumento | va chiesto all'organizer **di quella notte** |

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 7 | organizer | Assegnare l'assegnatario a `notte A` con un mestiere **diverso dalla porta** (per esempio «photo»), poi far aprire `/admin/scanner` | Rimbalzo con `not-assigned-here`, e l'avviso dice che l'assegnazione c'e' ma non copre quello strumento |
| 8 | **[mano tecnica]** | Confrontare le tre schermate | Devono essere **tre testi diversi**. Se sono lo stesso, il rimbalzo e' tornato **muto** e non esiste error tracking che dica quale dei tre e' successo |
| 9 | **[mano tecnica]** | Aprire `/dashboard?access=` con un valore **inventato** | **Non deve rendere nessun avviso.** E' una query string, cioe' input non fidato: un avviso disegnato da un valore inventato sarebbe una frase autorevole scritta da chi ha mandato il link |

**Cosa significa se al passo 3 rimbalza lo stesso** (con la riga 14 applicata, e
la causa **non** `context-stale`). E' il difetto che questa fase esiste per
chiudere: il permesso e' nel database e la persona non arriva allo strumento.
**Va guardato prima della serata** — alle due di notte, davanti a una fila, non
c'e' tempo di scoprirlo.

**Cosa questa prova NON dice.** Che l'assegnatario possa **scansionare**.
Raggiungere lo strumento e usarlo sono due gate diversi — il middleware e la
route — e uno verde non dice niente sull'altro. La seconda meta' e' la **prova
11**.

---

## Prova 8 — l'assegnazione «photo» sblocca il caricamento, e su UNA notte sola

**Requisito:** ASSIGN-01 · **status: pending** · nessuna finestra propria (ma
vedi la prova 10 per i metadati)

**Chi la fa.** L'assegnatario e un organizer. Il passo 6 chiede una mano tecnica.

**Cosa serve prima.** Righe 7–14 applicate, codice in deploy. Un evento
pubblicato con **due** serate — e per il passo 8 uno con **tre**. Una foto
qualunque.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | assegnatario | **Senza nessuna assegnazione**, aprire la pagina pubblica dell'evento | La casella di caricamento **non compare** |
| 2 | organizer | Assegnare l'assegnatario come **«photo» a `notte A`** e a nessun'altra | Esito positivo |
| 3 | assegnatario | Ricaricare la pagina pubblica | La casella **compare**, e il selettore della serata offre **`notte A` e nessun'altra**. Il selettore e' **vuoto all'apertura** e il pulsante e' disabilitato finche' non si sceglie: nessuna preselezione, perche' una notte scelta per default e' una notte scelta da nessuno |
| 4 | assegnatario | Caricare la foto su `notte A` | Riesce, e il file compare **in attesa di approvazione** nella revisione dei media |
| 5 | organizer | Revocare l'assegnazione, poi far ricaricare la pagina | La casella **sparisce** alla richiesta successiva |
| 6 | **[mano tecnica]** | Ri-assegnare, poi forzare `partyId = notte B` **sul filo** | Rifiuto con la sua frase — `forbidden.media_upload_required` — **a schermo**, non solo nel log. L'elenco delle notti nel browser **non e' un confine**: ogni notte nominata e' ri-verificata tre volte lato server |
| 7 | organizer | Con un account `organizer` o `master`, aprire la stessa pagina | Il selettore elenca **tutte** le serate: chi arriva per ruolo non perde niente |
| 8 | organizer | Ripetere il passo 7 su un evento con **tre** serate | Tre voci, e il caricamento va sulla serata scelta |

**Cosa significa se al passo 3 il selettore mostra tutte le serate.** `party_id`
non e' arrivato fino alla riga, e il permesso e' tornato **per-evento** — che e'
l'opposto del Criterio di Successo 1 di questa fase.

**Cosa significa se al passo 1 la casella compare comunque.** La chiave
`media.upload` non gate niente e ASSIGN-01 e' **vuota sul mestiere «photo»**:
sarebbe una decorazione che fa sembrare sorvegliata una cosa che non lo e'.

**Una causa di falso allarme, dichiarata perche' non venga scambiata per un
difetto.** Se il resolver fallisce su una serata, quella serata **si ritira
dall'elenco**. Per chi ha **solo** l'assegnazione, *«irrisolto»* e *«non
assegnato»* si vedono **uguale**: nessuna casella. La direzione e' quella sicura
ed e' la meno diagnosticabile — quindi chi riceve la segnalazione *«non vedo la
casella»* deve sapere che ha **due** cause possibili, e che non esiste error
tracking che le distingua.

---

## Prova 9 — l'organizer di una notte, e il gate che deve poter fallire

**Requisito:** ASSIGN-01 · **status: pending** · nessuna finestra

**Chi la fa.** L'assegnatario e un organizer. Il passo 3 chiede di modificare a
mano l'indirizzo — **[serve una mano tecnica]** solo nel senso che va saputo
fare.

**Cosa serve prima.** Righe 7–14 applicate, codice in deploy. Un evento
pubblicato con **due** serate.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | organizer | Assegnare l'assegnatario come **organizer di `notte A`** (mestiere `party.manage`), e a nessun'altra | Esito positivo |
| 2 | assegnatario | Aprire la **lista di revisione** di `notte A` | **Si vede.** La pagina rende, e mostra le presenze e gli annullamenti di quella serata |
| 3 | assegnatario | Cambiare **a mano** la serata nell'indirizzo (`?party=`) verso `notte B` | **Rimbalza.** Chi non tiene `organizer.access` va a `/dashboard`; chi lo tiene va a `/organizer/events` — cioe' esattamente dove andava prima |
| 4 | assegnatario | Tornare a `notte A` | Si vede di nuovo. E' la conferma che il rifiuto riguardava **la notte**, non l'account |
| 5 | assegnatario | Aprire la pagina **senza** nessuna serata nell'indirizzo | Rifiuto. Senza soggetto il braccio per-notte non ha una domanda, e **non si inventa un permesso in assenza del suo oggetto** |

**Cosa significa se al passo 3 si vede anche `notte B`.** Il gate e'
**per-evento** e non per-notte, cioe' l'opposto del requisito. E' anche il
sintomo di un controllo issato **sopra** la risoluzione dell'indirizzo: un gate
valutato prima che la notte sia nota risponde su un'altra notte, o su nessuna, e
**passa ogni volta**.

**Cosa significa se al passo 2 la lista e' VUOTA invece di rendere** — ed e' il
fallimento piu' insidioso di questo documento. Vuol dire che manca il braccio
`party.manage` nella policy del registro della porta (piano 35-09). **Una lista
vuota li' e' lo stato normale di una serata tranquilla**: e' un fallimento che si
traveste da buona notizia, e nessuno lo segnalerebbe. Per distinguerli: se
`notte A` ha **almeno un ingresso registrato** e la lista e' comunque vuota, il
braccio non c'e'. Per questo la prova pretende una serata con del traffico
dentro, non una serata qualunque.

---

## Prova 10 — i metadati escono davvero dal file

**Requisito:** ASSIGN-01 · **status: pending** ·
**FINESTRA: prima che un fotografo assegnato carichi il primo file da dentro una
sede segreta** · **[serve una mano tecnica]**

> **Vale SOLO con la quindicesima migration applicata.**
> `20260809006000_event_media_server_upload_only.sql` toglie al browser la
> scrittura sul bucket pubblico. Finche' non e' applicata, **il browser puo'
> ancora scrivere dritto in `event-media` saltando la rotta che spoglia**, e
> questa prova misurerebbe un percorso che non e' piu' l'unico. Si osserverebbe
> un file spogliato **mentre la porta accanto resta aperta**: verde, e bucato.
>
> **Ed e' lo stato in cui il prodotto va in deploy.** Non e' un dettaglio
> d'esecuzione: e' scritto in testa alla coda, in testa al file di migration, e
> qui — e in nessuno dei tre e' stato ammorbidito.

**Chi la fa.** Una mano tecnica, con `exiftool` (o equivalente) e un telefono con
la geolocalizzazione attiva.

**Cosa serve prima.** Righe 7–14 applicate, codice in deploy, **poi** la riga 15.
Assegnatario «photo» su `notte A`. Una serata con `venue_secret` **vero** per il
ramo video.

### La preparazione, che e' meta' della prova

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | **[mano tecnica]** | Scattare una foto **da telefono con la geolocalizzazione attiva**, e ruotarla in modo che porti un orientamento EXIF diverso da 1 | Il file esiste in locale |
| 2 | **[mano tecnica]** | Leggere i metadati **prima** e **annotarli**: coordinate GPS, data di scatto, modello del telefono, orientamento | **Senza questa riga non c'e' termine di paragone**, e la prova dopo non prova niente: un file che non aveva coordinate esce senza coordinate anche da una pipeline rotta |

### La prova

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 3 | assegnatario | Caricare quella foto su `notte A` | Il caricamento riesce, e il file compare in attesa di approvazione |
| 4 | **[mano tecnica]** | Scaricare l'oggetto **dall'URL pubblico** — **non** il file locale, **non** l'anteprima nell'interfaccia | Si ha in mano i byte che il mondo puo' scaricare, che sono l'unica cosa che conta |
| 5 | **[mano tecnica]** | Ispezionare i metadati del file scaricato | **Nessuna coordinata, nessuna data di scatto, nessun modello di telefono.** Confrontare voce per voce con l'annotazione del passo 2 |
| 6 | **[mano tecnica]** | Guardare la foto | **Orientata come l'originale.** Se e' ruotata di novanta gradi, la spoglia c'e' ma **manca l'applicazione dell'orientamento** prima della ri-codifica: un difetto visibile a chiunque, e che un controllo che chiedesse solo *«l'EXIF e' sparito?»* **non vedrebbe** |
| 7 | **[mano tecnica]** | Caricare un file i cui **byte non corrispondono** al tipo dichiarato (per esempio byte PNG dichiarati `image/jpeg`) | **Rifiutato.** Il contenitore decodificato viene confrontato con il tipo dichiarato: senza, il file verrebbe **transcodificato**, cioe' un successo su un file che nessuno ha validato |
| 8 | **[mano tecnica]** | Caricare un **video** verso una notte con sede **segreta** | **Rifiutato**, con la frase che dice **perche'** — che i video non sono ammessi su quella serata, non «caricamento fallito» |
| 9 | **[mano tecnica]** | Dopo ogni rifiuto terminale, guardare il bucket di quarantena | L'oggetto **non c'e' piu'**: la pulizia avviene sia dopo un successo sia dopo un rifiuto |
| 10 | **[mano tecnica]** | Con una sessione di **membro approvato**, tentare di scrivere in `event-media` **da una console del browser** | **Deve fallire.** **Prima** di applicare la riga 15 la stessa prova **riesce**: quella e' la finestra, e questo passo e' la sua misura |

**Cosa significa se la foto pubblica porta ancora le coordinate.** **E' una
rivelazione di sede in corso.** Per `venue-secrecy.md` non esiste rollback:
l'oggetto va **rimosso subito**, e va **scritta** la finestra in cui e' stato
raggiungibile — da quando a quando, e con quale URL. Non e' un difetto da mettere
in coda: e' un incidente da chiudere e da registrare.

### Perche' questa prova e `verify:media-strip` non si sostituiscono

**Questa prova vale un file solo.** Dice che *quel* file e' uscito pulito, e
nient'altro: non dice che il percorso non sia aggirabile, non dice che domani
qualcuno non ne apra un secondo, non dice niente su un file diverso.

**`npm run verify:media-strip` e' l'altra meta', ed e' strutturale.** I suoi
cinque controlli valgono **su tutto l'albero** e a ogni esecuzione: nessuno
scrive nel bucket pubblico fuori dalla rotta di finalizzazione; nella rotta la
spoglia sta **sopra** la scrittura; il componente di caricamento non nomina il
bucket pubblico; la riga 15 droppa **il nome che la migration originale ha
creato**, e nessuna migration successiva ricrea una `INSERT` per `authenticated`;
`sharp` e' fra le dipendenze.

**Vanno fatte entrambe.** La prima misura un **risultato** e non sa niente del
percorso; la seconda misura il **percorso** e non apre mai un file. Un verde
dell'una con l'altra rossa e' esattamente lo stato in cui il prodotto sembra a
posto e non lo e'. E nemmeno le due insieme coprono tutto: un nome di bucket
**composto a runtime** e' invisibile allo script, che legge testo e non segue
valori — cio' che regge davvero la linea e' la policy che la riga 15 toglie.

---

## Prova 11 — la scansione riceve la notte (piano 35-22)

**Requisito:** ASSIGN-01, ASSIGN-08 · **status: pending** ·
**FINESTRA sul caso C: si perde se si applica la coda per prima**

**Perche' esiste.** `35-VALIDATION.md` non la contiene: il buco non era previsto,
e' stato **trovato durante l'esecuzione** dal piano 35-12 — nessuno dei ventuno
piani della fase passava una notte alla rotta di check-in, quindi una persona
`staff` assegnata alla porta raggiungeva lo scanner (prova 7), vedeva la serata
nella lista, e prendeva **403 su ogni scansione**. ASSIGN-01 dice *«can use that
night's tools»*, e alla porta lo strumento **e' la scansione**: il requisito
primario della fase non sarebbe stato consegnato. Registrato come voce 7 di
`deferred-items.md`, chiuso dal piano **35-22**.

**Cosa nessun comando di questo repository puo' dire.** `npm run build` e' verde
con **zero** migration applicate — nessun client e' parametrizzato con
`Database`, quindi il nome della funzione per-notte e la forma del suo payload
sono stringhe che nessun compilatore controlla. **Questa procedura e' l'unica
prova che esistera'.**

### L'ordine dei tre casi non e' negoziabile — **C prima, poi la coda, poi A e B**

> **Questa prova ha tre casi e non sono ordinabili a piacere.** I casi **A** e
> **B** pretendono che la **riga 8** della coda sia **applicata**; il caso **C**
> pretende che **non** lo sia — vive nella finestra fra il deploy del codice e
> l'applicazione di quella riga.
>
> **Applicando la coda per prima il caso C non e' rimandato: e' perso.** La
> funzione che oggi manca esistera', e la condizione che il caso osserva non sara'
> piu' riproducibile senza smontare la produzione.
>
> Sta in testa alla prova, e non in fondo, perche' chi legge in fondo ha gia'
> applicato la coda.

### Preparazione (ruoli, mai persone)

1. Un evento **pubblicato** con **due** serate distinte, `notte A` e `notte B`.
2. Un account **staff**, `approved`, **senza** `door.operate` da ruolo — l'unico
   modo in cui puo' scansionare e' l'assegnazione. Chiamalo *l'assegnatario*.
3. Un account **organizer** e un account **master**, per il confronto.
4. Un biglietto valido e non usato per `notte A`.
5. Con l'organizer, assegnare all'assegnatario `door.operate` sulla **sola
   `notte A`** (superficie del piano 35-05).

### Caso C — PRIMA che la coda sia applicata. **La finestra che si chiude**

> **Questo caso si prova nella finestra fra il deploy del codice e
> l'applicazione della riga 8, e in nessun altro momento.** Chiusa quella
> finestra, non e' piu' provabile: la funzione che oggi manca esistera', e la
> condizione che il caso osserva non sara' piu' riproducibile senza smontare la
> produzione. **Se si applica la coda per prima, questa prova e' persa** — non
> rimandata.

| Chi | Passi | Cosa si deve osservare |
|---|---|---|
| master | `/admin/scanner`, selezionare `notte A`, scansionare il biglietto | **Verde, esattamente come oggi.** L'ingresso e' registrato. Nel Network la risposta e' quella di sempre. **Nessun rallentamento**: la chiamata d'autorizzazione resta **una** |
| organizer | idem, su un secondo biglietto | Idem. Se uno dei due riceve un **503** o una latenza visibilmente maggiore, il secondo braccio e' finito sul percorso di ruolo: **e' il difetto che questo piano esiste per evitare**, e va fermato prima di andare avanti |
| assegnatario | stessa pagina, `notte A` selezionata, scansionare | **Rifiutato — ed e' l'esito atteso in questa finestra.** Nel Network: **`403`**, e nel corpo `"status":"door_night_unresolved"`. Sotto il titolo rosso, la frase *«This account's assignment for that night could not be checked — the refusal above stands on the role check alone.»* |
| assegnatario | mettere il telefono in modalita' aereo, scansionare, riportarlo online e attendere il drain | La voce **non** deve restare in coda ritentata a ogni `online`: un `503` la manderebbe nel bucket **retry** e la farebbe ripartire tutta la notte. Il percorso in coda non passa dal secondo braccio: e' giudicato a `scannedAt` (prova 2) |

**Fallimenti da riconoscere in questa finestra:** un **503** in risposta a una
scansione — di chiunque — e un contatore di scansioni in attesa che **cresce
senza mai scendere**. Sono la stessa cosa vista da due lati.

### Caso A — DOPO l'applicazione della riga 8: l'assegnatario scansiona

| Chi | Passi | Cosa si deve osservare |
|---|---|---|
| assegnatario | `/admin/scanner`, selezionare `notte A`, scansionare il biglietto di `notte A` | **Verde. L'ingresso e' registrato.** In `door_scan_events` compare una riga con `outcome = 'recorded'`, `party_id` = `notte A`, e **`operator_id` = l'assegnatario** — non l'organizer che lo ha assegnato |
| assegnatario | riscansionare lo stesso biglietto | `already_recorded`, con l'ora e l'operatore del primo ingresso. E' il comportamento di sempre: il secondo braccio cambia **chi** puo' scansionare, niente altro |
| master, organizer | scansionare un secondo biglietto | Invariato rispetto al caso C |

**Fallimento da riconoscere:** un `403` all'assegnatario **dopo** l'applicazione
della riga 8. Vuol dire che ASSIGN-01 non e' arrivato alla porta, che e'
esattamente lo stato che questo piano chiude.

### Caso B — la notte nominata non e' la sua

| Chi | Passi | Cosa si deve osservare |
|---|---|---|
| assegnatario | selezionare **`notte B`** nello scanner e scansionare un qualunque biglietto | **Rifiutato**, `403`, e il corpo dice **quale** delle tre cause: `"status":"door_night_other_night"`. La frase sotto il titolo e' *«This account is on the door, but not for the night selected on this device — select the right night.»* — cioe' un rifiuto su cui si puo' agire in cinque secondi, non un vicolo cieco |
| assegnatario | tornare a `notte A` e riscansionare | Passa. E' la conferma che il rifiuto precedente riguardava **la notte**, non l'account |
| un secondo account `staff`, assegnato a **nessuna** notte | scansionare, con qualunque notte selezionata | Rifiutato, `403`, con la **terza** causa distinta: `"status":"door_night_not_assigned"` e la frase *«This account is not on the door for any night…»*. Se questo caso e il precedente producono lo **stesso** corpo, le cause sono collassate e la distinzione e' andata persa |
| organizer | revocare l'assegnazione su `notte A` e far riscansionare l'assegnatario | Il rifiuto passa da `door_night_other_night` a `door_night_not_assigned`. La riga dell'assegnazione **resta in tabella** con `revoked_at` valorizzato: se e' sparita, la revoca e' una `DELETE` e la prova 2 non ha piu' senso |

**Nota su cosa NON prova il caso B.** Il **titolo** sopra la frase resta quello
generico che `ScannerClient.tsx:121-131` mappa dallo status HTTP prima di leggere
il corpo — *«This account is not allowed to check people in»*. E' lo stesso
limite gia' registrato in `require-operator.ts:93-110` per il rifiuto di
supervisione: qui si osserva la **frase di dettaglio**, non il titolo. Un titolo
generico non e' un fallimento di questa prova; una frase di dettaglio **assente o
uguale per i tre casi** lo e'.

---

## Prova 12 — l'upgrade di IndexedDB v4 → v5 su una coda non vuota

**Requisito:** ASSIGN-02, ASSIGN-08 · **status: pending** ·
**FINESTRA IRREVERSIBILE: da esercitare prima della prima serata reale**

> **Perche' e' l'unica irreversibile di questa fase, e perche' va rifatta invece
> che ereditata.** Il precedente esiste — il piano 43-13 ha esercitato lo stesso
> upgrade su un dispositivo reale con una scansione gia' in coda — e **non
> conta**: un upgrade che non aveva strandato niente l'altra volta non e' un
> upgrade che non stranda niente questa volta, e **nessun controllo di questo
> repository sa la differenza**, perche' nessuno script apre un IndexedDB.
>
> Il suo fallimento distrugge **dati e non codice**: presenze di persone che
> hanno pagato, perse in silenzio, su un telefono che nessuno puo' interrogare —
> e **non esiste error tracking** che lo dica. Va fatta **prima della prima
> serata reale**, non a un fine-costruzione astratto, e prima che i telefoni
> della porta abbiano aggiornato il bundle: dopo, per ricostruire lo stato «coda
> piena su v4» bisogna reinstallare un bundle vecchio.

**Chi la fa.** Un organizer, con un telefono. Il passo 5 chiede DevTools.

**Cosa serve prima.** Un telefono con il **bundle PRECEDENTE ancora installato**
(`DB_VERSION` 4) e due biglietti validi e non usati.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | organizer | Con il bundle **vecchio**, aprire `/admin/scanner`, selezionare `notte A`, attendere il download della lista | La lista si popola |
| 2 | organizer | **Modalita' aereo.** Scansionare **due** biglietti | Due flash verdi. Il chip *Pending (2)* compare |
| 3 | organizer | **Ancora in aereo**, chiudere l'app **del tutto** — non solo mandarla in background | — |
| 4 | organizer | Tornare online **solo il tempo di aggiornare il service worker** al bundle nuovo, poi rimettere in aereo **prima** di riaprire lo scanner | Serve che l'upgrade v4 → v5 avvenga con la coda **piena e non drenata**: e' l'unico scenario che questa prova prova. Se la coda si svuota prima, la prova e' passata a vuoto |
| 5 | **[mano tecnica]** | Riaprire `/admin/scanner`. DevTools → Application → IndexedDB → `resonate-checkin` | Il chip dice ancora **`Pending (2)`**. La versione del database e' **5** e `pendingCheckins` contiene **due** righe con i loro `scannedAt` **originali** |
| 6 | organizer | Tornare online e attendere il drain | I due ingressi compaiono in `door_scan_events` con `source = 'offline_sync'` |

**Cosa significa se al passo 5 il chip sparisce o dice `Pending (0)`.** Lo step
di upgrade **ha toccato la coda** — e non deve. Sono **due presenze perse**, di
persone che hanno pagato, su un telefono che nessuno puo' verificare. Se succede,
la fase non e' spedibile alla porta finche' lo step non e' corretto.

**Cosa significa se al passo 5 i `scannedAt` sono cambiati.** Peggio del
precedente in un modo che sembra minore: le due presenze arriverebbero al server
con l'ora sbagliata, e il drain giudica **al tempo `scannedAt`** — quindi
un'assegnazione scaduta o revocata verrebbe valutata contro un istante che non e'
mai esistito.

---

## Prova 13 — la demozione bloccata, e il suo percorso d'uscita

**Requisito:** ASSIGN-01, ASSIGN-03 · **status: pending** · nessuna finestra

**Chi la fa.** Un organizer e il proprietario. Il passo 6 chiede una mano
tecnica.

**Cosa serve prima.** Righe 7–14 applicate, codice in deploy. L'assegnatario
**assegnato a una notte viva** (assegnazione non revocata e non scaduta).

**La domanda che pone.** La chiave composta lega `(user_id, assignee_role)` alla
riga viva del profilo: finche' l'assegnazione vive, **il ruolo non si muove**. Il
rifiuto che ne esce e' un `23503` — e un `23503` grezzo su un pulsante e' il
precedente registrato *«Qualcosa e' andato storto»*, su un percorso che sara'
**urgente** perche' qualcuno sta cercando di togliere un permesso a qualcuno.

| # | Chi | Passi | Cosa si deve osservare |
|---|---|---|---|
| 1 | organizer | Assegnare l'assegnatario a `notte A` con un mestiere qualunque | Esito positivo |
| 2 | proprietario | Sulla superficie dei membri, tentare di **demotere** quell'account da `staff` a `member` | **Rifiutato**, e il rifiuto **nomina le assegnazioni che bloccano**: la **serata** e il **mestiere**. Non «la scrittura e' fallita» |
| 3 | proprietario | Leggere l'azione offerta | Il testo descrive l'uscita: revocare le assegnazioni **e poi** cambiare il ruolo, in un atto solo. E descrive anche la strada a mano — revocare dalla pagina delle assegnazioni, poi cambiare il ruolo — che resta sempre aperta |
| 4 | proprietario | Tentare di **promuovere** lo stesso account a `organizer` | **Rifiutato allo stesso modo**, e la frase lo dice: vale *«for a demotion and for a promotion alike»*. Qualunque movimento del ruolo rompe la coppia, non solo la demozione |
| 5 | organizer | Revocare l'assegnazione, poi rifare il passo 2 | **Riesce.** Il blocco era l'assegnazione viva, non l'account |
| 6 | **[mano tecnica]** | Interrogare `membership_acts` dopo un'uscita in un atto solo | **Due atti distinti**: la revoca e il cambio di ruolo. Non uno |

**Cosa significa se il rifiuto dice solo «la scrittura e' fallita».** E' il
precedente del form newsletter, in un percorso che sara' urgente: chi legge non
sa **cosa** bloccare, non sa **quale** serata, e non sa che esiste un'uscita. Un
messaggio che non nomina la causa manda a cercare nel posto sbagliato.

**Cosa significa se il rifiuto nomina serate sbagliate.** Peggio del generico:
manderebbe qualcuno a **revocare assegnazioni che non c'entrano**, cioe' a
togliere a una persona il permesso di lavorare una notte per un motivo
inesistente.

**Un limite dichiarato, che non e' un fallimento di questa prova.** L'uscita in
un atto solo e' **scritta ed esportata**, ma **il pulsante che la invoca non
esiste ancora**: vive su una superficie che nessun piano di questa fase ha
aperto. Finche' non c'e', il passo 3 verifica **la frase**, e l'uscita in un atto
solo richiede una mano tecnica. La strada manuale, quella si', e' percorribile da
chiunque, ed e' descritta nella frase stessa. E' la voce 4 di
`deferred-items.md`, e non va scambiata per un difetto scoperto qui.

---

## La dichiarazione di copertura, onesta

> Scritta come **dati**, non come giudizio. Non dice se la fase e' andata bene:
> dice cosa un comando puo' provare e cosa no.

### Chiudibili automaticamente: quattro su otto

| Req | Con che cosa si chiude | Perche' quel comando basta |
|---|---|---|
| **ASSIGN-01** — *limitatamente al permesso* | matrice B3 su `party_assignments`, **e** B2/B3 **byte-identiche su ogni altra tabella**, `event_media` inclusa | La seconda meta' e' la parte che conta: che le celle di tutte le altre tabelle non si muovano **e' la prova che l'assegnazione non filtra altrove**. Una tabella nuova che concede solo se' stessa e' un permesso; una che sposta una cella altrove e' un'escalation |
| **ASSIGN-04** — nessuno si assegna da solo | sonda negativa dedicata in `CONSTRAINT_PROBES`, **tarata per mutazione** | Non conta lo SQLSTATE: pretende `23514` **dal vincolo chiamato per nome**, e ogni altra condizione della riga di sonda e' deliberatamente **soddisfatta**, cosi' che l'unico motivo di rifiuto sia quello misurato. Gira sulla connessione privilegiata perche' sotto persona la scrittura e' rifiutata `42501` **prima** che il `CHECK` sia valutato — cioe' sotto persona ASSIGN-04 non e' misurabile affatto |
| **ASSIGN-06** — un credito non concede niente | matrice, **piu' la prova negativa** | La prova negativa e' la sostanza: una persona con un credito e **nessuna** assegnazione ha **la stessa matrice di un `member`**. Senza quella, la matrice direbbe solo che i crediti esistono |
| **ASSIGN-07** — creare un credito non crea un account | `npm run verify:no-credit-account` | Esce **1** nominando file e riga se il percorso del credito acquista la capacita' di **creare** un account. Provato per mutazione in quattro direzioni, **due delle quali sui rifiuti** — un controllo che non sa fallire e' una decorazione |

### La precisazione su ASSIGN-01, che non si addolcisce

La matrice prova che il **permesso** e' per-notte. **Non prova che la persona
arrivi allo strumento.** Quello dipende dal routing e da due pagine, e si osserva
**solo aprendo l'applicazione**: sono le procedure **7**, **8** e **9**, e sono
quella meta'.

**E c'e' un terzo pezzo, che fino al piano 35-22 non era nemmeno elencato:
arrivare allo strumento non e' usarlo.** La prova **7** osserva che
l'assegnatario *raggiunge* lo scanner; la prova **11** osserva che *scansiona*.
Erano la stessa voce **per omissione**, e per ventuno piani nessuno ha guardato
la seconda meta' — il buco e' stato trovato in esecuzione dal piano 35-12 e
chiuso dal piano 35-22, **dentro** questa fase. Restano due prove distinte
perche' sono **due gate distinti** — il middleware e la rotta — e uno verde non
dice niente sull'altro.

Va detto anche il seguito, perche' altrimenti la riga «ASSIGN-01 consegnata» si
legge come piu' di quel che vale: **la consegna di ASSIGN-01 dipende dal piano
35-22**, spedito in questa fase **dopo** che il buco era stato trovato. Senza,
una persona `staff` assegnata alla porta avrebbe raggiunto lo scanner, visto la
serata, e preso **403 su ogni scansione**.

### Con una meta' irraggiungibile: quattro su otto

**ASSIGN-02, ASSIGN-03, ASSIGN-05, ASSIGN-08.** La ragione, scritta una volta:
quella meta' **vive su un telefono, con la radio spenta, in un build di
produzione**, e **nessuno strumento di questo repository la raggiunge**. Non e'
una lacuna dell'harness: e' dove sta il comportamento.

| Req | Cosa un comando prova | Cosa resta a una persona con un telefono |
|---|---|---|
| **ASSIGN-02** | il predicato `now() < ends_at`, spostando **`ends_at`, mai `now()`** | che la notte finita **nasconda** e non cancelli, su un dispositivo offline da ore — prova 1 |
| **ASSIGN-03** | che la revoca sia **una riga e non una `DELETE`** | che una scansione gia' in coda **si risolva** invece di restare appesa — prova 2 |
| **ASSIGN-05** | il solo lato server, con due sessioni | la **frase distinguibile** in build di produzione, e il ramo offline che vive sul dispositivo — prove 3 e 4 |
| **ASSIGN-08** | **niente** | *«quante volte una chiamata parte»* e' comportamento del client: N scansioni ⇒ N check-in e **zero** chiamate d'autorizzazione, contate nel pannello di rete — prova 5 |

### La frase che vale per tutte e otto

**`npm run build` e' un typecheck, e passa senza che nessuna migration sia
applicata.** I tipi vengono da `src/types/database.ts`, un file del repository,
non dal database vivo — e nessuno dei client Supabase e' parametrizzato con
`Database`, quindi il compilatore non ha mai visto `party_id`, `venue_secret`,
un nome di funzione per-notte ne' un nome di bucket.

**Un build verde in questa fase non e' evidenza che qualcosa funzioni.** Sta
scritto anche piu' in alto, e non e' una ripetizione per enfasi: e' l'unica
affermazione di questo documento che qualcuno potrebbe usare per saltare tutto il
resto.

**E non esiste alcun test runner per il prodotto.** Nessuna riga di questo file,
di nessun SUMMARY di questa fase e di nessun `35-VERIFICATION.md` puo' dire che
qualcosa e' verificato «perche' i test passano».

---

## Il debito differito, con il suo nome

> Un debito senza nome diventa invisibile, e un elenco che si accorcia in
> silenzio e' indistinguibile da un elenco a cui e' caduta una riga. Ogni voce
> qui dice **cosa manca** e **perche' non e' stato fatto** — nessuna dice «da
> valutare».

### Prima, i due debiti che questa fase ha CHIUSO, dichiarati ritirati

Nelle prime stesure del piano 35-14 questo elenco aveva due voci in piu': la
**mancata sanitizzazione EXIF** e lo **scarto fra `media.upload` per-notte e
`event_media` per-evento**. **Non compaiono piu', e la ragione va scritta invece
che lasciata dedurre: sono state chiuse dentro questa fase**, per decisione del
proprietario del **2026-08-08** — la seconda dal piano **35-18** (`party_id` su
`event_media`, con backfill, trigger e policy), la prima dai piani **35-19**,
**35-20** e **35-21** (spoglia lato server, non aggirabile).

**Un debito ritirato si dichiara ritirato.** Sparire dall'elenco e cadere
dall'elenco si assomigliano troppo.

### Le tredici voci aperte

**1. L'annullamento non e' registrato su due rami su tre** — guest list e
membership (piano 35-11).
*Conseguenza:* su quei due percorsi un annullamento resta **invisibile** nella
lista di revisione della serata: chi guarda il registro dopo la serata vede solo
gli annullamenti dei biglietti.
*Perche' e' differito:* e' lavoro di **registrazione**, non di autorizzazione — e
il ramo membership dovrebbe smettere di **cancellare** una riga di presenza, che
e' una modifica al **significato dei dati di presenza**, non un ritocco.

**2. La concessione reciproca non e' coperta.** Il `CHECK` ferma *«A assegna
A»*, non *«A assegna B, B assegna A»*.
*Perche' e' differito:* **non e' in ASSIGN-04**, ed e' dichiarata fuori scopo.
*Il mitigante che esiste gia':* l'attribuzione. `membership_acts` con l'indice
sull'autore rende quella coppia **leggibile** — non impedita, leggibile.

**3. `attendances.entry_role` non ha ancora il suo terzo caso.** La migration
della fase 43 dice che un'assegnazione per-serata e' un **terzo modo d'ingresso**.
*Perche' e' differito:* questa fase **non lo scrive**, perche' non e' in nessuno
degli otto requisiti. **Nominarlo qui e' cio' che gli impedisce di sparire.**

**4. `event_parties.lineup` e `party_credits` convivono.** La frase che dice
quale fonte vince per cosa e' scritta nella migration: `lineup` e' **il testo
comunicato**, `party_credits` e' **l'attribuzione** verso una riga di `artists`.
*Perche' e' differito:* la **migrazione** fra le due e' rimandata a una fase che
la nomini. Nessuna delle due deriva dall'altra, e finche' e' cosi' convivono
senza contraddirsi.

**5. La superficie delle assegnazioni sara' spostata dalla fase 34**, dietro un
redirect permanente.
*Non e' un difetto:* e' previsto, ed e' scritto qui perche' chi trova
l'indirizzo cambiato non lo legga come una regressione.

**6. La spoglia dei metadati copre le immagini e NON i video.** Registrato il
**2026-08-08**. `stripImageMetadata` tratta `image/jpeg`, `image/png` e
`image/webp`; `sharp` **non tratta i contenitori video**, e un MP4 o un MOV porta
le coordinate in un atomo `udta` esattamente come un JPEG le porta nell'EXIF.
*La mitigazione che c'e':* un video verso una serata con `venue_secret` **vero**
— **o con quel valore non leggibile, o verso una notte che non esiste** — e'
**rifiutato**. E' il gate *default chiuso* di `venue-secrecy.md`: si ammette solo
un `false` esplicito.
*Cio' che resta aperto:* su una serata **non** segreta un video passa **non
spogliato**, e porta con se' luogo e ora dello scatto.
*Perche' e' differito:* la chiusura richiede un **percorso video separato** —
riscrittura del contenitore o rimozione degli atomi — e non e' in nessuno degli
otto requisiti.
**Scriverlo qui e' cio' che impedisce che «sanitizzazione EXIF spedita» venga
letto come «tutti i media sono puliti».**

**7. Gli oggetti gia' presenti in `event-media` prima di questa fase non sono
stati ri-spogliati.** Registrato il **2026-08-08**. La spoglia agisce sul
**percorso di caricamento**; tutto cio' che e' stato caricato prima e' ancora nel
bucket **pubblico**, con il suo path derivabile e i suoi metadati.
*Cosa cambierebbe ri-spogliarli:* niente di cio' che e' gia' uscito —
`venue-secrecy.md` e' **monotono** — ma fermerebbe i **download futuri**.
*Perche' e' differito:* fuori dagli otto requisiti.

**8. Un evento non pubblicato non e' raggiungibile per assegnazione.** Chi arriva
alla revisione della notte per il braccio `party.manage` e' tipicamente `staff`,
e le policy di `events` e `event_parties` gli mostrano solo cio' che e'
**pubblicato**. Misurato, non dedotto (piano 35-10): su un evento non pubblicato
la capability e' **conferita**, le righe visibili in `event_parties` sono **zero**
e `validUntil` esce **`null`**.
*Perche' e' differito:* chiuderlo richiede **un braccio in piu'** su quelle
policy, cioe' una migration in piu', fuori dagli otto requisiti. Per una lista
che si guarda **dopo** la serata il limite e' stretto, ma esiste.

**9. Nessuna navigazione porta alla revisione per-notte.** Chi e' assegnato come
organizer di una notte raggiunge quella pagina **solo con un indirizzo che
qualcuno gli passa**: `NAV_ITEMS` nasconde le voci **per ruolo**, e un `staff`
assegnato non ha un ruolo che la mostri.
*Perche' e' differito:* e' **STAFF-03 della fase 34** — la navigazione
ricostruita su quattro ruoli — e non e' un difetto di questa fase.
*Perche' ha bisogno del nome lo stesso:* senza, la segnalazione che arrivera'
sara' *«lo strumento non funziona»* invece di *«lo strumento non si trova»*, e
sono due indagini diverse.

**10. Il braccio della presenza nel gate dei media interroga una tabella che non
esiste.** Misurato il **2026-08-08**: `.from("attendance")` in
`src/app/(public)/events/[slug]/actions.ts:48` e in
`src/app/(public)/events/[slug]/page.tsx:318`, mentre la tabella si chiama
`public.attendances` (`supabase/schema.sql:231`). PostgREST risponde con un
errore, il codice destruttura solo `{ data }` e **ignora `error`**, quindi il
braccio **rifiuta sempre**.
*Conseguenza misurabile:* **prima di questa fase solo `organizer` e `master`
potevano caricare media**, e la casella non compariva nemmeno a un membro
approvato e presente.
*Perche' e' differito:* correggerlo **allarga** chi puo' caricare — che e' una
modifica al **gating** (`media-and-storage.md`, gate *chi carica ha titolo*) e
passa da `access-gating.md`, non da qui.
**Nominato perche' altrimenti verrebbe «sistemato» in un commit di pulizia da
qualcuno che non sa di star allargando un permesso.** Dopo il piano 35-21 ha un
effetto in meno: un fotografo assegnato **non dipende piu'** da quel braccio.

**11. Gli oggetti abbandonati nel bucket di quarantena non hanno una pulizia.**
Registrato il **2026-08-08**. La rotta di finalizzazione cancella l'oggetto in
`finally`, ma un caricamento **interrotto prima della chiamata** lascia un file
li'.
*Quanto costa:* il bucket e' **privato e senza policy di lettura per
`authenticated`**, quindi il costo e' **spazio, non segreto**. Ma quegli oggetti
sono **file non spogliati**, e solo il service role puo' svuotare l'area.
*Perche' e' differito:* la chiusura e' un **cron di pulizia**, fuori dagli otto
requisiti.

**12. Le righe legacy di `event_media` su eventi con piu' serate restano senza
notte.** Registrato il **2026-08-08**. Il backfill del piano 35-18 riempie
`party_id` **solo** dove l'evento ha esattamente **una** serata, perche' li' la
risposta e' un fatto; sulle altre righe attribuire una notte a posteriori
sarebbe **inventarla**.
*Cosa significa `NULL` li':* **legacy, ambito evento**. Si leggono e si moderano
come oggi e **non soddisfano nessun braccio per-notte**. E `null` **non significa
«tutte le serate»** — e' l'unica lettura sbagliata che il tipo da solo non
impedisce, ed e' quella che trasformerebbe un permesso circoscritto a una sera in
uno illimitato.
*Perche' non e' un buco:* **nessuna riga nuova puo' nascere `NULL`** — il trigger
la rifiuta. E' un'**asimmetria permanente** fra il vecchio archivio e il nuovo, e
chi guardera' quei dati deve saperlo.

**13. Un oggetto gia' spogliato puo' restare orfano nel bucket pubblico.**
Registrato il **2026-08-09** dai piani 35-20 e 35-21 — **non era fra le dodici
del piano 35-14**, ed e' qui perche' 35-21 lo ha indirizzato a questo documento
per nome. Se `registerMedia` fallisce **dopo** che la rotta ha pubblicato,
restano byte **gia' spogliati** nel bucket pubblico, con path derivabile e
**nessuna riga che li governi** — quindi **fuori moderazione**.
*Quanto costa:* non e' una divulgazione di coordinate — i metadati sono usciti —
ma e' un file di una serata **raggiungibile per URL** e che nessuno puo'
rimuovere dall'interfaccia, perche' per l'interfaccia non esiste.
*La mitigazione che c'e':* il rifiuto e' **visibile a chi carica**, e la frase
dice di **avvisare un organizer** invece di ricaricare — cioe' l'unica azione
utile.
*Perche' e' differito:* la chiusura e' uno **spazzino** sul bucket pubblico, che
e' lo stesso lavoro della voce 11 su un'area diversa, e non e' in nessuno degli
otto requisiti.

### Riconciliazione con `deferred-items.md`

Quel file porta **undici** voci, che non sono le tredici di sopra: sono le cose
trovate **durante l'esecuzione** e fuori dal perimetro del piano che le ha
trovate. Vanno lette insieme, e questa e' la corrispondenza — **per nome, non per
cancellazione**.

| Voce | Stato | Chi l'ha chiusa, o perche' resta |
|---|---|---|
| **1** — `ends_at` da `event_parties.date`, non da `events.date` | **CHIUSA** il 2026-08-08 | Piano **35-04**, e **misurata invece che accettata**: ventiquattro ore esatte di divergenza su una sub-serata del giorno dopo |
| **2** — «un path morto nell'indice della persona» | **RITIRATA — l'affermazione era falsa** | `src/components/scanner/**` **esiste** e contiene `ScanFlash.tsx`; `npm run verify:persona` e' verde su tutti e 58 i glob, **controllo A compreso** — cioe' esattamente il controllo che avrebbe dovuto fallire. La riga **resta** invece di sparire perche' l'affermazione ha attraversato tre documenti pubblicati senza che nessuno la provasse, e cancellarla lascerebbe le altre due copie in circolazione senza smentita |
| **3** — cancellare un artista accreditato fallisce, e il rifiuto non raggiunge nessuno | **APERTA** | Il vincolo `ON DELETE RESTRICT` resta com'e': `CASCADE` lascerebbe che una cancellazione **riscriva in silenzio cosa e' stata una serata**. Manca il rifiuto che **nomina le serate** e offre di staccarle. Chi apre `organizer/artists` la chiude |
| **4** — l'uscita dalla demozione bloccata non ha un pulsante | **APERTA** | Scritta ed esportata; il controllo vive su una superficie fuori perimetro. **Finche' non e' collegato non si puo' dire che il percorso d'uscita e' spedito**: e' scritto, non raggiungibile. Vedi **prova 13** |
| **5** — `validUntil` e' `null` su un evento non pubblicato | **CHIUSA** il 2026-08-09 | Piano **35-10**, **misurata**: capability conferita, zero righe visibili, `validUntil` `null`. La deduzione era giusta e ora c'e' una tabella al posto di un ragionamento. Il limite che ne resta e' la **voce 8** di sopra |
| **6** — la semantica `NULL` documentata sul registro non e' quella che il writer produce | **APERTA, fuori fase** | La migration e' **applicata in produzione dal 2026-08-08** e il gate *migration in avanti* la protegge: si corregge con una migration nuova, non riscrivendo un file gia' applicato. **La incontrera' la prima superficie che LEGGE il registro** — un lettore che si fidi del commento interpretera' un valore presente come «asse toccato» quando non lo e' |
| **7** — la scansione non riceve mai la notte | **CHIUSA** | Piano **35-22**, scritto dentro questa fase dopo la scoperta. E' la **prova 11** |
| **8** — un annullamento offline di una voce in coda non arriva al server | **APERTA, dichiarata** | **Non e' un difetto di correttezza**: se l'ammissione non ha mai raggiunto il server, lo stato finale del server e' *«non e' successo niente»*, che e' corretto. Cio' che si perde e' la **traccia** — e la perdita e' **dichiarata sullo schermo** (*«Undone at the door, held on this device (N)»*) invece che silenziosa. La chiusura fedele sono **due richieste per una voce**, cioe' una modifica al modello di richiesta del drain |
| **9** — il caricamento media rifiuta per tutti fino al piano 35-21 | **CHIUSA** il 2026-08-09 | Piano **35-21**: la notte e' passata **e** `partyId` e' obbligatorio. La finestra era **interna alla fase** e si e' chiusa alla wave 8. **`deferred-items.md` porta ancora la voce come aperta**, perche' nessun piano l'ha riaperta per aggiornarla: questa riga e' la registrazione della chiusura |
| **10** — il ramo dei rimborsi non confronta la notte nominata | **APERTA** | E' **preesistente** e vale **identico per `master` e per `organizer`**. Chiuderla **solo per gli assegnatari** costruirebbe una **porta a due velocita'**: la stessa persona ammessa dal telefono di un organizer e rifiutata da quello di uno staff, la stessa sera, alla stessa porta. **Si chiude per tutti i ruoli insieme o non si chiude** — e la direzione va scelta ricordando che alla porta, davanti a una fila, **un controllo in piu' e' un modo in piu' di rifiutare** |
| **11** — il caso C della prova 11 vive in una finestra che si chiude | **SEQUENZA, non un debito** | Non e' una cosa da fare: e' un **ordine da rispettare**. **C → coda → A e B**, ed e' scritto in testa alla prova 11 |

**Riepilogo:** quattro chiuse (1, 5, 7, 9), una **ritirata perche' falsa** (2),
cinque aperte (3, 4, 6, 8, 10), una che e' un vincolo di sequenza (11). Nessuna
e' stata cancellata.

---

## La decisione che governa quando si fa tutto questo

**Non e' riaperta qui.** `ACCESS-MODEL-DECISIONS.md § 12`, decisione del
proprietario del 2026-08-06: tutta la verifica manuale — le quattordici prove
della fase 32, le diciotto della 43 e le **tredici** di questa — si esegue **alla
fine della costruzione**, non fase per fase.

**Con quattro eccezioni, e non sono una riapertura della decisione.** Le prove
**12**, **7**, **10** e il caso **C** della **11** hanno una finestra che si
chiude: rimandarle non le rimanda, le **perde**. Sono elencate in testa a questo
file, e la decisione del proprietario riguarda **quando si fa la verifica**, non
**se esistano prove che scadono**.

**Il prezzo e' dichiarato, e si scrive una volta sola cosi' che nessuno lo
riscopra con sorpresa:** le fasi 33, 43, 35 e 34 poggiano tutte sul modello di
capability della fase 32. Se una di quelle prove e' rossa, cio' che le e' stato
costruito sopra e' costruito su una fondazione sbagliata, e **il rifacimento e'
proporzionale a quanto e' stato costruito**.

**Rimandato non significa verificato.** Il deliverable di questa fase e' questo
file **scritto**; **eseguirlo non lo e'**, e la differenza va tenuta. Tutte e
tredici le prove portano `status: pending`: **la fase 35 non ha una sola prova
manuale chiusa**, e nessun `35-VERIFICATION.md` puo' scrivere «verificato» su un
requisito la cui meta' osservabile e' ancora in questo elenco.

`status: written` nel frontmatter significa esattamente questo — le procedure
esistono e sono eseguibili senza chiedere niente a nessuno — e **non** significa
che qualcuno le abbia eseguite.
