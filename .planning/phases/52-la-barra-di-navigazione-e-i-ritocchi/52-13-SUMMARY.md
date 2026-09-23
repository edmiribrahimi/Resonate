---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 13
subsystem: accesso, dati, media
tags: [nav-07, nav-02, rls, storage, migration, laboratorio, deploy]
requires:
  - "52-06: M1 applicata al laboratorio (gallery.view, storage_path, event_media_objects_select_by_row)"
  - "52-08 / 52-12: il codice che firma (gallery, pagina della serata, moderazione, azioni)"
  - "52-09 / 52-10: il banco dei media ripulito e ri-spogliato"
provides:
  - "M2 (20260923180100_gallery_close_data.sql), applicata al SOLO laboratorio dopo il deploy READY"
  - "gruppo gallery di verify:refusal e flag --section="
  - "scripts/probe-event-media-lab.mjs — sonde 1-4, 6-8 di P-52-G, solo laboratorio"
  - "EventMediaRow: storage_path string, url string | null"
affects:
  - "52-14: sonda 5 (proprietario) e sonda 7 (--check-new-upload dopo un caricamento vero)"
  - "52-15: in produzione lo stesso ordine M1 → deploy READY → M2, sotto atto datato; verify:capabilities e verify:refusal (gruppo gallery) restano rossi/rifiutati in produzione fino ad allora"
  - "52-17: il residuo della cache CDN (fino a 3600 s dopo M2) va nel VERIFICATION con i tempi misurati qui"
tech-stack:
  added: []
  patterns:
    - "migration di chiusura DOPO il deploy del codice che la sopporta (M1 → codice → M2)"
    - "sonda della cache in due letture: indirizzo cosi' com'e' e indirizzo con parametro unico (origine)"
key-files:
  created:
    - supabase/migrations/20260923180100_gallery_close_data.sql
    - scripts/probe-event-media-lab.mjs
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.lab-52-13-pre.json
    - .planning/phases/32-capability-model-in-the-database/baseline/32-BASELINE-policies.lab-52-13-post.json
  modified:
    - scripts/verify-refusal.mjs
    - scripts/verify-media-strip.mjs
    - src/types/database.ts
decisions:
  - "Il `DO` di M2 cerca il bucket come letterale quotato ('event-media') nel qual: per sottostringa avrebbe preso anche le policy di event-media-quarantine"
  - "M2 rilegge anche event-images (deve restare public = true): la migration chiude UN bucket e lo dimostra"
  - "verify-refusal riceve --section=<nome>: sul laboratorio 10 tabelle production_* su 11 sono vuote, quindi il run completo e' REFUSED per costruzione; il gruppo gallery ha cosi' un esito proprio, e il run completo resta dichiarato"
  - "La sonda 6 misura la coppia di policy (remove dell'oggetto, delete della riga) con la sessione organizer su un media di prova seminato dallo script: la server action non si invoca da uno script"
  - "La sonda 1 si fa in due letture: con parametro unico misura l'origine (bucket chiuso gia' a M2+28 s); senza misura cio' che riceve chi ha l'URL (cache fino a 3600 s)"
metrics:
  duration: "~40 min di lavoro + attesa della finestra di cache"
  completed: 2026-09-23
  tasks: 3
  files: 7
---

# Fase 52 Piano 13: M2 chiude la gallery, nell'ordine della produzione — Summary

M2 lega la lettura delle righe approvate di `event_media` a `gallery.view`,
toglie «Anyone can view event media», rende privato il bucket `event-media` e
rende obbligatoria `storage_path` dopo un secondo backfill. Sul laboratorio e'
stata applicata **dopo** il deploy `READY` del codice che firma: M1 (52-06),
poi il deploy, poi M2. Le sonde di P-52-G misurano il confine per ruolo.
L'origine e' chiusa gia' 28 s dopo M2. Un oggetto di una serata segreta
restava servito dalla cache CDN; la seconda corsa dopo la finestra e'
registrata in fondo.

## Task

| Task | Commit | Cosa |
|---|---|---|
| 1 — M2, strumenti, tipi | `6446548` | M2; gruppo `gallery` e `--section=` in `verify-refusal.mjs`; prosa di `verify-media-strip.mjs`; `probe-event-media-lab.mjs`; `database.ts` |
| 2 — il deploy nel mezzo | nessun file (esito qui) | push dello sha base su `lab`, `READY`, `curl` anonimo |
| 3 — M2 sul laboratorio, sonde, linee di base | `a29993a` | M2 applicata e riletta; B1 prima/dopo; sonde; `verify:refusal`; `verify:capabilities` |

