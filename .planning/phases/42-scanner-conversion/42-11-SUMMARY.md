---
phase: 42-scanner-conversion
plan: 11
subsystem: infra
tags: [gates, conversion-manifest, touch-targets, dialogs, colour-vision, door]

requires:
  - phase: 42-scanner-conversion
    provides: "il recinto PHASE_42_PATHS e i suoi due gemelli, i meccanismi di deroga costruiti vuoti nell'onda 0 e 2, e le sostituzioni decise nell'onda 1"
  - phase: 42-scanner-conversion
    provides: "la porta convertita dai piani 42-06 … 42-10 — i tre esiti, la pillola, la palette grezza, l'alias del bordo, i due massimi"
provides:
  - "Il recinto della fase 42 sciolto in tutti e tre i posti in cui viveva, nello stesso commit"
  - "Le due route della porta dichiarate in CONVERTED, misurate dagli stessi strumenti di ogni altra superficie"
  - "Otto deroghe di palette, per utility e per riga, ognuna con il proprio argomento"
  - "La shell del lampo passata da un recinto di percorso a una voce ancorata al lookup di stato"
  - "I quattordici bersagli tattili sotto il minimo come DEBITO con un tetto congelato"
  - "verify:scan-legibility registrato nella suite — diciannovesimo gate offline, non opzionale"
affects: [42-VERIFICATION, la fase che paghera' DEF-42-03, la fase che portera' DS-05]

tech-stack:
  added: []
  patterns:
    - "Un DEBITO non e' un'esenzione: l'elemento e' misurato, fallisce, e il fallimento e' scritto con un numero che puo' solo scendere"
    - "Un tetto congelato in una costante separata rende la crescita di una lista un atto visibile invece di una riga in piu'"
    - "La formula di cautela di una voce CONVERTED cambia col dominio della superficie, non col template"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-11-SUMMARY.md
  modified:
    - scripts/conversion-manifest.mjs
    - scripts/verify-conversion.mjs
    - scripts/verify-dialogs.mjs
    - scripts/verify-touch-targets.mjs
    - scripts/verify-all.mjs
    - package.json

key-decisions:
  - "I task 1 e 2 sono un commit solo, e non per comodita': ognuna delle tre voci del task 2 rifiuta a exit 2 se atterra prima del recinto, e il check A e' rosso se atterra dopo. Nessun ordine in due commit e' uno stato che questo albero possa attraversare"
  - "PHASE_42_PATHS resta esportata e vuota invece di essere cancellata: due gate la confrontano con la propria e un drift rifiuta, quindi cancellarla trasformerebbe una coppia controllata in una non controllata"
  - "I quattordici bersagli sono un DEBITO con un tetto congelato a 14, misurato PRIMA che il recinto cadesse: un budget scritto dopo il primo verde sarebbe partito da qualunque numero avesse mostrato la corsa"
  - "Il resolver condiviso non stampa piu' la parola esenzione per il terzo chiamante: un debito chiamato esenzione insegnerebbe al lettore il contrario di cio' che la lista significa, nell'unico messaggio che legge mentre qualcosa non va"
  - "DEF-42-06 non e' stato riparato: e' registrato, cambia il colore, e nessun gate lo trova da solo — che e' esattamente perche' deve restare visibile"

patterns-established:
  - "Ratchet con tetto esterno: la lista puo' solo accorciarsi, e allungarla richiede di editare una costante datata e firmata"
  - "Una voce di debito che non risolve piu' RIFIUTA (exit 2); un elemento sotto soglia che nessuna voce nomina FALLISCE (exit 1). Due direzioni, due esiti"
  - "Un gate si registra quando esiste il codice che lo rende verde, mai prima: un rosso che aspetta e' indistinguibile da un rosso che segnala"

requirements-completed: [DS-04, RESP-05]

duration: ~95min
completed: 2026-08-18
---

# Fase 42 Piano 11: Il recinto giu', la porta misurata, il gate acceso — Summary

**La porta smette di essere una superficie di cui nessuno afferma nulla e diventa una superficie misurata dagli stessi strumenti di ogni altra: 36 dichiarate contro 34, zero dietro il recinto, zero non contate — e ogni cosa che il recinto teneva nascosta e' adesso una voce con un argomento, compresi quattordici bersagli tattili che nessun gate aveva mai visto.**

## Performance

