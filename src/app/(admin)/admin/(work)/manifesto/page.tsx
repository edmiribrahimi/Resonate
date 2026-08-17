import { redirect } from "next/navigation";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { OpenQuestionNotice } from "@/app/(admin)/admin/manifesto/OpenQuestionNotice";
import { SectionStateBadge } from "@/app/(admin)/admin/manifesto/SectionStateBadge";
import { SectionVoid } from "@/app/(admin)/admin/manifesto/SectionVoid";

import type {
  ProductionOpenQuestion,
  ProductionSection,
} from "@/types/database";

/**
 * The sound manifesto — the body of rules that can say it is not written, with
 * the open questions standing beside the rules they bear on.
 *
 * ── Reachability is the map's answer, never this directory's ─────────────────
 *
 * `admin` in the URL is an address, not an authorisation
 * (`nextjs-architecture.md`, gate *il gruppo non autorizza*). What decides is the
 * row `"/admin/manifesto"` under `CAP.PRODUCTION_MANIFESTO_MANAGE` in
 * `src/lib/routes/capability-routes.ts` — **one entry**, read by the middleware,
 * by the guard below and (from plan 45-18) by the staff tab, so the three cannot
 * disagree (D-34-09/D-34-10).
 *
 * ⚠ **That entry moved to the `routes:` branch in the same commit as this
 * file, and the order was forced rather than chosen.** It sat on the map's
 * `scope: "table"` branch from plan 45-05 until now, because until this file
 * existed the key gated rows and no address. A page bound to a table-only key is
 * unreachable **for everyone** — `resolveRoute` returns `null` and the
 * middleware fails closed — with **no build error and nothing in a log**, and
 * this project has no error tracking at all. The asymmetry decides the order: a
 * page on disk with no entry is a build error; an entry whose page is not on
 * disk is silent.
 *
 * ── The middleware is UX. The RLS is the boundary. ──────────────────────────
 *
 * The map decides where a **redirect** happens: it stops somebody arriving here.
 * It stops nobody reading a `production_section` row. The boundary is the
 * `SELECT` policies of `20260817120300_production_sections_access.sql`, each
 * asking `private.has_capability('production.manifesto.manage')`, applied to
 * production by plan 45-08.
 *
 * **Which is why both reads below go through the cookie-bound client**, and why
 * this file constructs no service client. A read that bypasses the policy proves
 * nothing about the policy, and the policy is the fourth reader this phase's
 * criterion 4 is about. A page that fetched with the service key would render
 * identically for a subject the database had already refused.
 *
 * ── This section is EMPTY today, and that is the state it ships in ──────────
 *
 * The tables were applied to production on 2026-08-17 (plan 45-08) and hold no
 * rows: **writing them is plan 45-15**, and this page has no write path of its
 * own — no form, no action, no control. So the ordinary first render is the
 * empty state, and the empty state says which emptiness it is rather than
 * looking like a body of rules that came back short.
 *
 * ⚠ **And it invents nothing to fill the wait.** There is no sample section, no
 * placeholder manifesto and no example of what one would say. `sound-manifesto.md`
 * is explicit that inventing strata, tempi or reference artists writes the brand
 * on behalf of whoever owns it, and a placeholder that reached a brief would do
 * exactly that. The only prose on an empty page is prose about the emptiness.
 *
 * ── Three states, three different renderings ────────────────────────────────
 *
 *   * **written** — the body, as written;
 *   * **coordinates declared** — the body, introduced by a line that says the
 *     manifesto itself is not written and that what follows binds anyway. There
 *     is deliberately **no separate column for the negatives**: a column for
 *     exclusions invites a surface that draws the positives and drops them, and
 *     `sound-manifesto.md` is explicit that a negative fact is a decision as much
 *     as an inclusion and is reported rather than re-derived;
 *   * **not decided** — `SectionVoid`, which draws what is missing and whose call
 *     it is as the content of the panel.
 *
 * ── The questions travel with the rules, not to a footer ────────────────────
 *
 * A question is drawn beside the section it bears on. What is left over — a
 * question about the brand rather than about one format, or one whose format has
 * no section row yet — is drawn in a register **above** the sections rather than
 * below them, because a warning under the fold is a warning that only reaches
 * whoever scrolled. Nothing is dropped: the remainder is computed rather than
 * assumed, so a question can never fall between the two renderings.
 */
