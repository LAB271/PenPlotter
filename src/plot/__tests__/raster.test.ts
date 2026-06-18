import { describe, expect, it } from 'vitest';
import { isoContours } from '../raster';

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
