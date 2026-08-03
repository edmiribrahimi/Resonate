# Production Calendar — Operational Gates

> **Nessun `paths:`.** Questo modulo governa materiale che oggi non vive nel
> repo: sta nel production tracker (artifact `re:sonate — Production`, dati
> estratti da `Music.ics`, aggiornato al 02/08/2026). Va **consultato a mano**
> ogni volta che si parla di format, date, sigle o pipeline editoriale.
> Se un giorno il tracker viene versionato sotto `.planning/production/`,
> aggiungere qui `paths: ".planning/production/**"`.

## Before Touching

date, sigle, numerazione di serie, pipeline dei contenuti
-> verificare l'effetto a valle: ogni serata trascina listing, timetable,
podcast e after movie, e ognuno di questi ha un'ancora temporale precisa.

## I cinque format, come sono davvero

| Sigla | Format | Orario | Giorno | Cadenza |
|---|---|---|---|---|
| `RSNT` | Resonate — la notte | 22:00 → 06:00 | venerdi' o sabato | irregolare, 8 edizioni ago26→lug27, distanza 1–3 mesi |
| `SNST` | SunSet — il tramonto | 18:00 → 22:00 | — | **3 date l'anno**, solo aprile–ottobre |
| `RMDB-BZ` / `RMDB-MR` | RamaDub — il satellite | 18:00 → 22:00 | **giovedi'**, senza eccezioni su 27 date | un satellite ogni 14 giorni |
| `MTNLB-<sede>` | MotionLab — il luogo | 18:00 → 22:00 | **non deciso** (a calendario giovedi' come segnaposto) | una ogni 6 settimane |
| `RSNT-PRLN` | Resonate x Perlone (Nizza) | come RSNT | — | serie a se', numerazione propria |

**La rotazione del ciclo di tre** — RamaDub x Booze → MotionLab x SpazioMusa →
RamaDub x Muro — **non si e' mai interrotta in nove cicli completi, 27 date.**

**SunSet e' sempre in coppia con la notte**: 18→22 il tramonto, 22→06 la notte,
comunicato come *SunSet × re:sonate*. Da giugno a settembre il format si ferma.

## La pipeline, e la sua unica eccezione

**Satelliti (RamaDub, MotionLab) e SunSet:**
- Listing: il **martedi' prima** — −2 giorni dal giovedi', −4 dal sabato
- Podcast: il **lunedi' dopo** — +4 giorni / +2 giorni
- Verificato senza eccezioni su tutte e 27 le date dei satelliti

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
- **Gate cambio nome con coda**: Prima del 3 settembre 2026 il giovedi' girava sotto la sigla `SNST-BZ`. Il cambio a `RMDB-*` ha una coda operativa aperta: **materiali gia' prodotti portano ancora la sigla vecchia**. Ogni cambio di sigla va accompagnato da una ricognizione di cosa e' gia' uscito.
- **Gate il calendario e' la fonte**: Le coordinate certe di un format (orario, giorno, cadenza, pipeline) si leggono dal calendario. Cio' che il calendario non dice — l'identita' sonora di Resonate, RamaDub e MotionLab — **non e' ancora scritto**, e inventarlo significa scrivere il brand al posto di chi lo possiede. Dire "non e' deciso" e' una risposta corretta.

## Imperative Behaviors

- When moving an edition: recompute its listing, timetable, podcast and after movie
- When the after movie is involved: anchor it to the next edition's listing, never to a day count
- When the line-up changes: update the number of podcast episodes
- When numbering: append, never renumber
- When breaking the three-cycle rotation: declare it as a decision
- When MotionLab's weekday appears in any material: mark it provisional until decided
- When changing a format sigla: audit what has already been published under the old one
- When asked what a format sounds like: answer from the manifesto if written, say "not yet defined" if not
