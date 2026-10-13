# Fase 53: Meno strumenti, la porta dentro Management — Mappa dei pattern

**Mappata:** 2026-10-14, ramo `wip/52.3` (HEAD `a8ca338b`). Ancore `file:riga` misurate oggi: **rileggerle prima di modificare** — una fase di cancellazione sposta le righe di ogni file che tocca.
**File analizzati:** 34 creati o modificati (i 46 file che escono interi non sono mappati: non hanno bisogno di un analogo).
**Analoghi trovati:** 34 / 34 (3 con divergenza dichiarata dall'analogo, vedi «Dove l'analogo NON va copiato»).

> Repo pubblico: questo file nomina ruoli, mai persone; nessuna sede, nessun valore di variabile, nessun identificativo di riga. I ref di progetto restano dove gia' stanno negli script, non si ricopiano nei piani.

---

## Classificazione dei file

| File creato/modificato | Ruolo | Flusso | Analogo piu' vicino | Qualita' |
|---|---|---|---|---|
| `src/lib/rbac/roles.ts` | utility (navigazione pura) | transform | se stesso: `panelFor` + riga Account (`:447-461`), la riga Gallery storica (`git show 36bdd6d0^:src/lib/rbac/roles.ts`, push condizionato su capability), `admits` (`:467-500`) | esatto |
| `src/components/layout/AppNav.tsx` | component (client) | request-response | se stesso: ramo `link` del pannello (`:616-630`), `inPanel` (`:381-386`), densita' (`:310-325`) | esatto |
| `src/lib/routes/capability-routes.ts` | config (mappa di raggiungibilita') | — | voce `CAP.PRODUCTION_MANIFESTO_MANAGE` che resta (`:845-848`); voce porta (`:301-305`); lapide «QUI STAVA LA VOCE GALLERY» (`roles.ts:421-426`) | esatto |
| `src/lib/routes/staff-tabs.ts` | config | — | voci `DECLARED` (`:142-344`), asserzione a caricamento (`:352-371`) | esatto |
| `src/lib/capabilities/keys.ts` | config | — | rimozione di `GALLERY_VIEW`/`MEDIA_UPLOAD` (commit `36bdd6d0`) | esatto |
| `src/types/database.ts` | model (scritto a mano) | — | lapide `EventMediaRow` (`database.ts:432-441`) | esatto |
| `src/lib/production/sections/vocabulary.ts` | utility (vocabolario) | — | se stesso (`:62-68` riesportazione, `:127-133` `SECTION_KINDS`) | esatto |
| `src/lib/production/sections/export-contract.ts`, `write-contract.ts`, `src/lib/production/export/manifesto.ts` | utility (contratto) | — | prosa riscritta, nessun codice nuovo | prosa |
| `src/app/(admin)/admin/manifesto/actions.ts` | server action | CRUD | se stesso `revalidateSection()` (`:185-198`) | esatto |
| `src/app/(admin)/admin/manifesto/{SectionForm,SectionStateBadge,SectionVoid,ExportPanel,OpenQuestionNotice,refusals}.tsx` | component | — | prosa «one form, two keys» da riscrivere | prosa |
| `src/lib/media/{finalize,strip-metadata,upload-limits}.ts`, `src/app/api/media/finalize-cover/route.ts`, `src/lib/venue-reveal/reveal-party-venue.ts` | utility / route | file-I/O | prosa che cita l'archivio o `may-upload` come precedente | prosa |
| `src/lib/supabase/middleware.ts:590`, `src/lib/routes/next-redirect.ts:143,148`, `scripts/verify-routes.mjs:594,625` | middleware / utility | — | esempi in commento da sostituire con un indirizzo vivo | prosa |
| `next.config.ts` | config | — | se stesso (`:36-54`) | esatto |
| `vercel.json` | config | batch (cron) | rimozione di una voce `crons` (8 → 7) | esatto |
| `package.json` | config | — | riconciliazione `verify-all.mjs:495-545` | esatto |
| `src/components/venues/CreateVenueModal.tsx` | component (client, dialog) | request-response | `CreateArtistModal.tsx` dopo `31baf149` | esatto |
| `src/components/venues/NewVenueButton.tsx` (**nuovo**) | component (client) | request-response | `src/components/artists/NewArtistButton.tsx` (`31baf149`, 40 righe) | esatto |
| `src/app/(admin)/admin/(work)/venues/page.tsx` | page (server) | CRUD (lettura) | `(work)/artists/page.tsx` dopo `31baf149` | esatto |
| `src/app/(admin)/admin/venues/actions.ts` (opzionale, D-53-09) | server action | CRUD | `updateVenue` + `UpdateVenueRefusal` (`actions.ts:186-238`) | esatto |
| `supabase/migrations/20261014xxxxxx_production_tools_removal.sql` (**nuovo**) | migration (sola rimozione) | — | `20261001120200_gallery_removal.sql` | esatto |
| `scripts/purge-production-tools.mjs` (**nuovo**, nome a discrezione) | script (atto per chiave) | batch | `scripts/purge-attendances.mjs` + `labStorageDelete` di `seed-lab-music.mjs:270-279` | ruolo esatto, **una regola NON si copia** (D-53-05) |
| `scripts/lab-apply-migration.mjs` | script (Management API) | request-response | `scripts/lab-bootstrap.mjs:200-225` (`/database/migrations` + lettura registro) | esatto |
| `scripts/verify-capabilities.mjs` | gate (DB vivo) | request-response | paragrafo «Da 16 a 14» (`:291-320`) | esatto |
| `scripts/verify-section-surface.mjs` | gate offline | file-I/O | se stesso `SCOPE` (`:117-125`) | esatto |
| `scripts/verify-section-export.mjs` | gate (meta' offline) | file-I/O | se stesso (`:100-105`, `:131-132`, `:169-195`, `:562-587`) | esatto |
| `scripts/conversion-manifest.mjs` | config di gate | — | `PENDING_SURFACES` (`:298-314`) + paragrafo aritmetico (`:950-965`) | esatto |
| `scripts/verify-all.mjs` | runner | batch | liste `OFFLINE`/`NEEDS_MATERIAL` (`:246-385`, `:430-438`) | esatto |
| `scripts/verify-refusal.mjs` | gate (autorizzato) | — | elenco sezioni `:173-227` (si riscrive, **non si esegue**) | esatto |
| `scripts/seed-lab-door.mjs` | script lab | batch | lapide della tabella delle presenze (`:526-533`) | esatto |
| `CLAUDE.md`, `.claude/rules/{meta-gates,access-gating,community-membership,ticketing-payments,media-and-storage,production-calendar}.md` | persona | — | 1.30.0 (gallery), 1.28.1 (conteggio cron), 1.33.0 (pagare il budget) | esatto |
| `.claude/CHANGELOG.md` | persona | — | voce `[1.30.0]` (`CHANGELOG.md:243-297`) + `[1.33.0]` per il budget (`:6-60`) | esatto |
| `.planning/PROJECT.md`, `.planning/STATE.md` (CUT-06) | doc | — | frase da riscrivere, nessun codice | prosa |
| `53-PROCEDURES.md`, `53-VERIFICATION.md` | doc | — | `52.4-VERIFICATION.md`, `52.1-PROCEDURES.md` | esatto |

---

## Assegnazioni dei pattern

### `src/lib/rbac/roles.ts` (utility pura, transform) — CUT-02 e uscita di TASK

**Analogo:** se stesso. La forma di D-53-01 esiste gia' due volte nel file: una riga di pannello aggiunta **fuori da `STAFF_TABS`** dentro `panelFor` (oggi Account, fino al 2026-10-02 Gallery), e il predicato `admits` che separa `heldByRole` da `heldByAssignment`.

**La riga fuori da `STAFF_TABS`, precedente Gallery** (rimossa da `36bdd6d0`; si legge con `git show 36bdd6d0^:src/lib/rbac/roles.ts`):
```ts
// dentro panelFor, prima del push di Account
if (capabilities.includes(CAP.GALLERY_VIEW)) {
  entries.push({ href: GALLERY_HREF, label: "Gallery" });
}
```
Per Check-in: `capabilities.includes(CAP.DOOR_OPERATE)` → `entries.push({ kind: "link", href: DOOR_HREF, label: "Check-in" })`. `capabilities` qui sono **solo di ruolo** (docblock `:432-446`): e' esattamente «tenuta per ruolo → pannello».

**`panelFor` di oggi** (`roles.ts:447-461`) — la riga va inserita **prima** del controllo `entries.length === 0`, cosi' un ruolo con il solo `door.operate` riceverebbe comunque un pannello (oggi nessun ruolo e' in quel caso: va detto nel docblock, non dedotto):
```ts
function panelFor(capabilities: readonly CapabilityKey[]): PanelEntry[] {
  const entries: PanelEntry[] = visibleStaffTabs(capabilities).map((tab) => ({
    kind: "link" as const, href: tab.href, label: tab.label,
  }));
  if (entries.length === 0) { return []; }
  entries.push({ kind: "link", href: ACCOUNT.href, label: ACCOUNT.label });
  return sortTabsByLabel(entries);
}
```
L'ordinamento resta `sortTabsByLabel` (D-52-27): Check-in cade fra Artists e Formats, come nella tabella di `53-RESEARCH.md` §3.2.

**La guardia dell'indirizzo** (`roles.ts:93-96`) — si riusa, non se ne aggiunge una:
```ts
type DoorAddress =
  (typeof CAPABILITY_ROUTES)[typeof CAP.DOOR_OPERATE]["routes"][number];
const DOOR_HREF: Extract<DoorAddress, Route> = "/door";
```

**Il predicato da non toccare** (`roles.ts:489-497`, `admits`) — la barra cambia solo nel *quale ramo*:
```ts
const heldByRole = capabilities.includes(declaration.capability);
const heldByAssignment =
  liveAssignmentCapabilities !== null &&
  liveAssignmentCapabilities.includes(declaration.capability);
if (!heldByRole && !heldByAssignment) { return false; }
```
In `getNavigation` (`:653-687`) la voce `CHECK_IN` in barra diventa: `admits(...) && !capabilities.includes(CAP.DOOR_OPERATE)`. Il `null` che rifiuta resta tale: lo staff con payload senza chiave **non** vede Check-in, come oggi.

**Cosa esce** (TASK): il ramo `disabled` di `PanelEntry` (`:179-188`), `TASK_ROLES`/`TASK` (`:387-414`), il push in coda (`:676-684`). Il tipo torna a una forma sola. Dopo, `role` in `getNavigation` serve solo per `isAuthenticated` (`:658`).

**Forma della lapide da copiare** (`roles.ts:421-426`) — la casa scrive *che c'era*, senza ricopiare l'identificatore:
```ts
// ── QUI STAVA LA VOCE GALLERY DEL PANNELLO — uscita il 2026-10-02 ─────────
//
// DBT-13 (D-52.1-17): con la pagina `/gallery` sono usciti `GALLERY_HREF`, il
// tipo che lo legava a `gallery.view` e l'asserzione a caricamento su
// `resolveRoute` (IN-04). Resta la sola guardia di `DOOR_HREF`, in cima.
```
⚠ Il grep di CUT-01 cerca `\bTASK\b`: la lapide di TASK **non** scrive la parola in maiuscolo (`roles.ts:233-236` e `capability-routes.ts:329-331` sono le regole di casa su questo).

**Docblock da riscrivere con il riconteggio:** `:533-622` (tabelle della barra per ruolo, «9 strumenti / 10 strumenti» `:543-544`), `:641-651` (14 mount di `<AppNav`: riconfermare con `grep -rln "<AppNav" src | grep -v roles.ts` dopo la cancellazione). La rovescia di D-52-05 (Check-in seconda voce per chiunque) va scritta **con la sua ragione** (`53-RESEARCH.md` «Stato dell'arte»).

---

### `src/components/layout/AppNav.tsx` (component client, request-response)

**Analogo:** se stesso. Cadono i due rami `row.kind === "disabled"` (colonna `:598-614`, foglio `:687-699`) e l'icona `clipboard-document-check` (`:192-200`). Resta il ramo `link` (`AppNav.tsx:616-630`):
```tsx
const isRowActive = pathname.startsWith(row.href);
return (
  <Link key={row.href} href={row.href}
    aria-current={isRowActive ? "page" : undefined}
    className={`relative flex min-h-11 items-center rounded-xl ps-16 pe-4 text-sm ${FOCUS_RING} ${
      isRowActive ? "text-accent" : "text-muted hover:text-ink"}`}>
```
**`inPanel`** (`:381-386`) perde il filtro sul tipo e **cambia significato**: su `/door` diventa vero per organizer/master. Il commento `:378-380` dice oggi l'opposto («it excludes `/admin/scanner`, which is the door») e va riscritto:
```tsx
const dense = bar.length >= 4;
const inPanel = panel.some(
  (entry) => entry.kind === "link" && pathname.startsWith(entry.href)
);
```
**Densita'** (`:310-325`): regola per numero di voci, mai per viewport. Organizer/master scendono a 3 voci → tornano `ENTRY_PHONE` (`px-5`); lo staff assegnato resta a 4 → `ENTRY_PHONE_DENSE`. Non si tocca la regola, si **rimisura** (P-53-B, metodo `52.3-19-SUMMARY.md:67-109`).

**Fuori perimetro, da dichiarare:** `DoorSurface.tsx` (monta `AppNav form="phone"`, `:153`), `src/lib/offline/`, `StaffNav.tsx` e `STAFF_TABS` (D-53-06: la striscia dello staff **non** riceve Check-in — quindi Check-in **non** entra in `DECLARED`, strada 1 di `53-RESEARCH.md` §3.2).

---

### `src/lib/routes/capability-routes.ts`, `staff-tabs.ts`, `src/lib/capabilities/keys.ts` (config)

**Analogo:** la voce che resta, a confronto con quelle che escono. Voce Manifesto (`capability-routes.ts:845-848`, numerazione relativa all'estratto `:778-850`):
```ts
[CAP.PRODUCTION_MANIFESTO_MANAGE]: {
  routes: ["/admin/manifesto"],
  alsoGatesTables: true,
},
```
Il `Record` e' totale sulle chiavi di `CAP` (`capability-routes.ts:937`): **chiave in `keys.ts` e voce qui escono nello stesso commit**, o il build e' rosso (bene: si vede).

**Voce di `DECLARED` in `staff-tabs.ts`** (forma, `:259-263`):
```ts
{ href: "/admin/location", label: "Location", capability: CAP.PRODUCTION_LOCATION_MANAGE },
```
L'asserzione a caricamento `staff-tabs.ts:352-371` (due errori, due frasi) resta intatta e protegge le sette voci rimaste.

**Conteggi in commento — la casa li ricorregge con data e riconteggio, non li cancella:** `capability-routes.ts:160-205` («Eight entries of the fourteen carry `alsoGatesTables`» → **5 di 11**), `:214-217` («The fourteen keys» → undici), `staff-tabs.ts:373` (`/** The ten, verified against the map. */` → sette). Precedente di forma: `capability-routes.ts:197-204`.

---

### `src/types/database.ts` (model, **scritto a mano**)

**Risposta alla domanda dell'orchestratore:** si **edita a mano**, non si rigenera. Prova: `database.ts:1123-1125` — *«None of the four Supabase clients is parameterised with a generated schema, so this interface DOCUMENTS the shape»*. La gallery (52.1-16, commit `36bdd6d0`) ha tolto le interfacce **nel commit del codice**, prima della migration, e ha lasciato una lapide.

**Lapide da copiare** (`database.ts:432-441`):
```ts
// ── `EventMediaRow` and its alias `EventMedia` stood here ─────────────────────
//
// Removed on 2026-10-02 with the event gallery (DBT-13, D-52.1-17): their
// readers — the gallery, the night's media page, the upload actions — left in
// the same commit. The table `public.event_media` and the `event-media` bucket
// still exist in the database until the schema is closed after the deploy
// (plan 52.1-25); a type for a table no code reads is an invitation to write a
// query against it — the same reason the `attendances` interface left above (WR-08).
```
Ordine: prima gli import da `ics/vocabulary` e `ics/reconcile` (`:36-62`) e da `sections/vocabulary` (`:73-84`), poi le interfacce (`:1528-2598` circa), poi `ics_alias` su `PartySeries` (`:286`). Restano **solo** `ProductionSection` e `ProductionOpenQuestion`, con `SectionKind` ristretto. ⚠ La lapide non ricopia i nomi delle tabelle per esteso se il grep di CUT-01 le cerca (`production_(plan|piece|…)`): descriverle («le otto tabelle del calendario, le due di Location, quella dell'archivio»).

---

### `src/lib/production/sections/vocabulary.ts` e il districamento di Manifesto

**Analogo:** se stesso. La riesportazione da togliere (`vocabulary.ts:62-68`):
```ts
export { VENUE_STAGES } from "@/lib/production/ics/vocabulary";
export type { VenueStage } from "@/lib/production/ics/vocabulary";
```
Il restringimento, **specchio del `CHECK` SQL** (`:127-133` → `["manifesto"]`, e `SECTION_KIND_LABELS` perde `visual`):
```ts
export const SECTION_KINDS = ["manifesto", "visual"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];
```
`manifesto/actions.ts:185-198` — `revalidateSection()` perde la seconda riga; se resta, `verify:routes` [1/5] la segnala (`verify-routes.mjs:541`):
```ts
function revalidateSection() {
  revalidatePath("/admin/manifesto");
  revalidatePath("/admin/visual");
}
```
Il docblock sopra («Both surfaces that draw what this module writes») si riscrive con la ragione: la domanda brand-wide ora ha una sola superficie.

---

### `next.config.ts`, `vercel.json`, `package.json` (config)

- `next.config.ts:36-54`: l'intero `outputFileTracingIncludes: { "/admin/visual": [...] }` e la sua prosa escono (servivano solo a `tokens.ts`). Restano `typedRoutes`, `turbopack`, `images`.
- `vercel.json:26-29`: la voce `production-mirror` esce, **nello stesso commit** della riga di `meta-gates.md` che conta i cron (regola scritta in `meta-gates.md`, riquadro 2026-09-30). Precedente: `CHANGELOG.md` `[1.28.1]` (`:348-375`).
- `package.json`: escono 5 `verify:*` + `import:calendar`, `restore:mirror-snapshot`, `seed:spaces`. **Stesso commit** di script e righe di `verify-all.mjs` (`verify-all.mjs:495-545` rifiuta in entrambe le direzioni; messaggio a `:540`: *«Either the entry was removed and this list moves with it in the same commit»*).

---

### `src/components/venues/NewVenueButton.tsx` (**nuovo**, component client) — CUT-03

**Analogo:** `src/components/artists/NewArtistButton.tsx` (commit `31baf149`), da copiare 1:1 cambiando nomi. Intero:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import CreateArtistModal from "@/components/artists/CreateArtistModal";

/**
 * "New artist" on the artists catalogue — the second mount of
 * `CreateArtistModal`, and the first that is not tied to a night's line-up.
 * ... Reachability is the page's verdict (`organizer.access`); the write is
 * still refused on its own by `createArtist`, which re-asks `catalogue.manage`
 * and runs under the cookie client, so this button widens where the form can be
 * reached and nothing about who may write.
 */
export default function NewArtistButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>New artist</Button>
      <CreateArtistModal open={open} onClose={() => setOpen(false)}
        onCreated={() => { setOpen(false); router.refresh(); }} />
    </>
  );
}
```
Differenza da gestire: `CreateVenueModal.onCreated` ha firma `(id: string, slug: string)` (`CreateVenueModal.tsx:89`), non `(slug)`. Il bottone ignora entrambi i parametri. Il docblock deve nominare `createVenue` e `catalogue.manage` (D-53-09), e dire che **il flag della segretezza e' della serata** (`CreateVenueModal.tsx:36-37`), quindi nulla qui puo' anticipare una rivelazione.

### `src/components/venues/CreateVenueModal.tsx` (component client, dialog)

**Analogo:** la diff di `31baf149` su `CreateArtistModal.tsx`. Quattro punti, gli stessi:

1. Prop opzionale (`CreateVenueModal.tsx:85-90`):
```tsx
/** The name carried in from the event form, rendered read-only. When omitted,
 * the dialog is opened from the venues catalogue and asks for the name itself. */
name?: string;
```
2. Stato (accanto a `:103`): `const nameIsEditable = name === undefined; const [typedName, setTypedName] = useState("");` — azzerato nell'effetto di apertura **e** in `resetAndClose`.
3. Payload (`:201`): `formData.set("name", name ?? typedName.trim());` e submit disabilitato (`:251`): `disabled={isSubmitting || (nameIsEditable && !typedName.trim())}`.
4. Campo (`:267-273`), dall'analogo:
```tsx
{nameIsEditable ? (
  <Input id="venue-name" label="Name" type="text" value={typedName}
    onChange={(e) => setTypedName(e.target.value)}
    required maxLength={120} data-initial-focus />
) : (
  <Input id="venue-name" label="Name" type="text" value={name} readOnly className="opacity-70" />
)}
```
⚠ Il docblock `:39-46` dichiara *«No `data-initial-focus` marker is declared»*: col campo editabile il marker c'e' (solo su quel ramo). Va riscritto, non lasciato a mentire. Nessun campo, nessuna validazione e nessuna condizione sull'indirizzo cambia (`:30-37`).

### `src/app/(admin)/admin/(work)/venues/page.tsx` (page server, lettura)

**Analogo:** `(work)/artists/page.tsx` dopo `31baf149`:
```tsx
import NewArtistButton from "@/components/artists/NewArtistButton";
...
<header className="mb-6 flex items-center justify-between gap-4">
  <PageTitle>Artists</PageTitle>
  <NewArtistButton />
</header>
...
<p className="mt-1 text-sm text-muted">
  Create one with &ldquo;New artist&rdquo; above, or from a
  night&rsquo;s line-up on the event form.
</p>
```
Nel file Venues: header `:102-104`, stato vuoto `:117-122`, e il commento `:107-116` (*«`CreateVenueModal` has exactly one importer»*) diventa «two importers». La regola del commento resta: lo stato vuoto **non dice dove sia** alcuna sede. La guardia di pagina (`:79-83`, `organizer.access`) non cambia.

### `src/app/(admin)/admin/venues/actions.ts` (server action, CRUD) — opzionale per D-53-09

**Guardia da riusare, non allargare** (`actions.ts:64-85`):
```ts
async function assertCatalogueManage(): Promise<{ userId: string }> {
  const { capabilities, userId } = await getAccessContext();
  if (!capabilities.has(CAP.CATALOGUE_MANAGE)) {
    throw new Error("forbidden.catalogue_manage_required");
  }
  ...
}
```
`createVenue` (`:122-184`) usa il **client cookie** (`:131`, commento ⚠ «Do not swap it»), quindi la RLS `venues_insert_organizer` rifiuta una seconda volta. Se il planner paga il rifiuto tipizzato, l'analogo e' nello stesso file: `UpdateVenueRefusal` (`:207-234`) + `UpdateVenueResult` (`:236-238`):
```ts
export type UpdateVenueResult =
  | { ok: true }
  | { ok: false; reason: UpdateVenueRefusal };
```
con i valori `not_permitted`, `identity_missing`, `write_failed` e uno nuovo per `23505` (oggi `throw new Error("A venue with this name already exists")`, `:176-177`, redatto da Next in produzione). I due chiamanti (`EventForm.tsx` e `NewVenueButton`) leggono lo stesso valore; il modal oggi distingue solo per *stage* (`CreateVenueModal.tsx:48-69`). Se non si paga: il debito e' gia' scritto in `CreateVenueModal.tsx:63-69`, va solo citato nel SUMMARY.

---

### `supabase/migrations/20261014xxxxxx_production_tools_removal.sql` (**nuovo**, migration di sola rimozione)

**Analogo:** `supabase/migrations/20261001120200_gallery_removal.sql` (372 righe). Il timestamp va dopo `20261013150000_mixed_tiers_entry_until.sql` (l'ultima oggi). Sezioni da copiare nell'ordine:

**Intestazione** (`gallery_removal.sql:1-80`): decisione con data, *«SI APPLICA DOPO IL DEPLOY DEL CODICE»* (`:10-28`), *«UNA TRANSAZIONE SOLA, E NON C'E' `BEGIN;`»* (`:31-37`, `/database/migrations` avvolge il corpo), *«COSA QUESTA MIGRATION NON FA»* (`:39-62`: qui → non tocca la quarantena `event-media-quarantine`/`event_media_quarantine_insert_staff`, che serve alla cover; non cancella il bucket `visual-archive` dall'SQL; non cancella dati), reversibilita' (`:64-69`), e l'avviso finale (`:71-72`): *«QUESTO FILE E' UNA PUBBLICAZIONE (repo pubblico): nessun path di oggetto, nessun identificativo di riga, nessuna serata, nessuna sede, nessun account.»*

**1. Precondizioni a zero** (`gallery_removal.sql:94-133`), una per tabella che esce piu' le righe di Visual in `production_section` e quelle di tre sezioni in `production_open_question`, piu' gli oggetti di `'visual-archive'`:
```sql
DO $$
DECLARE v_righe integer; v_oggetti integer;
BEGIN
  IF to_regclass('public.event_media') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.event_media' INTO v_righe;
  ELSE
    v_righe := 0;
  END IF;
  SELECT count(*) INTO v_oggetti FROM storage.objects WHERE bucket_id = 'event-media';
  IF v_righe > 0 THEN
    RAISE EXCEPTION 'public.event_media ha ancora % righe: ...', v_righe
      USING HINT = 'La rimozione per chiave e'' un passo PRIMA di questa migration ...';
  END IF;
  ...
END;
$$;
```
**2. Policy prima delle tabelle** (`:153-157`, *«va tolta PRIMA della tabella»*): `DROP POLICY IF EXISTS visual_archive_select_visual ON storage.objects;` (creata da `20260817120400_visual_archive_bucket.sql:198-208`), `production_section_select_visual`, le tre `production_open_question_select_{visual,location,calendar}`.

**3. La policy brand-wide riscritta PRIMA di togliere le chiavi** (D-53-04). Forma di partenza, `20260817120300_production_sections_access.sql:321-332`:
```sql
CREATE POLICY production_open_question_select_brandwide ON public.production_open_question
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    section IS NULL
    AND (
      (SELECT private.has_capability('production.manifesto.manage'))
      OR (SELECT private.has_capability('production.visual.manage'))
      OR (SELECT private.has_capability('production.location.manage'))
      OR (SELECT private.has_capability('production.calendar.manage'))
    )
  );
```
Riscrittura: `DROP POLICY IF EXISTS ... _brandwide` + `CREATE POLICY` con il solo termine `production.manifesto.manage` e `section IS NULL` invariato (stessa coppia DROP/CREATE del file d'origine, `:276-280`). La ragione sta in `gallery_removal.sql` HINT di `v_lettori`: *«Una chiave non si cancella finche' una policy la legge: la policy diventerebbe un rifiuto silenzioso e permanente.»*

**4. Tabelle senza `CASCADE`, poi le funzioni orfane** (`:181-183`, ragione `:171-179`):
```sql
DROP TABLE IF EXISTS public.event_media;
DROP FUNCTION IF EXISTS private.event_media_require_party();
```
Qui: ordine figli → padri (`production_lineup_slot`, `production_checklist_item`, `production_piece`, `production_commitment`, `production_plan`, `production_import_run`, `production_pipeline_rule`, `production_space_attribute`, `production_space`, `production_visual_asset`); poi `DROP FUNCTION IF EXISTS public.refuse_production_plan_renumber()` e `public.record_checklist_tick(uuid, boolean, uuid, text)` (firme in `53-RESEARCH.md` §1.7); poi `ALTER TABLE public.party_series DROP CONSTRAINT IF EXISTS party_series_ics_alias_unique, DROP COLUMN IF EXISTS ics_alias`.

**5. Il `CHECK` di `production_section` riscritto** — forma di `gallery_removal.sql:195-201`:
```sql
ALTER TABLE public.party_assignments
  DROP CONSTRAINT IF EXISTS party_assignments_capability_assignable;
ALTER TABLE public.party_assignments
  ADD CONSTRAINT party_assignments_capability_assignable
  CHECK (capability IN ('door.operate', 'door.supervise', 'party.manage'));
```
Qui: `production_section_section_check` (nome in `20260817120200_production_sections.sql:151-152`) → `CHECK (section IN ('manifesto'))`.

**6. Concessioni poi chiavi, esplicite** (`gallery_removal.sql:227-231`):
```sql
DELETE FROM private.role_capabilities
 WHERE capability IN ('gallery.view', 'media.upload');
DELETE FROM private.capabilities
 WHERE key IN ('gallery.view', 'media.upload');
```
Qui: tre chiavi `production.{calendar,location,visual}.manage`, 6 concessioni.

**7. Il `DO` di rilettura** (`gallery_removal.sql:243-354`): tabelle assenti (`to_regclass`), funzioni assenti (`to_regprocedure`), nessuna policy su `storage.objects` col letterale **quotato** `'%''visual-archive''%'`, quarantena presente esattamente 1 volta, `v_lettori` (policy che leggono le tre chiavi) nullo, `v_chiavi <> 11`, `v_concessioni <> 20`, `v_staff <> 0`, `event-images` pubblico, `CHECK` di `production_section` senza `visual`, policy `_brandwide` presente e senza le tre chiavi.

**8. Commenti ricontati** (`gallery_removal.sql:368-371`): `COMMENT ON TABLE private.capabilities` (11) e `private.role_capabilities` (20: master 11, organizer 9, staff 0, attendee 0).

---

### `scripts/purge-production-tools.mjs` (**nuovo**, atto per chiave, batch)

**Analogo:** `scripts/purge-attendances.mjs` (551 righe). Da copiare: rifiuto prima di tutto, modi obbligatori, autorizzazione consumabile per la produzione, `fail(category, …)`, `sql()` con `readOnly` esplicito, cattura degli id dalla stessa interrogazione che li conta, `delete … where id = ANY(…) returning id`, controllo `delete_short`, riconteggio da **fonte diversa** (PostgREST con chiave di servizio, URL verificato contro il ref).

**Rifiuto e modi** (`purge-attendances.mjs:124-149`):
```js
const PRODUCTION_REF = "…";   // gia' presente negli script, non ricopiarlo nei piani
const REF = valueOf("--project") ?? process.env.LAB_PROJECT_REF ?? null;
function refuse(message) { console.error(`RIFIUTO: ${message}`); process.exit(2); }
if (!DRY_RUN && !APPLY) { refuse("serve --dry-run oppure --apply. ..."); }
if (DRY_RUN && APPLY) { refuse("--dry-run e --apply insieme non significano niente. ..."); }
```
**Autorizzazione datata per la produzione** (`:155-200`, `readAuthorisation`): blocco `<!-- …: grant -->` con `act`, `target: production`, `granted: yes`, `granted_on`, `spent: no`; confronto con `--dated`; marcatura `spent: yes` + `spent_at` **dopo** l'atto (`:532-541`).

**Errori per categoria** (`:135-138`): `console.error(\`[purge-attendances.${category}] ${detail}\`); process.exit(1);`

**L'atto per chiave** (`:489-520`):
```js
const quote = (arr) => arr.map((x) => `'${String(x).replace(/'/g, "''")}'::uuid`).join(", ");
const r = await sql(
  `delete from public.attendances where id = ANY(ARRAY[${quote(idDaPorta)}]) returning id;`,
  { readOnly: false }
);
if (cancellate !== catturate) fail("delete_short", `catturate …, cancellate …`);
```
**Contatore da altra fonte** (`:173-206`, `countViaPostgrest`): `Prefer: "count=exact"`, `Range: "0-0"`, `if (!url.includes(REF)) fail("counter_target", …)`.

**Ordine delle tabelle:** quello di `53-RESEARCH.md` §2 (`production_lineup_slot` → … → `production_open_question where section in (...)`), `production_commitment` con `expanded_from` non nullo prima, `production_visual_asset` **dopo** gli oggetti del bucket.

**Oggetti di Storage** — analogo `scripts/seed-lab-music.mjs:210-216` e `:270-279`:
```js
function labGuard(url) {
  if (url.includes(PRODUCTION_REF)) { console.error("RIFIUTO: ..."); process.exit(2); }
  return url;
}
async function labStorageDelete(bucket, key) {
  const res = await fetch(labGuard(`${LAB_URL}/storage/v1/object/${bucket}`), {
    method: "DELETE",
    headers: { apikey: LAB_SRK, Authorization: `Bearer ${LAB_SRK}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [key] }),
  });
  ...
}
```
Il conteggio a due fonti e la cancellazione del bucket seguono i passi registrati nella 52.1 (`52.1-ESITI.md:716-719`, `52.1-AUTHORISATION-GALLERY.md:132`, `:235`): `POST /storage/v1/object/list/visual-archive` (chiave di servizio) **e** `storage.objects` dal catalogo in sola lettura = 0 → `DELETE /storage/v1/bucket/visual-archive` → rilettura «Bucket not found». Nella 52.1 erano passi a mano, non uno script: il planner sceglie, ma i passi sono questi. **Mai `DELETE` SQL su `storage.*`** (`gallery_removal.sql:48-55`).

⚠ **Regola dell'analogo che NON si copia: l'istantanea.** `purge-attendances.mjs` regola 3 (`:38-39`) e `:332` scrivono `.env.attendances-snapshot.<stamp>.json` con **la tabella intera**. Qui D-53-05 dice *nessuna copia*, e la tabella di Location contiene indirizzi di spazi in trattativa. Lo script nuovo registra **solo conteggi e numero di id catturati**, mai il contenuto delle righe ne' i path degli oggetti; il SUMMARY e la VERIFICATION dichiarano che la copia non e' stata chiesta (D-53-05). Restano valide le regole 1, 2, 4 e 5 dell'analogo (contare, enumerare le cascate da `pg_constraint`, cancellare per chiave, ricontare da fonte diversa).

---

### `scripts/lab-apply-migration.mjs` (script, Management API) — D-53-07

**Analogo:** `scripts/lab-bootstrap.mjs`, l'unico script che gia' usa `/database/migrations` e legge il registro. Rifiuto del ref di produzione come prima riga eseguita: gia' presente (`lab-apply-migration.mjs:19-29`), **si conserva**.

Chiamata che annota il registro (`lab-bootstrap.mjs:214-217`):
```js
const res = await api("/database/migrations", {
  method: "POST",
  body: JSON.stringify({ name: f.replace(/\.sql$/, ""), query: readFileSync(`${dir}/${f}`, "utf8") }),
});
```
Lettura del registro, in sola lettura (`lab-bootstrap.mjs:202`):
```js
registrate = new Set(JSON.parse(await query(
  `select name from supabase_migrations.schema_migrations`, "registro")).map((r) => r.name));
```
Oggi lo script fa `query(sql, …)` su `/database/query` (`:42-54`). La modifica: il corpo della migration passa da `/database/migrations` con `name = basename` (gia' calcolato a `:53`); `/database/query` resta solo per le riletture `read_only: true` (`:62-66`). Prima di applicare, una lettura del registro dice se il nome e' gia' annotato (stessa query di sopra) — e la **stessa lettura in sola lettura** va fatta sul registro di produzione prima della migration di produzione (D-53-07; `52.4-VERIFICATION.md:208` registra che la 52.4 in produzione e' passata da `/database/query`).

---

### `scripts/verify-capabilities.mjs` (gate su DB vivo)

**Analogo:** il paragrafo della gallery nello stesso file (`verify-capabilities.mjs:291-320`). Copiare la forma: titolo `── Da 14 a 11 il 2026-10-14, fase 53 — ed e' una RIMOZIONE ───`, le chiavi che escono, *«Le sei concessioni che escono»*, la riga ⚠ su `staff` a zero, e il blocco dell'intervallo rosso:
```js
 * ⚠ ROSSO CONTRO LA PRODUZIONE E IL LABORATORIO finche' M-D non e' applicata:
 * ... Fino ad allora un run riporta 16 dove questo file dice 14 (e 31
 * concessioni dove dice 26), ed e' il gate che funziona. **Non si ripara
 * editando questa costante.** Se un run in quell'intervallo riporta 14,
 * M-D e' stata applicata prima del deploy: e' un reperto, non un sollievo.
 */
const EXPECTED_KEY_COUNT = 14;
```
Righe da togliere nelle matrici per ruolo: `:482-485` (master), `:541-544` (organizer), `:675-689` (staff), `:764-767` (attendee). Forma della lapide di riga, `:486-487`:
```js
// `gallery.view` stava qui, GRANTED (D-52-12, plan 52-06) — uscita con la
// gallery il 2026-10-02 (piano 52.1-18, DBT-13).
```
Anche il paragrafo `:206-207`, che racconta l'ingresso delle quattro chiavi di produzione, si legge e si completa con l'uscita delle tre.

### `scripts/verify-section-surface.mjs`, `scripts/verify-section-export.mjs` (gate offline) — ristretti a Manifesto

**Analogo:** se stessi. `SCOPE` (`verify-section-surface.mjs:117-125`) passa da sette a tre percorsi:
```js
const SCOPE = [
  "src/app/(admin)/admin/(work)/manifesto",
  "src/app/(admin)/admin/manifesto",
  "src/lib/production/sections",
];
```
Il gate **rifiuta (exit 2)** se un percorso manca: restringerlo nello stesso commit della cancellazione e' obbligatorio. Escono i controlli A (stadio, `:521`), B (provenienza, `:555`), D (palette, `:684`); restano C (*the void is declared*, `:618`, citato da `SectionVoid.tsx:10`) e il controllo del log (`:772`). Le descrizioni in `verify-all.mjs:366-385` si riscrivono («three production sections' seven directories» → una sezione, tre directory; «the two export modules» → uno).

### `scripts/conversion-manifest.mjs`

**Analogo:** `PENDING_SURFACES` (`:298-314`) — restano solo la voce `manifesto/**`:
```js
[
  "src/app/(admin)/admin/(work)/manifesto/**",
  "the sound manifesto section — built by PHASE 45, and its debt. ...",
],
```
`checkManifest()` rifiuta un glob che non trova `page.tsx` (`:1355-1380`): le tre voci escono **nello stesso commit** delle pagine. Il paragrafo aritmetico (`:950-965`, «26 page files … 1 + 19 + 6 = 26», gia' sbagliato oggi a 25) si riscrive con la forma che ha gia': *«RE-MEASURED <data> by <piano>, because that count is history and a stale count is read as a current one»* e il riconteggio misurato dopo (atteso 20: va contato, non preso da qui). ⚠ `verify-conversion.mjs` ha 3 byte NUL: `/usr/bin/grep -a` o Read.

### `scripts/verify-all.mjs` (runner)

Escono cinque righe: `verify:ics-reachable` (`:257-263`), `verify:ics-grammar` (`:264-283`), `verify:mirror-guards` (`:284-300`), `verify:calendar-surface` (`:358-364`) da `OFFLINE`; `verify:ics` da `NEEDS_MATERIAL` (`:430-438`). Nessun precedente di lapide nel runner: si tolgono e basta, la riconciliazione `:495-545` e' la prova.

### `scripts/seed-lab-door.mjs` (seme del laboratorio)

**Analogo:** la lapide della tabella delle presenze nello stesso blocco (`seed-lab-door.mjs:526-533`):
```js
  // **Una settima riga stava qui e non c'e' piu'.** La tabella delle presenze,
  // ... e' uscita dallo schema il 2026-09-22 (D-51-14, migration `20260922180000`).
  // E' uscita anche da questo elenco **nello stesso atto**: un `delete from` su
  // una tabella inesistente prende `42P01`, e questa funzione solleva ...
```
Escono `"production_plan"` e `"production_space"` dall'array `tabelle` (`:547`, `:551`) e il paragrafo `:535-538` che li giustifica; **stesso commit della migration** (Pitfall 9). La lapide nuova descrive le tabelle senza ricopiarne il nome se il grep di CUT-01 le cerca.

### `scripts/verify-refusal.mjs`

Si riscrive l'elenco `:173-227` (tabelle di calendar, location, visual). **Non si esegue** in questa fase: conia sessioni vere (`ai-engineering.md`, gate *uno strumento che conia sessioni e' un atto*). Il piano lo nomina fra gli strumenti vietati all'esecutore.

---

### Persona: `CLAUDE.md`, `.claude/rules/*.md`, `.claude/CHANGELOG.md` — CUT-04 e CUT-06

**Analogo del changelog di una rimozione:** `[1.30.0] - 2026-10-02` (`CHANGELOG.md:243-297`, la gallery). Struttura da copiare, nell'ordine:
1. `### Changed — <frase di dominio>: <file toccati>`
2. **Cosa e' cambiato.** — per file.
3. **Perche'.** — piano, decisione, e la frase *«`verify:persona` e' stato lanciato **dopo** le cancellazioni»* (memoria *verify-persona-after-deleting-surfaces*).
4. **Prova per mutazione** (solo se si tocca un glob o un controllo): rompere, asserire che la mutazione e' applicata, leggere il rosso, ripristinare.
5. **Caso peggiore rimisurato.** — file, moduli, byte e token **prima** e **dopo**, margine.
6. **Scenario di carico e scatto.** — un file reale, i moduli attesi, la modifica-tipo che fa scattare il gate.

**Analogo del pagamento del budget:** `[1.33.0]` (`CHANGELOG.md:30-35` e `:44-60`): *«il riquadro storico … e' ridotto da 842 a 406 byte: restano il fatto … e la regola …; esce la narrazione. Nessuna regola tolta.»* e la riga dei numeri: *«Dopo il taglio del riquadro: **53.794 byte ≈ 14.943 token su 15.000, margine 57**.»* D-53-08: saldo netto ≤ 0 byte su `CLAUDE.md`, `meta-gates.md`, `access-gating.md`, `checkin-offline.md`, `nextjs-architecture.md`.

**Analogo del conteggio dei cron:** `[1.28.1]` (`CHANGELOG.md:348-375`): contare su **due fonti** (voci di `vercel.json`, directory sotto `src/app/api/cron/`) prima di scrivere «sette»; la riga di `meta-gates.md` («Gli **otto** cron», riquadro 2026-09-30) si corregge nello stesso commit che toglie la voce. Stesso numero in `ticketing-payments.md:45`, che elenca `production-mirror` per nome:
```
- **Gate cron non atomico**: I cron — **otto** al 2026-09-30: `event-reminders`, `venue-reveal`,
  `refund-expired-tokens`, `reconcile-refunds`, `reconcile-email-deliveries`, `production-mirror`,
  `retry-failed-orders`, `close-pending-orders` — ...
```
**`media-and-storage.md`** — banner datato in testa come quello della gallery (`media-and-storage.md:7-11`, *«La gallery non esiste piu'»*), poi le tre righe: *Before Touching* (`:18`, «archivio del visual»), la riga *Archivio del visual* della tabella dei percorsi (`:30`), il gate *chi carica ha titolo* (`:64`, «archivio = `production.visual.manage`»); il gate *l'archivio ha un padrone* (`:66`) parla di materiale editoriale e non di codice: rileggerlo, non toglierlo d'ufficio. I `paths:` (`src/lib/media/**`, `src/app/api/media/**`) restano vivi: zero glob morti (controllo A), da **dire** rimisurato.

**`production-calendar.md`** — gate *il feed non e' il calendario* e l'imperativo *«defend in the import»*: si **rovesciano con la data** (regola di casa scritta in `nextjs-architecture.md`, *«rovesciata qui, non tolta in silenzio»*), il modulo resta.

**CUT-06 (ultima onda)** — `CLAUDE.md` Operating Principle 1 (rinvio alla «fase 57», che non esiste piu'), `community-membership.md` (intestazione «la riprende la fase 57» e la citazione di `PROJECT.md`), `access-gating.md` (gate *coerenza navigazione/permessi*: «catalogo a **14 chiavi e 26 concessioni**» → 11 / 20; e cita `roles.ts:615` per `getNavigation`, oggi a `:653`), `.planning/PROJECT.md:9`, `.planning/STATE.md:23,166` e l'avviso `:25-29`. Nessun nuovo criterio di community si scrive qui (`community-membership.md`, Deferred).

### `53-PROCEDURES.md`, `53-VERIFICATION.md`

**Analogo:** `52.4-VERIFICATION.md` (frontmatter `status`, `approval`, `requirements_*`, `gates_red`, `environment`, `production`, `evidence`; una sezione per requisito con `file:riga` e passo osservato; *Anti-pattern cercati*; *Limiti dichiarati e debito*; *Stato del laboratorio lasciato*; *Produzione*) e `52.1-PROCEDURES.md` per la forma dei passi (ruolo, indirizzo, cosa si osserva). Le sette procedure sono gia' scheletrate in `53-RESEARCH.md` §6.2 (P-53-A..G).

---

## Pattern condivisi

### Codice prima, schema dopo, e l'intervallo rosso dichiarato
**Fonte:** `gallery_removal.sql:10-28`, `verify-capabilities.mjs:311-319`.
**Si applica a:** migration, `verify-capabilities.mjs`, piani di laboratorio e produzione.
Il codice nuovo non nomina piu' tabelle ne' chiavi → deploy `READY` → righe e oggetti per chiave → migration. Fra deploy e migration `verify:capabilities` e' rosso **per costruzione** e lo dice per nome. Dopo la migration di produzione **nessun Instant Rollback** (resusciterebbe il cron, Pitfall 5 della ricerca).

### Lapidi, non silenzi — e il grep a zero
**Fonte:** `roles.ts:421-426`, `database.ts:432-441`, `seed-lab-door.mjs:526-533`, `verify-capabilities.mjs:486-487`.
**Si applica a:** ogni file che resta e perde una parte.
Una riga datata dice *che c'era* e *perche' e' uscito*, con la decisione (D-53-0x). **Non ricopia l'identificatore cancellato**, perche' il grep di CUT-01 (pattern in `53-RESEARCH.md` Pitfall 1) deve tornare a zero su `src/`, `scripts/`, `vercel.json`, `package.json` e sulla migration nuova — eccezione dichiarata: la migration nuova nomina per forza tabelle e chiavi che toglie, e il piano deve dire come il grep la tratta.

### La navigazione decide la visibilita', mai l'accesso
**Fonte:** `roles.ts:345-351` (*«This is a visibility change and nothing else»*), `staff-tabs.ts:380-386`, `access-gating.md` gate *coerenza navigazione/permessi*.
**Si applica a:** `roles.ts`, `AppNav.tsx`, `NewVenueButton.tsx`.
Nessun controllo nuovo sulla porta (`DoorSurface.tsx:134-144`, `requireDoorOperator`, middleware invariati); nessuna scrittura nuova (il bottone allarga solo dove il form si raggiunge, `createVenue` decide).

### Zero fallimenti silenziosi
**Fonte:** `purge-attendances.mjs:135-138` (`fail(category, …)`), `CreateVenueModal.tsx:48-69`, `actions.ts:186-238`.
**Si applica a:** script nuovo, modifica a `lab-apply-migration.mjs`, eventuale rifiuto tipizzato di `createVenue`.
Ogni uscita d'errore ha una categoria nel prefisso; nessun `catch` che collassa cause; nel prodotto non c'e' error tracking (`meta-gates.md`), quindi un rifiuto che conta deve essere **visibile** a chi preme.

### Laboratorio prima, e il rifiuto del ref di produzione come prima riga
**Fonte:** `lab-apply-migration.mjs:19-29`, `purge-attendances.mjs:124-149`, `seed-lab-music.mjs:210-216`.
**Si applica a:** ogni script toccato o creato. Il lab va in pausa dopo una settimana: `restore` prima (memoria *lab-pauses-after-a-week*).

---

## Dove l'analogo NON va copiato

| File | Analogo | Cosa non si copia, e perche' |
|---|---|---|
| `scripts/purge-production-tools.mjs` | `purge-attendances.mjs` | l'**istantanea** del contenuto (regola 3, `:38-39`, `:332`): D-53-05 vieta la copia, e Location contiene indirizzi di spazi in trattativa |
| migration | `gallery_removal.sql` | la sezione sul `CHECK` di `party_assignments` (`:185-201`): qui nessuna chiave che esce e' assegnabile (il `CHECK` ammette solo le tre della porta e della serata), quindi non c'e' nulla da restringere su quella tabella; il pattern serve invece per `production_section_section_check` |
| `roles.ts` | riga Gallery storica | l'asserzione a caricamento su `resolveRoute` (`36bdd6d0^`, `GALLERY_HREF`): per Check-in la guardia c'e' gia' nel tipo `DOOR_HREF` (`:93-96`), e l'import di `resolveRoute` e' uscito con la gallery — rimetterlo cambia la chiusura degli import di un modulo client |

## Nessun analogo trovato

Nessuno. Ogni file creato o modificato ha un precedente nel repo; i tre casi sopra sono analoghi da copiare **con una differenza dichiarata**.

## Metadati

**Ambito della ricerca degli analoghi:** `src/lib/rbac/`, `src/lib/routes/`, `src/lib/capabilities/`, `src/components/{layout,venues,artists}/`, `src/app/(admin)/admin/{(work)/venues,(work)/artists,venues,manifesto}/`, `src/types/database.ts`, `supabase/migrations/` (gallery removal, production sections access, visual archive bucket, production sections), `scripts/` (lab-apply-migration, lab-bootstrap, purge-attendances, seed-lab-music, seed-lab-door, verify-capabilities, verify-all, verify-section-surface, conversion-manifest), `.claude/CHANGELOG.md`, `.claude/rules/`, commit `31baf149` e `36bdd6d0`.
**File letti:** 27.
**Data:** 2026-10-14.
