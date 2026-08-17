---
phase: 45-production-sections-section-by-section
plan: 14
subsystem: api
tags: [server-actions, venue-secrecy, venue-acquisition, capabilities, dialogs, idempotence]

# Dependency graph
requires:
  - phase: 45-08
    provides: "le cinque tabelle applicate in produzione, la colonna del ponte e i due vincoli che la governano"
  - phase: 45-13
    provides: "actions.ts, il gate non esportato, il Record totale dei rifiuti, e la pagina di dettaglio che monta gli atti"
  - phase: 45-11
    provides: "SpaceName — l'unico renderer del nome, con lo stadio accanto"
provides:
  - "src/app/(admin)/admin/location/actions.ts — promoteSpace: due gate, tredici rifiuti, idempotenza sul link scritto per ultimo"
  - "src/app/(admin)/admin/location/PromoteSpaceDialog.tsx — la conferma che nomina cio' che esce"
affects: [45-16, 45-18, 45-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un'unione di rifiuti SEPARATA invece di dieci membri in piu': allargare l'unione condivisa avrebbe preteso dieci frasi irraggiungibili da un form che non puo' produrle, degradando in decorazione il meccanismo di un'altra superficie"
    - "un rifiuto RESTITUITO accanto a un gate che LANCIA, perche' due throw sono lo stesso vuoto dopo la redazione di produzione e la persona non saprebbe quale porta le e' stata chiusa"
    - "due client per due tabelle: la policy sui venue e' un secondo rifiuto indipendente sull'unica scrittura che muove un indirizzo"
    - "la pulizia per chiave primaria protetta dalla FK senza ON DELETE: un delete rifiutato e' l'informazione che il link era atterrato"

key-files:
  created:
    - "src/app/(admin)/admin/location/PromoteSpaceDialog.tsx"
  modified:
    - "src/app/(admin)/admin/location/actions.ts"
    - "src/app/(admin)/admin/(work)/location/[id]/page.tsx"

key-decisions:
  - "D-45-14-A: `catalogue.manage` e' un rifiuto RESTITUITO, non un secondo throw. Next redige il messaggio di un errore lanciato da una Server Action in produzione: due throw arriverebbero al lettore come lo stesso vuoto, e T-45-04 chiede esattamente che le due porte siano distinguibili"
  - "D-45-14-B: i rifiuti della promozione sono un'unione PROPRIA (`PromotionRefusal`), non dieci membri in piu' di `LocationRefusal`. Il Record totale di `SpaceForm.tsx` avrebbe preteso dieci frasi che quel form non puo' mai produrre"
  - "D-45-14-C: l'insert sui venue passa dal client di sessione, non dal service client. `venues_insert_organizer` diventa un secondo rifiuto indipendente sull'unica scrittura di questo file che mette un indirizzo in una tabella su cui si puo' costruire una serata — la scelta e la ragione sono quelle gia' scritte in `venues/actions.ts:123-128`"
  - "D-45-14-D: il nome del venue si rifiuta sulla collisione e non si suffissa. Un suffisso e' giusto per un indirizzo web e sbagliato per un nome: un locale si scrive come lo scrive lui"
  - "D-45-14-E: il pannello nomina lo spazio attraverso `SpaceName`, quindi con lo stadio accanto. Il check A l'ha colto su uno `<strong>` fatto a mano, ed e' la regola *lo stato prima del nome* nel punto in cui conta di piu'"
  - "D-45-14-F: il trigger e' disegnato per ogni spazio ancora in corsa, non solo per gli acquisiti. Nasconderlo sotto `acquired` renderebbe irraggiungibile la frase che dice perche' non passera'"

requirements-completed: [PROD-02]

# Metrics
duration: 55min
completed: 2026-08-17
---

# Phase 45 Plan 14: L'unico attraversamento che esiste — Summary

**Uno spazio acquisito diventa un venue, dietro due chiavi diverse, con l'indirizzo che passa e la conferma che lo dice: e la prova — non l'affermazione — che nessuna rivelazione si avvicina di un giorno.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2
- **Files:** 3 (1 creato, 2 modificati)

## Cosa fa l'attraversamento al percorso di rivelazione — misurato, non asserito

Questa e' la domanda che il piano chiede di chiudere con evidenza. Quattro fatti, ognuno letto dal codice corrente.

**1. Le colonne di rivelazione non stanno sulla tabella che questo atto scrive.**

`venue_secret`, `venue_reveal_on_purchase`, `venue_reveal_hours`, `venue_revealed_at` sono colonne di `public.event_parties`; `venue_reveal_sent` e' una colonna di `public.tickets` e di `public.rsvps`. `public.venues` (`20260226200000_venues.sql:2-15`) ne porta **zero**: ha `name`, `slug`, `bio`, `address`, `google_maps_url`, `photo_url`, `instagram_url`, `website_url`, `created_by` e i due timestamp.

Misurato sul corpo dell'atto: le tabelle toccate sono **due** — `production_space` e `venues` — e i verbi sono **tre**: `insert`, `update`, `delete`. Non esiste una scrittura che possa raggiungere una colonna di rivelazione, e non perche' l'atto si astenga: perche' non c'e' dove metterla.

**2. La strada pubblica pretende una serata, e questo atto non ne crea nessuna.**

`public.venue_for_parties` (`20260810161000_venues_read_narrowed.sql:371-397`) e' `SECURITY DEFINER` e il suo `FROM` cammina `event_parties ep JOIN events e ON e.id = ep.event_id JOIN venues v ON v.id = ep.venue_id`. Un venue che **nessuna serata indica** non e' raggiungibile da quella funzione per nessun argomento: il join lo esclude. `promoteSpace` non crea eventi, non crea serate e non scrive `venue_id` da nessuna parte.

**3. Il cron di rivelazione pretende una serata anche lui.**

`api/cron/venue-reveal/route.ts:110-115` legge `event_parties` con `.eq("venue_secret", true)` e incorpora `venues(name, address)` attraverso lo stesso `venue_id`. `revealPartyVenue` raccoglie i destinatari per `party_id` e per `event_id` (`reveal-party-venue.ts:283-307`) e marca `venue_reveal_sent` per destinatario. Un venue senza serata non e' spazzato da nessuno dei due.

**4. `anon` non legge `public.venues` affatto.**

La policy incondizionata e' stata rimossa e `venues_select_staff` chiede `staff.manage` (`20260810161000_venues_read_narrowed.sql:238-242`). La riga che questo atto scrive e' quindi leggibile dallo **stesso pubblico** che stava gia' leggendo lo spazio da cui viene.

**La conclusione, detta per intero.** L'indirizzo attraversa dentro una tabella dove e' visibile allo staff. La strada da li' a un membro o al pubblico pretende ancora un atto separato, successivo e deliberato: qualcuno che scelga quel venue per una serata. **Quella strada esiste apposta e questo atto ne e' l'ingresso — non e' la strada.** Nessuna rivelazione diventa piu' facile, piu' precoce o automatica, che e' esattamente cio' che la guardia monotona di `meta-gates.md` ammette.

Le tre citazioni delle colonne di rivelazione nel file stanno **tutte e tre dentro i paragrafi che dichiarano cosa l'atto non tocca** — il conteggio che il criterio d'accettazione ammette.

## Il soggetto che oggi non esiste, e va detto invece che sottinteso

**Nessuno spazio in produzione e' acquisito.** I 184 record sono tutti allo stadio piu' basso, tutte le provenienze sono `derived`, e le tre colonne che chiude una telefonata sono al default (45-10). `venue-acquisition.md` lo dice come fatto: *tutto lavoro a tavolino, nessuno e' stato chiamato*.

Quindi **questo attraversamento non ha, oggi, alcun soggetto legittimo in produzione**. Non e' un difetto del piano: e' la ragione per cui il gate dello stadio e' la prima cosa che l'atto controlla dopo l'idempotenza, e per cui il pannello dice al lettore che *acquisito significa per iscritto* prima ancora di offrirgli un pulsante. Il primo attraversamento vero avverra' dopo una telefonata e un accordo scritto, e non prima.

## L'atto — nove passi, e cosa ogni passo compra

Letto dall'alto in basso, l'ordine e' questo, e ogni riga e' stata verificata rileggendo l'export:

| # | Passo | Cosa compra |
|---|---|---|
| 1 | `assertLocationSection()` — **lancia** | la chiave di sezione, chiesta per prima e una volta sola |
| 2 | `capabilities.has(CAP.CATALOGUE_MANAGE)` — **restituisce** | la seconda porta, distinguibile dalla prima |
| 3 | `UUID_PATTERN` sull'argomento | niente e' chiesto al database su un identificatore che non lo e' |
| 4 | i due client, **dopo** entrambi i gate | un errore di ordine qui e' un percorso di scrittura non autenticato, e nessun build lo vedrebbe |
| 5 | la lettura — e **non** e' `loadSpace` | e' l'unico punto del modulo in cui nome e indirizzo *sono* il soggetto |
| 6 | `promoted_venue_id !== null` → `already_promoted` | la seconda pressione non conia un secondo venue |
| 7 | `exited_at`, poi lo stadio, poi l'evidenza | tre rifiuti nominati, e lo stadio torna indietro senza nominare nessuno spazio |
| 8 | nome e slug | il primo si rifiuta, il secondo si suffissa |
| 9 | insert → link → pulizia | il link scritto per ultimo, con il predicato che chiude la corsa |

**I due gate, verificati leggendo l'export dall'alto:** riga 1 `await assertLocationSection()`, riga 2 il controllo di `catalogue.manage`, e `getServiceClient()` / `createClient()` **dopo** entrambi. Nessun client esiste prima che entrambe le domande abbiano risposta.

**L'idempotenza precede ogni altra decisione sulla riga**, e non e' cio' che rende l'atto sicuro: e' la via rapida. La garanzia e' il predicato `.is("promoted_venue_id", null)` che viaggia **dentro l'update**, con `.select("id")` che lo rende leggibile — senza, un update rifiutato e uno soddisfatto rispondono identici, che e' lo zero silenzioso che questa fase rifiuta ovunque.

**Lo stadio NON e' riasserito come predicato**, deliberatamente: `production_space_promotion_needs_acquired` rifiuta la scrittura se lo stadio si e' mosso fra la lettura e li', e il vincolo e' il confine. Un predicato risponderebbe a quella corsa con *qualcun altro l'ha promosso*, che sarebbe la frase sbagliata.

## La pulizia, e perche' non introduce un percorso di cancellazione

Il registro della fase misura che **le nove chiavi esterne di questa fase non portano CASCADE** (45-08: `r`, `n`, `a`). La pulizia doveva rispettarlo.

`.delete().eq("id", venueId)` — **una sola** occorrenza di `.delete(` in tutto il file, su un id catturato al momento della creazione. Mai un selettore su una lista: il repository ha perso 63 righe in sette tabelle con l'altra forma e non ha point-in-time recovery.

**E c'e' una garanzia in piu' che vale la pena scrivere, perche' e' anche uno strumento diagnostico.** `production_space.promoted_venue_id` referenzia `public.venues(id)` **senza alcuna azione `ON DELETE`**. Quindi se il link fosse atterrato davvero — e la risposta si fosse persa in transito — il database **rifiuta** questa cancellazione invece di tagliare il legame in silenzio. Un `promotion_orphan_venue` non e' quindi solo un fallimento: e' spesso l'informazione che l'attraversamento e' riuscito. Il pannello dice entrambe le letture e ordina di ricaricare prima di fare qualsiasi cosa.

## I tredici rifiuti, e la decisione di non allargare l'unione condivisa

Il primo build ha fallito, ed e' stato il meccanismo di 45-13 a funzionare: `REFUSAL_SENTENCE` in `SpaceForm.tsx` e' un `Record` **totale** su `LocationRefusal`, quindi dieci membri nuovi sono diventati un errore di compilazione.

**Le due strade, pesate invece che scelte in fretta:**

1. **aggiungere dieci frasi a `SpaceForm`** — additivo, ma sarebbero dieci frasi che quel form **non puo' mai produrre**, nell'unico posto la cui garanzia e' che ogni frase sia raggiungibile. Avrebbe pagato questo piano degradando in decorazione il meccanismo di un altro;
2. **restringere il Record di `SpaceForm`** a un sottoinsieme — indebolisce la garanzia che 45-13 ha dichiarato come suo pattern.

**Presa una terza:** i rifiuti della promozione sono un'unione **propria**, `PromotionRefusal`, e `LocationRefusal` e `LocationFailure` sono tornati **esattamente** come 45-13 li ha lasciati. I cinque membri condivisi sono scritti a mano e l'assertion `PromotionSharesWithSection extends LocationRefusal ? true : never` diventa rossa il giorno in cui uno di loro smette di esistere — la stessa forma di `AnnounceNightDialog.tsx:238-255`, con la ragione scritta accanto. `PROMOTION_REFUSAL` nel dialog e' totale sulla nuova unione: una causa aggiunta senza frase resta un errore di build.

**Misurato:** 15 frasi di rifiuto nel dialog, **0 duplicati**. Nessun messaggio condiviso, nessun *qualcosa e' andato storto*.

Tre rifiuti meritano una riga per conto proprio:

- **`venue_name_taken`** — il piano nominava solo `slug_taken`, ma `venues_name_unique` esiste quanto `venues_slug_unique`. Senza questo, uno spazio omonimo di un venue esistente sarebbe stato riportato come `write_failed`, che manda a guardare una tabella quando la cosa da guardare e' il catalogo: quasi sempre significa che quel locale e' gia' di la', arrivato per un'altra strada.
- **`venue_policy_refused`** — il codice `42501` e' la policy che rifiuta, cioe' il secondo rifiuto che fa il suo lavoro. E' una risposta sui permessi e non un guasto del database, e fonderla in `write_failed` manderebbe a cercare nel posto sbagliato. **La sua esistenza e' la prova che il secondo rifiuto e' reale.**
- **`promotion_raced` contro `already_promoted`** — il primo dice *e' stato creato qualcosa e ripreso indietro*, il secondo *non e' stato creato niente*. Riportare il secondo come il primo nasconderebbe una scrittura avvenuta.

## Il pannello, e l'inversione del silenzio del calendario

`AnnounceNightDialog` non nomina il venue, e la sua ragione e' buona: un pannello di conferma e' una cosa che qualcuno fotografa, e quell'atto non muove alcun indirizzo. **Questo lo muove**, quindi lo stesso ragionamento si rovescia — il precedente e' `RevealVenueDialog`, che nomina il luogo perche' il luogo e' esattamente cio' che esce.

**Il corpo dice quattro cose, ognuna con la sua voce:**

1. **crea un venue** nel catalogo, da cui una serata potra' essere costruita;
2. **porta l'indirizzo** — e da un venue un indirizzo puo' raggiungere il pubblico attraverso la macchina della rivelazione, una volta che una serata ci sta sopra. *Oppure*, dove il record non ne porta: **nessun indirizzo attraversa, perche' questo record non ne ha**. Il ramo esiste perche' l'atto viene chiesto sulla promessa che l'indirizzo passa, e dirlo su uno spazio senza indirizzo sarebbe una bugia detta dall'unico pannello della fase il cui mestiere e' descrivere accuratamente una cosa irreversibile;
3. **non si annulla premendo ancora** — il link sta sullo spazio, e rimuovere un venue e' un atto da master, nel catalogo;
4. **lo spazio resta nella sezione Location** — niente e' cancellato, niente e' spostato: la promozione e' un legame, non una migrazione.

**Sotto `acquired` il controllo di conferma e' inerte, e il rifiuto e' disegnato in cima al corpo con lo stadio nominato** — la regola si legge **prima** della pressione, non si applica in silenzio dopo. L'atto rifiuta di nuovo sul server, dove sta la garanzia, e il vincolo rifiuta dopo di lui.

**L'esito e' riportato nel pannello del dialog**, mai per via transitoria: un `<dialog>` nativo dipinge nel top layer, sopra ogni `z-index`, quindi un esito riportato altrove sarebbe riportato invisibilmente.

## Zero fallimenti silenziosi

Sedici `console.error` nel modulo — sette sono della promozione — e **sedici righe portano `code=`**. Mai l'oggetto errore (`0` occorrenze), mai il terzo campo di PostgREST (`0` occorrenze della parola), mai un nome, mai un indirizzo, **mai uno slug**: uno slug e' un nome con gli spazi tolti, e il check E lo verifica.

**L'osservabilita' che questo piano NON compra, e va detta:** non esiste error tracking. I sette log stanno in un posto dove nessuno guarda. L'effetto osservabile e' la frase nel pannello, e vale solo per chi sta guardando lo schermo nel momento in cui preme.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correttezza] `catalogue.manage` restituito invece che lanciato**

