# Phase 52: La barra di navigazione e i ritocchi - Pattern Map

**Mapped:** 2026-09-23
**Files analyzed:** 31 (nuovi o modificati)
**Analogs found:** 29 / 31

> **Documento pubblicato.** `.planning/` e' tracciato su un repository pubblico:
> qui si citano file, righe e forme — **mai** un nome di sede, una data non
> annunciata, un riferimento di progetto di laboratorio o dati di persone. Il
> riferimento del progetto di produzione vive gia' in chiaro nella costante
> `PRODUCTION_REF` degli script (`scripts/purge-attendances.mjs:125`,
> `scripts/lab-bootstrap.mjs:43`) e non si ricopia qui.

> **Nessun test runner.** Ogni «pattern» qui sotto si verifica con `npm run build`
> (typecheck) + il gate statico del file toccato + la procedura manuale scritta.
> Mai «i test passano».

---

## ⚠ Sette cose che l'albero dice e i documenti a monte no

Lette dagli analoghi in questa sessione; il planner le tratta come correzioni
alla ricerca, non come preferenze.

| # | Cosa | Dove lo dice l'albero | Cosa cambia per il piano |
|---|---|---|---|
| **P1** | **Le migration dopo la fase 50 NON portano `BEGIN;`/`COMMIT;`.** L'endpoint `POST /v1/projects/{ref}/database/migrations` avvolge gia' il corpo in una transazione; un `BEGIN` esplicito produce `WARNING: there is already a transaction in progress` e un `COMMIT` che chiude a meta' la transazione dell'endpoint | `supabase/migrations/20260922120000_role_attendee_and_capability_keys.sql:32-42` (misurato sul lab il 2026-09-21, rimanda a `20260921120000:42-55`) | `52-RESEARCH.md` §D scrive `BEGIN;`…`COMMIT;` (assunzione A4): **chiusa dall'analogo, in senso contrario**. M1 e M2 senza `BEGIN`/`COMMIT`, con il paragrafo che dice perche' (copiarlo da `:32-42`). `20260817120000` e `20260817120400` usano ancora `BEGIN` — sono **precedenti alla misura**, non la forma di oggi |
| **P2** | **`gallery.view` dopo NAV-07 governa righe**, quindi la voce di mappa porta `alsoGatesTables: true` | `capability-routes.ts:158-190` (il campo: «True when the key ALSO gates rows»); forma a `:489-492`, `:891-894` | §C.1 della ricerca («senza `alsoGatesTables`, la chiave non governa alcuna policy») e' **precedente a D-52-25**: con M2 `event_media_select_gallery` legge `has_capability('gallery.view')`. La nota di D-52-14 accanto alla voce deve dire che **riaprire al pubblico oggi e' anche una migration** (la policy di riga e il bucket), non piu' «togliere una riga» |
| **P3** | **I numeri del catalogo oggi sono 15 + 13 + 0 + 0 = 28**, non 16 + 14 | `20260923120000_role_capabilities_comment.sql:1-22` (WR-05 corregge il commento del 2026-09-22) | Dopo la migration: **16 master, 14 organizer, 1 staff, 0 attendee = 31**; chiavi 15 → **16**. Il `COMMENT ON TABLE private.role_capabilities` si riscrive **ricontato**, e la frase «ZERO a staff … va riletto prima di aggiungere un ruolo nuovo» diventa falsa qui |
| **P4** | **Lo script di ri-spogliatura (D-52-31) e' un secondo scrittore su `event-media` che `verify:media-strip` non vede**: il gate A scandisce solo `src/` | `scripts/verify-media-strip.mjs:6-8` («no file under `src/` writes into the `event-media` bucket except …finalize/route.ts») | Lo script sotto `scripts/` e' fuori dal perimetro del gate: va **dichiarato** nel suo docblock come secondo scrittore, con la ragione, e il VERIFICATION lo nomina. Inoltre: lo stripper e' `import "server-only"` TypeScript (`src/lib/media/strip-metadata.ts:1`) e non si importa da un `.mjs`; `finalizeStrippedUpload` scrive con `upsert: false` (`finalize.ts:339-353`) e **vieta** di sovrascrivere. «Stesso path, stessa riga» = `upsert: true` = **decisione da dichiarare**, non un dettaglio (vedi §Script) |
| **P5** | **La sezione Gallery della pagina della serata porta anche il caricamento** | `events/[slug]/page.tsx:1962-1970`: `MediaGallerySection` riceve `canUpload` e `uploadableParties` | D-52-29 («la sezione sparisce per chi non ha `gallery.view`») spegnerebbe anche l'upload di chi tiene `media.upload` per assegnazione senza `gallery.view` per ruolo. Oggi `staff` tiene `gallery.view` per ruolo, quindi l'insieme e' probabilmente vuoto — ma la condizione va scritta **esplicita** (p. es. `hasGalleryView \|\| canUpload`) o dichiarata, non dedotta |
| **P6** | **Il filtro `?format=` e' risolto PRIMA del `try`**, i chip si ricavano DENTRO | `events/page.tsx:234-237` (`activeFormatOption` da `formatOptions`, fuori dal `try`), `:577-586` (l'array, dentro) | Se l'allow-list diventa `chips` (raccomandazione §E.4), la risoluzione di `activeFormat` va **spostata dopo** la derivazione dello `Set`, o resta sul catalogo intero e il piano lo dichiara |
| **P7** | **`purge-attendances.mjs` non rifiuta la produzione: la ammette sotto atto.** Sono gli script `lab-*` a rifiutarla alla prima riga | `purge-attendances.mjs:202-206` (produzione → `readAuthorisation`); `lab-bootstrap.mjs:43-56` (produzione → `exit(2)`) | Gli script di D-52-30 e D-52-31 seguono **purge-attendances** (lab per default, produzione solo con `--authorised --dated`), non `lab-bootstrap` |

---

## File Classification

