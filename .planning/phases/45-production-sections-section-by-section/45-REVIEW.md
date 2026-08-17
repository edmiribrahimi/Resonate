---
phase: 45-production-sections-section-by-section
reviewed: 2026-08-18T00:00:00Z
depth: standard
files_reviewed: 67
files_reviewed_list:
  - src/lib/production/sections/vocabulary.ts
  - supabase/migrations/20260817120100_production_location.sql
  - supabase/migrations/20260817120200_production_sections.sql
  - src/types/database.ts
  - scripts/verify-refusal.mjs
  - scripts/verify-all.mjs
  - supabase/migrations/20260817120000_production_section_keys.sql
  - supabase/migrations/20260817120500_production_read_retire.sql
  - supabase/migrations/20260817120300_production_sections_access.sql
  - supabase/migrations/20260817120400_visual_archive_bucket.sql
  - src/lib/capabilities/keys.ts
  - src/lib/routes/capability-routes.ts
  - src/lib/routes/staff-tabs.ts
  - scripts/verify-capabilities.mjs
  - src/app/(admin)/admin/calendar/actions.ts
  - src/app/(admin)/admin/(work)/calendar/page.tsx
  - src/app/(admin)/admin/(work)/calendar/[id]/page.tsx
  - src/app/(admin)/admin/(work)/calendar/loading.tsx
  - src/app/(admin)/admin/(work)/calendar/[id]/loading.tsx
  - scripts/verify-section-surface.mjs
  - scripts/verify-section-export.mjs
  - src/lib/production/sections/score.ts
  - src/components/production/StageBadge.tsx
  - src/app/(admin)/admin/location/ScoreCell.tsx
  - src/app/(admin)/admin/location/AttributeCell.tsx
  - src/app/(admin)/admin/calendar/CalendarList.tsx
  - scripts/seed-production-spaces.mjs
  - src/app/(admin)/admin/(work)/location/page.tsx
  - src/app/(admin)/admin/(work)/location/loading.tsx
  - src/app/(admin)/admin/(work)/location/[id]/page.tsx
  - src/app/(admin)/admin/(work)/location/[id]/loading.tsx
  - src/app/(admin)/admin/location/SpaceName.tsx
  - src/app/(admin)/admin/location/SpaceList.tsx
  - src/app/(admin)/admin/manifesto/SectionStateBadge.tsx
  - src/app/(admin)/admin/manifesto/SectionVoid.tsx
  - src/app/(admin)/admin/manifesto/OpenQuestionNotice.tsx
  - src/app/(admin)/admin/(work)/manifesto/page.tsx
  - src/app/(admin)/admin/(work)/manifesto/loading.tsx
  - src/lib/production/sections/tokens.ts
  - src/app/(admin)/admin/visual/PaletteSwatches.tsx
  - src/app/(admin)/admin/(work)/visual/page.tsx
  - src/app/(admin)/admin/(work)/visual/loading.tsx
  - src/app/(admin)/admin/location/actions.ts
  - src/app/(admin)/admin/location/SpaceForm.tsx
  - src/app/(admin)/admin/location/StageChangeDialog.tsx
  - src/app/(admin)/admin/location/PromoteSpaceDialog.tsx
  - src/lib/production/sections/write-contract.ts
  - src/app/(admin)/admin/manifesto/actions.ts
  - src/app/(admin)/admin/visual/actions.ts
  - src/app/(admin)/admin/manifesto/refusals.tsx
  - src/app/(admin)/admin/manifesto/SectionForm.tsx
  - src/app/(admin)/admin/manifesto/OpenQuestionForm.tsx
  - src/lib/production/export/manifesto.ts
  - src/lib/production/export/capitolato.ts
  - src/lib/production/sections/export-contract.ts
  - src/app/(admin)/admin/manifesto/export-actions.ts
  - src/app/(admin)/admin/visual/export-actions.ts
  - src/app/(admin)/admin/manifesto/ExportPanel.tsx
  - src/lib/media/finalize.ts
  - src/lib/media/upload-limits.ts
  - src/lib/production/sections/visual-archive.ts
  - src/app/api/media/finalize-archive/route.ts
  - src/app/(admin)/admin/visual/ArchiveUpload.tsx
  - src/lib/media/may-upload.ts
  - src/app/api/media/finalize/route.ts
  - src/components/media/MediaUpload.tsx
  - scripts/verify-media-strip.mjs
findings:
  critical: 2
  warning: 8
  info: 3
  total: 13
status: issues_found
resolved:
  - id: CR-01
    commit: 94cb395
    resolved_at: 2026-08-18
  - id: CR-02
    commit: a00b8f3
    resolved_at: 2026-08-18
open:
  critical: 0
  warning: 8
  info: 3
---

