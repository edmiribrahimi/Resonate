---
phase: 37-manual-venue-reveal
plan: 15
subsystem: venue-reveal-core
tags: [venue-secrecy, resend, cron, observability, server-actions, typed-refusals, zero-silent-failures]

# Dependency graph
requires:
  - phase: 37-09
    provides: "il modulo condiviso che spedisce, la marcatura per lotto fuori dal `try` dell'invio, e `recipientsSent` mai ottimistico"
  - phase: 37-10
    provides: "i rifiuti tipizzati e il `Record` totale delle frasi — la forma che il Task 4 copia"
  - phase: 37-14
    provides: "il precedente della chiusura dei reperti del review, e il pattern «un rifiuto nuovo e' un membro dell'unione con la sua frase»"
provides:
  - "Il ripiego a invii singoli: un destinatario problematico blocca se stesso, non i novantanove accanto"
  - "`VenueRevealRetryOutlook` — un valore, non un messaggio, che dice se ripremere adesso puo' cambiare qualcosa"
  - "`REPORTABLE_FAILURE`: la lista dei riportabili come `Record` totale, non come condizione in linea"
  - "`no_recipients` fuori dai fallimenti del cron — `failures` vuota torna a significare «tutto e' partito»"
  - "`updateVenue` che rifiuta con un valore tipizzato invece che con un messaggio che Next redige"
  - "`EditVenueButton` senza «Something went wrong»: una frase per causa, da un `Record` totale"
affects:
  - "il prossimo piano che tocca il pannello della rivelazione — `retryOutlook` esiste e nessuna superficie lo legge (voce 9 di deferred-items)"
  - "la voce 5 di deferred-items: quando l'atto vero verra' compiuto, il ripiego sara' esercitato per la prima volta"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "L'unita' di ritentativo si restringe quando il provider valida all-or-nothing: si degrada una volta, non si cicla"
    - "Una classificazione di errori di un provider si legge dall'unione dichiarata dell'SDK, e la si partiziona per intero — cosi' un nome nuovo cade in `unknown` invece che in un lato scelto in silenzio"
    - "Un `Record` totale sull'unione al posto di una lista: la lista risponde per oggi, il `Record` costringe il prossimo membro a una decisione"
    - "Il confine che redige e' anche il confine dove un throw si converte in valore: dentro il processo il messaggio si puo' ancora leggere"

key-files:
  created: []
  modified:
    - "src/lib/venue-reveal/reveal-party-venue.ts"
    - "src/app/api/cron/venue-reveal/route.ts"
    - "src/app/(admin)/admin/venues/actions.ts"
    - "src/components/venues/EditVenueButton.tsx"
    - ".planning/phases/37-manual-venue-reveal/deferred-items.md"

key-decisions:
  - "D-37-30: il ripiego degrada UNA volta a invii singoli e non ritenta oltre — un singolo che fallisce da solo e' un fatto da riportare, e il conteggio dei mancanti e' gia' il posto dove viene riportato"
  - "D-37-31: nessuna costante di pacing nel ripiego. La funzione gira dentro un cron con un budget di orologio: dormire scambierebbe «qualche persona non raggiunta» con «la corsa muore e ogni serata successiva resta non raggiunta»"
  - "D-37-32: l'orizzonte di `retryOutlook` e' «ripremere adesso». E' cio' che rende decidibile la classificazione delle quote: il tempo le libera, un secondo clic no"
  - "D-37-33: l'aggregato di `retryOutlook` pende verso `may_help`. Fra dire «smetti di provare» a chi poteva ancora essere raggiunto e invitare un tentativo inutile, `venue-secrecy.md` ha gia' dichiarato quale delle due costa di piu'"
  - "D-37-34: i riportabili del cron sono un `Record` totale e non una lista di tre nomi — una lista non dice niente sul prossimo membro dell'unione"
  - "D-37-35: `updateVenue` tipizza anche i due rifiuti del gate, non solo i due del database: il bottone e' disegnato per ogni organizer mentre la scrittura pretende lo stato approvato, quindi quel rifiuto e' raggiungibile con una pressione ordinaria"

