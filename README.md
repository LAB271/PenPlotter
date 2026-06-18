# PenPlotter271

A browser-based control app for a GRBL pen plotter. Import an SVG or PNG, place it on
the page, and stream the generated G-code to the machine — either directly from the
browser (Web Serial) or through a long-running gateway daemon that owns the serial port
(the recommended setup, and the only option for unattended Raspberry Pi plotting).

## Architecture

The GRBL engine depends only on a `Transport` interface — never on Web Serial, the DOM,
or React — so the exact same engine runs in the browser and on a Raspberry Pi behind a
Node serial adapter, unchanged.

```
src/grbl/       Portable GRBL protocol engine: streaming, status, alarms (no UI deps)
src/transport/  The seam — Transport interface + the browser's WebSocket client
src/plot/       Pure pipeline: SVG/PNG → polylines → placement → G-code
src/ui/         React app (the only DOM-aware layer)
gateway/        Raspberry Pi / dev daemon: owns the port, streams autonomously, serves the GUI
openspec/       Design docs and change history
```

## Quick start (dev)

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

For real plotting, run the gateway daemon so the serial port is opened exactly once and
plots survive a browser disconnect:

```bash
npm run build      # build the GUI into dist/ (the daemon serves it)
npm run gateway    # opens the port once, serves GUI + WebSocket on http://localhost:8717
```

Then open the served URL and click **Connect**. See [`gateway/README.md`](gateway/README.md)
for configuration, the macOS idle-sleep note, and **Raspberry Pi deployment** (auto-start
on boot, SSH-tunnel access).

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

React 18 · TypeScript · Vite · Tailwind CSS · Konva (canvas) · `serialport` + `ws` (gateway) · Vitest

## Testing

```bash
npm test
```

Unit tests cover the pure, testable core — GRBL line parsing and streaming, SVG/PNG
flattening, placement math, and G-code generation.
