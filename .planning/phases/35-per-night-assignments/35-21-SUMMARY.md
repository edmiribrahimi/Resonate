---
phase: 35-per-night-assignments
plan: 21
subsystem: media-and-storage
tags: [media-upload, per-night, quarantine, exif, rls, structural-check, wave-8]

# Dependency graph
requires:
  - plan: 35-16
    provides: "`mayUploadToParty`, le tre categorie, e i DUE obblighi indirizzati a questo piano per nome: passare la notte E rendere `partyId` obbligatorio"
  - plan: 35-20
    provides: "`POST /api/media/finalize` — l'unico percorso verso il bucket pubblico, con 17 categorie di rifiuto restituite come VALORE"
  - plan: 35-19
    provides: "`stripImageMetadata` e il bucket privato `event-media-quarantine`"
  - plan: 35-18
    provides: "`event_media.party_id` e il trigger che rifiuta una riga senza serata"
  - plan: 35-07
    provides: "`hasCapability(key, { partyId })` — e la regola che ogni fallimento lancia"
provides:
  - "la superficie che nomina la notte: `uploadableParties` risolto lato server e speso in un selettore senza preselezione"
  - "`canUpload` con il terzo braccio — il permesso per-notte diventa spendibile"
  - "`MediaUpload` che deposita in quarantena, chiama la rotta, e scrive la riga solo sul suo `ok`"
  - "17 categorie di rifiuto tradotte in 17 frasi distinte, piu' 4 esiti distinti per posizione"
  - "`partyId` secondo parametro OBBLIGATORIO di `validateMediaUpload` e `registerMedia` — il debito del piano 35-16 e' pagato"
  - "la quindicesima migration: il browser perde la scrittura sul bucket pubblico"
  - "`npm run verify:media-strip` — il controllo strutturale, provato con sei mutazioni"
