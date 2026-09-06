---
phase: 49-comprare-senza-account
plan: 02
subsystem: access-gating
tags: [credenziale, csprng, security-definer, search-path, produzione, migration, persona]

requires:
  - phase: 3-referral
    provides: "handle_new_user con referral — il corpo che questa migration riscrive per intero"
  - phase: 49-01
    provides: "l'autorizzazione di produzione del 2026-09-06, aperta su tre migration su cinque"
provides:
  - "public.handle_new_user conia membership_code da extensions.gen_random_bytes: 2^50 invece di 2^40 nominali"
  - "Ritentativo sulla sola collisione di profiles_membership_code_key, con ogni altra violazione rilanciata invariata"
  - "search_path='' fissato su una SECURITY DEFINER che gira a ogni registrazione"
  - "src/utils/qr.ts senza la funzione morta, con una lapide che dice perche' non va rimessa"
  - "I due gate dell'entropia rovesciati sul generatore vero, piu' il gate del debito delle due credenziali"
affects: [49-03, 49-04, 49-05, 50, 51]

tech-stack:
  added: []
  patterns:
    - "Credenziale coniata nel database da un CSPRNG, con la lunghezza scelta dal MASSIMO che il consumatore accetta, non dal minimo che basta"
    - "Ritentativo che distingue la collisione attesa da ogni altra violazione con GET STACKED DIAGNOSTICS CONSTRAINT_NAME"
    - "Verifica di risoluzione dei nomi sotto search_path vuoto via SELECT + EXPLAIN, con controllo negativo — nessuna riga creata"
    - "Confronto di credenziali per impronta md5, mai per valore, perche' .planning/ e' pubblicato"

key-files:
  created:
    - supabase/migrations/20260905130000_membership_code_crypto.sql
  modified:
    - src/utils/qr.ts
    - src/app/api/membership/verify/route.ts
    - src/app/(admin)/admin/scanner/ScannerClient.tsx
    - .claude/rules/access-gating.md
    - .claude/rules/checkin-offline.md
    - .claude/CHANGELOG.md
    - .planning/phases/49-comprare-senza-account/49-AUTHORISATION.md
    - .planning/phases/49-comprare-senza-account/deferred-items.md

key-decisions:
  - "La lunghezza e' 10 perche' 10 e' il MASSIMO che BARE_MEMBERSHIP_PATTERN accetta: la forma del codice la decide la porta, che questa fase non tocca"
  - "L'alfabeto e il prefisso restano identici: cambiarli avrebbe reso il codice nuovo indistinguibile da uno di un'altra origine e avrebbe toccato la regex"
  - "search_path='' fissato QUI e non in una migration a parte: la funzione si stava riscrivendo comunque, e due migration per una riga sono due occasioni di sbagliare"
  - "Il ritentativo non si fida del solo NOT EXISTS: l'autorita' e' il vincolo unico, e il blocco EXCEPTION lo ascolta invece di sperare che non parli"
  - "Solo profiles_membership_code_key ritenta; ogni altra unique_violation viene RILANCIATA — senza error tracking, due cause collassate sono un fallimento invisibile"
  - "I quattro codici esistenti non sono stati rigenerati, e il confronto prima/dopo si fa per md5 perche' .planning/ e' un repository pubblico"
  - "La funzione morta esce ma lascia una lapide: era la sua sola lettura, non la sua esecuzione, ad aver prodotto BUY-05 sbagliato"

requirements-completed: [BUY-05]

duration: 38min
completed: 2026-09-06
---

# Fase 49 Piano 02: La credenziale della porta, coniata da un CSPRNG — Summary

**Il codice che ammette alla porta senza leggere ne' ruolo ne' stato nasceva da un
PRNG seminato; da oggi nasce da un CSPRNG in uno spazio 1024 volte piu' grande —
e le quattro credenziali gia' in mano a qualcuno sono uscite da questa migration
esattamente come ci sono entrate.**

## Performance

- **Duration:** ~38 min
- **Tasks:** 2 / 2
- **Migration applicate in produzione:** 1 / 1 — la terza delle cinque autorizzate
- **Righe scritte in produzione:** **0** (un `CREATE OR REPLACE FUNCTION` e un
  `COMMENT ON FUNCTION` — nessun `INSERT`, nessun `UPDATE`, nessun `DELETE`)

