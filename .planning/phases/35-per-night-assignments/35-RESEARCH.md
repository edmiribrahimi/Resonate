# Fase 35: Per-Night Assignments — Ricerca

**Ricercato:** 2026-08-08
**Dominio:** modello d'accesso per-serata (database + porta offline + credito pubblico)
**Confidenza complessiva:** ALTA sul codice esistente (misurato riga per riga), MEDIA sulla forma da costruire (le decisioni sono di dominio, non di libreria)

> **Lingua.** La prosa e' in italiano. Nomi di file, tabelle, colonne, funzioni,
> chiavi di capability e identificatori restano in inglese, perche' sono il
> contenuto del repository e non una traduzione.
>
> **Questo repository e' PUBBLICO** e `.planning/` e' tracciato. Qui si nominano
> **ruoli**, mai persone; nessuna data non annunciata, nessuna sede in
> trattativa, nessuna line-up.

---

## Summary

La fase 35 non inventa un modello: **lo completa**. Le tre fasi precedenti hanno
lasciato, deliberatamente e per iscritto, esattamente i quattro agganci che
servono. `private.has_capability(p_capability, p_party_id)` porta gia' il
secondo argomento, **accettato e inutilizzato**, con il commento che dice che la
fase 35 aggiunge *«un secondo braccio dello stesso OR, modificando il corpo di
questa funzione: nessuna policy e nessun chiamante cambiano quando arriva»*
(`supabase/migrations/20260807000000_capability_model.sql:201-208`).
`public.membership_acts` porta una colonna `party_id` nullable e inutilizzata,
aggiunta *«ON PURPOSE»* perche' l'assegnazione per-serata scriva in quel
registro (`20260808002000_membership_register.sql:259-272`). `MembershipAct` in
`src/lib/membership/acts.ts:47-48` **nomina gia' i due valori** che la fase 35
aggiungera' — `'assigned'` e `'unassigned'`. E
`src/app/api/tickets/checkin/undo/route.ts:19-20` scrive che *«**chi puo'**
annullare e' la domanda della fase 35 (ASSIGN-05); **chi ha annullato**
appartiene a questo file»*.

Il lavoro tecnico e' quindi piccolo e ben delimitato: **una tabella**
(`party_assignments`), **un braccio in piu' nell'OR del resolver**, **una chiave
di capability nuova** per la supervisione, **due valori in piu'** nel CHECK del
registro, e **una tabella di credito che non ha una colonna per un account**. Il
lavoro difficile e' altrove, ed e' tutto sulla porta: ASSIGN-02 (l'accesso non
sopravvive alla notte) e ASSIGN-08 (l'assegnazione si risolve all'apertura dello
scanner) sono in tensione diretta con il fatto che alle due di notte il telefono
non ha rete e che **rifiutare un ospite valido e' peggio che ammetterne uno
doppio**. Il punto piu' pericoloso della fase e' misurato e ha un indirizzo:
`src/lib/offline/sync-manager.ts:131` classifica un `403` come `blocked` — una
scansione in coda che al drain incontra un'assegnazione revocata resta appesa
per sempre, perche' il rimedio previsto (rifare il login) non restituisce
un'assegnazione revocata. Questo e' esattamente cio' che ASSIGN-03 vieta.

C'e' un secondo buco altrettanto concreto e meno visibile: `ScannerClient.tsx:869-892`
esegue un **annullamento puramente locale** quando il telefono e' offline —
cancella la riga dalla coda, non scrive nessun record, non chiede il permesso a
nessuno. Una regola di supervisione che vive solo nella route (ASSIGN-05) viene
aggirata da chiunque spenga la radio. La supervisione va quindi risolta **nella
stessa cache di ASSIGN-08**, non solo sul server.

**Raccomandazione primaria:** costruire `public.party_assignments` come record
**temporale** (`granted_at` / `revoked_at`, mai `DELETE`), aggiungere il secondo
braccio dell'OR in `private.has_capability` **null-safe** su `p_party_id`,
esporre la domanda per-serata come **overload** `public.my_access_context(uuid)`
consumato da un `hasCapability(key, { partyId })` nel DAL — e **giudicare una
scansione in coda al tempo in cui e' stata fatta, non al tempo del drain**, con
la regola *ammetti e segnala* quando il tempo e' incerto. Il vincolo temporale
della notte e' il confine di sicurezza sul server; sul dispositivo e' una
cortesia che **non deve mai cancellare la coda**.

---

## User Constraints

Non esiste un `35-CONTEXT.md`: `/gsd:discuss-phase` non e' stato eseguito per
questa fase. I vincoli sotto sono **decisioni del proprietario gia' registrate**
e hanno la stessa autorita' di un CONTEXT.md.

### Decisioni bloccate — da `.planning/ROADMAP.md:449-461`

| Decisione | Si applica a |
|---|---|
| Annullare un check-in richiede una **capability di supervisione**; chi e' assegnato alla porta per una serata non puo' annullare, salvo che sia anche organizer | **Fase 35** |
| `door.operate` mantiene `requires_approved = false`; **non e' ridondante** con il vincolo `role ⇒ approved` e **non si rimuove come pulizia** | Fase 43 — e vincola la 35 |
| **I numeri di fase sono identita', non posizione.** Nessuna fase viene rinumerata | Tutte |
| L'interfaccia resta **solo in inglese** — nessun lavoro di traduzione in questo milestone | Tutte |

### Decisioni bloccate — da `.planning/ACCESS-MODEL-DECISIONS.md`

- **§3** — «I permessi di lavoro vengono dall'assegnazione per-serata e **scadono
  con la notte**». Un fotografo carica foto **alla serata che ha lavorato**; chi
  fa la porta fa il check-in **a quella porta**; chi e' `staff` ma non lavora
  stasera entra gratis e **non puo' fare nient'altro**.
- **§3, alternative rifiutate e perche'** — *un solo ruolo `staff` che porta ogni
  permesso di lavoro* (i poteri filtrano fra i mestieri e fra le serate); *un
  ruolo per mestiere* (`staff_photo`, `staff_door`, …) — ogni nuovo mestiere
  diventa un cambio di schema, ed e' il disordine dei predicati sparsi che la
  fase 32 ha rimosso. **Nessuna delle due si ripropone.**
- **§5** — «Attribuzione richiesta su tutta la linea»: approvazione, rifiuto,
  creazione account, promozione, **assegnazione per-serata** e override alla
  porta registrano **chi** e **quando**.
- **§Cosa NON e' risolto** — restano aperte: se un'assegnazione possa essere
  **delegata oltre**, e da chi; **cosa vede** uno staff della lista membri e
  degli incassi (le superfici sono materia della fase 34).

### Discrezionalita' di Claude

- La forma della tabella delle assegnazioni (colonne, chiavi, indici).
- Il nome della chiave di capability per la supervisione.
- Dove vive il verdetto risolto sul dispositivo (`meta` contro un object store
  nuovo).
- La forma della tabella di credito, purche' soddisfi ASSIGN-06/07
  **strutturalmente**.

### Fuori scopo (FUORI SCOPO — non toccare)

- Il collasso degli alberi `/admin/*` e `/organizer/*` — **fase 34**.
- Lo spostamento dell'indirizzo della porta — **fase 39**.
- Il canale push per la freschezza della lista — **fase 38** (che pero'
  *dipende* dalla 35).
- La conversione di `MobileNav` / `StaffNav` a capability — **fase 34, STAFF-03**.
- La rimozione di `role` e `status` dal payload di `my_access_context()` — **fase 34**.
- `src/utils/qr.ts:49` (`Math.random()` per i codici) — difetto vivo, censito,
  **non di questa fase**.

---

## Phase Requirements

| ID | Descrizione | Cosa nella ricerca lo abilita |
|----|-------------|-------------------------------|
| **ASSIGN-01** | Uno staff puo' essere assegnato a una sola serata come door, photo o organizer, senza cambiare cio' che puo' fare in ogni altra serata | § *Il secondo braccio dell'OR*; `has_capability` porta gia' `p_party_id` (`capability_model.sql:192-217`). La proprieta' «nessun'altra serata cambia» e' garantita dalla clausola null-safe: con `p_party_id IS NULL` il braccio non matcha mai |
| **ASSIGN-02** | L'assegnazione finisce da sola: l'accesso agli strumenti di una serata non sopravvive alla notte | § *Tensione T-2*, quattro opzioni con i loro modi di fallire alla porta. `src/utils/datetime.ts:104` (`partyEndInstant`) e' l'unica implementazione oggi, ed e' in TypeScript |
| **ASSIGN-03** | Revocare e' **un'azione**, **registrata** e non cancellata, e **non lascia mai appesa** una scansione gia' in coda offline | § *Tensione T-1*: `sync-manager.ts:131` manda il `403` in `blocked`. Record temporale (`revoked_at`) + giudizio **al tempo dello scan**, non al drain |
| **ASSIGN-04** | Nessuno puo' assegnare a se stesso | § *Pattern 4*: un `CHECK` di riga, non una policy — il client service bypassa la RLS ma **non** un CHECK. Precedente: `profiles_role_implies_approved` |
| **ASSIGN-05** | Annullare un check-in richiede una capability di supervisione | `undo/route.ts:44-61` e' il punto d'aggancio, gia' segnalato a `:19-20`. **Ma** `ScannerClient.tsx:869-892` annulla in locale senza chiedere niente: § *Tensione T-3* |
| **ASSIGN-06** | Un credito dj/fotografo non concede accesso a nessuno strumento, e puo' esistere per chi non ha un account | § *Pattern 5*: `public.artists` e' gia' una persona senza account (`20260226100000_artist_profiles.sql:2-15`, nessuna colonna verso `auth.users` tranne `created_by`). La garanzia strutturale e' l'**assenza** di una colonna che nomini un account |
| **ASSIGN-07** | Creare un credito non crea mai un account | § *Pattern 5*. La creazione account e' `43`, e passa da `createUser` + `generateLink` (pattern a `src/lib/guest-list/process-entry.ts:220`). La garanzia e' che il percorso del credito **non importi** quell'API |
| **ASSIGN-08** | L'assegnazione alla porta si risolve e si mette in cache **all'apertura** dello scanner, non a ogni scan | § *Pattern 3*: lo scanner risolve gia' una volta per serata in `fetchAttendance` (`ScannerClient.tsx:477-664`); il verdetto viaggia sulla risposta di `/api/tickets/attendance?partyId=` |

---

## Project Constraints (from CLAUDE.md)

Direttive vincolanti estratte da `./CLAUDE.md` e dai gate in `.claude/rules/`.
Il pianificatore deve poterle verificare una per una.