- **Durata:** ~95 min
- **Task:** 3 su 3 (task 1 e 2 uniti in un commit — vedi Deviazioni)
- **File di prodotto modificati:** **0**. `git status --porcelain -- src/` vuoto a ogni commit
- **Commit:** 2

## Cosa e' cambiato, in numeri

| | prima | dopo |
|---|---|---|
| superfici dichiarate | 34 | **36** |
| `page.tsx` dietro il recinto della fase 42 | 2 | **0** |
| `page.tsx` non contate | 0 | **0** |
| deroghe di palette dichiarate | 0 | **8**, che perdonano 8 siti |
| superfici full-bleed dichiarate | 0 | **2**, applicate 2× |
| shell di dialogo perdonate | 4 | **5**, `REMAINING` resta **0** |
| bersagli tattili sotto soglia, visibili | 0 (nessuno guardava) | **14**, enumerati, tetto 14 |
| gate offline nella suite | 18 | **19** |
| voci `EXEMPT_PATHS` | 2 | **2** — invariato, verificato contro `HEAD` |

## Il commit che apre il recinto — `ed7dc8b`

### Il recinto, in tre posti e in un commit

`PHASE_42_PATHS` svuotata in `scripts/conversion-manifest.mjs:228`, e le due
locali con lei in `scripts/verify-dialogs.mjs` e `scripts/verify-touch-targets.mjs`.
Il docblock che argomentava per il recinto e' uscito con lui: il suo argomento
era speso, e una delle sue frasi descriveva un wrapper di navigazione che il
piano 42-07 ha cancellato — un recinto il cui testo nomina un file che l'albero
non ha piu' e' un recinto che nessuno puo' controllare.

**La costante resta esportata e vuota.** Tre consumatori la leggono: uno rifiuta
se non e' un array, due la confrontano con la propria e rifiutano su un drift.
Cancellarla avrebbe trasformato una coppia confrontata in una non confrontata,
che e' la direzione di fallimento che stampa un tick.

### La porta dichiarata — due voci, non una

`/admin/scanner` e `/door`, entrambe `default`. `focus` e' **non disponibile**
e non rimandata: il check E fallisce ogni superficie che la dichiara mentre
monta una navigazione, e questa ne monta una bloccata sulla forma telefono.
`wide` avrebbe significato aggiungere due route a una lista **chiusa**, che e'
una decisione che nessuno ha preso.

**La formula di cautela e' stata riscritta per il dominio.** Quella che tutte le
altre trentaquattro voci portano — *no query changed, no column added, no
capability check touched, no action payload altered* — parla di denaro e di
query. Questa superficie parla di una porta, alle due di notte, con una mano,
davanti a una fila, con la radio spenta. Quindi l'affermazione che un revisore
tiene contro il diff, citata per esteso:

> no outcome changed — the three the scanner can say are still three, still the
> same type, still reached from the same call sites; no dwell changed; no haptic
> changed, nor the outcome-to-haptic mapping; no queue shape or store version
> changed; no undo path changed; no torch behaviour changed; no auto-return
> changed; and the decode configuration is BYTE-IDENTICAL — frame rate, decoded
> region and camera facing are three literals this phase did not touch, because
> changing them would be a behaviour change dressed as a layout commit.

**E non e' asserita: e' diffata.** Il reperto meccanico e' stato ricatturato e
confrontato blocco per blocco con `42-BASELINE.md`. Cio' che differisce:

- **due riempimenti di esito** — il terzo stato e il rifiuto — che sono
  esattamente le due differenze di contenuto che questa fase doveva produrre;
- **il conteggio dei file scansionati**, 306 → 305, perche' un file e' stato
  cancellato dal piano 42-07;
- **numeri di riga**, ovunque, per la deriva delle righe sopra.

Cio' che **non** differisce: le tre attese (1500, 2500, 2000), i tre letterali
aptici e la loro mappatura, tutti i 26 siti di `showFlash` con il loro esito,
i sei glifi, la forma della coda offline, le quattro strade, la finestra di
doppia lettura, e i tre letterali della fotocamera — `15`, `280×280`,
`environment`. **Nessun valore di comportamento si e' mosso.**

I due commit di questo piano non toccano un file sotto `src/`, quindi quel diff
e' il risultato cumulativo delle onde 3–6, riportato qui perche' la voce
`CONVERTED` lo afferma e un'affermazione va misurata.

