#!/usr/bin/env bash
# The plugin release path, as subcommands wp-plugin-release.yml calls in turn.
# Every step that can be proved without GitHub or WordPress lives here so
# scripts/ci/test/wp-plugin-release.test.sh can prove it; the workflow itself
# only glues these to `gh release` and one `curl`.
#
#   version <base-ref>      Reads `Version:` from the plugin header at HEAD and
#                           at <base-ref>; prints version=, previous=, tag= and
#                           changed=true|false. Fails when HEAD's version is not
#                           plain x.y.z (the updater refuses anything else).
#   zip <out.zip>           Builds the release zip so that it holds
#                           megc-site-content/megc-site-content.php at the top
#                           level (what Plugin_Upgrader replaces the folder
#                           with), leaves tests out, then re-reads the zip to
#                           prove both the layout and the version inside.
#   notes <version> <out>   Writes the release notes: the README's version-
#                           history entry for <version>, or a one-line fallback.
#   installed <body> <ver>  Reads the self-update route's JSON reply: exits 0
#                           only when it says ok and the version on disk is
#                           <ver>. Names the bootstrap case (no route yet).
#
# Outputs go to $GITHUB_OUTPUT when set, else stdout.
set -euo pipefail

PLUGIN_DIR=${PLUGIN_DIR:-wp-plugin/megc-site-content}
MAIN="$PLUGIN_DIR/megc-site-content.php"
SLUG=$(basename "$PLUGIN_DIR")
SEMVER='^[0-9]+\.[0-9]+\.[0-9]+$'

out() { # key=value → $GITHUB_OUTPUT or stdout
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$1" >> "$GITHUB_OUTPUT"; fi
  echo "$1"
}

# The `Version:` header line, from a file's contents on stdin.
header_version() {
  grep -m1 -E '^[[:space:]]*\*[[:space:]]*Version:' | sed -E 's/^[[:space:]]*\*[[:space:]]*Version:[[:space:]]*//; s/[[:space:]]+$//' || true
}

cmd_version() {
  local base=${1:?base ref}
  local current previous
  current=$(header_version < "$MAIN")
  if ! [[ "$current" =~ $SEMVER ]]; then
    echo "::error::$MAIN carries Version '$current'; the updater only offers plain x.y.z" >&2
    exit 1
  fi
  # A base with no plugin file (or no such ref) reads as empty: a first release.
  previous=$( { git show "$base:$MAIN" 2>/dev/null || true; } | header_version)
  out "version=$current"
  out "previous=$previous"
  out "tag=plugin-v$current"
  if [ "$current" = "$previous" ]; then out "changed=false"; else out "changed=true"; fi
}

cmd_zip() {
  local target=${1:?out.zip}
  local abs version inside
  abs=$(cd "$(dirname "$target")" && pwd)/$(basename "$target")
  rm -f "$abs"
  ( cd "$(dirname "$PLUGIN_DIR")" && zip -q -r -X "$abs" "$SLUG" -x "$SLUG/tests/*" -x '*/.DS_Store' -x '*/.*' )
  # Prove the layout: the main file sits directly under the plugin folder.
  if ! unzip -Z1 "$abs" | grep -qx "$SLUG/$SLUG.php"; then
    echo "::error::$target does not hold $SLUG/$SLUG.php at the top level" >&2
    unzip -Z1 "$abs" | head -20 >&2
    exit 1
  fi
  if unzip -Z1 "$abs" | grep -q "^$SLUG/tests/"; then
    echo "::error::$target ships the tests folder" >&2
    exit 1
  fi
  version=$(header_version < "$MAIN")
  inside=$(unzip -p "$abs" "$SLUG/$SLUG.php" | header_version)
  if [ "$inside" != "$version" ]; then
    echo "::error::the zip carries Version '$inside', the tree carries '$version'" >&2
    exit 1
  fi
  out "zip=$target"
  out "zip_version=$inside"
  out "zip_files=$(unzip -Z1 "$abs" | grep -vc '/$')"
}

cmd_notes() {
  local version=${1:?version} target=${2:?out}
  local line
  line=$(grep -m1 -E "^- \*\*${version//./\\.}\*\*" "$PLUGIN_DIR/README.md" || true)
  if [ -n "$line" ]; then
    printf '%s\n\nInstalled on the live WordPress by the release workflow; wp-admin → Plugins → "Update now" is the by-hand fallback.\n' "${line#- }" > "$target"
  else
    printf 'megc-site-content %s (no README version-history entry for this version).\n' "$version" > "$target"
  fi
  out "notes=$target"
}

cmd_installed() {
  local body=${1:?body.json} want=${2:?version}
  python3 - "$body" "$want" <<'PY'
import json, sys
path, want = sys.argv[1], sys.argv[2]
raw = open(path, "rb").read().decode("utf-8", "replace")
try:
    data = json.loads(raw)
except ValueError:
    print("::error::the self-update route did not answer JSON (a login page or a bot checkpoint?):", file=sys.stderr)
    print(raw[:600], file=sys.stderr)
    sys.exit(1)
if not isinstance(data, dict):
    print("::error::unexpected reply shape: %r" % (raw[:300],), file=sys.stderr); sys.exit(1)
if data.get("code") == "rest_no_route":
    print("::error::admin.megcmusic.com has no /megc/v1/self-update route: the plugin there predates 1.7.0. "
          "Bootstrap once by hand — upload this release's megc-site-content.zip in wp-admin → Plugins → Add New → Upload Plugin "
          "(Replace current with uploaded) — then re-run this workflow.", file=sys.stderr)
    sys.exit(1)
if "installed" not in data:
    print("::error::the route answered without an installed version: %s" % json.dumps(data)[:600], file=sys.stderr); sys.exit(1)
installed = str(data.get("installed"))
ok = data.get("ok") is True
if ok and installed == want:
    print("installed=%s" % installed)
    print("updated=%s" % ("true" if data.get("updated") else "false"))
    sys.exit(0)
print("::error::self-update did not land %s: ok=%s installed=%s latest=%s errors=%s error=%s" % (
    want, data.get("ok"), installed, data.get("latest"), data.get("errors"), data.get("error")), file=sys.stderr)
sys.exit(1)
PY
}

case "${1:-}" in
  version)   shift; cmd_version "$@" ;;
  zip)       shift; cmd_zip "$@" ;;
  notes)     shift; cmd_notes "$@" ;;
  installed) shift; cmd_installed "$@" ;;
  *) echo "usage: $0 version <base-ref> | zip <out.zip> | notes <version> <out> | installed <body.json> <version>" >&2; exit 2 ;;
esac
