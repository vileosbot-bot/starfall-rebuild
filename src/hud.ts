import { EQUIPMENT, FIXED_STEP_SECONDS, HERO_SKILLS, getLoggedGoldBalance, purchaseEquipment } from './sim.ts';
import type { EquipmentDefinition, EquipmentId, HeroRole, PlayerSkillKey, SimEntity, Simulation } from './sim.ts';

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
  { key: 'Q', text: 'Q：释放当前英雄的第一技能。' },
  { key: 'E', text: 'E：释放当前英雄的第二技能。' },
  { key: 'R', text: 'R：释放当前英雄的终极技能。' },
  { key: 'F', text: 'F：沿移动方向闪现 5 个单位。' },
  { key: 'G', text: 'G：引导 5 秒，恢复 30% 最大生命和法力。' },
  { key: 'B', text: 'B：引导 5 秒，返回己方泉水。' },
  { key: 'Space', text: '空格：攻击射程内最近的敌方单位。' },
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

export function getAimingSkillHint(key: 'Q' | 'E' | 'R'): string {
  return `${key}：瞄准中，松开施放`;
}

export function getPlayerTargetHint(kind: 'move' | 'attack' | null, targetId?: string): string {
  if (kind === 'move') return '正在前往目标点';
  if (kind === 'attack') return targetId ? `已指定攻击目标：${targetId}` : '已指定攻击目标';
  return '';
}

export interface SkillHudState {
  cooldownTicks: number;
  cooldownSeconds: number;
  manaInsufficient: boolean;
}

export function getSkillHudState(hero: Pick<SimEntity, 'mana' | 'skillCooldowns'>, role: HeroRole, key: PlayerSkillKey): SkillHudState {
  const cooldownTicks = hero.skillCooldowns?.[key] ?? 0;
  const manaCost = key === 'Q' || key === 'E' || key === 'R' ? HERO_SKILLS[role][key].manaCost : 0;
  return { cooldownTicks, cooldownSeconds: cooldownTicks * FIXED_STEP_SECONDS, manaInsufficient: manaCost > 0 && (hero.mana ?? 0) < manaCost };
}


export interface MinimapMarker {
  id: string;
  team: 'blue' | 'red';
  kind: 'hero' | 'minion' | 'tower' | 'crystal';
  x: number;
  y: number;
  selected: boolean;
  alive: boolean;
  minionType?: SimEntity['minionType'];
}

export function getMinimapMarkers(world: Simulation, selectedHeroId: string | null): MinimapMarker[] {
  const markers: MinimapMarker[] = [];
  for (const entity of world.entities) {
    if (entity.team === 'neutral') continue;
    if (entity.kind !== 'hero' && entity.kind !== 'minion' && entity.kind !== 'tower' && entity.kind !== 'crystal') continue;
    markers.push({
      id: entity.id,
      team: entity.team,
      kind: entity.kind,
      x: entity.position.x,
      y: entity.position.y,
      selected: entity.id === selectedHeroId,
      alive: entity.alive,
      minionType: entity.minionType,
    });
  }
  return markers;
}

