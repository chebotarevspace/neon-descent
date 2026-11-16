import type { Player } from '../entities/Player';
import type { SaveSystem, SlotInfo } from '../systems/SaveSystem';
import type { QuestSystem } from '../systems/QuestSystem';
import { QUESTS } from '../data/quests';
import { WEAPONS, UPGRADE_COSTS, MAX_UPGRADE_LEVEL } from '../data/weapons';
import type { WeaponId, WeaponUpgrades } from '../types/common';

export class MenuManager {
  root: HTMLElement;
  private overlay: HTMLElement;
  onSave: (slot: number) => void = () => {};
  onLoad: (slot: number) => void = () => {};
  onDeleteSave: (slot: number) => void = () => {};
  onNewGame: () => void = () => {};
  onResume: () => void = () => {};
  onQuitToMenu: () => void = () => {};
  onRespawn: () => void = () => {};
  onBuyUpgrade: (weapon: WeaponId, stat: keyof WeaponUpgrades) => void = () => {};
  onBuyWeapon: (weapon: WeaponId) => void = () => {};
  onApplyStat: (stat: 'health' | 'damage' | 'speed' | 'mag') => void = () => {};
  onActivateQuest: (id: string) => void = () => {};
  onSettingsChange: (s: { mouseSens?: number; volume?: number }) => void = () => {};
  onToggleWeather: () => void = () => {};
  onHostMultiplayer: (name: string, color: number) => void = () => {};
  onJoinMultiplayer: (name: string, color: number, code: string) => void = () => {};
  onLeaveMultiplayer: () => void = () => {};
  private save: SaveSystem;
  private quests: QuestSystem;
  private getPlayer: () => Player | null;

  constructor(root: HTMLElement, save: SaveSystem, quests: QuestSystem, getPlayer: () => Player | null) {
    this.root = root;
    this.save = save;
    this.quests = quests;
    this.getPlayer = getPlayer;
    this.overlay = this.div('position:fixed;inset:0;background:rgba(2,3,8,0.92);z-index:50;font-family:monospace;color:#cdf;display:none;align-items:center;justify-content:center;');
    root.appendChild(this.overlay);
  }

  private div(style: string): HTMLElement { const e = document.createElement('div'); e.style.cssText = style; return e; }

  private title(text: string, color = '#00f0ff'): HTMLElement {
    const t = this.div(`font-size:42px;font-weight:bold;color:${color};text-shadow:0 0 20px ${color};margin-bottom:8px;letter-spacing:4px;`);
    t.textContent = text;
    return t;
  }
  private subtitle(text: string): HTMLElement {
    const s = this.div('font-size:13px;color:#667;margin-bottom:30px;letter-spacing:2px;');
    s.textContent = text;
    return s;
  }
  private button(text: string, onClick: () => void, color = '#00f0ff'): HTMLElement {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `display:block;width:280px;padding:12px;margin:6px auto;background:rgba(0,0,0,0.4);border:1px solid ${color};color:${color};font-family:monospace;font-size:15px;cursor:pointer;letter-spacing:1px;transition:all 0.15s;`;
    b.onmouseenter = () => { b.style.background = `${color}22`; b.style.boxShadow = `0 0 12px ${color}66`; };
    b.onmouseleave = () => { b.style.background = 'rgba(0,0,0,0.4)'; b.style.boxShadow = 'none'; };
    b.onclick = onClick;
    return b;
  }

