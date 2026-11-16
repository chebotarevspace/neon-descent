import * as THREE from 'three';
import { Level, Interactable } from './Level';
import type { Physics } from '../engine/Physics';

export class Hub extends Level {
  private hologram: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, physics: Physics) {
    super('hub', 'Нексус — Хаб', scene, physics);
    this.ambientColor = 0x101018;
    this.fogColor = 0x080812;
    this.fogDensity = 0.010;
    this.spawnPoint = new THREE.Vector3(0, 1.7, 0);
  }

  protected buildEnvironment() {
    this.addGround(120, 0x0c0e16);
    const portalZones = [
      { x: 30, z: 0, r: 5 }, { x: -30, z: 0, r: 5 },
      { x: 0, z: 30, r: 5 }, { x: 0, z: -30, r: 5 },
      { x: 21, z: 21, r: 5 }, { x: -21, z: 21, r: 5 }, { x: 21, z: -21, r: 5 },
    ];
    this.addBuildingGrid(40, 14, [0x00f0ff, 0xff00aa, 0xffcc00], 42, portalZones);

    const platformGeo = new THREE.CylinderGeometry(6, 6.5, 0.4, 32);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x1a1d2a, emissive: 0x00f0ff, emissiveIntensity: 0.15, flatShading: true });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = 0.2;
    this.group.add(platform);

    const pillars = 8;
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x222230, emissive: 0x00f0ff, emissiveIntensity: 0.3, flatShading: true });
    const pillarGeo = new THREE.BoxGeometry(0.4, 4, 0.4);
    for (let i = 0; i < pillars; i++) {
      const a = (i / pillars) * Math.PI * 2;
      const x = Math.cos(a) * 5.5, z = Math.sin(a) * 5.5;
      const col = new THREE.Mesh(pillarGeo, pillarMat);
      col.position.set(x, 2, z);
      this.group.add(col);
      this.physics.addBox(new THREE.Vector3(x, 2, z), new THREE.Vector3(0.4, 4, 0.4));
    }

    const hologram = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.5, 0.3, 24, 6),
      new THREE.MeshStandardMaterial({ color: 0xff00aa, emissive: 0xff00aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 })
    );
    hologram.position.set(0, 3, 0);
    this.group.add(hologram);
    this.addNeonLight(new THREE.Vector3(0, 3, 0), 0xff00aa, 2.5, 14);
    this.hologram = hologram;

    const barGeo = new THREE.BoxGeometry(8, 3, 4);
    const bar = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: 0x1a1020, emissive: 0xff00aa, emissiveIntensity: 0.2, flatShading: true }));
    bar.position.set(-10, 1.5, 8);
    this.group.add(bar);
    this.physics.addBox(new THREE.Vector3(-10, 1.5, 8), new THREE.Vector3(8, 3, 4));
  }

  protected buildInteractables() {
    const board: Interactable = {
      id: 'questboard', type: 'questboard', label: 'Доска квестов',
      pos: new THREE.Vector3(-4, 0, 5), radius: 2.2,
    };
    const boardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x222230, emissive: 0xffcc00, emissiveIntensity: 0.5, flatShading: true })
    );
    boardMesh.position.set(-4, 1.2, 5);
    this.group.add(boardMesh);
    this.physics.addBox(new THREE.Vector3(-4, 1.2, 5), new THREE.Vector3(2.5, 2, 0.3));
    this.addNeonLight(new THREE.Vector3(-4, 2.5, 5), 0xffcc00, 1.5, 8);
    board.mesh = boardMesh;
    this.interactables.push(board);

    const upgrade: Interactable = {
      id: 'upgrade', type: 'upgrade', label: 'Терминал апгрейдов',
      pos: new THREE.Vector3(4, 0, 5), radius: 2.2,
    };
    const upMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2.4, 1),
      new THREE.MeshStandardMaterial({ color: 0x222230, emissive: 0x00f0ff, emissiveIntensity: 0.5, flatShading: true })
    );
    upMesh.position.set(4, 1.2, 5);
    this.group.add(upMesh);
    this.physics.addBox(new THREE.Vector3(4, 1.2, 5), new THREE.Vector3(2, 2.4, 1));
    this.addNeonLight(new THREE.Vector3(4, 2.5, 5), 0x00f0ff, 1.5, 8);
    upgrade.mesh = upMesh;
    this.interactables.push(upgrade);

    const save: Interactable = {
      id: 'savepoint', type: 'save', label: 'Точка сохранения',
      pos: new THREE.Vector3(0, 0, -5), radius: 2.0,
    };
    const saveMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x33ff66, emissive: 0x33ff66, emissiveIntensity: 1.2, flatShading: true })
    );
    saveMesh.position.set(0, 0.8, -5);
    this.group.add(saveMesh);
    this.addNeonLight(new THREE.Vector3(0, 1.5, -5), 0x33ff66, 1.5, 8);
    save.mesh = saveMesh;
    this.interactables.push(save);

    this.addExit(new THREE.Vector3(30, 0, 0), 'sewers', 'В Нижний город');
    this.addExit(new THREE.Vector3(-30, 0, 0), 'neondock', 'В промзону Неон-Док');
    this.addExit(new THREE.Vector3(0, 0, 30), 'skytower', 'К Небесной башне');
    this.addExit(new THREE.Vector3(0, 0, -30), 'undercity', 'В Подземку');
    this.addExit(new THREE.Vector3(21, 0, 21), 'forest', 'В Лес');
    this.addExit(new THREE.Vector3(-21, 0, 21), 'mountains', 'В Горы');
    this.addExit(new THREE.Vector3(21, 0, -21), 'dungeon', 'В Подземелье');
  }

  protected buildSpawns() {
    const positions: [number, number][] = [
      [-22, -18], [22, -18], [-22, 18], [22, 18],
      [-28, 0], [28, 0], [0, -28], [0, 28],
      [-18, 22], [18, 22],
    ];
    for (const [x, z] of positions) {
      this.spawns.push({ type: 'thug', pos: new THREE.Vector3(x, 0, z) });
    }
    this.spawns.push({ type: 'drone', pos: new THREE.Vector3(-20, 4, -20) });
    this.spawns.push({ type: 'drone', pos: new THREE.Vector3(20, 4, 20) });
  }

  update(dt: number) {
    if (this.hologram) {
      this.hologram.rotation.y += dt * 0.5;
      this.hologram.rotation.x += dt * 0.3;
    }
  }
}
