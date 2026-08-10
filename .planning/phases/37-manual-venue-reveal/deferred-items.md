# Fase 37 — voci differite

Cose trovate durante l'esecuzione, **fuori dal perimetro del piano che le ha
trovate**, e quindi non riparate li'. Ognuna dice chi l'ha trovata e perche' non
e' stata chiusa sul posto.

---

## 1. `EventParty` non dichiara due colonne di rivelazione che esistono

- **Trovata durante:** 37-03, Task 3, leggendo lo schema vivo per allineare i tipi.
- **Cosa:** `public.event_parties` porta `venue_reveal_on_purchase` (boolean,
  nullable) e `venue_reveal_email_sent` (boolean, nullable). **L'interfaccia
  `EventParty` in `src/types/database.ts` non dichiara ne' l'una ne' l'altra.**
- **Perche' non e' stata chiusa qui:** e' una deriva **pre-esistente**, non un
  effetto della migration di questo piano. Il gate *tipi allineati* di
  `supabase-data.md` chiede che un **cambio di schema** si rifletta nello stesso
  commit; queste due colonne non sono un cambio di questo commit, e allargare il
  diff di un piano che applica una DDL alla produzione avrebbe reso piu' difficile
  verificare l'unica domanda che quel diff deve poter reggere.
- **Perche' conta comunque, e presto:** entrambi i piani 37-10 (la server action)
  e 37-11 (il bottone a tre stati) leggono `venue_reveal_email_sent`, ed e' la
  colonna rispetto alla quale `venue_revealed_at` si definisce per differenza. Un
  autore che cerca la prima nell'interfaccia e non la trova puo' concluderne che
  non esista sulla tabella. Il rischio e' quello, ed e' scritto anche accanto a
  `venue_revealed_at` perche' non dipenda dalla lettura di questo file.
- **Chi la dovrebbe prendere:** 37-10 o 37-11, che le toccano davvero.

---

## 2. L'inventario delle cascate della ricerca era incompleto

- **Trovata durante:** 37-03, Task 1, derivando la copertura dell'istantanea da
  `pg_constraint` invece che dall'elenco gia' scritto.
- **Cosa:** `37-RESEARCH.md` § Runtime State Inventory elenca diciassette tabelle
  raggiungibili da `event_parties`. Sono **diciotto**: manca
  `discount_code_tiers`, che non e' figlia diretta di `event_parties` ma ci arriva
  **a due salti**, sia via `discount_codes` sia via `ticket_tiers`, entrambi
  `ON DELETE CASCADE`.
- **Perche' era incompleto:** la ricerca aveva enumerato le chiavi esterne
  **dirette** e le aveva chiamate «le cascate». E' lo stesso errore
  dell'incidente della fase 36, con un livello di profondita' in piu'.
- **Stato:** **corretta in 37-03.** L'istantanea di questo piano copre tutte e
  diciotto piu' le due raggiunte da `ON DELETE SET NULL`. La voce resta qui
  perche' `37-RESEARCH.md` **non e' stato modificato** — una ricerca e' un
  documento datato, e si corregge dichiarando dove sta la correzione, non
  riscrivendola.
- **Chi la dovrebbe prendere:** 37-13, che rilegge l'istantanea, e chiunque
  scriva una procedura che scrive in produzione dopo questa fase.

---

## 3. `public.venue_reveal_acts` entra nell'insieme `SET NULL`, non nelle cascate

- **Trovata durante:** 37-03, Task 2, rileggendo i vincoli dopo l'applicazione.
- **Cosa:** la tabella nuova punta a `public.event_parties` e ad `auth.users`
  **entrambi con `ON DELETE SET NULL`**, deliberatamente. Non e' quindi la
  diciassettesima cascata: e' una riga che sopravvive alla serata che nomina.
- **Conseguenza operativa:** ogni istantanea futura presa dopo questa fase deve
  contarla fra le tabelle **modificate** da una cancellazione, non fra quelle
  cancellate. L'istantanea di 37-03 e' stata presa **prima** che la tabella
  esistesse, quindi non la contiene: e' corretto per quel baseline e va saputo da
  chi lo confronta.
- **Chi la dovrebbe prendere:** 37-13.

---

## 4. `venue_for_parties` filtra `is_published` PRIMA dei cinque rami — una bozza non ha nome del locale per nessuno

> **CHIUSA il 2026-08-11, dal piano 37-14, Task 3.** La condizione e' stata
> spostata **dentro** i rami: governa i quattro rami del pubblico (1, 3, 4, 5) e
> **non** il ramo dello staff. Su una bozza risponde solo `staff.manage`.
>
> **La ragione, che e' la risposta alla domanda non tecnica posta qui sotto:
> si', su una bozza chi ha `staff.manage` deve vedere il nome del locale — e
> concederglielo non allarga niente.** Chi ha quella chiave legge gia'
> `public.venues` per intero, dalla policy `venues_select_staff` creata dalla
> stessa migration; la funzione che gli negava il nome su una bozza gli chiudeva
> una strada mentre un'altra era aperta. E' l'incoerenza misurata da 37-13 —
> stesso master, **0 righe** dalla funzione e **2 righe** leggendo
> `public.venues` diretto — non una protezione.
>
> Fatta **adesso** per la ragione scritta qui sotto: la migration non era
> applicata, quindi e' costata la modifica di un file. Provata su container
> usa-e-getta con entrambe le migration: staff su bozza **1 riga**, membro
> approvato su bozza **0**, anonimo su bozza **0**, anonimo su serata pubblicata
> non segreta **1**. La ragione e' scritta **dentro la migration**, accanto alla
> modifica, non solo qui.

