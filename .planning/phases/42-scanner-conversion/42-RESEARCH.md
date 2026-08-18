# Phase 42: Scanner Conversion — Research

**Researched:** 2026-08-18
**Domain:** conversione visiva di una superficie di sicurezza + i gate meccanici che la misurano
**Confidence:** HIGH sui gate (misurati eseguendoli), HIGH sul perimetro (misurato sul tree),
**MEDIA-BASSA su una premessa di D-42-01** — vedi §0, che è la sezione da leggere per prima

> **Passata in sola lettura.** Nulla sotto `src/`, `scripts/` o `supabase/` è stato
> modificato: `git status --porcelain` è vuoto prima e dopo. Le simulazioni dei gate
> girano su una **copia** del tree in scratchpad (`git archive HEAD | tar -x`), mai qui.
>
> **Ogni affermazione porta il suo `file:riga` o il comando che l'ha prodotta.**
> Dove una misura **non concorda** con `42-CONTEXT.md` è marcata `⚠ DISCORDANZA` e
> riportata come reperto, non risolta d'ufficio.
>
> Non contiene sedi in trattativa, date non annunciate, line-up né nomi di persone:
> `.planning/` è tracciato e questo repository è **pubblico**.

---

<user_constraints>
## Vincoli dell'utente (da 42-CONTEXT.md)

### Decisioni bloccate

- **D-42-01** — Il flash è un vocabolario di sicurezza: `green-500` e `red-500` **non
  prendono i token**, e la deroga si dichiara nel codice e nel gate.
- **D-42-02** — `already_recorded` passa da `bg-amber-500/90` a `bg-sem-done/90`
  (`#9B7BE0`). Il commento falso in `ScanFlash.tsx:65-72` si corregge nello stesso commit.
- **D-42-03** — `src/components/layout/MobileNav.tsx` si cancella; `DoorSurface.tsx` monta
  `AppNav` con `form="phone"` direttamente. **La porta NON prende la colonna da 224px.**
  Il gate si sposta nello stesso commit.
- **D-42-04** — La conversione non si spedisce prima della prima porta reale. Ordine
  ancorato a eventi: (1) wave 0 fuori dallo scanner, (2) reperto meccanico sul NON
  convertito, (3) door pass sul NON convertito alla prima porta reale, (4) onde di
  conversione in un giorno senza serata, (5) door pass sul convertito.
  **L'esecuzione delle onde di conversione è bloccata**, e il piano deve dirlo.
- **D-42-05** — `scripts/verify-scan-legibility.mjs`: rilegge i colori **dai sorgenti**,
  simula le tre dicromazie, rifiuta sotto soglia. Provato per mutazione.
- **D-42-06** — DEF-45-01 è un prerequisito: le quattro voci morte escono da `CONVERTED`
  in wave 0.
- **D-42-07** — `PHASE_42_PATHS` si rimuove e i tre percorsi entrano in `CONVERTED` con la
  loro larghezza, nello stesso commit. Tre consumatori vanno aggiornati insieme.

### Discrezione dell'esperto (senza checkpoint)

La larghezza esatta a cui il mirino si ferma e cosa gli sta intorno; l'inchiostro del glifo
sul terzo stato; l'ordine delle onde; la forma del reperto meccanico; la soglia numerica del
gate di leggibilità.

**Torna al proprietario solo:** un colore **nuovo** nel vocabolario del brand, un cambio di
comportamento alla porta, o la decisione di spedire in una settimana con una serata.

### Idee differite (FUORI PERIMETRO)

Forzare la luminosità dello schermo; il rifiuto su fondo scuro invece che rosso pieno; un
suono per esito; `tabular-nums` sui contatori (se giudicato fuori dal perimetro *colore,
contrasto e tipo*, va **detto** e rimandato, non fatto di straforo); **DS-05 sullo scanner**
— non è fra i requisiti di questa fase, toccarlo è scope creep.
</user_constraints>

---

<phase_requirements>
## Requisiti della fase

| ID | Descrizione (`.planning/REQUIREMENTS.md`) | Cosa di questa ricerca lo abilita |
|---|---|---|
| **DS-04** | *«Scanner feedback colours stay saturated and unmistakable, and colour is never the only channel»* (`REQUIREMENTS.md:122`) | §0 (la misura delle distanze rifatta sui valori reali del tree) · §4 (la mappa dei 57+42 siti) · §8 (i canali che esistono già e vanno **verificati**, non costruiti) |
| **RESP-05** | *«The scanner centres rather than stretches, and its behaviour is unchanged by the visual work»* (`REQUIREMENTS.md:136`) | §5 (cosa fa oggi il mirino a ogni larghezza, e le tre strade per centrarlo) · §6 (il reperto meccanico che rende misurabile *invariato*) |

**Criteri di successo del roadmap** (`ROADMAP.md:967-969`) — invariati, citati per intero
perché il criterio 2 parla di **mirino** mentre RESP-05 parla di **scanner**:

1. Accept e refuse restano saturi e inequivocabili a distanza di braccio in una stanza buia,
   e ognuno porta un secondo canale oltre al colore.
2. **Il mirino si centra a ogni larghezza invece di stirarsi**, su telefono, tablet e desktop.
3. Ogni comportamento dello scanner è invariato, **verificato rieseguendo il door pass su un
   dispositivo**.

> ⚠ Nota di perimetro: RESP-05 dice *«the scanner centres»*, il criterio 2 dice *«the
> viewfinder centres»*. Non sono la stessa frase. Il piano deve scegliere quale delle due
> chiude, e dirlo — vedi §5.4.
</phase_requirements>

---

## 0. La cosa che cambia di più come si pianifica questa fase

> **Le distanze cromatiche di `42-CONTEXT.md` non si riproducono, e il minimo vero per
> accetta-vs-rifiuta è 8,1 — sotto la soglia di 10 che il documento si dà.**

Ho rifatto la misura da zero, sui **valori che questo albero usa davvero**, con uno script
riproducibile (Viénot-Brettel-Mollon 1999 in sRGB lineare + CIEDE2000, la stessa metodologia
che `42-CONTEXT.md` dichiara). Il primo fatto è che i colori grezzi qui **non sono esadecimali
Tailwind v3**: sono `oklch` di Tailwind v4 —

| nome | dichiarazione | sRGB | Y rel. |
|---|---|---|---|
| `green-500` | `node_modules/tailwindcss/theme.css:75` — `oklch(72.3% 0.219 149.579)` | `#00C950` | 0,416 |
| `red-500` | `theme.css:15` — `oklch(63.7% 0.237 25.331)` | `#FB2C36` | 0,225 |
| `amber-500` | `theme.css:39` — `oklch(76.9% 0.188 70.08)` | `#FE9A00` | 0,437 |
| `yellow-500` | `theme.css:51` — `oklch(79.5% 0.184 86.047)` | `#F0B100` | 0,495 |
| `--sem-done` | `src/app/globals.css:183` — `#9B7BE0` | `#9B7BE0` | 0,265 |
| `--sem-crit` | `globals.css:180` | `#FF6B8E` | 0,337 |
| `--accent` | `globals.css:142` | `#FF5C93` | 0,310 |

**Le luminanze relative concordano con `42-CONTEXT.md` a tre decimali** (0,416 vs 0,411 ·
0,225 vs 0,229 · 0,437 vs 0,439 · 0,495 vs 0,498 · 0,265 vs 0,265 · 0,337 vs 0,337 · 0,310
vs 0,310). Quindi i due calcoli partono **dagli stessi colori**: la divergenza è nella
simulazione, non nell'input.

### Le distanze, rimisurate

| Coppia | normale | protanopia | deuteranopia | tritanopia |
|---|---|---|---|---|
| accetta vs rifiuta (`green-500`/`red-500`) | 82,0 | 31,7 | **8,1** | 60,8 |
| rifiuta vs già registrato (`red-500`/`amber-500`) | 38,4 | 30,1 | 15,7 | 18,8 |
| accetta vs già registrato (`green-500`/`amber-500`) | 49,1 | **10,5** | 15,1 | 53,5 |
| già registrato vs pillola *Offline* (`amber-500`/`yellow-500`) | **10,0** | **4,7** | **2,0** | **5,9** |
| `--sem-crit` vs `--accent` | **4,0** | **7,2** | **3,8** | **2,3** |
| `--sem-warn` vs accetta | 46,4 | **2,3** | 10,0 | 49,8 |
| **`--sem-done` vs accetta** | 54,0 | 63,6 | 57,1 | **22,3** |
| **`--sem-done` vs rifiuta** | 38,8 | 51,5 | 60,5 | **33,7** |
| **`--sem-done` vs pillola *Offline*** | 65,8 | 70,3 | 69,9 | **30,4** |

⚠ **DISCORDANZA 1 — le colonne protanopia e deuteranopia sembrano scambiate, e il minimo
cambia di segno.** `42-CONTEXT.md` dà accetta-vs-rifiuta a 48,7 in deuteranopia e **28,1**
in protanopia, e su quel 28,1 poggia l'intera argomentazione di D-42-01 (*«distanza minima
28,1 su tutte e quattro le simulazioni»*). Io misuro **31,7 in protanopia e 8,1 in
deuteranopia**. La fisiologia dà ragione alla mia direzione: un protanope perde la
sensibilità al rosso e quindi il rosso gli si **scurisce** — accetta e rifiuta restano
distinguibili per chiarezza; un deuteranope conserva la luminanza e i due diventano
**due gialli**. Le apparenze simulate lo mostrano senza bisogno di credere al numero:

| | normale | protanopia | deuteranopia | tritanopia |
|---|---|---|---|---|
| `green-500` | `#00C950` | `#BEBE4F` | **`#AAAA57`** | `#39BDBD` |
| `red-500` | `#FB2C36` | `#656539` | **`#959523`** | `#FA2D2D` |

⚠ **DISCORDANZA 2 — non è uno scambio pulito.** Su alcune coppie i due calcoli coincidono
esattamente: ambra-vs-giallo dà **10,0 vs 9,9** in normale e **2,0 vs 2,0** in deuteranopia;
`--sem-crit` vs `--accent` dà **4,0 vs 4,0** in normale e **7,2 vs 7,3** in protanopia. Su
altre divergono (`--sem-crit`/`--accent` in deuteranopia: 3,8 contro 0,6). Quindi i due
calcoli condividono il metodo su alcune celle e divergono su altre — l'ipotesi più semplice
è un'inversione delle due matrici dicromatiche in **uno** dei due, applicata in modo non
uniforme perché una delle due tabelle è stata composta a mano.

### Cosa NON cambia, e va detto per primo

**Questo non rompe la fase, e non rompe il prodotto.** DS-04 ha due metà, e la seconda —
*«colour is never the only channel»* — è **già vera** e misurata in §8: glifo distinto,
permanenza distinta, aptico distinto per ognuno dei tre esiti. Una coppia a 8,1 sarebbe un
difetto solo se il colore fosse il canale unico. Non lo è, per costruzione, dal 2026-08-05.

