---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
reviewed: 2026-09-23T19:23:07Z
depth: standard
files_reviewed: 46
files_reviewed_list:
  - .claude/CHANGELOG.md
  - .claude/rules/access-gating.md
  - .claude/rules/media-and-storage.md
  - scripts/conversion-manifest.mjs
  - scripts/lib/server-only-shim.mjs
  - scripts/probe-event-media-lab.mjs
  - scripts/purge-media-orphans.mjs
  - scripts/restrip-event-media.mjs
  - scripts/rls-baseline.mjs
  - scripts/seed-lab-media.mjs
  - scripts/verify-capabilities.mjs
  - scripts/verify-media-strip.mjs
  - scripts/verify-refusal.mjs
  - scripts/verify-touch-targets.mjs
  - src/app/(admin)/admin/(work)/events/[id]/media/page.tsx
  - src/app/(admin)/admin/(work)/layout.tsx
  - src/app/(admin)/admin/members/CreateAccountForm.tsx
  - src/app/(admin)/admin/members/actions.ts
  - src/app/(admin)/admin/scanner/ScannerClient.tsx
  - src/app/(members)/account/page.tsx
  - src/app/(public)/events/EventTabs.tsx
  - src/app/(public)/events/FormatFilterRow.tsx
  - src/app/(public)/events/[slug]/MediaGallerySection.tsx
  - src/app/(public)/events/[slug]/actions.ts
  - src/app/(public)/events/[slug]/page.tsx
  - src/app/(public)/events/page.tsx
  - src/app/(public)/gallery/page.tsx
  - src/app/globals.css
  - src/app/layout.tsx
  - src/components/admin/MemberTable.tsx
  - src/components/layout/AppNav.tsx
  - src/components/media/Lightbox.tsx
  - src/components/media/MediaGrid.tsx
  - src/components/media/MediaReviewGrid.tsx
  - src/components/staff/StaffNav.tsx
  - src/components/ui/AutocompleteInput.tsx
  - src/components/ui/Input.tsx
  - src/lib/capabilities/keys.ts
  - src/lib/media/sign-event-media.ts
  - src/lib/rbac/roles.ts
  - src/lib/routes/capability-routes.ts
  - src/lib/routes/next-redirect.ts
  - src/lib/routes/staff-tabs.ts
  - src/types/database.ts
  - supabase/migrations/20260923180000_gallery_view_and_media_paths.sql
  - supabase/migrations/20260923180100_gallery_close_data.sql
findings:
  critical: 0
  warning: 8
  info: 8
  total: 16
status: issues_found
---

# Fase 52: Code Review Report

**Reviewed:** 2026-09-23T19:23:07Z
**Depth:** standard
**Files Reviewed:** 46
**Status:** issues_found

> Etichette: ogni voce porta la classe richiesta dal revisore — **BLOCKER** per le
> Critical, **WARNING** per le Warning, **INFO** per le note di qualita'. Nessun
> BLOCKER e' stato trovato. Il debito gia' dichiarato dalla fase (`deleteMedia`
> senza chiamanti, i video non spogliati, il restrip come secondo scrittore fuori
> dal controllo A, i commenti «public bucket» in `finalize.ts` / `may-upload.ts` /
> `server.ts` / `middleware.ts`) **non e' ripetuto** qui.

## Summary

Il perimetro e' la chiusura della gallery (chiave `gallery.view`, M1/M2, firma
per sessione), la barra di navigazione riscritta (`getNavigation`, pannello
Management, striscia degli strumenti), i ritocchi alla porta (cinque tab, alert
raggruppati, tastiera) e sei script di laboratorio/manutenzione.

**Cio' che tiene, verificato leggendo il codice e non il piano.** Il confine dei
dati e' dove deve stare: `event_media_select_gallery` (M2 `:133-141`) lega le
righe approvate alla chiave; `event_media_objects_select_by_row` (M1 `:223-235`)
chiede la riga per firmare l'oggetto, e la sottoquery gira sotto la RLS di chi
firma; `signEventMedia` (`sign-event-media.ts:121-131`) usa il client della
sessione e non la chiave di servizio; nessuna superficie legge piu' `url`; il
`DO` di M2 riconta bucket, policy larghe e la policy vecchia prima di
committare. `resolveNext` resta un'allow-list ancorata (`next-redirect.ts:139`)
e `/gallery` entra nei prefissi protetti nello stesso commit. Gli script di
rimozione (`purge-media-orphans.mjs`) rispettano le regole di
`ai-engineering.md`: conteggio e cattura nella stessa interrogazione, cascata
letta da `pg_constraint`, atto per chiave singola, riconteggio da fonte diversa,
autorizzazione consumata anche su atto parziale, corpo degli errori mai
stampato.

