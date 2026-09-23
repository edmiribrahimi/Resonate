---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 12
subsystem: media-and-storage
tags: [NAV-07, D-52-25, D-52-29, moderazione, venue-secrecy, url-firmati]
requires: ["52-08 (signEventMedia, costanti di firma, MediaGrid con onError)", "M1 sul database (storage_path)"]
provides:
  - "registerMedia scrive storage_path e nessun indirizzo pubblico"
  - "deleteMedia per chiave: la riga resta se l'oggetto non e' rimosso con conferma"
  - "pagina della serata: sezione Gallery solo con gallery.view o canUpload, media firmati a 3600 s"
  - "moderazione: coda leggibile (fine del PGRST200), firme a 300 s, <img> invece di next/image"
affects: ["52-13 (M2 e tipo di url)", "52-15 (ordine di deploy M1 → codice → M2)"]
tech-stack:
  added: []
  patterns: ["firma per riga sotto la sessione di chi guarda", "oggetto prima, riga solo dopo rimozione confermata", "tre esiti distinti: lettura fallita / firma fallita / vuoto"]
key-files:
  created: []
  modified:
    - src/app/(public)/events/[slug]/actions.ts
    - src/app/(public)/events/[slug]/page.tsx
    - src/app/(public)/events/[slug]/MediaGallerySection.tsx
    - src/app/(admin)/admin/(work)/events/[id]/media/page.tsx
    - src/components/media/MediaReviewGrid.tsx
decisions:
  - "deleteMedia considera rimosso un oggetto solo se Storage lo elenca fra i rimossi: una lista vuota senza errore (policy che rifiuta, o oggetto assente) lancia media.storage_delete_unconfirmed e tiene la riga"
  - "Il nome di chi carica si legge con una seconda query su profiles sotto la stessa sessione (profiles_select_admin = staff.manage), non con un embed: la FK di uploaded_by punta ad auth.users"
  - "Nessun fallback per righe senza storage_path: 52-15 applica M1 in produzione prima di questo codice"
metrics:
  duration: "~25 min"
  completed: 2026-09-23
  tasks: 3
  files: 5
---

# Fase 52 Piano 12: il codice che firma — azioni, pagina della serata, moderazione

Scrittura e cancellazione dei media passano dalla chiave `storage_path`. La pagina della serata e la moderazione firmano sotto la sessione di chi guarda, a 3600 s e a 300 s. La coda di moderazione torna leggibile: fino a oggi rispondeva `PGRST200` e mostrava una coda vuota.

## Cosa e' stato fatto

| Task | Commit | Cosa |
|---|---|---|
| 1 — azioni | `16f5b9f` | `registerMedia` inserisce `storage_path: storagePath` (`actions.ts:202`) e non costruisce piu' l'indirizzo pubblico. `deleteMedia` legge `storage_path` (`:330`). Tre modi di non poter rimuovere, ciascuno lancia con la sua categoria **senza cancellare la riga**: `media.storage_path_missing` (`:353-355`), `media.storage_delete_failed` (`:370-372`), `media.storage_delete_unconfirmed` (`:385-387`). L'ordine resta: prima l'oggetto, poi la riga. |
| 2 — pagina della serata | `49fc50b` | `hasGalleryView = capabilities.has(CAP.GALLERY_VIEW)` (`page.tsx:1035`). Senza la capability i media **non si leggono**. Con la capability si seleziona `storage_path` e si firma con `EVENT_MEDIA_SIGNATURE_SECONDS` (`:1059`). Una lettura fallita (`[gallery.read_failed]`, `:1049`) o una firma fallita mostrano un avviso `role="alert"`, distinto dalla lista vuota (`:2029`). La sezione intera, titolo compreso, si monta solo se `hasGalleryView \|\| canUpload` (`:2020`). `MediaGallerySection` riceve `showGrid` (`:20`): chi puo' solo caricare vede il caricamento senza la frase «No photos or videos yet», che mentirebbe sul perche'. |
| 3 — moderazione | `dcf9aa3` | Si legge `storage_path` al posto di `url`, si firma con `EVENT_MEDIA_REVIEW_SIGNATURE_SECONDS` (`media/page.tsx:271`). I nomi arrivano da una seconda lettura di `profiles` (`:251`). Ogni lettura controlla il proprio errore: `[media_review.counts_read_failed]` `:185`, `[media_review.pending_read_failed]` `:227`, `[media_review.uploader_read_failed]` `:256`. Ognuna ha il suo avviso, e una lettura fallita non disegna lo stato vuoto (`:380`). `MediaReviewGrid.tsx`: `<img>` con `onError` al posto di `next/image`, e il testo «This image could not be loaded. Reload the page.» (`:190-199`). |

## Il difetto ereditato: la coda di moderazione taceva (Rule 1)

**Prima.** La lettura della coda includeva `profiles!event_media_uploaded_by_fkey(full_name)`. Quella FK punta ad `auth.users`, non a `public.profiles`. PostgREST rispondeva 400 `PGRST200`, la pagina non guardava l'errore e mostrava «Nothing has been uploaded» sotto un riquadro «Pending: 1». Nessun media si poteva approvare o rifiutare dall'interfaccia.

**Correzione.** Le righe si leggono da sole. I nomi arrivano da `profiles.select("id, full_name").in("id", …)` sotto la stessa sessione: `profiles_select_admin` ammette proprio `staff.manage`, la capability che protegge la pagina. Nessuna RLS allargata, nessun service role.

**Osservato sul laboratorio** (bench: una riga pending sulla serata segreta, due approvate), sessione del master di laboratorio. Lo script rifiuta la produzione alla prima riga e non stampa id, chiavi o indirizzi.

