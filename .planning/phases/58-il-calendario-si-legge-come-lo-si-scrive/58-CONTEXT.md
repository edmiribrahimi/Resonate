---
phase: 58-il-calendario-e-uno-specchio
milestone: v1.6
created: 2026-08-20
rewritten: 2026-08-20
requirements: [ICS-01, ICS-02, ICS-03, ICS-04, ICS-05, ICS-06, ICS-07, ICS-08]
---

# Fase 58 — contesto

> **Questo documento e' stato riscritto lo stesso giorno in cui e' nato.** La
> prima stesura pianificava di riparare la riconciliazione. Una domanda del
> proprietario — *«a cosa servono tutte queste riconciliazioni?»* — ha cambiato la
> fase, e la versione precedente e' registrata sotto per non far ricominciare da
> capo chi si chiedera' perche' non si e' presa quella strada.

## La domanda, e la misura che le ha risposto

La riconciliazione difende cio' che sta nelle tabelle e **non** sta nel
calendario. Misurato il 2026-08-20:

| | quante ce n'erano |
|---|---|
| spunte di checklist | 14 voci, **0 spuntate** |
| piani legati a una serata pubblicata | 2 piani, **0 legati** |
| proposte della regola | **6** |

**Una sola delle tre esisteva.** Cancellare tutto e riscrivere dal file avrebbe
perso sei righe e nient'altro.

E nel difendere stati che non c'erano ancora, la riconciliazione **ha rotto
l'unica cosa che c'era**: 66 assenze false, poi 17 timbri che non si toglievano,
poi un'asimmetria fra tabelle che esisteva solo per gestire quei timbri.

## Il disegno

**Cio' che viene dal calendario e' uno specchio.** Si cancella e si riscrive dal
file, **per quel calendario**. Se una voce non c'e' piu' nel file, non c'e' piu'.

**Due sole eccezioni, e sono nominate**: le **spunte** e il **legame con una
serata pubblicata**. Sono le uniche cose che una persona ha messo li' e che il
calendario non sa. Si riagganciano.

**`ICS-03` e' il confine, ed e' l'unica riga che va difesa nel tempo.** Ogni stato
umano che nascera' dopo — una nota, un'assegnazione, un allegato — o entra in
quella lista con una decisione scritta, **oppure il primo import lo cancella senza
che nessuno se ne accorga**. Uno specchio e' semplice esattamente perche' e'
spietato, e questa e' la riga dove quella spietatezza si ferma.

## Cosa NON si semplifica, e perche'

**La lettura dei titoli resta**, ed e' l'unica parte che aggiunge invece di
togliere: **uno specchio che non capisce cosa sta specchiando riporta 31 voci su
104 come «non classificate»** — misurato sull'unione dei due calendari.

Due cose da leggere che oggi non si leggono:

1. **un nome dove va la sigla** — `Listing - re:sonate`, `Listing - RamaDub x
   Booze` — risolto dalla mappa degli alias che esiste gia';
2. **un pezzo senza numero** — quegli stessi titoli non ne portano uno. Il numero
   **non si abbandona: si trova**, dalla data del pezzo piu' la regola di pipeline
   della sua serie. Un listing sta al martedi' prima della sua serata.

Il punto 2 impone una **seconda passata**: il classificatore decide una voce alla
volta, e la notte a cui un listing appartiene e' un'altra voce dello stesso file.
Prima le notti, poi l'aggancio.

## La contropartita, dichiarata

**Uno specchio cancella le proposte a ogni giro** — sono date che la regola
calcola e il file non porta. Va bene, **a patto che sia detto**: chi le guarda
deve sapere che si ricalcolano, non che sono state decise una volta.

## La strada NON presa, e perche'

La prima stesura di questa fase riparava la riconciliazione: scope per calendario
sull'assenza, ripulitura dei timbri con lo strumento riparato, l'asimmetria fra
tabelle. **Era piu' codice per difendere zero spunte e zero legami.**

Se un giorno quelle tabelle porteranno molto stato umano, la riconciliazione
tornera' ad avere senso — e allora si riaprira' con **una misura davanti**, come
questa. Non prima.

## Lo stato di partenza, misurato il 2026-08-20

| | |
|---|---|
| impegni | 79, zero assenti |
| pezzi | 46, di cui **17 timbrati assenti** — che lo specchio rende irrilevanti |
| piani 2 · checklist 14 · proposte 6 · divergenze 0 |
| voci non classificate sull'unione | **31 su 104** |
| pezzi prodotti dal calendario del satellite | **0 su 28 voci** |
