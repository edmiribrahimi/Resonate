import type { PaletteRead } from "@/lib/production/sections/tokens";

/**
 * The palette, drawn from values it READ rather than values it carries.
 *
 * Its only input is what `@/lib/production/sections/tokens` returned. There is
 * no colour written in this file — not in a class, not in a style object, not in
 * a constant — and that absence is the requirement rather than a habit: D-45-09
 * says the visual section reads the palette from the design tokens, and
 * `verify:semantic-separation` check B refuses a second copy of any of those
 * values anywhere under `src/`. **No exemption was added for this file**, and
 * adding one would make that check meaningless for the one surface it most needs
 * to cover.
 *
 * ── RULE 1 — a format with no palette declares the void and shows the rule ───
 *
 * `brand-visual-system.md`, gate *il colore non si eredita*: the sunset ramp is
 * ONE format's exclusive signature; a second format uses a flat orange from the
 * same family with the opposite grammar; and a third **has no palette at all**.
 * Until it has one its materials stay neutral — and borrowing the sunset to fill
 * that gap is, in the module's own words, the way a format loses its identity
 * before having one.
 *
 * So a format with nothing decided gets **words**: no blank, no placeholder
 * swatch, and above all no colour. The standing paragraph below says it on every
 * visit, because it is the sentence somebody needs at the moment they are
 * producing a piece and the palette in front of them looks like it applies to
 * everything.
 *
 * ⚠ **Which format that is, is NOT written here.** That is authored content — a
 * `production_section` row in the undecided state, naming what is missing and
 * whose call it is — and a constant in a component asserting it would be this
 * file deciding a question the register exists to keep open.
 *
 * ── RULE 2 — a format's identification colour is never drawn as a palette ────
 *
 * `formats.color` is `NOT NULL`, so **every** format carries one, including the
 * one with no palette; and the migration that created the column says what it is
 * — *the IDENTIFICATION colour, the dot on a chip … and not the palette of the
 * materials, which is a different thing that shares a word*. Drawn large it
 * becomes a palette nobody decided (D-45-16).
 *
 * This component and the page around it therefore draw **no format colour at
 * all**. Not small, not at marker size, not anywhere: on the one surface whose
 * subject is the palette, the safest size for a value that is not part of it is
 * none. The chip that legitimately draws it lives in the catalogue.
 *
 * ⚠ **And no automatic check can hold the version of this rule that matters.** A
 * swatch at four pixels and a swatch at two hundred are the same source line;
 * `verify-section-surface.mjs` check D says so about itself and calls itself
 * weak. **Procedure P4 is the gate that actually holds it**, it is a person
 * looking at a screen, and it is still pending. Anybody who later draws a format
 * colour on this surface inherits P4 along with it.
 *
 * ── RULE 3 — the signature gradient is not this page's chrome ───────────────
 *
 * A surface showing *the palette* must not spend one format's exclusive
 * signature on its own background. The gradient is declared once, in the token
 * file, worn by nobody, and `npm run verify:sunset-gradient` exists to keep it
 * that way; the reader deliberately does not return it, so there is nothing here
 * to draw it with even by accident.
 *
 * *(Its token name is `--grad-sunset`. It is written in this comment and NOWHERE
 * in live code, and that is measured rather than fastidious: the gradient gate
 * matches the name at a boundary on comment-stripped lines, so naming it in
 * rendered text would turn a correct file red — and a gate that goes red on
 * correct code is a gate somebody switches off.)*
 *
 * ── Every swatch carries its token name ─────────────────────────────────────
 *
 * A colour identified only by itself is a colour somebody re-types into a design
 * tool from memory. The name is what lets a reader change it in the one place it
 * is declared instead of matching it by eye, and it is what makes the
 * relationship between this page and the token file legible without reading
 * either file's source.
 */
export function PaletteSwatches({ palette }: { palette: PaletteRead }) {
  if (!palette.ok) {
    /*
      A DECLARED failure, never an empty palette.

      An empty list drawn under the heading *the palette* is a void nobody
      declared, on the page whose subject is that a void must declare itself. And
      there is no error tracking in this project, so a failure that were only
      logged would reach nobody: this sentence is the observable effect.

      `role="alert"` because it is a fault and not a decision — which is exactly
      the distinction the undecided sections make in the other direction.
    */
    return (
      <div
        role="alert"
        className="border-s-2 border-control ps-3"
      >
        <p className="text-sm font-semibold text-ink">
          The palette could not be read.
        </p>
        <p className="mt-1 text-sm text-muted">
          These values are not stored here — they are read from the stylesheet
          that declares them, so that there is one place to change a colour. That
          read failed, which is a fault and not an undecided palette.
        </p>
        <p className="mt-1 font-mono text-xs text-muted">
          {palette.code} — {palette.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {palette.tokens.map((token) => (
          <li key={token.name} className="flex items-center gap-3">
            {/*
              The swatch itself carries no information a sighted reader could not
              get from the two lines beside it, so it is hidden from the
              accessibility tree rather than given an invented label. The colour
              is applied through an inline style because its value arrives at run
              time, and Tailwind cannot generate a class from a run-time value.
            */}
            <span
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-lg border border-line"
              style={{ backgroundColor: token.value }}
            />
            <span className="min-w-0">
              <span className="block font-mono text-sm font-semibold normal-case text-ink">
                {token.name}
              </span>
              <span className="block font-mono text-xs normal-case text-muted">
                {token.value}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-3xl text-sm text-muted">
        Read from the stylesheet that declares them, on every render. Change a
        colour there and it changes here; there is no second copy to keep in
        step.
      </p>

      <p className="mt-2 max-w-3xl text-sm text-muted">
        <strong className="font-semibold text-ink">
          This is the brand palette, not every format&apos;s palette.
        </strong>{" "}
        A format that has not been given one yet does not inherit this one: no
        palette has been decided for it, and until one is, its materials stay{" "}
        <em>neutral</em> — no gradient borrowed from another format, and no
        identification colour enlarged to stand in for a palette. The colour a
        format carries in the catalogue is a marker beside its name and nothing
        more.
      </p>
    </div>
  );
}
