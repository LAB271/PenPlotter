## ADDED Requirements

### Requirement: Phone monitoring view

On phone-sized screens the web app SHALL present a clean single-column view focused on monitoring a running plot, without the desktop three-column layout. The view SHALL surface, at minimum: the live plotter canvas (paper, artwork, and the live pen marker), machine state, position, and plot progress. It SHALL NOT require horizontal scrolling or overlap panels.

#### Scenario: Phone shows the live plotter

- **WHEN** the app is opened on a phone-width screen during a plot
- **THEN** it presents a single-column view in which the live canvas (with the moving pen marker), machine state, position, and progress are all visible and update in real time

#### Scenario: Desktop layout unchanged on wide screens

- **WHEN** the app is opened on a wide screen
- **THEN** the existing three-column editor layout is presented unchanged

### Requirement: Pause, resume, and stop from the phone

The phone monitoring view SHALL provide touch-friendly Pause, Resume, and Stop controls that act on the daemon-driven plot, with live status reflecting the result. No other plot or machine controls are required on the phone.

#### Scenario: Halting a plot from a phone

- **WHEN** a plot is running and the operator uses the phone view to pause, resume, or stop it
- **THEN** the command takes effect on the daemon-driven plot and the view's live state and progress update accordingly

#### Scenario: Monitoring only

- **WHEN** the operator uses the phone view
- **THEN** the only plot controls offered are Pause, Resume, and Stop; speed and machine settings are not adjustable from the phone
