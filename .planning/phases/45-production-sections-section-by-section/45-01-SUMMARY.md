---
phase: 45-production-sections-section-by-section
plan: 01
subsystem: database
tags: [postgres, supabase, rls, typescript, vocabulary, migrations, scouting]

# Dependency graph
requires:
  - phase: 44-the-production-calendar-comes-inside
    provides: "il modulo dei vocabolari `src/lib/production/ics/vocabulary.ts` (da cui questo piano ri-esporta VENUE_STAGES), la casa dello stile delle migration strutturali, e il pattern RLS-attiva-zero-policy con gli archi in un file separato"
provides:
  - "src/lib/production/sections/vocabulary.ts — undici vocabolari chiusi con tipo derivato e Record di etichette TOTALE"
  - "public.production_space e public.production_space_attribute (file, non applicati)"
  - "public.production_section, public.production_open_question, public.production_visual_asset (file, non applicati)"
  - "cinque row type in src/types/database.ts che importano i vocabolari dalla sorgente letterale"
affects: [45-02, 45-03, 45-04, 45-05, 45-06, 45-07, 45-08, 45-09, 45-10, 45-11, 45-12, 45-13, 45-14, 45-15, 45-16, 45-17, 45-18]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vocabolario chiuso: tupla `as const` + tipo derivato + Record TOTALE di etichette, specchiata da un CHECK SQL nominato"
    - "RLS attiva nella migration STRUTTURALE con zero policy: la tabella e' chiusa dal momento in cui esiste, gli archi arrivano nel file d'accesso"
    - "Il valore sentinella al posto del NULL: `not_asked` e' un valore in quattro insiemi, e le colonne che lo portano sono NOT NULL"
    - "Il vincolo che porta una decisione ha un nome che la dice (acquired_needs_evidence, exit_xor_reason, promotion_needs_acquired, not_decided_names_its_gap)"

key-files:
  created:
    - src/lib/production/sections/vocabulary.ts
    - supabase/migrations/20260817120100_production_location.sql
    - supabase/migrations/20260817120200_production_sections.sql
  modified:
    - src/types/database.ts

key-decisions:
  - "SIZE_BANDS ha quattro membri e il quarto e' il marcatore del non-chiesto: misurato nella fonte, la banda vale p/m/g/v e la v e' 'verifica', non una quarta taglia"
  - "VISUAL_ASSET_KINDS e' stato aggiunto al modulo dei vocabolari invece di restare una union inline nel file dei tipi: quel CHECK e' un mirror reale e una union scritta due volte e' una divergenza che tsc non vede"
  - "requirements-completed resta vuoto: PROD-02 e' un requisito di FASE che diciassette altri piani condividono, e questo piano non lo chiude"
  - "Il conflitto con supabase-data.md (gate tabella nuova = policy nuova) e' documentato dentro entrambe le migration: RLS con zero policy rifiuta tutti, master compreso, ed e' piu' restrittiva di qualunque policy questi file potessero scrivere"

patterns-established:
  - "Il banner ⚠ INTERNAL viaggia in coppia: sulla colonna SQL e sul campo TypeScript, nello stesso commit"
  - "Un'assenza che un modulo di dominio argomenterebbe si scrive come decisione dentro il file (regime, vicinato, qualunque colonna che classifichi), o il prossimo lettore la richiude come ovvia"

requirements-completed: []
requirements-contributed: [PROD-02]

# Metrics
duration: 34min
completed: 2026-08-17
---

# Phase 45 Plan 01: Le cinque tabelle delle tre sezioni — Summary

**Undici vocabolari chiusi in un solo modulo, cinque tabelle scritte come file con ogni vincolo dentro il `CREATE TABLE` e RLS attiva a zero policy, e cinque row type che importano i vocabolari dalla sorgente letterale — nulla di applicato.**

## Performance