**E non riapre D-42-01 né D-42-02.** La conclusione operativa di D-42-01 — verde e rosso
restano grezzi — non dipende dal 28,1: dipende dal fatto che il set semantico **non contiene
un verde** e la fase 40 ha già deciso di non inventarne uno (`globals.css:169-173`), e dal
fatto che portare il rifiuto su `--sem-crit` lo metterebbe a **4,0** dai pulsanti primari —
numero che il mio calcolo **conferma esattamente**. D-42-02 esce dalla rimisura **più
forte**, non più debole: `--sem-done` ha distanza minima **22,3** dagli altri due esiti e
**30,4** dalla pillola *Offline*, contro i 15,9 dichiarati.

### Le tre conseguenze operative, che sono di pianificazione e non di colore

1. **La soglia di D-42-05 non può essere scelta prima che il gate abbia girato.** Un gate a
   soglia 10 che rilegge i sorgenti **fallirebbe al primo run** sulla coppia accetta/rifiuta.
   In questo repo un gate che nasce rosso è un gate che qualcuno spegne — è la regola di
   casa, scritta tre volte (`verify-media-strip.mjs:51-62`; `verify-conversion.mjs:1229-1234`
   *«a gate that ships red is a gate somebody switches off»*). **Il piano deve prevedere che
   la coppia verde/rosso sia una deroga dichiarata dentro il gate**, con la sua ragione (il
   colore non è il canale unico) e la sua misura — esattamente la forma che
   `verify-conversion.mjs:674-678` usa per `EXEMPT_PATHS` e `verify-dialogs.mjs:685` per
   `EXEMPT_SHELLS`. Un gate che forgive verde/rosso *per argomento scritto* è onesto; un
   gate con la soglia abbassata a 8 per farlo passare è la manomissione che questo repo
   chiama per nome.
2. **La prima cosa che il gate di D-42-05 deve fare è arbitrare fra le due misure.** È
   l'unico modo di chiudere la discordanza senza che una delle due resti "un'opinione".
   `ai-engineering.md` gate *prova per mutazione* si applica anche qui: se il gate riproduce
   i numeri di `42-CONTEXT.md`, la mia misura è sbagliata e questa sezione va cassata; se
   riproduce i miei, la tabella di `42-CONTEXT.md` va corretta in loco con la data — non
   cancellata, la stessa disciplina che `production-calendar.md` applica alle proprie
   correzioni.
3. **Il flash renderizza a `/90`, non pieno.** Nessuna delle due tabelle lo considera. Sopra
   `--ground` (`#0A0712`) i tre riempimenti diventano `#00C04D`, `#EF2A34`, `#9475D6`, e le
   distanze si spostano di meno di 1,5 (accetta-vs-rifiuta in deuteranopia: 8,0 invece di
   8,1). Non cambia nessuna conclusione, ma il gate deve decidere **se misura il token o il
   composito**, e dirlo — perché il numero che una persona vede è il secondo.

**Contrasti misurati sui riempimenti compositi** (rilevanti per la decisione sull'inchiostro
del glifo, che D-42-02 lascia al piano):

| riempimento a `/90` | su `text-white` | su `--ground` |
|---|---|---|
| `green-500/90` `#00C04D` | 2,47 : 1 | **8,07 : 1** |
| `red-500/90` `#EF2A34` | **4,16 : 1** | 4,80 : 1 |
| `--sem-done/90` `#9475D6` | 3,63 : 1 | **5,49 : 1** |

Il rosso è l'unico dei tre su cui il bianco arriva vicino a 4,5:1, e l'unico su cui `--ground`
**non** è nettamente migliore. Una simmetria a tre stati con `--ground` ovunque costa
4,80:1 sul rifiuto — sopra AA, ma il valore più basso dei tre. Il piano deve scegliere
sapendolo.

*(Script riproducibile: la matematica di questa sezione sta in `scratchpad/cvd.mjs` ed è
esattamente il corpo che `verify-scan-legibility.mjs` deve contenere — vedi §7.)*

---

## 1. La forma ripetibile di una conversione, letta dalle fasi 40 / 41 / 41.1 / 41.2

### 1.1 I numeri, misurati sui documenti

| Fase | Piani | Onde | Righe/piano (min–max) | Artefatti per piano |
|---|---|---|---|---|
| 40 | 5 | — | — | `PLAN` + `SUMMARY` |
| 41 | 30 | — | — | `PLAN` + `SUMMARY` + 5 `GAP-REVIEW` |
| 41.1 | 24 | **0–9** | 238–414 | `PLAN` + `SUMMARY` |
| 41.2 | 20 | **0–8** | 288–522 | `PLAN` + `SUMMARY` + **`FINDINGS`** (19 su 20) |

Onde di 1–5 piani. Nessun piano oltre 522 righe. Nessuna onda con più di 5 piani.

### 1.2 Il pattern da copiare, in sei mosse

1. **Wave 0 non tocca la superficie: ripara i gate.** `41.1-01-PLAN.md:5` è `wave: 0`;
   `41.2-01` e `41.2-02` sono entrambi `wave: 0` e producono `41.2-WAVE0-FINDINGS.md`, che
   è il documento che ha **deciso in scope** il check F (`conversion-manifest.mjs:250-256`).
   La fase 42 ha già la sua wave 0 scritta in D-42-06 e D-42-07 — ed è **più grande di
   quanto CONTEXT.md creda** (§2.7).
2. **Una superficie = un piano, e "intera" si misura sulla import closure.** Ogni voce di
   `CONVERTED` dice quanti file è costato *whole*: «ONE file» (`:542`), «TWO files»
   (`:553`), «SIX files in two directories» (`:511`). La frase ricorrente è
   *«a surface is declared converted when what it REACHES is converted — that is what this
   manifest's own gate walks»* (`:507`).
3. **Un solo piano per onda possiede TUTTE le modifiche ai gate.** È **D-41.1-22**, citato
   in `conversion-manifest.mjs:535-537`: *«a `CONVERTED` list is one file that every plan in
   a wave would want to edit, which is exactly what D-41.1-15's partition rule cannot
   express. Five plans reported; one plan writes.»* Per la fase 42 questo è vincolante:
   `CONVERTED`, `PHASE_42_PATHS`, `NAV_MODULES`, `PHONE_LOCKED_NAV_WRAPPER`, le due
   `PHASE_42_EXEMPT_PATHS` e `verify-all.mjs` sono **sette file che un solo piano scrive**.
4. **La reason della voce `CONVERTED` è il testo del SUMMARY di chi ha fatto il lavoro,
   verbatim.** `conversion-manifest.mjs:525-531`: *«the plan that walked the closure is the
   one that knows what whole turned out to mean, and a reconciliation re-writing those
   sentences would be asserting about files it did not open»*. L'unico cambio editoriale
   ammesso è unire più righe in una stringa.
5. **Ogni voce porta LA CAUTELA del proprio dominio.** Su ogni superficie sensibile la reason
   ripete la formula: *«no query changed, no column added, no capability check touched, no
   action payload altered»* (`:519`, `:546`, `:554`, `:562`, `:566`, `:570`, `:574`, `:578`).
   **Per la porta la formula deve cambiare**, perché il dominio è un altro: nessun esito,
   nessun tempo, nessun aptico, nessuna coda, nessun annullamento, nessuna torcia, nessun
   ritorno automatico.
6. **`41.2` ha aggiunto un `NN-FINDINGS.md` per piano.** 19 su 20. È il posto dove una misura
   che smentisce la ricerca viene registrata **senza** che il piano cambi da solo. Per la
   fase 42 è il veicolo naturale del reperto meccanico di D-42-04.

### 1.3 Pattern provati e abbandonati — da non riprovare

- **Il *big bang* letterale.** `conversion-manifest.mjs:115-119`: leggere il criterio 1 alla
  lettera fondeva 24 pagine in un'unica unità di 104 file. La risposta è stata **convertire
  prima la spina** e dichiararla esclusa dal walk. Per la fase 42 la spina è già convertita
  e non c'è nulla da estrarre: `ScannerClient.tsx` **non si ristruttura** (D-42-07 lo dice,
  e §4 spiega perché sarebbe pericoloso).
- **Le esenzioni scoperte su un run rosso.** **D-41-16**, ripetuta in
  `conversion-manifest.mjs:297` e in `verify-conversion.mjs:1062`: *«an exemption discovered
  on a red run is an exemption nobody trusts»*. Ogni esenzione che la fase 42 introdurrà —
  e ne servono almeno tre (§2.7) — **va scritta prima del primo run rosso**, non dopo.
- **Il complemento al posto dell'appartenenza in un filtro.** `verify-all.mjs:158-166` lo
  registra come regressione realmente spedita fra 41-14 e 41-22.
- **La prosa al posto di una costante.** Quaranta righe di argomento sopra `CONVERTED` che
  nessuno leggeva sono diventate `NON_DECLARABLE` (`conversion-manifest.mjs:248-262`).
  *«A paragraph a reader may skip and a list a gate subtracts are not the same artefact.»*
- **Aggiungere una voce alla lista che tocca la sicurezza dell'utente in silenzio.** Ogni
  singolo `[SLOP]`-equivalente qui è una voce di `CONVERTED` che afferma una conversione non
  fatta: `verify-conversion.mjs:3798-3801` lo dice esplicitamente — *«completeness is not
  correctness»*.

---

## 2. Cosa pretende meccanicamente `verify-conversion.mjs` da una superficie appena dichiarata

> ⚠ Il file contiene **byte NUL**. `grep` nudo lo salta in silenzio (memoria
> `grep-blind-on-verify-conversion.md`). Tutto quanto segue è letto con `/usr/bin/grep`,
> `Read` o `sed | tr -d '\000'` — i numeri di riga restano validi perché `tr` toglie byte,
> non righe.

### 2.0 Prima di tutto: `checkManifest()`, che oggi RIFIUTA

`conversion-manifest.mjs:906-986` gira **prima di ogni check** e restituisce `{ok, refusals}`.
Un refusal è **exit 2**, non 1: *«a refusal is not a failure — it means the measurement did
not happen»* (`:898`). Condizioni:

| Condizione | Riga |
|---|---|
| `CONVERTED` vuota | `:909` |
| `PRIMITIVES` vuota | `:917` |
| una voce di `CONVERTED` con `pageFile` non su disco **case-exact** | `:924-934` |
| una voce di `CONVERTED` con `width` fuori da `{default, wide, focus}` | `:935-940` |
| una voce di `SPINE` / `PRIMITIVES` / `NON_DECLARABLE` non su disco | `:943`, `:955`, `:973` |

**Misurato il 2026-08-18, eseguito:** `checkManifest()` restituisce `ok: false` con
**4 refusals**, esattamente le quattro pagine Finance/Analytics di DEF-45-01. `CONVERTED` ha
**38 voci** (`focus` 4 · `wide` 12 · `default` 22). D-42-06 è confermata alla lettera.

### 2.1 Cosa serve, esattamente, per dichiarare una superficie

