/** Tunable world behaviour. Product defaults, not fixed rules. */
export const WORLD_CONFIG = {
  tileSize: 32,
  walkSpeed: 150,
  runMultiplier: 1.7,
  /** Half-width / height of the collision box at the character's feet. */
  bodyHalfWidth: 7,
  bodyHeight: 8,
  camera: { defaultZoom: 1.5, zoomLevels: [0.5, 0.75, 1, 1.5, 2, 3], followLerp: 0.12, compactNameplateZoom: 0.75 },
  interaction: { defaultRangeTiles: 1.5 },
  /** Knock range. Walking into range never opens a microphone. */
  proximity: { discoveryTiles: 5, closeTiles: 2, quietTiles: 1 },
  /** Demo cool-off after a declined knock. The real server uses 10 minutes. */
  knock: { demoCooloffMs: 20_000 },
  network: { movementHz: 12, interpolationDelayMs: 140 },
  nearbyChat: { bubbleMs: 5000, maxLength: 120 },
  emoteMs: 2200,
  actionMs: 2600,
} as const;

export const BRAND = {
  product: "Ajar",
  descriptor: "A quiet office for remote teams",
  tagline: "Be around, on your terms.",
} as const;
