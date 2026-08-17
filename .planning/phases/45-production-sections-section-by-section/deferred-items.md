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

*Aperto: 2026-08-17 — fase 45, piano 02. Aggiornato: 2026-08-17, piani 05 e 10.*
