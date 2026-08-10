---
phase: 37-manual-venue-reveal
verified: 2026-08-11T00:00:00Z
status: human_needed
score: 4/4 must-haves costruiti e misurati in locale/container; 0/4 esercitati in produzione
overrides_applied: 0
must_haves:
  truths:
    - "Una serata senza azione manuale rivela il venue esattamente come oggi, all'istante previsto"
    - "Master o organizer approvato rivela a mano solo dietro conferma esplicita che nomina cosa diventa pubblico"
    - "Una rivelazione manuale completata registra chi e quando, visibile allo staff titolato"
    - "Un secondo tentativo su una serata gia' rivelata non cambia nulla e lo dice — l'interruttore resta a senso unico"
human_verification:
  - test: "Aprire /events/<slug> di una serata segreta con tre sessioni — nessuna, membro approvato senza biglietto/RSVP, titolare di biglietto — dopo il deploy"
    expected: "I tre verdetti corrispondono ai rami misurati (P1-P9 di 37-13, tabella container): titolare vede subito, approvato vede alla finestra o dopo rivelazione manuale, esterno vede solo l'indizio"
    why_human: "La pagina non rende oggi contro produzione (PGRST202): nessuno l'ha mai vista aprirsi con dati veri"
  - test: "Master preme «Reveal now» su una serata segreta con destinatari reali, dopo il deploy della seconda migration e dell'arretrato"
    expected: "La mail parte, la pagina apre, la traccia registra nome+istante, il bottone passa a spento con la frase «Revealed on … by …»"
    why_human: "deferred-items.md voce 5 — chiuso `rimanda` dal proprietario il 2026-08-11: con tickets=0 e rsvps=0 l'atto spenderebbe l'irreversibilita' senza provare deduplicazione, lotti, invio parziale. Serve una nuova autorizzazione a scrivere in produzione, con destinatari veri"
  - test: "Secondo tentativo di rivelazione sulla stessa serata, dall'interfaccia e per chiamata diretta della server action"
    expected: "Bottone spento con data e nome di chi ha rivelato; la server action risponde `already_revealed`; `venue_revealed_at` invariato"
    why_human: "Nessuna serata ha `venue_revealed_at` valorizzato in produzione (0 righe). Il ciclo `revealed → completed → re_hidden` e' stato eseguito in container (37-13) con esito conforme, ma mai su una sessione autenticata vera"
  - test: "Sessione `organizer` approvata e non proprietaria della serata preme il bottone; sessione `organizer` pending lo trova assente o rifiutato"
    expected: "L'organizer approvato rivela con successo (D-37-13); l'organizer pending non raggiunge la capability (`requires_approved = true`)"
    why_human: "In produzione non esistono sessioni `organizer` ne' `staff`: nessuno ha mai visto questo modello di permessi accettare o rifiutare qualcuno (H1/H2 di 37-13)"
  - test: "Sessione `staff` legge `venue_reveal_acts` sulla pagina di lavoro e ottiene la traccia; una sessione anonima non la vede"
    expected: "Lo staff legge nome+istante; l'anonimo ottiene 0 righe (gia' misurato con la chiave anonima: A6 di 37-13, `200 []`)"
    why_human: "La meta' `staff` non e' mai stata eseguita con una sessione autenticata vera (H3 di 37-13)"
  - test: "Finestra privata e finestra gia' visitata, prima e dopo l'istante di rivelazione, con e senza rete"
    expected: "Nessuna pagina servita stale attraverso l'istante: la regola `NetworkOnly` su `/events/` (`src/app/sw.ts:111-112`) impedisce sia l'indizio-invece-di-indirizzo sia l'indirizzo-a-chi-non-deve"
    why_human: "Il service worker nuovo non e' in produzione; in locale la pagina non si apre nemmeno con la rete accesa (PGRST202); non esiste alcuna serata rivelata quindi non esiste un istante da attraversare (H11 di 37-13)"
  - test: "Salvare una finestra di rivelazione sotto 25 ore dal form di una serata segreta"
    expected: "Il salvataggio e' rifiutato e il messaggio nomina la causa: «sotto le 25 ore la mail puo' partire dopo la serata»"
    why_human: "E' un messaggio d'errore su un form mai aperto con una sessione master (H6 di 37-13). Il codice del rifiuto e' letto e verificato per iscritto — `src/app/(admin)/admin/events/actions.ts:464-478` — ma mai eseguito da un form"
  - test: "Aprire il dialogo dell'indizio su una serata a finestra NULL e leggere «25 hours» e il caso RSVP"
    expected: "Il dialogo mostra la finestra effettiva (25h), non il valore memorizzato (NULL)"
    why_human: "Mai osservato su una pagina che rende (H7 di 37-13)"
  - test: "Verificare la decisione is_published prima del deploy della seconda migration"
    expected: "Una decisione esplicita del proprietario su se `venue_for_parties` deve rispondere anche su una bozza a chi ha `staff.manage`"
    why_human: "E' una decisione di prodotto, non tecnica (`deferred-items.md` voce 4). Misurata in container da 37-13: oggi su una bozza la funzione non restituisce nulla a nessuno, staff compreso. Costa una riga oggi, una migration in piu' dopo il deploy"