Una riga in `CONVERTED` (`conversion-manifest.mjs:488`), forma `[route, pageFile, width, reason]`:

- **`route`** — per un umano che legge la lista.
- **`pageFile`** — *«the exact path a gate opens»* (`:446`), confrontato **case-exact**
  (`existsCaseExact`, `:89-105`). Per la porta sono due: `src/app/(admin)/admin/scanner/page.tsx`
  e `src/app/(admin)/door/page.tsx`.
- **`width`** — uno di `default | wide | focus` (`WIDTHS`, `:895`), e **deve concordare con
  le due liste chiuse del §4** di `verify-conversion.mjs` — `WIDE_ROUTES` (`:1315-1336`,
  13 rotte) e `FOCUS_ROUTES` (`:1343-1348`, 4 rotte). `expectedWidth()` (`:1354-1358`):
  sulla lista wide → `wide`; sulla lista focus → `focus`; altrimenti `default`. Un disaccordo
  è **check D fallito** (`:3324-3335`) con la formula *«one of the two is wrong, and which
  one is a question for a person»*.
- **`reason`** — nessun gate la legge. È la parte che solo una persona può sbagliare.

### 2.2 Le regole attaccate a ciascuna larghezza

| width | maximum | Vincolo |
|---|---|---|
| `default` | `max-w-5xl` (1024px) | La risposta per ogni superficie su cui nessuno ha dovuto discutere. `PageShell.tsx:163` |
| `wide` | `max-w-7xl` (1280px) | **Solo** se la rotta è nominata su `WIDE_ROUTES` — lista **chiusa**, si edita per decisione |
| `focus` | `max-w-sm` (384px) | **Vietato su qualunque superficie che monta una navigazione** — check E, `verify-conversion.mjs:3424`. D-41.2-02 lo registra come *«non merely deferred but unavailable»* |

**Conseguenza diretta per la porta:** `DoorSurface.tsx:133` monta la navigazione, quindi
`focus` è **meccanicamente indisponibile**. `wide` richiederebbe di aggiungere due rotte a
una lista chiusa — una decisione, non un default. **Resta `default`.**

### 2.3 «Route-adjacent» — cosa significa

`verify-conversion.mjs:1624-1642`. Accanto a ogni `pageFile` dichiarato, il gate cerca
`loading|error|not-found` con estensione `.tsx|.ts|.jsx|.js` **nella stessa directory** e li
aggiunge all'insieme scansionato da A, B e D. Sono file che **il router monta e nessun import
raggiunge**: prima di questa estensione, sette `loading.tsx` sotto `(work)` con 149 utility
legacy erano invisibili a ogni gate (`:1591-1598`).

**Misurato:** né `src/app/(admin)/admin/scanner/` né `src/app/(admin)/door/` contengono
`loading`, `error` o `not-found`. **Route-adjacent aggiunge zero file alla porta.**

Ciò che il gate **ancora non raggiunge** e che non è approvato dal silenzio (`:1600-1608`):
un `layout.tsx` o `template.tsx` **sopra** la superficie. La porta sta fuori da `(work)`
proprio per non avere un layout (`nextjs-architecture.md`, R-WORK-ROUTES), quindi qui non
morde.

### 2.4 Check A — nessuna utility di palette grezza

`verify-conversion.mjs:2925-2971`. Matcher: 12 prefissi (`:856-866`) × 24 nomi di famiglia
(`:877-882`, **incluse `black` e `white`**) × scala numerica opzionale. **Una sola forma
tollerata:** lo scrim nero traslucido — `bg-black` seguito da `/N` (`isToleratedScrim`,
`:936-940`). **Non esiste una lista di eccezioni per singola utility.** L'unico meccanismo
di perdono è `EXEMPT_PATHS` (`:674-678`), che esclude il **file intero** dalla closure
(`:1675-1677`).

### 2.5 Check B — nessuna utility di token legacy

`verify-conversion.mjs:2977-3009`. Quattro nomi: `card-border`, `card`, `background`,
`foreground` (`:894`) — gli alias che la fase 40 ha lasciato nel token layer
(`globals.css:247-250`). **Solo sulle superfici dichiarate.**

### 2.6 Check D — il contenitore, ed è quello che blocca la porta

`verify-conversion.mjs:3211-3212`:

```
const importsShell = importedSymbolsFrom(s.pageFile, SHELL_FILE).has('PageShell');
if (!importsShell) pagesWithoutShell.push(s);
```

**Il `page.tsx` stesso deve importare `PageShell`.** `src/app/(admin)/admin/scanner/page.tsx`
importa solo `./DoorSurface` (`:1`); `src/app/(admin)/door/page.tsx` importa solo
`DoorSurface` (`:1`). Altre due assertion di check D: la shell dichiara esattamente i tre
maximum di `DECLARED_MAXIMA` (`:973`) e nessun altro; e **nessuna pagina scrive un `max-w-`
proprio** (`:3213-3232`), salvo una voce in `TYPOGRAPHIC_MEASURES` — meccanismo che oggi ha
**una** voce, la bio dell'artista (`:1097-1102`).

> Nota che il piano userà: **check D legge solo `s.pageFile`.** Un `max-w-` scritto dentro
> `ScannerClient.tsx` **non** viene visto da questo check. È una scappatoia reale, ed è
> contraria a D-41-06 (*«the maximum is owned by the shell and never by a page»*). Se il
> piano la usa, la usa **dichiarandola**, non scoprendola.

### 2.7 Cosa succede DAVVERO — misurato eseguendo i gate su una copia del tree

Ho riprodotto in scratchpad esattamente la wave 0 di D-42-06 + D-42-07: quattro voci morte
rimosse, `PHASE_42_PATHS` svuotata, `/admin/scanner` e `/door` dichiarati `default`, le due
`PHASE_42_EXEMPT_PATHS` locali svuotate.

**Passo 1 — solo la riparazione DEF-45-01, senza toccare la porta:**

```
✓ A  no raw palette utility in 188 file(s) under 34 converted surface(s)
✓ B  ✓ C  ✓ D  ✓ E
✗ F  6 page.tsx file(s) exist and are accounted for NOWHERE
CONVERSION_FAIL — 1 check(s) failed: F
```

> ⚠ **DISCORDANZA 3 — la riparazione di DEF-45-01 NON rende verde il gate.** D-42-06 dice
> che la rimozione delle quattro voci *«rende misuranti due gate che oggi non misurano
> nulla»*. È vero per A–E. Ma check F passa da *non eseguito* a **rosso**, su **sei pagine**
> che le fasi 44 e 45 hanno aggiunto e mai dichiarato:
>
> ```
> src/app/(admin)/admin/(work)/calendar/page.tsx
> src/app/(admin)/admin/(work)/calendar/[id]/page.tsx
> src/app/(admin)/admin/(work)/location/page.tsx
> src/app/(admin)/admin/(work)/location/[id]/page.tsx
> src/app/(admin)/admin/(work)/manifesto/page.tsx
> src/app/(admin)/admin/(work)/visual/page.tsx
> ```
>
> Sono superfici di **altre fasi**. La wave 0 della fase 42 non può convertirle e non può
> dichiararle convertite — sarebbe la bugia che `conversion-manifest.mjs:479-480` chiama
> *«a list of claims is how a gate becomes a rubber stamp»*. Le tre disposizioni che il
> gate stesso offre (`:3877-3881`) sono: `CONVERTED`, un **recinto** in `PHASE_42_PATHS`, o
> `NON_DECLARABLE`. Il recinto è quello che questa fase sta **rimuovendo**.
>
> **Questo è un blocco reale di wave 0 e va deciso nel piano, non scoperto in esecuzione.**
> La strada che non mente è un **secondo recinto per nome** — `PHASE_45_PATHS` o
> `PENDING_SURFACES` — con la stessa forma `[glob, reason]`, la stessa regola di dissoluzione
> e il fatto che sono di un'altra fase scritto dentro. È esattamente ciò che
> `PHASE_42_PATHS` è stato per la porta, e il precedente è già argomentato in
> `conversion-manifest.mjs:265-273` (*fence* ≠ *category refusal*).

**Passo 2 — con `/admin/scanner` e `/door` dichiarati e il recinto rimosso:**

```
✗ A  128 raw palette utilit(y/ies) reachable from a converted surface   (64 × 2 superfici)
✗ B   84 legacy token utilit(y/ies) on a converted surface              (42 × 2 superfici)
✓ C
✗ D  2 converted page(s) do not import the shell:
        /admin/scanner   src/app/(admin)/admin/scanner/page.tsx
        /door            src/app/(admin)/door/page.tsx
✓ E
✗ F  8 page.tsx file(s) ... NOWHERE
```

E i due gate fratelli, con lo stesso stato:

```
verify-dialogs:        ✗ B  1 file(s) declare a dialog shell and are not on REMAINING:
                            src/components/scanner/ScanFlash.tsx:135  [hand-rolled overlay]
verify-touch-targets:  FAILED — 14 element(s) do not declare the minimum   (tutti in ScannerClient.tsx)
```

> ⚠ **DISCORDANZA 4 — aprire il recinto espone due gate che `42-CONTEXT.md` non nomina.**
>
> - **`verify-dialogs` check B.** `ScanFlash.tsx:135` è un overlay a mano (`fixed inset-0
>   z-[70]`). Il gate **conosce già la ragione per cui non è un difetto**: la sua stessa voce
>   di recinto dice *«including the accept/refuse flash at ScanFlash.tsx:135, which is a
>   status layer and not a dialog, and which the widened matcher would otherwise redden»*
>   (`verify-dialogs.mjs:952-955`), e il docblock a `:1060-1066` registra che il recinto è
>   stato dichiarato **prima** proprio per questo. **La riparazione è meccanica e già
>   scritta:** la ragione si sposta dal recinto a una voce di `EXEMPT_SHELLS`
>   (`verify-dialogs.mjs:685`), la cui forma è `[FILE_CONST, ANCHOR, shape, reason]` e il cui
>   confine è **la shell e mai il file** — quattro precedenti già in lista, tutti sul percorso
>   del bar. Non è una nuova invenzione: è la stessa frase, in una lista che la misura.
> - **`verify-touch-targets`.** **14 elementi** sotto i 44px in `ScannerClient.tsx`: i chip
>   delle pillole di coda (`:2909`, `:2918`), il pulsante *Scan anyway* (`:2865`), il campo
>   di ricerca (`:3061`) e il suo clear (`:3070`), i tre tab del filtro (`:3094`), la banda
>   di freschezza (`:3169`), la torcia (`:3208`), le righe della cronologia (`:3254`), il
>   check-in guest list (`:3418`). **Questo è fuori dal perimetro dichiarato di questa fase**
>   — *colore, contrasto e tipo* — e ingrandire un target alla porta **cambia il layout**,
>   che è il confine che RESP-05 chiede di non attraversare. Il gate lo dice da solo:
>   *«Fix the ELEMENT, not this gate»*. Le due strade sono (a) pagare i 14 in questa fase,
>   dichiarando che un target da 44px alla porta è una correzione di sicurezza e non un
>   ritocco visivo — oppure (b) **spostare i 14 su un debito numerato che può solo scendere**,
>   che è il meccanismo che `verify-breakpoints.mjs` ha stabilito e che
>   `verify-conversion.mjs:1385-1395` descrive per intero. Nessuna delle due è ovvia; il
>   piano deve sceglierne una **prima** del primo run rosso (D-41-16).