patterns-established:
  - "Prova per mutazione su un `Record` totale: si toglie un membro, si verifica che la sostituzione sia andata a segno, e si legge l'errore di compilazione"
  - "Una coppia di cause davvero indistinguibili si nomina come coppia (`not_found_or_refused`) e la frase dice come distinguerle — non e' collassare due cause, e' dichiararne una"

# NESSUNO, ed e' deliberato. Questo piano chiude quattro reperti di code review:
# non esercita ne' VENUE-01 ne' VENUE-02. La voce 5 di `deferred-items.md`
# resta aperta — l'atto vero della rivelazione manuale non e' mai stato
# compiuto — e un verde su un requisito di rivelazione mai esercitato e' la
# categoria peggiore in cui averne uno.
requirements-completed: []

# Metrics
duration: ~50min
completed: 2026-08-11
---

# Fase 37 Piano 15: i quattro reperti che costavano qualcosa a una persona — Summary

**Un destinatario problematico ora blocca se stesso invece dei novantanove accanto, e le due superfici dove un rifiuto arrivava illeggibile — la risposta JSON del cron e la modale della sede — dicono di nuovo cose diverse per cause diverse.**

## Performance

- **Durata:** ~50 min
- **Task:** 4 su 4, tutti chiusi
- **File modificati:** 5 (4 di codice, 1 di pianificazione)
- **Commit:** 4, uno per task
- **Scritture in produzione:** **zero**. Nessuna migration, nessun `db push`, il cron **non** e' stato innescato.

## Task Commits

| Task | Commit | Cosa |
|---|---|---|
| 1 | `708a531` | WR-06 — un lotto respinto degrada a invii singoli, una volta sola |
| 2 | `72161e5` | WR-06b — `retryOutlook`: il risultato dice se ripremere puo' cambiare qualcosa |
| 3 | `9789ff6` | WR-03 — il cron riporta verdetti, non informazioni |
| 4 | `894e7ac` | WR-08 — `updateVenue` rifiuta con un valore, non con un messaggio redatto |
| — | `d3c4b62` | allineamento di forma: la condizione del ripiego scritta come precondizione (`batch.length > 1`) invece che come negazione. Nessun cambiamento di comportamento |

---

## Task 1 — WR-06: il ripiego

`resend.batch.send` valida **all-or-nothing**: un solo destinatario problematico
fa respingere l'intera chiamata. Con il lotto come unica unita' di ritentativo,
nessuno dei massimo cento veniva marcato, e ogni ritentativo — la corsa del cron
del giorno dopo, o la pressione di «manda ai N che mancano» — ricomponeva **lo
stesso lotto** e incontrava **lo stesso rifiuto**. Il review lo descrive come
*«preme, fallisce, preme, fallisce»*, ed e' esatto: non esisteva rimedio dentro
il prodotto.

Il ciclo e' stato scomposto in tre pezzi che fanno una cosa ciascuno
(`reveal-party-venue.ts:600`, `:671`, `:685`):

- **`attemptGroup`** rende e spedisce, e non fa altro: non marca, non conta, non
  ritenta. E' cio' che permette al ripiego di riusarlo su un gruppo di uno senza
  duplicare l'invio.
- **`recordDelivered`** conta e marca, e sta **fuori** dal `try` dell'invio —
  dove 37-09 l'aveva messa e per la ragione che 37-09 aveva scritto: dentro, un
  guasto del database avrebbe riportato come falliti fino a cinquanta invii
  **gia' partiti**, cioe' indirizzi usciti con un risultato che dice di no e la
  corsa successiva che rispedisce. Il ripiego non l'ha spostata: ha reso piu'
  piccolo il gruppo.
- Il ciclo: lotto → se accettato, marca; se respinto e **lungo uno**, conta il
  mancante (`:694`); se respinto e piu' lungo, **degrada a invii singoli**
  (`:711`), una volta, senza ciclo annidato.

