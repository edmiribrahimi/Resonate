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

## DEF-45-04 — **i tre campi di evidenza dell'archivio non hanno una colonna**,
## e sono 357 valori

**Trovata durante:** 45-10, Task 1, leggendo la sorgente.
**Stato:** in scope come misura, fuori scope come riparazione — chiuderla e' una
migration, e questa fase ne ha una sola ancora aperta, che e' il ritiro (45-09).

Tre campi della sorgente portano **la ragione di un attributo** invece del suo
valore: la descrizione dello spazio esterno (75 record), quella della vita
musicale del locale (184) e quella del suo carattere (98). Sono l'evidenza dietro
quattro dei dieci attributi, e `public.production_space_attribute` **non ha una
colonna per una nota**: porta chiave, valore, provenienza e la data di una
risposta, e nient'altro.

Il seed li **rifiuta e li conta** — `evidence_field_has_no_column`, 357 — invece
di fonderli nella nota dello spazio. Fonderli avrebbe unito tre affermazioni
diverse in una stringa sola, di cui nessuno avrebbe piu' potuto dire da quale
campo veniva quale meta'.

**Perche' conta:** il prodotto mostrera' un attributo `limitato` senza poter dire
**perche'**, e *derivato non e' verificato* pretende esattamente che chi legge
possa distinguere un'ipotesi da un dato. Una nota per attributo e' la forma in
cui quella distinzione diventa leggibile.

**Chi la possiede:** la fase che decide se l'evidenza per attributo e' una
colonna. La riparazione **non** e' un secondo import nella colonna sbagliata: il
materiale resta nell'archivio locale, quindi recuperarlo dopo e' un import in
piu', non una ricerca da rifare.

---

## DEF-45-05 — **35 note dell'archivio portano un contatto**, e la colonna che le
## avrebbe ospitate dice di non portarne

**Trovata durante:** 45-10, Task 1, misurando la sorgente prima di scriverla.
**Stato:** contenuta dal seed, non risolta.

`45-CONTEXT.md` registra la sorgente come priva di *contact field, phone, email*.
E' vero dei **campi** ed e' falso della **prosa**: misurato il 2026-08-17, 15
record portano un indirizzo di posta dentro la nota libera e 20 portano un numero
di cellulare italiano; quattro nominano una persona a cui chiedere.

Il commento della colonna di destinazione dichiara a cosa serve — *criteri e
osservazione soltanto, nessun contatto, nessuna persona, nessun prezzo* — quindi
scrivere quelle note verbatim avrebbe rotto un contratto dichiarato della colonna
e messo il numero di telefono di una persona fisica in una tabella di produzione,
per una finalita' che nessuno ha dichiarato. `legal-compliance.md`, *ogni dato in
piu' ha una ragione dichiarata o non si raccoglie*.

**Cosa ha fatto il seed:** ha **trattenuto il campo intero** su quei 35 record —
contati come `note_withheld_contact` — e ha scritto lo spazio comunque. Non ha
mascherato: una redazione che fallisce in silenzio e' peggio di un rifiuto
contato.

**Chi la possiede:** chi decide **se i contatti entrano nel prodotto**. Sono due
domande diverse e vanno tenute separate: (1) le 35 note vanno ripulite a mano e
riscritte, oppure (2) esiste una colonna per un contatto, con finalita' e
conservazione dichiarate — che e' una decisione di `legal-compliance.md`, non un
dettaglio di schema. **Nel frattempo il materiale non e' perso:** vive
nell'archivio locale, gitignored.

---

## DEF-45-06 — `45-CONTEXT.md` afferma due volte che la capienza numerica e' nulla
## su tutti i 184 record. Ne portano un numero **38**

**Trovata durante:** 45-10, Task 3 (rilettura dal catalogo). Gia' misurata dal
piano 45-01 contro lo stesso archivio.
**Stato:** correzione documentale, non un difetto di prodotto.

La revisione di D-45-11 e la tabella `<code_context>` dicono entrambe *numeric is
null on all 184*. La misura dice **38 su 184**, e le 38 sono entrate nella
colonna: il catalogo legge `with_capacity 38` dopo il seed.

**Perche' conta:** la frase, presa per buona, avrebbe portato a **non importare
il campo**, e la seconda delle quattro domande — *quanta gente ci sta davvero* —
sarebbe rimasta senza risposta su 38 spazi che l'avevano gia'. Un documento
derivato non verificato contro la sorgente corrente e' il *Gate documentazione
datata*, e questa e' la sua forma piu' costosa: un'affermazione che sembra
autorizzare un'omissione.

**Chi la possiede:** chi mantiene `45-CONTEXT.md`. La correzione e' una riga, e
va fatta contro l'archivio, non contro questa nota.

---

---

## DEF-45-07 — il gate 45-06 e i renderer 45-07 **non si chiamano allo stesso
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

### CHIUSA il 2026-08-17 dal piano 45-12, per la strada 2

Decisione dell'orchestratore: **si corregge il gate, non si rinominano i
renderer di 45-07**. Cambiano solo gli **indirizzi**; l'invariante resta
identica — una cella di punteggio rende la provenienza del numero, una cella di
attributo rende se la domanda e' stata fatta — e i compagni sono ora gli
identificatori che quei due file portano davvero (`score.provenance` /
`ATTRIBUTE_PROVENANCE_LABELS`, `not_asked` / `ATTRIBUTE_VALUE_LABELS`), scelti
perche' cancellarli rompe la regola invece di rinominarla.

`SectionVoid.tsx` e' stato creato dal piano 45-12, come previsto.

Il commit del gate (`e5bbdef`) **precede** quello che completa lo scope
(`7fc2bf2`), cosi' che in nessun commit `verify:section-surface` sia rosso su un
albero corretto. Provato per mutazione: il check B e' stato visto fallire su due
mutazioni verificate applicate e poi ripristinate. Esito finale: **exit 0**,
sette directory su sette, A B C D E verdi.

Il costo e' dichiarato nel file stesso: un gate corretto a posteriori e' a un
passo dal diventare un timbro, e la difesa e' che il diff cambia *dove guardare*
e non *cosa deve essere vero*.

---

---

*Aperto: 2026-08-17 — fase 45, piano 02. Aggiornato: 2026-08-17, piani 05, 10 e 11.*
