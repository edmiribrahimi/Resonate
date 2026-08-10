---
phase: 37-manual-venue-reveal
reviewed: 2026-08-11T00:00:00Z
depth: deep
diff_base: 1d21e9f83497c843f77b17d7483b59a95c1afd00
files_reviewed: 27
files_reviewed_list:
  - scripts/verify-capabilities.mjs
  - scripts/verify-routes.mjs
  - src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx
  - src/app/(admin)/admin/(work)/venues/[slug]/page.tsx
  - src/app/(admin)/admin/(work)/venues/page.tsx
  - src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx
  - src/app/(admin)/admin/events/[id]/reveal/VenueRevealPanel.tsx
  - src/app/(admin)/admin/events/[id]/reveal/actions.ts
  - src/app/(admin)/admin/events/actions.ts
  - src/app/(admin)/admin/venues/actions.ts
  - src/app/(auth)/login/page.tsx
  - src/app/(public)/events/EventTabs.tsx
  - src/app/(public)/events/[slug]/SecretVenueDialog.tsx
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/events/page.tsx
  - src/app/api/auth/callback/route.ts
  - src/app/api/cron/venue-reveal/route.ts
  - src/app/sw.ts
  - src/components/events/EventForm.tsx
  - src/lib/capabilities/keys.ts
  - src/lib/routes/capability-routes.ts
  - src/lib/routes/next-redirect.ts
  - src/lib/venue-reveal/reveal-party-venue.ts
  - src/types/database.ts
  - src/utils/datetime.ts
  - supabase/migrations/20260810160000_manual_venue_reveal.sql
  - supabase/migrations/20260810161000_venues_read_narrowed.sql
findings:
  critical: 1
  warning: 8
  info: 3
  total: 12
status: issues_found
---

# Fase 37: Rapporto di code review

**Revisionato:** 2026-08-11
**Profondita':** deep (analisi cross-file: catena `predicato di pagina → funzione SQL → server action → writer SECURITY DEFINER`)
**File revisionati:** 27
**Stato:** issues_found

## Sintesi

La fase e' scritta con una disciplina inusuale e le tre dimensioni piu' pericolose
reggono. Le dico esplicitamente **pulite**, con la ragione, perche' un rapporto
che tace su cosa ha guardato non e' verificabile:

- **Il predicato di livello 2 aggiunge e non modifica.** Ho ricostruito
  `isVenueVisible` ramo per ramo contro la versione precedente
  (`git diff 1d21e9f..HEAD`, `src/app/(public)/events/[slug]/page.tsx:159-216`):
  nessun `if` preesistente e' stato ristretto, nessun ramo nuovo concede a chi
  non e' `isApproved`, e i tre allargamenti — RSVP in livello 1, il ramo di coda,
  il default da 24 a 25 ore — sono tutti dentro l'autorizzazione scritta
  (D-37-02, D-37-06, D-37-10). Il fratello del bug `undefined !== null` non
  esiste: `revealedByHand` e' un test positivo (`:201-202`), il cron usa un test
  di verita' (`route.ts:144`), la pagina normalizza con `?? null` (`:523`, `:926`).
  L'unico `!== null` residuo su quel valore sta in `VenueRevealPanel.tsx:182`, e
  li' il verso e' fail-closed (un `undefined` **spegne** il bottone, non apre un
  indirizzo).
- **`error.details` non viene mai toccato.** Grep su tutte le righe aggiunte del
  diff: le uniche occorrenze della stringa sono nei commenti che la vietano. Ogni
  log nuovo stampa `code` e `message` e nient'altro.
- **Il writer `SECURITY DEFINER` e' corretto** rispetto al modello di casa
  (`20260809002000_assignment_acts.sql`): `SET search_path = ''`, riferimenti
  schema-qualificati, rifiuti argomentali per primi, `SELECT ... FOR UPDATE OF ep`
  sul soggetto, `REVOKE` prima di `GRANT`, `EXECUTE` al solo `service_role`, e i
  rifiuti come valori di ritorno invece che come eccezioni. La tabella della
  traccia ha RLS abilitata, una sola policy di `SELECT` e nessuna di scrittura.
