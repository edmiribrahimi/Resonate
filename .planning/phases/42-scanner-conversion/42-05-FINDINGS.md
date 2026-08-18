# 42-05 — Le due modifiche che oggi non si possono applicare, scritte parola per parola

**Piano:** 42-05 · **Onda:** 2 · **Data:** 2026-08-18
**Scopo:** far si' che il commit che le applichera' **trascriva invece di
inventare**. Ogni riga qui sotto e' stata **eseguita** su una mutazione
usa-e-getta del working tree, mai committata, e ogni mutazione e' stata
**asserita applicata prima di leggerne l'esito** — una sostituzione andata a
vuoto produce un verde che non significa niente.

Nessun file sotto `src/` e' cambiato da questo piano: `git status --porcelain`
e' vuoto alla fine di ogni prova, e riasserito.

---

## 0. Cosa c'e' qui, in una riga per voce

| # | Modifica | Gate colpito | Viaggia col commit che… |
|---|---|---|---|
| A | `PHONE_LOCKED_NAV_WRAPPER` punta a `DoorSurface.tsx` | check E, `verify:conversion` | cancella il wrapper |
| B | La stessa path dichiarata in `NAV_MODULES` | check E, `verify:conversion` | cancella il wrapper |
| B′ | La voce morta di `NAV_MODULES` rimossa | rifiuto *path non su disco* | cancella il wrapper |
| B″ | La voce morta di `SPINE` rimossa | `checkManifest()` | cancella il wrapper |
| C | La voce `EXEMPT_SHELLS` per il flash | `verify:dialogs` | apre il recinto (42-11) |

**A e B sono le due che `42-RESEARCH.md` §3.3 chiama *la forma minima che
funziona*, ed e' corretto — ma non sono le sole due righe di gate che quel
commit deve portare.** B′ e B″ non sono modifiche *aggiuntive*: sono la
conseguenza meccanica di cancellare un file che due liste dichiarano. Le
scriviamo qui perche' **il piano che le incontrera' le incontri come lavoro
previsto, non come due rifiuti consecutivi da diagnosticare.**

---

## 1. Check E — e sono due modifiche, non una

### 1.1 Il difetto, in una frase

Il discriminante di check E fra *monta la forma responsive* e *monta la forma
telefono* e' **testuale**: importa `AppNav` direttamente **e non e' il wrapper**
(`verify-conversion.mjs`, `filesMountingResponsiveForm`). Appena `DoorSurface.tsx`
importa `AppNav` direttamente, il gate lo classifica come mount della forma
**responsive** e pretende la clearance di colonna da 224px sulla porta — l'esatto
contrario di cio' che D-42-03 vuole.

### 1.2 Le righe, come appariranno

**Modifica A** — `scripts/verify-conversion.mjs`, la costante accanto a
`RESPONSIVE_NAV_MODULE`:

```js
const PHONE_LOCKED_NAV_WRAPPER = 'src/app/(admin)/admin/scanner/DoorSurface.tsx';
```

**Modifica B** — `scripts/verify-conversion.mjs`, dentro `NAV_MODULES`, **con la
sua ragione**:

```js
  ['src/app/(admin)/admin/scanner/DoorSurface.tsx', 'the file that mounts AppNav locked to its phone form (D-42-03)'],
```

**Modifica B′** — la stessa lista, la voce che muore:

```js
  ['src/components/layout/MobileNav.tsx', 'the wrapper that renders AppNav locked to its phone form (D-41-21)'],
```

**Modifica B″** — `scripts/conversion-manifest.mjs`, la voce `SPINE` che muore:

```js
  [
    "src/components/layout/MobileNav.tsx", "converted",
    "the wrapper locking the door to the phone form (D-41-21) — the same spine member as AppNav, kept as a separate file because it is the mechanism holding Phase 42's fence, and Phase 42 deletes it",
  ],
```

E le due righe di prodotto, per completezza dell'ordine (sono di `42-RESEARCH.md`
§3.4 voci 1-3, e **non sono di questo piano**): l'import e il mount in
`DoorSurface.tsx` passano ad `AppNav` con `form="phone"`, e
`src/components/layout/MobileNav.tsx` viene cancellato.

### 1.3 La prova, eseguita — tre stati, tre esiti

Mutazione sul working tree, mai committata, ripristinata per percorso esatto.
Ogni passo ha stampato la riga risultante prima che il gate girasse.

**Stato S0 — il wrapper cancellato, la porta ripuntata, nessuna modifica al
gate.** Non si arriva a check E: rifiuta prima il manifest.