export default async function AdminManifestoPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request, so
  // this second ask costs no round trip. The page keeps its own guard: the
  // middleware and the page give the same verdict because they read the same
  // entry (D-34-09), and a page that stops asking is a page protected by a
  // redirect alone.
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_MANIFESTO_MANAGE)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  /*
    TWO READS, AND EVERY EMBED CHECKED AGAINST ITS FOREIGN KEYS.

    An embed through a table that has MORE THAN ONE relationship to the embedded
    table is answered by PostgREST with `HTTP 300 PGRST201`, and the failure is
    SILENT through this client: `data` comes back null with no exception thrown,
    and the page renders nothing. The measured precedent in this repository is an
    unqualified embed of `party_series` through `event_parties`. On this surface
    that failure mode is worse than usual, because *this section is empty* is
    ALSO the true state today — an ambiguous embed here would be
    indistinguishable from plan 45-15 not having run.

    So both were read out of `20260817120200_production_sections.sql` rather than
    assumed:

      production_section       → formats   ONE FK, `format_id`
      production_open_question → formats   ONE FK, `format_id`

    and no junction table carries foreign keys to both sides of either, so
    neither can be read as a many-to-many. `updated_by` points at
    `public.profiles` and is deliberately not embedded: who last edited a rule is
    a different question with a different audience, and this surface does not ask
    it.
  */
  const { data: sectionRows, error: sectionError } = await supabase
    .from("production_section")
    .select(
      `id, section, format_id, title, state, body, missing, decision_owner,
       formats ( name )`
    )
    .eq("section", "manifesto")
    .order("title", { ascending: true });

  /*
    THE REGISTER, AND WHY THE `IS NULL` ARM IS NOT AN OVERSIGHT.

    `production_open_question.section` is nullable **and carries no vocabulary
    CHECK**, deliberately: a question can bear on the whole brand rather than on
    one body of rules — the spelling, the grid-safe square, the order of
    publication — and filing those under a section would be filing one rule in
    two places.

    So the arm is `section = 'manifesto' OR section IS NULL`. Reading only the
    first would silently drop the register's **most general entries**, which are
    precisely the ones nobody else is going to raise: a question that belongs to
    no single piece has no other surface to appear on.

    `closed_at IS NULL` is the second arm and it is not a tidying either. The
    database enforces closed-and-resolution as both-or-neither, so a closed row
    carries the answer; a register that kept warning about questions somebody has
    already settled is a register whose warnings stop being read — the same
    reason D-45-15 refuses to let any of these block anything.

    Oldest first: the longest a question has been open is the most useful thing
    about it after the question itself.
  */
  const { data: questionRows, error: questionError } = await supabase
    .from("production_open_question")
    .select(
      `id, question, decision_owner, section, format_id,
       formats ( name )`
    )
    .or("section.eq.manifesto,section.is.null")
    .is("closed_at", null)
    .order("opened_at", { ascending: true });

  /*
    THREE OUTCOMES, NEVER TWO (OBS-03).

    Rows returned; zero rows; and THE READ ITSELF FAILED. The third gets its own
    sentence and never the empty state, because *nothing has been written yet*
    and *we could not read what was written* have different next steps — and on
    this section the first of those two is TRUE TODAY, which makes the pair
    especially easy to confuse. This repository has no error tracking at all, so
    a failure that is only logged reaches nobody: the sentence on the screen IS
    the observable effect.

    The two reads fail separately and are reported separately. A single sentence
    covering both would be the `catch` shape this repository has already paid for
    once — the newsletter form answering a network fault, a missing key and a
    duplicate address with the same words (`meta-gates.md`).

    `error.code` and `error.message` only. Never the error object, and never
    PostgREST's third field, which carries the rejected row — and a rejected row
    here carries authored prose that is not ready to leave the perimeter.
  */
  if (sectionError) {
    console.error(
      `[manifesto.sections_read_failed] code=${sectionError.code} message=${sectionError.message}`
    );
    return (
      <ManifestoReadFailed what="the manifesto" reload="Reload the page; nothing in the data has changed." />
    );
  }

  if (questionError) {
    console.error(
      `[manifesto.questions_read_failed] code=${questionError.code} message=${questionError.message}`
    );
    return (
      <ManifestoReadFailed
        what="the register of open questions"
        reload="The rules were not drawn either, deliberately: a manifesto shown without its outstanding questions is a manifesto that looks settled."
      />
    );
  }

  /*
    `as unknown as`, and it is not a shortcut past a real check.

    No client here is parameterised with `Database`, so supabase-js types a
    select string it cannot resolve against a schema by assuming every embed is
    a to-MANY relation: it offers `formats: { name: any }[]`. PostgREST returns
    an OBJECT for a to-one embed, which is what both of these are — one FK each,
    derived above from the migration. The compiler's guess and the wire format
    disagree, and the wire format is the one the page renders.

    So the double assertion is the honest form: it says out loud that nothing is
    being checked here, where a single `as` would have implied an overlap the
    compiler had verified. Same escape hatch, same reason, as
    `(work)/location/[id]/page.tsx:237`.
  */
  const sections = (sectionRows ?? []) as unknown as SectionSelectRow[];
  const questions = (questionRows ?? []) as unknown as QuestionSelectRow[];

  /*
    Which question belongs beside which section, and what is left over.

    A question is drawn beside a section when they name the same format. The
    leftovers are everything else — a question about the brand rather than about
    one format, and a question whose format has no section row yet — and they are
    computed as a REMAINDER rather than as a second filter, so no question can
    fall between the two renderings by matching neither predicate.
  */
  const formatsWithASection = new Set(
    sections.map((row) => row.format_id).filter((id): id is string => id !== null)
  );

  const attached = (formatId: string | null) =>
    questions.filter((question) => question.format_id === formatId);

  const general = questions.filter(
    (question) =>
      question.format_id === null || !formatsWithASection.has(question.format_id)
  );

  return (
    <PageShell>
      <header className="pb-6">
        <PageTitle>Sound manifesto</PageTitle>
        <WhatIsNotWrittenHere />
      </header>

      {general.length > 0 ? (
        <section className="pb-6">
          <SectionHeading>Open across the manifesto</SectionHeading>
          <div className="space-y-3">
            {general.map((question) => (
              <OpenQuestionNotice
                key={question.id}
                question={question.question}
                decisionOwner={question.decision_owner}
                scope={question.formats?.name ?? "The whole body of rules"}
              />
            ))}
          </div>
        </section>
      ) : null}

      {sections.length === 0 ? (
        <NothingWrittenYet />
      ) : (
        <div className="space-y-4">
          {sections.map((row) => (
            <Card key={row.id}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="text-base font-semibold text-ink">{row.title}</h2>
                <SectionStateBadge state={row.state} />
                {row.formats === null ? null : (
                  <span className="text-xs text-muted">{row.formats.name}</span>
                )}
              </div>

              <div className="mt-3">
                <SectionContent row={row} />
              </div>

              {attached(row.format_id).length > 0 ? (
                <div className="mt-4 space-y-3">
                  {attached(row.format_id).map((question) => (
                    <OpenQuestionNotice
                      key={question.id}
                      question={question.question}
                      decisionOwner={question.decision_owner}
                    />
                  ))}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three states, rendered as three different things
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The body of one section, in whichever of the three states it is in.
 *
 * The switch is written here rather than in a shared component on purpose, and
 * the reason is not laziness: the sentence that introduces a *coordinates
 * declared* body is **about this section** — what binds a format whose manifesto
 * is unwritten is not what binds a capitolato whose rules are half-settled. The
 * two pieces that must NOT differ between the sections are shared and have one
 * renderer each: the badge above and `SectionVoid` below.
 *
 * `state` is the union, so the compiler sees every arm. A fourth state added to
 * the vocabulary fails the build here rather than falling through to a blank.
 */
function SectionContent({ row }: { row: SectionSelectRow }) {
  if (row.state === "not_decided") {
    return <SectionVoid section={row} />;
  }

  if (row.state === "coordinates_declared") {
    return (
      <>
        <p className="text-sm text-muted">
          The manifesto itself is not written. What follows is what has already
          been declared — and it binds: saying <em>not decided</em> where a
          coordinate exists is an omission, not caution. The exclusions below are
          decisions as much as the inclusions and are reported, never worked out
          again.
        </p>
        <Body body={row.body} />
      </>
    );
  }

  return <Body body={row.body} />;
}

/**
 * The authored prose, as authored.
 *
 * `body` is `NOT NULL`-by-constraint only in the written state
 * (`production_section_written_has_a_body`), so the type admits a null the
 * constraint refuses. When one arrives the component says so rather than drawing
 * a shorter panel: a rule with no text is not a rule with less to say, it is a
 * row that reached the screen without passing the check that asks for one.
 *
 * `whitespace-pre-line` and nothing else. The column holds prose written by
 * whoever owns the brand, and interpreting it as markup here would be this page
 * deciding what somebody else's emphasis means.
 */
function Body({ body }: { body: string | null }) {
  if (body === null || body.trim() === "") {
    return (
      <p className="text-sm text-muted">
        This section is marked as written and carries no text. That is a defect
        in the row, not a short rule.
      </p>
    );
  }

  return <p className="whitespace-pre-line text-sm text-ink">{body}</p>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The standing sentence, and the two states that are not a list of rules
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The paragraph this surface may not be read without.
 *
 * It says what the three states mean before a reader meets one, because the
 * whole risk on this page is a reader taking silence for permission. *Not
 * decided* is an answer here, and an unwritten format is not an unconstrained
 * one.
 */
function WhatIsNotWrittenHere() {
  return (
    <p className="mt-2 max-w-3xl text-sm text-muted">
      What is written binds. What is <em>not written</em> is an answer too — and
      it is not the same as unconstrained: a format with no manifesto can still
      carry declared coordinates, including things it explicitly is not. Nothing
      on this page may be filled in from somewhere else; a section that says it
      is undecided names the gap and the role that closes it.
    </p>
  );
}

/**
 * The failed read — and it is deliberately NOT the empty state.
 *
 * An empty section and a failed read look identical on a screen unless somebody
 * makes them different, and identical is the silent failure with a neutral face
 * this project has already paid for once. Here the confusion is not
 * hypothetical: the section is genuinely empty until plan 45-15 writes it, so a
 * failed read would land on the one page where *nothing here* is the expected
 * sight.
 *
 * `role="alert"` so it is announced, and it is the only alert region on this
 * surface.
 */
function ManifestoReadFailed({ what, reload }: { what: string; reload: string }) {
  return (
    <PageShell>
      <header className="pb-6">
        <PageTitle>Sound manifesto</PageTitle>
      </header>
      <div role="alert" className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          We could not read {what}.
        </p>
        <p className="mt-1 text-sm text-muted">
          This is a failed read, not an empty section. {reload}
        </p>
      </div>
    </PageShell>
  );
}

/**
 * The empty state — which is the state this section ships in.
 *
 * The tables were applied to production on 2026-08-17 and hold no rows. The
 * second sentence is not decoration: without it a missing editor reads as an
 * unfinished feature, and the sentence says the writing is a later plan rather
 * than a control somebody forgot.
 */
function NothingWrittenYet() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink">
        No section has been recorded yet
      </p>
      <p className="mt-1 text-sm text-muted">
        This page reads; it does not write. Recording the manifesto — including
        the sections that will say they are undecided — is a later step, and
        nothing is drawn here in the meantime.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The shapes the selects return
 * ──────────────────────────────────────────────────────────────────────────── */

/*
  ⚠ NOTHING CHECKS THESE AGAINST THE DATABASE.

  No Supabase client in this repository is parameterised with `Database`, so
  `.select("…")` returns values the compiler cannot relate to a column, and the
  casts below are assertions rather than checks.

  A green `npm run build` therefore proves that the JSX and the mappers
  type-check against THESE DECLARATIONS. It proves nothing whatever about whether
  a column is spelled the way the applied migration spells it. Every name above
  was read by hand out of `20260817120200_production_sections.sql` and checked
  against `ProductionSection` and `ProductionOpenQuestion` in
  `src/types/database.ts`, which plan 45-08 confirmed against the live catalogue
  read-back. That chain is the only check performed.

  The row types are COMPOSED from those interfaces with `Pick`, never restated: a
  second hand-written copy of a column list is a second place to change, and only
  one of the two would be changed.
*/
type SectionSelectRow = Pick<
  ProductionSection,
  "id" | "section" | "format_id" | "title" | "state" | "body" | "missing" | "decision_owner"
> & {
  formats: { name: string } | null;
};

type QuestionSelectRow = Pick<
  ProductionOpenQuestion,
  "id" | "question" | "decision_owner" | "section" | "format_id"
> & {
  formats: { name: string } | null;
};

/*
  ⚠ NOT CACHEABLE, AND SAID OUT LOUD RATHER THAN INHERITED.

  This page renders authored prose that is not ready to leave the perimeter, and
  `nextjs-architecture.md`'s gate *cache esplicita* requires a surface showing
  such data to declare it. Its gate *service worker* is the sharper half: Serwist
  serves content when the network is missing, including OLD content, so a stale
  manifesto is a rule rendered to whoever is holding the phone now rather than to
  whoever was entitled when it was cached — and on this section a stale copy is
  also a rule that was superseded, which is worse than absent.

  `cookies()` inside `createClient` already opts this route out of static
  rendering, so this line changes no behaviour today. It is here because the
  reason must survive a refactor that removes the cookie read.
*/
export const dynamic = "force-dynamic";
