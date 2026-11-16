export class Hud {
  root: HTMLElement;
  private crosshair: HTMLElement;
  private healthBar: HTMLElement;
  private healthText: HTMLElement;
  private staminaBar: HTMLElement;
  private ammoText: HTMLElement;
  private weaponText: HTMLElement;
  private xpText: HTMLElement;
  private levelText: HTMLElement;
  private creditsText: HTMLElement;
  private questTracker: HTMLElement;
  private questTitle: HTMLElement;
  private questObjectives: HTMLElement;
  private notifications: HTMLElement;
  private interactHint: HTMLElement;
  private damageOverlay: HTMLElement;
  private bossBar: HTMLElement;
  private bossBarFill: HTMLElement;
  private bossName: HTMLElement;
  private flashlightIndicator: HTMLElement;
  private timeIndicator: HTMLElement;
  private gravGunIndicator: HTMLElement;
  private minimap: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = '';
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:monospace;color:#cdf;z-index:10;';

    this.crosshair = this.el('position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:18px;height:18px;');
    this.crosshair.innerHTML = `<div style="position:absolute;left:8px;top:0;width:2px;height:18px;background:#00f0ff;box-shadow:0 0 4px #00f0ff;"></div><div style="position:absolute;left:0;top:8px;width:18px;height:2px;background:#00f0ff;box-shadow:0 0 4px #00f0ff;"></div>`;

    const bottomLeft = this.el('position:absolute;left:20px;bottom:20px;width:260px;');
    this.healthBar = this.el('width:100%;height:18px;background:rgba(0,0,0,0.5);border:1px solid #00f0ff44;margin-bottom:4px;');
    this.healthText = this.el('position:absolute;font-size:12px;padding:2px 6px;');
    this.healthBar.appendChild(this.healthText);
    this.staminaBar = this.el('width:100%;height:6px;background:rgba(0,0,0,0.5);border:1px solid #ffcc0044;');
    bottomLeft.appendChild(this.healthBar);
    bottomLeft.appendChild(this.staminaBar);

    const bottomRight = this.el('position:absolute;right:20px;bottom:20px;text-align:right;');
    this.weaponText = this.el('font-size:14px;color:#00f0ff;margin-bottom:2px;');
    this.ammoText = this.el('font-size:22px;font-weight:bold;');
    bottomRight.appendChild(this.weaponText);
    bottomRight.appendChild(this.ammoText);
    this.grenadeText = this.el('font-size:14px;color:#aac;margin-top:6px;');
    bottomRight.appendChild(this.grenadeText);

    const topRight = this.el('position:absolute;right:20px;top:20px;text-align:right;font-size:13px;');
    this.levelText = this.el('color:#ff00aa;font-weight:bold;margin-bottom:2px;');
    this.xpText = this.el('margin-bottom:2px;');
    this.creditsText = this.el('color:#00f0ff;');
    topRight.appendChild(this.levelText);
    topRight.appendChild(this.xpText);
    topRight.appendChild(this.creditsText);

    this.questTracker = this.el('position:absolute;left:20px;top:20px;width:320px;font-size:13px;');
    this.questTitle = this.el('color:#ffcc00;font-weight:bold;margin-bottom:4px;');
    this.questObjectives = this.el('line-height:1.5;');
    this.questTracker.appendChild(this.questTitle);
    this.questTracker.appendChild(this.questObjectives);

    this.notifications = this.el('position:absolute;left:50%;top:80px;transform:translateX(-50%);text-align:center;width:400px;');

    this.interactHint = this.el('position:absolute;left:50%;top:62%;transform:translateX(-50%);font-size:14px;color:#ffcc00;background:rgba(0,0,0,0.6);padding:4px 12px;border:1px solid #ffcc0044;display:none;');
    this.interactHint.textContent = '[E] Взаимодействовать';

    this.damageOverlay = this.el('position:absolute;inset:0;background:radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,0.5) 100%);opacity:0;transition:opacity 0.1s;');

    const bossContainer = this.el('position:absolute;left:50%;top:30px;transform:translateX(-50%);width:400px;display:none;');
    this.bossName = this.el('text-align:center;color:#ff00aa;font-weight:bold;font-size:14px;margin-bottom:4px;');
    this.bossBar = this.el('width:100%;height:14px;background:rgba(0,0,0,0.6);border:1px solid #ff00aa;');
    this.bossBarFill = this.el('width:100%;height:100%;background:linear-gradient(90deg,#ff00aa,#ff44cc);transition:width 0.1s;');
    this.bossBar.appendChild(this.bossBarFill);
    bossContainer.appendChild(this.bossName);
    bossContainer.appendChild(this.bossBar);
    this.bossBar = bossContainer;

    this.flashlightIndicator = this.el('position:absolute;right:20px;bottom:70px;font-size:12px;color:#66aaff;background:rgba(0,0,0,0.5);padding:3px 8px;border:1px solid #66aaff44;');
    this.flashlightIndicator.textContent = 'ФОНАРИК [F]: ВКЛ';

    this.timeIndicator = this.el('position:absolute;left:50%;bottom:20px;transform:translateX(-50%);font-size:12px;color:#aac;background:rgba(0,0,0,0.5);padding:3px 10px;border:1px solid #00f0ff22;');
    this.timeIndicator.textContent = '06:00';

    this.gravGunIndicator = this.el('position:absolute;left:20px;bottom:70px;font-size:12px;color:#ff6600;background:rgba(0,0,0,0.5);padding:3px 8px;border:1px solid #ff660044;display:none;');
    this.gravGunIndicator.textContent = 'ГРАВИ-ПУШКА [V] | ЛКМ: захват/запуск | ПКМ: импульс';

    root.appendChild(this.damageOverlay);
    root.appendChild(this.crosshair);
    root.appendChild(bottomLeft);
    root.appendChild(bottomRight);
    root.appendChild(topRight);
    root.appendChild(this.questTracker);
    root.appendChild(this.notifications);
    root.appendChild(this.interactHint);
    root.appendChild(this.bossBar);
    root.appendChild(this.flashlightIndicator);
    root.appendChild(this.timeIndicator);
    root.appendChild(this.gravGunIndicator);

    this.compass = this.el('position:absolute;top:50%;right:40px;transform:translateY(-50%);text-align:center;display:none;');
    this.compassArrow = this.el('font-size:36px;color:#00f0ff;text-shadow:0 0 8px #00f0ff;line-height:1;');
    this.compassArrow.textContent = '➤';
    this.compassLabel = this.el('font-size:11px;color:#aac;margin-top:4px;max-width:120px;');
    this.compass.appendChild(this.compassArrow);
    this.compass.appendChild(this.compassLabel);
    root.appendChild(this.compass);

    this.buffContainer = this.el('position:absolute;left:50%;top:60px;transform:translateX(-50%);text-align:center;font-size:13px;line-height:1.6;');
    root.appendChild(this.buffContainer);

    this.minimap = document.createElement('canvas');
    this.minimap.width = 160; this.minimap.height = 160;
    this.minimap.style.cssText = 'position:absolute;left:50%;top:20px;transform:translateX(-50%);border:1px solid #00f0ff44;border-radius:50%;background:rgba(0,4,12,0.6);';
    root.appendChild(this.minimap);
    this.minimapCtx = this.minimap.getContext('2d')!;
  }

  updateFlashlight(on: boolean) {
    this.flashlightIndicator.textContent = `ФОНАРИК [F]: ${on ? 'ВКЛ' : 'ВЫКЛ'}`;
    this.flashlightIndicator.style.color = on ? '#66aaff' : '#555';
  }

  updateTime(timeStr: string, isNight: boolean) {
    this.timeIndicator.textContent = `🕐 ${timeStr} ${isNight ? '🌙' : '☀'}`;
    this.timeIndicator.style.color = isNight ? '#6688cc' : '#ffcc66';
  }

  updateGravGun(active: boolean, grabbing: boolean) {
    this.gravGunIndicator.style.display = active ? 'block' : 'none';
    if (active) {
      this.gravGunIndicator.textContent = grabbing
        ? 'ГРАВИ [V] ✦ ЗАХВАЧЕН — ЛКМ: запустить | ПКМ: импульс'
        : 'ГРАВИ [V] ✦ ГОТОВ — ЛКМ: захватить бочку | ПКМ: импульс';
    }
  }

  updateMinimap(
    playerX: number, playerZ: number, playerYaw: number,
    enemies: { x: number; z: number; dead: boolean }[],
    exits: { x: number; z: number }[],
    pickups: { x: number; z: number }[],
    interactables: { x: number; z: number; type: string }[],
    range = 40
  ) {
    const ctx = this.minimapCtx;
    const w = this.minimap.width, h = this.minimap.height;
    const cx = w / 2, cy = h / 2;
    const r = w / 2 - 2;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,8,16,0.5)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(0,240,255,0.15)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, r * i / 3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

    const cos = Math.cos(playerYaw), sin = Math.sin(playerYaw);
    const scale = r / range;

    const project = (wx: number, wz: number): [number, number] | null => {
      let dx = wx - playerX, dz = wz - playerZ;
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      const px = cx + rx * scale;
      const py = cy + rz * scale;
      if ((px - cx) ** 2 + (py - cy) ** 2 > r * r) return null;
      return [px, py];
    };

    for (const e of exits) {
      const p = project(e.x, e.z);
      if (!p) continue;
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, Math.PI * 2); ctx.stroke();
    }

    for (const it of interactables) {
      const p = project(it.x, it.z);
      if (!p) continue;
      ctx.fillStyle = it.type === 'stash' ? '#ff00aa' : it.type === 'terminal' ? '#ffcc00' : '#33ff66';
      ctx.fillRect(p[0] - 2, p[1] - 2, 4, 4);
    }

    for (const pk of pickups) {
      const p = project(pk.x, pk.z);
      if (!p) continue;
      ctx.fillStyle = '#33ff66';
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.5, 0, Math.PI * 2); ctx.fill();
    }

    for (const e of enemies) {
      if (e.dead) continue;
      const p = project(e.x, e.z);
      if (!p) continue;
      ctx.fillStyle = '#ff3344';
      ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.strokeStyle = 'rgba(0,240,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  private compass: HTMLElement;
  private compassArrow: HTMLElement;
  private compassLabel: HTMLElement;

  updateCompass(angle: number | null, label: string) {
    if (angle === null) { this.compass.style.display = 'none'; return; }
    this.compass.style.display = 'block';
    this.compassArrow.style.transform = `rotate(${angle}deg)`;
    this.compassLabel.textContent = label;
  }

  private el(style: string): HTMLElement {
    const e = document.createElement('div');
    e.style.cssText = style;
    return e;
  }

  updateHealth(hp: number, maxHp: number) {
    const r = Math.max(0, hp / maxHp);
    this.healthBar.style.background = `rgba(0,0,0,0.5)`;
    this.healthBar.innerHTML = `<div style="width:${r * 100}%;height:100%;background:linear-gradient(90deg,#ff3344,#ff8866);"></div>`;
    this.healthText = this.el('position:absolute;font-size:12px;padding:2px 6px;');
    this.healthText.textContent = `${Math.ceil(hp)} / ${maxHp}`;
    this.healthBar.appendChild(this.healthText);
  }

  updateStamina(s: number, max: number) {
    this.staminaBar.innerHTML = `<div style="width:${(s / max) * 100}%;height:100%;background:#ffcc00;"></div>`;
  }

  updateAmmo(inMag: number, reserve: number, reloading: boolean, reloadProgress: number) {
    if (reloading) {
      this.ammoText.innerHTML = `<span style="color:#ffcc00;">ПЕРЕЗ...</span>`;
    } else {
      this.ammoText.innerHTML = `${inMag} <span style="color:#888;font-size:14px;">/ ${reserve}</span>`;
    }
  }

  private grenadeText: HTMLElement;
  updateGrenades(count: number) {
    this.grenadeText.innerHTML = `<span style="color:#33ff66;">G:</span> ${count}`;
  }

  updateWeapon(name: string) { this.weaponText.textContent = name; }
  updateLevel(lvl: number, xp: number, need: number) {
    this.levelText.textContent = `УР. ${lvl}`;
    this.xpText.innerHTML = `XP: ${xp} / ${need}`;
  }
  updateCredits(c: number) { this.creditsText.textContent = `${c} cr`; }

  updateQuest(title: string, objectives: { text: string; done: boolean }[]) {
    this.questTitle.textContent = title;
    this.questObjectives.innerHTML = objectives.map((o) =>
      `<div style="color:${o.done ? '#33ff66' : '#aac'};${o.done ? 'text-decoration:line-through;' : ''}"> ${o.done ? '✓' : '○'} ${o.text}</div>`
    ).join('');
  }

  clearQuest() { this.questTitle.textContent = ''; this.questObjectives.innerHTML = ''; }

  notify(text: string, color = '#00f0ff') {
    const n = this.el(`margin:4px auto;padding:6px 16px;background:rgba(0,0,0,0.7);border:1px solid ${color}44;color:${color};font-size:13px;opacity:0;transition:opacity 0.3s;`);
    n.textContent = text;
    this.notifications.appendChild(n);
    requestAnimationFrame(() => { n.style.opacity = '1'; });
    setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 400); }, 3000);
  }

  showInteract(show: boolean) { this.interactHint.style.display = show ? 'block' : 'none'; }

  setInteractLabel(label: string) { this.interactHint.textContent = `[E] ${label}`; }

  showDamage(intensity: number) { this.damageOverlay.style.opacity = String(intensity); }

  showBoss(name: string, ratio: number) {
    this.bossBar.style.display = 'block';
    this.bossName.textContent = name;
    this.bossBarFill.style.width = `${Math.max(0, ratio) * 100}%`;
  }
  hideBoss() { this.bossBar.style.display = 'none'; }

  private buffContainer: HTMLElement;
  updateBuffs(doubleDamage: number, shield: number, infiniteAmmo: number) {
    if (!this.buffContainer) return;
    let html = '';
    if (doubleDamage > 0) html += `<div style="color:#ff3344;">×2 УРОН ${doubleDamage.toFixed(1)}с</div>`;
    if (shield > 0) html += `<div style="color:#66aaff;">ЩИТ ${shield.toFixed(1)}с</div>`;
    if (infiniteAmmo > 0) html += `<div style="color:#ffaa00;">∞ ПАТРОНЫ ${infiniteAmmo.toFixed(1)}с</div>`;
    this.buffContainer.innerHTML = html;
  }

  setVisible(v: boolean) { this.root.style.display = v ? 'block' : 'none'; }
}
