/**
 * A format's colour and its name, together, wherever a night is identified —
 * the event card (S2), the night detail (S3) and the catalogue row (S5).
 *
 * ── Why this is a component at all, and not four lines copied three times ─────
 *
 * Because of one class name: `normal-case`.
 *
 * `text-transform` is an **inherited** CSS property. So *"we did not ask for a
 * transform"* is not a guarantee — it holds only until this markup is mounted
 * inside an ancestor that asks for one, and this phase adds an admin surface
 * where a transformed table header is entirely ordinary. Two tabs on the very
 * page this marker sits on already carry that transform
 * (`src/app/(public)/events/EventTabs.tsx:197`, `:207`), so the ancestor is not
 * hypothetical: it is one element away.
 *
 * A format name is stored verbatim and must render verbatim — one of the four
 * names opens in lower case and would come out shouted, and another two are
 * CamelCase that a transform flattens. That is `brand-visual-system.md`, gate
 * *grafia del brand*, and it is the one rule in `36-UI-SPEC.md` whose violation
 * is **published to every visitor at once**: it does not fail on a screen
 * somebody is looking at, it fails on all of them. A rule that can only be kept
 * by remembering it is not kept — so the element that renders the name declares
 * its own casing, and the invariant survives its own context.
 *
 * ── The colour is a PROP, and that is the requirement, not a convenience ──────
 *
 * D-36-12 and FMT-05: **no format constant lives in this file.** The name and
 * the colour both arrive from a catalogue row, which is what makes changing
 * either of them a change with no deploy. A map from a slug to a hue, written
 * here for convenience, would move that decision back into a build — and would
 * be a second source for a fact the database already holds.
 *
 * The colour reaches the DOM through an inline `style` because Tailwind cannot
 * generate a class from a runtime value. **This is new to this codebase** —
 * measured while writing it: 88 `style={{ … }}` sites across `src/`, and not
 * one applies a colour from a runtime value. Stated as new rather than implied
 * as precedent. What constrains the string is the database:
 * `formats_color_hex_check` admits `#` plus six hex digits and nothing else, so
 * the value cannot carry a declaration, and React escapes it besides.
 *
 * ── Colour is never the only channel ─────────────────────────────────────────
 *
 * The name is always present as text, and the square is `aria-hidden`: it adds
 * nothing a screen reader needs and would otherwise read as noise before every
 * name. A visitor who distinguishes none of the hues loses nothing.
 *
 * The square is also **not** the interaction hue reserved by the design
 * contract for the active tab, the lineup pill, the venue link, the focus ring
 * and the catalogue's primary button. Those are a different channel, and the
 * moment one borrows the other a format stops being identifiable.
 *
 * ── Server-safe, and it says nothing about sound ─────────────────────────────
 *
 * No client directive, no data fetching, no state. And nothing here — no prop,
 * no default, no comment — says what a format sounds like: three of the four
 * have no written manifesto, and inventing one in a placeholder would be
 * writing the brand on behalf of whoever owns it (`sound-manifesto.md`).
 *
 * ── One known divergence, for the plan that builds the catalogue ─────────────
 *
 * `36-UI-SPEC.md` §S5 draws the catalogue row's square at 12px; §S2 and §S3 draw
 * it at 8px, which is what this component renders. Whoever builds S5 either
 * accepts 8px there or adds a size prop — deliberately not added on
 * speculation, and named here so it is a decision rather than a discovery.
 */

interface FormatMarkerProps {
  /** The format's name — or a series' public name — exactly as stored. */
  readonly name: string;
  /** `#RRGGBB`, from the catalogue row. Never a constant in this file. */
  readonly color: string;
  /** Layout only, applied to the wrapper. Never used to restyle the name. */
  readonly className?: string;
  /**
   * The **off** state of a filter chip (`36-UI-SPEC.md` §S1, chip anatomy): the
   * square drops to `opacity .4` and the name to `text-muted`. Nothing else
   * changes — `normal-case` least of all, which is the whole reason this file
   * exists.
   *
   * Added by plan 36-11, which is the first surface to mount this component,
   * and added rather than re-implemented for exactly the reason in the docblock
   * above: a chip that hand-rolled its own label would be a second element
   * rendering a format name with no guarantee about its own casing.
   *
   * **It says nothing about the data.** It answers *"is this the chip the
   * address selected?"* — never *"does this format have anything to show?"*.
   * The second question is a count with one bit of resolution, and the surface
   * that asks it announces an unannounced night by lighting up.
   */
  readonly dimmed?: boolean;
}

export default function FormatMarker({
  name,
  color,
  className,
  dimmed = false,
}: FormatMarkerProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5${className ? ` ${className}` : ""}`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 shrink-0 rounded-[2px]${dimmed ? " opacity-40" : ""}`}
        style={{ background: color }}
      />
      {/*
        `normal-case` is the point of this file — see the docblock. `tracking-wide`
        and not the widest step: at 12px the widest step pulls a name apart at a
        colon, and one of the four names has one.

        The undimmed ink moved off its legacy alias onto the current name. That
        alias was declared in `globals.css` as exactly the token it is replaced
        by, so **no pixel changes** — it is a rename, and its purpose is to leave
        the alias one consumer lighter. The old name is not written here: the
        gate that counts it could not then tell a violation from its own gloss,
        and a class string in a comment is a live Tailwind candidate (DEF-41-01).

        Nothing above this line touches how the format's colour reaches the
        element. It arrives as **data on a catalogue row**, through an inline
        style, and it is not a token and never becomes one — D-36-12 and
        `40-UI-SPEC.md` §0 rule 4, held mechanically by
        `verify-semantic-separation.mjs` checks C and E. No `--sem-*` and no
        `--accent` fallback is added for a format: a state that borrowed a
        format's channel would make the two unreadable from each other, and
        `--sem-warn` already holds SunSet's identification value.
      */}
      <span
        className={`text-xs font-semibold tracking-wide normal-case ${
          dimmed ? "text-muted" : "text-ink"
        }`}
      >
        {name}
      </span>
    </span>
  );
}
