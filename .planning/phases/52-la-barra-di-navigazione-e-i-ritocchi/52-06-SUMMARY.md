---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 06
subsystem: accesso, dati, media
tags: [capability, rls, storage, nav-02, nav-07, migration, laboratorio]
requires:
  - "52-01: censimento di NAV-07 (52-ESITI.md) e banco dei media sul laboratorio"
provides:
  - "M1 (20260923180000_gallery_view_and_media_paths.sql), applicata al laboratorio"
  - "CAP.GALLERY_VIEW e la voce /gallery nella mappa delle rotte"
  - "event_media.storage_path (nullable, con backfill) e la policy sull'oggetto che chiede la riga"
affects:
  - "52-13: M2 chiude (select_approved su gallery.view, bucket privato, storage_path NOT NULL) e porta il tipo url a nullable"
  - "52-15: applica M1 in produzione sotto atto datato; fino ad allora verify:capabilities e' rosso contro la produzione"
tech-stack:
  added: []
  patterns:
    - "migration additiva prima del deploy, chiusura dopo (M1 → codice → M2)"
    - "policy su storage.objects con EXISTS sulla riga, valutata sotto la RLS di chi firma"
key-files:
  created:
    - supabase/migrations/20260923180000_gallery_view_and_media_paths.sql
  modified:
    - src/lib/capabilities/keys.ts
    - src/lib/routes/capability-routes.ts
    - scripts/verify-capabilities.mjs
    - scripts/rls-baseline.mjs
    - src/types/database.ts
decisions:
  - "storage_path nasce nullable in M1 e url perde il NOT NULL: il codice di oggi non scrive storage_path, e con NOT NULL in M1 il caricamento si romperebbe in produzione fra M1 e il deploy (correzione del planner alla ricerca §I.4, eseguita come scritta)"
  - "staff tiene gallery.view per ruolo: prima concessione per ruolo dello staff dopo la fase 51; la porta resta dell'assegnazione"
  - "url resta string nel tipo fino a 52-13: divergenza temporanea dichiarata fra schema (nullable) e tipo"
metrics:
  duration: "~35 min"
  completed: 2026-09-23
---

# Fase 52 Piano 06: M1 additiva — `gallery.view` e `storage_path` Summary

La chiave `gallery.view` (master, organizer, staff per ruolo; attendee no), la
colonna `event_media.storage_path` con backfill e la policy
`event_media_objects_select_by_row` che fa firmare un oggetto solo a chi vede la
sua riga — in una migration additiva che non chiude nulla, con costante,
mappa, gate e tipo nello stesso commit, applicata **al solo laboratorio** e
riletta dal catalogo.

## Cosa e' stato fatto

### Task 1 — M1 e il catalogo TypeScript, un commit (`00efbaf`)

- **`supabase/migrations/20260923180000_gallery_view_and_media_paths.sql`**
  (timestamp maggiore di ogni migration esistente, nessuna rinumerazione):
  testata con il verso del deploy (migration PRIMA, codice DOPO), il paragrafo
  sulla transazione unica senza `BEGIN;`, «cosa questa migration NON fa», la
  correzione alla ricerca, e le righe esistenti dichiarate. Corpo in nove
  sezioni: chiave; tre concessioni; `storage_path` + backfill; `url DROP NOT
  NULL`; `CHECK event_media_storage_path_is_a_key`; indice unico
  `event_media_storage_path_key`; policy `event_media_objects_select_by_row`
  (`TO authenticated`, `EXISTS` sulla riga); `DO` che solleva su quattro conti
  (3 concessioni di `gallery.view`, 31 totali, 0 ad attendee, 0 righe senza
  `storage_path`); tre `COMMENT` ricontati. Assenze dichiarate per
  descrizione, «WHAT TO DO INSTEAD» per chi vorra' riaprire il bucket.
- **`keys.ts`**: `CAP.GALLERY_VIEW` con JSDoc; descrizione in
  `CAP_DESCRIPTIONS`; docblock «fifteen» → «sixteen».
- **`capability-routes.ts`**: `[CAP.GALLERY_VIEW]: { routes: ["/gallery"],
  alsoGatesTables: true }`, senza `assignmentOpenable`; la nota D-52-14 in
  cinque passi, il quinto e' **una migration**; «The middleware is UX. The RLS
  is the boundary.» con la finestra di NAV-07 dichiarata. Conteggio ricontato
  leggendo il file: **10 voci su 16** portano `alsoGatesTables` (erano 9 «of
  the seventeen», dicitura rimasta ferma al 2026-08-17).
