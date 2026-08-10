"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormatMarker from "@/components/formats/FormatMarker";
import CreateFormatModal from "@/app/(admin)/admin/formats/CreateFormatModal";
import CreateSeriesModal from "@/app/(admin)/admin/formats/CreateSeriesModal";
import RetireFormatDialog, {
  type RetireMode,
  type RetireSubject,
} from "@/app/(admin)/admin/formats/RetireFormatDialog";
import {
  setFormatListed,
  type CatalogueRefusal,
} from "@/app/(admin)/admin/formats/actions";

/**
 * Every interactive act on the catalogue surface, in one place.
 *
 * The page one directory up fetches, shapes and lays out; it holds no state.
 * This file holds all of it: `Add format`, `Add series`, the edit triggers, the
 * listing control, and the retire and restore confirmations. It **fetches
 * nothing** — every row arrives as a prop, because the surface that already
 * holds the catalogue is the one that can name a colour's holder, and a second
 * read from the client would be a second answer to a question already answered.
 *
 * ── `Add format` had no precedent, so its shape was assembled ────────────────
 *
 * Measured before writing (`36-PATTERNS.md`, *No Analog Found*): **no page in
 * this repository has a page-level create affordance.** Neither
 * `(work)/venues/page.tsx` nor `(work)/artists/page.tsx` has any create control
 * at all — creation for those two happens only through modals mounted inside
 * `EventForm`. So this button is built from ingredients that do exist: the
 * primary fill at `CreateVenueModal.tsx:291-297` (`rounded-full bg-accent`) and
 * the `<dialog>` open/close plumbing at `:37-50`.
 *
 * The accent is correct here and is not a borrowed identity: the design contract
 * reserves it for the interaction channel — the active tab, the lineup pill, the
 * venue link, the focus ring and this surface's primary button. What it is
 * barred from is the **format identification** channel, which is the swatch, and
 * which this file never draws by hand: it mounts `FormatMarker` instead.
 *
 * ── Listing is a separate act, and its control says what it does ─────────────
 *
 * D-36-17: existing in the catalogue and appearing on `/events` are two
 * decisions. `createFormat` takes no listing argument and the row is born on the
 * database's own `false`, so a format prepared in September for a series that
 * starts in November is not announced by the product the moment somebody presses
 * save. This control is the deliberate second act — and it is **not** a checkbox
 * labelled with a column name: it names the effect a visitor sees.
 *
 * ── Nothing here removes anything, and that is structural ────────────────────
 *
 * There is no removal control on this surface, and there is no action to call
 * even if one were drawn: `admin/formats/actions.ts` exports none. Both foreign
 * keys are `ON DELETE RESTRICT`, so a format carrying nights could not be
 * removed by any path. Retirement is the operation, and it rewrites nothing that
 * already happened (D-36-10 — the archive keeps showing the sigla a night
 * actually ran under). The absence is written down here because a reader who
 * finds no such button deserves to know it was decided rather than forgotten.
 *
 * ── A refusal is a returned value, and each one gets its own sentence ────────
 *
 * `setFormatListed` returns `CatalogueResult`. Next redacts the message of an
 * error thrown out of a Server Action in a production build, so no message is
 * ever read here — the `catch` branches on the shape of the failure and says
 * only what that shape can honestly distinguish.
 *
 * ── One divergence from §S5, taken as a decision ─────────────────────────────
 *
 * §S5 draws the catalogue row's swatch at 12px; `FormatMarker` renders 8px, and
 * its docblock leaves the choice to whoever builds this surface. 8px is
 * accepted, and no size prop was added: the reason `FormatMarker` exists is that
 * it is the one element carrying `normal-case` explicitly, and widening its API
 * to gain four pixels invites the second element that renders a format name with
 * no guarantee about its own casing — which is the failure that publishes to
 * every visitor at once.
 */

export interface CatalogueSeries {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly retiredAt: string | null;
  readonly highestAssigned: number;
}

export interface CatalogueFormat {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly code: string;
  readonly color: string;
  readonly listed: boolean;
  readonly sortOrder: number;
  readonly retiredAt: string | null;
  readonly series: readonly CatalogueSeries[];
}

/** Colours held by **active** formats, keyed by upper-case hex. */
type TakenBy = Readonly<Record<string, string>>;

