---
phase: 48-il-catalogo-dei-format-dice-la-verita
document: ritrovamento
date: 2026-08-20
status: aperto — materiale per la fase 58
---

# Ritrovamento 01 — lo script bbocccia il proprio referto quando scrive proposte

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
