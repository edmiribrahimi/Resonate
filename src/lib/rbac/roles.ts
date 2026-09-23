import type { Route } from "next";
import { CAP, type CapabilityKey } from "@/lib/capabilities/keys";
import { CAPABILITY_ROUTES } from "@/lib/routes/capability-routes";
import type { UserRole } from "@/types/database";

/**
 * The address the Check-in entry draws, declared here and **verified against the
 * map**.
 *
 * ── What stood here, and why it is gone rather than widened ──────────────────
 *
 * Phase 34 read this address out of `CAPABILITY_ROUTES` through a constant
 * annotated with a **one-element tuple**, and said so in as many words: *"the
 * type annotation is the guard, and it is not decoration … binding
 * `door.operate` to a second address becomes a build error here — naming this
 * file — instead of a silent `[0]` that keeps drawing the first one. There is
 * exactly one door."*
 *
 * **Phase 39 is the phase that error was waiting for.** STAFF-04 gives the door
 * a second address, so the stop has done its job and is **spent**, not
 * defeated. What replaces it is a guard of the same strength asking a better
 * question: the tuple was an **arity** guard standing in for a **meaning** one,
 * and the meaning is now checked directly — *does the map bind the address this
 * file draws to the door's capability?*
 *
 * Two lazier repairs were available and are refused, with their reasons, so
 * that neither is proposed again:
 *
 *   · `readonly [Route, Route]` — a guard that no longer says anything true. It
 *     would fire on a *third* address, which nothing is planning, and stay
 *     silent on the failure that matters: the two addresses being bound to the
 *     wrong key.
 *   · `readonly Route[]` with an index read at position zero — this
 *     reintroduces precisely the *silent `[0]`* the original docblock was
 *     written to prevent, drawing whichever address happens to be declared
 *     first.
 *
 * ── `/door` is drawn deliberately, and the choice is not cosmetic ────────────
 *
 * It is the canonical address (D-39-01), and every device that follows this nav
 * thereafter warms the `/door` runtime-cache entry rather than the old one —
 * which is what success criterion 2 of this phase needs. `/admin/scanner` keeps
 * serving the same surface permanently and as a real page (D-39-02); it is
 * simply not what the nav points at.
 *
 * ── The guard is a TYPE, and it had to go back to being one ─────────────────
 *
 * The first version of this repair replaced the tuple with a module-scope
 * `throw` that read the map through `resolveRoute` — and justified it with the
 * sentence *"this module is imported by [the phone-form nav wrapper] and is
 * therefore evaluated while pages are prerendered"*. The bracket is an
 * editorial substitution, not a paraphrase: the quotation named a file Phase 42
 * deleted, and a quotation pointing at nothing teaches the next reader less
 * than one that says what it pointed at. **That sentence was an inference, and
 * it was wrong.** All thirteen `<AppNav>` mount sites call `getAccessContext()`,
 * which reads `cookies()`, so **none of them is prerendered** — and the
 * paragraph above states, correctly, that this file is read from a
 * `"use client"` navigation, which means the throw shipped in the *client*
 * bundle and would have fired during hydration of every page, public ones
 * included. Two other assertions written in this same phase measured the
 * opposite mechanism and said so with the word *Measured*
 * (`middleware.ts`, `organizer-redirects.ts`); this one said *is therefore*.
 * A build guarantee traded for a runtime throw that cannot fire where it
 * claims is a guard that got weaker while reading as if it got stronger.
 *
 * So the guard is a type again — but it asks the **meaning** question the tuple
 * only stood in for. `DoorAddress` is the addresses the map binds **to
 * `door.operate` specifically**, read through `as const`. If `/door` is dropped
 * from that entry, or moved to another key, this line stops compiling and names
 * this file. That is the same failure the tuple produced, on the question that
 * actually matters, and it costs nothing at runtime.
 *
 * The two lazier repairs above stay refused. So does a third, now visible: a
 * runtime assertion standing in for a compile-time one. `ai-engineering.md`
 * asks of every guard *"which concrete situation makes it fire?"* — and the
 * honest answer for the throw was *"none that this bundle reaches"*.
 *
 * D-34-10 is unbroken: `capability-routes.ts` was already imported here, its
 * transitive closure still reaches no server module (`keys.ts` imports nothing;
 * `capability-routes.ts` imports `keys.ts` and `next`), and `CAPABILITY_ROUTES`
 * is read in type position only.
 */
