import * as THREE from 'three';

export class DayNightCycle {
  time = 0.25;
  cycleDuration = 180;
  sun: THREE.DirectionalLight;
  moon: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  private skyMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;

  private daySky = new THREE.Color(0x4a6a9a);
  private nightSky = new THREE.Color(0x08081a);
  private dayFog = new THREE.Color(0x6a8aaa);
  private nightFog = new THREE.Color(0x05060a);
  private dayAmbient = new THREE.Color(0x6a8aaa);
  private nightAmbient = new THREE.Color(0x101020);

  constructor(scene: THREE.Scene) {
    this.sun = new THREE.DirectionalLight(0xffeecc, 1.0);
    this.sun.position.set(50, 80, 30);
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.moon = new THREE.DirectionalLight(0x6688cc, 0.0);
    this.moon.position.set(-40, 60, -20);
    scene.add(this.moon);
    scene.add(this.moon.target);

    this.hemi = new THREE.HemisphereLight(0x88aacc, 0x222244, 0.5);
    scene.add(this.hemi);

    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x4a6a9a) },
        bottomColor: { value: new THREE.Color(0x1a1a2e) },
        offset: { value: 0.1 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(500, 16, 8), this.skyMat);
    this.skyMesh.frustumCulled = false;
    scene.add(this.skyMesh);
  }

  update(dt: number, playerPos: THREE.Vector3) {
    this.time += dt / this.cycleDuration;
    if (this.time >= 1) this.time -= 1;

    const angle = this.time * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(angle);
    const sunX = Math.cos(angle) * 0.7;
    const sunZ = Math.cos(angle) * 0.3;

    this.sun.position.set(playerPos.x + sunX * 100, playerPos.y + sunY * 100, playerPos.z + sunZ * 100);
    this.sun.target.position.copy(playerPos);
    this.sun.target.updateMatrixWorld();

    this.moon.position.set(playerPos.x - sunX * 80, playerPos.y - sunY * 80, playerPos.z - sunZ * 80);
    this.moon.target.position.copy(playerPos);
    this.moon.target.updateMatrixWorld();

    const dayFactor = Math.max(0, sunY);
    const nightFactor = Math.max(0, -sunY);
    const dawnGlow = Math.max(0, 1 - Math.abs(sunY) * 3);

    this.sun.intensity = dayFactor * 1.2;
    this.moon.intensity = nightFactor * 0.3;

    const sunColor = new THREE.Color();
    if (dawnGlow > 0.1 && sunY > -0.3 && sunY < 0.3) {
      sunColor.setRGB(1.0, 0.5 + dayFactor * 0.5, 0.2 + dayFactor * 0.8);
    } else {
      sunColor.setRGB(1.0, 0.93, 0.8);
    }
    this.sun.color.copy(sunColor);

    const skyTop = new THREE.Color().copy(this.nightSky).lerp(this.daySky, dayFactor);
    if (dawnGlow > 0) {
      skyTop.r += dawnGlow * 0.3;
      skyTop.g += dawnGlow * 0.15;
    }
    const skyBottom = new THREE.Color(0x1a1a2e).lerp(new THREE.Color(0x8a6a4a), dayFactor * 0.5);
    if (dawnGlow > 0) {
      skyBottom.r += dawnGlow * 0.4;
      skyBottom.g += dawnGlow * 0.2;
      skyBottom.b += dawnGlow * 0.1;
    }
    this.skyMat.uniforms.topColor.value.copy(skyTop);
    this.skyMat.uniforms.bottomColor.value.copy(skyBottom);

    this.hemi.color.copy(this.nightAmbient).lerp(this.dayAmbient, dayFactor);
    this.hemi.intensity = 0.2 + dayFactor * 0.5;

    this.skyMesh.position.copy(playerPos);
  }

  getAmbientColor(target: THREE.Color): THREE.Color {
    const dayFactor = Math.max(0, Math.sin(this.time * Math.PI * 2 - Math.PI / 2));
    return target.copy(this.nightAmbient).lerp(this.dayAmbient, dayFactor);
  }

  getFogColor(target: THREE.Color): THREE.Color {
    const angle = this.time * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(angle);
    const dayFactor = Math.max(0, sunY);
    const dawnGlow = Math.max(0, 1 - Math.abs(sunY) * 3);
    const c = target.copy(this.nightFog).lerp(this.dayFog, dayFactor);
    if (dawnGlow > 0) {
      c.r += dawnGlow * 0.15;
      c.g += dawnGlow * 0.08;
    }
    return c;
  }

  getFogDensity(base: number): number {
    const dayFactor = Math.max(0, Math.sin(this.time * Math.PI * 2 - Math.PI / 2));
    return base * (0.6 + (1 - dayFactor) * 0.8);
  }

  isNight(): boolean {
    const sunY = Math.sin(this.time * Math.PI * 2 - Math.PI / 2);
    return sunY < -0.2;
  }

  getDayFactor(): number {
    return Math.max(0, Math.sin(this.time * Math.PI * 2 - Math.PI / 2));
  }

  getTimeString(): string {
    const hours = Math.floor(this.time * 24);
    const minutes = Math.floor((this.time * 24 - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.sun);
    scene.remove(this.sun.target);
    scene.remove(this.moon);
    scene.remove(this.moon.target);
    scene.remove(this.hemi);
    scene.remove(this.skyMesh);
    this.skyMesh.geometry.dispose();
    this.skyMat.dispose();
  }
}
