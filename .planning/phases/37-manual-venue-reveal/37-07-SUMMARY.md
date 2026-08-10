---
phase: 37-manual-venue-reveal
plan: 07
subsystem: venue-reveal-surfaces
tags: [venue-secrecy, checkin-offline, nextjs-architecture, cache, service-worker, time-and-scheduling]

requires:
  - phase: 37-manual-venue-reveal
    provides: "37-04 — DEFAULT_VENUE_REVEAL_HOURS e venueRevealHours(stored), la casa unica del numero"
  - phase: 37-manual-venue-reveal
    provides: "37-06 — la finestra gia' risolta nella prop del dialogo, e il predicato a tre livelli"
provides:
  - "Un tipo che non ammette piu' il caso mancante: revealHours: number, senza ramo else"
  - "Il testo del dialogo riscritto sui tre livelli, senza promessa di mail"
  - "La regola NetworkOnly su /events/, dentro doorRuntimeCaching e prima di defaultCache"
  - "Il costo offline dichiarato accanto alla regola e nel commit (T-37-27, ACCEPT)"
  - "Il form di staff annuncia la finestra effettiva e nomina la causa del rifiuto"
affects: [37-13]

tech-stack:
  added: []
  patterns:
    - "Uno stato cattivo si rende non rappresentabile nel tipo, invece di gestirlo con un ramo"
    - "Un conflitto fra due gate si risolve verso il piu' restrittivo e si scrive nel commit"
    - "Il testo d'aiuto di un campo nomina la causa con le stesse parole del rifiuto server-side"

key-files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/SecretVenueDialog.tsx
    - src/app/sw.ts
    - src/components/events/EventForm.tsx

key-decisions:
  - "Il tipo passa a `number` invece di gestire il null: senza il caso, non c'e' il terzo `?? 25`"
  - "Il bullet del livello 1 e' condizionale e non una coppia ordinata, perche' biglietto e RSVP non sono simmetrici (D-37-10)"
  - "Il testo dichiara che la mail segue la pagina, invece di tacere: il silenzio lascerebbe qualcuno ad aspettare la casella di posta"
  - "La regola di cache copre anche /events/<slug>/menu, ed e' voluto: una copia vecchia di prezzi e orario di chiusura e' un rischio per conto suo"
  - "Corretti DUE campi del form, non uno: il piano ne nominava uno solo, ma il gemello portava identica la stessa promessa falsa"

requirements-completed: [VENUE-01]

metrics:
  duration: ~35min
  tasks: 3
  commits: 3
  files-created: 0
  files-modified: 3
  completed: 2026-08-10
---

# Fase 37 Piano 07: le due promesse false, e la copia che attraversa l'istante — Summary

**Il dialogo dell'indizio non promette piu' un biglietto a chi non ne ha bisogno ne' una finestra che il sistema non applica, il dettaglio della serata esce da tutte e tre le cache di pagina al prezzo dichiarato di non aprirsi piu' senza rete, e il form di staff smette di annunciare un numero che il server rifiuta.**

## Perche' erano difetti e non imprecisioni

Le due cose che questo piano toglie erano **testo scritto in pagina che il sistema non mantiene**. Non e' una sfumatura di prosa: chi legge «compra un biglietto per sbloccare subito» compra, e chi legge una frase vaga sul «piu' vicino alla serata» non sa se tornare fra un'ora o fra un giorno. In un dominio dove l'unico rimedio a un errore e' non commetterlo, la prosa attorno all'indizio e' parte del meccanismo, non decorazione.

| Promessa di ieri | Perche' era falsa oggi |
|---|---|
| «N ore prima» **solo se la colonna aveva un valore** | con `NULL` il sistema applica comunque il fallback, e la pagina invece diventava vaga |
| «Compra un biglietto per sbloccare subito» come **unica strada** | dal livello 2 un membro approvato vede l'indirizzo alla finestra **senza comprare nulla** (D-37-02) |
| Il form: «24 (default)» e `min={1}` | il default effettivo e' 25 e il server rifiuta tutto quello che sta sotto |

## Task 1 — il dialogo

### Il tipo, che e' la parte che conta

`revealHours` passa da `number | null` a **`number`**. Il valore arriva gia' risolto dal server (`venueRevealHours(...)` al sito di chiamata, 37-06), quindi il caso mancante **non esiste piu' quando questo codice gira**.

