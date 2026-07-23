#!/usr/bin/env bash
# agent/uninstall-launchdaemon.sh — stops and removes the Megs Playbook
# generation daemon's LaunchDaemon registration (see
# install-launchdaemon.sh). Does not touch agent/.env, agent/logs/, or any
# Supabase data — only the launchd registration.
#
# Usage: sudo bash agent/uninstall-launchdaemon.sh

set -euo pipefail

LABEL="com.megcmusic.playbook-agent"
PLIST_DEST="/Library/LaunchDaemons/$LABEL.plist"

echo "== Megs Playbook agent — LaunchDaemon uninstall =="

if [[ "$(id -u)" -ne 0 ]]; then
  echo "FAIL: must run with sudo." >&2
  exit 1
fi

launchctl bootout "system/$LABEL" >/dev/null 2>&1 \
  && echo "Booted out $LABEL from system domain." \
  || echo "$LABEL was not loaded (nothing to boot out)."

if [[ -f "$PLIST_DEST" ]]; then
  rm -f "$PLIST_DEST"
  echo "Removed $PLIST_DEST."
else
  echo "No plist at $PLIST_DEST."
fi

echo
echo "Verifying removal..."
if launchctl list 2>/dev/null | grep -q "$LABEL"; then
  echo "FAIL: $LABEL still appears in launchctl list."
  exit 1
fi
echo "PASS: $LABEL is no longer loaded."
