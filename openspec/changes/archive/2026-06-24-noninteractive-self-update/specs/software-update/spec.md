## MODIFIED Requirements

### Requirement: Safe self-update execution

The update SHALL run in a process independent of the daemon, so the daemon can be stopped and restarted by the update without killing the update itself. The update SHALL be guarded against running while the machine is moving. The update SHALL install the package **non-interactively** and SHALL NOT block on configuration-file prompts; operator edits to configuration files SHALL be preserved across an update. A failed update SHALL leave the previously installed version running, and SHALL NOT require manual recovery on the Pi for the common failure cases (e.g. a download or install error, or a release that changes a configuration file).

#### Scenario: Daemon restart does not abort its own update

- **WHEN** the update restarts the gateway service as part of installing the new version
- **THEN** the update continues to completion despite the daemon process being replaced

#### Scenario: Failed update is non-destructive

- **WHEN** the update fails to download or install the new package
- **THEN** the previously installed version remains running and the failure is reported to the operator

#### Scenario: Configuration-file change does not deadlock the update

- **WHEN** a release changes a packaged configuration file (a dpkg conffile) and the operator triggers a self-update
- **THEN** the package installs without prompting, the operator's existing configuration is preserved, and no manual recovery on the Pi is required

#### Scenario: Privileges are tightly scoped

- **WHEN** the daemon triggers an update
- **THEN** it uses only the narrowly-scoped elevated permissions required to install the package and restart the service, not general administrative access
