# Phase 51: Via le superfici da socio, e la porta — Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 38 (7 cancellati, 4 spostati, 2 nuovi di schema, 3 nuovi di
procedura, 22 modificati)
**Analogs found:** 35 / 38 — 3 senza analogo, elencati in fondo

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repo
> pubblico. Qui si nominano **ruoli**, mai persone. Nessun ref di laboratorio,
> nessuna chiave, nessuna sede in trattativa.

> **Regola di lettura, dalla ricerca (§4.5) e da `ai-engineering.md`, gate
> *documentazione datata*.** Ogni `file:riga` di questo documento e' stato letto
> il 2026-09-21 e **va riletto prima di essere citato in un piano**. Per gli
> oggetti di **database** vale la regola piu' dura, che la fase 50 ha pagato:
> *«un elenco letto dai file trova cio' che una migration ha scritto; solo il
> catalogo trova cio' che c'e'»* (`20260921120000_drop_status_and_referral.sql:109-112`).
> Le righe di questa mappa che riguardano SQL sono **lette dai file**.

---

## File Classification

### A. Superfici e rotte che escono

| File | Ruolo | Data flow | Analogo piu' vicino | Match |
|---|---|---|---|---|
| `src/app/(members)/membership-card/page.tsx` — **cancellare** | page RSC | request-response | commit `74a577f` (fase 50: via `/register`) | exact |
| `src/app/(members)/membership-card/loading.tsx` — **cancellare** | loading placeholder | — | idem (la pagina d'iscrizione non ne aveva uno: vedi §A.2) | role-match |
| `src/components/membership/MembershipCardView.tsx` — **cancellare** | component | presentational | idem — unico importatore la pagina sopra | exact |
| `src/app/(members)/attendance/page.tsx` — **cancellare** | page RSC | request-response (stub) | commit `74a577f` | exact |
| `src/app/api/membership/verify/route.ts` — **cancellare** | route handler | request-response + CRUD write | commit `74a577f` (`auth.signUp` sparito con la sua pagina) | role-match |
| `src/app/api/membership/list/route.ts` — **cancellare** | route handler | batch read | idem | role-match |
| `src/app/(members)/dashboard/DashboardDrinkTokens.tsx` — **cancellare** | client component | CRUD read | idem | role-match |

### B. Superfici che si spostano

| File | Ruolo | Data flow | Analogo | Match |
|---|---|---|---|---|
| `dashboard/page.tsx` → `account/page.tsx` | page RSC | request-response | commit `24b511e` (`presenze`→`attendance` con redirect) + `ab0c0c4` (37-08: pagina spostata con la sua guardia) | exact |
| `dashboard/loading.tsx` → `account/loading.tsx` | loading placeholder | — | `24b511e` | exact |
| `src/lib/membership/acts.ts` → `src/lib/account/acts.ts` | tipi + lettura registro | CRUD read | nessun precedente di **modulo** spostato in `src/lib/` — vedi «No Analog Found» | none |

### C. Configurazione e mappe di rotta

| File | Ruolo | Data flow | Analogo | Match |
|---|---|---|---|---|
| `next.config.ts` (+1 redirect, −1 redirect) | config | request-response | **se stesso**, `:88-92` + il docblock `:63-87` scritto dalla fase 50 | exact |
| `src/lib/routes/next-redirect.ts` | route map / allow-list | validazione input | **se stesso**, `:66-87` e `:139-146` — la fase 50 ha gia' fatto qui un movimento identico | exact |
| `src/lib/routes/capability-routes.ts` | route↔capability map | config | **se stesso**, `:405-413` e `:485-489` | exact |
| `src/lib/capabilities/keys.ts` | catalogo di costanti | config | **se stesso** + §5b della migration 50 | exact |
| `src/lib/rbac/roles.ts` | ruoli + nav | config | **se stesso**, `:98-112` (le costanti di stato uscite nella 50) | exact |
| `src/lib/supabase/middleware.ts` | middleware | request-response | **se stesso**, `:495-497` e `:578-589` | exact |
| `src/components/layout/AppNav.tsx` | client component | presentational | `roles.ts:320-339` (la voce Account, gia' toccata dalla 50) | role-match |
| `src/types/database.ts` | tipi | — | `roles.ts` | partial |

### D. La porta e l'offline

| File | Ruolo | Data flow | Analogo | Match |
|---|---|---|---|---|
| `src/app/sw.ts` | service worker config | runtime caching | **se stesso**, `:14-48` — togliere due elementi da un array di quattro | exact |
| `src/lib/offline/checkin-store.ts` (bump v5→v6) | client store | persistenza IndexedDB | **se stesso**, i passi `if (oldVersion < 3/4/5)` a `:437-595` | exact |
| `src/lib/offline/sync-manager.ts` | client service | queue drain | **se stesso**, `targetFor()` `:352-...` — `switch` su union che si restringe | exact |
| `ScannerClient.tsx` | client component | event-driven | **se stesso** (`lastFetchAtRef`/`listAgeMs`/`listIsStale`) | exact |
| `src/components/scanner/ScanFlash.tsx` | component | presentational | **se stesso**, `:97/110/125/154` | exact |
| `src/lib/door/outcome.ts` | contratto di tipo | — | `src/lib/membership/acts.ts:55-105` (valori storici che restano leggibili) | **exact** |
| `src/lib/door/classify.ts` | service | transform | `sync-manager.ts:352` | role-match |

### E. Migration

| File (nuovo) | Ruolo | Data flow | Analogo | Match |
|---|---|---|---|---|
| `…_role_attendee_and_capability_keys.sql` | migration | DDL + UPDATE righe | `20260808000500_staff_role.sql:70-101` (i due `CHECK` in un file) + `20260921120000:930-1012` | exact |
| `…_drop_membership_code_and_rename_acts.sql` | migration | DDL + funzioni plpgsql | `20260921120000_drop_status_and_referral.sql` **intero** | exact |

### F. Gate e script

| File | Ruolo | Data flow | Analogo | Match |
|---|---|---|---|---|
| `scripts/conversion-manifest.mjs` | dati del gate | — | **se stesso**, diff di `74a577f` | exact |
| `scripts/verify-capabilities.mjs` | gate su DB vivo | — | **se stesso**, docblock `:202-232` | exact |
| `scripts/verify-refusal.mjs` `:459` | gate su DB vivo | query viva | `verify-capabilities.mjs` | role-match |
| `scripts/rls-baseline.mjs` | gate | — | idem | role-match |
| `scripts/probe-forged-identity.sh` `:20` | probe | — | idem | partial |
| `scripts/container/seed.mjs`, `scripts/seed-lab-door.mjs` | banchi | — | `seed-lab-door.mjs:70-92` (il rifiuto del ref di produzione) | exact |

### G. Persona e documenti di fase

| File | Ruolo | Analogo | Match |
|---|---|---|---|
| `.claude/rules/checkin-offline.md` (frontmatter), `CLAUDE.md` (riga d'indice), `.claude/rules/meta-gates.md` (riga di routing), `.claude/CHANGELOG.md` | config della persona | i controlli A/B/E/G di `verify-persona.mjs` | role-match |
| `51-AUTHORISATION.md` (nuovo) | atto | `.planning/phases/50-via-le-iscrizioni/50-AUTHORISATION.md` | exact |
| `P-51-1` dentro `51-ESITI.md` / `51-VERIFICATION.md` (nuovo) | procedura manuale | `50-ESITI.md:450-560` (`P-50-8`) | exact |

---

## Pattern Assignments

### 1. `…_drop_membership_code_and_rename_acts.sql` (migration, DDL + plpgsql)

**Analogo:** `supabase/migrations/20260921120000_drop_status_and_referral.sql`
— **e' il modello dichiarato dalla ricerca (§4.1), va copiato nella forma, non
solo citato.**

**Intestazione del file** (`:1-115`). La forma e': titolo in cornice `═`, fase e
decisioni nominate, poi **i tre paragrafi che questa fase deve riprodurre con il
proprio contenuto**:

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Via lo stato, via il referral, via il flag che li univa alle capability
--
-- Fase 50 «Via le iscrizioni» — REG-02, REG-03, REG-04, REG-05.
-- Decisioni: D-50-01, D-50-03, D-50-07, …
--
-- ── IL VERSO DEL DEPLOY E' INVERTITO. CODICE PRIMA, QUESTA MIGRATION DOPO ───
--   * **applicarla PRIMA** apre una finestra `42703 column does not exist` sul
--     codice ancora in produzione, che legge e scrive `profiles.status`…
--   * **applicarla DOPO** non rompe niente…
--
-- ── E UN'ECCEZIONE DENTRO L'ECCEZIONE: IL TRIGGER STA IN QUESTO FILE ────────
-- `public.handle_new_user()` inserisce ESPLICITAMENTE `status`, … Se le colonne
-- cadessero in una transazione e il trigger si ridefinisse in un'altra,
-- esisterebbe un istante in cui l'`INSERT` del trigger nomina colonne che non ci
-- sono — e in quell'istante **nessuno puo' creare un account, compreso chi ha
-- appena pagato**. … Una migration sola, una transazione sola.
--
-- ── UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE ─────────────
-- **Misurato sul laboratorio il 2026-09-21 alle 12:35:43Z, non ricordato.**
-- L'endpoint `POST /v1/projects/{ref}/database/migrations` avvolge il corpo in
-- UNA transazione da solo…
--
-- ── COSA QUESTA MIGRATION NON FA, E VA LETTO PRIMA DI CERCARLO ──────────────
-- ── L'ORDINE DEI PASSI, CHE NON E' ESTETICO ────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
```

**Da copiare alla lettera:** l'assenza di `BEGIN;` (`:42-55` spiega perche'), il
blocco «cosa NON fa», il blocco «l'ordine dei passi». **Da riscrivere con il
contenuto della 51:** il verso del deploy (qui la colonna `membership_code` e'
letta da nove file di prodotto, quindi **codice prima, migration dopo**, stesso
criterio), e il paragrafo «un'eccezione dentro l'eccezione», che questa volta
riguarda `record_membership_act` invece del trigger.

**Ridefinizione di funzione plpgsql** (`:551-615`). `CREATE OR REPLACE` su firma
identica conserva l'ACL e `SECURITY DEFINER` (`:373-378`). Il corpo va scritto
**per intero**, perche' `CREATE OR REPLACE` sostituisce il corpo:

```sql
CREATE OR REPLACE FUNCTION public.record_membership_act(
  p_subject_id  uuid,
  p_act         text,
  …
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subject record;
  v_act_id  uuid;
BEGIN
  -- Blocca e legge il soggetto com'e' ORA. `for update` e non una select
  -- semplice: i valori «prima» scritti nel registro devono essere quelli che
  -- questo statement sta per sovrascrivere.
  SELECT p.role, p.membership_code          -- ← D-51-02: `p.membership_code` esce
    INTO v_subject
    FROM public.profiles p
   WHERE p.id = p_subject_id
     FOR UPDATE;

  IF NOT FOUND THEN
    -- Il messaggio nomina l'IDENTIFICATIVO del soggetto e nient'altro. Mai
    -- l'indirizzo, mai il nome: un messaggio sollevato raggiunge un log, e su
    -- questo progetto un log raggiunge uno screenshot.
    RAISE EXCEPTION 'membership_acts.subject_not_found: %', p_subject_id
      USING ERRCODE = 'no_data_found';
  END IF;
  …
  INSERT INTO public.membership_acts (…)
  VALUES (
    p_act, p_subject_id, v_subject.membership_code,   -- ← D-51-15 cambia QUI
    …
```

**D-51-15 in concreto:** `v_subject.membership_code` diventa
`left(p_subject_id::text, 8)`, nello **stesso file** che droppa la colonna e
rinomina la tabella in `account_acts`. Il commento accanto porta il limite
dichiarato: e' un'etichetta che **non** sopravvive alla cancellazione del
soggetto, a differenza del codice che c'era prima (ricerca §4.4, Open Question 3).

**Rinomina di funzione:** `ALTER FUNCTION … RENAME TO record_account_act` —
conserva ACL e `SECURITY DEFINER`, e' la strada dichiarata dalla ricerca §4.5.
`record_party_assignment_act` e `reconcile_master` la **chiamano** e vanno
ridefinite nello stesso file.

**Il `DO` che controlla prima di cancellare** (`:960-980`) — da riusare tale e
quale per `membership.card.view`, cambiando il letterale:

```sql
DO $$
DECLARE
  v_lettori text;
BEGIN
  SELECT string_agg(schemaname || '.' || tablename || '.' || policyname, ', ')
    INTO v_lettori
    FROM pg_policies
   WHERE coalesce(qual, '') || coalesce(with_check, '') LIKE '%membership.active%';

  IF v_lettori IS NOT NULL THEN
    RAISE EXCEPTION
      'membership.active ha ancora lettori di policy: %', v_lettori
      USING HINT = 'Le concessioni non si cancellano finche'' una policy le legge…';
  END IF;
END;
$$;
```

**Il `DROP COLUMN`, in coda e con la sua dichiarazione** (`:1003-1012`):

```sql
-- **IRREVERSIBILE, e questo repository non ha PITR.** Per questo la stessa
-- migration e' stata applicata prima al laboratorio, con la procedura scritta,
-- e in produzione entra sotto un'autorizzazione datata a parte — **dopo** il
-- deploy del codice.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS status;
```

---

### 2. `…_role_attendee_and_capability_keys.sql` (migration, CHECK + UPDATE righe)

**Analogo:** `supabase/migrations/20260808000500_staff_role.sql:70-101` — il file
che **la ricerca §4.2 dichiara essere il modello**, e che spiega nel proprio
corpo perche' i due `CHECK` non possono essere due migration.

**Forma del `CHECK` riscritto** (`:72-77` e `:96-101`):

```sql
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member'));

…

ALTER TABLE private.role_capabilities
  DROP CONSTRAINT IF EXISTS role_capabilities_role_check;

ALTER TABLE private.role_capabilities
  ADD CONSTRAINT role_capabilities_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member'));
```

**Il paragrafo che va copiato con il testo adattato** (`:79-94`) — e' la ragione
per cui i due vincoli stanno in un file solo:

```
-- `role` is constrained in TWO places, not one. … its comment there says why it
-- exists: it *"mirrors `UserRole` in `src/types/database.ts`"*. A mirror that is
-- only half-updated is no longer a mirror.
--
-- … Because all three statements share one transaction, that refusal aborts the
-- whole file and nothing is applied — which is the outcome this file wants…
-- The failure mode being designed against is the other one: two separate
-- migrations, the first applied and the second not, and a production database
-- that admits a role holding no capabilities at all.
```

**Ordine interno, dalla ricerca §4.2** — il valore transitorio e' il solo punto
che puo' fallire per una ragione di **dati**, e va provato sul laboratorio prima:

1. `profiles_role_check` allargato a **cinque** valori (i quattro nuovi + `'member'`)
2. `role_capabilities_role_check` idem
3. `UPDATE private.role_capabilities SET role = 'attendee' WHERE role = 'member';`
4. `UPDATE public.profiles SET role = 'attendee' WHERE role = 'member';`
5. i due `CHECK` stretti a quattro, con un secondo `ALTER` per vincolo
6. `ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'attendee';`
7. `handle_new_user` ridefinita per intero (il ruolo e' **cablato** a `'member'`,
   `20260921120000:837`)

**Commento sul vincolo, forma della casa** (`20260921120000:927-929`): ogni
`CHECK` ricreato porta il proprio `COMMENT ON CONSTRAINT` che dice quanti valori,
da dove vengono, e quali restano leggibili senza essere piu' scrivibili.

---

### 3. `src/lib/offline/checkin-store.ts` (client store, IndexedDB v5→v6)

**Analogo: se stesso** — i tre passi `if (oldVersion < N)` a `:437-595`, e il
**passo v5 e' il piu' vicino per forma, il piu' lontano per contenuto**.

**Il bump** (`:56-57`):

```ts
const DB_NAME = "resonate-checkin";
const DB_VERSION = 5;      // → 6
```

**La disciplina dei passi** (`:33-38`, docblock del file) — da citare nel commento
del passo v6, non da riassumere:

```
 * A fifth, from version 4: **the upgrade callback is cumulative, and no step
 * may undo an earlier one.** Each version is its own `oldVersion <` block doing
 * only its own work, because the one-shot rebuild that served version 3 would
 * have destroyed the queue of any device hopping from 3 to 4 — rows for people
 * who paid, on a phone that is offline and cannot be audited.
```

**Le due regole che restano intatte, prese dal passo v3** (`:455-461`):

```
        // Never `deleteObjectStore` before the copy: those rows are attendance
        // records for people who paid… If any step throws, the whole
        // `versionchange` transaction aborts and rolls back as a unit…
        //
        // Only `idb` promises are awaited in here — `getAll`, `get`, `put`. One
        // await on anything else would let the transaction close mid-migration,
        // and there is no test runner in this repository that could catch it.
```

**La proprieta' che il passo v6 ROMPE deliberatamente** (`:545-560`, passo v5) —
va citata *e* dichiarata rotta, o il prossimo lettore credera' a una distrazione:

```
        // ── Version 5: a step that migrates nothing, and touches NO QUEUE ────
        // **this step does not touch the queue store.** It does not read it, it
        // does not rewrite a row of it, and it does not delete or re-create the
        // store. A device arriving here can be carrying a NON-EMPTY queue —
        // admissions for people who paid, taken at 01:40, on a phone that is
        // offline right now and cannot be audited…
```

E il vincolo sul **commento** (`:588-596`): il passo v5 non nomina
`pendingCheckins` perche' la sua asserzione e' un grep. **Il passo v6 lo
nominera'** — va scritto accanto che e' corretto e perche'.

**Forma del corpo del passo v6** — la casa itera e cancella per chiave dentro una
`readwrite`; il precedente piu' pulito e' `bumpAttempts` (`:1288-1303`):

```ts
  const tx = db.transaction(["pendingCheckins", "failedCheckins"], "readwrite");
  const pending = tx.objectStore("pendingCheckins");
  const entry = await pending.get(key);
  …
    await pending.delete(key);
  await tx.done;
```

e `cacheMembers` (`:1343-1369`) per il pattern «conta mentre scorri, poi una sola
scrittura di esito»:

```ts
  const tx = db.transaction(["members", "meta"], "readwrite");
  const store = tx.objectStore("members");
  let merged = 0;
  for (const m of members) { … merged++; }
  await tx.done;
  return merged;
```

**Il log di D-51-11** — la convenzione e' `categoria:evento` con un oggetto di
contesto. Precedenti nel prodotto: `console.error("scanner:member_roster_failed", …)`
(`ScannerClient.tsx:1307`), `console.error("scanner:attendance_failed", { status, detail })`
(`:1157`). Forma raccomandata dalla ricerca §2.4:
`console.warn("checkin-store:v6_dropped_membership_entries", { count })`, **una
sola riga, nessuna superficie**.

**Cosa esce con lo store** (ricerca §2.4): `QueuedSubjectType` `:105`,
`MemberRecord` `:160-180`, lo store `members` `:264-266`/`:309`/`:487-489`,
`ROSTER_PREDATES_ROLE_KEY` `:63-72` + `rosterPredatesRole()` `:1374-1389`,
`cacheMembers()` `:1329-1370`, `findMember()` `:1471-1477`,
`checkInMemberLocally()` `:954-1020`, `entryRole` `:233-236`.

---

### 4. `src/lib/offline/sync-manager.ts` (client service, queue drain)

**Analogo: se stesso** — `targetFor()` `:352`. Il `case "membership"` `:369-395`
esce **con i suoi quattro paragrafi di commento**. Il `switch` e' su una union che
si restringe: `npm run build` diventa il gate.

```ts
function targetFor(entry: PendingCheckin): Target {
  switch (entry.type) {
    case "ticket":
      // The signed string exactly as it was read, never a bare identifier…
      return { url: "/api/tickets/checkin", body: { … }, legacySuccess: null };
    case "membership":            // ← esce tutto il ramo
      return { url: "/api/membership/verify", … };
    case "guest":
      // `source` and `scannedAt` are sent so that the route can tell a report
      // from the drain apart from a tap on the button…
```

**Vincolo dalla ricerca (Architectural Responsibility Map):** `ticket` e `guest`
**non si toccano**. Il ramo `guest` drena verso `POST /api/tickets/attendance` e
resta identico.

---

### 5. `src/app/sw.ts` (service worker, runtime caching)

**Analogo: se stesso** — l'array `doorRuntimeCaching` `:32-48`. Escono il terzo e
il quarto elemento; i primi due restano **e il loro ordine e' portante**.

```ts
const doorRuntimeCaching: RuntimeCaching[] = [
  { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/tickets/attendance",
    handler: new NetworkOnly() },
  { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/tickets/checkin",
    handler: new NetworkOnly() },
  { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/membership/list",
    handler: new NetworkOnly() },      // ← esce
  { matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/api/membership/verify",
    handler: new NetworkOnly() },      // ← esce
```

**Il docblock va riscritto, non lasciato** (`:14-30`) — il paragrafo che motiva le
due regole in uscita nomina una rotta che non esistera' piu':

```
 * … And `/api/membership/list` returns the whole member roster — every full name
 * and membership code — which must not be left at rest in a browser cache
 * bucket on a staff phone we do not control.
 *
 * Order matters: Serwist takes the first matching route, so these rules must be
 * spread before the inherited ones, or the inherited `/api/*` rule keeps
 * winning.
```

**Il paragrafo «Order matters» RESTA e diventa piu' importante**, non meno: la
regola ereditata e' un `NetworkFirst` a 86400 s su ogni `GET /api/*`. Verifica
**sull'output `public/sw.js`**, non sul diff (ricerca §2.3 e §9, modello di
minaccia *Tampering*).

---

### 6. `src/components/scanner/ScanFlash.tsx` (component, presentational)

**Analogo: se stesso.** Tre sfondi al 90%, `:97`, `:110`, `:125`, piu' il
contenitore `:154`:

```tsx
const FLASH_STATES: Record<ScanFlashType, FlashState> = {
  success:          { bg: "bg-green-500/90", delay: 1500, icon: … },
  already_recorded: { bg: "bg-sem-done/90",  delay: 2500, icon: … },
  error:            { bg: "bg-red-600/90",   delay: 2000, icon: … },
};
…
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center ${state.bg} animate-[flash-in_150ms_ease-out]`}
```

**La riparazione e' togliere `/90`** da tre righe (D-51-05, «zona dell'esito
opaca»). `npm run verify:scan-legibility` va lanciato dopo.

**Il nome esce dal `title`, non dalla rotta e non dalla coda** (ricerca §5.2):
`title` e' reso a `:163-165`, `subtitle` a `:168-172`. Titolo = esito,
sottotitolo = tipo + provenienza. **Il vocabolario dei rifiuti si riusa**:
`NOT_VALID_MESSAGE` (`ScannerClient.tsx`) e `NOT_VALID_REASONS`
(`sync-manager.ts`) sono `Record` totali su `DoorNotValidReason`
(`outcome.ts:92-97`).

**Il commento `:88-93` e' il modello della disciplina di questo file** e va
rispettato quando si tocca:

```
 * **The gate now measures every pair on every run.** A comment here cannot
 * assert this again — the numbers are printed, or nothing is.
 *
 * **Dwell is information.** `already_recorded` sits for 2500 ms rather than 2000
 * because it carries a time and an operator to read, and it is read while
 * someone is waiting.
```

→ `already_recorded` **conserva il fatto** (ora + dispositivo, *«Recorded at 18:01
by this device»*, `P-50-8` passo 5). Esce il **nome**, non il fatto.

---

### 7. `src/app/(admin)/admin/scanner/ScannerClient.tsx` (client, event-driven)

**Analogo: se stesso**, due volte.

**(a) L'intestazione** (`:2802`) — lo `sticky` c'e' gia', e il difetto e'
l'altezza del blocco, che si chiude a `:3156`:

```tsx
      <div className="sticky top-0 z-10 bg-ground px-6 pt-6 pb-3">
```

Il blocco va spezzato in **una barra sottile fissa** (titolo + pulsante «QR
Scan») e **un resto che scorre**. Criterio: la parte fissa deve stare comodamente
dentro la finestra di un telefono. **Assunzione A2 della ricerca: si conferma
sullo schermo (`P-51-1` passo 6), non in un file.**

**(b) L'avviso della lista** — il prodotto ha gia' la macchina giusta e non la usa:
`lastFetchAtRef` (`:1042`, `performance.now()` monotono), `listAgeMs` (`:2643`),
`listIsStale` (`:2666`), la fascia a `:3215-3226`. L'avviso appiccicoso di
`:1308-1313` esce; il nuovo si **deriva** da `listIsStale`, e dice «guest list».
Un avviso derivato non puo' restare acceso quando cio' che descrive e' falso.

---

### 8. `src/lib/door/outcome.ts` (contratto di tipo) — D-51-13

**Analogo: `src/lib/membership/acts.ts:55-105`.** E' lo stesso problema gia'
risolto da questo progetto: un'unione che deve continuare a **nominare** righe
storiche che nessuno scrive piu'.

```ts
 * `approved`, `rejected`, `deactivated` e `reactivated` **restano nell'unione e
 * nessuno li scrive piu'**: l'asse dello stato che muovevano e' uscito dallo
 * schema con la stessa migration (D-50-01). Non si tolgono perche' le righe
 * storiche li portano, e il registro e' append-only: un'unione che non sapesse
 * nominare una riga esistente renderebbe illeggibile la storia che il registro
 * esiste per conservare. Sono valori da LEGGERE, non piu' da scrivere.
 */
export type MembershipAct =
  | "created"
  | "approved"
  …
```

**Applicato a D-51-13:** `'membership'` resta in `DoorSubjectType` (`outcome.ts:56`)
**e** nel `CHECK` SQL (`20260805120000_door_scan_events.sql:69-70`), con un commento
scritto in questa forma. La regola dello specchio (`outcome.ts:17-21`, *«Editing
either literal set means editing both, in the same commit»*) **non si viola**:
nessuno dei due si tocca. Esce il **ramo di codice** che lo produceva.

---

### 9. `next.config.ts` (config, redirect permanente)

**Analogo: se stesso**, `:63-92` — il docblock scritto dalla fase 50 quando ha
tolto l'alias italiano dell'iscrizione. **Questa fase fa entrambi i movimenti:
ne aggiunge uno e ne toglie uno.**

```ts
  async redirects() {
    // ── L'alias italiano dell'iscrizione e' uscito da qui (fase 50, D-50-11) ─
    // **Il fatto che va dichiarato e non scoperto.** `permanent: true` emette un
    // **308**, e un 308 lo **memorizza il browser**: chi ha seguito quell'alias
    // anche una sola volta continuera' a essere mandato sulla pagina cancellata
    // **dalla propria cache**… Non e' un difetto di questa modifica — e'
    // la proprieta' di un redirect permanente — e si accetta dichiarandola
    // (T-50-28, disposizione `accept`)…
    return [
      { source: "/eventi/:path*", destination: "/events/:path*", permanent: true },
      { source: "/presenze", destination: "/attendance", permanent: true },  // ← ESCE con la pagina
      { source: "/galleria", destination: "/gallery", permanent: true },
    ];
  },
```

**Da aggiungere** (ricerca §1.4, misurato su `.next/types/routes.d.ts:8`):

```ts
      { source: "/dashboard", destination: "/account", permanent: true },
```

— tiene `/dashboard` un `Route` valido sotto `typedRoutes`, quindi i ~40
`redirect("/dashboard")` delle superfici di lavoro **non si toccano**, e il 308
arriva **prima** del middleware.

**Il paragrafo da scrivere accanto, nella stessa forma del precedente:** chi ha
gia' seguito `/presenze` continuera' a finire su `/attendance` dalla propria
cache, ricevendo un **404**. Disposizione `accept`, dichiarata.

---

### 10. `src/lib/routes/next-redirect.ts` (allow-list + prefissi protetti)

**Analogo: se stesso.** La fase 50 ha gia' fatto qui esattamente il movimento che
la 51 deve fare, e ha lasciato scritto il criterio (`:66-77`):

```
 *   /events/<slug>      **nobody writes this one any more** — re-measured
 *                       2026-09-21, phase 50. … Il pattern **stays**:
 *                       taking an entry off this list is as much an access
 *                       decision as adding one… What is gone is the traffic,
 *                       not the permission.
```

Le due liste (`:91-126` e `:139-146`):

```ts
const NEXT_ALLOW_LIST: readonly RegExp[] = [
  /^\/dashboard$/,
  /^\/set-password$/,
  /^\/events\/[a-z0-9-]{1,80}$/,
  /^\/events\/[a-z0-9-]{1,80}\/menu$/,
  /^\/membership-card$/,     // ← esce
  /^\/attendance$/,          // ← esce
  /^\/door$/,
  /^\/admin(?:\/[a-z0-9-]{1,64}){0,4}$/,
];

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/membership-card",        // ← esce
  "/attendance",             // ← esce
  "/admin",
  "/door",
] as const;
```

**+ `/account` in entrambe.** Il pattern: `/^\/account$/` — ancorato a **entrambi
i capi, nessun `.*`**, come la nota `:86-87` impone. **Aggiungere un'entrata e'
una decisione d'accesso** e va scritta accanto, come la fase 50 ha scritto la sua
(`:101-126`).

**La regola meccanica** (ricerca §1.3): allow-list e `PROTECTED_PREFIXES` cambiano
**insieme, nello stesso commit**, o il controllo [3/3] di
`scripts/verify-routes.mjs:515-560` diventa rosso.

---

### 11. `src/lib/supabase/middleware.ts` (middleware, request-response)

**Analogo: se stesso**, `:495-497`:

```ts
  const bounceToDashboard = (cause: BounceCause = null) => {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
```

e `:582-589`, che **importa** `PROTECTED_PREFIXES` invece di ricopiarlo:

```ts
  // ⚠ **`PROTECTED_PREFIXES` is exported and read by the allow-list's gate.**
  // The two lists cannot drift apart again without `npm run verify:routes`
  // going red, which is the property this defect existed for the lack of.
  if (!user) {
    if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
```

→ il bounce per capability punta a `/account`; l'import resta l'import. **Il
commento a `:417` nomina `member`** e cambia con il ruolo.

---

### 12. `src/app/(members)/account/page.tsx` (page RSC, request-response)

**Analogo dello spostamento:** commit `24b511e` (`presenze`→`attendance` +
redirect in `next.config.ts` + middleware aggiornato, **un solo commit**) e
`ab0c0c4` (37-08), il cui messaggio dichiara il criterio che vale anche qui:

```
- guardia di pagina nella forma della sorella: organizer.access, poi
  redirect("/dashboard") — la mappa e' l'autorizzazione, non la cartella
…
Conseguenza gestita nello stesso commit: (work)/venues/page.tsx linkava
a /venues/<slug>, che dopo lo spostamento e' un 404 — l'unica superficie
da cui queste schede si aprono.
```

→ **ogni link entrante si corregge nello stesso commit dello spostamento.**

**Analogo del contenuto:** la pagina stessa, `dashboard/page.tsx` (706 righe). Il
blocco «My Tickets» `:525-640` e' il cuore e **resta**; le due liste `upcoming` e
`past` esistono gia' separate (`:282-290`), quindi «Past» in sezione chiusa e'
solo una resa diversa. Escono: «My Stuff» `:499-521`, «My Drinks» `:641-643`
**con la sua query** `:227-249`, `membership_code` dalla select `:186-189`.
`:208` `=== "member"` e `:350` `role ?? "member"` → `"attendee"`.
`ManagementSection` `:684-686` **resta in 51** (la toglie NAV-03, fase 52).

---

### 13. `src/lib/capabilities/keys.ts` + `capability-routes.ts` (catalogo)

**Analogo: se stessi**, piu' la §5b della migration 50 che dichiara **perche'** la
chiave era stata lasciata indietro (`20260921120000:947-957`):

```
-- **LA CHIAVE, PERO', RESTA NEL CATALOGO, E LA RAGIONE E' D-50-28.**
-- `scripts/verify-capabilities.mjs` confronta `private.capabilities` con
-- l'oggetto `CAP` di `src/lib/capabilities/keys.ts` in entrambe le direzioni…
-- La riga di catalogo e la costante TypeScript si tolgono nello stesso commit,
-- nel piano che smonta le superfici.
```

→ **e' questo il commit.** Escono insieme, nello stesso atto:

```ts
  /** P5 — `get_user_status() = 'approved'` alone; role irrelevant. */
  MEMBERSHIP_ACTIVE: "membership.active",              // keys.ts:300
  /** Middleware `/membership-card` and `/attendance`: status alone, any role. */
  MEMBERSHIP_CARD_VIEW: "membership.card.view",        // keys.ts:316
```

più `CAP_DESCRIPTIONS` `:395` e `:401-402`, e le due voci di
`capability-routes.ts`:

```ts
  [CAP.MEMBERSHIP_CARD_VIEW]: {
    routes: ["/membership-card", "/attendance"],       // :411-413
  },
  [CAP.MEMBERSHIP_ACTIVE]: {
    scope: "table",                                    // :485-489
    reason: "Gates rows and the member-level contribution, not addresses; …",
  },
```

**Lato SQL:** `DELETE FROM private.capabilities WHERE key IN (…)` cancella anche
le concessioni per cascata dichiarata (`20260807000000:122`), ma **la casa scrive
i due passi espliciti** — e fa precedere il `DO` che rilegge `pg_policies`
(pattern §1 qui sopra).

---

### 14. `scripts/conversion-manifest.mjs` (dati del gate)

**Analogo: diff di `74a577f`** — la fase 50 ha tolto una voce e spostato una
pagina di lista, **nello stesso commit della pagina**, e ha riscritto
l'aritmetica del censimento con la data accanto:

```js
 * **Rimisurato il 2026-09-21, fase 50: sono 44** = **36** dichiarate + **6** in
 * attesa di un'altra fase + **2** qui. Le due differenze sono dello stesso
 * commit: `/register` **cancellata** (D-50-11…) e `/` passata di lista… Il numero si
 * rilegge dal gate a ogni corsa — **questa prosa no**, ed e' la ragione per cui
 * porta la data accanto al numero invece che il numero da solo.
```

**Forma di una voce** (`:1022` e `:1076`):

```js
  [
    "/attendance", "src/app/(members)/attendance/page.tsx", "default",
    "plan 41.2-07 — … DECLARED RATHER THAN HIDDEN: the list branch on this
     surface is a pre-existing stub — a TODO and a hardcoded empty array — so the
     empty branch is the only branch a member can reach…",
  ],
```

→ `/attendance` `:1022` e `/membership-card` `:1026` **si cancellano**;
`/dashboard` `:1076` **si rinomina** in `/account` con il nuovo percorso file.
Il controllo D legge il *file di pagina* dichiarato: una entry che punta a un file
inesistente fa *«a gate assert the right thing about the wrong file»*.

---

### 15. `P-51-1` — la procedura a radio spenta

**Analogo: `.planning/phases/50-via-le-iscrizioni/50-ESITI.md:450-560` (`P-50-8`).**
La forma e': titolo, riga di esecuzione con **ora UTC e ora locale**, ruolo di chi
l'ha percorsa, ambiente, poi il riquadro che prova la modalita' aereo, poi la
tabella a due colonne, poi la rilettura dal catalogo.

```markdown
## Procedura `P-50-8` — la porta, con la radio spenta

**PERCORSA il 2026-09-21, fra le 16:01:27Z e le 16:02:19Z** — le 18:01 e le
18:02 a Torino — **dal proprietario, su un telefono vero**, contro
`lab.resonatemotion.com`, con l'account di staff del banco che ha
`door.operate` sulla serata gratuita.

> **La modalita' aereo era vera, e la dichiarazione non e' una parola data.**
> Nella barra di stato delle schermate si vede **l'icona dell'aeroplano**, e non
> si vede **nessun indicatore di rete dati ne' di wi-fi**. Non era il solo wi-fi
> spento — che e' la scorciatoia che avrebbe reso la prova inutile…

### I sei passi, con cio' che si e' visto

| # | Passo | Cosa si e' **visto** |
|---|---|---|
| 1 | prenotare un posto e ricevere il QR | … |

### La rilettura dal catalogo, che e' la meta' che lo schermo non da'
```

**La colonna «cosa si e' visto» si riempie percorrendo, mai in anticipo.** I nove
passi di `P-51-1` sono gia' elencati in `51-RESEARCH.md` §8.1.

> **Attenzione, e la fase deve aggiornarlo:** `P-50-8` cita l'avviso *«The member
> list on this device was NOT refreshed»* come **prova interna** che la radio era
> spenta. D-51-10 cambia quel testo e ne cambia la condizione: `P-51-1` non puo'
> ereditare quella prova e deve dichiararne una propria.

---

### 16. `51-AUTHORISATION.md` (atto di autorizzazione)

**Analogo: `.planning/phases/50-via-le-iscrizioni/50-AUTHORISATION.md`.**
Frontmatter e apertura da copiare nella forma:

```markdown
---
phase: 50-via-le-iscrizioni
document: autorizzazione a scrivere in produzione — la terza del progetto
written: 2026-09-21
granted: 2026-09-21
granted_by: proprietario
scope: due migration nominate, un deploy, un interruttore di configurazione, una lettura
answer: "tutto" — (a) → (e), nell'ordine, oggi
status: ESAURITA — 2026-09-21 16:34:42 UTC, cinque passi su cinque, zero falliti
exhausted: 2026-09-21
---

> **Questo documento e' stato scritto PRIMA che la domanda venisse posta.**
> … *«mi autorizzi ad applicare la fase?»* non e' un perimetro, e' una delega.
> Qui sotto ci sono i nomi dei file, gli identificativi, le istruzioni che
> scrivono e **i conteggi presi oggi**, in sola lettura, prima di chiedere
> qualunque cosa.

## 1. Il perimetro, e non un byte oltre
| # | Passo | Che cosa tocca, alla lettera |
**Fuori perimetro, esplicitamente:** …
```

E il precedente che questa fase deve riprodurre alla lettera — §1.0 di quel
documento: **il conteggio prima della domanda**, e la dichiarazione che una
decisione **senza soggetti** non si esegue:

```
> **Su produzione i profili in `pending` o `rejected` sono ZERO.**
> Quattro profili in tutto, **tutti `approved`**. D-50-02 **non ha soggetti**.
```

→ Per D-51-04 e D-51-14, i conteggi da prendere **prima** della domanda sono in
`51-RESEARCH.md` §3.4 passo 1, e le righe `party_id IS NULL` (Open Question 2)
vanno davanti al proprietario **come seconda domanda, con il numero vero**.

---

### 17. Script di laboratorio (se ne serve uno nuovo)

**Analogo: `scripts/seed-lab-door.mjs:70-92`** — il rifiuto del ref di produzione
come **prima riga eseguita**. Uno script nuovo senza questo blocco non e' uno
script di laboratorio.

```js
// Il ref di produzione e' scritto qui in chiaro, e va bene: e' gia' pubblico per
// costruzione … Il ref del LABORATORIO invece NON e' scritto qui: sta solo in
// `.env.lab.local`, perche' non c'e' ragione di pubblicare un ambiente che
// nessuno deve trovare.
const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
const REF = process.env.LAB_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!REF || !TOKEN) {
  console.error("LAB_PROJECT_REF o SUPABASE_ACCESS_TOKEN assenti. Carica .env.lab.local.");
  process.exit(2);
}
if (REF === PRODUCTION_REF) {
  console.error(
    `RIFIUTO: LAB_PROJECT_REF e' il ref di PRODUZIONE (${PRODUCTION_REF}).\n` +
      "Questo script semina e cancella righe. In produzione quella e' P6, e P6 ha\n" +
      "bisogno di un'autorizzazione fresca del proprietario, non di questo file."
  );
  process.exit(2);
}
```

---

## Shared Patterns

### S1 — Il commit che chiude una rotta tocca **cinque** posti insieme

**Fonte:** commit `74a577f` (fase 50) + `51-RESEARCH.md` §1.3.
**Applica a:** `/membership-card`, `/attendance`, `/dashboard`→`/account`.

1. il file di pagina (e il suo `loading.tsx`, **listato, non assunto**)
2. `scripts/conversion-manifest.mjs` — entry cancellata o rinominata
3. `src/lib/routes/next-redirect.ts` — `NEXT_ALLOW_LIST` **e** `PROTECTED_PREFIXES`
4. `src/lib/routes/capability-routes.ts` — la voce `routes:`
5. `next.config.ts` — l'alias italiano, se ne esiste uno

più `scripts/probe-forged-identity.sh:20` e ogni link entrante (lezione di `ab0c0c4`).

### S2 — Un valore che nessuno scrive piu' resta nell'unione, documentato

**Fonte:** `src/lib/membership/acts.ts:55-105`.
**Applica a:** `DoorSubjectType` (`outcome.ts:56`, D-51-13), `MembershipAct`
(gia' cosi'), e ogni `CHECK` SQL che li specchia.

Regola: *«Sono valori da LEGGERE, non piu' da scrivere»* — e la ragione va scritta
accanto al valore, non in un file di pianificazione.

### S3 — Zero fallimenti silenziosi: `categoria:evento` + contesto

**Fonte:** `ScannerClient.tsx:1157, :1307, :795`.
**Applica a:** D-51-11 (passo v6), ogni nuovo `catch` di questa fase.

```ts
console.error("scanner:attendance_failed", { status, detail });
console.error("scanner:member_roster_failed", …);
```

Mai un messaggio generico che collassa cause diverse (`meta-gates.md`, precedente
del newsletter in `CONCERNS.md`).

### S4 — Una modifica di schema porta il proprio `COMMENT`

**Fonte:** `20260921120000:927-929`, `:956-957`, `:879-880`.
**Applica a:** entrambe le migration della fase.

Ogni `CHECK` ricreato, ogni tabella rinominata e ogni funzione ridefinita porta
un `COMMENT ON …` che dice **quanti valori, da dove vengono, cosa resta leggibile
senza essere piu' scrivibile, e quale fase l'ha deciso**. Un commento che descrive
una regola che non c'e' piu' e' documentazione datata (`ai-engineering.md`).

### S5 — Il numero si rilegge dal gate, la prosa porta la data

**Fonte:** `conversion-manifest.mjs` (diff `74a577f`), `verify-capabilities.mjs:202-232`.
**Applica a:** `EXPECTED_KEY_COUNT` 17→15, `EXPECTED_PAIR_COUNT` 68→60,
`EXPECTED_GRANT_COUNT` 32→28, `EXPECTED_REFUSAL_COUNT` 36→32, e il censimento
delle pagine del manifest.

Il docblock chiede che **ogni movimento porti la propria riga di storia**: il
piano scrive la riga, non solo il numero.

### S6 — Un `ALTER TABLE` non muove i suoi satelliti

**Fonte:** `51-RESEARCH.md` §4.5, letto dai file.
**Applica a:** `membership_acts` → `account_acts`.

`RENAME TO` sulla tabella **non** rinomina vincoli, indici e policy: servono
`ALTER TABLE … RENAME CONSTRAINT`, `ALTER INDEX … RENAME TO`,
`ALTER POLICY … RENAME TO`, e i privilegi **si rileggono dal catalogo dopo**.
`ALTER FUNCTION … RENAME TO` conserva ACL e `SECURITY DEFINER`; `DROP`+`CREATE` no.

### S7 — Prima di scrivere una migration, si interroga il catalogo

**Fonte:** `20260921120000:94-112` — la fase 50 ha trovato **sei** funzioni dove
l'elenco letto dai file ne diceva quattro.
**Applica a:** entrambe le migration, e all'atto di cancellazione.

`pg_proc` (`pg_get_functiondef`, `prokind='f'`), `pg_policies`, `pg_constraint`,
`pg_indexes`, filtrati sui letterali `membership_acts`, `membership_code`,
`record_membership_act`, `'member'`. Il numero atteso lo dice questo documento;
**il numero vero lo dice il catalogo.**

---

## No Analog Found

| File | Ruolo | Data flow | Ragione |
|---|---|---|---|
| `src/lib/account/acts.ts` (da `src/lib/membership/acts.ts`) | modulo di tipi + lettura | CRUD read | `git log --diff-filter=R` su `src/lib/**` non trova **alcun** modulo spostato di directory in tutta la storia del repo. I precedenti di rinomina riguardano **rotte** (`24b511e`, `ab0c0c4`), che hanno un redirect a coprirle; un modulo no — si spostano il file **e ogni importatore, nello stesso commit**, e il build e' l'unico gate. `src/lib/membership/` resta **vuota e va cancellata**, o `verify:persona` controllo A la trova come path morto se qualche glob la nomina. |
| La cancellazione in produzione di `public.attendances` (D-51-04 + D-51-14) | atto operativo | batch delete | **Nessun precedente eseguito**: la fase 50 ha chiesto l'autorizzazione per una cancellazione di account e **non l'ha eseguita**, perche' il conteggio era zero (`50-AUTHORISATION.md` §1.0). L'analogo esiste solo come **forma** (`50-AUTHORISATION.md`) e come **gate** (`ai-engineering.md`, `51-RESEARCH.md` §3.4). Il planner usi §3.4 passo per passo: conteggio → cascata dal catalogo → istantanea → cattura degli `id` → autorizzazione datata → `DELETE … WHERE id = ANY($lista)` → conferma da **fonte diversa**. |
| La barra fissa dello scanner (D-51-05, testata spezzata in due) | client component | presentational | Nessun altro punto del prodotto ha una testata `sticky` spezzata in due livelli su cui copiare la misura. La causa e' **sostenuta dal codice** (blocco `sticky` di 355 righe, `:2802-3156`) ma **non misurata su uno schermo**: assunzione A2 della ricerca, confermata o smentita da `P-51-1` passo 6. Il planner non pianifichi la forma finale prima di quel passo. |

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `src/lib/offline/`,
`src/lib/routes/`, `src/lib/door/`, `src/lib/capabilities/`, `src/lib/rbac/`,
`src/lib/membership/`, `src/app/(members)/`, `src/app/sw.ts`,
`src/components/scanner/`, `scripts/`, `next.config.ts`,
`.planning/phases/50-via-le-iscrizioni/`, più `git log --diff-filter=R -M` su
`src/app/**/page.tsx` e `src/lib/**`.

**File letti in questa sessione, con riga citata:**
`supabase/migrations/20260921120000_drop_status_and_referral.sql` ·
`supabase/migrations/20260808000500_staff_role.sql` · `next.config.ts` ·
`src/lib/routes/next-redirect.ts` · `src/lib/routes/capability-routes.ts` ·
`src/lib/capabilities/keys.ts` · `src/lib/rbac/roles.ts` ·
`src/lib/supabase/middleware.ts` · `src/lib/offline/checkin-store.ts` ·
`src/lib/offline/sync-manager.ts` · `src/app/sw.ts` ·
`src/components/scanner/ScanFlash.tsx` · `src/app/(admin)/admin/scanner/ScannerClient.tsx` ·
`src/lib/membership/acts.ts` · `scripts/conversion-manifest.mjs` ·
`scripts/seed-lab-door.mjs` · `.planning/phases/50-via-le-iscrizioni/50-ESITI.md` ·
`.planning/phases/50-via-le-iscrizioni/50-AUTHORISATION.md`

**Commit analogo principale:** `74a577f` — *«via la pagina d'iscrizione, via la
home, via il redirect che resta in cache»*: pagina cancellata + redirect tolto +
entry di manifest mossa, **un commit solo**, con la deviazione dichiarata nel
messaggio invece che scoperta dopo.

**Pattern extraction date:** 2026-09-21
**Validita':** fino al primo deploy per ogni `file:riga`; per gli oggetti SQL,
**fino alla prossima lettura del catalogo** (S7).