```
FATAL: the manifest refuses, with 1 reason(s):

       SPINE names src/components/layout/MobileNav.tsx, which is not on disk under that exact name. A spine
       entry is an EXCLUSION from an import-closure walk, so a stale one silently
       removes a real file from a gate's scope — the one failure direction that
       produces a green.
```
→ **exit 2.** E' B″.

**Stato S1 — B″ e B′ applicate, modifica A applicata, modifica B NON applicata.**
Questo e' *«con una sola, exit 2»* di `42-RESEARCH.md`, riprodotto:

```
FATAL: GATE CANNOT READ — check E's pairing names 1 navigation module(s)
       NAV_MODULES does not declare:

         src/app/(admin)/admin/scanner/DoorSurface.tsx

       The pairing separates the RESPONSIVE mount from the PHONE-LOCKED one, and it can
       only do that against the same two modules the rest of this check calls navigation.
       If a module moved, it moves in NAV_MODULES and here in the same commit.

       Nothing was measured.
```
→ **exit 2.**

**Stato S2 — modifica B applicata.** Check E verde, e il conteggio dice la cosa
giusta:

```
      navigation modules declared : 2
          src/components/layout/AppNav.tsx
             both tiers — the bar below 768px, the leading column at and above it
          src/app/(admin)/admin/scanner/DoorSurface.tsx
             the file that mounts AppNav locked to its phone form (D-42-03)
```
```
  ✓ E  … and the 12 file(s) declaring the column clearance at the md tier are
       EXACTLY the 12 file(s) mounting the responsive navigation form
```
→ **CONVERSION_OK, exit 0.** La porta **non** e' fra i dodici: e' esattamente il
comportamento che D-42-03 chiede.

**Ripristino:** `git checkout --` sui quattro percorsi esatti, poi
`git status --porcelain` vuoto e `npm run verify:conversion` di nuovo **exit 0**.
Riasserito, non assunto.

### 1.4 Le due cose oneste che vanno nella ragione

**(a) Il nome della costante diventa una descrizione falsa, e va rinominata.**
Dopo la modifica non nomina piu' *un wrapper*: nomina **il file che monta la
navigazione bloccata sulla forma telefono**. Nome suggerito da `42-RESEARCH.md`
§3.3 e adottato qui: **`PHONE_LOCKED_NAV_MOUNT`**.

Non e' pedanteria di naming. **Questa fase sta cancellando due commenti che
facevano esattamente questo tipo di affermazione** — `ScanFlash.tsx:65-72` e
`ScannerClient.tsx:2792-2798`, che dichiarano di aver evitato una collisione che
la misura smentisce. Lasciarne un terzo dentro un gate sarebbe una battuta
riuscita male.

**(b) Il discriminante si indebolisce, e la ragione deve dirlo.**

| | Prima | Dopo |
|---|---|---|
| Cos'e' il file escluso | un file dedicato, la cui **unica** ragione d'essere e' passare `form="phone"` | un file di 143 righe che fa **anche** la guardia d'accesso |
| Se smettesse di passare `form="phone"` | impossibile senza svuotare il file | **il gate resterebbe verde** |

L'alternativa piu' solida esiste ed e' nominata: **il discriminante diventa la
prop invece del percorso** — *importa `AppNav` direttamente e non passa
`form="phone"` sulla stessa riga*.

**Perche' non si fa qui, dichiarato invece che dedotto:** questa fase cambia
**colore, contrasto e tipo**, e riscrivere il discriminante di un gate non e'
nessuna delle tre. Farlo dentro un'onda di conversione significherebbe che, se il
gate si comportasse diversamente, nessuno saprebbe se e' la conversione o il
nuovo discriminante. **La limitazione si eredita scritta, non nascosta**: la
ragione della voce `NAV_MODULES` e' il posto dove il prossimo lettore la trova.

---

## 2. La shell del dialogo — la ragione si **sposta**, non si inventa

### 2.1 Da dove viene la frase

Il gate **possiede gia'** l'argomento, dentro la propria voce di recinto
(`verify-dialogs.mjs`, `PHASE_42_EXEMPT_PATHS`, seconda voce), verbatim:

> *the scanner's components — including the accept/refuse flash at
> ScanFlash.tsx:135, **which is a status layer and not a dialog**, and which the
> widened matcher would otherwise redden*

E il docblock sopra lo argomenta: `role="status"`, `aria-live="assertive"`, si
congeda da solo su un timer — **non c'e' niente da intrappolare e niente che
Escape debba chiudere**. Quindi la riparazione e' **un trasloco**, non
un'invenzione: la stessa frase entra in `EXEMPT_SHELLS`, la cui forma e'
`[file, ancora, forma, ragione]` e il cui confine e' **la shell e mai il file**.

