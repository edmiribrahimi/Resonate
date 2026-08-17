---
phase: 45-production-sections-section-by-section
verified: 2026-08-18T12:00:00Z
status: gaps_found
score: 1/4 success criteria pienamente verificate (strutturalmente + comportamentalmente); 3/4 hanno solo la meta' strutturale
overrides_applied: 0
gaps:
  - truth: "Entitlement e' per sezione: un viewer che tiene UNA chiave e' rifiutato sulle altre tre, e il rifiuto viene dalla row-level policy (criterio 1)"
    status: partial
    reason: "La meta' strutturale regge (16 policy SELECT, 4 chiavi distinte, lette da pg_policies). La meta' comportamentale — un soggetto con ESATTAMENTE una chiave rifiutato sulle altre — non e' mai stata misurata da nessuna parte: non in produzione, perche' D-45-03 concede tutte e quattro le chiavi solo a master e organizer (nessun soggetto con una chiave sola esiste); non altrove, perche' la procedura P1 richiede un ambiente throwaway che non e' mai stato allestito. Result: pending, dichiarato NON ESEGUITO dal proprietario il 2026-08-18."
    artifacts:
      - path: ".planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md"
        issue: "P1 (righe 161-253), Result: pending, riga 213 — blocco 'DECLARED NOT RUN' righe 215-253"
    missing:
      - "Allestire l'ambiente throwaway, creare un account con una sola chiave sezione, eseguire P1 passo per passo e registrare le cinque osservazioni per i quattro indirizzi"
  - truth: "Una sezione senza contenuto dichiara il vuoto invece di riempirlo, e nessuna superficie implica una decisione (criterio 3), incluso il caso 'coordinate dichiarate senza manifesto scritto'"
    status: partial
    reason: "La meta' strutturale regge (check C di verify:section-surface, vincolo DB production_section_not_decided_names_its_gap). La lettura umana — se un lettore ingenuo legge il pannello come 'dichiarato' e non come 'rotto' — non e' mai stata misurata. Procedura P3, Result: pending, dichiarata NON ESEGUITA il 2026-08-18."
    artifacts:
      - path: ".planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md"
        issue: "P3 (righe 332-391), Result: pending, riga 361"
    missing:
      - "Un lettore che non ha letto questa fase, davanti alle tre schermate (scritta, coordinate dichiarate, non decisa), con le risposte verbatim registrate"
  - truth: "Uno spazio porta il suo stadio ovunque venga nominato, e uno stadio diverso da acquired si legge come tale (criterio 2)"
    status: partial
    reason: "La meta' strutturale regge (check A di verify:section-surface: SpaceName.tsx e' l'unico renderer del nome e nomina StageBadge). Se un lettore ingenuo legge il badge come uno stadio di negoziazione (e non come decorazione) non e' mai stato misurato. Procedura P2, Result: pending, dichiarata NON ESEGUITA il 2026-08-18."
    artifacts:
      - path: ".planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md"
        issue: "P2 (righe 257-329), Result: pending, riga 295"
    missing:
      - "Un lettore ingenuo davanti a righe ai quattro stadi contemporaneamente, con la domanda 'quale potremmo usare domani' e la risposta verbatim registrata"
  - truth: "Ogni percorso di lettura di sezione e' provato rifiutato da una sessione priva della sua capability, con un ruolo reale (criterio 4)"
    status: partial
    reason: "Misurato con successo per calendario e location: production_pipeline_rule 16/0/0 per tre letture consecutive (prima dello split, dopo lo split, dopo il ritiro), production_space 184/0/0, production_space_attribute 1840/0/0 — tutte con sessioni reali coniate via API auth e revocate globalmente, non con la service key. Per manifesto e visual (production_section, production_visual_asset, production_open_question sulle sezioni autoriali) le tabelle sono VUOTE: sulla stessa lettura un soggetto entitled e uno non-entitled restituiscono gli stessi zero byte, quindi lo strumento si rifiuta di dichiarare una misura ('nothing was measured') invece di dichiarare un pass. Il criterio e' quindi provato per 2 sezioni su 4."
    artifacts:
      - path: ".planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md"
        issue: "Righe 88-134 (A4, non presa), righe 106-112 (la misura che copre il criterio, datata e attribuita)"
    missing:
      - "Righe scritte nelle tabelle manifesto/visual (fuori scope di questa fase, la scrittura e' materiale editoriale) e una quarta esecuzione dello strumento di rifiuto dopo che quelle righe esistono"
  - truth: "Il codice che chiude i due difetti CRITICAL della code review e' quello che gira in produzione"
    status: failed
    reason: "CR-01 e CR-02 sono risolti nei commit locali 94cb395 e a00b8f3 (con relativo commit di chiusura b4c3de3), ma NESSUNO dei tre e' su origin/main. Verificato: git log origin/main -1 = 13f6be8; git rev-list --count origin/main..main = 14; git branch -r --contains 94cb395 e --contains a00b8f3 = vuoto (nessun branch remoto li contiene). 13f6be8 e' anche l'ultimo deployment di produzione confermato in 45-09-SUMMARY.md:71-105 (GitHub deployment API, sha 13f6be87, environment Production, success). Quindi produzione sta ancora servendo il codice che fila byte orfani nel bucket visual-archive (CR-01) e che attribuisce una regola di un format ritirato all'intero brand (CR-02)."
    artifacts:
      - path: "src/app/(admin)/admin/visual/ArchiveUpload.tsx"
        issue: "Il fix e' nel commit locale 94cb395, non su origin/main; la versione deployata e' quella descritta nel reperto originale di CR-01 (45-REVIEW.md:184-268)"
      - path: "src/lib/production/export/manifesto.ts"
        issue: "Il fix e' nel commit locale a00b8f3, non su origin/main; la versione deployata e' quella descritta nel reperto originale di CR-02 (45-REVIEW.md:319-403)"
    missing:
      - "git push dei commit 94cb395, a00b8f3, b4c3de3 (e dei commit di wave 9, vedi sotto) su origin/main, e conferma del deployment Vercel successivo"
  - truth: "Le quattro sezioni sono raggiungibili dalla navigazione con la propria chiave (parte del criterio 1, wave 9 / piano 45-18)"
    status: failed
    reason: "Il piano 45-18 (commit locale 247d14d, 'le quattro sezioni entrano nella navigazione') non e' su origin/main. origin/main e' fermo a 13f6be8, che precede 247d14d di 10 commit. Le pagine delle sezioni (location, manifesto, visual) risultano deployate dalle wave precedenti — confermato da `npm run build` locale, che le include nel manifest delle route — ma le voci di navigazione a 4 chiavi aggiunte da 45-18 in src/lib/routes/staff-tabs.ts non sono ancora nel bundle di produzione. Questo non e' stato segnalato nello stato misurato fornito in ingresso, ed e' un riscontro indipendente di questo verificatore."
    artifacts:
      - path: "src/lib/routes/staff-tabs.ts"
        issue: "Modificato dal commit locale 247d14d, non presente su origin/main (verificato: git branch -r --contains 247d14d = vuoto)"
    missing:
      - "Lo stesso git push richiesto per il gap precedente copre anche questo: sono sullo stesso ramo di commit non pubblicati"
