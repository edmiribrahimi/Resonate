# Brand & Visual System — Operational Gates

> **Nessun `paths:`**, per la stessa ragione di `production-calendar.md`, e la
> ragione **non e' tecnica: e' una decisione**. Il sistema visivo, lo scouting
> e i manifesti vivono nel production tracker (artifact `re:sonate —
> Production`) e in `.firecrawl/`, e **non devono diventare pubblici**:
> `github.com/edmiribrahimi/Resonate` e' un repo pubblico e una pubblicazione
> e' irreversibile.
>
> Versionarli per ottenere il caricamento automatico significherebbe
> pubblicarli. Consultazione manuale, quindi — e il controllo **F** di
> `npm run verify:persona` verifica che quel materiale resti fuori.

## Before Touching

locandine, storie, post, palette, wordmark, sigle sui materiali, scouting delle
sedi
-> verificare: cosa e' fisso e cosa e' variabile, e se l'informazione critica
sopravvive al ritaglio della griglia Instagram.

## Il concept, in una riga

Il vinile-pianeta di Resonate diventa **un sole che tramonta sull'orizzonte**,
sotto un cielo notturno stellato. Il 10 ottobre il sole tramonta del tutto e si
apre la notte 22:00–06:00.

## La palette

| Colore | Hex | Uso |
|---|---|---|
| Nero cosmico | `#0A0712` | sfondo, cielo stellato |
| Viola notte | `#A874E8` | transizione al notturno |
| Rosa caldo | `#FF5C93` | accento primario |
| Rosa Resonate | `#F6B6D2` | testi, solchi, wordmark |
| Arancio tramonto | `#FF7A2F` | glow sull'orizzonte — **resta nella palette, non e' piu' il colore di un format** |
| Blu RamaDub | `#6E8BFF` | identificativo di RamaDub, dal 2026-08-20 |
| Ultimo raggio | `#FFB25E` | highlight, riflesso del disco |

Il gradiente **arancio → rosa → viola → nero** era la firma esclusiva del format
del tramonto. **Quel format e' stato cancellato il 2026-08-20**, e il gradiente
**non e' passato a nessuno**: resta senza proprietario, e usarlo su un altro
format significa vestirlo dell'identita' di una cosa che non esiste piu'.

## Fisso contro variabile

**Fisso** — sole-vinile a filo orizzonte; cielo notturno stellato; wordmark
`re:sonate` + `presents` + nome del format; fascia con tipo di serata e orario
in basso.

**Variabile** — data grande; venue e selector centrati; progressivo di serie;
intensita' del sole (piu' caldo in stagione, piu' viola in chiusura).

## Quality Gates

- **Gate `@ Secret Venue`**: L'after party **non svela la location** nella comunicazione. E' la controparte editoriale di `venue-secrecy.md`: la stessa regola, sull'altro canale. Un indirizzo in una storia annulla un cron.
- **Gate grid-safe**: Le informazioni critiche — logo, titolo, data grande, dj, orari — stanno **dentro il quadrato centrale**, la zona sempre visibile nella griglia del profilo. Un post bello che nella griglia perde la data e' un post che non comunica.
- **Gate data leggibile nel grid**: Il giorno e' grande e leggibile anche in miniatura. E' l'unica informazione che deve sopravvivere a ogni ridimensionamento.
- **Gate canale per format**: **SunSet va solo in storie → evidenze. Il feed resta al notturno.** Non e' una preferenza estetica: e' cio' che tiene il profilo coerente con l'identita' della notte.
- **Gate ordine di pubblicazione**: Invitation → After Party → After Movie. **Nel grid l'ordine si inverte** (il piu' recente va in alto a sinistra): After Movie · After Party · Invitation. Chi impagina deve pensare al risultato finale nella griglia, non alla sequenza di pubblicazione. Di un carosello, nel grid appare **solo la cover**.
- **Gate cielo**: Sempre notturno stellato. **Niente palme** — il riferimento non e' tropicale.
- **Gate sigla corrente**: Ogni materiale porta la sigla del format **come e' oggi**: il giovedi' e' `RMDB-BZ-###` / `RMDB-MR-###`, con progressivo per locale. Le sigle ritirate non si citano. Vedi `production-calendar.md`, gate una sigla ritirata non si cita.