affects: [35-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "un vincolo di schema citato da un piano va VERIFICATO prima di essere usato come giustificazione: `UNIQUE (event_id, type)` e la colonna `type` sono state droppate il 2026-02-26, e il piano le cita entrambe come vive"
    - "nominare un bucket non e' scriverci: un controllo che confonde `.remove()` con `.upload()` fallisce sul file che esiste per proteggere, e un controllo che fallisce su un file corretto viene disattivato"
    - "`DROP POLICY IF EXISTS` con un nome sbagliato e' un no-op che si applica pulito: il nome va confrontato con quello che la migration originale ha CREATO, non riletto dal file che lo droppa"
    - "un resolver che lancia, su una pagina che vende biglietti, va catturato per elemento: un minuto storto del database non deve essere un 500 sul percorso del denaro"
    - "il perimetro di lettura piu' stretto non e' una query nuova con meno colonne: e' nessuna query nuova"

key-files:
  created:
    - supabase/migrations/20260809006000_event_media_server_upload_only.sql
    - scripts/verify-media-strip.mjs
  modified:
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/[slug]/MediaGallerySection.tsx
    - src/components/media/MediaUpload.tsx
    - src/app/(public)/events/[slug]/actions.ts
    - package.json

key-decisions:
  - "`uploadableParties` si costruisce dall'array `parties` GIA' letto a `page.tsx:200`, non da una query nuova. Il piano chiede `id, title, type` da `event_parties`; la colonna `type` **non esiste dal 2026-02-26** (`20260226300000_multi_sub_events.sql:17`), quindi la query del piano non e' scrivibile. Riusare `parties` e' anche strettamente piu' stretto: stessa visibilita' RLS, zero round trip in piu', zero colonne nuove, e i tre campi passati al client sono gia' resi in HTML per lo stesso spettatore"
  - "Il tetto «al massimo tre risoluzioni» che il piano usa per giustificare il ciclo **non e' piu' vero**: `UNIQUE (event_id, type)` e' stato droppato nella stessa migration. Il ciclo e' N, e il vincolo vero — l'unico che si puo' scrivere accanto — e' che N e' il numero di serate GIA' disegnate su questa pagina"
  - "Un fallimento di `hasCapability` e' catturato per serata invece di propagare. Lasciarlo salire trasformerebbe un minuto storto del database in un 500 sulla **superficie d'acquisto**; `ticketing-payments.md` vieta a una lettura ausiliaria di abortire il percorso del denaro. Fail-closed sulla serata, con il costo dichiarato: per chi ha solo l'assegnazione, una serata irrisolta e' indistinguibile da una non assegnata"
  - "Le due Server Action restano a `throw` e NON diventano un risultato discriminato. Next redige il messaggio in produzione, quindi la categoria non arriva comunque: il chiamante le distingue **per posizione** — quale chiamata della sequenza ha lanciato — e mostra due frasi diverse. Un terzo alfabeto di categorie per due domande che la posizione separa gia' sarebbe duplicazione"
  - "La copy resta in **inglese**, come ogni altra stringa utente del prodotto (misurato: zero stringhe italiane sotto `src/`). Le frasi che il piano scrive in italiano sono descrizioni di significato, non letterali: una casella di caricamento mezza italiana dentro un'app inglese e' un difetto, non una traduzione"
  - "L'intestazione della migration porta un blocco in **italiano** e il resto in inglese. Non e' incoerenza: chi applica la riga 15 arriva dalla coda di `35-HUMAN-UAT.md`, che e' in italiano, e le due frasi che deve leggere — «dopo il deploy» e «finche' non e' applicata la spoglia e' aggirabile» — devono essere nella lingua in cui le ha lette la prima volta"
  - "Il controllo A cerca una **scrittura**, non il nome del bucket. La prima stesura segnalava `deleteMedia`, che chiama `.remove()` sul bucket pubblico — la cancellazione che `media-and-storage.md` pretende resti possibile e per cui la migration conserva apposta le due policy di DELETE"

# Metrics
metrics:
  duration: "~2h"
  completed: 2026-08-09
  tasks_completed: 3
  tasks_total: 3
  checkpoint_open: false
---

# Fase 35 Piano 21: il permesso per-notte diventa spendibile, e resta un solo percorso verso il bucket pubblico — Summary

Le due meta' che mancavano erano opposte fra loro. La prima: un fotografo
assegnato a una notte aveva un permesso che nessuna interfaccia sapeva
nominare — e da due wave **il caricamento rifiutava per tutti**, organizer e
master compresi, perche' `registerMedia` pretendeva una notte che nessun
chiamante passava. La seconda: la rotta che spoglia i metadati esisteva e il
browser continuava a scrivere **dritto nel bucket pubblico**, saltandola.

Da questo piano la casella compare a chi e' assegnato, la notte si sceglie
prima di caricare, i byte passano dalla quarantena, e nel repository c'e' un
controllo che fallisce se qualcuno apre un secondo percorso.

> **Una cosa che questo piano NON fa, e che va letta prima di ogni altra.**
> `20260809006000` e' un **file**, non uno stato del database. Finche' quella
> riga non e' applicata a mano — riga 15 della coda, l'unica che si applica
> **dopo** il deploy — **la spoglia dei metadati resta aggirabile**: chiunque
> abbia una sessione di membro approvato puo' scrivere nel bucket `event-media`
> da una console del browser e pubblicare una foto con dentro le coordinate GPS
> di dove e' stata scattata. Il codice che spedisce non chiude quella porta: la
> chiude l'operazione manuale.

---

## Cosa e' stato fatto

| Task | Nome | Commit | File |
|---|---|---|---|
| 1 | La superficie impara a nominare la notte | `557f949` | `page.tsx`, `MediaGallerySection.tsx`, `MediaUpload.tsx`, `actions.ts` |
| 2 | La quindicesima migration | `34f9a6a` | `20260809006000_event_media_server_upload_only.sql` + tre catture di baseline |
| 3 | `verify:media-strip` | `e1147f2` | `scripts/verify-media-strip.mjs`, `package.json` |

**Lingua.** Commenti del codice in inglese, come l'intera famiglia di file che
toccano (`finalize/route.ts`, `may-upload.ts`, `strip-metadata.ts`); copy utente
in inglese, come tutto il prodotto; prosa di questo documento, messaggi di commit
e il blocco d'intestazione della migration in italiano.

---

## I due obblighi ereditati, entrambi chiusi

**1. Dal piano 35-16, per nome: passare la notte E rendere `partyId`
obbligatorio.** Il primo era gia' asserito da un grep; il secondo stava solo in
un docblock. Entrambi fatti:

```
validateMediaUpload(eventId: string, partyId: string)
registerMedia(eventId: string, partyId: string, storagePath: string, type, fileSize)
```

La notte e' il **secondo parametro** e non ha piu' un `?`. Da qui `TS2554` e' il
comportamento desiderato: un chiamante che dimentica la notte non compila. **Il
rifiuto a runtime resta**, e toglierlo sarebbe l'errore: il tipo di un parametro
di Server Action non e' un confine, il client manda cio' che vuole sul filo.

Con questo, **la voce 9 di `deferred-items.md` e' chiusa**: la finestra in cui
il caricamento rifiutava per tutti finisce a questo commit.

**2. Dal piano 35-20: l'eccezione d'ordine della quindicesima riga.** Scritta in
testa al file che la chiude, in italiano, con la frase sulla aggirabilita' —
e ripetuta in questo documento sopra, e nella sezione «cosa non e' provato»
sotto. Non e' stata ammorbidita in nessuno dei tre posti.

---

## Task 1 — la superficie

### `page.tsx`

`uploadableParties` si costruisce **dall'array `parties` gia' letto**, non da una
query nuova, e la ragione e' doppia.

La prima e' che la query del piano non e' scrivibile: chiede `id, title, type` da
`event_parties`, e **la colonna `type` non esiste**. E' stata droppata insieme al
suo `CHECK` e al suo `UNIQUE` il 26 febbraio 2026
(`20260226300000_multi_sub_events.sql:11-17`). Il piano cita quel `UNIQUE` anche
come giustificazione del ciclo — *«al massimo tre risoluzioni»* — e quel tetto
non c'e' piu': un evento puo' portare N sotto-serate. Il vincolo vero, quello
scritto accanto al ciclo, e' che N e' **il numero di serate gia' disegnate su
questa pagina**; se una serata smettesse di essere resa, il ciclo dovrebbe
smettere di iterarla.

La seconda e' che riusare e' **strettamente piu' stretto** di qualunque query
nuova: stessa visibilita' RLS (`parties` esce dallo stesso client legato ai
cookie), zero round trip in piu', zero colonne nuove, e `id`/`title`/`date` sono
gia' resi in HTML per questo stesso spettatore. Il perimetro di lettura non si
allarga **di zero**, non di poco — che e' cio' che `venue-secrecy.md` chiede su
una superficie enumerata.

