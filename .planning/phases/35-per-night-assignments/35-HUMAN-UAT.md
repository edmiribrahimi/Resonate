---
status: partial
phase: 35-per-night-assignments
source: [35-01-PLAN.md, 35-VALIDATION.md, 43-HUMAN-UAT.md, ACCESS-MODEL-DECISIONS.md]
started: 2026-08-08
updated: 2026-08-08
queue_rows_applied: 6
queue_rows_total: 15
---

# Fase 35 — le prove da fare a mano

> **A cosa serve questo file.** In questo progetto **non esistono test
> automatici del prodotto**: nessuna macchina puo' dire se una cosa funziona
> davvero. L'unica prova che esistera' e' una persona che guarda uno schermo e
> scrive cosa ha visto. Questo file e' quella lista — e, prima ancora, **l'unico
> posto in cui l'ordine di applicazione delle migration e' scritto per intero**.
> Nessun piano successivo della fase 35 lo ricostruisce: lo legge da qui.
>
> **Cosa c'e' oggi e cosa arriva dopo.** Questa e' la versione di Wave 0: porta
> la coda di applicazione, il falso verde del build e i segnaposto delle prove.
> **Le procedure passo-per-passo per requisito arrivano con il piano 35-14**, e
> fino ad allora ogni voce dell'elenco in fondo e' `pending` senza istruzioni.
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

Sono **undici**: dieci prese da `35-VALIDATION.md § Manual-Only Verifications`,
piu' la **11**, che non viene da li' perche' il buco che prova e' stato trovato
**durante l'esecuzione** — dal piano 35-12, e chiuso dal piano **35-22**. **Qui
ci sono i segnaposto, non le procedure**: i passi, il ruolo, le precondizioni e
cosa deve succedere arrivano con il **piano 35-14** — con l'eccezione della
**11**, che porta gia' la propria procedura qui sotto, perche' uno dei suoi tre
casi vive in una **finestra che si chiude** e non puo' aspettare 35-14.

Nessuna di queste e' rimandabile a uno strumento. Ognuna esiste perche' un
comando di questo repository **non puo'** rispondere alla domanda che pone.

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

**Due dipendenze dalla coda, dichiarate qui perche' cambiano l'esito e non solo
il calendario.** La prova **7** e' falsa-negativa finche' la riga 14 non e'
applicata: la sessione `staff` verrebbe rimbalzata per una ragione diversa da
quella che la prova cerca. La prova **10** e' falsa-positiva finche' la riga 15
non e' applicata: si puo' osservare un file spogliato dalla rotta **mentre** la
porta del browser resta aperta accanto.

**E una terza, di segno opposto.** I casi **A** e **B** della prova **11**
pretendono la riga 8 applicata; il caso **C** pretende che **non** lo sia. Non e'
una contraddizione: sono due momenti diversi della stessa sera di lavoro, e
l'ordine fra loro non e' negoziabile — **C prima, poi la coda, poi A e B**.

---

## Prova 11 — la scansione riceve la notte (piano 35-22)

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

## La dichiarazione di copertura, onesta

**Quattro requisiti su otto sono chiudibili automaticamente** — ASSIGN-01
(limitatamente al **permesso**), ASSIGN-04, ASSIGN-06, ASSIGN-07. **Gli altri
quattro — ASSIGN-02, ASSIGN-03, ASSIGN-05, ASSIGN-08 — hanno una meta' che
nessuno strumento di questo repository puo' raggiungere**, perche' vive su un
telefono, con la radio spenta, in un build di produzione.

E ASSIGN-01 porta la propria: la matrice di scrittura prova che il **permesso**
e' per-notte; non prova che la persona assegnata **arrivi** allo strumento.
Quella meta' si osserva solo aprendo l'applicazione.

**E c'e' un terzo pezzo, che fino al piano 35-22 non era nemmeno elencato:
arrivare allo strumento non e' usarlo.** La prova **7** osserva che
l'assegnatario *raggiunge* lo scanner; la prova **11** osserva che *scansiona*.
Erano la stessa voce per omissione, e per ventuno piani nessuno ha guardato la
seconda meta'. Restano due prove distinte perche' sono due gate distinti — il
middleware e la rotta — e uno verde non dice niente sull'altro.

---

## La decisione che governa quando si fa tutto questo

**Non e' riaperta qui.** `ACCESS-MODEL-DECISIONS.md § 12`, decisione del
proprietario del 2026-08-06: tutta la verifica manuale — le quattordici prove
della fase 32, le diciotto della 43 e le dieci di questa — si esegue **alla fine
della costruzione**, non fase per fase.

**Il prezzo e' dichiarato, e si scrive una volta sola cosi' che nessuno lo
riscopra con sorpresa:** le fasi 33, 43, 35 e 34 poggiano tutte sul modello di
capability della fase 32. Se una di quelle prove e' rossa, cio' che le e' stato
costruito sopra e' costruito su una fondazione sbagliata, e **il rifacimento e'
proporzionale a quanto e' stato costruito**.

**Rimandato non significa verificato.** Finche' questo file resta
`status: partial`, la fase 35 non ha una sola prova manuale chiusa, e nessun
`35-VERIFICATION.md` puo' scrivere «verificato» su un requisito la cui meta'
osservabile e' ancora in questo elenco.
