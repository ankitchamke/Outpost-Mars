/**
 * OUTPOST: MARS — Building Hit Areas & Interaction Geometry
 * Defines precise normalized polygon geometry for all 5 canonical outpost structures,
 * eliminating oversized rectangular hitboxes, transparent padding collisions, and
 * accidental cross-building clicks on desktop.
 */
import type Phaser from 'phaser';

export interface NormalizedPoint {
  x: number;
  y: number;
}

/**
 * Normalized polygon vertices (0.0 to 1.0) mapped against visible building pixels.
 * Zero corners are enclosed; transparent margins are completely excluded.
 */
export const NORMALIZED_BUILDING_POLYGONS: Record<string, NormalizedPoint[]> = {
  habitat: [
    { x: 0.500, y: 0.068 },
    { x: 0.765, y: 0.172 },
    { x: 0.838, y: 0.294 },
    { x: 0.988, y: 0.498 },
    { x: 0.994, y: 0.837 },
    { x: 0.721, y: 0.973 },
    { x: 0.279, y: 0.973 },
    { x: 0.006, y: 0.837 },
    { x: 0.012, y: 0.498 },
    { x: 0.162, y: 0.294 },
    { x: 0.235, y: 0.172 },
  ],
  mission_control: [
    { x: 0.505, y: 0.044 },
    { x: 0.749, y: 0.098 },
    { x: 0.788, y: 0.244 },
    { x: 0.801, y: 0.439 },
    { x: 0.892, y: 0.586 },
    { x: 0.950, y: 0.762 },
    { x: 0.925, y: 0.859 },
    { x: 0.814, y: 0.957 },
    { x: 0.111, y: 0.957 },
    { x: 0.088, y: 0.781 },
    { x: 0.104, y: 0.684 },
    { x: 0.140, y: 0.537 },
    { x: 0.326, y: 0.371 },
    { x: 0.400, y: 0.195 },
    { x: 0.449, y: 0.098 },
  ],
  solar_farm: [
    { x: 0.868, y: 0.027 },
    { x: 0.882, y: 0.323 },
    { x: 0.956, y: 0.538 },
    { x: 0.997, y: 0.753 },
    { x: 0.882, y: 0.941 },
    { x: 0.529, y: 0.995 },
    { x: 0.221, y: 0.995 },
    { x: 0.000, y: 0.753 },
    { x: 0.044, y: 0.538 },
    { x: 0.118, y: 0.323 },
    { x: 0.221, y: 0.108 },
    { x: 0.529, y: 0.054 },
  ],
  greenhouse: [
    { x: 0.716, y: 0.049 },
    { x: 0.736, y: 0.244 },
    { x: 0.781, y: 0.391 },
    { x: 0.872, y: 0.488 },
    { x: 0.900, y: 0.684 },
    { x: 0.885, y: 0.801 },
    { x: 0.618, y: 0.947 },
    { x: 0.391, y: 0.947 },
    { x: 0.143, y: 0.830 },
    { x: 0.050, y: 0.684 },
    { x: 0.091, y: 0.488 },
    { x: 0.130, y: 0.391 },
    { x: 0.270, y: 0.293 },
    { x: 0.335, y: 0.195 },
    { x: 0.488, y: 0.146 },
  ],
  storm_shelter: [
    { x: 0.755, y: 0.059 },
    { x: 0.781, y: 0.244 },
    { x: 0.788, y: 0.391 },
    { x: 0.846, y: 0.488 },
    { x: 0.892, y: 0.586 },
    { x: 0.947, y: 0.684 },
    { x: 0.967, y: 0.781 },
    { x: 0.833, y: 0.928 },
    { x: 0.101, y: 0.928 },
    { x: 0.018, y: 0.781 },
    { x: 0.051, y: 0.684 },
    { x: 0.104, y: 0.586 },
    { x: 0.150, y: 0.488 },
    { x: 0.215, y: 0.342 },
    { x: 0.391, y: 0.244 },
  ],
};

/**
 * Returns pixel-space polygon points for a sprite with given texture dimensions.
 */
