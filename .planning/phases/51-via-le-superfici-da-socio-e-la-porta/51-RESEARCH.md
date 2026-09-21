# Phase 51: Via le superfici da socio, e la porta — Research

**Researched:** 2026-09-21
**Domain:** rimozione di superfici e di una credenziale, rinomina di un ruolo e di una tabella, percorso della porta offline (Next.js 16 / React 19 / Supabase / Serwist / IndexedDB)
**Confidence:** HIGH sull'inventario del codice (letto, con `file:riga`); MEDIUM sulle scelte che il contesto non ha deciso (tre, elencate in Open Questions); LOW su nulla — dove non ho misurato, lo dico.

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repo pubblico. Qui si nominano **ruoli**, mai persone; nessuna sede in trattativa, nessuna data non annunciata, nessun ref di progetto Supabase scritto per esteso oltre a quelli che il prompt di fase gia' porta.

---

<user_constraints>
## User Constraints (from 51-CONTEXT.md)

### Locked Decisions

- **D-51-01 — Nessun messaggio dedicato per un vecchio QR da socio.** Nessuno e' iscritto, quindi nessuno mostrera' la card: un codice di quella forma riceve lo stesso rifiuto di un codice sconosciuto. Non si costruisce un riconoscimento per un caso che non esiste.
- **D-51-02 — Il codice socio si cancella: colonna `profiles.membership_code`, conio alla creazione dell'account (`20260905130000_membership_code_crypto.sql` e i chiamanti), tipo in `database.ts`.** Migration provata **prima sul laboratorio** con procedura scritta, come D-50-01. Una credenziale che nessuna porta verifica non deve esistere.
- **D-51-03 — Staff e organizer non scansionano: sono in servizio.** Chi e' assegnato alla serata entra perche' lavora; la porta non li registra come ospiti e non esiste un QR per loro.
- **D-51-04 — Le presenze registrate da scansioni socio si CANCELLANO.** Decisione del proprietario. E' una cancellazione in produzione: vale `ai-engineering.md` per intero — **conteggio prima** (per tabella, per cascata letta dai vincoli `ON DELETE`), **istantanea** di ogni tabella raggiungibile, **rimozione per chiave primaria** su una lista catturata, mai per interfaccia, **autorizzazione datata** del proprietario che si consuma una volta, e conferma da una fonte diversa da quella su cui si e' agito. Prima sul laboratorio, poi in produzione.
- **D-51-05 — Lo schermo della porta mostra solo esito e tipo di biglietto, nessun nome** (decisione del proprietario, 2026-09-21, `deferred-items.md` §7 della fase 50): il biglietto e' al portatore (D-49-03) e un nome fa respingere un ospite valido. Con esso entrano le tre osservazioni dal lab: l'avviso «member list NOT refreshed» (vedi D-51-10), l'intestazione dello scanner **fissa** in alto, la zona dell'esito **opaca**.
- **D-51-06 — `member` diventa `attendee`, in questa fase.** Chi partecipa: compra o e' invitato. Non `guest`, che alla porta e nella coda offline e' gia' l'invitato in lista; non `buyer`, sbagliato per chi entra da guest list senza pagare. Tre vincoli `CHECK` nelle migration (`20260224_rbac_migration.sql:15`, `20260807000000_capability_model.sql:121`, `20260808000500_staff_role.sql:76`) e otto file di codice: migration sul laboratorio prima, poi produzione, e le righe esistenti passano ad `attendee` nella stessa migration.
- **D-51-07 — Le chiavi `membership.active` e `membership.card.view` escono dal catalogo e dalla costante TypeScript** (`src/lib/capabilities/keys.ts`), che e' il debito dichiarato dalla fase 50.
- **D-51-08 — `membership_acts` si rinomina in `account_acts`**, con ogni punto che la scrive (`src/lib/membership/acts.ts` e i chiamanti).
- **D-51-09 — La pagina mostra SOLO i biglietti**: quelli delle serate in arrivo con il QR, e quelli passati in una sezione chiusa «Past». Piu' cambio password ed email, che gia' esistono. Niente drink, niente card, niente storico, niente caricamento media.
- **D-51-09b — Vive a `/account`**; `/dashboard` resta come **redirect permanente**. Il gruppo `(members)` perde `/attendance` e `/membership-card`.
- **D-51-10 — Il download della lista resta, solo per la guest list.** `/api/membership/list` e il suo precache spariscono; la guest list ha la sua strada (esistente o nuova: lo decide la ricerca). L'avviso dice «guest list» e **si accende solo quando e' vero**.
- **D-51-11 — Le voci `membership` ancora in coda su un telefono vecchio si scartano in silenzio** all'aggiornamento della coda. Vincolo minimo di `meta-gates.md`: **una riga di log con categoria e conteggio** nel client, nessuna superficie. La versione di IndexedDB sale e `QueuedSubjectType` perde `"membership"`.
- **D-51-12 — La prova MEM-04 la fa il proprietario, con un telefono vero, sul laboratorio, prima e dopo**, come `P-50-8`: procedura scritta passo per passo, radio spenta davvero, stessa serata di prova, esito registrato con la data nel VERIFICATION.

### Claude's Discretion

- Nome e testo del pulsante di download della guest list, e la forma della categoria di log per le voci scartate (D-51-11).
- Come la guest list arriva al telefono per l'offline, se serve una rotta nuova o basta quella esistente: **lo decide la ricerca leggendo il codice** → risposta in §2.1, rotta esistente, nessuna rotta nuova.
- L'ordine dei piani, purche' la migration del ruolo e quella del codice socio passino dal laboratorio prima della produzione e la prova a rete spenta chiuda la fase.

### Deferred Ideas (OUT OF SCOPE)

- Cancellazione self-service dell'account da `/account` — fase a se'.
- Ordine e voci della barra per un `attendee` — fase 52, NAV-01/NAV-02.
- Le parole «member/membership» nei documenti e nella persona — fase 57.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrizione | Supporto dalla ricerca |
|----|-------------|------------------------|
| **MEM-01** | La membership card e' rimossa: superficie, rotta e capability. | §1.1 (i 4 file della superficie), §1.3 (rotta: `capability-routes.ts:412`, `next-redirect.ts:145/147`, manifest), §4.3 (capability: `keys.ts:316`, catalogo `private.capabilities` + cascata su `role_capabilities`), §6 (gate che arrossiscono) |
| **MEM-02** | Lo storico delle presenze e' rimosso. | §1.2 — **la pagina non ha mai letto nulla**: `TODO` e array vuoto costante a `attendance/page.tsx:67`. §3 — le righe di `public.attendances` e come contarle/cancellarle |
| **MEM-03** | `/api/membership/verify` e' rimosso insieme al precache nel service worker e alla coda offline. | §2 intero: `sw.ts:41-47`, `sync-manager.ts:369-395`, `checkin-store.ts:105/313-322/954-1020/1471-1477`, `ScannerClient.tsx:2243-2400`, bump IndexedDB v5→v6 |
| **MEM-04** | Verificata su un dispositivo con la rete spenta, prima e dopo, procedura scritta passo per passo. | §8 — la forma di `P-50-8` replicata, con i sei passi e la rilettura dal catalogo |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Direttive attive che il piano deve rispettare, estratte da `./CLAUDE.md` e dai moduli caricati (`checkin-offline.md`, `access-gating.md`, `supabase-data.md`, `nextjs-architecture.md`, `meta-gates.md`, `ai-engineering.md`):

1. **Non esiste alcun test runner per il prodotto.** `package.json:5-44` non ha script `test`, e non c'e' alcun `*.test.*` / `*.spec.*`. Nessuna modifica puo' essere dichiarata verificata «perche' i test passano». La verifica e' `npm run build` (che e' anche il typecheck: non c'e' script `typecheck` separato) piu' i 30 gate `verify:*` piu' una procedura manuale scritta. **[VERIFIED: package.json letto]**
2. **La RLS e' il confine, il middleware e' UX.** Togliere una riga dalla mappa delle rotte non protegge nulla e non espone nulla: le policy restano dove sono.
3. **La porta non ha rete, e l'asimmetria decide i default.** Rifiutare un ospite valido e' peggio che ammetterne uno doppio. Nessuna modifica di questa fase puo' rendere il percorso del biglietto o della guest list piu' lento o dipendente dalla rete.
4. **Le migration sono la fonte di verita' dello schema, non `schema.sql`.** `supabase/schema.sql` non contiene alcun `CREATE POLICY`.
5. **Il repository e' PUBBLICO.** `.planning/` e' pubblicato: ruoli, mai persone.
6. **macOS/BSD**: `grep -E`, `sed -i ''`. **E `grep` nudo e' cieco sui file con byte NUL** — `scripts/verify-persona.mjs` e' uno di quelli (misurato: `grep` lo riporta come *«Binary file … matches»*). Usare `/usr/bin/grep -a` o `Read`. **[VERIFIED: misurato in questa sessione]**
7. **Gate `ai-engineering.md`**: rimozione per chiave primaria, istantanea per cascata, contatore da fonte diversa, autorizzazione come atto che si consuma una volta.
8. **Ogni modifica a `CLAUDE.md` o a `.claude/rules/**`** richiede: coerenza indice↔frontmatter, nessun path morto, semver + changelog, e la tabella di routing di `meta-gates.md` allineata. `npm run verify:persona` copre 2, 3 e 5.

---

## Summary

Questa fase toglie **una credenziale, una rotta d'API, due superfici, due chiavi di capability e un valore di ruolo**, e sposta una pagina. Il grosso del rischio non sta nel togliere: sta in **tre effetti collaterali che nessun grep sul nome «membership» trova**, e che ho misurato leggendo il codice.

**Il primo.** `public.attendances` e' scritta da **un solo punto in tutto il prodotto** — `src/app/api/membership/verify/route.ts:527-537` — e letta da due (`checkin/undo/route.ts:534,560`). Quando `/api/membership/verify` esce, la tabella resta **senza scrittori e senza lettori**. D-51-04 dice di cancellare «le presenze registrate da scansioni socio»: in pratica sono **tutte le righe con `party_id IS NOT NULL`**, piu' un residuo storico pre-porta con `party_id IS NULL` che quella frase *non* copre e che va contato e messo davanti al proprietario separatamente. Nulla punta a `attendances` con una chiave esterna (verificato: zero occorrenze di `references public.attendances` e zero colonne `attendance_id` nello schema), quindi **la cascata e' vuota** — il che non toglie l'obbligo dell'istantanea, lo rende soltanto piccolo.

**Il secondo.** `DoorSubjectType` (`src/lib/door/outcome.ts:56`) e' **specchiato letteralmente da un `CHECK` SQL** su `public.door_scan_events.subject_type` (`20260805120000_door_scan_events.sql:69-70`), e il file lo dichiara come regola: *«Editing either literal set means editing both, in the same commit»*. Restringere l'union TypeScript senza toccare il `CHECK` rompe lo specchio; restringere il `CHECK` richiede di decidere cosa fare delle righe storiche `subject_type = 'membership'`, che sono il **registro delle convalide**, non delle presenze — e D-51-04 non le nomina. **E' la domanda aperta piu' importante di questa fase** (Open Question 1).

