## 1. Headless robustness (small code tweaks)

- [x] 1.9 Idle-disconnect hardening (plotter dropped after ~60 min away): disable USB autosuspend for the CH340 (udev `SUBSYSTEM=="usb" … ATTR{power/control}="on"` — classic Linux/Pi cause of an idle serial link powering down) + add a 30 s WebSocket ping/pong keepalive in the daemon (keeps the browser↔Pi link alive through router/WiFi idle timeouts and reaps dead clients). Combined with 1.8's bounded auto-reconnect, a drop now self-heals.
- [x] 1.8 Auto-reconnect could hang (seen on Pi: plotter `disconnected` mid-session, never recovered, no retry logs). After a USB drop the reopened port can be half-alive so the `$$` handshake never gets `ok` and `ctrl.connect()` hangs forever, wedging the retry loop. Fixed: time-box `connect()` (12 s `withTimeout`) and `disconnect()` to close the half-open port before retrying — so it keeps retrying until the real device responds.
- [x] 1.7 Daemon-side artwork storage: the editable session (artwork + placement + page) is now stored ON the daemon (`gateway/.session.json`) via a `saveSession` command + carried in the snapshot, so reconnecting from ANY device restores the current drawing. Browser pushes on change (gated by `sessionLoadedRef` so a stale local copy can't clobber a newer one); localStorage kept as the offline/instant fallback. `src/ui/sessionStore.ts` shape reused as the blob.
- [x] 1.6 Artwork persistence (found on the Pi: reopening the UI / reloading after a reconnect showed an empty canvas — the imported drawing is browser state, not on the daemon). Persist items + placement + page to `localStorage` (`src/ui/sessionStore.ts`) and restore on load, so reopening the tab keeps the drawing and you can re-plot. Per-browser; very large artworks may exceed quota (skipped gracefully). Cross-device "on the Pi" persistence would need daemon-side storage (future).
- [x] 1.1 State-file path configurable via `PLOTTER_STATE` env (default unchanged); set in the systemd unit
- [x] 1.2 Daemon is headless (no DOM/display used) and `caffeinate` self-spawn is guarded by `process.platform === 'darwin'` → no-op on Linux/Pi (verified by inspection; full headless run is task 4.x)
- [x] 1.5 Restore accuracy: the saved home was "quite off" after a mid-plot power-off because the position was only persisted every 2 s (up to ~2 s of motion stale → big offset when restored). Now persist on every changed status (~5 Hz, deduped + serialized via a `writing` guard) and flush synchronously the instant the plotter link drops, so the saved position closely matches the gantry's real position at power-off. (Residual error ≤ one poll interval; stop/idle before power-off for an exact restore.)
- [x] 1.4 Dev-loop fix: the daemon's ~2 s state-file writes were hot-reloading the Vite dev UI (drop/reconnect loop). Vite now ignores `**/.plotter-state.json` (`server.watch.ignored`); the daemon only persists when the position actually changes; file gitignored. (Non-issue in production — the Pi serves the built GUI with no HMR.)
- [x] 1.3 Connect resilience for power-cycle restore (found while testing power-off mid-plot): `$20` is READ-ONLY on FluidNC (error:162), and the restore put the work area at negative machine coords → `ALARM:2 Soft Limit` blocked the plot. Now on connect the daemon disables soft limits PER-AXIS via FluidNC named config (`$axes/{x,y,z}/soft_limits=false`, via new `GrblController.sendRaw`), clears the alarm (`$X`), then restores X/Y (Z forced to 0 so "pen up" isn't a negative Z). Restore failure is logged, not swallowed. Fallback if the runtime command doesn't stick: set `soft_limits: false` in the FluidNC `config.yaml`

## 2. Service + device + always-on (config/scripts)

- [x] 2.1 Daemon binds a configurable `HOST` (default `127.0.0.1`, SSH-only); `httpServer.listen(PORT, HOST, …)`, `GATEWAY_HOST=0.0.0.0` to expose
- [x] 2.2 Finalized `gateway/plotter-gateway.service`: `After/Wants=network-online.target`, `SupplementaryGroups=dialout`, journald, `Restart=always`, env `GATEWAY_PORT`/`GATEWAY_HOST`/`PLOTTER_PATH=/dev/plotter`/`PLOTTER_STATE`
- [x] 2.3 `gateway/99-plotter.rules`: `SYMLINK=plotter` + `GROUP=dialout MODE=0660` keyed on CH340 (1a86:7523); unit uses `PLOTTER_PATH=/dev/plotter`
- [x] 2.4 Idle-sleep masked + WiFi power-save off — applied by `install.sh` (systemd mask sleep targets, `nmcli`/`iw` powersave off)
- [x] 2.5 Avahi installed by `install.sh` for `<host>.local`; README documents the IP fallback

## 3. Access (SSH + 1Password) + provisioning

- [x] 3.5 Easy + safe LAN access (user chose browser-password over SSH tunnel): optional shared-password login — daemon reads `GATEWAY_PASSWORD`, gates the WebSocket via `?token=` (rejects with close 4001 → `authError`); browser shows a `LoginOverlay`, stores the token, and the GatewayClient appends it. UI **auto-connects on load** (no Connect click). `install.sh` now prompts for a password and, when set, binds `GATEWAY_HOST=0.0.0.0` (LAN). Caveat: plain ws on the LAN (token in cleartext) — fine for a trusted WiFi; SSH tunnel / Tailscale for stronger.

- [x] 3.1 SSH-tunnel access documented in README (`ssh -L 8717:localhost:8717 …`); daemon loopback bind enforces it. (`sshd`/key-only is a Pi-OS prereq, noted.)
- [x] 3.2 README documents sharing SSH keys via a 1Password shared vault/group (SSH agent), per-user keys for revocation
- [x] 3.3 `gateway/install.sh` written (idempotent): Node LTS + build tools, `npm install` (ARM native build), `npm run build`, udev rule, dialout, sleep-off, Avahi, install + enable the service
- [x] 3.4 `gateway/README.md` updated: prerequisites, one-command install, SSH-tunnel + 1Password access, position-restore caveat

## 4. Verification (on the Pi)

- [x] 4.1 ⚙ HARDWARE: run `gateway/install.sh` on a fresh Pi; confirm the service is enabled and serving the web app
- [x] 4.2 ⚙ HARDWARE: power-cycle the Pi + plotter; confirm the daemon auto-starts and auto-connects with no manual steps
- [x] 4.3 ⚙ HARDWARE: from a laptop on the same WiFi, reach the app, set/confirm work zero, upload a drawing, and plot; confirm it is NOT reachable without authorization. (Verified via the chosen shared-password + LAN-bind path from task 3.5, rather than the originally-planned SSH tunnel.)
- [x] 4.4 ⚙ HARDWARE: close the laptop / leave WiFi mid-plot → confirm the Pi finishes the plot; reconnect → confirm live state resyncs
- [x] 4.5 ⚙ HARDWARE: reboot the Pi → confirm the remembered position is restored and stable serial access works without sudo. (Position restore hardened post-proposal: see the `plotter-daemon` "Remembered work origin across power cycles" requirement; fixed clobber-on-reconnect, non-atomic writes, and stale-WCO corruption.)
