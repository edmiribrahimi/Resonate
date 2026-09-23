import type { Route } from "next";
import { CAP, type CapabilityKey } from "@/lib/capabilities/keys";
import {
  CAPABILITY_ROUTES,
  resolveRoute,
} from "@/lib/routes/capability-routes";
import { sortTabsByLabel, visibleStaffTabs } from "@/lib/routes/staff-tabs";
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
 *
 * **Fase 52: due import in piu', e la chiusura resta la stessa.** `resolveRoute`
 * viene dallo stesso modulo della mappa, e `staff-tabs.ts` importa soltanto
 * `keys.ts`, `capability-routes.ts` e `next` — quindi il pannello Management si
 * costruisce qui senza aggiungere alcun arco verso un modulo del server. Il
 * `resolveRoute` e' letto **a runtime**, per l'asserzione della voce Gallery
 * piu' sotto, e quel paragrafo dice dove scatta e dove no.
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

// ── La forma di una voce, riscritta dalla fase 52 (D-52-01..05) ─────────────
//
// Fino alla fase 51 qui stava **una** forma, e ogni voce era un link. La barra
// della fase 52 ne ha tre, e non sono varianti di stile: sono tre cose che fanno
// cose diverse al tocco.
//
//   · `link` — Events, Check-in, Account. Porta a un indirizzo, ed e' l'unica
//     delle tre che la mappa e la guardia devono mantenere.
//   · `disabled` — TASK (D-52-03). **Nessun `href`, per costruzione**: il tipo
//     non ha il campo, quindi nessun consumatore puo' farne un link per
//     distrazione. La pagina non esiste ancora (fase 53); la voce e' disegnata
//     perche' la barra abbia gia' la sua forma finale.
//   · `panel` — Management. Non porta da nessuna parte: apre il pannello, il
//     cui contenuto e' `panel` qui sotto. Anche lei senza `href`.
//
// Un tipo discriminato invece di campi opzionali su una forma sola, per la
// disciplina che la vecchia forma portava sul suo campo `capability`: **un
// campo che pone una domanda e' obbligatorio**. Una forma unica con un `href`
// opzionale lascerebbe a una quinta voce la liberta' di dimenticare se e' un
// link; tre forme rendono quella dimenticanza un errore di compilazione che
// nomina questo file.
//
// L'indirizzo della voce-link e' **gia' risolto** quando esce di qui: la
// sostituzione di `hrefWhenAnonymous` (D-50-13) avviene dentro `getNavigation`,
// non in `AppNav`, che e' `"use client"` e non decide niente.
export type BarEntry =
  | {
      readonly kind: "link";
      readonly href: Route;
      readonly label: string;
      readonly icon: string;
    }
  | {
      readonly kind: "disabled";
      readonly label: "TASK";
      readonly icon: string;
    }
  | {
      readonly kind: "panel";
      readonly label: "Management";
      readonly icon: string;
    };

/**
 * Una riga del pannello Management: un indirizzo e un'etichetta, niente icona
 * (UI-SPEC §B.1 — una voce per riga, nessuna icona, nessuna intestazione).
 */
export interface PanelEntry {
  readonly href: Route;
  readonly label: string;
}

/** Cio' che la funzione pura restituisce: la barra e il pannello, insieme. */
export interface Navigation {
  readonly bar: readonly BarEntry[];
  readonly panel: readonly PanelEntry[];
}

/**
 * La dichiarazione di una voce-link, prima del filtro. E' la forma che fino
 * alla fase 51 descriveva ogni voce della barra, meno due campi — e ognuno dei
 * due ha la sua riga qui dentro.
 */
