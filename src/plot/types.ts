/** A point in paper millimeters, with the TOP-LEFT corner as origin (Y down). */
export interface Point {
  x: number;
  y: number;
}

/** A connected pen-down stroke (a sequence of straight segments). */
export type Polyline = Point[];

/** Imported, flattened artwork in paper millimeters. */
export interface Artwork {
  polylines: Polyline[];
  /** Intrinsic size in mm (from the SVG viewBox/dimensions). */
  widthMm: number;
  heightMm: number;
}

/** Placement of artwork on the page: local origin at (x,y) mm, scaled, rotated. */
export interface Placement {
  x: number;
  y: number;
  scale: number;
  rotation: number; // degrees
}