| File nuovo / modificato | Role | Data Flow | Analogo piu' vicino | Match |
|---|---|---|---|---|
| `supabase/migrations/2026092xxxxxxx_gallery_view_and_media_paths.sql` (M1) | migration | CRUD / DDL + catalogo | `20260922120000_role_attendee_and_capability_keys.sql` + `20260817120000_production_section_keys.sql:104-174` + `20260817120400_visual_archive_bucket.sql:198-208` | exact (composito) |
| `supabase/migrations/2026092xxxxxxx_gallery_close_data.sql` (M2) | migration | DDL / policy | `20260817120400_visual_archive_bucket.sql` + `20260922120000:587-603` (il `DO`) | exact |
| `src/lib/capabilities/keys.ts` | config | — | se stesso, `:316-371`, `:408-445` | exact |
| `scripts/verify-capabilities.mjs` | test (gate DB) | batch | se stesso, `:232-267`, `:325-688`, `:784-786` | exact |
| `src/lib/routes/capability-routes.ts` | config (mappa) | request-response | se stesso, `:489-492`, `:891-894` | exact |
| `src/lib/routes/next-redirect.ts` | config (allow-list) | request-response | se stesso, `:102-188`, `:221-226` | exact |
| `src/app/(public)/gallery/page.tsx` | route (page) | request-response + CRUD read | `(work)/manifesto/page.tsx:110-119` (guardia) + `visual/actions.ts:423-503` (firma) | exact |
| `src/app/(public)/gallery/actions.ts` o `src/lib/media/sign.ts` (nuovo, firma) | service | request-response | `src/app/(admin)/admin/visual/actions.ts:381-503` + `visual-archive.ts:47-67, 151-153` | exact |
| `src/app/(public)/events/[slug]/page.tsx` | route (page) | CRUD read | se stesso `:1014-1027`, `:1962-1970` + firma come sopra | role-match |
| `src/app/(public)/events/[slug]/actions.ts` (`registerMedia`, `deleteMedia`) | service (server action) | CRUD | se stesso `:154-200`, `:291-349`; `visual/actions.ts` per la chiave invece dell'URL | exact |
| `src/app/(admin)/admin/(work)/events/[id]/media/page.tsx` | route (page) | CRUD read | se stesso `:167-195` + firma | exact |
| `src/components/media/MediaGrid.tsx`, `Lightbox.tsx`, `MediaReviewGrid.tsx` | component | render | `(work)/visual/page.tsx:604-630` (assenza dichiarata di una firma) | role-match |
| `src/types/database.ts` | model | — | colonna `event_media.storage_path` | exact (gate *tipi allineati*) |
| `scripts/rls-baseline.mjs` (`PROBE_PAYLOADS.event_media`) | test | batch | se stesso `:1270-1282` | exact |
| `scripts/verify-refusal.mjs` (gruppo `gallery`) | test (gate DB) | batch | se stesso `:196-230` (`SECTION_TARGETS`) | exact |
| `scripts/purge-media-orphans.mjs` (nuovo, D-52-30) | utility (script) | batch / delete-by-key | `scripts/purge-attendances.mjs` | exact |
| `scripts/restrip-event-media.mjs` (nuovo, D-52-31) | utility (script) | batch / file-I/O | `purge-attendances.mjs` (guardia, atto, istantanea) + `src/lib/media/finalize.ts:245-375` (sequenza) | role-match — vedi P4 |
| `src/lib/rbac/roles.ts` | utility (funzione pura) | transform | se stesso `:119-192`, `:432-517` | exact |
| `src/lib/routes/staff-tabs.ts` | config | transform | se stesso `:122`, `:323-363` | exact |
| `src/components/layout/AppNav.tsx` | component (client) | event-driven (stato UI) | se stesso; `StaffNav.tsx:102-141` (colonna) | exact |
| `src/components/staff/StaffNav.tsx` | component (client) | render | se stesso `:143-177` | exact |
| `src/app/(admin)/admin/(work)/layout.tsx` | layout | request-response | se stesso `:138-186` | exact |
| `src/app/(members)/account/page.tsx` | route (page) | render | se stesso `:446-447`, `:791-793` | exact (rimozione) |
| `src/components/account/ManagementSection.tsx` | component | render | — (esce se resta senza importatori) | n/a |
| `src/app/globals.css` | config (stile) | — | se stesso `:335`, `:361-365` | role-match |
| `src/app/(public)/events/page.tsx` | route (page) | transform | se stesso `:185-240`, `:577-596` | exact |
| `src/app/(public)/events/FormatFilterRow.tsx` | component | render | se stesso `:155-180` | exact |
| `src/components/admin/MemberTable.tsx` | component | render | se stesso `:678-685` (le cifre `span`) | exact |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` | component (porta, offline) | event-driven | se stesso `:415`, `:631`, `:2755-2759`, `:3276-3291`, `:3458-3470` | exact |
| `scripts/verify-touch-targets.mjs` (`DOOR_TARGET_DEBT` 14 → 13) | test (gate statico) | batch | se stesso `:1286-1306`, `:1414-1418` | exact |
| `src/app/layout.tsx` + `src/app/(public)/events/EventTabs.tsx` | config / component | — | `layout.tsx:81-106`; `EventTabs.tsx:582, 585` | exact |
| `.planning/phases/52-…/52-PROCEDURES.md` | doc (procedura) | — | `51-PROCEDURES.md` | exact |
| `.planning/phases/52-…/52-AUTHORISATION-*.md` | doc (atto datato) | — | `51-AUTHORISATION-COMMENT.md` | exact |

---

## Pattern Assignments

### M1 — `supabase/migrations/…_gallery_view_and_media_paths.sql` (migration, additiva)

**Analoghi:** `20260922120000_role_attendee_and_capability_keys.sql` (forma di oggi,
niente `BEGIN`), `20260817120000_production_section_keys.sql` (inserimento di
chiavi), `20260817120400_visual_archive_bucket.sql` (braccio di lettura sugli oggetti).

**Testata: il verso del deploy e perche'** — copiare la struttura di
`20260922120000:1-49` (titolo, fase e decisioni; «IL VERSO DEL DEPLOY»; «UNA
TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE»; «COSA QUESTA MIGRATION
NON FA»). Per M1 il verso e' l'**opposto** della 51: **migration prima, codice
dopo** (§I.6 della ricerca: codice prima → `registerMedia` scrive una colonna che
non c'e').

**Paragrafo da ricopiare quasi alla lettera** (`20260922120000:32-42`):
```sql
-- ── UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;` PERCHE' NON SERVE ────────────
--
-- `POST /v1/projects/{ref}/database/migrations` avvolge il corpo in UNA
-- transazione da solo: una sonda con `create table private._tx_probe(x int)`
-- seguita da `select 1/0` e' tornata `400 … division by zero`, e subito dopo
-- `to_regclass('private._tx_probe')` era **null**. Un `BEGIN;` esplicito qui
-- produrrebbe `WARNING: there is already a transaction in progress` e un
-- `COMMIT` che chiude a meta' la transazione dell'endpoint.
-- Vedi `20260921120000_drop_status_and_referral.sql:42-55`.
```

**La chiave e le tre concessioni** — forma di `20260817120000:104-121, 165-174`,
**due** colonne (non tre: `requires_approved` non esiste dalla fase 50):
```sql
INSERT INTO private.capabilities (key, description) VALUES
  ('gallery.view', '<byte-identica a CAP_DESCRIPTIONS["gallery.view"] in keys.ts>')
ON CONFLICT (key) DO NOTHING;

INSERT INTO private.role_capabilities (role, capability) VALUES
  ('master',    'gallery.view'),
  ('organizer', 'gallery.view'),
  ('staff',     'gallery.view')
ON CONFLICT (role, capability) DO NOTHING;
```
Regola della stringa, da `keys.ts:420-426`: *«BYTE-IDENTICAL to the description
column … Edit one of these and the migration is edited in the same commit»*.

