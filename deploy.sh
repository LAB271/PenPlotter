#!/usr/bin/env bash
# Deploy the latest code on the Raspberry Pi: pull, build, restart the daemon.
#
# Guards against deploying mid-plot — restarting the service aborts a running
# plot. Run from the repo on the Pi:  ./deploy.sh   (use --force to skip prompts)
set -euo pipefail

cd "$(dirname "$0")"

SERVICE=plotter-gateway
# The daemon writes this ~5 Hz ONLY while the machine is moving (idle positions
# dedupe to no write), so a fresh mtime ⇒ a plot/jog is in progress.
STATE_FILE="${PLOTTER_STATE:-gateway/.plotter-state.json}"
FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

# --- guard: don't restart the daemon while the plotter is moving ---
if [ -f "$STATE_FILE" ] && [ -n "$(find "$STATE_FILE" -newermt '-3 seconds' 2>/dev/null)" ]; then
  echo "⚠️  The plotter looks like it is MOVING (position saved <3s ago)."
  echo "    Restarting the daemon now would ABORT the running plot."
  if [ "$FORCE" -eq 1 ]; then
    echo "    --force given; continuing anyway."
  else
    read -r -p "    Deploy anyway? [y/N] " ans
    case "$ans" in [yY] | [yY][eE][sS]) ;; *) echo "Aborted." && exit 1 ;; esac
  fi
fi

# --- pull ---
before=$(git rev-parse HEAD)
echo "→ git pull"
git pull --ff-only
after=$(git rev-parse HEAD)

if [ "$before" = "$after" ] && [ "$FORCE" -ne 1 ]; then
  echo "Already up to date — nothing to deploy. (Use --force to rebuild/restart anyway.)"
  exit 0
fi

# --- install deps only if they changed (npm install is slow on the Pi) ---
if ! git diff --quiet "$before" "$after" -- package.json package-lock.json; then
  echo "→ dependencies changed: npm install"
  npm install
fi

# --- build the served GUI + typecheck ---
echo "→ npm run build"
npm run build

# --- restart the daemon ---
echo "→ restarting $SERVICE"
sudo systemctl restart "$SERVICE"

echo "✓ deployed ($after). Following logs (Ctrl-C to stop):"
journalctl -u "$SERVICE" -n 20 -f
