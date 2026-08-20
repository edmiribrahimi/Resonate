---
phase: 58-il-calendario-e-uno-specchio
created: 2026-08-20
files_classified: 20
analogs_found: 18
---

# Fase 58 — Mappa dei pattern

> **Questo documento e' una pubblicazione.** `.planning/` e' tracciato e il repo
> e' pubblico. Ogni estratto qui sotto e' **gia' nel repo pubblico**: nessuna
> data non annunciata, nessuno spazio in trattativa, nessun nome di persona.
> I titoli di esempio riportati sono quelli che `58-CONTEXT.md` ha gia'
> pubblicato, e nessuno porta una data.

> **Cosa NON contiene.** Nessun analogo di test: **non esiste alcun test runner**
> (Guardrail 1). Cio' che sostituisce un test in questo repo e' uno script
> `verify-*.mjs` con tre esiti, oppure una procedura manuale scritta — e i
> pattern di entrambi sono qui.

---

## Classificazione dei file

### File nuovi

| File | Ruolo | Flusso dei dati | Analogo piu' vicino | Qualita' |
|---|---|---|---|---|
| `scripts/verify-ics-grammar.mjs` | gate sintetico | source + modulo, in-process | `scripts/verify-comment-stripper.mjs` (tabella di probe) **+** `scripts/verify-ics-reachable.mjs` (caricamento `.ts` a runtime) | esatto, composto da due |
| `supabase/migrations/…_production_calendar_key.sql` | migration | schema, vocabolario chiuso | `20260809004500_event_media_party_id.sql` (colonna + FK + indice, con la disciplina di idempotenza) **+** `20260815120000_production_calendar.sql:416-464` (forma del `CHECK` di vocabolario e dell'indice) | esatto |
| `supabase/migrations/…_production_piece_flyering.sql` | migration | vocabolario esteso su **due** tabelle | `20260808000500_staff_role.sql` — **precedente diretto: un quarto valore aggiunto a un `IN` su due tabelle, in una transazione** | **esatto** |
| `supabase/migrations/…_refuse_renumber_comment.sql` | migration | solo `COMMENT ON FUNCTION` | `20260815120100_production_calendar_access.sql:343-348` (il commento da riscrivere) | esatto |
| `supabase/migrations/…_production_mirror_apply.sql` *(solo se si sceglie la forma A dell'atomicita')* | migration + funzione | RPC transazionale `SECURITY DEFINER` | `20260815120100_production_calendar_access.sql:328-355` (`SECURITY DEFINER` + `SET search_path = ''`) **+** `20260815120200_production_checklist_tick_revoke.sql` (`REVOKE` + `GRANT`) | role-match |
| `src/app/api/cron/production-mirror/route.ts` | route/cron | request-response, non presidiato | `src/app/api/cron/refund-expired-tokens/route.ts:19-110` (esiti totali, `500` per far vedere il rosso) **+** `reconcile-refunds/route.ts:14-17` (autenticazione) | esatto sulla forma · ⚠ **conflitto sul contenuto, vedi § Nessun analogo** |
| `58-PROCEDURES.md` (`P-58-A`, `P-58-B`, `P-58-C`) | procedura manuale | — | `.planning/phases/44-the-production-calendar-comes-inside/44-PROCEDURES.md` | esatto |
| lettura del catalogo vivo per verificare le migration | script/verifica | HTTP verso Management API | `scripts/rls-baseline.mjs:150-303` | esatto |
| `MirrorStatus` (ICS-10b), come blocco o come estensione | componente server | read-only, render | `src/app/(admin)/admin/calendar/ImportRunSummary.tsx:11-116` | esatto |

### File esistenti modificati

| File | Ruolo | Flusso | Tocco | Cosa cambia |
|---|---|---|---|---|
| `src/lib/production/ics/classify.ts` (825) | modulo puro | transform | **grande** | `ICS-04`, `ICS-05`, `ICS-08` |
| `src/lib/production/ics/reconcile.ts` (1.665) | modulo puro | transform | **grande, in sottrazione** | `ICS-01` |
| `src/lib/production/ics/anchors.ts` (627) | modulo puro | transform | piccolo | `ICS-05` |
| `src/lib/production/ics/vocabulary.ts` (270) | modulo puro | vocabolari | piccolo | `ICS-08b`, `ICS-02` |
| `scripts/import-production-calendar.mjs` (1.569) | script scrivente | batch, delete+insert | **grande** | `ICS-01`, `ICS-01b`, `ICS-02`, `ICS-03`, `ICS-03b`, `ICS-07`, `ICS-09` |
| `scripts/verify-ics-import.mjs` (1.557) | gate | source + file vero | medio | controlli **B**, **C**, **E**, **G** |
| `scripts/verify-calendar-surface.mjs` (778) | gate | source | piccolo | `U11` |
| `scripts/verify-all.mjs` (800) | aggregatore | spawn | piccolo | registrazione del gate nuovo |
| `scripts/verify-ics-reachable.mjs` (156) | gate | modulo | piccolo | conteggio moduli + elenco simboli |
| `package.json` | config | — | una riga | `verify:ics-grammar` |
| `src/types/database.ts` | tipi | — | medio | **si edita a mano** |
| `src/app/(admin)/admin/calendar/PiecesSection.tsx` (223) | componente | render | piccolo | `ICS-06` |
| `src/app/(admin)/admin/calendar/ImportRunSummary.tsx` (326) | componente | render | medio | `ICS-06` / `ICS-10b` |
| `src/app/(admin)/admin/(work)/calendar/page.tsx` | pagina server | read | piccolo | la query dell'ultimo specchio per chiave |
| `vercel.json` | config | — | 4 righe | il cron |

---

## Assegnazioni per file

### `scripts/verify-ics-grammar.mjs` (gate sintetico, source + modulo)

**Due analoghi, e vanno usati insieme.** La **forma dei casi** viene da
`verify-comment-stripper.mjs`; il **come si carica un `.ts` in Node** viene da
`verify-ics-reachable.mjs`. Nessuno dei due da solo basta.

**Tabella dei casi** — `scripts/verify-comment-stripper.mjs:141-169`:

```javascript
/**
 * Shape: `{ id, found, label, needle, expectVisible, lines }`.
 *
 * `needle` is a bare identifier on purpose. It carries no colon, no bracket and
 * no dash, so nothing here can be mistaken for a utility class by the compiler
 * that reads this directory (DEF-41-01).
 */
const PROBES = [
  {
    id: 'S1',
    found: 'DEF-41-02',
    label: 'multi-line JSX comment with prose body lines',
    needle: 'NEEDLE_S1',
    expectVisible: false,
    lines: [ /* … input costruito nel file … */ ],
  },
```

Da copiare: **ogni caso porta `id`, la provenienza (`found`), un `label` in
prosa e l'esito atteso**. Per `ICS-04`/`ICS-05`/`ICS-08` i casi sono
`{ id, requisito, titolo, aliasSintetici, attesa }` con `attesa` fra
`piece` / `night` / `commitment` / `unclassified:<reason>`.

**Verdetto per caso** — `:437-470`, il pattern che distingue i due versi
dell'errore invece di dire solo «diverso»:

```javascript
function verdictOf(visible, expectVisible) {
  if (visible === expectVisible) return 'ok';
  return expectVisible ? 'BLIND' : 'FALSE-RED';
}
```

Per questa fase i due versi sono **`MISSED`** (un titolo che deve classificarsi
e resta non classificato) e **`GUESSED`** (un titolo che deve restare non
classificato e viene agganciato). Il secondo e' il piu' grave: e' l'attribuzione
alla serie piu' vicina che `INCLUSION_RULE` riga 4 vieta.

**Caricamento dei moduli `.ts`** — `scripts/verify-ics-reachable.mjs:86-96`,
copiare per intero:

```javascript
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});
```

**I tre esiti, e la loro dichiarazione in testa** —
`scripts/verify-ics-reachable.mjs:36-44`:

```
 *   0  i sei file ci sono e il barrel si importa
 *   1  FALLIMENTO — un file manca, o l'import solleva
 *
 * **Non esce mai 2.** Non ha precondizioni da cui possa essere rifiutato: se
 * puo' girare, misura.
```

⚠ **`verify-ics-grammar.mjs` e' nella stessa condizione**: costruisce i propri
titoli, non apre `docs/`, non tocca il database. **Non ha precondizioni, quindi
non esce mai 2** — e questa frase va scritta nel suo header come e' scritta li'.

**`pass` / `fail` per lettera** — `scripts/verify-ics-import.mjs:299-315`:

```javascript
const failures = [];
function pass(letter, sentence) { say(`  ✓ ${letter}  ${sentence}`); }
function fail(letter, sentence, detail = []) {
  say(`  ✗ ${letter}  ${sentence}`);
  for (const line of detail) say(`         ${line}`);
  failures.push(letter);
}
```

**Registrazione in `package.json`** — la riga sta accanto alle altre, e la forma
del comando e' vincolata: `verify-all.mjs:487-497` rifiuta qualunque comando che
non sia esattamente `node <path>`.

```json
"verify:ics-reachable": "node scripts/verify-ics-reachable.mjs",
```
*(`package.json:29` — la riga nuova le sta accanto.)*

**Registrazione in `verify-all.mjs`** — `OFFLINE`, non `NEEDS_MATERIAL`, e la
riga di nota che spiega **perche'** non e' in `NEEDS_MATERIAL`. Il precedente
esatto e' la voce di `verify:ics-reachable`, `scripts/verify-all.mjs:257-263`:

```javascript
  [
    "verify:ics-reachable", false,
    "B-2 dell'audit v1.5 — src/lib/production/ics/ non ha importatori statici e il " +
      "suo unico consumatore e' un import() costruito a runtime. verify:ics li tocca " +
      "ma sta in NEEDS_MATERIAL e non viene mai lanciato qui: questo gate non chiede " +
      "materiale, quindi gira ovunque e non esce mai 2",
  ],
```

⚠ La riconciliazione di fine run (`verify-all.mjs:126-140`, `:658-660`) **rifiuta
con uscita 2** se un nome sta in `package.json` e non in una delle quattro liste,
o viceversa. **La riga in `package.json` e la riga in `OFFLINE` vanno nello
stesso commit**, o `npm run verify` esce 2 su ogni macchina.

---

### `supabase/migrations/…_production_calendar_key.sql` (migration, vocabolario chiuso su piu' tabelle)

**Analogo per la struttura del file:**
`supabase/migrations/20260809004500_event_media_party_id.sql`.
**Analogo per la forma del `CHECK` e dell'indice:**
`20260815120000_production_calendar.sql`.

**La disciplina di idempotenza, dichiarata voce per voce** —
`20260809004500_event_media_party_id.sql:54-71`:

```sql
--   * `ADD COLUMN IF NOT EXISTS` per la colonna — **e qui la disciplina di
--     questa fase si applica AL CONTRARIO, di proposito**. Per un vincolo o un
--     indice si scrive `DROP ... IF EXISTS` e poi `ADD`, perche' un vincolo
--     ricreato e' lo stesso vincolo. Per una colonna no: rimuoverla prima di
--     riaggiungerla butterebbe via il backfill a ogni riesecuzione […]
--   * `DROP CONSTRAINT IF EXISTS` prima dell'`ADD CONSTRAINT`;
--   * `IF NOT EXISTS` sull'indice;
--   * il backfill porta `party_id IS NULL` nella sua `WHERE`, quindi la seconda
--     esecuzione tocca zero righe invece di riscrivere le stesse;
```

**Nullabilita' e cosa succede alle righe gia' presenti** — stesso file,
`:100-107`. E' il paragrafo che questa fase deve **scrivere per la propria
scelta**, non copiare:

```sql
-- Nullable, and the nullability is not a shortcut: it is what lets the rows that
-- already exist keep existing. Making it `NOT NULL` would require every historic
-- row to be attributed to a night, and section 3 is the paragraph explaining why
-- some of them cannot be attributed to one honestly.
```

**Forma del `CHECK` di vocabolario chiuso** —
`20260815120000_production_calendar.sql:418-431`:

```sql
  CONSTRAINT production_piece_kind_check
    CHECK (kind IN ('listing', 'tonight', 'recap', 'livecut', 'timetable', 'after_movie')),

  CONSTRAINT production_piece_origin_check
    CHECK (origin IN ('file', 'proposed')),
```

**Forma dell'indice, con la lettura che lo giustifica scritta sopra** — stesso
file, `:457-464`:

```sql
-- The read that builds a night's checklist: every piece of this plan row.
CREATE INDEX IF NOT EXISTS idx_production_piece_plan
  ON public.production_piece (plan_id);
```

⚠ Per `ICS-02` la lettura da giustificare e' diversa e va scritta: **e' il
`WHERE` di un `DELETE`**, non una lettura di superficie. `supabase-data.md`,
gate *indici sulle colonne di lookup*, e' citato in questa forma in
`20260809004500:135-138`.

**La colonna specchia un vocabolario TypeScript, e il commento lo dice** —
`vocabulary.ts:20-33`:

```
 * **Editing either literal set means editing both, in the same commit.** A
 * changed constraint set is a new migration, never an edit to an applied one
 * (`supabase-data.md`, gate *migration in avanti*).
```

---

### `supabase/migrations/…_production_piece_flyering.sql` (settimo valore su due `CHECK`)

**Il precedente esiste, ed e' esatto:** `20260808000500_staff_role.sql` aggiunge
un **quarto** valore a un vocabolario chiuso, toccando i `CHECK` di **due**
tabelle, **in una sola transazione**. E' esattamente la forma che `D-58-04`
descrive.

**L'intestazione — cosa cambia e perche' i pezzi sono uno solo** (`:1-19`):

```sql
-- The fourth role: `staff` — and the two capabilities it holds, no more
--
-- Changes:
-- 1. public.profiles — drop and re-add `profiles_role_check` so `role` admits
--    a fourth value, `staff`
-- 2. private.role_capabilities — drop and re-add `role_capabilities_role_check`
--    for the same four values, because `role` is constrained in TWO places
--
-- Three statements, ONE transaction. A half-applied version of this file is
-- strictly worse than none of it […]
```

**Perche' un allargamento di `IN` non ha bisogno di `NOT VALID`** (`:52-64`) —
argomento da riportare, perche' e' la domanda che il prossimo lettore fara':

```sql
-- Widening an `IN` list is a **strict relaxation**: every value the old
-- constraint admitted, the new one admits too. So every existing row already
-- satisfies it, the validating scan Postgres runs on `ADD CONSTRAINT` cannot
-- fail, and `NOT VALID` is neither needed nor wanted here.
```

**Le due coppie drop/add** (`:71-101`):

```sql
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member'));

ALTER TABLE private.role_capabilities
  DROP CONSTRAINT IF EXISTS role_capabilities_role_check;

ALTER TABLE private.role_capabilities
  ADD CONSTRAINT role_capabilities_role_check
  CHECK (role IN ('master', 'organizer', 'staff', 'member'));
```

**Il nome del vincolo si legge da `pg_constraint`, non si deduce** (`:34-40`) —
vincolo diretto su questa fase, perche' un nome dedotto sbagliato produce un
no-op silenzioso seguito da un errore di duplicato:

```sql
-- WHY BOTH CONSTRAINTS ARE NAMED EXPLICITLY RATHER THAN DERIVED. Postgres
-- auto-names a CHECK `<table>_<column>_check`, and both live names happen to
-- match that rule — but they were **read from `pg_constraint`** […] rather than
-- derived from it.
```

Qui i due nomi sono `production_piece_kind_check`
(`20260815120000_production_calendar.sql:418`) e
`production_pipeline_rule_piece_kind_check` — **da leggere dal catalogo prima di
scrivere il file**, non da copiare da qui.

**Le due parti TypeScript che cambiano nello stesso commit** —
`src/lib/production/ics/vocabulary.ts:87-94` e `:240`:

```typescript
export const PIECE_KINDS = [
  "listing",
  "tonight",
  "recap",
  "livecut",
  "timetable",
  "after_movie",
] as const;
```

⚠ **Il claim (b) di `vocabulary.ts:35-52` non vieta `flyering`** — vieta **una
parola diversa**, deliberatamente non scritta in quella directory. Il piano deve
**riscrivere quel claim** perche' oggi dice *«`PIECE_KINDS` ha sei membri ed e'
chiusa»*: dopo `D-58-04` ne ha sette, e la lista resta chiusa **su un'altra
parola**. Il controllo **G** di `verify-ics-import.mjs:1319-1326` e
`scripts/verify-ics-import.mjs:291` (`const SEVENTH_KIND_WORD = "podcast"`)
vanno riletti insieme: il gate che cerca «la settima parola» **non e' il gate
del settimo tipo**, e confonderli disarma il primo.

---

### `supabase/migrations/…_refuse_renumber_comment.sql` (solo un commento)

**Il testo da riscrivere** —
`20260815120100_production_calendar_access.sql:343-348`:

```sql
COMMENT ON FUNCTION public.refuse_production_plan_renumber() IS
'Refuses any change to a production_plan.number that is already set […] '
'This is the backstop for the caller that forgets, because a guard in the database survives that caller and a guard in application code does not. '
[…]
'The message names the plan id and nothing else — no venue word, no title, no date — because a raised message reaches a log and this repository is public.';
```

**Cosa deve dire dopo** (Claude's Discretion in `58-CONTEXT.md`): il trigger
**resta installato** e continua a difendere qualunque altro scrittore; la
protezione contro la rinumerazione **dell'import** vive ora nell'applicazione
(`ICS-01b`), e il commento nomina dove. La riga *«a guard in application code
does not [survive]»* resta vera e diventa il **costo dichiarato**, non una
promessa smentita.

**La forma della migration** e' quella minima gia' usata nel repo per correggere
in avanti un oggetto applicato: `CREATE OR REPLACE FUNCTION` non serve, basta
`COMMENT ON FUNCTION`, che e' idempotente per costruzione. Il precedente di
disciplina — *una migration applicata e' un fatto storico e non si edita* — sta
in `20260808000500_staff_role.sql:21-32`.

---

### `src/app/api/cron/production-mirror/route.ts` (route, non presidiata)

**Analogo principale:** `src/app/api/cron/refund-expired-tokens/route.ts`. E' il
cron scritto **dopo** la fase 46, cioe' quello che porta gia' la decisione
D-46-06 di far vedere il rosso.

**Autenticazione** — `src/app/api/cron/reconcile-refunds/route.ts:13-17`,
identica nei quattro cron:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
```

**Esiti come unione chiusa + due `Record` totali** —
`refund-expired-tokens/route.ts:19-80`:

```typescript
const CRON_REFUND_OK = "cron_refund_ok";
const CRON_REFUND_DELETE_REFUSED = "cron_refund_delete_refused";
const CRON_REFUND_DELETE_SHORT = "cron_refund_delete_short";

type CronRefundOutcome =
  | typeof CRON_REFUND_OK
  | typeof CRON_REFUND_DELETE_REFUSED
  | typeof CRON_REFUND_DELETE_SHORT;

const CRON_REFUND_HTTP = {
  [CRON_REFUND_OK]: 200,
  [CRON_REFUND_DELETE_REFUSED]: 500,
  [CRON_REFUND_DELETE_SHORT]: 500,
} as const satisfies Record<CronRefundOutcome, number>;

const CRON_REFUND_REPORT: Record<CronRefundOutcome, string> = { /* … */ };
```

**Il precedente di `DI-TODO-B` / D-46-06 — perche' un fallimento e' un `500`** —
stesso file, `:31-53`. Questo paragrafo va **riportato in sostanza** nel cron
nuovo, perche' e' la sola ragione per cui `ICS-10` e' accettabile:

```
 * It is a run that **did not finish**, and the platform's cron dashboard is the
 * only place that fact becomes visible to a person: it reads the 2xx / non-2xx
 * boundary and paints the run green or red. That is the whole reason the status
 * matters […] (D-46-06).
 *
 * **This is the whole observable channel for this route.** There is no error
 * tracking in this repository […] The accepted cost is on the record with
 * D-46-06: **if it fails often the red becomes wallpaper.**
```

**Una funzione sola che produce categoria, log e risposta** — `:103-110`:

```typescript
function respond(outcome: CronRefundOutcome, counts: CronRefundCounts) {
  const status = CRON_REFUND_HTTP[outcome];
  const report = CRON_REFUND_REPORT[outcome];
  if (status !== 200) {
    console.error(`[${outcome}] ${report}`, counts);
  }
  return NextResponse.json({ ...counts, outcome, report }, { status });
}
```

⚠ **Il corpo di un cron e' leggibile da chiunque abbia il segreto e finisce nelle
dashboard** (`:98-101`). Per questa fase significa: nessun `source_uid`, nessun
titolo, nessun indirizzo di sorgente, nessun conteggio che identifichi una
serata. **Solo conteggi e la chiave di calendario** — che e' una sigla pubblica.

**Registrazione** — `vercel.json:1-19`, quattro righe:

```json
    {
      "path": "/api/cron/reconcile-refunds",
      "schedule": "30 7 * * *"
    }
```

**Contatori per causa, mai un `errors` unico** —
`reconcile-refunds/route.ts:25-33`:

```typescript
  // One counter per cause, not one counter for "something went wrong". This
  // cron runs at night with nobody watching and the repository has no error
  // tracking, so the response body is the only place a cause can be read at
  // all -- a single `errors` number said that some items failed and nothing
  // about which, or why (meta-gates.md, zero fallimenti silenziosi).
```

---

### La sorgente remota (`ICS-09`) — il link e' un segreto

**Non esiste nel repo un `fetch` verso un fornitore esterno con timeout e
categorie d'errore.** L'unico `fetch` fuori dal browser e'
`scripts/rls-baseline.mjs:268` / `:288`, verso la Management API, **senza
timeout**. `src/lib/sumup.ts` passa dall'SDK. Vedi § *Nessun analogo trovato*.

**Cio' che invece ha un analogo esatto e' la riservatezza del link.**
`scripts/rls-baseline.mjs:158-176` — da copiare per intero, e' il pattern che
rende `ICS-09` verificabile:

```javascript
/** Values that must never reach stdout, stderr or an artefact. */
const SECRETS = [];

export function registerSecret(value) {
  if (typeof value === 'string' && value.length >= 4) SECRETS.push(value);
}

/**
 * Defence in depth, not the primary control: the primary control is that no
 * code path writes a secret anywhere. This exists because an API error body
 * is written by someone else and can echo back what it was sent.
 */
function redact(text) {
  let out = String(text);
  for (const secret of SECRETS) out = out.split(secret).join('«redacted»');
  return out;
}

export function say(message) { console.log(redact(message)); }
```

**Lo stesso pattern e' gia' nell'importatore** —
`scripts/import-production-calendar.mjs:401-407`:

```javascript
  registerSecret(serviceKey);
  try {
    registerSecret(new URL(url).hostname.split(".")[0]);
  } catch {
    refuse("bad_credential", "NEXT_PUBLIC_SUPABASE_URL is not a URL.");
  }
  registerSecret(url);
```

⚠ **`ICS-09` aggiunge una riga qui**: `registerSecret(feedUrl)`, **e anche
`registerSecret(new URL(feedUrl).hostname)`**, perche' l'host del fornitore da
solo restringe chi puo' aver pubblicato quel calendario. Il gate di `ICS-09`
(«il link non compare nel referto») e' soddisfatto **per costruzione** solo se
ogni riga passa da `say()`, che gia' redige — vedi `import-production-calendar.mjs:247`
(`refuse`) e `:264` (`failPartway`), che chiamano `redact()` esplicitamente.

**La variabile mancante e' un rifiuto con uscita 2, e nomina la variabile** —
`import-production-calendar.mjs:388-399`:

```javascript
  const missing = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    refuse(
      "missing_credential",
      `missing environment variable(s): ${missing.join(", ")}. Set them in ` +
        ".env.local (gitignored) or in the environment. This script talks to one " +
        "database and will not invent a second way to reach it."
    );
  }
```

⚠ Il **nome** della variabile e' pubblicabile, il **valore** no. Il messaggio di
rifiuto di `ICS-09` copia questa forma: nomina la variabile, mai il valore, e
**non ricade su un file** — l'ultima frase (*«will not invent a second way to
reach it»*) e' esattamente la dichiarazione che `ICS-09` chiede.

---

### `src/lib/production/ics/classify.ts` (modulo puro, transform)

**Non c'e' un analogo esterno: l'analogo e' il file stesso.** Le tre grammatiche
sono gia' scritte e la quarta deve nascere **estraendo**, mai copiando.

**Il ramo che oggi rifiuta** — `:521-534`, il punto esatto dove entra `ICS-04`:

```typescript
function readCanonicalPiece(event: IcsEvent, title: string): ClassifiedEntry | null {
  const segments = title.split(SEGMENT_SEPARATOR);
  if (segments.length < 2) return null;

  const kind = KIND_BY_LABEL.get(segments[0].trim().toLowerCase());
  if (kind === undefined) return null;

  const reference = readSeriesAndNumber(segments[1]);
  if (reference === null) {
    return unclassified(event.uid, "kind_without_series_and_number");
  }
```

**Il codice di risoluzione del nome, da ESTRARRE e non riscrivere** —
`:622-643`, dentro `readNight`:

```typescript
  const separated = splitOnJoinWord(head.text);

  const candidates =
    separated === null
      ? [head.text, lastWord(head.text)]
      : [separated.venueWord, lastWord(separated.venueWord)];

  let seriesCode: string | undefined;
  for (const candidate of candidates) {
    if (candidate.length === 0) continue;
    seriesCode = aliases.get(candidate.toLowerCase());
    if (seriesCode !== undefined) break;
  }

  if (seriesCode === undefined) {
    // Unmistakably our shape, and the declaration does not cover it: a finding,
    // and never the nearest series.
    if (separated !== null) {
      return unclassified(event.uid, "alias_unresolved");
    }
    return null;
  }
```

**La forma dell'estrazione** che il piano deve produrre — una funzione con la
lista dei candidati e il rifiuto, chiamata da `readNight` **e** dalla lettura
nuova del secondo segmento. Le due helper che restano dove sono:
`splitOnJoinWord` (`:731-743`, cerca il **token** `x`, non il carattere) e
`lastWord` (`:746-749`).

**Il ramo finale che produce `commitment`** — `:426-443`, ed e' il ramo che
`ICS-08` toglie da sotto `Timetable` e `Flyering`:

```typescript
  // Nothing matched a grammar. An entry that still carries a word the
  // declaration knows is **recorded and counted**, never guessed […]
  if (carriesKnownWord(title, aliases)) {
    return unclassified(event.uid, "known_word_without_kind_or_number");
  }

  return {
    entryClass: "commitment",
    uid: event.uid,
    title: event.summary,
    date: event.startDate,
    /* … */
  };
```

**`INCLUSION_RULE`, che e' prosa CITATA da un gate** — `:138-145`. Sei righe
oggi; `ICS-04`, `ICS-05` e `ICS-08` ne aggiungono e ne cambiano:

```typescript
export const INCLUSION_RULE = [
  "A title of the form `<Kind> - <SERIES>-<NNN>` enters as a piece of that kind, …",
  "A title of the form `<Word> <NNN> - <Kind>` enters as a piece of that kind, …",
  "A title of the form `<Word>[ x <Word>] <NNN>`, carrying no kind token, enters as a night, …",
  "An entry whose word the alias map does not resolve is recorded as unclassified with the reason `alias_unresolved`, and is never guessed onto the nearest series: …",
  "An entry carrying a word the alias map knows, but no recognisable kind and no progressivo, is recorded as unclassified, … It is never handed a format and a progressivo it does not have — a progressivo is a monotone guard and, once assigned, is already on a poster.",
  "Every other entry enters as a commitment: it occupies a day and nothing more. …",
] as const;
```

⚠ **Una grammatica che non compare qui e' una grammatica non dichiarata**, e il
controllo **B** di `verify-ics-import.mjs` la legge. La decisione di `ICS-08`
*«va scritta dove il prossimo lettore la trova»* significa **questa lista**.

**I due motivi nuovi di `ICS-05`** vanno in `UNCLASSIFIED_REASONS`, `:167-183`,
e la ragione per cui sono **due e non uno** e' gia' scritta li' sopra:

```typescript
/**
 * Four codes, distinct on purpose. *The declaration is missing* and *the title
 * carries no number* are two different pieces of work for whoever reads the
 * import run's summary, and one shared code would hide which.
 */
export const UNCLASSIFIED_REASONS = [
  "alias_unresolved",
  "known_word_without_kind_or_number",
  "kind_without_series_and_number",
  "number_not_readable",
] as const;
```

---

### `src/lib/production/ics/anchors.ts` (modulo puro, predicato)

**Il predicato della seconda passata esiste** — `:601-606`, e l'unica riga che
cambia e' la prima del corpo:

```typescript
export function conformsToRule(
  actualDate: CivilDate,
  rule: PipelineRule,
  context: AnchorContext
): boolean | null {
  if (!rule.derivable) return null;
```

**Il docblock spiega perche' `null` non e' `false`** (`:581-599`) — la stessa
distinzione va conservata nella variante di `ICS-05`:

```
 * `null` when the rule cannot be resolved at all — a rule marked non-derivable,
 * or an anchor edition that is not in the calendar. `null` is *we cannot say*,
 * and it is deliberately not `false`: a piece is not diverging because nothing
 * was there to compare it against.
```

⚠ **Non introdurre un secondo calcolo di giorni.** La finestra a piu' episodi
(`:622-624`) e la clausola di settimana ISO (`:613-619`) sono gia' misurate «sei
volte su sei»: una variante che le riscrivesse diverge dal predicato che il
referto usa.

---

### `src/lib/production/ics/reconcile.ts` (in sottrazione)

**Cio' che sparisce, con la riga esatta:**

| Simbolo | Righe | Nota |
|---|---|---|
| `DIVERGENCE_REASONS` / `DivergenceReason` | `:284-293` | cinque membri |
| `ABSENCE_REASONS` / `AbsenceReason` | `:305-308` | due membri |
| `clearsAbsence` | `:524`, `:567`, `:600`, e sette siti d'uso (`:878`, `:1150`, `:1179`, `:1371`, `:1507`) | campo di tre tipi |
| `PlanUpdate` / `PieceUpdate` / `CommitmentUpdate` | `:518`, `:563`, `:596` | tipi senza istanze |
| `claimNextProposal` | `:1383` | l'idempotenza a mano delle proposte, che `ICS-06` rende inutile |

**La forma del piano che resta** — `:688-701`, il `ReconcilePlan`: sei liste di
`*ToUpdate` spariscono, `absences` e `divergences` spariscono, e va deciso cosa
prende il loro posto (una lista di cancellazione per chiave, o niente).

**⚠ Il docblock delle due vocabolari e' prosa che spiega una decisione, non
commento di servizio.** `:295-304` e' la ragione per cui `no_longer_owed` esiste
distinto da `absent_from_file`. Cancellandolo si perde la memoria della scelta:
va **riscritto come nota storica nel modulo**, non solo rimosso — e' la stessa
disciplina che `import-production-calendar.mjs` chiede per il proprio contratto.

**Cio' che si RIUSA e non si riscrive**: `buildAnchorContexts` (`:944`),
`byDateThenNumber` (`:987`), `indexPipelines` (`:1016`). Sono l'infrastruttura
della seconda passata di `ICS-05`.

---

### `scripts/import-production-calendar.mjs` (lo scrittore)

**Il contratto in testa, che questa fase ROVESCIA** — `:57-78`. Il punto 2 e' la
frase da riscrivere, e il punto 4 e' quella che `ICS-01b` sposta:

```
 * ── FOUR THINGS IT CANNOT DO, BY CONSTRUCTION ───────────────────────────────
 *
 *   1. **It writes nothing unless `--apply` is passed.** […]
 *   2. **It removes nothing, ever.** There is no removal statement in this file
 *      and no list that could carry one. An entry missing from the file gets an
 *      `absent_since` stamp and a reported count. […] and a plan row already
 *      standing behind an announced night survives absence unconditionally,
 *      because removing it would orphan a night with tickets on sale.
 *   3. **It never touches the announced-night table** […]
 *   4. **It never generates a progressivo.** […] The trigger
 *      `refuse_production_plan_renumber` from plan 44-04 is the second layer,
 *      the one that survives a caller who forgot this one.
```

⚠ **Il punto 2 non si cancella: si riscrive.** La sua seconda meta' e' `ICS-03b`
(D-58-02) e resta vera parola per parola — la riga con un legame **non si
cancella mai**. Il punto 4 resta vero sul *generare* e diventa falso sul
*secondo strato*: e' `ICS-01b` a esserlo adesso.

**La regola di riservatezza dell'output, che vale su ogni riga nuova** —
`:35-55`:

```
 * So the rule is narrower than "be careful": somebody will paste this run into
 * an issue. It prints **counts, identifiers and reason codes**, and it prints no
 * title, no date, no venue word, no line-up and **not even the name of the file
 * it read** — that name carries a date.
```

**I tre esiti** — `:245-272`:

```javascript
function refuse(category, message) {
  say("");
  say(`  REFUSED [${category}] — ${redact(message)}`);
  say("");
  say("  NOTHING WAS WRITTEN. The import did not happen; this is not an empty plan.");
  if (auditReady) auditOwnOutput();
  process.exit(2);
}

function failPartway(category, message, written) {
  say(`  FAILED [${category}] — ${redact(message)}`);
  say(`  ⚠ ${written} write step(s) had already completed and STAY WRITTEN.`);
  say("    Re-run with --dry-run first: the reconciler is keyed on the file's own");
  say("    UIDs, so a second pass plans only what the first did not finish.");
  process.exit(1);
}
```

⚠ **Le due righe di consiglio di `failPartway` diventano false con lo specchio.**
Oggi «a meta' strada» = *alcune righe aggiornate*; domani = *il calendario
cancellato e non riscritto*, e un secondo `--dry-run` non pianifica «solo cio'
che il primo non ha finito»: pianifica tutto. Quelle due righe vanno sostituite
con il **rimando a `P-58-C`**, che e' l'unico piano di rientro che esistera'.

**Il parsing degli argomenti, dove entra `--calendar`** — `:278-300`:

```javascript
function parseArguments(argv) {
  const options = { apply: false, dryRunAsked: false, file: null, docsDir: null, help: false };
  const unknown = [];
  for (let i = 0; i < argv.length; i += 1) {
    const argument = argv[i];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--dry-run") options.dryRunAsked = true;
    /* … */
    else unknown.push(argument);
  }
  return { options, unknown };
}
```

⚠ Il valore di `--calendar` **finisce in un `WHERE` di `DELETE`**: va validato
contro il vocabolario chiuso (`rsnt` / `rmdb` / `mtnlb`) **prima** di raggiungere
una query, e un valore fuori vocabolario e' un `refuse(…)` con uscita 2, non un
filtro applicativo.

**`ICS-07` — le tre righe candidate, con la riga esatta:**

| Riga | Codice | Percorso |
|---|---|---|
| `:1209` | `` say(`  ── applying ── import run ${runId}`) `` — `runId` e' un `uuid` grezzo | solo `--apply` |
| `:1117` | `` `         ${record.subject}  ${record.id}  ${record.reason}` `` — `record.id` **non** passa da `printableUid` | assenze |
| `:1103` | `` `         ${record.subject}  ${printableUid(record.sourceUid)}  ${record.reason}` `` | divergenze |

**Lo strumento gia' scritto, e il suo limite** — `:610-616`:

```javascript
/** A `UID` in a form that is safe to print, or a stable digest of one. */
function printableUid(uid) {
  const carriesATitleWord = [...tokensOf(uid)].some((token) => titleTokens.has(token));
  if (!carriesATitleWord) return uid;
  digestedIdentifiers += 1;
  return `uid#${createHash("sha256").update(String(uid)).digest("hex").slice(0, 12)}`;
}
```

Il digest `uid#` + 12 esadecimali **non produce mai un token di 4 cifre** — e'
un token solo. La riparazione di `ICS-07` e' **stampare sempre in quella forma**,
non aggiungere un'eccezione.

**La dottrina che vieta la riparazione facile** — `:1559-1563` in
`auditOwnOutput()`:

```javascript
  if (years.length > 0) {
    say(`    ${years.length} four-digit year(s) appear above. A date is the first thing`);
    say("    this script may not say out loud.");
  }
  say("    DO NOT PASTE THIS RUN ANYWHERE. Reword the output; never widen the rule.");
```

**E la regola generale che il piano dovrebbe stabilire una volta** — *nessun
identificativo grezzo nel transcript* — copre anche le righe **nuove** che
`ICS-01`/`ICS-02`/`ICS-03b` aggiungono al referto. Ognuna e' una nuova occasione
per l'audit di andare in rosso.

**L'audit non stampa cio' che ha trovato** — `:1548-1557`, pattern da conservare
in ogni riga nuova:

```javascript
  // The leaked tokens are NOT printed. Printing them to say they were printed is
  // the whole failure, performed by the check that found it. What IS printed is
  // enough to act on: how many, of which of the two kinds, and out of how large a
  // residual set — three numbers that name nothing.
```

---

### `scripts/verify-ics-import.mjs` (i controlli B, C, E, G)

**Controllo B — i numeri d'oro.** La tabella sta in `:204-…`
(`const EXPECTED = { … }`), con un commento per riga:

```javascript
const EXPECTED = {
  /** Class A — the canonical piece grammar. */
  canonicalPieces: 56,
  /** Class B — the legacy inverted grammar, carrying both anchor overrides. */
  legacyPieces: 3,
  /** Class C — nights. */
  nights: 14,
  /** Class D — commitments plus entries nobody may guess at. */
  commitments: 16,
  unclassified: 3,
```

⚠ **Rimisurati, mai aggiustati.** `ICS-04` sposta voci da `unclassified` a
`canonicalPieces`; `ICS-08` le sposta da `commitments`. Il verso e' noto: i due
primi crescono, i due ultimi calano. **Un numero cambiato per far passare il
gate e' il difetto che il gate esiste per trovare.**

**La forma di un problema di B** — `:575-628`, ogni condizione con la sua frase:

```javascript
  const bProblems = [];
  if (legacy === 0) {
    bProblems.push(
      "ZERO entries read under the legacy grammar. A two-grammar reader drops three " +
      "real pieces, and two of them carry the file's only genuine anchor overrides […]"
    );
  } else if (legacy !== EXPECTED.legacyPieces) {
    bProblems.push(`${legacy} legacy-grammar piece(s), ${EXPECTED.legacyPieces} expected`);
  }
```

⚠ Due righe di B **cambiano di significato**, non solo di numero:
`:610-615` asserisce `kindVocabulary.size !== 6` — dopo `ICS-08b` sono **sette**;
`:622-628` conta la settima parola vietata, **che non e' `flyering`**.

**Controllo E — da riscrivere.** Oggi il predicato e' *«il secondo piano e'
vuoto»*, `:1020-1034`:

```javascript
  if (ics.isEmptyPlan(firstPass)) {
    eProblems.push(
      "the FIRST pass over an empty database planned no write at all. The second " +
      "pass being empty then proves nothing, because there was nothing to be " +
      "idempotent about"
    );
  }
  if (!ics.isEmptyPlan(secondPass)) {
    eProblems.push(
      `the second pass plans ${second.plans} plan, ${second.pieces} piece, … ` +
      "A re-import of an unchanged file must write nothing"
    );
  }
```

⚠ **La prima meta' resta valida e va conservata**: *un primo passaggio vuoto
rende il secondo privo di significato* e' un argomento che sopravvive allo
specchio. La seconda meta' diventa **«lo stato risultante e' identico»** —
confronto fra insiemi di righe, non fra piani. La funzione di riduzione
(`writesIn`, `:1007-1014`) va sostituita da una che produce **l'insieme delle
righe**, ordinato deterministicamente: il precedente per la determinismo di un
confronto e' `scripts/rls-baseline.mjs:84-107` (sei regole scritte).

**Controllo G — vocabolari TS ↔ `CHECK` SQL** — `:1315-1356`. E' **gia' scritto
per questo scopo** e va **esteso**, non riscritto:

```javascript
  const lists = [...sqlByFile.values()].flatMap((sql) => checkVocabularies(sql));

  // Six vocabularies, named from the module so that a rename is a build error
  // here and not a silently skipped assertion.
  const mirrored = [
    ["PIECE_KINDS", ics.PIECE_KINDS],
    ["PIECE_DATE_ORIGINS", ics.PIECE_DATE_ORIGINS],
    ["UNRESOLVED_REASONS", ics.UNRESOLVED_REASONS],
    ["VENUE_STAGES", ics.VENUE_STAGES],
    ["ANCHOR_KINDS", ics.ANCHOR_KINDS],
    ["ANCHOR_DIRECTIONS", ics.ANCHOR_DIRECTIONS],
  ];
```

Due righe nuove: `["CALENDAR_KEYS", ics.CALENDAR_KEYS]` (`ICS-02`) e nessuna per
`flyering`, che entra dentro `PIECE_KINDS`. **E la lista `MIGRATIONS` in testa al
file va estesa con i file nuovi**, o il gate legge un `CHECK` che non esiste.

**La direzione che conta di piu'** — `:1341-1356`, gia' scritta:

```javascript
  // The other direction, and it is the one that matters more: a CHECK that has
  // grown a member the TypeScript does not know is a value the database will
  // store and no code will ever branch on.
```

⚠ **G deve FALLIRE prima e passare dopo.** E' l'unico gate della fase che
possiede questa proprieta' — vale la pena eseguirlo **prima** di applicare la
migration e registrare il rosso come evidenza, come `44-PROCEDURES.md` chiede
per ogni `Result`.

---

### `scripts/verify-calendar-surface.mjs` — il controllo `U11`

**La forma di un `U`** — `:474-498` (`U6`), da copiare struttura per struttura:

```javascript
const EMPHASIS_EARNED = ["Late", "Diverged"];

function u6() {
  const failures = [];
  const marker = "tone=" + '"' + "emphasis" + '"';
  for (const file of surface) {
    for (const at of indicesOf(file.joined, marker)) {
      const window = file.joined.slice(at, at + 240).split("\n").slice(0, 3).join("\n");
      if (!EMPHASIS_EARNED.some((word) => window.includes(word))) {
        failures.push({
          rel: file.rel,
          line: lineOf(file, at),
          detail: "an emphasis badge on neither of the two facts that earn one",
        });
      }
    }
  }
  return {
    id: "U6",
    title: "emphasis is spent on Late and Diverged, and on nothing else",
    note: "§5.3 — a badge on every row is a badge on no row",
    failures,
  };
}
```

**Il contratto di ritorno, dichiarato una volta** — `:251-255`:

```javascript
/* ────────────────────────────────────────────────────────────────────────────
 * The ten checks
 *
 * Each returns `{ id, title, note, failures: [{ rel, line, detail }] }`.
 * ──────────────────────────────────────────────────────────────────────────── */
```

**Il marker si ASSEMBLA, non si scrive** (`marker = "tone=" + '"' + …`, `:476`) —
stessa disciplina di `verify-refusal.mjs:35-40`: un gate che contenesse nella
propria sorgente il letterale che cerca troverebbe se stesso.

⚠ `U11` deve asserire **due cose distinte**, non una: (a) la frase esiste ed e'
condizionata alla presenza di almeno una proposta; (b) **non** usa
`tone="emphasis"` — cioe' non deve entrare in conflitto con `U6`. Il precedente
del predicato condizionato e' `PiecesSection.tsx:193-203`, sotto.

**L'aggiunta va anche nel conteggio**: il file si descrive come «the ten checks»
in due punti (`:24` e `:251`), e la lista dei file letti sta in testa
(`:109-143`). Un `U11` che non aggiorna quelle righe lascia una prosa falsa.

---

### `src/app/(admin)/admin/calendar/PiecesSection.tsx` — la dichiarazione di `ICS-06`

**Il precedente e' identico e va imitato, non reinventato** — `:120`, `:193-203`:

```typescript
const LINEUP_DEPENDENT = "LiveCuts depend on the line-up";

  // Derived from the rows rather than passed in: it is a fact about what this
  // section is holding, and a prop would be a second place for it to be wrong.
  const lineupDependent = pieces.some(
    (piece) =>
      "unresolved" in piece.state &&
      piece.state.unresolved === "depends_on_lineup"
  );

  return (
    <div>
      {lineupDependent ? (
        <p className={`mb-4 ${REASON}`}>{LINEUP_DEPENDENT}</p>
      ) : null}
```

`ICS-06` e' la stessa forma con il predicato `piece.state.origin === "proposed"`.
**Vincoli meccanici già verificati altrove:** `REASON` (`text-sm text-muted`),
mai `tone="emphasis"` (`U6`); nessun nome di format, sigla o brand nella frase
(`U8`); nessuna data (`U3`); lingua inglese, come tutta la superficie.

---

### `ImportRunSummary.tsx` — lo stato dell'ultimo specchio per chiave (`ICS-10b`)

**Le quattro regole del blocco, che valgono anche per cio' che si aggiunge** —
`:30-63`:

```
 *  1. **Every tally is a real count or a sentence saying it could not be read.**
 *     Never `0` standing in for *we did not measure*, and never an em-dash […]
 *  2. **`N unclassified` is drawn as prominently as every other tally**, never
 *     behind a disclosure. […]
 *  3. **Unclassified and divergent detail carries UIDs and reason codes, never a
 *     title.** […] **The props below carry no field for a title at all** […]
 *  4. **`unclassified`, `divergence` and `unsupported recurrence` are three
 *     tallies, and there is no fourth figure summing them.**
```

**Il tipo che rende irrappresentabile la violazione** — `:95-116`:

```typescript
export interface ImportFinding {
  readonly source_uid: string;
  readonly reason: string;
}

export interface ImportRun {
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly entriesSeen: number | null;
  /* … ogni conteggio e' `number | null`, e il null e' portante … */
  readonly dryRun: boolean;
}
```

⚠ **`ICS-10b` chiede tre stati, non due**: *riuscito a <ora>*, *fallito a <ora>*,
*non e' ancora girato*. Il pattern del terzo esiste gia' — `:65-70`:

```
 * ── Never imported yet is an empty state, not a block of zeros ──────────────
 *
 * A zeroed block says the import ran and found nothing. It did not run. The
 * caller decides — only the page knows which emptiness this is — and this
 * component renders nothing at all for `run === null` […]
```

**La lettura dell'ultimo run, da estendere a «per chiave»** —
`src/app/(admin)/admin/(work)/calendar/page.tsx:180-187`:

```typescript
  const { data: runRows, error: runError } = await supabase
    .from("production_import_run")
    .select(
      `id, started_at, finished_at, file_byte_size, entries_seen, entries_by_class,
       unclassified_count, divergences, unsupported_recurrences, dry_run`
    )
    .order("started_at", { ascending: false })
    .limit(1);
```

⚠ Con tre chiavi il `.limit(1)` non basta piu': serve **una riga per chiave**, e
una chiave senza righe e' il terzo stato. Il commento che precede la query
(`:170-179`) spiega perche' un dry run non si filtra — **quella logica vale per
chiave** dopo `ICS-02`.

**I tre esiti della lettura, mai due** — stesso file, `:189-200`:

```
 THREE OUTCOMES, NEVER TWO (OBS-03).

 Rows returned; zero rows; and THE READ ITSELF FAILED. The third gets its own
 sentence and never the empty state […]

 `error.code` and `error.message` only. Never the error object, and never
 `details`, which carries the rejected row.
```

---

### `src/types/database.ts` — si edita a mano

**La prova che e' scritto a mano, e la forma della prosa** — `:1217-1300`
(`ProductionPlan`). Ogni colonna porta un docblock che dice **perche'**, non
cosa:

```typescript
  /**
   * The calendar entry's own `UID`, and the identity is the file's rather than
   * ours. The alternatives were measured and rejected: a title changes when the
   * owner renames a night, `(date, title)` changes twice over, and a content
   * hash changes on every edit — which is the opposite of an identity.
   */
  source_uid: string;
```

**La prosa che diventa FALSA con lo specchio, e va riscritta** — `:1291-1297`:

```typescript
  /**
   * ⚠ **Disappearance is not deletion.** An entry present in a previous run and
   * absent now may be a changed uid, a partial export, or simply the wrong file.
   * The import stamps this and reports the count; deleting on absence would let
   * one bad export wipe the archive.
   */
  absent_since: string | null;
```

**E anche `:1256-1268`**, che descrive il trigger come la protezione viva:

```typescript
  /**
   * Changing a number that is already set is refused in the database by the
   * `production_plan_refuse_renumber` trigger […]
   * A progressivo is already on a poster: append, never renumber.
   */
  number: number | null;
```

⚠ Le stesse tre righe compaiono su `ProductionPiece` (`:1375`) e
`ProductionCommitment` (`:1420`). **Tre prose da riscrivere, non una.**

**La forma di un avviso di riservatezza su una colonna** — `:1269-1278`, da
imitare per la chiave nuova (che invece **e' pubblicabile**, e va detto):

```typescript
  /**
   * ⚠ **INTERNAL, NEVER PUBLIC.** The venue word exactly as the calendar writes
   * it, which may name a space under negotiation.
   * […] The column is public — it is declared right here; the values arrive at
   * runtime and stay behind the table's row-level security.
   */
  venue_word: string | null;
```

---

### `58-PROCEDURES.md` — `P-58-A`, `P-58-B`, `P-58-C`

**Analogo:** `.planning/phases/44-the-production-calendar-comes-inside/44-PROCEDURES.md`.

**Il frontmatter, che e' un contratto** (`:1-10`):

```yaml
---
phase: 44-the-production-calendar-comes-inside
written: 2026-08-15
status: all pending
closes: PROD-01 criterion 3, PROD-01 criterion 4, D-44-06, …
accounts: five — master, organizer approved, … ; roles, never names
authorisation: P1, P2 and P4 read only. **P3 WRITES TO PRODUCTION and needs its own dated authorisation** — it may not ride along with the others
phase_closes: not before every Result below carries an observation
---
```

**Le quattro regole di lettura** (`:14-39`), da riportare in sostanza:

```
> **(a) Every `Result` below reads `pending`, and a pending Result is an UNRUN
> procedure** — never a verified-by-inspection in disguise.
>
> **(b) Roles, never names.** `.planning/` is tracked and this repository is
> PUBLIC. […] And **no venue, no night's date and no line-up appears anywhere in
> this file** — a step says *open the calendar and read the first row*, never
> what that row says.
```

**Come si scrive un passo** (`:43-55`):

```
- Steps are numbered and are executed **in the order written**.
- Every step names **the role it is performed as**. […]
- Every step ends with a `Result: pending` line. Fill it with what was
  **observed** — a fact a second person looking at the same screen could confirm
  or deny. *"Access was blocked"* is not an observation.
- Where a step says **if it did not, that is the finding**, write what happened
  instead, verbatim. Do not retry until it passes.
```

**Il preambolo di una procedura che scrive in produzione** — `P3`, `:256-276`.
`P-58-A` e `P-58-B` ne hanno bisogno **entrambe**:

```
> ## ⚠ THIS PROCEDURE WRITES TO PRODUCTION
>
> **It needs its own authorisation, given on the day, naming this procedure.**
> An authorisation to run the other three does not cover this one
> (`ai-engineering.md`, *gate l'autorizzazione a scrivere in produzione e' un
> atto, non un permesso*).
>
> **The removal at the end is by PRIMARY KEY, from a list captured before the
> write, and never by clicking a delete control on a page.** […] A selector by
> primary key that is wrong finds nothing. A selector by interface that is wrong
> finds everything.
```

**Le precondizioni lette il giorno stesso, e l'istantanea sulla cascata** —
`P3.0`, `:282-300`:

```
33. Write here the owner's authorisation for **this procedure**, with its date.
    If it is absent, stop […]
34. **Enumerate the cascade by reading the constraints**, not by remembering it:
    list every table reachable from `events` and from the night table by a
    foreign key declared `ON DELETE CASCADE`. Snapshot **all of them** […]
35. Capture, **before any write**: […] This list is the only thing the removal
    in step 47 is allowed to consult.
36. Record the wall-clock time.

Result: pending
```

⚠ Per questa fase la cascata da enumerare e' **una sola** e la ricerca l'ha gia'
letta: `production_checklist_item.plan_id → production_plan(id) ON DELETE
CASCADE`. Va comunque **riletta dai vincoli** al momento, non copiata da qui.

**La forma di un passo di osservazione su una spunta** — `P4.1`, `:415-430`, che
e' quasi letteralmente `P-58-A`:

```
58. Open `/admin/calendar`, then a night with at least one checklist item.
59. Observe that the read-only notice is **gone** and the boxes are operable.
60. Tick an item. Observe: the box stays ticked, the `Late` mark — if there was
    one — clears, and the author line appears carrying **this account's own** name.
63. Read the item in the database: `ticked_by` and `ticked_by_name` name the
    account that pressed, and are not null.
```

`P-58-A` continua da li': **lanciare l'import**, poi rileggere `ticked_by` e
verificare che sia **lo stesso** — non quello di chi ha lanciato l'import.

⚠ **`ticked_by_name` e' un nome di persona.** La migration lo vieta
esplicitamente in `.planning/` (`20260815120000_production_calendar.sql:706-713`).
Il passo scrive *«l'autore e' invariato»*, **mai il nome**.

---

### La verifica delle migration — leggere il catalogo vivo

**La CLI Supabase non e' installata.** Il precedente d'uso e'
`scripts/rls-baseline.mjs:261-303`:

```javascript
export function createManagementApiTarget({ token, projectRef }) {
  const base = `${MANAGEMENT_API}/v1/projects/${projectRef}`;

  async function query(sql, { readOnly }) {
    if (typeof readOnly !== 'boolean') {
      throw new Error('query() requires an explicit readOnly flag — the caller decides, never a default');
    }
    const response = await fetch(`${base}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql, read_only: readOnly }),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`[management-api/query] HTTP ${response.status}: ${body}`);
    }
    try { return JSON.parse(body); }
    catch { throw new Error('[management-api/query] the response was not JSON'); }
  }
