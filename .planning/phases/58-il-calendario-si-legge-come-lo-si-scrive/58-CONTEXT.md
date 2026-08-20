---
phase: 58-il-calendario-e-uno-specchio
milestone: v1.6
created: 2026-08-20
rewritten: 2026-08-20
requirements: [ICS-01, ICS-02, ICS-03, ICS-04, ICS-05, ICS-06, ICS-07, ICS-08]
---

# Fase 58 — contesto

> **Questo documento e' stato riscritto lo stesso giorno in cui e' nato.** La
> prima stesura pianificava di riparare la riconciliazione. Una domanda del
> proprietario — *«a cosa servono tutte queste riconciliazioni?»* — ha cambiato la
> fase, e la versione precedente e' registrata sotto per non far ricominciare da
> capo chi si chiedera' perche' non si e' presa quella strada.

## La domanda, e la misura che le ha risposto

La riconciliazione difende cio' che sta nelle tabelle e **non** sta nel
calendario. Misurato il 2026-08-20:

| | quante ce n'erano |
|---|---|
| spunte di checklist | 14 voci, **0 spuntate** |
| piani legati a una serata pubblicata | 2 piani, **0 legati** |
| proposte della regola | **6** |

**Una sola delle tre esisteva.** Cancellare tutto e riscrivere dal file avrebbe
perso sei righe e nient'altro.

E nel difendere stati che non c'erano ancora, la riconciliazione **ha rotto
l'unica cosa che c'era**: 66 assenze false, poi 17 timbri che non si toglievano,
poi un'asimmetria fra tabelle che esisteva solo per gestire quei timbri.

## Il disegno

**Cio' che viene dal calendario e' uno specchio.** Si cancella e si riscrive dal
file, **per quel calendario**. Se una voce non c'e' piu' nel file, non c'e' piu'.

**Due sole eccezioni, e sono nominate**: le **spunte** e il **legame con una
serata pubblicata**. Sono le uniche cose che una persona ha messo li' e che il
calendario non sa. Si riagganciano.

**`ICS-03` e' il confine, ed e' l'unica riga che va difesa nel tempo.** Ogni stato
umano che nascera' dopo — una nota, un'assegnazione, un allegato — o entra in
quella lista con una decisione scritta, **oppure il primo import lo cancella senza
che nessuno se ne accorga**. Uno specchio e' semplice esattamente perche' e'
spietato, e questa e' la riga dove quella spietatezza si ferma.

## Cosa NON si semplifica, e perche'

**La lettura dei titoli resta**, ed e' l'unica parte che aggiunge invece di
togliere: **uno specchio che non capisce cosa sta specchiando riporta 31 voci su
104 come «non classificate»** — misurato sull'unione dei due calendari.

Due cose da leggere che oggi non si leggono:

1. **un nome dove va la sigla** — `Listing - re:sonate`, `Listing - RamaDub x
   Booze` — risolto dalla mappa degli alias che esiste gia';
2. **un pezzo senza numero** — quegli stessi titoli non ne portano uno. Il numero
   **non si abbandona: si trova**, dalla data del pezzo piu' la regola di pipeline
   della sua serie. Un listing sta al martedi' prima della sua serata.

Il punto 2 impone una **seconda passata**: il classificatore decide una voce alla
volta, e la notte a cui un listing appartiene e' un'altra voce dello stesso file.
Prima le notti, poi l'aggancio.

## La contropartita, dichiarata

**Uno specchio cancella le proposte a ogni giro** — sono date che la regola
calcola e il file non porta. Va bene, **a patto che sia detto**: chi le guarda
deve sapere che si ricalcolano, non che sono state decise una volta.

## La strada NON presa, e perche'

La prima stesura di questa fase riparava la riconciliazione: scope per calendario
sull'assenza, ripulitura dei timbri con lo strumento riparato, l'asimmetria fra
tabelle. **Era piu' codice per difendere zero spunte e zero legami.**

Se un giorno quelle tabelle porteranno molto stato umano, la riconciliazione
tornera' ad avere senso — e allora si riaprira' con **una misura davanti**, come
questa. Non prima.

## Lo stato di partenza, misurato il 2026-08-20