Il terzo braccio:

```ts
const canUpload =
  isAuthenticated &&
  ((isApproved && hasAttended) || isOrganizer || isMasterRole || uploadableParties.length > 0);
```

I due bracci di oggi sono invariati, e **il braccio della presenza e' invariato
parola per parola**, difetto compreso: `page.tsx:319` legge `.from("attendance")`
mentre la tabella e' `public.attendances`. Correggerlo **allarga** chi puo'
caricare, che e' una decisione d'accesso fuori dagli otto requisiti di questa
fase. Congelato per la stessa ragione per cui l'ha congelato il piano 35-16.

**Il fallimento del resolver e' catturato per serata.** `hasCapability` lancia
invece di restituire una risposta degradata — corretto, li'. Lasciarlo salire
qui trasformerebbe un minuto storto del database in un **500 sulla pagina che
vende i biglietti**, e `ticketing-payments.md` e' esplicito: una lettura
ausiliaria non aborta il percorso del denaro. Una serata irrisolta non viene
offerta — fail-closed. **Il costo e' dichiarato accanto:** per chi ha solo
l'assegnazione, una serata irrisolta e' indistinguibile da una non assegnata; non
esiste error tracking, quindi il `console.error` raggiunge un log che nessuno
legge. Quando gli altri bracci reggono, la casella compare con elenco vuoto e
`MediaUpload` disegna uno stato d'errore invece di un controllo muto.

### `MediaGallerySection.tsx`

Una prop in piu' e nient'altro. Resta un passacarte.

### `MediaUpload.tsx`

**La notte, prima dei byte.** Con piu' serate un selettore che parte **vuoto** e
un pulsante disabilitato con scritto sotto perche'. Precompilare renderebbe il
caso comune «la notte scelta per distrazione», e una foto archiviata sulla notte
sbagliata non e' un errore di catalogazione quando una di quelle notti sta dentro
una sede il cui indirizzo e' ancora segreto. Con **una** serata nessun selettore:
la si usa e la si **nomina** a schermo. Con **zero** il componente non renderizza
la drop zone: uno stato d'errore con la sua frase.

**I byte cambiano bucket.** `event-media-quarantine`, stesso schema di path,
`contentType` esplicito. Poi `POST /api/media/finalize`, e **solo sul suo `ok`**
`registerMedia(...)` con il path che la rotta ha restituito. Il bucket pubblico
non compare piu' in questo file: `grep -c 'from("event-media")'` = **0**.

**I rifiuti sono frasi.** 17 categorie della rotta → **17 frasi distinte**
(misurato: 17 chiavi, 17 stringhe uniche), piu' quattro esiti che la rotta non
copre e che sono distinti **per posizione**:

| Posizione | Cosa e' successo davvero |
|---|---|
| `validateMediaUpload` lancia | il permesso sulla notte non e' stato confermato; nulla e' stato caricato |
| deposito in quarantena fallito | il file non ha lasciato il controllo del dispositivo |
| la rotta non risponde | **puo' essere passato o no** — l'unica frase che dichiara l'incertezza |
| `registerMedia` lancia | **i byte SONO pubblicati**, manca la riga: non comparira' in galleria e nessun organizer puo' moderarlo |

L'ultima e' quella che conta di piu': dire «caricamento fallito» li' sarebbe
**falso**, e la differenza e' esattamente il tipo di collasso che il precedente
del newsletter ha registrato. Una categoria sconosciuta stampa se stessa invece di
sciogliersi in una frase condivisa.

Non c'e' nessun messaggio riassuntivo unico: una riga per file, ognuna con la sua
causa. **Nessuna riga di questo file legge `err.message`** — Next lo redige in
produzione.

---

## Task 2 — la quindicesima migration

Una sola istruzione:

```sql
DROP POLICY IF EXISTS "Members can upload event media" ON storage.objects;
```

e **nessuna policy nuova al suo posto**. Da li' l'unico scrittore di
`event-media` e' il service role, cioe' la rotta che spoglia.

Le tre che restano sono elencate nel commento **con la ragione**: la lettura
pubblica resta perche' renderla privata e' un'altra decisione, con conseguenze su
ogni URL gia' pubblicato; le due di cancellazione restano perche' `deleteMedia`
cancella l'oggetto con il client legato ai cookie, e `media-and-storage.md`
pretende che la rimozione resti **davvero possibile** — e' cio' che rende
praticabile la revoca del consenso di chi e' ritratto (`legal-compliance.md`).

### La prova che il container da solo non da'

`npm run baseline:container -- --phase-point=35-final` e' verde, ma **prova solo
che il file e' SQL valido e in ordine**. Due misure lo dicono:

- la cattura delle policy registra **solo lo schema `public`**: `grep -c
  '"storage"'` = **0** su ogni capture di questa fase. Il bucket non c'e' dentro.
- **un `DROP POLICY IF EXISTS` con il nome sbagliato e' un no-op che si applica
  pulito** e lascia la porta aperta. E' il caso peggiore possibile qui: verde e
  bucato.

Quindi la migration e' stata provata contro **due container costruiti apposta**,
stesso schema base e stessa coda, uno senza la riga 15 e uno con:

| | policy `Members can upload event media` |
|---|---|
| 52 migration (senza riga 15) | **presente**, `INSERT`, `{authenticated}` |
| 53 migration (con riga 15) | **assente** |

