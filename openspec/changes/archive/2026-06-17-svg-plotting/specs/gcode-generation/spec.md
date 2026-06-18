## ADDED Requirements

### Requirement: Convert placed artwork to work-coordinate G-code

The system SHALL generate G-code from the placed polylines in **work coordinates** (relative to the top-left registration corner), applying the hardware-confirmed axis mapping `machineX = artworkX` and `machineY = artworkY` (identity — no flip; machine +Y is physically down the page), so the plot matches the on-screen orientation on the paper.

#### Scenario: Artwork maps directly to work coordinates

- **WHEN** a polyline point sits at artwork `(x, y)` mm from the top-left corner
- **THEN** the generated move targets work coordinate `X=x, Y=y`

#### Scenario: Output matches the preview

- **WHEN** the operator generates G-code for the placed artwork
- **THEN** the resulting toolpath corresponds to the WYSIWYG polylines shown on the canvas

### Requirement: Pen up/down sequencing

The system SHALL lift the pen for travel between polylines and lower it to draw, using the calibrated pen-up/pen-down Z values and a settle dwell after each pen move (reusing the calibration model).

#### Scenario: Each stroke is penned correctly

- **WHEN** generating a stroke
- **THEN** the output rapids to the stroke start with the pen up, lowers the pen (with dwell), draws the polyline, then raises the pen (with dwell) before travelling to the next

### Requirement: Configurable feed rates

The system SHALL use a configurable draw feed rate for pen-down moves and a (faster) travel rate for pen-up moves, both bounded by the machine's max feed settings.

#### Scenario: Draw and travel feeds applied

- **WHEN** generating moves
- **THEN** pen-down moves use the draw feed and pen-up moves use the travel feed, neither exceeding the machine maximum

### Requirement: Well-framed program

The system SHALL frame the program with the required modal setup (millimeters, absolute), start and end with the pen up, and return to the work origin at the end. Stroke ordering MAY follow document order in this change (path optimization is deferred).

#### Scenario: Safe start and end

- **WHEN** a generated program runs
- **THEN** it begins in mm/absolute mode with the pen up and ends with the pen up back at the work origin
