# Expert Persona Architecture — Changelog

Tutte le modifiche rilevanti all'architettura di prompt di re:sonate.
Formato: [Semantic Versioning](https://semver.org/)

## [1.10.0] - 2026-08-10

### Added — `src/lib/venue-reveal/**` entra nei `paths:` di `venue-secrecy` (fase 37, piano 09)

Il piano 37-09 ha estratto il cuore della rivelazione — le tre query dei
destinatari, la deduplicazione per email, i lotti e la marcatura — da
`src/app/api/cron/venue-reveal/route.ts` a
**`src/lib/venue-reveal/reveal-party-venue.ts`**, perche' il percorso manuale
del piano 37-10 e il cron devono spedire dallo stesso codice: due copie della
deduplicazione significano **due numeri diversi per lo stesso atto
irreversibile**.

Nessun `paths:` copriva `src/lib/venue-reveal/**`. Il modulo `venue-secrecy`
elencava `src/app/api/cron/venue-reveal/**` e altri cinque glob, tutti sotto
`src/app/` e `src/emails/`: **il file piu' critico della fase sarebbe nato fuori
dal raggio del proprio gate**, che e' il difetto che `ai-engineering.md` (gate
*un gate deve poter caricarsi*) descrive come gia' avvenuto in questo repo fino
alla v1.4. Un gate giusto agganciato al path sbagliato e' indistinguibile da un
gate assente, con l'aggravante che sembra presidiato.

Tre modifiche coordinate, nello stesso commit che crea la directory:

- **`venue-secrecy.md`** — `paths:` += `src/lib/venue-reveal/**`, in testa alla
  lista: e' il cuore, non un satellite;
- **`CLAUDE.md`** — la riga di indice del dominio Venue Secrecy allineata allo
  stesso insieme di glob (controlli **B** e **C**);
- **`meta-gates.md`** — una riga nella tabella di priorita' per
  `src/lib/venue-reveal/**`, con `venue-secrecy` primario e
  `comms-analytics, ticketing-payments` supplementari. La tabella e' un secondo
  indice e il controllo **G** pretende che il primario si carichi davvero li'.

### Changed — il gate *percorsi enumerati* rifatto leggendo il codice

Il gate dichiara di se' che la sua lista e' **datata per costruzione** e chiede
di rifarla, non di ricordarla. Rifatta il 2026-08-10 con `grep` su `src/`, non a
memoria. Tre differenze rispetto alla lista del 2026-08-05:

1. **Entra** `src/lib/venue-reveal/reveal-party-venue.ts`, marcato come l'unico
   posto che spedisce, coi suoi due chiamanti nominati accanto;
2. **Esce** `(public)/venues/[slug]/page.tsx`: non esiste piu' — la pagina delle
   sedi e' una superficie di lavoro (D-37-23), e oggi vive sotto
   `admin/(work)/venues/**`, che la lista ora nomina;
3. **Dichiarato invece che taciuto**: `(public)/tickets/[id]/page.tsx` mostra
   l'indirizzo e **nessun `paths:` di questo modulo lo raggiunge**. Non e' stato
   allargato in questo commit — sarebbe stato un secondo glob fuori dal
   perimetro del piano — ma una lista che nomina un file su cui il gate non si
   carica deve dirlo, o e' esattamente il «sembra presidiato» che il gate sopra
   condanna. **Debito dichiarato, con la sua data.**

### Context budget — 152 token spesi dei 957 disponibili

Misurato con `npm run verify:persona`, non stimato. Il caso peggiore **non ha
cambiato file**: resta `src/app/(public)/events/EventTabs.tsx`, dove
`venue-secrecy` si carica insieme a `nextjs-architecture` e
`ticketing-payments`.

| | v1.9.0 | v1.10.0 |
|---|---|---|
| File peggiore | `src/app/(public)/events/EventTabs.tsx` | invariato |
| Byte | 39.756 | **40.302** |
| Token | 11.043 | **11.195** |
| Margine sul tetto di 12.000 | 957 | **805** |

I 152 token si spartiscono cosi': ~120 la rienumerazione del gate *percorsi
enumerati*, ~25 la riga nuova della tabella di `meta-gates.md` (che si carica su
**ogni** file), ~8 il glob aggiunto all'indice. Nessuna prosa e' stata tagliata
per compensare, e la ragione va scritta invece che sottintesa: il gate *context
budget* dice di tagliare la **descrizione** e non la regola, e qui i 152 token
**sono** regola — una lista di percorsi di fuga e una riga di routing. Tagliare
descrizione altrove per far quadrare un numero avrebbe scambiato una perdita
reale con un guadagno contabile.

**805 token restano per il piano 37-10**, che tocca lo stesso dominio.

### Scenario di carico e scatto (`ai-engineering.md`, gate *eval*)

Obbligatorio per ogni modulo modificato, perche' nessun test puo' girare.

**File reale:** `src/lib/venue-reveal/reveal-party-venue.ts`.

**Cosa deve caricarsi:** `CLAUDE.md`, `meta-gates.md`, `venue-secrecy.md` —
verificato dal controllo **G**, che sulla riga nuova pretende che
`venue-secrecy` si carichi davvero su quel glob. Prima di questo commit si
caricavano solo i primi due, e il modulo che governa la rivelazione **non era
fra questi**.

**Modifica-tipo che deve far scattare un gate:** sostituire il valore di ritorno
di un lotto caduto con un `console.error` e un `continue` — cioe' rimettere il
pattern che il cron aveva. Deve scattare **zero fallimenti silenziosi**
(`meta-gates.md`): questo progetto non ha error tracking, quindi il log non
raggiunge nessuno, e un invio parziale che non torna **come valore** e'
indistinguibile da uno riuscito per chi ha premuto.

**Seconda modifica-tipo, sull'altro gate:** riportare la marcatura di
`venue_reveal_sent` da «per lotto» a «da tutti i destinatari a fine ciclo». Deve
scattare *idempotenza del cron* di `venue-secrecy.md` **letto per intero**, non
per la sua prima frase: marcare chi non ha ricevuto nulla non e' marcare «prima
o insieme», e' marcare **al posto di** un invio che non c'e' stato.

## [1.9.0] - 2026-08-10

### Changed — il gate *autorizzazione per destinatario* riscritto (fase 37, D-37-02/03)

`venue-secrecy.md` diceva che la rivelazione e' **per-biglietto e per-RSVP, mai
per-evento**, e che un percorso «a tutti quelli dell'evento» salta il controllo
su chi ha titolo. La fase 37 introduce un **livello 2 che e' per-evento**: un
membro **approvato** vede l'indirizzo in pagina all'apertura della finestra, o
appena qualcuno rivela a mano, **anche senza biglietto ne' RSVP**.

Lasciato com'era, il gate avrebbe segnalato come violazione **il comportamento
voluto**, e la «riparazione» di fra sei mesi sarebbe stata una regressione su un
percorso irreversibile. Riscritto quindi **nello stesso commit** che introduce il
ramo, nella forma di `20260809002000_assignment_acts.sql:110-203`: **il paragrafo
superato resta citato**, e il testo nuovo dice quale dei due governa.

Il gate ora separa **due canali con criteri diversi**, e la separazione e' la
sostanza:

- **la mail resta per-destinatario**, sempre, con la marcatura sulla riga del
  biglietto o dell'RSVP. Nessun percorso puo' spedire «a tutti quelli
  dell'evento»: quel divieto **non e' stato toccato**;
- **la pagina** ha tre livelli, e solo il secondo e' nuovo.

Piu' quattro divieti espliciti (serve `approved`; non esiste livello 2 senza
finestra; la finestra non scende sotto le 25 ore; senza login solo l'indizio) e
tre `Imperative Behaviors` al posto di uno. Quello vecchio — *«When revealing:
check per-ticket / per-RSVP entitlement, never per-event»* — era **ambiguo fra i
due canali**, e ora ne nomina uno per riga.