## L'entropia, prima e dopo — con l'alfabeto e la lunghezza dichiarati

| | prima | dopo |
|---|---|---|
| Alfabeto | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — **32 caratteri**, 5 bit ciascuno | **identico**, 32 caratteri |
| Lunghezza | **8** | **10** |
| Spazio | 32^8 = **2^40** ≈ 1,1 × 10^12 | 32^10 = **2^50** ≈ 1,13 × 10^15 |
| Generatore | `random()` di plpgsql — PRNG **seminato**, non crittografico | `extensions.gen_random_bytes` — pgcrypto 1.3, CSPRNG di OpenSSL |
| Cosa vale il numero | un **tetto**: con un PRNG seminato l'entropia vera e' quella del seme, non quella del conteggio dei caratteri | una **misura** |
| Prefisso | `RSN-` | `RSN-` — invariato |

**Fattore: 1024×.** E i due numeri non sono confrontabili alla pari, il che e' il
punto: il 40 di prima era ottimistico per costruzione, il 50 di adesso no.

**Perche' 10 e non 12 o 16.** La lunghezza non e' scelta dal generatore: e'
scelta dal consumatore. `src/app/(admin)/admin/scanner/ScannerClient.tsx:71`
porta `BARE_MEMBERSHIP_PATTERN = /^RSN-[A-Z0-9]{6,10}$/i`, e la porta e' **fuori
dal perimetro di questa fase** (`D-49-01`: *lavoro contenuto — la funzione, in
una migration*). **Dieci e' il massimo che lo scanner accetta**: undici sarebbe
un codice coniato da noi che la nostra porta rifiuta — cioe' il falso rifiuto
davanti a una fila, che `checkin-offline.md` dichiara l'errore piu' costoso di
questo prodotto. L'alfabeto e il prefisso restano identici per la stessa ragione.

**Il mapping non introduce bias, e va detto perche' non e' generale.** Un byte
vale 0..255, l'alfabeto ha 32 caratteri, e **256 = 8 × 32**: il resto modulo 32
copre ogni carattere esattamente otto volte. Con un alfabeto di lunghezza non
potenza di due lo stesso `%` sarebbe **sbagliato** e servirebbe il rifiuto per
rigetto. La ragione e' scritta accanto alla riga nella migration.

**Provato prima di scrivere, e senza creare nulla.** L'espressione di generazione
e' stata eseguita da sola sul catalogo, **2000 campioni**:

| Misura | Risultato |
|---|---|
| Conformi a `/^RSN-[A-Z0-9]{6,10}$/` | **2000 / 2000** |
| Codici distinti | **2000 / 2000** |
| Lunghezza (min = max) | **14** = `RSN-` + 10 |
| Caratteri distinti in prima posizione | **32 / 32** — il mapping raggiunge tutto l'alfabeto |

## La versione registrata, e la deriva che era prevista

| Cosa | Valore |
|---|---|
| File | `supabase/migrations/20260905130000_membership_code_crypto.sql` |
| Applicata (UTC) | **2026-09-06 14:26:05** |
| Endpoint | `POST /v1/projects/{ref}/database/migrations` — **mai** `/database/query` |
| HTTP | **200**, corpo `[]` |
| **Versione registrata** | **`20260906142605` / `membership_code_crypto`** |

**La deriva e' quella annunciata da 49-01 e si e' ripetuta identica.** L'endpoint
conia la versione dall'**istante dell'applicazione**, non dal nome del file: il
file dice `20260905130000`, la storia dice `20260906142605`. Chi cerchera' domani
questa migration in `supabase_migrations.schema_migrations` **per il numero del
file non la trovera'**, e merita saperlo prima di concluderne che manca. Letta da
`supabase_migrations.schema_migrations`, non dalla risposta del `POST`, che era
`[]`: una misura presa con lo strumento che ha causato l'effetto e' un'eco.

## Cosa ha detto il catalogo alla rilettura

Ogni riga viene da `pg_proc` / `supabase_migrations.schema_migrations`, **dopo**
l'applicazione.