**I tre vincoli del piano, tutti tenuti.** `recipientsSent` resta la somma di
cio' che il provider ha accettato — il ripiego aggiunge tentativi, non
ottimismo. La marcatura resta fuori dal `try`. Il ripiego avviene **una sola
volta**: un singolo che fallisce e' stato provato due volte in tutto (una nel
lotto, una da solo), e un terzo tentativo dentro la stessa corsa
trasformerebbe un fatto riportabile in un'attesa piu' lunga.

**Una interazione dichiarata invece che scoperta dopo, e scritta nel codice.**
Su un lotto pieno il ripiego fa fino a cento chiamate al provider al posto di
una, quindi il limite di frequenza del provider e' un esito plausibile **del
ripiego stesso**. Non e' stata scritta nessuna costante di pacing (D-37-31):
questa funzione gira dentro un cron con un budget di orologio, e dormirci dentro
scambierebbe *«qualche persona non raggiunta»* con *«la corsa muore e ogni
serata successiva resta non raggiunta»*. Un singolo respinto per frequenza resta
non marcato — quindi raggiungibile — ed e' classificato come ritentabile dal
Task 2. Il numero del limite **non e' scritto da nessuna parte**, di proposito:
citarlo a memoria sarebbe un `Gate hallucination`, e il codice non lo usa.

## Task 2 — WR-06b: la distinzione **e'** derivabile, e da dove

Il piano concedeva di chiudere questo task come dichiarazione. Non e' stato
necessario: la distinzione esiste nella risposta del provider e si legge alla
fonte.