**Conseguenza di pianificazione:** la wave 0 di `42-CONTEXT.md` è scritta come due voci
(D-42-06, D-42-07). Misurata, ha **cinque** obblighi che devono viaggiare insieme o il gate
rifiuta / arrossisce su codice corretto:

1. le quattro voci morte fuori da `CONVERTED`;
2. una disposizione per le **sei pagine di produzione** delle fasi 44/45;
3. la voce `EXEMPT_SHELLS` per `ScanFlash.tsx:135`;
4. la disposizione dei **14 touch target**;
5. la ridefinizione di `PHONE_LOCKED_NAV_WRAPPER` (§3).

---

## 3. Cosa si rompe cancellando `MobileNav.tsx`

### 3.1 L'unico consumatore di sorgente — confermato

`/usr/bin/grep -rn "MobileNav" src/ scripts/` — **un solo import in tutto `src/`**:
`src/app/(admin)/admin/scanner/DoorSurface.tsx:4`, montato a `:133-140`. D-42-03 è verificata.

### 3.2 ⚠ Il problema che D-42-03 non nomina, e che è meccanicamente dimostrato

`verify-conversion.mjs:2864-2866`:

```
const filesMountingResponsiveForm = allSrcFiles
  .filter((rel) => rel !== PHONE_LOCKED_NAV_WRAPPER && importsDirectly(rel, RESPONSIVE_NAV_MODULE))
```

Il discriminante fra *«monta la forma responsive»* e *«monta la forma telefono»* è
**testuale e locale**: importa `AppNav` direttamente **e non è `MobileNav`**
(`verify-conversion.mjs:2722-2729`). E check E fallisce **in entrambe le direzioni**
(`:2868-2873`): chi monta la forma responsive **deve** dichiarare la clearance di colonna a
`md`, chi la dichiara **deve** montarla.

**Nel momento in cui `DoorSurface.tsx` importa `AppNav` direttamente, il gate lo classifica
come mount della forma responsive** — cosa che è falsa, perché passa `form="phone"` — **e
poiché la porta non dichiara (né deve dichiarare) la clearance a `md`, check E va rosso.**

Provato, non dedotto. Sulla copia in scratchpad, con `MobileNav` cancellato, `DoorSurface`
che importa `AppNav` e `PHONE_LOCKED_NAV_WRAPPER` lasciato a puntare altrove:

```
✗ E  1 file(s) MOUNT the responsive navigation and declare no column clearance
```

### 3.3 La forma minima che funziona — anch'essa provata

Due edit, **nello stesso commit** della cancellazione:

| # | Edit | Riga |
|---|---|---|
| 1 | `PHONE_LOCKED_NAV_WRAPPER` = `'src/app/(admin)/admin/scanner/DoorSurface.tsx'` | `verify-conversion.mjs:2839` |
| 2 | La stessa path **aggiunta a `NAV_MODULES`** con la sua ragione | `verify-conversion.mjs:1121-1124` |

L'edit 2 non è opzionale: `pairingModulesUndeclared` (`:2841-2856`) **RIFIUTA** (exit 2,
`GATE CANNOT READ`) se `PHONE_LOCKED_NAV_WRAPPER` non è dichiarato in `NAV_MODULES` — *«the
two halves of one gate would be reading different trees»*. Verificato: senza l'edit 2 il gate
esce 2; con entrambi, `✓ E`.

> **La costante cambia di natura e va rinominata.** Non è più *un wrapper*: è *il file che
> monta `AppNav` bloccato sulla forma telefono*. Il nome `PHONE_LOCKED_NAV_WRAPPER` diventa
> una descrizione falsa — la stessa specie di frase che questa fase sta correggendo in
> `ScanFlash.tsx:65-72`. Suggerito: `PHONE_LOCKED_NAV_MOUNT`.
>
> **Ed è più fragile di prima, e il piano deve dirlo.** Prima il discriminante era *un file
> dedicato la cui unica ragione d'essere era passare `form="phone"`*; dopo è *un file di 143
> righe che fa anche la guardia di accesso*. Se un giorno `DoorSurface` smettesse di passare
> `form="phone"`, il gate resterebbe verde. Non è una ragione per non cancellare il wrapper —
> è una ragione per scrivere la fragilità nella ragione della voce, dove il prossimo lettore
> la trova. In alternativa, e più solida: il discriminante diventa **la prop**, cioè *importa
> `AppNav` direttamente e non passa `form="phone"` sulla stessa riga*.

### 3.4 Tutto ciò che deve cambiare nello stesso commit

| # | File:riga | Cosa | Tipo |
|---|---|---|---|
| 1 | `src/app/(admin)/admin/scanner/DoorSurface.tsx:4` | `import MobileNav` → `import AppNav` | **build** |
| 2 | `src/app/(admin)/admin/scanner/DoorSurface.tsx:133` | `<MobileNav …>` → `<AppNav … form="phone">` | **build** |
| 3 | `src/components/layout/MobileNav.tsx` (61 righe) | cancellato | **build** |
| 4 | `scripts/conversion-manifest.mjs:192-194` | voce `SPINE` — `checkManifest():943` **rifiuta** su una spine entry non su disco | **gate: exit 2** |
| 5 | `scripts/verify-conversion.mjs:1123` | voce `NAV_MODULES` — *«a path here that is not on disk REFUSES»* (`:1116-1121`) | **gate: exit 2** |
| 6 | `scripts/verify-conversion.mjs:2839` | `PHONE_LOCKED_NAV_WRAPPER` | **gate: exit 2** |
| 7 | `scripts/verify-conversion.mjs:1110`, `:2723-2726` | i due docblock che descrivono il wrapper per nome | prosa |
| 8 | `scripts/conversion-manifest.mjs:214-220` | il docblock di `PHASE_42_PATHS` che spiega il wrapper | prosa (esce col recinto) |
| 9 | `src/app/(admin)/admin/scanner/DoorSurface.tsx:74-82` | il docblock che dice `<MobileNav>` e `<StaffNav>` | prosa |
| 10 | `src/app/(admin)/admin/scanner/page.tsx:12` | *«the `MobileNav` mount … live in ./DoorSurface»* | prosa |
| 11 | `src/components/layout/AppNav.tsx:91-94` | *«which is what the `MobileNav.tsx` wrapper beside this file renders, and why that file still exists (D-41-21)»* | prosa — **la ragione muore, la prop resta** |
| 12 | `src/app/globals.css:269` | *«Re-deriving the height from MobileNav's markup would silently invalidate that literal in four files»* | prosa — **il vincolo resta vero, il nome cambia** |
| 13 | `src/types/database.ts:1100,1103,1110` | *«exactly two client components — `MobileNav` and `StaffNav`»* | prosa |
| 14 | `src/lib/rbac/roles.ts:50,52,111,185,286,297` | sei citazioni, fra cui *«all 13 `<MobileNav>` mount sites»* | prosa |
| 15 | `src/lib/capabilities/server.ts:202` | *«It is `MobileNav` and `StaffNav` — two…»* | prosa |
| 16 | `src/lib/supabase/middleware.ts:314` | *«`MobileNav` and `StaffNav` are "use client" components…»* | prosa |
| 17 | `src/app/(public)/artists/[slug]/page.tsx:51` | *«`AppNav` receives the same four props `MobileNav`…»* | prosa |
| 18 | `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx:52` | *«`MobileNav` is NOT mounted here»* | prosa |
| 19 | `src/app/(admin)/admin/(work)/layout.tsx:65,117` | *«It mounts `AppNav` and not the `MobileNav` wrapper deliberately»* | prosa |
| 20 | `src/app/(admin)/admin/(work)/events/[id]/tickets/page.tsx:86` | *«mounts `StaffNav` and `MobileNav` (D-34-07)»* | prosa |

**Le voci 1-6 rompono il build o mandano un gate a exit 2. Le voci 7-20 sono prosa e nessun
gate le legge** — i gate girano su sorgente con i commenti spenti (`scripts/lib/comments.mjs`,
`liveLines`). Ma **dodici di quelle diciotto stanno su superfici dichiarate convertite**, e
una frase che nomina un file che non esiste è esattamente il difetto che questa fase sta
riparando in `ScanFlash.tsx:65-72`. Il piano deve **dichiarare quale disposizione dà**: tutte
nello stesso commit, oppure un debito numerato con la sua ragione. La terza strada — lasciarle
senza dire nulla — è quella che ha prodotto il difetto che siamo qui a chiudere.

---

## 4. La mappa di `ScannerClient.tsx` (3449 righe)

### 4.1 Il conteggio, con il matcher del gate

Applicando **il matcher esatto** di `verify-conversion.mjs` (12 prefissi, 24 famiglie, scala
opzionale, guardie di confine):

| File | righe | palette grezza | token legacy |
|---|---|---|---|
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | 3449 | **57** | **42** |
| `src/components/scanner/ScanFlash.tsx` | 161 | **7** | 0 |
| `src/app/(admin)/admin/scanner/DoorSurface.tsx` | 143 | 0 | 0 |
| `src/app/(admin)/admin/scanner/page.tsx` | 18 | 0 | 0 |
| `src/app/(admin)/door/page.tsx` | 25 | 0 | 0 |
| **totale perimetro** | | **64** | **42** |

> ⚠ `42-CONTEXT.md` dice **56**. La differenza è `text-white` a `ScannerClient.tsx:2827`,
> che il gate conta perché `PALETTE_NAMES` include i due nomi acromatici
> (`verify-conversion.mjs:877-882`, *«the two achromatic names are in the list on purpose»*).
> Il numero da pianificare è **57**, e quel `text-white` sta su `bg-accent` — cioè è
> **esattamente la violazione** che `globals.css:176-178` proibisce (*«a semantic used as a
> fill carries `--ground` as its ink. Never `--ink`, never white»*) e che
> `verify-conversion.mjs:869-873` cita come *finding A2* con misura 2,91:1.

Distribuzione: `bg-yellow-500` ×10 · `bg-red-500` ×9 · `text-yellow-500` ×6 ·
`text-red-400` ×4 · `text-purple-400` ×4 · `border-red-500` ×4 · `text-red-500` ×3 ·
`text-green-500` ×3 · `border-yellow-500` ×3 · `bg-amber-500` ×2 · `text-amber-500` ×2 ·
`bg-purple-500` ×2 · `bg-green-500` ×2 · `text-yellow-400` ×1 · `bg-purple-400` ×1 ·
`text-white` ×1.
Legacy: `text-foreground` ×12 · `bg-card` ×9 · `border-card-border` ×9 · `bg-card-border` ×9 ·
`bg-background` ×3.

