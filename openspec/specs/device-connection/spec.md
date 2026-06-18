# device-connection Specification

## Purpose

Establish and manage the connection between the app and the GRBL-based pen plotter, including transport abstraction, USB serial connectivity, the GRBL handshake, settings retrieval, the dual-channel send primitive, and clean disconnect.

## Requirements

### Requirement: Transport abstraction

The system SHALL define a transport interface that exposes opening a connection, closing it, writing bytes, and receiving an asynchronous stream of incoming bytes, independent of the underlying medium. All layers above transport (streaming, status, manual control) MUST depend only on this interface and MUST NOT reference USB- or WiFi-specific APIs directly.

#### Scenario: Higher layers are transport-agnostic

- **WHEN** a future WiFi/WebSocket transport implementation is added
- **THEN** the streaming, status, and manual-control layers compile and operate without modification, because they depend only on the transport interface

#### Scenario: Single active transport

- **WHEN** the app connects to a plotter
- **THEN** exactly one transport implementation is active and owns the connection for its lifetime

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

### Requirement: GRBL handshake

On connecting, the system SHALL detect the GRBL welcome banner (e.g. `Grbl 1.1h ['$' for help]`) to confirm communication, and SHALL be able to trigger a soft reset (`0x18`) to elicit the banner when the controller is already running.

#### Scenario: Banner detected on connect

- **WHEN** the connection opens and GRBL emits its welcome banner
- **THEN** the app records the reported firmware version and marks the link as confirmed

#### Scenario: No banner without reset

- **WHEN** the connection opens but no banner appears within a short timeout
- **THEN** the app issues a soft reset (`0x18`) and confirms the link upon receiving the banner

### Requirement: Settings retrieval

The system SHALL query `$$` after connecting and parse the returned `$<n>=<value>` lines into a structured settings object, exposing at minimum work-area travel (`$130`/`$131`/`$132`), max feed rates (`$110`/`$111`/`$112`), and the status report mask (`$10`).

#### Scenario: Settings parsed on connect

- **WHEN** the app sends `$$` and receives the settings dump terminated by `ok`
- **THEN** it parses each `$<n>=<value>` line and exposes work area, max feed rates, and status mask to the rest of the app

### Requirement: Dual-channel send primitive

The system SHALL provide two distinct send paths over the single connection: (1) a buffered line channel for G-code and `$` commands that expects an `ok`/`error:N` acknowledgement per line, and (2) an immediate real-time byte channel (`?`, `!`, `~`, `0x18`, `0x85`, `0x90`–`0x9F`) that bypasses the line queue and is written without waiting for acknowledgement.

#### Scenario: Real-time command bypasses the queue

- **WHEN** a real-time byte such as `?` or `!` is sent while G-code lines are queued
- **THEN** the byte is written to the transport immediately rather than waiting behind queued lines

#### Scenario: Line command is acknowledged

- **WHEN** a line-channel command is sent
- **THEN** the app matches the subsequent `ok` or `error:N` response to that command

### Requirement: Disconnect and cleanup

The system SHALL distinguish a **client** disconnect from a **daemon** shutdown. A client disconnecting (closing the GUI/tab) SHALL detach from the daemon and release its control, but SHALL NOT close the serial port — the daemon keeps the port open (so the CH340 driver is never reopened). The serial port SHALL be released only when the daemon itself stops.

#### Scenario: Client disconnect keeps the link alive

- **WHEN** the operator closes the browser/tab
- **THEN** the client detaches and releases control, while the daemon keeps the serial port open and any running plot continues

#### Scenario: Daemon shutdown releases the port

- **WHEN** the daemon process stops
- **THEN** status polling and streaming stop and the serial port is released cleanly so other applications can use it
