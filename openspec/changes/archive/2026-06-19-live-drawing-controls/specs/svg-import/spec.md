## MODIFIED Requirements

### Requirement: Flatten geometry to polylines

The system SHALL convert the SVG's stroke geometry into polylines (sequences of straight segments), flattening curves and arcs at a tolerance expressed in millimeters. This tolerance SHALL be an **operator-controlled, live, per-artwork** setting (a sampling/smoothness control) rather than a fixed import-time constant: changing it re-flattens the placed SVG in place and updates the preview without re-importing, and each placed SVG carries and persists its own value. It MUST bake in element transforms so nested/grouped geometry is positioned correctly.

#### Scenario: Curves are flattened within tolerance

- **WHEN** an SVG contains Bézier/arc paths
- **THEN** they are sampled into polylines whose deviation from the true curve is within the configured tolerance

#### Scenario: Adjusting sampling re-flattens live

- **WHEN** the operator changes the sampling tolerance of a placed SVG artwork
- **THEN** the SVG re-flattens at the new tolerance (finer or coarser) and the preview updates without re-importing the file

#### Scenario: Nested transforms are applied

- **WHEN** geometry sits inside transformed groups
- **THEN** the resulting polylines reflect the cumulative transform (position/scale/rotation) of each element

#### Scenario: Hidden geometry is not plotted

- **WHEN** the SVG contains hidden geometry — elements (or ancestor groups) with `display:none`, `visibility:hidden`, or `opacity:0`, or geometry inside definition containers (`defs`, `clipPath`, `symbol`, `mask`, `marker`, `pattern`)
- **THEN** that geometry is skipped and does not appear in the imported artwork or the plot, matching what a browser actually renders