# Fase 45: Code Review Report

**Reviewed:** 2026-08-18
**Depth:** standard
**Files Reviewed:** 67
**Status:** issues_found

## Summary

Rivista la fase 45 — quattro sezioni di produzione dietro quattro chiavi nuove,
cinque tabelle, dieci archi RLS, un bucket privato, due documenti che lasciano
il perimetro e cinque gate `verify:*`.

**Cosa regge, verificato leggendo e non dedotto.** Lo split delle chiavi e' fatto
bene: `staff-tabs.ts:195-296` e `capability-routes.ts:623-864` legano **una
chiave per superficie**, mai un OR fra le quattro; i due moduli di scrittura
delle sezioni autoriali fissano la propria sezione come costante non
raggiungibile dal chiamante (`manifesto/actions.ts:126`,
`visual/actions.ts:113`) e rileggono la riga prima di correggerla
(`loadSection`, `:307-334` e `:274-301`), che e' l'unica cosa che tiene separate
due chiavi su **una** tabella condivisa. Le sei pagine sono `force-dynamic`, il
guard di pagina c'e' su tutte e sei, e **nessuna pagina usa il service client**:
le letture passano dalla RLS. La sequenza dell'upload — quarantena privata →
strip → destinazione, con `destinationBucket` argomento obbligatorio senza
default (`finalize.ts:178-179`) — e' la forma giusta. Nessuna cancellazione per
prefisso, per etichetta o per risalita del DOM in tutta la fase; il cleanup della
promozione e' per chiave primaria su un id catturato alla creazione
(`location/actions.ts:1805-1808`). Nessun segreto, indirizzo, nome di sede o data
non annunciata in nessun file tracciato.

**Cosa non regge.** Due difetti bloccanti, entrambi su percorsi dove il progetto
ha gia' dichiarato per iscritto la regola che il codice viola. **Entrambi chiusi il
2026-08-18** — CR-01 in `94cb395`, CR-02 in `a00b8f3`; i due reperti restano scritti
al presente perche' descrivono il codice al momento della revisione, e ognuno porta
in testa la nota di chiusura. Le otto WARNING e le tre INFO restano **aperte** e non
sono state toccate:

1. **L'archivio scrive i byte prima di validare la riga.** Chi dimentica di dire
   *che cosa e'* fila comunque una fotografia nel bucket privato, la copia di
   transito viene rimossa, la riga non viene scritta, e il messaggio dice
   *«Nothing was recorded»*. L'oggetto resta li' per sempre: nessuna riga lo
   nomina, nessuna superficie lo enumera, nessuno sweep lo raccoglie. E' la
   meta' meccanica della revoca — quella che 45-04 e 45-17 dichiarano acquisita —
   che smette di valere proprio sugli oggetti orfani.
2. **I due documenti che escono dal perimetro riclassificano come regola del
   brand una regola scritta per un format ritirato.** E' letteralmente il
   fallimento che `export-contract.ts:79-87` descrive per giustificare il rifiuto
   dell'intero documento — *«the wrong document with a confident face»* — e qui
   accade senza rifiuto e senza avviso.

Le otto WARNING sono, in gran parte, la stessa disciplina applicata in un posto e
non nell'altro dentro la stessa fase: il predicato sulla `UPDATE` che
`promoteSpace` scrive e documenta e che `closeQuestion` non usa; il pulsante
disabilitato finche' il modulo non e' completo che `OpenQuestionForm` ha e
`ArchiveUpload` no.

Non ripetute qui: DEF-45-01/02/03/09/10/11, gia' registrate in
`deferred-items.md`.

---

## Critical Issues

> **Stato al 2026-08-18: entrambe le CRITICAL sono chiuse.** Le otto WARNING e le
> tre INFO restano aperte e non sono state toccate: allargare il diff avrebbe reso
> piu' difficile verificare i due fix che contano. Restano registrate qui come
> sono.

### CR-01: l'archivio fila i byte prima di validare la riga, e l'oggetto orfano non e' piu' raggiungibile da nessuna superficie

**RISOLTO — commit `94cb395`, 2026-08-18.**

Tre parti, nessuna delle quali tocca il flusso di upload, il bucket o lo sweep:
`whatIsMissing()` calcola la guardia nella stessa forma che `OpenQuestionForm.tsx`
gia' usa (`incomplete` → `disabled`); la stessa guardia e' ripetuta dentro
`submit()`, perche' `disabled` e' una proprieta' di un controllo renderizzato e
non un confine, e risponde con la frase invece di tornare in silenzio; e le sei
frasi di `RECORD_REASON_TEXT` non aprono piu' con *«Nothing was recorded»* — ognuna
di esse scatta DOPO che i byte sono nell'archivio, e ora lo dicono.