interface RetireTarget {
  readonly subject: RetireSubject;
  readonly mode: RetireMode;
  readonly id: string;
  readonly name: string;
  readonly color?: string;
  readonly colorHolder?: string;
}

interface SeriesTarget {
  readonly format: CatalogueFormat;
  readonly series?: CatalogueSeries;
}

/**
 * `setFormatListed` can return exactly these, read out of the action body.
 *
 * Narrowed rather than total over `CatalogueRefusal` — the same trade
 * `36-08-SUMMARY.md` states for its own tables, with the same cost written down:
 * a member added to the union reaches the `default` branch, which prints the
 * value rather than hiding it inside a sentence written for something else.
 */
type ListingRefusal =
  | "invalid_id"
  | "invalid_listed"
  | "format_not_found"
  | "write_failed";

/** Turns red the day a member above stops existing in the union it copies. */
type _ListingIsSubset = ListingRefusal extends CatalogueRefusal ? true : never;
const _listingIsSubset: _ListingIsSubset = true;
void _listingIsSubset;

function describeListingRefusal(reason: CatalogueRefusal, listed: boolean): string {
  const act = listed ? "show this format on /events" : "take it off /events";

  switch (reason as ListingRefusal) {
    case "invalid_id":
      return `Could not ${act}. This format could not be identified. Reload the page and try again.`;
    case "invalid_listed":
      return `Could not ${act}. The value sent was not a yes or a no. Reload the page and try again.`;
    case "format_not_found":
      return `Could not ${act}. This format is no longer in the catalogue — reload the page.`;
    case "write_failed":
      return `Could not ${act}. The database refused the write. Nothing changed.`;
    default:
      return `Could not ${act}. The catalogue refused this with "${reason}", which this surface does not expect. Nothing changed.`;
  }
}

/** The map, minus the colour the row being edited already holds. */
function without(takenBy: TakenBy, color: string | undefined): TakenBy {
  if (!color) return takenBy;
  const key = color.toUpperCase();
  const out: Record<string, string> = {};
  for (const [hex, holder] of Object.entries(takenBy)) {
    if (hex !== key) out[hex] = holder;
  }
  return out;
}

const ROW =
  "rounded-xl border border-card-border bg-card p-3 transition-colors";

const SECONDARY_BUTTON =
  "rounded-full border border-card-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50";

interface FormatsCatalogueProps {
  readonly formats: readonly CatalogueFormat[];
  readonly takenBy: TakenBy;
}

