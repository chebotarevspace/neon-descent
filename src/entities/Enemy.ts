import * as THREE from 'three';
import { AssetFactory } from '../engine/AssetFactory';
import { ENEMIES } from '../data/enemies';
import type { EnemyId } from '../types/common';

type State = 'idle' | 'patrol' | 'alert' | 'attack' | 'flee' | 'dead';

export class Enemy {
  id: string;
  type: EnemyId;
  group: THREE.Group;
  pos: THREE.Vector3;
  health: number;
  maxHealth: number;
  state: State = 'idle';
  velocity = new THREE.Vector3();
  attackTimer = 0;
  hurtTimer = 0;
  dead = false;
  deadTimer = 0;
  patrolTarget: THREE.Vector3;
  detectRange: number;
  private config = ENEMIES.thug;
  private healthBar: THREE.Sprite;
  private bobPhase = Math.random() * Math.PI * 2;
  isBoss = false;
  bossPhase = 0;
  private tmpDir = new THREE.Vector3();
  private tmpPatrol = new THREE.Vector3();
  private walkPhase = 0;
  private cachedMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(type: EnemyId, pos: THREE.Vector3, id: string) {
    this.type = type;
    this.id = id;
    this.config = ENEMIES[type];
    this.pos = pos.clone();
    this.maxHealth = this.config.maxHealth;
    this.health = this.maxHealth;
    this.detectRange = this.config.detectRange;
    this.isBoss = type === 'boss';
    this.group = AssetFactory.enemyMesh(this.config.color, this.config.scale, type);
    this.group.position.copy(this.pos);
    this.patrolTarget = pos.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10
    ));

    const hbTex = AssetFactory.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = '#ff0000'; ctx.fillRect(0, s * 0.4, s, s * 0.6);
    }, 32);
    this.healthBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: hbTex, depthTest: false }));
    this.healthBar.scale.set(1.2, 0.15, 1);
    this.healthBar.position.y = this.config.scale * 1.8 + 0.3;
    this.healthBar.visible = false;
    this.group.add(this.healthBar);

    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        this.cachedMaterials.push(o.material as THREE.MeshStandardMaterial);
      }
    });
  }

  get config_() { return this.config; }

  takeDamage(amount: number): boolean {
    if (this.dead) return false;
    this.health -= amount;
    this.hurtTimer = 0.15;
    this.state = this.state === 'idle' ? 'alert' : this.state;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.state = 'dead';
      return true;
    }
    this.updateHealthBar();
    return false;
  }

  private updateHealthBar() {
    const ratio = this.health / this.maxHealth;
    this.healthBar.scale.x = 1.2 * Math.max(0, ratio);
    this.healthBar.visible = true;
    const mat = this.healthBar.material as THREE.SpriteMaterial;
    if (mat.map) {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#222'; ctx.fillRect(0, 12, 32, 20);
      ctx.fillStyle = ratio > 0.5 ? '#33ff66' : ratio > 0.25 ? '#ffaa00' : '#ff3333';
      ctx.fillRect(0, 12, 32 * ratio, 20);
      mat.map = new THREE.CanvasTexture(c);
      mat.needsUpdate = true;
    }
  }

  update(dt: number, playerPos: THREE.Vector3, hasLineOfSight: boolean, distToPlayer: number): { fired: boolean; damage: number } {
    const result = { fired: false, damage: 0 };
    if (this.dead) {
      this.deadTimer += dt;
      this.group.position.y = this.pos.y - Math.min(1, this.deadTimer * 2);
      this.group.rotation.z = Math.min(Math.PI / 2, this.deadTimer * 3);
      return result;
    }

    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.bobPhase += dt * 3;

    if (this.type === 'drone') {
      this.group.position.y = this.pos.y + Math.sin(this.bobPhase) * 0.3;
    }

    if (distToPlayer < this.detectRange && hasLineOfSight) {
      if (this.state === 'idle' || this.state === 'patrol') this.state = 'alert';
    }

    const dirToPlayer = this.tmpDir.subVectors(playerPos, this.pos);
    dirToPlayer.y = 0;
    const flatDist = dirToPlayer.length();

    if (this.state === 'alert' || this.state === 'attack') {
      if (flatDist > 0.01) dirToPlayer.normalize();
      this.group.rotation.y = Math.atan2(dirToPlayer.x, dirToPlayer.z);

      if (this.isBoss) {
        const phaseThreshold = this.maxHealth * (1 - this.bossPhase / 3);
        if (this.health < phaseThreshold && this.bossPhase < 2) this.bossPhase++;
      }

      const idealRange = this.config.ranged ? this.config.attackRange * 0.7 : this.config.attackRange;
      let moveSpeed = this.config.speed;
      if (flatDist > idealRange + 1) {
        this.velocity.x = dirToPlayer.x * moveSpeed;
        this.velocity.z = dirToPlayer.z * moveSpeed;
      } else if (flatDist < idealRange - 1 && this.config.ranged) {
        this.velocity.x = -dirToPlayer.x * moveSpeed * 0.6;
        this.velocity.z = -dirToPlayer.z * moveSpeed * 0.6;
      } else {
        this.velocity.x *= 0.8; this.velocity.z *= 0.8;
      }

      if (this.type === 'drone') {
        const desiredY = playerPos.y + 2 + Math.sin(this.bobPhase) * 0.5;
        this.pos.y += (desiredY - this.pos.y) * dt * 2;
      }

      this.state = flatDist <= this.config.attackRange ? 'attack' : 'alert';

      if (this.state === 'attack' && this.attackTimer <= 0) {
        this.attackTimer = this.config.attackCooldown;
        result.fired = true;
        result.damage = this.config.damage;
      }
    } else if (this.state === 'idle' || this.state === 'patrol') {
      const toPatrol = this.tmpPatrol.subVectors(this.patrolTarget, this.pos);
      toPatrol.y = 0;
      if (toPatrol.length() < 1) {
        this.patrolTarget.copy(this.pos).add(this.tmpDir.set(
          (Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12
        ));
      } else {
        toPatrol.normalize();
        this.velocity.x = toPatrol.x * this.config.speed * 0.4;
        this.velocity.z = toPatrol.z * this.config.speed * 0.4;
        this.group.rotation.y = Math.atan2(toPatrol.x, toPatrol.z);
      }
    }

    this.pos.x += this.velocity.x * dt;
    this.pos.z += this.velocity.z * dt;
    if (this.type !== 'drone') this.pos.y = 0;
    this.group.position.x = this.pos.x;
    this.group.position.z = this.pos.z;
    if (this.type !== 'drone') this.group.position.y = this.pos.y;

    const legs = this.group.userData.legs as THREE.Mesh[] | undefined;
    const bodyMesh = this.group.userData.body as THREE.Mesh | undefined;
    if (legs && !this.dead) {
      const moving = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
      if (moving > 0.5) {
        this.walkPhase += dt * this.config.speed * 3;
        const swing = Math.sin(this.walkPhase) * 0.5;
        legs[0].rotation.x = swing;
        legs[1].rotation.x = -swing;
        if (bodyMesh) bodyMesh.rotation.z = Math.sin(this.walkPhase * 0.5) * 0.04;
      } else {
        legs[0].rotation.x *= 0.8;
        legs[1].rotation.x *= 0.8;
        if (bodyMesh) bodyMesh.rotation.z *= 0.8;
      }
    }

    if (this.hurtTimer > 0) {
      for (let i = 0; i < this.cachedMaterials.length; i++) this.cachedMaterials[i].emissiveIntensity = 1.5;
    } else {
      for (let i = 0; i < this.cachedMaterials.length; i++) this.cachedMaterials[i].emissiveIntensity = 0.25;
    }

    return result;
  }

  private hitCenter = new THREE.Vector3();

  getHitSphere(): { center: THREE.Vector3; radius: number } {
    this.hitCenter.set(this.pos.x, this.pos.y + this.config.scale * 0.8, this.pos.z);
    return { center: this.hitCenter, radius: this.config.scale * 0.7 };
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
