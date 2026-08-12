/**
 * verify-touch-targets — G5, the touch-target gate (RESP-03, criterion 5).
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  WHAT A GREEN DOES NOT MEAN                                              ║
 * ║                                                                          ║
 * ║  **It does not say that anything is 44px.**                              ║
 * ║                                                                          ║
 * ║  This gate reads CLASS STRINGS. It cannot see a flex stretch, an icon    ║
 * ║  set's own height, a `line-height` override, a transform, or a target    ║
 * ║  padded by an ancestor. Every one of those decides a rendered box, and   ║
 * ║  none of them is written in the attribute this parser reads.             ║
 * ║                                                                          ║
 * ║  **H41-4 is the only proof that anything is 44px.** It requires a large  ║
 * ║  touch screen, and `41-RESEARCH.md` records that one may not be          ║
 * ║  available — in which case criterion 5 is recorded `human_needed` and    ║
 * ║  **is not ticked**. A green here does not tick it and may not be quoted  ║
 * ║  as if it did.                                                           ║
 * ║                                                                          ║
 * ║  The research figure this gate descends from — 118 of 174 measurable     ║
 * ║  elements under 44px — is a class-string heuristic and stays labelled    ║
 * ║  as one. A STRICTER parser measures FEWER elements and therefore reports ║
 * ║  GREENER, which is why the measured count is printed per file on every   ║
 * ║  run: the number that matters is not the verdict, it is how much the     ║
 * ║  verdict was taken over.                                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── WHAT IT ASSERTS — `41-UI-SPEC.md` §13, quoted rather than paraphrased ───
 *
 * > **over the files named in the conversion manifest and only those: every
 * > `<button>`, `<a>`, `<Link>`, `<input>`, `<select>`, `<textarea>` and
 * > `<summary>` written outside a primitive carries `min-h-11` (or a larger
 * > explicit `h-*`/`min-h-*`) in its class string, or matches an exemption
 * > below. It asserts a class string. It does not assert a rendered box.**
 *
 * `41-UI-SPEC.md` §6.3 closes the other half: *"Everything else is 44px
 * unconditionally, at every tier, on every device."* The allow-list of shrinks
 * has exactly one item and it is exemption 3 below.
 *
 * ── WHY IT IS SCOPED, AND WHY THE SCOPE IS THE WHOLE DESIGN ─────────────────
 *
 * `41-VALIDATION.md` rates this gate's false-positive risk **HIGH — the highest
 * of the five**: run tree-wide it goes red on Phase 42's files, on decorative
 * anchors, on icons inside stretched flex rows, and on elements padded by an
 * ancestor. **A gate that fires on correct code gets switched off, and a
 * switched-off gate guards nothing while looking like it does**
 * (`verify-media-strip.mjs:51-62` records the same failure).
 *
 * So it walks the import closures of the surfaces in `scripts/conversion-manifest.mjs`
 * `CONVERTED`, and **nothing else**. Not `src/`. Not a glob. A file enters this
 * gate's scope when a human writes a surface into that manifest, which is a
 * decision somebody signs.
 *
 * ── THE SIX EXEMPTIONS, CLOSED BEFORE THE FIRST RUN ─────────────────────────
 *
 * §0 rule 3: an exemption list is written before the gate, not after its first
 * red. All six below existed before this file was executed once. Each is a
 * named exported constant with its reason above it, and **the report prints how
 * many times each was applied** — a green must state what it forgave.
 *
 * **Three of the six have zero sites in this tree today** (3, 4 and 5). That is
 * recorded rather than hidden, and each was proven able to fire by mutation:
 * an exemption nobody can reach is decoration, and this repository already
 * measured what a decorative check costs.
 *
 * **Adding a seventh is a contract edit**, not a fix for a red. §13's list is
 * closed. The known future red is written at `KNOWN_FUTURE_REDS` below rather
 * than pre-empted by a quiet widening.
 *
 * ── PROVEN ABLE TO FAIL, WITH EVERY MUTATION ASSERTED BEFORE ITS RESULT ─────
 *
 * D-41-19, and `41-VALIDATION.md`'s sign-off: *"proven red … with the mutation
 * asserted to have landed before its result is read"*. The reason that clause
 * exists is a measured false negative in this repository — a substitution that
 * silently did not apply, whose green read exactly like a working check
 * (`ai-engineering.md`, gate prova per mutazione).
 *
 * Five cycles were run on 2026-08-12. In each, the mutation was asserted
 * PRESENT by `grep -c` before the gate was run, and asserted ABSENT after the
 * revert; the tree ends byte-identical, asserted by an empty `git status`.
 *
 *   R0  the manifest emptied            → exit 2, a REFUSAL, not a pass
 *   R1  a minimum shrunk to 32px        → exit 1, naming the file, the line,
 *                                         the element and the resolved pixels
 *   R2  the height class removed        → exit 1, verdict *absent* — the half
 *                                         that catches an over-lenient parser
 *   E3a the shrink WITH its import      → exit 0, exemption 3 applied once,
 *                                         measured count 9 → 8
 *   E3b the shrink WITHOUT its import   → exit 1. **Both conditions are
 *                                         load-bearing**, and the same run
 *                                         proves the leading boundary guard:
 *                                         the prefixed value was read as NO
 *                                         declaration rather than as 36px
 *   E4  the minimum behind a breakpoint → exit 1. A height that only applies
 *                                         above a width is not the
 *                                         unconditional minimum §6.3 requires,
 *                                         and a phone never reaches that width
 *
 * **E3b and E4 are the two that matter**, because they are the two ways a
 * looser parser would have gone green on a target a finger cannot hit.
 *
 * ── THE FIRST RUN WENT RED ON REAL CODE, AND THAT IS THE POINT ──────────────
 *
 * Before any mutation, the gate's first execution failed on two elements: the
 * only link from `/login` to registration, and its twin on `/register`. Both
 * were bare inline links with no height of their own, on surfaces already
 * declared converted. §6.3 answers them without ambiguity — *everything else is
 * 44px unconditionally* — and the tree had already answered the same shape
 * twice in this phase. **They were fixed at the element. The gate's threshold
 * did not move and no exemption was widened.**
 *
 * ── THE COMMENT STRIPPER HAS A FOURTH AND A FIFTH SHAPE ─────────────────────
 *
 * DEF-41-02 records that a JSX comment `{​/* … *​/}` is LIVE to a gate whose
 * stripper only knows the three sibling openers, because its opening line
 * starts with a brace. That extension is inherited from `verify-conversion.mjs`.
 *
 * **This file needed a fifth**, and it was measured rather than anticipated:
 * `src/components/media/MediaGrid.tsx:67-72` carries a block comment **inside a
 * JSX opening tag**, indented, whose body lines start with prose rather than
 * with a star. The three sibling openers blank its first and last lines and
 * leave four sentences live — one of which contains an apostrophe, which opens
 * a quote that never closes and runs the tag scanner to end of file. Measured
 * consequence before the fix: **one unterminated opening tag, and every element
 * after it in that file unscanned.** So a block comment is a state here, not a
 * line shape: an opener without its closer blanks lines until the closer
 * arrives. Its error direction is stated rather than assumed — it can blank
 * MORE than it should if a line's first characters are a block opener inside a
 * string, which is why the opener must be at the start of the trimmed line.
 *
 * **And an unterminated opening tag is now a REFUSAL, not a shrug.** When the
 * scanner loses sync, everything after it in that file goes unmeasured — a
 * narrowing in the one direction that produces a green.
 *
 * ── DEF-41-01, WHICH GOVERNS HOW THIS FILE IS WRITTEN ───────────────────────
 *
 * Tailwind compiles class strings out of comments. **This file therefore builds
 * its matchers from parts and never spells a whole utility in prose.** Where a
 * comment has to name one, it describes it — *the forty-four-pixel minimum*,
 * *the shrink variant* — rather than writing it. The literals that must exist
 * are in the constants, where they are code.
 *
 * ── WHY THE HELPERS ARE LOCAL AND NOT IMPORTED ──────────────────────────────
 *
 * `verify-tokens.mjs` runs its checks at module scope and ends in
 * `process.exit()` with no main-module guard, so importing it runs the TOKEN
 * gate and exits this process with the TOKEN gate's verdict — a vacuous green
 * wearing somebody else's tick. `verify-conversion.mjs:166-178` measured this
 * and made the same call. **Self-contained is the house shape for a gate.**
 *
 * `scripts/conversion-manifest.mjs` IS imported, and safely: nothing runs at its
 * import time, by construction and by its own docblock.
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script reads only committed files under `src/`, prints only
 * paths, line numbers and source lines, opens no network connection, reads no
 * environment variable and writes no artefact.
 *
 * Zero dependencies. Node built-ins only, ESM. Deliberately NOT wired into
 * `npm run build`: `next build` is the type gate, and a type gate that starts
 * failing for a reason that is not a type teaches everyone to ignore it.
 *
 * Usage:
 *   node scripts/verify-touch-targets.mjs
 *
 * (Not registered in `package.json` here. Plan 41-12 owns that file and
 * registers every new gate at once, so no two plans in a wave contend for it.)
 *
 * Exit codes:
 *   0  every measured element declares the minimum, or matches an exemption
 *   1  at least one did not — each printed with its file, its line, the element
 *      and the class string as written
 *   2  nothing was measured: the manifest is missing, unimportable, empty or
 *      inconsistent; a closure is empty or has an unresolvable specifier; an
 *      opening tag could not be terminated; or the parser found no measurable
 *      element at all. **No verdict is implied by a 2.**
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(2);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Comment hygiene — five shapes, the last two measured rather than assumed
 * ──────────────────────────────────────────────────────────────────────────── */

