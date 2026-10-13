# Fase 53: Meno strumenti, la porta dentro Management — Ricerca

**Raccolta:** 2026-10-14, sul ramo `wip/52.3` (HEAD `c2a6ab4c`). Tutte le ancore `file:riga` sono misurate quel giorno: **rileggerle prima di modificare**, perche' una fase di cancellazione sposta le righe di ogni file che tocca.
**Dominio:** rimozione di quattro superfici di lavoro (codice, schema, storage, cron, env, gate, persona), spostamento di una voce della navigazione, una creazione nuova da una sezione esistente.
**Confidenza:** ALTA per l'inventario (letto dal codice e dalle migration, non ricordato); MEDIA per i conteggi di righe in produzione (non letti: la ricerca non tocca la produzione).

## Sommario

La fase e' per quattro quinti una **cancellazione**, e il rischio non sta nel togliere i file: sta in cio' che resta e li nominava. L'inventario misurato conta **46 file tracciati** che escono interi (circa 24.000 righe), **11 tabelle**, una colonna su una tabella che resta (`party_series.ics_alias`), un bucket privato con le sue policy, **tre chiavi di capability** con sei concessioni, un cron, tre variabili d'ambiente su Vercel, nove script e otto voci di `package.json` (cinque `verify:*`, tre di import e seme) — e una lista di **sopravvissuti che vanno riscritti**, perche' Manifesto condivide con Visual il form, il contratto di scrittura, il contratto di esportazione, due tabelle e due gate.

**Il fatto che cambia di piu' il piano:** il proprietario ha nominato quattro sezioni — TASK, Location, Visual, Calendar — e **non Manifesto**. Manifesto e' una quinta sezione con la sua chiave (`production.manifesto.manage`), la sua voce di pannello e la sua pagina, ma vive **intrecciata** con Visual: `(work)/visual/page.tsx:9-14` importa sei moduli da `admin/manifesto/`, le due sezioni scrivono la stessa tabella `production_section` distinta da una colonna, e `production_open_question` ha una policy per ciascuna delle quattro sezioni piu' una «brandwide» che le legge tutte. La ricerca raccomanda di **tenere Manifesto** (e' la lettera della richiesta) e di trattare il suo districamento come lavoro dichiarato, non come effetto collaterale. Va comunque confermato con il proprietario prima di pianificare (vedi Domande aperte, Q1).

**La porta.** CUT-02 non richiede alcuna nuova regola d'accesso. Oggi `organizer` e `master` tengono `door.operate` **per ruolo** (`scripts/verify-capabilities.mjs`, matrice `ROLE_GRANTS`), lo `staff` **solo per assegnazione** (`20260808000500_staff_role.sql`, citato in `capability-routes.ts:246-250`). D-53-01 coincide quindi esattamente con una derivazione dalle capability: *tenuta per ruolo → riga del pannello; tenuta solo per assegnazione → voce della barra*. Il predicato del middleware e della guardia della porta resta identico; cambia solo **dove** la voce si disegna.

**Il budget della persona e' la trappola piu' sottile.** `npm run verify:persona`, eseguito oggi: caso peggiore `DoorSurface.tsx`, **14.943 token su un tetto di 15.000** — margine **57 token, circa 200 byte**. CUT-06 riscrive `CLAUDE.md` (sempre caricato) e `access-gating.md` (caricato sul caso peggiore): ogni byte in piu' li' rompe il controllo E. La riscrittura deve essere a saldo zero o negativo su quei file.

