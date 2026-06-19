# feed-override Specification

## Purpose
TBD - created by archiving change mobile-remote-control. Update Purpose after archive.
## Requirements
### Requirement: Live plotting-speed override

The system SHALL let the operator change plotting speed while a plot is streaming, taking effect on the in-flight plot without restarting or regenerating it. Speed adjustment SHALL use the controller's real-time feed override (scaling the programmed feed); it SHALL NOT modify the queued G-code. The control is a desktop control (not shown on the phone view) and the operator sets it by entering a percentage of the programmed feed. Each new plot SHALL start at 100%.

#### Scenario: Speed changes mid-plot

- **WHEN** a plot is streaming and the operator changes the speed value
- **THEN** the machine's feed changes within a moment and the plot continues from its current position, with no restart and no change to the remaining G-code

#### Scenario: Adjust around a pause

- **WHEN** the operator pauses a plot, changes the speed, and resumes
- **THEN** the plot resumes at the new speed

#### Scenario: Range is bounded

- **WHEN** the operator requests a speed below the minimum or above the maximum supported override
- **THEN** the requested value is clamped to the supported range (10–200% of the programmed feed) before being applied

#### Scenario: Resets each plot

- **WHEN** a new plot starts
- **THEN** the speed override returns to 100%