**Cosa NON e' chiuso, detto qui e non lasciato dedurre.** `invalid_format_id` e
`invalid_taken_on` restano raggiungibili da una pagina manomessa, e in quel caso
l'oggetto esiste ancora senza riga. La guardia non e' un confine di sicurezza: il
confine sarebbe validare prima di scrivere i byte, oppure un percorso di rimozione
per il bucket — che e' IN-02, ancora aperta. Le frasi ora descrivono quello stato
invece di negarlo.

Verificato: `npm run build` 0 · `verify:section-surface` 0 · `eslint` 0. Nessun
test runner esiste per il prodotto: la prova osservabile resta la procedura scritta
sotto, da eseguire a mano.

Il reperto originale, invariato:

**File:** `src/app/(admin)/admin/visual/ArchiveUpload.tsx:554`, `:263-427`, `:165-178`

**Issue:**
Il pulsante e' abilitato non appena c'e' un file: `disabled={picked === null || busy}`
(`:554`). `kind` parte da `""` (`:219`) e `artistName` da `""` (`:220`), e nessuno
dei due entra nella condizione. La sequenza di `submit()` e' allora:

1. `:307-309` deposito in `event-media-quarantine`;
2. `:332-336` `POST /api/media/finalize-archive` → lo strip riesce e i byte
   vengono scritti in `visual-archive` (`finalize.ts:348-353`);
3. `finalize-archive/route.ts:399-411` — nel `finally`, con `decided === null`,
   la copia di quarantena viene **rimossa**;
4. `:390-396` `recordVisualAsset` rifiuta con `invalid_kind` (o
   `artist_name_missing`, o `invalid_format_id`, o `invalid_taken_on`);
5. `:399` la persona legge *«Nothing was recorded. Say whether this is a
   photograph of an artist…»* (`:166-167`).

Da quel momento esiste un oggetto nel bucket privato **senza riga**. Non c'e'
nessun percorso nel prodotto che possa raggiungerlo: `production_visual_asset` ha
solo `insert` e `select` (verificato: `grep production_visual_asset src/` da
esattamente due `.from(...)`, `visual/actions.ts:356` e `:446`), la pagina
disegna solo le righe, `signVisualAssets` firma per `id` di riga, e non esiste
sweep per `visual-archive` — quello descritto in `finalize.ts:394-409` copre solo
la quarantena.

**Perche' e' Critical e non un fastidio.** Tre conseguenze, tutte dichiarate
altrove come inaccettabili:

- **La revoca non funziona sull'orfano.** DEF-45-11 e
  `20260817120400_visual_archive_bucket.sql:227-235` tengono per buona *«la meta'
  meccanica della revoca»* — «the service role can remove any object here at any
  time, from a Server Action guarded by the visual section key». Per un oggetto
  orfano quella frase e' falsa in pratica: nessuna Server Action ne conosce la
  chiave. La fotografia di una persona riconoscibile resta conservata senza modo
  di toglierla dal prodotto (`legal-compliance.md`, gate *immagini delle persone*;
  `media-and-storage.md`, gate *moderazione = rimozione*).
- **Il messaggio descrive male il mondo.** `write_failed` (`:176-177`) dice
  correttamente *«The picture is in the archive but its entry was not written…
  Tell somebody»*; le altre quattro dicono *«Nothing was recorded»*, che chi
  legge intende come *non e' successo niente*. E' `meta-gates.md`, *zero
  fallimenti silenziosi*, nella forma che questo repo ha gia' registrato una
  volta (DEF-45-10): non un errore ingoiato, un errore **descritto male** — e qui
  con in piu' un effetto persistente.
- **La stessa fase sa gia' come si fa.** `OpenQuestionForm.tsx:149-150` calcola
  `incomplete` su tutti e tre i campi obbligatori e lo passa a
  `disabled={working || incomplete}` (`:249`). Non e' una tecnica da inventare, e'
  una riga che manca in un file.

**Fix:**
```tsx
// ArchiveUpload.tsx — a) niente byte prima che la riga sia valida
const incomplete =
  picked === null ||
  kind === "" ||
  (kind === "dj_photo" && artistName.trim() === "") ||
  (takenOn !== "" && !isCalendarDate(takenOn));

<Button className="w-full" onClick={submit} disabled={incomplete || busy}>

// b) e la stessa guardia dentro submit(), perche' il bottone non e' un confine
const submit = async () => {
  if (picked === null || busy) return;
  const draftCheck = validateVisualAsset({
    kind, object_key: "placeholder", artist_name: artistName,
    format_id: formatId, taken_on: takenOn,
  });
  if (!draftCheck.ok && draftCheck.reason !== "object_key_missing") {
    setOutcome({ tone: "crit", message: RECORD_REASON_TEXT[draftCheck.reason] });
    return;                       // nessun deposito, nessun oggetto filato
  }
  ...
};
```
E, indipendentemente dal fix sopra, correggere le quattro frasi di
`RECORD_REASON_TEXT` che oggi dicono *«Nothing was recorded»* dopo che un oggetto
E' stato filato: devono dire cosa esiste adesso, come fa gia' `write_failed`.

