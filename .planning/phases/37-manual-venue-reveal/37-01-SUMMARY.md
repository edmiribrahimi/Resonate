---
phase: 37-manual-venue-reveal
plan: 01
subsystem: capability-model-and-venue-reveal-trace
tags: [migration, rls, capability, venue-secrecy, security-definer, append-only]
requires:
  - private.capabilities / private.role_capabilities (20260807000000_capability_model.sql)
  - private.has_capability (idem)
  - public.event_parties, public.events, public.profiles
provides:
  - capability `venue.reveal` (CAP.VENUE_REVEAL) — la tredicesima
  - public.event_parties.venue_revealed_at
  - public.venue_reveal_acts (append-only, una policy SELECT, zero policy di scrittura)
  - public.record_venue_reveal_act(uuid, text, uuid, text, integer) RETURNS jsonb
affects:
  - 37-03 (applica le migration e allinea src/types/database.ts)
  - 37-10 (la server action legge i cinque codici di rifiuto)
  - 37-11 (il bottone a tre stati legge venue_revealed_at e la traccia)
tech-stack:
  added: []
  patterns:
    - "scrittore SECURITY DEFINER con REVOKE prima di GRANT, come assignment_acts.sql"
    - "traccia append-only per assenza di percorso di scrittura, come membership_acts"
    - "rifiuto tipizzato come valore di ritorno jsonb invece che come eccezione"
key-files:
  created:
    - supabase/migrations/20260810160000_manual_venue_reveal.sql
  modified:
    - src/lib/capabilities/keys.ts
    - src/lib/routes/capability-routes.ts
    - scripts/verify-capabilities.mjs
decisions:
  - "D-37-14 implementata: chiave nuova con requires_approved = true su entrambi i grant, invece di riusare staff.manage, catalogue.manage o party.manage"
  - "I rifiuti dello scrittore sono valori di ritorno e non eccezioni, perche' error.details di PostgREST porta la riga di event_parties, cioe' l'indirizzo"
  - "Il ruolo dell'attore si legge dentro la funzione da public.profiles, mai come argomento"
  - "Task 1 e Task 2 hanno prodotto due commit sullo stesso file, ognuno con un'intestazione coerente con cio' che contiene"
  - "scripts/verify-capabilities.mjs aggiornato fuori dal perimetro dichiarato del piano (Rule 2), perche' senza quella modifica il criterio di successo di 37-03 e' irraggiungibile"
metrics:
  duration: ~35 min
  tasks: 3
  commits: 3
  files-created: 1
  files-modified: 3
  completed: 2026-08-10
---

# Phase 37 Plan 01: Il modello nel database della rivelazione manuale — Summary

La tredicesima capability, la colonna che rende osservabile l'atto, la traccia
append-only che lo attribuisce, e lo scrittore `SECURITY DEFINER` che fa le due
scritture in una transazione — con i rifiuti tipizzati come valori, perche' un
rifiuto che passa da `error.details` restituirebbe la riga che porta
l'indirizzo.

## Cosa esiste adesso che prima non c'era

| Oggetto | Dove | Cosa risolve |
|---|---|---|
| `venue.reveal` | `20260810160000_manual_venue_reveal.sql:105-123` | D-37-14: nessuna delle dodici chiedeva **ruolo E stato approvato** per questo atto |
| `event_parties.venue_revealed_at` | `:134-135` | il predicato di pagina che **non** puo' essere `venue_reveal_email_sent` |
| `public.venue_reveal_acts` | `:177-249` | D-37-17/18: chi ha agito, su quale serata, quando, verso quante persone |
| policy `venue_reveal_acts_select_staff` | `:266-267` | D-37-18: chi gia' vede la serata al lavoro vede la traccia |
| `public.record_venue_reveal_act` | `:384-587` | l'atomicita' che rende non rappresentabile «rivelata ma non registrata» |

## Le cose che decidono, e perche' sono cosi'