**Dove il lavoro e' piu' debole.** Tre punti riguardano il gate *zero fallimenti
silenziosi* e il gate *cache esplicita* sulle superfici media appena riscritte
(WR-01, WR-02, WR-04); uno e' un dato personale che attraversa il confine
client senza consumatore (WR-03); uno e' la porta, dove gli avvisi di
trasporto ora vivono dietro un tab e nessuna regione live li annuncia (WR-05);
tre sono negli script: la semina di laboratorio e' rimasta allo schema di
prima di M1 e lascia lo stato a meta' che lei stessa rifiuta (WR-06), due
script stampano fino a 300 byte di corpo d'errore che puo' portare path e id
su un output destinato a `.planning/` (WR-07), e il restrip scarica foto di
persone su disco anche in `--dry-run` (WR-08).

Non esiste un test runner: nessuna di queste voci e' «coperta dai test», e la
verifica di ogni correzione e' `npm run build` piu' la procedura manuale
indicata nella voce.

## Narrative Findings (AI reviewer)

Nessun blocco `<structural_findings>` e' stato fornito: la sezione strutturale
e' omessa per costruzione, non per scelta.

## Warnings

### WR-01 [WARNING]: La lettura dell'evento nella moderazione collassa un errore di lettura in «Event not found»

**File:** `src/app/(admin)/admin/(work)/events/[id]/media/page.tsx:143-175`
**Issue:** Il docblock aggiornato dalla fase dice che *«every read now checks
its error»* (`:30-31`). La prima lettura non lo fa: `const { data: event } =
await supabase.from("events")…single()` scarta `error`, e un fallimento di
rete, un `PGRST` o un timeout producono la stessa pagina «This address names an
event that does not exist» di un id inesistente. E' il pattern che
`meta-gates.md` vieta — due cause diverse con una faccia sola — e questa volta
sulla superficie che la stessa fase ha riparato proprio per quel difetto (la
coda che «falliva in silenzio», `:197-206`). Le altre tre letture della pagina
hanno la loro categoria; questa no.
**Fix:**
```ts
const { data: event, error: eventError } = await supabase
  .from("events").select("id, title").eq("id", eventId).single();

if (eventError && eventError.code !== "PGRST116") {
  console.error(
    `[media_review.event_read_failed] code=${eventError.code ?? "unknown"} message=${eventError.message}`
  );
  // avviso «could not be read», non lo stato vuoto
}
if (!event) { /* ramo «not found», invariato */ }
```
Verifica manuale: sul laboratorio, con la chiave anon invalidata per un
istante, aprire la pagina e osservare l'avviso di lettura invece di «Event not
found».

### WR-02 [WARNING]: La gallery non dichiara di essere non cacheabile, e ora serve URL firmati per sessione

**File:** `src/app/(public)/gallery/page.tsx:63-97`
**Issue:** Dopo NAV-07 la pagina disegna indirizzi firmati **per la sessione
di chi guarda** e, per chi tiene la chiave, foto di serate a sede segreta. Le
altre due superfici media (`events/[slug]/page.tsx:264`,
`admin/(work)/events/[id]/media/page.tsx:72`) dichiarano `export const dynamic
= "force-dynamic"`; questa no. Oggi e' dinamica per effetto collaterale di
`cookies()` dentro `getAccessContext()`, che il docblock della pagina di
moderazione definisce *«implicit and one import away»*: un refactor che
spostasse la risoluzione la renderebbe cacheabile senza errore. E'
`nextjs-architecture.md`, gate *cache esplicita* — «dichiarandolo, non
derivandolo» — su una pagina che il gate nomina per costruzione.
**Fix:**
```ts
// gallery/page.tsx, sotto gli import
export const dynamic = "force-dynamic";
```
Con una riga di commento che rimandi al gate, come fa la pagina di moderazione.

