## ADDED Requirements

### Requirement: Jogging

The system SHALL move the machine on operator command using GRBL jog commands (`$J=G91 G21 ...`) in relative millimeters at a configurable feed rate, supporting per-axis moves on X and Y. Jog distance and feed rate MUST be operator-selectable.

#### Scenario: Step jog

- **WHEN** the operator requests a +10 mm X jog at a given feed rate
- **THEN** the app sends `$J=G91 G21 X10 F<rate>` and the machine moves 10 mm in X

#### Scenario: Continuous (held) jog

- **WHEN** the operator holds a jog control
- **THEN** the app streams successive jog commands while held and stops on release without overshooting the queue

### Requirement: Jog cancel

The system SHALL cancel pending jog motion using the real-time jog-cancel byte (`0x85`), which clears queued jogs without triggering an alarm or full reset.

#### Scenario: Release cancels promptly

- **WHEN** the operator releases a held jog control
- **THEN** the app sends `0x85` and the machine stops promptly without entering an alarm state

### Requirement: Pen up and down via Z axis

The system SHALL raise and lower the pen using Z-axis moves, honoring this machine's inverted polarity where positive Z is pen-down and Z at or below zero is pen-up. After a pen up or down move, the system MUST issue a settling dwell (`G4 P<seconds>`) before the next motion so the carriage seats before drawing or travelling.

#### Scenario: Pen down

- **WHEN** the operator commands pen down
- **THEN** the app moves Z to the configured positive pen-down depth and dwells for the configured settle time before any subsequent move

#### Scenario: Pen up

- **WHEN** the operator commands pen up
- **THEN** the app moves Z to the configured pen-up height (≤ 0) and dwells for the configured settle time before any subsequent move

### Requirement: Calibration settings

The system SHALL expose machine calibration values as editable settings, with defaults seeded from the probed machine: work area (default 1189 × 841 mm), pen-down Z depth, pen-up Z height, pen settle dwell times, and max feed rates (X/Y 11000, Z 5000 mm/min). These settings MUST drive jog feed rates and pen Z moves.

#### Scenario: Settings drive behavior

- **WHEN** the operator changes the pen-down depth setting
- **THEN** subsequent pen-down commands use the new Z depth

#### Scenario: Defaults from probed machine

- **WHEN** the app is first used
- **THEN** calibration settings are pre-filled with the probed UUNA TEK 3.0 A0 defaults, which the operator can adjust