**Allargamento di una guardia monotona, dichiarato:** il livello 2 rende
`venue_reveal_sent` raggiungibile da un insieme di persone piu' largo. E'
autorizzato da D-37-02, decisione del proprietario del 2026-08-10, presa dopo che
il costo era stato messo per iscritto — piu' persone conoscono l'indirizzo di
quante ne entrano, su sedi da 150–300 posti in spazi privati senza licenza di
pubblico spettacolo.

### Context budget — il caso peggiore ha cambiato file, di nuovo

**Nessun `paths:` e' cambiato**, e il numero si e' mosso lo stesso: la prosa
aggiunta a `venue-secrecy.md` e' bastata a spostare il caso peggiore. Misurato
con `npm run verify:persona`, non stimato:

| | v1.8.0 | v1.9.0 |
|---|---|---|
| File peggiore | `src/app/(admin)/admin/scanner/ScannerClient.tsx` | **`src/app/(public)/events/EventTabs.tsx`** |
| Moduli caricati | CLAUDE.md · meta-gates · access-gating · checkin-offline · nextjs-architecture | CLAUDE.md · meta-gates · nextjs-architecture · ticketing-payments · **venue-secrecy** |
| Token | 10.622 | **11.043** |
| Margine sul tetto di 12.000 | 1.378 | **957** |

La prima stesura della riscrittura misurava **11.225 token** (margine 775) ed e'
stata **accorciata** invece di essere accettata: il gate *context budget* dice che
quando il budget stringe si taglia la **descrizione**, non la regola. Nessuno dei
quattro divieti, nessuna riga della tabella e nessun `Imperative Behavior` e'
stato tolto — solo la prosa che li spiegava due volte.

Il gate chiede anche di **guardare** un cambio di file peggiore invece di
registrarlo soltanto. E' la terza volta (v1.4 la porta, v1.5 la pagina pubblica
dell'evento, v1.7 di nuovo la porta), e questa volta **non e' il prodotto che si
e' spostato**: sono le regole del venue che sono cresciute, sull'unica superficie
pubblica dove `venue-secrecy`, `ticketing-payments` e `nextjs-architecture` si
caricano insieme. **La fase 37 tocca ancora questo file (piano 37-09): i 957
token restanti sono il budget di quel piano, e vanno pesati prima di scrivere.**

### Scenario carica-e-scatta (gate eval)

**File reale nello scope:** `src/app/(public)/events/[slug]/page.tsx` — carica
`venue-secrecy.md` (primario per la tabella di `meta-gates.md`),
`ticketing-payments.md`, `nextjs-architecture.md` e `meta-gates.md`.
**Gate che deve scattare su una modifica-tipo:** una modifica che estenda il
livello 2 **alla mail** — un invio a tutti gli approvati di un evento — viola la
riga *«Nessun percorso spedisce a tutti quelli dell'evento»*, e la viola **anche
dopo l'allargamento**: e' esattamente cio' che la riscrittura doveva preservare,
ed e' la ragione per cui il gate e' stato riscritto invece che cancellato. La
modifica-tipo opposta — un ramo di pagina che apre l'indirizzo a un `pending` —
scatta sulla riga *«Il livello 2 richiede `approved`»*.

## [1.8.0] - 2026-08-10

### Added — quattro gate nati da un incidente reale (fase 36)

Durante la verifica finale della fase 36 un agente ha **cancellato per errore i
due eventi di produzione e, in cascata, 63 righe in sette tabelle**. Eventi e
serate sono stati ripristinati da un'istantanea; le 63 righe no, e il progetto
non ha PITR. La causa: uno snippet cercava i pulsanti di cancellazione
**risalendo il DOM** dal titolo di scarto, e la risalita ha raggiunto un
antenato che conteneva l'intera lista.

Quattro gate in `ai-engineering.md`, ognuno con l'incidente scritto accanto —
perche' un gate senza la situazione che lo fa scattare e' una decorazione:

- **Gate una rimozione si fa per chiave, mai per interfaccia.** Il verso
  dell'errore e' il punto: un selettore troppo largo cancella **di piu'**; una
  chiave primaria sbagliata non trova nulla. Fra i due modi di fallire ne esiste
  uno solo che non distrugge dati.
- **Gate il contatore di controllo non legge la superficie che sta muovendo.**
  Nell'incidente il conteggio leggeva la stessa lista su cui stava cliccando: ha
  visto sparire esattamente quello che si aspettava. Una misura presa con lo
  strumento che ha causato l'effetto e' un'eco, non una misura.
- **Gate un'istantanea prima copre cio' che si tocca, non cio' che si crea.**
  L'istantanea copriva eventi e serate — ed e' la ragione per cui sono tornati —
  ma non le sette tabelle che vi pendevano da un `ON DELETE CASCADE`. Una
  cascata e' un percorso di scrittura che nessuno ha dichiarato: si enumera
  leggendo i vincoli.
- **Gate l'autorizzazione a scrivere in produzione e' un atto, non un
  permesso.** Si consuma una volta, copre cio' che e' stato descritto, e non si
  estende a uno strumento diverso da quello concordato.

Piu' quattro `Imperative Behaviors` corrispondenti.

**Nessun `paths:` e' cambiato**, quindi il caso peggiore del context budget non
si sposta: resta `src/app/(admin)/admin/scanner/ScannerClient.tsx`, che non
carica `ai-engineering.md`. Il budget non e' stato rimisurato perche' non c'era
niente da rimisurare — e questa frase esiste perche' il gate lo pretende
esplicitamente quando un `paths:` si allarga, e qui non si e' allargato.

### Changed — due gate chiusi dalla fase 36, in `production-calendar.md`

- **Il progressivo di MotionLab riparte a ogni sede** (D-36-07, decisione del
  proprietario). Il gate diceva *«non e' deciso»* e rendeva provvisorio ogni
  materiale che mostrasse un progressivo MotionLab. **Adesso il numero si puo'
  stampare.** La conseguenza accettata e dichiarata: con una sede diversa ogni
  volta, ogni edizione e' la n° 001 del proprio spazio. Il **giorno**, invece,
  resta un segnaposto: i due erano aperti insieme e solo uno si e' chiuso.
- **La serie di Nizza si scrive `re:sonate x Perlone`**, con la e normale.
  `production-calendar.md` scriveva `Resonate x Perlone` mentre
  `brand-visual-system.md` impone la e normale ovunque fuori dal logo: due fonti
  che dicevano cose diverse sullo stesso nome, cioe' un errore che prima o poi
  qualcuno stampa. Deciso dal proprietario in fase 36.

### Scenario carica-e-scatta (gate eval)

**File reale nello scope:** un prompt d'agente che chiede di rimuovere righe di
test create in produzione — cioe' `.claude/**`, che carica `ai-engineering.md`
(governa se stesso).
**Moduli che devono caricarsi:** `ai-engineering.md` + `meta-gates.md`.
**Gate che deve scattare su una modifica-tipo:** un prompt che dice *«rimuovi le
righe che hai creato»* senza dire **come** viola il gate *una rimozione si fa per
chiave*; il gate pretende gli id catturati alla creazione e la cancellazione per
chiave primaria. La modifica-tipo che lo fa scattare e' esattamente il prompt che
l'orchestratore ha scritto il 2026-08-10, e che oggi non passerebbe.

## [1.7.0] - 2026-08-10

### Changed — il route group non e' piu' il pubblico (fase 34, D-34-17)

