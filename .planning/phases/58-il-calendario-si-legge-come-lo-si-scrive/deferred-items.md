# Fase 58 — voci differite

Cose trovate durante l'esecuzione, **fuori dal perimetro del piano che le ha
trovate**, e non riparate. Ognuna porta chi l'ha vista e quando.

---

## 1. Le regole di pipeline: sedici nel file, quattordici nella tabella

- **Trovata:** piano 58-06, task 3, 2026-08-20, leggendo il catalogo vivo con
  `read_only: true`
- **Il fatto:** `public.production_pipeline_rule` contiene **14 righe**. Il
  controllo **D** di `verify-ics-import.mjs` riporta *«16 rules read from the
  migration»* — e le legge dal **file** della migration, mai dal database. I due
  numeri non sono mai stati confrontati da nessun controllo.
- **Perche' potrebbe non essere niente:** il seed puo' essere condizionato a
  format o serie che non esistono tutti in produzione, e due righe in meno
  sarebbero allora la conseguenza corretta di quel filtro, non una perdita.
- **Perche' potrebbe essere qualcosa:** se due regole mancano davvero, i pezzi di
  quei tipi non hanno un'ancora contro cui essere misurati — e l'assenza di una
  regola, per dottrina di questo modulo, non e' un errore ma un **orfano
  silenzioso**. Nessun conteggio oggi distingue *«regola assente per decisione»*
  da *«regola assente per riga mancante»*.
- **Non riparata perche':** il piano 58-06 tocca due `CHECK`, non il seed, e la
  regola di perimetro vieta di riparare cio' che non si e' rotto qui. Una riga
  inserita a mano in produzione sarebbe anche uno stato che nessuna migration
  ricostruisce.
- **Come si chiude:** confrontare, riga per riga, cio' che il seed inserisce con
  cio' che la tabella tiene, e poi decidere se la differenza e' una decisione o
  una perdita. Se e' una perdita, si corregge **in avanti**, con una migration.

---

## 2. `information_schema.table_constraints` e' vuota per il ruolo della Management API

- **Trovata:** piano 58-06, task 3, 2026-08-20
- **Il fatto:** la stessa interrogazione che restituisce dodici vincoli da
  `pg_constraint` restituisce **zero righe** da
  `information_schema.table_constraints`. Quella vista filtra per privilegio, e
  il ruolo con cui l'endpoint esegue non li ha.
- **Perche' conta:** un controllo scritto su `information_schema` da qui
  passerebbe **sempre**, misurando il vuoto. E' un falso verde per costruzione,
  ed e' esattamente la forma di rifiuto che questo progetto pretende sia
  distinguibile da un passaggio.
- **Non riparata perche':** nessuno script del repo interroga oggi quella vista;
  il piano 58-06 l'ha solo tentata e ha usato `pg_constraint` al suo posto.
- **Come si chiude:** se un controllo futuro avra' bisogno dei vincoli dal
  catalogo, usare `pg_constraint` — ed e' anche la fonte da cui `M4` aveva letto
  i dodici nomi.

---

## 3. `P-58-C` passo 5 non ha ancora uno strumento: il ripristino DALL'ISTANTANEA — **COSTRUITA il 2026-08-22, NON ESERCITATA**

- **Trovata:** piano 58-09, task 2, 2026-08-20
- **Il fatto:** il piano 58-09 costruisce due cose che sembrano la stessa e non
  lo sono. **(a)** L'istantanea su disco, scritta prima della cancellazione,
  nella directory ignorata. **(b)** Il riaggancio dentro la corsa, che rimette
  spunte e legami **letti dal database prima di cancellare** e tenuti in memoria.
- **Perche' conta:** `P-58-C` esiste per la corsa che **muore a meta'**. In quel
  caso la memoria del processo e' andata, e le righe non ci sono piu': una
  seconda corsa riscrive il contenuto del file — che e' il passo 4 della
  procedura, e funziona — ma le sue liste di riaggancio sono **vuote**, perche'
  legge un calendario appena svuotato. Il passo 5 dice *«ripristinare spunte e
  legami dall'istantanea del passo 3, con il percorso di ripristino dedicato»*, e
  **quel percorso oggi non esiste**: nessun argomento dell'importatore legge un
  file di istantanea.
- **Quanto e' grave oggi:** misurato il 2026-08-20 il caso e' vuoto — **0 spunte
  e 0 legami** in produzione — quindi un rientro non perderebbe niente. Diventa
  grave alla prima spunta.
- **Non riparata perche':** il piano 58-09 elenca tre file e nessun argomento di
  ripristino; costruirlo qui sarebbe uno strumento che **scrive in produzione**
  aggiunto senza che nessun piano lo abbia dichiarato — ed e' esattamente il tipo
  di percorso che questa fase pretende sia deciso prima di esistere.
- **Come si chiude:** un argomento esplicito che legge un'istantanea per
  percorso, ne verifica l'ora contro la corsa interrotta, e riscrive **solo** le
  due eccezioni di stato conservando `ticked_by` e `ticked_at` originali — mai
  da `record_checklist_tick`. Va dichiarato in 58-11 o 58-12, insieme alla
  decisione se `P-58-C` puo' chiudersi senza di esso.

### ⇢ Decisione presa il 2026-08-20, nella seduta del piano 58-11

**`P-58-C` chiude SENZA lo strumento di ripristino dall'istantanea.** Decisione
del proprietario, con il caso misurato davanti: **0 spunte e 0 legami**, quindi
un rientro eseguito oggi non perderebbe nulla e il passo 5 non avrebbe niente da
rimettere.

**Il limite e' dichiarato, non chiuso.** E il momento in cui lo strumento diventa
necessario **non e' la prima corsa del cron**: e' **la prima spunta o il primo
legame**. Da li' in avanti una corsa morta a meta' perde una riga che esiste
**solo** nel database — non nel file, non nell'istantanea leggibile da nessun
argomento — con la cascata su `production_checklist_item` e senza PITR.

**Assegnato al piano 58-12**, e sono due cose, non una:
1. lo strumento del passo 5 — l'argomento che legge un'istantanea per percorso,
   ne verifica l'ora contro la corsa interrotta, e riscrive **solo** le due
   eccezioni di stato conservando `ticked_by` e `ticked_at`;
2. **la guardia che rifiuta la corsa non presidiata** quando spunte o legami
   sono `> 0` e lo strumento del punto 1 non esiste ancora.

