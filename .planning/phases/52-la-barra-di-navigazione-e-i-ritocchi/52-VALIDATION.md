---
phase: 52
slug: la-barra-di-navigazione-e-i-ritocchi
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-23
filled_by: piano 52-02, task 2
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derivato da `52-RESEARCH.md` §Validation Architecture e §I.8, e dai blocchi
> `<verify>` dei diciassette piani 52-01..52-17.
>
> **Cosa questo documento puo' promettere, e cosa no.** Il repository **non ha un
> test runner per il prodotto** (Guardrail 1 di `CLAUDE.md`). Qui nessun comando
> prova che il prodotto *funziona*: i comandi provano che **compila**, che i
> **gate statici** trovano nel sorgente cio' che il piano dichiara, e — dove c'e'
> un database — che il **catalogo** dice cio' che la migration voleva. Il resto
> lo provano **le procedure scritte** di `52-PROCEDURES.md`, percorse sul
> laboratorio. Una riga verde di questa mappa non vale una procedura percorsa.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **nessuno** — non esiste un test runner per il prodotto (nessuno script `test` in `package.json`, nessun file `*.test.*` o `*.spec.*`); i controlli automatici sono `next build` (che e' anche il typecheck) e i gate statici in `scripts/verify-*.mjs` |
| **Config file** | `scripts/verify-all.mjs` — l'elenco dei gate che `npm run verify` esegue, e di quelli che **non** esegue con la ragione (`verify:redirects` chiede un server; `verify:ics` legge `docs/`, che e' privato; `verify:refusal` apre sessioni vere ed e' un atto) |
| **Quick run command** | `npm run build` + il gate del file toccato (la colonna *Automated Command* della mappa) |
| **Full suite command** | `npm run build && npm run verify` — 24 gate |
| **Estimated runtime** | `npm run verify` **misurato il 2026-09-23** in un worktree senza credenziali: **~4 s**, 22 gate `passed`, 2 `REFUSED` per credenziali mancanti (`verify:capabilities`, `verify:section-export`) — un rifiuto **non e' un verde**, e con le credenziali del checkout principale quei due fanno rete e il tempo sale. `npm run build`: ~90 s (misura della fase 51, non ripetuta qui) |

---

## Sampling Rate

- **After every task commit:** il comando `<automated>` del task, come scritto nel piano (colonna *Automated Command*). Per ogni task che tocca `src/` quel comando comincia con `npm run build`.
- **After every plan wave:** `npm run build && npm run verify`. Se l'onda tocca `.claude/**` (solo il piano 52-17), anche `npm run verify:persona` **dopo** le modifiche.
- **Before `/gsd:verify-work`:** `npm run verify` verde **senza rifiuti** (lanciato dove ci sono le credenziali), **piu'** `npm run verify:capabilities` e `npm run verify:refusal` verdi **contro la produzione** dopo l'atto del piano 52-15 (il secondo sotto la sua autorizzazione datata), **piu'** `P-52-A..G` percorse sul laboratorio con gli esiti in `52-ESITI.md`.
- **Max feedback latency:** ~90 s (domina `npm run build`).

---

## Per-Task Verification Map

Una riga per ogni task dei piani 52-01..52-17 (46 task). Il comando e' quello del
blocco `<verify>` del piano, **riportato com'e'** (i `|` sono scappati per la
tabella) — con **due eccezioni dichiarate**, 52-02-T2 e 52-17-T2, i cui comandi
cercano stringhe che, copiate qui, li farebbero fallire su questo stesso file:
per quei due la cella dice cosa controllano e rimanda al piano. `static` = build e gate sul sorgente; `database` = legge o scrive un
progetto Supabase o un deploy (laboratorio, o produzione sotto atto); `manual` =
checkpoint, con la procedura o l'atto che lo regge. Il riferimento del
**laboratorio** non compare mai: i comandi lo leggono da `.env.lab.local`; il
riferimento di **produzione** che compare in alcuni comandi e' gia' pubblico
negli script del repo (`PRODUCTION_REF`), e serve a provare che lo script **lo
rifiuta**.

| Task ID | Plan | Wave | Requirement | Threat Ref | Cosa | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|------|-----------|-------------------|--------|
| 52-01-T1 | 01 | 1 | NAV-07 | T-52-01..04 | Il censimento di NAV-07, read_only, su laboratorio e produzione — solo numeri | database | `test -f .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md && /usr/bin/grep -q "Censimento di NAV-07" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md && test $(/usr/bin/grep -c "storage/v1/object/public/event-media/[0-9a-f]" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md) -eq 0 && test $(/usr/bin/grep -cE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md) -eq 0` | ⬜ pending |
| 52-01-T2 | 01 | 1 | NAV-07 | T-52-01..04 | Lo script del banco dei media sul laboratorio | static | `node --check scripts/seed-lab-media.mjs && /usr/bin/grep -q "PRODUCTION_REF" scripts/seed-lab-media.mjs && /usr/bin/grep -q "\-\-dry-run" scripts/seed-lab-media.mjs && LAB_PROJECT_REF=$(node -e "const s=require('fs').readFileSync('scripts/purge-attendances.mjs','utf8');console.log(s.match(/PRODUCTION_REF\s*=\s*['\"]([a-z0-9]+)/)[1])") node scripts/seed-lab-media.mjs --dry-run; test $? -eq 2` | ⬜ pending |
| 52-01-T3 | 01 | 1 | NAV-07 | T-52-01..04 | Seminare il laboratorio — dal percorso vero dove esiste, dallo script dove no | database | `node --check scripts/seed-lab-media.mjs && npm run build` | ⬜ pending |
| 52-02-T1 | 02 | 1 | NAV-01..07 | T-52-05..07 | Scrivere 52-PROCEDURES.md — P-52-A..G, prima di percorrerle | static | `f=.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-PROCEDURES.md; test -f $f && for p in P-52-A P-52-B P-52-C P-52-D P-52-E P-52-F P-52-G PRE-LAB; do /usr/bin/grep -q "$p" $f \|\| exit 1; done; /usr/bin/grep -q "atteso assente\\|ATTESO ASSENTE" $f && test $(/usr/bin/grep -c "Result: pending" $f) -ge 7 && test $(/usr/bin/grep -cE "[0-9a-f]{8}-[0-9a-f]{4}-" $f) -eq 0` | ⬜ pending |
| 52-02-T2 | 02 | 1 | NAV-01..07 | T-52-05..07 | Riempire 52-VALIDATION.md onestamente | static | **non riportato qui** — e' il blocco `<verify>` di `52-02-PLAN.md` task 2: controlla su questo file `nyquist_compliant: true`, `npm run build`, `npm run verify`, la riga `52-17`, e l'assenza dei segnaposto del modello e della frase vietata dal Guardrail 1. Copiato in questa cella, troverebbe quelle stringhe nella propria riga e fallirebbe su se stesso | ⬜ pending |
| 52-02-T3 | 02 | 1 | NAV-01..07 | T-52-05..07 | Chiudere le tre raccomandazioni non bloccanti della UI-SPEC | static | `/usr/bin/grep -q "D-52-26" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-UI-SPEC.md && /usr/bin/grep -q "z-40" .planning/phases/41-shared-primitives-three-tier-layout/41-UI-SPEC.md && /usr/bin/grep -q "z-10" .planning/phases/41-shared-primitives-three-tier-layout/41-UI-SPEC.md && /usr/bin/grep -q "TASK" .planning/phases/41-shared-primitives-three-tier-layout/41-UI-SPEC.md` | ⬜ pending |
| 52-03-T1 | 03 | 1 | NAV-05, NAV-02 | T-52-08..09 | La cifra staff diventa una cifra (NAV-05) | static | `npm run build && test $(/usr/bin/grep -c 'setRoleFilter("staff")' src/components/admin/MemberTable.tsx) -eq 0 && /usr/bin/grep -q "D-52-18" src/components/admin/MemberTable.tsx` | ⬜ pending |
| 52-03-T2 | 03 | 1 | NAV-05, NAV-02 | T-52-08..09 | La legenda e il commento del badge dicono la verita' dopo gallery.view | static | `npm run build && test $(/usr/bin/grep -c "it can do nothing an attendee cannot" src/components/admin/MemberTable.tsx) -eq 0 && test $(/usr/bin/grep -c "Working the door or a gallery comes from" src/components/admin/MemberTable.tsx) -eq 0 && /usr/bin/grep -q "gallery.view" src/components/admin/MemberTable.tsx` | ⬜ pending |
| 52-04-T1 | 04 | 1 | NAV-06 | T-52-10..13 | Chip dall'array, prima del filtro; allow-list = chip; catalogo senza retired_at | static | `npm run build && npm run verify:venue-surfaces && test $(/usr/bin/grep -c 'is("retired_at", null)' "src/app/(public)/events/page.tsx") -eq 0 && /usr/bin/grep -q "visibleFormatSlugs" "src/app/(public)/events/page.tsx" && /usr/bin/grep -q "D-52-15" "src/app/(public)/events/page.tsx" && test $(/usr/bin/grep -c '\.from("formats")' "src/app/(public)/events/page.tsx") -eq 1` | ⬜ pending |
| 52-04-T2 | 04 | 1 | NAV-06 | T-52-10..13 | Con zero chip la riga non esiste (D-52-17) | static | `npm run build && /usr/bin/grep -q "D-52-17" "src/app/(public)/events/FormatFilterRow.tsx" && /usr/bin/grep -q "formats.length === 0" "src/app/(public)/events/FormatFilterRow.tsx"` | ⬜ pending |
| 52-05-T1 | 05 | 1 | NAV-01 | T-52-14..19 | Cinque linguette, Recent e Alerts — e il debito da 14 a 13 nello stesso commit | static | `npm run build && npm run verify:touch-targets && npm run verify:scan-legibility && npm run verify:no-viewport-read && test $(/usr/bin/grep -c "setActiveFilter(tab.key)" "src/app/(admin)/admin/scanner/ScannerClient.tsx") -eq 1 && test $(/usr/bin/grep -c "handleUndoCheckIn(record)" "src/app/(admin)/admin/scanner/ScannerClient.tsx") -eq 1 && /usr/bin/grep -q "No scans yet" "src/app/(admin)/admin/scanner/ScannerClient.tsx" && /usr/bin/grep -q "Nothing to report" "src/app/(admin)/admin/scanner/ScannerClient.tsx" && test $(/usr/bin/grep -c "'setActiveFilter(tab.key)'" scripts/verify-touch-targets.mjs) -eq 0 && /usr/bin/grep -q "count: 14" scripts/verify-touch-targets.mjs` | ⬜ pending |
| 52-05-T2 | 05 | 1 | NAV-01 | T-52-14..19 | L'avviso della guest list sopra la ricerca, e la ricerca che sale al fuoco | static | `npm run build && npm run verify:touch-targets && npm run verify:no-viewport-read && test $(/usr/bin/grep -c "ref={searchRef}" "src/app/(admin)/admin/scanner/ScannerClient.tsx") -eq 1 && /usr/bin/grep -q "scrollIntoView" "src/app/(admin)/admin/scanner/ScannerClient.tsx" && test $(/usr/bin/grep -c "visualViewport\\|matchMedia\\|innerWidth" "src/app/(admin)/admin/scanner/ScannerClient.tsx") -eq 0` | ⬜ pending |
| 52-05-T3 | 05 | 1 | NAV-01 | T-52-14..19 | Il viewport — interactive-widget con l'aspettativa scritta, e l'ultimo vh | static | `npm run build && npm run verify:conversion && /usr/bin/grep -q 'interactiveWidget: "resizes-content"' src/app/layout.tsx && test $(/usr/bin/grep -c "viewportFit" src/app/layout.tsx) -eq 0 && test $(/usr/bin/grep -c '"60vh"' "src/app/(public)/events/EventTabs.tsx") -eq 0 && test -z "$(git diff --name-only -- src/components/ui/PageShell.tsx)"` | ⬜ pending |
| 52-06-T1 | 06 | 2 | NAV-02, NAV-07 | T-52-20..26 | M1 e il catalogo TypeScript, in un commit solo | static | `f=supabase/migrations/20260923180000_gallery_view_and_media_paths.sql; npm run build && test -f $f && test $(/usr/bin/grep -ciE "^\s*(BEGIN\|COMMIT);" $f) -eq 0 && /usr/bin/grep -q "event_media_objects_select_by_row" $f && /usr/bin/grep -q "DROP NOT NULL" $f && test $(/usr/bin/grep -v "^\s*--" $f \| /usr/bin/grep -c "SET NOT NULL") -eq 0 && test $(/usr/bin/grep -v "^\s*--" $f \| /usr/bin/grep -c "public = false") -eq 0 && /usr/bin/grep -q "EXPECTED_KEY_COUNT = 16" scripts/verify-capabilities.mjs && /usr/bin/grep -q "EXPECTED_GRANT_COUNT = 31" scripts/verify-capabilities.mjs && /usr/bin/grep -q "GALLERY_VIEW" src/lib/capabilities/keys.ts && /usr/bin/grep -q "storage_path" scripts/rls-baseline.mjs && npm run verify:media-strip` | ⬜ pending |
| 52-06-T2 | 06 | 2 | NAV-02, NAV-07 | T-52-20..26 | [BLOCKING] Applicare M1 al LABORATORIO e rileggere dal catalogo | database | `npm run build && set -a && . ./.env.local && . ./.env.lab.local && set +a && npm run verify:capabilities` | ⬜ pending |
| 52-07-T1 | 07 | 3 | NAV-01, NAV-02, NAV-03 | T-52-27..31 | La funzione pura — barra e pannello da sessione, ruolo, capability | static | `npm run build && /usr/bin/grep -q "Manage events" src/lib/routes/staff-tabs.ts && /usr/bin/grep -q "getNavigation" src/lib/rbac/roles.ts && /usr/bin/grep -q 'resolveRoute("/gallery")' src/lib/rbac/roles.ts && /usr/bin/grep -q "sortTabsByLabel" src/lib/routes/staff-tabs.ts && test $(/usr/bin/grep -c 'href: "/"' src/lib/rbac/roles.ts) -eq 0` | ⬜ pending |
| 52-07-T2 | 07 | 3 | NAV-01, NAV-02, NAV-03 | T-52-27..31 | AppNav — quattro voci, TASK spenta, il foglio da telefono, la lista in colonna, la barra che si nasconde al fuoco | static | `npm run build && npm run verify:touch-targets && npm run verify:dialogs && npm run verify:no-viewport-read && npm run verify:conversion && npm run verify:breakpoints && test $(/usr/bin/grep -c "isPhone ? ENTRY_PHONE : ENTRY_RESPONSIVE" src/components/layout/AppNav.tsx) -eq 1 && /usr/bin/grep -q 'aria-disabled="true"' src/components/layout/AppNav.tsx && test $(/usr/bin/grep -v "^\s*//\\|^\s*\*" src/components/layout/AppNav.tsx \| /usr/bin/grep -c "inset-0") -eq 0 && /usr/bin/grep -q "pointer: coarse" src/app/globals.css` | ⬜ pending |
| 52-07-T3 | 07 | 3 | NAV-01, NAV-02, NAV-03 | T-52-27..31 | Via «Management Tools» dalla pagina Account, e ManagementSection | static | `npm run build && npm run verify:conversion && test ! -f src/components/account/ManagementSection.tsx && test $(/usr/bin/grep -rl "ManagementSection" src \| wc -l) -eq 0` | ⬜ pending |
| 52-08-T1 | 08 | 3 | NAV-02, NAV-07 | T-52-32..38 | Il cancello — prefisso, allow-list, guardia in pagina | static | `npm run build && npm run verify:routes && /usr/bin/grep -q '"/gallery"' src/lib/routes/next-redirect.ts && /usr/bin/grep -q 'gallery\$/' src/lib/routes/next-redirect.ts && /usr/bin/grep -q "CAP.GALLERY_VIEW" "src/app/(public)/gallery/page.tsx" && node -e "const s=require('fs').readFileSync('src/app/(public)/gallery/page.tsx','utf8');const g=s.indexOf('CAP.GALLERY_VIEW'),r=s.indexOf('.from(\"event_media\")');process.exit(g>0&&r>g?0:1)"` | ⬜ pending |
| 52-08-T2 | 08 | 3 | NAV-02, NAV-07 | T-52-32..38 | Il modulo di firma e la pagina /gallery che legge chiavi, non indirizzi | static | `npm run build && npm run verify:media-strip && npm run verify:conversion && /usr/bin/grep -q 'import "server-only"' src/lib/media/sign-event-media.ts && test $(/usr/bin/grep -c '"use server"' src/lib/media/sign-event-media.ts) -eq 0 && test $(/usr/bin/grep -c "createServiceClient\\|SERVICE_ROLE\\|createSignedUploadUrl" src/lib/media/sign-event-media.ts) -eq 0 && /usr/bin/grep -q "gallery.sign_failed" src/lib/media/sign-event-media.ts && /usr/bin/grep -q "gallery.read_failed" "src/app/(public)/gallery/page.tsx" && test $(/usr/bin/grep -c 'select("id, url' "src/app/(public)/gallery/page.tsx") -eq 0` | ⬜ pending |
| 52-08-T3 | 08 | 3 | NAV-02, NAV-07 | T-52-32..38 | L'immagine che non arriva lo dice | static | `npm run build && npm run verify:touch-targets && npm run verify:conversion && /usr/bin/grep -q "This image could not be loaded. Reload the page." src/components/media/MediaGrid.tsx && /usr/bin/grep -q "onError" src/components/media/Lightbox.tsx && test $(/usr/bin/grep -c "next/image" src/components/media/MediaGrid.tsx src/components/media/Lightbox.tsx \| /usr/bin/grep -c ":[1-9]") -eq 0` | ⬜ pending |
| 52-09-T1 | 09 | 3 | NAV-07 | T-52-39..44 | Scrivere scripts/purge-media-orphans.mjs | static | `node --check scripts/purge-media-orphans.mjs && /usr/bin/grep -q "purge-media-orphans: grant" scripts/purge-media-orphans.mjs && /usr/bin/grep -q "/purge-media-orphans: grant" scripts/purge-media-orphans.mjs && /usr/bin/grep -q "older-than-minutes" scripts/purge-media-orphans.mjs && /usr/bin/grep -q "count_drift" scripts/purge-media-orphans.mjs && node scripts/purge-media-orphans.mjs --dry-run --apply; test $? -eq 2 && SUPABASE_ACCESS_TOKEN=x node scripts/purge-media-orphans.mjs --dry-run --project cjsfocnhfzycbbgkwocx; test $? -eq 2` | ⬜ pending |
| 52-09-T2 | 09 | 3 | NAV-07 | T-52-39..44 | Eseguirlo sul laboratorio — prima guardare, poi togliere, poi ricontare altrove | database | `node --check scripts/purge-media-orphans.mjs && ls .env.media-purge-snapshot.*.json >/dev/null && git check-ignore -q $(ls .env.media-purge-snapshot.*.json \| head -1) && test -z "$(git status --porcelain \| /usr/bin/grep media-purge-snapshot)"` | ⬜ pending |
| 52-10-T1 | 10 | 3 | NAV-07 | T-52-45..50 | Il hook per server-only, e la prova che lo stripper del prodotto si carica | static | `node --check scripts/lib/server-only-shim.mjs && node --input-type=module -e "await import('./scripts/lib/server-only-shim.mjs'); const m = await import('./src/lib/media/strip-metadata.ts'); if (typeof m.stripImageMetadata !== 'function') process.exit(1); const sharp=(await import('sharp')).default; const src=await sharp({create:{width:8,height:8,channels:3,background:'#000'}}).jpeg().withExif({IFD0:{Copyright:'probe'}}).toBuffer(); if(!(await sharp(src).metadata()).exif) process.exit(3); const out=await m.stripImageMetadata(src,'image/jpeg'); process.exit((await sharp(out).metadata()).exif ? 2 : 0)"` | ⬜ pending |
| 52-10-T2 | 10 | 3 | NAV-07 | T-52-45..50 | Scrivere scripts/restrip-event-media.mjs | static | `node --check scripts/restrip-event-media.mjs && /usr/bin/grep -q "server-only-shim" scripts/restrip-event-media.mjs && /usr/bin/grep -q "restrip-event-media: grant" scripts/restrip-event-media.mjs && /usr/bin/grep -q "upsert: true" scripts/restrip-event-media.mjs && /usr/bin/grep -q "stripImageMetadata" scripts/restrip-event-media.mjs && test $(/usr/bin/grep -c "\.rotate(\\|\.withMetadata(\\|keepMetadata" scripts/restrip-event-media.mjs) -eq 0 && SUPABASE_ACCESS_TOKEN=x node scripts/restrip-event-media.mjs --dry-run --project cjsfocnhfzycbbgkwocx --before 2026-08-09T00:00:00Z; test $? -eq 2` | ⬜ pending |
| 52-10-T3 | 10 | 3 | NAV-07 | T-52-45..50 | Provarlo sul laboratorio con la foto che porta GPS davvero | database | `node --check scripts/restrip-event-media.mjs && ls -d .env.restrip-snapshot.* >/dev/null && git check-ignore -q $(ls -d .env.restrip-snapshot.* \| head -1) && test -z "$(git status --porcelain \| /usr/bin/grep restrip-snapshot)"` | ⬜ pending |
| 52-11-T1 | 11 | 4 | NAV-03, NAV-04 | T-52-51..53 | Via la colonna Work — workNav, la forma column, e il layout che la montava | static | `npm run build && npm run verify:conversion && test $(/usr/bin/grep -rc "workNav" src/components/layout/AppNav.tsx "src/app/(admin)/admin/(work)/layout.tsx" \| /usr/bin/grep -c ":[1-9]") -eq 0 && test $(/usr/bin/grep -c '"column"' src/components/staff/StaffNav.tsx) -eq 0` | ⬜ pending |
| 52-11-T2 | 11 | 4 | NAV-03, NAV-04 | T-52-51..53 | La striscia appesa, in ordine alfabetico — e i gate che la descrivono | static | `npm run build && npm run verify:touch-targets && npm run verify:conversion && npm run verify:no-viewport-read && /usr/bin/grep -q "sticky top-0 z-10" src/components/staff/StaffNav.tsx && test $(/usr/bin/grep -c "backdrop-blur" src/components/staff/StaffNav.tsx) -eq 0 && /usr/bin/grep -q "sortTabsByLabel" src/components/staff/StaffNav.tsx && test $(/usr/bin/grep -c "in two forms" scripts/verify-touch-targets.mjs scripts/conversion-manifest.mjs \| /usr/bin/grep -c ":[1-9]") -eq 0` | ⬜ pending |
| 52-12-T1 | 12 | 4 | NAV-07 | T-52-54..59 | Le azioni — registerMedia scrive la chiave, deleteMedia cancella per chiave e non tace | static | `npm run build && npm run verify:media-strip && test $(/usr/bin/grep -c "object/public/event-media" "src/app/(public)/events/[slug]/actions.ts") -eq 0 && /usr/bin/grep -q "storage_path: storagePath" "src/app/(public)/events/[slug]/actions.ts" && test $(/usr/bin/grep -c "Continue to delete the DB record even if storage deletion fails" "src/app/(public)/events/[slug]/actions.ts") -eq 0 && /usr/bin/grep -q "media.storage_path_missing" "src/app/(public)/events/[slug]/actions.ts"` | ⬜ pending |
| 52-12-T2 | 12 | 4 | NAV-07 | T-52-54..59 | La pagina della serata — sezione sotto gallery.view, media firmati | static | `npm run build && npm run verify:venue-surfaces && npm run verify:conversion && /usr/bin/grep -q "CAP.GALLERY_VIEW" "src/app/(public)/events/[slug]/page.tsx" && /usr/bin/grep -q "signEventMedia" "src/app/(public)/events/[slug]/page.tsx" && test $(/usr/bin/grep -c 'select("id, url, type, uploaded_by' "src/app/(public)/events/[slug]/page.tsx") -eq 0` | ⬜ pending |
| 52-12-T3 | 12 | 4 | NAV-07 | T-52-54..59 | La moderazione firma a 300 s e lascia next/image | static | `npm run build && npm run verify:touch-targets && npm run verify:conversion && test $(/usr/bin/grep -c "next/image" src/components/media/MediaReviewGrid.tsx) -eq 0 && /usr/bin/grep -q "EVENT_MEDIA_REVIEW_SIGNATURE_SECONDS" "src/app/(admin)/admin/(work)/events/[id]/media/page.tsx" && test $(/usr/bin/grep -rn 'from("event_media")' src \| wc -l) -ge 1 && test $(/usr/bin/grep -rn "select(\"id, url\\|, url, type\\|\"url\"" src --include=*.tsx --include=*.ts \| /usr/bin/grep -c event_media) -eq 0` | ⬜ pending |
| 52-13-T1 | 13 | 5 | NAV-07, NAV-02 | T-52-61..67 | Scrivere M2, il gruppo gallery di verify:refusal, la prosa di verify:media-strip, i tipi e lo script delle sonde | static | `f=supabase/migrations/20260923180100_gallery_close_data.sql; npm run build && npm run verify:media-strip && test -f $f && test $(/usr/bin/grep -ciE "^\s*(BEGIN\|COMMIT);" $f) -eq 0 && /usr/bin/grep -q "NON APPLICARE PRIMA" $f && /usr/bin/grep -q "event_media_select_gallery" $f && /usr/bin/grep -q "public = false" $f && /usr/bin/grep -q "SET NOT NULL" $f && /usr/bin/grep -q 'section: "gallery"' scripts/verify-refusal.mjs && node --check scripts/probe-event-media-lab.mjs && LAB_PROJECT_REF=cjsfocnhfzycbbgkwocx node scripts/probe-event-media-lab.mjs; test $? -eq 2` | ⬜ pending |
| 52-13-T2 | 13 | 5 | NAV-07, NAV-02 | T-52-61..67 | [BLOCKING] Il deploy nel mezzo, sul laboratorio — il ramo lab al codice della fase, READY | database | `curl -sI https://lab.resonatemotion.com/gallery \| /usr/bin/grep -i "^location:" \| /usr/bin/grep -q "login?next=%2Fgallery"` | ⬜ pending |
| 52-13-T3 | 13 | 5 | NAV-07, NAV-02 | T-52-61..67 | [BLOCKING] M2 sul laboratorio, poi le sonde, verify:refusal e la linea di base RLS | database · **P-52-G sonde 1-4, 6-8** | `set -a && . ./.env.local && . ./.env.lab.local && set +a && npm run verify:refusal && npm run verify:capabilities && node scripts/probe-event-media-lab.mjs` | ⬜ pending |
| 52-14-T1 | 14 | 6 | NAV-01..07 | T-52-68..70 | PRE-LAB — il laboratorio, il commit servito, gli account del banco | database | `/usr/bin/grep -q "Corsa sul laboratorio" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md && test $(/usr/bin/grep -cE "[0-9a-f]{8}-[0-9a-f]{4}-" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md) -eq 0` | ⬜ pending |
| 52-14-T2 | 14 | 6 | NAV-01..07 | T-52-68..70 | Il proprietario percorre P-52-A..G sul laboratorio, su iPhone | manual · **P-52-A..G** | `/usr/bin/grep -q "P-52-F" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md && /usr/bin/grep -qi "atteso assente" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md` | ⬜ pending |
| 52-14-T3 | 14 | 6 | NAV-01..07 | T-52-68..70 | Il login — toccare FOCUS_ROOT o lasciarlo, sul risultato della prova | manual · **P-52-F (login)** | `/usr/bin/grep -qi "login" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-ESITI.md && /usr/bin/grep -q "^walked: 20" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-PROCEDURES.md` | ⬜ pending |
| 52-15-T1 | 15 | 7 | NAV-01..07 | T-52-71..77 | Scrivere 52-AUTHORISATION.md PRIMA di chiedere, con i numeri di oggi | static | `f=.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION.md; test -f $f && /usr/bin/grep -q "Fuori perimetro" $f && /usr/bin/grep -q "20260923180000" $f && /usr/bin/grep -q "20260923180100" $f && /usr/bin/grep -q "status: SCRITTA" $f && test $(/usr/bin/grep -c "object/public/event-media/" $f) -eq 0 && test $(/usr/bin/grep -cE "[0-9a-f]{8}-[0-9a-f]{4}-" $f) -eq 0` | ⬜ pending |
| 52-15-T2 | 15 | 7 | NAV-01..07 | T-52-71..77 | Il proprietario autorizza — o non autorizza | manual · **52-AUTHORISATION.md** | `/usr/bin/grep -q "^granted:" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION.md && /usr/bin/grep -q "^answer:" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION.md` | ⬜ pending |
| 52-15-T3 | 15 | 7 | NAV-01..07 | T-52-71..77 | [BLOCKING] Spendere l'atto — M1, il deploy nel mezzo, M2 — e dichiararlo esaurito | database · **52-AUTHORISATION.md (atto speso)** | `npm run verify:capabilities && npm run verify:refusal && /usr/bin/grep -q "ESAURITA" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION.md && curl -sI https://www.resonatemotion.com/gallery \| /usr/bin/grep -i "^location:" \| /usr/bin/grep -q "login?next=%2Fgallery"` | ⬜ pending |
| 52-16-T1 | 16 | 8 | NAV-07 | T-52-78..83 | Scrivere 52-AUTHORISATION-MEDIA.md PRIMA di chiedere, con i numeri di oggi | static | `f=.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION-MEDIA.md; test -f $f && /usr/bin/grep -q "<!-- purge-media-orphans: grant -->" $f && /usr/bin/grep -q "<!-- /purge-media-orphans: grant -->" $f && /usr/bin/grep -q "<!-- restrip-event-media: grant -->" $f && /usr/bin/grep -q "Fuori perimetro" $f && test $(/usr/bin/grep -cE "[0-9a-f]{8}-[0-9a-f]{4}-" $f) -eq 0` | ⬜ pending |
| 52-16-T2 | 16 | 8 | NAV-07 | T-52-78..83 | Il proprietario autorizza la rimozione e la ri-spogliatura — o no | manual · **52-AUTHORISATION-MEDIA.md** | `/usr/bin/grep -q "^answer:" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION-MEDIA.md` | ⬜ pending |
| 52-16-T3 | 16 | 8 | NAV-07 | T-52-78..83 | [BLOCKING] Eseguire gli strumenti concessi, e chiudere l'atto | database · **52-AUTHORISATION-MEDIA.md (atto speso)** | `f=.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-AUTHORISATION-MEDIA.md; /usr/bin/grep -q "ESAURITA" $f && test $(/usr/bin/grep -c "^spent: no" $f) -eq 0 -o $(/usr/bin/grep -c "^granted: no" $f) -ge 1` | ⬜ pending |
| 52-17-T1 | 17 | 9 | NAV-01..07 | T-52-84..87 | La persona — media-and-storage e access-gating rileggono il prodotto, CHANGELOG, verify:persona dopo | static | `npm run verify:persona && /usr/bin/grep -q "1.26.0" .claude/CHANGELOG.md && test $(/usr/bin/grep -c "public: true" .claude/rules/media-and-storage.md) -eq 0 && test $(/usr/bin/grep -c "Nessuna sanitizzazione dei metadati esiste nel codice" .claude/rules/media-and-storage.md) -eq 0 && /usr/bin/grep -q "gallery.view" .claude/rules/access-gating.md` | ⬜ pending |
| 52-17-T2 | 17 | 9 | NAV-01..07 | T-52-84..87 | La sonda dopo la finestra di cache, e 52-VERIFICATION.md con le prove | static | **riportato in parte** — `f=.planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-VERIFICATION.md; npm run build && npm run verify && test -f $f` + ogni `NAV-01..07` e ogni `D-52-01..31` presenti in `$f` + almeno 20 citazioni `file:riga` + zero UUID + zero occorrenze della frase vietata dal Guardrail 1 (il comando intero e' in `52-17-PLAN.md` task 2: copiato qui, la frase che cerca renderebbe rosso il controllo di questo file) | ⬜ pending |
| 52-17-T3 | 17 | 9 | NAV-01..07 | T-52-84..87 | Il proprietario approva la verifica — e le istantanee locali si cancellano a data scritta | manual · **52-VERIFICATION.md (approvazione)** | `/usr/bin/grep -qi "istantane" .planning/phases/52-la-barra-di-navigazione-e-i-ritocchi/52-VERIFICATION.md` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Nota sui checkpoint.** Le righe `manual` di 52-14, 52-15, 52-16 e 52-17 hanno
un comando, ma quel comando controlla soltanto che **l'esito sia stato
scritto** (una riga in `52-ESITI.md`, un `answer:` nell'atto): non puo' dire se
cio' che e' scritto e' vero. La prova e' la procedura percorsa o l'atto firmato,
e la responsabilita' di quella prova resta al ruolo che la registra.

---

## Wave 0 Requirements

- [ ] `52-PROCEDURES.md` — `PRE-LAB` e `P-52-A..G` nella forma di `51-PROCEDURES.md`, scritte **prima** del codice che misurano (piano 52-02, task 1)
- [ ] il censimento di NAV-07, `read_only`, su laboratorio e produzione, con i soli numeri aggregati in `52-ESITI.md` (piano 52-01, task 1)
- [ ] il banco dei media sul laboratorio — almeno una foto approvata, una pending, una di una serata segreta, un video (piano 52-01, task 2-3)
- [ ] `scripts/verify-capabilities.mjs` (16 chiavi, 31 concessioni) e `PROBE_PAYLOADS.event_media` in `scripts/rls-baseline.mjs` (con `storage_path`) mossi **nello stesso commit di M1** (piano 52-06, task 1): un gate aggiornato dopo la migration e' un gate che per un commit ha detto il falso

**Nessun framework da installare: e' una decisione del progetto, non un buco.**
Un runner introdotto in una fase di navigazione sarebbe scope nuovo, e il
laboratorio con le procedure scritte e' lo strumento che il progetto ha scelto
per cio' che un gate statico non vede.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| La barra e il pannello, per ciascuno dei sei soggetti, da telefono e da tablet | NAV-01, NAV-03 | cio' che vede un ruolo dipende da sessione, ruolo e capability lette dal database vero; il foglio, lo scrim e la lista in colonna si giudicano a schermo | `P-52-A` in `52-PROCEDURES.md` |
| Il cancello della gallery e la sezione «Gallery» assente sulla pagina della serata | NAV-02 | il redirect passa dal middleware con sessioni vere; l'assenza di una sezione si osserva, non si greppa | `P-52-B` |
| La striscia degli strumenti appesa | NAV-04 | `sticky` e opacita' si vedono solo scorrendo su un telefono vero | `P-52-C` |
| I chip dalle serate visibili e la cifra staff che non reagisce | NAV-05, NAV-06 | i chip variano con chi guarda: servono almeno due soggetti e un banco con una bozza | `P-52-D` |
| La porta in cinque linguette, radio accesa e spenta | NAV-01 (porta, D-52-19..22, D-52-26) | service worker, coda offline e modalita' aereo vera esistono solo su un telefono; l'asimmetria del rifiuto si giudica davanti allo schermo | `P-52-E` |
| La tastiera su iPhone | D-52-06, D-52-23, D-52-28 | Safari iOS e la sua tastiera non si emulano; il ridimensionamento del viewport e' **atteso assente** e va registrato come tale, separato dalle tre misure di layout | `P-52-F` |
| I media chiusi — righe, oggetti, firme, cache | NAV-07 | le sonde chiedono sessioni vere per ruolo sul laboratorio dopo M2, e la sonda 1 va ripetuta dopo la finestra di cache (CDN 3600 s, service worker 1 h) | `P-52-G` (sonde 1-4, 6-8: chi esegue 52-13; sonda 5: il proprietario) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — 46 task su 46 hanno un comando; quelli dei checkpoint controllano che l'esito sia scritto, non che sia vero (nota sotto la mappa)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references — da spuntare quando 52-01, 52-02 e il commit di M1 in 52-06 sono chiusi
- [x] No watch-mode flags
- [ ] Feedback latency < 90s — da rimisurare: `npm run build` non e' stato cronometrato in questa fase
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
