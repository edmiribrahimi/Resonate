---
phase: 42-scanner-conversion
plan: 04
subsystem: check-in & offline — la mappa delle sostituzioni, decisa prima che qualcuno apra lo scanner
tags: [mapping, deroghe, colore, contrasto, touch-targets, wave-1]

requires:
  - phase: 42-scanner-conversion
    provides: "42-01 — PENDING_SURFACES e il gate che torna a misurare; DEF-42-01"
  - phase: 42-scanner-conversion
    provides: "42-03 — il gate della leggibilita', la terna arbitrata e la matrice dei compositi"
provides:
  - "42-MAPPING.md — 64 righe di palette grezza e 42 di token legacy, ognuna con un target"
  - "sette deroghe dichiarate per utility e per file, mai un file escluso (T-42-10)"
  - "il violetto assegnato con la sua misura: nessun sito violetto prende --sem-done"
  - "la pillola Offline provata sul semantico ambra: gate exit 0, riserva non presa"
  - "l'inchiostro del flash deciso per tutti e quattro i siti, non solo per il glifo"
  - "DEF-42-02 e DEF-42-03 — la tipografia dei numeri e i quattordici bersagli"
  - "la disposizione del mirino: 1024px chiude RESP-05, 384px chiude il criterio 2"
affects:
  - "42-05 — il meccanismo in check D per una superficie a schermo pieno per costruzione"
  - "42-06 — la costante della pillola e la terna: applica questa tabella"
  - "42-07 — la cancellazione di MobileNav edita da una lista, non da una ricerca"

tech-stack:
  added: []
  patterns:
    - "Una tabella di sostituzione si deriva dal matcher del gate, leggendone le costanti dal sorgente — non da una regex riscritta a mano"
    - "Una deroga si dichiara per utility e per file: un file intero escluso e' 3449 righe non misurate per sempre"
    - "Un ramo usa-e-getta misura, prova il ritorno per percorso esatto, e non tiene nulla"
    - "Il numero atteso da un documento si rimisura prima di pagarlo: la ricerca contava quattordici e ne elencava dieci"

key-files:
  created:
    - .planning/phases/42-scanner-conversion/42-MAPPING.md
  modified:
    - .planning/phases/42-scanner-conversion/deferred-items.md

key-decisions:
  - "La pillola Offline prende --sem-warn: nessuna coppia misurata scende sotto 10, quindi la deroga di riserva non e' stata presa"
  - "Nessun sito violetto prende --sem-done: guest list su --sem-info, annullamenti su --sem-warn, perche' un badge di categoria dipinto della tinta di un esito e' il difetto dell'ambra spostato su un'altra coppia"
  - "L'inchiostro del flash e' --ground su tutti e quattro i siti, non solo sul glifo, e le due alpha cadono: un inchiostro traslucido non supera 3,36 su nessuno dei tre riempimenti"
  - "I quattordici bersagli tattili diventano un debito numerato, non un pagamento: allargarli cambierebbe il layout, che e' cio' che RESP-05 vieta"
  - "Le citazioni di MobileNav si correggono tutte nel commit che cancella il file: sono venticinque righe, non diciotto"
  - "Il mirino prende due massimi gia' dichiarati dalla shell, e il meccanismo in check D si scrive nel piano 42-05, prima del run che ne ha bisogno"

metrics:
  duration: "~35 min"
  completed: 2026-08-18
  tasks: 3
  commits: 3
  files_created: 1
  files_modified: 1
---

# Fase 42 Piano 04: la mappa delle sostituzioni — Summary

**Ogni colore del perimetro ha una destinazione decisa e scritta prima che
qualcuno apra un file di 3449 righe: 64 utility di palette grezza, 42 di token
legacy, sette deroghe con un argomento ciascuna, due collisioni contese chiuse
con numeri misurati, e tre cose che non sono colore con una disposizione a testa.**

## Performance

- **Durata:** ~35 min
- **Completato:** 2026-08-18
- **Task:** 3, un commit ciascuno
- **File:** 1 creato, 1 modificato — **zero sotto `src/` e `scripts/`**

## Commit

