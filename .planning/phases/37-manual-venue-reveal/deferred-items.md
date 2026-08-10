# Fase 37 — voci differite

Cose trovate durante l'esecuzione, **fuori dal perimetro del piano che le ha
trovate**, e quindi non riparate li'. Ognuna dice chi l'ha trovata e perche' non
e' stata chiusa sul posto.

---

## 1. `EventParty` non dichiara due colonne di rivelazione che esistono

- **Trovata durante:** 37-03, Task 3, leggendo lo schema vivo per allineare i tipi.
- **Cosa:** `public.event_parties` porta `venue_reveal_on_purchase` (boolean,
  nullable) e `venue_reveal_email_sent` (boolean, nullable). **L'interfaccia
  `EventParty` in `src/types/database.ts` non dichiara ne' l'una ne' l'altra.**
- **Perche' non e' stata chiusa qui:** e' una deriva **pre-esistente**, non un
  effetto della migration di questo piano. Il gate *tipi allineati* di
  `supabase-data.md` chiede che un **cambio di schema** si rifletta nello stesso
  commit; queste due colonne non sono un cambio di questo commit, e allargare il
  diff di un piano che applica una DDL alla produzione avrebbe reso piu' difficile
  verificare l'unica domanda che quel diff deve poter reggere.
- **Perche' conta comunque, e presto:** entrambi i piani 37-10 (la server action)
  e 37-11 (il bottone a tre stati) leggono `venue_reveal_email_sent`, ed e' la
  colonna rispetto alla quale `venue_revealed_at` si definisce per differenza. Un
  autore che cerca la prima nell'interfaccia e non la trova puo' concluderne che
  non esista sulla tabella. Il rischio e' quello, ed e' scritto anche accanto a
  `venue_revealed_at` perche' non dipenda dalla lettura di questo file.
- **Chi la dovrebbe prendere:** 37-10 o 37-11, che le toccano davvero.

---

## 2. L'inventario delle cascate della ricerca era incompleto

- **Trovata durante:** 37-03, Task 1, derivando la copertura dell'istantanea da
  `pg_constraint` invece che dall'elenco gia' scritto.
- **Cosa:** `37-RESEARCH.md` § Runtime State Inventory elenca diciassette tabelle
  raggiungibili da `event_parties`. Sono **diciotto**: manca
  `discount_code_tiers`, che non e' figlia diretta di `event_parties` ma ci arriva
  **a due salti**, sia via `discount_codes` sia via `ticket_tiers`, entrambi
  `ON DELETE CASCADE`.
- **Perche' era incompleto:** la ricerca aveva enumerato le chiavi esterne
  **dirette** e le aveva chiamate «le cascate». E' lo stesso errore
  dell'incidente della fase 36, con un livello di profondita' in piu'.
- **Stato:** **corretta in 37-03.** L'istantanea di questo piano copre tutte e
  diciotto piu' le due raggiunte da `ON DELETE SET NULL`. La voce resta qui
  perche' `37-RESEARCH.md` **non e' stato modificato** — una ricerca e' un
  documento datato, e si corregge dichiarando dove sta la correzione, non
  riscrivendola.
- **Chi la dovrebbe prendere:** 37-13, che rilegge l'istantanea, e chiunque
  scriva una procedura che scrive in produzione dopo questa fase.

---

## 3. `public.venue_reveal_acts` entra nell'insieme `SET NULL`, non nelle cascate

- **Trovata durante:** 37-03, Task 2, rileggendo i vincoli dopo l'applicazione.
- **Cosa:** la tabella nuova punta a `public.event_parties` e ad `auth.users`
  **entrambi con `ON DELETE SET NULL`**, deliberatamente. Non e' quindi la
  diciassettesima cascata: e' una riga che sopravvive alla serata che nomina.
- **Conseguenza operativa:** ogni istantanea futura presa dopo questa fase deve
  contarla fra le tabelle **modificate** da una cancellazione, non fra quelle
  cancellate. L'istantanea di 37-03 e' stata presa **prima** che la tabella
  esistesse, quindi non la contiene: e' corretto per quel baseline e va saputo da
  chi lo confronta.
- **Chi la dovrebbe prendere:** 37-13.

---

## 4. `venue_for_parties` filtra `is_published` PRIMA dei cinque rami — una bozza non ha nome del locale per nessuno

- **Trovata durante:** 37-05 e 37-06, **indipendentemente**, nella stessa onda.
  Due agenti che non si parlavano hanno misurato lo stesso fatto: e' un indizio
  che sia una proprieta' della funzione, non un'impressione.
- **Cosa:** `public.venue_for_parties(uuid[])` applica `AND e.is_published`
  **prima** di valutare i cinque rami di titolo. Su un evento non pubblicato non
  restituisce nulla **a nessuno** — nemmeno a chi ha `staff.manage`. Sulla lista
  eventi lo staff le bozze le vede, e da oggi le vedrebbe **senza il nome del
  locale**; sul dettaglio, chi prepara una bozza segreta vede l'indizio invece
  dell'indirizzo.
- **Il verso dell'errore e' quello sicuro:** si perde un nome, non se ne mostra
  uno che non si doveva. E' la ragione per cui nessuno dei due agenti l'ha
  forzato.
- **Perche' non e' stato riparato nell'onda:** le due strade erano modificare la
  migration — che a quel punto era **gia' scritta per l'applicazione**, e non si
  tocca una migration in attesa di push — oppure rimettere un secondo embed
  condizionato, cioe' **due percorsi di costruzione per lo stesso valore**, che e'
  esattamente il difetto che i commenti di quei file esistono per impedire.
- **La decisione che serve, e non e' tecnica:** su una bozza, chi ha
  `staff.manage` deve vedere il nome del locale? Se si', la condizione va
  spostata dentro i rami invece che davanti — ed e' una modifica alla migration
  **non ancora applicata**, quindi **oggi costa poco e dopo il deploy costa una
  migration in piu'**.
- **Chi la dovrebbe prendere:** va decisa **prima** che
  `20260810161000_venues_read_narrowed.sql` venga applicata, perche' quello e' il
  momento in cui il costo cambia. Verifica in 37-13.
