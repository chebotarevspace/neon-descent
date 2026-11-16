import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  gravity: number;
  active: boolean;
}

interface Shell {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  active: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles = 300;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private shells: Shell[] = [];
  private shellGeo: THREE.BoxGeometry;
  private shellMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        life: 0, maxLife: 1, size: 0, color: new THREE.Color(),
        gravity: 0, active: false,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.15, vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.shellGeo = new THREE.BoxGeometry(0.04, 0.04, 0.12);
    this.shellMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.3 });
  }

  spawnSparks(pos: THREE.Vector3, dir: THREE.Vector3, count: number, color = 0xffaa44) {
    for (let i = 0; i < count; i++) {
      const p = this.getFree();
      if (!p) return;
      p.pos.copy(pos);
      p.vel.copy(dir).multiplyScalar(-1);
      p.vel.x += (Math.random() - 0.5) * 4;
      p.vel.y += Math.random() * 3 + 1;
      p.vel.z += (Math.random() - 0.5) * 4;
      p.vel.multiplyScalar(0.5 + Math.random() * 0.5);
      p.life = p.maxLife = 0.3 + Math.random() * 0.2;
      p.size = 0.08 + Math.random() * 0.06;
      p.color.setHex(color);
      p.gravity = -8;
      p.active = true;
    }
  }

  spawnMuzzleSmoke(pos: THREE.Vector3, dir: THREE.Vector3) {
    for (let i = 0; i < 3; i++) {
      const p = this.getFree();
      if (!p) return;
      p.pos.copy(pos);
      p.vel.copy(dir).multiplyScalar(1 + Math.random());
      p.vel.x += (Math.random() - 0.5) * 1;
      p.vel.y += (Math.random() - 0.5) * 1;
      p.vel.z += (Math.random() - 0.5) * 1;
      p.life = p.maxLife = 0.5 + Math.random() * 0.3;
      p.size = 0.12 + Math.random() * 0.08;
      p.color.setHex(0x888888);
      p.gravity = 1;
      p.active = true;
    }
  }

  spawnExplosion(pos: THREE.Vector3, color = 0xff6600, count = 30) {
    for (let i = 0; i < count; i++) {
      const p = this.getFree();
      if (!p) return;
      p.pos.copy(pos);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 4 + Math.random() * 8;
      p.vel.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      );
      p.life = p.maxLife = 0.4 + Math.random() * 0.4;
      p.size = 0.15 + Math.random() * 0.15;
      p.color.setHex(Math.random() < 0.5 ? color : 0xffcc00);
      p.gravity = -3;
      p.active = true;
    }
  }

  spawnShell(pos: THREE.Vector3, right: THREE.Vector3) {
    let shell = this.shells.find((s) => !s.active);
    if (!shell) {
      if (this.shells.length >= 15) return;
      const mesh = new THREE.Mesh(this.shellGeo, this.shellMat);
      this.scene.add(mesh);
      shell = { mesh, vel: new THREE.Vector3(), life: 0, active: false };
      this.shells.push(shell);
    }
    shell.mesh.position.copy(pos);
    shell.mesh.visible = true;
    shell.vel.copy(right).multiplyScalar(2 + Math.random());
    shell.vel.y = 2 + Math.random();
    shell.vel.x += (Math.random() - 0.5) * 1;
    shell.vel.z += (Math.random() - 0.5) * 1;
    shell.mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    shell.life = 2.5;
    shell.active = true;
  }

  private getFree(): Particle | null {
    for (const p of this.particles) if (!p.active) return p;
    return null;
  }

  update(dt: number) {
    let idx = 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vel.y += p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      const t = p.life / p.maxLife;
      this.positions[idx * 3] = p.pos.x;
      this.positions[idx * 3 + 1] = p.pos.y;
      this.positions[idx * 3 + 2] = p.pos.z;
      this.colors[idx * 3] = p.color.r * t;
      this.colors[idx * 3 + 1] = p.color.g * t;
      this.colors[idx * 3 + 2] = p.color.b * t;
      this.sizes[idx] = p.size * t;
      idx++;
    }
    const geo = this.points.geometry;
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    geo.setDrawRange(0, idx);

    for (const s of this.shells) {
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) { s.active = false; s.mesh.visible = false; continue; }
      s.vel.y -= 12 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      if (s.mesh.position.y < 0.05) {
        s.mesh.position.y = 0.05;
        s.vel.y *= -0.3;
        s.vel.x *= 0.6; s.vel.z *= 0.6;
      }
      s.mesh.rotation.x += dt * 8;
      s.mesh.rotation.z += dt * 6;
    }
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.scene.remove(this.points);
    this.shellGeo.dispose();
    this.shellMat.dispose();
    for (const s of this.shells) this.scene.remove(s.mesh);
  }
}