- **Duration:** ~34 min
- **Tasks:** 3 su 3
- **Files modified:** 4 (3 creati, 1 modificato)

## Accomplishments

- **I vocabolari hanno una casa sola.** `SECTION_STATES`, `SECTION_KINDS`, `EXIT_REASONS`, `ATTRIBUTE_KEYS`, `ATTRIBUTE_VALUES`, `ATTRIBUTE_PROVENANCE`, `ANSWERS_SOURCE`, `EXTENDED_HOURS_STANCE`, `SIZE_BANDS`, `SPACE_CATEGORIES` e `VISUAL_ASSET_KINDS` — undici tuple `as const`, ognuna con il tipo derivato e un `Record` **totale** di etichette, che e' l'unica parte del contratto che il compilatore riesce a tenere in un repo senza test runner. Le quattro fasi di acquisizione **non** sono ridichiarate: `VENUE_STAGES` e' ri-esportato dal modulo che gia' lo possiede.
- **Le quattro decisioni che contano sono strutturali, non ricordate.** `production_space_acquired_needs_evidence` (acquisito significa per iscritto), `production_space_exit_xor_reason` (si esce con un perche' e un quando, non si cancella), `production_space_promotion_needs_acquired` (una classifica non e' una disponibilita': l'unico attraversamento verso `venues` parte da una sola fase), `production_section_not_decided_names_its_gap` (un vuoto nomina la propria lacuna e il proprio proprietario).
- **`not_asked` e' un valore, mai una cella vuota**, in quattro insiemi, e le colonne che lo portano sono `NOT NULL`. Una cella vuota e una domanda non fatta sono lo stesso pixel finche' il dato non le distingue — e sull'attributo della fattibilita' serale il non-chiesto e' la maggioranza dell'archivio.
- **`extended_hours_stance` porta il divieto scritto in due posti** (il docblock e il commento sopra la colonna): nessun crawl, nessuna inferenza e nessun default lo muovono dal non-chiesto. E' l'unica colonna nata per impedire *derivato non e' verificato*, e riempirla per deduzione sarebbe commettere quell'errore proprio li'.
- **Nessuna colonna che classifica, su nessuna tabella**, e l'assenza e' argomentata dentro il file. Il punteggio si calcola dagli attributi con i pesi dichiarati del format, al momento in cui qualcuno chiede.
- **Le tre sezioni scritte hanno tre stati e nessun default.** Entrambi i default candidati sbagliano in direzioni opposte: `written` riempie il vuoto, `not_decided` risponde al posto di una coordinata gia' dichiarata.

## Task Commits

1. **Task 1: i vocabolari chiusi** — `75471e6` (feat)
2. **Task 2: le due tabelle della location** — `ea0fbcb` (feat)
3. **Task 3: le tre tabelle delle sezioni e i cinque row type** — `e8634a9` (feat)

## Files Created/Modified

- `src/lib/production/sections/vocabulary.ts` — undici vocabolari chiusi, il tipo derivato e il `Record` totale di etichette per ognuno; ri-esporta `VENUE_STAGES` e `VenueStage`.
- `supabase/migrations/20260817120100_production_location.sql` — `production_space` (25 colonne, 12 vincoli nominati) e `production_space_attribute`; tre indici; RLS attiva su entrambe, zero policy. **NO MATERIAL**: nessuno spazio, nessun indirizzo, nessun candidato.
- `supabase/migrations/20260817120200_production_sections.sql` — `production_section`, `production_open_question`, `production_visual_asset`; quattro indici (uno parziale sulle domande ancora aperte); RLS attiva su tutte e tre, zero policy.
- `src/types/database.ts` — `ProductionSpace`, `ProductionSpaceAttribute`, `ProductionSection`, `ProductionOpenQuestion`, `ProductionVisualAsset`, piu' l'import dei dieci tipi dal modulo dei vocabolari. Il banner ⚠ INTERNAL e' ripetuto su `name`, `address` e `artist_name` nello stesso commit del lato SQL.

