# Phase 37: Manual Venue Reveal - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

La fase costruisce **un percorso manuale per far uscire l'indirizzo di una
serata segreta**, accanto alla rivelazione programmata che resta il percorso
normale. Il percorso manuale e' dietro una conferma esplicita che nomina cosa
sta per diventare pubblico, lascia una traccia leggibile di chi e quando, e non
rende l'interruttore piu' facile da far scattare.

Nello stesso perimetro rientra **il modello di visibilita' a tre livelli**
(D-37-02), che il proprietario ha riscritto durante la discussione: e' la sola
modifica di questa fase che **allarga** chi vede un indirizzo, e per questo e'
la parte che va pianificata per prima e verificata a mano.

E rientra **chiudere la lettura anonima degli indirizzi**:
oggi la rivelazione decide quando parte la mail, non quando l'indirizzo diventa
raggiungibile — quello e' gia' avvenuto alla creazione della riga. Una fase che
aggiungesse un rubinetto senza chiudere la perdita risolverebbe il problema
sbagliato.

**Fuori perimetro:** la finestra automatica e i suoi parametri per serata
restano come sono; nessun cambio al testo o al layout della mail di
rivelazione; nessuna nuova superficie pubblica.

</domain>

<decisions>
## Implementation Decisions

### Cosa fa la rivelazione manuale

- **D-37-01 — Un solo atto, non tre.** «Rivela adesso» fa **entrambe** le cose
  che fa il cron: manda la mail con l'indirizzo ai titolari e apre l'indirizzo
  in pagina a chi ha titolo. Non esistono un bottone-solo-mail e un
  bottone-solo-pagina: due interruttori irreversibili producono stati che
  nessuno si aspetta, e non si tornano indietro per definizione.

### I tre livelli di visibilita' — il modello, riscritto dal proprietario

*(Sostituisce la prima versione di D-37-02/03/04/05, che diceva «solo chi ha
biglietto o RSVP». Il proprietario l'ha rovesciata in tre passaggi successivi il
2026-08-10; qui sta la versione finale, e la ragione del cambio e' registrata
nel DISCUSSION-LOG.)*

- **D-37-02 — Tre livelli, un criterio ciascuno.**

  | Chi | Cosa vede | Da quando |
  |---|---|---|
  | Chi ha **un biglietto o un RSVP** | l'indirizzo | **subito, alla conferma** |
  | Membro approvato senza nessuno dei due | l'indizio, poi l'indirizzo | **all'apertura della finestra** |
  | Esterno, senza login o non approvato | solo l'indizio | mai |

  Il primo livello e' **gia' il comportamento di oggi per il biglietto**
  (`venue_reveal_on_purchase`, default `true`, letto da `isVenueVisible:103`).
  Il terzo pure. Due cose sono nuove:
  1. **Il livello 2 e' un allargamento** — oggi un approvato senza biglietto non
     vede l'indirizzo mai, prima della serata.
  2. **L'RSVP entra nel livello 1**, e oggi non c'e': `isVenueVisible` **non ha
     alcun ingresso per l'RSVP** — `party.userRsvp` e' recuperato e mai passato
     (sito di chiamata, `page.tsx:682-696`) — mentre il cron gli manda
     l'indirizzo come a un titolare
     (`api/cron/venue-reveal/route.ts:63-68`). Il ramo del livello 1 diventa
     «ha un biglietto **oppure** un RSVP». *(Decisione del proprietario,
     2026-08-10: l'RSVP conta come biglietto. Chiude D-37-10.)*

- **D-37-03 — Un gate di casa va riscritto nello stesso commit.**
  `venue-secrecy.md`, gate *autorizzazione per destinatario*, dice: «la
  rivelazione e' per-biglietto e per-RSVP, mai per-evento; un percorso che
  rivela a tutti quelli dell'evento salta il controllo su chi ha effettivamente
  titolo». **Il livello 2 e' per-evento.** E' una decisione del proprietario,
  presa dopo che il costo era stato messo per iscritto (piu' persone conoscono
  l'indirizzo di quante ne entrano: vicinato, capienza 150–300, spazi privati
  senza licenza di pubblico spettacolo — `legal-compliance.md`). Il gate va
  aggiornato, o restera' a segnalare come violazione il comportamento voluto, e
  qualcuno lo «riparera'» fra sei mesi.

- **D-37-04 — Il predicato della pagina e' un OR: finestra aperta OPPURE
  rivelato a mano.** Misurato: `isVenueVisible`
  (`src/app/(public)/events/[slug]/page.tsx:87-117`) **non legge mai**
  `event_parties.venue_reveal_email_sent` — decide con orario, biglietto e
  ruolo. Il ramo del livello 2 e' quindi nuovo, e ha due ingressi: l'istante
  della finestra (che scatta da solo) e il fatto della rivelazione manuale (che
  scatta quando qualcuno preme). Il secondo e' cio' che rende **osservabile** il
  bottone: premuto prima della finestra, la pagina apre.
  Vincolo: il ramo puo' solo **aggiungere** una concessione, mai modificare i
  rami esistenti.

- **D-37-05 — La mail e' una notifica, non la rivelazione.** *(Il perno del
  modello.)* Il cron gira una volta al giorno; la finestra si apre quando si
  apre. Le due cose **non coincidono** e non devono: la piattaforma rivela
  all'istante della finestra, la mail arriva alla prima corsa utile del cron.
  Esempio misurato — serata sabato 22:00, finestra 25 ore (il minimo di
  D-37-06): la pagina apre venerdi' 21:00, la mail parte sabato alle 08:00
  italiane (`vercel.json`, `0 6 * * *` UTC). **Undici ore di scarto, e sono
  corrette.**
  L'oggetto della mail resta `Venue Revealed` — decisione del proprietario,
  presa dopo che l'alternativa (riscriverla come promemoria) era stata proposta.

