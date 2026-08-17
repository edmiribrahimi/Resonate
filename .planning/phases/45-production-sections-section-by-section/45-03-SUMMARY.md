---
phase: 45-production-sections-section-by-section
plan: 03
subsystem: access-control
tags: [capability-model, rls, migration, production-sections]
requires:
  - "private.capabilities / private.role_capabilities (20260807000000_capability_model.sql)"
  - "the six production_* tables and their SELECT arms (20260815120100_production_calendar_access.sql)"
provides:
  - "production.calendar.manage · production.manifesto.manage · production.visual.manage · production.location.manage"
  - "the four settled addresses: /admin/calendar (+ /[id]), /admin/location (+ /[id]), /admin/manifesto, /admin/visual"
  - "the six calendar SELECT arms, rewritten onto the calendar section key"
  - "the retirement of production.read, sequenced after the deploy"
affects:
  - "plan 45-05 (keys.ts, capability-routes.ts, staff-tabs.ts, verify-capabilities.mjs)"
  - "plan 45-08 (applies the additive migration)"
  - "plan 45-09 (applies the retirement migration)"
tech-stack:
  added: []
  patterns:
    - "additive-then-retire: two migrations, zero windows in which an entitled reader is refused"
    - "the (SELECT ...) InitPlan wrapper on every capability policy body"
    - "removal by key and by pair, never by a prefix selector"
key-files:
  created:
    - supabase/migrations/20260817120000_production_section_keys.sql
    - supabase/migrations/20260817120500_production_read_retire.sql
  modified: []
decisions:
  - "D-45-04 realised as SQL: four keys under production.<section>.manage, three segments, precedented by membership.card.view"
  - "The four addresses settled and checked against the live pattern list before any file named them"
  - "Twelve DROP statements for six arms, so the rename stays idempotent (supabase-data.md, gate idempotenza DDL)"
metrics:
  duration: ~35 min
  completed: 2026-08-17
  tasks: 3
  files: 2
  commits: 2
---

# Phase 45 Plan 03: The Key Split, as SQL — Summary

Due migration additive-then-retire che spezzano `production.read` in quattro
chiavi di sezione senza mai lasciare un istante in cui un master entitled venga
rifiutato — la prima conia le chiavi e sposta le sei policy lasciando la vecchia
chiave al suo posto, la seconda la ritira dopo il deploy.

## Cosa e' stato costruito

**Nessuna delle due e' stata applicata.** Sono testo. La prima la applica il
piano 45-08, la seconda il 45-09, ognuna con la propria autorizzazione e il
proprio read-back. `npm run build` verde non dice nulla su di esse: **nessun
build in questo repo legge un file `.sql`**, e non esiste un test runner.

---

## Task 1 — I quattro nomi e i quattro indirizzi, controllati prima di scriverli

### Le quattro chiavi, carattere per carattere

```
production.calendar.manage
production.manifesto.manage
production.visual.manage
production.location.manage
```

Sono queste, esattamente, le stringhe che stanno nella migration e che il piano
45-05 deve copiare in `CAP` e in `CAP_DESCRIPTIONS`. Tre segmenti, precedute da
`membership.card.view` (`src/lib/capabilities/keys.ts:194`); prefisso
`production.` per tenerle raggruppate; verbo `manage` e non `read` perche'
D-45-06 dice che chi legge una sezione la scrive — `read` prometterebbe meno di
quanto la chiave apre.

### I quattro indirizzi

| Indirizzo | Stato |
|---|---|
| `/admin/calendar`, `/admin/calendar/[id]` | invariati |
| `/admin/location`, `/admin/location/[id]` | nuovi |
| `/admin/manifesto` | nuovo |
| `/admin/visual` | nuovo |

### La lista dei pattern, verbatim

`node scripts/verify-routes.mjs --print-patterns` — **exit 0**:

```
26 pattern(s) collected from the CAPABILITY_ROUTES object literal:
  /admin/scanner
  /door
  /admin/newsletter
  /admin/members/growth
  /admin
  /admin/artists
  /admin/venues
  /admin/venues/[slug]
  /admin/members
  /admin/events
  /admin/events/new
  /admin/events/[id]/edit
  /admin/events/[id]/tickets
  /admin/events/[id]/sales
  /admin/events/[id]/guest-list
  /admin/events/[id]/drinks
  /admin/events/[id]/analytics
  /admin/events/[id]/assignments
  /admin/members/register
  /admin/events/[id]/media
  /admin/events/[id]/review
  /membership-card
  /attendance
  /admin/formats
  /admin/calendar
  /admin/calendar/[id]
```

### Come si decide un pareggio, letto dal codice e non ricordato

`src/lib/routes/capability-routes.ts:739-768`. Il doppio ciclo confronta una
coppia **solo se** `segments.length` coincide **e** `dynamicCount` coincide; poi
dichiara sovrapposizione se in ogni posizione i due letterali non sono entrambi
non-nulli e diversi. Un segmento dinamico compila a `literal === null`, quindi
`[id]` e `[slug]` sono indistinguibili per il confronto: **conta la posizione,
non il nome.**

I 26 pattern esistenti, per classe:

| Classe (segmenti, dinamici) | Pattern |
|---|---|
| (1, 0) | `/door`, `/admin`, `/membership-card`, `/attendance` — 4 |
| (2, 0) | `/admin/scanner`, `/admin/newsletter`, `/admin/artists`, `/admin/venues`, `/admin/members`, `/admin/events`, `/admin/formats`, `/admin/calendar` — 8 |
| (3, 0) | `/admin/members/growth`, `/admin/members/register`, `/admin/events/new` — 3 |
| (3, 1) | `/admin/venues/[slug]`, `/admin/calendar/[id]` — 2 |
| (4, 1) | le nove `/admin/events/[id]/…` — 9 |

Totale 4+8+3+2+9 = **26**, che e' il numero stampato.

### Il verdetto, indirizzo per indirizzo

- **`/admin/location`** — classe (2, 0). Confrontato con gli 8 pattern della
  stessa classe. Segmento 0: `admin` = `admin`, entrambi letterali e uguali,
  quindi il ciclo prosegue. Segmento 1: `location` contro `scanner`,
  `newsletter`, `artists`, `venues`, `members`, `events`, `formats`, `calendar`
  — otto letterali, tutti diversi, quindi `overlaps` va a `false` su ognuno.
  **Nessun pareggio.**
- **`/admin/manifesto`** — stessa classe, stesso confronto, `manifesto` diverso
  dagli otto. **Nessun pareggio.**
- **`/admin/visual`** — stessa classe, `visual` diverso dagli otto. **Nessun
  pareggio.**
- **Fra i tre nuovi**: `location`, `manifesto`, `visual` differiscono a due a due
  sul segmento 1. **Nessun pareggio.**
- **`/admin/location/[id]`** — classe (3, 1). L'unica classe con cui viene
  confrontato contiene due pattern: `/admin/venues/[slug]` (segmento 1 `venues`,
  diverso) e `/admin/calendar/[id]` (segmento 1 `calendar`, diverso). Con i tre
  pattern (3, 0) il ciclo **non arriva** al confronto dei letterali: `dynamicCount`
  1 contro 0 lo fa uscire alla guardia. **Nessun pareggio.**

**Perche' il controllo valeva un paragrafo:** il `throw` in fondo a quel file
gira **al module load dentro il bundle del middleware**, non a `npm run build`.
Un pareggio non e' una pagina rotta — e' un 500 su ogni rotta che il middleware
copre, il webhook dei pagamenti e il percorso di scansione alla porta inclusi.

Task 1 non ha prodotto modifiche al repository, quindi **non ha un commit
proprio**: la sua evidenza e' questa sezione, che arriva con il commit del
SUMMARY.

---

## Task 2 — `20260817120000_production_section_keys.sql`

Una transazione. Quattro righe di capability, otto grant, sei policy riscritte,
e il vecchio permesso lasciato dov'e'.

Commit: `2888e1f`