### Le otto deroghe, per utility e per riga

Trascritte da `42-MAPPING.md` §3, dove sono state decise nell'onda 1. **Mai un
file intero:** escludere `ScannerClient.tsx` per percorso avrebbe zittito i
check A, B e D su 3449 righe per sempre, ed e' cio' che T-42-10 vieta per nome.

| file:riga | utility | gruppo |
|---|---|---|
| `ScanFlash.tsx:97` | `bg-green-500` | A — accettazione |
| `ScannerClient.tsx:437` | `bg-green-500` | A |
| `ScannerClient.tsx:437` | `text-green-500` | A |
| `ScannerClient.tsx:438` | `bg-green-500` | A |
| `ScannerClient.tsx:3323` | `text-green-500` | A |
| `ScannerClient.tsx:3440` | `text-green-500` | A |
| `ScanFlash.tsx:125` | `bg-red-600` | B — rifiuto |
| `ScannerClient.tsx:3351` | `text-red-600` | B |

Otto utility su sette righe — la riga `437` ne porta due, e sono **due voci**,
perche' il confine di una deroga e' una utility su una riga e due utility sono
due decisioni. Il gate riporta `palette derogations declared : 8, forgiving 8
site(s)` e stampa ogni sito perdonato invece di lasciarlo cadere.

L'argomento del gruppo A: il set semantico **non ha un colore di accettazione** e
la fase 40 ha rifiutato di inventarne uno. Quello del gruppo B: D-42-01 — portare
il rifiuto su `--sem-crit` lo metterebbe a **2,2** dal colore dei pulsanti
primari, cioe' dipingere un rifiuto della tinta che ovunque significa *premi qui*.

### La shell del lampo — un trasloco, non un'invenzione

Il gate **possedeva gia'** l'argomento, dentro la propria voce di recinto:
*the accept/refuse flash … which is a status layer and not a dialog*. Quella
frase si e' spostata in `EXEMPT_SHELLS`, dove perdona **una shell** ancorata al
lookup di stato invece di una directory intera. L'ancora e' stata scelta perche'
sopravvive al commit del colore e **muore** il giorno in cui il lampo smette di
pilotare il riempimento da un lookup solo — cioe' l'idea differita di
trasformarlo in una card.

Con i due recinti giu', l'intera superficie della porta porta **una sola** shell:
`ScanFlash.tsx:154`. Nessuna nascosta altrove. Shell perdonate 4 → 5,
`REMAINING` resta 0.

### I quattordici bersagli — un debito, non un'esenzione

`DOOR_TARGET_DEBT`, quattordici voci, tutte in `ScannerClient.tsx`, con un
**tetto congelato** in una costante separata:

```js
export const DOOR_TARGET_DEBT_CEILING = {
  count: 14,
  measured: '2026-08-18',
  by: 'plan 42-04, on a throwaway branch, before the fence came down',
  decision: 'DEF-42-03',
};
```

**Perche' la misura e' precedente a questo commit e non successiva.** Il recinto
che li nascondeva cade nello stesso commit che li introduce, quindi un budget
scritto dopo il primo verde sarebbe partito da qualunque numero la corsa avesse
mostrato. Non e': il piano 42-04 ha svuotato entrambi i recinti su un ramo
usa-e-getta, asserito la mutazione applicata prima di leggerne l'esito, misurato
`FAILED — 14 element(s)`, e cancellato il ramo.

**Dove sta la voce nel codice conta.** La forgiveness e' applicata **sotto** la
misura, non sopra: i quattordici sono misurati come ogni altro elemento e
**falliscono**; cio' che una voce dichiarata cambia e' che il fallimento e' un
debito che qualcuno ha scritto, non un rosso che nessuno ha scelto. Un elemento
saltato prima di `readHeights` sarebbe un'esenzione, e questo deliberatamente non
lo e'.

Quattro guardie, in due direzioni diverse:

| situazione | esito |
|---|---|
| il frammento non risolve, o risolve su due elementi | **RIFIUTA** (exit 2) |
| l'elemento dichiara ora il minimo — debito pagato, voce rimasta | **RIFIUTA** (exit 2) |
| la lista supera il tetto | **RIFIUTA** (exit 2) |
| un elemento sotto soglia che nessuna voce nomina | **FALLISCE** (exit 1) |
| una voce risolve ma il loop non la raggiunge mai | **RIFIUTA** (exit 2) |

