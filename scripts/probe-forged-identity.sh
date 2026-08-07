#!/bin/sh
# probe-forged-identity.sh — CAP-05 criterion 2, made runnable.
#
# THE CLAIM UNDER TEST: a request that forges an identity header is answered
# EXACTLY as an anonymous one.
#
# WHY THIS IS A SCRIPT AND NOT A PARAGRAPH. A procedure written in prose is
# retyped from memory by the next person, who picks a different surface and gets
# a meaningless green. Every decision below is measured, and the measurement is
# in the comment next to it so it survives the next reader.
#
# ─── WHY THIS SURFACE, AND NO OTHER ──────────────────────────────────────────
#
# The probe points at `(public)/events/<slug>/menu`, which compiles from
# `src/app/(public)/events/[slug]/menu/page.tsx`. It is the ONLY header reader
# in the repository combining all three properties:
#
#   1. It is in the `(public)` route group, so no middleware prefix rule gates
#      it. `protectedPrefixes` (src/lib/supabase/middleware.ts:136) is
#      /dashboard /membership-card /attendance /admin /organizer — and /events
#      is in none of them.
#   2. Its `canManage` is decided from the HEADER ALONE:
#      `role === "master" || role === "organizer"` (menu/page.tsx:72), where
#      `role` came from `headersList.get("x-user-role")` (:56).
#   3. The branch that decision selects reads through `getServiceClient()`
#      (:48), which bypasses EVERY RLS policy — so there is no second boundary
#      behind it.
#
# Eight of the nine service-client header readers sit behind a middleware
# capability gate. This one does not. That is what makes it sensitive, and
# sensitivity is the only property that makes a green worth anything.
#
# ─── WHY `/events` IS NOT A VALID PROBE, THOUGH IT LOOKS LIKE THE OBVIOUS ONE ─
#
# Forging `x-user-role: master` on the `/events` listing returns the same two
# slugs — AND STILL DOES WITH THE MIDDLEWARE STRIP REMOVED. RLS refuses
# unpublished rows to `anon` regardless of what `canSeeDrafts` decides, so the
# probe reports "no difference" because it CANNOT SEE ONE. **MEASURED.** The
# same shape disqualifies `/admin/finance`, which the middleware refuses to
# anyone without `admin.access` before any header is read at all.
#
# A probe that has never been shown to fire proves nothing. Run
# `--positive-control` and read what it says before believing any green here.
#
# ─── WHY `Add Item` AND NEVER BYTE SIZE ──────────────────────────────────────
#
# Two ANONYMOUS requests to the same URL differed by up to 2.3 KB under
# `next dev` — build ids and RSC nonces. **MEASURED.** A size assertion is noise
# dressed as evidence. `Add Item` is the management affordance rendered only by
# the `canManage` branch (src/app/(organizer)/organizer/events/[id]/drinks/
# DrinkMenuManager.tsx:152, reached through `PartyDrinkMenu canManage={...}`).
#
# ─── WHY THE BASE URL IS AN ARGUMENT AND NOT A CONSTANT ──────────────────────
#
# Ports 3000 and 3002 are held by Docker on the development machine (measured:
# `com.docke … TCP *:3000 (LISTEN)`, `*:3002`). `next dev` auto-selected 3001;
# `npm start` needed an explicit `PORT=3007`. Hard-coding a port produces a
# connection error that reads like a refusal.
#
# ─── USAGE ───────────────────────────────────────────────────────────────────
#
#   scripts/probe-forged-identity.sh <base-url> <published-event-slug> [action-page-path]
#   scripts/probe-forged-identity.sh --positive-control
#
#   e.g.  scripts/probe-forged-identity.sh http://localhost:3007 some-published-slug
#         scripts/probe-forged-identity.sh http://localhost:3007 some-slug /events/some-slug/menu
#
# ─── EXIT CODES ──────────────────────────────────────────────────────────────
#
#   0  the forged request was answered exactly as the anonymous one
#   1  they DIVERGED — the divergence is named, with the counts and the files
#   2  nothing was measured: bad usage, no curl, or the page did not answer 200.
#      A 2 is not a pass and not a fail. It means the probe was pointed at
#      nothing, which is the failure mode this whole phase exists to avoid.
#
# ─── SECRECY ─────────────────────────────────────────────────────────────────
#
# This repository is PUBLIC (CLAUDE.md Guardrail 5). This script takes the host
# and the slug as arguments and hard-codes neither; it forges a well-known
# all-zero UUID rather than any real member id; and it writes only to /tmp.

