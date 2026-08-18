# Fase 42 — voci fuori scope, trovate durante l'esecuzione

Registrate qui e **non riparate**: nessuna appartiene ai piani di questa fase, e
ripararle dentro un piano che non le possiede significa nascondere chi le ha
prodotte.

---

## DEF-42-01 — sei pagine di produzione esistono, rendono una superficie, e non
## stanno su nessuna lista di convertite

**Trovata durante:** 42-01, Task 1 (`npm run verify:conversion`, subito dopo la
riparazione di DEF-45-01).
**Stato:** pre-esistente al piano. **Nessun file toccato da 42-01 le produce**, e
nessuna e' stata aperta: il piano non ha modificato una sola riga sotto `src/`.

### Cosa e' successo, in una riga

Rimuovendo le quattro voci morte di `CONVERTED` (DEF-45-01) il gate ha smesso di
**rifiutare** e ha cominciato a **misurare** — e la prima cosa che ha misurato e'
che sei `page.tsx` esistono e non sono contate da nessuna parte.

### Il comando che le ha trovate

```
npm run verify:conversion
```

Esito di quel run, dopo la sola rimozione delle quattro voci: **exit 1**, checks
A B C D E verdi, `✗ F  6 page.tsx file(s) exist and are accounted for NOWHERE`.
Non e' una previsione: la ricerca di fase aveva gia' riprodotto lo stesso esito
su una copia dell'albero (`42-RESEARCH.md` §2.7, DISCORDANZA 3), e l'esecuzione
lo ha confermato sull'albero vero.

### Le sei pagine, con la fase che le ha costruite

| Page file | Fase che l'ha costruita |
|---|---|
| `src/app/(admin)/admin/(work)/calendar/page.tsx` | 44 |
| `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx` | 44 |
| `src/app/(admin)/admin/(work)/location/page.tsx` | 45 |
| `src/app/(admin)/admin/(work)/location/[id]/page.tsx` | 45 |
| `src/app/(admin)/admin/(work)/manifesto/page.tsx` | 45 |
| `src/app/(admin)/admin/(work)/visual/page.tsx` | 45 |

### La disposizione presa qui, e cosa NON significa

Il gate offre tre disposizioni, e le dichiara come *«decisions somebody reads»*:
dichiararle convertite, recintarle, o rifiutarle come non-superfici. Le prime e
le terze sarebbero **false**: nessun piano ne ha camminato la chiusura, e la
terza direbbe che non hanno markup, che invece ce l'hanno. Quindi: **recintate
per nome**, in `PENDING_SURFACES`, con la fase che le possiede scritta dentro la
ragione.

Due cose che un lettore dedurrebbe al contrario se non fossero scritte:

1. **Un recinto non e' un'approvazione.** Su quelle sei pagine **non e' stata
   affermata una sola cosa**. Nessun check ne apre i file, nessuno ne ha letto il
   markup, e questo documento non dice che siano giuste: dice che **nessuno le ha
   misurate**. E' la stessa distinzione che `conversion-manifest.mjs` gia' traccia
   fra un *recinto* e un *rifiuto di categoria* — il primo dice «nessuno ha
   guardato», il secondo «qualcuno ha guardato e non c'era niente da giudicare».

2. **La riparazione appartiene alle fasi che le hanno costruite**, ed e' **una
   voce che passa da `PENDING_SURFACES` a `CONVERTED` per superficie, nel commit
   che la converte**. Non sei voci in un commit solo, e non un allargamento di
   perimetro della 42.

### La domanda aperta, che non e' risolta qui

L'attribuzione alle fasi 44 e 45 e' una **lettura**, non un fatto firmato:
`42-RESEARCH.md` la registra come assunzione A3 ed e' esplicito sul suo costo —
*«se il proprietario decidesse il contrario, la wave 0 cresce di sei
superfici»*.

**Se il proprietario decide che la fase 42 le assorbe, sono sei superfici in piu'
nel perimetro di questa fase, ed e' una decisione sua — non un aggiustamento di
pianificazione.** Resta aperta e viene nominata qui invece di essere chiusa
d'ufficio, perche' la strada comoda (assorbirle in silenzio per far diventare
verde un gate) e' esattamente il modo in cui un recinto diventa un timbro.

