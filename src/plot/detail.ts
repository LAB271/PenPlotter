import type { Polyline } from './types';
import { simplifyPolyline } from './svg';

/**
 * Detail level in 0..1 (1 = full detail, 0 = most aggressive). Maps to two
 * knobs: `epsilonMm` (Douglas–Peucker simplification — thins points within a
 * stroke) and `minLenMm` (drop whole strokes shorter than this — removes fine
 * speckle and, crucially, the pen lifts that make a plot slow).
 */
export function detailParams(d: number): { epsilonMm: number; minLenMm: number } {
  const t = Math.min(1, Math.max(0, d));
  const k = (1 - t) * (1 - t); // ease: 0 at full detail, 1 at most aggressive
  return { epsilonMm: 0.08 + k * 5, minLenMm: k * 30 };
}

/** Total length (mm) of a polyline. */
export function polylineLength(poly: Polyline): number {
  let len = 0;
  for (let i = 1; i < poly.length; i++) {
    len += Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y);
  }
  return len;
}

/**
 * Reduce full-detail polylines to a chosen level of detail: drop strokes below
 * the minimum length, then simplify the rest. Pure — drives the live preview
 * and the plotted output from the same stored master geometry.
 */
export function applyDetail(polylines: Polyline[], d: number): Polyline[] {
  const { epsilonMm, minLenMm } = detailParams(d);
  const out: Polyline[] = [];
  for (const poly of polylines) {
    if (minLenMm > 0 && polylineLength(poly) < minLenMm) continue;
    const s = simplifyPolyline(poly, epsilonMm);
    if (s.length >= 2) out.push(s);
  }
  return out;
}
