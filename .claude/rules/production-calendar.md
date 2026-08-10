# Production Calendar — Operational Gates

> **Nessun `paths:`, e non e' un limite tecnico: e' una decisione.**
>
> Il materiale di produzione — `docs/Music-*.ics`, `docs/calendario-produzione.html`,
> lo scouting in `.firecrawl/` e l'artifact `re:sonate — Production` — **non
> deve diventare pubblico**, e `github.com/edmiribrahimi/Resonate` **e' un repo
> pubblico**. Versionarlo per farlo caricare automaticamente significherebbe
> pubblicarlo, ed e' un'operazione **irreversibile**: un file spinto su un repo
> pubblico resta nei fork, nelle cache e nella history anche dopo la rimozione.
>
> Le date, le sedi candidate, i dj non ancora annunciati e le trattative aperte
> sono esattamente il tipo di informazione che il progetto tiene chiusa fino al
> momento che sceglie — la stessa logica di `venue-secrecy.md`, applicata al
> materiale invece che al singolo indirizzo.
>
> Questo modulo si consulta **a mano**. Se un giorno servisse l'aggancio
> automatico, la strada e' un repo privato separato o una directory ignorata
> ma leggibile in locale — **mai** versionare qui.

## Before Touching

date, sigle, numerazione di serie, pipeline dei contenuti
-> verificare l'effetto a valle: ogni serata trascina listing, timetable,
podcast e after movie, e ognuno di questi ha un'ancora temporale precisa.

## I quattro format, come sono davvero

> **Perlone non e' un format.** E' il club di Nizza che ci ospita, e la serata
> e' una **notte re:sonate** portata li': titolo `re:sonate x Perlone`, sigla
> `RSNT-PRLN-###`, numerazione propria. Sta nella tabella qui sotto come
> **serie** di `RSNT`, non come quinta identita'. Confonderli significa
> inventare un format che non esiste — e prima o poi disegnargli una palette.

