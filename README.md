# PenPlotter271

A browser-based control app for a GRBL-style pen plotter (built for a **UUNA TEK 3.0**
with an A0 bed). Import an SVG or PNG, lay it out and scale it on the page, preview the
exact pen path the machine will draw, and stream the generated G-code to the plotter.

The machine is driven by a long-running **gateway daemon** that owns the serial port and
streams plots autonomously. The browser is a thin client that talks to the daemon over a
WebSocket — there is **no browser Web Serial path**. This design fixes the macOS CH340
reopen-wedge, lets a plot survive a browser or laptop disconnect, and is exactly what an
unattended **Raspberry Pi** setup needs.

> ⚠️ **Re-check work zero after any power-off — this machine has no limit switches.**
> The daemon tries to remember the work origin across power cycles, but a power-off/on
> (of the Pi, the plotter, or both) can leave the restored origin noticeably offset.
> **Before plotting after a power cycle, verify — and if needed re-set — work zero by
> jogging to the paper's top-left corner.** If the origin is wrong, nothing stops the
> machine and it **will drive the gantry into the frame.** When in doubt, jog slowly and
> keep a hand near the power switch (or cut the motors and move the gantry to the corner
> by hand).

## What it does

- **Import SVG or PNG/JPEG.** SVGs are flattened to polylines in the browser DOM
  (`getPointAtLength` / `getCTM`, no dependencies). Raster images are traced with
  marching-squares iso-contours — adjust a darkness threshold and the number of
  brightness levels (1 = outline only, more = tonal layers). Fill-heavy SVGs plot best
  if you import them as PNG.
- **Lay out on a paper canvas (Konva).** Place, scale, and rotate (including 90° steps)
  one or more artworks on a sheet anchored at the bed's top-left corner. "Fit to corner"
  and "fit to paper" helpers, paper presets A4–A0 (plus an A0 SBP variant) or a custom
  size, in landscape or portrait.
- **WYSIWYG preview.** The canvas renders the actual flattened pen path, plus a **live
  pen marker** that tracks the machine's reported work position while it draws.
- **Detail slider.** Thins strokes live for both the preview and the plot — fewer strokes
  draw faster — without re-importing the artwork.
- **Plot-time estimate.** The G-code is costed against the calibrated feed rates and pen
  dwell to show an estimated duration before you start.
- **Streaming with live feedback.** Progress bar, live machine state and position,
  pause/resume, and stop-and-return-home. A stall watchdog and a dead-link watchdog abort
  a plot that hangs, and a diagnostic log panel keeps the last events.
- **Manual control.** Jog, pen up/down, set work zero, go to work zero, motors off, view
  the raw `$$` settings, a live feed-rate override, and per-axis calibration (pen Z,
  dwell, feed rates).
- **Session persistence.** Your artwork and page layout are stored on the daemon, so any
  device that connects gets the current drawing back. Calibration is stored per browser.

## How it works

```
Browser (React + Konva)                Gateway daemon (Node + tsx)            Plotter
┌───────────────────────┐  WebSocket   ┌──────────────────────────┐  serial  ┌────────┐
│ import → layout →      │ ───────────▶ │ GrblController over       │ ───────▶ │ GRBL   │
│ preview → "plot"       │   :8717      │ NodeSerialTransport       │  USB     │ board  │
│ (thin client)          │ ◀─────────── │ owns the port, streams,   │ ◀─────── │        │
└───────────────────────┘  status/log  │ serves the built GUI      │          └────────┘
                                        └──────────────────────────┘
```

1. The browser turns an SVG/PNG into polylines, lets you place them on the page, and
   generates a full G-code program for the layout.
2. It sends that program to the daemon as a single `plot` command over the WebSocket.
3. The daemon streams the G-code to the GRBL board to completion — **even if every client
   disconnects** — and forwards machine status, progress, and errors back to any
   connected clients.
4. The first client to connect holds control; others observe read-only until control is
   released (released automatically on disconnect).

The G-code generator bakes in this specific machine's setup:

- **Inverted Z (pen lift):** `Z+` moves the pen **down**. Pen-down Z is positive
  (default `3`), pen-up is `0`.
- **No homing / no limit switches** (`$22=0`). The operator manually sets work zero at
  the paper corner each session; there is no `$H`.
- **Origin = paper's top-left corner.** SVG→G-code uses an identity mapping (no Y flip):
  machine `+Y` runs physically *down* the page, matching the artwork's Y-down axis. The
  drawing fills the `+X`/`+Y` quadrant.
- After a power cycle the daemon restores the last saved position so you needn't
  re-calibrate, but without homing this is approximate (~1 cm). Stop the plot before
  powering off for the closest restore, and re-run **Set Work Zero** if it drifts.

## Architecture

The GRBL engine depends only on a `Transport` interface — never on Web Serial, the DOM,
or React — so the exact same engine runs on the Pi behind a Node serial adapter,
unchanged.

```
src/grbl/       Portable GRBL protocol engine: streaming, status, alarms (no UI deps)
src/transport/  The seam — Transport interface + the browser's WebSocket client
src/gateway/    Shared WebSocket protocol (commands, snapshot, forwarded events)
src/plot/       Pure pipeline: SVG/PNG → polylines → placement → G-code
src/ui/         React app (the only DOM-aware layer)
gateway/        Raspberry Pi / dev daemon: owns the port, streams autonomously, serves the GUI
openspec/       Design docs and the full change history for each feature
3D_print/       Printable paper-holder parts (STL)
```

