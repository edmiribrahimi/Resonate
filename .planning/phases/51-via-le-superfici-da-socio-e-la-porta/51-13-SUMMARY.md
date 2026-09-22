---
phase: 51-via-le-superfici-da-socio-e-la-porta
plan: 13
subsystem: supabase-data
tags: [produzione, autorizzazione-datata, migration, deploy, vercel, attendee, account-acts, D-51-04, D-51-14, MEM-01, MEM-02, MEM-03]

requires:
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 08
    provides: "la migration del ruolo `attendee` e delle due chiavi di capability, gia' applicata e riletta sul laboratorio"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 12
    provides: "la migration del codice socio e del registro rinominato, piu' `purge-attendances.mjs`, gia' percorsi fino in fondo sul laboratorio"
  - phase: 51-via-le-superfici-da-socio-e-la-porta
    plan: 14
    provides: "la corsa «dopo» di `P-51-1`, percorsa dal proprietario sul commit `44e8c65` — che e' il codice che questo atto dispiega"
  - phase: 50-via-le-iscrizioni
    plan: "AUTHORISATION"
    provides: "la forma dell'atto: il testo scritto PRIMA della domanda, il perimetro passo per passo, il registro d'uso, la chiusura che dichiara l'esaurimento"

provides:
  - "la produzione allineata al laboratorio: ruolo `attendee`, 15 chiavi di capability, niente codice socio, registro `account_acts`, `attendances` inesistente"
  - "`51-AUTHORISATION.md` ESAURITA con l'ora, i cinque passi, e quattro smentite scritte nella nota d'uso invece che al posto delle righe originali"
  - "`51-ESITI.md`, capitolo «L'atto di produzione» — ogni passo con la sua ora UTC, la sua fonte di rilettura e la differenza fra atteso e osservato"
  - "`verify:capabilities` 5/5 VERDE contro la produzione, dopo essere stato 3/5 rosso"

affects:
  - "51-14 — `51-VERIFICATION.md` puo' citare la produzione invece del solo laboratorio: MEM-01, MEM-02 e MEM-03 hanno ora evidenza su entrambi"
  - "chiunque scriva in produzione dopo il 2026-09-22T19:24:05Z — serve un ATTO NUOVO con la sua data; questo documento e' una ricevuta, non un permesso"
  - "il gate `verify:refusal`, che resta ROSSO contro la produzione con la sua ragione scritta: conia sessioni, e nessuno lo ha autorizzato"
  - "la fase 52 — il debito della porta (`door-tabs-recent-scans-and-alerts`, il ritaglio sotto la tastiera) resta dov'era"

tech-stack:
  added: []
  patterns:
    - "Un `position()` su `pg_get_functiondef` non distingue un letterale da un commento: la rilettura di un corpo di funzione si fa riga per riga, marcando quali righe sono eseguibili"
    - "Una precondizione che cerca chiavi non torna «zero» se il documento che la descrive NOMINA i modelli cercati: uno zero spiegato e' un controllo, uno zero nudo e' una speranza"
    - "Il costo dichiarato di un passo si rimisura PRIMA di spenderlo, non solo prima di chiederlo: fra la domanda e la risposta il ramo si muove, e un costo accettato che non esisteva resta un errore di misura"
    - "Quando uno strumento marca da se' l'autorizzazione solo dopo aver agito, e l'atto non ha soggetti, la marcatura a mano va DICHIARATA — altrimenti sembra che lo strumento l'abbia fatta"

key-files:
  created:
    - ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-13-SUMMARY.md"
  modified:
    - ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-AUTHORISATION.md"
    - ".planning/phases/51-via-le-superfici-da-socio-e-la-porta/51-ESITI.md"
    - ".planning/ROADMAP.md"
    - ".planning/STATE.md"

