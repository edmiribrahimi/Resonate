# Phase 36: Formats & Series Numbering - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Ogni serata porta il suo **format** e il suo **numero di serie memorizzato**; la
sigla si **compone** dai due invece di essere calcolata da un conteggio; e un
visitatore puo' restringere la superficie eventi a un format, con la scelta
nell'indirizzo — senza che nessun conteggio, etichetta o codice riveli una
serata non annunciata o un venue segreto.

**Dentro:** FMT-01 … FMT-06. Il catalogo dei format e delle serie, la colonna
del format sulla serata, il numero memorizzato, il vincolo di unicita', il
filtro pubblico, la superficie di gestione del catalogo.

**Fuori:** l'identita' **sonora** dei format (non e' scritta e non si inventa —
`sound-manifesto.md`); i token di colore e la tipografia (fase 40, DS-01…DS-10);
il percorso manuale di rivelazione del venue (fase 37); qualunque allargamento
di chi vede cosa.

## Il punto di partenza — misurato il 2026-08-10, non citato

- **Il concetto di format non esiste nel codice.**
  `grep -rniE "ramadub|sunset|motionlab|RMDB|SNST|MTNLB|RSNT" src supabase`
  restituisce **tre righe, tutte commenti**
  (`src/app/api/membership/verify/route.ts:397`,
  `supabase/migrations/20260809003000_party_credits.sql:78-79`). Nessuna
  colonna, nessun tipo, nessuna costante. Questa fase lo introduce da zero.

- **La serata e' gia' `event_parties`, e la struttura che FMT-01 chiede esiste
  gia'.** `20260226300000_multi_sub_events.sql:11-20` ha eliminato
  `UNIQUE (event_id, type)`, il `CHECK` su `type` e la colonna `type` stessa, e
  ha dato a ogni serata la sua `date`. Con
  `20260226400000_party_lineup_venue_secret.sql:3-5` ogni serata porta anche la
  propria `lineup` e il proprio `venue_secret`. **Un evento puo' gia' tenere due
  serate distinte: manca solo la colonna del format.**

- **Il prodotto lo dice gia' a parole.**
  `src/app/api/membership/verify/route.ts:397`: *«A double bill is one event
  with two parties — the sunset act and the …»*.

- **La lista pubblica aggrega per evento, non per serata.**
  `src/app/(public)/events/page.tsx:60-62` seleziona `events` con
  `event_parties(...)` innestate; `transformEvent` (`:70-121`) le collassa in
  **una `EventCard` per evento** — date min/max, venue deduplicate, lineup
  unita. Il format vive sull'asse che la card oggi appiattisce.

- **Il cancello pubblico sta sull'evento, non sulla serata.**
  `event_parties_select_published` (`20260225150000_party_architecture.sql:31-37`)
  ammette una serata **solo se l'evento genitore e' `is_published`**. La
  migration `20260807010000_policies_to_capabilities.sql` ha riscritto quattro
  policy di quella tabella e **non ha toccato questa**;
  `20260809003000_party_credits.sql:201` la nomina esplicitamente come *«the
  gate»*. E' la rete di sicurezza sotto tutto il filtro pubblico, e va nominata
  nel piano invece che riscoperta.

- **La scelta upcoming/past non e' nell'indirizzo.**
  `src/app/(public)/events/EventTabs.tsx:3` importa `useState`; lo stato del tab
  vive nel client. FMT-04 — *sopravvive alla navigazione, si condivide come
  link* — e' un cambio di meccanismo, non una prop in piu'.

- **`canSeeDrafts = capabilities.has(CAP.STAFF_MANAGE)`**
  (`src/app/(public)/events/page.tsx:58`) filtra `is_published` sull'evento
  (`:64-66`). Il commento a `:42-57` avverte, con la misura, che quella pagina
  **non e' una sonda valida** di capability: risponde *«nessuna differenza»*
  perche' non puo' vederne una. Vale anche qui: **una verifica del filtro fatta
  su `/events` non prova nulla sul cancello.**

