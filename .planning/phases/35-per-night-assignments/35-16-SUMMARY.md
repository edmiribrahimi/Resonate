---
phase: 35-per-night-assignments
plan: 16
subsystem: access-gating
tags: [media-upload, per-night, capability, server-action, wave-6]

# Dependency graph
requires:
  - plan: 35-03
    provides: "la chiave `media.upload`, coniata dalla domanda che risponde e finora senza nessun lettore"
  - plan: 35-07
    provides: "`hasCapability(key, { partyId })` e `getPartyAccessContext(partyId)` — la risoluzione per-notte, e la regola che ogni fallimento lancia"
  - plan: 35-18
    provides: "`public.event_media.party_id`, il trigger che rifiuta una riga senza serata, e `private.party_event_id` — cioe' cio' che rende esprimibile «a QUELLA notte»"
  - plan: 35-19
    provides: "`stripImageMetadata`, cosi' che il braccio allargato non possa esistere prima della spoglia"
provides:
  - "`mayUploadToParty(eventId, partyId)` — l'unica definizione del permesso di caricamento, importabile da una Server Action e da una Route Handler senza diventare un endpoint"
  - "`media.upload` con un consumatore raggiungibile: la chiave smette di essere una voce di catalogo"
  - "`registerMedia` con un controllo — prima non ne aveva nessuno oltre `auth.getUser()`"
  - "l'insert che porta `party_id`: il primo scrittore del prodotto che nomina la serata"
  - "tre costanti di categoria esportate: `MEDIA_PARTY_NOT_OF_EVENT`, `MEDIA_NIGHT_REQUIRED`, `MEDIA_UPLOAD_FORBIDDEN`"
  - "il gate `staff.manage` lato server sulla pagina di moderazione dei media"
