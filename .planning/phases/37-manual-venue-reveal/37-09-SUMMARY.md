---
phase: 37-manual-venue-reveal
plan: 09
subsystem: venue-reveal-core
tags: [venue-secrecy, cron, resend, monotone-guard, shared-module, persona-routing, D9]
requires:
  - phase: 37-03
    provides: "`venue_revealed_at` applicato in produzione — senza un istante memorizzato, «chi c'era al momento della rivelazione» non e' esprimibile"
  - phase: 37-04
    provides: "`venueRevealHours(stored)` in `src/utils/datetime.ts` — la finestra in un posto solo"
  - phase: 37-06
    provides: "l'altro `?? 24` gia' instradato, e la misura del context budget che ha lasciato 957 token di margine"
provides:
  - "`src/lib/venue-reveal/reveal-party-venue.ts` — l'unico posto del repo che spedisce l'indirizzo di una serata"
  - "`revealPartyVenue(client, party, opts?)` con tre numeri e una categoria di fallimento"
  - "`countVenueRevealRecipients(client, party, opts?)` — il numero della conferma, dallo stesso Map di chi spedisce"
  - "il cron come rete sotto il percorso manuale: completa invece di saltare (D-37-21)"
  - "il limite `createdBefore`, che risolve la tensione fra D-37-21 e D-37-08"
  - "la marcatura per lotto, che rende «N su M» un fatto nei dati"
  - "D9 chiuso: la guardia monotona non si alza piu' su una serata senza destinatari"
  - "`venue-secrecy.md` che si carica su `src/lib/venue-reveal/**`"
affects:
  - "37-10 — la server action manuale chiama `revealPartyVenue` e deve gestire `recipients_unavailable`, che non era nell'interfaccia dichiarata"
  - "37-11 — la superficie che mostra il numero legge `countVenueRevealRecipients`, non un secondo conteggio"
  - "37-13 — la verifica umana: che il cron completi davvero una serata rivelata a mano non e' provato qui"
tech-stack:
  added: []
  patterns:
    - "un modulo, due chiamanti: il cuore di un atto irreversibile ha una implementazione sola, o i due percorsi mostrano due numeri diversi per lo stesso atto"
    - "un esito parziale torna come VALORE tipizzato; il log resta in aggiunta, mai al suo posto — non esiste error tracking"
    - "una guardia monotona si alza su un effetto misurato, mai su un ciclo completato"
key-files:
  created:
    - src/lib/venue-reveal/reveal-party-venue.ts
  modified:
    - src/app/api/cron/venue-reveal/route.ts
    - .claude/rules/venue-secrecy.md
    - .claude/rules/meta-gates.md
    - CLAUDE.md
    - .claude/CHANGELOG.md
key-decisions:
  - "La tensione D-37-21 / D-37-08 risolta con L1: il braccio di completamento raggiunge solo chi esisteva a `venue_revealed_at`. Chi compra dopo la rivelazione la vede in pagina, senza mail"
  - "Aggiunto `failureKind: \"recipients_unavailable\"` all'unione dichiarata dal piano: una lettura fallita non e' una serata senza aventi titolo, e collassarle riproduceva D9 su un altro asse"
  - "La marcatura sta subito DOPO il `try` dell'invio e non dentro, in un `try` suo: dentro, un throw del database avrebbe riportato come falliti cinquanta invii gia' partiti"
  - "`resend.batch.send` non lancia su errore API — verificato su `resend@6.9.2`. Il conteggio ottimista precedente contava come consegnato un lotto rifiutato"
  - "`(public)/tickets/[id]/page.tsx` mostra l'indirizzo e il gate non vi si carica: DICHIARATO nel gate invece che allargato, perche' un secondo glob era fuori dal perimetro del piano"
  - "152 dei 957 token di margine spesi, e sono regola non descrizione: nessuna prosa tagliata altrove per far quadrare il numero"
