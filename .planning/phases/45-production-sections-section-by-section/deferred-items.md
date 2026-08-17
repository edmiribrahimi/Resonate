# Fase 45 — voci fuori scope, trovate durante l'esecuzione

Registrate qui e **non riparate**: nessuna appartiene ai piani di questa fase, e
ripararle dentro un piano che non le possiede significa nascondere chi le ha
prodotte.

---

## DEF-45-01 — `verify:conversion` e `verify:touch-targets` rifiutano su quattro
## superfici che non esistono piu'

**Trovata durante:** 45-02, Task 2 (`npm run verify`).
**Stato:** pre-esistente al piano. Nessun file toccato da 45-02 e' coinvolto.

I due gate leggono la stessa lista `CONVERTED` e rifiutano (exit 2, *nothing was
measured*) perche' quattro voci nominano pagine che non sono su disco:

- `/admin/analytics`
- `/admin/analytics/compare`
- `/admin/analytics/members`
- `/admin/finance`

Le quattro superfici sono state rimosse dal prodotto per decisione dichiarata —
Finance e Analytics vivono in SumUp — e la lista non si e' mossa nello stesso
commit. Il messaggio del gate dice esattamente la regola violata: *«either the
surface moved and this entry moves with it in the same commit, or the entry is a
claim about a file that does not exist»*.

**Conseguenza misurata, e non e' cosmetica:** due gate su diciassette non
misurano nulla, e `npm run verify` esce 2 su un albero corretto. Un rifiuto
permanente e' un rifiuto che dopo la terza volta nessuno legge — che e'
precisamente il motivo per cui `verify-all.mjs` ha una terza lista invece di
lasciare `verify:ics` a rossare ovunque.

**Chi la possiede:** chi ha rimosso Finance e Analytics. La riparazione e' la
rimozione delle quattro voci dalla lista `CONVERTED`, non un allargamento del
matcher.

---

## DEF-45-02 — `verify:capabilities` rifiuta dentro un worktree

**Trovata durante:** 45-02, Task 2.
**Stato:** condizione d'ambiente, non un difetto dell'albero.

`.env.local` e' gitignored e vive nel checkout principale: un worktree non ne ha
copia, quindi il gate rifiuta per mancanza di `SUPABASE_ACCESS_TOKEN` e
`NEXT_PUBLIC_SUPABASE_URL`. E' il suo stato onesto, e il gate lo dice da se'.

**Conseguenza per chi esegue in parallelo:** ogni piano che dichiara
`npm run verify` exits 0 fra i propri criteri di accettazione lo dichiara per una
macchina che non e' quella su cui gira. Vale la pena scriverlo nei piani futuri
invece di riscoprirlo a ogni onda.

---

## DEF-45-03 — **nessuno confronta le descrizioni delle capability**, e tre
## documenti dicono il contrario

**Trovata durante:** 45-05, Task 1.
**Stato:** pre-esistente. Non introdotta da questo piano, ma resa piu' costosa da
esso — le stringhe da tenere allineate passano da una a quattro.

`src/lib/capabilities/keys.ts` (`:29-36`), la migration
`20260817120000_production_section_keys.sql` (`:97-102`) e il piano 45-05
affermano tutti e tre la stessa cosa: *«the only thing that compares them is
`scripts/verify-capabilities.mjs`, which needs a live database»*.

**Misurato:** `grep -n "description" scripts/verify-capabilities.mjs` restituisce
**una sola riga**, ed e' un commento su `master.manage`. Il gate legge le
`key` di `private.capabilities` e non tocca mai la colonna `description`. Quindi
**nessun controllo, in nessun ambiente, con o senza credenziali, confronta il
testo delle descrizioni.** La byte-identita' fra `CAP_DESCRIPTIONS` e la
migration e' oggi una convenzione documentale al 100%, non un meccanismo
parziale come i tre file lasciano credere.

**Perche' conta, ed e' il pattern che `ai-engineering.md` chiama *Gate
hallucination con un passaggio in piu'***: un documento derivato afferma una
copertura che non esiste, e il lettore successivo eredita l'affermazione senza
ereditarne la responsabilita'. E' peggio dell'assenza di controllo: chi legge
quelle righe smette di rileggere le stringhe a mano, perche' crede che qualcuno
lo faccia per lui.

**Chi la possiede:** la fase che decide se il confronto va scritto. Due strade,
e vanno pesate, non scelte qui:

1. **Aggiungere un lato al gate** — confrontare `description` per chiave. Costa
   poco e chiude il buco, ma allunga un check che ha gia' bisogno di un database.
2. **Correggere le tre frasi** — dichiarare che la byte-identita' non e'
   verificata da nulla. Costa niente e rende onesta la documentazione, ma lascia
   quattro stringhe lunghe a divergere in silenzio.

La riparazione **non** e' allentare la regola della byte-identita': e' l'unico
motivo per cui una decisione di permesso si spiega con la stessa frase in
entrambi i posti.

---

## DEF-45-04 — il gate 45-06 e i renderer 45-07 **non si chiamano allo stesso
## modo**, e il check B fallira' il giorno in cui la 45-12 completa lo scope

**Trovata durante:** 45-11, Task 2.
**Stato:** pre-esistente a questo piano. Nessun file di 45-11 la produce, e
nessun file di 45-11 puo' ripararla senza riscrivere le consegne di un altro
piano.

`scripts/verify-section-surface.mjs` (piano 45-06) dichiara **per nome** i file
che possono rendere ciascun valore, e la sua stessa intestazione dice che il
rapporto va letto in quella direzione: *«The surfaces satisfy this list; the list
does not describe them.»*

Il piano 45-07 ha creato due dei tre renderer con nomi diversi:

| Il gate pretende | Sul disco (45-07) | Compagno preteso | C'e'? |
|---|---|---|---|
| `SpaceScore.tsx` | `ScoreCell.tsx` | `ScoreProvenance` | no |
| `SpaceAttribute.tsx` | `AttributeCell.tsx` | `AttributeAsked` | no |
| `SectionVoid.tsx` | — (e' della 45-12) | `missing`, `decision_owner` | non ancora |

**Misurato, non dedotto.** Creando temporaneamente le quattro directory mancanti
dello scope e rilanciando il gate, l'esito e':

```
✓ A   the stage stands beside the name, in one renderer
✗ B   → SpaceScore.tsx is not in scope … → SpaceAttribute.tsx is not in scope
✗ C   → SectionVoid.tsx is not in scope
✓ D   a format colour is never drawn as a palette
✓ E   a diagnostic carries a code and a message
SECTION_SURFACE_FAIL — 2 check(s) failed: B, C (3 occurrence(s))
```

Le directory di prova sono state rimosse subito: non sono state committate.

**Perche' non e' riparata qui.** Rinominare i due file di 45-07 e introdurvi due
identificatori che oggi non esistono e' riscrivere la consegna di un piano
gia' chiuso, e il piano 45-11 li nomina esplicitamente come i renderer da usare.
E' un conflitto fra due contratti gia' committati, e va deciso — non risolto in
silenzio dentro l'esecuzione di un terzo.

**Quando diventa visibile:** oggi il gate esce **2 (REFUSED)** perche' quattro
delle sette directory dello scope non esistono, e un rifiuto e' un rifiuto per
tutte le sette. Il giorno in cui il piano 45-12 crea manifesto e visual, il gate
comincia a misurare e il check B diventa **rosso**, su un albero in cui i due
renderer esistono e fanno esattamente il loro lavoro.

**Chi la possiede:** il piano che completa lo scope (45-12), che e' il primo a
vederla rossa. Due strade, e vanno pesate:

1. **Rinominare i renderer** in `SpaceScore.tsx` / `SpaceAttribute.tsx` e
   introdurre i due compagni — allinea l'albero al gate, ma tocca file di 45-07
   e ogni importatore.
2. **Correggere il gate** — cambiare `SCORE_RENDERER`, `ATTRIBUTE_RENDERER` e i
   due compagni ai nomi reali. Costa un diff, ma il gate e' stato scritto prima
   delle superfici proprio per vincolarle, e cambiarlo dopo per farlo passare e'
   la mossa che lo trasforma in un timbro.

**Nota sul check A:** e' verde perche' 45-11 ha creato `SpaceName.tsx` con il
nome che il gate pretende. Se il nome dello spazio fosse stato reso dentro
`SpaceList.tsx` — la lettura letterale del criterio d'accettazione del piano —
il check A sarebbe **rosso** insieme a B e C.

---

*Aperto: 2026-08-17 — fase 45, piano 02. Aggiornato: 2026-08-17, piano 11.*
