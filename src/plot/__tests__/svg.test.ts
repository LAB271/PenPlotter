import { describe, expect, it } from 'vitest';
import { simplifyPolyline } from '../svg';

describe('simplifyPolyline', () => {
  it('collapses collinear points within tolerance', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 1, y: 0.01 },
      { x: 2, y: 0 },
      { x: 3, y: 0.01 },
      { x: 4, y: 0 },
    ];
    const out = simplifyPolyline(line, 0.1);
    expect(out).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('keeps points that deviate beyond tolerance (a real corner)', () => {
    const corner = [
      { x: 0, y: 0 },
      { x: 5, y: 5 }, // significant deviation from the 0,0→10,0 chord
      { x: 10, y: 0 },
    ];
    const out = simplifyPolyline(corner, 0.1);
    expect(out).toHaveLength(3);
  });

  it('leaves short polylines untouched', () => {
    const seg = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(simplifyPolyline(seg, 0.5)).toEqual(seg);
  });
});