La fase 34 ha collassato i due alberi di lavoro in uno solo e ha **cancellato
`src/app/(organizer)/`**. La persona lo dichiarava in cinque punti, e quei
cinque punti sono corretti **nello stesso commit della cancellazione** — non
per ordine ma per necessita': il controllo **A** (`npm run verify:persona`)
sarebbe andato rosso su due `paths:` morti, e attraverso quello **B** (indice
↔ frontmatter) e **G** (la tabella di priorita' di `meta-gates.md`). Erano i
tre controlli a rischio, e sono tornati verdi con la cancellazione.

**Le cinque correzioni meccaniche:**
- `access-gating.md` e `nextjs-architecture.md` — il glob `src/app/(organizer)/**`
  esce da entrambi i frontmatter
- `CLAUDE.md` — esce dalle due righe corrispondenti dell'indice (**il controllo
  B confronta i due lati: separarli avrebbe fallito da una parte o dall'altra**)
- `meta-gates.md` — la riga della tabella di priorita' resta con il solo
  `src/app/(admin)/**`

**La correzione che conta di piu' e' prosa, non glob.**
`nextjs-architecture.md` diceva *«Quattro route group, e il gruppo **e' il
pubblico»***. Era **vero quando e' stato scritto** — due alberi, e il segmento
nell'URL diceva davvero chi ci stava sopra — ed e' **rovesciato, non tolto in
silenzio**, con la stessa regola di casa che il docblock di
`scanner/page.tsx` gia' applica a una decisione ribaltata. Dopo D-34-02
`admin` in un indirizzo e' **un indirizzo, non un'autorizzazione**: chi
raggiunge una superficie lo vincola `src/lib/routes/capability-routes.ts`, e
**il confine resta la RLS**. Un gate che dicesse a chi legge che mettere un
file in `(admin)` e' una decisione d'accesso, quando non lo e' piu', e'
esattamente il fallimento che `meta-gates.md` registra come **peggio di
nessuna tabella**.

Con la geografia sono cambiati anche il gate e l'imperativo che ripetevano la
stessa cosa (`Gate gruppo = pubblico` → **`Gate il gruppo non autorizza`**), e
la sezione registra ora il gruppo annidato `(work)`, la regola
**R-WORK-ROUTES** — *solo file di rotta ci entrano* — con la sua ragione in una
riga, e il fatto che **`/admin/scanner` sta fuori di proposito**, perche'
nessun layout deve avvolgere la porta.

### Measured — il caso peggiore del context budget ha cambiato file

Rimisurato: **`src/app/(admin)/admin/scanner/ScannerClient.tsx`, 38.240 byte ≈
10.622 token** su un tetto di 12.000 (margine 1.378). Non e' piu'
`EventTabs.tsx`: la fase 34 ha portato tutte le superfici di lavoro sotto
`(admin)`, dove `access-gating` e `nextjs-architecture` si caricano insieme a
`checkin-offline`. Il numero registrato dentro il `Gate context budget` di
`ai-engineering.md` e' aggiornato — una misura datata dentro il gate che
impone di misurare e' la `Gate documentazione datata` applicata a se stessa.

### Scenario carica-e-scatta (obbligo del `Gate eval`)

- **File reale:** `src/app/(admin)/admin/(work)/artists/page.tsx`
- **Moduli attesi:** `CLAUDE.md` + `meta-gates` + `access-gating` +
  `nextjs-architecture`
- **Modifica-tipo:** aggiungere una superficie di lavoro sotto `(admin)` senza
  la sua riga in `capability-routes.ts`
- **Gate che deve scattare:** `Gate il gruppo non autorizza` — e dopo di lui
  `next build`, che rifiuta una rotta dell'unione generata senza binding
- **Cosa NON scatta piu':** nessun gate della persona si carica su
  `src/app/(organizer)/**`, perche' non esiste piu' alcun file li' sotto

## [1.6.3] - 2026-08-05

### Added — `ai-engineering.md`, gate la pianificazione e' pubblica
Scoperto mentre si stava per scrivere lo spec del prossimo milestone:
**`.planning/` e' tracciato, 230 file**. Il Guardrail 5 copriva `docs/` e
`.firecrawl/`; nessuno aveva verificato che la directory dove il workflow
**genera documenti** fosse anch'essa una vetrina.

Conseguenza concreta e immediata: lo spec appena scritto contiene nomi di
persone dello staff e la struttura organizzativa, e il processo standard
avrebbe detto «scrivilo e committalo». **E' stato scritto in `docs/` — che e'
ignorato — e non committato**, con la ragione dichiarata nel file stesso.

Il gate impone tre cose ai documenti in `.planning/`: **ruoli, mai persone**;
niente sedi in trattativa, date non annunciate o line-up non confermate; la
sezione Produzione descritta come **struttura**, mai coi contenuti.

E' `venue-secrecy` applicato agli artefatti di processo: il materiale piu'
delicato di questo progetto non e' il codice, sono le persone e le trattative.

## [1.6.2] - 2026-08-05

### Fixed — Perlone non e' un format
`production-calendar.md` intestava la tabella «I **cinque** format» ed elencava
`RSNT-PRLN` accanto a RSNT, SNST, RMDB e MTNLB. **Sbagliato, corretto
dall'owner:** Perlone e' il **club di Nizza** che ci ospita, e la serata e' una
notte Resonate portata li' — titolo `Resonate x Perlone`, sigla `RSNT-PRLN-###`,
numerazione propria. E' una **serie** di `RSNT`, non una quinta identita'.

L'errore non era innocuo: un format inventato prima o poi si vede assegnare una
palette, un manifesto e una riga in una tabella di database. La correzione e'
arrivata mentre si modellavano i format per il sito, il che dice anche **dove**
questi errori si scoprono — quando qualcuno prova a costruirci sopra.

**Conseguenza sul modello dati** (fase A del prossimo milestone): la sigla non
e' un campo unico ma **formato + codice serie opzionale + progressivo**, con il
progressivo che corre **per serie**. E' la stessa regola gia' scritta nel gate
*una sigla ritirata non si cita* — «una sigla per locale, con progressivo che
corre per locale» — generalizzata dal locale alla serie.

## [1.6.1] - 2026-08-05

### Changed — `time-and-scheduling.md` rispecchia il codice corretto
Il difetto del fuso descritto dalla v1.6.0 **e' stato corretto nel prodotto**
(vedi sotto). Lasciare il modulo che lo descrive come presente sarebbe stato un
falso, e un falso in un gate e' peggio di un'assenza: la sezione ora racconta il
difetto **come storia**, con la regola che ne discende — *un `date` + `time`
letto dal database non si passa mai a `new Date()`, si passa a
`src/utils/datetime.ts`*. Aggiunto quel file ai `paths:` del modulo.

### Il fix, per memoria (modifica al PRODOTTO, non alla persona)
Nuovo `src/utils/datetime.ts`: `EVENT_TIME_ZONE = "Europe/Rome"`,
`partyStartInstant()`, `menuCloseInstant()`, `zonedDateString()`. Sostituiti
**tutti e dieci** i punti che confrontavano una serata con "adesso" — i tre
cron, la pagina pubblica dell'evento, le due server action del menu, quella
dell'organizer, il componente client del menu e il pass Wallet.

`menuCloseInstant()` assorbe anche la regola *chiusura prima di mezzogiorno =
giorno successivo*, che esisteva in **cinque copie** e in una sesta variante
sul client — ognuna leggendo l'ora nel fuso del proprio runtime.

**Guardia monotona — dichiarazione esplicita.** La correzione **anticipa** la
rivelazione del venue rispetto a come si comportava ieri (di due ore d'estate),
perche' ieri partiva in ritardo rispetto all'orario **inteso**. Non e' un
allentamento della guardia: e' il ripristino del momento voluto, `venue_reveal_hours`
prima delle 22:00 **di Torino**. Va dichiarato lo stesso, perche' il gate lo
impone e perche' e' l'unico modo di distinguere una correzione da una deriva.

**Verifica.** `npm run build` verde (typecheck incluso) e prova comportamentale
eseguita con `TZ=UTC`, cioe' nelle condizioni di Vercel: serata d'estate
`22:00` → `20:00Z` (naive dava `22:00Z`), serata d'inverno `22:00` → `21:00Z`,
chiusura `03:00` → l'01:00Z **del giorno dopo**, e il confine dell'ora legale
del 25 ottobre 2026 reso correttamente. Il repo non ha test runner: questa e'
la prova osservabile, ed e' scritta perche' esista.

## [1.6.0] - 2026-08-05

### Il contesto
La v1.5 ha riparato il **routing** e coperto i domini di produzione che
l'artifact governa. Questa versione fa la domanda successiva: **quali
competenze servono alle facce del progetto che nessuno dei due giri ha
guardato?** Ricognizione su configurazione, runtime, storage, deliverability,
lessico e politica di comunita' — partendo da cosa il progetto **fa**, non da
cosa la persona gia' dice.

Tre trovati, tutti verificati sul codice corrente. Nessuno era coperto da un
gate; due sono difetti reali in produzione.

### TROVATO 1 — il tempo e' interpretato nel fuso del server
`venue-reveal/route.ts:36` e `event-reminders/route.ts:36` costruiscono
l'orario della serata con `new Date(\`${p.date}T${p.time}\`)`: **una stringa
senza offset**, quindi letta nel fuso del runtime — su Vercel, **UTC**. Una
serata delle 22:00 italiane vale mezzanotte, e ogni finestra calcolata da li'
slitta di due ore d'estate.

Su un cron **giornaliero** due ore non sono due ore: possono spostare
l'elemento oltre il bordo dell'unica finestra utile, cioe' **rivelare il venue
il giorno dopo** — a serata gia' cominciata. La guardia monotona regge (non
rivela in anticipo), ma il fallimento simmetrico — nessuno sa dove andare — si
vede alla porta. Aggravanti: `event-reminders:27` filtra sul **giorno UTC**, e
le serate `RSNT` **attraversano la mezzanotte** (22:00 → 06:00), quindi "il
giorno dell'evento" e' ambiguo per otto ore.

### TROVATO 2 — moderare un media non lo rende irraggiungibile
Il bucket `event-media` e' **pubblico** (`public: true`, 100 MB —
`supabase/migrations/20260225120000_phase7_media.sql:65`), come
`event-images`, `venue-photos` e `artist-photos`. La moderazione cambia lo
stato della **riga** in `event_media`; l'**oggetto** resta leggibile con
`getPublicUrl`, e il path e' `${eventId}/${userId}/${timestamp}` — **derivabile**,
non segreto. Un contenuto rifiutato e' quindi nascosto, non tolto.

