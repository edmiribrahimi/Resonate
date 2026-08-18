#!/usr/bin/env node
/**
 * verify-scan-legibility.mjs — the door's three answers, measured instead of
 * asserted.
 *
 * WHAT IT ASSERTS, in one sentence: **the three things the scanner can say —
 * admitted, already recorded, refused — plus the connectivity pill that shares
 * the same screen, sit far enough apart in colour that a member of staff cannot
 * mistake one for another, under normal vision and under each of the three
 * dichromacies, measured on the fills this tree actually renders.**
 *
 * ── WHY A GATE AND NOT A COMMENT ────────────────────────────────────────────
 *
 * Because a comment was already there and it was wrong. `ScanFlash.tsx:65-72`
 * stated in prose that the amber/yellow collision with the *Offline* pill had
 * been avoided *by choosing amber instead of yellow*, and a second copy of the
 * same claim sat beside the pill itself in `ScannerClient.tsx:2792-2798`.
 * Measured, the two colours are about **10 apart at normal vision and about 2
 * in deuteranopia** — the defect was in production for months with two
 * sentences next to it declaring its absence. A comment cannot fail. This can.
 *
 * ── THE METHOD, NAMED SO IT IS NOT CHOSEN AT IMPLEMENTATION TIME ────────────
 *
 * D-42-05 fixes the method by name, because the first table this phase produced
 * was wrong in exactly two ways and both were method errors:
 *
 *   1. `oklch` → linear sRGB using the Ottosson matrices Tailwind v4 uses. The
 *      raw palette here is **not** Tailwind v3 hex: `green-500` renders
 *      `#00C950`, not `#22C55E`.
 *   2. **Brettel, Viénot & Mollon (1997), two half-planes**, applied in LINEAR
 *      sRGB. NOT the 1999 single-plane reduction — it is poor on tritanopia —
 *      and NOT HCIRN matrices applied in gamma-encoded sRGB. Those two are the
 *      errors that produced a table this phase had to withdraw.
 *   3. **CIEDE2000** for the distance, threshold **10**. Below 10 is two
 *      screens a person in a hurry can swap.
 *
 * ── THE COMPOSITE, WHICH NEITHER PRIOR TABLE CONSIDERED ─────────────────────
 *
 * The flash renders at `/90`, not full. The number a person sees is the fill
 * composited over `--ground`, so that is what this gate measures — the
 * compositing is done in LINEAR light, which is what a browser does and what
 * reproduces `#00C04D` for `bg-green-500/90` over `#0A0712`. A gate that
 * measured the token would be measuring something nobody looks at.
 *
 * ── THE ONE EXCLUDED PAIR, AND WHY IT CHECKS ITS OWN PREMISE ────────────────
 *
 * Five pairs are measured: accept↔refuse, accept↔third, refuse↔third,
 * third↔pill, refuse↔pill. **Accept versus the connectivity pill is excluded**,
 * because the accept fill covers the viewport and the pill is a badge in a
 * header that fill hides — the confusion the other pairs describe has no moment
 * in which to happen.
 *
 * **That exclusion is a fact about layout, not about colour, so the gate reads
 * it rather than believes it.** Before applying the exclusion it confirms that
 * the flash's own container is still pinned to every edge of the viewport. This
 * exclusion is true because the flash covers the viewport; if it stops covering
 * it, the exclusion stops being true, and the gate has to notice instead of
 * going on trusting a sentence.
 *
 * The direction is the whole point. Turning the flash into a card instead of a
 * full screen is a live idea — it sits in `42-CONTEXT.md` under Deferred, as a
 * way to cut glare at a dark entrance. On that day the excluded pair becomes
 * real. A self-checking exclusion **fails closed**; a sentence in a docblock
 * **fails open**. On a safety surface, failing open is the wrong direction.
 *
 * ── REFUSE (exit 2) VERSUS FAIL (exit 1), AND NEVER THE ONE FOR THE OTHER ───
 *
 * | Refuse — exit 2, *nothing was measured*        | Fail — exit 1, *measured and too close*     |
 * |------------------------------------------------|---------------------------------------------|
 * | `theme.css` missing or unparseable             | any measured pair below threshold in any of |
 * | `FLASH_STATES` absent or fewer than three      | the four vision models                      |
 * | a `bg` value not recognisable as a utility     | the glyph ink below the stated contrast     |
 * |   with a known colour                          | floor on any composite                      |
 * | the connectivity pill constant not found       | the flash's container locatable and NO      |
 * |   by name                                      | LONGER pinned — the excluded pair is then   |
 * | the flash's container not locatable at all     | measured like all the others                |
 * | a token named in `globals.css` unreadable      |                                             |
 *
 * The dangerous case is concrete: if the pill cannot be located and the gate
 * carries on measuring only the three outcomes, it prints a green over a
 * measurement it did not make — the exact defect it exists to prevent. It
 * **must refuse** (`verify-all.mjs:196-212`, `41-GAP-REVIEW.md` WR-01: *a
 * failure must not be reportable as a refusal either*).
 *
 * ── THE THRESHOLD IS NOT A DIAL ─────────────────────────────────────────────
 *
 * T-42-07. The threshold is fixed at **10** by D-42-05. A pair that misses it is
 * answered by a written per-pair derogation carrying its measured distance and
 * the other channels that hold that outcome — glyph, dwell, haptic and words —
 * **never by a smaller number**. Widening an exemption to clear a red is the
 * tampering this repository names.
 *
 * ── WHAT A GREEN DOES NOT MEAN ──────────────────────────────────────────────
 *
 * **This gate measures the distance between two hues, not the readability of a
 * screen.** A pass says the tints are separable. It never says the door works.
 * Whether a refusal reads as a refusal at arm's length in a dark room with a
 * queue in front of it is a human observation, and it lives in the door pass
 * (`42-PROCEDURES.md`, `39-DOOR-PASS.md` §8).
 *
 * It also cannot see a colour composed at runtime, one arriving from a database
 * row, or one applied through an inline style. It reads source text.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files plus one dependency,
 * prints only paths, colour names and numbers, opens no network connection,
 * reads no environment variable and writes no artefact. No venue, no
 * unannounced date, no line-up, no personal name.
 *
 * Zero dependencies: `node:` built-ins and `./lib/` only. `42-RESEARCH.md` §10
 * refuses `culori`, `colorjs.io` and `color-blind` in advance — the mathematics
 * is arithmetic, and none of the twenty-two gates in this repository imports an
 * npm package.
 *
 * NOT REGISTERED YET, ON PURPOSE (D-42-09). There is no `verify:scan-legibility`
 * entry in `package.json` and none in `verify-all.mjs`. Registered before the
 * colour changes, this gate measures today's triple — minimum near 2 — and sits
 * red for the whole interval D-42-04 blocks. *A gate that ships red is a gate
 * somebody switches off.* Registration travels with the colour, in plan 42-11.
 *
 * Usage:
 *   node scripts/verify-scan-legibility.mjs
 *
 * Exit codes:
 *   0  every pair clears the threshold and every glyph clears the floor
 *   1  measured, and something is too close
 *   2  nothing was measured — no verdict is implied by a 2
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { liveLinesFrom } from './lib/comments.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The raw palette's declaration site. A dependency, not a tracked file. */
export const THEME_FILE = 'node_modules/tailwindcss/theme.css';
/** The brand's tokens, declared with literal values on both sides. */
export const TOKEN_FILE = 'src/app/globals.css';
/** The three outcomes and the glyph they share. */
export const FLASH_FILE = 'src/components/scanner/ScanFlash.tsx';
/** The connectivity pill's home. */
export const SCANNER_FILE = 'src/app/(admin)/admin/scanner/ScannerClient.tsx';

