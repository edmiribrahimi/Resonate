---
phase: 45-production-sections-section-by-section
plan: 06
subsystem: verification-instruments
status: complete
tags: [gates, source-assertion, import-closure, catalogue-census, procedures, mutation-proof]
requires:
  - "scripts/lib/comments.mjs — lo stripper unico, provato per mutazione"
  - "scripts/verify-conversion.mjs:792-824 — l'unica camminata di chiusura del repo"
  - "scripts/verify-calendar-surface.mjs:1-70 — la forma dell'intestazione e i codici d'uscita"
  - "supabase/migrations/** e supabase/schema.sql — da cui la lista proibita e' derivata"
provides:
  - "scripts/verify-section-surface.mjs — cinque controlli su sette directory nominate"
  - "scripts/verify-section-export.mjs — la chiusura degli import piu' il censimento del catalogo"
  - "package.json § verify:section-surface, verify:section-export"
  - "scripts/verify-all.mjs § OFFLINE — due voci in piu', con la loro ragione"
  - ".planning/phases/45/45-PROCEDURES.md — quattro procedure, tre autorizzazioni, ogni Result a pending"
affects:
  - "npm run verify — 22 voci dichiarate, 22 rendicontate, 19 eseguite"
  - "i piani 45-11..45-15 (le superfici) e 45-16 (l'export): i path che questi gate asseriscono sono un contratto, non una descrizione"
tech-stack:
  added: []
  patterns:
    - "renderer unico per valore, nella forma di PieceDate.tsx U5"
    - "lista proibita DERIVATA dallo schema, con un floor pre-registrato e i nomi pinnati separati dai derivati"
    - "astensioni raccolte e riportate PER CAUSA invece che uscire alla prima"
    - "attesa pre-registrata che nomina l'unico arco atteso e la sua direzione"
key-files:
  created:
    - scripts/verify-section-surface.mjs
    - scripts/verify-section-export.mjs
    - .planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md
  modified:
    - package.json
    - scripts/verify-all.mjs
decisions:
  - "I controlli A-D del gate di superficie leggono solo i .tsx: misurato che vocabulary.ts nomina not_decided senza renderizzarlo, e un gate rosso su codice corretto e' un gate che qualcuno spegne"
  - "La derivazione legge anche schema.sql e anche le ALTER TABLE ADD COLUMN: senza la prima manca events, senza le seconde manca event_parties per intero"
  - "La lista proibita e' derivata UNITA a quattro nomi pinnati per decisione, e le due meta' sono stampate separate"
  - "Il gate dell'export raccoglie le astensioni invece di uscire alla prima, perche' entry mancante e credenziale mancante mandano a guardare in due posti diversi"
metrics:
  duration: ~75 min
  completed: 2026-08-17
  tasks: 3
  files: 5
  commits: 3
  gates_added: 2
  procedures_written: 4
---

# Fase 45 Piano 06: cosa una macchina puo' controllare, e cosa solo una persona — Summary

Due gate e quattro procedure scritti **prima** delle superfici che misurano, cosi'
che i path che asseriscono siano un contratto da soddisfare e non la descrizione
di quello che e' stato costruito.

**Alla fine di questo piano nessuno dei due gate ha misurato niente**, e i due
`exit 2` sono l'esito corretto: le sette directory della superficie non esistono,
i due moduli d'export nemmeno, e il censimento del catalogo non ha credenziali. Un
`0` qui avrebbe voluto dire che un gate e' andato verde su un'assenza.

Quello che invece **e' stato misurato** e' che entrambi i gate sanno fallire:
ognuno dei loro controlli e' stato visto rosso su una mutazione deliberata, con la
mutazione verificata applicata prima di leggerne l'esito.

---

## Task 1 — `scripts/verify-section-surface.mjs` (commit `683f1ed`)

Cinque controlli su **sette directory nominate**, mai su `src/`.

