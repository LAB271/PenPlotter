## ADDED Requirements

### Requirement: WebSocket command channel

The daemon SHALL expose a WebSocket endpoint that accepts JSON commands which map to the controller's operations — at minimum: plot (send a G-code program), pause, resume, stop, jog, jog-cancel, pen up/down, set work zero, go to work zero, motors off, unlock, and write a setting. Unknown or malformed commands SHALL be rejected without affecting the connection.

#### Scenario: Command drives the machine

- **WHEN** the controlling client sends a `plot` command with a G-code program
- **THEN** the daemon streams that program to the plotter

#### Scenario: Malformed command is rejected safely

- **WHEN** a client sends an unknown or malformed command
- **THEN** the daemon ignores/rejects it with an error reply and keeps the connection and any running plot unaffected

### Requirement: WebSocket event channel

The daemon SHALL push machine events to connected clients over the WebSocket — at minimum: connected/disconnected, status (state + machine/work position), stream progress, stream complete/aborted, error, alarm, settings, and log. On attach, it SHALL send a snapshot of current state (connection, latest status, settings) so a newly connected client is immediately accurate.

#### Scenario: Live events stream to clients

- **WHEN** the machine reports status and a plot advances
- **THEN** connected clients receive status and progress events reflecting the live machine

#### Scenario: Snapshot on attach

- **WHEN** a client connects to the daemon
- **THEN** it first receives a snapshot of the current connection state, latest status, and settings before incremental events

### Requirement: Single-operator control

The daemon SHALL grant active control to one client at a time. Additional clients MAY observe (receive events) but MUST NOT issue machine commands until control is released. Control SHALL be released automatically when the controlling client disconnects.

#### Scenario: Second client is read-only

- **WHEN** a second client connects while another holds control
- **THEN** the second client receives events but its machine commands are refused until control is available

#### Scenario: Control released on disconnect

- **WHEN** the controlling client disconnects
- **THEN** control is released so another client can take control

### Requirement: Browser thin-client transport

The browser GUI SHALL talk to the plotter only through a gateway client that speaks this WebSocket protocol, exposing the same observe-events-and-send-commands surface the UI already uses, so the GUI no longer opens a serial port itself.

#### Scenario: GUI operates via the gateway

- **WHEN** the operator uses the GUI (jog, set zero, plot, pause/stop, watch the live marker and progress)
- **THEN** every action and update flows over the WebSocket gateway, with no direct Web Serial use in the browser
