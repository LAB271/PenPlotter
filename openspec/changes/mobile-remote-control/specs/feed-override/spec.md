## ADDED Requirements

### Requirement: Live speed adjustment during a plot

The system SHALL let the operator change plotting speed while a plot is actively streaming, taking effect on the in-flight plot without restarting or regenerating it. Speed adjustment SHALL use the controller's real-time feed override (scaling the programmed draw feed), and SHALL NOT modify the queued G-code.

#### Scenario: Speed changes mid-plot

- **WHEN** a plot is streaming and the operator sets the speed to a different value
- **THEN** the machine's feed changes within a moment and the plot continues from its current position, with no restart and no change to the remaining G-code

#### Scenario: Range is bounded

- **WHEN** the operator requests a speed below the minimum or above the maximum supported override
- **THEN** the requested value is clamped to the supported range (10–200 % of the programmed draw feed) before being applied

### Requirement: Typed speed target with reported feedback

The operator SHALL set speed by entering a numeric target (a percentage of the programmed draw feed), and the UI SHALL display the resulting effective feed (mm/min). The UI SHALL reflect the override value the machine actually reports, not an assumed value.

#### Scenario: Operator enters a target percentage

- **WHEN** the operator enters a target speed percentage
- **THEN** the system drives the machine's override toward that target and the displayed value converges to the override the machine reports

#### Scenario: Override re-syncs after reconnect

- **WHEN** the client disconnects and reconnects mid-plot
- **THEN** the displayed speed re-syncs from the machine's reported override on the next status update

### Requirement: Speed setting available while idle

The operator SHALL be able to set the speed override while the machine is idle, and the setting SHALL persist so it applies to subsequent motion.

#### Scenario: Pre-arming speed before plotting

- **WHEN** the operator sets a speed override while idle and then starts a plot
- **THEN** the plot runs at the pre-set override rather than defaulting back to 100 %
