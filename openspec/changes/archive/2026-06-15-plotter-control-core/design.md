## Context

This is the first code in a greenfield project: a custom control app for a UUNA TEK 3.0 pen plotter, replacing the bundled software. The eventual app will upload SVGs, visualize them on a page, and plot them — but this change deliberately builds only the machine-control foundation, because real-time GRBL communication and flow control are the riskiest layer and everything else depends on it working.

The target machine has been probed empirically (not assumed):

- GRBL 1.1 over USB serial, CH340 chip, 115200 baud (`/dev/cu.wchusbserial210` on macOS; a duplicate `cu.usbserial-210` node also appears).
- Work area `$130=1189` × `$131=841` mm (ISO A0), X is the long axis.
- Pen lift is the **Z axis** (`$132=12` mm travel), with **inverted polarity: Z+ moves the pen down, Z− moves it up**, confirmed by jog tests.
- No spindle/servo (`$30=0`), so `M3`/`M5` do nothing — pen control is pure Z motion.
- Max feed `$110/$111=11000`, `$112=5000` mm/min; acceleration `$120–122=500`.
- Status mask `$10=1`; report format `<State|MPos:x,y,z|FS:feed,spindle|WCO:x,y,z>`.

## Goals / Non-Goals

**Goals:**
- Prove end-to-end control: connect → see live pen position → jog → pen up/down → stream a sample G-code file that draws smoothly to completion.
- Get the hard real-time pieces right: the dual-channel protocol, character-counting streaming, accurate completion detection.
- Lay a transport abstraction so a WiFi/WebSocket transport drops in later without touching upper layers.
- Seed machine calibration from the probed values, editable as settings.

**Non-Goals:**
- No SVG upload, parsing, or SVG→G-code conversion.
- No visual canvas (bed/paper/artwork drag-rotate-scale).
- No WiFi/WebSocket transport (interface only; one USB implementation).
- No feed-override UI, multi-color layers, or visual-design polish.
- No desktop packaging (runs as a browser app; Electron/Tauri is a later option).

## Decisions

### Stack: TypeScript + React, hardware via Web Serial API
Chosen because the eventual centerpiece is a rich interactive vector canvas (web tech's strength) and the requirement is a "professional clean interface." Web Serial (USB) and WebSocket (future WiFi) are both browser-standard APIs that *also* run unchanged inside an Electron/Tauri shell — so the desktop-vs-browser decision is deferred without cost. Alternatives: Python+Qt (weaker UI polish, heavier serial-to-UI plumbing); native (slow to build the canvas). The transport interface isolates the one browser-specific dependency.

### Dual-channel protocol over one connection
GRBL multiplexes two kinds of traffic on one wire: buffered line commands (acknowledged by `ok`/`error:N`) and immediate single-byte real-time commands (`?`, `!`, `~`, `0x18`, `0x85`, `0x90`–`0x9F`) processed the instant they arrive, even mid-line. The transport layer exposes both as separate send paths. Rationale: if `?`/`!` went through the line queue, status and pause would lag behind buffered G-code — making them useless. This is the most common GRBL-sender mistake and is designed out from the start.

### Streaming: character-counting, not send-and-wait
A plotted curve is hundreds of tiny `G1` segments. Send-and-wait (one line per `ok`) lets GRBL's 15-block planner starve between lines, producing visible stutter and ink blobs at vertices. Character-counting keeps unacknowledged bytes ≤ 128 (GRBL's RX buffer), keeping the planner full and motion continuous. Trade-off: more bookkeeping (track per-line byte lengths, free on each `ok`) for correctness that is non-negotiable on a plotter. This is the first thing to build and the first thing to test (stream a dense spiral, watch for stutter).

### Completion = queue empty AND state Idle
The last `ok` means GRBL *accepted* the line, not that motion finished — the move is still in the planner. Reporting "done" on last-`ok` would claim completion while the pen is still drawing. Completion requires the queue to be empty and a `?` report of `Idle`.