- **Gate lo scrim, non la cornice**: I materiali RamaDub si costruiscono con la **foto a tutto campo e due fasce di nero in gradiente** — alto e basso — dentro cui vive il testo. Non con una cornice, e non con testo libero sulla foto: la leggibilita' deve dipendere dalla costruzione, non dalla foto di turno, perche' la foto arriva il lunedi' per il martedi' e non si puo' ridisegnare ogni volta. Le informazioni stanno **tra i 300 px dall'alto e i 300 dal basso** di un canvas 1080x1920: sopra c'e' l'header di Instagram, sotto la barra di risposta e le didascalie automatiche.

- **Gate copertina dell'evidenza**: La copertina di una raccolta in evidenza e' **ritagliata a cerchio dal centro** (area utile ~720x720). Una storia riusata come copertina mostra la faccia del dj e non il brand: **la copertina e' un pezzo separato**, disegnato una volta.

- **Gate niente logo del locale**: Nei materiali il locale si nomina **in tipografia**, per esteso e come lo scrive lui. Il logo non entra: e' una cortesia, non un obbligo d'accordo, e un logo altrui — forma e colore imprevedibili, diversi a ogni cambio di sede — sporca una grafica che deve restare elegante e riconoscibile come nostra.

- **Gate lingua dei materiali**: I visual sono in **inglese britannico**: `Thursday 18 Sept` (giorno-mese, mese abbreviato, niente ordinali, niente anno), orario in **formato 24h**. L'italiano resta dove e' un asset — `aperitivo`, e il nome del locale, che non si traduce mai.

- **Gate handle mai stampati**: Dj e locale si citano con il **tag nativo** di Instagram, cliccabile e modificabile, non con l'handle stampato nella grafica: e' il tag che genera il repost, ed e' il repost la vera distribuzione di una storia. Il nome dell'artista, quello si', va scritto — e verificato alla fonte.
- **Gate nome e luogo di una venue**: I nomi si scrivono come li usa il locale. **Booze e' «Booze · hi-fi bar & vineria», in corso Monte Grappa, a Parella** — non «Vineria Booze · San Salvario», che sbaglia sia la dicitura sia il quartiere. Un errore di quartiere su una locandina e' un errore che il pubblico vede.
- **Gate spelling degli artisti**: Nome e handle Instagram di ogni artista vanno verificati alla fonte prima della produzione grafica. Uno spelling sbagliato e' irrecuperabile una volta pubblicato ed e' una mancanza di rispetto verso chi suona.

## Lo scouting non sta piu' qui

I criteri di selezione delle sedi — pesati per format, con lo stato di ogni
candidato e il nodo giuridico — sono in **`venue-acquisition.md`**. Ci stavano
per ragioni di storia, non di dominio: scegliere dove suonare non e' sistema
visivo.

Quello che resta qui e' l'unico punto in cui i due domini si toccano:

- **Gate uno spazio non acquisito non si nomina**: Finche' una sede non e' acquisita **per iscritto**, il suo nome non entra in nessun materiale, in nessuna caption e in nessun capitolato. Una locandina e' una pubblicazione: nominare uno spazio con cui la trattativa e' aperta la chiude male, e la chiude per noi.

## La grafia, che non e' una preferenza tipografica

- **Gate grafia del brand**: Si scrive **`re:sonate` con la e normale** — nelle grafiche, nell'app, nelle mail, in prosa, ovunque. **La e rovesciata `ɘ` esiste solo dentro il logo** ed e' un segno disegnato, non un carattere da digitare: incollarla in un testo produce una parola che i motori di ricerca, i lettori di schermo e la casella di posta di qualcuno non riconoscono. I format sono **`SunSet`**, **`RamaDub`**, **`MotionLab`** — CamelCase, mai maiuscolo pieno.
- **Gate il nome sull'app e' il nome del format**: Un satellite si chiama **`RamaDub x <venue>`** con il progressivo per locale; il tramonto e' **`SunSet`**; la notte e' **`re:sonate`**; la serata doppia si comunica come **`SunSet × re:sonate`** anche se in calendario e nell'app sta come due voci. La serie di Nizza ha numerazione propria e non entra nella sequenza della notte. Sono gli stessi nomi in tre posti — app, calendario, materiali — e **il format e' la fonte del nome**, non il contrario.

## Quality Gates — produzione dei materiali