interface LinkDeclaration {
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
   * `/login` per chi non ce l'ha. La differenza si risolve **qui e nel
   * filtro**, non con due voci che si escludono a vicenda: due voci con la
   * stessa etichetta sono il modo in cui una barra comincia a mentire — una
   * delle due si aggiorna e l'altra no, e nessuno se ne accorge finche' non ci
   * clicca sopra la persona sbagliata.
   *
   * **Richiesto e non opzionale**, per la stessa ragione di `capability` piu'
   * sotto: le voci che rispondono `null` stanno rispondendo, non astenendosi.
   */
  hrefWhenAnonymous: Route | null;
  label: string;
  icon: string;
  // ── Il campo dell'approvazione non esiste piu' (fase 50, 50-09, D-50-01) ──
  //
  // Era un booleano obbligatorio, e la domanda che poneva — "chi guarda e'
  // approvato?" — non ha piu' un modo di essere posta: non esiste piu' l'asse
  // su cui rispondeva. **Il nome del campo non e' ricopiato qui di
  // proposito**: un commento che recita l'identificatore appena cancellato
  // tiene rosso il grep che prova la cancellazione (disciplina del piano
  // 50-07, ripresa dal 50-08).
  //
  // ── E neanche il campo dei ruoli, dalla fase 52 ──────────────────────────
  //
  // Le tre voci-link lo mettevano tutte a `null`: nessuna era filtrata per
  // ruolo. L'unica voce della barra che il ruolo decide e' TASK (D-52-24), che
  // **non e' un link** e porta il proprio elenco (`TASK_ROLES` qui sotto). Un
  // campo che ogni voce riempie con la stessa risposta non e' una domanda: e'
  // un modulo da firmare.
  /** Requires authentication */
  requireAuth: boolean;
  /**
   * The capability that governs this entry, or `null` when no capability does.
   *
   * **Required rather than optional, and that is the whole point of the field.**
   * An optional field lets an entry added two years from now forget the
   * question; a required one makes forgetting it a build error naming this file.
   * The entries that answer `null` are answering, not abstaining — there is no
   * capability governing `/events` or `/account`.
   */
  capability: CapabilityKey | null;
}

// ── Le voci-link, dichiarate una per una ────────────────────────────────────
//
// ── La voce `Home` e' uscita con la fase 50 (D-50-12), e NON torna ─────────
//
// Era la prima di questa lista, visibile al solo anonimo. **La radice non e'
// piu' una pagina**: e' un rimando a `/events` (`src/app/page.tsx`), quindi
// quella voce porterebbe altrove che da se'. La fase 50 lasciava aperta la
// domanda e nominava la fase che l'avrebbe chiusa; **la fase 52 l'ha chiusa:
// Home non torna** (D-52-02). Nessuna voce ha l'indirizzo della radice.
const EVENTS: LinkDeclaration = {
  href: "/events",
  hrefWhenAnonymous: null,
  label: "Events",
  icon: "calendar",
  requireAuth: false,
  capability: null,
};

// ── La voce Gallery e' uscita dalla barra (fase 52, D-52-01, NAV-02) ────────
//
// Stava qui, seconda. Fino alla fase 50 portava un cancello sull'approvazione,
// che D-50-04 ha spento; la fase 50 la lasciava **senza capability** e
// dichiarava il debito: *il cancello vero lo costruisce `NAV-02`, fase 52*.
//
// **Il debito e' chiuso, e la voce non e' piu' qui.** Sta nel **pannello
// Management**, sotto la chiave `gallery.view` (D-52-12: concessa per ruolo a
// master, organizer e staff) — vedi `panelFor` qui sotto, e l'asserzione a
// caricamento che la lega alla mappa. Un `attendee` e un anonimo non la vedono
// piu' in nessun posto della navigazione; **non e' questo che li rifiuta**: li
// rifiutano la voce `/gallery` di `CAPABILITY_ROUTES` nel middleware, la
// guardia della pagina e, sui dati, la policy di lettura di NAV-07.
const CHECK_IN: LinkDeclaration = {
  // ── The divergence Phase 34 wrote down, and its closure — D-39-06
  //
  // **What it was.** This entry used to be filtered by a role list plus an
  // approval flag, while the middleware and the door's own guard ask
  // `door.operate`. The two disagreed in exactly one cell: **an organizer in
  // status `pending` was admitted by the server and shown no Check-in tab.**
  // It was the SAFE direction of the two — a hidden entry the server would
  // have allowed, never a drawn entry the server refuses.
  //
  // **How it is closed.** By filtering on **the same key the server refuses
  // on**, `CAP.DOOR_OPERATE`, instead of on role and approval. That is
  // possible because `@/lib/capabilities/keys` imports nothing (D-34-10), so
  // one filter serves both sides of the client boundary.
  //
  // ── The widening this carries, stated rather than absorbed
  //
  // The filter reads the live-assignment set as well as the held one, because
  // the middleware admits the door on **role or live assignment** and the page
  // guard repeats that predicate. Without it, a member of staff rostered to
  // tonight's door — who holds `door.operate` by assignment and by nothing
  // else — would be drawn no entry.
  //
  // The cost is real and is this: `liveAssignmentCapabilities` is coarse and
  // **does not name a night** — *"wider than the real permission, always and
  // by construction"* (`capabilities/server.ts`). So somebody assigned to a
  // **different** night is drawn the entry, the middleware admits them, the
  // page admits them, and **they do not find their night in the list**. No
  // refusal anywhere, which is the asymmetry `checkin-offline.md` optimises
  // for: a false refusal happens in front of a queue, an extra entry does not.
  //
  // ── Phase 52 leaves this entry exactly where it was (D-52-05)
  //
  // Same predicate, same address, same place — second, after Events. It is
  // **absent**, never drawn switched off, for somebody without the key: an
  // entry switched off for a permission would be a second verdict on the
  // operator, in the bar, in front of whoever is looking at the phone.
  //
  // ── This is a visibility change and nothing else
  //
  // Hiding a link is not protecting a route (`access-gating.md`, gate
  // *coerenza navigazione/permessi*). The server-side control for this entry
  // is the coarse guard in `admin/scanner/DoorSurface.tsx`, mounted by both
  // of the door's addresses; the real boundary on the door's **data** is
  // `requireDoorOperator({ partyId })` in the door Route Handlers.
  href: DOOR_HREF,
  hrefWhenAnonymous: null,
  label: "Check-in",
  icon: "qrcode",
  requireAuth: true,
  capability: CAP.DOOR_OPERATE,
};