Stringere il tipo non e' cosmetica: e' cio' che rende strutturale la correzione. Con `number` non c'e' un ramo `else` da scrivere e non c'e' un secondo fallback da aggiungere — il componente client **non puo' piu' esprimere il caso**, quindi non puo' divergere dal server la prossima volta che qualcuno lo tocca. E' T-37-29, e la forma e' quella preferita dal piano: rendere impossibile lo stato cattivo invece di gestirlo.

Il numero resta in **un posto solo**, `DEFAULT_VENUE_REVEAL_HOURS` in `src/utils/datetime.ts`. Una copia qui sarebbe stata la terza.

### Il testo, e l'asimmetria che ha una forma strana per una ragione

L'elenco descrive ora i tre livelli. Il bullet del livello 1 e' **condizionale invece che una coppia ordinata**, e non e' pigrizia di scrittura: biglietto e RSVP **non sono simmetrici**.

- Il biglietto sblocca subito **solo se** la serata ha `venue_reveal_on_purchase` attivo.
- L'RSVP sblocca **comunque**, fuori da quel flag (D-37-10) — perche' un RSVP non e' un acquisto, e il cron manda l'indirizzo a chi ha un RSVP senza consultare il flag.

Quindi con il flag spento il testo dice esplicitamente che su quella serata **il biglietto da solo non basta**, invece di lasciarlo dedurre. Il livello 2 e' un bullet a se': *buy nothing at all* — l'allargamento della fase, scritto come tale.

### Nessuna promessa di mail, e il silenzio non bastava

D-37-05: la mail e' una **notifica**, non la rivelazione. La pagina apre all'istante della finestra; la mail parte alla prima corsa utile di un cron giornaliero; le due cose possono distare ore.

Tacere sarebbe stato conforme alla lettera e insufficiente nei fatti: chi ha in testa «arrivera' una mail» resta ad aspettare la casella di posta mentre la pagina e' gia' aperta. Il testo lo dice in una riga — l'indirizzo apre sulla pagina, un'eventuale mail **segue** e puo' arrivare ore dopo — che e' l'unica formulazione vera per costruzione.

L'indizio non e' toccato, e la prosa attorno non lo restringe: `venue-secrecy.md`, gate *indizio non equivalente all'indirizzo*, vale anche per le didascalie.

## Task 2 — la cache, e il conflitto che va dichiarato

La regola nuova entra **dentro `doorRuntimeCaching`**, quindi nell'array che `sw.ts:60` compone **prima** di `defaultCache`. L'ordine e' load-bearing e il file lo diceva gia': Serwist prende la prima regola che matcha.

```
matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/events/"),
handler: new NetworkOnly(),
```

Il match e' sul **percorso** e non sul `Content-Type`, come le quattro regole della porta: le tre forme in cui questa pagina viene messa in cache — documento HTML, payload RSC, prefetch RSC — differiscono per header e query, **non per pathname**. Un filtro sul tipo ne avrebbe presa una e lasciate due.

### Il conflitto fra due gate, risolto e scritto

`meta-gates.md` chiede che un conflitto si risolva verso il **piu' restrittivo** e che si documenti **nel commit**. Fatto in `0c096cb`, e ripetuto qui perche' non e' un dettaglio implementativo:

| Gate | Cosa vuole | Perche' |
|---|---|---|
| `checkin-offline.md` | il default e' **ammettere**, e le cose funzionano senza rete | alla porta l'errore e' recuperabile: un doppio ingresso si nota, un ospite valido rifiutato succede davanti a una fila |
| `venue-secrecy.md` | il default e' **chiuso**, e non si serve una copia di stato incerto | qui l'errore non e' recuperabile: un indirizzo mostrato una volta e' pubblicato |

**Vince il secondo, e il costo e' concreto: senza rete la pagina della serata non si apre piu' affatto.** Non stale — proprio non si apre. E' T-37-27, disposizione **ACCEPT**, dichiarata accanto alla regola e nel commit invece che scoperta da qualcuno in metropolitana.

La porta **non e' toccata**: la sua cache offline e' IndexedDB (`src/lib/offline/`), non sta sotto `/events/`, e le quattro regole preesistenti sono invariate — verificabile meccanicamente, il diff di `sw.ts` e' **65 righe inserite e zero rimosse**.

**Collaterale voluto:** `/events/<slug>/menu` sta sotto lo stesso prefisso e perde anch'esso la copia. Mostra prezzi e orario di chiusura del menu, dove una copia vecchia di un giorno e' un rischio per conto suo — non e' un effetto da ritagliare via.

### Cosa la regola NON fa, e cosa ne discende per il 37-13

