---
phase: 35-per-night-assignments
reviewed: 2026-08-09T05:21:04Z
depth: deep
files_reviewed: 45
files_reviewed_list:
  - src/lib/capabilities/server.ts
  - src/lib/capabilities/keys.ts
  - src/lib/door/require-operator.ts
  - src/lib/door/outcome.ts
  - src/lib/supabase/middleware.ts
  - src/app/api/tickets/checkin/route.ts
  - src/app/api/tickets/checkin/undo/route.ts
  - src/app/api/tickets/attendance/route.ts
  - src/app/(admin)/admin/scanner/page.tsx
  - src/app/(admin)/admin/scanner/ScannerClient.tsx
  - src/app/(members)/dashboard/page.tsx
  - src/app/(organizer)/organizer/events/[id]/assignments/page.tsx
  - src/app/(organizer)/organizer/events/[id]/assignments/actions.ts
  - src/app/(organizer)/organizer/events/[id]/assignments/AssignmentsClient.tsx
  - src/app/(organizer)/organizer/events/[id]/review/page.tsx
  - src/app/(admin)/admin/members/actions.ts
  - src/app/(admin)/admin/members/MemberActionNotice.tsx
  - src/lib/media/may-upload.ts
  - src/lib/media/strip-metadata.ts
  - src/app/api/media/finalize/route.ts
  - src/components/media/MediaUpload.tsx
  - src/app/(organizer)/organizer/events/[id]/media/page.tsx
  - src/app/(public)/events/[slug]/actions.ts
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/events/[slug]/MediaGallerySection.tsx
  - src/lib/offline/sync-manager.ts
  - src/lib/offline/checkin-store.ts
  - src/lib/membership/acts.ts
  - src/types/database.ts
  - src/utils/datetime.ts
  - package.json
  - scripts/rls-baseline.mjs
  - scripts/verify-capabilities.mjs
  - scripts/verify-media-strip.mjs
  - scripts/verify-no-credit-account.mjs
  - scripts/container/seed.mjs
  - supabase/migrations/20260805120000_door_scan_events.sql
  - supabase/migrations/20260809000000_party_assignments.sql
  - supabase/migrations/20260809001000_assignment_resolver.sql
  - supabase/migrations/20260809002000_assignment_acts.sql
  - supabase/migrations/20260809003000_party_credits.sql
  - supabase/migrations/20260809004000_door_scan_events_by_assignment.sql
  - supabase/migrations/20260809004500_event_media_party_id.sql
  - supabase/migrations/20260809004600_event_media_quarantine_bucket.sql
  - supabase/migrations/20260809005000_live_assignment_flag.sql
  - supabase/migrations/20260809006000_event_media_server_upload_only.sql
findings:
  critical: 2
  warning: 9
  info: 5
  total: 16
status: issues_found
---

# Phase 35: Per-Night Assignments — Code Review Report

**Reviewed:** 2026-08-09T05:21:04Z
**Depth:** deep (grafo di import e catene di chiamata: middleware → pagina → action/route → guardia → RPC → policy)
**Files Reviewed:** 45
**Status:** issues_found

## Summary

La fase e' scritta con una disciplina che rende difficile trovarci un difetto
banale: le tre catene principali — `middleware → scanner/page → checkin/route →
requireDoorOperator → my_access_context(uuid) → private.has_capability` arm 2,
`middleware → review/page → hasCapability({partyId})`, e `MediaUpload →
quarantena → finalize → stripImageMetadata → bucket pubblico` — reggono alla
lettura incrociata. Il secondo braccio della guardia (35-22) chiude davvero il
buco della scansione, `liveAssignmentCapabilities` non e' mai collassato con
`?? false` in nessuno dei quattro consumatori, e le due meta' della regola di
mezzanotte (`nightBoundaryInstant` / `public.party_end_instant`) rispondono la
stessa cosa.

**Il buco che resta e' il terzo, ed e' della stessa forma dei due gia' chiusi.**
`POST /api/tickets/attendance` — il check-in della guest list per nome, che alla
porta e' uno strumento della notte quanto la scansione — chiede ancora la sola
domanda di ruolo. Un assegnatario raggiunge lo scanner, vede la propria serata,
scansiona i QR, e prende **403 sul bottone accanto**. E il criterio di
accettazione che il piano 35-10 ha lasciato in piedi (`grep -c "await
requireDoorOperator(" == 2`) **rende quel fix un rosso**: e' un controllo che
difende il difetto che sorveglia.

Il secondo problema bloccante non e' un permesso troppo largo ma il suo
contrario, e sopravvive alla notte: `party_assignments_assignee_role_fk` non sa
nulla di `ends_at`, quindi **un'assegnazione scaduta e non revocata blocca per
sempre ogni scrittura sul ruolo** del suo titolare — inclusa
`deactivateMember`, che il codice stesso definisce «the URGENT one of the three
doors». Misurato in `postgres:17.6`, non dedotto.

