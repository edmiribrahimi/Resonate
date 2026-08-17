---
phase: 45-production-sections-section-by-section
plan: 15
subsystem: api
tags: [server-actions, rls, service-client, sound-manifesto, brand-visual-system, refusals, no-default]

# Dependency graph
requires:
  - phase: 45-08
    provides: "le tre tabelle di sezione applicate in produzione, con un solo arco SELECT e nessun arco di scrittura"
  - phase: 45-12
    provides: "le due superfici di lettura che questo piano estende, SectionVoid, SectionStateBadge, OpenQuestionNotice"
  - phase: 45-13
    provides: "le convenzioni di scrittura della fase: gate non esportato chiesto per primo, rifiuti restituiti uno per causa, mappa totale sull'unione"
provides:
  - "src/lib/production/sections/write-contract.ts — l'unione dei rifiuti, le tre shape e i controlli, in un modulo PIANO"
  - "src/app/(admin)/admin/manifesto/actions.ts — saveSection e il registro, dietro production.manifesto.manage"
  - "src/app/(admin)/admin/visual/actions.ts — saveSection, dietro production.visual.manage"
  - "src/app/(admin)/admin/manifesto/refusals.tsx — 15 frasi, una per causa, mappa totale provata per mutazione"
  - "src/app/(admin)/admin/manifesto/SectionForm.tsx — un form, due chiamanti, nessuno stato scelto per l'autore"
  - "src/app/(admin)/admin/manifesto/OpenQuestionForm.tsx — aprire e chiudere, senza bloccare niente"