- **La server action ri-chiede la capability dentro di se'** in tutti e tre gli
  export (`actions.ts:423`, `:755`, `:832`, `:939`) e valida `partyId` contro
  `UUID_PATTERN` prima di qualunque query.
- **L'allow-list di `?next=`** e' ancorata su entrambi i lati, rifiuta schema,
  backslash, `//` e caratteri di controllo, e ha un solo proprietario per due
  chiamanti.

Quello che segue e' cio' che non regge. Un **BLOCKER**: esiste un percorso
ordinario, senza forgiatura di richieste, in cui un indirizzo diventa pubblico
**senza atto, senza conferma, senza traccia**. Poi otto avvertimenti, dei quali
tre riguardano affermazioni che il codice fa su se stesso e che non sono vere —
in questo repo un commento e' un contratto, e un contratto falso su un percorso
di rivelazione e' un difetto.

Nota di perimetro rispettata: la mancata applicazione di
`20260810161000_venues_read_narrowed.sql` **non** e' riportata come bug. WR-01
riguarda il contenuto di quella migration, non il suo stato di deploy.

---

## Critical

### CR-01: la rivelazione si puo' armare su una serata senza indirizzo, e l'indirizzo esce dopo, da solo

**File:**
`src/app/(admin)/admin/events/[id]/reveal/actions.ts:751-813` ·
`src/app/(admin)/admin/events/[id]/reveal/VenueRevealPanel.tsx:200-201,344` ·
`src/app/(admin)/admin/events/actions.ts:947-989` ·
`supabase/migrations/20260810161000_venues_read_narrowed.sql:462-475`