- **D-37-06 — La finestra non puo' essere piu' stretta dell'intervallo del
  cron.** Vincolo da far rispettare, non da raccomandare: `venue_reveal_hours`
  e' impostabile per serata, e con un valore piu' stretto dell'intervallo **la
  mail parte dopo la serata**. Esempio: serata sabato 22:00 con finestra 6 ore
  → la finestra apre sabato alle 16, la corsa delle 08:00 e' gia' passata → la
  mail arriva domenica mattina. Chi fa login vede; chi aspetta la mail resta a
  casa.
  **Il numero, ora che il piano e' noto: minimo 25 ore.** Non 24. Il piano e'
  **Hobby** (D-37-07), quindi il cron gira una volta al giorno **con una
  precisione di ±59 minuti**: due corse consecutive possono distare fino a
  **24h59m**. Una finestra di 24 ore non garantisce quindi di contenere una
  corsa — c'e' un caso di bordo reale in cui la corsa del giorno cade appena
  **prima** che la finestra si apra, e la successiva cade **dopo l'inizio della
  serata**. Il default attuale e' **24**: e' **sotto il minimo sicuro**, e va
  alzato o il vincolo va imposto a 25.
  *(Che il livello 2 riveli alla finestra degrada il danno — chi fa login vede
  comunque — ma non lo elimina: chi aspetta la mail resta senza. Vedi
  `time-and-scheduling.md`, gate «la finestra di un cron copre il proprio
  intervallo».)*

- **D-37-07 — Il piano e' Hobby, e il cron non si puo' infittire.**
  *(Confermato dal proprietario il 2026-08-10.)* Documentazione Vercel
  verificata alla fonte lo stesso giorno (pagina aggiornata 2026-07-15):

  | Piano | Cron per progetto | Intervallo minimo | Precisione |
  |---|---|---|---|
  | **Hobby** ← questo progetto | 100 | **una volta al giorno** | **±59 min** |
  | Pro / Enterprise | 100 | una volta al minuto | al minuto |

  Un'espressione piu' frequente **fallisce al deploy**, non a runtime: non e'
  una cosa che si scopre in produzione, ma non e' nemmeno una cosa che si prova
  in locale. **Non scrivere espressioni sotto il giorno.**

  **Conseguenza di prodotto, non tecnica:** su Hobby il bottone manuale **non e'
  un'eccezione, e' il percorso affidabile**. Il cron puo' arrivare fino a un
  giorno dopo l'apertura della finestra, e nessuno se ne accorge — non esiste
  error tracking. Chi pianifica deve trattare il percorso manuale come primario
  nel disegno della superficie, non come un bottone di servizio nascosto in
  fondo alla pagina.

