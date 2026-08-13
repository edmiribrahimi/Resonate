#!/usr/bin/env node
/**
 * verify-comment-stripper.mjs — prove the one stripper against the eight shapes
 * that have each blinded or false-reddened a gate, and leave no file behind.
 *
 * WHAT IT ASSERTS, in one sentence: **`scripts/lib/comments.mjs` hides every
 * needle that sits inside a comment and shows every needle that is real code, on
 * all seven measured shapes, and reports the eighth — a comment opened and never
 * closed — instead of guessing at it.**
 *
 * ── WHY THIS GATE EXISTS, AND WHY IT IS THE FIRST THING IN PHASE 41.1 ───────
 *
 * D-41.1-08. Every `REMAINING` deletion in phase 41.1 is a claim the ten gates
 * measure, and round 5 measured a money-domain entry going invisible through
 * exactly this hole, with the gate printing a conversion notice and exiting 0.
 * Converting first and repairing after would mean deleting entries on the
 * authority of a mechanism known to be blind.
 *
 * D-41.1-09 says how the proof is made: **by asserted mutation, with the
 * mutation asserted applied before its result is read.**
 * `.claude/rules/ai-engineering.md`, *prova per mutazione* — a substitution that
 * did not land produces a green that means nothing, and that failure has already
 * happened once in this repository, in both directions.
 *
 * ── THE SIX PROPERTIES, EACH ONE A LINE OF THIS FILE ────────────────────────
 *
 *   1. THE PROBES ARE FILES, AND THEY ARE WRITTEN OUTSIDE THE REPOSITORY.
 *      A fresh directory per run under the system temp directory, removed in a
 *      `finally`. `git status --porcelain` is captured before the first write
 *      and after the removal and asserted IDENTICAL — a harness that corrupts
 *      the tree it is measuring is worse than no harness (T-41.1-02).
 *   2. EVERY PROBE IS READ BACK FROM DISK AND ASSERTED BYTE-EQUAL to what was
 *      written, BEFORE any result is read. A read-back mismatch REFUSES.
 *   3. EACH SHAPE IS ASSERTED IN BOTH DIRECTIONS. Every probe declares whether
 *      its needle is real code (expect VISIBLE) or inside a comment (expect
 *      HIDDEN). A harness that only checked "hidden" would pass a stripper that
 *      blanks everything, so a one-directional pass is a failure here.
 *   4. THE FOUR PRE-FIX FAMILIES RUN BESIDE THE MERGED ONE on the same probes,
 *      so each row shows the defect and its repair together. That is what makes
 *      the table evidence rather than a claim, and it is the record that
 *      survives after the four copies are deleted from the gates.
 *   5. THE UNTERMINATED REFUSAL HAS ITS OWN PROBE. A refusal nothing exercises
 *      is a branch nobody can distinguish from an unreachable one — which is
 *      precisely DEF-41-07 item 2.
 *   6. THE VERDICT IS PRINTED LOUDLY, with the matrix, because in a repository
 *      with no error tracking a printed table is one of the few observables a
 *      gate has.
 *
 * ── WHY A STRUCTURAL CHECK AND NOT A TEST ───────────────────────────────────
 *
 * There is no test runner in this repository — no `test` script, no `*.test.*`,
 * no `*.spec.*` (`CLAUDE.md` Guardrail 1). And `npm run build` cannot see any of
 * this: a comment stripper that hands a comment back as code is valid
 * JavaScript that compiles and runs. It is wrong only against a contract written
 * in a review document, and a document does not run.
 *
 * ── WHAT A GREEN DOES NOT MEAN (cosa un verde NON significa) ────────────────
 *
 *   - IT COVERS EIGHT SHAPES, NOT EVERY SHAPE. These eight are the ones six
 *     rounds of review actually found. A ninth exists until somebody measures
 *     that it does not, and the honest reading of a green here is *"the eight
 *     that were found are closed"*.
 *   - IT SAYS NOTHING ABOUT A STRING CONTAINING A COMMENT OPENER. The module is
 *     a line-shape state machine with no notion of strings, template literals or
 *     regex literals, and its stated error direction — inherited verbatim from
 *     family D — is that such a line blanks MORE than it should.
 *   - IT DOES NOT MEASURE THE TEN GATES. It measures the module they import. A
 *     gate that imports it and then reads the raw file anyway would pass this
 *     and measure nothing, which is why the extraction commit greps for the
 *     private copies rather than trusting this green.
 *
 * ── THE EIGHT PROBES, EACH WITH THE REVIEW ENTRY THAT FOUND IT ──────────────
 *
 *   S1  DEF-41-02   multi-line JSX comment, prose body        → expect HIDDEN
 *   S2  DEF-41-06   block comment inside a JSX opening tag    → expect HIDDEN
 *   S3  round 5     closed JSX comment, live code after it    → expect VISIBLE
 *   S4  CR-01       terminating line carrying live code       → expect VISIBLE
 *   S5  CR-02       closer with whitespace before the brace   → expect VISIBLE
 *   W3  WR-03       multi-line block comment, prose body      → expect HIDDEN
 *   W4  WR-04       the degenerate opener, one comment        → expect HIDDEN
 *   U1  D-41.1-10   opened and never closed                   → expect REPORTED
 *
 * SECRECY. `.planning/` is tracked and this repository is PUBLIC (`CLAUDE.md`
 * Guardrail 5). This script writes only under the system temp directory, prints
 * only shape ids and verdicts, opens no network connection and reads no
 * environment variable beyond the one Node uses to locate that directory.
 *
 * DEF-41-01, measured: Tailwind compiles class strings out of comments, and
 * `scripts/` is inside the project root and is not ignored. **No utility class
 * string is spelled anywhere in this file**, in code, in prose or in a probe.
 *
 * Zero dependencies. Node built-ins only, ESM.
 *
 * Usage:
 *   node scripts/verify-comment-stripper.mjs
 *
 * Exit codes:
 *   0  the merged module is correct on all eight shapes
 *   1  at least one shape disagrees — each is printed with what was expected
 *   2  nothing was measured: a probe did not land on disk byte-equal, or the
 *      working tree moved during the run. **No verdict is implied by a 2.**
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { liveLinesFrom } from './lib/comments.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A refusal is not a failure: it means the measurement did not happen. */
function refuse(message) {
  console.log(`\nFATAL: ${message}\n`);
  process.exit(2);
}

