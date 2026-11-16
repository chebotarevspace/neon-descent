import * as THREE from 'three';

export class AssetFactory {
  static makeCanvasTexture(draw: (ctx: CanvasRenderingContext2D, s: number) => void, size = 128): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    draw(ctx, size);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static concreteTexture(): THREE.Texture {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = '#2a2d36';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 400; i++) {
        const v = 30 + Math.random() * 30;
        ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= s; i += 32) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
      }
    }, 128);
  }

  static metalTexture(): THREE.Texture {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= s; i += 16) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      }
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 1, 1);
      }
    }, 64);
  }

  static neonSignTexture(text: string, color: string): THREE.Texture {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, s, s);
      ctx.font = `bold ${s * 0.5}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = color;
      ctx.fillText(text, s / 2, s / 2);
    }, 128);
  }

  private static buildingMat: THREE.MeshStandardMaterial | null = null;
  private static stripeMats: Map<number, THREE.MeshBasicMaterial> = new Map();

  static building(width: number, height: number, depth: number, neonColor: number): THREE.Mesh {
    if (!this.buildingMat) {
      this.buildingMat = new THREE.MeshStandardMaterial({
        color: 0x1a1d28, roughness: 0.85, metalness: 0.2, flatShading: true,
      });
    }
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, this.buildingMat);

    let stripeMat = this.stripeMats.get(neonColor);
    if (!stripeMat) {
      stripeMat = new THREE.MeshBasicMaterial({ color: neonColor });
      this.stripeMats.set(neonColor, stripeMat);
    }
    const stripeGeo = new THREE.BoxGeometry(width * 1.02, 0.25, depth * 1.02);
    const stripes = Math.min(3, Math.max(1, Math.floor(height / 8)));
    for (let i = 1; i <= stripes; i++) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = -height / 2 + (i * height) / (stripes + 1);
      mesh.add(stripe);
    }
    return mesh;
  }

  static enemyMesh(color: number, scale: number, type: string): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, emissive: color, emissiveIntensity: 0.25 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222229, flatShading: true });

    if (type === 'drone') {
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 * scale), mat);
      g.add(body);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7 * scale, 0.08 * scale, 6, 12), darkMat);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    } else if (type === 'boss') {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 * scale, 0), mat);
      g.add(core);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 1.6 * scale), darkMat);
        arm.position.set(Math.cos(a) * 1.8 * scale, 0, Math.sin(a) * 1.8 * scale);
        arm.rotation.y = -a;
        g.add(arm);
      }
      const glow = new THREE.PointLight(color, 3, 20);
      g.add(glow);
    } else if (type === 'mutant') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5 * scale, 8, 6), mat);
      body.position.y = 0.7 * scale;
      body.scale.y = 1.3;
      g.add(body);
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 * scale, 0), mat);
      head.position.y = 1.4 * scale;
      g.add(head);
      const armGeo = new THREE.BoxGeometry(0.18 * scale, 0.9 * scale, 0.18 * scale);
      const a1 = new THREE.Mesh(armGeo, mat); a1.position.set(-0.5 * scale, 0.8 * scale, 0); a1.rotation.z = 0.3; g.add(a1);
      const a2 = new THREE.Mesh(armGeo, mat); a2.position.set(0.5 * scale, 0.8 * scale, 0); a2.rotation.z = -0.3; g.add(a2);
      const legGeo = new THREE.BoxGeometry(0.25 * scale, 1.0 * scale, 0.25 * scale);
      const l1 = new THREE.Mesh(legGeo, darkMat); l1.position.set(-0.25 * scale, 0, 0); g.add(l1);
      const l2 = new THREE.Mesh(legGeo, darkMat); l2.position.set(0.25 * scale, 0, 0); g.add(l2);
      g.userData.legs = [l1, l2];
      g.userData.body = body;
    } else if (type === 'turret') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * scale, 0.6 * scale, 0.3 * scale, 8), darkMat);
      base.position.y = 0.15 * scale;
      g.add(base);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      dome.position.y = 0.3 * scale;
      g.add(dome);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.7 * scale, 6), mat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.4 * scale, -0.4 * scale);
      g.add(barrel);
      g.userData.barrel = barrel;
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 1.0 * scale, 0.4 * scale), mat);
      body.position.y = 0.5 * scale;
      g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale), darkMat);
      head.position.y = 1.2 * scale;
      g.add(head);
      const legGeo = new THREE.BoxGeometry(0.22 * scale, 1.0 * scale, 0.22 * scale);
      const l1 = new THREE.Mesh(legGeo, darkMat); l1.position.set(-0.2 * scale, 0, 0); g.add(l1);
      const l2 = new THREE.Mesh(legGeo, darkMat); l2.position.set(0.2 * scale, 0, 0); g.add(l2);
      g.userData.legs = [l1, l2];
      g.userData.body = body;
      if (type === 'heavy') {
        const armor = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.5 * scale, 0.6 * scale),
          new THREE.MeshStandardMaterial({ color: 0x554466, flatShading: true, metalness: 0.6 }));
        armor.position.y = 0.9 * scale;
        g.add(armor);
      }
    }
    return g;
  }

  static weaponViewModel(id: string): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, flatShading: true, metalness: 0.7, roughness: 0.3 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.5 });

    if (id === 'pistol') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.32), mat);
      body.position.set(0, -0.05, -0.1);
      g.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), mat);
      grip.position.set(0, -0.18, 0.02);
      grip.rotation.x = 0.3;
      g.add(grip);
      const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.08), accent);
      sight.position.set(0, 0.06, -0.2);
      g.add(sight);
    } else if (id === 'smg') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.5), mat);
      body.position.set(0, -0.04, -0.15);
      g.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.1), mat);
      grip.position.set(0, -0.18, 0.05);
      g.add(grip);
    } else if (id === 'auto') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.6), mat);
      body.position.set(0, -0.04, -0.18);
      g.add(body);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), mat);
      barrel.position.set(0, -0.02, -0.5);
      g.add(barrel);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.07), accent);
      mag.position.set(0, -0.22, -0.05);
      g.add(mag);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.1), mat);
      grip.position.set(0, -0.18, 0.05);
      g.add(grip);
      const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.06), accent);
      sight.position.set(0, 0.06, -0.1);
      g.add(sight);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.8), mat);
      body.position.set(0, -0.04, -0.25);
      g.add(body);
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), accent);
      core.position.set(0, 0.02, -0.3);
      g.add(core);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.1), mat);
      grip.position.set(0, -0.18, 0.05);
      g.add(grip);
    }
    return g;
  }

  static gravityGunViewModel(): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1f2a, flatShading: true, metalness: 0.8, roughness: 0.2 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 2.0 });
    const ring = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 1.5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.4), mat);
    body.position.set(0, -0.04, -0.1);
    g.add(body);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), mat);
    grip.position.set(0, -0.18, 0.05);
    g.add(grip);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 8), mat);
    barrel.position.set(0, -0.02, -0.35);
    g.add(barrel);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glow);
    core.position.set(0, -0.02, -0.5);
    g.add(core);
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12), ring);
    r1.position.set(0, -0.02, -0.45);
    g.add(r1);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12), ring);
    r2.position.set(0, -0.02, -0.55);
    g.add(r2);
    return g;
  }
}
