## ADDED Requirements

### Requirement: Estimate plot duration from the generated program

The system SHALL compute an estimated plot duration by walking the generated G-code
program in order and modelling the machine's actual motion: trapezoidal acceleration and
deceleration on each continuous run of moves (the pen stops to lift/lower between strokes)
and corner-speed limiting from the machine's junction-deviation and acceleration settings,
plus the pen-settle dwells. It SHALL use the machine's reported acceleration ($120/$121)
and junction deviation ($11) when available, falling back to sensible defaults otherwise.
The estimate therefore reflects the configured speeds, the number and length of move
segments, the cornering of the geometry, and the actual nearest-travel stroke order.

#### Scenario: Estimate reflects feeds, geometry, and acceleration

- **WHEN** a G-code program is generated for the placed artwork
- **THEN** the estimated duration accounts for accel/decel ramps and corner slowdowns (not just distance ÷ feed), so that faster feeds, higher acceleration, gentler cornering, fewer segments, or a shorter-travel order each lower the estimate

#### Scenario: Empty or trivial program

- **WHEN** there are no drawable strokes (no pen-down moves)
- **THEN** the estimated duration is zero (or near-zero) rather than an error or NaN

### Requirement: Show estimated total time before plotting

The system SHALL display the estimated total plot time for the currently placed artwork
before a plot starts, so the operator knows the expected cost up front. The estimate
SHALL update when the artwork, feeds, or layout change.

#### Scenario: Total time shown for placed artwork

- **WHEN** artwork is placed and ready to plot
- **THEN** an estimated total time (e.g. `~12m 30s`) is shown to the operator

#### Scenario: Estimate updates with changes

- **WHEN** the operator changes a feed rate, adds/moves/scales artwork, or otherwise alters what would be plotted
- **THEN** the displayed total time updates to reflect the new program

### Requirement: Show remaining time during a plot

While a plot is running, the system SHALL display the estimated remaining time, derived
from the total estimate and the current plot progress, and SHALL scale with the live
speed override so that slowing or speeding the plot adjusts the remaining estimate. This
remaining-time readout SHALL replace the raw G-code line counter in the progress strip.

#### Scenario: Remaining time tracks progress

- **WHEN** a plot is streaming and progress advances
- **THEN** the displayed remaining time decreases toward zero and the raw `lines` counter is no longer shown

#### Scenario: Remaining time responds to the speed override

- **WHEN** the operator changes the live speed override during a plot
- **THEN** the remaining-time estimate adjusts accordingly (slower speed increases it, faster decreases it)

### Requirement: Time readout reads well on phone and laptop

The system SHALL format the time estimate compactly and human-readably (e.g. `~45s`,
`~12m 30s`, `~1h 04m`) and SHALL render the readout cleanly within both the phone view and
the desktop layout, without overlapping controls or requiring horizontal scrolling.

#### Scenario: Compact readout on a phone

- **WHEN** the app is viewed on a phone-width screen during or before a plot
- **THEN** the time estimate is visible and legible within the layout, not truncated or overlapping other controls

#### Scenario: Readout on the desktop layout

- **WHEN** the app is viewed on a wide screen
- **THEN** the time estimate appears in the progress strip alongside state/position/progress, replacing the line counter