**Lo scrittore non e' un'eleganza.** `event_parties_update_own`
(`20260807020000_wrap_auth_uid.sql:145-155`) pretende `staff.manage` **e**
(master **oppure** proprietario dell'evento). D-37-13 vuole esattamente
l'organizer che *non* ha creato la serata, quindi la sua sessione non puo'
scrivere quella riga. Il sintomo precoce di sbagliare qui e' *«funziona in
sviluppo»*, dove chi prova e' quasi sempre il proprietario.

**I rifiuti sono valori, e questa e' la divergenza dall'analogo.**
`record_party_assignment_act` lascia viaggiare `23514`/`23505` verso il
chiamante, perche' le sue tabelle non portano un segreto. Qui la riga che
fallirebbe e' una riga di `event_parties`, che porta `venue_text`, `venue_id`,
`venue_secret_hint` e ogni parametro di rivelazione — e su una violazione di
vincolo PostgREST restituisce la riga intera in `error.details`. Un rifiuto che
restituisce cio' che stiamo proteggendo e' il difetto che si autoinfligge, ed e'
a un `console.error(error)` distratto da un log. Con le guardie scritte come
`RETURN`, **non esiste un oggetto `error` da loggare per sbaglio**.

**Il ruolo dell'attore si legge dentro la funzione** (`:499-503`), mai come
argomento. Un parametro `p_actor_role` lascerebbe a chi chiama la dichiarazione
del proprio ruolo — cosa che oggi sembra innocua perche' il solo chiamante e'
`service_role`, e smette di esserlo il giorno in cui un secondo chiamante lo
scrive qualcuno che ha letto la firma e non il paragrafo.

**`FOR UPDATE OF ep` e non un `FOR UPDATE` nudo** (`:190`): due pressioni
concorrenti sono il caso ordinario che il lock chiude, ma bloccare anche la riga
di `public.events` farebbe aspettare una modifica dell'evento su una
rivelazione, e viceversa.

## Le guardie monotone, dichiarate

`meta-gates.md` permette di rendere piu' facile far scattare una guardia a senso
unico **solo con autorizzazione documentata nel commit**. Ce ne sono due qui, e
si comportano diversamente:

1. **`venue_reveal_email_sent` non e' toccato da nessun ramo.** Resta a senso
   unico. La ragione sta nel docblock della funzione, sotto *WHAT NO BRANCH
   TOUCHES* (`:365-374`): D-37-22 autorizza la **pagina** a tornare segreta, non
   la finzione che l'invio non sia avvenuto — e un flag abbassato manderebbe il
   cron a rispedire l'indirizzo.
2. **`venue_revealed_at` si', ed e' l'unico allargamento del file.** Il ramo
   `re_hidden` lo azzera, quindi una seconda rivelazione della stessa serata
   torna possibile. E' D-37-22 come deciso dal proprietario, e i tre limiti sono
   scritti accanto alla riga (`:552-561`): solo un master raggiunge quel ramo, la
   traccia del primo atto non e' cancellabile da nessuna sessione, e la seconda
   rivelazione scrive la propria riga accanto alla prima.

## Deviazioni dal piano

### 1. [Rule 2 — funzionalita' critica mancante] `scripts/verify-capabilities.mjs`

- **Trovata durante:** Task 3.
- **Il problema:** `ROLE_GRANTS` dichiara ogni coppia (ruolo × capability) con i
  suoi totali pre-registrati, e `flattenDeclaration()` gira **a module scope** —
  quindi una tredicesima chiave in `CAP` non dichiarata li' fa uscire il comando
  con 1 **prima di leggere qualunque database**. Il file non e' nei
  `files_modified` del piano e nessun altro piano della fase lo nomina, quindi
  il criterio di successo di **37-03** (*«verify:capabilities verde»*) sarebbe
  stato irraggiungibile anche dopo l'applicazione della migration.
- **Perche' non e' solo meccanica:** la meta' che conta e' quella dei
  **rifiuti**. `staff` e `member` non devono mai acquisire una riga per una
  chiave che pubblica un indirizzo, e `ROLE_GRANTS` e' l'unico posto del repo in
  cui quell'affermazione e' controllabile invece che scritta in un commento —
  `membership_register.sql:133-138` lo dice esplicitamente per la nona chiave.
  La migration di questo piano lo dichiara gia' a `:99-103` (*«52 dopo questo
  file, 28 grant e 24 rifiuti»*), quindi senza la modifica il file mentirebbe.
