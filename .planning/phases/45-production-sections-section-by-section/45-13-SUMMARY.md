---
phase: 45-production-sections-section-by-section
plan: 13
subsystem: api
tags: [server-actions, rls, service-client, venue-acquisition, refusals, dialogs]

# Dependency graph
requires:
  - phase: 45-08
    provides: "le due tabelle applicate in produzione, con un solo arco SELECT e nessun arco di scrittura"
  - phase: 45-11
    provides: "la superficie di lettura che questo piano estende, e le sue convenzioni"
  - phase: 45-07
    provides: "ScoreCell, AttributeCell, StageBadge e la tensione di schema dichiarata e lasciata aperta"
provides:
  - "src/app/(admin)/admin/location/actions.ts — sette percorsi di scrittura, un gate non esportato, 22 rifiuti restituiti"
  - "src/app/(admin)/admin/location/SpaceForm.tsx — record, quattro domande, dieci attributi, la colonna della telefonata, l'uscita, e il form di creazione"
  - "src/app/(admin)/admin/location/StageChangeDialog.tsx — il cambio di stadio, con l'evidenza pretesa nel pannello che chiede lo stadio"
affects: [45-18, 45-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un controllo di provenienza che riparte da nulla a ogni salvataggio: portare avanti quella memorizzata trasformerebbe una modifica in una bugia"
    - "una colonna condivisa da quattro risposte pretende UN controllo, non quattro: quattro promesse su una colonna sono tre promesse false"
    - "un rifiuto contato, mai una redazione silenziosa — la stessa regola che il seed ha applicato ai 35 contatti"
    - "una mappa Record totale sull'unione dei rifiuti: una causa nuova senza frase e' un errore di build, non un messaggio scritto per altro"

key-files:
  created:
    - "src/app/(admin)/admin/location/actions.ts"
    - "src/app/(admin)/admin/location/SpaceForm.tsx"
    - "src/app/(admin)/admin/location/StageChangeDialog.tsx"
  modified:
    - "src/app/(admin)/admin/(work)/location/[id]/page.tsx"
    - "src/app/(admin)/admin/(work)/location/page.tsx"

key-decisions:
  - "D-45-13-A: UNA sola fonte per le quattro risposte, non una per risposta. Il piano chiedeva un select `answers_source` accanto a ciascuna risposta; la colonna e' una sola per tutte e quattro, quindi quattro controlli sarebbero quattro promesse indipendenti su un dato condiviso"
  - "D-45-13-B: il controllo di provenienza non e' precompilato nemmeno dove l'attributo ne porta gia' una. Un valore modificato che tiene `derived` e' una bugia; uno marcato verificato che nessuno ha verificato e' peggio"
  - "D-45-13-C: `changeStage` esiste, e il piano non lo elencava fra gli export. Il Task 2 pretende un dialog che cambi lo stadio: senza l'atto, il dialog non ha nulla da chiamare"
  - "D-45-13-D: `note_carries_contact` e' un rifiuto e non una redazione, e il suo limite e' dichiarato — riconosce le due forme misurate nell'archivio, non promette che un campo passato sia pulito (DEF-45-05)"
  - "D-45-13-E: uno spazio uscito dalla corsa non si modifica piu'. Non e' cancellato e resta in lista; ma un registro di una decisione che si continua a modificare smette di esserlo"
  - "D-45-13-F: il form di creazione e' montato sulla lista — un file oltre `files_modified`. Un atto senza superficie e' un endpoint che nessuno raggiunge dal prodotto e chiunque con un body forgiato"
  - "D-45-13-G: lo stadio si puo' abbassare. Non e' uno dei tre interruttori a senso unico del progetto, e una trattativa che salta e' un fatto che la lista deve poter dire"

requirements-completed: [PROD-02]

# Metrics
duration: 48min
completed: 2026-08-17
---

# Phase 45 Plan 13: La sezione Location diventa scrivibile — Summary

**Sette percorsi di scrittura dietro un gate chiesto per primo e una volta sola, ventidue rifiuti restituiti uno per causa, e nessuna cancellazione: la prima cosa in questo prodotto che puo' muovere uno dei 184 spazi — e la prima che poteva farlo mentire.**

## Performance

- **Duration:** ~48 min
- **Tasks:** 2
- **Files modified:** 5 (3 creati, 2 modificati)

## La decisione che il piano mi ha chiesto di sollevare, e cosa il form puo' e non puo' dire

`exit_reason` sta **sullo spazio**, e `venue-acquisition.md` legge l'idoneita' **per format** — *gate lo spazio giusto per il format sbagliato*: uno spazio tecnicamente perfetto per un format puo' essere fuori identita' per un altro, quindi il punteggio si legge per format e mai come giudizio assoluto sul locale.

**Non ho toccato lo schema.** Il piano 45-07 ha fatto bene a lasciare la tensione aperta: chiuderla e' una decisione, non un dettaglio di implementazione. Quello che ho fatto e' rendere onesto il percorso di scrittura.

**Cosa fa il form:**

- `exitSpace` **non accetta un argomento di format**, perche' non c'e' dove metterlo. Non ho inventato una convenzione in testo libero (`"out_of_identity: SunSet"`): sarebbe un verdetto per-format nascosto dentro una colonna che vale per tutti, cioe' peggio del limite onesto — un lettore successivo lo troverebbe e lo crederebbe strutturato.
- Il pannello dell'uscita **lo dice sopra i controlli**, prima che si prema:

  > *The reason is recorded against this space and therefore against every format at once. Suitability is read per format — a space that is out of identity for one can be right for another — and this column cannot say which. If the judgement you are about to record is about one format only, it will not be stored as one.*

**Cosa il form non puo' esprimere:** un'uscita che vale per un format e non per gli altri. Chi scrive *out of identity* pensando alla notte sta scrivendo *out of identity* anche per il satellite dell'aperitivo, e la carta dei punteggi del dettaglio (45-11) continuera' a disegnare tutti e quattro i risultati come uscita registrata.

**Ho corretto la copy del piano?** Il piano 45-13 non conteneva copy che assumesse la lettura per-format sull'uscita — la sua `<action>` non descriveva il pannello dell'uscita. Non c'era nulla da correggere li'. **Ho invece corretto la copy del piano su un secondo punto** — vedi la deviazione 1.

**Cosa serve al proprietario per decidere, con la superficie davanti:** la colonna ha quattro valori (`out_of_identity`, `refused`, `unreachable`, `other`) e tre di essi sono gia' per-spazio per natura — un locale che rifiuta rifiuta tutti i format, uno irraggiungibile e' irraggiungibile per tutti. **Solo il primo e' per-format**, ed e' anche quello che il dominio nomina esplicitamente. Le strade sono due, e nessuna e' questa fase: una riga per (spazio, format) con la sua ragione, oppure la dichiarazione che l'uscita e' e resta un fatto sullo spazio e che un verdetto per-format non si registra.

## La seconda tensione, piu' piccola e dello stesso genere

**`answers_source` e' UNA colonna per QUATTRO risposte.**

Il piano chiedeva *«the four answers with their `answers_source` select beside each»*. Quattro select su una colonna sola: registrare l'impianto per telefono e l'orario di chiusura da una scheda pubblica non e' rappresentabile, e il secondo salvataggio riscriverebbe in silenzio la provenienza del primo.

Il form disegna **un solo controllo per il gruppo**, con l'etichetta *How these four answers were obtained* e la frase che dice cosa fa un salvataggio agli altri tre. E il dominio e' d'accordo con lo schema, motivo per cui la riparazione e' un controllo e non una migration: `venue-acquisition.md` dice che le quattro domande **si chiudono con una telefonata**, e una telefonata ha una provenienza sola.

## Le invarianti di dominio, e dove stanno in codice

**«Lo stato prima del nome.»** `createSpace` **non accetta uno stadio** — una riga nuova atterra al valore piu' basso per default della colonna, che e' l'unico tipo di default sicuro qui: non puo' fabbricare progresso. Lo stadio si muove solo da `StageChangeDialog`, che chiede **cosa e' successo** e non solo una parola piu' alta: il pannello scrive cosa significa ciascuna delle quattro parole (`STAGE_MEANING`) **e cosa lo schema conserva dietro di essa** (`STAGE_EVIDENCE`) — e per `verified` e `contacted` la risposta onesta e' *niente: la pretesa poggia sulla persona che preme*. Per `acquired` c'e' la colonna, e il controllo di conferma e' inerte finche' e' vuota.

**«Acquisito significa per iscritto.»** Rifiutato tre volte: dal controllo disabilitato (`evidenceMissing`, che fa `trim()` perche' il vincolo fa `btrim`), dall'azione (`agreement_evidence_missing`), e dal vincolo `production_space_acquired_needs_evidence`. Il codice e' la frase, il vincolo e' il confine.

**«Derivato non e' verificato.»** `setAttribute` pretende `provenance` come argomento, e il controllo **riparta da nulla a ogni salvataggio, anche dove l'attributo ne porta gia' una**. Il salvataggio e' inerte finche' non si sceglie. `answered_at` si scrive **solo** su `field_verified`: una data accanto a un valore derivato direbbe che qualcuno ha ottenuto una risposta il giorno in cui qualcuno ha letto una pagina.

**«Le quattro domande.»** Le quattro sono nel form con la loro fonte obbligatoria, e la quarta — *fino a che ora* — porta il suo suggerimento sul formato 24h e la ragione (una notte va da 22:00 a 06:00, quindi l'ora e' legittimamente piu' piccola di quella d'inizio).

**La colonna che solo una telefonata muove.** `recordExtendedHoursStance` accetta due parole e **non riscrive mai il marcatore di non-chiesto**; nel modulo non esiste alcun percorso di inferenza verso quella colonna, e il select non offre la terza opzione. La ragione e' scritta in entrambe le direzioni: un `will_discuss` inventato manda una data su una conversazione mai avvenuta, e un rifiuto registrato cancellato fa rifare la telefonata.

**«Fuori identita' resta visibile.»** **Nessun export di cancellazione**, e il file lo dichiara. `grep -vE '^\s*(\*|//)' actions.ts | grep -cE '\.delete\('` restituisce **0**. `exitSpace` scrive ragione e data insieme; il vincolo XOR rifiuta la meta'.

**«Una classifica non e' una disponibilita'.»** Nessun controllo di questo piano scrive o disegna un punteggio.

## D-45-18 — la forma del log, e il primo soggetto reale del check E

Nove `console.error` nel modulo delle azioni, **tutti e nove** con il codice e il messaggio e nient'altro. Mai l'oggetto errore, mai il terzo campo di PostgREST (che porta la riga rifiutata, e questa riga porta un nome e un indirizzo), mai il nome, mai l'indirizzo — solo un identificatore.

Il piano diceva che questo e' *«the first that gives it something to measure»*. Misurato, creando temporaneamente le quattro directory mancanti dello scope e rilanciando il gate (poi rimosse, non committate):

```
✓ A   the stage stands beside the name, in one renderer
✗ B   the provenance stands beside the value, in one renderer each
✗ C   the void is declared, never blank
✓ D   a format colour is never drawn as a palette
✓ E   a diagnostic carries a code and a message, and nothing a space could be named by
SECTION_SURFACE_FAIL — 2 check(s) failed: B, C (3 occurrence(s))
```

**Il check E e' verde**, e per la prima volta su qualcosa che logga davvero. **B e C sono rossi per DEF-45-07** — il gate pretende `SpaceScore.tsx`, `SpaceAttribute.tsx` e `SectionVoid.tsx`, e sul disco ci sono `ScoreCell.tsx` e `AttributeCell.tsx` (piano 45-07) mentre il terzo e' del piano 45-12. **Nessuna delle tre appartiene a questo piano** e nessun file di questo piano puo' ripararle senza riscrivere la consegna di un altro.

Il check A resta verde: `SpaceForm.tsx` e `StageChangeDialog.tsx` non nominano nessuno dei tre token del nome, e il dialog non disegna il nome dello spazio da nessuna parte.

## Zero fallimenti silenziosi

`LocationRefusal` ha **22 membri**, ognuno con la propria ragione scritta di perche' non e' fuso con il vicino. `REFUSAL_SENTENCE` in `SpaceForm.tsx` e' un `Record` **totale** sull'unione: una causa aggiunta all'azione senza una frase qui e' un errore di `npm run build`, non un messaggio scritto per qualcos'altro.

**Nessun messaggio condiviso.** Misurato: 35 stringhe di rifiuto fra i due file, **0 duplicati**.

Ogni esito e' reso **nel pannello della propria sezione** con `role="alert"` o `role="status"`; il dialog riporta il proprio esito nel proprio pannello, come il check C di `verify:dialogs` pretende.

**L'osservabilita' che questo piano NON compra, e va detta:** non esiste error tracking. I nove log sono in un posto dove nessuno guarda. L'effetto osservabile e' la frase sullo schermo, e vale solo per chi sta guardando lo schermo nel momento in cui preme.

## DEF-45-05 — la nota, il contatto, e perche' e' un rifiuto

Il form espone `note` e `short_description`, che sono i campi in cui 35 record dell'archivio portano un contatto (15 mail, 20 cellulari, quattro persone nominate).

**Non ho creato un percorso di re-import**: il form non accetta nessun documento, nessun upload, e la lista dice ancora che l'archivio e' un file locale e l'import uno script locale.

**Non ho offerto mascheratura.** `carriesContact` **non modifica mai il valore**: rifiuta la scrittura intera con `note_carries_contact`, che e' esattamente la forma che il seed ha usato — un rifiuto contato invece di una redazione che fallisce in silenzio.

**Il limite e' dichiarato nel codice, non implicito:** riconosce un indirizzo di posta e un cellulare italiano, che sono le due forme misurate. E' una guardia, non una garanzia, e niente qui autorizza a credere che un campo passato sia pulito.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Il piano chiedeva quattro controlli di provenienza su una colonna sola**

- **Found during:** Task 2
- **Issue:** l'`<action>` prescrive *«the four answers with their `answers_source` select beside each»*. `production_space.answers_source` e' **una** colonna per tutte e quattro le risposte (`20260817120100_production_location.sql:307-313`). Quattro select l'avrebbero disegnata come quattro fatti indipendenti, e il secondo salvataggio avrebbe riscritto in silenzio la provenienza del primo.
- **Fix:** un controllo per il gruppo, etichettato *How these four answers were obtained*, con la conseguenza scritta accanto. La ragione di dominio e' scritta nel docblock del file: le quattro domande si chiudono con **una** telefonata.
- **Files:** `SpaceForm.tsx`
- **Committed in:** `7911824`

---

**2. [Rule 3 - Blocking] Il piano non elenca l'export che il suo Task 2 pretende**

- **Found during:** Task 1
- **Issue:** gli export elencati sono sei e nessuno cambia lo stadio; il Task 2 pretende `StageChangeDialog.tsx`, e i `key_links` del frontmatter agganciano *«the stage change»* al vincolo `production_space_acquired_needs_evidence`. Senza un atto, il dialog non ha nulla da chiamare.
- **Fix:** `changeStage(spaceId, stage, agreementEvidence)`, con il rifiuto per `acquired` senza evidenza, il rifiuto per uno spazio gia' promosso, e la discesa permessa.
- **Files:** `actions.ts`
- **Committed in:** `f011ad3`

---

**3. [Rule 2 - Correttezza] La lista monta il form di creazione — un file oltre `files_modified`**

- **Found during:** Task 2
- **Issue:** il piano pretende `createSpace` fra gli export e non nomina nessuna superficie che lo chiami. Un export di un modulo `"use server"` **e' un endpoint pubblico**: lasciarlo senza superficie significa avere un percorso di scrittura raggiungibile solo con un body forgiato, che e' peggio del non averlo.
- **Fix:** `NewSpaceForm` montato su `(work)/location/page.tsx`, senza controllo di stadio, con il commento che spiega perche' non contraddice lo stato vuoto (digitare uno spazio a mano non e' importare l'archivio, e `source_key` resta nullo per questo).
- **Files:** `SpaceForm.tsx`, `(work)/location/page.tsx`
- **Committed in:** `7911824`

---

**4. [Rule 1 - Bug] Il docblock del dettaglio affermava che dalla pagina non si puo' scrivere**

- **Found during:** Task 2
- **Issue:** `[id]/page.tsx` diceva *«This page READS. There is no way to write anything from it. No field, no control, no server action, no submit.»* Dopo questo piano e' falso, e un docblock che mente e' peggio di un docblock assente.
- **Fix:** il paragrafo e' **rovesciato dichiarandolo**, non riscritto in silenzio: dice cosa e' cambiato, e che la decisione che l'assenza proteggeva — la colonna della telefonata irraggiungibile per inferenza — **non** e' cambiata.
- **Files:** `(work)/location/[id]/page.tsx`
- **Committed in:** `7911824`

---

**5. [Rule 2 - Correttezza] Uno spazio uscito dalla corsa non si modifica piu'**

- **Found during:** Task 1
- **Issue:** il piano elenca `space_exited` fra i rifiuti minimi senza dire quando scatta. Serviva una regola, non un codice orfano.
- **Fix:** ogni atto tranne l'uscita rifiuta su uno spazio uscito, e il form rende una frase al posto dei controlli invece di disegnarli disabilitati — un controllo disabilitato e' indistinguibile da una superficie che sta ancora caricando.
- **Files:** `actions.ts`, `SpaceForm.tsx`
- **Committed in:** `f011ad3`, `7911824`

---

**Total deviations:** 5 auto-fixed (2 bug, 2 correttezza, 1 blocking)
**Impact on plan:** un file in piu' rispetto a `files_modified` (`(work)/location/page.tsx`), e un export in piu' rispetto alla lista (`changeStage`). Nessun allargamento di perimetro oltre questi due.

## Issues Encountered

**1. Due criteri d'accettazione hanno un'aritmetica che non torna alla lettera.**

| Criterio | Restituisce | Perche' |
|---|---|---|
| `grep -cE "defaultValue\|selected" SpaceForm.tsx` → 0 | **2** | entrambe le righe sono la parola **`preselected`** in prosa (righe 64 e 754), e nessuna delle due sta sul controllo di provenienza. Il criterio dice *«returns 0 on the provenance control's lines»*, e su quelle righe (795–806) restituisce **0**: il controllo e' `value=`/`onChange` con un'opzione vuota in testa |
| `npm run verify:touch-targets` esce 0 | **2 (REFUSED)** | e' uno dei cinque rifiuti pre-esistenti misurati **prima** di toccare l'albero: il manifesto `CONVERTED` nomina quattro superfici rimosse dal prodotto (DEF-45-01). Nessun file di questo piano e' coinvolto |

**2. `npm run verify` esce 2, identico al baseline.**

Misurato prima di toccare l'albero e di nuovo dopo: gli **stessi cinque** gate rifiutano — `capabilities`, `conversion`, `section-surface`, `section-export`, `touch-targets` — e in entrambi i casi *«No gate that reached a verdict reported a failure»*. Nessun rifiuto nuovo e nessun rosso nuovo.

## Verification

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | eseguito dopo ogni task |
| `npm run verify:dialogs` | **0** | `DIALOGS_OK`, `REMAINING = 0` — il nuovo dialog usa il primitivo, non dichiara una shell propria e non importa la via transitoria |
| `npm run verify:breakpoints` | **0** | `md:` e non `sm:` sulla griglia degli attributi |
| `npm run lint` | problemi **pre-esistenti** | nessuno dei cinque file compare nell'output (`npm run lint \| grep -i location` → vuoto) |
| `node scripts/verify-section-surface.mjs` | **2 (REFUSED)** oggi; **A ✓ B ✗ C ✗ D ✓ E ✓** con lo scope completato a mano | il check E e' verde sul suo primo soggetto reale; B e C sono DEF-45-07 |
| `npm run verify` | **2** | **identico al baseline**, stessi cinque rifiuti, zero fallimenti |

### Criteri del Task 1, misurati

| Asserzione | Esito |
|---|---|
| `grep -c "export async function assert"` | **0** — il gate non e' esportato |
| occorrenze di `assertLocationSection(` | **9** = 1 dichiarazione + 7 export + 1 riga di prosa; **una per export** |
| `grep -vE '^\s*(\*\|//)' \| grep -cE '\.delete\('` | **0** |
| righe con `code=` vs righe con `console.error` | **9 = 9** |
| `grep -cE "console\.error\([^)]*, *error\)"` | **0** |
| `grep -cE "console\.error\([^)]*(name\|address)"` | **0** |
| `grep -ci "details"` | **0** — il terzo campo di PostgREST non e' nominato |
| `grep -c "throw new Error"` | **2** — solo le due categorie del gate |
| `stage` fra gli argomenti di `createSpace` | **assente** — `NewSpaceInput` ha sei campi e nessuno e' lo stadio |
| `not_asked` accettato da `recordExtendedHoursStance` | **no** — la firma e' `Exclude<ExtendedHoursStance, "not_asked">` e il corpo controlla la coppia letterale |

### Cosa un verde NON significa qui

- **Nessuna riga e' stata scritta in produzione da questo piano**, e non c'era autorizzazione per farlo (D12: 63 righe cancellate durante una *verifica*, e il progetto non ha point-in-time recovery). Il build fa il typecheck **contro le dichiarazioni** di `src/types/database.ts`; nessun client Supabase di questo repo e' parametrizzato con `Database`, quindi i nomi di colonna sono asserzioni.
- **Che il vincolo rifiuti quello che l'azione rifiuta non e' stato esercitato.** Le sonde sui vincoli sono il posto onesto per quello, e **non sono state eseguite qui**.
- **Nessuna sessione e' stata aperta.** Che la sezione sia rifiutata a chi il modello dei permessi non ammette e' `verify:refusal` e la procedura P1.
- **Non esiste alcun test runner per il prodotto.** Dirlo e' obbligatorio.

### Procedura manuale scritta, da eseguire dopo il deploy

Non eseguibile oggi: il deploy non e' live (decisione dell'orchestratore) e queste sono scritture su produzione, che pretendono un'autorizzazione separata.

1. Con un ruolo che tiene `production.location.manage`, aprire uno spazio in stadio `mapped`.
   - **Attesa:** il pulsante *Change the stage* accanto al titolo; sotto le carte di lettura, le cinque sezioni di autoraggio.
2. Con un ruolo che **non** tiene la chiave, invocare `createSpace` direttamente (fetch verso l'endpoint della Server Action, body forgiato).
   - **Attesa:** un throw, non una riga scritta. E' l'unica prova che il gate stia davanti al service client.
3. Nella sezione *The four questions*, lasciare la fonte su *Nobody has asked*.
   - **Attesa:** i quattro pulsanti di salvataggio inerti, e la frase in `role="alert"` sopra di essi. Poi scegliere *Asked by phone* e salvare l'impianto: la fonte cambia **per tutte e quattro** nelle carte di lettura sopra.
4. Su un attributo che gia' porta un valore, cambiare il valore senza toccare la provenienza.
   - **Attesa:** il pulsante inerte. La provenienza riparte sempre da *Say which this is*.
5. Aprire *Change the stage*, scegliere `acquired`, lasciare vuota la riga dell'accordo.
   - **Attesa:** *Move the stage* disabilitato, la frase leggibile **prima** della pressione, e il focus su *Cancel*. Premere Invio: **non** deve confermare. Poi scrivere solo spazi: deve restare disabilitato.
6. Con la riga scritta, confermare.
   - **Attesa:** l'esito **dentro il pannello del dialog**, non altrove; ricaricando, la carta *Acquired means in writing* mostra la riga verbatim.
7. Scrivere un indirizzo di posta dentro la nota e salvare il record.
   - **Attesa:** `note_carries_contact`, **niente salvato e niente mascherato**. Il campo resta come lo si e' scritto.
8. Registrare un'uscita con la sola ragione e senza data.
   - **Attesa:** *Record the exit* inerte. Con entrambe, l'uscita e' registrata, **lo spazio resta in lista**, e ricaricando la pagina l'autoraggio e' sostituito dalla frase che dice perche'.
9. Con la console del browser e i log del server aperti, provocare un fallimento di scrittura (per esempio revocando temporaneamente il ruolo di servizio).
   - **Attesa:** ogni riga di log porta il codice e il messaggio e **nessun nome e nessun indirizzo**.
10. A 390px: le sezioni rendono su una colonna, gli attributi su una colonna, il dialog sale dal bordo inferiore.

## Known Stubs

Nessuno. I cinque file sono completi per il loro perimetro: ogni ramo che i loro tipi ammettono e' disegnato, nessun valore finto raggiunge uno schermo, nessun `TODO` e nessun dato hardcoded.

Due assenze sono **decisioni dichiarate e non stub**:

- **Nessun percorso di cancellazione**, e non ce ne sara' uno.
- **Nessun modo di rientrare in corsa** dopo un'uscita. Il vincolo XOR ammetterebbe entrambi nulli; l'atto non esiste perche' nessuno ha deciso che debba, e il pannello lo dice prima che si prema.

## Threat Flags

Nessuna nuova superficie di sicurezza oltre quella che il piano dichiara e che D-45-05 ha accettato: i nomi degli spazi in trattativa ora transitano da una funzione Vercel.

Le mitigazioni del registro, in codice:

- **T-45-04** — il gate e' chiesto per primo in tutti e sette gli export, **una volta sola** per export, non e' esportato, e il service client si costruisce dopo di esso.
- **T-45-02** — nove `console.error`, tutti con codice e messaggio; check E verde. Mai l'oggetto errore, mai il terzo campo, mai nome, mai indirizzo.
- **T-45-13** — `createSpace` non prende uno stadio; `recordAnswer` pretende la fonte e rifiuta il marcatore; `setAttribute` pretende la provenienza; `recordExtendedHoursStance` non puo' scrivere il marcatore e non ha percorso di inferenza.
- **T-45-01** — il dialog non nomina lo spazio in nessun punto; l'indirizzo e' un campo su un form gated e non compare in nessun titolo, etichetta o log.
- **T-45-15** — nessun export di cancellazione; `exitSpace` scrive ragione e data insieme.
- **T-45-SC** — **nessun pacchetto installato.** Nessuna libreria di validazione: il pattern di casa e' un `CHECK` SQL nominato specchiato in una tupla `as const`, ed e' quello che il modulo usa.

## User Setup Required

Nessuna. Un avvertimento operativo si': **le due tabelle non hanno alcun arco di scrittura nelle policy**, quindi ogni atto di questo modulo passa dal service client. Se `SUPABASE_SERVICE_ROLE_KEY` non e' presente nell'ambiente, ogni salvataggio fallisce — e fallisce come `write_failed`, che e' una frase corretta e non dice quale sia la causa vera.

## Next Phase Readiness

- **45-12 (manifesto e visual)** resta il primo piano che vedra' `verify:section-surface` misurare da solo, e vedra' B e C rossi per DEF-45-07 — non per questo piano. Il check E e' gia' verde e restera' tale finche' i nuovi log porteranno codice e messaggio.
- **45-18 (la tab)** non e' toccato.
- **La decisione su `exit_reason`** e' ora prendibile con la superficie davanti: vedi la prima sezione.
- **DEF-45-05** resta aperta e non e' stata risolta qui: e' stata **contenuta** sul percorso d'ingresso, con il limite dichiarato.

## Self-Check: PASSED

**File dichiarati creati — esistenza verificata:**

- `src/app/(admin)/admin/location/actions.ts` — FOUND
- `src/app/(admin)/admin/location/SpaceForm.tsx` — FOUND
- `src/app/(admin)/admin/location/StageChangeDialog.tsx` — FOUND
- `src/app/(admin)/admin/(work)/location/[id]/page.tsx` — FOUND (modificato)
- `src/app/(admin)/admin/(work)/location/page.tsx` — FOUND (modificato)

**Commit dichiarati — esistenza verificata:** `f011ad3`, `7911824`.

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
