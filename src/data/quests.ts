import type { QuestDef } from '../types/common';

export const QUESTS: QuestDef[] = [
  {
    id: 'q1_clear_sewers',
    title: 'Зачистка Нижнего города',
    description: 'Уличные банды захватили трущобы. Зачистите их и найдите выход к промзоне.',
    main: true,
    prerequisites: [],
    objectives: [
      { id: 'kill_thugs', type: 'kill', description: 'Уничтожить бандитов', target: 'thug', count: 8, current: 0, done: false },
      { id: 'reach_dock', type: 'reach', description: 'Дойти до промзоны Неон-Док', current: 0, done: false },
    ],
    rewards: { xp: 150, credits: 120, weapon: 'smg' },
  },
  {
    id: 'q2_terminal',
    title: 'Взлом терминала',
    description: 'Корпорация охраняет терминал с данными. Пробейтесь и взаимодействуйте с ним.',
    main: true,
    prerequisites: ['q1_clear_sewers'],
    objectives: [
      { id: 'kill_guards', type: 'kill', description: 'Устранить охрану', target: 'guard', count: 5, current: 0, done: false },
      { id: 'kill_drones', type: 'kill', description: 'Сбить дроны', target: 'drone', count: 4, current: 0, done: false },
      { id: 'hack', type: 'interact', description: 'Взломать терминал', target: 'terminal', current: 0, done: false },
    ],
    rewards: { xp: 250, credits: 200, weapon: 'shotgun' },
  },
  {
    id: 'q3_tower',
    title: 'Штурм Небесной башни',
    description: 'Поднимитесь на вершину башни и уничтожьте ядро CORE-9.',
    main: true,
    prerequisites: ['q2_terminal'],
    objectives: [
      { id: 'kill_heavy', type: 'kill', description: 'Устранить штурмовиков', target: 'heavy', count: 3, current: 0, done: false },
      { id: 'kill_boss', type: 'kill', description: 'Уничтожить CORE-9', target: 'boss', count: 1, current: 0, done: false },
    ],
    rewards: { xp: 600, credits: 500, weapon: 'rifle' },
  },
  {
    id: 's1_credits',
    title: 'Тайник с кредитами',
    description: 'В трущобах спрятан тайник. Найдите и соберите кредиты.',
    main: false,
    prerequisites: [],
    objectives: [
      { id: 'collect', type: 'collect', description: 'Собрать кредиты из тайника', target: 'stash', count: 1, current: 0, done: false },
    ],
    rewards: { xp: 60, credits: 90 },
  },
  {
    id: 's2_waves',
    title: 'Выживание в доке',
    description: 'Переживите волны дронов в промзоне.',
    main: false,
    prerequisites: ['q1_clear_sewers'],
    objectives: [
      { id: 'survive', type: 'survive', description: 'Выжить 60 секунд', time: 60, current: 0, done: false },
    ],
    rewards: { xp: 180, credits: 150 },
  },
  {
    id: 'q4_undercity',
    title: 'Заражение в Подземке',
    description: 'В канализации появились мутанты и авто-турели. Зачистите подземку и найдите тайник.',
    main: true,
    prerequisites: ['q1_clear_sewers'],
    objectives: [
      { id: 'kill_mutants', type: 'kill', description: 'Уничтожить мутантов', target: 'mutant', count: 8, current: 0, done: false },
      { id: 'kill_turrets', type: 'kill', description: 'Уничтожить турели', target: 'turret', count: 3, current: 0, done: false },
      { id: 'stash', type: 'collect', description: 'Найти тайник', target: 'stash', count: 1, current: 0, done: false },
    ],
    rewards: { xp: 300, credits: 250 },
  },
];
