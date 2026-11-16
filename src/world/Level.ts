import * as THREE from 'three';
import { Physics } from '../engine/Physics';
import { ProceduralCity } from './ProceduralCity';
import { AssetFactory } from '../engine/AssetFactory';
import type { EnemyId } from '../types/common';

export interface Interactable {
  id: string;
  type: 'exit' | 'terminal' | 'stash' | 'save' | 'upgrade' | 'questboard' | 'portal';
  label: string;
  pos: THREE.Vector3;
  radius: number;
  target?: string;
  mesh?: THREE.Object3D;
  used?: boolean;
}

export interface EnemySpawn {
  type: EnemyId;
  pos: THREE.Vector3;
}

export class Level {
  id: string;
  name: string;
  group: THREE.Group;
  physics: Physics;
  interactables: Interactable[] = [];
  spawns: EnemySpawn[] = [];
  ambientColor = 0x0a0c14;
  fogColor = 0x05060a;
  fogDensity = 0.012;
  spawnPoint = new THREE.Vector3(0, 1.7, 0);
  protected scene: THREE.Scene;

  constructor(id: string, name: string, scene: THREE.Scene, physics: Physics) {
    this.id = id;
    this.name = name;
    this.scene = scene;
    this.physics = physics;
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  build() { this.buildEnvironment(); this.buildInteractables(); this.buildSpawns(); }

  protected buildEnvironment() {}
  protected buildInteractables() {}
  protected buildSpawns() {}

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.scene.remove(this.group);
    this.interactables = [];
    this.spawns = [];
  }

  protected addNeonLight(pos: THREE.Vector3, color: number, intensity = 1.5, dist = 12) {
    const light = new THREE.PointLight(color, intensity, dist);
    light.position.copy(pos);
    this.group.add(light);
  }

  protected addBuildingGrid(area: number, count: number, colors: number[], seed = 1, excludeZones: { x: number; z: number; r: number }[] = []) {
    return ProceduralCity.generate(this.scene, this.physics, area, count, colors, seed, excludeZones);
  }

  protected addGround(size: number, color = 0x0a0c14) {
    return ProceduralCity.addGround(this.scene, this.physics, size, color);
  }

  protected addExit(pos: THREE.Vector3, target: string, label: string, id?: string): Interactable {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.15, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2 })
    );
    ring.position.copy(pos);
    ring.position.y = 1.2;
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.4 })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(pos);
    pad.position.y = 0.02;
    this.group.add(pad);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 8, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    beam.position.copy(pos);
    beam.position.y = 4;
    this.group.add(beam);

    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.1, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    topRing.position.copy(pos);
    topRing.position.y = 8;
    topRing.rotation.x = Math.PI / 2;
    this.group.add(topRing);

    const labelSprite = this.makeLabelSprite(label, '#00f0ff');
    labelSprite.position.copy(pos);
    labelSprite.position.y = 9;
    this.group.add(labelSprite);

    this.addNeonLight(pos, 0x00f0ff, 2, 8);
    const inter: Interactable = { id: id || `exit_${target}`, type: 'exit', label, pos: pos.clone(), radius: 2.0, target, mesh: ring };
    this.interactables.push(inter);
    return inter;
  }

  private makeLabelSprite(text: string, color: string): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(3, 0.75, 1);
    return sprite;
  }

  protected addTerminal(pos: THREE.Vector3, id: string, label: string): Interactable {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x222230, emissive: 0x00f0ff, emissiveIntensity: 0.4, flatShading: true })
    );
    m.position.copy(pos);
    m.position.y = 0.9;
    this.group.add(m);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.2),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    screen.position.set(pos.x, 1.2, pos.z + 0.41);
    this.group.add(screen);
    this.addNeonLight(pos, 0x00f0ff, 1.5, 6);
    this.physics.addBox(new THREE.Vector3(pos.x, 0.9, pos.z), new THREE.Vector3(1.2, 1.8, 0.8));
    const inter: Interactable = { id, type: 'terminal', label, pos: pos.clone(), radius: 2.0, mesh: m };
    this.interactables.push(inter);
    return inter;
  }

  protected addStash(pos: THREE.Vector3, id: string): Interactable {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x442244, emissive: 0xff00aa, emissiveIntensity: 1.0, flatShading: true })
    );
    m.position.copy(pos);
    m.position.y = 0.3;
    this.group.add(m);
    this.addNeonLight(pos, 0xff00aa, 1.2, 5);
    const inter: Interactable = { id, type: 'stash', label: 'Тайник с кредитами', pos: pos.clone(), radius: 1.8, mesh: m };
    this.interactables.push(inter);
    return inter;
  }
}
