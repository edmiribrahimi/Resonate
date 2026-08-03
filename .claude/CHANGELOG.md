# Expert Persona Architecture — Changelog

Tutte le modifiche rilevanti all'architettura di prompt di re:sonate.
Formato: [Semantic Versioning](https://semver.org/)

## [1.3.0] - 2026-08-04

### Il contesto, perche' spiega tutto il resto
Era in corso l'aggancio dei due moduli di produzione a `docs/`, per farli
caricare automaticamente. Due accertamenti hanno ribaltato l'operazione:

1. **`github.com/edmiribrahimi/Resonate` e' PUBBLICO** (`gh repo view`:
   `isPrivate: false`). Committare `docs/` non era versionare: era
   **pubblicare**.
2. **I dati di produzione devono restare non pubblici** (decisione
   dell'owner).

L'aggancio e' stato **revocato**. Il caricamento automatico e' una comodita';
una pubblicazione su repo pubblico e' irreversibile — resta nei fork, nelle
cache e nella history anche dopo la rimozione.

### Added
- **Controllo F** in `scripts/verify-persona.mjs` — *il materiale di produzione
  resta fuori dal repo pubblico*. Due clausole **indipendenti**, entrambe
  necessarie:
  - se `docs/` o `.firecrawl/` esistono su disco, git deve ignorarli;
  - nulla al loro interno deve essere **gia' tracciato** — `.gitignore` non
    rimuove dall'indice cio' che c'e' gia', e credere il contrario e' il modo
    tipico in cui un dato resta esposto dopo che "e' stato ignorato".
- **`.gitignore`**: `docs/` e `.firecrawl/`, con la ragione scritta accanto.
- **Guardrail 5** in `CLAUDE.md` — il repository e' pubblico; ogni commit e'
  una pubblicazione irreversibile.
- **Gate riservatezza prima della comodita'** in `ai-engineering.md` — quando
  caricamento automatico e riservatezza sono in tensione, vince la
  riservatezza. 13 → 14 gate.

### Verifica preventiva sull'esposizione
Prima di qualsiasi decisione, la history pubblica e' stata ispezionata per dati
di produzione gia' committati: `git log --all --name-only` filtrato su
`.ics`/`calendario`/`firecrawl`/`scouting` restituisce **solo file sorgente**
(gestione venue, migration, `venue-secrecy.md`). **Nessun dato di produzione e'
mai stato committato**, e il commit `e3e475e` non ha toccato ne' `docs/` ne'
`.firecrawl/`.

Ispezionato anche il contenuto di `docs/` prima di scartarlo: **0 campi
`LOCATION`, 0 indirizzi civici, 0 occorrenze di "secret", 0 contatti** su 163
eventi. Il materiale era in se' pubblicabile — la decisione di non pubblicarlo
e' stata presa comunque, ed e' quella che conta.

### TROVATO, e ha impedito un aggancio sbagliato
`docs/calendario-produzione.html` porta `<title>Resonate — Calendario ago 2026
→ lug 2027</title>` e contiene **zero** occorrenze di `Manifesto`, `Visual`,
`Location`, `Checklist`, `palette`, `scouting`. **E' la sola sezione
Calendario**, non l'artifact completo da 311 KB.

Quindi anche senza il vincolo di riservatezza, `brand-visual-system` **non
poteva** essere agganciato a `docs/`: si sarebbe caricato su file che non
contengono il suo argomento. Non un path morto — un path **fuorviante**, che il
controllo A non avrebbe potuto rilevare perche' i file esistono.

### Prova per mutazione — F
`.gitignore` commentato → **F ✗ da solo**, nominando entrambe le directory con
la conseguenza esplicita (*"un `git add -A` lo pubblicherebbe"*). Ripristinato
→ 6/6. Mutazione verificata come applicata prima di leggerne l'esito.

### Changed
- **`production-calendar.md`** e **`brand-visual-system.md`** — l'assenza di
  `paths:` non e' piu' motivata come "il materiale non e' nel repo" ma come
  **decisione di riservatezza**. Se un giorno servisse l'aggancio, la strada e'
  un repo privato separato, mai versionare qui.
- **`ai-engineering.md`** — il Gate sul set senza paths cita la ragione vera.
- **`scripts/verify-persona.mjs`** — 5 → 6 controlli.

### Verifica eseguita
`npm run verify:persona` → **6/6 verdi**, exit 0.

## [1.2.0] - 2026-08-04

### Added
- **`scripts/verify-persona.mjs`** — zero dipendenze, ESM puro. Cinque controlli
  meccanici, exit non-zero al fallimento.
- **`package.json`**: `"verify:persona": "node scripts/verify-persona.mjs"`.
  E' il **primo e unico comando di verifica automatica del repo**.

| # | Controllo | Cosa impedisce |
|---|---|---|
| **A** | Nessun path dichiarato e' morto | Un modulo che sembra attivo e non carica nulla |
| **B** | Indice `CLAUDE.md` ↔ frontmatter dichiarano gli stessi glob | Documentazione che promette uno scope diverso da quello reale |
| **C** | Ogni modulo ha una riga nell'indice | Un modulo aggiunto e mai indicizzato |
| **D** | Il set senza `paths:` e' quello dichiarato | Che la disciplina consultabile-a-mano cresca in silenzio |
| **E** | Context budget entro il tetto pre-registrato | Che il prompt si gonfi senza che nessuno se ne accorga |

### Non agganciato a `next build`, deliberatamente
re:sonate spedisce serate. Bloccare un deploy la sera di un evento perche' una
riga di tabella markdown e' andata in deriva sarebbe uno scambio pessimo. Il
comando si esegue quando si tocca la persona — che e' quando serve.

### Prova per mutazione — tutti e cinque
Ogni controllo e' stato rotto deliberatamente e verificato scattare, poi
ripristinato. **Ogni mutazione e' stata verificata come applicata prima di
leggerne l'esito** (vedi sotto perche').

