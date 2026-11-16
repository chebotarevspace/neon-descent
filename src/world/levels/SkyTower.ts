import * as THREE from 'three';
import { Level } from '../Level';
import type { Physics } from '../../engine/Physics';

export class SkyTower extends Level {
  bossSpawnPos = new THREE.Vector3(0, 0, -20);

  constructor(scene: THREE.Scene, physics: Physics) {
    super('skytower', 'Небесная башня', scene, physics);
    this.ambientColor = 0x10081a;
    this.fogColor = 0x08040f;
    this.fogDensity = 0.010;
    this.spawnPoint = new THREE.Vector3(0, 1.7, 16);
  }

  protected buildEnvironment() {
    this.addGround(60, 0x10081a);

    const towerMat = new THREE.MeshStandardMaterial({ color: 0x1a0a2a, emissive: 0xff00aa, emissiveIntensity: 0.1, flatShading: true });
    for (let i = 0; i < 5; i++) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(24 - i * 2, 4, 24 - i * 2), towerMat);
      tier.position.set(0, 2 + i * 4, -8);
      this.group.add(tier);
      this.physics.addBox(new THREE.Vector3(0, 2 + i * 4, -8), new THREE.Vector3(24 - i * 2, 4, 24 - i * 2));
      const ring = new THREE.Mesh(
        new THREE.BoxGeometry(26 - i * 2, 0.2, 26 - i * 2),
        new THREE.MeshStandardMaterial({ color: 0xff00aa, emissive: 0xff00aa, emissiveIntensity: 2 })
      );
      ring.position.set(0, 4 + i * 4, -8);
      this.group.add(ring);
    }

    const arena = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 10, 0.3, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a0a2a, emissive: 0xff00aa, emissiveIntensity: 0.3, flatShading: true })
    );
    arena.position.set(0, 0.15, -20);
    this.group.add(arena);

    const arenaRing = new THREE.Mesh(
      new THREE.TorusGeometry(10, 0.2, 8, 48),
      new THREE.MeshStandardMaterial({ color: 0xff00aa, emissive: 0xff00aa, emissiveIntensity: 2.5 })
    );
    arenaRing.position.set(0, 0.3, -20);
    arenaRing.rotation.x = Math.PI / 2;
    this.group.add(arenaRing);
    this.addNeonLight(new THREE.Vector3(0, 3, -20), 0xff00aa, 3, 20);

    const pillars: [number, number][] = [[-7, -16], [7, -16], [-7, -24], [7, -24]];
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2a1040, emissive: 0xff00aa, emissiveIntensity: 0.4, flatShading: true });
    for (const [x, z] of pillars) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 1.5), pillarMat);
      p.position.set(x, 3, z);
      this.group.add(p);
      this.physics.addBox(new THREE.Vector3(x, 3, z), new THREE.Vector3(1.5, 6, 1.5));
    }

    const corridor = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a0a2a, flatShading: true })
    );
    corridor.position.set(0, 2, 0);
    corridor.rotation.y = Math.PI / 2;
    this.group.add(corridor);
  }

  protected buildInteractables() {
    this.addExit(new THREE.Vector3(0, 0, 22), 'hub', 'В хаб');
  }

  protected buildSpawns() {
    const heavies: [number, number][] = [[-6, -14], [6, -14], [0, -10]];
    for (const [x, z] of heavies) this.spawns.push({ type: 'heavy', pos: new THREE.Vector3(x, 0, z) });
    this.spawns.push({ type: 'boss', pos: this.bossSpawnPos.clone() });
  }
}
