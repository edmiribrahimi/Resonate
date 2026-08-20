# Fase 58: Il calendario e' uno specchio (`ICS`) — Research

**Researched:** 2026-08-20
**Domain:** importazione `.ics` → sei tabelle Postgres; grammatica dei titoli; regole di pipeline editoriale; superficie admin del calendario
**Confidence:** HIGH sul codice e sullo schema (letti riga per riga, tre misure eseguite in sessione) · MEDIUM su due punti che dipendono da materiale non presente su questa macchina (dichiarati sotto)

---

## Summary

La fase non introduce librerie, non tocca la rete e non aggiunge dipendenze. E'
interamente **una riscrittura di codice gia' scritto**, su un perimetro chiuso e
misurabile: sette moduli in `src/lib/production/ics/`, uno script scrivente, tre
script di verifica, sei tabelle e una superficie admin.

Il disegno «specchio» e' semplice da enunciare e ha **tre spigoli veri**, tutti
verificati nel codice e non dedotti:

1. **Non esiste oggi alcuna chiave di scopo.** Nessuna delle sei tabelle porta
   una colonna che dica da quale calendario viene una riga, e i due `.ics`
   presenti sulla macchina **dichiarano lo stesso `X-WR-CALNAME`** (misurato in
   sessione). Quindi `ICS-02` non e' un filtro da scrivere: e' una **migration
   piu' un argomento obbligatorio** dell'importatore. Nessuna euristica sul file
   puo' sostituirli.
2. **Cancellare non e' l'inverso di scrivere, in questo repo.** Il progetto **non
   ha PITR** (`ai-engineering.md`, incidente del 2026-08-10), il client Supabase
   JS **non apre transazioni**, e `production_checklist_item.plan_id` e'
   `ON DELETE CASCADE`. Un `delete` a meta' strada lascia il calendario vuoto e
   le spunte perse, senza ritorno. Questa e' la parte della fase che va
   progettata per prima, non per ultima.
3. **Il `delete + insert` disinnesca in silenzio una guardia monotona.**
   `production_plan_refuse_renumber` e' un trigger `BEFORE UPDATE OF number`: uno
   specchio non fa mai `UPDATE`, quindi il trigger non scatta mai piu'. La
   protezione «un progressivo assegnato e' gia' su una locandina» smette di
   esistere a livello di database senza che una riga di SQL cambi.

Sulla lettura dei titoli la ricerca ha **misurato** il punto di rottura invece di
dedurlo: le 31 voci non classificate cadono tutte sullo stesso ramo,
`classify.ts:529-530`, con il codice `kind_without_series_and_number`. E ha
trovato un fatto che i ritrovamenti della fase 48 non avevano isolato:
**`Timetable` nudo e `Flyering - …` non finiscono fra le non classificate — vengono
importati come `commitment`**, cioe' come giorni occupati da qualcun altro. Non
compaiono in nessun conteggio che qualcuno guarda.

**Primary recommendation:** pianificare la fase in quest'ordine — (1) chiave di
scopo + istantanea + atomicita' della scrittura; (2) lettura dei titoli in due
passate; (3) specchio; (4) superficie e referto. Lo specchio va **dopo** la
lettura dei titoli, perche' uno specchio che oggi capisce il 70% del file
cancellerebbe e riscriverebbe il 70% del file.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

Copiate verbatim da `58-CONTEXT.md` (riscritto il 2026-08-20).

> **Cio' che viene dal calendario e' uno specchio.** Si cancella e si riscrive dal
> file, **per quel calendario**. Se una voce non c'e' piu' nel file, non c'e' piu'.

> **Due sole eccezioni, e sono nominate**: le **spunte** e il **legame con una
> serata pubblicata**. Sono le uniche cose che una persona ha messo li' e che il
> calendario non sa. Si riagganciano.

> **`ICS-03` e' il confine, ed e' l'unica riga che va difesa nel tempo.** Ogni stato
> umano che nascera' dopo — una nota, un'assegnazione, un allegato — o entra in
> quella lista con una decisione scritta, **oppure il primo import lo cancella senza
> che nessuno se ne accorga**. Uno specchio e' semplice esattamente perche' e'
> spietato, e questa e' la riga dove quella spietatezza si ferma.

> **La lettura dei titoli resta**, ed e' l'unica parte che aggiunge invece di
> togliere: **uno specchio che non capisce cosa sta specchiando riporta 31 voci su
> 104 come «non classificate»** — misurato sull'unione dei due calendari.
>
> 1. **un nome dove va la sigla** — `Listing - re:sonate`, `Listing - RamaDub x
>    Booze` — risolto dalla mappa degli alias che esiste gia';
> 2. **un pezzo senza numero** — quegli stessi titoli non ne portano uno. Il numero
>    **non si abbandona: si trova**, dalla data del pezzo piu' la regola di pipeline
>    della sua serie. Un listing sta al martedi' prima della sua serata.

> Il punto 2 impone una **seconda passata**: il classificatore decide una voce alla
> volta, e la notte a cui un listing appartiene e' un'altra voce dello stesso file.
> Prima le notti, poi l'aggancio.

> **Uno specchio cancella le proposte a ogni giro** — sono date che la regola
> calcola e il file non porta. Va bene, **a patto che sia detto**: chi le guarda
> deve sapere che si ricalcolano, non che sono state decise una volta.

### Claude's Discretion

Il CONTEXT.md non apre una sezione di discrezionalita' esplicita. Cio' che resta
di fatto alla discrezione tecnica, entro i vincoli sopra:

- **come** si ottiene l'atomicita' della scrittura (RPC transazionale vs.
  istantanea su file + ripristino);
- **come** si nomina lo scopo del calendario (vocabolario chiuso, argomento
  obbligatorio, colonna) — purche' non sia un'euristica sul file;
- **dove** la superficie dichiara che le proposte si ricalcolano;
- **come** si struttura la seconda passata dentro il flusso esistente.

### Deferred Ideas (OUT OF SCOPE)

> La prima stesura di questa fase riparava la riconciliazione: scope per calendario
> sull'assenza, ripulitura dei timbri con lo strumento riparato, l'asimmetria fra
> tabelle. **Era piu' codice per difendere zero spunte e zero legami.**
>
> Se un giorno quelle tabelle porteranno molto stato umano, la riconciliazione
> tornera' ad avere senso — e allora si riaprira' con **una misura davanti**, come
> questa. Non prima.