affects: [35-20, 35-21, 35-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un predicato d'accesso condiviso non vive in un file `\"use server\"`: ogni export di quel file e' un endpoint pubblico, quindi esportarlo per riusarlo pubblica un oracolo"
    - "un controllo applicativo che legge una tabella con i privilegi del chiamante non puo' essere un gate: puo' solo essere un MESSAGGIO — e' la trappola del piano 35-18 sull'altro lato del filo"
    - "il tipo di un parametro di Server Action non e' un confine: il client manda cio' che vuole, quindi l'assenza va rifiutata a runtime sotto qualunque firma"
    - "una firma che rompe il build di un file posseduto da un altro piano non e' un cambio di firma: e' un albero rosso consegnato alla wave successiva"
    - "`import \"server-only\"` si risolve senza installare niente: Next lo aliasa su `next/dist/compiled/server-only`"

key-files:
  created:
    - src/lib/media/may-upload.ts
  modified:
    - src/app/(public)/events/[slug]/actions.ts
    - src/app/(organizer)/organizer/events/[id]/media/page.tsx

key-decisions:
  - "`partyId` e' un parametro TRAILING e OPZIONALE sulle due Server Action, non il secondo parametro obbligatorio che il piano chiede. Ragione misurata: l'unico chiamante odierno e' `MediaUpload.tsx`, riscritto dal piano 35-21 che sta DUE wave piu' avanti; un parametro obbligatorio ora e' un `TS2554` su quel file e un `npm run build` rosso consegnato alla wave 7. L'opzionalita' non costa niente al gate — entrambe le azioni rifiutano una serata assente a runtime con `MEDIA_NIGHT_REQUIRED`, e nessun ramo la tollera"
  - "Il controllo di coerenza (evento, serata) e' un DIAGNOSTICO e non un gate. Legge `public.event_parties` con i privilegi del chiamante, quindi attraverso `event_parties_select_published`: trattare «nessuna riga» come «non e' di questo evento» ammetterebbe un organizer e rifiuterebbe un member SULLA STESSA COPPIA. E' esattamente il difetto che il piano 35-18 ha misurato dentro la policy e sostituito con `private.party_event_id`; ripeterlo un livello sopra sarebbe lo stesso errore con un messaggio piu' bello. Una discordanza visibile rifiuta; una serata non visibile passa al database"
  - "La meta' di stato del braccio della presenza chiede `membership.active` invece di leggere `profiles.status`. L'equivalenza e' esatta e misurata su QUATTRO righe — `master`, `organizer`, `member` (`20260807000000:403-405`) e `staff` (`20260808000500:136`), tutte con `requires_approved = true` — cioe' ogni ruolo che esiste. E `server.ts:210-212` non ammette eccezioni: nessun nuovo chiamante ramifica su `role` o `status`"
  - "I tre bracci sono valutati 1 · assegnazione · presenza, e non nell'ordine 1 · presenza · assegnazione del piano. L'ordine di un OR non e' il suo significato: i bracci 1 e 3 sono due `.has()` su un Set gia' in memoria, la presenza e' l'unico che costa un round trip. Leggerla per seconda addebiterebbe quel costo al fotografo assegnato — la persona che questo piano esiste per ammettere — a ogni caricamento"
  - "La query della presenza e' spostata, non modificata: resta parola per parola, difetto compreso, con sopra il paragrafo che dice che oggi rifiuta sempre e che correggerla e' un ALLARGAMENTO d'accesso"

# Metrics
metrics:
  duration: "~50 min"
  completed: 2026-08-09
  tasks_completed: 2
  tasks_total: 2
  checkpoint_open: false
---

# Fase 35 Piano 16: `media.upload` acquista un lettore, e il lettore guarda una notte sola — Summary

La chiave esisteva dal piano 35-03 e non la leggeva nessuno. Assegnare qualcuno
come «photo» scriveva una riga, registrava un atto e **non sbloccava nessuno
strumento**: una decorazione che fa sembrare sorvegliata una cosa che non lo e'.
Questo piano le da' due consumatori — quello che valida **e quello che scrive** —
e li circoscrive alla serata.

**Nessuna migration e' toccata: il piano e' interamente applicativo.** Nessuna
delle migration di questa fase e' applicata in produzione, quindi niente qui e'
stato esercitato contro un database: le prove sono `npm run build`, la lettura
dei file citati e i conteggi riportati sotto.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | Un solo predicato, sulla notte, letto da chi valida e da chi scrive | `c2d4ea8` | `src/lib/media/may-upload.ts` (nuovo) + `src/app/(public)/events/[slug]/actions.ts` |
| 2 | La pagina di moderazione smette di reggersi sul middleware | `529efbe` | `src/app/(organizer)/organizer/events/[id]/media/page.tsx` |

**Lingua.** I commenti del codice sono in inglese, come l'intera famiglia di file
che toccano (`actions.ts`, `server.ts`, `guards.ts`, `strip-metadata.ts`). La
prosa di questo documento e i messaggi di commit sono in italiano.

---

## Task 1 — il predicato, e le due meta' che lo rendono un gate

### La forma

`mayUploadToParty(eventId: string, partyId: string): Promise<boolean>` in
`src/lib/media/may-upload.ts`, un **modulo normale**. Non un export di
`actions.ts`: un file `"use server"` pubblica ogni export come endpoint, quindi
lasciarlo li' e poi esportarlo perche' la rotta del piano 35-20 lo riusi
significherebbe **pubblicare un oracolo** che risponde *«questa persona puo'
caricare su questa notte?»* a chiunque lo chiami.

Tre bracci in OR, e nessun ciclo sulle serate: la riga ora sa a quale notte
appartiene, quindi la ragione per cui il ciclo esisteva e' sparita con lui.

| Braccio | Predicato | Da dove viene |
|---|---|---|
| 1 | `staff.manage` | sostituisce il test di ruolo scritto a mano; equivalenza riprodotta per esteso, non per rimando |
| 3 | `media.upload` **sulla notte** | `getPartyAccessContext(partyId)` — una sola risoluzione |
| 2 | presenza registrata | invariata parola per parola, con il difetto misurato scritto sopra |

**Una sola risoluzione per entrambi i bracci di capability.** `cache()` non
memoizza dentro una Server Action (misurato, ricerca della fase 33,
`server.ts:105-121`) e i due chiamanti sono Server Action: due `hasCapability()`
sarebbero due round trip per caricamento. `getPartyAccessContext` restituisce
l'**unione** di cio' che il ruolo concede e di cio' che l'assegnazione viva su
quella notte concede, quindi una chiamata basta.

E `staff.manage` non e' un mestiere assegnabile — un'assegnazione puo' portare
solo `door.operate`, `door.supervise`, `media.upload`, `party.manage`
(`20260809000000_party_assignments.sql:340-342`) — quindi la sua presenza in
quell'unione viene dal braccio del ruolo e da nessun altro posto.

### Le tre cose che il file NON fa, ognuna con la sua ragione scritta

- **Nessun ciclo su `event_parties`.** Chi ne reintroduce uno sta riaprendo il
  permesso per-evento. Asserito: `grep -cE 'for .*event_parties|\.map\(.*part'` = **0**.
- **Nessuna riscrittura della regola di vitalita'.** La domanda *«e' viva?»* ha
  una sola definizione, dentro `private.has_capability`. I due nomi di colonna
  che la compongono **non compaiono in nessuno dei tre file**: `grep -cE
  'revoked_at|ends_at'` = **0** su `actions.ts` e **0** su `may-upload.ts`.
- **Nessuna firma in cui la notte manchi.** Il predicato prende un `partyId`
  obbligatorio. E' l'altra meta' della regola che il piano 35-18 ha scritto nel
  database: li' nessuna riga nuova puo' non portare la serata, qui nessuna
  domanda puo' non nominarla.

### La meta' che conta: `registerMedia`

Prima di questo commit `registerMedia` **non portava nessun controllo oltre
`auth.getUser()`**, e l'unica cosa che la copriva era
`event_media_insert_member`, che ammette ogni account con `membership.active` —
**`staff` compreso**, perche' D-14 gli concede quella chiave
(`20260808000500_staff_role.sql:136`). Senza questa meta' il braccio nuovo non
avrebbe concesso niente che non fosse gia' concesso, e il gate dell'altra azione
sarebbe stato aggirabile chiamando direttamente questa.

**E' un restringimento su un percorso che non controllava nulla.** E' la regola
che `media-and-storage.md` gia' dichiara (gate *chi carica ha titolo*), applicata
dove si scrive la riga — ma e' un cambio di comportamento, e va detto invece che
scoperto.

L'insert porta `party_id`. Senza, il trigger `event_media_require_party` rifiuta
con `23514` **anche sulla connessione privilegiata**: e' la rete sotto il codice,
non il posto dove la regola vive.

---

## Task 2 — la pagina di moderazione

Fino a questo commit l'unico controllo era `if (!user) redirect("/login")`, e il
resto era delegato alla regola `organizer.access` del middleware — cioe' proprio
la regola che **il piano 35-17 sta allargando in questa stessa wave**. Una pagina
che si regge su di essa e' una pagina il cui confine si sposta quando si sposta
il middleware.

Ora: `getAccessContext()`, `/login` se non c'e' nessuno, `/dashboard` se manca
`CAP.STAFF_MANAGE`. Due cause, mai collassate.

**Perche' `staff.manage`:** e' cio' che `updateMediaStatus` e `deleteMedia` — le
due azioni che questa pagina invoca — gia' pretendono. Un gate di pagina con un
predicato diverso renderebbe una schermata in cui ogni bottone rifiuta, che e' un
modo di fallire peggiore del rifiuto perche' sembra un guasto. **Non
`media.upload`**: caricare e moderare sono due domande, e una chiave si nomina
dalla domanda che risponde. **Non `organizer.access`**: e' la regola del
middleware.

**Nessun'altra modifica.** Nessuna query toccata (`git diff | grep -c '^-.*\.from('`
= **0**), nessun filtro per serata aggiunto (`grep -c 'party_id'` = **0**):
ora che una riga di media porta la sua notte, filtrare la revisione per notte
cambierebbe **cosa un organizer vede**, che non e' un confine e non e' in nessuno
degli otto requisiti. Letto con `venue-secrecy.md` in mano — questa pagina mostra
file scattati dentro la sede di una serata — la risposta e' che qui **restringe e
basta**.

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] `partyId` e' trailing e opzionale sulle due azioni