const JSX_COMMENT_OPEN = '{/' + '*';
const JSX_COMMENT_CLOSE = '*' + '/}';
const BLOCK_COMMENT_OPEN = '/' + '*';
const BLOCK_COMMENT_CLOSE = '*' + '/';

/** Counters the report prints, so both extensions are measurable, not trusted. */
const blanked = { jsx: 0, block: 0, sibling: 0 };

const liveLinesCache = new Map();

/** The file's lines with every comment blanked, carriage returns removed. */
function liveLines(relPath) {
  const cached = liveLinesCache.get(relPath);
  if (cached) return cached;

  const raw = readFileSync(`${ROOT}/${relPath}`, 'utf8').split('\n');
  const out = [];
  let insideJsxComment = false;
  let insideBlockComment = false;

  for (const line of raw) {
    const text = line.split('\r').join('');
    const trimmed = text.trim();

    if (insideJsxComment) {
      out.push('');
      blanked.jsx += 1;
      if (trimmed.includes(JSX_COMMENT_CLOSE)) insideJsxComment = false;
      continue;
    }
    if (insideBlockComment) {
      out.push('');
      blanked.block += 1;
      if (trimmed.includes(BLOCK_COMMENT_CLOSE)) insideBlockComment = false;
      continue;
    }
    if (trimmed.startsWith(JSX_COMMENT_OPEN)) {
      out.push('');
      blanked.jsx += 1;
      if (!trimmed.includes(JSX_COMMENT_CLOSE)) insideJsxComment = true;
      continue;
    }
    if (trimmed.startsWith(BLOCK_COMMENT_OPEN)) {
      out.push('');
      blanked.block += 1;
      if (!trimmed.includes(BLOCK_COMMENT_CLOSE)) insideBlockComment = true;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      out.push('');
      blanked.sibling += 1;
      continue;
    }
    out.push(text);
  }

  liveLinesCache.set(relPath, out);
  return out;
}

const liveSourceCache = new Map();

