---
phase: 37-manual-venue-reveal
plan: 13
subsystem: phase-verification
tags: [venue-secrecy, anon-probe, rsc-payload, container-harness, human-needed, read-only]

requires:
  - phase: 37-manual-venue-reveal
    provides: "37-01/37-03 — lo scrittore e la colonna VIVI in produzione"
  - phase: 37-manual-venue-reveal
    provides: "37-02 — il file della seconda migration, applicato a ZERO in produzione"
  - phase: 37-manual-venue-reveal
    provides: "37-05/37-06/37-07/37-08/37-09/37-10/37-11 — il codice di ramo, mai deployato"
provides:
  - "Le sonde anonime per chiave primaria contro la produzione, con esito letterale"
  - "La lettura del SORGENTE dei documenti serviti, aghi dichiarati prima, payload RSC compreso"
  - "La strada positiva di D-37-24 e quella negativa misurate nella stessa corsa, in container"
  - "I cinque rifiuti dello scrittore esercitati per la prima volta"
  - "L'elenco human_needed dell'intera fase, consolidato in un posto solo"
affects: ["37-VERIFICATION.md", "il piano che accompagnera' il deploy"]

tech-stack:
  added: []
  patterns:
    - "Una ricerca di aghi vale solo se e' stata vista diventare rossa: il sito deployato e' il controllo positivo dello strumento"
    - "Un documento con zero occorrenze perche' la pagina non ha reso NON e' una misura di assenza"
    - "Un hash di baseline si confronta sulle colonne pre-esistenti quando lo schema ha cambiato forma"

key-files:
  created:
    - .planning/phases/37-manual-venue-reveal/37-13-SUMMARY.md
  modified:
    - .planning/phases/37-manual-venue-reveal/deferred-items.md

key-decisions:
  - "La fuga anonima e' ANCORA APERTA in produzione, ed e' una decisione del proprietario, non un fallimento del rimedio"
  - "La strada positiva di D-37-24 e' misurabile solo in container: in produzione la funzione non esiste"
  - "Le due letture di cache NON sono eseguibili da nessuno oggi — il codice non e' deployato — e restano human_needed con la loro precondizione"
  - "nyquist_compliant resta false"
  - "VENUE-01 e VENUE-02 NON sono spuntati"

requirements-completed: []

metrics:
  duration: ~2h15min
  tasks: 3
  commits: 1
  files-created: 1
  files-modified: 1
  completed: 2026-08-11
---

# Fase 37 Piano 13: le sonde, e cosa significano davvero — Summary

**Con la sola chiave anonima, chiesto per chiave primaria, l'indirizzo di una
serata segreta **torna** — e questo e' l'esito atteso, perche' la migration che
lo chiude non e' stata applicata, per decisione del proprietario. Sul sito
online l'indirizzo delle due serate segrete e' nel documento di `/events` in
questo momento, e la scheda pubblica di ognuna delle tre sedi lo pubblica per
esteso. Il codice che ripara tutto questo esiste, non e' deployato, e le sue
pagine non si possono nemmeno rendere contro la produzione: lo abbiamo
misurato, e non e' un'ipotesi.**

## Zero scritture in produzione

- Ogni interrogazione privilegiata e' passata da `/database/query` con
  `read_only: true` — sessione `supabase_read_only_user`, dove un `INSERT`
  fallisce `25006`.
- Nessuna migration applicata, nessun `db push`, nessuna rivelazione manuale,
  nessun cron invocato, nessuna riga creata, modificata o rimossa.
- **Nessuna autorizzazione a scrivere in produzione e' stata chiesta ne'
  concessa.** Non c'e' quindi nulla di consumato: la voce corretta nel registro
  e' che non ne esiste una.
- L'unica chiamata a un percorso di scrittura (`A8`, sotto) e' stata costruita
  per **non poter scrivere su nessun ramo**, e la ragione e' misurata prima di
  premere: il rifiuto `party_not_found` esce dalla funzione ~124 righe **prima**
  dell'`INSERT`, e l'uuid usato non nomina alcuna serata.
- **Istantanea riletta prima e dopo le sonde: 22 tabelle, zero divergenze.**

---

## Il mondo com'e' oggi, misurato invece che ricordato

Il piano e' stato scritto quando alcune di queste cose non erano ancora vere.
Sono state rimisurate tutte, e tre passi del piano ne escono **non eseguibili**.

| Fatto | Misura |
|---|---|
| Migration applicate | **1 di 2.** `venues_select_public` e' ancora nei cataloghi; `venue_for_parties`, `party_start_instant` e `venues_select_staff` sono **assenti** |
| `record_venue_reveal_act` | viva, `SECURITY DEFINER`, ACL `{postgres, service_role}` |
| Chiavi capability / grant | 13 · 28 |
| Righe con `venue_revealed_at` valorizzato | **0** |
| Righe nella traccia | **0** |
| Serate · di cui segrete | 3 · **2** |
| `tickets` · `rsvps` | 0 · 0 |
| Ramo di lavoro | **219 commit** avanti a `origin/main`, che e' fermo al 2026-08-09 |
| Il sito online | serve il codice di **agosto**, non quello di questa fase |