| | |
|---|---|
| impegni | 79, zero assenti |
| pezzi | 46, di cui **17 timbrati assenti** — che lo specchio rende irrilevanti |
| piani 2 · checklist 14 · proposte 6 · divergenze 0 |
| voci non classificate sull'unione | **31 su 104** |
| pezzi prodotti dal calendario del satellite | **0 su 28 voci** |

---

# Le decisioni del proprietario — 2026-08-20, dopo la ricerca

> Sei decisioni prese davanti alla misura, non prima. **Due allargano la fase**
> (D-58-04, D-58-05) e **tre modificano un requisito gia' scritto** (ICS-02,
> ICS-03, ICS-08). Il ROADMAP e' stato aggiornato di conseguenza.

<decisions>
## Implementation Decisions

### Il progressivo, quando la guardia del database smette di scattare

- **D-58-01 — l'import si ferma e lo dice.** Il trigger
  `production_plan_refuse_renumber` e' `BEFORE UPDATE OF number`, e uno specchio
  non fa mai `UPDATE`: la terza guardia monotona del progetto smetterebbe di
  esistere senza che nessuna riga di SQL lo dichiari. **Al suo posto:** prima di
  cancellare, lo specchio confronta i progressivi dell'istantanea con quelli in
  arrivo; se un `source_uid` gia' noto porta un numero diverso, **rifiuta**
  (uscita `2`) e **non scrive niente**, nominando la serata e i due numeri. Una
  rinumerazione voluta passa da un **argomento esplicito di riautorizzazione**,
  che **si registra nel referto**.
  **Costo accettato, dichiarato:** la protezione si sposta nell'applicazione,
  cioe' esattamente dove il commento della migration dice che *non sopravvive al
  chiamante distratto*. E' l'unico posto rimasto in cui puo' stare, e questa riga
  e' l'autorizzazione documentata che `meta-gates.md` pretende.

### La serata pubblicata che sparisce dal file

- **D-58-02 — una riga di piano con un legame non si cancella mai**, qualunque
  cosa dica il file. Lo specchio guadagna un'**eccezione di sopravvivenza**,
  **distinta** dalle due eccezioni di **stato** di `ICS-03` (le spunte e il
  legame si *riagganciano*; questa riga *non se ne va*). `ICS-03` e' stato
  riscritto per nominarla: non dichiararla la renderebbe la terza eccezione non
  dichiarata che `ICS-03` esiste per vietare. Il referto **conta** le righe
  sopravvissute a un'assenza.

### Le due parole di `ICS-08`, che sono due decisioni

- **D-58-03 — `Timetable` nudo e' un pezzo della notte**, agganciato per data.
  La sua regola di pipeline esiste gia' (`RSNT / timetable / self / on`: il
  giorno stesso della serata), quindi l'aggancio e' **esatto e senza
  ambiguita'**. Se in quel giorno non c'e' una serata classificata, l'esito e'
  **non classificata** — visibile, che e' meglio di oggi, dove diventa in
  silenzio *un giorno occupato da qualcun altro*.
- **D-58-04 — `Flyering` diventa il settimo tipo di pezzo.** Apre una lista che
  era chiusa per scelta, e il costo e' dichiarato: `PIECE_KINDS`,
  `PIECE_KIND_LABELS`, il `CHECK` di `production_piece`, il `CHECK` di
  `production_pipeline_rule` e `src/types/database.ts` cambiano **nello stesso
  commit** — e' il claim (a) di `vocabulary.ts`, non una raccomandazione.
  ⚠ **Resta aperto e il piano lo chiude:** il volantinaggio non ha una regola di
  ancora, e nessuno l'ha misurata. Il piano decide se ne nasce una o se il tipo
  esiste **senza** regola — e in quel caso `conforms_to_rule` per quel tipo non
  significa niente e va dichiarato, non lasciato a `false`.

### Da dove arriva il calendario