`resend@6.9.2`, `node_modules/resend/dist/index.d.mts:72`, dichiara
`RESEND_ERROR_CODE_KEY` come **unione chiusa di ventuno nomi**. Ventuno su
ventuno sono assegnati a uno dei due insiemi in
`reveal-party-venue.ts:174` e `:187`, e i due insiemi **partizionano** l'unione:
quattro descrivono il momento (limite di frequenza, richieste concorrenti,
guasto dell'applicazione, errore interno del server), diciassette descrivono la
richiesta o l'account.

Il risultato del modulo espone quindi `retryOutlook`
(`reveal-party-venue.ts:135`), un **valore** e non un messaggio:

| Valore | Significato |
|---|---|
| `nothing_to_retry` | nessuno e' rimasto indietro |
| `may_help` | il rifiuto descriveva il **momento**: la stessa pressione, piu' tardi, puo' riuscire |
| `same_answer` | il rifiuto descriveva la **richiesta**: la stessa chiamata adesso ottiene la stessa parola |
| `unknown` | il provider ha rifiutato con un nome fuori dall'insieme misurato |

**Tre scelte di forma, e ognuna e' una decisione.**

1. **L'orizzonte e' «ripremere adesso»** (D-37-32), ed e' cio' che rende
   decidibile il caso delle quote: `daily_quota_exceeded` sta con i rifiuti che
   si riproducono, perche' quello che libera una quota e' il tempo, non un
   secondo clic — e cio' che torna piu' tardi e' la corsa programmata, che e' la
   rete sotto questo percorso per costruzione (D-37-01).
2. **Un throw si legge per meta'.** Il flag `rendered` (`:626`) distingue il
   template che fallisce — stessa serata, stessi dati, stesso esito alla
   prossima pressione — dal trasporto che fallisce, che e' un guasto del
   momento. Costa un booleano e **non sposta `render()` fuori dal `try`**, dove
   37-09 l'ha messo apposta.
3. **L'aggregato pende verso `may_help`** (D-37-33, `worseOutlook` a `:230`).
   I due modi di sbagliare qui sono *dire «smetti di provare» a chi poteva
   ancora essere raggiunto* e *invitare un tentativo inutile*: `venue-secrecy.md`,
   gate *idempotenza del cron*, ha gia' dichiarato la priorita' fra quei due —
   un destinatario senza l'indirizzo e' un problema visibile, un tentativo
   sprecato e' rumore.

Il campo e' documentato **con lo scopo**: esiste perche' una superficie possa
smettere di invitare la seconda pressione di un bottone che pubblica indirizzi,
e chi lo legge fra sei mesi trova quella frase prima del tipo.

**Il confine del task, dichiarato:** il pannello e il dialogo che renderanno il
valore stanno fuori dai `files_modified`, e
`admin/events/[id]/reveal/actions.ts` costruisce il proprio risultato campo per
campo, quindi oggi **il valore esiste e nessuna superficie manuale lo legge**.
WR-06b e' chiuso a meta': il rimedio materiale c'e', la frase in pagina non e'
ancora cambiata. E' la **voce 9 di `deferred-items.md`**, con il costo scritto.

## Task 3 — WR-03: solo i verdetti

Tolto il filtro di serata (D-37-21, corretto), il cron rispazza ogni serata
segreta dentro la banda temporale per due o tre corse consecutive. Su una serata
gia' interamente spedita `collectRecipients` torna una mappa vuota,
`failureKind` vale `no_recipients`, e la condizione `!== "none"` la metteva fra
i fallimenti. Ma il modulo condiviso **dichiara** che quel valore e'
*«INFORMATION, not a verdict»*: il chiamante contraddiceva il modulo che chiama.

Il costo non e' di ordine: la risposta JSON e' **l'unico canale osservabile di
questo cron** — non esiste error tracking — e con `MAX_REPORTED_FAILURES = 20`
le voci benigne possono spingere fuori dalla lista un `send_failed` o un
`recipients_unavailable` **veri**. Un fallimento silenzioso prodotto dal rumore.

`REPORTABLE_FAILURE` (`route.ts:63`) e' un **`Record` totale** sull'unione, non
una lista di tre nomi (D-37-34). Una lista risponde per oggi e non dice niente
sul prossimo membro, che resterebbe semplicemente assente e quindi non
riportato; il `Record` lo rende un **errore di compilazione** finche' qualcuno
non decide da che parte sta. E' la stessa forma di `REFUSAL_SENTENCE` in
`RevealVenueDialog.tsx:123`, cioe' una forma gia' di casa.

`send_failed`, `recipients_unavailable` e `party_not_found` restano riportati;
`no_recipients` no. Alla voce di fallimento e' stato aggiunto `retryOutlook`
(`route.ts:215`): su un canale solo, un fallimento che si riprodurra' identico e
un minuto storto sono due letture diverse, e questa e' l'unica riga che lo dira'
mai a qualcuno.

**Nessun campo nuovo per contare le serate senza destinatari.** `parties:` gia'
dice quante serate sono state scandite, e con `failures` che ora contiene solo
verdetti, una lista vuota **e'** l'informazione: tutto e' partito.

## Task 4 — WR-08: un rifiuto che arriva

37-08 aveva fatto la correzione giusta — un `.update().eq()` silenzioso
rispondeva `{ success: true }` anche quando la RLS rifiutava — ma consegnava la
causa nuova come `throw` da una **server action**, e Next **redige** quel
messaggio nelle build di produzione. Il chiamante lo degradava a *«Something
went wrong»*: rifiuto della policy, sede cancellata e guasto di rete in una
schermata sola. E' il precedente del newsletter, raggiunto da una porta aperta
dalla correzione di un altro fallimento silenzioso.

`updateVenue` restituisce ora `{ ok: true } | { ok: false, reason }`
(`venues/actions.ts:207`), con **quattro** membri e non due:

| Causa | Quando |
|---|---|
| `not_permitted` | il gate ha detto di no |
| `identity_missing` | nessuna identita' risolvibile — **non** un rifiuto nel merito: manca una migration su quel deploy |
| `not_found_or_refused` | `PGRST116` — la sede e' stata cancellata **oppure** una policy ha rifiutato la scrittura |
| `write_failed` | qualunque altro guasto del database |

**Perche' quattro e non due** (D-37-35): i due rifiuti del gate sono
**raggiungibili con una pressione ordinaria**. Il bottone e' disegnato per ogni
organizer mentre la scrittura chiede `catalogue.manage`, che pretende lo stato
approvato — la divergenza e' gia' scritta a
`(work)/venues/[slug]/page.tsx:210-234`. Mancava il modo di dirlo a chi preme, e
lasciarli fuori avrebbe chiuso due cause su quattro riproducendo il difetto
sulle altre due.

Il gate continua a lanciare — e' condiviso con `createVenue`, la cui firma non
era di questo piano — quindi le sue due categorie si convertono in valori
**dentro `updateVenue`** (`:274`, `:277`). Leggere `err.message` **li'** e'
lecito e in nessun punto a valle: il throw non ha ancora attraversato il confine
della server action, quindi nulla lo ha redatto. E' esattamente la proprieta' su
cui il client non puo' contare, ed e' la ragione per cui il client riceve un
valore.

Sul database si ramifica su `error.code` (`:337`), **mai** su `error.message`.
`error.details` non compare in nessuno dei due file, e non comparira': porta la
riga rifiutata, e le righe di `public.venues` sono indirizzi.

`EditVenueButton` sceglie la frase da un `Record` **totale** (`:27`): una causa
nuova nell'azione e' un errore di compilazione qui, non una schermata vuota. Il
fallimento dell'upload della foto ha una frase e **un momento** suoi — fallisce
nel browser, prima che il server sia interpellato, quindi il form non e' stato
inviato affatto — e il throw residuo dell'azione **non legge** il messaggio: in
produzione sarebbe il paragrafo del digest di Next, che non dice niente.

**Una coppia dichiarata invece che collassata.** `not_found_or_refused` nomina
due cause perche' sono davvero indistinguibili da li' — la RLS rende la riga
invisibile e PostgREST risponde `PGRST116` in entrambi i casi. La frase dice
**come distinguerle**: ricarica, e se la sede c'e' ancora era la policy. Nominare
una coppia indistinguibile non e' il difetto del newsletter: fingere che sia una
sola causa lo sarebbe.

### La ricerca dei chiamanti, riportata come richiesto

```
grep -rn "updateVenue" src/
```

| File:riga | Cos'e' | Allineato? |
|---|---|---|
| `src/components/venues/EditVenueButton.tsx:5,62` | **l'unico chiamante** | si', in questo commit |
| `src/app/(admin)/admin/venues/actions.ts:34,192` | la definizione e il suo docblock | si' |
| `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx:221` | **un commento**, non una chiamata | resta corretto: descrive che l'azione ri-chiede la capability al proprio interno, cosa che continua a fare |

Nessun altro chiamante in `src/`. Le altre occorrenze nel repo sono in
`.planning/`, cioe' documenti.

---

## Verification

**Non esiste un test runner per il prodotto.** `npm run build` e' anche il
typecheck, e nessuna riga di questo piano e' «verificata perche' i test
passano».

| Controllo | Esito |
|---|---|
| `npm run build` dopo ogni task | **0** |
| `npm run verify:routes` | **0** — PASS, entrambi i controlli |
| `npm run verify:capabilities` | **0** — 5/5 verdi, 0 warning |
| `npm run verify:persona` | **0** — 7/7 verdi |
| `npm run lint` sui quattro file toccati | **zero** problemi nuovi (il repo ne ha 129 preesistenti altrove, nessuno in questi file) |
| `grep -c "Something went wrong" src/components/venues/EditVenueButton.tsx` | **0** |
| `grep -c "error.details"` sui due file del Task 4 | **0** e **0** |

### Cio' che ho potuto **osservare**, e cio' che ho solo **letto**

Questa fase ha tenuto la distinzione con costanza. La tengo.

**Osservato — misura meccanica.** La partizione dei nomi di errore del provider
e' stata **contata**, non affermata: uno script usa-e-getta ha estratto
`RESEND_ERROR_CODE_KEY` da `node_modules/resend/dist/index.d.mts` e i due
insiemi dal sorgente, e ha confrontato. **21 nomi nell'SDK, 21 classificati, 0
non classificati, 0 classificati che l'SDK non dichiara, 0 duplicati fra i due
insiemi.** Lo script e' vissuto nella scratchpad e non e' committato.

**Osservato — prova per mutazione.** Entrambi i `Record` totali sono stati
provati rompendoli, e la mutazione e' stata **verificata di per se'** prima di
leggerne l'esito, come `ai-engineering.md` pretende:

| Mutazione | La sostituzione e' andata a segno? | Esito |
|---|---|---|
| tolto `no_recipients` da `REPORTABLE_FAILURE` | si', `grep -c` → 0 | `TS2741: Property 'no_recipients' is missing … but required in type 'Record<VenueRevealFailureKind, boolean>'` |
| tolto `write_failed` da `REFUSAL_SENTENCE` | si', `grep -c` → 0 | `TS2741: Property 'write_failed' is missing … but required in type 'Record<UpdateVenueRefusal, string>'` |

Entrambi i file sono stati ripristinati e `git status` e' tornato pulito prima
del commit.

**Letto, non osservato — e questa e' la parte grande.**

- **Il ripiego a invii singoli non e' mai stato eseguito.** `tickets` e `rsvps`
  sono vuoti in produzione: il ciclo dei lotti **non ha mai spedito niente**, ne'
  prima ne' dopo questa modifica. Il codice e' letto e compilato. Voce 10 di
  `deferred-items.md`.
- **`retryOutlook` non e' mai stato prodotto da un rifiuto vero.** La
  classificazione e' provata contro l'unione dichiarata dell'SDK, non contro una
  risposta del provider.
- **I quattro rifiuti di `updateVenue` non sono stati provocati.** Servirebbe una
  sessione autenticata reale con uno stato non approvato, o una sede cancellata
  sotto una modale aperta.
- **Il Task 3 in produzione e' un ragionamento, non una corsa.** Il criterio del
  piano — con le serate attualmente in produzione la risposta resta
  `{ sent: 0, failed: 0 }` senza voci in `failures` — regge perche'
  `route.ts:142` scarta ogni serata iniziata da piu' di 24 ore, e le due serate
  segrete in produzione sono entrambe nel passato: `revealParties` resta vuoto e
  il ciclo non gira. **Il cron non e' stato innescato**, e questa riga e'
  un'inferenza dal codice, dichiarata come tale.

### Nessuna scrittura in produzione

Nessuna migration, nessun `db push`, nessuna riga creata o rimossa, il cron non
innescato. Nessuna autorizzazione a scrivere in produzione e' stata chiesta ne'
concessa, quindi non ce n'e' una da considerare consumata.

---

## Deviations from Plan

### 1. [Rule 2 — Missing critical] Il Task 4 tipizza quattro cause, non due

- **Trovata durante:** Task 4, leggendo la capability della rotta prima di
  scrivere.
- **Cosa:** il piano chiede «almeno `not_found_or_refused` e `write_failed`». Il
  gate condiviso lancia altre due categorie, ed entrambe sono **raggiungibili
  con una pressione ordinaria** — il bottone e' disegnato per ogni organizer, la
  scrittura pretende lo stato approvato. Lasciarle come `throw` avrebbe chiuso
  WR-08 su due cause su quattro e lasciato le altre due esattamente com'erano:
  redatte da Next e collassate in una frase.
- **Fix:** conversione delle due categorie del gate in valori **dentro**
  `updateVenue`, senza toccare `assertCatalogueManage` ne' `createVenue`, che
  sono fuori perimetro.
- **Committed in:** `894e7ac`

### 2. [Deliberata] `retryOutlook` aggiunto anche alla voce di fallimento del cron

- **Cosa:** il Task 3 non lo chiedeva. Il campo e' stato aggiunto perche' quella
  risposta JSON e' l'**unico canale osservabile** del cron, che e' la premessa
  stessa di WR-03: rendere legibile il canale e poi non dirgli la cosa che si e'
  appena resa dicibile sarebbe stato lasciare il lavoro a meta'.
- **Perimetro:** il file e' fra i `files_modified`, e il criterio di accettazione
  del Task 3 non cambia (con le serate in produzione `failures` resta assente).
- **Committed in:** `9789ff6`

### 3. [Dichiarata] `deferred-items.md` aggiornato pur non essendo nei `files_modified`

- **Cosa:** due voci nuove, la **9** (`retryOutlook` esiste e nessuna superficie
  lo legge) e la **10** (il ripiego non e' mai stato esercitato, e il suo costo
  si misura solo con destinatari veri).
- **Perche':** il piano nomina esplicitamente quel file come deliverable
  possibile del Task 2, ed e' il registro della fase. Entrambe le voci
  registrano un confine che questo piano ha **scelto** di non attraversare, non
  un difetto scoperto: senza scriverle, l'unico posto in cui esisterebbero
  sarebbe questo SUMMARY.
- **Committed in:** con questo SUMMARY.

**Nessun file di codice fuori dai `files_modified` e' stato toccato.**

---

## Issues Encountered

**Un valore prodotto e non consumato, che e' l'unica cosa che resta aperta di
questo piano.** `retryOutlook` viaggia dal modulo al cron, ma non dal modulo al
percorso manuale: `reveal/actions.ts` costruisce `VenueRevealActionResult` campo
per campo e i tre file della superficie manuale sono fuori perimetro. La frase
del pannello — *«Pressing sends only to them — nobody already reached is mailed
again»* (`VenueRevealPanel.tsx:304-307`) — resta vera su **chi** viene spedito e
continua a non dire niente su **se puo' funzionare**. Il piano lo prevede e lo
chiede in questa forma; la voce 9 di `deferred-items.md` porta il costo di
chiuderlo, ed e' lo stesso piano che dovrebbe chiudere la voce 8.

**Una asimmetria che vale la pena nominare prima che qualcuno la scopra.** Il
Task 1 rende il ripiego possibile e il Task 2 rende dicibile il suo esito, ma
entrambi vivono in un percorso che **in produzione non ha mai spedito una
mail**. Il primo lotto vero sara' anche il primo esercizio di tutto questo
codice: della deduplicazione, dei lotti, della marcatura per lotto, del ripiego
e della classificazione insieme. E' la ragione per cui la voce 10 esiste e per
cui va letta insieme alla voce 5.

## Threat Flags

Nessuna superficie di sicurezza nuova. Il ripiego non aggiunge un percorso di
uscita per l'indirizzo — stesso destinatario, stesso contenuto, stesso provider
gia' autorizzato — ed e' la disposizione `accept` che il `<threat_model>` del
piano gli assegna (T-37-32). `updateVenue` non allarga di una riga l'insieme di
chi puo' scrivere un indirizzo: stesso gate, stesso client con i cookie, la RLS
ha ancora l'ultima parola. E' cambiato solo **cosa un chiamante rifiutato riesce
a leggere**. Nessuna guardia monotona e' stata resa piu' facile da far scattare.

---
*Fase: 37-manual-venue-reveal*
*Completato: 2026-08-11*

## Self-Check: PASSED

Tutti e sei i file dichiarati esistono su disco; tutti e quattro gli hash di
commit esistono nella history. **Nessuno dei quattro commit cancella un file
tracciato** (`git diff --diff-filter=D` vuoto su tutti e quattro). I criteri
meccanici del piano rispondono: `batch.length > 1` e' la condizione del ripiego
a `reveal-party-venue.ts:706`; `no_recipients` compare nel cron solo dentro il
`Record` dei riportabili con valore `false` e in due commenti che spiegano
perche'; `ok: false` e' in `venues/actions.ts`; `grep -c "Something went wrong"`
su `EditVenueButton.tsx` risponde `0`.
</content>
</invoke>
