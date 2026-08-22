#!/usr/bin/env node
/**
 * verify-venue-surfaces.mjs — a public surface may not render a venue field on
 * a night somebody made secret.
 *
 * WHAT IT ASSERTS, in one sentence: **the decision "may this surface show a
 * secret night's venue?" has exactly one home, that home answers `false` for
 * every secret night on a public surface, and neither of the two surfaces that
 * render a venue field reaches it without asking.**
 *
 * The rule it is measuring is the owner's, taken on 2026-08-22 and written down
 * in `.planning/todos/pending/secret-venue-three-surfaces.md`: *the reveal does
 * not make the address public — it makes it known to whoever bought.*
 *
 * ── WHY THIS GATE EXISTS AT ALL ─────────────────────────────────────────────
 *
 * There is no test runner for the product in this repository. The verification
 * of this change is `npm run build` plus a written manual procedure, and both of
 * those measure the tree ONCE, on the day somebody runs them. What neither
 * measures is the edit six months from now that reconnects a reveal verdict to a
 * public render site because it looked like a bug that the address never shows.
 *
 * This is the one domain in the project where that mistake has no undo, so it
 * gets the one automatic thing that can be honestly written about it.
 *
 * ── WHAT A GREEN HERE DOES *NOT* MEAN ───────────────────────────────────────
 *
 *   - It does NOT mean no address can reach anybody. `event_parties.venue_text`
 *     is FREE TEXT SOMEBODY TYPED. This gate can prove that a surface asks the
 *     predicate before printing that column; it cannot prove that what a person
 *     typed into it was safe to store, and nothing in a repository can.
 *   - It does NOT cover the WALLET PASS. `src/app/api/tickets/[id]/wallet/route.ts`
 *     writes the same column onto a signed file that syncs to a phone and cannot
 *     be recalled, and it asks nothing. That exit is real, it is named in
 *     `41.2-08-FINDINGS.md` §1, and it is **outside the owner's three-surface
 *     rule** — so this gate does not pretend to have closed it. Check C names it
 *     out loud on every run rather than letting a green imply otherwise.
 *   - It does NOT prove a PAYLOAD is safe by proving a RENDER is guarded. Those
 *     are different measurements, and this gate learned the difference the
 *     expensive way: for a whole phase checks A-C were green while
 *     `(public)/events/page.tsx` handed the night's free venue text to
 *     `EventTabs`, a `"use client"` component, on secret nights too. No pixel
 *     rendered it, so no render-site check could see it, and it was readable
 *     from view-source by anybody. **Check E is that lesson**, and it looks at
 *     the boundary rather than at the paint.
 *   - It does NOT cover the DATABASE. `public.venue_for_parties` still answers a
 *     secret night's address to an entitled caller over PostgREST. That is the
 *     boundary, it is wider than every surface above it, and wider is the safe
 *     direction — but a green here says nothing about it. RLS is the security
 *     boundary (`CLAUDE.md`, principle 2); a script is not.
 *   - It does NOT cover MEDIA. A photograph that frames the sign carries the
 *     same information down a road with no predicate on it at all.
 *
 * ── THE FIVE CHECKS ─────────────────────────────────────────────────────────
 *
 *   A. The predicate's TRUTH TABLE, executed. `mayShowVenueOnPublicSurface`
 *      answers `false` for a secret night under every combination of reveal
 *      inputs — revealed by hand, past its window, past its start, all three at
 *      once — and `true` only for a night stored as `false`. And
 *      `mayShowVenueToTicketHolder` answers `false` for a secret night with no
 *      reveal and `true` once one has fired.
 *   B. ONE HOME. Each predicate is defined exactly once in `src/`, and the two
 *      surfaces that render a venue field import it rather than restating it.
 *   C. NO UNGATED RENDER on the two surfaces: every venue-bearing expression in
 *      the two page files sits inside a branch that names the surface's gate.
 *   D. The exits this gate cannot see are PRINTED on every run.
 *   E. NO SECRET VENUE IN A PAYLOAD. Every `"use client"` file under
 *      `src/app/(public)/` is swept for the raw venue column names, and the two
 *      server files that build a client boundary are asserted to take the
 *      secrecy term — and the SESSION term — where the value is BUILT rather
 *      than where it is painted.
 *
 * Exit codes follow the repository's convention: `0 = passed · 1 = failed ·
 * 2 = refused`. A refusal is not a failure — it means the measurement did not
 * happen.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MODULE_PATH = join(ROOT, "src/lib/venue-reveal/venue-disclosure.ts");
const PUBLIC_PAGE = join(ROOT, "src/app/(public)/events/[slug]/page.tsx");
const TICKET_PAGE = join(ROOT, "src/app/(public)/tickets/[id]/page.tsx");

const failures = [];
const notes = [];

function fail(check, message) {
  failures.push(`${check}  ${message}`);
}

function read(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

/* ────────────────────────────────────────────────────────────────────────────
 * CHECK A — the truth table, executed rather than read
 *
 * The module is TypeScript with a `@/` import, so it cannot be `import()`ed by
 * bare node. Rather than add a build step to a gate — which would make the gate
 * depend on the thing it is checking — the two functions are re-evaluated from
 * the file's own source with the type annotations stripped and the one import
 * satisfied by the real `src/utils/datetime.ts` values, read the same way.
 *
 * This is the honest form of the trade: the gate executes THE SOURCE ON DISK,
 * not a copy of it. If the predicate changes, the strings below change with it,
 * because they ARE it.
 * ──────────────────────────────────────────────────────────────────────────── */

