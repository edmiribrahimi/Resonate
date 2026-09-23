# Phase 52: La barra di navigazione e i ritocchi - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

La barra di navigazione per ogni pubblico — chi lavora, l'`attendee`, l'anonimo
— con l'ordine e le voci decise qui; il pannello Management che sostituisce la
sezione «Management Tools» della pagina Account e la colonna «Work»; il cancello
vero sulla gallery (chiave `gallery.view` nel catalogo, riga nella mappa delle
rotte, guardia in cima alla pagina); la barra degli strumenti appesa da
telefono dentro uno strumento; il numero `staff` della pagina membri senza
filtro; i chip dei format ricavati dalle serate visibili. Piu' i due ritocchi
alla porta chiesti dal proprietario durante la fase 51: cronologia e avvisi in
due linguette, e il viewport che si ridimensiona sotto la tastiera.

**Non e' in questa fase:** la pagina TASK e il suo badge (fase 53: qui solo la
voce spenta e il posto del badge); la riapertura della gallery al pubblico
(«togliere una riga», quando ci sara' qualcosa da pubblicare); i documenti
della persona (fase 57); qualunque nuova superficie di contenuto.

**NAV-01 e' SUPERATO da questa discussione** (proprietario, 2026-09-23): «Home»
esce dalla barra e la barra ha **quattro voci**, non sette. La riga della
roadmap va riscritta con `/gsd-phase edit 52`; fino ad allora vale questo
documento, non la tabella.

</domain>

<decisions>
## Implementation Decisions

### La barra
- **D-52-01 — Quattro voci per chi lavora: Events · Check-in · TASK · Management.**
  Icona sopra ed etichetta sotto, ~90 px a voce su 360 px. Gallery e Account
  stanno dentro il pannello Management, non in barra. Scelto dal proprietario
  fra tre disegni (sei voci con etichetta, icone sole, quattro + pannello).
- **D-52-02 — «Home» non esiste piu'.** `/` resta il redirect 307 a `/events`
  (fase 50, D-50-12); nessuna voce Home, nessuna pagina nuova. NAV-01 va
  riscritto.
- **D-52-03 — TASK e' disegnata ma spenta**: voce grigia, `aria-disabled`,
  **non e' un link** — nessuna navigazione, nessun tooltip, nessuna pagina
  segnaposto. La voce e' disegnata per ospitare il badge a due numeri di
  TASK-04, ma la 52 **non legge nessun dato** e non mostra nessun contatore.
  Compare a chi vedra' TASK nella 53 (organizer e staff, TASK-01); l'`attendee`
  non la vede.
- **D-52-04 — Account in barra solo per chi non ha Management.** `attendee`:
  Events · Account. Anonimo: Events · Account (che porta al login). Chi ha
  almeno una voce nel pannello trova Account dentro il pannello. La regola
  della barra resta quella di D-50-09: sessione, ruolo, capability — la
  presenza del pannello e' derivata da quelle tre, non un quarto criterio.
- **D-52-05 — Check-in resta assente per chi non ha `door.operate`** (per
  ruolo o per assegnazione), come oggi. Non si disegna spenta: TASK spento e'
  una pagina che non esiste ancora, una voce spenta per un permesso sarebbe un
  secondo verdetto sull'operatore in barra (`access-gating.md`, coerenza
  navigazione/permessi).
- **D-52-06 — La barra si nasconde mentre un campo ha il fuoco** (login,
  ricerca alla porta) e torna al blur: con `resizes-content` la barra fissa in
  basso salirebbe sopra la tastiera e mangerebbe lo spazio alla lista e al
  pulsante «Check in».

### Il pannello Management
- **D-52-07 — Da telefono e' un foglio che sale dal basso, sopra la barra**,
  che resta visibile sotto; copre la pagina; si chiude toccando fuori o la
  stessa voce. **Solo la lista, in ordine alfabetico, una voce per riga**,
  nessuna intestazione: Account e' una voce e porta gia' email, password e
  Sign out.
- **D-52-08 — Su tablet e desktop si espande dentro la colonna a sinistra e
  sostituisce la sezione «Work»**: una lista sola. Parte **aperta dentro uno
  strumento** (`/admin/*`, voce corrente evidenziata) e **chiusa altrove**
  (Events, Check-in); un tocco la apre e la chiude.
- **D-52-09 — Il contenuto e' `visibleStaffTabs` piu' Gallery e Account**,
  filtrato per capability come oggi (`staff-tabs.ts`, `ManagementSection.tsx`:
  una voce si disegna solo se il middleware la lascerebbe passare). La sezione
  «Management Tools» della pagina Account **sparisce** (NAV-03).