- **`verify-capabilities.mjs`**: 16 / 64 / 31 / 33; `gallery.view` nei quattro
  blocchi di `ROLE_GRANTS` (GRANTED master/organizer/staff con la ragione per
  lo staff, REFUSED attendee con la ragione NAV-07); storia sommata in coda;
  nota «rosso contro la produzione fino a **52-15**».
- **`rls-baseline.mjs`**: `storage_path` = `'rls-baseline-probe/probe.jpg'`
  nella sonda di `event_media` (rispetta il `CHECK`; l'indice unico non morde
  perche' ogni sonda finisce in `rollback;`).
- **`database.ts`**: `storage_path: string | null` in `EventMediaRow`.

**Confronto byte per byte delle due descrizioni** (estratte con uno script node
dalla migration e da `CAP_DESCRIPTIONS`, poi `diff`): nessuna differenza, 384
byte.

### Task 2 — M1 applicata al LABORATORIO e riletta dal catalogo (nessun file modificato)

Stato del laboratorio letto prima: **`ACTIVE_HEALTHY`** alle 2026-09-23T13:30:50Z.

Baseline letta alle **13:30:55Z** (read_only): 15 chiavi; concessioni master 15,
organizer 13, totale 28; `url` `NOT NULL`; `storage_path` inesistente (42703).

Applicazione: `POST /v1/projects/<ref del laboratorio>/database/migrations`,
nome `gallery_view_and_media_paths`, alle **13:31:07Z**; risposta `[]` alle
13:31:08Z. Script scratch fuori dal repo, la cui prima riga eseguita rifiuta il
ref di produzione. Nessun `db push`, nessun `/database/query` in scrittura.

**Rilettura dal catalogo, `read_only`, 13:31:14Z → 13:31:27Z:**

| | Lettura | Valore osservato |
|---|---|---|
| (a) | versione coniata in `supabase_migrations.schema_migrations` | **`20260923133108`**, `gallery_view_and_media_paths` (coniata dall'endpoint, non il nome del file) |
| (b) | `count(*)` di `private.capabilities` / riga `gallery.view` | **16** / presente |
| (c) | concessioni per ruolo | master **16**, organizer **14**, staff **1**, attendee **0** (assente) — totale **31**; `gallery.view` a master, organizer, staff |
| (d) | commenti | `role_capabilities` contiene «1 a staff» e «31 righe»; `capabilities` contiene «16 chiavi»; `event_media.storage_path` commentata |
| (e) | colonne di `event_media` | `storage_path` text `is_nullable = YES`; `url` `is_nullable = YES` |
| (e) | righe | **5** righe, **0** con `storage_path` nulla, 0 con `url` nullo; **0** righe la cui `storage_path` non corrisponde a un oggetto del bucket |
| (e) | `CHECK` / indice | `event_media_storage_path_is_a_key` presente; `event_media_storage_path_key` UNIQUE btree presente |
| (f) | `pg_policies` su `storage.objects` | `event_media_objects_select_by_row` presente, `roles = {authenticated}`, `cmd = SELECT`, PERMISSIVE; qual `bucket_id = 'event-media' AND EXISTS (… m.storage_path = objects.name)` |
| (f) | cio' che M1 NON chiude | «Anyone can view event media» **ancora presente**; `storage.buckets.public` di `event-media` **ancora `true`**; `event_media_select_approved` **ancora presente** |
| (f) | scritture sul bucket | nessuna policy `INSERT` su `storage.objects` per il bucket `event-media`; l'unica dei media e' quella della quarantena |

**`verify:capabilities` contro il laboratorio**: exit 0, **5/5 verdi** — TS 16 ·
DB 16 · POLICY 11 · SRC 16 · GRANT 31; «31 grants and 33 refusals over 4 roles
× 16 keys». Il bersaglio e' stato provato prima di lanciare (il ref derivato da
`NEXT_PUBLIC_SUPABASE_URL` coincide con `LAB_PROJECT_REF` e non con la
produzione). **L'etichetta stampata dallo script dice «production (Management
API, read_only)» qualunque sia il bersaglio**: e' la stringa fissa di
`verify-capabilities.mjs:1665`, non la misura — lo prova DB 16, che la
produzione non ha.

