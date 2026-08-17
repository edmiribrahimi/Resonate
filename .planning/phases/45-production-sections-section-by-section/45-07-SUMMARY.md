---
phase: 45-production-sections-section-by-section
plan: 07
subsystem: ui
tags: [typescript, react, discriminated-union, venue-acquisition, scoring, provenance]

# Dependency graph
requires:
  - phase: 45-01
    provides: "i vocabolari chiusi (ATTRIBUTE_KEYS, ATTRIBUTE_VALUES, ATTRIBUTE_PROVENANCE, EXIT_REASONS, ANSWERS_SOURCE) e le cinque tabelle con i loro CHECK"
provides:
  - "src/lib/production/sections/score.ts — i pesi per format letti da venue-acquisition.md, e un'unione risultato senza variante a numero nudo"
  - "src/components/production/StageBadge.tsx — un solo badge di stadio, raggiungibile da due superfici"
  - "src/app/(admin)/admin/location/ScoreCell.tsx — il renderer che rende irrappresentabile un punteggio senza provenienza"
  - "src/app/(admin)/admin/location/AttributeCell.tsx — il renderer che rende irrappresentabile una domanda non fatta disegnata come vuoto"
affects: [45-08, 45-11, 45-06, 45-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "unione discriminata come tipo della prop: la forma nuda non e' rappresentabile (modello PieceDate.tsx)"
    - "provenienza dell'input piu' debole trasportata nello stesso valore del numero"
    - "not_asked fuori dal denominatore, mai contato come no"
    - "frasi a insiemi di parole disgiunti a coppie per varianti d'errore diverse"

key-files:
  created:
    - "src/lib/production/sections/score.ts"
    - "src/components/production/StageBadge.tsx"
    - "src/app/(admin)/admin/location/ScoreCell.tsx"
    - "src/app/(admin)/admin/location/AttributeCell.tsx"
  modified:
    - "src/app/(admin)/admin/calendar/CalendarList.tsx"
    - "src/app/(admin)/admin/(work)/calendar/[id]/page.tsx"

key-decisions:
  - "D-45-07-A: i pesi hanno DUE sorgenti, non una — attributo e capienza-in-target — perche' venue-acquisition.md pesa 2,5 su 10 una cosa che l'archivio non tiene come attributo, e ripiegarla sarebbe stato inventare un undicesimo attributo o far sparire un quarto della ponderazione di Resonate"
  - "D-45-07-B: la soglia di sufficienza si misura sul PESO risposto (meta' della ponderazione dichiarata), non sul numero di criteri, perche' i pesi sono disuguali per progetto: tre criteri su quattro possono essere l'80% o il 30% della ponderazione"
  - "D-45-07-C: i quattro gradini della scala valgono 1 / 2:3 / 1:3 / 0 — spaziatura uniforme, perche' la fonte non dichiara alcuna spaziatura e una curva disuniforme codificherebbe un giudizio che nessuno ha espresso"
  - "D-45-07-D: out_of_identity viene valutato PRIMA di weights_not_declared — una decisione registrata da una persona batte una ponderazione non dichiarata"
  - "D-45-07-E: la capienza eredita la provenienza da answers_source, e con answers_source=not_asked resta 'derived': un numero presente mentre nessuno ha telefonato viene da una pagina pubblica"
  - "D-45-07-F: lo zero di out_of_identity si dice a parole e non come numerale — l'unione non lo porta come number, quindi non e' ordinabile ne' mediabile ne' confondibile con un punteggio basso"

patterns-established:
  - "Pattern: un peso di dominio che l'archivio non sa rispondere si dichiara come criterio a sorgente diversa, mai si lascia cadere in silenzio"
  - "Pattern: una mappatura fra la parola del modulo di dominio e la parola dell'archivio si scrive sulla riga del peso, con la ragione e con la direzione dell'errore (sotto- o sopra-accreditare)"
  - "Pattern: Exclude<Union, 'not_asked'> su un Record di crediti rende un errore di compilazione l'aggiunta della chiave che romperebbe la regola del denominatore"

requirements-completed: [PROD-02]

# Metrics
duration: 13min
completed: 2026-08-17
---

# Phase 45 Plan 07: Score, Stage Badge, Cells Summary

**Il punteggio per format si calcola dai dieci attributi con i pesi letti da `venue-acquisition.md`, non si conserva in nessuna colonna, e viaggia dentro un'unione a quattro varianti dove un numero senza provenienza non e' una forma esprimibile.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-08-17T18:31:25Z
- **Completed:** 2026-08-17T18:44:06Z
- **Tasks:** 3
- **Files modified:** 6 (4 creati, 2 importatori aggiornati, 1 spostato)

## Accomplishments

- **Un modulo puro** che tiene i pesi di tre format su quattro e **rifiuta di calcolare** per il quarto, invece di inventargli dei numeri.
- **Un solo badge di stadio nell'albero**, spostato con le sue tre ragioni intatte e senza shim dietro il vecchio percorso.
- **Due celle** in cui la regola non e' ricordata ma strutturale: la prop di `ScoreCell` e' l'unione, e `AttributeCell` non ha un ramo che produca il nulla.
- **Una correzione misurata portata a valle** — la capienza numerica non e' nulla su tutti e 184 i record — con la conseguenza per la superficie scritta, non lasciata dedurre.

## Task Commits

1. **Task 1: `score.ts` — i pesi, e il risultato che non puo' essere un numero nudo** — `2a500ba` (feat)
2. **Task 2: il badge di stadio, spostato** — `206d6a6` (refactor)
3. **Task 3: `ScoreCell` e `AttributeCell`** — `a45091a` (feat)

## Files Created/Modified

- `src/lib/production/sections/score.ts` — pesi per format keyati su `formats.code`, unione risultato a quattro varianti, calcolo puro (nessuna lettura, nessuna scrittura).
- `src/components/production/StageBadge.tsx` — spostato da `src/app/(admin)/admin/calendar/`; **zero byte di differenza**, verificato con `git diff --cached --stat -M`.
- `src/app/(admin)/admin/calendar/CalendarList.tsx` — import aggiornato al nuovo percorso.
- `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx` — import aggiornato al nuovo percorso.
- `src/app/(admin)/admin/location/ScoreCell.tsx` — unico renderer di un punteggio; quattro canali, nessuno e' una tinta.
- `src/app/(admin)/admin/location/AttributeCell.tsx` — unico renderer di un valore d'attributo; `not_asked` e' una parola.

## La correzione che questo piano eredita e trasmette

**`45-CONTEXT.md` sbaglia due volte sulla capienza numerica, e la correzione e' scritta nel codice, non solo qui.**

Il contesto afferma *«numeric capacity is null on all 184»* nella revisione di D-45-11 e *«numeric is null on all 184»* nella tabella di `<code_context>`, e ne deriva la conseguenza operativa: *«"quante persone ci stanno davvero" non ha risposta per nessuno spazio oggi»*.

**Il piano 45-01 ha misurato l'export locale: 38 record su 184 portano un numero**, su venti valori distinti; gli altri 146 sono vuoti.

Cosa cambia qui, concretamente:

1. Il criterio *capienza in target 150–300* di Resonate — 2,5 di 10 — **e' un criterio rispondibile**, non un peso morto. Se la capienza fosse davvero nulla ovunque, quel peso sarebbe stato permanentemente fuori dal denominatore e la ponderazione di Resonate avrebbe girato su 7,5 punti su 10 per sempre. Non e' cosi'.
2. `score.ts` legge `realCapacity` **quando c'e'** e lo tratta come non risposto **solo quando e' `null`**. Nulla lo deduce dalla banda.
3. **La superficie della location non puo' dire che nessuno spazio ha una capienza.** E' scritto nel docblock §(e) del modulo, dove chi scrivera' la pagina 45-11 lo trovera'.

**La misura minore, e vale come gate.** La banda di capienza ha quattro valori e **il quarto non e' una taglia**: `SIZE_BANDS` in `vocabulary.ts` lo nomina `not_asked`, presente su 17 record su 184. E' uno stato distinto, mai una banda piccola. Questo modulo non legge affatto `size_band`, il che rende l'errore non commettibile qui — ma la pagina lo leggera', ed e' la' che il gate serve.

## Decisions Made

Le sei decisioni sono in frontmatter (`D-45-07-A` … `D-45-07-F`). Le due che costano di piu' a rovesciare:

**Perche' i pesi hanno due sorgenti.** `venue-acquisition.md` assegna a Resonate *capienza in target 150–300* con peso **2,5 su 10**, e nessuno dei dieci attributi dell'archivio risponde a quella domanda: la banda non e' una capienza, e la capienza e' una colonna numerica. Le tre uscite possibili erano inventare un undicesimo attributo, lasciar cadere il peso in silenzio, o dichiarare una seconda sorgente. La seconda e' la peggiore — una ponderazione calcolata su tre quarti di se stessa e' un numero che nessuno puo' controllare — e la prima e' un vocabolario inventato per comodita' di calcolo. Quindi `WeightedCriterion` ha due varianti, `attribute` e `capacity_in_target`.

**Perche' la soglia e' sul peso e non sul conteggio.** Il criterio dominante vale 4 di 10 e il piu' leggero 1,5: tre criteri su quattro possono essere l'85% della ponderazione o il 30%. Una soglia sul conteggio direbbe *"tre su quattro, va bene"* nel caso in cui manca esattamente il criterio che decide. `ANSWERED_WEIGHT_FLOOR = 0.5` e' comunque una **scelta dichiarata, non una misura**: il dominio non enuncia alcuna soglia, ed e' scritto nel modulo che e' cosi'.

## Le tre mappature che divergono, e la direzione dell'errore

Il piano chiedeva di scrivere mappatura e ragione sulla stessa riga. Tre righe su nove non sono esatte, e tutte e tre sono nel modulo:

| Modulo di dominio | Archivio | Perche' divergono |
|---|---|---|
| *musica ammessa* (RSNT, 2) | `music_at_home` | Il modulo dice *permessa*, l'archivio gradua *gia' di casa*. Il secondo implica il primo, mai il contrario: la mappatura **sotto-accredita** e non sopra-accredita, ed e' la direzione sicura per un numero che decide chi si telefona per primo. |
| *musica e dj* (SNST, 3) | `music_at_home` | Stessa divergenza, stessa direzione. |
| *agibilita' fino a tardi* (RSNT, 1,5) e *agibilita' serale* (MTNLB, 1,5) | `evening_licence` per entrambi | Il modulo distingue **due domande diverse** — una notte che finisce alle sei, e una sera che finisce alle 22 — e l'archivio ha un attributo solo. La domanda piu' dura di Resonate viene quindi risposta qui da quella piu' morbida. La risposta dura sta nelle due colonne dedicate (`closing_time`, `extended_hours_stance`) e **`extended_hours_stance` non e' ripiegata dentro**, perche' e' `not_asked` per costruzione e nessuna deduzione puo' muoverla. **Un punteggio Resonate non chiude la domanda sull'orario di chiusura**, ed e' scritto nel modulo perche' chi legge il numero non creda il contrario. |

Tre attributi — `aperitivo_vocation`, `events`, `partnership` — non pesano in nessuna ponderazione dichiarata. `aperitivo_vocation` appartiene a quella che non c'e'; gli altri due sono contesto. Restano sullo spazio e non entrano nel calcolo, che e' cosa diversa dall'essere inutili.

## Le tre frasi non numeriche, e l'intersezione vuota

Criterio d'accettazione 3 del Task 3: le tre frasi non condividono alcuna parola. Misurato con uno script sui set di parole, minuscolizzati e senza punteggiatura:

| Variante | Badge | Frase |
|---|---|---|
| `weights_not_declared` | `No weighting` | *Nobody has written this format's weighting yet.* |
| `not_enough_answered` | `Too few answers` | *Too few questions have answers for a figure to mean anything.* |
| `out_of_identity` | `Out of identity` | *Kept on the list, never deleted, and scored zero.* |

- frasi 1 ∩ 2 = **∅**
- frasi 1 ∩ 3 = **∅**
- frasi 2 ∩ 3 = **∅**
- ogni badge ∩ ogni frase **di un'altra variante** = **∅** (verificato anche questo, perche' un badge e' letto insieme alla frase e condividere una parola li' avrebbe vanificato la disgiunzione delle frasi)