| Cosa | Letto da | Risposta |
|---|---|---|
| La funzione e' ancora `SECURITY DEFINER` | `pg_proc.prosecdef` | `true` |
| **`search_path` fissato** | `pg_proc.proconfig` | **`{search_path=""}`** — era `NULL` |
| `random()` nel blocco del codice | `pg_get_functiondef`, righe non commentate | **0 occorrenze** — e **0** anche di `floor(random(` |
| Il generatore nuovo | `pg_get_functiondef` | `v_bytes := extensions.gen_random_bytes(10);` e `substr(chars, (get_byte(v_bytes, i - 1) % 32) + 1, 1)` |
| Il commento della funzione | `obj_description` | presente, con generatore, spazio, ragione del 32 e ragione del 10 |
| Il trigger e' ancora agganciato | `pg_trigger` | `on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW` — invariato |

## I quattro codici esistenti: identici, e confrontati senza pubblicarli

**Un `membership_code` e' una credenziale della porta, e `.planning/` e'
pubblicato.** Il confronto prima/dopo si fa quindi sulle **impronte md5**
troncate, mai sui valori — la stessa logica di `venue-secrecy.md` applicata a una
credenziale invece che a un indirizzo.

| Impronta `md5` (12 car.) | Lunghezza | Passa `/^RSN-[A-Z0-9]{6,10}$/` | Prima | Dopo |
|---|---|---|---|---|
| `4d0bc86a9e5c` | 12 | si' | ✓ | ✓ |
| `64650f4cbc03` | 12 | si' | ✓ | ✓ |
| `c67f5ed9861f` | 12 | si' | ✓ | ✓ |
| `f66b4ef67fc1` | 12 | si' | ✓ | ✓ |

**Quattro impronte, identiche voce per voce.** Lunghezza 12 = `RSN-` + 8: sono i
codici vecchi, e restano tali. La migration non contiene una riga che scriva
`public.profiles`, ed e' una decisione del proprietario (`D-49-01`), non una
dimenticanza: rigenerarli invaliderebbe credenziali che qualcuno tiene, e lo
scoprirebbe alla porta.

**Conseguenza da portare avanti, non da nascondere:** su quei quattro la
debolezza vecchia **sopravvive**. Il difetto e' chiuso **solo in avanti**, ed e'
scritto cosi' in entrambi i gate e nei tre docblock del prodotto.

## Il ri-conteggio delle righe contro 2241

L'istantanea del **2026-09-06 14:00:55 UTC** non e' stata ripresa, come
prescritto. L'insieme e' stato **ri-derivato in modo indipendente**: chiusura
transitiva **non orientata** sulle chiavi esterne di `pg_constraint`, seminata su
`tickets`, `event_parties`, `profiles`, `events`, ristretta allo schema `public`.

| Insieme | Tabelle | Righe **prima** | Righe **dopo** |
|---|---|---|---|
| Chiusura per chiave esterna (derivazione di questo piano) | 38 | **2253** | **2253** |
| **Ogni** tabella di `public` (superinsieme, misura di controllo) | 41 | **2327** | **2327** |

**Non si e' mossa una riga, su nessuna delle due misure.**

**La derivazione da 38 tabelle non coincide con quella da 36 di 49-01, e la
differenza si chiude esattamente.** Le due tabelle in piu' sono `artists` e
`venues`, e portano **7 + 5 = 12** righe:

> **2253 = 2241 + 7 (`artists`) + 5 (`venues`)**