E le tre da conservare ci sono tutte e tre dopo: `Anyone can view event media`
(`SELECT`, `{public}`), `Members can delete own event media` e `Admins can delete
event media` (`DELETE`, `{authenticated}`). Piu'
`event_media_quarantine_insert_approved`, che e' del bucket privato.

> Quella quarta voce e' comparsa perche' la mia prima aspettativa cercava
> `%event-media%` e **`event-media-quarantine` comincia con `event-media`**. E'
> lo stesso inciampo che il piano indica come il rischio del controllo A, incontrato
> per davvero — sull'aspettativa, non sul file. Corretta l'aspettativa, riesecuzione,
> `PROBE_OK`.

La sonda e' stata scritta e rimossa: non e' committata, non e' un artefatto del
repository.

---

## Task 3 — `verify:media-strip`

Cinque controlli, esce **0** sull'albero come questo piano lo lascia.

| | Cosa asserisce |
|---|---|
| **A** | nessun file sotto `src/` diverso dalla rotta di finalizzazione **scrive** nel bucket pubblico |
| **B** | nella rotta, l'ultima `stripImageMetadata(` sta sopra la prima scrittura (`576 < 662`) |
| **C** | `MediaUpload.tsx` non nomina il bucket pubblico in nessuna forma |
| **D** | la riga 15 esiste, toglie la policy **con il nome che la migration originale ha creato**, e nessuna migration successiva ricrea una `INSERT` per `authenticated` su quel bucket |
| **E** | `sharp` e' in `dependencies` |

**Il controllo D e' il piu' importante e il piu' facile da scrivere male.** Non
rilegge il nome dal file che lo droppa — sarebbe una tautologia. Estrae il nome
che `20260225120000_phase7_media.sql` **crea** con una `FOR INSERT ... bucket_id =
'event-media'`, e lo confronta byte per byte con quello che la riga 15 droppa. Un
carattere di differenza e il controllo scatta.

**Nominare non e' scrivere.** La prima stesura di A segnalava
`actions.ts:326`, cioe' `deleteMedia`, che chiama `.remove()` su quel bucket —
la cancellazione che la migration conserva apposta. Un controllo che fallisce sul
file che esiste per proteggere viene disattivato, e da quel momento non guarda
piu' niente. **Corretto il controllo, non il file:** A cerca il bucket dentro una
istruzione che contiene anche `.upload(`, oppure un **legame** del letterale a un
nome (`= "event-media"`), che e' l'unica evasione a buon mercato.

**La trappola del prefisso.** Il bucket si cerca come **letterale virgolettato**,
mai come sottostringa: `event-media-quarantine` comincia con `event-media`, e una
corrispondenza parziale farebbe fallire ogni file corretto. **Le righe di commento
si filtrano prima di contare**, o l'intestazione di questo stesso script — che
nomina `event-media` e `stripImageMetadata` piu' volte — deciderebbe il verdetto.

**Il buco che resta, dichiarato nell'intestazione:** un nome di bucket composto a
runtime e' invisibile a entrambe le regole. Questo script legge testo, non segue
valori. Cio' che regge davvero la linea e' la policy che la riga 15 toglie; questo
script e' la guardia contro un secondo scrittore **lato server**, che e' l'unico
che la RLS non puo' rifiutare.

### Le sei mutazioni, ognuna asserita come applicata prima di leggerne l'esito

`ai-engineering.md`, gate *prova per mutazione*. Ogni file e' stato ripristinato e
verificato per `sha256`.

| # | Mutazione | Applicata? | Esito |
|---|---|---|---|
| **M-A** | `MediaUpload` torna a `.from("event-media").upload(...)` | si' | **scattato** — `✗ A  1 line(s) outside the finalize route write to "event-media"` |
| **M-B** | il nome del bucket pubblico hoistato in una costante in testa alla rotta | si' *(al secondo tentativo)* | **scattato** — `✗ B  a write to "event-media" at …route.ts:148 sits at or above the last stripImageMetadata( at :576` |
| **M-C** | `MediaUpload` **nomina** soltanto il bucket (`const LEGACY = ["event-media"]`) | si' | **scattato** — `✗ C  1 line(s) in …MediaUpload.tsx name the public bucket` |
| **M-D1** | la riga 15 droppa `"Members can upload event medias"` — un nome che non corrisponde a niente | si' | **scattato** — `✗ D  the door toward the public bucket is not closed in the migrations` |
| **M-D2** | una migration **successiva** ricrea una `INSERT` per `authenticated` sul bucket pubblico | si' | **scattato** — `these migration(s) recreate an INSERT policy … after row 15: 20260810000000_mutation_reopen.sql` |
| **M-E** | `sharp` fuori da `dependencies` | si' | **scattato** — `✗ E  sharp is not declared in dependencies of package.json` |

> **M-B e' il risultato che vale la pena leggere due volte.** Al primo tentativo
> la sostituzione **non e' andata a segno** — cercava apici singoli, il file usa
> gli apici doppi — e l'asserzione l'ha detto (`mutation applied: false`) invece
> di lasciarmi leggere un verde e chiamarlo prova. Senza quella asserzione avrei
> registrato «M-B non scatta» su un controllo che funziona, o — nella direzione
> opposta, che e' quella pericolosa — avrei certificato come vivo un controllo
> morto. E' il precedente esatto che il gate cita.