**Verifica osservabile** (non esiste test runner): scegliere una foto, non
toccare *What is it?*, premere *File it*. Atteso dopo il fix: il pulsante e'
inerte e la frase dice cosa manca; nessuna richiesta parte. Prima del fix:
`POST /api/media/finalize-archive` risponde `200 {ok:true}` e la riga non viene
scritta — verificabile leggendo `storage.objects` del bucket `visual-archive` e
confrontando il conteggio con `select count(*) from production_visual_asset`.

---

### CR-02: i due documenti che escono dal perimetro presentano come regola del brand una regola di un format ritirato

**RISOLTO — commit `a00b8f3`, 2026-08-18.**

`brandWide` e' ora definito in **positivo** — `format_id === null`, e nulla altro —
in entrambi i serialiser, e `scopeOf()` fa la stessa cosa per `renderQuestions`:
`the whole brand` si dice per una ragione sola. Il catalogo si legge **intero**
(`retired_at` selezionato, filtro rimosso dalla query) e si divide in due: `named`
per nominare, `listed` per i titoli e l'ordine.

**Le cause erano tre, non due.** Oltre a *nessun format* e *format ritirato* c'e'
la lettura sotto RLS: `formats_select_listed` restituisce i `listed`, il resto
richiede `catalogue.manage`, che questi due arm non chiedono — quindi un format
non listed e' invisibile al modulo. Definire `brandWide` in positivo chiude tutte
e tre per costruzione, invece che con una condizione da tenere completa.

**La decisione presa, dichiarata perche' e' una decisione.** Una regola di format
ritirato **non esce**. L'alternativa suggerita qui sotto — un titolo proprio
marcato *retired* — e' stata pesata e rifiutata: un titolo e' `## Nome · CODE`,
cioe' la **sigla**, e `production-calendar.md` lo dice come gate (*una sigla
ritirata non si cita, nemmeno per spiegare la storia*), con il verso opposto in
`brand-visual-system.md` (*ogni materiale porta la sigla come e' oggi*).
Stamparla in un documento che va a chi produce materiale scambierebbe
un'attribuzione sbagliata con un invito a produrre per un format ritirato.

Presa la seconda strada che questo stesso reperto autorizzava: **esclusa
esplicitamente e contata, mai riclassificata.** `renderWithheld` conta le regole
trattenute dentro il documento, con due frasi distinte — *ritirato* e *non nella
risposta del catalogo* mandano chi legge da due persone diverse — e **i conteggi
non nominano nessun format, nessuna sigla e nessun titolo di regola**, perche' un
titolo puo' portarsi dentro il nome. E' la stessa posizione che `capitolato.ts`
prende gia' per la palette (D-45-09).

**Le domande aperte restano nel documento**, con uno scope che dice la verita'
senza nominare il format. L'asimmetria e' voluta: una regola dice cosa fare, una
domanda aperta dice cosa non decidere — togliere un avviso e' peggio che togliere
un'istruzione, ed e' la ragione per cui un registro che non risponde fa rifiutare
l'intero documento.

Il perimetro non e' stato allargato: nessuna tabella in piu', nessun campo in piu'
nell'allow-list. `retired_at` e' un timestamp, non porta ne' indirizzo ne' data non
annunciata, e nulla lo stampa.

Verificato: `npm run build` 0 · `verify:section-export` 0 (censimento eseguito,
credenziali presenti) · `verify:section-surface` 0 · `eslint` 0. La verifica
osservabile scritta sotto resta da eseguire a mano.

Il reperto originale, invariato:

**File:** `src/lib/production/export/manifesto.ts:283-289` e `:387-393`;
`src/lib/production/export/capitolato.ts:245-251` e `:405-412`

**Issue:**
Il catalogo e' letto filtrando i ritirati:

```ts
// manifesto.ts:195-199 — identico in capitolato.ts:184-188
.from("formats").select("id, name, code").is("retired_at", null)
```

e la mappa `named` e' costruita solo su quei format (`:239`). Il raggruppamento
poi fa:

```ts
// manifesto.ts:283-285
const brandWide = sections.filter(
  (row) => row.format_id === null || !named.has(row.format_id)
);
```

`!named.has(row.format_id)` e' vero per **due** ragioni diverse e le tratta come
una sola: *questa regola non appartiene a nessun format* e *questa regola
appartiene a un format che e' stato ritirato*. La seconda finisce sotto
`## Across the whole brand` — cioe' una regola scritta per un format viene
consegnata a un terzo come regola dell'intero brand. Lo stesso in
`renderQuestions` (`:387-393`): `named.get(format_id) ?? null` → `scope = "the
whole brand"`.

**Perche' e' Critical.** Non e' un'etichetta imprecisa, e' esattamente la
condizione per cui il contratto di questi due moduli **rifiuta l'intero
documento**:

> `export-contract.ts:79-87` — *«A document assembled without the catalogue would
> print every rule under one undifferentiated heading — so a rule written for one
> format would be read as a rule of the brand by whoever was handed it. That is
> not a missing label; it is the wrong document with a confident face.»*

Il modulo rifiuta di produrre nulla se il catalogo non risponde, e poi produce in
silenzio la stessa deformazione quando il catalogo risponde ma un format e'
ritirato. Ed e' raggiungibile: ritirare un format e' un atto ordinario del
catalogo, `production_section.format_id` e' una FK senza vincolo di ritiro
(`20260817120200_production_sections.sql:113`), e le regole gia' scritte per quel
format restano. Il documento va a chi entra in console e al grafico esterno, e
`brand-visual-system.md` — *il colore non si eredita*, *la grafica non anticipa
il suono* — poggia interamente sul fatto che una regola resti attaccata al
format per cui e' stata scritta.

**Fix:** distinguere le due cause. Il filtro sui ritirati serve all'**ordine di
lettura**, non all'**etichettatura**:

```ts
// leggere il catalogo INTERO per nominare, e i soli attivi per ordinare
const { data: formatData, error: formatError } = await supabase
  .from("formats")
  .select("id, name, code, retired_at")
  .order("sort_order", { ascending: true });
...
const named = new Map(formats.map((f) => [f.id, f]));           // tutti
const listed = formats.filter((f) => f.retired_at === null);    // solo attivi

for (const format of listed) { /* ...invariato... */ }

// i ritirati mantengono il loro titolo, marcato
const retiredWithRules = formats.filter(
  (f) => f.retired_at !== null && sections.some((r) => r.format_id === f.id)
);
for (const format of retiredWithRules) {
  out.push(`## ${format.name} · ${format.code} — retired format`, "");
  for (const row of sections.filter((r) => r.format_id === format.id)) {
    out.push(...renderSection(row));
  }
}

