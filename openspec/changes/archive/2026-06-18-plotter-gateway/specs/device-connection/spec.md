## MODIFIED Requirements

### Requirement: USB serial connection

The system SHALL connect to the plotter over a USB serial port at 115200 baud from the **gateway daemon** (Node `serialport`), not from the browser. The daemon owns the one serial connection; clients (the browser GUI) connect to the daemon rather than opening the serial port themselves. The daemon SHALL surface connection failures (port busy, permission denied, device absent) as actionable state to clients.

#### Scenario: Successful connection

- **WHEN** the daemon starts and the plotter's serial port is available
- **THEN** the daemon opens the port at 115200 baud and reports a connected state to clients

#### Scenario: Port unavailable

- **WHEN** the serial port is already in use by another application or not yet present
- **THEN** the daemon reports a clear "port busy / device absent" state and retries rather than failing permanently

#### Scenario: Clients do not open the serial port

- **WHEN** a browser client connects
- **THEN** it attaches to the daemon over WebSocket and never opens the serial port itself

### Requirement: Disconnect and cleanup

The system SHALL distinguish a **client** disconnect from a **daemon** shutdown. A client disconnecting (closing the GUI/tab) SHALL detach from the daemon and release its control, but SHALL NOT close the serial port — the daemon keeps the port open (so the CH340 driver is never reopened). The serial port SHALL be released only when the daemon itself stops.

#### Scenario: Client disconnect keeps the link alive

- **WHEN** the operator closes the browser/tab
- **THEN** the client detaches and releases control, while the daemon keeps the serial port open and any running plot continues

#### Scenario: Daemon shutdown releases the port

- **WHEN** the daemon process stops
- **THEN** status polling and streaming stop and the serial port is released cleanly so other applications can use it
