# Phase 49: Comprare senza account — Context

**Gathered:** 2026-09-05
**Status:** Ready for planning
**Source:** decisioni del proprietario del 2026-08-22, raccolte in
`.planning/todos/pending/guest-ticket-purchase.md`, piu' i requisiti `BUY-01…05`
della ROADMAP. Nessuna sessione di domande: le decisioni difficili erano gia'
prese e datate.

> **Questo file e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Nessuna data non annunciata, nessuna sede, nessuna line-up compare
> qui — e la scadenza reale di questa fase e' espressa come **ancora**, non come
> giorno. Vedi `ai-engineering.md`, gate *la pianificazione e' pubblica*.

<domain>
## Phase Boundary

**Dentro:** l'acquisto di un biglietto da parte di chi non ha un account, un
ordine che contiene piu' biglietti con un tetto per serata, il ritrovamento dei
biglietti senza login, e la generazione del codice del biglietto.

**Fuori:** lo smantellamento delle iscrizioni e delle superfici da socio (fasi
50 e 51). Questa fase **apre una strada nuova**; non chiude quella vecchia. Le
due cose insieme sarebbero una superficie mezza convertita, che e' la regola che
la fase 41 ha scritto su se stessa.

**L'ancora temporale, senza data.** Questa fase deve essere finita e provata
**prima del primo listing pubblico della milestone** — il momento in cui una
persona che non ci conosce vede una serata e prova a comprare. Da quel momento
esiste denaro reale su questo percorso, e ogni difetto costa a una persona che
ha pagato. E' l'unica fase della milestone che sta fra oggi e un biglietto
vendibile.

</domain>

<decisions>
## Implementation Decisions

### Le sei decisioni del proprietario — 2026-08-22, prese con l'analisi d'impatto davanti

1. **Un ospite puo' comprare un biglietto su TUTTE le serate**, non solo sui
   satelliti in locali pubblici.
2. **L'acquisto crea un account leggero al volo** — nessun modulo, nessuna
   password chiesta al momento di comprare.
3. **Il venue segreto NON viene rivelato all'acquisto.** La rivelazione resta
   dove sta oggi: al countdown, per mail, dal cron.
4. **Il link d'accesso porta a una schermata di scelta password** che *completa*
   l'account, cosi' si rientra da qualunque dispositivo.
5. **Il testo di quella schermata dice «Completa il tuo account»**, mai «diventa
   membro».
6. **Chi paga entra, e l'ingresso dalla cassa va attribuito e contato.**

### Il gate dei due assi — `member` non e' `approved`

`CLAUDE.md` principio 8: ruolo e stato sono **due assi diversi**.

- **Il PAGAMENTO decide l'ammissione.** Non e' una proposta, succede gia':
  `src/app/api/webhooks/sumup/route.ts:88` porta il profilo a
  `status: "approved"` sul pagamento riuscito e manda la mail di benvenuto.
- **La PASSWORD completa l'accesso.** Da' all'account un modo per rientrare, e
  **non ammette nessuno** — l'ammissione e' gia' avvenuta al pagamento.

Una schermata che dicesse «diventa membro» attribuirebbe alla password un
effetto che ha il pagamento. E' il principio 8 violato nel punto in cui il
prodotto parla all'utente, da dove passa poi nel codice.

### L'identita' e' vera nel database, ospite solo per chi compra

Letto in `supabase/migrations/20260225110000_phase6_ticketing.sql`:

```
tickets.user_id  uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE
UNIQUE (event_id, user_id)
POLICY ... USING (auth.uid() = user_id)
```

Con un'identita' reale creata al volo, **tutte e tre reggono senza modifiche**:
nessuna chiave esterna da allentare, nessun vincolo da smontare, e **nessuna
policy nuova che scavalchi la RLS**.

