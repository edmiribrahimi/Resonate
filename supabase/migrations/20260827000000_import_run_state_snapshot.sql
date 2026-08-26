-- La via di ritorno di una corsa che NESSUNO guarda
-- Fase 58, dopo il piano 12: sblocco dello specchio automatico, 2026-08-27
--
-- PERCHE' QUESTO FILE ESISTE, in una frase. Lo specchio schedulato **non prende
-- istantanea**, e finora questo era sano per una ragione sola: la guardia della
-- corsa non presidiata lo fermava prima di arrivare a un `DELETE` ogni volta che
-- c'era uno stato umano da perdere, quindi sul solo ramo che cancellava
-- l'istantanea sarebbe stata **vuota per costruzione**. Il proprietario ha
-- deciso il 2026-08-27 di sbloccare lo specchio automatico su `rsnt`, che porta
-- una traccia viva — e quella decisione toglie di mezzo esattamente la
-- condizione che rendeva sana l'assenza di istantanea.
--
-- ⚠ **Non e' un'aggiunta di comodita': e' la meta' che deve esistere PRIMA che
-- la guardia venga disarmata.** Senza, una corsa notturna che muore fra la
-- cancellazione e la riscrittura perde un annullamento — un attore senza istante,
-- la sola riga dell'intero sistema di produzione che nessun feed sa ricostruire,
-- perche' il calendario non registra chi ha tolto una casella — e la perde
-- **senza nulla da cui rientrare**. Non c'e' transazione attraverso la
-- cancellazione e non c'e' point-in-time recovery su questo progetto.
--
-- ── PERCHE' NEL DATABASE E NON SU DISCO ─────────────────────────────────────
--
-- L'importatore presidiato scrive la sua istantanea in una directory ignorata da
-- git, e dice di se stesso che *uno specchio che non puo' prendere la sua
-- istantanea non parte*. Quella strada non esiste per un processo schedulato: il
-- filesystem di una funzione e' effimero e non sopravvive alla corsa che dovrebbe
-- salvare. La riga di registro invece **esiste gia', e viene aperta prima della
-- cancellazione** — e' lo stesso istante, lo stesso ordine, e la sua assenza di
-- `finished_at` e' gia' il segnale che una corsa e' morta a meta'. L'istantanea
-- appartiene a quella riga piu' che a qualunque altro posto.
--
-- ── PERCHE' QUI IL CONTENUTO PUO' STARE, verificato invece che supposto ──────
--
-- `supabase-data.md`, gate *no dato sensibile in colonna pubblica*: questo campo
-- porta `ticked_by_name`, cioe' **il nome di una persona**. Letto dal catalogo il
-- 2026-08-27: `production_import_run` ha la RLS abilitata e **una sola policy**,
-- in SELECT, condizionata a `private.has_capability('production.calendar.manage')`
-- — le stesse due identita' che gia' aprono la superficie del calendario. Nessuna
-- lettura anonima, nessuna lettura da socio. Il dato non guadagna lettori.
--
-- ── COSA SUCCEDE ALLE RIGHE CHE ESISTONO GIA' ───────────────────────────────
--
-- `supabase-data.md`, gate *default sulle righe esistenti*: la colonna e'
-- **nullabile e senza default**, quindi le sei corse gia' registrate restano
-- esattamente come sono, con `NULL`. E il `NULL` **significa qualcosa**: *questa
-- corsa non ha portato con se' la propria via di ritorno*, che e' vero di ogni
-- corsa precedente a oggi. Un default a `'{}'::jsonb` avrebbe scritto *nessuno
-- stato a rischio* su corse che nessuno ha misurato — una risposta inventata al
-- posto di un'assenza, che e' il difetto che questa fase ha passato settimane a
-- togliere dal calendario.
--
-- Il rientro distingue i due casi e rifiuta il primo con una categoria propria,
-- invece di leggerlo come «niente da rimettere».

alter table public.production_import_run
  add column if not exists state_snapshot jsonb;

comment on column public.production_import_run.state_snapshot is $doc$
Le due eccezioni di stato di ICS-03 — le decisioni di checklist e i legami con una
serata pubblicata — catturate PRIMA della cancellazione dallo specchio schedulato,
che non puo' scrivere un'istantanea su disco: il filesystem di una funzione e'
effimero e non sopravvive alla corsa che dovrebbe salvare.

E' la via di ritorno di una corsa che NESSUNO guarda. Senza, una corsa morta fra
la cancellazione e la riscrittura perde una traccia che nessun feed sa
ricostruire — il calendario non registra chi ha spuntato una casella, ne' chi
l'ha tolta.

NULL non significa "nessuno stato a rischio": significa "questa corsa non ha
portato con se' la propria via di ritorno", ed e' vero di ogni corsa precedente
al 2026-08-27. Il rientro rifiuta le due cose separatamente, invece di leggere
un'assenza come una misura.
$doc$;
