# software-update Specification

## Purpose
TBD - created by archiving change package-as-deb. Update Purpose after archive.
## Requirements
### Requirement: Update availability is visible

The operator SHALL be able to see, in the web app, the currently running version and whether a newer released version is available. The indication SHALL be unobtrusive when up to date and SHALL surface an "update available" affordance when a newer version exists.

#### Scenario: Running the latest version

- **WHEN** the installed version matches the latest released version
- **THEN** the app shows the current version with no update prompt

#### Scenario: A newer version exists

- **WHEN** a newer released version is available
- **THEN** the app shows that an update is available, naming the current and new versions

### Requirement: Operator-triggered self-update

The operator SHALL be able to update the installed package to the latest release from the browser, without SSHing into the Pi. The update action SHALL be disabled while a plot is running, and SHALL install the latest released package and restart the service. The app SHALL reflect the update's progress and final outcome, reconnecting automatically after the service restarts.

#### Scenario: Update from the browser

- **WHEN** an operator triggers "Update now" while the machine is idle
- **THEN** the latest released package is installed, the service restarts, and the app reconnects and shows the new running version

#### Scenario: Update disabled during a plot

- **WHEN** a plot is running
- **THEN** the update action is unavailable, so an in-progress plot cannot be interrupted by an update

### Requirement: Safe self-update execution

The update SHALL run in a process independent of the daemon, so the daemon can be stopped and restarted by the update without killing the update itself. The update SHALL be guarded against running while the machine is moving. A failed update SHALL leave the previously installed version running, and SHALL NOT require manual recovery on the Pi for the common failure cases (e.g. a download or install error).

#### Scenario: Daemon restart does not abort its own update

- **WHEN** the update restarts the gateway service as part of installing the new version
- **THEN** the update continues to completion despite the daemon process being replaced

#### Scenario: Failed update is non-destructive

- **WHEN** the update fails to download or install the new package
- **THEN** the previously installed version remains running and the failure is reported to the operator

#### Scenario: Privileges are tightly scoped

- **WHEN** the daemon triggers an update
- **THEN** it uses only the narrowly-scoped elevated permissions required to install the package and restart the service, not general administrative access

