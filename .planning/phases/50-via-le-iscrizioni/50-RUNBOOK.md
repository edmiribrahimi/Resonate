---
phase: 50-via-le-iscrizioni
document: runbook delle prove manuali
written: 2026-09-21
written_by: piano 50-09
walked: 2026-09-21, piano 50-10 — esiti in `50-ESITI.md`
requirements: [REG-01, REG-02, REG-03, REG-04, REG-05, REG-06]
procedures_gathered: 8
procedures_executed: 7
procedures_partially_executed: 0
authorisation_to_write_production: NON ANCORA CHIESTA (la chiede il piano 50-11)
---

# 50-RUNBOOK — le otto prove manuali della fase 50

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *chi ha il ruolo master*, *un membro
> dello staff assegnato a una serata* — **mai persone**. Nessun indirizzo
> postale, nessuna sede, nessuna data non annunciata, nessuna line-up. Gli
> indirizzi di posta sono quelli finti del banco, `@lab.invalid`. **Il
> riferimento del progetto di laboratorio non si scrive qui**: sta in
> `.env.lab.local`, che e' ignorato da git.

---

## Le tre righe che vengono prima di ogni procedura

**1. Non esiste un test runner per il prodotto.** `package.json` non ha uno
script `test` e non esiste alcun file `*.test.*` o `*.spec.*`. Nessuna riga di
questo documento puo' essere chiusa perche' «i test passano». `npm run build`
e' il typecheck, non una prova di comportamento.

**2. Le procedure si percorrono sul LABORATORIO, mai in produzione.** Il
laboratorio permanente e' il secondo progetto Supabase fedele alla produzione
(`.planning/v1.6-LAB-DESIGN.md`, dal 2026-09-07): `npm run dev:lab`,
`lab.resonatemotion.com`. Ogni script di laboratorio **rifiuta il riferimento di
produzione come prima riga eseguita**; uno script senza quel rifiuto non e' uno
script di laboratorio. Le sole scritture in produzione di questa fase sono
quelle del piano 50-11, e passano da `50-AUTHORISATION.md`.

**3. Il laboratorio va in pausa dopo una settimana senza traffico.** Se le
chiamate rispondono che il progetto e' in pausa, **riattivarlo dalla Management
API prima di cominciare** e aspettare che risponda: una procedura percorsa su un
progetto che si sta svegliando produce esiti che non significano niente.
Riattivazione riuscita il 2026-09-21.

---

## Le tre parole che questo documento usa

| Stato | Significato |
|---|---|
| **PERCORSA** | qualcuno l'ha eseguita e ha scritto **cio' che ha osservato**, con la data e il piano |
| **NON PERCORSA** | resta da fare. Non e' un fallimento: e' un lavoro con un proprietario |
| **NON ESEGUIBILE OGGI** | manca una precondizione, **nominata** |

**Si riporta l'osservabile, non l'aspettativa.** *«La pagina ha risposto 404 e
la barra non ha disegnato nessuna voce»* e' un esito. *«Verificato»* non lo e',
e nemmeno *«funziona»*.

Un passo non percorso **si dichiara non percorso**. Una riga inventata rende
questo documento peggio che incompleto: lo rende falso, e un documento falso
sulla porta e' peggio di nessun documento.

---

## Le precondizioni, nominate una volta e poi citate per sigla

| Sigla | Cosa | Come si ottiene |
|---|---|---|
| **PRE-LAB** | il laboratorio e' sveglio e la migration della fase e' applicata | `20260921120000` applicata il 2026-09-21 alle 12:48:29Z, versione coniata `20260921124829` (50-02) |
| **PRE-SEED** | il banco e' seminato | `node scripts/seed-lab-door.mjs --reset` poi `--seed` poi `--verify`. **Due avvertenze misurate il 2026-09-21:** `--reset` si ferma su un `23505` se esiste un ordine gratuito con due biglietti per la stessa persona — si sblocca con una `delete from public.tickets` prima; e `--seed` rifiuta di girare finche' `.env.lab.seed.json` esiste, che `--reset` **non** rimuove. Vedi `deferred-items.md` |
| **PRE-MEDIA** | lo staff ha titolo a caricare su una serata | il banco semina **solo** `door.operate`, e l'arm dei media chiede **`media.upload`**: senza, `P-50-4` passo 4.5 rifiuta sulla serata stessa a cui lo staff e' assegnato. Va concessa una seconda assegnazione |
| **PRE-ACCOUNTS** | i quattro account del banco esistono | `master@lab.invalid` (master), `door@lab.invalid` (staff), `member@lab.invalid` (member, **con** un biglietto), `member-spare@lab.invalid` (member, **senza** biglietti e senza tracce) |
| **PRE-FREE** | una serata `free_rsvp` con il suo livello a prezzo zero | `lab-free-night`, capienza 4, livello `RSVP` a 0 (seminata dal 50-01) |
| **PRE-SIGNUP-OFF** | il signup pubblico e' spento sul progetto di laboratorio | passo manuale, sotto |
| **PRE-DEPLOY** | il codice della fase gira sull'ambiente su cui si prova | per il laboratorio basta `npm run dev:lab` dal ramo corrente |
| **PRE-PHONE** | un telefono vero con la radio spenta | non un emulatore, non un `navigator.onLine` falsificato |