export default function FormatsCatalogue({
  formats,
  takenBy,
}: FormatsCatalogueProps) {
  const router = useRouter();

  const [addingFormat, setAddingFormat] = useState(false);
  const [editingFormat, setEditingFormat] = useState<CatalogueFormat | null>(null);
  const [seriesTarget, setSeriesTarget] = useState<SeriesTarget | null>(null);
  const [retireTarget, setRetireTarget] = useState<RetireTarget | null>(null);
  const [listingBusy, setListingBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; sentence: string } | null>(
    null
  );

  function reload() {
    router.refresh();
  }

  async function toggleListing(format: CatalogueFormat) {
    if (listingBusy) return;
    const next = !format.listed;
    setNotice(null);
    setListingBusy(format.id);

    try {
      const result = await setFormatListed(format.id, next);

      if (!result.ok) {
        setNotice({
          id: format.id,
          sentence: describeListingRefusal(result.reason, next),
        });
        return;
      }

      reload();
    } catch (err) {
      // Shape, not message: a production build redacts the message of an error
      // thrown out of a Server Action, so the two branches say only what the
      // shape can honestly tell apart.
      const unreachable =
        err instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

      setNotice({
        id: format.id,
        sentence: unreachable
          ? "The request never reached the server. Nothing changed — check the connection and try again."
          : "The server refused the request. This account may no longer hold permission to manage the catalogue; reload the page and check. Nothing changed.",
      });
    } finally {
      setListingBusy(null);
    }
  }

  return (
    <section aria-labelledby="active-formats-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id="active-formats-heading" className="sr-only">
          Formats in circulation
        </h2>

        {/* The one page-level create affordance in this repository. */}
        <button
          type="button"
          onClick={() => setAddingFormat(true)}
          className="ml-auto rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Add format
        </button>
      </div>

      {formats.length > 0 && (
        <ul className="space-y-2">
          {formats.map((format) => (
            <li key={format.id} className={ROW}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <FormatMarker name={format.name} color={format.color} />

                <span className="text-xs text-muted tabular-nums">
                  {format.code}
                </span>

                {/*
                  A COUNT, and it is fine HERE AND ONLY HERE.

                  Rule 1 of the UI spec bars a count from a surface a visitor
                  reads: a count with one bit of resolution announces an
                  unannounced night by lighting up. This surface is internal,
                  behind `catalogue.manage`, and the count is the only field on
                  the row that says anything about the format's state. The rule
                  is easy to over-apply — which is why the exception is written
                  here rather than left to be re-argued.
                */}
                <span className="text-xs text-muted tabular-nums">
                  {format.series.length === 1
                    ? "1 series"
                    : `${format.series.length} series`}
                </span>

                <span
                  className={`text-xs ${format.listed ? "text-foreground" : "text-muted"}`}
                >
                  {format.listed ? "On /events" : "Not on /events"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  onClick={() => setEditingFormat(format)}
                >
                  Edit format
                </button>

                {/*
                  The listing control names the EFFECT, not the column. Turning
                  it on is what puts a chip on `/events` for every visitor;
                  turning it off takes the chip away and leaves everything else
                  exactly as it is — the nights, the series, the numbering.
                */}
                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  disabled={listingBusy === format.id}
                  onClick={() => void toggleListing(format)}
                >
                  {listingBusy === format.id
                    ? "Working…"
                    : format.listed
                      ? "Take off /events"
                      : "Show on /events"}
                </button>

                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  onClick={() => setSeriesTarget({ format })}
                >
                  Add series
                </button>

                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  onClick={() =>
                    setRetireTarget({
                      subject: "format",
                      mode: "retire",
                      id: format.id,
                      name: format.name,
                      color: format.color,
                    })
                  }
                >
                  Retire
                </button>
              </div>

              <p className="mt-2 text-xs text-muted">
                {format.listed
                  ? "A chip for this format is on /events for every visitor."
                  : "No chip for this format is on /events. Nights under it are unaffected either way."}
              </p>

              {notice?.id === format.id && (
                <div
                  role="alert"
                  className="mt-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3"
                >
                  <p className="text-sm text-red-400">{notice.sentence}</p>
                </div>
              )}

              <SeriesList
                format={format}
                onEdit={(series) => setSeriesTarget({ format, series })}
                onRetire={(series, mode) =>
                  setRetireTarget({
                    subject: "series",
                    mode,
                    id: series.id,
                    name: series.name,
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}

      <CreateFormatModal
        open={addingFormat}
        onClose={() => setAddingFormat(false)}
        onSaved={reload}
        takenBy={takenBy}
      />

      {editingFormat && (
        <CreateFormatModal
          open
          onClose={() => setEditingFormat(null)}
          onSaved={reload}
          format={{
            id: editingFormat.id,
            name: editingFormat.name,
            code: editingFormat.code,
            color: editingFormat.color,
            sortOrder: editingFormat.sortOrder,
          }}
          // Its own colour is not "taken" from its own point of view — the
          // uniqueness check in the action excludes the row it is updating, and
          // a picker that disagreed would forbid keeping the colour a format
          // already has.
          takenBy={without(takenBy, editingFormat.color)}
        />
      )}

      {seriesTarget && (
        <CreateSeriesModal
          open
          onClose={() => setSeriesTarget(null)}
          onSaved={reload}
          format={{
            id: seriesTarget.format.id,
            name: seriesTarget.format.name,
            color: seriesTarget.format.color,
          }}
          series={
            seriesTarget.series
              ? {
                  id: seriesTarget.series.id,
                  name: seriesTarget.series.name,
                  code: seriesTarget.series.code,
                }
              : undefined
          }
        />
      )}

      {retireTarget && (
        <RetireFormatDialog
          open
          subject={retireTarget.subject}
          mode={retireTarget.mode}
          id={retireTarget.id}
          name={retireTarget.name}
          color={retireTarget.color}
          colorHolder={retireTarget.colorHolder}
          onClose={() => setRetireTarget(null)}
          onDone={reload}
        />
      )}
    </section>
  );
}

interface SeriesListProps {
  readonly format: CatalogueFormat;
  readonly onEdit: (series: CatalogueSeries) => void;
  readonly onRetire: (series: CatalogueSeries, mode: RetireMode) => void;
}

function SeriesList({ format, onEdit, onRetire }: SeriesListProps) {
  if (format.series.length === 0) {
    return (
      <p className="mt-3 border-t border-card-border pt-3 text-xs text-muted">
        No series yet. A night is assigned to a series, not to a format.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2 border-t border-card-border pt-3">
      {format.series.map((series) => {
        const isRetired = series.retiredAt !== null;

        return (
          <li
            key={series.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            {/*
              A series name is not a format name, but it is stored verbatim and
              published verbatim under the same spelling rules — so it declares
              its own casing rather than inheriting whatever an ancestor asks
              for. `text-transform` inherits; "we did not ask for one" is not a
              guarantee. It is the argument `FormatMarker`'s docblock makes, and
              it applies to any element in an admin surface that renders a name
              somebody chose.
            */}
            <span
              className={`text-xs font-medium normal-case ${
                isRetired ? "text-muted opacity-50" : "text-foreground"
              }`}
            >
              {series.name}
            </span>

            <span className="text-xs text-muted tabular-nums">
              {format.code}-{series.code}
            </span>

            {isRetired && (
              // The word, not the opacity. Rule 4: a state signalled by a
              // visual channel alone is a state half the readers cannot see.
              <span className="text-xs font-medium text-muted">Retired</span>
            )}

            <span className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                className={SECONDARY_BUTTON}
                onClick={() => onEdit(series)}
              >
                Edit
              </button>

              <button
                type="button"
                className={SECONDARY_BUTTON}
                onClick={() => onRetire(series, isRetired ? "restore" : "retire")}
              >
                {isRetired ? "Restore" : "Retire"}
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface RetiredFormatsListProps {
  readonly formats: readonly CatalogueFormat[];
  readonly takenBy: TakenBy;
}

/**
 * The retired section's rows.
 *
 * Separate from the active list on purpose — a retired format offers a different
 * act and only one of them, so a shared row would carry four controls of which
 * three refuse. And the act it offers is **not an undo**: retiring released the
 * format's colour, so a restore can be refused for a cause that did not exist
 * when the retirement happened. The dialog says so, and the page says so above
 * this list, because a reader who meets only the refusal takes it for a defect.
 */
export function RetiredFormatsList({
  formats,
  takenBy,
}: RetiredFormatsListProps) {
  const router = useRouter();
  const [target, setTarget] = useState<RetireTarget | null>(null);

  return (
    <>
      <ul className="space-y-2">
        {formats.map((format) => {
          const holder = takenBy[format.color.toUpperCase()];

          return (
            <li key={format.id} className={ROW}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {/*
                  The swatch drops to half opacity AND the word `Retired` is on
                  the row. Never opacity alone — rule 4 of the UI spec, and the
                  one rule on this page whose violation is invisible to the
                  person who commits it.
                */}
                <span className="opacity-50">
                  <FormatMarker name={format.name} color={format.color} />
                </span>

                <span className="text-xs text-muted tabular-nums">
                  {format.code}
                </span>

                <span className="text-xs font-medium text-muted">Retired</span>

                <span className="text-xs text-muted tabular-nums">
                  {format.series.length === 1
                    ? "1 series"
                    : `${format.series.length} series`}
                </span>
              </div>

              {holder && (
                <p className="mt-2 text-xs text-muted">
                  Its colour is now held by {holder}. Restoring this format is
                  refused until one of the two takes a different colour.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  onClick={() =>
                    setTarget({
                      subject: "format",
                      mode: "restore",
                      id: format.id,
                      name: format.name,
                      color: format.color,
                      colorHolder: holder,
                    })
                  }
                >
                  Restore
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {target && (
        <RetireFormatDialog
          open
          subject={target.subject}
          mode={target.mode}
          id={target.id}
          name={target.name}
          color={target.color}
          colorHolder={target.colorHolder}
          onClose={() => setTarget(null)}
          onDone={() => router.refresh()}
        />
      )}
    </>
  );
}
