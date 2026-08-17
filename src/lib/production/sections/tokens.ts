import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * tokens.ts — the palette, read from the one place it is declared.
 *
 * ── Why the imports sit ABOVE this block ────────────────────────────────────
 *
 * The plan's acceptance criterion greps `head -3` of this file for
 * `server-only`. Written in the usual order — docblock first, imports after —
 * the check would read three lines of prose and fail on a file that satisfies
 * it. Same discipline, and the same reason, as `src/lib/media/strip-metadata.ts`.
 *
 * `import "server-only"` is the first line for a second reason that outlives the
 * grep: this module reads a file off the disk, so it must never be reachable
 * from a client bundle. (`server-only` needs no package here — Next aliases the
 * specifier to `next/dist/compiled/server-only` in its webpack configuration,
 * which is why nothing was installed for this line.)
 *
 * ── WHAT THIS MODULE ASSERTS, in one sentence ───────────────────────────────
 *
 * The six brand colours have **one home**, `src/app/globals.css`, and whatever
 * draws them reads their values from there at run time rather than carrying a
 * copy.
 *
 * ── D-45-09, and the collision this module exists to resolve ────────────────
 *
 * The visual section publishes the capitolato, and a capitolato names colours.
 * Two rules meet head-on:
 *
 *   * D-45-09 — the visual section READS the palette from the design tokens and
 *     never restates a value. *Six colours written twice are six colours that
 *     diverge*, and Phase 40 already spent a migration making one place
 *     authoritative;
 *   * `verify:semantic-separation` check B — **no file under `src/`**, other
 *     than two exact-path exemptions, may contain any hex declared in the token
 *     file's `:root`.
 *
 * A capitolato page with a hex literal in it turns that gate red, **and that is
 * the gate working.** A value read at run time is invisible to a grep over
 * source, which is precisely the point.
 *
 * ⚠ **DO NOT ADD A THIRD EXEMPTION.** The two that exist are argued in that
 * script's header — a format's identification colour is data on a row, and
 * `themeColor` is painted before any stylesheet loads. Exempting the surface
 * whose whole job is to publish the palette would make check B meaningless for
 * the one file it most needs to cover, and `verify-tokens.mjs:154` already
 * records why a check must not be able to go green on the sentence describing
 * its own prohibition.
 *
 * ── The six names, and why this list is declared rather than derived ────────
 *
 * `:root` declares far more than six values — grounds, inks, lines, controls,
 * four semantics, and a legacy alias set. Which of them are **the brand
 * palette** is not readable from the stylesheet: `--ground` is both the 60%
 * surface of the interface and the *nero cosmico* of the materials, and no
 * syntax distinguishes those two facts. So the membership is written here, once,
 * and only the VALUES are read.
 *
 * The six are the ones `brand-visual-system.md` publishes as the palette, in the
 * order a capitolato reads them — the ground first, then the ramp that runs from
 * the last ray to the night violet.
 *
 * Deliberately absent, each for its own reason:
 *
 *   * **`--violet-deep`** is declared and is never a foreground (1.90–2.16 : 1
 *     on the four grounds). It is not one of the six the module publishes, and
 *     including it would add a colour to the palette by accident.
 *   * **The sunset gradient** is not a palette entry at all: it is ONE format's
 *     exclusive signature, `npm run verify:sunset-gradient` is a separate gate
 *     that asserts it is worn by nobody, and this module does not restate it —
 *     the name is written here, in a comment, and nowhere in live code, because
 *     that gate reads live lines and a bare mention in rendered text would make
 *     it red on a correct file. (Measured while writing this plan, not guessed:
 *     `findNameReferences` matches `--grad-sunset` at a boundary, on comment-
 *     stripped lines.)
 *   * **A role or a description for each colour.** *What this one is for* is
 *     capitolato prose, and capitolato prose is a `production_section` row
 *     written by whoever owns the brand. A constant here that said what a colour
 *     means would be this module authoring the capitolato — the same failure the
 *     manifesto's three states exist to prevent, committed in a different file.
 *
 * ── It fails LOUDLY, and never quietly to an empty list ─────────────────────
 *
 * There is no branch here that returns an empty palette. An empty list rendered
 * as a palette is a void nobody declared — a page that says *these are the brand
 * colours* above nothing at all — and this project has **no error tracking**, so
 * a failure that only logged would reach nobody. Every failure is returned as a
 * value with a code and a sentence, and the caller draws it.
 *
 * ⚠ **A read off the disk at run time is a claim about the deployment, not only
 * about this file.** The token file must be present beside the server bundle;
 * `next.config.ts` names it in `outputFileTracingIncludes` for the route that
 * draws it, which is what puts it there. If that ever stops being true the
 * failure is the declared one below and it is visible on the page — which is the
 * whole reason the failure is a value.
 */

