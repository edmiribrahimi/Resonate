---
phase: 45-production-sections-section-by-section
plan: 11
subsystem: ui
tags: [nextjs, rls, capability-routes, venue-acquisition, read-only, typed-routes]

# Dependency graph
requires:
  - phase: 45-07
    provides: "score.ts, StageBadge, ScoreCell, AttributeCell — il calcolo e i due renderer che questa superficie chiama per la prima volta"
  - phase: 45-08
    provides: "le cinque tabelle, i dieci archi di lettura e le quattro chiavi di sezione applicate in produzione"
provides:
  - "src/app/(admin)/admin/(work)/location/page.tsx — la lista, dietro la chiave location, letta con il client legato al cookie"
  - "src/app/(admin)/admin/(work)/location/[id]/page.tsx — il dettaglio: quattro domande, due colonne D-45-24, dieci attributi, quattro punteggi"
  - "src/app/(admin)/admin/location/SpaceName.tsx — unico renderer del nome di uno spazio, con lo stadio nello stesso sottoalbero"
  - "src/app/(admin)/admin/location/SpaceList.tsx — la lista, senza indirizzo e senza ordinamento per punteggio"
  - "capability-routes.ts — `production.location.manage` sul ramo `routes:` con `alsoGatesTables`"
affects: [45-12, 45-13, 45-18, 45-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un componente che prende nome e stadio insieme rende la guardia strutturale invece che ricordata"
    - "mappare sul CATALOGO e non sui risultati calcolati: l'assenza di un format si leggerebbe come uno zero"
    - "una riga rifiutata dalla policy e una riga inesistente sono lo stesso `null`, e distinguerle sarebbe un oracolo"
    - "il vincolo di rotta si sposta al ramo `routes:` nello stesso commit della pagina, perche' l'errore opposto e' silenzioso"

key-files:
  created:
    - "src/app/(admin)/admin/(work)/location/page.tsx"
    - "src/app/(admin)/admin/(work)/location/loading.tsx"
    - "src/app/(admin)/admin/(work)/location/[id]/page.tsx"
    - "src/app/(admin)/admin/(work)/location/[id]/loading.tsx"
    - "src/app/(admin)/admin/location/SpaceName.tsx"
    - "src/app/(admin)/admin/location/SpaceList.tsx"
  modified:
    - "src/lib/routes/capability-routes.ts"

key-decisions:
  - "D-45-11-A: il nome dello spazio ha un renderer suo, `SpaceName.tsx`, invece di stare dentro `SpaceList.tsx` — e' il nome che il gate 45-06 pretende, e rende il criterio 2 strutturale su ENTRAMBE le superfici invece di ricordato su ciascuna"
  - "D-45-11-B: la lista NON ha embed. La derivazione delle due chiavi esterne e' scritta lo stesso, per chi aggiungera' il primo: un embed ambiguo qui sarebbe indistinguibile dal seed non ancora eseguito"
  - "D-45-11-C: ordinamento per stadio (piu' avanzato prima) e poi per nome, calcolato in JS perche' `ORDER BY stage` su una colonna `text` ordina alfabeticamente e produce quattro parole in un ordine che non significa nulla"
  - "D-45-11-D: `/admin/location` entra nella lista `wide` chiusa di 41-UI-SPEC §4 — per decisione, come la lista del calendario, e con la stessa qualifica (l'oggetto primario e' una tabella densa). Il dettaglio resta `default`"
  - "D-45-11-E: la porta dalla lista al dettaglio e' stata scritta nel commit del Task 2 e non del Task 1, perche' `typedRoutes` rifiuta a compile time un `Link` verso un indirizzo dinamico la cui `page.tsx` non e' su disco"
  - "D-45-11-F: un fallimento della lettura del catalogo format non abbatte la pagina — la carta dei punteggi porta la propria frase. Perdere l'intero record per una carta su sei e' peggio del difetto che eviterebbe"

requirements-completed: [PROD-02]

# Metrics
duration: 22min
completed: 2026-08-17
---

# Phase 45 Plan 11: La sezione Location, in sola lettura — Summary

**Sei file e un vincolo spostato: una lista dove ogni nome porta il proprio stadio perche' un solo componente puo' renderlo, e un dettaglio dove ogni domanda senza risposta lo dice a parole — su tabelle che oggi sono vuote, ed e' lo stato in cui la sezione entra in servizio.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-08-17T19:12:57Z
- **Completed:** 2026-08-17T19:34:40Z
- **Tasks:** 2
- **Files modified:** 7 (6 creati, 1 modificato)

## Accomplishments

- **La prima superficie della fase che legge una tabella vera**, con il client legato al cookie e nessun service client — quindi cio' che rende e' cio' che la policy concede, non cio' che la pagina chiede.
- **Il vincolo della location ha lasciato il ramo `scope: "table"` nello stesso commit della sua pagina.** Era l'unico ordine possibile: l'errore opposto non produce ne' un errore di build ne' una riga di log.
- **La guardia del criterio 2 e' diventata strutturale.** Il nome di uno spazio non ha una forma, in nessuna delle due superfici, che non porti accanto lo stadio — non perche' due file se lo ricordano, ma perche' esiste un solo componente che puo' disegnarlo.
- **L'aritmetica del punteggio ha un chiamante**, per la prima volta da quando 45-07 l'ha scritta: quattro format per spazio, mappati sul catalogo e non sui risultati calcolabili.
- **La correzione sulla capienza e' arrivata a valle intatta.** La superficie non dice, da nessuna parte, che nessuno spazio ha una capienza.

## Task Commits

1. **Task 1: la lista, il segnaposto, i due componenti, e il vincolo spostato** — `e5e2453` (feat)
2. **Task 2: il dettaglio, il suo segnaposto, e la porta che prima non compilava** — `e2d27d0` (feat)

## Files Created/Modified

- `src/app/(admin)/admin/(work)/location/page.tsx` — guardia di pagina, client legato al cookie, una lettura senza embed, tre esiti e mai due, ordinamento per stadio.
- `src/app/(admin)/admin/(work)/location/loading.tsx` — sette card come letterale; `grep -cE "length|count"` restituisce **1**, e la sola riga che matcha e' `Array.from({ length: 7 })`.
- `src/app/(admin)/admin/(work)/location/[id]/page.tsx` — controllo di forma dell'uuid prima del client, due letture, ogni embed verificato, sei carte, l'indirizzo in un posto solo.
- `src/app/(admin)/admin/(work)/location/[id]/loading.tsx` — cinque card come letterale, e **nessun segnaposto per le due carte di notifica**: uno scheletro che disegnasse *uscito* o *acquisito* farebbe quelle due affermazioni prima che qualcosa sia stato letto.
- `src/app/(admin)/admin/location/SpaceName.tsx` — nome + `StageBadge`, nessun early return, nessun ramo che produca il nulla.
- `src/app/(admin)/admin/location/SpaceList.tsx` — cinque colonne, `SpaceRow` senza indirizzo e senza punteggio (assenti, non opzionali).
- `src/lib/routes/capability-routes.ts` — la voce spostata; l'intestazione delle sezioni scende da tre a due; il conteggio di `alsoGatesTables` corretto da sei a sette.

## La decisione che vale la pena difendere: `SpaceName.tsx`

Il piano chiedeva che `SpaceList.tsx` fosse *«the one renderer of a space's name, always beside its stage»*, con criterio d'accettazione `grep -c "StageBadge" SpaceList.tsx` ≥ 1. **Non l'ho fatto cosi', e la ragione e' misurabile.**

`scripts/verify-section-surface.mjs` — il gate scritto dal piano 45-06, prima delle superfici, esattamente per vincolarle — dichiara **per nome** i file autorizzati, e la sua intestazione dice come va letto il rapporto: *«The surfaces satisfy this list; the list does not describe them.»* Il file che nomina per il nome di uno spazio e' `SpaceName.tsx`, e pretende che contenga `StageBadge`.

Ho quindi creato `SpaceName.tsx` (nome + badge, un solo ramo) e ho fatto passare da li' **entrambe** le superfici — `SpaceList.tsx:279` e `[id]/page.tsx:319`.

**Cosa costa:** il criterio letterale del piano non e' soddisfatto — `grep -c "StageBadge" SpaceList.tsx` restituisce **0**.

**Cosa compra, misurato e non argomentato.** Creando temporaneamente le quattro directory mancanti dello scope del gate e rilanciandolo:

```
✓ A   the stage stands beside the name, in one renderer
      SpaceName.tsx is the only file that may render a space's name, and it names StageBadge
```

Con il badge dentro `SpaceList.tsx`, il check A sarebbe stato **rosso**: `SpaceName.tsx is not in scope … its absence is not a pass`.

E c'e' la ragione di dominio, che e' la piu' importante delle due: il criterio dice *wherever the space is named*, e le superfici che nominano uno spazio sono **due**. Una regola scritta in una colonna va riscritta nel dettaglio, e poi in ogni superficie che l'una o l'altro faranno crescere. Un componente che prende nome e stadio insieme non ha una forma d'ingresso che porti l'uno senza l'altro.

**L'equivalente del criterio, verificato:**

| Asserzione | Esito |
|---|---|
| `grep -c "StageBadge" src/app/(admin)/admin/location/SpaceName.tsx` | **4** (import, resa, due righe di prosa) |
| `grep -c "return null" .../SpaceName.tsx` | **0** |
| `grep -c "return null" .../SpaceList.tsx` | **0** |
| chi rende un nome di spazio, in tutto lo scope | `SpaceName.tsx` e nessun altro — check A verde |
| chiamanti di `SpaceName` | 2: `SpaceList.tsx:279`, `[id]/page.tsx:319` |

## La correzione che questo piano eredita e non ha ripetuto

`45-CONTEXT.md` afferma **due volte** che la capienza numerica e' nulla su tutti e 184 i record, e il piano 45-11 lo ripete alla lettera nella propria `<action>`: *«Measured: it is null on all 184 records, so how many people actually fit has no answer for any space today»*.

**E' falso**, e la correzione era gia' scritta nel docblock §(e) di `score.ts`: il piano 45-01 ha contato l'export campo per campo e ha trovato **38 record su 184 con un numero**, su venti valori distinti; gli altri 146 sono vuoti.

Conseguenza concreta su questa superficie, e non e' una nota a margine:

1. **Nessun file di questo piano dice che nessuno spazio ha una capienza.** Il testo che dichiara la misura sta in `SpaceList.tsx` e in `(work)/location/page.tsx`, e dice 38 su 184.
2. La capienza e la banda stanno in **colonne adiacenti** nella lista e in **campi adiacenti** nel dettaglio, proprio perche' e' li' che un lettore dedurrebbe l'una dall'altra. Nessun `?? 0` in nessun mapper.
3. Le due frasi di assenza sono **diverse a parole**: la banda dice *Not asked yet* (la sua quarta voce, che non e' una taglia — 17 record su 184), la capienza dice *Capacity not measured*. Due domande diverse: una si chiude con una telefonata, l'altra con qualcuno in piedi nella stanza.

## Le tre invarianti di dominio, e dove stanno in codice

**«Una classifica non e' una disponibilita'.»** La lista non e' ordinata da nulla di calcolato — `orderByStageThenName` legge lo stadio e il nome — e sopra la lista c'e' un paragrafo che non sta dietro un click: *Desk work. **Nobody has been called.*** La `caption` della tabella lo ripete per chi legge con uno screen reader. I punteggi stanno sul dettaglio, uno per format, ognuno con la propria provenienza e il conteggio delle domande davvero risposte.

**«Lo stato prima del nome.»** Vedi sopra: e' una struttura, non una regola.

**«Fuori identita' resta visibile.»** `ExitCell` disegna un mark sulla riga; non c'e' nessun ramo, in nessuno dei due file, che tolga una riga dalla lista. Sul dettaglio la notifica dell'uscita sta **in cima**, sopra tutto cio' che qualifica.

**La tensione che 45-07 ha lasciato aperta non e' stata chiusa in silenzio.** `exit_reason` sta sullo spazio mentre il dominio legge l'idoneita' per format. `ExitNotice` lo dice a parole al lettore — *«Recorded against this space, not against one format … which is a difference nobody has decided how to close»* — e la carta dei punteggi continua a disegnare tutti e quattro i risultati, perche' e' l'aritmetica che il modulo esegue gia'.

## Lo stato in cui la sezione entra in servizio: vuota

Le cinque tabelle sono in produzione dal 2026-08-17 (piano 45-08) e **non hanno righe**: il seed e' il piano 45-10, che e' un'autorizzazione separata a scrivere in produzione e non e' stata chiesta. La resa ordinaria di questa pagina, oggi, e' lo stato vuoto — quindi lo stato vuoto **dice quale vuoto e'**:

> **No space has been imported yet** — *The scouting is a local file and the import is a local script. There is nothing to upload here — the file never leaves the machine that holds it.*

La seconda frase non e' decorazione: senza, un pulsante di upload mancante si legge come una feature non finita e qualcuno lo costruisce — il che metterebbe l'intero archivio di scouting su una strada che finisce in un repo pubblico.

E il fallimento di lettura ha una frase **diversa**, con `role="alert"`, perche' su questa sezione *non c'e' niente* e' l'esito atteso e sarebbe il posto piu' facile del prodotto in cui nascondere un errore.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correttezza strutturale] Il renderer del nome e' `SpaceName.tsx`, non `SpaceList.tsx`**

- **Found during:** Task 1
- **Issue:** il gate 45-06, gia' committato, dichiara `SpaceName.tsx` come unico file autorizzato a rendere il nome di uno spazio, e pretende che contenga `StageBadge`. Il criterio d'accettazione del piano chiedeva il badge dentro `SpaceList.tsx`, che avrebbe reso **rosso** il check A.
- **Fix:** creato `SpaceName.tsx`; `SpaceList.tsx` e `[id]/page.tsx` passano entrambi da li'.
- **Files:** `src/app/(admin)/admin/location/SpaceName.tsx` (nuovo)
- **Verification:** check A verde (misurato creando temporaneamente le quattro directory mancanti dello scope, poi rimosse).
- **Committed in:** `e5e2453`

---

**2. [Rule 1 - Bug] Il piano ripeteva l'errore di `45-CONTEXT.md` sulla capienza**

- **Found during:** Task 1
- **Issue:** l'`<action>` del piano prescrive di scrivere *«Measured: it is null on all 184 records»*. La misura di 45-01, riportata nel docblock §(e) di `score.ts`, dice 38 su 184.
- **Fix:** i due file che dichiarano la misura riportano 38 su 184 e la conseguenza; nessun file di questo piano afferma che la capienza sia nulla ovunque.
- **Files:** `SpaceList.tsx`, `(work)/location/page.tsx`
- **Committed in:** `e5e2453`

---

**3. [Rule 3 - Blocking] La porta verso il dettaglio non compilava nel Task 1**

- **Found during:** Task 1, `npm run build`
- **Issue:** `Type error: Type '`/admin/location/${string}`' is not assignable to type 'UrlObject | RouteImpl<…>'` — `typedRoutes` mette un indirizzo dinamico nell'unione `Route` generata solo quando una `page.tsx` lo serve, e nel Task 1 non era ancora su disco.
- **Fix:** il Task 1 rende il nome come testo con il motivo scritto accanto; il Task 2 crea la destinazione e sostituisce il testo con il `Link`. E' il rifiuto del compilatore che funziona, non una scorciatoia: l'albero non ha modo di puntare a un indirizzo che non esiste.
- **Files:** `src/app/(admin)/admin/location/SpaceList.tsx` (toccato in entrambi i commit)
- **Committed in:** `e5e2453`, poi `e2d27d0`

---

**4. [Rule 1 - Bug] `sm:` non e' un tier di questo albero**

- **Found during:** Task 2, `npm run verify:breakpoints`
- **Issue:** la griglia degli attributi usava `sm:grid-cols-2`. Check B: *«§2.1 fixes the tiers on md: (768px) and lg: (1024px). sm: 640px puts the tablet layout on a phone held sideways»*. Il gate era **rosso e nominava solo il mio file**.
- **Fix:** `md:grid-cols-2`, con il motivo scritto accanto.
- **Verification:** `npm run verify:breakpoints` esce **0**.
- **Committed in:** `e2d27d0`

---

**5. [Rule 2 - Correttezza] Il conteggio di `alsoGatesTables` e la nota sulle tre sezioni erano diventati falsi**

- **Found during:** Task 1
- **Issue:** il docblock di `alsoGatesTables` diceva *«Six of the seventeen do»* e *«The other three gate rows that do not exist yet»*. Dal 2026-08-17 (piano 45-08) le tabelle esistono e le policy sono vive per tutte e quattro le chiavi di sezione, e questo commit aggiunge il flag alla location. Il file stesso dichiara che *«a count in a comment is a claim nothing checks»*.
- **Fix:** conteggio corretto a **sette**; spiegato che manifesto e visual gia' vincolano righe e non portano il flag solo perche' il campo non esiste sul ramo su cui stanno; l'obbligo assolto della location e' **rimosso** dall'intestazione, non lasciato con un segno di spunta accanto.
- **Files:** `src/lib/routes/capability-routes.ts`
- **Committed in:** `e5e2453`

---

**Total deviations:** 5 auto-fixed (2 bug, 2 correttezza, 1 blocking)
**Impact on plan:** nessun allargamento di perimetro. Un file in piu' rispetto a `files_modified` (`SpaceName.tsx`), e la ragione e' un gate gia' committato.

## Issues Encountered

**1. Tre criteri d'accettazione hanno un'aritmetica che non torna, e due sono irraggiungibili alla lettera.**

| Criterio | Restituisce | Perche' |
|---|---|---|
| `grep -c "createClient" page.tsx` → 1 | **3** | import, chiamata, e una riga di prosa che nomina `createClient`. **Il file analogo da cui il criterio e' copiato — `(work)/calendar/page.tsx` — restituisce lo stesso 3.** L'asserzione sostanziale regge: **una** costruzione di client, ed e' quella legata al cookie; `grep -c "getServiceClient\|supabase/service"` restituisce **0** |
| `grep -c "form\|action=" [id]/page.tsx` → 0 | **impossibile** | la pagina disegna **quattro format**, e `format` contiene `form`. L'asserzione sostanziale — nessun percorso di scrittura — e' verificata con `grep -cE "<form\|action=\|use server\|useActionState\|formAction"`, che restituisce **0** |
| `grep -c "StageBadge" SpaceList.tsx` ≥ 1 | **0** | per decisione D-45-11-A, vedi sopra |

E' la stessa famiglia dell'errore che il piano 45-07 ha registrato sul proprio criterio *«returns 3»*: un'aritmetica di grep scritta senza eseguirla. Nessuno dei tre indica un difetto del codice, e per tutti e tre l'asserzione sostanziale e' verificata con un comando che ho eseguito.

**2. `verify:section-surface` esce ancora 2, e nessun check e' passato da REFUSED a un verdetto.**

Il criterio del Task 2 chiedeva di registrare *«which checks moved from REFUSED to a verdict»*. La risposta onesta e' **nessuno**, e il motivo e' strutturale: il gate rifiuta **prima di misurare qualsiasi cosa** se anche una sola delle sette directory dello scope manca. Prima di questo piano ne mancavano cinque; ora ne mancano quattro, tutte del piano 45-12.

**3. `provenance` compare su quattro righe di `(work)/location/`, non su una.**

Il criterio chiede che le occorrenze siano *«only lines that pass a value into one of the two cells»*. Misurato:

| Riga | Cos'e' |
|---|---|
| `[id]/page.tsx:218` | la stringa del `select` — la colonna va chiesta al database |
| `[id]/page.tsx:292` | il mapper verso `SpaceForScoring` — un modulo puro, che non disegna |
| `[id]/page.tsx:473` | **il passaggio dentro `AttributeCell`** ✓ |
| `[id]/page.tsx:961` | il `Pick` del tipo di riga |

Tre delle quattro sono inevitabili e **nessuna rende niente**: una query, un mapper verso una funzione pura, una dichiarazione di tipo. Il fine del criterio — che nessun altro file *disegni* da dove viene un valore — e' rispettato: l'unico renderer e' `AttributeCell`.

## Verification

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | eseguito dopo ogni task; `/admin/location` e `/admin/location/[id]` compaiono entrambi nella route table |
| `npm run verify:routes` | **0** | e' l'unico che vede l'indirizzo dinamico: l'asserzione all'indietro del build legge l'unione generata, che non contiene rotte dinamiche |
| `npm run verify:breakpoints` | **0** | rosso durante il Task 2 per causa mia, riparato nello stesso task |
| `npm run verify:tables` | **0** | nessuna `<table>` scritta a mano: la lista usa il primitivo |
| `npm run verify:tokens` · `verify:semantic-separation` · `verify:dialogs` | **0** | |
| `npm run lint` | problemi **pre-esistenti** | nessuno dei sette file compare nell'output (`npm run lint \| grep -i location` → vuoto) |
| `npm run verify:section-surface` | **2** | REFUSED, **come prima di questo piano**: quattro delle sette directory dello scope non esistono ancora (piano 45-12) |
| `npm run verify` | **2** | **identico al baseline misurato prima di toccare l'albero**: gli stessi cinque gate rifiutano (`capabilities`, `conversion`, `section-surface`, `section-export`, `touch-targets`), e *«No gate that reached a verdict reported a failure»* |

**La misura che il gate non poteva fare da solo.** Creando temporaneamente le quattro directory mancanti dello scope, `verify:section-surface` ha misurato davvero: **A ✓, B ✗, C ✗, D ✓, E ✓**. I due rossi non appartengono a questo piano — sono i nomi dei renderer di 45-07 (`ScoreCell.tsx` invece di `SpaceScore.tsx`) e `SectionVoid.tsx`, che e' della 45-12. Registrato come **DEF-45-04**. Le directory di prova sono state rimosse e non sono state committate.

### Cosa un verde NON significa qui

- **Nessuna riga e' mai passata da queste query.** Le tabelle sono vuote e il seed e' il piano 45-10. Il build fa il typecheck **contro le dichiarazioni** di `src/types/database.ts`, e nessun client Supabase di questo repo e' parametrizzato con `Database`: i cast sono asserzioni, non controlli.
- **L'aritmetica del punteggio non e' stata esercitata su una riga vera.** 45-07 diceva che sarebbe successo qui. Non e' successo: e' successo che ha un chiamante che compila. Succedera' dopo il piano 45-10.
- **Nessun controllo ha aperto una sessione.** Che la sezione sia rifiutata a chi il modello dei permessi non ammette e' `verify:refusal` e la procedura P1, non questo piano.
- Non esiste alcun test runner per il prodotto. Dirlo e' obbligatorio.

### Procedura manuale scritta, da eseguire dopo il seed (piano 45-10)

Non eseguibile oggi: le tabelle sono vuote. Va eseguita alla prima resa con dati, e chiude anche i punti 2–7 della procedura che 45-07 aveva lasciato scritta.

1. Con un ruolo che tiene `production.location.manage`, aprire `/admin/location`.
   - **Attesa:** la lista, con il paragrafo *Nobody has been called* sopra di essa; ogni nome con un badge di stadio accanto; nessun indirizzo in nessuna colonna.
2. Con un ruolo che **non** tiene la chiave, aprire lo stesso indirizzo.
   - **Attesa:** redirect a `/dashboard`, senza che la lista appaia neanche per un istante.
3. Sulla lista, verificare che **nessuna riga** mostri un numero che possa leggersi come punteggio, e che l'ordine sia per stadio e poi alfabetico.
4. Aprire uno spazio in stadio `mapped` senza telefonate.
   - **Attesa:** le quattro domande dicono, ciascuna con la propria frase, che nessuno ha chiesto; la colonna Resonate dice **`Too few answers`** e mai un numero; la riga RamaDub dice **`No weighting`**, mai un numero e mai uno zero.
5. Su uno spazio con almeno meta' del peso Resonate risposto: un numero a una cifra decimale **con accanto** `Derived from the profile` e il conteggio `n/4 answered`.
6. Su uno spazio con `size_band = 'not_asked'` e `real_capacity` nulla.
   - **Attesa:** due frasi **diverse** — `Not asked yet` per la banda, `Capacity not measured` per la capienza. Se si assomigliano, il gate *una banda non e' una capienza* e' perso all'ultimo pixel.
7. Su uno spazio con `exit_reason = 'out_of_identity'`: la notifica in cima, lo spazio **ancora in lista**, `Out of identity` senza numerale sulle colonne, e la frase che dice che la ragione e' registrata sullo spazio e non su un format.
8. Su uno spazio `acquired`: la riga dell'accordo, verbatim, sopra le carte.
9. Su qualunque spazio: cercare l'indirizzo nella pagina. Deve comparire **una volta sola**, nella carta `THE RECORD`. Non nel titolo, non in un link, non in un `aria-label`.
10. Con la console del browser e i log del server aperti, ricaricare entrambe le pagine.
    - **Attesa:** nessuna riga che contenga un nome o un indirizzo. Un fallimento indotto (per esempio revocando la policy) deve produrre `code=… message=…` e nient'altro.
11. A 390px di larghezza: la lista rende le card e non la tabella; il dettaglio rende gli attributi su una colonna.

## Known Stubs

Nessuno. I sette file sono completi per il loro perimetro: ogni ramo che i loro tipi ammettono e' disegnato, nessun valore finto raggiunge uno schermo, nessun `TODO` e nessun dato hardcoded.

Due assenze sono **decisioni dichiarate e non stub**:

- **Nessuna tab nella navigazione.** E' il piano 45-18, e il file di routing dice perche' l'ordine e' forzato: `StaffTab.href` e' `Route`, e un indirizzo statico entra nell'unione generata solo quando una pagina lo serve.
- **Nessun percorso di scrittura.** E' il piano 45-13. L'assenza e' scritta nel docblock del dettaglio perche' su una colonna in particolare — *will it discuss later hours* — l'assenza e' il requisito, non un lavoro rimandato.

## Threat Flags

Nessuna nuova superficie di sicurezza: nessun endpoint aperto, nessun percorso d'autenticazione toccato, nessuno schema cambiato, nessun pacchetto installato.

Le mitigazioni del registro, in codice:

- **T-45-01** — entrambe le pagine leggono con `createClient()` e nessuna costruisce un service client (`grep -c "supabase/service"` → 0 su entrambe). Il nome viaggia in una cella e nel titolo del dettaglio; l'indirizzo **non e' letto affatto dalla lista** — non e' nel `select` e non e' un campo di `SpaceRow` — e sul dettaglio e' reso una volta sola.
- **T-45-02** — due `console.error`, entrambi con `code=` e `message=` e nient'altro. Check E del gate: **verde**.
- **T-45-13** — i punteggi passano solo da `ScoreCell`, gli attributi solo da `AttributeCell`, la capienza non e' mai dedotta dalla banda, e il badge di stadio non ha un ramo che produca il nulla.
- **T-45-04** — la voce e' passata al ramo `routes:` con `alsoGatesTables: true` **nello stesso commit della pagina**.
- **T-45-05** — l'ambiguita' dei due nuovi pattern e' derivata nel docblock della voce e `npm run verify:routes` esce 0.
- **T-45-SC** — nessun pacchetto installato.

## User Setup Required

Nessuna. Un avvertimento operativo invece si': `capability-routes.ts` lancia a **module load dentro il bundle del middleware**, non al build — quindi il primo deploy che porta questi due pattern va fatto **in un giorno senza serate**, facendo la prima richiesta di persona.

## Next Phase Readiness

- **45-12 (manifesto e visual)** e' il piano che completa lo scope di `verify:section-surface`, quindi e' **il primo che vedra' il gate misurare davvero** — e vedra' i check B e C rossi per cause che non sono sue. Leggere **DEF-45-04** prima di iniziare.
- **45-13 (scrittura)** eredita due vincoli scritti in codice: `extended_hours_stance` non puo' essere mossa da niente che non sia una telefonata registrata, e ogni nuovo `console.error` deve portare `code=` e `message=` e nient'altro — il check E li leggera' tutti.
- **45-18 (la tab)** ha ora la sua precondizione: `/admin/location` e' su disco e nell'unione generata.
- **45-10 (il seed)** e' cio' che rende eseguibile la procedura manuale qui sopra, ed e' l'unica cosa che fara' passare una riga vera dall'aritmetica di `score.ts`.

## Self-Check: PASSED

**File dichiarati creati — esistenza verificata:**

- `src/app/(admin)/admin/(work)/location/page.tsx` — FOUND
- `src/app/(admin)/admin/(work)/location/loading.tsx` — FOUND
- `src/app/(admin)/admin/(work)/location/[id]/page.tsx` — FOUND
- `src/app/(admin)/admin/(work)/location/[id]/loading.tsx` — FOUND
- `src/app/(admin)/admin/location/SpaceName.tsx` — FOUND
- `src/app/(admin)/admin/location/SpaceList.tsx` — FOUND
- `src/lib/routes/capability-routes.ts` — FOUND (modificato)

**Commit dichiarati — esistenza verificata:** `e5e2453`, `e2d27d0`.

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