- **Il repository ha gia' un precedente esatto su cosa NON enumerare.**
  `20260809003000_party_credits.sql:77-81` ha rifiutato deliberatamente di
  enumerare *cosa suona* un format, citando `sound-manifesto.md`. Questa fase
  enumera i **format**, che sono un fatto di calendario — **non il loro suono,
  non i loro generi, non i loro BPM.**

- **Il dato di produzione e' quasi vuoto** — 2 eventi, 3 serate
  (`.planning/STATE.md`). E' il momento in cui un backfill costa meno, ed e' una
  finestra che si chiude da sola.

</domain>

<decisions>
## Implementation Decisions

### L'asse del format, e la serata doppia

- **D-36-01: il format sta sulla serata, mai sull'evento.** FMT-01 alla lettera.
  `events.title` resta testo libero scritto da chi crea l'evento; l'evento **non**
  porta un format proprio ne' derivato. *Ragione:* due posti dove scrivere il
  format divergono, e il sistema visivo dice che **il format e' la fonte del
  nome**, non il contrario (`brand-visual-system.md`, gate *il nome sull'app e'
  il nome del format*). Decisione presa sotto discrezione delegata dal
  proprietario.

- **D-36-02: la lista pubblica resta una card per evento.** Non si spezza in una
  card per serata. Una serata doppia e' **un pezzo solo con due nomi** — che e'
  esattamente come viene comunicata (`SunSet x re:sonate`). La card mostra i
  format delle sue serate in ordine di `sort_order`. *Conseguenza per il piano:*
  `transformEvent` (`page.tsx:70-121`) aggrega gia'; aggiunge un asse, non
  cambia unita'.

- **D-36-03: il secondo tempo di una serata SunSet e' una notte re:sonate, con
  nome e numero propri.** Non e' *«l'after di SunSet»*. *Ragione, in ordine di
  peso:*
  1. **Sono due posti diversi.** SunSet cerca uno spazio esterno rivolto a ovest;
     la notte cerca uno spazio che regga fino alle sei (`venue-acquisition.md`).
     Due indirizzi significano **due rivelazioni, due orari di porta, due segreti
     separati** — e la struttura per tenerli separati esiste gia' (`venue_secret`
     per serata, `20260226400000:3-5`). Un solo nome per due posti farebbe di una
     rivelazione due, e una rivelazione non si annulla (`venue-secrecy.md`).
  2. **Il numero non si recupera.** I progressivi si aggiungono in coda, non si
     rinumerano, perche' quello dopo e' gia' su una locandina (guardia monotona,
     `meta-gates.md`). Assegnarlo oggi non costa; non assegnarlo e' definitivo.
  3. **La pipeline e' diversa.** Una notte re:sonate produce timetable a −1
     giorno e **un podcast per dj**, piu' l'after movie agganciato al listing
     dell'edizione seguente (`production-calendar.md`). Un after non produce
     nulla di suo: se il secondo tempo ha una line-up vera e non e' trattato come
     notte, quei podcast non entrano nel piano editoriale.
  4. **E' cio' che il calendario dice gia'**, e quando un documento di lavoro e
     il calendario divergono **vince il calendario**.

  *Cosa la ribalterebbe:* stesso posto del tramonto, stessa line-up che
  continua, nessun podcast proprio. Non e' il caso oggi.

- **D-36-04: il format e' obbligatorio su ogni serata.** Non si salva una serata
  senza dire che cos'e'. Le tre serate gia' in archivio si assegnano
  esplicitamente **dentro la migration**, non con uno script a parte e non
  "dopo". *Ragione:* il dato di produzione e' quasi vuoto adesso; dopo, il
  backfill diventa un'operazione con conseguenze.

### Serie e numerazione