/** The token file, as an exact path — the same one every colour gate names. */
const TOKEN_FILE = "src/app/globals.css";

/**
 * The six brand colours, by name, in the order a capitolato reads them.
 *
 * A name here that `:root` does not declare is a FAILURE and not a skipped
 * entry: the two ways that happens are a token renamed without this list moving
 * with it, and a token deleted — and the second is the one a shorter palette
 * would quietly hide.
 */
export const BRAND_TOKEN_NAMES = [
  "--ground",
  "--amber",
  "--orange",
  "--pink",
  "--pink-soft",
  "--violet",
] as const;

/** One of the six. */
export type BrandTokenName = (typeof BRAND_TOKEN_NAMES)[number];

/** A colour as it was declared: the name it is called by, and its value. */
export interface BrandToken {
  /** The custom property, e.g. `--pink`. Drawn as text beside the swatch. */
  name: BrandTokenName;
  /** Whatever `:root` declares for it, verbatim, uninterpreted. */
  value: string;
}

/** Why the palette could not be read. Four causes, four different next steps. */
export type PaletteFailureCode =
  | "token_file_unreadable"
  | "root_block_not_found"
  | "root_block_empty"
  | "token_not_declared";

/**
 * The result. A discriminated union, so a caller cannot draw a palette it does
 * not have without the compiler saying so.
 */
export type PaletteRead =
  | { ok: true; tokens: readonly BrandToken[] }
  | { ok: false; code: PaletteFailureCode; message: string };

/**
 * CSS has one comment form, and it is stripped before anything is parsed.
 *
 * The token file is mostly prose — its `:root` block carries several hundred
 * lines of commentary — and a comment can contain both braces and something that
 * looks like a declaration. Stripping first makes the brace matching below
 * correct as well as the declaration reading, and it is the same direction as
 * `scripts/lib/comments.mjs`: blank more, never less.
 */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * The first `:root { … }` block, brace-matched.
 *
 * The FIRST, deliberately: the file declares a second `:root` inside a media
 * query, and that one carries a layout inset rather than a colour. Reading both
 * would let a value declared for one viewport be published as *the* palette.
 * `scripts/verify-tokens.mjs` reads only the first for the same reason and says
 * so at its line 283.
 */
function firstRootBlock(css: string): string | null {
  const opener = css.indexOf(":root");
  if (opener === -1) return null;

  const open = css.indexOf("{", opener);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }

  return null;
}

/** Every `--name: value;` in a block, as a map. */
function declarationsIn(block: string): Map<string, string> {
  const found = new Map<string, string>();
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match = re.exec(block);
  while (match !== null) {
    found.set(match[1], match[2].trim());
    match = re.exec(block);
  }
  return found;
}

/**
 * The six brand colours, with the values `:root` declares for them today.
 *
 * Server-side only, and it reads the disk on every call: there is no cache here
 * because the route that draws it is `force-dynamic` and the file changes only
 * when somebody deploys. A cache would be a second copy of the very thing this
 * module exists to keep in one place.
 */
export function readBrandPalette(): PaletteRead {
  let css: string;
  try {
    css = readFileSync(join(process.cwd(), TOKEN_FILE), "utf8");
  } catch {
    /*
      The cause is deliberately NOT carried into the message.

      A filesystem error's own text is an absolute path on the machine running
      the server, and this sentence is rendered on a screen. The path is noise to
      whoever reads it and it is the one part of the failure that says something
      about the deployment rather than about the palette. The CODE is what
      distinguishes this cause from the other three, and that is what a reader
      needs.
    */
    return {
      ok: false,
      code: "token_file_unreadable",
      message: `${TOKEN_FILE} could not be read beside the running server. It is named in \`outputFileTracingIncludes\` so that it ships with the route that draws it.`,
    };
  }

  const block = firstRootBlock(withoutComments(css));
  if (block === null) {
    return {
      ok: false,
      code: "root_block_not_found",
      message: `${TOKEN_FILE} was read and no \`:root { … }\` block could be matched in it.`,
    };
  }

  const declared = declarationsIn(block);
  if (declared.size === 0) {
    return {
      ok: false,
      code: "root_block_empty",
      message: `${TOKEN_FILE} declares no custom property in its first \`:root\` block.`,
    };
  }

  const tokens: BrandToken[] = [];
  const absent: string[] = [];
  for (const name of BRAND_TOKEN_NAMES) {
    const value = declared.get(name);
    if (value === undefined) {
      absent.push(name);
      continue;
    }
    tokens.push({ name, value });
  }

  if (absent.length > 0) {
    return {
      ok: false,
      code: "token_not_declared",
      message: `${TOKEN_FILE} declares no value for ${absent.join(
        ", "
      )}. The palette is not short by one colour — it is a name that moved without this reader moving with it.`,
    };
  }

  return { ok: true, tokens };
}