I tre passi successivi sono diversi quanto le frasi: scrivere una ponderazione, fare una telefonata, oppure **niente** — la terza e' una decisione gia' presa e correttamente registrata, e disegnarla come una lacuna sarebbe il collasso che l'unione esiste per impedire. Per questo `out_of_identity` prende un filetto **pieno** e le altre due un filetto **tratteggiato**: una decisione non e' un lavoro non finito.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Il secondo importatore di `StageBadge` non era in `files_modified`**

- **Found during:** Task 2
- **Issue:** Il piano elencava `CalendarList.tsx` come unico importatore. `/usr/bin/grep -rn "StageBadge" src` ne ha trovati **due**: anche `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx:19` importava dal vecchio percorso assoluto. Lasciarlo avrebbe rotto il build e violato il criterio d'accettazione *«`grep -rn "admin/calendar/StageBadge" src` returns nothing»*.
- **Fix:** import aggiornato a `@/components/production/StageBadge` **nello stesso commit dello spostamento**, come il piano prescrive per gli importatori.
- **Files modified:** `src/app/(admin)/admin/(work)/calendar/[id]/page.tsx`
- **Verification:** `/usr/bin/grep -rn "admin/calendar/StageBadge" src` → nessun risultato; `npm run build` esce 0.
- **Committed in:** `206d6a6`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** nessun allargamento di perimetro. Il piano aveva contato un importatore su due; il criterio d'accettazione che chiedeva zero riferimenti al vecchio percorso implicava gia' la correzione.