---

## I due passi manuali che nessun codice puo' eseguire

Vivono qui perche' un passo manuale non scritto e' un passo che non avviene.
Entrambi si eseguono **due volte**, su due progetti distinti, e ogni esecuzione
si data sulla propria riga.

### Passo manuale A — spegnere il signup pubblico

Due strade, stesso effetto. Sul cruscotto Supabase: *Authentication →
Sign In / Providers → **Allow new users to sign up*** → spento. Dalla
Management API:

```
PATCH https://api.supabase.com/v1/projects/{ref}/config/auth
Content-Type: application/json
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>

{ "disable_signup": true }
```

| # | Progetto | Chi lo esegue | Quando | Esito |
|---|---|---|---|---|
| A.1 | **laboratorio** | chi ha il ruolo master sul progetto | **eseguito 2026-09-21 alle 15:16:45Z** — piano 50-10 | **`PATCH` → 200.** Letto prima con una `GET`: `disable_signup = false`. Riletto dopo con una **seconda `GET` indipendente**: `disable_signup = true`. Provato dall'esterno con la chiave anonima: `422 signup_disabled` (`P-50-5`, `50-ESITI.md`) |
| A.2 | **produzione** | chi ha il ruolo master sul progetto | _da eseguire — piano 50-11, dentro l'autorizzazione datata_ | _da scrivere_ |

> **A.2 non si anticipa.** Spegnere il signup in produzione **prima** che il
> codice della fase sia dispiegato non rompe niente — la pagina d'iscrizione non
> esiste piu' nel ramo — ma e' una modifica di configurazione del progetto che
> l'autorizzazione della fase deve nominare insieme alle migration, o nessuno
> saprebbe che e' stata fatta ne' quando. Vale il verso dichiarato da D-50-24:
> prima il codice, poi le scritture.
>
> **E `disable_signup` non e' reversibile a costo zero**, anche se
> tecnicamente si rimette a `false`: nell'istante in cui torna falso, il
> prodotto riacquista un percorso d'iscrizione che nessuna superficie disegna e
> nessuna regola difende. Se un giorno andra' riacceso, andra' riacceso con una
> decisione scritta, non con un interruttore.

### Passo manuale B — togliere il modello di conferma d'iscrizione dal cruscotto

*Authentication → Emails → **Confirm signup*** — il modello va svuotato o
ricondotto al testo di default di Supabase.

Il file sorgente da cui quel modello veniva incollato **e' stato cancellato**
dal piano 50-08 (`src/emails/registration-confirmation.tsx` e il suo `.html`
pre-renderizzato). Il modello nel cruscotto **non e' cancellato dalla
cancellazione del file**: vive sul progetto, non nel repository.

| # | Progetto | Quando | Esito |
|---|---|---|---|
| B.1 | **laboratorio** | **misurato 2026-09-21 — piano 50-10, nessuna azione necessaria** | `mailer_templates_custom_contents.MAILER_TEMPLATES_CONFIRMATION_CONTENT` = **`false`**, cioe' **modello di default di Supabase**: sul laboratorio il modello personalizzato non e' mai stato incollato. Gia' nello stato di arrivo |
| B.2 | **produzione** | _da misurare e poi eseguire — piano 50-11_ | **e si misura senza aprire il cruscotto**: leggere lo stesso flag su `GET /v1/projects/{ref}/config/auth`. `false` → niente da togliere; `true` → il modello personalizzato c'e' e va ricondotto al default |

> **Perche' non basta il signup spento.** Con `disable_signup = true` nessuno
> puo' ricevere quella mail. Ma un modello che resta nel cruscotto e' una mail
> che torna viva il giorno in cui qualcuno riaprisse il signup senza
> ricordarsene — e quel giorno il prodotto manderebbe, con la propria voce, una
> conferma d'iscrizione a un percorso che non esiste. E' la stessa forma del
> gate *una sigla ritirata non si cita*: cio' che e' stato ritirato non resta in
> giro pronto a ripartire.

---

## Procedura P-50-1 — le superfici dell'iscrizione non esistono piu'

**Prova:** `REG-01`, `D-50-12`, `D-50-13`.
**Ruolo:** **tre soggetti distinti**, nell'ordine — anonimo (finestra privata),
poi un account leggero con ruolo `member`, poi chi ha il ruolo organizer.
**Ambiente:** **laboratorio**. `PRE-LAB`, `PRE-SEED`, `PRE-DEPLOY`.
**Stato:** **PERCORSA** — piano **50-10**, 2026-09-21, `50-ESITI.md`. Nove passi
pieni su undici; **1.3 non percorribile come scritta** (vedi sotto), 1.10 in
parte, 1.11 sul solo manifesto.