set -u

ANON_OUT=${ANON_OUT:-/tmp/anon.html}
FORGED_OUT=${FORGED_OUT:-/tmp/forged.html}

# The management affordance. Change this and you change what the probe can see.
OBSERVABLE='Add Item'

# The forged identity. All-zero UUID on purpose: it belongs to nobody, so a
# transcript of this run names no member. `.planning/` is published.
FORGED_ROLE='x-user-role: master'
FORGED_STATUS='x-user-status: approved'
FORGED_ID='x-user-id: 00000000-0000-0000-0000-000000000000'

usage() {
  cat <<'USAGE'
usage:
  scripts/probe-forged-identity.sh <base-url> <published-event-slug> [action-page-path]
  scripts/probe-forged-identity.sh --positive-control

  <base-url>              e.g. http://localhost:3007 — no trailing slash.
                          Ports 3000 and 3002 are held by Docker on the dev
                          machine; `next dev` picks 3001, `npm start` needs an
                          explicit PORT. That is why this is an argument.
  <published-event-slug>  an event with is_published = true. An unpublished one
                          renders 404 and the probe measures nothing.
  [action-page-path]      optional. A page hosting a Server Action, probed in
                          server-action mode as well as page mode.

  --positive-control      print the procedure that proves this probe can FIRE.
                          Read it before believing any green.
USAGE
}

# ── --positive-control ──────────────────────────────────────────────────────
#
# This mode MUTATES NOTHING. It prints the procedure so the operator performs it
# deliberately. A script that silently disabled the strip would be a script that
# could leave it disabled.
positive_control() {
  cat <<'CONTROL'

╔══════════════════════════════════════════════════════════════════════════════╗
║  ⚠  WARNING — READ BEFORE DOING ANY OF THIS                                  ║
║                                                                              ║
║  The mutation below removes the SINGLE protection covering all 44 surfaces    ║
║  that read an identity header. While it is applied, any client can assert     ║
║  "I am a master" and be believed by code that then queries through a          ║
║  service-role client bypassing every RLS policy.                             ║
║                                                                              ║
║  DEV SERVER ONLY. Reverted in the SAME session. Never on a deployed           ║
║  environment, never on a branch that could be pushed.                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

THE POSITIVE CONTROL — the part that makes a green from this probe mean anything

  1. Comment out the three strip lines:

         src/lib/supabase/middleware.ts:210   requestHeaders.delete("x-user-role");
         src/lib/supabase/middleware.ts:211   requestHeaders.delete("x-user-status");
         src/lib/supabase/middleware.ts:212   requestHeaders.delete("x-user-id");

  2. ASSERT THE MUTATION IS APPLIED, BEFORE READING ANY RESULT:

         git diff --stat src/lib/supabase/middleware.ts    # MUST be non-empty

     This step is not ceremony. A green from an UNAPPLIED mutation is a false
     negative, and this project has a recorded incident of exactly that: a perl
     substitution that did not match made a working check look broken, and the
     same error in the other direction would have certified a dead check as
     alive (ai-engineering.md, gate *prova per mutazione*).

  3. Re-run this probe against the same base URL and slug. It MUST now fail:

         Add Item in anon   : 0
         Add Item in forged : 1        <- the probe fires

     If it does NOT fire, do not record a pass. Something else is protecting
     that surface and the probe is insensitive where it is pointed — which is
     the defect this phase has already recorded three times.

  4. Restore the three lines FROM A BYTE COPY, then confirm:

         git status --porcelain        # MUST be empty

  5. Re-run the probe. It must go quiet: 0 and 0.

MEASURED 2026-08-07, before any conversion in phase 33:

  | state of middleware.ts:210-212 | Add Item anon | Add Item forged | payload delta |
  | commented out                  | 0             | 1               | +10 522 B and +23 442 B on the two live events |
  | restored                       | 0             | 0               | +2 334 B / -4 B, i.e. noise |

  The +B column is recorded as CONTEXT ONLY. It is not the observable and must
  never become one: two anonymous requests differ by up to 2.3 KB by themselves.

WHERE THIS BELONGS IN THE PHASE

  Plan 33-12, checkpoint task 4 — after the conversions, where the *after*
  answer is the one that matters. If by then NO reader survives and the control
  cannot be re-established BECAUSE there is nothing left to fool, that is the
  correct end state and must be WRITTEN DOWN AS SUCH — never reported as a pass.

CONTROL
}