- **D-37-08 — Chi acquista dopo la rivelazione lo vede in pagina, senza mail.**
  Nessun invio all'acquisto viene costruito in questa fase. La colonna
  `venue_reveal_on_purchase` **non e' morta** — governa il livello 1 di D-37-02
  — ma non ha mai governato un invio: non e' una funzione da riattivare.

- **D-37-09 — La cache diventa il rischio principale, e non lo era.** Il
  predicato della pagina ora ha una **componente temporale che scatta da sola a
  un istante preciso**; prima era quasi statico. Una pagina messa in cache — da
  Next o dal service worker (`src/app/sw.ts`) — **attraversa quell'istante**:
  servita stale prima mostra l'indizio a chi avrebbe titolo all'indirizzo
  (fastidio); servita stale dopo, a un lettore diverso, mostra **l'indirizzo a
  chi non deve** (fuga). Il gate esiste gia' (`venue-secrecy.md`, *cache e
  pre-render*; `nextjs-architecture.md`, *gate service worker*): il modello
  nuovo lo rende molto piu' facile da violare. **Requisito di verifica di fase**,
  non solo di implementazione.

- **D-37-10 — L'RSVP conta come un biglietto: vede subito.** *(Decisione del
  proprietario, 2026-08-10 — chiusa.)* Su una serata a RSVP **nessuno ha un
  biglietto**: con la lettura opposta non avrebbe visto subito nessuno, nemmeno
  chi ha dichiarato che viene, mentre il cron gli manda comunque l'indirizzo
  come a un titolare. La decisione **elimina un'asimmetria invece di aggiungerne
  una**: dopo, pagina e mail parlano dello stesso insieme di persone.
  Conseguenza sul codice: `isVenueVisible` acquisisce un ingresso per l'RSVP che
  oggi non ha, e il ramo del livello 1 diventa «biglietto **oppure** RSVP».
  **Non e' un extra: e' il difetto preesistente che questa decisione rende
  obbligatorio chiudere.**

- **D-37-11 — Nessun limite di anticipo.** Il freno e' la conferma, non un
  orario. Un tetto tecnico verrebbe aggirato spostando la finestra automatica —
  la stessa cosa con un passaggio in piu' e nessuna traccia.

- **D-37-12 — Invio parziale: il numero, e il bottone che resta.** Su un lotto
  caduto a meta' chi ha premuto legge **quanti su quanti**. La serata resta
  segnata come rivelata (l'indirizzo e' uscito e non rientra), e il bottone
  resta raggiungibile per i mancanti. Oggi il cron su questo fallimento fa
  `console.error` e prosegue marcando comunque
  (`api/cron/venue-reveal/route.ts:150-152, 174-177`): non replicare quel
  pattern — non esiste error tracking, e la console non e' un posto dove
  qualcuno guarda.

### Chi puo' rivelare

- **D-37-13 — Master e ogni organizer approvato.** Non solo chi ha creato la
  serata: quella persona puo' essere irraggiungibile proprio il venerdi' per cui
  il bottone esiste.

- **D-37-14 — Serve lo stato approvato, e quindi una chiave nuova.** Nessuna
  delle dodici capability esistenti ha la forma giusta: `staff.manage` **ignora
  lo stato di proposito** (`private.role_capabilities`, `requires_approved =
  false`) perche' un organizer in attesa non va respinto davanti a una fila —
  ragione che qui non esiste. Serve una capability propria con
  `requires_approved = true`, sul modello di `catalogue.manage`. *(Forma esatta,
  nome della chiave e riga di `capability-routes.ts`: discrezione di chi
  pianifica — vedi sotto.)*

- **D-37-15 — L'assegnazione per-serata non basta.** `party.manage` governa il
  lavoro **della sera** — review, registro porta, guest list di quella notte. La
  rivelazione avviene prima e non si annulla: non entra in quel pacchetto.