### Task 1 — cosa c'e' nei file

- **M2** `supabase/migrations/20260923180100_gallery_close_data.sql`, versione
  maggiore di M1. Testata «NON APPLICARE PRIMA DEL DEPLOY DEL CODICE CHE FIRMA»
  con la ragione (Pitfall 10: immagini rotte a tutti); «UNA TRANSAZIONE SOLA, E
  NON C'E' `BEGIN;`»; «COSA QUESTA MIGRATION NON FA»; reversibilita' dichiarata
  («cio' che e' stato visto mentre era aperto resta visto»). Corpo:
  1. secondo backfill;
  2. `SET NOT NULL`;
  3. `event_media_select_gallery` (`status = 'approved' AND (SELECT private.has_capability('gallery.view'))`)
     al posto di `event_media_select_approved`;
  4. `DROP POLICY … "Anyone can view event media"`;
  5. `UPDATE storage.buckets SET public = false WHERE id = 'event-media'`;
  6. un `DO` che solleva in sette casi: righe nulle, SELECT su oggetti
     `'event-media'` non limitate a `{authenticated}`, bucket non `false`,
     `event-images` non `true`, policy nuova assente, vecchia policy presente,
     «Anyone» presente;
  7. `COMMENT` sulla policy, su `storage_path` e su `url`.

  «WHAT TO DO INSTEAD» con la riparazione in buona fede nominata. Le assenze
  sono descritte, non scritte. Zero righe `BEGIN;`/`COMMIT;`.
- **`verify-refusal.mjs`**: `section: "gallery"`, `tables: ["event_media"]`, con
  una nota che dice cosa misura. Il master legge anche per `staff.manage`,
  quindi il controllo positivo sono tutte le righe, non solo le approvate.
  `--section=<nome>` rifiuta (exit 2) un nome non dichiarato e stampa in testa
  che le altre sezioni non sono state misurate. Nessun verbo di scrittura:
  l'auto-controllo e' verde, `grep` dei cinque verbi → 0.
- **`verify-media-strip.mjs`**: ogni «the public bucket» → «the gallery bucket».
  `PUBLIC_BUCKET` tiene il nome, e un docblock datato spiega perche' (e'
  esportato, i controlli usano il letterale quotato). Una nota datata in F.
  Nessun controllo cambia comportamento: 6/6 verdi.
- **`database.ts`**: `url: string | null`, `storage_path: string`, commenti
  datati. Chiusa la divergenza dichiarata dal 52-06.
- **`probe-event-media-lab.mjs`**: rifiuta la produzione (sul ref e sull'URL
  dei client) prima di qualunque rete. Non stampa chiavi, URL, id o email.
  Revoca ogni sessione e rilegge la revoca. L'unica scrittura e' il media di
  prova della sonda 6, con pulizia in `finally`.

## Task 2 — il laboratorio al codice della fase

Precondizioni misurate prima del push (2026-09-23, UTC):

| Precondizione | Misura |
|---|---|
| M1 sul laboratorio | versione `20260923133108` `gallery_view_and_media_paths` nella history; `storage_path` esiste (letta 14:06Z) |
| `npm run build` | exit 0 |
| `npm run verify` | 23/24 verdi. L'unico rosso e' `verify:capabilities` **contro la produzione** (DB 15, GRANT 28: `gallery.view` assente). E' il rosso dichiarato da 52-06, lo chiude 52-15 |
| `lab` antenato dello sha da spingere | si' (`merge-base --is-ancestor`): avanzamento veloce |
| diff `origin/lab..7a79353` | 76 file · **0** sotto `docs/` o `.firecrawl/` · **0** `.env*` · **0** occorrenze di 26 valori segreti letti da `.env.local`/`.env.lab.local` · **0** occorrenze del ref del laboratorio · **0** token (JWT, `sbp_`, `sk_`, `re_`) · **0** UUID fra le righe aggiunte |

Push: `git push origin 7a79353…:lab` alle **14:25:46Z**, `65e9cc5..7a79353`.
**Solo `lab`**: `origin/main` era `65e9cc5` prima e `65e9cc5` dopo. Il codice
servito e' lo sha base: il commit del task 1 (M2 e script) non e' stato spinto.