## Quick start (local / macOS dev)

```bash
npm install        # installs deps and builds the native serialport binding
npm run build      # typecheck + build the GUI into dist/ (the daemon serves it)
npm run gateway    # opens the port once, serves GUI + WebSocket on http://localhost:8717
```

Then open **http://localhost:8717** and click **Connect**.

For UI work you can also run the Vite dev server — it connects to the same daemon over the
WebSocket, so the gateway still needs to be running for live hardware:

```bash
npm run dev        # Vite dev server on http://localhost:5173
```

On macOS the daemon automatically runs `caffeinate -dimsu` for its lifetime so idle sleep
/ App Nap can't stall a running plot — `npm run gateway` is enough.

### Daemon configuration (env vars)

| Variable | Default | Purpose |
| --- | --- | --- |
| `GATEWAY_PORT` | `8717` | HTTP + WebSocket port |
| `GATEWAY_HOST` | `127.0.0.1` | Bind address. The daemon has **no built-in auth** — `0.0.0.0` exposes unauthenticated control to the whole LAN. Keep it on loopback and reach it via an SSH tunnel, a VPN (e.g. Tailscale), or a reverse proxy with its own authentication |
| `PLOTTER_PATH` | _(auto)_ | Pin the serial device; otherwise auto-detect a `usbserial`/`wchusbserial`/`ttyUSB`/`ttyACM` port |
| `PLOTTER_STATE` | `gateway/.plotter-state.json` | Where the remembered position is persisted |

## Raspberry Pi deployment

The Pi runs the same daemon as a boot service so the plotter is reachable whenever the Pi
is powered on. `gateway/install.sh` is a one-command, idempotent installer that sets up
Node, native build tools, dependencies, the GUI build, serial access (a `dialout` group
membership + a udev rule for a stable device path), an always-on power profile, mDNS, and
the `plotter-gateway` systemd service:

```bash
# on the Pi, from the repo root
bash gateway/install.sh
```

The daemon binds to loopback (`127.0.0.1`) and has no built-in authentication, so you
reach it over an SSH tunnel — SSH keys are the access control:

```bash
ssh -L 8717:localhost:8717 penplotter@penplotter.local
# then open http://localhost:8717
```

To reach it from a phone or another machine, prefer a VPN (e.g. Tailscale) or a reverse
proxy that adds its own authentication. Only set `GATEWAY_HOST=0.0.0.0` on a fully trusted
LAN — it exposes unauthenticated control of the machine to anyone on the network.

Closing the laptop or dropping the tunnel does **not** stop a running plot — the Pi
streams autonomously; reconnect to monitor. See [`gateway/README.md`](gateway/README.md)
for the full daemon behavior and access notes.

### Deploying updates from the laptop (rsync — the Pi is not on git)

The Pi has **no git checkout**; code is pushed to it from the laptop with `rsync` over
SSH and then rebuilt and restarted there. Run this from anywhere on the laptop — the
source is given as an **absolute path** (with a trailing `/`, meaning "the contents of
this folder") so it can't accidentally sync the wrong directory:

```bash
# 1. push the source (skip node_modules, the build output, and .git)
#    Source is the absolute repo path — do NOT use "./" (if you're in the wrong
#    directory, "./" + --delete will push junk and wipe the repo on the Pi).
rsync -av --delete \
  --exclude node_modules --exclude dist --exclude .git \
  --exclude 'gateway/.plotter-state.json' \
  /absolute/path/to/PenPlotter271/ \
  penplotter@penplotter.local:~/PenPlotter271/

# 2. rebuild on the Pi and restart the daemon
ssh penplotter@penplotter.local '
  cd ~/PenPlotter271 &&
  npm install &&            # only needed when dependencies changed
  npm run build &&          # typecheck + rebuild the served GUI
  sudo systemctl restart plotter-gateway'
```

> ⚠️ Restarting the daemon **aborts a running plot**. Don't deploy mid-plot — wait until
> the machine is idle.

Follow the daemon afterwards with `journalctl -u plotter-gateway -f`.

(`deploy.sh` in the repo is a `git pull` + build + restart helper for a *git-connected*
Pi, including a guard against deploying mid-plot. It is not used by this rsync workflow.)

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (UI work) |
| `npm run build` | Typecheck + build the GUI into `dist/` |
| `npm run gateway` | Run the plotter gateway daemon |
| `npm run gateway:smoke` | Hardware smoke test (moves the machine — set work zero first) |
| `npm test` | Run the unit test suite (Vitest) |
| `npm run typecheck` | Type-check the browser sources |
| `npm run typecheck:node` | Type-check the gateway sources |
| `npm run format` | Format with Prettier |

## Testing

```bash
npm test
```

Unit tests cover the pure, testable core — GRBL line parsing and streaming, SVG/PNG
flattening and iso-contour tracing, placement and fit math, the detail thinner, and
G-code generation (including the plot-time estimate).

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Konva (canvas) · `serialport` + `ws` + `tsx`
(gateway) · Vitest

## Hardware

`3D_print/` contains printable STL parts for a paper holder. Design docs and the full
change history for each feature live under `openspec/`.

## License

MIT © Diederik Siderius — see [`LICENSE`](LICENSE).