E non esiste alcuna sanitizzazione dei metadati (zero occorrenze di EXIF o
equivalenti): **una foto scattata dentro una secret venue porta le coordinate
dentro il file.** E' un percorso di rivelazione che non passa da nessuna delle
superfici enumerate in `venue-secrecy.md`, perche' non e' codice nostro a
scriverlo.

### TROVATO 3 — "zero fallimenti silenziosi" non ha un destinatario
Nessun error tracking nel progetto (nessuna dipendenza di monitoraggio) e
**nessun rate limiting** — mentre due gate lo davano per necessario. I quattro
cron girano di notte: se falliscono, oggi non lo sa nessuno finche' non si vede
l'effetto. Il principio esisteva; il posto dove l'errore va a finire, no.

### Added — tre moduli
- **`time-and-scheduling.md`** *(con `paths:`)* — fuso, ora legale, finestre dei
  cron, la mezzanotte dentro la serata, gli orari UTC di `vercel.json`. Porta i
  difetti sopra come fatti registrati con `file:riga`, cosi' chi tocca quei
  file li eredita.
- **`media-and-storage.md`** *(con `paths:`)* — i due confini che non
  coincidono (riga con RLS ↔ oggetto in bucket pubblico), EXIF prima della
  pubblicazione, il path non e' una password, il volume come costo, la cache
  che sopravvive alla rimozione.
- **`community-membership.md`** *(manuale, 6° del set)* — **il gating e' il
  prodotto, ma la politica del gating non e' scritta da nessuna parte**: il
  codice esegue referral → ingresso, non-referred → approvazione, e il criterio
  con cui si decide non esiste. Il modulo non lo inventa: **impedisce che si
  formi da solo, una approvazione alla volta**, e chiede il tempo di risposta,
  il testo del rifiuto, la tracciabilita' di chi decide, e il conteggio delle
  corsie che aggirano l'approvazione.

### Added — gate sui moduli esistenti, dove un modulo sarebbe stato di troppo
- `comms-analytics`: due mittenti due funzioni (`noreply@` transazionale,
  `info@` contatto) · la reputazione del dominio e' un asset (SPF/DKIM
  allineati, **DMARC oggi in osservazione `p=none`, quindi non protegge
  ancora**) · **il tracking resta spento**, perche' con esso attivo le mail
  finiscono in Promozioni — scelta gia' pagata con un problema reale · lingua:
  interfaccia in inglese, mail ai membri in italiano.
- `checkin-offline`: la serata ha un **runbook** (dispositivi, account,
  fallback, chi decide) · provato quel giorno su quel dispositivo · il
  fallimento va **visto** dallo staff, unico osservatore esistente.
- `meta-gates`: l'assenza di error tracking come vincolo trasversale — un log
  e' un posto dove nessuno guarda, serve un effetto osservabile.
- `access-gating`: **nessun rate limiting, oggi** — ogni endpoint che risponde
  valido/non valido e' un oracolo gratuito.
- `nextjs-architecture`: metadata e Open Graph — oggi assenti sulle pagine
  evento; quando arriveranno, un'anteprima social e' contenuto pubblico
  cacheato da terzi.
- `brand-visual-system`: **grafia del brand** (`re:sonate` con la e normale, la
  `ɘ` solo dentro il logo; `SunSet`/`RamaDub`/`MotionLab` in CamelCase) e
  **tassonomia dei nomi sull'app** — gli stessi nomi in tre posti, con il
  format come fonte.

### Changed — `nextjs-architecture` non copre piu' `src/app/api/**`
`src/app/**` → i cinque route group piu' i file di root. **Non e' solo budget,
e' semantica**: i gate di quel modulo riguardano confine server/client, route
group e cache — cose delle pagine. Su una route API vince il dominio
funzionale, come `meta-gates.md` gia' dichiarava. Verificato che ogni route API
resti coperta dal proprio dominio.

### G ha funzionato sul campo, non solo in laboratorio
Durante questa stessa sessione, restringendo `nextjs-architecture`, il
controllo **G e' scattato da solo**: la riga generica della tabella dichiarava
`nextjs-architecture` primario anche su `favicon.ico`, `globals.css` e un
`.DS_Store` — copertura promessa e non piu' esistente. La riga e' stata resa
onesta. **E' la prova migliore di una mutazione artificiale: il controllo ha
colto un errore vero, commesso mentre lavoravo.**

### Facce guardate e deliberatamente NON modularizzate
Dichiararlo e' parte del gate *un gate deve poter fallire*:
- **Economia della serata** (costi, cachet, punto di pareggio, prezzo del
  biglietto): il prodotto ha una dashboard finanziaria, ma **nessun materiale
  esiste** — ne' nel repo ne' nel tracker. Un modulo qui sarebbe invenzione. E'
  una **lacuna del tracker**, non della persona, e va segnalata come tale.
- **Sponsorship e partnership**: stesso motivo, un accenno non e' un dominio.
- **i18n**: non esiste un sistema di traduzione e non serve — la regola reale
  ("interfaccia inglese, mail italiano") e' un gate, non un dominio.

### Misure
`npm run verify:persona`: **7/7 verdi**. 16 moduli, 51 glob, nessuno morto.
Context budget: caso peggiore **cambiato di nuovo**, ora
`src/app/api/cron/venue-reveal/route.ts` — 5 file caricati (`CLAUDE.md`,
`meta-gates`, `ticketing-payments`, `time-and-scheduling`, `venue-secrecy`),
**36.184 byte ~ 10.051 token** su 12.000.

Prima di tagliare erano **11.118 (93% del tetto)**. Il gate dice di tagliare la
descrizione e **non alzare il tetto**: tagliati il perimetro di
`nextjs-architecture` sulle route API e la prosa ridondante di `CLAUDE.md`,
recuperando ~1.070 token. Il cron della rivelazione che diventa il caso
peggiore e' coerente: e' il file dove denaro, tempo e segreto si toccano.

### Scenario di carico (gate eval)
- `src/app/api/cron/venue-reveal/route.ts` → `ticketing-payments`,
  **`time-and-scheduling`**, `venue-secrecy`. Modifica-tipo: stringere la
  finestra del cron → **gate la finestra copre il proprio intervallo** e **gate
  lo scarto si somma alla granularita'**.
- `src/components/media/MediaUpload.tsx` → **`media-and-storage`**,
  `nextjs-architecture`. Modifica-tipo: pubblicare l'upload senza spogliarlo
  dei metadati → **gate EXIF prima della pubblicazione**.
