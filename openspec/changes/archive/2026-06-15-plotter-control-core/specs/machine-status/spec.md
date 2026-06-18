## ADDED Requirements

### Requirement: Periodic status polling

The system SHALL poll GRBL for status by sending the real-time `?` byte at a regular interval of approximately 10 Hz while connected. Polling MUST use the real-time channel (not the line queue) and MUST start on connect and stop on disconnect.

#### Scenario: Polling while connected

- **WHEN** the app is connected to the plotter
- **THEN** it sends `?` roughly every 100 ms and stops doing so when disconnected

### Requirement: Status report parsing

The system SHALL parse GRBL status reports of the form `<State|MPos:x,y,z|FS:feed,spindle|WCO:x,y,z|...>`, extracting the machine state, machine position (`MPos`), and feed/spindle (`FS`). When `WCO` is present it MUST be retained so work position can be derived as `WPos = MPos − WCO`.

#### Scenario: Report fields extracted

- **WHEN** a report `<Run|MPos:120.5,88.2,0.000|FS:1500,0|WCO:0.000,0.000,0.000>` is received
- **THEN** the app exposes state `Run`, position `(120.5, 88.2, 0.0)`, and applied feed `1500`

#### Scenario: Malformed report ignored

- **WHEN** a status line cannot be parsed
- **THEN** the app discards it without crashing and continues polling

### Requirement: Live position and state exposure

The system SHALL expose the most recent machine position and state to the rest of the app as observable values, so the live pen position can be displayed and other layers can react to state changes.

#### Scenario: Position updates observable

- **WHEN** successive status reports arrive as the machine moves
- **THEN** the exposed pen position updates accordingly and consumers are notified of the change