// e brand-wide torna a significare UNA cosa sola
const brandWide = sections.filter((row) => row.format_id === null);
```
Se invece si decide che una regola di format ritirato non deve uscire affatto,
va **esclusa esplicitamente e contata**, mai riclassificata.

**Verifica osservabile:** scrivere una regola sotto un format, ritirare quel
format dal catalogo, produrre il documento. Atteso: la regola compare sotto il
nome del format con la marcatura *retired*, mai sotto *Across the whole brand*.

---

## Warnings

### WR-01: il download del documento viene revocato nello stesso tick del click, e il pannello dichiara successo comunque

**File:** `src/app/(admin)/admin/manifesto/ExportPanel.tsx:130-142`

**Issue:** `URL.revokeObjectURL(url)` (`:137`) e' chiamato in modo sincrono subito
dopo `anchor.click()` (`:135`). Su piu' di un browser il download non e' ancora
partito a quel punto e viene annullato: l'utente non riceve alcun file, mentre
`:139-142` scrive comunque *«{filename} was produced and saved. Read it before
you send it.»* E' un fallimento silenzioso con sopra un messaggio di successo, in
un prodotto senza error tracking — e sull'unico atto della fase che esiste per
consegnare qualcosa a un terzo.

**Fix:** ritardare la revoca di un tick, tenendo intatta la ragione per cui esiste
(non lasciare una copia viva nella tab):
```tsx
anchor.click();
window.document.body.removeChild(anchor);
setTimeout(() => URL.revokeObjectURL(url), 0);
```

### WR-02: ogni violazione di unicita' sulla creazione del venue viene riportata come `slug_taken`, e la frase dice «Press again»

**File:** `src/app/(admin)/admin/location/actions.ts:1737-1739`;
`src/app/(admin)/admin/location/PromoteSpaceDialog.tsx:98-99`

**Issue:** `public.venues` porta almeno due vincoli univoci — nome e slug — e il
pre-check sul nome (`:1647-1662`) non e' legato alla `INSERT` che segue. Se un
altro inserimento prende il **nome** fra il pre-check e la scrittura, PostgREST
risponde `23505` e l'atto lo classifica `slug_taken`. Il pannello dice allora
*«…which normally means two presses landed in the same instant. Press again.»* —
consiglio corretto per una collisione di slug (che il suffisso assorbe) e
sbagliato per una collisione di nome, che **non si risolve mai** ripremendo,
perche' il nome non prende suffissi per decisione dichiarata (`:1636-1645`). E'
il pattern *un messaggio per due cause diverse* che il modulo evita ovunque
altrove.

**Fix:** distinguere sul vincolo prima di rispondere.
```ts
if (venueError?.code === UNIQUE_VIOLATION) {
  // il messaggio di PostgREST nomina il constraint; non serve `details`,
  // che porta l'intera riga rifiutata e non va letto qui.
  return {
    ok: false,
    reason: /name/i.test(venueError.message) ? "venue_name_taken" : "slug_taken",
  };
}
```

### WR-03: `closeQuestion` decide su una lettura e scrive senza predicato — due chiusure concorrenti si sovrascrivono la risposta

**File:** `src/app/(admin)/admin/manifesto/actions.ts:442-477`

**Issue:** il controllo `row.closed_at !== null` (`:468`) e' una lettura separata
dalla scrittura (`:474-477`), che filtra solo `.eq("id", id)`. Due chiamate
concorrenti vedono entrambe `closed_at === null`, entrambe aggiornano, e la
seconda **sovrascrive** `resolution` e `closed_at` della prima. Il registro perde
l'unica cosa che stava tenendo — *«closing one means writing what was decided»*
(`:411-419`) — e nessuno se ne accorge: entrambe le chiamate rispondono `ok`.

Lo stesso modulo di fase scrive la disciplina corretta e la argomenta:
`promoteSpace` porta la guardia **sulla `UPDATE`**, con `.select("id")` per poter
leggere il predicato (`location/actions.ts:1748-1773`).

**Fix:**
```ts
const { data: closed, error } = await client
  .from("production_open_question")
  .update({ closed_at: now, resolution: answer, updated_at: now })
  .eq("id", id)
  .is("closed_at", null)      // la guardia viaggia con la scrittura
  .select("id");