## Issues Encountered

**1. Il conteggio del criterio «le tre ragioni sono sopravvissute» ritorna 4, non 3.**

`grep -cin "never disappears\|normal-case\|why no colour" src/components/production/StageBadge.tsx` restituisce **4**. Le righe:

- `:12` — `── Why no colour, when four ordered stages…`
- `:24` — `── The badge NEVER disappears…`
- `:42` — `` `normal-case` is on the element…``
- `:50` — `<Badge className="normal-case">…`

Le tre ragioni **ci sono tutte e tre**. Il conteggio e' 4 perche' `normal-case` compare sia nella prosa che sull'elemento — ed e' l'elemento che *e'* la terza ragione, non una ripetizione. **Il criterio avrebbe restituito 4 anche prima dello spostamento**: e' un errore di aritmetica del piano, non un difetto del file. Non ho toccato il componente per farlo tornare a 3: il piano vieta esplicitamente di mettere una modifica e uno spostamento nello stesso diff, e il diff e' verificato puro (`git diff --cached --stat -M` → `0` righe cambiate sul file spostato).

**2. Il rifiuto della semantica di cautela e' argomentato senza scrivere il nome del token.**

Il piano chiede due cose che si contraddicono sulla lettera: *«argue the refusal of `--sem-warn` explicitly»* e *«`grep -cE "sem-(warn|crit|info|done)"` returns 0»*. Un commento che scrive il nome del token fa scattare il grep, e un commento non «renders text», quindi la clausola di deroga del criterio non si applica. Ho scelto il verde: in `ScoreCell.tsx` il rifiuto e' argomentato per intero — la semantica di cautela dichiara letteralmente *uno stato provvisorio*, `derived` e' lo stato di **maggioranza** (184 spazi, nessuna telefonata), e una cautela sulla maggioranza diventa lo sfondo della pagina — con il puntatore a `PieceDate.tsx:42-48` che il token lo nomina. La scelta e' dichiarata dentro il file stesso, in una parentesi, invece che nascosta.

