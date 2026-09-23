---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
milestone: v1.6
verified: 2026-09-23
status: passed
approval: "approvata — il proprietario, 2026-09-23T19:13:29Z (checkpoint del piano 52-17, Task 3; istantanee locali cancellate alla stessa ora)"
requirements_total: 7
requirements_closed: 7
requirements_partial: 0
requirements_contradicted: 0
decisions_total: 31
decisions_contradicted: 0
procedure_steps_not_walked: 5
gates_red: 0
environment: produzione (deploy `f671144b` READY 18:28:33Z; M1 `20260923182638`, M2 `20260923182908`) + laboratorio permanente (`.planning/v1.6-LAB-DESIGN.md`), dove sono state percorse P-52-A..G
evidence: 52-ESITI.md (censimento, corsa sul laboratorio, chiusura delle lacune, atto 1, atto 2, sonda dopo la finestra), 52-AUTHORISATION.md e 52-AUTHORISATION-MEDIA.md (entrambe ESAURITE), 52-PROCEDURES.md, i diciannove SUMMARY
---

# Fase 52 — Verifica

> **Cosa significa `passed` qui.** I **sette requisiti sono chiusi** e
> nessuna delle trentuno decisioni e' contraddetta. Lo stato e' stato
> `human_needed` fino all'**approvazione del proprietario** al checkpoint del
> piano 52-17, arrivata il 2026-09-23 con la risposta letterale `approvata`
> (registrata alle 19:13:29Z), insieme alla cancellazione delle istantanee
> locali. I passi
> di procedura non percorsi (cinque) e il debito sono **dichiarati** sotto, non
> arrotondati: nessuno di loro contraddice un requisito, ma nessuno di loro e'
> una prova.
>
> **Non esiste un test runner per il prodotto.** Nessuna riga di questo documento
> dice che qualcosa e' verificato perche' una suite e' verde. `npm run build`
> **e'** il typecheck, non una prova di comportamento; `npm run verify` esegue
> gate statici e di catalogo, non codice di prodotto. Ogni riga qui dice **dove
> sta** la cosa (`file:riga`, riletto il 2026-09-23 sul codice corrente, non
> copiato dai SUMMARY) e **cosa si e' osservato** percorrendola.

## Il goal, in una riga, e dove e' stato osservato

*La barra per ogni pubblico con le voci decise, il pannello Management al posto
della sezione dell'account e della colonna Work, la gallery chiusa sull'indirizzo
**e sui dati**, la striscia appesa, la cifra staff, i chip dalle serate visibili,
e la porta in cinque linguette.*

**Osservato in questa sequenza, 2026-09-23 (UTC):** censimento `read_only` alle
13:08Z (produzione vuota di media); M1 sul laboratorio 13:31Z; strumenti di
rimozione e ri-spogliatura provati sul laboratorio 13:42Z–13:47Z; M2 sul
laboratorio 14:28:18Z dopo il deploy `READY` delle 14:27:35Z; la corsa su iPhone
16:13Z–17:15Z (tre difetti trovati); le lacune chiuse (52-18, 52-19) e rimisurate
17:52Z–18:12Z; il difetto 1 confermato chiuso sull'iPhone del proprietario alle
18:27Z; **l'atto in produzione** 18:26:37Z → 18:29:08Z; il secondo atto
18:42:45Z → 18:43:33Z a zero soggetti; la sonda dopo la finestra alle 18:48:05Z,
senza soggetto.

| Prova | Laboratorio | Produzione |
|---|---|---|
| M1 e M2 applicate nell'ordine M1 → deploy READY → M2, rilette dal catalogo | si' (13:31Z, 14:27:35Z, 14:28:18Z) | **si'** (18:26:38Z, 18:28:33Z, 18:29:08Z) |
| `verify:capabilities` 5/5, 16 chiavi · 31 concessioni | si' | **si'**, 18:29:08Z, 18:30:54Z e di nuovo oggi alle 18:52:29Z |
| le sonde per ruolo di P-52-G (attendee 0 righe, 0 firme; staff firma le approvate e non le pending) | **si'** | **no — la produzione ha 0 media**: non c'e' nulla da misurare, e non si semina |
| `verify:refusal --section=gallery` | **exit 0**, *pair held* (master 4 · attendee 0 · anon 0) | **RIFIUTATO**, una corsa sola, su 0 media: l'esito onesto, previsto nell'atto prima della domanda |
| la barra, il pannello, il cancello, la striscia, i chip, la porta, la tastiera | **si'**, su iPhone vero, iPhone simulato e Chrome | no, e non deve esserlo: la produzione serve **lo stesso artefatto** (`f671144b` contiene i commit percorsi) |

---

## Requisito per requisito

### NAV-01 — quattro voci per chi lavora, due per gli altri, TASK spenta · **CHIUSO**