**Conseguenza operativa per il pianificatore:** i punti 1 e 2 di
`48-FINDING-01` § Ritrovamento 02 — *«capire perche' il timbro si toglie su una
tabella e non sull'altra»* e *«poi togliere i 17 timbri»* — **sono decaduti**.
Non vanno pianificati. Lo specchio cancella le righe che li portano. Restano vivi
i punti 3 (l'audit del referto → `ICS-07`) e 4 (lo scope → `ICS-02`).

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Descrizione (da ROADMAP.md) | Supporto della ricerca |
|---|---|---|
| **ICS-01** | Cio' che viene dal calendario e' uno specchio: si cancella e si riscrive dal file. Nessun timbro di assenza, nessuna divergenza, nessun aggiornamento campo per campo. | § *ICS-01 — lo specchio*: ordine di cancellazione imposto dalle FK, cascata enumerata, assenza di transazione nel client, trigger disinnescato, colonne che restano senza scrittore. |
| **ICS-02** | Lo specchio e' ristretto al calendario che si sta importando. | § *ICS-02 — la chiave di scopo*: la colonna non esiste; `X-WR-CALNAME` misurato identico sui due file; tre opzioni con conseguenze. |
| **ICS-03** | Due sole eccezioni, nominate: le spunte e il legame con una serata pubblicata. Si riagganciano. | § *ICS-03 — le due eccezioni*: chiave stabile `source_uid`, cascata da difendere, e **il caso non coperto** (uid sparito dal file dietro una serata annunciata). |
| **ICS-04** | Un nome dove la grammatica pretende la sigla si risolve dalla mappa alias. | § *ICS-04 — leggere un nome*: ramo esatto che oggi rifiuta, misurato in sessione; le due forme del nome (`<Nome>` e `<Nome> x <Locale>`). |
| **ICS-05** | Un pezzo senza numero si aggancia alla serata dalla data, nella direzione che la regola dichiara. | § *ICS-05 — trovare il numero*: la regola e' gia' `(ancora, giorno, direzione)`; `conformsToRule` e' il predicato pronto; **`derivable=false` non significa «non agganciabile»**; l'inversione e' piu' facile della derivazione. |
| **ICS-06** | Le proposte si ricalcolano a ogni import, e la superficie lo dichiara. | § *ICS-06 — le proposte*: dove nascono, dove si disegnano, il precedente `LINEUP_DEPENDENT` come forma della dichiarazione, e il vincolo U6. |
| **ICS-07** | La riga che fa fallire l'audit del referto quando si scrive una proposta e' riscritta. L'audit non si allarga. | § *ICS-07 — la riga*: meccanismo identificato e misurato (0,29% per UUID), **tre righe candidate** con il discriminante per chiuderle. |
| **ICS-08** | `Timetable` nudo e `Flyering` ricevono una decisione dichiarata. | § *ICS-08 — le due parole*: **misurato che oggi diventano `commitment`**, non «non classificate»; quattro opzioni con la conseguenza di ciascuna, senza raccomandazione. |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

Direttive attive su questa fase, estratte dalla persona. Il pianificatore le
verifica una per una.

| # | Direttiva | Origine | Effetto su questa fase |
|---|---|---|---|
| C1 | **Non esiste alcun test runner per il prodotto.** Nessuno script `test`, nessun `*.test.*`. Mai dichiarare verificato «perche' i test passano». | Guardrail 1 | La validazione e' `npm run build` + script `verify-*.mjs` + procedure manuali scritte. Vedi § *Validation Architecture*. |
| C2 | **Il typecheck passa dal build.** Non c'e' script `typecheck` separato. | Guardrail 2 | Ogni cambio di tipo in `vocabulary.ts` / `reconcile.ts` / `database.ts` e' un gate di build. |
| C3 | **Le migration sono la fonte dello schema**, non `schema.sql`. | Guardrail 3 | Le sei tabelle e le loro policy vanno lette in `supabase/migrations/2026081512*`. Fatto. |
| C4 | **Il repository e' PUBBLICO**, `.planning/` e' tracciato. | Guardrail 5 | Questo documento non porta date non annunciate, ne' sedi in trattativa, ne' line-up, ne' nomi di file che contengano una data. Gli esempi di titolo sono privi di data. |
| C5 | **macOS/BSD**: `grep -E`, `sed -i ''`. | Guardrail 6 | — |
| C6 | **La CLI Supabase non e' installata**: le migration si applicano dalla Management API; la verifica si fa **interrogando il catalogo**. | MEMORY, `schema-drift-gate-false-positive` | Precedente d'uso nel repo: `scripts/rls-baseline.mjs:82,268` (`https://api.supabase.com` + `/database/query`). |
| C7 | `src/types/database.ts` **e' scritto a mano**, non generato. | Verificato: il file importa da `@/lib/door/outcome`, `@/lib/capabilities/keys`, `@/lib/production/ics/vocabulary` e porta prosa. | Una colonna nuova si aggiunge **a mano** li', nello stesso commit della migration (`supabase-data.md`, gate *tipi allineati*). |
| C8 | **Zero fallimenti silenziosi**, e non esiste error tracking. | `meta-gates.md` | Ogni rifiuto dello specchio deve avere un **effetto osservabile**: una riga in `production_import_run` e una riga sulla superficie, non un log. |
| C9 | **Guardie monotone**: il progressivo di serie e' un interruttore a senso unico. | `meta-gates.md` | Vedi § *Il trigger disinnescato*. E' il conflitto piu' grave della fase. |
| C10 | Ogni fase produce `{n}-VERIFICATION.md` con **evidenza `file:riga` per requisito**. | Gate VERIFICATION.md | 8 requisiti → 8 righe di evidenza. |
| C11 | Precisione lessicale: *format* ≠ *evento*, *serata* ≠ *edizione*. `LiveCut` ≠ `Podcast`. | Operating Principle 8 | Nessun materiale di questa fase puo' introdurre la settima parola (`vocabulary.ts` claim (b)). |

**Da `.claude/rules/production-calendar.md`, vincolo diretto su `ICS-05`:**

> **La pipeline si esprime in GIORNI DELLA SETTIMANA, non in offset.** La notte
> cade venerdi' **o** sabato, quindi lo stesso martedi' dista −4 da un sabato e −3
> da un venerdi'. Un piano espresso in offset vede due regole dove ce n'e' una.

**Verificato nel database, non ricordato:** `production_pipeline_rule` **non ha
alcuna colonna di offset**. La forma di memorizzazione e'
`(anchor_kind, anchor_weekday, anchor_direction)` e il commento della migration
dichiara *«There is no `offset` column below, of any name, and a `grep` for one is
the assertion»* (`20260815120000_production_calendar.sql:869-1030`). Il vincolo di
dominio e' gia' rispettato dallo schema. **Non e' un lavoro da fare in questa
fase: e' un lavoro da non disfare.**

**Da `.claude/rules/ai-engineering.md`, vincolo diretto su `ICS-01`:**

> **Gate un'istantanea prima copre cio' che si tocca, non cio' che si crea.**
> Prima di una verifica che scrive in produzione, l'istantanea si prende **su ogni
> tabella raggiungibile per cascata dalle righe toccate** […] Una cascata e' un
> percorso di scrittura che nessuno ha dichiarato, e va enumerata leggendo i
> vincoli, non ricordandola. […] **il progetto non ha PITR.**

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Lettura e classificazione dei titoli | Modulo puro (`src/lib/production/ics/`) | — | `index.ts` claim (a): nessun client, nessun filesystem, nessun `Date`. La purezza e' cio' che rende verificabile «l'import non scrive». |
| Scrittura nelle sei tabelle | Script locale (`scripts/`) con service client | Database (funzione `SECURITY DEFINER`, se si sceglie l'atomicita' via RPC) | `index.ts` claim (c), D-44-26: **non esiste alcuna superficie di upload nel prodotto**, e non deve nascerne una. Un `.ics` che transita in una funzione serverless porta sedi in trattativa nei log. |
| Atomicita' del `delete + insert` | **Database** | — | Il client JS non ha transazioni. Solo il database puo' garantire «o tutto o niente». |
| Ambito del calendario (`ICS-02`) | Operatore (argomento) + Database (colonna) | — | Nessuna proprieta' del file discrimina i due calendari — misurato. Lo scopo e' una **dichiarazione**, non una deduzione. |
| Difesa delle due eccezioni (`ICS-03`) | Script (istantanea + riaggancio) | Database (vincolo `ON DELETE CASCADE` gia' dichiarato) | La cascata e' il percorso di distruzione; il riaggancio e' un atto dello script. |
| Dichiarazione «le proposte si ricalcolano» | Frontend server (React Server Component) | — | E' una frase sulla superficie admin, non un dato. Precedente identico: `PiecesSection.tsx:120` (`LINEUP_DEPENDENT`). |
| Riservatezza del referto (`ICS-07`) | Script (l'audit e' dentro lo script che parla) | — | Chi parla e' chi si controlla. Spostarlo altrove creerebbe un secondo posto dove la regola puo' divergere. |

**Perche' la mappa conta qui.** La tentazione naturale — *«facciamo caricare il
file dalla pagina admin»* — e' gia' stata respinta con una decisione scritta
(D-44-26) e ha una ragione di dominio, non di comodita'. Ogni piano che
riavvicinasse l'import al server Next sarebbe una regressione su `venue-secrecy`
e su `venue-acquisition`, non un miglioramento di UX.

---

## Standard Stack

### Core

**Nessuna libreria nuova.** La fase non installa nulla.

| Componente | Dove vive | Ruolo in questa fase |
|---|---|---|
| `src/lib/production/ics/*` (7 moduli, 4.295 righe) | repo | `classify.ts` (825) e `reconcile.ts` (1.665) sono i due file che cambiano di piu'; `anchors.ts` (627) fornisce il predicato di `ICS-05` **gia' scritto**; `parse.ts`, `unfold.ts`, `vocabulary.ts` restano quasi intatti. |
| `scripts/import-production-calendar.mjs` (1.569) | repo | L'unico scrittore. Cambia il contratto (§ *quattro cose che non puo' fare*), la riga di `ICS-07` e gli argomenti (`ICS-02`). |
| `@supabase/supabase-js` | gia' installato | Service client. **Non offre transazioni** — vincolo di progettazione, non dettaglio. |
| Node `registerHooks` (built-in) | — | Come lo script carica i moduli `.ts` a runtime (`import-production-calendar.mjs:462-476`). Il motivo per cui `verify:ics-reachable` esiste. |
| Management API Supabase | esterno | Applicazione della migration e lettura del catalogo. Precedente: `scripts/rls-baseline.mjs`. |

### Alternatives Considered

| Invece di | Si potrebbe usare | Compromesso |
|---|---|---|
| Riscrivere `reconcile.ts` | Cancellarlo e scrivere `mirror.ts` accanto | Un file nuovo lascia il vecchio importabile dal barrel e crea due letture. `index.ts` esporta `export * from "./reconcile"`: due moduli che dicono cose diverse sullo stesso dominio sono il difetto che `index.ts` claim (a) enuncia («tre menu e dieci controlli di proprieta'»). **Preferire la riscrittura in loco.** |
| Delete+insert dal client JS | Una funzione `SECURITY DEFINER` che riceve il payload in `jsonb` | La funzione e' **una transazione per costruzione**; il client non lo e'. Costo: un payload di ~100 righe in un `jsonb`, e una migration in piu'. Precedente nel repo per la forma: `record_checklist_tick` (`20260815120100:442`). |
| Una libreria `.ics` | — | Fuori discussione: il lettore a mano esiste, e' misurato da `verify:ics`, ed e' difendibile **solo** perche' quel controllo esiste (`classify.ts:103-110`). Sostituirlo con una dipendenza vanificherebbe otto controlli gia' scritti. |

### Installation

```bash
# nessuna
```

**Version verification:** non applicabile — nessun pacchetto nuovo.

---

## Package Legitimacy Audit

**Non applicabile a questa fase: non si installa alcun pacchetto esterno.**

| Package | Registry | Disposition |
|---|---|---|
| — | — | Nessun pacchetto proposto |

**Packages removed due to slopcheck [SLOP] verdict:** nessuno
**Packages flagged as suspicious [SUS]:** nessuno

Il gate di legittimita' non e' stato eseguito perche' non ha input. Se un piano
proponesse una dipendenza (per esempio un parser `.ics`), **quel piano va
respinto prima del gate**, per la ragione della tabella qui sopra.

---

## Architecture Patterns

### System Architecture Diagram

Il flusso attuale, e dove entra ciascun requisito.

```
  .ics sulla macchina del proprietario          catalogo in database
  (docs/, gitignorato, mai deployato)           (formats · party_series.ics_alias
             │                                   · production_pipeline_rule)
             │                                             │
             ▼                                             │
   ┌───────────────────┐                                    │
   │  unfold.ts        │  righe piegate → righe logiche      │
   └────────┬──────────┘                                    │
            ▼                                               │
   ┌───────────────────┐                                    │
   │  parse.ts         │  VEVENT → IcsEvent (date CIVILI,    │
   │  parseIcs()       │  mai un istante, mai un fuso)       │
   └────────┬──────────┘                                    │
            ▼                                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  classify.ts — classifyEntries(events, aliases)              │
   │                                                              │
   │   grammatica 1  canonica  <Tipo> - <SIGLA>-<NNN>[ - <parte>] │
   │   grammatica 2  legacy    <Parola> <NNN> - <Tipo>            │
   │   grammatica 3  notte     <Parola>[ x <Parola>] <NNN>        │
   │        ┌───────────────────────────────────────────┐         │
   │        │ ⇦ ICS-04: una QUARTA lettura, dentro la 1ª │        │
   │        │   <Tipo> - <Nome>[ x <Locale>]  (nessun n) │         │
   │        └───────────────────────────────────────────┘         │
   │                                                              │
   │   esiti → nights · pieces · commitments · unclassified       │
   └────────┬─────────────────────────────────────────────────────┘
            │
            │  ⇦ ICS-05: SECONDA PASSATA, qui o subito dopo.
            │     I pezzi senza numero attendono che le notti
            │     siano tutte classificate, poi si agganciano
            │     confrontando la loro data con la regola di
            │     ciascuna notte candidata (anchors.conformsToRule).
            ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  reconcile.ts — reconcile(input, snapshot, now)               │
   │                                                              │
   │   OGGI: confronto campo per campo → insert / update /         │
   │         absent_since / divergences / proposte riusate         │
   │                                                              │
   │   ⇦ ICS-01: diventa uno SPECCHIO.                             │
   │      delete(scope) + insert(tutto)                            │
   │      spariscono: update, absent_since, divergences            │
   │      resta:      la proposta, ricalcolata ogni volta          │
   └────────┬─────────────────────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  import-production-calendar.mjs                               │
   │                                                              │
   │   --dry-run (DEFAULT)  stampa il piano, non apre nulla        │
   │   --apply              scrive                                 │
   │   ⇦ ICS-02: --calendar <chiave>  OBBLIGATORIO su --apply      │
   │                                                              │
   │   ordine imposto dalle FK, e in questa fase si INVERTE:       │
   │     scrittura:    plan → piece → checklist                    │
   │     cancellazione: checklist(cascade) ← piece ← plan          │
   │                                                              │
   │   ⇦ ICS-03: istantanea delle spunte e dei legami PRIMA        │
   │      del delete, riaggancio DOPO l'insert                     │
   │                                                              │
   │   auditOwnOutput()  ⇦ ICS-07: una riga da riscrivere          │
   └────────┬─────────────────────────────────────────────────────┘
            ▼
   sei tabelle  →  /admin/calendar  (CalendarList · PiecesSection ·
                    ChecklistSection · ImportRunSummary · PieceDate)
                                        ▲
                                        └ ICS-06: la dichiarazione
```

### Component Responsibilities

| File | Righe | Responsabilita' | Tocco previsto |
|---|---|---|---|
| `src/lib/production/ics/vocabulary.ts` | 270 | Otto vocabolari chiusi, specchiati dai `CHECK` SQL | Piccolo: eventuale nuovo motivo di non classificazione / nuovo tipo (`ICS-08`) |
| `src/lib/production/ics/unfold.ts` | 200 | Righe piegate RFC 5545 | Nessuno |
| `src/lib/production/ics/parse.ts` | 865 | `VEVENT` → `IcsEvent`, date civili | Nessuno, **salvo** se `ICS-02` scegliesse di leggere una proprieta' di calendario (sconsigliato, § *ICS-02*) |
| `src/lib/production/ics/classify.ts` | 825 | Le tre grammatiche, i quattro esiti | **Grande** — `ICS-04`, `ICS-08` |
| `src/lib/production/ics/anchors.ts` | 627 | Aritmetica civile, `resolveAnchor`, `proposePieceDate`, `conformsToRule` | **Piccolo** — `ICS-05` usa `conformsToRule`; serve solo una variante che ignori `derivable` |
| `src/lib/production/ics/reconcile.ts` | 1.665 | Piano di scrittura | **Grande — e in prevalenza in sottrazione** (`ICS-01`) |
| `scripts/import-production-calendar.mjs` | 1.569 | L'unico scrittore | **Grande** — `ICS-01`, `ICS-02`, `ICS-03`, `ICS-07` |
| `scripts/verify-ics-import.mjs` | 1.557 | Otto controlli sul file vero | **Medio** — il controllo E cambia significato (§ *Validation Architecture*), il controllo B cambia numeri |
| `src/app/(admin)/admin/calendar/PiecesSection.tsx` | 223 | Elenco dei pezzi | **Piccolo** — `ICS-06` |

### Pattern 1: la seconda passata come *forward-match*, non come inversione aritmetica

**Cosa:** per agganciare un pezzo senza numero alla sua serata, **non si inverte**
`nearestWeekday`. Si prendono le notti candidate della stessa sigla, si calcola in
avanti la data che la regola predice per ciascuna, e si tiene quella che coincide.

**Quando usarlo:** ogni volta che la regola e' espressa come
`(ancora, giorno, direzione)` e l'inversa non e' una funzione.

**Perche':** `nearestWeekday(from, weekday, "before")` e' **molti-a-uno**. Ogni
giovedi' di un anno mappa su un martedi' diverso, ma dato un martedi' esistono
infiniti giovedi' che lo precedono. L'inversa non esiste come aritmetica; esiste
come **ricerca su un insieme finito** — le notti che il file porta. Il predicato e'
gia' scritto:

```typescript
// src/lib/production/ics/anchors.ts:601
export function conformsToRule(
  actualDate: CivilDate,
  rule: PipelineRule,
  context: AnchorContext
): boolean | null
```

L'unica modifica necessaria e' che **`derivable: false` non deve interrompere il
confronto**. Oggi la prima riga e' `if (!rule.derivable) return null;`, e
`derivable` risponde alla domanda *«posso PROPORRE una data?»*, non
*«posso RICONOSCERE una data?»*. Sono due domande diverse e vanno tenute tali.

### Pattern 2: lo specchio come una transazione, o come un'istantanea su disco

**Cosa:** la sequenza `delete → insert` deve essere indivisibile o recuperabile.

**Due forme, entrambe legittime:**

- **A — una funzione di database.** Una `SECURITY DEFINER` che riceve il payload
  in `jsonb`, cancella nello scopo e inserisce, tutto dentro il corpo (che e' una
  transazione). Costo: una migration, un payload grande, e argomenti da validare.
  Forma gia' presente nel repo: `record_checklist_tick`
  (`20260815120100_production_calendar_access.sql:442`), con `REVOKE` + `GRANT`
  a `service_role` soltanto (`20260815120200`).
- **B — un'istantanea su disco prima del delete.** Lo script scrive in un file
  locale, **fuori dal repo o dentro `docs/`** (gia' gitignorato), l'intero
  contenuto delle righe che sta per cancellare piu' le spunte e i legami; poi
  procede. Costo: non-atomico davvero, ma **recuperabile**, che e' il vero
  requisito quando non c'e' PITR.

**Le due non sono alternative pure.** Anche con A conviene B: l'istantanea e'
l'unica prova, dopo, che le spunte esistevano.

### Anti-Patterns to Avoid

- **Cancellare senza istantanea.** Il repo ha gia' pagato una volta: 63 righe in
  sette tabelle, perse, senza PITR (`ai-engineering.md`). Un `delete` su
  `production_plan` porta via `production_checklist_item` per cascata e **le
  spunte sono il primo dei due stati che `ICS-03` protegge**.
- **Cancellare con un predicato largo.** Il verso dell'errore e' il punto: un
  selettore troppo largo cancella di piu'; un selettore per chiave, se sbaglia,
  non trova nulla. Lo scopo (`ICS-02`) va nella clausola `WHERE` del delete
  **come unica condizione dichiarata**, non come filtro applicativo che decide
  quali id passare.
- **Contare cio' che si e' cancellato leggendo la stessa superficie.** Il conteggio
  di controllo si chiede a una fonte diversa da quella su cui si e' agito
  (`ai-engineering.md`). Per un delete fatto dallo script, la conferma si chiede
  al catalogo dalla Management API, non allo script.
- **Riusare `derivable` come «agganciabile».** Vedi Pattern 1.
- **Trattare `Timetable` nudo come una non classificata.** Misurato: **oggi e' un
  `commitment`**. Un piano che partisse dal presupposto sbagliato scriverebbe una
  verifica che non misura nulla.
- **Costruire una superficie di upload.** D-44-26. Fuori scope e fuori dominio.

---

## Don't Hand-Roll

| Problema | Non costruire | Usa invece | Perche' |
|---|---|---|---|
| Sapere se una data di pezzo sta dove la regola dice | Un secondo calcolo di giorni | `anchors.conformsToRule` | E' gia' scritto, gia' misurato «sei volte su sei» sui LiveCut della notte, e gestisce la finestra a piu' episodi. Un secondo calcolo diverge. |
| Aritmetica di calendario | `Date`, un formatter di piattaforma, una libreria di fusi | `anchors.isoWeekday` / `addDays` / `isoWeekStart` / `nearestWeekday` | `vocabulary.ts` claim (c): nessun `Date` viene costruito in quella directory, e la ragione e' che una conversione di fuso sposta il **giorno della settimana** di una voce delle 22:00. |
| Comporre una sigla da formato + serie | Un template letterale sparso | `composeSigla` (`import-production-calendar.mjs:701`) | Gestisce i tre casi (serie assente, serie = formato, serie gia' prefissata). |
| Decidere quale regola vale per un pezzo | Un `switch` sul formato | `rulesForSigla` (`:752`) | Implementa la precedenza serie-su-formato che le due unique parziali della migration garantiscono. Riscriverla significa reintrodurre il difetto che `series_id` esiste per evitare. |
| Togliere i commenti prima di un grep su un sorgente | Una regex | `scripts/lib/comments.mjs` | Unico stripper, provato per mutazione, direzione d'errore dichiarata: **cancella di piu', mai di meno**. Ogni `verify-*.mjs` che legge sorgenti lo usa. |
| Nascondere un identificativo in un referto | Troncarlo a mano | `printableUid` (`:611`) | Fa il digest **solo** quando l'uid porta una parola di un titolo, e conta le sostituzioni. Vedi pero' `ICS-07`: non protegge dal gruppo esadecimale che sembra un anno. |

**Key insight:** in questo dominio i moduli sono gia' scritti bene e **misurati**.
Il rischio non e' scrivere male: e' **scrivere una seconda volta** cio' che esiste,
e ritrovarsi con due letture del calendario che concordano oggi.

---

## Runtime State Inventory

Questa e' una fase di riscrittura con cancellazione di dati esistenti in
produzione. La tabella e' obbligatoria e **nessuna riga e' lasciata in bianco**.

| Categoria | Trovato | Azione richiesta |
|---|---|---|
| **Dati memorizzati** | Sei tabelle popolate in produzione al 2026-08-20 (misure del CONTEXT.md): `production_plan` **2 righe**, `production_piece` **46** (di cui 17 con `absent_since` non nullo), `production_commitment` **79**, `production_checklist_item` **14** (di cui **0 spuntate**), `production_import_run` **≥4 righe**, `production_pipeline_rule` **14** (16 seminate meno le 2 di un formato cancellato, sparite per cascata in fase 48). | Lo specchio cancella e riscrive le prime tre + la quarta per cascata. `production_import_run` **non e' mai cancellato**: e' il registro. `production_pipeline_rule` **non e' mai cancellato**: e' configurazione, non specchio. Questa distinzione va scritta nel codice, non lasciata implicita. |
| **Configurazione di servizio viva** | `party_series.ics_alias` — la mappa alias vive **solo nel database**, per decisione dichiarata (`20260815120000:760-812`), perche' i suoi valori sono parole per spazi. **Non e' in git, non e' in un seed, non e' in una fixture.** In fase 48 l'alias di una serie e' stato impostato a mano in sessione. | ⚠ **Nessun file la ricostruisce.** Se il database perdesse quelle righe, l'import tornerebbe a zero notti. Prima di toccare l'import, **leggere e conservare fuori banda quante serie portano un alias** (lo script gia' lo stampa: `:741`). Non e' materiale da versionare. |
| **Stato registrato dal sistema operativo** | **Nessuno.** `import:calendar` e' invocato a mano; non e' in `verify-all.mjs` per decisione scritta (`:126-140`), non e' un cron (`vercel.json` non lo conosce), non e' un hook. Verificato: `package.json:35` e' la sua unica registrazione. | Nessuna. |
| **Segreti e variabili d'ambiente** | Lo script legge le credenziali del service role (`loadEnvironment`, `:375`). Nessun nome di variabile cambia in questa fase. Un eventuale `--calendar` e' un **argomento**, non un segreto. | Nessuna. |
| **Artefatti di build / pacchetti installati** | **Nessun artefatto.** I moduli `.ts` sono caricati a runtime da `registerHooks` e non entrano nel bundle: `verify:ics-reachable` esiste esattamente perche' `npm run build` **non li vede**. | ⚠ Conseguenza: **rinominare o cancellare un file sotto `src/lib/production/ics/` non rompe il build.** Se un piano cancella `reconcile.ts`, va aggiornato `verify-ics-reachable.mjs` (che conta sei moduli) **nello stesso commit**, o il gate diventa falso in un verso o nell'altro. |

**La domanda canonica, e la sua risposta.** *Dopo che ogni file del repo e'
aggiornato, quali sistemi a runtime hanno ancora il vecchio comportamento
memorizzato?* Due:

1. Le **righe gia' scritte** dalle esecuzioni precedenti — comprese le 17 con un
   timbro di assenza falso. Lo specchio le cancella al primo giro. **Non serve una
   pulizia manuale**, e il CONTEXT.md lo dichiara.
2. `party_series.ics_alias`, che vive solo nel database e che **nessun codice di
   questa fase scrive**. E' un dato di configurazione con un solo esemplare.

---

## I requisiti, uno per uno

### ICS-01 — lo specchio

#### Cosa cancella un import, e in quale ordine

Le **chiavi esterne** che puntano alle tabelle dello specchio, enumerate leggendo
i vincoli (`grep -rE "REFERENCES public\.(production_…)" supabase/migrations/`,
tre risultati in tutto il repo):

| Da | A | `ON DELETE` | Conseguenza per il delete |
|---|---|---|---|
| `production_piece.plan_id` | `production_plan(id)` | **NO ACTION** (default) | ⚠ **Cancellare un piano che ha ancora pezzi solleva una violazione di FK.** I pezzi vanno cancellati **prima** dei piani. |
| `production_checklist_item.plan_id` | `production_plan(id)` | **CASCADE** | Cancellando un piano spariscono le sue voci di checklist **e le loro spunte**. E' l'unica cascata del file, ed e' dichiarata (`:648-661`). |
| `production_commitment.expanded_from` | `production_commitment(id)` | **NO ACTION** | Auto-riferimento. `NO ACTION` e' verificato a fine istruzione, quindi **un solo `DELETE` che porta via genitore e figli insieme passa**; due istruzioni separate in ordine sbagliato no. |
| `production_plan.linked_party_id` | `event_parties(id)` | NO ACTION | Punta **verso l'esterno**: cancellare il piano non tocca la serata. Lascia la serata **senza nessuno che la indichi**. Vedi `ICS-03`. |
| `production_plan.format_id` / `series_id` / `venue_id` | catalogo | NO ACTION | Verso l'esterno. Nessun effetto. |
| `production_pipeline_rule.format_id` / `series_id` | catalogo | CASCADE | **Non e' una tabella dello specchio.** L'import la legge e non la scrive. Registrata qui solo perche' in fase 48 la cancellazione di un formato ne ha portate via due in silenzio. |

**Ordine di cancellazione obbligato:**

```
1. production_checklist_item   (esplicito, per poter contare cosa si perde —
                                oppure lasciato alla cascata, ma allora il conteggio
                                va preso prima con una SELECT)
2. production_piece            (altrimenti la FK NO ACTION blocca il passo 3)
3. production_plan
4. production_commitment       (indipendente; un solo DELETE, mai due)
```

`production_import_run` **non si cancella mai**: e' il registro che ha permesso
di datare i 17 timbri falsi confrontandoli con l'ora degli import
(`48-FINDING-01` § Ritrovamento 02). Cancellarlo distruggerebbe l'unico strumento
diagnostico che questo dominio possiede.

#### Cio' che resta senza scrittore

Con lo specchio, queste diventano colonne e vocabolari che nessuno alimenta piu'.
Il piano deve **decidere esplicitamente** per ciascuna: lasciarla (documentando
che e' sempre `NULL`), o rimuoverla con una migration in avanti.

| Cosa | Dove | Nota |
|---|---|---|
| `absent_since` | `production_plan`, `production_piece`, `production_commitment` | `ICS-01` dice «nessun timbro di assenza». Le 17 righe che lo portano spariscono col primo specchio. La **colonna** resta finche' qualcuno non decide. Nota: la sua prosa in `database.ts:1292-1298` diventerebbe falsa e va riscritta comunque. |
| `divergences` | `production_import_run` (jsonb) | `ICS-01` dice «nessuna divergenza». Con delete+insert non esiste piu' un valore precedente con cui divergere. |
| `ABSENCE_REASONS`, `DIVERGENCE_REASONS` | `reconcile.ts:284-308` | Vocabolari senza produttore. |
| `refuse_production_plan_renumber` | trigger su `production_plan` | **Vedi sotto: non e' «senza scrittore», e' «disinnescato».** |
| `clearsAbsence`, `PlanUpdate`, `PieceUpdate`, `CommitmentUpdate` | `reconcile.ts` | Interi tipi senza istanze. |
| `conforms_to_rule` | `production_piece` | Calcolata all'import e **disegnata da nessuna parte** per decisione (D-44-10). Alimentava il referto delle divergenze. Se le divergenze spariscono, questa colonna perde il suo unico lettore. |

#### ⚠ Il trigger disinnescato — il conflitto piu' grave della fase

```sql
-- 20260815120100_production_calendar_access.sql:352-357
CREATE TRIGGER production_plan_refuse_renumber
  BEFORE UPDATE OF number ON public.production_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.refuse_production_plan_renumber();
```

Il commento che lo accompagna dice, testualmente:

> *«a guard in the database survives the caller that forgot it, and a guard in
> application code does not. It is `meta-gates.md`'s third one-way switch — a
> progressivo assigned is already on a poster; append, never renumber — made
> structural.»*

**Uno specchio non esegue mai un `UPDATE`.** Il trigger resta installato e non
scatta piu'. La guardia monotona sul progressivo **cessa di esistere a livello di
database**, e nessuna riga di SQL lo dichiara.

`meta-gates.md` e' esplicito su cosa fare qui:

> Per ognuno [dei tre interruttori a senso unico], una modifica puo' solo renderli
> **piu' difficili** da far scattare, mai piu' facili — salvo **autorizzazione
> esplicita documentata nel commit**.
>
> **Conflitto:** se due gate producono requisiti contraddittori, vince il piu'
> restrittivo. Documenta il conflitto nel commit.

**Questo e' un checkpoint da portare al proprietario, non una decisione tecnica.**
Le opzioni, con la conseguenza di ciascuna:

| | Cosa si fa | Conseguenza |
|---|---|---|
| **a** | Si accetta, si dichiara nel commit e si rimuove il trigger (una migration in avanti) | Onesto. Il progressivo non e' piu' protetto dal database. Il file diventa l'unica autorita' — che e' esattamente cio' che «specchio» significa. |
| **b** | Si accetta, si dichiara, e **si lascia il trigger installato** | Disonesto in un modo preciso: un lettore futuro trova un trigger e conclude che la protezione c'e'. Il commento della migration argomenta contro questa scelta. |
| **c** | Lo specchio **confronta** i numeri dell'istantanea con quelli in arrivo e **rifiuta l'import** se un `source_uid` noto cambia progressivo | Conserva la protezione, spostandola nell'applicazione — cioe' esattamente dove la migration dice che non sopravvive al chiamante distratto. Ma e' l'unico punto rimasto dove puo' stare. Costa una `SELECT` in piu' e un codice di rifiuto. |
| **d** | Un trigger `BEFORE DELETE` che rifiuta la cancellazione di una riga con `number IS NOT NULL` | **Renderebbe lo specchio impossibile.** Nominato per completezza e per essere respinto esplicitamente. |

La ricerca **non sceglie**. Segnala che (c) e' l'unica che soddisfa
contemporaneamente `ICS-01` e la guardia monotona, e che ha un costo dichiarato.

#### Il contratto scritto che questa fase rovescia

`import-production-calendar.mjs:57-79` dichiara **quattro cose che lo script non
puo' fare per costruzione**. La seconda e':

> **2. It removes nothing, ever.** There is no removal statement in this file and
> no list that could carry one. […] A partial export, a renamed `UID` or the wrong
> file must not wipe the archive, **and a plan row already standing behind an
> announced night survives absence unconditionally, because removing it would
> orphan a night with tickets on sale.**

Quel paragrafo va **riscritto**, non cancellato: e' la traccia della ragione per
cui la regola c'era. La seconda meta' della frase e' il caso non coperto di
`ICS-03` (sotto).

#### L'atomicita', e perche' e' un problema reale

Il client Supabase JS **non apre transazioni**. Lo script lo sa gia' e ha una
funzione apposta:

```javascript
// import-production-calendar.mjs:262
function failPartway(category, message, written) { … }
```

Oggi «a meta' strada» significa *alcune righe aggiornate*. Con lo specchio
significa **il calendario cancellato e non riscritto**. Non e' lo stesso rischio
e non lo copre lo stesso codice. Vedi Pattern 2 per le due forme accettabili.

---

### ICS-02 — la chiave di scopo

#### Il fatto: la colonna non esiste

Nessuna delle sei tabelle porta una colonna che dica da quale calendario viene una
riga. Verificato leggendo tutte le `CREATE TABLE` di
`20260815120000_production_calendar.sql`. L'unica traccia dell'origine e'
volutamente cieca:

```sql
-- :580-585
  -- WHICH FILE, WITHOUT NAMING IT. A byte size distinguishes *the owner sent a
  -- new export* from *the same file was imported twice*, and it says nothing
  -- about any date, any space or anybody's name.
  file_byte_size integer,
```

Una dimensione in byte **non e' una chiave**: due calendari diversi possono avere
la stessa dimensione e lo stesso calendario esportato due volte ne ha due diverse.

#### La strada che sembra ovvia, e che una misura ha chiuso

Il formato `.ics` porta `X-WR-CALNAME`, il nome che il calendario si da'. Sembra
la chiave naturale.

**Misurato in questa sessione, sui due `.ics` presenti nella directory ignorata:
i due valori di `X-WR-CALNAME` sono IDENTICI** (confronto per digest, senza mai
stampare il valore). Anche `PRODID` e `X-APPLE-CALENDAR-COLOR` coincidono.

Inoltre `parse.ts` **non espone alcuna proprieta' di livello `VCALENDAR`**: legge
solo i `VEVENT` (`:556-590`). Usare `X-WR-CALNAME` richiederebbe di aprire il
parser a un secondo tipo di dato — e per una chiave che, misurata, non
discrimina.

**Nota di onesta':** i due file misurati condividono **84 UID su 164 e 93** — sono
due esportazioni sovrapposte, non la coppia notte/satellite di cui parlano i
ritrovamenti della fase 48. Quella coppia **non e' su questa macchina oggi**.
Quindi la misura dice con certezza *«il nome di calendario non discrimina questi
due file»* e **non** dimostra che non discriminerebbe la coppia vera. Rimane
comunque vero che (a) il parser non lo legge, (b) e' un valore libero scritto
dall'applicazione del proprietario, e (c) affidare uno `DELETE` in produzione a
una stringa che nessuno controlla e' il rischio che `ICS-02` esiste per chiudere.

#### Le tre opzioni

| | Forma | Costo | Rischio |
|---|---|---|---|
| **A — argomento obbligatorio + colonna** | `--calendar <chiave>` obbligatorio con `--apply`; nuova colonna `source_calendar text NOT NULL` (o `calendar_key`) su `production_plan`, `production_piece`, `production_commitment` e su `production_import_run`; vocabolario **chiuso** con un `CHECK`, specchiato in `vocabulary.ts` come i sei gia' esistenti | Una migration, una colonna in quattro tabelle, un `CHECK`, l'edit a mano di `database.ts`, un argomento | **Nessun default.** Un default e' esattamente il passo che un giorno qualcuno salta. Lo script deve **rifiutare** senza `--calendar`, con il codice di rifiuto e l'uscita `2`. |
| **B — derivare dal contenuto** | Es. l'insieme delle sigle presenti nel file | Nessuna migration | Fragile e **circolare**: le sigle vengono dalla classificazione, e la classificazione e' proprio cio' che questa fase sta riparando. Un calendario mal letto si auto-attribuirebbe uno scopo sbagliato — e cancellerebbe le righe di un altro. **Da respingere.** |
| **C — derivare dal nome del file** | `basename` normalizzato | Nessuna migration | ⚠ **Un nome di file qui porta una data** (lo dice lo script stesso: *«not even the name of the file it read — that name carries a date»*, `:44-46`). Metterla in colonna significa scriverla in un posto che il referto poi non puo' nominare. **Da respingere per riservatezza, prima ancora che per fragilita'.** |

**Vincoli su A che il piano deve rispettare:**

- La colonna e' `NOT NULL` su tabelle **gia' popolate**: `supabase-data.md`, gate
  *default sulle righe esistenti*, chiede di dichiarare cosa succede alle righe che
  ci sono. Qui c'e' una scorciatoia legittima: **il primo specchio le cancella
  tutte**. Quindi o (i) `NOT NULL DEFAULT '<chiave transitoria>'`, o (ii)
  aggiungere la colonna nullable, cancellare tutto una volta, e stringerla con una
  seconda migration. Da decidere, non da improvvisare.
- Il vocabolario delle chiavi **non puo' contenere una parola per uno spazio**.
  Le sigle di formato (`RSNT`, `RMDB`, `MTNLB`) sono pubbliche; i nomi dei locali
  in trattativa no. Se il proprietario ha due calendari «la notte» e «il
  satellite», due chiavi tratte dai codici di formato sono pubblicabili. La
  ricerca **non le sceglie**: e' una decisione del proprietario, e la colonna e'
  su una tabella con RLS di lettura, non pubblica.
- La colonna serve un `WHERE` di `DELETE`: `supabase-data.md`, gate *indici sulle
  colonne di lookup*, chiede l'indice. Un indice per tabella.
- `production_import_run` deve portarla anch'essa, o il referto non puo' dire
  quale calendario ha specchiato — e `ICS-06`/`C8` chiedono un effetto
  osservabile.

---

### ICS-03 — le due eccezioni

#### Dove vive lo stato umano, oggi

| Stato | Colonna | Chiave attuale | Chiave **stabile** attraverso delete+insert |
|---|---|---|---|
| **La spunta** | `production_checklist_item.ticked_at` + `ticked_by` + `ticked_by_name` | `UNIQUE (plan_id, kind, label)` — `plan_id` e' un `uuid` **generato**, quindi **instabile** | `(production_plan.source_uid, kind, label)`. `source_uid` viene dal file e la migration lo dichiara identita' (`:168-183`). |
| **Il legame** | `production_plan.linked_party_id` | l'`id` della riga di piano, **instabile** | `production_plan.source_uid` |

**La chiave stabile esiste.** Questo e' il ritrovamento positivo della sezione: il
rischio numero uno che il brief temeva non si materializza, perche' il progetto ha
gia' scelto `source_uid` come identita' e ha gia' scritto perche' le alternative
(titolo, data+titolo, hash del contenuto) non lo sono (`:172-181`).

#### La procedura, e il punto esatto dove puo' perdere tutto

```
1. SELECT  ci.kind, ci.label, ci.ticked_at, ci.ticked_by, ci.ticked_by_name,
           pp.source_uid
     FROM  production_checklist_item ci
     JOIN  production_plan pp ON pp.id = ci.plan_id
    WHERE  ci.ticked_at IS NOT NULL
      AND  pp.<scopo> = :calendario

2. SELECT  source_uid, linked_party_id
     FROM  production_plan
    WHERE  linked_party_id IS NOT NULL
      AND  <scopo> = :calendario

3. ── ⚠ QUI l'istantanea va SCRITTA fuori dal processo, prima del delete ──

4. DELETE  … (nell'ordine della § ICS-01)
5. INSERT  … (piani, pezzi, checklist)
6. UPDATE  production_plan SET linked_party_id = … WHERE source_uid = …
7. UPDATE  production_checklist_item … per (source_uid, kind, label)
```

**Il passo 3 non e' burocrazia.** Fra il 4 e il 7 non c'e' transazione (a meno di
scegliere la forma A del Pattern 2), non c'e' PITR, e la cascata ha gia'
cancellato le spunte. Se il processo muore al passo 5, l'unica copia di quelle
spunte e' quella scritta al passo 3.

**Sulla scrittura del passo 7:** `ticked_by_name` e' un **nome di persona**, e la
migration dice esplicitamente che quel nome *«non entra in un PLAN, un SUMMARY, un
VERIFICATION o qualunque cosa sotto `.planning/`»* (`:706-713`). L'istantanea del
passo 3 e' quindi **materiale**: va nella directory gitignorata, mai nel repo, e
il referto non ne stampa il contenuto.

**Sul percorso di scrittura del passo 7:** esiste gia' `record_checklist_tick`,
ma richiede un attore che esista in `profiles` e ri-registra chi ha spuntato.
Riusarlo per un ripristino attribuirebbe la spunta a chi ha lanciato l'import.
**Un ripristino non e' una spunta.** Serve un percorso distinto — un `UPDATE`
diretto dallo script con il service client, che conserva `ticked_by` originale —
oppure un secondo argomento alla funzione. Da decidere nel piano.

#### ⚠ Il caso che `ICS-03` non copre, e che va portato al proprietario

*«Si riagganciano»* presuppone che la riga torni. **Se un `source_uid` sparisce dal
file e quella riga portava un `linked_party_id`, non c'e' nulla a cui riagganciare
il legame.** La serata pubblicata resta, e nessuna riga di calendario la indica
piu'.

E' esattamente la situazione che il contratto attuale proibisce con una frase
scritta:

> *«a plan row already standing behind an announced night survives absence
> unconditionally, because removing it would orphan a night with tickets on
> sale.»*

**Misurato oggi il rischio e' zero**: 2 piani, **0 legati** (CONTEXT.md). Ma
`ICS-03` e' dichiarato «il confine da difendere nel tempo», e questo e' il primo
buco del confine.

Le opzioni, con la conseguenza:

| | Cosa si fa | Conseguenza |
|---|---|---|
| **a** | Una riga di piano con `linked_party_id` **non nullo non si cancella mai**, qualunque cosa dica il file | Lo specchio ha un'eccezione **di sopravvivenza**, distinta dalle due eccezioni **di stato** di `ICS-03`. Va nominata nel requisito, o il prossimo lettore la trattera' come una terza eccezione non dichiarata. |
| **b** | Si cancella, e l'import **rifiuta di procedere** stampando quante righe legate stanno per sparire, finche' un argomento esplicito non lo autorizza | Lo specchio resta puro, e la spietatezza diventa **visibile** invece che automatica. Costa un argomento e un codice di rifiuto. |
| **c** | Si cancella e si riporta il conteggio nel referto | Il piu' semplice. Accetta di orfanare una serata annunciata perche' qualcuno ha esportato il file sbagliato. |
| **d** | Non si decide | ⚠ Il default silenzioso e' (c), perche' e' cio' che il codice fara' se nessuno scrive niente. |

**Classificazione persona: Critical** (una serata annunciata puo' avere biglietti
in vendita). Richiede analisi d'impatto e validazione del proprietario **prima**
di agire, e non e' una scelta tecnica.

---

### ICS-04 — leggere un nome dove va la sigla

#### Le tre grammatiche attuali, con il file e la riga

| | Forma | Funzione | Righe | Come risolve la serie |
|---|---|---|---|---|
| 1 | `<Tipo> - <SIGLA>-<NNN>[ - <parte>]` | `readCanonicalPiece` | `classify.ts:521-546` | **Dal titolo.** `readSeriesAndNumber` taglia all'**ultimo** trattino (`:679-691`), perche' una sigla puo' contenerne uno (`RSNT-PRLN-002`). |
| 2 | `<Parola> <NNN> - <Tipo>` | `readLegacyPiece` | `:560-589` | **Dalla mappa alias**, sulla parola in testa. |
| 3 | `<Parola>[ x <Parola>] <NNN>` | `readNight` | `:609-657` | **Dalla mappa alias**, sulla parola dopo la ` x ` (o su tutto il testo, poi sull'ultima parola). |

Ordine di prova in `classifyEntry` (`:411-444`): 1 → 2 → 3 → `carriesKnownWord` →
`commitment`.

#### Il ramo esatto che rifiuta oggi — **misurato, non dedotto**

Eseguito in questa sessione contro `classifyEntry` con una mappa alias sintetica
di tre parole gia' pubbliche:

| Titolo | Esito attuale |
|---|---|
| `Listing - RSNT-002` | `piece` / `listing` ✓ |
| `LiveCut - RSNT-007 - PT1` | `piece` / `livecut` ✓ |
| `Listing - re:sonate` | **`unclassified` / `kind_without_series_and_number`** |
| `Listing - RamaDub x Booze` | **`unclassified` / `kind_without_series_and_number`** |
| `Tonight - RamaDub x Booze` | **`unclassified` / `kind_without_series_and_number`** |
| `Listing - re:sonate x Perlone` | **`unclassified` / `kind_without_series_and_number`** |

**Un solo ramo produce tutte e 31 le non classificate:**

```typescript
// classify.ts:527-531
  const reference = readSeriesAndNumber(segments[1]);
  if (reference === null) {
    return unclassified(event.uid, "kind_without_series_and_number");
  }
```

`readSeriesAndNumber("re:sonate")` restituisce `null` perche' non trova un
trattino (`:681-683`); `readSeriesAndNumber("RamaDub x Booze")` per la stessa
ragione. Il conto torna con il ritrovamento: **22 + 9 = 31**.

#### Cosa deve fare la nuova lettura

Il secondo segmento, quando non e' `<SIGLA>-<NNN>`, e' **un nome nella stessa
forma della grammatica 3**, senza il numero finale:

- `re:sonate` → nome del formato, nessun locale;
- `RamaDub x Booze` → nome del formato ` x ` nome del locale;
- `re:sonate x Perlone` → idem.

**Il codice per risolverlo esiste gia' e non va riscritto:** `splitOnJoinWord`
(`:731-742`) e la sequenza di candidati di `readNight` (`:625-641`) —
`[venueWord, lastWord(venueWord)]` con la ` x `, `[testo, lastWord(testo)]` senza.
La lettura nuova e' quel blocco, **estratto in una funzione** e chiamato da due
posti, non copiato.

**Il rifiuto va conservato.** Se la mappa alias non risolve, il codice deve essere
`alias_unresolved` (che ha gia' il suo canale di segnalazione:
`ClassificationResult.aliasUnresolved`, `:298`) e **mai** un'attribuzione alla
serie piu' vicina. E' la riga 4 di `INCLUSION_RULE` (`:141`), e va aggiornata:
`INCLUSION_RULE` e' prosa **citata da `verify-ics-import.mjs`**, quindi una
grammatica nuova che non compare li' e' una grammatica non dichiarata.

#### Il pezzo resta senza numero — e i tipi lo vietano

Dopo `ICS-04` il pezzo ha tipo e serie, e **non ha numero**. Ma:

```typescript
// classify.ts:215-224
export interface ClassifiedPiece {
  seriesCode: string;
  number: number;      // ← obbligatorio
  key: string;         // ← seriesCode + number, obbligatorio
```

```typescript
// reconcile.ts:536-537
  seriesCode: NonNullable<PieceColumn<"series_code">>;
  number: NonNullable<PieceColumn<"number">>;
```

Le **colonne** sono nullabili (`production_piece.series_code text`,
`number integer`); i **tipi TypeScript** no. Quindi `ICS-04` non e' completabile
senza `ICS-05` o senza allentare quei tipi. **I due requisiti sono un solo lavoro
e non vanno messi in due onde diverse.**

---

### ICS-05 — trovare il numero

#### La direzione la dichiara gia' la tabella

`production_pipeline_rule` memorizza `(anchor_kind, anchor_weekday,
anchor_direction)` — mai un offset — e la migration ne spiega la ragione con
l'incidente registrato (`:869-900`). Le 14 regole vive, lette dai seed:

| Formato / serie | Pezzo | Ancora | Giorno ISO | Direzione | `derivable` | Episodi |
|---|---|---|---|---|---|---|
| `RMDB` | listing | self | 2 (mar) | before | ✓ | 1 |
| `RMDB` | tonight | self | — | on | ✓ | 1 |
| `RMDB` | recap | self | 1 (lun) | after | ✓ | 1 |
| `RMDB` | livecut | self | 1 (lun) | after | ✓ | 1 |
| `MTNLB` | listing / tonight / recap / livecut | come `RMDB` | | | ✓ | |
| `RSNT` | timetable | self | — | on | ✓ | 1 |
| `RSNT` | livecut | **next_edition** | 2 (mar) | on | ✓ | **dalla line-up** |
| `RSNT` | after_movie | **next_edition_listing** | 1 (lun) | before | ✓ | 1 |
| `RSNT` | listing | self | 2 (mar) | before | **✗** | — |
| `RSNT` / serie `PRLN` | listing | self | 2 (mar) | before | ✓ | 1 |
| `RSNT` / serie `PRLN` | livecut | self | 1 (lun) | after | ✓ | 1 |

*(Le due regole di un quarto formato sono sparite per cascata quando quel formato
e' stato cancellato in fase 48 — 16 seminate, 14 vive.)*

#### Il predicato e' gia' scritto

```typescript
// anchors.ts:601
export function conformsToRule(
  actualDate: CivilDate,     // la data del pezzo, letta dal file
  rule: PipelineRule,        // la regola della sua serie e del suo tipo
  context: AnchorContext     // { nightDate, nextEditionDate, nextEditionListingDate, … }
): boolean | null
```

**La seconda passata e' un ciclo su questo predicato**, non un'aritmetica nuova:

```
per ogni pezzo senza numero (sigla, tipo, data):
    regola   := rulesForSigla(sigla) → quella del tipo
    candidati := notti classificate con quella sigla
    esiti    := candidati.filter(n => conformsToRule(pezzo.data, regola, contesto(n)))
    se esiti.length === 1  → aggancia
    se esiti.length === 0  → non classificata, motivo NUOVO
    se esiti.length  >  1  → non classificata, motivo NUOVO (ambiguita')
```

`reconcile.ts` costruisce gia' un `AnchorContext` per ogni notte
(`buildAnchorContexts`, `:944`) — ordinate per data e numero (`byDateThenNumber`,
`:987`) — e gia' indicizza le pipeline per sigla (`indexPipelines`, `:1016`).
**L'infrastruttura c'e'.**

#### ⚠ `derivable: false` non significa «non agganciabile»

`conformsToRule` comincia con `if (!rule.derivable) return null;`. Per il listing
della notte (`RSNT`, `derivable = false`) il predicato **non risponde**. E i
`Listing - re:sonate` sono **9 delle 31 voci**.

`derivable` risponde a una domanda diversa da quella di `ICS-05`:

- **Derivare** (in avanti): *dato che c'e' una serata, quale martedi' porta il suo
  listing?* Per la notte non ha risposta — la nota della regola dice che
  l'anticipo e' «una o due settimane e mezzo, con tre anticipi distinti su sei
  edizioni». **Molti martedi' candidati, nessun criterio.**
- **Agganciare** (all'indietro): *dato un listing di martedi', a quale serata
  appartiene?* La regola dichiara direzione `before`, quindi la serata **segue** il
  listing. Le notti `RSNT` distano fra **uno e tre mesi** (tabella dei format in
  `production-calendar.md`). **La prima notte della serie dopo quel martedi' e'
  candidata unica**, con un margine enorme.

**L'inversione e' piu' facile della derivazione, e questa asimmetria e' il
contenuto intellettuale di `ICS-05`.** Il pianificatore deve saperlo o
concludera' che 9 voci su 31 sono irrisolvibili.

**Il vincolo che serve per non renderla pericolosa:** una **finestra massima**
dichiarata (per esempio: nessun aggancio se la serata candidata dista piu' di N
giorni dal pezzo), perche' senza finestra un listing orfano si attaccherebbe alla
prima serata del calendario a qualunque distanza. Il valore di N e' una decisione
misurabile sul calendario e va **misurato**, non scelto — e finche' non e'
misurato, il rifiuto e' la risposta corretta.

#### L'ambiguita', e cosa farne

Con la finestra, l'ambiguita' resta possibile: due satelliti in due locali diversi
possono avere il listing lo stesso martedi'. Ma dopo `ICS-04` la sigla e' gia'
risolta **per locale** (`RMDB-BZ` vs `RMDB-MR`), quindi i candidati sono gia'
filtrati per serie. Restano ambigue solo due edizioni **della stessa serie** che
producono la stessa data — che per una cadenza a 14 giorni non accade.

**Comportamento richiesto in caso di ambiguita': non classificata, con un motivo
proprio, contata nel referto.** Mai «la piu' vicina». `INCLUSION_RULE` riga 5
(`:143`) e' la regola generale, e vale qui:

> *«It is never handed a format and a progressivo it does not have — a progressivo
> is a monotone guard and, once assigned, is already on a poster.»*

`UNCLASSIFIED_REASONS` ha oggi quattro membri (`:174-185`). Servono
**due nuovi motivi distinti** — *nessuna serata candidata* e *piu' di una serata
candidata* — perche' sono due lavori diversi per chi legge il referto, e un codice
unico e' il `catch` collassato che `meta-gates.md` proibisce.

#### ⚠ E il numero, si scrive o no?

Agganciato il pezzo alla serata, `plan_id` e' noto. Il **numero** pero' e' un
progressivo, e scriverlo su una riga il cui titolo non lo portava e' un atto che
il dominio tratta come pericoloso. Due forme, entrambe difendibili:

| | Cosa si scrive | Conseguenza |
|---|---|---|
| **a** | `plan_id` sì, `number` e `series_code` **null** | Il progressivo non viene mai inventato. La superficie legge il numero attraverso il piano. Richiede di allentare `PieceFields.number` da `NonNullable` a nullabile e di verificare che nessuna superficie lo dia per certo. |
| **b** | `plan_id` sì, `number` **derivato dalla serata agganciata** | Il numero e' una derivazione tracciabile, non un'invenzione. Ma la riga diventa indistinguibile da una che il file aveva numerato — e `production_piece` non ha una colonna che dica quale delle due. |

La (b) senza una colonna di provenienza ricreerebbe, sui pezzi, esattamente il
problema che `origin` (`file` / `proposed`) risolve sulle date. La ricerca segnala
la simmetria e **non sceglie**.

---

### ICS-06 — le proposte

#### Come nasce una proposta

`reconcile.ts:1331` (`emitProposal`) chiama `anchors.proposePieceDate`
(`:531`) per ogni pezzo **dovuto e non scritto nel file**. La riga risultante:

- ha `origin = 'proposed'`;
- ha `source_uid = NULL` — e la migration rende **irrappresentabile** la
  combinazione pericolosa (`production_piece_proposal_has_no_source`, `:447-449`);
- e' inserita con `.insert()` e **non** `.upsert()`
  (`import-production-calendar.mjs:1307-1319`), proprio perche' non ha uid.

L'idempotenza delle proposte oggi e' tenuta a mano dal riconciliatore, che
riadotta la proposta esistente (`claimNextProposal`, `:1383`). **Con lo specchio
questo meccanismo sparisce**: le proposte si cancellano e si ricreano, che e'
letteralmente cio' che `ICS-06` dichiara. E' una **semplificazione**, non una
perdita.

#### Dove si disegnano, e dove va la dichiarazione

`PieceDate.tsx` (215 righe) e' **l'unico renderer** di una data di pezzo — U5 di
`verify-calendar-surface.mjs` lo verifica. Ha sei stati; il terzo e' la proposta
(`:167-177`): badge `Proposed`, colore `--muted`, bordo tratteggiato.

Il posto naturale per la dichiarazione **non e' li'**: ripeterla su ogni riga la
renderebbe rumore. E' `PiecesSection.tsx`, che ha gia' **esattamente questo
precedente**:

```typescript
// PiecesSection.tsx:120
const LINEUP_DEPENDENT = "LiveCuts depend on the line-up";
// … :193
const lineupDependent = pieces.some(
  (piece) => "unresolved" in piece.state && piece.state.unresolved === "depends_on_lineup"
);
// … :202
{lineupDependent ? <p className={`mb-4 ${REASON}`}>{LINEUP_DEPENDENT}</p> : null}
```

La forma di `ICS-06` e' la stessa frase, con il predicato
`piece.state.origin === "proposed"`. **Il precedente e' identico e va imitato, non
reinventato.**

**Vincoli meccanici sul testo e sullo stile:**

- **U6** — *«emphasis is spent on Late and Diverged, and on nothing else»*: la
  dichiarazione **non puo'** usare `tone="emphasis"`. `REASON` (`text-sm
  text-muted`) e' il registro giusto.
- **U8** — ogni elemento che porta un nome di formato, una sigla o il brand deve
  dichiarare la trasformazione: la frase non deve nominarne nessuno.
- **U3** — la superficie non costruisce `Date` e non formatta con API di
  piattaforma: la frase non porta date.
- La lingua della superficie e' l'inglese (tutti i testi esistenti lo sono).

**Un secondo posto ragionevole**, complementare e non alternativo:
`ImportRunSummary.tsx`, che gia' disegna in fondo al calendario cosa ha fatto
l'ultimo import. Li' la dichiarazione dice *quando* si sono ricalcolate; in
`PiecesSection` dice *che* si ricalcolano. Il piano puo' prenderne una o entrambe;
**almeno una e' obbligatoria** perche' `ICS-06` chiede che «la superficie lo
dichiari».

---

### ICS-07 — la riga che fa fallire l'audit

#### Il meccanismo, isolato

`auditOwnOutput()` (`import-production-calendar.mjs:1523-1564`) fa due
controlli sul proprio transcript:

```javascript
const leaked = [...residual].filter((token) => printed.has(token));
const years  = [...printed].filter((token) => /^(19|20)\d{2}$/.test(token));
```

Il secondo e' quello che e' scattato: *«1 four-digit year(s) appear above»*.

I token si ottengono cosi' (`:584-591`):

```javascript
String(value).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3)
```

**Un UUID viene spezzato ai trattini in cinque gruppi — 8, 4, 4, 4, 12 caratteri.
Un gruppo da 4 che sia `19xx` o `20xx` supera il filtro di lunghezza e
corrisponde alla regex degli anni.**

**Misurato in questa sessione su 200.000 UUID casuali: 0,29% ne contiene uno.**
Su un referto che ne stampa N, la probabilita' e' `1 − (1 − 0,0029)^N` — con 66
identificativi stampati vale circa il **17%**.

**La causa non e' una data.** E' un identificativo che *sembra* una data. L'audit
non puo' distinguerli, e — per la sua stessa dottrina — **non deve provarci**:
allargare la regola per farla passare e' esattamente cio' che lo script vieta.

#### Le tre righe candidate

| Riga | Cosa stampa | Su quale percorso |
|---|---|---|
| **`:1209`** | `` say(`  ── applying ── import run ${runId}`) `` — un `uuid` da `gen_random_uuid()` | **solo `--apply`** |
| `:1117` | `` `         ${record.subject}  ${record.id}  ${record.reason}` `` — l'`id` **grezzo** di una riga, **non** passato per `printableUid` | entrambi, ma solo se ci sono assenze |
| `:1103` | `printableUid(record.sourceUid)` — l'uid del file, che resta grezzo se non porta parole del titolo | entrambi, ma solo se ci sono divergenze |

**Come si chiude la questione con una misura invece che con una deduzione.** Il
ritrovamento esclude il blocco delle assenze *«che stampa identificativo e codice
di motivo e nient'altro»* — ma quella e' proprio la forma che puo' contenere un
anno. Il discriminante e' una interrogazione sola al catalogo:

```sql
-- le righe di import run di quella sessione: qualcuno ha un gruppo che sembra un anno?
SELECT id, started_at
  FROM public.production_import_run
 WHERE id::text ~ '(^|-)(19|20)[0-9]{2}(-|$)'
 ORDER BY started_at;
```

Se il run incriminato e' fra questi, e' `:1209`. Altrimenti e' uno degli altri due
e la stessa regex si applica agli `id` delle righe con `absent_since` non nullo.
**Questa misura va fatta nel piano, non assunta.**

#### La riparazione, e cosa non e'

Lo script detta la propria dottrina (`:1559`): *«Reword the output; never widen the
rule.»* Le forme accettabili:

- **stampare l'identificativo in una forma che non produce token da 4 cifre** —
  per esempio la stessa forma di digest che `printableUid` usa gia' (`uid#` +
  12 caratteri esadecimali: **un solo token, mai un anno**);
- **non stamparlo affatto**, quando non serve. La riga `:1209` esiste per
  correlare il referto con la riga del registro; un digest stabile la correla
  altrettanto bene.

**Cosa non e' accettabile:** aggiungere un'eccezione alla regex, tenere una lista
di token esentati, o disattivare il controllo degli anni. `verify-ics-import.mjs`
(`:127-147`) rifiuta la lista di esenzioni con un argomento che vale identico
qui.

**E c'e' un vincolo in piu' che il piano deve rispettare:** `ICS-01` e `ICS-02`
aggiungono al referto nuove righe (quante cancellate, quante riagganciate, quale
calendario). **Ognuna e' una nuova occasione per l'audit di andare in rosso.**
Un referto che stampa conteggi e codici e' sicuro; uno che stampa identificativi
non lo e'. Il piano dovrebbe stabilire la regola una volta — *nessun identificativo
grezzo nel transcript* — invece di riparare la riga di oggi.

---

### ICS-08 — `Timetable` nudo e `Flyering`

#### ⚠ Il fatto misurato, che corregge il ritrovamento

Eseguito in sessione contro `classifyEntry`:

| Titolo | Esito attuale |
|---|---|
| `Timetable` | **`commitment`** |
| `Flyering - re:sonate` | **`commitment`** |

**Non finiscono fra le non classificate.** Diventano righe di
`production_commitment` — la tabella che, per dichiarazione della sua stessa
migration, contiene *«an entry […] which belongs to something which is NOT our
production, and which occupies a day […] so that nobody schedules a night against
it»* (`:471-476`).

Il percorso, riga per riga:

- `Timetable` → `readCanonicalPiece` esce (`segments.length < 2`) →
  `readLegacyPiece` esce → `readNight` esce (`splitTrailingNumber` non trova
  spazio, `:706`) → `carriesKnownWord("timetable")` = falso →
  ramo finale `commitment` (`:434-443`).
- `Flyering - re:sonate` → `KIND_BY_LABEL.get("flyering")` = `undefined` →
  `readLegacyPiece` non trova un tipo nel secondo segmento → `readNight` esce (il
  titolo contiene ` - `) → `carriesKnownWord` spezza su `[\s\-,:]+`, quindi cerca
  `flyering`, `re`, `sonate`, che nessun alias reclama → `commitment`.

**Perche' e' peggio di «non classificata».** Le non classificate hanno un canale:
`unclassified_count` e' una colonna a se' su `production_import_run`, disegnata
sulla superficie con la stessa prominenza degli altri conteggi
(`ImportRunSummary.tsx`, regola 2). **Un `commitment` non ha alcun canale**: e' un
esito normale, atteso, e la superficie lo mostra come «giorno occupato». Sette
timetable della notte e sette voci di volantinaggio nostre risultano oggi
**giorni occupati da qualcun altro**, e nessun numero lo dice.

Questo cambia il peso di `ICS-08`: non e' una rifinitura di vocabolario, e' un
**fallimento silenzioso attivo** — la categoria che `meta-gates.md` mette al
centro.

#### Il contesto che il proprietario deve avere davanti

- `Timetable` **e' gia' uno dei sei tipi** (`PIECE_KINDS`), ed **e' gia' una regola
  di pipeline** per la notte: `RSNT / timetable / self / on`, cioe' *il giorno
  stesso della serata*. Il tipo esiste; e' il **titolo nudo** a non portare
  serie ne' numero.
- `production-calendar.md` conferma: la timetable e' un pezzo **della notte**, e
  aggiungerla a un satellite «allargherebbe il format, non il piano editoriale».
- **`Flyering` non e' uno dei sei tipi**, e `vocabulary.ts` claim (b) spiega perche'
  la lista e' chiusa: c'e' esattamente **una** parola che qualcuno sara' tentato di
  aggiungere come settima, e non e' questa. Aggiungere `flyering` non viola quel
  divieto — ma apre la lista, che era chiusa per scelta.
- Il volantinaggio **non e' un pezzo editoriale**: non e' una grafica che esce a
  un'ancora, e' un'attivita' che occupa un pomeriggio.

#### Le quattro opzioni — con la conseguenza, senza raccomandazione

| | Decisione | Cosa comporta | Cosa costa |
|---|---|---|---|
| **A** | **`Timetable` nudo → un pezzo della notte**, agganciato per data con `ICS-05` (la sua regola e' `self / on`, quindi la serata e' quella dello stesso giorno: aggancio esatto, zero ambiguita') | Sette timetable smettono di essere giorni occupati e diventano cio' che sono. La checklist della notte le conta. | Nulla di strutturale — `ICS-05` fa il lavoro. Ma se in quel giorno non c'e' una serata classificata, l'esito e' *nessuna serata candidata*, cioe' una non classificata in piu' (visibile, che e' meglio di oggi). |
| **B** | **`Timetable` nudo → giorno occupato, e lo si dichiara** | Nessun codice cambia. La decisione e' scritta e il prossimo lettore non la riapre. | Sette pezzi reali della pipeline restano invisibili al piano editoriale, e la checklist della notte continua a non saperli. |
| **C** | **`Flyering` → settimo tipo di pezzo** | Il volantinaggio entra nella pipeline con una sua regola. | Apre una lista chiusa per decisione, aggiunge un membro a `PIECE_KINDS`, a `PIECE_KIND_LABELS`, al `CHECK` SQL di **due** tabelle (`production_piece`, `production_pipeline_rule`) e a `database.ts` — tutto **nello stesso commit** (`vocabulary.ts` claim (a)). E chiede una regola di ancora che oggi nessuno ha misurato. |
| **D** | **`Flyering` → rifiuto motivato**: non e' un pezzo, e' un'attivita' che occupa un giorno | Coerente con cio' che la tabella dei `commitment` dice di se'. | ⚠ **Ma il comportamento attuale non e' «rifiuto motivato»: e' silenzio.** Se si sceglie D, serve comunque un modo per distinguere *«un giorno occupato da qualcun altro»* da *«una nostra attivita' che occupa un giorno»*, o la decisione resta indistinguibile dal difetto. |

**Le due parole sono indipendenti**: si puo' prendere A per la timetable e D per il
volantinaggio, o qualunque altra combinazione. Sono due decisioni, non una.

**Il vincolo comune a tutte e quattro:** `ICS-08` chiede *«una decisione
dichiarata»*. Qualunque sia, va scritta dove il prossimo lettore la trova —
`INCLUSION_RULE` in `classify.ts:138-147`, che e' prosa citata dal controllo B di
`verify-ics-import.mjs`. Una decisione che non arriva li' non e' dichiarata.

---

## Common Pitfalls

### Pitfall 1 — cancellare i pezzi dopo i piani

**Cosa va storto:** violazione di chiave esterna sulla prima riga di piano che ha
un pezzo. Lo script si ferma a meta', con `failPartway`, e in un contesto senza
transazione.
**Perche' accade:** `production_piece.plan_id` e' `NO ACTION`, non `CASCADE`, e la
migration lo dichiara: *«The other references here are `NO ACTION` for the opposite
reason: they point at things that exist independently»* (`:653-655`).
**Come evitarlo:** ordine `checklist → piece → plan → commitment`.
**Segnale precoce:** un codice PostgREST `23503` in `failPartway`.

### Pitfall 2 — leggere l'errore di PostgREST e stamparlo intero

**Cosa va storto:** su una violazione di vincolo PostgREST restituisce **l'intera
riga rifiutata** in `error.details`. Su `production_plan` quella riga porta
`venue_word` — la parola per uno spazio, possibilmente in trattativa.
**Perche' accade:** un `console.error(error)` invece di `describe(error)`.
**Come evitarlo:** `describe()` esiste ed estrae solo `code` e `message`
(`:650`). Non e' una convenzione: e' misurato (`20260815120100:370-380`).
**Segnale precoce:** un `catch` nuovo che non passa da `describe`.

### Pitfall 3 — dare per scontato che `derivable` governi l'aggancio

**Cosa va storto:** 9 delle 31 voci restano non classificate e sembrano
irrisolvibili; qualcuno conclude che `ICS-05` non copre il caso.
**Perche' accade:** `conformsToRule` restituisce `null` su
`derivable = false`.
**Come evitarlo:** § *ICS-05*, il paragrafo sull'asimmetria.
**Segnale precoce:** un piano che dichiara «i listing della notte non sono
agganciabili».

### Pitfall 4 — riparare l'audit del referto allargando la regola

**Cosa va storto:** il controllo degli anni diventa inutile e la prossima data
vera passa.
**Perche' accade:** e' la riparazione piu' rapida.
**Come evitarlo:** lo script lo vieta esplicitamente (`:1559`).
**Segnale precoce:** una lista di token, una regex con eccezioni, un flag.

### Pitfall 5 — misurare l'effetto del delete con lo strumento che lo ha causato

**Cosa va storto:** lo script dichiara di aver cancellato N righe e nessuno lo
smentisce, perche' il conteggio viene dallo stesso processo.
**Perche' accade:** e' il precedente registrato: *«una misura presa con lo
strumento che ha causato l'effetto non e' una misura: e' un'eco»*
(`ai-engineering.md`).
**Come evitarlo:** la conferma si chiede al catalogo dalla Management API.

### Pitfall 6 — trattare `production_pipeline_rule` e `production_import_run` come parte dello specchio

**Cosa va storto:** un `DELETE` largo porta via le 14 regole (configurazione, non
specchiata da nessun file) o il registro degli import (l'unico strumento
diagnostico del dominio).
**Perche' accade:** «le sei tabelle del calendario» e' un'espressione che ricorre
nei commenti, e **due delle sei non sono uno specchio**.
**Come evitarlo:** il codice deve nominare le **tre** tabelle specchiate, mai «le
sei».

### Pitfall 7 — cancellare un modulo e fidarsi del build

**Cosa va storto:** `reconcile.ts` viene rinominato o rimosso, `npm run build`
resta verde, e ci si accorge alla prossima esecuzione dell'import — che in
produzione non e' frequente.
**Perche' accade:** i moduli sono caricati con un `import()` costruito a runtime;
il bundler non li vede. E' il reperto B-2 dell'audit v1.5, ed e' la ragione per cui
`verify:ics-reachable` esiste.
**Come evitarlo:** `npm run verify:ics-reachable` **dopo** ogni cancellazione, e
aggiornare il conteggio dei moduli che quel gate si aspetta, nello stesso commit.

### Pitfall 8 — usare `record_checklist_tick` per ripristinare una spunta

**Cosa va storto:** la spunta risulta fatta da chi ha lanciato l'import.
**Perche' accade:** la funzione **ri-registra l'autore** a ogni chiamata, per
decisione (`20260815120100:395-400`).
**Come evitarlo:** un percorso di ripristino distinto che conserva `ticked_by` e
`ticked_by_name` originali. Un ripristino non e' un atto.

---

## Code Examples

### Il predicato dell'aggancio (ICS-05), come si usa

```typescript
// Fonte: src/lib/production/ics/anchors.ts:601-627 (firma reale, uso proposto)
//
// Per un pezzo senza numero: si prova la regola IN AVANTI su ogni notte candidata
// della stessa sigla e si tiene quella che coincide. Non si inverte mai
// nearestWeekday: e' molti-a-uno.

const candidates = nightsOfSigla.filter((night) => {
  const context = anchorContexts.get(night.key);
  if (context === undefined) return false;
  return conformsToRuleIgnoringDerivable(piece.date, rule, context) === true;
});

// Zero e "piu' di uno" sono DUE esiti diversi, con due codici diversi.
if (candidates.length === 1) attach(piece, candidates[0]);
else if (candidates.length === 0) unclassified(piece.uid, "no_candidate_edition");
else unclassified(piece.uid, "several_candidate_editions");
```

### La forma di memorizzazione di una regola — perche' non e' un offset

```sql
-- Fonte: supabase/migrations/20260815120000_production_calendar.sql:900-915
--   anchor_kind       self | next_edition | next_edition_listing
--   anchor_weekday    ISO-8601, lunedi' = 1 … domenica = 7.
--                     NULL = "il giorno dell'ancora, qualunque sia" — l'unico
--                     modo corretto di dirlo per una notte che cade venerdi' O sabato
--   anchor_direction  on | before | after
--
-- Non esiste alcuna colonna di offset, di nessun nome, e un grep e' l'asserzione.
```

### Il vincolo che rende irrappresentabile la riga pericolosa

```sql
-- Fonte: supabase/migrations/20260815120000_production_calendar.sql:447-449
CONSTRAINT production_piece_proposal_has_no_source
  CHECK (origin <> 'proposed' OR source_uid IS NULL)
-- Una data calcolata non puo' indossare l'autorita' del file. Non e' scoraggiata:
-- e' irrappresentabile. Lo specchio non deve toccarlo.
```

### La forma della dichiarazione di ICS-06 — il precedente da imitare

```typescript
// Fonte: src/app/(admin)/admin/calendar/PiecesSection.tsx:120, 193-203
const LINEUP_DEPENDENT = "LiveCuts depend on the line-up";

const lineupDependent = pieces.some(
  (piece) => "unresolved" in piece.state && piece.state.unresolved === "depends_on_lineup"
);

{lineupDependent ? <p className={`mb-4 ${REASON}`}>{LINEUP_DEPENDENT}</p> : null}
// ICS-06 e' la stessa forma con il predicato origin === "proposed".
// REASON, mai tone="emphasis" — U6 lo verifica.
```

---

## State of the Art

| Prima | Adesso | Quando | Impatto |
|---|---|---|---|
| Un formato del catalogo con la sua serie, i suoi due pesi di pipeline e il suo manifesto sonoro | **Cancellato** dal catalogo; le sue **2 regole di pipeline sono sparite per cascata** | 2026-08-20, fase 48 | Le regole vive sono **14**, non 16. Il seed della migration le reinserirebbe solo se quel formato tornasse — e non tornera'. Un piano che scrivesse «sedici regole» sbaglierebbe la misura. |
| Il calendario scriveva il brand in una grafia | Il calendario scrive **`re:sonate`**, che e' la grafia corretta per `brand-visual-system.md` | fase 48 | **Renderlo brand-corretto lo ha reso macchina-illeggibile.** Il conflitto non e' profondo: lo strumento chiede una sigla, la grafia riguarda un nome, e nessuno aveva scritto che i due campi finiscono nello stesso posto in un titolo. |
| `production.read` come chiave unica sulla superficie di produzione | Quattro chiavi di sezione; `production.read` **ritirata** | fase 45, `20260817120000` + `20260817120500` | Le policy citate in `20260815120100` non sono piu' quelle vive. **Chi tocca l'accesso in questa fase deve leggere le due migration del 2026-08-17, non solo quella di agosto 15.** |
| «La rotazione non si e' mai interrotta in nove cicli, 27 date» | Misurato: **zero satelliti sono andati in onda**; e' un piano, non uno storico | 2026-08-15 | Precedente diretto per questa fase: **un documento aveva scritto la conseguenza al posto della regola**. E' lo stesso errore che `ICS-05` puo' commettere se qualcuno scrive un offset. |

**Deprecato / superato in questa fase:**

- I punti **1 e 2** di `48-FINDING-01` § Ritrovamento 02 (capire l'asimmetria dei
  timbri; togliere i 17 timbri). Lo specchio li rende privi di oggetto.
  **Non pianificarli.**
- Il paragrafo *«It removes nothing, ever»* di
  `import-production-calendar.mjs:60-67`. Va **riscritto**, non cancellato.
- Il significato del controllo **E** di `verify-ics-import.mjs` («riconciliare due
  volte, il secondo piano dev'essere vuoto»). Sotto uno specchio il piano non e'
  mai vuoto. Vedi § *Validation Architecture*.

---

## Assumptions Log

| # | Affermazione | Sezione | Rischio se sbagliata |
|---|---|---|---|
| A1 | I due `.ics` presenti sulla macchina **non sono** la coppia notte/satellite dei ritrovamenti della fase 48 (misurato: 84 UID in comune, quindi si sovrappongono, mentre la coppia vera aveva zero sovrapposizioni). | ICS-02 | Se lo fossero, la misura su `X-WR-CALNAME` sarebbe direttamente conclusiva invece che indicativa. La raccomandazione (opzione A, argomento esplicito) **non cambia** in nessuno dei due casi. |
| A2 | Le tre righe candidate di `ICS-07` sono le uniche che stampano un identificativo libero nel transcript. Ottenuto leggendo tutte le `say(` dello script, non con un grep. | ICS-07 | Se ne esistesse una quarta, la riparazione mirata mancherebbe il bersaglio. La regola generale proposta — *nessun identificativo grezzo nel transcript* — le copre tutte comunque. |
| A3 | Le notti `RSNT` distano fra uno e tre mesi, quindi «la prima notte dopo questo martedi'» e' candidata unica. Fonte: tabella dei format in `production-calendar.md`, **non** una misura sul calendario in questa sessione. | ICS-05 | Se due notti cadessero a distanza ravvicinata, l'aggancio del listing diventerebbe ambiguo. Mitigato dal comportamento richiesto: **due candidate → non classificata**, mai la piu' vicina. |
| A4 | Il conteggio «31 su 104» corrisponde a 22 + 9 delle due forme misurate. Aritmetica sul ritrovamento della fase 48, non rimisurata qui (il file dell'unione non e' su questa macchina). | ICS-04 | Se il conto non tornasse, esisterebbe una quinta forma non identificata. La riparazione del ramo `:527-531` resta valida comunque; cambierebbe solo quante voci recupera. |
| A5 | `production_checklist_item` ha **0 righe spuntate** e `production_plan` **0 righe legate**, al 2026-08-20. Fonte: CONTEXT.md e ROADMAP.md, misurato dal proprietario. Non rimisurato in questa sessione. | ICS-03 | Se fosse falso, la procedura di riaggancio passerebbe da *precauzione* a *percorso critico con dati veri al primo giro*. **Da rimisurare all'inizio del piano**, e' una `SELECT count(*)`. |
| A6 | Il payload dello specchio (~100 righe) sta comodamente in un `jsonb` di una chiamata RPC. Stima, non misura. | Pattern 2 forma A | Con un calendario molto piu' grande la forma A potrebbe incontrare limiti di dimensione della richiesta. Da misurare se si sceglie quella strada. |

---

## Open Questions (RESOLVED — 2026-08-20)

> **Tutte e sei sono chiuse.** Le prime quattro dal proprietario, con la misura
> davanti (`58-CONTEXT.md`, blocco `<decisions>`); le ultime due dal piano, che le
> chiude **misurando** invece di scegliere. La sezione resta com'e' stata scritta,
> con la risoluzione accanto a ciascuna: cancellare la domanda perderebbe la
> ragione per cui la risposta ha la forma che ha.
>
> | # | Chiusa da | Esito |
> |---|---|---|
> | 1 — la guardia sul progressivo | **D-58-01** | L'import confronta, **rifiuta con uscita `2` senza scrivere**, e una rinumerazione voluta passa da una riautorizzazione esplicita **registrata nel referto**. Il trigger resta installato per gli altri scrittori; il commento della sua migration si riscrive. |
> | 2 — la riga legata a una serata annunciata | **D-58-02** | Opzione (a): una riga con un legame **non si cancella mai**. E' un'eccezione di **sopravvivenza**, distinta dalle due di stato, e per questo e' `ICS-03b` nel ROADMAP e non una nota. |
> | 3 — `Timetable` e `Flyering` | **D-58-03** e **D-58-04** | `Timetable` nudo → pezzo della notte, agganciato per data. `Flyering` → **settimo tipo**. Due decisioni, come la ricerca aveva chiesto. |
> | 4 — il vocabolario delle chiavi | **D-58-06** | Tre chiavi, una per format: `rsnt`, `rmdb`, `mtnlb`. Vocabolario chiuso; ogni aggiunta futura e' una migration dichiarata; nessuna nomina uno spazio. |
> | 5 — scrivere il numero derivato | **`58-03-PLAN.md`** | **Non si scrive.** Regola unica: si memorizza cio' che il titolo portava; cio' che solo l'aggancio implica lo da' il join. La simmetria con `origin` e' dichiarata — una data proposta si memorizza perche' si disegna, un numero derivato no perche' `plan_id` c'e' gia'. |
> | 6 — la finestra massima dell'aggancio | **`58-02-PLAN.md`, misura M2** | **Misurata, non scelta**, sui pezzi gia' agganciati, per coppia (serie, tipo), in **onda 0** — cioe' prima che lo specchio possa cancellare le righe da cui si misura. Le coppie senza campione restano vuote e **rifiutano**. |
>
> **Una settima domanda e' nata dopo la ricerca e non e' in questo elenco:** il
> conflitto fra `D-58-05` e `D-44-26`, trovato dal pattern mapper e chiuso da
> **D-58-07** — meta' della decisione del 2026-08-15 e' rovesciata, e le cinque
> difese che la sostituiscono sono requisiti (`ICS-10b`), non intenzioni.


1. **La guardia monotona sul progressivo, dopo lo specchio.**
   - Cosa sappiamo: il trigger e' `BEFORE UPDATE OF number`; uno specchio non fa
     `UPDATE`; `meta-gates.md` vieta di rendere una guardia monotona piu' facile da
     aggirare senza autorizzazione documentata nel commit.
   - Cosa non e' chiaro: se il proprietario accetta che il file diventi l'unica
     autorita' sul progressivo.
   - Raccomandazione: **checkpoint al proprietario**, con le quattro opzioni della
     § *ICS-01*. Classificazione **Critical**.

2. **Una riga di piano legata a una serata annunciata, sparita dal file.**
   - Cosa sappiamo: oggi il rischio e' zero (0 righe legate); il contratto attuale
     protegge quel caso con una frase scritta; `ICS-03` non lo copre.
   - Cosa non e' chiaro: quale delle quattro opzioni della § *ICS-03* il
     proprietario vuole.
   - Raccomandazione: **checkpoint al proprietario**. Classificazione **Critical**
     (una serata annunciata puo' avere biglietti in vendita).

3. **`Timetable` nudo e `Flyering` (`ICS-08`).**
   - Cosa sappiamo: oggi diventano `commitment` in silenzio — misurato.
   - Cosa non e' chiaro: quale delle quattro opzioni.
   - Raccomandazione: **checkpoint al proprietario**, con il fatto misurato davanti
     (che il ritrovamento della fase 48 non aveva isolato). Sono **due** decisioni.

4. **Il vocabolario delle chiavi di calendario (`ICS-02`).**
   - Cosa sappiamo: dev'essere chiuso, dichiarato, e non puo' contenere una parola
     per uno spazio non acquisito.
   - Cosa non e' chiaro: quanti calendari il proprietario tiene e come vuole
     chiamarli.
   - Raccomandazione: chiedere **il numero e i nomi**, non dedurli dai file
     presenti — che potrebbero non essere quelli.

5. **Se scrivere il numero su un pezzo agganciato (`ICS-05`).**
   - Cosa sappiamo: la colonna e' nullabile, i tipi TypeScript no; scrivere un
     progressivo derivato lo rende indistinguibile da uno letto dal file.
   - Cosa non e' chiaro: se serve una colonna di provenienza sul numero, come
     `origin` fa per la data.
   - Raccomandazione: decisione tecnica del piano, con la simmetria dichiarata.
     Non serve il proprietario.

6. **La finestra massima dell'aggancio (`ICS-05`).**
   - Cosa sappiamo: senza finestra un pezzo orfano si attacca alla prima serata a
     qualunque distanza.
   - Cosa non e' chiaro: il valore.
   - Raccomandazione: **misurarlo sul calendario vero** durante il piano, non
     sceglierlo. Finche' non e' misurato, il rifiuto e' la risposta corretta.

---

## Environment Availability

| Dipendenza | Richiesta da | Disponibile | Versione | Ripiego |
|---|---|---|---|---|
| Node | tutto | ✓ | v25.6.1 (misurato) | — |
| `@supabase/supabase-js` | lo script scrivente | ✓ | gia' in `package.json` | — |
| **CLI Supabase** | applicare la migration | **✗** | — | **Management API**, endpoint migrations. Precedente in repo: `scripts/rls-baseline.mjs:82,268`. |
| Credenziali service-role | lo script scrivente | ✓ (macchina del proprietario) | — | Nessuno: senza, lo script rifiuta (`loadEnvironment`, `:375`). |
| **Il `.ics` di produzione** | `import:calendar`, `verify:ics` | **parzialmente** | Due file presenti; **non sono la coppia dei ritrovamenti** (84 UID in comune, misurato) | Nessuno. `verify:ics` sta in `NEEDS_MATERIAL` e **non gira** in `npm run verify`, per decisione scritta (`verify-all.mjs:51-58`). |
| Docker / container Postgres usa-e-getta | misurare il comportamento di PostgREST su un rifiuto | presente come cartella (`scripts/container/`) | non verificato in sessione | Se serve misurare un errore di FK senza toccare la produzione, e' la strada gia' battuta dal piano 44-02. |
| `slopcheck` | audit dei pacchetti | non installato | — | **Irrilevante**: nessun pacchetto nuovo. |

**Dipendenze mancanti senza ripiego:**

- **Il file `.ics` giusto.** `verify:ics` non e' rieseguibile in modo significativo
  finche' il proprietario non fornisce il calendario su cui i numeri del controllo
  B sono stati misurati. **I numeri d'oro del controllo B cambieranno con
  `ICS-04`/`ICS-05` e vanno rimisurati, non aggiustati a mano.**

**Dipendenze mancanti con ripiego:**

- CLI Supabase → Management API (gia' in uso nel repo).

---

## Validation Architecture

> `workflow.nyquist_validation` non e' dichiarato in `.planning/config.json`,
> quindi si considera **attivo**.

### Test Framework

| Proprieta' | Valore |
|---|---|
| Framework | **Nessuno.** Il repo non ha script `test`, ne' `*.test.*`, ne' `*.spec.*` (CLAUDE.md Guardrail 1). |
| File di configurazione | nessuno — e non se ne crea uno in questa fase |
| Comando rapido | `npm run build` (include il typecheck di Next) |
| Suite completa | `npm run verify` (aggregato) + i gate che non ci stanno dentro: `npm run verify:ics` (chiede materiale), `npm run verify:persona` (se si tocca `.claude/**`) |

**Cio' che sostituisce i test in questo repo:** script `verify-*.mjs` che leggono
sorgenti, dichiarazioni o il file vero, con tre esiti (`0` passa, `1` fallisce,
`2` rifiuta — e un rifiuto non e' un fallimento), piu' **procedure manuali
scritte** sul modello di `44-PROCEDURES.md`.

### Phase Requirements → Test Map

| Req | Comportamento | Tipo | Comando automatico | Esiste? |
|---|---|---|---|---|
| **ICS-01** | Lo specchio cancella nell'ordine imposto dalle FK e non lascia righe fuori scopo | **catalogo** | `SELECT count(*)` per tabella dalla Management API, prima e dopo | ❌ **onda 0** — nuovo `scripts/verify-mirror-scope.mjs` o una procedura scritta |
| **ICS-01** | Nessun `absent_since` viene mai scritto | source | grep sul sorgente dopo la riscrittura | ❌ onda 0 — un controllo in piu' dentro `verify-ics-import.mjs` |
| **ICS-01** | **Idempotenza dello specchio** — due esecuzioni consecutive lasciano lo **stesso insieme di righe** | source + catalogo | **Il controllo E va riscritto**: il predicato non e' piu' «il secondo piano e' vuoto» ma «lo stato risultante e' uguale» | ⚠ **riscrittura**, non aggiunta |
| **ICS-02** | Senza `--calendar`, `--apply` rifiuta con uscita `2` | eseguibile | `node scripts/import-production-calendar.mjs --apply` senza chiave → attesa uscita 2 | ❌ onda 0 — una riga in `verify-refusal.mjs` o una procedura |
| **ICS-02** | La colonna esiste, e' `NOT NULL` e ha un indice | **catalogo** | `information_schema.columns` + `pg_indexes` dalla Management API | ❌ onda 0 — precedente: `scripts/rls-baseline.mjs` |
| **ICS-03** | Una spunta sopravvive a un import | **manuale, obbligatoria** | — | ❌ **P-58-A**, sul modello di `44-PROCEDURES.md` P4 |
| **ICS-03** | Un legame sopravvive a un import | **manuale, obbligatoria** | — | ❌ **P-58-B**, sul modello di P3 |
| **ICS-04** | Le quattro forme di titolo che oggi falliscono producono un pezzo | **source, contro il modulo** | Un controllo che chiama `classifyEntry` con **titoli sintetici** e una mappa alias sintetica, senza aprire `docs/` | ❌ onda 0 — **e' il gate piu' prezioso della fase**: non chiede materiale, quindi gira ovunque e puo' stare in `npm run verify` |
| **ICS-05** | Un pezzo senza numero si aggancia alla serata giusta; zero candidate e piu' di una danno **due** esiti diversi | source, contro il modulo | Stesso gate sintetico, con notti e regole costruite a mano | ❌ onda 0 |
| **ICS-05** | Nessun pezzo che annuncia una serata e' datato **dopo** di essa | file vero | Controllo **C** di `verify-ics-import.mjs`, gia' scritto | ✅ esiste — va rieseguito |
| **ICS-06** | La dichiarazione compare quando c'e' almeno una proposta, e non usa `emphasis` | source | Un controllo `U11` in `verify-calendar-surface.mjs` | ❌ onda 0 |
| **ICS-06** | Una proposta non si legge come una data decisa | **manuale, giudizio** | — | ✅ esiste come forma: `44-PROCEDURES.md` **P2**, da rieseguire con la frase nuova |
| **ICS-07** | Il referto di un `--apply` che scrive proposte passa il proprio audit | eseguibile | `npm run import:calendar --apply` → attesa `IMPORT_APPLIED_OK`, uscita `0` | ✅ il controllo esiste dentro lo script; **serve materiale** |
| **ICS-07** | Nessun identificativo grezzo nel transcript | source | grep delle `say(` che interpolano un `id` / `uid` | ❌ onda 0 |
| **ICS-08** | La decisione presa e' quella che il codice esegue | source + modulo | Il gate sintetico di `ICS-04`, esteso ai due titoli | ❌ onda 0 |
| **tutti** | I moduli esistono e il barrel si importa | eseguibile | `npm run verify:ics-reachable` | ✅ esiste — **il conteggio dei moduli va aggiornato se un file sparisce** |
| **tutti** | I vocabolari TypeScript e i `CHECK` SQL concordano | source + SQL | Controllo **G** di `verify-ics-import.mjs` | ✅ esiste |
| **tutti** | Il tipo compila | build | `npm run build` | ✅ |

### Sampling Rate

- **Per task commit:** `npm run build`. Se il task tocca `src/lib/production/ics/`:
  anche `npm run verify:ics-reachable`. Se tocca la superficie:
  anche `npm run verify:calendar-surface`.
- **Per merge d'onda:** `npm run verify` (l'aggregato) + il nuovo gate sintetico.
- **Gate di fase:** `npm run verify` verde, **piu'** `npm run verify:ics` sul file
  vero sulla macchina del proprietario, **piu'** le due procedure manuali
  `P-58-A` / `P-58-B` eseguite e scritte, prima di `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] **`scripts/verify-ics-grammar.mjs`** — il gate sintetico: chiama
      `classifyEntry` e la seconda passata con **titoli e alias costruiti nel file**,
      senza aprire `docs/`. Copre `ICS-04`, `ICS-05`, `ICS-08`.
      ⚠ **Vincolo di riservatezza:** i titoli sintetici possono contenere solo
      parole gia' pubbliche (sigle di formato, locali gia' in rotazione). Nessun
      locale in trattativa, nessuna data.
      **E' il gate piu' prezioso della fase**, perche' non chiede materiale e quindi
      entra in `npm run verify` — dove `verify:ics` non puo' stare.
- [ ] **Riscrittura del controllo E** di `verify-ics-import.mjs`: da «il secondo
      piano e' vuoto» a «lo stato risultante e' identico».
- [ ] **Rimisura dei numeri d'oro del controllo B** dopo `ICS-04`/`ICS-05`.
      Rimisurati, mai aggiustati per far passare il gate.
- [ ] **`U11`** in `verify-calendar-surface.mjs` per la dichiarazione di `ICS-06`,
      e la sua riga in `44-UI-SPEC.md` §15 — o dove il contratto delle superfici
      vive oggi.
- [ ] **`P-58-A`** (la spunta sopravvive) e **`P-58-B`** (il legame sopravvive),
      sul modello di `44-PROCEDURES.md`: precondizioni lette il giorno stesso, passi
      numerati, ruolo con cui si esegue, cosa si deve osservare.
- [ ] **`P-58-C`** — la procedura di **ripristino**: cosa si fa se lo specchio
      muore fra il delete e l'insert. Va scritta **prima** del primo `--apply`, non
      dopo. Senza PITR e senza transazione, e' l'unico piano di rientro esistente.
- [ ] **Aggiornamento di `verify-ics-reachable.mjs`** se il numero dei moduli
      cambia, nello stesso commit della cancellazione.

---

## Security Domain

### Categorie ASVS applicabili

| Categoria ASVS | Si applica | Controllo standard nel repo |
|---|---|---|
| V2 Autenticazione | no | Lo script gira in locale con il service client; non c'e' sessione. |
| V3 Gestione sessione | no | — |
| **V4 Controllo d'accesso** | **sì** | RLS: sei policy di lettura su chiavi di sezione (`20260817120000`), **nessuna policy di scrittura, per decisione** (`20260815120100:255-285`). ⚠ Il ripristino delle spunte usa il service client, che **bypassa ogni policy**: e' il percorso piu' potente del repo e va tenuto nello script locale, mai su una superficie. |
| **V5 Validazione input** | **sì** | L'unico input e' un file sulla macchina che possiede la chiave. Ma `--calendar` diventa un **input dell'operatore che finisce in un `WHERE` di `DELETE`**: va validato contro il vocabolario chiuso **prima** di raggiungere una query. |
| V6 Crittografia | no | `createHash("sha256")` in `printableUid` e' un digest per riservatezza, non una primitiva di sicurezza. |
| **V7 Log e riservatezza** | **sì, ed e' la categoria dominante** | L'audit del transcript e' un controllo di riservatezza, non di stile. Vedi sotto. |

### Pattern di minaccia specifici di questo dominio

| Pattern | STRIDE | Mitigazione standard, gia' nel repo |
|---|---|---|
| Una sede in trattativa finisce in un log, in uno screenshot, in una issue | **Information disclosure** | `venue_word` non raggiunge alcun `console.*` (U10); `describe()` scarta `error.details`; `auditOwnOutput()` verifica il proprio transcript. **Tutte e tre restano obbligatorie dopo la riscrittura.** |
| Una data non annunciata finisce in `.planning/` | Information disclosure | La regola dei quattro cifre nell'audit. `ICS-07` **la riscrive dove parla, non dove controlla**. |
| Un nome di persona (`ticked_by_name`) finisce in un artefatto tracciato | Information disclosure | La migration lo vieta esplicitamente (`:706-713`). ⚠ **L'istantanea di `ICS-03` contiene quel nome**: va nella directory gitignorata, e il referto non ne stampa il contenuto. |
| Un `DELETE` con un predicato troppo largo cancella oltre lo scopo | **Tampering / DoS sui dati** | Nessuna mitigazione esistente — **e' nuova in questa fase.** Il verso dell'errore e' il criterio: un predicato per chiave, se sbaglia, non trova nulla. |
| La funzione della spunta raggiungibile senza sessione | Elevation of privilege | Gia' chiusa: `REVOKE … FROM public, anon, authenticated` (`20260815120200`). **Se il piano aggiunge una funzione `SECURITY DEFINER` per l'atomicita', deve ripetere quella coppia `REVOKE` + `GRANT` — il `GRANT` da solo non chiude nulla, perche' Postgres concede `EXECUTE` a `PUBLIC` per default.** E' un precedente misurato, non una precauzione. |
| Il `.ics` transita in una funzione serverless | Information disclosure | D-44-26: nessuna superficie di upload. **Non costruirne una.** |

---

## Sources

### Primary (HIGH confidence) — letti riga per riga in questa sessione

- `supabase/migrations/20260815120000_production_calendar.sql` (1.146 righe) —
  le sei tabelle, i vincoli, `ics_alias`, i 16 seed di regole
- `supabase/migrations/20260815120100_production_calendar_access.sql` (570) —
  policy di lettura, `refuse_production_plan_renumber`, `record_checklist_tick`
- `supabase/migrations/20260815120200_production_checklist_tick_revoke.sql` (60)
- `src/lib/production/ics/classify.ts` (825), `vocabulary.ts` (270),
  `anchors.ts` (627), `index.ts` (93); struttura di `reconcile.ts` (1.665)
- `scripts/import-production-calendar.mjs` (1.569)
- `scripts/verify-ics-import.mjs` (intestazione e gli otto controlli),
  `verify-ics-reachable.mjs` (156), `verify-calendar-surface.mjs` (i dieci `U`)
- `src/app/(admin)/admin/calendar/PieceDate.tsx`, `PiecesSection.tsx`,
  `ImportRunSummary.tsx`, `actions.ts`
- `src/types/database.ts` (`ProductionPlan`, e la prova che e' scritto a mano)
- `.claude/rules/production-calendar.md`, `meta-gates.md`, `supabase-data.md`,
  `ai-engineering.md` (il gate dell'istantanea), `CLAUDE.md`
- `.planning/phases/48-…/48-FINDING-01.md` (i tre ritrovamenti),
  `48-01-SUMMARY.md` (la cascata sulle regole di pipeline)
- `.planning/ROADMAP.md` § 58, `.planning/phases/58-…/58-CONTEXT.md`

### Misure eseguite in questa sessione (HIGH confidence, riproducibili)

| # | Misura | Risultato |
|---|---|---|
| M1 | `classifyEntry` contro sei forme di titolo, mappa alias sintetica | Le quattro forme con un nome al posto della sigla → `unclassified / kind_without_series_and_number`. Confermato il ramo `classify.ts:527-531`. |
| M2 | `classifyEntry` su `Timetable` e `Flyering - re:sonate` | **`commitment`, non `unclassified`.** Correzione al ritrovamento della fase 48. |
| M3 | Confronto per digest di `X-WR-CALNAME` sui due `.ics` presenti | **Identici.** Anche `PRODID` e il colore. |
| M4 | Sovrapposizione di UID fra i due `.ics` | 164 e 93 UID distinti, **84 in comune**. |
| M5 | 200.000 UUID casuali contro `tokensOf` + `/^(19|20)\d{2}$/` | **0,29%** contiene un gruppo che l'audit legge come un anno. |
| M6 | `grep -rE "REFERENCES public\.(production_…)"` su tutte le migration | **Tre** riferimenti in tutto il repo. Cascata enumerata leggendo i vincoli. |
| M7 | `classifyEntries` con mappa alias vuota sui due `.ics` presenti | 163 voci → 50 pezzi / 81 impegni / 32 non classificate; 92 voci → 56 pezzi / 29 impegni / 7 non classificate. Il secondo file e' quello su cui i numeri d'oro del controllo B furono misurati. |

### Secondary (MEDIUM confidence)

- Le misure del CONTEXT.md e della ROADMAP (2 piani, 0 legati; 14 spunte, 0
  spuntate; 6 proposte; 31 su 104) — misurate dal proprietario, **non rimisurate
  qui** perche' il materiale non e' su questa macchina.

### Tertiary (LOW confidence)

- Nessuna. La ricerca non ha usato ne' web search ne' documentazione esterna: il
  dominio e' interamente interno al repository.

---

## Metadata

**Confidence breakdown:**

| Area | Livello | Motivo |
|---|---|---|
| Schema, vincoli, cascate | **HIGH** | Letti nelle migration, non ricordati. Tre riferimenti FK enumerati con un grep. |
| Grammatica dei titoli e ramo di rottura | **HIGH** | Eseguito contro il modulo vero in questa sessione (M1, M2). |
| Meccanismo di `ICS-07` | **HIGH** sul meccanismo (M5), **MEDIUM** su quale delle tre righe | Il discriminante e' una query sola, scritta nella sezione. |
| Chiave di scopo (`ICS-02`) | **HIGH** sull'assenza della colonna, **MEDIUM** sulla conclusione riguardo `X-WR-CALNAME` | I due file misurati non sono con certezza la coppia vera (A1). La raccomandazione non cambia. |
| Inversione della regola (`ICS-05`) | **HIGH** sul predicato disponibile, **MEDIUM** sull'unicita' della candidata | Dipende dalla distanza fra le notti (A3), mitigata dal rifiuto sull'ambiguita'. |
| Architettura di validazione | **HIGH** | Gli otto controlli e i dieci `U` sono letti; l'assenza di test runner e' Guardrail 1. |
| Stato dei dati in produzione | **MEDIUM** | Misure del proprietario, non rimisurate (A5). Da rimisurare all'apertura del piano. |

**Research date:** 2026-08-20
**Valid until:** 2026-09-19 (30 giorni) — **ma tre voci scadono prima:**
- le misure sui dati in produzione (A5) scadono al **prossimo import**;
- la misura su `X-WR-CALNAME` (M3) scade **appena il proprietario fornisce la
  coppia vera di calendari**;
- i numeri d'oro del controllo B scadono **appena `ICS-04` entra**.
