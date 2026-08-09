---
phase: 35-per-night-assignments
plan: 07
subsystem: access-gating
tags: [dal, capabilities, door, per-night, assign-05, assign-08, wave-4]

# Dependency graph
requires:
  - plan: 35-03
    provides: "`public.my_access_context(uuid)`, il secondo braccio null-safe di `private.has_capability`, e `CAP.DOOR_SUPERVISE` in `keys.ts` — migration NON applicata"
  - plan: 35-02
    provides: "`public.party_end_instant(date, time)` e la colonna `ends_at` che il resolver confronta con `now()` — migration NON applicata"
  - plan: 33-04
    provides: "`requireDoorOperator()`, l'unione taggata a quattro rami e `DOOR_UNRESOLVED_STATUS` — in produzione"
provides:
  - "`getPartyAccessContext(partyId)` — l'unico posto in cui si chiede «puo' X in QUESTA notte»"
  - "`hasCapability(key, { partyId })` — la forma riservata da `guards.ts:86-92`, ora reale e source-compatible"
  - "`requireDoorOperator({ partyId })` con `mayScan`, `maySupervise`, `validUntil`, `resolvedAt` sul ramo `ok: true`"
  - "`DOOR_SUPERVISION_REQUIRED` e `DOOR_SUPERVISION_REQUIRED_ERROR`"
  - "il primo consumatore di `door.supervise`: `verify:capabilities` passa da 3 a 2 chiavi senza chiamante"
affects: [35-08, 35-09, 35-10, 35-11, 35-13, 35-16, 35-17, 35-21]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "due funzioni di contesto invece di una con argomento opzionale: `cache()` memoizza per argomento, e la forma a zero argomenti e' quella che il middleware chiama a ogni navigazione"
    - "un input malformato non e' il quarto esito: laundering di un errore permanente dentro un bucket retryabile e' un ciclo infinito davanti a una fila"
    - "una cortesia dell'interfaccia non puo' far cadere un'autorizzazione: `readNightEnd` e' totale per costruzione"
    - "il verdetto di supervisione viene dalla stessa risoluzione del verdetto di scansione, quindi un `false` non puo' strutturalmente stare al posto di una domanda senza risposta"

key-files:
  created: []
  modified:
    - src/lib/capabilities/server.ts
    - src/lib/door/require-operator.ts

key-decisions:
  - "`validUntil` si legge da `event_parties.date` + `end_time` via `partyEndInstant`, non da `party_assignments.ends_at`: il piano chiede `null` quando la notte non dichiara un orario di fine, e `ends_at` non lo conserva (il writer lo calcola con `coalesce(ep.end_time, '06:00')`)"
  - "La seconda lettura e' sequenziale e solo dopo il verdetto: in parallelo i rami di rifiuto tornerebbero prima che la seconda promise sia attesa — una rejection pendente — e il ramo di rifiuto e' quello che una scansione in coda ritenta"
  - "Un `partyId` non-uuid lancia FUORI dal `try`: dentro sarebbe `unresolved` 503, che `sync-manager.ts:141` ritenta per tutta la notte su un errore permanente"
  - "`maySupervise` senza `partyId` riporta cio' che conferisce il RUOLO e nulla piu' — la stessa silenziosita' della guardia SQL sul NULL, non un'omissione"

# Metrics
metrics:
  duration: "~55 min"
  completed: 2026-08-09
  tasks_completed: 2
  tasks_total: 2
  checkpoint_open: false
---

# Fase 35 Piano 07: la domanda per-notte diventa chiamabile — Summary

La cucitura fra il resolver e il codice applicativo. `hasCapability(key, {
partyId })` era una **forma riservata** in un commento di `guards.ts` dal piano
33-01; adesso e' una funzione, e arriva fino alla porta — dove il confine non e'
la RLS, perche' le tre route scrivono con il client service che la bypassa, ma
`requireDoorOperator()`.

**Nessuna delle migration che questo codice chiama e' applicata in produzione.**
`public.my_access_context(uuid)` e' la riga 8 della coda di `35-HUMAN-UAT.md`.
`npm run build` e' verde **senza** di essa, perche' i tipi vengono da
`src/types/database.ts` e nessun client di questo repository e' parametrizzato
con un generico `Database`: `supabase.rpc("my_access_context", { p_party_id })`
e' **non tipizzato**. Il verde non dice che la funzione esista.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | `hasCapability(key, { partyId })` nel DAL | `841c607` | `src/lib/capabilities/server.ts` |
| 2 | `requireDoorOperator({ partyId })` restituisce di piu' | `72f8eb7` | `src/lib/door/require-operator.ts` |

