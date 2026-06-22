# Pi Bootstrap Runbook — §4 of `package-as-deb` (fresh Pi)

Goal: on a **fresh 64-bit Raspberry Pi OS Lite** install, build the `.deb` on the
Pi, install it, confirm it works, then test upgrade + purge. This proves the
package before we build the in-app updater (§5).

> The bundled Node in the `.deb` is for the daemon at **runtime**. Building the
> package still needs a Node/npm dev toolchain on the Pi — that's what step 1
> installs. After the package works you no longer need that toolchain to *run* it.

This Pi is **`sbprsb04`** (reachable as `sbprsb04.local` once avahi is installed).
Find the login user with `whoami` (used below as `PI_USER`):

```bash
# on the Pi
whoami        # → PI_USER
uname -m      # → aarch64   (must be 64-bit; if armv7l, stop — this package is arm64)
```

---

## 1. Prepare the fresh Pi (one time)

```bash
sudo apt update
sudo apt install -y git curl avahi-daemon        # avahi → reachable as <host>.local

# Node LTS (build toolchain — vite + esbuild). Bundled runtime Node is separate.
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# nfpm (builds the .deb)
echo 'deb [trusted=yes] https://repo.goreleaser.com/apt/ /' | sudo tee /etc/apt/sources.list.d/goreleaser.list
sudo apt update && sudo apt install -y nfpm

node -v && npm -v && nfpm --version               # sanity check
```

## 2. Get this code onto the Pi

From the **laptop** (replace `PI_USER`/`PI_HOST`):

```bash
rsync -av --delete \
  --exclude node_modules --exclude dist --exclude dist-gateway \
  --exclude build --exclude dist-deb --exclude .git \
  --exclude 'gateway/.plotter-state.json' --exclude 'gateway/.session.json' \
  /Users/dsiderius/Desktop/Internal_Projects/PenPlotter271/ \
  PI_USER@PI_HOST.local:~/PenPlotter271/
```

## 3. (Optional) pin the Node LTS version baked into the package

Default is `22.20.0`. Check the current 22.x LTS at https://nodejs.org/dist and
override only if newer:

```bash
export NODE_VERSION=22.x.y
```

## 4. Build the package

```bash
cd ~/PenPlotter271
npm ci
bash packaging/assemble.sh
dpkg -c dist-deb/penplotter271_*.deb     # inspect layout
```

**Success =** `dist-deb/penplotter271_<version>_arm64.deb` exists, and `dpkg -c`
shows `/opt/penplotter271/{node,gateway.js,dist,node_modules}`, the systemd unit,
the udev rule, the env conffile, and the sudoers file.

## 5. Install

```bash
sudo apt install ./dist-deb/penplotter271_*.deb
```

Verify (the critical checks):

```bash
systemctl status plotter-gateway          # → active (running)
journalctl -u plotter-gateway -n 40       # → "PenPlotter271 gateway vX" + "plotter connected — GRBL ..."
id penplotter                             # → exists, member of dialout
ls -l /var/lib/penplotter271              # → state dir owned by penplotter
```

### 🔑 KEY CHECK
The journal **must** show `plotter connected` (not a `serialport`/native-binding
error). That confirms the bundled Node + native binding are ABI-compatible — the
one thing we could not test off-hardware. **If you see a binding/ABI error, copy
the exact message.**

## 6. Functional test

From the laptop:

```bash
ssh -L 8717:localhost:8717 PI_USER@PI_HOST.local
# browser → http://localhost:8717
```

- App loads, connects (green dot), shows machine state.
- Set work zero, jog, pen up/down all work.
- Run a small plot end-to-end.
- State persists: `cat /var/lib/penplotter271/.plotter-state.json`.

## 7. Upgrade test

```bash
# temporarily bump "version" in package.json (e.g. 0.1.1)
npm ci && bash packaging/assemble.sh
sudo apt install ./dist-deb/penplotter271_*.deb
# revert the temp version bump afterward
```

Verify: service restarted on the new version, your edits to
`/etc/penplotter271/penplotter271.env` are **preserved**, state preserved.

## 8. Mid-plot guard test (recommended)

Start a plot; while it is moving, run `sudo apt install ./dist-deb/penplotter271_*.deb`.
It should **refuse** ("plotter appears to be MOVING"). Wait for idle, retry → succeeds.

## 9. Purge test

```bash
sudo apt purge penplotter271
```

Verify: service gone (`systemctl status plotter-gateway` → not found), and
`/opt/penplotter271`, `/etc/penplotter271`, `/var/lib/penplotter271`, and the
`penplotter` user all removed.

---

## 10. Production hardening (for real unattended use — optional for the test)

A fresh Pi can idle-sleep or WiFi-powersave and stall an unattended plot. The
`.deb` intentionally does **not** change host power policy, so do it once here:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
sudo iw dev wlan0 set power_save off 2>/dev/null || true
sudo nmcli connection modify "$(nmcli -t -f NAME connection show --active | head -n1)" \
  802-11-wireless.powersave 2 2>/dev/null || true
```

(Plus: put your SSH **public** key in `~/.ssh/authorized_keys` for key-based access,
since the app has no built-in auth and is reachable only via the SSH tunnel.)

---

## Report back to continue

- ✅/❌ Build + install succeeded; **"plotter connected"** (paste the journal line)
- Any `serialport`/ABI error? (exact message)
- ✅/❌ Upgrade preserved config + state
- ✅/❌ Mid-plot guard refused
- ✅/❌ Purge cleaned up
- Node LTS version used

Then I build **§5 (in-app updater)** → **§6 (CI release on `v*` tag)** → **§7 (docs)**.

## Troubleshooting

- **`uname -m` is `armv7l`** → 32-bit OS; this package is arm64 only. Reflash 64-bit Pi OS.
- **Build fails fetching Node** → `NODE_VERSION` must be a real release at nodejs.org/dist.
- **`npm ci`/vite build fails on a native dep** → `sudo apt install -y build-essential python3` and retry.
- **`serialport` error at runtime** → note the ABI/message; we may pin a different Node major.
- **Service won't start** → `journalctl -u plotter-gateway -n 50`; check paths exist: `ls -l /opt/penplotter271`.
- **`PI_HOST.local` not resolving** → ensure `avahi-daemon` is installed/running, or use the Pi's IP.