- **D-58-05 — la sorgente e' un link, e lo specchio gira da solo.** I calendari
  si pubblicano dal Mac del proprietario e l'import li legge dal loro indirizzo,
  invece che da un file esportato a mano. **E l'aggiornamento automatico entra in
  questa fase**, non in una successiva. Due nuovi requisiti: `ICS-09` (la
  sorgente) e `ICS-10` (l'aggiornamento e le sue guardie).
  **Cio' che il proprietario ha davanti, e che va riscritto qui perche' non si
  perda:**
  1. **Un link pubblicato e' leggibile da chiunque lo abbia.** Porta date non
     annunciate, sedi in trattativa e line-up. Vive **solo** in variabile
     d'ambiente sulla piattaforma di deploy: mai nel repo, mai in `.planning/`,
     mai in un referto, mai in un log. Ri-pubblicare invalida il vecchio
     indirizzo — quindi e' recuperabile, a differenza di un push su un repo
     pubblico — ma chi l'ha visto una volta se lo tiene.
  2. **A scrivere in produzione non e' piu' una persona.** E questo progetto
     **non ha error tracking**: nessun fallimento raggiunge un essere umano da
     solo. Un processo non presidiato che **cancella e riscrive** e' la forma
     peggiore in cui quel difetto puo' presentarsi. Da cui le due guardie di
     `ICS-10`, che non sono rifiniture: sono la ragione per cui il cron e'
     accettabile.
  3. **`P-58-C`, la procedura di ripristino, smette di essere teorica.** Un
     processo che muore fra la cancellazione e la riscrittura, di notte, senza
     nessuno che guardi. Va scritta **prima** del primo `--apply`.
- **D-58-06 — tre chiavi di calendario: `rsnt`, `rmdb`, `mtnlb`** — una per
  format, dalle sigle, che sono pubbliche. Il vocabolario e' **chiuso** con un
  `CHECK` e specchiato in TypeScript, come i sei tipi di pezzo. Il proprietario
  ha dichiarato che **aggiungere un format o cambiare l'assetto dei calendari
  richiedera' chiavi nuove**: ogni aggiunta e' una migration dichiarata, non un
  valore libero. **Nessuna chiave puo' contenere il nome di uno spazio.**

### Claude's Discretion — decisioni tecniche prese qui, non dal proprietario

- **Il trigger resta installato.** D-58-01 sposta la protezione
  nell'applicazione, ma il trigger continua a difendere **qualunque altro
  scrittore** che facesse un `UPDATE` del numero. Cio' che cambia e' il commento
  della sua migration, che oggi dichiara una protezione che l'import non
  attraversa piu': va **riscritto**, dicendo dove la protezione vive adesso.
  Lasciarlo com'e' sarebbe l'opzione (b) della ricerca — un gate che sembra
  presidiato e non lo e'.
- **Lo scopo si dichiara, non si deduce.** Opzione **A** della ricerca: la chiave
  del calendario arriva dalla **sorgente registrata**, mai dal contenuto del file
  (circolare: le sigle vengono dalla classificazione, che e' cio' che questa fase
  ripara) e mai dal nome del file (**porta una data**). Senza chiave,
  l'applicazione **rifiuta** — nessun default, perche' un default e' esattamente
  il passo che un giorno qualcuno salta.
- **Nessuna UI-SPEC formale per questa fase.** Le superfici toccate esistono gia'
  (`src/app/(admin)/admin/calendar/`), il sistema visivo e' quello del prodotto,
  e i cambiamenti sono una dichiarazione testuale (`ICS-06`) piu' l'esito e
  l'ora dell'ultimo specchio per chiave (`ICS-10`). Il contratto delle superfici
  vive gia' in `verify-calendar-surface.mjs`, ed e' li' che va esteso.
- **Le migration si verificano leggendo il catalogo vivo**, non con un verde di
  build: la CLI Supabase non e' installata, si applica dalla Management API, e i
  tipi TypeScript vengono da un file generato.


### La reversione di `D-44-26`, dichiarata come tale

- **D-58-07 — il calendario passa da un server, e questa riga rovescia
  `D-44-26`.** Il 2026-08-15 il proprietario aveva chiuso l'import come **script
  locale soltanto**, con questa ragione scritta: *«the `.ics` would otherwise
  transit a Vercel server, carrying spaces under negotiation and unannounced
  dates into logs, caches and runtime errors. That surface does not exist today,
  and criterion 2 of this phase exists to keep it from existing.»*
  Il 2026-08-20, con il conflitto davanti, il proprietario ha scelto
  **l'aggiornamento automatico sulla piattaforma**. La decisione precedente e'
  **superata**, non dimenticata, e la ragione per cui esisteva vale ancora: e'
  diventata una cosa **da difendere per costruzione** invece di una superficie
  che non esiste.

  **Cade meta' di `D-44-26`, non tutta.** Quella decisione vietava **due** cose:
  (1) un controllo di caricamento dentro il prodotto, (2) il transito del `.ics`
  da un server. **La (1) resta vietata** — nessun `input type="file"`, nessun
  bersaglio di trascinamento, nessuna Server Action che riceve un calendario:
  `44-UI-SPEC.md` §11.3 e il controllo **U2** di `verify-calendar-surface.mjs`
  restano validi e non si toccano. Cade solo la (2), e solo per il percorso del
  cron.

  **Le cinque difese che sostituiscono la superficie che non esisteva.** Sono
  requisiti, non buone intenzioni: il piano le aggancia a `ICS-10` e la fase non
  passa senza.
  1. **Il corpo del feed non si stampa mai** — non in un log, non in un messaggio
     d'errore, non nel referto, non in una eccezione non catturata. Escono
     **conteggi e categorie**, mai testo del calendario. I log di runtime della
     piattaforma sono conservati: questa non e' una precauzione, e' l'unica
     difesa che c'e'.
  2. **Nessuna persistenza.** Il payload vive in memoria per la durata
     dell'esecuzione: nessuna scrittura su disco, nessuna cache HTTP
     (`no-store`), nessun corpo trattenuto dopo la trasformazione.
  3. **Gli errori si riportano per categoria** — rete, autenticazione, feed
     malformato, feed sospetto — **senza riecheggiare il contenuto**. E' il gate
     *zero fallimenti silenziosi* preso dal verso difficile: distinguere le cause
     **senza** rivelare cio' che le ha prodotte.
  4. **Il link e' un segreto registrato**, con `registerSecret`/`redact` che il
     repo gia' usa (`scripts/rls-baseline.mjs:158-176`, gia' in uso
     nell'importatore) — e si registra **anche l'host**, non solo l'indirizzo
     intero, o un messaggio di rete lo stampa comunque.
  5. **La superficie non guadagna nessun controllo di caricamento.** Vedi sopra:
     e' la meta' di `D-44-26` che non cade.

  ⚠ **Il piano deve verificare le difese, non dichiararle.** Un controllo sul
  sorgente che nessuna `console`/`say`/risposta d'errore del percorso del cron
  interpoli il corpo del feed e' l'unico modo in cui la difesa 1 esiste davvero:
  scritta e basta, e' una promessa che il primo `catch` distratto rompe.

</decisions>

<open_questions>
## Le tre domande che il piano chiude — non il proprietario

1. **La finestra massima dell'aggancio (`ICS-05`).** Senza una finestra, un pezzo
   orfano si attacca alla prima serata a qualunque distanza. Il valore **si
   misura sul calendario vero**, non si sceglie. Finche' non e' misurato, **il
   rifiuto e' la risposta corretta**.
2. **Se scrivere il numero derivato su un pezzo agganciato (`ICS-05`).** La
   colonna e' nullabile; scrivere un progressivo derivato lo rende
   indistinguibile da uno letto dal file. Serve una colonna di provenienza, come
   `origin` gia' fa per la data? Da decidere **con la simmetria dichiarata**.
3. **La regola di ancora di `flyering` (`ICS-08` / D-58-04).** Vedi sopra.

</open_questions>

<deferred>
## Fuori perimetro, esplicitamente

- **Riaprire la riconciliazione.** Se un giorno quelle tabelle porteranno molto
  stato umano, tornera' ad avere senso — e si riaprira' **con una misura
  davanti**, come questa. Non prima.
- **Due voci di `48-FINDING-01` sono decadute** e non vanno pianificate: capire
  l'asimmetria dei timbri di assenza, e togliere i 17 timbri falsi. **Lo specchio
  cancella le righe che li portano.**

</deferred>

## L'ordine, che il ricercatore segnala e che vincola le onde

**La lettura dei titoli va prima dello specchio.** Uno specchio che oggi capisce
il 70% del file cancellerebbe e riscriverebbe il 70% del file.