## Verifica eseguita — e cosa NON dimostra

| Criterio | Comando | Esito |
|---|---|---|
| tuple `as const` ≥ 9 | `grep -c "as const"` su `vocabulary.ts` | **11** |
| le fasi non sono ridichiarate | `grep -c '"mapped"'` su `vocabulary.ts` | **0** |
| il sentinella e' presente ≥ 3 volte | `grep -c "not_asked"` su `vocabulary.ts` | **12** |
| nessun vocabolario di punteggio | `grep -vE '^\s*(\*|//)' \| grep -ci "score"` | **0** |
| una transazione sola (location) | `grep -c "^BEGIN;"` / `"^COMMIT;"` | **1 / 1** |
| ogni vincolo dentro il CREATE | `grep -c "ADD CONSTRAINT"` su entrambe | **0 / 0** |
| i vincoli che portano una decisione | `grep -cE "production_space_(acquired_needs_evidence\|exit_xor_reason\|promotion_needs_acquired\|source_key_unique)"` | **5** (≥4) |
| RLS attiva, zero policy (location) | `grep -c "ENABLE ROW LEVEL SECURITY"` / `"CREATE POLICY"` | **2 / 0** |
| nessuna colonna che classifica | `grep -vE '^\s*--' \| grep -ci "score"` | **0** |
| nessun materiale di candidato | `grep -cE "[Vv]ia \|[Cc]orso \|[Pp]iazza "` | **0** |
| le tre tabelle di sezione | `grep -cE "production_(section\|open_question\|visual_asset)"` | **27** (≥3) |
| RLS attiva, zero policy (sezioni) | `grep -c "ENABLE ROW LEVEL SECURITY"` / `"CREATE POLICY"` | **3 / 0** |
| i due vincoli nominati della sezione | `grep -cE "production_section_(not_decided_names_its_gap\|written_has_a_body)"` | **2** |
| i tipi importano dalla sorgente | `grep -c 'from "@/lib/production/sections/vocabulary"'` | **1** |
| i vocabolari non sono ripetuti nei tipi | `grep -cE "coordinates_declared. \| .not_decided"` | **0** |
| typecheck | `npm run build` | **exit 0** |

**Cosa un verde NON significa, e va detto invece di lasciarlo intendere.** Nessuna delle due migration e' stata applicata. `npm run build` verifica che il codice che consuma queste dichiarazioni sia coerente **con le dichiarazioni**, e passerebbe identico contro un database vuoto: nessun client Supabase di questo repo e' parametrizzato con `Database`, quindi il compilatore non ha mai visto una colonna vera. Nessun `grep` su un file `.sql` dimostra che quell'SQL sia valido. Lo schema diventa un fatto nel piano 45-08, con la risposta dell'endpoint di migrazione e la rilettura del catalogo, e non prima.

## Decisions Made

