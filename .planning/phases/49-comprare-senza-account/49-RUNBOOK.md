---
phase: 49-comprare-senza-account
document: runbook delle prove manuali
written: 2026-09-06
requirements: [BUY-01, BUY-02, BUY-03, BUY-04, BUY-05]
procedures_gathered: 52
procedures_executed: 0
authorisation_to_write_production: ESAURITA (49-AUTHORISATION.md)
---

# 49-RUNBOOK — le prove manuali della fase 49

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *un membro dello staff assegnato alla
> porta*, *chi configura le serate* — mai persone. Nessuna sede, nessuna data non
> annunciata, nessuna line-up, nessun indirizzo.

---

## 0. Perche' questo documento esiste, e come si legge

`meta-gates.md`, sezione *Il gate della verifica, in un repo senza test*:

> «Non dire **mai** che una modifica al prodotto e' verificata perche' "i test
> passano". Non ci sono test. […] Per tutto cio' che tocca accesso, denaro, porta
> o venue, serve **una procedura manuale scritta**: quali passi, con quale ruolo,
> e cosa si deve osservare. Scritta, non evocata — perche' e' l'unica prova che
> esistera'.»

La fase 49 ha toccato **tutti e quattro**: l'accesso (un'identita' creata al
volo), il denaro (un checkout senza sessione), la porta (un biglietto al
portatore), il venue (un arm nuovo della funzione che decide chi legge
l'indirizzo). Quindi questo documento **non e' carta**: e' l'intera base
probatoria della fase, e tutto cio' che non scrive qui e' qualcosa che nessuno
controllera' mai.

### Le tre parole che questo documento usa, e cosa significano

| Stato | Significato |
|---|---|
| **ESEGUITA** | qualcuno l'ha percorsa e ha scritto **cio' che ha osservato**, con la data |
| **NON ESEGUIBILE OGGI** | manca una precondizione, **nominata**. Non e' un fallimento: e' un fatto con una causa |
| **MAI CONCLUSIVA** | la prova non esiste in nessun ambiente, e la ragione e' strutturale. Si dichiara, non si tiene pendente |

Un passo non eseguito **si dichiara non eseguito**. Una riga inventata rende
questo documento peggio che incompleto: lo rende falso, e un documento falso
sulla porta e' peggio di nessun documento.

### Il criterio di scrittura degli esiti

Si riporta **l'osservabile**, non l'aspettativa. *«Il riquadro e' diventato
verde e sotto c'era la fascia oraria»* e' un esito. *«Verificato»* non lo e',
e nemmeno *«funziona»*.

---

## 1. Lo stato del mondo, misurato oggi in sola lettura

**Misurato il 2026-09-06 da questo piano**, con la chiave di servizio e **zero
scritture**: nessun `INSERT`, nessun `UPDATE`, nessun `DELETE`, nessuna sessione
coniata.

| Cosa | Quante | Cosa blocca |
|---|---|---|
| `tickets` | **0** | ogni prova alla porta, ogni prova sulla mail, ogni prova sull'indirizzo |
| `ticket_orders` | **0** | ogni prova sul webhook, sull'ordine da piu' biglietti, sulla pagina d'ordine |
| `drink_orders` | **0** | — |
| `attendances` | **0** | nessuna scansione e' mai avvenuta in produzione |
| `email_deliveries` | **0** | ogni prova sul registro delle consegne |
| `rsvps` | **0** | il sesto passo del `P-REV-SEQ-1` |
| `profiles` | **4** | 1 master, 1 organizer, 2 member — **zero staff** |
| assegnazioni alla porta | **0** | ogni prova che pretende un membro dello staff assegnato |
| `events` pubblicati | **2**, entrambi con data **passata** | zero serate future in vendita |
| `event_parties` | **3**, tutte con data passata; tutte a `max_tickets_per_order = 6` | — |
| `ticket_tiers` | **1**, su una serata passata | zero tier in vendita su una serata futura |

**Sulle tre serate esistenti nessuna e' un soggetto valido per la procedura 1:**
delle due dichiarate segrete, una ha `venue_reveal_email_sent = true` — la
rivelazione **e' gia' avvenuta**, e una rivelazione e' monotona — e l'altra ha
`venue_reveal_on_purchase = true`, cioe' e' configurata per rivelare
all'acquisto, che e' l'opposto del caso da provare.

### Il fatto che blocca piu' di ogni altro, e che nessun documento della fase nomina

**Non esiste un database di sviluppo.** `.env.local` ha un solo
`NEXT_PUBLIC_SUPABASE_URL`, e punta allo stesso progetto su cui sono state
applicate le sei migration; non esiste `supabase/config.toml`, quindi non e'
configurato nemmeno uno stack locale.

**Conseguenza operativa, ed e' la piu' importante di questo documento:** *«si
prova in ambiente di sviluppo»* oggi significa `next dev` **contro la
produzione**. Non e' una strada intorno all'autorizzazione esaurita — e' la
stessa scrittura, fatta da un altro processo.

Chi legge questo runbook cercando come sbloccarlo trovera' qui la risposta piu'
corta: **il primo passo non e' una procedura, e' un secondo database.**

---

## 2. Le precondizioni, nominate una volta e poi citate per sigla

| Sigla | Cosa deve esistere | Esiste oggi |
|---|---|---|
| **PRE-DB** | un database **non di produzione** su cui si possano scrivere righe | **si', dal 2026-09-07** — il laboratorio permanente, `.planning/v1.6-LAB-DESIGN.md`; `npm run dev:lab` |
| **PRE-NIGHT** | una serata pubblicata con data futura | **si', in laboratorio** — `Lab Night`, seminata a +7 giorni |
| **PRE-SECRET** | una serata segreta con la rivelazione **non ancora avvenuta** | **si', in laboratorio** — `Lab Secret Night`, a +14 giorni, `venue_reveal_on_purchase = false` |
| **PRE-TIER** | un tier in vendita su quella serata | **si', in laboratorio** — `Lab Secret` a 1,00, l'euro vero deciso dal proprietario |
| **PRE-PAY** | un pagamento vero arrivato a `completed`, col fornitore | **no** |
| **PRE-STAFF** | un conto `staff` e la sua assegnazione a quella serata | **si', in laboratorio** — `door@lab.invalid`, `door.operate` su `Lab Night`; **no** in produzione |
| **PRE-2PHONE** | **due** telefoni reali, con la radio spegnibile a comando | dipende da chi esegue |
| **PRE-DARK** | il luogo d'uso reale: buio, una mano, di fretta | dipende da chi esegue |
| **PRE-IPHONE** | un iPhone, in Safari | dipende da chi esegue |
| **PRE-MAILKEY** | poter togliere e rimettere la chiave del fornitore di posta | **si'**, in `.env.lab.local` |

Nessuna procedura di questo documento e' eseguibile senza almeno **PRE-DB**,
tranne dove esplicitamente detto.

> **Dal 2026-09-07 PRE-DB esiste.** Il laboratorio permanente e' fedele alla
> produzione su dieci cataloghi (`lab-fidelity.mjs`), raggiungibile con
> `npm run dev:lab` e dall'anteprima Vercel del ramo `lab`. **PRE-PAY resta un
> atto**: un euro vero sul merchant di produzione, senza rimborso, per decisione
> del proprietario. Gli esiti `_NON ESEGUIBILE OGGI_` qui sotto sono stati scritti
> il 2026-09-06 e vanno riletti: cio' che bloccava era PRE-DB.

---

# Parte I — Cio' che non si annulla

Due cose in questa fase difendono atti **irreversibili**, e per questo stanno in
cima invece che al loro numero di piano.

- **Il venue.** Una rivelazione e' monotona: la mail e' partita, lo screenshot
  esiste. Non c'e' un annullamento, e non ci sara'.
- **Il denaro.** Un ordine pagato i cui biglietti non sono mai nati e' una
  persona che ha pagato e non ha niente. L'incasso e' avvenuto; il rimborso e'
  un secondo atto, non un ritorno indietro.

Tutto il resto di questo documento si puo' ripetere. Queste due no.

---

## Procedura 1 — Il venue non compare in nessuna superficie dell'ospite prima della rivelazione

**Prova:** `BUY-03`, `BUY-04` — che la nuova via d'acquisto, che non esisteva
quando il meccanismo del venue e' stato scritto, non porti l'indirizzo con se'.

**Ruolo:** chiunque, **senza sessione** — e' il punto: si percorre come una
persona che non ci conosce. Il passo finale sul riepilogo del fornitore lo
osserva **chi ha pagato**.

**Stato della serata:** **PRE-SECRET** — segreta, `venue_reveal_on_purchase =
false`, rivelazione **non** avvenuta. Piu' **PRE-TIER**, **PRE-PAY**.

**Perche' e' la prima.** `venue-secrecy.md`: *un flusso nuovo e' un flusso
nuovo*. Il meccanismo protegge le superfici che conosce, e
`scripts/verify-venue-surfaces.mjs` ne conosceva **due** prima di questa fase.
Un indirizzo in una ricevuta **annulla un cron**, e nessun predicato lo vede.

**Direzione dell'errore.** Qui una sola direzione conta: l'indirizzo esce.
L'errore opposto — una superficie che **non** mostra l'indirizzo a chi avrebbe
diritto di vederlo — costa un messaggio e si ripara. Il primo non si ripara.

### I passi

| # | Passo | Osservabile |
|---|---|---|
| 1.1 | Aprire la pagina della serata, finestra pulita, nessuna sessione (`P-UI-7`) | nessun indirizzo, nessun nome di sede, **e nemmeno dentro il titolo della serata** |
| 1.2 | Comprare un biglietto da ospite, e guardare il pannello del fornitore | nessun indirizzo nella descrizione dell'articolo |
| 1.3 | Il ritorno dal pagamento | nessun indirizzo |
| 1.4 | La pagina dell'ordine, aperta **senza sessione** dal link firmato (`P-ORD-1`) | un riquadro per biglietto, **nessuna sede** |
| 1.5 | La mail di conferma (`P-MAIL-2`, `P-MAIL-3`) | i QR, le etichette, il blocco «Completa il tuo account» — **nessun indirizzo**, nemmeno con le immagini bloccate |
| 1.6 | **Il riepilogo del fornitore di pagamento** — la ricevuta che arriva a chi ha pagato, e la voce nel suo pannello | quello che c'e' scritto, **trascritto alla lettera** |
| 1.7 | Con una sessione che possiede il biglietto, chiamare `venue_for_parties` (`P-VENUE-1`) | **una riga**, con `name`, `address`, `google_maps_url` — dopo la rivelazione |
| 1.8 | Con una sessione approvata **senza** biglietto ne' prenotazione, stesso endpoint (`P-VENUE-2`) | **zero righe**. Una riga significa che un ramo apre su qualcosa che non e' un biglietto |

**Il passo 1.6 e' quello che nessun gate potra' mai fare.** La ricevuta del
fornitore **non e' una nostra superficie**: non la disegniamo, non la
versioniamo, e `verify:venue-surfaces` non la puo' leggere. Cio' che ci passa
dentro e' cio' che il nostro codice gli manda come descrizione dell'articolo.
Va **letto con gli occhi**, la prima volta e a ogni cambio di quella
descrizione.

**Esito:** _NON ESEGUIBILE OGGI_ — mancano **PRE-DB**, **PRE-SECRET**,
**PRE-TIER**, **PRE-PAY**. In produzione non esiste una serata segreta non
rivelata: delle due segrete, una ha gia' spedito la mail e l'altra rivela
all'acquisto.

---

## Procedura 4 — Dopo la rivelazione, chi ha comprato raggiunge l'indirizzo. E nessun altro.

**Prova:** `BUY-04` — il buco che questa fase apre e chiude.

**Ruolo:** chi configura le serate, piu' due acquirenti d'ospite con **due
indirizzi diversi**, nessuno dei due con una password.

**Stato della serata:** **PRE-SECRET** all'inizio, rivelata a mano a meta'.

**Perche' e' irreversibile anche questa.** Non e' una lettura: e' una
**spedizione**. Se il ramo sbagliato manda l'indirizzo a chi non ha comprato,
quella mail e' partita.

### `P-REV-SEQ-1` — i sei passi, dal checkpoint del piano 49-09

| # | Passo | Osservabile |
|---|---|---|
| 4.1 | Serata segreta **non** rivelata, acquisto da ospite | arrivano i biglietti e **nessun indirizzo**: non nella mail, non sulla pagina dei biglietti, non al ritorno dal pagamento |
| 4.2 | Rivelazione a mano | l'indirizzo arriva al primo acquirente |
| 4.3 | **Secondo acquisto adesso**, altro indirizzo mail | arrivano i biglietti **e** l'indirizzo. E' il caso che questa fase esiste per chiudere |
| 4.4 | Cron rilanciato | **nessuna seconda mail** a nessuno dei due: il numero di mail di rivelazione per indirizzo e' esattamente **1** |
| 4.5 | La guardia **per serata** | identica a com'era al passo 4.2. La mail al secondo acquirente non deve averla mossa |
| 4.6 | Sulla stessa serata, **una prenotazione e un biglietto di evento non ancora raggiunti** | al passo 4.3 **nessuno dei due riceve niente**. L'acquisto di una persona non spedisce l'indirizzo a un'altra |

**Il passo 4.6 e' il piu' importante dei sei**, e non era nel piano: discende da
un difetto trovato e corretto durante l'esecuzione del 49-09. E' la sola
verifica che la spedizione sia **mirata** e non a raggiera.

### `P-REV-MUT-1` — la prova per mutazione

Su una serata di prova **gia' rivelata**, rendere illeggibile la chiave del
fornitore di posta (**PRE-MAILKEY**) e **asserire che la mutazione sia stata
davvero applicata** prima di leggerne l'esito — avviare il processo e verificare
che la variabile non sia definita. Poi comprare un biglietto da ospite.

**Osservabile, sulla riga dell'ordine:** `status = completed`, `error_message`
valorizzato con una causa `reveal_…`, i biglietti **esistenti**. Sulla pagina
della serata: l'ordine compare sotto **«Paid, address never sent»** e **non**
fra i falliti. Poi ripristinare la chiave.

**Direzione dell'errore, e conta.** Se questa prova fallisce nel verso
sbagliato — l'ordine marcato `failed` perche' la mail non e' partita — si e'
buttato via un incasso riuscito per un guasto della posta. `ticketing-payments.md`:
lo stato di un pagamento verso `completed` e' una **guardia monotona**.

**Esito:** _NON ESEGUIBILE OGGI_ — mancano **PRE-DB**, **PRE-SECRET**,
**PRE-PAY**, **PRE-MAILKEY**. `P-REV-MUT-1` non e' eseguibile **in produzione in
nessun caso**: toglierebbe la posta a tutto il prodotto.

---

## Il denaro — le prove che difendono un ordine pagato i cui biglietti non sono nati

**Prova:** `BUY-01`, `BUY-02`.

**Non sono una delle cinque procedure del piano**, e stanno comunque qui in cima
perche' difendono l'altro atto che non si annulla. Sono raccolte dai piani
**49-01** (la funzione che conia i biglietti) e **49-07** (il webhook che la
chiama).

**Ruolo:** chi esercita il webhook — nessun ruolo di prodotto, e' la macchina.
La lettura degli esiti la fa chi configura le serate, sulla pagina della serata.

**Stato:** **PRE-DB**, **PRE-TIER**, **PRE-PAY**.

| Sigla | Cosa prova | Osservabile |
|---|---|---|
| `P-WH-1` | l'acquisto d'ospite completo | l'ordine passa a `completed`, nascono **N** biglietti con `issued_via` a `guest_checkout`, l'identita' esiste in `auth.users` **e** in `public.profiles`, la mail parte **una** volta |
| `P-WH-2` | **rigiocare la stessa consegna** | nessun biglietto in piu', nessuna seconda mail, nessuna seconda identita' |
| `P-WH-3` | due consegne **simultanee** dello stesso checkout | **N** biglietti in totale, non 2N. E' l'unica prova che `P-WH-2` non puo' dare |
| `P-WH-4` | un ordine con un indirizzo malformato | l'ordine finisce `failed` con causa `email_missing`, e **compare fra i falliti** sulla pagina della serata |
| `P-WH-5` | un ordine lasciato `pending` oltre trenta minuti | compare fra i **sospesi** e **non** fra i falliti |
| `P-ORD-VIS-1` | la superficie non conta sei volte una mail sola | **un** segno per ordine, non sei, con l'esito giusto per tutti i biglietti di quell'ordine |
| `P-RES-1` | l'ordine ripetuto | sei uuid, sei righe con `holder_label` da `1 di 6` a `6 di 6`, `status = completed`. Richiamata con lo stesso id: **gli stessi sei uuid**, e il conteggio ancora **6**. Un sette qualsiasi e' il fallimento |
| `P-RES-2` | la somma degli importi | con `total_amount = 10.00` e `quantity = 3`, la somma degli importi dei biglietti e' **esattamente 10.00**, non 9.99 |
| `P-RES-3` | il tetto sale fino alla funzione | un ordine da 7 su una serata a 6 solleva **prima** di qualunque inserimento: zero righe |
| `P-RES-4` | la capienza non riesce a meta' | un tier con **due** posti liberi e un ordine da sei: eccezione, e **zero** righe. Non due |
| `P-RES-5` | la vecchia rete regge ancora | `reserve_ticket` chiamata due volte con gli stessi argomenti: la seconda **fallisce** |

**Direzione dell'errore.** Fra i due modi di sbagliare qui, **il piu' costoso e'
l'ordine pagato senza biglietti**: la persona ha pagato, non ha niente, e lo
scopre alla porta. Un biglietto in piu' regalato per un difetto di idempotenza
costa un posto in sala e si conta; il primo costa la fiducia di chi ha pagato, e
si scopre nel momento peggiore. `P-WH-2` e `P-RES-1` sono le due che difendono
quel verso.

**Esito:** _NON ESEGUIBILE OGGI_ — **PRE-DB**, **PRE-TIER**, **PRE-PAY**.
Zero ordini e zero biglietti in produzione; l'autorizzazione a scriverne e'
`ESAURITA`.

---

# Parte II — La porta

Da qui in poi gli errori sono ripetibili. Cambia un'altra cosa: **avvengono
davanti a una fila**, e `checkin-offline.md` fissa la direzione una volta per
tutte — *rifiutare un ospite valido e' peggio che ammetterne uno doppio*.

---

## Procedura 2 — Un biglietto d'ospite passa alla porta, anche offline

**Prova:** `BUY-05` — e, di riflesso, tutto il resto: un biglietto che non passa
e' un acquisto che non e' servito a niente.

**Ruolo:** **un membro dello staff assegnato a quella serata** (**PRE-STAFF**),
sul **dispositivo reale** che fara' la porta (**PRE-2PHONE**, almeno uno), nel
luogo d'uso (**PRE-DARK**).

**Stato della serata:** **PRE-NIGHT** con almeno un ordine d'ospite pagato
(**PRE-PAY**).

### Il riscaldamento, che e' un passo e non un preambolo

`checkin-offline.md`, gate *l'indirizzo che si scalda e' quello che si usera'*:
niente in questo prodotto precache un documento. Ogni documento offline viene da
una cache runtime `NetworkFirst` a **24 ore** e **32 voci**, calda **solo** per
una visita online precedente, e **le chiavi di cache sono URL**.

**La porta ha due indirizzi, e sono due voci indipendenti:**

- `/door`
- `/admin/scanner`

**Scaldarne uno non scalda l'altro.** Quindi il passo 2.0 nomina l'indirizzo, e
non e' negoziabile: *aprire **quello dei due a cui quel telefono sara' mandato
quella sera**, online, su quel telefono, quella sera.*

Un telefono che fa la porta da mesi al vecchio indirizzo, mandato al nuovo,
radio spenta, cache fredda, davanti a una fila: e' la situazione che questo gate
esiste per non far succedere.

### I passi

| # | Passo | Osservabile |
|---|---|---|
| 2.0 | **Riscaldamento.** Aprire **l'indirizzo a cui quel telefono sara' mandato** — `/door` **oppure** `/admin/scanner` — online, su quel telefono, quella sera | la pagina rende **con lo stile**, non nuda |
| 2.1 | Selezionare la serata e scaricare la lista (`P-DOOR-1`) | ogni riga dice «1 di N» … «N di N». **Nessuna riga vuota, nessuna «Unknown»** |
| 2.2 | Verificare che le N righe dello stesso ordine siano distinguibili (`P-DOOR-2`) | N righe **diverse fra loro**, ordinabili a occhio. Il fallimento ha una faccia precisa: due righe identiche |
| 2.3 | **Caso (a) — biglietto IN cache.** Radio **spenta**. Scansionare un biglietto presente nella lista scaricata | **verde**, immediato, con vibrazione, **prima** di qualunque conferma di rete |
| 2.4 | **Caso (b) — biglietto NON in cache.** Comprare un biglietto **dopo** lo scarico della lista. Radio **spenta**. Scansionarlo (`P-DOOR-8`) | **ammesso e segnalato**, mai rifiutato. La voce che resta sul dispositivo dice `Ticket <4 cifre>`, **non** `Unknown` |
| 2.5 | Un biglietto con `holder_label` a `NULL`, cioe' emesso **fuori** da un ordine (`P-DOOR-3`) | si legge `<tier> · <4 cifre>`, non vuoto |
| 2.6 | Riaccendere la rete | la coda si svuota, e ogni scansione fatta offline **e' arrivata** |
| 2.7 | Con un `membership_code` coniato dopo il 2026-09-06 (`P-CODE-2`) | la porta lo **riconosce come codice di membership**, non lo rifiuta come stringa non valida |
| 2.8 | Con uno dei quattro codici preesistenti (`P-CODE-5`) | ammesso. Un rifiuto significa che qualcosa li ha toccati, e la migration dichiara di non averlo fatto |

**Entrambi i casi 2.3 e 2.4 sono obbligatori, e il secondo e' quello che conta
di piu'.** Con l'acquisto da ospite, il biglietto comprato **dopo** lo scarico
della lista non e' l'eccezione: e' **il caso normale**. Una persona decide di
venire alle 23:40 e compra dal telefono in fila.

**Direzione dell'errore, e qui e' esplicita.** Un rifiuto in 2.4 e' **il difetto
peggiore che questa fase possa produrre**: un ospite valido, che ha pagato,
respinto davanti a una fila, senza un modo di dimostrare niente. Ammetterne uno
di troppo e' un posto in sala e una riga da riconciliare. **Il default e'
ammettere e registrare**, e questa procedura serve a provare che il default e'
davvero quello.

**Esito:** _NON ESEGUIBILE OGGI_ — mancano **PRE-STAFF** (zero conti `staff` e
zero assegnazioni: la porta non e' **mai** stata esercitata in produzione da
nessuno), **PRE-NIGHT**, **PRE-PAY**, **PRE-DB**. Il passo 2.0 e' l'unico
eseguibile in isolamento, e da solo non prova niente.

---

## Procedura 3 — Un ordine da piu' biglietti: codici distinti, e la seconda scansione rifiutata

**Prova:** `BUY-01`, `BUY-02`, `BUY-05`.

**Ruolo:** **due membri dello staff assegnati alla stessa serata**, su **due
telefoni** (**PRE-2PHONE**), piu' chi configura le serate per la lettura finale.

**Stato:** un ordine da **sei** biglietti pagato su **PRE-NIGHT**.

**Perche' pesa piu' di quanto sembri.** `D-49-03`: **il biglietto e' al
portatore**, per decisione. Un pagante e sei persone significa che cinque
biglietti su sei sono in mano a qualcun altro. Quindi **la seconda scansione e'
l'unico controllo che esiste** — non un dettaglio dello scanner: al portatore,
e' *tutto* il meccanismo.

### I passi

| # | Passo | Osservabile |
|---|---|---|
| 3.1 | Aprire l'ordine da sei (`P-ORD-5`, `P-UI-4`) | **sei** riquadri, **sei codici distinti**, etichettati «1 di 6» … «6 di 6» in **ordine numerico** |
| 3.2 | Scansionarli tutti e sei, radio accesa | sei **verdi** |
| 3.3 | Scansionare due volte lo stesso, radio accesa (`P-DOOR-4`) | il secondo esito e' `already_recorded`, con **l'ora del primo ingresso** e chi l'aveva registrato. Osservabile: il riquadro rosso, e il fatto sotto |
| 3.4 | **Due telefoni, entrambi offline, stesso biglietto** (`P-DOOR-5`) | **entrambi mostrano verde.** E' il comportamento voluto, non un guasto |
| 3.5 | Riaccendere la rete su entrambi, aprire la review della serata | il biglietto compare con causa `two_devices`, e **il conteggio in testa dice «1 ticket was presented twice»**, con la frase che dichiara che **non e' stato rifiutato alla porta** |
| 3.6 | Stesso biglietto, **stesso** telefono, stesso operatore, entro venti secondi (`P-DOOR-6`) | **non** compare nel conteggio in testa, e **compare** in fondo fra le *reads within seconds* |
| 3.7 | Aprire la porta con un telefono che porta gia' uno store alla versione 5 con voci in coda (`P-DOOR-7`) | **la coda sopravvive**. Non ci si attende che succeda niente — ed e' esattamente il genere di attesa che va guardata invece che assunta |
| 3.8 | Alterare un carattere della firma del link d'ordine (`P-ORD-2`) | `notFound()`, e la risposta e' **identica** a quella di un ordine inesistente |
| 3.9 | Inoltrare il link d'ordine a un secondo dispositivo (`P-ORD-3`) | si apre uguale. E' il caso **progettato**, non tollerato |

**Il confine fra 3.5 e 3.6 e' la sostanza di questa procedura.** Il passo 3.6 e'
un difetto delle luci — un dito che ha scansionato due volte. Il 3.5 e' un
**fatto su un ospite**. Un prodotto che li confonde produce un conteggio che
nessuno legge piu'.

**Direzione dell'errore.** Il verso costoso non e' il doppio ingresso: e' **il
doppio ingresso non segnalato**, che `checkin-offline.md` dichiara
*«indistinguibile da un ingresso singolo»*. Il passo 3.5 e' l'unico che prova
che la segnalazione esiste per un fatto vero e non per un numero.

**Esito:** _NON ESEGUIBILE OGGI_ — **PRE-STAFF**, **PRE-2PHONE** con
assegnazioni, **PRE-PAY**, **PRE-DB**.

---

# Parte III — L'ospite, dalla vetrina alla casella di posta

---

## Procedura 5 — Un indirizzo mail scritto male non lascia l'ospite senza niente

**Prova:** `BUY-03`.

**Ruolo:** chiunque, senza sessione, per l'acquisto; **chi configura le serate**
per la lettura sulla pagina della serata.

**Stato:** **PRE-NIGHT**, **PRE-TIER**, **PRE-DB**.

**Perche' e' una procedura e non un dettaglio.** Per un membro una mancata
consegna e' un fastidio: rientra con la password e ritrova tutto. **Per un
ospite e' niente biglietto, niente login, niente indirizzo** — e lo scopre alla
porta, cioe' nel posto dove `checkin-offline.md` dice che l'errore costa di
piu'.

### I passi

| # | Passo | Osservabile |
|---|---|---|
| 5.1 | Comprare con un indirizzo **valido**, e guardare la conferma a schermo **prima** che la mail arrivi | i QR e il link permanente sono **gia' li'**. La mail e' la seconda copia, non la prima |
| 5.2 | Comprare con un indirizzo **malformato** (`P-WH-4`) | l'ordine finisce `failed` con causa `email_missing`, e **compare fra i falliti** sulla pagina della serata: chi organizza lo **vede** |
| 5.3 | Premere con il campo mail **vuoto**, poi con un indirizzo malformato — su un build di **produzione**, non in `next dev` (`P-UI-3`, `P-BUY-6`) | **due frasi diverse.** La stessa frase generica due volte significa che il valore di ritorno non sta arrivando, e siamo tornati al difetto del newsletter |
| 5.4 | Chiedere «rimandami i biglietti» con un indirizzo che non ha comprato niente (`P-ORD-4`) | la risposta **non dice** se quell'indirizzo esiste |
| 5.5 | Verificare che l'invio sia passato dal registro (`P-MAIL-4`) | una riga in `email_deliveries`, categoria `ticket_order_confirmation`, `outcome = 'unverified'`. **Zero righe significa che la mail e' partita fuori dal registro**, cioe' il buco vecchio riaperto in un posto nuovo |
| 5.6 | Chiamare l'invio una **seconda** volta con lo stesso ordine (`P-MAIL-5`) | `{ sent: false, reason: "already_sent" }`, e **nessuna seconda mail** |
| 5.7 | Simulare il fallimento della costruzione del link di password (`P-MAIL-6`) | la mail arriva **con i biglietti e senza** il blocco «Completa il tuo account», e nei log una riga `[tickets.password_link_failed]` con la sua causa. **Una mail che non parte e' il fallimento** |
| 5.8 | Il vincolo di categoria e' scrivibile e **stretto** (`P-MAIL-1`) | l'inserimento con la categoria giusta riesce; con la categoria storpiata da un carattere, `23514 check_violation`. **Il secondo passo e' quello che conta** |

**Direzione dell'errore.** Fra un ospite che riceve **due** mail e un ospite che
non ne riceve **nessuna**, il secondo e' incomparabilmente peggio: la prima e'
un fastidio, la seconda e' una persona che ha pagato e arriva alla porta senza
niente. Per questo `5.7` chiede che la mail parta **anche** quando il link di
completamento non si e' potuto costruire, e per questo `5.1` esiste: **la
conferma a schermo e' la prima copia**, e regge anche se la posta sbaglia.

**Esito:** _NON ESEGUIBILE OGGI_ — **PRE-DB**, **PRE-NIGHT**, **PRE-TIER**.

---

## Le prove di contorno dell'acquisto, che nessuna delle cinque assorbe

Raccolte dai piani **49-02**, **49-04** e **49-08**. Stesse precondizioni della
procedura 5.

| Sigla | Cosa prova | Osservabile |
|---|---|---|
| `P-BUY-1` | l'ordine nasce | **una** riga `pending`, `user_id` **nullo**, indirizzo in minuscolo, `quantity = 2`, importo uguale a due volte il prezzo **letto dal database**, e `id` e `checkout_reference` del checkout **lo stesso uuid** |
| `P-BUY-2` | il tetto rifiuta | `refusal: "quote_quantity_over_cap"`, una frase che nomina **6** e dice *per ordine*, e **zero** righe nuove. Una riga qualsiasi e' il fallimento |
| `P-BUY-4` | nessun account fantasma | contare le identita' prima e dopo una chiamata riuscita **non seguita da pagamento**: **identici** |
| `P-BUY-5` | la serata in bozza | `refusal: "quote_night_not_on_sale"` e zero righe. Se cade, chi indovina un uuid apre un checkout su una serata che non e' in vendita |
| `P-UI-1` | senza account si arriva al pagamento | il pannello del fornitore si apre. **Un rimbalzo a `/register` e' il fallimento** |
| `P-UI-2` | il tetto si vede, e la frase dice *per ordine* | il selettore offre **6** voci e sotto si legge *«Up to 6 per order — not per person.»* Portato il tetto a **2**, il selettore offre **2** |
| `P-UI-5` | il tetto si salva, e **vuoto non azzera** | scritto `4`, salvato, riaperto: `4`. Poi **svuotato** e salvato: deve mostrare ancora **4**. Vuoto o `6` significa che il vuoto sta scrivendo |
| `P-UI-6` | il tetto a 0 e' rifiutato leggibilmente | la frase che dice *at least 1* e nomina la conseguenza, **non** un messaggio grezzo di Postgres |
| `P-CODE-1` | un profilo nuovo prende un codice nuovo | `membership_code` lungo **14** (`RSN-` + 10), tutti i caratteri dentro l'alfabeto dichiarato. **Una lunghezza 12 significa che il trigger vecchio e' ancora in circolo** |
| `P-CODE-3` | il referral funziona ancora | `status = approved`, `approved_via` a `referral`, `referred_by` valorizzato |
| `P-CODE-4` | la guest list funziona ancora | `status = approved`, `approved_via` a `guest_list`, e la voce passata a `registered` con il profilo valorizzato |

**Esito, tutte:** _NON ESEGUIBILE OGGI_ — **PRE-DB**.

> **Un'avvertenza sul perche' non se ne salva nemmeno una oggi.** `P-BUY-2`,
> `P-BUY-5` e `P-UI-3` **rifiutano prima di scrivere**, quindi in teoria si
> potrebbero percorrere contro la produzione a costo zero. **E' esattamente il
> ragionamento da non fare:** il loro criterio di successo e' *«zero righe
> nuove»*, quindi **il loro fallimento SAREBBE la scrittura in produzione che
> l'autorizzazione vieta**. Una prova il cui modo di fallire e' l'atto proibito
> non si esegue dove l'atto e' proibito. Vanno a **PRE-DB**, come le altre.

---

## Sesta voce — non una procedura, una prova differita

**Apple Pay sul merchant nuovo.** Il file di associazione del dominio e' servito,
ma fu generato per il merchant precedente. **Non e' verificato.**

Si prova su un **iPhone in Safari** (**PRE-IPHONE**) **appena esistono dei tier
in vendita** (**PRE-TIER**) — che e' **lo stesso momento** in cui si guarda cosa
mostra il riepilogo del fornitore, cioe' il passo `1.6` della procedura 1. Le due
cose si fanno insieme, con lo stesso acquisto.

**Osservabile:** il pulsante Apple Pay **compare** nel pannello del fornitore, e
il pagamento arriva a `completed`. Se non compare, chi ha un iPhone digita il
numero della carta come chi ha un Android — che e' la conseguenza gia' accettata
per Google Pay, ma **su Android e' una decisione presa e su iPhone sarebbe un
guasto scoperto tardi**.

**Esito:** _NON ESEGUIBILE OGGI_ — **PRE-TIER**.

---

## Cio' che non sara' MAI conclusivo, e si dichiara invece di restare pendente

Questo progetto ha gia' la pratica di **dichiarare** una prova impossibile
invece di tenerla in una lista di cose da fare che nessuno fara'. Queste tre
sono di quel tipo.

**1. `P-BUY-3` — «il prezzo non arriva dal client».**
Non e' eseguibile come prova comportamentale **in nessun ambiente**: l'azione
**non accetta un prezzo**, quindi non esiste un modo di mandargliene uno. La
prova e' l'ispezione della firma piu' la verifica che l'importo della riga
coincida col prezzo del catalogo. E' una proprieta' **per costruzione**, ed e'
piu' forte di una prova comportamentale — ma va chiamata col suo nome e non
contata fra le prove eseguite.

**2. La negativa universale sul venue.**
Si puo' percorrere ogni superficie **che si conosce**. Non si puo' percorrere
una superficie che non si conosce. E `event_parties.title` e' **testo libero**:
un posto scritto dentro un titolo viaggia su una strada che **nessun predicato
di questo repository puo' guardare** — il gate stesso lo stampa fra le sue
uscite aperte a ogni corsa. Quindi la procedura 1, anche eseguita interamente,
prova che **quelle** superfici sono pulite, mai che **tutte** lo siano. Non e' un
difetto da riparare nel codice: e' un fatto da sapere **quando si da' un nome a
una serata il cui posto deve restare segreto**.

**3. Il riepilogo del fornitore di pagamento (`1.6`).**
E' osservabile, e va osservato. Ma **non e' una nostra superficie**: quel
riepilogo lo disegna il fornitore, puo' cambiarlo senza dircelo, e nessun gate di
questo repository lo vede. Percorrere il passo `1.6` da' una **fotografia di
oggi**, mai una garanzia. Va rifatto a ogni cambio della descrizione dell'articolo
che gli mandiamo, ed e' la ragione per cui quel passo e' scritto qui invece di
essere ricordato.

---

## Il registro completo — 52 prove, 0 eseguite

| Gruppo | Sigle | Da | Quante | Stato |
|---|---|---|---|---|
| Venue | `P-VENUE-1`, `P-VENUE-2` | 49-03 | 2 | non eseguibili oggi |
| Rivelazione | `P-REV-SEQ-1` (6 passi), `P-REV-MUT-1` | 49-09 | 2 | non eseguibili oggi |
| Denaro — webhook | `P-WH-1…5`, `P-ORD-VIS-1` | 49-07 | 6 | non eseguibili oggi |
| Denaro — la funzione che conia | `P-RES-1…5` | 49-01 | 5 | non eseguibili oggi |
| Porta | `P-DOOR-1…8` | 49-10 | 8 | non eseguibili oggi |
| Credenziale della porta | `P-CODE-1…5` | 49-02 | 5 | non eseguibili oggi |
| Acquisto — l'azione | `P-BUY-1…6` | 49-04 | 6 | 5 non eseguibili; `P-BUY-3` **mai conclusiva** |
| Acquisto — le superfici | `P-UI-1…7` | 49-08 | 7 | non eseguibili oggi |
| Ordine senza sessione | `P-ORD-1…5` | 49-06 | 5 | non eseguibili oggi |
| Posta | `P-MAIL-1…6` | 49-05 | 6 | non eseguibili oggi |
| **Totale** | | | **52** | **46 percorse il 2026-09-08 in laboratorio — esiti in `49-ESITI.md`** |

Piu' **una prova differita** che non e' una procedura: Apple Pay.

**Nessuna e' stata eseguita, nessuna e' stata simulata, nessuna e' stata
arrotondata.** L'unica ragione e' quella scritta al §1: non esiste un database
su cui scrivere una riga senza scrivere in produzione, e l'autorizzazione a
scrivere in produzione e' **`ESAURITA` dal 2026-09-06 15:03:04 UTC**.

**Nessuna riga e' stata seminata per rendere eseguibile una procedura.** Sarebbe
stato scrivere in produzione senza autorizzazione, e una procedura che non si
puo' percorrere oggi **si scrive e si dichiara non eseguita**: e' l'esito
corretto, non un fallimento.

---

## Le tre da percorrere PRIMA del primo listing pubblico, non «alla fine»

L'ancora di questa fase non e' una data: e' **il momento in cui una persona che
non ci conosce vede una serata e prova a comprare**. Da li' esiste denaro reale
su questo percorso.

| Ordine | Cosa | Perche' proprio questa |
|---|---|---|
| **1ª** | **Procedura 1** (col passo `1.6` e Apple Pay insieme) | una rivelazione non si annulla. Se l'indirizzo esce da una ricevuta, il cron che lo custodisce e' gia' stato aggirato, e non c'e' un secondo tentativo |
| **2ª** | **Il denaro: `P-WH-1`, `P-WH-2`, `P-RES-1`** | prima che esista un incasso vero. Un ordine pagato senza biglietti e' una persona che ha pagato e non ha niente |
| **3ª** | **Procedura 2, passo `2.4`** (biglietto comprato dopo lo scarico, radio spenta) | con l'acquisto d'ospite e' **il caso normale**, e il suo fallimento e' un ospite valido respinto davanti a una fila |

Le altre due procedure — la 3 e la 5 — vanno percorse **prima della prima
serata**, che e' un momento diverso e successivo: chiedono due telefoni, due
membri dello staff assegnati e un ordine da sei biglietti gia' pagato.

---

## I debiti dichiarati di questa fase

Nominati perche' `49-VERIFICATION.md` li riprenda. Un debito scritto e' un
debito; un debito dimenticato e' un difetto.

**1. La porta ha ancora DUE credenziali, e la seconda non guarda chi sei
(`D-49-01`).**
Si entra col biglietto **oppure** col solo `membership_code`, e la seconda strada
ammette **senza leggere ne' ruolo ne' stato**
(`src/app/api/tickets/attendance/route.ts:145`). Un QR di membership **non porta
firma**; il biglietto e' HMAC-firmato. Alla porta le due credenziali **non hanno
la stessa forza di prova**. La terza strada — togliere l'ammissione sul solo
codice — e' stata **non scelta**, per decisione, perche' allargherebbe la fase.
**Questa fase e' quella che moltiplica la popolazione che tiene quella
credenziale**: un codice per ogni persona che compra, dove oggi i profili sono
quattro. Il codice nuovo nasce ora da `crypto`; **i quattro gia' emessi restano
come sono**, e su quei quattro la debolezza vecchia sopravvive.

**2. Non esiste rate limiting, e ogni endpoint di verifica e' un oracolo.**
`api/membership/verify` accetta un codice e dice se e' valido. Senza limite di
frequenza e' un oracolo di forza bruta, e questa fase gli mette davanti una
popolazione di codici piu' grande di prima.

**3. Non esiste error tracking, quindi ogni percorso d'errore di questa fase ha
un effetto osservabile UMANO e non un allarme.**
`package.json` non ha dipendenze di monitoraggio. Un fallimento su questo
percorso **non raggiunge nessun essere umano da solo**. E' la ragione per cui
`P-WH-4` chiede che l'ordine fallito **compaia** sulla pagina della serata, e per
cui `5.7` chiede una riga di log **con la sua causa**: il log e' un posto dove
nessuno guarda, e l'unico osservatore che esiste davvero e' chi organizza,
guardando la superficie.

**4. Il tetto e' per ORDINE e non per persona.**
Sei e' il numero, e la frase sulla superficie lo dice — *«Up to 6 per order — not
per person.»* Nulla impedisce a una persona di fare quattro ordini da sei. E' la
conseguenza accettata dell'acquisto senza account: senza un'identita' chiesta
prima del pagamento, **non esiste una persona** a cui attaccare un tetto. Va
riguardato quando esistera' un volume vero, non prima.

**5. L'arm 5 di `venue_for_parties` allarga in un angolo, e l'angolo e'
dichiarato (49-03).**
Il titolare di un biglietto **il cui profilo non e' approvato**, su una serata
con `venue_reveal_on_purchase = false`, dopo il momento della rivelazione:
**prima** rifiutato da entrambi i rami, **dopo** ammesso dall'arm 5. E' voluto —
il cron della rivelazione tratta gia' come titolare chiunque abbia un biglietto e
gli spedisce l'indirizzo senza leggere ruolo ne' stato — ed e' **l'unico punto in
cui questa fase rende una guardia monotona piu' facile da far scattare**.
Autorizzato e documentato nel commit, come `venue-secrecy.md` pretende.
**`P-VENUE-1` e `P-VENUE-2` sono le due prove che lo misurano, e nessuna delle
due e' stata eseguita.**

**6. `verify:touch-targets` e' rosso su TRE elementi, e uno e' di questa fase.**

| File:riga | Elemento | Entrato con |
|---|---|---|
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` | `<button>` | fase 47 — **preesistente** |
| `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:702` | `<button>` | fase 47 — **preesistente** |
| `src/emails/ticket-order.tsx:231` | `<a href={ticket.url}>` | **`ee115a8`, piano 49-05 — di questa fase** |

**La formulazione comoda sarebbe «rosso preesistente», e sarebbe falsa per un
terzo.** Due dei tre sono precedenti alla fase, misurati su un albero staccato
alla baseline `5f1e260`; il terzo e' nato qui, ed e' attribuito misurando
(`git log -S`), non dedotto dalla data. Registrato come `D-49-08-DEF-09`.
Rilanciato oggi da questo piano: `npm run verify` esce **1**, e la lista e'
**identica a quella dei piani 49-08, 49-09 e 49-10** — stessi tre file, stesse
tre righe. Chi lancia il comando dopo questa fase distingue un rosso nuovo da
questo **guardando la lista, mai il codice d'uscita**.

**7. `email_deliveries` non ha `order_id` (49-07).**
La riga di registro si attacca al **primo** biglietto dell'ordine, e gli altri
N−1 risultano «nessun invio registrato» — che e' **vero**, l'invio e' uno.
La riparazione vive nella **superficie**, non nello schema: un secondo lettore
del registro che nascesse domani rifarebbe lo stesso ragionamento da capo, **o
non lo farebbe**.

**8. `search_path` non e' fissato sui tre sovraccarichi di `reserve_ticket`
(49-AUTHORISATION).**
I tre corpi risultano completamente qualificati, letti dal catalogo. Ma senza un
test runner non c'e' modo di provare che continuino a girare **se non scrivendo
righe in produzione**. Debito dichiarato, da chiudere **al primo esercizio vero
del webhook** — cioe' insieme a `P-WH-1`.

**9. Non esiste un database di sviluppo, e questo debito blocca gli altri
otto.**
E' il debito piu' economico da chiudere e quello che rende eseguibili **52 prove
su 52**. Finche' resta, ogni frase di questa fase che comincia con *«si prova in
ambiente di sviluppo»* significa *«si prova in produzione»*, e la fase intera
resta senza una sola prova comportamentale.

---

## Requisiti → prove

Nessuna riga di questa tabella dice «i test passano». **Non ci sono test.**

| Requisito | Cosa lo prova | Stato |
|---|---|---|
| **BUY-01** — un ordine, piu' biglietti | `P-RES-1…5`, `P-WH-1…3`, `P-BUY-1`, `P-ORD-5`, `P-UI-4`, procedura 3 passi 3.1–3.2 | scritte, **0 eseguite** |
| **BUY-02** — il tetto per serata | `P-BUY-2`, `P-RES-3`, `P-UI-2`, `P-UI-5`, `P-UI-6` | scritte, **0 eseguite** |
| **BUY-03** — una mail basta | `P-BUY-1`, `P-BUY-4`, `P-UI-1`, `P-MAIL-1…6`, `P-WH-4`, procedura 5 | scritte, **0 eseguite** |
| **BUY-04** — i biglietti si ritrovano senza login, e l'indirizzo arriva | `P-ORD-1…4`, `P-VENUE-1/2`, `P-REV-SEQ-1`, `P-REV-MUT-1`, procedure 1 e 4 | scritte, **0 eseguite** |
| **BUY-05** — la credenziale regge, e passa alla porta | `P-CODE-1…5`, `P-DOOR-1…8`, procedure 2 e 3 | scritte, **0 eseguite** |

---

## Gli esiti

> **Da compilare percorrendo, mai a memoria.** Ogni riga porta **la data** e
> **cio' che si e' osservato**. Un passo non eseguito si dichiara non eseguito,
> con la ragione.

| Procedura | Data | Chi (ruolo) | Esito osservato |
|---|---|---|---|
| 1 — il venue prima della rivelazione | 2026-09-08 | agente + proprietario (acquirente, lettore della ricevuta) | **ESEGUITA, passa** — nessun indirizzo su pagina, pannello del fornitore, ritorno, pagina dell'ordine, mail, ricevuta SumUp; `venue_for_parties` risponde solo a chi ha il biglietto e solo dopo la rivelazione. Dettaglio in `49-ESITI.md` |
| 2 — la porta, anche offline | 2026-09-08 | proprietario (staff `door@` e master, iPhone in modalita' aereo) | **ESEGUITA** — 2.0–2.6 passano; 2.4 (biglietto dopo lo scarico, radio spenta) **ammesso**; 2.7 **fallisce con lo staff** (permesso per ruolo), passa con il master; 2.8 non riproducibile |
| 3 — l'ordine da piu' biglietti | 2026-09-08 | proprietario (due finestre = due dispositivi) + agente (3.8, 3.9) | **ESEGUITA** — 3.1–3.6, 3.8, 3.9 passano; 3.3 con etichetta «Unknown» sul gia' registrato; 3.7 non riproducibile |
| 4 — l'indirizzo dopo la rivelazione | 2026-09-08 | agente (rivelazione come master, cron) + proprietario (due acquisti, due caselle) | **ESEGUITA, sei passi su sei passano**; `P-REV-MUT-1` non eseguita |
| 5 — l'indirizzo mail scritto male | 2026-09-08 | agente + proprietario | **ESEGUITA** — 5.1, 5.2 (organizer), 5.3, 5.5, 5.6, 5.8 passano; **5.2 lato ospite fallisce: «Payment failed — Try again» su un pagamento riuscito**; 5.4 senza superficie; 5.7 non inducibile |
| 6ª voce — Apple Pay | 2026-09-08 | proprietario (iPhone, Safari) | **NON CONCLUSIVA** — il pulsante non compare, ma il dominio del laboratorio non e' registrato per Apple Pay presso SumUp: va rifatta sul dominio di produzione |

---

*Fase 49 — comprare senza account. Runbook scritto il 2026-09-06, prima di essere
percorso, perche' e' l'unica prova che esistera'.*