key-decisions:
  - "`verify:refusal` NON e' stato lanciato: conia sessioni sull'identita' di persone reali, il proprietario non lo ha nominato, e §1.4 poneva la scelta come binaria. Il gate resta rosso CON LA SUA RAGIONE SCRITTA, che e' l'esito previsto e non un passo mancato"
  - "`--apply` del purge NON e' stato lanciato: a zero righe lo strumento esce prima di qualunque `DELETE` in entrambi i modi, e «una decisione senza soggetti non si esegue» e' la doctrina dello strumento stesso. Il `--dry-run` e' cio' che il cancello 3 chiedeva"
  - "Nessun account di prova creato in produzione: §1 mette «account creati a mano» fuori perimetro. Al suo posto, la firma di `reconcile_master` riletta dal catalogo e confrontata col chiamante dispiegato"
  - "Le quattro smentite stanno nella nota d'uso di §6 e non al posto delle righe originali (T-51-58) — compresa quella che il perimetro sbagliava A FAVORE di chi autorizzava"
  - "`spent: yes` messo a mano e dichiarato tale, perche' lo strumento marca solo dopo aver cancellato qualcosa e non ha cancellato niente"

patterns-established:
  - "Un atto di produzione si registra in DUE posti con due granularita': il registro d'uso dell'autorizzazione (una riga per passo, con la fonte della rilettura) e il capitolo di `51-ESITI.md` (ogni ora, ogni numero, ogni differenza)"
  - "L'esaurimento di un'autorizzazione si PROVA rilanciando lo strumento e mostrando il rifiuto, invece di dichiararlo e basta"

requirements-completed: [MEM-01, MEM-02, MEM-03]

duration: ~30min
completed: 2026-09-22
---

# Fase 51 Piano 13: l'atto di produzione — Riepilogo

**La produzione ha il ruolo `attendee`, 15 chiavi di capability, nessun codice
socio, il registro che si chiama `account_acts` e nessuna tabella delle presenze
— dispiegata, migrata e riletta dal catalogo in 12 minuti e 43 secondi, dentro
un solo atto autorizzato, con ZERO righe di dati cancellate.**

## Performance

- **Durata dell'atto:** **12 minuti e 43 secondi** — 2026-09-22T19:11:22Z →
  19:24:05Z
- **Durata del piano (task 3):** ~30 minuti, comprese le precondizioni e la
  chiusura dei documenti
