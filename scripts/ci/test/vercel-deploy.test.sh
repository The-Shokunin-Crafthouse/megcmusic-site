#!/usr/bin/env bash
# Exercises scripts/ci/vercel-deploy.sh against a stubbed `vercel` CLI and a
# stubbed Vercel API, so every branch is proved without touching a real project
# or spending an upload.
#
# The case that matters is FAILURE_THEN_READY: the CLI dies with `fetch failed`
# after the deployment was created, the API says READY, and the script must
# succeed WITHOUT invoking the CLI a second time. That is the whole reason this
# is not a plain retry wrapper, so it is asserted on the call count, not on the
# exit code alone.
set -uo pipefail
cd "$(dirname "$0")"
SCRIPT="../vercel-deploy.sh"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
URL="https://megcmusic-site-abc123-meggy-cb-ahn.vercel.app"
pass=0; fail=0

# Stub CLI: appends a line per invocation so we can count calls.
make_vercel() { # $1 = mode
  cat > "$TMP/vercel" <<EOF
#!/usr/bin/env bash
echo call >> "$TMP/calls"
n=\$(wc -l < "$TMP/calls" | tr -d ' ')
case "$1" in
  always_ok)        echo "$URL"; exit 0 ;;
  ok_odd_url)       echo "https://custom.example.com/deploy/xyz"; exit 0 ;;
  always_fetchfail) echo "$URL"; echo "TypeError: fetch failed" >&2; exit 1 ;;
  no_url)           echo "Error: could not reach vercel" >&2; exit 1 ;;
  fail_then_ok)     if [ "\$n" -lt 2 ]; then echo "Error" >&2; exit 1; else echo "$URL"; exit 0; fi ;;
esac
EOF
  chmod +x "$TMP/vercel"
}

# Stub API: a tiny HTTP-less shim. We override curl on PATH.
make_curl() { # $1 = readyState to report ("" = empty body)
  cat > "$TMP/curl" <<EOF
#!/usr/bin/env bash
[ -n "$1" ] && echo '{"readyState":"$1","url":"x"}'
exit 0
EOF
  chmod +x "$TMP/curl"
}

run_case() { # name expected_exit expected_calls vercel_mode api_state
  local name="$1" xrc="$2" xcalls="$3"
  : > "$TMP/calls"
  make_vercel "$4"; make_curl "$5"
  local out rc calls
  out="$(PATH="$TMP:$PATH" VERCEL_BIN="$TMP/vercel" VERCEL_TOKEN=stub \
        VERCEL_ORG_ID=team_stub DEPLOY_ATTEMPTS=2 DEPLOY_STATE_TIMEOUT=6 \
        bash "$SCRIPT" --prebuilt --prod 2>"$TMP/err")"; rc=$?
  calls=$(wc -l < "$TMP/calls" | tr -d ' ')
  if [ "$rc" = "$xrc" ] && [ "$calls" = "$xcalls" ]; then
    echo "  PASS  $name (exit=$rc, vercel invocations=$calls)"; pass=$((pass+1))
  else
    echo "  FAIL  $name -- expected exit=$xrc calls=$xcalls, got exit=$rc calls=$calls"
    sed 's/^/        /' "$TMP/err" | tail -6; fail=$((fail+1))
  fi
  [ "$rc" = 0 ] && [ -n "$out" ] && case "$out" in https://*) ;; *) echo "  FAIL  $name -- stdout was not a bare URL: '$out'"; fail=$((fail+1));; esac
}

echo "vercel-deploy.sh"
run_case "clean success deploys once"                         0 1 always_ok        READY
run_case "fetch-fail but deployment READY: succeeds, NO redeploy" 0 1 always_fetchfail READY
run_case "fetch-fail and deployment ERROR: fails fast, no retry"  1 1 always_fetchfail ERROR
run_case "fetch-fail and CANCELED: fails fast, no retry"          1 1 always_fetchfail CANCELED
run_case "no URL printed: retries to the attempt limit"           1 2 no_url           READY
run_case "transient failure with no URL then success"             0 2 fail_then_ok     READY
run_case "URL but API never answers: falls through to retry"      1 2 always_fetchfail ""
run_case "success with an unrecognised URL shape still returns it" 0 1 ok_odd_url      READY

echo
echo "passed=$pass failed=$fail"
[ "$fail" -eq 0 ]
