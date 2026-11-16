import * as THREE from 'three';
import type { Collider } from '../types/common';

export class Physics {
  colliders: Collider[] = [];
  gravity = -22;

  addBox(center: THREE.Vector3, size: THREE.Vector3) {
    const half = size.clone().multiplyScalar(0.5);
    this.colliders.push({
      min: center.clone().sub(half),
      max: center.clone().add(half),
    });
  }

  addCollider(min: THREE.Vector3, max: THREE.Vector3) {
    this.colliders.push({ min: min.clone(), max: max.clone() });
  }

  clear() { this.colliders.length = 0; }

  containsPoint(pos: THREE.Vector3): boolean {
    for (const c of this.colliders) {
      if (pos.x >= c.min.x && pos.x <= c.max.x &&
          pos.y >= c.min.y && pos.y <= c.max.y &&
          pos.z >= c.min.z && pos.z <= c.max.z) return true;
    }
    return false;
  }

  private _pMinX = 0; private _pMinY = 0; private _pMinZ = 0;
  private _pMaxX = 0; private _pMaxY = 0; private _pMaxZ = 0;

  resolveCollision(pos: THREE.Vector3, radius: number, height: number): void {
    this._pMinX = pos.x - radius; this._pMinY = pos.y; this._pMinZ = pos.z - radius;
    this._pMaxX = pos.x + radius; this._pMaxY = pos.y + height; this._pMaxZ = pos.z + radius;

    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < this.colliders.length; i++) {
        const c = this.colliders[i];
        if (this._pMaxX <= c.min.x || this._pMinX >= c.max.x) continue;
        if (this._pMaxY <= c.min.y || this._pMinY >= c.max.y) continue;
        if (this._pMaxZ <= c.min.z || this._pMinZ >= c.max.z) continue;

        const overlapX = Math.min(this._pMaxX - c.min.x, c.max.x - this._pMinX);
        const overlapY = Math.min(this._pMaxY - c.min.y, c.max.y - this._pMinY);
        const overlapZ = Math.min(this._pMaxZ - c.min.z, c.max.z - this._pMinZ);

        const minOverlap = Math.min(overlapX, overlapY, overlapZ);
        if (minOverlap === overlapX) {
          const center = (c.min.x + c.max.x) * 0.5;
          pos.x = pos.x < center ? c.min.x - radius : c.max.x + radius;
        } else if (minOverlap === overlapZ) {
          const center = (c.min.z + c.max.z) * 0.5;
          pos.z = pos.z < center ? c.min.z - radius : c.max.z + radius;
        } else {
          const center = (c.min.y + c.max.y) * 0.5;
          pos.y = pos.y < center ? c.min.y - 0.01 : c.max.y + height;
        }
        this._pMinX = pos.x - radius; this._pMinY = pos.y; this._pMinZ = pos.z - radius;
        this._pMaxX = pos.x + radius; this._pMaxY = pos.y + height; this._pMaxZ = pos.z + radius;
      }
    }
  }

  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): { dist: number; point: THREE.Vector3 } | null {
    let best = maxDist;
    let hit = false;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const t = this.rayAABB(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, c.min.x, c.min.y, c.min.z, c.max.x, c.max.y, c.max.z);
      if (t !== null && t < best && t >= 0) {
        best = t;
        hit = true;
      }
    }
    if (!hit) return null;
    const point = new THREE.Vector3(origin.x + dir.x * best, origin.y + dir.y * best, origin.z + dir.z * best);
    return { dist: best, point };
  }

  raycastDistOnly(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number): number {
    let best = maxDist;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const t = this.rayAABB(ox, oy, oz, dx, dy, dz, c.min.x, c.min.y, c.min.z, c.max.x, c.max.y, c.max.z);
      if (t !== null && t < best && t >= 0) best = t;
    }
    return best;
  }

  private rayAABB(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, mnx: number, mny: number, mnz: number, mxx: number, mxy: number, mxz: number): number | null {
    let tmin = -Infinity, tmax = Infinity;
    if (Math.abs(dx) < 1e-8) { if (ox < mnx || ox > mxx) return null; }
    else { const inv = 1 / dx; let t1 = (mnx - ox) * inv; let t2 = (mxx - ox) * inv; if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null; }
    if (Math.abs(dy) < 1e-8) { if (oy < mny || oy > mxy) return null; }
    else { const inv = 1 / dy; let t1 = (mny - oy) * inv; let t2 = (mxy - oy) * inv; if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null; }
    if (Math.abs(dz) < 1e-8) { if (oz < mnz || oz > mxz) return null; }
    else { const inv = 1 / dz; let t1 = (mnz - oz) * inv; let t2 = (mxz - oz) * inv; if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null; }
    return tmin >= 0 ? tmin : (tmax >= 0 ? 0 : null);
  }
}