| Deploy | Ramo | Sha | Creato (UTC) | `READY` (UTC) | Fonte |
|---|---|---|---|---|---|
| `dpl_DcQ9LFQYb9CWsksDWSJnte816oUp` | `lab` | `7a79353` | 14:25:54.844Z | **14:27:35.300Z** | API Vercel (`GET /v6/deployments`, `GET /v13/deployments/<id>`), alias `lab.resonatemotion.com` presente |

Verifica esterna, **14:27:48Z**: `curl -sI https://lab.resonatemotion.com/gallery`
senza sessione → `HTTP/2 307`, `location: /login?next=%2Fgallery`. E' la
registrazione chiesta dal piano 52-08.

## Task 3 — M2 sul laboratorio e le misure

**Ordine eseguito:** M1 (13:31:07Z, 52-06) → deploy `READY` (14:27:35Z) → M2
(**14:28:18Z**). Mai il contrario.

Linea di base «prima» alle 14:28:07Z:
`32-BASELINE-policies.lab-52-13-pre.json`, 94 policy, 40 tabelle con RLS.

Applicazione: `POST /v1/projects/<ref del laboratorio>/database/migrations`,
nome `gallery_close_data`, dalle 14:28:18.409Z alle 14:28:18.785Z, `HTTP 200 []`.
Script fuori dal repo, che rifiuta il ref di produzione prima della chiamata.
Nessun `db push`, nessun `/database/query` in scrittura.

**Rilettura dal catalogo, `read_only`, 14:28:27Z → 14:28:29Z:**

| Lettura | Valore |
|---|---|
| history | `20260923142818` `gallery_close_data` (coniata dall'endpoint), dopo `20260923133108` |
| `storage_path` / `url` | `is_nullable = NO` / `YES` |
| SELECT su `event_media` | `event_media_select_gallery` con qual `status = 'approved' AND (SELECT private.has_capability('gallery.view'))`; `select_own` e `select_admin` invariate; **`event_media_select_approved` assente** |
| policy su `storage.objects` per `'event-media'` | `event_media_objects_select_by_row` (SELECT, `{authenticated}`) e le due DELETE. **«Anyone can view event media» assente** |
| bucket | `event-media` `public = false`; `event-images` `true` (invariato); `event-media-quarantine` `false` |
| righe | approvate 3, in attesa 1: tutte con `storage_path`, e ancora con `url` (righe del banco, nate prima del codice nuovo) |
| commenti | `storage_path` aggiornato; commento su `event_media_select_gallery` presente |

**Linea di base «dopo» alle 14:28:36Z e confronto**
(`32-BASELINE-policies.lab-52-13-post.json`, 94 policy):

```
✗ policy_dropped — event_media.event_media_select_approved (SELECT)
✗ policy_added   — event_media.event_media_select_gallery (SELECT)
93 unchanged · 0 by T1 · 0 by T2 · 0 by both · 0 unexplained
```

La differenza e' **solo** la coppia di NAV-07. `baseline:compare` esce 1 per
costruzione: il whitelist D-23 segna come difetto ogni policy aggiunta o tolta.
Qui la differenza e' quella voluta. B1 copre lo schema `public`, non
`storage.objects`: la caduta di «Anyone can view» e il bucket privato sono
provati dalla rilettura del catalogo qui sopra.

### Le sonde di P-52-G — prima corsa, dentro la finestra di cache

`node scripts/probe-event-media-lab.mjs`, **14:28:46Z → 14:29:05Z**, exit 0.
Banco: 4 righe (3 approvate, di cui 2 di serata segreta; 1 in attesa). Sessioni
attendee, staff e organizer coniate; tutte e tre revocate globalmente, e la
revoca riletta: nessun token risolve ancora un utente.

| # | Ora (UTC) | Soggetto e azione | Atteso | Osservato | Esito |
|---|---|---|---|---|---|
| 1b | 14:28:49Z | anonimo, indirizzo pubblico **con parametro unico** (origine) | non 200 su 3/3 | 400×3 | conforme |
| 1a | 14:28:49Z | anonimo, indirizzo pubblico **cosi' com'e'**, 28 s dopo M2 | non 200 (dentro la finestra un 200 e' cache) | **200×1** 400×2 · `cf-cache-status` HIT×1 BYPASS×2 | **cache, dentro la finestra: NON dice «chiuso»** |
| 2 | 14:28:50Z | attendee, `event_media` `status=eq.approved` | 0 righe | 0 approvate · 0 in tutto | conforme |
| 3 | 14:28:50Z | attendee, `createSignedUrls` su 3 chiavi approvate note | 0 URL | 0 URL | conforme |
| 3 | 14:28:50Z | anonimo, idem | 0 URL | 0 URL | conforme |
| 4a | 14:28:50Z | staff (`gallery.view`, non `staff.manage`), firma della chiave **pending** | 0 URL | 0 URL | conforme |
| 4b | 14:28:51Z | staff, firma delle 3 **approvate** (2 di serata segreta) | 3 firmate, 3 servite 200 | 3 firmate (segrete 2) · GET 200×3 | conforme |
| 8 | 14:29:02Z | staff, firma a 5 s: GET subito, poi dopo 10 s | 200 · poi non 200 | 200 · poi **400** | conforme |
| 6 | 14:29:04Z | organizer: `remove` dell'oggetto, poi `delete` della riga di un media di prova seminato dallo script; riconteggio col service role (oggetto dal catalogo, riga da PostgREST) | oggetto elencato come rimosso · 1 riga · residui 0/0 | elencato · 1 riga · residui oggetti 0, righe 0 | conforme |
| 7 | — | nuovo caricamento da staff | `storage_path` si', `url` null | non eseguita: il soggetto nasce nel piano 52-14 (`--check-new-upload`) | rimandata a 52-14 |
| 5 | — | organizer guarda immagini e video | — | del proprietario, piano 52-14 | — |