function liveSource(relPath) {
  const cached = liveSourceCache.get(relPath);
  if (cached !== undefined) return cached;
  const joined = liveLines(relPath).join('\n');
  liveSourceCache.set(relPath, joined);
  return joined;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The import-closure walk — the same walk `verify-conversion.mjs` performs
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `.ts` is included and that is a measured decision, not a preference: with
 * `.tsx` alone the first declared surface has an unresolved specifier — its own
 * server action — so the walk would stop there and the gate would report a
 * green over a closure it had silently narrowed.
 */
const RESOLVE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs'];

/** Local specifiers pointing at these are content, not code: not followed. */
const NON_CODE_SUFFIXES = ['.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.ico'];

/**
 * The cache key is a JSON pair. It is written that way after the defect
 * `verify-conversion.mjs:383-394` records: a NUL separator makes the file
 * BINARY to `grep`, so every `grep` over the gate returns nothing at all rather
 * than zero — which turns a mutation assertion into a false negative that reads
 * exactly like *"the substitution did not land"*. Printable separators only.
 */
const resolveCache = new Map();

function resolveSpecifier(spec, fromRel) {
  const fromDir = fromRel.split('/').slice(0, -1).join('/');
  const key = JSON.stringify([fromDir, spec]);
  if (resolveCache.has(key)) return resolveCache.get(key);
  const result = resolveSpecifierUncached(spec, fromRel);
  resolveCache.set(key, result);
  return result;
}

function resolveSpecifierUncached(spec, fromRel) {
  let base;
  if (spec.startsWith('@/')) {
    base = `src/${spec.slice(2)}`;
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    const dir = fromRel.split('/').slice(0, -1).join('/');
    base = resolve(`/${dir}`, spec).slice(1);
  } else {
    return null;
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    if (existsSync(`${ROOT}/${base}${ext}`)) return `${base}${ext}`;
  }
  for (const ext of RESOLVE_EXTENSIONS) {
    if (existsSync(`${ROOT}/${base}/index${ext}`)) return `${base}/index${ext}`;
  }
  if (existsSync(`${ROOT}/${base}`) && RESOLVE_EXTENSIONS.some((e) => base.endsWith(e))) {
    return base;
  }
  return null;
}

function isLocalSpecifier(spec) {
  return spec.startsWith('@/') || spec.startsWith('./') || spec.startsWith('../');
}

function isNonCodeSpecifier(spec) {
  return NON_CODE_SUFFIXES.some((suffix) => spec.endsWith(suffix));
}

/*
 * The clause class excludes `;` and both quote characters, so a match cannot run
 * from one statement's opening keyword across an intervening statement to a
 * later `from` — the failure that would attribute one file's imports to another.
 */
const NAMED_IMPORT_RE = /\bimport\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
const REEXPORT_RE = /\bexport\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT_RE = /\bimport\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function localSpecifiers(relPath) {
  const source = liveSource(relPath);
  const specs = [];
  for (const re of [NAMED_IMPORT_RE, REEXPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) specs.push(m[2]);
  }
  for (const re of [SIDE_EFFECT_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) specs.push(m[1]);
  }
  return specs.filter(isLocalSpecifier);
}

function importClosure(entryRel) {
  const reached = new Set();
  const unresolved = [];
  const queue = [entryRel];

  while (queue.length > 0) {
    const rel = queue.shift();
    if (reached.has(rel)) continue;
    reached.add(rel);

    for (const spec of localSpecifiers(rel)) {
      if (isNonCodeSpecifier(spec)) continue;
      const target = resolveSpecifier(spec, rel);
      if (target === null) {
        unresolved.push({ from: rel, spec });
        continue;
      }
      if (!reached.has(target)) queue.push(target);
    }
  }

  return { reached: [...reached].sort(), unresolved };
}

/**
 * Which local bindings in `relPath` come from which resolved module.
 *
 * Exemption 2 uses this and would be WRONG without it: `src/emails/*.tsx`
 * render a component called `Button` imported from `@react-email/components`,
 * which is a different component in a different rendering environment. Reading
 * the name alone would forgive it *"because the size lives in the primitive"* —
 * a sentence that is false about that element. The import is what makes the
 * claim true, so the import is what is checked.
 */
const importMapCache = new Map();

function fileImportMap(relPath) {
  const cached = importMapCache.get(relPath);
  if (cached) return cached;

  const map = new Map();
  const source = liveSource(relPath);
  for (const re of [NAMED_IMPORT_RE, REEXPORT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      const clause = m[1];
      const spec = m[2];
      if (!isLocalSpecifier(spec)) continue;
      const target = resolveSpecifier(spec, relPath);
      if (target === null) continue;

      const braced = clause.match(/\{([^}]*)\}/);
      const names = [];
      if (braced) {
        for (const part of braced[1].split(',')) {
          const bare = part.replace(/\btype\b/g, '').trim();
          if (bare === '') continue;
          const asMatch = bare.match(/^(\S+)\s+as\s+(\S+)$/);
          names.push(asMatch ? asMatch[2] : bare);
        }
      }
      const defaultName = clause.replace(/\{[^}]*\}/g, '').replace(/,/g, ' ').trim();
      if (defaultName !== '' && /^[A-Za-z_$][\w$]*$/.test(defaultName)) names.push(defaultName);

      for (const name of names) map.set(name, target);
    }
  }

  importMapCache.set(relPath, map);
  return map;
}

/* ────────────────────────────────────────────────────────────────────────────
 * THE SIX EXEMPTIONS — every one a named constant, with its reason above it
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * EXEMPTION 1 — Phase 42, by path.
 *
 * The door and the scanner belong to Phase 42, which takes colour, contrast and
 * type only. `ScannerClient.tsx:2909,2918` are about eighteen pixels and are the
 * **smallest interactive elements in the tree** — and they are not this phase's
 * to change. Excluding them is not indulgence: the check-in path is read at an
 * entrance, in the dark, one-handed, with no network, and a visual phase that
 * reaches into it is a visual phase touching the door.
 *
 * By path and not by judgement, because the failure mode of a judgement is a
 * gate that widens its own scope one convenient file at a time.
 *
 * **If this gate ever finds an under-44px target inside these paths it will not
 * report it, and that silence is deliberate** — but it is also the most
 * important thing this gate could ever find, so the paths are printed on every
 * run with the reminder that they were never measured.
 */
export const PHASE_42_EXEMPT_PATHS = [
  [
    'src/app/(admin)/**/scanner/**',
    'the scanner surface and its route — Phase 42 decides what the door looks like',
  ],
  [
    'src/components/scanner/**',
    "the scanner's components — the check-in path, read at an entrance with one hand and no network",
  ],
  [
    'src/app/(admin)/door/**',
    "the door's second address (STAFF-04) — excluding one address and not the other would fence half a thing",
  ],
];

