---
phase: 48-il-catalogo-dei-format-dice-la-verita
document: ritrovamento
date: 2026-08-20
status: aperto — materiale per la fase 58
---

# Ritrovamento 01 — lo script boccia il proprio referto quando scrive proposte

## Il fatto

`npm run import:calendar --apply` sul calendario della notte ha **completato le
scritture** e poi ha chiuso con:

```
✗ OUTPUT AUDIT FAILED — this run's own output carries material.
  1 four-digit year(s) appear above.
IMPORT_APPLIED_WITH_LEAKED_OUTPUT
```

**Il guardiano ha funzionato.** Lo script si controlla da solo il transcript
prima di dichiararsi riuscito, e si e' bocciato. Non e' un difetto del guardiano:
e' il guardiano che fa il suo mestiere su un ramo che non era mai stato
esercitato.

## Cosa e' vero e cosa no

| | |
|---|---|
| le scritture | **corrette**, verificate leggendo il database a parte |
| il transcript di quel run | **non si incolla da nessuna parte** |
| la prova a vuoto sullo stesso file | **zero date**, misurato dopo |
| il ramo che perde | solo quello di **scrittura** |

## Perche' oggi e non prima

Quel run e' **il primo che abbia mai scritto delle PROPOSTE** — pezzi la cui data
l'ha collocata una regola di pipeline invece del file — e le prime **voci di
checklist**.

Le proposte esistono da oggi per una ragione precisa: l'alias della serie di
Nizza e' stato impostato in questa stessa sessione, e prima di allora quelle
serate non risolvevano, quindi nessuna regola poteva calcolare niente da loro.
**Un ramo che non ha mai avuto dati non ha mai avuto un transcript da
verificare.**

## Cosa NON e' la causa

Misurato, per non far ripartire da zero chi lo cerchera':

- **non e' un'interpolazione di data dentro un messaggio**: nel file non esiste
  alcun `say(...)` che interpoli un campo di data;
- **non e' il blocco delle assenze**, che stampa identificativo e codice di
  motivo e nient'altro;
- **non e' un rifiuto**: il run e' arrivato in fondo e ha scritto.

Resta il percorso delle scritture, ed e' li' che va cercata — la riga che appare
solo quando qualcosa viene inserito.

## La riparazione, e cosa NON e'

Lo script lo dice da solo, e la sua formulazione e' la decisione:

> *«Reword the output; never widen the rule.»*

**Non si allarga l'audit per farlo passare.** Si riscrive la riga che parla,
perche' la regola — *una data non annunciata non si dice ad alta voce* — vale piu'
della comodita' di leggere quel transcript.

Va nella **fase 58** insieme alla riparazione dello scope multi-calendario: sono
lo stesso file, e toccarlo due volte per due ragioni e' un rischio in piu' su uno
strumento che scrive in produzione.


---

# Ritrovamento 02 — la ripulitura di un'assenza e' ASIMMETRICA fra le tabelle

## Il fatto, misurato

L'unione dei due calendari in **un solo file** e' la strada che non richiede
codice: lo strumento vuole un'istantanea, e l'unione **e'** l'istantanea. Misurata
prima di usarla: **104 voci, 104 UID distinti, zero duplicati** fra i due file —
i calendari non si sovrappongono affatto.

Applicata, l'unione ha fatto cio' che doveva sugli **impegni**:

| | prima | dopo |
|---|---|---|
| impegni timbrati assenti | 6 | **0** |
| assenze dichiarate dal piano | 6 | **0** |

**E non ha fatto nulla sui pezzi: 17 restano timbrati assenti.**

## Perche' sono FALSE, e come lo si e' stabilito

Non per deduzione: confrontando l'ora del timbro con il registro degli import,
che il prodotto tiene.

| import | ora | voci |
|---|---|---|
| 1º — il calendario della notte, versione superata | 22:33:28 | 79 |
| **2º — il calendario del satellite** | **22:33:32** | 28 |
| 3º — il calendario della notte, versione nuova | 23:18:25 | 76 |
| 4º — l'unione | 23:25:31 | 104 |

I 17 pezzi portano il timbro delle **22:33**. Il primo import trovo' il database
**vuoto** — non poteva dichiarare assente nulla. **Resta il secondo**, ed e'
esattamente quello che dichiaro' assenti anche i 66 impegni: lo stesso difetto di
scope, sulla stessa esecuzione.

## Il ritrovamento vero

**L'unione ha ripulito gli impegni e non i pezzi.** Il riconciliatore dichiara di
togliere il timbro quando una riga *«e' tornata»* — e su una tabella lo fa,
sull'altra no.

Non e' un difetto dei calendari, che sono corretti, e non e' il difetto di scope,
che l'unione aggira. E' un terzo difetto, sotto i primi due, e sarebbe rimasto
invisibile senza l'unione: **finche' ogni file dichiarava assente il lavoro
dell'altro, l'asimmetria era coperta dal rumore.**

## Cosa resta vero in produzione, adesso

- **impegni: 79, zero assenti.** Corretto.
- **pezzi: 46, di cui 17 con un timbro falso** che l'import non sa togliere.
- **piani 2, checklist 14, zero divergenze.**
- **la prova a vuoto non e' vuota**: solo aggiornamenti — 2 piani, 23 pezzi, 79
  impegni — **zero inserimenti, zero assenze, zero divergenze**. Un'esecuzione
  ripetuta riscrive gli stessi valori senza aggiungere nulla. E' una
  non-idempotenza mite, e resta un ritrovamento perche' lo script pretende che il
  piano sia **vuoto**.