- **Il fatto:** il piano chiede
  `registerMedia(eventId, partyId, storagePath, type, fileSize)`. L'unico
  chiamante di entrambe le azioni e' `src/components/media/MediaUpload.tsx:135,169`,
  che e' nei `files_modified` del **piano 35-21, wave 8** — due wave dopo questa.
  Un parametro obbligatorio aggiunto ora e' un errore di arita' su quel file,
  quindi `npm run build` rosso, quindi un albero rosso consegnato ai piani della
  wave 7 (`35-20`, `35-22`) per un guasto che non e' loro.
- **Cosa e' stato fatto:** `partyId?: string` in coda su entrambe, e **il rifiuto
  a runtime prima di ogni domanda di permesso**: `if (!partyId) throw new
  Error(MEDIA_NIGHT_REQUIRED)`.
- **Perche' non costa niente al gate:** il tipo di un parametro di Server Action
  **non e' un confine** — il client manda cio' che vuole sul filo, quindi
  l'assenza andava rifiutata a runtime sotto qualunque firma. Non esiste nessun
  ramo che tolleri una serata assente: tollerarla renderebbe l'intero gate
  aggirabile omettendo un argomento.
- **La conseguenza, dichiarata invece che scoperta:** da questo commit fino al
  piano 35-21, `MediaUpload.tsx` non nomina nessuna notte, quindi **ogni
  caricamento rifiuta — organizer e master compresi**. Oggi quello e' l'unico
  percorso di caricamento funzionante, quindi e' una regressione reale,
  temporanea e interna alla fase. E' la direzione fail-closed, non raggiunge la
  produzione da sola (la fase si deploya come un blocco), e rispecchia cio' che
  fara' comunque il database: `20260809004500` rifiuta con `23514` una riga senza
  serata.
