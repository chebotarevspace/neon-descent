import * as THREE from 'three';

export class WeatherSystem {
  private scene: THREE.Scene;
  private rainGeo: THREE.BufferGeometry;
  private rainPoints: THREE.Points;
  private rainVelocities: Float32Array;
  private count = 1500;
  private area = 60;
  private active = false;
  private intensity = 0;
  private targetIntensity = 0;
  private splashGeo: THREE.BufferGeometry;
  private splashes: THREE.Points;
  private splashCount = 80;
  private splashData: Float32Array;
  private splashVel: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    this.rainVelocities = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.area;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.area;
      this.rainVelocities[i] = 25 + Math.random() * 15;
    }
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x88aacc, size: 0.12, transparent: true, opacity: 0.6, depthWrite: false,
    });
    this.rainPoints = new THREE.Points(this.rainGeo, rainMat);
    this.rainPoints.frustumCulled = false;
    this.rainPoints.visible = false;
    scene.add(this.rainPoints);

    this.splashGeo = new THREE.BufferGeometry();
    this.splashData = new Float32Array(this.splashCount * 3);
    this.splashVel = new Float32Array(this.splashCount);
    for (let i = 0; i < this.splashCount; i++) {
      this.splashData[i * 3] = 0;
      this.splashData[i * 3 + 1] = -10;
      this.splashData[i * 3 + 2] = 0;
      this.splashVel[i] = 0;
    }
    this.splashGeo.setAttribute('position', new THREE.BufferAttribute(this.splashData, 3));
    const splashMat = new THREE.PointsMaterial({
      color: 0x88aacc, size: 0.3, transparent: true, opacity: 0.4, depthWrite: false,
    });
    this.splashes = new THREE.Points(this.splashGeo, splashMat);
    this.splashes.frustumCulled = false;
    this.splashes.visible = false;
    scene.add(this.splashes);
  }

  setWeather(rain: boolean) {
    this.targetIntensity = rain ? 1 : 0;
    if (rain && !this.active) {
      this.active = true;
      this.rainPoints.visible = true;
      this.splashes.visible = true;
    }
  }

  isActive() { return this.active; }
  getIntensity() { return this.intensity; }

  update(dt: number, playerPos: THREE.Vector3) {
    if (!this.active) return;
    this.intensity += (this.targetIntensity - this.intensity) * dt * 1.5;
    if (this.intensity < 0.01 && this.targetIntensity === 0) {
      this.active = false;
      this.rainPoints.visible = false;
      this.splashes.visible = false;
      return;
    }

    const pos = this.rainGeo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const px = playerPos.x, pz = playerPos.z;
    for (let i = 0; i < this.count; i++) {
      arr[i * 3 + 1] -= this.rainVelocities[i] * dt;
      if (arr[i * 3 + 1] < 0) {
        const idx = Math.floor(Math.random() * this.splashCount);
        if (this.splashData[idx * 3 + 1] < -5) {
          this.splashData[idx * 3] = arr[i * 3];
          this.splashData[idx * 3 + 1] = 0.02;
          this.splashData[idx * 3 + 2] = arr[i * 3 + 2];
          this.splashVel[idx] = 0.5;
        }
        arr[i * 3] = px + (Math.random() - 0.5) * this.area;
        arr[i * 3 + 1] = 25 + Math.random() * 5;
        arr[i * 3 + 2] = pz + (Math.random() - 0.5) * this.area;
      }
      const dx = arr[i * 3] - px;
      const dz = arr[i * 3 + 2] - pz;
      if (Math.abs(dx) > this.area / 2) arr[i * 3] = px - Math.sign(dx) * this.area / 2 + (Math.random() - 0.5) * 4;
      if (Math.abs(dz) > this.area / 2) arr[i * 3 + 2] = pz - Math.sign(dz) * this.area / 2 + (Math.random() - 0.5) * 4;
    }
    pos.needsUpdate = true;

    const sPos = this.splashGeo.attributes.position as THREE.BufferAttribute;
    const sArr = sPos.array as Float32Array;
    for (let i = 0; i < this.splashCount; i++) {
      if (this.splashVel[i] > 0) {
        this.splashVel[i] -= dt * 2;
        sArr[i * 3 + 1] += this.splashVel[i] * dt * 0.5;
        if (this.splashVel[i] <= 0) { sArr[i * 3 + 1] = -10; }
      }
    }
    sPos.needsUpdate = true;
  }

  dispose() {
    this.rainGeo.dispose();
    this.splashGeo.dispose();
    (this.rainPoints.material as THREE.Material).dispose();
    (this.splashes.material as THREE.Material).dispose();
    this.scene.remove(this.rainPoints);
    this.scene.remove(this.splashes);
  }
}
