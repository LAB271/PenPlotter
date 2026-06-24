## ADDED Requirements

### Requirement: Version reporting

The daemon's attach snapshot SHALL include the installed application version, and the daemon SHALL report the latest available released version (or that none is known) so clients can show what is running and whether an update exists. The latest-version lookup SHALL be best-effort and SHALL NOT block or break the connection when it is unavailable (e.g. offline).

#### Scenario: Snapshot carries the installed version

- **WHEN** a client attaches to the daemon
- **THEN** the snapshot includes the installed application version

#### Scenario: Latest version is reported when known

- **WHEN** the daemon has determined the latest released version
- **THEN** clients are informed of it, and when it is newer than the installed version they can present an update as available

#### Scenario: Offline lookup does not break the channel

- **WHEN** the latest-version lookup fails (e.g. no network)
- **THEN** the connection and any running plot are unaffected and the installed version is still reported

### Requirement: Update control channel

The daemon SHALL accept a command to trigger a self-update and SHALL emit update-progress/outcome so clients can reflect it. The update command SHALL be refused while a plot is running. Update status SHALL survive the daemon restart that an update causes, so a reconnecting client can observe the final outcome.

#### Scenario: Update is triggered when idle

- **WHEN** the controlling client sends the update command while the machine is idle
- **THEN** the daemon begins the update and reports progress

#### Scenario: Update is refused mid-plot

- **WHEN** a client sends the update command while a plot is running
- **THEN** the daemon rejects it without affecting the plot

#### Scenario: Outcome observable after restart

- **WHEN** an update completes (or fails) and the daemon has restarted
- **THEN** a reconnecting client can read the final update status and the now-installed version