  showMainMenu() {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('NEON DESCENT'));
    c.appendChild(this.subtitle('КИБЕРПАНК · 3D · ACTION'));
    c.appendChild(this.button('НОВАЯ ИГРА', () => { this.hide(); this.onNewGame(); }));
    c.appendChild(this.button('МУЛЬТИПЛЕЕР', () => this.showMultiplayerMenu(), '#ff00aa'));
    if (this.save.hasAnySave()) {
      c.appendChild(this.button('ПРОДОЛЖИТЬ', () => this.showLoadMenu(true), '#33ff66'));
    }
    c.appendChild(this.button('НАСТРОЙКИ', () => this.showSettings('menu'), '#ffcc00'));
    c.appendChild(this.button(this.isFullscreen() ? 'ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА' : 'ПОЛНЫЙ ЭКРАН', () => this.toggleFullscreen(), '#66aaff'));
    const footer = this.div('margin-top:40px;font-size:11px;color:#445;');
    footer.innerHTML = 'WASD — движение · Мышь — обзор · Shift — бег · Space — прыжок<br>R — перезарядка · F — фонарик · E — взаимодействие · 1-5/колесо — оружие · Tab — квесты · Esc — пауза<br>F11 — полный экран';
    c.appendChild(footer);
    this.setOverlay(c);
  }

  showPauseMenu() {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('ПАУЗА', '#ffcc00'));
    c.appendChild(this.button('ПРОДОЛЖИТЬ', () => { this.hide(); this.onResume(); }, '#33ff66'));
    c.appendChild(this.button('СОХРАНИТЬ', () => this.showSaveMenu()));
    c.appendChild(this.button('ЗАГРУЗИТЬ', () => this.showLoadMenu(false)));
    c.appendChild(this.button('ЖУРНАЛ КВЕСТОВ', () => this.showQuestLog(), '#ff00aa'));
    c.appendChild(this.button('НАСТРОЙКИ', () => this.showSettings('pause'), '#ffcc00'));
    c.appendChild(this.button(this.isFullscreen() ? 'ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА' : 'ПОЛНЫЙ ЭКРАН', () => this.toggleFullscreen(), '#66aaff'));
    c.appendChild(this.button('ВЫЙТИ В МЕНЮ', () => { this.hide(); this.onQuitToMenu(); }, '#ff4466'));
    this.setOverlay(c);
  }

  showDeathScreen() {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('ВЫ ПОГИБЛИ', '#ff3344'));
    const p = this.getPlayer();
    if (p) {
      const info = this.div('font-size:14px;color:#889;margin-bottom:20px;');
      info.innerHTML = `Уровень: ${p.level} · Кредиты: ${p.credits}`;
      c.appendChild(info);
    }
    c.appendChild(this.button('РЕСПАУН В ХАБЕ', () => { this.hide(); this.onRespawn(); }, '#33ff66'));
    c.appendChild(this.button('ЗАГРУЗИТЬ СОХРАНЕНИЕ', () => this.showLoadMenu(false)));
    c.appendChild(this.button('ВЫЙТИ В МЕНЮ', () => { this.hide(); this.onQuitToMenu(); }, '#ff4466'));
    this.setOverlay(c);
  }

  showSaveMenu() {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('СОХРАНЕНИЕ', '#33ff66'));
    const slots = this.save.listSlots().filter((s) => !s.auto);
    for (const s of slots) {
      const label = s.empty ? `Слот ${s.index} — пусто` : `Слот ${s.index} — Ур.${s.level} · ${new Date(s.timestamp).toLocaleString('ru-RU')}`;
      c.appendChild(this.button(label, () => { this.onSave(s.index); this.showPauseMenu(); }, '#33ff66'));
    }
    c.appendChild(this.button('НАЗАД', () => this.showPauseMenu(), '#888'));
    this.setOverlay(c);
  }

  showLoadMenu(fromMenu: boolean) {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('ЗАГРУЗКА', '#00f0ff'));
    const slots = this.save.listSlots();
    for (const s of slots) {
      if (s.empty) continue;
      const label = `${s.auto ? 'Авто' : 'Слот ' + s.index} — Ур.${s.level} · ${new Date(s.timestamp).toLocaleString('ru-RU')}`;
      const row = this.div('display:flex;align-items:center;justify-content:center;gap:8px;margin:4px 0;');
      row.appendChild(this.button(label, () => { this.hide(); this.onLoad(s.index); }, '#00f0ff'));
      const del = document.createElement('button');
      del.textContent = '✕';
      del.style.cssText = 'padding:8px 12px;background:rgba(0,0,0,0.4);border:1px solid #ff4466;color:#ff4466;cursor:pointer;font-family:monospace;';
      del.onclick = () => { this.onDeleteSave(s.index); this.showLoadMenu(fromMenu); };
      row.appendChild(del);
      c.appendChild(row);
    }
    c.appendChild(this.button('НАЗАД', () => { if (fromMenu) this.showMainMenu(); else this.showPauseMenu(); }, '#888'));
    this.setOverlay(c);
  }

  showQuestLog() {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;max-width:700px;max-height:80vh;overflow-y:auto;padding:20px;');
    c.appendChild(this.title('ЖУРНАЛ КВЕСТОВ', '#ff00aa'));
    for (const q of QUESTS) {
      const st = this.quests.states.get(q.id);
      if (!st) continue;
      if (st.status === 'locked') continue;
      const colors: Record<string, string> = { active: '#ffcc00', completed: '#33ff66', available: '#00f0ff', failed: '#ff4466' };
      const col = colors[st.status] || '#888';
      const card = this.div(`text-align:left;margin:10px 0;padding:12px;border:1px solid ${col}44;background:rgba(0,0,0,0.3);`);
      const head = this.div(`font-size:16px;font-weight:bold;color:${col};margin-bottom:4px;`);
      head.textContent = `${q.main ? '◆ ' : '◇ '}${q.title} [${st.status}]`;
      card.appendChild(head);
      const desc = this.div('font-size:12px;color:#889;margin-bottom:6px;');
      desc.textContent = q.description;
      card.appendChild(desc);
      for (const o of st.objectives) {
        const od = this.div(`font-size:12px;color:${o.done ? '#33ff66' : '#aac'};`);
        const prog = o.type === 'survive' ? `${Math.floor(o.current || 0)}/${o.time}` : o.count ? `${o.current || 0}/${o.count}` : '';
        od.textContent = `${o.done ? '✓' : '○'} ${o.description} ${prog}`;
        card.appendChild(od);
      }
      if (st.status === 'available') {
        card.appendChild(this.button('ПРИНЯТЬ', () => { this.onActivateQuest(q.id); this.showQuestLog(); }, '#33ff66'));
      }
      c.appendChild(card);
    }
    c.appendChild(this.button('НАЗАД', () => this.showPauseMenu(), '#888'));
    this.setOverlay(c);
  }

  showUpgradeTerminal() {
    this.overlay.style.display = 'flex';
    const p = this.getPlayer();
    if (!p) { this.showPauseMenu(); return; }
    const c = this.div('text-align:center;max-width:800px;max-height:85vh;overflow-y:auto;padding:20px;');
    c.appendChild(this.title('ТЕРМИНАЛ АПГРЕЙДОВ', '#00f0ff'));
    const info = this.div('font-size:14px;color:#ffcc00;margin-bottom:16px;');
    info.textContent = `Кредиты: ${p.credits} · Очки характеристик: ${p.statPoints}`;
    c.appendChild(info);

    const statsCard = this.div('text-align:left;margin:10px 0;padding:12px;border:1px solid #ff00aa44;background:rgba(0,0,0,0.3);');
    const sh = this.div('font-size:15px;font-weight:bold;color:#ff00aa;margin-bottom:6px;'); sh.textContent = 'ХАРАКТЕРИСТИКИ';
    statsCard.appendChild(sh);
    const stats: [string, 'health' | 'damage' | 'speed' | 'mag'][] = [
      ['Здоровье (+15 max HP)', 'health'], ['Урон (+10%)', 'damage'], ['Скорость (+8%)', 'speed'], ['Магазин (+25%)', 'mag'],
    ];
    for (const [label, stat] of stats) {
      const row = this.div('display:flex;justify-content:space-between;align-items:center;margin:4px 0;');
      const l = this.div('font-size:13px;color:#aac;'); l.textContent = `${label} — ур. ${p.stats[stat]}`;
      row.appendChild(l);
      if (p.statPoints > 0) row.appendChild(this.button('+1', () => { this.onApplyStat(stat); this.showUpgradeTerminal(); }, '#33ff66'));
      statsCard.appendChild(row);
    }
    c.appendChild(statsCard);

    for (const wid of ['pistol', 'auto', 'smg', 'shotgun', 'rifle'] as WeaponId[]) {
      const w = WEAPONS[wid];
      const owned = p.weapons.includes(wid);
      const card = this.div(`text-align:left;margin:10px 0;padding:12px;border:1px solid ${owned ? '#00f0ff44' : '#444'};background:rgba(0,0,0,0.3);`);
      const head = this.div(`font-size:15px;font-weight:bold;color:${owned ? '#00f0ff' : '#555'};margin-bottom:6px;`);
      head.textContent = `${w.name}${owned ? '' : ' (не куплено)'}`;
      card.appendChild(head);
      if (!owned) {
        if (p.level >= w.unlockLevel) {
          card.appendChild(this.button(`КУПИТЬ — ${w.price} cr`, () => { this.onBuyWeapon(wid); this.showUpgradeTerminal(); }, '#33ff66'));
        } else {
          const lock = this.div('font-size:12px;color:#889;'); lock.textContent = `Требуется уровень ${w.unlockLevel}`;
          card.appendChild(lock);
        }
        c.appendChild(card);
        continue;
      }
      const up = p.upgrades[wid];
      const stats2: [string, keyof WeaponUpgrades][] = [
        ['Урон', 'damage'], ['Скорострельность', 'fireRate'], ['Магазин', 'magSize'], ['Точность', 'accuracy'], ['Перезарядка', 'reload'],
      ];
      for (const [label, stat] of stats2) {
        const row = this.div('display:flex;justify-content:space-between;align-items:center;margin:4px 0;');
        const lvl = up[stat];
        const cost = UPGRADE_COSTS[stat] * (lvl + 1);
        const l = this.div('font-size:13px;color:#aac;'); l.textContent = `${label} — ур. ${lvl}/${MAX_UPGRADE_LEVEL}`;
        row.appendChild(l);
        if (lvl < MAX_UPGRADE_LEVEL && p.credits >= cost) {
          row.appendChild(this.button(`${cost} cr`, () => { this.onBuyUpgrade(wid, stat); this.showUpgradeTerminal(); }, '#ffcc00'));
        } else if (lvl >= MAX_UPGRADE_LEVEL) {
          const max = this.div('font-size:12px;color:#33ff66;'); max.textContent = 'MAX'; row.appendChild(max);
        } else {
          const ex = this.div('font-size:12px;color:#555;'); ex.textContent = `${cost} cr`; row.appendChild(ex);
        }
        card.appendChild(row);
      }
      c.appendChild(card);
    }
    c.appendChild(this.button('НАЗАД', () => { this.hide(); this.onResume(); }, '#888'));
    this.setOverlay(c);
  }

  showSettings(from: string) {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('НАСТРОЙКИ', '#ffcc00'));
    const p = this.getPlayer();
    const sens = p?.mouseSens ?? 0.0022;
    const sensRow = this.div('margin:20px auto;width:320px;');
    const sl = this.div('font-size:13px;color:#aac;margin-bottom:6px;'); sl.textContent = 'Чувствительность мыши';
    sensRow.appendChild(sl);
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0.0005'; slider.max = '0.005'; slider.step = '0.0001';
    slider.value = String(sens);
    slider.style.cssText = 'width:100%;';
    slider.oninput = () => this.onSettingsChange({ mouseSens: parseFloat(slider.value) });
    sensRow.appendChild(slider);
    c.appendChild(sensRow);
    c.appendChild(this.button('ПЕРЕКЛЮЧИТЬ ДОЖДЬ', () => this.onToggleWeather(), '#66aaff'));
    c.appendChild(this.button('НАЗАД', () => { if (from === 'menu') this.showMainMenu(); else this.showPauseMenu(); }, '#888'));
    this.setOverlay(c);
  }

  private mpName = '';
  private mpColor = 0;

  showMultiplayerMenu() {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('МУЛЬТИПЛЕЕР', '#ff00aa'));
    c.appendChild(this.subtitle('ИГРАЙ С ДРУЗЬЯМИ ПО СЕТИ'));

    const nameRow = this.div('margin:10px auto;width:300px;');
    const nameLabel = this.div('font-size:12px;color:#889;margin-bottom:4px;');
    nameLabel.textContent = 'ТВОЁ ИМЯ:';
    nameRow.appendChild(nameLabel);
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 12;
    nameInput.value = this.mpName || 'Игрок';
    nameInput.style.cssText = 'width:100%;padding:8px;background:rgba(0,0,0,0.5);border:1px solid #ff00aa44;color:#fff;font-family:monospace;font-size:14px;text-align:center;';
    nameRow.appendChild(nameInput);
    c.appendChild(nameRow);

    const colorRow = this.div('margin:10px auto;width:300px;');
    const colorLabel = this.div('font-size:12px;color:#889;margin-bottom:4px;');
    colorLabel.textContent = 'ЦВЕТ АВАТАРА:';
    colorRow.appendChild(colorLabel);
    const colors = [0x00f0ff, 0xff00aa, 0x33ff66, 0xffcc00, 0xff6644, 0x9966ff];
    const colorBtns = this.div('display:flex;justify-content:center;gap:8px;');
    let selectedColor = this.mpColor || colors[0];
    for (const col of colors) {
      const cb = document.createElement('div');
      const hex = '#' + col.toString(16).padStart(6, '0');
      cb.style.cssText = `width:28px;height:28px;border-radius:50%;background:${hex};border:2px solid ${selectedColor === col ? '#fff' : 'transparent'};cursor:pointer;box-shadow:0 0 8px ${hex}88;`;
      cb.onclick = () => {
        selectedColor = col;
        for (const child of colorBtns.children) {
          (child as HTMLElement).style.border = '2px solid transparent';
        }
        cb.style.border = '2px solid #fff';
      };
      colorBtns.appendChild(cb);
    }
    colorRow.appendChild(colorBtns);
    c.appendChild(colorRow);

    c.appendChild(this.button('СОЗДАТЬ КОМНАТУ', () => {
      this.mpName = nameInput.value || 'Игрок';
      this.mpColor = selectedColor;
      this.hide();
      this.onHostMultiplayer(this.mpName, this.mpColor);
    }, '#33ff66'));

    const codeRow = this.div('margin:16px auto;width:300px;');
    const codeLabel = this.div('font-size:12px;color:#889;margin-bottom:4px;');
    codeLabel.textContent = 'КОД КОМНАТЫ:';
    codeRow.appendChild(codeLabel);
    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.maxLength = 5;
    codeInput.placeholder = 'ABCDE';
    codeInput.style.cssText = 'width:100%;padding:8px;background:rgba(0,0,0,0.5);border:1px solid #00f0ff44;color:#fff;font-family:monospace;font-size:18px;text-align:center;text-transform:uppercase;letter-spacing:4px;';
    codeRow.appendChild(codeInput);
    c.appendChild(codeRow);

    c.appendChild(this.button('ПОДКЛЮЧИТЬСЯ', () => {
      const code = codeInput.value.trim().toUpperCase();
      if (code.length < 4) return;
      this.mpName = nameInput.value || 'Игрок';
      this.mpColor = selectedColor;
      this.hide();
      this.onJoinMultiplayer(this.mpName, this.mpColor, code);
    }, '#00f0ff'));

    c.appendChild(this.button('НАЗАД', () => this.showMainMenu(), '#888'));
    this.setOverlay(c);
  }

  showMultiplayerLobby(roomCode: string, players: string[], isHost: boolean) {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('КОМНАТА', '#33ff66'));
    c.appendChild(this.subtitle(`КОД: ${roomCode}`));

    const codeBox = this.div('margin:20px auto;padding:20px 40px;background:rgba(0,0,0,0.5);border:2px solid #33ff66;border-radius:8px;');
    codeBox.style.cssText += 'font-size:48px;font-weight:bold;color:#33ff66;letter-spacing:8px;text-shadow:0 0 20px #33ff66;';
    codeBox.textContent = roomCode;
    c.appendChild(codeBox);

    const hint = this.div('margin:10px auto;font-size:13px;color:#889;');
    hint.textContent = isHost ? 'Подожди друзей — они введут этот код' : 'Ожидание хоста...';
    c.appendChild(hint);

    const playerList = this.div('margin:20px auto;font-size:14px;color:#aac;line-height:1.8;');
    playerList.textContent = `Игроков: ${players.length + 1}`;
    c.appendChild(playerList);

    if (isHost) {
      c.appendChild(this.button('НАЧАТЬ ИГРУ', () => {
        this.hide();
        this.onNewGame();
      }, '#33ff66'));
    }

    c.appendChild(this.button('ПОКИНУТЬ КОМНАТУ', () => {
      this.hide();
      this.onLeaveMultiplayer();
      this.showMainMenu();
    }, '#ff4466'));

    this.setOverlay(c);
  }

  showMultiplayerError(error: string) {
    this.overlay.style.display = 'flex';
    const c = this.div('text-align:center;');
    c.appendChild(this.title('ОШИБКА', '#ff3344'));
    const msg = this.div('margin:20px auto;font-size:14px;color:#aac;max-width:400px;');
    msg.textContent = error;
    c.appendChild(msg);
    c.appendChild(this.button('НАЗАД', () => this.showMultiplayerMenu(), '#888'));
    this.setOverlay(c);
  }

  private setOverlay(c: HTMLElement) {
    this.overlay.innerHTML = '';
    this.overlay.appendChild(c);
  }
  hide() { this.overlay.style.display = 'none'; }
  isVisible() { return this.overlay.style.display !== 'none'; }

  isFullscreen(): boolean {
    return !!document.fullscreenElement;
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }
}