**Nessuna soglia si e' mossa. 44px sono ancora 44px, e nessuna esenzione
esistente e' stata allargata di un carattere.**

### Il verde dice cosa ha preso su di se'

La riga finale del gate e' stata riscritta, perche' un verde che non nomina il
debito e' un verde che lo nasconde:

```
PASSED — every measured element declares an unprefixed minimum of at least
44px, or matches one of the ten exemptions printed above, or is one of
the door's declared DEBT.

And it is NOT a statement that every target is 44px. 2 are deliberately under
it under exemption 10, and 14 MORE — every one of them on the door — are under it
and NOT by decision: they are a debt this green carries openly rather than hides,
and the number can only go down. A target too small to hit, at a door, is a queue.
```

## Il commit che registra il gate — `17e42fa`

`verify:scan-legibility` entra in `package.json` e nella lista offline
dell'aggregato **nello stesso commit**: un nome presente in una sola delle due
rifiuta l'intera suite a exit 2, e quel rifiuto e' gia' arrivato una volta da
dentro quel file.

**Non opzionale.** Misura una proprieta' di una superficie di sicurezza ed e'
verde con margine dal momento in cui questo commit atterra — minimo 14,0 su una
soglia di 10. Un gate opzionale sulla porta e' un gate che si puo' saltare la
sera che conta.

La nota porta tre cose, e la seconda pesa piu' della prima:

1. **cosa misura** — le distanze fra i tre esiti e la pillola di connettivita',
   compositate sul fondo, in visione normale e nelle tre dicromazie;
2. **cosa NON misura** — la distanza fra due tinte, non la leggibilita' di uno
   schermo. Un pass dice che le tinte sono separabili. Non dice mai che la porta
   funziona: quello resta al door pass, ed e' di una persona;
3. **la clausola sull'unica coppia esclusa** — accettazione contro la pillola —
   e che il gate **verifica quella premessa a ogni esecuzione** invece di
   crederle: prima di applicare l'esclusione conferma che il contenitore del
   lampo sia ancora ancorato a ogni bordo. Il giorno in cui il lampo diventa una
   card, **l'esclusione si riapre da sola** e la coppia viene misurata. Fallisce
   chiuso, e la nota lo dice cosi' che nessuno debba aprire il gate per
   scoprirlo.

**Perche' adesso e non nell'onda 0:** un gate si registra quando esiste il codice
che lo rende verde. Registrarlo prima avrebbe misurato i colori vecchi e sarebbe
stato rosso per tutto l'intervallo — e un rosso che aspetta e' indistinguibile da
un rosso che segnala un difetto. Entrambi si smettono di guardare.

## Le prove per mutazione — sei, ognuna asserita applicata prima di leggerne l'esito

Il progetto ha gia' pagato una volta per una sostituzione `perl` che non ha
matchato e ha fatto sembrare rotto un controllo che funzionava. Nella direzione
opposta lo stesso errore certifica come vivo un controllo morto. Quindi ogni
mutazione qui e' stata **verificata presente nel file** — con il suo numero di
riga o il suo conteggio — prima che il gate girasse.

| # | mutazione | asserita | esito | ripristino |
|---|---|---|---|---|
| 1 | recinto locale di `verify-dialogs` riempito mentre quello del manifest e' vuoto | riga 1004 | **exit 2** — *this gate's Phase 42 fence and the manifest's do not match* | 0 occorrenze, gate exit 0 |
| 2 | idem su `verify-touch-targets` | riga 644 | **exit 2**, stesso rifiuto | 0 occorrenze, gate exit 0 |
| 3 | ancora del lampo spostata su una che la shell non porta | riga 654 | **exit 2** — *NO measured shell in that file carries it* | 0 occorrenze, gate exit 0 |
| 4 | frammento di una voce di debito reso non risolvibile | riga 1410 | **exit 2** — *the entry is stale: it forgives nothing while looking like a guarded case* | 0 occorrenze, gate exit 0 |
| 5 | voce del debito **cancellata**, elemento lasciato sotto soglia e non dichiarato | 13 voci contate | **exit 1** — `FAILED — 1 element(s)`, con `ScannerClient.tsx:3247` e la sua stringa di classi | 14 voci, gate exit 0 |
| 6 | quindicesima voce oltre il tetto | riga 1354 | **exit 2** — *THIS DEBT ONLY GOES DOWN* | 0 occorrenze, gate exit 0 |
| 7 | voce di `package.json` rimossa lasciando quella dell'aggregato | 0 occorrenze in `package.json` | **exit 2** — *this runner declares 1 gate(s) that package.json does not*, prima che un solo gate girasse | 1 occorrenza, suite di nuovo a 20/18/0/2 |

