import * as THREE from 'three';
import { Level } from '../Level';
import type { Physics } from '../../engine/Physics';

export class Sewers extends Level {
  constructor(scene: THREE.Scene, physics: Physics) {
    super('sewers', 'Нижний город', scene, physics);
    this.ambientColor = 0x0a0810;
    this.fogColor = 0x06040a;
    this.fogDensity = 0.016;
    this.spawnPoint = new THREE.Vector3(0, 1.7, 8);
  }

  protected buildEnvironment() {
    this.addGround(70, 0x0a0810);
    this.addBuildingGrid(30, 12, [0xff4466, 0xffcc00, 0x00f0ff], 11);

    const alleyWalls = [
      { x: -8, z: -10, w: 16, d: 1 }, { x: 8, z: -10, w: 16, d: 1 },
      { x: -10, z: 0, w: 1, d: 20 }, { x: 10, z: 0, w: 1, d: 20 },
    ];
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1018, flatShading: true });
    for (const w of alleyWalls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, 5, w.d), wallMat);
      m.position.set(w.x, 2.5, w.z);
      this.group.add(m);
      this.physics.addBox(new THREE.Vector3(w.x, 2.5, w.z), new THREE.Vector3(w.w, 5, w.d));
    }

    const neonStrip = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xff4466, emissive: 0xff4466, emissiveIntensity: 2 })
    );
    neonStrip.position.set(0, 3.5, -10);
    this.group.add(neonStrip);
    this.addNeonLight(new THREE.Vector3(0, 3, -8), 0xff4466, 2, 14);

    const puddle = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 4),
      new THREE.MeshStandardMaterial({ color: 0x000022, emissive: 0xff00aa, emissiveIntensity: 0.3, transparent: true, opacity: 0.7 })
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(0, 0.03, -2);
    this.group.add(puddle);
  }

  protected buildInteractables() {
    this.addStash(new THREE.Vector3(-7, 0, -7), 'stash_sewers');
    this.addExit(new THREE.Vector3(0, 0, -16), 'hub', 'В хаб');
    this.addExit(new THREE.Vector3(16, 0, 0), 'neondock', 'В промзону');
  }

  protected buildSpawns() {
    const positions: [number, number][] = [
      [-5, -8], [5, -8], [0, -12], [-8, -2], [8, -2], [-3, -10], [3, -10], [0, -5],
    ];
    for (const [x, z] of positions) {
      this.spawns.push({ type: 'thug', pos: new THREE.Vector3(x, 0, z) });
    }
  }
}
