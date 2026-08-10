---
phase: 37-manual-venue-reveal
plan: 10
subsystem: manual-venue-reveal-server-action
tags: [venue-secrecy, access-gating, server-action, capability, security-definer, refusal-as-value, monotone-guard]

requires:
  - phase: 37-01
    provides: "`public.record_venue_reveal_act` — lo scrittore atomico, i tre atti e i cinque rifiuti tipizzati"
  - phase: 37-03
    provides: "quella funzione VIVA in produzione, piu' `venue_revealed_at` e `venue_reveal_acts`"
  - phase: 37-09
    provides: "`revealPartyVenue` e `countVenueRevealRecipients` — l'unico posto che spedisce, e l'unica deduplicazione"
provides:
  - "`src/app/(admin)/admin/events/[id]/reveal/actions.ts` — quattro export, ognuno con gate, validazione, rifiuto per valore e revalidatePath"
  - "`getVenueRevealState` — i tre stati del bottone e la traccia, in una chiamata"
  - "`revealVenueNow` / `sendMissingVenueReveal` / `reHideVenue` — i tre atti, attraverso un solo scrittore"
  - "`VenueRevealRefusal` — dieci rifiuti distinti, esportati perche' la superficie possa tenerne un Record totale"
  - "`countVenueRevealRecipients` che dichiara anche `unavailable`"
  - "la guardia che impedisce al form di cambiare `venue_secret` su una serata rivelata"
affects:
  - "37-11 — la superficie legge questi quattro export e deve tradurre dieci rifiuti, non otto"
  - "37-13 — le due voci human_needed sul modello dei permessi restano intere"

tech-stack:
  added: []
  patterns:
    - "un conteggio che alimenta un atto irreversibile dichiara se ha potuto misurare, non solo quanto"
    - "`ok: true` porta comunque una categoria di fallimento quando l'atto e' avvenuto e l'invio no"
    - "un rifiuto su un percorso di segretezza torna come valore, mai come messaggio: Next redige i messaggi in produzione"

key-files:
  created:
    - src/app/(admin)/admin/events/[id]/reveal/actions.ts
    - .planning/todos/pending/form-untick-venue-secret-leaves-no-trace.md
  modified:
    - src/lib/venue-reveal/reveal-party-venue.ts
    - src/app/(admin)/admin/events/actions.ts

key-decisions:
  - "Il risultato dell'azione si chiama VenueRevealActionResult: VenueRevealResult era gia' preso da 37-09 con un'altra forma, e due tipi omonimi nello stesso dominio sono la deriva che gli import invertiti del repo esistono per impedire"
  - "`ok: true` porta anche `failureKind`: senza, 0/0/0 per «nessun avente titolo» e 0/0/0 per «non si e' potuto sapere» diventano la stessa frase"
  - "`countVenueRevealRecipients` torna anche `unavailable`, cosi' la rivelazione si rifiuta PRIMA dell'atto invece di registrare un'intenzione falsa"
  - "Il rifiuto del form e' un NightRefusal restituito e non un throw: un messaggio lanciato da una Server Action e' redatto in produzione"
  - "Serata inesistente e serata di un altro evento hanno lo stesso rifiuto: nessun rate limiting nel repo, e distinguerle sarebbe un oracolo"
  - "Nessun secondo verdetto sul ruolo: `re_hide_requires_master` arriva dalla funzione, che legge il ruolo dentro di se'"

requirements-completed: []

duration: ~45min
completed: 2026-08-11
---

# Fase 37 Piano 10: l'atto, autorizzato dentro se stesso — Summary

**Chi non ha la tredicesima chiave viene rifiutato dentro l'azione e non solo davanti all'indirizzo; un solo atto apre la pagina e manda le mail; il numero che chi preme legge viene dalla stessa deduplicazione che spedisce; e la casella del form non puo' piu' cambiare in silenzio la segretezza di una serata gia' rivelata.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 3 su 3
- **Commit:** 3
- **File creati:** 2 — **modificati:** 2
- **Scritture in produzione:** **zero**

---

## Cosa esiste adesso che prima non c'era

