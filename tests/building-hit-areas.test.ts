import { describe, expect, it } from 'vitest';
import {
  NORMALIZED_BUILDING_POLYGONS,
  getBuildingPolygonPoints,
  isPointInsideBuildingPolygon,
  isWorldPointInsideBuilding,
} from '../src/game/building-hit-areas';

describe('Building Hit Areas & Interaction Geometry', () => {
  const CANONICAL_BUILDING_IDS = [
    'habitat',
    'mission_control',
    'solar_farm',
    'greenhouse',
    'storm_shelter',
  ];

  it('defines normalized polygons for all five canonical buildings', () => {
    for (const id of CANONICAL_BUILDING_IDS) {
      const polygon = NORMALIZED_BUILDING_POLYGONS[id];
      expect(polygon, `Polygon for ${id} must exist`).toBeDefined();
      expect(polygon.length).toBeGreaterThanOrEqual(8);
      // All vertices must be normalized within [0, 1]
      for (const pt of polygon) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(1);
        expect(pt.y).toBeGreaterThanOrEqual(0);
        expect(pt.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('verifies that building centers are inside their visible polygons', () => {
    // Normal building centers around normalized (0.5, 0.5)
    for (const id of CANONICAL_BUILDING_IDS) {
      const isInside = isPointInsideBuildingPolygon(id, 0.5, 0.5);
      expect(isInside, `${id} center should be inside its hit polygon`).toBe(true);
    }
  });

  it('ensures all four outer corners (transparent padding) are strictly outside the hit area', () => {
    const corners = [
      { x: 0.01, y: 0.01 }, // Top-left
      { x: 0.99, y: 0.01 }, // Top-right
      { x: 0.01, y: 0.99 }, // Bottom-left
      { x: 0.99, y: 0.99 }, // Bottom-right
    ];

    for (const id of CANONICAL_BUILDING_IDS) {
      for (const corner of corners) {
        const hit = isPointInsideBuildingPolygon(id, corner.x, corner.y);
        expect(hit, `Corner (${corner.x}, ${corner.y}) must be outside ${id} hit area`).toBe(false);
      }
    }
  });

  it('generates pixel-space polygon points mapped to sprite texture dimensions', () => {
    const habitatPoints = getBuildingPolygonPoints('habitat', 340, 221);
    expect(habitatPoints.length).toBe(NORMALIZED_BUILDING_POLYGONS.habitat.length);
    for (const pt of habitatPoints) {
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.x).toBeLessThanOrEqual(340);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeLessThanOrEqual(221);
    }
  });

  it('provides safe proportional fallback for unknown or procedural texture dimensions', () => {
    const fallbackPoints = getBuildingPolygonPoints('custom_unknown_structure', 200, 100);
    expect(fallbackPoints.length).toBe(4);
    expect(fallbackPoints[0]).toEqual({ x: 20, y: 15 });
    expect(fallbackPoints[2]).toEqual({ x: 180, y: 85 });
  });

  describe('World Coordinate Hit Detection & Separation', () => {
    const WORLD_CENTERS = {
      habitat: { x: 1000, y: 750, width: 361.76, height: 235.14 },
      mission_control: { x: 620, y: 500, width: 340.48, height: 226.98 },
      solar_farm: { x: 1450, y: 520, width: 340.48, height: 186.26 },
      greenhouse: { x: 550, y: 1000, width: 340.48, height: 226.98 },
      storm_shelter: { x: 1420, y: 1000, width: 340.48, height: 226.98 },
    };

    it('identifies clicks directly on each building in world coordinates', () => {
      for (const [id, data] of Object.entries(WORLD_CENTERS)) {
        const hit = isWorldPointInsideBuilding(
          id,
          { x: data.x, y: data.y },
          data.width,
          data.height,
          data.x,
          data.y
        );
        expect(hit, `World point (${data.x}, ${data.y}) should hit ${id}`).toBe(true);
      }
    });

    it('ensures clicks on one building do NOT activate any other building', () => {
      for (const [targetId, targetData] of Object.entries(WORLD_CENTERS)) {
        for (const [otherId, otherData] of Object.entries(WORLD_CENTERS)) {
          if (targetId === otherId) continue;
          const hit = isWorldPointInsideBuilding(
            otherId,
            { x: otherData.x, y: otherData.y },
            otherData.width,
            otherData.height,
            targetData.x,
            targetData.y
          );
          expect(hit, `Clicking ${targetId} must NOT register on ${otherId}`).toBe(false);
        }
      }
    });

    it('ensures clicks between Mission Control and Habitat do NOT activate either building', () => {
      // Space between Mission Control (right ~790) and Habitat (left ~819) around y = 600
      const corridorX = 805;
      const corridorY = 600;

      const hitHab = isWorldPointInsideBuilding(
        'habitat',
        { x: WORLD_CENTERS.habitat.x, y: WORLD_CENTERS.habitat.y },
        WORLD_CENTERS.habitat.width,
        WORLD_CENTERS.habitat.height,
        corridorX,
        corridorY
      );
      const hitMC = isWorldPointInsideBuilding(
        'mission_control',
        { x: WORLD_CENTERS.mission_control.x, y: WORLD_CENTERS.mission_control.y },
        WORLD_CENTERS.mission_control.width,
        WORLD_CENTERS.mission_control.height,
        corridorX,
        corridorY
      );

      expect(hitHab).toBe(false);
      expect(hitMC).toBe(false);
    });

    it('ensures clicks on empty terrain (distant crater or dunes) hit no buildings', () => {
      const terrainPoints = [
        { x: 1000, y: 1300 }, // South crater basin
        { x: 200, y: 200 },   // Northwest rocks
        { x: 1800, y: 300 },  // Northeast dunes
        { x: 1000, y: 100 },  // North ridge
      ];

      for (const pt of terrainPoints) {
        for (const [id, data] of Object.entries(WORLD_CENTERS)) {
          const hit = isWorldPointInsideBuilding(
            id,
            { x: data.x, y: data.y },
            data.width,
            data.height,
            pt.x,
            pt.y
          );
          expect(hit, `Empty terrain (${pt.x}, ${pt.y}) must not hit ${id}`).toBe(false);
        }
      }
    });
  });
});
