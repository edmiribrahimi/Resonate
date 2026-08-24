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
 *   - It does NOT prove that a place cannot reach a WALLET PASS. Since
 *     2026-08-24 the pass is MEASURED rather than announced — check F — but what
 *     F measures is that no venue COLUMN and no COORDINATE reaches it. The pass
 *     still prints the night's title and the party's title, and both are FREE
 *     TEXT SOMEBODY TYPED. If a person types a place into a title, it rides the
 *     same irreversible road, and no predicate in this repository governs it.
 *     Check D says so on every run.
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
 * ── THE SIX CHECKS ──────────────────────────────────────────────────────────
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
 *   F. NOTHING THAT NAMES A PLACE ON THE WALLET PASS. One negative sweep over
 *      the two wallet files' LIVE CODE, and four POSITIVE allow-lists — the
 *      shape handed to the generator, the fields printed on the pass, the
 *      methods called on it, and the columns the route selects. The positive
 *      form is the point: a deny-list only reds the names somebody thought to
 *      forbid, and the pass format carries a place down two roads that are not
 *      text at all.
 *
 * Exit codes follow the repository's convention: `0 = passed · 1 = failed ·
 * 2 = refused`. A refusal is not a failure — it means the measurement did not
 * happen.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { liveLines } from "./lib/comments.mjs";

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
 * CHECK F — the wallet pass, MEASURED instead of announced
 *
 * Until 2026-08-24 this file printed the wallet pass as an open exit on every
 * run. It is now closed, so the gate's job changed: an exit that is closed and
 * only announced is an exit nobody is watching.
 *
 * ── WHY THIS ONE IS BUILT DIFFERENTLY FROM C AND E ──────────────────────────
 *
 * A pass LEAVES THE PRODUCT. Signed, downloaded, added to a device, synced from
 * there to that person's other devices, with **no revocation path** — no cron and
 * no migration un-writes a field on a file already on a phone
 * (`41.2-08-FINDINGS.md` §1.1). Every other surface this gate measures can be
 * repaired by an edit; this one cannot be repaired at all, only prevented.
 *
 * So the deny-list that is enough elsewhere is not enough here, for a reason
 * that is a property of the FORMAT and not of our code: **a pass can carry a
 * place down three roads, and two of them are not text.**
 *
 *   1. a printed FIELD — the road that was open, and the only one a text check
 *      would ever have found;
 *   2. `locations[]` — LOCATION RELEVANCE: latitude and longitude that wake the
 *      pass on the lock screen when the holder comes near. An address by another
 *      road, carrying no word at all;
 *   3. `semantics` — the dictionary the OPERATING SYSTEM reads, which has
 *      fifteen entries dedicated to the place a thing happens (`venueName`,
 *      `venueLocation`, `venueRoom`, `venuePhoneNumber`, and the rest).
 *
 * **Measured 2026-08-24: this pass uses none of the three.** The only relevance
 * it declares is TEMPORAL — `setRelevantDate`, an instant, not a place — and a
 * date is not a coordinate. F3 is what keeps it that way.
 *
 * ── THE FORM: ONE NEGATIVE SWEEP, FOUR POSITIVE ALLOW-LISTS ─────────────────
 *
 * A deny-list reds the names somebody thought to forbid. A field called `place`
 * would walk past one, and so would a semantic tag nobody had heard of. So four
 * of the five assertions here are POSITIVE — they pin the whole set and red on
 * ANY addition, including the one that has no name yet:
 *
 *   F1  the negative sweep, over LIVE CODE
 *   F2  the shape handed to the generator — the exact field set
 *   F3  the methods called on the pass — the exact set
 *   F4  the fields PRINTED on the pass — the exact key set
 *   F5  the columns the route selects — the exact set, per embed
 *
 * ── F1 READS LIVE CODE, AND THAT IS A TRADE WITH A DIRECTION ────────────────
 *
 * F1 sweeps the two files with `scripts/lib/comments.mjs` — the repository's one
 * comment stripper (D-41.1-07), itself proved by asserted mutation — rather than
 * the raw bytes. Check E1 does the opposite on purpose, and both choices are
 * right for their file: E1's client components have no reason to NAME a column
 * they must not carry, while these two files must EXPLAIN a rule whose whole
 * subject is the word being forbidden, and a docblock that cannot name the thing
 * it is about is a docblock nobody will keep true.
 *
 * The cost is stated rather than hidden. The stripper's declared error direction
 * is that it blanks MORE than it should, never less — so F1 can UNDER-count, and
 * a green from F1 alone would be a weaker claim than a green from E1.
 * **F2-F5 are why that is acceptable**: an under-count hides a NAME, and the
 * positive lists do not measure names — they measure the SIZE AND MEMBERSHIP of
 * five closed sets. A field the sweep missed is still a member the allow-list
 * never authorised.
 *
 * ── WHAT A GREEN ON F DOES *NOT* MEAN ───────────────────────────────────────
 *
 * That no place can reach a pass. The pass prints the night's title and the
 * party's title, both FREE TEXT SOMEBODY TYPED, and if a person types a place
 * into one it travels the same irreversible road with no predicate on it. That
 * is check D's business, and D prints it every run.
 *
 * ── PROVED BY MUTATION, 2026-08-24 ──────────────────────────────────────────
 *
 * A check nobody has seen go red is a check nobody has seen work. Six mutations
 * were applied to the tree, one at a time; each was RE-READ FROM DISK AND
 * ASSERTED PRESENT BEFORE THE GATE WAS RUN — a run that skips that step cannot
 * tell *the gate caught it* from *the edit never landed*, and the second reads
 * exactly like the first — and each was reverted by writing the SAVED BYTES
 * back, never by a git command that discards a working tree.
 *
 *   W1  a printed field returns, under its old name        → F1 + F4, exit 1
 *   W2  the route selects the free-text column again       → F1 + F5, exit 1
 *   W3  location relevance, through a method call          → F1 + F3, exit 1
 *   W4  the semantic dictionary carries the place          → F1,      exit 1
 *   W5  a field called `place` — no forbidden substring    → F2,      exit 1
 *   W6  coordinates through the PROPS, no method call      → F1,      exit 1
 *
 * Afterwards the two files were compared byte-for-byte with their starting state
 * and the gate was green again — the control, without which six reds prove only
 * that the script can fail.
 *
 * **W5 is the one that earns the positive form.** It adds a place-bearing field
 * whose name contains no term any deny-list would hold, and only the allow-list
 * on the shape sees it. **W6 is the one that earns F1's breadth**: it writes a
 * coordinate through the constructor's props, touching no method, so F3 is blind
 * to it by construction.
 *
 * **And W1 is the one that found a defect in this gate rather than in the
 * surface.** F4 was first written line-anchored — a key at the start of its own
 * line — and W1 pushes a field onto the pass on ONE line. The run was red anyway,
 * because F1 caught the mutation on its NAME, and reading only the exit code
 * would have recorded a pass. It was reading WHICH checks fired that showed F4
 * had been stepped over. The anchor is gone and the record stays: a mutation run
 * that reads exit codes instead of checks proves less than it looks like it does.
 * ──────────────────────────────────────────────────────────────────────────── */

const WALLET_LIB_REL = "src/lib/apple-wallet.ts";
const WALLET_ROUTE_REL = "src/app/api/tickets/[id]/wallet/route.ts";

const WALLET_LIB = join(ROOT, WALLET_LIB_REL);
const WALLET_ROUTE = join(ROOT, WALLET_ROUTE_REL);

const walletLibSrc = read(WALLET_LIB);
const walletRouteSrc = read(WALLET_ROUTE);

if (walletLibSrc === null || walletRouteSrc === null) {
  console.error(
    "REFUSED — one of the two wallet files is absent from the tree.\n" +
      "Nothing about the pass was measured. If the pass was deliberately removed,\n" +
      "remove check F in the same commit and say so — do not leave a gate that\n" +
      "refuses forever, because a permanent refusal reads like a green to a list."
  );
  process.exit(2);
}

/**
 * Every term is matched as a CASE-INSENSITIVE SUBSTRING, not as a word: the
 * point is to catch `venueName`, `venue_text`, `displayVenue` and `VenueLocation`
 * with one entry, since the failure this is guarding is somebody re-adding the
 * thing under whatever name reads naturally that day.
 */
const PLACE_TERMS = [
  "venue",
  "latitude",
  "longitude",
  "altitude",
  "locations",
  "beacons",
  "maxDistance",
  "relevantText",
  "google_maps",
];

for (const [rel, abs] of [
  [WALLET_LIB_REL, WALLET_LIB],
  [WALLET_ROUTE_REL, WALLET_ROUTE],
]) {
  const { lines, unterminated } = liveLines(abs);
  if (unterminated !== null) {
    console.error(
      `REFUSED — ${rel} has a ${unterminated.kind} comment opened at line ` +
        `${unterminated.lineNo} that never closes. The stripper cannot read this\n` +
        "file, so F1 measured nothing rather than measuring zero."
    );
    process.exit(2);
  }

  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    for (const term of PLACE_TERMS) {
      if (lower.includes(term)) {
        fail(
          "F1",
          `${rel}:${index + 1} names \`${term}\` in live code: ${line.trim()}\n` +
            "        A pass is signed, downloaded and synced to a device, and nothing in " +
            "this product can recall it. The owner's rule of 2026-08-24 is *never* — not " +
            "*after the reveal* — because a pass does not update backwards."
        );
      }
    }
  });
}

