import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/capabilities/server";
import AppNav from "@/components/layout/AppNav";
import AnimatedSection from "@/components/motion/AnimatedSection";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import LogoutButton from "@/components/auth/LogoutButton";
import ResetPasswordButton from "@/components/auth/ResetPasswordButton";
import ChangeEmailButton from "@/components/auth/ChangeEmailButton";
import CollapsibleSection from "@/components/account/CollapsibleSection";
import PostHogIdentify from "@/components/analytics/PostHogIdentify";
import type { UserRole } from "@/types/database";

/**
 * La pagina dell'account — convertita dal piano 41.2-13, spostata qui dal
 * piano 51-06.
 *
 * ── L'indirizzo e' cambiato, e il vecchio non e' morto ──────────────────────
 *
 * Questo file stava a `/dashboard` (D-51-09b, 2026-09-22). Il vecchio indirizzo
 * **resta servito**: `next.config.ts` ne fa un 308 verso qui, e la ragione e'
 * scritta li' accanto alla voce. Due conseguenze che chi legge questo file deve
 * sapere senza andarle a scoprire:
 *
 *   1. I circa quaranta rifiuti delle superfici di lavoro sotto
 *      `src/app/(admin)/admin/(work)/` continuano a scrivere il vecchio
 *      indirizzo, **e non sono stati toccati**: il `source` di un redirect
 *      dichiarato in `next.config.ts` resta dentro l'union di `typedRoutes`,
 *      quindi quelle chiamate compilano e restano un rifiuto solo, non quaranta
 *      modifiche in un piano che sposta una pagina.
 *   2. Un 308 lo memorizza il browser. Chi ha aperto il vecchio indirizzo anche
 *      una sola volta arrivera' qui **dalla propria cache**, anche se un giorno
 *      si volesse tornare indietro. Disposizione `accept` (`T-51-24`), la stessa
 *      proprieta' che la fase 50 ha registrato in `T-50-28`.
 *
 * ── Cosa questa pagina mostra oggi, e cosa non mostra piu' (D-51-09) ────────
 *
 * **I biglietti, e nient'altro che sia un possesso.** Le serate in arrivo
 * aperte, quelle passate dentro una sezione chiusa; poi il cambio email, il
 * cambio password e l'uscita. Sono usciti da qui, in questo stesso commit, i
 * token del bar e **la lettura che li alimentava**: una lettura che non disegna
 * piu' nulla e' peso sul percorso, non una cosa innocua, ed era un giro in rete
 * a ogni apertura di questa pagina.
 *
 * Il nome della tabella **non e' scritto qui**, e non e' pedanteria: un `grep`
 * di quel nome su un file di pagina risponde alla domanda *«questa pagina legge
 * quella tabella?»*, e un necrologio in un commento risponderebbe **«si'»** a
 * chi legge di fretta, per sempre. E' la stessa disciplina che il piano 51-04
 * ha applicato agli elenchi d'accesso; `git log -S` ha il nome per chi serve.
 *
 * Chi ha comprato un token lo redime dalla pagina della serata, che e' il posto
 * dove si e' comprato e dove si e' al momento di bere; questa pagina non era
 * l'unica strada verso di lui e non era nemmeno la piu' breve.
 *
 * **La sezione degli strumenti di gestione non c'e' piu'.** La fase 51 la lasciava qui
 * di proposito, dicendo che l'avrebbe tolta NAV-03 nella fase 52: **NAV-03 l'ha
 * tolta il 2026-09-23, fase 52** (piano 52-07), e il componente che la
 * disegnava e' stato cancellato con lei. Le stesse voci — piu' Gallery e questa
 * pagina — stanno nel **pannello Management della barra** (`AppNav`, D-52-09),
 * costruito da `getNavigation` in `src/lib/rbac/roles.ts` sullo stesso
 * `visibleStaffTabs`. Management vive in un posto solo; una seconda lista qui
 * sarebbe il secondo autore di un menu, cioe' come un menu comincia a
 * divergere.
 *
 * ── What changed, and the one thing that deliberately did not ────────────────
 *
 * The layout: the shell owns the maximum, the gutter and the navigation
 * clearance; the title carries the display role; the page's own root, its
 * header padding and its repeated inline gutter are gone. This is also the
 * surface's move off the phone-locked navigation wrapper onto the responsive
 * form, which is why the wrapper below the shell DECLARES the leading-edge
 * column clearance — see the comment at the declaration itself.
 *
 * **Width is `default`, and `wide` was DEFERRED rather than rejected.** This
 * was the second candidate considered for the wide form (D-41.2-02); the two
 * §4 lists stayed closed for the phase and the reversal is one word in the
 * shell's call below. A reader arriving later should see a deferral, not an
 * absence of thought.
 *
 * ── Width may change layout, never membership ────────────────────────────────
 *
 * `41-UI-SPEC.md` §0 rule 5, and on an account's own dashboard it is the
 * product rather than a formality: what somebody can see here IS what the
 * product promises them. The navigation receives **the same four props, in the
 * same order**, that the phone-locked wrapper received — the server still
 * decides which entries exist and CSS still decides only how they sit. **No
 * capability check is touched** by the conversion: `getAccessContext()` is
 * byte-identical to what the conversion found. (So was the tab filter this page
 * called for its management-tools section, until NAV-03 removed the section in
 * phase 52; the filter now runs inside the navigation, on the same keys.)
 *
 * ── The third predicate this paragraph used to name is gone (phase 50) ───────
 *
 * It was the status predicate — *is this account pending or rejected* — and the
 * sentence above promised it byte-identical. **Its name is not spelled here on
 * purpose**, the same discipline plan 50-07 applied to four comments of its own:
 * this phase's acceptance criteria are greps over `src/`, and a comment that
 * recites the identifier it has just deleted keeps the grep red for a reason
 * that is not a surviving caller. The fact is recorded; the token is not.
 * Phase 50 removes the status axis from profiles (REG-02):
 * there is no `pending` and no `rejected` to test, so the predicate and the
 * whole branch it selected — the «Your account is pending approval» panel and
 * the three cards under it — are gone (D-50-15). **The promise of byte-identity
 * belonged to the conversion, not to this file forever**, and a docblock that
 * still described a predicate nobody can find is a docblock that lies; it is
 * corrected here rather than left to be discovered by grep.
 *
 * ── What this conversion did NOT open ────────────────────────────────────────
 *
 * The media section and the account and authentication controls belong to plan
 * 41.2-14, which runs beside this one. **The referral control was converted
 * earlier as spine, by plan 41.2-07 in wave 3**, precisely so `/membership-card`
 * and this surface stayed two plans instead of being merged into one; and the
 * four shared money-core files were converted by plan 41.2-10 in wave 5 for the
 * same reason. None of the six is opened here.
 *
 * ── The five notices keep their sentences, and every one of them ─────────────
 *
 * The amber tints below became the declared warning semantic. **Not one word of
 * any notice is rewritten**, no two collapse, and the flag that prints a raw
 * server value still prints it verbatim. That was already this file's own rule
 * — it is stated at length above each flag — and a visual conversion is not
 * where a product decides what it tells somebody it has just refused.
 */