**La colonna `storage_path`** — gate *default sulle righe esistenti*
(`supabase-data.md`): il file dichiara cosa succede alle righe gia' presenti
(backfill dal prefisso pubblico), e il `DO` **solleva** se ne resta una nulla —
forma del `DO` qui sotto. Indice sulla colonna di lookup (gate *indici*), perche'
la policy `EXISTS` la valuta per ogni firma.

**Il braccio di lettura sull'oggetto** — forma di `20260817120400:198-208`,
predicato diverso (`EXISTS` sulla riga, §I.4 della ricerca):
```sql
DROP POLICY IF EXISTS event_media_objects_select_by_row ON storage.objects;

CREATE POLICY event_media_objects_select_by_row
  ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-media'
    AND EXISTS (SELECT 1 FROM public.event_media m
                 WHERE m.storage_path = storage.objects.name)
  );
```
Commento da copiare per senso da `20260817120400:180-196` (perche' `TO
authenticated`, perche' il client della sessione e non il service role).

**Il `DO` che verifica e solleva** — forma di `20260922120000:587-603`:
```sql
DO $$
DECLARE
  v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM private.role_capabilities WHERE capability = 'gallery.view';
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'gallery.view: attese 3 concessioni, trovate %', v_n
      USING HINT = '…';
  END IF;
  -- totale 31, attendee 0, storage_path nulle 0
END;
$$;
```

**I due `COMMENT`** — forma di `20260922120000:638-642` e
`20260923120000:21-22`, **ricontati** (P3): `role_capabilities` → «31 righe: 16 a
master, 14 a organizer, 1 a staff (gallery.view, fase 52, D-52-12), ZERO ad
attendee»; `capabilities` → «16 chiavi dalla fase 52». La frase «ZERO a staff …
asimmetria dichiarata» si riscrive: staff tiene ora **una** chiave per ruolo, e la
porta resta per assegnazione.

**Assenze da dichiarare, per descrizione e non per clausola** — disciplina di
`20260817120400:123-128` (un paragrafo che scrivesse per esteso la clausola vietata
farebbe cancellare il proprio grep): nessuna INSERT per `authenticated` sul bucket
(`verify:media-strip` controllo D), nessun braccio per l'anonimo.

---

### M2 — `supabase/migrations/…_gallery_close_data.sql` (migration, chiusura)

**Analogo:** `20260817120400_visual_archive_bucket.sql` (bucket privato, sezioni 3 e
4 «le due assenze»), `20260922120000:587-603` (il `DO`).

- Testata: **«NON APPLICARE PRIMA DEL DEPLOY DEL CODICE CHE FIRMA»**, con la
  ragione (§I.6, Pitfall 10: immagini rotte a tutti), nella forma di
  `20260922120000:7-30`.
- `DROP POLICY IF EXISTS event_media_select_approved …` + `CREATE POLICY
  event_media_select_gallery … USING (status = 'approved' AND (SELECT
  private.has_capability('gallery.view')))` — il sotto-select e' quello di
  `20260817120400:188-191, 207` (InitPlan, una volta per statement).
- `UPDATE storage.buckets SET public = false WHERE id = 'event-media';` — non
  `INSERT … ON CONFLICT DO NOTHING` (che **non correggerebbe** un bucket esistente:
  `20260817120400:116-120`).
- Il `DO` rilegge `pg_policies` e `storage.buckets` e solleva se resta una SELECT
  su `event-media` senza `TO authenticated` o se `public` non e' `false`.
- La sezione «WHAT TO DO INSTEAD» di `20260817120400:257-266` si ricopia per
  `event-media`: la riparazione in buona fede («le miniature non caricano, apri il
  bucket») va nominata nel file per essere riconosciuta.
- **Reversibilita' dichiarata** (§I.6): si torna indietro solo **allargando**, e
  cio' che e' stato visto resta visto.

---

### `src/lib/capabilities/keys.ts` (config)

**Analogo:** se stesso.

- `CAP` (`:316-371`): una riga `GALLERY_VIEW: "gallery.view",` con il suo JSDoc
  (chi la tiene e perche', e che `staff` la tiene **per ruolo** — la prima
  concessione per ruolo a `staff`).
- `CAP_DESCRIPTIONS` (`:408-445`) e' `Record<CapabilityKey, string>` totale: senza
  la voce **non compila** (docblock `:376-407`). La stringa e' byte-identica a
  quella della migration.
- Il docblock `:400-406` dice «these strings match the fifteen rows» → «sixteen».

---

### `scripts/verify-capabilities.mjs` (gate con database) — stesso commit della migration

**Analogo:** se stesso — il blocco «Da 17 a 15 il 2026-09-22» (`:232-267`) e' la
forma da ripetere come «Da 15 a 16, fase 52, D-52-12 — ed e' un'AGGIUNTA».

| Costante | Oggi | Dopo | Riga |
|---|---|---|---|
| `EXPECTED_KEY_COUNT` | 15 | **16** | `:267` |
| `EXPECTED_PAIR_COUNT` | 60 | **64** | `:784` |
| `EXPECTED_GRANT_COUNT` | 28 | **31** | `:785` |
| `EXPECTED_REFUSAL_COUNT` | 32 | **33** | `:786` |

- `ROLE_GRANTS` (`:325-688`): `'gallery.view': 'GRANTED'` per `master`,
  `organizer`, **`staff`**; `'gallery.view': 'REFUSED'` per `attendee` con il suo
  commento di rifiuto nella forma di `:676-687` («Nothing else in the model would
  say no»).
- La prosa `:245-265` («master resta a 16, organizer a 14, gli altri due a ZERO»,
  «per `staff` no, e va guardato») diventa falsa: si riscrive con i numeri 16/14/1/0.
- La nota «ROSSO CONTRO LA PRODUZIONE, VERDE CONTRO IL LABORATORIO» (`:261-265`)
  si ripete con il nome del piano che applichera' in produzione. **Non si ripara
  editando la costante.**
- L'aritmetica pre-registrata (`:690-720`) si **somma in coda**, non si riscrive
  («si tiene com'e' e si sottrae in coda», `:693-695`).

---

### `src/lib/routes/capability-routes.ts` (mappa)

**Analogo:** `[CAP.CATALOGUE_MANAGE]` (`:489-492`) e `[CAP.PRODUCTION_VISUAL_MANAGE]`
(`:883-894`, il paragrafo «The middleware is UX. The RLS is the boundary.»).

```typescript
  /**
   * D-52-12/13/14 — la gallery, temporaneamente, per chi lavora.
   *
   * ── PER RIAPRIRLA AL PUBBLICO ─────────────────────────────────────────────
   * togliere questa voce, la guardia in cima a (public)/gallery/page.tsx e
   * "/gallery" da PROTECTED_PREFIXES + il suo pattern in NEXT_ALLOW_LIST
   * (next-redirect.ts); e — da NAV-07 — ANCHE una migration: la policy
   * event_media_select_gallery e il bucket privato. La chiave resta, innocua.
   *
   * ── The middleware is UX. The RLS is the boundary. ────────────────────────
   * Da NAV-07 questa chiave governa anche le righe (M2), quindi porta il flag.
   */
  [CAP.GALLERY_VIEW]: {
    routes: ["/gallery"],
    alsoGatesTables: true,
  },
```
- **Senza** `assignmentOpenable` (nessuna assegnazione apre la gallery;
  `:138-157` spiega perche' e' una proprieta' della voce, non della chiave).
- **Con** `alsoGatesTables: true` (P2). Il conteggio «Nine of the seventeen do»
  in `:159-189` e' gia' datato (le chiavi sono 15): si **ricorregge** contando,
  nella forma che quel paragrafo stesso chiede.
- `satisfies Record<CapabilityKey, Binding>` (`:895`) rende chiave e voce un
  unico commit.

---

### `src/lib/routes/next-redirect.ts` (allow-list + prefissi)

**Analogo:** se stesso, blocco «Added 2026-09-22, phase 51, D-51-09b» (`:102-122`).

```typescript
  // ── Added <data>, phase 52, D-52-13 — and it IS an access decision ────────
  // Anchored at both ends, no `.*`: one literal segment.
  /^\/gallery$/,
```
e `"/gallery"` in `PROTECTED_PREFIXES` (`:221-226`), aggiornando il conteggio in
prosa del docblock (`:205-218`: «They became four …» → cinque). `verify:routes`
controllo 3 lega le due liste: si muovono insieme (Pitfall 1).

---

### `src/app/(public)/gallery/page.tsx` (page, guardia + lettura firmata)

**Analogo della guardia:** `(work)/manifesto/page.tsx:110-119`:
```typescript
  // Resolved once … `cache()`-scoped per request. The page keeps its own guard:
  // the middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.GALLERY_VIEW)) {
    redirect("/dashboard");
  }
