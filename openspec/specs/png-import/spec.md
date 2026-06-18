# png-import

## Purpose

Load raster images (PNG/JPEG) in the browser and trace grayscale brightness iso-contours into plottable polylines, feeding the same placement and G-code pipeline as imported SVGs. Threshold and levels controls govern how the image is traced.

## Requirements

### Requirement: Load a raster image

The system SHALL let the operator load a raster image (PNG/JPEG) from disk and process it in the browser without uploading it to any server.

#### Scenario: Load an image

- **WHEN** the operator selects a PNG/JPEG file
- **THEN** the app rasterizes it and makes its traced geometry available for placement on the page

#### Scenario: Unreadable image

- **WHEN** the file cannot be decoded as an image
- **THEN** the app reports a clear message and does not crash or leave a partial artwork

### Requirement: Trace the image into plottable polylines

The system SHALL convert a raster image into polylines a pen plotter can draw, by reading its grayscale and tracing brightness iso-contours (marching squares) into closed/open polylines. The result is the outline of the dark regions — a line drawing — not a filled image.

#### Scenario: Image becomes a line drawing

- **WHEN** an image is traced
- **THEN** the produced artwork is a set of polylines outlining the dark regions, suitable for pen plotting, and feeds the same placement/G-code pipeline as imported SVGs

#### Scenario: Blank or no-contrast image

- **WHEN** an image yields no contours at the chosen threshold
- **THEN** the app reports that no contours were found and suggests adjusting the threshold or using a higher-contrast image

### Requirement: Tracing controls

The system SHALL expose a darkness **threshold** (0–1) and a number of brightness **levels** (1 = a single outline; more = nested contours that read as tonal shading). These SHALL be persisted and applied to subsequently imported images.

#### Scenario: Threshold and levels affect the trace

- **WHEN** the operator changes the threshold or levels and imports an image
- **THEN** a higher threshold inks more of the image, and more levels add nested tonal contours
