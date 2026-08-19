---
phase: 47-il-token-che-si-beve-e-si-fa-rimborsare
plan: 01
subsystem: supabase-data / drink-tokens
tags: [drink-token, activation-history, migration, lab-proof, production-write]

requires:
  - "v1.6-PHASE-47-PROBE.md — la prova del difetto, presa prima che questa riparazione la rendesse impossibile"
provides:
  - "drink_tokens.activation_count — nullable, e le due semantiche di NULL e 0 sono diverse"
  - "activated_at che sopravvive all'annullamento, con il significato dichiarato sulla colonna"
  - "la sonda che ora asserisce il comportamento nuovo, con le controprove intatte"
affects:
  - "47-04 — la biforcazione automatico/manuale legge activation_count, mai activated_at"
  - "47-02 — la pulizia non puo' cancellare cio' che porta il conteggio prima della finestra"

decisions:
  - "DEVIAZIONE dal piano: la colonna e' NULLABLE, non NOT NULL DEFAULT 0 — vedi sotto"
  - "redeem_drink_token non toccata: le sue tre proprieta' sono controprove misurate"
  - "coalesce(activation_count, 0) + 1 nell'incremento: una riga vecchia attivata dopo la migration diventa «almeno una», che e' vero e sufficiente"
  - "Applicata in produzione il 2026-08-19 dopo aver misurato 0 token, 0 ordini, 0 biglietti"

metrics:
  duration: "~40 minuti, 2026-08-19"
  completed: 2026-08-19
  tasks: 3
---

# Fase 47 Piano 01 — Summary

La traccia dell'attivazione sopravvive all'annullamento, le attivazioni si
contano, e **il verso della sonda si e' rovesciato**: le stesse righe che il
2026-08-19 dicevano `activated_at=NULL` ora dicono *valorizzato*, con il
conteggio a 5. Le due controprove tengono. Applicata in produzione su tabelle
vuote, e confermata dal catalogo.

---

## La deviazione, e perche' e' un miglioramento e non una scorciatoia

**Il piano chiedeva `activation_count integer NOT NULL DEFAULT 0`, con un
commento a spiegare che sulle righe preesistenti quello 0 significa «nessun
dato».** La colonna e' invece **nullable**, il default si applica solo alle righe
nuove, e le due cose sono distinte **dal tipo** invece che da un commento:

| valore | significato |
|---|---|
| `NULL` | riga nata **prima** che si contasse — **non sappiamo** |
| `0` | mai attivato, **e lo sappiamo** |

**La ragione e' 47-04.** Con il piano originale, la biforcazione avrebbe dovuto
distinguere i due casi **confrontando la data di creazione della riga con la data
della migration** — una regola che vive in un `if`, in un file diverso, e che il
primo refactoring perde. Cosi' invece la distinzione e' nel dato, e la query che
seleziona i rimborsabili automaticamente (`activation_count = 0`) **esclude i
NULL da sola**, perche' in SQL `NULL = 0` non e' vero.

**Provato in laboratorio, non dedotto:** una riga con conteggio `NULL` e stato
`purchased` **non passa** il filtro `activation_count = 0`. Misurato.

Il verso conta: sbagliando, un `NULL` trattato come 0 avrebbe rimborsato
automaticamente proprio i token su cui non sappiamo niente — l'errore che questa
fase esiste per togliere, applicato all'indietro.

## Task 1 — La migration

`supabase/migrations/20260820100000_drink_token_activation_history.sql`.

Tre pezzi: la colonna con il suo vincolo di non-decrescita e i due
`COMMENT ON COLUMN`; `activate_drink_token` che incrementa **nella stessa
istruzione** che cambia lo stato, dentro lo stesso lock; `deactivate_drink_token`
che cambia **una cosa sola** — l'`UPDATE` non contiene piu' `activated_at = NULL`.

**Controlli del piano, misurati:**

| controllo | atteso | misurato |
|---|---|---|
| `activated_at = NULL` fuori dai commenti | 0 | **0** |
| `redeem_drink_token` ridefinita | 0 | **0** |
| `CHECK` sul conteggio | 1 | **1** |
| `COMMENT ON COLUMN` | 2 | **2** |

## Task 2 — La prova, dove le stesse righe dicono il contrario

**Il controllo di fedelta' ha fatto il suo mestiere, e il risultato e' piu' forte
di un 10/10 nudo.** `lab-bootstrap.mjs` applica **tutte** le migration, compresa
questa: il laboratorio l'aveva quindi gia', e la produzione no. Il confronto ha
dichiarato **due cataloghi divergenti su dieci**, ed erano **esattamente i due
oggetti che questa migration aggiunge**, enumerati per nome:

- `drink_tokens.activation_count:integer`
- `drink_tokens:drink_tokens_activation_count_check`

Ogni altro catalogo identico — 446 colonne meno una, 93 policy, 37 RLS, 15
trigger, 32 funzioni, 125 indici, 46 enum, 6 bucket. **Il che dice una cosa che un
10/10 non avrebbe detto: la migration aggiunge quello che dichiara e nient'altro.**

**Esito della sonda:**

| asserzione | esito |
|---|---|
| dopo cinque cicli la traccia sopravvive | **OK** — prima era `NULL` |
| il conteggio vale | **5** |
| lo stato e' ancora `purchased` | **OK — e dichiararlo e' il punto** |
| il token bevuto non passa il filtro automatico | **OK — 0** |
| un token nuovo mai toccato nasce con conteggio | **0** |
| primo serve / secondo serve | **true / false** — invariate |
| annullare dopo il serve | **rifiutato** — invariata |

> **«Lo stato e' ancora `purchased`» e' un'asserzione, non un residuo.** Questa
> riparazione **non impedisce il ciclo**: lo rende visibile. A impedirlo e' la
> procedura del banco (47-06). Una sonda che avesse preteso uno stato diverso
> avrebbe descritto una riparazione che non e' stata fatta.

**Smontaggio:** progetto cancellato dopo aver riletto il nome dal server,
credenziali locali rimosse, e assenza confermata **dalla lista dei progetti** —
fonte diversa da quella con cui si e' cancellato.

## Task 3 — La produzione

**Misurata in sola lettura prima di scrivere:** `drink_tokens` **0**,
`drink_orders` **0**, `tickets` **0**. Nessuna riga da migrare, nessun token in
volo mentre le funzioni cambiano, e la distinzione `NULL`/`0` oggi vuota.

**Le definizioni delle tre funzioni sono state catturate prima** — 712, 754 e 773
byte — cosi' il ritorno indietro e' un fatto e non una speranza.

**Conferma letta dal catalogo, non dalla risposta di chi ha scritto:**

| | |
|---|---|
| colonna `activation_count` | presente |
| vincolo | presente |
| `activated_at = NULL` in `deactivate_drink_token` | **assente** |
| `activation_count` in `activate_drink_token` | presente |

`npm run build` verde, con il tipo aggiornato e i due commenti che dichiarano il
significato delle colonne dove un consumatore li leggera'.

## Cosa questo piano NON ha fatto

- **Nessuna regola di rimborso.** E' 47-04, ed e' deliberato: la traccia e'
  l'unica delle due cose che aveva una scadenza.
- **Nessuna interfaccia mostra il conteggio.** E' 47-04.
- **Il difetto non e' impedito.** E' reso visibile. La distinzione e' l'intero
  contenuto di questa fase.
