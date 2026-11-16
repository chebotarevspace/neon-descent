import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { InputController } from './InputController';
import { Physics } from './Physics';
import { AudioSystem } from './AudioSystem';
import { WeatherSystem } from './WeatherSystem';
import { ParticleSystem } from './ParticleSystem';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Pickup, HitEffect, PickupType } from '../entities/Pickup';
import { Barrel } from '../entities/Barrel';
import { Grenade } from '../entities/Grenade';
import { Creature, CreatureType } from '../entities/Creature';
import { GravityGun } from '../entities/GravityGun';
import { DayNightCycle } from './DayNightCycle';
import { MultiplayerManager, PlayerState, NetMessage } from '../net/MultiplayerManager';
import { RemotePlayer } from '../net/RemotePlayer';
import { Hud } from '../systems/Hud';
import { QuestSystem } from '../systems/QuestSystem';
import { SaveSystem } from '../systems/SaveSystem';
import type { SaveData } from '../types/common';
import { MenuManager } from '../ui/MenuManager';
import { Hub } from '../world/Hub';
import { Level, Interactable } from '../world/Level';
import { Sewers } from '../world/levels/Sewers';
import { NeonDock } from '../world/levels/NeonDock';
import { SkyTower } from '../world/levels/SkyTower';
import { Undercity } from '../world/levels/Undercity';
import { Forest } from '../world/levels/Forest';
import { Mountains } from '../world/levels/Mountains';
import { Dungeon } from '../world/levels/Dungeon';
import { ENEMIES } from '../data/enemies';
import { WEAPONS, UPGRADE_COSTS, MAX_UPGRADE_LEVEL } from '../data/weapons';
import { QUESTS } from '../data/quests';
import type { GamePhase, WeaponId, WeaponUpgrades, EnemyId } from '../types/common';

export class Game {
  container: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  input: InputController;
  physics: Physics;
  audio: AudioSystem;
  weather: WeatherSystem;
  particles: ParticleSystem;
  player: Player;
  hud: Hud;
  quests: QuestSystem;
  save: SaveSystem;
  menu: MenuManager;

  phase: GamePhase = 'menu';
  currentLevel: Level | null = null;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  barrels: Barrel[] = [];
  grenades: Grenade[] = [];
  creatures: Creature[] = [];
  hitEffects: HitEffect[] = [];
  enemyIdCounter = 0;