Nessuna delle due si costruisce nel piano 58-11.

### ⇢ Costruita il 2026-08-22, riparazione 58-14 — e cosa NON e' chiuso

**Le due cose assegnate esistono. La terza — che funzionino — no**, ed e' la
distinzione fra un `Result` scritto e un `Result` osservato.

#### 1. Lo strumento del passo 5

`scripts/restore-mirror-snapshot.mjs` (`npm run restore:mirror-snapshot`), e
rispetta il contratto che questa voce aveva scritto in anticipo:

| Cosa chiedeva la voce 3 | Come e' fatto |
|---|---|
| un argomento esplicito che legge un'istantanea **per percorso** | `--from <percorso>`, obbligatorio, nessun default, nessuna ricerca automatica |
| **verifica l'ora** contro la corsa interrotta | l'istante si legge **dentro** l'istantanea, e si confronta con la riga di registro che ha `finished_at` nullo. Il nome del file non conta come ora |
| **solo** le due eccezioni di stato | due `UPDATE` su due colonne. Nessun `INSERT`, e **zero `DELETE` in tutto il processo** |
| `ticked_by` e `ticked_at` originali | scritti dritti sulle colonne, mai attraverso `record_checklist_tick` |
| **per chiave primaria** | ogni scrittura e' `WHERE id = ‹uuid›`. Le condizioni larghe stanno solo dentro **letture**, e servono a risolvere quell'`id` |

**Tre proprieta' che la voce non aveva chiesto e che sono state aggiunte perche'
*un ripristino non e' un atto* le implica:**

1. **Non sovrascrive niente di posteriore allo schianto.** Una casella gia'
   spuntata al momento del rientro non viene toccata — quell'istante e' piu'
   recente dell'istantanea e l'ha prodotto una persona. Un legame gia' posato e
   **diverso** da quello dell'istantanea non viene toccato: e' un ritrovamento,
   e diventa un conteggio.
2. **Il percorso dev'essere ignorato da git**, chiesto a git e non dedotto da
   `.gitignore`. Non protegge il file — quello esiste gia' — ma rifiuta di
   **usare** una copia che sta dove lo scrittore si sarebbe rifiutato di
   scriverla, e un'istantanea in una directory tracciata e' un ritrovamento per
   conto proprio.
3. **Il referto misura se stesso.** In coda gira un controllo che prende ogni
   stringa dell'istantanea e asserisce che nessun suo token compaia in cio' che
   e' uscito. **E' andato rosso alla prima corsa su un'istantanea vera** — 848
   token nell'origine, uno stampato — e la riparazione e' stata **dire meno**,
   mai allargare la regola.

**Non e' un argomento dell'importatore, come questa voce lo aveva scritto**, ed
e' una scelta di dominio:

- l'importatore **rifiuta se non c'e' una sorgente registrata** — e' il terzo
  passo del suo ordine dei rifiuti, con un caso di gate che lo protegge. Un
  rientro deve poter girare **proprio quando la sorgente non risponde**, che e'
  fra le ragioni piu' probabili per cui una corsa e' morta a meta';
- un rientro **non ha niente a che fare con il feed**: dargli un lettore di
  calendari sarebbe un'esposizione in piu' che non serve a niente (difesa 1 di
  D-58-07);
- il processo del rientro **non contiene nessun `DELETE`**. Zero. Condividere un
  processo con un cancellatore e' essere a una distrazione dal cancellare.

**⚠ Una conseguenza che va detta: le istantanee scritte prima del 2026-08-22 non
sono ripristinabili.** Non portano il campo dell'ora, e questo strumento le
**rifiuta** invece di fidarsi del nome del file. Non e' una perdita — quelle sul
disco vengono da corse **arrivate in fondo**, quindi non sono materiale di
rientro — ma e' un limite che si vede solo se scritto.

#### 2. La guardia della corsa non presidiata

`unattendedMirrorGuard` in `src/lib/production/ics/guard.ts`, applicata
nell'importatore **dopo il piano e prima di qualunque scrittura**, nemmeno
l'istantanea. Categoria propria — `unattended_state_at_risk` — e uscita `2`.

**Il meccanismo, e perche' quello.** L'attendibilita' e' **un'evidenza, mai una
dichiarazione**: si legge dal terminale interattivo del processo, che un cron,
una funzione serverless e un lavoro di CI non hanno per costruzione e non possono
procurarsi modificandosi. **Non esiste alcun `--attended`**, perche' e'
esattamente il meccanismo che questa voce vietava — *«un meccanismo che si puo'
passare per abitudine non e' una guardia»*: un argomento che zittisce una
guardia finisce in un alias di shell. `--unattended` esiste e va **nel verso che
restringe soltanto**, quindi digitarlo per abitudine e' innocuo, e serve a chi
vuole esercitare a mano la strada del cron.

Su un giro a vuoto **referta invece di rifiutare**: li' non c'e' niente da
proteggere, e cio' che serve a una persona e' sapere in anticipo cosa
risponderebbe la strada non presidiata.

**Resta armata finche' `MIRROR_RESTORE_PATH_VERIFIED` vale `false`** — e vale
`false`, perche' quel valore non misura *«il codice esiste»* ma *«qualcuno l'ha
visto rimettere una spunta vera»*.

#### 3. La prova, e cio' che NON e' provato

`verify-mirror-guards.mjs` guadagna due famiglie: **U0-U11** sul predicato della
corsa non presidiata, **R5-R14** sui dieci rifiuti del rientro. Provate **per
mutazione quattro volte**, con la mutazione asserita applicata **prima** di
leggerne l'esito:

| mutazione | esito |
|---|---|
| la guardia smette di contare `1` come stato presente | rossi U5, U6, U10, U11 |
| la dichiarazione che restringe diventa una che allarga | rosso U3 |
| il rifiuto sull'ora dell'istantanea disattivato | rosso R12 |
| il rifiuto sul percorso non ignorato disattivato | rosso R7 |

**Due casi sono dichiarati rimandati e non simulati:**

- **R15 — il rientro che rimette DAVVERO una spunta.** Ha bisogno di un database
  davanti, e soprattutto **e' un atto**: scrive righe di produzione e pretende
  un'autorizzazione datata propria, che al 2026-08-22 non esiste. Simularlo
  sarebbe la cosa peggiore che quel gate possa fare — farebbe credere esercitato
  l'unico percorso che sta fra una corsa morta a meta' e la perdita dell'unico
  dato che nessun feed sa ricostruire.
