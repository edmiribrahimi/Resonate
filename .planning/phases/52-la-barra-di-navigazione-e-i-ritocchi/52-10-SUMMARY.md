---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 10
subsystem: media-and-storage
tags: [exif, stripper, event-media, lab, D-52-31, NAV-07]
requires:
  - "52-01 (banco del laboratorio: una foto APPROVED pre-stripper con sezione GPS su una serata segreta)"
  - "52-06 (M1: storage_path popolato)"
provides:
  - "scripts/lib/server-only-shim.mjs — hook che fa caricare a un processo Node lo stripper del prodotto"
  - "scripts/restrip-event-media.mjs — ripasso dallo stripper, stesso path e stessa riga; laboratorio per default, produzione sotto atto consumato"
affects:
  - "52-16 (deve scrivere 52-AUTHORISATION-MEDIA.md nella forma del blocco restrip-event-media: grant)"
  - "52-17 (VERIFICATION: secondo scrittore fuori dal controllo A; residuo CDN; cancellazione datata delle istantanee)"
tech-stack:
  added: []
  patterns:
    - "type stripping nativo di Node 25 + module.register per importare un .ts server-only da uno script"
    - "lettura fresca (cache-busting) + eTag di storage.objects come seconda fonte"
key-files:
  created:
    - scripts/lib/server-only-shim.mjs
    - scripts/restrip-event-media.mjs
  modified: []
decisions:
  - "P4.1: lo stripper del prodotto si importa cosi' com'e' (type stripping + shim di server-only); niente copia della chiamata a sharp, niente rotta interna"
  - "P4.2: upsert: true sullo stesso storage_path e' voluto; l'irreversibilita' si paga con un'istantanea dei byte in .env.restrip-snapshot.<stamp>/ presa prima"
  - "P4.3: lo script e' un secondo scrittore su event-media fuori da src/, invisibile al controllo A di verify:media-strip; dichiarato nel docblock"
  - "Ogni lettura che decide scavalca la cache, e la sorgente si confronta con l'eTag del catalogo prima di spogliare: la CDN dello storage serve anche all'endpoint autenticato i byte vecchi fino al max-age"
  - "Le chiavi catturate si stampano come ordinale + impronta sha256 di 8 caratteri; l'id intero sta solo nell'indice dell'istantanea (ignorata da git)"
metrics:
  duration: "~25 min"
  completed: 2026-09-23
---

# Fase 52 Piano 10: ri-spogliatura delle foto pre-stripper — Summary

Lo strumento di D-52-31 ripassa ogni foto di `event_media` anteriore alla soglia dallo **stesso** `stripImageMetadata` del prodotto (importato via type stripping e uno shim per `server-only`, mai copiato), la riscrive con `upsert: true` sullo stesso `storage_path` senza toccare la riga, e lo conferma da tre fonti: rilettura fresca, eTag nel catalogo e URL firmato. Sul laboratorio la foto con GPS del banco ne è uscita senza EXIF, allo stesso indirizzo e con la stessa riga.

## Cosa è stato costruito

| Task | Esito | Commit |
|---|---|---|
| 1. Hook per `server-only` e prova di caricamento | lo stripper del prodotto si carica sotto lo shim e spoglia un JPEG con EXIF (exit 0); senza shim fallisce con `ERR_MODULE_NOT_FOUND` | `555c619` |
| 2. `scripts/restrip-event-media.mjs` | laboratorio per default; produzione solo con blocco `restrip-event-media: grant` letto e marcato **solo** fra i marcatori; `--before` obbligatorio; istantanea prima; video contati | `780ea3b` |
| 3. Prova sul laboratorio, e il fix che ne è uscito | vedi sotto | `bf9223d` |

**Le tre scelte di P4 stanno nel docblock dello script** (righe 28-63): lo stripper vero via shim, `upsert: true` voluto con istantanea, secondo scrittore fuori da `src/`. Nessun `import` statico nello script: la prima istruzione eseguita è `await import("./lib/server-only-shim.mjs")`, e anche i builtin arrivano dopo. Lo shim tocca **solo** lo specificatore esatto `server-only` (nessun prefisso, nessuna regex). `package.json` non è cambiato.

## La prova sul laboratorio (2026-09-23, UTC)

