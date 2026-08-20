---
phase: 58-il-calendario-e-uno-specchio
plan: 04
subsystem: ui
tags: [ics, calendario, superficie-admin, proposte, gate, mutazione]

requires:
  - phase: 44-il-calendario-di-produzione
    provides: "PiecesSection, PieceDate e i dieci controlli U di verify-calendar-surface.mjs"
provides:
  - "La dichiarazione di ICS-06 sopra l'elenco dei pezzi: le proposte si ricalcolano a ogni import"
  - "Il controllo U11, che distingue i due modi di sbagliare quella dichiarazione"
  - "Il primo controllo di verify-calendar-surface.mjs che NON viene da 44-UI-SPEC.md §15, e lo dichiara"
affects: [58-11, 58-12]

tech-stack:
  added: []
  patterns:
    - "Predicato derivato dalle righe invece che prop: una prop e' un secondo posto dove dire il falso"
    - "Marker di un gate assemblato per concatenazione, mai scritto per intero"
    - "Due asserzioni, due failures distinti: mai una riga sola che dice «non va bene»"
    - "Conteggio letto dall'array invece che scritto accanto alla lista"

key-files:
  created: []
  modified:
    - src/app/(admin)/admin/calendar/PiecesSection.tsx
    - scripts/verify-calendar-surface.mjs

key-decisions:
  - "La frase va in PiecesSection e NON in PieceDate: PieceDate ha gia' quattro canali che tengono una proposta lontana dal leggersi come decisa, e un quinto ripetuto su ogni riga e' rumore — la stessa ragione per cui §5.3 rifiuta una cautela sul caso maggioritario"
  - "Il predicato e' derivato dalle righe (pieces.some), non passato come prop: una prop lascerebbe a chi chiama la possibilita' di dire «qui non ci sono proposte» sopra un elenco che ne e' pieno, e la frase che deve tenere onesto un ricalcolo diventerebbe la cosa che lo nasconde"
  - "U11 e' dichiarato come NON appartenente a §15: §15 e' stato scritto prima dello specchio. Un controllo assorbito in silenzio in un contratto che non lo contiene e' un controllo che nessuno puo' far risalire a una decisione"
  - "Il conteggio finale si legge da results.length e il banner da CHECKS.length: un numero scritto accanto a una lista smette di corrispondere alla prima aggiunta — che e' esattamente il difetto che questo piano stava riparando nella prosa"
  - "ImportRunSummary.tsx NON e' stato toccato: e' riscritto dal piano 58-11 per ICS-10b, e due onde sullo stesso file si scontrano. La seconda frase, se serve, la porta 58-11"

patterns-established:
  - "Un gate nuovo aggiorna la prosa che rende falsa, nello stesso commit"
  - "Due mutazioni per due asserzioni: se un solo failure copre entrambe, il gate non distingue i due modi di sbagliare"

requirements-completed: [ICS-06]

duration: 38min
completed: 2026-08-20
---

# Fase 58 Piano 04: La contropartita dello specchio, detta Summary

**Chi apre l'elenco dei pezzi e vede una proposta legge, una volta e senza
enfasi, che quella riga si ricalcola — e la frase ha un gate che distingue il
non averla scritta dall'averla urlata, provato rompendola in entrambi i modi.**

## Performance

- **Duration:** ~38 min
- **Tasks:** 2 / 2
- **Files modified:** 2
- **Files created:** 0

## Accomplishments

- **La superficie dice cio' che lo specchio fara' alle proposte.** Sei proposte
  esistono oggi in produzione e sono l'unica delle tre cose che la
  riconciliazione difendeva a esistere davvero. Sparire e riapparire a ogni giro
  e' accettabile solo se chi le legge lo sa, e ora lo legge — una volta, sopra
  l'elenco, nel registro di `REASON`.

- **Il precedente e' stato imitato, non reinventato.** `LINEUP_DEPENDENT`
  (`:196`) e `lineupDependent` (`:227-232`) erano gia' esattamente questa forma,
  commento compreso. `PROPOSALS_RECOMPUTED` (`:137-138`) e `proposalsHeld`
  (`:235-237`) sono la stessa cosa con l'altro predicato.

- **`U11` distingue i due modi di sbagliare.** Una frase che non c'e' e una
  frase che urla sono difetti opposti con riparazioni opposte, e il gate produce
  due `failures` diversi. Provato per mutazione in entrambe le direzioni, non
  dichiarato funzionante.

- **La prosa del gate ha smesso di contarne dieci** — e non e' diventata
  «undici di §15», che sarebbe stato falso in un modo piu' difficile da
  scoprire.

## Task Commits

1. **Task 1: La dichiarazione, nella forma che la superficie usa gia'** — `955385c` (feat)
2. **Task 2: U11 — il controllo che la dichiarazione esista e non spenda enfasi** — `c070a79` (test)