- **D-36-05: il numero corre dentro una SERIE, e la serie e' una riga di
  catalogo che una persona crea, con nome e codice.** Non nasce da sola dalla
  coppia format+sede. *Ragione:* una serie creata per sbaglio — un locale scritto
  due volte in modo leggermente diverso — ripartirebbe da 1 senza che nessuno
  l'abbia deciso, e il codice della sigla (`BZ`, `MR`, `PRLN`) deve comunque
  uscire da una decisione umana. FMT-03 nomina tre assi — format, serie, numero
  — e questa decisione dice che il secondo **e' un'entita', non una stringa
  digitata sulla serata**.

- **D-36-06: il numero lo propone il prodotto e lo conferma una persona.** Il
  campo arriva compilato col successivo della serie, ed e' modificabile. Il
  numero **resta scritto e non viene mai ricalcolato da un conteggio** (FMT-02):
  cancellare o spostare una serata **non rinumera** le altre. *Ragione:* le
  locandine escono due giorni prima della serata e a volte il numero e' gia' su
  un materiale prima che la serata esista nell'app — un numero derivato da un
  conteggio contraddirebbe la carta.

- **D-36-07: per MotionLab il progressivo RIPARTE a ogni sede.** Coerente con
  RamaDub, che ha una numerazione per Booze e una per Muro. **Questa decisione
  chiude una domanda che `production-calendar.md` tiene esplicitamente aperta**
  (gate *progressivo per sede o per format, ancora aperto*): quel modulo va
  aggiornato quando la fase chiude, altrimenti ogni materiale MotionLab resta
  provvisorio per un gate che non lo e' piu'.

- **D-36-08: FMT-03 e' un vincolo del database, non un controllo applicativo.**
  Il rifiuto di due serate con la stessa terna (format, serie, numero) arriva
  dalla base dati. Il vincolo va **nominato**, cosi' che il rifiuto si presenti
  come `…_check`/`…_key` leggibile e non come un `23505` anonimo che qualcuno
  deve andare a cercare — e' la stessa disciplina di
  `20260809003000_party_credits.sql:73-75`.

### Il catalogo, il ritiro, e cosa legge un visitatore

- **D-36-09: un visitatore legge SOLO IL NOME.** «RamaDub x Booze». Il numero
  esiste, serve alla produzione e ai materiali, e **non compare sulle superfici
  pubbliche**. Il codice secco (`RMDB-BZ`) resta interno.
  *Conseguenza sulla sicurezza, che vale la pena scrivere:* il numero e' anche
  un canale — «la diciottesima» dice che ne esistono diciotto — e tenerlo fuori
  dal pubblico toglie quel canale prima che esista.

- **D-36-10: ritirare una sigla blocca le assegnazioni nuove; l'archivio resta
  com'era.** Le serate gia' fatte sotto una sigla ritirata **non vengono
  riscritte e non spariscono**: sono uscite con quel nome e le locandine
  esistono. *Nota per il ricercatore:* `production-calendar.md` dice che una
  sigla ritirata *non si cita, nemmeno per spiegare la storia* — quella regola
  governa i **materiali che si producono oggi**, non l'archivio di cio' che e'
  gia' uscito. La sigla del giovedi' ritirata il 2026-08-04 **non ha coda
  aperta**, quindi oggi nessuna serata in archivio la porta: la decisione non ha
  effetto retroattivo su nulla, e serve al prossimo ritiro.

- **D-36-11: il colore e' obbligatorio alla creazione di un format — e
  obbligatorio non vuol dire preso in prestito.** Fra le scelte possibili deve
  esserci un **neutro deliberato**, e il **gradiente arancio → rosa → viola →
  nero non e' selezionabile per nessun format che non sia SunSet**
  (`brand-visual-system.md`, gate *il colore non si eredita*; DS-03 della fase
  40). *Ragione:* obbligare a scegliere impedisce il vuoto; permettere di
  scegliere il tramonto altrui farebbe perdere a un format l'identita' prima di
  averla.

  **Risolta il 2026-08-10 leggendo il tracker di produzione** — vedi
  `36-VISUAL-SOURCE.md`. Il tracker separa due cose che a parole si chiamano
  entrambe *colore*: il **colore di identificazione** (il pallino su un chip, la
  sottolineatura di una scheda) e la **palette dei materiali** (come si vede una
  locandina). MotionLab **ha** il primo e **non ha** la seconda. Il colore che
  questa fase memorizza e' **il primo**, e per tutti e quattro i format **esiste
  gia'**: `SunSet #FFB25E` · `RamaDub #FF7A2F` · `MotionLab #FF5C93` ·
  `re:sonate #A874E8`. **Non c'e' niente da inventare: c'e' da adottare.** E' la
  distinzione di DS-02, e toglie la tensione col gate senza indebolirlo.