Il resto sono nove warning, di cui tre della famiglia che questa fase dichiara
di rifiutare — cause distinte collassate in una frase sola — e uno su
`scripts/verify-media-strip.mjs`, l'unica guardia automatica contro un secondo
scrittore lato server, che riconosce come scrittura soltanto `.upload(`.

**Non riportato perche' gia' dichiarato:** le undici voci di
`deferred-items.md`, la coda non applicata, `20260809006000` dopo il deploy,
`.from("attendance")` congelato, il video non spogliato, l'assenza di test
runner.

---

## Critical Issues

### CR-01: Il check-in della guest list non riceve mai la notte — il terzo buco, e un grep che ne difende l'esistenza

**File:** `src/app/api/tickets/attendance/route.ts:877-880`
**Catena:** `ScannerClient.tsx:1826-1832` → `POST /api/tickets/attendance` → `requireDoorOperator()` **senza argomenti**
**Secondo percorso:** `src/lib/offline/sync-manager.ts:396-408` (`case "guest"`) → stessa route

**Issue:**

```ts
export async function POST(request: Request) {
  // Once per handler, same as the GET.
  const auth = await requireDoorOperator();
  if (!auth.ok) return refuse(auth);
```

E' esattamente la voce 7 di `deferred-items.md` — *«la scansione non riceve mai
la notte»* — sulla route sorella, non chiusa e non dichiarata da nessuna parte.
Il `GET` ha ricevuto entrambe le meta' (`:444-446` nomina la notte, `:464-488`
filtra la lista per assegnazione); il `POST`, che e' quello che **scrive**, e'
rimasto alla sola domanda di ruolo. E `staff` non tiene `door.operate` per
ruolo — e' una delle sei rinunce esplicite di
`20260809001000_assignment_resolver.sql:212-225`.

Conseguenza operativa, con la fase spedita e la coda applicata:

1. L'assegnatario passa il gate grossolano (`middleware.ts:385-392`), passa il
   gate di pagina (`scanner/page.tsx:82-89`), apre la propria serata, e
   `/api/tickets/attendance?partyId=X` gli restituisce la lista **inclusi gli
   ospiti in guest list** (sono nel payload: `AttendeeItem.isGuestList`).
2. `ScannerClient.tsx:2665-2668` disegna il bottone di check-in per ognuno di
   loro.
3. Il tap chiama questa route: **403 Forbidden**, davanti a una fila. E' il
   falso rifiuto che `checkin-offline.md` chiama la peggiore delle due
   asimmetrie.
4. Offline e' peggio: `sync-manager.ts:396` manda le voci `type: "guest"` alla
   stessa route, e `classifyResponse` mette `403` in **`blocked`** — il bucket
   che *«aspetta un nuovo login»*, e nessun login trasforma qualcuno in
   assegnatario. La scansione resta appesa per la stagione. E' la stessa
   diagnosi che il piano 35-12 ha scritto per i biglietti, sul ramo che nessuno
   ha guardato.

Peggiora due affermazioni scritte:

- `src/app/(admin)/admin/scanner/page.tsx:50-52` dichiara *«`requireDoorOperator({
  partyId })` in the three door routes — check-in, undo and attendance»*. Su
  `attendance` vale per il `GET` e non per il `POST`.
- `35-10-PLAN.md:125` e `:131` fissano come criterio di accettazione
  `grep -c "await requireDoorOperator(" == 2`. Aggiungere il secondo braccio al
  `POST` porta il conteggio a 3 e **fa fallire il criterio**: e' un controllo
  che rende rosso il proprio fix. Va riscritto insieme al codice.

**Fix:** dare al `POST` la stessa forma a due bracci del piano 35-22 — la
domanda per-notte **solo se** quella di ruolo ha gia' rifiutato, cosi' che il
percorso di `master`/`organizer` resti byte-identico. La notte c'e' gia': la si
legge dalla riga, non la si accetta dal corpo.

```ts
// src/app/api/tickets/attendance/route.ts, POST
const auth = await requireDoorOperator();

// La riga PRIMA della guardia per-notte: la notte non arriva dal corpo, arriva
// dalla riga che sta per essere scritta — cosi' non c'e' una seconda notte su
// cui agire (la stessa proprieta' che `checkin/route.ts:679-697` chiama
// "ONE name for the night").
let perNightOperatorId: string | null = null;

if (!auth.ok && auth.kind === "forbidden") {
  const { data: bound } = await getServiceClient()
    .from("guest_list_entries")
    .select("party_id")
    .eq("id", guestListEntryId)
    .maybeSingle();

  const night = (bound?.party_id as string | null) ?? null;
  if (!night) return refuse(auth);           // event-level: nessuna notte da appellare

  const perNight = await requireDoorOperator({ partyId: night });
  if (!perNight.ok) {
    // Stesso codice HTTP che il primo braccio aveva gia' prodotto, con una
    // causa propria — mai un 503 nuovo (35-22, readNightArm).
    return NextResponse.json(
      { error: "…", status: "door_night_not_assigned" },
      { status: auth.status }
    );
  }
  perNightOperatorId = perNight.userId;
}

const operatorId = auth.ok ? auth.userId : perNightOperatorId!;
```

