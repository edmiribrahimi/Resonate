---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
written: 2026-08-20
status: all pending
closes: ICS-01 (l'ordine di cancellazione, osservato), ICS-01b (D-58-01, il rifiuto sul progressivo), ICS-03 (le due eccezioni di stato), ICS-03b (D-58-02, l'eccezione di sopravvivenza), e il piano di rientro che D-58-05 punto 3 pretende prima del primo `--apply`
carries: la forma di `44-PROCEDURES.md` — frontmatter-contratto, regole di lettura, passi numerati con il ruolo, un `Result` pendente per passo
accounts: tre — il ruolo che possiede la chiave di sezione del calendario, il ruolo che possiede la chiave di annuncio, e chi esegue la procedura; ruoli, mai nomi
authorisation: P-58-C **legge soltanto**. P-58-A e P-58-B **SCRIVONO IN PRODUZIONE** e ognuna porta la propria autorizzazione datata, che non copre l'altra e non viaggia con essa
phase_closes: non prima che ogni `Result` qui sotto porti un'osservazione
---

# Fase 58 — Le procedure

> **(a) Ogni `Result` qui sotto dice `pending`, e un Result pendente e' una
> procedura NON ESEGUITA** — mai un verificato-per-ispezione travestito. Una
> tabella di spunte che nessuno si e' guadagnato e' peggio di una tabella vuota,
> perche' chiude una fase.
>
> **(b) Ruoli, mai nomi.** `.planning/` e' tracciato e questo repository e'
> **PUBBLICO**. Una persona qui e' *il ruolo che possiede la chiave di sezione
> del calendario*, *il ruolo che possiede la chiave di annuncio*, *chi esegue la
> procedura*. Mai un nome. E **nessuna sede, nessuna data di serata e nessuna
> line-up compare in questo file**: un passo dice *apri il calendario e leggi la
> prima riga*, mai cosa dice quella riga.
>
> **(c) `ticked_by_name` e' un nome di persona, e non entra qui.** La migration
> del calendario di produzione lo vieta esplicitamente per qualunque cosa stia
> sotto `.planning/` (`production_calendar.sql:706-713`). Dove una procedura
> deve dimostrare che l'autore di una spunta non e' cambiato, **si annota
> l'identificativo, non il nome**, e si scrive *l'autore e' invariato*.
>
> **(d) L'unica riga di questo file che contiene quattro cifre di un anno e'
> `written:` nel frontmatter**, ed e' la data in cui il documento e' stato
> scritto — non una data di serata. Le date delle tre autorizzazioni si scrivono
> **il giorno in cui si eseguono**, negli spazi lasciati vuoti apposta. Le
> migration sono nominate **senza il loro prefisso numerico**, perche' quel
> prefisso e' una data.
>
> **(e) Perche' queste tre e non altre.** Tutto il resto di questa fase ha un
> comando. Queste tre sono le cose che **nessun comando di questo repository
> puo' chiudere**, e la ragione e' la stessa per tutte: nessuna apre una
> sessione, e nessuna puo' far morire un processo a meta' per vedere cosa
> succede. Chi le esegue e' l'unico strumento che esista.
>
> **(f) `P-58-C` sta in testa al file, e non e' un ordine di comodo.** E'
> l'unica delle tre che **deve esistere prima che chiunque lanci un `--apply`**.
> Il client Supabase non apre transazioni; non c'e' point-in-time recovery; e con
> il cron di `ICS-10` un processo puo' morire fra la cancellazione e la
> riscrittura **di notte, senza nessuno che guardi** — questo progetto non ha
> error tracking, quindi nessun fallimento raggiunge un essere umano da solo. Chi
> scorre questo file deve incontrare il piano di rientro **prima** delle due
> procedure che scrivono.

---

## Come si legge un passo

- I passi sono numerati e si eseguono **nell'ordine scritto**. La numerazione
  corre continua attraverso le tre procedure: *passo 11* e' univoco nel file.
- Ogni passo nomina **il ruolo con cui viene eseguito**. Dove il ruolo cambia, il
  cambio e' un passo a se', perche' un passo eseguito con l'account sbagliato
  produce un'osservazione sulla domanda sbagliata.