- **D-36-12: etichette e colori vengono dai dati, non dal codice** (FMT-05).
  Cambiare l'etichetta o il colore di un format **non richiede un deploy**.
  Nessuna costante di format compilata dentro un componente.

### Il filtro pubblico — la parte Critical

- **D-36-13: i chip del filtro nascono dal CATALOGO, non dai dati.** Sempre gli
  stessi chip, indipendentemente da quante serate esistono. *Ragione:* una lista
  costruita dai dati **cambia da sola**, e l'apparizione di un chip nuovo e' essa
  stessa un annuncio — fatto dal prodotto, nel momento sbagliato, senza che
  nessuno l'abbia deciso. Un chip dal catalogo dice *«questo format esiste»*, che
  e' gia' pubblico; non dice **quando**.

- **D-36-14: nessun conteggio, da nessuna parte, su nessuna superficie
  pubblica.** Niente «RamaDub (18)». *Ragione:* un conteggio e' la forma piu'
  comune in cui una serata non annunciata si rivela — basta che una query
  dimentichi di escludere le bozze e il numero lo dice **senza mostrare nulla**,
  cioe' in modo che nessuna ispezione visiva della pagina possa scoprire. E' il
  gate FMT-06 nella sua forma piu' concreta.

- **D-36-15: il filtro vive nell'indirizzo — `/events?format=<slug>`.**
  Sopravvive alla navigazione e si condivide come link (FMT-04). Nessuna rotta
  pubblica nuova. **La scelta upcoming/past si sposta nell'indirizzo insieme**,
  altrimenti restano due meccanismi di stato sulla stessa pagina e uno dei due
  perde il proprio valore alla prima navigazione.

- **D-36-16: chi vede le bozze vede LA STESSA IDENTICA riga di filtri.** Un solo
  percorso di costruzione dei chip, per chiunque. I **risultati** di uno staff
  includono le bozze — `canSeeDrafts` resta quello che e' — ma **i chip no**.
  *Ragione:* due percorsi diventano uno solo alla prima modifica distratta, e
  quello che sopravvive e' sempre quello piu' ricco. Un solo percorso e' anche
  l'unico che una persona puo' verificare in una sessione.

### Presa dopo la ricerca, il 2026-08-10

- **D-36-17: esistere in catalogo e mostrarsi nel filtro sono due gesti
  distinti.** Una riga di format porta un interruttore proprio: creare un format
  **non** ne fa comparire il chip su `/events`. *Ragione:* con la sola esistenza
  della riga come criterio, **l'annuncio di un format nuovo lo farebbe il
  prodotto** nel momento in cui qualcuno salva, non una persona quando decide —
  e un format creato per preparare una stagione comparirebbe nel filtro di
  chiunque prima che sia stato annunciato niente. E' la stessa separazione che
  gli eventi hanno gia' con `is_published`, applicata al catalogo.

  **Questa decisione non contraddice D-36-13** (i chip nascono dal catalogo, non
  dai dati): il catalogo resta la sorgente, e l'interruttore dice **quale parte
  del catalogo e' catalogo pubblico**. La lista continua a non dipendere da
  quante serate esistono, che era il punto di D-36-13.

  *Situazione concreta che questo gate impedisce:* un quinto format viene creato
  a settembre per una serie che parte a novembre; senza l'interruttore, il chip
  e' online da settembre e chiunque guardi `/events` sa che sta arrivando
  qualcosa. (proprietario, 2026-08-10)