```
Import da aggiungere (forma di `manifesto/page.tsx:1-4`):
`import { redirect } from "next/navigation"; import { CAP } from "@/lib/capabilities/keys";`

- La guardia sta **prima** di `createClient()` e della lettura (`gallery/page.tsx:48-59`).
- La lettura seleziona `storage_path` e **mai** `url` (`:56`), poi firma (sezione
  successiva); ai figli arriva `id → signedUrl`, mai la chiave.
- Il docblock `:10-47` («The Gallery tab is now drawn to everyone … `NAV-02`, phase
  52, builds the real gate») si riscrive: e' la fase che lo costruisce.
- Il wrapper `md:[--nav-inset-inline-start:14rem]` (`:116`) **resta**: e' una delle
  due meta' del controllo E di `verify:conversion`.

---

### Firma degli URL (service, request-response) — `signEventMedia` nuovo

**Analogo:** `src/app/(admin)/admin/visual/actions.ts:381-503` (`signVisualAssets`)
e `src/lib/production/sections/visual-archive.ts:47-67, 151-153`.

**Il cuore da copiare** (`visual/actions.ts:443-500`):
```typescript
  const supabase = await createClient();          // client della SESSIONE
  const { data, error } = await supabase
    .from("production_visual_asset")              // → "event_media"
    .select("id, object_key")                     // → "id, storage_path"
    .in("id", assetIds);
  if (error) { console.error(`[visual.asset_read_failed] …`); return { ok: false, reason: "read_failed" }; }
  …
  const { data: signed, error: signError } = await supabase.storage
    .from("visual-archive")                       // → "event-media"
    .createSignedUrls(rows.map((row) => row.object_key), ARCHIVE_SIGNATURE_SECONDS);
  if (signError || signed === null) { console.error(`[visual.asset_sign_failed] …`); return { ok: false, reason: "sign_failed" }; }
  const urls: Record<string, string> = {};
  signed.forEach((entry, index) => {              // per POSIZIONE, non per path
    const row = rows[index];
    if (row === undefined) return;
    if (typeof entry.signedUrl !== "string" || entry.signedUrl === "") return;
    urls[row.id] = entry.signedUrl;
  });
  return { ok: true, urls };
```
- **Client della sessione, mai il service role**: il paragrafo
  `visual/actions.ts:400-407` («the guard above is the message, the policy is the
  boundary») si cita accanto alla chiamata (Pitfall 12).
- **Una chiamata per la lista** (`:409-417`), la chiave non esce dalla funzione
  (`:419-421`).
- **Durata come costante con la sua ragione**, forma di `visual-archive.ts:47-67`:
  `EVENT_MEDIA_SIGNATURE_SECONDS = 3600` per gallery e pagina della serata (video
  messi in pausa), `300` per la moderazione — ciascuna col suo paragrafo «shorter
  would… / longer would…».
- **Tipo del risultato** nella forma di `ArchiveSignatureResult`
  (`visual-archive.ts:151-153`): `{ ok: true; urls } | { ok: false; reason }` con
  cause distinte (`read_failed` / `sign_failed`), categorie di log
  `[gallery.read_failed]` / `[gallery.sign_failed]` (ricerca §I.4).
- Le lettura dalla pagina (Server Component) puo' chiamare una funzione di
  modulo server invece di una server action: se resta `"use server"`, ogni export
  e' un **endpoint pubblico** (`visual/actions.ts:31-40`) e ripete la guardia
  `gallery.view` al proprio interno (gate *server action autorizzata*).

---

### `src/app/(public)/events/[slug]/actions.ts` (`registerMedia`, `deleteMedia`)

**Analogo:** se stesso.

- `registerMedia` (`:154-200`): oggi costruisce `publicUrl` (`:179`) e scrive
  `url`. Dopo: scrive `storage_path: storagePath` e **non** costruisce piu'
  l'indirizzo pubblico. Resto invariato (guardia `mayUploadToParty`, `status:
  "pending"`).
- `deleteMedia` (`:291-349`): oggi taglia il prefisso da `media.url`
  (`:318-323`). Dopo: `select("uploaded_by, storage_path")` e usa la chiave
  direttamente. **L'ordine resta oggetto prima, riga dopo** (`:325-343`): la
  policy dell'oggetto chiede la riga. Il `console.error` con categoria
  `[media.storage_delete_failed]` (`:331`) resta; il commento «Continue to delete
  the DB record even if storage deletion fails» (`:332`) diventa un **fallimento
  silenzioso sul gate *moderazione = rimozione*** dopo M2 (Pitfall 11) — il piano
  decide se fermarsi o dichiararlo.

---

### `src/app/(public)/events/[slug]/page.tsx` (page)

**Analogo:** se stesso + firma.

- Lettura `:1014-1027`: `select("id, storage_path, type, uploaded_by, created_at")`,
  poi firma; `mediaItems` riceve `url` = URL firmato.
- Render `:1962-1970`: la sezione e il suo `SectionHeading` si montano sotto una
  condizione letta da `getAccessContext()` (D-52-29), **tenendo conto di P5**
  (l'upload vive nella stessa sezione).
- Il paragrafo di rischio: `venue-secrecy.md` — la pagina puo' mostrare una serata
  segreta; la firma non cambia *cosa* si vede, cambia *chi* lo raggiunge.

---

### `src/app/(admin)/admin/(work)/events/[id]/media/page.tsx` + `MediaReviewGrid.tsx`

**Analogo:** se stesso `:180-195` + firma con `300 s`.
`MediaReviewGrid.tsx:4, 169-170` usa `next/image`: passa a `<img>` (o
`unoptimized`) per gli URL firmati (Pitfall 13), come `MediaGrid.tsx:78-83`
che gia' usa `<img … loading="lazy">`.

---

### `src/components/media/MediaGrid.tsx`, `Lightbox.tsx` (component)

**Analogo per l'immagine che non arriva:** `(work)/visual/page.tsx:604-630` —
un'assenza **dichiarata**, non un rettangolo muto:
```tsx
  const urls = signatures.ok ? signatures.urls : {};
  …
  {signatures.ok ? null : (
    <div role="alert" className="mb-3 rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4">
      <p className="text-sm text-sem-crit">…</p>
    </div>
  )}