const ACCOUNT: LinkDeclaration = {
  // ── Account si vede anche senza sessione, dalla fase 50 (D-50-13) ───────
  //
  // Per un anonimo e' **l'unica strada dentro la barra** verso la pagina
  // d'accesso, che e' l'unica porta rimasta: la pagina d'iscrizione non esiste
  // piu'. Stessa etichetta, stessa icona, e un indirizzo che dipende da chi
  // guarda — `/login` da anonimo, la pagina dell'account con una sessione.
  //
  // ── L'indirizzo e' `/account` dal 2026-09-22 (fase 51, D-51-09b) ────────
  //
  // Il vecchio risponde ancora, ma come 308: la barra segue l'indirizzo vero.
  //
  // ── Dalla fase 52 sta in barra solo per chi non ha il pannello (D-52-04) ─
  //
  // Chi ha almeno una voce nel pannello Management trova Account **dentro il
  // pannello**, come una voce fra le altre (`panelFor`). In barra resta per
  // l'`attendee`, per l'anonimo e per chi non ha niente da gestire.
  href: "/account",
  hrefWhenAnonymous: "/login",
  label: "Account",
  icon: "user",
  requireAuth: false,
  capability: null,
};

/**
 * I ruoli che vedono TASK spenta — D-52-03, allargato al `master` da D-52-24.
 *
 * **L'unico filtro per ruolo della barra**, e scritto come tale. TASK e' la
 * voce di chi lavorera' sui task nella fase 53 (organizer e staff, TASK-01); il
 * `master` la vede perche' tiene tutto, e la sua barra mostra la forma finale.
 * L'`attendee` non la vede: non ha task, e una voce spenta che non si accendera'
 * mai per lui e' una promessa falsa.
 *
 * E' la regola di D-50-09 — sessione, ruolo, capability — nel suo secondo
 * termine. Non e' un quarto criterio.
 */
const TASK_ROLES = [
  "master",
  "organizer",
  "staff",
] as const satisfies readonly UserRole[];

const TASK: BarEntry = {
  kind: "disabled",
  label: "TASK",
  icon: "clipboard-document-check",
};

const MANAGEMENT: BarEntry = {
  kind: "panel",
  label: "Management",
  icon: "squares-2x2",
};

