---
phase: 37-manual-venue-reveal
plan: 11
subsystem: manual-venue-reveal-surface
tags: [venue-secrecy, access-gating, nextjs-architecture, client-component, refusal-as-value, monotone-guard, docblock-rewrite]

requires:
  - phase: 37-10
    provides: "i quattro export della server action, i dieci rifiuti esportati come unione, e `getVenueRevealState`"
  - phase: 37-09
    provides: "`countVenueRevealRecipients` — l'unica deduplicazione, quindi l'unico numero"
  - phase: 37-03
    provides: "`venue_revealed_at`, `venue_reveal_acts` e lo scrittore VIVI in produzione"
provides:
  - "`RevealVenueDialog.tsx` — la conferma che nomina posto, numero e irreversibilita', e una frase per ognuno dei dieci rifiuti"
  - "`VenueRevealPanel.tsx` — un bottone, tre stati, una posizione, con la traccia accanto"
  - "il montaggio su `admin/(work)/events/[id]/edit/page.tsx`, una volta per serata segreta"
  - "il punto 3 del docblock di quella pagina riscritto invece che cancellato"
  - "`getVenueRevealState` torna anche `acts`: la traccia intera, non il solo ultimo atto"
affects:
  - "37-13 — la verifica di fase eredita l'atto reale, che questo piano NON ha compiuto"

tech-stack:
  added: []
  patterns:
    - "un bottone che si spegne nominando chi e quando, invece di sparire: il rifiuto e' visibile, e nello stesso posto in cui si cercava il controllo"
    - "il pannello rilegge lo stato dal server dopo ogni atto invece di applicare cio' che l'atto ha risposto"
    - "una dichiarazione superata si cita e si supera, non si cancella — la disciplina di `assignment_acts.sql:110-203` portata in un docblock TSX"

key-files:
  created:
    - src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx
    - src/app/(admin)/admin/events/[id]/reveal/VenueRevealPanel.tsx
  modified:
    - src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx
    - src/app/(admin)/admin/events/[id]/reveal/actions.ts

key-decisions:
  - "Il rosso distruttivo dell'analogo NON e' stato ereditato: rivelare non distrugge, pubblica, e il freno e' il numero di persone nel testo, non una tinta"
  - "`getVenueRevealState` torna la traccia intera e non il solo ultimo atto: con l'ultimo atto soltanto, una serata ri-nascosta smetterebbe di dire «rivelato il ... da ...», che e' la condizione su cui D-37-22 e' stata concessa"
  - "Il pannello si disegna solo a chi ha `venue.reveal`; chi non ce l'ha legge una frase invece di trovare uno spazio vuoto"
  - "Una serata senza sede e senza testo libero non arma il bottone: un atto che non pubblica niente scrive comunque un record che non si toglie"
  - "L'esito dell'atto resta sullo schermo finche' non lo si chiude, e `onDone` scatta subito: chiudere dal fondale non puo' lasciare un pannello vecchio"
  - "VENUE-02 NON e' spuntato: il percorso esiste, non e' mai stato percorso, e non e' in produzione"
  - "Checkpoint del Task 3 chiuso `rimanda` dal proprietario il 2026-08-11: con zero destinatari l'atto non esercita l'invio, quindi la prova costerebbe un'irreversibilita' per la meta' meno interessante del comportamento"
  - "La serata di prova creata apposta NON e' una strada pulita: `venue_reveal_acts` punta a `event_parties` con ON DELETE SET NULL, quindi cancellarla lascia righe di traccia orfane con un nome dentro"
  - "Nessuna autorizzazione a scrivere in produzione chiesta ne' concessa: non c'e' nulla di consumato, e chi riprendera' la prova ne deve chiedere una nuova"

requirements-completed: []

duration: ~70min
completed: 2026-08-11
---

# Fase 37 Piano 11: la superficie — Summary

**Chi preme legge il posto, quante persone e che non si torna indietro; il bottone ha una sola posizione e tre stati, e quando e' spento dice chi ha agito e quando invece di sparire; la traccia sta sulla serata e sopravvive a un ri-nascondere; e il docblock della pagina ha smesso di dichiarare cio' che il file ha smesso di fare — nello stesso commit in cui ha smesso di farlo.**