- **Fatto:** quattro dichiarazioni nuove con la loro ragione, `EXPECTED_KEY_COUNT`
  12 → 13, i tre totali 48/26/22 → 52/28/24, e il paragrafo dell'aritmetica
  esteso con la quarta riga della sua storia. Corretta anche una frase gia'
  datata prima di questo piano (*«five of the twelve keys gate TABLES»*: erano
  quattro su dodici da quando la fase 36 ha spostato `catalogue.manage` sul ramo
  delle rotte; con questa chiave tornano cinque, su tredici).
- **Verificato:** `node scripts/verify-capabilities.mjs` supera l'aritmetica e
  arriva al controllo dell'ambiente. Il rosso residuo e' **solo** l'assenza del
  database.
- **Commit:** `2b7d3b5`.

### 2. [Rule 3 — conflitto fra due criteri del piano] il paragrafo spostato

L'azione del Task 2 chiede di scrivere accanto al ramo `re_hidden` perche'
`venue_reveal_email_sent` non si tocca; il criterio d'accettazione chiede che
quel ramo **non contenga** quella stringa. Risolto spostando il paragrafo nel
docblock della funzione, sotto un titolo proprio: il ramo resta letteralmente
pulito, la ragione resta scritta, e sta in un posto che non fa credere che la
regola valga solo per quel ramo. Conflitto risolto verso il piu' restrittivo,
come chiede `meta-gates.md`.

### 3. [scelta di esecuzione] due commit su un file solo, ognuno coerente

Task 1 e Task 2 producono lo **stesso** artefatto. Committarlo una volta sola
avrebbe perso la granularita' per task; committare il Task 1 con l'intestazione
finale avrebbe messo nella history un file che elenca cinque sezioni e ne
contiene quattro — la documentazione datata che `ai-engineering.md` vieta. Il
commit di Task 1 porta quindi un'intestazione a **quattro** modifiche e un
paragrafo che dichiara l'assenza dello scrittore; il commit di Task 2 la
riporta a cinque. Nessuno dei due commit contiene un'affermazione falsa.

### 4. [documentazione datata] i conteggi in prosa

Oltre ai quattro «twelve» che il piano nomina in `keys.ts`, ne e' stato corretto
un quinto rimasto indietro (*«Three of these nine»*, dall'epoca della nona
chiave) e due in `capability-routes.ts`. Sono nel perimetro dello stesso gate:
un conteggio sbagliato nel momento del commit e' documentazione datata alla
nascita.

## Verifica — e cosa significa in un repo senza test runner

**Non esiste un test runner per il prodotto.** Nessuna riga di questo piano e'
verificata perche' «i test passano».

| Controllo | Esito | Cosa prova davvero |
|---|---|---|
| `npm run build` | **exit 0**, `✓ Compiled successfully` | i due anelli che il compilatore tiene: `CAP_DESCRIPTIONS` come `Record` totale, e `CAPABILITY_ROUTES` come `satisfies` totale. Non prova che le stringhe esistano nel database |
| `npm run verify:routes` | **PASS**, 26 pattern (24 sotto `/admin`), 24 pagine | invariato rispetto a prima: questo piano non aggiunge rotte, ed e' il risultato atteso per una chiave `table-only` |
| `node scripts/verify-capabilities.mjs` | aritmetica **verde**, poi FATAL sull'ambiente | la dichiarazione 52/28/24 torna. Il confronto con le righe vere e' il lavoro di 37-03 |
| descrizione SQL ↔ TS | **345 byte, identiche** | confrontate a macchina con uno script che rilegge i due file, non a occhio come il piano si accontentava |
| schema-qualification | 7 riferimenti, **tutti** `public.` | `grep` sul corpo della funzione: `SET search_path = ''` senza qualificazione sarebbe un `SECURITY DEFINER` rotto, non protetto |

**`npm run verify:capabilities` e' ROSSO, ed e' atteso.** Confronta il catalogo
TypeScript con le righe nel database e la migration **non e' applicata**: questo
piano scrive file, non tocca la produzione. Diventa verde in 37-03. Il rosso
residuo e' ora soltanto l'assenza del database — l'aritmetica della
dichiarazione, che sarebbe fallita prima di ogni lettura, e' verde.

### Cosa NON e' stato verificato, e va detto