```
Per la singola miniatura il testo e' quello di `52-UI-SPEC.md` §E: `text-xs
text-muted` «This image could not be loaded. Reload the page.» (un `onError`
sull'`<img>`: oggi nessun `<img>` del prodotto ne ha uno — e' un pattern nuovo,
da scrivere una volta e riusare nei tre componenti).
Il commento di `MediaGrid.tsx:67-72` (alt vuoto, nessun nome di luogo
nell'accessible name) resta vero e non si tocca.

---

### `scripts/rls-baseline.mjs` e `scripts/verify-refusal.mjs` (gate con database)

- `PROBE_PAYLOADS.event_media` (`rls-baseline.mjs:1270-1282`): aggiungere
  `'storage_path'` alle colonne e un valore di sonda **nello stesso commit di M1**
  (Pitfall 14), nella forma dell'`url` di sonda `:1276`
  (`'https://example.invalid/rls-baseline-probe'` → una chiave fittizia che non
  comincia con `/` ne' con `http`, per il `CHECK`).
- `SECTION_TARGETS` (`verify-refusal.mjs:196-230`): un gruppo in piu', stessa forma:
  ```js
  {
    section: "gallery",
    note: "event_media, one SELECT arm asking gallery.view on approved rows (NAV-07, D-52-25) …",
    tables: ["event_media"],
  },
  ```
  In produzione sotto un atto come `51-AUTHORISATION-REFUSAL.md`.

---

### `scripts/purge-media-orphans.mjs` (nuovo, D-52-30 — delete-by-key)

**Analogo:** `scripts/purge-attendances.mjs` (551 righe), da seguire **per
struttura**, non da semplificare.

| Parte | Da dove | Cosa si adatta |
|---|---|---|
| Testata «NON PUNTA MAI ALLA PRODUZIONE PER DEFAULT» + «In produzione ci si arriva solo con un'autorizzazione datata che questo file legge e consuma» | `:1-15` | invariata nella forma |
| «LE QUATTRO REGOLE DELLA RIMOZIONE» (conta per provenienza · cascata dal catalogo · istantanea prima · per chiave su lista catturata · conferma da fonte diversa) | `:26-49` | le due popolazioni si contano **separate**: oggetti di righe `rejected` e oggetti **orfani** (senza riga). Sommarle farebbe autorizzare l'una dalla decisione sull'altra |
| «UNA DECISIONE SENZA SOGGETTI NON SI ESEGUE» | `:51-54` | zero oggetti → esce 0 e lo dice |
| Il blocco di concessione e i suoi controlli | `:56-73`, `:155-204` | `<!-- purge-media-orphans: grant -->`, `act: event_media.purge`, `granted_on`, `spent: no`; rifiuto se manca, se non `yes`, se `spent` non `no`, se la data non coincide con `--dated` |
| Argomenti letti prima di agire; `--dry-run` \| `--apply` obbligatori, mai insieme | `:107-153` | invariati |
| `refuse()` → exit 2; `fail(category, …)` → exit 1 con categoria | `:129-132`, `:213-217` | categorie `[purge-media-orphans.<categoria>]` |
| `sql(query, { readOnly })` via Management API, `readOnly` esplicito a ogni chiamata | `:218-248` | invariato |
| Istantanea in un file `.env*` datato, **mai** sotto `.planning/` | `:99-103`, `:210-211` | `.gitignore:34` copre `.env*`. **Per gli oggetti l'istantanea sono byte di foto di persone**: il piano decide se scaricarli (in un percorso `.env*`) o fotografare solo nomi e metadati — e lo scrive (`legal-compliance.md`, immagini delle persone) |
| L'atto: `DELETE … WHERE id = ANY(ARRAY[<lista catturata>])` + controllo `delete_short` | `:480-512` | per lo storage: `remove([...chiavi catturate])` sulla lista, **oggetto prima e riga dopo** (come `deleteMedia`) |
| Contatore da **fonte diversa** (PostgREST col service role, URL verificato contro il ref) | `:250-287`, `:514-527` | riconta `storage.objects` per il bucket e le righe `rejected` |
| Consumo dell'autorizzazione: `spent: no` → `spent: yes\nspent_at: <utc>` scritto **dallo strumento** | `:529-546` | invariato |

---

### `scripts/restrip-event-media.mjs` (nuovo, D-52-31 — batch file-I/O)

**Analoghi:** `purge-attendances.mjs` per guardia, atto, istantanea e registro;
`src/lib/media/finalize.ts:245-375` per la **sequenza** (scarica → spoglia →
scrivi, in quest'ordine, una volta).

Cosa copiare dalla sequenza (`finalize.ts`):
- scarica col service role (`:259-281`), distinguendo «non c'e'» (404/400) da
  «non risponde» con due categorie (`:264-280`);
- spoglia **solo** i tipi di `STRIPPABLE_MIME_TYPES` (`strip-metadata.ts:105`);
  un video non si spoglia e **si conta a parte**, non si salta in silenzio;
- scrivi con `contentType` esplicito (`:343-352`: senza, un Buffer diventa
  `text/plain`);
- log `code=… message=…` e **mai la chiave dell'oggetto** (`finalize.ts:69-79`).

**Cosa NON si puo' copiare, e va deciso (P4):**
1. `stripImageMetadata` e' `import "server-only"` in TypeScript: un `.mjs` non lo
   importa. Riscrivere la chiamata a `sharp` nello script e' **la seconda copia
   di un ordine** che `finalize.ts:28-37` descrive come il modo in cui si smette
   di spogliare. Alternative da pesare: uno script TS eseguito col runtime del
   progetto, o una rotta interna che chiama `finalizeStrippedUpload` — ciascuna
   con il suo costo scritto.
2. «Stesso path» = sovrascrittura (`upsert: true`), che `finalize.ts:339-341`
   esclude per principio. E' una scrittura su `event-media` **fuori da `src/`**,
   invisibile al gate A di `verify:media-strip` (`:6-8`): il docblock dello
   script lo dichiara come secondo scrittore con la ragione, e il VERIFICATION lo
   nomina.
3. La **prova** e' quella di `verify-media-strip.mjs:19-24`: un file con GPS noto
   entra, l'oggetto riletto esce senza — sul laboratorio con media veri, poi il
   numero di oggetti ripassati nel VERIFICATION.
4. **Cache** (`media-and-storage.md`, gate *cache e contenuto rimosso*): la CDN
   puo' servire la versione con GPS fino al suo `max-age` (§I.6).

---

### `src/lib/rbac/roles.ts` (funzione pura, transform)

**Analogo:** se stesso.

- La forma `NavItem` (`:119-192`) guadagna la possibilita' di una voce che **non e'
  un link** (TASK) e di una voce-pannello (Management): la ricerca §A propone un
  tipo discriminato `BarEntry` (`kind: "link" | "disabled" | "panel"`). La
  disciplina da mantenere e' quella di `:182-191`: i campi che pongono una domanda
  sono **obbligatori**, non opzionali.
- La voce Gallery (`:224-252`) **esce** da `NAV_ITEMS`; il suo commento («Il
  cancello vero lo costruisce `NAV-02`, fase 52») si chiude dicendo dove e' andata
  (pannello, sotto `gallery.view`). Non si ricopia il nome di un campo cancellato
  (disciplina `:175-179`).
- Il filtro `getVisibleNavItems` (`:432-517`): il ramo capability «ruolo **o**
  assegnazione viva» (`:465-488`) resta **identico** per Check-in; `null` rifiuta
  (`:475-478`). La barra si filtra su **tre cose** (`:454-456`): «ha Management» e'
  derivato dal pannello, non un quarto criterio (D-52-04).
- Il pannello: `visibleStaffTabs(capabilities)` + Gallery (se `CAP.GALLERY_VIEW`) +
  Account, ordinato per etichetta al rendering (`localeCompare(…, "en")`). Nessun
  ciclo di import: `staff-tabs.ts` importa solo `keys` e `capability-routes`
  (`staff-tabs.ts:75-77`), quindi `roles.ts` puo' importarlo.
- La voce Gallery del pannello riceve la **stessa asserzione a caricamento** delle
  tab (`staff-tabs.ts:323-342`): `resolveRoute("/gallery")?.key ===
  CAP.GALLERY_VIEW`, due messaggi per due errori diversi.
- Il docblock degli esiti (`:353-391`) si riscrive con la tabella di §A della
  ricerca (anonimo, attendee, staff non assegnato / assegnato, organizer, master,
  contesto fallito). E' la quarta riscrittura: vale la regola `:355-360`.
- TASK: `roles: ["master", "organizer", "staff"]` (D-52-24), nessun `href`.

---

### `src/lib/routes/staff-tabs.ts` (config)

- `:122` `label: "Events"` → `"Manage events"` (D-52-10). L'asserzione `:323-342`
  confronta `href` e `capability`, non l'etichetta: nessun effetto.
- **Nessun riordino della dichiarazione** (D-52-27): l'ordine alfabetico si applica
  al rendering. Il paragrafo `:95-120` sulla contiguita' dei quattro strumenti di
  produzione diventa falso a schermo (l'alfabeto li separa): si aggiorna dicendo
  che la dichiarazione tiene il raggruppamento e il rendering l'alfabeto.

---

### `src/components/layout/AppNav.tsx` (component client, stato UI)

**Analogo:** se stesso; per la lista in colonna `StaffNav.tsx:102-141`.

- **Una sola** voce-link col frammento dichiarato (`:272-288`):
  ```tsx
  className={`${isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE} ${isActive ? "text-accent" : "text-muted"}`}
  ```
  Il frammento `isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE` e' pinnato da
  `verify-touch-targets.mjs:790` e deve risolvere **un** elemento: il pulsante
  Management, TASK e le righe del pannello **non** lo riusano e scrivono
  `min-h-11` **letterale** nella propria stringa.
- Stato corrente in tre canali (`:55-60`, `:275-285`): `text-accent` +
  indicatore 2 px (`INDICATOR_PHONE`/`INDICATOR_RESPONSIVE`, `:217-222`) +
  `aria-current="page"`.
- Riga della colonna, da `StaffNav.tsx:102-104, 120-136`:
  ```tsx
  const COLUMN_ENTRY =
    "relative flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm " +
    `transition-all active:scale-95 active:opacity-80 ${FOCUS_RING}`;
  …
  {isActive && <span aria-hidden="true" className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-accent" />}
  ```
  (con `ps-16` al posto di `px-4` per le righe del pannello, UI-SPEC §B.3).
- Telefono vs colonna: **due alberi scelti da CSS** come fa gia' `:292-306`
  (`hidden md:block`, «no viewport is read»); due pulsanti, due stati
  (`verify:no-viewport-read`).
- Foglio e scrim **fratelli** del `<nav>`, non figli: il `<nav>` porta
  `[transform:translate3d(0,0,0)]` (`:185-188`, e la sua ragione `:159-184`), che
  renderebbe `fixed` relativo all'antenato (UI-SPEC §B.2). Nessun `inset-0`
  (`verify:dialogs`).
- La prop `workNav` (`:107-112`) e il blocco `:292-306` escono; la docblock
  «It does not collapse … No toggle, no drawer» (`:36-41`) si **rovescia con la
  sua ragione** (RESP-04 regge dove si applica: dentro uno strumento la lista parte
  aperta), stessa regola di `nextjs-architecture.md` («la decisione rovesciata si
  scrive con la sua ragione»).
- Il dizionario `icons` (`:115-147`): si aggiungono gli SVG Heroicons outline
  24 px `strokeWidth={1.5}` nella stessa forma; il commento sul glifo `home`
  (`:116-120`, «la fase 52 decide») si chiude: Home non torna (D-52-02).
- Chiusura su cambio di `usePathname()` (Pitfall 4): dentro `(work)` `AppNav` non
  si smonta.

---

### `src/components/staff/StaffNav.tsx` e `src/app/(admin)/admin/(work)/layout.tsx`

- `StaffNav` forma `"column"` (`:111-141`) perde l'unico consumatore
  (`(work)/layout.tsx:156`): esce con la prop `form` ridotta, e il docblock `:90-97`
  («the work layout mounts both») si aggiorna. Righe da ritoccare nei gate se la
  descrizione diventa falsa: `verify-touch-targets.mjs:701`,
  `conversion-manifest.mjs:194` (ricerca §B.3).
- Striscia appesa (NAV-04): `<nav aria-label="Work surfaces" className="mb-6 px-6
  md:hidden">` (`:155`) guadagna `sticky top-0 z-10 bg-ground border-b
  border-line py-2` — **opaco, niente `backdrop-blur`** (la causa documentata del
  difetto iOS in `AppNav.tsx:169-184`). La costruzione dello scorrimento
  (`:145-154`, `:162`) resta.
- Ordine alfabetico al rendering (D-52-27): `[...visibleTabs].sort((a, b) =>
  a.label.localeCompare(b.label, "en"))`.
- `(work)/layout.tsx:150-157`: `AppNav` senza `workNav`. Il wrapper
  `md:[--nav-inset-inline-start:14rem]` (`:180`) e il suo commento (`:158-179`)
  **restano**: controllo E di `verify:conversion`.

---

### `src/app/(members)/account/page.tsx` e `ManagementSection.tsx`

- Escono `canReachManagementTools` (`:446-447`) e il mount (`:791-793`). Il
  docblock `:62-64` diceva gia' che lo toglie NAV-03.
- `ManagementSection.tsx` (71 righe): senza importatori si cancella. Il suo
  docblock `:21-28` («Hiding a nav item is not protecting a route») **non si perde**:
  e' gia' in `staff-tabs.ts:20` e va citato nel nuovo pannello di `AppNav`.
- Verifica: `grep` → zero importatori di `ManagementSection`.

---

### `src/app/globals.css` (stile)

- `--nav-inset-block-end` (`:335`, azzerata da `md` a `:361-365`) **non cambia**:
  la riga resta `h-20`.
- La regola «barra nascosta al fuoco» (UI-SPEC §A.5, ricerca §H.3) sotto `@media
  (pointer: coarse)` con `body:has(:is(input:not(...), textarea, select):focus)
  [data-nav-form="…"]`. **Nessuna regola `:has(` o `pointer:` esiste oggi in
  `globals.css`**: e' un pattern nuovo, va scritto col suo commento («nessuna
  lettura del viewport»).
- La keyframe del foglio (160 ms, `motion-reduce:animate-none`).

---

### `src/app/(public)/events/page.tsx` + `FormatFilterRow.tsx` (NAV-06)

**Analogo:** se stesso.

- Il commento D-36-13/D-36-16 (`:185-207`, «the chip row must not vary with the
  data OR with the viewer») si **riscrive** con D-52-15; resta vero il paragrafo
  «No count, no join … A count is the one channel that reveals an unannounced
  night» (`:204-206`).
- Catalogo (`:208-214`): via `.is("retired_at", null)` (D-52-16), `.eq("listed",
  true)` resta. Il `throw` con categoria `[events.catalogue_read_failed]`
  (`:216-220`) resta fuori dal `try`.
- Lo `Set` degli slug subito dopo `allEvents` (`:577`) e **prima** del filtro
  (`:584-586`), che gia' dichiara la regola giusta:
  ```typescript
  // The filter is applied ON THE ARRAY ALREADY RENDERED, never as a second
  // query. … Whatever the reader above was refused, this line cannot un-refuse.
  ```
  Nome, colore e ordine **dal catalogo**, dall'array **solo lo slug** (ricerca §E.2).
- **P6**: `activeFormatOption` e' calcolato a `:234-237`, prima del `try`.
- `FormatFilterRow.tsx:155-175` disegna sempre «All»: con zero chip non si monta
  (D-52-17). Gate: `verify:venue-surfaces` pinna due stringhe esatte in
  `events/page.tsx` (ricerca §E.7) — non toccarle.

---

### `src/components/admin/MemberTable.tsx` (NAV-05 + legenda)

**Analogo:** le due cifre sorelle (`:678-685`):
```tsx
<span>
  <span className="font-mono font-semibold text-ink">{organizerCount}</span>{" "}
  organizers
</span>
```
- La cifra `staff` (`:686-695`, oggi `<button onClick={() => setRoleFilter("staff")}>`)
  prende **esattamente** quella forma; il commento `:686-688` si riscrive.
- La legenda (`:724-730`): «A staff account grants nothing of its own … Working the
  door or a gallery comes from the night's own assignment» e' **falsa** dal giorno
  della migration (Pitfall 5): si riscrive nello **stesso piano di M1**. Il badge
  tratteggiato puo' restare; il commento del badge (ricerca §F.2, `:124-129`) si
  aggiorna.

---

### `src/app/(admin)/admin/scanner/ScannerClient.tsx` (porta, offline) — Critical

**Analogo:** se stesso.

- Tipo (`:415`): `type FilterTab = "all" | "not_arrived" | "checked_in";` →
  `+ "recent" | "alerts"`. Default `"not_arrived"` (`:631`) invariato.
- Costruzione nel render (`:2755-2759`), forma da estendere:
  ```typescript
  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalAttendees },
    { key: "not_arrived", label: "Not Arrived", count: totalNotArrived },
    { key: "checked_in", label: "Checked In", count: totalCheckedIn },
  ];
  ```
  Etichette corte (D-52-26) + `aria-label` col nome intero (UI-SPEC §D.2).
- Il bottone (`:3279-3291`): l'espressione `onClick={() => setActiveFilter(tab.key)}`
  resta **identica e unica** nel sorgente; il bottone guadagna `min-h-11` e la riga
  `verify-touch-targets.mjs:1414-1418` **esce da `DOOR_TARGET_DEBT` nello stesso
  commit** (14 → 13). `DOOR_TARGET_DEBT_CEILING.count` (`:1302-1307`) **non si
  edita**: il debito scende liberamente sotto il tetto (`:1286-1290`).
- Cronologia (`:3458-3470`): l'intestazione `text-[10px]` «Recent scans» sparisce;
  `handleUndoCheckIn(record)` resta identico e compare una volta (pinnato dal gate).
- Il conteggio di Alerts e' un array **derivato al render** (ricerca §G), la banda
  **non** entra in `cacheNotices`; `activeFilter` non cambia mai da solo (D-52-20).
- `CONNECTIVITY_PILL` e le tinte della pastiglia offline non si spostano ne' si
  rinominano (`verify:scan-legibility`).

---

### `src/app/layout.tsx` + `EventTabs.tsx` (viewport)

- `export const viewport` (`layout.tsx:81-106`): aggiungere
  `interactiveWidget: "resizes-content"` con il commento che dichiara Safari iOS
  **assente** (ricerca, Code Examples). Il blocco sulla scala (`:84-99`) **non si
  tocca** e non si cita per esteso (e' pinnato da un grep). **Niente
  `viewportFit`**.
- `EventTabs.tsx:582, 585`: `minHeight: "60vh"` → `"60dvh"` (l'unico `vh` rimasto).
- `PageShell.tsx` **non si tocca** (digest sha256 in `verify:conversion`).

---

### `52-PROCEDURES.md` (doc, procedura manuale)

**Analogo:** `51-PROCEDURES.md`.
- Frontmatter `:1-10` (`document`, `written`, `walked: —`, `procedures: n`,
  `status: SCRITTA, NON PERCORSA — gli esiti vanno in 52-ESITI.md`, `requirements`).
- Riquadro «Questo documento e' pubblicato» (`:14-18`): ruoli, mai persone; il
  ref del laboratorio sta in `.env.lab.local`.
- «scritta PRIMA di essere percorsa» e i `Result: pending` separati (`:20-24`,
  `:159-171`).
- `PRE-LAB` (`:48-54`): progetto `ACTIVE_HEALTHY` (NXDOMAIN = INACTIVE), commit
  servito da `lab.resonatemotion.com` scritto **prima**, precondizioni di dati.
- Tabella dei passi `# · Passo · Ruolo · Cosa si deve osservare` (`:116-126`).
- «La rilettura conferma, non sostituisce» (`:146-149`) e «Se la corsa si ferma»
  (`:151-155`).
