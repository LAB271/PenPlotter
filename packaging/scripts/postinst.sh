#!/bin/sh
# Runs after the package's files are unpacked (install or upgrade).
set -e

# 1. Dedicated, login-less system user with serial access.
if ! id -u penplotter >/dev/null 2>&1; then
  adduser --system --group --no-create-home --home /var/lib/penplotter271 penplotter
fi
usermod -aG dialout penplotter || true

# 2. Writable runtime state directory (remembered position + editable session).
install -d -o penplotter -g penplotter -m 0755 /var/lib/penplotter271

# 3. Best-effort migrate state from a previous from-source (rsync) install.
for f in .plotter-state.json .session.json; do
  old="/home/penplotter/PenPlotter271/gateway/$f"
  new="/var/lib/penplotter271/$f"
  if [ -f "$old" ] && [ ! -f "$new" ]; then
    cp -p "$old" "$new" 2>/dev/null || true
    chown penplotter:penplotter "$new" 2>/dev/null || true
  fi
done

# 4. Lock down the sudoers drop-in (nfpm also sets 0440; belt and suspenders).
chmod 0440 /etc/sudoers.d/penplotter271 2>/dev/null || true

# 5. Refresh udev for the plotter rule.
udevadm control --reload-rules >/dev/null 2>&1 || true
udevadm trigger >/dev/null 2>&1 || true

# 6. Enable + (re)start the service on the new code.
systemctl daemon-reload >/dev/null 2>&1 || true
systemctl enable plotter-gateway.service >/dev/null 2>&1 || true
systemctl restart plotter-gateway.service >/dev/null 2>&1 || true

exit 0