**Corsa di sola lettura alle 14:29:21Z** (`--skip-write`, 60 s dopo M2),
lanciata dopo aver aggiunto alla 1a il conteggio per serata segreta: 1b 400×3.
In 1a **l'unico 200 servito dalla cache e' di una serata segreta** (200 di
serata segreta: 1). Con ogni probabilita' e' la foto ri-spogliata da 52-10,
che quel piano aveva gia' visto servita dalla cache per un'ora. Lo script non
stampa la chiave, quindi non e' verificato.

Dopo la sonda 6 il banco e' com'era: **4 righe, 4 oggetti, 0 residui della
sonda** (letto dal catalogo alle 14:30:30Z).

### `verify:refusal` e `verify:capabilities` contro il laboratorio

Ambiente: `.env.lab.local` sopra `.env.local`, con il rifiuto della
produzione prima di lanciare.

| Corsa | Ora (UTC) | Esito |
|---|---|---|
| `verify-refusal` completo, **PRIMA di M2** | 14:13Z | exit 1 · `event_media` master 4 · **attendee 3** · anon 0 → **FAILED**. Lo strumento scatta sul mondo aperto |
| `verify-refusal --section=gallery`, dopo M2 | ~14:29Z | **exit 0** · `event_media` master 4 · attendee **0** · anon 0 → *pair held* · revoche rilette, nessun token risolve |
| `verify-refusal` completo, dopo M2 | ~14:30Z | exit 2 · REFUSED 10 su 12. Pair held su `production_pipeline_rule` (16/0/0) e `event_media` (4/0/0); le 10 tabelle `production_*` del laboratorio sono vuote |
| `verify:capabilities` | ~14:30Z | **exit 0**, 5/5 · TS 16 · DB 16 · POLICY **12** (era 11: ora `gallery.view` la chiede anche una policy) · SRC 16 · GRANT 31 · «31 grants and 33 refusals» |