**Lingua:** commenti e identificatori in inglese, come i due file che estendono.

---

## Il DAL — `src/lib/capabilities/server.ts`

| Cosa | Dove |
|---|---|
| `getPartyAccessContext(partyId)`, memoizzata **per `partyId`** | `:291` |
| la chiamata con `p_party_id`, argomento **nominato** | `:308-310` |
| `UUID_PATTERN`, copiato da `checkin/undo/route.ts:23-24` | `:236` |
| `party.invalid_id` — categoria distinta, lanciata prima di costruire un client | `:298` |
| `interpretAccessContext`, l'interpretazione del payload estratta una volta | `:325` |
| `hasCapability(key, opts?)` | `:430` |

**`getAccessContext()` non e' stata toccata**: stessa firma a zero argomenti,
stessa memoizzazione, stessa chiamata a `my_access_context()`. Entrambe le
chiamate RPC restano nel file, una per funzione SQL esposta — l'*interpretazione*
e' condivisa, la *chiamata* no.

**Perche' due funzioni e non una con argomento opzionale.** Il paragrafo e'
scritto nel docblock del modulo, perche' il prossimo lettore lo chiedera'.
`cache()` chiave sull'argomento: la forma a zero argomenti ha una entry per
render, quella per-notte ne ha una per notte — che e' il requisito, non
un'ottimizzazione. Ma la ragione forte e' un'altra: **quando la notte non e'
nominata il braccio per-notte deve essere muto, mai permissivo**, ed e' la
proprieta' che 35-03 ha provato per mutazione (16/16 con la guardia, **13/16**
senza, e uno dei tre che cadono e' la forma con cui chiamano tutte e 70 le
policy). Una firma che fa sembrare la notte un dettaglio dimenticabile
reintrodurrebbe quella forma nel TypeScript.

**Il rifiuto di un `partyId` non-uuid e' all'ingresso, con categoria propria.**
`capabilities.resolve_failed` significa *«la domanda e' stata posta e non ha
avuto risposta»*; `party.invalid_id` significa *«la domanda non era ben posta»*.
Inoltrare un non-uuid produrrebbe un `22P02` da PostgREST, cioe' un errore di
input travestito da fallimento di lookup — e alla porta si leggerebbe come
*«non ho potuto verificare il permesso di questo account»*.

**Nessun `catch` in questo file restituisce un valore. Non c'e' nessun blocco
`catch` in questo file** — `grep -nE "^\s*\} catch"` non trova nulla.

---

## La porta — `src/lib/door/require-operator.ts`

Il ramo `ok: true` dell'unione taggata (`:248-256`):

```ts
  | {
      ok: true;
      userId: string;
      mayScan: true;
      maySupervise: boolean;
      validUntil: string | null;
      resolvedAt: string;
    }
```

I tre rami di rifiuto sono **invariati**: 401, 403, 503 con
`DOOR_UNRESOLVED_STATUS`.

| Cosa | Dove |
|---|---|
| `DOOR_SUPERVISION_REQUIRED` | `:206` |
| `DOOR_SUPERVISION_REQUIRED_ERROR` | `:216` |
| `requireDoorOperator(opts?)` | `:296` |
| la **sola** risoluzione, per-notte o no | `:311-313` |
| `maySupervise`, dalla stessa risoluzione | `:355` |
| `readNightEnd`, totale per costruzione | `:385` |

### Tre domande, una risoluzione — e la proprieta' invece della promessa

Il piano chiede che il fallimento della risoluzione del verdetto di supervisione
prenda lo stesso trattamento di `unresolved` e non venga mai collassato in
`maySupervise: false`. **Qui non e' una promessa: e' una proprieta'
strutturale.** C'e' una sola risoluzione, e se fallisce la funzione ha gia'
restituito il ramo `unresolved` prima che `maySupervise` esista. Non c'e' un
punto del codice in cui un `false` possa stare al posto di una domanda senza
risposta.