type DoorAddress =
  (typeof CAPABILITY_ROUTES)[typeof CAP.DOOR_OPERATE]["routes"][number];

const DOOR_HREF: Extract<DoorAddress, Route> = "/door";

// Re-export types for convenience
//
// **Ne usciva anche il tipo dello stato, fino alla fase 50** (D-50-01): non e'
// stato tolto dall'elenco perche' nessuno lo importava da qui, ma perche' il
// tipo non esiste piu' in `@/types/database` — non esiste piu' la colonna che
// descriveva.
export type { UserRole };

// ── `ROLES` e' uscita il 2026-09-23 ─────────────────────────────────────────
//
// Qui stava una costante con i quattro valori del ruolo. **Non aveva
// consumatori** — misurato da `51-RESEARCH.md` §G e di nuovo dal code review
// della fase 51 (IN-01): `grep -rn "ROLES\." src/` trovava solo due occorrenze
// in prosa. Un export morto che ogni rinomina del ruolo doveva comunque
// attraversare, e che il build non avrebbe difeso se fosse stato dimenticato.
// L'unione che conta e' `UserRole` in `@/types/database`, specchio del `CHECK`
// di `profiles.role`; i letterali di ruolo sparsi nel prodotto si confrontano
// con quella, e il compilatore li difende (WR-09 dello stesso review).

// ── Le costanti dello stato sono uscite con la fase 50 (D-50-01) ────────────
//
// Sotto `ROLES` stava il loro gemello: l'elenco dei tre valori dell'asse dello
// stato — `pending`, `approved`, `rejected` — messo li' come se i due assi
// fossero pari. Non lo sono piu': ne resta uno solo, il ruolo.
//
// **Non aveva consumatori fuori da questo file** (`50-RESEARCH.md` §1.4,
// rimisurato prima di toglierlo), quindi la rimozione non nomina nessuno.
// Resta scritto **che c'era**, perche' un elenco sparito senza una riga si
// riscrive al primo che ne sente la mancanza — e il suo nome non si ricopia,
// o il grep che prova la cancellazione resta rosso per una prosa.

