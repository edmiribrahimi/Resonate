---
created: 2026-08-22
source: decisione del proprietario, seduta del 2026-08-22 — spec confermata con tre domande di verifica
severity: high
area: venue-secrecy, ticketing-payments, media-and-storage, comms-analytics
resolves_phase:
---

# Il venue segreto su tre superfici, non su una

## La regola, come il proprietario l'ha fissata

| superficie | prima della rivelazione | dopo la rivelazione |
|---|---|---|
| **pagina pubblica dell'evento** (chiunque, anche senza biglietto) | `Secret Venue` | **`Secret Venue` — MAI svelato, nemmeno a serata finita** |
| **mail ai possessori di biglietto** | — | **l'indirizzo** |
| **pagina del proprio biglietto** (solo il titolare) | nessun indirizzo | **il venue, subito** |

**Chi acquista DOPO che il cron ha gia' rivelato** riceve **entrambe** le cose:
vede il venue sul proprio biglietto **e** gli parte una mail di rivelazione sua.
Ridondanza voluta: se una delle due strade cede, l'altra regge.

## La proprieta' che questa regola stabilisce

**La rivelazione non rende l'indirizzo pubblico: lo rende noto a chi ha
comprato.** L'indirizzo di una secret venue non compare **mai** su una superficie
aperta a chiunque, in nessun momento della sua vita.

E' **piu' stretta** di com'e' il prodotto oggi, in due punti, e piu' larga in
nessuno — quindi e' la direzione consentita per una guardia monotona
(`meta-gates.md`: una modifica puo' solo rendere la rivelazione piu' difficile).

## I due punti in cui il codice di oggi NON la rispetta

**1. La pagina del biglietto mostra il venue senza guardare la rivelazione.**
`src/app/(public)/tickets/[id]/page.tsx` legge la spunta di segretezza e **non
la consulta mai**: rende il testo libero del venue **incondizionatamente** al
titolare. La divergenza con la pagina pubblica e' **deliberata e documentata in
loco** dalla fase 41.2, che la chiama *«una seconda porta, non sorvegliata, sulla
stessa informazione»*.

Non e' una fuga della colonna protetta: e' che **il testo libero lo scrive una
persona**. Se contiene «Secret Venue» non esce niente; se contiene l'indirizzo,
esce **all'acquisto**. **E' un difetto vivo oggi, per i membri** — non solo una
preparazione all'ospite.

**2. La pagina pubblica rivela dopo il cron.** Oggi la nasconde *dietro* il
predicato di rivelazione, cioe' la mostra quando quello diventa vero. La regola
nuova dice **mai**.

## La conseguenza piu' larga, e non e' un campo

*«Mai, nemmeno dopo la serata»* **si estende ai media**. Una foto che inquadra
l'insegna, una storia con il civico, un recap che nomina il luogo: e' la stessa
informazione per un'altra strada, e la strada non e' presidiata da nessun
predicato. E' `media-and-storage` con `venue-secrecy` supplementare, e **non si
applica da sola**: qualunque cosa si costruisca qui non protegge una galleria.

Va deciso **come** si presidia — se la si presidia — invece di lasciarlo
implicito. Il proprietario ha scelto *«mai, nemmeno dopo»* con questa
conseguenza scritta davanti.

## Il vincolo sul secondo percorso di rivelazione

L'acquisto-dopo-la-rivelazione fa partire **una mail che porta un indirizzo**.
E' un **secondo posto da cui una rivelazione puo' uscire**, e
`venue-secrecy.md` e' esplicito: *ogni codice che puo' anticipare una rivelazione
va trattato come codice critico, perche' l'errore non e' reversibile*.

Requisiti, non suggerimenti:

- parte **solo** se la rivelazione per quella serata **e' gia' avvenuta**. Non
  deve esistere un ordine di esecuzione in cui questa mail preceda il cron.
- **idempotente per acquisto**: due webhook, una mail.
- non deve poter essere innescata da un acquisto **non ancora pagato**
  (verificato oggi: il biglietto nasce solo dentro la funzione del database,
  dopo un `PAID` confermato con una `GET` — questa mail deve stare **dietro** lo
  stesso cancello, non accanto).

## Verifica, in un repo senza test runner

Serve una **procedura manuale scritta** che copra le sei celle della tabella
sopra, piu' i due casi del secondo percorso (acquisto prima e dopo la
rivelazione), con ruolo, azione ed esito osservabile. Scritta, non evocata: e'
l'unica prova che esistera'.

## Legami

Vedi `.planning/todos/pending/guest-ticket-purchase.md`: con l'acquisto da
ospite questa regola smette di valere solo per i membri e vale **per chiunque
paghi**, che e' la ragione per cui i due punti scoperti vanno chiusi **prima**
che quel percorso esista.