### `maySupervise` senza `partyId` — la stessa silenziosita' della guardia SQL

Senza notte, `maySupervise` riporta cio' che conferisce il **ruolo** e nulla
piu': un'assegnazione non contribuisce a una domanda che non nomina una notte.
E' esattamente `p_party_id is not null`, la prima condizione del braccio 2,
rispecchiata in TypeScript.

**Ma e' anche un falso negativo per chi dimentica la notte**, e alla porta un
falso negativo e' un rifiuto davanti a una fila. Il docblock lo scrive in
grassetto — *«to ask the supervision question, name the night»* — perche' nessun
compilatore lo vedra' e questo repository non ha un test che se ne accorga.
E' il costo dichiarato della firma che il piano prescrive; l'alternativa
tipizzata (overload che espone `maySupervise` solo con `partyId`) e' stata
**considerata e rifiutata**, perche' cambia la forma che il piano dichiara
source-compatible e aggiunge complessita' di overload su codice critico.

### `validUntil` — cortesia, mai confine

`validUntil` e' l'istante in cui la notte finisce; `resolvedAt` e' l'orologio
**del server** alla risoluzione. La coppia esiste perche' il dispositivo possa
**misurare la deriva del proprio orologio invece di fidarsene** — un telefono
avanti di venti minuti alle 02:00 non deve scadere un verdetto venti minuti
prima.

Il confine resta `now() < pa.ends_at`, sull'orologio del server, dentro il
resolver. Il lessico ha gia' il suo precedente in questo repository:
`checkin-store.ts:135-136`, *«Device clock at the read. Evidence, not
authority.»*

**La conversione passa da `partyEndInstant`** (`src/utils/datetime.ts:122`).
`event_parties.date` e' una DATE e `end_time` una TIME, entrambe **senza fuso** e
entrambe ora locale di Torino: `new Date(\`${date}T${end_time}\`)` verrebbe
interpretata nel fuso del runtime, che su Vercel e' UTC — uno scarto di una o due
ore che non solleva nessun errore. E una notte che finisce alle `06:00` e' il
mattino **successivo** alla data sotto cui e' archiviata: la regola della
mezzanotte vive in quel modulo e non e' stata riderivata qui. Il modulo lo scrive
esplicitamente: *«a variant of this conversion inlined at a call site is the
defect this module exists to prevent»*.

**`null` ha piu' di una causa**, ed e' un collasso deliberato: la notte non
dichiara un `end_time`; la riga non e' visibile a questo lettore
(`event_parties_select_admin` chiede `staff.manage`, che un assegnatario di una
sola notte **non** ha, quindi non vede la party di un evento non pubblicato); o
la lettura non ha risposto. Per il consumatore la conseguenza e' la stessa e
va nella direzione sicura — nessuna scadenza, quindi il dispositivo torna a
chiedere al server. Per la diagnosi restano distinte, grazie alla categoria
`[door.night_end_unreadable]` sulla lettura (`:398-402`).

### Il costo, dichiarato

| Forma | Round trip |
|---|---|
| `requireDoorOperator()` | **1** — invariato |
| `requireDoorOperator({ partyId })`, rifiuto | **1** — la lettura della notte non avviene |
| `requireDoorOperator({ partyId })`, `ok` | **2** |

La seconda lettura e' **dopo** il verdetto e **solo** se `ok`. Il parallelismo e'
stato considerato e rifiutato: i rami di rifiuto tornano prima che la seconda
promise sia attesa, cioe' una rejection pendente, e il ramo di rifiuto e' quello
che una scansione in coda ritenta.

### `door.invalid_party_id` lanciato fuori dal `try`

Un `partyId` malformato e' un **bug del chiamante** — la route valida il proprio
body e risponde 400, come `checkin/undo/route.ts` gia' fa. Non e' uno dei quattro
esiti, e la scelta e' misurata sulla tabella di `sync-manager.ts:129-141`:

| Se fosse… | Bucket | Conseguenza |
|---|---|---|
| `unresolved` 503 | retry | un id malformato ritentato per tutta la notte |
| `forbidden` 403 | blocked | una coda che un nuovo login non sblocca — Pitfall 2 |

Quindi lancia, **prima di ogni `await` e fuori dal `try`**, perche' il quarto
esito conservi il suo significato esatto.

---

## Deviazioni dal piano