// Navigation item shape
export interface NavItem {
  /**
   * Typed as `Route` rather than `string` by plan 34-01 — form 1, the
   * `NavItem<Route>[]` shape the Next.js docs give. `AppNav` hands this
   * straight to `<Link>`, so without the type here a nav entry could point at
   * an address that does not exist and nothing would say so until a member
   * tapped it.
   */
  href: Route;
  /**
   * L'indirizzo che questa voce prende **quando non c'e' sessione**, o `null`
   * quando e' lo stesso di `href`.
   *
   * ── Perche' esiste, e perche' non sono due voci (fase 50, D-50-13) ─────────
   *
   * `Account` ha due destinazioni: `/account` per chi ha una sessione,
   * `/login` per chi non ce l'ha. Fino alla fase 50 la voce era `requireAuth`
   * e un anonimo **non vedeva alcun Account**; ora lo vede, e lo porta alla
   * pagina d'accesso.
   *
   * La differenza si risolve **qui e nel filtro**, non con due voci che si
   * escludono a vicenda: due voci con la stessa etichetta sono il modo in cui
   * una barra comincia a mentire — una delle due si aggiorna e l'altra no, e
   * nessuno se ne accorge finche' non ci clicca sopra la persona sbagliata.
   *
   * **Richiesto e non opzionale**, per la stessa ragione di `capability` piu'
   * sotto: le quattro voci che rispondono `null` stanno rispondendo, non
   * astenendosi.
   */
  hrefWhenAnonymous: Route | null;
  label: string;
  icon: string;
  /** Minimum roles required (null = visible to everyone including unauthenticated) */
  roles: UserRole[] | null;
  // ── Il campo dell'approvazione non esiste piu' (fase 50, 50-09, D-50-01) ──
  //
  // Era un booleano **obbligatorio e non opzionale**, e la ragione scritta
  // accanto era buona: un campo opzionale lascia a una voce aggiunta fra due
  // anni la liberta' di dimenticare la domanda, uno obbligatorio rende il
  // dimenticarla un errore di compilazione che nomina questo file. E' la stessa
  // disciplina che `capability` piu' sotto applica ancora.
  //
  // **Va tolto lo stesso, e la ragione non e' che nessuna voce lo usava.** Il
  // piano 50-06 lo aveva gia' portato a falso su tutte e quattro le voci
  // (D-50-04) e lo aveva lasciato in piedi dichiarandolo: la colonna
  // `profiles.status` esiste ancora nel database per la durata della finestra
  // di deploy (D-50-24), e la firma di questa funzione non era ancora stata
  // smontata. Ora lo e'. **La domanda che quel campo poneva — "chi
  // guarda e' approvato?" — non ha piu' un modo di essere posta**, perche' non
  // esiste piu' l'asse su cui rispondeva: un account e' il suo ruolo, e basta.
  //
  // Un campo obbligatorio che ogni voce deve mettere a falso non e' una domanda
  // a cui si risponde: e' una domanda senza soggetto, e continuare a porla
  // insegna al prossimo lettore che l'asse esiste ancora.
  //
  // **Il nome del campo non e' ricopiato qui di proposito**: un commento che
  // recita l'identificatore appena cancellato tiene rosso il grep che prova la
  // cancellazione, per una ragione che non e' un chiamante sopravvissuto. Il
  // fatto si registra, il simbolo no (disciplina del piano 50-07, ripresa dal
  // 50-08).
  /** Requires authentication */
  requireAuth: boolean;
  /**
   * The capability that governs this entry, or `null` when no capability does.
   *
   * **Required rather than optional, and that is the whole point of the field.**
   * An optional field lets a sixth entry added two years from now forget the
   * question; a required one makes forgetting it a build error naming this file.
   * The four entries that answer `null` are answering, not abstaining — there is
   * no capability governing `/`, `/events`, `/gallery` or `/account`.
   */
  capability: CapabilityKey | null;
}