// ── La voce Gallery del pannello, e la sua asserzione ───────────────────────
//
// **Due guardie, e non sono la stessa guardia scritta due volte.**
//
// 1. **Il tipo.** `GalleryAddress` sono gli indirizzi che la mappa lega **a
//    `gallery.view` in particolare**, letti attraverso l'`as const` di
//    `CAPABILITY_ROUTES` — la stessa costruzione di `DoorAddress` in cima a
//    questo file, e per la stessa ragione scritta li': se `/gallery` esce da
//    quella voce, o passa a un'altra chiave, questa riga smette di compilare e
//    nomina il file. E' la garanzia di **build**.
//
// 2. **L'asserzione a caricamento**, nella forma di `staff-tabs.ts` (il loop in
//    fondo a quel file): chiede a `resolveRoute` che cosa risponde **davvero**
//    il matcher per quell'indirizzo. Il tipo non lo vede: una seconda voce il
//    cui pattern catturasse `/gallery` con meno segmenti dinamici **vincerebbe
//    la risoluzione** (`resolveRoute` sceglie il pattern piu' specifico) mentre
//    la lista di `gallery.view` continuerebbe a nominarlo. Quel caso compila, e
//    il middleware chiederebbe una chiave diversa da quella su cui il pannello
//    disegna la voce.
//
// **Dove scatta la seconda, detto senza gonfiarlo.** Questo modulo e' letto da
// `AppNav`, che e' `"use client"`: l'asserzione gira alla prima valutazione del
// modulo — nel render sul server di ogni pagina che monta la barra, e
// all'idratazione. **Non e' una garanzia di build**, e la docblock di
// `DOOR_HREF` qui sopra spiega perche' non va spacciata per tale: la garanzia di
// build e' la guardia 1. La 2 e' la stessa disciplina delle tab, chiesta per
// parita' da NAV-02 (T-52-27) — e il suo fallimento e' rumoroso, con due
// messaggi per due errori diversi, invece di una voce che promette una rotta
// che il middleware non apre.
type GalleryAddress =
  (typeof CAPABILITY_ROUTES)[typeof CAP.GALLERY_VIEW]["routes"][number];

const GALLERY_HREF: Extract<GalleryAddress, Route> = "/gallery";

{
  const galleryResolution = resolveRoute("/gallery");

  if (galleryResolution === null) {
    throw new Error(
      `roles: la voce Gallery del pannello Management punta a "${GALLERY_HREF}", ` +
        `che nessuna voce di CAPABILITY_ROUTES lega. Lega l'indirizzo nella mappa ` +
        `o togli la voce — una voce disegnata senza regola lato server e' una ` +
        `promessa che nessuno mantiene.`
    );
  }

  if (galleryResolution.key !== CAP.GALLERY_VIEW) {
    throw new Error(
      `roles: la voce Gallery del pannello Management si disegna su ` +
        `"${CAP.GALLERY_VIEW}", ma CAPABILITY_ROUTES risolve "${GALLERY_HREF}" su ` +
        `"${galleryResolution.key}" (pattern "${galleryResolution.pattern}"). La ` +
        `mappa e' la fonte: correggi la voce, o il pattern che la cattura.`
    );
  }
}

/**
 * Il contenuto del pannello Management — D-52-09, in ordine alfabetico
 * (D-52-27).
 *
 * `visibleStaffTabs(capabilities)` piu' Gallery (se `gallery.view`) piu'
 * Account. **Per ruolo, non per assegnazione**: `visibleStaffTabs` legge le sole
 * capability di ruolo, ed e' giusto — il middleware apre gli strumenti solo per
 * ruolo, nessuna loro voce e' `assignmentOpenable`. Uno `staff` assegnato
 * stasera trova Check-in in barra (per assegnazione) e Management (per
 * `gallery.view`, di ruolo).
 *
 * **Account entra solo se c'e' almeno un'altra voce.** Un pannello con dentro il
 * solo Account sarebbe un giro in piu' per arrivare alla stessa pagina: in quel
 * caso il pannello e' vuoto e Account sta in barra (D-52-04). E' questa riga,
 * e nient'altro, che decide se in barra compare Management o Account — cioe'
 * **la presenza del pannello e' derivata dalle capability**, non un quarto
 * criterio accanto a sessione, ruolo e capability.
 */
function panelFor(capabilities: readonly CapabilityKey[]): PanelEntry[] {
  const entries: PanelEntry[] = visibleStaffTabs(capabilities).map((tab) => ({
    href: tab.href,
    label: tab.label,
  }));

  if (capabilities.includes(CAP.GALLERY_VIEW)) {
    entries.push({ href: GALLERY_HREF, label: "Gallery" });
  }

  if (entries.length === 0) {
    return [];
  }

  entries.push({ href: ACCOUNT.href, label: ACCOUNT.label });

  return sortTabsByLabel(entries);
}

