## ADDED Requirements

### Requirement: Homing cycle

The system SHALL let the operator run the GRBL homing cycle (`$H`), reflect the resulting machine state (`Home` during, then `Idle`), and report failures clearly. When homing is unavailable (setting `$22=0`) or returns an alarm, the system MUST inform the operator rather than failing silently.

#### Scenario: Successful homing

- **WHEN** the operator triggers Home and homing is enabled
- **THEN** the app sends `$H`, shows the `Home` state during the cycle, and returns to `Idle` at the homed corner when complete

#### Scenario: Homing unavailable

- **WHEN** the operator triggers Home but homing is disabled (`$22=0`) or GRBL returns an alarm
- **THEN** the app surfaces a clear message that homing is not available/failed and how to proceed (set zero manually or unlock), and does not leave the UI in a stuck state

### Requirement: Work origin management

The system SHALL let the operator set the current position as the work origin (`G10 L20 P1 X0 Y0`), return to the work origin (rapid to work `0,0`), and reset the work offset. After setting the work origin, the reported work position at that point MUST read `0,0`.

#### Scenario: Set work zero at the corner

- **WHEN** the operator positions the pen at the registration corner and chooses Set work zero
- **THEN** the app sends `G10 L20 P1 X0 Y0` and the displayed work position (WPos) reads `0,0` at that location

#### Scenario: Return to work zero

- **WHEN** the operator chooses Go to work zero
- **THEN** the machine rapids to work coordinate `0,0` (the registration corner)

### Requirement: Position and origin display

The system SHALL display both machine position (MPos) and work position (WPos), derived as `WPos = MPos − WCO` from the status report, and indicate which origin is currently active.

#### Scenario: Both positions shown

- **WHEN** the machine reports status with a non-zero work-coordinate offset
- **THEN** the app shows MPos and WPos as distinct values and updates both live as the machine moves

### Requirement: Homing configuration visibility

The system SHALL surface the machine's `$$` settings in the UI, including `$22` (homing enable) and homing-related settings, so the operator can determine whether homing is available.

#### Scenario: Operator can see homing config

- **WHEN** the operator views machine settings after connecting
- **THEN** the app displays the `$$` settings including the value of `$22`

### Requirement: Orientation verification test

The system SHALL plot a small, deliberately *asymmetric* reference mark (e.g. an "L" or arrow) near the work origin, using G-code in work coordinates, so the operator can confirm axis orientation, the Y-flip, and which corner is the homed corner. The test MUST reuse the existing streaming path.

#### Scenario: Run orientation test

- **WHEN** the operator runs the orientation test after setting work zero
- **THEN** the machine plots an asymmetric mark anchored at the work origin, from which the operator can read the true X/Y orientation on the page

#### Scenario: Asymmetry reveals mirroring

- **WHEN** the plotted mark appears mirrored or rotated relative to its intended shape
- **THEN** the operator can identify the axis/flip discrepancy from the result (which a symmetric shape could not have revealed)
