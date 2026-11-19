import { EQUIPMENT, FIXED_STEP_SECONDS, purchaseEquipment } from './sim.ts';
import type { EquipmentDefinition, EquipmentId, HeroRole, SimEntity, Simulation } from './sim.ts';

export type EquipmentAvailability = 'available' | 'insufficient-gold' | 'inventory-full' | 'already-owned';

export const HERO_ROLES = ['vanguard', 'ranger', 'arcanist', 'duelist', 'guardian'] as const;
export const HERO_LABELS: Record<HeroRole, string> = {
  vanguard: 'Vanguard',
  ranger: 'Ranger',
  arcanist: 'Arcanist',
  duelist: 'Duelist',
  guardian: 'Guardian',
};

export function getPlayerHeroId(role: HeroRole): string {
  return `blue-hero-${role}`;
}

export function purchaseEquipmentForSelectedHero(world: Simulation, role: HeroRole, equipmentId: EquipmentId): boolean {
  return purchaseEquipment(world, getPlayerHeroId(role), equipmentId);
}

export interface MatchSession<T> {
  readonly world: T | null;
  readonly selectedRole: HeroRole | null;
  enter(role: HeroRole, createWorld: () => T): T;
  leave(): T | null;
}

export function createMatchSession<T>(): MatchSession<T> {
  let current: { role: HeroRole; world: T } | null = null;
  return {
    get world() {
      return current?.world ?? null;
    },
    get selectedRole() {
      return current?.role ?? null;
    },
    enter(role, createWorld) {
      if (current) throw new Error('A match is already active.');
      const world = createWorld();
      current = { role, world };
      return world;
    },
    leave() {
      const previousWorld = current?.world ?? null;
      current = null;
      return previousWorld;
    },
  };
}

export const SKILL_HINTS = [
  { key: 'Q', text: 'Q 技能：本批仅显示按键提示，未实现技能效果。' },
  { key: 'E', text: 'E 技能：本批仅显示按键提示，未实现技能效果。' },
  { key: 'R', text: 'R 技能：本批仅显示按键提示，未实现技能效果。' },
  { key: 'F', text: 'F 闪现：本批仅显示按键提示，未实现位移效果。' },
  { key: 'G', text: 'G 疗伤：本批仅显示按键提示，未实现治疗效果。' },
  { key: 'B', text: 'B 回城：本批仅显示按键提示，未实现回城效果。' },
  { key: 'Space', text: '空格普攻：本批仅显示按键提示，未接入玩家攻击操作。' },
] as const;

export function formatGameTime(ticks: number): string {
  const totalSeconds = Math.max(0, Math.floor(ticks * FIXED_STEP_SECONDS));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatGold(gold: number): string {
  return Math.max(0, Math.floor(gold)).toLocaleString('en-US');
}

export function getEquipmentAvailability(
  hero: Pick<SimEntity, 'gold' | 'inventory'>,
  item: EquipmentDefinition,
): EquipmentAvailability {
  if (hero.inventory.includes(item.id)) return 'already-owned';
  if (hero.inventory.length >= 3) return 'inventory-full';
  if (hero.gold < item.cost) return 'insufficient-gold';
  return 'available';
}

export function getSkillHint(key: string): string | null {
  return SKILL_HINTS.find((item) => item.key.toLowerCase() === key.toLowerCase())?.text ?? null;
}

function equipmentStats(item: EquipmentDefinition): string {
  const stats: string[] = [];
  if (item.attackDamage) stats.push(`物攻 +${item.attackDamage}`);
  if (item.magicPower) stats.push(`法强 +${item.magicPower}`);
  if (item.maxHp) stats.push(`生命 +${item.maxHp}`);
  if (item.armor) stats.push(`护甲 +${item.armor}`);
  if (item.resistance) stats.push(`抗性 +${item.resistance}`);
  if (item.moveSpeed) stats.push(`移速 +${item.moveSpeed}`);
  return stats.join(' · ');
}

function drawAvatar(canvas: HTMLCanvasElement, role: HeroRole): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const colors: Record<HeroRole, string> = {
    vanguard: '#d66f4f',
    ranger: '#4e9eaa',
    arcanist: '#8d78c9',
    duelist: '#c79a4f',
    guardian: '#658b72',
  };
  const color = colors[role];
  const center = canvas.width / 2;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0b1724';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(5, 5, canvas.width - 10, canvas.height - 10, 12);
  context.fill();
  context.fillStyle = 'rgba(8, 19, 31, .88)';
  context.beginPath();
  if (role === 'vanguard') {
    context.arc(center, center, 17, 0, Math.PI * 2);
  } else if (role === 'ranger') {
    context.moveTo(center, 12);
    context.lineTo(49, 48);
    context.lineTo(15, 48);
    context.closePath();
  } else if (role === 'arcanist') {
    context.moveTo(center, 10);
    context.lineTo(52, center);
    context.lineTo(center, 54);
    context.lineTo(12, center);
    context.closePath();
  } else if (role === 'duelist') {
    context.moveTo(16, 14);
    context.lineTo(48, 50);
    context.lineTo(40, 54);
    context.lineTo(12, 22);
    context.closePath();
    context.moveTo(48, 14);
    context.lineTo(16, 50);
    context.lineTo(24, 54);
    context.lineTo(52, 22);
    context.closePath();
  } else {
    context.rect(17, 17, 30, 30);
  }
  context.fill();
  context.strokeStyle = 'rgba(240, 248, 255, .72)';
  context.lineWidth = 2;
  context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
}

