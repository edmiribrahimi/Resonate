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

*Aperto: 2026-08-17 — fase 45, piano 02.*
