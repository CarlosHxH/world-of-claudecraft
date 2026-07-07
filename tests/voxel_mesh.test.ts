import { describe, expect, it } from 'vitest';
import { voxelDensity } from '../src/sim/voxel';
import { meshVoxelChunk } from '../src/sim/voxel_mesh';

// A synthetic sphere density field (independent of terrain/tunnels) makes the
// seam assertion exact and easy to reason about: solid inside radius 5.
const sphereDensity = (x: number, y: number, z: number) => Math.hypot(x, y, z) - 5;

function vertexKeyList(mesh: ReturnType<typeof meshVoxelChunk>): string[] {
  const out: string[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    out.push(
      `${mesh.positions[i].toFixed(4)},${mesh.positions[i + 1].toFixed(4)},${mesh.positions[i + 2].toFixed(4)}`,
    );
  }
  return out;
}

describe('voxel mesher', () => {
  it('produces a non-empty, deterministic mesh for a chunk crossing the sphere surface', () => {
    const bounds = { x0: -8, y0: -8, z0: -8, size: 16, resolution: 12 };
    const a = meshVoxelChunk(sphereDensity, bounds);
    const b = meshVoxelChunk(sphereDensity, bounds);
    expect(a.positions.length).toBeGreaterThan(0);
    expect(a.indices.length % 3).toBe(0);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    expect(Array.from(a.indices)).toEqual(Array.from(b.indices));
  });

  it('produces no vertices for a chunk entirely inside or outside the surface', () => {
    const insideBounds = { x0: -1, y0: -1, z0: -1, size: 2, resolution: 4 };
    const outsideBounds = { x0: 100, y0: 100, z0: 100, size: 2, resolution: 4 };
    expect(meshVoxelChunk(sphereDensity, insideBounds).positions.length).toBe(0);
    expect(meshVoxelChunk(sphereDensity, outsideBounds).positions.length).toBe(0);
  });

  it('seals seams: two adjacent chunks meshed independently agree on shared boundary vertices', () => {
    // Two 8-unit chunks sharing the x=0 boundary face, both crossing the sphere.
    const left = meshVoxelChunk(sphereDensity, { x0: -8, y0: -8, z0: -8, size: 8, resolution: 8 });
    const right = meshVoxelChunk(sphereDensity, { x0: 0, y0: -8, z0: -8, size: 8, resolution: 8 });

    const leftBoundary = vertexKeyList(left).filter((k) => {
      const x = Number(k.split(',')[0]);
      return Math.abs(x) < 1e-6;
    });
    const rightBoundary = vertexKeyList(right).filter((k) => {
      const x = Number(k.split(',')[0]);
      return Math.abs(x) < 1e-6;
    });
    // Any vertex either chunk placed exactly on the shared plane must appear
    // in the other chunk's mesh too: same world-space position, computed
    // independently, with no chunk-boundary crack.
    for (const k of leftBoundary) expect(rightBoundary).toContain(k);
  });

  it('exercises the real terrain+tunnel density field without throwing', () => {
    const seed = 1;
    const mesh = meshVoxelChunk((x, y, z) => voxelDensity(x, y, z, seed), {
      x0: 56,
      y0: -12,
      z0: 146,
      size: 32,
      resolution: 16,
    });
    expect(mesh.positions.length).toBeGreaterThan(0);
  });
});