- **R16 — il rifiuto della guardia sull'importatore, da capo a fondo.** Il
  predicato e' misurato; il **cablaggio** no, perche' l'importatore rifiuta prima
  su sorgente e credenziali — che e' esattamente il contratto che il caso R3
  protegge. Serve una sorgente registrata.

**E un limite del cablaggio, scritto qui invece che lasciato da scoprire:**
quando la guardia puo' rispondere, **il feed e' gia' stato letto**. I suoi
conteggi vivono nel database, il client che li legge nasce dopo la lettura della
sorgente. Un rifiuto non scrive niente, ma ha tirato dentro al processo date non
annunciate per una corsa che non scrivera'. Il rimedio e' spostare la lettura del
feed dopo la lettura dello scopo, cioe' riordinare i gate dell'importatore — che
hanno un contratto e un gate propri, e non si riordinano qui.

#### 4. Cosa questo sblocca, e cosa no

- **La voce 13, punto 1 (`RSNT`)** aveva due strade: la guardia, **oppure**
  l'accettazione datata del rischio. La guardia adesso c'e'. **Non basta da
  sola** per una rilettura: quella e' presidiata, quindi la guardia la ammette —
  cio' che la rilettura di `RSNT` chiede resta l'autorizzazione a cancellare e
  riscrivere **con una spunta viva**, ed e' una decisione del proprietario, non
  un effetto di questo codice.
- **`P-58-C` non cambia stato.** I suoi `Result` restano pendenti: lo strumento
  del passo 5 esiste, e un passo con uno strumento resta un passo non eseguito.

**Come si chiude del tutto:** un esercizio datato del rientro, con l'attore e
l'istante originali **riletti dal catalogo** — che e' uno strumento diverso da
quello che ha prodotto l'effetto — e `MIRROR_RESTORE_PATH_VERIFIED` girato a
`true` nello stesso atto, insieme al caso `U11` del gate.

---

## 4. Lo specchio non ha una sorgente registrata: la prima corsa non e' potuta partire — **CHIUSA il 2026-08-20**

- **Trovata:** piano 58-11, task 2, 2026-08-20, lanciando la prova a vuoto
- **Il fatto, alla lettera.** `node scripts/import-production-calendar.mjs
  --dry-run --calendar rsnt` **rifiuta al gate 2**, uscita `2`, categoria
  `missing_feed_source`, e chiude con *NOTHING WAS WRITTEN. The import did not
  happen; this is not an empty plan.* Non esiste alcun referto da leggere per
  intero: la corsa si ferma **prima** di leggere una voce, prima di contare una
  riga e prima di stampare un solo conteggio.
- **Perche'.** Il piano 58-10 ha chiuso `--file` e `--docs-dir` (`ICS-09`) e ha
  reso la variabile `PRODUCTION_CALENDAR_FEED_<CHIAVE>` **l'unica** via per cui
  dei byte raggiungono la corsa: `readFileSync` e' uscito dagli import di
  `node:fs`, e l'unica sorgente e' la lettura remota. Quella variabile **non e'
  registrata**: zero occorrenze nell'ambiente di processo, e il gate 2 non
  guarda `.env.local` per costruzione — deliberatamente, perche' una sorgente
  risolta da un file su disco trasformerebbe un controllo in un sondaggio.
- **Non e' un difetto di 58-10.** E' una **lacuna d'ordine della fase**: l'onda 6
  ha chiuso la strada del file, l'onda 7 doveva percorrere quella nuova, e
  nessuna delle due ha registrato l'indirizzo. Il codice si comporta esattamente
  come dichiarato.
- **Perche' non e' stata aggirata.** Le tre scorciatoie disponibili sono tutte
  vietate, e ognuna da una regola gia' scritta: reintrodurre `--file`
  riaprirebbe la seconda strada che `ICS-09` ha chiuso; puntare la variabile a un
  servizio locale non ha uno schema accettato — la corsa rifiuta tutto cio' che
  non e' `https:` o `webcal:`, e rifiuta `file:` per nome; pubblicare
  l'istantanea a un indirizzo raggiungibile sarebbe **pubblicare il calendario
  di produzione**, con dentro date non annunciate, sedi in trattativa e line-up.
- **Chi puo' chiuderla — e non e' un passaggio tecnico.** Solo il proprietario:
  il calendario va **pubblicato dal suo Mac** e il suo indirizzo registrato nella
  variabile d'ambiente, sulla piattaforma di deploy e nell'ambiente di chi lancia
  la corsa a mano. **La pubblicazione e' essa stessa un atto di dominio**, non
  una configurazione: `D-58-05` punto 1 scrive che un link pubblicato e'
  leggibile da chiunque lo abbia, e che ri-pubblicare invalida il vecchio
  indirizzo ma non lo toglie dagli occhi di chi l'ha gia' visto.
- **Conseguenza a valle, misurata.** Senza il primo specchio, il passaggio una
  tantum sulle righe senza chiave non avviene, quindi la stretta a `NOT NULL`
  del task 3 **non ha la sua precondizione** — vedi il numero nella voce 5.

### ⇢ Chiusa il 2026-08-20: la sorgente e' registrata, e la corsa parte

**Il proprietario ha pubblicato il calendario e registrato gli indirizzi**, fuori
dall'albero del repo, in un file d'ambiente caricato dal profilo della shell.
**Tre chiavi: `rsnt`, `rmdb`, `mtnlb`.** Ne' l'indirizzo ne' il suo host
compaiono qui, nel repo, in un referto o in un log — e' il punto 1 di `D-58-05` e
la difesa 4 di `D-58-07`.

**Una conseguenza operativa va scritta perche' non venga riscoperta ogni volta.**
Il gate 2 legge quella variabile **solo** da `process.env` e mai da `.env.local`,
per costruzione — una sorgente risolta da un file su disco trasformerebbe un
controllo in un sondaggio. Quindi chi lancia la corsa a mano deve **caricare
l'ambiente esplicitamente prima**, e una shell che non l'ha caricato riceve il
rifiuto `missing_feed_source` con uscita `2`, che e' il comportamento corretto e
non un difetto da riparare.

**Cosa la chiusura ha immediatamente prodotto:** il primo lancio contro il
calendario vero ha trovato un difetto che nessun gate sintetico poteva prendere —
vedi la **voce 7**. E' il valore della corsa presidiata, misurato al primo giro.

---

