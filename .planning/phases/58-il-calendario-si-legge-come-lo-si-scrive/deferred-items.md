# Fase 58 — voci differite

Cose trovate durante l'esecuzione, **fuori dal perimetro del piano che le ha
trovate**, e non riparate. Ognuna porta chi l'ha vista e quando.

---

## 1. Le regole di pipeline: sedici nel file, quattordici nella tabella

- **Trovata:** piano 58-06, task 3, 2026-08-20, leggendo il catalogo vivo con
  `read_only: true`
- **Il fatto:** `public.production_pipeline_rule` contiene **14 righe**. Il
  controllo **D** di `verify-ics-import.mjs` riporta *«16 rules read from the
  migration»* — e le legge dal **file** della migration, mai dal database. I due
  numeri non sono mai stati confrontati da nessun controllo.
- **Perche' potrebbe non essere niente:** il seed puo' essere condizionato a
  format o serie che non esistono tutti in produzione, e due righe in meno
  sarebbero allora la conseguenza corretta di quel filtro, non una perdita.
- **Perche' potrebbe essere qualcosa:** se due regole mancano davvero, i pezzi di
  quei tipi non hanno un'ancora contro cui essere misurati — e l'assenza di una
  regola, per dottrina di questo modulo, non e' un errore ma un **orfano
  silenzioso**. Nessun conteggio oggi distingue *«regola assente per decisione»*
  da *«regola assente per riga mancante»*.
- **Non riparata perche':** il piano 58-06 tocca due `CHECK`, non il seed, e la
  regola di perimetro vieta di riparare cio' che non si e' rotto qui. Una riga
  inserita a mano in produzione sarebbe anche uno stato che nessuna migration
  ricostruisce.
- **Come si chiude:** confrontare, riga per riga, cio' che il seed inserisce con
  cio' che la tabella tiene, e poi decidere se la differenza e' una decisione o
  una perdita. Se e' una perdita, si corregge **in avanti**, con una migration.

---

## 2. `information_schema.table_constraints` e' vuota per il ruolo della Management API

- **Trovata:** piano 58-06, task 3, 2026-08-20
- **Il fatto:** la stessa interrogazione che restituisce dodici vincoli da
  `pg_constraint` restituisce **zero righe** da
  `information_schema.table_constraints`. Quella vista filtra per privilegio, e
  il ruolo con cui l'endpoint esegue non li ha.
- **Perche' conta:** un controllo scritto su `information_schema` da qui
  passerebbe **sempre**, misurando il vuoto. E' un falso verde per costruzione,
  ed e' esattamente la forma di rifiuto che questo progetto pretende sia
  distinguibile da un passaggio.
- **Non riparata perche':** nessuno script del repo interroga oggi quella vista;
  il piano 58-06 l'ha solo tentata e ha usato `pg_constraint` al suo posto.
- **Come si chiude:** se un controllo futuro avra' bisogno dei vincoli dal
  catalogo, usare `pg_constraint` — ed e' anche la fonte da cui `M4` aveva letto
  i dodici nomi.
