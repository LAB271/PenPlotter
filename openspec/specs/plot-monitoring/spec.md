# plot-monitoring

## Purpose

Give the operator live visibility and control over a running plot: a pen-position marker on the canvas, progress and state/position readouts, and pause/resume/stop controls. Stop safely halts the run and returns the machine to the work origin, ready to re-plot.

## Requirements

### Requirement: Live pen-position marker

The system SHALL display a pen-position marker on the canvas that tracks the machine's live work position (`WPos`), mapped into the same on-paper space as the artwork, so the operator can see where the pen is on the drawing and paper in real time.

#### Scenario: Marker tracks the pen

- **WHEN** the machine is moving and reporting status
- **THEN** the on-canvas marker updates live to the pen's position on the paper, consistent with the identity mapping (canvas Y-down matches machine +Y-down)

### Requirement: Progress indication

The system SHALL show plot progress (e.g. a progress bar) derived from the streaming engine's progress events, plus the current machine state and position.

#### Scenario: Progress advances during a plot

- **WHEN** a plot is streaming
- **THEN** the progress indicator advances toward completion and the state/position readout updates live

#### Scenario: Completion shown

- **WHEN** the plot finishes (queue empty and machine Idle)
- **THEN** the app indicates completion and resets the progress indicator

### Requirement: In-plot controls

The system SHALL provide pause, resume, and stop controls that act on the running plot via the existing streaming engine. Stop SHALL halt the run, lift the pen, and return the machine to the work origin (the paper's top-left corner), leaving it ready for a new plot.

#### Scenario: Pause and resume a running plot

- **WHEN** the operator pauses or resumes during a plot
- **THEN** the machine holds or continues accordingly, and the UI reflects the new state

#### Scenario: Stop returns home and is ready to re-plot

- **WHEN** the operator stops during a plot
- **THEN** the stream is aborted, the pen lifts and the machine returns to work zero (X0 Y0), and the operator can press Plot again without re-homing or re-setting the work origin