**Le prove meccaniche** (i grep del piano, eseguiti):

| Criterio | Atteso | Misurato |
|---|---|---|
| `grep -c "^BEGIN;"` | 1 | **1** |
| `grep -c "^COMMIT;"` | 1 | **1** |
| `grep -cE "'production\.(calendar\|manifesto\|visual\|location)\.manage'"` | ≥18 | **18** |
| `grep -c "CREATE POLICY"` | 6 | **6** |
| `grep -c "(SELECT private.has_capability("` | 6 | **6** |
| `grep -ci "delete"` | 0 | **0** |
| `grep -ci "bet on the signup path"` | 4 | **4** |
| `grep -c "DROP POLICY IF EXISTS"` | 6 | **12** — vedi deviazione |
| otto tuple nel blocco dei grant, nessun `true` | 8 / 0 | **8 / 0** (`true` e' assente dall'intero file) |

**I motivi portati avanti, non solo le policy.** Il file ricopia in sostanza: il
perche' di una sola transazione (una riga di capability senza i suoi grant
risolve `false` per **tutti**, master compreso); i tre rifiuti dichiarati —
`staff`, `member`, `anon` — con **un paragrafo per chiave** e una ragione di
dominio diversa per ognuna, e il rimando a dove sono *asseriti* invece che
creduti (`verify-capabilities.mjs`, lato 5, nel commit del piano 45-05); i
riusi respinti con la **direzione** dell'errore, ai quali si aggiunge il quinto
che questa fase esiste per disfare — `production.read` tenuta per tutte e quattro
le sezioni, che non puo' rifiutarne **una**; il paragrafo dell'uniformita' (la
tabella che non contiene materiale prende lo stesso braccio delle altre cinque,
perche' *questa tabella e' innocua da sola* e' il modo in cui un percorso di
lettura si apre per gradi); e il paragrafo delle policy di scrittura assenti, che
finisce sulla sua frase piu' affilata — **il service client non e' un confine, e'
l'assenza di un confine**.

**Il paragrafo che giustifica il file.** `production.read` e i suoi due grant
restano. Nell'intervallo fra questa migration e il deploy: il guard del bundle
vecchio chiede `production.read`, ancora concessa; le sei policy chiedono la
chiave del calendario, concessa alle stesse due ruoli. **Nessuno viene rifiutato,
in nessun istante.** Ed e' possibile solo perche' il vincolo 3 di D-45-04 vieta
ai grant di restringere o allargare.

---

## Task 3 — `20260817120500_production_read_retire.sql`

Commit: `8f92b46`

| Criterio | Atteso | Misurato |
|---|---|---|
| `grep -c "WHERE key = 'production.read'"` | 1 | **1** |
| `grep -vE "^\s*--" \| grep -ci "like"` | 0 | **0** |
| `grep -vE "^\s*--" \| grep -c "DELETE FROM"` | 3 | **3** |
| `grep -ci "after the deploy"` | ≥1 | **2** |
| `grep -vE "^\s*--" \| grep -c "public\."` | 0 | **0** |

**L'ordine, letto dal vincolo invece che indovinato.** Il piano chiedeva di dire
*quale delle due* fosse la ragione. E' la seconda, e non quella che la mano
scriverebbe per prima: `private.role_capabilities.capability` referenzia
`private.capabilities(key)` **`ON DELETE CASCADE`**
(`20260807000000_capability_model.sql:120-125`). La foreign key **non
rifiuterebbe** l'ordine inverso — porterebbe via i due grant in silenzio, dentro
un solo statement. Per un file la cui ragione d'essere e' rispondere a *la
portata e' cambiata?*, uno statement con due effetti invisibili nasconde meta'
della risposta. Tre statement, tre effetti visibili, e la cascata non scatta mai
perche' non resta nulla da raggiungere.

**Il selettore di prefisso e' nominato per essere riconosciuto.** Dopo questa
fase `LIKE 'production%'` prende anche le quattro chiavi di sezione: una
rimozione scritta cosi' toglierebbe l'intera superficie di produzione a entrambi
i ruoli, e la superficie risponderebbe `false` senza errore e senza riga di log.

