## ADDED Requirements

### Requirement: Touch remote on small screens

On phone-sized screens the web app SHALL present a single-column, touch-friendly remote that lets an operator monitor and steer a running plot without the desktop three-column layout. The remote SHALL surface, at minimum: live machine state and position, plot progress, Pause / Resume / Stop, Pen up / Pen down, jog, and the speed control. Interactive controls SHALL have touch-adequate hit targets.

#### Scenario: Phone shows the remote layout

- **WHEN** the app is opened on a phone-width screen
- **THEN** it presents a single-column remote with live state, progress, transport (pause/resume/stop), pen, jog, and speed controls, all operable by touch — without overlapping panels or a clipped control strip

#### Scenario: Desktop layout unchanged on wide screens

- **WHEN** the app is opened on a wide screen
- **THEN** the existing three-column editor layout is presented unchanged

### Requirement: Remote drives a running plot

From the small-screen remote the operator SHALL be able to control a plot that is already running on the daemon, including changing speed, pausing, resuming, and stopping, with live status reflecting the result.

#### Scenario: Steering a plot from a phone

- **WHEN** a plot is running and the operator uses the phone remote to change speed or pause/resume/stop
- **THEN** the command takes effect on the daemon-driven plot and the remote's live state and progress update accordingly
