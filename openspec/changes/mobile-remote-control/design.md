## Context

The browser is a thin client over a Pi-hosted daemon that owns the serial port and streams autonomously. Plots survive client disconnect. The desktop UI (`src/ui/App.tsx`) is one large component with a fixed three-column flex layout and a bottom transport strip. `GrblController` already sends single-byte real-time commands out-of-band (`sendRealtime`), and defines but never uses the feed-override bytes.

## Goals / Non-goals

**Goals**
- A phone can monitor a running plot and change its speed, pause/resume/stop, lift the pen, and jog — over the same WiFi/tunnel the desktop uses.
- Speed changes take effect on the *in-flight* plot, with no restart or regeneration.

**Non-goals**
- Touch artwork editing (import/place/scale) — desktop-first stays.
- A native app or PWA install.
- Rapid (travel) override — out of scope; only feed override.

## Decisions

### Feed override, not regenerated G-code
GRBL's real-time feed override scales the *commanded* feed live, machine-side, without touching the program stream. This is the only mechanism that can change a plot already partly sent to the controller. The alternative — stop, regenerate at a new feed, restart — loses position and pen registration and is unacceptable mid-plot.

- GRBL/FluidNC override range is **10–200 %** of the programmed feed, adjusted in **±10 %** (`0x91`/`0x92`) and **±1 %** (`0x93`/`0x94`) steps, with reset-to-100 % (`0x90`). There is **no absolute-set byte** — the controller method steps from the current override toward the entered target.
- The operator enters a **target %** (number, not a slider — matching the "machine settings are typed" preference); the UI shows the equivalent mm/min from the baked draw feed for context.
- GRBL reports the active override in the `Ov:` field of its status report. The controller parses it so the UI shows the *real* machine value and the step loop converges (and re-syncs after a reconnect).

### Override target as a real-time command across the gateway
The set-override command is real-time, like pause/resume: it bypasses the line queue. `GatewayClient` sends an "override target" message; the daemon translates it to the stepping logic on the controller. Because GRBL absorbs real-time bytes mid-line, this is safe during a stream.

### Responsive layout via Tailwind breakpoints, one component
Rather than a separate mobile app, the existing layout reflows. At `< sm` (phone), the side panels stack/collapse and a compact **remote** region surfaces the transport + speed + pen + jog with large targets; the canvas shrinks to a monitor (it still shows the live pen marker and progress). At `>= md`, today's three-column editor is unchanged. This keeps a single source of truth and avoids duplicating the control wiring.

### Speed control available idle and mid-plot
The override persists in the controller, so setting it while idle pre-arms the next plot's effective speed; setting it mid-plot retargets immediately. Same control, both states.

## Risks / Trade-offs

- **Stepwise convergence:** reaching a target % takes a short burst of ±10/±1 bytes; the UI should debounce typed input and converge to the reported `Ov:` rather than assuming success. Mitigation: drive the loop off status feedback.
- **Override vs. min feed:** very low % on an already-slow draw feed can stall perceptible motion; clamp the target to the documented 10–200 % and show mm/min so the operator sees the real speed.
- **Single-component growth:** `App.tsx` is already large; the responsive remote adds markup. Acceptable for now; a later UI-polish change can extract components.

## Migration

Additive. No persisted-state or protocol format changes; the override command is new and ignored by older daemons (verify graceful no-op). Desktop behaviour is unchanged when the viewport is wide.

## Open Questions

- Preferred phone breakpoint and whether the remote should be a bottom sheet vs. a full stacked column (visual polish — decide during implementation against a real device).
- Whether to also surface the typed machine feeds (draw/travel/jog) on the mobile remote or keep those desktop-only (they only affect the *next* plot).