/**
 * EXEMPTION 2 — elements rendered by a primitive.
 *
 * §13: *"The size lives in the primitive and G5 does not parse the call site."*
 * Two halves, and both are needed:
 *
 *   a. **The primitive's own file.** `Button.tsx:157` writes a raw element whose
 *      class attribute is `{`${BASE} ${SIZE.icon} …`}` — four identifiers. The
 *      forty-four-pixel minimum is in the size map at `:87-90`, which is not in
 *      the attribute and which a class-string parser cannot follow. Measuring it
 *      there would be measuring an interpolation.
 *   b. **The call site.** `<Button size="sm">` is a component, not one of §13's
 *      seven raw tags, so it is out of the scanned set by construction — but it
 *      IS an interactive element, and leaving it uncounted would make the report
 *      say a dense surface has one interactive element when it has eleven.
 *      Counted, forgiven, printed.
 *
 * **The premise is asserted, not assumed.** A file exempted under (a) must still
 * declare the minimum somewhere in it. If somebody deletes it from `Button.tsx`,
 * exemption 2 would otherwise forgive the whole product in silence — the exact
 * shape of a check that goes quiet while the thing it tracked is still there.
 * That assertion is a FAILURE (exit 1), not a refusal: the premise being false
 * is a defect, not an inability to measure.
 *
 * `Switch` carries a null path: **it does not exist in this tree.** D-41-04
 * forbids publishing a primitive in a wave that does not render it, and no
 * surface converted so far has a switch. The entry is kept so this list holds
 * §13's ten names rather than nine, and so the plan that publishes `Switch` has
 * a place to put its path. A null removes nothing from scope; a wrong path would.
 *
 * Shape: `[symbol, modulePath | null, reason]`.
 */
export const PRIMITIVE_COMPONENTS = [
  ['Button', 'src/components/ui/Button.tsx', 'the labelled rung of the button ladder'],
  ['IconButton', 'src/components/ui/Button.tsx', 'the icon rung — square by declaration, both axes'],
  ['Chip', 'src/components/ui/Chip.tsx', 'the interactive badge, and therefore a target'],
  ['Input', 'src/components/ui/Input.tsx', 'the text-entry control on the boundary that measures'],
  ['Select', 'src/components/ui/Input.tsx', 'the native select on the same boundary'],
  ['Textarea', 'src/components/ui/Input.tsx', 'the multi-line control on the same boundary'],
  ['Checkbox', 'src/components/ui/Checkbox.tsx', 'a drawn box inside a hit area that is also the control name'],
  ['Switch', null, 'NOT PUBLISHED — no converted surface renders one (D-41-04). A null path removes nothing from scope'],
  ['AppNav', 'src/components/layout/AppNav.tsx', 'the product navigation in both tiers'],
  ['StaffNav', 'src/components/staff/StaffNav.tsx', 'the eight work tabs in two forms'],
];

/**
 * EXEMPTION 3 — the one permitted shrink, §6.3, allow-list closed at one item.
 *
 * The row-action buttons in the `DataTable` primitive's desktop branch may fall
 * to thirty-six pixels on a machine with **no coarse pointer at all**. That
 * branch never renders on a phone.
 *
 * **Both conditions or neither.** The shrink variant AND a `DataTable` import,
 * in the same file. §6.2's asymmetry is the reason the test is this shape and
 * not a looser one: the query is only ever used to shrink, and only where no
 * touch input exists, so a wrong answer costs a slightly-too-large button and
 * never a too-small one — `checkin-offline.md`'s asymmetry applied to a control.
 *
 * **Zero raw elements in this tree exercise it today.** `MemberTable.tsx:311`
 * carries the shrink, but on a `<Button>` call site, which exemption 2 forgives
 * first. This exemption is therefore reachable by mutation and unused in fact,
 * and both halves are stated because an exemption nobody can reach is decoration.
 */
export const SHRINK_VARIANT = 'pointer-fine-only';
export const SHRINK_MIN_SPACING = 9;
export const SHRINK_REQUIRES_IMPORT = 'src/components/ui/DataTable.tsx';

/**
 * EXEMPTION 4 — a wrapper whose only child is another interactive element.
 *
 * A link around a button, where the inner element carries the target and the
 * outer one would double it. **It must carry a declared marker**, and the marker
 * is read, never inferred: a marker beats a heuristic because it forces the
 * author to say so, and because it is greppable by a person who does not trust
 * this script.
 *
 * **Zero sites in this tree.** Plan 41-10 measured `grep -c` returning 0 across
 * `/admin/members` and wrote that writing one where nothing needs it would be an
 * exemption claimed for nothing. It stays claimed for nothing here too.
 */
export const CHILD_TARGET_MARKER = 'data-target="child"';

/**
 * EXEMPTION 5 — a visually-hidden input whose visible target is its label.
 *
 * The pattern is the screen-reader-only utility together with the peer utility
 * on the input, and a sibling label carrying the minimum. G5 reads the label.
 *
 * **Zero sites, and the reason is a warning plan 41-10 wrote for this file:**
 * `Checkbox` is a **visible** sixteen-pixel input inside a forty-four-pixel
 * label, so it is exemption **2**, not 5. A G5 written to expect the hidden-input
 * shape on a checkbox would look for the wrong thing in the one tree it has.
 */
export const HIDDEN_INPUT_MARKERS = ['sr-only', 'peer'];

/**
 * EXEMPTION 6 — a non-interactive badge.
 *
 * G5 scans interactive elements only, and a badge is a `<span>`. **A badge that
 * is a link or a button is a Chip**, and a Chip is exemption 2 — so the
 * distinction costs nothing here: the raw tags are scanned whatever they are
 * dressed as, and the badge component is counted and forgiven by name.
 */
export const NON_INTERACTIVE_COMPONENTS = [
  ['Badge', 'src/components/ui/Chip.tsx', 'a span with no prop that makes it interactive'],
];