- Per P-52-F: l'**aspettativa scritta prima** (D-52-28): «ridimensionamento del
  viewport atteso assente su Safari di oggi», registrato separato dalle misure di
  layout (Pitfall 6).
- Per P-52-G (NAV-07): le otto sonde di ricerca §I.8, con la finestra di cache
  annotata (Pitfall 15).

---

### `52-AUTHORISATION-*.md` (doc, atto datato)

**Analogo:** `51-AUTHORISATION-COMMENT.md` (61 righe), forma intera:
- frontmatter `:1-12` — `granted`, `granted_date`, `granted_by: il proprietario`,
  `scope` (alla lettera), `answer` (letterale), `status`, `exhausted`;
- «## 1. Il perimetro, e non un byte oltre» (`:21-32`) con tabella dei passi,
  «Fuori perimetro», «Reversibile», «Provata sul laboratorio» con versione coniata;
- «## 2. La domanda, alla lettera — e la risposta» (`:34-42`);
- «## 3. Registro d'uso» (`:44-53`) con ora UTC, rilettura `read_only`, esito;
- «## 4. Chiusura» con `# ⚠ ESAURITA — <utc>` e «Da qui in poi questo documento
  non autorizza piu' niente.» (`:55-61`).
- Per gli script (D-52-30, D-52-31) il documento porta **anche** il blocco di
  concessione leggibile dalla macchina (`purge-attendances.mjs:62-67`), che lo
  strumento consuma da se'.
