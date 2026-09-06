---
phase: 49-comprare-senza-account
document: autorizzazione a scrivere in produzione
granted: 2026-09-06
granted_by: proprietario
scope: cinque migration, nominate
status: CONCESSA — non ancora spesa
---

# Autorizzazione a scrivere in produzione — 2026-09-06

`ai-engineering.md`, gate *l'autorizzazione a scrivere in produzione e' un atto,
non un permesso*: **si consuma una volta**, copre esattamente cio' che e' stato
descritto quando e' stata chiesta, e chi la riceve dichiara **quando l'ha usata e
quando l'ha esaurita**.

## La domanda posta, alla lettera

> «Le cinque migration vanno applicate al database di produzione. Mi autorizzi, e
> per quale perimetro?»

**Risposta: `Tutte e cinque, in un atto solo`.** Le altre due strade — applicare
solo le tre di struttura e tenere venue e credenziale della porta per un secondo
si', oppure non applicare nulla e lasciarle al proprietario — erano disponibili e
non sono state prese.

## Il perimetro, e non un byte oltre

| # | Migration | Cosa tocca |
|---|---|---|
| 1 | `20260905120000_ticket_orders.sql` | crea `public.ticket_orders` con RLS; `tickets` guadagna `order_id`, `holder_label`, `issued_via`; i due indici unici si ricreano **ristretti** a `order_id IS NULL`; `tickets.sumup_checkout_id` perde l'unicita', che passa all'ordine; `event_parties` guadagna `max_tickets_per_order NOT NULL DEFAULT 6` |
| 2 | `20260905120100_reserve_ticket_order.sql` | crea `public.reserve_ticket_order` |
| 3 | `20260905130000_membership_code_crypto.sql` | `handle_new_user` conia `membership_code` con `crypto` — **solo per i profili futuri** |
| 4 | `20260905131000_venue_reader_needs_a_ticket.sql` | `venue_for_parties`: l'arm 5 guarda **un biglietto per quella serata** invece di `profiles.status` |
| 5 | `20260905140000_email_category_ticket_order.sql` | una categoria nel registro delle consegne |

**Fuori perimetro, esplicitamente:** ogni altra scrittura in produzione — righe
seminate, spunte, sessioni coniate, rimozioni. Per quelle serve un'autorizzazione
nuova, con la sua data.

## Le condizioni dichiarate insieme all'autorizzazione

1. **Istantanea prima**, su ogni tabella raggiungibile **per cascata** dalle
   righe toccate, enumerata leggendo `pg_constraint` e non ricordandola. E' il
   gate scritto dopo l'incidente delle 63 righe: *un'istantanea prima copre cio'
   che si tocca, non cio' che si crea*.
2. **Rilettura dal catalogo dopo ciascuna**, mai dalla risposta del `POST`. Una
   misura presa con lo strumento che ha causato l'effetto e' un'eco.
3. **Endpoint `POST /v1/projects/{ref}/database/migrations`**, mai
   `/database/query`, cosi' la storia delle migration resta veritiera.
4. **Se una fallisce, ci si ferma** e non si prosegue con le successive.
5. Nessuna cascata nuova: `tickets.order_id` e' `ON DELETE SET NULL` apposta.

## La finestra, misurata il 2026-09-06 e non ricordata

`tickets` **vuota** · 0 ordini bar · 0 acquisti pendenti · 0 serate future
pubblicate · 4 profili. `event_parties` ha righe, e tutte prendono `6`.

Il repository **non ha PITR** — decisione del proprietario, registrata, non
riaperta qui. Cambia cosa significa sbagliare, e per questo la finestra conta.

## Registro d'uso

> Da compilare **mentre** si spende, non dopo.

| Migration | Applicata (UTC) | Versione registrata | Riletta dal catalogo | Esito |
|---|---|---|---|---|
| 1 `ticket_orders` | 2026-09-06 14:11:54 | `20260906141154` / `ticket_orders` | si' — `pg_class`, `pg_policies`, `pg_indexes`, `pg_constraint`, `information_schema.columns` | **applicata** |
| 2 `reserve_ticket_order` | 2026-09-06 14:12:23 | `20260906141223` / `reserve_ticket_order` | si' — `pg_proc` (`prosecdef`, `proconfig`, `proacl`) | **applicata** |
| 3 `membership_code_crypto` | — | — | — | non ancora |
| 4 `venue_reader_needs_a_ticket` | — | — | — | non ancora |
| 5 `email_category_ticket_order` | — | — | — | non ancora |

**Esaurita il:** — *(da scrivere quando l'ultima delle cinque e' applicata e
riletta, o quando ci si ferma per un fallimento)*

### Note d'uso — piano 49-01, 2026-09-06

**Perimetro speso: 2 su 5.** Il piano 49-01 copre solo le migration 1 e 2. Le tre
restanti appartengono ad altri piani della fase e l'autorizzazione resta aperta
su di esse. **Nessuna scrittura fuori perimetro:** nessuna riga seminata, nessuna
rimossa, nessuna sessione coniata, nessuna altra tabella toccata.

**La versione registrata NON e' il timestamp del file.** L'endpoint
`POST /database/migrations` conia la versione con l'istante dell'applicazione:
i file si chiamano `20260905120000` e `20260905120100`, la storia registra
`20260906141154` e `20260906141223`. Non e' una deriva ne' un errore — e' come
si comporta l'endpoint — ma chi cerchera' domani una migration per il nome del
file in `supabase_migrations.schema_migrations` **non la trovera' per numero**, e
merita saperlo prima di concluderne che manca. E' la stessa forma della deriva
gia' registrata in `STATE.md` per `20260508000000_drink_token_active_state.sql`,
con la differenza che questa e' dichiarata al momento in cui si crea.

**Istantanea: NON ripresa, come prescritto.** Il conteggio delle 35 tabelle e'
stato **ri-derivato in modo indipendente** leggendo `pg_constraint` invece di
fidarsi dell'elenco: prima dell'applicazione ha restituito **35 tabelle / 2241
righe**, con le 15 tabelle non vuote identiche voce per voce a quelle dichiarate.
La derivazione riproduce la misura, quindi la misura regge.

**Ri-conteggio dopo: 2241 righe, identico.** Il numero di tabelle nell'insieme
passa da 35 a 36, e la differenza e' `public.ticket_orders` — **una tabella
creata, non una tabella toccata**, con zero righe. E' esattamente la distinzione
che il gate *un'istantanea prima copre cio' che si tocca, non cio' che si crea*
pone: la misura che conta e' il totale delle righe, e non si e' mosso di una.
