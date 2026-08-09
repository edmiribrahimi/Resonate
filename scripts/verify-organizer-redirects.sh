#!/usr/bin/env bash
#
# verify-organizer-redirects.sh — walk every row of the redirect table and
# observe what the server actually answers.
#
# ── Why this is a script and not a paragraph ──────────────────────────────────
#
# The redirect table is fifteen rows of data that nothing exercises. D-34-04
# says the mapping is "written once, reviewed as a table, and verified before
# the phase closes", and a review is a thing a person does once. A shell loop is
# re-runnable: after the middleware changes, after the 307→308 flip of plan
# 34-17, after any edit to the table. That difference is the whole reason this
# file exists.
#
# ── What it proves, and what it says nothing about ────────────────────────────
#
# It proves ADDRESS TRANSLATION: that a request for a legacy address answers
# with the declared status and points at the declared destination. It sends no
# cookie and no credential, so it has no subject — it says NOTHING about who may
# then see the destination. That question belongs to the middleware's capability
# lookup and to the RLS policies, and neither is observable from here. A green
# walk is not a statement about access.
#
# ── The table is parsed, never re-typed ───────────────────────────────────────
#
# The rows are read out of the source module at run time. A second copy of the
# table inside this script would be the exact drift the phase exists to remove,
# and it would drift silently: the copy would keep passing while the real table
# moved. The expected status is read the same way, so the flip to 308 needs no
# edit here.
#
# ── What it needs, and where it does NOT run ──────────────────────────────────
#
# It needs a running server (`npm run dev`), so it is NOT part of `npm run
# build` and cannot be. **There is no CI in this repository**: this runs when a
# person runs it, and a walk nobody runs is a walk that did not happen.
#
# Before plan 34-03 wires the table into `src/middleware.ts`, nothing emits
# these redirects and every row is expected to fail. That is the correct
# reading of a red walk today, not a defect in this script.
#
# ── What it cannot distinguish, stated rather than assumed ────────────────────
#
# The door assertion below asks whether the door's address was MOVED. An
# unauthenticated request for the door answers with a redirect to `/login`,
# which is the access mechanism and not a relocation — so a `/login`
# destination is accepted, and any other redirect destination is a failure.
# This script cannot tell a deliberate `/login` bounce from a redirect rule that
# happens to point at `/login`; nothing observable from outside can. What it
# does catch is the failure that matters: the door answering with a redirect to
# some other work-surface address.
#
# It also cannot see a row that is missing from the table. It walks what the
# table declares; a legacy address nobody wrote down is invisible to it.
#
# macOS/BSD: POSIX character classes only, no GNU-only flags.
#
# Usage:  npm run verify:redirects              # http://localhost:3000
#         bash scripts/verify-organizer-redirects.sh https://staging.example
#

set -uo pipefail

BASE_URL="${1:-${REDIRECT_BASE_URL:-http://localhost:3000}}"
BASE_URL="${BASE_URL%/}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TABLE="$ROOT/src/lib/routes/organizer-redirects.ts"

# A fixed stand-in for a dynamic segment, so a dynamic row is requestable. Its
# only job is to be one non-empty segment; nothing resolves it.
PLACEHOLDER="00000000-0000-0000-0000-000000000000"

# The door. Named once, here, because two assertions below need it and a second
# spelling is a second thing to keep in step.
DOOR_PATH="/admin/scanner"

if [ ! -f "$TABLE" ]; then
  echo "FATAL: cannot find the redirect table at $TABLE" >&2
  exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "FATAL: curl is not on PATH; this walk has no other transport" >&2
  exit 2
fi

# ── Read the expected status from the module, never from here ────────────────
EXPECTED_STATUS="$(grep -E '^export const REDIRECT_STATUS = [0-9]+;' "$TABLE" \
  | sed -E 's/[^0-9]//g')"

if [ -z "$EXPECTED_STATUS" ]; then
  echo "FATAL: could not read REDIRECT_STATUS from $TABLE" >&2
  exit 2
fi

