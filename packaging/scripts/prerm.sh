#!/bin/sh
# Runs before the package's files are removed (upgrade or remove).
# Guards against tearing down the daemon mid-plot: the daemon rewrites the state
# file ~5 Hz ONLY while the machine is moving, so a fresh mtime means a plot/jog
# is in progress. Exiting non-zero here aborts the upgrade/removal.
#
# `failed-upgrade` must be handled too: on an upgrade dpkg runs the OLD package's
# `prerm upgrade`, and if that fails it retries with the NEW package's
# `prerm failed-upgrade`. Without re-checking here, that fallback would exit 0
# and let the upgrade proceed mid-plot — defeating the guard.
set -e

STATE=/var/lib/penplotter271/.plotter-state.json

case "$1" in
  upgrade | remove | deconfigure | failed-upgrade)
    if [ -f "$STATE" ] && [ -n "$(find "$STATE" -newermt '-3 seconds' 2>/dev/null)" ]; then
      echo "PenPlotter271: the plotter appears to be MOVING (position saved <3s ago)." >&2
      echo "Refusing to stop the service now — wait until the plot finishes and retry." >&2
      exit 1
    fi
    systemctl stop plotter-gateway.service >/dev/null 2>&1 || true
    ;;
esac

exit 0
