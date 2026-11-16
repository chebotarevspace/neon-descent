import type { WeaponConfig, WeaponId, WeaponUpgrades } from '../types/common';

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  pistol: {
    id: 'pistol', name: 'Кибер-пистолет', damage: 18, fireRate: 0.28,
    magSize: 12, reloadTime: 1.0, spread: 0.01, pellets: 1, auto: false,
    range: 60, recoil: 0.6, price: 0, unlockLevel: 1,
  },
  smg: {
    id: 'smg', name: 'Неон-ПП "Шквал"', damage: 11, fireRate: 0.08,
    magSize: 30, reloadTime: 1.4, spread: 0.03, pellets: 1, auto: true,
    range: 50, recoil: 0.35, price: 450, unlockLevel: 2,
  },
  shotgun: {
    id: 'shotgun', name: 'Дробовик "Гроза"', damage: 9, fireRate: 0.7,
    magSize: 6, reloadTime: 1.8, spread: 0.12, pellets: 8, auto: false,
    range: 22, recoil: 1.4, price: 700, unlockLevel: 2,
  },
  rifle: {
    id: 'rifle', name: 'Энерговинтовка "Призма"', damage: 32, fireRate: 0.14,
    magSize: 20, reloadTime: 1.6, spread: 0.006, pellets: 1, auto: true,
    range: 90, recoil: 0.5, price: 1200, unlockLevel: 3,
  },
  auto: {
    id: 'auto', name: 'Штурм "Вихрь"', damage: 16, fireRate: 0.1,
    magSize: 40, reloadTime: 1.5, spread: 0.02, pellets: 1, auto: true,
    range: 65, recoil: 0.4, price: 0, unlockLevel: 1,
  },
};

export const UPGRADE_COSTS: Record<keyof WeaponUpgrades, number> = {
  damage: 150, fireRate: 180, magSize: 200, accuracy: 120, reload: 140,
};

export const MAX_UPGRADE_LEVEL = 5;

export function emptyUpgrades(): WeaponUpgrades {
  return { damage: 0, fireRate: 0, magSize: 0, accuracy: 0, reload: 0 };
}
