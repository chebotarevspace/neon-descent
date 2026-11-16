import * as THREE from 'three';
import { AssetFactory } from '../engine/AssetFactory';
import { Physics } from '../engine/Physics';

export interface BuildingInstance {
  pos: THREE.Vector3;
  size: THREE.Vector3;
}

export class ProceduralCity {
  static generate(
    scene: THREE.Scene,
    physics: Physics,
    area: number,
    buildingCount: number,
    neonColors: number[],
    seed = 1,
    excludeZones: { x: number; z: number; r: number }[] = []
  ): BuildingInstance[] {
    const buildings: BuildingInstance[] = [];
    let placed = 0;
    let attempts = 0;
    const rng = mulberry32(seed);

    while (placed < buildingCount && attempts < buildingCount * 8) {
      attempts++;
      const w = 4 + Math.floor(rng() * 8);
      const h = 6 + Math.floor(rng() * 22);
      const d = 4 + Math.floor(rng() * 8);
      const x = (rng() - 0.5) * area * 2;
      const z = (rng() - 0.5) * area * 2;
      if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;

      let inZone = false;
      for (const ez of excludeZones) {
        const dx = x - ez.x, dz = z - ez.z;
        if (dx * dx + dz * dz < (ez.r + 4) * (ez.r + 4)) { inZone = true; break; }
      }
      if (inZone) continue;

      let tooClose = false;
      for (const b of buildings) {
        if (Math.abs(b.pos.x - x) < (b.size.x + w) / 2 + 1.5 &&
            Math.abs(b.pos.z - z) < (b.size.z + d) / 2 + 1.5) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const color = neonColors[Math.floor(rng() * neonColors.length)];
      const building = AssetFactory.building(w, h, d, color);
      building.position.set(x, h / 2, z);
      scene.add(building);
      physics.addBox(new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w, h, d));
      buildings.push({ pos: new THREE.Vector3(x, h / 2, z), size: new THREE.Vector3(w, h, d) });
      placed++;
    }
    return buildings;
  }

  private static groundTex: THREE.CanvasTexture | null = null;

  static addGround(scene: THREE.Scene, physics: Physics, size: number, color = 0x0a0c14): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    if (!this.groundTex) {
      this.groundTex = AssetFactory.makeCanvasTexture((ctx, s) => {
        ctx.fillStyle = '#0a0c14'; ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = 'rgba(0,240,255,0.08)'; ctx.lineWidth = 1;
        for (let i = 0; i <= s; i += 16) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
        }
      }, 128);
    }
    const tex = this.groundTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(size / 4, size / 4);
    mat.map = tex;
    return ground;
  }

  static addNeonStripes(scene: THREE.Scene, buildings: BuildingInstance[], colors: number[]) {
    const stripeMat = colors.map((c) => new THREE.MeshBasicMaterial({ color: c }));
    for (const b of buildings) {
      if (Math.random() < 0.4) {
        const c = stripeMat[Math.floor(Math.random() * stripeMat.length)];
        const geo = new THREE.BoxGeometry(b.size.x + 0.1, 0.15, b.size.z + 0.1);
        const stripe = new THREE.Mesh(geo, c);
        stripe.position.set(b.pos.x, b.pos.y + b.size.y / 2 - 1, b.pos.z);
        scene.add(stripe);
      }
    }
  }

  static addBarriers(scene: THREE.Scene, physics: Physics, positions: THREE.Vector3[]) {
    const geo = new THREE.BoxGeometry(2, 1.2, 0.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x442200, flatShading: true });
    for (const p of positions) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(p);
      scene.add(m);
      physics.addBox(p, new THREE.Vector3(2, 1.2, 0.4));
    }
  }
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
