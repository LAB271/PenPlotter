## Why

The UUNA TEK 3.0 ships with control software the owner dislikes, and the goal is a custom app for uploading SVGs, visualizing them on the page, and plotting them. Before any of that is worth building, the app must be able to reliably *drive the machine*: connect, know where the pen is, move it, and stream G-code that draws smoothly. This change builds that foundation as a thin end-to-end slice — nothing visual, nothing SVG — so the hardest, most failure-prone layer (real-time GRBL communication and flow control) is proven first. Everything else is "just UI" once the pen moves on command.

The machine's behavior has been probed empirically and is no longer assumed: it runs GRBL 1.1 over USB serial (CH340) at 115200 baud, work area 1189 × 841 mm (ISO A0, X long axis), pen lift on the **Z axis with inverted polarity (Z+ = down, Z− = up)** over a 12 mm range, no spindle/servo (`$30=0`, so `M3/M5` are unused), max feed X/Y 11000 and Z 5000 mm/min, status format `<State|MPos:x,y,z|FS:feed,spindle|WCO:x,y,z>`.

## What Changes

- Add a **transport abstraction** with a single USB-serial (Web Serial API) implementation, designed so a WiFi/WebSocket transport can be added later without changing layers above it.
- Implement **GRBL connection handling**: open the port, read the `Grbl 1.1` welcome banner, query and parse `$$` settings, and expose machine limits/config to the app.
- Implement the **dual-channel send model**: a buffered line queue (G-code / `$` commands acknowledged by `ok` / `error:N`) and an out-of-band real-time byte channel (`?`, `!`, `~`, `0x18` reset, `0x85` jog-cancel, `0x90–0x9F` overrides) that is never queued.
- Implement **character-counting streaming** (keep unacknowledged bytes ≤ 128) so GRBL's planner stays full and motion does not stutter — the crux feature for clean plotting.
- Implement **status polling at ~10 Hz**: parse the status report and expose live pen position (`MPos`) and machine state.
- Implement a **sender state machine** reconciled with GRBL's reported state; job completion is defined as queue-empty **and** GRBL reporting `Idle`.
- Implement **manual control**: jogging via `$J=` with `0x85` cancel (step and held/continuous patterns), and **pen up/down via Z** (down = `G0 Z<+depth>`, up = `G0 Z<≤0>`) with a settling dwell.
- Implement **machine calibration settings** from day one: work area, pen-down Z depth, pen-up Z, dwell times, max feed rates.
- Define an **error/abort policy**: abort the job on `error:` mid-stream and surface the offending line; handle `ALARM:` (requires `$X` unlock or reset).
- Provide a minimal harness to **stream a sample G-code file** and observe smooth execution to completion.

Out of scope (deferred to later changes): SVG upload/parsing, the visual bed/paper/artwork canvas, SVG→G-code conversion, WiFi/WebSocket transport, feed-override UI polish, multi-color layers, and professional UI styling.

## Capabilities

### New Capabilities
- `device-connection`: Establishing and managing the link to the plotter — the transport interface, USB-serial implementation, GRBL handshake, `$$` settings retrieval, and the dual-channel (line-queue vs. real-time byte) send primitive.
- `gcode-streaming`: Sending a G-code program to the machine with character-counting flow control, mid-stream `error:`/`ALARM:` handling and abort policy, and accurate completion detection.
- `machine-status`: Polling GRBL for status, parsing the report, and exposing live pen position and machine state to the rest of the app.
- `manual-control`: Operator-driven motion — jogging (with cancel) and pen up/down via the Z axis — plus the calibration settings these depend on.

### Modified Capabilities
<!-- None — greenfield project, no existing specs. -->

## Impact

- **New codebase**: greenfield TypeScript + React project (build tooling, project scaffold) — first code lands with this change.
- **Browser API dependency**: Web Serial API (Chromium-based browsers) for USB access; same code is forward-compatible with an Electron/Tauri shell later.
- **Hardware**: requires a connected UUNA TEK 3.0 over USB for end-to-end verification; the dual-node CH340 port (`/dev/cu.wchusbserial210`) must be free (UUNATEK's own app fully quit).
- **No backend/server**, no persistence beyond local settings storage in this change.
