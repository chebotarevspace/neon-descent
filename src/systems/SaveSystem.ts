import type { SaveData, WeaponId, WeaponUpgrades, PlayerStats, QuestState } from '../types/common';
import { emptyUpgrades } from '../data/weapons';

const SAVE_KEY = 'neon_descent_saves';
const SAVE_VERSION = 1;

export interface SlotInfo {
  index: number;
  empty: boolean;
  timestamp: number;
  level: number;
  currentLevel: string;
  auto: boolean;
}

export class SaveSystem {
  private readAll(): Record<string, SaveData> {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch { return {}; }
  }

  private writeAll(data: Record<string, SaveData>) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* quota */ }
  }

  listSlots(): SlotInfo[] {
    const all = this.readAll();
    const slots: SlotInfo[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = all[`slot${i}`];
      slots.push({
        index: i, empty: !d, timestamp: d?.timestamp || 0,
        level: d?.player.level || 1, currentLevel: d?.world.currentLevel || '',
        auto: false,
      });
    }
    const a = all['auto'];
    slots.push({
      index: 0, empty: !a, timestamp: a?.timestamp || 0,
      level: a?.player.level || 1, currentLevel: a?.world.currentLevel || '',
      auto: true,
    });
    return slots;
  }

  save(slot: number, data: SaveData): boolean {
    const all = this.readAll();
    const key = slot === 0 ? 'auto' : `slot${slot}`;
    data.version = SAVE_VERSION;
    data.timestamp = Date.now();
    all[key] = data;
    this.writeAll(all);
    return true;
  }

  load(slot: number): SaveData | null {
    const all = this.readAll();
    const key = slot === 0 ? 'auto' : `slot${slot}`;
    const d = all[key];
    if (!d) return null;
    if (d.version !== SAVE_VERSION) return null;
    return d;
  }

  deleteSlot(slot: number) {
    const all = this.readAll();
    const key = slot === 0 ? 'auto' : `slot${slot}`;
    delete all[key];
    this.writeAll(all);
  }

  hasAnySave(): boolean {
    return this.listSlots().some((s) => !s.empty);
  }

  static createEmptySave(): SaveData {
    const upgrades: Record<WeaponId, WeaponUpgrades> = {
      pistol: emptyUpgrades(), smg: emptyUpgrades(), shotgun: emptyUpgrades(), rifle: emptyUpgrades(), auto: emptyUpgrades(),
    };
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      player: {
        level: 1, xp: 0, maxHealth: 100, health: 100, credits: 0, statPoints: 0,
        stats: { health: 0, damage: 0, speed: 0, mag: 0 } as PlayerStats,
        weapons: ['pistol'], activeWeapon: 'pistol', upgrades,
      },
      quests: [],
      world: { clearedLevels: [], flags: {}, currentLevel: 'hub' },
      settings: { mouseSens: 0.0022, volume: 0.5 },
    };
  }
}