| Export | Cosa fa | Rifiuti propri |
|---|---|---|
| `getVenueRevealState` | i tre stati del bottone, i mancanti, e l'atto piu' recente con nome e istante | forma, appartenenza, destinatari non determinabili |
| `revealVenueNow` | **l'atto**: registra, poi spedisce, poi invalida | i cinque dello scrittore, piu' i propri |
| `sendMissingVenueReveal` | manda ai mancanti, senza spostare l'istante e senza rimandare a chi ha gia' ricevuto | `not_revealed`, e i propri |
| `reHideVenue` | riporta la pagina al segreto, non manda niente | `re_hide_requires_master`, **deciso dalla funzione** |

Piu' una guardia in `updateEvent` e un todo per cio' che resta scoperto.

## Le cose che decidono, e perche' sono cosi'

### Il gate e' dentro, e non e' quello della pagina

Un export di un modulo `"use server"` e' **un endpoint pubblico con una firma comoda**: e' invocabile direttamente, con un corpo falsificato, ed essere importato da una pagina aperta da `organizer.access` non protegge niente. La chiave qui e' la tredicesima, `venue.reveal`, con `requires_approved = true` su entrambi i grant — che e' D-37-14 per intero: `staff.manage` ignora lo stato **di proposito**, perche' un organizer in attesa non va respinto davanti a una fila, e quella ragione davanti a un indirizzo che non rientra non esiste.

Il gate non e' esportato, ed e' la **prima istruzione** dei quattro export. Restituisce il contesto che ha risolto, perche' `cache()` non memoizza dentro il corpo di una Server Action e una seconda chiamata sarebbe un secondo round trip che nessun compilatore vede.

### Il service client, giustificato per iscritto

