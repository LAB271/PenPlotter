# PenPlotter271

A control app for a GRBL-style pen plotter (built for a **UUNA TEK 3.0**, A0 bed).
Import an SVG or PNG, place and scale it on the page, preview the exact pen path, and
stream the generated G-code to the machine.

A long-running **gateway daemon** owns the serial port and streams plots autonomously;
the browser is a thin client that connects over a WebSocket. This is the only way to
plot — there is no browser Web Serial path — because it fixes the macOS CH340
reopen-wedge and lets a plot survive a browser or laptop disconnect, which is also
exactly what unattended **Raspberry Pi** plotting needs.

## Features

- **Import SVG or PNG/JPEG.** SVGs are flattened to polylines using the browser DOM
  (`getPointAtLength`/`getCTM`, zero deps). Raster images are traced with
  marching-squares iso-contours — adjust a darkness threshold and the number of
  brightness levels (1 = outline, more = tonal shading). Fill-based SVGs are best
  imported as PNG.
- **Layout on a canvas (Konva).** Place, scale, and rotate (incl. 90° steps) multiple
  artworks on a paper sheet anchored at the bed's top-left corner. "Fit to paper" and
  "fit to corner" helpers. Paper presets A4–A0 (plus an SBP A0 variant) or a custom
  size, in landscape or portrait.
- **WYSIWYG preview.** The canvas renders the flattened pen path that will actually be
  drawn, plus a **live pen marker** tracking the machine's reported work position.
- **Detail slider.** Thins strokes live for both preview and plot — fewer strokes plot
  faster — without re-importing.
- **Streaming with live feedback.** Progress bar, live machine state and position,
  pause/resume, and stop-and-return-home. A stall watchdog and dead-link watchdog abort
  a plot that hangs, and a diagnostic log panel captures the last events.
- **Manual control.** Jog, pen up/down, set work zero, go to work zero, motors off,
  view `$$` settings, and per-axis calibration (pen Z, dwell, feed rates).
- **Session persistence.** Your artwork and page layout are saved on the daemon, so any
  device that connects gets the current drawing back; calibration is stored per-browser.

## Architecture

The GRBL engine depends only on a `Transport` interface — never on Web Serial, the DOM,
or React — so the exact same engine runs in the browser-facing daemon and on a Raspberry
Pi behind a Node serial adapter, unchanged.

```
src/grbl/       Portable GRBL protocol engine: streaming, status, alarms (no UI deps)
src/transport/  The seam — Transport interface + the browser's WebSocket client
src/gateway/    Shared WebSocket protocol (commands, snapshot, forwarded events)
src/plot/       Pure pipeline: SVG/PNG → polylines → placement → G-code
src/ui/         React app (the only DOM-aware layer)
gateway/        Raspberry Pi / dev daemon: owns the port, streams autonomously, serves the GUI
openspec/       Design docs and change history
3D_print/       Printable paper-holder parts (STL)
```

## Quick start

```bash
npm install        # builds the native serialport binding
npm run build      # typecheck + build the GUI into dist/ (the daemon serves it)
npm run gateway    # opens the port once, serves GUI + WebSocket on http://localhost:8717
```

Then open **http://localhost:8717** and click **Connect**.

For UI work you can also run the Vite dev server — it connects to the same daemon over
the WebSocket, so the gateway still needs to be running for live hardware:

```bash
npm run dev        # Vite dev server on http://localhost:5173
```

See [`gateway/README.md`](gateway/README.md) for daemon configuration (env vars), the
macOS idle-sleep note, and **Raspberry Pi deployment** — a one-command installer
(`gateway/install.sh`) that sets up Node, the boot service, serial access, and mDNS, with
SSH-tunnel access (the daemon binds loopback only; SSH keys are the access control).

## Machine notes

The target machine is configured a specific way, and the pipeline bakes these in:

- **Inverted Z (pen lift):** `Z+` moves the pen **down**. Pen-down Z is positive
  (default `3`), pen-up is `0`.
- **No homing / no limit switches** (`$22=0`). The operator **manually sets work zero**
  at the paper corner each session; there is no `$H`.
- **Origin = paper's top-left corner.** SVG→G-code uses an identity mapping (no Y flip):
  machine `+Y` runs physically *down* the page, matching the artwork's Y-down. Drawing
  fills the `+X`/`+Y` quadrant.
- After a power cycle the daemon restores the last position so you needn't re-calibrate,
  but with no homing this is approximate (~1 cm). Stop before powering off for the
  closest restore; re-run **Set Work Zero** if it drifts.

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

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Konva (canvas) · `serialport` + `ws` +
`tsx` (gateway) · Vitest

## Testing

```bash
npm test
```

Unit tests cover the pure, testable core — GRBL line parsing and streaming, SVG/PNG
flattening and iso-contour tracing, placement and fit math, the detail thinner, and
G-code generation.

## Hardware

`3D_print/` contains printable STL parts for a paper holder. Design docs and the full
change history for each feature live under `openspec/`.

## License

MIT © Diederik Siderius — see [`LICENSE`](LICENSE).
