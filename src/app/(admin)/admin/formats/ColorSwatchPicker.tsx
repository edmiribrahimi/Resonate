"use client";

import { useRef, type KeyboardEvent } from "react";

import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The catalogue's colour control — six flat choices, one of them deliberately
 * neutral, and no way at all to express a gradient.
 *
 * ── Why a fixed set and not a colour input ────────────────────────────────────
 *
 * The sunset gradient is **SunSet's exclusive signature**
 * (`brand-visual-system.md`, gate *il colore non si eredita*): a format that
 * borrowed it would be wearing another format's identity, and the mistake would
 * be published on the first material that used it.
 *
 * The way this file honours that rule is not by validating against the gradient
 * afterwards. It is by offering **flat swatches only**, so there is no input
 * through which a gradient could arrive: no free hex field, no picker, no
 * second channel. A constraint that cannot be expressed cannot be violated, and
 * that is worth more than a check somebody could later relax.
 *
 * The gradient's own CSS declaration is **not written in this file**, and the
 * omission is deliberate: the acceptance grep that guards this rule would then
 * match the very sentence forbidding the thing — the defect
 * `[id]/assignments/actions.ts:58-62` already records, where *a check whose only
 * match is its own prohibition is a check that gets ignored the third time it
 * goes red*.
 *
 * ── A colour is mandatory, and "mandatory" must not mean "borrowed" ───────────
 *
 * D-36-11 makes a colour required at creation. That alone would push a format
 * with no decided palette into taking somebody else's — which is exactly what
 * `brand-visual-system.md` forbids for MotionLab, whose palette is not decided.
 * So the sixth choice is a **neutral grey**, and it is not filler: it is the
 * answer a format gives when the honest answer is *not yet decided*.
 *
 * ── The figures below were measured, and their ground is named ───────────────
 *
 * Every ratio quoted here is from `36-UI-SPEC.md` § *The palette offered by the
 * catalogue colour picker*, measured 2026-08-10 against **`#141414`**, the card
 * ground of the time, with the WCAG 2.x relative-luminance formula. This control
 * is mounted on a dialog panel whose ground is **`--surface` `#140D20`**, which
 * is darker — and a darker ground can only raise the ratio of a light
 * foreground, never lower it. The ground is stated because a figure whose
 * ground is unnamed cannot be reproduced.
 *
 * ── This file is a NAMED EXEMPTION in two gates, and stays one ───────────────
 *
 * `verify-conversion.mjs` and `verify-semantic-separation.mjs` both exempt this
 * exact path by name, for one reason: **a format's identification colour is
 * data on a catalogue row, not a CSS token.** It is chosen by a person, stored
 * per row, and applied through an inline style, so that changing a format's
 * colour is not a deploy (D-36-12). Plan 41-09 converted this file's layout,
 * its focus expression and its token names and **left every hex exactly where
 * it was**. Introducing a `--sem-*` or `--accent` fallback for a format colour
 * would make a state start looking like a format, which is the boundary the
 * exemption exists to hold.
 *
 * ── Colour is never the only channel ─────────────────────────────────────────
 *
 * The selected swatch carries a 2px ring **and a check glyph**; a swatch already
 * held by another active format carries a slash glyph **and** the words
 * `used by {Name}` in its accessible name. Signalling the state of a *colour*
 * control with colour would be the one failure this control cannot afford.
 *
 * ── Nothing here says what a format sounds like ──────────────────────────────
 *
 * Not a label, not a comment. Three of the four formats have no written sound
 * manifesto and this phase does not write one in a swatch name
 * (`sound-manifesto.md`).
 */

/**
 * The six keys, declared as a union so the `Record` below is **total**.
 *
 * The discipline is `EventForm.tsx:100-104`'s and it is stated as a contract at
 * `[id]/assignments/actions.ts:72-82`: a seventh choice cannot reach the
 * interface without a label, and a choice removed here leaves an unreachable
 * one. Both halves fail the build rather than shipping.
 */
export type CatalogueColorKey =
  | "amber"
  | "orange"
  | "pink"
  | "pinkSoft"
  | "violet"
  | "neutral";

