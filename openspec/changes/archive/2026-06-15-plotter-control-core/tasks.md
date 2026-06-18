## 1. Project scaffold

- [x] 1.1 Initialize a TypeScript + React app (Vite) with a minimal dev/build setup
- [x] 1.2 Add lint/format and a basic project structure (`src/transport`, `src/grbl`, `src/ui`)
- [x] 1.3 Confirm the dev server runs in a Chromium browser (Web Serial requires Chrome/Edge)

## 2. Transport abstraction + USB serial

- [x] 2.1 Define the `Transport` interface: `open()`, `close()`, `write(bytes)`, and an incoming-bytes stream/event
- [x] 2.2 Implement `WebSerialTransport` against the Web Serial API at 115200 baud, with port selection via the browser chooser
- [x] 2.3 Handle and surface connection errors (port busy, permission denied, disconnect) as actionable messages
- [x] 2.4 ⚙ HARDWARE: open the real port, read raw bytes, close cleanly so the port is released

## 3. GRBL line layer + dual channel

- [x] 3.1 Implement a line reader that splits the incoming byte stream into lines and classifies them: `ok`, `error:N`, `ALARM:N`, `<...>` status, `[...]` message, `Grbl ...` banner
- [x] 3.2 Implement the buffered line channel (enqueue G-code/`$` commands, match each to its `ok`/`error:N`)
- [x] 3.3 Implement the real-time byte channel (`?`, `!`, `~`, `0x18`, `0x85`, `0x90`–`0x9F`) that bypasses the queue
- [x] 3.4 Ensure a single serialized write path so a real-time byte never interleaves inside a line's bytes
- [x] 3.5 ⚙ HARDWARE: send `$$` and a real-time `?` concurrently; both responses are received and correctly classified
- [x] 3.6 Keep the engine portable: the GRBL core (`src/grbl`) imports no React/DOM/Web Serial APIs — only the `Transport` interface — so it can later run under Node on the Raspberry Pi unchanged

## 4. Connection lifecycle

- [x] 4.1 On connect, detect the `Grbl 1.1` banner; if absent within timeout, send soft reset (`0x18`) and confirm
- [x] 4.2 Query `$$` and parse `$<n>=<value>` into a settings object (work area, max feed rates, status mask)
- [x] 4.3 Implement clean disconnect: stop polling, halt any stream, release the port
- [x] 4.4 ⚙ HARDWARE: connect shows firmware version + parsed work area (1189×841); disconnect frees the port

## 5. Status polling

- [x] 5.1 Poll `?` at ~10 Hz over the real-time channel while connected; stop on disconnect
- [x] 5.2 Parse `<State|MPos:x,y,z|FS:feed,spindle|WCO:x,y,z>`; retain `WCO` for `WPos = MPos − WCO`
- [x] 5.3 Expose latest state + machine position as observable values; ignore malformed reports without crashing
- [x] 5.4 ⚙ HARDWARE: jog the machine by hand-sent commands and watch position/state update live

## 6. Character-counting streaming

- [x] 6.1 Implement the in-flight byte-window tracker (sum of unacknowledged line lengths incl. terminator ≤ 128)
- [x] 6.2 Send queued lines while the window permits; free the oldest line's bytes on each `ok`
- [x] 6.3 Abort on `error:N`: stop sending, surface offending line + code, enter error state
- [x] 6.4 Detect `ALARM:N`: halt and prompt for `$X`/reset
- [x] 6.5 Implement completion = queue empty AND GRBL reports `Idle`
- [x] 6.6 Implement pause (`!`), resume (`~`), and stop (feed hold then reset)
- [x] 6.7 Unit-test the window math against a known line sequence (including terminator bytes)
- [x] 6.8 ⚙ HARDWARE: stream a dense spiral G-code file and confirm smooth, stutter-free motion to completion

## 7. Manual control + calibration

- [x] 7.1 Implement calibration settings (work area, pen-down Z depth, pen-up Z, dwell times, max feed rates) seeded with probed A0 defaults, persisted locally
- [x] 7.2 Implement step jog and held/continuous jog via `$J=G91 G21 ...` at the configured feed rate
- [x] 7.3 Implement jog cancel on release via `0x85`
- [x] 7.4 Implement pen down = `G0 Z<+depth>` and pen up = `G0 Z<≤0>` (inverted polarity), each followed by a `G4` settle dwell
- [x] 7.5 ⚙ HARDWARE: jog X/Y in both directions, confirm pen raises/lowers correctly, calibrate exact pen-down depth

## 8. Minimal control UI + end-to-end verification

- [x] 8.1 Build a minimal (unstyled) panel: connect/disconnect, live position + state readout, jog buttons, pen up/down, load a `.gcode` file, stream/pause/stop
- [x] 8.2 ⚙ HARDWARE: connect over USB, watch live pen position, jog manually, raise/lower pen, stream a sample file that draws smoothly to completion