### WR-03 [WARNING]: L'id dell'uploader attraversa il confine client sulla pagina pubblica della serata, e nessuno lo legge

**File:** `src/app/(public)/events/[slug]/page.tsx:1036,1071`;
`src/components/media/MediaGrid.tsx:49`
**Issue:** `mediaItems` porta `uploaded_by: m.uploaded_by ?? undefined` fino a
`MediaGallerySection` → `MediaGrid`, componenti `"use client"`. Il campo e'
dichiarato in `MediaGridItem` ma **nessun** consumatore lo legge
(`MediaGallerySection.tsx`, `MediaGrid.tsx`, `Lightbox.tsx`: zero occorrenze
oltre la dichiarazione). Il risultato e' che, per ogni foto approvata, l'UUID
di una persona viene serializzato nel payload RSC della pagina evento e nel
DOM per chiunque tenga `gallery.view` — un dato personale nel bundle senza
scopo (`nextjs-architecture.md`, gate *segreti nel bundle*; `comms-analytics`,
gate PII). Preesistente nella forma, ma la fase ha riscritto questa mappatura
(`:1066-1072`) e ha scelto di conservarlo.
**Fix:**
```ts
// page.tsx:1066-1072 — togliere il campo dalla proiezione
mediaItems = rows.map((m) => ({
  id: m.id,
  url: signed.urls[m.id] ?? "",
  type: m.type as "photo" | "video",
}));
// MediaGrid.tsx:49 — rimuovere `uploaded_by?: string` da MediaGridItem
// e `uploaded_by` dalla select a :1040 se non serve ad altro.
```

### WR-04 [WARNING]: Lo stato «could not be loaded» e' legato all'id e sopravvive a una firma nuova

**File:** `src/components/media/MediaGrid.tsx:68,108`;
`src/components/media/MediaReviewGrid.tsx:81,199`
**Issue:** Le due griglie marcano il fallimento in un `Set` **per id di riga**
(`markFailed(item.id)`). `Lightbox.tsx:60-61,122,130` lo lega invece all'URL,
e ne spiega la ragione: un indirizzo diverso riparte pulito. Le griglie sono
componenti client che **non si smontano** su `router.refresh()` — che
`MediaGallerySection.tsx:42-44` chiama dopo ogni caricamento — e ogni render
del server produce una firma nuova. Quindi un `<img>` fallito una volta (rete
instabile, firma scaduta durante uno scroll lungo) resta «could not be loaded»
anche quando arriva l'URL fresco che funzionerebbe, finche' chi guarda non
ricarica l'intera pagina. Sulla moderazione il costo e' una foto che non si
puo' giudicare per un fallimento che non c'e' piu'.
**Fix:**
```tsx
// in entrambe le griglie: chiave = indirizzo, come Lightbox
const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
const markFailed = (url: string) => setFailed(prev => prev.has(url) ? prev : new Set(prev).add(url));
…
{item.url === "" || failed.has(item.url) ? (…) : (
  <img src={item.url} … onError={() => markFailed(item.url)} />
)}
```

### WR-05 [WARNING]: Alla porta gli avvisi di trasporto vivono dentro un tab e nessuna regione live li annuncia