Le altre quindici tabelle non vuote coincidono voce per voce con quelle
dichiarate nell'istantanea: `drink_items=7, event_parties=3, events=2, formats=4,
membership_acts=2, party_series=5, production_checklist_item=92,
production_lineup_slot=12, production_piece=59, production_pipeline_rule=14,
production_plan=12, production_space=184, production_space_attribute=1840,
profiles=4, ticket_tiers=1` — somma **2241**.

**Quindi il riferimento regge**: la chiusura di questo piano e' un
**superinsieme** di quella di 49-01, la differenza e' spiegata alla riga, e il
totale non si e' mosso ne' sul sottoinsieme ne' sul superinsieme. Un ri-conteggio
che avesse dato 2253 senza spiegare i 12 non sarebbe stato una verifica: sarebbe
stato un numero.

## `search_path`: fissato, e provato senza creare righe

**Misurato prima:** `handle_new_user` era `SECURITY DEFINER` con
`proconfig = NULL`, mentre `venue_for_parties` e `reserve_ticket_order` hanno
`search_path=""`. Una `SECURITY DEFINER` senza `search_path` fissato e' una
lacuna di irrobustimento nota, e **questa gira a ogni singola registrazione** —
cioe' sulla popolazione che questa fase sta per moltiplicare.

**Fissato:** `pg_proc.proconfig` legge ora `{search_path=""}`.

**Ogni oggetto e' qualificato:** `public.guest_list_entries`, `public.profiles`,
`extensions.gen_random_bytes`. Le funzioni di sistema (`substr`, `get_byte`,
`lower`, `now`, `coalesce`) restano nude perche' vivono in `pg_catalog`, che
Postgres cerca **implicitamente** anche con `search_path` vuoto — stessa
convenzione di `reserve_ticket_order`.

**Il rischio vero era un altro, ed e' stato misurato invece che assunto.** Un
errore di risoluzione dei nomi sotto `search_path` vuoto **non si vede alla
creazione**: `CREATE OR REPLACE` controlla la sintassi del corpo plpgsql, non la
risolubilita' dei nomi. Sarebbe emerso **alla prima registrazione** — e su questa
fase, dopo un pagamento incassato.

Quindi ogni riferimento del corpo e' stato risolto **a mano, con
`SET search_path = ''` in vigore, senza creare una riga**:

| Riferimento | Come e' stato provato | Esito |
|---|---|---|
| `extensions.gen_random_bytes(10)` | `SELECT length(...)` | `10` |
| `substr` + `get_byte` + `%` | `SELECT` del mapping completo | un carattere dell'alfabeto |
| `lower`, `now`, `coalesce` | `SELECT` | risolti |
| lettura di `public.guest_list_entries` | `SELECT count(*)` con lo stesso `WHERE` del corpo | `0` |
| lettura di `public.profiles` (referral) | `SELECT count(*)` con lo stesso `WHERE` | `0` |
| controllo di collisione | `SELECT EXISTS(...)` | `false` |
| `UPDATE public.guest_list_entries` | **`EXPLAIN`** — pianifica e **non esegue** | piano prodotto |
| `INSERT INTO public.profiles` | **`EXPLAIN`** — pianifica e **non esegue** | `Insert on profiles (cost=0.00..0.01 rows=0 width=0)` |

**E la prova e' stata provata** (`ai-engineering.md`, gate *prova per mutazione*).
Controllo negativo: la stessa chiamata **non qualificata**,
`SET search_path=''; SELECT gen_random_bytes(10)`, deve fallire — e fallisce:

```
ERROR: 42883: function gen_random_bytes(integer) does not exist
```

Il che dimostra due cose in una riga: che il `SET` era davvero in vigore durante
il controllo positivo, e che **la qualificazione `extensions.` e' portante**, non
cosmetica. Senza il controllo negativo, un verde non avrebbe distinto «risolve
correttamente» da «il `search_path` non era vuoto».

## Il ritentativo, e perche' distingue due modi di fallire

`public.profiles.membership_code` e' `text UNIQUE NOT NULL`, e la funzione
precedente **non ritentava**. Siccome il trigger scatta **dentro** l'`INSERT` su
`auth.users`, una collisione non produce un codice doppio: fa fallire la
**creazione dell'account** — da questa fase in poi, **dopo un pagamento gia'
incassato**.

Il ciclo fa cinque tentativi, e ognuno **rigenera il codice**: ritentare
l'`INSERT` con lo stesso codice ricadrebbe nella stessa collisione all'infinito.

**Due reti, non una.** Il `NOT EXISTS` a monte e' un TOCTOU — fra il `SELECT` e
l'`INSERT` un'altra registrazione puo' prendersi lo stesso codice. L'autorita'
resta il vincolo unico, e il blocco `EXCEPTION` lo **ascolta**:

```sql
EXCEPTION WHEN unique_violation THEN
  GET STACKED DIAGNOSTICS v_conname = CONSTRAINT_NAME;
  IF v_conname IS DISTINCT FROM 'profiles_membership_code_key' THEN
    RAISE;
  END IF;