- Ordine NAV-07 (ricerca §I.6): M1 → deploy → M2, **due atti o uno con due passi e
  il deploy in mezzo**, dichiarato nel perimetro.

---

## Shared Patterns

### Guardia di pagina (capability)
**Fonte:** `src/app/(admin)/admin/(work)/manifesto/page.tsx:110-119`
**Si applica a:** `gallery/page.tsx`; ogni server action nuova di firma.
```typescript
const { capabilities } = await getAccessContext();
if (!capabilities.has(CAP.X)) {
  redirect("/dashboard");
}
```

### Nascondere una voce non protegge una rotta
**Fonte:** `ManagementSection.tsx:21-28`, `staff-tabs.ts:20`, `roles.ts:300-309`
**Si applica a:** barra, pannello, striscia, sezione Gallery della serata. Ogni
voce disegnata ha la sua riga nella mappa e la sua guardia; `AppNav` e' `"use
client"` e non filtra (`AppNav.tsx:25-31`).

### Il confine e' la RLS, e la firma passa dalla sessione
**Fonte:** `visual/actions.ts:400-407`, `20260817120400:180-196, 257-266`
**Si applica a:** M1, M2, firma, `deleteMedia`.

### Zero fallimenti silenziosi: categoria per causa
**Fonte:** `visual/actions.ts:432-480` (`[visual.asset_read_failed]` ≠
`[visual.asset_sign_failed]`), `purge-attendances.mjs:213-217` (`fail(category, …)`),
`events/page.tsx:216-220`.
**Si applica a:** firma (`[gallery.read_failed]`, `[gallery.sign_failed]`), script,
immagine che non carica (testo visibile, non solo log: non esiste error tracking).