> ⚠ **CORRETTO IL 2026-09-05, contro le migration invece che contro il ricordo.**
> Questo blocco diceva che `UNIQUE (event_id, user_id)` e' in tensione con
> `BUY-01`. **Quel vincolo non esiste da due migration.** Creato in
> `20260225110000_phase6_ticketing.sql:32`, **eliminato** in
> `20260225150000_party_architecture.sql:129`; il suo successore
> `tickets_party_id_user_id_key` **eliminato** in
> `20260226300000_multi_sub_events.sql:57`. Oggi al suo posto ci sono due indici
> unici **parziali**, e una migration piu' recente
> (`20260822180000_email_ledger_night_paths.sql:90`) lo dichiara gia' per
> iscritto.
>
> La lettura sbagliata veniva dal todo del 2026-08-22, che aveva letto il file
> della prima migration senza seguirne le successive. E' il *gate documentazione
> datata* di `ai-engineering.md`: citare un documento derivato senza verificarlo
> contro il codice corrente. Rovesciato invece che cancellato, perche' chi
> rilegge deve vedere quale premessa e' caduta.
>
> **Il vincolo che blocca DAVVERO `BUY-01` non e' nominato da nessun documento:**
> `tickets.sumup_checkout_id text UNIQUE`
> (`20260225110000_phase6_ticketing.sql:28`). Sei biglietti nati da un solo
> checkout lo violerebbero.
>
> **La strada raccomandata dalla ricerca e' lo split ordine/righe**, ed esiste
> gia' in produzione con un altro nome: `drink_orders` → `fulfill_drink_order` →
> N `drink_tokens`. Risolve `sumup_checkout_id UNIQUE` **senza allentarlo** —
> cioe' tenendo l'idempotenza del pagamento nello schema invece che spostarla nel
> codice, che e' esattamente cio' che `ticketing-payments.md` non vuole.
> **La scelta va dichiarata nel piano, non scoperta durante l'esecuzione.**

### `BUY-05` — il requisito e' giusto, il bersaglio no

> ⚠ **CORRETTO IL 2026-09-05, leggendo il codice.** `BUY-05` e questo blocco
> dicevano: *«`src/utils/qr.ts:49` genera il codice del biglietto con
> `Math.random()`»*. **Non e' vero, su due punti.**

**Uno.** La riga 49 sta dentro `generateMembershipCode()` — la *membership card*,
`RSN-` piu' 8 caratteri di un alfabeto da 32, cioe' **40 bit**. Non e' il codice
del biglietto. E quella funzione ha **zero importatori in `src/`**: e' codice
morto, e la fase 51 rimuove la superficie che serviva (`MEM-01`).

**Due.** Il biglietto non ha un codice generato: la sua credenziale e'
`tickets.id`, un uuid da `gen_random_uuid()`, con **firma HMAC-SHA256** e
confronto a tempo costante. La proprieta' che `BUY-05` voleva **e' gia' vera sul
biglietto**.

**Ma il requisito non muore: cambia bersaglio, e il bersaglio vero e' peggiore.**

`handle_new_user` assegna a **ogni nuovo profilo** un `membership_code` generato
con il `random()` di plpgsql — un PRNG **non crittografico**, seminato
(`20260224_rbac_migration.sql:78`, `20260225000000_phase3_referral.sql:41`,
`20260310000000_guest_list.sql:105`).

E quel codice **e' una credenziale della porta**, dichiarato tale nel codice:
`src/app/(public)/events/[slug]/page.tsx:296` lo chiama *«the door credential»*,
`src/app/api/membership/verify/route.ts:114-115` cerca il profilo per
`membership_code`, e `src/app/api/tickets/attendance/route.ts:145` dichiara che
si ammette **sul solo `membership_code`, senza leggere ne' ruolo ne' stato**.

**Perche' e' un problema DI QUESTA FASE e non della 51.** Oggi i profili in
produzione sono **quattro**. Questa fase e' quella che comincia a crearne uno
**per ogni persona che compra** — quindi e' la fase che moltiplica la
popolazione che tiene una credenziale d'ingresso indovinabile, e viene **prima**
della 51, che sarebbe quella deputata a ripararla.

**La riformulazione di `BUY-05` e' una decisione del proprietario** e va presa
prima di pianificare: vedi *Domande aperte* in fondo.

### Il tetto e' 6 per default, modificabile per serata — `BUY-02`

Le sedi in target stanno fra 150 e 300 persone, e **dopo il perno il biglietto
e' l'unica cosa che regola chi entra**: non c'e' piu' un'approvazione a monte.
Senza account, un tetto alto e' una persona che ne compra cinquanta e li
rivende — cioe' la serata che sceglie il suo pubblico da sola. Sei e' un gruppo
di amici con un solo pagante.