  private clock = new THREE.Clock();
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private fog: THREE.FogExp2;
  private hudRoot: HTMLElement;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private nearInteractable: Interactable | null = null;
  private surviveTimer = 0;
  private surviveActive = false;
  private boss: Enemy | null = null;
  private clearedLevels = new Set<string>();
  private worldFlags: Record<string, boolean> = {};
  private gravityGun: GravityGun;
  private dayNight: DayNightCycle;
  private nightSpawned = false;
  private mp: MultiplayerManager | null = null;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private isMultiplayer = false;
  private mpStateTimer = 0;
  private mpPlayerName = 'Игрок';
  private mpPlayerColor = 0x00f0ff;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x05060a, 0.008);
    this.scene.fog = this.fog;
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

    this.ambientLight = new THREE.AmbientLight(0x6070a0, 1.1);
    this.scene.add(this.ambientLight);
    this.hemiLight = new THREE.HemisphereLight(0x6688ff, 0x0a0a14, 1.0);
    this.scene.add(this.hemiLight);
    this.scene.add(this.camera);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth * 0.75, window.innerHeight * 0.75),
      0.18, 0.3, 0.95
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.input = new InputController(this.renderer.domElement);
    this.physics = new Physics();
    this.audio = new AudioSystem();
    this.weather = new WeatherSystem(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.player = new Player(this.camera);
    this.gravityGun = new GravityGun(this.camera);
    this.dayNight = new DayNightCycle(this.scene);
    this.quests = new QuestSystem();
    this.save = new SaveSystem();

    this.hudRoot = document.createElement('div');
    container.appendChild(this.hudRoot);
    this.hud = new Hud(this.hudRoot);

    this.menu = new MenuManager(container, this.save, this.quests, () => this.player);
    this.bindMenuCallbacks();
    this.bindQuestCallbacks();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);

    this.quests.init();
    this.menu.showMainMenu();
    this.loop();
  }

  private bindMenuCallbacks() {
    this.menu.onNewGame = () => this.startNewGame();
    this.menu.onResume = () => this.resume();
    this.menu.onQuitToMenu = () => this.quitToMenu();
    this.menu.onRespawn = () => this.respawn();
    this.menu.onSave = (slot) => this.saveGame(slot);
    this.menu.onLoad = (slot) => this.loadGame(slot);
    this.menu.onDeleteSave = (slot) => this.save.deleteSlot(slot);
    this.menu.onBuyUpgrade = (w, s) => this.buyUpgrade(w, s);
    this.menu.onBuyWeapon = (w) => this.buyWeapon(w);
    this.menu.onApplyStat = (s) => this.applyStat(s);
    this.menu.onActivateQuest = (id) => this.quests.activate(id);
    this.menu.onSettingsChange = (s) => {
      if (s.mouseSens) this.player.mouseSens = s.mouseSens;
      if (s.volume !== undefined) this.audio.setVolume(s.volume);
    };
    this.menu.onToggleWeather = () => {
      const active = this.weather.isActive();
      this.weather.setWeather(!active);
      if (!active) this.audio.startRain(); else this.audio.stopRain();
      this.hud.notify(active ? 'Дождь выключен' : 'Дождь включён', '#66aaff');
    };
    this.menu.onHostMultiplayer = (name, color) => this.hostMultiplayer(name, color);
    this.menu.onJoinMultiplayer = (name, color, code) => this.joinMultiplayer(name, color, code);
    this.menu.onLeaveMultiplayer = () => this.leaveMultiplayer();
  }

  private bindQuestCallbacks() {
    this.quests.onQuestActivated = (q) => { this.hud.notify(`Новый квест: ${q.title}`, '#ffcc00'); this.audio.questNew(); };
    this.quests.onQuestCompleted = (q) => {
      this.hud.notify(`Квест выполнен: ${q.title} (+${q.rewards.xp} XP, +${q.rewards.credits} cr)`, '#33ff66');
      this.audio.questDone();
      const leveled = this.player.addXp(q.rewards.xp);
      this.player.credits += q.rewards.credits;
      if (q.rewards.weapon) this.player.addWeapon(q.rewards.weapon);
      if (leveled) { this.hud.notify(`Новый уровень: ${this.player.level}!`, '#ff00aa'); this.audio.levelUp(); }
    };
    this.quests.onObjectiveUpdated = () => { this.updateQuestHud(); };
  }

  startNewGame() {
    this.audio.init(); this.audio.resume(); this.audio.startAmbient();
    this.quests.init();
    this.player = new Player(this.camera);
    this.player.setViewModel();
    this.clearedLevels.clear();
    this.worldFlags = {};
    this.loadLevel('hub');
    this.phase = 'playing';
    this.input.requestPointerLock();
    this.hud.setVisible(true);
    const qid = this.quests.autoActivateFirst();
    if (qid) this.hud.notify('Квест принят: Зачистка Нижнего города', '#ffcc00');
    this.updateQuestHud();
  }

  quitToMenu() {
    this.phase = 'menu';
    this.input.exitPointerLock();
    this.audio.stopAmbient();
    this.audio.stopRain();
    this.weather.setWeather(false);
    this.unloadLevel();
    this.clearRemotePlayers();
    this.hud.setVisible(false);
    this.menu.showMainMenu();
  }

  private hostMultiplayer(name: string, color: number) {
    this.mpPlayerName = name;
    this.mpPlayerColor = color;
    this.mp = new MultiplayerManager();
    this.mp.host(name, color).then((code) => {
      this.isMultiplayer = true;
      this.menu.showMultiplayerLobby(code, [], true);
    }).catch((err) => {
      this.menu.showMultiplayerError(`Не удалось создать комнату: ${err.message || err}`);
      this.mp = null;
    });
    this.setupMpHandlers();
  }

  private joinMultiplayer(name: string, color: number, code: string) {
    this.mpPlayerName = name;
    this.mpPlayerColor = color;
    this.mp = new MultiplayerManager();
    this.mp.join(name, color, code).then(() => {
      this.isMultiplayer = true;
      this.menu.showMultiplayerLobby(code, [], false);
    }).catch((err) => {
      this.menu.showMultiplayerError(`Не удалось подключиться: ${err.message || err}. Проверь код комнаты.`);
      this.mp = null;
    });
    this.setupMpHandlers();
  }

  private leaveMultiplayer() {
    if (this.mp) { this.mp.disconnect(); this.mp = null; }
    this.isMultiplayer = false;
    this.clearRemotePlayers();
  }

  private clearRemotePlayers() {
    for (const [, rp] of this.remotePlayers) {
      this.scene.remove(rp.group);
      rp.dispose();
    }
    this.remotePlayers.clear();
  }

  private setupMpHandlers() {
    if (!this.mp) return;
    this.mp.on((msg: NetMessage) => {
      switch (msg.type) {
        case 'state':
          if (msg.from && msg.data) {
            this.handleRemoteState(msg.from, msg.data as PlayerState);
          }
          break;
        case 'playerLeft':
          if (msg.data?.id && this.remotePlayers.has(msg.data.id)) {
            const rp = this.remotePlayers.get(msg.data.id)!;
            this.scene.remove(rp.group);
            rp.dispose();
            this.remotePlayers.delete(msg.data.id);
            this.hud.notify(`Игрок отключился`, '#888');
          }
          break;
        case 'enemyHit':
          if (msg.data?.enemyId && msg.data?.damage) {
            const e = this.enemies.find((en) => en.id === msg.data.enemyId);
            if (e && !e.dead) {
              if (e.takeDamage(msg.data.damage)) this.onEnemyKilled(e);
            }
          }
          break;
        case 'levelLoad':
          if (msg.data?.levelId) {
            if (this.phase !== 'playing') {
              this.audio.init(); this.audio.resume(); this.audio.startAmbient();
              this.quests.init();
              this.player.setViewModel();
              this.hud.setVisible(true);
              this.phase = 'playing';
            }
            this.loadLevel(msg.data.levelId);
            this.input.requestPointerLock();
          }
          break;
        case 'playerJoined':
          if (msg.data?.id && msg.data?.name) {
            this.hud.notify(`Игрок ${msg.data.name} присоединился`, '#33ff66');
          }
          break;
      }
    });
  }

  private handleRemoteState(id: string, state: PlayerState) {
    if (id === this.mp?.myId) return;
    let rp = this.remotePlayers.get(id);
    if (!rp) {
      rp = new RemotePlayer(id, state.name || 'Player', state.color || 0x00f0ff);
      this.remotePlayers.set(id, rp);
      this.scene.add(rp.group);
    }
    rp.updateState(state.x, state.y, state.z, state.yaw, state.pitch, state.health, state.maxHealth, state.dead);
  }

  private sendMpState() {
    if (!this.mp || !this.mp.connected) return;
    const state: PlayerState = {
      x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z,
      yaw: this.player.yaw, pitch: this.player.pitch,
      health: this.player.health, maxHealth: this.player.maxHealth,
      weapon: this.player.activeWeapon,
      name: this.mpPlayerName, color: this.mpPlayerColor,
      dead: this.player.dead,
    };
    this.mp.queueState(state);
    this.mp.flushState();
  }

  resume() {
    if (this.phase !== 'paused' && this.phase !== 'dead') return;
    this.phase = 'playing';
    this.input.requestPointerLock();
    this.audio.resume();
  }

  pause() {
    if (this.phase !== 'playing') return;
    this.phase = 'paused';
    this.input.exitPointerLock();
    this.menu.showPauseMenu();
  }

  private loadLevel(id: string) {
    this.unloadLevel();
    this.physics.clear();

    if (this.isMultiplayer && this.mp && this.mp.isHost) {
      this.mp.send({ type: 'levelLoad', data: { levelId: id } });
    }

    let level: Level;
    if (id === 'hub') level = new Hub(this.scene, this.physics);
    else if (id === 'sewers') level = new Sewers(this.scene, this.physics);
    else if (id === 'neondock') level = new NeonDock(this.scene, this.physics);
    else if (id === 'skytower') level = new SkyTower(this.scene, this.physics);
    else if (id === 'undercity') level = new Undercity(this.scene, this.physics);
    else if (id === 'forest') level = new Forest(this.scene, this.physics);
    else if (id === 'mountains') level = new Mountains(this.scene, this.physics);
    else if (id === 'dungeon') level = new Dungeon(this.scene, this.physics);
    else level = new Hub(this.scene, this.physics);

    level.build();
    this.currentLevel = level;
    this.fog.color.setHex(level.fogColor);
    this.fog.density = level.fogDensity;
    this.scene.background = new THREE.Color(level.fogColor);

    this.player.pos.copy(level.spawnPoint);
    this.player.vel.set(0, 0, 0);
    this.player.yaw = 0; this.player.pitch = 0;

    this.boss = null;
    this.hud.hideBoss();
    this.nightSpawned = false;

    if (!this.clearedLevels.has(id)) {
      this.spawnEnemiesFromLevel(level);
    }

    if (id === 'sewers') {
      this.pickups.push(new Pickup('credits', new THREE.Vector3(-7, 0, -7), 80));
      this.pickups.push(new Pickup('health', new THREE.Vector3(7, 0, -7), 30));
    }
    if (id === 'neondock') {
      this.pickups.push(new Pickup('ammo', new THREE.Vector3(-12, 0, 8), 60, 'smg'));
      this.pickups.push(new Pickup('health', new THREE.Vector3(12, 0, 8), 40));
    }
    if (id === 'skytower') {
      this.pickups.push(new Pickup('health', new THREE.Vector3(-7, 0, -16), 50));
      this.pickups.push(new Pickup('ammo', new THREE.Vector3(7, 0, -16), 40, 'rifle'));
    }
    if (id === 'undercity') {
      this.pickups.push(new Pickup('health', new THREE.Vector3(-8, 0, -8), 35));
      this.pickups.push(new Pickup('health', new THREE.Vector3(8, 0, -8), 35));
      this.pickups.push(new Pickup('credits', new THREE.Vector3(0, 0, 0), 120));
    }
    if (id === 'forest') {
      this.pickups.push(new Pickup('health', new THREE.Vector3(-5, 0, 0), 30));
      this.pickups.push(new Pickup('health', new THREE.Vector3(5, 0, 0), 30));
      this.pickups.push(new Pickup('credits', new THREE.Vector3(0, 0, -10), 100));
    }
    if (id === 'mountains') {
      this.pickups.push(new Pickup('health', new THREE.Vector3(0, 0, -15), 40));
      this.pickups.push(new Pickup('ammo', new THREE.Vector3(-3, 0, -15), 50, 'rifle'));
      this.pickups.push(new Pickup('credits', new THREE.Vector3(3, 0, -15), 100));
    }
    if (id === 'dungeon') {
      this.pickups.push(new Pickup('health', new THREE.Vector3(-4, 0, 0), 35));
      this.pickups.push(new Pickup('health', new THREE.Vector3(4, 0, 0), 35));
      this.pickups.push(new Pickup('ammo', new THREE.Vector3(0, 0, -12), 50, 'shotgun'));
    }
    for (const pk of this.pickups) this.scene.add(pk.mesh);

    const barrelPositions: [number, number][] = id === 'sewers' ? [[-6, -4], [6, -4], [-6, 4], [6, 4]]
      : id === 'neondock' ? [[-8, 0], [8, 0], [-8, 8], [8, 8]]
      : id === 'undercity' ? [[-6, -8], [6, -8], [0, -6]]
      : id === 'forest' ? [[-10, -5], [10, -5]]
      : id === 'mountains' ? [[-8, -12], [8, -12]]
      : id === 'dungeon' ? [[-4, -8], [4, -8]]
      : [];
    for (const [x, z] of barrelPositions) {
      const b = new Barrel(new THREE.Vector3(x, 0, z));
      this.barrels.push(b);
      this.scene.add(b.mesh);
      this.physics.addBox(new THREE.Vector3(x, 0.6, z), new THREE.Vector3(1, 1.2, 1));
    }

    this.spawnCreatures(id);

    this.surviveActive = this.quests.states.get('s2_waves')?.status === 'active';
    this.surviveTimer = 0;

    const rainLevels = ['sewers', 'neondock', 'undercity'];
    const wantRain = rainLevels.includes(id);
    this.weather.setWeather(wantRain);
    if (wantRain) this.audio.startRain(); else this.audio.stopRain();
  }

  private unloadLevel() {
    for (const e of this.enemies) { this.scene.remove(e.group); e.dispose(); }
    this.enemies = [];
    for (const p of this.projectiles) { this.scene.remove(p.mesh); p.dispose(); }
    this.projectiles = [];
    for (const p of this.pickups) { this.scene.remove(p.mesh); p.dispose(); }
    this.pickups = [];
    for (const b of this.barrels) { this.scene.remove(b.mesh); b.dispose(); }
    this.barrels = [];
    for (const g of this.grenades) { this.scene.remove(g.mesh); g.dispose(); }
    this.grenades = [];
    for (const c of this.creatures) { this.scene.remove(c.group); c.dispose(); }
    this.creatures = [];
    for (const h of this.hitEffects) { this.scene.remove(h.mesh); h.dispose(); }
    this.hitEffects = [];
    if (this.currentLevel) this.currentLevel.dispose();
    this.currentLevel = null;
  }

  private spawnEnemiesFromLevel(level: Level) {
    for (let i = 0; i < level.spawns.length; i++) {
      const spawn = level.spawns[i];
      const id = `enemy_${i}`;
      const enemy = new Enemy(spawn.type, spawn.pos, id);
      this.enemies.push(enemy);
      this.scene.add(enemy.group);
      if (spawn.type === 'boss') this.boss = enemy;
    }
  }

  private spawnCreatures(levelId: string) {
    const configs: Record<string, { type: CreatureType; pos: [number, number, number] }[]> = {
      hub: [
        { type: 'wisp', pos: [8, 0, -8] },
        { type: 'wisp', pos: [-8, 0, 8] },
        { type: 'cybercat', pos: [10, 0, 10] },
        { type: 'cybercat', pos: [-10, 0, -10] },
        { type: 'golem', pos: [20, 0, -20] },
      ],
      forest: [
        { type: 'wisp', pos: [5, 0, -5] },
        { type: 'wisp', pos: [-5, 0, -10] },
        { type: 'wisp', pos: [10, 0, -15] },
        { type: 'phantom', pos: [-15, 0, -20] },
        { type: 'phantom', pos: [20, 0, -25] },
        { type: 'cybercat', pos: [0, 0, -20+5] },
      ],
      mountains: [
        { type: 'golem', pos: [-10, 0, -15] },
        { type: 'golem', pos: [15, 0, -20] },
        { type: 'wisp', pos: [0, 0, -10] },
        { type: 'phantom', pos: [-20, 0, -25] },
      ],
      dungeon: [
        { type: 'phantom', pos: [-14, 0, -12] },
        { type: 'phantom', pos: [14, 0, -12] },
        { type: 'phantom', pos: [0, 0, -30] },
        { type: 'wisp', pos: [0, 0, -5] },
        { type: 'golem', pos: [-18, 0, -8] },
      ],
      sewers: [
        { type: 'wisp', pos: [-5, 0, -5] },
        { type: 'cybercat', pos: [5, 0, -10] },
      ],
      neondock: [
        { type: 'cybercat', pos: [-10, 0, 5] },
        { type: 'golem', pos: [10, 0, -10] },
      ],
      undercity: [
        { type: 'wisp', pos: [-8, 0, -6] },
        { type: 'phantom', pos: [8, 0, -10] },
      ],
      skytower: [
        { type: 'golem', pos: [-6, 0, -14] },
        { type: 'golem', pos: [6, 0, -14] },
      ],
    };
    const list = configs[levelId];
    if (!list) return;
    for (const c of list) {
      const creature = new Creature(c.type, new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]), `creature_${this.enemyIdCounter++}`);
      this.creatures.push(creature);
      this.scene.add(creature.group);
    }
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.bloomPass.setSize(window.innerWidth * 0.75, window.innerHeight * 0.75);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'F11') {
      e.preventDefault();
      this.menu.toggleFullscreen();
    }
  };

  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());

    if (this.phase === 'playing') {
      this.update(dt);
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private update(dt: number) {
    if (this.input.wasPressed('Escape')) { this.pause(); this.input.endFrame(); return; }
    if (this.input.wasPressed('Tab')) { this.pause(); this.menu.showQuestLog(); this.input.endFrame(); return; }

    if (this.input.wasPressed('KeyG') && this.player.grenades > 0 && this.player.throwCooldown <= 0) {
      this.player.grenades--;
      this.player.throwCooldown = 0.5;
      this.audio.throwGrenade();
      const dir = this.player.getAimDir();
      const pos = this.camera.position.clone().add(dir.clone().multiplyScalar(1));
      const g = new Grenade(pos, dir);
      this.grenades.push(g);
      this.scene.add(g.mesh);
    }

    if (this.input.wasPressed('KeyV')) {
      const on = this.gravityGun.toggle();
      if (on) {
        this.hud.notify('Грави-пушка активирована', '#ff6600');
        this.player.viewModel && (this.player.viewModel.visible = false);
      } else {
        this.hud.notify('Грави-пушка деактивирована', '#888888');
        this.player.viewModel && (this.player.viewModel.visible = true);
      }
    }

    if (this.gravityGun.active) {
      let weaponSwitched = false;
      const wheel = this.input.consumeWheel();
      if (wheel !== 0) weaponSwitched = true;
      for (let i = 1; i <= 5; i++) {
        if (this.input.wasPressed('Digit' + i)) weaponSwitched = true;
      }
      if (weaponSwitched) {
        this.gravityGun.toggle();
        this.player.viewModel && (this.player.viewModel.visible = true);
      }
    }

    this.player.update(dt, this.input, this.physics);

    if (this.player.dead) {
      this.phase = 'dead';
      this.input.exitPointerLock();
      this.menu.showDeathScreen();
      return;
    }

    if (this.gravityGun.active) {
      this.handleGravityGun(dt);
    } else {
      this.handleCombat(dt);
    }
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateInteractables(dt);
    this.updateHitEffects(dt);
    this.weather.update(dt, this.player.pos);
    this.particles.update(dt);
    this.updateBarrels(dt);
    this.updateGrenades(dt);
    this.updateCreatures(dt);

    if (this.isMultiplayer) {
      this.mpStateTimer += dt;
      if (this.mpStateTimer > 0.066) {
        this.mpStateTimer = 0;
        this.sendMpState();
      }
      for (const [, rp] of this.remotePlayers) rp.update(dt);
    }

    this.dayNight.update(dt, this.player.pos);
    this.updateDayNight();

    const rainI = this.weather.getIntensity();
    this.renderer.toneMappingExposure = 1.4 + rainI * 0.3 - this.dayNight.getDayFactor() * 0.15;
    this.fog.density = this.dayNight.getFogDensity(this.currentLevel?.fogDensity ?? 0.01) * (1 + rainI * 0.4);

    if (this.currentLevel instanceof Hub) this.currentLevel.update(dt);
    if (this.currentLevel instanceof Forest) this.currentLevel.update(dt);
    if (this.currentLevel instanceof Mountains) this.currentLevel.update(dt);
    if (this.currentLevel instanceof Dungeon) this.currentLevel.update(dt);

    if (this.surviveActive) {
      this.surviveTimer += dt;
      this.quests.progressSurvive(dt);
      if (this.surviveTimer > 0.5) { this.surviveTimer = 0; this.updateQuestHud(); }
    }

    this.updateHud();
    this.hud.updateTime(this.dayNight.getTimeString(), this.dayNight.isNight());
    this.hud.updateGravGun(this.gravityGun.active, this.gravityGun.isGrabbing());
    this.input.endFrame();
  }

  private handleCombat(dt: number) {
    const cfg = this.player.weaponConfig;
    const wantFire = cfg.auto ? this.input.mouseDown : this.input.wasMousePressed();
    if (wantFire && this.player.fire()) {
      this.audio.shoot(this.player.activeWeapon);
      const origin = this.camera.position.clone();
      const muzzlePos = origin.clone().add(this.tmpMuzzle.set(0.25, -0.15, -0.8).applyEuler(this.camera.rotation));
      const aimDir = this.player.getAimDir();
      this.particles.spawnSparks(muzzlePos, aimDir, 4, 0xffdd66);
      this.particles.spawnMuzzleSmoke(muzzlePos, aimDir);
      const right = new THREE.Vector3(1, 0, 0).applyEuler(this.camera.rotation);
      this.particles.spawnShell(origin.clone().add(right.clone().multiplyScalar(0.2)), right);
      const pellets = cfg.pellets;
      for (let i = 0; i < pellets; i++) {
        const dir = this.player.getAimDir();
        this.hitscan(origin, dir, this.player.getUpgradeDamage(), cfg.range);
      }
    }
  }

  private tmpGravDir = new THREE.Vector3();
  private tmpGravPos = new THREE.Vector3();

  private handleGravityGun(dt: number) {
    const camPos = this.camera.position;
    this.tmpGravDir.set(0, 0, -1).applyEuler(this.camera.rotation).normalize();

    if (this.input.wasMousePressed()) {
      if (!this.gravityGun.isGrabbing()) {
        if (this.gravityGun.tryGrab(this.barrels, camPos, this.tmpGravDir)) {
          this.audio.interact();
          this.hud.notify('Бочка захвачена', '#ff6600');
        }
      } else {
        if (this.gravityGun.launch(camPos, this.tmpGravDir)) {
          this.audio.shoot('pistol');
          this.particles.spawnSparks(
            this.tmpGravPos.copy(camPos).add(this.tmpGravDir.clone().multiplyScalar(1)),
            this.tmpGravDir, 8, 0xff6600,
          );
        }
      }
    }

    if (this.input.wasRightMousePressed() && this.gravityGun.pulseCooldown <= 0) {
      this.gravityGun.pulse(camPos);
      this.audio.explosion();
      this.particles.spawnExplosion(camPos.clone().add(this.tmpGravDir.clone().multiplyScalar(2)), 0xff8800, 20);
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = e.pos.x - camPos.x, dy = e.pos.y - camPos.y, dz = e.pos.z - camPos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < this.gravityGun.pulseRange && d > 0.1) {
          const force = this.gravityGun.pulseForce * (1 - d / this.gravityGun.pulseRange);
          e.velocity.x += (dx / d) * force;
          e.velocity.z += (dz / d) * force;
          e.velocity.y += Math.abs(force) * 0.5;
          e.takeDamage(15 * (1 - d / this.gravityGun.pulseRange));
        }
      }
      for (const b of this.barrels) {
        if (b.exploded) continue;
        const dx = b.pos.x - camPos.x, dz = b.pos.z - camPos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < this.gravityGun.pulseRange && d > 0.1) {
          const force = this.gravityGun.pulseForce * 0.5 * (1 - d / this.gravityGun.pulseRange);
          b.pos.x += (dx / d) * force * 0.3;
          b.pos.z += (dz / d) * force * 0.3;
          b.mesh.position.x = b.pos.x;
          b.mesh.position.z = b.pos.z;
        }
      }
    }

    const enemyPositions = this.enemies.map((e, i) => ({
      pos: e.pos, radius: e.config_.scale * 0.7, dead: e.dead, index: i,
    }));

    this.gravityGun.update(
      dt,
      camPos,
      this.tmpGravDir,
      this.barrels,
      (barrel, enemyIndex) => {
        const e = this.enemies[enemyIndex];
        if (e && !e.dead) {
          if (e.takeDamage(50)) this.onEnemyKilled(e);
        }
        if (!barrel.exploded) this.explodeBarrel(barrel);
      },
      (barrel) => {
        if (!barrel.exploded) this.explodeBarrel(barrel);
      },
      enemyPositions,
      (ox, oy, oz, dx, dy, dz, max) => this.physics.raycastDistOnly(ox, oy, oz, dx, dy, dz, max),
    );
  }

  private tmpFogColor = new THREE.Color();
  private tmpAmbientColor = new THREE.Color();

  private updateDayNight() {
    const dayFactor = this.dayNight.getDayFactor();
    this.dayNight.getFogColor(this.tmpFogColor);
    const rainI = this.weather.getIntensity();
    const levelFog = new THREE.Color(this.currentLevel?.fogColor ?? 0x05060a);
    this.fog.color.copy(levelFog).lerp(this.tmpFogColor, 0.5 + dayFactor * 0.3);
    this.fog.color.r *= (1 - rainI * 0.3);
    this.fog.color.g *= (1 - rainI * 0.3);
    this.fog.color.b *= (1 - rainI * 0.2);

    this.ambientLight.color.copy(this.tmpAmbientColor.copy(new THREE.Color(this.currentLevel?.ambientColor ?? 0x0a0c14)).lerp(this.tmpFogColor, 0.3 + dayFactor * 0.4));
    this.ambientLight.intensity = 0.4 + dayFactor * 0.8;

    this.hemiLight.intensity = 0.3 + dayFactor * 0.7;

    this.scene.background = this.tmpFogColor.clone();

    if (this.currentLevel instanceof Hub) {
      if (this.dayNight.isNight() && !this.nightSpawned) {
        this.nightSpawned = true;
        this.spawnNightEnemies();
      } else if (!this.dayNight.isNight() && this.nightSpawned) {
        this.nightSpawned = false;
      }
    }
  }

  private spawnNightEnemies() {
    const nightSpawns: [EnemyId, number, number, number][] = [
      ['thug', 15, 0, 15], ['thug', -15, 0, -15],
      ['drone', 10, 5, -10], ['drone', -10, 5, 10],
      ['guard', 20, 0, -20],
    ];
    for (const [type, x, y, z] of nightSpawns) {
      const e = new Enemy(type, new THREE.Vector3(x, y, z), `night_${this.enemyIdCounter}`);
      this.enemyIdCounter++;
      this.enemies.push(e);
      this.scene.add(e.group);
    }
    this.hud.notify('Ночь пришла — враги активизировались', '#ff3344');
  }

  private tmpMuzzle = new THREE.Vector3();

  private tmpHitOrigin = new THREE.Vector3();

  private hitscan(origin: THREE.Vector3, dir: THREE.Vector3, damage: number, range: number) {
    let bestDist = range;
    let hitEnemy: Enemy | null = null;
    let hitBarrel: Barrel | null = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const sphere = e.getHitSphere();
      const cx = origin.x - sphere.center.x;
      const cy = origin.y - sphere.center.y;
      const cz = origin.z - sphere.center.z;
      const b = cx * dir.x + cy * dir.y + cz * dir.z;
      const c = cx * cx + cy * cy + cz * cz - sphere.radius * sphere.radius;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < bestDist) { bestDist = t; hitEnemy = e; }
    }
    for (const bl of this.barrels) {
      if (bl.exploded) continue;
      const cx = origin.x - bl.pos.x;
      const cy = origin.y - (bl.pos.y + 0.6);
      const cz = origin.z - bl.pos.z;
      const b = cx * dir.x + cy * dir.y + cz * dir.z;
      const c = cx * cx + cy * cy + cz * cz - bl.radius * bl.radius;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < bestDist) { bestDist = t; hitEnemy = null; hitBarrel = bl; }
    }
    const wallDist = this.physics.raycastDistOnly(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, range);
    if (wallDist < bestDist) {
      this.tmpHitOrigin.set(origin.x + dir.x * wallDist, origin.y + dir.y * wallDist, origin.z + dir.z * wallDist);
      this.spawnHitEffect(this.tmpHitOrigin, 0x888888);
      this.particles.spawnSparks(this.tmpHitOrigin, dir, 5, 0xffaa44);
      return;
    }
    if (hitBarrel) {
      this.tmpHitOrigin.set(
        origin.x + dir.x * bestDist,
        origin.y + dir.y * bestDist,
        origin.z + dir.z * bestDist
      );
      this.particles.spawnSparks(this.tmpHitOrigin, dir, 5, 0xff6600);
      if (hitBarrel.takeDamage(damage)) this.explodeBarrel(hitBarrel);
      return;
    }
    if (hitEnemy) {
      this.tmpHitOrigin.set(
        origin.x + dir.x * bestDist,
        origin.y + dir.y * bestDist,
        origin.z + dir.z * bestDist
      );
      this.spawnHitEffect(this.tmpHitOrigin, hitEnemy.isBoss ? 0xff00aa : 0xffaa00);
      this.particles.spawnSparks(this.tmpHitOrigin, dir, 6, hitEnemy.isBoss ? 0xff00aa : 0xff6644);
      const killed = hitEnemy.takeDamage(damage);
      this.audio.enemyHit();
      if (hitEnemy.isBoss) this.audio.bossHit();
      if (killed) this.onEnemyKilled(hitEnemy);
      if (this.isMultiplayer && this.mp) {
        this.mp.send({ type: 'enemyHit', data: { enemyId: hitEnemy.id, damage } });
      }
    }
  }

  private onEnemyKilled(e: Enemy) {
    this.audio.enemyDeath();
    this.quests.progressKill(e.type);
    const leveled = this.player.addXp(e.config_.xp);
    this.player.credits += e.config_.credits;
    this.hud.notify(`+${e.config_.xp} XP, +${e.config_.credits} cr`, '#33ff66');
    if (leveled) { this.hud.notify(`Новый уровень: ${this.player.level}!`, '#ff00aa'); this.audio.levelUp(); }
    if (e.isBoss) {
      this.hud.hideBoss();
      this.hud.notify('CORE-9 УНИЧТОЖЕН!', '#ff00aa');
      this.clearedLevels.add(this.currentLevel!.id);
    }
    if (Math.random() < 0.4) {
      const pk = new Pickup('health', e.pos.clone(), 25);
      this.pickups.push(pk); this.scene.add(pk.mesh);
    } else if (Math.random() < 0.3) {
      const pk = new Pickup('credits', e.pos.clone(), e.config_.credits);
      this.pickups.push(pk); this.scene.add(pk.mesh);
    }
    if (Math.random() < 0.15) {
      const buffs: PickupType[] = ['doubleDamage', 'shield', 'infiniteAmmo'];
      const buff = buffs[Math.floor(Math.random() * buffs.length)];
      const pk = new Pickup(buff, e.pos.clone(), 0);
      this.pickups.push(pk); this.scene.add(pk.mesh);
    }
    this.updateQuestHud();
    this.checkLevelCleared();
  }

  private checkLevelCleared() {
    if (!this.currentLevel || this.currentLevel.id === 'hub') return;
    const alive = this.enemies.some((e) => !e.dead);
    if (!alive) {
      this.clearedLevels.add(this.currentLevel.id);
      this.hud.notify('Локация зачищена!', '#33ff66');
    }
  }

  private tmpVec1 = new THREE.Vector3();
  private tmpVec2 = new THREE.Vector3();

  private updateEnemies(dt: number) {
    const playerPos = this.player.pos;
    const px = playerPos.x, py = playerPos.y, pz = playerPos.z;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dead && e.deadTimer > 3) continue;
      const dx = px - e.pos.x, dy = py - e.pos.y, dz = pz - e.pos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      let los = false;
      if (dist < e.detectRange) {
        if (dist < 2) {
          los = true;
        } else {
          const invD = 1 / dist;
          const wallDist = this.physics.raycastDistOnly(e.pos.x, e.pos.y, e.pos.z, dx * invD, dy * invD, dz * invD, dist - 0.5);
          los = wallDist >= dist - 0.5;
        }
      }
      const r = e.update(dt, playerPos, los, dist);
      if (r.fired && !e.dead) {
        this.enemyFire(e, playerPos);
      }
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.dead && e.deadTimer > 3) { this.scene.remove(e.group); e.dispose(); return false; }
      return true;
    });
  }

  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    this.tmpVec2.subVectors(to, from);
    const dist = this.tmpVec2.length();
    if (dist < 0.5) return true;
    this.tmpVec2.multiplyScalar(1 / dist);
    const hit = this.physics.raycast(from, this.tmpVec2, dist - 0.5);
    return !hit;
  }

  private enemyFire(e: Enemy, playerPos: THREE.Vector3) {
    this.tmpVec1.set(0, e.config_.scale * 0.9, 0).add(e.pos);
    if (e.config_.ranged) {
      const origin = this.tmpVec1.clone();
      this.tmpVec2.subVectors(playerPos, origin);
      this.tmpVec2.x += (Math.random() - 0.5) * 0.06 * this.tmpVec2.length();
      this.tmpVec2.y += (Math.random() - 0.5) * 0.04 * this.tmpVec2.length();
      this.tmpVec2.z += (Math.random() - 0.5) * 0.06 * this.tmpVec2.length();
      this.tmpVec2.normalize();
      const proj = new Projectile(origin, this.tmpVec2, e.config_.damage, true, 35);
      this.projectiles.push(proj);
      this.scene.add(proj.mesh);
    } else {
      const dist = this.tmpVec1.distanceTo(playerPos);
      if (dist < e.config_.attackRange + 0.5) {
        if (this.player.takeDamage(e.config_.damage)) { this.audio.hurt(); }
        else this.audio.hurt();
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      const dead = p.update(dt, (pos) => this.physics.containsPoint(pos));
      if (!p.dead && !p.fromEnemy) continue;
      if (p.fromEnemy && !p.dead) {
        const dist = p.mesh.position.distanceTo(this.player.pos);
        if (dist < 0.6) {
          this.player.takeDamage(p.damage);
          this.audio.hurt();
          p.dead = true;
        }
      }
      if (dead || p.dead) { this.scene.remove(p.mesh); p.dispose(); p.dead = true; }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  private updatePickups(dt: number) {
    for (const p of this.pickups) {
      if (p.collected) continue;
      p.update(dt);
      const dist = p.mesh.position.distanceTo(this.player.pos);
      if (dist < 1.2) this.collectPickup(p);
    }
    this.pickups = this.pickups.filter((p) => {
      if (p.collected) { this.scene.remove(p.mesh); p.dispose(); return false; }
      return true;
    });
  }

  private collectPickup(p: Pickup) {
    p.collected = true;
    this.audio.pickup();
    if (p.type === 'health') { this.player.heal(p.amount); this.hud.notify(`+${p.amount} HP`, '#33ff66'); }
    else if (p.type === 'credits') { this.player.credits += p.amount; this.hud.notify(`+${p.amount} cr`, '#00f0ff'); }
    else if (p.type === 'ammo' && p.weapon) {
      const wid = p.weapon as WeaponId;
      if (this.player.weapons.includes(wid)) {
        this.player.ammoReserve[wid] += p.amount;
        this.hud.notify(`+${p.amount} патронов (${WEAPONS[wid].name})`, '#ffcc00');
      }
    }
    else if (p.type === 'doubleDamage') { this.player.doubleDamageTimer = 15; this.hud.notify('×2 УРОН! (15с)', '#ff3344'); }
    else if (p.type === 'shield') { this.player.shieldTimer = 12; this.hud.notify('ЩИТ! (12с)', '#66aaff'); }
    else if (p.type === 'infiniteAmmo') { this.player.infiniteAmmoTimer = 15; this.hud.notify('∞ ПАТРОНЫ! (15с)', '#ffaa00'); }
  }

  private updateInteractables(dt: number) {
    if (!this.currentLevel) return;
    this.nearInteractable = null;
    let bestDist = Infinity;
    for (const inter of this.currentLevel.interactables) {
      if (inter.used) continue;
      const d = this.player.pos.distanceTo(inter.pos);
      if (d < inter.radius && d < bestDist) { bestDist = d; this.nearInteractable = inter; }
    }
    this.hud.showInteract(!!this.nearInteractable);
    if (this.nearInteractable) {
      this.hud.setInteractLabel(this.nearInteractable.label);
    }
    if (this.nearInteractable && this.input.wasPressed('KeyE')) {
      this.useInteractable(this.nearInteractable);
    }
  }

  private useInteractable(inter: Interactable) {
    this.audio.interact();
    if (inter.type === 'exit' && inter.target) {
      if (this.isMultiplayer && this.mp && !this.mp.isHost) {
        this.hud.notify('Только хост может менять локации', '#ffcc00');
        return;
      }
      this.loadLevel(inter.target);
      this.input.requestPointerLock();
      if (inter.target === 'hub') {
        this.saveGame(0);
        this.hud.notify('Автосохранение', '#33ff66');
      }
      if (inter.target === 'neondock') this.quests.progressReach();
    } else if (inter.type === 'stash') {
      this.player.credits += 100;
      this.quests.progressCollect('stash');
      this.hud.notify('Тайник найден: +100 cr', '#ff00aa');
      inter.used = true;
      if (inter.mesh) this.scene.remove(inter.mesh);
      this.updateQuestHud();
    } else if (inter.type === 'terminal') {
      this.quests.progressInteract('terminal');
      this.hud.notify('Терминал взломан!', '#00f0ff');
      inter.used = true;
      this.updateQuestHud();
    } else if (inter.type === 'save') {
      this.saveGame(0);
      this.hud.notify('Игра сохранена (авто)', '#33ff66');
    } else if (inter.type === 'upgrade') {
      this.pause();
      this.menu.showUpgradeTerminal();
    } else if (inter.type === 'questboard') {
      this.pause();
      this.menu.showQuestLog();
    }
  }

  private spawnHitEffect(pos: THREE.Vector3, color: number) {
    const eff = new HitEffect(pos, color);
    this.hitEffects.push(eff);
    this.scene.add(eff.mesh);
  }

  private updateHitEffects(dt: number) {
    for (const h of this.hitEffects) {
      if (h.update(dt)) { this.scene.remove(h.mesh); h.dispose(); h.dead = true; }
    }
    this.hitEffects = this.hitEffects.filter((h) => !h.dead);
  }

  private updateBarrels(dt: number) {
    for (const b of this.barrels) {
      if (b.exploded) continue;
      b.update(dt);
    }
  }

  private updateGrenades(dt: number) {
    for (const g of this.grenades) {
      if (g.exploded) continue;
      if (g.update(dt, () => false)) {
        this.explodeGrenade(g);
      }
    }
    this.grenades = this.grenades.filter((g) => {
      if (g.exploded) { this.scene.remove(g.mesh); g.dispose(); return false; }
      return true;
    });
  }

  private updateCreatures(dt: number) {
    for (const c of this.creatures) {
      c.update(dt, this.player.pos);
    }
  }

  private explodeGrenade(grenade: Grenade) {
    grenade.exploded = true;
    this.audio.explosion();
    this.particles.spawnExplosion(grenade.pos.clone(), 0x33ff66, 40);
    this.spawnHitEffect(grenade.pos.clone(), 0x33ff66);
    const center = grenade.pos.clone();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = e.pos.distanceTo(center);
      if (d < grenade.explosionRadius) {
        const dmg = grenade.explosionDamage * (1 - d / grenade.explosionRadius);
        if (e.takeDamage(dmg)) this.onEnemyKilled(e);
      }
    }
    const dPlayer = this.player.pos.distanceTo(center);
    if (dPlayer < grenade.explosionRadius) {
      this.player.takeDamage(grenade.explosionDamage * 0.4 * (1 - dPlayer / grenade.explosionRadius));
    }
    for (const bl of this.barrels) {
      if (bl.exploded) continue;
      const d = bl.pos.distanceTo(center);
      if (d < grenade.explosionRadius && bl.takeDamage(grenade.explosionDamage * (1 - d / grenade.explosionRadius))) {
        this.explodeBarrel(bl);
      }
    }
  }

  private explodeBarrel(barrel: Barrel) {
    this.audio.explosion();
    this.particles.spawnExplosion(barrel.mesh.position.clone(), 0xff6600, 35);
    this.spawnHitEffect(barrel.mesh.position.clone(), 0xff6600);
    this.scene.remove(barrel.mesh);
    const center = barrel.mesh.position.clone();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = e.pos.distanceTo(center);
      if (d < barrel.explosionRadius) {
        const dmg = barrel.explosionDamage * (1 - d / barrel.explosionRadius);
        if (e.takeDamage(dmg)) this.onEnemyKilled(e);
      }
    }
    const dPlayer = this.player.pos.distanceTo(center);
    if (dPlayer < barrel.explosionRadius) {
      this.player.takeDamage(barrel.explosionDamage * 0.5 * (1 - dPlayer / barrel.explosionRadius));
    }
    for (const other of this.barrels) {
      if (other === barrel || other.exploded) continue;
      const d = other.pos.distanceTo(center);
      if (d < barrel.explosionRadius) other.takeDamage(barrel.explosionDamage * (1 - d / barrel.explosionRadius));
    }
  }

  private updateHud() {
    this.hud.updateHealth(this.player.health, this.player.maxHealth);
    this.hud.updateStamina(this.player.stamina, this.player.maxStamina);
    this.hud.updateAmmo(
      this.player.ammoInMag[this.player.activeWeapon],
      this.player.ammoReserve[this.player.activeWeapon],
      this.player.reloading, this.player.reloadTimer
    );
    this.hud.updateWeapon(this.player.weaponConfig.name);
    this.hud.updateLevel(this.player.level, this.player.xp, this.player.xpForNext());
    this.hud.updateCredits(this.player.credits);
    this.hud.showDamage(this.player.damageFlash * 0.7);
    this.hud.updateFlashlight(this.player.flashlightOn);
    this.hud.updateGrenades(this.player.grenades);
    this.hud.updateBuffs(this.player.doubleDamageTimer, this.player.shieldTimer, this.player.infiniteAmmoTimer);
    if (this.boss && !this.boss.dead) {
      this.hud.showBoss(this.boss.config_.name, this.boss.health / this.boss.maxHealth);
    } else if (this.boss && this.boss.dead) {
      this.hud.hideBoss();
    }
    this.updateCompass();
    if ((this._frameCount++ & 3) === 0) this.updateMinimap();
  }
  private _frameCount = 0;

  private updateMinimap() {
    if (!this.currentLevel) return;
    const enemies = this.enemies.map((e) => ({ x: e.pos.x, z: e.pos.z, dead: e.dead }));
    const exits = this.currentLevel.interactables
      .filter((i) => i.type === 'exit' && !i.used)
      .map((i) => ({ x: i.pos.x, z: i.pos.z }));
    const pickups = this.pickups.filter((p) => !p.collected).map((p) => ({ x: p.pos.x, z: p.pos.z }));
    const interactables = this.currentLevel.interactables
      .filter((i) => i.type !== 'exit' && !i.used)
      .map((i) => ({ x: i.pos.x, z: i.pos.z, type: i.type }));
    this.hud.updateMinimap(this.player.pos.x, this.player.pos.z, this.player.yaw, enemies, exits, pickups, interactables);
  }

  private updateCompass() {
    if (!this.currentLevel) { this.hud.updateCompass(null, ''); return; }
    let best: Interactable | null = null;
    let bestDist = Infinity;
    for (const inter of this.currentLevel.interactables) {
      if (inter.used) continue;
      if (inter.type !== 'exit') continue;
      const d = this.player.pos.distanceTo(inter.pos);
      if (d < bestDist) { bestDist = d; best = inter; }
    }
    if (!best || bestDist < 3) { this.hud.updateCompass(null, ''); return; }
    const dx = best.pos.x - this.player.pos.x;
    const dz = best.pos.z - this.player.pos.z;
    const targetAngle = Math.atan2(dx, -dz);
    let diff = targetAngle - this.player.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.hud.updateCompass(diff * 180 / Math.PI, best.label);
  }

  private updateQuestHud() {
    const q = this.quests.getActiveMain();
    if (q) {
      const st = this.quests.states.get(q.id)!;
      this.hud.updateQuest(q.title, st.objectives.map((o) => {
        const prog = o.type === 'survive' ? `${Math.floor(o.current || 0)}/${o.time}` : o.count ? `${o.current || 0}/${o.count}` : '';
        return { text: `${o.description}${prog ? ' (' + prog + ')' : ''}`, done: !!o.done };
      }));
    } else {
      this.hud.clearQuest();
    }
  }

  respawn() {
    this.player.dead = false;
    this.player.health = this.player.maxHealth;
    this.player.pos.set(0, 1.7, 0);
    this.player.vel.set(0, 0, 0);
    this.loadLevel('hub');
    this.phase = 'playing';
    this.input.requestPointerLock();
    this.hud.notify('Возрождение в хабе', '#33ff66');
  }

  saveGame(slot: number) {
    const data: SaveData = {
      version: 1, timestamp: Date.now(),
      player: {
        level: this.player.level, xp: this.player.xp, maxHealth: this.player.maxHealth,
        health: this.player.health, credits: this.player.credits, statPoints: this.player.statPoints,
        stats: { ...this.player.stats }, weapons: [...this.player.weapons],
        activeWeapon: this.player.activeWeapon,
        upgrades: {
          pistol: { ...this.player.upgrades.pistol }, smg: { ...this.player.upgrades.smg },
          shotgun: { ...this.player.upgrades.shotgun }, rifle: { ...this.player.upgrades.rifle },
          auto: { ...this.player.upgrades.auto },
        },
      },
      quests: this.quests.toSave(),
      world: {
        clearedLevels: Array.from(this.clearedLevels),
        flags: { ...this.worldFlags },
        currentLevel: this.currentLevel?.id || 'hub',
      },
      settings: { mouseSens: this.player.mouseSens, volume: this.audio.volume },
    };
    this.save.save(slot, data);
  }

  loadGame(slot: number) {
    const data = this.save.load(slot);
    if (!data) { this.menu.showMainMenu(); return; }
    this.audio.init(); this.audio.resume(); this.audio.startAmbient();
    this.applySaveData(data);
    this.phase = 'playing';
    this.input.requestPointerLock();
    this.hud.setVisible(true);
    this.updateQuestHud();
  }

  private applySaveData(data: SaveData) {
    this.player = new Player(this.camera);
    const p = data.player;
    this.player.level = p.level; this.player.xp = p.xp;
    this.player.maxHealth = p.maxHealth; this.player.health = p.health;
    this.player.credits = p.credits; this.player.statPoints = p.statPoints;
    this.player.stats = { ...p.stats };
    this.player.weapons = [...p.weapons];
    this.player.activeWeapon = p.activeWeapon;
    for (const wid of ['pistol', 'smg', 'shotgun', 'rifle', 'auto'] as WeaponId[]) {
      this.player.upgrades[wid] = { ...p.upgrades[wid] };
      this.player.ammoInMag[wid] = WEAPONS[wid].magSize;
      this.player.ammoReserve[wid] = 9999;
    }
    this.player.setViewModel();
    this.player.mouseSens = data.settings.mouseSens;
    this.audio.setVolume(data.settings.volume);

    this.quests.fromSave(data.quests);
    this.clearedLevels = new Set(data.world.clearedLevels);
    this.worldFlags = { ...data.world.flags };

    this.loadLevel(data.world.currentLevel);
  }

  private buyUpgrade(weapon: WeaponId, stat: keyof WeaponUpgrades) {
    const up = this.player.upgrades[weapon];
    if (up[stat] >= MAX_UPGRADE_LEVEL) return;
    const cost = UPGRADE_COSTS[stat] * (up[stat] + 1);
    if (this.player.credits < cost) return;
    this.player.credits -= cost;
    up[stat]++;
    this.audio.buy();
  }

  private buyWeapon(weapon: WeaponId) {
    const w = WEAPONS[weapon];
    if (this.player.weapons.includes(weapon)) return;
    if (this.player.level < w.unlockLevel) return;
    if (this.player.credits < w.price) return;
    this.player.credits -= w.price;
    this.player.addWeapon(weapon);
    this.audio.buy();
  }

  private applyStat(stat: 'health' | 'damage' | 'speed' | 'mag') {
    this.player.applyStat(stat);
    this.audio.buy();
  }

  dispose() {
    this.input.dispose();
    this.audio.dispose();
    this.gravityGun.dispose();
    this.dayNight.dispose(this.scene);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