patterns-established:
  - "Pattern: l'esito di un atto irreversibile e' un valore tipizzato con tre numeri e una categoria, mai un booleano e un log"
  - "Pattern: la marcatura del progresso e' per lotto, dentro l'unita' che e' andata a buon fine — `ticketing-payments.md`, gate cron non atomico"
  - "Pattern: quando il codice si sposta, i `paths:` della persona si spostano NELLO STESSO COMMIT e il budget si rimisura"
requirements-completed: [VENUE-01, VENUE-02]
duration: ~50min
completed: 2026-08-10
---

# Phase 37 Plan 09: Il cuore della rivelazione in un modulo, e il cron che completa — Summary

**L'indirizzo di una serata esce ora da un posto solo — `src/lib/venue-reveal/reveal-party-venue.ts` — e il cron programmato e' diventato la rete sotto il percorso manuale: completa chi manca invece di saltare la serata, e non alza piu' una guardia a senso unico su un invio che non e' avvenuto.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3 su 3
- **Files created:** 1
- **Files modified:** 5
- **Commits:** 3

## Cosa esiste adesso che prima non c'era

### Un cuore, due chiamanti

`revealPartyVenue(client, party, opts?)` porta dentro, **senza riscriverle**, le
tre query dei destinatari — biglietti della serata, RSVP della serata, e il
**master ticket d'evento con `party_id IS NULL`**, che e' la parte che una
riscrittura da zero avrebbe dimenticato — piu' la `Map<email, …>` intatta e i
lotti da 100.

Perche' non due copie: il numero che la conferma di D-37-16 mette davanti a chi
sta per premere e' `emailMap.size`. Due implementazioni della deduplicazione
sono **due numeri diversi per lo stesso atto irreversibile**.

Perche' un modulo e non un export di `actions.ts`: un file `"use server"`
pubblica **ogni** export come endpoint, e `countVenueRevealRecipients` esportato
di li' sarebbe un oracolo che risponde *«quante persone riceverebbero l'indirizzo
di questa serata»* a chiunque lo chiami. E' l'argomento di
`src/lib/media/may-upload.ts:28-34`, l'unico precedente del repo — con una
differenza che ho scritto nel docblock invece di lasciarla dedurre: **quello e'
un predicato, questo e' un esecutore con un effetto esterno irreversibile.**
L'argomento per una definizione sola e' quindi piu' forte, non piu' debole.

### La marcatura racconta cosa e' successo davvero

Prima la marcatura usava `entries`, cioe' **tutti** i destinatari,
indipendentemente da quali lotti fossero partiti. «20 su 50» non era
rappresentabile: i 30 mancanti risultavano gia' inviati, e un bottone «manda ai
N che mancano» non avrebbe trovato nessuno.

Ora ogni lotto marca **solo i propri** `ticketIds` e `rsvpIds`, e solo dopo che
Resend lo ha accettato. Un lotto caduto non marca nulla, e i suoi destinatari
restano richiamabili.

### Il cron completa, invece di saltare

Il filtro di serata sulla guardia gia' alzata e' stato tolto (D-37-21). Cio' che
tiene il cron idempotente **non e' mai stato quel filtro**: sta tre livelli
sotto — il filtro per destinatario dentro il modulo, la mappa vuota che non
spedisce, e il limite superiore della finestra che esclude le serate iniziate da
piu' di 24 ore. Era un'ottimizzazione, non una garanzia.

### La finestra di 25 ore entra in vigore

`venueRevealHours(p.venue_reveal_hours)` sostituisce il fallback riscritto sul
posto. Era **l'ultimo dei due siti gemelli**: 37-06 aveva instradato la pagina,
e fino a ora la costante del piano 37-04 era un'affermazione che nessuno
leggeva. **Allargamento di una guardia monotona, gia' autorizzato** da D-37-06
punto 3: ogni serata con `venue_reveal_hours` a NULL rivelava a T−24h e ora
rivela a T−25h.