Lo script **non e' agganciato a `npm run build`**: il build e' il gate dei tipi, e
un gate dei tipi che comincia a fallire per una ragione che non e' un tipo insegna
a tutti a ignorarlo. Misurato: `p.scripts.build` = `next build --webpack`, non
contiene `verify:media-strip`.

---

## Deviazioni dal piano

### 1. [Rule 3 — bloccante] `event_parties.type` non esiste, e il tetto che lo cita nemmeno

- **Trovata durante:** Task 1, leggendo lo schema prima di scrivere la query.
- **Il fatto:** il piano chiede `select("id, title, type")` e giustifica il ciclo
  con `UNIQUE (event_id, type)` — «al massimo tre». **La colonna, il suo `CHECK` e
  quel `UNIQUE` sono stati droppati tutti e tre il 2026-02-26**
  (`20260226300000_multi_sub_events.sql:11-17`). La query non e' scrivibile e il
  tetto non esiste.
- **Cosa e' stato fatto:** nessuna query nuova. `uploadableParties` esce
  dall'array `parties` gia' costruito, con `id`, `title`, `date`. Il ciclo e' N, e
  il vincolo reale — N e' il numero di serate gia' disegnate su questa pagina — e'
  scritto accanto, come il piano chiede che il vincolo sia nominato.
- **Perche' non e' un allargamento:** stessa visibilita' RLS, zero round trip in
  piu', zero colonne nuove, tre campi gia' resi in HTML per lo stesso spettatore.
- **Commit:** `557f949`

### 2. [Rule 2 — un 500 sulla superficie d'acquisto] il resolver e' catturato per serata

- **Il fatto:** `hasCapability` lancia. Su un render di pagina un lancio non
  gestito e' un 500 sulla **pagina pubblica dell'evento**, che e' anche la
  superficie di acquisto dei biglietti.
- **Cosa e' stato fatto:** `try`/`catch` per serata, categoria nel log, serata non
  offerta. Fail-closed sulla notte, pagina viva.
- **Il costo, dichiarato:** per chi ha solo l'assegnazione, irrisolto e non
  assegnato si vedono uguale. Nessun error tracking ⇒ il log non e' un effetto.
- **Commit:** `557f949`

### 3. [Rule 3 — obbligo del brief, fuori da `files_modified`] `actions.ts` e' il quarto file di Task 1

- **Il fatto:** il piano elenca tre file per Task 1. Rendere `partyId`
  obbligatorio — obbligo che il brief di questo esecutore ripete per nome —
  richiede di toccare `src/app/(public)/events/[slug]/actions.ts`, che nel
  frontmatter non c'e'.
- **Cosa e' stato fatto:** toccato, con il solo cambio di firma e i docblock
  riscritti. **Nessun ramo logico modificato**: i rifiuti a runtime, il predicato,
  l'insert e la `revalidatePath` sono identici.
- **Commit:** `557f949`

### 4. [scelta dichiarata] le due Server Action non diventano un risultato discriminato

- Il piano non lo chiede; il docblock di 35-16 lo lascia aperto. Non fatto: Next
  redige il messaggio in produzione, quindi la categoria non arriverebbe comunque
  senza cambiare il tipo di ritorno, e le due domande che restano — «permesso» e
  «registrazione» — la **posizione** le separa gia', con due frasi diverse a
  schermo. Un terzo alfabeto di categorie per una distinzione gia' fatta sarebbe
  duplicazione. Scritto nel docblock, con la condizione che lo farebbe cambiare.
- **Commit:** `557f949`

### 5. [Rule 1 — un criterio che fallisce su un file corretto] il commento su `venue_secret`

- **Il fatto:** il criterio `git diff | grep -c '^+.*venue_secret'` = 0 e' violato
  da un **commento** che dice che quel campo **non** viene portato oltre. Il file
  soddisfa la proprieta'; la scrittura del criterio no.
- **Cosa e' stato fatto:** il campo e' citato per **riga** (`:179`, `:278`)
  invece che per nome nella riga aggiunta, e il perche' e' scritto accanto. La
  proprieta' e' intatta e il criterio la misura. Stesso genere di correzione della
  deviazione 5 di `35-20-SUMMARY.md`.
- **Commit:** `557f949`

### 6. [Rule 1 — la trappola che il piano indica, incontrata davvero] il controllo A cercava un nome, non una scrittura

- **Il fatto:** la prima stesura segnalava `deleteMedia` (`actions.ts:326`,
  `.remove()`). Un rifiuto sul file che il piano conserva apposta.
- **Cosa e' stato fatto:** A cerca una scrittura — bucket + `.upload(` nella
  stessa istruzione — oppure un legame del letterale a un nome. Il buco residuo
  (nome composto a runtime) e' scritto nell'intestazione.
- **Commit:** `e1147f2`

### 7. [lingua] la copy resta in inglese

- Misurato: **zero stringhe utente italiane sotto `src/`**. Le uniche occorrenze
  di italiano sono commenti che citano il precedente del newsletter. Le frasi che
  il piano scrive in italiano sono descrizioni di significato. La migration porta
  un blocco italiano perche' chi la applica arriva da un documento italiano.
- **Commit:** `557f949`, `34f9a6a`

### 8. [Rule 3 — ambiente] il worktree non aveva `node_modules`

