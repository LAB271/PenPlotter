import { describe, expect, it } from 'vitest';
import { applyDetail, detailParams, polylineLength } from '../detail';
import type { Polyline } from '../types';

describe('detailParams', () => {
  it('is full-fidelity at 1 (no culling, tiny epsilon)', () => {
    const p = detailParams(1);
    expect(p.minLenMm).toBe(0);
    expect(p.epsilonMm).toBeLessThan(0.1);
  });

  it('gets more aggressive as detail drops (bigger epsilon and min length)', () => {
    const hi = detailParams(0.8);
    const lo = detailParams(0.2);
    expect(lo.epsilonMm).toBeGreaterThan(hi.epsilonMm);
    expect(lo.minLenMm).toBeGreaterThan(hi.minLenMm);
  });
});

describe('polylineLength', () => {
  it('sums segment lengths', () => {
    expect(
      polylineLength([
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 4 },
      ]),
    ).toBeCloseTo(7, 6);
  });
});

describe('applyDetail', () => {
  const long: Polyline = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
  ]; // 50mm
  const tiny: Polyline = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ]; // 1mm

  it('keeps everything at full detail', () => {
    const out = applyDetail([long, tiny], 1);
    expect(out).toHaveLength(2);
  });

  it('drops strokes shorter than the min length at low detail', () => {
    const out = applyDetail([long, tiny], 0.2); // minLen ~19mm → tiny dropped
    expect(out).toHaveLength(1);
    expect(polylineLength(out[0])).toBeCloseTo(50, 6);
  });
});
