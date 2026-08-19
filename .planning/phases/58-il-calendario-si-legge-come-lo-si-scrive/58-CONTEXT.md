---
phase: 58-il-calendario-si-legge-come-lo-si-scrive
milestone: v1.6
created: 2026-08-20
requirements: [ICS-01, ICS-02, ICS-03, ICS-04, ICS-05, ICS-06]
---

# Fase 58 — contesto

## Da dove viene

Da tre ritrovamenti della fase 48, in ordine di scoperta e in ordine inverso di
importanza: le assenze false, la loro ripulitura asimmetrica, e sotto entrambi la
causa vera — **31 voci su 104 che lo strumento non sa leggere**.

Il referto completo, con le misure: `48-FINDING-01.md`.

## La decisione presa

**Il proprietario ha scelto: lo strumento impara a risolvere un nome** (2026-08-20).
L'alternativa — i calendari adottano la forma canonica con le sigle — non e' stata
presa perche' chiede disciplina a ogni voce, per sempre, ed e' il tipo di
disciplina che un giorno qualcuno non applichera'.

## ⚠ Cosa quella decisione NON copre, e va saputo prima di pianificare

*«Risolvere un nome»* copre `Listing - re:sonate` → serie `RSNT`.

**Non copre che quel titolo non porta un numero.** Misurato sui titoli veri:

| forma | numero | esito oggi |
|---|---|---|
| `LiveCut - RSNT-002 - PT2` | **si'** | passa |
| `After Movie - RSNT-001` | **si'** | passa |
| `Listing - re:sonate` | **no** | `kind_without_series_and_number` |
| `Listing - RamaDub x Booze` | **no** | `kind_without_series_and_number` |
| `Tonight - RamaDub x Booze` | **no** | idem |

**Il calendario usa due convenzioni, e sono entrambe sensate per chi lo scrive a
mano:** sigla e numero per un pezzo legato a un'edizione precisa, tipo e nome per
uno ricorrente. Nessuno le ha dichiarate perche' nessuno aveva avuto bisogno di
dirle a una macchina.

## Il fatto tecnico che decide la forma della riparazione

**`number` e' non-nullable** su `PieceFields` nel riconciliatore, e un pezzo si
aggancia alla sua notte per `seriesCode + number`. **Un pezzo senza numero oggi
non e' rappresentabile**, non solo non e' leggibile.

Da cui due strade, e la seconda e' quella giusta:

1. **rendere il numero nullable** attraverso classificatore, riconciliatore,
   script e schema — e allora un pezzo orfano diventa uno stato normale, che e'
   il contrario di cio' che serve;
2. **trovare il numero invece di rinunciarvi**: la data del pezzo piu' la regola
   di pipeline della sua serie dicono a quale serata appartiene. Un listing sta al
   martedi' **prima** della sua serata; la serata di quella serie piu' vicina in
   quella direzione **e'** la sua.

La seconda usa una cosa che il progetto ha gia' — `production_pipeline_rule`, con
`anchor_weekday` e `anchor_direction` — e produce un pezzo **completo**, non uno
mutilato.

## Perche' e' una seconda passata, e non una riga in piu'

Il classificatore decide una voce **alla volta** e non conosce le altre. La notte
a cui un listing appartiene e' un'altra voce dello stesso file, che magari non e'
ancora stata letta.

Quindi: **prima si classificano le notti, poi si agganciano i pezzi senza
numero.** Non e' una complicazione aggiunta: e' il minimo che la forma del
problema impone, e scriverlo qui evita che qualcuno tenti la riga in piu' e
scopra il vincolo a meta' strada.

## I due casi che restano aperti quale che sia la strada

- **`Timetable` nudo** — 7 voci, senza serie e senza numero. Non c'e' nome da
  risolvere: solo la data. E' aggancіabile per data alla notte del giorno stesso —
  che e' proprio cio' che `production-calendar.md` dichiara per la timetable — ma
  **la regola va letta, non assunta**.
- **`Flyering`** — 7 voci, e **non e' uno dei sei tipi di pezzo** che il prodotto
  conosce. Non e' un difetto di lettura: e' un pezzo di produzione che il modello
  non ha. Diventa un settimo tipo, oppure un giorno occupato, oppure un rifiuto
  con motivo — e la scelta e' del proprietario perche' e' una scelta sul modello
  editoriale, non sul parser.

## Cosa NON si fa in questa fase

- **Non si toglie a mano un solo timbro di assenza.** `ICS-04` viene dopo
  `ICS-03`, e con lo strumento riparato: una pulizia manuale adesso cancella
  l'unica prova che il difetto esiste.
- **Non si allarga l'audit del referto** per farlo passare. Lo script prescrive
  la riparazione da se': *riscrivere la riga che parla*.
- **Non si tocca il calendario del proprietario.** La decisione presa e'
  esattamente che il calendario resti come lo si scrive.

## Lo stato di partenza, misurato il 2026-08-20

| | |
|---|---|
| impegni | 79, **zero assenti** |
| pezzi | 46, di cui **17 timbrati assenti** — 14 falsi, 3 corretti (il format cancellato) |
| piani | 2 · checklist 14 · divergenze 0 |
| voci non classificate sull'unione | **31 su 104** |
| pezzi prodotti dal satellite | **0 su 28 voci** |
