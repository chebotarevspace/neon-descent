import * as THREE from 'three';
import { InputController } from '../engine/InputController';
import { Physics } from '../engine/Physics';
import { AssetFactory } from '../engine/AssetFactory';
import { WEAPONS, emptyUpgrades } from '../data/weapons';
import type { WeaponId, WeaponUpgrades, PlayerStats } from '../types/common';

export class Player {
  pos = new THREE.Vector3(0, 1.7, 0);
  vel = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  radius = 0.4;
  height = 1.7;
  onGround = false;

  maxHealth = 100;
  health = 100;
  stamina = 100;
  maxStamina = 100;

  level = 1;
  xp = 0;
  credits = 0;
  statPoints = 0;
  stats: PlayerStats = { health: 0, damage: 0, speed: 0, mag: 0 };

  weapons: WeaponId[] = ['pistol', 'auto'];
  activeWeapon: WeaponId = 'pistol';
  upgrades: Record<WeaponId, WeaponUpgrades> = {
    pistol: emptyUpgrades(), smg: emptyUpgrades(), shotgun: emptyUpgrades(), rifle: emptyUpgrades(), auto: emptyUpgrades(),
  };
  ammoInMag: Record<WeaponId, number> = { pistol: 12, smg: 30, shotgun: 6, rifle: 20, auto: 40 };
  ammoReserve: Record<WeaponId, number> = { pistol: 9999, smg: 9999, shotgun: 9999, rifle: 9999, auto: 9999 };

  reloading = false;
  reloadTimer = 0;
  fireTimer = 0;
  recoilOffset = 0;
  damageFlash = 0;
  grenades = 3;
  throwCooldown = 0;
  doubleDamageTimer = 0;
  shieldTimer = 0;
  infiniteAmmoTimer = 0;

  camera: THREE.PerspectiveCamera;
  viewModel: THREE.Group | null = null;
  muzzleFlash: THREE.PointLight;
  private muzzleTimer = 0;

  flashlight: THREE.SpotLight;
  flashlightTarget: THREE.Object3D;
  flashlightOn = true;
  playerGlow: THREE.PointLight;

  mouseSens = 0.0022;
  dead = false;
  lastDamageTime = 0;
  regenDelay = 5000;
  regenRate = 8;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.muzzleFlash = new THREE.PointLight(0xffcc44, 0, 8);
    this.muzzleFlash.position.set(0.2, -0.1, -0.5);
    camera.add(this.muzzleFlash);