/** The exact set, sorted, as one comparable string. */
const asSet = (values) => [...new Set(values)].sort().join(", ");

/**
 * F2-F5 read LIVE CODE too, and for a second reason on top of F1's.
 *
 * F1 needs it so the two files may explain themselves. F2-F5 need it so they
 * cannot go red on a docblock: `src/lib/apple-wallet.ts` documents the three
 * roads a pass can carry a place, which means it NAMES the very method calls F3
 * forbids. Read raw, a comment saying *do not call this* would red the gate — and
 * a gate that reds on correct code is a gate the next person in a hurry loosens.
 *
 * The stripper's under-count is harmless here, and that is worth saying rather
 * than assuming: these four are POSITIVE set comparisons, so a member the
 * stripper blanked makes the extracted set SMALLER, and a smaller set fails the
 * equality just as loudly as a bigger one. The error direction is red, not green.
 */
const liveTextOf = (abs) => liveLines(abs).lines.join("\n");
const walletLibLive = liveTextOf(WALLET_LIB);
const walletRouteLive = liveTextOf(WALLET_ROUTE);

/* F2 — the shape handed to the generator */

const SHAPE_MATCH = walletLibLive.match(/interface TicketPassData \{([\s\S]*?)\n\}/);
if (SHAPE_MATCH === null) {
  fail(
    "F2",
    `${WALLET_LIB_REL} no longer declares \`interface TicketPassData\`. The shape ` +
      "handed to the generator is the narrowest place a new field can be caught; if " +
      "it was renamed, rename it here too, deliberately, and say why in the commit."
  );
} else {
  const fields = [...SHAPE_MATCH[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:/gm)].map(
    (m) => m[1]
  );
  const EXPECTED_SHAPE =
    "date, endTime, eventSlug, eventTitle, partyTitle, qrValue, ticketId, tierName, time";
  if (asSet(fields) !== EXPECTED_SHAPE) {
    fail(
      "F2",
      `${WALLET_LIB_REL}'s \`TicketPassData\` carries {${asSet(fields)}};\n` +
        `        the authorised set is {${EXPECTED_SHAPE}}.\n` +
        "        This list is POSITIVE on purpose: a field named for a place in some " +
        "way nobody thought to forbid still reds here. Adding one to a pass is adding " +
        "it to files already on other people's phones — decide it, then widen this."
    );
  }
}