### 4.2 Le regioni, e chi le guarda davvero alla porta

| Regione | righe | Colori | Chi la guarda alle due di notte |
|---|---|---|---|
| **Il flash a schermo pieno** | `ScanFlash.tsx:76-118,135` | `green/amber/red-500` a `/90`, `text-white` ×4 | **SÌ — è l'unica cosa guardata.** Distanza di braccio, buio, una mano |
| **Pillola Online/Offline** | `:2799-2808` | `bg-green-500/15` `text-green-500` / `bg-yellow-500/15` `text-yellow-500` | **SÌ** — è il fatto che decide se fidarsi del verdetto |
| **Pillole di coda** (Pending, Could not be recorded, Sign in again, Undone, cannot read own queue) | `:2896-2946` | `yellow-500`, `red-500`, `amber-500`, `purple-500/400` | **SÌ, di sfuggita.** Sono le uniche righe che dicono che qualcosa non è stato registrato |
| **Banda di freschezza** (calcolata) | `:3169-3180` | ternario `yellow-500` ↔ `red-500` | **SÌ** — è la riga che dice che la lista è vecchia |
| **Errore fotocamera** | `:3126` | `red-500/40`, `red-500/10`, `red-400` | **SÌ** — è il momento in cui la porta non funziona |
| **«This night is over» + Scan anyway** | `:2856-2866` | `yellow-500` ×4 | Sì, ma una volta per serata |
| **Avvisi di cache** (calcolato) | `:3190-3191` | ternario `red-500` ↔ `yellow-500` | Sì, di sfuggita |
| **Torcia** (calcolato) | `:3212` | ternario `yellow-500/20 text-yellow-400` ↔ legacy | Sì, ma per tatto più che per colore |
| **Cronologia degli scan — le tre icone** | `:3282`, `:3296`, `:3310` | `text-green-500`, **`text-amber-500`**, `text-red-500` | Sì — è la strada dell'annullamento |
| **Deriva dell'orologio** | `:2872-2882` | solo legacy | No — amministrativo |
| **Elenco «Could not be recorded»** | `:2956-2957` | `red-500/30`, `red-500/5`, `red-400` | No — si apre a freddo |
| **Ricerca e tab di filtro** | `:3046-3100` | `accent`, legacy | Sì, ma non per colore |
| **Lista presenze** | `:3372-3402` | `purple-500/20 text-purple-400` (Guest List), `text-green-500` (arrivato) | Sì, in ripiego quando la fotocamera non va |
| **Selettore di serata** | `:2636-2700` | `text-purple-400` | No — precede la porta |

### 4.3 ⚠ I colori CALCOLATI — quello che una conversione meccanica manca

Cinque siti in cui la classe è scelta da un'espressione e non è una stringa letterale.
Una sostituzione fatta cercando la stringa **prende comunque** questi, perché le utility sono
scritte per esteso dentro i rami del ternario — ma **il gate di D-42-05 non li ritrova**, e un
lettore che cerca «di che colore è la banda» non trova una risposta sola:

| Riga | Costrutto | Rami |
|---|---|---|
| `:3174-3175` | `channelLive ? … : …` | `border-yellow-500/40 bg-yellow-500/10 text-yellow-500 active:bg-yellow-500/20` **oppure** `border-red-500/40 bg-red-500/10 text-red-400 active:bg-red-500/20` |
| `:3190-3191` | `notice.tone === "error" ? … : …` | `border-red-500/40 bg-red-500/10 text-red-400` **oppure** `border-yellow-500/40 bg-yellow-500/10 text-yellow-500` |
| `:3212` | `torchOn ? … : …` | `bg-yellow-500/20 text-yellow-400` **oppure** `bg-card-border/30 text-muted` |
| `:2827` | `showScanner ? … : …` | `bg-accent text-white` **oppure** `bg-card border border-card-border text-muted` |
| `:3282/3296/3310` | catena `isUndone ? … : isSuccess ? … : isFlagged ? … : isError ? …` | `text-muted` / `text-green-500` / **`text-amber-500`** / `text-red-500` |

**E qui c'è il fatto che corregge una frase di `42-CONTEXT.md`.**

> ⚠ **DISCORDANZA 5 — «Il cambio di D-42-02 è *una riga*» non è vero.**
> `42-CONTEXT.md` §Reusable Assets dice che `FLASH_STATES` è *«una sola tabella di lookup
> [che] governa colore, durata e glifo dei tre stati»* e che il cambio è una riga.
> **La cronologia degli scan disegna gli stessi tre stati una seconda volta**,
> `ScannerClient.tsx:3282-3320`, con gli **stessi identici path SVG** —
> `m4.5 12.75 6 6 9-13.5`, `M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z`,
> `M6 18 18 6M6 6l12 12` — e i colori `text-green-500` / **`text-amber-500`** /
> `text-red-500`. Se cambia solo `ScanFlash.tsx:91`, **il flash dice violetto e la
> cronologia dello stesso scan dice ambra**, tre secondi dopo, sulla stessa superficie. Sono
> **due righe**, e la seconda sta nel file che nessuno vuole aprire.

E c'è anche una **terza collisione, nuova, che D-42-02 non ha misurato:**

| Coppia | normale | protanopia | deuteranopia | tritanopia |
|---|---|---|---|---|
| `purple-400` (`#C27AFF`) vs `--sem-done` (`#9B7BE0`) | **8,0** | **5,3** | **6,4** | 13,8 |
| `purple-500` (`#AD46FF`) vs `--sem-done` | 12,2 | 12,4 | **8,3** | 13,4 |

`purple-400` è **più vicino a `--sem-done` di quanto ambra fosse a giallo** (8,0 contro 10,0).
Oggi `purple-400`/`purple-500` disegnano quattro cose sulla porta: la pillola *«Undone at the
door, held on this device»* (`:2934-2935`), il badge *Guest List* nella lista presenze
(`:3388`) e i due contatori *«(+N guest list)»* (`:2695`, `:3022`). Se la conversione li porta
sul token violetto più ovvio — che è `--sem-done` — **il terzo stato del flash e la pillola
degli annullamenti diventano lo stesso colore**, che è la forma esatta del difetto che D-42-02
esiste per chiudere, su un'altra coppia. **Non c'è una decisione ovvia**, e non è una che il
proprietario debba prendere (nessun colore nuovo). Il piano la prende, la misura e la scrive.
Le alternative già misurate: `--sem-info` (`#A493C0`) regge dai tre esiti (min 23,1) ma è
*l'inchiostro terziario*; oppure il violetto resta grezzo con la sua deroga, come verde e
rosso.

### 4.4 Il secondo commento falso, che `42-CONTEXT.md` non nomina

D-42-02 identifica `ScanFlash.tsx:65-72`. Ne esiste un **secondo**, che afferma la stessa
cosa dall'altro lato — `ScannerClient.tsx:2792-2798`:

> *«Online/Offline status indicator — connectivity, and only connectivity. It keeps
> `yellow-500` for Offline, **which is precisely why the third scan state is amber and not
> yellow**: the two must not read as one signal in a dark room.»*

Misurato: ambra e giallo distano **10,0 a vista normale e 2,0 in deuteranopia**. La collisione
che entrambi i commenti dichiarano di aver evitato **non è stata evitata**, e il fatto è
scritto in due file invece che in uno. Vanno corretti **insieme**, o il prossimo lettore trova
la frase sopravvissuta e ci crede.

### 4.5 Perché `ScannerClient.tsx` non si ristruttura

`checkin-offline.md` si carica su `src/app/**/scanner/**` e porta i gate del dominio.
`ai-engineering.md` gate *context budget* registra questo file come **caso peggiore misurato**:
cinque moduli, 38.240 byte ≈ 10.622 token su un tetto di 12.000, margine 1.378. È il file su
cui la persona ha meno spazio di manovra. La conversione è **meccanica e in loco**, come
D-42-07 dichiara — e questo è anche il motivo per cui aggiungere prosa qui è caro.

---

## 5. RESP-05 / criterio 2 — cosa fa oggi il mirino, a ogni larghezza

### 5.1 Gli elementi, misurati

| Cosa | file:riga | Classi oggi |
|---|---|---|
| Radice della superficie | `ScannerClient.tsx:2761` | `min-h-dvh bg-background pb-24` |
| Radice del selettore di serata | `:2637` | `min-h-dvh bg-background pb-24` |
| Header sticky | `:2763` | `sticky top-0 z-10 bg-background px-6 pt-6 pb-3` |
| Corpo | `:3110` | `px-6` |
| **Card del mirino** | `:3202` | `mb-4 rounded-xl border border-card-border bg-card p-4` |
| **Il mirino** | `:3204` | `<div id="qr-reader" className="overflow-hidden rounded-2xl" />` |
| Riquadro di decodifica | `:1529` | `{ fps: 15, qrbox: { width: 280, height: 280 } }` |

**Non esiste un solo `max-w-` in tutto il file.** `grep -c 'max-w-'` su `ScannerClient.tsx`,
`DoorSurface.tsx` e le due `page.tsx`: **zero**.

### 5.2 Cosa succede, larghezza per larghezza

Il `<video>` lo inietta `html5-qrcode` dentro `#qr-reader` (`:1522-1530`), e il contenitore è
un blocco senza limite. Quindi:

- **390px (telefono)** — card larga 390 − 48 (px-6 ×2) − 32 (p-4 ×2) = **310px**. Il qrbox da
  280px ci sta appena. È la larghezza per cui è stato scritto.
- **768px (tablet)** — il mirino si stira a **688px** mentre la regione decodificata resta
  280×280 al centro. Il video occupa **2,5 volte** l'area utile.
- **1440px (desktop)** — il mirino si stira a **1360px**, la regione decodificata resta
  280×280. Il video occupa **4,9 volte** l'area utile, e il resto è una fascia di immagine che
  non serve a nessuno ma che il browser deve comunque decodificare a 15 fps.

**«Si stira invece di centrarsi» è letterale e misurabile**, ed è vero per **tutta** la
superficie, non solo per il mirino: header, pillole, lista presenze — tutto è a piena
larghezza.

### 5.3 Cosa hanno fatto le fasi 41 e 41.2, e cosa vincola

- La shell possiede **tre** maximum e nient'altro: `max-w-5xl` (1024) · `max-w-7xl` (1280) ·
  `max-w-sm` (384) — `PageShell.tsx:151-168`, `DECLARED_MAXIMA` a `verify-conversion.mjs:973`.
- **D-41-06:** il maximum è della shell e **mai** di una pagina (check D, `:3308-3313`).
- **D-41.2-02:** tutte e dieci le superfici pubbliche/membro hanno preso `default`,
  *«an answer, not a fallback»*, reversibile in una riga della chiamata della shell.