### L'attribuzione si attacca al BIGLIETTO, non allo stato del profilo

L'ingresso dalla cassa va contato, ma **non** su `approved_via`, cioe' su
`status`: quel valore e' in via di smantellamento nelle fasi 50/51.
L'attribuzione va sul **biglietto** e sulla **presenza**, cosi' sopravvive alla
milestone invece di essere cancellata con lei.

Precedente da cui copiare la forma: la guest list scrive gia'
`approved_via: "guest_list"` in `src/lib/guest-list/process-entry.ts:176`. Il
percorso del pagamento oggi **non attribuisce niente**: cambia solo lo stato.

### Il ritrovamento senza login ha gia' un precedente in questo codice — `BUY-04`

I token drink da ospite si ritrovano gia' senza account. Il meccanismo esiste,
e' esercitato, e va **riusato**, non reinventato: credenziale del biglietto piu'
mail. Vedi `claimGuestOrders` e il percorso dei token ospite.

### Questa fase REVISIONA una decisione di milestone del 2026-08-14

La decisione *«solo organizer e staff potranno fare login»* **non vale piu'
cosi'**. L'account leggero con la password fa rientrare il cliente nel login —
non come iscritto, ma come **conseguenza dell'acquisto**. E' una terza strada
fra «tutti si registrano» e «nessuno entra», e chiude il buco che la regola
avrebbe lasciato: **senza login, un biglietto perso non si recupera**.

Il resto di quella decisione resta in piedi: nessuna registrazione spontanea,
via membership card, event history e referral, `PROJECT.md` da riscrivere.

### Claude's Discretion

- La forma dei piani e delle onde.
- Come si genera il codice del biglietto, purche' da `crypto` e non da
  `Math.random()`, e purche' lo spazio dei codici sia dichiarato nel piano.
- Dove vive il tetto per serata nello schema, purche' abbia un default.
- La forma della schermata di completamento account, dentro il vincolo del testo
  deciso al punto 5.

</decisions>

<canonical_refs>
## Canonical References

**Da leggere prima di pianificare o implementare.**

### Le decisioni e il perimetro
- `.planning/todos/pending/guest-ticket-purchase.md` — le sei decisioni, il gate
  dei due assi, la lettura dello schema, le verifiche prescritte
- `.planning/ROADMAP.md` § Phase 49 — `BUY-01…BUY-05` e le due ragioni scritte

### I gate di dominio che questa fase attraversa
- `.claude/rules/ticketing-payments.md` — dominio primario
- `.claude/rules/access-gating.md` — l'identita' creata al volo e la RLS
- `.claude/rules/venue-secrecy.md` — un flusso nuovo e' un flusso nuovo
- `.claude/rules/checkin-offline.md` — il biglietto di un ospite alla porta
- `.claude/rules/comms-analytics.md` — la mail che porta tre cose
- `.claude/rules/meta-gates.md` — impatto cross-dominio, zero fallimenti silenziosi

### Il codice che la fase tocca o da cui copia la forma

> ⚠ **Riferimenti rimisurati il 2026-09-05.** Le righe di questo blocco venivano
> da `STATE.md` (19 agosto) e dal todo del 22 agosto, e **due erano sbagliate**.
> Ogni riga qui sotto e' stata riletta dal codice a `main` `5f1e260`.