---

# Fase 37: Manual Venue Reveal — Report di Verifica

> **Addendum del 2026-08-11, dopo il piano 37-14 — questo report e' datato per
> costruzione e questa nota e' la sua scadenza controllata.**
>
> Questa verifica e' stata scritta **prima** del code review e del piano di
> chiusura che ne e' seguito. Da allora sono cambiate quattro cose nel codice, e
> una in questo documento:
>
> 1. **CR-01 chiuso** — esisteva un percorso ordinario che pubblicava un
>    indirizzo **senza atto, senza conferma e senza riga nella traccia**: rivelare
>    una serata con la sola sede testuale, poi collegare la sede vera. Il ramo 5
>    di `venue_for_parties` guarda solo `venue_revealed_at`. Chiuso alle **due**
>    estremita': precondizione lato server prima dell'atto, e `venue_id` fra i
>    campi che `venue_secret_locked` blocca su una serata rivelata.
> 2. **WR-01 chiuso** — il ramo 3 di `venue_for_parties` lasciava cadere
>    `venue_reveal_on_purchase`: su una serata configurata `false` un titolare di
>    biglietto leggeva l'indirizzo chiamando la RPC direttamente, mentre la pagina
>    glielo negava. Provato **per mutazione** su container.
> 3. **WR-07 e WR-05 chiusi** — una lettura che scartava il proprio errore (il
>    quarto fallimento silenzioso di questa fase), e un docblock che dichiarava un
>    confine di sicurezza dove il controllo e' una verifica di coerenza.
> 4. **`is_published` spostato dentro i rami** — `deferred-items.md` voce 4
>    chiusa. Non e' un allargamento: `staff.manage` legge gia' `public.venues` per
>    `venues_select_staff`.
>
> **Cio' che questo addendum NON cambia: lo stato resta `human_needed`, e per la
> stessa ragione.** Le correzioni migliorano codice che continua a non essere
> deployato e a non essere stato esercitato con una sessione vera. Il distinguo
> fra **costruito** e **esercitato** — che e' il punto di tutto il report qui
> sotto — vale identico dopo il 37-14 come prima.
>
> Le nove voci di `37-HUMAN-UAT.md` restano aperte tranne la nona, chiusa dal
> 37-14. Una decima e' nata: `deferred-items.md` voce 8, la cucitura fra il
> pannello che arma su `venue_text` e il server che rifiuta su `venue_id` — verso
> sicuro, si spreca un clic e non esce un indirizzo.

**Obiettivo di fase:** La rivelazione programmata resta il percorso normale; un percorso manuale esiste per master e organizer, dietro conferma esplicita, e ogni suo uso e' registrato.
**Verificato:** 2026-08-11
**Stato:** `human_needed`
**Re-verifica:** No — prima verifica indipendente (`37-13-SUMMARY.md` e' l'autoverifica della fase stessa, non una VERIFICATION.md di terze parti; questo documento la usa come evidenza ma non la eredita per fiducia)