Non svuota nulla. Le voci gia' in Cache Storage sui dispositivi che hanno aperto la pagina **prima del deploy** sopravvivono fino alla scadenza (24 h) o alla sovrascrittura. `skipWaiting` e `clientsClaim` aggiornano il **worker** alla prima visita, non le **voci**.

> **Conseguenza operativa per il piano 37-13: la prima misura di cache si prende in finestra privata, o si misura il worker vecchio** e si riporta un risultato su codice che non gira piu'.

## Task 3 — il gemello lato staff

`placeholder` e `min` sono costruiti da `DEFAULT_VENUE_REVEAL_HOURS`, importata da `@/utils/datetime`. Non un 25 scritto a mano: sarebbe stato il **quarto** posto dove quel numero vive, e la fase esiste per chiudere quella deriva. Prova meccanica: `grep -c "25"` sul file **resta 0**, come prima della modifica.

**`min` resta UX, non un controllo**, e va detto perche' e' il modo in cui questa modifica verrebbe fraintesa: l'attributo ferma uno spinner, non una richiesta. Il pavimento vero e' server-side in `validateEventData` e li' resta. Lo scopo qui e' che il rifiuto **si veda prima del salvataggio**, non che il browser garantisca alcunche'.

Il testo d'aiuto nomina ora **la causa** con le stesse parole del rifiuto lato server: sotto le 25 ore la mail dell'indirizzo puo' partire **dopo** l'inizio della serata, perche' il cron gira una volta al giorno. Due spiegazioni diverse dello stesso no sarebbero peggio di una sola imprecisa.

## Task Commits

1. **Il dialogo dice la finestra vera e i tre livelli** — `2b5651f` (fix)
2. **La pagina della serata esce dalle tre cache di pagina** — `0c096cb` (feat)
3. **Il gemello lato staff — il form annunciava ancora 24** — `1b04ab7` (fix)

## Deviazioni dal piano

### 1. [Rule 2 — promessa non mantenuta] I campi della finestra nel form sono DUE, non uno

Il piano nominava `EventForm.tsx:1097-1098`, il campo delle sotto-serate. Ce n'e' un secondo, quello della serata singola, che portava `placeholder="24"` e `min={1}`, alimenta **lo stesso `validateEventData`** ed esprimeva identica la stessa promessa falsa.

Corretto anch'esso. Correggerne uno solo avrebbe soddisfatto il `grep` del criterio di accettazione — la stringa cercata era `24 (default)`, che sta solo sul primo — e mancato la verita' che il piano dichiara nei propri `must_haves`. **Un criterio meccanico si soddisfa facendo la cosa giusta, non trovando la riga che il criterio guarda.**

### 2. [correzione di forma] La prosa che vieta una stringa non puo' contenerla

Il criterio chiedeva `grep -c "closer to the event"` a zero, e il docblock che spiega **perche'** quella frase e' sparita la citava per spiegarla — insieme a un `?? 25` di esempio, anch'esso vietato dal criterio. E' lo stesso inciampo registrato in `37-02-SUMMARY.md` e `37-06-SUMMARY.md`, alla terza occorrenza dentro la stessa fase.

Riformulata la prosa. **Il controllo non e' stato indebolito**: si cambiano le parole, mai il grep. Vale la pena registrare che il pattern si e' ripetuto tre volte: un criterio scritto come «questa stringa non compare nel file» collide sistematicamente con l'abitudine di questo progetto di spiegare accanto al codice cosa e' stato tolto e perche'.

### 3. [costo dichiarato, non riparato] La regola di cache prende anche la pagina del menu

`/events/<slug>/menu` cade sotto il prefisso. Il piano non lo nomina. Non e' stato escluso — il menu mostra prezzi e orario di chiusura, e una copia stale li' e' il difetto che lo stesso gate vieta — ma **e' un secondo costo offline che il piano non aveva messo in conto**, e sta scritto accanto alla regola invece che essere scoperto da chi ordina da bere.

**Totale: 3 deviazioni. Nessuna allarga l'accesso a un indirizzo. Nessun file fuori dai `files_modified`, nessuna scrittura su database vivo, nessuna migration applicata.**

## Verifica — e cosa significa in un repo senza test runner

> **Non esiste un test runner per il prodotto.** Niente qui e' verificato perche' «i test passano». `npm run build` **e' anche il typecheck**, e nient'altro.

