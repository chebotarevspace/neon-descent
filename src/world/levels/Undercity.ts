import * as THREE from 'three';
import { Level } from '../Level';
import type { Physics } from '../../engine/Physics';

export class Undercity extends Level {
  constructor(scene: THREE.Scene, physics: Physics) {
    super('undercity', 'Подземка', scene, physics);
    this.ambientColor = 0x040806;
    this.fogColor = 0x020604;
    this.fogDensity = 0.028;
    this.spawnPoint = new THREE.Vector3(0, 1.7, 16);
  }

  protected buildEnvironment() {
    this.addGround(80, 0x040806);

    const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x1a2218, flatShading: true, roughness: 0.9 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x334433, flatShading: true, metalness: 0.5, roughness: 0.5 });
    const slimeMat = new THREE.MeshStandardMaterial({ color: 0x113311, emissive: 0x33ff66, emissiveIntensity: 0.6, flatShading: true });

    const tunnels: [number, number, number, number][] = [
      [0, 0, 8, 32],
      [-12, -8, 24, 8],
      [12, -8, 24, 8],
    ];
    for (const [x, z, w, d] of tunnels) {
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tunnelMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(x, 0.01, z);
      this.group.add(floor);
    }

    const walls: [number, number, number, number, number][] = [
      [-4, -8, 1, 6, 5], [4, -8, 1, 6, 5],
      [-12, -12, 24, 1, 5], [-12, -4, 24, 1, 5],
      [12, -12, 24, 1, 5], [12, -4, 24, 1, 5],
      [-24, -8, 1, 8, 5], [24, -8, 1, 8, 5],
      [0, 16, 8, 1, 5], [-4, 12, 1, 8, 5], [4, 12, 1, 8, 5],
    ];
    for (const [x, z, w, d, h] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tunnelMat);
      m.position.set(x, h / 2, z);
      this.group.add(m);
      this.physics.addBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w, h, d));
    }

    const pipes: [number, number, number][] = [
      [-10, 4, -10], [10, 4, -10], [-10, 4, 0], [10, 4, 0],
      [-10, 4, -6], [10, 4, -6],
    ];
    for (const [x, y, z] of pipes) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 8, 8), pipeMat);
      p.position.set(x, y, z);
      p.rotation.z = Math.PI / 2;
      this.group.add(p);
      this.physics.addBox(new THREE.Vector3(x, y, z), new THREE.Vector3(8, 0.8, 0.8));
    }

    const slime = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      slimeMat
    );
    slime.rotation.x = -Math.PI / 2;
    slime.position.set(0, 0.02, -8);
    this.group.add(slime);
    this.addNeonLight(new THREE.Vector3(0, 1, -8), 0x33ff66, 2, 10);

    const grates: [number, number][] = [[-8, -8], [8, -8], [0, -12]];
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true, metalness: 0.7 });
    for (const [x, z] of grates) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 2), grateMat);
      g.position.set(x, 0.05, z);
      this.group.add(g);
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.05, 2.2),
        new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.3 })
      );
      glow.position.set(x, 0.03, z);
      this.group.add(glow);
    }

    const neonStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 30),
      new THREE.MeshBasicMaterial({ color: 0x33ff66 })
    );
    neonStrip.position.set(0, 4, 0);
    this.group.add(neonStrip);

    const pillars: [number, number][] = [[-6, -8], [6, -8], [-6, 0], [6, 0]];
    for (const [x, z] of pillars) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 5, 8), tunnelMat);
      p.position.set(x, 2.5, z);
      this.group.add(p);
      this.physics.addBox(new THREE.Vector3(x, 2.5, z), new THREE.Vector3(1, 5, 1));
    }

    this.addNeonLight(new THREE.Vector3(0, 3, 8), 0x33ff66, 1.5, 12);
    this.addNeonLight(new THREE.Vector3(-12, 3, -8), 0x33ff66, 1.2, 10);
    this.addNeonLight(new THREE.Vector3(12, 3, -8), 0x33ff66, 1.2, 10);
  }

  protected buildInteractables() {
    this.addExit(new THREE.Vector3(0, 0, 18), 'hub', 'В хаб');
    this.addStash(new THREE.Vector3(-20, 0, -8), 'stash_undercity');
  }

  protected buildSpawns() {
    const mutants: [number, number][] = [
      [-8, -6], [8, -6], [0, -10], [-16, -8], [16, -8],
      [-8, 0], [8, 0], [0, -4],
    ];
    for (const [x, z] of mutants) {
      this.spawns.push({ type: 'mutant', pos: new THREE.Vector3(x, 0, z) });
    }
    const turrets: [number, number][] = [[-20, -8], [20, -8], [0, -14]];
    for (const [x, z] of turrets) {
      this.spawns.push({ type: 'turret', pos: new THREE.Vector3(x, 0, z) });
    }
  }
}
