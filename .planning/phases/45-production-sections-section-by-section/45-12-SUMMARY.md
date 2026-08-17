---
phase: 45-production-sections-section-by-section
plan: 12
subsystem: ui
tags: [nextjs, rls, capability-routes, design-tokens, sound-manifesto, brand-visual-system, read-only, gates]

# Dependency graph
requires:
  - phase: 45-06
    provides: "scripts/verify-section-surface.mjs — i cinque check e i nomi dei renderer, scritti prima delle superfici"
  - phase: 45-08
    provides: "le tre tabelle di sezione e le loro policy, applicate in produzione"
  - phase: 45-11
    provides: "le convenzioni di superficie: guardia di pagina, client legato al cookie, tre esiti per lettura, segnaposto letterale"
provides:
  - "src/app/(admin)/admin/(work)/manifesto/page.tsx — il manifesto dietro la propria chiave, tre stati resi come tre cose diverse"
  - "src/app/(admin)/admin/(work)/visual/page.tsx — il capitolato accanto al materiale, senza un solo nome di spazio"
  - "src/app/(admin)/admin/manifesto/SectionStateBadge.tsx — l'unico badge dei tre stati, due importatori"
  - "src/app/(admin)/admin/manifesto/SectionVoid.tsx — l'unico renderer del vuoto, che nomina `missing` e `decision_owner`"
  - "src/app/(admin)/admin/manifesto/OpenQuestionNotice.tsx — l'avviso che non blocca niente"
  - "src/lib/production/sections/tokens.ts — il lettore a run time del `:root`, la risoluzione di D-45-09"
  - "src/app/(admin)/admin/visual/PaletteSwatches.tsx — la palette disegnata da valori letti, non portati"
  - "capability-routes.ts — le ultime due chiavi di sezione sul ramo `routes:`"
  - "scripts/verify-section-surface.mjs — DEF-45-07 chiusa: il gate nomina i file che esistono"
