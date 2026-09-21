# Phase 51: Via le superfici da socio, e la porta - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Tolgo dal prodotto tutto cio' che esisteva perche' c'erano i soci: la membership
card (superficie, rotta, capability), lo storico delle presenze del socio, la
verifica alla porta per codice socio (`/api/membership/verify`) con il suo
precache nel service worker e la sua coda offline, l'elenco dei soci scaricato
prima della serata. L'account leggero di chi compra o e' invitato smette di
chiamarsi `member`. La rimozione si prova **a rete spenta, prima e dopo**, con
procedura scritta (MEM-04).

Non e' in questa fase: l'ordine e le voci della barra (52), i documenti della
persona (57), qualunque cancellazione self-service dell'account.

</domain>

<decisions>
## Implementation Decisions

### La porta, dopo la rimozione
- **D-51-01 — Nessun messaggio dedicato per un vecchio QR da socio.** Nessuno
  e' iscritto, quindi nessuno mostrera' la card: un codice di quella forma
  riceve lo stesso rifiuto di un codice sconosciuto. Non si costruisce un
  riconoscimento per un caso che non esiste.
- **D-51-02 — Il codice socio si cancella: colonna `profiles.membership_code`,
  conio alla creazione dell'account (`20260905130000_membership_code_crypto.sql`
  e i chiamanti), tipo in `database.ts`.** Migration provata **prima sul
  laboratorio** con procedura scritta, come D-50-01. Una credenziale che nessuna
  porta verifica non deve esistere.
- **D-51-03 — Staff e organizer non scansionano: sono in servizio.** Chi e'
  assegnato alla serata entra perche' lavora; la porta non li registra come
  ospiti e non esiste un QR per loro.
- **D-51-04 — Le presenze registrate da scansioni socio si CANCELLANO.**
  Decisione del proprietario. E' una cancellazione in produzione: vale
  `ai-engineering.md` per intero — **conteggio prima** (per tabella, per
  cascata letta dai vincoli `ON DELETE`), **istantanea** di ogni tabella
  raggiungibile, **rimozione per chiave primaria** su una lista catturata, mai
  per interfaccia, **autorizzazione datata** del proprietario che si consuma
  una volta, e conferma da una fonte diversa da quella su cui si e' agito.
  Prima sul laboratorio, poi in produzione.
- **D-51-05 — Lo schermo della porta mostra solo esito e tipo di biglietto,
  nessun nome** (decisione del proprietario, 2026-09-21, `deferred-items.md`
  §7 della fase 50): il biglietto e' al portatore (D-49-03) e un nome fa
  respingere un ospite valido. Con esso entrano le tre osservazioni dal lab:
  l'avviso «member list NOT refreshed» (vedi D-51-10), l'intestazione dello
  scanner **fissa** in alto, la zona dell'esito **opaca**.

### Il ruolo di chi compra
- **D-51-06 — `member` diventa `attendee`, in questa fase.** Chi partecipa:
  compra o e' invitato. Non `guest`, che alla porta e nella coda offline e' gia'
  l'invitato in lista; non `buyer`, sbagliato per chi entra da guest list senza
  pagare. Tre vincoli `CHECK` nelle migration (`20260224_rbac_migration.sql:15`,
  `20260807000000_capability_model.sql:121`, `20260808000500_staff_role.sql:76`)
  e otto file di codice: migration sul laboratorio prima, poi produzione, e le
  righe esistenti passano ad `attendee` nella stessa migration.
- **D-51-07 — Le chiavi `membership.active` e `membership.card.view` escono dal
  catalogo e dalla costante TypeScript** (`src/lib/capabilities/keys.ts`), che e'
  il debito dichiarato dalla fase 50 (`deferred-items.md`, «La CHIAVE
  `membership.active` resta nel catalogo»).
- **D-51-08 — `membership_acts` si rinomina in `account_acts`**, con ogni punto
  che la scrive (`src/lib/membership/acts.ts` e i chiamanti). Coerenza con il
  modello nuovo, decisa dal proprietario sapendo che costa una migration in piu'.

### L'account di chi ha comprato
- **D-51-09 — La pagina mostra SOLO i biglietti**: quelli delle serate in
  arrivo con il QR, e quelli passati in una sezione chiusa «Past». Piu' cambio
  password ed email, che gia' esistono. Niente drink (si vedono dal menu QR
  della serata, come per chi non ha account), niente card, niente storico,
  niente caricamento media.
