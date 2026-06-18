## Context

The gateway (`gateway/server.ts` + `NodeSerialTransport`) already runs the framework-free `GrblController`, serves the built GUI from `dist/` and a WebSocket on one port (default 8717), persists position to `gateway/.plotter-state.json`, and self-caffeinates on macOS. A `systemd` unit and Pi notes exist in `gateway/`. What's missing is the actual, reliable Pi host setup: provisioning, stable device access, always-on, and WiFi reachability — plus on-hardware verification.

Key architectural facts that make this a deployment (not a rewrite):
- The browser `GatewayClient` connects to `ws://${location.hostname}:8717` — so loading the app from `penplotter.local:8717` auto-targets the Pi. No code change for laptop-over-WiFi.
- The daemon streams autonomously → leave-and-continue already works.
- G-code conversion is client-side; "upload a drawing" is just using the web app served by the Pi.

## Goals / Non-Goals

**Goals:**
- A fresh Pi → running gateway via repeatable, documented steps.
- Power on the Pi + plotter → daemon auto-starts, auto-connects, awaits plots.
- From a laptop on the same WiFi: open the Pi web app, upload, plot; close the laptop → plot continues.
- Reliable serial access (no `sudo`, stable across reboots/enumeration).
- Host never idles/sleeps and stalls a plot.

**Non-Goals:**
- Tailscale / internet-remote access, accounts/RBAC (single-operator lock already exists).
- Pi-as-access-point (assume it joins the existing WiFi).
- Changing the daemon/protocol/GUI architecture.

## Decisions

- **Run via `tsx`, no build step for the daemon** (matches current `npm run gateway`). The GUI is the only build (`npm run build` → `dist/`, served by the daemon). Rationale: fewer moving parts; the engine/daemon are TS run directly. Alternative (precompile to JS) rejected as unnecessary complexity for a single-host service.
- **`systemd` service owns lifecycle**: `Restart=always`, `After=network-online.target`, `WorkingDirectory` = repo, `User` = the pi user (in the `dialout` group for serial). Logs to journald. Rationale: standard, survives crashes and reboots = boot auto-connect.
- **Stable serial access via `udev` + group**: add the service user to `dialout` (or a `udev` rule granting access) and optionally a stable `SYMLINK` (e.g. `/dev/plotter`) keyed on the CH340 vendor/product, set `PLOTTER_PATH=/dev/plotter`. Rationale: avoids `sudo`, avoids `ttyUSB0` vs `ttyUSB1` ambiguity. The transport already accepts a fixed `path` or auto-detects.
- **Always-on**: disable OS auto-sleep and WiFi power-save (`iw`/`nmcli` or `/etc/rc.local`/systemd) on the Pi. Rationale: the Linux equivalent of the macOS `caffeinate` fix; idle must not throttle the daemon or the link. The macOS self-caffeinate stays a no-op on Linux.
- **Access control = SSH (not a web login)**: the daemon binds to `127.0.0.1` (configurable via `HOST`), so it is unreachable directly over WiFi. Operators open an SSH local port-forward (`ssh -L 8717:localhost:8717 <user>@<pi>`) and browse `localhost:8717`. SSH key auth gates access; the GUI's socket already targets `localhost:8717` so it works unchanged through the tunnel. Rationale: strong auth with zero in-app auth code; central team management/revocation; nothing plottable exposed on the LAN. Alternative (shared web password) rejected — weaker and adds code. Trade-off: one extra step (open the tunnel) vs typing a URL; unattended plotting is unaffected (the plot runs on the Pi regardless of the tunnel).
- **Team key distribution via 1Password**: team SSH public keys go in the Pi's `authorized_keys`; private keys live in a 1Password shared vault for the group (1Password SSH agent serves them). Prefer per-user keys for clean revocation. Composes with Tailscale later (SSH over the tailnet) for off-site access.
- **mDNS hostname** (Avahi): gives a stable SSH/host target (`<host>.local`) without knowing the IP.
- **Configurable state path**: read `PLOTTER_STATE` env (default the current location) so the persisted position lives in a known/writable spot under the service user. Small, low-risk tweak.
- **Provisioning script** `gateway/install.sh`: idempotent — install Node (if absent), `npm install`, `npm run build`, install the udev rule + service, enable sleep-off, set up SSH/`authorized_keys`, `systemctl enable --now`. Rationale: repeatable, documents the exact steps.

## Risks / Trade-offs

- **`serialport` native build on ARM** may need build tools → mitigate: `install.sh` ensures `build-essential`/`python3`; document the prebuilt-binary fallback.
- **CH340 on Linux** is far less reopen-fragile than macOS, but a genuine USB/EMI drop still needs the daemon's debounced reconnect (already implemented) → verify on hardware.
- **Position-restore assumes the gantry didn't move while powered off** (no homing) → same caveat as today; operator re-runs Set Work Zero if it did. Document prominently.
- **No auth by default** → on a trusted home WiFi this is acceptable; the optional password gate and the single-operator lock mitigate; full auth deferred.
- **mDNS may be flaky on some networks** → fallback: use the Pi's IP (document how to find it).

## Migration Plan

1. Flash/prepare Pi OS (Lite, headless), join WiFi, enable SSH — documented prerequisites.
2. Clone the repo, run `gateway/install.sh` → Node, deps, GUI build, udev rule, service, sleep-off.
3. Power-cycle the Pi + plotter → confirm the service auto-starts and auto-connects.
4. From the laptop browser: open `penplotter.local:8717`, set/confirm work zero (or rely on restored position), upload a drawing, plot.
5. Close the laptop mid-plot → confirm it continues; reopen → confirm live state resyncs.
- **Rollback:** run the daemon on the Mac as before; the Pi setup is additive.

## Open Questions

- Per-user SSH keys (better revocation) vs one shared "plotter" key in the 1Password vault — likely per-user; confirm with the team's 1Password setup.
- Preferred hostname (`penplotter.local`?) and the Pi service user/group name.
