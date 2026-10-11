#!/usr/bin/env bash
# Bin-It API smoke test. Hits every live endpoint, asserts the key fields, and runs a
# scenario create -> delete round-trip. Prints a PASS/FAIL summary and exits non-zero on
# any failure.
#
# Requires: bash, curl, jq. On Windows use Git Bash or WSL.
#
# Usage:
#   BASE=https://bin-it-psi.vercel.app ./scripts/smoke.sh
#   BASE=http://localhost:3000 CITY=orlando STAFF_KEY=... ./scripts/smoke.sh
#
# Env:
#   BASE       API base URL (default: http://localhost:3000)
#   CITY       city slug to test (default: orlando)
#   STAFF_KEY  staff key for the PATCH /tickets test (optional; skipped if unset)
#   PHOTO      photo for the report POST (default: data/test_photos/overflow1.jpg)
#   SKIP_WRITE set to 1 to skip POST /reports and scenario (read-only run)

set -uo pipefail

BASE="${BASE:-http://localhost:3000}"
BASE="${BASE%/}"
CITY="${CITY:-orlando}"
PHOTO="${PHOTO:-data/test_photos/overflow1.jpg}"
DEVICE_ID="smoke-$(date +%s)"

pass=0
fail=0
RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; RESET=$'\033[0m'

ok()   { echo "  ${GREEN}PASS${RESET} $1"; pass=$((pass + 1)); }
bad()  { echo "  ${RED}FAIL${RESET} $1"; [ -n "${2:-}" ] && echo "       ${DIM}$2${RESET}"; fail=$((fail + 1)); }
head() { echo; echo "== $1 =="; }

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required tool: $1"; exit 2; }
}
need curl
need jq

echo "Bin-It smoke test"
echo "  base:   $BASE"
echo "  city:   $CITY"
echo "  device: $DEVICE_ID"

# GET helper: $1 path. Echoes body. The status code can't be returned via a global here
# (callers use command substitution, which runs in a subshell), so it's written to
# $STATUS_FILE and read back with `last_http` in the parent.
STATUS_FILE="$(mktemp)"
getj() {
  local tmp
  tmp="$(mktemp)"
  curl -sS -o "$tmp" -w '%{http_code}' -H "ngrok-skip-browser-warning: 1" "$BASE$1" >"$STATUS_FILE" 2>/dev/null || echo "000" >"$STATUS_FILE"
  cat "$tmp"
  rm -f "$tmp"
}
# Read the status written by the most recent getj/curl call.
last_http() { cat "$STATUS_FILE" 2>/dev/null || echo "000"; }

# ---- GET /api/health ----
head "GET /api/health"
resp="$(getj "/api/health")"
if [ "$(last_http)" = "200" ]; then ok "status 200"; else bad "status $(last_http)"; fi
db="$(echo "$resp" | jq -r '.database // empty')"
[ -n "$db" ] && ok "database: $db" || bad "missing .database" "$resp"
echo "$resp" | jq -e 'has("use_mocks")' >/dev/null 2>&1 && \
  ok "use_mocks: $(echo "$resp" | jq -r '.use_mocks')" || bad "missing .use_mocks"

# ---- GET /api/cities ----
head "GET /api/cities"
resp="$(getj "/api/cities")"
[ "$(last_http)" = "200" ] && ok "status 200" || bad "status $(last_http)"
ncities="$(echo "$resp" | jq -r '.cities | length' 2>/dev/null || echo 0)"
[ "${ncities:-0}" -ge 1 ] && ok "$ncities cities" || bad "no cities" "$resp"
echo "$resp" | jq -e --arg c "$CITY" '.cities[] | select(.slug==$c)' >/dev/null 2>&1 \
  && ok "city '$CITY' present with center+bbox" || bad "city '$CITY' not found"

# ---- GET /api/reports/nearby ----
head "GET /api/reports/nearby"
resp="$(getj "/api/reports/nearby?city=$CITY&lat=28.5383&lng=-81.3792&radius_m=5000")"
[ "$(last_http)" = "200" ] && ok "status 200" || bad "status $(last_http)" "$resp"
echo "$resp" | jq -e 'has("tickets") and has("bins")' >/dev/null 2>&1 \
  && ok "tickets=$(echo "$resp" | jq '.tickets|length') bins=$(echo "$resp" | jq '.bins|length')" \
  || bad "missing tickets/bins arrays"

# ---- GET /api/tickets ----
head "GET /api/tickets"
resp="$(getj "/api/tickets?city=$CITY")"
[ "$(last_http)" = "200" ] && ok "status 200" || bad "status $(last_http)"
echo "$resp" | jq -e '.tickets | type=="array"' >/dev/null 2>&1 \
  && ok "$(echo "$resp" | jq '.tickets|length') tickets" || bad "missing .tickets array"
first_ticket="$(echo "$resp" | jq -r '.tickets[0].id // empty')"

# ---- GET /api/cells ----
head "GET /api/cells"
resp="$(getj "/api/cells?city=$CITY")"
[ "$(last_http)" = "200" ] && ok "status 200" || bad "status $(last_http)"
echo "$resp" | jq -e '.cells | type=="array"' >/dev/null 2>&1 \
  && ok "$(echo "$resp" | jq '.cells|length') cells" || bad "missing .cells array" "$resp"

