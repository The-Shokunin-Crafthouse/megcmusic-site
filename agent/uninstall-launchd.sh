#!/usr/bin/env bash
# agent/uninstall-launchd.sh — stops and removes the Megs Playbook generation
# daemon's launchd agent. Does not touch agent/.env, agent/logs/, or any
# Supabase data — only the launchd registration.

set -euo pipefail

LABEL="com.megcmusic.playbook-agent"
PLIST_DEST="$HOME/Library/LaunchAgents/$LABEL.plist"
UID_NUM="$(id -u)"
DOMAIN="gui/$UID_NUM"

echo "== Megs Playbook agent — launchd uninstall =="

launchctl bootout "$DOMAIN/$LABEL" >/dev/null 2>&1 \
  && echo "Booted out $LABEL from $DOMAIN." \
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