interface CatalogueColor {
  /** `#RRGGBB`, upper case — the form `formats_color_hex_check` admits. */
  readonly hex: string;
  /**
   * What a person reads and hears: the name of a colour, and nothing else.
   *
   * The words that would be wrong here are not repeated in this comment — a
   * check whose only match is its own prohibition is a check that gets ignored.
   * See the docblock's last paragraph for the rule.
   */
  readonly label: string;
}

/**
 * The offered palette. Six against four formats is **deliberate slack**.
 *
 * When the slack runs out, extending this table is a decision — it means a new
 * identification colour enters the brand — and it is taken by whoever owns the
 * visual system, not by whoever happens to be adding the fifth format. Adding a
 * seventh entry here silently is the workaround this comment exists to refuse.
 *
 * `#5B2A9E` was measured at **1.99:1** against `#141414` and **excluded** for
 * failing the 3:1 that WCAG 1.4.11 asks of a meaningful graphical object. It is
 * recorded here so the next person does not rediscover the gap and fill it back
 * in with the one value already ruled out.
 */
const CATALOGUE_COLORS: Record<CatalogueColorKey, CatalogueColor> = {
  amber: { hex: "#FFB25E", label: "Amber" }, // 10.34:1
  orange: { hex: "#FF7A2F", label: "Orange" }, //  7.09:1
  pink: { hex: "#FF5C93", label: "Pink" }, //  6.32:1
  pinkSoft: { hex: "#F6B6D2", label: "Pink soft" }, // 11.00:1
  violet: { hex: "#A874E8", label: "Violet" }, //  5.55:1
  neutral: { hex: "#8C82A6", label: "Neutral grey" }, //  5.14:1 — the deliberate neutral
};

/** Declaration order is the order on screen. */
const COLOR_ORDER: readonly CatalogueColorKey[] = [
  "amber",
  "orange",
  "pink",
  "pinkSoft",
  "violet",
  "neutral",
];

/** The six offered values, for a caller that needs to name one. */
export const CATALOGUE_COLOR_HEXES: readonly string[] = COLOR_ORDER.map(
  (key) => CATALOGUE_COLORS[key].hex
);

/**
 * The human label for a hex, or the hex itself when it is not one of the six.
 *
 * Used by the modal to build `{Colour} is already used by {Name}. Pick another.`
 * — a refusal that names the colour a person just pressed rather than echoing a
 * value they never typed.
 */
export function catalogueColorLabel(hex: string): string {
  const key = COLOR_ORDER.find(
    (k) => CATALOGUE_COLORS[k].hex.toUpperCase() === hex.trim().toUpperCase()
  );
  return key ? CATALOGUE_COLORS[key].label : hex;
}

interface ColorSwatchPickerProps {
  /** The chosen `#RRGGBB`, or `null` while nothing has been chosen yet. */
  readonly value: string | null;
  /** Called with the chosen `#RRGGBB`. Never called for a taken swatch. */
  readonly onChange: (hex: string) => void;
  /**
   * Colours already held by **another active** format, keyed by upper-case hex,
   * valued by the holder's name.
   *
   * The uniqueness index behind this is partial on `retired_at IS NULL`
   * (`formats_color_active_unique`), so a retired format releases its colour and
   * must not appear here. Supplying the map is the caller's job because the
   * caller already holds the catalogue; this component reads no data of its own.
   */
  readonly takenBy?: Readonly<Record<string, string>>;
  /** `aria-labelledby` target — the visible label above the group. */
  readonly labelledBy: string;
  /** `aria-describedby` target — the refusal sentence, when one is showing. */
  readonly describedBy?: string;
  /** True when the field is carrying a refusal. */
  readonly invalid?: boolean;
  /** Set while the form is submitting. */
  readonly disabled?: boolean;
}

