# plotter-daemon Specification

## Purpose

Define the always-on gateway daemon that owns the plotter's serial connection, runs the GRBL streaming engine autonomously, auto-starts and auto-connects on its host, and recovers from device drops — so plots survive client disconnects and the CH340 driver is never wedged by repeated reopen.

## Requirements

### Requirement: Single open-once serial ownership

The daemon SHALL be the sole owner of the plotter's serial connection and SHALL open the serial port exactly once for its lifetime. It MUST NOT close and reopen the port in response to client connect/disconnect or any client command, so the CH340 driver is never wedged by repeated reopen.

#### Scenario: Port opened once, reused across clients

- **WHEN** clients connect and disconnect from the daemon over its lifetime
- **THEN** the underlying serial port remains open the whole time and is never reopened on a client action

#### Scenario: No reopen on client disconnect

- **WHEN** the controlling client disconnects mid-session
- **THEN** the daemon keeps the serial connection open and ready for the next client, without reopening the port

### Requirement: Autonomous streaming engine

The daemon SHALL run the GRBL streaming engine itself (character-counting send, status polling, pause/resume/stop), so that a plot continues to completion even if every client disconnects.

#### Scenario: Plot survives client disconnect

- **WHEN** a plot is streaming and the controlling client (browser/laptop) disconnects
- **THEN** the daemon continues streaming the program to completion on the plotter

#### Scenario: Client re-attach shows live state

- **WHEN** a client reconnects to the daemon during a running plot
- **THEN** the daemon reports the current machine state, progress, and position so the client view is accurate

### Requirement: Auto-start and auto-connect

The daemon SHALL start automatically when its host powers on and SHALL connect to the plotter automatically, retrying on a bounded schedule until the device is available, then remain connected awaiting plots.

#### Scenario: Connect on power-up

- **WHEN** the host (e.g. Raspberry Pi) and plotter are powered on
- **THEN** the daemon starts without manual intervention and establishes the serial connection once the device is present

#### Scenario: Device not yet present

- **WHEN** the daemon starts before the plotter is powered/enumerated
- **THEN** it retries connecting on a debounced schedule and connects once the device appears, without crashing

### Requirement: Device-drop handling

The daemon SHALL detect an unexpected loss of the serial device, report the disconnected state to clients, and re-establish the connection on a debounced retry when the device re-appears — rather than busy-reopening.

#### Scenario: Unexpected device drop

- **WHEN** the serial device disconnects unexpectedly (e.g. cable/power loss)
- **THEN** the daemon reports a disconnected state and retries connecting on a debounced schedule rather than reopening in a tight loop

### Requirement: Remembered work origin across power cycles

This machine has no homing, so the work origin (work zero / paper corner) is otherwise lost on every power cycle. The daemon SHALL persist the work origin and last work position to durable storage and reinstate it automatically on reconnect, so the operator does not have to re-calibrate after the daemon's host, the plotter, or both are power-cycled. Restoration assumes the gantry has not physically moved while unpowered (open-loop, no limit switches); the operator MAY re-calibrate (Set Work Zero) if it has.

#### Scenario: Plotter power-cycled, host stays up

- **WHEN** the plotter loses and regains power while the daemon's host stays running
- **THEN** on reconnect the daemon reinstates the remembered work origin without manual re-calibration

#### Scenario: Host power-cycled, plotter stays up

- **WHEN** the daemon's host restarts while the plotter stays powered
- **THEN** the daemon reinstates the remembered work origin on startup, rather than adopting an arbitrary boot position

#### Scenario: Both power-cycled

- **WHEN** both the host and the plotter are powered off and on again
- **THEN** the daemon restores the work origin from durable storage, because the saved origin survives on disk independently of either device

#### Scenario: Saved origin is never corrupted or stale

- **WHEN** the daemon persists position during a plot and is then interrupted by an abrupt power-off
- **THEN** the saved origin is written atomically (never a partial/empty file) and only after the controller has reported a real work-coordinate offset, so a reconnect never restores a meaningless or machine-coordinate position