// Full navigation items list with role and capability requirements
//
// ── La voce `Home` e' uscita con la fase 50 (D-50-12) ────────────────────────
//
// Era la prima di questa lista: indirizzo la radice, etichetta `Home`,
// `hideWhenAuth: true` — visibile al solo anonimo. **`/` non e' piu' una
// pagina**: e' un
// rimando a `/events` (`src/app/page.tsx`), quindi quella voce porterebbe
// **altrove che da se'** — la si tocca, si finisce su Events, e la scheda
// evidenziata non e' quella che si e' premuta.
//
// **Se `/` torni a essere una pagina, e con quale significato, lo decide la
// fase 52 (`NAV-01`).** Questa fase non puo' lasciarla com'era e non e' la
// fase che decide se torna: la toglie, e lo dice.
//
// **Con lei esce `hideWhenAuth`, campo e ramo del filtro.** Era il suo unico
// consumatore — verificato: nessun altro file del repo nomina quel campo — e un
// campo booleano che nessuna voce mette a `true` e' una domanda che ogni voce
// nuova deve continuare a rispondere per niente. **Scelto di toglierlo invece
// di lasciarlo a meta'**, come il piano chiedeva di dichiarare.
const NAV_ITEMS: NavItem[] = [
  {
    href: "/events",
    hrefWhenAnonymous: null,
    label: "Events",
    icon: "calendar",
    roles: null,
    requireAuth: false,
    capability: null,
  },
  {
    // ── La voce Gallery portava un cancello sull'approvazione ───────────────
    //
    // Fino alla fase 50 chiedeva che chi guardava fosse approvato: era **un
    // cancello su `status`**, e D-50-04 pretende che non ne sopravviva nessuno.
    // Il piano 50-06 lo ha spento, questo (50-09) ha tolto il campo che lo
    // poneva, e la colonna sparisce dal database nella stessa fase.
    //
    // **Non e' un allargamento d'accesso, ed e' la parte da leggere prima di
    // "riparare" questa riga.** La pagina non ha alcuna guardia propria: filtra
    // `event_media.status = 'approved'` e basta
    // (`src/app/(public)/gallery/page.tsx:51`), non e' in
    // `capability-routes.ts`, e **chi ne conosce l'indirizzo ci arriva gia'
    // oggi** — anche da anonimo, anche prima di questa modifica. Cio' che
    // cambia e' solo che la scheda viene **disegnata** a chi prima non la
    // vedeva. *Hiding a nav item is not protecting a route*
    // (`access-gating.md`, gate coerenza navigazione/permessi): questa riga
    // non ha mai protetto niente, quindi toglierla non apre niente.
    //
    // **Il cancello vero lo costruisce `NAV-02`, fase 52**, legando la voce a
    // una capability. Anticiparlo qui sarebbe fare la 52 dentro la 50. Debito
    // dichiarato con il nome della fase che lo chiude.
    href: "/gallery",
    hrefWhenAnonymous: null,
    label: "Gallery",
    icon: "image",
    roles: null,
    requireAuth: false,
    capability: null,
  },
  {
    // ── The divergence Phase 34 wrote down, and its closure — D-39-06
    //
    // **What it was.** This entry used to be filtered by a role list plus an
    // approval flag, while the middleware and the door's own guard ask
    // `door.operate` — a key Phase 43 granted **without** asking for approval
    // (D-06, deliberately: a pending organizer must not be refused in front of
    // a queue). The two disagreed in exactly one cell:
    // **an organizer in status `pending` was admitted by the server and shown
    // no Check-in tab.**
    //
    // **Why Phase 34 left it open rather than patched it.** It was the SAFE
    // direction of the two — a hidden entry the server would have allowed,
    // never a drawn entry the server refuses. Closing it meant giving this
    // function the capability set, which meant changing the navigation's props,
    // which meant editing the door's own surface: the file this project least
    // wants opened by accident. The owner assigned it here rather than to a
    // later phase, because this phase opens that file anyway
    // (`34-04-SUMMARY.md:197`, `34-VERIFICATION.md:431`).
    //
    // **How it is closed.** By filtering on **the same key the server refuses
    // on**, `CAP.DOOR_OPERATE`, instead of on role and approval. That is
    // possible because `@/lib/capabilities/keys` imports nothing (D-34-10), so
    // one filter serves both sides of the client boundary — the nav reads the
    // key from a `"use client"` component and the middleware reads it from the
    // edge, and neither had to invent its own vocabulary.
    //
    // ── The widening this carries, stated rather than absorbed
    //
    // The filter below reads the live-assignment set as well as the held one,
    // because the middleware admits the door on **role or live assignment** and
    // the page guard repeats that predicate. Without it, a member of staff
    // rostered to tonight's door — who holds `door.operate` by assignment and
    // by nothing else, `staff` being one of the six declared refusals of the
    // role — would be drawn no tab, and D-39-06 would close one half under a
    // heading that says closed.
    //
    // The cost is real and is this: `liveAssignmentCapabilities` is coarse and
    // **does not name a night** — *"wider than the real permission, always and
    // by construction"* (`capabilities/server.ts`). So somebody assigned to a
    // **different** night is drawn the tab, the middleware admits them, the
    // page admits them, and **they do not find their night in the list** (the
    // night list is filtered by assignment, plan 35-10). No refusal anywhere,
    // which is the asymmetry `checkin-offline.md` optimises for: a false
    // refusal happens in front of a queue, an extra tab does not.
    //
    // ── This is a visibility change and nothing else
    //
    // Hiding a link is not protecting a route (`access-gating.md`, gate
    // *coerenza navigazione/permessi*). The server-side control for this entry
    // is the coarse guard in `admin/scanner/DoorSurface.tsx`, mounted by both
    // of the door's addresses; the real boundary on the door's **data** is
    // `requireDoorOperator({ partyId })` in the three door Route Handlers,
    // which write with the service client and see no policy at all. **Neither
    // is touched by this phase.** Drawing this entry more honestly grants
    // nobody anything.
    href: DOOR_HREF,
    hrefWhenAnonymous: null,
    label: "Check-in",
    icon: "qrcode",
    roles: null,
    requireAuth: true,
    capability: CAP.DOOR_OPERATE,
  },
  {
    // ── Account si vede anche senza sessione, dalla fase 50 (D-50-13) ───────
    //
    // `requireAuth` era `true`: **un anonimo non vedeva alcuna voce Account.**
    // Con `Home` uscita nello stesso commit, un anonimo vedrebbe altrimenti
    // solo Events e Gallery, e non avrebbe **nessuna strada dentro la barra**
    // verso la pagina d'accesso — che e' l'unica porta rimasta, visto che la
    // pagina d'iscrizione non esiste piu'.
    //
    // E' una **voce nuova per chi non ha sessione**, non un ritocco: stessa
    // etichetta, stessa icona, stessa posizione, e un indirizzo che dipende da
    // chi guarda — `/login` da anonimo, la pagina dell'account con una
    // sessione. La differenza la risolve il filtro qui sotto, non una seconda
    // voce.
    //
    // ── L'indirizzo e' `/account` dal 2026-09-22 (fase 51, D-51-09b) ────────
    //
    // La pagina si e' spostata, e la barra la segue **all'indirizzo vero**, non
    // al vecchio: il vecchio risponde ancora, ma come 308, e mandare ogni tocco
    // della barra attraverso un redirect sarebbe un giro in piu' a ogni
    // apertura — pagato da chi tocca questa voce piu' spesso di ogni altra.
    href: "/account",
    hrefWhenAnonymous: "/login",
    label: "Account",
    icon: "user",
    roles: null,
    requireAuth: false,
    capability: null,
  },
];