### La conferma e la traccia

- **D-37-16 — La conferma nomina tre cose:** il posto, **quante persone**
  riceveranno l'indirizzo, e che non si torna indietro. Il numero e' la parte
  che fa fermare, perche' trasforma un'astrazione in gente. Nessuna digitazione
  di conferma: attrito sbagliato su un'azione che si fa di corsa produce il
  rinvio, non la prudenza.

- **D-37-17 — La traccia sta sulla serata**, nella superficie di lavoro, non in
  un registro separato: e' anche il posto dove il secondo tentativo trova la sua
  risposta (D-37-19), e le due cose si servono a vicenda.

- **D-37-18 — Nome e cognome, e chi gestisce la serata la legge.** La traccia
  nomina la persona per esteso: e' una superficie di staff, chi legge e' gia'
  dentro, e la responsabilita' e' il punto dell'atto. **Deliberatamente diversa
  da `membership_acts`**, che parla in `membership_code` e non nomina mai
  nessuno (`supabase/migrations/20260808002000_membership_register.sql:195-202`)
  — li' il soggetto e' una persona giudicata, qui e' una persona che ha agito.
  Nessuna chiave di lettura nuova: chi gia' vede quella serata al lavoro vede
  anche la traccia.

### Il secondo tentativo

- **D-37-19 — Bottone spento che dice quando e chi**, non bottone sparito. Il
  rifiuto e' **visibile invece che assente**: chi cerca il bottone trova anche
  la risposta. Un bottone premibile su un'azione irreversibile invita a premerlo
  per vedere cosa succede.

- **D-37-20 — Con destinatari mancanti il bottone cambia testo**, non stato:
  «manda ai N che mancano», stessa posizione, numero esplicito, e **non
  rimanda** a chi ha gia' ricevuto. Il conteggio e' per destinatario, come gia'
  fa il cron (`tickets.venue_reveal_sent`, `rsvps.venue_reveal_sent`).

- **D-37-21 — Il cron diventa la rete sotto il percorso manuale.** Passando su
  una serata gia' rivelata a mano, **completa cio' che manca** senza rimandare
  il resto. Oggi salta le serate marcate (`.eq("venue_reveal_email_sent",
  false)`): se il manuale ha lasciato indietro dodici persone, quelle restano
  senza indirizzo e nessuno se ne accorge. **Cambio di comportamento del cron —
  e' dentro il perimetro, ed e' Critical.**

- **D-37-22 — Ri-nascondere e' possibile, solo per il master, e non produce
  l'illusione.** *(Decisione del proprietario, presa dopo che l'alternativa piu'
  stretta era stata presentata come raccomandata.)* Il vincolo che la rende
  onesta: **la traccia e' append-only e non si cancella**, e la serata continua
  a dire «rivelato il … da …» anche dopo essere tornata segreta. Senza questo,
  avremmo una pagina che dice una cosa e delle mail partite che ne dicono
  un'altra. Oggi la casella si spunta e si despunta liberamente nel form
  (`src/app/(admin)/admin/events/actions.ts:409-411`), senza traccia alcuna.

### La lettura anonima degli indirizzi

- **D-37-23 — `/venues` esce dal pubblico.** *(Decisione del proprietario.)* La
  pagina delle sedi e' una **superficie di produzione**: la vedono master,
  organizer e staff. `src/app/(public)/venues/[slug]/page.tsx` non resta dove
  sta.

- **D-37-24 — Sulla pagina pubblica di un evento, nome e indirizzo del locale
  restano visibili per le serate NON segrete**, anche senza login. E' il
  comportamento di oggi ed e' coerente con le locandine, che il locale lo
  nominano per esteso in tipografia (`brand-visual-system.md`, gate *nome e
  luogo di una venue*). Si chiude **la pagina delle sedi e le serate segrete**,
  non il nome di un bar pubblico.

