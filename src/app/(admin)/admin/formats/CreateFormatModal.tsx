"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  createFormat,
  updateFormat,
  type CatalogueRefusal,
} from "@/app/(admin)/admin/formats/actions";
import ColorSwatchPicker, {
  catalogueColorLabel,
} from "@/app/(admin)/admin/formats/ColorSwatchPicker";

/**
 * Create or rename a format — the `<dialog>` the catalogue surface mounts.
 *
 * ── The one branch of `CreateVenueModal` this file deliberately does not copy ──
 *
 * `CreateVenueModal.tsx:119-123` catches a thrown error and renders its own
 * message straight onto the screen — the property is deliberately not spelled
 * here, so the check that guards this file cannot go green on the sentence
 * forbidding the thing. **Next redacts the message of an error thrown out of a Server
 * Action in a production build** (`src/lib/capabilities/server.ts:59-63`), so a
 * client that branches on message text works under `next dev` and stops working
 * exactly where it matters. What reaches the person is a blank.
 *
 * So the refusal travels as a **returned value**: every export of
 * `admin/formats/actions.ts` returns `CatalogueResult`, and this form branches on
 * `result.reason` — a `CatalogueRefusal`, which survives the production boundary
 * because it is data, not an error message.
 *
 * Two failures still arrive as **throws**, because the guard throws:
 * `assertCatalogueManage()` refuses a caller without `catalogue.manage`, and the
 * network can fail before any server code runs. Their messages are redacted too,
 * so the `catch` below branches on the **shape** of the failure rather than its
 * text — and produces two different sentences, neither of which is shared with
 * the duplicate-code refusal. Three causes, three sentences, which is the
 * requirement (`meta-gates.md` records the newsletter form as the precedent not
 * to repeat, and this product has no error tracking, so what this form prints is
 * the only place the failure exists for a human).
 *
 * ── This form cannot announce a format ───────────────────────────────────────
 *
 * There is no control here for making a format appear in the public filter, and
 * the absence is D-36-17. Existing in the catalogue and being announced are two
 * separate acts: if a save performed the second, a format prepared weeks early
 * would announce itself the moment somebody pressed save — the product making
 * the announcement instead of a person. The publication act is a **separate
 * export with its own name**, called from the catalogue surface, and neither its
 * name nor its argument appears in this file.
 *
 * ── The name renders publicly, verbatim ──────────────────────────────────────
 *
 * A format name is a stored string that reaches every visitor, and one of the
 * four opens in lower case while two more are CamelCase. Nothing in this file
 * transforms the name field, and the placeholder shows a spelling rather than a
 * description. The code, by contrast, is internal: it is half of a sigla and
 * never reaches a public surface, which is why it is the one field with a
 * casing filter.
 *
 * Nothing here — no label, no placeholder, no helper — says anything about what
 * a format plays. Three of the four have no written manifesto and this phase
 * does not write one in a placeholder (`sound-manifesto.md`).
 */

/**
 * The refusals `createFormat` and `updateFormat` can actually return.
 *
 * Read out of `admin/formats/actions.ts` return by return, not assumed: the two
 * exports between them produce these twelve. The members of `CatalogueRefusal`
 * that are missing belong to the series exports, to retirement and to the
 * publication act — none of which this form calls.
 *
 * **What this buys and what it does not.** A member renamed or removed from
 * `CatalogueRefusal` turns the assertion below red, so the table cannot drift
 * out of the union. A member *added* to the union does not: it reaches the
 * `default` branch instead. That branch is not a shared bucket — it prints the
 * refusal's own value, so an unforeseen cause identifies itself on screen rather
 * than hiding behind a sentence written for something else.
 *
 * The stricter form — a `Record` total over `CatalogueRefusal` — was considered
 * and refused: it would require writing into this file the exact token that the
 * acceptance check for *"this form cannot announce a format"* forbids, and a
 * check whose only match is the sentence forbidding the thing is a check that
 * gets ignored the third time it goes red
 * (`[id]/assignments/actions.ts:58-62`).
 */
type FormatFormRefusal =
  | "invalid_id"
  | "invalid_name"
  | "slug_empty"
  | "invalid_code"
  | "invalid_color"
  | "invalid_sort_order"
  | "format_not_found"
  | "color_taken"
  | "duplicate_code"
  | "duplicate_refused_by_database"
  | "precheck_failed"
  | "write_failed";