- **D-52-10 — Lo strumento `/admin/events` si chiama «Manage events»**, nel
  pannello e nella striscia degli strumenti, perche' «Events» in barra e' la
  pagina pubblica. Scelto dal proprietario contro «Nights» e contro il nome
  doppio.
- **D-52-11 — NAV-04: dentro uno strumento, da telefono, resta appesa la
  striscia scorrevole degli strumenti** (`StaffNav`, oggi in flusso sopra il
  contenuto): sticky sotto l'intestazione, cosi' si cambia strumento senza
  tornare su.

### Il cancello sulla gallery
- **D-52-12 — Nasce la chiave `gallery.view`**, concessa **per ruolo a master,
  organizer e staff**: migration di catalogo (chiave + tre concessioni) con la
  costante in `keys.ts` nello stesso commit; `verify:capabilities` passa da 15 a
  16 chiavi e da 28 a 31 concessioni e va aggiornato nello stesso commit. Prima
  sul laboratorio, poi in produzione **sotto un atto datato** che si consuma
  una volta (`ai-engineering.md`).
- **D-52-13 — `/gallery` entra in `capability-routes.ts` sotto `gallery.view`
  e la pagina porta la guardia in cima**, come ogni strumento. Un `attendee`
  loggato che digita l'indirizzo riceve **lo stesso rifiuto standard del
  middleware** che riceve su `/admin`; un anonimo va **al login con ritorno**
  (`/login?next=/gallery`). Niente 404, niente caso speciale.
- **D-52-14 — Nota per chi riaprira' la gallery al pubblico**: si toglie la
  riga da `capability-routes.ts` e la guardia in pagina, la voce torna in barra
  per tutti, la chiave resta nel catalogo (innocua). Va scritta accanto alla
  riga, nel codice.

### I chip dei format (NAV-06) e la pagina membri (NAV-05)
- **D-52-15 — I chip si ricavano dall'array di eventi gia' letto, PRIMA del
  filtro per format**, mai da una seconda interrogazione (roadmap): un format
  compare se ha almeno una serata — passata o futura — **visibile a chi
  guarda**. Rovescia di proposito D-36-13/D-36-16 («i chip non variano con chi
  guarda»): la riga varia con chi guarda ma non gli mostra nulla che non stia
  gia' vedendo. Il commento in `events/page.tsx` che dichiara la regola vecchia
  va riscritto con questa.
- **D-52-16 — Un format ritirato con serate visibili mostra il chip**:
  ritirato vuol dire che non se ne assegnano di nuove, non che le vecchie
  spariscono.
- **D-52-17 — Con zero serate visibili la riga dei chip e' assente**, niente
  «All» da solo.
- **D-52-18 — NAV-05**: il numero `staff` in `MemberTable.tsx` smette di essere
  un link con filtro e si comporta come le altre cifre; il commento che ne
  spiegava l'asimmetria va aggiornato.

### La porta: linguette e viewport (todo della fase 51)
- **D-52-19 — Cinque linguette in un gruppo solo: All · Not Arrived · Checked
  In · Recent · Alerts**, sempre presenti anche vuote (Recent vuota: «No scans
  yet»; Alerts vuota: «Nothing to report»), cosi' la forma della porta non cambia
  a meta' serata. **Entrambe portano il conteggio** («Recent (12)», «Alerts
  (2)»), Alerts senza numero a zero.
- **D-52-20 — Un avviso nuovo evidenzia la linguetta Alerts e alza il
  conteggio; non la apre da sola.** Chi cerca un nome non perde la lista.
- **D-52-21 — Cosa va in Alerts e cosa resta in testata.** In Alerts: la banda
  di eta' della lista (con il suo «tap to reload»), gli esiti del drenaggio, gli
  avvisi di cache (`cacheNotices`). **In testata, sempre visibili**: le
  pastiglie Offline / Pending (n) / «Sign in again to record n entries» **e
  l'avviso della guest list a radio spenta** («do not refuse them… let them
  in»): e' un'istruzione su chi far entrare, non una notizia
  (`checkin-offline.md`, asimmetria del rifiuto). Barra fissa di 51-07: titolo
  e «QR Scan» restano in vista con qualunque linguetta aperta.