### 2.2 La voce, come apparira'

L'ancora si assembla a runtime come tutte le altre di quel file (DEF-41-01 — una
utility completa scritta in `scripts/` sarebbe un candidato Tailwind vivo):

```js
const FLASH_ANCHOR = '$' + '{state.bg}';
```

```js
  [
    'src/components/scanner/ScanFlash.tsx',
    FLASH_ANCHOR,
    'hand-rolled overlay',
    'the door accept/refuse/already-recorded FLASH — a status layer and not a dialog. This gate already held the reason inside its own Phase 42 fence entry, verbatim: it is role="status", aria-live="assertive", it dismisses itself on a timer, so there is nothing to trap focus for and nothing for Escape to close. Converting it to the primitive would be wrong, and REMAINING would be a false statement about it because that list is dialogs without a focus trap. The reason MOVES here when the fence comes down; it is not invented here. The anchor is the state lookup rather than a layout utility because the flash line carries BOTH existing anchors, and because a rebuild that stops driving the fill from one lookup is exactly the change that must stop this entry',
  ],
```

### 2.3 Perche' **quell'** ancora, e non una delle due gia' in casa

La riga della shell del flash porta **entrambe** le ancore esistenti — quella
dell'acknowledgement e quella dello schermo di servizio — quindi nessuna delle
due la descriverebbe: funzionerebbero per coincidenza. Le alternative, con il
motivo del rifiuto:

| Candidata | Perche' no |
|---|---|
| l'ancora dell'acknowledgement | presente sulla riga del flash **per caso**; non dice niente di questa shell |
| l'ancora dello schermo di servizio | idem, e sulla stessa riga |
| la utility che ancora ai quattro bordi | e' **una delle tre parti del matcher stesso**: non distingue una overlay dall'altra, e non potrebbe mai andare stantia finche' la riga e' una shell |
| la utility del rung o quella dell'animazione | valori arbitrari fra parentesi — DEF-41-01 vieta di scriverli in prosa, e questo documento e' prosa |
| **il lookup di stato** | **scelta.** E' l'unica cosa sulla riga che descrive *questo* flash: una tabella sola governa colore, durata e glifo dei tre stati, e il file lo dice di se' — *«One lookup, and the only place any of this changes»* |

**E va stantia rumorosamente nel modo giusto.** Sopravvive al commit del colore
(quel commit cambia `FLASH_STATES`, non il lookup sulla riga della shell) e
**muore** il giorno in cui il flash viene ricostruito in modo da non pilotare
piu' il riempimento da un lookup solo — cioe' esattamente l'idea differita di
trasformarlo in una card. Un'esenzione che sopravvivesse a quella ricostruzione
sarebbe un'esenzione per una cosa diversa da quella per cui e' stata concessa.

### 2.4 La prova, eseguita — tre esiti

**(a) Con il recinto in piedi, la voce non si puo' applicare — e lo dice il gate,
non questo documento.** Aggiunta la voce, `verify:dialogs`:

```
FATAL: EXEMPT_SHELLS names a shell in src/components/scanner/ScanFlash.tsx, and check B NEVER OPENS that file:

         fenced — behind that glob, never opened; a SCOPE BOUNDARY that says nothing
         whatever about this file's markup
         behind: src/components/scanner/**

       An entry forgiving a shell inside a file nobody reads is a statement about a file
       this gate never opened. Either the entry goes, or the thing that keeps check B out
       of that file does — and which one is a decision for a person. Nothing was measured.
```
→ **exit 2.** E' la ragione per cui la voce viaggia col recinto e non con questo
piano, **misurata invece che argomentata**.

**(b) Con i due recinti neutralizzati insieme** — quello locale e quello del
manifest, simmetricamente, perche' un drift fra i due rifiuta — l'ancora si
risolve su **una** shell e su una sola:

```
  the declared shell exemptions — 5 SHELLS, named one by one, inside files
  check B OPENS and MEASURES (41.2-22):

      src/components/scanner/ScanFlash.tsx:135  [hand-rolled overlay]  anchor: ${state.bg}  applied 1×
```
```
      shells measured in them         : 5
         5  forgiven by a declared entry — see the list above
         0  left standing
      REMAINING = 0
```
→ **DIALOGS_OK, exit 0.**

**Un reperto che nessuno aveva ancora misurato, e che il piano 42-11 vuole
sapere:** con il recinto giu', **l'intera superficie della porta porta UNA sola
shell**, e questa voce la chiude. Non ce ne sono altre nascoste dietro il
recinto, ne' in `ScannerClient.tsx` (3449 righe) ne' altrove. Il numero delle
shell perdonate passa da 4 a 5, e quello delle shell rimaste in piedi resta 0.