La 5 e' quella che conta di piu': dimostra che il debito **non e' un recinto con
un numero sopra**. Un quindicesimo bersaglio piccolo scritto su questa superficie
non e' perdonato dai quattordici — e' un rosso sulla propria riga, con il proprio
`file:riga`.

## Verifica

| comando | esito |
|---|---|
| `npm run verify:conversion` | **0** — `✓ A ✓ B ✓ C ✓ D ✓ E ✓ F`, 36 superfici, 196 file |
| `npm run verify:dialogs` | **0** — `REMAINING = 0`, 5 shell perdonate |
| `npm run verify:touch-targets` | **0** — debito 14 su un tetto di 14 |
| `npm run verify:scan-legibility` | **0** — minimo 14,0 su una soglia di 10 |
| `npm run build` | **0** |
| `npm run verify` | **exit 2** — **20 gate eseguiti, 18 passati, 0 falliti, 2 rifiutati** |
| `git status --porcelain -- src/` | vuoto |

**I due rifiuti sono lo stato onesto di un worktree, non un difetto:**
`verify:capabilities` e `verify:section-export` chiedono `SUPABASE_ACCESS_TOKEN`
e `NEXT_PUBLIC_SUPABASE_URL`, che vivono in un `.env.local` che git ignora e che
sta nel checkout principale. **Un rifiuto non e' un pass e non e' un
fallimento:** quei due gate non hanno misurato niente. Il conteggio precedente
era 19 eseguiti / 17 passati; e' salito di uno perche' questo piano ha registrato
un gate.

Il censimento, dalla coda del check F:

```
page.tsx files under src/app      : 43
declared in CONVERTED                : 36
behind the Phase 42 fence            : 0
pending another phase's conversion   : 6
on NON_DECLARABLE                    : 1
unaccounted for                      : 0
```

## Deviazioni dal piano

### 1. [Regola 3 — blocco meccanico] I task 1 e 2 sono un commit solo

**Trovata:** all'inizio dell'esecuzione, misurando invece di assumere.

**Il piano chiedeva due commit** — il recinto piu' la dichiarazione nel primo, le
tre deroghe nel secondo — e il criterio d'accettazione del task 1 pretendeva
`✓ A ✓ B ✓ C ✓ D ✓ E ✓ F`. **Le due cose non stanno insieme**, e non per una
scelta di stile: per il comportamento dei gate, misurato.

