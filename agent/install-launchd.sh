#!/usr/bin/env bash
# agent/install-launchd.sh — installs the Megs Playbook generation daemon as
# a per-user launchd agent so it survives reboots/logouts on Meghan's Mac.
#
# What it does:
#   1. Resolves this repo's absolute path and the absolute `node` path.
#   2. Copies agent/com.megcmusic.playbook-agent.plist to
#      ~/Library/LaunchAgents/, substituting __REPO__ and __NODE__.
#   3. Boots out any existing instance of the job, then bootstraps the new one.
#   4. VERIFIES by runtime artifacts (studio learnings #86/#87 — a plist
#      sitting in a repo, or even in ~/Library/LaunchAgents/, is not proof it
#      is loaded and running): waits up to 10s for `launchctl list` to show
#      the label AND for the StandardOutPath log file to exist and be
#      non-empty, printing PASS/FAIL for each rather than assuming success.
#
# Safe to re-run: re-installing replaces the existing agent cleanly.

set -euo pipefail

LABEL="com.megcmusic.playbook-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_SRC="$SCRIPT_DIR/$LABEL.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$REPO_DIR/agent/logs"
STDOUT_LOG="$LOG_DIR/agent.log"
UID_NUM="$(id -u)"
DOMAIN="gui/$UID_NUM"

echo "== Megs Playbook agent — launchd install =="
echo "Repo:  $REPO_DIR"

if [[ ! -f "$PLIST_SRC" ]]; then
  echo "FAIL: template plist not found at $PLIST_SRC" >&2
  exit 1
fi

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "FAIL: could not resolve 'node' on PATH. Install Node 20+ and re-run." >&2
  exit 1
fi
echo "Node:  $NODE_BIN"

if [[ ! -f "$REPO_DIR/agent/.env" ]]; then
  echo "WARN: agent/.env not found — the daemon will start disabled (clean no-op) until it's created from agent/.env.example."
fi

mkdir -p "$LOG_DIR"
touch "$LOG_DIR/.gitkeep"

mkdir -p "$(dirname "$PLIST_DEST")"

# Substitute placeholders into a fresh copy at the LaunchAgents destination.
sed -e "s|__REPO__|$REPO_DIR|g" -e "s|__NODE__|$NODE_BIN|g" "$PLIST_SRC" > "$PLIST_DEST"
echo "Wrote: $PLIST_DEST"

# Boot out any existing instance first — ignore failure, there may be none.
launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 || true

echo "Bootstrapping $LABEL into $DOMAIN..."
if ! launchctl bootstrap "$DOMAIN" "$PLIST_DEST"; then
  echo "FAIL: launchctl bootstrap failed." >&2
  exit 1
fi
launchctl enable "$DOMAIN/$LABEL" >/dev/null 2>&1 || true

echo
echo "Verifying by runtime artifacts (up to 10s)..."
LOADED="FAIL"
LOG_NONEMPTY="FAIL"
for _ in $(seq 1 10); do
  if launchctl list 2>/dev/null | grep -q "$LABEL"; then
    LOADED="PASS"
  fi
  if [[ -s "$STDOUT_LOG" ]]; then
    LOG_NONEMPTY="PASS"
  fi
  if [[ "$LOADED" == "PASS" && "$LOG_NONEMPTY" == "PASS" ]]; then
    break
  fi
  sleep 1
done

echo "[$LOADED] launchctl list shows $LABEL"
echo "[$LOG_NONEMPTY] $STDOUT_LOG exists and is non-empty"

if [[ "$LOADED" != "PASS" || "$LOG_NONEMPTY" != "PASS" ]]; then
  echo
  echo "One or more checks did not pass within 10s. Inspect:"
  echo "  launchctl list | grep $LABEL"
  echo "  tail -n 50 $STDOUT_LOG"
  echo "  tail -n 50 $LOG_DIR/agent-error.log"
  exit 1
fi

echo
echo "PASS: $LABEL is loaded and producing log output."
echo "Tail the log with: tail -f $STDOUT_LOG"