## Per la fase 58

1. **Capire perche' il timbro si toglie su una tabella e non sull'altra**, e
   ripararlo li' — non con una pulizia manuale, che cancellerebbe l'unica prova
   che il difetto esiste.
2. **Poi** togliere i 17 timbri, quando lo strumento sa rifarlo da solo.
3. La riga che fa fallire l'audit sulle proposte.
4. Lo scope per calendario, che l'unione **aggira ma non risolve**: l'unione e'
   un passo manuale prima di ogni import, e un passo manuale prima di un
   percorso che scrive in produzione e' un passo che un giorno qualcuno saltera'.

---

# Ritrovamento 03 — il calendario nuovo e' brand-corretto e macchina-illeggibile

## Il fatto

Le assenze dei pezzi **non si tolgono perche' quelle voci non producono piu' un
pezzo da incontrare.** Misurato sul registro degli import, che conserva come ogni
esecuzione ha classificato le sue voci:

| import | voci | pezzi riconosciuti | non classificate |
|---|---|---|---|
| calendario della notte, versione superata | 79 | **39** | 5 |
| calendario della notte, versione nuova | 76 | **23** | 9 |
| unione dei due | 104 | **23** | **31** |

**Trentuno voci su centoquattro non sono classificabili — quasi un terzo.**

## La causa: una quarta grammatica che nessuno ha dichiarato

Lo strumento ne conosce **tre**, e lo dice nei suoi commenti:

| | forma | esempio |
|---|---|---|
| canonica | `<Tipo> - <SIGLA>-<NNN>` | `LiveCut - RSNT-007 - PT1` |
| vecchia, invertita | `<Parola> <NNN> - <Tipo>` | `Resonate 002 - Listing` |
| notte | `<Parola>[ x <Parola>] <NNN>` | `re:sonate 004` |

Il calendario nuovo scrive **`Listing - re:sonate`**: forma canonica, ma con il
**nome** dove la grammatica pretende la **sigla**. Non e' nessuna delle tre.

**E il calendario e' internamente incoerente**: i LiveCut scrivono `RSNT`, i
listing scrivono `re:sonate`. Le stesse quattordici voci LiveCut passano; i sette
listing no.

## Il conto per forma, sull'unione

**Passano** — 18 voci: `LiveCut - RSNT-NNN - PTn` (14), `LiveCut - RSNT-PRLN-NNN`
(2), `Visuals - RSNT-NNN` (2), piu' `After Movie - RSNT-NNN` (7) e le due forme
di notte (9).

**Non passano** — e sono i gruppi che contano:

| n | forma | perche' |
|---|---|---|
| 22 | `Tonight/Listing/LiveCut/Recap - RamaDub x Booze` | **TUTTI i pezzi del satellite**: nome del locale dove va la sigla |
| 9 | `Listing - re:sonate` e `Listing - re:sonate x Perlone` | nome dove va la sigla |
| 7 | `Timetable` | tipo nudo, senza serie ne' numero |
| 7 | `Flyering - re:sonate`, `Flyering - SoY` | *Flyering* non e' uno dei sei tipi |
| 18 | `SoY`, `SoY x Unum`, `Music`, `Video Production`, … | **corretto**: sono giorni occupati, non nostri pezzi |

> **Il satellite non ha prodotto un solo pezzo.** Il suo import dichiaro' `pezzi
> 0`, ed era vero: tutte e ventidue le sue voci editoriali scrivono il nome del
> locale dove lo strumento cerca una sigla.

## Perche' e' successo, e perche' non e' colpa di nessuno

La rinominazione da `Resonate` a `re:sonate` **e' corretta**: e' la grafia che
`brand-visual-system.md` impone ovunque, e il calendario ha smesso di sbagliarla.

**Rendere il calendario brand-corretto lo ha reso macchina-illeggibile.** Le due
cose non erano in conflitto per nessuna ragione profonda: lo strumento chiede una
sigla, la grafia riguarda un nome, e nessuno aveva scritto che quei due campi
finiscono nello stesso posto in un titolo.

## La decisione, ed e' del proprietario

Due strade, e non sono equivalenti:

1. **I calendari adottano la forma canonica** — `Listing - RSNT-002`,
   `Listing - BZ-001` — che i LiveCut usano gia'. Nessun codice cambia; cambia
   come si scrive un titolo, per sempre, su ogni voce nuova.
2. **Lo strumento impara a risolvere un nome** nella posizione della sigla,
   passando dalla mappa degli alias che **esiste gia'** (`party_series.ics_alias`,
   parola → codice). Il calendario resta come lo si scrive naturalmente.

La seconda e' piu' clemente verso chi scrive il calendario a mano, e usa un
meccanismo che il progetto ha gia'. La prima non costa codice ma chiede
disciplina a ogni voce, per sempre — ed e' esattamente il tipo di disciplina che
un giorno qualcuno non applichera'.

**Restano comunque da decidere due casi**, quale che sia la strada: `Timetable`
nudo, senza serie ne' numero, e `Flyering`, che non e' uno dei sei tipi di pezzo
che il prodotto conosce.
