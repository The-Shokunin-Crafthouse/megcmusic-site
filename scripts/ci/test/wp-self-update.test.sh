#!/usr/bin/env bash
# Proves scripts/ci/wp-self-update.mjs against a stub server: the request
# carries the JSON body and Content-Type Bluehost's Mod_Security wants (a
# bodiless POST is answered 406 before WordPress), Basic auth from the
# secrets, and a non-2xx reply is written to $OUT with exit 0 so the
# `installed` check can read it. Only a dead host exits non-zero.
set -uo pipefail
cd "$(dirname "$0")"
SCRIPT="$(pwd)/../wp-self-update.mjs"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"; kill $SRV 2>/dev/null' EXIT
pass=0; fail=0
ok()   { pass=$((pass+1)); echo "ok - $1"; }
bad()  { fail=$((fail+1)); echo "not ok - $1"; [ -n "${2:-}" ] && echo "    $2"; }
check(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected '$3', got '$2'"; fi; }

# Stub: records the request to $TMP/req.json, answers with the status in $TMP/status.
cat > "$TMP/server.mjs" <<'JS'
import { createServer } from "node:http";
import { writeFileSync, readFileSync } from "node:fs";
const dir = process.argv[2];
createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    writeFileSync(`${dir}/req.json`, JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body }));
    const status = Number(readFileSync(`${dir}/status`, "utf8").trim());
    res.writeHead(status, { "content-type": "application/json" });
    res.end(status === 200 ? '{"ok":true,"updated":true,"installed":"1.7.0"}' : '{"code":"rest_no_route"}');
  });
}).listen(Number(process.argv[3]), "127.0.0.1", () => console.log("up"));
JS
PORT=$((20000 + RANDOM % 20000))
echo 200 > "$TMP/status"
node "$TMP/server.mjs" "$TMP" "$PORT" > "$TMP/srv.log" 2>&1 &
SRV=$!
for i in $(seq 1 50); do grep -q up "$TMP/srv.log" && break; sleep 0.1; done

run() { ( cd "$TMP" && WP_ORIGIN="http://127.0.0.1:$PORT" WP_APP_USER=meg WP_APP_PASSWORD='abcd efgh' OUT="$TMP/body.json" node "$SCRIPT" >"$TMP/out.log" 2>&1 ); }

run; code=$?
check "200: exits 0" "$code" "0"
check "200: reply written to OUT" "$(cat "$TMP/body.json")" '{"ok":true,"updated":true,"installed":"1.7.0"}'
check "POST" "$(python3 -c "import json;print(json.load(open('$TMP/req.json'))['method'])")" "POST"
check "the route" "$(python3 -c "import json;print(json.load(open('$TMP/req.json'))['url'])")" "/wp-json/megc/v1/self-update"
check "a JSON body (not bodiless — Mod_Security 406)" "$(python3 -c "import json;print(json.load(open('$TMP/req.json'))['body'])")" "{}"
check "Content-Type json" "$(python3 -c "import json;print(json.load(open('$TMP/req.json'))['headers']['content-type'])")" "application/json"
check "Content-Length present" "$(python3 -c "import json;print(json.load(open('$TMP/req.json'))['headers']['content-length'])")" "2"
check "Basic auth from the secrets" "$(python3 -c "import json,base64;h=json.load(open('$TMP/req.json'))['headers']['authorization'];print(base64.b64decode(h.split()[1]).decode())")" "meg:abcd efgh"
check "Accept json" "$(python3 -c "import json;print(json.load(open('$TMP/req.json'))['headers']['accept'])")" "application/json"

echo 404 > "$TMP/status"
run; code=$?
check "404: still exits 0 (the reply is for the installed check)" "$code" "0"
check "404: reply written" "$(cat "$TMP/body.json")" '{"code":"rest_no_route"}'
check "404: status printed" "$(grep -c '^HTTP 404' "$TMP/out.log")" "1"

kill $SRV; wait $SRV 2>/dev/null
rm -f "$TMP/body.json"
( cd "$TMP" && WP_ORIGIN="http://127.0.0.1:$PORT" WP_APP_USER=meg WP_APP_PASSWORD=x OUT="$TMP/body.json" TIMEOUT_MS=2000 RETRY_DELAY_MS=100 node "$SCRIPT" >"$TMP/out2.log" 2>&1 ); code=$?
check "dead host: exits 1 after the retry" "$code" "1"
check "dead host: two attempts" "$(grep -c '^attempt' "$TMP/out2.log")" "2"
( cd "$TMP" && WP_ORIGIN="http://127.0.0.1:$PORT" node "$SCRIPT" >"$TMP/out3.log" 2>&1 ); code=$?
check "no secrets: exits 1 and says so" "$code|$(grep -c 'not set' "$TMP/out3.log")" "1|1"

echo; echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