| # | Passo | Cosa si deve osservare |
|---|---|---|
| 1.1 | Da **anonimo**, aprire `/register` | **404**. Non un rimando, non una pagina vuota: la pagina non esiste |
| 1.2 | Da **member**, e poi da **organizer**, aprire `/register` | **404** anche a loro. Una 404 che dipende da chi guarda sarebbe un cancello, e qui non c'e' nessun cancello: non c'e' la pagina |
| 1.3 | **Dallo stesso browser che aveva seguito `/registrati` prima di questa fase** | **404**. E' il passo che nessun altro sostituisce: quel rimando era **permanente** (308), quindi **vive nella cache del browser** e il browser non richiede al server. Se qui esce ancora una pagina, l'osservabile e' *«la cache del browser serve un rimando a un indirizzo che non esiste»* — non un difetto del server |
| 1.4 | Da tutti e tre, aprire `/` | si finisce su `/events`. **Compreso chi e' loggato**: prima chi aveva una sessione finiva sul dashboard, e D-50-12 ha tolto quella biforcazione |
| 1.5 | Da anonimo, guardare la barra | **tre schede**: Events, Gallery, **Account**. Premere Account porta a `/login`. Prima di questa fase un anonimo non vedeva **nessuna** voce Account (D-50-13) |
| 1.6 | Da member, guardare la barra | **tre schede**: Events, Gallery, Account → `/dashboard`. **Una barra sola**, dove prima l'asse dell'approvazione ne produceva tre diverse per lo stesso ruolo |
| 1.7 | Da organizer, guardare la barra | **quattro schede**: le tre piu' Check-in, filtrata su `door.operate` |
| 1.8 | Aprire `/login` | **nessun «Sign up»**, nessun rimando all'iscrizione, in nessun punto della pagina |
| 1.9 | Su una serata con luogo segreto, aprire il dialogo del venue | **un solo chip, «Sign in»**. Il chip d'iscrizione e' uscito (D-50-11). **Nessun indirizzo compare in nessuno dei due casi**: quel ramo non ne ha mai mostrato uno |
| 1.10 | Sul menu drink di una serata, da anonimo | il banner porta **il solo link d'accesso**. Il link d'iscrizione e' uscito |
| 1.11 | Aprire l'app installata (PWA) | si apre su `/events` e **non paga un salto**: `public/manifest.json` dichiara `start_url` a `/events` dal piano 50-06 |

> **Il passo 1.3 e' quello che si dimentica.** Gli altri dieci si osservano da
> una finestra privata nuova; questo **non si puo'** osservare da una finestra
> privata nuova, perche' la cosa da provare e' proprio la cache di un browser
> che c'era prima. Serve un profilo di browser che abbia davvero seguito quel
> rimando, o il passo non e' stato percorso.

---

## Procedura P-50-2 — la migration, sul laboratorio

**Prova:** `REG-02`, `REG-03`, `REG-05`.
**Ruolo:** nessun ruolo di prodotto — si opera dalla Management API in sola
lettura, tranne l'unica chiamata che applica.
**Ambiente:** **laboratorio**.
**Stato:** **PERCORSA** — piano **50-02**, 2026-09-21, `50-02-SUMMARY.md`.

**Il runbook la riporta, non la ripete.** Cio' che si e' osservato:

| # | Passo | Osservato |
|---|---|---|
| 2.1 | conteggi **prima** | in `50-MEASURES.md` (piano 50-01), nove misure su due database |
| 2.2 | applicazione via `POST /v1/projects/{ref}/database/migrations` | **primo tentativo RIFIUTATO** alle 12:47:28Z, `400`, `2BP01`: quattro policy su `storage.objects` dipendevano dalla colonna. **L'intera transazione annullata, niente applicato a meta'** — e' il risultato che vale piu' di quello riuscito |
| 2.3 | applicazione riuscita | 12:48:29Z, `200`. **La versione coniata e' `20260921124829`, non il nome del file**: l'endpoint la conia con l'istante dell'applicazione, per la settima volta su sette |
| 2.4 | rilettura **dal catalogo**, mai dalla risposta del `POST` | colonne a 0; sei funzioni ridefinite con `proacl` identico; `get_user_status` **assente**; il `CHECK` degli atti con **dieci** valori |
| 2.5 | le tre query di REG-05 | zero — nella forma **corretta**, vedi la sezione REG-05 piu' sotto |
| 2.6 | `rsvps` contate | in `50-MEASURES.md`; D-50-22 le lascia in sola lettura |

**Cosa questa procedura NON prova:** niente sulla produzione. La stessa
migration in produzione e' il piano 50-11, e aspetta il deploy del codice
(D-50-24).

---

## Procedura P-50-3 — cancellare un account, e il rifiuto che dice la sua causa

**Prova:** `D-50-02`, `D-50-16`.
**Ruolo:** chi ha il ruolo **master**, sulla pagina membri.
**Ambiente:** **laboratorio**. `PRE-LAB`, `PRE-SEED`, `PRE-ACCOUNTS`.
**Stato:** **PERCORSA** — piano **50-10**, 2026-09-21, `50-ESITI.md`. Cinque
passi su sei; il sesto per meta' (l'affordance si osserva, la chiamata diretta
non ha un indirizzo che si possa chiamare da fuori). **Le cause provate sono
tre**, non due: biglietti, assegnazione a una serata, scansioni alla porta.