| voce del task 2 | se atterra **prima** del recinto | se atterra **dopo** |
|---|---|---|
| deroghe di palette | **exit 2** — *no converted surface's closure scans this file* | check A **rosso** su 16 hit |
| voce `EXEMPT_SHELLS` | **exit 2** — *check B NEVER OPENS that file* (gia' provato dal piano 42-05) | check B **rosso**, 1 shell in piedi |
| debito dei bersagli | l'elemento non e' in nessuna closure dichiarata | `verify:touch-targets` **rosso** su 14 |

Ogni ordine in due commit lascia un **rosso o un rifiuto su un albero corretto**,
che e' precisamente cio' contro cui questa famiglia di gate e' scritta. Il
`FULL_BLEED_SURFACES` lo dice di se': *«the entries arrive in the same commit as
the CONVERTED declarations they belong to; either order alone is a red or a
refusal on a correct tree»*.

E non e' un'interpretazione: **`42-05-FINDINGS.md` §3, colonna 2 — il documento
scritto nell'onda 2 apposta per dire a questo piano cosa fare — elenca tutte e
sei le voci come *«il commit che apre il recinto»*, al singolare.** Il piano le
ha divise in due task; la fonte che le ha decise le teneva in un commit.

**Cosa NON e' stato fatto per ottenere il verde:** nessun matcher allargato,
nessuna soglia abbassata, nessun file rimosso dalla misurazione, nessuna voce
`EXEMPT_PATHS` aggiunta (2 prima, 2 dopo, verificato contro `HEAD`).

### 2. [Regola 2 — correttezza] Il resolver condiviso non chiama piu' esenzione il debito

**Trovata:** durante la prova per mutazione 4, leggendo il rifiuto che il gate
stampa davvero.

`resolveDeclaredElement()` prefissava ogni messaggio con la parola `exemption`.
Riusarlo per il debito produceva *«exemption the door debt declares…»* — e un
debito chiamato esenzione insegna al lettore il contrario di cio' che la lista
significa, **nell'unico messaggio che legge mentre qualcosa non va**. Il prefisso
e' passato dentro l'etichetta, e i tre chiamanti la portano: `exemption 9`,
`exemption 10`, `the door's DEBT`. Provato ri-eseguendo la mutazione 4 dopo la
correzione, con la mutazione riasserita presente.

## Cosa NON e' stato fatto, e perche'

- **DEF-42-06 non e' riparata.** Tre confini di controllo sulla porta portano il
  nome del gruppo linee, a **2,05:1** contro un pavimento di 3:1 — meno della
  meta'. Spostarli su `--control` **cambia il colore**, ed e' un ridisegno che il
  perimetro di questa fase esclude. Va tenuta aperta e visibile proprio perche'
  **nessun gate la trova da solo**: un verde su questa porta non dice nulla su
  questa voce.
- **DEF-42-03 non e' pagata.** Ingrandire un bersaglio cambia il layout, e la
  seconda meta' di RESP-05 e' che il comportamento non cambia per effetto del
  lavoro visivo. La terza uscita — abbassare il gate — non e' fra quelle
  disponibili, e il gate lo dice di se'.
- **DEF-42-02 non e' fatta.** DS-05 non e' un requisito di questa fase.
- **DEF-42-01 non e' toccata.** Le sei pagine in `PENDING_SURFACES` restano
  sei: assorbirle per far salire un numero sarebbe esattamente il modo in cui un
  recinto diventa un timbro.
- **Nessun file sotto `src/`.** La regola 7 del piano, rispettata alla lettera:
  se un check fosse andato rosso sulla porta, la risposta sarebbe stata una
  correzione nel piano che possiede quel file, mai un'esenzione inventata qui.

## Cosa questo verde NON prova

Il criterio 3 — *ogni comportamento dello scanner e' invariato rispetto a prima
della conversione* — **non e' chiudibile, in modo permanente** (DEF-42-04). Il
door pass sullo scanner non convertito non e' stato eseguito finche' esisteva
qualcosa da misurare, e ora non esiste piu'. Il reperto meccanico prova che le
**costanti** e le **strade** non si sono mosse; non prova che il
**comportamento** non l'abbia fatto.

E il secondo motivo del vincolo d'ordine resta in piedi, non coperto da nessuna
deroga: **alla prima porta reale, correzioni di comportamento mai esercitate e
una superficie ridipinta gireranno insieme**, e questo repository non ha error
tracking. Se qualcosa cede davanti a una fila, nessuno potra' dire quale delle
due l'ha causato.

Nessun gate qui rende una porta usabile alle due di notte. Nove righe di
`42-PROCEDURES.md` restano `pending` ed eseguibili, e sono di una persona.

## Self-Check: PASSED

**File dichiarati creati — presenti sul disco:**

- `FOUND: .planning/phases/42-scanner-conversion/42-11-SUMMARY.md`

**File dichiarati modificati — tutti nel diff `HEAD~2..HEAD`:**

- `FOUND: scripts/conversion-manifest.mjs`
- `FOUND: scripts/verify-conversion.mjs`
- `FOUND: scripts/verify-dialogs.mjs`
- `FOUND: scripts/verify-touch-targets.mjs`
- `FOUND: scripts/verify-all.mjs`
- `FOUND: package.json`

**Commit — presenti in `git log`:**

- `FOUND: ed7dc8b` — feat(42-11): il recinto giu' in tre posti, la porta dichiarata, e ogni deroga con la sua ragione
- `FOUND: 17e42fa` — feat(42-11): il gate della leggibilita' registrato, entrambe le meta' nello stesso commit

**Nessuna cancellazione di file tracciati** in nessuno dei due commit:
`git diff --diff-filter=D --name-only HEAD~1 HEAD` vuoto per entrambi.