export default function ColorSwatchPicker({
  value,
  onChange,
  takenBy,
  labelledBy,
  describedBy,
  invalid = false,
  disabled = false,
}: ColorSwatchPickerProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const normalised = value ? value.trim().toUpperCase() : null;

  function holderOf(hex: string): string | undefined {
    return takenBy?.[hex.toUpperCase()];
  }

  /** The keys a person can actually land on — a taken swatch is not one. */
  const selectable = COLOR_ORDER.filter((key) => !holderOf(CATALOGUE_COLORS[key].hex));

  /**
   * Roving tabindex: exactly one swatch is in the tab sequence, so **Tab leaves
   * the group** and the arrow keys move inside it. That is the whole reason this
   * is a `radiogroup` and not six independent buttons — six buttons would put
   * six stops between the colour field and the submit button.
   */
  const tabStopKey =
    (normalised &&
      selectable.find(
        (key) => CATALOGUE_COLORS[key].hex.toUpperCase() === normalised
      )) ||
    selectable[0] ||
    null;

  function move(from: CatalogueColorKey, delta: number) {
    if (selectable.length === 0) return;
    const at = selectable.indexOf(from);
    const next =
      at === -1
        ? selectable[0]
        : selectable[(at + delta + selectable.length) % selectable.length];
    onChange(CATALOGUE_COLORS[next].hex);
    groupRef.current
      ?.querySelector<HTMLButtonElement>(`[data-color-key="${next}"]`)
      ?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: CatalogueColorKey) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(key, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(key, -1);
        break;
      case "Home":
        event.preventDefault();
        if (selectable[0]) move(selectable[0], 0);
        break;
      case "End":
        event.preventDefault();
        if (selectable.length > 0) move(selectable[selectable.length - 1], 0);
        break;
      default:
        break;
    }
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-required="true"
      className="flex flex-wrap gap-2"
    >
      {COLOR_ORDER.map((key) => {
        const { hex, label } = CATALOGUE_COLORS[key];
        const holder = holderOf(hex);
        const taken = holder !== undefined;
        const selected = normalised === hex.toUpperCase();

        return (
          <button
            key={key}
            type="button"
            role="radio"
            data-color-key={key}
            aria-checked={selected}
            // A taken colour is not "a disabled button": it is a choice the
            // database will refuse, named with its holder so the person knows
            // which format to look at instead of pressing save to find out.
            aria-disabled={taken || undefined}
            aria-label={taken ? `${label} — used by ${holder}` : label}
            title={taken ? `used by ${holder}` : label}
            tabIndex={!taken && key === tabStopKey ? 0 : -1}
            disabled={disabled}
            onClick={() => {
              if (taken || disabled) return;
              onChange(hex);
            }}
            onKeyDown={(event) => {
              if (disabled) return;
              handleKeyDown(event, key);
            }}
            // 44 × 44px, the minimum touch target the accessibility contract
            // asks of every swatch: this is used one-thumbed on a phone.
            //
            // The focus expression is IMPORTED, not spelled: the incumbent
            // killed the outline and replaced it with a 1px accent ring, which
            // is finding A3 — the one indicator a keyboard user has, in the one
            // colour that disappears against an accent fill (2.52 : 1). The
            // shared expression is `--ink` at a 2px offset, 15.22–17.29 : 1 on
            // the surrounding ground. The radius moves to the control rung of
            // §9's three-radius ladder; the 8px one does not survive it.
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-opacity ${FOCUS_RING} ${
              taken ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            } ${disabled ? "opacity-50" : ""}`}
          >
            {/*
              The drawn swatch. Its 2px radius is NOT a rung of §9's ladder and
              is deliberately left alone: §9 governs the radius of a container
              and of a control, and this is neither — it is the mark the control
              draws, 24px square, on which a 12px radius would read as a circle.
              The hex arrives as data on a row and is applied inline, which is
              the whole reason this file is a named exemption.
            */}
            <span
              aria-hidden="true"
              className={`h-6 w-6 rounded-[2px] ${
                selected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
              }`}
              style={{ background: hex }}
            />

            {/*
              The glyph, and it is not decoration. The selection of a COLOUR
              control must not be signalled by colour, so the ring above never
              travels alone: a person who distinguishes none of the six hues
              still sees which one is chosen.
            */}
            {selected && (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute h-4 w-4 text-ground"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}

            {/* Taken: a slash, for the same reason the check exists. */}
            {taken && (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                className="pointer-events-none absolute h-6 w-6 text-ground"
              >
                <path d="M5 19L19 5" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
