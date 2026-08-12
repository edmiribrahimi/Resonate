import { Fragment, type ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FOCUS_RING } from "@/components/ui/Button";

/**
 * One data array, two branches, one breakpoint — `41-UI-SPEC.md` §8.8.
 *
 * ── This is a consolidation, not a construction (D-41-17) ────────────────────
 *
 * **Six of the seven tables in this tree already render twice** — a real table
 * above a breakpoint and a card list below it. What they do not agree on is
 * *which* breakpoint: four switch at 640 px and two at 1024 px. DS-09's content
 * is therefore the disagreement, not the technique. The technique is already
 * here, six times over, and this file is where it stops being six times.
 *
 * The breakpoint is **768 px** — §2.1's one boundary between the phone form and
 * everything above it. It is written once, in this file, and every table that
 * converts inherits it rather than choosing again.
 *
 * ── The mechanism is TWO TREES, and the alternative was rejected by name ─────
 *
 * The obvious way to make a table read as cards is to override the display of
 * the table, the rows and the cells. **It is not what this does, and the reason
 * is a property of the device this product is read on.**
 *
 * MDN's ARIA `table` page documents that overriding the display of a table's
 * parts removes the native table semantics — the element keeps its tag and
 * loses what the tag meant. WebKit bugs **243474** and **257458** record header
 * and cell association still breaking under that override. This product's
 * primary device is a phone, and on iOS **every** browser is WebKit, so the
 * platform where the override is least reliable is the platform the card layout
 * exists for.
 *
 * With two trees the hidden branch is removed from the accessibility tree
 * outright and **neither tree is ever transformed**. That is not a new property
 * invented here: it is the property the six incumbent dual-renders already have,
 * which is the second reason the extraction is a consolidation.
 *
 * ── And it is ONE component, not two ─────────────────────────────────────────
 *
 * One server-fetched array and one column declaration drive both branches. Two
 * components would mean two lists of columns, and two lists of columns drift —
 * a column added to the table and forgotten on the card is exactly the defect
 * that renders, compiles and looks correct on the machine of whoever added it.
 * Every column below carries both its cell renderer and where it lands on a
 * card, so there is nowhere for the two to disagree.
 *
 * ── Figures carry the data role ──────────────────────────────────────────────
 *
 * A column marked as a figure takes the data face in **both** branches. That
 * face already carries tabular figures from the token layer, so columns of
 * numbers align without anything being asked of the caller. **A descendant must
 * not re-declare the numeric-variant shorthand** — re-declaring it rebuilds the
 * property from scratch and drops the inherited alignment, which is
 * `40-REVIEW.md` WR-10 and is latent in this tree today.
 *
 * ── The one permitted shrink in the whole product ────────────────────────────
 *
 * §6.3's allow-list is **closed at one item**: the row-action buttons in this
 * primitive's desktop branch, which may fall to 36 px on a machine with no
 * touch input at all, and never lower. Nothing else in this product shrinks
 * below 44 px, at any tier, on any device.
 *
 * The primitive does not write that variant itself — it hands the actions
 * renderer a `dense` flag that is true in the desktop branch and false in the
 * card branch, so the caller shrinks on a **fact about which tree it is in**
 * rather than on a guess about the viewport. That branch is hidden below 768 px
 * and therefore never renders on a phone at all; the variant only shrinks it
 * further where no coarse pointer exists. G5 permits the shrunk minimum only in
 * a file that both writes that variant and imports this primitive, which is why
 * the flag and the class live on opposite sides of this boundary.
 *
 * ── What this deliberately does not own ──────────────────────────────────────
 *
 * Sorting, pagination, column resizing and row virtualisation. None of the seven
 * tables has any of them, so building one would be publishing a feature with no
 * consumer — the failure `src/components/ui/Skeleton.tsx` records by existing.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The column declaration — one entry, both branches
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Where a column's value lands on a phone card.
 *
 * The card is not a table with the lines removed: it is a title, the marks that
 * qualify it, and the details underneath. A column says which of those it is,
 * and the primitive lays them out — so two tables' cards look alike without
 * either of them describing a layout.
 *
 *   `title`    — the row's name. First, and the largest thing on the card.
 *   `subtitle` — what identifies the row after its name.
 *   `mark`     — a badge or short state word, opposite the title.
 *   `meta`     — a detail, shown with its label because no header is on screen.
 *   `none`     — desktop only. For a column whose value the card carries some
 *                other way, or which is noise on a small screen.
 */
export type DataCardSlot = "title" | "subtitle" | "mark" | "meta" | "none";

