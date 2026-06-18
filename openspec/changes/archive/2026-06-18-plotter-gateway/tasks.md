## 1. Daemon foundation + NodeSerialTransport

- [x] 1.1 Add a `gateway/` Node entry point and its deps (`serialport`, `ws`, `tsx`); share the existing `src/grbl` engine (no engine changes)
- [x] 1.2 Implement `NodeSerialTransport` against the existing `Transport` interface (`open`/`close`/`write`/`onData`/`onClose`) using Node `serialport`
- [x] 1.3 Open the port exactly ONCE on daemon start (or first device-available); never reopen on client actions
- [x] 1.4 Device retry: connect on a debounced schedule when the device is absent/dropped, reporting connected/disconnected state (no tight reopen loop)
- [ ] 1.5 ⚙ HARDWARE: run `npm run gateway:smoke` on the machine — connect + jog + pen up/down + a tiny plot; confirm open-once (no reopen) across the run. (Daemon already connected to the real plotter: `GRBL 3.0`; smoke moves the machine so it's a deliberate hardware run.)

## 2. Engine hosted in the daemon (autonomous streaming)

- [x] 2.1 Instantiate `GrblController` + `NodeSerialTransport` in the daemon; run connect handshake, status polling, settings (verified: daemon connected, banner received)
- [x] 2.2 Accept a full G-code program and stream it autonomously (char-counting) to completion independent of any client
- [x] 2.3 Map pause/resume/stop/jog/pen/zero/motors-off/unlock/setting/calibration onto controller methods in the daemon
- [x] 2.4 Maintain a current snapshot (connection, latest status, settings, stream progress) for late-joining clients

## 3. Gateway WebSocket protocol

- [x] 3.1 WebSocket server: accept clients, send a state snapshot on attach
- [x] 3.2 Command channel: JSON `cmd` messages → controller operations; reject unknown/malformed without affecting the connection or a running plot
- [x] 3.3 Event channel: forward controller events (connected/disconnected, status, streamProgress, streamComplete/Aborted, error, alarm, settings, log) with names identical to the controller's events
- [x] 3.4 Single-operator control: first client holds control; others are read-only; control auto-releases on disconnect

## 4. Browser thin client (drop Web Serial)

- [x] 4.1 Implement `GatewayClient` exposing the same `on(event)` + command surface the UI uses, speaking the WebSocket protocol
- [x] 4.2 Swap `App.tsx` from `new GrblController(new WebSerialTransport())` to `new GatewayClient()`; views/canvas unchanged
- [x] 4.3 Generate G-code from the current placement client-side and send it via the `plot` command (conversion stays in the browser)
- [x] 4.4 Reflect control/connection state in the client (in-control vs read-only via the `control` event)
- [x] 4.5 `npm run build` clean; unit tests green (37); removed `WebSerialTransport` and the browser Web Serial reconnect effect
- [x] 4.6 Edge-case resilience: round-trip command acks (`id`→`ack`) so the press-and-hold jog loop paces on the daemon and stops on release (fixes "jog keeps going"); pending commands reject on socket close (breaks the held loop); Disconnect acts as Pause and auto-resumes the held plot on reconnect (via `paused` in the snapshot), while an unintentional drop keeps plotting; held-jog/plotting state reset on disconnect

## 5. Deployment + auto-start

- [x] 5.1 macOS dev: `npm run gateway` runs the daemon and serves the GUI; `GatewayClient` points at `ws://<host>:8717` (works from :8717 or vite :5173)
- [x] 5.2 Pi: daemon serves the built GUI statically (from `dist/`) alongside the WebSocket on one port
- [x] 5.3 `systemd` unit (`gateway/plotter-gateway.service`, `Restart=always`) to auto-start on boot, auto-connect, await plots
- [x] 5.4 Docs (`gateway/README.md`): macOS dev + Pi setup, env config, single-operator behavior
- [x] 5.5 macOS idle-sleep fix: the daemon auto-runs `caffeinate -dimsu -w <pid>` so leaving the laptop idle no longer throttles/suspends the daemon (App Nap) or dims the display (which throttled the browser) and stalls the plot. No-op on Linux/Pi (disable OS sleep there)

## 6. Verification

- [ ] 6.1 ⚙ HARDWARE (macOS): run many plots with repeated Connect/Disconnect + page reloads — confirm NO "Failed to open" and NO USB replug needed
- [ ] 6.2 ⚙ HARDWARE: start a plot, close the browser/laptop, confirm the daemon finishes the plot; reconnect and see accurate live state
- [ ] 6.3 ⚙ HARDWARE (Pi): power-cycle the Pi + plotter — confirm the daemon auto-starts, auto-connects, and a plot runs end-to-end