`event_parties_update_own` esige `staff.manage` **e** (master **oppure** proprietario dell'evento). D-37-13 vuole esattamente l'organizer approvato che **non** ha creato la serata. Il sintomo precoce di sbagliare qui e' *«funziona in sviluppo»*, dove chi prova e' quasi sempre il proprietario. Lo scrittore `SECURITY DEFINER` e' l'unico percorso compatibile, e nessuna scrittura diretta sulla tabella e' stata aggiunta.

`access-gating.md` pretende anche la prova che nessun input non fidato lo raggiunga: `partyId` e' controllato contro `UUID_PATTERN` prima di qualunque query, e **`eventId` non raggiunge mai il database** — si confronta in JavaScript con l'`event_id` della serata.

### L'ordine dell'atto, che e' la decisione

Conteggio → **atto** → invio. L'atto sta prima perche' dal momento in cui `venue_revealed_at` esiste la pagina apre: **l'indirizzo e' uscito**, che l'invio riesca o no (D-37-12). Se il `jsonb` torna `ok: false` non parte nulla, ed e' li' che il secondo tentativo si ferma con una risposta invece di una doppia mail.

L'invio e' limitato a `createdBefore = venue_revealed_at`, l'istante che l'atto ha appena scritto: un biglietto comprato nei millisecondi fra atto e invio vede l'indirizzo in pagina e **non** riceve mail. Senza il limite, quella finestra sarebbe un percorso di mail-all'acquisto arrivato come effetto collaterale, e quel percorso e' esplicitamente differito (D-37-08).

### Nessun secondo verdetto, nessun secondo conteggio

`re_hide_requires_master` arriva **dalla funzione**, che legge il ruolo da `public.profiles` al proprio interno. Il modulo non lo ri-decide: due verdetti sulla stessa domanda sono due posti in cui dissentire, e vincerebbe quello eseguito per ultimo. Allo stesso modo `recipientsPending` viene da `countVenueRevealRecipients` e mai da un conteggio scritto qui — due deduplicazioni sarebbero **due numeri diversi per lo stesso atto irreversibile**.

L'unico pre-controllo che somiglia a un secondo verdetto e' `revealedAt === null` in `sendMissingVenueReveal`, e non lo e': senza quell'istante il limite non e' calcolabile, e il conteggio non limitato manderebbe mail a chi D-37-08 dice che riceve la pagina e basta.

### La M di «N su M» viene dalla traccia

`recipientsTotal` dopo una rivelazione si legge da `recipients_intended` dell'atto, non ricalcolato: un M ricalcolato scivolerebbe a ogni biglietto venduto, e «20 su 53» il giorno dopo direbbe una cosa diversa da «20 su 50» del momento in cui qualcuno ha premuto.

---

## Deviazioni dal piano

### 1. [Rule 2 — funzionalita' critica mancante] `countVenueRevealRecipients` dichiara anche `unavailable`

- **Trovata durante:** Task 1.
- **Il problema:** la funzione tornava `{ total }`, e su una lettura fallita `total` vale **0** — indistinguibile da una serata senza aventi titolo. Ma questo modulo sta per scrivere un atto **irreversibile** che porta quel numero come `recipients_intended`. Registrare *«questo atto intendeva raggiungere 0 persone»* dove la verita' e' *«non si e' potuto sapere»* mette un'affermazione falsa in una traccia **append-only**, e apre l'indirizzo in pagina senza che parta una mail.
- **Perche' non era rimandabile:** e' esattamente il difetto che 37-09 ha chiuso un livello sotto (`recipients_unavailable` nell'invio), sull'asse del conteggio invece che su quello dell'invio. Senza, il percorso manuale poteva scoprire la lettura fallita **solo dopo** il punto di non ritorno. `venue-secrecy.md`, gate *default chiuso*: uno stato non determinabile non e' uno stato vuoto.
- **Fatto:** ritorno `{ total, unavailable }`, additivo; il rifiuto `recipients_unavailable` avviene **prima** dell'atto.
- **File fuori dai `files_modified` del piano:** `src/lib/venue-reveal/reveal-party-venue.ts`. Dichiarato qui invece di taciuto.
- **Commit:** `809b278`.

### 2. [conflitto di nomi] `VenueRevealActionResult` e non `VenueRevealResult`

Il piano dichiarava `VenueRevealResult`. Quel nome e' **gia' esportato da 37-09** con una forma diversa (tre numeri e una categoria, nessun `ok`). Due tipi omonimi nello stesso dominio, in due moduli che la stessa superficie importa, sono la deriva che i tre import invertiti di `src/types/database.ts` esistono per impedire. Rinominato, e la ragione sta nel docblock.

### 3. [Rule 2] `ok: true` porta anche `failureKind`

Il piano dichiarava tre numeri sul ramo di successo. Non bastano: `0/0/0` con `no_recipients` significa *nessuno aveva titolo*, `0/0/0` con `recipients_unavailable` significa *non si e' potuto sapere*, e sono le due frasi che non devono mai diventare una. La quinta categoria che 37-09 ha aggiunto e' gestita distintamente in tutti i rami.

### 4. [Rule 2] Due rifiuti in piu' dei sette dichiarati

`recipients_unavailable` (sopra) e `actor_name_missing`. Il secondo: il piano chiedeva di non inventare un segnaposto quando il nome per esteso manca. Un atto attribuito a un segnaposto non e' attribuito (D-37-18), e la traccia sopravvive alla serata. Un rifiuto proprio dice alla persona una causa su cui puo' agire, invece del generico fallimento di scrittura che lo scrittore produrrebbe comunque. Sono **dieci** rifiuti esportati: 37-11 puo' tenerne un `Record` totale e il compilatore reggera' la meta' che gli compete.

### 5. [deviazione dichiarata] Il rifiuto del form e' un valore, non un `throw`

Il Task 3 chiedeva `throw new Error`, «come gli altri rifiuti del form». E' invece un `NightRefusal` restituito — il canale **piu' recente dello stesso file**, gia' usato tre volte nella stessa funzione.

La ragione e' il fatto che il Task 2 di questo stesso piano cita per non ramificare mai su un messaggio: **Next redige il messaggio di un `Error` lanciato da una Server Action in una build di produzione**. Il form mostra `err.message` nel proprio `catch`, quindi la frase scritta con cura sarebbe arrivata all'operatore come un testo generico, e su un percorso di segretezza del venue — dove chi salva concluderebbe che il salvataggio e' fallito da solo e riproverebbe, o cercherebbe una strada laterale. Un rifiuto che nessuno puo' leggere e' un fallimento silenzioso. Lo `switch` di `nightRefusalSentence` e' totale, quindi il compilatore ha preteso la frase.

### 6. [Rule 3] La predicate del filtro sui format

Allargare la lettura delle serate di due colonne ha rotto il type predicate `(p): p is { id, format_id }`, che restava la forma vecchia della riga. Sostituito con `(typeof existingRows)[number] & { format_id: string }`: narrowing della riga che ha invece di una sua ricopiatura, cosi' la prossima colonna non lo rompe.

### 7. [nota, non deviazione] `VenueRevealAct` **non** e' stato spostato

`src/types/database.ts:736-748` chiede al prossimo lettore di spostare il vocabolario dei tre atti «nel modulo che il piano 37-10 creera'» e ri-esportarlo. **Non e' stato fatto, ed e' corretto:** quel modulo e' `"use server"`, e `database.ts` e' importato anche da componenti client — far dipendere i tipi da un modulo di server action e' un cambio di grafo degli import, non un riordino. Il tipo resta dov'e' e viene importato. Se un giorno serve una casa migliore, e' un modulo che non importa nulla, non questo.

---

## Verifica — e cosa significa in un repo senza test runner

> **Non esiste un test runner per il prodotto.** Nessuna riga di questo piano e' verificata perche' «i test passano».

| Controllo | Esito | Cosa prova davvero |
|---|---|---|
| `npm run build` | **exit 0** dopo ogni task | il typecheck. **Non** prova che un nome di colonna esista: nessun client Supabase e' parametrizzato con `Database`, quindi ogni `select` di questo modulo e' non tipizzato e la forma nel codice e' documentazione |
| `npm run verify:routes` | **exit 0**, PASS | 25 pagine, 25 pattern. Questo piano non aggiunge una pagina: `actions.ts` non e' una rotta, ed e' il risultato atteso per una chiave `scope: "table"` |
| `npm run verify:capabilities` | **exit 0 — 5/5 verde** | `venue.reveal` e' fra le chiavi con un chiamante in `src/` — prima di questo piano era dichiarata e non chiamata da nessuno |
| `grep error.details` sul modulo | **0** | T-37-42 |
| `grep venue_reveal_email_sent` sul modulo | **0** | nessun ramo finge che le mail non siano partite |
| confronti fra orologio e orario della serata | **0** | D-37-11: nessun limite di anticipo |
| rami su `error.message` | **0** | le cinque occorrenze sono tutte dentro un `console.error`, nessuna decide una categoria |

### Cosa NON e' verificato, e va detto

- **Nessuna esecuzione contro il database.** Nessuna chiamata all'azione, nessun `rpc`, nessun cron, nessuna migration. La logica dei cinque rifiuti dello scrittore resta **letta, non eseguita**: la procedura in sei passi di `37-01-SUMMARY.md` e' ancora dovuta per intero. Il primo atto reale appartiene al checkpoint del piano 37-11, sotto autorizzazione del proprietario.
- **Le due voci `human_needed` del piano restano intere, e sono la parte piu' importante di questa pagina.** Che un organizer **approvato e non proprietario** riesca, e che un organizer **non approvato** sia rifiutato, non e' provato. In produzione non esistono sessioni `organizer` ne' `staff`, e nessuno strumento di questo repository puo' autenticarsi come un ruolo. **Questa fase costruisce un percorso irreversibile sopra un modello di permessi che nessuno ha ancora visto rifiutare qualcuno.**
- **Il rifiuto del form non e' stato osservato a mano.** Richiede una sessione master su una serata **gia' rivelata**, e non esiste alcuna serata rivelata: `venue_revealed_at` e' valorizzato su zero righe (misurato in 37-03) e questo piano non ne ha valorizzata nessuna. La procedura sta sotto; e' eseguibile solo dopo il primo atto reale.

### Procedura manuale, per quando esistera' una serata rivelata

1. Sessione **master**, su una serata **rivelata**: togliere o rimettere la spunta di venue segreto e salvare. Atteso: la frase di `venue_secret_locked` in cima al form, che nomina la superficie della serata e il fatto che l'atto lascia traccia. La riga **non** cambia.
2. Stessa sessione, su una serata **mai rivelata**: spuntare o despuntare e salvare. Atteso: **funziona come prima** — e' il residuo dichiarato, non un difetto da riparare qui.
3. Su una serata rivelata, cambiare qualunque altro campo **senza toccare la casella**, e salvare. Atteso: **passa**. La guardia e' sul cambiamento, mai sull'essere stata rivelata.

---

## Note di sicurezza

- **T-37-39** (invocazione diretta senza titolo): mitigato — `CAP.VENUE_REVEAL` chiesta **dentro** ognuno dei quattro export, come prima istruzione, e il gate non e' esportato.
- **T-37-40** (attore dichiarato dal chiamante): mitigato — `p_actor_id` da `getAccessContext()`, `p_actor_name` da `public.profiles` per quell'id. Nessuno dei due arriva dal corpo della richiesta, e un nome vuoto rifiuta invece di riempirsi.
- **T-37-41** (`partyId` arbitrario, o serata di un altro evento): mitigato — uuid prima del database, appartenenza in JavaScript. Serata inesistente e serata altrui condividono un rifiuto **di proposito**: distinguerle sarebbe un oracolo su quali uuid nominano una serata vera, e nel repo non esiste alcun rate limiting.
- **T-37-42** (`error.details`): mitigato — zero occorrenze, e il nome del campo non e' scritto nel file per la ragione che `assignments/actions.ts:58-62` da' sul proprio letterale proibito.
- **T-37-43** (ri-nascondere dal form senza traccia): mitigato per le serate rivelate; il residuo e' un todo con le tre strade e il loro costo.
- **T-37-44** (invio ai mancanti non attribuito): mitigato — `p_act: "completed"` scrive il proprio atto.
- **T-37-SC**: **nessun pacchetto installato.** Nessun checkpoint di legittimita' dovuto.

### Guardie monotone

- **`venue_reveal_email_sent`** — non compare nel modulo. Zero occorrenze, verificato meccanicamente.
- **`venue_revealed_at`** — l'unico allargamento resta quello gia' autorizzato e dichiarato dentro lo scrittore (37-01). Questo piano non ne aggiunge, e ne **toglie** uno: la casella del form non puo' piu' azzerare la segretezza di una serata rivelata senza passare dalla traccia.

### Threat Flags

Nessuna superficie nuova fuori dal registro del piano. I quattro export sono endpoint nuovi **per costruzione** — e' la ragione per cui il gate sta dentro ognuno — e nessuno di essi allarga una lettura: `getVenueRevealState` risponde solo a chi possiede gia' la chiave che permette di rivelare.

## Known Stubs

Nessuno. I quattro export sono completi rispetto a cio' che il piano dichiara. Cio' che manca — il bottone a tre stati, la conferma con il numero, la traccia renderizzata — appartiene a 37-11, che li possiede.

## Debito dichiarato

1. **Il todo nuovo**, `form-untick-venue-secret-leaves-no-trace.md`: su una serata **mai** rivelata, togliere la spunta apre l'indirizzo a tutti per una strada senza registro. Tre strade con il loro costo; la scelta e' del proprietario, ed e' il rovescio di D-37-22.
2. **`deferred-items.md` voce 1 resta aperta.** `EventParty` non dichiara `venue_reveal_on_purchase` ne' `venue_reveal_email_sent`. Questo piano **non** poteva chiuderla senza contraddire un proprio criterio — il modulo non deve contenere quella stringa — e non ne ha bisogno. La prende 37-11.
3. **Dieci rifiuti da tradurre in dieci frasi.** 37-11 ne trova due in piu' di quanti il piano ne dichiarasse. Sono esportati come unione, quindi un `Record` totale li rende un errore di compilazione invece che una frase mancante a runtime.

## Commits

| Task | Commit | Cosa |
|---|---|---|
| 1 | `809b278` | il gate dentro l'azione, la validazione dell'ingresso, lo stato che la superficie legge, e `unavailable` sul conteggio |
| 2 | `18fc271` | i tre atti attraverso un solo scrittore, con ogni rifiuto come valore |
| 3 | `a4f03c8` | la porta laterale del form chiusa, e il residuo scritto |

## Self-Check: PASSED

Tutti e quattro i file dichiarati esistono su disco; tutti e tre i commit esistono in `git log`. Nessuna cancellazione di file tracciati in nessuno dei tre commit; albero pulito dopo ognuno.

---
*Phase: 37-manual-venue-reveal*
*Completed: 2026-08-11*