| | Cosa asserisce | Il suo limite, scritto accanto |
|---|---|---|
| **A** | `SpaceName.tsx` e' l'unico file che puo' renderizzare il nome di uno spazio, e nomina `StageBadge` | prova che il badge e' **nell'albero**, non che una persona lo legga come stadio → P2 |
| **B** | `SpaceScore.tsx` nomina `ScoreProvenance`; `SpaceAttribute.tsx` nomina `AttributeAsked` | stessa meta-misura di A, stessa procedura |
| **C** | ogni ramo `not_decided` nomina `missing` e `decision_owner` | non distingue **dichiarato** da **rotto**: sono gli stessi byte per un grep → P3 |
| **D** | nessun colore di format su una riga con un'utility di dimensione ≥ 8 step | **debole, e lo dice di se'**: 4 px e 200 px sono la stessa riga di sorgente → P4 |
| **E** | ogni `console.error` porta `code=` e `message=`, e nessun `console.*` riceve l'oggetto errore intero, il campo della riga fallita, o il nome/indirizzo di uno spazio | legge gli **argomenti di una chiamata che vede**: un valore instradato in un helper gli e' invisibile |

**Il renderer unico non e' una comodita'.** E' la forma di `PieceDate.tsx:9-16`,
adottata per la sua premessa: *un secondo renderer e' un secondo posto dove la
regola si rompe*. Una regola che va riasserita in ogni file e' una regola che in
uno dei file verra' dimenticata.

**Il campo che PostgREST usa per la riga fallita non e' scritto da nessuna parte
in questo file** — e' assemblato a run time da pezzi. La ragione e' registrata in
`formats/actions.ts:58-63`: un grep il cui unico match e' la propria proibizione e'
un grep che alla terza volta che diventa rosso viene ignorato. Il criterio di
accettazione lo verifica: `grep -ci "details"` torna **0**.

### La prova per mutazione, e cosa ha trovato

Costruito un albero-sonda nelle sei directory mancanti, in tre giri, ogni giro con
la mutazione **verificata applicata** prima di leggerne l'esito:

| Giro | Albero | Esito |
|---|---|---|
| 1 | un file che viola ciascuna delle cinque regole | **exit 1**, A B C D E tutti rossi, 22 occorrenze |
| 2 | il log corretto in `code=`/`message=` ma con il campo della riga fallita e un indirizzo interpolati | **exit 1**, E rosso su entrambi; D verde |
| 3 | i quattro renderer dichiarati piu' un log conforme | **exit 0**, cinque su cinque |
| — | sonda rimossa | **exit 2**, con le sei directory nominate |

**La prova ha pagato subito, e non con una conferma.** Al primo giro il controllo C
e' andato rosso su `src/lib/production/sections/vocabulary.ts`, che nomina
`not_decided` due volte — nell'unione degli stati e nella mappa delle etichette —
e **non renderizza niente**. Era un rosso su codice corretto, cioe' il modo in cui
un gate viene spento portandosi via anche i quattro rossi veri.

Corretto restringendo A, B, C e D ai soli `.tsx`, e la ragione e' scritta nel file:
JSX e' legale solo in un `.tsx` sotto la configurazione TypeScript di questo
progetto, quindi **un renderer non puo' nascondersi in un `.ts`**. Quello che un
`.ts` puo' fare e' loggare — ed e' esattamente perche' **E tiene tutto lo scope**,
server action comprese.

---

## Task 2 — `scripts/verify-section-export.mjs` (commit `2e796af`)

Due meta', un file, entrambe che si astengono invece di passare quando non possono
misurare.

### Meta' uno — la sorgente, offline

- **A** la chiusura transitiva degli import dai due moduli d'export non raggiunge
  nessun modulo che interroghi una tabella proibita, e nessuno che nomini
  `venue_for_parties`. **La camminata ATTRAVERSA i moduli e non si ferma a
  nessuno**: fermarsi sarebbe un restringimento nella direzione che produce un
  verde (`verify-conversion.mjs:795-799`). Uno specifier non risolto e' un
  **finding**, non un silenzio.
- **B** nessun `.from()` proibito nei moduli d'entry stessi.
- **C** la **meta' positiva**: ogni entry nomina le proprie tabelle. A e B sono
  negativi e andrebbero verdi su un file svuotato.
- **D** la lista proibita e' **derivata**, non digitata, e stampata a ogni run.
- **E** nessun modulo raggiunto importa il service client.