/* ────────────────────────────────────────────────────────────────────────────
 * The tokens, assembled at run time — house style, and never spelled
 * ──────────────────────────────────────────────────────────────────────────── */

const JSX_OPEN = '{/' + '*';
const BLOCK_OPEN = '/' + '*';
const BLOCK_CLOSE = '*' + '/';
const JSX_CLOSE = BLOCK_CLOSE + '}';
const JSX_CLOSE_SPACED = BLOCK_CLOSE + ' }';

/* ────────────────────────────────────────────────────────────────────────────
 * The eight probes
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Shape: `{ id, found, label, needle, expectVisible, lines }`.
 *
 * `needle` is a bare identifier on purpose. It carries no colon, no bracket and
 * no dash, so nothing here can be mistaken for a utility class by the compiler
 * that reads this directory (DEF-41-01).
 */
const PROBES = [
  {
    id: 'S1',
    found: 'DEF-41-02',
    label: 'multi-line JSX comment with prose body lines',
    needle: 'NEEDLE_S1',
    expectVisible: false,
    lines: [
      '<div>',
      `  ${JSX_OPEN} prose about the element below`,
      '      NEEDLE_S1 and more prose',
      `  ${JSX_CLOSE}`,
      '</div>',
    ],
  },
  {
    id: 'S2',
    found: 'DEF-41-06',
    label: 'block comment INSIDE a JSX opening tag, prose body',
    needle: 'NEEDLE_S2',
    expectVisible: false,
    lines: [
      '<div',
      `  ${BLOCK_OPEN} prose about this attribute`,
      `     NEEDLE_S2 and more prose ${BLOCK_CLOSE}`,
      '  id="probe"',
      '>',
    ],
  },
  {
    id: 'S3',
    found: 'round 5',
    label: 'single-line closed JSX comment with LIVE CODE after the closer',
    needle: 'NEEDLE_S3',
    expectVisible: true,
    lines: ['<div>', `  ${JSX_OPEN} a note ${JSX_CLOSE} <NEEDLE_S3 />`, '</div>'],
  },
  {
    id: 'S4',
    found: 'CR-01',
    label: 'the TERMINATING line of a multi-line JSX comment carrying live code',
    needle: 'NEEDLE_S4',
    expectVisible: true,
    lines: [
      '<div>',
      `  ${JSX_OPEN} prose about the element below`,
      `      and more prose ${JSX_CLOSE} <NEEDLE_S4 />`,
      '</div>',
    ],
  },
  {
    id: 'S5',
    found: 'CR-02',
    label: 'a JSX closer carrying whitespace before the closing brace',
    needle: 'NEEDLE_S5',
    expectVisible: true,
    lines: ['<div>', `  ${JSX_OPEN} a note ${JSX_CLOSE_SPACED}`, '  <NEEDLE_S5 />', '</div>'],
  },
  {
    id: 'W3',
    found: 'WR-03',
    label: 'multi-line BLOCK comment with prose body lines',
    needle: 'NEEDLE_W3',
    expectVisible: false,
    lines: [
      'const before = 1;',
      `${BLOCK_OPEN} prose about the constant`,
      '   NEEDLE_W3 and more prose',
      BLOCK_CLOSE,
      'const after = 2;',
    ],
  },
  {
    id: 'W4',
    found: 'WR-04',
    label: 'the degenerate opener that is ONE comment, not two',
    needle: 'NEEDLE_W4',
    expectVisible: false,
    lines: [
      'const before = 1;',
      `${BLOCK_OPEN}/ NEEDLE_W4 still inside the comment`,
      BLOCK_CLOSE,
      'const after = 2;',
    ],
  },
];