```

**Solo la collisione attesa ritenta.** Qualunque altra violazione di unicita' —
`profiles_pkey`, `profiles_id_role_unique` — viene **rilanciata invariata**.
Contarla fra i cinque tentativi la travestirebbe da collisione e la
riporterebbe con un messaggio che non le appartiene: e' il gate *zero fallimenti
silenziosi*, che in questo repo pesa il doppio perche' **non esiste error
tracking** e nessun errore raggiunge un essere umano da solo.

Esaurititi i cinque:
`RAISE EXCEPTION 'membership_code_collision_after_5_attempts'`, una causa propria
e cercabile, con un `HINT` che dice dove guardare — il generatore, non la
fortuna.

## La funzione morta, e la lapide che lascia

`generateMembershipCode()` in `src/utils/qr.ts` aveva **zero importatori** —
misurato con un grep globale su `src/` e `scripts/` **prima** di toglierla, non
ricordato. Le esportazioni vive del modulo sono ora tre:
`generateTicketToken`, `verifyTicketToken`, `generateMembershipQR`.

Al suo posto resta un commento che dice **dove nasce davvero il codice** e che un
secondo generatore in JavaScript non va rimesso. Non e' sentimentalismo: e' che
il difetto di `BUY-05` non e' nato dall'**esecuzione** di quella funzione — non
veniva eseguita — ma dalla sua **lettura**. Cancellarla in silenzio lascia il
prossimo lettore libero di riscriverla.

## I due gate, rovesciati sul generatore vero

`access-gating.md` (*entropia degli identificatori*) e `checkin-offline.md`
(*entropia dei codici*) citavano entrambi `src/utils/qr.ts:49`. **Presidiavano
un difetto in un file che il prodotto non eseguiva.**

Rovesciati, non cancellati — la regola di casa: una riga tolta senza la sua
ragione torna folklore e qualcuno la «ripara». Adesso dicono quale premessa e'
caduta, dove sta il generatore vero, che spazio ha, che **dieci e' il massimo che
la porta accetta**, e che **i quattro codici emessi prima non sono stati
rigenerati**. Il rate limiting continua a non esistere, e quella meta' resta
dichiarata aperta invece di sembrare risolta.

**Aggiunto in entrambi** `Gate la porta ha due credenziali, e la seconda non
guarda chi sei`, con la situazione concreta che lo fa scattare scritta nel
changelog. La versione di `checkin-offline.md` porta in piu' la ragione che
decide alla porta: **il biglietto e' HMAC-firmato, il QR di membership non porta
firma**. E' quella asimmetria — non l'entropia — a giustificare il rifiuto
offline di un codice sconosciuto, ed e' la ragione che resta vera **anche adesso
che l'entropia e' salita**.

`.claude/CHANGELOG.md`: versione **1.20.0**, con gli scenari di caricamento e di
scatto per entrambi i moduli. **Nessun `paths:` toccato**, e dichiarato tale.

## Verifica — evidenza, non aggettivi

> **Non esiste un test runner per il prodotto.** `package.json` non ha script
> `test`, non esiste alcun `*.test.*` o `*.spec.*`. **Nulla qui e' verificato
> perche' «i test passano».** La verifica automatica e' `npm run build` (che e'
> anche il typecheck di Next) e `npm run verify:persona` (che copre la **persona**
> e la sua **coerenza**, non il prodotto e non la correttezza); il resto e'
> lettura del catalogo e procedura scritta.

| Controllo | Comando / fonte | Esito |
|---|---|---|
| Persona coerente | `npm run verify:persona` | **exit 0 · 7/7 verdi** (A B C D E F G) |
| Build + typecheck | `npm run build` | **exit 0** — `✓ Compiled successfully` |
| La funzione morta non esiste | `grep -cE '^export (function\|const) generateMembershipCode' src/utils/qr.ts` | **0** |
| Nessun riferimento residuo | `grep -rn 'generateMembershipCode' src/ scripts/` escluso il tombstone | **0 righe** |
| `Math.random` su codice eseguito | ogni occorrenza in `src/` | **0 righe non commentate** (4 occorrenze, tutte prosa) |
| I gate non asseriscono piu' il difetto | `grep -cE 'qr\.ts:49.*(Math\.random\|difetto)'` sui due moduli | **0** e **0** |
| Il debito e' nominato | `grep -c 'attendance/route.ts:145\|due credenziali'` su `access-gating.md` | **1** |
| Changelog | `head` di `.claude/CHANGELOG.md` | `## [1.20.0] - 2026-09-05` |

