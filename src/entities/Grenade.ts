import * as THREE from 'three';

export class Grenade {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  pos: THREE.Vector3;
  fuse = 1.5;
  exploded = false;
  explosionRadius = 6;
  explosionDamage = 80;
  private light: THREE.PointLight;

  constructor(pos: THREE.Vector3, dir: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.15, 6, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x33ff66, emissive: 0x33ff66, emissiveIntensity: 1.0 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.pos = pos.clone();
    this.mesh.position.copy(pos);
    this.vel = dir.clone().multiplyScalar(15);
    this.vel.y = 6;
    this.light = new THREE.PointLight(0x33ff66, 1, 4);
    this.mesh.add(this.light);
  }

  update(dt: number, physicsCollide: (pos: THREE.Vector3) => boolean): boolean {
    if (this.exploded) return true;
    this.fuse -= dt;
    if (this.fuse <= 0) return true;
    this.vel.y -= 18 * dt;
    this.pos.addScaledVector(this.vel, dt);
    if (this.pos.y < 0.15) {
      this.pos.y = 0.15;
      this.vel.y *= -0.4;
      this.vel.x *= 0.7;
      this.vel.z *= 0.7;
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.x += dt * 8;
    this.mesh.rotation.z += dt * 6;
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 1.0 + Math.sin(performance.now() * 0.02) * 0.5;
    return false;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