- **`focus` è indisponibile alla porta**, perché monta la navigazione (§2.2).
- La shell `default` **aggiunge anche** `px-6 pt-12 pb-[calc(var(--nav-inset-block-end)+1rem)]`
  e `ps-[var(--nav-inset-inline-start)]` (`PageShell.tsx:160-165`). Alla porta
  `--nav-inset-inline-start` vale `0px` (`globals.css:320`, non ridichiarato a `md` — D-41.1-01),
  quindi la colonna **non compare**, il che è esattamente ciò che D-42-03 vuole.

### 5.4 Le tre strade, con i loro costi

| # | Strada | Chiude check D? | Costo | Rischio |
|---|---|---|---|---|
| **A** | Il `page.tsx` avvolge `<DoorSurface/>` in `<PageShell width="default">` | **Sì** | La porta prende 1024px centrati **e** `pt-12`, `px-6` esterni. Il `px-6` interno di `ScannerClient` diventa doppio; l'`header sticky` finisce dentro un contenitore centrato; `min-h-dvh` si annida | **Cambia il layout di tutta la superficie di sicurezza**, non solo del mirino. È molto più di *colore, contrasto e tipo* |
| **B** | `max-w-*` + `mx-auto` scritti dentro `ScannerClient.tsx`, `page.tsx` invariato | **No** — check D resta rosso su due pagine | Solo dove serve; nessun cambio a paddings esterni | Contraddice D-41-06 e lascia check D rosso: inaccettabile senza un meccanismo |
| **C** | **B + un meccanismo dichiarato in check D**, sulla forma di `TYPOGRAPHIC_MEASURES` (`verify-conversion.mjs:1012-1102`) | **Sì** | Una lista `FULL_BLEED_SURFACES` `[route, reason]` che perdona `pagesWithoutShell` per una superficie che è **schermo pieno per costruzione** | Un meccanismo nuovo — ma con quattro precedenti nello stesso file, e scritto **prima** del run rosso |

**Raccomandazione (discrezione dell'esperto, D-42-04 §Claude's Discretion):** **C**, con la
larghezza fermata a **`max-w-5xl` (1024px)** — lo stesso numero che tutte e trentaquattro le
superfici `default` già portano, quindi *scelto* e non *inventato*. La ragione di dominio, non
di simmetria: alla porta la superficie si lavora con **una mano**, e su un tablet in
orizzontale un pollice non arriva a 1360px. Centrare a 1024 è la stessa distanza di
raggiungibilità che il resto del prodotto ha già scelto.

Il **mirino** dentro quel contenitore vuole un limite proprio più stretto — la regione
decodificata è 280px e ogni pixel oltre è video decodificato per niente. Un
`max-w-sm mx-auto` (384px) sul contenitore `#qr-reader` è la scelta minima che rende vera la
frase *«si centra invece di stirarsi»* **senza toccare nulla di ciò che l'oggetto fa**: non
tocca `qrbox`, non tocca `fps`, non tocca `facingMode`, non tocca la torcia. È l'unica
modifica di questa fase che è insieme *layout* e *dentro il perimetro*, perché non cambia
nessuna decisione — cambia quanta immagine il browser disegna intorno alla decisione.

> **La domanda di perimetro va risolta nel piano, non lasciata dedurre.** RESP-05 dice *«the
> scanner centres»*; il criterio 2 dice *«the viewfinder centres»*. La strada C con
> `max-w-5xl` sulla superficie **e** `max-w-sm` sul mirino soddisfa entrambe. La strada B con
> il solo mirino soddisfa il criterio 2 e **non** RESP-05.

---

## 6. Il reperto meccanico (D-42-04) — cosa è catturabile e cosa no

### 6.1 Catturabile, oggi, senza toccare la produzione

| # | Cosa | Dove sta | Come si cattura | Come si riconfronta |
|---|---|---|---|---|
| 1 | **I tre dwell** — 1500 / 2500 / 2000 ms | `ScanFlash.tsx:79`, `:92`, `:107` | `grep -n 'delay:' src/components/scanner/ScanFlash.tsx` | tre interi, diff esatto |
| 2 | **I tre pattern aptici** — `200`, `[300,80,120]`, `[100,50,100]` | `src/utils/haptics.ts:19`, `:38`, `:25` | `grep -n 'navigator.vibrate' src/utils/haptics.ts` | tre letterali, diff esatto |
| 3 | **La mappatura esito → aptico** | `ScannerClient.tsx:1595-1608` | il corpo di `showFlash` | diff di funzione |
| 4 | **I 26 siti di `showFlash`, ognuno col suo `type`** | `:1734,1749,1758,1783,1792,1835,1859,1866,1903,1936,1951,2032,2067,2084,2123,2156,2196,2257,2272,2287,2345,2358,2432,2466,2485,2503` | `grep -n 'showFlash(' … \| wc -l` e la lista dei tipi | **26**, e ogni riga col suo esito. Un 27° o un tipo cambiato è un difetto della conversione |
| 5 | **I tre esiti, come tipo** | `src/lib/door/outcome.ts:116-135` — `recorded` \| `already_recorded` \| `not_valid` | *«There are three, and an undo is not a fourth»* (`:110-111`) | l'unione TypeScript, verbatim |
| 6 | **I tre glifi**, come path SVG | `ScanFlash.tsx:85,100,113` **e** `ScannerClient.tsx:3287,3301,3315` | i sei path letterali | sei stringhe. §4.3 spiega perché sono sei e non tre |
| 7 | **La forma della coda offline** | `src/lib/offline/checkin-store.ts:56` `DB_NAME="resonate-checkin"` · `:57` `DB_VERSION=5` · `:99` `MAX_SYNC_ATTEMPTS=8` · `:105` `QueuedSubjectType` · `:182` `PendingCheckin` · `:244` `FailedCheckin` | le costanti e le interfacce | **la versione del DB non deve muoversi**: un `DB_VERSION` a 6 in una fase di colore è un difetto per definizione |
| 8 | **Le due strade** — ticket e membership, online e offline | `ScannerClient.tsx:2213` (membership, radio ON) · `:2374` (membership dentro URL o codice nudo) · `:2105` · `:2302` · `:2440` | i confini delle funzioni + la lista dei `showFlash` per funzione | quattro combinazioni × tre esiti |
| 9 | **Il manifest delle route** | `src/lib/routes/capability-routes.ts`, letto da `npm run verify:routes` | output del gate, committato | diff dell'output |
| 10 | **La finestra di doppia lettura** | `src/lib/door/classify.ts:64` — `DOUBLE_READ_WINDOW_SECONDS = 20` | costante | intero |
| 11 | **La configurazione della fotocamera** | `ScannerClient.tsx:1529` — `fps: 15`, `qrbox: 280×280`; `:1527` `facingMode:"environment"` | letterali | **il criterio 2 tocca il contenitore, mai questa riga** |
| 12 | **La build** | `npm run build` | è il typecheck (`meta-gates.md`) | esce 0 prima e dopo |
| 13 | **`npm run verify`** | 17 gate | output completo | il reperto **prima** documenta anche il rifiuto DEF-45-01 e i sei page.tsx: cambiano in wave 0, non con la conversione |

**Forma raccomandata:** un solo file committato, `42-BASELINE.md`, generato da uno script
che stampa i tredici blocchi, con la data e lo SHA del commit su cui gira. È l'unica cosa che
rende la parola *invariato* misurabile su un file di 3449 righe — la frase è di D-42-04 e la
misura è questa.

### 6.2 ⚠ Ciò che NON è catturabile meccanicamente, e va detto

| Cosa | Perché no |
|---|---|
| **Che il flash sia leggibile a distanza di braccio in una stanza buia** | Nessuno strumento qui rende un pixel. `verify-conversion.mjs:3893-3898` lo dice del proprio verde: *«it reads a class string and an import graph, renders nothing and measures no pixel»*. È il criterio 1, ed è del door pass |
| **Che l'aptico si senta** | iOS degrada `navigator.vibrate` a nulla (`haptics.ts:8`). Un grep prova che la chiamata c'è, mai che il telefono vibri |
| **Che il ritorno automatico avvenga davvero dopo N ms** | Il `setTimeout` è a `ScanFlash.tsx:127`. Che sparisca e che riabiliti la decodifica (`dismissFlash`, `ScannerClient.tsx:1610`) è un fatto di runtime |
| **Che la torcia si accenda** | `getCapabilities().torch` (`:1548`) dipende dal dispositivo |
| **Che la coda sopravviva a un riavvio dell'app** | `checkin-offline.md` gate *coda durevole*. È IndexedDB reale su un telefono reale |
| **Che l'annullamento funzioni offline** | `:1835`, ma il percorso è offline e per dispositivo |
| **Che la porta renderizzi con la radio spenta** | Cache runtime `NetworkFirst`, 24h, 32 voci, **chiavi = URL** (`checkin-offline.md`). È `39-DOOR-PASS.md` §8 |
| **Che i tre esiti siano identici online e offline** | È il criterio 2 della fase 31, ed è umano |
| **Che nessun errore sia stato ingoiato** | **Non esiste error tracking** (`meta-gates.md`, verificato 2026-08-05). Un fallimento notturno non raggiunge nessuno |

**La conseguenza che il piano deve scrivere in chiaro:** il reperto meccanico prova che le
**costanti** e le **strade** non si sono mosse. Non prova che il **comportamento** non si sia
mosso. Il criterio 3 dice *«verified by running the door pass again on a device»*, e
`39-VERIFICATION.md` lo registra come `human_needed` perché **non esiste un prima**. Il door
pass sul NON convertito (D-42-04 punto 3) è la prima linea di base che questo progetto avrà
mai — e il reperto meccanico non la sostituisce: la accompagna.

---

## 7. La forma minima onesta di `verify-scan-legibility.mjs` (D-42-05)

### 7.1 Dove stanno i colori, e quanto sono stabili da leggere

| Colore | Sorgente | Stabilità |
|---|---|---|
| accetta / già registrato / rifiuta | `ScanFlash.tsx:78`, `:91`, `:106` — `bg: "bg-green-500/90"` dentro `FLASH_STATES` | **ALTA.** Tre proprietà `bg:` in un solo oggetto letterale. Ancora: il nome della chiave (`success`/`already_recorded`/`error`) |
| **pillola *Offline*** | `ScannerClient.tsx:2804-2805` — `bg-yellow-500/15 … text-yellow-500` e `bg-yellow-500` | **BASSA.** JSX inline in un file di 3449 righe; `bg-yellow-500` compare **10 volte** su cinque funzionalità diverse (`:2805`, `:2856-2865` ×3, `:2903-2904` ×2, `:3174` ×2, `:3212`). Nessuna ancora testuale stabile oltre la stringa `Offline`, che compare anche a `:2196` dentro un sottotitolo |
| gli stessi tre nella cronologia | `ScannerClient.tsx:3282`, `:3296`, `:3310` | **MEDIA.** Dentro una catena di ternari; ancora = il path SVG, che è stabile e identico a quello del flash |
| il valore di `--sem-done` | `globals.css:183` — `--sem-done: #9B7BE0;` | **ALTA.** `verify-tokens.mjs` già legge questo blocco |
| il valore di `green-500` / `red-500` | `node_modules/tailwindcss/theme.css:75`, `:15` — **`oklch`** | **MEDIA.** Non è tracciato: è una dipendenza. Un `npm install` che aggiorna Tailwind cambia il colore del prodotto |