- **Gate capitolato, non file**: Le locandine di **Resonate** le produce un **grafico esterno**: quello che possediamo e consegniamo e' il **capitolato**, non il file. Il capitolato porta le regole — `@ Secret Venue`, zona grid-safe, data leggibile in miniatura, progressivo di serie, un pezzo per ogni voce della pipeline — e **non porta l'indirizzo**. Vedi `venue-secrecy.md`, gate il capitolato e' un percorso di uscita.
- **Gate il colore non si eredita**: RamaDub e' **`#6E8BFF`, un blu, piatto e senza sfumatura** — dal 2026-08-20, e il valore e' stato **misurato**: 6.46:1 sul fondo, dentro la fascia delle altre tinte del catalogo (5.57–11.92). Il primo blu proposto dava 3.11:1, sotto la soglia del testo, e non e' stato preso. MotionLab **non ha ancora una palette** — e finche' non ce l'ha, i suoi materiali restano neutri: prendere in prestito il colore di un altro per riempire il vuoto e' il modo in cui un format perde l'identita' prima di averla.

  > **Il gradiente arancio → rosa → viola → nero non ha piu' un proprietario.**
  > Era la firma esclusiva del format del tramonto, **cancellato il 2026-08-20**
  > (`CAT-01`). Non e' passato a nessun altro e **non si eredita**: un format che
  > lo indossasse indosserebbe l'identita' di una cosa che non esiste piu'. Vale
  > il gate *una sigla ritirata non si cita*, applicato a un colore.
- **Gate tipografia dichiarata**: RamaDub e' **Anton** per il titolo e **Space Mono** per i dati, entrambi Google Fonts a licenza libera. Senza Canva Pro il titolo degrada ad **Archivo Black**: e' una degradazione prevista, non un'alternativa a piacere. Cambiare famiglia e' una decisione di sistema, non una scelta del singolo pezzo.
- **Gate il piano B si disegna prima**: La foto del dj arriva il lunedi' per il martedi', e a volte non arriva. Il pezzo senza foto — fondo nero, tipografia grande, stessa fascia — **si disegna in anticipo**, non il martedi' alle 19: un piano B improvvisato sotto scadenza e' il pezzo che uscira' davvero.
- **Gate l'archivio precede il listing**: Il listing esce **due giorni prima** della serata, quindi **lo scatto di quella sera non puo' esistere**. Alla prima data di un dj serve la sua press photo; dalla seconda si pesca dall'archivio — che qualcuno deve costruire ogni giovedi', o il format resta dipendente da cosa manda l'artista.
- **Gate lo spazio approva cio' che lo nomina**: Molti spazi espositivi pretendono di **approvare i materiali che li citano**. E' un passaggio di produzione con il suo tempo, e va messo in conto **dentro** i due giorni prima del listing — non scoperto quando il pezzo e' pronto.
- **Gate la grafica non anticipa il suono**: Dove l'identita' sonora non e' scritta — RamaDub, MotionLab, Resonate — **i materiali non alludono al genere**. Nessun riferimento di scena, nessun aggettivo che suoni come una promessa. Vedi `sound-manifesto.md`.
- **Gate diritti sull'immagine dello spazio**: Se un materiale mostra lo spazio o la mostra in corso, i diritti su quelle immagini vanno chiariti prima, non dopo. Vedi `legal-compliance.md`.

## Imperative Behaviors

- When naming RamaDub's colour: `#6E8BFF`, flat and never a gradient
- When tempted to reuse the sunset gradient: don't — its format is gone and it passed to nobody
- When writing the brand anywhere: `re:sonate` with a normal e — the `ɘ` lives only inside the logo
- When naming a format: SunSet, RamaDub, MotionLab — CamelCase, never all caps
- When naming an event in the app: take the name from the format, with its per-venue progressivo
- When designing anything for an after party: write `@ Secret Venue`, never the address
- When laying out a post: keep logo, title, date, djs and times inside the grid-safe square
- When planning a publication sequence: check how it reads in the grid, reversed
- When producing SunSet material: stories and highlights only, never the feed
- When using a format sigla: use today's, and never name a retired one
- When building a RamaDub piece: photo full-bleed, two scrim bands, text inside them — never a frame, never bare text
- When a highlight needs a cover: design it as its own piece, centred inside 720×720
- When naming the venue in a visual: typography only, never its logo
- When writing dates or times in a visual: British English, `Thursday 18 Sept`, 24-hour clock
- When crediting a dj or a venue on a story: native tag, never a printed handle
- When naming a venue: use the venue's own wording and the correct neighbourhood
- When crediting an artist: verify the spelling and the @ at the source
- When a space is not acquired in writing: keep its name out of every material
- When briefing the external designer: hand over the capitolato, never the address
- When a format has no palette yet: keep it neutral, never borrow SunSet's sunset
- When the photo may not arrive: design the no-photo piece in advance
- When a listing is due: pull from the archive, since that night's photo cannot exist yet
- When a material names an exhibition space: budget the space's approval inside the two days
- When a format's sound is unwritten: keep every visual free of genre allusion