## Files Created/Modified

### `src/app/(admin)/admin/calendar/PiecesSection.tsx`

| Riga | Cosa |
|---|---|
| `:103` | «The **three** sentences this section owns» — erano due |
| `:106-136` | Il docblock: perche' la frase esiste, dove deliberatamente **non** va, perche' non alza la voce |
| `:137-138` | `PROPOSALS_RECOMPUTED`, la costante di testo |
| `:235-237` | `proposalsHeld = pieces.some(…origin === "proposed")` — derivato dalle righe |
| `:241-248` | Il ramo condizionale: la frase compare **solo** se il predicato e' vero |

Il testo, per esteso, perche' e' l'artefatto vero di questo piano:

> *Rows marked Proposed are not decisions: they are worked out again every time
> the calendar is read in, so one can change or stop being there on its own.*

Regge la lettura di chi non sa cosa sia un import — dice *«every time the
calendar is read in»*, non *«a ogni import»* — e dice le due cose che il
requisito chiede: che quelle righe **non sono decisioni**, e che **si
ricalcolano**.

### `scripts/verify-calendar-surface.mjs`

| Riga | Cosa |
|---|---|
| `:3-16` | L'intestazione: undici assertions, dieci di §15 e **una no**, con la ragione per cui la distinzione si tiene |
| `:43-45` | Lo scope: §15 scopa le sue dieci, e `U11` prende lo stesso perimetro per la stessa ragione |
| `:123` | `PIECES_SECTION_FILE`, il soggetto di `U11` |
| `:163` | `EMPHASIS_MARKER`, assemblato una volta e condiviso con `U6` |
| `:177` | `PROPOSALS_DECLARATION` — `"PROPOSALS" + "_" + "RECOMPUTED"` |
| `:180` | `PROPOSED_ORIGIN` |
| `:288` | «The **eleven** checks — U1 … U10 from §15, U11 from ICS-06» |
| `:515` | `U6` legge il marker condiviso invece di costruirsene uno proprio |
| `:774-906` | `U11` |
| `:910` | `CHECKS` con `u11` in coda |
| `:913-915` | Il banner conta da `CHECKS.length` |
| `:944-946` | Il verde conta da `results.length` |

## Le due prove per mutazione — `U11`, 2026-08-20

Eseguite, non dedotte. Il file e' stato copiato in scratchpad prima e
ripristinato dopo ciascuna.

### Mutazione 1 — la frase rimossa

Rimossi sia `PROPOSALS_RECOMPUTED` sia il suo ramo di render.

```
node scripts/verify-calendar-surface.mjs  →  uscita 1

  ✗ U11  the recomputation is declared once, conditioned on the rows, without emphasis
         → src/app/(admin)/admin/calendar/PiecesSection.tsx:1 —
           no declaration that proposals are recomputed

  CALENDAR_SURFACE_FAIL — 1 check(s) failed: U11 (1 occurrence(s))
```

**Solo `U11` rosso.** Nessun altro controllo si accorge dell'assenza — che e'
esattamente la ragione per cui `U11` doveva esistere.

### Mutazione 2 — la frase spende enfasi

`<Badge tone="emphasis">Heads up</Badge>` inserito accanto alla frase.

```
node scripts/verify-calendar-surface.mjs  →  uscita 1

  ✗ U6   emphasis is spent on Late and Diverged, and on nothing else
         → …/PiecesSection.tsx:245 — an emphasis badge on neither of the two facts that earn one
  ✗ U11  the recomputation is declared once, conditioned on the rows, without emphasis
         → …/PiecesSection.tsx:246 — the declaration spends emphasis, which U6
           reserves for Late and Diverged

  CALENDAR_SURFACE_FAIL — 2 check(s) failed: U6, U11 (2 occurrence(s))
```

**Il `failure` di `U11` e' diverso da quello della mutazione 1**, che era il
criterio d'accettazione. `U6` diventa rosso in parallelo e sulla propria
domanda — *chi ha speso l'enfasi* — mentre `U11` risponde alla propria: *l'ha
spesa questa frase*. Due domande, due referti.

### Dopo il ripristino

```
CALENDAR_SURFACE_OK — 11 check(s) passed.
```

## Verification

| Comando | Esito |
|---|---|
| `npm run build` | **0** — typecheck di Next compreso |
| `npm run verify:calendar-surface` | **0**, undici controlli, `U11` verde |
| Mutazione 1 | uscita **1**, `U11`, *no declaration* |
| Mutazione 2 | uscita **1**, `U6` + `U11`, failure **diverso** |
| `/usr/bin/grep -c "the ten checks" scripts/verify-calendar-surface.mjs` | **0** |
| `/usr/bin/grep -ciE "(rsnt\|rmdb\|mtnlb\|ramadub\|motionlab\|re:sonate)"` sulla frase | **0** |
| `npm run verify` | **1 — `verify:touch-targets`, preesistente e fuori perimetro** |