- **D-37-25 — Il guasto da evitare ha una forma nota.** Lista eventi
  (`src/app/(public)/events/page.tsx:212`) e dettaglio serata
  (`events/[slug]/page.tsx:223`) leggono il locale con un **embed annidato**
  `venues(...)`. Se la lettura si chiude senza costruire la strada per D-37-24,
  quell'embed per un lettore anonimo **non da' errore: restituisce vuoto**, e la
  serata perde il nome del locale in silenzio. E' la stessa specie di guasto che
  la fase 36 ha misurato sull'embed delle serie (`PGRST201`, `data: null`, la
  pagina che renderebbe «nessun evento»). **La verifica di questa fase deve
  guardare la pagina con la chiave anonima**, non solo il build.

### Claude's Discretion

Deciso da chi pianifica, senza tornare dal proprietario:

- La **forma** del predicato di D-37-04: colonna dedicata sulla serata, istante
  di rivelazione, o altro. Vincolo: solo-aggiunge, mai-modifica i rami
  esistenti.
- **Nome e riga** della capability di D-37-14, la sua riga in
  `src/lib/routes/capability-routes.ts` e la voce in `src/lib/capabilities/keys.ts`.
- **Dove vive la traccia** di D-37-17/18 — colonne sulla serata, tabella
  append-only propria, o riuso dello scrittore atomico esistente. Vincolo: chi
  scrive la riga e chi scrive la traccia stanno **in una transazione**, come
  `public.record_party_assignment_act`
  (`supabase/migrations/20260809002000_assignment_acts.sql`).
- La **forma del rimedio** alla lettura anonima (D-37-23/24): quali policy,
  quale chiave, quale strada per il nome pubblico. **Precondizione dichiarata
  dal todo:** misurare **prima** se lo stesso percorso esista anche via `events`
  o `event_media`, o si chiude una porta su un muro che ne ha due.
- Se le tre correzioni piegate (sotto) vanno in un piano proprio o dentro i
  piani della fase.

### Folded Todos

- **`.planning/todos/pending/secret-venue-address-readable-by-anon.md`** —
  *critico*, assegnato a questa fase dal proprietario il 2026-08-10. La policy
  `venues_select_public` e' `using (true)`
  (`supabase/migrations/20260226200000_venues.sql:25-27`); composta con
  `event_parties_select_published` restituisce nome, indirizzo e link Maps delle
  serate segrete **con la sola chiave anonima, senza sessione**. Misurato in
  produzione. Risolto da D-37-23/24/25.

- **`.planning/todos/pending/postgrest-details-leaks-the-row.md`** —
  *moderato*. Su una violazione di `CHECK`, PostgREST restituisce la riga
  intera. Entra qui perche' la guardia di D-37-19/22 rifiuta scritture su
  `event_parties`, e **quella riga porta l'indirizzo**: un rifiuto che restituisce
  cio' che stiamo proteggendo e' il difetto che si autoinfligge.

- **`.planning/todos/pending/login-client-redirect-not-allow-listed.md`** —
  *moderato*. `?next=` finisce in `window.location.href` senza allow-list.
  **Non tocca il venue**: viaggia con la fase per scelta del proprietario, non
  perche' sia la stessa materia. Da tenere separato nei piani e nei commit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Il perimetro e i requisiti
- `.planning/ROADMAP.md` — fase 37, i quattro criteri di successo
- `.planning/REQUIREMENTS.md:112-116` — VENUE-01, VENUE-02
- `.planning/STATE.md` — decisione del proprietario sulla fase 37; blocchi D7 e
  D12 aperti

### I gate di dominio, non negoziabili
- `.claude/rules/venue-secrecy.md` — gate *irreversibilita'*, *percorsi
  enumerati* (**da rienumerare leggendo il codice, la lista e' datata per
  costruzione**), *default chiuso*, *autorizzazione per destinatario*,
  *idempotenza del cron*, *cache e pre-render*
- `.claude/rules/meta-gates.md` — le tre guardie monotone; zero fallimenti
  silenziosi in assenza di error tracking; cosa significa «verificato» senza
  test runner
- `.claude/rules/time-and-scheduling.md` — la finestra del cron, e perche' due
  ore di scarto valgono un giorno intero su `venue-reveal`; gate *la finestra di
  un cron copre il proprio intervallo*, che e' la regola dietro D-37-06