/* F3 — the methods called on the pass */

const mutators = [...walletLibLive.matchAll(/(?<![A-Za-z0-9_$])pass\.([A-Za-z_$][\w$]*)/g)].map(
  (m) => m[1]
);
const EXPECTED_MUTATORS =
  "auxiliaryFields, getAsBuffer, primaryFields, secondaryFields, setBarcodes, setRelevantDate, type";
if (asSet(mutators) !== EXPECTED_MUTATORS) {
  fail(
    "F3",
    `${WALLET_LIB_REL} touches the pass through {${asSet(mutators)}};\n` +
      `        the authorised set is {${EXPECTED_MUTATORS}}.\n` +
      "        This is the assertion that no text check could stand in for: " +
      "`setLocations` writes a COORDINATE, `setBeacons` writes a proximity trigger, " +
      "and neither carries a word. `setRelevantDate` stays — a date is not a place."
  );
}

/* F4 — the fields printed on the pass */

/**
 * NOT line-anchored, and mutation W1 is why. The first draft matched
 * `/^\s*key:\s*"…"/gm` — a key at the start of its own line — and W1 pushed a
 * field onto the pass on ONE line, where `key:` sits mid-line. F1 caught that
 * mutation on its name, so the run was red and would have been called a pass;
 * it was only reading WHICH checks fired that showed F4 had been walked past.
 * A mutation run that reads the exit code and not the checks proves less than
 * it appears to.
 */
const printedKeys = [
  ...walletLibLive.matchAll(/(?<![A-Za-z0-9_$])key:\s*"([^"]+)"/g),
].map((m) => m[1]);
const EXPECTED_KEYS = "date, event, tier, time";
if (asSet(printedKeys) !== EXPECTED_KEYS) {
  fail(
    "F4",
    `the pass prints the fields {${asSet(printedKeys)}}; the authorised set is ` +
      `{${EXPECTED_KEYS}} — what a person needs to get in, and nothing else.`
  );
}