/**
 * The one shape this gate is known to red on, written down instead of pre-empted.
 *
 * A hidden input has no box at all, so failing it would be a red on correct
 * code — and it is the most likely seventh exemption somebody will want. It is
 * NOT added here: §13's list is closed, and widening it to clear a red is the
 * tampering `T-41-42` names. There are zero such elements in scope today; when
 * the first one arrives, the resolution is a contract edit that a person reads.
 */
export const KNOWN_FUTURE_REDS = [
  [
    'an input of type hidden',
    'it renders no box, so no height class is meaningful — and adding it here would be widening a closed list to clear a red. Zero in scope today',
  ],
  [
    'a height expressed with a keyword rather than a number',
    'a full or screen height declares a box the parser cannot resolve to pixels; it is not an explicit minimum, so it does not pass. Zero in scope today',
  ],
];

/* ────────────────────────────────────────────────────────────────────────────
 * The element scanner
 * ──────────────────────────────────────────────────────────────────────────── */

/** §13's seven, plus the routed link, which §13 names in the same sentence. */
export const SCANNED_TAGS = ['button', 'a', 'input', 'select', 'textarea', 'summary', 'Link'];

const PRIMITIVE_NAMES = new Set(PRIMITIVE_COMPONENTS.map(([name]) => name));
const NON_INTERACTIVE_NAMES = new Set(NON_INTERACTIVE_COMPONENTS.map(([name]) => name));
const COMPONENT_NAMES = [...PRIMITIVE_NAMES, ...NON_INTERACTIVE_NAMES];

/**
 * The opening-tag matcher, with a trailing boundary guard on every name.
 *
 * The guard is not decoration and this phase has now paid for its absence three
 * times (41-02, 41-07, 41-10). Without it `<a` matches `<article` and `<aside`,
 * `<summary` is fine but `<Link` matches `<LinkPreview`, and `<Button` matches
 * `<ButtonRow`. A name that is a prefix of another name is the whole family of
 * defects, and only a mutation finds it.
 */
const TAG_RE = new RegExp(
  `<(${[...SCANNED_TAGS, ...COMPONENT_NAMES].join('|')})(?![A-Za-z0-9_-])`,
  'g'
);

/**
 * The end of an opening tag, found by walking rather than by regex.
 *
 * JSX attribute values nest braces and quotes arbitrarily, so the closing angle
 * bracket is the first one at brace depth zero outside a string. Returns `-1`
 * when the walk reaches end of file, which is a REFUSAL upstream: the scanner
 * has lost sync and everything after it in that file is unmeasured.
 */
function endOfOpeningTag(source, start) {
  let i = start;
  let depth = 0;
  let quote = null;

  while (i < source.length) {
    const c = source[i];
    if (quote !== null) {
      if (c === quote && source[i - 1] !== '\\') quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      i += 1;
      continue;
    }
    if (c === '{') { depth += 1; i += 1; continue; }
    if (c === '}') { depth -= 1; i += 1; continue; }
    if (c === '>' && depth === 0) return i;
    i += 1;
  }
  return -1;
}

/** Every opening tag of interest in one file, with its line and its text. */
function scanElements(relPath) {
  const lines = liveLines(relPath);
  const source = lines.join('\n');

  const lineStarts = [];
  let acc = 0;
  for (const line of lines) {
    lineStarts.push(acc);
    acc += line.length + 1;
  }
  const lineOf = (offset) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const found = [];
  const unterminated = [];
  TAG_RE.lastIndex = 0;
  let m;
  while ((m = TAG_RE.exec(source)) !== null) {
    const end = endOfOpeningTag(source, m.index + m[0].length);
    if (end === -1) {
      unterminated.push({ path: relPath, line: lineOf(m.index), name: m[1] });
      continue;
    }
    found.push({
      path: relPath,
      line: lineOf(m.index),
      name: m[1],
      text: source.slice(m.index, end + 1).split('\n').map((s) => s.trim()).join(' '),
    });
  }
  return { found, unterminated };
}

/* ────────────────────────────────────────────────────────────────────────────
 * The height parse
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * `--spacing` is a quarter of a rem — read at `node_modules/tailwindcss/theme.css:325`
 * by `41-UI-SPEC.md` §6.1, not assumed — so one step of the numeric scale is
 * four pixels and the eleventh step is forty-four.
 */
const PX_PER_SPACING_STEP = 4;
const PX_PER_REM = 16;
export const REQUIRED_PX = 44;

/**
 * The height matcher, with a LEADING guard that is the whole point of it.
 *
 * The leading class excludes a colon, so a **variant-prefixed** height is not
 * read as a declaration. §6.2: *"forty-four pixels is the unprefixed default.
 * The query is only ever used to shrink."* A height that only applies above a
 * breakpoint, or only on hover, or only where no coarse pointer exists, is not
 * the unconditional minimum §6.3 requires — and reading it as one would forgive
 * exactly the shrink the allow-list closes at one item.
 *
 * It also excludes a word character and a hyphen, so the `h` inside the longer
 * minimum utility is not matched a second time as a bare height.
 *
 * The trailing guard excludes a word character and a hyphen, so a longer utility
 * whose name begins with a shorter one is not read as the shorter one. This is
 * the boundary defect 41-02, 41-07 and 41-10 each paid for, in its third form.
 */
const HEIGHT_RE = /(?<![:\w-])(min-h|h)-(\d+(?:\.\d+)?|\[[^\]\s]+\])(?![\w-])/g;

/** The shrink, read as a whole token — variant, utility and value together. */
const SHRINK_RE = new RegExp(
  `(?<![\\w-])${SHRINK_VARIANT}:min-h-(\\d+)(?![\\w-])`,
  'g'
);

/**
 * Resolve one height value to pixels, or `null` when the parser cannot.
 *
 * `null` is not a pass. A value this parser cannot evaluate is a value it has
 * not measured, and the element carrying it is reported unresolved rather than
 * forgiven — the direction that does not produce a green.
 */
function heightToPx(raw) {
  if (!raw.startsWith('[')) {
    const n = Number(raw);
    return Number.isFinite(n) ? n * PX_PER_SPACING_STEP : null;
  }
  const inner = raw.slice(1, -1);
  const px = inner.match(/^(\d+(?:\.\d+)?)px$/);
  if (px) return Number(px[1]);
  const rem = inner.match(/^(\d+(?:\.\d+)?)rem$/);
  if (rem) return Number(rem[1]) * PX_PER_REM;
  return null;
}