/**
 * Il predicato di una voce-link. **Per Check-in e' identico a quello di prima
 * della fase 52**, e identico a quello del middleware.
 */
function admits(
  declaration: LinkDeclaration,
  isAuthenticated: boolean,
  capabilities: readonly CapabilityKey[],
  liveAssignmentCapabilities: readonly string[] | null
): boolean {
  if (declaration.requireAuth && !isAuthenticated) {
    return false;
  }

  // Role **or** live assignment, read in that order, which is the middleware's
  // own predicate (`src/lib/supabase/middleware.ts`) and the door guard's
  // (`admin/scanner/DoorSurface.tsx`). Not "similar to": the same. A stricter
  // test here would draw no entry for somebody the server then admits; a
  // looser one would draw an entry the server refuses, which is worse, because
  // a refusal happens at the door.
  //
  // `liveAssignmentCapabilities === null` refuses, and that is deliberate:
  // `null` means the payload did not carry the key — one known cause, an
  // unapplied migration — and admitting on an absent key would widen the nav
  // the moment a migration lagged. Empty means asked and answered.
  if (declaration.capability !== null) {
    const heldByRole = capabilities.includes(declaration.capability);
    const heldByAssignment =
      liveAssignmentCapabilities !== null &&
      liveAssignmentCapabilities.includes(declaration.capability);

    if (!heldByRole && !heldByAssignment) {
      return false;
    }
  }

  return true;
}

/** La voce-link con l'indirizzo gia' risolto per chi guarda (D-50-13). */
function toLink(
  declaration: LinkDeclaration,
  isAuthenticated: boolean
): BarEntry {
  // **Questo non e' un controllo d'accesso e non deve diventarlo.** Decide un
  // indirizzo da disegnare, non chi puo' raggiungerlo: `/account` resta
  // protetto da `capability-routes.ts` e dal middleware, e un anonimo che lo
  // scrive a mano viene rimbalzato esattamente come prima.
  const href =
    !isAuthenticated && declaration.hrefWhenAnonymous !== null
      ? declaration.hrefWhenAnonymous
      : declaration.href;

  return {
    kind: "link",
    href,
    label: declaration.label,
    icon: declaration.icon,
  };
}