### Cosa 42-01 ha fatto perche' il recinto non marcisca

`PHASE_42_PATHS` puo' smettere di matchare qualcosa senza che nessuno se ne
accorga. `PENDING_SURFACES` no: `checkManifest()` ha ora una condizione in piu' —
**un glob che non matcha nessuna `page.tsx` su disco e' un rifiuto, exit 2**, col
nome della voce stantia stampato. Provato per mutazione, applicando un settimo
glob che non matcha nulla, verificando che la mutazione fosse andata a segno
prima di leggerne l'esito, e rimuovendolo subito.

L'asimmetria e' voluta: il recinto della fase 42 si scioglie per mano del piano
scritto per scioglierlo, questo per mano di sei commit che nessuno coordina.

---

## DEF-42-02 — le cifre dei contatori della porta non sono tabulari, e questa
## fase declina di renderle tali

**Trovata durante:** 42-04, Task 2 (decisione dell'inchiostro e della tipografia).
**Stato:** pre-esistente. **Nessun file toccato.**

### Cosa migliorerebbe

I due contatori della porta — `ScannerClient.tsx:2693` e `:3020`, entrambi nella
forma *fatti / totale* — sono **numeri che una persona confronta**: guarda lo
schermo, entra qualcuno, riguarda lo schermo. Con glifi a larghezza
proporzionale, passare da una cifra all'altra sposta orizzontalmente tutte le
altre, e il confronto costa una lettura invece di uno sguardo. Alla porta,
davanti a una fila, quella differenza si paga in secondi.

Vale anche per i due contatori di guest list a `:2695` e `:3022`, che stanno
nella stessa riga di testo.

### Perche' non qui

**DS-05 — una tipografia per display, dati e interfaccia — non e' fra i requisiti
di questa fase.** La fase 42 porta **DS-04** e **RESP-05**, e nient'altro.
Farla comunque sarebbe scope creep travestito da rifinitura, e
`42-CONTEXT.md` §Deferred lo aveva gia' previsto per nome, chiedendo che venisse
**detto e rimandato** invece che fatto in silenzio.

### Chi la possiede

**La fase che porta DS-05**, e non un piano di questa. E' una modifica di **una
utility per contatore**, non tocca nessun valore, nessuna query e nessun esito —
quindi non ha bisogno di stare dietro il door pass, e non ha ragione di aspettare
oltre la fase che possiede il requisito.

---

## DEF-42-03 — quattordici bersagli tattili sotto il minimo sulla porta, come
## debito numerato che puo' solo scendere

**Trovata durante:** 42-04, Task 3, misurando `npm run verify:touch-targets` con
il recinto aperto su un ramo usa-e-getta.
**Stato:** pre-esistente. **Nessun file toccato**: il ramo e' stato cancellato e
`git status --porcelain -- src/ scripts/` e' vuoto.

### Perche' oggi il gate e' verde e domani non lo sara'

`verify-touch-targets` **non misura** la porta: l'esenzione 1 la recinta per
percorso, e il gate lo stampa a ogni esecuzione con la frase che conta —
*«If an under-44px target exists behind that fence this gate is silent about it.
The door is where a target too small to hit becomes a queue.»*

Quel recinto **si scioglie insieme al colore** (D-42-07). Nel momento in cui si
scioglie, questi quattordici diventano un rosso, e il rosso arriva **dentro**
un'onda di conversione che aveva promesso di non spostare niente.

### Come sono stati contati

Su un ramo `scratch-42-04-targets`, mai committato e cancellato: `PHASE_42_PATHS`
svuotata, `PHASE_42_EXEMPT_PATHS` svuotata, le due pagine della porta dichiarate.
Mutazione **asserita applicata prima di leggerne l'esito**. Esito:
`FAILED — 14 element(s) do not declare the minimum`, tutti in
`ScannerClient.tsx`. Ripristino per percorso esatto, riasserito.

### I quattordici

Il gate misura **una stringa di classi, non una scatola renderizzata** — lo
dichiara di se' a ogni esecuzione. Quindi la colonna della dimensione dice cosa
l'elemento **dichiara**, ed e' *derivata*, non *verificata sul campo*.

| # | `ScannerClient.tsx` | Tag | Cosa dichiara in verticale | Cosa e' |
|---|---|---|---|---|
| 1 | `:2673` | `button` | `p-4`, nessuna altezza — la scatola e' del contenuto | la card di scelta della serata |
| 2 | `:2768` | `button` | nessun padding, nessuna altezza — la scatola e' dell'icona | il ritorno alla scelta della serata |
| 3 | `:2823` | `button` | `py-1.5`, corpo 12px | l'interruttore che accende lo scanner |
| 4 | `:2863` | `button` | `py-1`, corpo 10px | *scan anyway*, sull'avviso di fine serata |
| 5 | `:2909` | `button` | `py-0.5`, corpo 10px — **~18px, la cifra del gate** | il chip *could not be recorded* |
| 6 | `:2918` | `button` | `py-0.5`, corpo 10px — **~18px** | il chip della coda trattenuta |
| 7 | `:3006` | `button` | `py-2.5`, nessuna altezza | la riga del contatore, che ricarica la lista |
| 8 | `:3061` | `input` | `py-3`, corpo 14px | il campo di ricerca |
| 9 | `:3070` | `button` | nessun padding, posizionato — la scatola e' dell'icona | lo svuota-ricerca |
| 10 | `:3094` | `button` | `py-2`, corpo 12px | i tre tab del filtro |
| 11 | `:3169` | `button` | `py-2.5`, corpo 12px | la banda di freschezza della lista |
| 12 | `:3208` | `button` | `py-2.5`, corpo 12px | la torcia |
| 13 | `:3254` | `button` | `py-2`, nessuna altezza | una riga della cronologia — **la strada dell'annullamento** |
| 14 | `:3418` | `button` | `py-2`, corpo 14px | il check-in di una voce di guest list |

**I due piu' piccoli dell'albero sono il 5 e il 6**, e non e' un caso che siano
pillole di coda: sono le uniche righe che dicono che qualcosa **non** e' stato
registrato.

> ⚠ **`42-RESEARCH.md` §2.7 ne nominava dieci e li chiamava quattordici.** La sua
> lista — `:2909, :2918, :2865, :3061, :3070, :3094, :3169, :3208, :3254, :3418`
> — omette **quattro** elementi che il gate nomina (`:2673`, `:2768`, `:2823`,
> `:3006`) e cita `:2865` dove il gate ancora al tag, a `:2863`. Il numero era
> giusto, l'elenco no: un piano che avesse pagato *«i dieci elencati»* avrebbe
> lasciato quattro rossi.

### La disposizione, e la sua ragione

**Debito numerato, non pagamento**, sul meccanismo di `verify-breakpoints.mjs`:
*«not an exemption nobody can see, but a debt with a number on it that can only
go down»*. La lista vive nel gate, dichiara la propria lunghezza, e **una voce
esce solo quando l'elemento e' stato allargato** — mai perche' e' scomoda.

**Perche' non si paga qui:** ingrandire un target **cambia il layout**, e la
seconda meta' di RESP-05 e' che il comportamento dello scanner non cambia per
effetto del lavoro visivo. Una fase che promette di non spostare nulla e poi
sposta quattordici bersagli su una superficie di sicurezza — inclusa la riga
dell'annullamento — ha attraversato il confine che il proprio mandato le aveva
messo.

**La terza uscita non e' fra quelle disponibili: abbassare il gate.** Il gate lo
dice di se' — *«Fix the ELEMENT, not this gate»* — e T-42-11 la registra come
manomissione. Allargare un'esenzione per far sparire un rosso e' indistinguibile,
sei mesi dopo, da una regola che non c'e' mai stata.

### Chi lo possiede

**Un piano piccolo e non visivo, tutto suo**, che non appartiene alla fase 42 —
perche' la fase 42 ha dichiarato di non toccare la geometria — e che **sta dietro
lo stesso vincolo d'ordine**: la porta si tocca dopo un door pass, non prima.

La frase che quel piano dovra' tenere in testa: **un bersaglio troppo piccolo,
alla porta, e' una fila.** Alle due di notte, al buio, con una mano, chi manca il
tocco non se ne lamenta — riprova, e intanto qualcuno aspetta.

---

*Aperto: 2026-08-18 — fase 42, piani 01 e 04.*

---

## DEF-42-04 — il criterio 3 non e' piu' chiudibile, ed e' una decisione presa, non un incidente

**Aperta il 2026-08-18. Non assegnabile a un piano: non esiste un piano che la chiuda.**

Il criterio 3 della fase 42 dice *ogni comportamento dello scanner e' invariato
rispetto a prima della conversione*. La misura del *prima* era la riga 3m di
`42-PROCEDURES.md` — il door pass sullo scanner non convertito — e il roadmap la
teneva davanti alla conversione con un vincolo d'ordine esplicito.

**Il proprietario ha scavalcato quel cancello il 2026-08-18**, con il costo
enunciato prima della scelta, e le onde 3-8 sono state eseguite con la riga 3m a
`pending`. Da quel momento la riga non e' rimandata: **e' impossibile**, perche' lo
scanner non convertito che doveva misurare non esiste piu'.

**Conseguenze, scritte perche' nessuno le riscopra come sorpresa:**

1. Il criterio 3 resta **senza termine di paragone in modo permanente**. Ogni
   documento che dichiari la fase 42 verificata deve dirlo, invece di contarlo fra
   i criteri chiusi.
2. La riga 3n — lo stesso pass sullo scanner convertito — puo' ancora essere
   eseguita, ma produce una **descrizione**, non un confronto. Il suo valore
   scende, e non e' un ripiego equivalente.
3. Il secondo motivo del vincolo resta in piedi e non e' coperto da questa deroga:
   **alla prima porta reale, correzioni di comportamento mai esercitate e una
   superficie ridipinta gireranno insieme**, senza error tracking che dica quale
   delle due ha ceduto. Chi spedisce alla porta lo fa sapendolo.

**Cosa si puo' ancora fare, e vale la pena farlo:** eseguire ugualmente
`39-DOOR-PASS.md` §0.6 e §8 sullo scanner convertito, alla prima porta reale.
Non chiude il criterio 3 — nulla lo chiude piu' — ma e' la **prima** osservazione
del comportamento della porta che questo progetto avra', e da li' in poi diventa
il *prima* di qualunque cosa venga dopo. Le altre nove righe di
`42-PROCEDURES.md` restano `pending` ed eseguibili.

---

## DEF-42-05 — una frase che dice due volte la stessa cosa, e nomina un colore che non c'e' piu'

**Aperta il 2026-08-18 dal piano 42-06. Fuori dal suo perimetro, e non chiusa da
esso.**

`src/app/(admin)/admin/scanner/ScannerClient.tsx`, accanto a
`markCheckedInLocally` sul ramo del biglietto online, porta questo commento:

> *«A failure here costs a later amber flag instead of a later amber flag — no
> admission and no refusal turns on it — so it is logged under its own category
> rather than put on the screen.»*

**Due difetti in una riga, e sono indipendenti.**

1. **La frase non afferma nulla.** *«X instead of X»* e' una costruzione che
   sembra un compromesso spiegato e non lo e': manca il termine di paragone che
   giustifica la scelta di non mettere il fallimento sullo schermo. Chi la legge
   crede di aver capito perche' il fallimento non si vede, e non l'ha capito —
   che e' peggio di un commento assente.
2. **Nomina l'ambra**, e dal piano 42-06 il terzo stato non e' piu' ambra su
   nessuna delle due superfici che lo disegnano. E' la stessa classe di difetto
   che 42-06 e' esistito per chiudere (T-42-18): prosa che asserisce un colore
   invece di lasciarlo a un lookup.

**Perche' non l'ha corretta il piano 42-06.** Il primo difetto e' preesistente e
non e' stato causato da quel commit; correggerlo richiede di sapere **quale**
fosse il termine di paragone inteso, e quella e' una domanda a chi ha scritto il
percorso, non una sostituzione di stringa. Il piano 42-06 ha corretto le due
frasi che la propria modifica ha reso false — a `:498` e nella catena della
cronologia, entrambe riscritte **per stato invece che per tinta**, cosi' che non
tornino stantie al prossimo spostamento — e ha lasciato questa qui.

**A chi tocca:** al piano che converte la palette grezza di questo file
(**42-08**), o a un passaggio di prosa dedicato. **Regola da applicare quando si
tocca:** un commento nomina lo **stato**, mai la **tinta** — la tinta vive in un
lookup solo, e una frase che la scrive invecchia da sola.

### CHIUSA il 2026-08-18 dal piano 42-08 — e il termine di paragone e' stato letto, non scelto

**Il termine mancante non e' stato ricostruito a intuito: sta nel codice, in due
rami dello stesso `if`.** La domanda «quale fosse il paragone inteso» aveva una
risposta meccanica che nessuno era andato a prendere.

`markCheckedInLocally` (`src/lib/offline/checkin-store.ts:975-989`) e' **l'unico
scrittore** di `checkedIn` su questo percorso, e se fallisce la riga in cache
resta a *non arrivato*. Il costo si legge in `ticketOffline`
(`src/app/(admin)/admin/scanner/ScannerClient.tsx`), che si dirama esattamente
su quel campo:

- `cached.checkedIn` vero → `showFlash("already_recorded", …)` con l'ora e
  l'operatore;
- `cached.checkedIn` falso → `checkInLocally(…)` e
  `showFlash(flagged ? "already_recorded" : "success", …)`.

Quindi il fallimento **costa una lettura di *gia' registrato*** — lo stesso
biglietto, riletto su quel telefono con la radio spenta, dice *ammesso* invece.
E il resto della frase regge alla verifica: **nessun ingresso e nessun rifiuto
ci gira sopra**, perche' il registro del server non e' toccato e il primo
aggiornamento riuscito riscrive la riga (`checkin-store.ts:740-753`,
`localWins` e' falso quando la riga locale non dice *arrivato*).

**Cosa e' stato scritto:** la frase nomina ora lo **stato** e il ramo che lo
produce, mai la tinta — la regola che questa voce chiedeva di applicare. La
costruzione *X invece di X* e' sparita perche' il secondo termine e' stato
trovato, non perche' la frase sia stata accorciata fino a non affermare piu'
nulla.

**Cosa questa chiusura NON prova.** Che l'autore intendesse *questo* paragone
resta indimostrabile: la persona non e' stata interrogata. Quello che e'
dimostrato e' piu' forte per chi legge il codice domani — la frase adesso
descrive il meccanismo che il codice esegue, con i due `file:riga` che lo
reggono. **Nessuna copertura di test:** questo repo non ne ha, e la prova qui e'
la lettura dei due rami piu' `npm run build` a exit 0.

---

## DEF-42-06 — tre confini di controllo sulla porta prendono il nome della
## linea, e il livello dei token aveva costruito apposta l'altra destinazione

**Trovata da:** piano 42-09, task 1, mentre convertiva l'alias del bordo.
**Non riparata qui, e la ragione e' il piano stesso.**

### Cosa e' successo, in una riga

L'alias del bordo risolve **uno a uno** al nome della linea, quindi la rinomina
ha mandato **tutti e nove** i bordi della porta sullo stesso nome — compresi
**tre che non sono bordi di card ma confini di controllo**, cioe' esattamente il
caso che `globals.css` vieta a quel gruppo di nomi.

### La citazione che rende la voce non opinabile

`src/app/globals.css:44-57`, sul gruppo delle linee:

> *«NONE of these may carry the boundary of a text input, a select, a secondary
> or ghost button, a checkbox or the scanner target: that boundary is --muted or
> lighter.»*

e `src/app/globals.css:82-88`, sul nome che esiste per l'altra meta':

> *«…buys the triage of 406 `border-card-border` sites two named destinations —
> `border-line` for a card's edge, `border-control` for a control's boundary —
> instead of one destination and a memory.»*

**Le due destinazioni erano state costruite. La rinomina ne ha potuta usare una
sola**, perche' un alias che risolve a un solo nome non offre una scelta: la
scelta e' un giudizio su cosa quel bordo *sia*, e un piano di sostituzione non
ha il mandato di darlo.

### I tre siti, con il ruolo che li qualifica

| riga | elemento | cosa fa alla porta |
|---|---|---|
| 2706 | `<button>` | sceglie **su quale serata** la porta sta lavorando |
| 2867 | `<button>` | accende e spegne **la fotocamera** |
| 3106 | `<input type="text">` | cerca un ospite **per nome**, quando la scansione non riesce |

Gli altri sei restano corretti dove sono: quattro bordi di card, un riquadro di
avviso e un divisorio di riga.

### I numeri, presi dal livello dei token e non ricalcolati qui

`globals.css:47-48` e `:70-79`, misurati il 2026-08-11 sulla stessa formula e
sugli stessi quattro fondi:

| nome | contrasto sui quattro fondi | soglia WCAG 1.4.11 per un confine non testuale |
|---|---|---|
| il gruppo linee, il piu' forte dei tre | **2,05 : 1** al massimo | 3 : 1 |
| il nome del confine di controllo | **6,29 – 7,14** | 3 : 1 |

Non e' un mancato di poco: **e' meno della meta'**, e i tre elementi stanno sul
percorso critico di uno staff che lavora al buio con una mano sola.

### Perche' non qui

1. Il piano 42-09 e' **una rinomina**, e il suo criterio d'accettazione dice in
   lettere che i valori sono identici per costruzione e che **qualunque cosa una
   persona possa vedere dopo e' un difetto, non un miglioramento**. Passare da
   `border-line` a `border-control` **cambia il colore**: e' un ridisegno, ed e'
   precisamente il modo in cui un piano di rinomina smette di esserlo.
2. `42-MAPPING.md` §9 assegna quell'alias a **una** destinazione su ogni riga.
   Le sostituzioni sono state decise nell'onda 1: sceglierne un'altra
   dall'interno dell'esecuzione significherebbe cambiare la mappa senza che
   nessuno la rilegga.
3. **Il difetto non nasce qui.** Era gia' sulla porta sotto il nome precedente:
   e' `41-UI-SPEC.md` §5.2, reperto A1, sulla porta. La rinomina non l'ha
   introdotto — **l'ha reso leggibile**, perche' adesso il file scrive il nome
   che il documento dei token vieta, invece di un alias che suonava come un
   bordo di card.

### Perche' nessun gate lo trovera' da solo

`--control` e' un nome noto a `scripts/verify-tokens.mjs:375`, **ma nessun
controllo verifica che un confine di controllo lo porti.** Il gate della
conversione conta i nomi legacy e la palette grezza; entrambi sono a zero su
questo file. **Un verde su questa porta non dice nulla su questa voce**, ed e'
la ragione per cui e' scritta qui invece di essere lasciata al prossimo verde.

### Chi la possiede

Non un piano di questa fase: il perimetro di 42 e' colore, contrasto e tipo
**senza cambiamenti visibili**, e questo e' un cambiamento visibile con un
numero dietro. Va portata a chi decide sul contrasto dei controlli, insieme agli
altri siti che il reperto A1 conta fuori dalla porta — e la porta merita di
essere trattata **per prima**, perche' e' l'unica superficie del prodotto letta
al buio davanti a una fila.

---

## DEF-42-07 — lo strumento della misura dichiara, a ogni esecuzione, che l'albero
## non e' convertito

**Trovata durante:** 42-12, task 1, alla prima riesecuzione della cattura.
**Stato:** difetto dello script, non dell'albero. **Nessun file toccato.**

### Cosa e' successo, in una riga

`scripts/capture-scanner-baseline.mjs` stampa una **stringa fissa** nella propria
intestazione:

> *«At this commit the scanner is **unconverted**: no class string in its perimeter
> has been rewritten, and every constant below is the one the first real door will
> run on.»*

La frase e' vera solo per la prima esecuzione. Lo script e' stato scritto quando se
ne prevedeva una sola, e a quel tempo la frase era un'affermazione corretta sul
mondo. Dal piano 42-06 in poi **e' falsa**, e nessun controllo la rilegge: chi
esegue oggi `node scripts/capture-scanner-baseline.mjs > qualcosa.md` ottiene un
documento che mente alla quarta riga.

### Perche' non ha inquinato la misura del piano 42-12

La frase sta **sopra** il marcatore di apertura della regione diffabile, quindi
non entra in nessun confronto e non ha spostato nulla. Nel reperto la sezione
AFTER porta la propria intestazione, scritta a mano, che dice il contrario — e la
divergenza fra le due e' scritta li' invece di essere lasciata scoprire.

E' esattamente la stessa classe di difetto che la fase 42 ha gia' chiuso due volte
altrove: **prosa che asserisce un fatto invece di leggerlo** (T-42-18, DEF-42-05).
Qui l'asserzione sta nello strumento invece che nel prodotto, il che la rende
peggiore di una riga sola: si ristampa a ogni esecuzione.

### Perche' non qui

Il piano 42-12 dichiara nella propria regola 7 che **non modifica alcun file sotto
`src/` o `scripts/`**. E c'e' una ragione piu' forte della regola: il piano 42-12
**e' la misura**, e uno strumento riscritto dalla misura che lo usa non e' piu' un
riferimento indipendente. Se lo script fosse stato corretto qui, la cattura AFTER
sarebbe stata prodotta da un binario diverso da quello che ha prodotto la BEFORE, e
l'unica affermazione falsificabile della fase avrebbe perso il proprio termine di
paragone — che e' precisamente il modo in cui il criterio 3 e' gia' andato perduto
(DEF-42-04).

### La riparazione, per chi la prendera'

Non e' cancellare la frase: e' **derivarla**. Lo script sa gia' leggere i tre
riempimenti del lampo — e' il blocco 1 — quindi puo' dire *convertito* o *non
convertito* **misurandolo**, con la stessa regola con cui misura tutto il resto, e
rifiutare se non riesce a stabilirlo. Una frase che descrive l'albero deve essere
prodotta dall'albero.

**Chi la possiede:** chiunque riesegua la cattura dopo questa fase. Fino ad allora,
**la sezione AFTER del reperto e' l'unico posto in cui la verita' su quell'albero e'
scritta**, e questa voce esiste perche' nessuno la deduca dall'intestazione.

---

## DEF-42-08 — la riga 3h chiede un'identita' che la forma del reperto rende
## impossibile, e la richiesta non e' stata riscritta per farla tornare

**Trovata durante:** 42-12, task 1, confrontando l'esito con la formulazione della riga.
**Stato:** difetto di formulazione in `42-VALIDATION.md`. **Non corretto, di proposito.**

### Cosa dice la riga, e cosa e' successo davvero

`42-VALIDATION.md` riga **3h**: *«il reperto meccanico rifatto e' **identico riga per
riga** al blocco pre-conversione»*.

Il reperto **cita posizioni di riga** — le tre del lampo, le ventisei di `showFlash`,
le sei dei glifi, i quattro letterali della decodifica. Qualunque conversione che
aggiunga o tolga anche una sola riga sopra una di quelle citazioni **le sposta tutte**,
senza toccare un solo valore. Nella misura del 2026-08-18: **118 righe diverse su 295**,
di cui **115 sono solo posizioni**.

L'identita' riga per riga, su un reperto costruito cosi', non e' una soglia severa: e'
**irraggiungibile per costruzione** da qualunque fase che modifichi il file.

### Perche' la riga NON e' stata riscritta

Perche' riscrivere il criterio dopo aver visto l'esito e' la definizione di piegare la
misura al risultato. Il piano 42-12 lo mette per iscritto prima della corsa — *«editing
the earlier record to make the diff quiet is the one action that would make this whole
apparatus worthless»* — e una riga di validazione e' l'altra meta' dello stesso
apparato. Quindi la riga resta come e' scritta, e il reperto dichiara apertamente che
**3h chiude nel senso che proteggeva e fallisce nel senso in cui e' formulata**.

### La riparazione, per chi la prendera'

Due strade, e vanno decise da chi possiede il contratto di validazione, non qui:

1. **Riformulare la riga** in *«identico dopo la normalizzazione delle sole posizioni
   di riga, con ogni differenza residua argomentata»* — che e' cio' che questa fase ha
   effettivamente eseguito, normalizzatore provato per mutazione in quattro versi
   compreso.
2. **Cambiare la forma del reperto** perche' non citi piu' posizioni assolute — per
   esempio ancorando ogni blocco al nome della funzione che lo contiene. Piu' pulito e
   piu' costoso, e sposta il difetto invece di eliminarlo: un blocco che perde la riga
   perde anche il modo piu' rapido per andarci.

**Chi la possiede:** la fase che riusera' questo schema di reperto. Finche' non e'
decisa, chiunque confronti due catture deve sapere che **il diff grezzo non e' la
risposta**, e che la normalizzazione va provata per mutazione prima di fidarsene.

---

*Aggiunto: 2026-08-18 — fase 42, piano 12.*