---

# Fase 45: Production Sections, Section by Section — Verification Report

**Phase Goal:** Ogni sezione di produzione e' entitled separatamente, perche' non
portano lo stesso rischio — lo scouting tiene trattative aperte, il sistema
visivo non tiene alcun segreto. Tenere una sezione non ne concede nessun'altra.

**Verified:** 2026-08-18
**Status:** gaps_found
**Re-verification:** No — prima verifica

## Goal Achievement

### Observable Truths (dai quattro criteri di successo del roadmap)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Entitlement per sezione, rifiuto dalla RLS non dalla navigazione | ⚠️ PARZIALE | Strutturale: 16 policy SELECT / 4 chiavi, `supabase/migrations/20260817120300_production_sections_access.sql:122-126,185-198,356-360`. Comportamentale (P1, un soggetto con una sola chiave): mai eseguita, ne' in produzione (nessun soggetto simile esiste, D-45-03) ne' in un ambiente throwaway (mai allestito). `45-PROCEDURES.md:213` `Result: pending` |
| 2 | Lo stadio di uno spazio e' visibile ovunque il nome compare | ⚠️ PARZIALE | Strutturale: `src/app/(admin)/admin/location/SpaceName.tsx:1,80` importa e renderizza `StageBadge` come unico renderer del nome, provato da `verify:section-surface` check A. Lettura umana (P2): mai eseguita. `45-PROCEDURES.md:295` `Result: pending` |
| 3 | Una sezione senza contenuto dichiara il vuoto, non lo riempie | ⚠️ PARZIALE | Strutturale: `src/app/(admin)/admin/manifesto/SectionVoid.tsx` unico renderer del ramo `not_decided`, nomina `missing` e `decision_owner`, provato da check C. Vincolo DB `production_section_not_decided_names_its_gap`. Lettura umana (P3): mai eseguita. `45-PROCEDURES.md:361` `Result: pending` |
| 4 | Ogni percorso di lettura provato rifiutato con un ruolo reale, non la service key | ⚠️ PARZIALE | Misurato per 2 sezioni su 4: `production_pipeline_rule` 16/0/0 (x3, prima/dopo split/dopo ritiro), `production_space` 184/0/0, `production_space_attribute` 1840/0/0 — sessioni reali coniate e revocate globalmente, `45-PROCEDURES.md:79-86,106-112`. Manifesto e visual: tabelle vuote, lo strumento si rifiuta di misurare (non passa, non fallisce — non misura) |