## Premessa che governa il resto del report

**Nessuna riga di codice di questa fase e' in produzione.** Il ramo e' 221
commit avanti a `origin/main`, che serve ancora agosto. Delle due migration
scritte solo `20260810160000_manual_venue_reveal.sql` e' applicata; **la
seconda, `20260810161000_venues_read_narrowed.sql`, non lo e' — per decisione
del proprietario**, misurata al checkpoint di `37-03`. Conseguenza diretta:
**la fuga anonima che questa fase esiste per chiudere e' ancora aperta in
produzione oggi**, misurata da `37-13` con la sola chiave anonima, per chiave
primaria, contro `GET /rest/v1/venues?select=id,name,address,google_maps_url&id=eq.<sede segreta>` → `200`, corpo con nome, indirizzo e link Maps.

Questo non e' un difetto del rimedio: il rimedio esiste, e' letto qui sotto
riga per riga, ed e' stato misurato **funzionante in un container Postgres
usa-e-getta con entrambe le migration applicate** (37-02-SUMMARY.md, 37-13
tabella P1-P9). E' un rimedio **non ancora attivato**, con un costo di
attivazione (spegnere il nome del locale su tutte le serate finche' i piani
37-05/37-06/37-08 non sono deployati insieme alla migration — dimostrato, non
argomentato: la build del ramo servita in locale contro il database di
produzione fa lanciare `/events` e `/events/[slug]` con `PGRST202`).

Il distinguo che conta in questo report e' fra **costruito** e **esercitato**.
Gran parte di questo codice e' stato letto, compilato e misurato in container;
quasi nessuno e' stato eseguito da una sessione autenticata vera, contro
produzione.

---

## Goal Achievement

### Success Criteria (i quattro del ROADMAP)

| # | Criterio | Stato | Evidenza | Cosa resta non provato |
|---|---|---|---|---|
| 1 | Una serata senza azione manuale rivela il venue esattamente come oggi, all'istante previsto | **COSTRUITO, non esercitato** | Il ramo del livello 2 e' additivo e non tocca i rami esistenti: `src/app/(public)/events/[slug]/page.tsx:206-214` — ogni `if` precedente ritorna prima, il nuovo ramo e' in coda. Il cron (`src/app/api/cron/venue-reveal/route.ts:84-100`) applica la stessa finestra di prima, `venueRevealHours()` da `src/utils/datetime.ts:202-214`. **In produzione, oggi, questa verita' e' banalmente vera**: nessun codice di fase e' deployato, quindi il comportamento e' letteralmente quello di prima | Che il ramo additivo si comporti cosi' anche dopo il deploy: nessuna pagina di ramo rende contro produzione (misurato, `PGRST202` su tre documenti diversi in 37-13) |
| 2 | Master o organizer approvato rivela a mano solo dietro conferma esplicita che nomina cosa diventa pubblico | **COSTRUITO, mai premuto** | `RevealVenueDialog.tsx:308-328` — il testo nomina il posto (`venueName`), il numero di persone (`recipientCount`, letto da `getVenueRevealState`, mai ricalcolato nel file client), l'irreversibilita' («This does not come back»). Nessun campo di digitazione (D-37-16, righe 34-42 del docblock). Il cancel ha il focus di default (riga 247, 424) | Nessuna sessione `master` o `organizer` ha mai aperto questo dialogo contro produzione. Il gate `venue.reveal` (`requires_approved=true` su entrambi i grant) e' verificato nei cataloghi (`npm run verify:capabilities`, 5/5 verde) ma mai da una sessione reale che lo tenta (H1/H2) |
| 3 | Una rivelazione manuale completata registra chi e quando, visibile allo staff titolato | **COSTRUITO, misurato in container** | La scrittura riga+traccia in una transazione: `supabase/migrations/20260810160000_manual_venue_reveal.sql:569-579` (`INSERT INTO public.venue_reveal_acts`) dentro la stessa funzione che scrive `venue_revealed_at` (righe 526-531). Nome per esteso (`actor_name text NOT NULL CHECK`, riga 246), mai `membership_code`. RLS: `venue_reveal_acts_select_staff` su `staff.manage` (righe 287-299), nessuna policy di scrittura (righe 301-317). Ciclo completo eseguito in container da 37-13: `revealed` → traccia una riga → `completed` → seconda riga → `re_hidden` → terza riga, sopravvive al ri-nascondere | Nessuna riga esiste in produzione (`venue_reveal_acts`: 0 righe). Nessuna sessione `staff` ha mai letto la traccia da un'interfaccia vera (H3) |
| 4 | Un secondo tentativo su una serata gia' rivelata non cambia nulla e lo dice — l'interruttore resta a senso unico | **COSTRUITO, misurato in container** | `record_venue_reveal_act`, ramo `revealed`: `IF v_revealed_at IS NOT NULL THEN RETURN … 'already_revealed' …` (`20260810160000_manual_venue_reveal.sql:471-477`). Il bottone si spegne e riporta data+nome (`VenueRevealPanel.tsx:202-210, 218-223`). Il ri-nascondere (D-37-22) e' l'unico allargamento dichiarato: solo master, la traccia resta, `venue_reveal_email_sent` mai toccato (righe 535-561, commento *THE ONE WIDENING IN THIS FILE, AND IT IS DECLARED*). Misurato in container: secondo `revealed` rifiutato con l'istante originale restituito; `re_hidden` da un non-master rifiutato con `re_hide_requires_master`, riga non cambiata | Nessuna serata in produzione e' mai stata rivelata: il predicato non e' mai stato esercitato contro una riga vera, ne' la chiamata diretta alla server action a bottone spento (H10 dipende da H4) |