/**
 * Filter navigation items on what the subject is, and on what the subject may
 * do.
 *
 * ── Gli esiti, rimisurati sul filtro UNA VOLTA ANCORA (fase 50, 50-09) ─────
 *
 * **Terza riscrittura in una fase, e l'ultima**: la prima diceva *«Non
 * autenticato: Home, Events, Gallery — 3 schede»* e distingueva quattro righe
 * per stato di approvazione; la seconda (50-06) tolse `Home` e le tre righe
 * dello stato; questa toglie **il parametro** che le produceva. Un docblock che
 * descrive un esito che non si verifica piu' e' peggio di un docblock assente,
 * perche' chi lo legge ci costruisce sopra invece di andare a guardare.
 *
 * - **Non autenticato**: Events, Gallery, **Account → `/login`** (3 schede).
 *   L'insieme delle capability e' vuoto, quindi Check-in resta fuori
 *   esattamente come sempre. Account e' **nuovo** per questo soggetto
 *   (D-50-13): prima non vedeva alcuna voce Account.
 * - **Un account qualunque con ruolo `member`**: Events, Gallery, **Account →
 *   `/account`** (3 schede).
 * - **Organizer o master**: Events, Gallery, Check-in, Account (4 schede).
 *   Check-in e' filtrato su `door.operate`, che il ruolo tiene.
 * - **Staff**: Events, Gallery, Account — **piu' Check-in quando e' assegnato
 *   a una serata in corso**, perche' `staff` non tiene `door.operate` per
 *   ruolo e lo tiene solo per assegnazione viva.
 *
 * **Quattro esiti dove ce n'erano sette.** Non e' una semplificazione di
 * scrittura: `pending`, `approved` e `rejected` producevano tre barre diverse
 * per lo stesso ruolo, e l'asse che le separava non esiste piu' nel prodotto.
 * Il soggetto e' il suo ruolo piu' cio' che puo' fare, e nient'altro.
 *
 * **Cosa NON e' cambiato, e va tenuto contro la riparazione sbagliata.** Il
 * ramo delle capability e' intatto: la porta continua a essere filtrata su
 * `door.operate`, chiave che la fase 43 (D-06) concesse **senza** chiedere
 * l'approvazione, proprio perche' un organizer non approvato non doveva essere
 * respinto davanti a una fila. Con l'asse dello stato via, quella concessione
 * smette di avere un caso da prevenire — ma il filtro resta il filtro giusto,
 * ed e' lo **stesso predicato del middleware**. Aggiungere qui un controllo di
 * qualunque tipo sulla porta e' la riparazione che chiude la porta.
 *
 * La riga staff non *«non ha bisogno di codice»*: staff vede o non vede la
 * scheda secondo lo stesso insieme di assegnazioni vive che legge il
 * middleware, che e' codice ed e' qui sotto.
 *
 * ── The mount count, corrected because the stale one was load-bearing
 *
 * This docblock used to put the navigation's mount count at **44**, and that
 * number was the reason given for *not* changing this signature. **Measured on
 * this tree: 13 mount sites.** The count collapsed when plan 34-05 introduced
 * `admin/(work)/layout.tsx` and folded every work surface into a single mount.
 * A stale count in prose used to justify leaving a decision alone is exactly
 * how a decision outlives its reason — so it is corrected here rather than
 * left to rot, and the same correction is made in `(work)/layout.tsx`.
 *
 * **Re-measured after Phase 42 deleted the phone-form wrapper: still 13.** One
 * of the thirteen changed identity — the mount that lived inside the wrapper
 * left, and the door's own surface file took its place — so the number survives
 * a change that could have moved it, and it survives because it was counted
 * again rather than carried over. All thirteen still call `getAccessContext()`,
 * the door at `DoorSurface.tsx:130`, which is the premise the paragraph above
 * rests on and not an assumption inherited with it.
 *
 * ── Il secondo parametro e' uscito, e la proprieta' scritta sopra si e' spesa
 *
 * La firma prendeva `(role, status, capabilities, liveAssignmentCapabilities)`.
 * **`status` e' via** (fase 50, D-50-01): la colonna che lo produceva non
 * esiste piu' e il filtro non aveva piu' un ramo che la leggesse.
 *
 * **La lista dei punti d'innesto da correggere non e' stata costruita a
 * memoria: l'ha costruita il compilatore**, ed e' esattamente cio' che il
 * paragrafo qui sopra prometteva — *un quattordicesimo che se ne dimenticasse
 * e' un errore di compilazione che nomina il file*. Tolto il parametro, `next
 * build` ha nominato **tredici** file, uno per mount, piu' `AppNav.tsx` per la
 * prop. Il numero coincide con i tredici che questo docblock dichiarava, per la
 * terza misura di fila (34-05, poi dopo la fase 42, poi qui).
 *
 * @param capabilities the keys the subject holds by role
 * @param liveAssignmentCapabilities the coarser set held by a live per-night
 *   assignment, or `null` when the payload did not carry the key. **Both are
 *   required**: all 13 `<AppNav>` mount sites pass them, so a fourteenth
 *   that forgets is a build error naming the file — the same discipline the
 *   one-element tuple at the top of this file enforced before this phase spent
 *   it.
 */