- **Cosa deve il piano 35-21:** passare la notte da `MediaGallerySection` a
  `MediaUpload`, **poi** spostare `partyId` nella posizione che il piano nomina e
  renderlo obbligatorio. Il primo pezzo e' gia' asserito meccanicamente dai suoi
  criteri (`grep -q 'partyId' MediaUpload.tsx`); il secondo e' scritto nel
  docblock di `actions.ts`, che e' il posto dove chi lo tocchera' arrivera'.
- **Commit:** `c2d4ea8`

### 2. [Rule 3 — criterio non soddisfacibile] `from("attendance")` in `actions.ts`

- **Il fatto:** il criterio `test "$(grep -c 'from("attendance")' "$F")" = "1"`,
  con `$F` = `actions.ts`, **e' incompatibile con l'estrazione che lo stesso
  piano richiede**. Se il braccio della presenza vive dentro `mayUploadToParty` —
  e il piano lo elenca come braccio 2 del predicato — allora `actions.ts` non lo
  contiene piu'. Tenerlo in entrambi i posti sarebbe la duplicazione che il piano
  esiste per abolire.
- **Cosa e' stato fatto:** risolto a favore dell'**intento** — la query esiste
  **una volta sola** e non e' cambiata. Misurato:
  `grep -c 'from("attendance")'` = **1** in `may-upload.ts`, **0** in
  `actions.ts`. Le sei righe sono identiche all'originale salvo la sorgente
  dell'identita' (`ctx.userId` invece di `user.id`, lo stesso valore senza un
  secondo round trip).
- **Commit:** `c2d4ea8`

### 3. [Rule 2 — una regola scritta del repository] la meta' di stato del braccio 2

- **Il fatto:** il braccio della presenza chiedeva `profile.status !==
  "approved"` da un `select("role, status")` su `profiles`. Mantenerlo cosi'
  sarebbe stato un **nuovo chiamante che ramifica su `status`**, che
  `server.ts:210-212` vieta senza eccezioni: *«No new caller may branch on `role`
  or `status`. Every decision asks `capabilities`.»*
