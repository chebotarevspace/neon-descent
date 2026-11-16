import * as THREE from 'three';

export class Projectile {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life = 2.0;
  damage: number;
  fromEnemy: boolean;
  dead = false;

  constructor(pos: THREE.Vector3, dir: THREE.Vector3, damage: number, fromEnemy: boolean, speed = 40) {
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: fromEnemy ? 0xff3344 : 0x00f0ff,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(pos);
    this.vel = dir.clone().normalize().multiplyScalar(speed);
    this.damage = damage;
    this.fromEnemy = fromEnemy;
  }

  update(dt: number, physicsCollide: (pos: THREE.Vector3) => boolean): boolean {
    this.life -= dt;
    if (this.life <= 0) return true;
    const move = this.vel.clone().multiplyScalar(dt);
    this.mesh.position.add(move);
    if (physicsCollide(this.mesh.position)) return true;
    return false;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