/**
 * La barra e il pannello, da sessione, ruolo e capability — una funzione pura.
 *
 * ── Gli esiti, riscritti UNA VOLTA ANCORA (fase 52, 52-07) ────────────────
 *
 * **Quarta riscrittura.** La prima (fino alla fase 50) contava tre schede per
 * l'anonimo e distingueva quattro righe per stato di approvazione; la seconda
 * (50-06) tolse `Home` e le tre righe dello stato; la terza (50-09) tolse il
 * parametro che le produceva. Questa riscrive la barra intera: quattro voci per
 * chi lavora, il pannello per il resto (D-52-01..05, D-52-24). Un docblock che
 * descrive un esito che non si verifica piu' e' peggio di un docblock assente,
 * perche' chi lo legge ci costruisce sopra invece di andare a guardare.
 *
 * | Soggetto | Barra, in quest'ordine | Pannello |
 * |---|---|---|
 * | anonimo | Events · Account (→ `/login`) | — |
 * | `attendee` | Events · Account | — |
 * | `staff` non assegnato | Events · TASK · Management | Account · Gallery |
 * | `staff` assegnato a una serata in corso | Events · Check-in · TASK · Management | Account · Gallery |
 * | `organizer` | Events · Check-in · TASK · Management | 9 strumenti + Gallery + Account |
 * | `master` | Events · Check-in · TASK · Management | 10 strumenti + Gallery + Account |
 * | contesto fallito | Events · Account (→ `/login`) | — |
 *
 * **Il contesto fallito non arriva qui come un ruolo.** `getAccessContext()`
 * **lancia** con la categoria `capabilities.resolve_failed` quando
 * `my_access_context` fallisce, e il middleware chiude (ramo fail-closed di
 * `middleware.ts`): nessun mount disegna la barra con capability inventate.
 * L'unica forma in cui un contesto vuoto raggiunge questa funzione e'
 * `role === null` con insiemi vuoti — l'anonimo — e produce la riga
 * dell'anonimo. **Fail closed per costruzione**, coerente col middleware: meno
 * voci, mai di piu'.
 *
 * **Una conseguenza da leggere prima di chiamarla un difetto.** La riga dello
 * `staff` vale dove la chiave `gallery.view` esiste. In un database dove non
 * esiste ancora — la produzione fino al piano 52-15 — uno `staff` non tiene
 * alcuna voce del pannello, quindi il pannello e' vuoto e la sua barra e'
 * **Events · TASK · Account**. E' la derivazione che si comporta bene, non una
 * voce persa: la presenza del pannello discende dalle capability, e chi non ne
 * ha non riceve un pannello con il solo Account.
 *
 * **Cosa NON e' cambiato, e va tenuto contro la riparazione sbagliata.** Il
 * ramo delle capability di Check-in e' intatto (`admits`): ruolo **o**
 * assegnazione viva, `null` che rifiuta — lo **stesso predicato del
 * middleware**. Aggiungere qui un controllo di qualunque tipo sulla porta e' la
 * riparazione che chiude la porta.
 *
 * **La barra si filtra su tre cose, ed e' l'elenco intero** (D-50-09):
 * sessione, ruolo, capability. Il ruolo decide TASK; le capability decidono
 * Check-in e il pannello; la sessione decide l'indirizzo di Account. Un quarto
 * criterio qui dentro e' una decisione d'accesso, non una rifinitura — e la
 * presenza del pannello, che potrebbe sembrarlo, e' derivata (D-52-04).
 *
 * **Decide la visibilita', mai l'accesso.** Ogni voce disegnata ha la sua riga
 * nella mappa e la sua guardia; una voce assente non protegge niente. *Hiding a
 * nav item is not protecting a route* (`staff-tabs.ts`, `access-gating.md`).
 *
 * ── The mount count, corrected because the stale one was load-bearing
 *
 * This docblock used to put the navigation's mount count at **44**, and that
 * number was the reason given for *not* changing this signature. **Measured:
 * 13 mount sites**, after plan 34-05 folded every work surface into a single
 * mount; re-measured after Phase 42 and again in phase 50, **still 13**. All
 * thirteen call `getAccessContext()`, which is the premise the paragraph on the
 * failed context above rests on.
 *
 * @param capabilities the keys the subject holds by role
 * @param liveAssignmentCapabilities the coarser set held by a live per-night
 *   assignment, or `null` when the payload did not carry the key. **Both are
 *   required**: all 13 `<AppNav>` mount sites pass them, so a fourteenth
 *   that forgets is a build error naming the file.
 */
export function getNavigation(
  role: UserRole | null,
  capabilities: readonly CapabilityKey[],
  liveAssignmentCapabilities: readonly string[] | null
): Navigation {
  const isAuthenticated = role !== null;
  const panel = panelFor(capabilities);
  const bar: BarEntry[] = [toLink(EVENTS, isAuthenticated)];

  if (
    admits(CHECK_IN, isAuthenticated, capabilities, liveAssignmentCapabilities)
  ) {
    bar.push(toLink(CHECK_IN, isAuthenticated));
  }

  if (role !== null && (TASK_ROLES as readonly UserRole[]).includes(role)) {
    bar.push(TASK);
  }

  bar.push(panel.length > 0 ? MANAGEMENT : toLink(ACCOUNT, isAuthenticated));

  return { bar, panel };
}

// ── PONTE TEMPORANEO, vive un commit solo (piano 52-07, task 1 → task 2) ────
//
// `AppNav` importa ancora il nome del filtro di prima; il task 2 dello stesso
// piano lo passa a `getNavigation` e toglie questa funzione. Esiste solo perche'
// ogni commit del piano compili da solo. Restituisce le sole voci-link: fra i
// due commit la barra non disegna TASK ne' Management.
export function getVisibleNavItems(
  role: UserRole | null,
  capabilities: readonly CapabilityKey[],
  liveAssignmentCapabilities: readonly string[] | null
): Extract<BarEntry, { kind: "link" }>[] {
  return getNavigation(role, capabilities, liveAssignmentCapabilities).bar.filter(
    (entry): entry is Extract<BarEntry, { kind: "link" }> => entry.kind === "link"
  );
}