- **Cosa e' stato fatto:** `ctx.capabilities.has(CAP.MEMBERSHIP_ACTIVE)`.
  L'equivalenza e' **esatta e misurata**, non approssimata: `membership.active` e'
  concessa a `master`, `organizer`, `member`
  (`20260807000000_capability_model.sql:403-405`) e `staff`
  (`20260808000500_staff_role.sql:136`) — **ogni ruolo che esiste** — con
  `requires_approved = true` su tutte e quattro le righe. Risolve a
  `status = 'approved'` e a nient'altro, per ogni account che puo' esistere. E
  costa zero round trip: il Set e' gia' risolto.
- **Cosa NON e' cambiato:** la query di `attendance`, cioe' la meta' del braccio
  che decide davvero chi entra oggi.
- **Commit:** `c2d4ea8`

### 4. [Rule 1 — la trappola del piano 35-18, sull'altro lato del filo] il controllo di coerenza

- **Il fatto:** il piano chiede di verificare, **prima di ogni braccio**, che
  quella serata appartenga a quell'evento leggendo `public.event_parties`. Quella
  lettura, fatta dall'applicazione, gira con i privilegi del chiamante e vede la
  tabella attraverso `event_parties_select_published`
  (`20260225150000_party_architecture.sql:30-37`): un member vede solo le serate
  di eventi **pubblicati**, `staff.manage` le vede tutte. Trattare «nessuna riga»
  come «non e' di questo evento» avrebbe **ammesso un organizer e rifiutato un
  member sulla stessa identica coppia** — un controllo sulla forma della riga
  trasformato in un controllo su chi la scrive. E' il difetto che il piano 35-18
  ha misurato dentro il corpo della policy (`member` → `42501`, `master` →
  `ok:1`) e sostituito con `private.party_event_id`.
- **Cosa e' stato fatto:** il controllo e' un **diagnostico, non un gate**. Una
  discordanza **visibile** rifiuta con la sua categoria
  (`media.party_not_of_event`); una serata **non visibile** non decide niente e
  passa al database, che risponde con `private.party_event_id`, `SECURITY
  DEFINER`, e non dipende da cio' che il soggetto controllato ha diritto di
  leggere. Un errore di lettura e' loggato con categoria e non collassato in un
  rifiuto.
- **Perche' questo non e' un fail-open:** il ramo puo' solo **rifiutare piu'
  chiaramente**, mai ammettere di piu'. Cio' che «passa» passa ai bracci di
  permesso e poi alla `WITH CHECK`, che rifiuta comunque una coppia incoerente.
  La sicurezza resta la policy; questo e' il messaggio, esattamente come il piano
  dice.
- **Commit:** `c2d4ea8`

### 5. [ordine di valutazione] i bracci sono letti 1 · 3 · 2

- Il piano li elenca 1 · presenza · assegnazione. **L'ordine di un OR non e' il
  suo significato**, e il verdetto e' identico. I bracci 1 e 3 sono due `.has()`
  su un Set gia' in memoria; la presenza e' l'unico che costa un round trip.
  Leggerla per seconda avrebbe addebitato quel round trip al fotografo assegnato
  — la persona che questo piano esiste per ammettere — a ogni caricamento. La
  numerazione del piano e' conservata nei commenti, cosi' che chi confronta i due
  documenti trovi la corrispondenza.
- **Commit:** `c2d4ea8`

### 6. [constatazione] `import "server-only"` non richiede nessun pacchetto

- `src/lib/capabilities/server.ts:13-19` scrive che *«`server-only` non e' una
  dipendenza di questo repository e aggiungere un pacchetto e' fuori da questo
  piano»*. **E' vero di `package.json` e non del risolutore:** Next lo aliasa su
  `next/dist/compiled/server-only`, e il piano 35-19 lo importa gia' come prima
  riga di `strip-metadata.ts` con il build verde. **Nessun pacchetto e' stato
  installato** per questo piano: `package.json` non e' fra i file modificati.
- **Commit:** `c2d4ea8`

### 7. [Rule 3 — ambiente] il worktree non aveva `node_modules`

Un symlink al `node_modules` del repository principale. `/node_modules` e' in
`.gitignore:4`: nessuna modifica al repository, `git status` resta pulito.