### 1. [Rule 1 — un controllo gia' rosso sul file non toccato] `grep -c 'catch' <= 2`

- **Trovata durante:** task 2, eseguendo il controllo prima di modificare il file.
- **Il fatto:** `grep -c 'catch'` conta **righe**, e la prosa del docblock
  esistente nomina `catch` cinque volte — la sezione *«the one legitimate
  `catch`»*, il divieto `never catch { return false }`, e le due righe che
  dicono di non cancellarlo. Sul file **non modificato** il conteggio e' **7**.
  Il criterio a fianco (*«Il file contiene un solo blocco `catch`»*) e' quello
  vero e lo contraddice: soddisfare il grep richiederebbe di cancellare i
  paragrafi che il piano stesso ordina di leggere per primi (`read_first`).
- **Cosa e' stato fatto:** il controllo e' sostituito da uno che misura il
  **blocco** invece della parola — `grep -cE "^\s*\} catch"`, che vale **1**
  prima e dopo. E' la stessa scelta che 35-03 ha registrato due volte per la
  migration: un controllo che va letto aggirandolo e' un controllo che la terza
  volta viene ignorato.
- **Commit:** `72f8eb7`

### 2. [Rule 3 — bloccante, di forma] L'interpretazione del payload estratta in una funzione

- **Trovata durante:** task 1.
- **Il fatto:** il criterio pretende che `grep -n "my_access_context"` mostri
  **entrambe** le chiamate RPC. Due chiamate distinte con il corpo di
  interpretazione duplicato sarebbero due copie dello split `42501`, del
  controllo di forma e della mappatura a quattro campi — ognuno con la propria
  ragione misurata, e ognuna da correggere due volte.
- **Cosa e' stato fatto:** le due chiamate RPC restano distinte (`:259` e
  `:308`); l'interpretazione e' `interpretAccessContext` (`:325`), invocata da
  entrambe. Nessun comportamento cambia sul percorso a zero argomenti.
- **Commit:** `841c607`

Nessun'altra deviazione. Nessun gate di autenticazione incontrato.

---

## Verifiche eseguite

| Verifica | Comando | Esito |
|---|---|---|
| Typecheck | `npm run build` | **PASS** — `✓ Compiled successfully`, `Running TypeScript` senza errori |
| Nessun call site esistente toccato | `git diff --name-only -- src/` dopo ogni task | **PASS** — un solo file per task |
| Entrambe le chiamate RPC presenti | `grep -n "my_access_context" src/lib/capabilities/server.ts` | **PASS** — `:259` a zero argomenti, `:308` con `p_party_id` |
| Il DAL non tocca il client service | `grep -c "getServiceClient" src/lib/capabilities/server.ts` | **PASS** — 0 |
| Nessun `catch` che restituisca un valore nel DAL | `grep -nE "^\s*\} catch"` | **PASS** — nessun blocco `catch` nel file |
| Le due costanti di supervisione | `grep -c 'DOOR_SUPERVISION_REQUIRED'` | **PASS** — 3 |
| Nessun test di stato nella guardia della porta | `grep -niE "status *[=!]== *['\"](approved\|pending\|rejected)"` | **PASS** — nessuna riga |
| Un solo blocco `catch` nella guardia | `grep -cE "^\s*\} catch"` | **PASS** — 1 |
| Il ramo `ok: true` porta i tre campi | lettura, `:248-256` | **PASS** |
| Identita' dagli header | `npm run verify:no-header-identity` | **PASS** — A e B verdi |
| I cinque lati del modello | `npm run verify:capabilities -- --target=container` | **PASS** — `5/5 green, 1 warning(s)`, 49 migration applicate nel container |

### Il warning del quarto lato si e' ristretto, e questo e' il segnale

Prima di questo piano il lato 4 nominava **tre** chiavi senza chiamante. Ora ne
nomina **due**:

```
  ! 4 · every catalogue key is asked for by a policy or by src/
      "media.upload" is in the catalogue but NEITHER a policy NOR src/ asks for it.
      "party.manage" is in the catalogue but NEITHER a policy NOR src/ asks for it.
```