```

**`read_only: true` e' una garanzia dura** (`:64-66`): *«un INSERT sotto di esso
fallisce `25006`»*. Ogni lettura di verifica di questa fase — colonne, vincoli,
indici, conteggi per chiave — passa da li' con `readOnly: true`.

**Il caricamento delle credenziali, e il rifiuto con uscita 2** — `:205-244`,
`loadEnvironment()`, gia' esportato e riusato da `verify-capabilities.mjs`. Il
commento spiega **perche' non se ne scrive un secondo**:

```
 * Exported so that `scripts/verify-capabilities.mjs` reaches the same database
 * through the same door. A second env loader would be a second place for the
 * project reference to be read and a second place for it to be forgotten in
 * `registerSecret` — and the whole redaction guarantee is that every printed
 * string passes through one list.
```

---

## Pattern condivisi

### 1. I tre esiti, e un rifiuto non e' un fallimento

**Fonte:** `scripts/verify-ics-reachable.mjs:36-44`,
`scripts/verify-refusal.mjs:17-21`, `scripts/verify-all.mjs:26-34`.
**Si applica a:** ogni script nuovo o modificato di questa fase.

```javascript
/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\n  FATAL: ${message}\n`);
  process.exit(2);
}
```

`ICS-01b`, `ICS-02`, `ICS-09` e `ICS-10a` producono tutti **rifiuti**, non
fallimenti: nulla e' stato scritto, quindi nulla e' fallito. `ICS-10` gira in un
cron, dove il canale e' il codice HTTP e non l'uscita del processo — la
traduzione fra i due va **dichiarata**, non lasciata implicita.