---

## Verifiche eseguite

| Verifica | Comando / misura | Esito |
|---|---|---|
| Typecheck e build | `npm run build` | **PASS** — `✓ Compiled successfully` |
| Build **prima** di toccare qualsiasi cosa | `npm run build` su `fb49574` | **PASS** — cosi' il verde di dopo e' una differenza e non una coincidenza |
| Il modulo e' server-only | `head -3 may-upload.ts \| grep -c 'server-only'` | **PASS** — 1 |
| La chiave e' letta | `grep -c 'CAP.MEDIA_UPLOAD' may-upload.ts` | **PASS** — 1 |
| Entrambe le azioni leggono il predicato | `grep -c 'mayUploadToParty' actions.ts` | **PASS** — **4** (≥ 3: import + due chiamate + il docblock) |
| Il nome vecchio e' sparito | `grep -c 'mayUploadToEvent' actions.ts` | **PASS** — 0 |
| La riga porta la serata | `grep -c 'party_id' actions.ts` | **PASS** — 2 |
| Nessun test di ruolo scritto a mano | `grep -cE 'role === .(organizer\|master).' actions.ts` | **PASS** — 0 |
| La vitalita' non e' riscritta | `grep -cE 'revoked_at\|ends_at'` su entrambi i file | **PASS** — 0 e 0 |
| Nessun ciclo sulle serate | `grep -cE 'for .*event_parties\|\.map\(.*part' may-upload.ts` | **PASS** — 0 |
| **Il braccio della presenza esiste una volta sola** | `grep -c 'from("attendance")'` | **PASS con deviazione 2** — **1** in `may-upload.ts`, **0** in `actions.ts` |
| Il gate della pagina | `grep -c 'STAFF_MANAGE'` / `getAccessContext` | **PASS** — 2 e 3 |
| Nessuna query della pagina toccata | `git diff -- page.tsx \| grep -c '^-.*\.from('` | **PASS** — **0** |
| Nessun filtro per serata sulla pagina | `grep -c 'party_id' page.tsx` | **PASS** — **0** |
| Cache dichiarata | `grep -c 'force-dynamic' page.tsx` | **PASS** — 1 |
| Nessuna migration toccata | `git diff --name-only fb49574 HEAD` | **PASS** — tre file, tutti sotto `src/` |
| I file sono esattamente quelli del piano | idem | **PASS** — i tre `files_modified`, nessun altro |
| Nessun file cancellato | `git diff --diff-filter=D --name-only HEAD~1 HEAD` | **PASS** — nessuno |
| Nessun file non tracciato | `git status --short \| grep '^??'` | **PASS** — 0 |
| `STATE.md` / `ROADMAP.md` / `deferred-items.md` | non compaiono nel diff | **PASS** — non modificati |

> Il piano dichiara nella sua sezione `<verification>` *«esattamente i **due**
> file di questo piano»*, mentre il suo stesso frontmatter ne elenca **tre**. I
> file modificati sono tre e sono esattamente i tre di `files_modified`: la
> divergenza e' nel testo del piano, non nel lavoro.

### Cosa queste verifiche NON provano

- **Nessuna migration di questa fase e' applicata in produzione**, e nessuna e'
  toccata qui. Che `event_media.party_id` esista e' un file, non uno stato del
  database: **applicare `20260809004500` prima del deploy che contiene questo
  commit rompe il caricamento con un `23514`.** L'ordine sta scritto in testa a
  quella migration.
- **Un `npm run build` verde non dice niente su una query.** Nessun client
  Supabase di questo repository e' parametrizzato con un generico `Database`
  (`server.ts:7`), quindi il compilatore non ha mai visto `party_id`. Che l'insert
  lo mandi lo dimostra il database rifiutando, non il build.
- **Nessuna prova di runtime e' stata eseguita**: nessun container, nessuna sonda
  RLS, nessuna cattura di baseline. Questo piano non tocca ne' policy ne' schema,
  quindi non muove nessuna cella delle matrici — ma non l'ho **misurato**, l'ho
  dedotto dal fatto che il diff sta tutto sotto `src/`.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.**