## 5. `P-58-B` passi 21-23 non hanno piu' un veicolo: il file di prova non entra — **CHIUSA PER DECISIONE il 2026-08-20**

- **Trovata:** piano 58-11, task 2, 2026-08-20, leggendo la procedura contro il
  codice invece che contro il piano che l'aveva scritta
- **Il fatto:** `P-58-B` e' stata scritta nell'onda 0, quando l'importatore
  accettava `--file`. Tre dei suoi passi lo pretendono testualmente —
  *«costruire un file di prova identico al file vero tranne una cosa»*, *«lanciare
  l'import con `--apply` su quel file»*: il passo 21 per `ICS-03b`, i passi 22 e
  23 per `ICS-01b`. **Quell'argomento non esiste piu'** dall'onda 6.
- **Perche' conta, e perche' non si chiude registrando l'indirizzo.** Anche il
  giorno in cui la voce 4 sara' chiusa, questi tre passi **restano ineseguibili**
  come scritti: l'unica sorgente e' l'indirizzo remoto, e mutare cio' che quel
  indirizzo serve significa **mutare il calendario di produzione** — cambiare un
  progressivo su una serata vera per vedere se il rifiuto scatta. Il progressivo
  e' la terza guardia monotona del progetto, e la procedura stessa vieta di
  spenderlo.
- **Cosa esiste gia' al loro posto, e cosa non copre.** Il piano 58-09 ha provato
  `ICS-01b` **per mutazione del codice** — uscita `2`, `renumber_refused`, zero
  scritture, e la riautorizzazione scritta nel referto. E' una prova vera, ma e'
  una prova **contro un giro a vuoto**: non dice che il rifiuto arriva **prima**
  della cancellazione in una corsa che avrebbe cancellato davvero, che e'
  esattamente l'osservazione che il passo 22 dichiara *la piu' pesante di tutta
  la procedura*.
- **Non riparata perche':** ridare all'importatore una seconda sorgente e' la
  reversione di una decisione spedita in questa stessa fase, e non si prende
  d'iniziativa dentro il piano che la incontra.
- **Come si chiude — tre strade, e nessuna e' gratis:** (a) una seconda chiave di
  calendario registrata verso un indirizzo di prova, che pero' fa esistere un
  secondo calendario pubblicato; (b) un argomento di sola prova che accetta una
  sorgente locale **e rifiuta `--apply`**, che pero' non eserciterebbe il caso
  che il passo 22 vuole; (c) riscrivere i passi 21-23 di `P-58-B` in una forma
  che il codice di oggi ammetta, dichiarando cosa smettono di provare. **La
  scelta e' del proprietario**, e va fatta prima di dichiarare chiusi `ICS-01b`
  e `ICS-03b` sull'evidenza di una procedura.

### ⇢ Decisione presa il 2026-08-20, nella seduta del piano 58-11

**Strada scelta: (c) — RISCRIVERE i passi 21-23 dichiarando cosa smettono di
provare.** Decisione del proprietario. I passi sono stati riscritti lo stesso
giorno in `58-PROCEDURES.md`, e la dichiarazione sta nel blocco che li precede,
scritto per essere leggibile da chi non conosce questa voce.

**Le altre due sono state scartate, e la ragione dello scarto si scrive perche'
non vengano riproposte come se fossero nuove:**

- **(a) una seconda chiave di calendario verso un indirizzo di prova** —
  scartata: farebbe esistere un **secondo calendario pubblicato**, con la stessa
  esposizione del primo. `D-58-05` punto 1 dice che un link pubblicato e'
  leggibile da chiunque lo abbia, e che ri-pubblicare invalida il vecchio
  indirizzo ma non lo toglie dagli occhi di chi l'ha gia' visto. Un secondo
  indirizzo raddoppia quella superficie per guadagnare una prova.
- **(b) un argomento di sola prova che accetti una sorgente locale e rifiuti
  `--apply`** — scartata: **non eserciterebbe il caso**. Il caso che il passo 22
  chiamava *il piu' pesante di tutta la procedura* e' il rifiuto che arriva
  **prima della cancellazione**, e la cancellazione vive dentro un `--apply`. Un
  argomento che rifiuta `--apply` produce l'ennesimo giro a vuoto, che e'
  esattamente cio' che il piano 58-09 ha gia' fatto.

**Cosa la riscrittura ha prodotto, in una riga per passo:**
- **21** — l'assenza si crea dal lato del **database** (una riga sonda che la
  sorgente non ha mai portato), non dal lato del calendario. `ICS-03b` resta
  esercitabile per intero, e con un'assenza **vera** invece che simulata.
- **22** — non fa piu' scattare il rifiuto; osserva che la guardia gira **dentro
  la corsa che scrive**, su una popolazione contata dal catalogo e dichiarata.
- **23** — non scrive: due giri a vuoto, con e senza l'argomento di
  riautorizzazione, per osservare che l'argomento **non inventa** la traccia di
  una decisione che nessuno ha preso.

**Cosa resta perso, e non e' un dettaglio:** che il rifiuto arrivi **prima**
della cancellazione in una corsa che avrebbe cancellato davvero. Le due
condizioni che lo riaprirebbero sono nominate nel blocco della procedura — la
prima e' **il giorno in cui una rinumerazione la si vuole per davvero**, quando
quell'osservazione sara' disponibile a costo zero e andra' colta.

⚠ **Una conseguenza va portata al proprietario prima che l'autorizzazione sia
spesa:** la riscrittura **cambia cosa `P-58-B` scrive** — il passo 21 ora
inserisce una riga sonda, e il passo 24 la rimuove. L'autorizzazione del
2026-08-20 e' stata data su una descrizione che non la conteneva, e
un'autorizzazione data su una descrizione non copre una descrizione diversa. E'
scritto anche nel preambolo della procedura.

**Questa voce e' chiusa.** Non e' piu' un blocco per la fase: quello che resta
aperto e' la **voce 4**, e non e' questa.

---

## 6. `M1` e' invecchiata di una corsa: i numeri messi davanti all'autorizzazione non sono piu' quelli — **la corsa e' SPIEGATA, la prescrizione resta**

- **Trovata:** piano 58-11, task 2, 2026-08-20, rileggendo il catalogo con
  `read_only: true` alle **18:08:54Z** prima di dichiarare bloccato il task 3