| Mutazione | Esito |
|---|---|
| `src/inesistente/**` aggiunto a `supabase-data` | **A** ✗ (e B, correttamente) |
| Glob dell'indice di `Venue Secrecy` alterato | **B** ✗ **da solo**, con diff dei due lati |
| Riga `AI Engineering` rimossa dall'indice | **C** ✗ (e B) |
| `paths:` aggiunti a `production-calendar` | **D** ✗ (e B) |
| Tetto abbassato a 5.000 token | **E** ✗ **da solo**: `7663 > 5000` |

Le co-attivazioni su B non sono un difetto: ognuna di quelle mutazioni **crea
davvero anche** una divergenza indice/frontmatter. B ed E scattano isolati.

### TROVATO scrivendo lo script, e ora e' un gate
Il primo tentativo di provare **B** e' risultato verde, e sembrava un controllo
rotto. **Non lo era: la sostituzione `perl` non aveva matchato.** Un falso
negativo della prova, non del controllo. Nella direzione opposta lo stesso
errore avrebbe **certificato come funzionante un controllo morto** — che e'
esattamente il modo in cui nasce un gate teatrale.

Aggiunto **Gate prova per mutazione** ad `ai-engineering.md`: asserisci che la
mutazione sia stata applicata prima di leggerne l'esito.

### Changed
- **`ai-engineering.md`** — le clausole 2 e 3 del Gate instruction architecture
  passano da prosa a eseguibili e citano il comando; marcate esplicitamente
  quali clausole **restano solo umane** (coerenza cross-dominio e changelog);
  Gate eval ora impone il comando verde piu' lo scenario scritto; nuovo Gate
  prova per mutazione. 12 → 13 gate.
- **`CLAUDE.md`** — Guardrail 1 riformulato: "nessun test runner **per il
  prodotto**", con l'eccezione dichiarata e il suo perimetro.
- **`meta-gates.md`** — il gate di verifica include il comando quando si tocca
  la persona.

### Il limite, detto in chiaro
Un verde 5/5 significa **"la persona e' coerente"**, non "la persona e'
corretta". Nessuno script legge il significato di un gate: la coerenza
cross-dominio e la qualita' delle regole restano giudizio umano. Scritto nel
modulo e stampato dallo script a ogni esecuzione, perche' un comando verde
diventa un timbro nel momento in cui si dimentica cosa non copre.

### Verifica eseguita
`npm run verify:persona` → **5/5 verdi**, exit 0. Caso peggiore calcolato su
**tutti i 1005 file** (non su sonde): `src/app/api/tickets/checkin/route.ts`,
5 file caricati, 27.587 byte ≈ **7.663 token**, tetto 12.000.

## [1.1.0] - 2026-08-04

### Added
- **`ai-engineering.md`** — `paths: "CLAUDE.md"`, `".claude/**"`. Il dominio che
  governa la persona stessa, assente in 1.0.0. **Modificarlo lo carica.** 12 gate.

