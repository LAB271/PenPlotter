## MODIFIED Requirements

### Requirement: Tracing controls

The system SHALL expose a darkness **threshold** (0–1) and a number of brightness **levels** (1 = a single outline; more = nested contours that read as tonal shading), plus **invert** and **contrast** pre-processing of the image's grayscale. These controls SHALL apply **live to the artwork already on the page** — changing a control re-traces that placed artwork in place and updates the preview, without re-importing the file — and SHALL be **per-artwork** (each traced image carries and persists its own values). Re-tracing on a control change SHALL reuse the already-decoded image rather than re-reading the file.

#### Scenario: Threshold and levels affect the trace live

- **WHEN** the operator changes the threshold or levels of a placed PNG artwork
- **THEN** a higher threshold inks more of the image and more levels add nested tonal contours, and the on-page artwork re-traces and the preview updates without re-importing

#### Scenario: Invert and contrast shape the trace

- **WHEN** the operator inverts or adjusts the contrast of a placed PNG artwork
- **THEN** the grayscale used for tracing is transformed accordingly (inverted, or contrast-adjusted) and the trace updates, letting high-key or inverted images yield usable ink

#### Scenario: Controls are per-artwork and persisted

- **WHEN** two PNG artworks are placed and one is retuned, and the session is reloaded
- **THEN** each artwork retains its own threshold/levels/invert/contrast values