e aggiornare `35-10-PLAN.md:131` a `== 3` (o al conteggio che il fix produce),
altrimenti il criterio resta un controllo che difende il difetto.

---

### CR-02: Un'assegnazione **scaduta** blocca per sempre ogni scrittura sul ruolo — inclusa la disattivazione urgente

**File:** `supabase/migrations/20260809000000_party_assignments.sql:351-376`
**Consumatori:** `src/app/(admin)/admin/members/actions.ts:1622-1662` (`deactivateMember`), `:1428` (`updateMemberRole`), `:1810` (`rejectMember`), `:675-727` (`describeBlockingAssignments`)

**Issue:** ci sono **due definizioni di «viva»** in questa fase, e non coincidono:

| Dove | Predicato |
|---|---|
| Resolver, `liveAssignmentCapabilities`, `liveDoorAssignments`, drain | `revoked_at IS NULL` **AND** `now() < ends_at` |
| `party_assignments_live_role_present` + `party_assignments_assignee_role_fk` | `revoked_at IS NULL` — e basta |

La chiave composta non conosce `ends_at`. Un'assegnazione che e' finita alle
06:00 di tre settimane fa, e che nessuno ha revocato — **lo stato normale, non
un caso limite: niente in questo prodotto revoca automaticamente, non c'e' un
cron in `vercel.json` che tocchi la tabella** — continua a portare
`assignee_role = 'staff'` e continua a puntare `public.profiles (id, role)`.
Quindi ogni `UPDATE profiles SET role = …` su quella persona e' rifiutato con
`23503`, per sempre.

Misurato in `postgres:17.6`, non dedotto:

```
ERROR:  update or delete on table "profiles" violates foreign key constraint "pa_fk" on table "pa"
DETAIL:  Key (id, role)=(1111…, staff) is still referenced from table "pa".
```

Le tre porte colpite sono nominate dal codice stesso
(`actions.ts:636-638`). La piu' grave e' `deactivateMember`, che scrive
`{ role: 'member', status: 'rejected' }` **in una sola transazione**
(`:1652-1653`): rifiutata la scrittura, l'account resta `staff` / `approved`,
cioe' **completamente attivo**. Il commento accanto dice *«the withdrawal is the
URGENT one of the three doors (somebody is being taken off an access, often the
same evening)»* — ed e' precisamente il caso che non passa.

Perche' e' un difetto e non «la regola che funziona»:

- La migration dichiara la conseguenza solo per un'assegnazione **LIVE**
  (`:435-441`, sezione 3c). Che valga anche per una scaduta **non e' scritto in
  nessun posto** — non nella migration, non in `deferred-items.md`, non in
  `35-VERIFICATION.md`.
- Contraddice il titolo di ASSIGN-02, *«l'accesso non sopravvive alla notte»*:
  qui un effetto dell'assegnazione sopravvive a ogni notte successiva, per
  sempre.
- L'uscita automatica non e' raggiungibile: `revokeAssignmentsAndDemote` esiste
  ma nessun controllo la invoca (`deferred-items.md`, voce 4, APERTA). Resta la
  strada a mano, che richiede di aprire la pagina assegnazioni di **ogni evento
  passato** che compare nell'elenco.
- Il testo che l'operatore legge e' fuorviante:
  `MemberActionNotice.tsx:203-204` dice *«A live per-night assignment…»* e
  `describeBlockingAssignments` (`actions.ts:726`) stampa *«N live
  assignment(s)»* per righe che sono morte da settimane.

**Fix** — due opzioni, entrambe monotone nella direzione permessa:

1. **Preferita, e chiude la deriva alla radice.** Rendere la chiave composta
   sensibile alla scadenza nell'unico modo che Postgres permette: azzerare
   `assignee_role` quando l'assegnazione non e' piu' viva. `MATCH SIMPLE` smette
   di controllare la chiave appena una colonna referenziante e' `NULL` — e' il
   meccanismo che la revoca gia' usa (`assignment_acts.sql:392-395`). Serve una
   migration nuova (la 20260809000000 non si riscrive) che:
   - allarghi `party_assignments_live_role_present` ad ammettere
     `assignee_role IS NULL` su una riga scaduta;
   - aggiunga un `expire_stale_assignments()` chiamato da un cron notturno, che
     esegue `UPDATE public.party_assignments SET assignee_role = NULL WHERE
     revoked_at IS NULL AND assignee_role IS NOT NULL AND now() >= ends_at`.
     **Non** tocca `revoked_at`: la riga resta non revocata, il drain continua a
     poter chiedere *«era viva alle 01:40?»*, e solo il blocco sul ruolo cade.