### Progress shown by position, not by sent-line
Because of buffering, the line just *sent* can be ~15+ segments ahead of the pen. The live pen dot is derived from `MPos` (ground truth of where the pen physically is), not from which line was last sent. Line-number-based progress is deferred — it is more precise but fragile, and not needed for this change (which has no canvas anyway).

### Pen control via Z with inverted polarity + dwell
Pen down = `G0 Z<+depth>`, pen up = `G0 Z<≤0>`, opposite the usual CNC convention — baked in to avoid an upside-down/non-touching pen. A `G4 P<sec>` dwell follows each pen move so the carriage seats before drawing/travelling. Depth, up-height, and dwell are settings (every pen differs). `M3/M5` are intentionally unused (`$30=0`).

### Jogging via `$J=` with `0x85` cancel
Jogs use GRBL's dedicated jog command (cancelable) rather than plain `G1`, so a held-then-released control can flush pending jogs with `0x85` instantly — no overshoot, no alarm/reset. Feed-hold `!` is the wrong tool for jog (it pauses but does not clear the backlog).

### Error policy: abort, don't skip
An `error:N` mid-stream means a line was rejected, so all geometry after it is suspect. The job aborts and surfaces the offending line rather than silently continuing. `ALARM:N` halts and prompts for `$X`/reset.

### Deployment path: laptop now, Raspberry Pi gateway later
This change runs **browser-direct from a laptop over USB** ("local mode") — the fastest path to proving control. The intended future is a **team setup**: ~10 people (never simultaneous) use the app online to upload, place/scale, and plot, with the plotter shared. A Raspberry Pi (already on hand) is the chosen controller box: it sits next to the plotter, owns the USB serial link, serves the web app, and runs the control engine; teammates connect over WebSocket and reach the Pi via a mesh VPN (e.g. Tailscale) with no public exposure.

The critical consequence for *this* change: the GRBL control engine (line layer, char-counting streaming, status polling, state machine) MUST be **framework-free, environment-agnostic TypeScript** with all hardware specifics behind the `Transport` interface — so the *same* engine later runs under Node on the Pi behind a `NodeSerialTransport`, with no rewrite. The browser/React UI consumes the engine in-process now; in the gateway phase a thin server hosts the engine and the UI consumes it over WebSocket (a future `plotter-gateway` change adds: Node serial transport, WebSocket status fan-out, a single-operator lock since use is non-simultaneous, and Tailscale access). Hard rule: the streaming controller stays on the LAN, close to the machine — G-code is never streamed across the internet, only operator commands are.

## Risks / Trade-offs

- **Web Serial browser support** → Chromium-only (Chrome/Edge). Acceptable for a personal tool; Electron/Tauri shell is the escape hatch if needed, with no transport-code change.
- **Duplicate CH340 device nodes** (`wchusbserial210` vs `usbserial-210`) → let the operator pick the port via the Web Serial chooser; document trying the other node if one fails to open.
- **Character-counting off-by-one (terminator bytes)** → include the line terminator in the byte count and unit-test the window math against a known sequence; verify with a real dense-spiral stream.
- **Status poll flooding the link** → fixed ~10 Hz cap; revisit (back off) when the WiFi transport lands, where round-trips are slower.
- **Wrong pen Z depth on first run** → depth is a setting with a conservative default; operator calibrates the exact touch value (noted as pending from the probe).
- **Concurrency on one writer** → reader, status-poller, and streamer all write to one connection; writes must be serialized so a real-time byte never interleaves *inside* a line's bytes. Mitigation: a single write path that emits whole lines or whole real-time bytes atomically.

## Open Questions

- Exact pen-down Z depth and the two dwell durations — to be calibrated on hardware during `apply`.
- Whether to raise `$10` to include buffer state (`Bf:`) in reports for richer streaming feedback — deferred; character-counting does not require it.
- Settings persistence mechanism (localStorage vs file) — trivial; decide during `apply`.
