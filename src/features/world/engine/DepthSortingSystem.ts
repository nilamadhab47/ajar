/**
 * Depth bands. Anything that stands on the floor is Y-sorted inside the SORTED
 * band, so a character north of a desk is drawn behind it and one south of it
 * in front.
 */
export const Depth = {
  ground: 0,
  floorDecor: 1,
  rugs: 2,
  walls: 3,
  flat: 5,
  rings: 8,
  shadows: 9,
  sorted: 10,
  foreground: 5000,
  effects: 6000,
  overlay: 7000,
  labels: 8000,
  nameplates: 9000,
} as const;

/** Depth for something whose base (feet / footprint bottom) is at world y. */
export const sortedDepth = (baseY: number, bias = 0): number => Depth.sorted + baseY + bias;