- `src/utils/formatTime.ts` → **`time-and-scheduling`**. Modifica-tipo: una
  nuova formattazione con `getHours()` usata sul server → **gate reso dove, con
  che ora**.
- `community-membership` non si carica da solo: scatta a mano su «approvo
  questo utente?» → **gate un criterio scritto, o nessun criterio**.

### Nessuna modifica al prodotto
Toccati solo `CLAUDE.md`, `.claude/**` e `scripts/verify-persona.mjs`
(`MANUAL_MODULES`). **I due difetti dei TROVATI 1 e 2 non sono stati corretti**:
toccano venue e dati personali, quindi sono Critical e richiedono validazione
esplicita prima di agire. Sono registrati nei rispettivi moduli perche' il
prossimo intervento su quei file li trovi davanti.

## [1.5.0] - 2026-08-05

### Il contesto
Ricognizione completa: tutto il codice e tutto il production tracker, per
rispondere a una domanda sola — la persona copre ancora i domini reali del
progetto? **No, per due ragioni diverse**, e nessuna delle due era visibile
leggendo i gate: erano visibili solo misurando dove si caricano e confrontando
i moduli con l'artifact.

### TROVATO 1 — i gate del prodotto non si caricavano dove serve
I `paths:` erano fermi alla geografia di v1.0 (`src/lib/**`, `src/app/api/**`).
Il prodotto ha spostato la logica critica nelle **server action dentro i route
group** e in `src/app/api/drinks/`. Misurato con la stessa logica glob dello
script, **prima** di questa versione:

| File | Moduli caricati |
|---|---|
| `src/app/(public)/tickets/refund-actions.ts` (rimborsi SumUp) | solo `nextjs-architecture` |
| `src/app/(public)/events/[slug]/menu/actions.ts` (checkout drink) | solo `nextjs-architecture` |
| `src/app/(admin)/admin/finance/actions.ts` | solo `nextjs-architecture` |
| `src/app/api/drinks/tokens/route.ts` (rotta pubblica, service client) | solo `nextjs-architecture` |
| `src/app/(admin)/admin/scanner/ScannerClient.tsx` (**la porta**) | solo `nextjs-architecture` |
| `src/app/(public)/events/[slug]/page.tsx` (puo' mostrare il venue) | solo `nextjs-architecture` |

Cioe': **nessun percorso del denaro caricava `ticketing-payments`**, la porta
non caricava `checkin-offline`, la pagina pubblica dell'evento non caricava
`venue-secrecy` — che pure la nomina nel proprio *Before Touching*.

### TROVATO 2 — un secondo indice che nessuno verificava
La tabella «Priorita' di dominio per path» in `meta-gates.md` dichiarava
`access-gating` primario su `src/app/(admin)/**` e `src/app/(organizer)/**`
mentre il frontmatter di quel modulo **non li agganciava**. Il controllo B
copre l'indice di `CLAUDE.md`, non quella tabella: la deriva e' passata.

### Changed — routing riagganciato al codice reale
- `ticketing-payments`: + `src/app/**/tickets/**`, `src/app/**/drinks/**`,
  `src/app/(public)/events/**`, `src/app/**/sales/**`, `src/app/**/finance/**`,
  `src/app/**/payment/**`, `src/app/**/guest-list/**`
- `checkin-offline`: + `src/app/**/scanner/**`, `src/components/scanner/**`
- `venue-secrecy`: + `src/app/(public)/events/**`, `src/app/**/venues/**`,
  `src/components/venues/**`, `src/components/events/**`
- `access-gating`: + `src/app/(auth)/**`, `src/app/(admin)/**`,
  `src/app/(organizer)/**`, `src/app/api/drinks/**`
- `meta-gates.md`: tabella riscritta sul routing reale, 15 → 21 righe.
- Indice di `CLAUDE.md` allineato (controllo B), 10 → 13 righe.

### Added — controllo G in `scripts/verify-persona.mjs`
*La tabella di meta-gates descrive il routing reale.* Per ogni riga, il modulo
**primario** dichiarato deve caricarsi davvero su tutti i file che la riga
possiede — con attribuzione per specificita', cosi' che
`src/app/api/cron/venue-reveal/**` sottragga i suoi file alla riga generica dei
cron senza farla fallire. Dei **supplementari** si verifica solo che il nome
esista: sono domini da consultare, non moduli che devono caricarsi.

### Added — tre moduli, tutti senza `paths:` (gate D)
La ragione e' la stessa dei due esistenti, ed e' **riservatezza, non assenza di
materiale**: il tracker e `.firecrawl/` non devono diventare pubblici. I moduli
portano **i criteri, mai i candidati**.
- **`sound-manifesto.md`** — l'artifact ha una sezione Manifesto che nessun gate
  teneva. SunSet ha un manifesto **scritto e vincolante** (curva BPM per fascia,
  cinque strati, brief fai/evita); RamaDub ha **coordinate dichiarate** senza
  manifesto; Resonate ha un fatto negativo esplicito (**non techno**). Senza
  questo modulo la persona rispondeva *«non e' deciso»* anche dove **lo e'**.
- **`venue-acquisition.md`** — i criteri di scouting pesati **per format** (i
  pesi cambiano: per Resonate domina il carattere, per SunSet l'esterno a ovest,
  per MotionLab la cornice espositiva). Assorbe la sezione che stava in
  `brand-visual-system.md`: scegliere dove suonare non e' sistema visivo.
- **`legal-compliance.md`** — dominio **completamente assente** finora, e
  presupposto dichiarato di tutta la strategia sedi: le dimore private senza
  licenza di pubblico spettacolo richiedono il modello del circolo,
  **associazione culturale con tesseramento**, costituita *prima* delle
  trattative. Il modulo non da' consulenza legale: produce domande da portare a
  un professionista, e lo dice in testa.

### Added — gate nuovi sui moduli esistenti
- `venue-secrecy`: **il capitolato e' un percorso di uscita** — le locandine
  della notte le fa un grafico esterno, e il capitolato esce dal perimetro
  verso un terzo. Percorsi di rivelazione **rienumerati leggendo il codice**.
- `brand-visual-system`: capitolato non file · il colore non si eredita
  (arancio `#FF7A2F` **piatto** per RamaDub; MotionLab resta neutro finche' non
  ha una palette) · tipografia dichiarata (Anton + Space Mono, degrado ad
  Archivo Black) · il piano B senza foto si disegna prima · l'archivio precede
  il listing · lo spazio approva cio' che lo nomina · la grafica non anticipa
  il suono · uno spazio non acquisito non si nomina.
- `production-calendar`: **quattro pezzi, non due** (listing −2, tonight il
  giorno stesso, recap +4, cover podcast 1:1 2000×2000) · il calendario batte
  il tracker · progressivo MotionLab per sede o per format ancora aperto ·
  cadenza corretta (le prime tre date di stagione corrono a 7 giorni, non 14).
- `ai-engineering`: **un gate deve poter caricarsi** — un gate giusto agganciato
  al path sbagliato e' indistinguibile da un gate assente, con l'aggravante che
  sembra presidiato.

### Riservatezza — una correzione, non un'aggiunta
`production-calendar.md` nominava la sede candidata di MotionLab dentro la
rotazione. Il tracker la marca come **possibilita', non accordo chiuso**, e
questo repo e' pubblico: il nome e' stato sostituito con *(sede da acquisire)*.
Nessun altro dato di trattativa e' mai stato committato (verificato in v1.3 su
tutta la history).

### Added — controllo F esteso a `.claude/settings.local.json`
Trovato durante la scansione di riservatezza finale: quel file vive **dentro
`.claude/`, che e' versionato**, memorizza comandi gia' eseguiti — fra cui
ricerche di scouting che nominano una sede — ed era coperto **solo dal
gitignore globale della macchina** (`~/.config/git/ignore`). Mai committato
(verificato su tutta la history), ma su un altro clone non sarebbe stato
ignorato. Ora e' nel `.gitignore` del repo e in `PRIVATE_PATHS`.