- **D-36-18: il difetto del venue non entra in questa fase.** La ricerca ha
  trovato — e l'orchestratore ha **ri-misurato in produzione** — che l'indirizzo
  di una serata con `venue_secret = true` e' leggibile con la sola chiave
  anonima, perche' `venues_select_public` e' `using (true)`
  (`20260226200000_venues.sql:25-27`) e `event_parties.venue_id` e' leggibile per
  gli eventi pubblicati. E' registrato in
  `.planning/todos/pending/secret-venue-address-readable-by-anon.md` e
  **assegnato alla fase 37** dal proprietario.

  **Per questa fase vale una sola cosa, e va detta perche' e' l'errore che si
  farebbe naturalmente:** il ragionamento *«tanto le sedi sono gia' pubbliche,
  quindi il nome di una serie che contiene una sede puo' esserlo»* e' **falso**.
  Una porta gia' aperta non e' un argomento per aprirne una seconda. D-36-13, la
  regola di degrado dell'UI-SPEC e il divieto di `USING (true)` su `party_series`
  restano in piedi indipendentemente da quel difetto, e **non si rilassano
  citandolo**. (proprietario, 2026-08-10)

### Regola di esecuzione, decisa il 2026-08-10 all'onda 1

- **D-36-19: i sei `FMT-*` restano `Pending` in `REQUIREMENTS.md` fino alla
  verifica di fase.** Nessun piano li spunta, nemmeno quelli che li dichiarano
  nel proprio frontmatter. *Ragione:* undici piani su quattordici portano gli
  stessi ID, e il passo di chiusura standard spunterebbe a ogni piano che ne
  nomina uno. Un requisito spuntato al piano 2 di 14 fa affermare a
  `REQUIREMENTS.md` — che e' la fonte di tracciabilita' — qualcosa che nessun
  file del repository puo' ancora sostenere: al piano 2 non esiste una colonna,
  non esiste un vincolo, non esiste una riga di catalogo.

  Vale in modo particolare per **FMT-06**, la cui unica prova e' una procedura
  manuale (V3) che gira all'onda 8: spuntarlo prima significherebbe dichiarare
  provata l'assenza di un canale che nessuno ha ancora guardato.

  **Chi spunta: la verifica di fase, una volta, con l'evidenza accanto.**
  Sollevata dall'esecutore del piano 36-02 e decisa dall'orchestratore sotto
  discrezione tecnica delegata, per non ridiscuterla dodici volte.

### Claude's Discretion

- **La forma del catalogo** (una tabella dei format piu' una delle serie, oppure
  una sola con un auto-riferimento) e' scelta del piano, purche' regga D-36-05 e
  D-36-07.
- **Come il campo del numero arriva precompilato** — server action, valore di
  default calcolato al render, o altro — e' scelta del piano, purche' il valore
  **memorizzato** non sia mai ricalcolato (D-36-06).
- **Dove vive la superficie di gestione del catalogo** dentro `/admin` e con
  quale capability. Vincolo non negoziabile: **entra nella mappa rotta↔capability**
  (D-34-10/D-34-11), altrimenti per il gate di build quella rotta non esiste.
  `catalogue.manage` esiste gia' nel catalogo delle capability e `staff` non ce
  l'ha (D-02, fase 43).
- **Il nome pubblico composto** («RamaDub x Booze») — se derivato dalla coppia
  format+serie o scritto sulla serie — e' scelta del piano.

### Reviewed Todos (non ripiegati)

Nessuno dei tre todo aperti e' stato ripiegato in questa fase. Vedi
`<deferred>`.

</decisions>

<canonical_refs>
## Canonical References

**Gli agenti a valle DEVONO leggere questi file prima di pianificare o
implementare.**

### Il requisito e la fase

- `.planning/REQUIREMENTS.md:95-100` — FMT-01 … FMT-06, il testo esatto
- `.planning/ROADMAP.md` §*Phase 36: Formats & Series Numbering* — goal,
  dipendenza da Phase 34, cinque criteri di successo

### Lo schema che questa fase estende