### Script: laboratorio per default, produzione solo sotto atto consumato
**Fonte:** `purge-attendances.mjs:1-15, 107-206, 529-546`
**Si applica a:** `purge-media-orphans.mjs`, `restrip-event-media.mjs`, e
all'applicazione di M1/M2.

### Migration: forma di oggi
**Fonte:** `20260922120000:1-49` (testata), `:587-603` (`DO` che solleva), `:638-642`
(`COMMENT` ricontati); **senza `BEGIN`/`COMMIT`** (P1).
**Si applica a:** M1, M2.

### Un gate statico che pinna un frammento si muove nello stesso commit
**Fonte:** `verify-touch-targets.mjs:790, 1286-1306, 1414-1418`; `verify:routes`
controllo 3; `verify:capabilities` costanti; `verify:conversion` controllo E.
**Si applica a:** `AppNav.tsx`, `ScannerClient.tsx`, `next-redirect.ts`, `keys.ts`.

### Prosa datata: si corregge ricontando, non si somma
**Fonte:** `capability-routes.ts:159-189`, `roles.ts:392-422`, `verify-capabilities.mjs:690-720`
**Si applica a:** ogni conteggio in commento toccato dalla fase (chiavi, concessioni,
voci di barra, mount di `AppNav` = 13).

---

## No Analog Found

| File / pezzo | Role | Data Flow | Ragione |
|---|---|---|---|
| Foglio Management da telefono (disclosure non modale, scrim `fixed inset-x-0 top-0 bottom-[var(--nav-inset-block-end)]`) dentro `AppNav.tsx` | component | event-driven | nessun menu/drawer esiste nel prodotto (`AppNav.tsx:36-41` lo dichiara). Usare `52-UI-SPEC.md` §B.2 e ricerca §B.5; `Dialog.tsx` e' **escluso** (titolo obbligatorio, velo inerte sulla barra) |
| Regola CSS `:has(:focus)` sotto `pointer: coarse` in `globals.css` | config | — | nessuna regola `:has(` o `@media (pointer` esiste oggi. Usare UI-SPEC §A.5 e ricerca §H.3; da provare sull'iPhone (assunzione A2) |
| `onError` su `<img>` per la miniatura non caricata | component | event-driven | nessun `<img>` del prodotto ne ha uno; l'analogo piu' vicino e' l'assenza dichiarata a livello di lista in `(work)/visual/page.tsx:604-630` |

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `src/lib/{rbac,routes,capabilities,media,production}/`, `src/components/{layout,staff,account,media,admin}/`, `src/app/(public)/{gallery,events}/`, `src/app/(admin)/admin/{(work),visual,scanner}/`, `src/app/(members)/account/`, `src/app/layout.tsx`, `src/app/globals.css`, `scripts/`, `.planning/phases/51-…/`
**Files scanned:** ~40 (letti a sezioni mirate; nessun intervallo riletto)
**Pattern extraction date:** 2026-09-23
