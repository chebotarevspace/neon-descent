import * as THREE from 'three';
import { Level } from '../Level';
import type { Physics } from '../../engine/Physics';

export class Mountains extends Level {
  private fireMesh: THREE.Mesh | null = null;
  private flagMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, physics: Physics) {
    super('mountains', 'Заснеженные Горы', scene, physics);
    this.ambientColor = 0x101820;
    this.fogColor = 0x0a1018;
    this.fogDensity = 0.014;
    this.spawnPoint = new THREE.Vector3(0, 1.7, 22);
  }

  protected buildEnvironment() {
    this.addGround(120, 0x1a2228);

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xddddee, flatShading: true, roughness: 0.8 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x444455, flatShading: true, roughness: 0.9 });
    const iceMat = new THREE.MeshStandardMaterial({ color: 0x66aaff, emissive: 0x3366aa, emissiveIntensity: 0.3, flatShading: true, transparent: true, opacity: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, flatShading: true, roughness: 0.9 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0x881122, emissiveIntensity: 0.3, flatShading: true });
    const tentMat = new THREE.MeshStandardMaterial({ color: 0x884422, flatShading: true, roughness: 0.8 });

    const rng = mulberry32(123);

    for (let i = 0; i < 30; i++) {
      const x = (rng() - 0.5) * 100;
      const z = (rng() - 0.5) * 100;
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 10) continue;
      const h = 8 + rng() * 20;
      const r = 4 + rng() * 7;
      const sides = 4 + Math.floor(rng() * 4);

      const mountain = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides), rockMat);
      mountain.position.set(x, h / 2, z);
      mountain.rotation.y = rng() * Math.PI;
      this.group.add(mountain);
      this.physics.addBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(r * 1.4, h, r * 1.4));

      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, h * 0.35, sides), snowMat);
      snowCap.position.set(x, h * 0.82, z);
      snowCap.rotation.y = mountain.rotation.y;
      this.group.add(snowCap);
    }

    for (let i = 0; i < 25; i++) {
      const x = (rng() - 0.5) * 90;
      const z = (rng() - 0.5) * 90;
      if (Math.abs(x) < 5 && Math.abs(z) < 20) continue;
      const s = 0.8 + rng() * 2;
      const snow = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), snowMat);
      snow.position.set(x, s * 0.3, z);
      snow.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      this.group.add(snow);
      this.physics.addBox(new THREE.Vector3(x, s * 0.3, z), new THREE.Vector3(s * 1.5, s * 0.6, s * 1.5));
    }

    for (let i = 0; i < 20; i++) {
      const x = (rng() - 0.5) * 80;
      const z = (rng() - 0.5) * 80;
      if (Math.abs(x) < 4 && Math.abs(z) < 18) continue;
      const s = 0.6 + rng() * 1.5;
      const ice = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), iceMat);
      ice.position.set(x, 0.5 + rng() * 3, z);
      ice.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
      this.group.add(ice);
      if (rng() < 0.4) this.addNeonLight(new THREE.Vector3(x, 1, z), 0x66aaff, 0.6, 5);
    }

    for (let i = 0; i < 6; i++) {
      const x = (rng() - 0.5) * 70;
      const z = (rng() - 0.5) * 70;
      if (Math.abs(x) < 8 && Math.abs(z) < 20) continue;
      const r = 2 + rng() * 2;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(r, 0.4, 6, 12, Math.PI), iceMat);
      arch.position.set(x, r, z);
      arch.rotation.x = Math.PI / 2;
      this.group.add(arch);
      this.addNeonLight(new THREE.Vector3(x, r, z), 0x66aaff, 0.8, 6);
    }

    for (let seg = 0; seg < 4; seg++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), woodMat);
      plank.position.set(0, 0.3 + seg * 0.02, -seg * 3 - 2);
      this.group.add(plank);
    }
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 14), woodMat);
      rail.position.set(side * 1.5, 0.8, -8);
      this.group.add(rail);
      this.physics.addBox(new THREE.Vector3(side * 1.5, 0.8, -8), new THREE.Vector3(0.15, 1, 14));
      for (let p = 0; p < 5; p++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), woodMat);
        post.position.set(side * 1.5, 0.75, -p * 3 - 2);
        this.group.add(post);
      }
    }

    const campfire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x332211, flatShading: true }));
    campfire.position.set(0, 0.15, -16);
    this.group.add(campfire);
    const fireLight = new THREE.PointLight(0xff6622, 3, 12);
    fireLight.position.set(0, 1, -16);
    this.group.add(fireLight);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff6622 }));
    fire.position.set(0, 0.7, -16);
    this.fireMesh = fire;
    this.group.add(fire);
    for (const side of [-1, 1]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 5), woodMat);
      log.position.set(side * 0.4, 0.3, -16);
      log.rotation.z = side * 0.5;
      this.group.add(log);
    }

    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6), woodMat);
    flagPole.position.set(-12, 2.5, -20);
    this.group.add(flagPole);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.05), flagMat);
    flag.position.set(-11.2, 4.2, -20);
    this.flagMesh = flag;
    this.group.add(flag);

    for (const [tx, tz] of [[-8, -18], [8, -18]] as [number, number][]) {
      const tent = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.5, 4), tentMat);
      tent.position.set(tx, 1.25, tz);
      tent.rotation.y = Math.PI / 4;
      this.group.add(tent);
      this.physics.addBox(new THREE.Vector3(tx, 1.25, tz), new THREE.Vector3(2.5, 2.5, 2.5));
    }

    this.addNeonLight(new THREE.Vector3(0, 3, 10), 0x66aaff, 1.0, 12);
    this.addNeonLight(new THREE.Vector3(0, 2, -16), 0xff6622, 1.5, 8);
  }

  protected buildInteractables() {
    this.addExit(new THREE.Vector3(0, 0, 24), 'hub', 'В хаб');
    this.addStash(new THREE.Vector3(30, 0, -30), 'stash_mountains');
  }

  protected buildSpawns() {
    const positions: [number, number][] = [
      [-15, -10], [15, -10], [-20, -20], [20, -20], [0, -25],
      [-25, -5], [25, -5], [-10, -30], [10, -30], [0, -15],
    ];
    for (const [x, z] of positions) {
      this.spawns.push({ type: 'guard', pos: new THREE.Vector3(x, 0, z) });
    }
    this.spawns.push({ type: 'drone', pos: new THREE.Vector3(0, 5, -20) });
    this.spawns.push({ type: 'drone', pos: new THREE.Vector3(-15, 5, -25) });
  }

  update(dt: number) {
    if (this.fireMesh) {
      this.fireMesh.scale.y = 1 + Math.sin(performance.now() * 0.01) * 0.3;
      this.fireMesh.rotation.y += dt * 2;
    }
    if (this.flagMesh) {
      this.flagMesh.rotation.z = Math.sin(performance.now() * 0.003) * 0.15;
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
