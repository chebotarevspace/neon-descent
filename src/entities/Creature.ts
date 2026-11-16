import * as THREE from 'three';

export type CreatureType = 'wisp' | 'cybercat' | 'golem' | 'phantom';

type CreatureState = 'wander' | 'idle' | 'curious' | 'flee' | 'follow' | 'sit' | 'ghost';

export class Creature {
  type: CreatureType;
  group: THREE.Group;
  pos: THREE.Vector3;
  vel = new THREE.Vector3();
  state: CreatureState = 'wander';
  private phase = Math.random() * Math.PI * 2;
  private stateTimer = 0;
  private wanderTarget: THREE.Vector3;
  private light: THREE.PointLight | null = null;
  private parts: THREE.Mesh[] = [];
  private baseY = 0;
  private alpha = 1;
  private seen = false;
  id: string;

  constructor(type: CreatureType, pos: THREE.Vector3, id: string) {
    this.type = type;
    this.id = id;
    this.pos = pos.clone();
    this.baseY = pos.y;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.wanderTarget = pos.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10
    ));
    this.build();
  }

  private build() {
    if (this.type === 'wisp') {
      const mat = new THREE.MeshBasicMaterial({ color: 0x66ffaa, transparent: true, opacity: 0.8 });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mat);
      this.group.add(core);
      this.parts.push(core);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x33ff88, transparent: true, opacity: 0.2 }));
      this.group.add(glow);
      this.light = new THREE.PointLight(0x66ffaa, 2, 6);
      this.group.add(this.light);
    } else if (this.type === 'cybercat') {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, flatShading: true, metalness: 0.6, roughness: 0.3 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.9), bodyMat);
      body.position.y = 0.35;
      this.group.add(body);
      this.parts.push(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), bodyMat);
      head.position.set(0, 0.45, 0.5);
      this.group.add(head);
      this.parts.push(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), bodyMat);
      tail.position.set(0, 0.4, -0.55);
      this.group.add(tail);
      this.parts.push(tail);
      const legGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
      for (const [x, z] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]] as [number, number][]) {
        const leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.set(x, 0.15, z);
        this.group.add(leg);
        this.parts.push(leg);
      }
      const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
      e1.position.set(-0.08, 0.48, 0.64);
      this.group.add(e1);
      const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat);
      e2.position.set(0.08, 0.48, 0.64);
      this.group.add(e2);
      this.light = new THREE.PointLight(0x00ff88, 0.5, 3);
      this.light.position.y = 0.45;
      this.group.add(this.light);
    } else if (this.type === 'golem') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x224488, emissiveIntensity: 0.4, flatShading: true, metalness: 0.3, roughness: 0.6 });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), mat);
      core.position.y = 1.2;
      this.group.add(core);
      this.parts.push(core);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.2 + Math.random() * 0.15, 0), mat);
        shard.position.set(Math.cos(a) * 0.7, 1.2 + Math.sin(a * 2) * 0.3, Math.sin(a) * 0.7);
        this.group.add(shard);
        this.parts.push(shard);
      }
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat);
      base.position.y = 0.3;
      this.group.add(base);
      this.parts.push(base);
      this.light = new THREE.PointLight(0x4488ff, 1.5, 8);
      this.light.position.y = 1.2;
      this.group.add(this.light);
    } else if (this.type === 'phantom') {
      const mat = new THREE.MeshStandardMaterial({ color: 0xaaaaff, emissive: 0x6666cc, emissiveIntensity: 0.3, flatShading: true, transparent: true, opacity: 0.5 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), mat);
      body.position.y = 1.2;
      this.group.add(body);
      this.parts.push(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), mat);
      head.position.y = 1.9;
      this.group.add(head);
      this.parts.push(head);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.7 });
      const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat);
      e1.position.set(-0.1, 1.95, 0.2);
      this.group.add(e1);
      const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), eyeMat);
      e2.position.set(0.1, 1.95, 0.2);
      this.group.add(e2);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), mat);
      tail.position.y = 0.4;
      this.group.add(tail);
      this.parts.push(tail);
      this.light = new THREE.PointLight(0x6666cc, 0.8, 5);
      this.light.position.y = 1.2;
      this.group.add(this.light);
    }
  }

  update(dt: number, playerPos: THREE.Vector3): void {
    this.phase += dt * 2;
    this.stateTimer -= dt;

    const toPlayer = this.tmpVec.subVectors(playerPos, this.pos);
    const dist = toPlayer.length();

    if (this.type === 'wisp') {
      this.updateWisp(dt, dist, toPlayer);
    } else if (this.type === 'cybercat') {
      this.updateCybercat(dt, dist, toPlayer, playerPos);
    } else if (this.type === 'golem') {
      this.updateGolem(dt, dist, toPlayer);
    } else if (this.type === 'phantom') {
      this.updatePhantom(dt, dist, toPlayer, playerPos);
    }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.group.position.x = this.pos.x;
    this.group.position.z = this.pos.z;

    if (this.light) this.light.intensity = Math.max(0, this.light.intensity);
  }

  private tmpVec = new THREE.Vector3();

  private updateWisp(dt: number, dist: number, toPlayer: THREE.Vector3) {
    this.group.position.y = this.baseY + 1.5 + Math.sin(this.phase) * 0.4;
    if (this.light) this.light.intensity = 1.5 + Math.sin(this.phase * 2) * 0.5;

    if (dist < 5) {
      this.state = 'follow';
      const angle = Math.atan2(toPlayer.x, toPlayer.z) + Math.PI / 2;
      this.vel.x = Math.sin(angle) * 3;
      this.vel.z = Math.cos(angle) * 3;
      this.group.rotation.y = angle;
    } else if (dist < 10) {
      this.state = 'curious';
      this.vel.x = toPlayer.x * 0.3;
      this.vel.z = toPlayer.z * 0.3;
    } else {
      this.state = 'wander';
      if (this.stateTimer <= 0) {
        this.stateTimer = 2 + Math.random() * 3;
        this.wanderTarget.copy(this.pos).add(new THREE.Vector3(
          (Math.random() - 0.5) * 15, 0, (Math.random() - 0.5) * 15
        ));
      }
      this.tmpVec.subVectors(this.wanderTarget, this.pos);
      if (this.tmpVec.length() > 0.5) {
        this.tmpVec.normalize();
        this.vel.x = this.tmpVec.x * 1.5;
        this.vel.z = this.tmpVec.z * 1.5;
      } else {
        this.vel.x *= 0.9; this.vel.z *= 0.9;
      }
    }
    this.group.rotation.y += dt * 2;
  }

  private updateCybercat(dt: number, dist: number, toPlayer: THREE.Vector3, playerPos: THREE.Vector3) {
    if (dist < 4) {
      this.state = 'follow';
      if (toPlayer.length() > 0.01) toPlayer.normalize();
      this.vel.x = toPlayer.x * 2.5;
      this.vel.z = toPlayer.z * 2.5;
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      if (this.parts[1]) this.parts[1].rotation.z = Math.sin(this.phase * 3) * 0.15;
    } else if (dist < 8 && this.state !== 'sit') {
      this.state = 'curious';
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      this.vel.x *= 0.9; this.vel.z *= 0.9;
      if (Math.random() < 0.005) this.state = 'sit';
    } else {
      if (this.state === 'sit') {
        this.vel.x *= 0.8; this.vel.z *= 0.8;
        if (this.stateTimer <= 0) { this.state = 'wander'; this.stateTimer = 3 + Math.random() * 4; }
      } else {
        this.state = 'wander';
        if (this.stateTimer <= 0) {
          if (Math.random() < 0.3) { this.state = 'sit'; this.stateTimer = 2 + Math.random() * 3; }
          else { this.stateTimer = 2 + Math.random() * 3; this.wanderTarget.copy(this.pos).add(new THREE.Vector3(
            (Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12
          )); }
        }
        if (this.state === 'wander') {
          this.tmpVec.subVectors(this.wanderTarget, this.pos);
          if (this.tmpVec.length() > 0.5) {
            this.tmpVec.normalize();
            this.vel.x = this.tmpVec.x * 1.8;
            this.vel.z = this.tmpVec.z * 1.8;
            this.group.rotation.y = Math.atan2(this.tmpVec.x, this.tmpVec.z);
          } else { this.vel.x *= 0.8; this.vel.z *= 0.8; }
        }
      }
    }

    const moving = this.vel.x * this.vel.x + this.vel.z * this.vel.z;
    if (moving > 0.5 && this.state !== 'sit') {
      const swing = Math.sin(this.phase * 4) * 0.3;
      if (this.parts[2]) this.parts[2].rotation.x = swing;
      if (this.parts[1]) this.parts[1].rotation.z = Math.sin(this.phase * 4) * 0.05;
    } else if (this.state === 'sit') {
      if (this.parts[0]) this.parts[0].position.y = 0.2;
      if (this.parts[2]) this.parts[2].rotation.x = -0.8;
    } else {
      if (this.parts[0]) this.parts[0].position.y = 0.35;
      if (this.parts[2]) this.parts[2].rotation.x *= 0.8;
    }
  }

  private updateGolem(dt: number, dist: number, toPlayer: THREE.Vector3) {
    this.group.position.y = this.baseY + Math.sin(this.phase * 0.5) * 0.1;
    for (let i = 1; i < this.parts.length - 1; i++) {
      if (this.parts[i]) this.parts[i].rotation.y += dt * (0.5 + i * 0.1);
    }

    if (dist < 6) {
      this.state = 'curious';
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      this.vel.x *= 0.9; this.vel.z *= 0.9;
      if (this.light) this.light.intensity = 2.5;
    } else {
      this.state = 'wander';
      if (this.light) this.light.intensity = 1.5;
      if (this.stateTimer <= 0) {
        this.stateTimer = 4 + Math.random() * 4;
        this.wanderTarget.copy(this.pos).add(new THREE.Vector3(
          (Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20
        ));
      }
      this.tmpVec.subVectors(this.wanderTarget, this.pos);
      if (this.tmpVec.length() > 1) {
        this.tmpVec.normalize();
        this.vel.x = this.tmpVec.x * 0.8;
        this.vel.z = this.tmpVec.z * 0.8;
        this.group.rotation.y = Math.atan2(this.tmpVec.x, this.tmpVec.z);
      } else { this.vel.x *= 0.8; this.vel.z *= 0.8; }
    }
  }

  private updatePhantom(dt: number, dist: number, toPlayer: THREE.Vector3, playerPos: THREE.Vector3) {
    this.group.position.y = this.baseY + 0.5 + Math.sin(this.phase) * 0.3;

    if (dist < 12 && !this.seen) {
      this.seen = true;
      this.state = 'ghost';
      this.stateTimer = 3;
    }
    if (this.seen) {
      this.alpha = Math.max(0.1, this.alpha - dt * 0.3);
      if (this.stateTimer <= 0) { this.seen = false; this.alpha = 0.5; }
    } else {
      this.alpha = Math.min(0.5, this.alpha + dt * 0.2);
    }
    for (const p of this.parts) {
      const mat = p.material as THREE.MeshStandardMaterial;
      mat.opacity = this.alpha;
    }
    if (this.light) this.light.intensity = this.alpha * 1.5;

    if (this.stateTimer <= 0 && !this.seen) {
      this.stateTimer = 3 + Math.random() * 4;
      this.wanderTarget.copy(this.pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16
      ));
    }
    this.tmpVec.subVectors(this.wanderTarget, this.pos);
    if (this.tmpVec.length() > 0.5) {
      this.tmpVec.normalize();
      this.vel.x = this.tmpVec.x * 1.2;
      this.vel.z = this.tmpVec.z * 1.2;
      this.group.rotation.y = Math.atan2(this.tmpVec.x, this.tmpVec.z);
    } else { this.vel.x *= 0.9; this.vel.z *= 0.9; }

    for (const p of this.parts) {
      p.rotation.z = Math.sin(this.phase + p.position.y) * 0.05;
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