**La sezione location non ha export, e qui quel fatto e' strutturale.** Non esiste
una terza entry, le due tabelle di scouting sono nella lista, e un modulo chiamato
`location*` dentro la directory d'export **fallisce per nome** — quel controllo
gira anche quando le entry non ci sono, perche' il giorno in cui qualcuno lo
aggiunge e' il giorno in cui deve scattare.

### La derivazione, e due buchi misurati mentre la si scriveva

La lista si deriva dalle tabelle che dichiarano una colonna `address`, `venue*`,
`date` o `start_time`. Scritta come diceva il piano — solo `supabase/migrations/**`,
solo `CREATE TABLE` — avrebbe prodotto **6 nomi** e ne mancavano due che contano:

1. **`events` e' dichiarata in `supabase/schema.sql`, non in una migration.** Il
   Guardrail 3 di `CLAUDE.md` dice il vero sulla RLS, non sulle tabelle base. Una
   derivazione che leggesse solo le migration ometterebbe la tabella piu' ovvia
   della lista e stamperebbe un riassunto sicuro di se' con dentro un buco.
2. **`event_parties` nasce senza data, senza venue e senza orario** e li acquisisce
   dopo, per `ALTER TABLE ADD COLUMN`. Leggendo solo il `CREATE TABLE` mancava
   **per intero** — e porta `date`, `venue_id` e quattro colonne del reveal.

Con entrambe le sorgenti e entrambe le forme: **9 derivate**, piu' **4 pinnate per
decisione** (le tre del calendario e la tabella degli attributi di scouting, che non
portano nessuna di quelle colonne e sono proibite lo stesso). Le due meta' sono
stampate **separate**: un nome pinnato e' una decisione che qualcuno ha preso, un
nome derivato e' un fatto sullo schema, e a chi legge la differenza e' dovuta.

Il floor `DERIVED_BASELINE` e' pre-registrato: **una lista che si e' ristretta e'
un finding**, perche' i due modi in cui si restringe sono una tabella caduta e un
parser che ha smesso di leggere un file — e il secondo stampa una lista piu' corta
con la stessa faccia sicura.

### Meta' due — il censimento della raggiungibilita'

`45-PATTERNS.md` § No Analog Found #1 lo nomina come lavoro **nuovo**: niente in
questo repository legge `pg_constraint` / `pg_views` / `pg_proc` per asserire che
una tabella non ha archi verso una strada pubblica nominata. La query e' scritta
con un'**attesa pre-registrata** nella forma di `verify-capabilities.mjs:190-200`:

- **un solo arco atteso, per nome:** `production_space.promoted_venue_id → venues`.
  La sua **direzione** e' la ragione per cui e' sicuro — punta in fuori, mentre la
  strada cammina `event_parties → events → venues` e non arriva mai allo scouting.
  **La sua presenza e' un pass, la sua assenza e' un finding**;
- nessuna FK dalle tre tabelle della strada verso lo scouting;
- nessuna vista in `public` che nomini entrambi i lati (PostgREST la servirebbe);
- nessuna funzione in `public` che nomini entrambi, oltre a un eventuale percorso
  di promozione, che andrebbe dichiarato qui **per nome prima** di essere scritto.

**Senza `SUPABASE_ACCESS_TOKEN` questa meta' si astiene con exit 2** e stampa che
*nothing about reachability was measured*.

### La prova per mutazione

| Mutazione | Verificata applicata | Esito |
|---|---|---|
| due moduli d'entry conformi | — | nessun finding, exit 2 per la sola credenziale mancante |
| tolto `.from("production_section")` da `manifesto.ts` | `grep -c` → **0** | **C rosso**, exit **1**: un fallimento supera un'astensione |
| un helper che interroga `production_plan` e importa il service client, raggiunto **solo per via** dell'entry | — | **A rosso attraverso la chiusura** (4 moduli raggiunti invece di 2) e **E rosso** |
| `.from("venues")` diretto in `capitolato.ts` | — | **A e B rossi** |
| `location.ts` nella directory d'export | — | **A rosso per nome** |
| `profiles` aggiunto a `DERIVED_BASELINE` | `grep -c` → **1**, poi **0** dopo il ripristino | **D rosso**: *la lista si e' ristretta* |
| sonda rimossa | `git status` pulito | **exit 2**, due astensioni distinte per causa |

---

## Task 3 — La registrazione e le quattro procedure (commit `5023ce9`)

