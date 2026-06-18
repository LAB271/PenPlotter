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

# 5. Access mode — ask for a UI password. With one set, the UI is reachable on
#    the WiFi (GATEWAY_HOST=0.0.0.0) and gated by that password. Blank = stay
#    loopback-only (reach it via an SSH tunnel; strongest, but not browser-easy).
read -r -p "Set a UI password for browser access on the WiFi (blank = SSH-tunnel only): " UI_PASSWORD || true
if [ -n "$UI_PASSWORD" ]; then
  GW_HOST="0.0.0.0"
  echo "==> LAN access enabled; protected by the password you entered."
else
  GW_HOST="127.0.0.1"
  echo "==> No password → loopback only (use an SSH tunnel)."
fi

# 6. systemd service — GENERATED with this machine's actual user, repo path and
#    node path, so it works regardless of username/location (the static
#    gateway/plotter-gateway.service is just a reference template).
#    PLOTTER_PATH is left unset → the daemon auto-detects the ttyUSB/ttyACM device.
#    Pin it (e.g. /dev/plotter from the udev rule) by uncommenting the line below.
NPX="$(command -v npx)"
sudo tee /etc/systemd/system/plotter-gateway.service >/dev/null <<EOF
[Unit]
Description=PenPlotter271 gateway daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER_NAME
SupplementaryGroups=dialout
WorkingDirectory=$REPO
ExecStart=$NPX tsx gateway/server.ts
Environment=GATEWAY_PORT=8717
Environment=GATEWAY_HOST=$GW_HOST
Environment=GATEWAY_PASSWORD=$UI_PASSWORD
Environment=PLOTTER_STATE=$REPO/gateway/.plotter-state.json
# Environment=PLOTTER_PATH=/dev/plotter
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
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
echo "Serial device detected:"; ls -l /dev/serial/by-id/ 2>/dev/null || ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo "  (none — plug in / power on the plotter)"