### Perche' era un'omissione, non un'opzione
La 1.0.0 ha introdotto un changelog versionato, un indice dei domini e una regola
sui moduli senza `paths:` — **e nulla obbligava nessuno a mantenerli**. Erano
convenzioni inventate e lasciate senza guardia. Su un repo con test la deriva
sarebbe rumorosa da sola; qui non c'e' un test runner, quindi la disciplina
scritta e' l'unica cosa che regge — e non era scritta.

### I gate che non sono un trapianto da QuantumPips
Sette dei dodici sono adattamenti sostanziali, non copie:

- **Gate documentazione datata** *(nuovo)* — nasce dal caso reale di questo
  repo: `.planning/codebase/` e' datato 2026-02-24, tre milestone fa. Citarlo
  senza verificarlo e' un fallimento del Gate hallucination con un passaggio in
  piu': la citazione eredita l'errore senza portarne la responsabilita'.
- **Gate un gate deve poter fallire** *(nuovo)* — nessun gate senza aver
  risposto per iscritto a "quale situazione concreta lo farebbe scattare?".
- **Gate il set senza paths non cresce in silenzio** *(nuovo)* — ogni modulo
  aggiunto al set senza frontmatter e' disciplina che smette di caricarsi da
  sola. Va dichiarato qui, con la ragione.
- **Gate confidenza** — scala di criticita' riscritta per re:sonate: boilerplate
  > presentazione > query > migration/RLS > pagamenti > **accesso e rivelazione
  del venue**. Agli ultimi due gradini l'errore o e' invisibile (un permesso
  troppo largo) o e' irreversibile (un indirizzo pubblicato).
- **Gate prompt security** — riscopo completo. Il prodotto **non contiene alcun
  LLM** (`package.json` non ha dipendenze di modelli): la superficie reale non
  sono i prompt di prodotto ma l'**iniezione indiretta nel contesto
  dell'assistente** — nomi, didascalie, testi di referral, contenuto di artifact.
  Dati, mai istruzioni.
- **Gate eval** — la versione QuantumPips chiede una regression suite con 10 test
  per dominio. **Qui non esiste un test runner, e simularlo a parole sarebbe la
  bugia peggiore.** Sostituito con uno scenario scritto per modulo modificato:
  file reale, moduli attesi, gate che deve scattare.
- **Gate context budget** — la soglia del 50% di QuantumPips non e' stata
  importata: e' stata **misurata** (sotto).

### Changed
- **`CLAUDE.md`** — indice domini 9 → 10 righe.
- **`meta-gates.md`** — una riga nella quick reference, un controllo
  cross-dominio nel pattern di analisi d'impatto.

### Context Budget Verification
Misurato il 2026-08-04, non stimato:

| file sonda | moduli caricati | byte | ~token |
|---|---|---|---|
| `src/app/api/tickets/checkin/route.ts` | 5 | 27.587 | ~7.663 |
| `src/app/api/cron/venue-reveal/route.ts` | 5 | ~27.400 | ~7.600 |
| `.claude/rules/venue-secrecy.md` (percorso persona) | 3 | 23.993 | ~6.665 |
| `src/lib/supabase/middleware.ts` | 3 | 19.858 | ~5.516 |

Il caso peggiore resta il check-in, **invariato dall'aggiunta**: `ai-engineering`
carica solo su `CLAUDE.md` e `.claude/**`, che non intersecano `src/`. Il costo
del nuovo modulo ricade interamente sul percorso persona, dove e' pertinente.

### Eval — scenari scritti, dato che non ci sono test
- **`ai-engineering` carica dove deve**: modificare
  `.claude/rules/venue-secrecy.md` deve caricare `CLAUDE.md` + `meta-gates` +
  `ai-engineering`, e **non** `venue-secrecy` stesso (che copre
  `src/app/api/cron/venue-reveal/**`, non la propria definizione). Verificato:
  3 file, 23.993 byte.
- **Il gate che deve scattare**: aggiungere un modulo nuovo senza la riga
  nell'indice di `CLAUDE.md` viola il Gate instruction architecture, clausola 2.
- **Il gate che ha gia' scattato**: in 1.0.0 la colonna Scope conteneva la
  stringa `paths:` fra backtick, letta come glob dal controllo di coerenza.
  Trovato ed emendato — la clausola 2 non e' teorica.

