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
import { PaletteSwatches } from "@/app/(admin)/admin/visual/PaletteSwatches";

import { readBrandPalette } from "@/lib/production/sections/tokens";
import { VISUAL_ASSET_KIND_LABELS } from "@/lib/production/sections/vocabulary";
import type {
  ProductionOpenQuestion,
  ProductionSection,
  ProductionVisualAsset,
} from "@/types/database";

/**
 * The visual system — the capitolato beside the material it governs.
 *
 * D-45-08: the rules and the material **together**, chosen over "rules only" and
 * over "material only". What is fixed and what is variable, the grid-safe
 * square, the date legible in a thumbnail, the order of publication and how it
 * inverts in the grid, the declared typography and its declared degradation —
 * beside the pieces that were produced under them and the artist photographs the
 * Tuesday listing depends on.
 *
 * ── Reachability is the map's answer, never this directory's ─────────────────
 *
 * `admin` in the URL is an address, not an authorisation
 * (`nextjs-architecture.md`, gate *il gruppo non autorizza*). What decides is the
 * row `"/admin/visual"` under `CAP.PRODUCTION_VISUAL_MANAGE` in
 * `src/lib/routes/capability-routes.ts` — **one entry**, read by the middleware,
 * by the guard below and (from plan 45-18) by the staff tab.
 *
 * ⚠ That entry moved to the `routes:` branch in the same commit as this file,
 * and with it **the last key this phase parked on the table-only branch**. The
 * order was forced: a page bound to a table-only key is unreachable for everyone,
 * `resolveRoute` returns `null`, the middleware fails closed, and there is no
 * build error and nothing in a log.
 *
 * ── The middleware is UX. The RLS is the boundary. ──────────────────────────
 *
 * The boundary is the `SELECT` policies of
 * `20260817120300_production_sections_access.sql`, each asking
 * `private.has_capability('production.visual.manage')`, applied to production by
 * plan 45-08. **Which is why every read below goes through the cookie-bound
 * client**, and why this file constructs no service client: a read that bypasses
 * the policy proves nothing about the policy.
 *
 * ── TWO THINGS THIS PAGE MUST NOT DO ────────────────────────────────────────
 *
 * **1. It names no space.** The capitolato is the document that LEAVES THE
 * PERIMETER — it goes to the external designer — and `venue-secrecy.md` calls it
 * an exit route. A venue name on it is a negotiation published, and a
 * publication does not come back. So this page **reads no venue table and has no
 * venue field**: not `venues`, not `event_parties`, not `production_space`. That
 * is checked mechanically rather than remembered, and the check is worth having
 * because the natural way to add "which venue is this piece for" is a join that
 * would look harmless in a diff. `brand-visual-system.md` states the rule
 * positively: until a space is acquired **in writing**, its name enters no
 * material, no caption and no capitolato.
 *
 * **2. It alludes to no sound.** Where a format's sonic identity is unwritten,
 * its materials carry no genre, no reference to a scene and no adjective that
 * sounds like a promise (`sound-manifesto.md`, gate *la grafica non anticipa il
 * suono*). So this page shows the manifesto's **state** and never a description
 * invented to fill it — and the state it shows is the one the other section
 * recorded, drawn by the same badge rather than restated in words here.
 *
 * ── The archive is listed and not shown, and that is not a shortcut ─────────
 *
 * `production_visual_asset` rows carry an `object_key` that points at storage.
 * **There is no read path for those bytes until plan 45-17 mints one** — a
 * signed URL with its own expiry and its own authorisation. An image element
 * pointed at an address that does not resolve would put a broken frame on a
 * gated surface, and a broken frame is indistinguishable from an empty archive
 * to whoever is looking at it. So the archive is a **count and a list** — what
 * kind, whose photograph, and when it was taken — and the thumbnails arrive with
 * their signed-URL path in plan 45-17 and not before.
 *
 * `object_key` is deliberately not even selected: this page has no use for it,
 * and a storage pointer that is never read cannot be logged, copied or linked.
 *
 * ⚠ An artist's name in a line-up that has not been announced is material in the
 * same sense a space under negotiation is — it is read as an announcement whether
 * or not it was one. It is drawn on this gated surface because the people who
 * hold this key are the people producing the piece; it reaches no log, no title
 * and no `aria-label`.
 */
