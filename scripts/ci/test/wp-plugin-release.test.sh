#!/usr/bin/env bash
# Proves scripts/ci/wp-plugin-release.sh against a throwaway git repo holding
# a fixture plugin, so every branch of the release path that does not need
# GitHub or WordPress is exercised here and in unit-tests.yml: the
# version-changed gate, the x.y.z refusal, the zip layout (main file at the
# top level, tests left out, version inside matches), the notes, and the
# reading of the self-update route's reply.
set -uo pipefail
cd "$(dirname "$0")"
SCRIPT="$(pwd)/../wp-plugin-release.sh"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
ok()   { pass=$((pass+1)); echo "ok - $1"; }
bad()  { fail=$((fail+1)); echo "not ok - $1"; [ -n "${2:-}" ] && echo "    $2"; }
check(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "expected '$3', got '$2'"; fi; }

# A fixture repo: two commits, the second bumps the version.
REPO="$TMP/repo"; mkdir -p "$REPO/wp-plugin/megc-site-content/tests" "$REPO/wp-plugin/megc-site-content/acf-json"
cd "$REPO" && git init -q && git config user.email t@example.com && git config user.name t
write_plugin() { # $1 = version
  cat > wp-plugin/megc-site-content/megc-site-content.php <<EOF
<?php
/**
 * Plugin Name: Fixture
 * Version: $1
 */
EOF
}
write_plugin 1.6.1
echo '{}' > wp-plugin/megc-site-content/acf-json/group_x.json
echo '<?php // test' > wp-plugin/megc-site-content/tests/x.test.php
touch wp-plugin/megc-site-content/.DS_Store
printf '# Fixture\n\n## Version history\n\n- **1.7.0** (2026-09-23) — updates itself. Verify: Plugins screen shows 1.7.0.\n- **1.6.1** (2026-09-23) — JSON only.\n' > wp-plugin/megc-site-content/README.md
git add -A && git commit -q -m one
write_plugin 1.7.0
git commit -qam two

run() { ( cd "$REPO" && bash "$SCRIPT" "$@" ); }

# ---- version
v=$(run version HEAD~1); code=$?
check "version: exits 0" "$code" "0"
check "version: reads HEAD" "$(grep '^version=' <<<"$v")" "version=1.7.0"
check "version: reads the base" "$(grep '^previous=' <<<"$v")" "previous=1.6.1"
check "version: tag is plugin-v" "$(grep '^tag=' <<<"$v")" "tag=plugin-v1.7.0"
check "version: a bump is a change" "$(grep '^changed=' <<<"$v")" "changed=true"
v=$(run version HEAD)
check "version: the same version is no change" "$(grep '^changed=' <<<"$v")" "changed=false"
v=$(run version HEAD~5 2>/dev/null)
check "version: a missing base reads as empty and changed" "$(grep '^previous=' <<<"$v")|$(grep '^changed=' <<<"$v")" "previous=|changed=true"
( cd "$REPO" && write_plugin 1.7 && git commit -qam bad )
run version HEAD~1 >/dev/null 2>&1; code=$?
check "version: 1.7 (not x.y.z) fails" "$code" "1"
( cd "$REPO" && git reset -q --hard HEAD~1 )

# ---- GITHUB_OUTPUT
: > "$TMP/gho"
( cd "$REPO" && GITHUB_OUTPUT="$TMP/gho" bash "$SCRIPT" version HEAD~1 >/dev/null )
check "version: writes GITHUB_OUTPUT" "$(grep -c . "$TMP/gho")" "4"

