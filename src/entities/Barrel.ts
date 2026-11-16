import * as THREE from 'three';

export class Barrel {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  health = 30;
  exploded = false;
  radius = 0.5;
  explosionRadius = 5;
  explosionDamage = 60;
  private blinkTimer = 0;

  constructor(pos: THREE.Vector3) {
    this.pos = pos.clone();
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.5, flatShading: true,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(pos);
    this.mesh.position.y = 0.6;
  }

  takeDamage(amount: number): boolean {
    if (this.exploded) return false;
    this.health -= amount;
    this.blinkTimer = 0.2;
    if (this.health <= 0) { this.exploded = true; return true; }
    return false;
  }

  update(dt: number) {
    if (this.blinkTimer > 0) {
      this.blinkTimer -= dt;
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5;
    } else if (!this.exploded) {
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5;
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