- `vercel.json` — i 4 cron, tutti giornalieri; `venue-reveal` a `0 6 * * *` UTC
  = 08:00 italiane d'estate
- https://vercel.com/docs/cron-jobs/usage-and-pricing — limiti per piano,
  verificati alla fonte il 2026-08-10 (pagina aggiornata 2026-07-15). **Da
  ri-verificare, non da citare a memoria, se la fase cambia l'espressione cron.**
- `.claude/rules/ai-engineering.md` — i quattro gate scritti dopo l'incidente
  della fase 36: **rimozione per chiave primaria mai per interfaccia**, il
  contatore che non legge la superficie che ha mosso, l'istantanea che copre le
  cascate, l'autorizzazione a scrivere in produzione che si consuma una volta
- `.claude/rules/brand-visual-system.md` — gate `@ Secret Venue`, gate *nome e
  luogo di una venue*

### Il codice che questa fase tocca
- `src/app/api/cron/venue-reveal/route.ts` — il percorso automatico per intero;
  marcatura per destinatario alle righe 155-171, marcatura della serata a
  174-177, il `console.error` di 150-152
- `src/app/(public)/events/[slug]/page.tsx:87-117` — `isVenueVisible`, l'unica
  espressione che governa il venue; il sito di chiamata e' a 682-696
- `src/app/(public)/events/page.tsx:212` — l'embed `venues(...)` della lista
- `src/app/(public)/venues/[slug]/page.tsx` — la pagina che esce dal pubblico
- `src/app/(admin)/admin/events/actions.ts:408-426, 645-655` — dove
  `venue_secret` e i suoi parametri si scrivono oggi, senza traccia
- `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` — la superficie dove
  vive il bottone; il suo docblock dichiara di non toccare `venue_reveal_sent`
- `src/lib/routes/capability-routes.ts` — l'unica dichiarazione di
  raggiungibilita', letta da middleware, guardia di pagina e navigazione
- `src/lib/capabilities/keys.ts` — `CAP` e le descrizioni, specchio TypeScript
  delle righe nel database

### Lo schema
- `supabase/migrations/20260226200000_venues.sql:25-27` — `venues_select_public`,
  `using (true)`
- `supabase/migrations/20260305200000_venue_reveal_on_purchase.sql` — le tre
  colonne di rivelazione e il default `true` che decide il livello 1 di D-37-02
- `supabase/migrations/20260226500000_venue_secret_hint_reveal_hours.sql` —
  hint e finestra per serata
- `supabase/migrations/20260807000000_capability_model.sql:388-422` — le righe
  di `private.role_capabilities` e la colonna `requires_approved`
- `supabase/migrations/20260808002000_membership_register.sql:174-202` — il
  registro append-only e lo scrittore che non nomina mai una persona
- `supabase/migrations/20260809002000_assignment_acts.sql` — lo scrittore
  atomico riga+atto in una transazione, il modello per D-37-17