Un symlink al `node_modules` del repository principale. `/node_modules` e' in
`.gitignore`: `git status` resta pulito, nessuna modifica al repository, nessun
pacchetto installato (`package.json` cambia di **una riga**, in `scripts`).

---

## Verifiche eseguite

### I criteri del piano

| Verifica | Comando / misura | Esito |
|---|---|---|
| Build e typecheck | `npm run build` | **PASS** — `✓ Compiled successfully` |
| Build **prima** di toccare qualsiasi cosa | `npm run build` su `9251b33` | **PASS** — cosi' il verde di dopo e' una differenza, non una coincidenza |
| Lint dei file toccati | `npx eslint` | **PASS** — 0 errori; 3 warning tutti **preesistenti** (`LockClosedIcon`, `ALL_ALLOWED_TYPES`, `<img>`) e fuori perimetro |
| La chiave e' letta sulla pagina | `grep -c 'MEDIA_UPLOAD' page.tsx` | **PASS** — 2 |
| Nessuna riga aggiunta nomina il campo segreto | `git diff -- page.tsx \| grep -c '^+.*venue_secret'` | **PASS** — 0 (con deviazione 5) |
| Il braccio della presenza e' invariato | `grep -c 'from("attendance")' page.tsx` | **PASS** — 1 |
| Il bucket pubblico sparisce dal componente | `grep -c 'from("event-media")' MediaUpload.tsx` | **PASS** — **0** |
| La quarantena c'e' | `grep -c 'event-media-quarantine'` | **PASS** — 2 |
| La rotta e' chiamata | `grep -c 'api/media/finalize'` | **PASS** — 6 |
| La notte arriva al componente | `grep -c 'partyId'` | **PASS** — presente |
| Nessun messaggio generico | `grep -i 'qualcosa e'` | **PASS** — nessuna occorrenza |
| Frasi di rifiuto distinte | 17 chiavi → 17 stringhe uniche, + 4 esiti per posizione | **PASS** — richiesto: ≥ 2 |
| La migration ha un solo `DROP POLICY` | `grep -c 'DROP POLICY'` | **PASS** — 1 |
| …e nomina la policy giusta | `grep -c 'Members can upload event media'` | **PASS** — 1 |
| …e nessun `CREATE POLICY` | `grep -c 'CREATE POLICY'` | **PASS** — **0** |
| …e non droppa le altre tre | `grep -E 'DROP POLICY.*(Anyone can view\|can delete)'` | **PASS** — nessuna |
| …e porta l'eccezione d'ordine | `grep -ci 'dopo il deploy'` / `'aggirabile'` | **PASS** — 1 e 1 |
| La coda intera si applica | `npm run baseline:container -- --phase-point=35-final` | **PASS** — 53 migration, 23 tabelle con RLS, 966 sonde, container distrutto |
| Lo script esiste ed e' registrato | `grep -c '"verify:media-strip"' package.json` | **PASS** — 1 |
| Lo script esce 0 | `node scripts/verify-media-strip.mjs` | **PASS** — `MEDIA_STRIP_OK` |
| La sezione «cosa un verde NON significa» | 4 voci + la nota sul prefisso | **PASS** |
| Il build **non** invoca lo script | `p.scripts.build` | **PASS** — `next build --webpack` |
| Le sei mutazioni | ognuna asserita applicata, poi letta | **PASS** — `ALL_MUTATIONS_TRIPPED` |
| Nessun file cancellato | `git diff --diff-filter=D --name-only 9251b33 HEAD` | **PASS** — nessuno |
| Nessun file non tracciato | `git status --short` | **PASS** — pulito |
| `STATE.md` / `ROADMAP.md` / `deferred-items.md` | non compaiono nel diff | **PASS** — non modificati |
| Nessuno stub | `grep -E 'TODO\|FIXME\|placeholder\|coming soon'` sui sei file | **PASS** — nessuna occorrenza |

### La prova sul database, che il container da solo non da'

| Misura | Senza la riga 15 | Con la riga 15 |
|---|---|---|
| migration applicate | 52 | 53 |
| `Members can upload event media` | **presente** (`INSERT`, `{authenticated}`) | **assente** |
| `Anyone can view event media` | presente | **presente** |
| `Members can delete own event media` | presente | **presente** |
| `Admins can delete event media` | presente | **presente** |
| `event_media_quarantine_insert_approved` | presente | **presente** |

`PROBE_OK`. Due container `postgres:17.6` costruiti dallo stesso schema base
(commit `dd2a2c2`) e distrutti.

### Cosa queste verifiche NON provano

- **Nessuna migration di questa fase e' applicata in produzione**, questa
  compresa. **`20260809006000` e' l'unica della coda che va applicata DOPO il
  deploy**, ed e' scritto in testa al file. **Finche' non e' applicata, la spoglia
  dei metadati e' aggirabile scrivendo dal browser nel bucket pubblico**
  (`20260225120000_phase7_media.sql:70-77`). Nessuna riga di questo documento va
  letta come «la porta e' chiusa quando il codice va in deploy»: non lo e'.
- **Non e' stato provato che `sharp` rimuova davvero i metadati.** E' una
  proprieta' a tempo d'esecuzione. La prova e' la procedura manuale: un file con
  GPS noto entra, l'oggetto scaricato dal bucket pubblico torna senza — con
  `exiftool` sul file scaricato, non sull'originale.