1. **`SIZE_BANDS` ha quattro membri e il quarto e' il marcatore del non-chiesto.** Il piano diceva *"la banda a quattro valori della fonte, nominata in inglese"*. Misurata la fonte: i quattro valori sono tre taglie piu' il marcatore *verifica*, presente su 17 record su 184. Nominarla come quattro taglie avrebbe inventato una taglia e perso una domanda non fatta — e l'avrebbe persa nel modo che questo piano combatte ovunque.
2. **`VISUAL_ASSET_KINDS` e' entrato nel modulo dei vocabolari.** Il task 3 impone *"non ripetere nessun vocabolario qui"* per il file dei tipi, ma il task 1 non aveva dato una casa al tipo di asset — che ha un `CHECK` SQL, quindi un mirror reale. Lasciarlo inline sarebbe stata l'unica union del piano scritta due volte.
3. **`requirements-completed` resta vuoto.** PROD-02 e' il requisito dell'intera fase e diciassette piani lo condividono: dichiararlo completo qui sarebbe la forma piu' silenziosa di fallimento silenzioso. Il contributo e' registrato in `requirements-contributed`.
4. **Il conflitto con `supabase-data.md` e' scritto dentro i file, non risolto di nascosto.** Quel gate chiede RLS **e almeno una policy** nella stessa migration; qui la policy manca per necessita' d'ordine (una policy che nomina una chiave che non esiste ancora fa rollback della transazione). Vince il piu' restrittivo, come dice `meta-gates.md`: zero policy rifiuta tutti, master compreso.
5. **`created_at`/`updated_at` aggiunti dove il piano elencava solo `updated_at`.** Ogni tabella del repo li porta entrambi, e la loro assenza sarebbe stata letta come intenzionale da chi legge dopo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical] `VISUAL_ASSET_KINDS` aggiunto al modulo dei vocabolari**
- **Found during:** Task 3
- **Issue:** Il tipo di asset visivo ha un `CHECK` SQL nominato ma nessuna casa TypeScript, e il task 3 vieta di ripetere un vocabolario nel file dei tipi. Le due istruzioni insieme non erano soddisfacibili.
- **Fix:** `VISUAL_ASSET_KINDS`, `VisualAssetKind` e il `Record` totale di etichette aggiunti a `src/lib/production/sections/vocabulary.ts`; il row type lo importa.
- **Files modified:** `src/lib/production/sections/vocabulary.ts`, `src/types/database.ts`
- **Verification:** `grep -c "as const"` = 11 (il criterio chiedeva ≥ 9); `npm run build` exit 0.
- **Committed in:** `e8634a9`

**2. [Rule 1 — Bug] Il conteggio `ENABLE ROW LEVEL SECURITY` nella migration di location era 3 invece di 2**
- **Found during:** Task 2
- **Issue:** La stringa compariva anche in un paragrafo di prosa dell'intestazione, quindi il criterio di accettazione (esattamente 2) falliva su un file corretto. Un criterio che scatta su lavoro giusto e' un criterio che verra' ignorato la terza volta.
- **Fix:** Il paragrafo ora rimanda alla sezione 0 invece di citare il letterale.
- **Verification:** `grep -c "ENABLE ROW LEVEL SECURITY"` = 2.
- **Committed in:** `ea0fbcb`

**3. [Rule 2 — Missing critical] `created_at` aggiunto alle tre tabelle di sezione**
- **Found during:** Task 3
- **Issue:** L'elenco delle colonne del piano portava `updated_at` senza `created_at` su `production_section`; ogni altra tabella del repo ha entrambi.
- **Fix:** `created_at timestamptz NOT NULL DEFAULT now()` su tutte e tre, e i campi corrispondenti nei row type.
- **Committed in:** `e8634a9`

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 bug in un criterio di accettazione)
**Impact on plan:** Nessuno scope creep. Le tre correzioni servono la coerenza che il piano stesso chiede.

## Findings — una misura che contraddice il 45-CONTEXT.md

> **Solo conteggi. Nessuna riga, nessun nome, nessun indirizzo: `.planning/` e' tracciato e questo repo e' pubblico.**

**La capienza numerica NON e' nulla su tutti e 184 i record.** Il `45-CONTEXT.md` lo afferma due volte — nella revisione di D-45-11 (*"numeric capacity is null on all 184"*) e nella tabella di `<code_context>` (*"numeric is null on all 184"*) — e ne deriva una conseguenza per la superficie: *"«quante persone ci stanno davvero» non ha risposta per nessuno spazio oggi"*.

Misurato il 2026-08-17 sull'export locale, contando il campo direttamente: **38 record su 184 portano un numero**, su venti valori distinti. Gli altri 146 sono vuoti.

**Perche' conta, e perche' non blocca questo piano.** Non cambia nulla di strutturale: `real_capacity integer` nullable e' la forma giusta con 0 o con 38 risposte. Cambia due cose piu' avanti:

- **il piano 45-07** deve importare quel campo dove c'e', invece di darlo per assente;
- **la superficie della location** non puo' dire *"nessuno spazio ha una capienza"*: alcuni ce l'hanno, e il resto e' non-chiesto — che e' esattamente la distinzione che questa fase costruisce ovunque.

E' anche un caso da manuale del gate *documentazione datata* di `ai-engineering.md`: un'affermazione derivata, citata due volte, che nessuno aveva riverificato contro la fonte. Va corretta nel `45-CONTEXT.md` o nel documento di verifica della fase, **non ereditata**.

**Seconda misura, minore:** la banda di capienza ha quattro valori e il quarto e' il marcatore del non-chiesto (17 record su 184). Il contesto la descriveva come *"un enum a quattro valori"* senza notare che uno dei quattro non e' una taglia.

## Threat Flags

Nessuna superficie nuova oltre a quelle gia' nel registro del piano. Le mitigazioni assegnate a questo piano sono state applicate:

| Threat | Disposizione | Come e' stata applicata qui |
|---|---|---|
| T-45-01 | mitigate | Nessuna FK, vista o funzione da queste tabelle verso `event_parties` o `venues`, salvo `promoted_venue_id` che punta in fuori; banner ⚠ su SQL e TypeScript nello stesso commit. **L'assenza e' dichiarata, non dimostrata** — la dimostrazione e' la closure walk del piano 45-06. |
| T-45-03 | mitigate | Intestazione NO MATERIAL su entrambi i file; grep sui token di via a zero. |
| T-45-10 | mitigate | RLS attiva sui cinque nuovi oggetti nel file strutturale, zero policy. |
| T-45-13 | mitigate | `state` e `provenance` senza default; il sentinella e' un valore e le colonne che lo portano sono `NOT NULL`. |

## Issues Encountered

- **Il worktree non ha `node_modules`.** `npm run build` e' il gate del typecheck di questo repo e non poteva girare. Risolto con un symlink a `node_modules` del repo principale (`node_modules` e' in `.gitignore:4`, quindi nulla e' entrato nell'indice; `git status` lo conferma pulito prima di ogni commit). Non e' stato installato **nessun** pacchetto: questa fase non ne installa (`45-RESEARCH.md`, §Package Legitimacy Audit).
- **Nessun test runner per il prodotto**, come sempre qui. La verifica e' `npm run build` piu' i grep sopra, e nessuno dei due tocca il database.

## Self-Check: PASSED

- `src/lib/production/sections/vocabulary.ts` — FOUND
- `supabase/migrations/20260817120100_production_location.sql` — FOUND
- `supabase/migrations/20260817120200_production_sections.sql` — FOUND
- `src/types/database.ts` — FOUND
- `75471e6`, `ea0fbcb`, `e8634a9` — tutti presenti in `git log`
- Nessuna cancellazione di file tracciati in nessuno dei tre commit (solo inserimenti)

## Next Phase Readiness

- **Pronto per l'onda successiva.** I piani che leggono o scrivono queste tabelle hanno i nomi delle colonne e i vocabolari da importare.
- **Il piano 45-04** aggiunge le chiavi di sezione e gli archi `SELECT`: finche' non lo fa, le cinque tabelle rifiutano tutti, master compreso — e una superficie costruita sopra sembrera' rotta, non rifiutata. E' l'ordine voluto.
- **Il piano 45-06** deve *dimostrare* la chiusura verso `venue_for_parties`, non citarla: qui e' scritta come intento, e un commento non e' una prova.
- **Il piano 45-07** eredita due cose dal blocco Findings: la capienza numerica esiste su 38 record, e la banda ha un marcatore di non-chiesto fra i suoi quattro valori.
- **Il piano 45-08** e' l'unico posto in cui queste due migration diventano fatti.

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
