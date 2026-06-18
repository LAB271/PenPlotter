## Context

The GRBL engine (`src/grbl`) was deliberately written framework-free — it depends only on the `Transport` interface (`open/close/write/onData/onClose`), never on the DOM or Web Serial — specifically so it can run under Node on a Raspberry Pi. Today it runs in the browser behind `WebSerialTransport`. That places the serial `open()` inside the browser, and the CH340 macOS driver wedges (errno 22) when the port is reopened — which the browser does on every Connect and every page reload.

This change relocates serial ownership and the streaming loop into a long-running Node daemon, and turns the browser into a thin remote client over WebSocket. It is the concrete form of the `plotter-gateway` end goal: a Pi that powers on, connects to the plotter automatically, and waits for plots.

## Goals / Non-Goals

**Goals:**
- Open the serial port exactly once per daemon lifetime; never reopen on a client action → no CH340 reopen-wedge, no replug.
- Run the streaming engine in the daemon so plots survive browser/laptop disconnect.
- Keep the React UI nearly unchanged by reusing the existing controller observation/command surface behind a WebSocket client.
- Auto-start on Pi boot and auto-connect to the device (retry until present).
- Run identically on macOS for development.

**Non-Goals:**
- Multi-operator queueing/scheduling (single active controller for now).
- Auth / Tailscale hardening, G-code library/storage, account management.
- Changing the SVG/PNG→toolpath conversion — it stays in the browser; the daemon receives ready-to-plot G-code (or polylines + pen options) and the placement is resolved client-side.
- Modifying `src/grbl` engine logic.

## Decisions

- **Daemon owns the engine, not just the bytes.** The daemon runs `GrblController` + `NodeSerialTransport`. Rationale: a byte-relay daemon would still leave char-counting/streaming in the browser, so a browser disconnect would abort a plot. Running the engine in the daemon gives unattended plotting. Alternative (raw byte relay) rejected for that reason.
- **`NodeSerialTransport` implements the existing `Transport` interface** using the Node `serialport` package. It opens once on daemon start (or first device-available), and on an unexpected device drop it does NOT auto-reopen in a tight loop from a client action; reconnection is a deliberate, debounced retry owned by the daemon. The engine is unchanged.
- **WebSocket JSON protocol.** Client→daemon: `{type:'cmd', cmd, args}` mapping 1:1 to controller methods (`plot`, `pause`, `resume`, `stop`, `jog`, `jogCancel`, `penUp/penDown`, `setWorkZero`, `goToWorkZero`, `motorsOff`, `unlock`, `setSetting`). Daemon→client: `{type:'event', event, payload}` forwarding the controller's existing events (`connected`, `disconnected`, `status`, `streamProgress`, `streamComplete`, `streamAborted`, `error`, `alarm`, `settings`, `log`) plus an initial `snapshot` (current status/settings/connected/streamDebug) on attach. Rationale: the event/command names already exist on the controller, so the browser client is a thin adapter and the UI barely changes.
- **`plot` sends G-code, not a live byte stream.** The client generates G-code from the current placement (existing `generateGcode`) and sends the whole program in one `plot` command; the daemon streams it autonomously. Rationale: keeps conversion/placement in the browser (where the canvas lives) while the daemon owns execution.
- **Single-operator model.** The daemon accepts multiple WebSocket viewers but grants control to one client at a time (first-attach holds control; others are read-only until released/disconnected). Rationale: a shared machine must not take commands from two operators; matches the team/Tailscale goal without building full auth yet.
- **Browser client mirrors the controller surface.** A `GatewayClient` exposes the same `on(event)` + command methods the UI already calls, so `App.tsx` swaps `new GrblController(new WebSerialTransport())` for `new GatewayClient(wsUrl)` with minimal churn.
- **Auto-start via `systemd`** on the Pi (`plotter-gateway.service`, `Restart=always`), serving the built GUI statically alongside the WebSocket. On macOS, a plain `npm run gateway` for dev.

## Risks / Trade-offs

- **A truly physical USB drop (EMI/power) still can't be opened from software until the device re-enumerates** → the daemon detects the drop, retries on a debounced schedule, and reports state; on the Pi the Linux CH340 stack is far less reopen-fragile than macOS, so this should be rare.
- **Engine-in-daemon means a daemon crash mid-plot loses the run** → `systemd Restart=always` plus the existing dead-link/abort handling; a future resume-from-line is possible but out of scope.
- **Protocol drift between controller events and the client adapter** → keep the WebSocket event names identical to the controller's event names so the mapping is mechanical and hard to desync.
- **Single-operator lockout confusion** (a stale viewer holding control) → control auto-releases on socket close and is reflected in the snapshot/UI.
- **Two transports to maintain** (`NodeSerialTransport`, browser `GatewayClient`) → both are thin and sit on the already-stable engine/`Transport` seam.

## Migration Plan

1. Build the daemon and `NodeSerialTransport`; verify it drives the real plotter from Node (CLI smoke test) with open-once behavior.
2. Add the WebSocket layer + `GatewayClient`; run the daemon on macOS and point the existing GUI at it.
3. Swap the browser from `WebSerialTransport`/direct `GrblController` to `GatewayClient`; verify feature parity (jog, zero, plot, pause/stop, live marker, progress, log).
4. Package for the Pi: build GUI, `systemd` unit, boot auto-connect.
- **Rollback:** the archived `svg-plotting` browser build (Web Serial) remains usable as a fallback during bring-up.

## Open Questions

- Exact control-handoff UX when a second client connects (read-only banner vs request-control) — default to first-holds-control, refine after use.
- Whether the daemon should persist the last work-zero/settings across restarts (helps unattended recovery) — likely yes, decide during implementation.