- `supabase/migrations/20260225150000_party_architecture.sql:9-24` — `event_parties`
  come nasce; **`:31-37`** — `event_parties_select_published`, **il cancello
  pubblico**, tuttora vivo
- `supabase/migrations/20260226300000_multi_sub_events.sql:11-20` — la rimozione
  di `type` e l'aggiunta di `date`: perche' FMT-01 e' gia' strutturalmente
  possibile
- `supabase/migrations/20260226400000_party_lineup_venue_secret.sql:3-5` —
  `lineup` e `venue_secret` **per serata**
- `supabase/migrations/20260807010000_policies_to_capabilities.sql:220-246` — le
  quattro policy di `event_parties` riscritte a capability, e quella che **non**
  hanno toccato
- `supabase/migrations/20260809003000_party_credits.sql:73-81` — il precedente:
  vincolo **nominato**, e il rifiuto deliberato di enumerare l'identita' sonora
- `supabase/migrations/20260226200000_venues.sql` — `venues`, a cui le serie di
  RamaDub e MotionLab si appoggiano

### Il codice che questa fase modifica

- `src/app/(public)/events/page.tsx:42-66` — `canSeeDrafts`, il filtro
  `is_published`, e il commento che spiega perche' **questa pagina non e' una
  sonda valida**; `:60-62` la query; `:70-121` `transformEvent`
- `src/app/(public)/events/EventTabs.tsx` — lo stato del tab in `useState`, da
  spostare nell'indirizzo
- `src/app/(admin)/admin/(work)/events/new/page.tsx` e
  `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` — dove il format e il
  numero vengono scelti
- `src/app/(admin)/admin/events/actions.ts` — le server action degli eventi
- `src/types/database.ts` — **avvertenza registrata in `.planning/STATE.md`:
  nessuno dei quattro client Supabase e' parametrizzato con `Database`, quindi
  nessun nome di colonna in nessuna query e' controllato dal build.** Una colonna
  nuova non produce errori di tipo se scritta male.

### La sorgente visiva — DA LEGGERE PRIMA DI QUALUNQUE DECISIONE DI UI

- `.planning/phases/36-formats-series-numbering/36-VISUAL-SOURCE.md` — distillato
  del tracker di produzione (`re:sonate — Production`, sezione *Visual System* e
  il suo foglio di stile), letto il 2026-08-10. **Il tracker e' gia' un design
  system implementato, non un moodboard:** token di fondo, inchiostro e linea; la
  scala tramonto; **un colore di identificazione per format**; semantici tenuti
  separati dagli accenti di brand; due famiglie tipografiche per l'interfaccia
  (mono per i dati, sans per la prosa) con `tabular-nums` sui numeri; tema scuro
  per scelta dichiarata, **niente tema chiaro**; e **la riga di chip per format
  gia' costruita**, con lo stato in `aria-pressed` e il quadratino di colore.
  Il file porta anche cio' che **non** attraversa — le regole che valgono solo
  per le locandine — e il fatto che **l'artifact non entra nel repo**, perche'
  contiene sedi, date e line-up e questo repository e' pubblico.

### I gate di dominio che governano questa fase

- `.claude/rules/venue-secrecy.md` — FMT-06; la rivelazione e' monotona
- `.claude/rules/production-calendar.md` — i quattro format, le sigle, la
  rotazione, il gate *progressivo per sede o per format* che **D-36-07 chiude**,
  il gate *una sigla ritirata non si cita*, il gate *numerazione senza salti*
- `.claude/rules/brand-visual-system.md` — grafia `re:sonate` / `SunSet` /
  `RamaDub` / `MotionLab`; *il nome sull'app e' il nome del format*; *il colore
  non si eredita*; nomi e quartieri dei locali
- `.claude/rules/sound-manifesto.md` — **questa fase non tocca l'identita'
  sonora**: enumera i format, non cio' che suonano
- `.claude/rules/meta-gates.md` — guardie monotone; zero fallimenti silenziosi;
  cosa significa "verificato" in un repo senza test runner

### Le decisioni delle fasi precedenti che vincolano questa