- **Trovata durante:** 37-05 e 37-06, **indipendentemente**, nella stessa onda.
  Due agenti che non si parlavano hanno misurato lo stesso fatto: e' un indizio
  che sia una proprieta' della funzione, non un'impressione.
- **Cosa:** `public.venue_for_parties(uuid[])` applica `AND e.is_published`
  **prima** di valutare i cinque rami di titolo. Su un evento non pubblicato non
  restituisce nulla **a nessuno** — nemmeno a chi ha `staff.manage`. Sulla lista
  eventi lo staff le bozze le vede, e da oggi le vedrebbe **senza il nome del
  locale**; sul dettaglio, chi prepara una bozza segreta vede l'indizio invece
  dell'indirizzo.
- **Il verso dell'errore e' quello sicuro:** si perde un nome, non se ne mostra
  uno che non si doveva. E' la ragione per cui nessuno dei due agenti l'ha
  forzato.
- **Perche' non e' stato riparato nell'onda:** le due strade erano modificare la
  migration — che a quel punto era **gia' scritta per l'applicazione**, e non si
  tocca una migration in attesa di push — oppure rimettere un secondo embed
  condizionato, cioe' **due percorsi di costruzione per lo stesso valore**, che e'
  esattamente il difetto che i commenti di quei file esistono per impedire.
- **La decisione che serve, e non e' tecnica:** su una bozza, chi ha
  `staff.manage` deve vedere il nome del locale? Se si', la condizione va
  spostata dentro i rami invece che davanti — ed e' una modifica alla migration
  **non ancora applicata**, quindi **oggi costa poco e dopo il deploy costa una
  migration in piu'**.
- **Chi la dovrebbe prendere:** va decisa **prima** che
  `20260810161000_venues_read_narrowed.sql` venga applicata, perche' quello e' il
  momento in cui il costo cambia. Verifica in 37-13.

---

## 5. La prova sull'atto vero della rivelazione manuale non e' stata compiuta

- **Trovata durante:** 37-11, Task 3 — che e' il checkpoint bloccante che la
  chiedeva. Non e' un residuo scoperto per caso: e' il deliverable del task,
  **rimandato dal proprietario il 2026-08-11** dopo che il costo era stato
  misurato invece che descritto.
- **Cosa manca:** la procedura in nove punti del Task 3 di `37-11-PLAN.md` —
  premere, annullare e verificare che nulla sia stato scritto, confermare,
  rileggere `venue_revealed_at` e la traccia dal database, ricaricare, invocare
  l'azione direttamente a bottone spento, ri-nascondere e verificare che la riga
  precedente **resti**, e infine leggere la pagina pubblica senza titolo.
  **Nessuno di questi passi e' stato eseguito.** Il codice della superficie e'
  letto e compilato, **mai eseguito**.
- **Perche' e' stato rimandato — tre misure, non tre opinioni:**
  1. **Zero destinatari.** `tickets` e `rsvps` sono vuoti, quindi su entrambe le
     serate segrete l'atto manderebbe **zero mail**. La parte che vale — la
     deduplicazione, i lotti, la marcatura per lotto, il parziale «N su M» —
     **resterebbe non provata anche dopo aver speso l'irreversibilita'.**
  2. **Il passo 9 e' impossibile.** La pagina pubblica chiama
     `public.venue_for_parties`, che in produzione **non esiste**: risponde
     `PGRST202` e la pagina lancia. Non e' un effetto del bottone, ed e' la
     stessa causa della voce 4.
  3. **L'atto non e' ripulibile.** La traccia e' append-only: quella serata
     direbbe «rivelato il … da …» per sempre, ed e' proprio la proprieta' che
     rende onesta D-37-22 — quindi non e' toccabile per convenienza.
- **La strada alternativa e' peggiore, e la ragione va letta prima di
  sceglierla:** creare una serata apposta e rimuoverla per chiave primaria
  catturata alla creazione **non pulisce**. Per la voce 3 di questo stesso file,
  `venue_reveal_acts` punta a `event_parties` con **`ON DELETE SET NULL`**:
  cancellata la serata, **le righe di traccia restano, orfane, con un nome per
  esteso dentro**, su un progetto **senza PITR**. Una rimozione che lascia in
  piedi cio' che doveva pulire non e' una rimozione. Chi ripassa di qui deve
  saperlo **prima** di scegliere, non dopo.
- **Nessuna autorizzazione a scrivere in produzione e' stata chiesta ne'
  concessa**, quindi non ce n'e' una da considerare consumata. Chi riprendera'
  questa voce **deve chiederne una nuova**, che descriva esattamente cio' che
  tocchera'.