/**
 * Read one element's declared heights.
 *
 * Returns `{ verdict, detail }` where verdict is one of:
 *   `pass`         — a minimum-height declaration of at least the required px,
 *                    or a single height declaration of at least it
 *   `too-small`    — every declaration resolved, and none reaches the required px
 *   `absent`       — no unprefixed height declaration at all
 *   `unresolvable` — a declaration this parser cannot evaluate, or two different
 *                    plain heights, where Tailwind's EMISSION ORDER decides and
 *                    the class attribute does not (DEF-41-05, measured in this
 *                    same phase on a radius that provably did nothing)
 */
function readHeights(text) {
  const mins = [];
  const heights = [];
  const unresolved = [];

  HEIGHT_RE.lastIndex = 0;
  let m;
  while ((m = HEIGHT_RE.exec(text)) !== null) {
    const px = heightToPx(m[2]);
    if (px === null) {
      unresolved.push(`${m[1]}-${m[2]}`);
      continue;
    }
    (m[1] === 'min-h' ? mins : heights).push({ token: `${m[1]}-${m[2]}`, px });
  }

  if (unresolved.length > 0) {
    return { verdict: 'unresolvable', detail: `cannot evaluate ${unresolved.join(', ')}` };
  }
  if (mins.some((d) => d.px >= REQUIRED_PX)) {
    const win = mins.find((d) => d.px >= REQUIRED_PX);
    return { verdict: 'pass', detail: `${win.token} = ${win.px}px` };
  }
  if (heights.length > 1) {
    const distinct = new Set(heights.map((d) => d.px));
    if (distinct.size > 1) {
      return {
        verdict: 'unresolvable',
        detail:
          `two different plain heights (${heights.map((d) => d.token).join(', ')}) — ` +
          "which one applies is decided by the stylesheet's emission order, not by the class attribute (DEF-41-05)",
      };
    }
  }
  if (heights.some((d) => d.px >= REQUIRED_PX)) {
    const win = heights.find((d) => d.px >= REQUIRED_PX);
    return { verdict: 'pass', detail: `${win.token} = ${win.px}px` };
  }
  const all = [...mins, ...heights];
  if (all.length === 0) return { verdict: 'absent', detail: 'no unprefixed height declaration' };
  return {
    verdict: 'too-small',
    detail: all.map((d) => `${d.token} = ${d.px}px`).join(', ') + ` — below ${REQUIRED_PX}px`,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Glob matching, for exemption 1
 * ──────────────────────────────────────────────────────────────────────────── */

/** `**` crosses separators, `*` does not, everything else is literal. */
function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1;
      } else {
        out += '[^/]*';
      }
      continue;
    }
    out += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${out}$`);
}

/* ══════════════════════════════════════════════════════════════════════════════
 * THE RUN
 * ══════════════════════════════════════════════════════════════════════════════ */

console.log('\nverify-touch-targets — G5, RESP-03 criterion 5\n');
console.log('  It asserts a CLASS STRING. It does not assert a rendered box.');
console.log('  H41-4 on a large touch screen is the only proof that anything is 44px.\n');

let manifest;
try {
  manifest = await import(`${ROOT}/scripts/conversion-manifest.mjs`);
} catch (error) {
  refuse(
    'scripts/conversion-manifest.mjs could not be imported, so this gate has no\n' +
      `       scope at all and measured nothing.\n\n       ${error.message}`
  );
}

const { PHASE_42_PATHS, CONVERTED, checkManifest } = manifest;

if (!Array.isArray(CONVERTED) || typeof checkManifest !== 'function') {
  refuse(
    'the manifest does not export CONVERTED and checkManifest. Nothing was measured.'
  );
}

const verdict = checkManifest();
if (!verdict.ok) {
  refuse(
    `the manifest refuses, with ${verdict.refusals.length} reason(s):\n\n       ` +
      verdict.refusals.join('\n\n       ')
  );
}

if (CONVERTED.length === 0) {
  refuse(
    'CONVERTED is empty, so this gate has nothing to scan and would print a tick\n' +
      '       having measured nothing. A vacuous green is not a green.'
  );
}

/* ── The fence, printed before anything is measured ─────────────────────────── */

const fencePatterns = PHASE_42_EXEMPT_PATHS.map(([glob, reason]) => ({
  glob,
  reason,
  re: globToRegExp(glob),
}));

/*
 * The fence in the manifest and the fence in this file must be the same fence.
 * Two lists that drift is how one gate ends up guarding a path the other one
 * scans, and neither report says so.
 */
const manifestFence = (PHASE_42_PATHS ?? []).map(([glob]) => glob).sort();
const localFence = PHASE_42_EXEMPT_PATHS.map(([glob]) => glob).sort();
if (JSON.stringify(manifestFence) !== JSON.stringify(localFence)) {
  refuse(
    "this gate's Phase 42 fence and the manifest's do not match, so one of the two\n" +
      '       is guarding a path the other scans. Nothing was measured.\n\n' +
      `       manifest: ${manifestFence.join(', ')}\n` +
      `       gate:     ${localFence.join(', ')}`
  );
}

function fenceMatch(relPath) {
  return fencePatterns.find(({ re }) => re.test(relPath)) ?? null;
}

console.log('  exemption 1 — Phase 42, fenced by path and NEVER measured:\n');
for (const [glob, reason] of PHASE_42_EXEMPT_PATHS) {
  console.log(`    ${glob}`);
  console.log(`      ${reason}`);
}
console.log(
  '\n    If an under-44px target exists behind that fence this gate is silent about\n' +
    '    it. The door is where a target too small to hit becomes a queue.\n'
);

/* ── The scope ──────────────────────────────────────────────────────────────── */

const surfaces = [];
const inScope = new Set();
const fenced = new Map();

for (const [route, pageFile] of CONVERTED) {
  const { reached, unresolved } = importClosure(pageFile);
  if (unresolved.length > 0) {
    refuse(
      `the closure of ${route} has ${unresolved.length} local specifier(s) this walk\n` +
        '       could not resolve, so its scope is narrower than the surface. A narrowed\n' +
        '       scope is the direction that produces a green.\n\n       ' +
        unresolved.map(({ from, spec }) => `${from} → ${spec}`).join('\n       ')
    );
  }
  if (reached.length === 0) {
    refuse(`the closure of ${route} is empty. Nothing was measured.`);
  }

  const scannable = [];
  for (const rel of reached) {
    const hit = fenceMatch(rel);
    if (hit !== null) {
      fenced.set(rel, hit.glob);
      continue;
    }
    if (!/\.(tsx|jsx)$/.test(rel)) continue;
    scannable.push(rel);
    inScope.add(rel);
  }
  surfaces.push({ route, pageFile, reached: reached.length, scannable });
}

if (inScope.size === 0) {
  refuse(
    'no file in any converted closure carries JSX, so no element could be scanned.\n' +
      '       Nothing was measured.'
  );
}

console.log(
  `  scope — ${CONVERTED.length} converted surface(s), ${inScope.size} file(s) with JSX\n`
);

/* ── Exemption 2's premise, asserted before it forgives anything ────────────── */

const failures = [];
const applied = { e1: fenced.size, e2a: 0, e2b: 0, e3: 0, e4: 0, e5: 0, e6: 0 };

const PRIMITIVE_FILES = new Map();
for (const [symbol, path, reason] of PRIMITIVE_COMPONENTS) {
  if (path === null) continue;
  if (!existsSync(`${ROOT}/${path}`)) {
    refuse(
      `exemption 2 names ${symbol} at ${path}, which is not on disk. A stale exemption\n` +
        '       silently removes a real file from a scan — the one failure direction that\n' +
        '       produces a green. Nothing was measured.'
    );
  }
  if (!PRIMITIVE_FILES.has(path)) PRIMITIVE_FILES.set(path, []);
  PRIMITIVE_FILES.get(path).push(`${symbol} — ${reason}`);
}

const MINIMUM_UTILITY = `min-h-${REQUIRED_PX / PX_PER_SPACING_STEP}`;

console.log("  exemption 2 — the primitive's own file, and its premise checked:\n");
for (const [path, symbols] of PRIMITIVE_FILES) {
  const declares = liveLines(path).some((line) => {
    HEIGHT_RE.lastIndex = 0;
    let m;
    while ((m = HEIGHT_RE.exec(line)) !== null) {
      const px = heightToPx(m[2]);
      if (px !== null && px >= REQUIRED_PX) return true;
    }
    return false;
  });
  console.log(`    ${path} — ${declares ? 'declares the minimum' : 'DOES NOT DECLARE IT'}`);
  for (const s of symbols) console.log(`      ${s}`);
  if (!declares) {
    failures.push({
      path,
      line: 0,
      name: '(exemption 2)',
      reason:
        `this file is exempted because "the size lives in the primitive", and it no longer ` +
        `declares any unprefixed minimum of at least ${REQUIRED_PX}px (${MINIMUM_UTILITY} or larger). ` +
        'The exemption\'s premise is false, so the exemption is forgiving every call site in the product for nothing',
      text: '',
    });
  }
}
for (const [symbol, path, reason] of PRIMITIVE_COMPONENTS) {
  if (path === null) console.log(`    ${symbol} — ${reason}`);
}
console.log('');

/* ── The scan ───────────────────────────────────────────────────────────────── */

const perFile = [];
const unterminatedAll = [];
let measuredTotal = 0;

for (const rel of [...inScope].sort()) {
  const { found, unterminated } = scanElements(rel);
  unterminatedAll.push(...unterminated);

  const imports = fileImportMap(rel);
  const isPrimitiveFile = PRIMITIVE_FILES.has(rel);
  const importsDataTable = [...imports.values()].includes(SHRINK_REQUIRES_IMPORT);

  const row = { path: rel, found: found.length, measured: 0, passed: 0, e2a: 0, e2b: 0, e3: 0, e4: 0, e5: 0, e6: 0, skipped: 0 };

  for (const el of found) {
    // A component call site: exemption 2b or 6, and only when the import agrees.
    if (PRIMITIVE_NAMES.has(el.name) || NON_INTERACTIVE_NAMES.has(el.name)) {
      const declared = [...PRIMITIVE_COMPONENTS, ...NON_INTERACTIVE_COMPONENTS].find(
        ([name]) => name === el.name
      );
      const modulePath = declared[1];
      if (modulePath !== null && imports.get(el.name) === modulePath) {
        if (NON_INTERACTIVE_NAMES.has(el.name)) { row.e6 += 1; applied.e6 += 1; }
        else { row.e2b += 1; applied.e2b += 1; }
      } else {
        // A same-named component from somewhere else — an email's button is not
        // this product's button. Out of §13's element set, counted so it is visible.
        row.skipped += 1;
      }
      continue;
    }

    // A raw tag inside a primitive's own file: exemption 2a.
    if (isPrimitiveFile) {
      row.e2a += 1;
      applied.e2a += 1;
      continue;
    }

    // Exemption 4 — the declared marker, read and never inferred.
    if (el.text.includes(CHILD_TARGET_MARKER)) {
      row.e4 += 1;
      applied.e4 += 1;
      continue;
    }

    // Exemption 5 — a visually-hidden input whose visible target is its label.
    if (el.name === 'input' && HIDDEN_INPUT_MARKERS.every((mark) => el.text.includes(mark))) {
      row.e5 += 1;
      applied.e5 += 1;
      continue;
    }

    // Measured.
    row.measured += 1;
    measuredTotal += 1;
    const heights = readHeights(el.text);

    if (heights.verdict === 'pass') {
      row.passed += 1;
      continue;
    }

    // Exemption 3 — the one permitted shrink, both conditions or neither.
    SHRINK_RE.lastIndex = 0;
    const shrink = SHRINK_RE.exec(el.text);
    if (shrink !== null && Number(shrink[1]) >= SHRINK_MIN_SPACING && importsDataTable) {
      row.e3 += 1;
      applied.e3 += 1;
      row.measured -= 1;
      measuredTotal -= 1;
      continue;
    }

    failures.push({
      path: rel,
      line: el.line,
      name: el.name,
      reason:
        heights.verdict === 'absent'
          ? `no unprefixed height declaration — §6.3 says every target is ${REQUIRED_PX}px unconditionally`
          : heights.verdict === 'unresolvable'
            ? `unresolvable: ${heights.detail}`
            : `${heights.detail}`,
      text: el.text.length > 220 ? `${el.text.slice(0, 220)}…` : el.text,
    });
  }

  if (row.found > 0) perFile.push(row);
}

if (unterminatedAll.length > 0) {
  refuse(
    `${unterminatedAll.length} opening tag(s) could not be terminated, so the scanner lost\n` +
      '       sync and every element after each of them went unmeasured — a narrowing in the\n' +
      '       one direction that produces a green.\n\n       ' +
      unterminatedAll.map((u) => `${u.path}:${u.line} <${u.name}`).join('\n       ')
  );
}

/* ── The per-file report — what was measured, and what was forgiven ─────────── */

console.log('  per file — found / measured / exempt, by category:\n');
console.log(
  '    ' +
    'file'.padEnd(58) +
    'found'.padStart(6) +
    'meas'.padStart(6) +
    'e2a'.padStart(5) +
    'e2b'.padStart(5) +
    'e3'.padStart(4) +
    'e4'.padStart(4) +
    'e5'.padStart(4) +
    'e6'.padStart(4)
);
for (const row of perFile) {
  const name = row.path.length > 57 ? `…${row.path.slice(-56)}` : row.path;
  console.log(
    '    ' +
      name.padEnd(58) +
      String(row.found).padStart(6) +
      String(row.measured).padStart(6) +
      String(row.e2a).padStart(5) +
      String(row.e2b).padStart(5) +
      String(row.e3).padStart(4) +
      String(row.e4).padStart(4) +
      String(row.e5).padStart(4) +
      String(row.e6).padStart(4)
  );
}
console.log('');

/*
 * Per SURFACE as well as per file, because a surface is what the manifest
 * declares and a person meets. The two views do not sum to the same total and
 * that is not a discrepancy: the primitives are in several closures at once, so
 * a file scanned once is reported under every surface that reaches it.
 */
const rowByPath = new Map(perFile.map((row) => [row.path, row]));
console.log('  per converted surface — its closure, and what was measured in it:\n');
for (const s of surfaces) {
  let found = 0;
  let measured = 0;
  let exempt = 0;
  for (const rel of s.scannable) {
    const row = rowByPath.get(rel);
    if (row === undefined) continue;
    found += row.found;
    measured += row.measured;
    exempt += row.e2a + row.e2b + row.e3 + row.e4 + row.e5 + row.e6;
  }
  console.log(
    `    ${s.route.padEnd(26)} ${String(s.reached).padStart(3)} file(s) reached, ` +
      `${String(found).padStart(3)} element(s) found, ${String(measured).padStart(3)} measured, ` +
      `${String(exempt).padStart(3)} exempt`
  );
}
console.log('');

console.log('  exemptions applied, by category:\n');
console.log(`    1  Phase 42, by path                     ${applied.e1} file(s) fenced, never measured`);
console.log(`    2a raw element inside a primitive's file  ${applied.e2a}`);
console.log(`    2b a primitive rendered at a call site    ${applied.e2b}`);
console.log(`    3  the one permitted shrink               ${applied.e3}`);
console.log(`    4  a wrapper marked as deferring to child ${applied.e4}`);
console.log(`    5  a hidden input named by its label      ${applied.e5}`);
console.log(`    6  a non-interactive badge                ${applied.e6}`);
console.log('');