- Ogni passo si chiude con una riga `Result:` che dice `pending`. Va riempita con cio' che
  e' stato **osservato** — un fatto che una seconda persona guardando lo stesso
  schermo potrebbe confermare o smentire. *«Ha funzionato»* non e'
  un'osservazione. *«Il referto ha stampato `plans: 2, pieces: 46` e i conteggi
  riletti dal catalogo dicono gli stessi due numeri»* lo e'.
- Dove un passo dice **se non e' andata cosi', quello e' il ritrovamento**, si
  scrive cosa e' successo invece, testualmente. **Non si riprova finche' passa.**
- **P-58-C non crea e non cancella niente in produzione: legge.** P-58-A e
  P-58-B scrivono, e lo dicono a ogni passo.
- **Il conteggio di controllo non si chiede allo strumento che ha causato
  l'effetto.** Una rimozione fatta sul database si conferma dall'interfaccia; una
  fatta dall'interfaccia si conferma dal catalogo. Una misura presa con lo
  strumento che ha prodotto l'effetto e' un'eco (`ai-engineering.md`, *gate il
  contatore di controllo non legge la superficie che sta muovendo*).

---

# P-58-C — Il ripristino dopo uno specchio interrotto

> **Questa procedura esiste prima delle altre due perche' deve.** Un import che
> muore fra la cancellazione e la riscrittura lascia il calendario **vuoto per
> quella chiave**, e non esiste nessun altro piano di rientro: niente PITR,
> nessuna transazione, e — dal cron di `ICS-10` in poi — nessuno che guardi.
>
> **Precondizione.** Lo specchio e' morto fra la cancellazione e la riscrittura.
> Il segnale e' `failPartway`, oppure un referto che si interrompe dopo la riga
> della cancellazione, oppure una superficie del calendario che mostra meno
> righe di quante il file ne porti.
>
> **Questa procedura non scrive in produzione con le proprie mani.** Rilancia lo
> strumento che ci scrive gia' e legge il catalogo. Non ha bisogno di
> un'autorizzazione propria, e **non ne concede una** a P-58-A o P-58-B.

### Passo 1 — Non rilanciare, e non premere niente

**Come:** chi esegue la procedura.

- **Non rilanciare l'import.** Il primo gesto sbagliato e' un secondo giro
  automatico che cancella cio' che il primo aveva scritto a meta'.
- **Non premere nulla sulla superficie del calendario** — nessuna spunta, nessun
  legame, nessun annuncio. Uno stato umano messo adesso su una riga che sta per
  essere riscritta si perde al passo 4 e non compare in nessuna istantanea.
- Se il cron di `ICS-10` puo' scattare prima che la procedura sia finita,
  **fermarlo o disattivarlo adesso**, e annotare l'ora in cui e' stato fermato.
  Un rientro corso contro un processo automatico e' un rientro che perde.
- Annotare l'ora di orologio.

Result: pending

### Passo 2 — I conteggi, chiesti al catalogo

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Leggere, **per la chiave di calendario coinvolta**, il numero di righe delle
  tre tabelle specchiate — piani, pezzi, impegni — **piu'** le voci di checklist.
- Leggere anche: quante voci di checklist portano una spunta, e quante righe di
  piano portano un legame con una serata.
- **Il catalogo e' la fonte giusta perche' e' diversa dallo strumento che ha
  causato l'effetto.** L'effetto e' stato prodotto dall'import; la misura si
  prende altrove.
- Registrare i numeri, **mai una riga**. Nessun titolo, nessun identificativo,
  nessuna data.

Result: pending

### Passo 3 — L'istantanea, cercata prima di sperarci

**Come:** chi esegue la procedura.

- Localizzare l'istantanea che l'importatore ha scritto **prima** della
  cancellazione, nella directory ignorata dal repo.
- Verificarne **l'ora rispetto all'ora della corsa interrotta**. Un'istantanea
  piu' vecchia della corsa e' l'istantanea di un altro giro, e ripristinare da
  quella riporta indietro spunte che nel frattempo erano state tolte.
- Verificare che copra **le due eccezioni di stato di `ICS-03`**: le spunte, per
  la chiave stabile `(source_uid, kind, label)`, e i legami, per `source_uid`.
