/**
 * Per-artwork drawing controls. Two stages:
 *  - "source" controls (PNG: threshold/levels/invert/contrast; SVG: samplingMm)
 *    re-derive the master geometry from the retained source — expensive, debounced.
 *  - "geometry" controls (detail) thin the master live — cheap, immediate.
 * Centralised here so the defaults and slider ranges live in one place.
 */
export interface ArtControls {
  /** PNG: darkness cutoff 0..1 (pixels darker than this are inked). */
  threshold: number;
  /** PNG: number of brightness contours (1 = outline, more = tonal shading). */
  levels: number;
  /** PNG: invert dark/light before tracing. */
  invert: boolean;
  /** PNG: contrast multiplier around mid-grey (1 = unchanged). */
  contrast: number;
  /** SVG: curve flattening tolerance in mm (smaller = finer sampling). */
  samplingMm: number;
  /** Shared: level of detail 0..1 (1 = full, 0 = most simplified). */
  detail: number;
}

export const DEFAULT_CONTROLS: ArtControls = {
  threshold: 0.5,
  levels: 1,
  invert: false,
  contrast: 1,
  samplingMm: 0.2,
  detail: 1,
};

/** Source-stage keys — changing one re-derives the master (debounced). */
export const SOURCE_KEYS: (keyof ArtControls)[] = [
  'threshold',
  'levels',
  'invert',
  'contrast',
  'samplingMm',
];

export interface SliderRange {
  min: number;
  max: number;
  step: number;
}

/** Slider ranges (the numeric box may still accept values beyond these). */
export const CONTROL_RANGES: Record<
  'threshold' | 'levels' | 'contrast' | 'samplingMm' | 'detail',
  SliderRange
> = {
  threshold: { min: 0.05, max: 0.95, step: 0.01 },
  levels: { min: 1, max: 6, step: 1 },
  contrast: { min: 0.5, max: 3, step: 0.05 },
  samplingMm: { min: 0.01, max: 3, step: 0.01 },
  detail: { min: 0, max: 1, step: 0.01 },
};

/** Fill any missing fields with defaults (migrates sessions saved before controls existed). */
export function normalizeControls(c: Partial<ArtControls> | undefined): ArtControls {
  return { ...DEFAULT_CONTROLS, ...(c ?? {}) };
}