**Il terzo.** `public.record_membership_act` legge `profiles.membership_code` per scrivere `membership_acts.subject_label`, che e' `NOT NULL` (`20260808002000_membership_register.sql:203`; corpo vivo della funzione in `20260921120000_drop_status_and_referral.sql:571-611`). E' `plpgsql`: un `DROP COLUMN membership_code` **riesce e la funzione si rompe in silenzio** — la fase 50 ha gia' pagato esattamente questo errore e lo ha scritto nel proprio file di migration (`:109-112`). Con `createAccount` che passa da li', il guasto sarebbe *«nessuno puo' creare un account»*. Il `DROP COLUMN`, la ridefinizione della funzione e la rinomina della tabella devono stare **in un solo file e in una sola transazione**.

**Due buone notizie, entrambe misurate.** (a) La guest list **arriva gia' offline dalla rotta esistente** `/api/tickets/attendance`, che restituisce nome, `hasEmail` e `guestListEntryId` accanto ai biglietti (`attendance/route.ts:698-703, 876-895`): **D-51-10 non ha bisogno di alcuna rotta nuova**. (b) `typedRoutes` di Next 16 include i *source* di `redirects()` nell'union dei percorsi validi — misurato su `.next/types/routes.d.ts:8`, `type RedirectRoutes = "/eventi/[[...path]]" | "/galleria" | "/presenze"` — quindi `/dashboard` → `/account` scritto in `next.config.ts` **tiene in compilazione i ~40 `redirect("/dashboard")` esistenti** senza toccarli.

**Raccomandazione primaria:** cinque onde, in quest'ordine — (0) decidere le tre domande aperte; (1) la porta e l'offline, che e' l'unica parte irreversibile davanti a una fila; (2) le superfici e la rotta `/account`; (3) le due migration (ruolo+chiavi, poi codice+registro), lab prima; (4) la cancellazione in produzione sotto autorizzazione datata; (5) `P-51-1` a radio spenta, che chiude la fase.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Verifica del codice socio alla porta | API (`/api/membership/verify`) | — | Esce interamente. Nessun tier la eredita: D-51-01 dice che un codice di quella forma e' un codice sconosciuto |
| Roster dei soci scaricato prima della serata | API (`/api/membership/list`) + Client (IndexedDB `members`) | Service worker (`NetworkOnly`) | Esce. La guest list, che resta, e' gia' servita da `/api/tickets/attendance` e cachata nello store `attendees` |
| Coda offline delle scansioni | Client / IndexedDB | API di drenaggio | Perde un ramo su tre (`membership`); `ticket` e `guest` restano intatti — **nessuna modifica ai due rami che funzionano** |
| Membership card (rendering del QR) | Frontend Server (RSC) | — | Esce: rotta, pagina, `loading`, componente |
| Storico presenze | Frontend Server (RSC) | — | Esce. Non ha mai letto la Database tier: `TODO` e array vuoto |
| Ruolo `member` → `attendee` | Database (CHECK + righe) | API/Client (union TS, filtri, etichette) | Il valore e' dato: la fonte e' il `CHECK`, il TS e' lo specchio |
| Registro degli atti | Database (tabella + funzione SECURITY DEFINER) | Frontend Server (pagina register) | La rinomina e' un atto di schema; il TS e la pagina seguono |
| Pagina dell'account | Frontend Server (RSC) | Middleware (bounce), next.config (308) | Il redirect permanente e' del tier di configurazione, non del middleware: arriva prima ed e' piu' economico |
| Esito sullo schermo della porta | Client (`ScanFlash`, `ScannerClient`) | — | Presentazione pura: nessuna decisione di ammissione cambia |

---

## 1. Inventario completo — le superfici e le rotte

### 1.1 Membership card (MEM-01)

| File | Cosa contiene | Azione |
|---|---|---|
| `src/app/(members)/membership-card/page.tsx` (135 righe) | legge `profiles.membership_code` (`:90`), fallback `"RSN-UNKNOWN"` (`:94`), monta `MembershipCardView` (`:124-126`) | **cancellare** |
| `src/app/(members)/membership-card/loading.tsx` | il segnaposto, `MembershipCardLoading` (`:42`) | **cancellare** |
| `src/components/membership/MembershipCardView.tsx` | il componente della card | **cancellare** (unico importatore: la pagina sopra) |
| `src/utils/qr.ts:33-35` | `generateMembershipQR()` → costruisce `…/api/membership/verify?code=…` | **cancellare la funzione** (verificare che non abbia altri chiamanti: al 2026-09-21 non ne ha) |

### 1.2 Storico presenze (MEM-02) — **non ha mai letto nulla**

`src/app/(members)/attendance/page.tsx` (151 righe). Alla riga 67:

```
  // TODO: fetch attendance records from Supabase
  const attendances: { event_title: string; date: string }[] = [];
```

L'array e' **costante e vuoto**: l'unico ramo raggiungibile e' *«No attendance recorded yet»*. Il manifest di conversione lo dice gia', e lo dice come fatto misurato (`conversion-manifest.mjs:1022`: *«a pre-existing stub — a TODO and a hardcoded empty array — so the empty branch is the only branch a member can reach»*). **Conseguenza per il piano:** MEM-02 non ha alcun rischio di perdita di dati sul lato superficie — la superficie non mostrava dati. Il rischio di MEM-02 e' interamente in §3, sul lato database.

Cancellare: la pagina, la sua riga nel manifest, la sua riga nella mappa delle rotte, la sua voce in `PROTECTED_PREFIXES` e nel `NEXT_ALLOW_LIST`, **e il redirect italiano** (§1.4).

### 1.3 Le rotte, e i sette posti che le nominano

| Posto | Riga | `/membership-card` | `/attendance` | `/dashboard` |
|---|---|---|---|---|
| `src/lib/routes/capability-routes.ts` | `:411-413` | ✔ (`routes:` di `MEMBERSHIP_CARD_VIEW`) | ✔ (stessa voce) | non mappato (nessuna capability) |
| `src/lib/routes/next-redirect.ts` | `:145,146` (allow-list) e `:144-151` (`PROTECTED_PREFIXES`) | ✔ | ✔ | ✔ `:38` `DEFAULT_NEXT`, `:90` allow-list, `:146` prefisso |
| `src/lib/supabase/middleware.ts` | `:497` (`url.pathname = "/dashboard"` sul rifiuto per capability), `:584` (bounce anonimo su `PROTECTED_PREFIXES`) | via mappa | via mappa | ✔ |
| `src/lib/rbac/roles.ts` | `:332` `href: "/dashboard"` della voce Account | — | — | ✔ |
| `src/components/layout/AppNav.tsx` | `:253-254` stato attivo della voce | — | — | ✔ |
| `scripts/conversion-manifest.mjs` | `:1022` `/attendance`, `:1026` `/membership-card`, `:1076` `/dashboard` | ✔ | ✔ | ✔ |
| `scripts/verify-routes.mjs` | controllo [2/3] censisce le pagine sotto `(admin)` e le confronta con la mappa; controllo [3/3] pretende che ogni `PROTECTED_PREFIXES` risolva via `resolveNext` **senza sostituzione** (`:515-560`) | indiretto | indiretto | indiretto |
| `scripts/probe-forged-identity.sh` | `:20` elenca i cinque indirizzi provati | ✔ | ✔ | ✔ |

**La regola meccanica che ne esce:** togliere `/membership-card` e `/attendance` da `PROTECTED_PREFIXES` **senza** toglierli da `NEXT_ALLOW_LIST` lascia `verify:routes` verde ma l'allow-list sporca; toglierli dall'allow-list senza toglierli dai prefissi rende `verify:routes` **rosso al controllo [3/3]**. Vanno insieme, nello stesso commit.

### 1.4 `/dashboard` → `/account`: la strada misurata

**Il problema.** Ci sono **72 occorrenze** di `"/dashboard"` in `src/` e `scripts/`, di cui ~40 sono `redirect("/dashboard")` nelle pagine sotto `src/app/(admin)/admin/(work)/` — il rifiuto standard di ogni superficie di lavoro. Con `typedRoutes: true` (`next.config.ts:34`), un `redirect()` verso un percorso che non e' piu' nell'union fa **fallire il build**.

**La misura, non l'ipotesi.** Ho letto i tipi generati:

```
.next/types/routes.d.ts:8
type RedirectRoutes = "/eventi/[[...path]]" | "/galleria" | "/presenze"
.next/types/routes.d.ts:9
type Routes = AppRoutes | PageRoutes | LayoutRoutes | RedirectRoutes | RewriteRoutes | AppRouteHandlerRoutes
```

I *source* dei redirect dichiarati in `next.config.ts` **entrano nell'union dei percorsi validi**. `.next/types/link.d.ts:73,79` conferma: `` `/galleria` `` e `` `/presenze` `` sono `StaticRoutes` validi per `<Link>`.

**Conseguenza per il piano.** Aggiungere in `next.config.ts` `redirects()`:

```ts
{ source: "/dashboard", destination: "/account", permanent: true }
```

soddisfa D-51-09b (permanente = 308), tiene `/dashboard` un `Route` valido, e **rende non necessario toccare i ~40 siti di rifiuto**. Se invece si scegliesse di tenere una `page.tsx` a `/dashboard` che chiama `permanentRedirect("/account")`, funzionerebbe anche quello ma costerebbe un giro in piu' (middleware + render) su ogni rifiuto, sul percorso che le superfici di lavoro usano per dire di no. **Raccomandazione: la voce in `next.config.ts`.** *(Nota d'ordine: i redirect di `next.config` girano **prima** del middleware, quindi un anonimo che digita `/dashboard` riceve 308 → `/account` → poi il bounce a `/login?next=/account`. `/account` deve percio' entrare in `NEXT_ALLOW_LIST` **e** in `PROTECTED_PREFIXES`.)*

**Il costo, che si dichiara e non si scopre.** Un 308 lo memorizza il browser: chi segue `/dashboard` anche una sola volta continuera' a finire su `/account` dalla propria cache anche se un giorno si volesse tornare indietro. E' la stessa proprieta' che la fase 50 ha registrato in `T-50-28`. Va scritta nel piano come disposizione `accept`.

**Il gemello, in direzione opposta.** `next.config.ts` ha oggi `{ source: "/presenze", destination: "/attendance", permanent: true }`. Quando `/attendance` sparisce, **quella riga va cancellata con la pagina** — esattamente come la fase 50 ha fatto con l'alias italiano dell'iscrizione. E chi ha gia' seguito `/presenze` continuera' a essere mandato su `/attendance` **dalla propria cache**, ricevendo un 404: e' la proprieta' del 308, non un difetto della modifica, e va dichiarata.

### 1.5 La pagina `/account`: cosa sopravvive di `/dashboard`

`src/app/(members)/dashboard/page.tsx` (706 righe) oggi rende, nell'ordine:

| Blocco | Righe | D-51-09 |
|---|---|---|
| Notice per chi arriva senza password | ~`:149-152`, `:448` | **resta** (e' il percorso degradato dell'invito) |
| Header con nome + `PostHogIdentify` (`role={role ?? "member"}`) | `:349-357` | resta; il fallback diventa `"attendee"` |
| «My Stuff» → link `/membership-card` (`:511`) e `/attendance` (`:517`) | `:499-521` | **esce tutto il blocco** |
| «My Tickets» — upcoming + past, ordinati da `:282-290` | `:525-640` | **resta, ed e' il cuore**. Oggi sono una lista unica (`sortedTickets = [...upcoming, ...past]`); D-51-09 chiede **«Past» in una sezione chiusa** → le due liste gia' esistono separate, va solo cambiata la resa |
| «My Drinks» — `DashboardDrinkTokens` (`:641-643`), alimentato dalla query `:227-249` | `:641-643` | **esce**, e **con esso la query su `drink_tokens`**: una lettura che non alimenta piu' nulla e' peso sul percorso, non innocua |
| «Settings» — `ChangeEmailButton`, `ResetPasswordButton`, `LogoutButton` | `:663-678` | **resta** |
| `ManagementSection` | `:684-686` | **resta in 51** — D-51 non la nomina; NAV-03 (fase 52) la toglie dalla pagina Account. Togliendola qui si anticiperebbe la 52 |
| `AppNav` con le quattro prop | `:690-700` | resta invariato |