interface ScoreRowRefs {
  row: HTMLDivElement;
  kills: HTMLSpanElement;
  deaths: HTMLSpanElement;
  gold: HTMLSpanElement;
}

function buildScoreRows(container: HTMLElement): Map<HeroRole, ScoreRowRefs> {
  const rows = new Map<HeroRole, ScoreRowRefs>();
  const heading = document.createElement('div');
  heading.className = 'score-row score-head';
  heading.innerHTML = '<span>英雄</span><span>K</span><span>D</span><span>金币</span>';
  container.append(heading);
  for (const role of HERO_ROLES) {
    const row = document.createElement('div');
    row.className = 'score-row';
    const name = document.createElement('span');
    name.textContent = HERO_LABELS[role];
    const kills = document.createElement('span');
    const deaths = document.createElement('span');
    const gold = document.createElement('span');
    row.append(name, kills, deaths, gold);
    container.append(row);
    rows.set(role, { row, kills, deaths, gold });
  }
  return rows;
}

export interface HudController {
  update(world: Simulation): void;
  setActive(active: boolean): void;
  setSelectedHero(role: HeroRole): void;
  setShopOpen(open: boolean): void;
  setScoreboardOpen(open: boolean): void;
  setPaused(paused: boolean): void;
  setMuted(muted: boolean): void;
  setHint(key: string): void;
  setShopFeedback(message: string): void;
}

