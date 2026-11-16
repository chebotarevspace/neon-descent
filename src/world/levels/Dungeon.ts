import * as THREE from 'three';
import { Level } from '../Level';
import type { Physics } from '../../engine/Physics';

export class Dungeon extends Level {
  private fireMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, physics: Physics) {
    super('dungeon', 'Древнее Подземелье', scene, physics);
    this.ambientColor = 0x100808;
    this.fogColor = 0x080404;
    this.fogDensity = 0.028;
    this.spawnPoint = new THREE.Vector3(0, 1.7, 18);
  }

  protected buildEnvironment() {
    this.addGround(80, 0x180c0c);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, flatShading: true, roughness: 0.9 });
    const torchMat = new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1.2, flatShading: true });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1010, flatShading: true, roughness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 0.8, flatShading: true, metalness: 0.8 });
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, flatShading: true, roughness: 0.7 });
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x444444, flatShading: true, metalness: 0.7, roughness: 0.4 });

    const rooms: { x: number; z: number; w: number; d: number }[] = [
      { x: 0, z: 0, w: 16, d: 24 },
      { x: -18, z: -8, w: 16, d: 16 },
      { x: 18, z: -8, w: 16, d: 16 },
      { x: 0, z: -28, w: 20, d: 16 },
    ];
    for (const r of rooms) {
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(r.x, 0.01, r.z);
      this.group.add(floor);
    }

    const walls: [number, number, number, number, number][] = [
      [-8, 0, 1, 24, 6], [8, 0, 1, 24, 6],
      [0, 12, 16, 1, 6], [0, -12, 16, 1, 6],
      [-10, -8, 1, 16, 6], [-26, -8, 1, 16, 6],
      [-18, 0, 16, 1, 6], [-18, -16, 16, 1, 6],
      [10, -8, 1, 16, 6], [26, -8, 1, 16, 6],
      [18, 0, 16, 1, 6], [18, -16, 16, 1, 6],
      [-10, -20, 1, 16, 6], [10, -20, 1, 16, 6],
      [0, -28, 20, 1, 6], [0, -36, 20, 1, 6],
      [-10, -28, 1, 16, 6], [10, -28, 1, 16, 6],
    ];
    for (const [x, z, w, d, h] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, h / 2, z);
      this.group.add(m);
      this.physics.addBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w, h, d));
    }

    const archways: [number, number][] = [[-8, -8], [8, -8], [0, -20], [-8, -28], [8, -28]];
    for (const [x, z] of archways) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.3, 6, 12, Math.PI), torchMat);
      arch.position.set(x, 3, z);
      this.group.add(arch);
      this.addNeonLight(new THREE.Vector3(x, 2, z), 0xff6622, 1.2, 8);
    }

    const torchPositions: [number, number][] = [
      [-6, 5], [6, 5], [-6, -5], [6, -5],
      [-22, -4], [-14, -4], [14, -4], [22, -4],
      [-6, -25], [6, -25], [-6, -31], [6, -31],
      [0, -33], [0, -23],
    ];
    for (const [x, z] of torchPositions) {
      const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.6, 6), wallMat);
      torch.position.set(x, 2.5, z);
      this.group.add(torch);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 5), torchMat);
      flame.position.set(x, 3, z);
      this.fireMeshes.push(flame);
      this.group.add(flame);
      this.addNeonLight(new THREE.Vector3(x, 3, z), 0xff6622, 1.0, 7);
    }

    for (const [x, z] of [[-14, -8], [14, -8], [-14, -28], [14, -28]] as [number, number][]) {
      const sarc = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.5), boneMat);
      sarc.position.set(x, 0.4, z);
      sarc.rotation.y = Math.PI / 2;
      this.group.add(sarc);
      this.physics.addBox(new THREE.Vector3(x, 0.4, z), new THREE.Vector3(2.5, 0.8, 1.2));
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 2.6), boneMat);
      lid.position.set(x, 0.95, z);
      lid.rotation.y = Math.PI / 2;
      lid.rotation.z = 0.08;
      this.group.add(lid);
      const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.05), goldMat);
      glyph.position.set(x, 0.95, z + 0.8);
      this.group.add(glyph);
    }

    for (const [x, z] of [[0, 0], [0, -28]] as [number, number][]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 4), chainMat);
      chain.position.set(x, 4.5, z);
      this.group.add(chain);
      const chandelier = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 6, 12), goldMat);
      chandelier.position.set(x, 6, z);
      chandelier.rotation.x = Math.PI / 2;
      this.group.add(chandelier);
      for (let c = 0; c < 6; c++) {
        const a = (c / 6) * Math.PI * 2;
        const cl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), torchMat);
        cl.position.set(x + Math.cos(a) * 1.2, 5.8, z + Math.sin(a) * 1.2);
        this.fireMeshes.push(cl);
        this.group.add(cl);
      }
      this.addNeonLight(new THREE.Vector3(x, 5.5, z), 0xffaa44, 1.5, 10);
    }

    const pillars: [number, number][] = [[-6, 0], [6, 0], [-6, -12], [6, -12], [-6, -24], [6, -24]];
    for (const [x, z] of pillars) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), wallMat);
      p.position.set(x, 3, z);
      this.group.add(p);
      this.physics.addBox(new THREE.Vector3(x, 3, z), new THREE.Vector3(1.2, 6, 1.2));
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), goldMat);
      cap.position.set(x, 6.1, z);
      this.group.add(cap);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6), wallMat);
      base.position.set(x, 0.15, z);
      this.group.add(base);
    }

    const altar = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), wallMat);
    altar.position.set(0, 0.5, -32);
    this.group.add(altar);
    this.physics.addBox(new THREE.Vector3(0, 0.5, -32), new THREE.Vector3(2, 1, 2));
    const altarTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.2), goldMat);
    altarTop.position.set(0, 1.1, -32);
    this.group.add(altarTop);

    const throne = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3, 2),
      new THREE.MeshStandardMaterial({ color: 0x4a2020, emissive: 0x220808, emissiveIntensity: 0.2, flatShading: true })
    );
    throne.position.set(0, 1.5, -34);
    this.group.add(throne);
    this.physics.addBox(new THREE.Vector3(0, 1.5, -34), new THREE.Vector3(2, 3, 2));

    const chalice = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.2, 0.5, 8),
      goldMat
    );
    chalice.position.set(0, 1.4, -32);
    this.group.add(chalice);
    this.addNeonLight(new THREE.Vector3(0, 1.5, -32), 0xffaa00, 1.5, 8);

    for (const [x, z] of [[-3, -32], [3, -32]] as [number, number][]) {
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), boneMat);
      skull.position.set(x, 1.3, z);
      skull.scale.y = 0.8;
      this.group.add(skull);
    }

    for (let i = 0; i < 8; i++) {
      const x = -7 + (i % 4) * 2;
      const z = -30 + Math.floor(i / 4) * 3;
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.5), wallMat);
      step.position.set(x, 0.1 + (i % 4) * 0.2, z);
      this.group.add(step);
    }

    const webMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3, flatShading: true });
    for (const [x, z] of [[-7, 5], [7, 5], [-25, -12], [25, -12]] as [number, number][]) {
      const web = new THREE.Mesh(new THREE.CircleGeometry(1, 6), webMat);
      web.position.set(x, 4, z);
      web.rotation.y = Math.PI / 4;
      this.group.add(web);
    }
  }

  protected buildInteractables() {
    this.addExit(new THREE.Vector3(0, 0, 20), 'hub', 'В хаб');
    this.addStash(new THREE.Vector3(0, 0, -32), 'stash_dungeon');
  }

  protected buildSpawns() {
    const heavies: [number, number][] = [[-14, -8], [14, -8], [0, -24]];
    for (const [x, z] of heavies) this.spawns.push({ type: 'heavy', pos: new THREE.Vector3(x, 0, z) });
    const thugs: [number, number][] = [
      [-4, 5], [4, 5], [-4, -5], [4, -5],
      [-20, -4], [20, -4], [-4, -25], [4, -25],
      [-4, -31], [4, -31], [0, -28],
    ];
    for (const [x, z] of thugs) this.spawns.push({ type: 'thug', pos: new THREE.Vector3(x, 0, z) });
    this.spawns.push({ type: 'turret', pos: new THREE.Vector3(0, 0, -16) });
  }

  update(dt: number) {
    const t = performance.now() * 0.012;
    const sy = 1 + Math.sin(t) * 0.4;
    for (let i = 0; i < this.fireMeshes.length; i++) this.fireMeshes[i].scale.y = sy;
  }
}