Altri due punti: `:186-189` seleziona `membership_code, role, created_at` — **`membership_code` esce dalla select** (D-51-02); `:208` `const isMemberRole = !profile?.role || profile.role === "member"` → `"attendee"`.

Il segnaposto `src/app/(members)/dashboard/loading.tsx` si sposta con la pagina.

**Il manifest.** `conversion-manifest.mjs:1076` dichiara `"/dashboard", "src/app/(members)/dashboard/page.tsx", "default"`. Una superficie che cambia rotta **si rinomina nel manifest nello stesso commit**, o `verify:conversion` sbaglia bersaglio: il controllo D legge il *file di pagina* dichiarato, e un'entry che punta a un file inesistente fa esattamente cio' che il docblock del manifest chiama *«a gate assert the right thing about the wrong file»*. Le due entry di `/attendance` (`:1022`) e `/membership-card` (`:1026`) **si cancellano**.

---

## 2. Il percorso offline della porta, da capo a fondo

### 2.1 Come arriva la lista oggi — e perche' D-51-10 non ha bisogno di nulla di nuovo

`ScannerClient.fetchAttendance()` (`ScannerClient.tsx:1121-1360`) fa **due** fetch:

1. `GET /api/tickets/attendance?partyId=…[&search=…]` (`:1130`) — **la lista della serata**. La rotta interroga tre sorgenti (`attendance/route.ts:677-717`): `tickets`, `guest_list_entries` (`:698-703`, con `id, first_name, last_name, status, email, checked_in_at, checked_in_by`) e `ticket_refunds`. Le voci di guest list diventano `AttendeeItem` a `:876-895`, con `subjectType: "guest_list_entry"`, `guestListEntryId`, `hasEmail: !!g.email` e `ticketType: "guest_list"`. **Deliberatamente non c'e' `email` nel payload** (`:259`). Il risultato viene cachato in IndexedDB da `mergeAttendees` nello store `attendees`.
2. `GET /api/membership/list` (`:1297`) — **il roster dei soci**, cachato da `cacheMembers` nello store `members`.

> **Risposta alla discrezione lasciata alla ricerca:** l'invitato senza email **e' gia' nella lista scaricata** dalla prima chiamata, si trova per nome nella ricerca client, e il check-in per nome passa da `POST /api/tickets/attendance` con `guestListEntryId` (`attendance/route.ts:1051-1160`). **Non serve alcuna rotta nuova, e non serve alcun pulsante nuovo**: il «download prima della serata» che D-51-10 conserva e' la chiamata 1, che gia' esiste e gia' gira. Quello che esce e' la chiamata 2 e tutto cio' che pende da essa.

> **Il ramo `guest` non ha un percorso *offline* di conferma diverso**: `sync-manager.ts` `case "guest"` (`:396-…`) drena verso `POST /api/tickets/attendance`. **Questo ramo non si tocca.**

### 2.2 L'avviso «member list NOT refreshed» — dove sta e perche' resta acceso

Il testo e' a `ScannerClient.tsx:1311`:

> *"The member list on this device was NOT refreshed. With the radio off, a member who joined recently may not be recognised — check them in from the list rather than refusing them."*

E' l'avviso che `P-50-8` ha visto in schermata e che ha usato come prova interna che la radio fosse davvero spenta (`50-ESITI.md`, riquadro della procedura).

**Perche' resta acceso col badge «Online».** `setCacheNotices(notices)` e' chiamato **una volta sola**, a `:1331`, **dopo** tutti i rami di fallimento — e ognuno di quei rami fa `return` prima:

- `:1134-1146` — `fetch` fallito: se `navigator.onLine` e' falso, **`return` senza toccare `cacheNotices`**. L'avviso precedente rimane sullo schermo.
- `:1148-1169` — risposta non-`ok`: scrive il proprio avviso e `return`.

Quindi una volta acceso, l'avviso si spegne **solo** al primo `fetchAttendance` che arriva fino a `:1331`, cioe' a un giro completo e riuscito. Il badge «Online» e' calcolato altrove e **non condiziona l'avviso**: le due verita' non sono legate.