- `.planning/phases/34-one-work-surface/34-CONTEXT.md` — D-34-01/02 (il prefisso
  non porta significato, la mappa si'), D-34-10/11 (una sola dichiarazione, il
  gate di build e' il sistema dei tipi)
- `.planning/phases/43-role-model-account-creation/43-CONTEXT.md` — D-02
  (`catalogue.manage` esiste; `staff` non lo ha)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`transformEvent`** (`src/app/(public)/events/page.tsx:70-121`) — aggrega gia'
  venue e lineup dalle serate all'evento, deduplicando. I format seguono la
  stessa strada: raccolti dalle serate, ordinati per `sort_order`, mostrati sulla
  card. Nessuna struttura nuova.
- **`event_parties.sort_order`** (`20260225150000:20`) — l'ordine in cui le
  serate si mostrano esiste gia'. Nel caso doppio dice quale nome viene prima.
- **`venues`** (`20260226200000_venues.sql`) — le serie per locale si appoggiano
  a righe reali, non a testo ripetuto.
- **Il pattern del vincolo nominato** (`20260809003000_party_credits.sql:73-75`)
  — da riusare per FMT-03.
- **La mappa rotta↔capability della fase 34** — la superficie di gestione del
  catalogo entra li'; il gate di build e' il sistema dei tipi, non uno script.

### Established Patterns

- **La RLS e' il confine, il resto e' UX.** `event_parties_select_published`
  (`20260225150000:31-37`) rifiuta al pubblico le serate di un evento non
  pubblicato **qualunque cosa decida il codice sopra**. Il filtro per format non
  puo' aprire cio' che quella policy chiude — e il piano deve dirlo, non
  sperarlo.
- **Il commento che porta la misura.** Le migration recenti di questo repo
  spiegano *perche'* accanto a *cosa*, con `file:riga`. Le nuove seguono quello
  stile.
- **Nessun test runner per il prodotto.** La verifica e' `npm run build` (che e'
  anche il typecheck), `npm run verify:capabilities`, il baseline del container
  (`baseline:rls`, `baseline:container`, `baseline:compare`) e **procedure
  manuali scritte**. Nulla in questa fase puo' dirsi verificato perche' i test
  passano.

### Integration Points

- **`src/app/(public)/events/page.tsx`** — query, aggregazione, e il nuovo
  parametro d'indirizzo
- **`src/app/(public)/events/EventTabs.tsx`** — da stato client a stato
  d'indirizzo
- **`src/app/(public)/events/[slug]/page.tsx`** — il nome del format per serata
  sulla pagina di dettaglio
- **Le superfici di creazione/modifica evento sotto `/admin/(work)/events`** —
  scelta del format, proposta del numero
- **Una superficie nuova per il catalogo** dentro `/admin`, che entra nella mappa
- **`supabase/migrations/`** — il confine di sicurezza vero

</code_context>

<specifics>
## Specific Ideas

- **Il proprietario ha chiesto di non parlare tecnico, e aveva ragione.** La
  prima formulazione delle domande usava il vocabolario dello schema e ha reso
  una domanda incomprensibile. Le decisioni qui sopra sono state prese in termini
  di **serate, card, nomi e numeri**; il vocabolario dello schema e' stato
  aggiunto dopo, da questa parte. Chi porta una domanda al proprietario in fase
  di pianificazione faccia lo stesso.

- **Il proprietario ha inizialmente descritto il secondo tempo come «after
  party».** Non era una decisione: era il linguaggio corrente. Portare la
  divergenza col calendario **prima** di scrivere lo schema ha prodotto D-36-03,
  che assegna alla notte il suo numero. Se la divergenza fosse passata, il numero
  sarebbe stato irrecuperabile — e' esattamente il tipo di errore che i moduli di
  produzione esistono per intercettare.