# ---- zip
z=$(run zip "$TMP/out.zip"); code=$?
check "zip: exits 0" "$code" "0"
check "zip: main file at the top level" "$(unzip -Z1 "$TMP/out.zip" | grep -cx 'megc-site-content/megc-site-content.php')" "1"
check "zip: field groups included" "$(unzip -Z1 "$TMP/out.zip" | grep -cx 'megc-site-content/acf-json/group_x.json')" "1"
check "zip: README included" "$(unzip -Z1 "$TMP/out.zip" | grep -cx 'megc-site-content/README.md')" "1"
check "zip: tests left out" "$(unzip -Z1 "$TMP/out.zip" | grep -c '/tests/')" "0"
check "zip: dotfiles left out" "$(unzip -Z1 "$TMP/out.zip" | grep -c 'DS_Store')" "0"
check "zip: nothing sits outside the plugin folder" "$(unzip -Z1 "$TMP/out.zip" | grep -vc '^megc-site-content/')" "0"
check "zip: reports the version inside" "$(grep '^zip_version=' <<<"$z")" "zip_version=1.7.0"
# The workflow writes into release/, which does not exist on a fresh checkout.
run zip "$TMP/fresh/dir/out.zip" >/dev/null 2>&1; code=$?
check "zip: creates the output directory" "$code" "0"
check "zip: the zip is where it was asked for" "$([ -f "$TMP/fresh/dir/out.zip" ] && echo yes)" "yes"
# Planted bug: a zip whose tree changed after zipping is caught by the re-read.
( cd "$REPO" && write_plugin 1.8.0 )
run zip "$TMP/out2.zip" >/dev/null 2>&1; code=$?
check "zip: version inside equals the tree (fresh zip)" "$code" "0"
( cd "$REPO" && git checkout -q -- . )

# ---- notes
run notes 1.7.0 "$TMP/notes.md" >/dev/null
check "notes: the README entry, minus the bullet" "$(head -1 "$TMP/notes.md")" "**1.7.0** (2026-09-23) — updates itself. Verify: Plugins screen shows 1.7.0."
run notes 9.9.9 "$TMP/notes2.md" >/dev/null
check "notes: a version the README does not list gets the fallback" "$(head -1 "$TMP/notes2.md")" "megc-site-content 9.9.9 (no README version-history entry for this version)."

# ---- installed
echo '{"ok":true,"updated":true,"installed":"1.7.0","previous":"1.6.1","latest":"1.7.0","errors":[]}' > "$TMP/b1.json"
run installed "$TMP/b1.json" 1.7.0 >/dev/null 2>&1; check "installed: ok + right version passes" "$?" "0"
echo '{"ok":true,"updated":false,"installed":"1.7.0","latest":"1.7.0"}' > "$TMP/b2.json"
run installed "$TMP/b2.json" 1.7.0 >/dev/null 2>&1; check "installed: already current passes (re-run is idempotent)" "$?" "0"
echo '{"ok":true,"updated":false,"installed":"1.6.1","latest":"1.6.1"}' > "$TMP/b3.json"
run installed "$TMP/b3.json" 1.7.0 >/dev/null 2>&1; check "installed: the wrong version fails" "$?" "1"
echo '{"ok":false,"updated":false,"installed":"1.6.1","errors":["Could not copy file"]}' > "$TMP/b4.json"
run installed "$TMP/b4.json" 1.7.0 >/dev/null 2>&1; check "installed: an upgrader error fails" "$?" "1"
echo '{"code":"rest_no_route","message":"No route was found","data":{"status":404}}' > "$TMP/b5.json"
msg=$(run installed "$TMP/b5.json" 1.7.0 2>&1 >/dev/null); code=$?
check "installed: no route fails" "$code" "1"
check "installed: no route names the bootstrap" "$(grep -c 'Upload Plugin' <<<"$msg")" "1"
echo '<html><head><title>Not Acceptable!</title></head></html>' > "$TMP/b6.json"
msg=$(run installed "$TMP/b6.json" 1.7.0 2>&1 >/dev/null); code=$?
check "installed: HTML (bot checkpoint) fails" "$code" "1"
check "installed: HTML is named as not JSON" "$(grep -c 'did not answer JSON' <<<"$msg")" "1"
echo '{"ok":true,"installed":"1.7.0"}' > "$TMP/b7.json"
# The version must be compared as a string: 1.10.0 is not 1.1.
echo '{"ok":true,"installed":"1.10.0"}' > "$TMP/b8.json"
run installed "$TMP/b8.json" 1.1.0 >/dev/null 2>&1; check "installed: 1.10.0 is not 1.1.0" "$?" "1"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