## La tensione D-37-21 / D-37-08, e come e' risolta

Togliendo il filtro, una serata gia' rivelata viene ri-scandita ogni notte. Un
biglietto **acquistato dopo la rivelazione** nasce `venue_reveal_sent = false`:
la corsa successiva gli manderebbe la mail. Sarebbe **un percorso di mail nuovo
nato come effetto collaterale di un cambio di filtro** — e quel percorso, la
mail all'acquisto, e' dichiarato differito.

**Regola implementata (L1 della ricerca), scritta nel codice e qui:** quando
`event_parties.venue_revealed_at` non e' nullo, le tre query dei destinatari
accettano `.lte("created_at", venue_revealed_at)`. Il braccio di completamento
raggiunge **solo chi esisteva all'istante in cui qualcuno ha premuto**. Quando
e' nullo — la corsa programmata ordinaria, nessuno ha premuto — non c'e' alcun
limite, che e' il comportamento di oggi e quello che VENUE-01 chiede di
conservare.

**Criterio di accettazione, verificabile senza test runner:** su una serata con
`venue_revealed_at` valorizzato, un biglietto il cui `created_at` e' successivo
a quell'istante non compare fra i destinatari di nessuna corsa successiva — e la
persona vede comunque l'indirizzo in pagina, che e' cio' che D-37-08 promette.

**Un dettaglio del verso, dichiarato:** `tickets.created_at` e `rsvps.created_at`
sono nullable con `default now()`. Una riga con `created_at` NULL viene
**esclusa** dal limite, non inclusa: meno mail, non piu'. E' la direzione sicura
in questo dominio.

## D9 chiuso, e come

`36-13-SUMMARY.md:408-416` lo aveva registrato e deliberatamente non riparato:
il cron non filtra su `is_published`, e su una serata senza destinatari alzava
comunque `venue_reveal_email_sent = true`. Una bozza rimasta non pubblicata
**dentro** la propria finestra usciva dal cron con la guardia gia' alzata:
pubblicata dopo e venduta, **la mail dell'indirizzo non sarebbe mai partita**,
senza un errore e senza che nessuno lo sapesse.

Due modifiche lo chiudono insieme: la serata resta nell'insieme scandito
(D-37-21), e la guardia si alza **solo se almeno un invio e' riuscito**. Il
residuo — una serata iniziata da piu' di 24 ore — e' fuori finestra, dove una
mail non aiuta comunque.

**La condizione puo' solo rendere la guardia piu' difficile da alzare**, che e'
la direzione che `meta-gates.md` consente senza autorizzazione. Un invio
**parziale** la alza comunque: l'indirizzo e' uscito e non rientra (D-37-12), e
i mancanti restano raggiungibili dalla propria riga.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `resend.batch.send` non lancia su errore API**

- **Found during:** Task 1, verificando la firma alla fonte invece che a memoria
- **Issue:** `batch.send()` risolve a `{ data, error }` (`resend@6.9.2`,
  `node_modules/resend/dist/index.d.mts:73-86`), non lancia. Il codice
  precedente avvolgeva la chiamata in un `try/catch` e poi faceva
  `totalSent += emails.length`: **un lotto rifiutato per rate limit o dominio
  non verificato veniva contato come consegnato.**
- **Fix:** controllati entrambi i rami; nessun destinatario conta come raggiunto
  se l'indirizzo non e' partito davvero
- **Commit:** `9bf7797`

**2. [Rule 2 — Missing critical] Le tre query scartavano l'errore**

- **Found during:** Task 1
- **Issue:** `const { data } = await …` rendeva una lettura fallita
  indistinguibile da «nessun avente titolo». Il chiamante avrebbe registrato la
  serata come fatta e la mail non sarebbe mai partita — **D9 su un altro asse**.
  `venue-secrecy.md`, gate *default chiuso*: uno stato non determinabile non e'
  uno stato vuoto.