function stripTypes(src) {
  return src
    // interface / type blocks
    .replace(/^export\s+(interface|type)\s+[\s\S]*?^}\n/gm, "")
    // return type annotations on function declarations
    .replace(/\)\s*:\s*boolean\s*\{/g, ") {")
    // parameter annotations: `x: { ... }` and `x: boolean | null | undefined`
    .replace(/\(\s*venueSecret\s*:[^)]*\)/g, "(venueSecret)")
    .replace(/\(night\s*:\s*\{[\s\S]*?\}\s*\)/g, "(night)")
    .replace(/\(night\s*:\s*NightVenueState\s*\)/g, "(night)");
}

let mod = null;
const moduleSrc = read(MODULE_PATH);
const datetimeSrc = read(join(ROOT, "src/utils/datetime.ts"));

if (moduleSrc === null || datetimeSrc === null) {
  console.error(
    "REFUSED — src/lib/venue-reveal/venue-disclosure.ts or src/utils/datetime.ts is absent.\n" +
      "Nothing about venue disclosure was measured."
  );
  process.exit(2);
}

try {
  // The two values the module imports, re-derived from their own source so that
  // a change to the default window shows up here instead of being shadowed by a
  // literal written in this file.
  const defaultHoursMatch = datetimeSrc.match(
    /export const DEFAULT_VENUE_REVEAL_HOURS\s*=\s*(\d+)/
  );
  if (!defaultHoursMatch) throw new Error("DEFAULT_VENUE_REVEAL_HOURS not found");
  const DEFAULT_HOURS = Number(defaultHoursMatch[1]);

  const body = stripTypes(moduleSrc)
    .replace(/^import[\s\S]*?;\s*$/m, "")
    .replace(/export function/g, "function")
    .replace(/export interface[\s\S]*?\n}\n/g, "");

  const factory = new Function(
    "partyStartInstant",
    "venueRevealHours",
    `${body}\nreturn { isNightSecret, mayShowVenueOnPublicSurface, hasRevealFired, mayShowVenueToTicketHolder };`
  );

  mod = factory(
    (date, time) => new Date(`${date}T${time ?? "00:00"}:00Z`),
    (stored) =>
      typeof stored === "number" && Number.isFinite(stored) ? stored : DEFAULT_HOURS
  );
} catch (error) {
  console.error(
    `REFUSED — could not evaluate the predicate module: ${error.message}\n` +
      "Nothing about venue disclosure was measured."
  );
  process.exit(2);
}

const DAY = 86_400_000;
const iso = (ms) => new Date(ms).toISOString();
const dayOf = (ms) => iso(ms).slice(0, 10);

const now = Date.now();
const FUTURE = now + 30 * DAY; // far outside any plausible window
const IMMINENT = now + 60 * 60 * 1000; // inside every plausible window
const PAST = now - 2 * DAY;

