---
phase: 48-il-catalogo-dei-format-dice-la-verita
plan: 01
subsystem: supabase-data / formats
tags: [format-delete, cascade, scouting-archive, colour, contrast]
provides:
  - "il catalogo senza SunSet: RSNT, RMDB, MTNLB, piu' UNCL ritirato"
  - "RamaDub #6E8BFF, misurato"
  - "58 spazi di scouting conservati, senza etichetta di format"
decisions:
  - "I 58 spazi restano e perdono l'etichetta — decisione del proprietario, 2026-08-20"
  - "Il blu e' #6E8BFF e non #2B4BE8: il primo dava 3.11:1, sotto ogni altra tinta del catalogo"
  - "Rimozione per chiave primaria dalla lista catturata, mai per etichetta"
metrics:
  duration: "~40 minuti, 2026-08-20"
  completed: 2026-08-20
---

# Fase 48 Piano 01 — Summary

Il catalogo dice la verita': tre format vivi piu' `Unclassified` ritirato, e
RamaDub e' blu. **184 spazi di scouting su 184 sono ancora in archivio.**

## Cancellare un format non e' cancellare una riga

Otto tabelle referenziano `formats`. Enumerate **leggendo i vincoli**, contate
una per una, e ognuna presa per quello che era:

| dipendenza | regola | righe | esito |
|---|---|---|---|
| `event_parties` | RESTRICT | 0 | nessuna serata perduta |
| `production_section` | NO ACTION | 0 | il manifesto sonoro non era nel database |
| `party_series` | RESTRICT | 1 | cancellata, aveva 0 serate |
| `production_pipeline_rule` | **CASCADE** | 2 | **sparite in silenzio, e registrate prima** |
| `production_space.home_format_id` | NO ACTION | **58** | **sciolti, non cancellati** |

**Le due regole di pipeline, registrate prima che sparissero:** il LiveCut del
lunedi' in **due puntate** — *«due perche' i dj sono due, misurato su tre edizioni
di tre»* — e il listing del martedi' marcato **non derivabile**, con la nota che
l'anticipo era di undici o diciotto giorni e *«nulla puo' derivarlo: si legge dal
file»*.

Una cascata e' un percorso di scrittura che nessuno ha dichiarato. Qui e'
dichiarato, e cio' che portava via e' scritto.

## I 58 spazi

Un terzo dell'archivio portava SunSet come `home_format_id`: erano stati cercati
**per** quel format — esterni, rivolti a ovest, rooftop.

**Restano.** `home_format_id` a `NULL` su 58 righe, per chiave primaria dalla
lista catturata. Nessun attributo, nessun punteggio sugli altri format, nessuna
riga si e' persa: **184 prima, 184 dopo**. Cio' che si e' perso e' il segno che
diceva perche' furono cercati.

L'attributo `outdoor_sunset` **resta anch'esso**, ed e' una distinzione che vale
fare: e' una proprieta' dello spazio — *esterno, rivolto al tramonto* — non un
riferimento al format, e sta fra i dieci valori ammessi da un `CHECK` su 1840
righe. Toglierlo avrebbe rotto lo schema.

## Il blu, misurato invece che scelto

**Il primo blu era sbagliato, e a proporlo ero stato io.** `#2B4BE8` era stato
descritto come *«regge sul nero cosmico»*. Misurato:

| | su `--ground` | su `--surface` |
|---|---|---|
| le sei tinte del catalogo | **5.57 → 11.92** | 5.29 → 11.32 |
| `#2B4BE8` | **3.11:1** | **2.95:1** |

Sotto la soglia del testo, e su `--surface` sotto **3:1**, che e' il minimo perfino
per un elemento non testuale. Il catalogo dei colori di questo progetto **annota
il rapporto accanto a ogni tinta**: non era un dettaglio dimenticato.

**Scelto `#6E8BFF` — 6.46:1 e 6.14:1**, dentro la fascia, appena sopra il viola.

## La rimozione, e come e' stata fatta

Per **chiave primaria**, dalla lista catturata al momento della lettura, mai per
etichetta e mai risalendo un albero di elementi. E' la regola che questo progetto
si e' dato dopo aver perso 63 righe in sette tabelle il 2026-08-10.

Istantanea prima: il format, i 58 identificativi, la serie, le due regole, il
colore di RamaDub. Conferma dopo, da una **lettura nuova** del catalogo e non
dalla risposta di chi ha scritto:

`sunset` 0 · RamaDub `#6E8BFF` · spazi **184** · senza format **58** · serie 5 ·
regole di pipeline **14** (erano 16).