// L'etichetta del ruolo e' esaustiva per tipo: un quinto ruolo senza voce e' un
// errore di build, non un'altra ricaduta silenziosa su «Attendee» (difetto 2 di 52-ESITI.md).
const ROLE_LABEL: Record<UserRole, string> = {
  master: "Admin",
  organizer: "Organizer",
  staff: "Staff",
  attendee: "Attendee",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ── The flags that land HERE, and why they are read in one place ────────────
  //
  // This page is where several degraded paths deposit the person, each
  // carrying its reason in the URL. A flag that nothing renders is a **silent
  // failure with a URL**: the person is bounced, the reason is right there in
  // the address bar, and the screen says nothing. In a product with no error
  // tracking that is the recorded newsletter defect wearing a query string —
  // and worse than the newsletter's, because here the diagnosis already exists
  // and is simply not drawn.
  //
  // So they are read together, drawn together, and each keeps its own sentence.
  // No two collapse.
  const params = await searchParams;
  const readParam = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : null;

  // ── `?access=`, which now carries THREE causes and never collapses them ─────
  //
  // WR-04 is closed on this surface and stays closed: every value below is
  // rendered, none is merely read.
  //
  // `bounceToAccount()` in `src/lib/supabase/middleware.ts` sets one of three
  // values, decided by position, or no parameter at all. Each gets its own
  // sentence below, and the sentences say **what to do**, not only what
  // happened: the person reading one of them may be standing at a door at two
  // in the morning, and "an error occurred" is worth nothing there. None of
  // them names a migration or a table — that is the vocabulary of whoever
  // maintains this, not of whoever is refused by it.
  //
  // A value that is none of the three renders **nothing**. A query string is
  // attacker-supplied input, and a notice drawn from an invented value would be
  // an authoritative-looking sentence written by whoever sent the link.
  const accessCause = readParam(params.access);

  // The lookup itself failed. NOT a refusal: a refusal bounces here with no
  // parameter at all. Keeping the two distinguishable is the whole point; the
  // recorded newsletter defect collapsed a network fault, a missing key and an
  // already-subscribed address into one "Qualcosa è andato storto" and made all
  // three undebuggable for the user and for whoever maintains it.
  const accessUnavailable = accessCause === "unavailable";

  // The context resolved, but it did not carry tonight's assignments — so the
  // question *"is this person working tonight"* could not be asked at all. It
  // has one known cause and it is a configuration one, which is why the notice
  // says so instead of implying a decision about the account. It is emphatically
  // **not** the same sentence as the one below: telling somebody who is on
  // tonight's rota that they are not assigned is the refusal this product has
  // decided it will not manufacture.
  const accessContextStale = accessCause === "context-stale";

  // Assignments exist and none of them opens the page that was asked for.
  // Also not a fault, and also not "you have no business here": it is a real
  // answer about a real assignment, and the way out is a person, named.
  const accessNotAssignedHere = accessCause === "not-assigned-here";

  // `?link=refused` is set by `src/app/api/auth/callback/route.ts` (plan 43-04)
  // when the `next` target of a sign-in link was not on its allow-list and the
  // default was substituted. It always lands here, because the default IS this
  // page.
  //
  // It matters more than it looks. The person followed a link that promised to
  // take them somewhere — most often the page where a new account sets its
  // password — and arrived at their account page instead. Without this notice
  // the only thing they can conclude is that the link did not work, which is
  // wrong: the
  // link worked, and it is the destination that was refused. Somebody who has
  // just been given an account and cannot find the password field will ask for
  // a second invitation, and the second one will do exactly the same thing.
  const linkRefused = readParam(params.link) === "refused";

  // `?master=` is set by the auth callback when reconciling the configured
  // master account did not go as expected at sign-in (plan 43-12).
  //
  // ── Why this one is drawn by PRESENCE and prints its raw value ─────────────
  //
  // The other two are matched against a value read from the code that sets it.
  // This one is not: the emitting file belongs to another plan running in
  // parallel and its value vocabulary was not readable from here. Inventing the
  // values would be worse than not handling the flag at all — a renderer keyed
  // on guessed strings stays mute AND looks handled, so the next reader stops
  // looking.
  //
  // So the CATEGORY is named, which is known, and the exact value is printed
  // verbatim, which is honest. It is the same rule this phase applies to an
  // unrecognised failure detail on the members surface: name the category, show
  // the word the server used, never invent a sentence for it. When 43-12's
  // vocabulary is on record, this gains one sentence per value — and until then
  // the flag is visible instead of mute.
  const masterFlag = readParam(params.master);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    // Il codice socio e' uscito da questa `select` (D-51-02): dopo il piano
    // 51-06 nessun blocco della pagina lo rende, la colonna cade col piano
    // 51-12, e una lettura che non alimenta nulla non e' innocua — e' peso su
    // un percorso, e una colonna in piu' dentro il messaggio d'errore che
    // Postgres restituisce quando una riga viene rifiutata.
    .select("role, created_at")
    .eq("id", user.id)
    .single();

  const userEmail = user.email ?? "";
  const accountSince = profile?.created_at
    ? (() => {
        const d = new Date(profile.created_at);
        const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        return `${M[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : null;

  const roleLabel = ROLE_LABEL[(profile?.role as UserRole | null | undefined) ?? "attendee"];
  const fullName = user.user_metadata?.full_name || roleLabel;

  // Fetch user's tickets (only for attendees — admin/organizer don't buy tickets)
  //
  // ── Il ramo e' lo stesso, con un nome diverso (D-51-06) ────────────────────
  //
  // La condizione ha sempre avuto due modi di essere vera: nessun ruolo letto,
  // oppure il ruolo di chi partecipa. Restano due, e nello stesso ordine —
  // cambia solo come si scrive il secondo. Chi arriva senza riga di profilo
  // cade nel primo modo esattamente come prima, e la lista che vede la
  // interroga il suo client sotto le stesse policy di ieri: questo piano non
  // ne tocca nessuna.
  const isAttendeeRole = !profile?.role || profile.role === "attendee";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tickets: any[] | null = null;
  if (isAttendeeRole) {
    const { data } = await supabase
      .from("tickets")
      .select(
        "id, amount_paid, created_at, party_id, events(title, date, slug, cover_image), ticket_tiers(name), event_parties(title, date, time)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    tickets = data;
  }

  // ── I TOKEN DEL BAR SONO USCITI DA QUESTA PAGINA — D-51-09, 2026-09-22 ────
  //
  // Qui stava la lettura che li raggruppava per serata, e sotto si montava la
  // lista. Sono usciti **insieme**: il componente e' cancellato, la lettura non
  // si fa piu', e nessuno dei due e' stato lasciato a girare "tanto non costa".
  // Era un giro in rete a ogni apertura di questa pagina per costruire una
  // lista che nessuno disegna.
  //
  // **Non si perde una strada, si perde una scorciatoia.** Un token si redime
  // dalla pagina della serata — dove lo si e' comprato, e dove si e' al momento
  // di berlo — e quella pagina non e' cambiata. Questa non era ne' l'unica via
  // ne' la piu' breve.
  //
  // Il nome della tabella non e' scritto qui, per la ragione gia' data nel
  // docblock in testa al file.

  // ── LA LETTURA DEI PROPRI MEDIA E' USCITA CON LA SEZIONE CHE LA MOSTRAVA ───
  //
  // Trentotto righe: una `select` su `event_media` per `uploaded_by`, e il
  // raggruppamento per serata che alimentava la sezione dei propri media. Sono uscite
  // insieme al mount — D-50-03, il caricamento e' di organizer e staff — e non
  // sono state lasciate a girare "tanto non costa": era un giro in rete a ogni
  // apertura di questa pagina per costruire una lista che nessuno disegna piu'.
  //
  // `status` qui era **`event_media.status`**, la moderazione, una tabella
  // diversa da `profiles`: non e' la colonna che questa fase cancella. Se la
  // sezione tornera' — per una superficie di lavoro, non per un membro — la
  // lettura si riscrive li', dove si vede.

  // Separate upcoming vs past tickets
  const now = new Date().toISOString().split("T")[0];
  const upcomingTickets = (tickets ?? []).filter((t) => {
    const evt = Array.isArray(t.events) ? t.events[0] : t.events;
    return evt && (evt as { date: string }).date >= now;
  });
  const pastTickets = (tickets ?? []).filter((t) => {
    const evt = Array.isArray(t.events) ? t.events[0] : t.events;
    return evt && (evt as { date: string }).date < now;
  });

  // ── LE DUE LISTE ERANO GIA' SEPARATE, E ORA SI VEDONO SEPARATE ─────────────
  //
  // Fino al 2026-09-22 venivano ricongiunte in una lista sola — le passate in
  // coda alle prossime, distinte dalla sola opacita'. D-51-09 chiede che le
  // passate stiano **in una sezione chiusa**, e la separazione non e' costata
  // una query ne' un criterio nuovo: le due liste esistevano gia' qui sopra, e
  // cio' che e' cambiato e' solo come si disegnano.
  //
  // **Il conto dell'assenza si fa sulla somma, non su una lista ricongiunta.**
  // Entrambi i filtri scartano un biglietto la cui serata non si risolve, quindi
  // «nessun biglietto» significa *nessuna delle due ne ha*, e non *la tabella e'
  // vuota*: chi avesse un biglietto orfano vedrebbe lo stato vuoto, esattamente
  // come prima, e questo non e' un cambio introdotto qui.
  const hasAnyTicket = upcomingTickets.length + pastTickets.length > 0;

  // La riga di un biglietto, scritta una volta e usata dalle due liste.
  //
  // Prima esisteva una sola volta perche' esisteva una sola lista. Dividendo
  // la resa in due, ricopiarla sarebbe stato il modo piu' rapido per farle
  // divergere al primo ritocco — e una riga di biglietto che si comporta
  // diversamente a seconda della sezione e' un difetto che si nota solo dopo
  // averne fatto uno.
  //
  // `isUpcoming` **resta calcolato dalla data**, non dedotto dalla sezione che
  // sta disegnando: la lista viene dal filtro qui sopra, e leggere la data e'
  // cio' che tiene il distintivo e l'opacita' d'accordo con essa.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTicketRow = (ticket: any) => {
    const evt = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
    const tier = Array.isArray(ticket.ticket_tiers)
      ? ticket.ticket_tiers[0]
      : ticket.ticket_tiers;
    const eventData = evt as {
      title: string;
      date: string;
      slug: string;
      cover_image: string | null;
    } | null;
    const tierData = tier as { name: string } | null;
    const isUpcoming = eventData ? eventData.date >= now : false;

    return (
      <Link
        key={ticket.id}
        href={`/tickets/${ticket.id}`}
        className="block min-h-11"
      >
        <Card
          className={`px-4 py-4 transition-all hover:border-accent/50 active:scale-[0.98] active:opacity-80 ${
            !isUpcoming ? "opacity-60" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
              {eventData?.cover_image ? (
                <Image
                  src={eventData.cover_image}
                  alt={eventData.title ?? ""}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent/30 to-accent/10" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-ink truncate">
                  {eventData?.title ?? "Event"}
                </p>
                {/*
                  Two marks that state and cannot be operated, so both are
                  Badges. They lose a green and an accent respectively:
                  D-41.1-25 refuses a tone per outcome, and each word already
                  carried the whole of its own meaning.
                */}
                {isUpcoming && <Badge className="shrink-0">Upcoming</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {tierData?.name && <Badge>{tierData.name}</Badge>}
                <span className="text-xs text-muted">
                  {eventData
                    ? (() => {
                        const d = new Date(eventData.date + "T00:00:00");
                        const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                        return `${d.getDate()} ${M[d.getMonth()]}`;
                      })()
                    : ""}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-muted">&#8250;</span>
          </div>
        </Card>
      </Link>
    );
  };

  // Role and the resolved capability set, from the SESSION. Only the
  // source changed; l'approvazione che stava fra i due e' uscita con l'asse
  // (fase 50), e il suo ultimo lettore era la barra. `capabilities` is read for
  // one thing only — the navigation's props — and it crosses to the client as
  // an array, because a `Set` is not serialisable across the boundary. (Until
  // phase 52 it was also read to decide whether this page drew its Management
  // Tools section; NAV-03 moved those links into the bar's panel.)
  const { capabilities, role, liveAssignmentCapabilities } =
    await getAccessContext();

  // ── Qui stava il predicato della sezione degli strumenti ────────────────
  //
  // Chiedeva *la sezione disegnerebbe qualcosa?* sullo stesso filtro delle tab
  // che legge il middleware (STAFF-03, fase 34), e prima ancora era un
  // confronto a mano sul ruolo. **La sezione e' uscita con NAV-03 (fase 52,
  // 2026-09-23)** e il predicato con lei: la stessa domanda la pone ora
  // `getNavigation`, per decidere se in barra compare Management o Account
  // (D-52-04). Nascondere quella sezione non ha mai protetto `/admin/*`: lo
  // fanno il middleware e la guardia di ogni pagina, e sui dati la RLS.

  return (
    <>
      {/*
        This wrapper is the other half of the pairing check E of
        scripts/verify-conversion.mjs asserts in both directions: the files
        declaring the leading-edge column clearance are exactly the files
        mounting the responsive navigation form. It wraps the SHELL, and the
        navigation is its SIBLING below — putting the navigation inside would
        still satisfy the textual pairing while padding the column by its own
        clearance.

        It carries an arbitrary-property utility at the md tier setting
        --nav-inset-inline-start to fourteen rems, which the shell below reads
        with its own inline-start padding. Since D-41.1-01 the stylesheet's
        ambient value is zero at every width, so without this line the content
        would slide UNDER the 224 px column from 768 px up — the loud failure
        direction, which is why the declaration and the mount land in one commit.

        The utility is written whole in the class list and is not spelled here:
        Tailwind scans comments, cannot tell a description from a use, and an
        abbreviated one emits a malformed rule and a build warning (DEF-41-01).
      */}
      <div className="md:[--nav-inset-inline-start:14rem]">
        <PageShell width="default">
          <PostHogIdentify
            userId={user.id}
            email={userEmail}
            role={role ?? "attendee"}
          />
          <AnimatedSection>
            <header className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted">Hey,</p>
                  <PageTitle>{fullName}</PageTitle>
                </div>
                {/*
                  The role mark states something and cannot be operated, so it is a
                  Badge and not a Chip — Chip.tsx's own sentence. It loses the
                  accent fill deliberately: §5.1 reserves the accent for four things
                  and names a state signal among the ones it is never for, and the
                  word itself was always the channel that carried the meaning.
                */}
                <Badge className="mt-2 shrink-0">{roleLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted truncate">{userEmail}</p>
              {accountSince && (
                <p className="text-xs text-muted/60">{roleLabel} since {accountSince}</p>
              )}
            </header>
          </AnimatedSection>

          <AnimatedSection delay={0.1} className="flex flex-col gap-4">
            {/*
              The five notices below were raw amber tints; they are the declared
              warning semantic now. The box, its radius and its padding are
              unchanged, the alert role each already carried is unchanged, and not
              one sentence is rewritten: this is the ink, and the words are a
              decision somebody else already took.
            */}
            {accessUnavailable && (
              <div
                role="status"
                className="rounded-2xl border border-sem-warn/40 bg-sem-warn/10 p-4"
              >
                <p className="text-sm font-semibold text-sem-warn">
                  We couldn&apos;t check your permissions just now
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  This is a temporary problem on our side, not a decision about your
                  account. Nothing has changed about what you have access to. Please
                  try again in a moment.
                </p>
              </div>
            )}

            {accessContextStale && (
              <div
                role="status"
                className="rounded-2xl border border-sem-warn/40 bg-sem-warn/10 p-4"
              >
                <p className="text-sm font-semibold text-sem-warn">
                  We couldn&apos;t check tonight&apos;s assignments
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  You were sent here because this app could not read who is assigned
                  to work tonight — so it could not tell whether you are. That is a
                  configuration problem on our side, not a decision about your
                  account, and nothing about your access has changed. If you are due
                  to work a door or a night, tell whoever set that night up:
                  retrying will land you in the same place until it is fixed.
                </p>
              </div>
            )}

            {accessNotAssignedHere && (
              <div
                role="status"
                className="rounded-2xl border border-sem-warn/40 bg-sem-warn/10 p-4"
              >
                <p className="text-sm font-semibold text-sem-warn">
                  You are assigned — but not to that
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  Nothing is wrong with your account, and you do hold an assignment.
                  It just does not cover the page you asked for: assignments are
                  given one night and one job at a time, so working one night&apos;s
                  door does not open another night, or another job. If this one
                  should be yours, ask the organiser for that night to add it.
                </p>
              </div>
            )}

            {linkRefused && (
              <div
                role="status"
                className="rounded-2xl border border-sem-warn/40 bg-sem-warn/10 p-4"
              >
                <p className="text-sm font-semibold text-sem-warn">
                  Your link worked — but it could not send you where it said
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  You are signed in, and nothing is wrong with your account. The
                  page the link pointed at was not one we allow it to open, so you
                  were brought here instead. If you were opening an invitation in
                  order to set a password, ask whoever invited you to send it again
                  rather than reusing this one — a second copy of the same link will
                  land in the same place.
                </p>
              </div>
            )}

            {masterFlag && (
              <div
                role="status"
                className="rounded-2xl border border-sem-warn/40 bg-sem-warn/10 p-4"
              >
                <p className="text-sm font-semibold text-sem-warn">
                  A check on the owner account did not complete at sign-in
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  You are signed in and your own access is unaffected. This concerns
                  the account that holds the top-level role, and it is shown rather
                  than logged because nothing in this product would tell anybody
                  otherwise. If you are not that person, there is nothing for you to
                  do; if you are, this is worth looking at before the next night.
                </p>
                <p className="mt-2 break-words font-mono text-xs text-muted">
                  {masterFlag}
                </p>
              </div>
            )}
            {/*
              ── QUI STAVA L'AVVISO DI STATO, E NON HA PIU' UN RAMO ───────────

              Il ternario sul predicato di stato — *in attesa oppure rifiutato*
              — divideva questa pagina
              in due dashboard: uno per chi aspettava un'approvazione — pannello
              «Your account is pending approval», scheda dei biglietti, link
              agli eventi, impostazioni — e uno per tutti gli altri. La fase 50
              toglie l'asse dello stato (REG-02): non esiste piu' un `pending`
              ne' un `rejected`, quindi non esiste piu' il primo ramo, e quello
              che resta e' **il secondo, per chiunque abbia un account**
              (D-50-15). Nessun avviso di stato.

              Non si perde niente di cio' che quel ramo faceva per davvero: la
              scheda «Bought a ticket?» esisteva perche' un `pending` poteva
              comprare e non aveva una lista dove ritrovare il biglietto — e la
              lista «My Tickets», che sta qui sotto, e' quella lista.

              Il frammento sotto e' cio' che resta del ramo `else`, e i suoi
              figli **tengono il rientro che avevano**: reindentare centonovanta
              righe avrebbe nascosto dentro un diff di forma la sola cosa che
              questo commit fa davvero, cioe' togliere un avviso.
            */}
            <>
                {/*
                  Qui stava il blocco «My Stuff»: due riquadri, uno verso
                  `/membership-card` e uno verso `/attendance`. La fase 51
                  cancella entrambe le superfici (MEM-01, MEM-02), e con
                  `typedRoutes` un `<Link>` verso una pagina che non esiste piu'
                  non compila: il link e la pagina escono percio' nello stesso
                  commit, e non c'e' modo di dimenticarne uno.

                  Non si perde nulla di cio' che i due riquadri mostravano.
                  «Event History» apriva una superficie che non ha mai letto
                  nulla — un `TODO` e un array vuoto costante — quindi l'unico
                  ramo raggiungibile era «No attendance recorded yet».
                  «Membership Card» rendeva un codice socio che la porta non
                  verifica piu'.

                  Il fragment resta perche' i suoi figli tengono il rientro che
                  avevano, per la stessa ragione scritta sopra.
                */}

                {/* My Tickets — only for attendees */}
                {isAttendeeRole && (
                <div>
                  <SectionHeading>My Tickets</SectionHeading>
                  {/*
                    Aggiunta il 2026-08-22, e dice una cosa sola: la mail non
                    serve. E' la stessa frase che porta `/tickets`, qui perche'
                    questa e' la superficie su cui un membro approvato arriva per
                    prima e l'abitudine da togliere e' «cerco la mail».

                    Non promette un account: dice dove sta il biglietto. Il
                    vincolo dell'acquisto da ospite e' del proprietario,
                    2026-08-22, e una frase che presupponesse una sessione
                    diventerebbe falsa per una parte dei compratori.
                  */}
                  <p className="mb-3 text-sm text-muted">
                    Your tickets live here. You never need to open the email —
                    showing the QR code from the ticket is enough.
                  </p>
                  {/*
                    ── LE PASSATE STANNO IN UNA SEZIONE CHIUSA — D-51-09 ──────

                    Prima era una lista sola: le passate in coda alle prossime,
                    distinte dalla sola opacita'. Chi ha comprato dieci volte
                    doveva scorrere nove serate finite per arrivare a quella di
                    stasera — e quella di stasera e' l'unica che si mostra alla
                    porta.

                    La sezione chiusa e' **quella che la casa ha gia'**,
                    `components/account/CollapsibleSection.tsx`, la stessa che
                    fino alla fase 52 teneva la sezione degli strumenti di
                    gestione qui sotto (uscita con NAV-03): annuncia lo stato con
                    `aria-expanded`, dichiara il pavimento dei 44 px sul
                    controllo e importa l'anello di fuoco. Non ne e' stata
                    scritta una seconda, perche' una seconda diverge dalla
                    prima al primo ritocco.

                    `defaultOpen` **non e' passato**, e il valore di default del
                    componente e' *chiusa*: e' il verso che D-51-09 chiede.
                    La sezione degli strumenti lo passava esplicitamente perche'
                    li' il verso era l'opposto.
                  */}
                  {!hasAnyTicket ? (
                    <Card>
                      <p className="text-sm text-muted/60">No tickets yet</p>
                      <Link
                        href="/events"
                        className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent hover:text-accent-hover"
                      >
                        Discover events &rarr;
                      </Link>
                    </Card>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {upcomingTickets.length > 0 ? (
                        <div className="space-y-2">
                          {upcomingTickets.map(renderTicketRow)}
                        </div>
                      ) : (
                        /*
                          Lo stato vuoto di QUESTA lista, che non e' lo stato
                          vuoto della pagina: qui dei biglietti ci sono, e sono
                          tutti di serate finite. Senza questa frase la persona
                          vedrebbe una sola sezione chiusa intitolata «Past» e
                          dovrebbe aprirla per capire perche' sopra non c'e'
                          niente — un vuoto indistinguibile da un guasto, che e'
                          esattamente lo stato vuoto non disegnato di
                          `nextjs-architecture.md`.
                        */
                        <Card>
                          <p className="text-sm text-muted/60">
                            Nothing coming up
                          </p>
                          <Link
                            href="/events"
                            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent hover:text-accent-hover"
                          >
                            Discover events &rarr;
                          </Link>
                        </Card>
                      )}

                      {pastTickets.length > 0 && (
                        <CollapsibleSection
                          title={`Past (${pastTickets.length})`}
                        >
                          <div className="space-y-2 pb-1">
                            {pastTickets.map(renderTicketRow)}
                          </div>
                        </CollapsibleSection>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/*
                  ── QUI SI MONTAVANO I TOKEN DEL BAR — D-51-09, 2026-09-22 ───

                  La sezione e' uscita insieme alla lettura che la alimentava e
                  al componente che la disegnava: tre cose in un commit solo,
                  perche' lasciarne in piedi una qualsiasi avrebbe lasciato o un
                  import senza componente (build rosso) o una lettura senza
                  disegno (un giro in rete per niente).

                  Cosa resta a chi ha comprato un token: la pagina della serata,
                  che e' dove lo si compra e dove lo si beve. Questa pagina non
                  era ne' l'unica via ne' la piu' breve — e D-51-09 lascia qui i
                  biglietti, che sono l'unica cosa che si deve poter mostrare
                  alla porta.
                */}

                {/*
                  ── «My Media» E' USCITO DAL DASHBOARD — D-50-03, 2026-09-21 ──

                  Qui si montava la sezione dei propri media: le proprie foto, raggruppate
                  per serata, con lo stato di moderazione di ciascuna. Con il
                  caricamento riservato a organizer e staff, un account senza
                  quei titoli non puo' avere righe da mostrare — e il gruppo
                  sarebbe stato vuoto per chiunque apra questa pagina.

                  **Non e' nascosto, e' tolto**: la sezione non si disegna, la
                  lettura di `event_media` che la alimentava non si fa piu', e
                  il componente e' stato cancellato. Chi carica per lavoro
                  rivede i propri file dalle superfici di `admin/`.
                */}

                {/* Settings */}
                <div>
                  <SectionHeading>Settings</SectionHeading>
                  <div className="flex flex-col gap-2">
                    {/* Il secondo dei due controlli del referral stava qui —
                        senza gate, a differenza di quello della membership
                        card. Il referral e' uscito dal prodotto (D-50-08), e
                        i due mount sono usciti insieme: il piano 50-07 possiede
                        il componente, e cancellarlo lasciando in piedi un
                        import e' un build rosso. */}
                    <ChangeEmailButton />
                    <ResetPasswordButton />
                    <LogoutButton />
                  </div>
                </div>

                {/* La sezione degli strumenti di gestione stava qui, sotto Settings. E'
                    uscita con NAV-03 (fase 52, 2026-09-23): le sue voci sono nel
                    pannello Management della barra. */}
            </>
          </AnimatedSection>
        </PageShell>
      </div>

      {/*
        The same four props, in the same order, that the phone-locked wrapper
        received. Only the import specifier and the component name changed —
        which is what "mounting" means to check E's pairing: importing AppNav
        DIRECTLY, not reaching it through the wrapper. No capability check is
        touched, so no navigation entry appears or disappears with the width.
      */}
      <AppNav
        role={role as UserRole | null}
        capabilities={[...capabilities]}
        liveAssignmentCapabilities={
          liveAssignmentCapabilities ? [...liveAssignmentCapabilities] : null
        }
      />
    </>
  );
}
