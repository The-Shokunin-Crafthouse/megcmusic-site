#!/usr/bin/env bash
# Runs `vercel deploy` and survives a transient network drop without deploying twice.
#
# Why this exists: production deploy run 35053643880 failed with
#
#     Uploading [====================] (1.3MB/1.3MB)
#     Deploying outputs...
#     Error: An unexpected error occurred!
#     TypeError: fetch failed
#         at async fetchApi (.../vercel/dist/chunks/chunk-72ZDPBW5.js:18:892)
#
# `fetch failed` is undici's transport error: the runner lost its connection to
# Vercel's API. The upload had already completed and the CLI had already printed
# a deployment URL. The deployment itself may well have gone on to succeed --
# the CLI just could not hear the answer.
#
# That is why this is not `nick-fields/retry` around the command. A blind retry
# re-uploads, which costs against the 5000-uploads/24h cap, and can publish a
# second deployment of the same commit when the first one actually landed. So:
# on failure we ASK VERCEL what happened to the deployment we already created,
# and only retry when there is nothing live to keep.
#
# Terminal states are treated differently on purpose:
#   READY              -> the deploy landed. Succeed. Do not re-upload.
#   ERROR / CANCELED   -> a real failure. Fail fast; retrying cannot fix it.
#   unknown / no URL   -> we never got far enough to know. Retry.
#
# stdout is ONLY the deployment URL, so callers can keep doing `URL=$(...)`.
# Everything else goes to stderr.

set -uo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
VERCEL_BIN="${VERCEL_BIN:-vercel}"
VERCEL_API="${VERCEL_API:-https://api.vercel.com}"
ATTEMPTS="${DEPLOY_ATTEMPTS:-3}"
STATE_TIMEOUT="${DEPLOY_STATE_TIMEOUT:-300}"   # seconds to wait for a terminal state
TEAM_ID="${VERCEL_ORG_ID:-}"

log() { printf '%s\n' "$*" >&2; }

# readyState for a deployment, via the REST API rather than by parsing CLI
# output -- the JSON field is documented and stable, the CLI's text is neither.
deployment_state() {
  local url="$1" q=""
  [ -n "$TEAM_ID" ] && q="?teamId=${TEAM_ID}"
  curl -sS --max-time 20 \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "${VERCEL_API}/v13/deployments/${url}${q}" 2>/dev/null \
  | sed -n 's/.*"readyState"[[:space:]]*:[[:space:]]*"\([A-Z_]*\)".*/\1/p' | head -1
}

# Poll until the deployment reaches a terminal state or we run out of patience.
await_terminal_state() {
  local url="$1" deadline=$(( SECONDS + STATE_TIMEOUT )) state=""
  while [ "$SECONDS" -lt "$deadline" ]; do
    state="$(deployment_state "$url")"
    case "$state" in
      READY|ERROR|CANCELED) printf '%s' "$state"; return 0 ;;
      "") log "    (no state yet from the API; retrying the query)" ;;
      *)  log "    state=$state, still settling" ;;
    esac
    sleep 10
  done
  printf '%s' "${state:-UNKNOWN}"
}

out="$(mktemp)"; trap 'rm -f "$out"' EXIT

for attempt in $(seq 1 "$ATTEMPTS"); do
  log "==> vercel deploy, attempt ${attempt}/${ATTEMPTS}"

  "$VERCEL_BIN" deploy "$@" --token="$VERCEL_TOKEN" >"$out"; rc=$?
  url="$(grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' "$out" | tail -1)"

  if [ "$rc" -eq 0 ]; then
    # Callers do `URL=$(...)` and paste the result into a PR comment, so an
    # empty stdout here would post a comment with no link rather than fail.
    # If the URL pattern did not match, hand back whatever the CLI printed.
    [ -n "$url" ] || url="$(tr -d '\r' < "$out" | grep -v '^[[:space:]]*$' | tail -1)"
    log "==> deploy succeeded"
    printf '%s\n' "$url"
    exit 0
  fi

  log "==> vercel exited ${rc}"

  if [ -z "$url" ]; then
    log "    No deployment URL was printed, so nothing was created that could be live."
    log "    This is safe to retry."
  else
    log "    A deployment URL was printed: ${url}"
    log "    Asking Vercel what actually happened to it before retrying, so a lost"
    log "    connection after a successful deploy does not publish a second one."
    state="$(await_terminal_state "$url")"
    case "$state" in
      READY)
        log "==> ${url} is READY. The deployment landed; the CLI only lost the"
        log "    connection reporting it. Treating this as success, not re-uploading."
        printf '%s\n' "$url"
        exit 0
        ;;
      ERROR|CANCELED)
        log "==> ${url} is ${state}. That is a real failure, not a network blip;"
        log "    retrying would upload again and fail the same way. Stopping here."
        exit 1
        ;;
      *)
        log "    State is ${state} after ${STATE_TIMEOUT}s -- not a terminal answer."
        log "    Falling through to a retry."
        ;;
    esac
  fi

  if [ "$attempt" -lt "$ATTEMPTS" ]; then
    backoff=$(( attempt * 15 ))
    log "    Waiting ${backoff}s before the next attempt."
    sleep "$backoff"
  fi
done

log "==> Still failing after ${ATTEMPTS} attempts."
exit 1
