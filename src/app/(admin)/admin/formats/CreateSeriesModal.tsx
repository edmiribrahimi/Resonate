"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createSeries,
  updateSeries,
  type CatalogueRefusal,
} from "@/app/(admin)/admin/formats/actions";
import FormatMarker from "@/components/formats/FormatMarker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

/**
 * Create or rename a series — the second dialog the catalogue surface mounts.
 *
 * ── The shell is no longer here ──────────────────────────────────────────────
 *
 * It was copied from `CreateVenueModal.tsx`, and plan 41-09 extracted that same
 * shell into `src/components/ui/Dialog.tsx` from the same ancestor. The panel,
 * the scrim, the sheet form below 768 px, the light-dismiss handler, the
 * open/close effect and a 44 × 44 close control arrive with the primitive; what
 * stays here is the form, its ten refusals, and the two constraints below that
 * are the reason this file reads the way it does. Its width is `lg` because
 * §8.3's closed list names it there.
 *
 * ── The format is shown, never chosen ────────────────────────────────────────
 *
 * A series belongs to a format for its whole life. `updateSeries` takes **no
 * format argument**, and beneath it `event_parties_series_format_fk` is a
 * composite key that makes the divergence unwritable once the series has nights.
 * But the database's half is **conditional** — a series with no nights yet would
 * be repointed happily — so a control here that offered the choice would open
 * the operation for exactly the rows where nobody would notice.
 *
 * So there is no such control: on creation the format arrives as a prop and is
 * rendered as a fixed label, and while editing it is not on the form at all. A
 * person meets *"this series belongs to this format"* as a property of the form,
 * instead of meeting a constraint name after pressing save.
 *
 * The label reuses `FormatMarker` rather than printing the name in a fresh
 * element. That component is the one place that carries `normal-case`
 * explicitly, and this dialog is mounted on an admin surface where a transformed
 * ancestor is entirely ordinary — a second element rendering a format name would
 * be a second element with no guarantee about its own casing.
 *
 * ── The helper text under the name is the field's contract ───────────────────
 *
 * The public name of a series is **the one field in this phase that publishes**:
 * it is a stored string rendered on every night the series carries. A series
 * named after a venue therefore publishes that venue every time one of its
 * nights is visible.
 *
 * Two things hold that line and they are not substitutes. The structural one is
 * the § S2 fallback: when any night on a card is secret, the marker degrades to
 * the **format** name, so no series name can become an accidental reveal path.
 * The one below the field is the other: a person naming a series should be told
 * before they type, not protected after they have. This is why the helper-text
 * pattern is introduced here at all — the forms already in the tree use
 * placeholders only.
 *
 * And there is deliberately **no filter on the name's content**. No test can
 * tell a venue from a word; a rejected string teaches a workaround rather than a
 * question; and the fallback already holds. A filter would buy the appearance of
 * a guarantee and spend the real one (`venue-secrecy.md`).
 *
 * ── Refusals arrive as values ────────────────────────────────────────────────
 *
 * Next redacts the message of an error thrown out of a Server Action in a
 * production build (`src/lib/capabilities/server.ts:59-63`), so a client that
 * branched on message text would work under `next dev` and print a blank where
 * it counts. Every export of `admin/formats/actions.ts` returns
 * `CatalogueResult`; this form branches on `result.reason`. A duplicate code
 * inside the format and a retired format that cannot take a new series are two
 * different failures, and the person reading the screen needs to know which one
 * happened.
 *
 * Nothing here says anything about what a format plays (`sound-manifesto.md`).
 */

/**
 * The refusals `createSeries` and `updateSeries` can actually return, read out
 * of the action module return by return.
 *
 * The assertion below turns red if one of these stops existing in
 * `CatalogueRefusal`. A member *added* to the union reaches the `default` branch
 * instead — and that branch prints the value itself, so an unforeseen cause is
 * still distinguishable from the ten below rather than hidden behind a sentence
 * written for something else.
 */
type SeriesFormRefusal =
  | "invalid_id"
  | "invalid_name"
  | "invalid_code"
  | "format_not_found"
  | "format_retired"
  | "series_not_found"
  | "duplicate_series_code"
  | "duplicate_refused_by_database"
  | "precheck_failed"
  | "write_failed";

const _refusalsAreReal: readonly CatalogueRefusal[] =
  [] as readonly SeriesFormRefusal[];
void _refusalsAreReal;

/**
 * The form's name, so the submit button can address it from outside.
 *
 * The primitive keeps the actions in their own region, above the navigation
 * clearance and outside the scrolling body, so the buttons are not descendants
 * of the `<form>`. `form="…"` is HTML's form-owner attribute and is the
 * mechanism for exactly that.
 */
const FORM_ID = "series-form";

type SeriesField = "name" | "code" | "form";

interface Refusal {
  readonly field: SeriesField;
  readonly sentence: string;
}

interface FormatRef {
  readonly id: string;
  /** Rendered verbatim through `FormatMarker`. */
  readonly name: string;
  /** `#RRGGBB` from the catalogue row. */
  readonly color: string;
}

interface SeriesRow {
  readonly id: string;
  readonly name: string;
  readonly code: string;
}

interface CreateSeriesModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved: (id: string) => void;
  /** The format this series belongs to. Never editable — see the docblock. */
  readonly format: FormatRef;
  /** Present when editing, absent when creating. */
  readonly series?: SeriesRow;
}