- **Fix:** `failureKind: "recipients_unavailable"`, **quinto membro** di
  un'unione che il piano ne dichiarava quattro. Aggiunta additiva e documentata
  nel tipo, perche' 37-10 deve gestirla.
- **Commit:** `9bf7797`

**3. [Rule 1 — Bug] Il `render()` stava fuori dal `try`**

- **Found during:** Task 1
- **Issue:** un fallimento di rendering su un solo messaggio usciva dal ciclo e
  portava con se' **ogni serata successiva** della corsa
- **Fix:** spostato dentro; un fallimento di rendering e' il fallimento di quel
  lotto e di nient'altro
- **Commit:** `9bf7797`

**4. [Rule 2 — Missing critical] L'errore della query delle serate nel cron**

- **Found during:** Task 2
- **Issue:** scartato. Una lettura fallita rispondeva `{ sent: 0 }`, cioe' come
  una notte in cui non c'era nulla da fare
- **Fix:** categoria nel log e **500** invece di un 200 rassicurante
- **Commit:** `3232adf`

### Scostamenti deliberati da un criterio di accettazione

**5. La marcatura sta subito DOPO il `try` dell'invio, non dentro**

Il criterio diceva «dentro il blocco `try` dell'invio». Sta immediatamente dopo,
in un `try` proprio, e la differenza non e' stilistica: **dentro il `try`
dell'invio, una chiamata al database che lancia sarebbe stata catturata dal
`catch` dell'invio**, avrebbe lasciato `delivered` a `false` e riportato come
falliti cinquanta invii **le cui mail erano gia' partite** — l'indirizzo fuori,
il risultato che dice di no, e la corsa successiva che rispedisce. La sostanza
del criterio — per lotto, con gli id di quel lotto, mai da `entries` — e'
rispettata, e la ragione e' scritta accanto al codice.

**6. Il quinto membro dell'unione `failureKind`**

Il criterio chiede i **quattro campi** con i nomi dichiarati, e quelli ci sono
tutti. L'unione della categoria ha un membro in piu' per la ragione della
deviazione 2. Segnalato qui perche' 37-10 lo trovera'.

## Conflitto di gate, risolto e dichiarato

`venue-secrecy.md`, gate *idempotenza del cron*, chiede di marcare
`venue_reveal_sent` **«prima o insieme all'invio, mai solo dopo»**.

Marcare un lotto **subito dopo che quel lotto e' partito** e' «insieme» alla
granularita' del lotto, ed e' l'unica forma sotto cui un invio parziale si
distingue da uno intero. Il caso residuo — lotto partito, marcatura fallita —
produce una doppia mail alla corsa successiva, e **lo stesso gate dichiara la
priorita'**: *«un destinatario che non ha ricevuto l'indirizzo e' un problema
visibile, una doppia mail e' rumore»*. Registrato anche nel messaggio di
`9bf7797`, come `meta-gates.md` pretende per un conflitto fra gate.

## Il gate segue il codice — v1.10.0

Il cuore della rivelazione sarebbe nato **fuori dal raggio del proprio gate**:
nessun `paths:` copriva `src/lib/venue-reveal/**`. Un gate giusto agganciato al
path sbagliato e' indistinguibile da un gate assente, con l'aggravante che
sembra presidiato — ed e' gia' successo in questo repo fino alla v1.4.

Nello stesso commit che crea la directory: `paths:` allargati, indice di
`CLAUDE.md` allineato, riga nella tabella di priorita' di `meta-gates.md` con
`venue-secrecy` primario. **`npm run verify:persona`: 7/7 verdi**, controllo G
compreso.

Il gate *percorsi enumerati* e' stato **rifatto leggendo il codice** con `grep`
su `src/`, come il gate stesso pretende: entra il modulo condiviso, esce la
pagina pubblica di una sede (D-37-23), ed e' dichiarato che
`(public)/tickets/[id]/page.tsx` mostra l'indirizzo mentre nessun `paths:` di
questo modulo lo raggiunge.