- **La migration non e' mai stata eseguita.** Nessun `supabase db push`, nessun
  `migration up`, nessuna scrittura in produzione. La sintassi PL/pgSQL non e'
  stata provata da un parser: nel worktree non esiste `psql`. **La prima
  esecuzione avviene in 37-03**, che deve trattarla come tale — l'ordine
  `REVOKE` → `GRANT`, il `FOR UPDATE OF ep` e i cinque codici di rifiuto sono
  letti, non eseguiti.
- **Nessun percorso applicativo chiama ancora la funzione.** Non c'e' modo, oggi,
  di far scattare una rivelazione: la server action arriva in 37-10.
- `src/types/database.ts` **non** e' toccato qui, e non e' una dimenticanza del
  gate *tipi allineati*: il piano **37-03** lo possiede, ed e' il piano che
  applica lo schema. Un tipo che nomina una colonna prima che la colonna esista
  sarebbe un tipo che mente.

### Procedura manuale, per quando la migration sara' applicata (37-03 / 37-13)

Il gate di `meta-gates.md` chiede una procedura scritta per tutto cio' che tocca
il venue. Questa e' la parte che riguarda gli oggetti di questo piano:

1. Con un ruolo **organizer approvato che non ha creato la serata**: la chiamata
   RPC diretta da una sessione autenticata deve essere **rifiutata** (la funzione
   e' revocata da `authenticated`). Osservabile: `404`/`42883` da
   `/rest/v1/rpc/record_venue_reveal_act`.
2. Con la chiave **anonima**: `select` su `public.venue_reveal_acts` deve tornare
   **zero righe**, non un errore.
3. Con un ruolo **staff**: la stessa `select` deve tornare zero righe —
   `staff.manage` non e' concessa a quel ruolo.
4. Secondo atto `revealed` sulla stessa serata: risposta
   `{"ok": false, "reason": "already_revealed", "revealed_at": ...}`, e
   `revealed_at` **valorizzato**, perche' e' quello che rende il secondo
   tentativo una risposta invece che un silenzio.
5. `re_hidden` da un ruolo non-master: `{"ok": false, "reason":
   "re_hide_requires_master"}`, e la riga della serata **non** cambiata.
6. Dopo un `re_hidden` riuscito: `venue_reveal_email_sent` **ancora true**, e la
   riga di traccia del primo atto **ancora presente**.

## Note di sicurezza

- **T-37-01** (funzione esposta via PostgREST): mitigato — `REVOKE ALL … FROM
  public, anon, authenticated` a `:603-604`, **prima** di `GRANT EXECUTE … TO
  service_role` a `:606-607`, due statement in quest'ordine.
- **T-37-02** (`search_path` mutabile): mitigato — `SET search_path = ''` a
  `:393`, e tutti e sette i riferimenti a tabella qualificati.
- **T-37-03** (spoofing del ruolo nel ri-nascondere): mitigato — il ruolo si
  legge da `public.profiles` dentro la funzione.
- **T-37-04** (`error.details` restituisce la riga): mitigato — le cinque guardie
  sono `RETURN`, non `CHECK` e non eccezioni.
- **T-37-05** (cancellazione della traccia): mitigato — RLS attiva, nessuna
  policy di scrittura, e il paragrafo che dichiara l'omissione deliberata
  (`:270-283`).
- **T-37-06** (atto senza attore): mitigato — `actor_name NOT NULL` con `CHECK`
  non vuoto, piu' il rifiuto argomentale `venue_reveal.actor_required`.
- **T-37-SC**: nessun pacchetto installato in questo piano. Nessun checkpoint di
  legittimita' dovuto.

### Threat Flags

Nessuna superficie di sicurezza nuova oltre a quelle gia' nel registro del
piano.

## Known Stubs

Nessuno. Ogni oggetto di questo piano e' completo per quello che il piano
dichiara di consegnare; cio' che manca — la server action, il bottone, il
modulo di invio — appartiene a piani successivi e ha un piano che lo possiede.

## Nota sull'ambiente di verifica

Il worktree non ha `node_modules`: per eseguire `npm run build` e
`npm run verify:routes` e' stato creato un **symlink** a quello del checkout
principale, rimosso prima della chiusura. Da li' viene l'unico warning del
build (*«Next.js inferred your workspace root»*, due lockfile visibili): e' un
artefatto dell'ambiente di verifica, **non** una conseguenza di questa modifica,
e non e' stato «riparato» perche' fuori perimetro.

## Self-Check: PASSED