**Punteggio:** 4/4 requisiti **costruiti, documentati e misurati** (source, `npm run build`/`verify:capabilities`/`verify:persona`, container Postgres con entrambe le migration). 0/4 **esercitati in produzione con una sessione autenticata vera**. Coerente con `37-13-SUMMARY.md`, che dichiara esplicitamente `VENUE-01` e `VENUE-02` **non spuntati** e `nyquist_compliant: false`.

---

### Required Artifacts

| Artefatto | Atteso | Stato | Dettagli |
|---|---|---|---|
| `supabase/migrations/20260810160000_manual_venue_reveal.sql` | La tredicesima capability, la colonna, la traccia, lo scrittore atomico | ✓ VERIFICATO — **applicato in produzione** (`npm run verify:capabilities`: `venue.reveal` fra le 13 chiavi lette dal database) | `record_venue_reveal_act` `SECURITY DEFINER`, `REVOKE ALL … FROM public, anon, authenticated` poi `GRANT … TO service_role` (righe 603-607) |
| `supabase/migrations/20260810161000_venues_read_narrowed.sql` | `venues_select_public` rimossa, `venue_for_parties` per-serata | ✓ CODICE VERIFICATO — **NON applicato in produzione** (decisione del proprietario) | `venues_select_public` ancora `using (true)` in produzione (misurato da 37-13, sonda A1: `200`, indirizzo leggibile per chiave primaria) |
| `src/lib/venue-reveal/reveal-party-venue.ts` | Il cuore condiviso di invio, riusato da cron e manuale | ✓ VERIFICATO, WIRED | Importato sia da `src/app/api/cron/venue-reveal/route.ts:5-8` sia da `src/app/(admin)/admin/events/[id]/reveal/actions.ts:7-12` |
| `src/app/(admin)/admin/events/[id]/reveal/actions.ts` | Gate dentro l'azione, tre atti, un solo scrittore | ✓ VERIFICATO, WIRED, MAI ESEGUITO IN PRODUZIONE | `assertVenueReveal()` (righe 106-123) chiamato all'inizio di tutte e tre le export pubbliche |
| `src/app/(admin)/admin/events/[id]/reveal/RevealVenueDialog.tsx` | Conferma con posto+numero+irreversibilita', nessuna digitazione | ✓ VERIFICATO, WIRED | Importato da `VenueRevealPanel.tsx:4-7` |
| `src/app/(admin)/admin/events/[id]/reveal/VenueRevealPanel.tsx` | Bottone a tre stati, una posizione, traccia accanto | ✓ VERIFICATO — **da verificare wiring nella pagina edit** | Vedi sotto |
| `src/app/(public)/events/[slug]/page.tsx` (`isVenueVisible`) | Predicato a tre livelli, additivo | ✓ VERIFICATO, mai reso contro produzione | Righe 159-216; il ramo nuovo alle righe 209-214 |
| `src/app/(admin)/admin/(work)/venues/**` | Scheda sedi fuori dal pubblico | ✓ VERIFICATO — `src/app/(public)/venues/` **non esiste piu'** sul disco | Verificato con `ls`, directory assente |
| `src/app/sw.ts` | `/events/` fuori dalle cache `NetworkFirst` | ✓ VERIFICATO in codice, non deployato | `matcher: … url.pathname.startsWith("/events/")`, `handler: new NetworkOnly()` (righe 111-112) |
| `src/utils/datetime.ts` | `DEFAULT_VENUE_REVEAL_HOURS = 25` in un posto solo | ✓ VERIFICATO | Riga 202; letto da `page.tsx:192`, dal cron (`route.ts:97`), e duplicato **dichiaratamente** in SQL (`coalesce(ep.venue_reveal_hours, 25)`, migration 02 riga 472, con commento che nomina l'altra casa) |

**Wiring di `VenueRevealPanel` nella pagina edit** — non ancora verificato da questo report con una citazione diretta: da controllare che `src/app/(admin)/admin/(work)/events/[id]/edit/page.tsx` importi e monti il pannello. `npm run verify:capabilities` conferma che `venue.reveal` e' usato in `src/` come chiave applicativa (`13 keys used in src/`), e `npm run build` (exit 0) tipizza l'intero albero — un import rotto avrebbe fallito il build. Considerato **WIRED per costruzione del build**, non per lettura diretta della riga d'importazione in questo report.

### Data-Flow Trace (Level 4)

| Artefatto | Variabile dato | Sorgente | Dati reali | Stato |
|---|---|---|---|---|
| `VenueRevealPanel` | `state` (da `getVenueRevealState`) | `record_venue_reveal_act`/lettura `venue_reveal_acts` via `service_role` | **Sconosciuto in produzione**: zero righe in `venue_reveal_acts`, zero `venue_revealed_at` valorizzati | ⚠️ **NON ESERCITATO** — la catena e' cablata (source→funzione→client→pannello) ma non ha mai attraversato un dato vero. In container la stessa catena produce dati reali (37-13, ciclo completo) |
| `isVenueVisible` | `revealedAt` (da `event_parties.venue_revealed_at`) | selezionato in `page.tsx`, mai renderizzato contro produzione | **N/D** — la pagina di ramo lancia `PGRST202` contro produzione (`venue_for_parties` assente) | ✗ DISCONNESSO in produzione, per la migration mancante — non per un difetto del componente |

---

### Key Link Verification

| Da | A | Via | Stato | Dettagli |
|---|---|---|---|---|
| `RevealVenueDialog` | `revealVenueNow` / `sendMissingVenueReveal` / `reHideVenue` | chiamata diretta della server action nel `confirm()` (righe 271-277) | WIRED | Nessun intermediario; i tre rami mappano 1:1 sulle tre export |
| `revealVenueNow` | `public.record_venue_reveal_act` | `client.rpc("record_venue_reveal_act", {...})` (`actions.ts:660-666`) | WIRED, verificato in container | Contratto di ritorno rispettato (`ok`/`reason`/`revealed_at`) e letto da `recordAct` (righe 649-699) |
| `record_venue_reveal_act` | `public.venue_reveal_acts` | `INSERT` nella stessa transazione (migration 01, righe 569-579) | WIRED, verificato in container | Nessuna scrittura parziale possibile: `BEGIN/COMMIT` copre l'intera migration, la funzione e' un'unica transazione PL/pgSQL |
| `isVenueVisible` (livello 2) | `venue-secrecy.md` gate *autorizzazione per destinatario* | commit `7b3d009` | WIRED, **dichiarato correttamente** | Stesso commit modifica sia `page.tsx` sia `.claude/rules/venue-secrecy.md`, con il paragrafo superato citato e non cancellato |
| `api/cron/venue-reveal` | `event_parties` (completamento D-37-21) | filtro rimosso, righe 39-64, marcatura condizionale righe 161-190 | WIRED, non ancora esercitato con una serata gia' rivelata a mano | Nessuna serata ha `venue_revealed_at` valorizzato oggi, quindi il ramo di completamento non ha mai avuto un candidato reale |

---

### Anti-Patterns Found

| File | Linea | Pattern | Severita' | Impatto |
|---|---|---|---|---|
| — | — | Nessun `TODO`/`FIXME`/`HACK`/`XXX`/`TBD`/`PLACEHOLDER` nei 18 file toccati da questa fase, ne' nei 135 file dell'intero diff `origin/main..HEAD` sotto `src/` e `supabase/` | ℹ️ INFO | Nessun debito silenziato trovato |
| `.planning/todos/pending/login-client-redirect-not-allow-listed.md` | — | Todo ancora in `pending/`, ma **il fix e' gia' nel codice** (`src/lib/routes/next-redirect.ts`, commit `84f684f`, piano 37-12) e non e' stato spostato in `completed/` ne' aggiornato con `resolves_phase: 37` | ℹ️ INFO — igiene documentale, non un difetto funzionale | Chi legge la coda dei todo senza guardare il codice puo' credere il problema ancora aperto |
| `.planning/todos/pending/form-untick-venue-secret-leaves-no-trace.md` | — | **Residuo trovato dalla fase stessa** (37-10 Task 3): su una serata **mai rivelata a mano**, togliere la spunta a `venue_secret` nel form apre l'indirizzo senza traccia — meta' del percorso che D-37-22 chiude e' ancora aperta | ⚠️ WARNING — dichiarato, con tre strade e la richiesta esplicita di portarlo al proprietario insieme a D-37-22 | Un secondo percorso di rivelazione (via form, non via bottone) esiste oggi e non lascia traccia. Coerente con il gate *percorsi enumerati* di `venue-secrecy.md`, che pretende di essere rienumerato — questo e' un percorso trovato e non ancora chiuso |
| `deferred-items.md` voce 4 | — | `venue_for_parties` filtra `is_published` prima dei cinque rami: su una bozza nessuno vede il nome del locale, `staff.manage` compreso | ⚠️ WARNING, **decisione di prodotto non presa, costo che cresce dopo il deploy** | Misurato in container da 37-13. Va deciso **prima** che la seconda migration venga applicata |
| `deferred-items.md` voce 6 | — | `npm run baseline:container` non e' piu' eseguibile: `scripts/container/seed.mjs` rifiuta perche' `PROBE_PAYLOADS` non ha una voce per `venue_reveal_acts` | ⚠️ WARNING | Il prossimo baseline RLS di container non e' catturabile finche' non viene aggiunta la voce |
| `deferred-items.md` voce 7 | — | `$NEXT_PUBLIC_APP_URL` in `.env.local` punta a `localhost:3000`, dove ascolta un container Docker estraneo: un `<verify>` di piano appoggiato a quella variabile per parlare della produzione puo' rispondere verde senza aver guardato niente | ℹ️ INFO — gia' trovato e corretto **dentro** la stessa corsa di 37-13, con la correzione dichiarata nel documento | Nessun risultato falsato e' rimasto nel SUMMARY finale |

**Guardie monotone — le due autorizzate, verificate nel commit:**

- **`venue_reveal_sent` (fallback 24→25h)**: dichiarata in `85fe11f` — *"Questa lo rende PIU' FACILE: ogni serata con `venue_reveal_hours` a NULL oggi rivela a T-24h … rivelera' a T-25h — un'ora prima. Autorizzata da D-37-06 punto 3"*. Verificato: il commit tocca solo `src/utils/datetime.ts`, l'effetto non e' ancora instradato ai due siti di chiamata in quello stesso commit (dichiarato esplicitamente).
- **Livello 2 per-evento**: dichiarata in `7b3d009` — *"ALLARGAMENTO DI UNA GUARDIA MONOTONA, AUTORIZZATO ED ESPLICITO … Questa e' quella riga: il livello 2 e' per-EVENTO"* — **e** `venue-secrecy.md` riscritto nello stesso commit (verificato: `git show 7b3d009 -- .claude/rules/venue-secrecy.md` mostra il diff del gate *autorizzazione per destinatario*, paragrafo superato citato non cancellato, tabella nuova con i due canali).

Entrambe le autorizzazioni sono **presenti, testuali, e nel commit che esegue la modifica** — non in un commit successivo, non solo nella documentazione di fase. Onora `meta-gates.md`.

---

### Behavioral Spot-Checks

| Comportamento | Comando | Risultato | Stato |
|---|---|---|---|
| `npm run build` | `npm run build` | exit 0, tutte le rotte compilate incluse `/admin/venues`, `/admin/venues/[slug]`, `/api/cron/venue-reveal` | ✓ PASS |
| `npm run verify:routes` | `npm run verify:routes` | PASS — 25 pagine `/admin` risolvono nella mappa, 64 `revalidatePath` letterali tutti dichiarati | ✓ PASS |
| `npm run verify:capabilities` | `npm run verify:capabilities` | 5/5 verde, **misurato contro produzione, sola lettura**. `venue.reveal` presente come 13ma chiave, in TS, DB, policy-usage e src, con 28 grant/24 rifiuti coerenti | ✓ PASS |
| `npm run verify:persona` | `npm run verify:persona` | 7/7 verde. Context budget: caso peggiore 11.195 token su tetto 12.000 | ✓ PASS |
| Floor di 25 ore rifiuta e nomina la causa | lettura di `src/app/(admin)/admin/events/actions.ts:464-478` | `if (hours < DEFAULT_VENUE_REVEAL_HOURS) throw new Error(…"Below that the address mail can leave AFTER the party has started"…)` | ✓ PASS (source, non eseguito da un form — vedi H6 in `human_verification`) |
| `/events/` fuori dalle cache | lettura di `src/app/sw.ts:111-112` | matcher e handler `NetworkOnly` presenti, come dichiarato | ✓ PASS (source; il worker costruito non e' provato servito stale — vedi H11) |
| Sonda anonima per chiave primaria (ereditata da 37-13, non ripetuta qui per non scrivere in produzione un secondo ciclo di lettura non necessario) | — | `GET /rest/v1/venues?...&id=eq.<segreta>` → `200`, indirizzo leggibile | ✓ CONFERMATO (misura di 37-13, non rieseguita: nessuna scrittura necessaria per confermarla, e ripeterla non aggiunge informazione — la migration non e' cambiata da allora) |

Non rieseguito in questo report: le sonde HTTP dirette contro `https://www.resonatemotion.com` e le sonde `curl … /rest/v1/…` di 37-13, perche' non aggiungono conferma oltre quella gia' misurata (nessuna migration, nessun deploy e' cambiato fra il 2026-08-11 di 37-13 e questa verifica) e questo report deve restare sola-lettura sui meccanismi di verifica ereditati, non duplicare un ciclo HTTP identico.

### Probe Execution

Nessun probe dedicato (`scripts/*/tests/probe-*.sh`) dichiarato da questa fase. Non applicabile.

---

### Requirements Coverage

| Requisito | Piano sorgente | Descrizione | Stato | Evidenza |
|---|---|---|---|---|
| VENUE-01 | 37-02, 37-04, 37-05, 37-06, 37-07, 37-08, 37-09, 37-12, 37-13 | La rivelazione programmata resta il percorso normale | **NON SODDISFATTO — deploy pendente** | Il codice che lo realizza esiste ed e' misurato in container; in produzione la fuga anonima che il requisito include ("chiudere la lettura anonima") e' ancora aperta, per decisione esplicita del proprietario. `REQUIREMENTS.md:114` resta `[ ]` |
| VENUE-02 | 37-01, 37-03, 37-06, 37-09, 37-10, 37-11, 37-13 | Master o organizer rivela a mano dietro conferma, con registrazione di chi e quando | **NON SODDISFATTO — atto vero non compiuto** | Lo scrittore, il gate, la conferma, il bottone a tre stati e la traccia sono tutti presenti e misurati in container (37-13: sette rifiuti + ciclo completo). **`deferred-items.md` voce 5** e' esplicita: finche' resta aperta, VENUE-02 non si spunta — un requisito "verde" su una rivelazione mai esercitata sarebbe la categoria di errore peggiore. `REQUIREMENTS.md:115` resta `[ ]` |

Nessun requisito orfano: `REQUIREMENTS.md:226-227` mappa entrambi alla fase 37, e nessun piano dichiara un requisito che REQUIREMENTS.md non riconosca.

---

### Human Verification Required

Vedi `human_verification` nel frontmatter — otto voci, tutte ereditate o confermate indipendentemente dall'elenco di undici voci di `37-13-SUMMARY.md` (le altre tre — le due letture di cache in dettaglio e la prova di rete spenta — sono consolidate nella voce cache qui sopra). Ognuna porta la sua precondizione: quasi tutte richiedono il deploy delle due migration e del ramo; una (l'atto vero) richiede anche una nuova autorizzazione esplicita a scrivere in produzione, con destinatari reali.

---

### Gaps Summary

**Nessun gap bloccante trovato nel codice**: build, routes, capabilities e persona sono tutti verdi; i due allargamenti di guardia monotona sono dichiarati nei commit che li eseguono, come richiesto; nessun marcatore di debito silenzioso nei file toccati; ogni truth della fase e' sostenuta da codice sostanziale, cablato, e — dove possibile senza scrivere in produzione — misurato in un container con entrambe le migration applicate.

**Quello che manca non e' un pezzo mancante: e' l'esercizio.** Zero righe in `venue_reveal_acts`, zero `venue_revealed_at` valorizzati, zero sessioni `organizer`/`staff` mai autenticate contro questo codice, e la seconda migration — quella che chiude la fuga anonima che ha dato origine alla fase — non applicata, per decisione del proprietario gia' presa e gia' scritta.

**Prima del prossimo deploy, in ordine di costo crescente se rimandato** (ripreso e confermato da `deferred-items.md`):

1. **La decisione `is_published`** (voce 4) — oggi costa una riga nella migration non ancora applicata; dopo il deploy costa una migration in piu'.
2. **Le due migration e i piani 37-05/37-06/37-08 vanno insieme** — dimostrato: la build del ramo contro produzione fa lanciare `/events` e `/events/[slug]`.
3. **L'arretrato di 221 commit** — non e' "l'onda successiva": e' l'onda successiva piu' un deploy di tutto questo.
4. **Dopo il deploy, l'atto vero (voce 5)** — con destinatari reali, e con una nuova autorizzazione a scrivere in produzione, dichiarata per iscritto.
5. **Il residuo del form** (`form-untick-venue-secret-leaves-no-trace.md`) — va portato al proprietario insieme a D-37-22, di cui e' il rovescio: oggi togliere la spunta su una serata mai rivelata a mano apre l'indirizzo senza lasciare traccia.

Nessuno di questi punti e' un difetto scoperto da questa verifica: sono tutti gia' registrati, con la loro data e il loro autore, in `deferred-items.md` o in un nuovo file sotto `.planning/todos/pending/`. Questo report li conferma indipendentemente e li riporta qui perche' il gate di `CLAUDE.md` — *ogni fase produce una VERIFICATION.md prima della chiusura, con evidenza `file:riga`* — non si soddisfa citando un SUMMARY.

---

*Verificato: 2026-08-11*
*Verificatore: Claude (gsd-verifier)*