/** U1 is asserted on `unterminated`, not on a needle, so it stands apart. */
const UNTERMINATED_PROBE = {
  id: 'U1',
  found: 'D-41.1-10',
  label: 'a comment opened and never closed',
  expectLineNo: 1,
  lines: [`${JSX_OPEN} opened and never closed`, '    NEEDLE_U1 prose', '<div />'],
};

/* ────────────────────────────────────────────────────────────────────────────
 * The four incumbent families, ported verbatim from the gates they came from
 *
 * The ONLY change is the input: each took a repository-relative path and read
 * the file itself; here each takes the array of raw lines the harness already
 * holds. The blanking logic is character-for-character what the gate ran, and
 * this is the record of it that survives the extraction commit.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Family A — `verify-breakpoints.mjs:369-381`, six byte-identical copies. */
function familyA(rawLines) {
  const isCommentLine = (raw) => {
    const t = raw.trim();
    return (
      t.startsWith('//') || t.startsWith('*') || t.startsWith(BLOCK_OPEN) || t.startsWith(BLOCK_CLOSE)
    );
  };
  return rawLines.map((l) => {
    const raw = l.split('\r').join('');
    return isCommentLine(raw) ? '' : raw;
  });
}

/** Family B — `verify-conversion.mjs:487-595`, byte-identical in `verify-dialogs.mjs`. */
function familyB(rawLines) {
  const CLOSING_COMMENT_OPENERS = [
    { open: JSX_OPEN, close: JSX_CLOSE },
    { open: BLOCK_OPEN, close: BLOCK_CLOSE },
    { open: '*', close: BLOCK_CLOSE },
  ];

  const stripLeadingComments = (text) => {
    let out = text;
    let jsx = false;
    for (;;) {
      const lead = out.length - out.trimStart().length;
      const trimmed = out.slice(lead);
      if (trimmed === '') return { text: out, jsx, unclosed: null };
      if (trimmed.startsWith('//')) return { text: ' '.repeat(out.length), jsx, unclosed: null };
      const span = CLOSING_COMMENT_OPENERS.find((one) => trimmed.startsWith(one.open));
      if (!span) return { text: out, jsx, unclosed: null };
      if (span.open === JSX_OPEN) jsx = true;
      const at = trimmed.indexOf(span.close, span.open.length - 1);
      if (at === -1) return { text: ' '.repeat(out.length), jsx, unclosed: span.open };
      const end = lead + at + span.close.length;
      out = ' '.repeat(end) + out.slice(end);
    }
  };

  const out = [];
  let insideJsxComment = false;
  for (const line of rawLines) {
    const text = line.split('\r').join('');
    const trimmed = text.trim();
    if (insideJsxComment) {
      out.push('');
      if (trimmed.includes(JSX_CLOSE)) insideJsxComment = false;
      continue;
    }
    const stripped = stripLeadingComments(text);
    if (stripped.unclosed === JSX_OPEN) insideJsxComment = true;
    out.push(stripped.text.trim() === '' ? '' : stripped.text);
  }
  return out;
}