### Sul rosso di `npm run verify`

`VERIFY_FAIL — 1: verify:touch-targets`, sui due soli elementi
`src/app/(public)/events/[slug]/menu/GuestTokenDisplay.tsx:689` e `:702` —
**identici al commit di base**, dichiarati tali dal piano, e non toccati. Piu'
tre **rifiuti** (`verify:capabilities`, `verify:scan-legibility`,
`verify:section-export`) che non sono fallimenti: un worktree non ha
`.env.local`, quindi quelle misure **non sono avvenute**. Nessun rosso nuovo si
e' formato, e nessuna esenzione e' stata allargata.

### Cosa un verde di `U11` NON significa

`U11` e' un'asserzione su stringhe in un file sorgente. **Non renderizza nulla e
non prova che un lettore prenda la frase per quello che dice.** Quel giudizio
appartiene a una persona e ha gia' una forma scritta: `44-PROCEDURES.md` **P2**,
da rieseguire con la frase presente. Finche' non ha un esito, la domanda resta
aperta — e questo repo non ha test runner, quindi non c'e' una seconda strada.

## Deviations from Plan

**Nessuna deviazione di sostanza.** Due scelte di dettaglio, entrambe dentro il
perimetro dichiarato:

1. **Le due frasi sono state raccolte in un contenitore.** Il piano lasciava
   `mb-4` sulla frase; con due frasi possibili sopra l'elenco un `mb-4` per
   ciascuna avrebbe prodotto due margini impilati. Le due `<p>` stanno ora in un
   `<div className="mb-4 space-y-1">` (`:242`) e portano la sola classe `REASON`.
   Il vincolo del piano — classe `REASON`, mai `tone="emphasis"` — e' rispettato
   e verificato da `U11`.
2. **La prosa non e' stata riscritta come «le undici di §15».** Sarebbe stato il
   modo piu' breve di far tornare il conto, ed e' falso: §15 e' anteriore allo
   specchio. La provenienza e' dichiarata riga per riga (`:3-16`, `:288`, `:914`).

## Threat Model — esito

| Threat ID | Disposizione | Esito |
|---|---|---|
| T-58-04-01 | mitigate | **Chiusa.** La frase esiste (`:137-138`, `:244`) e `U11` la verifica. Senza, la sparizione di una proposta a ogni giro sarebbe un cambiamento che nessuno ha annunciato — e questo progetto non ha error tracking, quindi la frase sullo schermo e' tutto l'effetto osservabile |
| T-58-04-02 | mitigate | **Chiusa.** Nessuna data, nessuna sigla, nessun nome di format nella frase: `U3` e `U8` verdi, e il grep sulla sola frase nuova restituisce `0` |
| T-58-04-03 | mitigate | **Chiusa.** Il marker e' assemblato (`:177`); la prosa «the ten checks» e' aggiornata nello stesso commit del controllo che la rendeva falsa |
| T-58-04-SC | accept | Nessun pacchetto installato, `package.json` immutato |

## Threat Flags

Nessuna superficie di sicurezza nuova. Il piano tocca un file di presentazione
che non legge, non scrive e non instrada nulla, e uno script di verifica che
legge solo sorgenti tracciate.

## Known Stubs

Nessuno. Non ci sono valori vuoti cablati, testi segnaposto, `TODO` o `FIXME`
introdotti da questo piano.

## Cosa eredita chi viene dopo

- **58-11** riscrive `ImportRunSummary.tsx` per `ICS-10b`. Se vuole la seconda
  frase — *quando* si sono ricalcolate, accanto al *che* si ricalcolano — la
  porta lui: qui il file non e' stato toccato di proposito, per non scontrarsi
  sull'onda.
- **58-12** legge `PiecesSection.tsx` per non ripetere la dichiarazione. E'
  `PROPOSALS_RECOMPUTED` a `:137`.
- **`44-PROCEDURES.md` P2** va rieseguita con la frase presente. `U11` non la
  sostituisce e lo dichiara nel proprio docblock.

## Self-Check: PASSED

**File**

```
FOUND: src/app/(admin)/admin/calendar/PiecesSection.tsx
FOUND: scripts/verify-calendar-surface.mjs
```

**Commit**

```
FOUND: 955385c  feat(58-04) — la dichiarazione
FOUND: c070a79  test(58-04) — U11
```

**Contenuto dichiarato**

```
PiecesSection.tsx:137   PROPOSALS_RECOMPUTED        — presente
PiecesSection.tsx:235   proposalsHeld = pieces.some — presente
verify-calendar-surface.mjs:809  function u11()     — presente
verify-calendar-surface.mjs:910  CHECKS include u11 — presente
```

Nessuna cancellazione di file tracciati nei due commit; nessun file non
tracciato lasciato indietro.
