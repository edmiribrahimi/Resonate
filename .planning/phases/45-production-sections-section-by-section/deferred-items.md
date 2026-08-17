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

*Aperto: 2026-08-17 — fase 45, piano 02. Aggiornato: 2026-08-17, piano 05.*