- ⚠ **Se l'istantanea non c'e', o e' della corsa sbagliata, la procedura non
  prosegue oltre il passo 4.** Si va al passo 7 e si scrive il ritrovamento per
  esteso. E' il ritrovamento peggiore che questa procedura possa fare, e va
  scritto — non aggirato con un secondo tentativo.

Result: pending

### Passo 4 — Il secondo giro, con la stessa chiave e la stessa sorgente

**Come:** chi esegue la procedura.

- Rilanciare l'import con **la stessa chiave di calendario** e **la stessa
  sorgente** della corsa interrotta. Una chiave diversa specchia un altro
  calendario e lascia questo vuoto; una sorgente diversa riscrive un contenuto
  diverso da quello che era stato cancellato.
- **Lo specchio e' idempotente per costruzione.** Cancella cio' che sta nello
  scopo e riscrive l'intero contenuto del file: una seconda corsa **completa**
  ripristina tutto cio' che il file porta. Cio' che il file **non** porta non
  torna, e non deve tornare — e' esattamente cosa significa specchio.
- Osservare che la corsa arriva in fondo. Se muore di nuovo nello stesso punto,
  **il problema non e' la corsa**: scriverlo al passo 7 e fermarsi.

Result: pending

### Passo 5 — Le spunte e i legami, rimessi senza riattribuirli

**Come:** chi esegue la procedura, dallo script con il client di servizio.

- Ripristinare spunte e legami **dall'istantanea del passo 3**, con il percorso
  di ripristino dedicato.
- ⚠ **Non con `record_checklist_tick`.** Quella funzione **ri-registra
  l'autore a ogni chiamata**, per decisione dichiarata nella migration di accesso
  al calendario di produzione (`production_calendar_access.sql:395-400`).
  Usarla qui attribuirebbe la spunta **a chi ha lanciato l'import** — che e'
  Pitfall 8 della ricerca, e che e' il modo esatto in cui un rientro cancella la
  cosa che stava salvando. **Un ripristino non e' un atto.**
- Il percorso corretto conserva `ticked_by` e `ticked_at` originali, e li
  riscrive per la chiave stabile `(source_uid, kind, label)`, non per `plan_id`
  — che e' un identificativo generato, quindi cambiato.
- I legami si rimettono per `source_uid`.
- **Il referto non stampa il contenuto dell'istantanea**, che e' materiale:
  contiene un nome di persona.

Result: pending

### Passo 6 — La riconferma, dalla stessa fonte del passo 2

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Rileggere **gli stessi conteggi del passo 2**, con la stessa query, per la
  stessa chiave di calendario.
- Confrontarli riga per riga. **Le spunte e i legami devono coincidere con
  quelli del passo 2**; i conteggi delle tre tabelle specchiate devono
  corrispondere a cio' che il file porta, che puo' essere legittimamente diverso
  da prima.
- Se le spunte sono meno di quante ne diceva il passo 2, **la differenza e' il
  ritrovamento**, e va scritta come numero. Non si rilancia il passo 5 sperando
  che si sistemi.
- Riaccendere il cron fermato al passo 1, e annotare l'ora.

Result: pending

### Passo 7 — Il referto del rientro

**Come:** chi esegue la procedura.

- Scrivere qui, per esteso, **cosa e' stato osservato**: i conteggi del passo 2,
  quelli del passo 6, la differenza fra i due, l'ora della corsa interrotta e
  l'ora dell'istantanea.
- **Se l'istantanea non esisteva, scriverlo qui a lettere intere**, con quante
  spunte e quanti legami il passo 2 diceva che c'erano. Quel numero e' la misura
  di cio' che e' andato perso, ed e' l'unica traccia che ne restera'.
- Numeri e categorie soltanto. Nessun titolo, nessun identificativo grezzo,
  nessuna data di serata.

Result: pending

## La riga che questa procedura sostituisce

Oggi `failPartway` chiude con due righe di consiglio:

> *«Re-run with `--dry-run` first: the reconciler is keyed on the file's own
> UIDs, so a second pass plans only what the first did not finish.»*

