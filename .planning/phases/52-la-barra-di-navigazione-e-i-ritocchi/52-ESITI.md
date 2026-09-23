---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
document: gli esiti della fase 52 — censimento, corse sul laboratorio, atti
written: 2026-09-23
written_by: piano 52-01, task 1
requirements: [NAV-07]
environment: il censimento e' una LETTURA (`read_only: true`) su laboratorio e produzione; ogni scrittura della fase avviene sul laboratorio, la produzione solo sotto atto datato
lab_status: ACTIVE_HEALTHY
lab_status_read: "2026-09-23, prima delle 13:08:04Z"
---

# Fase 52 — Gli esiti

> **Questo documento e' pubblicato.** `.planning/` e' tracciato su un repository
> pubblico. Qui si nominano **ruoli** — *il proprietario*, *l'account master del
> banco* — **mai persone**. **Il riferimento del progetto di laboratorio non si
> scrive qui**: sta in `.env.lab.local`, che e' ignorato da git. Nessuna chiave,
> nessun indirizzo di un media, nessun path di un oggetto, nessun identificativo
> di riga: il censimento porta **solo numeri aggregati su tutte le serate
> insieme**, mai per singola serata (`venue-secrecy.md`).
>
> Ogni riga porta l'ora **UTC**, lo strumento, e cio' che si e' **osservato** —
> non cio' che ci si aspettava. Dove l'osservato differisce dall'atteso, la
> differenza si riporta **per prima**.

---

## Censimento di NAV-07

**Letto il 2026-09-23, prima che esista una riga di M1** (ricerca §I.7, D-52-25,
D-52-30, D-52-31). Strumento: Management API,
`POST /v1/projects/<ref>/database/query` con **`read_only: true` su ogni
chiamata**, solo `SELECT` con `count(*)`. Nessuna riga, nessun URL e nessun path
e' stato restituito o stampato. Lo stato del laboratorio e' stato letto prima
(`GET /v1/projects/<ref del laboratorio>` → `ACTIVE_HEALTHY`).

### La differenza dall'atteso, per prima

1. **In produzione `public.event_media` e il bucket `event-media` sono VUOTI:
   zero righe, zero oggetti.** La ricerca §I.7 immaginava una popolazione da
   convertire; non c'e'. Nessuna foto — di serata segreta o no, prima o dopo lo
   stripper, approvata o rifiutata — e' oggi raggiungibile per URL pubblico in
   produzione, perche' nessuna esiste.
2. **In produzione `20260809006000` NON e' registrata nella history** di
   `supabase_migrations.schema_migrations`: nessuna riga con `name` che contiene
   `event_media_server_upload_only`, e nessuna versione fra il 2026-08-08 e il
   2026-08-11 che la porti sotto un altro nome. **Il suo effetto invece c'e'**,
   letto dal catalogo (`pg_policies` su `storage.objects`): sul bucket
   `event-media` non esiste alcuna policy `INSERT` per il browser, e l'unica
   policy `INSERT` legata ai media e' quella della quarantena
   (`event_media_quarantine_insert_staff`) — identico al laboratorio. La soglia
   «prima dello stripper» della produzione **non e' quindi rileggibile dalla
   history**; con zero righe la domanda non cambia alcun numero, ma il piano che
   scrive M1 non deve presumere che la history della produzione registri le
   migration di agosto per nome: nella history della produzione, riletta nello
   stesso momento, i nomi compaiono in due forme — con e senza il prefisso di
   versione del file — e una migration applicata puo' mancare del tutto.
3. **Il laboratorio e' vuoto anch'esso** — zero righe, zero oggetti: e' la
   ragione dei task 2 e 3 di questo piano (su un laboratorio senza media le
   sonde di NAV-07 misurano il vuoto, ricerca §I.6).

### Laboratorio — letto alle 2026-09-23T13:08:04Z

