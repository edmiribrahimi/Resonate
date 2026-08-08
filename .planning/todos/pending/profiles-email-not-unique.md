---
created: 2026-08-08
source: 43-12 (deviazione Rule 2 dell'esecutore) — verificato dall'orchestratore
severity: moderate
area: access-gating, supabase-data
resolves_phase:
---

# `public.profiles.email` non ha un vincolo di unicità

## Il fatto, verificato

`supabase/schema.sql:56` — `email text not null`. Nessun `unique`.
Nella stessa `schema.sql`, la riga 280 dichiara `email text unique not null` su
un'altra tabella: **non è una convenzione del progetto, è un'assenza puntuale.**

## Perche' e' emerso adesso

Il piano `43-12` riconcilia il ruolo `master` confrontando l'indirizzo
configurato con le righe di `profiles`. Con due righe corrispondenti, un
`LIMIT 1` avrebbe **promosso una a caso e retrocesso l'altra** — e l'altra
poteva essere il master in carica. L'esecutore ha aggiunto un ramo `ambiguous`
che rifiuta invece di scegliere, e ha provato che scatta.

Quel ramo chiude il sintomo nel suo percorso. **Non chiude la causa**, che vale
per ogni altro percorso che risolve un profilo partendo dall'indirizzo.

## Cosa NON e' stato verificato

Se `auth.users.email` sia unico a monte. Se lo fosse, i duplicati sarebbero
improbabili in pratica — perche' `handle_new_user` inserisce da li' — ma
resterebbero **non impediti a questo livello**, e un cambio di indirizzo non
sincronizzato o un inserimento manuale li produrrebbe comunque.
**Verificarlo alla fonte prima di decidere il rimedio**, invece di dedurlo.

## Cosa fare

Due strade, e la scelta dipende dalla verifica sopra:

1. **Aggiungere il vincolo** — richiede prima di misurare quante righe
   duplicate esistono oggi in produzione, esattamente come `43-01` ha fatto per
   `role => approved`. Un `NOT VALID` su righe gia' duplicate le congelerebbe
   contro qualunque update futuro.
2. **Lasciarlo assente e difendersi al chiamante** — allora ogni percorso che
   cerca un profilo per indirizzo deve gestire *zero, una, molte*, come fa
   `43-12`. Va scritto come regola, altrimenti il prossimo scrive `LIMIT 1`.

La prima e' preferibile: la seconda e' una convenzione, e questa fase ha gia'
registrato che una convenzione tiene finche' qualcuno non scrive la funzione
successiva dimenticandosene.

## Nota di prodotto

Nessuna superficie deve promettere che un indirizzo identifica una persona
sola, finche' il database non lo garantisce.