### 2. Zero fallimenti silenziosi — e un log non e' un effetto osservabile

**Fonte:** `meta-gates.md`; `ImportRunSummary.tsx:15-28`;
`refund-expired-tokens/route.ts:49-53`; `reconcile-refunds/route.ts:25-33`.
**Si applica a:** cron, referto, superficie.

```
 * There is **no error tracking in this repository**. […] Under that constraint
 * *the error is logged* is not a mitigation, because a log is a place nobody
 * looks (`meta-gates.md`). A failure that counts needs an **observable effect**.
```

Conseguenza diretta su questa fase: `ICS-10b` **non e' una rifinitura**. Senza la
riga sulla superficie, un cron che cancella e non riscrive e' un fallimento che
non raggiunge nessuno.

### 3. Un errore PostgREST si stampa con `describe()`, mai intero

**Fonte:** `scripts/import-production-calendar.mjs:650` (`describe`);
`20260815120100_production_calendar_access.sql:370-380`;
`src/app/(admin)/admin/(work)/calendar/page.tsx:199-200`.
**Si applica a:** ogni `catch` nuovo dello script e del cron.

```
 `error.code` and `error.message` only. Never the error object, and never
 `details`, which carries the rejected row.
```

Su `production_plan` la riga rifiutata porta `venue_word`. **E' misurato, non
prudenziale.**