/**
 * The constant the connectivity pill's colour must live in, and the key this
 * gate reads.
 *
 * **It does not exist on today's tree, and that is why this gate refuses.** The
 * pill is written inline in a file of 3449 lines, and `bg-yellow-500` appears
 * there ten times across five different features — there is nothing stable to
 * read. Plan 42-06 lifts it; the name is fixed HERE and recorded in
 * `42-03-FINDINGS.md` so the gate and the code it reads are not two people
 * guessing at each other.
 */
export const PILL_CONSTANT = 'CONNECTIVITY_PILL';
export const PILL_KEY = 'offlineDot';

/** The three state keys of `FLASH_STATES`, which are the anchors, not line numbers. */
export const FLASH_KEYS = ['success', 'already_recorded', 'error'];

/** D-42-05. Not a dial — see T-42-07 in the header. */
export const THRESHOLD = 10;

/**
 * The glyph is a large stroked graphic at `h-20 w-20` with `strokeWidth 2.5`,
 * not body text, so the applicable floor is the WCAG 1.4.11 **graphics** floor
 * of 3:1 and not the 4.5:1 text floor. The gate says which it used, every run.
 */
export const GRAPHICS_CONTRAST_FLOOR = 3;

/**
 * Per-pair derogations. **Explicit, and empty today.**
 *
 * An entry is `{ pair, measured, argument }` and it is a DECISION that edits
 * this constant: the pair by name, the distance actually measured, and the
 * other channels that carry that outcome. It is never a smaller threshold.
 */