export default function CreateSeriesModal({
  open,
  onClose,
  onSaved,
  format,
  series,
}: CreateSeriesModalProps) {
  const editing = series !== undefined;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Seeded when the dialog OPENS and only then, through a ref: a parent that
  // rebuilt the row object on every render would otherwise re-seed the fields
  // mid-typing and discard what the person had written.
  const seriesRef = useRef(series);
  seriesRef.current = series;

  useEffect(() => {
    if (!open) return;
    const row = seriesRef.current;
    setName(row?.name ?? "");
    setCode(row?.code ?? "");
    setRefusal(null);
  }, [open]);

  function close() {
    setRefusal(null);
    onClose();
  }

  /** One sentence per cause. `Could not save.` is followed by the reason, never
   *  by a stand-in for one. */
  function describe(reason: CatalogueRefusal): Refusal {
    switch (reason) {
      case "invalid_name":
        return {
          field: "name",
          sentence: "Give the series a name — up to 120 characters.",
        };
      case "invalid_code":
        return {
          field: "code",
          sentence:
            "A code is two to twelve characters, letters A–Z and digits only.",
        };
      case "duplicate_series_code":
        return {
          field: "code",
          sentence: `Another series of ${format.name} already holds this code. A series number runs per series, so two of them cannot share one.`,
        };
      case "format_retired":
        return {
          field: "form",
          sentence: `Could not save. ${format.name} is retired, so it cannot take a new series. Restore the format first, or choose another one.`,
        };
      case "format_not_found":
        return {
          field: "form",
          sentence:
            "Could not save. That format is no longer in the catalogue — it may have been removed while this dialog was open.",
        };
      case "series_not_found":
        return {
          field: "form",
          sentence:
            "Could not save. This series is no longer in the catalogue — it may have been removed while this dialog was open.",
        };
      case "invalid_id":
        return {
          field: "form",
          sentence:
            "Could not save. This series could not be identified. Close this dialog, reopen it from the list, and try again.",
        };
      case "duplicate_refused_by_database":
        return {
          field: "code",
          sentence:
            "Could not save. Another save took this code in the same instant. Choose a different one.",
        };
      case "precheck_failed":
        return {
          field: "form",
          sentence:
            "Could not save. A check that runs before the write could not be performed, so nothing was attempted and nothing was stored.",
        };
      case "write_failed":
        return {
          field: "form",
          sentence:
            "Could not save. The database refused the write. Nothing was stored.",
        };
      default:
        return {
          field: "form",
          sentence: `Could not save. The catalogue refused this with "${reason}", which this form does not expect. Nothing was stored.`,
        };
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    setRefusal(null);
    setIsSubmitting(true);

    try {
      const result = series
        ? await updateSeries(series.id, name, code)
        : await createSeries(format.id, name, code);

      if (!result.ok) {
        // What the person typed stays on screen: they arrived with a name and a
        // code from somewhere, and clearing them would lose the only copy.
        setRefusal(describe(result.reason));
        return;
      }

      onSaved(result.id);
      close();
    } catch {
      // The capability guard throws and the network throws, and a production
      // build redacts both messages — so the branch is on the SHAPE of the
      // failure, and each branch names a different cause.
      const unreachable =
        typeof navigator !== "undefined" && navigator.onLine === false;

      setRefusal({
        field: "form",
        sentence: unreachable
          ? "Could not save. The request never reached the server. Nothing was stored — check the connection and try again."
          : "Could not save. The server refused the request. This account may no longer hold permission to manage the catalogue; reload the page and check. Nothing was stored.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const nameError = refusal?.field === "name" ? refusal.sentence : null;
  const codeError = refusal?.field === "code" ? refusal.sentence : null;
  const formError = refusal?.field === "form" ? refusal.sentence : null;

  return (
    <Dialog
      open={open}
      onClose={close}
      title={editing ? "Edit series" : "Add series"}
      size="lg"
      status={formError ? { tone: "crit", message: formError } : null}
      actions={
        /*
          Outside the `<form>` element, in the primitive's actions region — so
          the submit addresses the form by name through HTML's form-owner
          attribute. Enter inside a field and the button reach the same handler.
        */
        <div className="flex gap-3">
          <Button
            type="submit"
            form={FORM_ID}
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : editing ? "Save series" : "Add series"}
          </Button>
          <Button
            variant="secondary"
            data-initial-focus
            onClick={close}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {/*
          The format, as a label. Not a select, not a combobox, not a disabled
          control that could be re-enabled by deleting one attribute — there is
          nothing here to re-enable.
        */}
        {!editing && (
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-ink-2">Format</span>
            <div className="flex min-h-11 items-center rounded-xl border border-line bg-raised px-4 py-3">
              <FormatMarker name={format.name} color={format.color} />
            </div>
            <p className="text-xs text-muted">
              A series belongs to one format for its whole life, so this does not
              change later.
            </p>
          </div>
        )}

        {/* Public name — the one field in this phase that publishes. */}
        <Input
          id="series-name"
          label="Public name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="RamaDub x <venue>"
          maxLength={120}
          hint="This name is shown publicly on every night in this series. Do not put a venue in it unless that venue is already public for every night in the series."
          error={nameError ?? undefined}
          className="normal-case"
        />

        {/* Code — internal, unique within the format. */}
        <Input
          id="series-code"
          label="Code (internal — never shown to visitors)"
          type="text"
          value={code}
          // The one field with a casing filter, because it is the one field a
          // visitor never sees.
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC"
          maxLength={12}
          hint="Two to twelve characters, letters and digits. Unique inside this format."
          error={codeError ?? undefined}
          className="uppercase tracking-wide"
        />
      </form>
    </Dialog>
  );
}