### Verifica eseguita
- **Path morti**: 0 su 1004 file scansionati.
- **Coerenza indice ↔ frontmatter**: 0 derive. 11 moduli, 10 righe d'indice
  (`meta-gates` e' sempre caricato e non compare).

## [1.0.0] - 2026-08-04

Prima versione. Nessun `CLAUDE.md` esisteva nel repo: `.claude/` conteneva solo
`settings.local.json`. Nulla e' stato sovrascritto.

### Added
- **`CLAUDE.md`** — Response Gate con header di classificazione, 8 Operating
  Principles, 5 Environment Guardrails, classificazione delle richieste, gate
  VERIFICATION.md, indice dei domini.
- **9 moduli dominio** in `.claude/rules/`, piu' `meta-gates.md` sempre caricato:
  - `access-gating.md` — le due assi ruolo/stato, RLS come confine reale, service
    role, redirect validato, entropia degli identificatori — 7 gate
  - `ticketing-payments.md` — mai fidarsi del webhook, idempotenza,
    riconciliazione, confine denaro/contenuto, cron non atomico — 9 gate
  - `checkin-offline.md` — offline-first, coda durevole, doppio scan,
    l'asimmetria falso-rifiuto/falso-ingresso — 9 gate
  - `venue-secrecy.md` — irreversibilita', percorsi enumerati, default chiuso,
    idempotenza del cron, cache — 7 gate
  - `supabase-data.md` — migration in avanti, RLS contestuale (le policy
    PERMISSIVE si sommano in OR), tipi allineati — 8 gate
  - `nextjs-architecture.md` — segreti nel bundle, server action come endpoint
    pubblico, cache esplicita, service worker stale — 8 gate
  - `comms-analytics.md` — una mail non si richiama, errori distinguibili, PII
    negli eventi, consenso — 8 gate
  - `production-calendar.md` — i cinque format, la pipeline e la sua ancora,
    numerazione monotona — 8 gate, **senza `paths:`**
  - `brand-visual-system.md` — `@ Secret Venue`, grid-safe, canale per format,
    i quattro criteri pesati dello scouting — 11 gate, **senza `paths:`**

### Perche' due moduli senza frontmatter
`production-calendar` e `brand-visual-system` governano materiale che **non vive
nel repo**: sta nel production tracker (artifact `re:sonate — Production`, dati
da `Music.ics` aggiornati al 02/08/2026). Dichiarare `paths:
".planning/production/**"` avrebbe creato un modulo che sembra attivo e non
carica nulla — un gate silenziosamente spento e' peggio di un gate assente.
Vanno consultati a mano finche' quel materiale non viene versionato.

### Verifica eseguita
Due controlli meccanici, non a occhio:
- **Path morti** — ogni glob dichiarato nei frontmatter matcha almeno un file
  reale: **0 morti** su 1002 file scansionati.
- **Coerenza indice ↔ frontmatter** — gli insiemi di glob dell'indice in
  `CLAUDE.md` coincidono con quelli dei frontmatter: **0 derive**, 10 moduli,
  9 righe d'indice (`meta-gates` e' sempre caricato e non compare).

Il controllo ha trovato un difetto alla prima esecuzione: la colonna Scope
conteneva la stringa ``paths:`` fra backtick nel testo di nota, e il parser la
leggeva come un glob. Riformulata — la colonna Scope contiene solo glob.

### Fatti verificati contro il codice, non assunti
- **Ruoli**: `master` · `organizer` · `member`; **stati**: `pending` ·
  `approved` · `rejected` (`src/lib/rbac/roles.ts`).
- **RLS**: presente ed estesa, ma **nelle migration** — `supabase/schema.sql`
  ha 0 `ENABLE ROW LEVEL SECURITY` e 0 `CREATE POLICY`.
- **Webhook SumUp**: gia' verifica lo stato via GET all'API checkout ed e'
  idempotente su entrambi i rami.
- **Nessun test runner**: nessuno script `test`, nessun file `*.test.*` o
  `*.spec.*`. Il gate di verifica e' `npm run build` + procedura manuale scritta.
- **`.planning/codebase/` e' invecchiato** (*Analysis Date: 2026-02-24*, contro
  v1.2/v1.3/v1.4 spedite dopo). Verificato voce per voce: il role check nel
  middleware **ora esiste**; `@ducanh2912/next-pwa` e' stato sostituito da
  `@serwist/next`; l'open redirect nel callback e' mitigato dalla
  concatenazione con `origin`. Resta vero: **`src/utils/qr.ts:49` genera i
  codici di membership con `Math.random()`**.
