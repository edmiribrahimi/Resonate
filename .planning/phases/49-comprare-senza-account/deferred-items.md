# Fase 49 — scoperte fuori perimetro

> Cose trovate **misurando**, che il piano non prevedeva e che il piano che le
> ha trovate non deve riparare. Restano qui invece di sparire.
>
> `.planning/` e' pubblicato: qui si nominano **ruoli e oggetti di database**,
> mai persone, e non si scrivono chiavi, uuid reali o percorsi di attacco
> eseguibili.

## D-49-01-DEF-01 — `public.reserve_ticket` e' chiamabile con la chiave anonima

**Trovato:** 2026-09-06, piano 49-01, task 3, rileggendo `pg_proc` dopo aver
applicato le due migration. **Non e' causato da questa fase e non e' peggiorato
da questa fase**: la misura lo ha semplicemente illuminato, perche' guardare
l'ACL della funzione nuova ha fatto guardare anche quella delle vecchie.

**Cosa dice il catalogo.** Tutti e **tre** gli overload di
`public.reserve_ticket` hanno:

| Proprieta' | Valore letto |
|---|---|
| `prosecdef` | `true` — `SECURITY DEFINER` |
| `proconfig` | `null` — **nessun `SET search_path`** |
| `proacl` | `{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}` |

`=X/postgres` e' `EXECUTE` concesso a `PUBLIC`, ed e' il default che Postgres
applica a ogni funzione nuova quando nessuno lo revoca. PostgREST espone ogni
funzione di `public` sotto `/rest/v1/rpc/`, quindi la funzione **risponde alla
sola chiave anonima**, che e' pubblica per costruzione.

**Perche' conta.** `reserve_ticket` riceve **tutti** i valori che decidono dal
chiamante — chi e' l'acquirente, quale tier, quale serata, quanto ha pagato — e
non ne rilegge nessuno. Essendo `SECURITY DEFINER`, la RLS non la ferma. Il
risultato e' un biglietto emesso senza che sia esistito un pagamento.

**Cosa lo limita oggi, ed e' il motivo per cui il sotto-passo (d-bis) del piano
49-01 non era una precauzione teorica.** Un biglietto emesso per quella strada
lascia `order_id` nullo, quindi ricade sotto i due indici unici parziali
`tickets_party_user_unique` e `tickets_event_user_master_unique` — che il piano
49-01 ha **ricreati** con `AND order_id IS NULL` invece di lasciarli cadere. Il
tetto e' quindi **un biglietto per conto per serata**, non illimitato. Se quei
due indici fossero stati solo tolti, non ci sarebbe alcun tetto.

**Cosa manca e a chi tocca.** La coppia
`REVOKE ALL ... FROM public, anon, authenticated` +
`GRANT EXECUTE ... TO service_role`, piu' `SET search_path = ''`, su tutti e tre
gli overload — e prima ancora la decisione di **quanti overload debbano
sopravvivere**, visto che il percorso con sessione ne usa uno solo. Non e' lavoro
del piano 49-01, che ha un'autorizzazione di produzione **nominata su due file**
e non puo' allargarla da se': `ai-engineering.md`, gate *l'autorizzazione a
scrivere in produzione e' un atto, non un permesso*.

**Dove va deciso:** le fasi 50/51 chiudono il percorso con sessione, ed e' li'
che quegli overload muoiono. Se pero' la milestone apre le vendite **prima** di
quelle fasi, la revoca va fatta prima — perche' da quel momento esistono tier in
vendita, e un biglietto coniato gratis e' un posto sottratto a chi paga.

**Precedente da cui copiare la forma, gia' nel repo:**
`20260808004000_master_reconcile.sql:364-371`,
`20260810160000_manual_venue_reveal.sql:598-606`,
`20260815120200_production_checklist_tick_revoke.sql:46-51`.

## D-49-01-DEF-02 — `tickets_notify_attendance` scatta una volta per riga

**Trovato:** 2026-09-06, piano 49-01, controllo d'impatto cross-dominio prima di
scrivere `reserve_ticket_order`.

`20260811120000_live_attendance_channel.sql:384-387` dichiara il trigger
`AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW`. Un ordine da sei biglietti
nasce da **una sola `INSERT`**, ma il trigger e' per riga: la serata riceve
**sei** notifiche identiche invece di una.

**Non e' un difetto e non va riparato qui.** La funzione «non scrive nulla e
restituisce NULL, quindi non puo' alterare, ritardare o far fallire un acquisto»
— lo dichiara il suo stesso `COMMENT` — e sei segnali di *aggiorna la lista* si
collassano in un aggiornamento solo dal lato che ascolta. E' rumore, non un
errore, ed e' registrato perche' chi guardera' il canale della porta durante una
vendita di gruppo vedra' una raffica e deve sapere da dove viene.

