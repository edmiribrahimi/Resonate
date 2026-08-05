---
paths:
  - "src/app/(public)/**"
  - "src/app/(members)/**"
  - "src/app/(admin)/**"
  - "src/app/(organizer)/**"
  - "src/app/(auth)/**"
  - "src/app/*.tsx"
  - "src/app/*.ts"
  - "src/components/**"
---

> **Perche' non `src/app/api/**`:** i gate di questo modulo riguardano il
> confine server/client, i route group e la cache — cose delle **pagine**. Su
> una route API vince il dominio funzionale, come `meta-gates.md` gia'
> dichiarava. Escluderle non toglie copertura (ogni route API ha il suo
> dominio) e restituisce budget dove serve.

# Next.js Architecture — Operational Gates

## Before Touching

route group, layout, server/client boundary, server action, componenti
condivisi, service worker
-> valutare l'impatto su: cosa finisce nel bundle del client, cosa viene messo
in cache, e quale ruolo vede questa superficie.

## La geografia del progetto

Quattro route group, e il gruppo **e' il pubblico**:

- `(public)` — chiunque, anche non autenticato
- `(members)` — membri approvati
- `(organizer)` — organizzatori
- `(admin)` — master

Mettere un file nel gruppo sbagliato e' un errore d'accesso travestito da
errore di organizzazione.

## Quality Gates

- **Gate segreti nel bundle**: Tutto cio' che sta in un componente client finisce nel browser. Nessuna chiave, nessun dato di un altro utente, nessuna logica di autorizzazione che debba essere autorevole. `NEXT_PUBLIC_*` significa **pubblico**: e' un contratto, non un prefisso di stile.
- **Gate server per default**: Un componente diventa client solo quando gli serve interattivita', stato o API del browser. `"use client"` su un layout trascina dentro tutto l'albero sotto di esso.
- **Gate server action autorizzata**: Una server action e' un **endpoint pubblico** con una firma comoda. Ogni action ripete il controllo di ruolo e stato al proprio interno: essere importata da una pagina protetta non la protegge.
- **Gate cache esplicita**: Ogni superficie che mostra dati per-utente o dati segreti dichiara esplicitamente di non essere cacheabile. La cache di default di Next e' una feature finche' non serve un dato personale — poi e' una fuga. Vale in modo assoluto per le pagine che possono mostrare un venue.
- **Gate gruppo = pubblico**: Un file va nel route group del pubblico a cui e' destinato. Un componente condiviso da gruppi diversi non decide da solo cosa mostrare: riceve i permessi come input.
- **Gate stato vuoto e d'errore**: Ogni vista ha uno stato vuoto e uno d'errore progettati. Una lista vuota identica a una lista non ancora caricata e' un guasto silenzioso con una faccia neutra.
- **Gate service worker**: Serwist serve contenuto anche quando la rete manca — anche contenuto **vecchio**. Nessuna superficie che mostra stato di pagamento, validita' di biglietto o indirizzo di venue deve essere servita da cache stale. La cache va scelta per rotta, non ereditata.
- **Gate metadata e Open Graph**: Oggi `generateMetadata` esiste solo su `src/app/layout.tsx` e sulla pagina del menu — le pagine evento **non hanno metadata proprie**. Quando le avranno: un'anteprima social e' **contenuto pubblico e cacheato da terzi**, quindi non porta mai l'indirizzo di un venue segreto, e la sua immagine non e' una foto scattata sul posto. Vedi `venue-secrecy.md` e `media-and-storage.md`.
- **Gate accessibilita' al buio**: Lo scanner si usa in un locale buio, con una mano, di fretta. Contrasto, dimensione dei target e feedback non visivo (vibrazione) non sono rifiniture: sono la condizione d'uso reale. Il colore non e' mai l'unico canale di un'informazione.

## Imperative Behaviors

- When adding a client component: verify nothing secret enters the bundle
- When adding "use client": check what it drags into the client tree
- When writing a server action: re-check role and status inside it
- When a surface shows per-user or secret data: mark it uncacheable
- When placing a file: choose the route group by audience, not by convenience
- When building a view: design its empty and error states
- When touching a cached route: verify the service worker cannot serve it stale
- When building scanner UI: verify it works one-handed, in the dark, with feedback beyond color