| Sigla | Format | Orario | Giorno | Cadenza |
|---|---|---|---|---|
| `RSNT` | Resonate — la notte | 22:00 → 06:00 | venerdi' o sabato | irregolare, 8 edizioni ago26→lug27, distanza 1–3 mesi |
| `SNST` | SunSet — il tramonto | 18:00 → 22:00 | — | **3 date l'anno**, solo aprile–ottobre |
| `RMDB-BZ` / `RMDB-MR` | RamaDub — il satellite | 18:00 → 22:00 | **giovedi'**, senza eccezioni su 27 date | un satellite ogni 14 giorni — **tranne l'apertura di stagione**, dove le prime tre date corrono a 7 |
| `MTNLB-<sede>` | MotionLab — il luogo | 18:00 → 22:00 | **non deciso** (a calendario giovedi' come segnaposto) | una ogni 6 settimane |
| `RSNT-PRLN` | **serie** di Resonate — al Perlone Club di Nizza | come RSNT | — | serie a se', numerazione propria, guest opzionale |

**La rotazione del ciclo di tre** — RamaDub x Booze → MotionLab x *(sede da
acquisire)* → RamaDub x Muro — **non si e' mai interrotta in nove cicli
completi, 27 date.**

> La sede di MotionLab **non si nomina qui**: e' indicata nel tracker come
> possibilita', non come accordo chiuso, e questo repo e' pubblico. Vedi
> `venue-acquisition.md`, gate una classifica non e' una disponibilita'.

**SunSet e' sempre in coppia con la notte**: 18→22 il tramonto, 22→06 la notte,
comunicato come *SunSet × re:sonate*. Da giugno a settembre il format si ferma.

## La pipeline, e la sua unica eccezione

**Satelliti (RamaDub, MotionLab) e SunSet:**
- Listing: il **martedi' prima** — −2 giorni dal giovedi', −4 dal sabato
- Podcast: il **lunedi' dopo** — +4 giorni / +2 giorni
- Verificato senza eccezioni su tutte e 27 le date dei satelliti

**Ma il listing e il podcast non sono tutto.** Ogni data di RamaDub produce
**quattro pezzi**, non due:

| Ancora | Pezzo | Formato |
|---|---|---|
| **−2 giorni** | Listing | storia 1080×1920 → poi in evidenza |
| **giorno stesso** | Tonight | stessa griglia, badge *tonight* e orario porta |
| **+4 giorni** | Recap video | storia video sulla stessa griglia |
| **+4 giorni** | Cover del podcast | **1:1, 2000×2000** — l'unica che cambia formato |

MotionLab oggi ne produce due — listing −2 e cover del podcast +4 — piu' un
passaggio che gli altri format non hanno: **l'approvazione del materiale da
parte dello spazio**, che sta dentro i due giorni, non dopo.

**Timetable e after movie non sono pezzi da satellite.** Sono della notte:
aggiungerli a un satellite allargherebbe il format, non il piano editoriale.

**Resonate:**
- Timetable: **−1 giorno**
- Podcast: nei giorni subito successivi, **uno per dj** — il podcast e' la
  registrazione del dj set, quindi una serata con quattro dj produce quattro
  puntate (di norma PT1→PT3)
- After movie: **poco prima del listing dell'edizione seguente**

**Perlone** usa la pipeline leggera: listing e un solo podcast.

## Quality Gates

- **Gate ancora, non conteggio**: L'after movie e' agganciato al **listing dell'edizione seguente**, non a un numero fisso di giorni dalla serata. Spostare la data successiva sposta l'after movie. Calcolarlo come "+N giorni" produce una pubblicazione fuori posto ogni volta che il calendario si muove. L'eccezione registrata (l'after movie di RSNT-008 attende RSNT-009) e' la regola che si comporta correttamente, non un caso anomalo.
- **Gate un podcast per dj**: Il numero di puntate discende dalla line-up. Cambiare la line-up cambia il numero di podcast: non e' un dettaglio editoriale, e' una modifica al piano di pubblicazione.
- **Gate numerazione senza salti**: I progressivi di serie non hanno salti ne' duplicati. Un progressivo assegnato **e' gia' su una locandina**: si aggiunge in coda, non si rinumera. E' una guardia monotona (vedi `meta-gates.md`).
- **Gate rotazione**: Il ciclo Booze → MotionLab → Muro e' un fatto verificato su 27 date. Rompere la rotazione e' una decisione, non un aggiustamento: va dichiarata.
- **Gate finestra stagionale**: SunSet esiste solo tra aprile e ottobre, tre volte l'anno. Una quarta data o una data invernale contraddice l'identita' del format, non solo il calendario.
- **Gate segnaposto dichiarato**: MotionLab e' a calendario di giovedi' **solo come segnaposto**: il suo giorno non e' deciso. Finche' non lo e', ogni materiale che ne dichiara il giorno e' provvisorio e va marcato tale. Trattare un segnaposto come un fatto e' il modo in cui si stampa la data sbagliata.
- **Gate una sigla ritirata non si cita**: Il giovedi' e' `RMDB-BZ-###` e `RMDB-MR-###`, **una sigla per locale, con progressivo che corre per locale**. La sigla precedente del giovedi' e' stata **ritirata il 4 agosto 2026**: non ha una coda aperta e non va piu' nominata, nemmeno per spiegare la storia. Al prossimo cambio di sigla vale comunque il principio: ogni cambio va accompagnato da una ricognizione di cosa e' gia' uscito, **e la ricognizione si chiude dichiarandola chiusa** — altrimenti il gate resta acceso su un lavoro che non esiste piu'.
- **Gate il calendario batte il tracker**: Quando il calendario e un documento di lavoro piu' vecchio dicono cose diverse, **vince il calendario** — e l'altro documento non e' "una versione alternativa": e' **la fonte da correggere**. Precedente registrato e chiuso il 5 agosto 2026: sull'orario del secondo atto della serata doppia il tracker di luglio divergeva dal calendario; **l'orario e' quello di `RSNT`, 22:00 → 06:00**, e il tracker era da correggere. Finche' una divergenza del genere resta aperta, **blocca la timetable**: e' un dato che si stampa.
- **Gate quattro pezzi, non due**: Il piano editoriale di un satellite non e' "listing e podcast". Chi consegna due pezzi su quattro non e' in ritardo su un dettaglio: ha saltato il pezzo del giorno stesso — quello che intercetta chi decide la serata nel pomeriggio — e il recap che alimenta l'evidenza.
- **Gate progressivo per sede — deciso il 2026-08-10**: Per MotionLab il progressivo **riparte da 001 a ogni sede**, come per RamaDub, dove Booze e Muro hanno numerazioni separate. Con una sede diversa ogni volta questo significa che **ogni edizione MotionLab e' la n° 001 del proprio spazio**, ed e' la conseguenza accettata, non un effetto collaterale scoperto dopo. *(Decisione del proprietario in fase 36, D-36-07; prima di quella data questo gate era aperto e rendeva provvisorio ogni materiale che mostrasse un progressivo MotionLab. Non lo e' piu': il numero si puo' stampare.)* Il giorno della settimana, invece, **resta un segnaposto** — vedi il gate qui sopra.
- **Gate il calendario e' la fonte**: Le coordinate certe di un format (orario, giorno, cadenza, pipeline) si leggono dal calendario. Cio' che il calendario non dice — l'identita' sonora di Resonate, RamaDub e MotionLab — **non e' ancora scritto**, e inventarlo significa scrivere il brand al posto di chi lo possiede. Dire "non e' deciso" e' una risposta corretta.

## Imperative Behaviors

- When moving an edition: recompute its listing, timetable, podcast and after movie
- When planning a RamaDub date: schedule all four pieces — listing, tonight, recap, podcast cover
- When a working document contradicts the calendar: the calendar wins, and fix the document
- When a MotionLab progressivo appears: mark it provisional until the numbering rule is decided
- When the after movie is involved: anchor it to the next edition's listing, never to a day count
- When the line-up changes: update the number of podcast episodes
- When numbering: append, never renumber
- When breaking the three-cycle rotation: declare it as a decision
- When MotionLab's weekday appears in any material: mark it provisional until decided
- When changing a format sigla: audit what has already been published under the old one, then declare the audit closed
- When a sigla has been retired: stop naming it — not even as historical context
- When asked what a format sounds like: answer from the manifesto if written, say "not yet defined" if not
