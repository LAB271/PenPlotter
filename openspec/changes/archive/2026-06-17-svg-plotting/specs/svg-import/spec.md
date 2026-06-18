## ADDED Requirements

### Requirement: Load an SVG file

The system SHALL let the operator load an SVG file from disk and parse it in the browser without uploading it to any server.

#### Scenario: Load a valid SVG

- **WHEN** the operator selects an `.svg` file
- **THEN** the app parses it and makes its geometry available for placement on the page

#### Scenario: Invalid or empty file

- **WHEN** the selected file is not valid SVG or contains no drawable geometry
- **THEN** the app reports a clear message and does not crash or leave a partial artwork

### Requirement: Flatten geometry to polylines

The system SHALL convert the SVG's stroke geometry into polylines (sequences of straight segments), flattening curves and arcs at a configurable tolerance expressed in millimeters. It MUST bake in element transforms so nested/grouped geometry is positioned correctly.

#### Scenario: Curves are flattened within tolerance

- **WHEN** an SVG contains Bézier/arc paths
- **THEN** they are sampled into polylines whose deviation from the true curve is within the configured tolerance

#### Scenario: Nested transforms are applied

- **WHEN** geometry sits inside transformed groups
- **THEN** the resulting polylines reflect the cumulative transform (position/scale/rotation) of each element

#### Scenario: Hidden geometry is not plotted

- **WHEN** the SVG contains hidden geometry — elements (or ancestor groups) with `display:none`, `visibility:hidden`, or `opacity:0`, or geometry inside definition containers (`defs`, `clipPath`, `symbol`, `mask`, `marker`, `pattern`)
- **THEN** that geometry is skipped and does not appear in the imported artwork or the plot, matching what a browser actually renders

### Requirement: Real-world sizing from the SVG

The system SHALL determine the artwork's real-world size in millimeters using the SVG's `viewBox` and width/height, so a known-size SVG imports at a sensible default scale.

#### Scenario: Sized SVG imports at correct mm

- **WHEN** an SVG declares its dimensions (e.g. via `viewBox` + mm width/height)
- **THEN** the imported artwork's default size in millimeters matches those dimensions

### Requirement: Stroke-based scope

The system SHALL treat strokes/outlines as the drawable geometry for this change. Fills (hatching), `<text>` outlining, and clipping are explicitly NOT converted and SHALL be ignored without error; the app SHOULD indicate when content was skipped.

#### Scenario: Fills and text are skipped, not fatal

- **WHEN** an SVG contains filled regions or `<text>` elements
- **THEN** the app imports the stroke geometry it can plot, skips the rest, and surfaces a note that some content was not converted

#### Scenario: A fully fill-based SVG is guided to PNG import

- **WHEN** an SVG has no usable stroke geometry (e.g. a potrace-style fill-only trace)
- **THEN** the app reports that the SVG is fill-based and suggests exporting/importing it as a PNG (which is traced into outlines), rather than failing silently

<!-- Deferred: tracing the outlines of filled SVG paths directly (requires fixing
relative-subpath splitting and tiny-contour dropping in the flattener). For now,
fill-based art is handled via the PNG import path. -->