### I difetti piegati
- `.planning/todos/pending/secret-venue-address-readable-by-anon.md`
- `.planning/todos/pending/postgrest-details-leaks-the-row.md`
- `.planning/todos/pending/login-client-redirect-not-allow-listed.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Lo scrittore atomico riga+atto** (`record_party_assignment_act`,
  `20260809002000_assignment_acts.sql`) — la forma esatta che serve a D-37-17:
  la scrittura e la sua traccia in un `BEGIN; … COMMIT;`, con il `SELECT … FOR
  UPDATE` che legge il soggetto com'e' adesso.
- **Il modello delle capability** — riga in `private.role_capabilities` +
  costante in `src/lib/capabilities/keys.ts` + riga in
  `capability-routes.ts`. Tre lettori sulla stessa dichiarazione, per
  costruzione, perche' non possano dissentire.
- **`getAccessContext()`** (`src/lib/capabilities/server.ts`) — risolto una
  volta per richiesta e `cache()`-scoped dal layout di `(work)`.
- **Il dialog di ritiro di un format**
  (`src/app/(admin)/admin/formats/RetireFormatDialog.tsx`) — precedente diretto
  di una conferma su un'azione quasi-irreversibile, e il suo docblock si
  confronta esplicitamente con `venue_reveal_sent`.
- **Il cron stesso** — la deduplicazione per email, i lotti da 100, la
  marcatura per destinatario: il percorso manuale ne condivide il cuore e non
  deve riscriverlo in una seconda copia che divergera'.

### Established Patterns

- **Il gruppo non autorizza, la mappa si'.** Un file sotto `(admin)` non e'
  protetto perche' sta li'. La riga in `capability-routes.ts` e' la cosa che
  decide, e `next build` rifiuta una superficie nuova senza la sua riga.
- **Una server action e' un endpoint pubblico con una firma comoda.** La action
  di rivelazione ri-chiede la capability al proprio interno: essere importata da
  una pagina protetta non la protegge.
- **La categoria di un rifiuto viaggia come valore di ritorno, mai come
  messaggio lanciato** (D-36-10): Next redige i messaggi delle Server Action in
  produzione. Il `catch` ramifica sulla **forma** del fallimento, non sul testo.
- **Il default chiuso e' il default di questo dominio soltanto.** Se lo stato di
  rivelazione non e' determinabile, il venue non si mostra. E' l'opposto della
  porta, dove il default e' ammettere.

### Integration Points

- `isVenueVisible` — l'unico punto che decide l'indirizzo in pagina; ci
  arrivano D-37-02, D-37-04 e D-37-10.
- Il cron `venue-reveal` — ci arriva D-37-21, che ne cambia il filtro.
- Il form della serata (`EventForm` + `admin/events/actions.ts`) — ci arriva
  D-37-22, la guardia sul ri-nascondere.
- Le policy di `public.venues` — ci arrivano D-37-23/24/25.

</code_context>

<specifics>
## Specific Ideas

- Il testo della conferma deve **contare le persone**, non descriverle: «stai
  per mandare l'indirizzo di *<posto>* a **47** persone. Non si annulla.»
- Il bottone ha **tre stati e una sola posizione**: «rivela adesso» → «manda ai
  N che mancano» → spento, con data e nome di chi ha rivelato.
- La verifica di fase va fatta **con la chiave anonima contro le pagine vere**,
  come le V1–V5 della fase 36 — e con i quattro gate dell'incidente 36 davanti:
  righe create per la prova si rimuovono **per chiave primaria catturata alla
  creazione**, mai cliccando un controllo di cancellazione, e il conteggio di
  controllo si chiede a una fonte diversa da quella su cui si e' agito.

</specifics>

<deferred>
## Deferred Ideas

- **Invio della mail al momento dell'acquisto**, per chi compra dopo la
  rivelazione (D-37-08). Non e' una funzione da riattivare: non e' mai esistita.
  Se un giorno servira', e' una fase sua.
- **Registro cronologico di tutte le rivelazioni manuali** — scartato a favore
  della traccia sulla serata (D-37-17). Una seconda superficie sarebbe comunque
  un elenco di indirizzi con una data accanto, da proteggere di suo.
- **Uno scheduler diverso da Vercel Cron**, se un giorno servisse una finestra
  piu' stretta di 25 ore. Su Hobby il limite e' del piano, non del codice: le
  strade sono `pg_cron` su Supabase (gia' nello stack) o un pinger esterno, e
  ognuna sposta un percorso di rivelazione fuori da Vercel — quindi e' una
  decisione di architettura, non un'impostazione. **Fuori dalla fase 37.**

### Reviewed Todos (not folded)

- `.planning/todos/pending/profiles-email-not-unique.md` — *moderato*. Nessun
  legame con la rivelazione.
- `.planning/todos/pending/unchecked-count-reads-decide-money-paths.md` —
  *alto*. Un conteggio letto senza controllarne l'errore decide due percorsi che
  muovono denaro. **Merita una fase, non una coda**: e' materia di
  `ticketing-payments.md` e questa fase non tocca denaro.

</deferred>

---

*Phase: 37-manual-venue-reveal*
*Context gathered: 2026-08-10*
