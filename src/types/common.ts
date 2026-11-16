import * as THREE from 'three';

export type Vec3 = { x: number; y: number; z: number };

export type WeaponId = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'auto';

export type EnemyId = 'thug' | 'guard' | 'drone' | 'heavy' | 'boss' | 'mutant' | 'turret';

export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed';

export type ObjectiveType = 'kill' | 'reach' | 'interact' | 'collect' | 'survive';

export interface Objective {
  id: string;
  type: ObjectiveType;
  description: string;
  target?: string;
  count?: number;
  point?: Vec3;
  time?: number;
  current?: number;
  done?: boolean;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  main: boolean;
  prerequisites: string[];
  objectives: Objective[];
  rewards: { xp: number; credits: number; weapon?: WeaponId };
}

export interface QuestState {
  id: string;
  status: QuestStatus;
  objectives: Objective[];
}

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  damage: number;
  fireRate: number;
  magSize: number;
  reloadTime: number;
  spread: number;
  pellets: number;
  auto: boolean;
  range: number;
  recoil: number;
  price: number;
  unlockLevel: number;
}

export interface EnemyConfig {
  id: EnemyId;
  name: string;
  maxHealth: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  xp: number;
  credits: number;
  color: number;
  scale: number;
  ranged: boolean;
  detectRange: number;
}

export interface PlayerStats {
  health: number;
  damage: number;
  speed: number;
  mag: number;
}

export interface SaveData {
  version: number;
  timestamp: number;
  player: {
    level: number;
    xp: number;
    maxHealth: number;
    health: number;
    credits: number;
    statPoints: number;
    stats: PlayerStats;
    weapons: WeaponId[];
    activeWeapon: WeaponId;
    upgrades: Record<WeaponId, WeaponUpgrades>;
  };
  quests: QuestState[];
  world: {
    clearedLevels: string[];
    flags: Record<string, boolean>;
    currentLevel: string;
  };
  settings: {
    mouseSens: number;
    volume: number;
  };
}

export interface WeaponUpgrades {
  damage: number;
  fireRate: number;
  magSize: number;
  accuracy: number;
  reload: number;
}

export type GamePhase = 'menu' | 'playing' | 'paused' | 'dead' | 'loading';

export interface Collider {
  min: THREE.Vector3;
  max: THREE.Vector3;
}