**`verify:capabilities` contro la produzione — ROSSO, dichiarato**, misurato in
sola lettura: exit 1, TS 16 · DB **15** · GRANT **28**; falliscono 0, 1, 3 e 5
esattamente su `gallery.view` (chiave assente, tre concessioni dichiarate senza
riga). E' il gate che funziona. **Lo chiude il piano 52-15**, che applica M1
in produzione sotto atto datato. Non si ripara editando le costanti.

## Verifica

- `npm run build`: exit 0 (typecheck compreso).
- `npm run verify:media-strip`: exit 0, sei controlli verdi (D compreso: M1
  crea solo una `SELECT`).
- `npm run verify:routes`: PASS — `/gallery` risolve nella mappa, nessuna
  ambiguita' introdotta.
- Migration: zero righe `BEGIN;`/`COMMIT;`; fuori dai commenti zero
  `SET NOT NULL` e zero `public = false`.
- Nessun test runner esiste per il prodotto: la verifica e' build + gate +
  rilettura del catalogo, non «i test passano».

## Deviazioni dal piano

Nessuna deviazione di sostanza. Due correzioni di prosa fatte perche' i numeri
stampati erano sbagliati nei file toccati:

1. **[Rule 1 — prosa errata] `verify-capabilities.mjs`, paragrafo di
   `EXPECTED_KEY_COUNT`**: diceva «Master resta a 16, organizer a 14» per lo
   stato del 2026-09-22, che era 15 e 13 (lo stesso errore gia' corretto nel
   `COMMENT` da `20260923120000`). Corretto con nota datata.
2. **[Rule 1 — conteggio stantio] `capability-routes.ts`**: «Nine of the
   seventeen» ricontato leggendo il file → «Ten of the sixteen», con la nota
   di cosa era cambiato.

Non corretto, e segnalato: il messaggio del controllo 4 in
`verify-capabilities.mjs` (~:1438) dice ancora «eight of the seventeen keys gate
TABLES rather than routes». E' un avviso testuale, fuori dal perimetro del
piano; va ricontato da chi toccera' quel controllo.

## Cosa resta aperto, e chi lo chiude

- **Divergenza temporanea schema/tipo**: `url` e' nullable nello schema del
  laboratorio ma `string` in `EventMediaRow`. Innocua oggi (ogni riga ha `url`,
  il codice in produzione lo scrive); la chiude **52-13**.
- **Ordine di deploy (vincolo per 52-15)**: la voce `/gallery` nella mappa chiede
  `gallery.view`. Se il codice di questo piano arrivasse in produzione **prima**
  di M1, `/gallery` sarebbe rifiutata a tutti gli utenti loggati (fallisce
  chiuso: nessuna fuga, ma la gallery sparisce anche a master e organizer).
  L'ordine M1 → codice → M2 lo evita per costruzione.
- **Il cancello non e' ancora completo**: questo piano mette `/gallery` nella
  mappa (rifiuto per un loggato senza chiave). La guardia in cima alla pagina e
  il ritorno al login per l'anonimo (`PROTECTED_PREFIXES`, `NEXT_ALLOW_LIST`)
  sono di un altro piano della fase: oggi un anonimo raggiunge ancora
  `/gallery`.
- **La finestra di NAV-07**: fino a M2 le righe approvate restano leggibili da
  ogni sessione e gli oggetti dal bucket pubblico. La produzione ha zero media
  (censimento 52-01), quindi oggi la finestra non espone nulla; M2 la chiude.
- **Nomi codificati nell'URL**: il backfill estrae il nome dall'URL pubblico; un
  nome con caratteri codificati non troverebbe l'oggetto e la firma fallirebbe
  chiusa. Sul laboratorio **0 righe** in quel caso; il giorno dell'atto 52-15
  rilegge lo stesso conteggio in produzione.

## Threat Flags

Nessuna superficie nuova oltre il `<threat_model>` del piano: la sola policy
creata e' una `SELECT` su `storage.objects` (T-52-21), nessuna scrittura per le
sessioni (T-52-24), nessuna scrittura in produzione (T-52-25).

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260923180000_gallery_view_and_media_paths.sql`
- FOUND: commit `00efbaf` (task 1)
- Laboratorio: versione `20260923133108` riletta dal catalogo
- Nessun file `.env*` in stage; `STATE.md` e `ROADMAP.md` non toccati; zero
  scritture in produzione (una sola corsa di `verify:capabilities`, tutte le
  sue interrogazioni `read_only`)