| # | Passo | Cosa si deve osservare |
|---|---|---|
| 3.1 | Su `member-spare@lab.invalid` — **nessun biglietto, nessuna traccia** — premere «Delete account» e confermare | l'utente Auth **e** il profilo spariscono. Rileggere entrambi dal catalogo, non dallo schermo |
| 3.2 | Sulla pagina del registro, dopo 3.1 | una riga con `act = 'deleted'`, **`subject_id` nullo** e `subject_label` uguale al **codice di membership** — mai un indirizzo, mai un nome. Il registro e' `append-only`: cancellare un account non cancella la sua storia |
| 3.3 | Su `member@lab.invalid` — **con un biglietto** — provare la stessa cosa | **rifiuto con la propria causa**: la frase nomina **quale** insieme blocca e **con quanti elementi** — *«1 biglietto»*, non *«qualcosa non ha funzionato»* |
| 3.4 | Dopo 3.3 | **niente e' cambiato**: il conteggio dei biglietti e' quello di prima e il registro **non** ha guadagnato un `deleted` |
| 3.5 | Su un account con una **scansione alla porta** | rifiuto con una causa **diversa** da quella di 3.3, che nomina le scansioni. Due cause diverse sono il punto: un messaggio unico le renderebbe indistinguibili |
| 3.6 | Sulla **propria** riga | il controllo **non e' disegnato**; una chiamata diretta risponde `self_delete` |