2. **Minima, se 1 e' fuori perimetro.** Filtrare per `ends_at` dove la fase
   parla di «live», e collegare l'uscita:
   - `actions.ts:679-683` — aggiungere `.gt("ends_at", new Date().toISOString())`
     e stampare separatamente le scadute, cosi' l'operatore sa che sta revocando
     storia;
   - collegare `revokeAssignmentsAndDemote` a `MemberTable.tsx` (voce 4);
   - correggere «live» in `MemberActionNotice.tsx:203` e in
     `20260809000000_party_assignments.sql:577-581`.

   Questa opzione **non toglie il blocco**: lo rende solo diagnosticabile e
   sbloccabile in un tap. Se si sceglie questa, va dichiarata come tale.

---

## Warnings

### WR-01: `20260809000000_party_assignments.sql` non e' idempotente — la seconda esecuzione aborta sulla riga che dovrebbe renderla idempotente

**File:** `supabase/migrations/20260809000000_party_assignments.sql:194-203`

**Issue:** il commento e' esplicito:

```
-- IDEMPOTENZA — WR-04 della code review del 2026-08-08. Questa coda si applica
-- A MANO, una riga alla volta. Senza il `DROP ... IF EXISTS`, una seconda
-- esecuzione di QUESTO file solleva `42710` … e lascia NON APPLICATA tutta la
-- coda che segue.
```

`DROP CONSTRAINT IF EXISTS` sopprime *«non esiste»*, non *«qualcosa dipende da
essa»*. Alla riga 372-376 lo stesso file crea
`party_assignments_assignee_role_fk`, che **REFERENCES public.profiles (id,
role)** e quindi dipende dall'indice unico che la riga 200 cerca di droppare.
Alla seconda esecuzione la riga 200 arriva prima del `CREATE TABLE IF NOT
EXISTS` (che non farebbe nulla) e Postgres rifiuta.

Misurato in `postgres:17.6`:

```
ERROR:  cannot drop constraint profiles_id_role_unique on table profiles because other objects depend on it
DETAIL:  constraint pa_fk on table pa depends on index profiles_id_role_unique
HINT:  Use DROP ... CASCADE to drop the dependent objects too.
```

Cioe' il file produce **esattamente** il fallimento che il suo commento dichiara
di prevenire — transazione in rollback, coda ferma — solo con `2BP01` invece di
`42710`. Su una coda applicata a mano, in cui riapplicare una riga per sicurezza
e' la reazione naturale a un dubbio, questa e' la forma sbagliata.

**Fix:** non droppare un vincolo referenziato. Creare il vincolo solo se manca:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'profiles_id_role_unique'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_role_unique UNIQUE (id, role);
  END IF;
END;
$$;
```

e correggere il paragrafo, che oggi asserisce una proprieta' che il file non ha.

---

### WR-02: `classifyWriteError` collassa cause distinte in due categorie che affermano fatti falsi

**File:** `src/app/(organizer)/organizer/events/[id]/assignments/actions.ts:263-278`

**Issue:** la funzione mappa uno SQLSTATE a una frase, e due dei quattro rami
hanno piu' di una causa.

**`23503 → "assignee_not_staff"`.** La riga di `party_assignments` ha *tre*
chiavi esterne: `party_id → event_parties`, `assigned_by → auth.users`, e
`capability → private.capabilities`. L'ultima e' **raggiungibile e prevista**:
`20260809000000_party_assignments.sql:243-255` dice in chiaro che fra la riga 7 e
la riga 8 della coda *«una riga che porta una di quelle tre [chiavi] non puo'
essere inserita: la chiave esterna non ha nulla a cui puntare»*, e che il fatto
e' scritto li' *«piuttosto che lasciarlo incontrare come un 23503 da chi applica
la riga 7 e si ferma prima della riga 8»*. Chi si ferma li' e prova ad assegnare
`media.upload` legge: **«This person is not staff»** — che e' falso, e manda
l'operatore a promuovere una persona gia' promossa.

**`P0002 → "no_live_assignment"`.** Sul ramo `assigned`,
`record_party_assignment_act` solleva `no_data_found` anche per
`party_assignments.subject_not_found` (`assignment_acts.sql:298-301`) e
`party_assignments.party_not_found` (`:342-345`). Un `assignToParty` su un
soggetto inesistente — una Server Action e' un endpoint pubblico, quindi non e'
solo teoria — risponde **«nothing was there to revoke»** a una richiesta che non
era una revoca.

E' il precedente del form newsletter (`.planning/codebase/CONCERNS.md`) nella
sua forma tipica, in un file il cui docblock (`:36-47`) promette il contrario.

**Fix:** distinguere per vincolo, non per famiglia. PostgREST espone il nome del
vincolo nel messaggio, ma il messaggio non e' leggibile in produzione — quindi
la distinzione va fatta **prima**, dove e' ancora un valore:

```ts
// 1. Il caso `capability` FK: rifiutabile in `validateTarget`, che gia' controlla
//    la forma. Una lettura di `private.capabilities` non e' disponibile ad
//    `authenticated`, quindi la si copre con una categoria propria a valle:
type AssignmentRefusal = … | "capability_not_in_catalogue" | "subject_not_found";

