#!/usr/bin/env bash
# agent/install-launchdaemon.sh — installs the Megs Playbook generation
# daemon as a system-wide LaunchDaemon running under a DEDICATED macOS user
# account, rather than a per-user LaunchAgent under the machine's primary
# interactive user.
#
# Use this (instead of install-launchd.sh) when the daemon runs on a
# different Mac than the one the account "belongs to" in daily use — e.g.
# Levi's Mac, under a second account logged into Meghan's Claude
# subscription, because her own laptop is underpowered for this (8GB RAM,
# 11th-gen i3) — decided and logged in decisions.md, 2026-07-13. A
# LaunchDaemon does not require that user to be in an active GUI session
# (unlike a LaunchAgent, which needs Fast User Switching to survive being
# switched away from, and stops entirely on a full log-out).
#
# REQUIRES:
#   - Run with sudo (installing into /Library/LaunchDaemons/ needs root).
#   - The target user must already exist, and should have logged in
#     interactively at least once and run `claude -p "say hi"` themselves
#     first — this both confirms `claude` CLI auth works for them and
#     unlocks their Keychain for whatever token store the CLI relies on. A
#     LaunchDaemon spawned before that first interactive login can fail to
#     read Keychain-stored credentials.
#   - This repo should be cloned under the TARGET USER's own home
#     directory (not the admin's) so file ownership is naturally theirs —
#     the daemon runs as them and needs write access to agent/.env and
#     agent/logs/.
#   - Node must be installed system-wide (e.g. Homebrew), not per-user via
#     nvm under a different account's home — the target user's LaunchDaemon
#     process needs to be able to execute it. This script checks that.
#
# Usage: sudo bash agent/install-launchdaemon.sh <macos-username>
#
# Safe to re-run: re-installing replaces the existing registration cleanly.

set -euo pipefail

LABEL="com.megcmusic.playbook-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_SRC="$SCRIPT_DIR/$LABEL-daemon.plist"
PLIST_DEST="/Library/LaunchDaemons/$LABEL.plist"
LOG_DIR="$REPO_DIR/agent/logs"
STDOUT_LOG="$LOG_DIR/agent.log"

echo "== Megs Playbook agent — LaunchDaemon install =="

if [[ "$(id -u)" -ne 0 ]]; then
  echo "FAIL: must run with sudo (installing into /Library/LaunchDaemons/ needs root)." >&2
  exit 1
fi

TARGET_USER="${1:-}"
if [[ -z "$TARGET_USER" ]]; then
  echo "FAIL: usage: sudo bash agent/install-launchdaemon.sh <macos-username>" >&2
  exit 1
fi

if ! id "$TARGET_USER" >/dev/null 2>&1; then
  echo "FAIL: no such macOS user: $TARGET_USER" >&2
  exit 1
fi
TARGET_GROUP="$(id -gn "$TARGET_USER")"

echo "Repo:  $REPO_DIR"
echo "User:  $TARGET_USER ($TARGET_GROUP)"

if [[ ! -f "$PLIST_SRC" ]]; then
  echo "FAIL: template plist not found at $PLIST_SRC" >&2
  exit 1
fi

NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "FAIL: could not resolve 'node' on PATH. Install Node 20+ system-wide (e.g. 'brew install node') and re-run." >&2
  exit 1
fi
echo "Node:  $NODE_BIN"

# The target user must actually be able to execute this node binary — a
# per-user nvm install under the admin's home is invisible to her account.
if ! sudo -u "$TARGET_USER" "$NODE_BIN" --version >/dev/null 2>&1; then
  echo "FAIL: $TARGET_USER cannot execute $NODE_BIN." >&2
  echo "      Node is likely installed per-user (nvm) under the wrong account." >&2
  echo "      Install Node system-wide (Homebrew: 'brew install node') so every account can reach it." >&2
  exit 1
fi

if [[ ! -f "$REPO_DIR/agent/.env" ]]; then
  echo "WARN: agent/.env not found — the daemon will start disabled (clean no-op) until it's created from agent/.env.example."
fi

REPO_OWNER="$(stat -f '%Su' "$REPO_DIR")"
if [[ "$REPO_OWNER" != "$TARGET_USER" ]]; then
  echo "WARN: $REPO_DIR is owned by '$REPO_OWNER', not '$TARGET_USER'."
  echo "      The daemon runs as $TARGET_USER and needs write access to agent/.env and agent/logs/."
  echo "      Clone the repo under $TARGET_USER's own home directory, or run:"
  echo "        chown -R $TARGET_USER:$TARGET_GROUP \"$REPO_DIR\""
fi

mkdir -p "$LOG_DIR"
touch "$LOG_DIR/.gitkeep"
chown -R "$TARGET_USER:$TARGET_GROUP" "$LOG_DIR"

sed -e "s|__REPO__|$REPO_DIR|g" \
    -e "s|__NODE__|$NODE_BIN|g" \
    -e "s|__USER__|$TARGET_USER|g" \
    -e "s|__GROUP__|$TARGET_GROUP|g" \
    "$PLIST_SRC" > "$PLIST_DEST"
chown root:wheel "$PLIST_DEST"
chmod 644 "$PLIST_DEST"
echo "Wrote: $PLIST_DEST"

# Boot out any existing instance first — ignore failure, there may be none.
launchctl bootout "system/$LABEL" >/dev/null 2>&1 || true

echo "Bootstrapping $LABEL into system domain..."
if ! launchctl bootstrap system "$PLIST_DEST"; then
  echo "FAIL: launchctl bootstrap failed." >&2
  exit 1
fi
launchctl enable "system/$LABEL" >/dev/null 2>&1 || true

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
  echo "  sudo launchctl print system/$LABEL"
  echo "  tail -n 50 $STDOUT_LOG"
  echo "  tail -n 50 $LOG_DIR/agent-error.log"
  exit 1
fi

echo
echo "PASS: $LABEL is loaded (system domain, running as $TARGET_USER) and producing log output."
echo "Tail the log with: tail -f $STDOUT_LOG"