if (error) { /* ...write_failed... */ }
if (!closed || closed.length === 0) {
  return { ok: false, reason: "already_closed" };
}
```

### WR-04: `FORMAT_WEIGHTS[formatCode]` e' un accesso non protetto su un oggetto letterale — un `code` come `constructor` fa saltare l'intera superficie location

**File:** `src/lib/production/sections/score.ts:378-381`

**Issue:**
```ts
const criteria = FORMAT_WEIGHTS[formatCode];
if (criteria === undefined) return { kind: "weights_not_declared", format: formatCode };
```
`FORMAT_WEIGHTS` e' un oggetto letterale (`:145-147`), quindi la ricerca cade
sulla catena del prototipo. `formats.code` e' testo libero scritto da chi tiene
`catalogue.manage`: un format con codice `constructor`, `toString`, `valueOf` o
`hasOwnProperty` restituisce un membro di `Object.prototype` — **non**
`undefined` — quindi il ramo `weights_not_declared` non scatta, `criteria.length`
legge una proprieta' di una funzione e `for (const criterion of criteria)` lancia
su un valore non iterabile. Il risultato non e' un punteggio sbagliato per un
format: e' un'eccezione durante il render, che porta giu' la lista **per tutti**
gli spazi.

**Fix:**
```ts
const criteria = Object.hasOwn(FORMAT_WEIGHTS, formatCode)
  ? FORMAT_WEIGHTS[formatCode]
  : undefined;