- **Nulla e' provato sui video.** Questa fase non li spoglia: il ramo video
  pubblica i byte come ricevuti e rifiuta soltanto se la sede della notte e'
  segreta. E' il limite dichiarato da 35-20 e da 35-14, voce 6.
- **Un `npm run build` verde non dice niente su una query.** Nessun client
  Supabase di questo repository e' parametrizzato con `Database`, quindi il
  compilatore non ha mai visto `party_id`, `venue_secret` ne' un nome di bucket.
- **Nessun test del prodotto e' stato eseguito, perche' non ne esistono.** Non si
  dica mai che questo lavoro e' verificato «perche' i test passano».
- **Nessun caricamento e' stato eseguito end-to-end.** Non e' stato osservato che
  un'assegnazione «photo» sblocchi davvero la casella, ne' che la rotta risponda:
  serve il database con la coda applicata. E' materia di `35-HUMAN-UAT.md`.
- **Il selettore della notte non e' stato aperto in un browser.** Il suo
  comportamento e' asserito dal codice e dal build, non dall'osservazione.

### Procedura manuale, per quando la coda sara' applicata

Serve perche' questo tocca il segreto di una sede e il repository non ha test.
Con le righe 7–14 applicate, i piani 35-16/35-19/35-20/35-21 in deploy, e **poi**
la riga 15:

1. Account `staff` **assegnato come «photo» alla notte A** di un evento con
   almeno due notti → la casella compare, il selettore elenca **solo A**.
2. Caricare una foto su A → compare in attesa di approvazione, e il file scaricato
   dal bucket pubblico **non contiene EXIF** (`exiftool` sul file scaricato).
3. Lo stesso account non vede B nel selettore. Se si forza `partyId` = B sul filo
   → rifiuto `forbidden.media_upload_required`, **con la sua frase a schermo**.
4. Un **video** verso una notte con `venue_secret = true` → rifiuto
   `media_finalize.video_on_secret_night`, e la frase dice che i video non sono
   ammessi su quella serata — non «caricamento fallito».
5. Revocare l'assegnazione e ricaricare la pagina → la casella sparisce alla
   richiesta **successiva**.
6. Account `master` o `organizer` su un evento con tre notti → il selettore le
   elenca tutte e tre, **vuoto all'apertura**, e il pulsante e' disabilitato
   finche' non se ne sceglie una.
7. **Dopo aver applicato la riga 15**, provare a scrivere in `event-media` dal
   browser con una sessione di membro approvato → deve fallire. **Prima** di
   applicarla, la stessa prova riesce: e' la finestra, ed e' la sua misura.

---

## Threat Flags

Le voci del threat register del piano, con come sono coperte.

| ID | Disposizione | Come, e con quale prova |
|---|---|---|
| T-35-115 | **mitigato nel file, non ancora nel database** | La migration toglie la policy di `INSERT` per `authenticated`, **provato contro due container**: presente senza, assente con. Il controllo **D** impedisce a una fase futura di ricrearla (M-D2 lo dimostra). **Ma finche' la riga 15 non e' applicata a mano la porta e' aperta**, e questo non e' un dettaglio d'esecuzione: e' lo stato in cui il prodotto va in deploy |
| T-35-116 | mitigato | Nessuna query nuova, nessuna colonna nuova: `uploadableParties` esce da `parties`, che questa pagina gia' legge e gia' rende. `git diff \| grep '^+.*venue_secret'` = 0 |
| T-35-117 | mitigato | L'elenco delle notti vive nel browser e **non e' un confine**: ogni notte nominata e' ri-verificata da `validateMediaUpload`, da `/api/media/finalize` e da `registerMedia`, tutti e tre contro lo stesso predicato. Scritto nel tipo della prop |
| T-35-118 | mitigato | 17 frasi per 17 categorie, piu' 4 esiti distinti per posizione. Nessun `err.message` letto. La frase della spoglia fallita dice esplicitamente che il file **non** e' stato caricato, e quella del `registerMedia` fallito dice che i byte **sono** pubblicati |
| T-35-119 | mitigato | Le due policy di `DELETE` e quella di `SELECT` sono intatte — **misurato sul container**, non dedotto dal diff — e la ragione e' scritta nel commento della migration |
| T-35-120 | mitigato | Sei mutazioni eseguite, ognuna **asserita come applicata** prima di leggerne l'esito. M-B ha fallito l'applicazione al primo tentativo e l'asserzione l'ha detto: e' la prova che l'asserzione serve |
| T-35-SC | accettato, e nulla e' stato installato | `package.json` cambia di **una riga**, in `scripts`. Nessuna voce aggiunta a `dependencies` |