export default async function AdminVisualPage() {
  // Resolved once by `(work)/layout.tsx` and `cache()`-scoped per request. The
  // page keeps its own guard: the middleware and the page give the same verdict
  // because they read the same entry (D-34-09).
  const { capabilities } = await getAccessContext();

  if (!capabilities.has(CAP.PRODUCTION_VISUAL_MANAGE)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  /*
    THREE READS, AND EVERY EMBED CHECKED AGAINST ITS FOREIGN KEYS.

    An embed through a table with MORE THAN ONE relationship to the embedded
    table is answered by PostgREST with `HTTP 300 PGRST201`, and the failure is
    SILENT through this client: `data` comes back null with no exception thrown.
    On this surface that is worse than usual, because *the section is empty* is
    ALSO the true state today.

    Read out of `20260817120200_production_sections.sql` rather than assumed:

      production_section       → formats   ONE FK, `format_id`
      production_open_question → formats   ONE FK, `format_id`
      production_visual_asset  → formats   ONE FK, `format_id`

    and no junction table carries foreign keys to both sides of any of the three.
    `created_by` and `updated_by` point at `public.profiles` and are not
    embedded: who uploaded a photograph is a different question with a different
    audience.

    ⚠ AND THERE IS NO FOURTH READ. No `venues`, no `event_parties`, no
    `production_space` — see the docblock. The capitolato leaves the perimeter,
    so what it can name is what will leave.
  */
  const { data: sectionRows, error: sectionError } = await supabase
    .from("production_section")
    .select(
      `id, section, format_id, title, state, body, missing, decision_owner,
       formats ( name )`
    )
    .eq("section", "visual")
    .order("title", { ascending: true });

  /*
    The register, with the same two arms as the manifesto's and for the same
    reasons: `section = 'visual' OR section IS NULL`, because a question can bear
    on the whole brand rather than on one body of rules — the spelling, the
    grid-safe square, the order of publication are exactly that kind — and
    dropping the null ones would hide the register's most general entries.

    `closed_at IS NULL`, because a resolved question that kept warning is a
    warning nobody reads, which is the same reason D-45-15 refuses to let any of
    these block anything.
  */
  const { data: questionRows, error: questionError } = await supabase
    .from("production_open_question")
    .select(
      `id, question, decision_owner, section, format_id,
       formats ( name )`
    )
    .or("section.eq.visual,section.is.null")
    .is("closed_at", null)
    .order("opened_at", { ascending: true });

  /*
    The archive. Newest first — the last thing produced is the thing somebody is
    looking for, and an artist photograph is most useful while it is recent.

    `object_key` is not selected. See the docblock: there is no read path for the
    bytes until plan 45-17, and a pointer nobody reads is a pointer nobody can
    leak.
  */
  const { data: assetRows, error: assetError } = await supabase
    .from("production_visual_asset")
    .select(
      `id, kind, artist_name, taken_on, format_id,
       formats ( name )`
    )
    .order("taken_on", { ascending: false, nullsFirst: false });

  /*
    THREE OUTCOMES PER READ, NEVER TWO (OBS-03), AND THE THREE READS FAIL
    SEPARATELY.

    A single sentence covering all three would be the `catch` shape this
    repository has already paid for once. There is no error tracking here, so a
    failure that is only logged reaches nobody: the sentence on the screen IS the
    observable effect.

    `error.code` and `error.message` only. Never the error object, and never
    PostgREST's third field, which carries the rejected row — and a rejected row
    here can carry an artist's name.
  */
  if (sectionError) {
    console.error(
      `[visual.sections_read_failed] code=${sectionError.code} message=${sectionError.message}`
    );
    return <VisualReadFailed what="the capitolato" />;
  }

  if (questionError) {
    console.error(
      `[visual.questions_read_failed] code=${questionError.code} message=${questionError.message}`
    );
    return <VisualReadFailed what="the register of open questions" />;
  }

  if (assetError) {
    console.error(
      `[visual.assets_read_failed] code=${assetError.code} message=${assetError.message}`
    );
    return <VisualReadFailed what="the archive" />;
  }

  /*
    `as unknown as`, for the reason written in the manifesto page: without a
    `Database`-parameterised client supabase-js types every embed as a to-MANY
    relation, PostgREST returns an object for a to-one, and the wire format is
    the one that renders. The double assertion says out loud that nothing is
    being checked.
  */
  const sections = (sectionRows ?? []) as unknown as SectionSelectRow[];
  const questions = (questionRows ?? []) as unknown as QuestionSelectRow[];
  const assets = (assetRows ?? []) as unknown as AssetSelectRow[];

  /*
    The palette is read from the token file, not from the database and not from a
    constant here. If that read failed, `PaletteSwatches` draws the declared
    failure — the page does not fall over, because a capitolato with one section
    unreadable is still the document somebody came for.
  */
  const palette = readBrandPalette();

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
        <PageTitle>Visual system</PageTitle>
        <WhatThisDocumentIs />
      </header>

      {general.length > 0 ? (
        <section className="pb-6">
          <SectionHeading>Open across the visual system</SectionHeading>
          <div className="space-y-3">
            {general.map((question) => (
              <OpenQuestionNotice
                key={question.id}
                question={question.question}
                decisionOwner={question.decision_owner}
                scope={question.formats?.name ?? "The whole visual system"}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="pb-6">
        <SectionHeading>The capitolato</SectionHeading>
        {sections.length === 0 ? (
          <NothingWrittenYet />
        ) : (
          <div className="space-y-4">
            {sections.map((row) => (
              <Card key={row.id}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="text-base font-semibold text-ink">{row.title}</h3>
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

        {/*
          The palette sits INSIDE the capitolato, because that is what it is: one
          clause of the document handed to whoever produces the pieces, not a
          separate feature of this page.
        */}
        <Card className="mt-4">
          <h3 className="text-base font-semibold text-ink">Palette</h3>
          <div className="mt-3">
            <PaletteSwatches palette={palette} />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading>The archive</SectionHeading>
        <AssetList assets={assets} />
      </section>
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three states, rendered as three different things
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One clause of the capitolato, in whichever of the three states it is in.
 *
 * The badge and the void are the **shared** renderers — one of each, imported
 * from the manifesto's directory, because a second badge is a second place the
 * three states can quietly become two. What is written here rather than shared
 * is the sentence introducing a *coordinates declared* clause, and only because
 * it is about THIS document: what binds a half-settled capitolato is not what
 * binds an unwritten manifesto.
 */
function SectionContent({ row }: { row: SectionSelectRow }) {
  if (row.state === "not_decided") {
    return <SectionVoid section={row} />;
  }

  if (row.state === "coordinates_declared") {
    return (
      <>
        <p className="text-sm text-muted">
          This clause is not settled. What follows is what has already been
          declared, and it binds anyway — including anything it says is{" "}
          <em>not</em> allowed, which is a decision as much as a permission.
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
 * `whitespace-pre-line` and nothing else: the column holds a document written by
 * whoever owns the brand, and interpreting it as markup here would be this page
 * deciding what somebody else's emphasis means.
 */
function Body({ body }: { body: string | null }) {
  if (body === null || body.trim() === "") {
    return (
      <p className="text-sm text-muted">
        This clause is marked as written and carries no text. That is a defect in
        the row, not a short rule.
      </p>
    );
  }

  return <p className="whitespace-pre-line text-sm text-ink">{body}</p>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The archive — a count and a list, and no picture
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * What has been produced, and what is held so that something can be produced.
 *
 * ⚠ **No image is rendered here, and it is not an omission.** The bytes have no
 * read path until plan 45-17 mints one — a signed URL with its own expiry — and
 * a broken frame on a gated surface is indistinguishable from an empty archive.
 * The count above the list is the honest form of the same information: it says
 * how much exists without pretending to show it.
 *
 * **The count is the point of the archive, not decoration.** The listing goes
 * out two days before the night, so that night's photograph cannot exist yet: at
 * an artist's first date there is only their press photo, and from the second the
 * piece is pulled from an archive somebody has been building. An archive nobody
 * is filling is a format that stays dependent on what arrives on the Monday for
 * the Tuesday — and the number here is the only thing that reports it.
 */
function AssetList({ assets }: { assets: readonly AssetSelectRow[] }) {
  if (assets.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          Nothing is held in the archive yet
        </p>
        <p className="mt-1 text-sm text-muted">
          Uploading is a later step; this page reads. Until something is held
          here, every piece depends on what arrives from the artist in the two
          days before the listing.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="pb-3 text-sm text-muted">
        {assets.length} held. Thumbnails are not drawn: the files have no read
        path yet, and they arrive with the signed-URL path of plan 45-17.
      </p>
      <ul className="space-y-2">
        {assets.map((asset) => (
          <li
            key={asset.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-s-2 border-control ps-3"
          >
            <span className="font-mono text-sm font-semibold normal-case text-ink">
              {VISUAL_ASSET_KIND_LABELS[asset.kind]}
            </span>
            <span className="text-sm text-ink">
              {asset.artist_name ?? "No artist recorded"}
            </span>
            <span className="font-mono text-xs normal-case text-muted">
              {asset.taken_on ?? "No date recorded"}
            </span>
            {asset.formats === null ? null : (
              <span className="text-xs text-muted">{asset.formats.name}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The standing sentence, and the two states that are not a document
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The paragraph this surface may not be read without.
 *
 * It says what the document is FOR, because what it is for decides what may be
 * written on it: this is the thing that gets handed to somebody outside the
 * project, and everything on it travels with it.
 */
function WhatThisDocumentIs() {
  return (
    <p className="mt-2 max-w-3xl text-sm text-muted">
      This is the brief, not the artwork — the rules a piece is produced against.
      It is written to be <strong className="font-semibold text-ink">handed
      out</strong>, so it carries no address and names no space that has not been
      acquired in writing. Where a clause says it is undecided, it says what is
      missing and whose call it is; nothing here is filled in from somewhere
      else.
    </p>
  );
}

/**
 * The failed read — deliberately NOT the empty state.
 *
 * An empty section and a failed read look identical unless somebody makes them
 * different, and here the section is genuinely empty until it is written, so a
 * failed read would land on the one page where *nothing here* is expected.
 *
 * `role="alert"` so it is announced, and it is the only alert region on this
 * surface other than the palette's own declared failure.
 */
function VisualReadFailed({ what }: { what: string }) {
  return (
    <PageShell>
      <header className="pb-6">
        <PageTitle>Visual system</PageTitle>
      </header>
      <div role="alert" className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          We could not read {what}.
        </p>
        <p className="mt-1 text-sm text-muted">
          This is a failed read, not an empty document. Reload the page; nothing
          in the data has changed.
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
 * unfinished feature, and somebody builds the control instead of writing the
 * document.
 */
function NothingWrittenYet() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink">
        No clause has been recorded yet
      </p>
      <p className="mt-1 text-sm text-muted">
        This page reads; it does not write. Recording the capitolato — including
        the clauses that will say they are undecided — is a later step, and
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

  No Supabase client in this repository is parameterised with `Database`, so the
  casts above are assertions rather than checks. Every column name was read by
  hand out of `20260817120200_production_sections.sql` and checked against
  `src/types/database.ts`, which plan 45-08 confirmed against the live catalogue
  read-back. That chain is the only check performed.

  The row types are COMPOSED with `Pick`, never restated — a second hand-written
  copy of a column list is a second place to change, and only one would change.
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

/**
 * ⚠ `object_key` is ABSENT from this type, and the absence is load-bearing: a
 * pointer this page cannot name is a pointer it cannot render, log or link.
 */
type AssetSelectRow = Pick<
  ProductionVisualAsset,
  "id" | "kind" | "artist_name" | "taken_on" | "format_id"
> & {
  formats: { name: string } | null;
};

/*
  ⚠ NOT CACHEABLE, AND SAID OUT LOUD RATHER THAN INHERITED.

  This page renders authored rules and the names of artists in line-ups that may
  not have been announced. `nextjs-architecture.md`'s gate *cache esplicita*
  requires a surface showing such data to declare it, and its gate *service
  worker* is the sharper half: Serwist serves OLD content when the network is
  missing, and a stale capitolato is a superseded rule rendered as the current
  one — which is worse than no rule at all, because a piece gets produced against
  it.

  `cookies()` inside `createClient` already opts this route out of static
  rendering, so this line changes no behaviour today. It is here because the
  reason must survive a refactor that removes the cookie read.
*/
export const dynamic = "force-dynamic";