# ── argument handling ───────────────────────────────────────────────────────

if [ "$#" -eq 0 ]; then
  echo "probe-forged-identity: no arguments." >&2
  echo "" >&2
  usage >&2
  exit 2
fi

case "$1" in
  --positive-control)
    positive_control
    exit 0
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  -*)
    echo "probe-forged-identity: unknown flag '$1'." >&2
    echo "" >&2
    usage >&2
    exit 2
    ;;
esac

if [ "$#" -lt 2 ]; then
  echo "probe-forged-identity: need both a base url and a published event slug (got $# argument(s))." >&2
  echo "" >&2
  usage >&2
  exit 2
fi

BASE=$1
SLUG=$2
ACTION_PAGE=${3:-}

command -v curl >/dev/null 2>&1 || {
  echo "probe-forged-identity: curl is not on PATH. Nothing was measured." >&2
  exit 2
}

URL="${BASE}/events/${SLUG}/menu"

echo ""
echo "probe-forged-identity — is a forged identity answered as an anonymous one?"
echo ""
echo "  surface   : ${URL}"
echo "  observable: '${OBSERVABLE}' — the management affordance, never byte size"
echo ""

# ── the two requests ────────────────────────────────────────────────────────
#
# `-w '%{http_code}'` is not decoration. If the slug is unpublished or wrong the
# page calls notFound() and answers 404, both bodies come back without the
# observable, and the probe reports a cheerful PASS having measured NOTHING.
# That is the single most likely way this script produces a false green, so the
# status is asserted before the observable is counted.

ANON_CODE=$(curl -s -o "$ANON_OUT" -w '%{http_code}' "$URL")
ANON_CURL=$?

FORGED_CODE=$(curl -s -o "$FORGED_OUT" -w '%{http_code}' \
  -H "$FORGED_ROLE" \
  -H "$FORGED_STATUS" \
  -H "$FORGED_ID" \
  "$URL")
FORGED_CURL=$?

if [ "$ANON_CURL" -ne 0 ] || [ "$FORGED_CURL" -ne 0 ]; then
  echo "  REFUSED: curl could not reach ${URL}" >&2
  echo "           (anonymous request exit ${ANON_CURL}, forged request exit ${FORGED_CURL})" >&2
  echo "" >&2
  echo "  Nothing was measured. Start the server and pass the port it actually chose:" >&2
  echo "    npm run dev        # note the port; 3000 and 3002 are held by Docker here" >&2
  echo "    PORT=3007 npm start" >&2
  exit 2
fi