Soglia del laboratorio letta dalla history: `20260809006000` registrata come `20260907094330` → **2026-09-07T09:43:30Z**. Lo script la confronta da solo con `--before` e, se non coincidono, si ferma con `threshold_disagrees`.

| Momento | Fatto misurato |
|---|---|
| 13:43:56 `--dry-run` | 1 foto pre-soglia (quella del banco, approved, serata segreta); 0 video; 0 righe senza `storage_path`; istantanea: 1/1, exif 354 byte |
| 13:44:27 `--apply` (prima versione) | **fermato con `still_has_exif`, uscita 1.** Il catalogo registrava già i byte spogliati (size 293, eTag = md5 dell'output dello stripper), ma la rilettura dall'endpoint autenticato veniva servita **dalla cache** con i 651 byte originali, GPS compreso (`cacheControl max-age=3600`). Il gate interno ha fatto il suo lavoro: nessun successo dichiarato su una rilettura sbagliata |
| 13:46 | fix (`bf9223d`); foto originale **ripristinata dall'istantanea** (sha256 verificato contro l'indice): la via di ritorno funziona |
| 13:47:39 prima | lettura fresca: 651 byte, EXIF 354 byte, **puntatore GPS presente**; `event_media` 4 righe, bucket 4 oggetti |
| 13:47:44 `--apply` (versione finale) | EXIF **354 → 0 byte**, 293 byte scritti sullo stesso path; rilettura fresca identica all'output dello stripper; catalogo 1/1; URL firmato 1/1 senza EXIF; riga catturata riletta identica (JSON intero); oggetti non catturati: 3, riscritti 0; **uscita 0** |
| 13:47:55 dopo, controllo indipendente (script separato, lettura fresca) | 293 byte, **EXIF 0, nessun puntatore GPS**; stessa riga (JSON identico, stesso `storage_path`), stesso conteggio righe (4); in `storage.objects` è cambiato `updated_at` **solo** dell'oggetto catturato; 0 oggetti riscritti, spariti o aggiunti |
| 13:47:56 secondo `--dry-run` | la stessa foto è ancora «pre-soglia» (la selezione è per data), ora con exif 0 byte |

**Residuo misurato, non supposto:** subito dopo l'atto, la lettura *attraverso* la cache serviva ancora 1 foto su 1 nella versione precedente (`cdn_stale`, `max-age=3600`). Vale per chiunque abbia l'URL, finché il bucket è pubblico, e fino a un'ora dopo la riscrittura. M2 (bucket privato) non richiama le copie già in cache né quelle già scaricate. Va scritto nel VERIFICATION (52-17) con questo tempo.

**Idempotenza.** Lo strumento è idempotente nell'**effetto** (una foto già spogliata ne esce senza metadati) ma non nel **conteggio**: un secondo passaggio ritrova le stesse foto e le ri-codifica. Sull'immagine del banco (64×64, colore pieno) la doppia spogliatura è risultata identica byte per byte (293 byte, stesso md5), ma questo **non si generalizza** a una foto vera: la ri-codifica JPEG non è lossless. Per questo in produzione si esegue **una volta**, sotto un atto che si consuma.

**Istantanee.** Cinque directory `.env.restrip-snapshot.2026-09-23T13-4*` (due `--dry-run`, tre `--apply`) nella radice del worktree. `git check-ignore -v` le attribuisce a `.gitignore:34:.env*` e nessuna compare in `git status`. Contengono solo la foto sintetica del banco (colore pieno, GPS in mare aperto): nessuna persona. La loro cancellazione è il passo datato del piano 52-17.

**Rifiuto della produzione, provato:**
- ref di produzione senza atto → exit 2 prima di ogni lettura;
- documento inesistente → exit 2;
- blocco con `spent: yes` (con uno `spent: no` fuori dal blocco, ignorato) → exit 2;
- `--before` diverso dal `before` dell'atto → exit 2;
- documento senza blocco → exit 2;
- `--before` assente → exit 2.

**Zero scritture in produzione.** In questo piano nessuna chiamata ha raggiunto la produzione: i test di rifiuto escono prima di qualunque rete. `52-AUTHORISATION-MEDIA.md` non è stato creato. Nota per 52-16: in produzione `20260809006000` non è nella history (52-01), quindi `--before` e il `before` dell'atto vanno fissati dal proprietario. Lo script lo dice (`(0) history: … NON registrata`) e non deduce nulla.