> **La riga di registro si scrive PRIMA della cancellazione**, e il prezzo e'
> dichiarato: se la cancellazione fallisce dopo, il registro porta un `deleted`
> per un account che esiste ancora. E' il verso giusto dei due — una traccia in
> piu' si legge, una cancellazione senza traccia non si contesta
> (`community-membership.md`, gate *chi decide e' tracciato*) — e la frase che
> l'operatore riceve lo dice.
>
> **Questa procedura e' l'unica prova di D-50-16 che esistera'.** Il censimento
> guarda **tredici** insiemi, non otto: chi la percorre provi almeno due cause
> diverse, o avra' provato che il rifiuto esiste e non che sa distinguere.

---

## Procedura P-50-4 — i media li carica chi ha titolo di lavoro, non chi e' un socio

**Prova:** `D-50-03`.
**Ruolo:** **tre soggetti**, nell'ordine — un account leggero `member`, poi chi
ha il ruolo organizer, poi un membro dello staff **con un'assegnazione viva** su
una serata.
**Ambiente:** **laboratorio**. `PRE-LAB`, `PRE-SEED`, `PRE-DEPLOY`, **piu'
un'assegnazione `media.upload`** — vedi il riquadro in fondo alla procedura.
**Stato:** **PERCORSA** — piano **50-10**, 2026-09-21, `50-ESITI.md`. Sei passi
su sei, con il banco esteso.

| # | Passo | Cosa si deve osservare |
|---|---|---|
| 4.1 | Da **member**, aprire il dashboard | **nessuna sezione dei propri media**: il mount e la lettura che la alimentava sono usciti col piano 50-08 |
| 4.2 | Da **member**, aprire una serata a cui ha partecipato | **nessun controllo di caricamento disegnato** |
| 4.3 | Da **member**, forzare l'azione di caricamento senza passare dalla superficie | rifiuto **nominato**: `MEDIA_UPLOAD_FORBIDDEN`. Non un 500, non una frase generica |
| 4.4 | Da **organizer** | il controllo c'e' e il caricamento riesce |
| 4.5 | Da **staff assegnato** alla serata X | il caricamento **sulla serata X riesce** |
| 4.6 | Dallo stesso staff, sulla serata Y a cui **non** e' assegnato | rifiuto. E' l'unica meta' che prova che l'assegnazione e' **per serata** e non un permesso generale |

> **Annotazione obbligatoria per chi legge l'esito, o lo leggera' al
> contrario.** Il caricamento dei membri **era gia' morto** prima di questa
> fase: il suo arm interrogava una tabella che non esiste in questo schema
> (misurato il **2026-08-08**), quindi *rifiutava sempre, per chiunque*. D-50-03
> si e' eseguita **rimuovendo** quel percorso, non restringendolo. Se il passo
> 4.3 fosse letto come «la fase 50 ha tolto ai soci il caricamento», si starebbe
> attribuendo a questa fase un restringimento che non e' avvenuto: non c'era
> niente da togliere.
>
> Lo stesso difetto viveva **due volte** — anche sulla superficie della pagina
> serata — e la ricerca ne censiva una sola. Entrambe le occorrenze sono uscite
> col piano 50-08.

> **`PRE-SEED` non basta per il passo 4.5, e il 2026-09-21 e' stato misurato.**
> Il banco semina **una sola** assegnazione, con **`door.operate`**. L'arm per
> serata di `src/lib/media/may-upload.ts:270` chiede **`media.upload`**: sono
> due titoli diversi, e stare alla porta non e' avere titolo a caricare. Con il
> banco prescritto, lo staff assegnato alla serata X riceve **sulla propria
> serata** lo stesso `403 forbidden.media_upload_required` che riceve sulla
> serata Y — e il passo 4.5 sembra un difetto del prodotto mentre e' un difetto
> del banco. **Chi percorre questa procedura conceda prima un'assegnazione
> `media.upload` sulla serata X** (`PRE-MEDIA`), o il passo non e' eseguibile.

---

## Procedura P-50-5 — il signup spento, provato dove il prodotto non puo' provarlo

**Prova:** `REG-04`, `D-50-06`.
**Ruolo:** **anonimo**, con `curl` e **la chiave anonima** del progetto — non
quella di servizio.
**Ambiente:** **laboratorio**. `PRE-LAB`, `PRE-SIGNUP-OFF` (passo manuale A.1).
**Stato:** **PERCORSA** — piano **50-10**, 2026-09-21, `50-ESITI.md`. Tre passi
su tre, `422 signup_disabled` riportato alla lettera.

> **Il passo 5.1 non e' eseguibile con un indirizzo `@lab.invalid`, e il
> runbook lo prescriveva.** GoTrue rifiuta quel dominio **prima** di rispondere
> sul signup: `400 email_address_invalid`. Chi lo percorresse alla lettera
> otterrebbe un `400` che non dice niente su `disable_signup`. Il laboratorio
> accetta **`@lab.test`** (TLD riservato, RFC 6761) e rifiuta anche
> `@example.com`. Misurato il 2026-09-21.

| # | Passo | Cosa si deve osservare |
|---|---|---|
| 5.1 | **Prima** di spegnere: `POST /auth/v1/signup` con la chiave anonima | un account nasce, o comunque **non** `signup_disabled`. E' la misura di controllo, e senza di lei il passo 5.3 non prova niente |
| 5.2 | Eseguire il passo manuale **A.1**, e datarlo | la risposta del `PATCH` e' `200` |
| 5.3 | Rieseguire la stessa chiamata di 5.1 | **`422`, codice `signup_disabled`** |

> **Questa e' la prova che il prodotto non puo' dare da solo, ed e' il motivo
> per cui la procedura esiste.** La pagina d'iscrizione e' cancellata: quella
> cancellazione dimostra che **il prodotto** non offre piu' quel percorso, e non
> dimostra **niente** sull'API. Chiunque abbia la chiave anonima — che sta nel
> bundle del browser, cioe' e' pubblica per costruzione — puo' chiamare
> `/auth/v1/signup` direttamente. *Il middleware e' UX, il confine vero sta
> altrove* (`access-gating.md`): qui il confine vero e' `disable_signup`.
>
> **Il passo 5.1 non e' un preambolo.** Senza la misura di controllo, un `422`
> al passo 5.3 potrebbe venire da una chiamata scritta male, da una chiave
> sbagliata o da un progetto in pausa, e nessuno saprebbe distinguerli.

---

## Procedura P-50-6 — con il signup spento, i percorsi di servizio creano ancora account

**Prova:** `REG-04`, assunzione `A1`.
**Ruolo:** chi ha il ruolo **master**, dalla pagina di creazione account.
**Ambiente:** **laboratorio**. `PRE-LAB`, `PRE-SIGNUP-OFF`, `PRE-DEPLOY`.
**Stato:** **PERCORSA** — piano **50-10**, 2026-09-21, `50-ESITI.md`. Cinque
passi su cinque, piu' una prova nuda di `auth.admin.createUser`.
**`A1` e' CONFERMATA sul campo**: cinque account creati su quattro percorsi
diversi con il signup pubblico spento, nessuno rifiutato. **Il passo manuale
`A.2` non e' bloccato da questa prova.**

| # | Passo | Cosa si deve osservare |
|---|---|---|
| 6.1 | Con il signup **spento**, creare un account dall'app | l'account nasce: esiste in `auth.users` **e** in `public.profiles` |
| 6.2 | Lo stesso passo, sulla risposta | il **codice di membership** torna a schermo, con il prefisso `RSN-` e 14 caratteri |
| 6.3 | Lo stesso passo, sulla posta | l'invito parte |
| 6.4 | Con il signup **spento**, un acquisto da ospite su una serata a pagamento | l'identita' leggera nasce lo stesso |
| 6.5 | Con il signup **spento**, processare una voce di guest list | l'invito parte e l'account nasce |

> **Perche' questa procedura e' la piu' pericolosa delle otto, e va percorsa sul
> laboratorio PRIMA della produzione.** `50-RESEARCH.md` §5.2 legge dal sorgente
> di `supabase/auth` che il controllo del signup compare in **due soli punti** —
> `signup.go:115` e `external.go:343` — e **non** in `admin.go`
> (`adminUserCreate`) ne' in `mail.go` (`adminGenerateLink`). Ma **la versione
> di GoTrue dispiegata sul progetto non e' nota da questo repository**: e'
> l'assunzione `A1`, e se fosse sbagliata **spegnere il signup spegnerebbe
> l'acquisto da ospite**, cioe' l'unica cosa che oggi vende.
>
> Il passo 6.4 e' quindi il passo che decide se il passo manuale **A.2** si puo'
> fare. Se 6.4 fallisce sul laboratorio, **A.2 non si esegue** e la fase si
> ferma a ripianificare.

---

## Procedura P-50-7 — l'ordine gratuito, dal modulo al biglietto

**Prova:** `REG-06`, `D-50-18b`, `D-50-26`.
**Ruolo:** **anonimo**, senza alcuna sessione.
**Ambiente:** **laboratorio**. `PRE-LAB`, `PRE-FREE`, `PRE-DEPLOY`.
**Stato:** **PERCORSA** — piano **50-05**, 2026-09-21, `50-05-SUMMARY.md`.

**Il runbook la riporta con il suo esito.** Osservato sulla serata
`lab-free-night`, capienza 4, livello `RSVP` a 0:

| # | Passo | Osservato |
|---|---|---|
| 7.1 | da anonimo, il modulo si disegna | tre campi — nome completo, mail, quantita' — **senza sessione** |
| 7.2 | un ordine da 2 | **2 biglietti**, un ordine |
| 7.3 | l'ordine | `status: completed`, `total_amount: 0.00`, `quantity: 2`, **`sumup_checkout_id: null`**, `buyer_name` valorizzato |
| 7.4 | i biglietti | `holder_label` `1 di 2` e `2 di 2` — **senza nome**; `issued_via: free_rsvp`; `sumup_checkout_id` nullo |
| 7.5 | l'account leggero | `profiles.full_name` uguale al nome digitato, `role: member` |
| 7.6 | la mail | **non partita**, e il motivo e' del laboratorio: la chiave di prova del fornitore accetta un solo destinatario. **Tre righe di log distinte** e **l'avviso a schermo** — *«i biglietti esistono, ma la mail non e' partita»*. Zero fallimenti silenziosi, osservato dal vivo |
| 7.7 | **rigiocare la stessa azione** con la stessa mail e un nome diverso | secondo ordine, **stesso `user_id`**, `full_name` del profilo **invariato**: il nome di un ordine non riscrive il nome di un account |
| 7.8 | il tetto | il selettore non offre piu' del tetto della serata |
| 7.9 | la capienza | *«There are fewer tickets left than you asked for… 1 left, 2 asked for.»* — le cifre vengono dal database, non dal client |
| 7.10 | la capienza somma anche gli RSVP storici | inserita a mano una riga storica: la pagina passa da **1 spots left** a **Sold out**. Riga poi **cancellata** |
| 7.11 | il campo vuoto | *«Enter the email where your tickets should go. Nothing was booked.»* — una causa propria, non una frase generica |
| 7.12 | il collegamento nella risposta | atterra sulla pagina dell'ordine **senza sessione**: due QR, il blocco «Completa il tuo account», **nessun nome** in nessun punto |

**Stato lasciato sul laboratorio:** `lab-free-night` ha **3 biglietti su 4**.
**Chi ripercorrera' la procedura riseminera' prima** (`PRE-SEED`), o il passo
7.9 misurera' una capienza gia' consumata.

**Cosa resta da percorrere di questa procedura:** il passo che conta i
**biglietti coniati rigiocando la stessa azione** (7.7 ha provato che l'account
non si riscrive, non che i biglietti non si duplicano su una **consegna
ripetuta**). Lo raccoglie il piano 50-10.

---

## Procedura P-50-8 — la porta, con la radio spenta

**Prova:** `REG-06`, e il confine che questo progetto difende per primo.
**Ruolo:** un membro dello **staff** assegnato alla serata.
**Ambiente:** **laboratorio**, su un telefono vero in **modalita' aereo**.
`PRE-LAB`, `PRE-SEED`, `PRE-PHONE`, e un biglietto gratuito coniato da
`P-50-7`.
**Stato:** _NON PERCORSA_ — **checkpoint aperto del piano 50-10**. Il banco e'
pronto: due biglietti gratuiti coniati, due posti liberi su quattro, e
**un'assegnazione `door.operate` concessa a mano sulla serata gratuita** —
`PRE-SEED` ne semina una sola, e sulla serata a pagamento.

| # | Passo | Cosa si deve osservare |
|---|---|---|
| 8.1 | **Con la rete accesa**, aprire la porta e lasciare che scarichi la sua lista | il riscaldamento e' un **passo**, non un preambolo: senza, la coda offline non ha niente contro cui decidere |
| 8.2 | **Spegnere la radio del telefono** — modalita' aereo, davvero | l'interfaccia dichiara di essere senza rete |
| 8.3 | Scansionare un biglietto **gratuito** | passa **come uno pagato**. Nessuna differenza di trattamento fra le due provenienze |
| 8.4 | Scansionare **due volte** lo stesso biglietto, sempre offline | la seconda e' **rifiutata**, e il rifiuto dice che e' gia' passato |
| 8.5 | Riaccendere la radio | la coda si sincronizza; le righe arrivano al database **una volta sola** |
| 8.6 | Rileggere dal catalogo dopo la sincronizzazione | le scansioni ci sono, e non sono duplicate |

> **Perche' la radio si spegne davvero.** Un `navigator.onLine` falsificato
> prova che il codice sa leggere un booleano; non prova niente sulla rete di una
> porta alle due di notte. `checkin-offline.md`: *rifiutare un ospite valido e'
> peggio che ammetterne uno doppio*, perche' il primo errore avviene davanti a
> una fila. Questa procedura esiste per l'asimmetria, e un ambiente simulato la
> toglie.
>
> **Cosa questa fase ha cambiato alla porta: niente.** Nessun piano della fase
> 50 ha toccato lo scanner, la coda o il predicato del portiere. La procedura si
> percorre perche' la fase ha creato **una provenienza nuova di biglietto**
> (`issued_via: free_rsvp`), e una provenienza nuova che la porta non ha mai
> visto e' esattamente la cosa che si scopre davanti a una fila.

---

## REG-05, e il perimetro scritto ACCANTO al comando

**REG-05 chiede che la lista del debito su `status` sia vuota** (D-50-04). La
prova esiste in due forme, e **la forma autorevole guarda il database, non i
file**: un grep sui file puo' dire «pulito» mentre il catalogo dice il
contrario, e viceversa.

### (a) Dal catalogo — la forma autorevole

Sul **laboratorio**, in sola lettura, il 2026-09-21 (piano 50-09):

```sql
-- 1. la colonna
select count(*) from information_schema.columns
 where table_schema='public' and table_name='profiles' and column_name='status';
-- → [{"n":0}]

-- 2. le funzioni, CON I COMMENTI SPOGLIATI e con prokind='f'
select p.oid::regprocedure from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public','private') and p.prokind = 'f'
   and regexp_replace(pg_get_functiondef(p.oid), '--[^\n]*', '', 'g')
       ~ '\mprofiles?\M[^;]*\mstatus\M';
-- → []

-- 3. le policy, nella forma CHE VEDE: `profiles` E `status`, non i due nomi
select schemaname, tablename, policyname from pg_policies
 where (coalesce(qual,'') || coalesce(with_check,'')) like '%profiles%'
   and (coalesce(qual,'') || coalesce(with_check,'')) like '%status%';
-- → []
```

> **Le due correzioni alle query di `50-RESEARCH.md` §1.5(a), e perche' non sono
> allentamenti.**
>
> **Sulle funzioni**, senza `prokind = 'f'` la query **non gira su questo
> database**: fallisce con `42809`, perche' `pg_get_functiondef` rifiuta gli
> aggregati e questo schema ne ha. E senza lo spoglio dei commenti restituisce
> **tre falsi positivi**: `pg_get_functiondef` restituisce il corpo **con i
> commenti dentro**, e la regex attraversa una riga di prosa italiana come
> attraverserebbe un predicato. Uno dei tre e' un commento della fase 49 su una
> definizione **superata**. Lo spoglio e' il precedente che questo repository ha
> gia' scritto: `verify-capabilities.mjs` spoglia i commenti prima di contare i
> riferimenti a `CAP.`, perche' *«una chiave nominata solo in un commento non e'
> un chiamante»*.
>
> **Sulle policy**, la query di §1.5(a) cercava `get_user_status|requires_approved`
> ed **era gia' cieca PRIMA della migration**: le quattro policy di
> `storage.objects` che hanno fatto fallire il primo tentativo non nominano
> nessuno dei due — interrogano `public.profiles` direttamente. Avrebbe risposto
> zero mentre esistevano. La forma qui sopra ne trovava **cinque** prima della
> migration e **zero** dopo.

Misure di contorno, stessa corsa, stesso database:

| Domanda | Risposta |
|---|---|
| le tre colonne dell'asse e del referral, insieme | **0** |
| controprova sulle funzioni, `p.status` / `profiles.status` nel codice spogliato | **[]** |
| `public.get_user_status` esiste ancora? | **0** |
| `private.role_capabilities.requires_approved` esiste ancora? | **0** |

### (b) Dai file — e il perimetro, che sta qui e non altrove

```bash
/usr/bin/grep -rnE "get_user_status|requires_approved|UserStatus|STATUSES|isPendingOrRejected" \
  src/ supabase/migrations/ scripts/ \
  | /usr/bin/grep -v "^supabase/migrations/"
```

**Il perimetro, scritto accanto al comando e non in un altro documento** — un
gate il cui perimetro vive altrove e' un gate che qualcuno allarghera' fino a
renderlo vuoto:

1. **Le migration storiche non si riscrivono.** `20260224_rbac_migration.sql`
   continuera' a contenere `ADD COLUMN status`, ed e' giusto: e' il verbale di
   cio' che e' successo. Un gate che pretendesse zero occorrenze **in tutto
   l'albero** chiederebbe di falsificare la storia.
2. **`status` resta il nome di una colonna su otto tabelle che sopravvivono** —
   `event_media`, `pending_purchases`, `ticket_refunds`, `drink_orders`,
   `drink_tokens`, `guest_list_entries`, `ticket_orders`,
   `drink_refund_request`. Per questo il comando cerca **cinque simboli**, non
   la parola `status`: un grep nudo su `status` restituisce centinaia di righe
   legittime e non prova niente.
3. **`membership_acts.status_before` / `status_after` restano, e sono prova.**
   La loro migration lo dichiara: *«una etichetta di stato memorizzata e' PROVA
   DI CIO' CHE ERA VERO ALLORA, non un puntatore a cio' che e' vero adesso»*.
   Chi cerchera' residui fra sei mesi li trovera': sono storia, non debito.

**Misura del 2026-09-21, piano 50-09** — e va letta per intero, perche' la
seconda riga non e' zero:

| Forma | Risultato |
|---|---|
| **dichiarazioni, identificatori e rami** in `src/` — cioe' il grep **con i commenti spogliati**, 311 file percorsi | **4**, e tutte e quattro dentro le **stringhe di descrizione** del catalogo delle capability. **Zero** dichiarazioni, zero letture, zero rami |
| **prosa** in `src/` — commenti che nominano ancora uno dei cinque simboli | **50 occorrenze in 24 file**, tutte `requires_approved` tranne una `get_user_status` |

**Le 50 occorrenze di prosa e le 4 stringhe non sono un cancello**, e la loro
disposizione e' scritta per esteso in `50-09-SUMMARY.md`, con l'elenco completo
`file:riga`, il proprietario e la ragione per cui questo piano non le chiude.
**L'elenco sta li' apposta**: un perimetro senza il suo censimento e' un
perimetro che si allarga.

---

## Il registro — otto procedure, sette percorse

| Sigla | Procedura | Stato | Chi l'ha percorsa / la percorre |
|---|---|---|---|
| `P-50-1` | le superfici dell'iscrizione | **PERCORSA** 2026-09-21 | **50-10** (`50-ESITI.md`) |
| `P-50-2` | la migration sul laboratorio | **PERCORSA** 2026-09-21 | **50-02** (`50-02-SUMMARY.md`) |
| `P-50-3` | cancellazione, e il rifiuto con la causa | **PERCORSA** 2026-09-21 | semina **50-01**; azione **50-07**; percorsa **50-10** (`50-ESITI.md`) |
| `P-50-4` | i media per titolo di lavoro | **PERCORSA** 2026-09-21 | **50-10** (`50-ESITI.md`) |
| `P-50-5` | il signup spento | **PERCORSA** 2026-09-21 | **50-10** (`50-ESITI.md`) |
| `P-50-6` | i percorsi di servizio con il signup spento | **PERCORSA** 2026-09-21 — **`A1` confermata, `A.2` si puo' fare** | **50-10** (`50-ESITI.md`) |
| `P-50-7` | l'ordine gratuito | **PERCORSA** 2026-09-21, e **ripercorsa**; passo residuo **chiuso** | **50-05** (`50-05-SUMMARY.md`) + **50-10** (`50-ESITI.md`) |
| `P-50-8` | la porta con la radio spenta | _NON PERCORSA_ — **checkpoint aperto** | **50-10** |

| Passo manuale | Stato | Chi |
|---|---|---|
| A.1 — signup spento, **laboratorio** | **eseguito** 2026-09-21 15:16:45Z | **50-10** |
| A.2 — signup spento, **produzione** | _da eseguire_ | **50-11**, dentro l'autorizzazione datata |
| B.1 — modello di conferma via dal cruscotto, **laboratorio** | **gia' nello stato di arrivo**, misurato 2026-09-21 | **50-10** |
| B.2 — modello di conferma via dal cruscotto, **produzione** | _da eseguire_ | **50-11** |

---

## Requisito → procedura

| Requisito | Procedura o prova |
|---|---|
| `REG-01` | `P-50-1`, piu' `verify:routes` e `verify:conversion` |
| `REG-02` | `P-50-2` (catalogo) piu' le due forme della sezione REG-05 |
| `REG-03` | `P-50-2` (le tre colonne a zero) piu' il grep sul referral |
| `REG-04` | `P-50-5` (nessuno entra) e `P-50-6`, `P-50-2`, `P-50-7` (chi entra ancora) |
| `REG-05` | la sezione REG-05, in entrambe le forme, con il perimetro |
| `REG-06` | `P-50-7` e `P-50-8` |

---

## Cio' che nessuna di queste otto puo' provare, e si dichiara invece di restare pendente

- **Che la produzione si comporti come il laboratorio.** Sono due progetti, e la
  versione di GoTrue dispiegata su ciascuno non e' nota da questo repository. Il
  laboratorio abbassa il rischio di `A1`; non lo azzera.
- **Che la cache dei browser altrui abbia dimenticato il rimando permanente.**
  Il passo 1.3 prova **un** browser. Gli altri li sistema il tempo, o non li
  sistema nessuno.
- **Che `npm run verify` chiuda a zero.** Non puo', per tutta la durata della
  finestra di deploy: `verify:capabilities` interroga la produzione, dove la
  migration non e' ancora applicata. **E' il costo dichiarato
  dell'inversione** (D-50-24), non un debito. Contro il **laboratorio** lo
  stesso gate e' **5/5 verde**.