export interface DataColumn<Row> {
  /** Stable within one table. Used as the React key for both branches' cells. */
  readonly key: string;
  /** The `<th>`. Not rendered on a card — see `cardLabel`. */
  readonly header: ReactNode;
  /** The `<td>`, and the value used on the card. One renderer, both branches. */
  readonly cell: (row: Row) => ReactNode;
  /** Defaults to `meta`. */
  readonly card?: DataCardSlot;
  /**
   * The word shown before the value in the `meta` slot.
   *
   * A card has no header row, so a bare value is an unlabelled fact. Defaults to
   * the header when the header is a plain string, which it is for every column
   * in this tree today.
   */
  readonly cardLabel?: string;
  /** A figure column: takes the data face in both branches. See the docblock. */
  readonly figure?: boolean;
  /** Trailing alignment for a figure column in the table branch. */
  readonly align?: "start" | "end";
  /** A width utility for the `<th>` and `<td>`. Desktop only. */
  readonly columnClassName?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The three optional apparatus — selection, expansion, row actions
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DataSelection<Row> {
  /** Whether this row may be selected at all. */
  readonly isSelectable: (row: Row) => boolean;
  readonly isSelected: (row: Row) => boolean;
  readonly onToggleRow: (row: Row) => void;
  /** Whether every selectable row is selected — the header box's state. */
  readonly allSelected: boolean;
  readonly onToggleAll: () => void;
  /**
   * The accessible name of one row's box. It names the row, because the column
   * header cannot: "select" repeated down a column names nothing.
   */
  readonly rowLabel: (row: Row) => string;
  /** The accessible name of the header box. */
  readonly allLabel: string;
  /**
   * Prefix for the generated input ids.
   *
   * The two branches render the same rows, so each row produces **two** boxes.
   * Two elements sharing an id would make one label address the wrong box, and
   * the wrong box here selects the wrong person. The branch is part of the id.
   */
  readonly idPrefix: string;
}

export interface DataExpansion<Row> {
  readonly isExpanded: (row: Row) => boolean;
  readonly onToggle: (row: Row) => void;
  /** The detail region, rendered under the row in both branches. */
  readonly render: (row: Row) => ReactNode;
  /** The accessible name of the disclosure control. Names the row. */
  readonly label: (row: Row) => string;
}

export interface DataActions<Row> {
  readonly header: ReactNode;
  /**
   * `dense` is **true only in the desktop branch**, and is the flag §6.3's one
   * permitted shrink keys off. See the docblock.
   */
  readonly render: (row: Row, dense: boolean) => ReactNode;
}

interface DataTableProps<Row> {
  readonly rows: readonly Row[];
  readonly columns: readonly DataColumn<Row>[];
  readonly rowKey: (row: Row) => string;
  /**
   * What the table is, for somebody who cannot see it. Rendered as a caption
   * that is available to assistive technology and not to the eye — a table
   * whose only description is the page heading above it is a table announced as
   * "table".
   */
  readonly caption: string;
  /** Shown in both branches when there are no rows. §8.11's empty contract. */
  readonly empty: ReactNode;
  readonly selection?: DataSelection<Row>;
  readonly expansion?: DataExpansion<Row>;
  readonly actions?: DataActions<Row>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The shared pieces
 * ──────────────────────────────────────────────────────────────────────────── */

/** The data face. One name, read by both branches, so they cannot disagree. */
const FIGURE = "font-mono";

/** §8.11's empty-state contract — a class agreement, never a component. */
const EMPTY_BLOCK = "px-6 py-12 text-center text-sm text-muted";

const HEADER_CELL = "px-4 py-3 text-xs font-semibold text-muted";
const BODY_CELL = "px-4 py-3 text-sm text-ink-2";

function slotOf<Row>(column: DataColumn<Row>): DataCardSlot {
  return column.card ?? "meta";
}

function labelOf<Row>(column: DataColumn<Row>): string | null {
  if (column.cardLabel !== undefined) return column.cardLabel;
  return typeof column.header === "string" ? column.header : null;
}

/**
 * The disclosure control, in both branches.
 *
 * It is inside the primitive, so it carries the 44 px minimum here rather than
 * at the call site, and G5 reads it as primitive-rendered.
 */
function DisclosureCaret({
  expanded,
  label,
  onToggle,
  className = "",
}: {
  expanded: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={label}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:text-ink ${FOCUS_RING} ${className}`.trimEnd()}
    >
      <svg
        className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The component — two trees, neither ever transformed
 * ──────────────────────────────────────────────────────────────────────────── */

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  caption,
  empty,
  selection,
  expansion,
  actions,
}: DataTableProps<Row>) {
  const columnCount =
    (selection ? 1 : 0) +
    (expansion ? 1 : 0) +
    columns.length +
    (actions ? 1 : 0);

  const titles = columns.filter((c) => slotOf(c) === "title");
  const subtitles = columns.filter((c) => slotOf(c) === "subtitle");
  const marks = columns.filter((c) => slotOf(c) === "mark");
  const metas = columns.filter((c) => slotOf(c) === "meta");

  return (
    <>
      {/* The table branch. Hidden below 768px, and therefore never on a phone. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-raised">
              {selection ? (
                <th scope="col" className="w-14 px-4 py-3">
                  <Checkbox
                    id={`${selection.idPrefix}-table-all`}
                    label={selection.allLabel}
                    labelHidden
                    checked={selection.allSelected}
                    onChange={selection.onToggleAll}
                  />
                </th>
              ) : null}
              {expansion ? <th scope="col" className="w-14 px-2 py-3" /> : null}
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${HEADER_CELL} ${
                    column.align === "end" ? "text-right" : ""
                  } ${column.columnClassName ?? ""}`.trimEnd()}
                >
                  {column.header}
                </th>
              ))}
              {actions ? (
                <th scope="col" className={HEADER_CELL}>
                  {actions.header}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row);
              const expanded = expansion?.isExpanded(row) ?? false;
              return (
                <Fragment key={key}>
                  <tr
                    className={`border-b border-line ${expanded ? "bg-raised" : ""}`}
                  >
                    {selection ? (
                      <td className="w-14 px-4 py-3">
                        {selection.isSelectable(row) ? (
                          <Checkbox
                            id={`${selection.idPrefix}-table-${key}`}
                            label={selection.rowLabel(row)}
                            labelHidden
                            checked={selection.isSelected(row)}
                            onChange={() => selection.onToggleRow(row)}
                          />
                        ) : null}
                      </td>
                    ) : null}
                    {expansion ? (
                      <td className="w-14 px-2 py-3">
                        <DisclosureCaret
                          expanded={expanded}
                          label={expansion.label(row)}
                          onToggle={() => expansion.onToggle(row)}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${BODY_CELL} ${column.figure ? FIGURE : ""} ${
                          column.align === "end" ? "text-right" : ""
                        } ${column.columnClassName ?? ""}`.trimEnd()}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                    {actions ? (
                      <td className={BODY_CELL}>{actions.render(row, true)}</td>
                    ) : null}
                  </tr>
                  {/* The detail row, immediately under the row it belongs to.
                      A cell spanning every column is the markup a detail region
                      takes inside a table, and it is what the six incumbent
                      dual-renders already do — putting the details anywhere else
                      would separate a disclosure from what it disclosed. */}
                  {expansion && expanded ? (
                    <tr className="border-b border-line">
                      <td colSpan={columnCount} className="bg-raised px-8 py-3">
                        {expansion.render(row)}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className={EMPTY_BLOCK}>
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* The card branch. Shown below 768px, and removed above it. */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const key = rowKey(row);
          const expanded = expansion?.isExpanded(row) ?? false;
          return (
            <Card key={key}>
              <div className="flex items-start gap-3">
                {selection && selection.isSelectable(row) ? (
                  <Checkbox
                    id={`${selection.idPrefix}-card-${key}`}
                    label={selection.rowLabel(row)}
                    labelHidden
                    checked={selection.isSelected(row)}
                    onChange={() => selection.onToggleRow(row)}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  {titles.map((column) => (
                    <p
                      key={column.key}
                      className={`truncate text-sm font-semibold text-ink ${
                        column.figure ? FIGURE : ""
                      }`.trimEnd()}
                    >
                      {column.cell(row)}
                    </p>
                  ))}
                  {subtitles.map((column) => (
                    <p
                      key={column.key}
                      className={`truncate text-sm text-muted ${
                        column.figure ? FIGURE : ""
                      }`.trimEnd()}
                    >
                      {column.cell(row)}
                    </p>
                  ))}
                </div>
                {marks.length > 0 ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {marks.map((column) => (
                      <span key={column.key}>{column.cell(row)}</span>
                    ))}
                  </div>
                ) : null}
                {expansion ? (
                  <DisclosureCaret
                    expanded={expanded}
                    label={expansion.label(row)}
                    onToggle={() => expansion.onToggle(row)}
                    className="shrink-0"
                  />
                ) : null}
              </div>

              {metas.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {metas.map((column) => {
                    const label = labelOf(column);
                    return (
                      <span key={column.key}>
                        {label ? `${label}: ` : null}
                        <span className={column.figure ? FIGURE : undefined}>
                          {column.cell(row)}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ) : null}

              {expansion && expanded ? (
                <div className="mt-3 border-t border-line pt-3">
                  {expansion.render(row)}
                </div>
              ) : null}

              {actions ? (
                <div className="mt-3 border-t border-line pt-3">
                  {actions.render(row, false)}
                </div>
              ) : null}
            </Card>
          );
        })}
        {/* The card branch's empty state takes the CARD SHELL'S OWN padding,
            not the empty contract's larger vertical step. A caller cannot
            override a primitive's padding by appending a second padding
            utility: both are the same property at the same specificity, so the
            winner is whichever Tailwind emits last — the collision measured
            inside `Skeleton.tsx`, where a default width silently overrode every
            caller for the whole life of the file. The 24px the shell already
            carries is the honest answer; the difference from the table
            branch's 48px is one step of the same ladder. */}
        {rows.length === 0 ? (
          <Card className="text-center text-sm text-muted">{empty}</Card>
        ) : null}
      </div>
    </>
  );
}