```
oppure dichiarare `FORMAT_WEIGHTS` come `ReadonlyMap<string, readonly WeightedCriterion[]>`,
che non ha catena di prototipo per le chiavi.

### WR-05: `verify:refusal` revoca in scope globale — chiude tutte le sessioni del master e del membro reale di cui prende in prestito l'identita'

**File:** `scripts/verify-refusal.mjs:557-573`

**Issue:** `admin.auth.admin.signOut(token, "global")` (`:561`) non revoca la
sessione che lo script ha coniato: revoca **ogni** sessione di quell'utente. Il
soggetto e' il master (`:443`) e un membro reale risolto a runtime dalle
`profiles` (`:456-484`). Eseguire il gate quindi disconnette il proprietario e una
persona reale dai loro dispositivi, senza preavviso e senza che il paragrafo di
chiusura (`:604-635`) — che pure conta con cura il costo dell'atto — lo dica. La
riga di prova che lo script stampa (*«token still resolves to a user: false»*,
`:562-569`) resta vera anche con lo scope corretto, quindi non si perde nessuna
evidenza.

**Fix:**
```js
const signedOut = await admin.auth.admin.signOut(token, "local");
```
e, se si preferisce mantenere `global` per una ragione che non ho trovato
scritta, dichiararlo nel paragrafo di chiusura come un effetto sull'ambiente,
accanto agli altri.

### WR-06: `carriesContact` rifiuta prosa legittima, e si applica anche a una colonna che non dichiara quel divieto

**File:** `src/app/(admin)/admin/location/actions.ts:673-679`, `:1310-1312`

**Issue:** due problemi distinti sulla stessa funzione.

**(a) Falsi positivi.** `ITALIAN_MOBILE_SHAPE = /(?:\+?39[\s.-]?)?3\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}/`
non richiede il prefisso e non ha ancoraggi: qualunque sequenza `3xx`, tre cifre,
tre o quattro cifre — separate da spazi, punti o trattini — corrisponde. Una nota
di scouting come *«capienza 350, superficie 400 mq, aperto dal 1930»* matcha
(`350` `400` `1930`), l'atto risponde `note_carries_contact`, e la frase in
`SpaceForm.tsx:141` dice a chi scrive che il testo porta un indirizzo di posta o
un cellulare. E' un rifiuto che scatta su lavoro corretto, che e' il pattern che
questa fase evita esplicitamente altrove (*«un criterio che scatta su lavoro
corretto e' un criterio che viene ignorato la terza volta»*,
`20260817120300:96-98`).

**(b) Perimetro non dichiarato.** La guardia gira anche su `agreementEvidence`
(`:1310`). Il commento della colonna `agreement_evidence`
(`20260817120100_production_location.sql:315-324`) dichiara *«a pointer, never an
attachment — a mail of such a date, a signed contract, an agreement in writing
and where it lives»* e **non** dichiara il divieto di contatti che le colonne
`note` / `short_description` dichiarano (`:193-195`, `:364-365`). Registrare
*«mail del 12 marzo dall'indirizzo del proprietario»* con l'indirizzo dentro
viene rifiutato da una regola che nessuno ha scritto per quella colonna — e sulla
transizione che sblocca il naming di uno spazio nei materiali.

**Fix:**
```ts
// (a) richiedere il prefisso oppure una corsa contigua di 10 cifre,
//     e non lasciare che tre numeri qualsiasi si concatenino
const ITALIAN_MOBILE_SHAPE =
  /(?:(?:\+|00)39[\s.-]?3\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}|(?<!\d)3\d{9}(?!\d))/;
```
```ts
// (b) decidere esplicitamente. Se agreement_evidence NON e' in perimetro:
//     rimuovere la chiamata a :1310 e dirlo nel docblock di changeStage.
//     Se lo E': aggiungere il divieto al commento della colonna, con
//     una migration nuova (`supabase-data.md`, gate migration in avanti).
```

### WR-07: `recordVisualAsset` accetta qualunque `object_key`, e la colonna e' `UNIQUE`

**File:** `src/lib/production/sections/visual-archive.ts:219-222`;
`src/app/(admin)/admin/visual/actions.ts:342-364`

**Issue:** `validateVisualAsset` controlla solo che `object_key` sia una stringa
non vuota. Niente verifica che sia la chiave del chiamante, che abbia la forma a
due segmenti che l'arm di finalize impone (`finalize-archive/route.ts:324-336`),
o che un oggetto esista. Il docblock dichiara la terza assenza (`:330-341` in
`visual/actions.ts`) e non le prime due. Poiche' `production_visual_asset_object_key_unique`
esiste (`20260817120200:332`), chiunque tenga la chiave visual puo' bruciare una
chiave registrando una riga per un oggetto che non ha caricato: il caricamento
legittimo di quell'oggetto non sara' mai piu' registrabile. E' un chiamante
entitled, quindi non e' un'escalation — ma e' una scrittura non intenzionale che
niente rifiuta, su una colonna che non si puo' correggere senza un percorso di
delete che non esiste (vedi IN-02).

**Fix:**
```ts
const OBJECT_KEY_SHAPE =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,5}$/i;   // <caller>/<random>.<ext>

