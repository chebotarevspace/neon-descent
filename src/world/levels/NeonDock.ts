import * as THREE from 'three';
import { Level } from '../Level';
import type { Physics } from '../../engine/Physics';

export class NeonDock extends Level {
  constructor(scene: THREE.Scene, physics: Physics) {
    super('neondock', 'Промзона Неон-Док', scene, physics);
    this.ambientColor = 0x08101a;
    this.fogColor = 0x040810;
    this.fogDensity = 0.012;
    this.spawnPoint = new THREE.Vector3(0, 1.7, 12);
  }

  protected buildEnvironment() {
    this.addGround(90, 0x08101a);
    this.addBuildingGrid(40, 14, [0x00f0ff, 0x33aaff], 23);

    const containerMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, flatShading: true, metalness: 0.6 });
    const positions: [number, number, number][] = [
      [-12, 0, -8, ], [12, 0, -8], [-12, 0, 0], [12, 0, 0], [-12, 0, 8], [12, 0, 8],
      [-6, 0, -14], [6, 0, -14],
    ];
    for (const [x, , z] of positions) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 2.5), containerMat);
      c.position.set(x, 1.25, z);
      this.group.add(c);
      this.physics.addBox(new THREE.Vector3(x, 1.25, z), new THREE.Vector3(4, 2.5, 2.5));
    }

    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, flatShading: true });
    for (const x of [-18, 18]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 16), hangarMat);
      h.position.set(x, 3, -6);
      this.group.add(h);
      this.physics.addBox(new THREE.Vector3(x, 3, -6), new THREE.Vector3(12, 6, 16));
    }

    const neonLine = new THREE.Mesh(
      new THREE.BoxGeometry(60, 0.15, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.5 })
    );
    neonLine.position.set(0, 4, 14);
    this.group.add(neonLine);
    this.addNeonLight(new THREE.Vector3(0, 3, 10), 0x00f0ff, 2, 16);

    const crane = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 8, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x442200, flatShading: true })
    );
    crane.position.set(0, 4, -16);
    this.group.add(crane);
    this.physics.addBox(new THREE.Vector3(0, 4, -16), new THREE.Vector3(0.4, 8, 0.4));
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x442200, flatShading: true })
    );
    arm.position.set(5, 8, -16);
    this.group.add(arm);
  }

  protected buildInteractables() {
    this.addTerminal(new THREE.Vector3(0, 0, -18), 'terminal', 'Взломать терминал');
    this.addExit(new THREE.Vector3(-25, 0, 15), 'hub', 'В хаб');
    this.addExit(new THREE.Vector3(25, 0, 15), 'skytower', 'К Небесной башне');
  }

  protected buildSpawns() {
    const guards: [number, number][] = [[-10, -6], [10, -6], [-14, 0], [14, 0], [0, -12]];
    for (const [x, z] of guards) this.spawns.push({ type: 'guard', pos: new THREE.Vector3(x, 0, z) });
    const drones: [number, number][] = [[-8, 4], [8, 4], [0, 8], [-14, -10], [14, -10], [0, -4]];
    for (const [x, z] of drones) this.spawns.push({ type: 'drone', pos: new THREE.Vector3(x, 3, z) });
  }
}