## Performance

- **Duration:** ~70 min
- **Task:** 2 su 3 completi, **il terzo diviso**: il codice fatto, la prova sull'atto vero **portata al proprietario come checkpoint**
- **Commit:** 3
- **File creati:** 2 — **modificati:** 2
- **Scritture in produzione:** **zero**
- **Righe di dati create, modificate o rimosse:** **zero**

---

## Cosa esiste adesso che prima non c'era

| Pezzo | Cosa fa |
|---|---|
| `RevealVenueDialog.tsx` | tre modi — rivelare, mandare ai mancanti, ri-nascondere — una conferma che nomina le tre cose, dieci rifiuti da un `Record` totale, e l'esito «N su M» |
| `VenueRevealPanel.tsx` | un solo `<button>`, tre stati derivati dal database, la traccia degli atti accanto, il ri-nascondere come azione secondaria |
| il montaggio | una scheda per **serata segreta**, sotto il form, solo a chi ha la tredicesima chiave |
| il docblock riscritto | il punto 3 cita il paragrafo superato e dichiara quale governa e da quando |

## Le cose che decidono, e perche' sono cosi'

### Il numero e' la parte che fa fermare, e non si ricalcola

La conferma dice, in quest'ordine: **il posto**, **quante persone**, **che non si torna indietro**. Il numero arriva da `getVenueRevealState`, che lo prende da `countVenueRevealRecipients` — la stessa `Map` che spedisce. Nel dialogo non si conta nulla: due implementazioni della deduplicazione metterebbero **due numeri diversi davanti allo stesso atto irreversibile**, e quello sullo schermo sarebbe quello che non ha mai spedito una mail.

**Nessuna digitazione di conferma** (D-37-16). Due bottoni, `Cancel` primo nel DOM e nel tab order, con il fuoco addosso. Il file non contiene alcun `input`, ed e' verificato meccanicamente sotto. La ragione sta scritta accanto ai bottoni: l'attrito sbagliato su un'azione che si fa di corsa — il venerdi', tardi, da chi capita alla tastiera — produce **il rinvio, non la prudenza**, e una rivelazione rinviata oltre la finestra e' il guasto per cui questa fase esiste.

### Il rosso distruttivo non e' stato ereditato

L'analogo, `RetireFormatDialog.tsx:336`, veste il bottone d'azione di rosso. Qui no, e l'omissione e' ragionata invece che dedotta: **rivelare non distrugge, pubblica.** Su questa superficie il rosso e' il colore della scatola di rifiuto, e prenderlo in prestito direbbe *«questo potrebbe rompere qualcosa»* dove la frase vera e' *«questo raggiunge delle persone e non si richiama»*. Il freno e' il numero nel paragrafo sopra il bottone.

### Un bottone, tre stati, e lo spento che risponde

Un solo elemento `<button>`, il cui testo e il cui gestore cambiano; la posizione no. E' la parte che decide, perche' il secondo tentativo torna **nello stesso punto**: se il controllo si e' spostato o e' sparito, la domanda *«l'ho gia' fatto?»* li' non ha risposta — e su un atto che pubblica un indirizzo una domanda senza risposta e' qualcuno che ripreme per sapere.

Lo spento porta accanto **quando** e **chi, per esteso** (D-37-18, D-37-19). Con destinatari mancanti il bottone **cambia testo, non stato**: «Send to the N still missing», numero esplicito, stessa posizione, e l'azione sotto non rimanda a chi ha gia' ricevuto perche' il filtro per destinatario vive dentro il modulo che spedisce, in una copia sola (D-37-20).

### La misura non si prende con lo strumento che ha causato l'effetto

Dopo ogni atto riuscito il pannello **rilegge dal server**. Non applica cio' che l'atto ha risposto: un pannello che si aggiorna a memoria mostra esattamente cio' che si aspetta di mostrare, comprese le volte in cui la scrittura non ha fatto quello che crede.