const objectKey = optionalText(draft.object_key);
if (objectKey === null) return { ok: false, reason: "object_key_missing" };
if (!OBJECT_KEY_SHAPE.test(objectKey)) {
  return { ok: false, reason: "object_key_missing" }; // o una causa propria
}
```

### WR-08: dopo la promozione l'indirizzo esiste in due copie che divergono in silenzio, e la copia su cui si costruisce una serata e' quella vecchia

**File:** `src/app/(admin)/admin/location/actions.ts:1716-1723` (la copia),
`:884-959` (`updateSpace`, che continua a poter modificare `address`)

**Issue:** `promoteSpace` **copia** `space.address` dentro la riga `venues`. Da
quel momento `updateSpace` puo' modificare l'indirizzo sullo spazio quante volte
si vuole — non c'e' nessun ramo che rifiuti l'edit dopo la promozione, e non c'e'
nessuna propagazione verso `venues`. La conseguenza e' che la riga su cui una
serata si costruisce, e da cui `public.venue_for_parties` serve un indirizzo,
resta ferma alla versione del momento della promozione, mentre la superficie di
lavoro mostra quella corretta. Nessuna delle due superfici dice che sono due.

L'errore non e' di segretezza — non anticipa nessuna rivelazione — ma e' un
indirizzo sbagliato mandato a chi ha un biglietto, e il canale che lo manda e'
irreversibile quanto l'altro.

**Fix:** due strade, e vanno pesate, non scelte qui:
1. **Dirlo.** Sul form del record, quando `promoted_venue_id !== null`, una riga:
   *«questo spazio e' gia' passato in catalogo; l'indirizzo li' e' una copia, e
   correggerlo qui non lo corregge la'»*, con il collegamento alla scheda venue.
2. **Rifiutare l'edit dell'indirizzo dopo la promozione**, con una causa propria
   (`address_frozen_by_promotion`), e mandare la correzione al catalogo.

La strada che **non** va presa e' propagare in automatico da `updateSpace` verso
`venues`: sarebbe una scrittura sulla tabella da cui parte la strada pubblica,
fatta da un atto che oggi non la nomina.

---

## Info

### IN-01: fallback irraggiungibile in `describePromotionRefusal`

**File:** `src/app/(admin)/admin/location/PromoteSpaceDialog.tsx:134-139`
**Issue:** `PROMOTION_REFUSAL` e' dichiarato `Record<PromotionRefusal, string>`,
cioe' **totale** sull'unione — che e' esattamente la garanzia che
`location/actions.ts:449-462` argomenta. Il `?? \`…which this panel does not
expect.\`` non puo' quindi mai eseguire, e si legge come una rete di sicurezza
che non c'e': un lettore successivo potrebbe credere che il pannello tolleri una
causa senza frase, e togliere la totalita' dal `Record`.
**Fix:** rimuovere il `??` e indicizzare direttamente, lasciando che sia il
compilatore a essere l'unica garanzia — oppure tenere il fallback e dire nel
commento che serve solo contro un payload malformato dal wire.

### IN-02: `visual-archive` non ha ne' sweep ne' percorso di rimozione nel prodotto

**File:** `src/lib/media/finalize.ts:394-409` (lo sweep che esiste, per la
quarantena); `src/app/(admin)/admin/visual/actions.ts` (nessun delete)
**Issue:** `production_visual_asset` ha solo `insert` (`:356`) e `select`
(`:446`). Nessuna Server Action rimuove una riga, nessuna rimuove un oggetto, e
non esiste per `visual-archive` l'equivalente del piano di sweep che
`finalize.ts:407-409` cita per la quarantena. Quindi la frase *«removal stays
possible»* di `20260817120400:227-235` descrive una **capacita' del service
role**, non una funzione del prodotto — e la distinzione conta, perche' e' la
meta' su cui poggia la revoca in DEF-45-11. Companion di CR-01: senza un percorso
di rimozione, l'oggetto orfano non e' recuperabile nemmeno a mano dal prodotto.
**Fix:** non e' una riga di codice — e' la decisione se la sezione visual ha un
atto di rimozione. Se ce l'ha, va dietro la chiave visual, per chiave primaria
della riga, e rimuove **prima** l'oggetto e poi la riga, cosi' che un fallimento
lasci una riga che nomina ancora l'oggetto invece di un oggetto che nessuno
nomina.

### IN-03: `updated_at` viene dall'orologio dell'app in `UPDATE` e da `now()` del database in `INSERT`

**File:** `src/app/(admin)/admin/manifesto/actions.ts:242`, `:279`;
`src/app/(admin)/admin/visual/actions.ts:209`, `:246`;
`src/app/(admin)/admin/location/actions.ts:945`, `:1027`, `:1155`, `:1333`, `:1420`, `:1769`
**Issue:** gli `INSERT` lasciano `created_at` / `updated_at` ai default della
colonna (`DEFAULT now()`, orologio del database), mentre ogni `UPDATE` scrive
`new Date().toISOString()`, cioe' l'orologio del processo Node. Con uno skew di
qualche secondo una riga puo' finire con `updated_at < created_at`, e due righe
scritte a un istante di distanza possono ordinarsi al contrario. Non e' un difetto
di accesso e non ha oggi un consumatore che ci si appoggi; e' un'incoerenza che
costa poco chiudere finche' le tabelle sono vuote.
**Fix:** togliere `updated_at` dai payload e lasciare che sia il database a
scriverlo (un trigger `set_updated_at`, se il repo ne ha gia' uno), oppure
scriverlo esplicitamente in entrambi i rami dalla stessa sorgente. La prima
strada e' l'unica che regge anche per una scrittura che arrivi da fuori
dell'app.

---

_Reviewed: 2026-08-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