1. **Task 1 — la tabella della palette grezza, le deroghe, il violetto, la pillola** — `b47f7bf`
2. **Task 2 — la tabella legacy, l'inchiostro, DEF-42-02** — `c854c01`
3. **Task 3 — i quattordici bersagli, le citazioni, il mirino, DEF-42-03** — `66d0d7d`

## Cosa e' stato deciso, con i numeri che l'hanno deciso

### I totali sono quelli attesi, e sono stati derivati invece che ricopiati

Uno script di scarto ha letto `COLOUR_UTILITY_PREFIXES`, `PALETTE_NAMES` e
`LEGACY_TOKEN_NAMES` **dal testo di `verify-conversion.mjs`** e ha ricostruito
`utilityPattern`, `isToleratedScrim` e `findUtilityHits` nella forma esatta,
passando dallo stesso stripper di commenti. Esito: **57** e **7** di palette,
**42** di legacy, **0** sugli altri tre file del perimetro. Nessuna divergenza da
riconciliare.

Confermato dall'altro lato: con le due pagine della porta dichiarate su un ramo
usa-e-getta, il gate vero conta **128** (64 × 2) e **84** (42 × 2) — i due
percorsi della porta raggiungono gli stessi file.

**Nessuno scrim tollerato nel perimetro**, misurato invece che presunto.

### La pillola *Offline* — la riserva non e' servita

Sul ramo `scratch-42-04-pill`, la pillola sollevata nella costante che il gate
cerca (`CONNECTIVITY_PILL` / `offlineDot`) con `bg-sem-warn`, insieme alla terna
decisa. **Mutazione asserita applicata prima di leggerne l'esito**, cinque grep
con i loro conteggi.

```
node scripts/verify-scan-legibility.mjs   → SCAN_LEGIBILITY_OK, exit 0
minimo della terna: 14,0   terzo stato ↔ pillola: 29,0   rifiuta ↔ pillola: 23,7
```

Nessuna coppia misurata sotto la soglia di 10, quindi **la pillola prende il
semantico e il gruppo C delle deroghe resta vuoto.** Per confronto, sullo stesso
albero con la pillola a `yellow-500` grezzo: 28,3 e 22,4 — cioe' esattamente le
cifre di `42-03-FINDINGS.md` §3, riprodotte.

**Il costo dichiarato, che nessuno aveva contato:** la coppia esclusa
accettazione ↔ pillola passa da **5,5** (giallo) a **2,6** (ambra semantica) in
protanopia. L'esclusione regge perche' il flash copre il viewport, e il gate
fallisce chiuso il giorno in cui quella premessa cade. Ma l'idea differita del
*flash come card* costava 5,5 e adesso costa 2,6, **e se un giorno viene presa la
pillola deve muoversi nello stesso commit.**

### Il violetto — una correzione, non solo un'assegnazione

Nessuno dei quattro siti violetti prende `--sem-done`: i tre di guest list
(`:2695`, `:3022`, `:3388`) prendono `--sem-info`, la pillola degli annullamenti
(`:2934-2935`) prende `--sem-warn`, che sta a **27,9** dal terzo stato.

> **Terza tabella corretta di questa fase.** `42-CONTEXT.md` dava
> `purple-400` ↔ `--sem-done` a **4,8**, `42-RESEARCH.md` a **8,0**. Misurato con
> l'aritmetica del gate: **4,1 al minimo, 7,7 a vista normale.** La conclusione
> non cambia; il numero che si cita si'.

Il costo dichiarato: `--sem-done` e `--sem-info` distano **6,2** in tritanopia.
Oggi non si incontrano mai; scritto qui perche' il giorno in cui un badge di
categoria finisse accanto a un esito sulla stessa riga, e' quella la cella che si
rompe.

### L'inchiostro — la decisione era piu' grande della domanda

Il piano chiedeva l'inchiostro **del glifo**. `ScanFlash.tsx` ha **quattro** siti
d'inchiostro sugli stessi riempimenti, e tutti e quattro sono palette grezza:
lasciarne tre senza target avrebbe lasciato tre righe della tabella senza
destinazione.

Misurati tutti e sei gli inchiostri possibili sui tre compositi:

| Inchiostro | accettazione | terzo stato | rifiuto |
|---|---|---|---|
| `--ground` pieno | **8,18** | **5,49** | **3,87** |
| `--ground` all'80% | 3,36 | 2,89 | 2,46 |
| bianco pieno | 2,44 | 3,63 | 5,16 |
| bianco all'80% | 2,15 | 3,11 | 4,33 |

**`--ground` pieno su tutti e quattro, le due alpha cadono.** Il ramo di riserva
sul rifiuto non scatta (3,87 supera il pavimento grafico di 3). Il residuo
dichiarato: sottotitolo e suggerimento restano a **3,87 sul rifiuto**, sotto il
pavimento del testo corrente — e oggi quegli stessi due misurano 2,15 / 2,08 /
3,52 e 1,72 / 1,68 / 2,58, cioe' **falliscono su tutte e sei le celle**. La
decisione migliora ogni cella e ne lascia una insufficiente, detto invece che
nascosto.

### I quattordici bersagli — il numero era giusto, l'elenco no

Misurati sul ramo `scratch-42-04-targets` con il recinto aperto:
`FAILED — 14 element(s) do not declare the minimum`, tutti in `ScannerClient.tsx`.

> ⚠ **`42-RESEARCH.md` §2.7 ne elencava dieci e li chiamava quattordici.**
> Mancano `:2673`, `:2768`, `:2823` e `:3006`, e `:2865` e' `:2863` al tag. Un
> piano che avesse pagato *«i dieci elencati»* avrebbe lasciato quattro rossi —
> ed e' esattamente la forma di difetto per cui questa mappa esiste.

Disposizione: **debito numerato che puo' solo scendere**, sul meccanismo di
`verify-breakpoints.mjs`. Abbassare il gate e' nominata come l'uscita vietata.

### Le citazioni di `MobileNav` — diciotto era il numero sbagliato

`LC_ALL=C /usr/bin/grep -rn "MobileNav" src/ scripts/` da' **30** righe fuori dal
file stesso: **5 di codice** (due rompono il build, tre mandano un gate a exit 2)
e **25 di prosa** su undici file. Il piano diceva diciotto; `42-RESEARCH.md` §3.4
le raggruppava in quattordici voci e le contava come diciotto frasi. **Nessuno dei
due numeri e' il numero di righe da editare**, e la lista consegnata al piano 42-07
e' per riga.

Le tre difficili sono scritte per esteso, e la terza ha un reperto dentro:

**Il conteggio dei mount e' gia' falso oggi.** `roles.ts:52` e `:297` dicono
*«tutti e tredici i mount di `<MobileNav>`»*; misurato, `<MobileNav>` ha **un
solo** mount e `<AppNav>` ne ha **tredici**, uno dei quali dentro `MobileNav.tsx`.
Dopo la cancellazione il numero **sopravvive** — 13 − 1 + 1 = 13 — e cambia
l'identita' di un sito. La premessa di `:52` e' stata riasserita invece che
ereditata: `DoorSurface.tsx` chiama `getAccessContext()` a `:112`.

### Il mirino — due massimi, e chi chiude quale criterio

`RESP-05` (*lo scanner si centra*) e il criterio 2 (*il mirino si centra*) non
sono la stessa frase. Chiusi entrambi, per la strada C: **1024px** sulla
superficie chiude RESP-05, **384px** sul mirino chiude il criterio 2. Nessuno dei
due e' inventato — sono due dei tre massimi che la shell gia' possiede — e la
ragione dei 1024 e' di dominio: alla porta si lavora con **una mano**, e su un
tablet in orizzontale un pollice non arriva ai 1360px a cui il mirino si stira
oggi.

Le due strade rifiutate portano il loro costo scritto. `qrbox`, `fps` e
`facingMode` sono dichiarati **intoccati**: sono il blocco 11 del reperto
meccanico.

## Deviazioni dal piano

**Nessuna deviazione di sostanza.** Tre correzioni di misura, tutte dentro il
perimetro dichiarato dai task, tutte registrate nel documento invece che
applicate in silenzio:

**1. [Rule 1 - Misura] I tre bianchi non-glifo di `ScanFlash.tsx` non avevano un
target**
- **Trovata durante:** Task 2
- **Problema:** il task decide *l'inchiostro del glifo*, ma il criterio del Task 1
  pretende un target per ogni occorrenza di palette grezza, e il file ne ha
  quattro. Titolo, sottotitolo e suggerimento sarebbero rimasti senza
  destinazione — cioe' tre righe che dicono *si decide dopo* in una tabella
  scritta per non averne.
- **Fix:** misurate tutte e sei le forme possibili di inchiostro sui tre
  compositi e decise le tre righe con lo stesso inchiostro del glifo, alpha
  incluse. Il residuo di 3,87 sul rifiuto e' dichiarato.

**2. [Rule 1 - Misura] I cinque siti calcolati hanno dodici rami, non dieci**
- **Trovata durante:** Task 1
- **Problema:** il piano chiedeva dieci righe, due per sito. La catena della
  cronologia ne ha **quattro** — `isUndone`, `isSuccess`, `isFlagged`, `isError`
  — di cui uno senza palette grezza.
- **Fix:** dodici righe, con la differenza spiegata sopra la tabella.

**3. [Rule 1 - Misura] Due conteggi ereditati dalla ricerca erano sbagliati**
- **Trovata durante:** Task 3
- **Problema:** i quattordici bersagli erano elencati come dieci; le citazioni di
  `MobileNav` erano contate diciotto e sono venticinque righe.
- **Fix:** entrambi rimisurati eseguendo il gate e il grep, con la divergenza
  scritta accanto al numero corretto invece che sostituita in silenzio.

**Totale deviazioni:** 3, tutte di misura, nessuno scope creep, nessun file di
prodotto aperto.

## Le prove, non le descrizioni

### I due rami usa-e-getta, e il loro ritorno

| Ramo | Cosa ha misurato | Ritorno |
|---|---|---|
| `scratch-42-04-pill` | la terna decisa + la pillola sul semantico ambra | `git checkout --` sui due file, per percorso esatto |
| `scratch-42-04-targets` | i quattordici bersagli col recinto aperto | `git checkout --` sui due script, per percorso esatto |

```
git status --porcelain -- src/ scripts/   → (vuoto)
git branch --list | grep scratch          → (nessuna riga)
npm run verify:touch-targets              → exit 0, stesso verdetto di prima
npm run build                             → exit 0
```

**Nessun `git clean`, nessun reset dell'albero, nessun commit su un ramo di
scarto.** Dentro un worktree quelle operazioni cancellano il lavoro di altre onde.

`npm run build` e' stato rilanciato **dopo** la scrittura dei documenti, perche'
Tailwind scansiona `.planning/` (DEF-41-01) e questa mappa scrive nomi di utility.

## Vincolo d'ordine di fase — rispettato

Nessun file dello scanner, della porta o di `ScanFlash.tsx` e' stato **lasciato**
modificato. Le due mutazioni di misura sono avvenute su rami cancellati, con il
ritorno asserito per grep e non dichiarato. La conversione dello scanner resta
dietro il door pass sulla superficie non convertita (`42-PROCEDURES.md` riga 3m,
`pending`).

## Known Stubs

Nessuno. Questo piano non aggiunge superfici, dati o percorsi: scrive due
documenti di pianificazione.

## Cosa questo documento NON decide

- **Se lo scanner si converta.** Quello e' D-42-04, e sta dietro il primo door
  pass reale.
- **Le voci di deroga dentro i gate.** Qui c'e' la decisione e il suo argomento;
  la riga di codice che il gate legge la scrive il piano che converte. Un elenco
  in un documento non e' una deroga finche' un gate non la legge.
- **DEF-42-01.** Resta aperta: l'attribuzione delle sei pagine di produzione alle
  fasi 44 e 45 e' una lettura, e assorbirle e' una decisione del proprietario.

## Self-Check: PASSED

- `.planning/phases/42-scanner-conversion/42-MAPPING.md` — **presente**
- `.planning/phases/42-scanner-conversion/deferred-items.md` — **presente**, tre voci `DEF-42-`
- `b47f7bf`, `c854c01`, `66d0d7d` — **tutti e tre in `git log`**
- `git status --porcelain -- src/ scripts/` — **vuoto**

---
*Fase: 42-scanner-conversion*
*Completato: 2026-08-18*