| # | Direttiva | Fonte | Conseguenza per la fase 35 |
|---|---|---|---|
| C1 | **Il middleware e' UX, la RLS e' sicurezza.** Una feature protetta dal solo middleware e' esposta | `CLAUDE.md` principio 2 | Il controllo d'assegnazione non puo' vivere solo in `middleware.ts`. Ma vedi C9 |
| C2 | **La RLS vive nelle migration**, non in `schema.sql` (zero `ENABLE ROW LEVEL SECURITY`, zero `CREATE POLICY` la' dentro) | `CLAUDE.md` guardrail 3, `supabase-data.md` | Ogni policy nuova va in una migration nuova |
| C3 | **La porta non ha rete**, e **rifiutare un ospite valido e' peggio che ammetterne uno doppio** | `CLAUDE.md` principio 3, `checkin-offline.md` | Ogni default incerto della fase 35 e' *ammetti e registra* |
| C4 | **Zero fallimenti silenziosi**, e **non esiste error tracking**: un log non raggiunge nessuno | `CLAUDE.md` principio 6, `meta-gates.md` | Ogni rifiuto d'assegnazione deve avere un **effetto osservabile** — allo staff sul posto |
| C5 | **Non esiste test runner per il prodotto.** La verifica e' `npm run build` + procedura manuale scritta | `CLAUDE.md` guardrail 1, `meta-gates.md` | § *Validation Architecture*. Non proporre «aggiungi i test» senza dirlo |
| C6 | **Il repository e' PUBBLICO** e la pubblicazione e' irreversibile | `CLAUDE.md` guardrail 5 | Nessun nome di persona in una migration, in un artefatto o in un messaggio d'errore. Vedi `membership_acts.subject_label` |
| C7 | **`member` non e' `approved`**: ruolo e stato sono due assi | `CLAUDE.md` principio 8, `access-gating.md` | L'assegnazione e' un **terzo asse**, e va nominata come tale — non fusa nel ruolo |
| C8 | **Migration in avanti, mai modificate**, idempotenti (`IF NOT EXISTS` / `IF EXISTS`), tipi allineati nello stesso commit | `supabase-data.md` | Vedi § *Pitfall 7* — le migration qui si applicano **a mano**, quindi la ri-esecuzione deve essere sicura |
| C9 | **Il client service bypassa ogni RLS** e ogni suo uso nuovo va giustificato per iscritto | `access-gating.md` | Le tre route della porta scrivono con il service client: `checkin/route.ts:224`, `undo/route.ts:93`, `verify/route.ts:193`. **Li' la RLS non e' il confine**: lo e' `requireDoorOperator()` |
| C10 | **Ogni undo va registrato** con chi e quando; e' il percorso piu' semplice per far rientrare qualcuno | `checkin-offline.md`, gate *annullamento limitato* | ASSIGN-05 chiude solo meta' del problema: due rami su tre dell'undo **non scrivono** ancora `door_scan_events` (`undo/route.ts:259-266`) |
| C11 | **Una serata ha un party selezionato**: uno scan senza party non ha significato | `checkin-offline.md`, gate *identita' del party* | L'assegnazione e' per `party_id`, e il selettore di party e' gia' una precondizione |
| C12 | **Nessun rate limiting esiste**, quindi la forma dell'API e' la mitigazione: nessuna funzione che risponda su un identificatore arbitrario | `access-gating.md`, `capability_model.sql:231-237` | `my_access_context` non prende un `user_id` e non deve prenderlo. Un `party_id` **non e'** la stessa forma: risponde sul chiamante |
| C13 | **La line-up e' materiale, non manifesto**; chi suona a una data non annunciata non si scrive qui, e i materiali non anticipano | `sound-manifesto.md`, `production-calendar.md`, `venue-secrecy.md` | La tabella dei crediti **non puo'** essere `USING (true)` come `artists`: eredita il gate di pubblicazione di `event_parties` |
| C14 | **Le guardie monotone** si possono solo rendere piu' difficili da far scattare | `meta-gates.md` | `venue_reveal_sent`, gli stati di pagamento, i progressivi di serie: nessuno viene toccato da questa fase |
| C15 | **Analisi d'impatto cross-dominio prima di agire**; questa fase e' **Critical** (ruoli, accesso, RLS, porta) | `CLAUDE.md`, tabella di classificazione | Ogni piano che tocca porta/accesso presenta l'approccio e chiede conferma |

---

## Architectural Responsibility Map

| Capability | Tier primario | Tier secondario | Perche' quel tier la possiede |
|---|---|---|---|
| Definizione di *chi puo' cosa stanotte* | **Database** (`private.has_capability`) | — | CAP-01: una sola definizione. Il commento a `capability_model.sql:201-208` istruisce esplicitamente ad aggiungere il braccio **qui** |
| Persistenza dell'assegnazione e della sua revoca | **Database** (`public.party_assignments`) | — | ASSIGN-03 chiede un record, non una cancellazione. Un record e' una riga |
| Divieto di auto-assegnazione | **Database** (`CHECK` di riga) | Applicazione (il messaggio) | C9: il client service bypassa la RLS, non il CHECK. Precedente `43-06` |
| Risoluzione per-richiesta dell'identita' e delle capability | **Server (DAL)** — `src/lib/capabilities/server.ts` | — | Fase 33. Nessuna superficie risolve per conto proprio |
| Autorizzazione della porta | **Server (Route Handler)** — `src/lib/door/require-operator.ts` | — | Le route della porta scrivono con il **service client**: la RLS non le vede. Il confine e' quella funzione (C9) |
| Verdetto d'assegnazione **all'apertura** dello scanner | **Server (API)**, consegnato al **Client** | Client (IndexedDB) | ASSIGN-08. Un round trip risparmiato alla porta e' un round trip su una rete debole |
| Esito di uno scan con la radio spenta | **Client** (`src/lib/offline/checkin-store.ts`) | — | C3. La decisione e' locale; la sincronizzazione e' successiva |
| Giudizio finale su una scansione in coda | **Server (drain)** | — | ASSIGN-03. E il giudizio e' **al tempo dello scan**, non al tempo del drain |
| Registrazione degli atti (assegnato / revocato) | **Database** (`public.record_membership_act`) | — | Una transazione sola: mutazione e record insieme (`membership_register.sql:355-361`) |
| Credito pubblico dj / fotografo | **Database** (tabella senza colonna d'account) + **Server** | — | ASSIGN-06/07. La garanzia deve essere strutturale, non una convenzione |
| Redirezione per-rotta | **Middleware** | — | UX soltanto (C1). **Non** e' dove va il controllo d'assegnazione |

---

## System Architecture Diagram

```
                          ┌────────────────────────────────────────────┐
   UN ORGANIZER ─────────►│ Server Action: assegna / revoca             │
   assegna una serata     │  · assertStaffManage() → ctx                │
                          │  · guard: ctx.userId ≠ soggetto  (messaggio)│
                          └───────────────┬────────────────────────────┘
                                          │  rpc(service_role)
                                          ▼
                          ┌────────────────────────────────────────────┐
                          │ public.record_party_assignment_act(...)     │
                          │  UNA transazione:                           │
                          │   1. INSERT/UPDATE party_assignments        │
                          │      ├─ CHECK assigned_by <> user_id  ⇒23514│  ← ASSIGN-04, la REGOLA
                          │      └─ revoca = revoked_at, MAI DELETE     │  ← ASSIGN-03
                          │   2. INSERT membership_acts                 │
                          │      act ∈ {'assigned','unassigned'}        │  ← §5 attribuzione
                          │      party_id = la serata (colonna già lì)  │
                          └───────────────┬────────────────────────────┘
                                          ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │ private.has_capability(p_capability, p_party_id)                 │
        │   EXISTS( braccio 1: role_capabilities ← ruolo del profilo )     │  ← invariato
        │   OR                                                             │
        │   EXISTS( braccio 2: party_assignments                           │  ← NUOVO
        │            WHERE p_party_id IS NOT NULL                          │  ← null-safe: ASSIGN-01
        │              AND user_id = auth.uid()                            │
        │              AND party_id = p_party_id                           │
        │              AND revoked_at IS NULL                              │  ← ASSIGN-03
        │              AND now() < ends_at )                               │  ← ASSIGN-02 lato server
        └───────┬───────────────────────────────────────┬─────────────────┘
                │ (usata dalle policy RLS)               │ (usata dal DAL)
                ▼                                        ▼
   ┌──────────────────────────┐        ┌──────────────────────────────────────┐
   │ 67 policy RLS            │        │ public.my_access_context()   ← 0 arg  │
   │ chiamano con p_party_id  │        │ public.my_access_context(uuid) ← NEW  │
   │ = NULL ⇒ braccio 2 muto  │        └──────────────┬───────────────────────┘
   └──────────────────────────┘                       ▼
                                  ┌─────────────────────────────────────────┐
                                  │ src/lib/capabilities/server.ts           │
                                  │  getAccessContext()                      │
                                  │  hasCapability(key, { partyId? })  ← NEW │
                                  └───────┬──────────────────┬──────────────┘
                                          ▼                  ▼
             ┌────────────────────────────────┐   ┌──────────────────────────────┐
             │ require-operator.ts             │   │ guards.ts / Server Actions   │
             │ requireDoorOperator(partyId?)   │   │ (foto, gestione serata)      │
             │  4 archi: ok/401/403/503        │   └──────────────────────────────┘
             └───────┬─────────────────────────┘
                     │
   ══════════════════╪══════════════ APERTURA DELLO SCANNER (ASSIGN-08) ═══════
                     ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ GET /api/tickets/attendance?partyId=…                                     │
   │   → attendees[]  (già oggi)                                               │
   │   → members[]    da /api/membership/list  (già oggi)                      │
   │   → doorAuth: { mayScan, maySupervise, validUntil }   ← NUOVO, UNA VOLTA  │
   └──────────────────────────────┬───────────────────────────────────────────┘
                                  ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ IndexedDB "resonate-checkin"  (v4 → v5)                                   │
   │   attendees · members · pendingCheckins · failedCheckins · meta           │
   │                                            └─ doorAuth risolto per party  │
   └──────────────────────────────┬───────────────────────────────────────────┘
                                  ▼
        ┌──────────────────────┐        ┌────────────────────────────────────┐
        │ SCAN (radio spenta)  │        │ UNDO (radio spenta)                 │
        │ decide dalla cache   │        │ oggi: cancella la coda in LOCALE,   │
        │ ⇒ ammetti e segnala  │        │ senza chiedere niente ← BUCO T-3    │
        └──────────┬───────────┘        │ dopo: il bottone legge maySupervise │
                   │                    └────────────────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ sync-manager.ts — il drain                                                │
   │   403 → bucket "blocked"  ← OGGI STRANDA la scansione se l'assegnazione   │
   │                              è stata revocata mentre il telefono era giù  │
   │   RIMEDIO: il drain giudica al tempo scannedAt, non al tempo del drain;   │
   │            e su base assegnazione NON rifiuta mai — registra e segnala    │
   └──────────────────────────────────────────────────────────────────────────┘
```

---

## Cosa esiste gia' e va **riusato**, non reinventato

Elenco degli artefatti spediti dalle fasi 31, 32, 33 e 43 che la fase 35
consuma. Ognuno e' un file reale, con la riga che conta.

| Artefatto | Percorso | Cosa da' alla fase 35 |
|---|---|---|
| Il resolver, con il parametro della notte gia' presente | `supabase/migrations/20260807000000_capability_model.sql:192-217` | `p_party_id uuid default null`, **accettato e inutilizzato**, e il commento `:201-208` che istruisce ad aggiungere il secondo braccio dell'OR **modificando questo corpo** |
| Il catalogo delle capability | idem, `:77-80` + seed `:351-384` | 9 chiavi; una decima si aggiunge con una `INSERT` e una riga in `keys.ts` |
| La tabella dei grant | idem, `:120-125`; CHECK allargato in `20260808000500_staff_role.sql:96-101` | 20 righe dopo la fase 43; `requires_approved` per grant |
| L'unico wrapper esposto | idem, `:262-297` | `public.my_access_context()`, senza argomenti, `GRANT` al solo `authenticated`. **Due soli chiamanti**: `middleware.ts:90` e `server.ts:202` |
| Il DAL per-richiesta | `src/lib/capabilities/server.ts:198-286` | `getAccessContext()` memoizzata con `cache()`, `hasCapability(key)`. **`cache()` NON memoizza in una Server Action ne' in una Route Handler** (`:103-121`, misurato) |
| Le guardie di proprieta' | `src/lib/capabilities/guards.ts:161-249` | `assertStaffManage()` che **restituisce il contesto**, `ownsOrIsMaster()`, `assertEventOwnership()`. E a `:88-92` la frase che riserva la forma: *«`hasCapability(key, { partyId })` e' source-compatible con ogni call site che questa fase scrive»* |
| L'unica autorizzazione della porta | `src/lib/door/require-operator.ts:151-188` | `requireDoorOperator()`, quattro archi (`ok` / 401 / 403 / **503 `unresolved`**), e la ragione per cui il 503 esiste (`:64-79`) |
| Il vocabolario degli esiti | `src/lib/door/outcome.ts` | Tre esiti; un undo **non e'** un quarto esito ma una riga marcata `is_undo` |
| Il registro append-only degli atti | `supabase/migrations/20260808002000_membership_register.sql:162-281` | `public.membership_acts`, con **`party_id` gia' presente e riservato alla fase 35** (`:259-272`) |
| Il writer atomico del registro | idem, `:388-493` | `public.record_membership_act(...)`, `SECURITY DEFINER`, `search_path=''`, `EXECUTE` **solo a `service_role`** |
| I due valori d'atto gia' riservati | `src/lib/membership/acts.ts:47-48` | *«Phase 35's per-night assignment adds its own values (`'assigned'`, `'unassigned'`) to this union and to the CHECK, in one commit»* |
| Il quarto ruolo e la regola `role ⇒ approved` | `20260808000500_staff_role.sql:71-76`, `20260808001000_role_implies_approved.sql:112-117` | `staff` esiste; e le sei **rinunce** di `staff` (`:139-152`) sono decisioni, non omissioni |
| L'etichetta di ruolo sull'ingresso | `20260808003000_attendances_entry_role.sql:130-138` | `attendances.entry_role text` — e il commento dice che *«una futura assegnazione per-serata (fase 35) e' un terzo caso»* |
| Il registro della porta | `20260805120000_door_scan_events.sql:140-163` | Append-only per costruzione; `door_scan_events_select_admin` e' **deliberatamente grossolana**, con il commento `:151-154` che dice che **la fase 35 la deve restringere** |
| Il roster offline | `src/app/api/membership/list/route.ts:66-107` + `checkin-store.ts:1053` | Ogni profilo con `membership_code`, **senza filtro su ruolo ne' su stato** (`:45-52`): *«chi era nel roster prima di questo piano c'e' anche dopo»* |
| La lista presenze e la cache | `src/app/api/tickets/attendance/route.ts:196-226`, `checkin-store.ts:558` | Il momento in cui lo scanner scarica tutto per una serata — **il punto d'aggancio naturale di ASSIGN-08** |
| Il drain e la sua tabella di classificazione | `src/lib/offline/sync-manager.ts:102-175` | 401/403 → `blocked`, 408/429 → retry, ≥500 → retry. **Da leggere prima di scegliere uno status code** |
| L'harness a container | `scripts/rls-baseline-container.mjs`, `scripts/container/seed.mjs`, `scripts/rls-baseline.mjs` | postgres 17.6, 14 persone, B1 policy / B2 matrice di lettura / **B3 matrice di scrittura** |
| Il controllo a cinque lati | `scripts/verify-capabilities.mjs` (`ROLE_GRANTS` a `:173`) | Ogni coppia (ruolo × capability) e' un grant dichiarato o un **rifiuto dichiarato**; esce 1 nominando la coppia |
| Il conteggio delle conversioni temporali | `src/utils/datetime.ts:83-116` | `partyStartInstant`, **`partyEndInstant`**, `menuCloseInstant` — e la regola che una notte 22:00→06:00 finisce **il giorno dopo** |

---

## Le risposte concrete alle domande poste

### 1. Il modello di capability della fase 32, com'e' davvero

**Tabelle** (schema `private`, **non raggiungibile via PostgREST**: la lista degli
schemi esposti e' `public, graphql_public`, verificata il 2026-08-06):

```sql
-- 20260807000000_capability_model.sql:77-80
private.capabilities (
  key         text primary key,
  description text not null        -- not null di proposito: una chiave senza significato
)                                  -- viene indovinata, e concessa al ruolo sbagliato una volta sola

-- :120-125, con il CHECK allargato da 20260808000500_staff_role.sql:96-101
private.role_capabilities (
  role              text not null check (role in ('master','organizer','staff','member')),
  capability        text not null references private.capabilities(key) on delete cascade,
  requires_approved boolean not null default false,
  primary key (role, capability)
)
```

**Il flag `requires_approved`** non e' una feature: esiste perche' il database
contiene **due definizioni diverse di «organizer»** (`:82-114`) — 34 policy
ignoravano lo `status`, 4 lo richiedevano — e CAP-03 diceva *riprodurle*, non
*risolverle*. Una riga di grant lo porta per grant, non per ruolo.

**Il resolver** (`:192-217`):

```sql
CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
      and (not rc.requires_approved or p.status = 'approved')
  );
$$;
```

**Risposta diretta:** oggi il modello esprime **soltanto grant per-account**. La
*firma* porta gia' la notte; i *dati* non esistono. E il commento nel corpo
istruisce testualmente:

> *«A subject holds a capability if ANY source grants it. Phase 32 has exactly
> one source: the role grant below. A second source — a per-night assignment —
> is added by a later phase as another arm of this same OR, by editing this
> body. No policy and no caller changes when it lands.»*

**L'estensione minima onesta** e' quindi: una tabella + **un secondo `EXISTS`
in OR**, e nient'altro. Con una clausola che il commento non dice e che e'
load-bearing: il braccio deve essere **null-safe su `p_party_id`**. Le 67 policy
esistenti chiamano `has_capability('x')` senza secondo argomento, cioe' con
`NULL`; se il braccio dell'assegnazione non si spegne esplicitamente su `NULL`,
**un'assegnazione di una serata concede la capability ovunque**, che e'
l'esatto contrario di ASSIGN-01.

Nota di risoluzione, misurata: `private.has_capability` e' `STABLE`, ma **non e'
`STABLE` a produrre la valutazione una volta per statement** — e' il wrapper
`(select …)` intorno alla chiamata, provato con `EXPLAIN` su questo database e
scritto a `capability_model.sql:177-184`. Il punto e' confermato dalla
letteratura esterna: Postgres **non** mette in cache il valore di una funzione
`STABLE` durante la valutazione di una policy riga per riga. Ogni nuova policy
scritta in questa fase usa la forma `(select private.has_capability(…, …))`,
senza eccezioni.

### 2. Cosa ha stabilito il DAL della fase 33, e dove deve vivere il controllo

Tre moduli, e nient'altro:

- `src/lib/capabilities/server.ts` — `getAccessContext()` e `hasCapability(key)`.
  Usa **il client legato ai cookie**, mai il service client, perche' un controllo
  fatto con il service client *«non e' nemmeno sbagliato-ma-permissivo: un token
  service-role non porta `sub`, quindi `auth.uid()` e' null e la funzione
  risponde `{"role": null, "status": null, "capabilities": []}` — un «nessuna
  capability» sicuro di se' riguardo a nessuno»* (`:21-30`). **Ogni fallimento
  lancia**, mai un valore degradato.
- `src/lib/capabilities/guards.ts` — la domanda di proprieta' dell'evento,
  chiesta una volta perche' era risposta in dieci.
- `src/lib/door/require-operator.ts` — l'unica autorizzazione della porta, con
  il quarto arco `unresolved` a 503.

**Dove va il controllo d'assegnazione perche' non sia «solo middleware»:** in
**due posti, e sono complementari, non ridondanti**.

1. **Nel resolver SQL** (`private.has_capability`), che e' cio' che rende il
   controllo visibile alle 67 policy RLS senza toccarne nessuna. Questo e' il
   confine di sicurezza per tutto cio' che passa dal client legato ai cookie.
2. **In `require-operator.ts`**, perche' — e questa e' la parte che va detta ad
   alta voce — **le tre route della porta scrivono con il client service**
   (`checkin/route.ts:224`, `undo/route.ts:93`, `membership/verify/route.ts:193`),
   che **bypassa ogni RLS**. Per la porta, la RLS non e' il confine e non puo'
   esserlo: il confine e' quella funzione. Dire «la RLS ci protegge» sulla porta
   sarebbe falso, e il gate C1 va applicato al posto giusto, non recitato.

La forma dell'API e' gia' riservata a `guards.ts:88-92`:

> *«`hasCapability(key)` resta l'API primaria proprio perche'
> `hasCapability(key, { partyId })` e' source-compatible con ogni call site che
> questa fase scrive: `private.has_capability` porta gia' `p_party_id` mentre
> `my_access_context()` no, e la fase 35 chiede "questa persona puo' fare X *in
> questa notte*". Una convenzione che passa un `Set` e' l'unica forma che non
> puo' far crescere quell'argomento.»*

**Il problema che quella frase lascia aperto, e che il piano deve chiudere:**
`my_access_context()` **non** prende un `party_id`, e il DAL legge solo lui. Tre
opzioni, con la raccomandazione:

| Opzione | Costo | Rischio |
|---|---|---|
| **A. Overload `public.my_access_context(p_party_id uuid)`** ← *raccomandata* | Una funzione in piu'; `REVOKE`/`GRANT` da rifare per la nuova firma; due soli chiamanti dello zero-argomenti (`middleware.ts:90`, `server.ts:202`) | `CREATE OR REPLACE` **non** cambia la lista argomenti: crea un overload. Va gestito consapevolmente, non scoperto |
| B. Cambiare la firma dell'esistente a `(p_party_id uuid default null)` | Zero chiamanti da toccare | `CREATE OR REPLACE` fallisce (`42P13`); serve `DROP FUNCTION` + `CREATE`, e un `DROP` di una funzione referenziata da niente e' comunque una finestra in cui la funzione non esiste. In una migration applicata **a mano** e' la finestra sbagliata |
| C. Una funzione nuova `public.my_party_context(uuid)` | Nessun overload | Due funzioni con due nomi che rispondono alla stessa domanda: e' la seconda definizione che CAP-01 vieta |

**A**, e il payload della versione con argomento restituisce le stesse chiavi
piu' le capability risolte *su quella notte*. Vale la regola di forma C12: la
funzione risponde **sul chiamante**, e `p_party_id` non e' *«di chi parlare»* ma
*«in quale notte»* — non e' la forma di oracolo che `capability_model.sql:231-237`
rifiuta. Va scritto nella migration, altrimenti qualcuno rifiutera' la funzione
per la ragione sbagliata.

### 3. Cosa ha aggiunto la fase 43 — e la forma esatta del registro

- **Il quarto ruolo `staff`** — CHECK allargato in **due** punti:
  `public.profiles.profiles_role_check` (`20260808000500_staff_role.sql:71-76`) e
  `private.role_capabilities.role_capabilities_role_check` (`:96-101`).
  Concede **due** capability (`membership.card.view`, `membership.active`) e
  **rifiuta esplicitamente sei**: `door.operate`, `staff.manage`,
  `catalogue.manage`, `organizer.access`, `admin.access`, `master.manage`
  (`:139-152`). Il rifiuto e' **l'assenza di una riga**: non esiste una colonna
  `granted`, e aggiungerne una senza modificare il resolver **concederebbe** la
  capability (`:154-171`).
- **`profiles_role_implies_approved`** — `CHECK (role NOT IN ('master','organizer','staff') OR status = 'approved')`
  (`20260808001000_role_implies_approved.sql:112-117`), aggiunto **VALIDATED**.
  L'harness rilassa il vincolo mentre semina e lo ripristina dopo, perche' le
  quattro persone che il vincolo rende irrappresentabili sono **le uniche** che
  hanno mai catturato un difetto reale in questo progetto.
- **Il registro** — nome esatto: **`public.membership_acts`**. Forma esatta:

| Colonna | Tipo | Nota che vincola la fase 35 |
|---|---|---|
| `id` | `uuid` PK | |
| `act` | `text` CHECK su 7 valori | `created`, `approved`, `rejected`, `promoted`, `demoted`, `deactivated`, `reactivated`. **La fase 35 aggiunge `assigned` e `unassigned`** — i due nomi sono gia' riservati in `src/lib/membership/acts.ts:47-48`, e il CHECK e l'union TypeScript si modificano **nello stesso commit** |
| `subject_id` | `uuid REFERENCES auth.users ON DELETE SET NULL` | Mai `CASCADE`: l'atto sopravvive al soggetto |
| `subject_label` | `text NOT NULL` | **Un `membership_code`, mai un'email e mai un nome completo** (`:195-202`). La regola e' imposta dall'unico writer, non dal chiamante |
| `actor_id` | `uuid REFERENCES auth.users ON DELETE SET NULL` | |
| `actor_kind` | `text CHECK IN ('user','system')` + `CONSTRAINT membership_acts_actor_attributed` | Rifiuta **entrambe** le combinazioni disoneste: un atto `user` senza autore, e un atto `system` **con** un autore (*«riciclaggio d'attribuzione»*, `:222-231`) |
| `role_before` / `role_after` / `status_before` / `status_after` | `text`, nullable, **senza FK e senza CHECK** | `NULL` significa *questo atto non ha toccato quell'asse*. Un atto d'assegnazione li lascia **tutti e quattro NULL**, ed e' corretto |
| `at` | `timestamptz NOT NULL DEFAULT now()` | Orologio **del server**, sempre |
| **`party_id`** | `uuid REFERENCES public.event_parties ON DELETE SET NULL` | **Nullable, oggi inutilizzata, presente ON PURPOSE.** Il commento `:259-272` dice testualmente che *«l'assegnazione per-serata della fase 35 scrive in questo stesso registro»* e che aggiungere la colonna dopo sarebbe un `ALTER TABLE` su una tabella popolata |
| `note` | `text` | **Mai un nome, un indirizzo o un contatto** |

  **Indici:** `idx_membership_acts_subject (subject_id, at DESC)` e
  `idx_membership_acts_actor (actor_id, at DESC)` — il secondo non e' simmetria:
  *«il percorso piu' semplice per far entrare qualcuno e' quello che va reso
  visibile»*.

  **RLS:** `ENABLE` + **una sola** policy `membership_acts_select_register_read`
  su `private.has_capability('register.read')`. **Nessuna policy di scrittura, e
  l'omissione e' deliberata**: si scrive solo attraverso
  `public.record_membership_act(...)`, `SECURITY DEFINER`, con `EXECUTE`
  revocato a `public`, `anon` e `authenticated` e concesso al solo
  `service_role`.

- **La contraddizione da risolvere, e va risolta esplicitamente.** La stessa
  migration contiene due paragrafi in tensione:
  - `:259-272` — *l'assegnazione per-serata scrive in questo registro*, e la
    colonna `party_id` esiste per quello;
  - `:299-312` (**D-18**) — *un override alla porta NON entra in questo registro*,
    perche' *«non cambia chi qualcuno E'. Ammette una persona, in una notte, e
    scade con quella notte»*.

  Un'assegnazione **scade con la notte** anche lei. Letteralmente, il criterio di
  D-18 escluderebbe anche l'assegnazione. **Raccomandazione:** seguire
  l'istruzione esplicita (`party_id` e' stata aggiunta *per questo*, e
  `acts.ts:47-48` riserva i due nomi), e **modificare il paragrafo D-18 nella
  migration nuova** distinguendo il criterio reale: un override *ammette una
  persona*, un'assegnazione *concede un potere*. Concedere un potere e'
  attribuibile per `ACCESS-MODEL-DECISIONS.md §5`, che nomina *«per-night
  assignment»* nell'elenco. Lasciare la contraddizione in piedi e' peggio di
  entrambe le scelte: il primo lettore successivo si chiedera' quale dei due
  paragrafi vale.

### 4. Come lo scanner risolve oggi chi puo' scansionare, e dove vivrebbe l'assegnazione

**Autorizzazione.** Quattro route, una funzione:
`requireDoorOperator()` (`src/lib/door/require-operator.ts:151`), chiamata da
`checkin/route.ts:151`, `checkin/undo/route.ts:47`, `tickets/attendance/route.ts:203`,
`membership/list/route.ts:68` (e `membership/verify/route.ts:139`). Chiede
`door.operate`, **ruolo soltanto**, e non c'e' nessun test di stato: aggiungerne
uno *sarebbe un difetto* (`:30-37`). Il middleware fa la stessa domanda per la
rotta (`src/lib/supabase/middleware.ts:181-185`), e l'ordine di quel test **e'
load-bearing**: `/admin/scanner` va provato **prima** di `/admin` o ogni
organizer resta chiuso fuori dalla porta (`:169-176`).

**Cosa viene scaricato all'apertura** (il «roster», in tre parti):

| Chiamata | Riga | Cosa porta | Dove finisce |
|---|---|---|---|
| `GET /api/tickets/attendance` (senza `partyId`) | `ScannerClient.tsx:464` | L'elenco delle serate da oggi in poi (`.gte("date", today)`, `attendance/route.ts:213`) | Stato React `parties` |
| `GET /api/tickets/attendance?partyId=…` | `:486` | `attendees[]` — ticket, guest-list, rimborsi noti, con `checkedInBy` come **etichetta**, mai un identificatore | `mergeAttendees()` → store `attendees` |
| `GET /api/membership/list` | `:618` | **Ogni** profilo con `membership_code` (`id`, `full_name`, `membership_code`, `role`), **senza filtro su ruolo ne' stato** | `cacheMembers()` → store `members` |

**IndexedDB:** `resonate-checkin`, `DB_VERSION = 4`
(`checkin-store.ts:47-48`), object store `attendees` · `members` ·
`pendingCheckins` · `failedCheckins` · **`meta`**.

**Dove vivrebbe un'assegnazione risolta.** Nello store `meta`, che e' gia'
esattamente questo: una coppia chiave/valore per fatti risolti una volta e riletti
dopo (`deviceId` a `:51`, `rosterPredatesRole` a `:63`). Il precedente completo
esiste: la v4 ha aggiunto `rosterPredatesRole` e il piano 43-13 ha **esercitato
l'upgrade su un dispositivo reale con una scansione gia' in coda** — la prova che
un `DB_VERSION` 5 non e' un salto nel buio, ma va rifatta.

E il **payload** che lo porta dovrebbe essere quello che lo scanner gia' chiede:
la risposta di `/api/tickets/attendance?partyId=…`. Un campo `doorAuth` in quella
risposta costa **zero round trip in piu'** su una rete debole, che e' il criterio
che ha gia' deciso `require-operator.ts:138-149`. Aggiungere una quarta chiamata
`GET /api/door/authorisation?partyId=` sarebbe un round trip in piu' nel momento
peggiore.

### 5. Come funziona l'undo oggi, e dove si attacca la supervisione

`src/app/api/tickets/checkin/undo/route.ts`. Il file **porta gia' il segnaposto**
a `:19-20`:

> *«**chi puo'** annullare e' la domanda della fase 35 (ASSIGN-05); **chi ha
> annullato** appartiene a questo file, perche' la lista di revisione della
> serata e' illeggibile senza.»*

Struttura odierna:

1. `:47` — `requireDoorOperator()`; se `!auth.ok`, rifiuta con lo status dell'arco.
2. `:96-257` — ramo **ticket**: legge il ticket, risolve la serata (`partyId`
   obbligatorio per un ticket a livello evento, `:138-148`), **scrive prima la
   riga `door_scan_events` con `is_undo: true`** e solo dopo aggiorna il ticket
   (`:206-229`): *«un undo senza record e' il modo piu' semplice di far rientrare
   qualcuno non osservato»*.
3. `:267-307` — ramo **guest list**: **non scrive nessuna riga** di
   `door_scan_events`. Dichiarato differito a `:259-266`.
4. `:310-337` — ramo **membership**: **cancella** la riga `attendances`, e non
   scrive nessuna riga di registro.

**Il punto d'aggancio** e' subito dopo la riga 61, sul contesto gia' risolto.
Regole:

- Una **chiave di capability nuova** — la questione e' *«puo' questa persona
  supervisionare la porta di stanotte»*, che non e' *«puo' lavorare la porta»*.
  `keys.ts:38-45` e' esplicito: una chiave si nomina **dalla domanda**, mai dal
  predicato. Riusare `staff.manage` concederebbe sedici tabelle
  (`require-operator.ts:38-42` lo dice per l'altro verso).
- **Una sola risoluzione per handler**: `cache()` non memoizza in una Route
  Handler (misurato, `server.ts:103-121`). Il verdetto di supervisione va
  ricavato dallo stesso `getAccessContext()` che `requireDoorOperator()` ha gia'
  fatto — cioe' `requireDoorOperator` deve **restituire** abbastanza, come
  `assertStaffManage()` restituisce il contesto (`guards.ts:161-169`).
- **La categoria non puo' viaggiare nel messaggio**: Next redige il messaggio di
  un errore lanciato da una Server Action in un build di produzione (CR-01).
  Vale anche qui: il rifiuto e' un **valore** nell'envelope, deciso per
  posizione, come `DOOR_UNRESOLVED_STATUS` (`require-operator.ts:109`).
- **E ci sono due rami su tre che non registrano niente** (punti 3 e 4 sopra).
  ASSIGN-05 chiude *chi puo'*; C10 chiede *che sia registrato*. Il piano deve
  dire, per iscritto, se chiude anche quella meta' o se la lascia aperta
  nominandola. Lasciarla aperta in silenzio la rende invisibile per sempre.

### 6. ASSIGN-02 per un dispositivo offline: le opzioni e i loro modi di fallire

| # | Opzione | Come funziona | Come fallisce **alla porta** |
|---|---|---|---|
| 1 | **Scadenza timbrata nel payload in cache** | Il server calcola `validUntil` con `partyEndInstant(date, end_time)` e lo manda insieme al roster; il dispositivo smette di offrire gli strumenti dopo | **L'orologio del telefono.** `membership/verify/route.ts:343-345`: *«l'orologio di un dispositivo e' evidenza, mai autorita'»*. Un telefono avanti di due ore rifiuta un operatore valido davanti a una fila; uno indietro estende il permesso. Inoltre `event_parties.end_time` e' **nullable** — una serata senza orario di fine non ha una scadenza da timbrare |
| 2 | **Finestra lato server nel predicato** | `now() < ends_at` dentro il braccio dell'OR | **Non si applica offline, per costruzione**: il percorso offline non chiede niente al server. E richiede di **reimplementare in SQL** la regola dell'attraversamento di mezzanotte che `src/utils/datetime.ts:65-81` esiste per tenere in un solo posto — la nota di quel file dice che *«una variante di questa conversione inlineata in un call site e' il difetto che questo modulo esiste per prevenire»* |
| 3 | **Lista di revoca alla riconnessione** | Il drain scopre che l'assegnazione non c'e' piu' | **Stranda la coda.** `sync-manager.ts:131` manda un 403 nel bucket `blocked`, che *«aspetta un nuovo login»* — e un nuovo login non restituisce un'assegnazione revocata. Violazione diretta di ASSIGN-03 |
| 4 | **Giudizio al tempo dello scan** ← *raccomandata, in combinazione* | La riga `party_assignments` e' **temporale** (`granted_at`, `revoked_at`); il drain chiede *«era viva quando lo scan e' stato fatto?»* usando `PendingCheckin.scannedAt`, che **la coda gia' porta** (`checkin-store.ts:136`) | `scannedAt` e' l'orologio del dispositivo, quindi **evidenza, non autorita'**. Percio' il drain **non rifiuta mai** una scansione in coda su base assegnazione: la **registra e la segnala** — `door_scan_events` ha gia' `scanned_at` **e** `recorded_at`, `source`, e un campo `cause` per la classificazione differita |

**La combinazione raccomandata, con la ripartizione dei ruoli detta ad alta voce:**

- **Opzione 2 e' il confine di sicurezza** — sul server, per tutto cio' che arriva
  in tempo reale. Il costo (una seconda implementazione della regola di
  mezzanotte, in SQL) e' reale e va **dichiarato**, non scoperto: la mitigazione
  e' scrivere la funzione SQL **una volta**, `public.party_end_instant(date, time)`,
  e citarla da `datetime.ts` e viceversa, come `outcome.ts` fa con i suoi CHECK.
- **Opzione 4 e' cio' che rende ASSIGN-03 vero**, e da sola.
- **Opzione 1 e' una cortesia dell'interfaccia**, non un confine: nasconde gli
  strumenti quando la notte e' finita e **non deve mai cancellare la coda**.
  Se `end_time` e' `NULL`, non c'e' scadenza da mostrare e non se ne inventa una.
- **Opzione 3 non si usa da sola, mai.**

**Il caso che il piano deve enumerare per nome:** *lo scanner e' stato aperto
prima che l'assegnazione fosse revocata*. Con la combinazione sopra:
il dispositivo continua a decidere dalla cache (C3: e' l'unico comportamento che
non produce un falso rifiuto), gli scan finiscono in coda con il loro
`scannedAt`, e al drain vengono **registrati con un flag** perche' l'assegnazione
era viva quando sono stati fatti. Il risultato e' un'**anomalia osservabile nel
record della serata**, che e' esattamente cio' che C4 chiede — non una scansione
persa e non un rifiuto in silenzio.

### 7. ASSIGN-06 / 07: la persona senza account esiste gia', due volte

| Cosa esiste | Dove | Forma |
|---|---|---|
| `public.artists` | `20260226100000_artist_profiles.sql:2-15` | `name`, `slug` (entrambi UNIQUE), `bio`, `photo_url`, `instagram_url`, `soundcloud_url`, `spotify_url`, `website_url`, `created_by uuid references auth.users`. **Nessuna colonna che colleghi l'artista a un account**: `created_by` e' chi *ha creato la riga*, non chi *e' l'artista* |
| `event_parties.lineup` | `20260226400000_party_lineup_venue_secret.sql:4-6` | `text[] NOT NULL DEFAULT '{}'` — **nomi liberi**, nessuna FK verso `artists` |

Quindi la forma esiste gia' due volte, **in modo incoerente**: una tabella
relazionale e un array di stringhe. La fase 35 non deve crearne una terza.

**La forma minima che non concede niente — e la garanzia e' strutturale:**

```sql
public.party_credits (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references public.event_parties on delete cascade,
  artist_id  uuid not null references public.artists       on delete restrict,
  credit     text not null check (credit in ('dj','photographer','host','visual')),
  sort_order smallint not null default 0,
  unique (party_id, artist_id, credit)
)
-- NON C'E' NESSUNA COLONNA CHE NOMINI UN ACCOUNT.
-- Non `user_id`, non `profile_id`, non `auth_user_id`. È l'assenza che è la garanzia.
```

**Perche' l'assenza e' piu' forte di una convenzione.** Il resolver
(`capability_model.sql:209-216`) fa una `EXISTS` che parte da `auth.uid()`. Una
riga che non contiene un identificatore d'account **non puo' comparire** in
nessun braccio di quella `EXISTS` senza che qualcuno aggiunga prima una colonna —
cioe' senza una migration, che e' una decisione visibile. L'alternativa
(`user_id uuid null` sul credito, «cosi' se un giorno serve…») e' a **un solo
join** dal diventare un grant, e quel join sarebbe scritto da qualcuno in buona
fede. Questo e' lo stesso ragionamento di `staff_role.sql:154-171` sulla colonna
`granted` che non esiste.

**ASSIGN-07, la garanzia meccanica.** Creare un account passa da
`supabase.auth.admin.createUser` + `generateLink` — il pattern che
`ACCESS-MODEL-DECISIONS.md §7` indica a `src/lib/guest-list/process-entry.ts:220`
e che la fase 43 riusa. Il percorso del credito **non deve importare quell'API**.
E' verificabile meccanicamente con uno script sulla falsariga di
`scripts/verify-no-header-identity.mjs` (396 righe, gia' nel repo, gia' un
`npm run` script): un grep con esclusioni dichiarate, che esce 1 nominando il
file. **In un repository senza test runner, questo e' l'unico tipo di garanzia
automatica disponibile — e ne esistono gia' tre esempi funzionanti.**

**Il gate che nessuno chiedera' e che va applicato lo stesso (C13).**
`artists_select_public` e' `USING (true)` (`artist_profiles.sql:25-27`): **chiunque
legge ogni artista**. Se `party_credits` fosse pubblica allo stesso modo,
**una line-up di una serata non annunciata diventerebbe pubblica** appena
inserita. `event_parties` ha invece il gate giusto:
`event_parties_select_published` legge solo le parti di eventi con
`is_published = true` (`party_architecture.sql:30-37`). La policy di lettura di
`party_credits` **eredita quel gate**, mai `USING (true)`. E' `venue-secrecy.md`
applicato alla line-up invece che all'indirizzo, ed e' esattamente il gate *«la
line-up e' materiale»* di `sound-manifesto.md`.

### 8. ASSIGN-04: dove deve vivere per essere vero

**Un `CHECK` di riga sulla tabella. Non una policy.** L'argomento e' misurato,
non prudenziale:

- Ogni scrittura d'atto in questo prodotto passa da `record_membership_act`,
  che gira come **`service_role`** (`membership_register.sql:484-488`). Il
  `service_role` **bypassa ogni RLS** (`access-gating.md`, gate *service role*).
  Una `WITH CHECK` policy su `party_assignments` **non verrebbe valutata** sul
  percorso reale.
- Un `CHECK` di riga, invece, e' valutato **per ogni scrittura da ogni ruolo**,
  service compreso. E' il motivo per cui la fase 43 ha scelto un `CHECK` per
  `role ⇒ approved` e per `membership_acts_actor_attributed`, invece di una
  policy: `ACCESS-MODEL-DECISIONS.md §11` lo dice testualmente — *«una regola
  applicata in quattro posti e' una convenzione. Questa decisione la rende vera
  per costruzione.»*

Quindi:

```sql
CONSTRAINT party_assignments_no_self_grant CHECK (assigned_by <> user_id)
```

**Con il guard applicativo accanto, e i due non sono ridondanti.** Il `CHECK` e'
la **regola**; la guardia nella Server Action e' la **frase che una persona
legge**. Il precedente completo e' 43: il chiamante ramifica su
`error.code = '23514'` e **mai** su un messaggio interpretato — Next redige il
messaggio di una Server Action in un build di produzione — e **non logga mai
`error.details`**, che su questa classe di tabella porta *l'intera riga che ha
fallito* (`membership_register.sql:429-436`, misurazione 5 di `43-MEASUREMENTS.md`).

**Cio' che il `CHECK` NON cattura, e va nominato invece di lasciarlo credere
coperto:** confronta due colonne della stessa riga, quindi ferma *«A assegna A»*.
Non ferma *«A assegna B, B assegna A»* — la concessione reciproca. E' una regola
diversa, non e' in ASSIGN-04, e va dichiarata fuori scopo per iscritto. Il
mitigante che esiste gia' e' l'attribuzione: `membership_acts` con
`idx_membership_acts_actor` rende quella coppia **leggibile**, che e' cio' che
`community-membership.md` chiede (*«chi decide e' tracciato»*).

### 9. Questa fase modifica `supabase/migrations/**`?

**Si', e in modo sostanziale.** Almeno: una tabella nuova (`party_assignments`)
con la sua RLS nella stessa migration (C2, gate *tabella nuova = policy nuova*);
la ridefinizione di `private.has_capability`; una decima riga in
`private.capabilities` piu' i suoi grant; l'allargamento del CHECK `act` su
`membership_acts`; l'overload di `my_access_context`; la tabella `party_credits`
con la sua RLS; probabilmente il restringimento di
`door_scan_events_select_admin`, che porta il commento che indica **questa fase**
(`20260805120000_door_scan_events.sql:151-154`).

**Come si applicano le migration in questo progetto: A MANO.** La procedura e'
stabilita e scritta in `.planning/phases/43-role-model-account-creation/43-HUMAN-UAT.md:36-93`:

1. Una **tabella ordinata** dei file, con la ragione per cui ognuno sta in quella
   posizione — *«l'ordine non e' un suggerimento: sbagliarlo fa fallire
   l'applicazione nel momento peggiore, cioe' mentre la si sta facendo»*.
2. **Le migration prima, il codice dopo. Mai il contrario.** Il verso opposto e'
   misurato sicuro (codice vecchio + migration nuove non rompe niente); il verso
   sbagliato ha una conseguenza registrata (senza una certa migration, *«ogni
   singolo login finisce con `master=unavailable` nella barra degli indirizzi»*).
3. Subito dopo, **la prova piu' economica che esista**: `npm run verify:capabilities`.
   Rosso in produzione oggi ed e' giusto che lo sia; **dopo il deploy deve
   diventare `5/5 green`, e se resta rosso il deploy e' andato a meta'**.

**IL VINCOLO DI PIANIFICAZIONE PIU' IMPORTANTE DI QUESTA FASE, e va scritto nel
PLAN prima di qualunque altra cosa:**

> **Le sei migration della fase 43 sono committate e NON APPLICATE.**
> `43-VERIFICATION.md` lo registra come dati: `deployed: false`,
> `migrations_committed: 6`, `migrations_applied: 0`,
> `manual_procedures_executed: 0`, `observed_in_production: 0`. Il ruolo `staff`,
> il vincolo `role ⇒ approved` e la tabella `membership_acts` **non esistono nel
> database di produzione oggi**.

Conseguenze operative, tutte e tre:

- La fase 35 **costruisce sopra oggetti che non esistono in produzione**. In
  container esistono (`verify:capabilities --target=container` e' `5/5` verde),
  quindi il lavoro e' fattibile e verificabile — ma **nessuna prova prodotta da
  questa fase potra' dire «osservato in produzione»** finche' la coda non e'
  applicata.
- La coda di migration da applicare a mano diventa **6 + N**, in un ordine unico.
  Il PLAN deve produrre la propria tabella ordinata **e dichiarare la sua
  posizione rispetto alle sei della 43** (dopo tutte e sei, senza eccezioni: la
  numero 1 crea `staff`, la 3 crea il registro che la 35 estende).
- Serve un **task bloccante `checkpoint:human-verify`** prima di qualunque piano
  che dipenda da uno di quegli oggetti. Non e' burocrazia: e'
  `ACCESS-MODEL-DECISIONS.md §12`, che ha gia' registrato il prezzo di rimandare
  la verifica manuale — *«se uno di quei quattordici controlli e' rosso, tutto
  cio' che ci e' stato costruito sopra e' costruito su una fondazione sbagliata,
  e il rifacimento e' proporzionale a quanto e' stato costruito»*.

---

## La lista delle tensioni

Ogni riga e' un punto in cui un requisito della fase 35 confligge con un'invariante
esistente. Nessuna e' ipotetica: tutte hanno un file e una riga.

### T-1 — ASSIGN-03 contro `sync-manager.ts:131` · **CRITICA**

**Il conflitto.** ASSIGN-03: revocare *«non lascia mai appesa una scansione gia'
in coda offline»*. Oggi, se il drain riceve un `403`, la voce va nel bucket
`blocked`, che *«aspetta un nuovo login»*. Un nuovo login non restituisce
un'assegnazione revocata: **la scansione resta appesa per sempre**, e la persona
che e' entrata quella notte non compare nel record.

**Opzioni.**

| | Opzione | Modo di fallire |
|---|---|---|
| a | Il drain giudica **al tempo `scannedAt`** e non rifiuta mai su base assegnazione: registra e segnala | `scannedAt` e' l'orologio del telefono. Accettabile: e' gia' trattato come evidenza altrove, e la direzione dell'errore e' *ammettere*, non *rifiutare* (C3) |
| b | Un quarto status code, come il `503` inventato da `require-operator.ts:64-79`, che finisce in `retry` | Ritenta per sempre una cosa che non diventera' mai valida: e' il ciclo senza soffitto che `MAX_SYNC_ATTEMPTS = 8` esiste per evitare |
| c | Classificare come `dead` con una `FailureReason` nuova | La scansione **e' persa dal record**, che e' precisamente cio' che ASSIGN-03 vieta. `failedCheckins` la rende visibile, ma la presenza non e' registrata |
| d | Non revocare mai finche' c'e' una coda | Non sapibile: il server non sa cosa c'e' su un telefono |

**Raccomandazione: (a).** E il piano deve **modificare la tabella di
classificazione in `sync-manager.ts:102-175`** con il caso nuovo dichiarato — non
appoggiarsi al comportamento attuale sperando che vada bene.

### T-2 — ASSIGN-02 contro «la porta non ha rete» · **CRITICA**

**Il conflitto.** *«L'accesso non sopravvive alla notte»* presuppone un orologio
autorevole. Il dispositivo che ne ha piu' bisogno e' quello che non puo' chiedere
l'ora a nessuno.

**Opzioni:** enumerate integralmente al § 6 sopra. **Raccomandazione:** confine
sul server (opzione 2), verita' della coda al tempo dello scan (opzione 4),
scadenza sul dispositivo come cortesia che non cancella mai niente (opzione 1).
E il costo dichiarato: **una seconda implementazione della regola di mezzanotte,
in SQL**, che va scritta una volta sola e citata da entrambi i lati.

### T-3 — ASSIGN-05 contro l'undo locale offline · **CRITICA**

**Il conflitto.** `ScannerClient.tsx:869-892`: con la radio spenta, l'undo
cancella la voce in coda **in locale**, senza controllo e senza record. Il
commento a `:862-868` spiega perche' quel ramo esiste, ed e' un buon motivo — *«un
undo che silenziosamente non fa niente e' peggio di uno che rifiuta ad alta
voce»*. Ma significa che **una regola di supervisione che vive solo nella route
si aggira spegnendo la radio**.

**Opzioni.**

| | Opzione | Modo di fallire |
|---|---|---|
| a | Il verdetto `maySupervise` sta nella cache risolta all'apertura, e il bottone di undo non si disegna se e' falso | Se la risoluzione fallisce, un supervisore vero perde l'undo per la notte. Mitigazione: **fallire aperto sul supervisore** solo quando l'account tiene gia' `door.operate` per ruolo |
| b | Lasciare l'undo locale sempre disponibile e riconciliare al drain | Una revoca offline non registrata e' precisamente il *«percorso piu' semplice per far rientrare qualcuno»* di C10 |
| c | Rimuovere l'undo offline | Torna il difetto che `:862-868` ha corretto |

**Raccomandazione: (a)**, con il fallimento della risoluzione trattato come
**terzo esito distinto** — mai collassato in un rifiuto. Il precedente e'
`DOOR_UNRESOLVED_STATUS` (`require-operator.ts:109-116`), e la frase esiste gia':
*«non e' un rifiuto»*.

### T-4 — L'assegnazione nel registro contro D-18 · **MEDIA, ma va decisa**

Descritta integralmente al § 3. **Raccomandazione:** scrivere l'atto nel
registro (i due nomi sono riservati, la colonna e' li' per questo) e **riscrivere
il paragrafo D-18** distinguendo *ammettere una persona* da *concedere un potere*.

### T-5 — Filtrare la lista delle serate contro «mai un nuovo modo di rifiutare» · **ALTA**

**Il conflitto.** Sembra ovvio che chi e' assegnato a una sola notte veda solo
quella notte in `GET /api/tickets/attendance`. Ma quella lista e' la prima cosa
che lo scanner carica, e **una lista vuota alla porta e' un rifiuto**.
`31-VERIFICATION.md:927` registra la stessa decisione per un caso gemello: la
route membership ammette sul solo `membership_code` e **non legge mai `status`**,
lasciato intatto deliberatamente perche' *«aggiungere un controllo di stato
creerebbe un NUOVO modo di rifiutare qualcuno alla porta»*.

**Opzioni.**

| | Opzione | Modo di fallire |
|---|---|---|
| a | Chi tiene `door.operate` per ruolo vede tutte le serate; chi ha solo un'assegnazione vede le sue | Due percorsi di risposta per la stessa route: due comportamenti che possono divergere |
| b | Tutti vedono tutte le serate; l'autorizzazione si applica alla **selezione**, non alla lista | Uno staff assegnato vede serate che non puo' aprire, e lo scopre selezionandone una — davanti a una fila |
| c | Nessun filtro in questa fase | ASSIGN-01 e' verificabile lo stesso (l'ambito e' nell'autorizzazione), ma la superficie e' confusa |

**Raccomandazione: (a)**, con il criterio scritto nella route e **con l'insieme
d'ammissione mai ristretto per chi lo aveva prima** — la stessa clausola
load-bearing che `membership/list/route.ts:45-52` porta gia': *«un campo in piu'
per riga, non una riga in meno»*.

### T-6 — `requires_approved` contro l'assegnazione · **MEDIA**

**Il conflitto.** Il braccio del ruolo consulta `requires_approved`. Il braccio
dell'assegnazione consulta **cosa**? Se lo ignora, un account `pending` puo'
lavorare una porta per assegnazione. Se lo applica, un account `pending`
assegnato viene rifiutato — davanti a una fila.

**Il vincolo che risolve meta' della domanda:** dalla fase 43,
`profiles_role_implies_approved` rende `master`, `organizer` e `staff` **sempre
`approved` per regola di database**. Restano i `member`, che possono essere
`pending`. Puo' un `member` essere assegnato a una serata?

**Raccomandazione:** l'assegnazione **non consulta lo stato**, per la stessa
asimmetria che tiene `door.operate` a `requires_approved = false` — e la ragione
va scritta nella migration, perche' quel `false` *«sembrera' ridondante»* e
qualcuno proporra' di toglierlo (e' la trappola dichiarata nel ROADMAP a
`:235-241`). Se il proprietario vuole invece che solo un `approved` possa essere
assegnato, **e' una decisione da chiedere**, non da dedurre.

### T-7 — La superficie di assegnazione contro la fase 34 · **BASSA, ma pianificabile**

**Il conflitto.** ASSIGN-01 ha bisogno di un'interfaccia. La fase 34 collassa
`/admin/*` e `/organizer/*` in una superficie sola, con redirect permanenti dai
vecchi indirizzi. Costruire la superficie nell'albero vecchio significa che la
34 la sposta.

**Raccomandazione:** costruirla nell'albero **organizer** (`/organizer/events/[id]/…`),
dove vive gia' la gestione per-evento, e **accettare** che la 34 la sposti con
un redirect — che e' precisamente cio' che la 34 promette di fare per ogni
indirizzo precedente. Costruire un indirizzo «gia' nuovo» oggi anticipa una
decisione della 34 e le toglie la scelta.

### T-8 — Il credito pubblico contro il calendario di produzione · **ALTA, e sta fuori dal codice**

**Il conflitto.** Un credito e' un dato di prodotto; una line-up e' materiale di
produzione. `sound-manifesto.md` (gate *la line-up e' materiale, non manifesto*)
e `production-calendar.md` sono espliciti: chi suona a una data non ancora
comunicata non si scrive. Il gate di prodotto equivalente e' la **policy di
lettura** di `party_credits`.

**Raccomandazione:** la lettura eredita `event_parties_select_published`, mai
`USING (true)`. E la migration lo scrive con la ragione, perche' il vicino
(`artists`) e' `USING (true)` e la simmetria sembrera' la scelta ovvia.

---

## Architecture Patterns

### Pattern 1 — Il secondo braccio dell'OR, null-safe

**Cos'e':** l'unico cambiamento al resolver. Si aggiunge un `EXISTS` in OR;
non si tocca nessuna policy e nessun chiamante.

**Quando:** una volta, nella migration che introduce `party_assignments`.

```sql
-- Fonte: la forma è dettata da 20260807000000_capability_model.sql:201-217
CREATE OR REPLACE FUNCTION private.has_capability(
  p_capability text,
  p_party_id   uuid default null
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  -- Braccio 1 — il grant di ruolo. INVARIATO, byte per byte.
  select exists (
    select 1
    from public.profiles p
    join private.role_capabilities rc on rc.role = p.role
    where p.id = (select auth.uid())
      and rc.capability = p_capability
      and (not rc.requires_approved or p.status = 'approved')
  )
  -- Braccio 2 — l'assegnazione per-serata.
  --
  -- `p_party_id IS NOT NULL` NON È DIFENSIVO: è ASSIGN-01.
  -- Le 67 policy esistenti chiamano questa funzione SENZA il secondo argomento,
  -- cioè con NULL. Senza questa riga, un'assegnazione a UNA notte concederebbe
  -- la capability OVUNQUE — l'opposto esatto di «senza cambiare cosa può fare
  -- in ogni altra serata».
  or exists (
    select 1
    from public.party_assignments pa
    where p_party_id is not null
      and pa.party_id  = p_party_id
      and pa.user_id   = (select auth.uid())
      and pa.capability = p_capability
      and pa.revoked_at is null          -- ASSIGN-03: revoca = record, non DELETE
      and now() < pa.ends_at             -- ASSIGN-02, lato server
  );
$$;
```

**Nota di valutazione:** ogni **call site** resta nella forma
`(select private.has_capability('x', y))`. Non e' `STABLE` a produrre la
valutazione una volta per statement: e' il wrapper `(select …)`, provato con
`EXPLAIN` su questo database (`capability_model.sql:177-184`) e confermato dalla
letteratura esterna sulla RLS in Postgres.

### Pattern 2 — L'assegnazione come record temporale, mai come cancellazione

```sql
CREATE TABLE IF NOT EXISTS public.party_assignments (
  id         uuid primary key default gen_random_uuid(),

  party_id   uuid not null references public.event_parties on delete cascade,
  user_id    uuid not null references auth.users           on delete cascade,

  -- La capability concessa PER QUELLA NOTTE. Una chiave del catalogo, non un
  -- mestiere: il mestiere è una parola, la chiave è ciò che il resolver legge.
  capability text not null references private.capabilities(key),

  -- ── ASSIGN-04, LA REGOLA ─────────────────────────────────────────────────
  -- Un CHECK e NON una policy: ogni scrittura di questo prodotto passa dal
  -- service client, che bypassa la RLS e NON bypassa un CHECK. Stesso
  -- ragionamento di profiles_role_implies_approved.
  assigned_by uuid not null references auth.users on delete restrict,
  CONSTRAINT party_assignments_no_self_grant CHECK (assigned_by <> user_id),

  granted_at timestamptz not null default now(),

  -- ASSIGN-02. Calcolato una volta, alla concessione, dalla notte —
  -- MAI dal client. Se la notte non ha un end_time, vale la regola dichiarata
  -- nella migration (e va dichiarata: end_time è nullable).
  ends_at    timestamptz not null,

  -- ── ASSIGN-03: la revoca è un RECORD ─────────────────────────────────────
  -- Nessun DELETE. La riga resta e dice quando ha smesso di valere, perché il
  -- drain deve poter chiedere «era viva al tempo scannedAt?» dopo la revoca.
  revoked_at timestamptz,
  revoked_by uuid references auth.users on delete set null,
  CONSTRAINT party_assignments_revocation_paired CHECK (
    (revoked_at is null and revoked_by is null) or
    (revoked_at is not null and revoked_by is not null)
  )
);

-- Una sola assegnazione VIVA per (notte, persona, capability); le revocate
-- restano quante sono. Un indice unico parziale, non un UNIQUE pieno.
CREATE UNIQUE INDEX IF NOT EXISTS party_assignments_live_unique
  ON public.party_assignments (party_id, user_id, capability)
  WHERE revoked_at IS NULL;

-- L'indice che il resolver percorre a ogni domanda per-notte (supabase-data.md,
-- gate indici sulle colonne di lookup: alla porta una query lenta è una fila).
CREATE INDEX IF NOT EXISTS idx_party_assignments_lookup
  ON public.party_assignments (user_id, party_id) WHERE revoked_at IS NULL;

ALTER TABLE public.party_assignments ENABLE ROW LEVEL SECURITY;
-- ...e le sue policy NELLA STESSA MIGRATION (supabase-data.md, gate tabella
-- nuova = policy nuova). Una tabella senza RLS è leggibile da chiunque abbia la
-- chiave anonima.
```

**La domanda che il piano deve decidere e scrivere:** `revoked_by` con
`ON DELETE SET NULL` mentre `assigned_by` e' `ON DELETE RESTRICT`. Il precedente
in questo repository e' `SET NULL` per l'attribuzione (`membership_acts`,
*«un autore che poi lascia il progetto non ha dis-compiuto i suoi atti»*), e
`assigned_by` e' `NOT NULL` perche' il `CHECK` lo confronta. Va risolto
esplicitamente, non lasciato alla prima scrittura.

### Pattern 3 — Risolvere una volta all'apertura (ASSIGN-08)

**Cos'e':** lo scanner risolve gia' una volta per serata, in `fetchAttendance`
(`ScannerClient.tsx:477-664`), scatenata dalla selezione del party
(`:673-679`). Il verdetto d'assegnazione **si attacca a quel momento** e viaggia
sulla risposta che lo scanner **gia' chiede**.

```ts
// Fonte della forma: src/lib/door/require-operator.ts:130-134 (arco tagged per
// posizione, mai per messaggio: Next redige i messaggi in produzione).
export interface DoorAuthorisation {
  /** Può scansionare stanotte. Ruolo OPPURE assegnazione. */
  mayScan: boolean;
  /** ASSIGN-05: può ANNULLARE. Mai vero per una sola assegnazione alla porta. */
  maySupervise: boolean;
  /** ASSIGN-02, come CORTESIA dell'interfaccia — mai come confine, e mai
   *  come motivo per cancellare qualcosa dalla coda. `null` quando la notte
   *  non dichiara un orario di fine. */
  validUntil: string | null;
  /** L'ora del SERVER alla risoluzione, così il dispositivo può misurare la
   *  deriva del proprio orologio invece di fidarsene. */
  resolvedAt: string;
}
```

**Il posto sul dispositivo:** lo store `meta` di `resonate-checkin`, che gia'
tiene fatti risolti una volta (`deviceId`, `rosterPredatesRole`). `DB_VERSION`
passa da 4 a 5 con il suo passo di upgrade, ed **esiste un precedente esercitato
su un dispositivo reale con una scansione gia' in coda** (piano 43-13). La stessa
prova va rifatta: e' l'unico modo di sapere che un upgrade di schema non svuota
una coda a mezzanotte.

**L'anti-pattern che questo pattern vieta:** chiedere l'assegnazione a ogni scan.
Costerebbe un round trip per persona, su un telefono, su una rete debole, davanti
a una fila — e `require-operator.ts:138-149` ha gia' pagato il costo di dire che
**una** chiamata in piu' per handler e' inaccettabile.

### Pattern 4 — La regola nel database, la frase nell'applicazione

Due meta' che non si sostituiscono:

```ts
// Nella Server Action: la FRASE. Non è il confine.
if (ctx.userId === subjectId) {
  return { ok: false, reason: "self_assignment" } as const;  // valore, non messaggio
}
// ...e se la guardia venisse rimossa, il CHECK 23514 rifiuta comunque.

// Sul rifiuto del database: si ramifica sul CODICE, mai su un messaggio.
if (error?.code === "23514") {
  return { ok: false, reason: "refused_by_database" } as const;
}
// MAI loggare error.details: su queste tabelle porta l'intera riga fallita.
```

Precedente integrale: `membership_register.sql:429-436` + `43-MEASUREMENTS.md`
misurazione 5.

### Pattern 5 — Il credito che non puo' diventare un grant

Descritto integralmente al § 7. La regola in una riga: **la garanzia e' l'assenza
di una colonna, non la presenza di un commento.**

### Anti-pattern da rifiutare

- **Un ruolo per mestiere** (`staff_photo`, `staff_door`) — rifiutato per
  iscritto in `ACCESS-MODEL-DECISIONS.md §3`. Ogni mestiere nuovo diventa un
  cambio di schema.
- **Una colonna `granted boolean` su una tabella di grant** — leggerebbe come un
  diniego a un umano e come un permesso a Postgres, perche' l'`EXISTS` del
  resolver non ha nessun `granted` dentro (`staff_role.sql:154-171`).
- **Coniare una capability in un access token** — vietato con due numeri misurati:
  `hook_custom_access_token_enabled = false`, `jwt_exp = 3600`. Una revoca
  continuerebbe a funzionare per un'ora (`capability_model.sql:299-326`). La
  guida RBAC ufficiale di Supabase raccomanda proprio l'approccio qui vietato,
  quindi qualcuno lo proporra' in buona fede.
- **`catch { return false }` intorno al resolver** — rifiuta un master
  esattamente come rifiuta un `pending`. L'**unico** `catch` legittimo e' quello
  della porta, e restituisce un **quarto** esito, non un rifiuto
  (`require-operator.ts:44-62`).
- **Aggiungere una policy `PERMISSIVE` accanto a una esistente per «coprire»
  l'assegnazione** — le policy permissive si sommano in OR (`supabase-data.md`).
  L'assegnazione entra dal **resolver**, che e' gia' dentro ogni predicato.
- **Rendere `p_party_id` obbligatorio** — romperebbe le 67 policy in una volta.
- **Un secondo registro per le assegnazioni** — *«due registri che tengono
  verita' sovrapposte sono peggio di entrambi, perche' la prima domanda di ogni
  lettore successivo diventa quale dei due ha ragione»* (`membership_register.sql:309-312`).

---

## Don't Hand-Roll

| Problema | Non costruire | Usa invece | Perche' |
|---|---|---|---|
| Chiedere «puo' questa persona fare X» | Un nuovo predicato inline in una policy o in un file TS | `private.has_capability` + `hasCapability` del DAL | CAP-01. La fase 32 ha rimosso i predicati sparsi; riaggiungerne uno e' rifare il difetto |
| Sapere quando finisce una notte | Un `new Date(date + "T" + end_time)` in un call site | `partyEndInstant` (`src/utils/datetime.ts:104`) — e, in SQL, **una** funzione, citata da entrambi i lati | La deriva a sei varianti e' storia registrata di questo repo (commit `8f4e004`), e non alzava mai un errore: spostava una finestra di un'ora |
| Registrare chi ha fatto cosa | Una `INSERT` accanto a una `UPDATE` | `public.record_membership_act(...)` | Due chiamate PostgREST non possono essere atomiche: la mutazione riuscirebbe mentre il record fallisce, **in silenzio** |
| Autorizzare la porta | Un `verifyOrganizerRole()` locale nella route nuova | `requireDoorOperator()` | Ce n'erano quattro copie; *«la stessa persona rifiutata da uno scanner e ammessa da un altro, la stessa notte, e' indiagnosticabile senza error tracking»* |
| Classificare la risposta di un drain | Un `if (res.ok)` | La tabella di `classifyResponse` (`sync-manager.ts:102-175`) | `ok` era `true` per ogni fallimento che quella fase esisteva per correggere |
| Dire a chi sta alla porta che qualcosa non va | Un `console.error` | Un effetto **osservabile**: una frase sullo schermo dello staff | C4. Non c'e' error tracking: un log e' un posto dove nessuno guarda |
| Impedire un'auto-assegnazione | Un controllo solo nella Server Action | Un `CHECK` di riga **piu'** il controllo | Il service client bypassa la RLS. Un CHECK no |
| Far esistere una persona senza account | Una colonna `user_id` nullable «per il futuro» | Una tabella **senza** quella colonna | Un `user_id` nullable e' a un join dal diventare un grant, e quel join lo scrivera' qualcuno in buona fede |
| Provare che un ruolo tiene le capability giuste | Leggere le migration | `npm run verify:capabilities` (lato 5, `ROLE_GRANTS`) | Una migration dice cosa qualcuno *intendeva* applicare; `pg_policies` dice cosa **gira** |

**L'intuizione centrale del dominio:** ogni scorciatoia elencata sopra e' gia'
stata presa una volta in questo repository, e ognuna e' costata una fase per
essere disfatta. La ricerca qui non e' *«ecco cosa e' meglio»*: e' *«ecco cosa e'
gia' stato pagato»*.

---

## Common Pitfalls

### Pitfall 1 — Il braccio dell'assegnazione senza la guardia su `NULL`

**Cosa va storto:** un'assegnazione a una notte concede la capability **su ogni
tabella e ogni notte**, perche' le 67 policy chiamano il resolver con `NULL`.
**Perche' succede:** in SQL `pa.party_id = NULL` e' `NULL`, non `false`, ma una
condizione mancante o scritta male (`coalesce(p_party_id, pa.party_id)`) apre
tutto. **Come evitarlo:** `p_party_id is not null` come **prima** condizione del
braccio, con il commento che dice che e' ASSIGN-01 e non prudenza.
**Segnale d'allarme:** una cella della matrice di scrittura B3 cambia su una
tabella che questa fase non ha toccato.

### Pitfall 2 — `403` per un'assegnazione revocata

**Cosa va storto:** la coda della serata si blocca e non si sblocca mai.
**Perche' succede:** `403` e' la risposta ovvia, e `sync-manager.ts:131` la
manda in `blocked`. **Come evitarlo:** leggere quella tabella **prima** di
scegliere uno status code — e' la stessa disciplina che ha prodotto il `503` di
`require-operator.ts:64-79`. **Segnale d'allarme:** il contatore «ancora in
attesa» sullo scanner non scende mai dopo una riconnessione.

### Pitfall 3 — L'orologio del telefono trattato come autorita'

**Cosa va storto:** un operatore valido viene rifiutato, o un permesso scaduto
resta buono. **Perche' succede:** la scadenza in cache e' l'implementazione piu'
semplice. **Come evitarlo:** `validUntil` decide **cosa si disegna**, mai cosa e'
permesso; e `resolvedAt` dal server permette al dispositivo di misurare la propria
deriva invece di fidarsene. **Segnale d'allarme:** qualunque `Date.now()` in un
ramo che rifiuta.

### Pitfall 4 — Aggiungere una policy invece di estendere il resolver

**Cosa va storto:** l'accesso si allarga piu' di quanto si intendeva.
**Perche' succede:** le policy `PERMISSIVE` si sommano in OR, e aggiungerne una
sembra additivo e sicuro. **Come evitarlo:** l'assegnazione entra dal resolver,
che e' gia' dentro ogni predicato. **Segnale d'allarme:** un `CREATE POLICY` in
un piano di questa fase su una tabella che ne ha gia' una.

### Pitfall 5 — `verify-capabilities` dimenticato quando nasce una chiave

**Cosa va storto:** `verify:capabilities` esce 1 nominando la coppia
**UNACCOUNTED**, oppure — peggio — passa perche' qualcuno ha «sistemato»
`ROLE_GRANTS` senza decidere. **Perche' succede:** `ROLE_GRANTS`
(`verify-capabilities.mjs:173`) pretende una **decisione per ogni coppia** ruolo
× capability, grant o rifiuto. **Come evitarlo:** la decima chiave arriva con le
sue quattro decisioni (una per ruolo) **nello stesso commit** di `keys.ts` e
della migration. **Segnale d'allarme:** un `warning` sul quarto lato — una chiave
che nessuno chiede — che la fase 34 trasformera' in un fallimento del build.

### Pitfall 6 — `cache()` chiamata due volte in una Route Handler

**Cosa va storto:** due round trip completi prima che uno scan si risolva.
**Perche' succede:** `cache()` memoizza in un render di Server Component e **non**
in una Server Action ne' in una Route Handler — misurato, tre chiamate = tre
esecuzioni, identico in `next dev` e in un build di produzione
(`server.ts:103-121`). **Come evitarlo:** risolvere una volta in una locale e
passarla; `assertStaffManage()` restituisce il contesto proprio per questo.
**Segnale d'allarme:** un secondo `await requireDoorOperator(` o
`await getAccessContext(` nello stesso handler. **Nessun compilatore lo vede.**

### Pitfall 7 — Una migration non idempotente in una coda applicata a mano

**Cosa va storto:** una seconda esecuzione solleva `42710`, fa rollback
dell'intera transazione e **lascia non applicata tutta la coda che segue**.
**Perche' succede:** e' la forma normale dell'errore quando qualcuno ri-esegue
per sicurezza dopo un dubbio. **Come evitarlo:** `DROP CONSTRAINT IF EXISTS`
prima di ogni `ADD CONSTRAINT`, `IF NOT EXISTS` ovunque, `ON CONFLICT DO NOTHING`
sui seed. **La lezione e' registrata**: `20260808001000_role_implies_approved.sql:103-111`
la porta come finding WR-04 di una code review, con la frase *«ri-eseguire deve
essere sicuro, o nessuno ri-esegue quando dovrebbe»*.

### Pitfall 8 — `error.details` in un log

**Cosa va storto:** l'intera riga fallita — codice tessera compreso — finisce in
un log, e su questo progetto un log finisce in uno screenshot. Il repository e'
pubblico. **Come evitarlo:** `code` e `message`, mai `details`. Precedente:
`membership/list/route.ts:99-102`.

### Pitfall 9 — Il `requires_approved` di `door.operate` «pulito»

**Cosa va storto:** una regola che sembrava ridondante sparisce, e il giorno in
cui il vincolo `role ⇒ approved` viene rilassato per un caso speciale, la porta
si chiude in faccia a chi ha diritto. **Come evitarlo:** e' una **trappola
dichiarata** nel ROADMAP (`:235-241`) e in due migration. Non si tocca.
Corollario esplicito di `staff_role.sql:190-191`: *«se `staff` riceve mai
`door.operate` da una fase successiva, riceve lo stesso trattamento per la stessa
ragione»* — e la fase 35 e' quella fase.

---

## Runtime State Inventory

> La fase 35 non e' un rinomina, ma **e' una fase di migration**, e questo
> repository applica le migration **a mano**. La domanda canonica qui e': *dopo
> che ogni file e' aggiornato, quali sistemi in esecuzione non conoscono ancora
> il cambiamento?*

| Categoria | Cosa e' stato trovato | Azione richiesta |
|---|---|---|
| **Database di produzione** | **Le sei migration della fase 43 sono COMMITTATE e NON APPLICATE** (`43-VERIFICATION.md`: `migrations_applied: 0`, `deployed: false`). `staff`, `profiles_role_implies_approved`, `membership_acts`, `attendances.entry_role` **non esistono in produzione oggi** | Applicazione manuale, nell'ordine di `43-HUMAN-UAT.md:41-48`, **prima** di qualunque migration della fase 35. Task `checkpoint:human-verify` bloccante |
| **Codice deployato** | Il codice della fase 43 esiste sul branch e **non e' deployato**. Accoppiamento duro registrato: codice senza la migration 5 ⇒ `master=unavailable` su **ogni** login | Migration prima, codice dopo. **Mai il contrario** |
| **IndexedDB sui telefoni della porta** | `resonate-checkin` `DB_VERSION = 4` (`checkin-store.ts:48`), con `attendees`, `members`, `pendingCheckins`, `failedCheckins`, `meta`. Un telefono puo' portare una **coda non vuota** attraverso l'upgrade | Se la fase 35 porta la v5, serve un passo di upgrade **e** la prova su un dispositivo reale con una scansione in coda (precedente: piano 43-13). Una coda persa e' una presenza persa |
| **Service worker / cache Serwist** | Le quattro route della porta sono precacheate; `/api/membership/list` e' `NetworkOnly` (`src/app/sw.ts:41-44`). **Un telefono puo' rispondere da un bundle precedente al deploy per un'intera sessione**, e quella sessione e' una serata | Il payload di `/api/tickets/attendance` deve restare **additivo per una release**, come la fase 43 ha gia' deciso per lo stesso motivo (`attendance/route.ts:44-51`) |
| **Righe gia' esistenti** | `attendances` (con `entry_role` nullable), `door_scan_events`, `event_parties.lineup text[]` con nomi liberi | Nessuna `party_assignments` esiste, quindi nessuna migrazione di dati d'assegnazione. **Ma** se `party_credits` nasce, va detto esplicitamente **cosa succede a `lineup`**: convivenza dichiarata, o backfill, o nulla — e nulla e' una risposta valida solo se scritta |
| **Segreti / variabili d'ambiente** | Nessuna variabile nuova prevista. `MASTER_EMAIL`, `CRON_SECRET`, `TICKET_SIGNING_SECRET` restano invariate | Nessuna |
| **Stato registrato dall'OS / processi** | Nessuno. Non ci sono task pianificati ne' processi con nomi da rinominare | **Nessuno — verificato**: il deploy e' Vercel, i cron sono in `vercel.json` e nessuno di essi riguarda le assegnazioni |
| **Artefatti di build** | `.next/` rigenerato a ogni deploy | Nessuna |

---

## Environment Availability

| Dipendenza | Richiesta da | Disponibile | Nota |
|---|---|---|---|
| `npm run build` (Next 16, webpack) | Il gate dei tipi — l'unico automatico sul prodotto | ✓ | E' anche il gate del deploy Vercel |
| Docker + `postgres:17.6` | `npm run baseline:container`, `verify:capabilities --target=container` | ✓ (usato dalle fasi 32/43) | Exit 2 se il demone non risponde: *«niente e' stato misurato, quindi niente e' fallito»* |
| Management API di Supabase | `verify:capabilities --target=production`, `baseline:rls` | ✓ | **Bypassa la RLS**: puo' misurare lo schema, **non** puo' misurare cosa vede una sessione vera |
| Un accesso di scrittura al database di produzione | Applicare le migration | ✓ ma **manuale** | Nessuno strumento del repo applica migration in produzione (`43-VERIFICATION.md`) |
| Un telefono, una serata, uno staff | ASSIGN-02, ASSIGN-03, ASSIGN-05 offline, ASSIGN-08 | ✗ per definizione automatica | § *Validation Architecture* |
| Un test runner per il prodotto | — | ✗ **NON ESISTE** | Nessuno script `test`, nessun `*.test.*`, nessun `*.spec.*`. Vedi C5 |
| Error tracking / monitoring | — | ✗ **NON ESISTE** | Nessuna dipendenza di monitoraggio in `package.json`. Vedi C4 |
| Rate limiting | — | ✗ **NON ESISTE** | Verificato 2026-08-05. La **forma dell'API** e' la mitigazione (C12) |

**Mancanze senza alternativa:** il test runner e l'error tracking. Entrambe sono
**condizioni di progetto**, non blocchi di questa fase, e sono gia' compensate:
il primo dalle procedure manuali scritte, il secondo dalla regola dell'effetto
osservabile.

---

## Standard Stack

**Questa fase non introduce nessun pacchetto.** Non e' una preferenza: e' il
risultato dell'analisi. Tutto cio' che serve esiste gia' nel repository —
PostgreSQL con RLS, `@supabase/supabase-js`, `idb` per IndexedDB, Next 16.

| Strumento | Dove sta gia' | A cosa serve qui |
|---|---|---|
| PostgreSQL `CHECK` constraints | `profiles_role_implies_approved`, `membership_acts_actor_attributed` | ASSIGN-04, la coerenza della revoca |
| PostgreSQL RLS + `private.has_capability` | 67 policy | ASSIGN-01, ASSIGN-06 |
| Indice unico **parziale** | `tickets_event_user_master_unique` (`20260226300000_multi_sub_events.sql:66-68`), `idx_attendances_party_user` | Una sola assegnazione viva per (notte, persona, capability) |
| `idb` (IndexedDB) | `src/lib/offline/checkin-store.ts` | ASSIGN-08, il verdetto risolto |
| `react.cache()` | `src/lib/capabilities/server.ts` | Con il suo limite misurato |

### Package Legitimacy Audit

**Non applicabile: questa fase installa zero pacchetti.**

Verificato leggendo `package.json` e l'intera analisi sopra: ogni requisito
ASSIGN-01…08 si soddisfa con DDL PostgreSQL, con moduli TypeScript gia'
esistenti e con gli script di verifica gia' nel repo. Se un piano dovesse
proporre un pacchetto, va **prima** ripassato dal gate di legittimita' e
**dichiarato** — un pacchetto in questa fase toccherebbe accesso e porta, ed e'
Critical per la tabella di classificazione di `CLAUDE.md`.

---

## Code Examples

### Come una route della porta chiede la domanda per-serata

```ts
// src/app/api/tickets/checkin/undo/route.ts — il punto d'aggancio è dopo la :61.
// Forma dettata da src/lib/door/require-operator.ts:130-134.

// UNA sola risoluzione per handler: cache() non memoizza in una Route Handler.
const auth = await requireDoorOperator({ partyId: recordPartyId });
if (!auth.ok) {
  return NextResponse.json(
    {
      success: false,
      error: auth.error,
      // La categoria è un VALORE deciso per posizione, mai un messaggio:
      // Next redige il messaggio di un errore server in un build di produzione.
      ...(auth.kind === "unresolved" ? { status: DOOR_UNRESOLVED_STATUS } : {}),
    },
    { status: auth.status }
  );
}

// ASSIGN-05. Una domanda DIVERSA da door.operate, e quindi una chiave diversa:
// una chiave si nomina dalla domanda, mai dal predicato (keys.ts:38-45).
if (!auth.maySupervise) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Undoing a check-in needs a supervisor. Ask an organizer for this night.",
      status: DOOR_SUPERVISION_REQUIRED, // valore, non frase interpretata
    },
    // NON 403: sync-manager.ts:131 manda un 403 in `blocked`, e un nuovo login
    // non trasforma nessuno in supervisore. Lo status va scelto LEGGENDO quella
    // tabella, non per abitudine.
    { status: 403 }
  );
}
```

> **Da decidere nel piano, non qui:** un `403` su un *undo* non passa mai dal
> drain — la coda non contiene undo. Quindi il `403` e' probabilmente corretto
> **per l'undo** e **sbagliato** per uno *scan* rifiutato per assegnazione.
> I due casi vanno separati esplicitamente, altrimenti si copia lo status dal
> vicino sbagliato.

### Come si scrive l'atto nel registro esistente

```sql
-- La fase 43 ha riservato i due valori (src/lib/membership/acts.ts:47-48).
-- Il CHECK e l'union TypeScript si modificano NELLO STESSO COMMIT.
ALTER TABLE public.membership_acts DROP CONSTRAINT IF EXISTS membership_acts_act_check;
ALTER TABLE public.membership_acts
  ADD CONSTRAINT membership_acts_act_check
  CHECK (act IN (
    'created','approved','rejected','promoted','demoted','deactivated','reactivated',
    'assigned','unassigned'    -- fase 35
  ));
```

```ts
// L'atto si scrive con la funzione che esiste, mai con una INSERT accanto:
// due chiamate PostgREST non possono essere atomiche.
await serviceClient.rpc("record_membership_act", {
  p_subject_id: assigneeId,
  p_act: "assigned",
  p_actor_id: ctx.userId,      // risolto server-side: sotto il service client auth.uid() è null
  p_actor_kind: "user",
  p_role: null,                // NULL = questo atto non ha toccato quell'asse
  p_status: null,
  p_party_id: partyId,         // la colonna che la fase 43 ha aggiunto PER QUESTO
  p_note: null,                // MAI un nome, un indirizzo o un contatto
});
```

### Il drain che non stranda una scansione (ASSIGN-03)

```ts
// src/lib/offline/sync-manager.ts — la tabella di classificazione va ESTESA,
// non aggirata. Il caso nuovo è dichiarato, con la sua ragione.
//
// | Condizione                                   | Bucket  |
// |----------------------------------------------|---------|
// | 401 / 403                                    | blocked |   ← esistente
// | assegnazione revocata DOPO scannedAt         | done    |   ← NUOVO: registrata e segnalata
// | assegnazione mai esistita                    | dead    |   ← NUOVO: reason dedicata, visibile
//
// La seconda riga è ASSIGN-03. Il server giudica al tempo `scannedAt` — che la
// coda porta già (checkin-store.ts:136) — e NON al tempo del drain. `scannedAt`
// è l'orologio del telefono, quindi evidenza e non autorità: perciò l'esito è
// «registra e segnala», mai «rifiuta». Rifiutare qui perde una presenza reale.
```

---

## State of the Art

| Approccio precedente | Approccio attuale | Quando e' cambiato | Cosa significa per la 35 |
|---|---|---|---|
| Un predicato di permesso scritto in ogni policy e in ogni file | Una definizione in `private.has_capability` | Fase 32, 2026-08-06 | Il permesso per-serata si aggiunge **li'**, non altrove |
| L'identita' presa da un header di richiesta (`x-user-role`), letto da 44 file | L'identita' dalla sessione, risolta in un solo modulo server-only | Fase 33, 2026-08-07 | `npm run verify:no-header-identity` esce 1 se qualcuno ricomincia |
| `role` come unica leva, con un caso speciale per mestiere | Quattro ruoli, e i **permessi di lavoro fuori dal ruolo** | Fase 43 / `ACCESS-MODEL-DECISIONS.md §3` | E' precisamente il mandato della fase 35 |
| Atti su un account non registrati | `public.membership_acts`, append-only per costruzione | Fase 43, 2026-08-08 | Le assegnazioni entrano **li'**, non in un secondo registro |
| `if (res.ok)` come classificatore di un drain | Una tabella esplicita di classificazione | Fase 31 | Uno status code si sceglie leggendo quella tabella |
| Quattro copie di `verifyOrganizerRole()` | `requireDoorOperator()`, quattro archi | Fase 33 | La supervisione si aggancia li', non in una quinta copia |

**Superato / da non citare:**

- `public.is_admin_or_organizer()` come predicato **nuovo**: 45 policy su 67 sono
  state convertite. Una policy nuova in quella forma sarebbe **sia il predicato
  sbagliato sia una chiamata per riga**.
- Il `custom access token hook` di Supabase per portare permessi nel JWT:
  vietato con due numeri misurati (`jwt_exp = 3600`).
- Leggere la sicurezza in `supabase/schema.sql`: **zero** `ENABLE ROW LEVEL
  SECURITY`, **zero** `CREATE POLICY`. Le migration sono la fonte.

---

## Validation Architecture

### Test Framework

| Proprieta' | Valore |
|---|---|
| Framework | **NESSUNO.** `package.json` non ha script `test`; nessun `*.test.*`, nessun `*.spec.*` |
| File di configurazione | Nessuno |
| Comando rapido | `npm run build` — che **e' anche** il typecheck (non esiste uno script `typecheck` separato) |
| Suite completa | Non esiste. Il piu' vicino: `npm run build && npm run verify:capabilities && npm run verify:no-header-identity && npm run verify:persona` |

**Non proporre «aggiungiamo i test» come strategia di verifica di questa fase
senza dire, nella stessa frase, che il runner non esiste.** Introdurne uno e' una
decisione di progetto, non un dettaglio di piano, e non e' su questo ROADMAP.

### L'harness esiste gia' e **si puo' estendere**

Costruito dalle fasi 32 e 43. Percorsi esatti:

- `scripts/rls-baseline-container.mjs` (561 righe) — avvia `postgres:17.6` (la
  major.minor esatta di produzione), applica `schema.sql` **all'initial commit**
  + tutte le migration, semina **14 persone**, cattura, e **distrugge sempre** il
  container. **Non legge nessuna variabile d'ambiente**: non c'e' percorso per
  cui possa toccare un database vero.
- `scripts/container/seed.mjs` (875 righe) — semina le persone, **rilassando il
  vincolo `role ⇒ approved` durante la semina e ripristinandolo dopo**, per
  conservare le quattro persone che quel vincolo rende irrappresentabili.
- `scripts/rls-baseline.mjs` (1874 righe) — **B1** le policy, **B2** la matrice
  di lettura, **B3 la matrice di scrittura**. `PROBE_PAYLOADS` (`:1069`) porta
  una voce per tabella con RLS, e **l'harness si rifiuta di eseguire B3 se una
  tabella enumerata non ha la sua voce**: una tabella nuova **obbliga** a
  dichiarare il payload.
- `scripts/verify-capabilities.mjs` (1176 righe) — cinque lati; `ROLE_GRANTS`
  (`:173`) pretende una decisione per **ogni** coppia ruolo × capability, e esce
  1 nominando la coppia sia quando un rifiuto dichiarato acquista una riga sia
  quando un grant dichiarato la perde.
- `scripts/verify-no-header-identity.mjs` (396 righe) — il modello per una
  verifica strutturale a grep, riusabile per ASSIGN-07.

**Risposta diretta: si', si puo' estendere, ed e' progettato per esserlo.** Una
`party_assignments` nuova **forza** una voce in `PROBE_PAYLOADS`; una decima
capability **forza** quattro decisioni in `ROLE_GRANTS`. Entrambi i meccanismi
falliscono rumorosamente, nominando la cosa mancante — che e' l'unica forma di
copertura automatica che questo repository ha.

### ASSIGN-01…08 → come si osserva ognuno, onestamente

| Req | Cosa lo prova | `npm run build` prova… | Container / write matrix prova… | Serve una persona con un telefono? |
|---|---|---|---|---|
| **ASSIGN-01** | Una persona assegnata a una notte usa gli strumenti di quella notte e **di nessun'altra** | Che il codice compili. **Nulla** sui permessi | **Molto.** B3 su `party_assignments`; e B2/B3 su **ogni altra tabella devono restare byte-identiche** — e' la prova che l'assegnazione non e' filtrata altrove | Solo per la superficie (assegnare da una pagina) |
| **ASSIGN-02** | L'accesso non sopravvive alla notte | Nulla | **Parzialmente.** Il predicato `now() < ends_at` e' provabile in container spostando `ends_at` (mai `now()`) | **Si', per il ramo offline.** Nessuno strumento del repo puo' raggiungere un dispositivo con la radio spenta |
| **ASSIGN-03** | Revoca registrata; coda mai appesa | Nulla | **Meta'.** Che la revoca sia una riga e non una cancellazione: verificabile in SQL. Che il drain giudichi al tempo `scannedAt`: verificabile con una chiamata HTTP diretta | **Si', per «mai appesa».** La coda vive in IndexedDB su un telefono |
| **ASSIGN-04** | Nessuna auto-assegnazione | Nulla | **Si', completamente.** Una sonda B3 che tenta `assigned_by = user_id` deve tornare `23514`. **E la mutazione va provata**: rimuovere il `CHECK` deve far diventare verde la cella | No |
| **ASSIGN-05** | Undo rifiutato a chi ha solo la porta, permesso a un organizer | Nulla | **Solo il lato server**, con due sessioni diverse via HTTP | **Si'.** Che il rifiuto arrivi a una persona come **frase distinguibile** e non come *«qualcosa e' andato storto»* e' osservabile **solo in un build di produzione**: Next redige i messaggi delle Server Action solo li'. E il ramo **offline** (`ScannerClient.tsx:869`) e' raggiungibile solo da un dispositivo |
| **ASSIGN-06** | Un credito non concede niente e puo' esistere senza account | **Meta', ed e' insolita.** Un credito che *provasse* a portare un account **non compilerebbe**, se il tipo della riga non ha il campo | **Si'.** B2/B3 su `party_credits`; e la prova negativa: una persona con un credito e nessuna assegnazione ha la stessa matrice di un `member` | Solo per la superficie |
| **ASSIGN-07** | Creare un credito non crea un account | Nulla | Nulla | **No, se si scrive lo script**: un grep strutturale sul modello di `verify-no-header-identity.mjs` che esce 1 se il percorso del credito importa l'admin API. **E' l'unica garanzia meccanica disponibile** |
| **ASSIGN-08** | Risolto **una volta** all'apertura, non a ogni scan | Nulla | Nulla | **Si', interamente.** «Quante volte una chiamata parte» e' un comportamento del client. Osservabile contando le richieste nel pannello di rete durante N scansioni: **N scansioni ⇒ N chiamate di check-in e ZERO chiamate d'autorizzazione** |

### Frequenza di campionamento

- **Per commit di task:** `npm run build` (e' anche il typecheck).
- **Per merge di wave:** `npm run build` + `npm run verify:capabilities -- --target=container`
  + `npm run verify:no-header-identity` + `npm run verify:persona` se la persona
  e' stata toccata.
- **Gate di fase, prima di `/gsd:verify-work`:** `npm run baseline:container`
  con confronto contro la cattura pre-fase (`npm run baseline:compare`), **piu'**
  il documento `35-HUMAN-UAT.md` scritto — non eseguito, scritto: eseguirlo
  richiede una serata.

### Wave 0 — cosa manca prima di poter misurare

- [ ] La cattura di baseline **prima della prima riga di DDL**. Una baseline
      presa dopo il cambiamento non e' una baseline. Precedente esplicito:
      `.planning/STATE.md` per la fase 32.
- [ ] La voce di `PROBE_PAYLOADS` per `party_assignments` e per `party_credits`
      — **senza, B3 si rifiuta di girare**.
- [ ] Le quattro decisioni in `ROLE_GRANTS` per la chiave nuova.
- [ ] Le persone del container: la griglia odierna e' ruolo × stato. Una
      **assegnazione** e' un terzo asse, e il seed deve produrre almeno *staff
      assegnato alla notte 1*, *staff assegnato alla notte 2*, *staff non
      assegnato*, altrimenti ASSIGN-01 e' vacuo in ogni cella.
- [ ] Lo script strutturale per ASSIGN-07.

### La dichiarazione di copertura onesta

**Quattro degli otto requisiti (ASSIGN-01, 04, 06, 07) sono chiudibili
automaticamente.** Gli altri quattro (02, 03, 05, 08) hanno una meta' che
**nessuno strumento di questo repository puo' raggiungere**, perche' vive su un
telefono, con la radio spenta, in un build di produzione. Per quelli, il
deliverable della fase e' una **procedura scritta**: quali passi, con quale
ruolo, cosa si deve osservare — sul modello di `43-HUMAN-UAT.md`, che porta
sedici procedure con l'ordine di deploy in testa e le finestre che si chiudono.

**E va scritto nel VERIFICATION.md della fase, non evocato**: in un repository
senza test, l'evidenza osservabile e' l'unica prova che esistera'.

---

## Security Domain

### Categorie ASVS applicabili

| Categoria ASVS | Si applica | Controllo standard in questo progetto |
|---|---|---|
| **V4 Access Control** | **Si', e' l'intera fase** | `private.has_capability` + policy RLS + `CHECK` di riga. Mai il middleware da solo (C1) |
| **V5 Input Validation** | **Si'** | Ogni `party_id` in ingresso e' un uuid validato — il pattern esiste gia': `UUID_PATTERN` in `undo/route.ts:23-24` |
| V2 Authentication | No | Nessun percorso di autenticazione nuovo |
| V3 Session Management | No | Nessun cambiamento di sessione. **Non** si conia niente nel token (`capability_model.sql:299-326`) |
| V6 Cryptography | No — **ma con una nota** | Nulla di crittografico qui. `src/utils/qr.ts:49` usa `Math.random()` per un codice che concede l'ingresso: **difetto vivo e censito**, fuori scopo per questa fase, e **non va peggiorato** |
| V7 Error Handling / Logging | **Si'** | Ogni percorso d'errore e' distinguibile, con effetto osservabile; **mai** `error.details` in un log |

### Pattern di minaccia noti per questo stack

| Pattern | STRIDE | Mitigazione applicabile |
|---|---|---|
| Auto-assegnazione (chi puo' assegnare si concede il potere) | **Elevation of Privilege** | `CHECK (assigned_by <> user_id)` — non una policy: il service client bypassa la RLS |
| Un'assegnazione di una notte che concede la capability ovunque | **Elevation of Privilege** | La guardia `p_party_id IS NOT NULL` nel braccio dell'OR |
| Un `granted = false` che **concede** invece di negare | **Elevation of Privilege** | Nessuna colonna `granted`: un rifiuto e' l'assenza di una riga (`staff_role.sql:154-171`) |
| Un credito che diventa un grant d'accesso | **Elevation of Privilege** | Nessuna colonna d'account sulla tabella dei crediti |
| Revoca per cancellazione ⇒ nessuna traccia | **Repudiation** | `revoked_at` + un atto in `membership_acts` con autore e timestamp |
| Undo offline non registrato | **Repudiation** | Il verdetto `maySupervise` in cache, e il ramo offline che **rifiuta ad alta voce** invece di procedere in silenzio |
| Line-up di una serata non annunciata leggibile pubblicamente | **Information Disclosure** | La lettura di `party_credits` eredita `event_parties_select_published`, mai `USING (true)` |
| Il roster con ogni nome e codice tessera su ogni telefono che puo' fare una porta | **Information Disclosure** | **Confine gia' attraversato e accettato** (`membership/list/route.ts:54-64`). La fase 35 non lo allarga: nessun campo nuovo di dato personale nel payload |
| `record_membership_act` raggiungibile via REST ⇒ auto-promozione | **Elevation of Privilege** | Gia' mitigato: `REVOKE` da `public`/`anon`/`authenticated`, `GRANT` al solo `service_role`. **Ogni nuova funzione `SECURITY DEFINER` di questa fase ripete quelle due istruzioni, in quell'ordine** |
| Un endpoint che risponde valido/non valido senza rate limiting | **Information Disclosure** | Non esiste rate limiting. La fase 35 **non aggiunge** endpoint di verifica; se lo facesse, va detto per iscritto che e' esposto (`access-gating.md`) |
| Un `CHECK` che congela le righe esistenti | **Denial of Service** | `NOT VALID` fu misurato pericoloso in fase 43: congela ogni riga violante contro **ogni** update futuro su **ogni** colonna. Una tabella nuova non ha righe: il `CHECK` nasce **VALIDATED** |

---

## Assumptions Log

| # | Affermazione | Sezione | Rischio se sbagliata |
|---|---|---|---|
| A1 | `event_parties.end_time` puo' essere `NULL`, quindi una notte puo' non dichiarare quando finisce, e `ends_at` ha bisogno di una regola dichiarata | Pattern 2, T-2 | **Alto.** `ends_at NOT NULL` su una serata senza `end_time` fa fallire l'assegnazione, o costringe a un default inventato. *(Il tipo `end_time time` senza `NOT NULL` e' **verificato** a `20260225150000_party_architecture.sql:16`; e' la **regola da applicare** a essere assunta)* |
| A2 | L'assegnazione **non** consulta `requires_approved` / lo stato | T-6 | **Medio.** Se il proprietario vuole il contrario, cambia il predicato e cambia chi puo' essere assegnato. **Da chiedere** |
| A3 | Un credito si attacca a `public.artists`, non a una tabella di persone nuova | Pattern 5 | **Medio.** Se un fotografo non e' un «artist» per il proprietario, serve un'altra entita' — o una colonna di tipo su `artists` |
| A4 | «Photo» e «organizer» come assegnazioni si esprimono con **chiavi di capability**, non con un enum di mestieri | ASSIGN-01 | **Medio.** Un enum di mestieri sarebbe piu' leggibile in interfaccia e meno diretto per il resolver. E' una scelta di forma, e va dichiarata |
| A5 | Un `403` e' corretto per un **undo** rifiutato (non passa dal drain) e sbagliato per uno **scan** rifiutato | Code Examples | **Alto.** Copiare lo status dal vicino sbagliato e' esattamente il modo in cui T-1 si materializza |
| A6 | Filtrare la lista serate per assegnazione e' desiderabile | T-5 | **Medio.** Introduce un nuovo modo di rifiutare alla porta. **Da chiedere** |
| A7 | La superficie di assegnazione va costruita nell'albero `organizer` | T-7 | **Basso.** La fase 34 la sposta con un redirect in ogni caso |
| A8 | L'assegnazione entra in `membership_acts` malgrado il criterio di D-18 | § 3, T-4 | **Medio.** Se il proprietario applica D-18 alla lettera, serve un altro posto — e `party_assignments` stessa, essendo temporale, **potrebbe bastare** |
| A9 | Sull'orologio del dispositivo si puo' misurare la deriva con `resolvedAt` dal server | Pattern 3 | **Basso.** E' aritmetica; il rischio e' che qualcuno la usi per **rifiutare** invece che per **mostrare** |
| A10 | `DB_VERSION 5` con upgrade e' sufficiente per lo store `meta` | Pattern 3 | **Basso.** Il precedente 43-13 e' stato esercitato su un dispositivo reale; la prova va rifatta, non ereditata |

---

## Open Questions (RESOLVED)

> **Tutte e sei sono chiuse, e la chiusura e' implementata.** Questa sezione
> resta come registro di come si e' arrivati alle decisioni, non come elenco di
> cose da decidere: ogni voce porta in linea la decisione o il piano che la
> chiude. Un lettore futuro non deve poter scambiare una domanda gia' risposta
> per una ancora aperta.

1. **Un'assegnazione puo' essere delegata oltre, e da chi?**
   **(RISOLTA — D-C, implementata dal piano 35-08.)** La Server Action chiede
   `staff.manage`, che e' per-account e non per-notte: chi e' assegnato per una
   notte non puo' assegnare nessun altro. La domanda resta aperta **come
   decisione futura**, non come lacuna, ed e' scritta nel codice invece che
   risposta per omissione.
   - Sappiamo: `ACCESS-MODEL-DECISIONS.md §Cosa NON e' risolto` la lascia aperta
     esplicitamente.
   - Non sappiamo: se chi e' assegnato come «organizer per una notte» possa
     assegnare a sua volta.
   - **Raccomandazione:** **no** in questa fase, per costruzione — la Server
     Action chiede `staff.manage` (per-account), non l'assegnazione. Cosi' la
     domanda resta aperta invece di essere risposta per omissione. **Scriverlo.**

2. **Un `member` `pending` puo' essere assegnato a una serata?**
   **(RISOLTA — per costruzione, piano 35-03; il meccanismo e' del piano 35-02.)**
   La foreign key composta `(user_id, assignee_role) → profiles (id, role)` rende
   assegnabili **solo** `master`, `organizer` e `staff`, e quei tre sono
   `approved` per regola di database (`role ⇒ approved`, fase 43). La domanda
   sui `member` **sparisce**: non ce ne sono di assegnabili. Percio' il braccio
   del resolver non consulta lo stato, e un test di stato li' sarebbe un modo
   nuovo di rifiutare qualcuno alla porta.
   - Sappiamo: `master`/`organizer`/`staff` sono `approved` per regola di
     database dalla fase 43. Restano i `member`.
   - **Raccomandazione:** A2 — non consultare lo stato, come `door.operate`.
     **Ma e' una decisione d'accesso e va confermata dal proprietario** (C15).

3. **L'assegnazione va in `membership_acts` o basta `party_assignments`?**
   **(RISOLTA — D-D, implementata dal piano 35-04.)** Va nel registro **e** D-18
   viene riscritta con il criterio corretto (*ammettere una persona* non e'
   *concedere un potere*), sostituendo il paragrafo vecchio invece di
   affiancarlo.
   - Sappiamo: la colonna `party_id` e i due nomi d'atto sono stati riservati
     per questo. Ma il criterio di D-18 escluderebbe un atto che scade con la
     notte.
   - **Raccomandazione:** scriverlo nel registro **e** riscrivere D-18 con il
     criterio corretto (*ammettere una persona* ≠ *concedere un potere*).

4. **`door_scan_events_select_admin` va ristretta in questa fase?**
   **(RISOLTA — D-E, implementata dal piano 35-09.)** Si', e **per assegnazione,
   non per ruolo**: `staff.manage` continua a leggere tutto, `door.operate` e
   `party.manage` leggono la propria notte. Il commento vecchio e' sostituito.
   - Sappiamo: la migration la indica come compito **della fase 35**
     (`20260805120000:151-154`).
   - Non sappiamo: se restringerla renda invisibile una serata a un organizer
     che deve rivedere il record dopo.
   - **Raccomandazione:** **restringerla per l'assegnazione, non per il ruolo** —
     chi tiene `staff.manage` continua a leggere tutto; chi ha solo
     un'assegnazione legge quella notte. E dirlo nella migration, perche' il
     commento vecchio va sostituito, non appeso.

5. **Cosa succede a `event_parties.lineup text[]` quando nasce `party_credits`?**
   **(RISOLTA — D-F, implementata dal piano 35-05.)** Convivenza **dichiarata**
   nella migration — `lineup` e' il testo comunicato, `party_credits` e'
   l'attribuzione — con la migrazione fra le due rimandata a una fase che la
   nomini, e il debito registrato per nome nel piano 35-14.
   - **Raccomandazione:** convivenza dichiarata in questa fase (`lineup` resta
     il testo comunicato, `party_credits` e' l'attribuzione), con la migrazione
     rimandata a una fase che la nomini. **Ma va scritto**: due fonti per la
     stessa cosa senza una frase che dica quale vince e' la forma di errore che
     `production-calendar.md` chiama *«il calendario batte il tracker»*.

6. **Le sei migration della fase 43 verranno applicate prima che questa fase
   parta?**
   **(RISOLTA — D-K, implementata dal piano 35-01.)** Si procede, e il
   `checkpoint:human-verify` bloccante del primo piano mette il fatto per
   iscritto invece di ridiscutere la decisione.
   - Sappiamo: non lo sono oggi, e `ACCESS-MODEL-DECISIONS.md §12` registra la
     decisione del proprietario di rimandare **tutta** la verifica manuale alla
     fine della costruzione, **con il suo prezzo dichiarato**.
   - **Raccomandazione:** procedere (la decisione e' presa e chiusa), e mettere
     il `checkpoint:human-verify` bloccante nel primo piano invece di
     ridiscutere la decisione.

---

## Sources

### Primarie (confidenza ALTA — lette in questa sessione, riga per riga)

- `supabase/migrations/20260807000000_capability_model.sql` — resolver, catalogo, grant, il divieto sul JWT
- `supabase/migrations/20260807010000_policies_to_capabilities.sql` — le 45 policy convertite
- `supabase/migrations/20260808000500_staff_role.sql` — il quarto ruolo e le sei rinunce
- `supabase/migrations/20260808001000_role_implies_approved.sql` — il vincolo e la trappola da rifiutare
- `supabase/migrations/20260808002000_membership_register.sql` — `membership_acts`, `record_membership_act`, `party_id`, D-18
- `supabase/migrations/20260808003000_attendances_entry_role.sql` — `entry_role`, e la fase 35 come terzo caso
- `supabase/migrations/20260805120000_door_scan_events.sql` — il registro della porta e la policy grossolana
- `supabase/migrations/20260225150000_party_architecture.sql`, `20260226300000_multi_sub_events.sql`, `20260226400000_party_lineup_venue_secret.sql`, `20260226100000_artist_profiles.sql`, `20260225120000_phase7_media.sql`
- `src/lib/capabilities/{keys,server,guards}.ts`, `src/lib/door/require-operator.ts`, `src/lib/membership/acts.ts`
- `src/lib/offline/{checkin-store,sync-manager}.ts`, `src/app/(admin)/admin/scanner/{page,ScannerClient}.tsx`
- `src/app/api/tickets/{attendance,checkin}/route.ts`, `src/app/api/tickets/checkin/undo/route.ts`, `src/app/api/membership/{list,verify}/route.ts`
- `src/lib/supabase/middleware.ts`, `src/utils/datetime.ts`, `src/types/database.ts`
- `scripts/{rls-baseline,rls-baseline-container,verify-capabilities,verify-no-header-identity}.mjs`, `scripts/container/seed.mjs`
- `.planning/{ROADMAP,REQUIREMENTS,ACCESS-MODEL-DECISIONS,STATE,config.json}`
- `.planning/phases/43-role-model-account-creation/{43-VERIFICATION,43-HUMAN-UAT}.md`
- `./CLAUDE.md` e `.claude/rules/{meta-gates,access-gating,checkin-offline,supabase-data,nextjs-architecture,ticketing-payments,sound-manifesto,production-calendar}.md`

### Secondarie (confidenza MEDIA — verifica esterna di un punto tecnico)

- Conferma esterna che Postgres **non** mette in cache il valore di una funzione
  `STABLE` durante la valutazione di una policy riga per riga, e che il rimedio
  e' il wrapper `(select …)`. Concorda con la misura `EXPLAIN` gia' registrata a
  `20260807000000_capability_model.sql:177-184`:
  - [Optimizing Postgres Row Level Security (RLS) for Performance — Scott Pierce](https://scottpierce.dev/posts/optimizing-postgres-rls/)
  - [Postgres Row-Level Security Footguns — Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
  - [Postgres RLS Implementation Guide — Permit.io](https://www.permit.io/blog/postgres-rls-implementation-guide)

### Terziarie (confidenza BASSA — nessuna)

Nessun risultato di ricerca non verificato e' stato usato per una raccomandazione.
Ogni forma proposta qui deriva da un file di questo repository.

---

## Metadata

**Confidenza per area:**

| Area | Livello | Ragione |
|---|---|---|
| Cosa esiste gia' (fasi 31/32/33/43) | **ALTA** | Letto riga per riga; ogni affermazione ha `file:riga` |
| L'estensione minima del resolver | **ALTA** | Istruita testualmente dal commento della migration che l'ha preparata |
| La forma del registro per un'assegnazione | **ALTA** | `party_id` e i due nomi d'atto sono gia' riservati |
| Le tensioni della porta (T-1, T-2, T-3) | **ALTA** sull'esistenza, **MEDIA** sulla soluzione raccomandata | I difetti sono misurati con `file:riga`; la soluzione e' progetto, e ha alternative |
| Forma della tabella dei crediti | **MEDIA** | Il principio (nessuna colonna d'account) e' solido; la forma dipende da A3/A4 |
| Scelta degli status code | **MEDIA** | Vincolata dalla tabella del drain, ma A5 e' un'assunzione da confermare |
| Copertura di verifica | **ALTA** | L'harness e' letto; il conteggio 4-su-8 automatizzabili e' derivato requisito per requisito |

**Stack:** nessun pacchetto nuovo. **Migration:** si', sostanziali, **applicate a
mano**. **Fase Critical** per la tabella di classificazione di `CLAUDE.md`
(accesso, RLS, porta).

**Data della ricerca:** 2026-08-08
**Valida fino a:** 2026-09-07 (30 giorni) — **oppure fino al momento in cui le sei
migration della fase 43 vengono applicate**, che e' il fatto piu' probabile a
cambiare le premesse di questo documento.