- **Non e' stato osservato end-to-end che un'assegnazione «photo» sblocchi un
  caricamento.** Quella prova richiede il database con le migration applicate e
  il chiamante del piano 35-21: e' materia di `35-HUMAN-UAT.md`, non di questo
  worktree.

### Procedura manuale, per quando la coda sara' applicata

Serve perche' questo tocca l'accesso e il repository non ha test. Con
`20260809000000`, `20260809001000` e `20260809004500` applicate, e con i piani
35-20/35-21 in deploy:

1. Con un account `staff` **assegnato come «photo» alla notte A** di un evento
   con almeno due notti: caricare un file **sulla notte A** → la riga entra, con
   `party_id` = A.
2. Lo stesso account, **stesso evento, notte B** → rifiuto. E' il Criterio di
   Successo 1 della ROADMAP (*«nothing changes for them on any other night»*).
3. Revocare l'assegnazione, ripetere il passo 1 → rifiuto alla richiesta
   **successiva** (la risoluzione e' per-richiesta, non per-token).
4. Con un account `member` `approved` **senza assegnazione** → rifiuto, e il
   rifiuto viene dal braccio della presenza che oggi rifiuta sempre.
5. Passare a `registerMedia` un `partyId` di **un altro evento** → rifiuto con
   `media.party_not_of_event`, oppure — se quell'evento non e' pubblicato e chi
   chiama e' un member — `42501` dalla policy. **Entrambi gli esiti sono
   corretti**, e la differenza fra i due e' la deviazione 4.
6. Con un account `member` `approved`, aprire
   `/organizer/events/<id>/media` → `/dashboard`.

---

## Constatazioni fra piani (nessun file fuori dai miei `files_modified` e' stato toccato)

1. **Il piano 35-21 eredita due obblighi, non uno.** Passare la notte a
   `MediaUpload` (gia' asserito dai suoi grep) **e** rendere `partyId`
   obbligatorio nella posizione che il piano 35-16 nomina. Il secondo non e'
   asserito da nessun controllo automatico: sta nel docblock di `actions.ts`.
2. **Il piano 35-20 importa `mayUploadToParty` e non lo riscrive.** Il file e'
   `src/lib/media/may-upload.ts`, esporta anche le tre costanti di categoria, ed
   e' un modulo normale proprio perche' una Route Handler possa importarlo senza
   che nessuno diventi una porta in piu'. Attenzione: il predicato **lancia** per
   `party.invalid_id`, `capabilities.resolve_failed: <code>` e
   `media.party_not_of_event`, e restituisce `false` solo per un rifiuto di
   permesso. Una rotta che le collassasse in un unico 403 rifarebbe il difetto
   del newsletter.
3. **Fra questa wave e la wave 8 il caricamento media rifiuta per tutti.** Se la
   fase venisse interrotta prima del piano 35-21, il prodotto spedirebbe un
   caricamento non funzionante per organizer e master. E' la direzione sicura, ma
   e' una condizione da conoscere prima di decidere di fermarsi.
4. **`registerMedia` puo' ancora fallire dopo che i byte sono nel bucket
   pubblico.** Il rifiuto nuovo arriva **dopo** che `MediaUpload.tsx` ha scritto
   il file, quindi un caricamento rifiutato lascia un oggetto orfano in un bucket
   pubblico con path derivabile. **Difetto preesistente**, non introdotto qui —
   ma questo commit lo rende raggiungibile molto piu' spesso, perche' ora
   `registerMedia` puo' rifiutare. Lo chiudono i piani 35-20/35-21 spostando la
   scrittura nel bucket di quarantena; finche' non atterrano, e' un fatto da
   conoscere.
5. **La pagina di moderazione e il piano 35-17 si toccano.** 35-17 allarga il
   gate grossolano su `/organizer/*`; da questo commit questa pagina non dipende
   piu' da quel gate. Se 35-17 dovesse restringerlo, questa pagina resta comunque
   raggiungibile da chi tiene `staff.manage`, che e' l'intenzione.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte. **Tutte le prove
sono statiche** — lettura dei file e conteggi — perche' questo piano non tocca il
database e nessuna migration di questa fase e' applicata.

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-78 | mitigato | `CAP.MEDIA_UPLOAD` letto in `may-upload.ts`, importato da entrambe le azioni (`grep` = 4). Una situazione raggiungibile lo fa fallire: nessuna assegnazione ⇒ i tre bracci rispondono no ⇒ rifiuto |
| T-35-79 | mitigato | Lo stesso predicato dentro `registerMedia`, che prima non controllava nulla. La sola RLS ammette ogni `membership.active`, `staff` incluso (D-14) |
| T-35-80 | mitigato | `partyId` obbligatorio nel predicato, una sola risoluzione su quella notte, nessun ciclo sulle serate (`grep` = 0) |
| T-35-81 | mitigato | Zero occorrenze di `revoked_at`/`ends_at` in **entrambi** i file nuovi: la definizione resta nel resolver |
| T-35-82 | mitigato | `staff.manage` lato server sulla pagina di moderazione, allineato alle due azioni che invoca |
| T-35-83 | **parzialmente coperto, e la parte scoperta e' nominata** | La spoglia esiste (35-19) e vive nella rotta 35-20; **finche' `20260809006000` non e' applicata il browser puo' scrivere dritto nel bucket pubblico e aggirarla** (la porta e' `20260225120000_phase7_media.sql:70-75`), e **il video non e' spogliato da niente**. Le tre frasi stanno **dentro** `may-upload.ts`, accanto al braccio nuovo |
| T-35-106 | mitigato | Il predicato verifica la coerenza prima dei bracci e restituisce una categoria propria — con il limite della deviazione 4 scritto accanto. La `WITH CHECK` rifiuta comunque |
| T-35-107 | mitigato | Il fatto misurato e' scritto sopra il braccio, con le citazioni `file:riga`, e la query e' invariata (`grep` = 1, una sola volta, in un solo file) |

### Una superficie non prevista dal piano

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: orphaned-object | `src/app/(public)/events/[slug]/actions.ts` | Il rifiuto nuovo in `registerMedia` arriva **dopo** che il client ha gia' scritto i byte nel bucket **pubblico** `event-media`. Un caricamento rifiutato lascia quindi un oggetto raggiungibile con path derivabile (`${eventId}/${userId}/${timestamp}-${i}.${ext}`) e nessuna riga che lo governi — quindi nessuna moderazione e nessuna cancellazione possibile dal prodotto. Preesistente, ma questo commit rende il rifiuto molto piu' frequente. Chiuso dai piani 35-20/35-21 (quarantena); fino ad allora e' una fuga possibile per un file scattato dentro una sede segreta |

---

## Known Stubs

Nessuno stub di codice: nessun valore vuoto codificato a mano, nessun
segnaposto, nessun `TODO`, nessun `FIXME`.

Una dipendenza in avanti, dichiarata e non lasciata a valle: **`partyId` e'
opzionale sulle due Server Action, e deve diventare obbligatorio nel piano
35-21.** Non e' uno stub — il rifiuto a runtime e' completo e non aggirabile — ma
e' una firma provvisoria, e la ragione e la riparazione stanno scritte nel
docblock del file oltre che nella deviazione 1.

---

## Self-Check: PASSED

- `src/lib/media/may-upload.ts` — FOUND (15.353 byte)
- `src/app/(public)/events/[slug]/actions.ts` — FOUND, modificato
- `src/app/(organizer)/organizer/events/[id]/media/page.tsx` — FOUND, modificato
- commit `c2d4ea8` — FOUND
- commit `529efbe` — FOUND
- `npm run build` — verde all'HEAD di questo worktree
- `.planning/STATE.md`, `.planning/ROADMAP.md` e `deferred-items.md` — **NON
  MODIFICATI**, come da contratto worktree
- Nessuna migration modificata, nessun pacchetto installato (`package.json` non
  e' nel diff)
- Nessuna coordinata reale, nessun nome di sede, nessuna data non annunciata,
  nessuna persona nominata in questo documento ne' nei file di questo piano:
  solo ruoli