**Conseguenza che governa tutto il resto: la fuga che questa fase esiste per
chiudere e' aperta in produzione, e resterebbe aperta anche applicando la
seconda migration senza deployare il ramo — al prezzo, in quel caso, di
spegnere il nome del locale su tutte le serate.** E' lo scambio che il
proprietario ha gia' valutato e deciso al checkpoint del piano 37-03.

---

## Task 1 — l'istantanea, e le sonde per chiave primaria

### L'istantanea, riletta contro il baseline di 37-03

**20 tabelle su 20 identiche**, conteggi e md5, con le due avvertenze che
`deferred-items.md` chiedeva di applicare e che sono state applicate:

- **`event_parties`** e' stato confrontato sulle **sole 24 colonne
  pre-esistenti**. L'md5 sull'intera riga serializzata e' oggi
  `934b0641…` contro `6d3275e3…` del baseline: **non e' un dato mosso, e'
  la colonna nuova che cambia la serializzazione di ogni riga.** Sulle 24
  colonne il valore e' **byte-identico** al baseline. Chi rilegge quel numero
  senza questa avvertenza trova una divergenza che non esiste (voce 3 di
  `deferred-items.md`, e la stessa trappola in cui lo strumento di 37-03 e'
  gia' caduto una volta).
- **`venue_reveal_acts`** non e' nel baseline perche' **non esisteva** quando fu
  preso. Misurata ora: **0 righe.** E' raggiunta da `ON DELETE SET NULL`, quindi
  ogni istantanea futura la conta fra le tabelle che una cancellazione
  **modifica**, non fra quelle che svuota.
- L'inventario delle cascate resta **18 tabelle**, non 17 (voce 2), piu' le due
  raggiunte da `SET NULL`, piu' questa terza.

### Le sonde, con la sola `NEXT_PUBLIC_SUPABASE_ANON_KEY`, nessuna sessione

Esito **letterale**. Nessun id, nessun indirizzo, nessun nome di sede.

| # | Sonda (per chiave primaria) | HTTP | Corpo |
|---|---|---|---|
| **A1** | `GET /venues?select=id,name,address,google_maps_url&id=eq.<sede della serata segreta A>` | **200** | **una riga, con nome, indirizzo e link Maps** |
| **A2** | `GET /venues?select=id,name,address&id=eq.<sede della serata NON segreta B>` | **200** | una riga, con nome e indirizzo |
| **A3** | `GET /event_parties?select=id,venue_secret,venue_id&id=eq.<serata segreta A>` | **200** | `venue_secret: true`, **`venue_id` leggibile** |
| **A4** | `POST /rpc/venue_for_parties {p_party_ids:[<serata segreta A>]}` | **404** | `PGRST202` — la funzione non esiste nella schema cache |
| **A5** | `POST /rpc/venue_for_parties {p_party_ids:[<serata NON segreta B>]}` | **404** | `PGRST202` — idem |
| **A6** | `GET /venue_reveal_acts?select=id` | **200** | `[]` — **zero righe, non un errore** |
| **A7** | `GET /event_parties?select=id,venue_revealed_at&id=eq.<serata segreta A>` | **200** | `venue_revealed_at: null`, **e leggibile** |
| **A8** | `POST /rpc/record_venue_reveal_act` con un uuid che non nomina alcuna serata | **401** | `42501` — *permission denied for function* |

**Come si leggono.**

- **A1 e A2 dovevano tornare vuote secondo il piano, e non lo fanno.** Il piano
  presupponeva la seconda migration applicata. Non lo e'. **A1 e' la fuga di
  `secret-venue-address-readable-by-anon.md`, riprodotta oggi, per chiave
  primaria, contro la produzione.** Non e' un fallimento del rimedio: e' il
  rimedio non applicato, e la decisione ha una data e un autore.
- **A3 e' il fatto atteso.** `venue_id` resta leggibile, ed e' la ragione per cui
  la concessione di 37-02 e' **per serata** e non per sede: qualunque riga di
  `venues` raggiungibile da un anonimo e' unibile alla serata segreta che la
  nomina.
- **A6 chiude il passo 2 della procedura manuale di 37-01**, in produzione: la
  traccia risponde `200 []` a un anonimo — **zero righe, non un errore**, che e'
  la forma corretta perche' non rivela l'esistenza della tabella come farebbe un
  403.
- **A7 e' una superficie che nessun piano aveva nominato.** Un lettore anonimo
  legge `venue_revealed_at` per ogni serata di un evento pubblicato: non
  l'indirizzo, ma **il fatto e l'istante di una rivelazione manuale**. Oggi vale
  `null` ovunque. Registrata sotto come threat flag.
- **A8 chiude il passo 1 di 37-01** dal lato della chiave anonima: lo scrittore
  **non e' raggiungibile** via PostgREST. La sonda e' stata costruita per essere
  innocua su ogni ramo, non fidandosi dell'ACL che avrebbe dovuto renderla tale.

---

## Task 2 — il sorgente, non il rendering

### Gli aghi, dichiarati prima di cercarli

**18 aghi**, sei per ognuna delle tre sedi: **indirizzo**, **link Maps**,
**nome**, **slug**, **id della sede**, **id della serata**. Cercati sull'**intero
documento** — payload RSC compreso — con conteggio esatto per occorrenza. I
**valori** non sono mai stati stampati, e non entrano qui.

### Il sito online, che e' il controllo positivo dello strumento

`https://www.resonatemotion.com`, **nessuna sessione**. Serve il codice di
`origin/main`, 2026-08-09 — **non** quello di questa fase.

| Documento | HTTP | byte | Aghi trovati |
|---|---|---|---|
| `/events` | 200 | 24 707 | indirizzo **×1**, Maps **×1**, nome **×1** della sede della serata segreta **#1**; idem **×1/×1/×1** per la segreta **#2**; indirizzo ×1, Maps ×1, nome ×2 della non segreta |
| `/events/<evento 1>` | 200 | 40 054 | id serata ×1 (segreta #1); nome ×2, slug ×2, id serata ×1 della non segreta. **Nessun indirizzo** |
| `/events/<evento 2>` | 200 | 35 247 | id serata ×1 (segreta #2). **Nessun indirizzo** |
| `/venues/<sede 1>` | 200 | 18 081 | **indirizzo ×2, Maps ×2, nome ×2, slug ×2 — sede di una serata SEGRETA** |
| `/venues/<sede 2>` | 200 | 18 300 | **indirizzo ×2, Maps ×2, nome ×2, slug ×2 — sede di una serata SEGRETA** |
| `/venues/<sede 3>` | 200 | 18 994 | indirizzo ×2, Maps ×2, nome ×2, slug ×2 — sede non segreta |

**Due cose, e la seconda vale piu' della prima.**

1. **La fuga di § B.2 e' viva.** L'indirizzo e il link Maps di **entrambe** le
   serate segrete viaggiano nel documento di `/events`, la pagina pubblica piu'
   visitata, e non sono renderizzati da nessuna parte: **nessuno sguardo alla
   pagina li avrebbe visti**. E' esattamente la catena che il piano 37-05 ha
   chiuso in tre punti, e che oggi non e' in produzione. La scheda pubblica
   della sede — quella che 37-08 ha tolto da `(public)` — pubblica l'indirizzo
   di una serata segreta a chiunque, con `HTTP 200`.
2. **Lo strumento e' stato visto diventare rosso.** Una ricerca di aghi che non
   ha mai trovato nulla non ha mai dimostrato di funzionare. Questi sei
   documenti sono il **controllo positivo**: gli stessi 18 aghi, la stessa
   funzione di conteggio, e 25 occorrenze trovate. Senza questa meta', uno zero
   sull'altra meta' non varrebbe niente.

### Il codice di ramo, servito in locale — e perche' il suo zero NON e' una prova

Build di produzione del ramo (`npm run build`, exit 0), servita in locale contro
il **database di produzione**. Stessi 18 aghi, stessi sei indirizzi:

| Documento | HTTP | byte | Aghi | Cosa e' successo davvero |
|---|---|---|---|---|
| `/events` | **200** | 14 805 | **0 su 18** | **la pagina ha lanciato**: `[events.venue_names_refused] PGRST202` |
| `/events/<evento 1>` | **200** | 18 894 | **0 su 18** | **ha lanciato**: `[event_detail.venue_for_parties_refused] PGRST202` |
| `/events/<evento 2>` | **200** | 18 890 | **0 su 18** | idem |
| `/venues/<sede 1..3>` | **404** | 10 399 | **0 su 18** | **la rotta non esiste piu'** |

> **Quello zero non dice che la fuga sia chiusa. Dice che la pagina non si e'
> aperta.** Contarlo come un verde sarebbe la specie di misura che questa fase
> ha passato tredici piani a evitare, e va scritto invece che lasciato dedurre.

**Cio' che quelle righe misurano davvero, ed e' la prima volta che qualcuno lo
esercita a runtime:**

- **Il rifiuto e' rumoroso, non silenzioso.** Le due pagine lanciano con **due
  categorie distinte** — `events.venue_names_refused` e
  `event_detail.venue_for_parties_refused` — mai fuse, con il codice PostgREST
  accanto. E' la decisione di 37-05 e 37-06, finora solo compilata.
- **Il documento d'errore non perde niente.** Zero occorrenze di `PGRST202`,
  del nome della funzione, del nome della categoria e di tutti e 18 gli aghi.
  Esce **solo** un `digest`.
- **Il vincolo di deploy e' dimostrato, non argomentato.** Codice senza
  migration = pagina pubblica giu'. **Si deploya insieme**, come i piani 37-05,
  37-06 e 37-08 avevano scritto.
- **`/venues/<slug>` risponde 404**, per tutte e tre le sedi. E' il criterio del
  Task 2, ed e' l'unico che il codice di ramo ha potuto soddisfare per
  osservazione.

### La strada positiva di D-37-24 — in container, nella stessa corsa della negativa

In produzione la funzione non esiste, quindi la strada positiva **non e'
misurabile la'**. L'unico strumento onesto e' l'harness gia' usato da 37-02:
Postgres 17.6 in container, shim + schema base + **tutte e 57** le migration —
quindi **entrambe** quelle di questa fase — dati finti, container distrutto a
fine corsa. Nessuna variabile d'ambiente, nessun contatto con la produzione.

**Lo stato degli oggetti, dai cataloghi:** su `public.venues` resta **una sola**
policy `SELECT`, `venues_select_staff`, `{authenticated}`, su `staff.manage`;
`venues_select_public` **assente**; `venue_for_parties` `SECURITY DEFINER`,
`STABLE`, ACL `{owner, anon, authenticated}` — `PUBLIC` assente.

| # | Chi chiede | Serata A (segreta) | Serata B (non segreta) |
|---|---|---|---|
| P1 | **anon**, `public.venues` per chiave primaria | *(insieme vuoto)* | *(insieme vuoto)* |
| P2 | **anon**, `event_parties` per chiave primaria | riga presente, `venue_id` leggibile | riga presente, `venue_id` leggibile |
| **P3** | **anon**, `venue_for_parties` | **niente** | **nome + indirizzo + link Maps** |
| P4 | **anon**, argomento `NULL` / id sconosciuto | 0 righe | 0 righe |
| P5 | membro **approvato**, senza biglietto ne' RSVP, finestra chiusa | niente | nome + indirizzo |
| P6 | membro **pending**, finestra chiusa | niente | nome + indirizzo |
| P7 | membro **pending** **con RSVP** sulla serata segreta | **nome + indirizzo** (livello 1, D-37-10) | nome + indirizzo |
| P8 | membro **approvato**, **dopo** una rivelazione manuale | **nome + indirizzo** (livello 2, D-37-02) | nome + indirizzo |
| **P9** | **anon**, dopo la stessa rivelazione manuale | **niente** | nome + indirizzo |

**P3 e' D-37-24 e il suo contrario nella stessa riga**, ed e' la misura che il
piano chiedeva: il rimedio riuscito e la rottura silenziosa sono finalmente
distinguibili. **P9 e' la parte che vale di piu'**: una rivelazione manuale apre
l'indirizzo a chi ha titolo e **non lo apre a un anonimo** — il livello 2 e' per
membro approvato, non per il mondo.

### Lo scrittore, esercitato per la prima volta

Il codice PL/pgSQL di 37-01 e' stato finora **letto e compilato, mai eseguito**.
Qui gira, in container:

| Chiamata | Esito |
|---|---|
| `anon` / `authenticated` chiamano `record_venue_reveal_act` | **`42501` permission denied** — la revoca ha morso |
| secondo `revealed` su una serata gia' rivelata | `{"ok":false,"reason":"already_revealed","revealed_at":…}` |
| `re_hidden` da un **non**-master | `{"ok":false,"reason":"re_hide_requires_master"}`, riga **non** cambiata |
| nome dell'attore vuoto | rifiuto argomentale `venue_reveal.actor_required` |
| serata inesistente | `{"ok":false,"reason":"party_not_found"}` |
| `act` fuori dal `CHECK` | rifiuto argomentale `venue_reveal.unknown_act` |
| `revealed` su una serata **non** segreta | `{"ok":false,"reason":"not_secret"}` |
| `re_hidden` su una serata mai rivelata | `{"ok":false,"reason":"not_revealed"}` |
| **ciclo intero** su una terza serata segreta | `revealed` **ok** → `venue_revealed_at` valorizzato → secondo `revealed` **rifiutato** → `completed` **ok** → `re_hidden` **ok** → `venue_revealed_at` **azzerato** |
| la traccia dopo il ciclo | **tre righe**, `revealed` · `completed` · `re_hidden`, con attore e destinatari previsti — **sopravvive al ri-nascondere** |
| `anon` che legge la traccia | **0 righe** |

**D-37-22 regge sul dato, non solo sulla vista.** Dopo il ri-nascondere la
serata continua a portare *«rivelato il … da …»* nella traccia mentre
`venue_revealed_at` e' tornato nullo, che e' la coppia di stati su cui la
decisione e' stata concessa. Cinque dei sei passi della procedura manuale di
37-01 sono cosi' esercitati — **in container**. Il sesto (una sessione `staff`
che legge la traccia) resta `human_needed`.

### `deferred-items` voce 4, misurata invece che dedotta

| Chi | Su un evento **bozza** |
|---|---|
| master, via `venue_for_parties` | **insieme vuoto** |
| lo stesso master, `public.venues` diretto (`venues_select_staff`) | **2 righe** |

La proprieta' che 37-05 e 37-06 avevano dedotto leggendo il `WHERE` e' ora
osservata: **su una bozza la funzione non restituisce il nome del locale a
nessuno, `staff.manage` compreso**, mentre le superfici di lavoro che leggono
la tabella diretta continuano a vederlo. Il verso dell'errore resta quello
sicuro. **La decisione va presa prima del deploy** — vedi sotto.

### Cosa questa procedura NON prova

> Prova che **18 aghi dichiarati** non compaiono in **sei documenti letti in un
> momento preciso** sul codice di ramo — e che su tre di quei sei la pagina
> **non si e' aperta affatto**, quindi il loro zero non e' una misura di
> assenza. Prova che righe chieste **per chiave primaria** sono state rifiutate,
> o concesse, da uno strumento diverso da quello che le ha prodotte.
>
> **Nessun meccanismo qui puo' asserire l'assenza di un canale.** Un percorso
> che nessuno ha pensato di cercare non compare in nessuna di queste tabelle.

---

## Task 3 — la cache attraverso l'istante: **non eseguibile, e va detto**

Il checkpoint chiede due letture — finestra privata e finestra gia' visitata —
prima e dopo l'istante di apertura, piu' la prova a rete disattivata.

**Nessuna delle tre e' eseguibile da nessuno oggi, e il motivo non e' la
prudenza: e' che non c'e' niente da guardare.**

1. **Il service worker con la regola nuova non e' in produzione.** Il sito
   online serve il worker di agosto. Misurarlo la' misura codice che questa fase
   non ha scritto.
2. **In locale la pagina della serata non si apre nemmeno con la rete accesa**
   — lancia `PGRST202`, misurato sopra. Una prova a rete spenta che trovasse la
   pagina chiusa non distinguerebbe la regola `NetworkOnly` dal guasto: sarebbe
   un verde che significa un'altra cosa.
3. **Non esiste alcuna serata rivelata**, ne' in produzione ne' in una finestra
   aperta: l'istante da attraversare **non c'e'**.

Cio' che e' stato misurato al posto, e che non lo sostituisce:

| Controllo | Esito |
|---|---|
| `public/sw.js` costruito | 51 832 byte; il matcher `pathname.startsWith("/events/")` **presente**, **una** occorrenza |
| la sua posizione | **ultima delle regole della porta**, quindi dentro l'array composto **prima** di `defaultCache`; handler la **stessa** classe minificata delle quattro regole `NetworkOnly` gia' presenti |
| il worker servito | `HTTP 200`, 51 832 byte |

Il build costruisce il worker; **non dice che una copia non venga servita**.
Resta `human_needed`, con la precondizione scritta: **dopo il deploy**.

---

## L'elenco `human_needed` della fase, consolidato — la prima volta in un posto solo

Dodici piani, undici voci. Nessuna e' silenziata; ognuna porta la sua ragione e
la sua precondizione.

| # | Cosa non e' provato | Da | Perche' non e' provabile oggi | Precondizione |
|---|---|---|---|---|
| **H1** | Un **organizer approvato e non proprietario** rivela con successo | 37-10, 37-11, VALIDATION | In produzione **non esistono** sessioni `organizer` ne' `staff`, e nessuno strumento di questo repository puo' autenticarsi come un ruolo | una sessione reale per ognuno dei ruoli |
| **H2** | Un **organizer non approvato** viene **rifiutato** | 37-10, 37-11, VALIDATION | Idem — **nessuno ha mai visto questo modello di permessi rifiutare qualcuno** | idem |
| **H3** | Una sessione **staff** legge `venue_reveal_acts` e ottiene **zero righe** | 37-01 passo 3 | Idem | idem |
| **H4** | **L'atto vero della rivelazione manuale** — la procedura in nove punti | 37-11 Task 3, `deferred-items` 5 | Checkpoint chiuso **`rimanda`** dal proprietario il 2026-08-11: con **zero destinatari** l'atto non esercita l'invio, e l'irreversibilita' comprerebbe la meta' meno interessante | **dopo** il deploy della seconda migration **e** dell'arretrato, con destinatari veri, e con **una nuova autorizzazione** |
| **H5** | Il **cron completa** una serata rivelata a mano | 37-09 | Richiede una serata segreta con destinatari e una corsa reale — scrittura su percorso irreversibile | come H4 |
| **H6** | Il **pavimento di 25 ore** rifiuta 6 **e nomina la causa**, su **entrambi** i campi del form | 37-04, 37-07 | E' un messaggio d'errore su un form, mai aperto | una sessione master e il form di una serata con venue segreto |
| **H7** | Il **dialogo dell'indizio** scrive **25 hours** e nomina l'RSVP e il caso «approvato senza biglietto» | 37-07 | Mai osservato su una pagina vera | una serata segreta con finestra `NULL`, pagina che rende |
| **H8** | I **tre livelli** resi a tre sessioni diverse sulla pagina pubblica | 37-06, VALIDATION | Nessun verdetto osservato: la pagina non rende contro la produzione | deploy |
| **H9** | Le **superfici di lavoro delle sedi** dopo lo spostamento: `/admin/venues` → riga → scheda **non vuota**; `/venues/<slug>` 404 **con** sessione; `/admin/venues/<slug>` respinto **senza** sessione; l'edit che aggiorna la scheda | 37-08 | Nessun server avviato con una sessione; nessun ruolo disponibile | una sessione master |
| **H10** | Il rifiuto **`venue_secret_locked`** del form su una serata **gia' rivelata** | 37-10 | Non esiste alcuna serata rivelata: `venue_revealed_at` e' valorizzato su **zero** righe | dopo H4 |
| **H11** | Le **due letture di cache** attraverso l'istante, e la pagina che **non si apre** a rete spenta | 37-07, 37-13 Task 3 | Il worker nuovo non e' deployato; in locale la pagina non si apre comunque; **non esiste un istante da attraversare** | deploy + una serata con finestra vera |

**Piu' un limite dichiarato, che non e' una voce da chiudere:** l'assenza di un
canale di fuga dell'indirizzo **non e' asseribile da alcun meccanismo**.

**Rapporto con il debito gia' aperto.** H1, H2, H3, H8, H9 sono della stessa
specie delle **32 voci `human_needed`** gia' registrate fra `43-`, `35-` e
`34-VERIFICATION.md`: una sessione con cinque account — master,
organizer/approved, organizer/pending, staff, member — ne chiude la maggior
parte, in questa fase e in quelle. **Questa fase costruisce un percorso
irreversibile sopra un modello di permessi che nessuno ha ancora visto rifiutare
qualcuno**, e va detto ogni volta che se ne parla.

---

## Cosa deve succedere **prima** che la seconda migration venga deployata

In ordine di costo crescente se si rimanda.

1. **La decisione di `deferred-items` voce 4 — `is_published` prima dei cinque
   rami.** Misurata sopra: su una bozza `venue_for_parties` non restituisce il
   nome del locale **a nessuno**, `staff.manage` compreso. Se chi prepara una
   bozza deve vederlo, la condizione va spostata **dentro** i rami — ed e' una
   modifica a una migration **non ancora applicata**. **Oggi costa una riga;
   dopo il deploy costa una migration in piu'.** E' una decisione di prodotto,
   non tecnica, e non e' presa.
2. **Codice e migration sono un atto solo.** Dimostrato, non argomentato:
   servita la build del ramo contro la produzione, `/events` e
   `/events/[slug]` **lanciano**. Vanno insieme
   `20260810161000_venues_read_narrowed.sql` **e** i piani 37-05, 37-06, 37-08.
   Nell'ordine inverso la vetrina perde il nome del locale **in silenzio**, che
   e' il verso peggiore.
3. **L'arretrato del ramo: 219 commit** oltre `origin/main`, fermo al
   2026-08-09. Non e' «l'onda successiva»: e' l'onda successiva piu' un deploy
   di tutto questo.
4. **Dopo il deploy, e non prima: H4.** Con destinatari veri l'atto e' una
   **rivelazione vera** e va concordata come tale (`venue-secrecy.md`). La
   strada «creo una serata di prova e la cancello» **non pulisce**:
   `venue_reveal_acts` punta a `event_parties` con `ON DELETE SET NULL`, quindi
   restano righe orfane con un nome per esteso, su un progetto **senza PITR**.
5. **`deferred-items` voce 1 resta aperta.** `EventParty` non dichiara
   `venue_reveal_on_purchase` ne' `venue_reveal_email_sent`, che esistono sulla
   tabella. Questo piano non modifica codice e non la chiude.

---

## `nyquist_compliant` di `37-VALIDATION.md` — resta **`false`**

Non e' prudenza: tre delle otto voci di sign-off non sono soddisfatte.

| Voce di sign-off | Stato |
|---|---|
| Ogni task ha un comando meccanico **oppure** un `human_needed` esplicito | ✅ |
| Continuita' di campionamento | ✅ |
| Wave 0: nessuna | ✅ |
| Nessun flag watch-mode | ✅ |
| Feedback latency < 150 s | ✅ |
| **Procedura anonima eseguita, con la strada positiva di D-37-24 nella stessa corsa** | ⚠️ **eseguita, ma su due strumenti diversi**: la negativa contro la **produzione**, la positiva in **container**, perche' in produzione la funzione non esiste. Non e' la stessa corsa che il documento intendeva |
| Le tre voci `human_needed` riportate nel `VERIFICATION.md` | ⬜ il `VERIFICATION.md` **non esiste ancora**; le voci sono qui, undici invece di tre |
| `nyquist_compliant: true` | ❌ |

**Requisiti.** `VENUE-01` e `VENUE-02` **non sono spuntati**, e la ragione e' la
stessa che 37-03 e 37-11 hanno gia' scritto: il percorso esiste da capo a fondo,
**non e' mai stato percorso**, e non e' in produzione. Finche' la voce 5 di
`deferred-items.md` e' aperta, `VENUE-02` non si spunta. `VENUE-01` chiede che
la rivelazione programmata resti il percorso normale **mentre la lettura anonima
e' chiusa**: oggi non lo e'. Un verde su un requisito di rivelazione mai
esercitato e' la categoria peggiore in cui averne uno.

---

## Deviazioni dal piano

### 1. [Rule 3 — lo strumento del piano misurava la cosa sbagliata] `$NEXT_PUBLIC_APP_URL` non e' il sito

Il blocco `<verify>` del Task 2 e'
`curl -s -o /dev/null -w "%{http_code}" "$NEXT_PUBLIC_APP_URL/events"`. In
`.env.local` quella variabile vale **`http://localhost:3000`**, e sulla porta
3000 di questa macchina ascolta **un container Docker che non c'entra nulla con
questo progetto**. La prima corsa ha infatti restituito `HTTP 404` e **zero
occorrenze per tutti gli aghi**, su sei documenti — un verde perfetto, prodotto
da un servizio estraneo.

**Trovato perche' i sei documenti pesavano tutti esattamente 64 622 byte**, che
non e' una cosa che sei pagine diverse fanno. Le letture sono state rifatte
contro `https://www.resonatemotion.com` (il dominio nudo risponde `307` verso
`www`). **Nessun risultato della prima corsa e' riportato in questo documento.**

E' la forma piu' pura del difetto che questa fase esiste per evitare: un
controllo che risponde verde senza aver guardato la cosa. Registrato in
`deferred-items.md`.

### 2. [Rule 1 — trovato durante] `npm run baseline:container` e' rotto

Il primo tentativo di harness e' fallito: `scripts/container/seed.mjs` **rifiuta
di girare** perche' `PROBE_PAYLOADS` non ha una voce per `venue_reveal_acts` —
la tabella creata da 37-01. Il rifiuto e' corretto e ben scritto (*«il seed non
puo' inventare una forma di riga che la write matrix non dichiara»*), ma il
comando **non e' piu' eseguibile** finche' qualcuno non aggiunge la voce.

**Non riparato qui:** questo piano non modifica codice, e allargare il diff di
un piano di verifica per toccare l'harness dei baseline RLS avrebbe reso piu'
difficile verificare l'unica domanda che questo diff deve reggere. Le sonde sono
state eseguite con `withContainer(..., { seed: false })` e fixture proprie.
Registrato in `deferred-items.md`.

### 3. [dichiarata] Ho rimosso un container che non avevo creato

A fine corsa `docker ps -a` mostrava `rls-baseline-…` **Up 2 days** — un
sopravvissuto di una sessione precedente, non mio (i miei erano di minuti prima
e l'harness li aveva distrutti dichiarandolo). L'ho rimosso con `docker rm -fv`.

L'harness stesso prescrive esattamente questo (*«WARNING: … remove it by
hand»*), il container e' per costruzione usa-e-getta e non contiene dati di
produzione — **ma non l'avevo creato io e l'ho rimosso senza chiedere.**
Dichiarato invece che taciuto.

### 4. [dichiarata] `deferred-items.md` modificato

L'unico file toccato oltre a questo SUMMARY, per registrare le due scoperte
sopra. Il piano dichiara `files_modified: []`; il protocollo dell'esecutore
chiede che le scoperte fuori perimetro finiscano li'. Ha vinto il secondo.

### 5. [ampliamento] Tre misure che il piano non chiedeva

Lo scrittore esercitato per intero, il ciclo completo `revealed → completed →
re_hidden` con la traccia, e la voce 4 di `deferred-items` misurata. Tutte in
container, tutte additive, nessuna tocca la produzione. La ragione: erano
gratuite una volta che l'harness era in piedi, e sono la prima esecuzione di
codice che tre piani hanno potuto solo compilare.

---

## Verifica — e cosa significa in un repo senza test runner

> **Non esiste un test runner per il prodotto.** Nessuna riga qui e' verificata
> perche' «i test passano».

| Controllo | Esito | Cosa prova davvero |
|---|---|---|
| `npm run build` | **exit 0**, `✓ Compiled successfully` | il typecheck. **Non** prova che una colonna esista: nessun client Supabase e' parametrizzato con `Database`, e `.rpc()` e' non tipizzato |
| `npm run verify:routes` | **exit 0**, PASS | `/admin/venues/[slug]` presente, `/venues/[slug]` assente dalla tabella delle rotte |
| `npm run verify:capabilities` | **exit 0 — 5/5 verde, 0 warning** | l'unico anello che vede la produzione, in sola lettura |
| `npm run verify:persona` | **exit 0 — 7/7 verdi** | la persona e' **coerente**, non che i suoi gate siano corretti |
| istantanea, prima delle sonde | 20/20 conteggi e md5 identici al baseline 37-03 | nessuna riga mossa dalle onde 3–6 |
| istantanea, **dopo** le sonde | 22/22 identiche a se' stesse | **nessuna riga mossa da questo piano** |
| sonde anonime | 8, esito letterale sopra | lette con la chiave che conta, per chiave primaria |
| documenti letti | 6 deployati + 6 locali, 18 aghi ciascuno | il **sorgente**, payload RSC compreso |
| sonde in container | 14, con entrambe le migration | la logica dei rami e i rifiuti dello scrittore |

### Cosa NON e' stato verificato

- **Tutto l'elenco `human_needed` sopra.** Undici voci.
- **Il comportamento sotto RLS con una sessione vera.** Il container gira le
  persona via `set_config('request.jwt.claims')`; e' il modello dei permessi
  eseguito, non una sessione autenticata da GoTrue.
- **Il payload RSC del codice di ramo su una pagina che rende.** Non esiste
  oggi un modo di produrne una: serve il deploy.
- **`npm run lint` non e' stato eseguito.** Questo piano non modifica codice.

---

## Note di sicurezza

| Threat | Esito |
|---|---|
| **T-37-53** — un rimedio che sembra completo perche' e' stato guardato il rendering | **mitigato**: letto il **sorgente**, documento intero, 18 aghi dichiarati **prima**, e lo strumento visto diventare **rosso** su sei documenti |
| **T-37-54** — una rottura silenziosa scambiata per un rimedio riuscito | **mitigato**: la strada positiva di D-37-24 misurata accanto alla negativa (P3, P9) — **in container**, e la differenza di strumento e' dichiarata |
| **T-37-55** — id, indirizzi e nomi di sede in un artefatto di verifica | **mitigato**: nel documento entrano solo forme e conteggi. Le sonde redigono i valori **prima** di stampare |
| **T-37-56** — un debito di verifica silenziato | **mitigato**: undici voci `human_needed`, ognuna con ragione e precondizione, in un posto solo |
| **T-37-SC** — installazioni di pacchetti | **accept**: nessun pacchetto installato, nessun checkpoint di legittimita' dovuto |

### Threat Flags

| Flag | Dove | Descrizione |
|---|---|---|
| `threat_flag: information-disclosure` | `public.event_parties` | **Un lettore anonimo legge `venue_revealed_at`** su ogni serata di un evento pubblicato (sonda A7). Non e' l'indirizzo, ma e' **il fatto e l'istante di una rivelazione manuale**, che nessun piano della fase aveva enumerato fra le uscite. Oggi vale `null` ovunque, quindi non ha ancora rivelato nulla. Va deciso se la colonna debba stare fuori dalla proiezione pubblica **prima** che la prima serata venga rivelata |
| `threat_flag: observability` | `src/app/(public)/events/**` | **Una pagina che lancia risponde `HTTP 200`.** Misurato: l'error boundary rende con stato 200. Un controllo di uptime sul codice di stato **non vedrebbe `/events` giu'**, e in questo progetto non esiste error tracking |

### Guardie monotone

Nessuna toccata. `venue_reveal_sent` non letto ne' scritto; `venue_revealed_at`
valorizzato su **zero** righe prima e dopo; la numerazione di serie non
sfiorata. L'unico allargamento esercitato — il ramo `re_hidden` che azzera
`venue_revealed_at` — e' avvenuto **in container**, sulla riga di una fixture.

## Known Stubs

Nessuno. Questo piano non scrive codice. Cio' che manca non e' un pezzo non
cablato: sono **misure non prendibili**, e sono elencate una per una.

---

## Self-Check: PASSED

- `.planning/phases/37-manual-venue-reveal/37-13-SUMMARY.md` — creato, presente
- `.planning/phases/37-manual-venue-reveal/deferred-items.md` — modificato, presente
- **Zero scritture in produzione.** Istantanea riletta a fine corsa: 22 tabelle,
  zero divergenze; `venue_reveal_acts` 0 righe; `venue_revealed_at` valorizzato
  su 0 righe; `venues_select_public` ancora presente
- **Nessuna autorizzazione a scrivere in produzione chiesta ne' concessa**,
  quindi nessuna consumata
- Container: nessun `rls-baseline-*` sopravvissuto (verificato con
  `docker ps -a`); server locale spento (porta 3100 chiusa)
- Nessun indirizzo, nome di sede, slug, id di serata, chiave o data non
  annunciata in questo file
- **Una correzione fatta da questo controllo, non dopo di esso:** la prima
  tornata di letture di documenti misurava un container Docker estraneo. I suoi
  sei zeri non compaiono in nessuna tabella di questo documento

---
*Phase: 37-manual-venue-reveal*
*Completed: 2026-08-11 — la fase e' costruita e misurata; non e' deployata, e la fuga che chiude e' ancora aperta per decisione.*
