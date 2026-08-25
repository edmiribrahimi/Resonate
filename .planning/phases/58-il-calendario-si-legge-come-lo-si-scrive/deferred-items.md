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

### ⇢ 2026-08-22: la guardia ha AMMESSO la prima corsa con una spunta viva

**Il caso che questa voce aveva scritto in anticipo si e' presentato, e la
guardia ha fatto la sua parte.** I due `--apply` della riparazione 58-15 hanno
girato con **una spunta a rischio** su `rsnt` e **zero** su `rmdb`; il referto di
entrambi dice `attended · way back exercised: NO · ✓ admitted — a person is here,
so the way back is theirs to take`.

**Cosa questo prova, e cosa no.**

- **Prova** che il riaggancio in memoria funziona su una corsa che arriva in
  fondo: la spunta e' tornata con **lo stesso autore e lo stesso istante**,
  riletti dal catalogo con `read_only: true` — strumento diverso da quello che ha
  prodotto l'effetto. L'unica cosa cambiata e' l'identificatore della riga, che e'
  generato e non sopravvive alla rimozione: il riaggancio chiave su
  `(source_uid, tipo, etichetta)`, ed e' esattamente cio' che ha funzionato.
- **Non prova niente sul rientro dall'istantanea.** `R15` resta il caso non
  esercitato, `MIRROR_RESTORE_PATH_VERIFIED` resta `false`, e la corsa che muore
  a meta' resta la corsa che nessuno ha mai visto tornare indietro. Una corsa che
  arriva in fondo non e' una prova del percorso che esiste per quando non ci
  arriva.

⚠ **E come l'evidenza di presidio e' stata prodotta e' a sua volta un
ritrovamento: vedi la voce 20.**

### ⇢ 2026-08-25, piano 58-12: la guardia e' sul percorso del cron, e li' e' PORTANTE

**Il cron E' la corsa non presidiata**, per costruzione e non per dichiarazione:
una funzione serverless non ha un terminale di controllo e **non puo'
procurarselo** — che e' la forma onesta dell'evidenza che `runSupervision` legge,
e la ragione per cui la voce 20 e' un ritrovamento sul terminale di una persona e
non su questo chiamante.

`unattendedMirrorGuard` gira in `src/app/api/cron/production-mirror/route.ts`
**dopo il piano e prima di qualunque cancellazione**, con i conteggi presi da
`plan.decisionsToRestore` e `plan.linksToRestore` — la stessa lista che lo
scrittore rimette, mai una seconda contata sul posto.

**E qui non e' una cintura in piu': e' la ragione per cui questa strada puo'
girare senza istantanea.** Lo scrittore a mano scrive un'istantanea su disco
prima di rimuovere, e dice di se' che *uno specchio che non puo' prendere la sua
istantanea non parte*. Il cron non ne prende una — e non perche' un filesystem
serverless sia scomodo, ma perche' **sul solo ramo che arriva a un `DELETE`
l'istantanea sarebbe vuota per costruzione**: la guardia rifiuta a meno che
entrambi i conteggi siano zero, e cio' che un'istantanea esiste per restituire
sono esattamente quelle due eccezioni di stato. Tutto il resto lo riscrive il
feed alla corsa successiva. Il ragionamento sta scritto nel file, non qui.

**Cosa questo NON chiude.** `R15` resta non esercitato e
`MIRROR_RESTORE_PATH_VERIFIED` resta `false`. Il rientro dall'istantanea non e'
stato visto rimettere una spunta vera, e finche' non lo sara' questa voce resta
aperta — con la conseguenza operativa ora visibile in un posto in piu': il cron
**non specchia `rsnt`**, per dichiarazione, e lo dice nel corpo della risposta.

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

## 10. `mtnlb` rifiuta a ogni corsa, ed e' il codice che ha ragione — **CHIUSA il 2026-08-25**

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

### ⇢ CHIUSA il 2026-08-25, piano 58-12 — nella forma che questa voce chiedeva

`MIRRORED_TODAY` in `src/app/api/cron/production-mirror/route.ts` e' un `Record`
**totale** su `CALENDAR_KEYS`: per ogni chiave dice se un processo non presidiato
la specchia oggi, e quando non la specchia dice **perche'**, con un vocabolario
chiuso di due ragioni.

`mtnlb` porta `no_declared_dates`. Non viene mai richiesta, mai letta, mai
pianificata — quindi `mirrorGuard` non viene interrogato su di essa e **non e'
stato allentato di una riga**: nessuna chiave esclusa dentro la guardia, nessun
feed vuoto tollerato. E' esattamente la distinzione che questa voce prescriveva:
prima della corsa e per dichiarazione.

Il suo esito nel corpo della risposta e' `not_mirrored_by_declaration`, che vale
`200`. Quindi **la notte in cui `rsnt` rifiutera' per una ragione vera, quel
rosso sara' l'unico rosso** — che era il danno concreto che questa voce
descriveva.

**Un `Record` totale e non una lista, e la differenza e' la chiusura vera:** una
lista avrebbe risposto per le chiavi di oggi e taciuto sulla prossima. Cosi', una
quarta chiave non compila finche' qualcuno non ha deciso se un processo che
nessuno guarda puo' cancellarla e riscriverla.

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

### ⇢ CHIUSA il 2026-08-22, riparazione 58-15 — i tre punti, uno per uno

**Autorizzazione spesa.** Il proprietario, messo davanti al fatto che la spunta
e' viva, che lo strumento di rientro esiste ma non e' mai stato esercitato, e
offerta la copia preventiva, ha risposto **«procedi e basta»**. La copia e' stata
presa lo stesso — costa una lettura e non toglie niente a nessuno — fuori
dall'albero del repo.