- **Il fatto.** `M1` e' stata letta alle **14:52:43Z** e diceva: 2 piani, **46**
  pezzi, **79** impegni, 14 voci di checklist, **5** corse di import. Il catalogo
  alle 18:08:54Z dice: 2 piani, **63** pezzi, **85** impegni, 14 voci di
  checklist, **6** corse di import.
- **La causa, letta dal registro delle corse invece che dedotta.** Esiste una
  sesta riga in `production_import_run`, **`dry_run = false`**, iniziata alle
  **2026-08-20T15:30:23Z** e finita 11 secondi dopo, con `calendar_key` **nullo**
  — cioe' scritta dal **vecchio riconciliatore**, prima che il piano 58-07
  aggiungesse la colonna di scopo alle 16:00. La riga di pezzo piu' recente in
  produzione porta l'orologio di quella corsa. Fra `M1` e oggi, quindi, **una
  scrittura in produzione e' avvenuta**, e non e' quella di questo piano.
- **Cosa NON e' cambiato, ed e' la meta' che decideva.** Spunte: **0**. Legami:
  **0**. Rimisurati nella stessa lettura delle 18:08:54Z. Il rischio che
  l'autorizzazione pesava — *cosa perde una persona se lo specchio cancella* —
  e' identico a quello che le era stato descritto.
- **Perche' va scritto lo stesso.** L'autorizzazione del 2026-08-20 e' stata
  chiesta *«con davanti i numeri di M1»*, e due di quei numeri erano piu' piccoli
  del vero di 17 pezzi e 6 impegni. **L'autorizzazione non e' stata spesa** —
  nessun `--apply` e' partito, per la voce 4 — quindi la correzione arriva
  **prima** dell'atto e non dopo: i numeri veri si rimettono davanti al
  proprietario quando la voce 4 sara' chiusa.
- **Come si chiude:** rileggere i conteggi dal catalogo **il giorno in cui il
  primo specchio parte davvero**, e non riusare `M1`. Una misura d'apertura vale
  fino alla prima scrittura che non l'ha attraversata.

### ⇢ La corsa e' spiegata — dichiarazione del proprietario, 2026-08-20

**Chi ha scritto quella sesta riga: il proprietario, dal proprio Mac, con il
vecchio importatore, mentre questa fase era in esecuzione.** Dichiarato da lui
nella seduta del piano 58-11.

**Cosa questo chiude.** La domanda *«esiste una scrittura in produzione che
nessuno ha autorizzato?»*. La risposta e' **no**: la corsa ha un autore, un
mezzo e una ragione, ed e' coerente con il fatto letto dal registro — chiave di
calendario nulla, perche' quella colonna non esisteva ancora quando la corsa e'
partita. **Non va indagata oltre.**

**Cosa questo NON chiude, ed e' la meta' che conta.** La prescrizione qui sopra
resta **intera**: i conteggi si rileggono dal catalogo **il giorno in cui lo
specchio parte davvero**, e **`M1` non si riusa**. Una misura d'apertura vale
fino alla prima scrittura che non l'ha attraversata — e non importa se quella
scrittura era legittima: una scrittura autorizzata invecchia una misura
esattamente quanto una che non lo era. I numeri veri si rimettono davanti al
proprietario quando la **voce 4** sara' chiusa, insieme alla conseguenza
registrata nella **voce 5**.
## 7. Il pezzo senza serie rompeva l'indice delle pipeline — **TROVATA E RIPARATA il 2026-08-20**

- **Trovata:** piano 58-11, lanciando la prova a vuoto contro il calendario vero
  subito dopo la chiusura della voce 4
- **Il fatto, alla lettera.** `TypeError: Cannot read properties of null (reading
  'trim')`, da `normaliseSeries` per il tramite di `indexPipelines`, uscita `1`,
  **dopo** che il referto aveva gia' stampato tutto fino ai conteggi di cio' che
  il calendario tiene. Un crash nudo, in coda a un referto che sembrava sano.
- **La causa, letta dal codice e poi confermata per misura.** La lista delle
  sigle si costruiva dall'insieme dei codici di serie di notti **e** pezzi.
  Dall'onda 2 (`ICS-04`/`ICS-05`) un pezzo puo' legittimamente non nominare
  alcuna serie — il titolo nudo, che il riconciliatore aggancia per data nel
  secondo passaggio. Quel nullo entrava nella lista, diventava una
  `SeriesPipeline` senza codice, e moriva sull'indice.
- **La diagnosi, non assunta.** Un contatore temporaneo ha separato le due
  sorgenti prima di riparare: **le notti danno zero nulli**, i pezzi li danno
  quasi tutti — 16 su 17 su una chiave, 8 su 8 su un'altra. Il contatore e' stato
  rimosso.
- **Perche' nessun gate poteva prenderlo, e non e' una scusa.** E' un difetto
  **d'integrazione fra l'onda 2 e l'onda 4**, non un errore di uno dei due piani
  presi da soli: il file sintetico su cui girano i controlli non ha mai portato
  un pezzo senza serie. Serviva un feed vivo — cioe' **esattamente la corsa
  presidiata che l'ordine di questa fase esiste per imporre**, prima che il cron
  la facesse per primo senza nessuno che guardasse.
- **Riparata in due punti che fanno cose diverse**, nello stesso commit:
  **(a)** dove la lista si costruisce, il nullo e' **escluso** — un pezzo senza
  serie non ha una pipeline di serie per definizione, e il riconciliatore gia' lo
  cerca su tutte le pipeline invece che su una; **(b)** dove il crash e'
  avvenuto, `normaliseSeries` **rifiuta con categoria** invece di crollare nudo.
- **Rifiuto in esecuzione e non stretta del tipo — dichiarato, con la ragione.**
  Il tipo diceva **gia'** `string`, e il nullo e' arrivato lo stesso: il
  chiamante che l'ha rotto e' lo script `.mjs`, che nessun compilatore guarda.
  Un tipo piu' stretto sarebbe una promessa che chi rompe non legge. Il rifiuto
  e' l'unica cosa che quel chiamante puo' incontrare davvero.
- **Perche' un crash nudo era un fallimento silenzioso**, nel senso preciso di
  `meta-gates.md`: nessuna categoria, niente che lo distinguesse da qualunque
  altro dereferenziamento nullo, nessun effetto osservabile che dicesse a una
  persona **cosa** riparare — in un progetto senza error tracking.