**Il codice.** Una funzione pura decide barra e pannello da sessione, ruolo e
capability: `src/lib/rbac/roles.ts:615` (`getNavigation`). Le voci:
`EVENTS` a `roles.ts:260`, `CHECK_IN` a `roles.ts:282` (predicato `door.operate`
per ruolo o per assegnazione, `roles.ts:332`), `ACCOUNT` a `roles.ts:335`; TASK
e' una voce di tipo `disabled` senza `href` (`roles.ts:163`, `roles.ts:379`) e
compare solo ai ruoli di `TASK_ROLES` (`roles.ts:372-376`: master, organizer,
staff). Management compare se il pannello ha voci, altrimenti Account:
`roles.ts:634`. In `src/components/layout/AppNav.tsx:471` TASK e' un `button`
con `aria-disabled="true"`, nessun `onClick`, nessun `href`. `/` resta il
redirect a `/events`: `src/app/page.tsx:45`.

**Osservato** (`52-ESITI.md`, P-52-A): anonimo e `attendee` → `Events ·
Account`; `staff` non assegnato → `Events · TASK · Management` (**a mano,
sull'iPhone del proprietario**, 16:21Z–16:28Z); staff assegnato, organizer,
master → `Events · Check-in · TASK · Management`; tocco su TASK: indirizzo
invariato, nessun foglio. **I passi da tablet (9-11) sono passati solo in Chrome
a 1024 px: nessun tablet vero.**

### NAV-02 — la gallery solo con `gallery.view`: voce nel pannello, riga di mappa, guardia in pagina · **CHIUSO**

**Tre pezzi, tutti e tre presenti:**
- la voce di mappa `[CAP.GALLERY_VIEW]: { routes: ["/gallery"], alsoGatesTables: true }` — `src/lib/routes/capability-routes.ts:952-955`, letta dal middleware a `src/lib/supabase/middleware.ts:640` (`resolveRoute`);
- il prefisso protetto con ritorno al login — `src/lib/routes/next-redirect.ts:250` (`PROTECTED_PREFIXES`) e `next-redirect.ts:139` (`/^\/gallery$/` in `NEXT_ALLOW_LIST`);
- la guardia in cima alla pagina, prima di ogni lettura — `src/app/(public)/gallery/page.tsx:93-94`.

La voce del pannello nasce solo con la chiave: `roles.ts:470`, con l'asserzione
che la mappa risolva `/gallery` su `gallery.view` (`roles.ts:436`). La chiave:
`src/lib/capabilities/keys.ts:390`; nel catalogo
`supabase/migrations/20260923180000_gallery_view_and_media_paths.sql:99-125`
(chiave e tre concessioni per ruolo, attendee escluso).

**Osservato:** in produzione alle 18:28:47Z, da anonimo, `/gallery` → 307 verso
`/login?next=%2Fgallery`. Sul laboratorio (P-52-B): l'`attendee` che digita
l'indirizzo rimbalza come su `/admin`, nessun 404; lo `staff` non assegnato apre
la gallery e vede le tre foto (**a mano, iPhone del proprietario**).

### NAV-03 — Management e' un pannello, alfabetico, e sparisce da Account · **CHIUSO**

**Il codice.** Il pannello e' `visibleStaffTabs` + Gallery + Account, ordinato
da `sortTabsByLabel` (`roles.ts:465-480`, `src/lib/routes/staff-tabs.ts:410`).
Da telefono e' un foglio sopra la barra, `z-50`, scrim `bg-black/80`
(`AppNav.tsx:640` e `AppNav.tsx:646`); in colonna parte aperto dentro uno
strumento (`AppNav.tsx:331`, `AppNav.tsx:335`). `ManagementSection.tsx` e'
**cancellato** (unica cancellazione di file della fase: `git diff
--diff-filter=D`); la pagina Account ne registra l'uscita
(`src/app/(members)/account/page.tsx:434` e `:442`).

**Osservato** (P-52-A passi 4-8): organizer, foglio `Account · Artists ·
Calendar · Formats · Gallery · Location · Manage events · Manifesto · Members ·
Venues · Visual` (**a mano sull'iPhone**); master le stesse piu' Newsletter;
`/account` senza «Management Tools».

### NAV-04 — la striscia degli strumenti resta appesa da telefono · **CHIUSO**

`src/components/staff/StaffNav.tsx:138` — `sticky top-0 z-10 … bg-ground …
md:hidden`, opaca e senza `backdrop-blur`; ordine alfabetico come il pannello
(`StaffNav.tsx:105`). **Osservato** (P-52-C): in fondo a Members la striscia resta
in cima, fondo opaco; un tocco su Artists cambia strumento senza risalire
(simulatore iOS 27.0 e iPhone del proprietario). **Non osservato:** la modalita'
standalone (app installata) su iPhone.

### NAV-05 — la cifra `staff` smette di essere un link con filtro · **CHIUSO**

`src/components/admin/MemberTable.tsx:696` — uno `span` nella stessa forma delle
altre cifre, con il commento datato a `MemberTable.tsx:690` (D-52-18);
`setRoleFilter("staff")` ha zero occorrenze. **Osservato** (P-52-D passo 6):
«3 staff» e' testo, il tocco non cambia ne' indirizzo ne' righe; la pagina Members
mostra le tre cifre (**a mano sull'iPhone**).

### NAV-06 — solo i format con almeno una serata visibile a chi guarda · **CHIUSO, con due passi non percorsi**

`src/app/(public)/events/page.tsx:607-610` — `visibleFormatSlugs` dall'array
gia' letto, **prima** del filtro per format; una sola lettura del catalogo
(`page.tsx:222`), senza `retired_at` (D-52-16, commento a `page.tsx:209-212`); la
riga dei chip non si monta a zero serate:
`src/app/(public)/events/FormatFilterRow.tsx:137`. **Osservato** (P-52-D passi 1,
3, 4): anonimo, chip `All · re:sonate`; un `?format=` di un format senza serate
non filtra nulla. **Non percorsi:** passo 2 (nessun format con sola bozza sul
banco) e passo 5 (zero serate visibili non si produce senza scrivere).
`verify:venue-surfaces` verde.

### NAV-07 — la gallery chiude anche i dati · **CHIUSO in produzione, con i limiti sotto**

**Il codice e le migration:**
- righe: `event_media_select_gallery`, `status = 'approved' AND (SELECT private.has_capability('gallery.view'))` al posto della policy che mostrava le approvate a ogni sessione — `supabase/migrations/20260923180100_gallery_close_data.sql:133-141`;
- oggetti: la sola lettura e' `event_media_objects_select_by_row`, `TO authenticated`, che chiede la riga — `20260923180000_gallery_view_and_media_paths.sql:223`; «Anyone can view event media» tolta (`20260923180100_gallery_close_data.sql:152`);
- bucket: `UPDATE storage.buckets SET public = false WHERE id = 'event-media'` — `20260923180100_gallery_close_data.sql:165-167`, con un `DO` che solleva se il bucket non e' privato o se `event-images` non e' piu' pubblico;
- la firma sotto la sessione di chi guarda, mai la chiave di servizio: `src/lib/media/sign-event-media.ts:121` e `sign-event-media.ts:128`, 3600 s la gallery (`sign-event-media.ts:58`) e 300 s la moderazione (`sign-event-media.ts:78`);
- i lettori: gallery (`src/app/(public)/gallery/page.tsx:103`, seleziona `storage_path` e mai `url`; firma a `:125`), pagina della serata (`src/app/(public)/events/[slug]/page.tsx:1035`), moderazione (`src/app/(admin)/admin/(work)/events/[id]/media/page.tsx:271`);
- lo scrittore: `registerMedia` scrive `storage_path` e nessun indirizzo pubblico — `src/app/(public)/events/[slug]/actions.ts:202`.

**Il censimento dei link pubblici gia' emessi:** in produzione **0 righe e 0
oggetti** al 2026-09-23 13:08:07Z (`52-ESITI.md`), quindi 0 link da convertire;
nel codice `getPublicUrl` resta **solo** sui tre bucket pubblici
(`event-images`, `venue-photos`, `artist-photos`) e **nessuna** mail in
`src/emails/` nomina `event_media` o il bucket (grep, 0 righe).

**Osservato in produzione:** rilettura del catalogo dopo M2 — `storage_path` NOT
NULL, `event-media` privato, `event_media_select_gallery` presente, la policy
vecchia assente; `verify:capabilities` 5/5 (TS 16 · DB 16 · POLICY 12 · SRC 16 ·
GRANT 31). **Osservato sul laboratorio** (52-13, P-52-G sonde 1b, 2, 3, 4a, 4b,
8): origine chiusa gia' 28 s dopo M2 (400×3 con parametro unico); `attendee` 0
righe e 0 firme; anonimo 0 firme; staff firma le 3 approvate (2 di serata
segreta) e **non** la pending; una firma a 5 s risponde 200 e poi 400.

**I limiti, detti qui e ripresi nel debito:** `verify:refusal` in produzione e'
RIFIUTATO su 0 media; il **residuo della cache** e' zero per costruzione in
produzione ma misurato **oltre il `max-age`** sul laboratorio; il **video** e la
**sonda 7** (un caricamento nuovo con `storage_path` e `url` nullo) non sono
stati percorsi.

---

## Le trentuno decisioni, spuntate una per una

| # | Decisione | Evidenza |
|---|---|---|
| **D-52-01** | quattro voci per chi lavora | `roles.ts:615-636`; P-52-A passo 1, a mano sull'iPhone |
| **D-52-02** | Home non esiste | `src/app/page.tsx:45` (`redirect("/events")`); nessuna voce Home, il glifo `home` e' uscito dal dizionario delle icone (52-07) |
| **D-52-03** | TASK disegnata ma spenta, non un link, nessun dato | `AppNav.tsx:471`; `roles.ts:163` (tipo `disabled` senza `href`); nessuna lettura di dati. Il posto del badge e' un commento |
| **D-52-04** | Account in barra solo per chi non ha Management | `roles.ts:634`; osservato per anonimo e `attendee` |
| **D-52-05** | Check-in assente senza `door.operate`, non spenta | `roles.ts:627` (la voce entra solo col predicato); lo `staff` non assegnato non la vede (a mano) |
| **D-52-06** | barra nascosta al fuoco | `src/app/globals.css:601-617` (`:has(:focus)` sotto `pointer: coarse`); P-52-F 1a, telefono del proprietario pilotato: `display:none` al fuoco, torna al blur. Il login non monta la barra |
| **D-52-07** | foglio dal basso, sopra la barra, solo la lista alfabetica | `AppNav.tsx:640`, `AppNav.tsx:646`; P-52-A passi 4-6 |
| **D-52-08** | su tablet la lista nella colonna, aperta dentro uno strumento | `AppNav.tsx:331-335`; la colonna Work e' uscita (52-11). **Solo in Chrome a 1024 px** |
| **D-52-09** | contenuto = `visibleStaffTabs` + Gallery + Account; «Management Tools» sparisce | `roles.ts:465-480`; `ManagementSection.tsx` cancellato |
| **D-52-10** | «Manage events» | `src/lib/routes/staff-tabs.ts:149` |
| **D-52-11** | la striscia appesa da telefono | `StaffNav.tsx:138` |
| **D-52-12** | `gallery.view` a master, organizer, staff per ruolo; 16 chiavi, 31 concessioni | `20260923180000_gallery_view_and_media_paths.sql:99-125`; `keys.ts:390`; `scripts/verify-capabilities.mjs:291` (`EXPECTED_KEY_COUNT = 16`) e `verify-capabilities.mjs:850` (`EXPECTED_GRANT_COUNT = 31`); in produzione master 16 · organizer 14 · staff 1 · attendee 0 |
| **D-52-13** | `/gallery` nella mappa, guardia in pagina, anonimo al login con ritorno | `capability-routes.ts:952-955`; `gallery/page.tsx:93`; `next-redirect.ts:139`, `next-redirect.ts:250`; 307 in produzione alle 18:28:47Z |
| **D-52-14** | la nota per chi riaprira' la gallery, nel codice | `capability-routes.ts:925-942`, cinque passi, **il quinto e' una migration**; ripresa nella persona (`access-gating.md`, 1.26.0) |
| **D-52-15** | chip dall'array gia' letto, prima del filtro | `events/page.tsx:601-610`; commento rovesciato a `events/page.tsx:196` |
| **D-52-16** | un format ritirato con serate visibili mostra il chip | `events/page.tsx:209-212`; nessun `.is("retired_at", null)` |
| **D-52-17** | zero serate visibili, nessuna riga di chip | `FormatFilterRow.tsx:137`. **Passo 5 di P-52-D non percorso** |
| **D-52-18** | la cifra staff come le altre | `MemberTable.tsx:690-696` |
| **D-52-19** | cinque linguette sempre presenti, vuote con il loro testo | `src/app/(admin)/admin/scanner/ScannerClient.tsx:424` (`FilterTab` a cinque valori), `ScannerClient.tsx:2816-2835`; «No scans yet» a `ScannerClient.tsx:3648`, «Nothing to report» a `ScannerClient.tsx:3751`; P-52-E passi 1-3 sul telefono del proprietario |
| **D-52-20** | un avviso accende Alerts, non la apre | `ScannerClient.tsx:2810` (pallino solo se Alerts non e' aperta e c'e' una chiave non vista); `setActiveFilter("alerts")` **zero occorrenze**; P-52-E passo 4 in modalita' aereo vera: la linguetta resta Out |
| **D-52-21** | pastiglie e avviso della guest list in testata | `ScannerClient.tsx:3264` (`guestListWarningText`, sopra la ricerca); P-52-E passo 5 e P-52-F misura 2, radio spenta |
| **D-52-22** | l'annullamento resta sulla riga, dentro Recent | `ScannerClient.tsx:3532` (`handleUndoCheckIn(record)`, una sola occorrenza). **P-52-E passo 6 NON percorso**: nessuna scansione di un QR vero, nessun annullamento provato |
| **D-52-23** | viewport per tutta l'app, `dvh` al posto di `vh` | `src/app/layout.tsx:93` (`interactiveWidget: "resizes-content"`), `layout.tsx:128` (`min-h-dvh`), `src/app/(public)/events/EventTabs.tsx:583` (`60dvh`); zero `vh` residui in `src/` (grep) |
| **D-52-24** | TASK spenta anche al master | `roles.ts:372-376`; osservato col master |
| **D-52-25** | NAV-07 dentro la fase, Critical | vedi NAV-07; sotto due atti datati, entrambi ESAURITI |
| **D-52-26** | etichette corte, una riga | `ScannerClient.tsx:2824-2826` («Out», «In»); P-52-E passo 8: sempre cinque, stesse posizioni, rete accesa e spenta |
| **D-52-27** | un ordine solo, alfabetico, al rendering | `staff-tabs.ts:410` (`sortTabsByLabel`), usato da `roles.ts:480` e `StaffNav.tsx:105`; la dichiarazione non e' riordinata |
| **D-52-28** | il viewport iOS con l'aspettativa scritta; il login si decide sulla misura | `layout.tsx:93`; P-52-F misura 4 **atteso assente — osservato assente** su iOS 26.7 e 27.0; il login: **`resta`**, registrato a nome del proprietario la cui risposta era un requisito (niente zoom), soddisfatto dai campi a 16 px (`src/components/ui/Input.tsx:113`, rete in `globals.css:677-692`) e confermato sul suo iPhone alle 18:27Z (scala 1); con il fuoco sulla password «Sign In» e' in vista. `FOCUS_ROOT` non toccato |
| **D-52-29** | la sezione Gallery della serata sparisce senza `gallery.view` | `src/app/(public)/events/[slug]/page.tsx:2020` (`hasGalleryView || canUpload`); P-52-B passo 6: `attendee`, nessun titolo, nessuna parola gallery/photo, anche sulla serata segreta |
| **D-52-30** | oggetti rifiutati e orfani rimossi per chiave, in questa fase | `scripts/purge-media-orphans.mjs:386` (un nome per chiamata), `purge-media-orphans.mjs:450` (`status = 'rejected'`), `purge-media-orphans.mjs:279` (in produzione la soglia in volo non scende sotto 60 min). **Laboratorio** 13:42:52Z: R 1/1 oggetto e riga, O 1/1, riconteggio da fonte diversa 0/0. **Produzione**, sotto `52-AUTHORISATION-MEDIA.md`: **R 0 · O 0 · in volo 0** (dry-run 18:42:45Z, apply 18:42:51Z, uscita 0, nessuna scrittura; seconda fonte PostgREST rejected 0) |
| **D-52-31** | tutte le foto pre-stripper ripassate dallo stripper | `scripts/restrip-event-media.mjs:651` (lo stesso `stripImageMetadata` del prodotto), `restrip-event-media.mjs:659` (`upsert: true` sullo stesso `storage_path`). **Laboratorio** 13:47:44Z: 1 foto, EXIF 354 → 0 byte, riga identica. **Produzione**, soglia `2026-09-23T18:29:09Z`: **P 0 foto ripassate · V 0 video non trattati** (dry-run 18:43:12Z, apply 18:43:19Z, uscita 0); riconteggio proprio alle 18:43:29Z: righe 0, pre-soglia 0 |

**Nessuna decisione e' stata contraddetta.** D-52-30 e D-52-31 sono **vere in
produzione per assenza di soggetto**, e lo si dice in questa forma: non c'e' una
foto rifiutata con oggetto, non c'e' un orfano, non c'e' una foto caricata prima
dello stripper.

> **Una divergenza dichiarata dal piano 52-16, non una contraddizione.** La riga
> di verifica automatica del task 3 di 52-16 chiedeva `spent: yes` nei blocchi
> concessi. **I due blocchi di `52-AUTHORISATION-MEDIA.md` sono rimasti
> `granted: yes · spent: no`** (righe 204-206 e 214-217 del documento): gli
> strumenti marcano `spent` **solo quando scrivono**, e a zero soggetti non hanno
> scritto. Portarlo a `yes` a mano avrebbe attestato una scrittura mai avvenuta.
> L'atto e' **esaurito per data** — `status: ESAURITA`, `exhausted:
> 2026-09-23T18:43:33Z`, e `granted_on: 2026-09-23` fa rifiutare (uscita 2)
> qualunque lancio con un altro `--dated`.

---

## Le procedure, con data ed esito (`52-ESITI.md`, `52-PROCEDURES.md`)

Percorse il 2026-09-23 fra le 16:13Z e le 17:15Z sul laboratorio, da **quattro
fonti in ordine di autorita'**: [1] il proprietario a mano sul suo iPhone (iOS
26.7), [2] lo stesso iPhone pilotato, [3] un iPhone simulato (iOS 27.0), [4]
Chrome headless. **Un passo passato solo in [4] non e' un esito da iPhone**, e
dove e' cosi' e' scritto.

| Procedura | Esito | Cosa non e' stato percorso |
|---|---|---|
| P-52-A la barra e il pannello | **passa** | `Escape` e i passi da tablet solo in [4]: nessun tablet vero |
| P-52-B il cancello della gallery | **passa** | — |
| P-52-C la striscia appesa | **passa** | tablet solo in [4]; modalita' standalone non osservata |
| P-52-D chip e cifra staff | **passa** | **passi 2 e 5**: il banco non li permette, non fabbricati |
| P-52-E la porta, radio accesa e spenta | **passa** | **passo 6**: scansione di un QR e annullamento da Recent |
| P-52-F la tastiera | **passa dopo la chiusura del difetto 1** | misura 4 atteso assente, osservato assente |
| P-52-G i media chiusi | immagini **passano** | **il video** (il banco non ne ha); **la sonda 7** (nessun caricamento nuovo) |

**I tre difetti trovati dalla corsa sono chiusi** prima della produzione: il
difetto 1 (Safari zooma al tocco su campi a 14 px — Critical per la porta) con i
campi a 16 px, misurato da 1,1436 a **1** sul simulatore e **1** sull'iPhone del
proprietario alle 18:27Z; il difetto 2 («Attendee» sulla pagina di uno staff)
con `ROLE_LABEL` esaustivo (`src/app/(members)/account/page.tsx:133`), osservato
alle 17:48:38Z; il difetto 3 («The write failed» su un indirizzo con il punto
finale) con la voce `address_refused`
(`src/app/(admin)/admin/members/CreateAccountForm.tsx:80`), osservato alle
17:49:27Z con zero account creati.

---

## I gate, dichiarati con il loro colore vero

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **exit 0**, 2026-09-23 ~18:50Z | e' il typecheck, **non** una prova di comportamento |
| `npm run verify` | **`VERIFY_OK — 24 gate(s) passed`**, exit 0, 18:52:18Z | 27 dichiarati: 24 eseguiti e verdi, 3 non eseguiti con la loro ragione (sotto) |
| `verify:persona` | **exit 0**, 7/7 | lanciato **dopo** le modifiche alla persona (1.26.0); caso peggiore `DoorSurface.tsx` 13.812 / 15.000 token |
| `verify:capabilities` | **exit 0, 5/5 contro la produzione**, 18:52:29Z | TS 16 · DB 16 · POLICY 12 · SRC 16 · GRANT 31. Il bersaglio e' stato provato **non** essere il laboratorio; l'etichetta «production» e' una stringa fissa dello script |
| `verify:media-strip`, `verify:routes`, `verify:venue-surfaces`, `verify:touch-targets`, `verify:conversion` e gli altri | **exit 0** | dentro i 24 |
| `verify:refusal --section=gallery` | **RIFIUTATO contro la produzione**, una corsa, 18:29:09Z | su 0 media il controllo positivo tace: **non e' un verde e non e' un difetto**. Sul laboratorio **exit 0** (14:29Z). Non rilanciato: conia sessioni su identita' reali, e l'atto che lo copriva e' esaurito |
| `verify:redirects`, `verify:ics` | **non lanciati** | il primo vuole un dev server; il secondo legge `docs/`, che esiste solo sulla macchina del proprietario |

---

## Anti-pattern trovati

Perimetro: i **46 file** di `src/`, `supabase/`, `scripts/` e `.claude/`
aggiunti o modificati dalla fase (`git diff --diff-filter=AM bececf6e..HEAD`),
piu' uno cancellato. Grep con **`/usr/bin/grep`**, mai `grep` nudo (difetto sui
file con byte NUL, registrato in memoria).

| Cercato | Trovato | Verdetto |
|---|---|---|
| `TODO`, `FIXME`, `XXX`, `HACK` | **1 riga**, `src/app/(members)/account/page.tsx:634` | **non e' un marcatore**: e' prosa al passato su cosa c'era nella sezione cancellata dalla fase 51 |
| `stub`, `mock`, `placeholder`, `coming soon` | solo attributi `placeholder=` di campi, e prosa su scheletri di caricamento e su segnaposto SQL degli script | **nessuno stub**. TASK spenta e' una decisione (D-52-03), non uno stub |
| `getPublicUrl` su `event-media` | **0** | resta sui tre bucket pubblici, e solo li' |
| superfici con dati finti | **0** | |
| **prosa stantia nel codice**, trovata rileggendo | `src/lib/media/finalize.ts:45` dice ancora che una destinazione e' `public = true` e leggibile senza sessione; `src/app/api/media/finalize/route.ts:31`, `route.ts:110-116` e `route.ts:163` parlano di «public bucket»; `src/lib/media/may-upload.ts:258-262` dice che il browser puo' ancora scrivere nel bucket pubblico finche' una migration di agosto non e' applicata (lo e', per effetto, su entrambi i progetti); `src/lib/capabilities/server.ts:203` e `src/lib/supabase/middleware.ts:351` nominano `getVisibleNavItems`, uscito con la fase 52 | **debito** (sotto): commenti che descrivono il prodotto di prima. Nessuno cambia un comportamento; tutti fanno ragionare su un bucket che non e' piu' pubblico |

**Nessun anti-pattern introdotto dalla fase che cambi un comportamento.**

---

## Il debito che questa fase lascia

| Voce | Dove, e con quali numeri | Chi la chiude |
|---|---|---|
| **Un secondo scrittore su `event-media` fuori dal perimetro del controllo A di `verify:media-strip`** | `scripts/restrip-event-media.mjs:659` riscrive oggetti del bucket con `upsert: true`. Il controllo A cammina solo `src/` (`scripts/verify-media-strip.mjs:538`, e la sua descrizione a `:149`), quindi **non lo vede**. **La ragione, ed e' una scelta dichiarata (P4.3 di 52-10):** lo script passa dallo **stesso** `stripImageMetadata` del prodotto (`restrip-event-media.mjs:651`), gira sul laboratorio per default, in produzione solo sotto un blocco d'atto che si consuma, e rifiuta la produzione senza atto (uscita 2). Il gate non lo nomina: se lo script cambiasse e smettesse di spogliare, **nessun controllo automatico se ne accorgerebbe** | una fase futura che estenda il controllo A a `scripts/`, o che ritiri lo script ora che non ha piu' soggetti |
| **Foto ripassate e video non trattati (D-52-31)** | produzione: **P 0 foto ripassate · V 0 video non trattati**; laboratorio: 1 foto, EXIF 354 → 0 byte | nessuno: zero soggetti. **Ma il video resta non spogliato per costruzione** su una serata non segreta (`route.ts:117-123`), da qui in avanti |
| **I numeri della rimozione (D-52-30)** | produzione: **R 0 · O 0 · in volo 0 · righe cancellate 0**; laboratorio: R 1 · O 1, residui 0/0 da fonte diversa | chiuso per assenza di soggetto |
| **Moderazione = rimozione, a meta'** | `deleteMedia` (`src/app/(public)/events/[slug]/actions.ts:319`) **non ha chiamanti** nell'interfaccia. Rifiutare cambia la **riga**: l'oggetto rifiutato resta nel bucket. Dopo M2 non lo raggiunge ne' l'anonimo ne' chi tiene solo `gallery.view`, ma **lo firmano ancora chi l'ha caricato e chi modera** | una fase che dia al moderatore un gesto che tolga l'oggetto; fino ad allora lo strumento di D-52-30 |
| **Il residuo della cache, con i tempi** | **produzione: zero per costruzione** — il bucket e' stato pubblico fino a M2 (18:29:08Z) e non ha mai contenuto un oggetto (0 alle 13:08:07Z, 0 alla guardia prima di M2, 0 alle 18:43:29Z, 0 alle 18:48:05Z). **La sonda anonima dopo la finestra non e' stata eseguita perche' non ha soggetto** (`52-ESITI.md`, 18:48Z). **L'unico residuo misurato e' del laboratorio**: un oggetto di serata segreta, gia' in cache, servito senza firma **62 minuti dopo M2** (15:29:47Z–15:31:00Z), oltre il `max-age=3600` — i byte spogliati, senza EXIF ne' GPS. **Il bordo della CDN non segue il `max-age` e chiudere il bucket non lo invalida.** Invalidazione: non decisa, non provata | aperto: vale per **la prossima volta** che un bucket pubblico con contenuto viene chiuso |
| **`venue-secrecy.md`: NAV-07 restringe, non cancella** | NAV-07 decide **chi** vede una foto — chi tiene `gallery.view` — non **cosa c'e' dentro**. Lo stripper toglie i metadati, non il fotogramma: **un'insegna resta un'insegna**, una facciata riconoscibile resta riconoscibile, e staff, organizer e master continuano a vedere le foto delle serate a sede segreta. Nessuna policy lo impedisce, ed e' giusto dirlo invece di lasciar credere che «gallery chiusa» voglia dire «sede protetta» | nessuna fase: e' un criterio di moderazione, non un confine tecnico |
| **Il login (D-52-28)** | scelta **`resta`**, registrata da chi coordinava la corsa a nome del proprietario, la cui risposta letterale era un requisito (*«non deve avvenire lo zoom»*); il requisito e' soddisfatto dai 16 px; `allinea` resta disponibile se un giorno «Sign In» risultasse coperto con il fuoco sulla password | il proprietario, se lo riapre |
| **Passi di procedura non percorsi (cinque)** | P-52-D 2 e 5; **P-52-E 6 — l'annullamento alla porta con un QR vero**; P-52-G il video; P-52-G la sonda 7. Il primo della porta e' quello che pesa: l'annullamento e' **identico nel codice** (`ScannerClient.tsx:3532`, una sola chiamata), ma e' stato spostato dentro Recent e **nessuno l'ha toccato** | la prossima corsa alla porta, sul laboratorio, con un telefono e un biglietto |
| **Tablet vero** | i passi da tablet (P-52-A 9-11, P-52-C 4) sono solo di Chrome a 1024 px | una corsa con un tablet |
| **La porta tace per i primi momenti senza rete** | l'avviso della guest list e il pallino di Alerts arrivano **~40 s** (Chrome) e **~2 minuti** (telefono) dopo lo spegnimento della radio: li accende il timeout del canale realtime, non la radio | una decisione di prodotto (`checkin-offline.md`) |
| **Divergenze temporanee dichiarate dai piani, ora chiuse** | tipo `url` nullable nello schema ma `string` nel tipo (52-06): **chiusa** da 52-13 (`src/types/database.ts`, `url: string | null`, `storage_path: string`); il ponte `getVisibleNavItems` (52-07): **tolto** nel task 2 dello stesso piano | — |
| **Divergenze che restano** | due **commenti** nominano ancora `getVisibleNavItems` (`server.ts:203`, `middleware.ts:351`); la prosa sul «public bucket» nei file di `finalize` e in `may-upload.ts` (sopra); il messaggio del controllo 4 di `verify-capabilities.mjs` conta ancora «of the seventeen keys» (segnalato da 52-06) | **fase 57**, la ricognizione lessicale |
| **Un UDID di simulatore pubblicato** | scritto nel testo di `52-19-PLAN.md` dal commit di pianificazione e spinto con il resto: **non e' un id di database, di persona o di serata ne' una credenziale**, identifica un dispositivo virtuale. Non riscritto nella storia | nessuno: dichiarato |

---

## Cio' che nessuna di queste prove puo' dire

- **Che la gallery in produzione neghi una riga approvata a un `attendee`.** La
  produzione ha **zero** media: la prova e' quella del laboratorio (stesse
  migration, stesso codice) piu' la rilettura del catalogo di produzione.
- **Che nessuno abbia copiato un oggetto mentre il bucket era pubblico.** In
  produzione non c'era nulla da copiare; sul laboratorio sì, ed e' materiale
  sintetico.
- **Che la porta annulli un ingresso da Recent su un telefono vero.** Non e'
  stato fatto.
- **Nulla sulla correttezza della persona.** `verify:persona` verifica la
  **coerenza**; che `media-and-storage.md` e `access-gating.md` dicano il vero lo
  garantisce la rilettura del codice fatta riga per riga il 2026-09-23 (1.26.0),
  non lo script.

## Il conto delle scritture in produzione

Sotto **due atti datati**, entrambi ESAURITI:
- `52-AUTHORISATION.md` («tutto», riapprovato alle 18:25Z): **due migration**
  (M1 18:26:37Z, M2 18:29:08Z) e **un deploy** (`f671144b`, READY 18:28:33Z).
  Nessuna riga di dati toccata: 0 media prima e dopo; concessioni 28 → 31, sul
  catalogo dei permessi.
- `52-AUTHORISATION-MEDIA.md` («entrambe», 18:42:23Z): **zero scritture**, zero
  istantanee, a zero soggetti.

**Righe di dati cancellate in produzione dalla fase: ZERO.**

## Le istantanee locali

Nella radice del repo stanno **15 file** d'istantanea, **tutti del laboratorio**
(piani 52-09 e 52-10), ignorati da git: tre `.env.media-purge-snapshot.*.json`
(soli metadati) e sei directory `.env.restrip-snapshot.*` (ciascuna con
`0001.bin` e `index.json` — la foto sintetica del banco, colore pieno, GPS in
mare aperto, nessuna persona).

**Cancellate il 2026-09-23 alle 19:13:29Z**, per decisione del proprietario al
checkpoint del piano 52-17 — risposta letterale: **`approvata`**.

Prima della cancellazione: **9 voci, 15 file**, ciascuna `git check-ignore`
= ignorata, e **nessuna** istantanea mai tracciata
(`git ls-files | grep -cE '^\.env\.(media-purge|restrip)-snapshot'` = 0; l'unico
`.env.*` tracciato e' `.env.local.example`, il modello della fase 17, che non e'
un'istantanea). Cancellate **per nome**, un `rm` (o `rm -r`) esplicito per voce,
nessun glob:

- `.env.media-purge-snapshot.2026-09-23T13-42-17-219Z.json`
- `.env.media-purge-snapshot.2026-09-23T13-42-33-895Z.json`
- `.env.media-purge-snapshot.2026-09-23T13-42-49-908Z.json`
- `.env.restrip-snapshot.2026-09-23T13-43-56-370Z/`
- `.env.restrip-snapshot.2026-09-23T13-44-26-994Z/`
- `.env.restrip-snapshot.2026-09-23T13-46-41-494Z/`
- `.env.restrip-snapshot.2026-09-23T13-46-48-699Z/`
- `.env.restrip-snapshot.2026-09-23T13-47-44-018Z/`
- `.env.restrip-snapshot.2026-09-23T13-47-55-626Z/`

**Rilettura dopo:** `ls -d .env.media-purge-snapshot.* .env.restrip-snapshot.*`
→ *no matches found*; `ls -d` sui singoli nomi → *No such file or directory*.
`.env.local`, `.env.lab.local` e `.env.lab.seed.json` **intatti** (stesse
dimensioni e date di prima). Le sei `.env.attendances-snapshot.*` della fase 51
**non sono state toccate**: non erano nel perimetro di questa risposta.

## Stato, per requisito

| Requisito | Stato | Cosa resta |
|---|---|---|
| **NAV-01** | **CHIUSO** | tablet solo in Chrome |
| **NAV-02** | **CHIUSO** | nulla |
| **NAV-03** | **CHIUSO** | nulla |
| **NAV-04** | **CHIUSO** | standalone non osservato |
| **NAV-05** | **CHIUSO** | nulla |
| **NAV-06** | **CHIUSO** | P-52-D passi 2 e 5 non percorsi |
| **NAV-07** | **CHIUSO in produzione** | `verify:refusal` RIFIUTATO su 0 media; video e sonda 7 non percorsi; residuo di cache zero per costruzione, misurato oltre il `max-age` solo sul laboratorio; `deleteMedia` senza chiamanti |

**Stato di fase: `passed`** — approvata dal proprietario il 2026-09-23
(`approvata`, 19:13:29Z), istantanee locali cancellate alla stessa ora.