    this.flashlight = new THREE.SpotLight(0xcfe8ff, 45, 70, Math.PI / 4, 0.6, 0.8);
    this.flashlight.position.set(0.15, -0.1, 0);
    camera.add(this.flashlight);
    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, 0, -1);
    camera.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    this.playerGlow = new THREE.PointLight(0x66aaff, 3.5, 16, 1.2);
    this.playerGlow.position.set(0, 0, 0);
    camera.add(this.playerGlow);
  }

  get weaponConfig() { return WEAPONS[this.activeWeapon]; }

  getUpgradeMag(): number {
    const base = this.weaponConfig.magSize;
    return base + this.upgrades[this.activeWeapon].magSize * Math.ceil(base * 0.25);
  }
  getUpgradeDamage(): number {
    const base = this.weaponConfig.damage;
    const dmg = base * (1 + this.upgrades[this.activeWeapon].damage * 0.2) * (1 + this.stats.damage * 0.1);
    return this.doubleDamageTimer > 0 ? dmg * 2 : dmg;
  }
  getUpgradeFireRate(): number {
    return this.weaponConfig.fireRate * (1 - this.upgrades[this.activeWeapon].fireRate * 0.12);
  }
  getUpgradeSpread(): number {
    return this.weaponConfig.spread * (1 - this.upgrades[this.activeWeapon].accuracy * 0.15);
  }
  getUpgradeReload(): number {
    return this.weaponConfig.reloadTime * (1 - this.upgrades[this.activeWeapon].reload * 0.12);
  }

  setViewModel() {
    if (this.viewModel) { this.camera.remove(this.viewModel); }
    this.viewModel = AssetFactory.weaponViewModel(this.activeWeapon);
    this.viewModel.position.set(0.25, -0.22, -0.45);
    this.camera.add(this.viewModel);
  }

  switchWeapon(id: WeaponId) {
    if (!this.weapons.includes(id)) return;
    this.activeWeapon = id;
    this.reloading = false;
    this.reloadTimer = 0;
    this.setViewModel();
  }

  cycleWeapon(dir: number) {
    const idx = this.weapons.indexOf(this.activeWeapon);
    const next = (idx + dir + this.weapons.length) % this.weapons.length;
    this.switchWeapon(this.weapons[next]);
  }

  addWeapon(id: WeaponId) {
    if (!this.weapons.includes(id)) {
      this.weapons.push(id);
      this.ammoInMag[id] = WEAPONS[id].magSize;
      this.ammoReserve[id] = 9999;
    }
  }

  takeDamage(amount: number): boolean {
    if (this.dead) return false;
    if (this.shieldTimer > 0) return false;
    this.health -= amount;
    this.damageFlash = 1;
    this.lastDamageTime = performance.now();
    if (this.health <= 0) { this.health = 0; this.dead = true; return true; }
    return false;
  }

  heal(amount: number) { this.health = Math.min(this.maxHealth, this.health + amount); }

  addXp(amount: number): boolean {
    this.xp += amount;
    const need = this.xpForNext();
    if (this.xp >= need) {
      this.xp -= need;
      this.level++;
      this.statPoints += 2;
      this.maxHealth += 10;
      this.health = this.maxHealth;
      return true;
    }
    return false;
  }

  xpForNext(): number { return Math.floor(80 * Math.pow(this.level, 1.5)); }

  update(dt: number, input: InputController, physics: Physics) {
    if (this.dead) return;

    const md = input.consumeMouseDelta();
    this.yaw -= md.dx * this.mouseSens;
    this.pitch -= md.dy * this.mouseSens;
    this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const fx = -sin, fz = -cos, rx = cos, rz = -sin;

    let mx = 0, mz = 0;
    if (input.isDown('KeyW')) { mx += fx; mz += fz; }
    if (input.isDown('KeyS')) { mx -= fx; mz -= fz; }
    if (input.isDown('KeyD')) { mx += rx; mz += rz; }
    if (input.isDown('KeyA')) { mx -= rx; mz -= rz; }

    const moveLenSq = mx * mx + mz * mz;
    const sprinting = input.isDown('ShiftLeft') && this.stamina > 0 && moveLenSq > 0;
    const baseSpeed = 5.0 * (1 + this.stats.speed * 0.08);
    const speed = sprinting ? baseSpeed * 1.7 : baseSpeed;

    if (sprinting) this.stamina = Math.max(0, this.stamina - dt * 25);
    else this.stamina = Math.min(this.maxStamina, this.stamina + dt * 15);

    if (moveLenSq > 0) {
      const inv = speed / Math.sqrt(moveLenSq);
      this.vel.x = mx * inv;
      this.vel.z = mz * inv;
    } else {
      this.vel.x = 0; this.vel.z = 0;
    }

    if (input.wasPressed('Space') && this.onGround) {
      this.vel.y = 8.0;
      this.onGround = false;
    }
    this.vel.y += physics.gravity * dt;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    physics.resolveCollision(this.pos, this.radius, this.height);

    if (this.pos.y <= 1.7) { this.pos.y = 1.7; this.vel.y = 0; this.onGround = true; }
    else { this.onGround = false; }

    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.recoilOffset *= Math.pow(0.0001, dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2);
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    if (this.muzzleTimer <= 0) this.muzzleFlash.intensity = 0;
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.doubleDamageTimer = Math.max(0, this.doubleDamageTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.infiniteAmmoTimer = Math.max(0, this.infiniteAmmoTimer - dt);

    if (performance.now() - this.lastDamageTime > this.regenDelay && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + dt * this.regenRate);
    }

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const mag = this.getUpgradeMag();
        const need = mag - this.ammoInMag[this.activeWeapon];
        const take = Math.min(need, this.ammoReserve[this.activeWeapon]);
        this.ammoInMag[this.activeWeapon] += take;
        this.ammoReserve[this.activeWeapon] -= take;
        this.reloading = false;
      }
    }

    if (input.wasPressed('KeyR')) this.startReload();
    if (input.wasPressed('KeyF')) {
      this.flashlightOn = !this.flashlightOn;
      this.flashlight.intensity = this.flashlightOn ? 45 : 0;
      this.playerGlow.intensity = this.flashlightOn ? 3.5 : 0;
    }
    const wheel = input.consumeWheel();
    if (wheel !== 0) this.cycleWeapon(wheel > 0 ? 1 : -1);
    for (let i = 1; i <= 5; i++) {
      if (input.wasPressed('Digit' + i)) {
        const ids: WeaponId[] = ['pistol', 'auto', 'smg', 'shotgun', 'rifle'];
        if (this.weapons.includes(ids[i - 1])) this.switchWeapon(ids[i - 1]);
      }
    }

    this.camera.position.copy(this.pos);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch + this.recoilOffset;

    if (this.viewModel) {
      const bob = Math.sin(performance.now() * 0.008) * (moveLenSq > 0 ? 0.012 : 0.004);
      this.viewModel.position.set(0.25 + bob, -0.22 - Math.abs(bob) * 0.5, -0.45);
      this.viewModel.rotation.x = this.recoilOffset * 0.5;
    }
  }

  startReload() {
    if (this.reloading) return;
    if (this.ammoInMag[this.activeWeapon] >= this.getUpgradeMag()) return;
    if (this.ammoReserve[this.activeWeapon] <= 0) return;
    this.reloading = true;
    this.reloadTimer = this.getUpgradeReload();
  }

  canFire(): boolean {
    return !this.reloading && this.fireTimer <= 0 && this.ammoInMag[this.activeWeapon] > 0 && !this.dead;
  }

  fire(): boolean {
    if (!this.canFire()) return false;
    if (this.infiniteAmmoTimer <= 0) this.ammoInMag[this.activeWeapon]--;
    this.fireTimer = this.getUpgradeFireRate();
    this.recoilOffset = Math.min(0.15, this.recoilOffset + this.weaponConfig.recoil * 0.02);
    this.muzzleFlash.intensity = 3;
    this.muzzleTimer = 0.05;
    if (this.ammoInMag[this.activeWeapon] === 0) this.startReload();
    return true;
  }

  getAimDir(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    const spread = this.getUpgradeSpread();
    dir.applyEuler(new THREE.Euler(
      this.pitch + this.recoilOffset + (Math.random() - 0.5) * spread,
      this.yaw + (Math.random() - 0.5) * spread,
      0, 'YXZ'
    ));
    return dir.normalize();
  }

  applyStat(stat: keyof PlayerStats): boolean {
    if (this.statPoints <= 0) return false;
    this.statPoints--;
    this.stats[stat]++;
    if (stat === 'health') { this.maxHealth += 15; this.health += 15; }
    return true;
  }
}
