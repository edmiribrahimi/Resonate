# Phase 52: La barra di navigazione e i ritocchi - Research

**Researched:** 2026-09-23
**Domain:** navigazione per pubblico (Next.js 16 / React 19 client component), catalogo delle capability (Supabase), porta offline (scanner), viewport iOS
**Confidence:** HIGH sul codice (tutto letto dall'albero di oggi); MEDIUM-LOW sul comportamento iOS (vedi §Viewport: il meccanismo scelto in D-52-23 **non e' spedito in Safari**)

> Convenzione di provenienza usata qui: **[MISURATO: `file:riga`]** = letto dal
> codice o dal gate in questa sessione; **[CITATO: url]** = documentazione o
> fonte esterna letta in questa sessione; **[ASSUNTO]** = conoscenza non
> verificata qui, da confermare prima di diventare decisione.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### La barra
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

#### Il pannello Management
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

#### Il cancello sulla gallery
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

#### I chip dei format (NAV-06) e la pagina membri (NAV-05)
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

#### La porta: linguette e viewport (todo della fase 51)
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

### Deferred Ideas (OUT OF SCOPE)
- **La riga NAV-01 della roadmap** va riscritta: `Events · Check-in · TASK · Management` (Gallery e Account nel pannello; Account in barra solo per chi non ha Management; Home non esiste). Con `/gsd-phase edit 52`, non a mano. *(Fatto il 2026-09-23: `ROADMAP.md:498` porta gia' la riga riscritta — [MISURATO].)*
- **La riapertura della gallery al pubblico**: fuori fase, quando ci sara' qualcosa da pubblicare (D-52-14 lascia la nota nel codice).
- **TASK-04, il badge**: la 53. Qui solo il posto.

#### Reviewed Todos (not folded)
- `competitor-features-discovery.md`, `external-occupancy-calendar-key.md`, `form-untick-venue-secret-leaves-no-trace.md`, `google-pay-deferred-by-decision.md`, `guest-ticket-purchase.md`, `profiles-email-not-unique.md`, `secret-venue-three-surfaces.md` — nessuno riguarda la barra, la gallery, i chip o la porta. Restano dove sono.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Barra a quattro voci Events · Check-in · TASK · Management; Home non esiste; Gallery e Account nel pannello; senza Management: Events · Account; TASK spento | §A (forma di `NavItem`, `getVisibleNavItems`, `AppNav`), §A.4 (vincoli dei gate su un `<button>` nuovo in `AppNav`) |
| NAV-02 | Gallery solo con `gallery.view`: voce nel pannello, riga nella mappa, guardia in pagina | §C (mappa, middleware, `PROTECTED_PREFIXES` + allow-list, guardia), §D (migration e atto datato), §C.5 (cio' che il cancello NON copre: RLS e bucket) |
| NAV-03 | Management e' un pannello, voci in ordine alfabetico, sparisce dalla pagina Account | §B (sorgente `visibleStaffTabs`, costruzione del pannello, foglio da telefono vs colonna) |
| NAV-04 | Dentro uno strumento, da telefono, la striscia degli strumenti resta appesa | §B.4 (`StaffNav` strip, `(work)/layout.tsx`, nessun antenato con overflow) |
| NAV-05 | La cifra `staff` non e' piu' un link con filtro | §F (`MemberTable.tsx:686-694`) e la legenda che diventa falsa con `gallery.view` (§F.2) |
| NAV-06 | Chip solo per i format con almeno una serata visibile, dall'array gia' letto, prima del filtro | §E (`events/page.tsx:208-222`, `:577-586`, perche' non si usa `CardFormat.name`) |
| (todo 51) | Linguette Recent e Alerts alla porta | §G (`ScannerClient.tsx`, debito dei bersagli, cosa va dove) |
| (todo 51) | Viewport sotto la tastiera | §H (Next 16 lo supporta; **Safari no**; misure che funzionano su iPhone) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Nessun test runner per il prodotto.** Verifica = `npm run build` (typecheck) + `npm run verify` (24 gate statici, oggi VERIFY_OK) + procedure manuali scritte. Mai «i test passano». [MISURATO: `package.json` scripts — nessuno script `test`]
- **Il middleware e' UX, la RLS e' sicurezza**: `gallery.view` nella mappa e' un redirect, non un confine sui dati (§C.5).
- **La porta non ha rete**: ogni modifica a `ScannerClient.tsx` va pensata offline; rifiutare un valido e' peggio che ammettere un doppio.
- **Zero fallimenti silenziosi**: ogni avviso della porta resta visibile (anche se spostato in una linguetta, deve essere segnalato: D-52-20).
- **Migration in avanti**; le scritture in produzione passano da un **atto datato** che si consuma una volta; laboratorio prima (`npm run dev:lab`, mai prove in produzione).
- **Repo pubblico**: niente nomi di sede in trattativa, date, dati personali in `.planning/` o nel codice.
- **Classificazione**: la migration `gallery.view` e il cambio della porta sono **Critical** (accesso, porta) → analisi d'impatto e validazione del proprietario prima dell'applicazione in produzione; la barra e i chip sono **Structured**.
- Se si tocca `.claude/**` o `CLAUDE.md`: rilanciare `npm run verify:persona` **dopo**.
- macOS/BSD: `grep -E`, `sed -i ''`; `grep` nudo e' ugrep e salta i file con byte NUL — usare `/usr/bin/grep`.

## Summary

La fase e' in gran parte **ricomposizione di pezzi che esistono gia'**: la barra
(`AppNav.tsx`) filtra su sessione/ruolo/capability con una funzione pura
(`getVisibleNavItems`), il pannello ha gia' la sua sorgente (`visibleStaffTabs`),
la mappa delle rotte ha un posto per `/gallery` e il middleware sa gia' rimbalzare
i due casi. Ma quasi ogni file toccato e' **inchiodato da un gate statico** che
legge il sorgente per frammento: la voce di barra in `verify:touch-targets`
(frammento `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE`), i quattordici bersagli
piccoli della porta (`DOOR_TARGET_DEBT`, tetto 14, che puo' solo scendere), il
digest sha256 di `PageShell.tsx` in `verify:conversion`, la coppia prefissi
protetti ↔ allow-list di `?next=` in `verify:routes`. Il piano deve prevedere il
movimento di ogni gate **nello stesso commit** del codice che lo muove.

Tre scoperte cambiano il piano rispetto a una lettura ingenua del CONTEXT:

1. **Il rimbalzo dell'anonimo non passa dalla mappa** ma da `PROTECTED_PREFIXES`
   (`src/lib/supabase/middleware.ts:607-613`). Mettere `/gallery` nella mappa da
   solo **non** manda l'anonimo a `/login?next=/gallery`: servono anche il
   prefisso e il pattern nell'allow-list di `resolveNext`
   (`src/lib/routes/next-redirect.ts:102-188, 221-226`), che `verify:routes`
   lega fra loro (controllo 3).
2. **`gallery.view` e' la prima concessione per ruolo mai data a `staff`**
   (oggi 0 su 15 — `scripts/verify-capabilities.mjs:507-641`, blocco `staff` di `ROLE_GRANTS`). La legenda visibile
   nella pagina membri dice «A staff account grants nothing of its own … Working
   the door or a gallery comes from the night's own assignment»
   (`MemberTable.tsx:723-729`): diventa **falsa** il giorno della migration e va
   riscritta nello stesso piano, insieme al `COMMENT` di `private.role_capabilities`.
3. **`interactive-widget=resizes-content` non e' spedito in Safari iOS** (WebKit
   l'ha implementato nel sorgente ad agosto 2026, non e' in nessuna release al
   2026-09-11). Next 16.1.6 lo emette correttamente, ma **sull'iPhone del
   proprietario non cambiera' nulla**, e `dvh` non si muove con la tastiera sotto
   `resizes-visual`. Le misure che funzionano davvero sull'iPhone sono di
   **layout** (nulla fra campo di ricerca e lista; il campo portato in cima al
   fuoco), non di viewport. Va detto al proprietario **prima** della prova su
   iPhone, o la prova misurera' un meccanismo che non c'e'.

**Primary recommendation:** tre onde — (1) catalogo + cancello gallery + legenda
staff, applicato al laboratorio; NAV-05; NAV-06; linguette della porta; (2) la
barra e il pannello, che dipendono da `CAP.GALLERY_VIEW`; (3) prova su iPhone nel
laboratorio, atto datato, migration in produzione **prima** del deploy.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Quali voci compaiono in barra e nel pannello | Frontend Server (SSR: `getAccessContext()` in ogni mount) | Browser (`AppNav` disegna, non decide) | `AppNav` e' `"use client"` e il suo docblock vieta di filtrare in JS (`AppNav.tsx:25-31`); la funzione pura riceve le chiavi gia' risolte |
| Apri/chiudi il foglio e la colonna | Browser (stato React) | — | Stato di presentazione, nessuna decisione d'accesso |
| Nascondere la barra al fuoco (D-52-06) | Browser (CSS `:has()`) | — | Nessuna lettura del viewport (`verify:no-viewport-read`) |
| Chi raggiunge `/gallery` | Frontend Server (middleware + guardia di pagina) | — | Mappa `capability-routes.ts` letta da middleware, guardia e navigazione |
| Chi legge le righe della gallery | Database (RLS `event_media_select_approved`) | Storage (bucket pubblico) | **Non cambia in questa fase** — §C.5 |
| Concessione `gallery.view` | Database (`private.capabilities`, `private.role_capabilities`) | — | Catalogo; `private.has_capability` e' il predicato |
| Chip dei format | Frontend Server (`events/page.tsx`) | Database (RLS `formats_select_listed`, `events` pubblicate) | Derivati dall'array gia' letto; nessuna query nuova |
| Linguette, avvisi, undo alla porta | Browser (`ScannerClient.tsx`, offline-first) | IndexedDB (coda) | La porta decide in locale; nulla di questa fase tocca la coda |
| Viewport e tastiera | Browser (meta viewport, CSS) | — | Dipende dal motore: Chrome/Firefox Android sì, Safari iOS no |

## Standard Stack

Nessuna libreria nuova. Tutto si costruisce con cio' che il repo gia' usa.

### Core (gia' installato, versioni misurate)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | `Viewport` con `interactiveWidget` tipizzato | [MISURATO: `node_modules/next/dist/lib/metadata/types/extra-types.d.ts:53` — `interactiveWidget?: 'resizes-visual' \| 'resizes-content' \| 'overlays-content'`] |
| react | 19.2.3 (`@types/react` 19.2.14) | client component della barra; `popover`/`popoverTarget` tipizzati se servissero | [MISURATO: `node_modules/@types/react/index.d.ts:2846-2848`] |
| tailwindcss | 4.2.1 | varianti `md:`, arbitrarie `[...]`, `:has()` | [MISURATO] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Disclosure con stato React per il foglio (raccomandato) | `Dialog.tsx` (il primitivo) | Il primitivo **richiede un titolo** e un pulsante Close (`Dialog.tsx:213, 282-305`) e con `showModal()` mette tutta la pagina — barra compresa — sotto un velo `bg-black/80` inerte: contraddice D-52-07 («nessuna intestazione», «la barra resta visibile sotto», «si chiude toccando la stessa voce») |
| Disclosure con stato React | Popover API (`popover="auto"`) | Light-dismiss nativo e Escape gratis; ma il comportamento del light-dismiss su iOS al tocco di aree non interattive e dello `::backdrop` di un popover non e' verificato qui [ASSUNTO]; aggiunge un'incognita da provare su iPhone senza ridurne un'altra |
| `CollapsibleSection` per la colonna | una lista con `hidden` | `CollapsibleSection` chiude con `grid-rows-[0fr] opacity-0` e **lascia i link nel DOM e nel tab order** (`CollapsibleSection.tsx:60-64`): un utente da tastiera entrerebbe in voci invisibili. E la sua intestazione e' una `SectionHeading` maiuscola, non una voce di barra |

**Installation:** nessuna.

## Package Legitimacy Audit

Nessun pacchetto esterno viene installato in questa fase. slopcheck non e' stato
eseguito perche' non c'e' nulla da verificare.

**Packages removed due to slopcheck [SLOP]:** nessuno
**Packages flagged as suspicious [SUS]:** nessuno

## Architecture Patterns

### System Architecture Diagram

```
richiesta ──► middleware (src/middleware.ts → lib/supabase/middleware.ts)
               │
               ├─ nessuna sessione ──► pathname in PROTECTED_PREFIXES? ──sì──► 307 /login?next=<path>
               │                                                  │              (resolveNext: allow-list)
               │                                                  no ──► passa
               └─ sessione ──► resolveRoute(pathname) (capability-routes.ts)
                                 ├─ voce trovata ──► ruolo o assegnazione tiene la chiave? ──no──► 307 /account
                                 └─ nessuna voce ──► sotto /admin|/door? ──sì──► 307 /account (fail closed)
                                                                 no ──► passa
               ▼
pagina (server) ──► getAccessContext() ──► guardia di pagina (capabilities.has(CAP.X) || redirect)
               │                          │
               │                          └─► dati: Supabase con RLS (il confine vero)
               ▼
<AppNav role capabilities liveAssignmentCapabilities form>   ("use client")
               │
               ├─ funzione pura (roles.ts): {bar, panel} da sessione/ruolo/capability
               │     panel = visibleStaffTabs(caps) + Gallery(gallery.view) + Account, alfabetico
               │     bar   = Events · Check-in(door.operate ruolo|assegnazione) · TASK(ruolo, spenta)
               │             · (panel ha voci oltre Account ? Management : Account)
               ├─ < md (o form="phone"): barra in basso; Management apre il FOGLIO sopra la barra
               └─ ≥ md (form="responsive"): colonna; Management espande la LISTA nella colonna
                                            (aperta se il pathname e' una voce del pannello)
```

### Recommended Project Structure (solo cio' che si muove)
```
src/lib/rbac/roles.ts                  # NavItem + nuova funzione pura che restituisce barra e pannello
src/lib/routes/staff-tabs.ts           # label "Manage events" (D-52-10); resta la sorgente del pannello
src/lib/routes/capability-routes.ts    # [CAP.GALLERY_VIEW]: { routes: ["/gallery"] } + nota D-52-14
src/lib/routes/next-redirect.ts        # "/gallery" in PROTECTED_PREFIXES e /^\/gallery$/ nell'allow-list
src/lib/capabilities/keys.ts           # CAP.GALLERY_VIEW + CAP_DESCRIPTIONS
src/components/layout/AppNav.tsx       # quattro voci, TASK spenta, foglio (phone), lista in colonna
src/components/staff/StaffNav.tsx      # strip sticky; la forma "column" perde il suo unico consumatore
src/app/(admin)/admin/(work)/layout.tsx# niente piu' workNav
src/app/(members)/account/page.tsx     # via ManagementSection (e il file, se resta senza importatori)
src/app/(public)/gallery/page.tsx      # guardia in cima
src/app/(public)/events/page.tsx       # chip dall'array; catalogo senza filtro retired_at
src/app/(public)/events/FormatFilterRow.tsx # riga assente se zero format
src/components/admin/MemberTable.tsx   # cifra staff; legenda staff
src/app/(admin)/admin/scanner/ScannerClient.tsx # cinque linguette
src/app/layout.tsx                     # interactiveWidget
supabase/migrations/2026092xxxxxxx_gallery_view_capability.sql
scripts/verify-capabilities.mjs        # 16 / 64 / 31 / 33
```

### §A — La barra (NAV-01)

**Oggi [MISURATO]:**
- `NAV_ITEMS` ha quattro voci — Events, Gallery, Check-in, Account (`roles.ts:214-347`); `NavItem` ha `href`, `hrefWhenAnonymous`, `label`, `icon`, `roles`, `requireAuth`, `capability` (`roles.ts:120-192`). Nessun campo per «non e' un link».
- `getVisibleNavItems(role, capabilities, liveAssignmentCapabilities)` filtra su autenticazione, ruolo, capability (ruolo **o** assegnazione viva, lo stesso predicato del middleware) e sostituisce `href` con `hrefWhenAnonymous` senza sessione (`roles.ts:432-517`).
- `AppNav` disegna ogni voce come `<Link>` con `className={`${isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE} …`}` (`AppNav.tsx:272-288`); la riga e' `h-20` (`:194`) e da essa dipende `--nav-inset-block-end: calc(5rem + env(safe-area-inset-bottom))` (`globals.css:335`, azzerata da `md` in su a `:361-365`), letta da `PageShell.tsx:164`, `Dialog.tsx:328`, `ToastContainer.tsx:123`, `StickyBuyBar.tsx:122`.
- La colonna «Work» e' disegnata **solo** quando il mount passa `workNav` (`AppNav.tsx:301-306`); l'unico che lo passa e' `(work)/layout.tsx:156`.
- Tredici mount di `<AppNav>`; la porta lo monta con `form="phone"` (`DoorSurface.tsx:153-160`) — barra in basso a **ogni** larghezza.

**Forma raccomandata.** Una sola funzione pura in `roles.ts` che restituisce
`{ bar, panel }` dalle stesse tre cose, cosi' «ha Management» e' **derivato** e
non un quarto criterio (D-52-04):

```typescript
// Forma, non codice finale. Source: roles.ts / staff-tabs.ts di oggi.
type BarEntry =
  | { kind: "link"; href: Route; label: string; icon: string }
  | { kind: "disabled"; label: "TASK"; icon: string }     // D-52-03: nessun href, niente Link
  | { kind: "panel"; label: "Management"; icon: string };  // apre il foglio / la lista

interface PanelEntry { href: Route; label: string }

function panelFor(capabilities: readonly CapabilityKey[]): PanelEntry[] {
  const tools = visibleStaffTabs(capabilities);              // staff-tabs.ts:358-363
  const gallery = capabilities.includes(CAP.GALLERY_VIEW)
    ? [{ href: "/gallery" as Route, label: "Gallery" }] : [];
  const list = [...tools, ...gallery];
  if (list.length === 0) return [];                          // attendee, anonimo: niente pannello
  return [...list, { href: "/account", label: "Account" }]
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}
// bar: Events · Check-in (door.operate per ruolo O assegnazione, predicato invariato)
//      · TASK (roles) · (panel.length > 0 ? Management : Account con hrefWhenAnonymous "/login")
```

Punti che il piano deve fissare:
- **Pannello per ruolo, non per assegnazione.** `visibleStaffTabs` legge le sole capability di ruolo (`staff-tabs.ts:358-363`), ed e' giusto: il middleware apre gli strumenti solo per ruolo (nessuna voce degli strumenti e' `assignmentOpenable`, `capability-routes.ts:283-895`). Uno `staff` assegnato stasera trova in barra Check-in (per assegnazione) **e** Management (per `gallery.view` di ruolo).
- **Esiti per soggetto dopo la migration** [MISURATO sulle concessioni + D-52-12]:
  | Soggetto | Barra | Pannello |
  |---|---|---|
  | anonimo | Events · Account(→`/login`) | — |
  | `attendee` | Events · Account | — |
  | `staff` non assegnato | Events · TASK · Management | Account · Gallery |
  | `staff` assegnato stasera | Events · Check-in · TASK · Management | Account · Gallery |
  | `organizer` | Events · Check-in · TASK · Management | 11 voci + Gallery + Account |
  | `master` | Events · Check-in · **(TASK?)** · Management | tutte |
  | chiunque se `my_access_context` fallisce | Events · Account | — (fail closed, coerente col middleware `:531-540`) |
- **Il pannello di `organizer`** oggi: Manage events, Members, Artists, Venues, Formats, Calendar, Location, Manifesto, Visual (organizer tiene tutte tranne `admin.access` → niente Newsletter) + Gallery + Account = 11 righe; `master` 12 con Newsletter [MISURATO: `staff-tabs.ts:121-315` × `verify-capabilities.mjs:325-506`]. L'elenco alfabetico di `52-CONTEXT.md` §specifics coincide.
- **`isActive` della voce Management**: evidenziata quando `pathname` inizia con l'`href` di una voce del pannello. La stessa regola risponde alla domanda di discrezionalita' «come sa di essere dentro uno strumento»: e' piu' precisa del prefisso `/admin/` (copre `/gallery` e `/account`, esclude `/admin/scanner`, che e' la porta). Raccomandato.
- **La docblock di `AppNav` va riscritta, non ritoccata.** Oggi dice *«It does not collapse … No toggle, no drawer, no hamburger, no disclosure. RESP-04 forbids hiding navigation behind a menu»* (`AppNav.tsx:36-41`). D-52-07/08 la rovescia. L'argomento da scrivere: RESP-04 (`v1.5-REQUIREMENTS.md:183`) chiede che **le superfici di lavoro** mostrino la navigazione senza menu da tablet in su, e dentro uno strumento la lista parte **aperta** (D-52-08) — quindi RESP-04 regge dove si applica; fuori dagli strumenti (Events) la lista chiusa non nasconde una superficie di lavoro. Stessa regola di casa: la decisione rovesciata si scrive con la sua ragione.
- **TASK e `master`**: D-52-03 dice «organizer e staff». Il ruolo `master` non e' nominato — vedi Open Questions.

### §A.4 — I gate che una voce nuova in `AppNav` incontra [MISURATO]

| Gate | Cosa pretende | Conseguenza per il piano |
|---|---|---|
| `verify:touch-targets`, `PRIMITIVE_RAW_ELEMENTS` (`verify-touch-targets.mjs:786-793`) | il frammento `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE` su un `Link` deve risolvere **esattamente un** elemento, o il gate rifiuta (exit 2) | la voce-link resta **una** e con quell'espressione; le voci nuove (pulsante Management, TASK spenta, righe del pannello) **non** riusano il ternario |
| stesso gate, «anything in a primitive file that is not on this list is measured like any other element» | ogni `button`/`Link` nuovo in `AppNav` deve portare `min-h-11` **letterale** nella propria classe (un'interpolazione di costante si legge come «nessuna dichiarazione») | scrivere `min-h-11` nella stringa di ogni elemento nuovo, oppure aggiungere una riga dichiarata con la sua ragione in `PRIMITIVE_RAW_ELEMENTS` — mai allargare un'esenzione |
| `verify:dialogs`, `OVERLAY_PARTS` (`verify-dialogs.mjs:1090-1098, 1143-1147`) | una riga con `fixed` + `inset-0` + `z-N` e' un «guscio di dialog» e deve stare in `REMAINING` o fallisce; anche un `<dialog>` nativo fuori dal primitivo fallisce | il foglio **non** e' un dialog (e' una disclosure non modale): non usare `inset-0` ne' `<dialog>`; lo scrim che copre la pagina sopra la barra si scrive con `inset-x-0 top-0 bottom-[var(--nav-inset-block-end)]`. **Dichiararlo nel codice** (disclosure, Escape, ritorno del fuoco) invece di lasciare che sembri un aggiramento |
| `verify:no-viewport-read` (`verify-no-viewport-read.mjs:181-185`) | zero `matchMedia`, `useSyncExternalStore`, `innerWidth` | il foglio (telefono) e la lista (colonna) sono **due alberi nel DOM**, scelti da CSS (`md:hidden` / `hidden md:block`), con **due pulsanti** e **due stati** distinti. Un solo pulsante che decidesse in JS «sono in colonna o in barra?» richiederebbe di leggere il viewport |
| `verify:conversion` check E (`verify-conversion.mjs:3095-3150`) | i file che dichiarano `md:[--nav-inset-inline-start:14rem]` sono esattamente quelli che importano `AppNav` direttamente (tranne la porta) | invariato se i mount non cambiano; **non** spostare la costruzione del pannello in un modulo che i mount importino al posto di `AppNav` |
| `verify:conversion` check A | nessuna utility di palette grezza nei file raggiunti da una superficie convertita | colori solo da token (`text-muted`, `bg-surface`, `bg-ground`…); lo scrim nella forma tollerata dal gate (il primitivo usa `bg-black/80`, `Dialog.tsx:272`) |

**Il form `phone` della porta.** Con `form="phone"` la barra sta in basso a ogni
larghezza (`AppNav.tsx:97-106`): anche il foglio deve comparire a ogni larghezza
in quel form. Le classi del foglio dipendono dal form (`isPhone ? "" : "md:hidden"`),
come gia' fanno `NAV_PHONE`/`NAV_RESPONSIVE`.

**Z-index misurati:** barra `z-50`, `StickyBuyBar` `z-40` (`StickyBuyBar.tsx:121`),
dialog `z-[60]`, toast `z-[70]`. Il foglio e il suo scrim stanno fra 40 e 50
(`z-[45]`), sopra la barra d'acquisto e sotto la barra, che resta toccabile.

### §B — Il pannello (NAV-03, NAV-04)

**Oggi [MISURATO]:** `ManagementSection` disegna `visibleStaffTabs(capabilities)`
dentro `CollapsibleSection title="Management Tools" defaultOpen`
(`ManagementSection.tsx:40-71`), montato dalla pagina Account a `:792` sotto
`canReachManagementTools = visibleStaffTabs(...).length > 0` (`:447`). Il
docblock di `account/page.tsx:62-64` dice gia' che la toglie NAV-03.

**B.1 — Etichetta «Manage events».** Un solo punto: `staff-tabs.ts:122`
(`label: "Events"` → `"Manage events"`). La striscia (`StaffNav.tsx:163-172`) e la
colonna la leggono da li'. L'asserzione a caricamento del modulo
(`staff-tabs.ts:323-342`) confronta `href` e `capability`, non l'etichetta: il
rinomino non la tocca. Nessuna rotta cambia.

**B.2 — Gallery e Account non entrano in `STAFF_TABS`.** `STAFF_TABS` alimenta
anche la striscia degli strumenti (NAV-04); Gallery e Account non sono strumenti.
Si aggiungono nel costruttore del pannello. **Ma la voce Gallery merita la stessa
asserzione** che protegge le tab (`resolveRoute("/gallery")?.key === CAP.GALLERY_VIEW`,
a caricamento del modulo): una voce disegnata senza una riga nella mappa e' la
promessa che quel loop esiste per impedire.

**B.3 — Colonna (≥ md).** La voce Management diventa l'intestazione-pulsante
della lista (`aria-expanded`, `aria-controls`), la lista si nasconde con `hidden`
(fuori dal tab order). Stato iniziale = «il pathname e' una voce del pannello».
`AppNav` resta montato fra una navigazione e l'altra dentro `(work)/layout.tsx`,
quindi `useState(iniziale)` **non** si ricalcola da solo: decidere se riaprire la
lista quando si entra in uno strumento dopo averla chiusa (raccomandato: un
`useEffect` sul pathname che la apre entrando in una voce del pannello, e non la
chiude mai da solo). L'iniziale si ricava da `usePathname()`, disponibile anche nel
render server: nessun mismatch di idratazione [ASSUNTO — da osservare nel build].

La prop `workNav` e `StaffNav form="column"` perdono l'unico consumatore
(`(work)/layout.tsx:156`): togliere la prop da `AppNavProps` (`AppNav.tsx:107-112`)
e la forma `column` da `StaffNav` (`StaffNav.tsx:111-141`) nello stesso piano, e
aggiornare la riga di `verify-touch-targets.mjs:701` («the eight work tabs in two
forms») e di `conversion-manifest.mjs:194` se la descrizione diventa falsa.

**B.4 — Striscia appesa (NAV-04).** Oggi `<nav aria-label="Work surfaces" className="mb-6 px-6 md:hidden">` (`StaffNav.tsx:155`), in flusso dentro il wrapper
`md:[--nav-inset-inline-start:14rem]` di `(work)/layout.tsx:180-183`. Per
appenderla: `sticky top-0` + fondo opaco (`bg-ground`) + un piccolo padding
verticale, `z` sotto la barra. **Nessun antenato scorre** [MISURATO: nessuna regola
`overflow` su `html`/`body` in `globals.css:471-501`; nessun altro `sticky` nel
prodotto tranne la porta, `ScannerClient.tsx:2928`, che non e' sotto `(work)`].
`viewportFit` non e' dichiarato (`layout.tsx:81-106`), quindi in una finestra
standalone iOS il contenuto resta dentro l'area sicura e `top-0` non finisce sotto
la barra di stato — **non** aggiungere `viewportFit: "cover"` quando si tocca il
viewport per D-52-23.

**B.5 — Il foglio (telefono).** Disclosure non modale, costruita con stato React
in `AppNav`:
- pulsante Management in barra: `<button type="button" aria-expanded aria-controls>` con `min-h-11` letterale;
- pannello: posizionato `fixed inset-x-0 bottom-[var(--nav-inset-block-end)]`, `z-[45]`, lista una voce per riga (`Link` con `min-h-11`), nessuna intestazione (D-52-07);
- scrim: un elemento non interattivo sopra la pagina e sotto il pannello, che al tocco chiude (non e' un `button`, non entra nel tab order: la chiusura da tastiera e' Escape e il pulsante stesso);
- chiusura su: tocco dello scrim, tocco della stessa voce, `Escape`, **cambio di pathname** (un `Link` del foglio naviga senza smontare `AppNav` dentro `(work)`), con il fuoco restituito al pulsante.

### §C — Il cancello sulla gallery (NAV-02)

**C.1 — La mappa.** Voce nuova in `CAPABILITY_ROUTES` (`capability-routes.ts:209-895`):
`[CAP.GALLERY_VIEW]: { routes: ["/gallery"] }` — **senza** `assignmentOpenable`
(nessuna assegnazione apre la gallery) e **senza** `alsoGatesTables` (la chiave
non governa alcuna policy: §C.5). L'oggetto e' `satisfies Record<CapabilityKey, Binding>`
(`:895`): aggiungere la chiave in `keys.ts` senza la voce qui e' un errore di
build, ed e' la ragione per cui chiave e mappa vanno nello stesso commit. Accanto
alla riga, la nota di D-52-14 (come si riapre: togliere questa riga, la guardia e
il prefisso protetto; la chiave resta).

**C.2 — L'anonimo: la mappa NON basta.** Il ramo senza sessione del middleware
legge `PROTECTED_PREFIXES`, non la mappa (`middleware.ts:607-613`):
```typescript
// middleware.ts:607-613 [MISURATO]
if (!user) {
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    url.pathname = "/login"; url.searchParams.set("next", pathname); return NextResponse.redirect(url);
  }
}
```
Quindi, per D-52-13 («un anonimo va al login con ritorno»):
- `"/gallery"` entra in `PROTECTED_PREFIXES` (`next-redirect.ts:221-226`);
- `/^\/gallery$/` entra in `NEXT_ALLOW_LIST` (`next-redirect.ts:102-188`), o `resolveNext` rifiuta il ritorno e manda a `/account`;
- **`verify:routes` controllo 3** pretende che ogni prefisso protetto torni se stesso da `resolveNext` (`verify-routes.mjs:540-583`): il prefisso senza il pattern e' rosso. Si muovono insieme.

**C.3 — Il loggato senza chiave.** Ramo `resolveRoute` → `bounceToAccount(null)`
→ 307 `/account` (`middleware.ts:640-672`, `:513-540`). E' «lo stesso rifiuto
standard di `/admin`». Nessun codice nuovo.

**C.4 — La guardia in pagina.** La forma di casa e' quella degli strumenti
(`(work)/manifesto/page.tsx:115-119`):
```typescript
const { role, capabilities, liveAssignmentCapabilities } = await getAccessContext();
if (!capabilities.has(CAP.GALLERY_VIEW)) {
  redirect("/dashboard");   // 308 → /account (next.config.ts:145), come tutti gli strumenti
}
```
Va **prima** della lettura di `event_media` (`gallery/page.tsx:54-59`). Un anonimo
non ci arriva (lo ferma il prefisso); se ci arrivasse, la guardia lo porta su
`/account` → login con `next=/account`: perde la destinazione ma non vede nulla,
che e' la direzione giusta.

**C.5 — Cosa il cancello NON copre, da scrivere invece di lasciar credere.**
- La RLS di `event_media` e' `event_media_select_approved FOR SELECT TO authenticated USING (status = 'approved')` [MISURATO: `20260225120000_phase7_media.sql:25-27`, non toccata dopo: `20260809004500_event_media_party_id.sql:408-412`]. Un `attendee` loggato **continua a poter leggere** le righe approvate chiamando PostgREST direttamente. E un anonimo **gia' oggi** non legge nulla (la policy e' `TO authenticated`): la gallery da anonimo e' vuota adesso.
- Il bucket `event-media` e' **pubblico** (`verify-media-strip.mjs:1-6`): chi ha un URL scarica il file.
- E' coerente con «cancello temporaneo per costruzione» (`ROADMAP.md:511-513`) e con D-52-14 («si riapre togliendo una riga»): stringere la RLS renderebbe la riapertura una migration. **Ma `access-gating.md` chiede di dirlo**: una frase nella docblock della voce di mappa e nel VERIFICATION. Se il proprietario vuole il confine sui dati, e' una decisione nuova — vedi Open Questions.

### §D — La migration `gallery.view` e l'atto

**Forma [MISURATO]** — la casa aggiunge chiavi cosi' (`20260817120000_production_section_keys.sql:68, 104-121, 165-174, 447`), ma **dopo la fase 50 la colonna `requires_approved` non esiste piu'** (`20260921120000_drop_status_and_referral.sql:996`), quindi l'`INSERT` delle concessioni ha **due** colonne:

```sql
-- Source: forma di 20260817120000_production_section_keys.sql, senza requires_approved
BEGIN;

INSERT INTO private.capabilities (key, description) VALUES
  ('gallery.view', '<stessa stringa di CAP_DESCRIPTIONS["gallery.view"] in keys.ts>')
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability) VALUES
  ('master',    'gallery.view'),
  ('organizer', 'gallery.view'),
  ('staff',     'gallery.view')
ON CONFLICT (role, capability) DO NOTHING;

-- Il DO di verifica, nella forma di 20260922120000:587-605 ma rivolto al risultato:
-- conta le concessioni della chiave (= 3), il totale (= 31) e che attendee ne abbia 0,
-- e SOLLEVA altrimenti — la migration fallisce intera invece di lasciare mezzo catalogo.
DO $$ ... $$;

COMMENT ON TABLE private.role_capabilities IS '... 31 righe: 16 a master, 14 a organizer, 1 a staff (gallery.view, fase 52, D-52-12), ZERO ad attendee ...';
COMMENT ON TABLE private.capabilities IS '... 16 chiavi dalla fase 52 ...';

COMMIT;
```

- **Il `COMMENT` di oggi su `role_capabilities` dice «ZERO a staff … va riletto prima di aggiungere un ruolo nuovo»** (`20260923120000_role_capabilities_comment.sql:22-23`): questa e' la migration che lo rende falso, quindi lo riscrive (e lo fa con i numeri **ricontati**: 16 + 14 + 1 + 0 = 31 — il precedente del WR-05 e' un commento con la somma sbagliata).
- **`BEGIN`/`COMMIT` espliciti**: le migration di catalogo precedenti li usano; verificare che l'endpoint migrations della Management API li accetti nel corpo (le fasi 45 e 51 li hanno applicati cosi') [ASSUNTO sul comportamento dell'endpoint, MISURATO sulla forma dei file].
- **La versione registrata non e' quella del nome file**: l'endpoint conia la propria all'applicazione (`51-08-SUMMARY.md:67-71`: file `20260922120000`, versione `20260922145319`). La prova e' la rilettura dal catalogo, non la risposta HTTP (che fu `[]`).

**Il TypeScript nello stesso commit:**
- `keys.ts`: `GALLERY_VIEW: "gallery.view"` in `CAP` (`:316-371`) e la descrizione in `CAP_DESCRIPTIONS` (`Record<CapabilityKey, string>`, `:408-445`: senza, non compila).
- `capability-routes.ts`: la voce di §C.1 (senza, non compila).
- `scripts/verify-capabilities.mjs`: `EXPECTED_KEY_COUNT` 15 → **16** (`:267`), una riga `'gallery.view'` in ognuno dei quattro ruoli di `ROLE_GRANTS` (`:325-688`: GRANTED per master/organizer/staff, REFUSED per attendee), `EXPECTED_PAIR_COUNT` 60 → **64**, `EXPECTED_GRANT_COUNT` 28 → **31**, `EXPECTED_REFUSAL_COUNT` 32 → **33** (`:784-786`), e la prosa che dice «ZERO a staff» (`:232-265`) riscritta. La forma della nota «rosso contro la produzione, verde contro il laboratorio» (`:261-265`) si ripete con i nomi di questa fase.

**Ordine laboratorio → produzione:**
1. applicare sul laboratorio (endpoint migrations, ref del lab), rileggere catalogo e `COMMENT`; `verify:capabilities` contro il lab **verde**;
2. atto datato `52-AUTHORISATION-*.md` nella forma di `51-AUTHORISATION-COMMENT.md` (frontmatter `granted/granted_date/scope/status`, perimetro «un byte oltre», domanda letterale, registro d'uso, chiusura ESAURITA);
3. **applicare in produzione PRIMA del deploy del codice**: le tre concessioni senza codice che le legga sono inerti; il codice senza concessioni rimbalzerebbe organizer e staff dalla gallery e li farebbe entrare in un pannello con una voce che li respinge. L'ordine inverso non rompe la porta ne' il denaro, ma produce un rifiuto a chi lavora;
4. rilettura in produzione (`read_only`): 16 chiavi, 31 concessioni (16/14/1/0), versione coniata; poi `verify:capabilities` contro la produzione verde.

### §E — I chip dei format (NAV-06)

**Oggi [MISURATO]** (`events/page.tsx`):
- catalogo: `from("formats").select("id, slug, name, color").eq("listed", true).is("retired_at", null).order("sort_order").order("name")` **fuori dal try** (`:208-220`), con il commento D-36-13/D-36-16 «the chip row must not vary with the data OR with the viewer» (`:187-207`) — **da riscrivere** (D-52-15);
- `formatOptions` e' anche l'allow-list del parametro `?format=` (`:222-239`);
- `allEvents = (events ?? []).map(transformEvent)` (`:577`), poi `shownEvents` filtrato per format (`:584-586`), poi `upcoming`/`past` (`:589-594`), tutto dentro il `try`;
- `canSeeDrafts = capabilities.has(CAP.STAFF_MANAGE)` allarga la query alle bozze (`:282, 311-313`); per gli altri la RLS su `events` rifiuta le non pubblicate.
- La riga dei chip disegna sempre «All» (`FormatFilterRow.tsx:158-174`).

**Costruzione raccomandata:**
1. Nel `try`, **subito dopo `:577` e prima di `:584`**: `const visibleSlugs = new Set(allEvents.flatMap((e) => e.formats.map((f) => f.slug)))`, assegnato a una variabile dichiarata fuori dal `try` (vuota nel `catch`).
2. **Il nome e il colore del chip vengono dal catalogo, non da `CardFormat`.** `CardFormat.name` puo' essere il **nome pubblico della serie** quando nessuna serata dell'evento e' segreta (`:549-553`), e una serie puo' portare il nome di una sede: un chip col nome della serie sarebbe una seconda superficie per quel nome. Dall'array si prende **solo lo slug**; nome, colore e ordine (`sort_order`) dal catalogo — il che risponde anche alla discrezionalita' sull'ordine.
3. Il catalogo perde `.is("retired_at", null)` (D-52-16): un format ritirato con serate visibili deve comparire. `formats_select_listed` (RLS, `listed = true`) resta l'unico filtro del database, e `.eq("listed", true)` resta scritto.
4. `chips = catalogue.filter((f) => visibleSlugs.has(f.slug))`. **Raccomandato: l'allow-list di `?format=` diventa `chips`** — un format senza serate visibili risolve a «nessun filtro, All corrente», uniforme con «unknown, retired, unlisted, repeated or absent» del commento a `:224-231`, e nessun chip selezionato fuori dalla riga.
5. Riga assente con zero chip (D-52-17): `FormatFilterRow` non renderizza nulla (o la pagina non la monta). **Stato vuoto della lista**: invariato — `EventTabs` ha gia' i suoi testi vuoti; senza chip non c'e' un filtro da nominare.
6. **Nessuna query nuova, nessun conteggio passato ai figli** (il commento a `:669-674` resta vero).
7. I gate di `verify:venue-surfaces` leggono in questo file due stringhe esatte — `venue_label: nightIsSecret ? null :` e `const nightIsSecret = p.venue_secret !== false;`, una volta ciascuna (`verify-venue-surfaces.mjs:535-567`): non toccarle.

Cosa «visibile a chi guarda» significa, misurato: per un anonimo o un `attendee`,
le serate pubblicate con format `listed`; per chi tiene `staff.manage`, anche le
bozze — e vede quei chip perche' vede quelle serate. Un format `unlisted` non ha
embed (RLS) e quindi nessuno slug nell'array (`:536-542`).

### §F — La pagina membri (NAV-05)

**F.1** — Oggi la cifra `staff` e' un `<button onClick={() => setRoleFilter("staff")}>` con commento che rimanda a NAV-05 (`MemberTable.tsx:686-695`); le altre due sono `<span>` (`:678-685`). Diventa uno `<span>` con la stessa forma delle altre; il commento si riscrive. Nessun gate lo pinna [MISURATO: nessun frammento di `MemberTable` in `verify-touch-targets.mjs`].

**F.2 — La legenda diventa falsa con `gallery.view`.** Testo visibile oggi: *«A staff account grants nothing of its own — it can do nothing an attendee cannot, and it opens no door on its own. Working the door or a gallery comes from the night's own assignment…»* (`MemberTable.tsx:723-729`), e il commento del badge *«`staff` non concede nulla che un `attendee` non abbia gia'»* (`:124-129`). Dopo D-52-12 uno `staff` **tiene la gallery per ruolo**, e la frase «a gallery comes from the night's own assignment» e' due volte sbagliata. Va riscritta **nello stesso piano della migration** (e' letta prima di promuovere qualcuno: `:711-721`). Il badge tratteggiato puo' restare (staff resta senza potere operativo), ma il commento va aggiornato.

### §G — La porta: cinque linguette (D-52-19..22)

**Mappa del render di oggi** [MISURATO, `ScannerClient.tsx`]:

| Blocco | Riga | Dove va |
|---|---|---|
| barra fissa (titolo, Online/Offline, «QR Scan») | `:2928-3027` | **resta**; nulla vi si aggiunge (la sua docblock `:2888-2927` vieta di allungarla: «the pinned part must sit comfortably inside a phone's window») |
| «This night is over» + «Scan anyway» | `:3039-3054` | **resta fuori dalle linguette** — contiene l'override; nascosto in Alerts sarebbe un pulsante della porta dietro un tocco [raccomandazione] |
| deriva dell'orologio | `:3058-3067` | Alerts (e' una notizia) o resta — discrezione; raccomandato Alerts |
| pastiglie della coda (Pending, Could not be recorded, Sign in again…, Undone…, cannot read its own queue) | `:3080-3130` | **testata, sempre visibili** (D-52-21, e il todo: «nella linguetta vanno i testi, non le pastiglie») |
| `blockedResult` (esito di «Sign in again», cioe' del drenaggio) | `:3132-3134` | **Alerts** («esiti del drenaggio») |
| pannello `failedEntries` (aperto dalla pastiglia) | `:3139-3165` | resta **attaccato alla sua pastiglia** in testata — si apre da li'; spostarlo separerebbe l'azione dal risultato [raccomandazione] |
| contatore + ricarica | `:3189-3228` | resta |
| ricerca | `:3231-3273` | resta |
| linguette | `:3276-3291` | cinque |
| `cameraFault` | `:3308-3316` | resta sopra la camera (si legge mentre si inquadra) [raccomandazione] |
| banda di eta' (`stalenessBandText`, «tap to reload») | `:3351-3365` | **Alerts** |
| avviso guest list (`guestListWarningText`) | `:3395-3403` | **testata** (D-52-21) — e vedi §H.3: va **sopra** la ricerca |
| `cacheNotices` | `:3405-3420` | **Alerts** |
| cronologia (ultimi 5, undo) | `:3458-3594` | **Recent** |
| lista ospiti + testi vuoti | `:3597-3669` | All / Not Arrived / Checked In |

**Tipo e stato.** `type FilterTab = "all" | "not_arrived" | "checked_in"` (`:415`),
default `"not_arrived"` (`:631`), `FILTER_TABS` costruito nel render (`:2755-2759`).
Si allarga a `"recent" | "alerts"`; `filteredAttendees` (`:2700-2709`) non cambia; il
render sceglie cosa mostrare sotto le linguette in base a `activeFilter`.

**Il conteggio di Alerts** si deriva al render da un array di voci con chiave:
`listIsStale ? "band"`, ogni `cacheNotices[i].key`, `blockedResult ? "drain"`,
(`driftMinutes ? "drift"`). **Non** si mette la banda dentro `cacheNotices`: il suo
commento (`:3318-3337`) spiega che `setCacheNotices` sostituisce l'array a ogni
fetch, anche fallito, e la banda sparirebbe proprio quando serve.

**Evidenziare senza aprire (D-52-20).** Uno stato `seenAlertKeys` (le chiavi viste
l'ultima volta che Alerts e' stata aperta); la linguetta e' evidenziata se esiste
una chiave corrente non vista. Nessun cambio automatico di `activeFilter`. Il
segnale non e' solo colore (`nextjs-architecture.md`, «il colore non e' mai
l'unico canale»): pallino + testo del conteggio + `aria-label` che lo dice.

**Recent.** `scanHistory` e' gia' limitato a 5 (`:1698`); «Recent (n)» ≤ 5. L'undo
resta sulla riga (`handleUndoCheckIn(record)`, `:3480`), con `window.confirm` e il
ramo di supervisione intatti (`:1746-…`). Vuota: «No scans yet».

**Cinque linguette su 360 px.** Oggi tre, `flex-1 … px-3 py-2 text-xs` (`:3276-3291`).
Cinque in `360 − 48 (px-6) − 8 (p-1)` ≈ 300 px danno **~60 px a linguetta**: «Not
Arrived (123)» non ci sta su una riga [MISURATO sulle classi; larghezze del testo
ASSUNTE]. Tre forme possibili: etichetta sopra e conteggio sotto (due righe), riga
scorrevole come la striscia degli strumenti, o etichette corte. Il proprietario ha
deciso nomi e conteggi (D-52-19), non la geometria: **chiederla con uno schizzo**
o scegliere le due righe (non cambia i nomi) e dichiararlo.

**I gate della porta [MISURATO: `verify-touch-targets.mjs:1280-1460`]:**
- `DOOR_TARGET_DEBT` elenca 14 bersagli sotto i 44 px, **per frammento**, con tetto `count: 14` che puo' solo scendere. Riguardano questa fase: `setActiveFilter(tab.key)` (le linguette), `requestReload("band")` (la banda), `handleUndoCheckIn(record)` (le righe della cronologia), `handleRetryBlocked` (la pastiglia), `ref={searchRef}` (la ricerca).
- Un frammento che smette di risolvere (zero o due elementi) → **rifiuto** (exit 2). Spostare il blocco in un ramo del render va bene **se l'espressione resta identica e compare una volta sola nel sorgente**.
- Un elemento in debito che ora dichiara `min-h-11` → **rifiuto** finche' la sua riga non esce dalla lista **nello stesso commit** (e' «il debito pagato»).
- **Ogni elemento interattivo NUOVO** nella porta (p. es. un bottone nei testi vuoti, o un secondo pulsante in Alerts) deve dichiarare `min-h-11` o **fallisce**: la lista non accetta un quindicesimo.
- Se le linguette diventano `min-h-11` (raccomandato: cinque bersagli piccoli adiacenti sono il caso descritto in `:1414-1417`, «the miss is not a no-op — it selects the neighbour»), la riga `setActiveFilter(tab.key)` esce dal debito nello stesso commit.
- `verify:scan-legibility` legge `CONNECTIVITY_PILL` e le tinte della pastiglia offline (`ScannerClient.tsx:523`, `verify-scan-legibility.mjs:153-167`): non spostarle ne' rinominarle.

### §H — Il viewport (D-52-23, D-52-06)

**H.1 — Cosa fa il codice oggi [MISURATO].** `export const viewport` ha
`width`, `initialScale`, `themeColor` (`layout.tsx:81-106`); nessun
`interactiveWidget`, nessun `viewportFit`. `body` e' `min-h-dvh` (`:118`). `dvh` e'
gia' ovunque: `PageShell.tsx:125, 160`, `Dialog.tsx:272, 280`, `Lightbox.tsx:84`,
`ScannerClient.tsx:2764, 2887`. **L'unico `vh` rimasto** e' `minHeight: "60vh"` in
`EventTabs.tsx:582, 585`. D-52-23 lato `dvh` e' quindi **una riga**.

**H.2 — Cosa fara' sull'iPhone: niente, oggi.** [CITATO: bram.us, 2026-09-11]
*WebKit ha implementato `interactive-widget` a meta' agosto 2026, ma non e' in
Safari ne' in Safari Technology Preview; forse Safari 27.1, senza conferma.*
Supportato in Chrome 108+ e Firefox 132+ [CITATO: htmhell.dev]. Sotto il default
di Safari (`resizes-visual`) *«Because the Layout Viewport does not change, the
Viewport Units also don't change»* [CITATO: htmhell.dev] — quindi `dvh` non segue
la tastiera su iOS. Aggiungere `interactiveWidget: "resizes-content"` e' corretto,
tipizzato in Next 16.1.6 e innocuo, e aiuta Android; **ma la prova su iPhone di
D-52-23 misurera' un meccanismo che Safari ignora.** Va detto al proprietario
prima della prova (Open Question 1).

**H.3 — Cio' che funziona davvero sull'iPhone (layout, non viewport):**
- **La porta: niente fra la ricerca e la lista.** Oggi, fra il campo (`:3231`) e la lista (`:3597`) stanno linguette, `cameraFault`, banda, avviso guest list, `cacheNotices`, camera e cronologia. Con la tastiera aperta la lista e' **sotto** la tastiera: e' la meccanica del difetto osservato. Le linguette di §G tolgono banda, notizie e cronologia da quello spazio; **l'avviso della guest list, che resta sempre visibile, va sopra la ricerca** (con le pastiglie), non fra ricerca e lista. Cosi' «ricerca → linguette → lista» e' contiguo.
- **Al fuoco, la ricerca sale in cima.** Un `onFocus` sul campo che lo porta subito sotto la barra fissa (`scrollIntoView({ block: "start" })` con `scroll-margin-top` pari all'altezza della barra fissa) mette le righe trovate nello spazio sopra la tastiera. Non legge il viewport; va provato su iPhone [ASSUNTO sul comportamento di iOS quando la tastiera sta ancora salendo — puo' servire farlo dopo l'evento `focus`, non dentro].
- **Il login** e' `PageShell width="focus"`, centrato verticalmente in `min-h-dvh` (`FOCUS_ROOT`, `PageShell.tsx:125`) e **senza barra** (non monta `AppNav`): D-52-06 non lo riguarda. Allineare il modulo in alto da telefono (`items-start md:items-center`) terrebbe email, password e «Sign In» sopra la tastiera, **ma**: (a) `verify:conversion` check E1 legge `FOCUS_ROOT` e pretende un'altezza e una centratura — `justify-center` resta e soddisfa `CENTRING_RE` (`verify-conversion.mjs:3801-3806`); (b) **il codice di `PageShell.tsx` e' congelato da un digest sha256** in `verify:conversion` (`:459-467`): ogni modifica al file e' un rosso finche' il digest non si aggiorna nello stesso commit (il gate stampa quello nuovo). E cambia **tutte** le superfici `focus`, non solo il login.
- **Nascondere la barra al fuoco (D-52-06)** con CSS, senza JavaScript:
  ```css
  /* forma, da dichiarare in globals.css o come variante arbitraria sulla barra */
  @media (pointer: coarse) {
    body:has(:is(input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="hidden"]), textarea, select):focus) [data-nav-form="phone"],
    body:has(...stesso selettore...) [data-nav-form="responsive"]  /* solo sotto 48rem */ { display: none; }
  }
  ```
  - `pointer: coarse` perche' la tastiera virtuale e' dei dispositivi touch; su un desktop che fa la porta (`form="phone"`) cliccare la ricerca non deve far sparire la barra.
  - il form responsive si nasconde **solo sotto `md`**: da `md` in su e' la colonna, e farla sparire sposterebbe il contenuto.
  - `--nav-inset-block-end` **non** si azzera: la pagina tiene il suo padding e non salta mentre si scrive.
  - `:has()` e' in Safari da 15.4 [ASSUNTO — da confermare nella prova].
  - Su iOS oggi la barra fissa sta ancorata al layout viewport, quindi e' gia' **dietro** la tastiera; nasconderla evita che salti durante lo scorrimento con la tastiera aperta. Su Android con `resizes-content` e' la misura che serve davvero (la barra salirebbe sopra la tastiera).
- **Mai `visualViewport` per risolvere questo senza decisione.** Non e' nell'elenco di `verify:no-viewport-read` (`:181-185`), ma lo spirito del gate (41-UI-SPEC §0 regola 6) e' «il layout lo decide il CSS»; introdurlo e' una decisione da chiedere, non un dettaglio.

### Anti-Patterns to Avoid
- **Nascondere la voce Gallery e basta**: senza mappa, prefisso e guardia l'indirizzo resta aperto (`ROADMAP.md:505-509`).
- **Un secondo `Link` con `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE`**: rende ambiguo il frammento dichiarato → `verify:touch-targets` rifiuta.
- **Un solo pulsante Management che decide in JS se aprire il foglio o la colonna**: e' una lettura del viewport travestita.
- **Il foglio con `Dialog.tsx`**: titolo obbligatorio, barra inerte sotto il velo — contro D-52-07.
- **Chip col nome di `CardFormat`**: puo' essere il nome di una serie, e una serie puo' portare il nome di una sede.
- **Mettere la banda di eta' dentro `cacheNotices`** per contarla piu' comodamente.
- **Aprire Alerts da sola** quando arriva un avviso (D-52-20).
- **Allungare la barra fissa della porta** con le pastiglie o l'avviso guest list.
- **Aggiungere `viewportFit: "cover"`** toccando il viewport: la barra degli strumenti appesa e la barra fissa della porta finirebbero sotto la barra di stato in standalone.
- **Dichiarare D-52-23 «verificato su iPhone»** perche' la barra si nasconde: il meccanismo `resizes-content` su Safari non c'e'.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| chi vede quale voce | un filtro in `AppNav` | la funzione pura in `roles.ts` + `visibleStaffTabs` | una decisione in un client component e' una decisione modificabile da chi guarda (`AppNav.tsx:25-31`) |
| il rimbalzo al login con ritorno | un `redirect("/login?next=…")` in pagina | `PROTECTED_PREFIXES` + `NEXT_ALLOW_LIST` | e' gia' il percorso di tutto il prodotto, e `verify:routes` lega le due liste |
| il rifiuto del loggato | un 404 o un messaggio in pagina | `resolveRoute` + `bounceToAccount` del middleware | «lo stesso rifiuto standard» (D-52-13) |
| la guardia di pagina | un helper nuovo | `getAccessContext()` + `capabilities.has(CAP.GALLERY_VIEW)` | la forma di ogni strumento |
| «questo format ha serate?» | una query | lo `Set` degli slug da `allEvents` | la query e' il canale che rivela una bozza senza mostrarla |
| nascondere la barra alla tastiera | listener JS su `visualViewport`/`resize` | `:has(:focus)` in CSS | nessuna lettura del viewport; nessuno stato |
| contare gli avvisi | un contatore incrementato a mano | un array derivato al render | la casa deriva (banda, avviso guest list) perche' uno stato puo' restare acceso |

## Runtime State Inventory

Il solo rinomino della fase e' l'etichetta «Events» → «Manage events» (D-52-10).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Nessuno: l'etichetta vive solo in `staff-tabs.ts:122`; nessuna tabella la conserva [MISURATO: grep] | nessuna |
| Live service config | Nessuno | nessuna |
| OS-registered state | Nessuno | nessuna |
| Secrets/env vars | Nessuno | nessuna |
| Build artifacts | Cache del service worker: un documento `/admin/*` in cache runtime `NetworkFirst` 24 h puo' mostrare la vecchia etichetta offline fino al primo caricamento online [ASSUNTO sulla presenza in cache, MISURATO sulla regola in `checkin-offline.md`] | nessuna — si aggiorna da sola |

**La migration `gallery.view` e' invece stato di database**: tre righe nuove in
`private.role_capabilities`, una in `private.capabilities`, due `COMMENT`
riscritti — su laboratorio e produzione, due applicazioni distinte (§D).

## Common Pitfalls

### Pitfall 1: il prefisso protetto dimenticato
**What goes wrong:** `/gallery` nella mappa ma non in `PROTECTED_PREFIXES`: l'anonimo passa il middleware, la guardia lo manda a `/account` → login con `next=/account`. Non vede nulla, ma D-52-13 («al login con ritorno») e' mancato.
**How to avoid:** prefisso + pattern di allow-list nello stesso commit; `npm run verify:routes`.
**Warning signs:** `curl -sI <lab>/gallery` da anonimo risponde con `location: /login?next=%2Fgallery` o no.

### Pitfall 2: codice spinto prima delle concessioni
**What goes wrong:** organizer e staff vedono «Gallery» nel pannello e vengono rimbalzati su `/account`.
**How to avoid:** migration in produzione prima del push (§D.3).

### Pitfall 3: il frammento dichiarato che non risolve piu'
**What goes wrong:** `verify:touch-targets` esce 2 («Nothing was measured») dopo un ritocco a `AppNav` o allo scanner.
**How to avoid:** non toccare le espressioni `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE`, `setActiveFilter(tab.key)`, `requestReload("band")`, `handleUndoCheckIn(record)`, o muovere la riga del gate nello stesso commit.

### Pitfall 4: il foglio che resta aperto dopo la navigazione
**Why it happens:** dentro `(work)` `AppNav` non si smonta fra un indirizzo e l'altro.
**How to avoid:** chiudere su cambio di `usePathname()`.

### Pitfall 5: la legenda staff che mente
**What goes wrong:** dopo la migration la pagina membri dice che uno staff «can do nothing an attendee cannot».
**How to avoid:** riscriverla nel piano della migration (§F.2).

### Pitfall 6: prova iPhone che «passa» per la ragione sbagliata
**What goes wrong:** si osserva la barra sparire al fuoco e si registra D-52-23 come verificato, mentre `resizes-content` su Safari non fa nulla.
**How to avoid:** la procedura registra **cosa** si osserva per ogni misura separatamente (barra nascosta; lista contigua alla ricerca; ricerca portata in cima; ridimensionamento del viewport — atteso **assente** su Safari di oggi).

### Pitfall 7: il digest di `PageShell`
**What goes wrong:** un ritocco a `FOCUS_ROOT` per il login rende rosso `verify:conversion` con un digest diverso.
**How to avoid:** o non toccare la shell, o aggiornare il digest nello stesso commit (il gate stampa il nuovo) e dichiarare che cambia tutte le superfici `focus`.

### Pitfall 8: cinque linguette in 300 px
**What goes wrong:** le etichette vanno a capo o si troncano; un tocco mancato seleziona la vicina.
**How to avoid:** decidere la geometria (§G) e portare le linguette a `min-h-11` pagando la riga di debito.

### Pitfall 9: `CollapsibleSection` come lista di navigazione
**What goes wrong:** da chiusa i link restano nel tab order con opacita' zero.
**How to avoid:** `hidden` (o `inert`) sulla lista chiusa.

## Code Examples

### La voce di mappa con la nota di riapertura
```typescript
// Source: forma di capability-routes.ts:489-492 (CATALOGUE_MANAGE)
  // D-52-12/13/14 — la gallery e' temporaneamente per chi lavora.
  // PER RIAPRIRLA AL PUBBLICO: togliere questa voce, la guardia in cima a
  // (public)/gallery/page.tsx e "/gallery" da PROTECTED_PREFIXES; la voce torna
  // in barra per tutti; la chiave resta nel catalogo, innocua.
  // CIO' CHE QUESTA RIGA NON FA: non tocca la RLS di event_media (TO authenticated)
  // ne' il bucket pubblico — decide dove si VA, non cosa si LEGGE.
  [CAP.GALLERY_VIEW]: {
    routes: ["/gallery"],
  },
```

### Il viewport
```typescript
// Source: layout.tsx:81-106 + extra-types.d.ts:53 (Next 16.1.6)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Android (Chrome 108+, Firefox 132+) ridimensiona il layout sotto la tastiera.
  // Safari iOS lo IGNORA al 2026-09 (WebKit l'ha nel sorgente, non in una release):
  // sull'iPhone valgono le misure di layout della porta, non questa riga.
  interactiveWidget: "resizes-content",
  themeColor: "#0A0712",
};
```

### I chip dall'array
```typescript
// Source: events/page.tsx:577-586, riorganizzato
const allEvents = (events ?? []).map(transformEvent);
// PRIMA del filtro per format (ROADMAP §52, D-52-15): solo lo SLUG dall'array —
// nome, colore e ordine dal catalogo, perche' CardFormat.name puo' essere una serie.
visibleFormatSlugs = new Set(allEvents.flatMap((e) => e.formats.map((f) => f.slug)));
const shownEvents = activeFormat ? allEvents.filter(/* invariato */) : allEvents;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chrome Android ridimensiona il layout viewport con la tastiera | default `resizes-visual`, opt-in `interactive-widget` | Chrome 108 (2022) [CITATO: bram.us] | su Android `resizes-content` e' una scelta consapevole |
| Safari: nessun opt-in | WebKit implementato nel sorgente, non spedito | agosto 2026 [CITATO: bram.us] | su iPhone oggi nessun meccanismo di viewport; si lavora sul layout |
| chip «non variano con chi guarda» (D-36-13/16) | chip dalle serate visibili (D-52-15) | 2026-09-23 | riscrivere il commento a `events/page.tsx:187-207` |
| staff con zero concessioni per ruolo | staff con `gallery.view` | questa fase | legenda, COMMENT, `verify-capabilities` |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Il light-dismiss della Popover API e lo `::backdrop` di un popover si comportano in modo affidabile su iOS Safari | Alternatives | se si scegliesse il popover, il foglio potrebbe non chiudersi toccando fuori; per questo si raccomanda la disclosure con stato |
| A2 | `:has()` con `:focus` nasconde la barra su iOS Safari (supporto da 15.4) | §H.3 | la barra resterebbe visibile al fuoco; innocuo su iOS (sta dietro la tastiera), rilevante su Android |
| A3 | `scrollIntoView({block:"start"})` al fuoco porta la ricerca in cima anche mentre la tastiera sale | §H.3 | la lista resterebbe sotto la tastiera; va provato e, se serve, differito dopo il focus |
| A4 | L'endpoint migrations della Management API accetta `BEGIN`/`COMMIT` espliciti nel corpo | §D | si toglierebbero (l'endpoint e' gia' transazionale?); da rileggere nei SUMMARY 45/51 prima di scrivere il file |
| A5 | `usePathname()` rende lo stesso valore al render server e all'idratazione, quindi lo stato iniziale della colonna non produce mismatch | §B.3 | un avviso di idratazione nel build/console; si risolverebbe con un effetto |
| A6 | «Not Arrived (123)» non entra in ~60 px a `text-xs` | §G | se entrasse, una riga sola basterebbe |
| A7 | Una pagina `/admin/*` in cache SW puo' mostrare la vecchia etichetta offline | Runtime State | nessun rischio reale |

## Open Questions

1. **D-52-23 misura un meccanismo che l'iPhone non ha.**
   - What we know: Next emette `interactive-widget`; Chrome/Firefox Android lo rispettano; Safari al 2026-09-11 no; `dvh` non segue la tastiera su iOS.
   - What's unclear: se il proprietario accetta che la prova su iPhone verifichi le misure di layout (lista contigua, ricerca in cima, barra nascosta) e registri il ridimensionamento come «atteso assente su Safari di oggi».
   - Recommendation: dirlo **prima** della prova, in parole di dominio: «sull'iPhone la pagina non si stringera' sopra la tastiera, perche' Safari non lo fa ancora; quello che sistemiamo e' che il nome cercato e il suo "Check in" stiano subito sotto il campo».
2. **TASK a `master`?** D-52-03 nomina organizer e staff. Un master senza TASK vede tre voci. Raccomandato chiedere; in attesa, filtro per `roles: ["organizer", "staff"]` come scritto.
3. **Il confine sui dati della gallery.** Il cancello e' di indirizzo; un `attendee` legge ancora `event_media` approvati via API, e il bucket e' pubblico. Accettato come temporaneo (D-52-14) o da stringere? Raccomandato: accettarlo e **scriverlo** (§C.5); stringere la RLS e' un'altra fase.
4. **Geometria delle cinque linguette** (§G): due righe, riga scorrevole o etichette corte.
5. **Il login da telefono**: toccare `FOCUS_ROOT` (tutte le superfici `focus`, digest da aggiornare) o lasciarlo centrato e accettare che iOS scorra al campo? Raccomandato: provarlo prima com'e' sull'iPhone con le altre misure, e decidere sul risultato.
6. **Ordine della striscia degli strumenti**: il pannello e' alfabetico (D-52-07); la striscia (NAV-04) resta nell'ordine di `STAFF_TABS` o diventa alfabetica anche lei? Non deciso; raccomandato lasciarla com'e' e dichiararlo.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, gate | ✓ | v25.6.1 | — |
| npm | script | ✓ | 11.9.0 | — |
| `.env.local` / `.env.lab.local` | `npm run dev:lab`, `verify:capabilities`, applicazione migration | ✓ (presenti) | — | senza: `verify:capabilities` esce 2 |
| Laboratorio Supabase attivo | migration di prova, prove manuali | da verificare il giorno stesso (va in pausa dopo una settimana; NXDOMAIN = INACTIVE) | — | restore via Management API |
| `lab.resonatemotion.com` al commit della fase | prova su iPhone | da verificare | — | nessuno: la prova si fa li' |
| iPhone con Safari (proprietario) | P-52 viewport e linguette | umano | iOS da registrare | nessuno |
| Supabase CLI | — | ✗ (per scelta) | — | endpoint migrations della Management API |

**Missing dependencies with no fallback:** nessuna bloccante lato codice; la prova su iPhone richiede il proprietario.

## Validation Architecture

**Non esiste un test runner per il prodotto.** Non c'e' uno script `test`, non c'e'
un file `*.test.*`. Niente in questa fase puo' essere dichiarato verificato perche'
«i test passano». La validazione e' fatta di tre strati: gate statici, gate con
database, procedure manuali scritte.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | nessuno — gate statici in `scripts/verify-*.mjs` |
| Config file | `scripts/verify-all.mjs` (elenco dei gate) |
| Quick run command | `npm run build` + il gate del file toccato (tabella sotto) |
| Full suite command | `npm run build && npm run verify` (24 gate, oggi VERIFY_OK) |

### Phase Requirements → Verifica
| Req ID | Behavior | Tipo | Comando / procedura | Esiste? |
|--------|----------|------|---------------------|---------|
| NAV-01 | voci per soggetto | statico + manuale | `npm run build` (i 13 mount compilano con la firma nuova); `npm run verify:touch-targets`, `verify:dialogs`, `verify:no-viewport-read`, `verify:conversion`; **P-52-A** (quattro sessioni nel lab: anonimo, attendee, staff, organizer — barra e pannello annotati) | gate ✅ · procedura ❌ da scrivere |
| NAV-02 | rifiuti gallery | statico + database + manuale | `npm run verify:routes` (prefisso ↔ allow-list), `npm run verify:capabilities` (16/64/31/33, contro lab poi produzione), build (`satisfies Record<CapabilityKey, Binding>`); **P-52-B** sonde sul lab: anonimo `GET /gallery` → 307 `/login?next=%2Fgallery`; attendee loggato → 307 `/account`; staff/organizer → 200; login da `?next=/gallery` torna su `/gallery` | gate ✅ · procedura ❌ |
| NAV-03 | pannello alfabetico, Account senza sezione | statico + manuale | build; P-52-A (ordine letto a schermo); grep: zero importatori di `ManagementSection` | ❌ |
| NAV-04 | striscia appesa | manuale | **P-52-C** su telefono nel lab: dentro uno strumento lungo (Members), scorrere fino in fondo, la striscia resta; cambiare strumento dal fondo | ❌ |
| NAV-05 | cifra staff | statico + manuale | build; a schermo: la cifra non reagisce al tocco | ❌ |
| NAV-06 | chip dalle serate visibili | statico + manuale | `npm run verify:venue-surfaces` (le due stringhe esatte), build; **P-52-D** nel lab: da anonimo i chip = format con serate pubblicate; con `staff.manage` compare il chip di un format con sola bozza; selezionare un chip non fa sparire gli altri; con zero serate la riga e' assente | ❌ |
| porta, linguette | cinque linguette, conteggi, evidenza, undo | statico + manuale | `npm run verify:touch-targets` (debito 14 o meno, nessun quindicesimo), `verify:scan-legibility`; **P-52-E** su iPhone nel lab, radio accesa e spenta: le cinque linguette sempre presenti; Recent vuota «No scans yet»; Alerts vuota «Nothing to report»; un avviso nuovo evidenzia Alerts senza aprirla; le pastiglie e l'avviso guest list restano visibili con Recent aperta; undo da Recent registra l'atto; titolo e «QR Scan» restano in vista scorrendo con ogni linguetta | ❌ |
| viewport | tastiera | manuale | **P-52-F** su iPhone (Safari), login, ricerca alla porta, un form pubblico, con la tastiera aperta: barra nascosta al fuoco e di ritorno al blur; riga trovata e «Check in» interi sopra la tastiera; viewport ridimensionato **atteso assente** su Safari (registrato, non «fallito»); versione di iOS scritta | ❌ |
| persona | coerenza | statico | `npm run verify:persona` **solo se** si tocca `.claude/**` (worst-case oggi `DoorSurface.tsx`, 13580/15000 token: la fase non cambia i moduli caricati dai file che tocca, quindi il caso peggiore non si sposta se la persona non viene editata) [MISURATO in questa sessione] | ✅ |

### Sampling Rate
- **Per commit:** `npm run build` + i gate del file toccato (tabella).
- **Per onda:** `npm run verify` completo.
- **Porta di fase:** `npm run verify` verde + `verify:capabilities` verde contro la produzione dopo l'atto + P-52-A..F scritte **ed eseguite** nel lab, con esiti in `52-ESITI.md` nella forma di `51-ESITI.md` (commit servito da `lab.resonatemotion.com` scritto prima della corsa; `PRE-LAB` come in `51-PROCEDURES.md:48-54`).

### Wave 0 Gaps
- [ ] `52-PROCEDURES.md` — P-52-A..F nella forma di `51-PROCEDURES.md` (passo · ruolo · cosa si deve osservare), compresa la precondizione `PRE-LAB`.
- [ ] Un account `attendee` e uno `staff` di prova sul laboratorio (se non ci sono gia': leggerli da `.env.lab.seed.json`, non inventarli).
- [ ] `scripts/verify-capabilities.mjs` aggiornato nello stesso commit della migration.
- Nessun framework da installare: e' una decisione del progetto, non un buco.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (nessun cambio al login) | — |
| V3 Session Management | no | — |
| V4 Access Control | **si'** | `private.has_capability` via `my_access_context`; mappa `capability-routes.ts` letta da middleware, guardia e barra; RLS come confine |
| V5 Input Validation | si' (parametri `?format=`, `?next=`) | allow-list: `formatOptions`/chip per il format; `NEXT_ALLOW_LIST` per il ritorno |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| voce nascosta ma rotta aperta | Elevation | mappa + prefisso + guardia (§C), mai la sola barra |
| open redirect via `?next=/gallery…` | Spoofing | `resolveNext` rifiuta per difetto; pattern ancorato `^\/gallery$` |
| bozza rivelata da un conteggio o da una query «ha serate?» | Information disclosure | chip dal solo array gia' filtrato dalla RLS; nessun numero passato ai figli |
| nome di sede in un chip (serie) | Information disclosure | nome del chip dal catalogo, mai da `CardFormat.name` |
| lettura diretta di `event_media` da un attendee | Information disclosure | **non mitigato in questa fase, dichiarato** (§C.5) |
| decisione d'accesso nel client | Tampering | la barra riceve le chiavi dal server e non filtra per larghezza |
| avviso della porta nascosto | Repudiation / DoS operativo | Alerts evidenziata, pastiglie e avviso guest list sempre in testata |

## Sources

### Primary (HIGH confidence) — codice e gate letti in questa sessione
- `src/lib/rbac/roles.ts`, `src/components/layout/AppNav.tsx`, `src/lib/routes/staff-tabs.ts`, `src/components/staff/StaffNav.tsx`, `src/app/(admin)/admin/(work)/layout.tsx`, `src/components/account/ManagementSection.tsx`, `CollapsibleSection.tsx`, `src/app/(members)/account/page.tsx`
- `src/lib/routes/capability-routes.ts`, `src/lib/supabase/middleware.ts`, `src/lib/routes/next-redirect.ts`, `src/lib/capabilities/keys.ts`, `src/app/(public)/gallery/page.tsx`, `(work)/manifesto/page.tsx`
- `supabase/migrations/20260817120000_production_section_keys.sql`, `20260921120000_drop_status_and_referral.sql:996`, `20260922120000_role_attendee_and_capability_keys.sql:587-642`, `20260923120000_role_capabilities_comment.sql`, `20260225120000_phase7_media.sql:25-27`
- `src/app/(public)/events/page.tsx`, `FormatFilterRow.tsx`, `src/components/admin/MemberTable.tsx`
- `src/app/(admin)/admin/scanner/ScannerClient.tsx`, `DoorSurface.tsx`, `src/app/layout.tsx`, `src/components/ui/PageShell.tsx`, `Dialog.tsx`, `src/app/globals.css`
- `scripts/verify-touch-targets.mjs`, `verify-dialogs.mjs`, `verify-no-viewport-read.mjs`, `verify-conversion.mjs`, `verify-routes.mjs`, `verify-capabilities.mjs`, `verify-venue-surfaces.mjs`, `verify-media-strip.mjs`; `npm run verify:persona` eseguito (7/7, caso peggiore 13580/15000)
- `node_modules/next/dist/lib/metadata/types/extra-types.d.ts:53` (Next 16.1.6)

### Secondary (MEDIUM confidence)
- [bram.us — WebKit supports interactive-widget … and hopefully Safari will too? (2026-09-11)](https://www.bram.us/2026/09/11/webkit-supports-interactive-widget-and-hopefully-safari-will-too/) — stato di Safari
- [HTMHell — Control the Viewport Resize Behavior on mobile with interactive-widget](https://www.htmhell.dev/adventcalendar/2024/4/) — semantica dei tre valori, unita' di viewport sotto `resizes-visual`, supporto Chrome/Firefox
- [WebKit bug 259770 — Implement the interactive-widget property](https://bugs.webkit.org/show_bug.cgi?id=259770) — tracciamento (non letto per esteso)

### Tertiary (LOW confidence)
- comportamento iOS di `:has(:focus)`, `scrollIntoView` durante la salita della tastiera, Popover API light-dismiss — da provare sull'iPhone (A1-A3)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nessuna dipendenza nuova, versioni lette da `node_modules`
- Architecture: HIGH — ogni punto d'innesto e ogni gate letti con riga
- Pitfalls: HIGH sui gate (misurati), MEDIUM-LOW su iOS (fonti esterne + assunzioni da provare)

**Research date:** 2026-09-23
**Valid until:** 2026-10-07 per la parte iOS (Safari puo' spedire `interactive-widget` in qualunque release); 30 giorni per il resto, salvo commit che tocchino i file citati
