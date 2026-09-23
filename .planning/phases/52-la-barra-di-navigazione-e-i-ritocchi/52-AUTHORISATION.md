---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
document: autorizzazione a scrivere in produzione — M1, deploy, M2 di NAV-07 e la chiave gallery.view
written: 2026-09-23
written_at: "2026-09-23T18:16Z"
granted: yes
granted_date: 2026-09-23
granted_by: il proprietario
granted_at: "2026-09-23 ~18:22Z (20:22 locali), come riferita dall'orchestratore; registrata qui alle 18:21:29Z dell'orologio di questa macchina"
scope: "(a) M1 `20260923180000_gallery_view_and_media_paths.sql` dall'endpoint migrations, con rilettura read_only; (b) `git push origin main` e deploy Vercel di produzione atteso READY; (c) M2 `20260923180100_gallery_close_data.sql` dall'endpoint migrations, con rilettura read_only; (d) `verify:capabilities` e `verify:refusal --section=gallery` contro la produzione; (e) la sonda anonima su un oggetto approvato, se ne esiste uno — in quest'ordine, oggi, una volta"
answer: tutto
spent: no
status: CONCESSA, NON USATA — atto fermo al passo (a), nessuna scrittura in produzione
---

# Autorizzazione a scrivere in produzione — 2026-09-23, M1 → deploy → M2

> **Scritto PRIMA che la domanda venisse posta.** Il perimetro, i numeri e le
> finestre qui sotto sono stati fissati alle 18:16Z del 2026-09-23, quando il
> proprietario non aveva ancora risposto. La risposta si registra alla lettera
> nel §2; se restringe il perimetro, i passi esclusi si dichiarano **al loro
> posto** nel §3, senza riscrivere il §1.

`ai-engineering.md`, gate *l'autorizzazione a scrivere in produzione e' un atto,
non un permesso*: si consuma una volta, copre esattamente cio' che e' descritto
qui, e chi la riceve dichiara quando l'ha usata e quando l'ha esaurita. Le sei
precedenti del progetto sono ESAURITE e lo dichiarano da se' (l'ultima,
`51-AUTHORISATION-COMMENT.md`, alle 11:01:44Z di oggi).

**Il progetto di produzione non ha PITR.** Il ref e' la costante
`PRODUCTION_REF` degli script; il laboratorio non compare in questo documento.

**Oggi `verify:capabilities` e' ROSSO contro la produzione, ed e' atteso**:
riletto alle **18:16:10Z** in sola lettura, `TS 16 · DB 15 · GRANT 28`, falliti
i controlli 0, 1, 3 e 5, esattamente su `gallery.view` (chiave assente, tre
concessioni dichiarate senza riga). E' il gate che funziona: lo chiude questo
atto con il passo (a), non una modifica alle costanti. `verify:refusal`, gruppo
`gallery`, contro la produzione **non e' mai stato lanciato** (52-13): e' questo
atto a lanciarlo, e il §1 dice gia' quale uscita dara'.

---

## 0. I numeri di oggi, riletti in produzione

Management API, `POST /v1/projects/<produzione>/database/query`, **`read_only:
true` su ogni chiamata**, solo `SELECT` di conteggi e di catalogo; nessuna riga,
nessun URL, nessun path e nessun identificativo restituito o stampato. Stato del
progetto letto prima: **`ACTIVE_HEALTHY`** (18:14:45Z). Letture fra
**18:14:45Z e 18:15:09Z**; `now()` del database 18:15:01Z.

| Lettura | Censimento 52-01 (13:08:07Z) | **Oggi, 18:14–18:15Z** | Cambiato? |
|---|---|---|---|
| righe di `public.event_media` | 0 | **0** | no |
| `url` nella forma pubblica / di altra forma / con caratteri codificati | 0 / 0 / — | **0 / 0 / 0** | no |
| approvate / in attesa / rifiutate | 0 / 0 / 0 | **0 / 0 / 0** | no |
| righe senza serata / di serate con `venue_secret` | 0 / 0 | **0 / 0** | no |
| oggetti nel bucket `event-media` / orfani | 0 / 0 | **0 / 0** | no |
| `public` di `event-media` / `event-images` / `event-media-quarantine` | `true` / — / — | **`true` / `true` / `false`** | no |
| chiavi in `private.capabilities` / di cui `gallery.view` | — | **15 / 0** | — |
| concessioni per ruolo | — | **master 15 · organizer 13 · staff 0 · attendee 0 — 28** | — |
| ultima versione in `schema_migrations` | — | **`20260923110143`** `role_capabilities_comment` | — |
| colonne di `event_media` | — | `url` **NOT NULL**; `storage_path` **assente** | — |
| policy SELECT su `event_media` | — | `event_media_select_approved`, `_select_own`, `_select_admin` | — |
| policy su `storage.objects` per `'event-media'` | — | **«Anyone can view event media»** (SELECT, `{public}`) e le due DELETE; `event_media_objects_select_by_row` **assente** | — |

