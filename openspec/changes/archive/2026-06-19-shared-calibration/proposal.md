## Why

A plot's G-code is generated in the browser from that browser's own calibration (pen Z, dwell, and feeds — including the draw speed). The editable session (artwork + page) is already shared across devices via the daemon, but **calibration was not**. So a plot started from a phone — whose calibration was never tuned, and whose Pen & feeds panel is hidden on mobile — baked in the slow default draw feed instead of the speed set on the laptop. The plot ran far too slowly.

## What Changes

- Include machine **calibration** (pen Z, dwell, feeds incl. draw speed) in the daemon-stored editable session, alongside artwork and page layout.
- On connect, each client **adopts** the shared calibration, so a plot started from any device uses the same setup. If the stored session has no calibration yet (older session), the client keeps its local calibration and seeds it into the shared session.

## Capabilities

### Modified Capabilities
- `gateway-protocol`: the shared editable session served to clients now also carries machine calibration, so any device plots with the same pen settings and speed.

## Impact

- **Code:** `src/ui/sessionStore.ts` (`Session` gains an optional `calibration`); `src/ui/App.tsx` (persist `cal` in the session blob; adopt `session.calibration` on the daemon session-restore handler). No daemon or protocol code change — the session blob is opaque to the daemon, so the new field rides the existing sync and persistence.
- **Behaviour:** a plot started from a phone now runs at the laptop's set speed (and pen Z/dwell). The per-browser live-calibration push (for manual pen up/down) is unchanged.
- **Hardware:** verify a phone-started plot runs at the laptop's speed.