**File:** `src/app/(admin)/admin/scanner/ScannerClient.tsx:2809-2835,3664-3760`
**Issue:** D-52-21 sposta nel tab *Alerts* la fascia di staleness con il
pulsante di ricarica, le `cacheNotices` (anche quelle con tono `error`),
l'esito del drain e la deriva dell'orologio. Le regioni `role="status"
aria-live="polite"` (`:3702`, `:3720`) esistono **solo mentre il tab e'
attivo** (`activeFilter === "alerts"`, `:3664`): un avviso che nasce mentre
l'operatore e' su *Out* non viene annunciato a nessuno. Il solo segnale e' un
punto di 8 px `aria-hidden` (`:3413-3418`) e un cambio di `aria-label` sul
pulsante, che i lettori di schermo non annunciano. La fascia di staleness — un
pulsante che ricarica la lista — passa da «sempre visibile» a «due tocchi». La
decisione del proprietario e' registrata e non si discute qui; il residuo non
dichiarato e' l'assenza di un canale non visivo per un avviso nuovo, su una
superficie che `nextjs-architecture.md` (gate *accessibilita' al buio*) vuole
con feedback oltre il colore e la vista. L'avviso di guest list resta
nell'intestazione (`:3311-3318`) e copre il rischio di rifiutare per nome: il
residuo riguarda gli altri quattro.
**Fix:** Una regione live **fuori** dal tab, visivamente nascosta, che
annunci solo il delta:
```tsx
<p className="sr-only" role="status" aria-live="polite">
  {alertsUnseen ? `${alertKeys.length} new alert${alertKeys.length === 1 ? "" : "s"} in the Alerts tab` : ""}
</p>
```
e, per la fascia di staleness, valutare se il pulsante di ricarica debba
restare raggiungibile con un tocco dall'intestazione quando `!channelLive`
(la tinta `sem-crit`), lasciando nel tab solo il testo. Prova manuale con
VoiceOver sul telefono di laboratorio: spegnere la rete su *Out* e ascoltare.

### WR-06 [WARNING]: La semina di laboratorio e' ferma allo schema di prima di M1 e lascia lo stato a meta' che lei stessa rifiuta

**File:** `scripts/seed-lab-media.mjs:284-291,331-346`
**Issue:** Il ramo (c) carica l'oggetto (`:335`) e **poi** inserisce la riga
scrivendo solo `url` (`:338-344`), senza `storage_path`. Dopo M2
(`storage_path NOT NULL`, applicata al laboratorio dal piano 52-13) quell'insert
fallisce con `23502`: l'oggetto e' gia' nel bucket, la riga no — esattamente lo
stato `prestrip_half` che lo script rifiuta al giro successivo (`:319-324`), e
un orfano in piu' che `purge-media-orphans` contera'. Inoltre il conteggio
«con riga» (`:288-289`) riconosce una riga solo per `m.url like …`: dopo
NAV-07 le righe nate dal prodotto portano `storage_path` e `url` nullo, quindi
un pre-stripper registrato nel modo nuovo risulta «senza riga». Lo script e' un
artefatto del piano 52-01 che la fase ha superato senza aggiornarlo; sul
laboratorio la prossima corsa `--apply` con `prestrips = 0` produce il guasto.
**Fix:**
```js
// (c): riga PRIMA dell'oggetto, e con la chiave
const row = await sql(
  `insert into public.event_media (event_id, party_id, uploaded_by, storage_path, url, type, file_size, status, created_at)
   values (…, ${q(prestripPath)}, null, 'photo', ${bytes.length}, 'approved', ${q(threshold)}::timestamptz - interval '1 day')
   returning id`, { readOnly: false });
await storageUpload(prestripPath, bytes);
// riconoscimento: `m.storage_path = o.name or m.url like …`
```
Oppure dichiarare in testa che lo script vale solo su un banco pre-M1 e farlo
rifiutare (`exit 2`) quando `information_schema.columns` mostra
`storage_path NOT NULL`, come fa `purge-media-orphans.mjs:407-423` in verso
opposto.

### WR-07 [WARNING]: Due script stampano fino a 300 byte di corpo d'errore che puo' portare path e id, su un output destinato a `.planning/`

**File:** `scripts/seed-lab-media.mjs:161`;
`scripts/restrip-event-media.mjs:340`
**Issue:** Entrambi i docblock promettono «mai un path, un URL o un
identificativo» sullo standard output (`seed:54-56`, `restrip:138-144`), e il
ramo d'errore del Management API fa `fail("sql", … ${(await
res.text()).slice(0, 300)})`. Un errore di Postgres restituito dall'endpoint
porta il frammento dell'istruzione o il `DETAIL` della violazione — e le
istruzioni di `restrip` incorporano `storage_path` (`:532`, `:701`; ogni path
contiene l'id di una serata e di chi ha caricato) e gli id di riga (`:767`).
`purge-media-orphans.mjs:336-339` fa la cosa giusta e ne scrive la ragione:
*«il corpo d'errore puo' ripetere la query, che porta chiavi: solo lo
stato»*. Il repository e' pubblico e questi referti si incollano nei
VERIFICATION (`ai-engineering.md`, gate *la pianificazione e' pubblica*).
**Fix:**
```js
if (!res.ok) fail("sql", `code=${res.status} message=Management API ha rifiutato la query (corpo non stampato: puo' portare chiavi)`);
```
in entrambi i file; per il debugging locale, scrivere il corpo nell'istantanea
`.env*` invece che su stdout.

### WR-08 [WARNING]: Il restrip scarica su disco le foto originali anche in `--dry-run`

**File:** `scripts/restrip-event-media.mjs:544-604`
**Issue:** L'istantanea dei byte originali — «contiene foto di persone»
(`:557`, `:592`) — viene scritta in `.env.restrip-snapshot.<stamp>/` **prima**
del bivio `if (DRY_RUN)` (`:598`). Una prova a secco, che per definizione non
sovrascrive nulla e non ha bisogno di una via di ritorno, lascia sul portatile
di chi la lancia una directory di immagini di persone riconoscibili, con
`row` intero (`uploaded_by` compreso) nell'`index.json`. `legal-compliance.md`
(gate *immagini delle persone*) e `purge-media-orphans.mjs:53-60` dicono la
stessa cosa: copiare un'immagine dal bucket, dove una policy la governa, a un
disco dove non la governa niente, e' un costo da pagare solo quando serve. Il
piano 52-17 prevede la cancellazione datata di **una** istantanea, non di ogni
dry-run.
**Fix:** In `--dry-run` leggere e ispezionare (`inspect`) senza `writeFileSync`
dei byte: produrre solo l'`index.json` con formato, dimensione, `exif`/`xmp` e
`sha256`, e dirlo nel referto («istantanea non scritta: dry-run»). L'istantanea
completa nasce solo sotto `--apply`, subito prima dell'atto.

## Info

### IN-01 [INFO]: Docblock di `MediaReviewGrid` ancora al bucket pubblico

**File:** `src/components/media/MediaReviewGrid.tsx:57-64`
**Issue:** «rejecting flips the row, and the object stays in a **public**
bucket at a derivable path. That was true before this conversion and is true
after it» — falso dal 2026-09-23 (M2, bucket privato; oggetti rifiutati non
firmabili da `gallery.view`; `purge-media-orphans` per chiave). Il paragrafo
sopra (`:26-35`) e' stato aggiornato dalla fase, questo no; non e' fra i
commenti stale gia' dichiarati.
**Fix:** Riscrivere con la data: il rifiuto cambia la riga; l'oggetto resta ma
non e' piu' raggiungibile per URL ne' per firma da chi tiene solo
`gallery.view`; la rimozione e' `purge-media-orphans.mjs` (D-52-30).

### IN-02 [INFO]: Due frasi in `actions.ts` descrivono un M2 diverso da quello scritto

**File:** `src/app/(public)/events/[slug]/actions.ts:143,164`
**Issue:** `:164` dice «M2 (plan 52-13) drops the column» — M2 non cancella
`url`, la lascia come storia (`20260923180100:301-302`). `:143` dice che
finalize «writes the stripped bytes to the public bucket» — privato da M2.
**Fix:** Correggere le due righe; una nota che descrive una migration che non
esiste e' il caso di `meta-gates.md`, *una riga che descrive male il prodotto*.

### IN-03 [INFO]: I rifiuti di capability rimandano a `/dashboard`, che e' un 308

**File:** `src/app/(public)/gallery/page.tsx:94`;
`src/app/(admin)/admin/(work)/events/[id]/media/page.tsx:137`
**Issue:** `redirect("/dashboard")` produce un salto in piu' (`/dashboard` →
308 → `/account`, `next.config.ts`). `next-redirect.ts:46` ha gia' spostato il
default a `/account`. La guardia della gallery e' nuova in questa fase.
**Fix:** `redirect("/account")` in entrambi; censire con `grep -rn
'redirect("/dashboard")' src/` le altre occorrenze e chiudere in un colpo solo.

### IN-04 [INFO]: `roles.ts` contiene due verdetti opposti sullo stesso schema di guardia

**File:** `src/lib/rbac/roles.ts:50-80` contro `:390-444`
**Issue:** Il docblock di `DOOR_HREF` rifiuta per iscritto «a runtime
assertion standing in for a compile-time one» in un modulo importato da un
componente `"use client"`, e spiega che un `throw` a livello di modulo
sparerebbe all'idratazione di ogni pagina. Il blocco `{ … resolveRoute("/gallery") … }` fa esattamente quello, e lo dichiara
(`:410-418`) come parita' con `staff-tabs.ts`. Il compromesso e' reale (il
tipo `GalleryAddress` copre il caso principale; l'asserzione copre il pattern
piu' specifico che il tipo non vede), ma se sparasse porterebbe un 500 su ogni
pagina che monta la barra, porta compresa. Non e' un bug per una mappa corretta;
e' un file che dice due cose.
**Fix:** Riconciliare i due docblock in una sola regola: *il tipo e' la
garanzia di build; l'asserzione e' la seconda rete, e scatta al primo render
sul server, non all'idratazione, perche' nessun mount e' prerenderizzato*. E
valutare se spostare l'asserzione della Gallery nel loop di `staff-tabs.ts`,
dove la disciplina gia' vive una volta sola.

### IN-05 [INFO]: La sonda dichiara un esito che il suo contratto non prevede, e la precedenza degli exit code e' rovesciata

**File:** `scripts/probe-event-media-lab.mjs:162-167,452`
**Issue:** `record()` documenta quattro esiti; la sonda 7 senza flag ne
registra un quinto, «rimandata a 52-14», che non muove l'exit code. E `record`
mette 2 (rifiuto) solo se l'exit e' ancora 0, mentre un successivo NON
CONFORME lo porta a 1: una corsa con una sonda non misurata **e** una non
conforme esce 1, e il «nulla e' stato misurato» sparisce dal codice d'uscita.
**Fix:** Aggiungere l'esito alla lista in `:163`; e far vincere il 2 quando
almeno una sonda non e' stata misurata (`exitCode = Math.max(...)` con 2 >
1), oppure dichiarare che 1 vince su 2 e perche'.

### IN-06 [INFO]: `validation_failed` e' il codice generico di GoTrue, non quello dell'indirizzo

**File:** `src/app/(admin)/admin/members/actions.ts:1600-1611`
**Issue:** `validation_failed` e' emesso da GoTrue per qualunque validazione
del corpo, non solo per l'email. Con questo `createUser` (email, `email_confirm`,
`user_metadata.full_name`) la sola validazione plausibile e' l'indirizzo, quindi
oggi l'etichetta «That address was refused» e' quasi sempre giusta; il giorno
in cui la chiamata porta un campo in piu', la notifica mentira' sulla causa.
**Fix:** Tenere il mapping, ma includere `authError.message` (che non porta
l'indirizzo per un `validation_failed` sull'email? va misurato in laboratorio)
nel `detail` o riconoscere il campo dal messaggio; e scrivere nel commento che
il mapping e' una scommessa sulla forma della chiamata.

### IN-07 [INFO]: Senza `full_name`, la pagina dell'account mostra il ruolo due volte

**File:** `src/app/(members)/account/page.tsx:262-263`
**Issue:** `fullName = user.user_metadata?.full_name || roleLabel` rende un
account senza nome come titolo «Staff» con badge «Staff» sotto. Prima la
ricaduta era «Attendee» per tutti; ora e' coerente col ruolo ma ridondante.
**Fix:** Ricadere su `userEmail` (gia' letto) o su un testo neutro («Your
account»), lasciando il ruolo al solo badge.

### IN-08 [INFO]: La sonda legge i nomi di variabile della produzione, gli altri script quelli del laboratorio

**File:** `scripts/probe-event-media-lab.mjs:86-101`
**Issue:** La sonda carica `.env.lab.local` per primo e legge
`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`; `seed-lab-media.mjs`,
`seed-lab-door.mjs`, `purge-media-orphans.mjs` e `restrip-event-media.mjs`
leggono `LAB_SUPABASE_URL` / `LAB_SUPABASE_SERVICE_ROLE_KEY`. La sonda fallisce
chiusa se i nomi non ci sono (`:105-116`), quindi non e' un rischio; e' una
seconda convenzione che obbliga `.env.lab.local` a portare entrambe le forme.
**Fix:** Allineare la sonda ai nomi `LAB_*` con ricaduta esplicita, come
`purge-media-orphans.mjs:300-319`.

---

_Reviewed: 2026-09-23T19:23:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