- **Found during:** Task 1
- **Issue:** il piano chiede *«write which key refused, as two different refusal members»*. Un secondo `throw` avrebbe rotto il criterio *`grep -c "throw new Error"` invariato a 2` — ma soprattutto **non avrebbe funzionato**: Next redige il messaggio di un errore lanciato da una Server Action in produzione, quindi due throw arrivano al lettore come lo stesso vuoto, e la persona rifiutata non saprebbe quale porta le e' stata chiusa. E' esattamente cio' che T-45-04 chiede di rendere leggibile.
- **Fix:** la chiave di sezione resta un throw (coerente con gli altri sette export); `catalogue.manage` e' un rifiuto restituito con la sua frase. La superficie riporta il primo come *non puoi lavorare questa sezione* e il secondo come *puoi lavorarla e non puoi creare un venue*.
- **Files:** `actions.ts`, `PromoteSpaceDialog.tsx`
- **Committed in:** `4849312`, `5cb9641`

---

**2. [Rule 3 - Blocking] Il Record totale di 45-13 ha rifiutato dieci membri nuovi**

- **Found during:** Task 1, primo `npm run build`
- **Issue:** `SpaceForm.tsx:124` mappa `LocationRefusal` con un `Record` totale, e dieci cause nuove l'hanno reso un errore di tipo. Il meccanismo ha funzionato come progettato.
- **Fix:** un'unione **separata** — `PromotionRefusal` — con i cinque membri condivisi scritti a mano e un'assertion di sottoinsieme che diventa rossa se uno sparisce. `LocationRefusal` e `LocationFailure` sono tornati byte per byte a com'erano. Nessun file di 45-13 e' stato toccato.
- **Files:** `actions.ts`
- **Committed in:** `4849312`

---

**3. [Rule 2 - Sicurezza] L'insert sui venue passa dal client di sessione, non dal service client**

- **Found during:** Task 1
- **Issue:** il piano dice *«the service client, after two capability checks»*. Ma `venues/actions.ts:123-128` ha gia' preso la decisione opposta sulla stessa tabella, con l'argomento scritto: usare il service client lascerebbe il gate come **unica** cosa che rifiuta un chiamante non autorizzato, su un percorso che scrive l'indirizzo di un venue.
- **Fix:** l'insert passa dal client di sessione, cosi' `venues_insert_organizer` rifiuta indipendentemente dal gate. Link e pulizia restano sul service client, e la ragione e' scritta: `production_space` non ha alcun arco di scrittura, e rimuovere un venue e' `master.manage` — una pulizia che un organizzatore non puo' eseguire e' una pulizia che non gira mai, e un venue orfano nel picker e' esattamente la riga che tutto questo disegno esiste per prevenire. Il costo e' dichiarato: quel delete scavalca la RLS, ed e' vincolato a **un** id catturato dalla chiamata stessa.
- **Files:** `actions.ts`
- **Committed in:** `4849312`

---

**4. [Rule 2 - Correttezza] `venue_name_taken` — il piano nominava solo la collisione dello slug**

- **Found during:** Task 1
- **Issue:** `venues` ha **due** vincoli di unicita' (`20260226200000_venues.sql:18-19`), e il piano ne trattava uno. Un omonimo sarebbe finito in `write_failed`.
- **Fix:** un pre-controllo sul nome e un rifiuto proprio, **senza suffisso**: un suffisso e' giusto per un indirizzo web e sbagliato per un nome, perche' un locale si scrive come lo scrive lui e *Qualcosa 2* non e' un ripiego, e' un secondo posto che non esiste.
- **Files:** `actions.ts`, `PromoteSpaceDialog.tsx`
- **Committed in:** `4849312`, `5cb9641`

---

**5. [Rule 1 - Bug] Il pannello nominava lo spazio senza il suo stadio**

- **Found during:** Task 2, `npm run verify:section-surface`
- **Issue:** il corpo disegnava il nome dentro uno `<strong>` fatto a mano. Il check A e' andato rosso su quattro occorrenze, e aveva ragione di dominio: `venue-acquisition.md`, *lo stato prima del nome* — uno spazio si nomina **con il suo stato**, e questo e' il pannello dove conta di piu', perche' lo stadio e' l'unico fatto che decide se l'attraversamento avviene.
- **Fix:** il nome passa da `SpaceName`, l'unico renderer ammesso, con `StageBadge` accanto. Il gate e' tornato verde riparando l'invariante, **non** rinominando la prop per zittirlo.
- **Files:** `PromoteSpaceDialog.tsx`, `(work)/location/[id]/page.tsx`
- **Committed in:** `5cb9641`

---

**6. [Rule 1 - Bug] Il docblock del dettaglio non conosceva un atto che scrive fuori dalla sezione**

- **Found during:** Task 2
- **Issue:** il paragrafo riscritto da 45-13 elencava due superfici di scrittura, entrambe dentro la sezione. Con un terzo atto che scrive `public.venues`, restava vero alla lettera e fuorviante nel complesso — e il paragrafo *il nome e l'indirizzo non lasciano questo render* si sarebbe letto come una contraddizione.
- **Fix:** un paragrafo nuovo che dichiara l'atto e separa le due frasi: *questo render* resta esattamente vero, l'attraversamento e' una frase diversa. Stessa forma che 45-13 ha usato per rovesciare la propria.
- **Files:** `(work)/location/[id]/page.tsx`
- **Committed in:** `5cb9641`

---

**7. [Rule 2 - Correttezza] Il trigger e' disegnato anche sotto `acquired`**

- **Found during:** Task 2
- **Issue:** il piano dice *«visible only where it can be pressed»*, ma il suo stesso criterio d'accettazione pretende che *il controllo di conferma sia disabilitato con lo stadio nominato nel corpo*. Sotto la lettura letterale quella frase sarebbe irraggiungibile: nessuno potrebbe mai aprire il pannello per leggerla.
- **Fix:** il trigger e' disegnato per ogni spazio **ancora in corsa** (`exited_at IS NULL`) e il controllo di conferma dentro e' inerte sotto `acquired`, con lo stadio e la regola sopra di esso. La lettura scelta e' scritta nel commento del mount, insieme alla frase che il piano chiede: **nascondere il trigger non protegge nulla** — cio' che questa superficie tiene E' il segreto, e le tre cose che rifiutano un soggetto non autorizzato sono l'ingresso del middleware, la guardia di pagina e le policy di riga.
- **Files:** `(work)/location/[id]/page.tsx`
- **Committed in:** `5cb9641`

---

**8. [Rule 3 - Blocking] `promoted_venue_id` va letto dalla pagina, e il suo commento diceva di no**

- **Found during:** Task 2
- **Issue:** il docblock della query dichiarava la colonna *deliberately NOT embedded, and it never will be from this section*. Una superficie che offre un atto deve sapere se l'atto e' gia' avvenuto.
- **Fix:** la colonna e' **selezionata** e continua a **non essere incorporata** — sono due cose diverse, e il commento ora le separa: nessun join, nessuna seconda query, una decisione sola (disegnare il trigger o la frase). Nulla nella pagina rende il nome, lo slug o l'indirizzo del venue.
- **Files:** `(work)/location/[id]/page.tsx`
- **Committed in:** `5cb9641`

---

**Total deviations:** 8 auto-fixed (2 bug, 4 correttezza/sicurezza, 2 blocking)
**Impact on plan:** nessun file oltre i tre dichiarati in `files_modified`. Nessun pacchetto installato.

## Verification

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | eseguito dopo ogni task; e' anche il typecheck |
| `npm run verify:dialogs` | **0** | il nuovo dialog usa il primitivo, non dichiara una shell propria, non importa la via transitoria |
| `npm run verify:section-surface` | **0** | A B C D E verdi. Il check A e' andato **rosso** sulla prima stesura e la riparazione e' stata l'invariante, non il nome della prop |
| `npm run verify:breakpoints` | **0** | |
| `npm run lint` | nessun problema sui file toccati | `npm run lint \| grep -i location` → vuoto |
| `npm run verify` | **2**, **identico al baseline** | tabella dei verdetti confrontata riga per riga: 22 righe, nessuna differenza |
| `npm run verify:section-export` | **REFUSED (2)**, invariato | i due moduli di export non sono su disco (arrivano in 45-16), quindi *nothing was measured*. La promozione non puo' comparire in una chiusura che non ha punto di partenza |

**Il baseline e' stato misurato PRIMA di toccare l'albero**, e i quattro rifiuti sono gli stessi dopo: `capabilities`, `conversion`, `section-export`, `touch-targets`. In entrambi i casi *«No gate that reached a verdict reported a failure»*. Nessun rosso nuovo, nessun rifiuto nuovo.

### Criteri d'accettazione, misurati

| Asserzione | Esito |
|---|---|
| entrambi i gate prima del client, una volta ciascuno | **si'** — letto dall'alto in basso; ordine registrato nella tabella dei nove passi |
| l'idempotenza precede ogni altra query sulla riga | **si'** — e' la prima decisione presa dalla lettura |
| `grep -c "throw new Error"` | **2** — invariato rispetto a 45-13 |
| pulizia per chiave primaria | **1** occorrenza di `.delete(`, seguita da `.eq("id", venueId)`. Il criterio del piano cerca le due su una riga sola; Prettier le spezza, e la forma misurata e' la stessa |
| nessun'altra `.delete(` nel file | **0** |
| `grep -cE "venue_reveal_sent\|venue_reveal_on_purchase"` | **3**, e tutte e tre dentro i paragrafi che vietano la cosa — il conteggio che il criterio ammette |
| nome, indirizzo o slug in un log | **0** |
| `grep -ci "address"` nel dialog | **18** (il criterio chiede ≥ 1) |
| `toast`/`Toast` nel dialog | **0** |
| `autoFocus` nel dialog | **0**; `data-initial-focus` **1**, sul Cancel |
| chiamate a `assertLocationSection(` | **10** = 1 dichiarazione + 8 export + 1 riga di prosa. **Una per export** |
| tabelle toccate da `promoteSpace` | `production_space`, `venues` — e nessun'altra |
| frasi di rifiuto duplicate nel dialog | **0** su 15 |

### Cosa un verde NON significa qui

- **Nessuna promozione e' stata eseguita contro la produzione, e non c'era autorizzazione per farlo.** D12: 63 righe cancellate durante una *verifica*, e il progetto non ha point-in-time recovery. Il build fa il typecheck **contro le dichiarazioni** di `src/types/database.ts`; nessun client Supabase di questo repo e' parametrizzato con `Database`, quindi i nomi di colonna restano asserzioni.
- **Che il vincolo rifiuti quello che l'atto rifiuta non e' stato esercitato.** `production_space_promotion_needs_acquired` e `production_space_acquired_needs_evidence` sono il confine; le sonde sui vincoli sono il posto onesto per provarlo, e **non sono state eseguite qui**.
- **Nessuna sessione e' stata aperta**, quindi che le due porte rifiutino davvero soggetti diversi e' `verify:refusal` e la procedura P1.
- **Che il client di sessione sia rifiutato dalla policy dove il gate dice di si'** — cioe' che `venue_policy_refused` sia raggiungibile — non e' stato provocato. Se non lo fosse mai, il secondo rifiuto sarebbe una decorazione: e' la sola cosa in questo piano che vorrei vedere scattare almeno una volta.
- **Non esiste alcun test runner per il prodotto.** Dirlo e' obbligatorio.
- **Il deploy non e' live**, quindi nessuna di queste superfici e' stata aperta in un browser.

### Procedura manuale scritta, da eseguire dopo il deploy

Non eseguibile oggi. **E oggi non ha nemmeno un soggetto**: nessuno dei 184 spazi e' acquisito, quindi il passo 4 pretende prima una telefonata e un accordo scritto — che e' il punto, non un ostacolo.

1. Con un ruolo che tiene `production.location.manage` **e** `catalogue.manage`, aprire uno spazio in stadio `mapped`.
   - **Attesa:** accanto a *Change the stage*, il pulsante *Cross into the venue list*. Aprirlo: il rifiuto in cima al corpo nomina lo stadio, la regola sta sotto, e ***Cross it over* e' inerte**. Il focus e' su *Cancel*. Premere Invio: **non** deve confermare.
2. Con un ruolo che tiene la chiave di sezione e **non** `catalogue.manage`, invocare `promoteSpace` direttamente (fetch verso l'endpoint della Server Action, body forgiato) su uno spazio acquisito.
   - **Attesa:** `catalogue_manage_required` restituito, **nessuna riga scritta**. E' l'unica prova che le due porte siano due.
3. Con un ruolo che non tiene nemmeno la chiave di sezione, la stessa chiamata.
   - **Attesa:** un throw, non un valore. Le due risposte devono essere **distinguibili** dal chiamante.
4. Portare uno spazio ad `acquired` con la riga dell'accordo, poi aprire il pannello.
   - **Attesa:** il nome dello spazio **con il badge dello stadio accanto**, le quattro conseguenze, e la seconda che dice *it carries the address across*. Su uno spazio senza indirizzo, la stessa riga deve dire l'opposto.
5. Confermare.
   - **Attesa:** l'esito **dentro il pannello**, che dice se l'indirizzo e' passato. Ricaricando, il pulsante e' sostituito dalla frase *already crossed*. Su `/admin/venues` c'e' una riga nuova; **su nessuna serata e' cambiato niente**.
6. Premere di nuovo (riaprendo da un'altra scheda gia' caricata).
   - **Attesa:** `already_promoted`, e **nessun secondo venue** nel catalogo. Contare le righe del catalogo da una fonte diversa dalla pagina su cui si e' premuto.
7. Aprire *Change the stage* sullo spazio appena attraversato e provare a scendere.
   - **Attesa:** `promoted_cannot_leave_acquired`.
8. Provare ad attraversare un secondo spazio che porta **lo stesso nome** di un venue esistente.
   - **Attesa:** `venue_name_taken`, e **nessun** venue con un nome suffissato.
9. Con i log del server aperti, provocare un fallimento del link (per esempio revocando temporaneamente la chiave di servizio dopo l'insert).
   - **Attesa:** ogni riga porta `space=`, `venue=`, `code=` e `message=` e **nessun nome, nessun indirizzo, nessuno slug**. E il catalogo torna come era, oppure la riga dice `promotion_orphan_venue` con l'id.
10. **La verifica che conta di piu':** dopo un attraversamento riuscito, aprire la pagina pubblica di qualunque evento e la lista pubblica degli eventi.
    - **Attesa:** **niente e' cambiato**. Il venue nuovo non compare da nessuna parte, perche' nessuna serata lo indica.
11. A 390px: il pannello sale dal bordo inferiore, le quattro conseguenze restano su una colonna, e i due controlli in fondo restano affiancati e raggiungibili col pollice.

## Known Stubs

Nessuno. Ogni ramo che i tipi ammettono e' disegnato, nessun valore finto raggiunge uno schermo, nessun `TODO`, nessun dato hardcoded.

**Tre assenze sono decisioni dichiarate e non stub:**

- **Non esiste un atto che annulli l'attraversamento**, e non su questa superficie: rimuovere un venue e' `master.manage` e avviene nel catalogo. Il pannello lo dice **prima** che si prema.
- **Nessun campo del venue oltre i quattro** — niente bio, niente link a una mappa, niente foto, niente indirizzi social. Il paragrafo che li elenca esiste perche' un'aggiunta debba discutere con lui invece di passargli accanto.
- **`bio` non eredita la prosa dello scouting.** Sono criteri e osservazione scritti per decidere se telefonare, non copy su un posto che ha accettato di ospitarci.

## Threat Flags

Nessuna superficie di sicurezza nuova oltre quella che il piano dichiara. Le mitigazioni del registro, in codice:

- **T-45-01** — l'attraversamento e' un atto esplicito dietro **due** chiavi e uno stadio che significa *per iscritto*; la conferma nomina cio' che esce; l'atto **non crea evento ne' serata**, quindi l'indirizzo non e' su nessuna strada. La prova sta nella prima sezione di questo documento.
- **T-45-16** — nessuna scrittura raggiunge una colonna di rivelazione, e la ragione non e' l'astinenza: **quelle colonne non stanno sulle due tabelle che questo atto tocca**. Misurato.
- **T-45-08** — rimozione per **chiave primaria** su un id catturato alla creazione, mai per selettore. Una sola `.delete(` nel file. La FK senza `ON DELETE` impedisce di tagliare un legame gia' atterrato.
- **T-45-04** — `catalogue.manage` e' una **chiave diversa** dalla chiave di sezione, entrambe sono chieste, e i due rifiuti sono **distinguibili anche dopo la redazione di produzione** — che due throw non sarebbero stati.
- **T-45-02** — sette righe di log nella promozione, tutte con identificatori, codice e messaggio. Mai nome, mai indirizzo, **mai slug**.
- **T-45-SC** — **nessun pacchetto installato.** `node_modules` e' un symlink al checkout principale, gitignored, rimosso alla fine.

## User Setup Required

Nessuna. Due avvertimenti operativi:

1. **`SUPABASE_SERVICE_ROLE_KEY` resta necessaria**: il link e la pulizia passano di li'. Se manca, l'insert sul venue riesce (client di sessione) e il link fallisce — e l'atto pulisce, restituendo `promotion_link_failed`. Il catalogo torna come era.
2. **Il primo attraversamento vero pretende una telefonata prima del codice.** Nessuno dei 184 spazi e' acquisito, e `acquired` non si raggiunge senza la riga che dice dove sta l'accordo.

## Next Phase Readiness

- **45-16 (l'export)** e' il primo piano che dara' a `verify:section-export` un punto di partenza. La promozione e' un percorso di **scrittura**: non deve comparire in nessuna chiusura di export, e oggi non compare in nessuna perche' non ne esiste. L'unico importatore di `PromoteSpaceDialog` e `promoteSpace` e' la pagina di dettaglio — misurato.
- **45-18 (la tab)** non e' toccato.
- **La tensione su `exit_reason`** (45-13) resta aperta e questo piano non la tocca.
- **DEF-45-05** resta aperta; nessun percorso nuovo verso le note.

## Self-Check: PASSED

**File dichiarati — esistenza verificata:**

- `src/app/(admin)/admin/location/PromoteSpaceDialog.tsx` — FOUND (creato)
- `src/app/(admin)/admin/location/actions.ts` — FOUND (modificato)
- `src/app/(admin)/admin/(work)/location/[id]/page.tsx` — FOUND (modificato)

**Commit dichiarati — esistenza verificata:** `4849312`, `5cb9641`.

**Nessuna cancellazione di file in nessuno dei due commit** (`git diff --diff-filter=D` vuoto su entrambi).

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