- **Task:** 1 (il task 3; i task 1 e 2 erano gia' chiusi)
- **Passi dell'atto:** **5 su 5, zero falliti**
- **File modificati:** 4 (`51-AUTHORISATION.md`, `51-ESITI.md`, `ROADMAP.md`,
  `STATE.md`) + 1 creato (questo)
- **Verifica:** `npm run build` **exit 0**; `npm run verify:persona` **7/7**;
  `npm run verify:capabilities` **5/5 contro la PRODUZIONE**. **Nessun test
  runner esiste per il prodotto** (`meta-gates.md`), e non si dice il contrario.

---

## I cinque passi, con le ore e l'evidenza

### (a) `git push origin main` e il deploy — 19:11:22Z → 19:13:04.994Z

| Cosa | Valore | Letto da |
|---|---|---|
| Push | `78f4a81..c61760f`, **84 commit** | `git push`, poi `git rev-parse origin/main` |
| Deploy di produzione | **`dpl_F2pAcyhQfbJPx7sjWNyD7T4XHU53`**, sha `c61760f` | **API Vercel**, `target: production`, **non** dal terminale del push |
| `READY` | **19:13:04.994Z** — **1 minuto e 39 secondi** di corsa | stessa lettura |
| `/events` da anonimo | **200** | `curl`, 19:13:22Z |
| `/membership-card` da anonimo | **404** — **la tessera non esiste piu'** | 19:13:22Z |
| `/attendance` da anonimo | **404** — **le presenze non esistono piu'** | 19:13:22Z |

**Precondizioni misurate prima** (19:00Z–19:09Z): build fresco exit 0; persona
7/7 col controllo **F**; **zero** file di `docs/`, `.firecrawl/` o `.env*` nel
diff; **zero** serate nella finestra ieri/oggi/domani; produzione **inerte** —
zero biglietti, zero ordini, zero scansioni, zero serate future.

### (b) La migration del ruolo — 19:15:08.774Z, in 853 ms

`20260922120000_role_attendee_and_capability_keys.sql`, applicata da
`POST /database/migrations` — **mai** `/database/query`.
**Versione coniata: `20260922191508`**, non il timestamp del file (§4.2 (i),
undicesima conferma).

Riletto **dal catalogo** alle 19:15:55Z e 19:17:08Z: i due `CHECK` a quattro
valori con `attendee`; `profiles.role` DEFAULT **`'attendee'::text`**; **0
`member`** e **2 `attendee`** su 4 profili; `private.capabilities` **15**;
`private.role_capabilities` **28**; `party_assignments` **0 prima e 0 dopo** — il
trigger `profiles_release_expired_assignments` e' scattato due volte e **non ha
scritto nulla**, come §1.1 aveva dichiarato. L'ACL delle funzioni ridefinite e'
stata **rimisurata**, non ricordata: conservata.

### (c) La cancellazione — 19:19:13Z → 19:19:15Z, **senza soggetti**

`purge-attendances.mjs --dry-run` contro la produzione, **con il documento
concesso**, che lo strumento legge e verifica prima di toccare qualunque cosa.

**Zero righe su DUE fonti**: Management API **0** (`da_porta` 0, `pre_porta` 0) e
PostgREST con la chiave di servizio **0**. Cascata in uscita **vuota** dal
catalogo. Istantanea scritta prima, in un percorso `.env*` coperto da
`.gitignore` — verificato con `git check-ignore`.

**Nessun `DELETE`, perche' non c'era niente da cancellare.** E' cio' che §1.0
aveva misurato **prima** che la domanda venisse posta: il numero si mette davanti
alla domanda, non a meta' di un runbook.

### (d) La migration del codice socio — 19:20:24.987Z, in 685 ms

`20260922180000_drop_membership_code_and_rename_acts.sql`.
**Versione coniata: `20260922192024`.** La guardia `DO` del passo 7 e' passata
senza sollevare: la tabella era vuota, misurata due volte sette minuti prima.

Riletto **dal catalogo** alle 19:20:57Z e 19:21:51Z: `profiles.membership_code`
**assente**; `public.account_acts` **presente** con **2 righe, 7 vincoli, 3
indici, 1 policy e RLS attiva**; **zero** residui col prefisso `membership_acts`;
`public.membership_acts` e `public.attendances` **inesistenti**; le **quattro**
funzioni vive, tutte `SECURITY DEFINER` con `search_path=""`.

**Il `REVOKE` su `service_role` e' intatto**, letto da `aclexplode(relacl)`: alla
chiave di servizio restano `SELECT`, `REFERENCES`, `TRIGGER`, `TRUNCATE`,
`MAINTAIN` e **non** `INSERT`/`UPDATE`/`DELETE`. **Il registro non si scrive se
non passando da `record_account_act`** — il gate *chi decide e' tracciato* di
`community-membership.md` sopravvive al rinomina.

### (e) La rilettura e i gate — 19:22:58Z → 19:24:05Z

- **`npm run verify:capabilities` contro la PRODUZIONE: 5/5 verde, 0 avvisi.**
  Era **3/5 rosso** alle 18:49:45Z. **E' l'atto che lo ha chiuso**, come §1.4
  aveva scritto prima che il permesso fosse chiesto.
- **PostgREST ha ricaricato la cache dello schema:** `account_acts` **206** con 2
  righe, `membership_acts` e `attendances` **404**. E' la prova che il percorso
  del **prodotto**, non solo il catalogo, vede i nomi nuovi.
- `npm run verify:persona` **7/7**; `npm run build` **exit 0**; `/events` e
  `/gallery` **200** da anonimo dopo le due migration.

---

## Le due finestre: durate effettive

Erano **dichiarate prima** in §1.5, non scoperte a meta'.

| Finestra | Dichiarata | **Durata effettiva** |
|---|---|---|
| `23514` — il `CHECK` non ammette ancora `attendee` | fra (a) e (b) | **2 minuti e 4 secondi** (19:13:04.994Z → 19:15:08.774Z) |
| `42883`/`42P01` — `record_account_act` e `account_acts` non esistono ancora | fra (a) e (d) | **7 minuti e 20 secondi** (19:13:04.994Z → 19:20:24.987Z) |

Su un progetto con **zero serate in vendita, zero biglietti, zero ordini e zero
serate future**, entrambe sono costate **zero a chiunque**. Il verso opposto —
migration prima del deploy — le avrebbe rese lunghe quanto un deploy: *fra due
peggioramenti temporanei si sceglie il piu' corto*.

---

## L'istantanea, ripresa: nessuna differenza da spiegare

| Misura | Atteso (§3.7) | **Riletto 19:21:51Z** |
|---|---|---|
| Tabelle in `public` | **40** (41 meno `attendances`) | **40** |
| Righe in tutto | **2397** | **2397** |
| `private.role_capabilities` | **28** | **28** |

**Zero righe di dati cancellate in produzione.** L'unico contenuto perso
davvero e' `profiles.membership_code` su quattro righe, e §4.3 dichiarava
**prima** che non sarebbe stato scritto da nessuna parte: questo repository e'
pubblico.

---

## Commit

1. **La concessione, PRIMA di ogni passo di produzione** — `c61760f`
   (`docs(51-13)`): `granted: yes`, `answer: TUTTO`, le due letture attribuite
   all'orchestratore, e il blocco che lo strumento legge.
2. **L'atto, speso e dichiarato esaurito** — `2b41d61` (`docs(51-13)`): il
   registro d'uso, il capitolo di `51-ESITI.md`, `status: ESAURITA`,
   `spent: yes`.
3. **Metadati del piano** — questo SUMMARY, `ROADMAP.md`, `STATE.md`.

> **`c61760f` e' anche lo sha dispiegato**, e non e' una coincidenza: e' il
> commit della concessione, spinto dal passo (a). **La concessione e' stata
> registrata e pubblicata prima di qualunque scrittura sul database.**

---

## Decisioni prese

1. **`verify:refusal` non si lancia.** Conia sessioni sull'identita' di persone
   reali. §1.4 e §5 ponevano la scelta come binaria — *o il perimetro lo nomina,
   o non si lancia* — e **il proprietario non lo ha nominato**. Il gate **resta
   rosso con la sua ragione scritta**. Lanciarlo sarebbe stato il *«gia' che ci
   siamo»* di **T-51-62**. Per farlo serve **un atto nuovo, con la sua data**.
2. **`--apply` del purge non si lancia.** A zero righe lo strumento esce prima di
   qualunque `DELETE` in entrambi i modi: `--apply` avrebbe prodotto lo stesso
   referto e una seconda istantanea. *Una decisione senza soggetti non si
   esegue* e' la dottrina dello strumento stesso.
3. **Nessun account di prova in produzione.** §1 mette «account creati a mano»
   fuori perimetro. Al suo posto: la firma di `reconcile_master` riletta dal
   catalogo e confrontata col chiamante dispiegato.
4. **`spent: yes` a mano, e dichiarato.** Lo strumento marca il documento **solo
   dopo aver cancellato qualcosa**. Non ha cancellato niente, quindi la
   marcatura e' manuale — e dirlo evita che il prossimo creda che l'abbia fatta
   lui.

---

## Deviazioni dal piano

**Quattro smentite, tutte scritte nella nota d'uso di `51-AUTHORISATION.md` §6 e
mai al posto delle righe originali** — che e' la mitigazione di **T-51-58**.

### 1. [Rule 1 — misura sbagliata] Il ref del laboratorio **non** si e' pubblicato

- **Trovata durante:** le precondizioni del passo (a), alle **19:02Z**
- **Cosa diceva §1.3:** che il ref del progetto di laboratorio *«compare 5 volte,
  in 4 file di `.planning/`»* e che il push lo avrebbe pubblicato **per la prima
  volta**. Era registrato come **costo accettato** del passo (a).
- **Cosa dice la misura:** **zero** occorrenze nel diff, **zero** nell'albero di
  lavoro, e `git log -S<ref> --all` dice che **non e' mai stato nella history**.
  Le uniche stringhe a forma di ref nel diff sono **9 occorrenze del ref di
  produzione**, che §1 dichiara gia' pubblico per costruzione.
- **Che cosa era stato contato:** con ogni probabilita' il **nome dell'host**
  (`lab.resonatemotion.com`), **gia' pubblico** dalle fasi 49 e 50 e da
  `v1.6-LAB-DESIGN.md`. Il push ne aggiunge 17 occorrenze, che **non sono
  informazione nuova**. Lo stesso riquadro di §1.3 distingueva le due cose.
- **Perche' conta anche se il verso e' innocuo:** **il proprietario ha accettato
  un costo che non esisteva.** Un costo dichiarato e poi non rimisurato e' una
  decisione presa su una premessa falsa — che e' il precedente registrato in
  `meta-gates.md` per il numero dei cron.
- **Registrata in:** `51-AUTHORISATION.md` §6, smentita 1; `51-ESITI.md`,
  passo (a)

### 2. [Rule 3 — la misura si e' mossa] 84 commit invece di 82

- **Trovata durante:** la registrazione della concessione, **prima** dell'atto
- **Causa:** fra la scrittura del permesso (misurata su `98ab62c`) e la sua
  concessione, il ramo ha guadagnato **due commit di sola documentazione** —
  l'autorizzazione stessa e la registrazione della risposta.
- **Cosa non e' cambiato:** **zero** file fuori da `.planning/` nel delta. Il
  codice dispiegato e' quello di **`44e8c65`**, lo stesso contro cui il
  proprietario ha percorso la corsa «dopo» di `P-51-1`.
- **Registrata in:** `51-AUTHORISATION.md` §5-bis, **prima** dell'atto

### 3. [dichiarata, non aggirata] `verify:refusal` non lanciato

Il piano 51-13 (task 3, `<verify>`) chiedeva a `verify:refusal` di essere verde.
**Il perimetro concesso non lo nomina**, e §1.4 aveva gia' scritto — prima che il
permesso fosse chiesto — che quel comando **e' un atto, non un controllo**. Il
gate **resta rosso con la sua ragione**, che e' una delle due forme previste.

### 4. [dichiarata, non aggirata] `reconcile_master` non gira a ogni deploy

§1.1 e §2 lo dicevano in forma abbreviata. Riletto dal codice: l'unico chiamante
e' `src/app/api/auth/callback/route.ts:173`, quindi gira al **primo accesso dopo
un deploy**. **Senza coniare una sessione — fuori perimetro — quell'esecuzione
non si puo' provocare.** Verificato invece, in sola lettura, che **chiamante e
catalogo concordino** sulla firma.

---

**Totale deviazioni:** 4, **nessuna corretta in silenzio**. Due sono errori di
misura del documento di autorizzazione (1 e 2), due sono passi non eseguiti
perche' fuori perimetro (3 e 4).
**Impatto sul piano:** nessuno sull'esito. **Impatto sul metodo:** la smentita 1
dice che **un costo dichiarato va rimisurato prima di spenderlo**, non solo prima
di chiederlo.

---

## Problemi incontrati

**Uno solo, e si e' risolto in quindici secondi.** Al primo lancio,
`purge-attendances.mjs` ha risposto **`RIFIUTO` con uscita 2**:
`SUPABASE_ACCESS_TOKEN` non era nell'ambiente, perche' **lo script non carica i
file `.env` da se'** — lo fa `scripts/dev-lab.sh` per lui. Rilanciato con
`node --env-file=.env.local`. **Nessuna lettura era avvenuta**, ed e'
esattamente cio' che l'uscita 2 significa nel suo docblock: il rifiuto e' la
prima cosa eseguita.

**Una lettura che sembrava un difetto e non lo era.**
`position('''member''' in pg_get_functiondef(...))` su `reconcile_master` torna
**3300** dopo la migration (b): la parola c'e' ancora. Riletta riga per riga con
la distinzione fra codice e commento, **le tre righe che la nominano sono tutte
commenti** — *«Fase 51 (D-51-06): era `'member'`»* — e l'unica riga eseguibile e'
`p_role => 'attendee'`. **Un `position()` non distingue un letterale da un
commento**, e chi si fermasse al numero direbbe che la migration non ha fatto il
suo lavoro.

---

## Configurazione richiesta all'utente

Nessuna. Nessuna variabile d'ambiente nuova, nessun campo di configurazione
toccato, nessun servizio esterno da riconfigurare.

---

## Cosa e' pronto per il piano successivo

- **`51-VERIFICATION.md` (piano 51-14) puo' citare la PRODUZIONE**, non piu' il
  solo laboratorio: `MEM-01`, `MEM-02` e `MEM-03` hanno ora evidenza su entrambi
  i progetti, con `file:riga` per il codice e ore UTC per il catalogo.
- **`MEM-04` resta chiuso dalle due corse di `P-51-1`** gia' percorse e
  trascritte in `51-ESITI.md`. Non si ripetono: si citano con la loro data.

### Debito lasciato aperto, e dichiarato

| Cosa | Dove va | Perche' e' aperto |
|---|---|---|
| **`verify:refusal` rosso contro la produzione** | un **atto nuovo, con la sua data** | conia sessioni su identita' reali; il perimetro di oggi non lo nominava. E' l'**unico posto** dove quella misura puo' esistere: contro il laboratorio non puo' essere verde (D-51-08-B) |
| Il ritaglio sotto la tastiera alla porta | fase 52 | `door-and-login-viewport-crops-under-keyboard.md` |
| «Recent scans» e avvisi in linguette proprie | fase 52 | chiesto dal proprietario durante la corsa «dopo» |
| Il ripristino manuale del modello di posta B.2 | atto nuovo | lasciato aperto dalla fase 50, **esplicitamente fuori** dal perimetro di oggi |

### L'avvertenza che vale piu' di tutte

> **`51-AUTHORISATION.md` e' ESAURITA dalle 19:24:05Z.** Ogni scrittura in
> produzione successiva — un'altra migration, una riga seminata, un account
> creato, una sessione coniata, un campo di configurazione — ha bisogno di **un
> atto nuovo, con la sua data**. Un piano che trovasse li' dentro una riga
> «applicata» e ne concludesse di poter scrivere starebbe leggendo **una ricevuta
> come un permesso**. E non e' solo scritto: **rilanciato alle 19:26:30Z, lo
> strumento risponde `RIFIUTO` con uscita 2.**

---
*Fase: 51-via-le-superfici-da-socio-e-la-porta*
*Completato: 2026-09-22*

## Self-Check: PASSED

Verificato il 2026-09-22 alle 19:30Z, prima del commit dei metadati.

- **File dichiarati:** 7 su 7 trovati sul disco — questo SUMMARY,
  `51-AUTHORISATION.md` (779 righe), `51-ESITI.md`, le due migration,
  `scripts/purge-attendances.mjs`, `src/app/api/auth/callback/route.ts`
- **Commit dichiarati:** 5 su 5 trovati in `git log` — `c61760f`, `2b41d61`,
  `44e8c65`, `98ab62c`, `78f4a81`
- **`ESAURITA`** compare **3 volte** in `51-AUTHORISATION.md` (frontmatter,
  chiusura, footer); **`UTC`** compare **17 volte** in `51-ESITI.md`
- **Nessuno stub, nessun segnaposto:** questo piano non ha scritto codice di
  prodotto. Ha speso un permesso e registrato cosa ha fatto.