| Lettura | Valore |
|---|---|
| righe di `event_media` | **0** |
| `url` nella forma pubblica `…/storage/v1/object/public/event-media/…` | 0 |
| `url` di **altra forma** | **0** |
| approvate / in attesa / rifiutate | 0 / 0 / 0 |
| righe senza serata (`party_id` nullo) | 0 |
| righe di serate con `venue_secret` vero | 0 |
| foto / video / altro tipo | 0 / 0 / 0 |
| soglia dello stripper — versione con cui `20260809006000` e' registrata | **`20260907094330`** → istante 2026-09-07T09:43:30Z (la data della ricostruzione del laboratorio, non quella della migration) |
| righe con `created_at` anteriore alla soglia — foto / video / foto di serate segrete | 0 / 0 / 0 |
| oggetti nel bucket `event-media` | **0** |
| oggetti **orfani** (nessuna riga il cui `url` finisca con il loro nome) | 0 |
| oggetti che appartengono a righe `rejected` | 0 |
| righe `rejected` senza oggetto / righe di qualunque stato senza oggetto | 0 / 0 |
| `storage.buckets.public` per `event-media` | **`true`** |

### Produzione — letto alle 2026-09-23T13:08:07Z

| Lettura | Valore |
|---|---|
| righe di `event_media` | **0** |
| `url` nella forma pubblica `…/storage/v1/object/public/event-media/…` | 0 |
| `url` di **altra forma** | **0** |
| approvate / in attesa / rifiutate | 0 / 0 / 0 |
| righe senza serata (`party_id` nullo) | 0 |
| righe di serate con `venue_secret` vero | 0 |
| foto / video / altro tipo | 0 / 0 / 0 |
| soglia dello stripper — versione con cui `20260809006000` e' registrata | **non registrata** (vedi sopra; l'effetto e' presente nel catalogo, riletto alle 2026-09-23T13:09Z) |
| righe con `created_at` anteriore alla soglia | non calcolabile dalla history; **0 comunque**, perche' le righe sono 0 |
| oggetti nel bucket `event-media` | **0** |
| oggetti **orfani** | 0 |
| oggetti che appartengono a righe `rejected` | 0 |
| righe `rejected` senza oggetto / righe di qualunque stato senza oggetto | 0 / 0 |
| `storage.buckets.public` per `event-media` | **`true`** |

### Come si leggono questi numeri

- **`url` di altra forma = 0 su entrambi i progetti.** Il backfill di
  `storage_path` in M1 (piano 52-06) copre tutte le righe per costruzione, e il
  `DO` di M1 che solleva su una forma diversa non ha soggetti. **M1 non e'
  bloccata dal censimento.** Resta giusto che il `DO` sollevi: il laboratorio
  sara' seminato (task 3) e la produzione puo' ricevere righe fra oggi e l'atto.
- **Rifiutate con oggetto e orfani (soggetto di D-52-30): 0 in produzione.** La
  rimozione per chiave che D-52-30 chiede, **oggi**, in produzione non ha nulla
  da rimuovere. L'atto di produzione (piani 52-15/52-16) **rilegge** questo
  numero il giorno in cui si fa: se nel frattempo e' cresciuto, la lista si
  cattura quel giorno, non da qui.
- **Foto pre-soglia (soggetto di D-52-31): 0 in produzione.** Il ripasso dallo
  stripper di ogni foto vecchia, oggi, in produzione non ha soggetti. Anche qui
  il numero va riletto il giorno dell'atto — e la soglia della produzione, non
  essendo nella history, va stabilita dal proprietario o dal catalogo quel
  giorno, non supposta da questo file.
- **Righe di serate segrete (il numero che interessa `venue-secrecy.md`): 0 in
  produzione.** Oggi nessuna foto di una sede segreta e' raggiungibile da un URL
  non firmato, per il semplice fatto che non ne esistono. **Il bucket pero' e'
  pubblico su entrambi i progetti**: la prima foto caricata dopo oggi e prima di
  M2 nasce raggiungibile per URL. La finestra e' aperta finche' M2 non chiude.