- **Cosa NON e' stato fatto, ed e' la meta' che conta.** Nessun `?? ""` e nessun
  `if (!x) return ""`. Una sigla vuota sarebbe diventata una **chiave viva** nella
  mappa delle pipeline, e ogni pezzo senza serie avrebbe ereditato le regole di
  quel secchio: un pezzo misurato contro le ancore di un'altra serie, con il
  verdetto **scritto su una riga** e mai piu' ricalcolato. Peggio del crash che
  avrebbe nascosto.
- **Gli altri chiamanti verificati, uno per uno.** Ogni altro punto che tratta il
  codice di serie come stringa legge una **notte**, il cui codice e' non-nullo per
  tipo e misurato non-nullo in tutte le corse. I due punti che vedono un pezzo
  guardavano gia' il nullo esplicitamente. **Nessun altro punto da riparare.**
- **Un terzo danno, evitato dalla stessa riparazione.** La lista delle sigle
  alimenta anche l'elenco dei termini pubblici dell'audit d'uscita. Un nullo li'
  e' o un'eccezione dentro il controllo delle fughe, o la parola *null*
  ammessa fra i termini innocui. Non e' lo stesso danno due volte.

---

## 8. Lo snapshot su disco e i feed vivi non sono lo stesso calendario

- **Trovata:** piano 58-11, 2026-08-20, confrontando cio' che i tre feed portano
  con cio' che il gate sintetico legge
- **Il fatto, in due numeri.** I tre feed vivi portano oggi **63 voci** in tutto.
  Lo snapshot su disco che `verify:ics` legge ne porta **92**, ed e' datato
  **cinque giorni prima**. Sono due popolazioni diverse, misurate lo stesso
  giorno.
- **Perche' non e' automaticamente un allarme.** In quei cinque giorni il
  catalogo si e' mosso per decisione: un format e' stato **cancellato** il
  2026-08-20 con la sua serie, le sue date e i suoi pezzi di pipeline. Il
  catalogo che la corsa legge oggi dichiara **4 format e 5 serie**. Una parte del
  divario e' quindi la conseguenza corretta di una decisione, non una perdita.
- **Perche' non e' automaticamente niente.** Nessuna misura oggi separa *«voci
  uscite per decisione»* da *«voci che i feed pubblicati non coprono»*. Ed e' una
  distinzione che pesa: lo specchio scrive in produzione **solo cio' che i feed
  portano**, quindi una voce che lo snapshot ha e nessun feed porta e'
  semplicemente una voce che il prodotto non avra'. Il referto stesso chiama
  un'assenza *«a finding, not a tidy-up»*.
- **Una conseguenza sul gate.** `verify:ics` continuera' a dichiarare verde su
  uno snapshot che il calendario vero non e' piu'. Il gate lo dichiara di se'
  — *concorda con il file fornito un giorno* — ma finora snapshot e sorgente
  erano la stessa cosa, e da `ICS-09` non lo sono piu'. **Un gate che misura un
  file che nessuno specchia e' un verde che non copre lo specchio.**
- **Non riparata perche':** decidere quale delle due sia la fonte e' una
  decisione del proprietario — e' lui che pubblica i feed ed e' lui che esporta
  lo snapshot. Un piano non sceglie per lui quale calendario e' il calendario.
- **Come si chiude:** il proprietario dichiara se i tre feed coprono l'intero
  calendario di produzione. **Se si'**, lo snapshot va riesportato dai feed prima
  di rileggere il gate, oppure il gate va ripuntato. **Se no**, mancano una o piu'
  chiavi di calendario — e ognuna e' una migrazione dichiarata, mai un valore
  libero.

---

## 9. Il confronto delle non classificate chiesto dal task 2 non ha un veicolo

- **Trovata:** piano 58-11, 2026-08-20, provando a eseguire il confronto che il
  task 2 pretende
- **Il fatto.** Il task 2 chiede che *«il numero delle voci non classificate sia
  calato rispetto alla misura d'apertura»*, e che il SUMMARY porti **entrambi i
  numeri**. La misura d'apertura vale **31 non classificate su 92 voci**, ed e'
  stata presa nell'onda 1 leggendo il file su disco. La misura di oggi vale **2
  su 63 voci**, e viene dai tre feed vivi. **Le due popolazioni non coincidono**
  (voce 8), quindi il confronto come scritto non e' eseguibile.
- **Perche' non si aggira rileggendo lo snapshot.** L'unica sorgente ammessa
  dall'importatore e' l'indirizzo remoto: `--file` e' stato chiuso da `ICS-09`, e
  farlo tornare per ottenere un numero confrontabile sarebbe la reversione di una
  decisione spedita in questa stessa fase. E' la stessa forma della voce 5.
- **Cosa si puo' dire con onesta', e non e' poco.** Il motivo dominante della
  misura d'apertura era `kind_without_series_and_number` — undici casi di prova
  lo registrarono nell'onda 1. Oggi quel motivo produce **2 voci su 63**, ed e'
  l'unico motivo rimasto. In quota: da **34%** a **3%**. Il criterio del task e'
  soddisfatto nella sostanza; **non lo e' nella forma che chiedeva**, e la
  differenza va scritta invece che arrotondata.
- **Non riparata perche':** riscrivere un criterio d'accettazione dentro il piano
  che lo incontra e' la stessa cosa che allargare un'esenzione per far passare un
  rosso.
- **Come si chiude:** il proprietario decide se il criterio del task 2 si riscrive
  sulla popolazione dei feed — dichiarando che il numero d'apertura resta come
  fatto storico e non come termine di paragone — oppure se la voce 8 va chiusa
  prima, riportando snapshot e feed a essere lo stesso calendario.

---

## 10. `mtnlb` rifiuta a ogni corsa, ed e' il codice che ha ragione

- **Trovata:** piano 58-11, 2026-08-20, lanciando la prova a vuoto sulla terza
  chiave
- **Il fatto, alla lettera.** `--dry-run --calendar mtnlb` rifiuta con uscita
  `2`, categoria `feed_empty`, e chiude con *NOTHING WAS WRITTEN. The import did
  not happen; this is not an empty plan.* Il feed risponde, e' ben formato, e non
  porta **nessuna voce**.
- **Perche' e' il comportamento giusto.** «Feed vuoto» e «export sbagliato» sono
  **indistinguibili dal lato di chi legge**, e la guardia rifiuta invece di
  specchiare il vuoto — che significherebbe cancellare tutto cio' che quella
  chiave tiene. Nessun argomento autorizza un feed vuoto, ed e' corretto cosi'.