/** Red the day a member above stops existing in `CatalogueRefusal`. */
const _refusalsAreReal: readonly CatalogueRefusal[] =
  [] as readonly FormatFormRefusal[];
void _refusalsAreReal;

/** Which field a refusal belongs to. `form` means none of the three. */
type FormatField = "name" | "code" | "color" | "form";

interface Refusal {
  readonly field: FormatField;
  readonly sentence: string;
}

interface FormatRow {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly color: string;
  /**
   * Carried through untouched. Ordering the catalogue is the surface's act, not
   * this form's — but `updateFormat` takes it, so the current value travels here
   * rather than being invented as a zero on every save.
   */
  readonly sortOrder: number;
}

interface CreateFormatModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** The row that was written. The surface decides what to do next. */
  readonly onSaved: (id: string) => void;
  /** Present when editing, absent when creating. */
  readonly format?: FormatRow;
  /**
   * Colours held by other **active** formats, keyed by upper-case hex, valued by
   * the holder's name.
   *
   * The uniqueness index is partial on `retired_at IS NULL`, so a retired
   * format's colour is free and must not appear here. The map is what lets the
   * refusal name the holder: the action returns `color_taken` **without** a name,
   * on purpose, so that a format's name never travels inside a refusal value.
   */
  readonly takenBy?: Readonly<Record<string, string>>;
}