for (const [n, key, note] of [
  [3, 'e3', `its only possible site is a file importing ${SHRINK_REQUIRES_IMPORT}; the one shrink in this tree is written on a call site, which exemption 2b forgives first`],
  [4, 'e4', 'no wrapper in any converted closure has an interactive element as its only child'],
  [5, 'e5', "the checkbox in this tree is a VISIBLE box inside its label, so it is exemption 2, not 5"],
]) {
  if (applied[key] === 0) {
    console.log(`    exemption ${n} applied ZERO times. ${note}.`);
  }
}
console.log('');

console.log('  known future reds, declared instead of pre-empted:\n');
for (const [shape, why] of KNOWN_FUTURE_REDS) {
  console.log(`    ${shape}`);
  console.log(`      ${why}`);
}
console.log('');

console.log(
  `  comment lines blanked — ${blanked.sibling} sibling, ${blanked.jsx} JSX, ${blanked.block} block\n`
);

/* ── The verdict ────────────────────────────────────────────────────────────── */

if (measuredTotal === 0) {
  refuse(
    'the parser found NO measurable element in any converted closure. Every element\n' +
      '       it met was exempted, so it would print a tick having measured nothing — which\n' +
      '       is exactly the failure T-41-40 names. A stricter parser measures fewer\n' +
      '       elements and reports greener; zero is where that ends.'
  );
}

console.log(`  measured ${measuredTotal} element(s) across ${perFile.length} file(s).\n`);

if (failures.length > 0) {
  console.log(`  FAILED — ${failures.length} element(s) do not declare the minimum:\n`);
  for (const f of failures) {
    console.log(`    ${f.path}${f.line > 0 ? `:${f.line}` : ''}  <${f.name}>`);
    console.log(`      ${f.reason}`);
    if (f.text !== '') console.log(`      ${f.text}`);
    console.log('');
  }
  console.log(
    '  Fix the ELEMENT, not this gate. Widening an exemption to clear a red is the\n' +
      '  tampering T-41-42 names, and the alternative the plan permits is deleting the\n' +
      '  gate outright — never loosening its threshold.\n'
  );
  process.exit(1);
}

console.log('  PASSED — every measured element declares an unprefixed minimum of at least');
console.log(`  ${REQUIRED_PX}px, or matches one of the six exemptions printed above.\n`);
console.log('  This is NOT a statement that anything renders at 44px. H41-4 is.\n');
process.exit(0);