- **Perche' e' comunque un problema, e non del codice.** MotionLab **non ha
  alcuna data in calendario**: lo spazio non e' acquisito, e il format ha
  un'attesa invece di una cadenza. Il feed sara' vuoto **finche' quella
  situazione dura**, cioe' potenzialmente per mesi. Quindi il cron del piano
  58-12, se gira sulle tre chiavi, uscira' `2` su una di esse **ogni notte**.
- **Perche' conta in questo progetto in particolare.** Non esiste error tracking:
  nessun errore di produzione raggiunge un essere umano da solo. Un rosso
  ricorrente e atteso e' peggio di nessun rosso — **e' il rumore che insegna a
  ignorare il canale**, e il giorno in cui `rsnt` rifiutera' per una ragione vera
  quel rifiuto sara' indistinguibile dal rumore di sempre.
- **Non riparata perche':** e' il cron a doverlo gestire, e il cron non e'
  autorizzato ne' costruito qui. Aggiungere ora una scorciatoia — una chiave
  esclusa a mano, o un feed vuoto tollerato — sarebbe una guardia allentata per
  comodita', dentro il piano che non la governa.
- **Come si chiude, ed e' del piano 58-12:** un format **senza date dichiarate**
  non e' la stessa cosa di un feed che ha smesso di rispondere. La distinzione va
  fatta **prima** della corsa e per dichiarazione — quali chiavi il cron specchia
  oggi — non dentro la guardia, che deve continuare a rifiutare tutto cio' che
  non sa spiegare.

---

## 11. La superficie non e' raggiungibile da chi esegue: `P-58-A` e `P-58-B` restano ferme

- **Trovata:** piano 58-11, 2026-08-20, subito dopo il primo specchio, provando
  a eseguire il passo 11 di `P-58-A`
- **Il fatto, misurato in due letture indipendenti.** Dal catalogo con
  `read_only: true`: la capacita' che apre la superficie del calendario e'
  tenuta da **due ruoli**, con **un conto ciascuno**, ed entrambi quei conti
  sono di **persone**. Non esiste un conto non umano che la porti. Dal browser:
  la superficie di produzione risponde **`/login`**, quindi nessuna sessione
  aperta esiste su questa macchina.
- **Cosa blocca, passo per passo.** `P-58-A` interamente, perche' il passo 11 —
  *la spunta, messa dalla superficie* — e' il primo che non si esegue con la
  Management API, e i passi 12, 14 e 15 leggono cio' che l'11 avrebbe scritto.
  Di `P-58-B`, i passi 19, 21 e 24, che pretendono una lettura o una pressione
  sulla superficie. **Il passo 23 non e' bloccato ed e' stato eseguito**: e'
  l'unico che non tocca ne' la superficie ne' una scrittura.
- **Perche' non e' stata aggirata, ed e' la meta' che conta.** L'unica via
  sarebbe **coniare una sessione sull'identita' di una persona vera**. Questo
  repository lo ha gia' scritto per un altro strumento: `scripts/verify-all.mjs`
  dichiara che un controllo che firma come un ruolo reale *«e' un ATTO e ha
  bisogno dell'autorizzazione datata del proprietario per quella seduta — non di
  una variabile d'ambiente»*. L'autorizzazione del 2026-08-20 nomina **tre
  scritture**, e nessuna delle tre e' una sessione.
- **Cosa non e' stato fatto di proposito.** Nessuna spunta scritta dal catalogo
  attribuendola a chi non l'ha premuta. Sarebbe una riga d'autore che afferma un
  gesto mai avvenuto, nella colonna che esiste per rispondere a *chi ha deciso
  questo*: il danno esatto che il passo 14 e' scritto per intercettare, prodotto
  di proposito invece che scoperto. E nessun `Result` e' stato riempito con un
  ritrovamento, perche' il blocco di chiusura del file dice che un `Result`
  diverso da `pending` **afferma che la procedura e' stata eseguita**.
- **Cosa la chiude — due strade, e la scelta e' del proprietario.**
  **(1)** Il ruolo che possiede la chiave di sezione preme la casella dalla
  superficie e lo dice; chi esegue riprende dal passo 12. E' la strada che non
  costa niente a nessuno. **(2)** Il proprietario autorizza, con la data e per
  quella seduta, che chi esegue conii una sessione su un'identita' reale, nella
  forma che `npm run verify:refusal` gia' pretende per se'. La seconda sblocca
  anche ogni futura esecuzione presidiata; la prima no.
- **Conseguenza a valle.** `ICS-03` e `ICS-03b` non sono chiusi
  dall'evidenza di una procedura, e la fase non chiude finche' non lo sono.
  `ICS-01b` **e' comunque provato altrove** — piano 58-09, per mutazione del
  codice — e non dipende da questa voce.

---

## 12. `verify:touch-targets` era gia' rosso prima di questo piano

- **Trovata:** piano 58-11, task 3, 2026-08-20, lanciando `npm run verify` dopo
  la stretta a `NOT NULL`
- **Il fatto.** `npm run verify` esce **1**: `verify:touch-targets` segnala
  **due** elementi in un componente del menu drink che non dichiarano l'altezza
  minima di 44px. Gli altri **ventitre'** controlli passano, compresi tutti
  quelli del calendario e dello specchio.
- **Perche' non e' di questo piano.** Il file non e' stato toccato qui: l'ultimo
  commit che lo modifica e' della fase 47, e questo piano ha cambiato solo una
  migration e quattro dichiarazioni di tipo. Il rosso **precede** il piano.
- **Non riparata perche':** la regola di perimetro vieta di riparare cio' che non
  si e' rotto qui, e il gate stesso lo scrive in fondo al proprio referto:
  *«Fix the ELEMENT, not this gate»* — allargare un'esenzione per far passare un
  rosso e' il manomettere che quel gate esiste per intercettare.
- **Come si chiude:** i due controlli portano l'altezza minima, oppure diventano
  un'eccezione dichiarata come la decima gia' registrata nel gate — che e'
  un'eccezione di accessibilita' decisa dal proprietario, non un'esenzione
  allargata.

---

## 13. La lacuna degli alias e' misurata e NON riparata: la prima spunta e' arrivata prima

- **Trovata:** riparazione 58-13, 2026-08-22, leggendo il catalogo con
  `read_only: true` e classificando i due feed vivi **in memoria**, senza
  scrivere nulla