if [ "$ANON_CODE" != "200" ] || [ "$FORGED_CODE" != "200" ]; then
  echo "  REFUSED: the page did not answer 200 (anonymous ${ANON_CODE}, forged ${FORGED_CODE})." >&2
  echo "" >&2
  echo "  Nothing was measured, and this is NOT a pass: both bodies would lack" >&2
  echo "  '${OBSERVABLE}' for a reason that has nothing to do with identity." >&2
  echo "" >&2
  # The cause is named, never collapsed into "the check failed". This codebase
  # has a recorded precedent for why (the newsletter form answering every
  # distinct cause with one generic message, undebuggable for everybody).
  case "$ANON_CODE" in
    404)
      echo "  404 — the slug is wrong, or its event has is_published = false. The page" >&2
      echo "        calls notFound(). Pick a slug whose event is published." >&2
      ;;
    5*)
      echo "  ${ANON_CODE} — the SERVER errored before rendering. Nothing here says anything" >&2
      echo "        about headers. The usual causes, in order of likelihood:" >&2
      echo "          - the app has no environment (no .env.local: no Supabase URL or key)" >&2
      echo "          - a stale .next after a worktree merge — 'rm -rf .next' first" >&2
      echo "          - the port belongs to some OTHER process that is not this app" >&2
      echo "        Check what is actually listening before re-running:" >&2
      echo "          lsof -nP -iTCP -sTCP:LISTEN | grep ':${BASE##*:}'" >&2
      ;;
    3*)
      echo "  ${ANON_CODE} — a redirect. Something is gating this URL BEFORE it renders, which" >&2
      echo "        means the probe is pointed at a surface it cannot see through. That is" >&2
      echo "        the insensitivity defect this phase has recorded three times: do not" >&2
      echo "        follow the redirect to make a number appear." >&2
      ;;
    *)
      echo "  ${ANON_CODE} — unexpected. Nothing was measured." >&2
      ;;
  esac
  exit 2
fi

# ── the observable ──────────────────────────────────────────────────────────
#
# `|| true` is load-bearing. `grep -c` EXITS 1 WHEN THE COUNT IS ZERO, and zero
# is the PASSING state here — so without this the correct answer would kill the
# script under any `set -e`, and a naive `if grep -c …` would read the pass as a
# failure. This repository has a recorded incident of exactly that shape: a gate
# that could not report the correct state.

ANON_HITS=$(grep -c "$OBSERVABLE" "$ANON_OUT" || true)
FORGED_HITS=$(grep -c "$OBSERVABLE" "$FORGED_OUT" || true)

ANON_BYTES=$(wc -c < "$ANON_OUT" | tr -d ' ')
FORGED_BYTES=$(wc -c < "$FORGED_OUT" | tr -d ' ')

echo "  anonymous : HTTP ${ANON_CODE}  '${OBSERVABLE}' x ${ANON_HITS}  (${ANON_BYTES} B) -> ${ANON_OUT}"
echo "  forged    : HTTP ${FORGED_CODE}  '${OBSERVABLE}' x ${FORGED_HITS}  (${FORGED_BYTES} B) -> ${FORGED_OUT}"
echo "              the byte columns are CONTEXT ONLY — two anonymous requests"
echo "              differ by up to 2.3 KB on their own. They decide nothing."
echo ""

# ── the server-action mode ──────────────────────────────────────────────────
#
# Optional, because it needs a page that hosts an action.
#
# TWO MECHANICS THAT WILL OTHERWISE BE MISREAD:
#
#  1. `Origin` MUST MATCH `Host`, or Next kills the request with
#     `500 Connection closed` BEFORE THE ACTION BODY RUNS. **MEASURED.** Somebody
#     probing with curl and no Origin will see the 500 and conclude the forge was
#     refused on permission grounds. It was not — it never reached any check.
#     This is a SECOND, INDEPENDENT barrier in front of every Server Action, it
#     is framework-provided, and it must not be weakened to make a probe easier.
#  2. The action id is discoverable from the rendered HTML as
#     `$ACTION_ID_<40+ hex>`, which is how this works without a browser.
#
# The status code is PRINTED, not asserted. What a given action returns to an
# empty argument list is action-specific; the point of this mode is to show that
# the forged headers reach an action POST the same way they reach a GET, so the
# criterion covers both.