- **D-51-09b — Vive a `/account`**, il nome che la barra usa gia'; `/dashboard`
  resta come **redirect permanente** cosi' i link vecchi non muoiono. Il gruppo
  di rotte `(members)` perde `/attendance` e `/membership-card`.

### Il download prima della serata e la coda offline
- **D-51-10 — Il download della lista resta, solo per la guest list.** Gli
  invitati senza email non hanno un QR: alla porta si trovano per nome, e a rete
  spenta serve la lista scaricata prima. `/api/membership/list` e il suo
  precache spariscono; la guest list ha la sua strada (esistente o nuova: lo
  decide la ricerca). L'avviso smette di dire «member list», dice «guest list»
  e **si accende solo quando e' vero** — oggi resta acceso anche col badge
  «Online».
- **D-51-11 — Le voci `membership` ancora in coda su un telefono vecchio si
  scartano in silenzio** all'aggiornamento della coda (decisione del
  proprietario). Vincolo minimo di `meta-gates.md`: **una riga di log con
  categoria e conteggio** nel client, nessuna superficie. La versione di
  IndexedDB sale e `QueuedSubjectType` perde `"membership"`.
- **D-51-12 — La prova MEM-04 la fa il proprietario, con un telefono vero, sul
  laboratorio, prima e dopo**, come `P-50-8`: procedura scritta passo per
  passo, radio spenta davvero (non solo wi-fi), stessa serata di prova, esito
  registrato con la data nel VERIFICATION.


### Le tre domande aperte dalla ricerca, chiuse il 2026-09-21
- **D-51-13 — `door_scan_events.subject_type` conserva `'membership'` come valore storico**, sia nel `CHECK` SQL sia nell'union `DoorSubjectType` (`outcome.ts`), con un commento che lo dichiara storico e non piu' scrivibile. E' il registro delle convalide alla porta: **non si riscrive**, e D-51-04 non lo autorizza. Decisione tecnica dell'assistente sulla raccomandazione della ricerca (§ Open Question 1).
- **D-51-14 — `public.attendances` si svuota per intero e la tabella si toglie**, con le sue policy e ogni oggetto che la nomina: decisione del proprietario. Dopo la fase nessuno la scrive ne' la legge (ricerca §3). Vale D-51-04 per intero: conteggio per tabella prima, cascata enumerata dal catalogo (misurata vuota, da rimisurare), istantanea, cancellazione per chiave, autorizzazione datata che si consuma una volta; lab prima, produzione dopo.
- **D-51-15 — `subject_label` nel registro degli account, senza piu' il codice socio, porta le prime 8 cifre di `subject_id`**, e `record_membership_act` si ridefinisce **nella stessa migration** che toglie la colonna e rinomina la tabella in `account_acts` (ricerca §4: un `DROP COLUMN` da solo rompe la funzione in silenzio e con essa la creazione degli account). Decisione tecnica dell'assistente.

### Claude's Discretion
- Nome e testo del pulsante di download della guest list, e la forma della
  categoria di log per le voci scartate (D-51-11).
- Come la guest list arriva al telefono per l'offline, se serve una rotta nuova
  o basta quella esistente: lo decide la ricerca leggendo il codice.
- L'ordine dei piani, purche' la migration del ruolo e quella del codice socio
  passino dal laboratorio prima della produzione e la prova a rete spenta
  chiuda la fase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### La porta e l'offline
- `.claude/rules/checkin-offline.md` — i gate della porta: asimmetria del rifiuto, coda, annullamento
- `src/lib/offline/checkin-store.ts` e `src/lib/offline/sync-manager.ts` — la coda con il tipo `membership` da togliere (`QueuedSubjectType`, `case "membership"`)
- `src/app/sw.ts` — le due `RuntimeCaching` su `/api/membership/list` e `/verify` (righe 42-46) e il precache
- `.planning/phases/50-via-le-iscrizioni/deferred-items.md` — §7 (schermo senza nome) e «Osservate dal proprietario sulle schermate del lab»: le tre osservazioni sulla porta
- `.planning/phases/50-via-le-iscrizioni/50-ESITI.md` §`P-50-8` — la forma della prova a rete spenta da replicare