`SRC` passa da 8 a 9 chiavi e include `door.supervise`. **Questo piano da' a
`door.supervise` il suo primo consumatore**, come `35-03-SUMMARY.md` aveva
dichiarato che avrebbe fatto. Le due che restano hanno i loro piani nominati:
`media.upload` a 35-16 e 35-21, `party.manage` a 35-09 e 35-17. Nulla e' stato
modificato per far tacere il warning.

### Cosa queste verifiche NON provano

- **`public.my_access_context(uuid)` non esiste in produzione.** Il codice che la
  chiama e' stato scritto contro una migration che sta in coda. Finche' la riga 8
  di `35-HUMAN-UAT.md` non e' applicata, ogni chiamata con `partyId` fallirebbe —
  e fallirebbe **rumorosamente**, con `capabilities.resolve_failed: <code>` e,
  alla porta, con il ramo `unresolved` a 503. Questo e' il comportamento
  corretto, non un difetto: **nessun call site con `partyId` esiste ancora**, ed
  e' anche perche' i piani che li scrivono (35-11, 35-13) vengono dopo.
- **`npm run build` verde non dice niente sulla RPC.** Nessun client e'
  parametrizzato con `Database`, quindi il nome della funzione, il nome
  dell'argomento e la forma del payload sono stringhe non controllate dal
  compilatore. L'unica meta' verificata e' che il modulo compili.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.**
- **Nessuna prova di runtime della lettura di `event_parties`.** Che un
  assegnatario veda o non veda la riga di una party non pubblicata e' dedotto
  dalla policy `event_parties_select_admin` (`20260807010000_…:236`), non
  osservato. La deduzione e' scritta nel codice come **limite dichiarato**, e la
  conseguenza — `validUntil` a `null` — e' quella sicura.
- **La deriva dell'orologio non e' stata misurata su un dispositivo.** `validUntil`
  e `resolvedAt` sono prodotti; chi li consuma e' il piano 35-10.

### La procedura manuale, da eseguire dopo l'applicazione della coda

In un repository senza test runner questa e' l'unica prova che esistera'. Va
eseguita **dopo** la riga 8 di `35-HUMAN-UAT.md` e dopo un deploy.

1. Con un account **organizer**, chiamare una route della porta che passi un
   `partyId` valido (il primo call site arriva col piano 35-11; fino ad allora,
   una pagina server temporanea che chiami `requireDoorOperator({ partyId })`).
   Atteso: `ok: true`, `maySupervise: true`, `validUntil` valorizzato se la
   party dichiara `end_time`, `resolvedAt` entro pochi secondi dall'ora reale.
2. Con un account **staff assegnato a quella notte** con la sola `door.operate`:
   `ok: true`, `maySupervise: **false**`. E' ASSIGN-05 osservato.
3. Con lo stesso account staff ma passando **un'altra notte**: `ok: false`,
   `kind: "forbidden"`, 403. L'assegnazione non attraversa le notti.
4. Con lo stesso account staff **senza** `partyId`: `ok: false`, 403 — perche'
   il ruolo `staff` non porta `door.operate`. E' la silenziosita' della guardia
   sul NULL, vista dall'applicazione.
5. Revocare l'assegnazione (`revoked_at`) e ripetere il passo 2: `ok: false`,
   403. La riga resta in tabella.
6. Passare un `partyId` non-uuid: il chiamante deve rispondere **400**, non 503
   e non 403. Se risponde 503, il chiamante non sta validando il proprio body.

---

## Threat Flags

Il threat register del piano, con come e' coperto:

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-31 | mitigato | `grep -c "getServiceClient" src/lib/capabilities/server.ts` = **0**. `readNightEnd` usa anch'essa il client legato ai cookie (`:386`), e il docblock dice perche': il client service risponderebbe per ogni party del database, compresa una nominata per errore |
| T-35-32 | mitigato | `UUID_PATTERN` prima di costruire il client, in **entrambi** i file (`server.ts:236`, `require-operator.ts:236`), con categoria distinta. Il pattern e' lo stesso literal di `checkin/undo/route.ts:23-24`, copiato e non reinventato |
| T-35-33 | mitigato | Il verdetto di supervisione e' **restituito**, non ri-chiesto: una sola risoluzione per handler. Il vincolo e' scritto nel docblock in grassetto perche' nessun compilatore lo vede, nella stessa forma di `assertStaffManage()`. Costo dichiarato nella tabella sopra |
| T-35-34 | mitigato | Nessun `catch { return false }` in nessuno dei due file. Il DAL non ha nessun blocco `catch`; la porta ne ha **uno**, entrato per posizione, che restituisce il quarto esito. Un fallimento della risoluzione non puo' strutturalmente diventare `maySupervise: false` |
| T-35-35 | mitigato | `door.supervise` e' una chiave distinta, non un flag su `door.operate`, e il verdetto e' un campo separato dell'unione. `verify:capabilities` lato 5 asserisce le quattro decisioni della chiave (grant a `master` e `organizer`, rifiutata a `staff` e `member`) |
| T-35-SC | non applicabile | nessun pacchetto installato o modificato |

