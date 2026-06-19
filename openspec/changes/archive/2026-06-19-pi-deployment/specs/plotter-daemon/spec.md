## ADDED Requirements

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