Lo stesso principio ha prodotto una cosa che il piano non chiedeva: la pagina passa al pannello il `venue_revealed_at` **che ha reso lei**, letto con la sessione di chi guarda, e il pannello lo confronta con quello che rilegge un istante dopo con il service client. Se i due non concordano, qualcuno ha agito su quella serata **fra il render e adesso**, e il pannello lo dice invece di lasciare che il form sopra venga salvato con un atto di ritardo. Il confronto e' sulla **nullita'**, non sulle due stringhe: due strumenti diversi possono rendere un timestamp in due modi, e un allarme su quello sarebbe un allarme su niente.

### Lo stato non determinabile non autorizza

Se la lettura fallisce, il bottone principale e' **inattivo** e compare la frase che nomina la causa — dalla stessa tabella di frasi del dialogo, esportata proprio perche' non ce ne siano due. `venue-secrecy.md`, gate *default chiuso*: e' l'unico dominio del progetto in cui il default sicuro e' negare. Una traccia **vuota** e una traccia **non letta** non si disegnano nello stesso modo: la prima e' una riga di testo, la seconda spegne il bottone.

### Chi non ha la chiave legge una frase, non trova uno spazio vuoto

Il pannello si disegna solo a chi ha `venue.reveal`. Non disegnarlo **non e' proteggerlo**, e il docblock lo dice per esteso: la guardia sta dentro l'azione, che rimette la chiave come prima istruzione di ogni export, e dentro `record_venue_reveal_act`, eseguibile dal solo `service_role`. A chi non ce l'ha resta una riga che spiega perche' non c'e' niente da premere — la stessa disciplina di D-37-19 applicata al permesso invece che al secondo tentativo.

### Il docblock che diventava falso

Il punto 3 diceva *«the venue is not revealed one moment earlier by this file»*. Dal commit `d1521ff` la pagina **porta un percorso che rivela**, quindi quella frase e' falsa. E' stata **citata per intero e superata**, non cancellata, con la disciplina di `20260809002000_assignment_acts.sql:110-203`: chi arriva prima al paragrafo vecchio viene avvisato li' che ce n'e' uno dopo e quale dei due governa. Il nuovo elenca le quattro cose che impediscono che sia un allargamento dei gate — la chiave diversa e piu' stretta, la guardia dentro l'azione, `venue_reveal_sent` ancora intoccato e ancora monotono, e l'assenza deliberata di un limite di anticipo (D-37-11).

---

## Deviazioni dal piano

### 1. [Rule 2 — funzionalita' critica mancante] `getVenueRevealState` torna la traccia intera

- **Trovata durante:** Task 2, progettando cosa il pannello puo' rendere.
- **Il problema:** il contratto di 37-10 restituiva `lastAct`, **un atto solo**. Il Task 2 chiede di mostrare gli atti in ordine e che *«dopo un ri-nascondere la riga precedente resta»*. Con il solo ultimo atto, una serata ri-nascosta avrebbe mostrato *«tornata segreta da …»* **e nient'altro**: la pagina avrebbe smesso di dire cio' che le mail gia' uscite continuano a dire.
- **Perche' non era rimandabile:** e' letteralmente la condizione su cui D-37-22 e' stata concessa — *«la traccia e' append-only e non si cancella, e la serata continua a dire "rivelato il … da …" anche dopo essere tornata segreta»*. Senza, avremmo una pagina che dice una cosa e delle mail che ne dicono un'altra, che e' l'esito che la decisione escludeva.
- **Fatto:** la lettura gia' presente e' passata da `.limit(1).maybeSingle()` a `.limit(50)`; `acts` e' additivo e `lastAct` si deriva da `acts[0]`. **Nessun export nuovo**, quindi **nessun endpoint pubblico nuovo** — e la costante del limite non e' esportata, perche' un modulo `"use server"` puo' esportare solo funzioni asincrone.
- **File fuori dai `files_modified` del piano:** `src/app/(admin)/admin/events/[id]/reveal/actions.ts`. Dichiarato qui invece che taciuto.
- **Commit:** `ab52547`.

### 2. [progettazione, non deviazione] Il pannello riceve `venue_revealed_at` e ne fa un confronto

Il piano chiedeva di passare la colonna al pannello. Il pannello **non la usa per disegnare il bottone** — quello viene solo dalla lettura del server — e la usa per dichiarare il disaccordo fra i due strumenti. Un valore passato e non usato sarebbe stato decorazione; usarlo per lo stato sarebbe stato «cio' che la schermata ricorda». La terza via e' l'unica coerente con il gate.

