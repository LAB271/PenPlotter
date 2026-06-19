import { describe, expect, it } from 'vitest';
import { adjustValue, isoContours, traceField, type FieldSource } from '../raster';

// Field convention: value <= level is "inked" (dark). 0 = black, 1 = white.
describe('isoContours (marching squares)', () => {
  it('returns nothing for a uniform field', () => {
    const field = new Array(16).fill(1); // all white
    expect(isoContours(field, 4, 4, 0.5)).toEqual([]);
  });

  it('traces a closed loop around a dark island', () => {
    // 5x5 grid, dark (0) center cell at (2,2), white (1) elsewhere.
    const w = 5,
      h = 5;
    const field = new Array(w * h).fill(1);
    field[2 * w + 2] = 0;
    const contours = isoContours(field, w, h, 0.5);
    expect(contours).toHaveLength(1);
    const loop = contours[0];
    // A loop: at least 4 crossing points and first ≈ last.
    expect(loop.length).toBeGreaterThanOrEqual(4);
    const a = loop[0];
    const b = loop[loop.length - 1];
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1e-6);
    // Contour should hug the dark cell (around x,y in [1.5, 2.5]).
    for (const p of loop) {
      expect(p.x).toBeGreaterThanOrEqual(1.5 - 1e-6);
      expect(p.x).toBeLessThanOrEqual(2.5 + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(1.5 - 1e-6);
      expect(p.y).toBeLessThanOrEqual(2.5 + 1e-6);
    }
  });

  it('interpolates the crossing position by the threshold', () => {
    // 2x2: left column black (0), right column white (1). Crossing at x where 0..1 = level.
    const field = [0, 1, 0, 1];
    const contours = isoContours(field, 2, 2, 0.25);
    expect(contours).toHaveLength(1);
    for (const p of contours[0]) {
      expect(p.x).toBeCloseTo(0.25, 6); // (level - 0)/(1 - 0)
    }
  });

  it('separates two disjoint dark islands into two contours', () => {
    const w = 7,
      h = 5;
    const field = new Array(w * h).fill(1);
    field[2 * w + 1] = 0;
    field[2 * w + 5] = 0;
    expect(isoContours(field, w, h, 0.5)).toHaveLength(2);
  });
});

describe('adjustValue (invert + contrast)', () => {
  it('is identity at invert=false, contrast=1', () => {
    expect(adjustValue(0.2, false, 1)).toBeCloseTo(0.2, 9);
    expect(adjustValue(0.8, false, 1)).toBeCloseTo(0.8, 9);
  });

  it('inverts around 1', () => {
    expect(adjustValue(0.2, true, 1)).toBeCloseTo(0.8, 9);
  });

  it('contrast scales around mid-grey and clamps to 0..1', () => {
    expect(adjustValue(0.4, false, 2)).toBeCloseTo(0.3, 9); // (0.4-0.5)*2+0.5
    expect(adjustValue(0, false, 3)).toBe(0); // (0-0.5)*3+0.5 = -1 → clamped
    expect(adjustValue(1, false, 3)).toBe(1); // clamped high
  });
});

describe('traceField', () => {
  // 5x5 white field with a dark center cell (the isoContours fixture, as a source).
  const darkCenter = (): FieldSource => {
    const gw = 5,
      gh = 5;
    const field = new Float32Array(gw * gh).fill(1);
    field[2 * gw + 2] = 0;
    return { field, gw, gh, mmPerGrid: 1 };
  };

  it('traces a dark region into mm-sized polylines', () => {
    const { artwork } = traceField(darkCenter(), { threshold: 0.5, levels: 1, toleranceMm: 0.01 });
    expect(artwork.polylines.length).toBeGreaterThanOrEqual(1);
    expect(artwork.widthMm).toBeGreaterThan(0);
    expect(artwork.heightMm).toBeGreaterThan(0);
  });

  it('is deterministic and does not mutate the source field', () => {
    const src = darkCenter();
    const before = Array.from(src.field);
    const a = traceField(src, { threshold: 0.5, levels: 1, toleranceMm: 0.01, contrast: 2 });
    const b = traceField(src, { threshold: 0.5, levels: 1, toleranceMm: 0.01, contrast: 2 });
    expect(a.artwork.polylines.length).toBe(b.artwork.polylines.length);
    expect(Array.from(src.field)).toEqual(before); // invert/contrast worked on a copy
  });

  it('invert flips a light-on-dark source back to a dark-on-light trace', () => {
    const plain = traceField(darkCenter(), { threshold: 0.5, levels: 1, toleranceMm: 0.01 });
    // Inverse source: dark field with a light center.
    const gw = 5,
      gh = 5;
    const field = new Float32Array(gw * gh).fill(0);
    field[2 * gw + 2] = 1;
    const inv = traceField(
      { field, gw, gh, mmPerGrid: 1 },
      { threshold: 0.5, levels: 1, toleranceMm: 0.01, invert: true },
    );
    expect(inv.artwork.polylines.length).toBe(plain.artwork.polylines.length);
  });
});