| Controllo | Esito |
|---|---|
| `npm run build` dopo ogni task, e finale | **exit 0**, `Compiled successfully` |
| `/events/[slug]` nella tabella delle rotte | **`ƒ (Dynamic)`**, invariato |
| `grep -c "closer to the event"` in `SecretVenueDialog.tsx` | **0** |
| `?? 25` / `?? 24` in `SecretVenueDialog.tsx` | **assenti** |
| tipo della prop | `revealHours: number`, nessun `\| null`, nessun ramo `else` |
| diff di `src/app/sw.ts` | **65 inserite, 0 rimosse** — le quattro regole della porta byte-invariate |
| la regola nell'array | dentro `doorRuntimeCaching`, quindi **prima** di `defaultCache` a `:60` |
| `/events/` nel bundle prodotto (`public/sw.js`) | **presente** — la regola sopravvive al bundling |
| `grep -c "24 (default)"` in `EventForm.tsx` | **0** |
| `grep -c "25"` in `EventForm.tsx` | **0**, invariato rispetto a prima |
| `min={1}` rimasti in `EventForm.tsx` | solo su numero di serata e capienza, **nessuno sulla finestra** |
| file toccati | **esattamente i tre** dei `files_modified` |

### Cosa NON e' verificato, e va detto invece che evocato

- **Un build non vede un bug di cache.** Il verde qui dice che il service worker si costruisce, non che la copia non venga servita. **La prova appartiene al piano 37-13** ed e' una doppia lettura dichiarata: la stessa pagina in **finestra privata** (worker pulito) e in una finestra che l'ha gia' visitata, **prima e dopo** l'istante. Raccogliere un verde di build e chiamarlo prova di cache sarebbe raccogliere un verde che non significa quello che sembra.
- **Il dialogo non e' stato osservato su una pagina vera.** `human_needed`: aprire una serata segreta con `venue_reveal_hours` a `NULL` e verificare che il dialogo scriva **25 hours**, e che l'elenco nomini l'RSVP e il caso «membro approvato senza biglietto».
- **Il form non e' stato osservato.** `human_needed`: aprire il form di una serata con venue segreto e verificare che il campo annunci **25** e non lasci inviare **6**. Vale su **entrambi** i campi — serata singola e sotto-serate.
- **Il costo offline non e' stato misurato a rete spenta.** E' una conseguenza diretta di `NetworkOnly`, non un'ipotesi, ma nessuno ha ancora aperto la pagina in aereo.
- **Nessun error tracking esiste.** Nessuno dei percorsi toccati aggiunge un `catch`, quindi non peggiora — ma vale la nota di sempre: se qualcosa fallisce in produzione, non lo sa nessuno finche' non se ne nota l'effetto.

## Note di sicurezza

| Threat | Esito |
|---|---|
| **T-37-26** — copia in Cache Storage servita dopo l'istante di rivelazione | **mitigato**: `NetworkOnly` su `/events/`, prima di `defaultCache`. Con l'avvertenza che le voci gia' presenti sopravvivono fino a 24 h |
| **T-37-27** — la stessa regola rende la pagina inutilizzabile senza rete | **ACCEPT**: costo dichiarato accanto alla regola e nel commit, con il conflitto fra i due gate scritto per esteso |
| **T-37-28** — il dialogo promette una condizione di sblocco non piu' vera | **mitigato**: testo riscritto sui tre livelli, nessuna promessa di mail |
| **T-37-29** — un terzo fallback della finestra lato client | **mitigato**: il tipo e' `number`, il caso non e' rappresentabile |
| **T-37-30** — il form annuncia 24 e accetta `min={1}` | **mitigato su entrambi i campi**; il controllo resta server-side in `validateEventData` |
| **T-37-SC** — installazioni di pacchetti | nessun pacchetto nuovo, nessun `npm install` |

### Threat Flags

Nessuna superficie nuova. La regola di cache **restringe** una superficie esistente; il dialogo non mostra nulla che non mostrasse gia'; il form non cambia cosa il server accetta.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- `src/app/(public)/events/[slug]/SecretVenueDialog.tsx` — modificato, presente
- `src/app/sw.ts` — modificato, presente
- `src/components/events/EventForm.tsx` — modificato, presente
- commit `2b5651f` — presente
- commit `0c096cb` — presente
- commit `1b04ab7` — presente
- `STATE.md` e `ROADMAP.md` — **non toccati**, come richiesto all'esecutore in worktree
- nessun file sotto `.claude/`, nessuna modifica a `CLAUDE.md` — il piano 37-09 li ha in mano in parallelo
- nessuna scrittura su database vivo, nessuna migration applicata, nessun `db push`
- nessun indirizzo, nome di sede, id di serata o data non annunciata in questo file

---
*Phase: 37-manual-venue-reveal*
*Completed: 2026-08-10*
