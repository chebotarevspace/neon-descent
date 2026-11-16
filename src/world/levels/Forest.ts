import * as THREE from 'three';
import { Level } from '../Level';
import type { Physics } from '../../engine/Physics';

export class Forest extends Level {
  private fireflies: { mesh: THREE.Mesh; phase: number; baseY: number; baseX: number; baseZ: number }[] = [];

  constructor(scene: THREE.Scene, physics: Physics) {
    super('forest', 'Тёмный Лес', scene, physics);
    this.ambientColor = 0x0a1a0e;
    this.fogColor = 0x06120a;
    this.fogDensity = 0.02;
    this.spawnPoint = new THREE.Vector3(0, 1.7, 20);
  }

  protected buildEnvironment() {
    this.addGround(100, 0x0c1c0c);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, flatShading: true, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, emissive: 0x0a220a, emissiveIntensity: 0.2, flatShading: true });
    const glowLeafMat = new THREE.MeshStandardMaterial({ color: 0x33ff66, emissive: 0x33ff66, emissiveIntensity: 0.5, flatShading: true });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x333328, flatShading: true, roughness: 0.9 });
    const mushroomMat = new THREE.MeshStandardMaterial({ color: 0xff4466, emissive: 0xff2244, emissiveIntensity: 0.6, flatShading: true });
    const mushroomStemMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, flatShading: true });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x113355, emissive: 0x113366, emissiveIntensity: 0.3, transparent: true, opacity: 0.7, flatShading: true });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, flatShading: true, roughness: 0.9 });

    const rng = mulberry32(77);

    for (let i = 0; i < 70; i++) {
      const x = (rng() - 0.5) * 85;
      const z = (rng() - 0.5) * 85;
      if (Math.abs(x) < 5 && Math.abs(z) < 16) continue;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 6) continue;

      const trunkH = 3 + rng() * 5;
      const trunkR = 0.25 + rng() * 0.25;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6), trunkMat);
      trunk.position.set(x, trunkH / 2, z);
      trunk.rotation.z = (rng() - 0.5) * 0.15;
      this.group.add(trunk);
      this.physics.addBox(new THREE.Vector3(x, trunkH / 2, z), new THREE.Vector3(trunkR * 2, trunkH, trunkR * 2));

      const canopyR = 1.2 + rng() * 1.8;
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(canopyR, 0), rng() < 0.15 ? glowLeafMat : leafMat);
      canopy.position.set(x, trunkH + canopyR * 0.4, z);
      canopy.scale.set(1 + rng() * 0.3, 0.7 + rng() * 0.3, 1 + rng() * 0.3);
      this.group.add(canopy);

      if (rng() < 0.3) {
        const canopy2 = new THREE.Mesh(new THREE.IcosahedronGeometry(canopyR * 0.7, 0), leafMat);
        canopy2.position.set(x + (rng() - 0.5) * 2, trunkH + canopyR * 0.8, z + (rng() - 0.5) * 2);
        this.group.add(canopy2);
      }
      if (rng() < 0.1) this.addNeonLight(new THREE.Vector3(x, trunkH, z), 0x33ff66, 0.6, 5);
    }

    for (let i = 0; i < 8; i++) {
      const x = (rng() - 0.5) * 70;
      const z = (rng() - 0.5) * 70;
      if (Math.abs(x) < 5 && Math.abs(z) < 16) continue;
      const len = 4 + rng() * 4;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, len, 6), trunkMat);
      log.position.set(x, 0.4, z);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = rng() * Math.PI;
      this.group.add(log);
      this.physics.addBox(new THREE.Vector3(x, 0.4, z), new THREE.Vector3(len, 0.8, 0.8));
    }

    for (let i = 0; i < 25; i++) {
      const x = (rng() - 0.5) * 75;
      const z = (rng() - 0.5) * 75;
      if (Math.abs(x) < 4 && Math.abs(z) < 18) continue;
      const s = 0.5 + rng() * 1.3;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
      rock.position.set(x, s * 0.4, z);
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      this.group.add(rock);
      this.physics.addBox(new THREE.Vector3(x, s * 0.4, z), new THREE.Vector3(s * 1.5, s * 0.8, s * 1.5));
    }

    for (let i = 0; i < 20; i++) {
      const x = (rng() - 0.5) * 70;
      const z = (rng() - 0.5) * 70;
      if (Math.abs(x) < 4 && Math.abs(z) < 18) continue;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.4, 5), mushroomStemMat);
      stem.position.set(x, 0.2, z);
      this.group.add(stem);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), mushroomMat);
      cap.position.set(x, 0.4, z);
      this.group.add(cap);
      if (rng() < 0.5) this.addNeonLight(new THREE.Vector3(x, 0.5, z), 0xff4466, 0.4, 3);
    }

    const stream = new THREE.Mesh(new THREE.PlaneGeometry(3, 50), waterMat);
    stream.rotation.x = -Math.PI / 2;
    stream.position.set(-15, 0.03, 0);
    stream.rotation.z = 0.3;
    this.group.add(stream);

    for (let i = 0; i < 15; i++) {
      const x = (rng() - 0.5) * 70;
      const z = (rng() - 0.5) * 70;
      if (Math.abs(x) < 4 && Math.abs(z) < 18) continue;
      const grass = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5 + rng() * 0.3, 4), grassMat);
      grass.position.set(x, 0.25, z);
      grass.rotation.z = (rng() - 0.5) * 0.3;
      this.group.add(grass);
    }

    const pathMat = new THREE.MeshStandardMaterial({ color: 0x1a2a10, emissive: 0x0a1a05, emissiveIntensity: 0.15, flatShading: true });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 32), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, 4);
    this.group.add(path);

    const fireflyMat = new THREE.MeshBasicMaterial({ color: 0x66ff88 });
    for (let i = 0; i < 15; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), fireflyMat);
      f.position.set((rng() - 0.5) * 60, 1 + rng() * 4, (rng() - 0.5) * 60);
      this.fireflies.push({ mesh: f, phase: rng() * Math.PI * 2, baseY: f.position.y, baseX: f.position.x, baseZ: f.position.z });
      this.group.add(f);
    }

    this.addNeonLight(new THREE.Vector3(0, 3, 10), 0x33ff66, 1.0, 12);
    this.addNeonLight(new THREE.Vector3(0, 3, -10), 0x33ff66, 0.8, 10);
  }

  protected buildInteractables() {
    this.addExit(new THREE.Vector3(0, 0, 22), 'hub', 'В хаб');
    this.addStash(new THREE.Vector3(-25, 0, -25), 'stash_forest');
  }

  protected buildSpawns() {
    const rng = mulberry32(99);
    for (let i = 0; i < 10; i++) {
      const x = (rng() - 0.5) * 60;
      const z = (rng() - 0.5) * 60;
      if (Math.abs(x) < 5 && Math.abs(z) < 18) continue;
      this.spawns.push({ type: 'mutant', pos: new THREE.Vector3(x, 0, z) });
    }
    for (let i = 0; i < 3; i++) {
      this.spawns.push({ type: 'turret', pos: new THREE.Vector3(-20 + i * 20, 0, -20) });
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.fireflies.length; i++) {
      const ff = this.fireflies[i];
      ff.phase += dt * 2;
      ff.mesh.position.y = ff.baseY + Math.sin(ff.phase) * 0.5;
      ff.mesh.position.x = ff.baseX + Math.cos(ff.phase * 0.7) * 1.5;
      ff.mesh.position.z = ff.baseZ + Math.sin(ff.phase * 0.5) * 1.5;
    }
  }
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