- **`src/app/(admin)/admin/events/actions.ts:1563` e `:1853`** — e' **qui** che
  parte l'acquisto di un biglietto (`createCheckout`).
  *(I documenti dicevano `src/app/(public)/events/[slug]/actions.ts:97`,
  `auth.getUser()`. **Quel file contiene solo azioni sui media** — quattro
  funzioni, tutte di upload e stato. La riga 97 non e' un acquisto.)*
- **`src/app/(public)/events/[slug]/menu/actions.ts:311`** — il checkout **da
  ospite** che gia' funziona, per i drink. E' il precedente da riusare per
  `BUY-03`, non da reinventare.
- `src/app/(public)/events/[slug]/page.tsx` — `userTicket` al **singolare**; e
  `:296`, dove il codice dichiara `membership_code` *«the door credential»*
- `src/app/(public)/tickets/[id]/page.tsx:114-117` — `auth.getUser()` e rimbalzo
  a `/login`: il muro fra un ospite e il proprio indirizzo
- `src/app/api/cron/venue-reveal/route.ts:186-201` — la regola «chi compra dopo
  la rivelazione la legge dalla pagina»
- `src/app/api/webhooks/sumup/route.ts` — verifica sempre via GET checkout,
  idempotente; porta a `approved` (riga 88)
- `src/app/api/membership/verify/route.ts:114-115` e
  `src/app/api/tickets/attendance/route.ts:145` — si ammette sul **solo**
  `membership_code`, senza leggere ruolo ne' stato
- `supabase/migrations/20260224_rbac_migration.sql:78` (piu' `phase3_referral.sql:41`
  e `guest_list.sql:105`) — il `random()` di plpgsql che conia quel codice
- `src/lib/email.ts` — il registro `email_deliveries` e il ramo `suppressed`
- `src/lib/guest-list/process-entry.ts:176` — la forma dell'attribuzione
- `supabase/migrations/20260225110000_phase6_ticketing.sql:28` —
  `sumup_checkout_id text UNIQUE`, il vincolo che blocca davvero `BUY-01`
- `scripts/verify-venue-surfaces.mjs:93-95` — le due sole superfici che il gate
  conosce
- `src/utils/qr.ts:49` — `Math.random()` in `generateMembershipCode()`,
  **zero importatori**: codice morto, non il codice del biglietto

</canonical_refs>

<specifics>
## Specific Ideas

### La riparazione della posta E' GIA' STATA FATTA — non e' un'onda di questa fase

> ⚠ **CORRETTO IL 2026-09-05.** Questo blocco dichiarava la riparazione della
> posta *«precondizione, non lavoro parallelo»*, sulla base di
> `src/lib/email.ts:38` che *«lancia solo su `error`»*. **Quel file oggi non fa
> piu' cosi'.**

`src/lib/email.ts` porta il registro `email_deliveries`, quattro esiti che **non
si collassano** in un messaggio solo, e un ramo `suppressed` esplicito — letto
come stringa grezza perche' l'unione di tipi dell'SDK `resend@6.9.2` non lo
contiene. Il cron di riconciliazione esiste
(`src/app/api/cron/reconcile-email-deliveries/`, dichiarato in `vercel.json`).

**Conseguenza per il piano: nessuna onda per un lavoro gia' fatto.** Cio' che
resta e' molto piu' piccolo e va comunque fatto: **verificare che il percorso
dell'ospite passi da quel registro** invece di avere una strada propria. Una
mail nuova che non si registra e' il buco vecchio riaperto in un posto nuovo.

**Perche' contava, e conta ancora.** Con l'ospite una sola mail porta biglietto,
link d'accesso e — piu' tardi — l'indirizzo. Per un membro una mancata consegna
e' un fastidio; **per un ospite e' niente biglietto, niente login, niente
indirizzo**, e lo scopre alla porta, dove `checkin-offline.md` dice che
rifiutare un ospite valido e' l'errore che costa di piu'.

### Il buco che questa fase APRE, e che deve chiudere dentro di se'

`src/app/api/cron/venue-reveal/route.ts:186-201` dichiara la regola:
*«chi ha comprato un biglietto DOPO la rivelazione vede l'indirizzo sulla pagina
e non riceve nessuna mail.»*

Quella pagina e' `src/app/(public)/tickets/[id]/page.tsx`, che a `:114-117` fa
`auth.getUser()` e **reindirizza a `/login`**.

**Per un ospite che non ha mai scelto una password non esiste quella pagina,
quindi non esiste nessun indirizzo. Ha pagato e non sa dove andare.**

La schermata del biglietto d'ospite non e' una comodita': su un intero ramo di
acquirenti e' **l'unica via verso l'indirizzo**. E' un requisito, non un
miglioramento.

**E il gate non lo vedrebbe.** `scripts/verify-venue-surfaces.mjs` conosce
**esattamente due** superfici, codificate a `:93-95`. Una terza che il gate non
conosce e' peggio di nessun gate: fa credere che qualcuno stia controllando.
Allargare quel gate e' lavoro di questa fase.

### Cio' che nessun controllo automatico puo' dire

Non esiste un test runner per il prodotto. La verifica minima e' `npm run build`
piu' **procedure manuali scritte** — quali passi, con quale ruolo, cosa si deve
osservare. Per questa fase servono almeno:

- **Il venue non compare in nessuna superficie del percorso ospite prima della
  rivelazione**: conferma d'acquisto, schermata del biglietto, ricevuta, mail.
  Il meccanismo esistente protegge le superfici che conosce; **un flusso nuovo
  e' un flusso nuovo**, e un indirizzo in una ricevuta annulla un cron.
- **Un biglietto d'ospite passa alla porta, anche offline**, e il nome che lo
  scanner mostra e' risolvibile.
- **Un ordine da piu' biglietti** produce codici distinti, tutti scansionabili,
  e la seconda scansione dello stesso codice e' rifiutata.

### Il contesto operativo, misurato il 2026-09-05

- Produzione: **zero biglietti, zero ordini bar, zero acquisti pendenti**, zero
  serate future pubblicate. Il momento piu' sicuro per un cambiamento profondo
  su questo percorso, e non durera'.
- **Zero conti `staff` e zero assegnazioni per serata**: la porta non e' mai
  stata esercitata in produzione da nessuno.
- Non esiste error tracking: un fallimento su questo percorso **non raggiunge
  nessun essere umano da solo**. Ogni percorso d'errore nuovo deve avere un
  effetto osservabile, non solo una riga di log.

</specifics>

<deferred>
## Deferred Ideas

- **Via le iscrizioni** e **via le superfici da socio** — fasi 50 e 51. Questa
  fase apre la strada nuova e non chiude la vecchia.
- **Google Pay** — differito per decisione del proprietario, 2026-09-05. Vedi
  `.planning/todos/pending/google-pay-deferred-by-decision.md`. Conseguenza
  accettata: chi compra da Android digita il numero della carta.
- **Apple Pay sul merchant nuovo** — non verificato. Il file di associazione del
  dominio e' servito ma fu generato per il merchant precedente. **Si prova su un
  iPhone in Safari appena esistono dei tier in vendita**, ed e' un passo di
  questa fase se i tier nascono qui.
- **Il nodo giuridico degli spazi privati** — chiuso per decisione informata del
  proprietario, 2026-08-15. **Non si riapre** come condizione di questa feature.

</deferred>

## Decisioni prese il 2026-09-05 — chiuse prima di pianificare

### D-49-01 — `BUY-05` si ripunta su `membership_code`, e si ripara QUI

**Decisione del proprietario.** Il requisito era scritto su una premessa falsa;
la debolezza vera e' `membership_code`, coniato dal `random()` non
crittografico di plpgsql e sufficiente **da solo** ad ammettere alla porta.

Si ripara **in questa fase**, con `crypto`, perche' questa e' la fase che
comincia a coniarne uno per ogni acquirente: oggi i profili sono quattro.
Lavoro contenuto — la funzione, in una migration. **I quattro codici gia'
emessi restano come sono**: rigenerarli invaliderebbe credenziali in mano a
persone reali.

> **Conseguenza accettata, dichiarata una volta e non riaperta.** La porta
> continua ad avere **due** credenziali — il biglietto e `membership_code` — e
> la seconda ammette senza leggere ne' ruolo ne' stato
> (`attendance/route.ts:145`). Togliere l'ammissione sul solo codice era la
> terza strada, ed e' stata **non scelta**: allargherebbe la fase a
> `access-gating.md` e `checkin-offline.md`. Resta debito, e va nominato nella
> verifica di fase invece che dimenticato.

### D-49-02 — `authenticated` si allarga, e la misura dice che non brucia

**Misurato dal catalogo il 2026-09-05**, non dedotto. Delle **31** policy che
nominano `authenticated` in `public`, **due** concedono senza restringere oltre
il ruolo, ed entrambe sono `SELECT`:

- `drink_items.drink_items_select` — `true`. Il menu del bar.
- `event_media.event_media_select_approved` — `status = 'approved'`.

**`venue_for_parties` non e' fra queste**, quindi l'assunzione ad alto rischio
della ricerca **cade**: l'account leggero non allarga la strada verso un
indirizzo.

> **La riga che resta da guardare nel piano:** le foto approvate diventano
> visibili a ogni acquirente, e **una foto puo' mostrare un posto**. E' materia
> di `media-and-storage.md` con `venue-secrecy.md` a fianco, ed e' un controllo
> da fare, non un allarme.

### D-49-03 — IL BIGLIETTO E' AL PORTATORE

**Decisione del proprietario, dichiarata con lo scenario:** *«Luca compra il
ticket, poi lo rivende o lo regala a Paolo. Paolo entra con il ticket di
Luca.»*

Non e' un caso limite tollerato: e' il caso **progettato**. `BUY-02` fissa il
tetto a sei perche' *«sei e' un gruppo di amici con un solo pagante»* — un
pagante e sei persone significa che **cinque biglietti su sei sono in mano a
qualcun altro**.

**Conseguenze, e sono vincoli sul piano:**

1. **Nessun nome si chiede all'acquisto.** `BUY-03` resta *una mail basta*. Un
   nome sullo schermo dello staff, su un biglietto trasferibile, produce uno di
   due danni: lo staff vede un nome, ha davanti un'altra persona e **rifiuta un
   ospite valido** — l'errore che `checkin-offline.md` dichiara il piu' costoso
   perche' avviene davanti a una fila — oppure lo staff impara a ignorare il
   nome, e allora il campo e' teatro. Un dato che si chiede e poi si ignora e'
   peggio di un dato che non si chiede.
2. **La porta verifica il BIGLIETTO, non la persona.** Lo schermo mostra cio'
   che serve a decidere: valido o rifiutato, quale serata, quale tier, e **se
   quel biglietto e' gia' passato**.
3. **La seconda scansione e' l'unico controllo che esiste.** Non e' un dettaglio
   dello scanner: al portatore, e' **tutto** il meccanismo.
4. **Quindi il conflitto offline pesa piu' di prima.** Due telefoni non sanno
   l'uno dell'altro; lo stesso biglietto passa due volte e il conflitto si
   scopre alla sincronizzazione. Finche' il biglietto era legato a un account
   era improbabile; **al portatore diventa il modo normale in cui qualcuno prova
   a entrare in due.** Va guardato in questa fase, non ereditato.

### D-49-04 — L'indirizzo va SOLO a chi ha comprato

**Decisione del proprietario.** Al momento della rivelazione l'indirizzo
raggiunge **l'acquirente**, che lo inoltra a chi tiene il biglietto come gli ha
inoltrato il biglietto.

**La credenziale del biglietto NON diventa una chiave verso l'indirizzo.** Il
segreto del venue resta esattamente largo com'e' oggi: nessuna superficie nuova
puo' mostrarlo, nessun `uuid` inoltrato lo porta con se'. E' la scelta piu'
stretta fra quelle poste, ed e' coerente con il default chiuso di
`venue-secrecy.md`.

**Conseguenza accettata:** se chi ha comprato non inoltra o non legge la mail,
chi va alla serata arriva senza sapere dove, e lo scopre la sera stessa.

**Cosa il piano deve comunque risolvere.** Resta il caso dichiarato dal cron
(`venue-reveal/route.ts:186-201`): chi compra **dopo** la rivelazione non riceve
mail e dovrebbe leggere l'indirizzo dalla pagina del biglietto — che per un
ospite senza password **non esiste**. Con D-49-04, la strada corretta e' che
**quell'indirizzo arrivi per mail all'acquirente anche in quel caso**, invece di
costruire una pagina che lo mostri.

> ⚠ **E' un percorso NUOVO che puo' far uscire un indirizzo, quindi e'
> Critical.** Deve essere idempotente, non deve poter partire prima del momento
> della rivelazione, e non deve poter alterare `venue_reveal_email_sent`, che e'
> una guardia monotona per serata e non per acquirente.

---

*Phase: 49-comprare-senza-account*
*Context gathered: 2026-09-05, dalle decisioni datate del proprietario*
*Corretto il 2026-09-05 contro il codice a `5f1e260`: quattro premesse dei
documenti a monte non reggevano. Vedi `49-RESEARCH.md`.*