/** Family C — `verify-tables.mjs:216-261`. */
function familyC(rawLines) {
  const isSiblingCommentLine = (trimmed) =>
    trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith(BLOCK_OPEN);

  const out = [];
  let insideJsxComment = false;
  for (const line of rawLines) {
    const text = line.split('\r').join('');
    const trimmed = text.trim();
    if (insideJsxComment) {
      out.push('');
      if (trimmed.includes(JSX_CLOSE)) insideJsxComment = false;
      continue;
    }
    if (trimmed.startsWith(JSX_OPEN)) {
      out.push('');
      if (!trimmed.includes(JSX_CLOSE)) insideJsxComment = true;
      continue;
    }
    out.push(isSiblingCommentLine(trimmed) ? '' : text);
  }
  return out;
}

/** Family D — `verify-touch-targets.mjs:302-358`, DEF-41-06's G5 fix. */
function familyD(rawLines) {
  const out = [];
  let insideJsxComment = false;
  let insideBlockComment = false;
  for (const line of rawLines) {
    const text = line.split('\r').join('');
    const trimmed = text.trim();
    if (insideJsxComment) {
      out.push('');
      if (trimmed.includes(JSX_CLOSE)) insideJsxComment = false;
      continue;
    }
    if (insideBlockComment) {
      out.push('');
      if (trimmed.includes(BLOCK_CLOSE)) insideBlockComment = false;
      continue;
    }
    if (trimmed.startsWith(JSX_OPEN)) {
      out.push('');
      if (!trimmed.includes(JSX_CLOSE)) insideJsxComment = true;
      continue;
    }
    if (trimmed.startsWith(BLOCK_OPEN)) {
      out.push('');
      if (!trimmed.includes(BLOCK_CLOSE)) insideBlockComment = true;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      out.push('');
      continue;
    }
    out.push(text);
  }
  return out;
}

const FAMILIES = [
  ['A sibling', familyA],
  ['B span', familyB],
  ['C tables', familyC],
  ['D jsx+blk', familyD],
];

/* ────────────────────────────────────────────────────────────────────────────
 * The working tree, before anything is written
 * ──────────────────────────────────────────────────────────────────────────── */

/** `git status --porcelain`, or a refusal if git cannot be asked. */
function workingTreeStatus() {
  const run = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  if (run.error || run.status !== 0) {
    refuse(
      'git status --porcelain could not be run, so this harness cannot prove it left the\n' +
        '       working tree untouched. That proof is the point (T-41.1-02). Nothing was measured.'
    );
  }
  return run.stdout;
}

console.log('');
console.log('verify-comment-stripper — one stripper, eight shapes, proved by asserted mutation');
console.log('');
console.log(
  '  A refusal is not a failure: it means the measurement did not happen.\n' +
    '  0 = passed  ·  1 = FAILED  ·  2 = REFUSED, and nothing was measured.\n'
);

const statusBefore = workingTreeStatus();

/* ────────────────────────────────────────────────────────────────────────────
 * Write the probes OUTSIDE the repository, read each back, assert it landed
 * ──────────────────────────────────────────────────────────────────────────── */

const probeDir = mkdtempSync(join(tmpdir(), 'resonate-stripper-'));

/** Every probe, with the lines actually READ BACK from disk. */
const landed = [];

