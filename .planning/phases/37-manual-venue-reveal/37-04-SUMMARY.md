---
phase: 37-manual-venue-reveal
plan: 04
subsystem: venue-reveal-window
tags: [time-and-scheduling, venue-secrecy, monotone-guard, validation, checkpoint]
requires:
  - src/utils/datetime.ts (la casa dichiarata delle regole temporali)
  - vercel.json (il cron `venue-reveal` a `0 6 * * *` UTC)
provides:
  - DEFAULT_VENUE_REVEAL_HOURS = 25 (costante unica)
  - venueRevealHours(stored) — la funzione che applica il fallback
  - pavimento di validazione a 25 ore, con un rifiuto che nomina la causa
affects:
  - 37-06 (deve instradare `?? 24` di `(public)/events/[slug]/page.tsx:112` sulla funzione)
  - 37-09 (deve instradare `?? 24` di `api/cron/venue-reveal/route.ts:43` sulla funzione)
  - 37-07 (assegnato qui: `EventForm.tsx` promette ancora «24 (default)» e accetta `min={1}`)
tech-stack:
  added: []
  patterns:
    - "una regola temporale si esporta come funzione, non come costante, o i chiamanti ricreano il fallback"
key-files:
  created: []
  modified:
    - src/utils/datetime.ts
    - src/app/(admin)/admin/events/actions.ts
decisions:
  - "D-37-06 implementata: 25 ore, non 24 — su Hobby due corse consecutive del cron possono distare 24h59m, quindi una finestra di 24 ore non contiene garantitamente una corsa"
  - "Esportata la FUNZIONE oltre alla costante: la sola costante lascerebbe due `?? DEFAULT` in due file, cioe' due siti dove divergere"
  - "Due rifiuti distinti invece di uno: «non e' un intero» e «e' sotto il minimo» sono errori diversi (meta-gates.md, zero fallimenti silenziosi)"
  - "Il rifiuto del form resta un Error lanciato — e' un percorso di form gia' esistente. Il percorso nuovo di rivelazione NON eredita questa forma: li' il rifiuto e' un valore di ritorno (37-10)"
  - "Task 3 (checkpoint) chiuso come `nessuna riga`: la lettura in sola lettura ha trovato zero serate con finestra esplicita sotto 25"
metrics:
  duration: ~8 min
  tasks: 3
  commits: 2
  files-created: 0
  files-modified: 2
  completed: 2026-08-10
---

# Phase 37 Plan 04: La finestra minima di 25 ore, in un posto solo — Summary

## Cosa esiste adesso che prima non c'era

`DEFAULT_VENUE_REVEAL_HOURS = 25` e `venueRevealHours(stored)` vivono in
`src/utils/datetime.ts`, e `validateEventData` in
`src/app/(admin)/admin/events/actions.ts` **importa** la costante invece di
riscriverla. Fino a ieri si poteva salvare una finestra di **un'ora**
(`hours < 1`, riga 419).

Perche' 25 e non 24 sta scritto **accanto alla costante**, non solo qui: piano
Hobby, cron `0 6 * * *` UTC con precisione ±59 minuti, quindi due corse
consecutive possono distare **24h59m**. Una finestra di 24 ore non contiene
garantitamente una corsa; 25 si', con **un minuto di margine**. Il margine e'
sottile, ed e' esattamente per questo che l'aritmetica sta nel docblock —
altrimenti qualcuno lo arrotonda a 24 e il numero torna a essere arbitrario.

## L'allargamento della guardia monotona, dichiarato

`venue_reveal_sent` e' un interruttore a senso unico: `meta-gates.md` vuole che
una modifica lo renda solo **piu' difficile** da far scattare, salvo
autorizzazione esplicita **documentata nel commit**.

Questa lo rende **piu' facile di un'ora**: ogni serata con `venue_reveal_hours`
a `NULL` oggi rivela a T−24h, e rivelera' a T−25h. E' autorizzata da D-37-06
punto 3 (decisione del proprietario, 2026-08-10), ed e' scritta per esteso nel
messaggio di `85fe11f` — non e' passata di nascosto.

**L'effetto non e' ancora in vigore.** I due `?? 24` di
`(public)/events/[slug]/page.tsx:112` e `api/cron/venue-reveal/route.ts:43` sono
ancora li'; li instradano 37-06 e 37-09. Fino ad allora il default effettivo
resta 24, e **la costante e' un'affermazione che nessuno legge**. E' la cosa da
verificare a fine fase.

## La terza casa del numero, che non e' eliminabile

