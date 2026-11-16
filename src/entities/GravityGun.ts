import * as THREE from 'three';
import { AssetFactory } from '../engine/AssetFactory';
import { Barrel } from './Barrel';

export interface LaunchedBarrel {
  barrel: Barrel;
  vel: THREE.Vector3;
  active: boolean;
}

export class GravityGun {
  active = false;
  grabbedBarrel: Barrel | null = null;
  launched: LaunchedBarrel[] = [];
  grabRange = 18;
  holdDistance = 2.8;
  launchSpeed = 45;
  pulseCooldown = 0;
  pulseRange = 10;
  pulseForce = 18;
  private viewModel: THREE.Group;
  private glowMat: THREE.MeshStandardMaterial;
  private tmpForward = new THREE.Vector3();
  private tmpTarget = new THREE.Vector3();
  private tmpDiff = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.viewModel = AssetFactory.gravityGunViewModel();
    this.viewModel.position.set(0.25, -0.22, -0.45);
    this.viewModel.visible = false;
    camera.add(this.viewModel);

    this.glowMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.5, transparent: true, opacity: 0.3,
    });
  }

  toggle(): boolean {
    this.active = !this.active;
    this.viewModel.visible = this.active;
    if (!this.active && this.grabbedBarrel) {
      this.grabbedBarrel = null;
    }
    return this.active;
  }

  tryGrab(barrels: Barrel[], cameraPos: THREE.Vector3, cameraDir: THREE.Vector3): boolean {
    if (this.grabbedBarrel) return false;
    let best: Barrel | null = null;
    let bestDist = this.grabRange;
    for (const b of barrels) {
      if (b.exploded) continue;
      this.tmpDiff.subVectors(b.pos, cameraPos);
      const dist = this.tmpDiff.length();
      if (dist > this.grabRange) continue;
      this.tmpDiff.normalize();
      const dot = this.tmpDiff.dot(cameraDir);
      if (dot < 0.5) continue;
      if (dist < bestDist) { bestDist = dist; best = b; }
    }
    if (best) {
      this.grabbedBarrel = best;
      return true;
    }
    return false;
  }

  launch(cameraPos: THREE.Vector3, cameraDir: THREE.Vector3): boolean {
    if (!this.grabbedBarrel) return false;
    const b = this.grabbedBarrel;
    this.launched.push({
      barrel: b,
      vel: new THREE.Vector3(cameraDir.x * this.launchSpeed, cameraDir.y * this.launchSpeed + 5, cameraDir.z * this.launchSpeed),
      active: true,
    });
    this.grabbedBarrel = null;
    return true;
  }

  pulse(cameraPos: THREE.Vector3): { hit: boolean } {
    if (this.pulseCooldown > 0) return { hit: false };
    this.pulseCooldown = 1.5;
    return { hit: true };
  }

  update(
    dt: number,
    cameraPos: THREE.Vector3,
    cameraDir: THREE.Vector3,
    barrels: Barrel[],
    onBarrelHitEnemy: (barrel: Barrel, enemyIndex: number) => void,
    onBarrelHitWall: (barrel: Barrel) => void,
    enemyPositions: { pos: THREE.Vector3; radius: number; dead: boolean; index: number }[],
    raycastDist: (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number) => number,
  ): { pulseEffect: boolean; pulsePos: THREE.Vector3 | null } {
    this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);

    if (this.grabbedBarrel && !this.grabbedBarrel.exploded) {
      this.tmpForward.copy(cameraDir);
      this.tmpTarget.copy(cameraPos).add(this.tmpForward.multiplyScalar(this.holdDistance));
      this.tmpTarget.y = Math.max(0.6, this.tmpTarget.y);
      const b = this.grabbedBarrel;
      b.pos.x += (this.tmpTarget.x - b.pos.x) * Math.min(1, dt * 12);
      b.pos.y += (this.tmpTarget.y - b.pos.y) * Math.min(1, dt * 12);
      b.pos.z += (this.tmpTarget.z - b.pos.z) * Math.min(1, dt * 12);
      b.mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(performance.now() * 0.01) * 0.5;
    } else if (this.grabbedBarrel && this.grabbedBarrel.exploded) {
      this.grabbedBarrel = null;
    }

    for (let i = this.launched.length - 1; i >= 0; i--) {
      const lb = this.launched[i];
      if (!lb.active) { this.launched.splice(i, 1); continue; }
      const b = lb.barrel;
      if (b.exploded) { lb.active = false; continue; }

      lb.vel.y -= 22 * dt;
      const speed = Math.sqrt(lb.vel.x * lb.vel.x + lb.vel.y * lb.vel.y + lb.vel.z * lb.vel.z);
      const nx = b.pos.x + lb.vel.x * dt;
      const ny = b.pos.y + lb.vel.y * dt;
      const nz = b.pos.z + lb.vel.z * dt;

      const ddx = nx - b.pos.x, ddy = ny - b.pos.y, ddz = nz - b.pos.z;
      const moveLen = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
      if (moveLen > 0.001) {
        const wallDist = raycastDist(b.pos.x, b.pos.y, b.pos.z, ddx / moveLen, ddy / moveLen, ddz / moveLen, moveLen + 0.5);
        if (wallDist < moveLen) {
          b.pos.set(
            b.pos.x + ddx / moveLen * wallDist,
            b.pos.y + ddy / moveLen * wallDist,
            b.pos.z + ddz / moveLen * wallDist,
          );
          b.mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
          onBarrelHitWall(b);
          lb.active = false;
          continue;
        }
      }

      for (const ep of enemyPositions) {
        if (ep.dead) continue;
        const ex = nx - ep.pos.x, ey = ny - (ep.pos.y + 0.8), ez = nz - ep.pos.z;
        const ed = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (ed < ep.radius + 0.5) {
          b.pos.set(nx, ny, nz);
          b.mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
          onBarrelHitEnemy(b, ep.index);
          lb.active = false;
          break;
        }
      }
      if (!lb.active) continue;

      if (ny < 0.6) {
        b.pos.set(nx, 0.6, nz);
        b.mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
        onBarrelHitWall(b);
        lb.active = false;
        continue;
      }

      b.pos.set(nx, ny, nz);
      b.mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
      const mat = b.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.0;
    }

    return { pulseEffect: false, pulsePos: null };
  }

  isGrabbing(): boolean { return this.grabbedBarrel !== null; }

  dispose() {
    this.viewModel.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.glowMat.dispose();
  }
}