affects: [45-16, 45-17, 45-18, 45-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "due moduli e non uno: ogni export di un file \"use server\" e' un endpoint pubblico, quindi un modulo condiviso pubblica gli endpoint di una sezione alla chiave dell'altra"
    - "la sezione si PINNA nel modulo e non e' mai un argomento: e' cio' che rende dimostrabile che ogni scrittura chiede la propria chiave"
    - "una chiave scrive solo cio' che puo' rileggere — una scrittura invisibile a chi la fa e' un fallimento silenzioso con sopra un messaggio di successo"
    - "un controllo che porta una decisione riparte da nulla a ogni salvataggio, anche dove la riga ne porta gia' una"
    - "il nome della colonna attraversa il form: e' cio' che fa dire all'asserzione di un gate qualcosa sui dati invece che su una convenzione"

key-files:
  created:
    - "src/lib/production/sections/write-contract.ts"
    - "src/app/(admin)/admin/manifesto/actions.ts"
    - "src/app/(admin)/admin/visual/actions.ts"
    - "src/app/(admin)/admin/manifesto/refusals.tsx"
    - "src/app/(admin)/admin/manifesto/SectionForm.tsx"
    - "src/app/(admin)/admin/manifesto/OpenQuestionForm.tsx"
  modified:
    - "src/app/(admin)/admin/(work)/manifesto/page.tsx"
    - "src/app/(admin)/admin/(work)/visual/page.tsx"
    - ".planning/phases/45-production-sections-section-by-section/deferred-items.md"

key-decisions:
  - "D-45-15-A: `section_not_ours` esiste e non era nella lista del piano. Le due sezioni condividono DUE tabelle, quindi senza quel controllo un identificatore basterebbe a una chiave per scrivere le regole dell'altra — o a piantare un avviso su una superficie che non legge. Una chiave scrive solo cio' che puo' rileggere"
  - "D-45-15-B: il controllo dello stato riparte da nulla anche in modifica, non solo in creazione. E' la regola di D-45-13-B applicata alla decisione che la colonna non ha default: uno stato riportato avanti lascerebbe `written` su una regola che l'edit ha svuotato"
  - "D-45-15-C: `missing` e `decision_owner` viaggiano nel form con i NOMI DELLE COLONNE. E' la ragione che SectionVoid da' per le proprie prop: e' cio' che fa dire al check C qualcosa sui dati invece che su una convenzione che due file condividono per caso"
  - "D-45-15-D: le frasi di rifiuto stanno in un file proprio (`refusals.tsx`) e non dentro SectionForm. Due copie deriverebbero senza che niente le confronti, e cosi' SectionForm resta una definizione con esattamente due importatori"
  - "D-45-15-E: le due colonne condizionali si CANCELLANO sotto uno stato che non le usa, invece di essere riportate. Una riga *what is missing* su una regola appena scritta e' vera quando la si digita e falsa appena salvata — e invisibile sulla superficie di lettura, che non disegna nessuna delle due"
  - "D-45-15-F: `formatId` fallito produce `null` e non `[]`. Una lista vuota direbbe *non ci sono formati*, che e' falso; il form dice invece cosa non puo' fare e continua a permettere il salvataggio sul ramo brand-wide"
  - "D-45-15-G: il registro si scrive da UNA sola sezione, e la pagina visual lo DICE. L'assenza di un controllo si legge come una dimenticanza — vedi DEF-45-08"

requirements-completed: [PROD-02]

# Metrics
duration: ~55min
completed: 2026-08-17
---

# Fase 45 Piano 15: le due sezioni d'autore diventano scrivibili — Summary

**Due moduli di scrittura e non uno, perche' ogni export di un file `"use server"`
e' un endpoint pubblico; un form solo, montato da due pagine, che non sceglie
nessuno dei tre stati al posto di chi scrive; e un vuoto che resta salvabile —
*non ancora deciso* e' una risposta qui, non l'assenza di una.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2, piu' un commit di registrazione dichiarato
- **Files:** 9 (6 creati, 3 modificati)

## Task Commits

1. **Task 1 — due moduli di scrittura, una chiave ciascuno** — `ef69d82` (feat)
2. **Task 2 — un form solo, due chiamanti** — `18b3c81` (feat)
3. **DEF-45-08 registrata** — `25dce97` (docs)

## Le due chiavi restano due, e la prova non e' un'affermazione

Il criterio del piano e' misurabile per costruzione, e il modo in cui e' reso
misurabile e' la decisione:

| Asserzione | manifesto/actions.ts | visual/actions.ts |
|---|---|---|
| `CAP.PRODUCTION_MANIFESTO_MANAGE` | **1** | **0** |
| `CAP.PRODUCTION_VISUAL_MANAGE` | **0** | **1** |
| `export … function assert` | **0** | **0** |
| chiamate al gate / export | **3 / 3** | **1 / 1** |

**Perche' due moduli e non uno.** D-45-06 fa della chiave che *legge* una sezione
la chiave che la *scrive*. Un modulo condiviso avrebbe pubblicato gli endpoint del
manifesto a chi tiene la chiave del visual — e nessun build, nessuna policy e
nessun log lo avrebbero detto. Quello che i due condividono legittimamente sta in
`write-contract.ts`, che e' un **modulo piano**: l'unione dei rifiuti, tre shape e
i controlli che girano prima della query. Nessun predicato resta in un file
`"use server"`, per la ragione che `may-upload.ts:27-34` registra — lasciarcelo
pubblica un oracolo.

**E la separazione delle chiavi non basta da sola, perche' le due sezioni
condividono le TABELLE.** `production_section` tiene entrambe le sezioni;
`production_open_question` ne tiene quattro, con cinque archi `SELECT`. Il gate
risponde *questa persona tiene la chiave*, non *questa riga e' tua*. Quindi:

- ogni riga scritta porta `section` dalla **costante del modulo**, mai da un
  argomento;
- ogni correzione **legge prima** la riga e rifiuta quella dell'altra sezione
  (`section_not_ours`);
- il registro rifiuta di aprire o chiudere una voce filata sotto una sezione che
  quella chiave non legge.

L'ultimo punto e' quello che non era nel piano ed e' stato aggiunto (D-45-15-A):
senza, chi tiene la chiave del manifesto avrebbe potuto piantare un avviso sulla
pagina della location — **una scrittura invisibile a chi la fa**, cioe' un
fallimento silenzioso con sopra un messaggio di successo.

## Il controllo che non sceglie, e perche' e' il punto del piano

`production_section.state` **non ha default nella colonna**, e l'assenza e' una
decisione che questo piano non poteva disfare. `sound-manifesto.md` nomina **due
errori opposti**, e un modello a due stati puo' difendere da uno solo per volta:

- un default di **`written` riempie il vuoto** — una riga creata e lasciata la'
  affermerebbe che una regola esiste dove nessuno l'ha scritta, e una volta
  arrivata in un brief o su una locandina **e'** il brand per chi la legge;
- un default di **`not_decided` risponde al posto di una coordinata dichiarata** —
  un'omissione travestita da prudenza. Un format senza manifesto puo' avere
  coordinate gia' dichiarate, esclusioni comprese, e quelle vincolano.

Quindi, in tre punti e non in uno:

| Dove | Cosa |
|---|---|
| la colonna | nessun default — 45-01 |
| l'argomento | campo obbligatorio della draft, letto dall'argomento e da nessun altro valore |
| il controllo | nessuna opzione scelta in anticipo, e **riparte da nulla a ogni salvataggio** |

**Niente deduce lo stato.** Un corpo vuoto non rende una regola `not_decided`; un
corpo pieno non la rende `written`. Misurato:
`grep -cE "body.*\?.*'written'|state = .*body"` restituisce **0** in tutti e tre
i moduli, e il divieto e' scritto dentro `validateSectionDraft`, che e' l'unico
posto dove qualcuno sarebbe tentato di aggiungerlo.

**Il controllo riparte da nulla anche in modifica** (D-45-15-B), e non solo in
creazione. E' la forma del controllo di provenienza di `SpaceForm.tsx`, per la
stessa ragione: uno stato riportato avanti lascerebbe `written` su una regola che
l'edit ha svuotato — una decisione presa dalla superficie al posto di qualcuno.
Cosa la riga **e'** oggi si vede accanto al controllo, come parola, disegnato
dall'unico badge che le due sezioni usano. **Mostrarlo non e' sceglierlo.**

## I tre stati chiedono tre cose diverse, e una non chiede niente

| Stato | Cosa pretende | Rifiutato da |
|---|---|---|
| `written` | il corpo | l'azione (`written_without_body`) **e** `production_section_written_has_a_body` |
| `not_decided` | *what is missing* **e** *whose call it is* | l'azione (`not_decided_without_gap`, `decision_owner_missing`) **e** `production_section_not_decided_names_its_gap` |
| `coordinates_declared` | **niente** | — e l'omissione e' deliberata |

Il codice e' la frase, il vincolo e' il confine, e nessuno dei due sostituisce
l'altro.

**Il terzo e' quello che conta, e il form lo dice in una riga.** Pretendere una
riga *what is missing* nello stato di mezzo spingerebbe chi scrive a **inventare
la lacuna**: scrivere cosa manca a una regola che nessuno ha scritto, che e' il
primo dei due errori. Una coordinata dichiarata e' un'affermazione vera che si
ferma prima; la pressione giusta su di essa e' una persona che decide, non un
`CHECK`.

**E i fatti negativi vanno nel corpo**, con il resto. Non esiste una colonna per
le esclusioni e non deve esistere: una colonna per i negativi invita una
superficie che disegna i permessi e lascia fuori i divieti — esattamente il
fallimento per cui le esclusioni sono state scritte, ricostruito un layout alla
volta.

## «Non ancora scritto» resta raggiungibile, salvabile e distinguibile

E' l'invariante che il prompt chiama per nome, e ha tre gambe:

1. **Raggiungibile.** Una regola si registra `not_decided` con **nessun corpo**,
   purche' nomini la lacuna e il ruolo; una `coordinates_declared` non pretende
   nemmeno quelli. Il form non forza prosa dentro un manifesto vuoto, e non
   suggerisce nessun titolo, nessuna lacuna, nessun aggettivo su un suono, un
   genere o una palette.
2. **Salvabile.** Le due colonne condizionali si **cancellano** sotto uno stato
   che non le usa (D-45-15-E), quindi passare a `written` non lascia una riga
   *what is missing* su una regola appena finita — vera quando la si digita,
   falsa appena salvata.
3. **Distinguibile** — e qui la parola giusta e' *parzialmente*. Sullo schermo,
   un vuoto dichiarato e un caricamento fallito sono **la stessa cosa per un
   grep**, e questo piano non chiude quella domanda: e' la procedura **P3**, e
   resta aperta. Quello che il piano ha fatto e' renderla per la prima volta
   *esercitabile*, perche' prima non c'era modo di mettere una riga in quello
   stato.

⚠ **Un fallimento silenzioso trovato e chiuso mentre scrivevo il form.** Una
riga `not_decided` con un corpo non vuoto e' ammessa dal vincolo, ma la superficie
di lettura disegna **il vuoto e non il corpo**: il testo sparirebbe dallo schermo
senza che niente lo dica. Il form lo dice, come `role="status"` e non come blocco:
il testo resta memorizzato e torna appena lo stato cambia.

## Zero fallimenti silenziosi, e cosa questo piano NON compra

`SectionRefusal` ha **15 membri**, ognuno con la propria ragione scritta di
perche' non e' fuso con il vicino. `REFUSAL_SENTENCE` e' un `Record` **totale**
sull'unione: **15 frasi, 15 uniche, zero duplicati.**

**Provato per mutazione, non argomentato.** La mutazione e' stata verificata
applicata prima di leggerne l'esito, come `ai-engineering.md` pretende:

| Mutazione | Verificata applicata | Esito |
|---|---|---|
| rimossa la voce `already_closed` dalla mappa | `grep -c "already_closed"` → **0** | **build exit 1**: *Property 'already_closed' is missing in type … but required in type `Record<SectionRefusal, string>`* |
| ripristinata con `git checkout -- <file>` | `grep -c` → **1** | **build exit 0** |

E' l'unica parte di questo contratto che un compilatore puo' tenere in un
repository senza test runner: una causa aggiunta a un atto senza una frase qui e'
un errore di build, non un messaggio scritto per qualcos'altro.

**La forma del log, su tutti e undici i punti:** codice e messaggio e nient'altro.
Mai l'oggetto errore, mai il terzo campo di PostgREST — quello che porta **la
riga rifiutata**, e una riga qui porta prosa d'autore, che puo' citare una
line-up che nessuno ha annunciato. Il nome di quel campo non e' scritto in
nessuno dei due file, per la ragione che `formats/actions.ts:58-63` da' del
proprio letterale vietato.

| Asserzione | manifesto | visual |
|---|---|---|
| `console.error(` | 7 | 4 |
| righe con `code=` | 7 | 4 |
| righe con `message=` | 7 | 4 |
| `console.error(… , error)` | **0** | **0** |
| `console.error(…body` | **0** | **0** |
| `.delete(` in codice vivo | **0** | **0** |
| il terzo campo, nominato | **0** | **0** |

**L'osservabilita' che questo piano NON compra, e va detta:** non esiste error
tracking. Gli undici log sono in un posto dove nessuno guarda. L'effetto
osservabile e' la frase sullo schermo, e vale solo per chi sta guardando lo
schermo nel momento in cui preme.

## Il registro avverte e non blocca (D-45-15)

`OpenQuestionForm.tsx` porta **tre** occorrenze di `disabled`: una in prosa
(riga 38, il paragrafo che spiega le altre due) e **due attributi reali**, righe
249 e 350, entrambi sui pulsanti di invio **di questo stesso form**, mentre un
salvataggio e' in volo o mentre un campo obbligatorio e' vuoto. Non ce n'e' una
terza, e niente fuori dalle due carte e' raggiungibile da li'.

La ragione e' quella che la fase precedente ha gia' pagato: **un blocco che scatta
sotto scadenza e' un blocco che qualcuno aggira** — il listing esce il martedi'
per il giovedi' — e un blocco aggirato e' peggio di un avviso, perche' insegna
anche ad aggirare il prossimo.

**Chiudere pretende la risposta**, rifiutata due volte: dall'atto
(`resolution_missing`) e dal vincolo XOR. **Chiudere non e' cancellare**, e non
esiste nessun percorso di cancellazione in nessuno dei due moduli: una domanda che
e' stata fatta resta fatta.

## Un solo form, due chiamanti

`/usr/bin/grep -rln "SectionForm" src` → **tre file**: la definizione e i due
importatori. L'atto arriva come **prop**, e il form non importa nessuno dei due
moduli — non potrebbe sceglierne uno nemmeno volendo. Un secondo form sarebbe un
secondo posto dove un default di stato puo' rientrare, ed e' l'unica cosa che
questo piano non puo' permettersi.

`grep -cE "defaultValue|selected"` su `SectionForm.tsx` → **0**, e l'opzione
segnaposto del controllo di stato porta `value=""` — che non e' un quarto stato ma
l'assenza di una risposta, rifiutata per nome se un body forgiato la manda.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — funzionalita' mancante per la correttezza] `section_not_ours`, e il registro che rifiuta cio' che non rilegge**