**Nessuna superficie di sicurezza nuova oltre a quella pianificata.** Le due
funzioni esportate nuove (`getPartyAccessContext`, `readNightEnd` — quest'ultima
non esportata) non sono raggiungibili da HTTP: sono server-only per grafo degli
import, perche' `@/lib/supabase/server` chiama `cookies()` da `next/headers`.

Una nota di **osservabilita'**, come segnalazione e non come difetto introdotto
qui, che rinnova quella di `35-03-SUMMARY.md`: questo piano aggiunge **due nuove
categorie di log** — `party.invalid_id` e `[door.night_end_unreadable]` — in un
prodotto senza error tracking, dove un log non raggiunge nessuno. La prima ha un
effetto osservabile (il chiamante deve rispondere 400); la seconda **no**, ed e'
deliberato: la sua conseguenza e' l'assenza di una scadenza, cioe' piu' domande
al server, che e' la direzione sicura. Detto invece che lasciato credere che
qualcuno se ne accorgera'.

---

## Known Stubs

Nessuno stub di codice.

Tre dipendenze in avanti, dichiarate qui e nei file che le contengono:

1. **Nessun call site passa ancora un `partyId`.** I sei call site esistenti di
   `requireDoorOperator()` sono invariati e chiamano senza argomento. I primi che
   nominano una notte sono i piani **35-11** (undo) e **35-13** (dispositivo).
2. **`DOOR_SUPERVISION_REQUIRED` e' esportata e non ancora usata da nessuna
   route.** E' la coppia di `DOOR_UNRESOLVED_STATUS`, e la route che la mettera'
   nel proprio envelope e' 35-11. Fino ad allora e' una costante corretta e
   inutilizzata — lo stato che il piano voleva.
3. **`validUntil` / `resolvedAt` non hanno ancora un consumatore.** La cache
   per-notte sul dispositivo e' ASSIGN-08, piano **35-10**.

E un limite dell'interfaccia, **rinnovato e non chiuso**: lo scanner mappa lo
status HTTP a un titolo prima di leggere il body, quindi un rifiuto di
supervisione a 403 mostrera' il titolo generico di un rifiuto. Chiuderlo e' il
piano **35-13**.

### Perche' `deferred-items.md` non e' stato toccato

Non e' emerso nulla fuori perimetro. E se fosse emerso non sarebbe stato scritto
li' in questa onda: 35-06 e 35-08 girano in parallelo su worktree separati, e
`ai-engineering.md`, gate *multi-agent*, dice di **sequenziare** due agenti sullo
stesso file. `.planning/STATE.md` e `.planning/ROADMAP.md` non sono stati
modificati, come da contratto worktree.

---

## Self-Check: PASSED

- `src/lib/capabilities/server.ts` — FOUND, contiene `getPartyAccessContext`
  (`:291`), `p_party_id` (`:309`), `UUID_PATTERN` (`:236`), `hasCapability` con
  `opts` (`:430`)
- `src/lib/door/require-operator.ts` — FOUND, contiene
  `DOOR_SUPERVISION_REQUIRED` (`:206`), `DOOR_SUPERVISION_REQUIRED_ERROR`
  (`:216`), `maySupervise` (`:355`), `validUntil` (`:356`), `resolvedAt` (`:359`)
- commit `841c607` — FOUND
- commit `72f8eb7` — FOUND
- `.planning/STATE.md`, `.planning/ROADMAP.md`,
  `.planning/phases/35-per-night-assignments/deferred-items.md` — **NON
  MODIFICATI**
- nessuna cancellazione di file in nessuno dei due commit
  (`git diff --diff-filter=D` vuoto su entrambi)
</content>
</invoke>