**Raccomandazione primaria:** codice prima, schema dopo (l'ordine inverso della costruzione, precedente `20261001120200_gallery_removal.sql`); una migration di sola rimozione con precondizioni a zero righe e rilettura finale, applicata al laboratorio e poi in produzione via `POST /v1/projects/{ref}/database/migrations`; righe e oggetti tolti **prima** della migration, per chiave, con conteggio, **dopo** aver chiesto al proprietario se vuole una copia di cio' che esiste solo nel database (le foto dell'archivio del visual, le spunte della checklist).

## Mappa delle responsabilita' architetturali

| Capacita' | Livello primario | Livello secondario | Perche' |
|---|---|---|---|
| Chi raggiunge un indirizzo | Frontend Server (middleware, `capability-routes.ts`) | API (guardia di pagina) | Il middleware e' UX: decide il redirect, non la lettura (`capability-routes.ts:23-31`) |
| Chi legge una riga di produzione | Database (RLS, `private.has_capability`) | — | Le policy nelle migration sono il confine; togliere le pagine non toglie le policy |
| Dove si disegna Check-in | Browser/Client (`AppNav.tsx`, `"use client"`) | Funzione pura `getNavigation` (`roles.ts:653`) | La voce decide la visibilita', mai l'accesso (`roles.ts:632-634`) |
| La porta offline | Browser/Client (`src/lib/offline/`, service worker) | API (`/api/tickets/checkin`) | Non toccata: CUT-02 sposta un link, non il percorso dello scan |
| Creare una sede | API (server action `createVenue`, client cookie sotto RLS) | Browser (modal) | La scrittura decide da sola (`venues/actions.ts:122-184`); il bottone allarga solo dove il form si raggiunge |
| Lo specchio ICS | API/cron (`/api/cron/production-mirror`) | Vercel (cron + env) | Esce con le tre variabili; la cancellazione del cron passa da `vercel.json` + redeploy |
| L'archivio delle foto | Storage (bucket `visual-archive`, privato) | API (`/api/media/finalize-archive`) | Gli oggetti non si cancellano da SQL (precedente 52.1, Pitfall 2) |

<phase_requirements>
## Requisiti della fase

`.planning/REQUIREMENTS.md` **non esiste** in questo repo (verificato: `grep` restituisce *No such file*). Gli ID vengono dalla tabella della fase in `.planning/ROADMAP.md:986-993`; il planner li usa da li'.

| ID | Descrizione (ROADMAP) | Cosa lo rende pianificabile |
|---|---|---|
| CUT-01 | TASK, Location, Visual e Calendar escono, con ogni riferimento | §1 Inventario di cancellazione, §2 Dati, §8 trappole del `grep` a zero |
| CUT-02 | Check-in dentro Management per organizer/master; in barra per lo staff assegnato | §3 La barra e il pannello |
| CUT-03 | In Venues si crea una sede dalla sezione, come in Artists | §4 Venues e Artists (analogo esatto: commit `31baf149`) |
| CUT-04 | La persona segue la cancellazione nello stesso commit | §5 La persona |
| CUT-05 | Verifica in un repo senza test | §6 e `## Validation Architecture` |
| CUT-06 | I documenti che difendono la community (DOC-01..04), in fondo | §5.4 e §7 Ordine delle onde |
</phase_requirements>

## Vincoli di progetto (da CLAUDE.md e dai moduli)

- **Nessun test runner.** La verifica e' `npm run build` (typecheck incluso), `npm run verify`, `npm run verify:persona` e una procedura manuale scritta, percorsa sul laboratorio. Non scrivere mai «i test passano» (`CLAUDE.md`, Guardrail 1).
- **Repo pubblico.** In nessun file tracciato — piani, SUMMARY, migration, commit — compaiono nomi di spazi in trattativa, indirizzi, date non annunciate, line-up, valori di variabili d'ambiente, identificativi di riga o percorsi di oggetti (`CLAUDE.md`, Guardrail 5; precedente in testa a `20261001120200_gallery_removal.sql:79-80`). La copia di sicurezza delle righe di Location contiene **indirizzi di spazi in trattativa**: non entra nel repo, mai.
- **Le migration sono la fonte dello schema**; `src/types/database.ts` cambia nello stesso commit dello schema (`supabase-data.md`, gate *tipi allineati*). `database.ts` e' **scritto a mano**, non generato (`database.ts:1123`: nessun client e' parametrizzato con uno schema generato).
- **Migration in avanti, idempotenti** (`IF EXISTS`), mai modificate dopo l'applicazione.
- **Zero fallimenti silenziosi**: ogni refusal nuovo (es. la creazione di una sede da Venues) ha la sua frase per causa.
- **Critical**: CUT-02 tocca la navigazione della porta e CUT-03 scrive indirizzi di sede (`venue-secrecy.md`). Analisi d'impatto e validazione del proprietario **prima** di agire su quei due.
- **`verify:persona` dopo la cancellazione, mai prima** (memoria `verify-persona-after-deleting-surfaces`, ROADMAP «Il gate della verifica»).
- **Il laboratorio prima della produzione**; ogni script di laboratorio rifiuta il ref di produzione come prima riga eseguita (`meta-gates.md`; `scripts/lab-apply-migration.mjs:18-29`).
- **Lessico:** `attendee` non e' «socio»; `member` non e' un ruolo che il database accetta; un format non e' un evento.

## Standard stack

Nessuna libreria nuova. La fase **toglie** codice; non installa pacchetti. Il Package Legitimacy Gate non si applica (nessun `npm install`).

| Strumento | Versione misurata | Uso in questa fase |
|---|---|---|
| Node | v25.6.1 | build e script |
| npm | 11.9.0 | `npm run build`, `npm run verify`, `npm run verify:persona` |
| Vercel CLI | 64.0.2 (via `npx --no-install`, `unset VERCEL_TOKEN` prima) | `vercel env rm` delle tre variabili; lettura dei deploy |
| Supabase Management API | — | `POST /v1/projects/{ref}/database/migrations` (annota il registro) per la migration; `/database/query` con `read_only: true` solo per le riletture |
| Supabase Storage API | — | svuotamento e cancellazione del bucket `visual-archive` |

## Package Legitimacy Audit

Nessun pacchetto installato da questa fase: sezione non applicabile.

---

## 1. Inventario di cancellazione (CUT-01)

Verdetti: **cade** (il file esce intero), **si riscrive** (resta, perde le parti che nominano cio' che esce), **resta** (letto e non toccato, o toccato solo nella prosa).

### 1.1 TASK

TASK **non ha rotta, pagina, tabella, chiave, ne' server action**: `grep -rn "\bTASK\b" src` trova solo `roles.ts` e `AppNav.tsx`, e nelle migration non c'e' nulla.

| Artefatto | Cos'e' | Consumatori | Verdetto |
|---|---|---|---|
| `src/lib/rbac/roles.ts:179-188` | ramo `disabled` di `PanelEntry` (unico membro: `label: "TASK"`) | `AppNav.tsx:598-614`, `:687-699` | **si riscrive**: il tipo torna a una forma sola (`link`) |
| `src/lib/rbac/roles.ts:387-414` | `TASK_ROLES` e la costante `TASK` | `getNavigation` `:676-684` | **cade** |
| `src/lib/rbac/roles.ts:676-684` | il push della riga spenta in coda al pannello | — | **cade**; con lei l'unico uso di `role` oltre a `isAuthenticated` (`:658`) |
| `src/lib/rbac/roles.ts:537-622` | tabelle e prosa del docblock di `getNavigation` | — | **si riscrive** (quinta riscrittura: e il docblock dice gia' perche' va fatta, `:533-535`) |
| `src/components/layout/AppNav.tsx:192-200` | icona `clipboard-document-check`, «tenuta per la fase 53» | nessuno (`:193`) | **cade** |
| `src/components/layout/AppNav.tsx:598-614`, `:687-699` | rendering della riga spenta in colonna e foglio | — | **cade**; i due `if (row.kind === "disabled")` spariscono col tipo |
| `src/components/layout/AppNav.tsx:25`, `:313`, `:329`, `:356-357`, `:511-515` | prosa su TASK | — | **si riscrive** (vedi §8, *il grep a zero e la prosa*) |

### 1.2 Calendar (fase 44) e lo specchio ICS (fase 58, D-53-02)

| Artefatto | Cos'e' | Consumatori | Verdetto |
|---|---|---|---|
| `src/app/(admin)/admin/(work)/calendar/` (4 file: `page.tsx`, `loading.tsx`, `[id]/page.tsx`, `[id]/loading.tsx`) | rotte | router | **cade** |
| `src/app/(admin)/admin/calendar/` (8 file: `actions.ts`, `AnnounceNightDialog.tsx`, `CalendarList.tsx`, `ChecklistSection.tsx`, `ImportRunSummary.tsx`, `PieceDate.tsx`, `PiecesSection.tsx`, `dates.ts`) | azioni e componenti | le pagine sopra; **`dates.ts` anche da `(work)/location/[id]/page.tsx:35`** (che cade con Location) | **cade** |
| `src/lib/production/ics/` (8 file: `anchors`, `classify`, `guard`, `index`, `parse`, `reconcile`, `unfold`, `vocabulary`) | parser, riconciliatore, guardia | calendar, cron, `database.ts:42-62`, **`sections/vocabulary.ts:67-68`** (riesporta `VENUE_STAGES`/`VenueStage`), `components/production/StageBadge.tsx:3`, `scripts/verify-mirror-guards.mjs` | **cade** — ma prima vanno tolti i due import di `database.ts` e la riesportazione di `sections/vocabulary.ts` |
| `src/components/production/StageBadge.tsx` | badge dello stadio | `calendar/[id]/page.tsx:19`, `calendar/CalendarList.tsx:9`, `location/SpaceName.tsx:1` | **cade** (tutti i consumatori cadono); la directory resta vuota e sparisce |
| `src/app/api/cron/production-mirror/route.ts` | il cron | Vercel Cron | **cade** |
| `vercel.json:26-29` | voce `"/api/cron/production-mirror"`, `"30 8 * * *"` | Vercel | **cade**: le voci passano da 8 a **7** |
| Vercel env `PRODUCTION_CALENDAR_FEED_RSNT`, `_RMDB`, `_MTNLB` | sorgenti dei feed | solo il cron (`route.ts:581`, nome derivato da `CALENDAR_KEYS`, `ics/vocabulary.ts:332`) e `scripts/import-production-calendar.mjs:726` | **cadono**: `vercel env ls` letto il 2026-10-14 le mostra **solo su Production** (38 giorni fa), nessuna su Preview o Development; nessuna in `.env.local`/`.env.lab.local`/`.env.local.example` |
| `src/lib/routes/capability-routes.ts:568-682` | docblock + voce `CAP.PRODUCTION_CALENDAR_MANAGE` → `/admin/calendar`, `/admin/calendar/[id]` | middleware, guardie, `staff-tabs.ts` | **cade** la voce; il `Record` totale (`:937`) obbliga a togliere chiave e voce insieme |
| `src/lib/routes/staff-tabs.ts:223-227` (+ prosa `:179-222`) | tab «Calendar» | `visibleStaffTabs` → pannello e `StaffNav` | **cade** |
| `src/lib/capabilities/keys.ts:361-366`, `:451-452` (+ prosa `:161-210`, `:284`) | `PRODUCTION_CALENDAR_MANAGE` e la sua descrizione | ovunque | **cade** |
| `src/types/database.ts:36-62` (import da `ics/vocabulary` e `ics/reconcile`), `:1528-2310` circa (`ProductionChecklistKind`, `ProductionPlan`, `ProductionPiece`, `ProductionCommitment`, `ProductionImportRun`, `ProductionChecklistItem`, `ProductionLineupSlot`, `ProductionPipelineRule`) | tipi | pagine e azioni che cadono | **cade**; leggere i confini di ogni interfaccia prima di tagliare |
| `src/types/database.ts:286` | `ics_alias: string \| null` su `PartySeries` | solo il cron e l'importatore | **cade** (con la colonna) |

### 1.3 Location (fase 45)

| Artefatto | Cos'e' | Consumatori | Verdetto |
|---|---|---|---|
| `src/app/(admin)/admin/(work)/location/` (4 file) | rotte | router | **cade** |
| `src/app/(admin)/admin/location/` (8 file: `actions.ts`, `AttributeCell`, `PromoteSpaceDialog`, `ScoreCell`, `SpaceForm`, `SpaceList`, `SpaceName`, `StageChangeDialog`) | azioni e componenti | le pagine sopra | **cade**. `promoteSpace` (`actions.ts:1533`) **scrive in `venues`** (`:1648-1806`): le sedi gia' create da una promozione **restano** in `venues` — solo il legame `production_space.promoted_venue_id` sparisce con la tabella |
| `src/lib/production/sections/score.ts` | punteggio per format | `location/[id]/page.tsx`, `ScoreCell.tsx` | **cade** |
| `capability-routes.ts:684-777` | voce `CAP.PRODUCTION_LOCATION_MANAGE` → `/admin/location`, `/admin/location/[id]` | — | **cade** |
| `staff-tabs.ts:259-263` (+ prosa) | tab «Location» | — | **cade** |
| `keys.ts:378-384`, `:457` (+ prosa `:257-283`) | chiave e descrizione | — | **cade** |
| `database.ts:2310-2495` circa (`ProductionSpace`, `ProductionSpaceAttribute`) | tipi | — | **cade** |
| `sections/vocabulary.ts:177-440` circa (`EXIT_REASONS`, `ATTRIBUTE_*`, `ANSWERS_SOURCE`, `EXTENDED_HOURS_STANCE`, `SIZE_BANDS`, `SPACE_CATEGORIES`) e `:67-68` | vocabolario di Location | location, `database.ts:73-84` | **si riscrive**: il file resta per Manifesto (`SECTION_STATES`, `SECTION_KINDS`) |

### 1.4 Visual (fase 45)

| Artefatto | Cos'e' | Consumatori | Verdetto |
|---|---|---|---|
| `src/app/(admin)/admin/(work)/visual/` (2 file) | rotta | router | **cade** |
| `src/app/(admin)/admin/visual/` (5 file: `actions.ts`, `export-actions.ts`, `ArchiveUpload.tsx`, `PaletteSwatches.tsx`) | azioni e componenti (`saveSection` scrive `production_section`, `recordVisualAsset`/`signVisualAssets` `production_visual_asset`) | la pagina | **cade** |
| `src/lib/production/export/capitolato.ts` | esportazione del capitolato | `visual/export-actions.ts` | **cade** |
| `src/lib/production/sections/tokens.ts` | legge la palette da `globals.css` a runtime | `visual/page.tsx`, `PaletteSwatches.tsx`, `capitolato.ts` | **cade** |
| `next.config.ts:36-54` | `outputFileTracingIncludes: { "/admin/visual": ["./src/app/globals.css"] }` e la sua prosa | serve solo a `tokens.ts` | **cade** (l'oggetto intero, se resta vuoto) |
| `src/lib/production/sections/visual-archive.ts` | contratto dell'archivio | `visual/page.tsx`, `ArchiveUpload.tsx`, `visual/actions.ts` | **cade** |
| `src/app/api/media/finalize-archive/route.ts` | finalizza una foto dell'archivio | `ArchiveUpload.tsx` | **cade** |
| `src/lib/media/may-upload.ts` | `mayUploadToVisualSection`, `MEDIA_VISUAL_UPLOAD_FORBIDDEN` | **solo** `finalize-archive/route.ts:4-7`, `:352` | **cade**. Citato in prosa da `venue-reveal/reveal-party-venue.ts:21,27`, `manifesto/actions.ts:36`, `sections/export-contract.ts:10`, `sections/write-contract.ts:11` come *precedente di forma* → quelle quattro frasi **si riscrivono** (il precedente sparisce) |
| `src/lib/media/finalize.ts`, `strip-metadata.ts`, `upload-limits.ts` | stripper e finalizzazione condivisi | **anche la cover** (`finalize-cover/route.ts:9-24`) | **restano**; si riscrive solo la prosa che descrive l'archivio come secondo chiamante (`finalize.ts:18`, `:45-120`, `:169-174`; `strip-metadata.ts:217`; `upload-limits.ts:24-43`) |
| `src/app/api/media/finalize-cover/route.ts:64-68` | prosa: «non e' la chiave del visual» | — | **resta**, prosa da rileggere |
| Bucket `event-media-quarantine` e policy `event_media_quarantine_insert_staff` | quarantena | **la cover** | **resta, intatta** — `gallery_removal.sql:41-47` la difendeva gia' per la stessa ragione |
| `capability-routes.ts:850-929` | voce `CAP.PRODUCTION_VISUAL_MANAGE` → `/admin/visual` | — | **cade** |
| `staff-tabs.ts:322-326` (+ prosa) | tab «Visual» | — | **cade** |
| `keys.ts:373-377`, `:455` (+ prosa `:237-256`, `:324-325`) | chiave e descrizione | — | **cade** |
| `database.ts:2572-2598` circa (`ProductionVisualAsset`), `VisualAssetKind` (`:83`) | tipi | — | **cade** |

### 1.5 Manifesto: cio' che **resta** e va districato da Visual

| Artefatto | Legame con cio' che esce | Verdetto |
|---|---|---|
| `src/app/(admin)/admin/(work)/manifesto/page.tsx` | nessun import da visual/location/calendar | **resta** |
| `admin/manifesto/{SectionForm,SectionStateBadge,SectionVoid,ExportPanel,OpenQuestionNotice,refusals}.tsx` | **montati anche da `(work)/visual/page.tsx:9-14`** e `ArchiveUpload.tsx:25-32`; prosa «one form, two keys» (`SectionForm.tsx:36`, `:143`), `SectionStateBadge.tsx:13`, `:64-67` | **restano**; la prosa che parla di due montaggi **si riscrive** |
| `admin/manifesto/actions.ts:188-197` | `revalidatePath("/admin/visual")` | **si riscrive** — e se resta, `verify:routes` [1/5] (*revalidatePath arguments*, `verify-routes.mjs:541`) lo segnala come rotta inesistente |
| `src/lib/production/sections/write-contract.ts` | condiviso Manifesto/Visual (`:18`) | **resta**, prosa |
| `src/lib/production/sections/export-contract.ts` | due esportazioni (manifesto, capitolato: `:45-49`, `:123-135`) | **si riscrive**: resta una sola esportazione |
| `src/lib/production/export/manifesto.ts` | menziona il capitolato in prosa (`:78`) | **resta**, prosa |
| `src/lib/production/sections/vocabulary.ts:127-133` | `SECTION_KINDS = ["manifesto", "visual"]` | **si riscrive** a `["manifesto"]` insieme al `CHECK` SQL (§1.7) |
| `database.ts` `ProductionSection`, `ProductionOpenQuestion` | tabelle che restano | **restano**, con `SectionKind` ristretto |

### 1.6 Superfici trasversali

| Artefatto | Cos'e' | Verdetto |
|---|---|---|
| `capability-routes.ts:160-205` | il conteggio «Eight entries of the fourteen carry `alsoGatesTables`» | **si riscrive** con un riconteggio: dopo, **5 di 11** (door.operate, register.read, party.manage, catalogue.manage, production.manifesto.manage). Misurato oggi sul file: le otto con il flag sono `:301-305`, `:396-399`, `:434-438`, `:521-524`, `:679-682`, `:774-777`, `:845-848`, `:926-929` |
| `capability-routes.ts:214-217` | «The fourteen keys» | **si riscrive**: undici |
| `staff-tabs.ts:373` | «The ten, verified against the map» (sono gia' dieci voci oggi: `:142-344`) | **si riscrive**: sette |
| `src/lib/supabase/middleware.ts:590`, `src/lib/routes/next-redirect.ts:143,148`, `scripts/verify-routes.mjs:594,625` | `/admin/calendar` e `/admin/location/[id]` usati come **esempi** in commenti | **si riscrive** l'esempio con un indirizzo vivo (CUT-01 chiede il `grep` a zero) |
| Service worker `src/app/sw.ts` | regole runtime solo per `/api/tickets/attendance`, `/api/tickets/checkin`, `/events/`, `/music`, `/artists/` (`:47-151`); precache = `self.__SW_MANIFEST` (`:155`); `cacheOnNavigation: false` (`next.config.ts:24`) | **resta, non toccato**. Nessuna rotta che esce e' nominata dal worker; i chunk delle pagine tolte escono dal manifesto al build successivo e `cleanupOutdatedCaches` li sfratta. `src/lib/offline/` **non nomina nessuna delle superfici** che escono (`grep` a zero). |
| `scripts/seed-lab-door.mjs:535-551` | il `--reset` del seme cancella `production_plan` e `production_space` | **si riscrive**, **nello stesso commit della migration**: dopo il `DROP` quel `delete from` prende `42P01` e il reset si ferma a meta' — e' il precedente identico della tabella delle presenze scritto in `:526-533` |

### 1.7 Schema: tabelle, colonne, funzioni, policy, chiavi

**Nessuna tabella che resta ha una FK verso una tabella che esce** (`grep "REFERENCES public.production_"` su tutte le migration: solo riferimenti interni). Le FK uscenti (`production_* → formats, party_series, venues, event_parties, profiles, auth.users`) non propagano nulla al `DROP`.

| Oggetto | Creato da | Riferimenti entranti | RLS che lo nomina | Verdetto |
|---|---|---|---|---|
| `production_plan` | `20260815120000_production_calendar.sql:168` | `production_piece.plan_id` (`:345`, **nessun ON DELETE**), `production_checklist_item.plan_id` (`:661`, CASCADE), `production_lineup_slot.plan_id` (`20260822120000:62`, CASCADE) | `..._select_production_read` (`20260815120100:180`, sostituita), `..._select_production_calendar_manage` (`20260817120000:299`) | **DROP** |
| trigger `production_plan_refuse_renumber` + funzione `public.refuse_production_plan_renumber()` | `20260815120100:328-355` (+ commento `20260820122000:85`) | — | — | **DROP FUNCTION** (il trigger cade con la tabella). E' `BEFORE UPDATE OF number`: **non** blocca le `DELETE` |
| `production_piece` | `20260815120000:328` (+ `20260820120000`, `20260820121000`, `20260820123000`) | — | `20260817120000:311` | **DROP** |
| `production_commitment` | `20260815120000:495` | autoriferimento `expanded_from` (`:523`, nessun ON DELETE) | `20260817120000:323` | **DROP** |
| `production_import_run` | `20260815120000:568` (+ `state_snapshot`, `20260827000000:55`) | — | `20260817120000:356` | **DROP** |
| `production_checklist_item` + funzione `public.record_checklist_tick(uuid, boolean, uuid, text)` | `20260815120000:648`; funzione `20260815120100:442`, grant `:567`, revoke `20260815120200:48-51` | — | `20260817120000:340` | **DROP** tabella e funzione |
| `production_pipeline_rule` | `20260815120000:942` | — | `20260817120000:376` | **DROP** |
| `production_lineup_slot` | `20260822120000:59` | nessuna (anche `livecuts` la nomina solo in un commento, `20261004120000:307`) | `20260822120000:159` | **DROP** |
| `party_series.ics_alias` + vincolo `party_series_ics_alias_unique` | `20260815120000:812-845` | — | — | **DROP COLUMN** (unica colonna su tabella che resta) |
| `production_space` | `20260817120100:134` | `production_space_attribute.space_id` (`:544`, **ON DELETE RESTRICT**) | `20260817120300:122` | **DROP** |
| `production_space_attribute` | `20260817120100:536` | — | `20260817120300:150` | **DROP** |
| `production_visual_asset` | `20260817120200:282` | — | `20260817120300:356` | **DROP** |
| `production_section` | `20260817120200:93`; `CHECK (section IN ('manifesto','visual'))` `:151-152` | — | `..._select_manifesto` `20260817120300:185` (resta), `..._select_visual` `:194` | **resta**: DELETE delle righe `section='visual'`, `DROP POLICY ..._select_visual`, `CHECK` riscritto a `('manifesto')` |
| `production_open_question` | `20260817120200:216` (colonna `section` **senza CHECK**, `:227-230`) | — | cinque policy `20260817120300:282-330`: `_manifesto` (resta), `_visual`, `_location`, `_calendar` (escono), `_brandwide` (`:321`, legge **tutte e quattro** le chiavi) | **resta**: DELETE delle righe `section IN ('visual','location','calendar')`; tre `DROP POLICY`; `_brandwide` **riscritta** sulla sola chiave del manifesto, **prima** di cancellare le chiavi |
| bucket `visual-archive` | `20260817120400_visual_archive_bucket.sql:169-177` | oggetti in `storage.objects` | policy `visual_archive_select_visual` (`:198-208`) | policy **DROP** in migration; **oggetti e bucket dall'API Storage**, non da SQL (`gallery_removal.sql:48-55`: *«42501: Direct deletion from storage tables is not allowed»*) |
| chiavi `production.calendar.manage`, `production.location.manage`, `production.visual.manage` | `20260817120000:104-162` | `private.role_capabilities.capability` (FK **ON DELETE CASCADE**, `20260807000000:122`); `party_assignments.capability` (FK senza ON DELETE, `20260809000000:292`) — ma il `CHECK party_assignments_capability_assignable` ammette solo `door.operate`, `door.supervise`, `party.manage` (`gallery_removal.sql:198-201`), quindi **nessuna assegnazione puo' esistere** | ogni policy sopra | `DELETE FROM private.role_capabilities` (6 righe: master e organizer × 3, `20260817120000:165-174`) **poi** `DELETE FROM private.capabilities` (3). **Esplicite, non lasciate alla cascata.** Dopo: **11 chiavi, 20 concessioni** (master 11, organizer 9, staff 0, attendee 0) — da 14/26 (`gallery_removal.sql:357-366`) |
| `COMMENT ON TABLE private.capabilities` / `private.role_capabilities` | `gallery_removal.sql:368-371` | — | — | **si riscrive** con i numeri nuovi (11 / 20) |

**Calendar ha anche lasciato righe fuori dalle sue tabelle**: `announceNight` (`calendar/actions.ts:616-901`) crea `events` e `event_parties` da un piano. Quelle serate **restano** — sono serate vere. Il legame `production_plan.linked_party_id` sparisce con la tabella, e nessuna pagina di evento lo legge (`grep` su `admin/events` e `components/events`: zero).

### 1.8 Script e gate

`scripts/verify-all.mjs:495-545` **rifiuta** in due direzioni: una voce `verify:*` di `package.json` che il runner non conosce, e una voce del runner (non opzionale) che `package.json` non dichiara. **Script, voce `package.json` e riga di `verify-all.mjs` escono nello stesso commit**, o `npm run verify` esce 2.

| Script | Voce npm | Lista in `verify-all.mjs` | Verdetto |
|---|---|---|---|
| `verify-calendar-surface.mjs` | `verify:calendar-surface` | OFFLINE `:358-364` | **cade** |
| `verify-ics-import.mjs` | `verify:ics` | NEEDS_MATERIAL `:430-438` | **cade** |
| `verify-ics-reachable.mjs` | `verify:ics-reachable` | OFFLINE `:257-263` | **cade** |
| `verify-ics-grammar.mjs` | `verify:ics-grammar` | OFFLINE `:264-283` | **cade** |
| `verify-mirror-guards.mjs` | `verify:mirror-guards` | OFFLINE `:284-300` | **cade** |
| `verify-section-surface.mjs` | `verify:section-surface` | OFFLINE `:366-375` | **si riscrive** (raccomandato): scope `:117-125` ristretto a manifesto + `src/lib/production/sections`; restano il check C *the void is declared* (`:618`, che `SectionVoid.tsx:10` cita come sua prova) e il check del log (`:772`); A (stadio, `:521`), B (provenienza, `:555`), D (palette, `:684`) cadono con Location e Visual. Se lo scope trova una directory mancante **rifiuta (exit 2)**: lasciarlo com'e' rende `npm run verify` non verde |
| `verify-section-export.mjs` | `verify:section-export` | OFFLINE `:376-385` | **si riscrive**: un solo modulo d'esportazione (`:100-105`, `:131-132`), tabelle di calendar/location/visual fuori dagli elenchi (`:169-195`, `:562-587`). Meta' chiede `SUPABASE_ACCESS_TOKEN` |
| `verify-capabilities.mjs` | `verify:capabilities` | OFFLINE `:251-256` | **si riscrive**: `EXPECTED_KEY_COUNT` `:320` 14 → **11**, `EXPECTED_GRANT_COUNT` 26 → **20**, le righe delle tre chiavi nelle matrici per ruolo (`:482-485`, `:541-544`, `:675-689`, `:764-767`). Legge un database vivo: fra deploy del codice e migration e' **rosso per costruzione**, e va dichiarato come in 52.1 (`gallery_removal.sql:21-24`) |
| `verify-refusal.mjs` | `verify:refusal` | NEEDS_AUTHORISATION `:453-468` | **si riscrive**: l'elenco delle sezioni `:173-227` (tabelle di calendar, location, visual) — altrimenti, alla prossima corsa autorizzata, conta tabelle che non esistono. **Non si esegue** in questa fase senza autorizzazione |
| `verify-routes.mjs` | `verify:routes` | OFFLINE `:304` | **resta**; prosa `:594`, `:625`. Il censimento [2/5] legge le pagine dal disco: togliere pagine **e** voci della mappa insieme lo tiene verde |
| `verify-conversion.mjs` + `conversion-manifest.mjs` | `verify:conversion` | OFFLINE `:308` | **si riscrive il manifesto**: `PENDING_SURFACES` `:298-314` perde calendar, location, visual (resta manifesto). `checkManifest()` **rifiuta un glob di `PENDING_SURFACES` che non trova alcun `page.tsx`** (`conversion-manifest.mjs:1355-1380`): togliere le pagine senza togliere la voce fa rosso il gate. Il conteggio di `:950-965` («26 page files … 1 + 19 + 6 = 26») e' **gia' vecchio oggi** (le pagine sotto `(work)` sono **25**, misurato): va riscritto con il riconteggio dopo la cancellazione (**20**). ⚠ `verify-conversion.mjs` contiene **byte NUL** (3, misurati): usare `/usr/bin/grep -a` o Read |
| `verify-media-strip.mjs` | `verify:media-strip` | OFFLINE `:303` | **resta**; prosa `:35-36`, `:134` sull'archivio |
| `verify-touch-targets.mjs` | `verify:touch-targets` | OFFLINE opzionale `:400` | **resta**; prosa `:1193-1194` (`ArchiveUpload.tsx`) |
| `import-production-calendar.mjs` | `import:calendar` | — | **cade** (+ voce npm) |
| `restore-mirror-snapshot.mjs` | `restore:mirror-snapshot` | — | **cade** (+ voce npm) |
| `seed-production-spaces.mjs` | `seed:spaces` | — | **cade** (+ voce npm) |
| `check-first-mirror-run.mjs` | nessuna | — | **cade** |
| `seed-lab-door.mjs` | nessuna | — | **si riscrive** `:535-551` (vedi §1.6) |
| `rls-baseline*.mjs` | `baseline:*` | — | **non verificato** se la fotografia salvata contiene le policy di produzione: non e' nella catena di `verify`; da rileggere solo se il planner usa `baseline:compare` come prova |

Dopo la fase, `package.json` dichiara **24** voci `verify:*` invece di 29 (misurate oggi) (cinque escono: `calendar-surface`, `ics`, `ics-reachable`, `ics-grammar`, `mirror-guards`), e tre voci non-verify (`import:calendar`, `restore:mirror-snapshot`, `seed:spaces`).

---

## 2. Dati nelle tabelle che cadono

**Non letti in produzione** da questa ricerca (vincolo di sola lettura del compito e nessuna autorizzazione). Cosa si sa dalle fonti:

| Tabella / oggetto | Cosa contiene, in genere | Probabile stato in produzione | Probabile stato sul lab |
|---|---|---|---|
| `production_plan`, `_piece`, `_commitment`, `_import_run`, `_lineup_slot` | lo specchio del calendario | **popolate**: il primo specchio a mano e' andato in produzione nel piano 58-11 (`58-12-SUMMARY.md:318-320`); il cron e' attivo dalle 08:30 UTC | vuote al tempo del commento di `seed-lab-door.mjs:535-538` — **non riverificato** |
| `production_checklist_item` | **spunte fatte a mano** (`ticked_by`, `record_checklist_tick`) | possibili; sono l'unico dato del calendario che **non** si rigenera dal feed | probabilmente vuota |
| `production_pipeline_rule` | regole per format (sedici righe di pipeline, `verify-refusal.mjs:180`) | popolata | non verificato |
| `production_space`, `_space_attribute` | lo scouting: **spazi in trattativa e i loro indirizzi** | popolate da `seed:spaces` (fino a 184 spazi, `seed-production-spaces.mjs:21`) | vuote secondo `seed-lab-door.mjs:535-538` |
| `production_section` | prosa di Manifesto e Visual | possibili righe di entrambe | non verificato |
| `production_open_question` | domande aperte per sezione | possibili | non verificato |
| `production_visual_asset` + oggetti di `visual-archive` | **foto di dj** e pezzi prodotti | **non noto**. Se esistono, il bucket e' **l'unica copia** che il prodotto conosce | non verificato |
| `party_series.ics_alias` | alias del feed | valorizzato sulle serie che il calendario classifica | non verificato |

**Raggiungibilita' per cascata (letta dai vincoli, non dalle tabelle create):** dentro il calendario `production_plan` → `production_checklist_item` (CASCADE) e → `production_lineup_slot` (CASCADE); `production_piece.plan_id` e `production_commitment.expanded_from` **senza ON DELETE** (bloccano); in Location `production_space_attribute.space_id` **RESTRICT** (blocca). Nessuna cascata esce dall'insieme che cade. Le chiavi: `private.role_capabilities` CASCADE dalla chiave.

**Ordine di rimozione per chiave** (prima della migration, una tabella alla volta, con `count` prima e dopo e `delete ... where id = any(...) returning id`): `production_lineup_slot` → `production_checklist_item` → `production_piece` → `production_commitment` (prima le righe con `expanded_from` non nullo) → `production_plan` → `production_import_run` → `production_pipeline_rule` → `production_space_attribute` → `production_space` → `production_visual_asset` (dopo gli oggetti del bucket) → `production_section where section='visual'` → `production_open_question where section in ('visual','location','calendar')`. **Precondizioni a zero** nella migration, come `gallery_removal.sql:60-133`: se una tabella ha ancora righe la migration **solleva** e non applica nulla.

**Prima di cancellare, una domanda al proprietario** (non una decisione tecnica): vuole una copia delle foto dell'archivio, delle spunte della checklist e della prosa di Visual? Calendario e scouting hanno una fonte fuori dal prodotto (il feed, `docs/`), le foto e le spunte forse no. Una copia, se richiesta, va **fuori dal repo** (gitignored, come le istantanee `.env.attendances-snapshot.*` della fase 51) e non si nomina in nessun file tracciato.

---

## 3. La barra e il pannello (CUT-02)

### 3.1 Come si decide oggi

- **Una funzione pura**: `getNavigation(role, capabilities, liveAssignmentCapabilities)` (`roles.ts:653-687`), chiamata solo da `AppNav.tsx:370`. 14 file montano `<AppNav` (misurato oggi con `grep -rln "<AppNav" src | grep -v roles.ts`, come dichiara il docblock `roles.ts:641-651`).
- **Barra**: `EVENTS` sempre; `CHECK_IN` se `admits(...)` (`:663-666`); `MUSIC` se `musicPageEnabled()` (`:670`; in produzione l'interruttore e' acceso: `NEXT_PUBLIC_MUSIC_PAGE_ENABLED` su Production, `vercel env ls` del 2026-10-14); poi `MANAGEMENT` se il pannello non e' vuoto, altrimenti `ACCOUNT` (`:674`).
- **`admits` per Check-in** (`roles.ts:467-500`): *ruolo **o** assegnazione viva*, con `null` che rifiuta — **lo stesso predicato** del middleware (`src/lib/supabase/middleware.ts`) e della guardia della porta (`admin/scanner/DoorSurface.tsx:134-144`).
- **Pannello**: `panelFor(capabilities)` (`roles.ts:447-461`) = `visibleStaffTabs(capabilities)` (`staff-tabs.ts:387-392`, **solo capability di ruolo**) piu' Account, ordinato per etichetta (`sortTabsByLabel`, `staff-tabs.ts:410-414`, D-52-27); vuoto se non c'e' nessuno strumento.
- **`assignmentOpenable`**: proprieta' della **voce** della mappa, non della chiave (`capability-routes.ts:139-158`); la porta ce l'ha (`:301-305`, entrambi gli indirizzi `/admin/scanner` e `/door`), e anche `party.manage` per la review (`:434-438`). Il middleware la legge per ammettere su assegnazione. **CUT-02 non la tocca.**
- **«Staff assegnato a una serata in corso»** nel codice e' piu' largo della frase: `live_assignment_capabilities` = assegnazioni con `revoked_at is null and now() < ends_at` (`20260921120000_drop_status_and_referral.sql:474-482`) — **comprese quelle future**, e senza nominare la serata (`roles.ts:332-338`). E' gia' cosi' oggi e D-53-01 non lo cambia: va detto nella procedura, perche' lo staff assegnato a domani vede Check-in gia' stasera.
- **Chi tiene `door.operate` per ruolo**: `master` e `organizer` (`verify-capabilities.mjs`, matrice `ROLE_GRANTS`: `'door.operate': 'GRANTED'` per organizer); `staff` **mai per ruolo** (zero concessioni per ruolo, `gallery_removal.sql:364-366`).

### 3.2 La derivazione raccomandata

**Check-in va nel pannello quando `door.operate` e' tenuta per ruolo; in barra quando e' tenuta solo per assegnazione.** Riproduce D-53-01 riga per riga senza scrivere il nome di un ruolo, e non aggiunge un quarto criterio a *sessione, ruolo, capability* (`roles.ts:623-631`, D-50-09):

| Soggetto | Oggi (Music acceso) | Dopo |
|---|---|---|
| anonimo | Events · Music · Account | invariata |
| `attendee` | Events · Music · Account | invariata |
| `staff` non assegnato | Events · Music · Account | invariata |
| `staff` assegnato | Events · Check-in · Music · Account | **invariata** (D-53-01) |
| `organizer` | Events · Check-in · Music · Management | **Events · Music · Management**; pannello: Account, Artists, **Check-in**, Formats, Manage events, Manifesto, Members, Venues (8 righe, erano 9 strumenti + Account + TASK) |
| `master` | Events · Check-in · Music · Management | **Events · Music · Management**; pannello come organizer + Newsletter (9 righe) |
| `organizer`/`master` **anche** assegnati | come sopra | come sopra: il ruolo vince, la voce resta nel pannello |

**Dove scriverla — due strade, la prima raccomandata:**

1. **Dentro `panelFor`/`getNavigation`** (`roles.ts`): una riga `link` con `href: DOOR_HREF` e `label: "Check-in"` quando `capabilities.includes(CAP.DOOR_OPERATE)`; in barra `CHECK_IN` solo se `!heldByRole && heldByAssignment`. Tocca un file solo, e **lascia `STAFF_TABS` e `StaffNav` com'erano**.
2. **In `STAFF_TABS`** (`staff-tabs.ts:142-344`), come `{ href: "/door", label: "Check-in", capability: CAP.DOOR_OPERATE }`. L'asserzione a caricamento (`:352-371`) passa (`/door` risolve a `door.operate`). **Ma `visibleStaffTabs` ha un secondo consumatore**, `StaffNav.tsx:105` (la striscia di strumenti sul telefono nelle superfici di lavoro, montata da `(work)/layout.tsx:184`): la striscia guadagnerebbe un chip Check-in. Non e' sbagliato in se', ma e' una seconda superficie che il proprietario non ha nominato.

**Cosa cambia a valle, da prevedere nel piano:**

- **La regola di densita'** `ENTRY_PHONE_DENSE` scatta con `bar.length >= 4` (`AppNav.tsx:311-325`). La barra di organizer e master scende a **tre** voci: torna `px-5`, come quella dell'anonimo (269,3 px di pillola su 328/343 utili, `roles.ts:586-596`). Lo staff assegnato resta a quattro voci e denso. **Va rimisurato, non dedotto.**
- **`inPanel`** (`AppNav.tsx:381-386`) diventa vero su `/door` per organizer e master: dal `md:` la colonna Management si apre da sola sulla porta e il bottone risulta corrente. Il commento `:378-380` dice oggi l'opposto (*«it excludes `/admin/scanner`, which is the door»*): va riletto. A `/admin/scanner` (indirizzo permanente, D-39-02) nessuna riga e' evidenziata, come gia' oggi per la voce di barra (`AppNav.tsx:107-114`).
- **Il tipo `PanelEntry`** perde il ramo `disabled` (TASK) e resta `link`: i due rami di rendering in `AppNav.tsx` cadono, `inPanel` non ha piu' bisogno del filtro `kind === "link"`.
- **`DoorSurface.tsx` monta `AppNav form="phone"`** (`:153`) e non `StaffNav`: sulla porta, per organizer e master, la barra non ha piu' Check-in. Raggiungere la porta e' un tocco in piu' (Management → Check-in): e' la decisione del proprietario, e non cambia nulla dell'offline (stesso `href`, stessa pagina, scaldata online prima, `checkin-offline.md`).
- **Il middleware, `DoorSurface.tsx:134-144` e `requireDoorOperator` non si toccano.** Aggiungere un controllo di qualunque tipo sulla porta e' *«la riparazione che chiude la porta»* (`roles.ts:617-621`).

### 3.3 Come la fase 52/52.3 ha misurato la barra

Nessuno script: una **procedura su Chrome headless via CDP** (`mobile: true`, DPR 2), metodo del piano 52.3-09 ripetuto nel 52.3-19 (`52.3-19-SUMMARY.md:67-109`; riassunta in `roles.ts:578-599`):

- pillola = riquadro di `ROW_PHONE`; disponibile = `innerWidth - 2rem`; contenuto = `scrollWidth` / `clientWidth` della riga;
- account del seme per ruolo (`attendee`, `organizer`, `master`, `staff` assegnato alla porta, `staff` non assegnato — seme 52.3-06 e `seed-lab-door.mjs`), login senza password (memoria `headless-login-without-password`: `generateLink` + `verifyOtp` + cookie);
- larghezze 360 e 375, superficie `/events` e, per chi lavora, `/door`; interruttore Music acceso **e** spento;
- criterio: nessuna riga con `scrollWidth > clientWidth`, indice di Check-in (1 in barra per lo staff), larghezze delle voci.

CUT-05 ripete **la stessa tabella** con le colonne di `52.3-19-SUMMARY.md:73-90`, piu' una colonna nuova: *Check-in nel pannello (si'/no, posizione)*.

---

## 4. Venues e Artists (CUT-03)

### 4.1 L'analogo esatto e' gia' nel repo

Commit `31baf149` (2026-10-13, *«feat(artists): crea un artista anche dalla pagina Artists»*), tre file:

1. `CreateArtistModal.tsx`: `name` diventa **opzionale**; senza, il dialog mostra un campo `Name` editabile (`required`, `maxLength={120}`, `data-initial-focus`), il submit e' disabilitato a nome vuoto, lo stato si azzera all'apertura e alla chiusura.
2. `NewArtistButton.tsx` (nuovo, 40 righe): `Button size="sm"` «New artist» che apre il modal senza `name` e a successo fa `router.refresh()`.
3. `(work)/artists/page.tsx`: il bottone nell'header (`:95-98`) e lo stato vuoto riscritto (`:101-117`).

### 4.2 Cosa c'e' oggi in Venues

- `(work)/venues/page.tsx`: guardia `organizer.access` (`:16-19` del codice), lista `id, name, slug, address, photo_url`, link a `/admin/venues/<slug>`. **Nessun bottone**; lo stato vuoto dice che una sede si crea dal form della serata, e il commento lo motiva con *«`CreateVenueModal` has exactly one importer»* — che smette di essere vero.
- `src/components/venues/CreateVenueModal.tsx`: `name: string` **obbligatorio** e mostrato `readOnly` (`:85-90`, `:262-270`); `onCreated(id, slug)` (`:89`); campi bio, address, google maps, instagram, website, foto. **Il flag della segretezza non e' in questo file** (`:33-36`): e' della serata (`EventForm.tsx:104-105`, `venue_secret`, `venue_secret_hint`).
- Unico importatore: `src/components/events/EventForm.tsx:15`.

### 4.3 La guardia vera — divergenza dalla ROADMAP

La ROADMAP scrive *«stesse guardie (`staff.manage`)»*. **Il codice dice altro**: `createVenue` (`src/app/(admin)/admin/venues/actions.ts:122-184`) chiama `assertCatalogueManage()` (`:64-85`) e chiede **`catalogue.manage`**, sotto il **client cookie** (`:131`), quindi la policy RLS `venues_insert_organizer` (`20260807010000_policies_to_capabilities.sql:407-411`, `catalogue.manage`) rifiuta una seconda volta. La rilettura `.select("id, slug")` dopo l'insert passa da `venues_select_staff` (`20260810161000_venues_read_narrowed.sql:238-242`, **`staff.manage`**), e nessuna policy apre `venues` all'anonimo (`:244-250`). Master e organizer tengono entrambe le chiavi: **l'insieme di chi riesce a scrivere e' identico**, ma la guardia da citare nel piano e' `catalogue.manage`, non `staff.manage`. Si fidi del codice.

### 4.4 Cosa fare, e cosa resta da rifinire

- Stessa forma del commit `31baf149`: `name?: string` in `CreateVenueModal`, campo editabile quando manca, `NewVenueButton.tsx` in `src/components/venues/`, bottone nell'header di `(work)/venues/page.tsx`, stato vuoto e suo commento riscritti. `EventForm.tsx` continua a passare `name` e a funzionare come oggi.
- **Nessuna superficie pubblica cambia**: la pagina `/admin/venues` e' dietro `organizer.access`, `venues` non ha lettura anonima, e la segretezza resta per serata. `src/components/venues/**` e `src/app/**/venues/**` caricano `venue-secrecy.md` (frontmatter): il gate lo vede.
- **Zero fallimenti silenziosi**: `createVenue` **lancia** (`:135-137`, `:174-180`), e Next redige il messaggio in produzione; il modal distingue solo per *stage* (`CreateVenueModal.tsx:46-66`). Il debito e' dichiarato nel file stesso (*«recorded as owed»*, `:62-66`). Un secondo punto di ingresso lo rende piu' visibile: il planner decide se pagarlo qui (`createVenue` che restituisce un rifiuto tipizzato, come `updateVenue` `:207-238`) o dichiararlo. **Nome duplicato**: oggi `23505` → *«A venue with this name already exists»* (`:176-177`), che arriva redatto.

---

## 5. La persona (CUT-04 e CUT-06)

Versione corrente: **1.33.0** (`.claude/CHANGELOG.md:6`, 2026-10-13). `verify:persona` oggi: **7/7 verdi**, 62 glob su 4.452 file, 16 moduli, 28 righe della tabella G; **caso peggiore `src/app/(admin)/admin/scanner/DoorSurface.tsx`, 5 file caricati (CLAUDE.md, meta-gates, access-gating, checkin-offline, nextjs-architecture), 53.794 byte ≈ 14.943 token, tetto 15.000** (`scripts/verify-persona.mjs:89`, `:318-343`).

### 5.1 `paths:` che muoiono

**Nessuno, misurato.** Nessun glob di frontmatter, ne' nell'indice di `CLAUDE.md`, copre soltanto file che escono: `src/lib/production/**` non e' coperto da alcun modulo; `src/app/(admin)/**`, `src/app/api/cron/**` (restano sette cron), `src/app/api/media/**` (resta `finalize-cover`) e `src/components/**` continuano a trovare file. Il controllo A resta verde da solo. CUT-04 deve dirlo («zero glob morti, rimisurato») invece di cercarne.

### 5.2 Righe da toccare

| File | Riga | Cosa |
|---|---|---|
| `.claude/rules/meta-gates.md` | `:120` «Gli **otto** cron» e `:126-133` riquadro del 2026-09-30 («otto voci in `vercel.json` e otto directory») | → **sette**, con data; la riga si corregge **nello stesso commit** che toglie la voce da `vercel.json` (la regola scritta in `:131-132`) |
| `.claude/rules/ticketing-payments.md` | `:45` gate *cron non atomico*: «**otto** al 2026-09-30» con l'elenco che include `production-mirror` | → sette, elenco senza `production-mirror`. **La ROADMAP non lo nomina**: e' un'omissione da coprire |
| `.claude/rules/time-and-scheduling.md` | — | **nessuna riga sullo specchio**, misurato (`grep -i "mirror|production|30 8"`: zero). La ROADMAP lo da' per presente: divergenza da registrare, nulla da togliere |
| `.claude/rules/media-and-storage.md` | `:18` («archivio del visual» in *Before Touching*), `:30` (riga della tabella *Archivio del visual*: quarantena → `finalize-archive` → `visual-archive` → `production.visual.manage`), `:64` (gate *chi carica ha titolo*: «archivio = `production.visual.manage`») | → la cover resta l'unico percorso; **anche questa omessa dalla ROADMAP** |
| `.claude/rules/production-calendar.md` | `:336` gate *il feed non e' il calendario* («Cio' che il prodotto legge e' l'ICS pubblicato … le difese si scrivono nell'import»), `:348` imperativo *«defend in the import»*, `:282` («sullo specchio importato quel mattino») | **rovesciate con la data**: dal 2026-10-14 il prodotto non legge piu' il feed (D-53-02); il modulo **resta**, perche' il calendario e' materiale esterno |
| `.claude/rules/meta-gates.md` tabella di priorita' (`:57-82` circa) | nessuna riga nomina calendar, location, visual | **nessuna riga cade** (controllo G resta a 28) |
| `.claude/rules/ai-engineering.md` | `:41` «**Cinque** moduli sono senza frontmatter» | gia' sbagliato oggi (sono **sei**: `verify:persona` controllo D). Fuori perimetro stretto, ma CUT-04 tocca la persona: segnalarlo |

### 5.3 Il budget

Il controllo E somma i byte di `CLAUDE.md` + `meta-gates.md` + i moduli che un file carica, sul file peggiore. Oggi il margine e' **57 token (~205 byte, a 3,6 byte per token)**. Tre conseguenze per il piano:

- Ogni modifica a **`CLAUDE.md`**, **`meta-gates.md`**, **`access-gating.md`**, **`checkin-offline.md`** o **`nextjs-architecture.md`** cambia il caso peggiore. CUT-04 tocca `meta-gates.md`; CUT-06 tocca `CLAUDE.md` e `access-gating.md`. **Saldo netto ≤ 0 byte su quei cinque file**, o si paga prima, come la 1.33.0 (`CHANGELOG.md:30-35`: un riquadro storico ridotto da 842 a 406 byte, *«si taglia la descrizione, non la regola»*).
- Il numero si **riporta**: byte e token del caso peggiore prima e dopo, nel SUMMARY e nel CHANGELOG.
- Alzare il tetto e' una decisione del proprietario, *«presa una volta il 2026-08-24 e non ereditabile»* (`verify-persona.mjs:337`).

### 5.4 DOC-01..04 (CUT-06)

| ID | Bersaglio | Testo oggi |
|---|---|---|
| DOC-01 | `.planning/PROJECT.md:9` (e la copia in `.planning/STATE.md:23`, `:166`, che porta l'avviso `:25-29` «`DOC-01` la riscrive in fondo») | *«… the gating mechanism (referral + approval) is what makes the community valuable.»* |
| DOC-02 | `CLAUDE.md`, Operating Principle 1 | *«**Il gating E' il prodotto — e dal 2026-09-21 il gating e' la porta.**»* e la nota che rimanda alla fase 57 |
| DOC-03 | `.claude/rules/community-membership.md:28-31` (cita la frase di PROJECT.md), `:12-17` («la riprende la fase 57»); `.claude/rules/access-gating.md:20-55` | descrivono il modello del 2026-09-21; la fase 57 **non esiste piu'** (cancellata il 2026-10-14): ogni «fase 57» va riletto |
| DOC-04 | `npm run verify:persona` | verde, con budget rimisurato |

Il riferimento alla «fase 57» compare anche nell'intestazione di `CLAUDE.md` (Operating Principle 1: *«La riprende la fase 57: `community-membership.md`»*). Dopo la cancellazione delle fasi 53–57 vecchie, quella frase punta a una fase che non esiste.

---

## 6. Verifica (CUT-05)

### 6.1 `npm run verify` oggi

Non eseguito da questa ricerca (contiene `verify:capabilities`, che legge un database vivo con le credenziali di `.env.local`). Dallo STATE: `VERIFY_OK` l'ultima volta che e' stato registrato. Le voci che **si rompono** con la cancellazione se non si muovono insieme: `verify:calendar-surface`, `verify:ics-reachable`, `verify:ics-grammar`, `verify:mirror-guards` (file assenti → *missing gate is a failure*, `verify-all.mjs:236-240`), `verify:section-surface` (scope mancante → exit 2), `verify:section-export` (modulo d'esportazione mancante), `verify:conversion` (`PENDING_SURFACES` orfani), `verify:routes` (`revalidatePath("/admin/visual")`), `verify:capabilities` (conteggi).

### 6.2 Scheletro della procedura manuale (sul laboratorio)

Sul modello di `52.4-VERIFICATION.md` (frontmatter con `status`, `approval`, `requirements_*`, `gates_red`, `environment`, `production`, `evidence`; una sezione per requisito con evidenza `file:riga` e passo osservato; *Anti-pattern cercati*; *Limiti dichiarati e debito*; *Stato del laboratorio lasciato*; *Produzione*).

- **P-53-A — Superfici tolte.** Da `master`: `/admin/calendar`, `/admin/calendar/<uuid>`, `/admin/location`, `/admin/location/<uuid>`, `/admin/visual` → **404** (la rotta non esiste; il middleware risolve `null` e rimbalza: annotare quale dei due si osserva). `/api/cron/production-mirror` con `CRON_SECRET` del lab → 404. `/admin/manifesto` → **200**, la pagina mostra le sue sezioni. Il pannello non ha Calendar, Location, Visual, ne' TASK.
- **P-53-B — La barra per ruolo**, 360 e 375, Music acceso e spento: anonimo, `attendee`, `staff` non assegnato, `staff` assegnato (su `/events` e su `/door`), `organizer`, `master` (su `/events` e su `/door`). Colonne di `52.3-19-SUMMARY.md:73-90` + *Check-in nel pannello*. Criterio: nessuna riga con `scrollWidth > clientWidth`; staff assegnato con Check-in all'indice 1; organizer/master senza Check-in in barra e con Check-in nel pannello (foglio a 375, colonna a 1280).
- **P-53-C — Check-in da Management.** `organizer`, poi `master`: Management → Check-in → `/door` si apre, la lista si scarica, uno scan online passa. Staff assegnato: Check-in in barra, come prima.
- **P-53-D — La porta offline come prima** (`checkin-offline.md`; `src/lib/offline/` **non toccato**, provato con `git diff --stat` sul perimetro): `/door` aperta online, rete spenta, scan in coda, rete accesa, drain; un annullamento. Stessa corsa della 52.4-11 (emulatore Android o telefono). Dopo il deploy il service worker cambia: il telefono della porta va **aperto online prima** della serata (runbook).
- **P-53-E — Una sede da Venues.** `organizer`: Venues → «New venue» → nome, indirizzo → la lista si aggiorna; poi una serata nuova sceglie quella sede dal form; la pagina pubblica della serata, con la sede marcata segreta, **non** mostra l'indirizzo (stesso controllo di `verify:venue-surfaces`). Rifiuti: nome vuoto (submit disabilitato), nome duplicato (frase leggibile o debito dichiarato), un `staff` non raggiunge la pagina.
- **P-53-F — Lo schema.** Rilettura del catalogo sul lab dopo la migration: undici tabelle assenti, `party_series.ics_alias` assente, `private.capabilities` = 11, `private.role_capabilities` = 20, `pg_policies` senza le chiavi tolte, bucket `visual-archive` assente, `event-media-quarantine` e la sua policy presenti, `event-images` pubblico.
- **P-53-G — Vercel.** `vercel.json` a sette voci; dopo il deploy la pagina *Cron Jobs* del progetto non elenca piu' `production-mirror`; `vercel env ls` senza le tre `PRODUCTION_CALENDAR_FEED_*`.

---

## 7. Ordine delle onde

L'ordine segue una regola sola: **chi legge esce prima di cio' che e' letto**, e la persona descrive solo cio' che e' gia' successo.

| Onda | Contenuto | Dipende da | Note |
|---|---|---|---|
| **0** | Checkpoint del proprietario: Q1 (Manifesto resta?), Q2 (copia di foto/spunte/prosa?), Q3 (Check-in anche nella striscia `StaffNav`?) | — | Decisioni che cambiano cosa si scrive: si bloccano qui (memoria `verification-timing-policy`) |
| **1** | Cancellazione del codice: pagine, componenti, azioni, `lib/production/ics`, `export/capitolato`, `tokens`, `score`, `visual-archive`, `StageBadge`, cron, `finalize-archive`, `may-upload`; chiavi da `CAP`, voci da `capability-routes.ts` e `staff-tabs.ts`; tipi di `database.ts`; `next.config.ts`; `vercel.json`; Manifesto districato | 0 | `npm run build` verde a fine onda. **Non** si scrive ancora la migration applicata |
| **1** (parallelo) | CUT-03 Venues (tre file, nessun file in comune con l'onda di cancellazione tranne nessuno) | 0 | Indipendente; Critical per `venue-secrecy.md` |
| **2** | CUT-02 la barra e il pannello (`roles.ts`, `AppNav.tsx`) | 1 (TASK esce dallo stesso tipo `PanelEntry`) | Stesso file della rimozione di TASK: sequenziale, non parallelo |
| **2** | Gate: script che cadono, script riscritti, `verify-all.mjs`, `package.json`, `conversion-manifest.mjs`, `seed-lab-door.mjs` | 1 | `npm run verify` verde **eccetto** `verify:capabilities`, rosso per costruzione fino alla migration (dichiarato) |
| **3** | Migration di sola rimozione **scritta**, con precondizioni a zero e rilettura; `database.ts` gia' allineato | 1, 2 | Una transazione (l'endpoint `/database/migrations` avvolge il corpo, `gallery_removal.sql:31-37`) |
| **4** | Laboratorio: righe e oggetti tolti per chiave con conteggio, bucket svuotato e cancellato dall'API Storage, **poi** migration, **poi** deploy del ramo `lab`, procedure P-53-A..G | 3 | Il lab va in pausa dopo una settimana: `restore` prima (memoria `lab-pauses-after-a-week`) |
| **5** | CUT-04 persona (cron a sette, media-and-storage, production-calendar rovesciato) — **dopo** che la cancellazione e' sul disco | 1, 2 | `verify:persona` **dopo**, mai prima; budget riportato |
| **6** | Produzione, solo su «vai» datato: deploy del codice `READY` → conteggio in sola lettura → righe e oggetti per chiave → migration → `vercel env rm` × 3 → rilettura | 4, 5 | Codice prima dello schema: con lo schema tolto prima, il codice vecchio risponderebbe errore sulle pagine e il cron delle 08:30 UTC fallirebbe |
| **7** | CUT-06 documenti (DOC-01..04), `verify:persona`, VERIFICATION.md | tutto | «Una persona che descrive una superficie prima che sia sparita descrive un futuro» (ROADMAP) |

---

## 8. Rischi e trappole

### Pitfall 1 — Il `grep` a zero e la prosa
**Cosa va storto:** CUT-01 chiede `grep` a zero su `src/`, `scripts/`, `vercel.json`. Ma i nomi che escono sono recitati in decine di commenti di file che restano (`roles.ts` 27 occorrenze, `capability-routes.ts` 31, `keys.ts` 12, `AppNav.tsx` 11, `database.ts` 16, piu' `finalize.ts`, `manifesto/actions.ts`, `middleware.ts`, `next-redirect.ts`, `reveal-party-venue.ts` …, misurato con il pattern sotto).
**Come evitarlo:** fissare **nel piano** il pattern del grep e l'elenco dei file che devono tornare a zero. La disciplina di casa e' gia' scritta: un commento che recita l'identificatore appena cancellato tiene rosso il grep che prova la cancellazione (`roles.ts:233-236`, `capability-routes.ts:329-331`). Pattern misurato in questa ricerca:
`production_(plan|piece|commitment|checklist_item|import_run|pipeline_rule|lineup_slot|space|space_attribute|visual_asset)|admin/(calendar|location|visual)|lib/production/ics|production-mirror|visual-archive|finalize-archive|production\.(calendar|location|visual)\.manage|PRODUCTION_(CALENDAR|LOCATION|VISUAL)|\bTASK\b|ics_alias|StageBadge|may-upload|mayUploadToVisualSection|PRODUCTION_CALENDAR_FEED`
Le migration **gia' applicate** restano come sono (fatti storici): il grep vale sulle migration **nuove**, come scrive la ROADMAP.

### Pitfall 2 — File con byte NUL
`scripts/verify-conversion.mjs` (3 byte NUL) e `src/lib/production/ics/reconcile.ts` (3) — `rg` si ferma (*«binary file matches»*, visto in questa ricerca), `grep` senza `-a` li salta in silenzio. Usare `/usr/bin/grep -a` o Read. `reconcile.ts` cade, ma il grep di prova deve vederlo **prima** per contarlo.

### Pitfall 3 — Manifesto condivide piu' di quanto sembri
Visual monta sei moduli di Manifesto; Manifesto rivalida `/admin/visual`; `export-contract.ts` conosce due esportazioni; `sections/vocabulary.ts` riesporta da `ics/vocabulary`; `production_open_question_select_brandwide` legge tutte e quattro le chiavi. Cancellare per directory senza leggere questi cinque punti produce o un build rosso (bene: si vede) o **una policy che legge una chiave cancellata** (male: diventa un rifiuto permanente e silenzioso — la ragione del controllo `v_lettori` in `gallery_removal.sql:281-287`).

### Pitfall 4 — Schema prima del codice
Rovescia l'ordine giusto: il codice in produzione legge le tabelle e le chiavi, e il cron delle 08:30 UTC scrive nel calendario. **Codice `READY` → migration**, come la 52.1. Nel mezzo `verify:capabilities` e' rosso e va dichiarato.

### Pitfall 5 — Instant Rollback resuscita il cron
*«If you Instant Rollback to a previous deployment, your cron jobs are reverted to the state of the rolled-back deployment»* [CITED: vercel.com/docs/cron-jobs/manage-cron-jobs]. Un rollback dopo la migration rimette in calendario `production-mirror` su tabelle che non esistono (e senza le variabili: risponderebbe `409 source_not_registered`, `58-12-SUMMARY.md:323-325`) e le pagine tolte su chiavi che non esistono. Il piano di produzione dichiara che dopo la migration **non si fa rollback**, si va in avanti.

### Pitfall 6 — Cancellare un cron e' una modifica a `vercel.json` + redeploy
*«Deleting Cron Jobs: Remove the configuration from the `vercel.json` file … and then redeploy»* [CITED: vercel.com/docs/cron-jobs/manage-cron-jobs]. Togliere la route senza togliere la voce lascia un cron che chiama un 404 ogni mattina (*«Vercel still executes your cron job»*, stessa pagina).

### Pitfall 7 — Il bucket non si cancella da SQL
`DELETE` su `storage.buckets`/`storage.objects` e' rifiutato da un trigger a livello di istruzione, anche a zero righe (`gallery_removal.sql:48-55`). Oggetti e bucket dall'API Storage, **prima** della migration, che toglie solo la policy. Il confronto sui letterali va **quotato** (`'visual-archive'`), stessa cautela della quarantena (`gallery_removal.sql:44-47`).

### Pitfall 8 — `lab-apply-migration.mjs` usa `/database/query`
`scripts/lab-apply-migration.mjs:41-47` applica con `POST .../database/query`, **non** con `/database/migrations`: non annota il registro e non e' garantito avvolgere il corpo nella stessa transazione. D-53-03 chiede l'endpoint che annota. La 52.3 sul lab ha usato `/database/migrations` con `name` = nome del file (`52.3-02-SUMMARY.md:50`); **la 52.4 in produzione ha usato `/database/query`** (`52.4-VERIFICATION.md:208`) — quindi il registro di produzione potrebbe non annotare le due migration della 52.4 (**non verificato**). Il piano scrive la sua chiamata a `/database/migrations` (o estende lo script), su lab **e** produzione, con la stessa semantica transazionale.

### Pitfall 9 — Il seme del laboratorio si rompe dopo il DROP
`seed-lab-door.mjs:547,551` cancella da `production_plan` e `production_space`; dopo il `DROP`, `--reset` si ferma a meta' con `42P01`. Si corregge nello **stesso commit** della migration (precedente registrato nel file, `:526-533`).

### Pitfall 10 — Cache `.next/dev` al cambio di ramo
Dopo aver tolto pagine, la cache di sviluppo puo' servire rotte che non esistono piu': `rm -rf .next/dev` al cambio di ramo, porta 3100 (memoria `lab-proof-recipes-2026-10-13`).

### Pitfall 11 — Tipi scritti a mano
`database.ts` **non si rigenera**: le interfacce si tagliano a mano, con i loro import invertiti (`:36-84`). Il build trova un tipo usato e assente, **non** trova un tipo rimasto per una tabella che non esiste: rileggere che nessuna interfaccia di produzione resti tranne `ProductionSection` e `ProductionOpenQuestion`.

### Pitfall 12 — Il budget della persona
Vedi §5.3. Margine 57 token. Una frase in piu' in `CLAUDE.md` o `access-gating.md` rompe il controllo E.

### Pitfall 13 — Conteggi in commento che invecchiano
`capability-routes.ts:160-205` («Eight entries of the fourteen»), `:214` («The fourteen keys»), `staff-tabs.ts:373` («The ten»), `conversion-manifest.mjs:950-965` («26 page files», gia' 25 oggi), `roles.ts:543-544` («9 strumenti / 10 strumenti»), `roles.ts:641-651` («14 mount sites», ancora 14: da riconfermare dopo). La casa li **ricorregge con il riconteggio e la data**, non li cancella (`capability-routes.ts:197-204`).

### Pitfall 14 — Una variabile d'ambiente letta altrove
Le tre `PRODUCTION_CALENDAR_FEED_*` sono lette **solo** dal cron e dall'importatore (`grep` su tutto il repo esclusi `.planning/`, `node_modules`, `.git`). Nessun altro codice: la rimozione su Vercel e' sicura **dopo** il deploy che toglie il cron.

## Codice d'esempio

### Precondizione a zero e rilettura (forma della casa)
```sql
-- Fonte: supabase/migrations/20261001120200_gallery_removal.sql:84-133 e :219-366
DO $$
DECLARE v_righe integer;
BEGIN
  IF to_regclass('public.production_space') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.production_space' INTO v_righe;
  ELSE v_righe := 0; END IF;
  IF v_righe > 0 THEN
    RAISE EXCEPTION 'public.production_space ha ancora % righe', v_righe
      USING HINT = 'La rimozione per chiave e'' un passo PRIMA di questa migration.';
  END IF;
END; $$;
-- ... DROP POLICY IF EXISTS / DROP TABLE IF EXISTS / DELETE delle chiavi ...
-- rilettura: nessuna policy in pg_policies nomina le tre chiavi; capabilities = 11; role_capabilities = 20
```

### La barra dopo D-53-01 (forma, non codice definitivo)
```ts
// Fonte: src/lib/rbac/roles.ts:467-500 (admits), :653-687 (getNavigation)
const heldByRole = capabilities.includes(CAP.DOOR_OPERATE);
const heldByAssignment =
  liveAssignmentCapabilities !== null &&
  liveAssignmentCapabilities.includes(CAP.DOOR_OPERATE);
// pannello: riga Check-in (href DOOR_HREF) se heldByRole
// barra:    voce Check-in se !heldByRole && heldByAssignment (requireAuth invariato)
```

### Creare dalla sezione
```tsx
// Fonte: commit 31baf149, src/components/artists/NewArtistButton.tsx
<Button size="sm" onClick={() => setOpen(true)}>New venue</Button>
<CreateVenueModal open={open} onClose={() => setOpen(false)}
  onCreated={() => { setOpen(false); router.refresh(); }} />
```

## Stato dell'arte

| Prima | Dopo | Quando | Impatto |
|---|---|---|---|
| Il calendario dentro il prodotto, specchiato dal feed ogni mattina (fasi 44, 58) | Il calendario e' materiale esterno; il prodotto non lo legge | 2026-10-14, D-53-02 | `production-calendar.md` rovesciato con data; un cron in meno |
| Check-in seconda voce della barra per chiunque lo tenga (D-52-05) | In barra solo per chi lo tiene per assegnazione; per ruolo nel pannello | 2026-10-14, D-53-01 | D-52-05 va **rovesciato con la sua ragione**, non tolto in silenzio |
| Una sede si crea solo dal form della serata | Anche da Venues | CUT-03 | `CreateVenueModal` passa a due importatori |
| TASK riga spenta, «la fase 53 decide» (`roles.ts:393-394`, `AppNav.tsx:193-194`) | TASK non esiste | CUT-01 | La promessa nel codice si chiude da sola |

## Registro delle assunzioni

| # | Affermazione | Sezione | Rischio se sbagliata |
|---|---|---|---|
| A1 | Manifesto **resta**: il proprietario ha nominato quattro sezioni e non lui | Sommario, §1.5 | Se va tolto anche lui, cade una quinta chiave, due tabelle, due gate, e `export/manifesto.ts`; il piano cambia di forma |
| A2 | Le tabelle del calendario e di Location sono popolate in produzione; le foto dell'archivio forse | §2 | Le precondizioni a zero rifiutano la migration finche' le righe non sono tolte: nessun danno, solo un passo in piu' |
| A3 | Le righe di produzione di Location/Calendar hanno una fonte fuori dal prodotto (`docs/`, il feed); foto e spunte forse no | §2 | Una cancellazione senza copia sarebbe irreversibile |
| A4 | La derivazione «ruolo → pannello, sola assegnazione → barra» e' cio' che il proprietario intende con D-53-01 | §3.2 | Coincide riga per riga con D-53-01 sui ruoli di oggi; diverge solo se un ruolo futuro tenesse `door.operate` per ruolo senza pannello |
| A5 | Il laboratorio ha le tabelle di produzione vuote | §2 | Se ha righe, il lab prova anche la rimozione per chiave (meglio) |

## Domande aperte

1. **Manifesto resta?**
   - Si sa: non e' nominato; ha chiave, pagina e voce propria; e' intrecciato con Visual.
   - Non si sa: se il proprietario lo considera parte di «visual».
   - Raccomandazione: chiederlo all'onda 0, in parole di dominio (*«Togliamo Visual: la sezione Manifesto, dove si scrive il manifesto sonoro di ogni format, resta?»*). Il piano e' scritto per «resta».
2. **Una copia di cio' che esiste solo nel database?** Foto dell'archivio del visual, spunte della checklist, prosa di Visual. Fuori dal repo, se si'.
3. **Check-in anche nella striscia degli strumenti sul telefono** (`StaffNav`)? La strada raccomandata dice no; e' una superficie che il proprietario non ha nominato.
4. **Il debito del rifiuto tipizzato di `createVenue`** (`CreateVenueModal.tsx:62-66`): pagarlo qui o dichiararlo?
5. **Il registro delle migration di produzione** e' allineato? La 52.4 e' passata da `/database/query`; leggerlo (sola lettura) prima di aggiungere la migration di questa fase evita una sorpresa.

## Disponibilita' dell'ambiente

| Dipendenza | Serve a | Disponibile | Versione | Ripiego |
|---|---|---|---|---|
| Node / npm | build e gate | ✓ | 25.6.1 / 11.9.0 | — |
| Vercel CLI | `vercel env rm`, lettura deploy e cron | ✓ (login, `unset VERCEL_TOKEN`) | 64.0.2 | dashboard |
| `SUPABASE_ACCESS_TOKEN` (nome in `.env.local`) | Management API | ✓ (nome presente, valore non letto) | — | — |
| `LAB_PROJECT_REF`, `LAB_SUPABASE_URL`, `LAB_SUPABASE_SERVICE_ROLE_KEY` (nomi in `.env.lab.local`) | laboratorio | ✓ (nomi presenti) | — | — |
| Progetto del laboratorio attivo | P-53-A..G | **non verificato** (va in pausa dopo una settimana) | — | restore dal Management API |
| Chrome headless via CDP | misura della barra | non verificato in questa sessione | — | simulatore iOS / emulatore Android |
| Emulatore Android o telefono | P-53-D offline | non verificato | — | — |

**Mancanze bloccanti:** nessuna nota.

## Validation Architecture

### Infrastruttura di prova

| Proprieta' | Valore |
|---|---|
| Framework | **Nessun test runner per il prodotto** (`package.json` senza script `test`, nessun `*.test.*`/`*.spec.*`). Non si dichiara mai una modifica verificata perche' «i test passano» |
| Config | `scripts/verify-all.mjs` (aggregatore dei gate `verify:*`) |
| Comando rapido | `npm run build` (typecheck incluso) |
| Suite completa | `npm run build && npm run verify && npm run verify:persona` + procedura manuale scritta sul laboratorio |

### Requisiti → prova

| Req | Comportamento | Tipo | Comando / passo | Esiste? |
|---|---|---|---|---|
| CUT-01 | Nessun riferimento sopravvive | statico | il `grep -a -E` del Pitfall 1 su `src/ scripts/ vercel.json package.json` + migration nuove → **0** | ✅ (pattern in questa ricerca) |
| CUT-01 | La mappa coincide con le pagine | statico | `npm run verify:routes` | ✅ |
| CUT-01 | Nessuna voce `verify:*` orfana | statico | `npm run verify` (riconciliazione `verify-all.mjs:495-545`) | ✅ |
| CUT-01 | Il manifesto della conversione non recinta il nulla | statico | `npm run verify:conversion` | ✅ (dopo la riscrittura di `PENDING_SURFACES`) |
| CUT-01 | Chiavi e concessioni = 11 / 20 | database vivo | `npm run verify:capabilities` (dopo la migration) | ✅ da riscrivere i numeri |
| CUT-01 | Schema e storage tolti | database | P-53-F (rilettura `read_only`) | ❌ procedura da scrivere |
| CUT-01 | Cron ed env tolti | piattaforma | P-53-G | ❌ procedura da scrivere |
| CUT-02 | Barra per ruolo a 360/375 senza traboccamento | manuale (CDP) | P-53-B | ❌ procedura da scrivere |
| CUT-02 | Check-in raggiunto da Management | manuale | P-53-C | ❌ |
| CUT-02 | La porta offline invariata | manuale (dispositivo, rete spenta) | P-53-D + `git diff --stat -- src/lib/offline/` vuoto | ❌ |
| CUT-03 | Sede creata da Venues e usata da una serata; nessuna superficie pubblica cambia | manuale + statico | P-53-E + `npm run verify:venue-surfaces` | ❌ / ✅ |
| CUT-04 | Persona coerente, budget entro il tetto | statico | `npm run verify:persona` **dopo** la cancellazione, byte/token riportati | ✅ |
| CUT-05 | Evidenza per requisito | documento | `53-VERIFICATION.md` con `file:riga` per ogni requisito | ❌ |
| CUT-06 | DOC-01..04 | statico + lettura | `grep` delle frasi di §5.4 → 0; `npm run verify:persona` | ✅ |

### Frequenza

- **A ogni commit di codice:** `npm run build`.
- **A fine onda:** `npm run verify` (con `verify:capabilities` dichiarato rosso fra deploy e migration); `verify:persona` solo nelle onde che toccano la persona, **dopo** la cancellazione.
- **Prima di `/gsd-verify-work`:** suite completa verde + P-53-A..G percorse sul laboratorio e scritte.

### Mancanze dell'onda 0

- [ ] `53-PROCEDURES.md` con P-53-A..G passo per passo (ruolo, indirizzo, cosa si osserva).
- [ ] Il pattern del grep di CUT-01 fissato nel piano.
- [ ] La chiamata a `/database/migrations` per il laboratorio (lo script attuale usa `/database/query`).
- [ ] Le risposte del proprietario a Q1–Q3.

## Dominio di sicurezza

| Categoria ASVS | Si applica | Controllo |
|---|---|---|
| V2 Autenticazione | no | invariata |
| V3 Sessione | no | invariata |
| V4 Controllo d'accesso | **si'** | RLS via `private.has_capability`; la mappa `capability-routes.ts` per i redirect; la navigazione decide solo la visibilita' |
| V5 Validazione dell'input | si' (CUT-03) | `createVenue` server-side (nome obbligatorio, slug, `23505`), client cookie sotto RLS |
| V6 Crittografia | no | — |
| V8 Protezione dei dati | **si'** | cancellazione di indirizzi di spazi in trattativa e di foto di persone: per chiave, contata, copia fuori dal repo solo se chiesta |

| Minaccia | STRIDE | Mitigazione |
|---|---|---|
| Una policy che legge una chiave cancellata diventa un rifiuto permanente silenzioso | Denial of Service | `_brandwide` riscritta prima del `DELETE` delle chiavi; rilettura `pg_policies` nella migration |
| Una voce di navigazione che porta dove il server rifiuta, alla porta | Denial of Service | stesso predicato del middleware; nessun controllo aggiunto sulla porta |
| Indirizzi di spazi in trattativa nel repo (copia, log, SUMMARY) | Information Disclosure | conteggi e codici soltanto; copie gitignored |
| Rollback che resuscita il cron su tabelle tolte | Tampering / DoS | nessun rollback dopo la migration, dichiarato |
| Scrittura di un indirizzo di sede da una nuova superficie | Elevation of Privilege | la scrittura resta in `createVenue` (`catalogue.manage` + RLS); il bottone allarga solo dove il form si raggiunge |

## Fonti

### Primarie (ALTA)
- Il codice del repo a `c2a6ab4c`: ogni `file:riga` citato sopra.
- `supabase/migrations/` (in particolare `20260815120000`, `20260815120100`, `20260817120000`..`20260817120500`, `20260822120000`, `20261001120200_gallery_removal.sql`).
- `npm run verify:persona` eseguito il 2026-10-14 (7/7, 14.943/15.000).
- `vercel env ls` letto il 2026-10-14 (nomi e ambienti, nessun valore).
- [CITED: vercel.com/docs/cron-jobs/manage-cron-jobs] — cancellazione di un cron, rollback, percorsi inesistenti.

### Secondarie (MEDIA)
- `.planning/phases/52.3-*/52.3-19-SUMMARY.md` (metodo della misura della barra), `52.4-VERIFICATION.md` (modello), `58-12-SUMMARY.md` (stato dello specchio in produzione).

### Terziarie (BASSA)
- Lo stato delle righe in produzione e sul laboratorio (§2): dedotto dai documenti, **non letto**.

## Metadati

**Confidenza:**
- Inventario: ALTA — letto dal codice e dalle migration, con i consumatori misurati per `grep`.
- Architettura della barra: ALTA — la derivazione e' una riga su predicati esistenti; il risultato visivo va **misurato** (P-53-B).
- Dati in produzione: BASSA — non letti per vincolo.
- Persona e budget: ALTA — misurati oggi.

**Data:** 2026-10-14. **Valida fino a:** finche' il ramo non si muove — una fase di cancellazione invalida le ancore di riga al primo commit.
