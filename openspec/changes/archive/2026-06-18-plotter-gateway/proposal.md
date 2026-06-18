## Why

Repeated `open()` of the WCH CH340 USB-serial port wedges its macOS driver (errno 22), which is the root cause of the whole connectivity saga — lost contact, "Failed to open serial port," and the forced USB replug between runs. The browser is structurally unable to avoid this: every Connect and every page reload reopens the port. The fix is the proven daemon pattern — **one long-running process owns the serial port and opens it exactly once** — which is also exactly the Raspberry Pi gateway the project is aiming for: powered on, auto-connected, awaiting plots.

## What Changes

- **A long-running gateway daemon (Node) owns the serial port.** It opens the port **once** and keeps it open across client connects/disconnects; it never reopens on a client action. This eliminates the CH340 reopen-wedge.
- **The streaming engine runs in the daemon, not the browser.** The existing framework-free `GrblController` runs under Node behind a new `NodeSerialTransport`, so a plot keeps streaming even if the browser/laptop disconnects — true unattended plotting.
- **The daemon exposes a WebSocket API.** Commands (connect/plot/pause/resume/stop/jog/set-zero/pen/settings) and events (status, streamProgress, log, connected/disconnected, alarm/error) flow over one socket. A single-operator model (one active controlling client) keeps the shared machine safe.
- **The browser GUI becomes a thin client.** A new `WebSocketTransport`-style client implements the same observation/command surface the UI already uses, so the React app changes minimally. **BREAKING:** the browser no longer uses Web Serial; it talks only to the daemon.
- **Auto-start + auto-connect.** A `systemd` unit starts the daemon on Raspberry Pi boot; the daemon connects to the plotter automatically and retries until the device is present, then sits awaiting plots. The same daemon runs on macOS for development (and fixes the reopen-wedge there too).

Out of scope (deferred): multi-operator queueing/scheduling, authentication/Tailscale hardening, remote G-code storage/library, and the SVG→toolpath conversion (stays in the browser; the daemon receives ready G-code or polylines).

## Capabilities

### New Capabilities
- `plotter-daemon`: A long-running host process that owns the serial link (opens once, retries the device, never reopens on client actions), runs the GRBL streaming engine autonomously, and auto-starts on boot.
- `gateway-protocol`: The WebSocket command/event contract between the daemon and clients, including the single-operator control model and the browser thin-client transport that speaks it.

### Modified Capabilities
- `device-connection`: Connecting to the plotter moves from in-browser Web Serial to the daemon. Clients connect to the daemon (which owns the one persistent serial connection) rather than opening the serial port themselves.

## Impact

- **New runtime:** a Node process (`gateway/` or similar) depending on `serialport` (Node) and a WebSocket server (`ws`). New `systemd` unit for the Pi.
- **New transports:** `NodeSerialTransport` (daemon side) and a WebSocket client transport (browser side), both implementing the existing `Transport`/controller seam. The engine in `src/grbl` is unchanged.
- **Browser:** drops `WebSerialTransport` usage; connects to the daemon over WebSocket. UI wiring adjusts to the client API; views/canvas unchanged.
- **Deployment:** dev = daemon on the Mac, GUI in the browser; prod = daemon + GUI served from the Pi, auto-started on power-up.
- **Hardware** needed to verify the open-once daemon survives many plots + client reconnects with no replug, and that boot auto-connect works on the Pi.