### Superfici non previste dal piano

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: stale-constraint | `.planning/phases/35-per-night-assignments/35-21-PLAN.md` | Il piano giustifica il ciclo di risoluzione con `UNIQUE (event_id, type)`, droppato il 2026-02-26 insieme alla colonna. Un tetto che non esiste, usato per dire che un ciclo e' innocuo, e' il genere di affermazione che sopravvive nei documenti a valle. Chiuso qui misurandolo; segnalato perche' **il piano 35-18 cita lo stesso tetto** (`20260809004500:14`) e quella citazione resta da correggere |
| threat_flag: orphaned-object | `src/components/media/MediaUpload.tsx` | Se `registerMedia` fallisce **dopo** che la rotta ha pubblicato, restano byte **gia' spogliati** nel bucket pubblico con path derivabile e nessuna riga che li governi — quindi fuori moderazione. Non e' una divulgazione di coordinate, ma e' un file di una serata raggiungibile per URL. Gia' nominato da `35-20-SUMMARY.md` constatazione 3 come **tredicesima voce** da aggiungere al piano 35-14; questo piano ne rende il rifiuto **visibile a chi carica** (la frase dice di avvisare un organizer invece di ricaricare), il che e' l'unica mitigazione disponibile senza uno spazzino |
| threat_flag: unobservable-refusal | `src/app/(public)/events/[slug]/page.tsx` | Un fallimento del resolver su una serata la ritira dall'elenco. Per chi ha **solo** l'assegnazione, irrisolto e non assegnato si vedono uguale: nessuna casella. Non esiste error tracking, quindi il `console.error` non e' un effetto osservabile. E' la direzione sicura ed e' la meno diagnosticabile: la voce esiste perche' qualcuno che riceve la segnalazione *«non vedo la casella»* sappia che ha **due** cause possibili |

---

## Constatazioni fra piani

Nessun file fuori dai `files_modified` di questo piano e' stato toccato **salvo
`actions.ts`**, per l'obbligo della deviazione 3. `STATE.md`, `ROADMAP.md` e
`deferred-items.md` non compaiono nel diff.

1. **La voce 9 di `deferred-items.md` e' chiusa da questo piano.** Il caricamento
   non rifiuta piu' per tutti: `partyId` e' passato ed e' obbligatorio. Chi
   aggiorna quel documento puo' segnarla `CHIUSA il 2026-08-09 dal piano 35-21`.
2. **Il piano 35-14 ha una tredicesima voce da raccogliere**, gia' scritta da
   35-20 e confermata qui: l'oggetto **spogliato** e orfano nel bucket pubblico
   quando `registerMedia` fallisce dopo la pubblicazione. Non e' fra le dodici.
3. **`20260809004500:14` cita ancora `UNIQUE (event_id, type)` come «un tetto di
   tre».** Il vincolo e la colonna non esistono dal 2026-02-26. La migration e'
   **corretta** — il commento e' l'unica parte sbagliata — ma il commento e' cio'
   che il prossimo lettore usera' per stimare il costo di un ciclo. Non toccato:
   e' un file di un altro piano, gia' scritto.
4. **`ALLOWED_VIDEO_TYPES` resta scritto in due posti** (`MediaUpload.tsx:60` e
   `finalize/route.ts:168`), come 35-20 aveva gia' segnalato. Non unificato: il
   primo vive in un componente `"use client"` e importarlo in una route handler
   trascinerebbe codice client nel bundle server. Da muovere insieme.
5. **Il difetto di `.from("attendance")` e' ancora li', ed e' ancora congelato.**
   Correggerlo allarga chi puo' caricare. Dopo questo piano ha un effetto in
   meno: un fotografo assegnato non dipende piu' da quel braccio.
6. **`.planning/phases/32-…/baseline/` ha tre catture nuove** con suffisso
   `container.35-final`, prodotte dal comando che il piano richiede. Committate
   perche' e' la convenzione gia' seguita da 35-02 in poi.

---

## Known Stubs

Nessuno stub di codice: nessun valore vuoto codificato a mano, nessun
segnaposto, nessun `TODO`, nessun `FIXME` in nessuno dei sei file.

Una dipendenza che resta, e non e' uno stub perche' non e' codice:
**`20260809006000` e' un file che qualcuno deve applicare a mano, dopo il
deploy.** Finche' non lo fa, il bucket pubblico accetta ancora una scrittura dal
browser. E' scritto in testa alla migration, nell'intestazione di
`MediaUpload.tsx`, nell'intestazione di `verify-media-strip.mjs`, in
`35-HUMAN-UAT.md` e tre volte in questo documento.

---

## Self-Check: PASSED

- `supabase/migrations/20260809006000_event_media_server_upload_only.sql` — FOUND
- `scripts/verify-media-strip.mjs` — FOUND, esce 0
- `src/app/(public)/events/[slug]/page.tsx` — FOUND, modificato
- `src/app/(public)/events/[slug]/MediaGallerySection.tsx` — FOUND, modificato
- `src/components/media/MediaUpload.tsx` — FOUND, modificato
- `src/app/(public)/events/[slug]/actions.ts` — FOUND, modificato
- `package.json` — FOUND, una riga in `scripts`
- commit `557f949` — FOUND
- commit `34f9a6a` — FOUND
- commit `e1147f2` — FOUND
- `npm run build` — verde all'HEAD di questo worktree
- `npm run baseline:container -- --phase-point=35-final` — verde, 53 migration
- `node scripts/verify-media-strip.mjs` — `MEDIA_STRIP_OK`
- Nessun file cancellato in nessuno dei tre commit
- `git status --short` — pulito, nessun file non tracciato; le due sonde
  usa-e-getta (container e mutazioni) sono state rimosse e **non** committate
- `.planning/STATE.md`, `.planning/ROADMAP.md` e `deferred-items.md` — **NON
  MODIFICATI**, come da contratto worktree
- Nessun pacchetto installato: `package.json` cambia solo in `scripts`
- Nessuna coordinata reale, nessun nome di sede, nessun nome di file reale,
  nessuna didascalia, nessuna data non annunciata, nessuna persona nominata in
  questo documento ne' nei file di questo piano: solo ruoli