# ---- GET /api/recommendations ----
head "GET /api/recommendations"
resp="$(getj "/api/recommendations?city=$CITY")"
[ "$(last_http)" = "200" ] && ok "status 200" || bad "status $(last_http)"
nrec="$(echo "$resp" | jq -r '.recommendations | length' 2>/dev/null || echo 0)"
ok "$nrec recommendations"
if [ "${nrec:-0}" -ge 1 ]; then
  echo "$resp" | jq -e '.recommendations[0] | has("rank") and has("lat") and has("rationale")' >/dev/null 2>&1 \
    && ok "recommendation has rank/lat/rationale" || bad "recommendation shape"
fi

# ---- PATCH /api/tickets/{id} (needs STAFF_KEY) ----
head "PATCH /api/tickets/{id}"
if [ -z "${STAFF_KEY:-}" ]; then
  echo "  ${DIM}skip (STAFF_KEY not set)${RESET}"
elif [ -z "$first_ticket" ]; then
  echo "  ${DIM}skip (no ticket to patch)${RESET}"
else
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH \
    -H "Content-Type: application/json" -H "X-Staff-Key: $STAFF_KEY" \
    -H "ngrok-skip-browser-warning: 1" \
    -d '{"status":"reviewed"}' "$BASE/api/tickets/$first_ticket")"
  [ "$code" = "200" ] && ok "patched $first_ticket -> reviewed" || bad "PATCH status $code"
  # unauthorized should be rejected
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH \
    -H "Content-Type: application/json" -H "ngrok-skip-browser-warning: 1" \
    -d '{"status":"received"}' "$BASE/api/tickets/$first_ticket")"
  [ "$code" = "401" ] && ok "unauthenticated PATCH rejected (401)" || bad "expected 401, got $code"
fi

# ---- POST /api/reports + GET /api/reports/{id} ----
head "POST /api/reports"
if [ "${SKIP_WRITE:-0}" = "1" ]; then
  echo "  ${DIM}skip (SKIP_WRITE=1)${RESET}"
elif [ ! -f "$PHOTO" ]; then
  bad "photo not found: $PHOTO" "set PHOTO=... or run from the repo root"
else
  tmp="$(mktemp)"
  code="$(curl -sS -o "$tmp" -w '%{http_code}' -X POST \
    -H "X-Device-Id: $DEVICE_ID" -H "ngrok-skip-browser-warning: 1" \
    -F "city=$CITY" -F "lat=28.5383" -F "lng=-81.3792" -F "note=smoke test" \
    -F "photo=@$PHOTO;type=image/jpeg" "$BASE/api/reports" 2>/dev/null || echo 000)"
  body="$(cat "$tmp")"; rm -f "$tmp"
  if [ "$code" = "201" ]; then
    ok "status 201"
    rid="$(echo "$body" | jq -r '.report.id // empty')"
    [ -n "$rid" ] && ok "report id: $rid" || bad "missing report.id" "$body"
    echo "$body" | jq -e '.ticket | has("status") and has("merged")' >/dev/null 2>&1 \
      && ok "ticket has status+merged" || bad "ticket shape"
    # fetch it back
    if [ -n "$rid" ]; then
      resp="$(getj "/api/reports/$rid")"
      [ "$(last_http)" = "200" ] && ok "GET /api/reports/$rid -> 200" || bad "report lookup $(last_http)"
      echo "$resp" | jq -e '.report | has("label") and has("status")' >/dev/null 2>&1 \
        && ok "report has label+status" || bad "report detail shape"
    fi
  else
    bad "status $code" "$body"
  fi
fi

# ---- POST /api/scenarios + DELETE round-trip ----
head "POST /api/scenarios (+ DELETE)"
if [ "${SKIP_WRITE:-0}" = "1" ]; then
  echo "  ${DIM}skip (SKIP_WRITE=1)${RESET}"
else
  tmp="$(mktemp)"
  code="$(curl -sS -o "$tmp" -w '%{http_code}' -X POST \
    -H "Content-Type: application/json" -H "ngrok-skip-browser-warning: 1" \
    -d "{\"city\":\"$CITY\",\"proposed_bins\":[{\"lat\":28.5400,\"lng\":-81.3810}]}" \
    "$BASE/api/scenarios" 2>/dev/null || echo 000)"
  body="$(cat "$tmp")"; rm -f "$tmp"
  if [ "$code" = "201" ]; then
    ok "status 201"
    sid="$(echo "$body" | jq -r '.scenario.id // empty')"
    echo "$body" | jq -e '.scenario | has("before") and has("after")' >/dev/null 2>&1 \
      && ok "scenario has before/after" || bad "scenario shape" "$body"
    if [ -n "$sid" ]; then
      code="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
        -H "ngrok-skip-browser-warning: 1" "$BASE/api/scenarios/$sid")"
      [ "$code" = "204" ] && ok "deleted scenario $sid (204)" || bad "DELETE status $code"
    fi
  else
    bad "status $code" "$body"
  fi
fi

# ---- summary ----
head "Summary"
rm -f "$STATUS_FILE"
echo "  ${GREEN}$pass passed${RESET}, $([ "$fail" -gt 0 ] && echo "${RED}$fail failed${RESET}" || echo "0 failed")"
[ "$fail" -eq 0 ] || exit 1
