import * as THREE from 'three';
import { AssetFactory } from '../engine/AssetFactory';

export type PickupType = 'health' | 'ammo' | 'credits' | 'stash' | 'doubleDamage' | 'shield' | 'infiniteAmmo';

export class Pickup {
  type: PickupType;
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  amount: number;
  weapon?: string;
  collected = false;
  private bobPhase = Math.random() * Math.PI * 2;

  constructor(type: PickupType, pos: THREE.Vector3, amount: number, weapon?: string) {
    this.type = type;
    this.pos = pos.clone();
    this.amount = amount;
    this.weapon = weapon;

    let color = 0x33ff66;
    if (type === 'ammo') color = 0xffcc00;
    if (type === 'credits') color = 0x00f0ff;
    if (type === 'stash') color = 0xff00aa;
    if (type === 'doubleDamage') color = 0xff3344;
    if (type === 'shield') color = 0x66aaff;
    if (type === 'infiniteAmmo') color = 0xffaa00;

    let geo: THREE.BufferGeometry;
    if (type === 'credits') geo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8);
    else if (type === 'doubleDamage') geo = new THREE.TetrahedronGeometry(0.3, 0);
    else if (type === 'shield') geo = new THREE.IcosahedronGeometry(0.25, 0);
    else if (type === 'infiniteAmmo') geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    else geo = new THREE.OctahedronGeometry(0.25, 0);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.2, flatShading: true,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(pos);
    this.mesh.position.y = 0.6;
  }

  update(dt: number) {
    this.bobPhase += dt * 2;
    this.mesh.position.y = 0.6 + Math.sin(this.bobPhase) * 0.15;
    this.mesh.rotation.y += dt * 1.5;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export class HitEffect {
  mesh: THREE.Mesh;
  life = 0.3;
  maxLife = 0.3;
  dead = false;

  constructor(pos: THREE.Vector3, color = 0xffaa00) {
    const geo = new THREE.SphereGeometry(0.2, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(pos);
  }

  update(dt: number): boolean {
    this.life -= dt;
    if (this.life <= 0) return true;
    const t = 1 - this.life / this.maxLife;
    this.mesh.scale.setScalar(1 + t * 2);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
    return false;
  }

  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
