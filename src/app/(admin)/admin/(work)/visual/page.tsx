import { redirect } from "next/navigation";

import { CAP } from "@/lib/capabilities/keys";
import { getAccessContext } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageTitle, SectionHeading } from "@/components/ui/Typography";
import { ExportPanel } from "@/app/(admin)/admin/manifesto/ExportPanel";
import { OpenQuestionNotice } from "@/app/(admin)/admin/manifesto/OpenQuestionNotice";
import { SectionForm } from "@/app/(admin)/admin/manifesto/SectionForm";
import { SectionStateBadge } from "@/app/(admin)/admin/manifesto/SectionStateBadge";
import { SectionVoid } from "@/app/(admin)/admin/manifesto/SectionVoid";
import type { FormatChoice } from "@/app/(admin)/admin/manifesto/refusals";
import { PaletteSwatches } from "@/app/(admin)/admin/visual/PaletteSwatches";
import { ArchiveUpload } from "@/app/(admin)/admin/visual/ArchiveUpload";

import {
  recordVisualAsset,
  saveSection,
  signVisualAssets,
} from "@/app/(admin)/admin/visual/actions";
import { exportVisualCapitolato } from "@/app/(admin)/admin/visual/export-actions";

import { readBrandPalette } from "@/lib/production/sections/tokens";
import type { ArchiveSignatureResult } from "@/lib/production/sections/visual-archive";
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
 * by the guard below and (from plan 45-18) by the staff tab. The same key opens
 * the archive's upload arm and signs its thumbnails, so the three cannot
 * disagree.
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
 * ── The archive is shown through a SIGNATURE, and never through a URL ───────
 *
 * `production_visual_asset` rows carry an `object_key` that points into a bucket
 * that is **private**, has no anonymous read arm and has no client write arm at
 * all. An archive photograph is **not published**: it is held so that a listing
 * can be produced from it later, and a picture of somebody who has agreed to
 * play on a date nobody has communicated is material in exactly the sense a
 * space under negotiation is. So a thumbnail here exists because the server
 * signed for it, briefly, behind this section's own key — the same door as the
 * rest of the page rather than a second one.
 *
 * ⚠ **`object_key` is still not selected by this page**, and the absence is
 * load-bearing rather than left over. `signVisualAssets` reads the pointers,
 * mints the addresses and answers keyed by the ROW's identifier, so a storage
 * pointer never reaches this file — and a pointer a page cannot name is a
 * pointer it cannot log, copy or link.
 *
 * ⚠ **A signature that could not be minted draws a stated absence, never a
 * broken frame.** The two are indistinguishable to whoever is looking, and one
 * of them says *the archive is empty* when it is not.
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
    FOUR READS, AND EVERY EMBED CHECKED AGAINST ITS FOREIGN KEYS.

    ⚠ It was three until plan 45-15, and the paragraph below said there was no
    fourth. **The fourth is the CATALOGUE OF FORMATS** — needed by the form this
    page now mounts, to offer *which format this clause belongs to*, whose
    correct answer is often none. It is entitled independently of this section's
    key (`formats_select_listed` is `USING (listed = true)`, unconditional), and
    `color` is deliberately not selected: every format carries an identification
    colour, and one drawn on the page whose subject IS the palette would be a
    palette nobody decided.

    **The prohibition the old paragraph carried is unchanged and is restated
    below**: still no `venues`, no `event_parties`, no `production_space`. The
    catalogue is not a venue table, and reversing a count is not relaxing a rule.

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

    ⚠ AND THERE IS NO VENUE READ, IN ANY OF THE FOUR. No `venues`, no
    `event_parties`, no `production_space` — see the docblock. The capitolato
    leaves the perimeter, so what it can name is what will leave.
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

    `object_key` is not selected. See the docblock: the pointers are read by the
    act that signs for them and never by this file, and a pointer nobody reads is
    a pointer nobody can leak.
  */
  const { data: assetRows, error: assetError } = await supabase
    .from("production_visual_asset")
    .select(
      `id, kind, artist_name, taken_on, format_id,
       formats ( name )`
    )
    .order("taken_on", { ascending: false, nullsFirst: false });

  /*
    THE CATALOGUE, FOR THE ONE SELECT THE FORM DRAWS.

    `retired_at IS NULL` removes the fallback format, which exists only to hold
    rows nobody classified; `sort_order` is the catalogue's own sequence. `color`
    is not selected — see the paragraph above.

    A failure here does not take the page down: the capitolato is the thing
    somebody came for, and a document with one control degraded is still that
    document. It is logged with its two fields, and the form says in its own
    words that a clause can then only be recorded as belonging to the whole
    brand.
  */
  const { data: formatRows, error: formatError } = await supabase
    .from("formats")
    .select("id, name")
    .is("retired_at", null)
    .order("sort_order", { ascending: true });

  if (formatError) {
    console.error(
      `[visual.formats_read_failed] code=${formatError.code} message=${formatError.message}`
    );
  }

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
    `null` and not `[]` when the catalogue could not be read, and the difference
    is drawn: an empty list would say *there are no formats*, which is false, and
    the form would offer an empty select instead of saying what it cannot do.
  */
  const formats: FormatChoice[] | null =
    formatError || formatRows === null
      ? null
      : (formatRows as unknown as FormatChoice[]);

  /*
    The palette is read from the token file, not from the database and not from a
    constant here. If that read failed, `PaletteSwatches` draws the declared
    failure — the page does not fall over, because a capitolato with one section
    unreadable is still the document somebody came for.
  */
  const palette = readBrandPalette();

  /*
    THE ADDRESSES, MINTED ON THE SERVER, ONE CALL FOR THE WHOLE LIST.

    ⚠ It is a `"use server"` export awaited during a page render, which is a
    server function call and not a round trip — and it matters that it is: the
    gate inside it resolves the access context through `cache()`, which DOES
    memoise inside a render (and does not inside a Server Action body, measured
    in phase 33). So the key is asked once here whatever the archive holds.

    `assets.length === 0` is passed through rather than branched on: the act
    answers an empty map for an empty list, and a branch here would be a second
    place to decide what an empty archive means.
  */
  const signatures = await signVisualAssets(assets.map((asset) => asset.id));

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

                {/*
                  The correction sits under the clause it corrects, so the state
                  on the screen and the state in the control are read together —
                  and the control still chooses nothing.
                */}
                <div className="mt-4">
                  <SectionForm
                    save={saveSection}
                    formats={formats}
                    record={{
                      id: row.id,
                      title: row.title,
                      format_id: row.format_id,
                      state: row.state,
                      body: row.body,
                      missing: row.missing,
                      decision_owner: row.decision_owner,
                    }}
                    noun="clause"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/*
          ── THE AUTHORING HALF ──────────────────────────────────────────────

          The act comes from THIS section's module, which asks THIS section's
          key. The manifesto's module is not imported here and cannot be: the two
          are separate files for that reason, because every export of a
          `"use server"` module is a public endpoint.

          ⚠ **The register is read on this page and written from the other.** A
          brand-wide question appears here because it belongs to no single body
          of rules; a question about this section's own clauses is opened where
          its key is asked. Nothing on this page can open or close one, and the
          reason it is written down is that the absence of a control looks like
          an oversight from here.
        */}
        <div className="mt-4">
          <SectionForm
            save={saveSection}
            formats={formats}
            record={null}
            noun="clause"
          />
        </div>

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

      <section className="pb-6">
        <SectionHeading>The archive</SectionHeading>
        <WhyTheArchiveExists />
        <AssetList assets={assets} signatures={signatures} />

        {/*
          The uploader takes its act as a PROP, the shape `SectionForm` uses one
          directory over and for the same reason: the component imports no action
          module of its own, so it cannot reach the sibling section's key by
          accident. The act comes from THIS section's module, which asks THIS
          section's key.
        */}
        <div className="mt-4">
          <ArchiveUpload formats={formats} record={recordVisualAsset} />
        </div>
      </section>

      {/*
        ── THE HALF THAT LEAVES ──────────────────────────────────────────────

        The act comes from THIS section's own arm, which asks THIS section's key
        — a separate file from the write act above and from the sibling
        section's arm, because every export of a `"use server"` module is a
        public endpoint.

        ⚠ **The archive is NOT part of what leaves.** The panel below produces
        the capitolato: the rules and the palette. An artist's photograph is
        material, not brief, and the serialiser does not read the asset table at
        all — which is why nothing here has to remember to leave it out.
      */}
      <section>
        <ExportPanel
          produce={exportVisualCapitolato}
          documentName="the capitolato"
          handedTo="the external designer"
        />
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
 * The two sentences this section cannot be read without, and both come from the
 * domain rather than from convention.
 *
 * They are on the surface and not only in a docblock because the person filling
 * the archive on a Thursday is the person who has to act on them, and a rule
 * that lives where only a developer reads it is a rule that governs nothing.
 */