/** Every combination of reveal inputs, on a night stored as SECRET. */
const REVEAL_STATES = [
  ["nothing has fired", { at: FUTURE, revealedAt: null }],
  ["revealed by hand", { at: FUTURE, revealedAt: iso(now - 1000) }],
  ["inside the window", { at: IMMINENT, revealedAt: null }],
  ["the night has passed", { at: PAST, revealedAt: null }],
  ["revealed by hand AND past", { at: PAST, revealedAt: iso(now - 1000) }],
];

for (const [label, state] of REVEAL_STATES) {
  for (const secret of [true, null, undefined]) {
    const shown = mod.mayShowVenueOnPublicSurface({ venueSecret: secret });
    if (shown) {
      fail(
        "A",
        `a public surface would show a night stored \`${String(secret)}\` when ${label}. ` +
          "The owner's rule is: never, at any moment of the night's life."
      );
    }
  }
}

if (mod.mayShowVenueOnPublicSurface({ venueSecret: false }) !== true) {
  fail("A", "a public surface refuses a night explicitly stored as NOT secret — too narrow, and that is a defect too.");
}

for (const [label, state] of REVEAL_STATES) {
  const night = {
    venueSecret: true,
    partyDate: dayOf(state.at),
    partyTime: iso(state.at).slice(11, 16),
    venueRevealHours: null,
    venueRevealedAt: state.revealedAt,
  };
  const shown = mod.mayShowVenueToTicketHolder(night);
  const expected = label !== "nothing has fired";
  if (shown !== expected) {
    fail(
      "A",
      `the holder's ticket answers ${shown} when ${label}; expected ${expected}.`
    );
  }
}

if (
  mod.mayShowVenueToTicketHolder({
    venueSecret: false,
    partyDate: dayOf(FUTURE),
    partyTime: "22:00",
    venueRevealHours: null,
    venueRevealedAt: null,
  }) !== true
) {
  fail("A", "the holder's ticket hides a night that was never secret.");
}