# ── Read the rows from the module, never from here ───────────────────────────
ROWS="$(grep -E '^[[:space:]]*\["/organizer' "$TABLE" \
  | sed -E 's/^[[:space:]]*\["([^"]+)",[[:space:]]*"([^"]+)"\],?[[:space:]]*$/\1 \2/')"

ROW_COUNT="$(printf '%s\n' "$ROWS" | grep -c '^/organizer')"

if [ "$ROW_COUNT" -eq 0 ]; then
  echo "FATAL: parsed zero rows out of $TABLE — the parse, not the table, is broken" >&2
  exit 2
fi

echo "verify-organizer-redirects — $ROW_COUNT rows, expecting $EXPECTED_STATUS"
echo "  base:  $BASE_URL"
echo "  table: ${TABLE#"$ROOT"/}"
echo ""
printf '%-4s %-46s %-6s %s\n' "" "FROM" "STATUS" "LOCATION"
echo "--------------------------------------------------------------------------------"

FAILURES=0
FAILED_ROWS=""

# Substitute the placeholder for every `[segment]` in a path.
substitute() {
  printf '%s' "$1" | sed -E "s/\[[^]]*\]/$PLACEHOLDER/g"
}

# Reduce a Location header value to its path: drop scheme and authority when
# absolute, then drop any query string or fragment.
location_path() {
  local raw="$1"
  raw="$(printf '%s' "$raw" | sed -E 's#^[a-zA-Z][a-zA-Z0-9+.-]*://[^/]*##')"
  raw="${raw%%\?*}"
  raw="${raw%%#*}"
  printf '%s' "$raw"
}

# Request one path. Sets OBSERVED_STATUS and OBSERVED_LOCATION.
request() {
  local path="$1"
  local response
  local curl_status

  response="$(curl -sS -o /dev/null -D - -w '\n%{http_code}' --max-time 15 \
    "$BASE_URL$path" 2>&1)"
  curl_status=$?

  if [ $curl_status -ne 0 ]; then
    OBSERVED_STATUS="ERR"
    OBSERVED_LOCATION="$(printf '%s' "$response" | tr '\n' ' ')"
    return 0
  fi

  OBSERVED_STATUS="$(printf '%s\n' "$response" | tail -n 1 | tr -d '\r')"
  OBSERVED_LOCATION="$(printf '%s\n' "$response" \
    | grep -i '^location:' \
    | tail -n 1 \
    | sed -E 's/^[^:]*:[[:space:]]*//' \
    | tr -d '\r')"
}

# ── The walk ─────────────────────────────────────────────────────────────────
INDEX=0
while read -r FROM TO; do
  [ -z "${FROM:-}" ] && continue
  INDEX=$((INDEX + 1))

  FROM_REQ="$(substitute "$FROM")"
  TO_EXPECTED="$(substitute "$TO")"

  request "$FROM_REQ"
  OBSERVED_PATH="$(location_path "$OBSERVED_LOCATION")"

  ROW_OK=1
  REASONS=""

  if [ "$OBSERVED_STATUS" != "$EXPECTED_STATUS" ]; then
    ROW_OK=0
    REASONS="$REASONS status $OBSERVED_STATUS != $EXPECTED_STATUS;"
  fi
  if [ "$OBSERVED_PATH" != "$TO_EXPECTED" ]; then
    ROW_OK=0
    REASONS="$REASONS location '$OBSERVED_PATH' != '$TO_EXPECTED';"
  fi

  # The fence, as a repeated observation rather than a remembered rule: no
  # response in the whole walk may point at the door.
  case "$OBSERVED_PATH" in
    */scanner*)
      ROW_OK=0
      REASONS="$REASONS DESTINATION NAMES THE SCANNER;"
      ;;
  esac

  if [ $ROW_OK -eq 1 ]; then
    printf '%-4s %-46s %-6s %s\n' "ok" "$FROM" "$OBSERVED_STATUS" "$OBSERVED_PATH"
  else
    printf '%-4s %-46s %-6s %s\n' "FAIL" "$FROM" "$OBSERVED_STATUS" "$OBSERVED_PATH"
    FAILURES=$((FAILURES + 1))
    FAILED_ROWS="$FAILED_ROWS
  row $INDEX  $FROM -> $TO
      $REASONS"
  fi
done <<EOF
$ROWS
EOF

# ── The door does not move ───────────────────────────────────────────────────
echo ""
echo "the door"
request "$DOOR_PATH"
DOOR_PATH_OBSERVED="$(location_path "$OBSERVED_LOCATION")"
printf '%-4s %-46s %-6s %s\n' "" "$DOOR_PATH" "$OBSERVED_STATUS" "$DOOR_PATH_OBSERVED"

DOOR_MOVED=0
if [ -n "$DOOR_PATH_OBSERVED" ] \
  && [ "$DOOR_PATH_OBSERVED" != "$DOOR_PATH" ]; then
  case "$DOOR_PATH_OBSERVED" in
    /login*) : ;;  # the access bounce, not a relocation — see the docblock
    *)
      DOOR_MOVED=1
      ;;
  esac
fi

if [ $DOOR_MOVED -eq 1 ]; then
  FAILURES=$((FAILURES + 1))
  FAILED_ROWS="$FAILED_ROWS
  THE DOOR MOVED  $DOOR_PATH -> $DOOR_PATH_OBSERVED
      No redirect may match the door or point at it (D-34-01, STAFF-04)."
  printf '%-4s %s\n' "FAIL" "the door answered with a redirect to another address"
else
  printf '%-4s %s\n' "ok" "the door was not relocated"
fi

# ── Result ───────────────────────────────────────────────────────────────────
echo ""
if [ $FAILURES -eq 0 ]; then
  echo "PASS — $ROW_COUNT rows walked, all answered $EXPECTED_STATUS at the declared destination."
  echo "       This says nothing about who may see those destinations."
  exit 0
fi

echo "FAIL — $FAILURES check(s) failed:"
printf '%s\n' "$FAILED_ROWS"
echo ""
echo "If every row failed, check that a server is running at $BASE_URL and that"
echo "the middleware emits the table (plan 34-03)."
exit 1
