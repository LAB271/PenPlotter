## Why

The two prior changes made the machine controllable (`plotter-control-core`) and gave it a fixed, repeatable origin (`machine-origin`). But the actual goal — uploading an SVG, placing it on the page, and plotting it — still isn't possible. This change delivers that: the milestone where the app becomes the tool it was conceived as. It also replaces the deliberately-bare control panel with the clean, professional interface the user wants.

All the groundwork is in place: the streaming engine, live status (`WPos` ~10 Hz), and the empirically-confirmed coordinate facts from `machine-origin` (`$22=0` → manual top-left work zero; `machineX = artworkX`, `machineY = −artworkY`).

## What Changes

- **Professional UI shell (Tailwind + Radix):** a clean layout — top bar (connection, home/set-zero, paper size, Plot), left & right setting/slider panels, a central "drawing table", and a bottom status strip. Replaces the unstyled control-core panel.
- **SVG import:** upload an SVG, parse it in the browser (DOM `getPointAtLength` + `getCTM`, zero dependencies), and flatten all stroke geometry into polylines at a configurable tolerance (mm).
- **Artwork layout on a visualized page:** render the bed → paper → artwork. Choose paper size (A4–A0), anchored at the top-left corner. Drag, scale, and rotate the artwork; quick **fit-to-corner** and **fit-to-paper**. Clamp/warn when artwork exceeds the work area. The canvas renders the **flattened pen-path (WYSIWYG)** so what you see is what plots.
- **G-code generation:** convert the placed polylines to G-code in **work coordinates** using the hardware-confirmed identity mapping (`machineX = x, machineY = y` — no flip; machine +Y is physically down the page), pen up/down via the calibrated Z, dwell, and configurable draw/travel feed rates.
- **Live plot monitoring:** a **pen-position marker** on the canvas driven by `WPos`, a **progress bar** driven by the engine's `streamProgress`, live state/position readout, and pause/stop controls.

Out of scope (deferred): path optimization (stroke reordering / line-merge to cut pen-up travel), multi-color layers, SVG fill-outline tracing, text-to-path, and the Raspberry Pi gateway.

### Enhancements (added after the first hardware session)

After getting the base pipeline onto hardware, the operator asked for a few more things, folded into this change:

- **Multiple artworks per page:** add/select/remove several SVGs or images on the same paper; Plot emits G-code for all of them.
- **PNG/JPEG import:** raster images are rasterized and traced into pen strokes by grayscale **iso-contours** (marching squares) — a line-drawing of the dark regions — feeding the same placement/G-code pipeline. This is the practical route for fill-based art (e.g. a potrace SVG that has no strokes): import it as PNG. Threshold/levels controls tune the trace.
- **90° rotate + rotation-aware fit:** a rotate-90° button, with fit-to-paper/fit-to-corner anchoring/scaling the artwork's *rotated* bounding box.
- **Stop returns home:** Stop aborts the run, lifts the pen, and returns to work zero (the paper corner — homing stays disabled, `$22=0`), ready to re-Plot.

## Capabilities

### New Capabilities
- `svg-import`: Loading an SVG and converting its stroke geometry into plottable polylines in millimeters (browser DOM parsing, curve flattening, viewBox/unit handling). A fully fill-based SVG is steered to PNG import.
- `png-import`: Loading a raster image (PNG/JPEG) and tracing it into plottable polylines via grayscale iso-contours (marching squares), with threshold/levels controls.
- `artwork-layout`: Placing artwork on a visualized page — paper-size selection anchored at the top-left corner, drag/scale/rotate, fit-to-corner/fit-to-paper, work-area clamping, and WYSIWYG pen-path rendering. Supports multiple artworks on one page and a 90° rotate with rotation-aware fitting.
- `gcode-generation`: Producing G-code in work coordinates from placed polylines — the hardware-confirmed identity mapping, pen up/down + dwell, and draw/travel feed rates.
- `plot-monitoring`: Live feedback during a plot — the pen-position marker on the canvas, progress bar, state/position readout, and pause/resume/stop controls (Stop returns the pen to the work origin, ready to re-plot).

### Modified Capabilities
<!-- None. Reuses gcode-streaming, machine-status, manual-control, and work-coordinates unchanged; this change builds views and producers on top of them. -->

## Impact

- **New browser dependencies:** Tailwind (styling), Radix primitives (accessible controls), Konva/react-konva (canvas transform handles). All browser-only — the `src/grbl` engine stays dependency-free and Pi-portable.
- **UI replaced:** the control-core panel is restructured into the professional layout; existing engine wiring is reused.
- **New browser-side modules:** SVG import/flatten, artwork model + transforms, G-code generator. None run on the Pi (conversion is a browser concern).
- **No engine changes** beyond possibly small helpers; streaming/status/transport untouched.
- **Hardware** needed to verify a real SVG plots correctly oriented on paper.