try {
  const all = [...PROBES, UNTERMINATED_PROBE];

  for (const probe of all) {
    const text = `${probe.lines.join('\n')}\n`;
    const path = join(probeDir, `${probe.id}.probe.txt`);
    writeFileSync(path, text, 'utf8');

    const readBack = readFileSync(path, 'utf8');
    if (readBack !== text) {
      rmSync(probeDir, { recursive: true, force: true });
      refuse(
        `probe ${probe.id} did not land on disk byte-equal to what was written.\n` +
          '       A green from a substitution that did not land is a green that means nothing\n' +
          '       (.claude/rules/ai-engineering.md, prova per mutazione). NOTHING WAS MEASURED.'
      );
    }
    landed.push({ probe, lines: readBack.split('\n') });
  }

  console.log(`  probes written outside the repository : ${all.length}`);
  console.log(`  each read back and asserted byte-equal: yes`);
  console.log(`  probe directory                       : ${probeDir}`);
  console.log('');

  /* ── the matrix ───────────────────────────────────────────────────────── */

  const failures = [];

  /** `ok` · `BLIND` (real code hidden) · `FALSE-RED` (comment handed back). */
  function verdictOf(visible, expectVisible) {
    if (visible === expectVisible) return 'ok';
    return expectVisible ? 'BLIND' : 'FALSE-RED';
  }

  const header =
    '  shape  found        expect   merged      ' +
    FAMILIES.map(([name]) => name.padEnd(11)).join('');
  console.log(header);
  console.log(`  ${'─'.repeat(header.length + 4)}`);

  for (const { probe, lines } of landed) {
    if (probe.id === UNTERMINATED_PROBE.id) continue;

    const merged = liveLinesFrom(lines);
    const mergedVisible = merged.lines.some((l) => l.includes(probe.needle));
    const mergedVerdict = verdictOf(mergedVisible, probe.expectVisible);
    if (mergedVerdict !== 'ok') {
      failures.push(
        `${probe.id} (${probe.found}) — ${probe.label}\n` +
          `         expected the needle ${probe.expectVisible ? 'VISIBLE' : 'HIDDEN'}, ` +
          `measured ${mergedVisible ? 'VISIBLE' : 'HIDDEN'} → ${mergedVerdict}`
      );
    }

    const familyCells = FAMILIES.map(([, fn]) => {
      const visible = fn(lines).some((l) => l.includes(probe.needle));
      return verdictOf(visible, probe.expectVisible).padEnd(11);
    });

    console.log(
      `  ${probe.id.padEnd(7)}${probe.found.padEnd(13)}` +
        `${(probe.expectVisible ? 'visible' : 'hidden').padEnd(9)}` +
        `${mergedVerdict.padEnd(12)}${familyCells.join('')}`
    );
  }

  /* ── U1, asserted on `unterminated` rather than on a needle ───────────── */

  const u1 = landed.find(({ probe }) => probe.id === UNTERMINATED_PROBE.id);
  const u1Result = liveLinesFrom(u1.lines);
  const u1Ok =
    u1Result.unterminated !== null &&
    u1Result.unterminated.lineNo === UNTERMINATED_PROBE.expectLineNo;

  console.log(
    `  ${'U1'.padEnd(7)}${UNTERMINATED_PROBE.found.padEnd(13)}${'reported'.padEnd(9)}` +
      `${(u1Ok ? 'ok' : 'MISSED').padEnd(12)}` +
      FAMILIES.map(() => 'n/a'.padEnd(11)).join('')
  );

  if (!u1Ok) {
    failures.push(
      `U1 (${UNTERMINATED_PROBE.found}) — ${UNTERMINATED_PROBE.label}\n` +
        `         expected unterminated at line ${UNTERMINATED_PROBE.expectLineNo}, measured ` +
        `${u1Result.unterminated === null ? 'null' : `line ${u1Result.unterminated.lineNo}`}`
    );
  }

  console.log('');
  console.log(
    '  BLIND     = the needle is real code and the stripper hid it → a green that measured nothing\n' +
      '  FALSE-RED = the needle is inside a comment and the stripper handed it back as code →\n' +
      '              a red on a correct file, which is how a gate gets switched off\n' +
      '  n/a       = no incumbent family had a notion of an unterminated comment at all\n'
  );

  /* ── the verdict ──────────────────────────────────────────────────────── */

  if (failures.length > 0) {
    console.log(
      `  COMMENT_STRIPPER_FAILED — ${failures.length} shape(s) disagree with the module's own\n` +
        '  description. Each is printed with what was expected and what was measured:\n\n       ' +
        failures.join('\n\n       ') +
        '\n'
    );
  } else {
    console.log('  COMMENT_STRIPPER_OK — the merged module is correct on all eight shapes.');
    console.log('');
    console.log(
      '  Read the matrix, not the tick. Every FALSE-RED and every BLIND in the family columns\n' +
        '  is a defect that was live in a gate on this tree, and the merged column beside it is\n' +
        '  the only reason a REMAINING deletion later in this phase rests on anything (D-41.1-08).'
    );
  }

  /* ── the working tree, after ──────────────────────────────────────────── */

  rmSync(probeDir, { recursive: true, force: true });

  const statusAfter = workingTreeStatus();
  if (statusAfter !== statusBefore) {
    refuse(
      'the working tree moved during this run.\n' +
        '       Probes are written under the system temp directory precisely so it cannot\n' +
        '       (D-41.1-09, T-41.1-02), so a difference here means this harness corrupted the\n' +
        '       tree it was measuring. NOTHING WAS MEASURED.\n\n' +
        `       before: ${JSON.stringify(statusBefore)}\n` +
        `       after : ${JSON.stringify(statusAfter)}`
    );
  }

  console.log('');
  console.log('  git status --porcelain, identical before and after this run: yes');
  console.log('');

  process.exit(failures.length > 0 ? 1 : 0);
} finally {
  rmSync(probeDir, { recursive: true, force: true });
}