### Misure
`npm run verify:persona`: **7/7 verdi**. Context budget rimisurato — **il caso
peggiore ha cambiato file**: non piu' `src/app/api/tickets/checkin/route.ts` ma
`src/app/(public)/events/EventTabs.tsx`, 5 file caricati (`CLAUDE.md`,
`meta-gates`, `nextjs-architecture`, `ticketing-payments`, `venue-secrecy`),
**32.579 byte ~ 9.050 token** su un tetto di 12.000 (era 8.095). Il cambio di
file e' esso stesso un'informazione: la pagina pubblica dell'evento e' ora,
correttamente, **insieme superficie d'acquisto e superficie di rivelazione**.
45 glob su 1.035 file, nessuno morto.

### Prova per mutazione — G
Due mutazioni, **entrambe verificate come applicate prima di leggerne l'esito**:
1. Primario della riga scanner cambiato in `comms-analytics` → **G ✗ da solo**,
   nominando i 3 file scoperti. Ripristinato → 7/7.
2. Riproduzione della deriva storica: rimosso `src/app/(admin)/**` dal
   frontmatter di `access-gating` **e** dall'indice (cosi' B e C restano verdi)
   → **G ✗ da solo**, «*non si carica su 25 file*». Ripristinato → 7/7.
   La seconda e' la prova che conta: e' esattamente l'errore che era in
   produzione fino alla v1.4, e ora ha una guardia.

### Prova per mutazione — F esteso, e un falso negativo evitato
Rimosso `.claude/settings.local.json` dal `.gitignore` del repo → **F resta
verde**. Non perche' il controllo sia rotto: perche' il gitignore **globale
della macchina** copriva comunque il file. Rifatta con `XDG_CONFIG_HOME` e
`GIT_CONFIG_GLOBAL` neutralizzati → **F ✗**, *«esiste ma NON e' ignorato da git
— un `git add -A` lo pubblicherebbe»*. Ripristinato → 7/7.

E' il caso descritto dal gate: la prima lettura avrebbe certificato come
efficace una riga che, su quella macchina, non stava proteggendo nulla. Il
controllo funziona; **serviva isolare l'ambiente per vederlo**.

### Scenario di carico (gate eval)
- `src/app/(public)/tickets/refund-actions.ts` → caricano `CLAUDE.md`,
  `meta-gates`, **`ticketing-payments`**, `nextjs-architecture`. Modifica-tipo:
  marcare un rimborso come terminale sulla sola richiesta → **gate
  riconciliazione**. Prima di questa versione quel gate non si caricava.
- `src/app/(admin)/admin/scanner/ScannerClient.tsx` → `access-gating`,
  **`checkin-offline`**, `nextjs-architecture`. Modifica-tipo: un esito di scan
  che aspetta la rete → **gate offline-first** e **gate feedback immediato**.
- `src/app/(public)/events/[slug]/page.tsx` → **`venue-secrecy`**,
  `ticketing-payments`, `nextjs-architecture`. Modifica-tipo: mostrare
  l'indirizzo quando lo stato di rivelazione non e' determinabile → **gate
  default chiuso**.
- I tre moduli nuovi **non si caricano da soli**: si consultano a mano. Scenari
  di attivazione: «che BPM alle 19 al SunSet» → `sound-manifesto`, gate
  non-scritto non vuol dire non-vincolato. «Mettiamo questo spazio in
  locandina» → `venue-acquisition`, gate una classifica non e' una
  disponibilita'. «Facciamo la data nella villa» → `legal-compliance`, gate
  l'assetto precede la trattativa.

### Nessuna modifica al prodotto
Toccati solo `CLAUDE.md`, `.claude/**` e `scripts/verify-persona.mjs`. Nessun
file sotto `src/` o `supabase/`: `npm run build` non e' il gate di questa
versione, `npm run verify:persona` lo e'.

## [1.4.0] - 2026-08-04

### Il contesto
Prima produzione grafica di **RamaDub**: mascherina per le stories, kit dei
quattro pezzi di ogni data, scelte di lingua e tipografia. Le decisioni prese
in quella sessione erano gia' vincolanti nei fatti — mancavano solo dai gate,
e un gate che non c'e' e' una decisione che il prossimo intervento puo'
disfare senza accorgersene.

### Changed
- **`production-calendar.md` — gate cambio nome con coda** sostituito da
  **gate una sigla ritirata non si cita**. La coda del giovedi' e' chiusa
  (decisione dell'owner, 4 ago 2026): la sigla precedente non esiste piu' e non
  va nominata nemmeno come contesto storico. Il principio generale resta, con
  un'aggiunta che mancava: **la ricognizione si chiude dichiarandola chiusa**,
  altrimenti il gate resta acceso su un lavoro che non esiste.
  Registrato anche il fatto nuovo: **progressivo per locale** (`RMDB-BZ-###`,
  `RMDB-MR-###`), quindi un locale che esce ferma la sua serie e quello nuovo
  parte da 001.

### Added — `brand-visual-system.md`, 5 gate nuovi
- **Gate lo scrim, non la cornice** — foto a tutto campo, due fasce di nero in
  gradiente, testo dentro. Situazione che lo fa scattare: qualcuno imposta una
  storia con il testo direttamente sulla foto, e il martedi' arriva una press
  photo su fondo chiaro.
- **Gate copertina dell'evidenza** — il cerchio ritaglia dal centro (~720x720):
  la copertina e' un pezzo separato. Scatta quando si prova a usare la storia
  del listing come copertina della raccolta.
- **Gate niente logo del locale** — il locale si nomina in tipografia. Scatta
  quando un locale manda il proprio logo e lo si vorrebbe mettere "per
  cortesia": e' cortesia, non obbligo d'accordo, e un logo altrui cambia forma
  a ogni cambio di sede.
- **Gate lingua dei materiali** — inglese britannico, `Thursday 18 Sept`,
  orario 24h; `aperitivo` e il nome del locale non si traducono. Scatta al
  primo `September 18` o `6PM`.
- **Gate handle mai stampati** — dj e locale con il tag nativo. Scatta quando
  si stampa `@nomedj` nella grafica, perdendo il tag cliccabile che genera il
  repost.

### Misure
`npm run verify:persona`: **6/6 verdi**. Context budget rimisurato — caso
peggiore `src/app/api/tickets/checkin/route.ts`, 5 file, **29.143 byte ~ 8.095
token** su un tetto di 12.000. I due moduli toccati sono **senza `paths:`**
(consultazione manuale), quindi non entrano nel caso peggiore: la crescita
misurata viene dai moduli gia' agganciati, non da questa modifica.

### Scenario di carico (gate eval)
File reale: `src/emails/venue-reveal.tsx` -> caricano `CLAUDE.md`,
`meta-gates.md`, `venue-secrecy.md`, `comms-analytics.md`.
`brand-visual-system.md` **non** si carica: e' manuale, e va consultato a mano
ogni volta che si parla di materiali, sigle o locandine. Modifica-tipo che deve
far scattare un gate: una storia RamaDub con il testo direttamente sulla foto e
l'handle del dj stampato -> **gate lo scrim** e **gate handle mai stampati**.

## [1.3.0] - 2026-08-04

### Il contesto, perche' spiega tutto il resto
Era in corso l'aggancio dei due moduli di produzione a `docs/`, per farli
caricare automaticamente. Due accertamenti hanno ribaltato l'operazione:

1. **`github.com/edmiribrahimi/Resonate` e' PUBBLICO** (`gh repo view`:
   `isPrivate: false`). Committare `docs/` non era versionare: era
   **pubblicare**.