- **Autorizzazione:** il proprietario ha autorizzato il 2026-08-22 *compilare gli
  alias mancanti e rileggere i calendari*. **L'autorizzazione non e' stata
  spesa**, per la ragione del punto 3 qui sotto.

### 1. La lacuna, confermata dall'evidenza invece che per somiglianza

Cinque serie in catalogo, **una sola** porta un `ics_alias`, ed e' quella di
`RSNT-PRLN`. L'ipotesi da cui la riparazione partiva e' verificata.

Classificando i feed vivi con la mappa di oggi:

| chiave | notti | pezzi | impegni | non classificate |
|---|---|---|---|---|
| `rsnt` | 2 | 17 | 24 | 2 — entrambe `kind_without_series_and_number` |
| `rmdb` | 0 | 12 | 15 | 0 |

Le **sette** voci che il proprietario vede come *giorni presi da altri* pur
essendo nostre hanno, su `rsnt`, la forma di notte con la parola del format in
testa e i progressivi **002–008**. Le due non classificate sono due pezzi la cui
seconda posizione porta la stessa parola.

### 2. La corrispondenza derivata, e la parte che un alias non ripara

Simulata **in memoria**, sugli stessi feed, con quattro mappe candidate:

| mappa | `rsnt` notti · non class. | `rmdb` notti · non class. |
|---|---|---|
| oggi | 2 · 2 | 0 · 0 |
| **+ parola del format `RSNT`** | **9 · 0** | 0 · 0 |
| + anche `RMDB-BZ` | 9 · 0 | **0 · 3** |
| + anche `RMDB-MR` | 9 · 0 | **0 · 3** |
| + la parola del format `RMDB` | 9 · 0 | **0 · 3** |

**Il format `RSNT` e' una lacuna di alias, e si ripara con un alias.** Notti da 2
a 9, impegni da 24 a 17, non classificate da 2 a 0, progressivi **002–008** letti
dal titolo — nessuno inventato, nessuno sceso, e la serie `RSNT-PRLN` conserva la
propria numerazione separata, 001 e 002.

**Il format `RMDB` NON e' una lacuna di alias, ed e' il ritrovamento.** Le sue
tre serate stanno nel calendario **senza progressivo**: la grammatica della notte
e' `<Parola>[ x <Parola>] <NNN>` e quel `<NNN>` non c'e'. Nessuna delle tre mappe
candidate produce **una sola** notte `RMDB`; tutte e tre spostano quelle voci da
*giorno preso* a **non classificata**, cioe' fanno salire le non classificate da
0 a 3 — una condizione d'arresto dichiarata.

E il codice ha ragione a rifiutare: attaccare un numero a quelle voci sarebbe
**inventare un progressivo**, che e' una guardia monotona (`meta-gates.md`). La
riparazione di `RMDB` non e' una scrittura sul database — e' una decisione di
produzione: **il titolo deve portare il progressivo**, oppure quelle serate
restano fuori. Non e' un atto che chi esegue possa compiere.

### 3. Perche' nulla e' stato scritto: la prima spunta esiste

Il catalogo, letto con `read_only: true` prima di ogni atto:

| | valore | soglia d'arresto |
|---|---|---|
| piani | 2 | — |
| pezzi | 37 | — |
| impegni | 70 | — |
| voci di checklist | 14 | — |
| **spunte** | **1** | **> 0 ⇒ arresto** |
| legami | 0 | > 0 |
| piani con `absent_since` | 0 | > 0 |
| corse di import | 8 | — |

**La spunta e' stata premuta il 2026-08-20 alle 21:36:38Z**, da un'identita' vera
e con un nome registrato, su una voce di tipo `piece` di un piano della serie
`RSNT-PRLN`, sotto la chiave di calendario `rsnt` — cioe' **dentro** il perimetro
che lo specchio `rsnt` cancella.

La voce **3** di questo stesso file aveva scritto la condizione in anticipo, e la
condizione si e' avverata alla lettera:

> *«Il momento in cui lo strumento diventa necessario non e' la prima corsa del
> cron: e' la prima spunta o il primo legame.»*

E il modulo dello specchio lo dice di se stesso, in prosa:

> *«fra il DELETE e il REWRITE non c'e' transazione e non c'e' point-in-time
> recovery in questo progetto — se la corsa muore a meta', queste liste sono
> tutto quello che resta.»*

Il riaggancio in memoria esiste e riaggancia su `source_uid` + tipo + etichetta,
quindi una corsa che arriva in fondo rimette la spunta. **Una corsa che muore a
meta' la perde**, e il percorso di ripristino dall'istantanea **non ha ancora uno
strumento** — e' la voce 3, assegnata al piano 58-12 e non costruita.

Quella spunta e' oggi **l'unico dato dell'intero sistema di produzione che nessun
feed sa ricostruire**: il calendario non registra chi ha spuntato una casella.

### 4. Le due assunzioni dell'autorizzazione, entrambe invalidate

1. *«zero spunte e zero legami esistono oggi»* — **falsa**: una spunta esiste, ed
   e' posteriore ai numeri su cui l'autorizzazione era stata chiesta.
2. *«compilare gli alias fara' salire le notti»* — **vera per `RSNT`, falsa per
   `RMDB`**, e per una ragione che nessuna scrittura sul database rimuove.

- **Non riparata perche':** due assunzioni invalidate su due sono lo *STOP e
  ripianifica* di `CLAUDE.md`, e cancellare-e-riscrivere con una spunta viva e' un
  rischio che l'autorizzazione del 2026-08-22 non copre — perche' e' stata chiesta
  su un catalogo che non aveva ancora spunte.
- **Come si chiude, e sono tre cose distinte:**
  1. **`RSNT`** — la guardia della voce 3, punto 2 (rifiuto della corsa non
     presidiata con spunte `> 0`) **oppure** l'accettazione esplicita, datata, del
     rischio di perdere quella spunta se la corsa muore. Poi l'alias e i due
     `--apply`. La misura dice che l'effetto e' esattamente quello atteso.
  2. **`RMDB`** — decisione di produzione: il titolo delle serate porta il
     progressivo, o quelle tre restano fuori. Nessun alias la sostituisce.
  3. **`MTNLB` e `RMDB-MR`** — **zero occorrenze** nei due feed vivi. Nessuna
     evidenza, quindi nessun alias: una corrispondenza senza misura attaccherebbe
     una notte alla serie sbagliata, e un alias mancante e' visibile mentre un
     alias sbagliato non lo e'.

---