### 4. Un letterale che un gate cerca non si scrive in prosa

**Fonte:** `src/app/(admin)/admin/formats/actions.ts:58-63`, citato da
`vocabulary.ts:48-52`, `ImportRunSummary.tsx:56-63`,
`import-production-calendar.mjs:48-51`, `verify-calendar-surface.mjs:476`.
**Si applica a:** ogni testo nuovo di questa fase.

> *un grep il cui unico riscontro e' la frase che vieta la cosa e' un grep che
> la terza volta che va rosso viene ignorato.*

⚠ Vale in modo diretto su `ICS-08b`: **si aggiunge `flyering`, e la settima
parola vietata resta non scritta.** Sono due parole diverse e il gate B le
distingue solo se la seconda continua a non comparire.

### 5. Ogni scrittura in produzione: istantanea prima, conferma da una fonte diversa

**Fonte:** `ai-engineering.md`; `44-PROCEDURES.md:256-300`;
`58-RESEARCH.md` § Pitfall 5.
**Si applica a:** `P-58-A`, `P-58-B`, `P-58-C`, e al primo `--apply` dello
specchio.

> *«una misura presa con lo strumento che ha causato l'effetto non e' una misura:
> e' un'eco»* — quindi il conteggio dopo la cancellazione si chiede al catalogo
> dalla Management API, **non allo script che ha cancellato**.