## Verifica

| Controllo | Esito |
|---|---|
| `node --check` sui due script | ok |
| Comando di verifica del task 1 (stripper sotto shim, JPEG con EXIF → senza) | exit 0 |
| Grep di accettazione del task 2 (shim, blocco, `upsert: true`, `stripImageMetadata`, zero `.rotate(`/`.withMetadata(`/`keepMetadata`) | ok |
| `npm run verify:media-strip` | 6/6 verdi. **Il controllo A scansiona solo `src/`, quindi non vede questo script**: è la scelta 3 di P4, dichiarata |
| `npm run build` | riuscito |
| Prova sul laboratorio | vedi tabella sopra |

Non esiste un test runner: nessuna affermazione qui si basa su «i test passano».

## Deviazioni dal piano

### Problemi corretti automaticamente

**1. [Regola 1 - Bug] Una rilettura servita dalla cache avrebbe potuto sia accusare una scrittura riuscita sia far spogliare una versione vecchia**
- **Trovato durante:** Task 3, primo `--apply` sul laboratorio.
- **Problema:** l'endpoint autenticato di download dello storage passa dalla CDN con il `max-age` dell'oggetto. Subito dopo la sovrascrittura restituiva i byte originali con il GPS. Lo stesso percorso usato per l'istantanea e per la sorgente avrebbe potuto salvare, o spogliare e riscrivere, una versione non corrente.
- **Correzione:**
  - `freshRead` (parametro unico in query e `Cache-Control: no-cache`) per ogni lettura che decide;
  - la sorgente si confronta con l'eTag di `storage.objects` prima di spogliare (`source_stale`; gli eTag multipart si contano come `source_unverifiable`);
  - la rilettura deve coincidere byte per byte con l'output dello stripper (`readback_mismatch`) e col catalogo (eTag e size);
  - la lettura attraverso la cache si misura e si conta come `cdn_stale`, cioè il residuo dichiarato, non un errore.
- **File:** `scripts/restrip-event-media.mjs`. **Commit:** `bf9223d`.

**2. [Regola 2 - Correttezza] Controlli aggiunti oltre al piano**
- Confronto `--before` ↔ history dove la migration è registrata (`threshold_disagrees`).
- Righe pre-soglia senza `storage_path` o di tipo sconosciuto contate e dichiarate (`unreachable_rows`), mai saltate in silenzio.
- Confronto prima/dopo di **tutti** gli oggetti del bucket in `storage.objects` (`collateral_write`; gli oggetti spariti per mano di un altro strumento, cioè 52-09 sullo stesso banco, si contano come `bench_changed`).
- Il JSON intero delle righe catturate viene riletto e confrontato.

**3. Stampa delle chiavi.** Il prompt chiedeva di stampare la lista degli id catturati; il piano vieta id sullo standard output. Ha vinto il più restrittivo: sullo standard output vanno l'ordinale e un'impronta sha256 di 8 caratteri, l'id intero sta solo nell'indice dell'istantanea (ignorata).

### Banco condiviso con 52-09
Al momento della prova il laboratorio aveva 4 righe `event_media` e 4 oggetti: 52-09 aveva già agito su rifiutato e orfano. Lo strumento non li ha selezionati (la selezione è per data, e sono successivi alla soglia). Nessun oggetto è sparito durante gli atti.

## Stub noti
Nessuno.

## Threat Flags

| Flag | File | Descrizione |
|---|---|---|
| threat_flag: second-writer | scripts/restrip-event-media.mjs | scrittore su `event-media` fuori da `src/`, invisibile al controllo A di `verify:media-strip` (T-52-47, dichiarato) |
| threat_flag: cdn-residual | scripts/restrip-event-media.mjs | misurato: la versione con GPS resta servita dalla cache fino a `max-age=3600` dopo la riscrittura (T-52-50) |

## Self-Check: PASSED
- `scripts/lib/server-only-shim.mjs`: FOUND
- `scripts/restrip-event-media.mjs`: FOUND (825 righe)
- commit `555c619`, `780ea3b`, `bf9223d`: FOUND
- nessun file `.env*` tracciato; STATE.md e ROADMAP.md non toccati