export const DEROGATIONS = [];

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(2);
}

function readLive(rel) {
  const abs = `${ROOT}/${rel}`;
  if (!existsSync(abs)) {
    refuse(
      `${rel} does not exist. This gate reads every colour from a source file, and a\n` +
        '       colour it cannot read is a colour it must not guess at. Nothing was measured.'
    );
  }
  const { lines, unterminated } = liveLinesFrom(readFileSync(abs, 'utf8').split('\n'));
  if (unterminated !== null) {
    refuse(
      `${rel}:${unterminated.lineNo} opens a ${unterminated.kind} comment that never closes.\n` +
        '       Every line after it is unmeasurable, so any verdict here would be a green about\n' +
        '       nothing. Nothing was measured.'
    );
  }
  return lines.join('\n');
}

// ── colour space ───────────────────────────────────────────────────────────

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** sRGB transfer function, gamma-encoded 0..1 → linear 0..1. */
export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear 0..1 → gamma-encoded 0..1. */
export function linearToSrgb(c) {
  const v = clamp01(c);
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
}

/** `#RRGGBB` → linear sRGB triple. */
export function hexToLinear(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => srgbToLinear(v / 255));
}

/** Linear sRGB triple → `#RRGGBB`, for printing an appearance a person can check. */
export function linearToHex(rgb) {
  return `#${rgb
    .map((c) => Math.round(clamp01(linearToSrgb(c)) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/**
 * `oklch(L% C H)` → linear sRGB, by the Ottosson matrices Tailwind v4's palette
 * is expressed in. Out-of-gamut components are clamped after the conversion,
 * not before: clamping in OKLab would move the hue.
 */
export function oklchToLinear(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Alpha compositing in LINEAR light — what a browser does, and what the eye gets. */
export function compositeOver(fgLinear, bgLinear, alpha) {
  return fgLinear.map((c, i) => alpha * c + (1 - alpha) * bgLinear[i]);
}

/** WCAG relative luminance from a linear triple. */
export function relativeLuminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two linear triples. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// ── Brettel, Viénot & Mollon (1997), two half-planes ───────────────────────

/**
 * The published two-half-plane parameters, expressed directly in LINEAR sRGB.
 *
 * Each dichromacy projects onto a half-plane of the reduced colour surface; the
 * plane a stimulus belongs to is decided by the sign of its dot product with
 * the separation normal. **This is the part the 1999 single-plane reduction
 * drops**, and dropping it is what makes 1999 poor on tritanopia — which is why
 * D-42-05 names 1997 rather than leaving the choice open.
 */
export const BRETTEL_1997 = {
  protanopia: {
    m1: [0.1498, 1.19548, -0.34528, 0.10764, 0.84864, 0.04372, 0.00384, -0.0054, 1.00156],
    m2: [0.1457, 1.16172, -0.30742, 0.10816, 0.85291, 0.03892, 0.00386, -0.00524, 1.00139],
    normal: [0.00048, 0.00393, -0.00441],
  },
  deuteranopia: {
    m1: [0.36477, 0.86381, -0.22858, 0.26294, 0.64245, 0.09462, -0.02006, 0.02728, 0.99278],
    m2: [0.37298, 0.88166, -0.25464, 0.25954, 0.63506, 0.1054, -0.0198, 0.02784, 0.99196],
    normal: [-0.00281, -0.00611, 0.00892],
  },
  tritanopia: {
    m1: [1.01277, 0.13548, -0.14826, -0.01243, 0.86812, 0.14431, 0.07589, 0.805, 0.11911],
    m2: [0.93678, 0.18979, -0.12657, 0.06154, 0.81526, 0.1232, -0.37562, 1.12767, 0.24796],
    normal: [0.03901, -0.02788, -0.01113],
  },
};

export const VISION_MODELS = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];

/** A linear triple as a dichromat of `model` would receive it. */
export function simulate(linear, model) {
  if (model === 'normal') return linear;
  const p = BRETTEL_1997[model];
  if (!p) throw new Error(`unknown vision model: ${model}`);
  const dot = linear[0] * p.normal[0] + linear[1] * p.normal[1] + linear[2] * p.normal[2];
  const m = dot >= 0 ? p.m1 : p.m2;
  return [
    clamp01(m[0] * linear[0] + m[1] * linear[1] + m[2] * linear[2]),
    clamp01(m[3] * linear[0] + m[4] * linear[1] + m[5] * linear[2]),
    clamp01(m[6] * linear[0] + m[7] * linear[1] + m[8] * linear[2]),
  ];
}

// ── CIEDE2000 ──────────────────────────────────────────────────────────────

const D65 = [0.95047, 1.0, 1.08883];

/** Linear sRGB → CIE XYZ (D65). */
export function linearToXyz([r, g, b]) {
  return [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    0.0193339 * r + 0.119192 * g + 0.9503041 * b,
  ];
}

/** Linear sRGB → CIE L*a*b* (D65). */
export function linearToLab(linear) {
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27) * t / 116 + 16 / 116);
  const [x, y, z] = linearToXyz(linear).map((v, i) => f(v / D65[i]));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const deg = (rad) => (rad * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

function hueAngle(b, ap) {
  if (ap === 0 && b === 0) return 0;
  const h = deg(Math.atan2(b, ap));
  return h < 0 ? h + 360 : h;
}

/** CIEDE2000 between two L*a*b* triples, kL = kC = kH = 1. */
export function ciede2000([L1, a1, b1], [L2, a2, b2]) {
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = hueAngle(b1, a1p);
  const h2p = hueAngle(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp;
  if (C1p * C2p === 0) {
    hbarp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbarp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hbarp = (h1p + h2p + 360) / 2;
  } else {
    hbarp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(rad(2 * dTheta)) * RC;

  return Math.sqrt(
    (dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH)
  );
}

/** The distance between two linear triples as `model` receives them. */
export function distance(linearA, linearB, model) {
  return ciede2000(linearToLab(simulate(linearA, model)), linearToLab(simulate(linearB, model)));
}

// ── reading the colours out of the sources ─────────────────────────────────

/** `--color-<name>: oklch(L% C H);` from the dependency's palette. */
export function readTailwindPalette(text) {
  const out = new Map();
  const re = /--color-([a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.set(m[1], oklchToLinear(Number(m[2]) / 100, Number(m[3]), Number(m[4])));
  }
  return out;
}

/** `--<name>: #RRGGBB;` from the brand's token file. Literal values only. */
export function readBrandTokens(text) {
  const out = new Map();
  const re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!out.has(m[1])) out.set(m[1], hexToLinear(m[2]));
  }
  return out;
}