### 6. Ogni gate nuovo entra in `package.json` E in `verify-all.mjs`, nello stesso commit

**Fonte:** `scripts/verify-all.mjs:122-140`, `:448-482`, `:655-665`.
**Si applica a:** `verify:ics-grammar`.

La riconciliazione finale confronta **verdetti**, non lunghezze, e un nome
registrato senza verdetto e' un'uscita 2 su ogni macchina.

### 7. Il modulo puro non costruisce date e non tocca il filesystem

**Fonte:** `src/lib/production/ics/vocabulary.ts:54-77` (claim c),
`index.ts` claim (a).
**Si applica a:** `classify.ts`, `anchors.ts`, `reconcile.ts`.

> *«no date object is ever constructed here, none of the platform's date
> formatters or serialisers is called, and no timezone library is adopted»* — e i
> quattro nomi che si sarebbe tentati di usare **non sono scritti** in quella
> directory, per la regola 4 qui sopra.

La seconda passata di `ICS-05` vive **dentro** quella purezza: aritmetica civile
da `anchors.ts`, mai `Date`.

---

## Nessun analogo trovato

| Cosa | Ruolo | Flusso | Perche' non c'e' |
|---|---|---|---|
| **`fetch` di una sorgente esterna con timeout e categorie d'errore** | client HTTP | request-response | Nel repo esiste **un solo** `fetch` fuori dal browser (`scripts/rls-baseline.mjs:268`, `:288`) ed e' **senza timeout**: distingue solo *non-OK* da *non-JSON*. `src/lib/sumup.ts` passa dall'SDK. Il codice piu' vicino per **timeout** e' `src/lib/offline/sync-manager.ts:436`, che pero' e' codice di browser con `navigator`/service worker: la sua forma non trasferisce. **Il piano scrive questo pezzo da zero**, e le categorie da distinguere (irraggiungibile · non autorizzato · non-`.ics` · troppo piccolo) sono quattro, non una. |
| **Una superficie serverless che legge il calendario** | route | file-I/O remoto | ⚠ **Non e' un vuoto: e' una decisione contraria.** `D-44-26` vieta una superficie di upload, e la mappa di responsabilita' di `58-RESEARCH.md` assegna la lettura del `.ics` allo **script locale**, perche' *«un `.ics` che transita in una funzione serverless porta sedi in trattativa nei log»*. `D-58-05` chiede comunque che lo specchio giri da solo. **I due si toccano e il piano deve dichiarare come**, invece di far sembrare che il cron sia l'estensione naturale di un pattern esistente. |
| **Uno script che asserisce il codice d'uscita di un altro** | gate | spawn | L'unico `spawnSync` di un gate su un altro e' `verify-all.mjs:549`, che **raccoglie** un verdetto e non ne **attende** uno preciso. Le prove «uscita 2 senza `--calendar`» (`ICS-02`), «uscita 2 senza sorgente» (`ICS-09`) e «uscita 2 su feed dimezzato» (`ICS-10a`) non hanno un precedente di forma. La forma piu' vicina per *asserire un esito atteso da un modulo* e' `verify-comment-stripper.mjs:437-470`, e va adattata dal modulo al processo. |
| **Un `DELETE` in produzione da uno script** | script scrivente | batch | **Non esiste nel repo.** `import-production-calendar.mjs:62-67` dichiara testualmente *«There is no removal statement in this file and no list that could carry one»*, e `verify-refusal.mjs:35` tiene `delete` fra i cinque verbi che lo farebbero rifiutare su se stesso. Il pattern piu' vicino e' la **rimozione per chiave primaria da una lista catturata prima**, che vive in una **procedura** e non in codice: `44-PROCEDURES.md:268-276`. |
| **Una funzione `SECURITY DEFINER` che riceve un payload `jsonb`** | migration | transazione | `record_checklist_tick` (`20260815120100:395-460`) e' `SECURITY DEFINER` con `SET search_path = ''` e con `REVOKE`+`GRANT` in `20260815120200`, ma prende **argomenti scalari**. Un payload `jsonb` di ~100 righe non ha precedente: la forma della funzione si copia, la validazione degli argomenti si scrive. |

---

## Metadata

**Ambito della ricerca degli analoghi:** `scripts/`, `supabase/migrations/`,
`src/app/api/cron/`, `src/app/(admin)/admin/calendar/`,
`src/app/(admin)/admin/(work)/calendar/`, `src/lib/production/ics/`,
`src/types/database.ts`, `.planning/phases/44-*/`, `package.json`, `vercel.json`.

**File aperti e letti:** 24 · **estratti con `file:riga`:** 41
**Data:** 2026-08-20
