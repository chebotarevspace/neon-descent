import type { EnemyConfig, EnemyId } from '../types/common';

export const ENEMIES: Record<EnemyId, EnemyConfig> = {
  thug: {
    id: 'thug', name: 'Уличный гоп', maxHealth: 50, speed: 3.2, damage: 8,
    attackRange: 2.2, attackCooldown: 1.1, xp: 25, credits: 18,
    color: 0xff4466, scale: 1.0, ranged: false, detectRange: 16,
  },
  guard: {
    id: 'guard', name: 'Корпоративный охранник', maxHealth: 90, speed: 2.8,
    damage: 12, attackRange: 28, attackCooldown: 0.9, xp: 45, credits: 35,
    color: 0x33aaff, scale: 1.05, ranged: true, detectRange: 26,
  },
  drone: {
    id: 'drone', name: 'Боевой дрон', maxHealth: 40, speed: 4.5, damage: 7,
    attackRange: 24, attackCooldown: 0.5, xp: 35, credits: 28,
    color: 0xffcc00, scale: 0.8, ranged: true, detectRange: 24,
  },
  heavy: {
    id: 'heavy', name: 'Тяжёлый штурмовик', maxHealth: 220, speed: 2.0,
    damage: 22, attackRange: 18, attackCooldown: 1.3, xp: 90, credits: 70,
    color: 0xaa33ff, scale: 1.4, ranged: true, detectRange: 22,
  },
  boss: {
    id: 'boss', name: 'CORE-9', maxHealth: 1200, speed: 2.4, damage: 30,
    attackRange: 40, attackCooldown: 0.7, xp: 500, credits: 400,
    color: 0xff00aa, scale: 2.6, ranged: true, detectRange: 60,
  },
  mutant: {
    id: 'mutant', name: 'Мутант канализации', maxHealth: 140, speed: 4.0,
    damage: 18, attackRange: 2.5, attackCooldown: 0.8, xp: 55, credits: 40,
    color: 0x33ff66, scale: 1.2, ranged: false, detectRange: 18,
  },
  turret: {
    id: 'turret', name: 'Авто-турель', maxHealth: 80, speed: 0,
    damage: 10, attackRange: 22, attackCooldown: 0.35, xp: 40, credits: 30,
    color: 0xff6600, scale: 0.9, ranged: true, detectRange: 22,
  },
};