L'etichetta di `verify:capabilities` dice «production» qualunque sia il
bersaglio (`verify-capabilities.mjs:1665`, gia' segnalato da 52-06). Il
bersaglio era il laboratorio: lo provano DB 16 e GRANT 31.

### Produzione: zero scritture, e cosa resta rosso

- **Nessuna scrittura in produzione.** M2 e' andata **solo** al laboratorio. Le
  letture della Management API sono andate al laboratorio (`read_only`). La
  produzione ha ricevuto solo le interrogazioni `read_only` di
  `verify:capabilities` dentro `npm run verify`.
- **`verify:capabilities` contro la produzione: rosso** (DB 15, GRANT 28) fino
  a 52-15.
- **`verify:refusal` contro la produzione, gruppo `gallery`: non eseguito.**
  Coniare una sessione sull'identita' di una persona reale e' un atto che
  chiede un'autorizzazione datata. Il suo esito e' gia' scritto: la produzione
  ha zero media (52-01), quindi il controllo positivo tace e la riga risulta
  **REFUSED** (exit 2) finche' non esistono media. Il gruppo `gallery` diventa
  una misura in produzione solo dopo 52-15 e con righe presenti.

## La finestra di cache (Pitfall 15)

- **Origine chiusa a M2+28 s**: 400 su 3/3 con parametro unico, in entrambe le
  corse.
- **Cio' che riceve chi ha l'URL**: a M2+28 s e a M2+60 s un oggetto su tre, di
  una serata segreta, risponde ancora 200 dalla CDN (`HIT`). Scade al piu' tardi
  a M2+3600 s (**15:28:18Z**).
- **La seconda corsa** e' programmata a 15:29:48Z (finestra + 90 s), in sola
  lettura (`--skip-write`). Esito: sezione seguente.
- **Per 52-15:** in produzione il residuo e' zero per costruzione (zero media,
  52-01). La regola resta: si dichiara «chiuso» solo dopo la seconda lettura.
  Cio' che e' stato scaricato o copiato mentre il bucket era pubblico non
  rientra (`venue-secrecy.md`).

## Deviazioni dal piano

1. **[Regola 2 — misura altrimenti impossibile] `verify-refusal --section=`.**
   Sul laboratorio il run completo esce 2 per costruzione (10 tabelle
   `production_*` vuote). Il criterio «verde sul laboratorio col gruppo
   `gallery`» non era raggiungibile senza svuotare di significato l'exit 2. Ora
   il gruppo ha un esito proprio. Il run completo resta registrato come
   REFUSED. Commit `6446548`.
2. **[Regola 2] La sonda 1 in due letture** (origine con parametro unico e
   indirizzo cosi' com'e'). Senza, un 200 dentro la finestra non distingue un
   bucket aperto da una copia in cache. Commit `6446548`; il conteggio per
   serata segreta in 1a e' in `a29993a`.
3. **[Regola 1 — precisione] Il `DO` di M2 cerca `'event-media'` quotato.** La
   ricerca per sottostringa avrebbe incluso le policy di
   `event-media-quarantine`.
4. **`baseline:rls` solo B1.** Il piano parla di policy; B2 impersona i ruoli
   in transazioni di scrittura con `rollback`. Non serviva a questa differenza
   e non e' stato lanciato.
5. **Soggetti delle sonde risolti per ruolo a runtime.** Il seed del banco non
   ha un organizer: lo script prende il primo profilo di ogni ruolo sul
   laboratorio (attendee, staff, organizer: uno per ruolo esiste).
6. **Il banco non ha un video.** `PRE-LAB` lo chiedeva: le sonde 1-4 e 8
   misurano solo foto. Il video resta alla sonda 5 del proprietario (52-14).
7. **L'API Vercel si legge senza `teamId`.** Il token e' legato al team: con
   `teamId` risponde 403, senza risponde 200. Nessun cambiamento di token o di
   permessi.

## Known Stubs

Nessuno.

## Threat Flags

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: lab-write | scripts/probe-event-media-lab.mjs | scrive e cancella un oggetto e una riga di prova su `event-media` del laboratorio (sonda 6), col service role per il seme e la sessione organizer per la rimozione. Pulizia in `finally`; rifiuta la produzione prima di ogni rete |
| threat_flag: cdn-residual | (misura) | un oggetto di serata segreta servito dalla CDN fino a 3600 s dopo M2 (T-52-63/T-52-67): misurato, e dichiarato «chiuso» solo dopo la seconda corsa |

## Sonda 1, seconda corsa — dopo la finestra

Programmata alle 15:29:48Z (M2 + 3600 s + 90 s), in sola lettura. **Esito: da
registrare qui con un commit separato.** Finche' questa sezione non porta
numeri, NAV-07 sul laboratorio e' chiusa **all'origine**, e **non ancora** per
chi aveva un URL in cache.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20260923180100_gallery_close_data.sql`, `scripts/probe-event-media-lab.mjs`, i due artefatti B1 `lab-52-13-pre/post`
- FOUND: commit `6446548`, `a29993a`
- Il laboratorio e' stato riletto dopo M2 (versione `20260923142818`) e dopo la sonda 6 (4 righe, 4 oggetti)
- Nessun file `.env*` in stage; il SUMMARY non porta UUID ne' il ref del laboratorio; `STATE.md` e `ROADMAP.md` non toccati; su GitHub e' stato spinto solo `lab` (`origin/main` fermo a `65e9cc5`)