export function getBuildingPolygonPoints(
  buildingId: string,
  textureWidth: number,
  textureHeight: number
): { x: number; y: number }[] {
  const normPoints = NORMALIZED_BUILDING_POLYGONS[buildingId];
  if (!normPoints || normPoints.length === 0) {
    // Proportional fallback (centered rectangle 80% w, 70% h)
    const insetX = textureWidth * 0.1;
    const insetY = textureHeight * 0.15;
    return [
      { x: insetX, y: insetY },
      { x: textureWidth - insetX, y: insetY },
      { x: textureWidth - insetX, y: textureHeight - insetY },
      { x: insetX, y: textureHeight - insetY },
    ];
  }

  return normPoints.map((p) => ({
    x: Math.round(p.x * textureWidth),
    y: Math.round(p.y * textureHeight),
  }));
}

/**
 * Pure 2D ray-casting point-in-polygon test.
 */
export function isPointInPolygon(
  x: number,
  y: number,
  points: { x: number; y: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Tests whether normalized coordinates (0..1) fall within the building's visible polygon.
 */
export function isPointInsideBuildingPolygon(
  buildingId: string,
  normX: number,
  normY: number
): boolean {
  const poly = NORMALIZED_BUILDING_POLYGONS[buildingId];
  if (!poly) return false;
  return isPointInPolygon(normX, normY, poly);
}

/**
 * Tests whether a point in world coordinates falls within a building's visible structure.
 */
export function isWorldPointInsideBuilding(
  buildingId: string,
  buildingCenter: { x: number; y: number },
  displayWidth: number,
  displayHeight: number,
  worldX: number,
  worldY: number
): boolean {
  const left = buildingCenter.x - displayWidth / 2;
  const top = buildingCenter.y - displayHeight / 2;
  const normX = (worldX - left) / displayWidth;
  const normY = (worldY - top) / displayHeight;

  if (normX < 0 || normX > 1 || normY < 0 || normY > 1) {
    return false;
  }

  return isPointInsideBuildingPolygon(buildingId, normX, normY);
}

/**
 * Configures a Phaser Sprite with an explicit, tight polygon hit area.
 * Phaser automatically scales and transforms pointer world coordinates
 * into local texture coordinates before passing them to the hitAreaCallback.
 * useHandCursor is set to false so hovering does not mislead the player
 * into thinking buildings can be clicked remotely to open.
 */
export function applyBuildingHitArea(
  sprite: Phaser.GameObjects.Sprite,
  buildingId: string,
  useHandCursor = false
): void {
  const points = getBuildingPolygonPoints(buildingId, sprite.width, sprite.height);

  sprite.setInteractive({
    hitArea: points,
    hitAreaCallback: (hitArea: unknown, x: number, y: number) => {
      return isPointInPolygon(x, y, hitArea as { x: number; y: number }[]);
    },
    useHandCursor,
  });
}

/** Maximum interaction distance in world pixels from the building bounding box */
export const INTERACTION_MAX_DISTANCE = 80;

export interface AABB {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Calculates the shortest Euclidean distance from a point (e.g. astronaut)
 * to an axis-aligned bounding box (AABB).
 * Returns 0 if the point is inside the box.
 */
export function calculateDistanceToAABB(
  point: { x: number; y: number },
  bounds: AABB
): number {
  const dx = Math.max(bounds.left - point.x, 0, point.x - bounds.right);
  const dy = Math.max(bounds.top - point.y, 0, point.y - bounds.bottom);
  return Math.hypot(dx, dy);
}

/**
 * Finds the single authoritative nearby building within maxDistance.
 * If multiple buildings are within range (overlapping interaction radii),
 * resolves deterministically to the strictly closer one, using building ID
 * alphabetical order as a deterministic tie-breaker.
 */
export function resolveNearbyBuilding<T extends { id: string }>(
  buildings: Array<{ building: T; bounds: AABB }>,
  astronautPos: { x: number; y: number },
  maxDistance = INTERACTION_MAX_DISTANCE
): T | undefined {
  let nearest: T | undefined;
  let nearestDistance = maxDistance;

  for (const item of buildings) {
    const distance = calculateDistanceToAABB(astronautPos, item.bounds);
    if (distance <= maxDistance) {
      if (distance < nearestDistance) {
        nearest = item.building;
        nearestDistance = distance;
      } else if (distance === nearestDistance && nearest) {
        // Deterministic tie-breaker for identical distances
        if (item.building.id.localeCompare(nearest.id) < 0) {
          nearest = item.building;
        }
      } else if (!nearest) {
        nearest = item.building;
        nearestDistance = distance;
      }
    }
  }

  return nearest;
}