**Nessun numero del censimento e' cambiato.** La produzione non ha media: M1
riempie `storage_path` su **0 righe**, e il `DO` di M1 che solleva su una forma
d'URL diversa non ha soggetti.

**La porta e la vendita, oggi (stesse letture):** serate (`event_parties`) con
data fra ieri e domani **0**; con data da oggi in avanti **0** (3 serate in
tutto, tutte passate); eventi pubblicati con una serata futura **0**; biglietti
con `checked_in_at` nelle ultime 24 h **0**.

**La history non registra le migration per nome del file.** L'endpoint conia la
versione dall'ora della chiamata (`20260923110143` per il file
`20260923120000_…`): M1 e M2 compariranno con due versioni coniate, non con
`20260923180000` e `20260923180100`. E nessuna integrazione applica le
migration al push: il file `20260923120000_…` e' in `origin/main` e la sua
versione in produzione e' quella coniata dall'endpoint.

---

## 1. Il perimetro, e non un byte oltre

| # | Passo | Che cosa tocca, alla lettera |
|---|---|---|
| **(a)** | `POST /v1/projects/<produzione>/database/migrations` con **M1**, `supabase/migrations/20260923180000_gallery_view_and_media_paths.sql`, poi rilettura `read_only` | **1 chiave** (`gallery.view` in `private.capabilities`); **3 concessioni** (master, organizer, staff; attendee no) → 16 chiavi, **31** concessioni (16/14/1/0); **1 colonna** `event_media.storage_path` nullable, riempita dal backfill su **0 righe** (numero di oggi); `url` **DROP NOT NULL**; **1 `CHECK`** `event_media_storage_path_is_a_key`; **1 indice** unico `event_media_storage_path_key`; **1 policy** `event_media_objects_select_by_row` (SELECT su `storage.objects`, `TO authenticated`, `EXISTS` sulla riga); tre `COMMENT`. Il `DO` di M1 solleva se i conti non tornano: nessun effetto parziale |
| **(b)** | le precondizioni del §1.2 misurate; `git push origin main`; deploy Vercel di **produzione** atteso `READY`; `curl -sI https://www.resonatemotion.com/gallery` senza sessione | pubblica `65e9cc5..` la punta di `main`: oggi **`1665af30`**, **91 commit**, **93 file**, di cui **44 fuori da `.planning/`** (31 sotto `src/`, 11 sotto `scripts/`, piu' M1 e M2); piu' i soli commit di documentazione di questo piano, sotto `.planning/`. Lo sha spinto si rilegge al passo e si scrive nel §3. Atteso dal `curl`: `location` con `/login?next=%2Fgallery`. **Se il deploy non arriva a `READY`: stop, e (c) non si applica** |
| **(c)** | `POST …/database/migrations` con **M2**, `supabase/migrations/20260923180100_gallery_close_data.sql`, **solo dopo `READY` e il `curl` di (b)**, poi rilettura `read_only` | secondo backfill; `storage_path` **SET NOT NULL**; **1 policy sostituita** (`event_media_select_approved` → `event_media_select_gallery`, che chiede `gallery.view`); **1 policy tolta** («Anyone can view event media»); **1 bucket privato** (`event-media`, `public = false`); `event-images` resta `true` e il `DO` lo verifica; commenti |
| **(d)** | `npm run verify:capabilities` e `npm run verify:refusal -- --section=gallery` contro la produzione, **una corsa ciascuno** | il primo e' sola lettura. Il secondo **conia e revoca due sessioni** su identita' gia' esistenti — il `MASTER_EMAIL` e **un** profilo `attendee` risolto a run time e mai stampato — con `generateLink` non spedito + `verifyOtp`, poi `signOut(…, "global")` riletto; nessun `insert`/`update`/`upsert`/`delete`/`rpc`, nessuna riga letta (solo `HEAD` con conteggio), nessun token o indirizzo stampato. E' la forma di `51-AUTHORISATION-REFUSAL.md` |
| **(e)** | la sonda anonima: `GET` dell'indirizzo pubblico di un oggetto approvato, tenuto in memoria e **mai scritto** in `.planning/` | **nessuna scrittura**. Con i numeri di oggi **non ha soggetto** (0 oggetti): se al passo (e) gli oggetti approvati sono ancora 0, la sonda si dichiara *non eseguibile* nel §3, non si inventa un soggetto |

**Cosa daranno i gate, detto prima.** Dopo (a) `verify:capabilities` deve dare
exit 0, 5/5 (DB 16, GRANT 31). **`verify:refusal --section=gallery` dara' exit
2, RIFIUTATO**, finche' la produzione non ha una riga di media: su una tabella
vuota la risposta autorizzata e quella negata sono identiche e il controllo
positivo tace (`51-AUTHORISATION-REFUSAL.md`, §3). **Un 2 su zero righe e'
l'esito onesto, non un verde e non un difetto**: il criterio «verde» del piano
52-15 non e' raggiungibile senza seminare media in produzione, e seminare e'
**fuori perimetro**. La prova che le righe approvate sono illeggibili senza
`gallery.view` resta quella del laboratorio (52-13: attendee 0, anon 0, master 4)
piu' la rilettura del catalogo di (c).

**Fuori perimetro, esplicitamente:**
- ogni altra scrittura in produzione — tabelle, righe, ruoli, profili, oggetti,
  bucket diversi da `event-media`, campi di configurazione di Supabase o Vercel;
- la **rimozione per chiave** (D-52-30) e la **ri-spogliatura** (D-52-31):
  sono l'atto del piano 52-16, con la sua domanda. `purge-media-orphans` si
  ferma oggi con `schema_missing` (52-09) e dopo (a) non si ferma piu': **non si
  lancia** dentro questo atto, nemmeno in sola lettura come «prova»;
- ogni sessione coniata fuori da (d), una seconda corsa di (d), la creazione di
  profili o di media di prova;
- un'**invalidazione della CDN**: non serve con 0 oggetti (§1.1); se al passo
  (c) gli oggetti non sono piu' 0, l'invalidazione e' un atto nuovo, non
  un'estensione di questo;
- ogni push di un ramo diverso da `main` → `origin/main`, ogni push forzato.

**Reversibilita'.**
- **(a) M1 e' additiva**: nessuna policy chiusa, nessun dato tolto. Si annulla
  con una migration nuova che toglie chiave, concessioni, colonna e policy.
- **(b) il push si annulla con un nuovo deploy**: *promote* del deploy di
  produzione precedente in Vercel, o `git revert` spinto. Non si riscrive la
  history di `origin/main` (repo pubblico: cio' che e' stato spinto resta nei
  fork).
- **(c) M2 chiude, e si annulla solo allargando**, con una migration nuova (il
  «WHAT TO DO INSTEAD» del suo file dice quale). **Cio' che e' stato visto
  mentre era aperto resta visto** (`venue-secrecy.md`): con 0 oggetti oggi, non
  c'e' nulla di visto.
- **(d) ed (e)** non scrivono dati; le due sessioni di (d) si revocano nella
  stessa corsa.

**Provata sul laboratorio, nello stesso ordine.** M1 coniata `20260923133108`
alle 13:31:07Z (52-06); deploy del ramo `lab` `READY` alle 14:27:35Z; M2 coniata
`20260923142818` alle 14:28:18Z (52-13). La corsa del proprietario, su iPhone e
con tre fonti di supporto, fra le **16:13Z e le 17:15Z** (52-14): tutti i passi
percorsi passano; tre difetti trovati, chiusi da 52-18 e 52-19; laboratorio
`READY` al commit della correzione `93cfbcc4` alle **18:08:54Z**. **Aperta, e non
bloccante per l'ordine dei passi:** la conferma della correzione dello zoom
sull'iPhone del proprietario (iOS 26.7), misurata finora sul simulatore iOS 27.0.

### 1.1 Le tre finestre che l'ordine apre

| Finestra | Cosa e' vero in produzione | Conseguenza per chi usa il prodotto |
|---|---|---|
| **fra (a) e (b)** | M1 c'e', il codice e' ancora il vecchio | il codice vecchio scrive righe senza `storage_path` (nullable: nessun guasto); organizer e staff ricevono `gallery.view` ma il codice vecchio non ha il cancello: **la gallery resta aperta a ogni sessione, come oggi**. Nessun cambiamento visibile |
| **fra (b) e (c)** | codice nuovo, bucket ancora pubblico | barra nuova, porta a cinque linguette, rifiuto di `/gallery` per attendee e anonimi. Il codice nuovo firma sul bucket ancora pubblico. **Un attendee via API legge ancora le righe approvate** — con 0 righe oggi, non legge nulla. Una riga nata fra (a) e (b) senza `storage_path` non si firma (lo dice il testo dell'immagine) fino al ribackfill di M2 |
| **dopo (c)** | gallery chiusa sui dati, bucket privato | la CDN puo' servire un oggetto gia' in cache **oltre** il `max-age`: sul laboratorio una foto di serata segreta rispondeva 200 **62 minuti dopo M2** (52-13), la finestra di 3600 s non tiene. Poi il service worker (1 h per gli URL cross-origin) e l'ottimizzatore d'immagini. **In produzione il residuo e' zero solo se nessun oggetto di `event-media` viene aperto per indirizzo pubblico fra oggi e (c).** Oggi gli oggetti sono 0: il residuo e' zero **se sono ancora 0 al passo (c)**, e si rilegge li' |

**Durata attesa delle finestre:** quanto separa passi consecutivi — (a)→(b) il
tempo di un build Vercel (~2 minuti sul laboratorio), (b)→(c) il tempo del
`curl` e della rilettura.

### 1.2 Precondizioni della spedizione, da misurare al passo (b)

Misurate oggi alle **18:15:22Z** su `65e9cc5..1665af30`; **si rimisurano al
passo (b)** sulla punta effettiva di `main`, e se una fallisce il push non parte.

| Precondizione | Oggi |
|---|---|
| file sotto `docs/` o `.firecrawl/` nel diff | **0** |
| file `.env*` nel diff | **0** |
| il ref del laboratorio fra le righe aggiunte | **0** |
| valori di `.env.local` e `.env.lab.local` fra le righe aggiunte (25 valori) | **1**: l'indirizzo dell'account master del banco, dominio riservato **`.invalid`**, gia' pubblicato in `origin/main` in 4 file — non e' un segreto ne' una persona. **0** chiavi, token o password |
| token (JWT, `sbp_`, `sk_`, `re_`) / UUID fra le righe aggiunte | **0 / 0** |
| indirizzi pubblici di media fra le righe aggiunte | **0** |
| serate fra ieri e domani | **0** |
| serate in vendita con scansioni in corso (check-in nelle ultime 24 h) | **0** |
| `npm run build` sulla punta da spingere | da misurare al passo |

---

## 2. La domanda, alla lettera — e la risposta

Da porre al proprietario, con le tre opzioni e senza raccomandarne una:

> «La fase 52 in produzione, oggi 2026-09-23, in un atto solo e in
> quest'ordine: **(a)** M1 — una chiave nuova, `gallery.view`, a master,
> organizer e staff (non ad attendee), una colonna sui media riempita su **0
> righe**, una policy che fa firmare un oggetto solo a chi vede la sua riga;
> nulla si chiude. **(b)** il push di `main` — **91 commit**, zero file privati,
> zero segreti — e il deploy di produzione fino a `READY`: barra nuova, porta a
> cinque linguette, la gallery chiusa ad attendee e anonimi, i campi a 16 px.
> **(c)** solo dopo il `READY`, M2 — la gallery chiusa anche sui dati e il
> bucket dei media reso privato; si torna indietro solo riaprendo. **(d)**
> `verify:capabilities` (sola lettura) e `verify:refusal` sulla gallery, che
> conia e revoca due sessioni su account esistenti e con 0 media dara'
> «rifiutato», non verde. Oggi la produzione ha **0 media, 0 oggetti, 0 serate
> fra ieri e domani, 0 scansioni nelle ultime 24 ore**, e il progetto non ha
> PITR. Le finestre fra i passi sono nel §1.1. Autorizzi `tutto`, `senza-m2`
> — (a), (b) e (d) senza M2 — o `niente`?»

**Le opzioni, e cosa autorizza ciascuna:**

| Risposta | Autorizza | Resta aperto |
|---|---|---|
| `tutto` | (a), (b), (c), (d), (e), in quest'ordine, oggi, una volta | nulla di questo atto; la rimozione e la ri-spogliatura restano al 52-16 |
| `senza-m2` | (a), (b), (d); (c) ed (e) **non** si eseguono e si dichiarano al loro posto | la gallery resta leggibile via API da ogni sessione e il bucket pubblico: la seconda finestra del §1.1 resta aperta fino a un atto nuovo |
| `niente` | nessun passo | la fase resta chiusa sul laboratorio; `verify:capabilities` resta rosso contro la produzione |

Risposta del proprietario, letterale: **«tutto»** — 2026-09-23, riferita come
delle 18:22Z (20:22 locali) dall'orchestratore che ha posto la domanda del §2
alla lettera; registrata in questo documento alle **18:21:29Z** dell'orologio
di questa macchina, **prima di qualunque scrittura in produzione**. Lo scarto di
un minuto e' fra l'ora riferita (arrotondata) e l'orologio locale: non c'e' una
seconda risposta.

Autorizza **(a), (b), (c), (d), (e), in quest'ordine, oggi, una volta** — e
nient'altro: il «Fuori perimetro» del §1 resta tale per intero.

---

## 3. Registro d'uso

| # | Passo | Eseguito (UTC) | Riletto dal catalogo (`read_only`) | Esito |
|---|---|---|---|---|
| (a) | M1, `gallery_view_and_media_paths` | **non eseguito** — tentato alle ~18:23Z, la chiamata e' stata **negata dal livello dei permessi dell'ambiente di esecuzione** prima di partire | `read_only` alle 18:22:24Z (prima) e **18:23:46Z** (dopo): ultima versione `20260923110143`, **15** chiavi, **28** concessioni, `storage_path` assente — **invariato** | **STOP**: nessuna scrittura avvenuta |
| (b) | precondizioni · push di `main` · deploy `READY` · `curl` anonimo | **non eseguito** (l'atto e' fermo ad (a)); `npm run build` sulla punta misurato gia' alle 18:22:46Z: exit 0 | — | `origin/main` resta `65e9cc5` |
| (c) | M2, `gallery_close_data` | **non eseguito** (vincolo d'ordine: mai senza (a) e (b)) | — | — |
| (d) | `verify:capabilities` · `verify:refusal --section=gallery` | **non eseguito** | — | — |
| (e) | sonda anonima su un oggetto approvato | **non eseguito** (e comunque senza soggetto: 0 oggetti alle 18:22:24Z) | — | — |

Lo strumento che applica legge **questo documento** prima di partire e rifiuta
se `granted` non e' `yes`, se `granted_date` non e' la data di oggi o se lo
stato e' gia' `ESAURITA`.

---

## 4. Chiusura

— *(vuota: l'autorizzazione non e' ancora concessa)*

### Nota d'uso — 2026-09-23, 18:24Z: l'atto e' fermo prima del primo passo

La concessione e' registrata (commit `2a057939`, prima di ogni scrittura). Al
passo (a) lo strumento dell'atto — script fuori dal repo che legge questo
documento e rifiuta se `granted` non e' `yes`, se la data non e' oggi o se e'
esaurito — e' stato lanciato, e **l'ambiente di esecuzione ha negato il comando
prima che partisse**. Nessuna chiamata di scrittura e' arrivata alla produzione:
la rilettura `read_only` delle 18:23:46Z coincide con quella delle 18:22:24Z.

Non ho aggirato il diniego: il permesso dell'ambiente e' un confine distinto
dalla risposta del proprietario, e una risposta riferita da un altro agente non
lo sostituisce. **Il perimetro non e' stato speso**: `spent: no`. La concessione
e' datata **2026-09-23** e vale solo oggi; se l'atto riparte domani, si
richiede e si rileggono i numeri del giorno.