## D-49-01-DEF-03 — `gsd-sdk query state.record-session` riscrive piu' di una sessione

**Trovato:** 2026-09-06, piano 49-01, chiudendo. Il comando dichiara di
aggiornare *«Last session»* e nella risposta lo conferma
(`{"recorded": true, "updated": ["Last session"]}`). Nei fatti ha riscritto anche
il `stopped_at` del frontmatter — con una frase di **un'altra fase** — e ha
ricalcolato l'intero blocco `progress`:

| Campo | Prima | Dopo la chiamata |
|---|---|---|
| `total_phases` | 51 | 12 |
| `completed_phases` | 47 | 2 |
| `total_plans` | 348 | 29 |
| `completed_plans` | 349 | 23 |
| `percent` | 92 | 17 |

Il denominatore nuovo non corrisponde a nessuna misura del progetto:
`.planning/phases/` contiene fasi numerate fino alla 58.

**Ripristinato subito** con `git checkout -- .planning/STATE.md`, e nulla di
quella riscrittura e' stato committato. Registrato qui perche' **la risposta del
comando non dichiara cio' che ha toccato**: chi lo chiama e non guarda il `git
diff` committa un blocco di avanzamento falso credendo di aver aggiornato una
riga di data. E' la forma esatta del gate *il contatore di controllo non legge la
superficie che sta muovendo* — la conferma va chiesta a una fonte diversa da
quella che ha agito, e qui la fonte diversa e' `git diff`.

**Fuori perimetro:** e' strumentazione GSD, non prodotto. Nessuna riparazione da
questo piano.

### RIPRODOTTO — 2026-09-06, piano 49-02

Non e' un caso isolato. `gsd-sdk query state.add-decision` — **un comando
diverso** da quello che l'ha rivelato — produce lo **stesso** effetto: ha
risposto `{"added": true, "decision": "…"}`, e nel frattempo ha riscritto
`stopped_at` con una frase della **fase 58**, `last_updated`, e l'intero blocco
`progress` con gli **stessi identici** denominatori sbagliati (`total_phases`
51 → **12**, `total_plans` 348 → **29**, `percent` 92 → **17**).

**Quindi non e' `record-session`: e' la scrittura di `STATE.md` in se'.**
Qualunque verbo `state.*` va trattato come se riscrivesse il file intero.

**Ripristinato con `git checkout -- .planning/STATE.md`**, e la riga voluta e'
stata applicata **a mano** — che ha anche corretto un secondo difetto: il comando
etichettava la decisione `[Phase ?]`, senza numero di fase, in un elenco dove
ogni altra riga porta il suo.

**Regola operativa, finche' non e' riparato:** dopo **ogni** `gsd-sdk query
state.*`, leggere `git diff .planning/STATE.md` e ripristinare se ha toccato piu'
della riga richiesta. La conferma va chiesta a una fonte diversa da quella che ha
agito, e la risposta del comando **non e' quella fonte**.

## D-49-02-DEF-04 — il gate *context budget* di `ai-engineering.md` descrive una misura che non e' piu' quella

**Trovato:** 2026-09-05, piano 49-02, task 2, rimisurando il budget dopo aver
allargato la prosa di due moduli.

Il gate dichiara: *«Misurato il 2026-08-10 (v1.7.0), caso peggiore
`src/app/(admin)/admin/scanner/ScannerClient.tsx`: 5 file caricati … 38.240 byte
≈ 10.622 token su un tetto di 12.000 — margine 1.378»*, e ne trae la conseguenza
operativa *«il margine si e' ristretto: la prossima aggiunta di prosa a uno di
quei cinque file va pesata, non improvvisata»*.

`npm run verify:persona` (controllo E) misura oggi qualcos'altro:

| | il gate dice | lo script misura |
|---|---|---|
| Tetto | 12.000 token | **15.000 token** |
| Caso peggiore | `…/scanner/ScannerClient.tsx` | **`…/(work)/venues/[slug]/page.tsx`** |
| Moduli del caso peggiore | access-gating, checkin-offline, nextjs-architecture | **access-gating, nextjs-architecture, venue-secrecy** |
| Misura | 10.622 token, margine 1.378 | **12.536 token, margine 2.464** |

**Perche' va sistemato e non solo notato.** Il gate e' prosa che si carica su
ogni modifica alla persona, e la sua conseguenza operativa — *«il margine si e'
ristretto»* — **non e' piu' vera**: il margine e' quasi raddoppiato perche' il
tetto e' salito. Chi legge il gate pesa una decisione contro un numero che lo
script non usa. E' la forma esatta del gate *documentazione datata*, con
l'aggravante che stavolta il documento datato e' **la persona stessa**.

**Nessuna delle due misure e' sbagliata**: sono di due momenti diversi, e il
tetto e' stato alzato da una modifica che non ha aggiornato questa riga.

**Non e' riparato qui** perche' modificare `ai-engineering.md` e' un'altra
modifica alla persona, con il suo bump di versione e il suo scenario di
caricamento — e questo piano ne ha gia' una in corso su due moduli. Due
modifiche alla persona nello stesso commit sarebbero due ragioni in una riga.

**A chi tocca:** la prossima modifica a `ai-engineering.md`, che deve rileggere
il numero da `scripts/verify-persona.mjs` invece di ricordarlo — e dichiarare
**quando** il tetto e' passato da 12.000 a 15.000 e chi l'ha deciso, perche'
quello e' il fatto che manca.

---

## D-49-03-DEF-05 — una foto approvata puo' mostrare un luogo, e il bucket e' pubblico

**Trovato:** 2026-09-06, piano 49-03, task 1, misurando dal catalogo cosa
guadagna di visibile un acquirente che completa l'account. **Non e' causato da
questa fase**: la fase ne moltiplica la popolazione, non apre la superficie.

**Il debito e' aperto qui per obbligo del piano**, il cui criterio d'accettazione
dice: *«se quella risposta e' si', la riga entra fra i debiti dichiarati di
`49-VERIFICATION.md`, con la ragione per cui non si ripara in questa fase»*. Un
rischio misurato che non compare fra i debiti e' un rischio che sparisce — ed e'
peggio di uno mai misurato, perche' qualcuno ha guardato e la traccia non c'e'.

**La risposta e' `si'`, non `forse`, ed e' strutturale.**
`catalogo: pg_policies` — `event_media_select_approved` concede `SELECT` ad
`authenticated` con `qual = (status = 'approved')`, e **nessun predicato di
quella policy guarda `event_parties.venue_secret`, `venues.address` o lo stato
della rivelazione**. `catalogo: information_schema.columns` — la tabella porta
`url` (un'immagine) e `caption` (testo libero). Niente, nello schema, impedisce
che una foto approvata inquadri un'insegna, una targa o una facciata
riconoscibile.

**E il confine vero sta piu' in la' di quanto la policy suggerisca.**
`catalogo: storage.buckets` — il bucket **`event-media` ha `public = true`**, e
le URL sono costruite su `/storage/v1/object/public/event-media/`
(`src/app/(public)/events/[slug]/actions.ts:320`). **I byte dell'immagine sono
gia' raggiungibili da chiunque abbia l'URL, senza alcuna sessione.** La policy
governa **chi scopre la riga**, non chi vede la fotografia.

**Cosa questa fase cambia, e cosa no.** Cambia **chi puo' elencare** le righe
approvate: da quattro profili a ogni acquirente. **Non** cambia la
raggiungibilita' dell'immagine, che era gia' anonima. `public.event_media` ha
**0 righe** in produzione: oggi il rischio e' interamente potenziale.

**Corroborato da una fonte indipendente:** `scripts/verify-venue-surfaces.mjs`
stampa la stessa uscita fra le *OPEN EXITS* a ogni esecuzione, pass o fail —
*«MEDIA. A photograph that frames the sign … the same information down a road
with no predicate on it at all»*.

**Perche' non si ripara in questa fase.** Le riparazioni possibili sono tre, e
ognuna esce dal perimetro di una fase che apre l'acquisto senza account:

1. sottoporre l'approvazione dei media a un predicato di segretezza della
   serata — tocca `media-and-storage.md` e il flusso di moderazione;
2. rendere privato il bucket `event-media` e servire ogni immagine da URL
   firmate — tocca **ogni** superficie che mostra una foto, comprese quelle
   pubbliche, ed e' un cambio di architettura dello storage;
3. sospendere l'approvazione sulle serate segrete — e' una decisione di
   prodotto del proprietario, non una migration.

**A chi tocca:** `media-and-storage.md` con `venue-secrecy.md` a fianco. La
decisione fra le tre e' del proprietario, e va presa **prima** che esista un
archivio fotografico di una serata segreta — perche' `venue-secrecy.md` dice che
una rivelazione anticipata non ha rimedio, e una foto pubblicata e' esattamente
quella forma di rimedio che non esiste.

---

## D-49-05-DEF-06 — la superficie dei venduti sa leggere un biglietto, non un ordine

**Trovato:** piano 49-05, scrivendo `src/lib/tickets/order-confirmation.ts`.

**Il fatto.** `email_deliveries` attribuisce un invio a **un** biglietto
(`ticket_id`), e la mail di un ordine ne porta **N**. La riga di registro viene
quindi attaccata al **primo** biglietto dell'ordine.

**La conseguenza, detta com'e'.** Sulla superficie dei venduti gli altri N-1
biglietti risulteranno **«nessun invio registrato»**. Non e' falso — l'invio e'
**uno**, non sei — ma quello stato e' stato scritto per significare *nessuno ha
guardato*, e chi lo legge su cinque righe di sei concludera' che cinque persone
non hanno ricevuto niente. **La direzione dell'errore e' quella sbagliata**: fa
sembrare rotto cio' che funziona, ed e' il modo in cui un canale d'allarme
smette di essere creduto.

**Perche' non si ripara qui.** Le tre strade escono tutte dal piano 49-05:

1. una riga di registro **per biglietto** — ma sarebbe **una riga per messaggio
   che non e' mai stato spedito**, cioe' quattro consegne inventate su sei;
2. una colonna `order_id` su `email_deliveries` — una migration, e
   l'autorizzazione del 2026-09-06 e' **esaurita** con la migration 5;
3. la superficie dei venduti che risale da `tickets.order_id` al primo biglietto
   dell'ordine e disegna **un** segno per l'ordine invece di sei per i biglietti
   — e' la strada piu' onesta, e vive nel file della superficie, che questo piano
   non tocca.

**A chi tocca:** la superficie dei venduti (`ticketing-payments.md` con
`comms-analytics.md` a fianco). Da guardare **prima** della prima serata con
ordini multipli — cioe' prima che qualcuno legga cinque «nessun invio
registrato» e vada a cercare un guasto che non c'e'.

---

## D-49-05-DEF-07 — `AT_THE_DOOR_CATEGORIES` non ha lettori

**Trovato:** piano 49-05, task 1, con un grep su `src/` e `scripts/` prima di
aggiungerci una voce.

**Il fatto.** `src/lib/email-delivery/categories.ts` esporta
`AT_THE_DOOR_CATEGORIES` e **nessun file la importa**: zero occorrenze fuori dal
file che la dichiara. E' un vocabolario dichiarato, non un filtro attivo.

**Perche' e' un debito e non una curiosita'.** La lista nomina le categorie il cui
mancato recapito **costa alla porta**, e il piano 49-05 gliene ha aggiunta una
terza — quella che pesa di piu', perche' chi la riceve non ha una password. Chi
legge quel file crede ragionevolmente che aggiungere una voce accenda qualcosa da
qualche parte. **Non accende niente.** `meta-gates.md`: una lista che sembra un
gate e non lo e' e' peggio di una lista assente, perche' fa credere che qualcuno
stia controllando.

**Le due uscite, e nessuna delle due appartiene a questa fase:** darle il lettore
per cui e' stata scritta — una superficie che ordina per costo alla porta invece
che per data — oppure toglierla e lasciarne la ragione scritta. **Nel frattempo
l'assenza di lettori e' dichiarata nel docblock della lista**, cosi' chi la legge
non deduce una sorveglianza che non c'e'.

---

## D-49-06-DEF-08 — `verify:touch-targets` e' rosso su due controlli della fase 47

**Trovato:** piano 49-06, task 3, lanciando `npm run verify` dopo aver allargato
il gate delle superfici venue.

**Il fatto, e la sua prova.** `npm run verify` esce **1** per un solo gate,
`verify:touch-targets`, che segnala due elementi senza altezza minima:

- `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` — `<button>`
- `src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:702` — `<button>`

**E' precedente a questo piano, e la cosa e' stata misurata invece che
affermata.** Il gate e' stato eseguito su un albero di lavoro staccato alla
baseline della fase, `5f1e260`, e li' fallisce **con gli stessi due elementi
alle stesse due righe**. Il file non e' cambiato da allora
(`git diff 5f1e260 HEAD -- <file>` vuoto) e nessuno dei commit di questo piano lo
tocca. L'albero temporaneo e' stato rimosso subito dopo la misura.

**Perche' non si ripara qui.** E' la regola di perimetro dell'esecuzione: si
ripara cio' che il proprio lavoro ha rotto, non cio' che si trova rotto. I due
controlli appartengono al ritiro di un token drink da ospite (fase 47), che
questo piano non apre — e un piano che tocca il percorso dei biglietti per
sistemare i bottoni del bar e' un piano di cui nessuno sa piu' leggere il diff.

**Cosa costa lasciarlo.** Sono due bersagli sotto i 44px su una superficie che si
usa **in un locale, al buio, con una mano** — `nextjs-architecture.md`, gate
*accessibilita' al buio*. Non e' cosmetico: e' un controllo che si manca al
primo tentativo. Va chiuso da un piano che ha quel file nel proprio perimetro.

**E la conseguenza sull'aggregato va detta:** finche' resta, `npm run verify`
esce 1 su ogni albero, e **un rosso permanente e' il modo in cui un aggregato
smette di essere letto**. Chi lancia il comando dopo questo piano deve poter
distinguere questo rosso da uno nuovo: il criterio e' il nome dei due file e
delle due righe qui sopra.