### Criteri d'accettazione del piano — tre proxy testuali in conflitto con la regola di casa

Tre criteri del piano falliscono **alla lettera** e sono stati risolti come 49-01
ha risolto il suo (`meta-gates.md`: *«se due gate producono requisiti
contraddittori vince il piu' restrittivo»*, e il conflitto va documentato).

| Criterio del piano | Alla lettera | Perche' | Criterio equivalente, verificato |
|---|---|---|---|
| `grep -rn generateMembershipCode src/ scripts/` → 0 | **1** | l'unica occorrenza e' la **lapide** che nomina la funzione rimossa | `^export ... generateMembershipCode` → **0**; riferimenti fuori dal tombstone → **0** |
| `grep -rn Math.random src/utils/ src/lib/` → 0 | **1** | stessa lapide | righe **non commentate** con `Math.random` in tutto `src/` → **0** |
| `grep -c qr.ts:49` sui due gate → 0 | **1** e **1** | **il task contraddice se stesso**: chiede di *«aggiornarli rovesciando invece di cancellare»*, e un rovesciamento **deve** citare la riga che smentisce | occorrenze che **asseriscono** il difetto → **0**; rovesciamento presente → **1** e **1** |

Il terzo e' il piu' netto: non si puo' pretendere insieme la frase *«questa riga
diceva `qr.ts:49`, e indicava il posto sbagliato»* e zero occorrenze di
`qr.ts:49`. Ha vinto la regola di casa, che e' la piu' restrittiva delle due
perche' impedisce che il difetto venga «riparato» di nuovo da chi trova una riga
senza ragione.

## Deviazioni dal piano

### 1. [Rule 1 — bug] Tre docblock del prodotto asserivano un difetto che la migration stava chiudendo

- **Trovato durante:** task 2, cercando `Math.random` in `src/` invece che nelle
  sole due directory che il criterio nominava.
- **Il difetto:** `src/app/api/membership/verify/route.ts:95` e `:220`, e
  `src/app/(admin)/admin/scanner/ScannerClient.tsx:2340` **citano `qr.ts:49` e
  `Math.random()` come difetto aperto (`QR-01`)** e ci costruiscono sopra tre
  decisioni di progetto: perche' la `GET` di verifica resta com'e', perche'
  `token_fingerprint` e' NULL, e perche' un codice che il roster non conosce si
  rifiuta offline. Il piano non li prevedeva — il suo criterio guardava
  `src/utils/` e `src/lib/`, e tutti e tre stanno altrove.
- **Perche' non e' fuori perimetro:** dal momento dell'applicazione quelle frasi
  sono **false**, e due delle tre stanno **sul percorso della porta e
  sull'oracolo di verifica**. E' il gate *documentazione datata* che si avvera
  dentro il prodotto: un commento che mente alla porta e' peggio di un commento
  assente, perche' chi lo legge decide.
- **Fix:** rovesciati con la stessa struttura dei gate — *questo blocco diceva X,
  X non e' piu' vero, ecco cos'e' vero adesso, e i quattro codici vecchi sono il
  residuo*. **La ragione che DECIDE e' stata lasciata intatta in tutti e tre**:
  su `ScannerClient.tsx` e su `:220` a pesare non e' l'entropia ma la **firma
  mancante**, e il rifiuto offline sarebbe corretto anche se ogni codice fosse
  forte. Correggere il fatto senza toccare la conclusione era il punto.
- **Commit:** `a28b334`.

### 2. [Rule 2 — funzionalita' critica mancante] Il ritentativo non poteva essere il solo `NOT EXISTS`

- **Trovato durante:** task 1, scrivendo il ciclo.
- **Il buco:** il piano prescrive *«controllando `NOT EXISTS (...)` prima
  dell'INSERT»*. Da solo e' un TOCTOU: due registrazioni simultanee possono
  superarlo entrambe con lo stesso codice, e la seconda fallisce comunque —
  cioe' il ramo scritto per proteggere un pagamento incassato non lo protegge nel
  solo caso in cui serve, la concorrenza.
- **Fix:** aggiunto il blocco `EXCEPTION WHEN unique_violation` con
  `GET STACKED DIAGNOSTICS ... CONSTRAINT_NAME`, che ritenta **solo** su
  `profiles_membership_code_key` e **rilancia** ogni altra violazione. Il
  `NOT EXISTS` resta come controllo a monte, che nel caso comune evita di
  consumare una sottotransazione.
- **Commit:** `7302bcf`.

### 3. [Rule 2 — irrobustimento su richiesta] `search_path` fissato nella stessa migration

- Non e' una scoperta ma un'estensione **prescritta** al momento
  dell'esecuzione, ed e' registrata qui perche' non era nel testo del piano.
  Applicata, verificata da `pg_proc.proconfig`, e provata per risoluzione dei
  nomi con controllo negativo (sopra). **Non e' stata forzata**: il corpo si e'
  rivelato interamente qualificabile, quindi non si e' presentato il caso in cui
  il piano chiedeva di lasciare `search_path` com'era.

## Scoperte fuori perimetro

### Registrata in `deferred-items.md` — `D-49-02-DEF-04`

Il gate *context budget* di `ai-engineering.md` descrive una misura che lo script
non usa piu': dichiara **tetto 12.000** e caso peggiore `ScannerClient.tsx` con
10.622 token e margine 1.378, mentre `verify:persona` misura **tetto 15.000**,
caso peggiore `src/app/(admin)/admin/(work)/venues/[slug]/page.tsx`, **12.536
token, margine 2.464**. La conseguenza operativa scritta nel gate — *«il margine
si e' ristretto»* — **non e' piu' vera**. Non riparata qui: sarebbe una seconda
modifica alla persona nello stesso commit, con un secondo bump e un secondo
scenario, e questo piano ne ha gia' una su due moduli.

### Misurata e chiusa qui, perche' non richiede nulla a nessuno

`public.handle_new_user` ha `proacl = {=X/postgres, postgres=X/postgres,
anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}` — cioe'
`EXECUTE` a `PUBLIC`, **la stessa forma che su `reserve_ticket` e' un buco reale**
(`D-49-01-DEF-01`). Qui **non lo e', e la differenza e' stata provata invece che
asserita**:

```
select public.handle_new_user()
ERROR: 0A000: trigger functions can only be called as triggers
```

La funzione ritorna `trigger` (`pg_proc.prorettype` = `trigger`), quindi non e'
invocabile ne' da SQL ne' da PostgREST, che non espone le funzioni trigger. Il
`GRANT` e' inerte. **Registrato perche' chi leggera' quell'ACL domani vedra' la
stessa forma di `D-49-01-DEF-01` e meritera' di sapere che qui e' gia' stata
guardata** — e con quale prova, non con quale ragionamento. `CREATE OR REPLACE`
preserva l'ACL, quindi questa migration non l'ha ne' allargata ne' ristretta.

## Il debito che resta, dichiarato una volta e non riaperto

**La porta ha due credenziali, e la seconda ammette senza leggere ne' ruolo ne'
stato** (`src/app/api/tickets/attendance/route.ts:145`). Togliere l'ammissione
sul solo codice era la terza strada di `D-49-01` ed e' stata **non scelta**:
allargherebbe la fase ad `access-gating` e `checkin-offline`. Resta debito, ed e'
adesso scritto in **quattro** posti invece che in nessuno — i due gate, il
changelog e qui — perche' `49-VERIFICATION.md` lo nomini invece di ereditarlo.

**Il rate limiting non esiste** (`T-49-07`, disposizione *accept*):
`api/membership/verify` risponde valido/non-valido senza sessione e senza costo.
Il codice piu' largo alza il costo di una ricerca esaustiva di **1024 volte**;
**non** trasforma un oracolo in un non-oracolo. Le due cose vanno dette insieme o
la prima suona come una soluzione.

**Su quattro profili la debolezza vecchia sopravvive**, per decisione.

## Registro STRIDE — cosa ne e' stato

| ID | Disposizione | Esito |
|---|---|---|
| `T-49-06` — `membership_code` indovinato | mitigate | **mitigato**: 2^40 nominali da PRNG seminato → 2^50 misurati da CSPRNG, dentro la regex della porta |
| `T-49-07` — l'oracolo di verifica | accept | **accettato e dichiarato per iscritto**, nei due gate e qui. Non risolto, e non finto risolto |
| `T-49-08` — collisione che fa fallire l'account dopo l'incasso | mitigate | **mitigato**: ritentativo x5, causa d'errore propria, e ogni altra violazione rilanciata invariata |
| `T-49-09` — ammissione sul solo codice | accept | **accettato**, `D-49-01`. Scritto nei due gate, da riportare in `49-VERIFICATION.md` |

**Nessuna superficie di minaccia nuova.** Questo piano non aggiunge endpoint,
percorsi d'autenticazione, colonne, policy o tabelle: sostituisce il corpo di una
funzione esistente, ne restringe l'ambiente di esecuzione, e toglie codice morto.

## Procedura manuale, che nessun controllo automatico puo' sostituire

**Non e' stata eseguita**, perche' richiederebbe di creare un account in
produzione — **fuori dall'autorizzazione del 2026-09-06**, che nomina cinque file
di migration ed esclude esplicitamente *«righe seminate, spunte, sessioni
coniate»*. L'autorizzazione non si allarga da se'. La procedura e' scritta qui
perche' e' l'unica prova che esistera'.

> **P1 — un profilo nuovo prende un codice nuovo.** Su un ambiente dove si
> possono creare righe, creare un account. **Attendere:** un `membership_code`
> lungo **14** (`RSN-` + 10), tutti i caratteri dentro
> `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, e `select membership_code ~
> '^RSN-[A-Z0-9]{6,10}$'` → `true`. Una lunghezza 12 significa che il trigger
> vecchio e' ancora in circolo.
>
> **P2 — la porta lo accetta davvero.** Con quel codice, scansionare alla porta
> (o incollarlo nel campo manuale): lo scanner deve **riconoscerlo come codice di
> membership**, non rifiutarlo come stringa non valida. E' il controllo che
> `BARE_MEMBERSHIP_PATTERN` non e' stato superato in lunghezza — la sola cosa che
> un errore sul `10` romperebbe, e la romperebbe **davanti a una fila**.
>
> **P3 — la registrazione con referral funziona ancora.** Creare un account con
> `referral_code` valorizzato con il codice di un profilo `approved`.
> **Attendere:** `status = 'approved'`, `approved_via = 'referral'`,
> `referred_by` valorizzato. E' il ramo che `search_path = ''` avrebbe potuto
> rompere e che l'`EXPLAIN` prova solo fino alla risoluzione dei nomi.
>
> **P4 — la guest list funziona ancora.** Creare un account con un indirizzo
> presente in `guest_list_entries` con stato `pending`. **Attendere:**
> `status = 'approved'`, `approved_via = 'guest_list'`, e la voce di guest list
> passata a `registered` con `profile_id` valorizzato. E' l'unica **scrittura**
> del corpo oltre all'INSERT, e l'unica che tocca un secondo trigger.
>
> **P5 — i quattro vecchi entrano ancora.** Scansionare uno dei quattro codici
> preesistenti. **Attendere:** ammesso. Se fosse rifiutato, qualcosa li ha
> toccati, e questa migration dichiara di non averlo fatto.

## Self-Check

File — verificati esistenti sul disco:

- `supabase/migrations/20260905130000_membership_code_crypto.sql` — FOUND
- `.planning/phases/49-comprare-senza-account/49-02-SUMMARY.md` — FOUND
- `.claude/CHANGELOG.md` con `## [1.20.0]` — FOUND

Commit — verificati in `git log`:

- `7302bcf` — `feat(49-02): il codice della porta nasce da un CSPRNG, e i quattro gia' emessi restano` — FOUND
- `a28b334` — `refactor(49-02): via la funzione morta, e i gate smettono di indicare il posto sbagliato` — FOUND

Produzione — letta dal catalogo, non dalla risposta del `POST`:
versione `20260906142605` in `supabase_migrations.schema_migrations` FOUND ·
`pg_proc.proconfig = {search_path=""}` FOUND ·
`extensions.gen_random_bytes` nel sorgente FOUND ·
`random()` nel blocco del codice ASSENTE (atteso) ·
trigger `on_auth_user_created` invariato FOUND ·
quattro impronte `md5` identiche prima/dopo FOUND ·
righe 2253 → 2253 (e 2327 → 2327 sul superinsieme) FOUND.

## Self-Check: PASSED