affects: [45-13, 45-15, 45-16, 45-17, 45-18, 45-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un valore letto a run time e' invisibile a un grep sul sorgente: e' cosi' che una superficie pubblica la palette senza aggiungere un'esenzione al gate che vieta i literal"
    - "il nome di un token che un gate cerca sulle righe vive si scrive in un commento, mai in JSX: altrimenti il gate diventa rosso su un file corretto"
    - "un gate legato a un file che non esiste e' indistinguibile da un gate assente — si sposta l'indirizzo, mai la regola"
    - "un fallimento restituito come valore con un codice si disegna sullo schermo; un log, in un progetto senza error tracking, non raggiunge nessuno"

key-files:
  created:
    - "src/app/(admin)/admin/manifesto/SectionStateBadge.tsx"
    - "src/app/(admin)/admin/manifesto/SectionVoid.tsx"
    - "src/app/(admin)/admin/manifesto/OpenQuestionNotice.tsx"
    - "src/app/(admin)/admin/(work)/manifesto/page.tsx"
    - "src/app/(admin)/admin/(work)/manifesto/loading.tsx"
    - "src/lib/production/sections/tokens.ts"
    - "src/app/(admin)/admin/visual/PaletteSwatches.tsx"
    - "src/app/(admin)/admin/(work)/visual/page.tsx"
    - "src/app/(admin)/admin/(work)/visual/loading.tsx"
  modified:
    - "src/lib/routes/capability-routes.ts"
    - "scripts/verify-section-surface.mjs"
    - "next.config.ts"

key-decisions:
  - "D-45-12-A: DEF-45-07 si chiude spostando il GATE, non i renderer di 45-07. Cambiano solo gli indirizzi (`ScoreCell.tsx`, `AttributeCell.tsx`); l'invariante e' identica e i compagni sono ora gli identificatori che quei file portano davvero. Provato per mutazione: il check B e' stato visto fallire due volte, con la mutazione verificata applicata"
  - "D-45-12-B: `SectionVoid.tsx` esiste, benche' non sia in `files_modified`. E' il file che il check C pretende per nome, e senza di lui il gate sarebbe stato rosso su un albero corretto"
  - "D-45-12-C: il nome `--grad-sunset` compare in un COMMENTO e mai in codice vivo. `verify:sunset-gradient` cerca il nome a confine sulle righe con i commenti gia' cancellati, quindi nominarlo nel testo reso avrebbe fatto rossare un file corretto"
  - "D-45-12-D: nessun colore identificativo di format e' disegnato su queste due superfici — non piccolo, non da nessuna parte. Sulla pagina il cui soggetto e' la palette, la dimensione sicura per un valore che non ne fa parte e' nessuna. Il check D e' verde per assenza strutturale, e P4 e' nominata come il gate che davvero terrebbe la regola"
  - "D-45-12-E: la commutazione fra i tre stati e' scritta in ciascuna pagina, non condivisa. La frase che introduce un corpo `coordinates_declared` e' SPECIFICA della sezione; cio' che non deve differire — il badge e il vuoto — ha un renderer solo"
  - "D-45-12-F: `next.config.ts` nomina `src/app/globals.css` in `outputFileTracingIncludes` per `/admin/visual`. Un foglio di stile e' un input del build, non un output: senza, la lettura a run time fallirebbe in produzione — un fallimento dichiarato, ma su una funzione che non funzionerebbe mai"
  - "D-45-12-G: le domande aperte chiuse (`closed_at IS NOT NULL`) non sono lette. Un registro che continuasse ad avvertire su questioni gia' decise e' un registro le cui avvertenze smettono di essere lette — la stessa ragione per cui D-45-15 non lascia bloccare niente"

requirements-completed: [PROD-02]

# Metrics
duration: ~45min
completed: 2026-08-17
---

# Fase 45 Piano 12: le due sezioni scritte — Summary

**Nove file e tre modifiche: due superfici dove un vuoto dichiara la propria lacuna
e il nome di chi deve chiuderla, una palette che non esiste due volte perche' viene
letta invece che ricopiata, e un gate che da oggi misura davvero — dopo aver
spostato l'indirizzo che sbagliava, senza toccare la regola.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-08-17
- **Tasks:** 3, piu' un commit di riparazione dichiarato
- **Files:** 12 (9 creati, 3 modificati)

## Task Commits

1. **Task 1 — il manifesto: tre stati, un vuoto che nomina la propria lacuna** — `6ffba36` (feat)
2. **Task 2 — la palette ha una casa sola, letta a run time** — `42c164d` (feat)
3. **DEF-45-07 — il gate nomina i file che esistono** — `e5bbdef` (fix)
4. **Task 3 — il visual: il capitolato accanto al materiale** — `7fc2bf2` (feat)

L'ordine non e' casuale. Il gate e' stato corretto **prima** che
`(work)/visual` completasse il suo scope, cosi' che in nessun commit di questa
sequenza `verify:section-surface` sia rosso su un albero corretto — nemmeno per
uno. Un rifiuto per directory mancante e' onesto; un rosso su codice giusto e'
il modo in cui un gate viene spento portandosi via anche i rossi veri.

## DEF-45-07, chiusa — e perche' si e' mosso il gate

`scripts/verify-section-surface.mjs` dichiara **per nome** i file autorizzati a
rendere ciascun valore, e la sua intestazione dice come leggere il rapporto:
*«The surfaces satisfy this list; the list does not describe them.»* Due
contratti gia' committati dicevano cose diverse:

| Il gate pretendeva | Sul disco (45-07) | Compagno preteso | C'era? |
|---|---|---|---|
| `SpaceScore.tsx` | `ScoreCell.tsx` | `ScoreProvenance` | no |
| `SpaceAttribute.tsx` | `AttributeCell.tsx` | `AttributeAsked` | no |
| `SectionVoid.tsx` | — | `missing`, `decision_owner` | creato qui |

**Cosa e' cambiato: solo gli indirizzi.** L'invariante e' byte per byte quella
che 45-06 ha scritto — *una cella di punteggio rende la provenienza del numero
che le sta accanto, una cella di attributo rende se la domanda e' mai stata
fatta*. La regola del renderer unico e le liste di token non sono state toccate.
I compagni sono ora gli identificatori che quei due file portano davvero:

| Check | Renderer | Compagni |
|---|---|---|
| B (punteggio) | `ScoreCell.tsx` | `score.provenance`, `ATTRIBUTE_PROVENANCE_LABELS` |
| B (attributo) | `AttributeCell.tsx` | `not_asked`, `ATTRIBUTE_VALUE_LABELS` |

Scelti perche' **cancellarli rompe la regola, non la rinomina**: senza la mappa
delle etichette la provenienza smette di essere disegnata; senza il ramo
`not_asked` una domanda non fatta torna a essere una cella vuota — e su
`evening_licence` quella domanda e' senza risposta su **100 spazi su 184**.

**Il costo, dichiarato:** un gate corretto a posteriori per farlo combaciare con
l'albero e' a un passo dal diventare un timbro. La difesa e' che questa modifica
cambia *dove guardare* e non *cosa deve essere vero* — ed e' scritta nel file,
non solo nel commit, perche' un lettore possa contestarla.

**Provato per mutazione, non argomentato.** Due giri, ognuno con la mutazione
verificata applicata prima di leggerne l'esito:

| Mutazione | Verificata applicata | Esito |
|---|---|---|
| `ATTRIBUTE_PROVENANCE_LABELS[score.provenance]` sostituito da una stringa | `grep -c "score.provenance"` → **0** | **B rosso**, exit 1 |
| il ramo `not_asked` di `AttributeCell` reso irraggiungibile | l'unica occorrenza rimasta e' in un commento | **B rosso**, exit 1, con il file nominato |
| entrambi ripristinati con `git checkout -- <file>` | `grep` → 1 e 2 | **exit 0**, cinque check su cinque |

## Il gate misura, per la prima volta da quando esiste

`node scripts/verify-section-surface.mjs` → **exit 0**, sette directory su
sette, 19 file letti di cui 16 possono rendere.

| Check | Esito | Cosa dice di se' |
|---|---|---|
| **A** lo stadio accanto al nome | ✓ | prova che il badge e' **nell'albero**, non che qualcuno lo legga come stadio → **P2** |
| **B** la provenienza accanto al valore | ✓ | stessa meta-misura, stessa procedura |
| **C** il vuoto e' dichiarato, mai bianco | ✓ | **non distingue dichiarato da rotto**: sono gli stessi byte per un grep → **P3** |
| **D** un colore di format non e' mai una palette | ✓ | **debole e lo dice di se'**: 4 px e 200 px sono la stessa riga → **P4** |
| **E** una diagnostica porta codice e messaggio | ✓ | legge gli argomenti di una chiamata che vede; un valore instradato in un helper gli e' invisibile |

**Il check D e' verde per assenza strutturale, e va detto.** Nessuna delle due
superfici disegna `formats.color` — non piccolo, non da nessuna parte, e la
colonna non e' nemmeno selezionata. Sulla pagina il cui soggetto e' *la palette*,
la dimensione sicura per un valore che non ne fa parte e' **nessuna**. Il
docblock di `PaletteSwatches` scrive la regola e nomina **P4** come il gate che
la terrebbe davvero, cosi' che chi un giorno disegnera' quel punto erediti la
procedura insieme al pixel.

## D-45-09: la palette esiste una volta sola

Il capitolato nomina dei colori; `verify:semantic-separation` check B vieta a
qualunque file sotto `src/` — due esenzioni a parte — di contenere un hex
dichiarato nel `:root`. Non e' una tensione da aggirare: **e' il gate che
funziona.**

`src/lib/production/sections/tokens.ts` legge `src/app/globals.css` a run time,
cancella i commenti, aggancia il **primo** blocco `:root` per bilanciamento di
graffe e restituisce i sei nomi dichiarati con i valori che trova. Misurato
contro il file reale:

```
block found: true · declarations: 31
--ground · --amber · --orange · --pink · --pink-soft · --violet   tutti presenti
```

Sono esattamente i sei che `brand-visual-system.md` pubblica come palette.
Fuori, ciascuno per la sua ragione: `--violet-deep` (dichiarato, mai un
foreground, e non uno dei sei), **il gradiente** (firma esclusiva di un format,
ha un gate suo, e non e' una voce di palette), e **qualunque descrizione di cosa
serva un colore** — quella e' prosa di capitolato, cioe' una riga di
`production_section` scritta da chi possiede il brand, non una costante in un
lettore.

**Nessuna terza esenzione e' stata aggiunta**, ed e' verificato:

| Asserzione | Esito |
|---|---|
| `head -3 tokens.ts \| grep -c "server-only"` | **1** |
| `grep -cE "return \[\]\|return \{\}" tokens.ts` | **0** — quattro codici di fallimento, mai una lista vuota |
| `git diff scripts/verify-semantic-separation.mjs` | **vuoto** — `EXEMPT_PATHS` invariato, due voci |
| `npm run verify:semantic-separation` | **0** |
| `npm run verify:sunset-gradient` | **0** |
| `grep -ci "neutral\|not been decided\|no palette" PaletteSwatches.tsx` | **5** |
| `grep -c "grad-sunset" PaletteSwatches.tsx` | **1**, nel paragrafo che lo rifiuta — **in un commento** |

L'ultima riga e' una misura che valeva la pena fare invece di dedurla. Il
criterio del piano ammetteva un'occorrenza «dentro il paragrafo che lo rifiuta»;
`verify-sunset-gradient` pero' cerca il nome **a confine sulle righe con i
commenti gia' cancellati**, quindi la stessa frase scritta in JSX avrebbe fatto
rossare quel gate su un file che rispetta la regola alla lettera. Il rifiuto sta
nel docblock; il testo reso parla della *firma esclusiva di un format* senza
nominarne il token.

## Le tre invarianti di dominio, e dove stanno in codice

**«Non-scritto e' una risposta, inventato non lo e'.»** Le tabelle sono vuote e
**nessuna delle due pagine disegna un solo contenuto finto**: nessuna sezione di
esempio, nessun manifesto segnaposto, nessuna palette d'esempio per un format.
L'unica prosa su una pagina vuota e' prosa sul vuoto — e dice **quale** vuoto e',
perche' *non e' ancora stato scritto* e *non siamo riusciti a leggerlo* hanno
passi successivi diversi e la prima e' vera oggi.

**«Non-scritto non vuol dire non-vincolato.»** E' il ramo
`coordinates_declared`, ed e' l'intera ragione per cui il badge ha tre stati e
non due. La frase che lo introduce dice che il manifesto non e' scritto **e che
quel che segue vincola comunque** — comprese le esclusioni, che sono decisioni
quanto i permessi. Non esiste una colonna separata per i fatti negativi, di
proposito: una colonna per le esclusioni invita una superficie che disegna i
positivi e le lascia fuori.

**«Il colore non si eredita.»** `PaletteSwatches` porta la regola provvisoria a
parole: un format che non ha ancora una palette **non eredita questa**, e i suoi
materiali restano *neutri* finche' non ne ha una. **Quale format sia, non e'
scritto in nessun file di questo piano**: e' contenuto d'autore — una riga in
stato `not_decided`, che nomina la lacuna e il ruolo che la chiude — e una
costante in un componente che lo affermasse sarebbe questo piano a decidere una
questione che il registro esiste per tenere aperta.

## Le due assenze del capitolato, scritte dove qualcuno le aggiungerebbe

- **Non nomina nessuno spazio.** Il capitolato **esce dal perimetro** — va al
  grafico esterno — e `venue-secrecy.md` lo chiama un percorso d'uscita. La
  pagina non legge nessuna tabella di venue e non ha nessun campo venue:
  `grep -cE '\.from\("venues"|\.from\("event_parties"|\.from\("production_space'`
  restituisce **0**. La ragione e' scritta accanto al punto in cui qualcuno
  aggiungerebbe la join, perche' *per quale serata e' questo pezzo* e' la domanda
  che sembra innocua in un diff.
- **Non allude a nessun suono.** Dove l'identita' sonora non e' scritta, i
  materiali non portano genere, riferimenti di scena o aggettivi che suonino come
  una promessa. La pagina mostra lo **stato** del manifesto, disegnato dallo
  stesso badge, e mai una descrizione inventata per riempirlo.

E l'archivio e' **un conteggio e una lista, mai un'immagine**: i byte non hanno
un percorso di lettura finche' il piano 45-17 non conia una URL firmata, e una
cornice rotta su una superficie gated e' indistinguibile da un archivio vuoto.
`grep -cE "<img|next/image"` → **0**; `object_key` non e' nemmeno selezionato,
perche' un puntatore che questa pagina non sa nominare e' un puntatore che non
puo' rendere, loggare o linkare.

## Le due chiavi che hanno lasciato il ramo table-only

Entrambe nello stesso commit della propria pagina, e l'ordine era forzato: una
pagina legata a una chiave `scope: "table"` e' irraggiungibile **per tutti**,
senza errore di build e senza una riga di log.

Dopo questo piano **nessuna chiave che la fase 45 ha messo su quel ramo e'
rimasta li'**. Il blocco d'avvertimento che le nominava e' stato **rimosso**, non
lasciato con un segno di spunta accanto.

⚠ **Una correzione dentro questo piano, registrata perche' e' esattamente
l'errore che il file avverte di non fare.** La prima stesura di quel paragrafo
affermava che `catalogue.manage` fosse l'unica voce `scope: "table"` rimasta.
**Falso, misurato leggendo il file:** ne restano **cinque** —
`master.manage`, `membership.active`, `door.supervise`, `media.upload`,
`venue.reveal` — e nessuna appartiene a questa fase; `catalogue.manage` si era
gia' spostata. *«Un conteggio in un commento e' un'affermazione che nessuno
controlla»* e' scritto in quel file da prima di questo piano, ed e' stato
violato dal commit che lo cita. Corretto prima del commit finale.

Il conteggio di `alsoGatesTables` e' salito di conseguenza da sette a **nove**,
un passo per commit, e tutte e quattro le chiavi di sezione portano ora il flag.

## Deviations from Plan

### Auto-fixed / declared

**1. [Deviazione dichiarata dall'orchestratore — DEF-45-07] `scripts/verify-section-surface.mjs`**

- **Trovata durante:** pre-esistente, aperta da 45-11.
- **Fuori da:** `files_modified` del piano.
- **Fix:** cambiati `SCORE_RENDERER`, `ATTRIBUTE_RENDERER` e i due compagni ai
  nomi reali; invariante e liste di token intatte. Conflitto documentato nel
  messaggio di commit e nel file.
- **Commit:** `e5bbdef`

---

**2. [Rule 2 — funzionalita' mancante per la correttezza] `SectionVoid.tsx`**

- **Trovata durante:** Task 1.
- **Issue:** il check C pretende `SectionVoid.tsx` per nome, con `missing` e
  `decision_owner` nel suo albero. Il piano non lo elencava.
- **Fix:** creato. Prende `Pick<ProductionSection, "missing" | "decision_owner">`
  — i nomi delle colonne del database, non due prop rinominate, cosi' che
  l'asserzione del gate su questo file dica qualcosa sui dati.
- **Commit:** `6ffba36`

---

**3. [Rule 2 — funzionalita' mancante per la correttezza] `next.config.ts`**

- **Trovata durante:** Task 2.
- **Issue:** un foglio di stile e' un **input** del build. Il tracing dei file
  segue gli import, e questa e' una `readFileSync` di un percorso costruito da
  `process.cwd()`: senza dichiararlo, `globals.css` non viaggia accanto al bundle
  del server e la lettura fallirebbe **in produzione e solo li'**.
- **Fix:** `outputFileTracingIncludes: { "/admin/visual": ["./src/app/globals.css"] }`,
  con la ragione scritta accanto.
- **Commit:** `42c164d`

---

**4. [Rule 3 — bloccante] Il cast dell'embed non compilava**

- **Trovata durante:** Task 1, `npm run build`.
- **Issue:** `Conversion of type '… formats: { name: any }[] …' to type
  'SectionSelectRow[]' may be a mistake`. Senza un client parametrizzato con
  `Database`, supabase-js tipa **ogni** embed come to-many; PostgREST restituisce
  un oggetto per un to-one.
- **Fix:** `as unknown as`, con la ragione scritta — la stessa via d'uscita di
  `(work)/location/[id]/page.tsx:237`. La doppia asserzione dice ad alta voce che
  nessuno sta controllando niente, dove una singola avrebbe suggerito una
  sovrapposizione verificata dal compilatore.
- **Commit:** `6ffba36`, poi `7fc2bf2`

---

**5. [Rule 1 — affermazione falsa] Il conteggio delle voci `scope: "table"`**

- **Trovata durante:** Task 3, misurando invece di ricordare.
- **Fix:** paragrafo riscritto con le cinque voci nominate. Vedi sopra.
- **Commit:** `7fc2bf2`

**Total:** 5 (1 dichiarata dall'orchestratore, 2 Rule 2, 1 Rule 3, 1 Rule 1).
Nessun allargamento di perimetro funzionale: tre file in piu' rispetto a
`files_modified`, e per ognuno la ragione e' un contratto gia' committato o un
fallimento in produzione.

## Issues Encountered

**1. `server-only` non e' un pacchetto di questo repository — e non serve
installarlo.** `src/lib/capabilities/server.ts:15` afferma che *«`server-only`
non e' una dipendenza di questo repository»*, ed e' vero del `package.json` e del
lockfile; ma `src/lib/media/strip-metadata.ts:1` lo importa e il build passa.
Misurato: Next aliasa lo specificatore a `next/dist/compiled/server-only` nella
propria configurazione webpack, e quel percorso esiste. **Nessun pacchetto
installato**, e la frase in `capabilities/server.ts` resta vera in lettera e
fuorviante in pratica — non e' stata corretta qui perche' e' file di un'altra
fase.

**2. Il worktree non ha `node_modules`.** Un worktree parallelo parte senza
dipendenze, quindi `npm run build` — che e' il typecheck di questo repo, e la
verifica minima secondo `meta-gates.md` — non era eseguibile. Risolto con un
**symlink** a quello del checkout principale (`node_modules` e' in `.gitignore`,
`git status` resta pulito), non con un `npm install`: le dipendenze sono le
stesse, non ne e' stata aggiunta nessuna, e nessun pacchetto e' stato scaricato.
E' la sorella di **DEF-45-02** e vale la pena scriverla nei piani futuri invece
di riscoprirla a ogni onda.

**3. Un criterio d'accettazione era irraggiungibile alla lettera.**
`grep -cE "<img|next/image"` sulla pagina visual restituiva **1**: la frase del
docblock che spiega *perche'* non si rende un'immagine conteneva `<img>`.
Riscritta in *«an image element»* — il criterio ora restituisce 0 e la spiegazione
e' intatta. Stessa famiglia dell'aritmetica di grep registrata da 45-07 e 45-11.

## Verification

| Gate | Esito | Nota |
|---|---|---|
| `npm run build` | **0** | `/admin/manifesto` e `/admin/visual` compaiono entrambe nella route table |
| `npm run verify:routes` | **0** | 27 pagine, 26 pattern sotto `/admin` |
| `npm run verify:section-surface` | **0** | **prima misura reale**: sette directory, A B C D E verdi |
| `npm run verify:semantic-separation` | **0** | `EXEMPT_PATHS` invariato, nessuna terza esenzione |
| `npm run verify:sunset-gradient` | **0** | il gradiente resta indossato da nessuno |
| `npm run verify:tokens` · `tables` · `breakpoints` · `dialogs` · `no-viewport-read` | **0** | |
| `npm run lint` | problemi **pre-esistenti** | nessuno dei nove file compare nell'output |
| `npm run verify` | **2** | **quattro** rifiuti, **zero** fallimenti |

**Il baseline e' stato misurato prima di toccare l'albero, ed e' migliorato.**

| | prima | dopo |
|---|---|---|
| exit | 2 | 2 |
| gate che rifiutano | **5** — `capabilities`, `conversion`, `section-surface`, `section-export`, `touch-targets` | **4** — `capabilities`, `conversion`, `section-export`, `touch-targets` |
| gate che falliscono | 0 | 0 |

`verify:section-surface` e' passato da REFUSED a un **verdetto**, che e' la
domanda che 45-11 aveva dovuto lasciare senza risposta. I quattro rifiuti
rimasti sono tutti registrati e nessuno appartiene a questo piano:
**DEF-45-01** (`conversion`, `touch-targets` — quattro superfici rimosse con
Finance e Analytics), **DEF-45-02** (`capabilities` — nessun `.env.local` in un
worktree), e `section-export`, i cui due moduli d'entry sono del piano 45-16 e
non esistono ancora.

### Cosa un verde NON significa qui

- **Nessuna riga e' mai passata da queste query.** Le tre tabelle sono vuote e
  scriverle e' il piano 45-15. Il build fa il typecheck **contro le
  dichiarazioni** di `src/types/database.ts`, e nessun client Supabase di questo
  repo e' parametrizzato con `Database`: i cast sono asserzioni, non controlli —
  e su questo piano sono **doppi**, il che lo dice ad alta voce.
- **Nessun controllo ha aperto una sessione.** Che le due sezioni siano rifiutate
  a chi il modello dei permessi non ammette e' la procedura **P1**, ancora
  `pending`.
- **`P3` e `P4` restano aperte, e sono le due che contano qui.** Nessuna
  asserzione su un sorgente distingue *non ancora deciso* da *non e' riuscito a
  caricare* su uno schermo, ne' un campione da 4 px da uno da 200. Il gate lo
  dichiara di se' su entrambe.
- **La lettura del foglio di stile non e' mai stata eseguita su Vercel.** Il
  parse e' stato provato contro il file reale e restituisce i sei valori; che il
  file sia presente accanto al bundle del server dipende da
  `outputFileTracingIncludes`, e la prima prova vera e' il primo deploy.
- Non esiste alcun test runner per il prodotto. Dirlo e' obbligatorio.

### Procedura manuale scritta, da eseguire dopo il piano 45-15

Non eseguibile oggi: le tabelle sono vuote, e questo e' esattamente il motivo per
cui i passi 1 e 2 vanno eseguiti **adesso** e i restanti dopo.

1. Con un ruolo che tiene `production.manifesto.manage`, aprire `/admin/manifesto`.
   - **Attesa:** il titolo, il paragrafo che spiega i tre stati, e *No section has
     been recorded yet* con la frase che dice che la pagina legge e non scrive.
     Nessun contenuto d'esempio, da nessuna parte.
2. Con un ruolo che **non** tiene la chiave, aprire lo stesso indirizzo, e poi
   `/admin/visual`. **Attesa:** redirect a `/dashboard`, senza che la pagina
   appaia neanche per un istante.
3. Aprire `/admin/visual` con la chiave giusta. **Attesa:** la carta *Palette*
   con sei campioni, ognuno con il proprio nome di token **e** il proprio valore
   come testo; sotto, la frase che dice che un format senza palette non eredita
   questa e resta neutro. Nessun gradiente da nessuna parte sulla pagina.
4. Confrontare i sei valori mostrati con `src/app/globals.css`. Devono coincidere
   **perche' sono gli stessi byte**, non perche' qualcuno li ha ricopiati.
   Cambiarne uno nel foglio di stile e ricaricare: il campione cambia.
5. Con una sezione in stato `written`: il corpo, e nient'altro.
6. Con una in `coordinates_declared`: la frase che dice che il manifesto non e'
   scritto **e** che quel che segue vincola, sopra il corpo. Se quella frase non
   c'e', il format si legge come libero.
7. Con una in `not_decided`: **due voci**, *what is missing* e *whose call it is*,
   dentro il pannello e non sotto un pannello vuoto. **Questa e' P3**: chiedere a
   chi guarda se sta vedendo una decisione mancante o un errore di caricamento.
   Se esita, il criterio 3 non e' chiuso.
8. Con una domanda aperta legata a un format: compare **dentro** la carta di
   quella sezione. Con una senza format: compare nel registro **sopra** le
   sezioni. Nessun controllo della pagina risulta inutilizzabile per la sua
   presenza.
9. Rinominare temporaneamente `globals.css` e ricaricare `/admin/visual`.
   - **Attesa:** la carta Palette mostra `token_file_unreadable` e la sua frase,
     con `role="alert"`; **il resto della pagina resta**. Ripristinare il nome.
10. Con la console del browser e i log del server aperti, ricaricare entrambe le
    pagine. **Attesa:** nessuna riga che contenga prosa d'autore o il nome di un
    artista. Un fallimento indotto deve produrre `code=… message=…` e nient'altro.
11. A 390px: le carte su una colonna, i campioni su una colonna. Nessuno
    scorrimento orizzontale.
12. **P4**: con qualcuno che conosce il progetto, guardare la pagina e chiedere
    *quale di questi colori appartiene a un singolo format*. La risposta corretta
    e' *nessuno* — e se qualcuno indica un campione, la palette del brand si sta
    leggendo come la palette di un format.

## Known Stubs

Nessuno. I nove file sono completi per il loro perimetro: ogni ramo che i loro
tipi ammettono e' disegnato, nessun valore finto raggiunge uno schermo, nessun
`TODO`, nessun dato hardcoded, nessuna copia inventata.

Tre assenze sono **decisioni dichiarate e non stub**:

- **Nessun percorso di scrittura.** E' il piano 45-15. L'assenza e' scritta nello
  stato vuoto di entrambe le pagine, perche' un editor mancante letto come
  feature incompiuta e' il modo in cui qualcuno costruisce il controllo invece di
  scrivere il documento.
- **Nessuna miniatura nell'archivio.** E' il piano 45-17, nominato nel codice.
- **Nessuna tab nella navigazione.** E' il piano 45-18, e l'ordine e' forzato:
  `StaffTab.href` e' `Route`, e un indirizzo statico entra nell'unione generata
  solo quando una pagina lo serve.

## Threat Flags

Nessuna nuova superficie di sicurezza: nessun endpoint aperto, nessun percorso
d'autenticazione toccato, nessuno schema cambiato, **nessun pacchetto
installato**.

Le mitigazioni del registro del piano, in codice:

- **T-45-13** — il badge dei tre stati non ha un ramo che produca il nulla
  (`grep -c "return null"` → **0**); un format senza palette riceve **parole**; e
  nessun `formats.color` e' disegnato su queste superfici, ne' selezionato.
  **P4 e' nominata nel docblock come il gate che nessun grep puo' sostituire.**
- **T-45-09** — la pagina del capitolato non legge nessuna tabella di venue
  (**0** occorrenze) e non ha nessun campo venue.
- **T-45-14** — la palette e' letta a run time dal file dei token; **nessuna
  terza esenzione** aggiunta al check B, e la lista e' asserita invariata da un
  `git diff` vuoto.
- **T-45-01** — nessuna immagine e' resa dall'archivio (**0** occorrenze) e
  `object_key` non e' selezionato. Il nome di un artista viaggia in una cella e
  in nessun log.
- **T-45-04** — entrambi i vincoli sono passati al ramo `routes:` **nello stesso
  commit della propria pagina**.
- **T-45-SC** — nessun pacchetto installato. Il `server-only` di `tokens.ts`
  risolve attraverso un alias interno di Next, verificato sul disco.

## User Setup Required

Nessuna. Due avvertimenti operativi:

1. `capability-routes.ts` lancia a **module load dentro il bundle del
   middleware**, non al build: il primo deploy che porta questi due pattern va
   fatto **in un giorno senza serate**, facendo la prima richiesta di persona.
2. Il primo deploy e' anche la prima prova reale che `globals.css` viaggia
   accanto al bundle del server. Se non lo facesse, la carta Palette mostra
   `token_file_unreadable` e il resto della pagina resta in piedi — ma qualcuno
   deve **guardarla**, perche' in questo progetto non esiste error tracking.

## Next Phase Readiness

- **45-15 (la scrittura)** eredita tre vincoli scritti in codice: `missing` e
  `decision_owner` sono obbligatori nello stato indeciso e la superficie li
  disegna gia'; ogni nuovo `console.error` deve portare `code=` e `message=` e
  nient'altro (il check E li legge tutti); e i fatti negativi vanno **dentro il
  corpo**, perche' non esiste una colonna per le esclusioni e non deve esistere.
- **45-16 (l'export)** trova entrambe le sezioni con letture gia' strette: la
  pagina del capitolato non tocca nessuna tabella di venue, che e' meta' della
  dimostrazione che l'export dovra' dare.
- **45-17 (l'upload)** trova il posto per le miniature gia' lasciato, e la
  ragione per cui e' vuoto scritta accanto.
- **45-18 (le tab)** ha ora tutte le sue precondizioni: `/admin/manifesto` e
  `/admin/visual` sono su disco e nell'unione generata.
- **DEF-45-07 e' chiusa.** Chi legge `deferred-items.md` non deve rilitigarla.

## Self-Check: PASSED

**File dichiarati creati — esistenza verificata:**

- `src/app/(admin)/admin/manifesto/SectionStateBadge.tsx` — FOUND
- `src/app/(admin)/admin/manifesto/SectionVoid.tsx` — FOUND
- `src/app/(admin)/admin/manifesto/OpenQuestionNotice.tsx` — FOUND
- `src/app/(admin)/admin/(work)/manifesto/page.tsx` — FOUND
- `src/app/(admin)/admin/(work)/manifesto/loading.tsx` — FOUND
- `src/lib/production/sections/tokens.ts` — FOUND
- `src/app/(admin)/admin/visual/PaletteSwatches.tsx` — FOUND
- `src/app/(admin)/admin/(work)/visual/page.tsx` — FOUND
- `src/app/(admin)/admin/(work)/visual/loading.tsx` — FOUND
- `src/lib/routes/capability-routes.ts` — FOUND (modificato)
- `scripts/verify-section-surface.mjs` — FOUND (modificato)
- `next.config.ts` — FOUND (modificato)

**Commit dichiarati — esistenza verificata:** `6ffba36`, `42c164d`, `e5bbdef`,
`7fc2bf2`.

---
*Phase: 45-production-sections-section-by-section*
*Completed: 2026-08-17*
