import { describe, expect, it } from 'vitest';
import { isSolidVoxel, TUNNELS, tunnelBounds, voxelDensity } from '../src/sim/voxel';
import { terrainHeight } from '../src/sim/world';

describe('voxel density field', () => {
  it('matches the existing heightfield outdoors, away from any tunnel', () => {
    const seed = 1;
    const x = -400;
    const z = -400; // far from the authored tunnel
    const surface = terrainHeight(x, z, seed);
    expect(voxelDensity(x, surface - 1, z, seed)).toBeLessThan(0);
    expect(voxelDensity(x, surface + 1, z, seed)).toBeGreaterThan(0);
    expect(isSolidVoxel(x, surface - 1, z, seed)).toBe(true);
    expect(isSolidVoxel(x, surface + 1, z, seed)).toBe(false);
  });

  it('is a pure function: same inputs always give the same density', () => {
    const seed = 7;
    const a = voxelDensity(12.34, -1.2, 56.78, seed);
    const b = voxelDensity(12.34, -1.2, 56.78, seed);
    expect(a).toBe(b);
  });

  it('carves open air at the center of an authored tunnel waypoint', () => {
    const seed = 1;
    const tunnel = TUNNELS[0];
    const mid = tunnel.waypoints[1];
    expect(voxelDensity(mid.x, mid.y, mid.z, seed)).toBeGreaterThan(0);
    expect(isSolidVoxel(mid.x, mid.y, mid.z, seed)).toBe(false);
  });

  it('stays solid well outside a tunnel waypoint radius', () => {
    const seed = 1;
    const tunnel = TUNNELS[0];
    const far = tunnel.waypoints[1];
    expect(isSolidVoxel(far.x + far.radius + 20, far.y, far.z, seed)).toBe(true);
  });

  it('reports a finite bounding box that contains every waypoint', () => {
    const b = tunnelBounds(TUNNELS[0]);
    for (const w of TUNNELS[0].waypoints) {
      expect(w.x).toBeGreaterThanOrEqual(b.minX);
      expect(w.x).toBeLessThanOrEqual(b.maxX);
      expect(w.y).toBeGreaterThanOrEqual(b.minY);
      expect(w.y).toBeLessThanOrEqual(b.maxY);
      expect(w.z).toBeGreaterThanOrEqual(b.minZ);
      expect(w.z).toBeLessThanOrEqual(b.maxZ);
    }
  });
});