if (
  mod.mayShowVenueToTicketHolder({
    venueSecret: true,
    partyDate: "not-a-date",
    partyTime: null,
    venueRevealHours: null,
    venueRevealedAt: "not-an-instant",
  }) !== false
) {
  fail(
    "A",
    "an unreadable date and an unparseable reveal instant do not refuse — " +
      "`venue-secrecy.md` *default chiuso* says the fallback is the secret."
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * CHECK B — one home, and both surfaces read it
 * ──────────────────────────────────────────────────────────────────────────── */

const publicSrc = read(PUBLIC_PAGE);
const ticketSrc = read(TICKET_PAGE);

if (publicSrc === null || ticketSrc === null) {
  console.error("REFUSED — one of the two venue surfaces is absent from the tree.");
  process.exit(2);
}

for (const name of [
  "mayShowVenueOnPublicSurface",
  "mayShowVenueToTicketHolder",
  "isNightSecret",
  "hasRevealFired",
]) {
  const definitions = (moduleSrc.match(new RegExp(`function ${name}\\b`, "g")) || []).length;
  if (definitions !== 1) {
    fail("B", `\`${name}\` is defined ${definitions}× in the predicate module; expected exactly 1.`);
  }
}

if (!/from ["']@\/lib\/venue-reveal\/venue-disclosure["']/.test(publicSrc)) {
  fail("B", "the public event page does not import the predicate module — it has grown a venue test of its own.");
}
if (!/from ["']@\/lib\/venue-reveal\/venue-disclosure["']/.test(ticketSrc)) {
  fail("B", "the ticket page does not import the predicate module — it has grown a venue test of its own.");
}

/* ────────────────────────────────────────────────────────────────────────────
 * CHECK C — no ungated render on either surface
 *
 * WHAT THIS MEASURES, said precisely so a green is not over-read: for every
 * venue-bearing expression printed by these two files, the line that opens its
 * branch names the surface's gate. It measures the EXPRESSION TEXT, not the
 * semantics — so a rename reds it loudly (which is the wanted direction), and a
 * NEW venue render site in a THIRD file is invisible to it. Check D is where the
 * files it cannot see are named.
 * ──────────────────────────────────────────────────────────────────────────── */

const PUBLIC_GATE = "venueOnPublicSurface";
const TICKET_GATE = "venueVisibleToHolder";

const PUBLIC_RENDERS = [
  ["{venueOnPublicSurface && venueRow ? (", "the venue row — name, address and Maps link"],
  [") : venueOnPublicSurface && party.venue_text ? (", "the night's free venue text"],
];

for (const [expr, what] of PUBLIC_RENDERS) {
  const count = publicSrc.split(expr).length - 1;
  if (count !== 1) {
    fail(
      "C",
      `on the public event page, the guarded branch for ${what} occurs ${count}× ` +
        `(expected 1). Either the guard was removed, or it was renamed — ` +
        `in which case rename it here too, deliberately, and say why in the commit.`
    );
  }
}

if (/(?<![A-Za-z])venueVisible(?![A-Za-z])/.test(publicSrc)) {
  fail(
    "C",
    "the public event page still names `venueVisible` — the reveal verdict that " +
      "used to open the address there. It was removed on 2026-08-22 and must not return."
  );
}

const TICKET_RENDER = `{${TICKET_GATE} && displayVenue && (`;
if ((ticketSrc.split(TICKET_RENDER).length - 1) !== 1) {
  fail(
    "C",
    "on the ticket page the venue line is not guarded by `" + TICKET_GATE + "`. " +
      "Before 2026-08-22 it rendered unconditionally; that is the defect returning."
  );
}

if (!ticketSrc.includes(`const displayVenue = ${TICKET_GATE} ?`)) {
  fail(
    "C",
    "on the ticket page `displayVenue` is bound without consulting `" + TICKET_GATE + "`. " +
      "The address must not exist as a value on a render where the gate refused."
  );
}

if (!/export const dynamic = "force-dynamic"/.test(ticketSrc)) {
  fail(
    "C",
    "the ticket page does not declare `force-dynamic`. It renders a venue under a " +
      "predicate with a temporal term, and `venue-secrecy.md` gate *cache e pre-render* " +
      "is unconditional: a surface that shows a venue is marked dynamic and uncacheable."
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * CHECK E — no secret venue in a PAYLOAD
 *
 * WHY THIS CHECK EXISTS, and it is worth the paragraph because the failure it
 * catches is the one that got past every other check in this file.
 *
 * A `"use client"` component does not receive its props: it receives a COPY of
 * them, serialised into the document that the server sent. Every field declared
 * on that boundary travels, for every row, WHETHER OR NOT ANYTHING RENDERS IT —
 * `nextjs-architecture.md`, gate *segreti nel bundle*. So a guard written inside
 * the client component decides a PIXEL and decides nothing at all about what
 * left the server, and a reader who opens view-source never meets that guard.
 *
 * Checks A-C measure render sites. They were green, for a whole phase, while
 * `(public)/events/page.tsx` handed the night's free venue text — and the venue
 * NAME, which `public.venue_for_parties` answers to an entitled holder even on a
 * secret night — to `EventTabs` on every night on the page. Nothing rendered
 * either on a secret night, which is precisely why nothing could see it.
 *
 * WHAT IT MEASURES, said precisely so a green is not over-read:
 *
 *   E1. A SWEEP. Every `"use client"` file under `src/app/(public)/` is read and
 *       the raw venue column names are counted in it. Zero, everywhere. This is
 *       the only part of this file that can see a NEW component in a file nobody
 *       thought to list here — which is the blind spot check C names in its own
 *       docblock. It counts occurrences in PROSE too, deliberately: the
 *       docblocks on both sides of this boundary avoid spelling the removed
 *       names for exactly this reason, and a comment that mentions one would
 *       read fine to a human while turning the count into noise.
 *   E2. THE SERVER SIDE of the events-list boundary: the object handed across
 *       carries the DECIDED label and the flag, and the label is built under the
 *       secrecy term rather than filtered afterwards.
 *   E3. THE NORMALISATION'S DIRECTION. `?? false` — *unknown means public* — must
 *       not return next to the secrecy flag on that page. It was there until
 *       2026-08-22 and it was the wrong way round for an irreversible act.
 *   E4. THE HINT'S SESSION TERM, on the night's own page. The hint is shown only
 *       to a signed-in reader; the branch that says so lives in a client
 *       component, so the value must not be BUILT for a reader with no session.
 *
 * What it does NOT measure: whether a value that legitimately crosses is safe.
 * `venue_label` on a NON-secret night is the venue's real name, and it is meant
 * to be — the posters print it.
 *
 * ── PROVED BY MUTATION, 2026-08-22 ──────────────────────────────────────────
 *
 * A check nobody has seen go red is a check nobody has seen work. Six mutations
 * were applied to the tree, one at a time; each was RE-READ FROM DISK AND
 * ASSERTED PRESENT BEFORE THE GATE WAS RUN — a mutation run that skips that step
 * cannot tell *the gate caught it* from *the edit never landed*, and the second
 * reads exactly like the first — and each was reverted by writing the saved
 * bytes back, never by a git command that discards a working tree.
 *
 *   M1   `EventTabs` re-declares the night's free venue text   → E1, exit 1
 *   M1b  a NEW client component under `(public)` names the hint → E1, exit 1
 *   M2   the list hands the raw columns across again            → E2, exit 1
 *   M3a  the normalisation is restated in a second form         → E3, exit 1
 *   M3b  `?? false` returns — *unknown means public*            → E3, exit 1
 *   M4   the hint is built for a reader with no session         → E4, exit 1
 *
 * M1b is the one that matters most: it is a file that appears in no list in this
 * script, and it is the blind spot check C names in its own docblock. Afterwards
 * the tree was compared byte-for-byte with its starting state and the gate was
 * green again — the control, without which six reds prove only that the script
 * can fail.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The raw column names that may not appear in a public client component, in any
 * form. `venue_name` is on the list although no column is called that: it is the
 * prop the events list used to declare, and a name that leaked once is a name
 * that must not come back by habit.
 */
const RAW_VENUE_NAMES = [
  "venue_text",
  "venue_name",
  "venue_secret_hint",
  "google_maps_url",
];

const PUBLIC_TREE = join(ROOT, "src/app/(public)");

function collectSources(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSources(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

/**
 * A directive, not a mention. `"use client"` is only a directive when it is the
 * first statement of the file, so only the opening lines are consulted — a
 * docblock three hundred lines down that QUOTES the directive (several in this
 * repository do) must not turn a server component into a client one here.
 */
function isClientComponent(source) {
  const head = source.split("\n").slice(0, 3).join("\n");
  return /^\s*["']use client["']/m.test(head);
}

const clientFiles = collectSources(PUBLIC_TREE).filter((file) => {
  const source = read(file);
  return source !== null && isClientComponent(source);
});

if (clientFiles.length === 0) {
  console.error(
    "REFUSED — no `\"use client\"` file was found under src/app/(public). Either the\n" +
      "tree moved or the sweep is looking in the wrong place; it did not measure zero,\n" +
      "it measured nothing."
  );
  process.exit(2);
}

for (const file of clientFiles) {
  const source = read(file);
  const relative = file.slice(ROOT.length + 1);

  for (const name of RAW_VENUE_NAMES) {
    const occurrences =
      (source.match(new RegExp(`(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`, "g")) || [])
        .length;
    if (occurrences > 0) {
      fail(
        "E1",
        `${relative} is a "use client" component and names \`${name}\` ${occurrences}×. ` +
          "Everything declared on a client boundary is serialised into the document of " +
          "the page, for every row, whether or not a pixel renders it — so a guard in " +
          "that component cannot close this. Decide it on the server and send the result."
      );
    }
  }

  // The venues table's own address column, matched as a DECLARED FIELD rather
  // than as a word: `address` appears in prose across this repository meaning a
  // URL, and counting those would drown the signal.
  if (/^\s*address\??\s*:\s*string/m.test(source)) {
    fail(
      "E1",
      `${relative} is a "use client" component and declares an \`address\` field. ` +
        "The venue's street address does not cross a client boundary on a public surface."
    );
  }
}

const LIST_PAGE = join(ROOT, "src/app/(public)/events/page.tsx");
const listPageSrc = read(LIST_PAGE);

if (listPageSrc === null) {
  console.error("REFUSED — the events list page is absent from the tree.");
  process.exit(2);
}

const LIST_PAYLOAD = "venue_label: nightIsSecret ? null :";
if ((listPageSrc.split(LIST_PAYLOAD).length - 1) !== 1) {
  fail(
    "E2",
    "on the events list page the marker handed to EventTabs is not built as " +
      `\`${LIST_PAYLOAD} …\`. Either the secrecy term was dropped from the ` +
      "construction, or the label was renamed — in which case rename it here too, " +
      "deliberately, and say why in the commit. What must not happen is a raw column " +
      "crossing with the decision left on the far side."
  );
}

const LIST_NORMALISATION = "const nightIsSecret = p.venue_secret !== false;";
if ((listPageSrc.split(LIST_NORMALISATION).length - 1) !== 1) {
  fail(
    "E3",
    "on the events list page the secrecy flag is not normalised exactly once as " +
      `\`${LIST_NORMALISATION}\`. The normalisation has one home so that a second ` +
      "raw read cannot reintroduce the loose form beside it."
  );
}

if (/venue_secret\s*\?\?\s*false/.test(listPageSrc)) {
  fail(
    "E3",
    "the events list page normalises the secrecy flag with `?? false` — *unknown " +
      "means public*. That is the wrong way round for an irreversible act and it is " +
      "the exact form removed on 2026-08-22: a null column, a partial embed or a shape " +
      "PostgREST answered differently would OPEN a venue. `venue-secrecy.md` *default " +
      "chiuso*: the fallback is the secret."
  );
}

const DETAIL_PAGE = join(ROOT, "src/app/(public)/events/[slug]/page.tsx");
const detailSrc = read(DETAIL_PAGE);

if (detailSrc === null) {
  console.error("REFUSED — the night's own page is absent from the tree.");
  process.exit(2);
}

if (!/venueOnPublicSurface\s*\|\|\s*!isAuthenticated/.test(detailSrc)) {
  fail(
    "E4",
    "on the night's page the hint handed to `SecretVenueDialog` is built without a " +
      "session term. The dialog prints it under `hint && isAuthenticated`, which is " +
      "correct about the pixel and powerless about the payload: a `\"use client\"` " +
      "component receives the string in the document, so a reader with no session — " +
      "the very reader that branch refuses — can read it from view-source."
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * CHECK D — the exits this gate cannot see, printed every run
 * ──────────────────────────────────────────────────────────────────────────── */

const WALLET = "src/app/api/tickets/[id]/wallet/route.ts";

const walletSrc = read(join(ROOT, WALLET));
if (walletSrc && /venue:\s*party\?\.venue_text/.test(walletSrc)) {
  notes.push(
    `${WALLET} still writes the night's free venue text onto the wallet pass with no ` +
      "secrecy term. A pass leaves the product: signed, downloaded, synced to a device, " +
      "and nothing here can recall it — the same irreversibility class as a sent mail, " +
      "with a longer tail. NOT covered by the owner's three-surface rule of 2026-08-22, " +
      "and deliberately not closed. It needs its own decision."
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

console.log("venue surfaces — the owner's rule of 2026-08-22, measured\n");
console.log("  A  the predicate's truth table, executed from the source on disk");
console.log("  B  one home for each predicate, and both surfaces import it");
console.log("  C  no ungated venue render on either surface");
console.log("  D  the exits this gate cannot see");
console.log("  E  no secret venue in a payload — the sweep, and the two boundaries\n");

if (notes.length > 0) {
  console.log("  OPEN EXITS — printed on every run, pass or fail:\n");
  for (const note of notes) console.log(`    · ${note}\n`);
}

if (failures.length > 0) {
  console.error(`FAILED — ${failures.length} assertion(s):\n`);
  for (const f of failures) console.error(`    ${f}\n`);
  console.error(
    "Fix the SURFACE, not this gate. Loosening an assertion here to clear a red on a\n" +
      "reveal path is the one edit in this repository that cannot be undone."
  );
  process.exit(1);
}

console.log("PASSED — no public surface renders a secret night's venue, nothing that");
console.log("         names the place crosses a public client boundary for one, and the");
console.log("         holder's ticket renders it only once the reveal has fired.");
process.exit(0);
