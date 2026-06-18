# PenPlotter271 Gateway

A long-running daemon that **owns the plotter's serial port and opens it exactly once**, then exposes the machine over a WebSocket. This fixes the macOS CH340 reopen-wedge (errno 22 — the cause of the "Failed to open" / replug saga) and is the architecture for unattended Raspberry Pi plotting.

The daemon runs the existing framework-free `GrblController` (in `src/grbl`) via `NodeSerialTransport`, streams G-code autonomously (plots survive a browser/laptop disconnect), and serves the built GUI. The browser is a thin client (`src/transport/GatewayClient.ts`) — **no Web Serial in the browser anymore**.

## Run it (macOS dev)

```bash
npm install                 # serialport, ws, tsx (native binding builds on install)
npm run build               # build the GUI into dist/ (the daemon serves it)
npm run gateway             # daemon: opens the port once, serves GUI+WS on :8717
```

Then open **http://localhost:8717** and click Connect. (During UI work you can also run `npm run dev` on :5173; the `GatewayClient` connects to `ws://<host>:8717` regardless.)

Config via env: `GATEWAY_PORT` (default 8717), `PLOTTER_PATH` (pin the device, else auto-detect a `usbserial`/`wchusbserial`/`ttyUSB`/`ttyACM` port).

**Idle sleep (macOS):** when the laptop is left idle, macOS throttles/suspends the daemon (App Nap) and dims the display, which stalls a running plot. The daemon **automatically runs `caffeinate -dimsu`** for its lifetime to prevent this, so `npm run gateway` is enough — no manual step. (If `caffeinate` is somehow unavailable, run `caffeinate -dimsu npm run gateway`.) On the Pi this is a non-issue; disable sleep at the OS level instead.

Hardware smoke test (moves the machine — set work zero first):
```bash
npm run gateway:smoke
```

## Raspberry Pi (auto-connect on power-up)

**Prerequisites:** Raspberry Pi OS (Lite is fine — headless), the Pi on your WiFi, SSH enabled, and this repo cloned at `~/PenPlotter271`. Plotter on USB.

**One-command install** (idempotent — installs Node + deps, builds the GUI, sets up serial access, always-on, mDNS, and the boot service):

```bash
cd ~/PenPlotter271
bash gateway/install.sh
```

(If your repo path isn't `/home/pi/PenPlotter271`, edit `WorkingDirectory`/paths in `/etc/systemd/system/plotter-gateway.service` afterward and `sudo systemctl daemon-reload`.)

Power-cycle to confirm it auto-starts and auto-connects. Logs: `journalctl -u plotter-gateway -f`.

### Access (SSH tunnel — no web login)

The daemon binds to **loopback only** (`127.0.0.1:8717`), so it's not exposed on the WiFi. Reach it from your laptop over an SSH tunnel — SSH key auth *is* the access control:

```bash
ssh -L 8717:localhost:8717 pi@<pi-hostname>.local
# then open http://localhost:8717 in your browser
```

Closing the laptop / dropping the tunnel does **not** stop a running plot (the Pi streams autonomously); reconnect to monitor.

**Team access via 1Password:** put each member's SSH **public** key in the Pi's `~/.ssh/authorized_keys`; share the **private** keys through a 1Password shared vault for your group (enable the 1Password SSH agent). Prefer one key per person so you can revoke by removing their vault access + their `authorized_keys` line. (Off-site access later: SSH over Tailscale — deferred.)

> Position note: after a power cycle the daemon restores the last position so you needn't re-calibrate, but with no homing/limit switches this is approximate (~1 cm) and assumes the gantry didn't move while off. **Stop the plot before powering off** for the closest restore; **Set Work Zero** to re-calibrate if it drifted. Precise repeatability requires adding limit switches + homing.

## Behavior

- **Open-once:** the serial port is opened once for the daemon's life and never reopened on a client action. A genuine device drop triggers a debounced reconnect (the device re-enumerates).
- **Autonomous streaming:** `plot` sends a full G-code program; the daemon streams it to completion even if every client disconnects.
- **Single operator:** the first connected client holds control; others observe read-only until control is released (auto-released on disconnect).