| Sonda | Esito |
|---|---|
| Vecchia lettura, via PostgREST | `error.code = PGRST200`, righe `null` |
| Censimento | pending 1 · approved 2 · rejected 0 |
| Nuova lettura | 1 riga pending, nessun errore; 1 profilo restituito (nome vuoto sull'account seminato → la card mostra «Unknown»); 1 URL firmato, fetch **HTTP 200** |
| Pagina `/admin/events/<serata>/media` renderizzata (`dev:lab`) | 200, niente redirect; **coda non vuota**, 1 «Approve», 1 `<img>` con URL `object/sign/event-media`, 0 indirizzi `object/public/event-media`, 0 `_next/image`, nessun avviso |

## Pagina della serata, osservata sul laboratorio

| Chi guarda | «Gallery» | `<img>` firmati | indirizzi pubblici |
|---|---|---|---|
| master | presente | 2 | 0 |
| staff (tiene `gallery.view` per ruolo) | presente | 2 | 0 |
| account leggero (`attendee`) | **assente** | 0 | 0 |

Per l'`attendee` non c'e' conteggio ne' testo che faccia capire che esistono foto (D-52-29).

## Deviazioni dal piano

1. **[Rule 1 — bug] Coda di moderazione in `PGRST200`.** Descritta sopra. Commit `dcf9aa3`.
2. **[Rule 2 — correttezza] Rimozione vuota scambiata per riuscita.** Storage risponde a un DELETE che la policy non ammette, o a una chiave senza oggetto, con una **lista vuota e nessun errore**. Contare solo `error` avrebbe riaperto per un'altra via il ramo silenzioso che il piano chiude. Ora la riga si cancella solo se Storage indica l'oggetto come rimosso. Il costo e' dichiarato nel codice: una riga il cui oggetto e' gia' sparito non si cancella piu' con questa action, e lo segnala con un errore. Commit `16f5b9f`.
3. **[Rule 2] Controllo degli errori sulle letture di moderazione.** Censimento e nomi non controllavano l'errore: ora hanno una categoria e un avviso propri.
4. **Docblock aggiornati** dove affermavano cose non piu' vere: «the three reads are untouched» nella moderazione, «Nothing about storage changed» in `deleteMedia`, `next/image` in `MediaReviewGrid`. Le righe sono state corrette con la data, non cancellate.

## Ordine M1 → codice → M2

`registerMedia` scrive `storage_path` e le tre superfici lo leggono **senza condizioni**. E' voluto: il piano 52-15 applica M1 in produzione **prima** di spedire questo codice. Nessun fallback riscrive l'indirizzo pubblico. Una riga senza chiave non si firma (la conta `[gallery.unsigned_row]` nel firmatario, 52-08) e non si cancella (`media.storage_path_missing`).

## Debito dichiarato

- **`deleteMedia` non ha chiamanti nell'interfaccia.** `grep` su `src/` trova solo la definizione e un commento. Rifiutare (`updateMediaStatus` → `rejected`) cambia la **riga**, non rimuove l'oggetto. Dopo M2 l'oggetto rifiutato non si raggiunge piu' per firma, perche' la policy dell'oggetto chiede una riga visibile. Quanto la riga `rejected` resti visibile e a chi lo decide la policy di riga di M2: **qui non e' stato verificato**. In ogni caso l'oggetto non e' rimosso. *Moderazione = rimozione* resta a meta' finche' un'interfaccia non chiama `deleteMedia` o il rifiuto non rimuove l'oggetto. Fuori dal perimetro di questo piano, e non e' un problema di messaggi collassati: il chiamante non esiste.
- **Tipo `EventMedia.url` ancora `string`**: lo chiude 52-13 insieme a M2. Nessuna superficie lo legge piu'.
- **Log senza osservatore**: le nuove categorie finiscono nei log di Vercel, e nessun error tracking li porta a una persona (`meta-gates.md`). L'effetto visibile sono gli avvisi `role="alert"`.

## Verifica

Non esiste un test runner: niente qui e' «verificato perche' i test passano».

- `npm run build` → 0 (dopo ogni task).
- `verify:media-strip`, `verify:venue-surfaces`, `verify:conversion`, `verify:touch-targets`, `verify:routes` → 0.
- `grep -c "object/public/event-media"` su `actions.ts` → 0; `grep -c "next/image"` su `MediaReviewGrid.tsx` → 0.
- `grep -rn 'select("id, url\|, url, type\|"url"' src --include='*.ts' --include='*.tsx' | grep event_media` → **nessuna riga**. I quattro file con `from("event_media")` (`gallery/page.tsx`, `actions.ts`, `events/[slug]/page.tsx`, moderazione) leggono tutti `storage_path`, nessuno `url`.
- Osservazioni sul laboratorio: tabelle sopra. Procedure P-52-B / P-52-G di `52-PROCEDURES.md`: sonde 5-7 con i piani 52-13 e 52-14, come dichiarato nel piano.
- Il laboratorio **non e' stato modificato**: solo letture e firme. Nessuna riga e nessun oggetto scritti o cancellati; `deleteMedia` non e' stata eseguita sul laboratorio.

## Threat Flags

Nessuna nuova superficie oltre il `<threat_model>` del piano. T-52-54, 55, 56, 57 e 58 sono mitigati come indicato. T-52-59 e' accettato: il nome resta solo nella moderazione.

## Known Stubs

Nessuno.

## Self-Check: PASSED

- FOUND: i cinque file modificati
- FOUND: `16f5b9f`, `49fc50b`, `dcf9aa3` in `git log`