// 2. Il ramo P0002 si separa per ATTO, che il chiamante conosce:
function classifyWriteError(error: { code?: string | null }, act: "assigned" | "unassigned") {
  switch (error.code) {
    case NO_DATA_FOUND:
      return act === "unassigned" ? "no_live_assignment" : "subject_not_found";
    …
  }
}
```

Per il `23503` in finestra riga-7/riga-8: aggiungere a `validateTarget` una
sonda che chiede `record_party_assignment_act` solo dopo aver verificato che la
chiave esista, oppure — piu' semplice e sufficiente — aggiungere alla frase di
`assignee_not_staff` la seconda causa possibile, invece di affermarne una sola.

---

### WR-03: La superficie delle assegnazioni riporta quattro cause come «il server non ha risposto» — e per tre di esse e' falso

**File:** `src/app/(organizer)/organizer/events/[id]/assignments/AssignmentsClient.tsx:144-166`

**Issue:** `verifyOrganizerAccess` (`actions.ts:190-200`) puo' lanciare quattro
categorie distinte, e il docblock di `actions.ts:36-47` le elenca una per una
proprio per non collassarle. Il consumatore le collassa tutte:

```ts
} catch {
  setFeedback({ tone: "error", text: TRANSPORT_MESSAGE });
}
```

`TRANSPORT_MESSAGE` (`:104-105`) dice *«The server did not answer, so there is
no result to read — and, unlike every other message here, this one cannot tell
you whether the write landed.»* Per `forbidden.staff_manage_required`,
`forbidden.not_event_owner` e `capabilities.resolve_failed` il server **ha**
risposto, e ha risposto rifiutando: nulla e' stato scritto, e la frase afferma
il contrario. La piu' raggiungibile delle tre e'
`capabilities.resolve_failed` — un minuto storto del database durante una
sessione legittima — e in quel caso l'operatore va a controllare una scrittura
che non e' mai partita.

**Fix:** convertire il rifiuto della guardia in un valore invece che in un
throw, con la stessa forma che il resto della fase usa. La firma di
`AssignmentResult` esiste gia':

```ts
// actions.ts
export type AssignmentRefusal = … | "not_permitted" | "permission_unresolved";

async function verifyOrganizerAccess(eventId: string):
  Promise<{ ok: true; actorId: string } | { ok: false; reason: AssignmentRefusal }> {
  try {
    const ctx = await assertStaffManage();
    if (!ctx.userId) return { ok: false, reason: "permission_unresolved" };
    await assertEventOwnership(getServiceClient(), eventId, ctx);
    return { ok: true, actorId: ctx.userId };
  } catch (cause) {
    // Per POSIZIONE: assertStaffManage/assertEventOwnership rifiutano,
    // il resolver non risponde. Mai una `cause.message` letta.
    return { ok: false, reason: "permission_unresolved" };
  }
}
```

e aggiungere le due voci a `REFUSAL_MESSAGES`, che e' gia' un `Record` totale e
diventa quindi un errore di build finche' non sono scritte.

---

### WR-04: Un assegnatario `party.manage` puo' raggiungere la revisione solo della **prima** notte dell'evento

**File:** `src/app/(organizer)/organizer/events/[id]/review/page.tsx:165-167`, in combinazione con `src/lib/supabase/middleware.ts:87-89`

**Issue:**

```ts
const selectedParty =
  partyList.find((p) => p.id === requestedParty) ?? partyList[0] ?? null;
```

Il middleware apre `/organizer/events/<id>/review` a chi tiene `party.manage`
per **una qualunque** notte (`middleware.ts:415-423`). Arrivato li' senza
`?party=`, il gate a due bracci (`:200-206`) chiede `party.manage` su
`partyList[0]` — la prima notte per `sort_order`. L'assegnatario della seconda
notte non la tiene, quindi `redirect(refusalDestination)` → `/dashboard`.

E `?party=` non ha origine: l'unico posto che lo produce e'
`ReviewListClient.tsx:277`, il selettore di serata **dentro la pagina**, che si
disegna solo dopo che il gate e' passato. Nessun link, nessuna voce di
navigazione, nessuna pagina della dashboard porta un assegnatario alla propria
notte. Su un evento a piu' notti — che e' il caso normale da
`20260226300000_multi_sub_events.sql` — la superficie che ASSIGN-01 promette
esiste ed e' irraggiungibile per tutti tranne gli assegnatari della notte 1.

La direzione dell'errore e' sicura (rifiuto), ma il requisito non e'
consegnato, e nessun documento della fase lo dichiara.

**Fix:** far cadere il default sulla notte che il chiamante puo' effettivamente
gestire, invece che sulla prima in ordine di `sort_order`:

```ts
// Arm 1 invariato: un owner tiene tutte le notti e paga zero round trip in piu'.
let selectedParty = partyList.find((p) => p.id === requestedParty) ?? null;

if (!selectedParty && !holdsOrganizerAccess) {
  // Chi arriva per assegnazione: la prima notte che apre davvero, non la prima
  // in calendario. Una risoluzione per notte, memoizzata per `partyId` dentro
  // il render, e solo su questo ramo.
  for (const p of partyList) {
    if (await hasCapability(CAP.PARTY_MANAGE, { partyId: p.id })) {
      selectedParty = p;
      break;
    }
  }
}