export default function CreateFormatModal({
  open,
  onClose,
  onSaved,
  format,
  takenBy,
}: CreateFormatModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const editing = format !== undefined;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  // Seed from the row being edited each time the dialog OPENS, and only then.
  //
  // The row is read through a ref rather than named in the dependency array on
  // purpose: a parent that rebuilds the object on every render would otherwise
  // re-seed the fields mid-typing and throw away what the person had written —
  // and preserving that is the whole point of the refusal path below.
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    if (!open) return;
    const row = formatRef.current;
    setName(row?.name ?? "");
    setCode(row?.code ?? "");
    setColor(row?.color ?? null);
    setRefusal(null);
  }, [open]);

  const handleDialogClose = useCallback(() => {
    onClose();
  }, [onClose]);

  function close() {
    setRefusal(null);
    onClose();
  }

  /**
   * One sentence per cause, and each one names what happened.
   *
   * `Could not save.` opens every failure that is not a field's fault, and what
   * follows it is the reason — never a stand-in for one.
   */
  function describe(reason: CatalogueRefusal, chosenColor: string | null): Refusal {
    switch (reason) {
      case "invalid_name":
        return {
          field: "name",
          sentence: "Give the format a name — up to 120 characters.",
        };
      case "slug_empty":
        return {
          field: "name",
          sentence:
            "This name produces no web address. Use at least one Latin letter or digit in it.",
        };
      case "invalid_code":
        return {
          field: "code",
          sentence:
            "A code is two to twelve characters, letters A–Z and digits only.",
        };
      case "duplicate_code":
        return {
          field: "code",
          sentence:
            "Another format already holds this code. A code is never re-issued, so pick a different one.",
        };
      case "invalid_color":
        return {
          field: "color",
          sentence: "Pick a colour. Every format needs one of its own.",
        };
      case "color_taken": {
        const label = chosenColor ? catalogueColorLabel(chosenColor) : "That colour";
        const holder = chosenColor
          ? takenBy?.[chosenColor.toUpperCase()]
          : undefined;
        return {
          field: "color",
          sentence: holder
            ? `${label} is already used by ${holder}. Pick another.`
            : `${label} is already used by another active format. Pick another.`,
        };
      }
      case "invalid_id":
        return {
          field: "form",
          sentence:
            "Could not save. This format could not be identified. Close this dialog, reopen it from the list, and try again.",
        };
      case "format_not_found":
        return {
          field: "form",
          sentence:
            "Could not save. This format is no longer in the catalogue — it may have been removed while this dialog was open.",
        };
      case "invalid_sort_order":
        return {
          field: "form",
          sentence:
            "Could not save. The position this format holds in the list is not a whole number. Reload the page and try again.",
        };
      case "duplicate_refused_by_database":
        return {
          field: "form",
          sentence:
            "Could not save. Another save took this code or this colour in the same instant. Reopen the form and choose again.",
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
        // Not a bucket: the value prints itself, so a cause nobody foresaw is
        // still distinguishable from the twelve above.
        return {
          field: "form",
          sentence: `Could not save. The catalogue refused this with "${reason}", which this form does not expect. Nothing was stored.`,
        };
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    // The colour is required, and the refusal is produced HERE — before any
    // request. `checkColor` in the action refuses the same absence at the
    // server, and `formats_color_hex_check` refuses it again at the row: three
    // halves that do not substitute for each other. This one exists so a person
    // reads an instruction instead of waiting for a round trip to tell them
    // something the form already knew.
    if (!color) {
      setRefusal({
        field: "color",
        sentence: "Pick a colour. Every format needs one of its own.",
      });
      return;
    }

    setRefusal(null);
    setIsSubmitting(true);

    try {
      const result = format
        ? await updateFormat(format.id, name, color, format.sortOrder)
        : await createFormat(name, code, color);

      if (!result.ok) {
        // What the person typed stays in the fields: they came here with a name
        // and a code from somewhere, and clearing them would lose the only copy
        // on screen.
        setRefusal(describe(result.reason, color));
        return;
      }

      onSaved(result.id);
      close();
    } catch (err) {
      // The guard throws; the network throws. Both messages are redacted in a
      // production build, so neither can be read — the branch is on the SHAPE of
      // the failure, and each branch names a different cause.
      const unreachable =
        err instanceof TypeError ||
        (typeof navigator !== "undefined" && navigator.onLine === false);

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
  const colorError = refusal?.field === "color" ? refusal.sentence : null;
  const formError = refusal?.field === "form" ? refusal.sentence : null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-dvh w-dvw max-h-none max-w-none bg-black/80 backdrop:bg-transparent p-0"
      onClose={handleDialogClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-card-border bg-background p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground normal-case">
              {editing ? "Edit format" : "Add format"}
            </h2>
            <button
              type="button"
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {formError && (
            <div
              id="format-form-error"
              role="alert"
              className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3"
            >
              <p className="text-sm text-red-400">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name — published verbatim. No transform, here or anywhere. */}
            <div className="space-y-2">
              <label
                htmlFor="format-name"
                className="block text-sm font-medium text-foreground"
              >
                Name
              </label>
              <input
                id="format-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MotionLab"
                maxLength={120}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "format-name-error" : undefined}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 text-sm normal-case"
              />
              <p className="text-xs text-muted">
                Shown to visitors exactly as written. Capitals are kept.
              </p>
              {nameError && (
                <p id="format-name-error" className="text-sm text-red-400">
                  {nameError}
                </p>
              )}
            </div>

            {/* Code — internal, and the label says so. */}
            <div className="space-y-2">
              <label
                htmlFor="format-code"
                className="block text-sm font-medium text-foreground"
              >
                Code (internal — never shown to visitors)
              </label>
              <input
                id="format-code"
                type="text"
                value={code}
                // The one field with a casing filter, because it is the one
                // field a visitor never sees.
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="MTNLB"
                maxLength={12}
                readOnly={editing}
                aria-invalid={codeError ? true : undefined}
                aria-describedby={
                  codeError
                    ? "format-code-error"
                    : editing
                      ? "format-code-help"
                      : undefined
                }
                className={`w-full rounded-xl border border-card-border px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50 text-sm uppercase tracking-wide ${
                  editing ? "bg-card opacity-70" : "bg-background"
                }`}
              />
              {editing && (
                <p id="format-code-help" className="text-xs text-muted">
                  A code is half of a sigla that is already on material, so it
                  does not change once the format exists.
                </p>
              )}
              {codeError && (
                <p id="format-code-error" className="text-sm text-red-400">
                  {codeError}
                </p>
              )}
            </div>

            {/* Colour — required, six flat choices, no gradient reachable. */}
            <div className="space-y-2">
              <span
                id="format-color-label"
                className="block text-sm font-medium text-foreground"
              >
                Colour
              </span>
              <ColorSwatchPicker
                value={color}
                onChange={(hex) => {
                  setColor(hex);
                  if (refusal?.field === "color") setRefusal(null);
                }}
                takenBy={takenBy}
                labelledBy="format-color-label"
                describedBy={colorError ? "format-color-error" : undefined}
                invalid={colorError !== null}
                disabled={isSubmitting}
              />
              {colorError && (
                <p id="format-color-error" className="text-sm text-red-400">
                  {colorError}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? "Saving..."
                  : editing
                    ? "Save format"
                    : "Add format"}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={isSubmitting}
                className="rounded-full border border-card-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