function drawMinimap(canvas: HTMLCanvasElement, world: Simulation, selectedHeroId: string | null): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;
  const padding = 12;
  const extent = 15;
  const mapX = (x: number): number => padding + Math.max(0, Math.min(1, (x + extent) / (extent * 2))) * (width - padding * 2);
  const mapY = (y: number): number => height - padding - Math.max(0, Math.min(1, (y + extent) / (extent * 2))) * (height - padding * 2);

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#142b31';
  context.fillRect(0, 0, width, height);
  context.lineCap = 'round';
  context.strokeStyle = '#63715c';
  context.lineWidth = 7;
  for (const laneY of [-8, 0, 8]) {
    context.beginPath();
    context.moveTo(mapX(-extent), mapY(laneY));
    context.lineTo(mapX(extent), mapY(laneY));
    context.stroke();
  }
  context.strokeStyle = '#315d70';
  context.lineWidth = 10;
  context.beginPath();
  context.moveTo(mapX(0), mapY(-extent));
  context.lineTo(mapX(0), mapY(extent));
  context.stroke();

  context.fillStyle = '#3d694d';
  for (const [x, y, radius] of [[-5, -11, 5], [5, -11, 5], [-5, 11, 5], [5, 11, 5]] as const) {
    context.beginPath();
    context.arc(mapX(x), mapY(y), radius, 0, Math.PI * 2);
    context.fill();
  }

  for (const marker of getMinimapMarkers(world, selectedHeroId)) {
    const x = mapX(marker.x);
    const y = mapY(marker.y);
    const color = marker.team === 'blue' ? '#69baff' : '#ff9a78';
    const radius = marker.kind === 'crystal' ? 6 : marker.kind === 'tower' ? 4.6 :
      marker.kind === 'hero' ? 3.8 : marker.minionType === 'siege' || marker.minionType === 'super' ? 3.4 : 2.5;
    context.globalAlpha = marker.alive ? 1 : 0.38;
    context.fillStyle = color;
    context.beginPath();
    if (marker.kind === 'tower') {
      context.rect(x - radius, y - radius, radius * 2, radius * 2);
    } else if (marker.kind === 'crystal') {
      context.moveTo(x, y - radius);
      context.lineTo(x + radius, y);
      context.lineTo(x, y + radius);
      context.lineTo(x - radius, y);
      context.closePath();
    } else {
      context.arc(x, y, radius, 0, Math.PI * 2);
    }
    context.fill();
    if (marker.selected) {
      context.globalAlpha = 1;
      context.strokeStyle = '#ffe29a';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x, y, radius + 3, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  context.strokeStyle = 'rgba(190, 221, 220, .72)';
  context.lineWidth = 1.5;
  context.strokeRect(1, 1, width - 2, height - 2);
}

export interface ChannelHudState {
  label: string;
  progress: number;
  remainingSeconds: number;
  hpRestored: number;
  manaRestored: number;
}

export function getChannelHudState(hero: Pick<SimEntity, 'channel'>): ChannelHudState | null {
  const channel = hero.channel;
  if (!channel) return null;
  return {
    label: channel.kind === 'heal' ? '疗伤' : '回城',
    progress: (channel.totalTicks - channel.remainingTicks) / channel.totalTicks,
    remainingSeconds: channel.remainingTicks * FIXED_STEP_SECONDS,
    hpRestored: channel.hpRestored ?? 0,
    manaRestored: channel.manaRestored ?? 0,
  };
}

export function formatChannelHudLabel(state: ChannelHudState): string {
  const elapsed = (5 - state.remainingSeconds).toFixed(1);
  if (state.label === '疗伤') {
    return `疗伤 ${elapsed}/5.0s · HP+${state.hpRestored.toFixed(1)} MP+${state.manaRestored.toFixed(1)}`;
  }
  return `${state.label}引导 ${elapsed}/5.0s`;
}

export interface ScoreboardCombatStats {
  killsAndAssists: string;
  deathsAndLastHits: string;
}

export function getScoreboardCombatStats(
  hero: Pick<SimEntity, 'kills' | 'deaths' | 'assists' | 'minionLastHits'>,
): ScoreboardCombatStats {
  return {
    killsAndAssists: hero.kills + '/' + hero.assists,
    deathsAndLastHits: hero.deaths + '/' + (hero.minionLastHits ?? 0),
  };
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
  killsAssists: HTMLSpanElement;
  deathsLastHits: HTMLSpanElement;
  gold: HTMLSpanElement;
}

function buildScoreRows(container: HTMLElement): Map<HeroRole, ScoreRowRefs> {
  const rows = new Map<HeroRole, ScoreRowRefs>();
  const heading = document.createElement('div');
  heading.className = 'score-row score-head';
  heading.innerHTML = '<span>英雄</span><span>K/A</span><span>D/CS</span><span>金币</span>';
  container.append(heading);
  for (const role of HERO_ROLES) {
    const row = document.createElement('div');
    row.className = 'score-row';
    const name = document.createElement('span');
    name.textContent = HERO_LABELS[role];
    const killsAssists = document.createElement('span');
    const deathsLastHits = document.createElement('span');
    const gold = document.createElement('span');
    row.append(name, killsAssists, deathsLastHits, gold);
    container.append(row);
    rows.set(role, { row, killsAssists, deathsLastHits, gold });
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
  setAimingSkill(key: 'Q' | 'E' | 'R' | null): void;
  setPlayerTargetHint(kind: 'move' | 'attack' | null, targetId?: string): void;
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
  const skillbar = required<HTMLElement>('.skillbar');
  const minimapCanvas = required<HTMLCanvasElement>('#minimap');
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
  let playerTargetHint: string | null = null;

  const resourcePanel = document.createElement('div');
  resourcePanel.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:4px;min-width:118px;padding:2px 5px;color:#c9d8e9;font-size:10px;';
  const manaLabel = document.createElement('span');
  const manaTrack = document.createElement('div');
  manaTrack.style.cssText = 'height:6px;overflow:hidden;border-radius:5px;background:rgba(90,120,150,.35);';
  const manaFill = document.createElement('div');
  manaFill.style.cssText = 'height:100%;width:100%;background:#54a8dc;transition:width .08s linear;';
  manaTrack.append(manaFill);
  const channelLabel = document.createElement('span');
  channelLabel.style.cssText = 'min-height:12px;color:#f0d28a;';
  const channelTrack = document.createElement('div');
  channelTrack.style.cssText = 'height:4px;overflow:hidden;border-radius:4px;background:rgba(160,140,90,.25);';
  const channelFill = document.createElement('div');
  channelFill.style.cssText = 'height:100%;width:0%;background:#e6bd67;transition:width .08s linear;';
  channelTrack.append(channelFill);
  resourcePanel.append(manaLabel, manaTrack, channelLabel, channelTrack);
  skillbar.insertBefore(resourcePanel, skillbar.firstChild);

  const cooldownOverlays = new Map<PlayerSkillKey, { slot: HTMLElement; overlay: HTMLSpanElement }>();
  for (const slot of skillbar.querySelectorAll<HTMLElement>('.skill-slot')) {
    const keyText = slot.querySelector('kbd')?.textContent?.trim() ?? '';
    if (!['Q', 'E', 'R', 'F', 'G', 'B'].includes(keyText)) continue;
    const key = keyText as PlayerSkillKey;
    slot.style.position = 'relative';
    const overlay = document.createElement('span');
    overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(4,9,15,.78);color:#fff;font-size:11px;font-weight:700;';
    overlay.hidden = true;
    slot.append(overlay);
    cooldownOverlays.set(key, { slot, overlay });
  }

  const defaultActionHint = 'WASD/方向键移动 · 空格攻击 · Q/E/R技能 · F闪现 · G疗伤 · B回城';
  actionHint.textContent = defaultActionHint;

  function setAimingSkill(key: 'Q' | 'E' | 'R' | null): void {
    actionHint.textContent = key ? getAimingSkillHint(key) : playerTargetHint ?? defaultActionHint;
    for (const [skillKey, refs] of cooldownOverlays) {
      const aiming = skillKey === key;
      refs.slot.style.borderColor = aiming ? '#f0d28a' : '';
      refs.slot.style.boxShadow = aiming ? '0 0 0 1px rgba(240,210,138,.55)' : '';
    }
  }

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
      const availability = getEquipmentAvailability({ gold: getLoggedGoldBalance(world, hero.id), inventory: hero.inventory }, item);
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
        const combatStats = getScoreboardCombatStats(hero);
        refs.killsAssists.textContent = combatStats.killsAndAssists;
        refs.deathsLastHits.textContent = combatStats.deathsAndLastHits;
        refs.gold.textContent = formatGold(getLoggedGoldBalance(world, hero.id));
        refs.row.classList.toggle('is-selected', team === 'blue' && role === selectedHeroRole);
      }
    }
  }

  function updateShop(world: Simulation): void {
    const hero = world.entities.find((entity) => entity.id === getPlayerHeroId(selectedHeroRole));
    for (const item of Object.values(EQUIPMENT)) {
      const button = shopButtons.get(item.id);
      if (!button) continue;
      const availability = hero
        ? getEquipmentAvailability({ gold: getLoggedGoldBalance(world, hero.id), inventory: hero.inventory }, item)
        : 'inventory-full';
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
    teamGold.textContent = selectedHero ? formatGold(getLoggedGoldBalance(world, selectedHero.id)) : '0';
    gameTime.textContent = formatGameTime(world.tick);
    drawMinimap(minimapCanvas, world, getPlayerHeroId(selectedHeroRole));
    updateShop(world);
    updateScoreboard(world);

    const mana = selectedHero?.mana ?? 0;
    const maxMana = selectedHero?.maxMana ?? 0;
    manaLabel.textContent = 'MP ' + Math.floor(mana) + '/' + maxMana;
    manaFill.style.width = (maxMana > 0 ? Math.max(0, Math.min(100, (mana / maxMana) * 100)) : 0) + '%';
    for (const [key, refs] of cooldownOverlays) {
      const state = selectedHero
        ? getSkillHudState(selectedHero, selectedHeroRole, key)
        : { cooldownTicks: 0, cooldownSeconds: 0, manaInsufficient: false };
      refs.overlay.hidden = state.cooldownTicks <= 0;
      refs.overlay.textContent = state.cooldownTicks > 0 ? state.cooldownSeconds.toFixed(1) + 's' : '';
      refs.slot.style.opacity = state.manaInsufficient ? '0.42' : '1';
    }
    const channelState = selectedHero ? getChannelHudState(selectedHero) : null;
    channelLabel.textContent = channelState ? formatChannelHudLabel(channelState) : '';
    channelTrack.hidden = !channelState;
    channelFill.style.width = (channelState ? channelState.progress * 100 : 0) + '%';

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
      setAimingSkill(null);
      gameTime.textContent = '00:00';
      blueScore.textContent = '0';
      redScore.textContent = '0';
      teamGold.textContent = '0';
      manaLabel.textContent = 'MP 0/0';
      manaFill.style.width = '0%';
      channelLabel.textContent = '';
      channelTrack.hidden = true;
      channelFill.style.width = '0%';
      for (const refs of cooldownOverlays.values()) {
        refs.overlay.hidden = true;
        refs.overlay.textContent = '';
        refs.slot.style.opacity = '1';
      }
      shopPanel.hidden = true;
      scoreboardPanel.hidden = true;
      pauseOverlay.hidden = true;
      winnerOverlay.hidden = true;
      minimapCanvas.getContext('2d')?.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
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
      actionHint.textContent = getSkillHint(key) ?? playerTargetHint ?? defaultActionHint;
    },
    setAimingSkill,
    setPlayerTargetHint(kind, targetId) {
      playerTargetHint = getPlayerTargetHint(kind, targetId) || null;
      actionHint.textContent = playerTargetHint ?? defaultActionHint;
    },
    setShopFeedback(message) {
      shopFeedback.textContent = message;
    },
  };
}