selectedParty ??= partyList[0] ?? null;
```

E, separatamente, dare all'assegnatario un punto di partenza: la dashboard e'
il posto dove `?access=not-assigned-here` gia' gli parla.

---

### WR-05: Il selettore di serata dello scanner butta via tutte le risposte d'errore — inclusi i due esiti che questa fase ha creato per essere visti

**File:** `src/app/(admin)/admin/scanner/ScannerClient.tsx:638-651`

**Issue:**

```ts
const res = await fetch("/api/tickets/attendance");
if (res.ok) {
  const data = await res.json();
  setParties(data.events ?? []);
}
} catch {
  // silently fail
}
```

Nessun ramo `else`, nessuna notice, nessun `console.error`. La lista resta
vuota, e sullo schermo *«nessuna serata stasera»* e *«non si e' potuto
leggere»* sono la stessa cosa.

Il punto non e' che la funzione sia vecchia — non e' toccata da questa fase — ma
che la fase ha aggiunto **due esiti nuovi a questa esatta chiamata** con lo
scopo dichiarato di essere osservabili, e questo e' l'unico consumatore:

- `attendance/route.ts:473-480` — `503` + `DOOR_UNRESOLVED_STATUS`, il cui
  commento dice *«NOT an empty list … so an error can never wear the costume of
  "nobody is on tonight"»*. Il costume e' proprio questo.
- `attendance/route.ts:545-553` — `500` + `attendance.parties_lookup_failed`,
  il cui log dice *«This is NOT "no nights tonight"»*.

`meta-gates.md` e' esplicito: un fallimento che conta ha bisogno di un **effetto
osservabile**, e qui non c'e' nemmeno la riga di log. Alle due di notte, un
assegnatario davanti a un selettore vuoto conclude che non e' di turno.

**Fix:** trattare la lista come `fetchAttendance` gia' tratta la sua
(`:681-702`) — le `cacheNotices` esistono e sono disegnate:

```ts
const res = await fetch("/api/tickets/attendance");
if (!res.ok) {
  let category: string | null = null;
  try { category = readString(await res.json(), "status"); } catch {}
  console.error("scanner:parties_failed", { status: res.status, category });
  setCacheNotices([{
    key: "parties",
    tone: "error",
    text: res.status === 503
      ? "This device could not be told which nights it may work — this is NOT a refusal. Get signal and reload."
      : `The list of nights was NOT loaded (HTTP ${res.status}). This is not "no nights tonight".`,
  }]);
  return;
}
```

---

### WR-06: `verify-media-strip` riconosce come scrittura soltanto `.upload(` — e la sua ragione dichiarata e' proprio il secondo scrittore lato server

**File:** `scripts/verify-media-strip.mjs:236-274`

**Issue:** il controllo A segna una riga come scrittura solo se, entro otto
righe o fino al prossimo `;`, la finestra contiene `.upload(`. Lo script
dichiara di sapere di un buco — i nomi di bucket costruiti a runtime — e chiude
il paragrafo cosi':

> *This script is the guard against a SERVER-side second writer, which is the one
> RLS cannot refuse.*

Ma tre scritture di `@supabase/storage-js` non sono `.upload(`, sono letterali e
sarebbero **invisibili**:

| Chiamata | Effetto sul bucket pubblico |
|---|---|
| `.from("event-media").copy(src, dst)` | crea un oggetto nuovo, byte non spogliati |
| `.from("event-media").move(src, dst)` | idem |
| `.from("event-media").createSignedUploadUrl(path)` | restituisce al **browser** un permesso di scrittura diretta — cioe' esattamente cio' che `20260809006000` toglie |

La terza e' la peggiore: la riga 15 della coda toglie la policy `INSERT` al
browser, e un `createSignedUploadUrl` gliela ridarebbe passando dal service
role, lasciando `verify:media-strip` verde e la migration formalmente applicata.
E' il difetto di forma che questa fase ha gia' trovato due volte al suo interno
(35-17, 35-20 M2): un controllo che la cosa che sorveglia puo' soddisfare.

**Fix:** riconoscere l'insieme delle scritture, non una sola:

```js
const WRITE_CALLS = ['.upload(', '.copy(', '.move(', '.createSignedUploadUrl(', '.uploadToSignedUrl('];
…
if (WRITE_CALLS.some((c) => window.includes(c))) {
  hits.push({ path: relPath, line: i + 1, text: raw.trim(), kind: 'writes to the bucket' });
}
```

e provarlo per mutazione: inserire un `.copy(` in un file di `src/` deve far
uscire lo script con 1, poi ripristinare — e **asserire che la mutazione sia
andata a segno** prima di leggerne l'esito (`ai-engineering.md`, gate *prova per
mutazione*).

---

### WR-07: `registerMedia` accetta un `storagePath` qualunque — la meta' che il controllo di proprieta' non copre

**File:** `src/app/(public)/events/[slug]/actions.ts:154-190`

**Issue:** `/api/media/finalize` verifica che la chiave sia della persona che
chiama, e spiega perche':

```
// Exactly three segments, the first two being the event named in the body
// and **the id of whoever is calling**. Without this, any approved account
// could hand this route somebody else's quarantine key and have their file
// published under their name
```
(`finalize/route.ts:468-494`)

`registerMedia`, che scrive la **riga** e quindi decide cosa entra nella coda di
moderazione e poi nella galleria, non fa nessun controllo equivalente:

```ts
const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-media/${storagePath}`;
```

Una Server Action e' un endpoint pubblico. Un account che tiene `media.upload`
su una notte — cioe' esattamente il fotografo che questa fase ammette — puo'
chiamarla direttamente con la chiave di un oggetto **di qualcun altro**, incluso
un oggetto la cui riga e' stata `rejected` (che, per
`media-and-storage.md` gate *moderazione = rimozione*, resta scaricabile nel
bucket pubblico). Il risultato e' una riga `pending` nuova, `uploaded_by` = loro,
che punta a un contenuto gia' rifiutato: la moderazione si ripete da capo e, se
approvata, il contenuto rifiutato torna in galleria.

Non e' l'esfiltrazione di un segreto — il bucket e' pubblico — ma e' un
aggiramento della moderazione, ed e' l'unica meta' della coppia
`finalize`/`registerMedia` a cui il controllo manca.

**Fix:** applicare la stessa forma di chiave, una volta sola:

```ts
// La chiave e' quella che /api/media/finalize ha restituito: tre segmenti,
// i primi due questo evento e questo chiamante. Ripetuto qui e non condiviso
// perche' la route non puo' importare da un file "use server".
const segments = storagePath.split("/");
if (segments.length !== 3 || segments[0] !== eventId || segments[1] !== user.id) {
  throw new Error(MEDIA_PATH_NOT_YOURS);
}
```

---

### WR-08: `src/types/database.ts` afferma sul registro il contrario di cio' che questa stessa fase ha misurato

**File:** `src/types/database.ts:498-507`

**Issue:**

```
* Both role pairs and both status pairs stay NULL on those two acts, and that
* is not an omission: an assignment moves neither axis.
```

E' falso, ed e' stato **misurato falso dentro la fase**. Tre file dicono il
contrario:

- `supabase/migrations/20260809002000_assignment_acts.sql:423-430` — *«It does
  not leave the four register columns null … so on an assignment act all four
  come out NON-NULL and equal … Measured against a container; the opposite was
  written here first, and was wrong.»*
- `src/lib/membership/acts.ts:55-62` — stessa cosa, con la conseguenza utile
  (`role_before` conserva il ruolo al momento del grant).
- `deferred-items.md`, voce 6 — APERTA, e nomina come primo lettore proprio la
  superficie che legge il registro.

`supabase-data.md`, gate *tipi allineati*: *«Un tipo che mente e' peggio di un
tipo assente, perche' il compilatore conferma un errore.»* Qui il compilatore non
c'entra, ma il catalogo per il lettore si': chi apre `MembershipActRow` per
scrivere la vista della storia di un membro leggera' un valore presente e
concludera' «l'asse e' stato toccato», che e' esattamente l'errore che la voce 6
prevede.

**Fix:** sostituire il paragrafo con quello misurato, e citare la voce 6:

```
* I quattro campi NON restano NULL su questi due atti, e la differenza conta.
* `public.record_membership_act` calcola gli after come `coalesce(argomento,
* before)`, quindi un atto di assegnazione scrive ruolo e stato correnti su
* entrambi i lati: `role_before === role_after` e `status_before ===
* status_after`. **`before === after` e' il modo in cui questo registro dice
* "l'atto non ha mosso quell'asse"** — non il NULL che
* `20260808002000_membership_register.sql:244-246` documenta e che nessun writer
* ha mai prodotto (`deferred-items.md`, voce 6).
```

---

### WR-09: La query che decide se una scansione in coda e' un'ammissione o un `not_valid` usa la chiave scritta a mano

**File:** `src/app/api/tickets/checkin/route.ts:308`

**Issue:**

```ts
.eq("capability", "door.operate")
```

`CAP` e' importato in questo stesso file (`:5`) e usato dieci righe dopo
(`:546`, `liveAnywhere.has(CAP.DOOR_OPERATE)`). La route sorella usa la
costante (`attendance/route.ts:212`). Questa e' l'unica occorrenza letterale.

`keys.ts:17-36` spiega perche' conta: *«a misspelled capability key is a runtime
`false`, not a compile error»*, e qui il `false` non e' un rifiuto qualunque —
`judgeAtScanTime` che non trova righe risponde `never_assigned`
(`:327`), il che fa scrivere una riga `not_valid` con
`reason: "no_assignment_at_scan"` e mandare la voce in `failedCheckins`
(`:1045-1057`). Cioe' **una persona che e' davvero entrata sparisce dal record
della serata come non ammessa**, in silenzio, il giorno in cui la chiave viene
rinominata. E la rinomina e' prevista dal file stesso (`keys.ts:34-36`, *«Editing
this file means editing the migration in the same commit»*), che non puo' vedere
questa stringa.

**Fix:**

```ts
.eq("capability", CAP.DOOR_OPERATE)
```

---

## Info

### IN-01: `DOOR_NIGHT_ERROR` e' l'unico `Record` della fase che non e' totale sulla propria union

**File:** `src/app/api/tickets/checkin/route.ts:410-417`, `:430-432`

`Record<string, string>` invece di un totale sui tre literal, e `refuseNight`
accetta `status: string`. Ogni altro `Record` della fase — `DOOR_HTTP`,
`FINALIZE_HTTP`, `FINALIZE_QUARANTINE`, `CAP_DESCRIPTIONS`, `NOT_VALID_REASONS`,
`REFUSAL_MESSAGES`, `NOTICES` — e' totale proprio per rendere una voce mancante
un errore di build. Qui una quarta causa aggiunta senza frase produce
`error: undefined` nel corpo di un 403, a runtime.

**Fix:** `const DOOR_NIGHT_ERROR: Record<typeof DOOR_NIGHT_NOT_ASSIGNED | typeof DOOR_NIGHT_OTHER_NIGHT | typeof DOOR_NIGHT_UNRESOLVED, string> = { … }` e tipizzare `refuseNight` sulla stessa union.

### IN-02: `party_credits_select_published` e' l'unica policy nuova con un `EXISTS` inline nel corpo

**File:** `supabase/migrations/20260809003000_party_credits.sql:219-228`

E' la forma che `20260809004500_event_media_party_id.sql:307-333` ha misurato e
sostituita con `private.party_event_id` (`SECURITY DEFINER`), perche' una
sottoquery in un corpo di policy legge con i privilegi del **chiamante** e
trasforma un controllo sulla forma della riga in un controllo su chi sta
chiedendo. Oggi e' innocua: `event_parties_select_published` e la policy pubblica
su `events` coincidono con `e.is_published = true` per ogni ruolo, quindi la
risposta e' uniforme, e la direzione di un eventuale scarto sarebbe restrittiva.
Ma la forma e' quella appena bandita, un file piu' in la', senza una riga che lo
dica.

**Fix:** o un accessor `private.party_is_published(uuid)` `SECURITY DEFINER`, o
un paragrafo che dichiari perche' qui l'inline e' accettato — cosi' che il
prossimo lettore non copi la forma sbagliata dalla piu' recente delle due.

### IN-03: Una migration gia' applicata e' stata modificata

**File:** `supabase/migrations/20260805120000_door_scan_events.sql:151-152`

Solo un commento (il vecchio testo prometteva Phase 35; il nuovo dice che la
policy e' superata due volte), quindi nessun oggetto cambia e un replay da vuoto
produce lo stesso schema. Resta che `supabase-data.md`, gate *migration in
avanti*, chiama il file con il timestamp *«un fatto storico»*. La correzione era
giusta e utile; il posto no.

**Fix:** portare la nota nella migration che supera la policy
(`20260809004000`), e lasciare il file storico invariato.

### IN-04: Una voce del `Record` totale del finalize e' irraggiungibile

**File:** `src/app/api/media/finalize/route.ts:279`, `:496`, `:707`

`FINALIZE_QUARANTINE[MEDIA_FINALIZE_PATH_NOT_YOURS] = "remove"`, ma
`ownedQuarantinePath` viene valorizzato solo **dopo** che il controllo di
proprieta' e' passato (`:496`), e il `finally` rimuove solo se
`ownedQuarantinePath !== null` (`:707`). Su quel ramo non si rimuove mai. La
scelta e' giusta — non si cancella la chiave di un altro — ma la tabella dichiara
un comportamento che non avviene.

**Fix:** cambiare la voce in `"keep"` e scrivere accanto che l'oggetto, se
esiste, e' di qualcun altro e non tocca a questa richiesta rimuoverlo.

### IN-05: I limiti di dimensione mostrati all'utente non sono quelli applicati, e ora c'e' un terzo tetto

**File:** `src/components/media/MediaUpload.tsx:68-69`, `:248-251`

`MAX_PHOTO_SIZE` e' 50 MB e `MAX_VIDEO_SIZE` 500 MB, ma il messaggio dice
`"10MB"` / `"100MB"`. Preesistente e non toccato dalla fase. Cio' che la fase
aggiunge e' un terzo tetto: `event-media-quarantine` ha
`file_size_limit = 104857600` (`20260809004600:100-107`), quindi un video fra 100
e 500 MB e' accettato dalla validazione, rifiutato dal deposito, e la persona
legge *«the file could not be placed in the holding area»* senza sapere che e'
una questione di dimensione.

**Fix:** derivare le tre soglie da una costante sola e nominare la dimensione nel
messaggio del deposito quando `depositError` porta uno status 413.

---

_Reviewed: 2026-08-09T05:21:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