## Verification

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | eseguito dopo ognuno dei tre task |
| `npm run verify:semantic-separation` | **0** | i cinque controlli verdi; i due nuovi componenti sono dentro `src/` e il controllo B ora li legge |
| `npm run lint` | 121 problemi **pre-esistenti** | nessuno dei quattro file nuovi/spostati compare nell'output |
| `npm run verify` | **2** | pre-esistente: `verify:capabilities` (env assente in worktree, DEF-45-02), `verify:conversion` e `verify:touch-targets` (lista `CONVERTED` stantia, DEF-45-01). Il comando dichiara: *«No gate that reached a verdict reported a failure»* |
| `npm run verify:touch-targets` | **2** | stessa causa DEF-45-01. Il criterio d'accettazione del Task 3 lo chiedeva a 0: **non e' ottenibile su questo albero** e non appartiene a questo piano. |
| `verify:section-surface` | **non esiste** | lo introduce il piano 45-06. La verifica del piano lo dava per esistente e in rifiuto a 2; oggi lo script non e' ancora nel `package.json`. |

**Cosa un verde NON significa qui.** Nessun punteggio e' stato calcolato su una riga vera. L'unione fa il typecheck contro delle dichiarazioni, e **l'aritmetica sara' esercitata per la prima volta sulla superficie del piano 45-11**. Questo repo non ha test runner per il prodotto: dirlo e' obbligatorio.

### Procedura manuale scritta, per quando la superficie esistera' (45-11)

Non eseguibile oggi — non c'e' pagina. Va eseguita alla prima resa:

1. Con un ruolo che raggiunge la sezione Location, aprire la lista degli spazi.
2. Su uno spazio in stadio `mapped` con nessuna telefonata: la colonna Resonate deve dire **`Too few answers`** con la frase, e **mai** un numero.
3. Su uno spazio con almeno meta' del peso Resonate risposto: deve comparire un numero a una cifra decimale **con accanto** `Derived from the profile` e il conteggio `n/4 answered`.
4. Sulla colonna RamaDub, **su ogni riga**: `No weighting`, mai un numero e mai uno zero.
5. Su uno spazio uscito con `exit_reason = out_of_identity`: `Out of identity`, la frase, **nessun numerale**, e lo spazio **ancora in lista**.
6. Su un attributo con valore `not_asked`: la cella dice `Not asked yet` e *Nobody has put the question.*, e **non** mostra una provenienza.
7. Ovunque lo spazio sia nominato, accanto c'e' `StageBadge`. Se manca, il punto 2 di D-45-11 non e' soddisfatto e un punteggio si legge come una disponibilita'.

## Known Stubs

Nessuno. I quattro file sono completi per il loro perimetro: `score.ts` calcola, i due renderer disegnano ogni variante che i loro tipi ammettono. Non hanno ancora un chiamante — ma **non avere un chiamante non e' uno stub**: il piano dichiara in `<verification>` che l'aritmetica viene esercitata dal piano 45-11, e nessuno dei quattro contiene un valore finto, un `TODO` o un dato hardcoded che raggiunga uno schermo.

## Threat Flags

Nessuna nuova superficie di sicurezza. Nessuno dei quattro file apre un endpoint, tocca un percorso d'autenticazione, legge un file o cambia uno schema. I due renderer ricevono **valori e provenienze, mai una riga**: non hanno modo di nominare uno spazio, che e' la mitigazione dichiarata per T-45-01.

Le tre mitigazioni del registro sono in codice:

- **T-45-13** — la provenienza e' quella dell'input piu' debole e viaggia nella stessa unione del valore (`score.ts`, `everyContributorFieldVerified`); nessuna variante porta un numero da solo; `not_asked` e' fuori dal denominatore (`answerFor` ritorna `null`, mai `0`).
- **T-45-13b** — `FORMAT_WEIGHTS` non ha voce per `RMDB` e la funzione ritorna `weights_not_declared`.
- **T-45-SC** — nessun pacchetto installato.

## User Setup Required

Nessuna — nessun servizio esterno da configurare.

## Next Phase Readiness

**Pronto per 45-11 (la superficie della location)**, che e' il primo chiamante:

- `computeFormatScore(formatCode, space)` prende `formats.code` e una forma **che non e' una riga**: attributi, `realCapacity`, `answersSource`, `exitReason`. Chi scrive la pagina compone quella forma e non passa la riga intera.
- La colonna deve nominare il format: `ScoreCell` **non lo stampa**, per scelta, e una cella tolta dalla sua colonna ha perso l'unica cosa che rende il suo numero leggibile.
- **Non ordinare fra colonne di format diversi.** E' scritto nel docblock §(b) del modulo: due risultati di due format sono due risposte a due domande diverse.

**Per 45-08 (l'import):** importare `real_capacity` dove esiste — 38 record — e `answers_source` coerente. Un import che lascia `answers_source` a `not_asked` fa leggere quei 38 numeri come `derived`, che e' corretto oggi e va rivisto quando qualcuno telefonera'.

**Una tensione lasciata aperta, non risolta qui.** `exit_reason` sta **sullo spazio**, mentre il dominio legge l'idoneita' **per format**: chi scrive *out of identity* sta esprimendo un giudizio per-format in una colonna che vale per tutto lo spazio. Il modulo lo dichiara nel docblock di `ScoreResult` invece di risolverlo, perche' risolverlo e' una decisione di schema e non di aritmetica. **Va portata al proprietario prima che qualcuno registri la prima uscita**, non dopo.

## Self-Check: PASSED

**File dichiarati creati — esistenza verificata:**

- `src/lib/production/sections/score.ts` — FOUND
- `src/components/production/StageBadge.tsx` — FOUND
- `src/app/(admin)/admin/location/ScoreCell.tsx` — FOUND
- `src/app/(admin)/admin/location/AttributeCell.tsx` — FOUND
- `src/app/(admin)/admin/calendar/StageBadge.tsx` — **assente**, come richiesto (nessuno shim)

**Commit dichiarati — esistenza verificata:** `2a500ba`, `206d6a6`, `a45091a`.

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