**Con lo specchio quelle due righe diventano false.** Descrivevano un
aggiornamento campo per campo, dove «a meta' strada» significava *alcune righe
aggiornate*. Con lo specchio significa **il calendario cancellato e non
riscritto**, e un `--dry-run` che «pianifica solo cio' che il primo giro non ha
finito» pianifica, in quel caso, l'intero calendario — cioe' non dice niente.

Il piano 58-09 sostituira' quelle due righe con un rimando a questa procedura.
**Questa procedura e' quel rimando**, e questa riga e' la dichiarazione che
esiste prima del codice che la citera'.

---

# P-58-A — Una spunta sopravvive a un import

> ## ⚠ QUESTA PROCEDURA SCRIVE IN PRODUZIONE
>
> Mette una spunta su una voce di checklist reale e lancia un import con
> `--apply` su una chiave di calendario reale. L'import **cancella e riscrive**:
> non aggiorna. La cascata dichiarata dalla migration del calendario di
> produzione (`production_calendar.sql:648-661`) porta via le voci di checklist
> **e le loro spunte** insieme al piano.
>
> **Autorizzazione (data): 2026-08-20 — CONCESSA — vale SOLO per P-58-A.**
> Chiesta ed ottenuta dal proprietario nella seduta del piano 58-11, opzione
> **`autorizza-tutte-e-tre`**: le tre scritture sono state presentate una per
> una — **(a)** il primo specchio con `--apply` e il passaggio una tantum sulle
> righe senza chiave, **(b)** questa procedura, **(c)** `P-58-B` — con davanti i
> numeri di `M1` (2 piani, 46 pezzi, 79 impegni, 14 voci di checklist; **zero
> spunte e zero legami**) e il costo dichiarato: **nessun PITR, nessuna
> transazione, cascata su `production_checklist_item`**. Il proprietario ha
> risposto con quei numeri davanti.
> ⚠ **Il cron non e' autorizzato da questa riga** e non lo e' da nessuna delle
> altre due: gira per la prima volta nel piano 58-12.
> Si chiede il giorno in cui si esegue, nominando questa procedura. Un permesso
> a eseguire P-58-B **non copre questa**, e questa non copre quella: sono due
> atti, non un permesso (`ai-engineering.md`, *gate l'autorizzazione a scrivere
> in produzione e' un atto, non un permesso*). Si dichiara qui quando e' stata
> data e, al passo 15, quando e' stata esaurita.
>
> **Il ripristino alla fine e' per CHIAVE PRIMARIA**, dalla lista catturata al
> passo 10, e **mai premendo un controllo su una pagina**. Il verso dell'errore
> e' il punto: un selettore per chiave primaria sbagliato **non trova nulla**;
> un selettore per interfaccia sbagliato **li trova tutti**. Questo repository ha
> gia' pagato quella differenza — due eventi reali e 63 righe in sette tabelle,
> non recuperabili, perche' non c'e' PITR.

**Cosa chiude.** `ICS-03`, prima eccezione: *la spunta e' una delle due cose che
una persona ha messo li' e che il calendario non sa*. La chiave stabile esiste —
`(production_plan.source_uid, kind, label)` — perche' `source_uid` e' identita'
dichiarata dalla migration (`production_calendar.sql:168-183`). Questa procedura
osserva che quella chiave regge **attraverso una cancellazione**, che e' l'unica
cosa che nessuna lettura di codice puo' dire.

**Perche' il piano di rientro viene prima.** Fra la cancellazione e il
ripristino del passo 5 di `P-58-C` non c'e' transazione. Se questa procedura
muore in mezzo, il rientro e' `P-58-C`, e va letto **prima** di cominciare.

### Passo 8 — L'autorizzazione, scritta prima di toccare qualcosa

**Come:** chi esegue la procedura.

- Scrivere qui l'autorizzazione del proprietario **per questa procedura**, con la
  sua data. Se manca, **fermarsi**: a questo passo non c'e' altro da fare che
  ottenerla.
- Confermare che il deploy sotto prova porta i commit di questa fase — cioe' che
  l'import e' gia' lo specchio e non piu' il riconciliatore. Provare la
  sopravvivenza di una spunta contro il vecchio import non risponde a niente.
- Annotare l'ora di orologio. Una precondizione letta ieri e' un ricordo.

Result: pending

### Passo 9 — La cascata, enumerata rileggendo i vincoli

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- **Enumerare la cascata leggendo i vincoli adesso**, da `pg_constraint`: ogni
  tabella raggiungibile dalle tre tabelle specchiate per una chiave esterna
  dichiarata `ON DELETE CASCADE`. **Non copiarla da questo file** e non
  ricordarla: una cascata e' un percorso di scrittura che nessuno ha dichiarato,
  e l'incidente registrato in `ai-engineering.md` e' nato esattamente da
  un'istantanea che copriva cio' che l'agente intendeva toccare e non cio' che la
  cascata avrebbe portato via.
- Prendere l'istantanea **su tutte** le tabelle enumerate, non solo su quelle che
  si intende toccare. L'istantanea va nella directory ignorata dal repo: contiene
  un nome di persona e non puo' entrare in `.planning/`.
- Annotare **quante** tabelle sono risultate raggiungibili. Se il numero e'
  diverso da quello che questa fase si aspetta, **quello e' il ritrovamento** e
  va scritto prima di procedere.

Result: pending

### Passo 10 — Gli identificativi, catturati al momento

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Catturare, **prima di qualunque scrittura**: la lista completa degli `id` delle
  voci di checklist della chiave di calendario sotto prova, e lo stato di spunta
  di ognuna.
- Questa lista e' **l'unica** che il ripristino del passo 15 potra' consultare.
  Catturarla dopo la scrittura significa non poter piu' distinguere cio' che
  c'era da cio' che si e' aggiunto.
- Registrare **il conteggio** nel `Result`; gli identificativi restano fuori dal
  repo.

Result: pending

### Passo 11 — La spunta, messa dalla superficie

**Come:** il ruolo che possiede la chiave di sezione del calendario.

- Aprire la superficie del calendario e una serata che porta almeno una voce di
  checklist. **Non registrare cosa dice quella voce.**
- Spuntare una voce. Osservare: la casella **resta** spuntata, e compare la riga
  d'autore.
- Osservare che la riga d'autore nomina **questo account** e non un altro.
  Registrare l'osservazione come *l'autore e' l'account che ha premuto*, **senza
  scrivere il nome**.

Result: pending

### Passo 12 — La spunta, letta dal catalogo

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Leggere `ticked_by` e `ticked_at` di quella voce.
- **Annotare l'identificativo, non il nome.** `ticked_by_name` non entra in
  questo file, in un SUMMARY o in qualunque cosa stia sotto `.planning/`.
- Annotare anche la chiave stabile della voce — `(source_uid, kind, label)` —
  **come fatto di esistenza**, non come valore: *la voce e' identificabile per
  la sua chiave stabile*, senza riportarne il contenuto.

Result: pending

### Passo 13 — L'import, con `--apply`

**Come:** chi esegue la procedura.

- Lanciare l'import con `--apply` per la chiave di calendario sotto prova.
- Osservare che il referto dichiara **quante righe ha cancellato** e **quante ne
  ha riscritte**, e che dichiara **quante spunte ha riagganciato**.
- Osservare che il referto **non stampa nessun identificativo grezzo** — ne'
  della corsa, ne' delle righe. E' la regola che `ICS-07` stabilisce una volta
  per tutte, e questo passo e' la prima occasione in cui la si vede applicata a
  righe nuove.
- Se la corsa muore, **andare a `P-58-C`** e scrivere qui che ci si e' andati.

Result: pending

### Passo 14 — La rilettura, per la chiave stabile

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Rileggere la stessa voce **per la chiave stabile** `(production_plan.source_uid,
  kind, label)` — **non** per `plan_id`, che e' un identificativo generato e che
  la cancellazione ha certamente cambiato.
- Osservare che `ticked_at` e `ticked_by` sono **gli stessi del passo 12**.
- ⚠ **Se `ticked_by` e' diventato l'account che ha lanciato l'import, quello e'
  il ritrovamento**, ed e' Pitfall 8 avvenuto in produzione: il ripristino ha
  usato `record_checklist_tick`. Scriverlo e fermarsi.
- Osservare inoltre che la casella e' ancora spuntata **sulla superficie**, non
  solo nel catalogo: sono due letture e vanno registrate separatamente.

Result: pending

### Passo 15 — Il ripristino, per chiave primaria

**Come:** chi esegue la procedura.

- Riportare le voci di checklist allo stato registrato al passo 10, **per le
  chiavi primarie di quella lista**, calcolando la differenza fra la lista di
  allora e quella di adesso. Mai per titolo, mai da un controllo su una pagina,
  mai risalendo il DOM.
- ⚠ Gli `id` sono cambiati: lo specchio ha cancellato e riscritto. Il ripristino
  si fa quindi **per la chiave stabile**, e la lista del passo 10 serve a dire
  **quali** voci vanno riportate a non spuntate — non a indirizzarle.
- Confermare il conteggio **da una fonte diversa da quella su cui si e' agito**:
  se il ripristino e' passato dal catalogo, il controllo si legge dalla
  superficie.
- Dichiarare l'autorizzazione del passo 8 **esaurita**, con l'ora.

Result: pending

---

# P-58-B — Un legame con una serata pubblicata sopravvive a un import

> ## ⚠ QUESTA PROCEDURA SCRIVE IN PRODUZIONE
>
> Crea un legame fra una riga di calendario e una serata reale, e lancia tre
> import con `--apply` — uno normale, uno con un file di prova che ha perso una
> voce, uno con un file di prova che ha cambiato un progressivo. Due di questi
> tre sono **file di prova costruiti per l'occasione**, e vanno costruiti dal
> file vero cambiando una cosa sola.
>
> **Autorizzazione (data): 2026-08-20 — CONCESSA — vale SOLO per P-58-B.**
> Chiesta ed ottenuta dal proprietario nella seduta del piano 58-11, opzione
> **`autorizza-tutte-e-tre`**, e **nominata separatamente da quella di P-58-A**:
> le tre scritture — **(a)** il primo specchio, **(b)** `P-58-A`, **(c)** questa
> procedura — sono state presentate una per una, con davanti i numeri di `M1`
> (2 piani, 46 pezzi, 79 impegni, 14 voci di checklist; **zero spunte e zero
> legami**) e il costo dichiarato: **nessun PITR, nessuna transazione, cascata su
> `production_checklist_item`**.
> ⚠ **Il cron non e' autorizzato da questa riga**: gira per la prima volta nel
> piano 58-12.
> E' **un'autorizzazione diversa** da quella di P-58-A e non ne eredita nulla:
> P-58-A mette e toglie una spunta su una voce che esiste gia'; **questa crea un
> legame verso una serata pubblicata** e mette alla prova il rifiuto che
> protegge un progressivo. Il progressivo e' la terza guardia monotona del
> progetto. Si dichiara qui quando l'autorizzazione e' stata data e, al passo 24,
> quando e' stata esaurita.
>
> ⚠ **Nessun passo di questa procedura spende un progressivo nuovo, e nessuno
> annuncia una serata.** Il legame si crea su una serata **gia' esistente**. Se
> per eseguirla servisse annunciare qualcosa, la procedura si ferma: quella e'
> un'autorizzazione diversa ancora.
>
> **La rimozione finale e' per CHIAVE PRIMARIA**, dalla lista del passo 18, e
> mai da un controllo su una pagina.

**Cosa chiude.** `ICS-03` seconda eccezione (il legame **si riaggancia**),
`ICS-03b` / D-58-02 (una riga di piano con un legame **non se ne va**, ed e'
un'eccezione di **sopravvivenza**, distinta dalle due di **stato**), e `ICS-01b`
/ D-58-01 (il rifiuto che sostituisce la guardia del database sul progressivo,
perche' uno specchio non fa mai `UPDATE` e il trigger `BEFORE UPDATE OF number`
smette di scattare).

### Passo 16 — L'autorizzazione, propria e non ereditata

**Come:** chi esegue la procedura.

- Scrivere qui l'autorizzazione del proprietario **per questa procedura**, con la
  sua data, e confermare per iscritto che **non e' quella di P-58-A**.
- Confermare che il deploy sotto prova porta i commit di questa fase, compreso il
  rifiuto sul progressivo e l'argomento di riautorizzazione.
- Annotare l'ora di orologio.

Result: pending

### Passo 17 — La cascata, enumerata rileggendo i vincoli

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- **Enumerare di nuovo la cascata leggendo i vincoli adesso**, da
  `pg_constraint`. Non riusare l'elenco del passo 9: fra le due esecuzioni puo'
  essere passata una migration, e un elenco copiato e' un elenco che smette di
  essere vero senza dirlo.
- Enumerare **anche** le chiavi esterne che puntano **verso l'esterno** —
  `production_plan.linked_party_id → event_parties(id)`, `NO ACTION` — e
  osservare che cancellare la riga di piano **non tocca la serata**: la lascia
  senza nessuno che la indichi. E' la ragione per cui esiste D-58-02.
- Prendere l'istantanea su **tutte** le tabelle enumerate, nella directory
  ignorata dal repo.

Result: pending

### Passo 18 — Gli identificativi, catturati al momento della creazione

**Come:** chi esegue la procedura, con la Management API e `read_only: true`.

- Catturare, **prima di qualunque scrittura**: gli `id` e i `source_uid` delle
  righe di piano della chiave sotto prova, con il valore corrente di
  `linked_party_id` e di `number` per ognuna.
- Catturare l'`id` della serata a cui il legame verra' fatto, e il progressivo
  corrente della sua serie.
- Questa lista e' **l'unica** che il passo 24 potra' consultare.
- Registrare i **conteggi** nel `Result`; gli identificativi restano fuori dal
  repo.

Result: pending

### Passo 19 — Il legame, creato

**Come:** il ruolo che possiede la chiave di annuncio.

- Creare il legame fra **una** riga di piano e **una** serata gia' esistente.
- Annotare gli identificativi delle due righe **nella lista fuori dal repo**, non
  qui.
- Osservare dalla superficie che il legame e' mostrato, e dal catalogo che
  `linked_party_id` e' quello atteso. Due letture, due osservazioni.
- Osservare che **nessun progressivo e' stato speso**: rileggere il progressivo
  della serie e confrontarlo con quello del passo 18. Se e' salito, **fermarsi**:
  questa procedura non doveva spenderlo, e un progressivo non si restituisce.

Result: pending

### Passo 20 — Il primo import, con il file vero

**Come:** chi esegue la procedura.

- Lanciare l'import con `--apply` per la chiave sotto prova, con **il file vero**
  — quello che porta ancora quel `source_uid`.
- Rileggere dal catalogo: `linked_party_id` e' **ancora li'**, sulla riga di
  piano identificata per `source_uid`.
- Osservare che il referto dichiara **quanti legami ha riagganciato**, come
  conteggio.
- ⚠ Se il legame e' sparito, **quello e' il ritrovamento** e la serata e' rimasta
  senza nessuno che la indichi: scriverlo, andare a `P-58-C`, e trattarlo come un
  blocco della fase — non come un'osservazione da annotare e proseguire.

Result: pending

### Passo 21 — `ICS-03b` — il file che ha perso quella voce

**Come:** chi esegue la procedura.

- Costruire un file di prova **identico al file vero tranne una cosa**: **non
  porta piu'** il `source_uid` della riga legata al passo 19.
- Lanciare l'import con `--apply` su quel file.
- Osservare che **la riga di piano c'e' ancora**, letta dal catalogo per
  `source_uid`, e che porta ancora il suo `linked_party_id`. E' l'eccezione di
  **sopravvivenza** di D-58-02: una riga con un legame **non si cancella mai**,
  qualunque cosa dica il file.
- Osservare che il referto **conta** le righe sopravvissute a un'assenza, e che
  il conteggio e' `1`. Un'eccezione che sopravvive in silenzio e' un'eccezione
  non dichiarata, che e' esattamente cio' che `ICS-03` esiste per vietare.
- Osservare che il referto le **conta** e non le **nomina**: nessun
  identificativo grezzo.

Result: pending

### Passo 22 — `ICS-01b` — il progressivo che cambia, e il rifiuto

**Come:** chi esegue la procedura.

- Costruire un secondo file di prova **identico al file vero tranne una cosa**:
  per **lo stesso `source_uid`**, porta un **progressivo diverso**.
- Lanciare l'import con `--apply` su quel file.
- Osservare che l'import **rifiuta**, con uscita `2`.
- Osservare che il rifiuto **nomina la serata e i due numeri** — quello noto e
  quello in arrivo — perche' un rifiuto che dice solo *no* manda chi legge a
  cercare cosa e' cambiato.
- Osservare che **non ha scritto niente**: rileggere dal catalogo i conteggi
  delle tre tabelle specchiate e confrontarli con quelli letti subito prima. Sono
  gli stessi. **Questa e' l'osservazione che pesa di piu' di tutta la
  procedura**: la guardia del progressivo si e' spostata dal database
  all'applicazione, che e' esattamente dove il commento della migration dice che
  *non sopravvive al chiamante distratto*. Qui si guarda se sopravvive.
- ⚠ Se il rifiuto e' arrivato **dopo** la cancellazione, il calendario e' vuoto:
  andare a `P-58-C`, e scrivere che il rifiuto arriva troppo tardi — un rifiuto
  che non e' *prima di scrivere* non e' un rifiuto, e' un fallimento.

Result: pending

### Passo 23 — `ICS-01b` — la riautorizzazione esplicita

**Come:** chi esegue la procedura.

- Rilanciare **lo stesso file di prova del passo 22**, questa volta con
  **l'argomento esplicito di riautorizzazione**.
- Osservare che passa.
- Osservare che **la riautorizzazione compare nel referto**, per esteso, e che
  dice quale serata e' stata rinumerata e da quale numero a quale. Una
  rinumerazione autorizzata e una non autorizzata devono lasciare due tracce
  diverse: se il referto e' identico a quello di una corsa normale, **quello e'
  il ritrovamento**.
- Rileggere dal catalogo il numero della riga: e' quello del file di prova.
- Riportare il numero al valore del passo 18 rilanciando l'import **con il file
  vero** e la riautorizzazione, e osservare che ci torna.

Result: pending

### Passo 24 — La rimozione, per chiave primaria

**Come:** chi esegue la procedura.

- Rimuovere **solo** cio' che questa procedura ha creato o cambiato, **per le
  chiavi primarie della lista catturata al passo 18** e per `source_uid` dove
  gli identificativi sono stati riscritti dallo specchio. Mai da un controllo su
  una pagina, mai per titolo, mai risalendo da un elemento.
- Riportare `linked_party_id` al valore registrato al passo 18 — che per la riga
  usata era vuoto.
- Confermare **da una fonte diversa da quella su cui si e' agito**: se si e'
  agito sul catalogo, il conteggio di controllo si legge dalla superficie.
- Rileggere il progressivo della serie e confermare che e' quello del passo 18.
  **Se e' salito, non si riporta indietro**: e' una guardia monotona, si aggiunge
  in coda e non si rinumera. Si scrive che e' salito e perche'.
- Dichiarare l'autorizzazione del passo 16 **esaurita**, con l'ora.

Result: pending

---

## Blocco di chiusura

- **Ventiquattro passi, ventiquattro righe `Result:` a `pending`.** La numerazione
  corre continua: P-58-C tiene i passi da 1 a 7, P-58-A da 8 a 15, P-58-B da 16
  a 24. Un `Result` che dica altro da `pending` significa che la procedura e'
  stata eseguita e che l'osservazione e' scritta accanto.
- **P-58-C non scrive in produzione con le proprie mani.** P-58-A e P-58-B si',
  ognuna sotto la propria autorizzazione, e ognuna rimuove cio' che ha creato per
  chiave primaria.
- **Cosa questo documento non chiude.** Non dice niente su cosa succede quando il
  cron di `ICS-10` gira senza nessuno che guardi — dice solo cosa fare **dopo**.
  Non dice niente sul contenuto di nessuna serata, per costruzione: quel
  contenuto e' esattamente cio' che non puo' viaggiare dentro un file tracciato
  di un repository pubblico.
- **Un `Result` pendente non e' un `Result` superato.** Dove una procedura viene
  rimandata, il VERIFICATION.md della fase deve dire *rimandata*, e deve dire che
  rimandata non e' verificata. La `[x]` su una casella di roadmap e'
  un'affermazione sull'evidenza, e l'evidenza per queste tre sono le righe
  `Result:` qui sopra.

*Fase 58 — le tre procedure. Non contiene nessuna sede, nessuna data di serata,
nessuna line-up e nessun nome di persona. `re:sonate` si scrive con la e
normale.*