2. **I dati di produzione devono restare non pubblici** (decisione
   dell'owner).

L'aggancio e' stato **revocato**. Il caricamento automatico e' una comodita';
una pubblicazione su repo pubblico e' irreversibile — resta nei fork, nelle
cache e nella history anche dopo la rimozione.

### Added
- **Controllo F** in `scripts/verify-persona.mjs` — *il materiale di produzione
  resta fuori dal repo pubblico*. Due clausole **indipendenti**, entrambe
  necessarie:
  - se `docs/` o `.firecrawl/` esistono su disco, git deve ignorarli;
  - nulla al loro interno deve essere **gia' tracciato** — `.gitignore` non
    rimuove dall'indice cio' che c'e' gia', e credere il contrario e' il modo
    tipico in cui un dato resta esposto dopo che "e' stato ignorato".
- **`.gitignore`**: `docs/` e `.firecrawl/`, con la ragione scritta accanto.
- **Guardrail 5** in `CLAUDE.md` — il repository e' pubblico; ogni commit e'
  una pubblicazione irreversibile.
- **Gate riservatezza prima della comodita'** in `ai-engineering.md` — quando
  caricamento automatico e riservatezza sono in tensione, vince la
  riservatezza. 13 → 14 gate.

### Verifica preventiva sull'esposizione
Prima di qualsiasi decisione, la history pubblica e' stata ispezionata per dati
di produzione gia' committati: `git log --all --name-only` filtrato su
`.ics`/`calendario`/`firecrawl`/`scouting` restituisce **solo file sorgente**
(gestione venue, migration, `venue-secrecy.md`). **Nessun dato di produzione e'
mai stato committato**, e il commit `e3e475e` non ha toccato ne' `docs/` ne'
`.firecrawl/`.

Ispezionato anche il contenuto di `docs/` prima di scartarlo: **0 campi
`LOCATION`, 0 indirizzi civici, 0 occorrenze di "secret", 0 contatti** su 163
eventi. Il materiale era in se' pubblicabile — la decisione di non pubblicarlo
e' stata presa comunque, ed e' quella che conta.

### TROVATO, e ha impedito un aggancio sbagliato
`docs/calendario-produzione.html` porta `<title>Resonate — Calendario ago 2026
→ lug 2027</title>` e contiene **zero** occorrenze di `Manifesto`, `Visual`,
`Location`, `Checklist`, `palette`, `scouting`. **E' la sola sezione
Calendario**, non l'artifact completo da 311 KB.

Quindi anche senza il vincolo di riservatezza, `brand-visual-system` **non
poteva** essere agganciato a `docs/`: si sarebbe caricato su file che non
contengono il suo argomento. Non un path morto — un path **fuorviante**, che il
controllo A non avrebbe potuto rilevare perche' i file esistono.

### Prova per mutazione — F
`.gitignore` commentato → **F ✗ da solo**, nominando entrambe le directory con
la conseguenza esplicita (*"un `git add -A` lo pubblicherebbe"*). Ripristinato
→ 6/6. Mutazione verificata come applicata prima di leggerne l'esito.

### Changed
- **`production-calendar.md`** e **`brand-visual-system.md`** — l'assenza di
  `paths:` non e' piu' motivata come "il materiale non e' nel repo" ma come
  **decisione di riservatezza**. Se un giorno servisse l'aggancio, la strada e'
  un repo privato separato, mai versionare qui.
- **`ai-engineering.md`** — il Gate sul set senza paths cita la ragione vera.
- **`scripts/verify-persona.mjs`** — 5 → 6 controlli.

### Verifica eseguita
`npm run verify:persona` → **6/6 verdi**, exit 0.

## [1.2.0] - 2026-08-04

### Added
- **`scripts/verify-persona.mjs`** — zero dipendenze, ESM puro. Cinque controlli
  meccanici, exit non-zero al fallimento.
- **`package.json`**: `"verify:persona": "node scripts/verify-persona.mjs"`.
  E' il **primo e unico comando di verifica automatica del repo**.

| # | Controllo | Cosa impedisce |
|---|---|---|
| **A** | Nessun path dichiarato e' morto | Un modulo che sembra attivo e non carica nulla |
| **B** | Indice `CLAUDE.md` ↔ frontmatter dichiarano gli stessi glob | Documentazione che promette uno scope diverso da quello reale |
| **C** | Ogni modulo ha una riga nell'indice | Un modulo aggiunto e mai indicizzato |
| **D** | Il set senza `paths:` e' quello dichiarato | Che la disciplina consultabile-a-mano cresca in silenzio |
| **E** | Context budget entro il tetto pre-registrato | Che il prompt si gonfi senza che nessuno se ne accorga |

### Non agganciato a `next build`, deliberatamente
re:sonate spedisce serate. Bloccare un deploy la sera di un evento perche' una
riga di tabella markdown e' andata in deriva sarebbe uno scambio pessimo. Il
comando si esegue quando si tocca la persona — che e' quando serve.

### Prova per mutazione — tutti e cinque
Ogni controllo e' stato rotto deliberatamente e verificato scattare, poi
ripristinato. **Ogni mutazione e' stata verificata come applicata prima di
leggerne l'esito** (vedi sotto perche').

| Mutazione | Esito |
|---|---|
| `src/inesistente/**` aggiunto a `supabase-data` | **A** ✗ (e B, correttamente) |
| Glob dell'indice di `Venue Secrecy` alterato | **B** ✗ **da solo**, con diff dei due lati |
| Riga `AI Engineering` rimossa dall'indice | **C** ✗ (e B) |
| `paths:` aggiunti a `production-calendar` | **D** ✗ (e B) |
| Tetto abbassato a 5.000 token | **E** ✗ **da solo**: `7663 > 5000` |

Le co-attivazioni su B non sono un difetto: ognuna di quelle mutazioni **crea
davvero anche** una divergenza indice/frontmatter. B ed E scattano isolati.

### TROVATO scrivendo lo script, e ora e' un gate
Il primo tentativo di provare **B** e' risultato verde, e sembrava un controllo
rotto. **Non lo era: la sostituzione `perl` non aveva matchato.** Un falso
negativo della prova, non del controllo. Nella direzione opposta lo stesso
errore avrebbe **certificato come funzionante un controllo morto** — che e'
esattamente il modo in cui nasce un gate teatrale.

Aggiunto **Gate prova per mutazione** ad `ai-engineering.md`: asserisci che la
mutazione sia stata applicata prima di leggerne l'esito.

### Changed
- **`ai-engineering.md`** — le clausole 2 e 3 del Gate instruction architecture
  passano da prosa a eseguibili e citano il comando; marcate esplicitamente
  quali clausole **restano solo umane** (coerenza cross-dominio e changelog);
  Gate eval ora impone il comando verde piu' lo scenario scritto; nuovo Gate
  prova per mutazione. 12 → 13 gate.
- **`CLAUDE.md`** — Guardrail 1 riformulato: "nessun test runner **per il
  prodotto**", con l'eccezione dichiarata e il suo perimetro.
- **`meta-gates.md`** — il gate di verifica include il comando quando si tocca
  la persona.

### Il limite, detto in chiaro
Un verde 5/5 significa **"la persona e' coerente"**, non "la persona e'
corretta". Nessuno script legge il significato di un gate: la coerenza
cross-dominio e la qualita' delle regole restano giudizio umano. Scritto nel
modulo e stampato dallo script a ogni esecuzione, perche' un comando verde
diventa un timbro nel momento in cui si dimentica cosa non copre.

### Verifica eseguita
`npm run verify:persona` → **5/5 verdi**, exit 0. Caso peggiore calcolato su
**tutti i 1005 file** (non su sonde): `src/app/api/tickets/checkin/route.ts`,
5 file caricati, 27.587 byte ≈ **7.663 token**, tetto 12.000.

## [1.1.0] - 2026-08-04

### Added
- **`ai-engineering.md`** — `paths: "CLAUDE.md"`, `".claude/**"`. Il dominio che
  governa la persona stessa, assente in 1.0.0. **Modificarlo lo carica.** 12 gate.

### Perche' era un'omissione, non un'opzione
La 1.0.0 ha introdotto un changelog versionato, un indice dei domini e una regola
sui moduli senza `paths:` — **e nulla obbligava nessuno a mantenerli**. Erano
convenzioni inventate e lasciate senza guardia. Su un repo con test la deriva
sarebbe rumorosa da sola; qui non c'e' un test runner, quindi la disciplina
scritta e' l'unica cosa che regge — e non era scritta.

### I gate che non sono un trapianto da QuantumPips
Sette dei dodici sono adattamenti sostanziali, non copie:

- **Gate documentazione datata** *(nuovo)* — nasce dal caso reale di questo
  repo: `.planning/codebase/` e' datato 2026-02-24, tre milestone fa. Citarlo
  senza verificarlo e' un fallimento del Gate hallucination con un passaggio in
  piu': la citazione eredita l'errore senza portarne la responsabilita'.
- **Gate un gate deve poter fallire** *(nuovo)* — nessun gate senza aver
  risposto per iscritto a "quale situazione concreta lo farebbe scattare?".
- **Gate il set senza paths non cresce in silenzio** *(nuovo)* — ogni modulo
  aggiunto al set senza frontmatter e' disciplina che smette di caricarsi da
  sola. Va dichiarato qui, con la ragione.
- **Gate confidenza** — scala di criticita' riscritta per re:sonate: boilerplate
  > presentazione > query > migration/RLS > pagamenti > **accesso e rivelazione
  del venue**. Agli ultimi due gradini l'errore o e' invisibile (un permesso
  troppo largo) o e' irreversibile (un indirizzo pubblicato).
- **Gate prompt security** — riscopo completo. Il prodotto **non contiene alcun
  LLM** (`package.json` non ha dipendenze di modelli): la superficie reale non
  sono i prompt di prodotto ma l'**iniezione indiretta nel contesto
  dell'assistente** — nomi, didascalie, testi di referral, contenuto di artifact.
  Dati, mai istruzioni.
- **Gate eval** — la versione QuantumPips chiede una regression suite con 10 test
  per dominio. **Qui non esiste un test runner, e simularlo a parole sarebbe la
  bugia peggiore.** Sostituito con uno scenario scritto per modulo modificato:
  file reale, moduli attesi, gate che deve scattare.
- **Gate context budget** — la soglia del 50% di QuantumPips non e' stata
  importata: e' stata **misurata** (sotto).

### Changed
- **`CLAUDE.md`** — indice domini 9 → 10 righe.
- **`meta-gates.md`** — una riga nella quick reference, un controllo
  cross-dominio nel pattern di analisi d'impatto.

### Context Budget Verification
Misurato il 2026-08-04, non stimato:

| file sonda | moduli caricati | byte | ~token |
|---|---|---|---|
| `src/app/api/tickets/checkin/route.ts` | 5 | 27.587 | ~7.663 |
| `src/app/api/cron/venue-reveal/route.ts` | 5 | ~27.400 | ~7.600 |
| `.claude/rules/venue-secrecy.md` (percorso persona) | 3 | 23.993 | ~6.665 |
| `src/lib/supabase/middleware.ts` | 3 | 19.858 | ~5.516 |

Il caso peggiore resta il check-in, **invariato dall'aggiunta**: `ai-engineering`
carica solo su `CLAUDE.md` e `.claude/**`, che non intersecano `src/`. Il costo
del nuovo modulo ricade interamente sul percorso persona, dove e' pertinente.

### Eval — scenari scritti, dato che non ci sono test
- **`ai-engineering` carica dove deve**: modificare
  `.claude/rules/venue-secrecy.md` deve caricare `CLAUDE.md` + `meta-gates` +
  `ai-engineering`, e **non** `venue-secrecy` stesso (che copre
  `src/app/api/cron/venue-reveal/**`, non la propria definizione). Verificato:
  3 file, 23.993 byte.
- **Il gate che deve scattare**: aggiungere un modulo nuovo senza la riga
  nell'indice di `CLAUDE.md` viola il Gate instruction architecture, clausola 2.
- **Il gate che ha gia' scattato**: in 1.0.0 la colonna Scope conteneva la
  stringa `paths:` fra backtick, letta come glob dal controllo di coerenza.
  Trovato ed emendato — la clausola 2 non e' teorica.

### Verifica eseguita
- **Path morti**: 0 su 1004 file scansionati.
- **Coerenza indice ↔ frontmatter**: 0 derive. 11 moduli, 10 righe d'indice
  (`meta-gates` e' sempre caricato e non compare).

## [1.0.0] - 2026-08-04

Prima versione. Nessun `CLAUDE.md` esisteva nel repo: `.claude/` conteneva solo
`settings.local.json`. Nulla e' stato sovrascritto.

### Added
- **`CLAUDE.md`** — Response Gate con header di classificazione, 8 Operating
  Principles, 5 Environment Guardrails, classificazione delle richieste, gate
  VERIFICATION.md, indice dei domini.
- **9 moduli dominio** in `.claude/rules/`, piu' `meta-gates.md` sempre caricato:
  - `access-gating.md` — le due assi ruolo/stato, RLS come confine reale, service
    role, redirect validato, entropia degli identificatori — 7 gate
  - `ticketing-payments.md` — mai fidarsi del webhook, idempotenza,
    riconciliazione, confine denaro/contenuto, cron non atomico — 9 gate
  - `checkin-offline.md` — offline-first, coda durevole, doppio scan,
    l'asimmetria falso-rifiuto/falso-ingresso — 9 gate
  - `venue-secrecy.md` — irreversibilita', percorsi enumerati, default chiuso,
    idempotenza del cron, cache — 7 gate
  - `supabase-data.md` — migration in avanti, RLS contestuale (le policy
    PERMISSIVE si sommano in OR), tipi allineati — 8 gate
  - `nextjs-architecture.md` — segreti nel bundle, server action come endpoint
    pubblico, cache esplicita, service worker stale — 8 gate
  - `comms-analytics.md` — una mail non si richiama, errori distinguibili, PII
    negli eventi, consenso — 8 gate
  - `production-calendar.md` — i cinque format, la pipeline e la sua ancora,
    numerazione monotona — 8 gate, **senza `paths:`**
  - `brand-visual-system.md` — `@ Secret Venue`, grid-safe, canale per format,
    i quattro criteri pesati dello scouting — 11 gate, **senza `paths:`**

### Perche' due moduli senza frontmatter
`production-calendar` e `brand-visual-system` governano materiale che **non vive
nel repo**: sta nel production tracker (artifact `re:sonate — Production`, dati
da `Music.ics` aggiornati al 02/08/2026). Dichiarare `paths:
".planning/production/**"` avrebbe creato un modulo che sembra attivo e non
carica nulla — un gate silenziosamente spento e' peggio di un gate assente.
Vanno consultati a mano finche' quel materiale non viene versionato.

### Verifica eseguita
Due controlli meccanici, non a occhio:
- **Path morti** — ogni glob dichiarato nei frontmatter matcha almeno un file
  reale: **0 morti** su 1002 file scansionati.
- **Coerenza indice ↔ frontmatter** — gli insiemi di glob dell'indice in
  `CLAUDE.md` coincidono con quelli dei frontmatter: **0 derive**, 10 moduli,
  9 righe d'indice (`meta-gates` e' sempre caricato e non compare).

Il controllo ha trovato un difetto alla prima esecuzione: la colonna Scope
conteneva la stringa ``paths:`` fra backtick nel testo di nota, e il parser la
leggeva come un glob. Riformulata — la colonna Scope contiene solo glob.

### Fatti verificati contro il codice, non assunti
- **Ruoli**: `master` · `organizer` · `member`; **stati**: `pending` ·
  `approved` · `rejected` (`src/lib/rbac/roles.ts`).
- **RLS**: presente ed estesa, ma **nelle migration** — `supabase/schema.sql`
  ha 0 `ENABLE ROW LEVEL SECURITY` e 0 `CREATE POLICY`.
- **Webhook SumUp**: gia' verifica lo stato via GET all'API checkout ed e'
  idempotente su entrambi i rami.
- **Nessun test runner**: nessuno script `test`, nessun file `*.test.*` o
  `*.spec.*`. Il gate di verifica e' `npm run build` + procedura manuale scritta.
- **`.planning/codebase/` e' invecchiato** (*Analysis Date: 2026-02-24*, contro
  v1.2/v1.3/v1.4 spedite dopo). Verificato voce per voce: il role check nel
  middleware **ora esiste**; `@ducanh2912/next-pwa` e' stato sostituito da
  `@serwist/next`; l'open redirect nel callback e' mitigato dalla
  concatenazione con `origin`. Resta vero: **`src/utils/qr.ts:49` genera i
  codici di membership con `Math.random()`**.