Postgres non importa TypeScript. `coalesce(ep.venue_reveal_hours, 25)` dentro
`public.venue_for_parties` (migration di 37-02) **resta**, ed e' un secondo
posto dove il 25 e' scritto a mano. Cambiarne uno senza l'altro **non fallisce
rumorosamente**: sposta una finestra, in un repo senza test runner. Dichiarato
nel commit invece che lasciato da scoprire.

## Task 3 — il checkpoint, e come e' stato chiuso

D-37-06 punto 4 vieta un `UPDATE` di sanatoria: le serate gia' sotto le 25 ore
si **elencano** e si portano al proprietario una per una, perche' portare una
serata da 6 a 25 sposta la sua rivelazione **diciannove ore prima**.

La lettura, in sola lettura, con la service key — **nessun `UPDATE`, `INSERT`,
`DELETE` o `db push`**:

| Lettura | Righe |
|---|---|
| Finestra esplicita sotto 25 (`IS NOT NULL AND < 25`) | **0** |
| Serate segrete con finestra a `NULL` (anticipano di un'ora esatta) | 1 |
| Serate segrete in tutto | 2 |

**Uno zero da un filtro e' indistinguibile da un filtro rotto**, quindi lo zero
e' stato verificato da una seconda direzione: la stessa popolazione riletta
**senza** il predicato e confrontata in JS. Su 3 serate totali una sola porta
una finestra esplicita, e vale **48 ore** — sopra il minimo, non sotto. Un
controllo di forma sul filtro (`lt.100000`) restituisce quella stessa riga,
quindi il `lt` funziona.

**Esito: `nessuna riga`.** La decisione che il checkpoint riservava al
proprietario era *quali serate spostare*; non ce n'e' nessuna, quindi le tre
opzioni del piano sono lo stesso no-op. Conseguenza pratica: **il pavimento
nuovo non rifiutera' nessuna serata esistente** al prossimo salvataggio del
form.

Nessun id, nessuna data, nessuno slug e nessun nome di sede sono finiti in
questo file: solo conteggi e una durata. Il repo e' pubblico.

## Deviazioni dal piano

### 1. [scoperta, assegnata altrove] `EventForm.tsx` promette il numero sbagliato

`src/components/events/EventForm.tsx:1097-1098` ha `placeholder="24 (default)"`
e `min={1}`. Il primo annuncia una finestra che il sistema non applichera' piu';
il secondo lascia digitare 6 al browser e fa scoprire il rifiuto solo al
salvataggio. E' la stessa divergenza di D-37-06 punto 5, sul lato **staff**
invece che pubblico.

Non e' nei `files_modified` di questo piano ed e' un componente condiviso che
altre onde possono avere in mano: toccarlo da qui avrebbe rischiato una
collisione. **Assegnato a 37-07**, che chiude gia' il gemello pubblico
(`SecretVenueDialog`).

### 2. [riferimento in avanti] il docblock nomina un file di un altro piano

Il docblock cita
`supabase/migrations/20260810161000_venues_read_narrowed.sql`, deliverable di
37-02, che non esisteva nel worktree di questo piano. Dopo il merge dell'onda 1
**il file esiste con quel nome esatto** — riferimento verificato, nessuna
correzione necessaria.

## Verifica — e cosa significa in un repo senza test runner

| Cosa | Comando | Esito |
|---|---|---|
| Tipi e build dopo il Task 1 | `npm run build` | exit 0 |
| Tipi e build dopo il Task 2 | `npm run build` | exit 0 |
| Build dopo il merge dell'onda 1 | `npm run build` | exit 0 |
| L'elenco del Task 3 | due `GET` in sola lettura + controllo incrociato senza predicato | 0 righe |

`npm run build` e' anche il typecheck. **Non esiste un test runner per il
prodotto:** niente qui e' verificato perche' «i test passano».

### Cosa NON e' verificato

- **Il rifiuto del form non e' stato visto scattare.** Prova manuale da
  eseguire prima della chiusura di fase: form di una serata con venue segreto,
  finestra a 6, salva → il rifiuto compare **e nomina la causa**. `human_needed`.
- **Il 25 non e' ancora in vigore** su nessuno dei due percorsi di rivelazione
  (vedi sopra). Finche' 37-06 e 37-09 non instradano i loro `?? 24`, il
  comportamento osservabile e' invariato.

## Note di sicurezza

Un pavimento di validazione e' una guardia lato server dentro `validateEventData`,
non un attributo del form: il `min={1}` di `EventForm.tsx` e' UX, non un
controllo. Il controllo vero e' quello che questo piano ha alzato.

### Threat Flags

Nessuno nuovo. Il rifiuto lanciato come `Error` resta il percorso di form
esistente, e non tocca `event_parties` — quindi non e' il caso di
`postgrest-details-leaks-the-row.md`.

## Known Stubs

Nessuno.

## Self-Check: PASSED