- **Trovata durante:** Task 1.
- **Issue:** il piano elenca dieci rifiuti e nessuno copre *la riga esiste ed e'
  dell'altra sezione*. Ma le due sezioni condividono **due tabelle**: senza il
  controllo, un identificatore basta a una chiave per correggere le regole
  dell'altra, e `openQuestion` avrebbe accettato qualunque stringa nella colonna
  `section` — che non ha vocabolario per una ragione giusta (il registro copre
  quattro sezioni) e sbagliata per un percorso di scrittura (cinque archi
  `SELECT` separati).
- **Fix:** ogni correzione legge prima la riga; il registro accetta solo la
  propria sezione o il ramo brand-wide. **Una chiave scrive solo cio' che puo'
  rileggere.**
- **Files:** `manifesto/actions.ts`, `visual/actions.ts`, `write-contract.ts`
- **Commit:** `ef69d82`

---

**2. [Rule 2 — funzionalita' mancante per la correttezza] Cinque rifiuti oltre i dieci elencati**

- **Trovata durante:** Task 1.
- **Issue:** il piano dice *«one member per distinguishable cause»* e poi ne
  elenca dieci. Cinque cause raggiungibili non ne avevano uno: un id di **format**
  malformato (diverso dall'id della riga — mandano a due campi diversi, e uno dei
  due e' legittimamente assente), una riga che non c'e', una domanda che non c'e',
  una lettura fallita prima della scrittura (dove **niente e' stato scritto**,
  che decide se ripremere e' sicuro), e la sezione sbagliata.
- **Fix:** `invalid_format_id`, `section_not_found`, `question_not_found`,
  `read_failed`, `section_not_ours`. Quindici membri, quindici frasi.
- **Files:** `write-contract.ts`, `refusals.tsx`
- **Commit:** `ef69d82`, `18b3c81`

---

**3. [Rule 1 — affermazione falsa] Quattro paragrafi che dicevano *questa pagina non scrive***

- **Trovata durante:** Task 2.
- **Issue:** i due docblock e i due stati vuoti di 45-12 dicevano *«this page
  reads; it does not write»* e *«recording the manifesto … is a later step»*. Dopo
  questo piano sono falsi, e un testo che dice a qualcuno che un controllo non
  esiste, sulla pagina dove esiste, e' lo stesso difetto di un docblock che mente.
- **Fix:** **rovesciati dichiarandolo**, non riscritti in silenzio — la regola che
  `(work)/location/[id]/page.tsx` applica gia' al proprio docblock. Ognuno dice
  cosa e' cambiato e cosa **non** e' cambiato: nessuno stato scelto per l'autore,
  nessun testo fornito, nessuna riga inventata per riempire l'attesa.
- **Files:** `(work)/manifesto/page.tsx`, `(work)/visual/page.tsx`
- **Commit:** `18b3c81`

---

**4. [Rule 3 — bloccante] Una lettura in piu' per sezione, non elencata**

- **Trovata durante:** Task 2.
- **Issue:** il form deve offrire *quale format* — la cui risposta corretta e'
  spesso **nessuno** — e nessuna delle due pagine leggeva il catalogo. I due
  commenti dicevano *«TWO READS»* e *«THREE READS, e non ce n'e' una quarta»*.
- **Fix:** una lettura di `formats`, **senza `color`** (ogni format porta un
  colore identificativo, e uno disegnato sulla pagina il cui soggetto e' la
  palette sarebbe una palette che nessuno ha deciso). I due conteggi sono
  corretti e il divieto e' **ribadito** nella stessa frase: nessun `venues`,
  nessun `event_parties`, nessun `production_space`. Rovesciare un conteggio non
  e' allentare una regola.
- **Files:** `(work)/manifesto/page.tsx`, `(work)/visual/page.tsx`
- **Commit:** `18b3c81`

---

**5. [Deviazione dichiarata] `refusals.tsx` — un file oltre `files_modified`**

- **Trovata durante:** Task 2.
- **Issue:** entrambi i form rispondono alla stessa unione. Mettere la mappa in
  `SectionForm.tsx` avrebbe fatto importare quel file al form del registro — e il
  criterio *una definizione, due importatori* avrebbe contato **tre**.
- **Fix:** un file proprio per le frasi, l'esito e il wrapper. Il criterio
  restituisce tre file, dei quali uno e' la definizione.
- **Files:** `refusals.tsx`
- **Commit:** `18b3c81`

---

**Total deviations:** 5 — 2 correttezza (Rule 2), 1 affermazione falsa (Rule 1),
1 bloccante (Rule 3), 1 dichiarata.
**Impatto sul perimetro:** due file oltre `files_modified` (`write-contract.ts`,
`refusals.tsx`), entrambi imposti da un contratto gia' committato — il divieto di
lasciare un predicato in un file `"use server"`, e il criterio d'accettazione sul
conteggio degli importatori. Nessun allargamento funzionale.

## Issues Encountered

**1. Il baseline di `npm run verify` di questo worktree NON e' quello di 45-12 e
45-13, e la ragione sono io.** Quei due piani hanno misurato
`verify:capabilities` come **REFUSED (2)**, perche' un worktree non ha
`.env.local` (DEF-45-02). Ho copiato quel file dal checkout principale — mai
committato, mai stampato, `git check-ignore` conferma `.gitignore:34` — perche'
una misura vera vale piu' di un rifiuto. Il risultato e' che il gate ha
**misurato**, e ha detto **FAILED su tre lati su cinque**:

> `production.read` e' una riga di `private.capabilities` e non sta in
> `src/lib/capabilities/keys.ts`, e `ROLE_GRANTS` non decide niente per nessuno
> dei quattro ruoli.

**Non e' di questo piano, ed e' gia' noto:** il deploy non e' live e 45-09 e'
stato spostato in fondo alla fase. Va detto perche' un lettore che confronta
questa riga con quella di 45-12 vedrebbe una regressione dove c'e' solo una
misura in piu'.

| | 45-12 / 45-13 | qui, prima | qui, dopo |
|---|---|---|---|
| exit di `npm run verify` | 2 | **1** | **1** |
| gate che FALLISCONO | 0 | **1** — `capabilities` | **1** — `capabilities` |
| gate che rifiutano | 5, poi 4 | **3** — `conversion`, `section-export`, `touch-targets` | **3**, gli stessi |

**Nessun rosso nuovo e nessun rifiuto nuovo introdotto da questo piano.**

**2. Due criteri d'accettazione del piano sono irraggiungibili alla lettera, e
non per questo piano.**

| Criterio | Restituisce | Perche' |
|---|---|---|
| `npm run verify` esce 0 | **1** | vedi sopra: `verify:capabilities` misura il modello di produzione, che porta una chiave che TypeScript non ha. Identico prima e dopo |
| `npm run verify:touch-targets` esce 0 | **2 (REFUSED)** | DEF-45-01: il manifesto `CONVERTED` nomina quattro superfici rimosse dal prodotto con Finance e Analytics. Nessun file di questo piano e' coinvolto |

**3. Il gate parla di sei directory, ne misura sette.** Il criterio del Task 2
dice *«across all six directories»*; `SCOPE` in `verify-section-surface.mjs` ne
elenca **sette** (le sei delle sezioni piu' `src/lib/production/sections`), e
tutte e sette esistono. Registrato per non far dedurre a nessuno che una manchi.

## Verification

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | eseguito dopo ogni task, e una terza volta dopo il ripristino della mutazione |
| `node scripts/verify-section-surface.mjs` | **0** | **A B C D E verdi**, sette directory su sette, 28 file letti di cui 21 possono rendere (erano 19/16 dopo 45-12) |
| `npm run verify:breakpoints` | **0** | `WORK GROUP REMAINING = 0`, nessun `sm:` introdotto |
| `npm run verify:dialogs` · `tokens` · `tables` · `semantic-separation` · `sunset-gradient` · `routes` · `no-viewport-read` | **0** | |
| `npm run lint` | problemi **pre-esistenti** | solo `public/sw.js`, il service worker generato. Nessuno dei sei file nuovi compare nell'output |
| `npm run verify` | **1** | **identico al baseline misurato prima di toccare l'albero** |

### Criteri del Task 1, misurati

| Asserzione | manifesto | visual |
|---|---|---|
| `grep -c "CAP.PRODUCTION_MANIFESTO_MANAGE"` | 1 | **0** |
| `grep -c "CAP.PRODUCTION_VISUAL_MANAGE"` | **0** | 1 |
| `grep -cE "export (async )?function assert"` | 0 | 0 |
| `grep -cE "body.*\?.*'written'\|state = .*body"` | 0 | 0 |
| `.delete(` in codice vivo | 0 | 0 |
| `grep -cE "console\.error\([^)]*, *error\)"` | 0 | 0 |
| `grep -cE "console\.error\([^)]*body"` | 0 | 0 |
| chiamate al gate / export | 3 / 3 | 1 / 1 |

**La revisione di ogni assegnamento a `state`, richiesta dal criterio.** Ci sono
**tre** punti in tutto l'albero di questo piano in cui `state` riceve un valore:

1. `write-contract.ts`, `const state: SectionState = draft.state;` — dopo
   `isMember(SECTION_STATES, …)`, quindi **dall'argomento e da nient'altro**;
2. `SectionForm.tsx`, `useState<string>("")` — l'inizializzazione a nessuna
   risposta;
3. `SectionForm.tsx`, `setState(e.target.value)` e `setState("")` dopo un
   salvataggio riuscito — cioe' **quello che l'autore ha scelto**, e il ritorno a
   nessuna scelta.

Nessuno dei tre legge il corpo, la lacuna, il titolo o il format.

### Criteri del Task 2, misurati

| Asserzione | Esito |
|---|---|
| `grep -cE "defaultValue\|selected"` su `SectionForm.tsx` | **0**; l'opzione segnaposto porta `value=""` |
| il ramo `not_decided` rende entrambi i campi e li marca obbligatori | **si'**, nello stesso pannello, con la frase sopra i controlli |
| `coordinates_declared` non pretende nessuno dei due, con la riga che spiega perche' | **si'** |
| frasi di rifiuto rese, duplicati | **15 frasi, 15 uniche** |
| `/usr/bin/grep -rln "SectionForm" src` | **3 file** — una definizione, due importatori; l'atto arriva come prop |
| `grep -cE "disabled"` su `OpenQuestionForm.tsx` | **3** — 1 in prosa, **2 attributi**, entrambi sui pulsanti d'invio di questo stesso form (righe 249, 350) |
| check C ed E del gate, sulle sette directory | **entrambi verdi**; C ora ha tre soggetti nuovi che ramificano su `not_decided` e nominano `missing` e `decision_owner` |

### Cosa un verde NON significa qui

- **Nessuna riga e' stata scritta in produzione da questo piano, e non c'era
  autorizzazione per farlo.** D12: 63 righe cancellate durante una *verifica*, e
  il progetto non ha point-in-time recovery. Le tre tabelle restano **vuote**: il
  build fa il typecheck **contro le dichiarazioni** di `src/types/database.ts`, e
  nessun client Supabase di questo repo e' parametrizzato con `Database` — i nomi
  di colonna sono asserzioni, non controlli.
- **Che i vincoli rifiutino quello che le azioni rifiutano non e' stato
  esercitato.** Le due meta' sono scritte l'una accanto all'altra e nessuna delle
  due e' stata provata contro l'altra su una riga vera.
- **Nessuna sessione e' stata aperta.** Che le due sezioni siano rifiutate a chi
  il modello dei permessi non ammette e' la procedura **P1**, ancora `pending`.
- **P3 resta aperta, ed e' la piu' vicina a questo piano.** Nessuna asserzione su
  un sorgente distingue *non ancora deciso* da *non e' riuscito a caricare* su
  uno schermo. Questo piano non la chiude: la rende **esercitabile per la prima
  volta**, perche' prima non c'era modo di mettere una riga in quello stato.
- **P4 resta aperta.** Nessun `formats.color` viaggia fino a queste superfici —
  la colonna non e' nemmeno selezionata — ma un campione da 4 px e uno da 200
  restano la stessa riga per un grep.
- **Non esiste alcun test runner per il prodotto.** Dirlo e' obbligatorio.

### Procedura manuale scritta, da eseguire dopo il deploy

Non eseguibile oggi: il deploy non e' live (decisione dell'orchestratore) e
queste sono scritture su produzione, che pretendono un'autorizzazione separata e
descritta.

1. Con un ruolo che tiene `production.manifesto.manage`, aprire
   `/admin/manifesto`. **Attesa:** sotto lo stato vuoto, la carta *RECORD A RULE*
   e le due del registro.
2. Nel form, scrivere un titolo e **non toccare il controllo dello stato**.
   **Attesa:** il pulsante inerte, e la frase in `role="alert"` sopra di esso che
   dice che nulla e' scelto per chi scrive e perche'. Premere Invio: non deve
   salvare.
3. Scegliere *Written* e lasciare il corpo vuoto. **Attesa:** pulsante inerte,
   frase leggibile **prima** della pressione. Scrivere il corpo: si attiva.
4. Scegliere *Not decided*. **Attesa:** compaiono **due** campi, entrambi marcati
   obbligatori, **dentro lo stesso pannello** e non sotto un pannello vuoto, con
   la frase che dice perche'. Riempirne uno solo: resta inerte.
5. Riempirli entrambi e salvare. Ricaricare. **Attesa:** la carta mostra il badge
   *Not decided* e, come contenuto, *what is missing* e *whose call it is*.
   **Questa e' P3**: chiedere a chi guarda se sta vedendo una decisione mancante o
   un errore di caricamento. Se esita, il criterio 3 non e' chiuso.
6. Scegliere *Coordinates declared*. **Attesa:** i due campi spariscono, nessuno
   dei due e' richiesto, e compare **una riga sola** che dice perche' — e che le
   esclusioni vanno nel corpo. Salvare con il solo corpo: deve riuscire.
7. Su una riga esistente, aprire il form di modifica. **Attesa:** il controllo
   dello stato e' **su nulla**, e lo stato registrato e' scritto accanto come
   parola. Cambiare solo il titolo: il salvataggio resta inerte finche' non si
   ridichiara lo stato.
8. Con una riga `not_decided` che porta anche un corpo. **Attesa:** il form dice,
   in `role="status"` e senza bloccare, che la pagina disegna il vuoto e non il
   corpo, e che il testo resta memorizzato.
9. Aprire una domanda **senza** proprietario. **Attesa:** pulsante inerte. Con il
   proprietario e *The whole brand*: la domanda compare **sopra** le sezioni, e
   **anche** su `/admin/visual`. Verificare che nessun controllo delle due pagine
   sia diventato inutilizzabile.
10. Chiudere quella domanda **senza** risposta. **Attesa:** pulsante inerte. Con
    la risposta: sparisce dai due registri e **non** e' cancellata.
11. Con un ruolo che tiene **solo** `production.visual.manage`, invocare
    `saveSection` del modulo del **manifesto** direttamente (fetch verso
    l'endpoint della Server Action, body forgiato). **Attesa:** un throw, non una
    riga scritta. E' l'unica prova che le due chiavi siano davvero due.
12. Con la chiave del manifesto, invocare `saveSection` del proprio modulo
    passando l'**id di una clausola del visual**. **Attesa:** `section_not_ours`,
    e la clausola immutata.
13. Con la console del browser e i log del server aperti, provocare un
    fallimento di scrittura (per esempio revocando temporaneamente il ruolo di
    servizio). **Attesa:** ogni riga porta `code=` e `message=` e **nessuna prosa
    d'autore, nessun nome d'artista**.
14. Rinominare temporaneamente la tabella dei formati o revocarne la lettura.
    **Attesa:** il form dice che il catalogo non e' leggibile e che la voce puo'
    solo essere registrata come del brand — **non** un select vuoto.
15. A 390px: le carte su una colonna, nessuno scorrimento orizzontale.

## Known Stubs

Nessuno. I sei file sono completi per il loro perimetro: ogni ramo che i loro
tipi ammettono e' disegnato, nessun valore finto raggiunge uno schermo, nessun
`TODO`, nessun dato hardcoded, **nessuna copia inventata** — nessuna regola
d'esempio, nessun manifesto segnaposto, nessuna palette prestata.

Tre assenze sono **decisioni dichiarate e non stub**:

- **Nessun percorso di cancellazione**, in nessuno dei due moduli, e non ce ne
  sara' uno. Una domanda che e' stata fatta resta fatta; una regola che e' stata
  scritta si corregge, non si toglie.
- **Nessun percorso di scrittura del registro dalla sezione visual.** E' il
  perimetro del piano, registrato come **DEF-45-08**, e la pagina visual lo
  **dice** invece di lasciar credere che il controllo manchi.
- **Nessun campo venue, su nessuna delle due superfici.** Il capitolato lascia il
  perimetro: cio' che una clausola puo' nominare e' cio' che uscira'.

## Threat Flags

Nessuna superficie di sicurezza nuova oltre quella che il piano dichiara:
**quattro endpoint di Server Action nuovi**, tre dietro la chiave del manifesto e
uno dietro quella del visual. Nessuno schema cambiato, **nessun pacchetto
installato**, nessuna nuova esenzione a nessun gate.

Le mitigazioni del registro del piano, in codice:

- **T-45-13** (lo stato) — nessun default nella colonna, nessuno nell'argomento,
  nessuna preselezione nel controllo, **nessuna deduzione da nessuna parte**; i
  due requisiti condizionali sono rifiutati dall'azione **e** da un vincolo
  nominato.
- **T-45-04** (privilegi) — un modulo per chiave, ogni gate non esportato e
  chiesto per primo, il client di servizio costruito dopo; il predicato condiviso
  vive in un modulo piano. **E il controllo che il piano non chiedeva:** una
  chiave scrive solo righe della propria sezione, e apre o chiude solo voci del
  registro che puo' rileggere.
- **T-45-02** (divulgazione) — undici `console.error`, tutti con `code=` e
  `message=`; mai l'oggetto errore, mai il terzo campo, mai il corpo. Il check E
  del gate e' verde su tutti.
- **T-45-17** (ripudio) — chiudere pretende la risposta, rifiutata dall'atto e
  dal vincolo XOR; **nessun export di cancellazione**.
- **T-45-SC** — **nessun pacchetto installato**, nessuna libreria di validazione:
  il pattern di casa e' un `CHECK` SQL nominato specchiato in una tupla `as
  const`, ed e' quello che i moduli usano.

## User Setup Required

Nessuna. Due avvertimenti operativi:

1. **Le tre tabelle non hanno alcun arco di scrittura nelle policy**, quindi ogni
   atto di questi moduli passa dal client di servizio. Se
   `SUPABASE_SERVICE_ROLE_KEY` non e' presente nell'ambiente, ogni salvataggio
   fallisce — e fallisce come `write_failed`, che e' una frase corretta e non dice
   quale sia la causa vera.
2. **La prima riga che passera' da queste query non e' mai esistita.** Nessuna
   riga e' mai stata scritta in `production_section` ne' in
   `production_open_question`, e nemmeno letta: i cast delle pagine sono
   asserzioni. Il primo salvataggio vero e' anche la prima prova che i nomi di
   colonna scritti a mano combacino con quelli applicati.

## Next Phase Readiness

- **45-16 (l'export)** trova le due sezioni scrivibili e il contratto dei rifiuti
  gia' nominato in un modulo piano, riusabile senza pubblicare niente.
- **45-17 (l'upload)** non e' toccato: `production_visual_asset` non ha percorso
  di scrittura da questo piano.
- **45-18 (le tab)** non e' toccato.
- **45-VERIFICATION** eredita **P3 esercitabile per la prima volta** (passi 5 e 8
  della procedura sopra) e due prove d'accesso che nessun grep sostituisce: i
  passi 11 e 12, che sono l'unica dimostrazione che le due chiavi siano davvero
  due.
- **DEF-45-08 e' aperta e appartiene a chi decide** se ogni sezione tiene il
  proprio arco di scrittura sul registro.

## Self-Check: PASSED

**File dichiarati creati — esistenza verificata:**

- `src/lib/production/sections/write-contract.ts` — FOUND
- `src/app/(admin)/admin/manifesto/actions.ts` — FOUND
- `src/app/(admin)/admin/visual/actions.ts` — FOUND
- `src/app/(admin)/admin/manifesto/refusals.tsx` — FOUND
- `src/app/(admin)/admin/manifesto/SectionForm.tsx` — FOUND
- `src/app/(admin)/admin/manifesto/OpenQuestionForm.tsx` — FOUND
- `src/app/(admin)/admin/(work)/manifesto/page.tsx` — FOUND (modificato)
- `src/app/(admin)/admin/(work)/visual/page.tsx` — FOUND (modificato)
- `.planning/phases/45-production-sections-section-by-section/deferred-items.md` — FOUND (modificato)

**Commit dichiarati — esistenza verificata:** `ef69d82`, `18b3c81`, `25dce97`.

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