export function getVisibleNavItems(
  role: UserRole | null,
  capabilities: readonly CapabilityKey[],
  liveAssignmentCapabilities: readonly string[] | null
): NavItem[] {
  const isAuthenticated = role !== null;

  const visible = NAV_ITEMS.filter((item) => {
    // Check authentication requirement
    if (item.requireAuth && !isAuthenticated) {
      return false;
    }

    // ── Il ramo dell'approvazione e' uscito qui (fase 50, 50-09) ───────────
    //
    // Stava fra il controllo dell'autenticazione e quello del ruolo, e chiedeva
    // se chi guarda fosse approvato. **Non c'e' piu' niente da chiedere**: la
    // colonna su cui rispondeva non esiste, e il campo che la invocava e' uscito
    // da `NavItem` nello stesso commit. Toglierne uno solo dei due avrebbe
    // lasciato o un campo che nessuno legge o un ramo che nessuno raggiunge —
    // due modi diversi di far credere che l'asse esista ancora.
    //
    // **La barra si filtra su tre cose, ed e' l'elenco intero**: sessione,
    // ruolo, capability. Un quarto criterio qui dentro e' una decisione
    // d'accesso, non una rifinitura.

    // Check role restriction
    if (item.roles !== null) {
      if (!role || !item.roles.includes(role)) {
        return false;
      }
    }

    // Check capability requirement — the clause D-39-06 added, and the only
    // one the Check-in entry answers.
    //
    // Role **or** live assignment, read in that order, which is the middleware's
    // own predicate (`src/lib/supabase/middleware.ts`) and the door guard's
    // (`admin/scanner/DoorSurface.tsx`). Not "similar to": the same. A stricter
    // test here would draw no tab for somebody the server then admits, which is
    // the divergence this clause exists to close; a looser one would draw a tab
    // the server refuses, which is worse, because a refusal happens at the door.
    //
    // `liveAssignmentCapabilities === null` refuses, and that is deliberate:
    // `null` means the payload did not carry the key — one known cause, an
    // unapplied migration — and admitting on an absent key would widen the nav
    // the moment a migration lagged. Empty means asked and answered.
    if (item.capability !== null) {
      const heldByRole = capabilities.includes(item.capability);
      const heldByAssignment =
        liveAssignmentCapabilities !== null &&
        liveAssignmentCapabilities.includes(item.capability);

      if (!heldByRole && !heldByAssignment) {
        return false;
      }
    }

    return true;
  });

  // ── L'indirizzo per chi non ha sessione (fase 50, D-50-13) ────────────────
  //
  // Una voce con `hrefWhenAnonymous` prende quell'indirizzo quando non c'e'
  // sessione, il proprio altrimenti. Oggi ne esiste **una**, Account: `/login`
  // da anonimo, `/account` con una sessione.
  //
  // **Perche' qui e non con due voci in `NAV_ITEMS`.** Due voci con la stessa
  // etichetta e condizioni che si escludono a vicenda sono il modo in cui una
  // barra comincia a mentire: si aggiorna l'icona dell'una, l'etichetta
  // dell'altra, e nessuno se ne accorge finche' non ci clicca sopra la persona
  // che vede solo la seconda.
  //
  // **Questo non e' un controllo d'accesso e non deve diventarlo.** Decide un
  // indirizzo da disegnare, non chi puo' raggiungerlo: `/account` resta
  // protetto da `capability-routes.ts` e dal middleware, e un anonimo che lo
  // scrive a mano viene rimbalzato esattamente come prima di questa riga.
  // `AppNav` disegna cio' che riceve e non risolve niente per conto suo (e'
  // `"use client"`: una decisione presa li' e' una decisione che il lettore
  // puo' modificare).
  return visible.map((item) =>
    !isAuthenticated && item.hrefWhenAnonymous !== null
      ? { ...item, href: item.hrefWhenAnonymous }
      : item
  );
}