- **`/events` non e' una sonda valida, e questa volta neanche per il filtro.** Il
  commento a `page.tsx:42-57` lo ha gia' registrato per le capability: la pagina
  risponde *«nessuna differenza»* perche' non puo' vederne una. Il filtro per
  format eredita il problema: **un filtro che non mostra una bozza non prova che
  non potrebbe mostrarla.** La prova richiede una serata non pubblicata seminata
  di proposito, un filtro su quel format, e l'osservazione che **nessuna** delle
  superfici — chip, risultati, indirizzo condiviso — ne riporta traccia. Va
  scritta come procedura manuale, perche' e' l'unica prova che esistera'.

- **Il debito di verifica a monte e' aperto:** 32 voci `human_needed` fra
  `43-VERIFICATION.md` (14), `35-VERIFICATION.md` (9) e `34-VERIFICATION.md` (9),
  tutte della stessa specie — nessuno strumento di questo repo puo' autenticarsi
  come un ruolo. Questa fase **non le consuma e non le peggiora**, e costruisce
  superfici pubbliche sopra un modello dei permessi che nessuno ha ancora visto
  rifiutare qualcuno. Restano dovute prima della chiusura della milestone.

- **`.planning/STATE.md` era disallineato** al momento di questa discussione:
  dichiarava la fase 34 in esecuzione al piano 1 di 17 mentre il disco ne
  registrava 17 su 17. Va riallineato.

</specifics>

<deferred>
## Deferred Ideas

- **Il colore dei format come token** — DS-02 e DS-03 (fase 40) governano dove un
  colore di format puo' apparire e che il gradiente tramonto e' esclusivo di
  SunSet. Qui il colore e' **un dato del catalogo**; diventare **un token** e'
  lavoro della fase 40. D-36-11 tiene la porta chiusa nel frattempo.

- **L'identita' sonora dei format** — non e' scritta per RamaDub, MotionLab e
  Resonate, e questa fase **non la scrive**. Nessuna colonna di genere, nessun
  BPM, nessuna etichetta che suoni come una promessa (`sound-manifesto.md`, e il
  precedente gia' registrato a `20260809003000:77-81`).

- **Aggiornare `production-calendar.md`** — D-36-07 chiude il gate *progressivo
  per sede o per format*. L'aggiornamento del modulo e' lavoro di
  `ai-engineering.md` (versione + changelog + `npm run verify:persona`) e va
  fatto quando la fase chiude, non prima: finche' la fase non e' spedita, la
  decisione e' presa ma non implementata.

- **Un percorso di filtro sull'archivio passato** (per anno, per locale) — non e'
  in FMT-04, che chiede il filtro per format. Nuova capacita', altra fase.

### Reviewed Todos (not folded)

- **`postgrest-details-leaks-the-row.md`** — su violazione di `CHECK` PostgREST
  restituisce la riga intera, `membership_code` compreso. **Rilevante di
  striscio:** D-36-08 aggiunge un vincolo che *puo' essere violato da un
  operatore* — un numero gia' usato — e il messaggio di quel rifiuto deve
  arrivare come *«questo numero e' gia' assegnato»*, **non** come l'oggetto
  errore grezzo di PostgREST. Il piano lo tratti come requisito del proprio
  percorso d'errore; il todo generale — l'igiene su ~20 siti che fanno
  `console.error(err)` — resta aperto e non appartiene a questa fase.
- **`profiles-email-not-unique.md`** — schema, e serve una misura in produzione
  prima di scegliere il rimedio. Nulla a che vedere con i format.
- **`login-client-redirect-not-allow-listed.md`** — `?next=` finisce in
  `window.location.href` senza allow-list. E' `access-gating`, e questa fase
  introduce un parametro d'indirizzo su una pagina pubblica (`?format=`) — che
  **non e' un redirect** e non condivide il difetto. Non ripiegato, ma il piano
  tratti `?format=` come input non fidato: valore ignoto **non** significa lista
  vuota o errore, significa nessun filtro.

</deferred>

---

*Phase: 36-formats-series-numbering*
*Context gathered: 2026-08-10 — quattro aree discusse, sedici decisioni, ognuna
registrata con la misura o il gate su cui poggia*
</content>