export function createHud(root: HTMLElement, onPurchase?: (success: boolean) => void): HudController {
  const required = <T extends HTMLElement>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing HUD element: ${selector}`);
    return element;
  };

  const hudRoot = required<HTMLElement>('#hud-root');
  const blueScore = required<HTMLElement>('#blue-score');
  const redScore = required<HTMLElement>('#red-score');
  const gameTime = required<HTMLElement>('#game-time');
  const teamGold = required<HTMLElement>('#team-gold');
  const shopPanel = required<HTMLElement>('#shop-panel');
  const shopItems = required<HTMLElement>('#shop-items');
  const shopFeedback = required<HTMLElement>('#shop-feedback');
  const shopTargetName = required<HTMLElement>('#shop-target-name');
  const scoreboardPanel = required<HTMLElement>('#scoreboard-panel');
  const pauseOverlay = required<HTMLElement>('#pause-overlay');
  const winnerOverlay = required<HTMLElement>('#winner-overlay');
  const winnerTitle = required<HTMLElement>('#winner-title');
  const winnerSubtitle = required<HTMLElement>('#winner-subtitle');
  const audioState = required<HTMLElement>('#audio-state');
  const actionHint = required<HTMLElement>('#action-hint');
  const scoreboardBlue = required<HTMLElement>('#scoreboard-blue');
  const scoreboardRed = required<HTMLElement>('#scoreboard-red');
  const scoreRows = {
    blue: buildScoreRows(scoreboardBlue),
    red: buildScoreRows(scoreboardRed),
  };
  const shopButtons = new Map<EquipmentId, HTMLButtonElement>();
  const rosterCards = Array.from(root.querySelectorAll<HTMLElement>('.hero-card[data-hero-role]'));
  let latestWorld: Simulation | null = null;
  let selectedHeroRole: HeroRole = 'vanguard';
  let active = false;

  for (const item of Object.values(EQUIPMENT)) {
    const row = document.createElement('div');
    row.className = 'shop-item';
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const stats = document.createElement('small');
    stats.textContent = equipmentStats(item);
    details.append(name, stats);
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => {
      const world = latestWorld;
      if (!active || !world) return;
      const heroId = getPlayerHeroId(selectedHeroRole);
      const hero = world.entities.find((entity) => entity.id === heroId);
      if (!hero) {
        shopFeedback.textContent = '未找到当前选中英雄。';
        onPurchase?.(false);
        return;
      }
      const availability = getEquipmentAvailability(hero, item);
      if (availability !== 'available') {
        shopFeedback.textContent = availability === 'insufficient-gold'
          ? `金币不足：${item.name} 需要 ${item.cost}。`
          : availability === 'inventory-full'
            ? '该英雄已满 3 件装备。'
            : `已拥有 ${item.name}，不能重复购买。`;
        onPurchase?.(false);
        return;
      }
      const success = purchaseEquipmentForSelectedHero(world, selectedHeroRole, item.id);
      shopFeedback.textContent = success ? `购买成功：${item.name}。` : `购买失败：${item.name}。`;
      onPurchase?.(success);
      update(world);
    });
    row.append(details, button);
    shopItems.append(row);
    shopButtons.set(item.id, button);
  }

  for (const canvas of root.querySelectorAll<HTMLCanvasElement>('canvas[data-avatar]')) {
    const role = canvas.dataset.avatar as HeroRole | undefined;
    if (role && HERO_ROLES.includes(role)) drawAvatar(canvas, role);
  }

  function updateScoreboard(world: Simulation): void {
    for (const team of ['blue', 'red'] as const) {
      for (const role of HERO_ROLES) {
        const hero = world.entities.find((entity) => entity.kind === 'hero' && entity.team === team && entity.role === role);
        const refs = scoreRows[team].get(role);
        if (!hero || !refs) continue;
        refs.kills.textContent = String(hero.kills);
        refs.deaths.textContent = String(hero.deaths);
        refs.gold.textContent = formatGold(hero.gold);
        refs.row.classList.toggle('is-selected', team === 'blue' && role === selectedHeroRole);
      }
    }
  }

  function updateShop(world: Simulation): void {
    const hero = world.entities.find((entity) => entity.id === getPlayerHeroId(selectedHeroRole));
    for (const item of Object.values(EQUIPMENT)) {
      const button = shopButtons.get(item.id);
      if (!button) continue;
      const availability = hero ? getEquipmentAvailability(hero, item) : 'inventory-full';
      button.disabled = availability === 'insufficient-gold';
      button.textContent = availability === 'available'
        ? `购买 · ${item.cost}`
        : availability === 'insufficient-gold'
          ? `金币不足 · ${item.cost}`
          : availability === 'inventory-full'
            ? '已满 3 件'
            : '已拥有';
    }
  }

  function update(world: Simulation): void {
    if (!active) return;
    latestWorld = world;
    const heroes = world.entities.filter((entity) => entity.kind === 'hero');
    const selectedHero = world.entities.find((entity) => entity.id === getPlayerHeroId(selectedHeroRole));
    blueScore.textContent = String(heroes.filter((hero) => hero.team === 'blue').reduce((sum, hero) => sum + hero.kills, 0));
    redScore.textContent = String(heroes.filter((hero) => hero.team === 'red').reduce((sum, hero) => sum + hero.kills, 0));
    teamGold.textContent = formatGold(selectedHero?.gold ?? 0);
    gameTime.textContent = formatGameTime(world.tick);
    updateShop(world);
    updateScoreboard(world);

    if (world.winner === null) {
      winnerOverlay.hidden = true;
    } else {
      winnerOverlay.hidden = false;
      winnerTitle.textContent = world.winner === 'blue' ? 'VICTORY' : 'DEFEAT';
      winnerSubtitle.textContent = world.winner === 'blue' ? '蓝方胜利 · 敌方水晶已摧毁' : '蓝方失败 · 己方水晶已摧毁';
    }
  }

  function setActive(value: boolean): void {
    active = value;
    hudRoot.hidden = !value;
    if (!value) {
      latestWorld = null;
      shopPanel.hidden = true;
      scoreboardPanel.hidden = true;
      pauseOverlay.hidden = true;
      winnerOverlay.hidden = true;
    }
  }

  function setSelectedHero(role: HeroRole): void {
    selectedHeroRole = role;
    shopTargetName.textContent = HERO_LABELS[role];
    for (const card of rosterCards) {
      card.classList.toggle('is-selected', card.dataset.heroRole === role);
    }
    if (active && latestWorld) update(latestWorld);
  }

  setActive(false);
  setSelectedHero(selectedHeroRole);

  return {
    update,
    setActive,
    setSelectedHero,
    setShopOpen(open) {
      if (open && !active) return;
      shopPanel.hidden = !open;
      if (open) scoreboardPanel.hidden = true;
    },
    setScoreboardOpen(open) {
      if (open && !active) return;
      scoreboardPanel.hidden = !open;
      if (open) shopPanel.hidden = true;
    },
    setPaused(paused) {
      pauseOverlay.hidden = !active || !paused;
    },
    setMuted(muted) {
      audioState.textContent = muted ? '音效：静音' : '音效：开启';
    },
    setHint(key) {
      actionHint.textContent = getSkillHint(key) ?? '技能与操作键目前仅作界面占位，不触发实际效果。';
    },
    setShopFeedback(message) {
      shopFeedback.textContent = message;
    },
  };
}