**La precondizione sta nell'header, in maiuscolo**, dove la legge chi applica.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — vincolo di progetto] Dodici `DROP POLICY IF EXISTS` invece di sei**

- **Found during:** Task 2
- **Issue:** il criterio di accettazione fissava sei `DROP` — un conteggio
  calcolato assumendo che le sei policy conservassero il **nome** che hanno oggi.
  Ma il nome codifica la chiave (`production_plan_select_production_read`), e una
  policy che si chiama `..._production_read` mentre il corpo chiede
  `production.calendar.manage` **e' un nome che mente**, su un file che esiste
  per essere letto. Rinominandole, sei `DROP` sul solo nome pre-split lasciano la
  migration **non idempotente**: alla seconda applicazione il `CREATE` fallisce su
  un oggetto che esiste gia'.
- **Fix:** ogni tabella viene liberata **da entrambi i nomi** — quello pre-split e
  quello post-split — prima che il suo unico braccio venga scritto. Dodici `DROP`
  per sei bracci.
- **Perche' e' un vincolo e non una preferenza:** `.claude/rules/supabase-data.md`,
  *gate idempotenza DDL* — «una migration che fallisce alla seconda esecuzione
  blocca un deploy in un momento scomodo» — e il file analogo
  (`20260815120100_production_calendar_access.sql:24-37`) dichiara l'idempotenza
  proprio perche' *riapplicare un file per scrupolo e' la reazione naturale a uno
  scrupolo*. Le regole del progetto hanno precedenza sull'istruzione del piano.
- **L'intento del criterio e' soddisfatto piu' strettamente, non meno:** sei
  bracci esistono prima del file e sei dopo. `CREATE POLICY` = 6, misurato.
  Nessun braccio permissivo affiancato a un altro, che e' cio' che T-45-10 teme.
- **Files modified:** `supabase/migrations/20260817120000_production_section_keys.sql`
- **Commit:** `2888e1f`

Nessun'altra deviazione. Nessun gate di autenticazione incontrato.

---

## Verification

- `node scripts/verify-routes.mjs --print-patterns` — **exit 0**, output
  registrato verbatim sopra.
- I grep dei task 2 e 3 — eseguiti e tabulati sopra.
- `npm run build` — **`✓ Compiled successfully`**, e con esso il typecheck di
  Next, che qui e' l'unico gate dei tipi.

### Cosa un verde **non** significa

Niente di quanto sta qui e' stato applicato. `verify:capabilities` a questo punto
e' ancora verde **contro il modello vecchio**: il database tiene quattordici
chiavi e `keys.ts` ne dichiara quattordici. Va **rosso** nel piano 45-05 (il
codice ne dichiara diciassette, il database quattordici), resta rosso fra
l'applicazione della migration additiva e il deploy, e torna verde **solo** dopo
il piano 45-09. **E' il gate che funziona, dichiarato in anticipo** perche' un
rosso a meta' sequenza non arrivi come una sorpresa.

E non esiste alcun test runner per il prodotto: nessuna riga di questo SUMMARY
va letta come «i test passano».

---

## Known Stubs

Nessuno. I due file sono completi e autoconsistenti; cio' che manca — le entry in
`keys.ts`, il binding delle rotte, le tabelle delle tre sezioni — appartiene per
costruzione ai piani 45-05 e seguenti, ed e' nominato nei file dove serve.

## Threat Flags

Nessuna superficie di sicurezza nuova oltre a quelle gia' nel `<threat_model>`
del piano. Le due migration non creano tabelle, non creano funzioni, non toccano
`venue_for_parties` e non aggiungono alcun percorso verso un indirizzo pubblico.

## Self-Check: PASSED

- `supabase/migrations/20260817120000_production_section_keys.sql` — FOUND
- `supabase/migrations/20260817120500_production_read_retire.sql` — FOUND
- commit `2888e1f` — FOUND
- commit `8f92b46` — FOUND