### Context budget

Misurato, non stimato. Il caso peggiore **non ha cambiato file**.

| | prima (v1.9.0) | dopo (v1.10.0) |
|---|---|---|
| File peggiore | `src/app/(public)/events/EventTabs.tsx` | invariato |
| Byte | 39.756 | **40.302** |
| Token | 11.043 | **11.195** |
| Margine sul tetto di 12.000 | 957 | **805** |

152 token spesi, e sono **regola**: una lista di percorsi di fuga e una riga di
routing. Nessuna prosa e' stata tagliata altrove per far quadrare il numero —
sarebbe stato scambiare una perdita reale con un guadagno contabile. **805
restano per il piano 37-10.**

## Verification

- `npm run build` esce **0** dopo ogni task. **Non esiste un test runner per il
  prodotto**: il build e' anche il typecheck, e nessuna riga di questo piano e'
  «verificata perche' i test passano».
- `npm run verify:persona` **7/7 verdi** dopo il Task 3. Un verde dice che la
  persona e' **coerente**, non che i suoi gate sono corretti.
- Criteri meccanici del piano, tutti verificati: prima riga
  `import "server-only";`; la query del master ticket presente; nessun
  `error.details`; nessuna scrittura su `event_parties` dentro il modulo;
  nel cron zero occorrenze del filtro di serata e zero del fallback riscritto
  sul posto; `venue_revealed_at` nella `select`; `vercel.json` **non toccato**.

### Cosa NON e' provato qui — `human_needed`

**Che il cron completi davvero una serata rivelata a mano.** Richiede una serata
segreta con destinatari e una corsa reale: e' una scrittura in produzione su un
percorso **irreversibile**, e si raccoglie nel piano 37-13. Non e' stata
simulata, e non e' stata toccata la produzione: nessuna migration, nessun `db
push`, nessuna esecuzione del cron.

## Debito dichiarato

1. **`(public)/tickets/[id]/page.tsx` fuori dai `paths:` di `venue-secrecy`.**
   Mostra l'indirizzo. Allargarlo era un secondo glob fuori dal perimetro del
   piano; misurato, il costo sarebbe **nullo** (quel file caricherebbe lo stesso
   insieme di cinque moduli del caso peggiore attuale). Dichiarato dentro il
   gate stesso, con la data.
2. **`venue_reveal_on_purchase` e `venue_reveal_email_sent` non sono dichiarati
   in `src/types/database.ts`** pur esistendo sulla tabella. Lacuna precedente a
   questa fase, gia' registrata; il cron le legge attraverso un client non
   tipizzato, quindi il build non se ne accorge.
3. **Nessun filtro su `is_published` nel cron.** D9 e' chiuso dal lato della
   guardia, non da quello del filtro: una bozza dentro la propria finestra con
   destinatari veri riceverebbe la mail. Aggiungerlo restringerebbe chi riceve
   ed e' una decisione di prodotto, non un fix.

## Threat Flags

Nessuna superficie di sicurezza nuova fuori dal `<threat_model>` del piano. Il
modulo non aggiunge endpoint (non e' `"use server"`), non allarga alcuna
lettura, e il cron conserva la sola autenticazione `Bearer CRON_SECRET`.

## Commits

| Task | Commit | Cosa |
|---|---|---|
| 1 | `9bf7797` | il modulo condiviso, la marcatura per lotto, il limite `createdBefore` |
| 2 | `3232adf` | il cron completa invece di saltare, e chiude D9 |
| 3 | `8bed0b4` | il gate segue il codice — persona v1.10.0, budget rimisurato |

## Self-Check: PASSED

Tutti e sette i file dichiarati esistono su disco; tutti e tre i commit esistono
in `git log`. Nessuna cancellazione di file tracciati in nessuno dei tre commit.