**Due conseguenze che il piano deve risolvere prima di scrivere lo script:**

1. **La pillola *Offline* non è leggibile in modo stabile da dove sta oggi.** La forma onesta è
   sollevarla in una costante nominata, sullo stesso pattern che `ScanFlash.tsx:56` già
   dichiara — *«One lookup, and the only place any of this changes»*. È **dentro** il perimetro
   *colore*, non è una ristrutturazione, e rende il gate una lettura invece di una scommessa.
   L'alternativa — un'ancora testuale su `Offline` — è la specie di lettura che il repo chiama
   *«a fragment rather than a line number precisely so it goes stale loudly»*
   (`verify-conversion.mjs:3253`), e va bene solo se l'ancora è unica: qui **non lo è**.
2. **I valori grezzi vengono da `node_modules`.** Il gate deve leggere `theme.css`, e
   **rifiutare** (exit 2, non 1) se non lo trova — è precisamente la condizione *«nothing was
   measured»*. E deve convertire `oklch → sRGB lineare`, che il repo non ha: ~25 righe di
   matrice, senza dipendenze. **Aggiungere un pacchetto npm per questo sarebbe una decisione
   nuova su un repo che oggi non ne ha nessuno per i gate** — e non serve.

### 7.2 Lo scheletro, dai gate esistenti

Il modello più vicino per taglia è `verify-sunset-gradient.mjs` (456 righe) o
`verify-no-viewport-read.mjs` (358). La forma di casa:

```
import { readFileSync, existsSync } from 'node:fs';
import { liveLines } from './lib/comments.mjs';          // i commenti non contano
function refuse(message) { console.log(`\nFATAL: ${message}\n`); process.exit(2); }
const failures = [];
…
if (failures.length === 0) { console.log('SCAN_LEGIBILITY_OK — …'); process.exit(0); }
console.log(`SCAN_LEGIBILITY_FAIL — ${failures.length} check(s) failed: …`); process.exit(1);
```

**La distinzione `refuse()` / `failures.push()` è la cosa che questo repo non perdona.**

| | `refuse()` | `failures.push()` |
|---|---|---|
| Significa | **la misura non è avvenuta** | la misura è avvenuta e dice no |
| Exit | **2** | **1** |
| Quando | sorgente non trovata, letterale non riconosciuto, `theme.css` assente, `FLASH_STATES` con meno di tre voci, la pillola *Offline* non individuata | una coppia sotto soglia in una qualunque simulazione |

Un rifiuto che assorbe un fallimento è il difetto che `verify-all.mjs:196-212` chiama
`41-GAP-REVIEW.md WR-01`: *«a failure must not be reportable as a refusal either»*. Concreto
qui: se lo script non trova la pillola *Offline* e continua misurando solo i tre esiti, stampa
un verde su una misura che **non ha fatto** — il difetto esatto che il gate esiste per
impedire. **Deve rifiutare.**

### 7.3 Registrare il gate in `verify-all.mjs`

Due edit, **stesso commit**:

1. `package.json:32` (fra le altre `verify:*`) —
   `"verify:scan-legibility": "node scripts/verify-scan-legibility.mjs"`.
2. `scripts/verify-all.mjs`, lista `OFFLINE` (`:238-330`), forma `[npmScriptName, optional, note]`:
   `["verify:scan-legibility", false, "Phase 42 — DS-04, le distanze fra i tre esiti e la pillola Offline sotto le tre dicromazie"]`.

Perché entrambi: `verify-all.mjs` **riconcilia** ciò che `package.json` dichiara con ciò che le
sue liste conoscono, e un nome in uno solo dei due **RIFIUTA** l'intera suite con exit 2
(`:176-194`). È T-41-44, ed è arrivato una volta da dentro questo file.

### 7.4 La prova per mutazione

`ai-engineering.md`, gate *prova per mutazione*, con la clausola che è costata un falso
negativo: **«asserisci che la mutazione sia stata applicata, prima di leggerne l'esito»**.
D-42-05 la nomina già: si rimette l'ambra, si verifica che scatti, si ripristina. Aggiungo tre
mutazioni che il piano dovrebbe pretendere, perché ognuna copre un modo di essere decorativo:

| Mutazione | Deve produrre |
|---|---|
| `ScanFlash.tsx:91` torna a `bg-amber-500/90` | **exit 1**, coppia ambra/*Offline* sotto soglia |
| la costante della pillola *Offline* rinominata | **exit 2** — «nothing was measured», non exit 0 |
| `theme.css` reso illeggibile | **exit 2** |
| il terzo esito portato su `--sem-info` | **exit 0** — il gate non deve rossare su una scelta legittima diversa da quella fatta |

L'ultima è quella che distingue un gate da una preferenza scritta in JavaScript.

---

## 8. Cosa è GIÀ vero, e che il piano verifica invece di costruire

**La seconda metà di DS-04 — *«colour is never the only channel»* — è soddisfatta prima che
questa fase cominci.** Quattro canali, misurati:

| Esito | Colore | **Glifo** | **Permanenza** | **Vibrazione** | **Parole** |
|---|---|---|---|---|---|
| `success` | `bg-green-500/90` `ScanFlash.tsx:78` | spunta — `m4.5 12.75 6 6 9-13.5` `:85` | **1500 ms** `:79` | `navigator.vibrate(200)` `haptics.ts:19` | `title` + `subtitle`, sempre passati |
| `already_recorded` | `bg-amber-500/90` `:91` | **quadrante d'orologio** — `M12 6v6h4.5…` `:100` | **2500 ms** `:92` | `[300, 80, 120]` `haptics.ts:38` | idem |
| `error` | `bg-red-500/90` `:106` | croce — `M6 18 18 6M6 6l12 12` `:113` | **2000 ms** `:107` | `[100, 50, 100]` `haptics.ts:25` | idem |

Le tre affermazioni che il piano **verifica** e non costruisce:

1. **Il glifo è distinto per costruzione**, e la scelta è argomentata: il quadrante d'orologio
   *«reads as *already, earlier*. An exclamation mark or a crossed circle would read as a
   refusal, which this state never is»* (`ScanFlash.tsx:93-94`).
2. **La permanenza è informazione**: 2500 ms sul terzo stato *«because it carries a time and
   an operator to read, and it is read while someone is waiting»* (`:72-74`).
3. **L'aptico è distinguibile al tatto**: *«one long pulse is success, a short-short burst is
   an error, and this is a long-then-short pair»* (`haptics.ts:32-34`).
4. **Lo stato è scritto a parole** — quello che `42-CONTEXT.md` prende da Xceed. `ScanFlash`
   ha `title` e `subtitle` obbligatorio il primo, e **tutti e 26** i siti di `showFlash`
   passano almeno un titolo. Da verificare col reperto: i sottotitoli del terzo stato
   nominano la causa (`FLAG_MESSAGE`, `:105`; `recordedFact`, `:164`; *«who and when»*,
   `outcome.ts:129-131`).
5. **`ScanFlash` non ha una via di fuga di stile** — *«no colour prop, no `variant` and no
   className override»* (`:8-12`). **Non introdurne una.** È già scritto nel file che la fase
   42 lo saprebbe.

**E c'è una cosa che va confermata, non cambiata**: lo schermo pieno. `42-CONTEXT.md` §Specific
Ideas lo dice — da ThunderTix e Shotgun, contro il banner di Xceed. `ScanFlash.tsx:135` è
`fixed inset-0 z-[70]`. **È già pieno.** L'unica conseguenza è §2.7: quell'overlay è ciò che
`verify-dialogs` reddisce quando il recinto cade, e la ragione per cui non è un dialog è già
scritta nel gate stesso.

---

## 9. Cosa NON fare — anti-pattern specifici di questa fase

- **Non allargare `EXEMPT_PATHS` a un file dello scanner.** Esclude il **file intero** dalla
  closure (`verify-conversion.mjs:1675`). Su `ScannerClient.tsx` significherebbe che 3449
  righe smettono di essere misurate da A, B e D — e resterebbero non misurate per sempre. Se
  serve una deroga, il confine è **la utility** o **la shell**, mai il file: è la correzione
  che `verify-dialogs.mjs:2494-2499` ha già dovuto fare una volta.
- **Non abbassare la soglia di D-42-05 per farlo passare.** *«Fix the ELEMENT, not this gate.
  Widening an exemption to clear a red is the tampering T-41-42 names»*
  (`verify-touch-targets.mjs`). Se verde/rosso non passa, la risposta è una **deroga
  argomentata**, non un numero più piccolo.
- **Non toccare `qrbox`, `fps`, `facingMode` né il `setTimeout` del flash.** Sono le costanti
  del reperto. Il criterio 2 tocca il **contenitore**.
- **Non riscrivere le tre frasi delle tre cause di errore.** `41.1-06` lo registra come
  cautela: una conversione che le riordinasse verso una frase sola *«would recreate
  CONCERNS.md's recorded defect while looking like a styling commit»*
  (`conversion-manifest.mjs:550`). Sulla porta le cause distinte sono `NOT_VALID_MESSAGE`
  (`ScannerClient.tsx:83-98`), `FLAG_MESSAGE` (`:105`), `FAILURE_REASON_MESSAGE` (`:232`),
  `UNRECOGNISED_REASON_MESSAGE` (`:99`). **Byte per byte.**
- **Non aggiungere prosa a `ScannerClient.tsx` senza rimisurare il context budget.** È il
  caso peggiore misurato della persona, margine 1.378 token (`ai-engineering.md`).
- **Non spedire in una settimana con una serata.** D-42-04, e sarebbe una violazione
  consapevole di un vincolo del roadmap (`ROADMAP.md:1019`), non una scelta di pianificazione.
- **Non scrivere la data della serata in `.planning/`.** `42-CONTEXT.md` registra che una
  prima stesura la conteneva. `ai-engineering.md` gate *la pianificazione è pubblica*.

---

## 10. Package Legitimacy Audit

**Nessun pacchetto esterno è installato da questa fase, e nessuno serve.**

- La conversione tocca stringhe di classe e un token già dichiarato.
- `verify-scan-legibility.mjs` non ha bisogno di alcuna dipendenza: `node:fs` + ~120 righe di
  matematica (oklch → sRGB, Viénot 1999, CIEDE2000), che è la forma di tutti i 22 gate
  esistenti — nessuno di loro importa un pacchetto npm.
- **Introdurre una dipendenza per la conversione colore sarebbe una decisione nuova**, e non
  necessaria: la matematica sta in `scratchpad/cvd.mjs` di questa ricerca, verificata contro
  le luminanze relative di `42-CONTEXT.md` (concordi a tre decimali).

Se un piano proponesse comunque un pacchetto (`culori`, `colorjs.io`, `color-blind`), va
trattato `[ASSUMED]` e passato per `slopcheck` prima dell'installazione — ma la
raccomandazione è **non farlo**: aggiungerebbe una superficie di supply chain a un repo che
oggi ha zero dipendenze nei gate.

---

## 11. Environment Availability

| Dipendenza | Serve a | Disponibile | Versione | Ripiego |
|---|---|---|---|---|
| Node | ogni gate | ✓ | v25.6.1 | — |
| `node_modules/tailwindcss/theme.css` | i valori grezzi per D-42-05 | ✓ | `tailwindcss ^4` (`package.json:71`) | **nessuno** — il gate deve rifiutare, non indovinare |
| `npm run build` | l'unica verifica automatica del prodotto | ✓ | — | — |
| `npm run verify` (17 gate) | i gate meccanici | ✓ ma **esce 2** oggi | — | riparato in wave 0 |
| Test runner | — | ✗ | — | **non esiste** (`meta-gates.md`). La verifica è `npm run build` + procedura manuale scritta |
| Error tracking | osservare un fallimento notturno | ✗ | — | **non esiste**. Un errore alla porta deve **mostrarsi allo staff sul posto** |
| Dispositivo reale + stanza buia | criteri 1 e 3 | umano | — | **nessuno** |

---

## 12. Vincoli di progetto (da CLAUDE.md e `.claude/rules/`)

| # | Direttiva | Fonte | Effetto su questa fase |
|---|---|---|---|
| 1 | **Nessun test runner per il prodotto.** Mai dire «verificato perché i test passano» | `CLAUDE.md` Guardrail 1 | Ogni piano chiude con `npm run build` + procedura manuale **scritta**, mai evocata |
| 2 | Il typecheck passa dal build | Guardrail 2 | `next build` è il gate dei tipi |
| 3 | `.planning/` è **pubblico** | Guardrail 5, `ai-engineering.md` | Ruoli, mai nomi. Nessuna data, sede o line-up |
| 4 | macOS/BSD: `grep -E`, `sed -i ''` | Guardrail 6 | — |
| 5 | **Il middleware è UX, la RLS è sicurezza** | Operating Principle 2 | Questa fase non tocca né l'una né l'altra: va **asserito** nella reason |
| 6 | **La porta non ha rete** | Operating Principle 3 | Nessuna modifica può introdurre una dipendenza di rete. L'asimmetria: rifiutare un ospite valido è peggio che ammetterne uno doppio |
| 7 | **Zero fallimenti silenziosi** | Operating Principle 6, `meta-gates.md` | Nessun `catch` nuovo; le quattro tabelle di messaggi restano byte per byte |
| 8 | **Precisione lessicale** | Operating Principle 8 | Un *format* non è un *evento*; `member` non è `approved`; un *flash* non è un *dialog* |
| 9 | Ogni fase produce un `VERIFICATION.md` con **evidenza `file:riga` per requisito** | `CLAUDE.md` §Gate VERIFICATION.md | 42-VERIFICATION.md deve citare righe, non evocare |
| 10 | **Prova per mutazione** su ogni controllo aggiunto, **e la mutazione va asserita applicata** | `ai-engineering.md` | §7.4 |
| 11 | Un gate deve poter **caricarsi** e poter **fallire** | `ai-engineering.md` | Un `verify-scan-legibility` che nessuna situazione raggiungibile viola è decorazione |
| 12 | Guardie monotone: `venue_reveal_sent`, pagamento → `completed`, numerazione di serie | `meta-gates.md` | Questa fase non ne tocca nessuna: va **asserito** |
| 13 | Feedback immediato: verde/rosso, flash e vibrazione **prima** di ogni conferma di rete | `checkin-offline.md` | `showFlash` (`:1595-1608`) è quel punto. **Non si sposta** |
| 14 | Gate *entropia dei codici*: `src/utils/qr.ts:49` usa `Math.random()` — **difetto presente** | `checkin-offline.md` | **Fuori perimetro.** Non è colore. Non va né riparato né citato come riparato |
| 15 | Il gate *accessibilità al buio*: contrasto, dimensione dei target e feedback non visivo **sono la condizione d'uso reale** | `nextjs-architecture.md` | È il gate che rende i 14 touch target di §2.7 una domanda vera e non un fastidio del gate |

---

## 13. Assumptions Log

| # | Affermazione | Sezione | Rischio se è sbagliata |
|---|---|---|---|
| A1 | La mia simulazione dicromatica è corretta e quella di `42-CONTEXT.md` ha protanopia/deuteranopia invertite | §0 | Se sono io a sbagliare, la soglia di D-42-05 può restare 10 e la deroga verde/rosso non serve. **Si risolve facendo girare il gate**, che è già in D-42-05 |
| A2 | La composizione a `/90` sopra `--ground` è ciò che il browser rende | §0 | Se il flash comparisse sopra qualcos'altro (la fotocamera aperta), il fondo sarebbe il video. Non misurabile da qui — dipende dall'ordine di stacking, e `z-[70]` sta sopra tutto |
| A3 | Le sei pagine di produzione non convertite sono di competenza delle fasi 44/45 e non della 42 | §2.7 | Se il proprietario decidesse il contrario, la wave 0 cresce di sei superfici |
| A4 | `max-w-5xl` (1024px) è la larghezza giusta per la porta | §5.4 | È **discrezione dell'esperto** per D-42-04. Reversibile in una riga |
| A5 | Le 14 violazioni di touch target non sono in perimetro *colore, contrasto e tipo* | §2.7 | Se lo sono, la fase cresce. **La decisione è del piano, e va scritta** |
| A6 | I 18 riferimenti in prosa a `MobileNav` non rompono nulla meccanicamente | §3.4 | Verificato: i gate leggono `liveLines`, i commenti sono spenti. Il rischio è editoriale, non meccanico |

---

## 14. Domande aperte

1. **Quale delle due misure dicromatiche è giusta?** — Si risolve col primo run di
   `verify-scan-legibility.mjs`, che è già in D-42-05. **Raccomandazione:** farlo girare in
   **wave 0**, prima di qualunque conversione, così che la soglia sia scelta con il numero in
   mano e non prima.
2. **Che disposizione ricevono le sei pagine di produzione?** — Un secondo recinto per nome, o
   una decisione delle fasi 44/45. **Blocca wave 0.**
3. **I 14 touch target: pagati o messi a debito?** — Alla porta un target troppo piccolo è
   una coda. Fuori perimetro nominale, dentro `nextjs-architecture.md` gate *accessibilità al
   buio*. **Blocca l'apertura del recinto.**
4. **Le quattro superfici viola prendono `--sem-done` insieme al terzo stato?** — Se sì,
   collidono a 8,0. §4.3.
5. **Inchiostro del glifo: `--ground` su tutti e tre, o bianco dove regge?** — Discrezione
   dell'esperto (D-42-02 lo dice). I numeri di §0 dicono che `--ground` è meglio su tutti e
   tre, e che il rifiuto è il caso più stretto (4,80:1).
6. **`tabular-nums` sui contatori:** dentro *tipo* o scope creep? — `42-CONTEXT.md` lo mette
   in Deferred con la clausola *«va detto e rimandato invece che fatto di straforo»*. Il piano
   dica quale delle due.

---

## 15. Sources

### Primarie (HIGH — misurate su questo albero, con il comando)

- `scripts/conversion-manifest.mjs` (991 righe) — letto per intero; `checkManifest()` **eseguito**
- `scripts/verify-conversion.mjs` (3911 righe) — check A/B/C/D/E/F letti; il gate **eseguito**
  su una copia patchata in scratchpad, quattro configurazioni
- `scripts/verify-dialogs.mjs`, `scripts/verify-touch-targets.mjs`, `scripts/verify-all.mjs`,
  `scripts/verify-sunset-gradient.mjs`, `scripts/verify-no-viewport-read.mjs`
- `src/app/(admin)/admin/scanner/ScannerClient.tsx`, `DoorSurface.tsx`, `page.tsx`;
  `src/app/(admin)/door/page.tsx`; `src/components/scanner/ScanFlash.tsx`;
  `src/components/layout/MobileNav.tsx`, `AppNav.tsx`; `src/components/ui/PageShell.tsx`;
  `src/utils/haptics.ts`; `src/lib/door/outcome.ts`, `classify.ts`;
  `src/lib/offline/checkin-store.ts`; `src/app/globals.css`
- `node_modules/tailwindcss/theme.css` — i quattro valori `oklch`
- `.planning/ROADMAP.md:960-972` (fase 42), `:1019` (vincolo d'ordine);
  `.planning/REQUIREMENTS.md:122,136`; `.planning/STATE.md`
- `.planning/phases/41.1-work-surface-conversion/41.1-PATTERNS.md`,
  `.planning/phases/41.2-…/41.2-PATTERNS.md`, `41.2-CONTEXT.md` §D-41.2-01/02
- `.planning/phases/39-the-door-s-own-address/39-DOOR-PASS.md` §0.6, §8
- `.planning/phases/45-…/deferred-items.md` §DEF-45-01
- `CLAUDE.md`; `.claude/rules/checkin-offline.md`, `ai-engineering.md`, `meta-gates.md`,
  `nextjs-architecture.md`

### Metodo (§0)

- Viénot, Brettel & Mollon (1999) — matrici dicromatiche in sRGB lineare
- CIE — CIEDE2000
- Björn Ottosson — Oklab/Oklch → sRGB lineare (la matrice che Tailwind v4 usa)
- Script riproducibile: `scratchpad/cvd.mjs` (non committato — è materiale di lavoro)

### Non consultato, e non serviva

Nessuna ricerca web. Ogni affermazione di questo documento viene dall'albero o
dall'esecuzione di uno script su una copia dell'albero. La ricerca di dominio — concorrenti,
scelte di colore — è **chiusa in `42-CONTEXT.md`** e non è stata riaperta.

---

## Metadata

**Ripartizione della confidenza:**

| Area | Livello | Ragione |
|---|---|---|
| Comportamento dei gate | **HIGH** | Eseguiti, non letti. Ogni verdetto di §2.7 e §3 è output reale |
| Perimetro e conteggi | **HIGH** | Prodotti con il matcher esatto del gate |
| Forma delle conversioni precedenti | **HIGH** | Contata sui documenti |
| Cosa è già vero (canali di DS-04) | **HIGH** | `file:riga` per ogni canale |
| Il mirino a ogni larghezza | **MEDIA** | Aritmetica su classi CSS: nessun pixel è stato reso. È la stessa limitazione che check E dichiara di sé |
| **Le distanze cromatiche** | **MEDIA-BASSA** | Il mio calcolo è riproducibile e concorda su alcune celle con `42-CONTEXT.md`, diverge su altre. **Nessuna delle due è verificata da un terzo.** È esattamente ciò per cui D-42-05 esiste |

**Data della ricerca:** 2026-08-18
**Valido fino a:** la wave 0 (che muove le liste dei gate) o un `npm install` che aggiorni
Tailwind (che muove i colori grezzi). Ricontrollare §0 e §2 dopo l'uno o l'altro.