/* F5 — the columns the route selects
 *
 * The select LITERAL is located first and the embeds are read out of it, rather
 * than sweeping the file for anything shaped like `name(...)`. The first draft of
 * this check did the latter and went red on correct code: scanning the whole file,
 * `.select(` itself matches that shape and its non-greedy body swallows the first
 * embed whole. A gate that reds on correct code gets loosened by the next person
 * in a hurry, and this is the one file where that is not survivable. */

const SELECT_MATCH = walletRouteLive.match(/\.select\(\s*"([^"]*)"/);

if (SELECT_MATCH === null) {
  fail(
    "F5",
    `${WALLET_ROUTE_REL} has no single-string \`.select("…")\` for this gate to read. ` +
      "If the query was rebuilt, rebuild this check with it in the same commit: a check " +
      "that silently stops finding its subject is indistinguishable from a green."
  );
} else {
  const selectLiteral = SELECT_MATCH[1];

  const embedSets = new Map(
    [...selectLiteral.matchAll(/([a-z_]+)\(([^)]*)\)/g)].map(([, name, cols]) => [
      name,
      asSet(cols.split(",").map((c) => c.trim())),
    ])
  );

  const topLevel = asSet(
    selectLiteral
      .replace(/[a-z_]+\([^)]*\)/g, "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
  );

  for (const [embed, expected] of [
    ["ticket_tiers", "name"],
    ["events", "date, slug, title"],
    ["event_parties", "date, end_time, time, title"],
  ]) {
    const actual = embedSets.get(embed);
    if (actual === undefined) {
      fail("F5", `${WALLET_ROUTE_REL}'s select no longer embeds \`${embed}\`.`);
    } else if (actual !== expected) {
      fail(
        "F5",
        `${WALLET_ROUTE_REL} selects \`${embed}(${actual})\`; the authorised set is ` +
          `{${expected}}.\n        What must not come back is a column of the place: ` +
          "the route re-selects for itself, its query carries no secrecy term, and it " +
          "never will — the rule is *never*, so there is nothing for a term to decide."
      );
    }
  }

  const EXPECTED_TOP = "event_id, id, party_id";
  if (topLevel !== EXPECTED_TOP) {
    fail(
      "F5",
      `${WALLET_ROUTE_REL} selects the top-level columns {${topLevel}}; the ` +
        `authorised set is {${EXPECTED_TOP}}.`
    );
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * CHECK D — the exits this gate cannot see, printed every run
 *
 * The wallet pass used to be printed here. It was closed on 2026-08-24 and is
 * now MEASURED by check F, so it left this list — an exit that is closed and
 * still announced trains a reader to skim the announcements.
 *
 * What took its place is narrower and truer: the pass is closed to every COLUMN
 * of the place, and open to the one thing no schema governs.
 * ──────────────────────────────────────────────────────────────────────────── */

notes.push(
  "FREE TEXT ON A PASS. The wallet pass carries no venue column and no coordinate " +
    "since 2026-08-24 (check F), but it still prints the EVENT TITLE and the PARTY " +
    "TITLE, and both are free text somebody typed into a form. A place typed into a " +
    "title rides the same road as the column used to — signed onto a file, synced to " +
    "a device, with no revocation path — and no predicate in this repository can see " +
    "it. This is not a defect to fix in code: it is a fact to know when naming a " +
    "night whose place is meant to stay secret."
);

notes.push(
  "MEDIA. A photograph that frames the sign, a story with the street number, a recap " +
    "that names the place: the same information down a road with no predicate on it " +
    "at all. `media-and-storage` with `venue-secrecy` supplementary, and nothing built " +
    "in this file protects a gallery."
);

/* ──────────────────────────────────────────────────────────────────────────── */

console.log("venue surfaces — the owner's rule of 2026-08-22, measured\n");
console.log("  A  the predicate's truth table, executed from the source on disk");
console.log("  B  one home for each predicate, and both surfaces import it");
console.log("  C  no ungated venue render on either surface");
console.log("  D  the exits this gate cannot see");
console.log("  E  no secret venue in a payload — the sweep, and the two boundaries");
console.log("  F  nothing that names a place on the wallet pass — one sweep, four");
console.log("     positive allow-lists, and no location relevance\n");

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
console.log("         names the place crosses a public client boundary for one, the");
console.log("         holder's ticket renders it only once the reveal has fired, and");
console.log("         the wallet pass carries neither a venue column nor a coordinate");
console.log("         — on any night, secret or not, because a pass cannot be recalled.");
process.exit(0);