/**
 * `bg-green-500/90` → `{ name: 'green-500', alpha: 0.9 }`.
 *
 * A bracketed arbitrary value is deliberately NOT accepted: it would be a colour
 * declared nowhere, and a gate cannot read a colour that has no declaration
 * site. It falls through to `null` and the caller refuses.
 */
export function parseColourUtility(utility) {
  const m = /^(?:bg|text)-([a-z][a-z0-9-]*)(?:\/(\d{1,3}))?$/.exec(utility.trim());
  if (!m) return null;
  return { name: m[1], alpha: m[2] === undefined ? 1 : Number(m[2]) / 100 };
}

// ── the run ─────────────────────────────────────────────────────────────
//
// Wrapped, and invoked only when this file IS the command. The house pattern is
// `invokedDirectly` (rls-baseline.mjs:2594, verify-capabilities.mjs:1435), and it
// earns its keep here for one specific reason: the arbitration in 42-03-FINDINGS.md
// compares this gate’s numbers, cell by cell, against two prior tables that measured
// the RAW tokens rather than the composites. That comparison has to run THIS
// arithmetic — a second copy of it would be a third table, not a verdict on two.

export function main() {

  const themeAbs = `${ROOT}/${THEME_FILE}`;
  if (!existsSync(themeAbs)) {
    refuse(
      `${THEME_FILE} does not exist. The raw palette is a DEPENDENCY, not a tracked file:\n` +
        "       an install that moves Tailwind moves the product's colours without a line of this\n" +
        '       repository changing, which is why this gate reads it instead of copying from it.\n' +
        '       Run `npm install` and try again. Nothing was measured.'
    );
  }
  const palette = readTailwindPalette(readFileSync(themeAbs, 'utf8'));
  if (palette.size === 0) {
    refuse(
      `${THEME_FILE} exists but no \`--color-*: oklch(...)\` declaration could be parsed out of\n` +
        '       it. Either the palette changed shape or Tailwind stopped expressing it in oklch.\n' +
        '       Nothing was measured.'
    );
  }

  const tokens = readBrandTokens(readLive(TOKEN_FILE));
  if (!tokens.has('ground')) {
    refuse(
      `${TOKEN_FILE} declares no literal \`--ground\`. It is the surface every fill composites\n` +
        '       over, so without it there is no composite to measure. Nothing was measured.'
    );
  }
  const GROUND = tokens.get('ground');

  /** A utility string → its linear colour, or a refusal naming what could not be read. */
  function resolveFill(utility, what) {
    const parsed = parseColourUtility(utility);
    if (!parsed) {
      refuse(
        `${what} is \`${utility}\`, which this gate cannot recognise as a colour utility.\n` +
          '       It reads `bg-<name>` / `text-<name>` with an optional `/NN` alpha, where <name> is\n' +
          `       declared either in ${THEME_FILE} or in ${TOKEN_FILE}. A colour with no declaration\n` +
          '       site is a colour that cannot be measured, and guessing at it would be worse than\n' +
          '       refusing. Nothing was measured.'
      );
    }
    let base = null;
    if (parsed.name === 'white') base = [1, 1, 1];
    else if (parsed.name === 'black') base = [0, 0, 0];
    else if (palette.has(parsed.name)) base = palette.get(parsed.name);
    else if (tokens.has(parsed.name)) base = tokens.get(parsed.name);
    if (base === null) {
      refuse(
        `${what} names the colour \`${parsed.name}\`, which is declared neither in ${THEME_FILE}\n` +
          `       nor as a literal in ${TOKEN_FILE}. Nothing was measured.`
      );
    }
    return { linear: base, alpha: parsed.alpha, utility };
  }

  // the three outcomes, anchored on their state keys and not on line numbers
  const flashText = readLive(FLASH_FILE);
  if (!/\bFLASH_STATES\b/.test(flashText)) {
    refuse(
      `${FLASH_FILE} contains no \`FLASH_STATES\`. That lookup is the one place the three\n` +
        "       outcomes' colours live, and this gate has no other anchor for them. Nothing was\n" +
        '       measured.'
    );
  }
  const fills = {};
  for (const key of FLASH_KEYS) {
    const m = new RegExp(`\\b${key}\\s*:\\s*\\{[\\s\\S]{0,400}?\\bbg\\s*:\\s*"([^"]+)"`).exec(flashText);
    if (!m) {
      refuse(
        `${FLASH_FILE} has no \`bg\` for the state \`${key}\` inside FLASH_STATES. Fewer than\n` +
          '       three outcomes means the door says something this gate never measured. Nothing was\n' +
          '       measured.'
      );
    }
    fills[key] = resolveFill(m[1], `the \`${key}\` fill in ${FLASH_FILE}`);
  }

  // the shared glyph ink
  const glyphMatch = /<svg[\s\S]{0,200}?className="([^"]*)"/.exec(flashText);
  if (!glyphMatch) {
    refuse(
      `${FLASH_FILE} has no \`<svg>\` carrying a className — the shared glyph element could not\n` +
        '       be located, so the ink drawn on all three fills is unknown. Nothing was measured.'
    );
  }
  const inkUtility = glyphMatch[1].split(/\s+/).find((c) => /^text-/.test(c));
  if (!inkUtility) {
    refuse(
      `${FLASH_FILE}: the shared glyph element declares no \`text-*\` ink. Nothing was measured.`
    );
  }
  const INK = resolveFill(inkUtility, `the shared glyph ink in ${FLASH_FILE}`);

  // the connectivity pill
  const scannerText = readLive(SCANNER_FILE);
  const pillMatch = new RegExp(
    `\\b${PILL_CONSTANT}\\b[\\s\\S]{0,600}?\\b${PILL_KEY}\\s*:\\s*"([^"]+)"`
  ).exec(scannerText);
  if (!pillMatch) {
    refuse(
      `${SCANNER_FILE} declares no \`${PILL_CONSTANT}\` with a \`${PILL_KEY}\` colour.\n` +
        '       The connectivity pill shares the scanner with the three outcomes and one of the\n' +
        '       pairs this gate exists to measure is the third state against it. Written inline,\n' +
        '       its utility appears ten times across five different features in this file and there\n' +
        '       is nothing stable to read — so the colour is lifted into one named module-level\n' +
        `       constant (plan 42-06, name recorded in 42-03-FINDINGS.md).\n\n` +
        '       On today\'s tree that lift has not happened, so THIS REFUSAL IS THE CORRECT\n' +
        '       ANSWER. Measuring only the three outcomes and printing a green would be a verdict\n' +
        '       over a measurement that never took place — which is the exact defect this gate\n' +
        '       exists to prevent. Nothing was measured.'
    );
  }
  const PILL = resolveFill(pillMatch[1], `the connectivity pill's ${PILL_KEY} in ${SCANNER_FILE}`);

  // the flash's container, and the premise the exclusion rests on
  const containerMatch = /className=\{`([^`]*)\$\{state\.bg\}([^`]*)`\}/.exec(flashText);
  if (!containerMatch) {
    refuse(
      `${FLASH_FILE}: the flash's own container could not be located — no className interpolates\n` +
        '       `${state.bg}`. The accept/pill exclusion rests on that container covering the\n' +
        '       viewport, and an exclusion whose premise cannot be read is an exclusion nobody\n' +
        '       should apply. Nothing was measured.'
    );
  }
  const containerClasses = `${containerMatch[1]} ${containerMatch[2]}`;
  const PINNED =
    /\bfixed\b/.test(containerClasses) &&
    (/\binset-0\b/.test(containerClasses) ||
      (/\btop-0\b/.test(containerClasses) &&
        /\bright-0\b/.test(containerClasses) &&
        /\bbottom-0\b/.test(containerClasses) &&
        /\bleft-0\b/.test(containerClasses)));

  // composites — the number a person actually sees
  const composite = (c) => compositeOver(c.linear, GROUND, c.alpha);
  const ACCEPT = composite(fills.success);
  const THIRD = composite(fills.already_recorded);
  const REFUSE_FILL = composite(fills.error);
  const PILL_COMPOSITE = composite(PILL);

  const PAIRS = [
    { key: 'accept↔refuse', a: ACCEPT, b: REFUSE_FILL },
    { key: 'accept↔third', a: ACCEPT, b: THIRD },
    { key: 'refuse↔third', a: REFUSE_FILL, b: THIRD },
    { key: 'third↔pill', a: THIRD, b: PILL_COMPOSITE },
    { key: 'refuse↔pill', a: REFUSE_FILL, b: PILL_COMPOSITE },
  ];
  if (!PINNED) {
    PAIRS.push({ key: 'accept↔pill', a: ACCEPT, b: PILL_COMPOSITE, premiseFell: true });
  }

  const failures = [];

  console.log('\nSCAN LEGIBILITY — Brettel/Viénot/Mollon 1997 (two half-planes), CIEDE2000');
  console.log(`  method: oklch → linear sRGB (Ottosson) · composite over --ground in linear light`);
  console.log(`  threshold: ${THRESHOLD}   glyph floor: ${GRAPHICS_CONTRAST_FLOOR}:1 (WCAG 1.4.11, graphics — the glyph is a large stroked mark, not text)\n`);

  console.log('  the colours, as read from source:');
  console.log(`    accept  ${fills.success.utility.padEnd(18)} → ${linearToHex(ACCEPT)} composited`);
  console.log(`    third   ${fills.already_recorded.utility.padEnd(18)} → ${linearToHex(THIRD)} composited`);
  console.log(`    refuse  ${fills.error.utility.padEnd(18)} → ${linearToHex(REFUSE_FILL)} composited`);
  console.log(`    pill    ${PILL.utility.padEnd(18)} → ${linearToHex(PILL_COMPOSITE)} composited`);
  console.log(`    ink     ${INK.utility.padEnd(18)} → ${linearToHex(INK.linear)}\n`);

  if (PINNED) {
    console.log(
      '  accept↔pill is EXCLUDED: the flash container is still pinned to every edge, so the\n' +
        '  accept fill hides the header the pill lives in and the confusion has no moment in\n' +
        '  which to happen. This exclusion is true because the flash covers the viewport; the\n' +
        '  day it stops covering it, the exclusion stops being true and this gate measures the\n' +
        '  pair like all the others.\n'
    );
  } else {
    console.log(
      `  ✗ THE EXCLUSION'S PREMISE HAS FALLEN. ${FLASH_FILE}'s container no longer pins itself\n` +
        `    to every edge — it reads \`${containerClasses.trim()}\`. accept↔pill was excluded only\n` +
        '    because the accept fill covered the header the pill sits in. It no longer does, so\n' +
        '    the pair is measured below. This is not a colour that changed: it is a premise that\n' +
        '    fell, and it fails CLOSED on purpose.\n'
    );
    failures.push('the accept/pill exclusion outlived its premise');
  }

  // ── the matrix, printed on a pass as well as on a failure ──────────────────
  const width = Math.max(...PAIRS.map((p) => [...p.key].length)) + 2;
  console.log(`  ${'pair'.padEnd(width)}${VISION_MODELS.map((m) => m.slice(0, 6).padStart(9)).join('')}      min`);
  for (const pair of PAIRS) {
    const row = VISION_MODELS.map((m) => distance(pair.a, pair.b, m));
    const min = Math.min(...row);
    const flag = min < THRESHOLD ? ' ⚠' : '';
    console.log(
      `  ${pair.key.padEnd(width)}${row.map((d) => d.toFixed(1).padStart(9)).join('')}   ${min.toFixed(1).padStart(6)}${flag}`
    );
    if (min < THRESHOLD) {
      const worst = VISION_MODELS[row.indexOf(min)];
      const derogation = DEROGATIONS.find((d) => d.pair === pair.key);
      if (derogation) {
        console.log(`       ↳ declared derogation: ${derogation.argument} (measured ${derogation.measured})`);
      } else {
        failures.push(
          `${pair.key} measures ${min.toFixed(1)} in ${worst}, below the threshold of ${THRESHOLD}` +
            (pair.premiseFell ? ' — and it is only measured at all because the exclusion\'s premise fell' : '')
        );
      }
    }
  }

  // ── the glyph ink on each composite ───────────────────────────────────────
  console.log('\n  glyph ink contrast, on each composite fill:');
  for (const [label, fill] of [
    ['accept', ACCEPT],
    ['third', THIRD],
    ['refuse', REFUSE_FILL],
  ]) {
    const ratio = contrastRatio(INK.linear, fill);
    const ok = ratio >= GRAPHICS_CONTRAST_FLOOR;
    console.log(`    ${label.padEnd(8)}${ratio.toFixed(2)}:1  ${ok ? '✓' : '✗'}`);
    if (!ok) {
      failures.push(
        `the glyph ink (${INK.utility}) measures ${ratio.toFixed(2)}:1 on the ${label} fill, ` +
          `below the ${GRAPHICS_CONTRAST_FLOOR}:1 graphics floor`
      );
    }
  }

  // ── verdict ────────────────────────────────────────────────────────────────
  console.log('');
  if (failures.length === 0) {
    console.log('  SCAN_LEGIBILITY_OK — every measured pair clears the threshold and every glyph clears the floor.');
    console.log(
      '  Read the header before treating this as safety: it measures the distance between two\n' +
        '  hues, NOT the readability of a screen. A pass says the tints are separable. It never\n' +
        '  says the door works — that stays with the door pass.\n'
    );
    process.exit(0);
  }
  console.log(`  SCAN_LEGIBILITY_FAIL — ${failures.length} finding(s):`);
  for (const f of failures) console.log(`    · ${f}`);
  console.log(
    '\n  The answer to a pair below threshold is a per-pair derogation in DEROGATIONS, carrying\n' +
      '  its measured distance and the other channels that hold that outcome — glyph, dwell,\n' +
      '  haptic and words. It is NEVER a smaller threshold (T-42-07).\n'
  );
  process.exit(1);

}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