**La forma corretta della riparazione (D-51-10: «si accende solo quando e' vero»).** Il prodotto ha gia' la macchina giusta e non la usa qui: `lastFetchAtRef` (`:1042`, `performance.now()` monotono, con il commento che spiega perche' non `Date.now()`), `listAgeMs` (`:2643`), `listIsStale` (`:2666`, `listAgeMs !== null && (!channelLive || listAgeMs > SAFETY_RELOAD_MS)`) e la fascia che gia' si disegna a `:3215-3226`. **L'avviso della guest list va derivato da uno stato calcolato — eta' della lista, o assenza della lista — non da un array di notice appiccicoso.** Un avviso derivato non puo' restare acceso quando la cosa che descrive e' falsa, perche' non e' uno stato: e' una funzione.

### 2.3 Il service worker

`src/app/sw.ts`, array `doorRuntimeCaching` (`:32-111`). Quattro regole d'API `NetworkOnly`, in ordine:

| Riga | Percorso | Azione |
|---|---|---|
| `:33-36` | `/api/tickets/attendance` | **resta** |
| `:37-40` | `/api/tickets/checkin` | **resta** |
| `:41-44` | `/api/membership/list` | **esce** |
| `:45-48` | `/api/membership/verify` | **esce** |

Il docblock sopra (`:14-30`) motiva le due che escono con *«`/api/membership/list` returns the whole member roster — every full name and membership code — which must not be left at rest in a browser cache bucket on a staff phone we do not control»*. **Quel paragrafo va riscritto, non lasciato:** un commento che spiega una regola che non c'e' piu' e' esattamente cio' che `ai-engineering.md` chiama documentazione datata.

**⚠ L'ordine e' portante e va preservato.** Il commento a `:27-30`: *«Serwist takes the first matching route, so these rules must be spread before the inherited ones, or the inherited `/api/*` rule keeps winning»*. Le regole ereditate di `defaultCache` includono un `NetworkFirst` su ogni `GET /api/*` same-origin (`cacheName: "apis"`, `maxAgeSeconds: 86400`, `networkTimeoutSeconds: 10`). **Se `/api/tickets/attendance` perdesse la sua regola esplicita, la lista della porta comincerebbe a risolversi da una copia vecchia di un giorno mentre `navigator.onLine` e' ancora `true`, e lo scanner riscriverebbe la buona lista locale con quella stantia.** Togliere due elementi da un array non puo' toccare gli altri due — ma va verificato sull'output, non sul diff.

**Il precache.** `precacheEntries: self.__SW_MANIFEST` (`:114`): il manifest e' generato da `@serwist/next` sugli asset del build, non da una lista scritta a mano. **Non c'e' nessuna voce di precache da editare**; togliere le rotte le toglie dal build e quindi dal manifest da solo. MEM-03 dice «precache»: il termine corretto per cio' che esiste e' *runtime caching*, e le due regole sopra sono tutto cio' che c'e'. *(Verificato leggendo `sw.ts` per intero.)*

### 2.4 La coda offline — IndexedDB, e il bump v5→v6

`src/lib/offline/checkin-store.ts` (1477 righe), `DB_VERSION = 5` (`:57`).

**Cosa esce:**

| Simbolo | Riga | Nota |
|---|---|---|
| `QueuedSubjectType = "ticket" \| "guest" \| "membership"` | `:105` | → `"ticket" \| "guest"` |
| `QUEUE_TYPE_BY_SUBJECT` / `SUBJECT_BY_QUEUE_TYPE`, voce `membership` | `:313-322` | `Record<DoorSubjectType, …>` totali: si restringono con l'union |
| `MemberRecord` (`membershipCode`, `role`) | `:160-180` | |
| store `members` (keyPath `membershipCode`) | `:264-266`, `:309`, creato a `:487-489` | |
| `ROSTER_PREDATES_ROLE_KEY` + `rosterPredatesRole()` | `:63-72`, `:1374-1389` | la chiave `meta` scritta dal passo v4 (`:539-542`) |
| `cacheMembers()` | `:1329-1370` | |
| `findMember()` | `:1471-1477` | |
| `checkInMemberLocally()` + `MembershipLocalResult` | `:954-1020` | |
| `entryRole` sui record di coda | `:233-236` | esisteva solo per il ramo membership |

**La forma del passo v6, e la regola che la governa.** Il file dichiara la disciplina dei passi a `:33-38`: *«the upgrade callback is cumulative, and no step may undo an earlier one»* — ogni versione e' il proprio blocco `if (oldVersion < N)`. E il passo v5 (`:545-596`) porta un vincolo che il piano deve leggere prima di scrivere il v6:

> *«this step does not touch the queue store. It does not read it, it does not rewrite a row of it, and it does not delete or re-create the store. A device arriving here can be carrying a NON-EMPTY queue — admissions for people who paid, taken at 01:40, on a phone that is offline right now.»*

**D-51-11 rompe deliberatamente quella proprieta'**, e va scritto come tale: il passo v6 **deve** toccare la coda, perche' deve scartarne le voci `type === "membership"`. E' l'unico passo di questo store che lo fa. Le regole che restano intatte:

1. **Copia prima, cancella poi**, mai il contrario (`:443-451`).
2. **Solo promesse `idb` si attendono dentro la callback** (`:530-533`, ripetuto a `:576-579`): un `await` su qualunque altra cosa lascia chiudere la transazione `versionchange` a meta' migrazione — *«and there is no test runner in this repository that could catch it»*.
3. `deleteObjectStore("members")` si fa **dopo** aver finito con la coda, e non serve leggerlo.
4. Le voci `ticket` e `guest` **non si toccano**: si cancellano solo quelle di tipo `membership`, per chiave.

**Il log di D-51-11.** Una riga sola, con categoria e conteggio, nel client. La casa ha gia' la convenzione: `console.error("scanner:member_roster_failed", …)` (`:1307`), `console.error("scanner:roster_role_flag_unreadable", …)` (`:795`), `console.error("scanner:attendance_failed", { status, detail })` (`:1157`). **Forma raccomandata:** `console.warn("checkin-store:v6_dropped_membership_entries", { count })`, emessa **una volta**, fuori dalla callback `upgrade` se e solo se cio' non richiede di attendere qualcosa dentro — altrimenti dentro, perche' `console.warn` non e' un `await`. Nessuna superficie: D-51-11 lo dice.

> **Il vincolo del commento, che vale ancora.** `:588-596` impone che il corpo del passo v5 **non nomini l'identificativo dello store della coda**, perche' l'asserzione di quel passo e' un grep. Il passo v6, che quello store lo tocca per davvero, **lo nominera'**: e' corretto, ma va scritto accanto, o il prossimo che legge credera' che la regola sia stata violata per distrazione.

### 2.5 Il drenaggio

`src/lib/offline/sync-manager.ts`, `targetFor()` (`:352-…`): `case "membership"` (`:369-395`) punta a `/api/membership/verify` e allega `entryRole` quando presente. **Esce il `case`, ed escono i quattro paragrafi di commento che lo spiegano.** Il `switch` e' su una union che si restringe: `npm run build` diventa il gate — un `case` rimasto su un membro inesistente e' un errore di tipo.

`src/lib/door/classify.ts` — `subjectType: DoorSubjectType` (`:79`), e i commenti `:82`, `:144-146`, `:267-273` descrivono il ramo membership. Legge `door_scan_events`: **vedi Open Question 1.**

### 2.6 Lo scanner client

| Sito | Riga | Azione |
|---|---|---|
| `MEMBERSHIP_PATTERN = /code=RSN-/i` | `:69` | esce |
| `BARE_MEMBERSHIP_PATTERN = /^RSN-[A-Z0-9]{6,10}$/i` | `:71` | esce |
| import di `findMember`, `checkInMemberLocally`, `rosterPredatesRole` | `:16`, `:18`, `:33` | escono |
| `rosterPredatesRoleRef` + l'effetto che lo popola | `:678`, `:784-796` | escono |
| blocco roster in `fetchAttendance` | `:1288-1330` | **esce per intero**, incluso l'avviso a `:1308-1313` che D-51-10 sostituisce |
| `type: "ticket" \| "membership" \| "guest"` | `:498` | si restringe |
| `membershipOnline()` | `:2243-2330` | esce |
| `membershipOffline()` | `:2333-2400` | esce |
| `memberName` / `readString(parsed,"member_name")` | `:2048`, `:2094-2095`, `:2112`, `:2283` | vedi §5 |
| dispatch dello scan sui due pattern | intorno a `:2040-2060` | il ramo che li riconosce esce: **D-51-01** — un `RSN-…` cade nello stesso rifiuto di un codice sconosciuto, senza messaggio dedicato |

---

## 3. La porta lato server, e le righe da cancellare

### 3.1 Chi scrive e chi legge `public.attendances` — misurato

```
/usr/bin/grep -rn 'from("attendances")' src/
  src/app/api/tickets/checkin/undo/route.ts:534   (SELECT id, party_id, event_id)
  src/app/api/tickets/checkin/undo/route.ts:560   (DELETE ... eq("id", attendanceId))
  src/app/api/membership/verify/route.ts:528      (INSERT)
  src/app/api/membership/verify/route.ts:562      (SELECT sul conflitto 23505)
```

**Quattro siti, due file, entrambi in uscita o da potare in questa fase.** `/api/tickets/checkin/route.ts` **non tocca `attendances`**: il check-in di un biglietto scrive `tickets.checked_in` e una riga in `door_scan_events`. Il ramo `membership` che il prompt di fase chiedeva di cercare in `checkin/route.ts` **non esiste**: le uniche occorrenze del termine li' sono commenti (`:172-173`, `:222`).

**Conseguenza da mettere in piano:** dopo questa fase `public.attendances` non ha piu' **ne' scrittori ne' lettori nel prodotto**. La tabella non si droppa (nessuna decisione lo autorizza), ma va **dichiarata come debito con il nome di chi lo chiude**, come la fase 50 ha fatto con `membership.card.view`.

### 3.2 Schema di `attendances`, e come identificare le righe da cancellare

Composto leggendo `schema.sql:231-248` + `20260805120000:232-256` + `20260808003000:178-180`:

| Colonna | Tipo | Provenienza |
|---|---|---|
| `id` | `uuid` PK, `gen_random_uuid()` | `schema.sql:232` |
| `event_id` | `uuid NOT NULL → events ON DELETE CASCADE` | `schema.sql:233` |
| `user_id` | `uuid NOT NULL → auth.users ON DELETE CASCADE` | `schema.sql:234` |
| `checked_in_at` | `timestamptz DEFAULT now()` | `schema.sql:235` |
| `checked_in_by` | `uuid → auth.users` (nullable; l'undo lo azzera) | `schema.sql:236` |
| `party_id` | `uuid → event_parties ON DELETE CASCADE`, **nullable** | `20260805120000:232-233` |
| `entry_role` | `text` nullable | `20260808003000:178-180` |

Indici: `attendances_party_user_unique` su `(party_id, user_id) WHERE party_id IS NOT NULL`, `attendances_event_user_unique` su `(event_id, user_id) WHERE party_id IS NULL`, `idx_attendances_party`. Il vincolo `unique(event_id, user_id)` originario e' stato droppato (`20260805120000:240-241`).

RLS: `attendances_select_own` (`auth.uid() = user_id`) e `attendances_all_admin` (`private.has_capability('staff.manage')`). Nessuna policy di `DELETE` separata: `FOR ALL`.

**Come distinguere le righe.** L'unico scrittore, `verify/route.ts:528-536`, scrive **sempre** `party_id: party.id` — mai NULL. Quindi:

- **`party_id IS NOT NULL` ⇒ scritta da una scansione socio.** E' l'insieme che D-51-04 autorizza a cancellare.
- **`party_id IS NULL` ⇒ residuo pre-porta.** `20260805120000:236-239` lo dice per esteso: *«Existing rows keep party_id NULL and therefore mean event-level … every attendance written before this migration was recorded against an event, because there was nothing else to record it against»*. **D-51-04 non le nomina.** Vanno contate a parte e messe davanti al proprietario come domanda distinta (Open Question 2), non incluse d'ufficio.

Non esiste una colonna di provenienza migliore: `entry_role` e' nullable e puo' essere NULL anche su una riga scritta dalla porta (`verify/route.ts:499-524` lo scrive NULL quando il dispositivo manda un valore non riconosciuto).

### 3.3 La cascata — enumerata dai vincoli, non ricordata

Cercato `references public.attendances`, `references attendances` e `attendance_id` come colonna in `supabase/` e `src/`: **zero riscontri** nello schema. Le due sole occorrenze di `attendance_id` sono nel **corpo JSON** di una risposta (`verify/route.ts:699`) e nella sua lettura (`ScannerClient.tsx:2290,2295`) — non una colonna.

**Quindi: nessuna tabella pende da `attendances` per chiave esterna, e la cascata in uscita e' vuota.** `attendances` **dipende da** `events`, `event_parties` e `auth.users`, ma quella e' la direzione opposta: cancellare righe di `attendances` non tocca nulla.

**Questo non toglie l'obbligo dell'istantanea** (`ai-engineering.md`, gate *un'istantanea prima copre cio' che si tocca*). Lo rende piccolo: l'istantanea e' `attendances` intera, e l'enumerazione della cascata **va rifatta dal catalogo vivo** (`pg_constraint` con `confrelid = 'public.attendances'::regclass`) **prima dell'atto**, non fidandosi di questo paragrafo — che e' letto dai file e i file trovano cio' che una migration ha scritto, non cio' che c'e'. E' la lezione che la fase 50 ha imparato con le sei funzioni contro le quattro in elenco.

### 3.4 La forma dell'atto (D-51-04)

Vincolata da `ai-engineering.md`, e va scritta nel piano passo per passo:

1. **Conteggio dal catalogo**, laboratorio e produzione separatamente: `select count(*) filter (where party_id is not null) as da_porta, count(*) filter (where party_id is null) as pre_porta from public.attendances;`
2. **Enumerazione della cascata dal catalogo**, non da questo documento.
3. **Istantanea** di `public.attendances` intera, in un file datato, **prima** di qualunque scrittura.
4. **Cattura della lista di `id`** con la stessa query che li conta.
5. **Autorizzazione datata del proprietario**, con i numeri veri davanti — non `N` — e che nomina l'atto e lo strumento. Si consuma una volta e si dichiara esaurita.
6. **`DELETE … WHERE id = ANY($1)`** sulla lista catturata. **Mai per interfaccia, mai per predicato ricomposto al momento dell'atto.** Il verso dell'errore e' il punto: una chiave sbagliata non trova nulla, un predicato sbagliato cancella di piu'.
7. **Conferma da una fonte diversa da quella su cui si e' agito**: se l'atto e' passato dal Management API, il conteggio di controllo si prende da PostgREST con la chiave di servizio.

---

## 4. Le migration — cosa tocca cosa

### 4.1 La forma, misurata dalla fase 50 e da non re-misurare

`20260921120000_drop_status_and_referral.sql` e' il modello, e porta tre fatti gia' verificati sul laboratorio il 2026-09-21 alle 12:35:43Z che **valgono ancora e non vanno riprovati**:

- **`POST /v1/projects/{ref}/database/migrations` avvolge il corpo in UNA transazione da solo.** Sonda: `create table private._tx_probe(x int)` seguita da `select 1/0` → `400 division by zero`, e `to_regclass('private._tx_probe')` subito dopo era `null`. **Quindi niente `BEGIN;` esplicito nel file** — produrrebbe `WARNING: there is already a transaction in progress` e un `COMMIT` che chiude a meta' la transazione dell'endpoint. **[VERIFIED: 20260921120000:42-55]**
- **L'endpoint da usare e' `migrations`, non `/database/query`**, o la history del progetto mente. **[VERIFIED: STATE.md:642-644]**
- **`SUPABASE_ACCESS_TOKEN` e' in `.env.local`**; `LAB_PROJECT_REF`, `LAB_SUPABASE_SERVICE_ROLE_KEY` e `LAB_DB_PASSWORD` sono in `.env.lab.local` (ignorato da git). **[VERIFIED: nomi di variabile letti, valori mai]**
- **Ogni script di laboratorio rifiuta il ref di produzione come prima riga eseguita**: il precedente e' `scripts/seed-lab-door.mjs:76-90`, `scripts/lab-bootstrap.mjs:43-51`, `scripts/dev-lab.sh:9-17`. Uno script nuovo senza quel rifiuto non e' uno script di laboratorio.

### 4.2 `member` → `attendee` (D-51-06)

**I vincoli VIVI sono due, non tre.** Il contesto ne nomina tre; due dei tre sono **storici** e riscritti da un file successivo:

| Sito | Stato | Vincolo |
|---|---|---|
| `20260224_rbac_migration.sql:15` | **superato** | il `CHECK` anonimo creato con la colonna |
| `20260807000000_capability_model.sql:121` | **superato** | `role_capabilities` col `CHECK` inline |
| `20260808000500_staff_role.sql:74-76` | **VIVO** | `profiles_role_check` — `CHECK (role IN ('master','organizer','staff','member'))` |
| `20260808000500_staff_role.sql:99-101` | **VIVO** | `role_capabilities_role_check` — stesso insieme |

La migration nuova segue lo stesso pattern di `20260808000500` (che e' il modello dichiarato): `DROP CONSTRAINT IF EXISTS <nome>` + `ADD CONSTRAINT <stesso nome>` con l'insieme nuovo, **sui due vincoli, piu' l'`UPDATE` delle righe, in un solo file**. Il file `20260808000500:88-94` spiega perche' i due non possono essere due migration: *«all three statements share one transaction, that refusal aborts the whole file and nothing is applied … the failure mode being designed against is the other one: two separate migrations, the first applied and the second not, and a production database that admits a role holding no capabilities at all»*.

**L'ordine dentro il file conta.** I `CHECK` ammettono il nuovo valore **prima** che l'`UPDATE` lo scriva:
1. `profiles_role_check` → `('master','organizer','staff','attendee')` *(vedi nota sul valore transitorio)*
2. `role_capabilities_role_check` → idem
3. `UPDATE private.role_capabilities SET role = 'attendee' WHERE role = 'member';`
4. `UPDATE public.profiles SET role = 'attendee' WHERE role = 'member';`
5. `ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'attendee';` — **da non dimenticare**: il `DEFAULT 'member'` e' stato posato da `20260224:14` e non e' mai stato rimosso.

> **Nota sul valore transitorio.** Se il `CHECK` nuovo ammette **solo** i quattro nuovi valori, gli `UPDATE` vanno dopo — ma un `ALTER TABLE … ADD CONSTRAINT` **valida le righe esistenti**, e le righe hanno ancora `'member'`: il vincolo verrebbe rifiutato con `23514`. Le due strade pulite: **(a)** il `CHECK` nuovo elenca cinque valori in un primo `ALTER`, si fanno gli `UPDATE`, poi un secondo `ALTER` stringe a quattro; **(b)** `ADD CONSTRAINT … NOT VALID`, `UPDATE`, `VALIDATE CONSTRAINT`. **(a) e' la forma che questo repo gia' scrive** (due `ALTER` per vincolo, nomi espliciti) ed e' leggibile da chi legge il file senza conoscere `NOT VALID`. **Va provata sul laboratorio prima**, perche' e' l'unico punto della migration che puo' fallire per una ragione di dati.

**Chi legge il valore in SQL.** `private.role_capabilities.role` fa join su `public.profiles.role` in `private.has_capability` (`20260921120000:409-415`): e' un confronto di valori, non un'enumerazione dentro la funzione. **Verificato: nessuna funzione e nessuna policy contiene il letterale `'member'` nel proprio corpo vivo** — l'unica ricorrenza nel file della fase 50 e' `20260921120000:837` dentro `handle_new_user`, dove il ruolo e' **cablato**:

> *«Il ruolo resta CABLATO a member e non si legge dai metadati di createUser»* (`:880`, commento della funzione)

`handle_new_user` va quindi **ridefinita nello stesso file** (e di nuovo per intero: `CREATE OR REPLACE` sostituisce il corpo). Il che si incastra con §4.4, che la deve ridefinire comunque.

**I nove file di codice** (otto piu' `roles.ts`):

| File | Riga | Cambio |
|---|---|---|
| `src/types/database.ts` | `:99` | `UserRole = "master" \| "organizer" \| "staff" \| "attendee"` |
| `src/lib/rbac/roles.ts` | `:105` | `MEMBER: "member"` → `ATTENDEE: "attendee"` (la costante non ha consumatori: `ROLES.MEMBER` ha **zero** riscontri nel repo) |
| `src/app/(members)/dashboard/page.tsx` | `:208`, `:350` | `=== "member"`, `role ?? "member"` |
| `src/app/(admin)/admin/members/actions.ts` | `:610` (commento), `:965` `WritableRole` | |
| `src/app/(admin)/admin/members/CreateAccountForm.tsx` | `:165`, `:182`, `:199` | valore e etichetta del menu |
| `src/components/admin/MemberTable.tsx` | `:405`, `:453`, `:481`, `:501`, `:742` | |
| `src/lib/supabase/middleware.ts` | `:417` (solo commento) | |
| `src/lib/membership/acts.ts` | `:65` (solo commento) | |
| `src/lib/offline/checkin-store.ts` | `:169` (commento su `MemberRecord`) | esce con lo store |

**E cinque script, di cui uno gira contro un database vivo:**

| Script | Riga | Nota |
|---|---|---|
| `scripts/verify-refusal.mjs` | `:459` `.eq("role","member")` | **query viva.** Se non cambia nello stesso atto, il gate fa `refuse()` (uscita **2**, *«no member profile could be resolved»*) appena la migration passa |
| `scripts/rls-baseline.mjs` | `:669` `PERSONA_ROLES`, `:702` personas di produzione, `:741` `where role in (…)`, `:1133` `'membership'` | |
| `scripts/verify-capabilities.mjs` | chiavi di `ROLE_GRANTS` | §4.3 |
| `scripts/container/seed.mjs`, `scripts/seed-lab-door.mjs` | | i banchi |

**L'etichetta visibile.** `CreateAccountForm.tsx:165` mostra `label: "Member"`; `MemberTable.tsx:742` `<option value="member">Member</option>`. Il testo che vede un organizer e' discrezione del piano; il **valore** e' `attendee`.

### 4.3 Le due chiavi di capability (D-51-07)

| Chiave | Dov'e' | Chi la usa |
|---|---|---|
| `membership.active` | `keys.ts:300`, `CAP_DESCRIPTIONS` `:395`, `capability-routes.ts:485-489` (`scope: "table"`) | **nessun lettore di codice vivo** — solo commenti. Le sue quattro concessioni sono gia' state cancellate dalla fase 50; la **chiave** e' rimasta nel catalogo apposta, perche' `verify:capabilities` sarebbe diventata rossa (D-50-28) |
| `membership.card.view` | `keys.ts:316`, `CAP_DESCRIPTIONS` `:401-402`, `capability-routes.ts:411-413` (`routes: ["/membership-card","/attendance"]`), `attendance/page.tsx:63` (commento) | concessa a **tutti e quattro** i ruoli |

**In SQL.** Le concessioni stanno in `private.role_capabilities`, il cui `capability` e' `text not null references private.capabilities(key) on delete cascade` (`20260807000000:122`). **Quindi `DELETE FROM private.capabilities WHERE key IN ('membership.active','membership.card.view')` cancella anche le concessioni, per cascata dichiarata.** Le cancellazioni esplicite in due passi sono comunque piu' leggibili e sono il pattern della casa.

**I numeri di `verify-capabilities.mjs`, che vanno mossi nello stesso commit:**

| Costante | Riga | Oggi | Dopo | Come |
|---|---|---|---|---|
| `EXPECTED_KEY_COUNT` | `:232` | 17 | **15** | 17 − 2 |
| `EXPECTED_PAIR_COUNT` | `:700` | 68 | **60** | 4 ruoli × 15 |
| `EXPECTED_GRANT_COUNT` | `:701` | 32 | **28** | −4 (`membership.card.view` GRANTED su 4 ruoli: `:337,417,515,593`) |
| `EXPECTED_REFUSAL_COUNT` | `:702` | 36 | **32** | −4 (`membership.active` REFUSED su 4: `:312,408,494,587`) |

Piu' le otto righe da togliere da `ROLE_GRANTS` e le chiavi dei quattro blocchi di ruolo (`member` → `attendee`). Il docblock `:202-232` chiede che ogni movimento di `EXPECTED_KEY_COUNT` porti la propria riga di storia: **il piano scriva la riga, non solo il numero.**

### 4.4 `profiles.membership_code` (D-51-02)

**Dipendenze registrate e non registrate, misurate:**

| Dipendenza | Dove | Natura | Cosa comporta |
|---|---|---|---|
| `public.record_membership_act` | corpo vivo a `20260921120000:571-611`, legge `p.membership_code` (`:572`) e lo scrive in `subject_label` (`:606`) | **`plpgsql` — dipendenza NON registrata** | il `DROP COLUMN` **riesce** e la funzione si rompe in silenzio, portandosi dietro `createAccount` (`actions.ts:794`). **Va ridefinita nello stesso file e nella stessa transazione.** |
| `public.handle_new_user` | corpo vivo a `20260921120000:820-878` | `plpgsql`, `SECURITY DEFINER` | conia il codice con `extensions.gen_random_bytes(10)`, cinque tentativi sulla sola collisione, e lo nomina nell'`INSERT` (`:845`). **Va riscritta per intero** senza il conio |
| `profiles_membership_code_key` | vincolo `UNIQUE` sulla colonna, nominato a `20260921120000:857` | registrata | cade con la colonna |
| `COMMENT ON FUNCTION public.handle_new_user()` | `20260921120000:879-880` | | va riscritto: descrive un conio che non esiste piu' |
| lettori applicativi | `dashboard/page.tsx:187`, `membership-card/page.tsx:90`, `membership/verify/route.ts:133,389`, `membership/list/route.ts:89`, `admin/members/actions.ts:927,1670`, `(work)/members/page.tsx:105,142`, `MemberTable.tsx:72,625`, `(work)/events/[id]/assignments/page.tsx:63,171`, `assignments/AssignmentsClient.tsx:55,283,361` | | vedi sotto |

**`subject_label` e' `NOT NULL`** (`20260808002000:203`) e il suo commento dice *«reads this value from `public.profiles.membership_code` and nothing else»*, con la regola: **mai un nome, mai un indirizzo** — la riga puo' finire in uno screenshot e il repo e' pubblico. Con la colonna che sparisce, la funzione deve scrivere qualcosa. **Open Question 3.**

**La ricaduta sulle superfici di lavoro, che va messa davanti al proprietario.** Oggi `AssignmentsClient.tsx:283,361` mostra il codice socio **accanto al nome** come disambiguatore fra due persone omonime nella scelta di chi lavora una serata, e `MemberTable.tsx:625` lo mostra in colonna. Cancellando la colonna quelle superfici perdono l'appiglio. Non e' un blocco — e' una conseguenza da dichiarare, e il sostituto naturale (le prime cifre dell'uuid) non e' PII e non e' una credenziale.

### 4.5 `membership_acts` → `account_acts` (D-51-08)

Oggetti da rinominare, letti dalle migration:

| Oggetto | Definito a | Nota |
|---|---|---|
| tabella `public.membership_acts` | `20260808002000:~180-282` | `ALTER TABLE … RENAME TO account_acts` |
| `membership_acts_actor_attributed` (CHECK) | `:228-231` | il rename di tabella **non** rinomina i vincoli: `ALTER TABLE … RENAME CONSTRAINT` |
| `membership_acts_act_check` (CHECK) | ridefinito da ultimo a `20260921120000:907-925` | idem |
| `idx_membership_acts_subject` | `:289-290` | `ALTER INDEX … RENAME TO` |
| `idx_membership_acts_actor` | `:296-297` | idem |
| policy `membership_acts_select_register_read` | `:325-334` | `ALTER POLICY … RENAME TO` |
| `REVOKE INSERT,UPDATE,DELETE` / `GRANT SELECT` | `20260808005000:139-145` | i privilegi seguono la tabella; **da rileggere dal catalogo dopo** |
| `COMMENT ON TABLE` | `20260808005000:147` | da riscrivere |
| funzione `public.record_membership_act(8 arg)` | `20260921120000:551-615` | `ALTER FUNCTION … RENAME TO record_account_act` **oppure** `CREATE … / DROP` — il rename conserva l'ACL e la `SECURITY DEFINER`, ed e' la strada |
| `public.record_party_assignment_act` | `20260809002000:~450` | **chiama** la funzione sopra (`acts.ts:86`): va ridefinita se il nome cambia |
| `public.reconcile_master(text)` | `20260921120000:~617+` | idem — gira a ogni deploy |
| `private.has_capability`, `my_access_context()` e `(uuid)` | | **non** toccano il registro: verificato leggendo i corpi nella migration 50 |

**⚠ La lezione della fase 50 va applicata qui, non citata.** `20260921120000:94-112`: *«Un elenco letto dai file trova cio' che una migration ha scritto; solo il catalogo trova cio' che c'e'»*. **La tabella qui sopra e' letta dai file.** Prima di scrivere la migration il piano deve interrogare il laboratorio: `pg_proc` con `pg_get_functiondef` filtrato su `prokind='f'` per i nomi `membership_acts`, `membership_code`, `record_membership_act`; `pg_policies`; `pg_constraint`; `pg_indexes`. Il numero atteso e' quello della tabella; il numero vero lo dice il catalogo.

**Lato TypeScript:** `MembershipActRow` (`database.ts:941`), `MembershipAct` e `MembershipActorKind` (`acts.ts:96,117`), il modulo `src/lib/membership/acts.ts` → `src/lib/account/acts.ts`, `.from("membership_acts")` (`(work)/members/register/page.tsx:226`), `.rpc("record_membership_act", …)` (`admin/members/actions.ts:794`), `MEMBERSHIP_ACT_COLUMNS` (`register/page.tsx:93`), `scripts/rls-baseline.mjs:1373` (la voce `membership_acts` del probe), `src/lib/email-delivery/categories.ts:77` (solo commento).

---

## 5. Lo schermo della porta (D-51-05)

### 5.1 Il velo dell'esito — trovato

`src/components/scanner/ScanFlash.tsx` (180 righe). Tre sfondi, tutti **al 90%**:

| Riga | Stato | Classe |
|---|---|---|
| `:97` | `success` | `bg-green-500/90` |
| `:110` | `already_recorded` | `bg-sem-done/90` |
| `:125` | `error` | `bg-red-600/90` |

Il contenitore: `:154` `fixed inset-0 z-[70] flex flex-col items-center justify-center ${state.bg}`.

**La riparazione e' togliere `/90`.** E' cio' che «zona dell'esito opaca» significa: a 90% il testo *«Scanner paused»* e le righe della lista traspaiono, che e' esattamente cio' che il proprietario ha visto. La modifica e' di tre caratteri per riga, per tre righe, e non tocca alcuna decisione di ammissione — ma tocca il file piu' critico del prodotto per leggibilita' alla porta. Esiste gia' un gate che misura quella leggibilita': **`npm run verify:scan-legibility`**, che va lanciato dopo.

### 5.2 Il nome nell'esito — i punti che lo rendono

`ScanFlash` riceve `title` e `subtitle` (`:26,27`), rende `title` grande a `:163-165` e `subtitle` piccolo a `:168-172`. **Il nome arriva come `title`**, dai chiamanti di `showFlash` (`ScannerClient.tsx:1621`):

| Riga | Chiamata | Cosa passa come titolo |
|---|---|---|
| `:2048-2066` | ticket online | `readSubjectLabel(parsed) ?? readString(parsed,"member_name")`, fallback `"Ticket holder"` / `"Admitted"` |
| `:2094-2101` | ticket gia' registrato | idem, fallback `"Ticket holder"` |
| `:2112` | | `readString(parsed, "member_name")` |
| `:2153-2157`, `:2170`, `:2186-2190` | percorso **offline**, da `cached.name` | e' il punto che `deferred-items` §7 nomina come `:2186` |
| `:2283-2306` | membership | esce con il ramo |

E `readSubjectLabel` (`:207`) legge `subject.label` dalla risposta, che il server mette li' (`outcome.ts:66-68`: *«`label` is a display name for the prose path only»*).

**Dove tagliare, e perche' li'.** Ci sono tre livelli possibili e uno solo e' giusto:

1. **Nella rotta** (`attendance/route.ts:814-864` smette di leggere `profiles.full_name`) — **NO**: il nome serve alla **lista** della serata, dove lo staff cerca per nome un invitato senza QR. Toglierlo li' rompe D-51-10.
2. **Nella coda offline** (`checkin-store.ts:786-789` smette di conservare `name`) — **NO**, per lo stesso motivo: la lista offline e' la stessa struttura.
3. **Nel `title` di `ScanFlash`** — **SI'.** L'esito mostra *esito + tipo di biglietto*; il nome resta nella lista e nella cronologia degli scan (`:3384` `{record.name}`, `:3435` `{a.name}`), che sono liste consultate, non un verdetto lampeggiante su una persona davanti a una fila.

**Cosa metterci al posto.** `D-51-05` dice «esito e tipo di biglietto». Il tipo c'e' gia': il `subtitle` di `P-50-8` passo 4 era **«RSVP · Offline»**, e `ticketType` vale `"purchased"`, `"guest_list"` o l'etichetta del tier (`attendance/route.ts:871,893`). Forma raccomandata: **titolo = l'esito** (`Admitted` / `Already recorded` / il motivo del rifiuto), **sottotitolo = tipo + provenienza**. Il rifiuto ha gia' il proprio vocabolario totale in `NOT_VALID_MESSAGE` (`ScannerClient.tsx`) e `NOT_VALID_REASONS` (`sync-manager.ts`), entrambi `Record` totali su `DoorNotValidReason` (`outcome.ts:92-97`) — **quindi si riusano, non si riscrivono**.

**Il caso `already_recorded` merita una riga a parte.** Oggi il secondo scan mostra *«Recorded at 18:01 by this device»* (`P-50-8` passo 5), che e' un **fatto**, non un giudizio, ed e' l'unico appiglio dello staff per capire se le due letture sono la stessa persona o due. `deferred-items` §7 lo dice esplicitamente fra i costi della strada 1: *«toglie allo staff l'unico appiglio che oggi ha per distinguere due letture ravvicinate davanti a una fila»*. **Il fatto — ora e dispositivo/operatore — resta**; e' il **nome** che esce. Da scrivere nel piano, o qualcuno lo togliera' con il nome.

### 5.3 L'intestazione che scorre via — misurato, e non e' «manca `sticky`»

`ScannerClient.tsx:2802` dichiara **gia'**:

```
<div className="sticky top-0 z-10 bg-ground px-6 pt-6 pb-3">
```

**Quel `div` si chiude alla riga 3156** — 355 righe di JSX. Dentro ci sono, nell'ordine: il titolo della serata e il pulsante «QR Scan» (`:2804-2899`), l'avviso di serata finita (`:2903-2916`), le pastiglie di stato (`:2945-2995`), l'avviso di deriva dell'orologio (`:3004`), il contatore di check-in (`:3046-3066`), il campo di ricerca (`:3115`) e le tre linguette di filtro (`:3140-3155`).

**Un elemento `position: sticky` piu' alto della finestra non pinna il proprio contenuto: pinna il proprio bordo superiore, e tutto cio' che sta sopra il bordo della finestra scorre via.** Su un telefono, quel blocco e' piu' alto della finestra: quindi **titolo e pulsante escono dalla vista mentre la lista scorre**, ed e' precisamente cio' che il proprietario ha osservato in tre schermate su quattro.

**La riparazione e' strutturale, non una classe in piu'.** Il blocco si spezza in due: una **barra sottile fissa** (titolo della serata + pulsante «QR Scan», e nient'altro) e un **resto che scorre**. Cosa mettere nella barra fissa e cosa no e' una scelta di piano; il criterio che la decide e' l'altezza: **la parte fissa deve stare comodamente dentro la finestra di un telefono**, o si riproduce lo stesso difetto con meno righe.

Non ho trovato contenitori con `overflow` sopra (nessun `layout.tsx` sotto `(admin)`; `src/app/layout.tsx:118` e' `body className="min-h-dvh antialiased"`), quindi l'altra causa classica — un antenato che scorre e annulla lo `sticky` — **non c'e'**. `viewportFit` non e' dichiarato in `src/app/layout.tsx:81-83`, quindi in standalone su iOS il contenuto resta dentro la safe area: **non e' un problema di notch**. L'altezza e' la spiegazione che regge la misura.

> **Da verificare sul dispositivo, non dedurre:** questa e' la causa che il codice sostiene. `P-51-1` passo 2 la conferma o la smentisce guardando lo schermo — che e' il modo in cui e' stata trovata.

---

## 6. I gate che arrossiscono, e cosa li spegne

| Gate | Perche' scatta | Cosa lo rimette verde |
|---|---|---|
| `npm run build` | le union `QueuedSubjectType`, `DoorSubjectType`, `UserRole` si restringono; i `Record` totali e gli `switch` diventano errori di tipo | e' il gate **desiderato**: guida la potatura |
| `npm run verify:routes` | [3/3] pretende che ogni `PROTECTED_PREFIXES` risolva via `resolveNext` **senza sostituzione** (`:515-560`) | `PROTECTED_PREFIXES` e `NEXT_ALLOW_LIST` cambiano insieme, e `/account` entra in entrambi |
| `npm run verify:conversion` | controlli D/E/F leggono i file di pagina dichiarati nel manifest | tre entry: `/attendance` e `/membership-card` **cancellate**, `/dashboard` **rinominata** a `/account` con il nuovo percorso file, **nello stesso commit** |
| `npm run verify:capabilities` | quattro costanti numeriche + `ROLE_GRANTS` + `DECLARED_ROLES` contro il catalogo **vivo** | §4.3. **Gira contro un database**: passa dopo la migration, non prima |
| `npm run verify:refusal` | `:459` `.eq("role","member")` → nessun profilo risolto → `refuse()`, uscita **2** | `"attendee"`, nello stesso atto della migration |
| `npm run verify:persona` **controllo A** | `.claude/rules/checkin-offline.md:5` dichiara `src/app/api/membership/**`; cancellando `verify/route.ts` e `list/route.ts` la directory sparisce e **il glob non matcha piu' alcun file** → path morto (`verify-persona.mjs:263-270`) | togliere il glob dal frontmatter **e** dalla riga d'indice di `CLAUDE.md` **e** dalla riga di `meta-gates.md` |
| `npm run verify:persona` **controllo B** | pretende che frontmatter e riga d'indice dichiarino **lo stesso insieme** di glob (`:273-287`) | i due si editano insieme |
| `npm run verify:persona` **controllo G** | la tabella di priorita' di `meta-gates.md` deve descrivere un routing reale | la riga `src/app/api/membership/**` → `checkin-offline` esce |
| `npm run verify:persona` **controllo E** | budget di contesto, tetto **15000** token (`:89`), caso peggiore `ScannerClient.tsx` | la rimozione **restringe**: va rimisurata e il numero riportato nel changelog (`ai-engineering.md`, gate *context budget*) |
| `npm run verify:scan-legibility` | tocca `ScanFlash.tsx` e la testata dello scanner | da lanciare dopo §5 |
| `npm run baseline:rls` / `baseline:compare` | `PERSONA_ROLES` e la voce `membership_acts` del probe | §4.2 e §4.5 |
| `npm run verify` | l'aggregatore | ultimo |

**E il quinto obbligo di `ai-engineering.md` che nessuno script copre:** semver + changelog in `.claude/CHANGELOG.md`, piu' lo **scenario di carico-e-scatto** per ogni modulo modificato (un file reale nel suo scope, quali moduli si caricano, quale gate scatta). Va scritto nel commit della persona, non dedotto.

---

## 7. Don't Hand-Roll

| Problema | Non costruire | Usa invece | Perche' |
|---|---|---|---|
| Redirect permanente `/dashboard` → `/account` | una `page.tsx` che chiama `permanentRedirect` | la voce in `next.config.ts` `redirects()` | misurato: i source dei redirect entrano in `typedRoutes` (`.next/types/routes.d.ts:8`), quindi i ~40 `redirect("/dashboard")` compilano senza toccarli, e il 308 arriva prima del middleware |
| Portare la guest list offline | una rotta `/api/guest-list/*` nuova | `/api/tickets/attendance`, che gia' la porta | `attendance/route.ts:698-703, 876-895`. Una seconda rotta sarebbe una seconda cosa da tenere allineata su un percorso senza rete |
| «La lista e' vecchia» | un flag booleano nuovo | `lastFetchAtRef` / `listAgeMs` / `listIsStale`, gia' scritti e gia' commentati (`ScannerClient.tsx:1042, 2643, 2666`) | un avviso derivato non puo' restare acceso quando la cosa che descrive e' falsa — e' il difetto che D-51-10 chiude |
| Migrazione dello schema IndexedDB | un rebuild one-shot | un blocco `if (oldVersion < 6)` proprio, come i passi 3/4/5 | `checkin-store.ts:33-38`: *«the upgrade callback is cumulative, and no step may undo an earlier one»* |
| Il vocabolario dei rifiuti alla porta | stringhe nuove | `NOT_VALID_MESSAGE` e `NOT_VALID_REASONS`, `Record` totali su `DoorNotValidReason` | `outcome.ts:70-97` — sono totali apposta, cosi' un membro nuovo dell'union e' un errore di build in entrambi |
| Rinomina di funzione SQL | `DROP` + `CREATE` | `ALTER FUNCTION … RENAME TO` | conserva ACL e `SECURITY DEFINER`; lo stesso motivo per cui la fase 50 usa `CREATE OR REPLACE` su firma identica (`20260921120000:89-90`) |
| Cancellazione in produzione | un `DELETE … WHERE <predicato>` composto al momento | `DELETE … WHERE id = ANY($lista_catturata)` | `ai-engineering.md`, gate *una rimozione si fa per chiave*: il verso dell'errore e' il punto |

**Chiave di lettura:** in questa fase quasi tutto e' **sottrazione**, e la tentazione tipica della sottrazione e' compensare con una costruzione («allora mi serve una rotta nuova / un flag nuovo / un messaggio nuovo»). Ognuna delle sei righe qui sopra e' un posto dove il prodotto **ha gia'** cio' che serve, e costruirci accanto un secondo esemplare produrrebbe due verita' che divergono al primo cambiamento — su un percorso che la porta usa quando non c'e' rete.

---

## 8. Validation Architecture

### Test Framework

| Proprieta' | Valore |
|---|---|
| Framework | **nessuno.** `package.json:5-44` non ha script `test`; zero file `*.test.*` / `*.spec.*` |
| File di configurazione | nessuno — e Wave 0 **non ne introduce uno**: costruire una suite non e' in questa fase e non e' in `.planning/` |
| Comando rapido | `npm run build` (e' anche il typecheck: non esiste script `typecheck`) |
| Suite completa | `npm run verify` (`scripts/verify-all.mjs`, 30 gate) + `npm run build` |

### Requisiti → prova

| Req | Comportamento | Tipo | Comando automatico | Esiste? |
|---|---|---|---|---|
| MEM-01 | la rotta non esiste, la capability non e' nel catalogo, il manifest non la dichiara | statico | `npm run build && npm run verify:routes && npm run verify:conversion && npm run verify:capabilities` | ✅ |
| MEM-01 | l'indirizzo risponde 404 | **manuale** | `curl -s -o /dev/null -w '%{http_code}' https://lab…/membership-card` | ✅ (curl) |
| MEM-02 | la pagina non esiste; le righe sono contate e cancellate | statico + **atto datato** | `verify:routes`, `verify:conversion`; poi il conteggio dal catalogo, §3.4 | parziale — l'atto non e' automatizzabile e non deve esserlo |
| MEM-03 | la rotta, la regola del service worker e il ramo della coda non esistono | statico | `npm run build`; `/usr/bin/grep -rn "api/membership" src/ public/sw.js` deve tornare **0** dopo il build | ✅ |
| MEM-03 | una coda con una voce `membership` sopravvive all'aggiornamento **scartando solo quella** | **manuale, su dispositivo** | — | ❌ → `P-51-1` |
| MEM-04 | la porta ammette un biglietto valido a radio spenta, prima e dopo | **manuale, su dispositivo, dal proprietario** | — | ❌ → `P-51-1` |
| D-51-05 | l'esito non mostra nome, e' opaco, la testata resta fissa | **visivo** | `npm run verify:scan-legibility` per la leggibilita'; il resto e' schermata | parziale |
| D-51-06 | il ruolo e' `attendee` ovunque | statico + vivo | `npm run build`; `verify:refusal`; `verify:capabilities`; `baseline:compare` | ✅ |

### Frequenza di campionamento

- **Per commit:** `npm run build`, piu' il gate specifico del file toccato (`verify:persona` se hai toccato la persona; `verify:routes` se hai toccato una mappa; `verify:conversion` se hai toccato il manifest).
- **Per onda:** `npm run verify` intero.
- **Cancello di fase:** `npm run verify` + `npm run build` verdi, **e** `P-51-1` percorsa con esito datato nel VERIFICATION.

### Lacune di Wave 0

Nessun file di test da creare — la lacuna non e' un file, e' una **procedura**, e va scritta prima di essere percorsa:

- [ ] `P-51-1` — la porta a radio spenta, **prima e dopo**, sul laboratorio, dal proprietario (D-51-12). Forma in §8.1.
- [ ] La procedura di cancellazione in produzione, con il conteggio, l'istantanea e la richiesta d'autorizzazione (§3.4).
- [ ] La procedura di applicazione delle migration sul laboratorio, che riusa il rifiuto del ref di produzione.

### 8.1 `P-51-1` — la forma, copiata da `P-50-8`

`P-50-8` (`50-ESITI.md`) e' l'unico precedente e la sua forma e' il modello: **sei passi numerati, ognuno con il ruolo che lo esegue, cosa si deve osservare, e una colonna «cosa si e' visto» che si riempie percorrendo** — mai in anticipo. Piu' la rilettura dal catalogo, che e' *«la meta' che lo schermo non da'»*. Piu' una dichiarazione, in testa, che la modalita' aereo era vera: `P-50-8` la prova con **l'icona dell'aeroplano nella barra di stato e l'assenza di qualunque indicatore di rete dati o wi-fi**, e dice perche' il solo wi-fi spento renderebbe la prova inutile.

**Il «prima e dopo» che MEM-04 pretende, in concreto:**

- **Prima** = **sul codice attuale**, prima del deploy della fase, per stabilire la linea di partenza sulla stessa serata di prova. E' la corsa che dice cosa faceva la porta.
- **Dopo** = sul codice della fase, **stessa serata, stesso dispositivo, stesso biglietto o uno coniato allo stesso modo**.

**I passi che questa fase aggiunge a quelli di `P-50-8`:**

1. Aprire la porta **con la rete accesa** e lasciarla precaricare — la lista scaricata deve contenere **anche gli invitati di guest list senza email**, e si controlla che ci siano, per nome, nella ricerca.
2. **Modalita' aereo.** L'avviso della lista dice **«guest list»** e **non e' acceso** se la lista e' fresca (D-51-10: si accende solo quando e' vero).
3. Scansionare un biglietto valido → **accettato**, schermo **opaco**, titolo = esito, sottotitolo = tipo, **nessun nome**.
4. Scansionare lo stesso biglietto di nuovo → **non rifiutato**, schermo ambra, **il fatto** (ora + dispositivo) presente, **il nome no**.
5. Far entrare **un invitato di guest list senza email, per nome, dalla lista**, sempre a radio spenta → accettato, entra in coda.
6. **Scorrere la lista**: titolo e pulsante «QR Scan» **restano in vista**.
7. Riaccendere la rete → la coda si drena, i contatori si muovono, la pastiglia «Pending» sparisce.
8. **La rilettura dal catalogo**: `door_scan_events` per il biglietto del passo 3 deve avere **una riga e una sola**; la voce di guest list del passo 5 deve risultare `checked_in`.
9. **Il passo proprio di D-51-11**, da fare su un dispositivo che portava **gia'** una voce `membership` in coda: dopo l'aggiornamento, quella voce non c'e' piu', **le voci `ticket` e `guest` ci sono ancora**, e nella console c'e' **una riga sola** con categoria e conteggio.

---

## 9. Security Domain

### Categorie ASVS applicabili

| Categoria | Si applica | Controllo standard, in questo repo |
|---|---|---|
| V2 Autenticazione | si' | Supabase Auth. **Questa fase non la tocca.** Il signup pubblico e' gia' spento (fase 50) |
| V3 Sessione | no | nessuna modifica |
| V4 Controllo d'accesso | **si', ed e' il cuore** | il confine e' la **RLS** nelle migration; il middleware e' UX. Togliere righe dalla mappa delle rotte **non espone nulla**: espone solo se si tocca una policy, e questa fase non ne tocca nessuna oltre alla rinomina di `membership_acts_select_register_read` |
| V5 Validazione input | si' | `resolveNext` (`next-redirect.ts:184-205`) e' un filtro di destinazione su allow-list ancorata: **aggiungere `/account` e' una decisione d'accesso**, e il file lo dice. Il pattern nuovo deve essere ancorato a entrambi i capi e senza `.*` |
| V6 Crittografia | si', **in sottrazione** | `extensions.gen_random_bytes(10)` conia il codice socio (2^50). Toglierlo **riduce** la superficie: una credenziale che nessuna porta verifica e' una credenziale che puo' solo trapelare |
| V7 Log e gestione errori | si' | zero fallimenti silenziosi. Il `console.warn` di D-51-11 e' il minimo, e va con **categoria e conteggio** |
| V8 Protezione dei dati | **si'** | il roster che sparisce portava *«every full name and membership code»* su ogni telefono che poteva lavorare una porta (`sw.ts:24-26`). **Questa fase riduce l'esposizione.** Il nome che esce dallo schermo dell'esito va nella stessa direzione |

### Modelli di minaccia per questo stack

| Modello | STRIDE | Mitigazione |
|---|---|---|
| Un `DROP COLUMN` rompe in silenzio una funzione `plpgsql` → nessuno puo' creare un account | Denial of Service | **una sola transazione** con la ridefinizione delle funzioni; precedente e ragione in `20260921120000:109-112` |
| Un aggiornamento di schema IndexedDB abbandona una coda non vuota → ammissioni perse, senza nessuno che se ne accorga | Repudiation | il passo v6 tocca **solo** le voci `membership`, per chiave; `ticket` e `guest` intatti; provato su dispositivo con coda non vuota (`P-51-1` passo 9) |
| Una regola `NetworkOnly` tolta per errore fa risolvere la lista della porta da una copia vecchia di un giorno mentre il badge dice «Online» | Tampering | le due regole che restano si verificano **sull'output** `public/sw.js`, non sul diff |
| Un `DELETE` in produzione per predicato invece che per chiave cancella di piu' | Tampering | §3.4; il precedente costato 63 righe in sette tabelle e' in `ai-engineering.md` |
| Un 308 su `/dashboard` non si ritira dalle cache dei browser | — | disposizione `accept`, dichiarata, come `T-50-28` |
| Un allow-list di redirect allargato con un pattern non ancorato riapre un open redirect su un flusso autenticato | Spoofing | `/^\/account$/`, ancorato a entrambi i capi, nessun `.*` |
| Un ruolo rinominato mentre una policy ne legge il letterale | Elevation of Privilege | **verificato: nessuna policy e nessuna funzione contiene `'member'` nel corpo vivo**; il join e' su valore (`role_capabilities.role = profiles.role`), e l'`UPDATE` li muove insieme nella stessa transazione |

---

## 10. Environment Availability

| Dipendenza | Serve a | Disponibile | Versione | Ripiego |
|---|---|---|---|---|
| Node | build e gate | ✓ | v25.6.1 | — |
| npm | script | ✓ | 11.9.0 | — |
| `SUPABASE_ACCESS_TOKEN` | Management API, endpoint migrations | ✓ | — in `.env.local` | nessuno: senza, le migration non si applicano |
| `LAB_PROJECT_REF`, `LAB_SUPABASE_SERVICE_ROLE_KEY`, `LAB_DB_PASSWORD` | laboratorio | ✓ | — in `.env.lab.local` (ignorato da git) | nessuno |
| Progetto di laboratorio **ACTIVE_HEALTHY** | ogni prova | **da verificare all'inizio** | — | **il lab va in pausa dopo una settimana**: NXDOMAIN sul suo host significa progetto `INACTIVE`, non rete. Restore dal Management API **prima** delle prove — precondizione `PRE-LAB` di `P-50-8` |
| `lab.resonatemotion.com` che serve il ramo di fase | prove di superficie | da verificare | — | nessuno: percorrere una procedura contro il codice vecchio non misura nulla |
| **Un telefono vero, con radio spegnibile** | `P-51-1` | del proprietario | — | **nessuno.** Il solo wi-fi spento rende la prova inutile |
| Chrome CDP (porta 9222) | prove di superficie non alla porta | ✓ | — | curl per i codici HTTP |

**Mancanti senza ripiego:** nessuna, purche' il laboratorio sia risvegliato prima di cominciare.

---

## Package Legitimacy Audit

**Non applicabile: questa fase non installa alcun pacchetto.** E' interamente sottrazione di codice e di schema piu' due modifiche di presentazione. `package.json` non cambia. Se durante la pianificazione emergesse una dipendenza nuova, il protocollo di legittimita' va eseguito prima di scriverla nel piano.

---

## Assumptions Log

| # | Affermazione | Sezione | Rischio se sbagliata |
|---|---|---|---|
| A1 | Nessun altro chiamante di `generateMembershipQR` oltre alla pagina della card | §1.1 | build rosso — **si accorge il build**, rischio nullo |
| A2 | La riparazione della testata e' l'altezza del blocco `sticky`, non un antenato che scorre ne' la safe area | §5.3 | si ricostruisce la barra e il difetto resta. **Mitigato:** `P-51-1` passo 6 lo misura sullo schermo |
| A3 | Il conteggio delle concessioni in `private.capabilities` corrisponde a `ROLE_GRANTS` nel repo | §4.3 | `verify:capabilities` rosso — se ne accorge il gate, non un utente |
| A4 | L'avviso resta acceso per l'uscita anticipata di `fetchAttendance` e non per una seconda causa | §2.2 | la riparazione derivata (§2.2) **e' corretta in entrambi i casi**: uno stato calcolato non puo' restare acceso falso |
| A5 | Nessuna funzione SQL viva contiene il letterale `'member'` fuori da `handle_new_user` | §4.2 | una funzione si rompe in silenzio. **Mitigato dall'obbligo:** rileggere `pg_proc` dal laboratorio prima di scrivere la migration |

Tutto il resto in questo documento e' `[VERIFIED]` per lettura diretta del file citato, con riga.

---

## Open Questions (RESOLVED)

> Chiuse il 2026-09-21 in `51-CONTEXT.md`: D-51-13 (Q1, `'membership'` resta storico), D-51-14 (Q2, `attendances` si svuota e si toglie), D-51-15 (Q3, `subject_label` = prime 8 cifre di `subject_id`).

**Tre, e vanno chiuse prima di scrivere i piani — non durante.**

### 1. `door_scan_events.subject_type = 'membership'`: le righe storiche delle convalide

- **Cosa sappiamo.** `DoorSubjectType` (`outcome.ts:56`) e' specchiato da un `CHECK` SQL (`20260805120000:69-70`), e `outcome.ts:17-21` lo dichiara come regola: *«Editing either literal set means editing both, in the same commit»*. Le righe con `subject_type='membership'` sono il **registro delle convalide** — chi ha scansionato cosa, quando, da quale dispositivo — **non** le presenze. `classify.ts` le legge tipandole `DoorSubjectType`.
- **Cosa non e' chiaro.** D-51-04 autorizza a cancellare **le presenze**. Il registro delle convalide non e' nominato. Ma se resta con righe `'membership'` e l'union TS si restringe, lo specchio e' rotto e `classify.ts` legge un valore che il suo tipo dice impossibile.
- **Le tre strade, con il loro costo.**
  - **(a) Non toccare ne' union ne' `CHECK`.** Zero rischio, `'membership'` resta in entrambi come membro storico con un commento che dice perche'. Costo: un membro d'unione che nessun percorso produce, e il ramo morto va comunque potato **senza** che il build lo imponga.
  - **(b) Restringere entrambi e cancellare anche le righe `'membership'` di `door_scan_events`.** Specchio pulito. Costo: **una seconda cancellazione in produzione che nessuna decisione autorizza**, su un registro che questo progetto tratta come append-only per cultura (`membership_acts` lo e' per grant, `door_scan_events` per vocazione).
  - **(c) Restringere l'union, lasciare il `CHECK` largo, e dichiarare la divergenza.** Costo: viola una regola scritta a mano nel file, e la prossima persona che la legge la riparera' nel verso sbagliato.
- **Raccomandazione: (a).** Il registro delle convalide e' la prova di cosa e' successo alla porta, e non sta in nessuna delle quattro strade che D-51-04 percorre. `'membership'` resta come **membro storico documentato** in `DoorSubjectType` e nel `CHECK`; il ramo di codice che lo produceva esce; il commento a `outcome.ts:56` si riscrive per dire che il terzo membro non e' piu' producibile. **Decisione del proprietario.**

### 2. Le righe di `attendances` con `party_id IS NULL`

- **Cosa sappiamo.** `20260805120000:236-239` dice che sono presenze **a livello di evento**, scritte prima che la porta esistesse. L'unico scrittore odierno scrive sempre `party_id`.
- **Cosa non e' chiaro.** D-51-04 dice «le presenze registrate da scansioni socio». Queste non lo sono: sono di provenienza ignota, anteriore.
- **Raccomandazione:** contarle **separatamente** e metterle davanti al proprietario **come seconda domanda, con il numero vero** — mai includerle nella lista del primo atto. Se il numero e' zero la domanda si chiude da sola.

### 3. `membership_acts.subject_label` dopo il `DROP COLUMN`

- **Cosa sappiamo.** `subject_label` e' `NOT NULL` (`20260808002000:203`), scritto da `record_membership_act` dal solo `profiles.membership_code`, e il suo commento vieta **nome, indirizzo e contatto**: la riga puo' finire in uno screenshot e il repo e' pubblico. Le righe storiche conservano i codici emessi e restano leggibili.
- **Cosa non e' chiaro.** Cosa scrivere sulle righe **nuove**.
- **Le opzioni.** Le prime otto cifre di `subject_id` (non PII, non una credenziale, disambigua, e **non sopravvive al soggetto** — che e' il mestiere dichiarato della colonna, D-50-16); oppure una sentinella costante (`'no-code'`, onesta ma inutile); oppure rendere la colonna nullable (cambia il contratto del registro, e un registro che ammette una lacuna e' un registro che la ammettera' altrove).
- **Raccomandazione:** le **prime otto cifre di `subject_id`**, con la ragione scritta accanto nella migration e il limite dichiarato — e' un'etichetta che **non** sopravvive alla cancellazione del soggetto, a differenza del codice che c'era prima. **Decisione del proprietario**, perche' cambia cosa significa il registro.

---

## Sources

### Primarie (HIGH) — codice e schema letti in questa sessione, con riga
`src/lib/door/outcome.ts` · `src/lib/door/classify.ts` · `src/lib/offline/checkin-store.ts` · `src/lib/offline/sync-manager.ts` · `src/app/sw.ts` · `src/app/(admin)/admin/scanner/ScannerClient.tsx` · `src/components/scanner/ScanFlash.tsx` · `src/app/api/membership/verify/route.ts` · `src/app/api/membership/list/route.ts` · `src/app/api/tickets/attendance/route.ts` · `src/app/api/tickets/checkin/undo/route.ts` · `src/app/(members)/dashboard/page.tsx` · `src/app/(members)/attendance/page.tsx` · `src/app/(members)/membership-card/page.tsx` · `src/lib/rbac/roles.ts` · `src/lib/capabilities/keys.ts` · `src/lib/routes/capability-routes.ts` · `src/lib/routes/next-redirect.ts` · `src/lib/supabase/middleware.ts` · `src/middleware.ts` · `src/lib/membership/acts.ts` · `src/types/database.ts` · `src/utils/qr.ts` · `next.config.ts` · `package.json` · `supabase/schema.sql` · `supabase/migrations/{20260224_rbac_migration, 20260805120000_door_scan_events, 20260807000000_capability_model, 20260808000500_staff_role, 20260808002000_membership_register, 20260808003000_attendances_entry_role, 20260808005000_membership_acts_append_only, 20260905130000_membership_code_crypto, 20260921120000_drop_status_and_referral}.sql` · `scripts/{conversion-manifest, verify-routes, verify-capabilities, verify-refusal, verify-persona, rls-baseline, seed-lab-door, lab-bootstrap}.mjs`

### Primarie (HIGH) — artefatti generati, letti come misura
`.next/types/routes.d.ts:8-9` e `.next/types/link.d.ts:60-105` — la prova che `typedRoutes` include i source di `redirects()`.

### Primarie (HIGH) — decisioni e procedure di progetto
`51-CONTEXT.md` · `.planning/ROADMAP.md` §Phase 51 · `50-CONTEXT.md` · `50-ESITI.md` §`P-50-8` · `50-via-le-iscrizioni/deferred-items.md` §7 e le osservazioni dal lab · `.planning/STATE.md` · `.claude/rules/{checkin-offline, access-gating, ai-engineering, supabase-data, meta-gates}.md` · `./CLAUDE.md`

### Secondarie (MEDIUM)
Nessuna. **Non e' stata consultata alcuna fonte esterna, e non serviva:** ogni affermazione di questo documento e' verificabile riaprendo un file di questo repository alla riga citata. Dove non ho misurato — le tre Open Questions e le cinque voci dell'Assumptions Log — l'ho scritto.

---

## Metadata

**Confidenza, voce per voce:**

- **Inventario del codice:** HIGH — letto file per file, ogni affermazione porta `file:riga`.
- **Percorso offline della porta:** HIGH — letti per intero `checkin-store.ts`, `sync-manager.ts`, `sw.ts`, e i rami rilevanti di `ScannerClient.tsx`.
- **Forma delle migration:** HIGH — il modello e' la migration della fase 50, con le sue misure gia' prese sul laboratorio e scritte accanto.
- **Vincoli `CHECK` vivi contro storici:** HIGH — distinti leggendo la catena dei `DROP CONSTRAINT` / `ADD CONSTRAINT`.
- **Righe da cancellare e cascata:** HIGH sulla forma, **MEDIUM sui numeri** — i conteggi non esistono finche' non si interroga il catalogo, e questo documento non ha interrogato alcun database.
- **Testata dello scanner:** MEDIUM — la causa che il codice sostiene e' l'altezza del blocco `sticky` (355 righe di JSX); si conferma sullo schermo, non in un file.
- **Velo dell'esito:** HIGH — tre `/90` trovati, riga per riga.
- **`typedRoutes` e i redirect:** HIGH — **misurato sui tipi generati**, non dedotto dalla documentazione.

**Data della ricerca:** 2026-09-21
**Valida fino al:** 2026-10-21 per la parte di stack; **fino al primo deploy** per ogni riferimento `file:riga`, che va riletto prima di essere citato in un piano (`ai-engineering.md`, gate *documentazione datata*).
