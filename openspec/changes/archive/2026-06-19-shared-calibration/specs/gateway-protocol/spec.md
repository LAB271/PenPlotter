## ADDED Requirements

### Requirement: Shared editable session includes calibration

The daemon SHALL store the editable session — placed artwork, page layout, AND machine calibration (pen Z, dwell, and feeds including the draw speed) — and serve it to every client on attach. A client SHALL adopt the shared calibration on connect, so a plot started from any device uses the same setup regardless of which device starts it. If the stored session carries no calibration (an older session), the client SHALL keep its local calibration and seed it into the shared session rather than overwriting it with a default.

#### Scenario: A phone-started plot uses the laptop's speed

- **WHEN** a phone connects after the laptop has set up the session and starts a plot
- **THEN** the phone adopts the shared calibration and the plot runs at the same draw speed (and pen settings) as it would from the laptop

#### Scenario: Older session without calibration

- **WHEN** the stored session has no calibration field
- **THEN** the connecting client keeps its own calibration and seeds it into the shared session, rather than adopting a default