**Registrazione.** `verify:section-surface` e `verify:section-export` in
`package.json` e nella lista **`OFFLINE`** di `verify-all.mjs`. Il secondo sta in
`OFFLINE` pur avendo una meta' che chiede credenziali, ed e' **lo stesso stato
onesto che `verify:capabilities` gia' porta in quella lista**, con la ragione detta
con le stesse parole. La riconciliazione tiene: **22 dichiarate, 22 rendicontate,
19 eseguite**.

**`45-PROCEDURES.md`**, sul modello di quello della fase 44, con le quattro
procedure e **ogni `Result` a `pending`** — quattro esatti, verificato.

| | Cosa chiude | Perche' e' manuale |
|---|---|---|
| **P1** | criterio 1 — chi tiene una sezione e' rifiutato sulle altre | **non esiste in produzione un soggetto per cui accada** (D-45-03), e D-45-23 vieta di fabbricarne uno. Gira in un ambiente **usa-e-getta**, su un account fatto a mano, e non tocca produzione |
| **P2** | criterio 2 — lo stadio leggibile ovunque lo spazio sia nominato | il gate prova che il badge e' nell'albero; che una persona lo legga come stadio non e' una stringa |
| **P3** | criterio 3 — il vuoto che si dichiara invece di sembrare rotto | dichiarato e rotto sono gli stessi byte per un grep |
| **P4** | la domanda che nessuno ha fatto, e il colore che non e' una palette | una cella vuota e una domanda non fatta sono lo stesso pixel; 4 px e 200 px sono la stessa riga |

**Tre autorizzazioni, non una**, ognuna un atto che si consuma per cio' che e'
stato descritto: **A1** la coniatura di sessione del piano 45-02 (**SPESA**, una
seduta sola), **A2** l'applicazione delle migration dei piani 45-08 e 45-09, **A3**
la semina dello scouting del piano 45-10. **Nessuna delle quattro procedure ne
spende alcuna**: non scrivono niente.

**Ruoli mai nomi, passi mai osservazioni.** Un passo dice *apri la sezione location
e leggi la prima riga*, mai cosa dice quella riga. La regola qui non e' cortesia:
l'archivio di scouting porta un indirizzo su ogni record, e questo repository e'
pubblico. Il controllo cerca token di strada e date ISO: **una sola occorrenza,
la data `written:` del frontmatter.**

---

## Deviazioni dal piano

### 1. `npm run verify` esce 2 e non 0 — e i due nuovi rifiuti sono per costruzione

Il criterio di accettazione del Task 3 chiede `npm run verify` exits 0. Esce **2**,
con **cinque** astensioni e **zero** fallimenti. Vanno distinte:

**Le due che questo piano ha aggiunto, e che sono l'esito corretto:**
`verify:section-surface` (sei directory su sette non esistono) e
`verify:section-export` (i due moduli d'entry non esistono, e non c'e' credenziale).
Il piano stesso lo dichiara nella sua sezione `<verification>`: *«due exit-2 sono
l'esito corretto e quello onesto; un 0 qui vorrebbe dire che un gate e' andato
verde su un'assenza»*. Non sono da riparare.

**Le tre pre-esistenti, non causate da questo piano e non riparate:**
`verify:conversion` e `verify:touch-targets` nominano quattro superfici rimosse
quando Finance e Analytics sono passate a SumUp; `verify:capabilities` non trova
`.env.local` dentro un worktree. Erano gia' registrate in `deferred-items.md` dal
piano 45-02 e appartengono a chi ha rimosso quelle superfici.

La meta' sostanziale del criterio e' soddisfatta e verificata: l'aggregato riporta
entrambi i nuovi gate come **REFUSED (exit 2)** con la loro ragione, **non** li
conta come fallimenti, e la riconciliazione 22/22 tiene.

### 2. La derivazione legge due sorgenti e due forme, non una (Rule 2)

Il piano prescrive *«dall'insieme delle tabelle dichiarate in
`supabase/migrations/**` che portano una colonna …»*. Applicato alla lettera
produce 6 nomi e ne perde due che contano — `events` (dichiarata in `schema.sql`)
e `event_parties` (che acquisisce data, venue e orario per `ALTER TABLE`). Entrambe
le estensioni sono nel file con la misura accanto. E' funzionalita' mancante per
la correttezza, non un allargamento di scope: senza, la lista "per costruzione" non
copre le due tabelle piu' ovvie che un export non deve toccare.

### 3. I controlli A–D leggono solo i `.tsx` (Rule 1)

Trovato dalla prova per mutazione, non dal ragionamento: `vocabulary.ts` nomina
`not_decided` senza renderizzarlo, e il controllo C ci andava rosso. Vedi sopra.

### 4. Il gate dell'export raccoglie le astensioni invece di uscire alla prima

Il criterio chiede che il transcript **distingua** *entry mancante* da *credenziale
mancante*. Uscire alla prima astensione — la forma che `verify-calendar-surface`
usa — ne stamperebbe una sola. Le due sono raccolte e riportate per causa, e un
fallimento supera comunque un'astensione (exit 1), che e' la regola scritta in
`verify-all.mjs` dopo WR-01.

---

## Cosa questi due gate NON possono chiudere

1. **Nessuno dei due apre una sessione.** Il rifiuto con un ruolo vero e'
   `verify:refusal` e la procedura P1; il censimento legge il **catalogo**
   attraverso un ruolo che **bypassa la RLS**, quindi prova che **una strada non
   esiste** e non prova assolutamente niente su **chi puo' percorrerla**. La frase
   e' stampata a ogni run verde, non solo scritta qui.
2. **La meta' due non e' mai stata eseguita.** Nessun run l'ha portata oltre
   l'astensione per credenziale mancante: dentro un worktree non c'e' `.env.local`,
   e questo piano non ha ritenuto proporzionato aprire una connessione a produzione
   per esercitare un ramo che il piano stesso si aspetta astenuto. **Conseguenza
   dichiarata: la sua SQL non e' mai stata valutata da un motore.** Il primo run
   reale e' quello del piano 45-08, dopo che la migration ha creato
   `production_space` — prima di allora il censimento non troverebbe nemmeno la
   tabella da interrogare.
3. **`verify:capabilities` sara' rosso dal piano 45-05 al 45-09 per costruzione**
   (il codice chiede le nuove chiavi prima che produzione le abbia). Nessuno dei due
   gate di questo piano dipende da lui, quindi in quella finestra il loro verdetto
   non e' influenzato — ma chi legge `npm run verify` in quel periodo vedra' tre
   rifiuti diversi con tre cause diverse, e la lista `OFFLINE` le nomina tutte.
4. **Un'assenza provata oggi e' un'assenza provata oggi.** Una vista aggiunta domani
   e' una strada aggiunta domani: questi sono gate da rilanciare, non certificati da
   archiviare.

### Una frase del piano che ho verificato NON essere ripetuta

Il piano 45-02 aveva corretto testualmente l'affermazione *«lo strumento puo'
provare che le policy chiedono chiavi diverse, letto da `pg_policies`»* — falsa
oggi, perche' tutte e sei le policy del calendario chiedono **una** chiave finche'
lo split di D-45-04 non e' applicato. **Il piano 45-06 non contiene quella frase**,
verificato leggendolo: nessuna correzione da ereditare, e nessuna ne e' stata
introdotta in questi due gate.

---

## Verifica eseguita

| Controllo | Esito |
|---|---|
| `node scripts/verify-section-surface.mjs` | **exit 2**, sei directory nominate una per una |
| `grep -ci "what a green does not mean" verify-section-surface.mjs` | **1** |
| `grep -vE "^\s*(\*\|//)" … \| grep -c "'src/'"` | **0** — lo scope e' directory, mai `src/` |
| `grep -c "comments.mjs" verify-section-surface.mjs` | **3** |
| `grep -ci "weak" verify-section-surface.mjs` | **4** |
| `grep -ci "details" verify-section-surface.mjs` | **0** |
| `node scripts/verify-section-export.mjs` | **exit 2**, due astensioni distinte per causa |
| `grep -c "importClosure\|closure" verify-section-export.mjs` | **16** |
| `grep -ci "derived from" verify-section-export.mjs` | **3**, e il run stampa la lista che ha derivato |
| `grep -c "venue_for_parties" verify-section-export.mjs` | **3** |
| `grep -ci "location" verify-section-export.mjs` | **6**, nel paragrafo che dichiara l'assenza dell'export e il fallimento per nome |
| controllo C **visto fallire** | si', con la mutazione verificata applicata e poi ripristinata |
| `grep -c "verify:section-surface\|verify:section-export" package.json` | **2** |
| `npm run verify` | **exit 2**; entrambi i nuovi gate riportati REFUSED con la loro ragione, zero fallimenti, riconciliazione **22/22** |
| `grep -c "Result: pending" 45-PROCEDURES.md` | **4** |
| `grep -ci "throwaway" 45-PROCEDURES.md` | **4**, in P1 e nel blocco di chiusura |
| materiale candidato in 45-PROCEDURES.md | **1 riga**, la `written:` del frontmatter |
| le tre autorizzazioni nominate con i loro piani | **3** — A1 (45-02), A2 (45-08 e 45-09), A3 (45-10) |
| `npm run build` | **exit 0** — e serve anche a dire che nessun file-sonda e' rimasto sotto `src/` |
| `git status --short` dopo ogni giro di sonda | **pulito** |

**Cosa un verde NON significa.** Nessuno dei numeri qui sopra e' un test: questo
repository non ha un test runner (`CLAUDE.md` Guardrail 1). Sono asserzioni di
stringa e conteggi di grep. Dicono che i file concordano fra loro e con un
contratto scritto in un documento. **Non dicono che un gate sia giusto**, e le
quattro cose che nessuno di loro puo' dire hanno un nome e un numero: P1, P2, P3, P4.

---

## Bandiere di sicurezza

Nessuna superficie di rete, autenticazione, accesso a file o schema introdotta
oltre quelle nel `<threat_model>` del piano. Il gate dell'export **puo'** aprire
una connessione HTTPS al Management API quando le credenziali ci sono: e' una
lettura di catalogo con `read_only: true`, la stessa porta di
`verify:capabilities`, e in questo piano non e' mai stata aperta. Nulla qui rende
piu' facile far scattare `venue_reveal_sent`: nessuno dei due gate scrive, e le
procedure nemmeno.

---

## Cosa resta aperto per chi viene dopo

1. **I quattro renderer sono un contratto, non una descrizione.** `SpaceName.tsx`,
   `SpaceScore.tsx`, `SpaceAttribute.tsx`, `SectionVoid.tsx`: i piani 45-11..45-15
   li soddisfano con questi nomi, o spostano la lista **nello stesso commit** in cui
   spostano i file. Uno scope che insegue l'albero e' un gate che ha smesso di
   guardare.
2. **Le due entry d'export sono un contratto allo stesso modo**, e il piano 45-16
   le fa esistere. `DECLARED_READS` dice cosa ognuna deve nominare: la meta'
   positiva fallisce se una query sparisce.
3. **Il censimento va eseguito la prima volta nel piano 45-08**, subito dopo la
   migration, ed e' la prima occasione in cui la sua SQL viene valutata da un
   motore. Un errore di sintassi li' e' un rifiuto, non un verde — ma va guardato.
4. **`EXPECTED_BRIDGE_FUNCTIONS` e' vuoto oggi.** Se il percorso di promozione
   diventera' una funzione in `public`, va dichiarato li' **per nome prima** di
   essere scritto, non scoperto perche' il gate e' diventato rosso e qualcuno ha
   allargato la query.
5. **Le quattro procedure sono `pending`, e pending vuol dire non eseguita.** Il
   VERIFICATION.md di questa fase deve dire *deferred* dove lo sono, e dire che
   deferred non e' verificato.

---

## Self-Check: PASSED

- `scripts/verify-section-surface.mjs` — presente
- `scripts/verify-section-export.mjs` — presente
- `.planning/phases/45-production-sections-section-by-section/45-PROCEDURES.md` — presente
- `package.json` — modificato, due voci `verify:section-*`
- `scripts/verify-all.mjs` — modificato, due voci in `OFFLINE`
- commit `683f1ed` — presente
- commit `2e796af` — presente
- commit `5023ce9` — presente
- file-sonda sotto `src/` — **zero**, verificato con `git status --short` e con `npm run build`
- righe scritte in produzione — **zero**; nessuna autorizzazione chiesta e nessuna spesa