**Cosa non va.** `revealVenueNow` non ha **nessuna** precondizione sul fatto che
la serata abbia davvero un indirizzo da rilasciare. Verifica il gate, la forma
dell'uuid, l'appartenenza, il nome dell'attore, e poi scrive l'atto. L'unica
guardia che esiste su questo punto sta nel componente client:
`venueName === null ? { mode: null }` (`VenueRevealPanel.tsx:200-201`) e
`dialogMode !== null && venueName !== null` (`:344`). Il pannello lo dichiara
pure, a `:248-252`: *«a reveal that publishes nothing still writes an act that
cannot be taken back»*. Quella frase descrive una regola che **vive solo nella
pagina** — ed e' esattamente la classe che `CLAUDE.md` principio 2 e
`access-gating.md` (gate *RLS-e'-il-confine*) definiscono non-protezione.

Il secondo pezzo, che e' quello che trasforma un fastidio in una pubblicazione:
`updateEvent` chiude la porta laterale su `venue_secret` per una serata gia'
rivelata (`actions.ts:970-989`), ma `venue_id` sta nello **stesso**
`nightFields` (`:955`) e non e' coperto da nessuna guardia. E l'arm 5 di
`venue_for_parties` concede l'indirizzo a **ogni** approvato sulla sola presenza
di `venue_revealed_at IS NOT NULL` (migration `:470`), senza guardare quando la
sede e' stata attaccata.

**Scenario concreto, senza richieste forgiate.**

1. Una serata segreta ha `venue_id = NULL` e `venue_text` valorizzato con un
   segnaposto (una stringa qualsiasi: il pannello si arma su
   `venueName ?? venue_text`, `edit/page.tsx:294`).
2. Chi ha `venue.reveal` preme. Il dialogo mostra il segnaposto come «il posto»,
   l'atto viene scritto, `venue_revealed_at` e' impostato, le mail partono con
   `venueName = venue_text` e **senza indirizzo** (`reveal-party-venue.ts:409-411`).
3. Giorni dopo qualcuno completa la scheda della serata dal form di modifica e
   collega la sede vera. Nessuna guardia si oppone: `venue_secret` non cambia,
   quindi `venue_secret_locked` non scatta.
4. **In quell'istante** `venue_for_parties` comincia a restituire nome, indirizzo
   e link Maps a ogni membro approvato (arm 5), a ogni possessore di biglietto
   (arm 3) e a ogni RSVP (arm 4), e la pagina pubblica smette di nascondere
   (`page.tsx:212`). Nessun atto, nessuna conferma, nessun conteggio, nessuna
   riga in `venue_reveal_acts`: alla domanda *«chi ha reso pubblico questo
   indirizzo?»* la traccia risponde nominando l'atto sul **segnaposto**.

Variante con richiesta forgiata (una server action e' un endpoint pubblico): un
titolare della chiave chiama `revealVenueNow` su una serata con `venue_id` e
`venue_text` entrambi nulli — l'unica guardia e' lato client, quindi passa, e
l'interruttore monotono scatta su una serata che non aveva niente da rivelare.

**Perche' e' Critical.** `venue-secrecy.md`, gate *irreversibilita'*: non esiste
«lo sistemiamo dopo». Qui l'indirizzo esce attraverso una modifica di catalogo
ordinaria, cioe' attraverso *«un percorso con nessun registro»* — la stessa frase
con cui la fase motiva `venue_secret_locked` — applicata alla colonna gemella che
la guardia non copre.

**Fix.**

1. Nella server action, prima di `recordAct`, rifiutare per valore quando la
   serata non ha una sede collegata. `resolveNight` legge gia' la riga: basta
   portare `venue_id` nel `select` (`actions.ts:344-348`) e aggiungere un membro
   alla union dei rifiuti, con la sua frase in `REFUSAL_SENTENCE`:

   ```ts
   // actions.ts — accanto a `not_secret`
   | "no_venue_attached"
   ...
   if (resolved.night.venueId === null) {
     return { ok: false, reason: "no_venue_attached" };
   }
   ```

   Meglio ancora: la stessa guardia dentro `record_venue_reveal_act`, ramo
   `revealed`, come sesto rifiuto tipizzato — cosi' vale per qualunque futuro
   chiamante e non per il solo che esiste oggi.

2. Estendere la guardia della porta laterale da `venue_secret` a `venue_id`:

   ```ts
   // src/app/(admin)/admin/events/actions.ts — dove oggi confronta solo `secret`
   const venueChanged = (party.venue_id || null) !== stored.venueId;
   if (stored && stored.revealedAt !== null &&
       ((party.venue_secret ?? false) !== stored.secret || venueChanged)) { … }
   ```

   con `venue_id` aggiunto al `select` di `:799-801` e alla mappa
   `storedSecrecyByNightId`. Cambiare la sede di una serata gia' rivelata e' una
   **seconda pubblicazione**: o passa dal pannello e scrive un atto, o e'
   rifiutata.

3. Verifica (non esiste un test runner): `npm run build`, poi la procedura
   manuale scritta — creare una serata segreta senza sede, constatare che il
   bottone e' spento **e** che una chiamata diretta all'azione risponde con il
   nuovo rifiuto; poi, su una serata rivelata, tentare il cambio di sede dal form
   e leggere la frase di rifiuto attaccata alla notte giusta.

---

## Warnings

### WR-01: `venue_reveal_on_purchase` smette di significare qualcosa al confine di sicurezza

**File:** `supabase/migrations/20260810161000_venues_read_narrowed.sql:396-409`
(arm 3) contro `src/app/(public)/events/[slug]/page.tsx:180-185`

L'arm 3 concede l'indirizzo a chiunque abbia un biglietto per la serata (o un
master ticket per l'evento) **senza congiunzione con `venue_reveal_on_purchase`**.
Il predicato di pagina invece la mantiene. Il commento della migration dichiara
che l'arm 3 e' *«branch `:103` of today's predicate»*: non lo e' — quel ramo era
`venueRevealOnPurchase && (hasTicket || hasMaster)`, e l'arm ne lascia cadere un
congiunto.

**Scenario.** Una serata configurata con `venue_reveal_on_purchase = false` —
scelta deliberata: *il biglietto non sblocca l'indirizzo* — vende un biglietto. Il
titolare non vede l'indirizzo in pagina, ma chiama
`POST /rest/v1/rpc/venue_for_parties` con il proprio JWT (la funzione e'
`GRANT`ata a `authenticated`, `:492`) e lo legge subito, prima della finestra.
Poiche' in questo progetto *«la RLS e' il confine, la pagina e' UX»*, la bandiera
e' di fatto **non applicata**.

Non e' una regressione rispetto a oggi (oggi `venues_select_public` concede tutto
a tutti), ed e' compatibile con il gate riscritto — che dice *«biglietto o RSVP
subito»*. Resta un difetto: due verdetti sulla stessa domanda, la superficie
racconta una regola che il confine non applica, e la bandiera nel form promette
un controllo che non c'e'.

**Fix.** Decidere quale delle due e' la regola, e scriverla una volta sola. Se
resta quella del gate, allora `venue_reveal_on_purchase` va rimossa dal predicato
di pagina (o dichiarata esplicitamente come UX-only nel form). Se resta quella
del form, l'arm 3 diventa
`(ep.venue_reveal_on_purchase AND EXISTS (…tickets…))`. In entrambi i casi il
commento della migration va corretto: oggi afferma una equivalenza falsa.

### WR-02: `/events` spedisce `venue_secret_hint` di ogni serata segreta nel payload, a chiunque, e nessuno lo rende

**File:** `src/app/(public)/events/page.tsx:52-57,401-406` ·
`src/app/(public)/events/EventTabs.tsx:38-43` ·
`src/app/(public)/events/[slug]/SecretVenueDialog.tsx:83`

`EventTabs` e' `"use client"`, quindi ogni campo di `VenueInfo` viene
serializzato nel payload RSC e arriva al browser di ogni visitatore, anche
anonimo, per ogni serata della lista. La fase ha rimosso da quella stessa
interfaccia due campi morti — ed e' il lavoro giusto — ma ne ha lasciato un
terzo: `venue_secret_hint` e' dichiarato a `:42` e **non e' letto da nessuna
riga** del componente. L'unico rendering del venue e'
`v.venue_secret ? "Secret Venue" : v.venue_name ?? v.venue_text` (`:277-281`).

Due conseguenze:

1. Il docblock aggiunto dalla fase dichiara la pulizia completa e enuncia la
   regola *«A field added "for when we need it" is already published»*
   (`EventTabs.tsx:33-36`). Il campo accanto la viola.
2. **Le due superfici non concordano su chi puo' leggere l'indizio.** Sulla
   pagina di dettaglio l'indizio e' dietro `hint && isAuthenticated`
   (`SecretVenueDialog.tsx:83`): un anonimo non lo vede. Sulla lista arriva a
   tutti, senza sessione, leggendo il documento invece della pagina.

**Fix.** Togliere il campo dall'interfaccia client, o — se serve per un
rendering futuro — non farlo attraversare per le serate segrete finche' non c'e'
un renderer:

```ts
// src/app/(public)/events/page.tsx, dentro il push
venue_secret_hint: null,   // nessuna superficie della lista lo rende
```

E allineare la decisione su chi legge l'indizio: il modello a tre livelli dice
*«senza login: solo l'indizio»*, il dialogo dice *«accedi»*. Una delle due e' la
regola.

### WR-03: il cron classifica come «failure» ogni serata gia' completata, e affoga il segnale che conta

**File:** `src/app/api/cron/venue-reveal/route.ts:150-159` ·
`src/lib/venue-reveal/reveal-party-venue.ts:395-404`

Rimosso il filtro su `venue_reveal_email_sent` (D-37-21, corretto), il cron
rispazza ogni serata segreta dentro la banda temporale — tipicamente per due o
tre esecuzioni consecutive. Per una serata gia' interamente spedita
`collectRecipients` restituisce una mappa vuota, quindi `failureKind` vale
`"no_recipients"`, quindi la condizione `result.failureKind !== "none"` la
inserisce in `failures`.

Ma il modulo condiviso documenta a `:396-397` che `no_recipients` e'
*«INFORMATION, not a verdict»*. Il cron la tratta da verdetto. Poiche' la
risposta JSON e' **l'unico canale osservabile** che questo cron ha — non c'e'
error tracking — il risultato e' che il canale grida al lupo a ogni giro, e con
`MAX_REPORTED_FAILURES = 20` un `send_failed` o un `recipients_unavailable` veri
possono essere spinti fuori dalla lista da voci benigne.

**Fix.** Escludere `no_recipients` dalla lista dei fallimenti, o separarla in un
campo proprio, cosi' la distinzione che il modulo tiene sotto sopravvive sopra:

```ts
const REPORTABLE: VenueRevealFailureKind[] =
  ["send_failed", "recipients_unavailable", "party_not_found"];
if (REPORTABLE.includes(result.failureKind) && failures.length < MAX_REPORTED_FAILURES) { … }
```

Effetto osservabile della correzione: una risposta con `failures` vuota torna a
significare *«tutto e' partito»* invece di *«tutto e' partito, piu' tre serate che
non avevano nessuno»*.

### WR-04: l'istante della rivelazione e' reso nel fuso del browser, senza dichiararlo

**File:** `src/app/(admin)/admin/events/[id]/reveal/VenueRevealPanel.tsx:221,428`
· `src/utils/formatTime.ts:30-33`

`formatDateTime` usa `getHours()`/`getMinutes()`, cioe' il fuso del processo che
rende — e qui il componente e' `"use client"`, quindi **il fuso del telefono di
chi guarda**. Le due frasi che contano lo usano: *«Revealed on … by …»* (`:221`),
che e' la risposta alla seconda pressione di D-37-19, e ogni riga della traccia
(`:428`), che e' il registro di un atto irreversibile.

`time-and-scheduling.md`, gate *reso dove, con che ora*, nomina **la
rivelazione** fra i tre orari per cui il fuso va dichiarato accanto al valore. Uno
staff in trasferta con il telefono su un altro fuso legge l'ora sbagliata di un
atto che non torna indietro, e non ha modo di accorgersene.

**Fix.** Rendere l'istante in `EVENT_TIME_ZONE` e scrivere il fuso accanto. La
casa ha gia' il posto giusto — `src/utils/datetime.ts` — dove aggiungere un
`formatInstantInEventZone(iso): string` costruito su `Intl.DateTimeFormat` con
`timeZone: EVENT_TIME_ZONE`, invece di inline-are la conversione nel pannello
(che e' proprio la deriva a sei varianti che quel modulo esiste per chiudere).

### WR-05: `party_not_in_event` e' documentato come una protezione che non protegge

**File:** `src/app/(admin)/admin/events/[id]/reveal/actions.ts:146-161,380-382`

Il docblock del rifiuto afferma: *«Without this check the `eventId` in the
signature would be decoration and the service client — which bypasses every
row-level policy — would publish the address of a night belonging to somebody
else's event.»*

Non e' cosi'. **Entrambi** gli identificatori arrivano dal corpo della richiesta,
e `venue.reveal` non e' per-evento (D-37-13: ogni organizer approvato, su
qualunque serata). Chi vuole rivelare la serata di un evento altrui passa
semplicemente la coppia corretta, che e' leggibile da qualunque pagina pubblica.
Il controllo e' una verifica di coerenza fra due parametri, utile contro un bug
del chiamante, e non un confine.

`ai-engineering.md`, gate *un gate deve poter fallire*: un gate che nessuna
situazione raggiungibile viola *«non e' una guardia: e' una decorazione che fa
sembrare presidiato qualcosa che non lo e'»*. Qui e' peggio, perche' il commento
dice al prossimo lettore che il presidio esiste.

**Fix.** Riscrivere il paragrafo dicendo cosa il controllo fa davvero — impedisce
che una coppia incoerente arrivi al writer, e nega l'oracolo su quali uuid
nominano una serata reale — e aggiungere, dove oggi c'e' la frase falsa, che
**l'autorizzazione a rivelare non e' per-evento e questo e' voluto**. Se invece
si volesse che lo fosse, il posto e' `record_venue_reveal_act`, che gia' legge il
ruolo dell'attore e potrebbe leggere anche `events.created_by`.

### WR-06: un lotto respinto in modo non transitorio lascia fino a cento persone irraggiungibili da entrambi i percorsi

**File:** `src/lib/venue-reveal/reveal-party-venue.ts:419-488`

La marcatura per lotto e' la correzione giusta e la riconosco come tale. Ma
l'unita' di ritentativo e' rimasta il lotto: se `resend.batch.send` respinge la
richiesta (un solo destinatario problematico basta a far respingere l'intera
chiamata: e' una validazione all-or-nothing lato provider), **nessuno** dei
massimo cento viene marcato, e ogni ritentativo — il cron del giorno dopo, o la
pressione del bottone *«Send to the N still missing»* — ricompone lo **stesso**
lotto e incontra lo **stesso** rifiuto. Non esiste ripiego per-destinatario.

Con la versione precedente il problema non esisteva perche' il codice contava
tutto come spedito (che era il difetto opposto, giustamente rimosso). Oggi
l'operatore vede il numero — questo e' un miglioramento reale — ma non ha alcun
rimedio dentro il prodotto: preme, fallisce, preme, fallisce.

`profiles.email` e' `not null` (`supabase/schema.sql:56`), quindi il caso piu'
banale e' escluso; restano indirizzi soppressi lato provider, domini rifiutati e
rifiuti di validazione, che non si risolvono da soli.

**Fix.** Al secondo tentativo su un lotto, degradare a invii singoli, cosi' un
destinatario problematico ne blocca uno solo:

```ts
if (!delivered && batch.length > 1) {
  for (const one of batch) { /* stesso try/catch, batch di 1, marcatura di 1 */ }
}
```

In alternativa, se il ripiego non si vuole scrivere ora: registrarlo per iscritto
come debito noto **e** rendere l'effetto osservabile, perche' oggi la frase in
pagina dice *«pressing sends only to them»* e non dice che premere di nuovo
riprodurra' identicamente il rifiuto.

### WR-07: sulla stessa pagina, il quarto fallimento silenzioso — un errore di lettura dell'evento si legge come «evento inesistente»

**File:** `src/app/(public)/events/[slug]/page.tsx:337-341`

La fase ha separato con cura le due cause per la query delle serate
(`:408-415`) e per `venue_for_parties` (`:573-580`), con la stessa motivazione
scritta due volte: un rifiuto dal database porta un codice, non si aggiusta da
solo, e una pagina pubblica che ha perso silenziosamente i suoi dati e' *«una
bugia dall'aria sana»*. La lettura immediatamente sopra e' rimasta come stava:

```ts
const { data: event } = await eventQuery.single();
if (!event) { notFound(); }
```

L'errore e' scartato. Un rifiuto RLS, un `PGRST` qualunque o una policy cambiata
producono `event === null` e quindi **404**: la serata non esiste piu', per tutti,
e nessuno lo sa. E' la stessa forma dei tre difetti che questa fase ha chiuso,
sulla stessa pagina, due letture piu' su. Preesistente, ma la pagina e' stata
riscritta proprio su quell'asse ed e' il momento giusto per chiuderlo.

**Fix.** La forma e' gia' scritta due volte in questo file — copiarla:

```ts
const { data: event, error: eventError } = await eventQuery.single();
if (eventError && eventError.code && eventError.code !== "PGRST116") {
  console.error(`[event_detail.event_query_refused] ${eventError.code}: ${eventError.message}`);
  throw new Error(`[event_detail.event_query_refused] ${eventError.code}`);
}
if (!event) notFound();
```

(`PGRST116` e' «nessuna riga», che qui e' davvero un 404 e resta tale.)

### WR-08: la nuova osservabilita' di `updateVenue` arriva all'operatore come messaggio redatto, e finisce in «Something went wrong»

**File:** `src/app/(admin)/admin/venues/actions.ts:234-243` ·
`src/components/venues/EditVenueButton.tsx:68-70`

Trasformare un `.update().eq()` silenzioso in `.select("slug").single()` e' la
correzione giusta: prima un aggiornamento rifiutato dalla RLS rispondeva
`{ success: true }`. Ma la nuova causa esce come `throw` da una server action, e
Next **redige** il messaggio di un errore lanciato da una server action in build
di produzione — lo stesso fatto che
`src/app/(admin)/admin/events/[id]/reveal/actions.ts:57-63` documenta a lungo e
per il quale l'intero modulo della rivelazione restituisce valori tipizzati.

Il chiamante fa `setError(err instanceof Error ? err.message : "Something went
wrong")`: in produzione l'operatore legge il paragrafo generico di Next, e ogni
causa — rifiuto RLS, venue cancellata, guasto di rete — collassa in una schermata
sola. E' il precedente registrato in `.planning/codebase/CONCERNS.md`, raggiunto
da una porta nuova.

**Fix.** Allineare `updateVenue` alla forma che questa stessa fase ha adottato
altrove: restituire `{ ok: false, reason: … }` con un membro per causa
(`not_found_or_refused`, `write_failed`) invece di lanciare, e far scegliere a
`EditVenueButton` la frase dalla `Record` totale. Se il refactor non e' in
perimetro, come minimo distinguere `PGRST116` dal resto con due frasi scritte in
chiaro nel componente.

---

## Info

### IN-01: due export senza consumatori

`VENUE_REVEAL_PARTY_NOT_FOUND` (`src/lib/venue-reveal/reveal-party-venue.ts:109-114`)
e `VenueRevealActRow` (`src/types/database.ts:790-814`) non sono importati da
nessuna riga di `src/`. Il primo e' documentato come *«the one result a caller may
build by hand»* e nessun chiamante lo costruisce: il valore `party_not_found`
arriva invece dal writer. Entrambi sono difendibili come contratto scritto in
anticipo; vanno pero' collegati a un consumatore o dichiarati tali, altrimenti
sono la prima cosa che diverge dal comportamento reale.

### IN-02: `recipients_intended` puo' superare il numero effettivamente raggiungibile

`revealVenueNow` conta **senza** limite temporale (`actions.ts:770-771`) e poi
spedisce **con** `createdBefore` (`:791-795`). Le righe con `created_at` NULL
sono quindi contate e non spedite (`reveal-party-venue.ts:133-137` lo dichiara).
La traccia registra un `recipients_intended` piu' alto del reale e il dialogo
dira' «N di M» con M gonfiato, senza che il bottone resti mai acceso (il conteggio
dei mancanti applica lo stesso limite). Improbabile — le due colonne hanno
`default now()` — ma il numero e' quello che finisce in un registro append-only.

### IN-03: `/events` resta fuori dalla regola `NetworkOnly` del service worker

`src/app/sw.ts:112` filtra su `url.pathname.startsWith("/events/")`, che **non**
copre `/events` senza barra. La lista e' pero' la superficie che
`src/app/(public)/events/page.tsx:10-28` dichiara `force-dynamic` invocando
proprio il gate *cache e pre-render* di `venue-secrecy.md`, e resta servibile da
Cache Storage per 24 ore. L'impatto misurato e' basso: per una serata segreta la
lista rende sempre `Secret Venue` e mai il nome (`EventTabs.tsx:277-281`), quindi
una copia stantia non espone alcun indirizzo. Lo segnalo perche' la
giustificazione scritta sulla pagina e la copertura effettiva del worker non
coincidono, e la prossima persona leggera' la prima.

---

_Revisionato: 2026-08-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Profondita': deep_