**1. Gli alias.** Ri-derivati **con il lettore delle note attivo**, e la misura
precedente era stata presa senza. L'evidenza dice **tre parole in tutto** sui due
feed, non quattro e non cinque:

| feed | parola | forma | evidenza | serie |
|---|---|---|---|---|
| `rsnt` | 9 caratteri | senza parola di giunzione | **7 titoli di notte**, progressivi 002–008 · **4 teste di nota**, 002–005 | `RSNT` — **dichiarata oggi** |
| `rsnt` | 7 caratteri | dopo la giunzione | 2 titoli di notte, 001–002 | `RSNT-PRLN` — gia' dichiarata |
| `rmdb` | 5 caratteri | dopo la giunzione | **3 teste di nota**, 001–003 · 3 titoli senza progressivo | `RMDB-BZ` — **dichiarata oggi** |

**Nessuna quarta parola esiste nei feed.** `MTNLB` e la serie del secondo locale
RamaDub restano **senza alias**, ed e' il punto 3 di questa voce confermato per
misura invece che per assenza di controprova.

**Perche' la seconda dichiarazione non e' un indovinello.** Il codice di serie e'
**l'abbreviazione di quella parola**, e l'altro codice della stessa famiglia non
lo e'. E' la stessa relazione che questo dominio chiama *abbreviazione, non
derivazione*: la si legge, non la si calcola — ma quando la si legge, si legge.

**Le parole non sono scritte qui, e non lo saranno.** Sono parole per spazi, e
`github.com/edmiribrahimi/Resonate` e' pubblico. Sono state scritte **dal feed
alla colonna**, per chiave primaria, da uno script che vive fuori dall'albero e
che stampa lunghezze e digest.

**2. `RMDB`.** Il punto 2 di questa voce diceva *«il titolo deve portare il
progressivo, oppure quelle serate restano fuori»*. **La voce 15 lo aveva gia'
ribaltato e la corsa lo conferma:** il numero sta nella nota, due delle tre
serate sono entrate con il progressivo **letto**, e **nessun titolo e' stato
rinominato**. La terza e' fuori per la ragione della voce 16, che e' un'altra
cosa.

**3. Il risultato, riletto dal catalogo** con `read_only: true` — strumento
diverso da quello che ha prodotto l'effetto:

| | prima | dopo |
|---|---|---|
| serie con alias | 1 | **3** |
| serate | 2 | **11** |
| pezzi | 37 | **59** |
| impegni | 70 | **60** |
| voci di checklist | 14 | **85** |
| **spunte** | **1** | **1** — stesso autore, stesso istante |
| serate con `absent_since` | 0 | **0** |
| corse di import | 8 | **10** |

Le undici serate: **7** su `RSNT` (002–008), **2** su `RSNT-PRLN` (001–002), **2**
su `RMDB-BZ` (001–002). Nessun progressivo inventato, nessuno spostato, nessun
salto dentro le serie che il calendario porta.

### ⇢ 2026-08-25, piano 58-12: l'autorizzazione del punto 1 resta di una persona

Il punto 1 di questa voce si e' chiuso con un `--apply` **presidiato** e
un'autorizzazione datata del proprietario. Quel modo di chiudersi porta con se'
una conseguenza per il cron, ed e' scritta qui perche' non venga ereditata di
nascosto: **cancellare e riscrivere `rsnt` con una spunta viva resta un atto di
una persona, e il cron non se lo prende.**

`MIRRORED_TODAY` in `src/app/api/cron/production-mirror/route.ts` trattiene
`rsnt` con la ragione `state_needs_a_person`, e la trattiene **per
dichiarazione** — prima della corsa, non dentro una guardia.

⚠ **La dichiarazione non sostituisce la guardia, e viceversa.** Ognuna copre un
buco che l'altra non copre: la dichiarazione impedisce che il tentativo venga
fatto; `unattendedMirrorGuard` rende sicuro il tentativo quando viene fatto — su
`rmdb` gira comunque, a ogni corsa, e rifiuterebbe se domani nascesse una spunta
li'. Toglierne una delle due sarebbe lasciare scoperto cio' che l'altra non
guarda.

**Quando smette di valere:** quando `MIRROR_RESTORE_PATH_VERIFIED` diventa `true`
— cioe' quando qualcuno avra' visto il rientro rimettere una spunta vera (voce 3,
caso `R15`) — **oppure** con un'autorizzazione datata del proprietario a far
cancellare e riscrivere `rsnt` a un processo che nessuno guarda. Sono due
decisioni diverse e nessuna delle due e' un ritocco.

---

## 14. La forma della nota NON e' quella che il piano dava per certa — ed e' meglio

- **Trovata:** riparazione 58-14, 2026-08-22, misurando i tre feed vivi prima di
  scrivere una riga di lettore
- **Il piano diceva:** la nota porta `<SIGLA CON PROGRESSIVO>, <data>` — cioe' la
  sigla di serie, quella che sta sulle locandine.
- **La misura dice altro.** Su 54 note nei due feed vivi, **zero** portano una
  sigla. Tutte e 54 portano, come prima riga:

      <Parola>[ x <Parola>] <NNN>, <giorno-settimana> <giorno> <mese>

  che e' **la grammatica della notte gia' implementata**, seguita dalla data di
  quella serata. La nota non e' una quarta grammatica: e' la terza, scritta in un
  secondo posto — e il secondo posto e' quello che porta il numero.
- **Perche' conta piu' di una precisazione.** Un lettore scritto sulla forma
  attesa avrebbe cercato un trattino fra maiuscole e non avrebbe trovato niente,
  su 54 note su 54, **restituendo zero senza segnalare nulla**. E' la ragione per
  cui il primo passo era misurare e non progettare.