**Score:** 0/4 criteri pienamente chiusi in modo verificabile — tutti e quattro hanno solo la meta' strutturale/meccanica; la meta' comportamentale (l'unica che i quattro criteri effettivamente richiedono, perche' la parte meccanica e' gia' assicurata da gate automatici che passano) e' **dichiarata debito, non chiusa**, per decisione esplicita del proprietario del 2026-08-18.

**Nota di lettura obbligatoria.** Questo verificatore non riclassifica "deferred" come "passed": ogni riga sopra segnata PARZIALE resta una lacuna ai fini di questo report, non una prova. `45-PROCEDURES.md` stesso lo scrive nel proprio blocco di chiusura (righe 495-517): *"The phase is closed. The criteria are not."*

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `supabase/migrations/20260817120300_production_sections_access.sql` | Policy SELECT per sezione, una chiave ciascuna | ✓ VERIFICATO | righe 122-126 (location), 185-198 (manifesto/visual su `production_section`), 282-325 (5 archi su `production_open_question`), 356-360 (visual asset) |
| `src/components/production/StageBadge.tsx` | Badge stadio, mai assente, nessun colore che codifichi lo stadio | ✓ VERIFICATO | righe 47-51: `Badge` sempre renderizzato, "stage unknown" se `null`, nessuna classe di colore condizionale |
| `src/app/(admin)/admin/location/SpaceName.tsx` | Unico renderer del nome, con `StageBadge` nello stesso subtree | ✓ VERIFICATO | riga 80: `<StageBadge stage={stage} />` accanto al nome |
| `src/app/(admin)/admin/manifesto/SectionVoid.tsx` | Unico renderer di `not_decided`, nomina `missing` e `decision_owner` | ✓ VERIFICATO | file presente, commento di testa dichiara l'invariante, check C di `verify:section-surface` lo prova per nome |
| `src/lib/production/ics/vocabulary.ts` | Vocabolario a 4 stadi identico a `venue-acquisition.md` | ✓ VERIFICATO | righe 186-195: `["mapped","verified","contacted","acquired"]` |
| `.planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md` | 4 procedure di verifica comportamentale, con esito | ✗ TUTTE PENDING | righe 213, 295, 361, 435 — tutte `Result: pending`, tutte dichiarate NON ESEGUITE il 2026-08-18 |
| Fix CR-01 (`ArchiveUpload.tsx`) | In produzione | ✗ NON DEPLOYATO | commit locale `94cb395`, assente da `origin/main` |
| Fix CR-02 (`export/manifesto.ts`, `export/capitolato.ts`) | In produzione | ✗ NON DEPLOYATO | commit locale `a00b8f3`, assente da `origin/main` |
| Navigazione a 4 chiavi (`staff-tabs.ts`, piano 45-18) | In produzione | ✗ NON DEPLOYATO | commit locale `247d14d`, assente da `origin/main` |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `production_space` (tabella) | `private.has_capability('production.location.manage')` | RLS `USING` | ✓ WIRED | `20260817120300_production_sections_access.sql:122-126` |
| `production_section` (manifesto/visual) | due chiavi distinte per `format_id` scope | RLS `USING` | ✓ WIRED | righe 185-198 |
| `production_visual_asset` | `private.has_capability('production.visual.manage')` | RLS `USING` | ✓ WIRED | righe 356-360 |
| Sessione reale (auth API, non service key) | lettura tabelle produzione | `verify-refusal.mjs` | ✓ WIRED, misurato 2 sezioni su 4 | `45-PROCEDURES.md:79-86,106-112` |
| Commit locale (fix + wave 9) | `origin/main` / deploy Vercel | `git push` | ✗ NOT WIRED | `git log origin/main -1` = `13f6be8`; 14 commit locali non pubblicati, inclusi i due fix CRITICAL e la navigazione a 4 chiavi |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `SpaceName.tsx` | `stage` (prop) | letto da `production_space.stage` via query RLS-gated in `admin/location/(work)/page.tsx` | Si, 184 righe reali (seed A3) | ✓ FLOWING |
| `ScoreCell.tsx` / `AttributeCell.tsx` | punteggio/provenienza calcolati | `score.ts`, mai persistiti, calcolati a render-time dagli attributi reali (1840 righe) | Si | ✓ FLOWING |
| `SectionVoid.tsx` | `missing`, `decision_owner` | `production_section` — tabella VUOTA in produzione (nessuna riga scritta, materiale editoriale fuori scope) | No, non ancora popolata | ⚠️ STATIC (per costruzione dichiarata, non un difetto — nessuna sezione manifesto/visual e' stata scritta) |
| `PaletteSwatches.tsx` | `formats.color` | letto a runtime, `NOT NULL` sul DB | Si (colore esiste sempre), ma la distinzione "palette vs colore d'identificazione" dipende da una dimensione in pixel che nessun assert misura (check D, dichiarato "weak") | ⚠️ NON MISURABILE via grep — procedura P4 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Build tipizza senza errori | `npm run build` | 0 errori, route `/admin/location`, `/admin/manifesto`, `/admin/visual` presenti nel manifest | ✓ PASS |
| `verify:capabilities` (17 chiavi, 4 ruoli, letto da produzione) | `npm run verify:capabilities` | 5/5 verde, `production.location.manage`/`manifesto`/`visual`/`calendar` tutte presenti in `private.capabilities` e in `src/` | ✓ PASS |
| `verify:section-surface` (5 check strutturali A-E) | `npm run verify:section-surface` | `SECTION_SURFACE_OK — 5 check(s) passed` | ✓ PASS |
| `verify:section-export` (chiusura + censimento) | `npm run verify:section-export` | `SECTION_EXPORT_OK`, 9 colonne pinnate/derivate correttamente escluse, nessuna strada trovata verso indirizzo/data | ✓ PASS |
| `npm run verify` (19 gate) | `npm run verify` | exit 2, ZERO fallimenti — solo `verify:conversion` e `verify:touch-targets` rifiutano su 4 pagine Finance/Analytics gia' rimosse (DEF-45-01, pre-esistente, non di questa fase) | ✓ PASS (nella forma corretta per un rifiuto pre-esistente) |
| I due fix CRITICAL sono sul ramo pubblicato | `git log origin/main -1`, `git branch -r --contains 94cb395/a00b8f3/247d14d` | `origin/main` = `13f6be8`; nessun branch remoto contiene i tre commit | ✗ FAIL — non deployato |

### Probe Execution

Non applicabile in senso stretto (nessuno `scripts/*/tests/probe-*.sh` dichiarato per questa fase). Le quattro procedure `45-PROCEDURES.md` P1-P4 sono l'equivalente funzionale — script manuali con passi numerati e risultato atteso — e sono trattate sopra come parte delle Observable Truths, non come probe automatiche: nessun comando le esegue, per costruzione (richiedono un occhio umano o un ambiente che nessun piano ha ricevuto mandato di allestire).

| Probe | Command | Result | Status |
|---|---|---|---|
| P1 — un tenutario di una chiave rifiutato sulle altre | (manuale, ambiente throwaway) | non eseguita | MISSING_PROBE (dichiarato, non un difetto di questo verificatore) |
| P2 — lo stadio si legge come stadio | (manuale, lettore ingenuo) | non eseguita | MISSING_PROBE |
| P3 — il vuoto si legge come dichiarato | (manuale, lettore ingenuo) | non eseguita | MISSING_PROBE |
| P4 — non chiesto vs assente; dimensione dello swatch | (manuale, lettore ingenuo + righello) | non eseguita | MISSING_PROBE |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| PROD-02 | 45-01 … 45-18 (tutti e 18) | "Production sections are visible per section to the staff entitled to them" | ⚠️ NEEDS HUMAN + GAP DI DEPLOY | `REQUIREMENTS.md:148` ancora `[ ]`, `REQUIREMENTS.md:270` "Phase 45 | Pending" — coerente con questo report: il requisito non e' chiudibile finche' P1-P4 non sono eseguite e il codice fix+navigazione non e' deployato |

Nessun requisito orfano: PROD-02 e' l'unico ID dichiarato nei 18 piani e l'unico assegnato alla fase 45 in `REQUIREMENTS.md`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/app/(admin)/admin/manifesto/ExportPanel.tsx` | 130-142 | `revokeObjectURL` sincrono subito dopo `click()`, messaggio di successo comunque mostrato | ⚠️ Warning (WR-01, aperta) | Fallimento silenzioso con messaggio di successo sull'unico atto della fase che consegna un documento a un terzo |
| `src/app/(admin)/admin/manifesto/actions.ts` | 442-477 | `closeQuestion` legge poi scrive senza predicato sulla `UPDATE` | ⚠️ Warning (WR-03, aperta) | Due chiusure concorrenti si sovrascrivono |
| `src/lib/production/sections/score.ts` | 378-381 | Accesso non protetto `FORMAT_WEIGHTS[formatCode]` su oggetto letterale | ⚠️ Warning (WR-04, aperta) | Un `code` come `constructor` fa saltare l'intera superficie location |
| `scripts/verify-refusal.mjs` | 557-573 | `signOut(token, "global")` invece di `"local"` | ⚠️ Warning (WR-05, aperta) | Disconnette ogni sessione del master e di un membro reale a ogni run del gate |
| `src/app/(admin)/admin/location/actions.ts` | 673-679, 1310-1312 | Regex contatti troppo permissiva, applicata anche a colonna che non dichiara il divieto | ⚠️ Warning (WR-06, aperta) | Falsi positivi su prosa legittima di scouting |
| `src/lib/production/sections/visual-archive.ts` | 219-222 | Nessuna validazione forma/unicita' su `object_key` | ⚠️ Warning (WR-07, aperta) | Puo' bruciare una chiave `UNIQUE` senza upload corrispondente |
| `src/app/(admin)/admin/location/actions.ts` | 1716-1723, 884-959 | Indirizzo copiato alla promozione, poi modificabile solo sulla copia vecchia | ⚠️ Warning (WR-08, aperta) | Le due superfici divergono in silenzio, e la copia "vecchia" e' quella da cui si serve un indirizzo pubblico |
| `src/app/(admin)/admin/location/PromoteSpaceDialog.tsx` | 134-139 | Fallback irraggiungibile su `Record` totale | ℹ️ Info (IN-01) | Falsa sensazione di rete di sicurezza |
| `src/lib/media/finalize.ts` / `visual/actions.ts` | vari | Nessuno sweep ne' percorso di rimozione prodotto per `visual-archive` | ℹ️ Info (IN-02) | Completa CR-01: l'oggetto orfano non e' recuperabile nemmeno a mano |
| vari file azioni | vari | `updated_at` da orologio app su `UPDATE`, da `now()` DB su `INSERT` | ℹ️ Info (IN-03) | Possibile inversione di ordinamento con skew di orologio |
| — | — | Nessun `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` trovato nei file toccati da questa fase | — | Verificato con grep mirato sui moduli `production/sections`, `production/export`, e le pagine delle tre sezioni |

Nessuna delle 8 warning e 3 info e' un blocker per questo report (nessun debt-marker non referenziato, nessuna presente sul cammino critico dei quattro criteri). Restano debito aperto, gia' contato in `45-REVIEW.md` e `deferred-items.md` (DEF-45-01/02/03/09/10/11), e non vengono riaperte qui.

### Human Verification Required

Le quattro procedure sotto non sono "suggerimenti" di questo verificatore: sono
le procedure gia' scritte da `45-PROCEDURES.md`, con Result ancora `pending`, e
sono l'unico modo dichiarato per chiudere i criteri 1, 2, 3 e la meta' di
D-45-16 che l'automazione non puo' raggiungere.

#### 1. P1 — Un tenutario di una chiave e' rifiutato sulle altre

**Test:** Allestire un ambiente throwaway con le migration di questa fase,
creare un account con **una sola** chiave sezione, richiedere le quattro
superfici e leggere le tabelle di ciascuna sezione con il **token di accesso
proprio** dell'account (mai la service key).
**Expected:** Rendering/righe solo per la sezione posseduta; per le altre tre,
rifiuto dalla row-level policy (non dal middleware, non dalla navigazione).
**Why human:** Nessun soggetto con una chiave sola esiste in produzione
(D-45-03 concede tutte e quattro a master/organizer insieme) e manufacturarne
uno in produzione e' vietato (D-45-23). Serve un ambiente separato, mai
allestito da nessun piano.

#### 2. P2 — Lo stadio si legge come stadio

**Test:** Con righe ai quattro stadi visibili insieme, chiedere a un lettore
che non ha letto questa fase: "quale di questi potremmo usare domani sera?"
**Expected:** Il lettore usa il badge/stadio per rispondere, non tratta ogni
riga come ugualmente disponibile.
**Why human:** E' una lettura di uno schermo da parte di una persona che non
conosce il significato del badge in anticipo — nessuna asserzione automatica
puo' simularlo.

#### 3. P3 — Il vuoto si legge come dichiarato, non come rotto

**Test:** Su una sezione `not_decided`, chiedere a un lettore ingenuo "c'e'
qualcosa di sbagliato o mancante in questa schermata?"
**Expected:** Il lettore non la chiama rotta, fallita, vuota o in ritardo; sa
dire cosa manca e di chi e' la decisione.
**Why human:** "Dichiarato" e "rotto" sono gli stessi byte per un grep — la
differenza e' un giudizio umano.

#### 4. P4 — Non chiesto vs assente; una palette non e' un colore

**Test:** (a) Su uno spazio con attributi misti (risposti/non chiesti/assenti),
chiedere quali sono noti e quali non sono mai stati chiesti. (b) Sulla sezione
visual di MotionLab (nessuna palette), misurare in pixel la dimensione del
colore d'identificazione e chiedere "quali sono i colori di questo format?"
**Expected:** (a) le tre categorie sono distinguibili senza spiegazione. (b) il
lettore dice che il format non ha ancora colori.
**Why human:** Una dimensione in pixel non e' misurabile da un grep, e la
distinzione semantica "non chiesto" vs "assente" e' un giudizio, non una
stringa.

### Gaps Summary

Questa fase ha costruito correttamente **la meta' meccanica** di tutti e
quattro i criteri di successo: quattro chiavi capability separate, sedici
policy RLS che le usano una per sezione, un badge di stadio co-locato col nome
in un unico renderer, un pannello "vuoto dichiarato" co-locato in un unico
renderer con vincolo DB, e uno strumento di rifiuto che ha gia' misurato — con
sessioni reali, non con la service key — che due sezioni su quattro (calendario
e location) rifiutano davvero un lettore non entitled: `production_pipeline_rule`
16/0/0 per tre letture, `production_space` 184/0/0, `production_space_attribute`
1840/0/0.

Quello che manca, e resta debito dichiarato dal proprietario stesso il
2026-08-18, e' **la meta' comportamentale** dei tre criteri rimanenti: nessuna
persona ha mai guardato uno schermo per confermare che uno stadio si legge come
stadio, che un vuoto si legge come dichiarato, o che un tenutario di una chiave
sola viene davvero rifiutato sulle altre tre (quest'ultimo non misurabile
nemmeno in produzione, perche' nessun simile soggetto vi esiste). `pending` e'
lo stato onesto e dichiarato, non un errore di questo verificatore, e questo
report lo riporta come **deferred, non come verificato**, per istruzione
esplicita ricevuta.

A questo si aggiunge un gap che questo verificatore ha misurato in modo
indipendente e che va oltre quanto riportato nello stato misurato fornito in
ingresso: **14 commit locali, inclusi i due fix CRITICAL della code review
(`94cb395`, `a00b8f3`) e l'intera wave 9 — la navigazione a quattro chiavi del
piano 45-18 (`247d14d`) — non sono su `origin/main`**, che e' fermo al commit
`13f6be8`, lo stesso confermato come ultimo deployment di produzione in
`45-09-SUMMARY.md`. Produzione sta quindi servendo oggi: (a) il difetto per cui
un upload nell'archivio visual senza `kind`/`artist_name` fila comunque i byte
nel bucket privato lasciando un oggetto orfano irrecuperabile; (b) il difetto
per cui un documento d'export puo' attribuire all'intero brand una regola
scritta per un format ritirato; (c) nessuna voce di navigazione a chiave
singola per le quattro sezioni (le pagine sono raggiungibili per URL diretto,
gia' deployate dalle wave precedenti, ma non dal menu). Questo e' un gap
azionabile e indipendente dalle quattro procedure manuali: la riparazione e' un
`git push` dei commit gia' scritti, non altro lavoro di sviluppo.

---

_Verified: 2026-08-18_
_Verifier: Claude (gsd-verifier)_
