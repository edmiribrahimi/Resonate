---
created: 2026-08-11
source: 37-10 Task 3 (perimetro dichiarato della guardia sul form)
severity: moderate
area: venue-secrecy, access-gating
resolves_phase:
---

# Su una serata mai rivelata, togliere la spunta a `venue_secret` apre
# l'indirizzo senza lasciare traccia

## Il fatto

`src/app/(admin)/admin/events/actions.ts`, percorso di aggiornamento per serata,
scrive `venue_secret` dal form. La fase 37 ha chiuso **meta'** di quel percorso:
un cambiamento della casella su una serata con `venue_revealed_at IS NOT NULL`
viene rifiutato (`NightRefusal.kind = "venue_secret_locked"`), e il ri-nascondere
passa solo dalla superficie della serata, dove e' riservato al master e lascia
una riga append-only in `public.venue_reveal_acts`.

**L'altra meta' e' aperta.** Su una serata **mai rivelata a mano**, la casella si
spunta e si despunta liberamente, come prima della fase 37. E togliere la spunta
non e' un'operazione neutra: l'indirizzo diventa visibile in pagina a chiunque
la apra, senza login e senza titolo. E' un **percorso di rivelazione senza
registro** — lo stesso effetto dell'atto manuale, per una strada che non lo
registra.

## Perche' e' rimasto aperto

Fuori dal perimetro dichiarato del piano 37-10, che copriva il ri-nascondere
(D-37-22) e non la prima apertura dal form. Registrato invece di taciuto: e' la
differenza fra un residuo e una svista.

Va anche detto per bene: **non e' identico all'atto manuale.** L'atto manuale
manda anche la mail; questo apre solo la pagina. Ma il gate *percorsi enumerati*
di `venue-secrecy.md` conta i percorsi da cui l'indirizzo esce, e la pagina e'
uno di quelli.

## Le tre strade, con il loro costo

1. **Estendere la guardia a ogni cambiamento di `venue_secret`**, e mandare
   anche la prima apertura dalla superficie della serata. Il piu' pulito e il
   piu' invasivo: la casella nel form diventa di sola lettura dopo la creazione,
   e chi prepara una bozza deve passare da due superfici.
2. **Registrare l'atto invece di rifiutarlo**: scrivere una riga nella traccia
   quando il form apre una serata segreta. Richiede un atto nuovo nel `CHECK` di
   `public.venue_reveal_acts` — quindi una migration — e uno scrittore
   raggiungibile da `updateEvent`.
3. **Lasciarlo com'e' e dichiararlo**, che e' lo stato attuale. Accettabile
   finche' chi ha `staff.manage` sull'evento e' anche chi puo' rivelare; smette
   di esserlo appena i due insiemi divergono.

## Chi decide

Non e' una scelta tecnica: e' quanto attrito mettere fra chi prepara una serata
e la sua segretezza. Va portata al proprietario insieme a D-37-22, di cui e'
il rovescio.

## File coinvolti

- `src/app/(admin)/admin/events/actions.ts` — il percorso di aggiornamento per
  serata e i cinque punti in cui `venue_secret` si scrive
- `src/app/(admin)/admin/events/[id]/reveal/actions.ts` — la superficie dove
  l'atto lascia traccia
- `supabase/migrations/20260810160000_manual_venue_reveal.sql` — il `CHECK` a
  tre atti, che la strada 2 dovrebbe allargare