if [ -n "$ACTION_PAGE" ]; then
  ACTION_URL="${BASE}${ACTION_PAGE}"
  echo "  server-action mode: ${ACTION_URL}"
  AID=$(curl -s "$ACTION_URL" \
        | grep -oE '\$ACTION_ID_[a-f0-9]{40,}' \
        | head -1 \
        | sed 's/\$ACTION_ID_//')
  if [ -z "$AID" ]; then
    echo "    no \$ACTION_ID_… found in the HTML of ${ACTION_URL}."
    echo "    Nothing was probed in this mode — that page hosts no Server Action,"
    echo "    or it did not render. This does NOT affect the page-mode verdict below."
  else
    ACTION_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$ACTION_URL" \
      -H "Next-Action: ${AID}" \
      -H "Origin: ${BASE}" \
      -H 'Content-Type: text/plain;charset=UTF-8' \
      -H "$FORGED_ROLE" \
      -H "$FORGED_STATUS" \
      -H "$FORGED_ID" \
      --data '[]')
    echo "    action id ${AID}"
    echo "    forged POST -> HTTP ${ACTION_CODE}"
    echo "    (a 500 here with Origin OMITTED is the framework's CSRF check, not a"
    echo "     permission refusal — see the comment above this block.)"
  fi
  echo ""
fi

# ── the verdict ─────────────────────────────────────────────────────────────
#
# Three outcomes, deliberately NOT collapsed into one "check failed". The
# newsletter form in this codebase is the recorded precedent for why: it answers
# every distinct cause with "Qualcosa e' andato storto" and is undebuggable for
# both the user and the developer.

if [ "$ANON_HITS" -gt 0 ]; then
  echo "  ✗ FAILED — and not in the way this probe was aimed at."
  echo ""
  echo "    The ANONYMOUS response already contains '${OBSERVABLE}' (${ANON_HITS}x)."
  echo "    The management affordance is being rendered to a request carrying no"
  echo "    identity at all, so this is not a forgery finding — it is worse, and it"
  echo "    is not what this script was written to detect."
  echo ""
  echo "    WHERE: ${URL}, rendered by src/app/(public)/events/[slug]/menu/page.tsx,"
  echo "           whose canManage is decided at :72 from the header read at :56."
  echo "    BODIES: ${ANON_OUT} (anonymous), ${FORGED_OUT} (forged)"
  exit 1
fi

if [ "$FORGED_HITS" -gt 0 ]; then
  echo "  ✗ FAILED — the forged identity was BELIEVED."
  echo ""
  echo "    '${OBSERVABLE}' appears ${FORGED_HITS}x in the forged response and ${ANON_HITS}x in the"
  echo "    anonymous one. A request that supplied its own 'x-user-role: master' was"
  echo "    answered with the management UI. That branch reads through"
  echo "    getServiceClient(), which bypasses every RLS policy, so there is no"
  echo "    second boundary behind this one."
  echo ""
  echo "    WHERE: ${URL}"
  echo "           src/app/(public)/events/[slug]/menu/page.tsx:56  reads x-user-role"
  echo "           src/app/(public)/events/[slug]/menu/page.tsx:72  decides canManage from it"
  echo "           src/lib/supabase/middleware.ts:210-212           should have stripped it"
  echo "    BODIES: ${ANON_OUT} (anonymous), ${FORGED_OUT} (forged)"
  echo ""
  echo "    If you are running the positive control, THIS IS THE EXPECTED RESULT and"
  echo "    it means the probe is sensitive. Restore the three strip lines and re-run."
  exit 1
fi

echo "  ✓ the forged request was answered exactly as the anonymous one."
echo "    '${OBSERVABLE}' absent from both (${ANON_HITS} and ${FORGED_HITS})."
echo ""
echo "    THIS GREEN IS ONLY WORTH WHAT THE POSITIVE CONTROL IS WORTH. Two surfaces"
echo "    in this phase produce the same green while measuring nothing — /events,"
echo "    where RLS refuses the rows regardless, and /admin/finance, which the"
echo "    middleware gates before any header is read. Run:"
echo ""
echo "        scripts/probe-forged-identity.sh --positive-control"
echo ""
echo "    and do what it says, or record this run as unproven."
echo ""
exit 0
