---
phase: 48-il-catalogo-dei-format-dice-la-verita
plan: 04
subsystem: production-calendar / import
tags: [ics-import, snapshot-invariant, finding]
status: parziale — un ritrovamento aperto
provides:
  - "39 pezzi e 72 impegni in produzione, da due import"
decisions:
  - "NON si riapplica nessuno dei due file finche' il ritrovamento non e' chiuso"
metrics:
  completed: 2026-08-20
---

# Fase 48 Piano 04 — Summary

Applicati entrambi i file. **E poi la verifica che lo script stesso impone ha
prodotto un ritrovamento**, quindi la fase si ferma qui invece di dichiararsi
chiusa.

## Cosa e' entrato

| | |
|---|---|
| `production_piece` | **39** |
| `production_commitment` | **72** — 66 dal primo file, 6 dal secondo |
| import eseguiti | 2 |
| righe rimosse | **0**, e nessun percorso dello script potrebbe |
| serate annunciate scritte | **0**, idem |

## Il ritrovamento: lo strumento vuole UNA istantanea, e i file sono due

Lo script chiude ogni applicazione con un'istruzione precisa:

> *«Run again with --dry-run: the plan must be empty. If it is not, that is a
> finding, and re-running until it looks right is not an answer.»*

**La seconda prova a vuoto non e' vuota.** Sul file Resonate dichiara **6
assenze**, e 6 e' esattamente il numero di impegni che il file RamaDub ha
scritto: `72 − 66 = 6`.

**Ogni file marca come assente cio' che l'altro ha scritto**, perche' il
riconciliatore tratta un file come l'istantanea **completa** del calendario.
Riapplicando si oscillerebbe: il Resonate timbrerebbe assenti i 6 del RamaDub, e
il RamaDub timbrerebbe assenti i 105 del Resonate.

**Niente e' andato perduto.** `absent_since` e' un timbro, le righe restano —
*«the row STAYS»* e' scritto nell'uscita. Ma lo stato attuale porta un'asserzione
falsa in attesa: 6 impegni sarebbero dichiarati assenti da un calendario in cui
esistono.

**Non si riapplica nulla** finche' il proprietario non decide fra le due strade:
una sola esportazione che contenga tutto, oppure un modo per dire allo strumento
che un file e' parziale — che e' una modifica al suo invariante dichiarato, non
una configurazione.

## Cinque voci che nessuno puo' indovinare

Il file Resonate porta **5 voci con una parola che nessuna serie rivendica**, e
**nessuna serie ha oggi un `ics_alias`** — tutte e cinque a `false`.

Lo script si rifiuta di indovinare, e la sua ragione e' la stessa del progetto:

> *«The repair is not in this script and is not in any file. Set `ics_alias` on
> the party_series row, in the database, by hand. The values are words for
> spaces, and a space that is not acquired in writing is not named in a public
> repository.»*

**E' `CAT-05` che si comporta come doveva**: le voci fuori catalogo sono contate e
riportate per identificativo e codice di motivo, mai per titolo, e **nessuna entra
per default**. Chiuderle richiede che qualcuno dica quale parola significa quale
serie — e quella persona non e' uno strumento.
