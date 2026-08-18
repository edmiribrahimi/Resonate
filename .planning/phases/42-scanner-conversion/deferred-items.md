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