- **D-52-22 — L'annullamento resta sulla riga della cronologia, dentro
  Recent** (ultimi 5, un tocco in piu' per aprire la linguetta); nessuna
  scorciatoia «Undo last» in testata; il controllo di supervisione non cambia.
- **D-52-23 — Il viewport si sistema per tutta l'app**: `interactive-widget=
  resizes-content` nel meta viewport di `layout.tsx` e `dvh` al posto di `vh`
  dove la pagina fissa un'altezza. **Prova manuale su iPhone** (Safari) su
  login, porta con la tastiera aperta e un form pubblico, scritta passo per
  passo; nessun test automatico esiste.

### Claude's Discretion
- L'ordine dei chip (catalogo `sort_order`, come oggi, o prima apparizione) e
  la forma dello stato vuoto della lista quando la riga dei chip e' assente.
- Icone di TASK e Management, il colore dello «spento», l'animazione del foglio.
- Come si evidenzia la linguetta Alerts (pallino, colore) e il tono dei due
  testi vuoti.
- Come il pannello sa se sei «dentro uno strumento» (prefisso `/admin/`).
- L'ordine dei piani, purche' la migration di `gallery.view` passi dal
  laboratorio prima della produzione e la prova su iPhone chiuda la fase.

### Folded Todos
- **`door-tabs-recent-scans-and-alerts.md`** — «Recent scans» e gli avvisi in
  due linguette proprie, chiesto dal proprietario il 2026-09-22 guardando la
  porta dopo un drenaggio. Entra come D-52-19..22, con i vincoli che il todo
  gia' pone (pastiglie in testata, undo raggiungibile, barra fissa di 51-07).
- **`door-and-login-viewport-crops-under-keyboard.md`** — la porta e il login
  si ritagliano sotto la tastiera invece di ridimensionarsi (iPhone, Safari,
  osservato il 2026-09-22). Entra come D-52-06 e D-52-23.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### La barra e il pannello
- `src/lib/rbac/roles.ts` — `NAV_ITEMS` e `getVisibleNavItems`: il filtro su sessione, ruolo, capability (D-50-09) e il commento sulla voce Gallery che rimanda a NAV-02
- `src/components/layout/AppNav.tsx` — la barra fissa in basso da telefono e la colonna da `md:` in su; `--nav-inset-block-end` in `globals.css`, da cui dipendono quattro file
- `src/lib/routes/staff-tabs.ts` — `STAFF_TABS` e `visibleStaffTabs`: la sorgente del pannello Management
- `src/components/account/ManagementSection.tsx` — la lista da spostare nel pannello, e il suo docblock («hiding a nav item is not protecting a route»)
- `src/components/staff/StaffNav.tsx` e `src/app/(admin)/admin/(work)/layout.tsx` — la colonna «Work» e la striscia scorrevole da telefono (NAV-04)
- `.claude/rules/access-gating.md` — gate *coerenza navigazione/permessi*
- `.claude/rules/nextjs-architecture.md` — gate *il gruppo non autorizza*, R-WORK-ROUTES

### Il cancello sulla gallery
- `src/lib/routes/capability-routes.ts` — la mappa che middleware, guardia di pagina e navigazione leggono; la forma di una voce (`routes`, `assignmentOpenable`, `alsoGatesTables`)
- `src/app/(public)/gallery/page.tsx` — la pagina senza guardia, con il commento che rimanda a NAV-02
- `src/lib/capabilities/keys.ts` — `CAP`, 15 chiavi dalla fase 51
- `scripts/verify-capabilities.mjs` — `ROLE_GRANTS`, `EXPECTED_GRANT_COUNT = 28`: vanno mossi nello stesso commit della migration
- `supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql` — l'ultima migration di catalogo, la forma da seguire (chiavi, concessioni, `DO` di verifica)
- `.planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-AUTHORISATION.md` e `51-AUTHORISATION-COMMENT.md` — la forma di un atto datato per scrivere in produzione
- `.claude/rules/ai-engineering.md` — gate *l'autorizzazione a scrivere in produzione e' un atto*
- `.claude/rules/supabase-data.md` — migration in avanti, tipi allineati

### I chip e la pagina membri
- `src/app/(public)/events/page.tsx` — la lettura del catalogo e il commento su D-36-13/D-36-16 da rovesciare; l'array `upcoming`/`past` da cui ricavare i chip
- `src/components/admin/MemberTable.tsx` — la cifra `staff` come link con filtro (~riga 686-694) e il commento che la spiega
- `.claude/rules/venue-secrecy.md` — nessun conteggio che riveli una serata non annunciata

### La porta
- `.planning/todos/pending/door-tabs-recent-scans-and-alerts.md` — i vincoli di dominio delle linguette
- `.planning/todos/pending/door-and-login-viewport-crops-under-keyboard.md` — l'osservazione su iPhone e le due superfici
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` — `FILTER_TABS`, `scanHistory`, `cacheNotices`, la banda di eta' (`stalenessBandText`), `guestListWarningText` (decisione WR-04 del 2026-09-23), la barra fissa di 51-07
- `src/app/layout.tsx` — `export const viewport` e `min-h-dvh` sul body
- `src/app/(auth)/login/page.tsx` — il modulo da provare con la tastiera
- `.claude/rules/checkin-offline.md` — asimmetria del rifiuto, zero fallimenti silenziosi, *provato quel giorno su quel dispositivo*
- `.planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-ESITI.md` — la forma di una prova alla porta con telefono vero (`P-51-1`)

### Regole di fase
- `.planning/ROADMAP.md` §Phase 52 — NAV-02..06 come sono; **NAV-01 superato** da D-52-01/D-52-02
- `.planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-VERIFICATION.md` — il debito lasciato alla 52 (chiuso il 2026-09-23 tranne i due todo qui sopra)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `visibleStaffTabs(held)` in `staff-tabs.ts`: la stessa funzione che disegna la colonna Work e la sezione dell'account; il pannello la riusa aggiungendo Gallery e Account.
- `CollapsibleSection` (`components/account/`): la primitiva a scomparsa gia' esistente, candidata per la voce Management nella colonna desktop.
- `FILTER_TABS` nello scanner: il gruppo di linguette con conteggio a cui aggiungere Recent e Alerts.
- `resolveRoute` / `CAPABILITY_ROUTES`: la riga per `/gallery` e' una voce in piu' nella mappa, letta da tre lettori che non possono dissentire.
- `AppNav` gia' distingue telefono (`fixed inset-x-0 bottom-0`) e colonna (`md:fixed md:inset-y-0`) via CSS, senza leggere il viewport.

### Established Patterns
- La barra si filtra su tre cose e basta: sessione, ruolo, capability (D-50-09). Il pannello e Account-in-barra si derivano da quelle tre.
- Nascondere una voce non protegge una rotta: ogni voce nascosta ha il suo controllo lato server (`access-gating.md`).
- Le migration di catalogo portano chiavi e concessioni in una transazione, con un `DO` che verifica prima di cancellare; `verify:capabilities` confronta i due insiemi in entrambe le direzioni.
- Le scritture in produzione passano da un atto datato che si consuma una volta; il laboratorio prima.
- Nessun test runner: `npm run build` e' il typecheck; la porta si prova su un telefono vero, sul laboratorio, con procedura scritta.

### Integration Points
- `NAV_ITEMS` (`roles.ts`) e `AppNav.tsx`: le quattro voci, TASK spento, Account condizionale, il foglio.
- `(work)/layout.tsx` + `StaffNav.tsx`: la striscia sticky da telefono; la colonna Work che sparisce a favore del pannello.
- `capability-routes.ts` + `gallery/page.tsx` + `keys.ts` + migration + `verify-capabilities.mjs`: il cancello.
- `events/page.tsx`: chip dall'array; `MemberTable.tsx`: la cifra staff.
- `ScannerClient.tsx`: linguette, testata, undo; `layout.tsx`: viewport; `login/page.tsx`: barra nascosta al fuoco.

</code_context>

<specifics>
## Specific Ideas

- Il disegno scelto per la barra (360 px): `Events · Check-in · TASK · Management`, ~90 px a voce, TASK grigio. Il pannello: `Account · Artists · Calendar · Formats · Gallery · Location · Manage events · Manifesto · Members · Newsletter · Venues · Visual` (le voci che il visitatore tiene), in ordine alfabetico.
- I due testi vuoti della porta, in inglese britannico come il resto della porta: «No scans yet», «Nothing to report».
- L'avviso «do not refuse» resta esattamente dov'e', con la frase decisa il 2026-09-23 (WR-04).

</specifics>

<deferred>
## Deferred Ideas

- **La riga NAV-01 della roadmap** va riscritta: `Events · Check-in · TASK · Management` (Gallery e Account nel pannello; Account in barra solo per chi non ha Management; Home non esiste). Con `/gsd-phase edit 52`, non a mano.
- **La riapertura della gallery al pubblico**: fuori fase, quando ci sara' qualcosa da pubblicare (D-52-14 lascia la nota nel codice).
- **TASK-04, il badge**: la 53. Qui solo il posto.

### Reviewed Todos (not folded)
- `competitor-features-discovery.md`, `external-occupancy-calendar-key.md`, `form-untick-venue-secret-leaves-no-trace.md`, `google-pay-deferred-by-decision.md`, `guest-ticket-purchase.md`, `profiles-email-not-unique.md`, `secret-venue-three-surfaces.md` — proposti dal matcher su parole comuni (score 0,6, «del», «phase», «una»); nessuno riguarda la barra, la gallery, i chip o la porta. Restano dove sono.

</deferred>

---

*Phase: 52-la-barra-di-navigazione-e-i-ritocchi*
*Context gathered: 2026-09-23*
