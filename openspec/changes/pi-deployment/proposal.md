## Why

The gateway works on the Mac, but the goal is a dedicated, always-on Raspberry Pi connected to the plotter: from a laptop on the same WiFi, open the Pi's web app in a browser, upload a drawing, plot it — and if the laptop leaves, the plot keeps running. Everything (daemon, GUI, remembered position) lives on the Pi; the laptop is just a remote control.

The application architecture already supports this — the daemon serves the GUI **and** the WebSocket on one port, the browser auto-targets the host that served it (`ws://<host>:8717`), conversion happens in the browser, and the daemon streams autonomously so a plot survives client disconnect. So this change is about **deploying and provisioning the Pi**, making it reliably reachable over WiFi, and verifying the end-to-end flow on real hardware — not re-architecting the app.

## What Changes

- **Repeatable Pi provisioning:** a documented/scripted setup (Node LTS + `npm install` incl. the native `serialport` build + `npm run build` for the GUI), so a fresh Pi reaches a running gateway with known steps.
- **Boot service:** finalize the `systemd` unit so the daemon **auto-starts on power-up**, auto-connects to the plotter (retrying until present), recovers on crash (`Restart=always`), and logs to the journal.
- **Stable serial access:** a `udev` rule granting the service user access to the plotter's `tty` (and an optional stable symlink), so the daemon finds the device without `sudo` and regardless of enumeration order.
- **Always-on host:** disable OS sleep and WiFi power-management on the Pi so an idle session never stalls a plot (the macOS `caffeinate` equivalent).
- **Access control via SSH (no web login):** the daemon binds to **loopback** (`127.0.0.1:8717`) by default, so it is not reachable directly over WiFi. Operators reach it through an **SSH local port-forward** (`ssh -L 8717:localhost:8717 <user>@<pi>`) and open `localhost:8717`. SSH key auth is the access control — no custom auth code, and the browser's socket already targets `localhost:8717` so it works through the tunnel. A `HOST` env can switch to LAN-wide binding if open access is ever wanted.
- **Team access via 1Password:** the team's SSH **public** keys live in the Pi's `authorized_keys`; the **private** key(s) are shared through a **1Password shared vault** for the 1Password **group** (1Password SSH agent), so membership is managed/revoked centrally. This composes with Tailscale later for off-site access.
- **Headless robustness:** make the persisted state-file path configurable (env) and confirm the daemon runs with no display/keyboard attached.

Out of scope (deferred): Tailscale/remote-internet access; in-app accounts/login (SSH provides access control instead); the Pi acting as its own WiFi access point (assumes the Pi joins the existing WiFi); multi-operator queueing. mDNS (`<host>.local`) is still used so the SSH target/host is stable without knowing the IP.

## Capabilities

### New Capabilities
- `pi-deployment`: Running the gateway as an always-on, headless service on a Raspberry Pi — boot auto-start, stable serial device access, OS always-on, a WiFi-reachable web app, and repeatable provisioning.

### Modified Capabilities
<!-- None. Reuses plotter-daemon and gateway-protocol unchanged; the browser already
     targets the serving host, so laptop-over-WiFi access needs no code change. -->

## Impact

- **New files:** a provisioning script (e.g. `gateway/install.sh`), a `udev` rule (e.g. `gateway/99-plotter.rules`), and refinements to `gateway/plotter-gateway.service` + `gateway/README.md` (incl. SSH-tunnel + 1Password key-sharing docs).
- **Small code tweaks:** bind to a configurable `HOST` (default `127.0.0.1` for SSH-only access); make the state-file path configurable via env (defaults unchanged).
- **No in-app auth code and no protocol changes** — access is enforced by SSH; the GUI served via the tunnel connects its WebSocket to `localhost` automatically.
- **Hardware:** a Raspberry Pi (on the WiFi), the plotter on USB, and verification of boot auto-connect, laptop-over-WiFi access, upload→plot, and leave→continue.
- **Dependencies:** Node LTS + the existing `serialport`/`ws`/`tsx`; the `serialport` native binding must build on the Pi (ARM).