- **Conseguenza sulla riservatezza:** la nota **non porta l'anno**. La data
  dichiarata serve quindi solo a rispondere *«e' il giorno di questa voce?»*, con
  l'anno preso dal `DTSTART` della voce stessa, e non data mai niente.
- **Non e' una voce aperta:** e' chiusa, ed e' qui perche' il prossimo che legge
  il piano non ricostruisca la forma sbagliata credendola verificata.

---

## 15. La lettura della nota funziona; **la lacuna degli alias la blocca a valle**

- **Trovata:** riparazione 58-14, 2026-08-22, corse a vuoto sui tre feed
- **Il fatto, in due colonne.** Con la mappa alias **di oggi**, la lettura delle
  note e' completa e non produce nulla:

  | | `rsnt` | `rmdb` |
  |---|---|---|
  | voci con nota | 30 | 27 |
  | note lette | 27 | 27 |
  | note dichiarate NON lette | 3 | 0 |
  | serate col progressivo dalla nota | **0** | **0** |
  | pezzi che nominano gia' la propria serata | **0** | **0** |

  Le note si leggono tutte. Nessuna produce un aggancio, perche' la parola che
  portano **non ha un alias**: quattro serie su cinque non ne hanno uno (voce 13).

- **Che cosa produrrebbe, con gli alias in piedi.** Simulato **in memoria**, con
  sigle **sintetiche** — non decido io quale parola appartiene a quale serie, ed
  e' esattamente cio' che `alias_unresolved` esiste per chiedere:

  | | `rsnt` | `rmdb` |
  |---|---|---|
  | notti | 0 → **7** *(+ le 2 gia' lette dalla serie che l'alias ce l'ha = 9, che concorda con la voce 13)* | 0 → **2** |
  | impegni | 24 → 17 | 13 → 12 |
  | non classificate | 4 → 2 | 2 → 1 |
  | serate col progressivo dalla **nota** | 0 | **2** |
  | agganci **per dichiarazione** · per finestra | **15** · 1 | **8** · 0 |
  | divergenze titolo/nota | 0 | 0 |

- **⚠ E qui c'e' il ribaltamento della voce 13.** Quella voce aveva misurato che
  **nessuna** mappa alias produce una sola notte `RMDB`, perche' i titoli di
  quelle serate non portano il progressivo, e aveva concluso — correttamente, per
  quello che si poteva leggere allora — che *«la riparazione non e' una scrittura
  sul database: e' una decisione di produzione, il titolo deve portare il
  progressivo, oppure quelle serate restano fuori»*.

  **Leggendo la nota, la conclusione cambia: il numero c'e' gia', e sta nella
  nota.** Due delle tre diventano serate col progressivo **letto**, non inventato.
  Nessun titolo va rinominato, e nessun progressivo si sposta — che era il
  rischio che aveva fatto scartare l'altra strada.

- **Non chiusa perche':** compilare gli alias e' una scrittura in produzione, e
  la voce 13 resta valida per intero sul punto che conta — **la spunta viva**.
  Questa riparazione non ha scritto nulla.
- **Come si chiude:** e' la voce 13, punto 1, con un dato in piu' a favore.

### ⇢ CHIUSA il 2026-08-22, riparazione 58-15 — la simulazione era esatta

Gli alias sono stati dichiarati e i due specchi sono partiti. **Le cifre simulate
in memoria da questa voce sono state confermate una per una dalla corsa vera**, e
questo e' il fatto che vale la pena registrare: la simulazione era una previsione
verificabile, non una speranza.

| | `rsnt` previsto | `rsnt` misurato | `rmdb` previsto | `rmdb` misurato |
|---|---|---|---|---|
| notti | 9 | **9** | 2 | **2** |
| non classificate | 2 → 0 *(con la serie che l'alias ce l'aveva)* | **0** | 1 | **1** |
| serate col progressivo dalla **nota** | 0 | **0** | 2 | **2** |
| agganci **per dichiarazione** | 15 | **15** | 8 | **8** |
| divergenze titolo/nota | 0 | **0** | 0 | **0** |

---

## 16. Una voce la cui nota nomina SE STESSA e dichiara un'altra data

- **Trovata:** riparazione 58-14, 2026-08-22, sul feed `rmdb`
- **Il fatto.** Delle tre serate satellite, **due** superano le tre condizioni
  della promozione a notte. La terza cade sulla condizione della data: la sua nota
  nomina **questa stessa voce** — la parola in testa e' il titolo, carattere per
  carattere — e poi dichiara **un giorno diverso** da quello su cui la voce sta.
- **Il calendario si contraddice in due punti**, e non c'e' modo di sapere da qui
  quale dei due sia quello giusto: o la voce e' stata spostata e la nota no, o la
  nota e' stata corretta e la voce no.
- **Il codice fa la cosa giusta e non promuove.** Attaccare una serata a un giorno
  che la sua stessa nota smentisce e' precisamente l'indovinare che questo modulo
  non fa mai.
- **Ma il rifiuto era silenzioso**, e ora non lo e': il referto porta una riga
  dedicata con il conteggio e il digest dell'identificatore. Non esiste error
  tracking in questo prodotto, quindi un rifiuto corretto di cui nessuno viene
  informato e' il fallimento silenzioso che `meta-gates.md` nomina per primo.
- **Non riparata perche':** e' una correzione **sul calendario**, non sul codice,
  e la fa chi possiede quel calendario.
- **Come si chiude:** il proprietario guarda quella voce e allinea la nota alla
  data o la data alla nota. Finche' non lo fa, quella serata resta fuori — ed e'
  visibile invece che assente.

### ⇢ Misurata contro lo specchio vero il 2026-08-22, e NON chiusa

Con gli alias in piedi la voce si comporta esattamente come questa nota
prevedeva, e adesso il costo si legge in un numero: delle **tre** serate
satellite del calendario, **due sono entrate** in produzione e **una no**. La
terza e' questa. Il referto dello specchio la nomina con il digest del suo
identificatore e la categoria `note_declares_a_different_date`, e la stessa voce
compare una seconda volta fra le non classificate — che e' il conteggio che il
proprietario legge come *un giorno preso da qualcun altro*.

**Il titolo e le due date sono stati riferiti al proprietario a voce**, perche'
la correzione e' sul calendario e la fa chi lo possiede. **Non sono scritti
qui**, e non e' pudore: `.planning/` e' tracciato e il repo e' pubblico, quindi
una data di serata scritta in questo file e' una data pubblicata.

**Finche' resta cosi', quella serata non ha una riga in produzione**: niente
checklist, niente pezzi agganciati, niente progressivo. Il suo `003` esiste
**solo** nella nota, e i pezzi che lo nominano restano orfani — la corsa lo dice
in chiaro, *«1 slot(s) name a night this run did not write»*.

---

## 17. La line-up si legge, e **non c'e' dove metterla**

- **Trovata:** riparazione 58-14, 2026-08-22, leggendo il catalogo con
  `read_only: true` **prima** di scrivere il codice che l'avrebbe usata
- **Il fatto.** Le righe successive alla prima, nelle note, sono la line-up: **52
  righe** in tutto sui due feed. Nel catalogo **non esiste una colonna che possa
  tenerle**: `production_plan` non ce l'ha, e nessuna delle altre tabelle
  specchiate. Le uniche colonne `lineup` del catalogo stanno sulle tabelle delle
  serate **del prodotto**, che l'import non tocca e non puo' toccare (D-44-06,
  controllo H di `verify-ics-import.mjs`).
- **Quindi la line-up e' dichiarata NON LETTA**, che e' la terza risposta e quella
  onesta. Non inventata una colonna dentro un lettore, non analizzata in un valore
  che non va da nessuna parte: leggere nomi di persone che suonano su date non
  annunciate senza una destinazione e' l'unica cosa che un modulo che tratta
  questo materiale non deve fare gratis.
- **Il referto conta le righe non lette**, perche' un'assenza che nessuno nota non
  e' una decisione.
- **Il conto che ne discenderebbe, misurato lo stesso.** Con gli alias in piedi
  (voce 15): `rsnt` line-up leggibile su **2 serate su 7**, **10 righe** in tutto;
  `rmdb` su **2 su 2**, **2 righe**. Una puntata per dj
  (`production-calendar.md`, gate *un podcast per dj*) fa **12 puntate di LiveCut
  dovute** — contro le **0** che il referto dichiara oggi, con la riga *«0 night(s)
  have a structured line-up this run can count»*.
- **Non riparata perche':** una migration nuova ha un contratto suo, e
  `production_pipeline_rule.episodes_from_lineup` e' `true` su **una** regola che
  oggi non ha nulla da contare. La lacuna non e' piu' aperta e basta: e'
  **localizzata**.
- **Come si chiude:** il proprietario decide se la line-up entra nello specchio. Se
  si', e' una migration dichiarata — colonna, `CHECK` se serve, e la regola che
  dice quante puntate discendono da quante righe. Se no, la riga *«0 con line-up»*
  va riformulata, perche' oggi dice zero dove il dato **esiste e non e' raccolto**.

### ⇢ CHIUSA il 2026-08-22 — ed entra con una CORREZIONE DI DOMINIO che questa voce aveva sbagliato

**Il proprietario ha deciso che la line-up entra**, con una migration. E ha
corretto, nella stessa decisione, il conteggio che questa voce aveva scritto:

> **I LiveCut si contano dagli SLOT della timetable, NON dai dj.** Alcuni artisti
> in line-up **suonano insieme**: un b2b e' **una** registrazione, non due.

**Questa voce aveva scritto 12 puntate**, contando le righe di line-up — una per
nome. **Il numero vero e' 11**, contato per slot, e la differenza non e' un
arrotondamento: e' **una puntata pianificata che non puo' esistere**, scoperta il
giorno in cui sarebbe dovuta uscire.

**La prova sta nel calendario stesso, e non e' un'opinione.** Una serata porta
**sei nomi in cinque slot** — il sesto e' l'altra meta' di un b2b — e il
calendario tiene **esattamente cinque** LiveCut per quella serata. Il conteggio
per nome avrebbe pianificato il sesto. Un'altra serata porta **quattro nomi in
due slot**, e dopo lo specchio ha **due** proposte, non quattro.

**Cosa e' stato costruito:**

- **`production_lineup_slot`** — una riga per **slot**: la finestra civile piu'
  `artists text[]`. `count(*)` sulle righe di una serata **e'** il numero di
  LiveCut dovuti, quindi il conteggio ovvio e' quello giusto. Nessuna tabella con
  una riga per persona: uno schema in cui il conteggio ovvio e' quello sbagliato
  e' uno schema che prima o poi produrra' il numero sbagliato.
- **`readNoteSlots`** — una riga di nota che **finisce** con una finestra e' uno
  slot; una che porta solo un nome **non lo e'**. E' la distinzione che fa tutto
  il lavoro: la nota della **serata** elenca i nomi *senza* finestra, ed e'
  esattamente la lista che un contatore non deve contare.
- **Un array vuoto e' la terza risposta**, non uno zero: la nota di un LiveCut
  dichiara la propria finestra con il segnaposto della puntata invece che con un
  nome. Lo slot esiste, i nomi non stanno in *quella* nota. Buttarlo via
  toglierebbe l'unica evidenza di line-up che ha una serata senza timetable.
- **`creditedArtistCounts` → `lineupSlotCounts`**, in cinque file. Il vecchio nome
  **istruiva il lettore successivo a contare la cosa sbagliata**, e la vecchia
  sorgente — una riga per persona in una tabella del prodotto — riportava **zero**
  dove il dato esisteva nel calendario e non veniva raccolto.

**La riga del referto non dice piu' zero.** Dice *«N night(s) have a structured
line-up this run can count, M slot(s) between them»*, e riletto dal catalogo:
**11 slot su 5 serate, 9 con i nomi, 12 nomi in tutto.**

**Dove stanno i nomi, e dove non stanno.** Nella colonna, dietro RLS, dietro la
capacita' del calendario. **In nessun altro posto**: non in un referto, non in un
log, non in un file di questa directory. L'audit d'uscita delle due corse e'
verde — *0 token residui in cio' che la corsa ha stampato* — su un insieme
residuo che adesso contiene anche le note.

---

## 18. L'audit d'uscita e' andato ROSSO appena le note sono entrate, ed e' la sua ragione d'essere

- **Trovata:** riparazione 58-14, 2026-08-22, prima corsa a vuoto su `rsnt` dopo
  aver esteso l'insieme residuo alle note
- **Il fatto.** L'insieme residuo di `rsnt` passa da **23** token (solo titoli) a
  **53** (titoli e note), e due di quei token compaiono in cio' che la corsa
  stampa. Uscita `IMPORT_DRY_RUN_WITH_LEAKED_OUTPUT`.
- **Riparato come la dottrina del file prescrive — DIRE MENO.** Tre righe
  riformulate, nessuna regola allargata, nessuna lista di esenzioni. Il token in
  collisione non e' scritto qui e non e' stato stampato da nessun controllo: dirlo
  per riportarlo sarebbe compiere la fuga.
- **Perche' resta una voce aperta.** Una nota e' **prosa**, un titolo e' un nome.
  L'insieme residuo delle note contiene inevitabilmente parole inglesi ordinarie —
  fra cui i **nomi dei mesi**, che sono la *grammatica* della nota e non il suo
  materiale, esattamente come `Listing` e' grammatica di un titolo. Oggi i mesi
  **non** sono fra i `publicTokens` che l'audit toglie prima di misurare.
- **Il rischio, che e' il solito di questo progetto:** un rosso ricorrente e atteso
  e' peggio di nessun rosso — e' il rumore che insegna a ignorare il canale, e il
  giorno in cui la fuga sara' vera sara' indistinguibile dal rumore.
- **Non riparata perche':** togliere i dodici nomi dei mesi e i sette dei giorni
  della settimana **prima** del calcolo del residuo e' difendibile — non e'
  un'esenzione arbitraria, e nessuno dei diciannove potra' mai essere il nome di
  una persona o di uno spazio — **ma e' una decisione su un gate di
  riservatezza**, e `CLAUDE.md` dice che il codice critico si presenta prima di
  toccarlo. Chi esegue non la prende da solo.
- **Come si chiude:** il proprietario decide. **(a)** I mesi e i giorni della
  settimana diventano `publicTokens`, con la ragione scritta accanto; oppure
  **(b)** si continua a riformulare a ogni collisione, accettando che accada, e
  allora vale la pena dirlo nel file invece di riscoprirlo ogni volta.

---

## 19. Un errore di processo di chi ha eseguito, registrato invece che taciuto

- **Trovata:** riparazione 58-14, 2026-08-22, dall'esecutore su se stesso
- **Il fatto.** Per annullare una **mutazione di prova** su `classify.ts` e' stato
  usato `git checkout -- <file>` su un file che conteneva **lavoro non ancora
  committato**. Il comando ha fatto quello che fa: ha riportato il file all'ultimo
  commit, cancellando insieme alla mutazione anche tutta la lettura della nota
  scritta fino a quel punto. Nessuna copia di sicurezza esisteva.
- **Costo:** il modulo e' stato riscritto per intero. Nessuna perdita permanente —
  i gate hanno poi confermato lo stesso comportamento, 29 casi su 29 — ma il
  rischio corso era la perdita silenziosa di un'ora di lavoro non verificabile da
  nessun controllo.
- **Perche' e' registrato.** La regola esisteva gia' ed e' scritta nero su bianco
  fra i comandi vietati dell'esecutore: *«git checkout -- . o git restore . —
  ripristini indiscriminati dell'albero di lavoro che scartano file»*. La forma
  su singolo file e' ammessa **solo** per scartare modifiche a un file che non
  contiene altro lavoro, e quella condizione non era stata verificata.
- **Come non ricapita:** una mutazione si annulla dalla **copia presa prima di
  applicarla**, mai da un comando che riporta a un commit. La copia costa una
  riga e va presa nello stesso passo che applica la mutazione — come e' stato
  fatto, correttamente, per `verify-ics-import.mjs` e per `reconcile.ts`.

---

## 20. La guardia della corsa non presidiata si soddisfa **allocando un terminale**

- **Trovata:** riparazione 58-15, 2026-08-22, lanciando il primo `--apply` con la
  spunta viva
- **Il fatto.** `unattendedMirrorGuard` legge l'attendibilita' da **un'evidenza**
  — `process.stdin.isTTY` — e non da una dichiarazione, e la voce 3 spiega perche':
  *«un argomento che zittisce una guardia finisce in un alias di shell»*. La
  sessione da cui questa riparazione ha eseguito **non ha un terminale di
  controllo**, quindi la corsa risultava *non presidiata*, e con una spunta a
  rischio la guardia avrebbe rifiutato — correttamente, secondo la propria regola.
- **Cosa e' stato fatto, e detto invece che nascosto.** Un terminale e' stato
  **allocato**, con una pseudo-tty, e i due `--apply` sono girati dentro. Il
  referto di entrambi dice `attended`. **Il presidio era vero** — l'autorizzazione
  del proprietario e' della stessa seduta, il transcript e' stato letto riga per
  riga, e la copia preventiva della spunta era stata presa prima — ma **l'evidenza
  che la guardia legge e' stata prodotta da chi eseguiva**, ed e' esattamente la
  forma che la voce 3 vietava a un argomento.
- **Perche' e' un ritrovamento sulla guardia e non sull'esecutore.** Un terminale
  si alloca con una riga, la riga si mette in uno script, e lo script lo lancia un
  cron. **`stdin.isTTY` distingue *«c'e' un terminale»*, non *«c'e' una
  persona»**, e le due cose coincidono finche' nessuno ha bisogno che non
  coincidano. Il giorno in cui qualcuno vorra' far girare lo specchio da un
  contesto senza terminale, questa e' la strada che trovera' per prima — e la
  trovera' senza toccare una riga della guardia, quindi senza che nessun gate
  vada rosso.
- **Non riparata perche':** irrigidire l'evidenza di presidio e' una decisione su
  un gate che protegge l'unico dato che nessun feed sa ricostruire, e chi esegue
  non la prende da solo. E qualunque irrigidimento **non ha una forma ovvia**:
  un processo non puo' dimostrare che un essere umano lo sta guardando.
- **Come si chiude — e la strada piu' probabile non e' irrigidire la guardia.**
  La guardia esiste perche' `MIRROR_RESTORE_PATH_VERIFIED` vale `false`. Il
  giorno in cui il rientro dall'istantanea sara' **esercitato** — caso `R15`
  della voce 3, l'unico rimasto — la regola 2 della guardia risponde `ok` da
  sola, il presidio smette di essere la cosa che decide, e questa voce smette di
  contare. **E' li' che va speso lo sforzo**, non in un predicato piu' furbo.


---

## 21. Lo specchio riaggancia le spunte e **non** gli annullamenti: meta' della traccia d'autore non e' un'eccezione di stato — **CHIUSA il 2026-08-24**

- **Trovata:** piano 58-11, esecuzione di `P-58-A` e `P-58-B`, 2026-08-22,
  eseguendo il passo 20 dopo averne dichiarato il rischio al passo 10
- **Il fatto, misurato e non dedotto.** Prima del `--apply` del passo 20 il
  catalogo portava **1** voce di checklist con un autore e **0** spuntate; dopo,
  **0 e 0**. La riga non era spuntata: portava l'**annullamento** di una spunta
  — attore e nome pieni, istante vuoto — messo dalla superficie alle 19:49:47Z
  di quel giorno.
- **La causa, per ispezione e in una riga.** Il riaggancio raccoglie lo stato da
  rimettere con un filtro solo: *una voce che nessuno ha spuntato non porta
  stato e non viene raccolta*. Un annullamento ha l'istante vuoto, quindi cade
  esattamente in quel ramo — e sparisce con la rimozione, che porta via l'intera
  checklist dello scopo.
- **Perche' non e' un dettaglio, ed e' la meta' che conta.** La migration che
  scrive la spunta dichiara il contrario **per iscritto**: *«THE TICK IS
  REVERSIBLE: `p_ticked = false` clears `ticked_at` and re-records the author, so
  the trace answers who last decided, in both directions»*. Cioe' il prodotto
  dichiara che l'annullamento **e' un atto con un autore**, e lo specchio ne
  conserva una direzione sola. Le due affermazioni non possono essere entrambe
  vere, e finche' lo sono e' il documento a mentire, non il codice.
- **Cosa costa oggi, misurato.** Una riga. E' l'unico annullamento che esista in
  produzione, ed e' stato **rimesso a mano** al passo 15 con i valori originali,
  per chiave stabile e **mai** con la funzione che ri-registra l'autore. Il
  costo cresce con l'uso della superficie, non con il tempo: ogni casella tolta
  e poi specchiata perde il proprio *chi l'ha tolta*, in silenzio e senza che
  nessun conteggio del referto cali — il referto conta **spunte**, e un
  annullamento per lui vale zero prima e zero dopo.
- **E c'e' un secondo effetto, piu' sgradevole del primo.** La **guardia della
  corsa non presidiata** legge la stessa lista: *«at stake N + M»*. Con un
  annullamento a rischio e nient'altro, `N` vale `0`, la guardia risponde `ok` e
  **una corsa non presidiata passerebbe** portandosi via la traccia. La guardia
  esiste per proteggere *«l'unico dato che nessun feed sa ricostruire»*, e il
  calendario non sa chi ha tolto una casella allo stesso modo in cui non sa chi
  ne ha messa una.
- **Non riparata perche':** la regola di perimetro. Il filtro sta nel
  riconciliatore, che questo piano non tocca — e sceglierne un altro non e' una
  correzione ovvia ma **una decisione**: raccogliere ogni voce che porta un
  attore fa entrare nel percorso di rientro righe che oggi non ci entrano, e
  cambia cosa significa *stato* per lo specchio. Va decisa dove vive quella
  definizione, non dentro l'esecuzione di una procedura.
- **Come si chiude:** o il riconciliatore raccoglie **anche** le voci con un
  attore e nessun istante — e allora la guardia le conta, e la riparazione e'
  una sola — oppure il prodotto smette di dichiarare l'annullamento un atto, e
  la frase della migration si corregge. **Una delle due, non nessuna:** oggi il
  repo afferma una cosa e ne fa un'altra.

### ⇢ CHIUSA il 2026-08-24, riparazione 58-16 — strada scelta: la prima

**Il riconciliatore raccoglie anche le voci con un attore e nessun istante, e la
guardia le conta.** E' la prima delle due strade che questa voce nominava: il
prodotto continua a dichiarare l'annullamento un atto, e adesso lo specchio lo
tratta come tale invece di smentirlo in silenzio.

#### 1. La misura d'apertura, presa PRIMA di riparare

Dal catalogo con `read_only: true`, sull'intera tabella e per chiave di
calendario:

| forma della riga | quante |
|---|---|
| con istante (una spunta) | **0** |
| **con attore e senza istante (un annullamento)** | **1** |
| con il solo nome e nient'altro | 0 |
| nessuna traccia — nessuno l'ha mai toccata | 84 |
| **totale voci di checklist** | **85** |

L'unica traccia viva sta sotto la chiave `rsnt`, cioe' **dentro** lo scopo che
uno specchio di quella chiave cancella. Legami: **0**. E la funzione di spunta,
riletta dal catalogo e non dal file, conferma le due meta' del contratto: una
sola istruzione per entrambe le direzioni, e l'attore ri-registrato in tutte e
due.

Zero righe portano un istante senza attore, il che dice quale delle due colonne
e' la discriminante: **l'attore**, mai l'istante.

#### 2. Il difetto riprodotto e rimisurato sulla sorgente vera

Stessa corsa a vuoto, stessa chiave, una sola differenza — il raccoglitore
riportato alla forma che aveva prima, **asserito mutato sul disco** e ripristinato
dai byte salvati:

| | referto |
|---|---|
| **con il raccoglitore di prima** | `puts back 0` · `at stake 0 decision(s) + 0 link(s)` · `✓ admitted — nothing at stake that a second pass could not put back` |
| **dopo la riparazione** | `puts back 1 — 0 ticks, 1 UNTICK` · `at stake 1 decision(s) + 0 link(s)` · `⚠ an unwatched run would REFUSE here` |

La riga di sinistra e' cio' che il cron del piano 58-12 avrebbe incontrato la
prima notte: **ammesso, su una traccia che sarebbe sparita.**

#### 3. Cosa e' cambiato, e perche' in quella forma

- **L'assenza di istante e' diventata una FORMA.** `ChecklistDecisionRestore`
  porta `decision: "ticked" | "unticked"`, e l'invariante *«annullata se e solo
  se l'istante e' nullo»* si stabilisce in **un punto solo** — il raccoglitore.
  Tre lettori avevano interrogato una colonna su una domanda a cui non risponde;
  adesso chiedono la direzione a un campo che la porta.
- **La condizione guarda l'attore.** Cio' che significa *nessuno ha mai deciso
  qui* e' l'assenza di un attore, non l'assenza di un istante. La condizione
  copre tutte e tre le colonne di traccia e sbaglia verso il raccogliere:
  raccogliere di piu' costa una scrittura che rimette cio' che c'era gia',
  raccogliere di meno costa una riga che nulla ricostruisce.
- **La guardia conta cio' che si perderebbe.** `ticksAtRisk` e' diventato
  `decisionsAtRisk`, e riceve la **lunghezza della stessa lista** che lo
  scrittore rimette. Non sono due predicati: sono due letture di **una fonte**,
  ed e' la proprieta' che tiene insieme la regola *«una corsa che non
  rimetterebbe qualcosa dev'essere una corsa che la guardia rifiuta»*.
- **Il referto separa le due direzioni** in ogni punto in cui prima ne nominava
  una sola. Un conteggio che diceva *«N of those items carry a tick»* diceva zero
  su un calendario che tiene la decisione di una persona.

#### 4. Il gate, e cosa la mutazione ha provato

`verify-mirror-guards.mjs` guadagna la famiglia **3-bis**, `U12`-`U16`, che e' la
meta' che i casi `U5`-`U11` non potevano coprire: quelli misurano un predicato che
riceve due numeri, e **sono stati verdi per tutto il tempo in cui il conteggio era
cieco**. I nuovi chiamano il riconciliatore su righe costruite nel file e passano
alla guardia `plan.decisionsToRestore.length`, mai un numero scritto a mano.

Quattro mutazioni, ognuna **asserita applicata sul disco prima di leggerne
l'esito** e ripristinata **dai byte salvati** con lo sha riconfrontato — mai
`git checkout`:

| mutazione | esito |
|---|---|
| il raccoglitore torna a guardare il solo istante | rossi `U12`, `U15` |
| il raccoglitore raccoglie tutto | rossi `U14`, `U16` |
| la direzione e' sempre «spuntata» | rosso `U12` |
| la guardia guarda solo i legami | rossi `U5`, `U10`, `U11`, `U15` |

La prima e' esattamente il codice di prima: **il gate lo prende**.

#### 5. L'istantanea cambia forma, e le vecchie restano leggibili

Il campo si chiama `decisions` e il marcatore e' passato a `mirror-state-2`,
**per la prima volta**. I campi di una voce sono gli stessi; a cambiare e' *quali
righe* ci sono dentro, che e' un cambio di **significato** — e un lettore che
indovinasse avrebbe ragione su un file e torto sull'altro.

Il rientro accetta **entrambi** i marcatori e deriva la direzione dall'istante,
con un ramo solo. Le istantanee gia' su disco sono la via di ritorno delle corse
morte prima del cambio: renderle illeggibili per avere un nome piu' pulito
costerebbe proprio la riga che nient'altro sa ricostruire.

E il rientro guadagna una regola che prima non gli serviva: **un annullamento non
scavalca mai una traccia gia' presente.** Senza istante, due annullamenti sulla
stessa casella sono indistinguibili per ordine, quindi se la riga porta gia' un
attore o e' quello stesso — e riscriverlo non aggiunge niente — o e' posteriore
allo schianto, e riscriverlo cancellerebbe chi ha deciso dopo.

#### 6. Cosa questo sblocca, e cosa no

- **Sblocca il piano 58-12.** Il cron e' la corsa non presidiata per
  definizione, e fino a oggi la guardia che dovrebbe fermarlo rispondeva `ok` sul
  caso vivo. Adesso rifiuta.
- **Non sblocca `R15`.** `MIRROR_RESTORE_PATH_VERIFIED` resta `false`: nessuno ha
  ancora visto il rientro rimettere davvero una riga. La voce **3** non cambia
  stato, e la voce **20** — l'evidenza di presidio che si procura allocando un
  terminale — resta aperta per la stessa ragione che lei stessa dichiara.
- **Non tocca la voce 13, punto 1.** Cancellare e riscrivere `rsnt` con una
  traccia viva resta un'autorizzazione del proprietario.

**Verifiche:** `npm run build` verde. `npm run verify` — 23 controlli passati, un
solo rosso ed e' quello della **voce 12**, che precede questa riparazione e sta in
un file che non e' stato toccato. `npm run verify:ics` verde. `npm run
verify:mirror-guards` verde, con i cinque casi nuovi.

**Questa voce e' chiusa.** Cio' che ha prodotto e che non era suo sta nella
**voce 22**.

---

## 22. Una ri-emissione di `COMMENT ON FUNCTION` aveva cancellato due frasi che non stava correggendo

- **Trovata:** riparazione 58-16, 2026-08-24, leggendo `obj_description` dal
  catalogo con `read_only: true` per verificare se la frase che la voce 21 cita
  fosse davvero quella spedita
- **Il fatto, in due numeri.** Il commento **in catalogo** e' lungo **968**
  caratteri e **non contiene** *«who last decided, in both directions»*. Quello
  nel file di `20260815120100` e' lungo **1129** e la contiene. La voce 21 aveva
  citato il secondo credendolo il primo, e nessuno se n'era accorto.
- **La causa, letta dai file e non dedotta.** `20260815120200` — la migration che
  chiude la funzione con un `REVOKE` — ha **ri-emesso l'intera stringa** per
  spiegare il proprio intervento, e ri-emettendola ha lasciato cadere **due frasi
  che non stava correggendo**: quella sulla reversibilita' e quella su
  `production.read`. `COMMENT ON FUNCTION` **imposta** un valore, non ne aggiunge
  uno: una ri-emissione che omette una clausola la cancella.
- **Perche' conta piu' di un commento.** Il commento in catalogo e' cio' che
  legge chi ispeziona il database senza avere il repo davanti — ed e' la forma in
  cui questo progetto scrive i propri contratti. Un contratto che sparisce da
  dove lo si va a cercare e' peggio di uno sbagliato: non c'e' niente da smentire.
- **Perche' e' una classe e non un caso.** Nessun controllo di questo repo
  confronta un `COMMENT` in catalogo con quello che l'ha scritto. La stessa forma
  di perdita puo' essere gia' avvenuta su qualunque altra funzione ri-commentata
  in avanti, e nessuno lo saprebbe.
- **Cosa e' stato fatto:** `supabase/migrations/20260824120000_checklist_tick_reversible_comment.sql`,
  in avanti e senza toccare i due file applicati, rimette la frase e le aggiunge
  il **secondo custode** — lo specchio, che cancella la riga e la riscrive, e che
  fino alla riparazione 58-16 non la onorava.
- **⚠ Non applicata.** Il file e' scritto e dichiara di esserlo: applicarlo e' un
  atto su produzione, e la riparazione 58-16 era autorizzata a leggere il
  catalogo e a cambiare codice. Non scrive nessuna riga, nessuna policy e nessun
  grant — una descrizione, idempotente, su una funzione — ma **finche' nessuno la
  applica, il catalogo resta come misurato sopra.**
- **Come si chiude, e sono due cose:** **(1)** qualcuno applica quella migration,
  e rilegge `obj_description` per confermarlo — con lo strumento della lettura,
  che e' diverso da quello che ha prodotto l'effetto; **(2)** la frase *«nessun
  controllo confronta un commento con il file che l'ha scritto»* diventa falsa,
  oppure resta vera e scritta. La seconda **non e' di questa fase** e non si
  improvvisa: e' un gate nuovo, e un gate che nasce per un caso e' un gate che
  misura un caso.

---

## 11-bis. La superficie: la strada (1) ha sciolto il blocco, la (2) resta aperta e conta ancora

- **Aggiornamento della voce 11**, piano 58-11, 2026-08-22
- **Cosa si e' chiuso.** La **strada (1)** — il ruolo che possiede la chiave di
  sezione preme la casella e lo riferisce — e' stata percorsa: il passo 11 di
  `P-58-A` porta le sue due osservazioni, e `P-58-A` e `P-58-B` sono eseguite per
  intero. `ICS-03` e `ICS-03b` hanno l'evidenza di una procedura.
- **Cosa NON si e' chiuso, e va detto invece che arrotondato.** La superficie
  **resta irraggiungibile da chi esegue**, rimisurata quel giorno in due letture
  indipendenti: una richiesta anonima alla pagina del calendario risponde
  `307 → /login`, e l'unico browser su questa macchina, aperto su quella pagina
  con la propria sessione, e' atterrato su `/login`. Nessuna sessione e' stata
  coniata: sarebbe un atto con un'autorizzazione propria, e nessuno l'ha data.
- **Cosa questo lascia scoperto, per nome.** Tre `Result` — passi 14, 19 e 24 —
  dichiarano una **seconda lettura non presa**. In tutti e tre il contatore di
  controllo vorrebbe la superficie perche' l'azione e' passata dal catalogo; e'
  stato preso da uno strumento diverso ma dallo stesso lato — si scrive con il
  client di servizio, si legge con la Management API in sola lettura. Sono due
  credenziali e due endpoint, **non** due lati.
- **Perche' conta ancora.** La strada (2) sblocca **ogni futura esecuzione
  presidiata**, non solo questa: finche' non esiste, ogni procedura che chieda di
  guardare una superficie di produzione si chiudera' con la stessa riga.
