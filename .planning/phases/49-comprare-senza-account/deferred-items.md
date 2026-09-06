# Fase 49 — scoperte fuori perimetro

> Cose trovate **misurando**, che il piano non prevedeva e che il piano che le
> ha trovate non deve riparare. Restano qui invece di sparire.
>
> `.planning/` e' pubblicato: qui si nominano **ruoli e oggetti di database**,
> mai persone, e non si scrivono chiavi, uuid reali o percorsi di attacco
> eseguibili.

## D-49-01-DEF-01 — `public.reserve_ticket` e' chiamabile con la chiave anonima

**Trovato:** 2026-09-06, piano 49-01, task 3, rileggendo `pg_proc` dopo aver
applicato le due migration. **Non e' causato da questa fase e non e' peggiorato
da questa fase**: la misura lo ha semplicemente illuminato, perche' guardare
l'ACL della funzione nuova ha fatto guardare anche quella delle vecchie.

**Cosa dice il catalogo.** Tutti e **tre** gli overload di
`public.reserve_ticket` hanno:

| Proprieta' | Valore letto |
|---|---|
| `prosecdef` | `true` — `SECURITY DEFINER` |
| `proconfig` | `null` — **nessun `SET search_path`** |
| `proacl` | `{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}` |

`=X/postgres` e' `EXECUTE` concesso a `PUBLIC`, ed e' il default che Postgres
applica a ogni funzione nuova quando nessuno lo revoca. PostgREST espone ogni
funzione di `public` sotto `/rest/v1/rpc/`, quindi la funzione **risponde alla
sola chiave anonima**, che e' pubblica per costruzione.

**Perche' conta.** `reserve_ticket` riceve **tutti** i valori che decidono dal
chiamante — chi e' l'acquirente, quale tier, quale serata, quanto ha pagato — e
non ne rilegge nessuno. Essendo `SECURITY DEFINER`, la RLS non la ferma. Il
risultato e' un biglietto emesso senza che sia esistito un pagamento.

**Cosa lo limita oggi, ed e' il motivo per cui il sotto-passo (d-bis) del piano
49-01 non era una precauzione teorica.** Un biglietto emesso per quella strada
lascia `order_id` nullo, quindi ricade sotto i due indici unici parziali
`tickets_party_user_unique` e `tickets_event_user_master_unique` — che il piano
49-01 ha **ricreati** con `AND order_id IS NULL` invece di lasciarli cadere. Il
tetto e' quindi **un biglietto per conto per serata**, non illimitato. Se quei
due indici fossero stati solo tolti, non ci sarebbe alcun tetto.

**Cosa manca e a chi tocca.** La coppia
`REVOKE ALL ... FROM public, anon, authenticated` +
`GRANT EXECUTE ... TO service_role`, piu' `SET search_path = ''`, su tutti e tre
gli overload — e prima ancora la decisione di **quanti overload debbano
sopravvivere**, visto che il percorso con sessione ne usa uno solo. Non e' lavoro
del piano 49-01, che ha un'autorizzazione di produzione **nominata su due file**
e non puo' allargarla da se': `ai-engineering.md`, gate *l'autorizzazione a
scrivere in produzione e' un atto, non un permesso*.

**Dove va deciso:** le fasi 50/51 chiudono il percorso con sessione, ed e' li'
che quegli overload muoiono. Se pero' la milestone apre le vendite **prima** di
quelle fasi, la revoca va fatta prima — perche' da quel momento esistono tier in
vendita, e un biglietto coniato gratis e' un posto sottratto a chi paga.

**Precedente da cui copiare la forma, gia' nel repo:**
`20260808004000_master_reconcile.sql:364-371`,
`20260810160000_manual_venue_reveal.sql:598-606`,
`20260815120200_production_checklist_tick_revoke.sql:46-51`.

## D-49-01-DEF-02 — `tickets_notify_attendance` scatta una volta per riga

**Trovato:** 2026-09-06, piano 49-01, controllo d'impatto cross-dominio prima di
scrivere `reserve_ticket_order`.

`20260811120000_live_attendance_channel.sql:384-387` dichiara il trigger
`AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW`. Un ordine da sei biglietti
nasce da **una sola `INSERT`**, ma il trigger e' per riga: la serata riceve
**sei** notifiche identiche invece di una.

**Non e' un difetto e non va riparato qui.** La funzione «non scrive nulla e
restituisce NULL, quindi non puo' alterare, ritardare o far fallire un acquisto»
— lo dichiara il suo stesso `COMMENT` — e sei segnali di *aggiorna la lista* si
collassano in un aggiornamento solo dal lato che ascolta. E' rumore, non un
errore, ed e' registrato perche' chi guardera' il canale della porta durante una
vendita di gruppo vedra' una raffica e deve sapere da dove viene.

## D-49-01-DEF-03 — `gsd-sdk query state.record-session` riscrive piu' di una sessione

**Trovato:** 2026-09-06, piano 49-01, chiudendo. Il comando dichiara di
aggiornare *«Last session»* e nella risposta lo conferma
(`{"recorded": true, "updated": ["Last session"]}`). Nei fatti ha riscritto anche
il `stopped_at` del frontmatter — con una frase di **un'altra fase** — e ha
ricalcolato l'intero blocco `progress`:

| Campo | Prima | Dopo la chiamata |
|---|---|---|
| `total_phases` | 51 | 12 |
| `completed_phases` | 47 | 2 |
| `total_plans` | 348 | 29 |
| `completed_plans` | 349 | 23 |
| `percent` | 92 | 17 |

Il denominatore nuovo non corrisponde a nessuna misura del progetto:
`.planning/phases/` contiene fasi numerate fino alla 58.

**Ripristinato subito** con `git checkout -- .planning/STATE.md`, e nulla di
quella riscrittura e' stato committato. Registrato qui perche' **la risposta del
comando non dichiara cio' che ha toccato**: chi lo chiama e non guarda il `git
diff` committa un blocco di avanzamento falso credendo di aver aggiornato una
riga di data. E' la forma esatta del gate *il contatore di controllo non legge la
superficie che sta muovendo* — la conferma va chiesta a una fonte diversa da
quella che ha agito, e qui la fonte diversa e' `git diff`.

**Fuori perimetro:** e' strumentazione GSD, non prodotto. Nessuna riparazione da
questo piano.
