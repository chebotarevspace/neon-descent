import * as THREE from 'three';
import { AssetFactory } from '../engine/AssetFactory';

export class RemotePlayer {
  id: string;
  name: string;
  color: number;
  group: THREE.Group;
  private nameSprite: THREE.Sprite;
  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private weaponMesh: THREE.Mesh;
  private healthBar: THREE.Sprite;
  private targetPos = new THREE.Vector3();
  private currentPos = new THREE.Vector3();
  private targetYaw = 0;
  private currentYaw = 0;
  private targetPitch = 0;
  private health = 100;
  private maxHealth = 100;
  private dead = false;
  private lastUpdate = 0;

  constructor(id: string, name: string, color: number) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: color, emissive: color, emissiveIntensity: 0.3, flatShading: true,
    });
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8), bodyMat);
    this.body.position.y = 0.8;
    this.group.add(this.body);

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x222230, emissive: color, emissiveIntensity: 0.5, flatShading: true,
    });
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), headMat);
    this.head.position.y = 1.55;
    this.group.add(this.head);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.08, 0.02),
      new THREE.MeshBasicMaterial({ color: color }),
    );
    visor.position.set(0, 1.58, 0.16);
    this.group.add(visor);

    this.weaponMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x333340, flatShading: true }),
    );
    this.weaponMesh.position.set(0.25, 1.1, -0.2);
    this.group.add(this.weaponMesh);

    this.nameSprite = this.makeNameSprite(name, color);
    this.nameSprite.position.y = 2.1;
    this.group.add(this.nameSprite);

    const hbTex = AssetFactory.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = '#33ff66'; ctx.fillRect(0, s * 0.4, s, s * 0.6);
    }, 32);
    this.healthBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: hbTex, depthTest: false }));
    this.healthBar.scale.set(0.8, 0.1, 1);
    this.healthBar.position.y = 1.9;
    this.group.add(this.healthBar);
  }

  private makeNameSprite(name: string, color: number): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d')!;
    const hex = '#' + color.toString(16).padStart(6, '0');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = hex;
    ctx.shadowBlur = 8;
    ctx.fillStyle = hex;
    ctx.fillText(name, 128, 32);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  }

  updateState(x: number, y: number, z: number, yaw: number, pitch: number, health: number, maxHealth: number, dead: boolean) {
    this.targetPos.set(x, y, z);
    this.targetYaw = yaw;
    this.targetPitch = pitch;
    this.health = health;
    this.maxHealth = maxHealth;
    this.dead = dead;
    this.lastUpdate = performance.now();
  }

  update(dt: number) {
    const lerp = Math.min(1, dt * 15);
    this.currentPos.lerp(this.targetPos, lerp);
    this.group.position.copy(this.currentPos);

    let dy = this.targetYaw - this.currentYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.currentYaw += dy * lerp;
    this.group.rotation.y = this.currentYaw;

    this.head.rotation.x = this.targetPitch * 0.5;

    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;
    this.healthBar.scale.x = 0.8 * Math.max(0, ratio);
    this.healthBar.visible = !this.dead && ratio < 1;

    this.group.visible = !this.dead;

    if (this.dead) {
      this.group.rotation.z = Math.min(Math.PI / 2, (performance.now() - this.lastUpdate) * 0.001);
    } else {
      this.group.rotation.z = 0;
    }
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
}