### Accesso e ruoli
- `.claude/rules/access-gating.md` — ruolo e capability, `member` non e' «socio»
- `src/lib/rbac/roles.ts` — `ROLES.MEMBER`
- `src/lib/capabilities/keys.ts` — `MEMBERSHIP_ACTIVE`, `MEMBERSHIP_CARD_VIEW`
- `supabase/migrations/20260808000500_staff_role.sql` — il `CHECK` corrente sul ruolo
- `supabase/migrations/20260905130000_membership_code_crypto.sql` — il conio del codice socio
- `supabase/migrations/20260808005000_membership_acts_append_only.sql` e `20260921120000_drop_status_and_referral.sql` (D-50-16) — il registro degli atti da rinominare
- `.planning/phases/50-via-le-iscrizioni/50-CONTEXT.md` — D-50-01 (forma della migration sul lab), D-50-05 (`member` fino alla 51)

### Cancellazioni in produzione
- `.claude/rules/ai-engineering.md` — gate rimozione per chiave, istantanea per cascata, contatore da fonte diversa, autorizzazione come atto
- `.claude/rules/meta-gates.md` — zero fallimenti silenziosi, verifica in un repo senza test

### Superfici
- `src/app/(members)/dashboard/page.tsx` — la pagina da cui nasce `/account`
- `src/app/(members)/membership-card/`, `src/app/(members)/attendance/page.tsx`, `src/components/membership/MembershipCardView.tsx` — le superfici che escono
- `scripts/conversion-manifest.mjs` — ogni superficie che esce o cambia rotta va tolta o rinominata nel manifest nello stesso commit

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `P-50-8` in `50-ESITI.md`: la procedura a rete spenta gia' scritta ed eseguita, da copiare nella forma
- La migration della fase 50 (`20260921120000_drop_status_and_referral.sql`): un `CHECK` riscritto, una colonna tolta, righe aggiornate, in una transazione, provata sul lab
- `src/lib/offline/checkin-store.ts`: la versione dello schema IndexedDB e' gia' salita una volta (v2→v3): stesso meccanismo

### Established Patterns
- Ogni rotta rimossa esce anche dal manifest di conversione e dalla mappa delle rotte del middleware, o `verify:conversion` e `verify:routes` arrossiscono
- Le migration si applicano dalla Management API (endpoint migrations, non query), prima sul lab; ogni script di laboratorio rifiuta il ref di produzione come prima riga
- Le server action restituiscono cause distinte, mai un messaggio generico

### Integration Points
- Middleware `src/lib/supabase/middleware.ts` e `src/middleware.ts`: le rotte `/membership-card`, `/attendance`, il redirect `/dashboard` → `/account`
- `src/app/api/tickets/attendance/route.ts` e `checkin/route.ts`: il ramo che ammette sul solo `membership_code`
- `src/components/layout/AppNav.tsx` e `src/lib/rbac/roles.ts` (`getVisibleNavItems`): la voce Account punta a `/account`
- `src/app/(admin)/admin/members/actions.ts` e `src/lib/membership/acts.ts`: il registro degli atti rinominato
- I template mail con la parola «Member» come ripiego (`ticket-confirmation.tsx`)

</code_context>

<specifics>
## Specific Ideas

- Lo scanner, dopo: intestazione con il pulsante «QR Scan» fissa in alto anche mentre la lista scorre; zona dell'esito opaca, leggibile in un colpo d'occhio; nessun nome.
- L'avviso della lista: «guest list not refreshed», acceso solo se la lista scaricata e' davvero vecchia o assente.

</specifics>

<deferred>
## Deferred Ideas

- **Cancellazione self-service dell'account** da `/account`: oggi la fa un organizer su richiesta, e `/privacy` dice di scrivere a info@. Nuova capacita', fase a se'.
- **Ordine e voci della barra** per un `attendee` (Events, Account; Gallery solo allo staff): fase 52, NAV-01/NAV-02.
- **Le parole «member/membership» nei documenti e nella persona**: fase 57.

### Reviewed Todos (not folded)
- `competitor-features-discovery.md`, `external-occupancy-calendar-key.md`, `form-untick-venue-secret-leaves-no-trace.md`, `google-pay-deferred-by-decision.md`, `guest-ticket-purchase.md`, `secret-venue-three-surfaces.md` — accostati dall'indice per parole comuni; nessuno riguarda la porta o le superfici da socio.

</deferred>

---

*Phase: 51-via-le-superfici-da-socio-e-la-porta*
*Context gathered: 2026-09-21*