function WhyTheArchiveExists() {
  return (
    <p className="pb-4 max-w-3xl text-sm text-muted">
      <strong className="font-semibold text-ink">The archive precedes the
      listing.</strong>{" "}
      The listing goes out two days before the night, so that night&apos;s
      photograph cannot exist yet: at an artist&apos;s first date it is their
      press photo, and from the second it is this.{" "}
      <strong className="font-semibold text-ink">The spelling is verified at the
      source.</strong>{" "}
      A name misspelled here becomes a name misspelled on a published piece, and
      that does not come back.
    </p>
  );
}

/**
 * What has been produced, and what is held so that something can be produced.
 *
 * ⚠ **A thumbnail is drawn only where a signature was minted for it.** The
 * bucket is private and has no anonymous read arm, so there is no address to
 * fall back to — and falling back to a broken frame would be worse than drawing
 * nothing: a broken frame and an empty archive are the same thing to whoever is
 * looking. Where an address is missing, the row says so in words and keeps its
 * kind, its artist and its date, which are the three facts somebody came for.
 *
 * **The count is the point of the archive, not decoration.** An archive nobody
 * is filling is a format that stays dependent on what arrives on the Monday for
 * the Tuesday — and the number here is the only thing that reports it.
 */
function AssetList({
  assets,
  signatures,
}: {
  assets: readonly AssetSelectRow[];
  signatures: ArchiveSignatureResult;
}) {
  if (assets.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-base font-semibold text-ink">
          Nothing is held in the archive yet
        </p>
        <p className="mt-1 text-sm text-muted">
          Until something is held here, every piece depends on what arrives from
          the artist in the two days before the listing. The panel below is where
          that stops being true.
        </p>
      </div>
    );
  }

  const urls = signatures.ok ? signatures.urls : {};

  return (
    <div>
      <p className="pb-3 text-sm text-muted">
        {assets.length} held, privately. Nothing here is published by being
        filed: a thumbnail loads through an address the server signs for a few
        minutes at a time.
      </p>

      {/*
        The failed signature is announced and is NOT the empty state — the rows
        are on the screen, and only the pictures are missing. Its own sentence,
        for the reason the read failures above have theirs.
      */}
      {signatures.ok ? null : (
        <div
          role="alert"
          className="mb-3 rounded-2xl border border-sem-crit/40 bg-sem-crit/10 p-4"
        >
          <p className="text-sm text-sem-crit">
            {signatures.reason === "read_failed"
              ? "The archive's entries are listed below, but the pictures could not be looked up. Reload the page; nothing in the data has changed."
              : "The pictures could not be signed for, so none is drawn below. The entries are intact and nothing has been lost."}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {assets.map((asset) => {
          const url = urls[asset.id];
          return (
            <li
              key={asset.id}
              className="flex items-start gap-3 border-s-2 border-control ps-3"
            >
              {/*
                No `alt` text carrying the artist's name: the picture IS the
                artist, so naming it in the alternative text would repeat the
                line beside it to a screen reader, and an empty alt on a
                decorative-by-adjacency image is the correct answer. The name is
                rendered as text one element over, where everybody reads it.

                `img` rather than `next/image`: the address is short-lived and
                signed, and handing it to an optimiser that caches by URL would
                outlive the signature it was granted under.
              */}
              {url === undefined ? (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-sunk">
                  <span className="px-1 text-center text-[10px] leading-tight text-muted">
                    no picture
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              )}

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
              </div>
            </li>
          );
        })}
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
 * The tables were applied to production on 2026-08-17 and hold no rows.
 *
 * ⚠ **The second sentence used to say the writing was a later step. It is not
 * any more**, and the copy is corrected rather than left standing: a sentence
 * telling somebody a control does not exist, on a page where it does, is the
 * same defect as a docblock that lies. What it says instead is the half that
 * still holds — nothing is drawn here in the meantime, because a placeholder
 * clause handed to an external designer would be the capitolato for whoever
 * read it.
 */
function NothingWrittenYet() {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink">
        No clause has been recorded yet
      </p>
      <p className="mt-1 text-sm text-muted">
        Nothing is invented to fill the wait — no sample clause, no placeholder
        rule, no palette borrowed from the one format that has one. The form
        below records the first clause, in whichever of the three states you say
        it is in.
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