**(c) L'ancora va stantia rumorosamente.** Sostituita con una che la shell non
porta:

```
FATAL: EXEMPT_SHELLS declares a shell in src/components/scanner/ScanFlash.tsx by the anchor
         state.background
       and NO measured shell in that file carries it. The entry is stale: it forgives
       nothing while looking like a guarded case, and the shell it used to name is now
       either gone or unforgiven without anybody saying so.
```
→ **exit 2.**

**Ripristino:** `git checkout --` su `scripts/verify-dialogs.mjs` e
`scripts/conversion-manifest.mjs`, `git status --porcelain` vuoto, zero
occorrenze residue dei marcatori di mutazione, e `verify:dialogs` di nuovo
**exit 0**. Riasserito.

### 2.5 Perche' non oggi, in una riga

I due recinti — quello di `verify-dialogs.mjs` e quello del manifest — sono
**confrontati a ogni esecuzione e un drift rifiuta**. Un'esenzione per un file
ancora dietro il recinto e' un'esenzione per qualcosa che **nessuno sta
misurando**, ed e' precisamente cio' che il gate ha appena rifiutato al punto
(a). Viaggia col recinto, nel piano **42-11**.

---

## 3. La sequenza — la lista che il piano successivo spunta

### Colonna 1 — il commit che **cancella il wrapper**

- [ ] `DoorSurface.tsx`: import → `AppNav`
- [ ] `DoorSurface.tsx`: mount → `<AppNav … form="phone">`
- [ ] `src/components/layout/MobileNav.tsx` cancellato
- [ ] **B″** — voce `SPINE` rimossa da `scripts/conversion-manifest.mjs`
- [ ] **B′** — voce morta rimossa da `NAV_MODULES`
- [ ] **B** — `DoorSurface.tsx` aggiunta a `NAV_MODULES` con la sua ragione
- [ ] **A** — la costante ripuntata **e rinominata** `PHONE_LOCKED_NAV_MOUNT`
- [ ] la ragione della voce `NAV_MODULES` porta **l'indebolimento del
      discriminante** e l'alternativa piu' solida, dichiarata e declinata
- [ ] i due docblock di `verify-conversion.mjs` che descrivono il wrapper per nome
- [ ] la disposizione delle **diciotto citazioni in prosa** (`42-RESEARCH.md`
      §3.4, voci 7-20) — tutte nello stesso commit **oppure** un debito numerato
      con la sua ragione. La terza strada, tacere, e' quella che ha prodotto il
      difetto che questa fase e' qui a chiudere

**Ordine interno obbligato, misurato al §1.3:** senza B″ non si arriva al gate;
senza B′ il gate rifiuta su una path non su disco; senza B rifiuta sul pairing.
I quattro sono **un commit solo**, e ognuno dei tre stati intermedi e' un exit 2.

### Colonna 2 — il commit che **apre il recinto**

- [ ] `PHASE_42_PATHS` rimossa da `scripts/conversion-manifest.mjs`
- [ ] `PHASE_42_EXEMPT_PATHS` rimossa da `scripts/verify-dialogs.mjs` — insieme,
      o il drift refusal scatta
- [ ] il recinto gemello in `verify-touch-targets.mjs`
- [ ] le tre route dichiarate in `CONVERTED` con la loro larghezza
- [ ] **C** — la voce `EXEMPT_SHELLS` del §2.2, con `FLASH_ANCHOR`
- [ ] le voci di `PALETTE_DEROGATIONS` (gruppi A e B di `42-MAPPING.md` §3)
- [ ] le voci di `FULL_BLEED_SURFACES` per le due pagine della porta
- [ ] `verify:scan-legibility` registrato in `verify-all.mjs` e in `package.json`
- [ ] i quattordici bersagli tattili di **DEF-42-03** — non pagati, ma la loro
      disposizione va presa **prima** del primo run rosso, non dopo

---

## 4. Cosa questo documento NON dice

- **Non dice che le modifiche siano giuste per la porta.** Dice che il gate le
  accetta e che senza di esse rifiuta. Che la porta funzioni alle due di notte e'
  il door pass, ed e' di una persona.
- **Non dice che il recinto vada aperto adesso.** D-42-04 lo blocca fino alla
  prima porta reale, e questo piano non lo tocca.
- **Non e' una deroga.** Nessuna riga qui e' applicata: sono testo provato, che
  il commit competente trascrivera'.

---

*Piano 42-05 · onda 2 · prove eseguite il 2026-08-18 · zero file sotto `src/`
modificati.*