### 3. [Rule 3] La forma dell'effetto di caricamento

`react-hooks/set-state-in-effect` ha rifiutato la prima scrittura (`void load()` nel corpo dell'effetto, con `load` una `useCallback`). Adottata la forma che il repo gia' usa in `components/admin/TransactionList.tsx:344-372` — la funzione asincrona dichiarata dentro l'effetto — e il `loading` esplicito spostato in `reload`, dove e' un gestore di evento. Un apostrofo non escapato in JSX corretto nello stesso passaggio. **Nessun altro errore di lint e' stato toccato:** ne restano 20 pre-esistenti nel repo, fuori perimetro.

### 4. [dichiarata] Il montaggio non entra dentro `EventForm`

Il piano dice «nel blocco della serata». I blocchi delle serate sono resi da `EventForm`, un componente client condiviso **anche con la pagina di creazione**, dove una serata non ha ancora un id. Il pannello sta quindi in una sezione propria **sotto il form**, una scheda per serata segreta, ognuna intestata con il titolo della serata. La traccia resta *sulla serata* nel senso di D-37-17 — si legge dove si lavora quella serata, non in un registro separato — senza allargare il diff a un componente che sta sul percorso di creazione.

### 5. [dichiarata] Solo le serate segrete, e solo se nominano un posto

Una serata non segreta non ha un indirizzo sotto chiave, e `revealVenueNow` le risponderebbe `not_secret` — disegnarle il controllo significherebbe disegnare un bottone la cui unica risposta possibile e' che non andava disegnato. E una serata segreta **senza sede e senza testo libero** non arma il bottone: la conferma non potrebbe nominare il posto, che e' la prima delle tre cose di D-37-16, e un atto che pubblica il nulla scrive comunque un record che non si toglie.

### 6. [voce differita presa] `deferred-items.md` voce 1 **resta aperta**

`EventParty` continua a non dichiarare `venue_reveal_on_purchase` e `venue_reveal_email_sent`. 37-10 la passava a 37-11. **Questo piano non la chiude**, e la ragione e' misurata invece che comoda: nessuno dei tre file toccati legge quelle due colonne — il pannello lavora su `venue_revealed_at`, e `venue_reveal_email_sent` non compare in nessuno di essi (zero occorrenze, verificato). Chiuderla qui sarebbe stato allargare il diff di un piano che monta un percorso di rivelazione, per una deriva che non lo tocca. **Va assegnata a 37-13.**

### 7. [Rule 1 — bug] La traccia non letta diceva «non e' stato fatto niente»

- **Trovata durante:** la verifica di D-37-22 che il proprietario ha chiesto al checkpoint. **Non e' stata trovata scrivendo il codice: e' stata trovata rileggendolo per rispondere a una domanda precisa**, ed e' l'argomento migliore che questa pagina abbia per quella domanda.
- **Il problema:** su `phase === "failed"` lo stato e' `null`, quindi la lista riceveva `acts ?? []` — un array vuoto — e con `loading` falso cadeva nel ramo che stampa **«Nothing has been done to this night's venue yet.»** Una frase **affermativa, data per fatto**, su una serata la cui storia nessuno ha potuto leggere. La scatola rossa sopra diceva che la lettura era fallita, e questa riga la contraddiceva un paragrafo sotto — e il commento dentro il componente sosteneva gia' l'opposto di cio' che il componente faceva, che e' peggio di entrambe le cose separate.
- **Perche' conta piu' di quanto sembri:** su una serata **gia' rivelata** e' la frase che invita il secondo tentativo che D-37-19 esiste per impedire. Ed e' lo **stesso difetto che questa fase ha gia' rimosso due volte piu' in basso** — `no_recipients` contro `recipients_unavailable` nell'invio (37-09), poi `unavailable` sul conteggio (37-10) — riaffiorato una terza volta nella **vista**. `venue-secrecy.md`, gate *default chiuso*: uno stato non determinabile non e' uno stato vuoto, e vale per una frase su uno schermo esattamente come per un numero in una colonna.
- **Fatto:** tre stati invece di due. La fase viaggia al componente al posto di un booleano, e la lettura fallita ha la sua riga, che nomina la causa e dice esplicitamente che **non** significa «non e' successo niente».
- **Commit:** `0937868`.

---

## Verifica — e cosa significa in un repo senza test runner

> **Non esiste un test runner per il prodotto.** Nessuna riga di questo piano e' verificata perche' «i test passano». La verifica qui e' `npm run build` piu' cio' che e' stato misurato, e cio' che non lo e' e' scritto sotto.

| Controllo | Esito | Cosa prova davvero |
|---|---|---|
| `npm run build` | **exit 0** dopo ognuno dei tre commit | il typecheck. **Non** prova che un nome di colonna esista: nessun client Supabase e' parametrizzato con `Database` |
| `npm run verify:routes` | **exit 0**, PASS | nessuna rotta nuova: il pannello si monta su una pagina gia' dichiarata |
| `npm run verify:capabilities` | **exit 0 — 5/5 verde** | le quattro dichiarazioni concordano; `venue.reveal` ha chiamanti |
| `npm run verify:persona` | **exit 0** | non regressione: la persona non e' stata toccata |
| `npx eslint` sui tre file | **0 problemi** | i due errori trovati sono stati corretti, non silenziati |
| `grep -c input` sul dialogo | **0** | nessuna digitazione di conferma (D-37-16) |
| rami su `err.message` | **0** | il `catch` ramifica sulla forma, in entrambi i componenti. `grep -c` sul dialogo torna **1**: e' la riga 64, dentro il docblock che spiega perche' non si fa. Zero nel pannello |
| elementi `<button>` nel pannello | **2** — `:277` e `:324` | uno principale a tre stati, piu' il ri-nascondere secondario e separato. `grep -c "<button"` torna **3**: la terza e' prosa a `:37`. **Non ci sono tre bottoni resi in tre posizioni** |
| `Record<VenueRevealRefusal, string>` | **totale** | un rifiuto nuovo a monte rompe il build invece di rendere una frase vuota |

### Cosa NON e' verificato, e va detto per intero

- **Nessuno ha mai premuto questo bottone.** Non in produzione, non in locale, non una volta. Il codice e' letto e compilato, **non eseguito**: `revealVenueNow`, `sendMissingVenueReveal` e `reHideVenue` non sono mai partite, e i cinque rifiuti dello scrittore restano letti e non esercitati. **La procedura in nove punti del Task 3 e' dovuta per intero.**
- **Niente di tutto questo e' in produzione.** Il ramo di lavoro e' **216 commit avanti a `origin/main`**, fermo al **2026-08-09**. Il sito online serve codice che di questa superficie non sa nulla.
- **Le due voci `human_needed` del modello dei permessi restano intere.** Che un organizer **approvato e non proprietario** riesca, e che un organizer **non approvato** venga respinto, non e' provato: in produzione non esistono sessioni `organizer` ne' `staff` e nessuno strumento di questo repository puo' autenticarsi come un ruolo. **La superficie di un percorso irreversibile e' stata costruita sopra un modello di permessi che nessuno ha ancora visto rifiutare qualcuno.**
- **Il disaccordo fra pagina e pannello non e' stato osservato.** Richiede due sessioni che agiscono sulla stessa serata a cavallo di un render.

---

## L'esito del checkpoint: **`rimanda`** — 2026-08-11

Il proprietario ha accolto la raccomandazione. **Nessuna delle due strade**, e la ragione in una riga: **con zero destinatari l'atto non esercita l'invio**, quindi la prova costerebbe un'irreversibilita' e comprerebbe la meta' meno interessante del comportamento.

**Nessuna autorizzazione a scrivere in produzione e' stata chiesta ne' concessa** — e quindi **non c'e' nulla di consumato**. Non e' una formalita' del registro: `ai-engineering.md` chiede che chi riceve un'autorizzazione dichiari quando l'ha esaurita, e qui la voce corretta e' che non ne esiste una. La direzione «non scrivere» e' la sola che si possa prendere senza permesso.

### Cosa resta non provato

Non addolcito, perche' e' la parte che conta:

1. Che lo scrittore **rifiuti il secondo atto** sotto il proprio lock.
2. Che `venue_revealed_at` si valorizzi e la traccia scriva **una** riga con nome e istante.
3. Che il pannello ricaricato mostri lo **spento con data e nome**.
4. Che il **ri-nascondere lasci in piedi la riga precedente** — nel database. *(Nel codice reso e' verificato: vedi sotto.)*

E il quinto, che non e' del bottone: che la pagina pubblica torni all'indizio.

> **Il codice e' letto e compilato, mai eseguito.** Nessuno ha premuto questo bottone: non in produzione, non in locale, non una volta.

### La strada B non era pulita, e la ragione va scritta per chi ci ripassera'

Era stata presentata come l'alternativa che non tocca una serata vera: crearne una apposta, catturarne la chiave alla creazione, rimuoverla per chiave primaria. **Non funziona come pulizia**, ed e' una scoperta sulla **procedura di prova**, non sul prodotto:

`venue_reveal_acts` punta a `event_parties` con **`ON DELETE SET NULL`**, non con `CASCADE` — e' la voce 3 di `deferred-items.md`, deliberata. Cancellare la serata di prova per chiave primaria quindi **non rimuove le righe di traccia**: restano, **orfane**, con un nome per esteso dentro, su un progetto **senza PITR**. Una rimozione che lascia in piedi cio' che doveva pulire non e' una rimozione: e' un residuo che il prossimo lettore dell'istantanea trovera' senza sapere cos'e' — e che conterebbe fra le tabelle *modificate* invece che fra quelle svuotate.

**Chiunque provera' questa verifica in futuro deve saperlo prima di scegliere la strada, non dopo.**

### La verifica che il proprietario ha chiesto: D-37-22 regge, nel codice **reso**

La domanda era la piu' stretta possibile: il dato arriva, o la **vista** lo mostra? Sono due cose diverse, e la seconda vanificherebbe la condizione su cui la decisione e' stata concessa. Letto il codice, non dedotto:

| | |
|---|---|
| `<VenueRevealTrace>` e' montato a `VenueRevealPanel.tsx:317` | **fuori da ogni guardia su `revealed`** — nessun `revealed && …` lo avvolge |
| dopo un ri-nascondere `state.revealedAt` torna `null` | il bottone torna a **«Reveal now»**, e la lista **non cambia** |
| `ACT_LABEL` e' un `Record` **totale** sui tre atti | `revealed` ha la sua etichetta e non puo' rendere vuoto |
| ordine | il piu' recente per primo: *«Taken back to secret»* sopra, *«Revealed — … — nome»* sotto |

**Il dato arriva e la vista lo rende.** La serata continua a dire di essere stata rivelata mentre la sua pagina ha ripreso a nascondere l'indirizzo, che e' esattamente la coppia di stati su cui D-37-22 poggia.

**La stessa lettura ha pero' trovato un difetto — e non nel percorso del ri-nascondere.** Vedi la deviazione 7.

## Il Task 3, e perche' la sua prova non e' stata compiuta

Il Task 3 chiede la procedura in nove punti su una serata vera. **Il codice e' fatto e committato** (`d1521ff`); **la prova no**, ed e' stata portata al proprietario come checkpoint bloccante — che ha risposto **`rimanda`** (sezione sopra). Le tre ragioni sono misurate, non argomentate.

**1. L'autorizzazione a scrivere in produzione non esiste, e non si eredita.** `ai-engineering.md`: e' un atto, copre esattamente cio' che e' stato descritto quando e' stata chiesta, e si consuma una volta. Quella di questa fase copriva **una migration** e si e' esaurita al suo `HTTP 200` (37-03). Non copre la creazione di righe ne' la scrittura di `venue_revealed_at`.

**2. Compiere l'atto e' far scattare la guardia monotona, e la traccia non si ripulisce.** Un master puo' ri-nascondere, ma **la riga resta**: quella serata direbbe *«rivelato il … da …»* per sempre. Non e' un artefatto di prova da rimuovere dopo — e' esattamente la proprieta' che rende onesta D-37-22, quindi non e' toccabile per convenienza.

**3. Il pezzo piu' importante della procedura non e' esercitabile comunque.** Misurato in sola lettura contro la produzione (`read_only: true`, sessione `supabase_read_only_user`, nessun `INSERT`/`UPDATE`/`DELETE`):

| Misura | Valore |
|---|---|
| serate totali · di cui segrete | 3 · **2** |
| serate con `venue_revealed_at` valorizzato | **0** |
| righe nella traccia | **0** |
| `tickets` totali · non raggiunti | 0 · 0 |
| `rsvps` totali · non raggiunti | 0 · 0 |
| **persone che riceverebbero la mail, deduplicate, sul complesso delle serate segrete** | **0** |
| `record_venue_reveal_act` viva | si |
| `public.venue_for_parties` viva | **no — ancora applicata a zero** |

Con **zero destinatari**, l'atto non esercita l'invio: il punto 4 della procedura non osserverebbe un «N su M» ma la frase di `no_recipients`. **La parte che vale — la deduplicazione, i lotti, la marcatura per lotto, il parziale — resterebbe non provata anche dopo aver speso l'irreversibilita'.**

Cosa resta **non provato** se il proprietario declina, detto senza vestirlo da evidenza: che lo scrittore rifiuti il secondo atto sotto il proprio lock; che `venue_revealed_at` si valorizzi e la traccia scriva una riga con nome e istante; che il pannello ricaricato mostri lo spento con data e nome; che il ri-nascondere lasci la riga precedente; che la pagina pubblica torni all'indizio. **Il codice e' letto, non eseguito, e finche' resta cosi' va detto ogni volta che se ne parla.**

Le due strade, il loro costo e la ragione per cui **nessuna delle due e' stata presa** stanno nella sezione sopra. Il momento in cui la prova va fatta, e chi la prende, sono in `deferred-items.md` voce 5.

---

## Note di sicurezza

- **T-37-45** (atto irreversibile per inerzia): mitigato — conferma modale, `Cancel` primo e a fuoco, il numero di persone nel testo, nessuna scorciatoia da tastiera che compia l'atto, nessuna digitazione.
- **T-37-46** (secondo atto invocato saltando il bottone spento): **non mitigato da questo piano, e non deve esserlo.** Il bottone spento e' UX; il rifiuto vive in `record_venue_reveal_act` sotto `FOR UPDATE`. Questo piano non ha aggiunto alcun controllo lato client che qualcuno possa scambiare per una guardia, e il docblock della pagina lo dichiara.
- **T-37-47** (il nome della sede nel dialogo): **accept**, come da registro. Superficie di staff: chi legge questa pagina vede gia' `venues(name)` nel form sopra. Il nome **non entra** in questo documento ne' in altro sotto `.planning/`.
- **T-37-48** (pannello che si aggiorna a memoria): mitigato — ricarica dal server dopo ogni atto, e `onDone` scatta all'istante del successo, prima che l'esito venga chiuso, cosi' che uscire dal fondale non possa lasciare un pannello vecchio.
- **T-37-49** (serata di prova con destinatari reali): **portato al proprietario, non deciso qui.** Le persone che riceverebbero una mail oggi sono **zero**, misurato; resta che l'atto scrive su una serata **vera**.
- **T-37-SC**: **nessun pacchetto installato.** Nessun checkpoint di legittimita' dovuto.

### Guardie monotone

- **`venue_reveal_sent`** — **zero occorrenze in codice.** `grep -c` ne torna 1 nel dialogo (`:24`) e 2 nella pagina (`:55`, `:97`): sono tutte e tre **prosa** — la citazione dell'analogo e le due del docblock riscritto. Nessun componente la legge, la scrive o la nomina in un'espressione. Il numero e' scritto qui perche' chi rifara' il grep trovi 3 e non ne concluda una divergenza.
- **`venue_revealed_at`** — **nessun allargamento aggiunto.** L'unico che esiste resta quello gia' autorizzato e dichiarato dentro lo scrittore (37-01, ramo `re_hidden`), e questa superficie lo espone dietro un'azione secondaria, distinta, che il database rifiuta a chi non e' master.
- **La numerazione di serie** — non toccata.

### Threat Flags

Nessuna superficie nuova fuori dal registro del piano. Il montaggio non aggiunge una rotta e non aggiunge un endpoint: `getVenueRevealState` era gia' un export di 37-10, e l'unica modifica al suo contratto **allarga cio' che restituisce a chi possiede gia' la chiave che permette di rivelare** — nessun lettore nuovo, nessun dato che non fosse gia' raggiungibile con la stessa chiave.

## Known Stubs

Nessuno. Cio' che manca non e' un pezzo non cablato: e' **una prova non compiuta**, ed e' il checkpoint.

## Debito dichiarato

1. **La prova sull'atto vero — rimandata dal proprietario il 2026-08-11, non dimenticata.** Registrata come voce **5** di `deferred-items.md`, con il momento in cui va fatta (dopo il deploy della seconda migration e dell'arretrato, quando la pagina pubblica funziona e la procedura si puo' fare **intera**) e con il difetto della strada B scritto accanto, perche' chi la prendera' non lo riscopra a cose fatte.
2. **`deferred-items.md` voce 1 resta aperta** e passa a 37-13: `EventParty` non dichiara `venue_reveal_on_purchase` ne' `venue_reveal_email_sent`. Nessuno dei file di questo piano le tocca.
3. **VENUE-02 non e' spuntato.** Il percorso e' completo da capo a fondo e **non e' mai stato percorso**, ne' e' in produzione. Spuntarlo sarebbe un verde falso su un requisito di rivelazione, che e' la categoria peggiore in cui averne uno — e' la stessa scelta che 37-03 ha fatto e scritto. Lo chiude 37-13, dopo un atto osservato.
4. **Le due voci `human_needed` sul modello dei permessi** restano intere, e sono la parte piu' importante di questa pagina.

## Commits

| Task | Commit | Cosa |
|---|---|---|
| 1 | `31f1ef6` | la conferma che nomina il posto, il numero e l'irreversibilita', e dieci rifiuti da un `Record` totale |
| 2 | `ab52547` | un bottone, tre stati, una posizione, la traccia accanto — piu' `acts` sul contratto di lettura |
| 3 (codice) | `d1521ff` | il montaggio, e il punto 3 del docblock riscritto invece che cancellato |
| — | `c495841` | il SUMMARY, STATE e ROADMAP al checkpoint |
| — | `0937868` | **[Rule 1]** la traccia non letta smette di dire «non e' stato fatto niente» — trovata rispondendo alla domanda del proprietario su D-37-22 |
| 3 (prova) | — | **checkpoint chiuso `rimanda` il 2026-08-11. Non compiuta, nessuna autorizzazione chiesta ne' concessa** |

---

## Self-Check: PASSED

- I quattro file dichiarati esistono su disco; i cinque commit esistono in `git log`.
- **Nessuna cancellazione di file tracciati** in nessuno dei commit (`git diff --diff-filter=D` vuoto su tutti).
- **Tre affermazioni sono state corrette da questo controllo, non dopo di esso.** Le righe di `grep` su `err.message`, sul numero di `<button>` e su `venue_reveal_sent` dicevano «0» dove un `grep -c` ne torna rispettivamente 1, 3 e 3 — tutte prosa nei docblock. Erano vere nella sostanza e **false come numero**, ed e' la specie di scarto che fa concludere al lettore successivo che il documento menta. Le righe ora portano il numero che il comando restituisce davvero, con accanto perche'.
- **Zero scritture in produzione.** L'unica interrogazione al database vive e' passata da `/database/query` con `read_only: true` — sessione `supabase_read_only_user`, dove un `INSERT` fallisce `25006` — e ha prodotto soltanto conteggi aggregati. Nessun `INSERT`, `UPDATE`, `DELETE`; nessun controllo di cancellazione premuto; nessuna riga creata, quindi nessuna chiave da catturare e nessuna rimozione da fare.
- **Il checkpoint ha prodotto un difetto vero.** La domanda del proprietario su D-37-22 non ha confermato e basta: ha fatto rileggere il componente e ha scoperto la riga che diceva «non e' stato fatto niente» su una traccia non letta (deviazione 7, commit `0937868`). E' l'argomento per cui un checkpoint bloccante su una superficie irreversibile non e' un costo di processo.

---
*Phase: 37-manual-venue-reveal*
*Completed: 2026-08-11 — build completo. Prova sull'atto vero: checkpoint chiuso `rimanda`, registrata come `deferred-items.md` voce 5.*
