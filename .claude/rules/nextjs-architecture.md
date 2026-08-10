---
paths:
  - "src/app/(public)/**"
  - "src/app/(members)/**"
  - "src/app/(admin)/**"
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

**Tre** route group di pubblico — `(public)`, `(members)`, `(admin)` — piu'
`(auth)`, che non e' un pubblico ma il percorso per diventarlo.

- `(public)` — chiunque, anche non autenticato
- `(members)` — membri approvati
- `(admin)` — le superfici di lavoro, **tutte**, non piu' solo quelle del master
- `(auth)` — login, registrazione, callback

### Il gruppo non e' piu' il pubblico, ed e' una decisione, non una deriva

Questa sezione **diceva l'opposto**: quattro gruppi, e il gruppo *e'* il
pubblico. Era **corretta quando e' stata scritta** — c'erano due alberi di
lavoro, `(admin)` per il master e un secondo per gli organizzatori, e il
segmento nell'URL descriveva davvero chi ci stava sopra. La fase 34 li ha
collassati in uno solo (D-34-01, D-34-02) e ha cancellato il secondo. La riga
e' **rovesciata qui, non tolta in silenzio**, perche' una decisione rovesciata
senza la sua ragione si legge come una svista — la stessa regola di casa che
`src/app/(admin)/admin/scanner/page.tsx` applica nel proprio docblock.

**Oggi `admin` in un indirizzo e' un indirizzo, non un'autorizzazione.** Chi
raggiunge una superficie lo decide una sola dichiarazione,
**`src/lib/routes/capability-routes.ts`**, letta dal middleware, dalla guardia
di pagina e dalla navigazione — tre lettori sulla stessa riga, perche' non
possano dissentire. Vai li', non dedurre dalla cartella.

**E il confine di sicurezza resta la RLS.** Quella dichiarazione decide dove
avviene un *redirect*: impedisce di **arrivare** su una pagina, non di
**leggere** una riga. Un modulo di routing letto due volte non diventa una
garanzia sui dati.

### `(work)`, e cosa NON ci entra

Sotto `admin/` c'e' un gruppo annidato `(work)` che raccoglie i **file di rotta
di ogni superficie di lavoro** — `page.tsx` e `loading.tsx`, e nient'altro.

- **Solo file di rotta** (**R-WORK-ROUTES**, dichiarata dal piano 34-07). Server
  action e componenti client co-locati restano un livello fuori, a
  `src/app/(admin)/admin/…`, e si importano con specificatore assoluto
  `@/app/(admin)/admin/…`. La ragione sta qui perche' e' la regola che il
  prossimo lettore sara' tentato di rompere: **un route group governa il
  routing e nient'altro**, quindi spostarci dentro un modulo che non e' una
  rotta non compra niente e cambia lo specificatore in ogni file che lo
  importa — e diversi di quelli stanno sul percorso d'acquisto pubblico.
- **La porta sta fuori, di proposito.** `/admin/scanner` non e' dentro `(work)`:
  nessun layout deve avvolgere l'ingresso, e la fase 39 lo spostera' senza
  toccare altro. Vedi `checkin-offline.md`.

Mettere un file nel posto sbagliato non e' piu' un errore d'accesso travestito
da errore di organizzazione: e' un errore di organizzazione. L'errore d'accesso
si commette in `capability-routes.ts`.

## Quality Gates

- **Gate segreti nel bundle**: Tutto cio' che sta in un componente client finisce nel browser. Nessuna chiave, nessun dato di un altro utente, nessuna logica di autorizzazione che debba essere autorevole. `NEXT_PUBLIC_*` significa **pubblico**: e' un contratto, non un prefisso di stile.
- **Gate server per default**: Un componente diventa client solo quando gli serve interattivita', stato o API del browser. `"use client"` su un layout trascina dentro tutto l'albero sotto di esso.
- **Gate server action autorizzata**: Una server action e' un **endpoint pubblico** con una firma comoda. Ogni action ripete il controllo di ruolo e stato al proprio interno: essere importata da una pagina protetta non la protegge.
- **Gate cache esplicita**: Ogni superficie che mostra dati per-utente o dati segreti dichiara esplicitamente di non essere cacheabile. La cache di default di Next e' una feature finche' non serve un dato personale — poi e' una fuga. Vale in modo assoluto per le pagine che possono mostrare un venue.
- **Gate il gruppo non autorizza**: Il route group sceglie l'indirizzo, **non** chi lo raggiunge. Nessun file entra in `(admin)` "perche' e' roba da staff" e nessuno considera protetto cio' che ci sta dentro: la raggiungibilita' e' vincolata in `src/lib/routes/capability-routes.ts` e il confine e' la RLS. Un componente condiviso da gruppi diversi non decide da solo cosa mostrare: riceve i permessi come input. Situazione che lo fa scattare: una superficie nuova aggiunta sotto `(admin)` senza la sua riga nella mappa — che `next build` rifiuta, e la ragione per cui la rifiuta e' questa.
- **Gate stato vuoto e d'errore**: Ogni vista ha uno stato vuoto e uno d'errore progettati. Una lista vuota identica a una lista non ancora caricata e' un guasto silenzioso con una faccia neutra.
- **Gate service worker**: Serwist serve contenuto anche quando la rete manca — anche contenuto **vecchio**. Nessuna superficie che mostra stato di pagamento, validita' di biglietto o indirizzo di venue deve essere servita da cache stale. La cache va scelta per rotta, non ereditata.
- **Gate metadata e Open Graph**: Oggi `generateMetadata` esiste solo su `src/app/layout.tsx` e sulla pagina del menu — le pagine evento **non hanno metadata proprie**. Quando le avranno: un'anteprima social e' **contenuto pubblico e cacheato da terzi**, quindi non porta mai l'indirizzo di un venue segreto, e la sua immagine non e' una foto scattata sul posto. Vedi `venue-secrecy.md` e `media-and-storage.md`.
- **Gate accessibilita' al buio**: Lo scanner si usa in un locale buio, con una mano, di fretta. Contrasto, dimensione dei target e feedback non visivo (vibrazione) non sono rifiniture: sono la condizione d'uso reale. Il colore non e' mai l'unico canale di un'informazione.

## Imperative Behaviors

- When adding a client component: verify nothing secret enters the bundle
- When adding "use client": check what it drags into the client tree
- When writing a server action: re-check role and status inside it
- When a surface shows per-user or secret data: mark it uncacheable
- When placing a file: the group picks the address, never the audience — bind reachability in `capability-routes.ts`
- When adding a non-route module: keep it outside `(work)`, at `src/app/(admin)/admin/…` (R-WORK-ROUTES)
- When building a view: design its empty and error states
- When touching a cached route: verify the service worker cannot serve it stale
- When building scanner UI: verify it works one-handed, in the dark, with feedback beyond color