- **Il momento in cui va fatta:** **dopo** il deploy di
  `20260810161000_venues_read_narrowed.sql` **e** dell'arretrato del ramo — che
  al 2026-08-11 e' **216 commit avanti a `origin/main`**, fermo al 2026-08-09.
  In quel momento, e non prima, la pagina pubblica funziona e la procedura si
  puo' fare **intera** invece che a meta'. Con dei destinatari veri sulla serata
  che si prova, anche l'invio viene finalmente esercitato — e a quel punto vale
  il gate di `venue-secrecy.md`: se ha destinatari veri, **l'atto e' una
  rivelazione vera**, e va concordato come tale.
- **Chi la dovrebbe prendere:** **37-13**, che chiude la fase — oppure il piano
  che accompagna quel deploy, se arriva prima. Finche' questa voce e' aperta,
  **VENUE-02 non si spunta**: il percorso esiste da capo a fondo e non e' mai
  stato percorso, e un verde su un requisito di rivelazione mai esercitato e' la
  categoria peggiore in cui averne uno.
- **Stato al 2026-08-11 (37-13):** **ancora aperta**, e onorata — `VENUE-02` non
  e' spuntato. 37-13 ha pero' esercitato lo scrittore **in container**, con
  entrambe le migration applicate: i sette rifiuti e il ciclo intero
  `revealed → completed → re_hidden` si comportano come scritto, e la traccia
  sopravvive al ri-nascondere. Resta non provato cio' che un container non puo'
  dire: l'invio, i lotti, la deduplicazione, e il comportamento sotto una
  sessione autenticata vera.

---

## 6. `npm run baseline:container` non e' piu' eseguibile

- **Trovata durante:** 37-13, montando l'harness per misurare la strada positiva
  di D-37-24.
- **Cosa:** `scripts/container/seed.mjs` **rifiuta di girare** con
  *«PROBE_PAYLOADS has no entry for: venue_reveal_acts. The seed cannot invent a
  row shape the write matrix does not declare — one declaration, two readers.»*
  La tabella e' quella creata dal piano 37-01; il seed non la conosce.
- **Il rifiuto e' corretto**, ed e' esattamente la guardia che quel file esiste
  per avere. La conseguenza pero' e' che **`npm run baseline:container` e
  `npm run baseline:compare` non producono piu' nulla** finche' la voce non
  viene aggiunta: il prossimo baseline RLS di container non e' catturabile.
- **Perche' non e' stata chiusa qui:** 37-13 dichiara `files_modified: []` ed e'
  un piano di verifica. Allargarne il diff all'harness dei baseline avrebbe reso
  piu' difficile verificare l'unica domanda che quel diff deve reggere. Le sonde
  di 37-13 sono state eseguite con `withContainer(..., { seed: false })` e
  fixture proprie.
- **Chi la dovrebbe prendere:** il prossimo piano che cattura un baseline RLS,
  oppure un piano di manutenzione. **Va fatta prima**, non quando servira'
  il baseline: e' il momento in cui costa una voce in una tabella invece di un
  blocco.

---

## 7. `NEXT_PUBLIC_APP_URL` in `.env.local` non nomina il sito, e un controllo di piano ci si e' appoggiato

- **Trovata durante:** 37-13, Task 2, guardando i byte prima dei risultati.
- **Cosa:** in `.env.local` la variabile vale **`http://localhost:3000`**, e su
  quella porta, su questa macchina, ascolta **un container Docker estraneo al
  progetto**. Il blocco `<verify>` del Task 2 di `37-13-PLAN.md` e'
  `curl … "$NEXT_PUBLIC_APP_URL/events"`, quindi **misura quel container**.
- **Cosa e' successo davvero:** la prima tornata di letture ha restituito
  `HTTP 404` e **zero occorrenze per tutti e 18 gli aghi**, su sei documenti. Un
  verde perfetto, prodotto da un servizio che non e' il nostro. E' stato
  scoperto perche' i sei documenti pesavano **tutti esattamente 64 622 byte**,
  che non e' una cosa che sei pagine diverse fanno.
- **Il sito vero e' `https://www.resonatemotion.com`**; il dominio nudo risponde
  `307` verso `www`. Le letture sono state rifatte la', e **nessun risultato
  della prima tornata e' finito in `37-13-SUMMARY.md`**.
- **Perche' conta oltre questo piano:** e' la forma piu' pura del difetto che la
  fase 36 ha pagato — *una misura presa con lo strumento sbagliato non e' una
  misura debole, e' un'eco*. Ogni futuro `<verify>` che si appoggia a
  `$NEXT_PUBLIC_APP_URL` per parlare della **produzione** e' un controllo che
  puo' rispondere verde senza aver guardato niente.
- **Chi la dovrebbe prendere:** chi scrive il prossimo piano con una sonda HTTP.
  Due strade, entrambe economiche: nominare il dominio per esteso nel piano,
  oppure introdurre una variabile distinta per l'indirizzo **pubblico** e
  lasciare `NEXT_PUBLIC_APP_URL` al suo uso locale.
