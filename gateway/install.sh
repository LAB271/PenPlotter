#!/usr/bin/env bash
# Provision the PenPlotter271 gateway on a Raspberry Pi (Raspberry Pi OS / Debian).
# Idempotent: safe to re-run. Run from the repo root:  bash gateway/install.sh
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
USER_NAME="${SUDO_USER:-$(whoami)}"
cd "$REPO"
echo "==> Installing gateway from $REPO for user $USER_NAME"

# 1. Node LTS + build tools (serialport builds a native binding on ARM)
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  echo "==> Installing Node.js LTS"
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo apt-get install -y build-essential python3 avahi-daemon

# 2. App dependencies + GUI build (the daemon serves dist/)
echo "==> npm install + build"
npm install
npm run build

# 3. Serial access: user in 'dialout', stable /dev/plotter via udev
sudo usermod -aG dialout "$USER_NAME"
sudo cp gateway/99-plotter.rules /etc/udev/rules.d/99-plotter.rules
sudo udevadm control --reload && sudo udevadm trigger || true

# 4. Never idle-sleep (always-on host) + disable WiFi power-save
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target || true
sudo iw dev wlan0 set power_save off 2>/dev/null || true   # best-effort; persists via NetworkManager below
sudo nmcli connection modify "$(nmcli -t -f NAME connection show --active | head -n1)" \
  802-11-wireless.powersave 2 2>/dev/null || true

# 5. systemd service: auto-start on boot, auto-connect, restart on crash
#    (WorkingDirectory in the unit is /home/pi/PenPlotter271 — edit it if your path differs)
sudo cp gateway/plotter-gateway.service /etc/systemd/system/plotter-gateway.service
sudo systemctl daemon-reload
sudo systemctl enable --now plotter-gateway

echo
echo "==> Done. Service status:"
systemctl --no-pager status plotter-gateway || true
echo
echo "Reach the web app from your laptop (same WiFi) via an SSH tunnel:"
echo "    ssh -L 8717:localhost:8717 $USER_NAME@$(hostname).local"
echo "    then open http://localhost:8717"
echo "Logs:  journalctl -u plotter-gateway -f"
echo "NOTE: if the WorkingDirectory in the unit doesn't match $REPO, edit"
echo "      /etc/systemd/system/plotter-gateway.service and 'sudo systemctl daemon-reload'."
