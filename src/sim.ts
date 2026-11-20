export const FIXED_STEP_SECONDS = 0.05;
export const TICKS_PER_SECOND = 20;
export const ASSIST_WINDOW_TICKS = TICKS_PER_SECOND * 10;
export const FIRST_WAVE_TICK = 200;
export const PASSIVE_GOLD_START_TICK = 200;
export const WAVE_INTERVAL_TICKS = 600;
export const MAX_HERO_LEVEL = 10;
export const MINION_CORPSE_GRACE_TICKS = 200;
export const MAX_EVENT_HISTORY = 5000;
const EVENT_HISTORY_PRUNE_BATCH = 1000;

export type Team = 'blue' | 'red';
export type Lane = 'top' | 'mid' | 'bottom';
export const LANE_Y: Record<Lane, number> = { top: -8, mid: 0, bottom: 8 };
const LANES: readonly Lane[] = ['top', 'mid', 'bottom'];
export type Faction = Team | 'neutral';
export type UnitKind = 'hero' | 'minion' | 'monster' | 'tower' | 'crystal';
export type DamageType = 'physical' | 'magic';
export type HeroRole = 'vanguard' | 'ranger' | 'arcanist' | 'duelist' | 'guardian';
export type HeroBehavior = 'push' | 'farm' | 'retreat' | 'heal';
export type MinionType = 'melee' | 'ranged' | 'siege' | 'super';
export type MonsterType = 'sentinel' | 'brute';
export type EquipmentId = 'ember-blade' | 'gale-fang' | 'star-core' | 'moon-prism' | 'tide-ward' | 'bastion-plate';
export type PlayerSkillKey = 'Q' | 'E' | 'R' | 'F' | 'G' | 'B';
export type PlayerChannelKind = 'heal' | 'recall';
export interface PlayerCommand { enabled?: boolean; moveX?: number; moveY?: number; moveTarget?: Position; attackTargetId?: string | null; attack?: boolean; skill?: PlayerSkillKey; aimPosition?: Position; }
export interface PlayerChannel { kind: PlayerChannelKind; totalTicks: number; remainingTicks: number; hpRestored: number; manaRestored: number; }
export interface SkillDefinition { key: 'Q' | 'E' | 'R'; name: string; effect: 'damage' | 'area-damage' | 'heal' | 'dash-strike'; manaCost: number; cooldownTicks: number; range: number; radius?: number; multiplier?: number; healRatio?: number; }
export type SimEventType =
  | 'wave-spawned'
  | 'attack'
  | 'unit-died'
  | 'hero-respawned'
  | 'monster-respawned'
  | 'level-up'
  | 'tower-destroyed'
  | 'crystal-destroyed'
  | 'item-purchased'
  | 'passive-gold'
  | 'gold-transaction'
  | 'minion-spawned'
  | 'ai-state-changed'
  | 'player-moved'
  | 'player-skill'
  | 'player-channel-progress'
  | 'player-channel-started'
  | 'player-channel-cancelled'
  | 'player-channel-completed';

export type IncomeSource =
  | 'starting-gold'
  | 'passive-gold'
  | 'minion-last-hit'
  | 'minion-share'
  | 'monster-bounty'
  | 'hero-kill'
  | 'hero-kill-experience'
  | 'hero-assist'
  | 'first-blood'
  | 'tower-team'
  | 'tower-last-hit'
  | 'equipment-purchase';

export interface Position {
  x: number;
  y: number;
}

export interface SimEntity {
  id: string;
  name: string;
  kind: UnitKind;
  team: Faction;
  role?: HeroRole;
  aiState?: HeroBehavior;
  minionType?: MinionType;
  monsterType?: MonsterType;
  towerIndex?: number;
  lane?: Lane;
  position: Position;
  hp: number;
  maxHp: number;
  armor: number;
  resistance: number;
  attackDamage: number;
  magicPower: number;
  damageType: DamageType;
  attackRange: number;
  attackCooldownTicks: number;
  cooldownRemaining: number;
  moveSpeed: number;
  level: number;
  experience: number;
  gold: number;
  kills: number;
  deaths: number;
  killStreak?: number;
  deathStreak?: number;
  assists: number;
  minionLastHits?: number;
  inventory: EquipmentId[];
  alive: boolean;
  respawnTicks: number;
  respawnDurationTicks: number;
  deathTick?: number;
  bountyGold: number;
  bountyExperience: number;
  critChance: number;
  aggroRange: number;
  mana?: number;
  maxMana?: number;
  manaRegenPerSecond?: number;
  skillCooldowns?: Record<PlayerSkillKey, number>;
  channel?: PlayerChannel | null;
}

export interface SimEvent {
  sequence: number;
  tick: number;
  type: SimEventType;
  sourceId?: string;
  targetId?: string;
  amount?: number;
  team?: Team;
  detail?: string;
  recipientId?: string;
  incomeSource?: IncomeSource;
  experienceAmount?: number;
  balanceAfter?: number;
  simSeconds?: number;
}

export interface PendingMinionSpawn {
  team: Team;
  lane: Lane;
  minionType: MinionType;
  wave: number;
  index: number;
  spawnTick: number;
}

export interface DamageContribution {
  amount: number;
  tick: number;
}

export interface Simulation {
  seed: number;
  rngState: number;
  tick: number;
  stepSeconds: number;
  entities: SimEntity[];
  waveCount: number;
  winner: Team | null;
  endReason: 'crystal-destroyed' | null;
  events: SimEvent[];
  eventSequence: number;
  playerHeroId: string | null;
  firstBloodAwarded: boolean;
  damageContributions: Record<string, Record<string, DamageContribution>>;
  pendingMinionSpawns: PendingMinionSpawn[];
}

export interface EquipmentDefinition {
  id: EquipmentId;
  category: 'physical' | 'magic' | 'defense';
  name: string;
  cost: number;
  attackDamage: number;
  magicPower: number;
  maxHp: number;
  armor: number;
  resistance: number;
  moveSpeed: number;
}

export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
  'ember-blade': {
    id: 'ember-blade', category: 'physical', name: 'Ember Blade', cost: 180,
    attackDamage: 20, magicPower: 0, maxHp: 0, armor: 0, resistance: 0, moveSpeed: 0,
  },
  'gale-fang': {
    id: 'gale-fang', category: 'physical', name: 'Gale Fang', cost: 240,
    attackDamage: 32, magicPower: 0, maxHp: 0, armor: 0, resistance: 0, moveSpeed: 0.15,
  },
  'star-core': {
    id: 'star-core', category: 'magic', name: 'Star Core', cost: 190,
    attackDamage: 0, magicPower: 24, maxHp: 0, armor: 0, resistance: 6, moveSpeed: 0,
  },
  'moon-prism': {
    id: 'moon-prism', category: 'magic', name: 'Moon Prism', cost: 250,
    attackDamage: 0, magicPower: 34, maxHp: 80, armor: 0, resistance: 4, moveSpeed: 0,
  },
  'tide-ward': {
    id: 'tide-ward', category: 'defense', name: 'Tide Ward', cost: 160,
    attackDamage: 0, magicPower: 0, maxHp: 160, armor: 8, resistance: 4, moveSpeed: 0,
  },
  'bastion-plate': {
    id: 'bastion-plate', category: 'defense', name: 'Bastion Plate', cost: 230,
    attackDamage: 0, magicPower: 0, maxHp: 240, armor: 14, resistance: 10, moveSpeed: 0,
  },
};

// AI policy: retreat below 35% HP; execute nearby enemy heroes at or below 50% HP; farm minions
// within 4 units; jungle only above 65% HP without enemies; heal 30 HP/s within 2.2 units of base.
// Passive income grants each living hero +2 gold every 20 ticks (1 simulated second).
export const AI_RULES = {
  retreatHealthRatio: 0.35,
  lowHealthEnemyHeroRatio: 0.5,
  minionSearchRange: 4.0,
  healPerSecond: 30,
  fountainRadius: 2.2,
  healthyMonsterHealthRatio: 0.65,
  monsterSearchRange: 4.6,
  passiveGoldStartTick: PASSIVE_GOLD_START_TICK,
  passiveGoldIntervalTicks: TICKS_PER_SECOND,
  passiveGoldAmount: 2,
} as const;

// Each role has a deterministic three-item recommendation; the purchase API still caps
// each individual hero at three distinct items even though the shared catalog has six.
export const HERO_PURCHASE_ORDER: Record<HeroRole, readonly EquipmentId[]> = {
  vanguard: ['tide-ward', 'ember-blade', 'bastion-plate'],
  ranger: ['ember-blade', 'gale-fang', 'tide-ward'],
  arcanist: ['star-core', 'moon-prism', 'tide-ward'],
  duelist: ['gale-fang', 'ember-blade', 'tide-ward'],
  guardian: ['tide-ward', 'bastion-plate', 'ember-blade'],
};

interface HeroTemplate {
  role: HeroRole;
  name: string;
  maxHp: number;
  armor: number;
  resistance: number;
  attackDamage: number;
  magicPower: number;
  damageType: DamageType;
  attackRange: number;
  attackCooldownTicks: number;
  moveSpeed: number;
  critChance: number;
}

const HERO_TEMPLATES: readonly HeroTemplate[] = [
  {
    role: 'vanguard', name: 'Vanguard', maxHp: 920, armor: 24, resistance: 16,
    attackDamage: 54, magicPower: 0, damageType: 'physical', attackRange: 1.6,
    attackCooldownTicks: 22, moveSpeed: 2.25, critChance: 0.04,
  },
  {
    role: 'ranger', name: 'Ranger', maxHp: 690, armor: 12, resistance: 14,
    attackDamage: 43, magicPower: 0, damageType: 'physical', attackRange: 5.0,
    attackCooldownTicks: 24, moveSpeed: 2.55, critChance: 0.08,
  },
  {
    role: 'arcanist', name: 'Arcanist', maxHp: 650, armor: 10, resistance: 22,
    attackDamage: 0, magicPower: 62, damageType: 'magic', attackRange: 5.4,
    attackCooldownTicks: 26, moveSpeed: 2.35, critChance: 0.05,
  },
  {
    role: 'duelist', name: 'Duelist', maxHp: 760, armor: 17, resistance: 13,
    attackDamage: 51, magicPower: 0, damageType: 'physical', attackRange: 1.7,
    attackCooldownTicks: 16, moveSpeed: 2.85, critChance: 0.12,
  },
  {
    role: 'guardian', name: 'Guardian', maxHp: 1020, armor: 30, resistance: 26,
    attackDamage: 42, magicPower: 0, damageType: 'physical', attackRange: 1.55,
    attackCooldownTicks: 25, moveSpeed: 2.05, critChance: 0.03,
  },
];

export const HERO_SKILLS: Record<HeroRole, Record<'Q' | 'E' | 'R', SkillDefinition>> = {
  vanguard: {
    Q: { key: 'Q', name: '裂地冲击', effect: 'area-damage', manaCost: 25, cooldownTicks: 120, range: 3.2, radius: 1.6, multiplier: 1.3 },
    E: { key: 'E', name: '坚韧恢复', effect: 'heal', manaCost: 40, cooldownTicks: 240, range: 0, healRatio: 0.18 },
    R: { key: 'R', name: '震荡重击', effect: 'area-damage', manaCost: 70, cooldownTicks: 800, range: 4.5, radius: 2.4, multiplier: 2.0 },
  },
  ranger: {
    Q: { key: 'Q', name: '穿透箭', effect: 'damage', manaCost: 25, cooldownTicks: 120, range: 7, multiplier: 1.5 },
    E: { key: 'E', name: '扇形散射', effect: 'area-damage', manaCost: 40, cooldownTicks: 240, range: 6, radius: 2.2, multiplier: 1.0 },
    R: { key: 'R', name: '远星狙击', effect: 'damage', manaCost: 70, cooldownTicks: 800, range: 10, multiplier: 2.6 },
  },
  arcanist: {
    Q: { key: 'Q', name: '奥术弹', effect: 'damage', manaCost: 25, cooldownTicks: 120, range: 7, multiplier: 1.4 },
    E: { key: 'E', name: '星环爆发', effect: 'area-damage', manaCost: 40, cooldownTicks: 240, range: 6, radius: 2.5, multiplier: 1.25 },
    R: { key: 'R', name: '陨星坠落', effect: 'area-damage', manaCost: 70, cooldownTicks: 800, range: 8, radius: 3.2, multiplier: 2.1 },
  },
  duelist: {
    Q: { key: 'Q', name: '疾刃连斩', effect: 'damage', manaCost: 25, cooldownTicks: 120, range: 3.2, multiplier: 1.7 },
    E: { key: 'E', name: '影袭突进', effect: 'dash-strike', manaCost: 40, cooldownTicks: 240, range: 5.5, multiplier: 1.2 },
    R: { key: 'R', name: '终结斩', effect: 'damage', manaCost: 70, cooldownTicks: 800, range: 3.5, multiplier: 2.5 },
  },
  guardian: {
    Q: { key: 'Q', name: '圣光锤击', effect: 'damage', manaCost: 25, cooldownTicks: 120, range: 3.5, multiplier: 1.3 },
    E: { key: 'E', name: '守护祝福', effect: 'heal', manaCost: 40, cooldownTicks: 240, range: 0, healRatio: 0.22 },
    R: { key: 'R', name: '壁垒震击', effect: 'area-damage', manaCost: 70, cooldownTicks: 800, range: 3.5, radius: 3.0, multiplier: 1.8 },
  },
};

const FLASH_DISTANCE = 5;
const FLASH_COOLDOWN_TICKS = 110 * TICKS_PER_SECOND;
const CHANNEL_TICKS = 5 * TICKS_PER_SECOND;
const CHANNEL_COOLDOWN_TICKS = 60 * TICKS_PER_SECOND;
const RECALL_COOLDOWN_TICKS = TICKS_PER_SECOND;
// Cursor snapping is deliberately local: an aimed single-target skill must have a legal target near the point.
const SKILL_AIM_TARGET_RADIUS = 1.5;

export const HERO_LANES: Record<HeroRole, Lane> = {
  vanguard: 'mid', ranger: 'mid', arcanist: 'top', duelist: 'bottom', guardian: 'top',
};
const HERO_RESPAWN_TICKS = 120;
const MONSTER_RESPAWN_TICKS = 900;
const VISION_RANGE = 5.8;

function oppositeTeam(team: Team): Team {
  return team === 'blue' ? 'red' : 'blue';
}

function distance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function laneFromY(y: number): Lane {
  if (y < -4) return 'top';
  if (y > 4) return 'bottom';
  return 'mid';
}

function getEntityLane(entity: SimEntity): Lane {
  return laneFromY(entity.position.y);
}

export function isStructureTargetEligible(
  world: Simulation,
  attackingTeam: Faction,
  targetId: string,
): boolean {
  if (attackingTeam === 'neutral') return false;
  const target = world.entities.find((entity) => entity.id === targetId);
  if (!target || !target.alive || target.team !== oppositeTeam(attackingTeam)) return false;

  if (target.kind === 'tower') {
    const lane = getEntityLane(target);
    const firstSurvivingTower = world.entities
      .filter((entity) =>
        entity.kind === 'tower' && entity.team === target.team &&
        entity.alive && getEntityLane(entity) === lane
      )
      .sort((a, b) =>
        (a.towerIndex ?? 0) - (b.towerIndex ?? 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      )[0];
    return firstSurvivingTower?.id === target.id;
  }

  if (target.kind === 'crystal') {
    return world.entities.some((entity) =>
      entity.kind === 'tower' && entity.team === target.team &&
      entity.towerIndex === 2 && !entity.alive
    );
  }

  return false;
}

function addEvent(world: Simulation, event: Omit<SimEvent, 'tick' | 'sequence'>): void {
  world.eventSequence += 1;
  world.events.push({ sequence: world.eventSequence, tick: world.tick, simSeconds: world.tick * FIXED_STEP_SECONDS, ...event });
  if (world.events.length > MAX_EVENT_HISTORY) {
    const retainedLength = MAX_EVENT_HISTORY - EVENT_HISTORY_PRUNE_BATCH;
    world.events.splice(0, world.events.length - retainedLength);
  }
}

export function getEventsAfterSequence(world: Pick<Simulation, 'events'>, afterSequence: number): SimEvent[] {
  let low = 0;
  let high = world.events.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (world.events[middle].sequence <= afterSequence) low = middle + 1;
    else high = middle;
  }
  return world.events.slice(low);
}

function nextRandom(world: Simulation): number {
  let value = world.rngState >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  world.rngState = value >>> 0;
  return world.rngState / 0x100000000;
}

function createHero(team: Team, template: HeroTemplate): SimEntity {
  const spawnX = team === 'blue' ? -10.8 : 10.8;
  return {
    id: team + '-hero-' + template.role,
    name: team + ' ' + template.name,
    kind: 'hero',
    team,
    role: template.role,
    aiState: 'push',
    lane: HERO_LANES[template.role],
    position: { x: spawnX, y: LANE_Y[HERO_LANES[template.role]] },
    hp: template.maxHp,
    maxHp: template.maxHp,
    armor: template.armor,
    resistance: template.resistance,
    attackDamage: template.attackDamage,
    magicPower: template.magicPower,
    damageType: template.damageType,
    attackRange: template.attackRange,
    attackCooldownTicks: template.attackCooldownTicks,
    cooldownRemaining: 0,
    mana: 300,
    maxMana: 300,
    manaRegenPerSecond: 4,
    skillCooldowns: { Q: 0, E: 0, R: 0, F: 0, G: 0, B: 0 },
    channel: null,
    moveSpeed: template.moveSpeed,
    level: 1,
    experience: 0,
    gold: 0,
    kills: 0,
    deaths: 0,
    killStreak: 0,
    deathStreak: 0,
    assists: 0,
    minionLastHits: 0,
    inventory: [],
    alive: true,
    respawnTicks: 0,
    respawnDurationTicks: HERO_RESPAWN_TICKS,
    bountyGold: 80,
    bountyExperience: 120,
    critChance: template.critChance,
    aggroRange: VISION_RANGE,
  };
}

function createTower(team: Team, lane: Lane, index: number, x: number): SimEntity {
  return {
    id: team + '-tower-' + lane + '-' + index,
    name: team + ' ' + lane + ' ' + (index === 1 ? 'Outer' : 'Inner') + ' Tower',
    kind: 'tower', team, towerIndex: index, lane,
    position: { x, y: LANE_Y[lane] },
    hp: 1050, maxHp: 1050, armor: 38, resistance: 24,
    attackDamage: 44, magicPower: 0, damageType: 'physical',
    attackRange: 5.8, attackCooldownTicks: 24, cooldownRemaining: 0,
    moveSpeed: 0, level: 1, experience: 0, gold: 0, kills: 0, deaths: 0, assists: 0,
    inventory: [], alive: true, respawnTicks: 0, respawnDurationTicks: 0,
    bountyGold: 120, bountyExperience: 100, critChance: 0, aggroRange: 5.8,
  };
}

function createCrystal(team: Team): SimEntity {
  const x = team === 'blue' ? -13.5 : 13.5;
  return {
    id: team + '-crystal',
    name: team + ' Crystal',
    kind: 'crystal',
    team,
    position: { x, y: 0 },
    hp: 1650,
    maxHp: 1650,
    armor: 16,
    resistance: 16,
    attackDamage: 0,
    magicPower: 0,
    damageType: 'physical',
    attackRange: 0,
    attackCooldownTicks: 0,
    cooldownRemaining: 0,
    moveSpeed: 0,
    level: 1,
    experience: 0,
    gold: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    inventory: [],
    alive: true,
    respawnTicks: 0,
    respawnDurationTicks: 0,
    bountyGold: 0,
    bountyExperience: 0,
    critChance: 0,
    aggroRange: 0,
  };
}

function createMonster(type: MonsterType): SimEntity {
  const sentinel = type === 'sentinel';
  return {
    id: 'neutral-' + type,
    name: sentinel ? 'Neutral Sentinel' : 'Neutral Brute',
    kind: 'monster',
    team: 'neutral',
    monsterType: type,
    position: sentinel ? { x: 0, y: -3.4 } : { x: 0, y: 3.4 },
    hp: sentinel ? 390 : 520,
    maxHp: sentinel ? 390 : 520,
    armor: sentinel ? 12 : 22,
    resistance: sentinel ? 16 : 10,
    attackDamage: sentinel ? 30 : 39,
    magicPower: 0,
    damageType: 'physical',
    attackRange: sentinel ? 1.8 : 2.0,
    attackCooldownTicks: sentinel ? 28 : 32,
    cooldownRemaining: 0,
    moveSpeed: sentinel ? 1.35 : 1.1,
    level: 1,
    experience: 0,
    gold: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    inventory: [],
    alive: true,
    respawnTicks: 0,
    respawnDurationTicks: MONSTER_RESPAWN_TICKS,
    bountyGold: sentinel ? 55 : 70,
    bountyExperience: sentinel ? 65 : 85,
    critChance: 0,
    aggroRange: 5.5,
  };
}

export function createSimulation(seed = 1, playerRole?: HeroRole): Simulation {
  const normalizedSeed = Math.abs(Math.trunc(seed)) >>> 0;
  const world: Simulation = {
    seed: normalizedSeed,
    rngState: normalizedSeed || 0x6d2b79f5,
    tick: 0,
    stepSeconds: FIXED_STEP_SECONDS,
    entities: [],
    waveCount: 0,
    winner: null,
    endReason: null,
    events: [],
    eventSequence: 0,
    playerHeroId: playerRole ? 'blue-hero-' + playerRole : null,
    firstBloodAwarded: false,
    damageContributions: {},
    pendingMinionSpawns: [],
  };

  for (const team of ['blue', 'red'] as const) {
    HERO_TEMPLATES.forEach((template) => {
      world.entities.push(createHero(team, template));
    });
  }

  for (const team of ['blue', 'red'] as const) {
    const direction = team === 'blue' ? -1 : 1;
    for (const lane of LANES) {
      world.entities.push(createTower(team, lane, 1, direction * 4));
      world.entities.push(createTower(team, lane, 2, direction * 8));
    }
  }
  world.entities.push(createCrystal('blue'));
  world.entities.push(createCrystal('red'));
  world.entities.push(createMonster('sentinel'));
  world.entities.push(createMonster('brute'));

  for (const hero of world.entities.filter((entity) => entity.kind === 'hero')) {
    recordWalletTransaction(world, hero, 300, 'starting-gold', hero.id);
  }

  return world;
}

function createMinion(team: Team, lane: Lane, type: MinionType, wave: number, index: number): SimEntity {
  const melee = type === 'melee', ranged = type === 'ranged', siege = type === 'siege', superMinion = type === 'super';
  const spawnX = team === 'blue' ? -10.2 : 10.2;
  const laneY = LANE_Y[lane];
  const y = laneY + (melee ? (index === 0 ? -0.275 : 0.275) : ranged ? 0 : siege ? -0.85 : 0.85);
  const hp = melee ? 230 : ranged ? 160 : siege ? 420 : 945;
  const attackDamage = melee ? 23 : ranged ? 0 : siege ? 34 : 46;
  const bountyGold = melee ? 18 : ranged ? 22 : siege ? 42 : 47;
  const bountyExperience = melee ? 24 : ranged ? 28 : siege ? 40 : 45;
  return {
    id: team + '-minion-' + wave + '-' + lane + '-' + type + '-' + index,
    name: team + ' ' + lane + ' ' + type + ' minion ' + wave + '.' + (index + 1),
    kind: 'minion', team, minionType: type, lane, position: { x: spawnX, y },
    hp, maxHp: hp, armor: ranged ? 5 : 10, resistance: ranged ? 10 : 7,
    attackDamage, magicPower: ranged ? 25 : 0, damageType: ranged ? 'magic' : 'physical',
    attackRange: ranged ? 4.4 : 1.35, attackCooldownTicks: ranged ? 25 : 20, cooldownRemaining: 0,
    moveSpeed: ranged ? 1.55 : siege ? 1.4 : superMinion ? 1.75 : 1.75,
    level: 1, experience: 0, gold: 0, kills: 0, deaths: 0, assists: 0, inventory: [],
    alive: true, respawnTicks: 0, respawnDurationTicks: 0,
    bountyGold, bountyExperience, critChance: 0, aggroRange: 4.8,
  };
}

function spawnWave(world: Simulation): void {
  world.waveCount += 1;
  for (const team of ['blue', 'red'] as const) {
    let plannedMinionCount = 0;
    for (const lane of LANES) {
      const schedule: Array<{ minionType: MinionType; index: number; offset: number }> = [
        { minionType: 'melee', index: 0, offset: 0 },
        { minionType: 'melee', index: 1, offset: 12 },
        { minionType: 'ranged', index: 0, offset: 24 },
      ];
      if (world.waveCount % 3 === 0) schedule.push({ minionType: 'siege', index: 0, offset: schedule.length * 12 });
      const enemyInnerTower = world.entities.find((entity) =>
        entity.kind === 'tower' && entity.team === oppositeTeam(team) && entity.lane === lane && entity.towerIndex === 2
      );
      if (!enemyInnerTower?.alive) schedule.push({ minionType: 'super', index: 0, offset: schedule.length * 12 });
      plannedMinionCount += schedule.length;
      for (const entry of schedule) world.pendingMinionSpawns.push({
        team, lane, minionType: entry.minionType, wave: world.waveCount,
        index: entry.index, spawnTick: world.tick + entry.offset,
      });
    }
    addEvent(world, {
      type: 'wave-spawned', team, amount: plannedMinionCount,
      detail: 'wave-' + world.waveCount + ';lanes=top,mid,bottom;per-team-total=' + plannedMinionCount,
    });
  }
}

function spawnPendingMinions(world: Simulation): void {
  const laneRank = (lane: Lane): number => lane === 'top' ? 0 : lane === 'mid' ? 1 : 2;
  const due = world.pendingMinionSpawns.filter((spawn) => spawn.spawnTick <= world.tick).sort((a, b) =>
    a.spawnTick - b.spawnTick ||
    (a.team < b.team ? -1 : a.team > b.team ? 1 : 0) ||
    laneRank(a.lane) - laneRank(b.lane) || a.index - b.index ||
    (a.minionType < b.minionType ? -1 : a.minionType > b.minionType ? 1 : 0)
  );
  world.pendingMinionSpawns = world.pendingMinionSpawns.filter((spawn) => spawn.spawnTick > world.tick);
  for (const spawn of due) {
    const minion = createMinion(spawn.team, spawn.lane, spawn.minionType, spawn.wave, spawn.index);
    world.entities.push(minion);
    addEvent(world, { type: 'minion-spawned', targetId: minion.id, team: spawn.team, amount: minion.hp, detail: spawn.minionType });
  }
}

function nearestEntity(
  origin: SimEntity,
  candidates: SimEntity[],
  maxDistance = Number.POSITIVE_INFINITY,
): SimEntity | null {
  const ranked = candidates
    .map((candidate) => ({ candidate, distance: distance(origin.position, candidate.position) }))
    .filter((entry) => entry.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance || (a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0));
  return ranked[0]?.candidate ?? null;
}

function findStructureTarget(world: Simulation, origin: SimEntity): SimEntity | null {
  if (origin.team === 'neutral') return null;
  const enemy = oppositeTeam(origin.team);
  const lane = origin.kind === 'hero'
    ? origin.lane ?? laneFromY(origin.position.y)
    : getEntityLane(origin);
  const towers = world.entities.filter((entity) =>
    entity.kind === 'tower' && entity.team === enemy && entity.alive && getEntityLane(entity) === lane
  ).sort((a, b) => (a.towerIndex ?? 0) - (b.towerIndex ?? 0));
  const nextTower = towers.find((tower) => isStructureTargetEligible(world, origin.team, tower.id));
  if (nextTower) return nextTower;
  const crystal = world.entities.find((entity) =>
    entity.kind === 'crystal' && entity.team === enemy && entity.alive
  );
  return crystal && isStructureTargetEligible(world, origin.team, crystal.id) ? crystal : null;
}

function selectTarget(world: Simulation, actor: SimEntity): SimEntity | null {
  if (actor.team === 'neutral') {
    const rankedPrey = world.entities
      .filter((entity) => entity.alive && entity.team !== 'neutral' && (entity.kind === 'hero' || entity.kind === 'minion'))
      .map((entity) => ({ entity, range: distance(actor.position, entity.position) }))
      .filter((entry) => entry.range <= actor.aggroRange)
      .sort((a, b) => a.range - b.range || (a.entity.id < b.entity.id ? -1 : a.entity.id > b.entity.id ? 1 : 0));
    const nearest = rankedPrey[0];
    if (!nearest) return null;
    if (rankedPrey.some((entry) => entry.entity.team !== nearest.entity.team && entry.range - nearest.range <= 0.0875)) return null;
    return nearest.entity;
  }
  const enemy = oppositeTeam(actor.team), lane = getEntityLane(actor);
  const alive = world.entities.filter((entity) => entity.alive && entity.team === enemy);
  if (actor.kind === 'tower') {
    const minions = alive.filter((entity) => entity.kind === 'minion' && getEntityLane(entity) === lane);
    const minionTarget = nearestEntity(actor, minions, actor.attackRange);
    if (minionTarget) return minionTarget;
    const heroes = alive.filter((entity) => entity.kind === 'hero' && getEntityLane(entity) === lane);
    return nearestEntity(actor, heroes, actor.attackRange);
  }
  if (actor.kind === 'hero') {
    const heroes = alive.filter((entity) => entity.kind === 'hero' && getEntityLane(entity) === lane);
    const heroTarget = nearestEntity(actor, heroes, VISION_RANGE);
    if (heroTarget) return heroTarget;
    const minions = alive.filter((entity) => entity.kind === 'minion' && getEntityLane(entity) === lane);
    const minionTarget = nearestEntity(actor, minions, VISION_RANGE);
    if (minionTarget) return minionTarget;
    const monsters = world.entities.filter((entity) => entity.alive && entity.team === 'neutral' && entity.kind === 'monster');
    const monsterTarget = nearestEntity(actor, monsters, 4.6);
    if (monsterTarget) return monsterTarget;
    return findStructureTarget(world, actor);
  }
  if (actor.kind === 'minion') {
    const minions = alive.filter((entity) => entity.kind === 'minion' && getEntityLane(entity) === lane);
    const minionTarget = nearestEntity(actor, minions, actor.aggroRange);
    if (minionTarget) return minionTarget;
    const structure = findStructureTarget(world, actor);
    if (structure && distance(actor.position, structure.position) <= actor.aggroRange) return structure;
    const heroes = alive.filter((entity) => entity.kind === 'hero' && getEntityLane(entity) === lane);
    const heroTarget = nearestEntity(actor, heroes, actor.aggroRange);
    if (heroTarget) return heroTarget;
    return structure;
  }
  return null;
}

export function calculateDamage(
  attacker: Pick<SimEntity, 'damageType' | 'attackDamage' | 'magicPower'>,
  defender: Pick<SimEntity, 'armor' | 'resistance'>,
): number {
  const power = attacker.damageType === 'physical' ? attacker.attackDamage : attacker.magicPower;
  const defense = Math.max(0, attacker.damageType === 'physical' ? defender.armor : defender.resistance);
  return Math.max(1, Math.round((power * 100) / (100 + defense)));
}

function gainExperience(world: Simulation, hero: SimEntity, amount: number): void {
  hero.experience += amount;
  while (hero.level < MAX_HERO_LEVEL && hero.experience >= hero.level * 100) {
    hero.experience -= hero.level * 100;
    hero.level += 1;
    hero.maxHp += 70;
    hero.hp = Math.min(hero.maxHp, hero.hp + 70);
    hero.attackDamage += hero.damageType === 'physical' ? 4 : 0;
    hero.magicPower += hero.damageType === 'magic' ? 5 : 0;
    hero.armor += 2;
    hero.resistance += 2;
    addEvent(world, { type: 'level-up', sourceId: hero.id, amount: hero.level, team: hero.team as Team });
  }
}

export const EXPERIENCE_SHARE_FACTORS = [1, 0.70, 0.52, 0.42, 0.36] as const;
export const HERO_KILL_EXPERIENCE_SCALE = 0.7;

export function getExperienceShareFactor(participantCount: number): number {
  const normalized = Math.max(1, Math.min(5, Math.floor(participantCount)));
  return EXPERIENCE_SHARE_FACTORS[normalized - 1] ?? EXPERIENCE_SHARE_FACTORS[4];
}

export function calculateHeroKillExperience(victimLevel: number, participantCount: number): number {
  const level = Math.max(1, Math.floor(victimLevel));
  return Math.round((140 + 28 * level) * HERO_KILL_EXPERIENCE_SCALE * getExperienceShareFactor(participantCount));
}

export function calculateHeroKillGold(
  killerKillStreak: number,
  victimDeathStreak: number,
  firstBlood: boolean,
): {
  base: number;
  streakBonus: number;
  deathPenalty: number;
  raw: number;
  bounty: number;
  firstBloodBonus: number;
  total: number;
} {
  const streakBonus = Math.max(0, Math.floor(killerKillStreak)) * 22;
  const deathPenalty = Math.max(0, Math.floor(victimDeathStreak)) * 11;
  const raw = 88 + streakBonus - deathPenalty;
  const bounty = Math.max(44, Math.min(208, raw));
  const firstBloodBonus = firstBlood ? 40 : 0;
  return { base: 88, streakBonus, deathPenalty, raw, bounty, firstBloodBonus, total: bounty + firstBloodBonus };
}

export function getTowerTeamGoldReward(towerIndex: number): number {
  const layer = Math.max(1, Math.min(3, Math.floor(towerIndex)));
  return [48, 56, 64][layer - 1] ?? 64;
}

export function getPassiveGoldTotalAtTick(tick: number): number {
  if (!Number.isInteger(tick) || tick < PASSIVE_GOLD_START_TICK) return 0;
  const elapsedTicks = tick - PASSIVE_GOLD_START_TICK;
  return AI_RULES.passiveGoldAmount +
    Math.floor((elapsedTicks * AI_RULES.passiveGoldAmount) / AI_RULES.passiveGoldIntervalTicks);
}

export function getLoggedGoldBalance(world: Simulation, heroId: string): number {
  for (let index = world.events.length - 1; index >= 0; index -= 1) {
    const event = world.events[index];
    if (event.type === 'gold-transaction' && event.recipientId === heroId &&
        typeof event.balanceAfter === 'number') {
      return event.balanceAfter;
    }
  }
  return world.entities.find((entity) => entity.id === heroId)?.gold ?? 0;
}

function recordWalletTransaction(
  world: Simulation,
  recipient: SimEntity,
  amount: number,
  incomeSource: IncomeSource,
  sourceId: string,
  targetId?: string,
  experienceAmount = 0,
): void {
  recipient.gold += amount;
  if (experienceAmount > 0) gainExperience(world, recipient, experienceAmount);
  addEvent(world, {
    type: 'gold-transaction',
    sourceId,
    targetId,
    recipientId: recipient.id,
    amount,
    experienceAmount,
    balanceAfter: recipient.gold,
    incomeSource,
    team: recipient.team as Team,
    detail: incomeSource,
  });
}

function splitIntegerPool(total: number, recipients: SimEntity[]): Map<string, number> {
  const sorted = [...recipients].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const result = new Map<string, number>();
  if (sorted.length === 0 || total <= 0) return result;
  const base = Math.floor(total / sorted.length);
  const remainder = total % sorted.length;
  sorted.forEach((recipient, index) => {
    result.set(recipient.id, base + (index < remainder ? 1 : 0));
  });
  return result;
}

function nearbyTeamHeroes(
  world: Simulation,
  team: Team,
  origin: Position,
  alwaysIncludeId?: string,
): SimEntity[] {
  const heroes = world.entities.filter((entity) =>
    entity.kind === 'hero' && entity.team === team && entity.alive &&
    distance(entity.position, origin) <= 12
  );
  const required = alwaysIncludeId ? world.entities.find((entity) =>
    entity.id === alwaysIncludeId && entity.kind === 'hero' && entity.team === team && entity.alive
  ) : undefined;
  if (required && !heroes.some((hero) => hero.id === required.id)) heroes.push(required);
  return heroes.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function awardMinionBounty(world: Simulation, attacker: SimEntity, target: SimEntity): void {
  const recipients = nearbyTeamHeroes(
    world,
    attacker.team as Team,
    target.position,
    attacker.kind === 'hero' ? attacker.id : undefined,
  );
  const shareGold = Math.round(target.bountyGold * 0.35);
  const experienceEach = Math.round(target.bountyExperience * getExperienceShareFactor(recipients.length));
  for (const recipient of recipients) {
    const isLastHitter = attacker.kind === 'hero' && recipient.id === attacker.id;
    const gold = isLastHitter ? target.bountyGold : shareGold;
    const experience = experienceEach;
    if (isLastHitter) recipient.minionLastHits = (recipient.minionLastHits ?? 0) + 1;
    if (gold > 0 || experience > 0) {
      recordWalletTransaction(
        world,
        recipient,
        gold,
        isLastHitter ? 'minion-last-hit' : 'minion-share',
        attacker.id,
        target.id,
        experience,
      );
    }
  }
}

function awardHeroKill(world: Simulation, attacker: SimEntity, victim: SimEntity): void {
  const firstBlood = !world.firstBloodAwarded;
  const bounty = calculateHeroKillGold(attacker.killStreak ?? 0, victim.deathStreak ?? 0, firstBlood);
  const experienceRecipients = nearbyTeamHeroes(world, attacker.team as Team, victim.position, attacker.id);
  const experienceEach = calculateHeroKillExperience(victim.level, experienceRecipients.length);

  for (const recipient of experienceRecipients) {
    const isKiller = recipient.id === attacker.id;
    recordWalletTransaction(
      world,
      recipient,
      isKiller ? bounty.bounty : 0,
      isKiller ? 'hero-kill' : 'hero-kill-experience',
      attacker.id,
      victim.id,
      experienceEach,
    );
  }

  if (firstBlood) {
    world.firstBloodAwarded = true;
    recordWalletTransaction(world, attacker, bounty.firstBloodBonus, 'first-blood', attacker.id, victim.id);
  }

  const contributions = world.damageContributions[victim.id] ?? {};
  const assistants = Object.keys(contributions)
    .filter((id) => {
      const contribution = contributions[id];
      const age = world.tick - contribution.tick;
      return id !== attacker.id && contribution.amount > 0 && age >= 0 && age <= ASSIST_WINDOW_TICKS;
    })
    .map((id) => world.entities.find((entity) =>
      entity.id === id && entity.kind === 'hero' && entity.team === attacker.team
    ))
    .filter((entity): entity is SimEntity => Boolean(entity))
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const assistPool = Math.floor(bounty.total * 0.8);
  const assistAmounts = splitIntegerPool(assistPool, assistants);
  for (const assistant of assistants) {
    assistant.assists += 1;
    recordWalletTransaction(
      world,
      assistant,
      assistAmounts.get(assistant.id) ?? 0,
      'hero-assist',
      attacker.id,
      victim.id,
    );
  }

  attacker.kills += 1;
  attacker.killStreak = (attacker.killStreak ?? 0) + 1;
  attacker.deathStreak = 0;
  victim.deathStreak = (victim.deathStreak ?? 0) + 1;
  victim.killStreak = 0;
  delete world.damageContributions[victim.id];
}

function awardTowerRewards(world: Simulation, attacker: SimEntity, tower: SimEntity): void {
  if (attacker.team === 'neutral') return;
  const team = attacker.team as Team;
  const teammates = world.entities
    .filter((entity) => entity.kind === 'hero' && entity.team === team)
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (teammates.length === 0) return;
  const goldEach = getTowerTeamGoldReward(tower.towerIndex ?? 1);
  const experiencePool = 100;
  const experienceBase = Math.floor(experiencePool / teammates.length);
  const experienceRemainder = experiencePool % teammates.length;
  teammates.forEach((hero, index) => {
    recordWalletTransaction(
      world,
      hero,
      goldEach,
      'tower-team',
      attacker.id,
      tower.id,
      experienceBase + (index < experienceRemainder ? 1 : 0),
    );
  });
  if (attacker.kind === 'hero') {
    recordWalletTransaction(world, attacker, 40, 'tower-last-hit', attacker.id, tower.id);
  }
}

function cancelPlayerChannel(world: Simulation, hero: SimEntity, reason: string): void {
  const channel = hero.channel;
  if (!channel) return;
  hero.channel = null;
  addEvent(world, { type: 'player-channel-cancelled', sourceId: hero.id, detail: channel.kind + ':' + reason });
}

function interruptPlayerChannelOnDamage(world: Simulation, attacker: SimEntity, target: SimEntity): void {
  if (attacker.kind !== 'hero' && attacker.kind !== 'tower') return;
  if (target.id === world.playerHeroId && target.channel) cancelPlayerChannel(world, target, 'damage');
}

function killEntity(world: Simulation, attacker: SimEntity, target: SimEntity): void {
  if (!target.alive) return;
  target.alive = false;
  target.hp = 0;
  if (target.kind === 'minion') target.deathTick = world.tick;
  if (target.id === world.playerHeroId) cancelPlayerChannel(world, target, 'death');

  if (target.kind === 'hero') {
    target.deaths += 1;
    target.respawnTicks = target.respawnDurationTicks;
  } else if (target.kind === 'monster') {
    target.respawnTicks = target.respawnDurationTicks;
  }

  const enemyHeroKill = target.kind === 'hero' && attacker.kind === 'hero' && attacker.team !== target.team;
  if (enemyHeroKill) {
    awardHeroKill(world, attacker, target);
  } else if (target.kind === 'hero') {
    target.deathStreak = (target.deathStreak ?? 0) + 1;
    target.killStreak = 0;
    delete world.damageContributions[target.id];
  }

  if (attacker.team !== target.team) {
    if (target.kind === 'minion' && attacker.team !== 'neutral') {
      awardMinionBounty(world, attacker, target);
    } else if (attacker.kind === 'hero' && target.kind === 'monster') {
      recordWalletTransaction(
        world,
        attacker,
        target.bountyGold,
        'monster-bounty',
        attacker.id,
        target.id,
        target.bountyExperience,
      );
    } else if (target.kind === 'tower') {
      awardTowerRewards(world, attacker, target);
    }
  }

  if (target.kind === 'tower') {
    addEvent(world, { type: 'tower-destroyed', sourceId: attacker.id, targetId: target.id, team: attacker.team as Team });
  }

  const bountyAmount = target.kind === 'minion' || target.kind === 'monster' ? target.bountyGold : undefined;
  addEvent(world, { type: 'unit-died', sourceId: attacker.id, targetId: target.id, amount: bountyAmount, detail: target.kind });

  if (target.kind === 'crystal' && attacker.team !== 'neutral') {
    world.winner = attacker.team;
    world.endReason = 'crystal-destroyed';
    addEvent(world, { type: 'crystal-destroyed', sourceId: attacker.id, targetId: target.id, team: attacker.team });
  }
}

function recordHeroDamage(world: Simulation, attacker: SimEntity, target: SimEntity, amount: number): void {
  if (attacker.kind !== 'hero' || target.kind !== 'hero' || attacker.team === target.team || amount <= 0) return;
  const contributions = world.damageContributions[target.id] ?? (world.damageContributions[target.id] = {});
  const previous = contributions[attacker.id];
  contributions[attacker.id] = { amount: (previous?.amount ?? 0) + amount, tick: world.tick };
}

function performAttack(world: Simulation, attacker: SimEntity, target: SimEntity): void {
  let amount = calculateDamage(attacker, target);
  let critical = false;
  if (attacker.kind === 'hero' && attacker.critChance > 0 && nextRandom(world) < attacker.critChance) {
    amount = Math.round(amount * 1.5);
    critical = true;
  }

  attacker.cooldownRemaining = attacker.attackCooldownTicks;
  if (amount > 0) interruptPlayerChannelOnDamage(world, attacker, target);
  target.hp = Math.max(0, target.hp - amount);
  recordHeroDamage(world, attacker, target, amount);
  addEvent(world, {
    type: 'attack',
    sourceId: attacker.id,
    targetId: target.id,
    amount,
    detail: critical ? 'critical' : undefined,
  });
  if (target.hp === 0) killEntity(world, attacker, target);
}

function moveTowards(actor: SimEntity, target: SimEntity): void {
  const dx = target.position.x - actor.position.x;
  const dy = target.position.y - actor.position.y;
  const currentDistance = Math.sqrt(dx * dx + dy * dy);
  const desiredDistance = Math.max(0, currentDistance - actor.attackRange * 0.9);
  const movement = Math.min(actor.moveSpeed * FIXED_STEP_SECONDS, desiredDistance);
  if (currentDistance === 0 || movement <= 0) return;
  actor.position.x += (dx / currentDistance) * movement;
  actor.position.y += (dy / currentDistance) * movement;
  if (actor.kind === 'minion') {
    const laneY = LANE_Y[laneFromY(actor.position.y)];
    actor.position.y = Math.max(laneY - 1.2, Math.min(laneY + 1.2, actor.position.y));
  }
}

function setHeroBehavior(world: Simulation, hero: SimEntity, next: HeroBehavior): void {
  if (hero.aiState === next) return;
  const previous = hero.aiState ?? 'push';
  hero.aiState = next;
  addEvent(world, { type: 'ai-state-changed', sourceId: hero.id, team: hero.team as Team, detail: previous + '->' + next });
}

function moveTowardsPoint(actor: SimEntity, target: Position, stopDistance = 0): void {
  const dx = target.x - actor.position.x;
  const dy = target.y - actor.position.y;
  const currentDistance = Math.sqrt(dx * dx + dy * dy);
  if (currentDistance <= stopDistance + 1e-9) return;
  const desiredMovement = Math.max(0, currentDistance - stopDistance);
  const movement = Math.min(actor.moveSpeed * FIXED_STEP_SECONDS, desiredMovement);
  if (currentDistance === 0 || movement <= 0) return;
  actor.position.x += (dx / currentDistance) * movement;
  actor.position.y += (dy / currentDistance) * movement;
}

function moveAwayFromPoint(actor: SimEntity, threat: Position, minimumDistance: number): void {
  const dx = actor.position.x - threat.x;
  const dy = actor.position.y - threat.y;
  const currentDistance = Math.sqrt(dx * dx + dy * dy);
  if (currentDistance >= minimumDistance) return;
  const fallbackX = actor.team === 'blue' ? -1 : 1;
  const nx = currentDistance === 0 ? fallbackX : dx / currentDistance;
  const ny = currentDistance === 0 ? 0 : dy / currentDistance;
  const movement = Math.min(actor.moveSpeed * FIXED_STEP_SECONDS, minimumDistance - currentDistance);
  actor.position.x += nx * movement;
  actor.position.y += ny * movement;
}

function purchaseRecommendedEquipment(world: Simulation, hero: SimEntity): void {
  if (!hero.role || !hero.alive) return;
  const order = HERO_PURCHASE_ORDER[hero.role];
  while (hero.inventory.length < 3) {
    const nextItem = order.find((equipmentId) => !hero.inventory.includes(equipmentId));
    if (!nextItem || hero.gold < EQUIPMENT[nextItem].cost) return;
    if (!purchaseEquipment(world, hero.id, nextItem)) return;
  }
}

function hasFriendlyMinionInTowerRange(world: Simulation, hero: SimEntity, tower: SimEntity): boolean {
  return world.entities.some((entity) =>
    entity.alive && entity.kind === 'minion' && entity.team === hero.team &&
    distance(entity.position, tower.position) <= tower.attackRange
  );
}

function findHeroCombatTarget(world: Simulation, hero: SimEntity): SimEntity | null {
  const enemy = oppositeTeam(hero.team as Team), lane = getEntityLane(hero);
  const enemyHeroes = world.entities
    .filter((entity) => entity.alive && entity.team === enemy && entity.kind === 'hero' && getEntityLane(entity) === lane)
    .map((entity) => ({ entity, range: distance(hero.position, entity.position) }))
    .filter((entry) =>
      (entry.range <= AI_RULES.minionSearchRange ||
        (hero.team === 'blue' ? entry.entity.position.x < 0 : entry.entity.position.x > 0)) &&
      entry.entity.hp / entry.entity.maxHp <= AI_RULES.lowHealthEnemyHeroRatio
    )
    .sort((a, b) => a.entity.hp - b.entity.hp || a.range - b.range || (a.entity.id < b.entity.id ? -1 : a.entity.id > b.entity.id ? 1 : 0));
  if (enemyHeroes.length > 0) return enemyHeroes[0].entity;
  const enemyMinions = world.entities.filter((entity) =>
    entity.alive && entity.team === enemy && entity.kind === 'minion' && getEntityLane(entity) === lane
  );
  const minionTarget = nearestEntity(hero, enemyMinions, AI_RULES.minionSearchRange);
  if (minionTarget) return minionTarget;
  const structure = findStructureTarget(world, hero);
  if (structure?.kind === 'tower') return hasFriendlyMinionInTowerRange(world, hero, structure) ? structure : null;
  if (structure) return structure;
  if (hero.hp / hero.maxHp >= AI_RULES.healthyMonsterHealthRatio) {
    const monsters = world.entities.filter((entity) =>
      entity.alive && entity.team === 'neutral' && entity.kind === 'monster'
    );
    return nearestEntity(hero, monsters, AI_RULES.monsterSearchRange);
  }
  return null;
}

function updateHeroAI(world: Simulation, hero: SimEntity): void {
  const home = world.entities.find((entity) => entity.kind === 'crystal' && entity.team === hero.team);
  if (!home) return;

  if (hero.aiState !== 'retreat' && hero.aiState !== 'heal' && hero.hp / hero.maxHp < AI_RULES.retreatHealthRatio) {
    setHeroBehavior(world, hero, 'retreat');
  }
  if (hero.aiState !== 'retreat' && hero.aiState !== 'heal') purchaseRecommendedEquipment(world, hero);

  if (hero.aiState === 'retreat') {
    if (distance(hero.position, home.position) <= AI_RULES.fountainRadius) {
      setHeroBehavior(world, hero, 'heal');
    } else {
      moveTowardsPoint(hero, home.position, AI_RULES.fountainRadius);
      return;
    }
  }

  if (hero.aiState === 'heal') {
    if (distance(hero.position, home.position) > AI_RULES.fountainRadius) {
      setHeroBehavior(world, hero, 'retreat');
      moveTowardsPoint(hero, home.position, AI_RULES.fountainRadius);
      return;
    }
    hero.hp = Math.min(hero.maxHp, hero.hp + AI_RULES.healPerSecond * FIXED_STEP_SECONDS);
    if (hero.hp >= hero.maxHp) setHeroBehavior(world, hero, 'push');
    return;
  }

  const target = findHeroCombatTarget(world, hero);
  if (target) {
    setHeroBehavior(world, hero, target.kind === 'tower' || target.kind === 'crystal' ? 'push' : 'farm');
    const range = distance(hero.position, target.position);
    if (range <= hero.attackRange) {
      if (hero.cooldownRemaining === 0) performAttack(world, hero, target);
    } else {
      moveTowards(hero, target);
    }
    return;
  }

  setHeroBehavior(world, hero, 'push');
  const pushDirection = hero.team === 'blue' ? 1 : -1;
  const leadingMinion = world.entities
    .filter((entity) =>
      entity.alive && entity.kind === 'minion' && entity.team === hero.team &&
      getEntityLane(entity) === getEntityLane(hero) && distance(hero.position, entity.position) <= 8
    )
    .sort((a, b) => pushDirection * (b.position.x - a.position.x) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
  if (leadingMinion) {
    // Escort the most advanced allied minion instead of orbiting the nearest rear minion.
    moveTowardsPoint(hero, leadingMinion.position, Math.max(1.5, hero.attackRange * 0.6));
    return;
  }

  const nextStructure = findStructureTarget(world, hero);
  if (nextStructure?.kind === 'tower') {
    // Stage outside the approved 5.8 tower range plus the existing 0.6 safety buffer.
    const safeDistance = nextStructure.attackRange + 0.6;
    moveAwayFromPoint(hero, nextStructure.position, safeDistance);
    moveTowardsPoint(hero, nextStructure.position, safeDistance);
  } else if (nextStructure) {
    moveTowards(hero, nextStructure);
  }
}

function updateActor(world: Simulation, actor: SimEntity): void {
  if (!actor.alive || actor.kind === 'crystal') return;
  if (actor.cooldownRemaining > 0) actor.cooldownRemaining -= 1;
  if (actor.kind === 'hero') {
    if (actor.skillCooldowns) {
      for (const key of Object.keys(actor.skillCooldowns) as PlayerSkillKey[]) {
        actor.skillCooldowns[key] = Math.max(0, actor.skillCooldowns[key] - 1);
      }
    }
    if (typeof actor.mana === 'number' && typeof actor.maxMana === 'number') {
      actor.mana = Math.min(actor.maxMana, actor.mana + (actor.manaRegenPerSecond ?? 0) * FIXED_STEP_SECONDS);
    }
    if (actor.id === world.playerHeroId) return;
    updateHeroAI(world, actor);
    return;
  }
  const target = selectTarget(world, actor);
  if (!target) return;
  const range = distance(actor.position, target.position);
  if (range <= actor.attackRange) {
    if (actor.cooldownRemaining === 0) performAttack(world, actor, target);
    return;
  }
  if (actor.moveSpeed > 0) moveTowards(actor, target);
}

function playerEnemyTargets(world: Simulation, hero: SimEntity): SimEntity[] {
  const structure = findStructureTarget(world, hero);
  return world.entities.filter((entity) => {
    if (!entity.alive || entity.team === hero.team) return false;
    if (entity.kind === 'tower' || entity.kind === 'crystal') return entity.id === structure?.id;
    return true;
  });
}

function findPlayerSpecifiedTarget(world: Simulation, hero: SimEntity, targetId: string): SimEntity | null {
  if (hero.team === 'neutral') return null;
  const enemy = oppositeTeam(hero.team);
  const target = world.entities.find((entity) =>
    entity.id === targetId && entity.alive && entity.team === enemy
  );
  if (!target) return null;
  if (target.kind === 'hero' || target.kind === 'minion') return target;
  if (target.kind === 'tower' || target.kind === 'crystal') {
    return isStructureTargetEligible(world, hero.team, target.id) ? target : null;
  }
  return null;
}

function applyPlayerSkillDamage(world: Simulation, hero: SimEntity, target: SimEntity, multiplier: number): number {
  const amount = calculateDamage({
    damageType: hero.damageType,
    attackDamage: hero.attackDamage * multiplier,
    magicPower: hero.magicPower * multiplier,
  }, target);
  interruptPlayerChannelOnDamage(world, hero, target);
  target.hp = Math.max(0, target.hp - amount);
  recordHeroDamage(world, hero, target, amount);
  if (target.hp === 0) killEntity(world, hero, target);
  return amount;
}

function castRoleSkill(
  world: Simulation,
  hero: SimEntity,
  key: 'Q' | 'E' | 'R',
  specifiedTarget: SimEntity | null = null,
  aimPosition: Position | null = null,
): boolean {
  if (!hero.role || !hero.skillCooldowns) return false;
  const definition = HERO_SKILLS[hero.role][key];
  const mana = hero.mana ?? 0;
  if (hero.skillCooldowns[key] > 0 || mana < definition.manaCost) return false;
  let totalAmount = 0;
  let primaryTarget: SimEntity | null = null;
  if (definition.effect === 'heal') {
    if (hero.hp >= hero.maxHp) return false;
    totalAmount = Math.min(hero.maxHp - hero.hp, Math.round(hero.maxHp * (definition.healRatio ?? 0)));
    if (totalAmount <= 0) return false;
    hero.hp += totalAmount;
  } else {
    const candidates = playerEnemyTargets(world, hero);
    if (specifiedTarget && !candidates.some((entity) => entity.id === specifiedTarget.id)) {
      candidates.push(specifiedTarget);
    }

    let targets: SimEntity[] = [];
    if (aimPosition) {
      if (distance(hero.position, aimPosition) > definition.range) return false;
      const aimCandidates = candidates.filter((entity) => entity.team !== 'neutral');
      if (definition.effect === 'area-damage') {
        targets = aimCandidates.filter((entity) =>
          entity.alive && distance(entity.position, aimPosition) <= (definition.radius ?? 0)
        );
        primaryTarget = targets.sort((a, b) =>
          distance(a.position, aimPosition) - distance(b.position, aimPosition) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        )[0] ?? null;
      } else {
        const aimedTargets = aimCandidates.filter((entity) =>
          entity.alive &&
          distance(hero.position, entity.position) <= definition.range &&
          distance(entity.position, aimPosition) <= SKILL_AIM_TARGET_RADIUS
        );
        primaryTarget = aimedTargets.sort((a, b) =>
          distance(a.position, aimPosition) - distance(b.position, aimPosition) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        )[0] ?? null;
        if (primaryTarget) targets = [primaryTarget];
      }
    } else {
      // Keep the existing specified-target -> nearest-enemy fallback when no cursor point is supplied.
      primaryTarget = specifiedTarget
        ? (distance(hero.position, specifiedTarget.position) <= definition.range ? specifiedTarget : null)
        : nearestEntity(hero, candidates, definition.range);
      if (primaryTarget) {
        targets = definition.effect === 'area-damage'
          ? candidates.filter((entity) =>
            entity.alive && distance(entity.position, primaryTarget!.position) <= (definition.radius ?? 0)
          )
          : [primaryTarget];
      }
    }

    if (!primaryTarget) return false;
    if (definition.effect === 'dash-strike') {
      const dx = primaryTarget.position.x - hero.position.x;
      const dy = primaryTarget.position.y - hero.position.y;
      const targetDistance = Math.hypot(dx, dy);
      if (targetDistance > 0) {
        hero.position.x = primaryTarget.position.x - (dx / targetDistance) * 0.85;
        hero.position.y = primaryTarget.position.y - (dy / targetDistance) * 0.85;
      }
    }
    for (const target of targets) {
      if (target.alive) totalAmount += applyPlayerSkillDamage(world, hero, target, definition.multiplier ?? 1);
    }
  }
  hero.mana = Math.max(0, mana - definition.manaCost);
  hero.skillCooldowns[key] = definition.cooldownTicks;
  addEvent(world, {
    type: 'player-skill',
    sourceId: hero.id,
    targetId: primaryTarget?.id,
    amount: totalAmount,
    detail: key + ':' + definition.name + ';mana=' + definition.manaCost,
  });
  return true;
}
function castFlash(world: Simulation, hero: SimEntity, moveX: number, moveY: number): boolean {
  if (!hero.skillCooldowns || hero.skillCooldowns.F > 0) return false;
  let dx = moveX;
  let dy = moveY;
  let directionLength = Math.hypot(dx, dy);
  if (directionLength === 0) {
    const target = nearestEntity(hero, playerEnemyTargets(world, hero));
    if (target) {
      dx = target.position.x - hero.position.x;
      dy = target.position.y - hero.position.y;
      directionLength = Math.hypot(dx, dy);
    }
  }
  if (directionLength === 0) {
    dx = hero.team === 'blue' ? 1 : -1;
    dy = 0;
    directionLength = 1;
  }
  hero.position.x += (dx / directionLength) * FLASH_DISTANCE;
  hero.position.y += (dy / directionLength) * FLASH_DISTANCE;
  hero.skillCooldowns.F = FLASH_COOLDOWN_TICKS;
  addEvent(world, { type: 'player-skill', sourceId: hero.id, amount: FLASH_DISTANCE, detail: 'F:flash' });
  return true;
}

function startPlayerChannel(world: Simulation, hero: SimEntity, kind: PlayerChannelKind): boolean {
  if (!hero.skillCooldowns || hero.channel) return false;
  const key: 'G' | 'B' = kind === 'heal' ? 'G' : 'B';
  if (hero.skillCooldowns[key] > 0) return false;
  hero.skillCooldowns[key] = kind === 'heal' ? CHANNEL_COOLDOWN_TICKS : RECALL_COOLDOWN_TICKS;
  hero.channel = { kind, totalTicks: CHANNEL_TICKS, remainingTicks: CHANNEL_TICKS, hpRestored: 0, manaRestored: 0 };
  addEvent(world, { type: 'player-channel-started', sourceId: hero.id, detail: key + ':' + kind, amount: CHANNEL_TICKS });
  return true;
}

function applyPlayerCommand(world: Simulation, command?: PlayerCommand): void {
  if (!command || command.enabled === false || world.winner !== null || !world.playerHeroId) return;
  const hero = world.entities.find((entity) => entity.id === world.playerHeroId);
  if (!hero || hero.kind !== 'hero' || !hero.alive) return;
  const moveX = command.moveX ?? 0;
  const moveY = command.moveY ?? 0;
  const moveLength = Math.hypot(moveX, moveY);
  const moving = moveLength > 0;
  if (command.skill === 'F') {
    if (hero.channel && hero.channel.kind !== 'heal') cancelPlayerChannel(world, hero, 'move');
    castFlash(world, hero, moveX, moveY);
    return;
  }
  if (moving) {
    if (hero.channel && hero.channel.kind !== 'heal') cancelPlayerChannel(world, hero, 'move');
    const distanceMoved = hero.moveSpeed * world.stepSeconds;
    hero.position.x += (moveX / moveLength) * distanceMoved;
    hero.position.y += (moveY / moveLength) * distanceMoved;
    addEvent(world, { type: 'player-moved', sourceId: hero.id, amount: distanceMoved });
  }

  const specifiedTarget = command.attackTargetId
    ? findPlayerSpecifiedTarget(world, hero, command.attackTargetId)
    : null;

  if (specifiedTarget) {
    const targetDistance = distance(hero.position, specifiedTarget.position);
    if (targetDistance <= hero.attackRange) {
      if (hero.cooldownRemaining === 0) {
        if (hero.channel) cancelPlayerChannel(world, hero, 'attack');
        performAttack(world, hero, specifiedTarget);
      }
    } else if (!moving) {
      if (hero.channel && hero.channel.kind !== 'heal') cancelPlayerChannel(world, hero, 'move');
      moveTowards(hero, specifiedTarget);
    }
  } else if (!moving && command.moveTarget) {
    if (hero.channel && hero.channel.kind !== 'heal') cancelPlayerChannel(world, hero, 'move');
    moveTowardsPoint(hero, command.moveTarget, 0.3);
  }

  if (command.attack && !specifiedTarget) {
    if (hero.channel) cancelPlayerChannel(world, hero, 'attack');
    if (hero.cooldownRemaining === 0) {
      const target = nearestEntity(hero, playerEnemyTargets(world, hero), hero.attackRange);
      if (target) performAttack(world, hero, target);
    }
  }
  if (!command.skill) return;
  if (command.skill === 'G' || command.skill === 'B') {
    if (moving || command.attack) return;
    startPlayerChannel(world, hero, command.skill === 'G' ? 'heal' : 'recall');
    return;
  }
  castRoleSkill(world, hero, command.skill, specifiedTarget, command.aimPosition ?? null);
}

function advancePlayerChannel(world: Simulation): boolean {
  if (!world.playerHeroId) return false;
  const hero = world.entities.find((entity) => entity.id === world.playerHeroId);
  const channel = hero?.channel;
  if (!hero || !hero.alive || !channel) return false;
  channel.remainingTicks = Math.max(0, channel.remainingTicks - 1);

  if (channel.kind === 'heal') {
    const elapsedTicks = channel.totalTicks - channel.remainingTicks;
    const totalHpTarget = Math.round(hero.maxHp * 0.3);
    const totalManaTarget = Math.round((hero.maxMana ?? 0) * 0.3);
    const hpTarget = elapsedTicks === channel.totalTicks
      ? totalHpTarget
      : totalHpTarget * elapsedTicks / channel.totalTicks;
    const manaTarget = elapsedTicks === channel.totalTicks
      ? totalManaTarget
      : totalManaTarget * elapsedTicks / channel.totalTicks;
    const hpDelta = Math.max(0, hpTarget - channel.hpRestored);
    const manaDelta = Math.max(0, manaTarget - channel.manaRestored);
    const hpRestored = Math.min(Math.max(0, hero.maxHp - hero.hp), hpDelta);
    const manaRestored = Math.min(Math.max(0, (hero.maxMana ?? 0) - (hero.mana ?? 0)), manaDelta);
    hero.hp += hpRestored;
    hero.mana = (hero.mana ?? 0) + manaRestored;
    channel.hpRestored += hpRestored;
    channel.manaRestored += manaRestored;
    addEvent(world, {
      type: 'player-channel-progress',
      sourceId: hero.id,
      amount: hpRestored,
      detail: 'G:heal;mana-restored=' + manaRestored + ';hp-total=' + channel.hpRestored + ';mana-total=' + channel.manaRestored,
    });
    if (channel.remainingTicks > 0) return true;
    addEvent(world, {
      type: 'player-channel-completed',
      sourceId: hero.id,
      amount: channel.hpRestored,
      detail: 'G:heal;mana-restored=' + channel.manaRestored,
    });
  } else {
    if (channel.remainingTicks > 0) return false;
    const home = world.entities.find((entity) => entity.kind === 'crystal' && entity.team === hero.team);
    if (home) hero.position = { ...home.position };
    addEvent(world, { type: 'player-channel-completed', sourceId: hero.id, amount: CHANNEL_TICKS, detail: 'B:recall' });
  }
  hero.channel = null;
  return channel.kind === 'heal';
}

function advancePlayerFountainRecovery(world: Simulation): void {
  if (!world.playerHeroId || world.winner !== null) return;
  const hero = world.entities.find((entity) => entity.id === world.playerHeroId);
  if (!hero || hero.kind !== 'hero' || !hero.alive || hero.hp <= 0) return;
  // G owns its 30%-over-5s recovery while channeling; do not stack fountain HP on top.
  if (hero.channel?.kind === 'heal') return;
  const home = world.entities.find((entity) => entity.kind === 'crystal' && entity.team === hero.team);
  if (!home || distance(hero.position, home.position) > AI_RULES.fountainRadius) return;
  hero.hp = Math.min(hero.maxHp, hero.hp + AI_RULES.healPerSecond * FIXED_STEP_SECONDS);
  // L56 has no verified fountain-specific MP rate; retain the existing global manaRegenPerSecond.
}

function respawnEntities(world: Simulation): void {
  for (const entity of world.entities) {
    if (entity.alive || entity.respawnTicks <= 0) continue;
    entity.respawnTicks -= 1;
    if (entity.respawnTicks > 0) continue;

    entity.alive = true;
    entity.hp = entity.maxHp;
    entity.cooldownRemaining = 0;
    if (entity.kind === 'hero' && entity.team !== 'neutral') {
      entity.aiState = 'push';
      const lane = entity.role ? HERO_LANES[entity.role] : 'mid';
      entity.lane = lane;
      entity.position = { x: entity.team === 'blue' ? -10.8 : 10.8, y: LANE_Y[lane] };
      addEvent(world, { type: 'hero-respawned', sourceId: entity.id, team: entity.team });
    } else if (entity.kind === 'monster') {
      entity.position = entity.monsterType === 'sentinel' ? { x: 0, y: -3.4 } : { x: 0, y: 3.4 };
      addEvent(world, { type: 'monster-respawned', sourceId: entity.id });
    }
  }
}

function reclaimExpiredMinions(world: Simulation): void {
  const removedIds = new Set<string>();
  world.entities = world.entities.filter((entity) => {
    const expired = entity.kind === 'minion' && !entity.alive && entity.deathTick !== undefined &&
      world.tick - entity.deathTick >= MINION_CORPSE_GRACE_TICKS;
    if (expired) removedIds.add(entity.id);
    return !expired;
  });
  if (removedIds.size === 0) return;
  for (const id of removedIds) delete world.damageContributions[id];
  for (const contributions of Object.values(world.damageContributions)) {
    for (const id of removedIds) delete contributions[id];
  }
}

export function stepSimulation(world: Simulation, steps = 1, command?: PlayerCommand): Simulation {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new RangeError('steps must be a non-negative integer');
  }

  for (let step = 0; step < steps; step += 1) {
    if (world.winner !== null) break;
    if (
      world.tick >= FIRST_WAVE_TICK &&
      (world.tick - FIRST_WAVE_TICK) % WAVE_INTERVAL_TICKS === 0
    ) {
      spawnWave(world);
    }
    spawnPendingMinions(world);
    respawnEntities(world);

    const firstTeam: Team = world.tick % 2 === 0 ? 'blue' : 'red';
    const teamRank = (team: Faction): number =>
      team === 'neutral' ? 2 : team === firstTeam ? 0 : 1;
    const actors = [...world.entities].sort((a, b) =>
      teamRank(a.team) - teamRank(b.team) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
    for (const actor of actors) {
      if (world.winner !== null) break;
      updateActor(world, actor);
    }

    if (world.winner !== null) break;
    applyPlayerCommand(world, command);
    const healChannelAdvanced = command?.enabled !== false ? advancePlayerChannel(world) : false;
    if (!healChannelAdvanced) advancePlayerFountainRecovery(world);
    world.tick += 1;

    const passiveGoldDelta =
      getPassiveGoldTotalAtTick(world.tick) - getPassiveGoldTotalAtTick(world.tick - 1);
    if (passiveGoldDelta > 0) {
      for (const hero of world.entities) {
        if (hero.kind !== 'hero') continue;
        recordWalletTransaction(world, hero, passiveGoldDelta, 'passive-gold', hero.id);
        addEvent(world, {
          type: 'passive-gold',
          sourceId: hero.id,
          team: hero.team as Team,
          amount: passiveGoldDelta,
          detail: 'start-tick-200;rate-2-per-second;cumulative-floor',
        });
      }
    }
    reclaimExpiredMinions(world);
  }
  return world;
}

export function purchaseEquipment(world: Simulation, heroId: string, equipmentId: EquipmentId): boolean {
  const hero = world.entities.find((entity) => entity.id === heroId);
  const item = EQUIPMENT[equipmentId];
  if (!hero || hero.kind !== 'hero' || !hero.alive || !item) return false;
  if (hero.inventory.includes(equipmentId) || hero.inventory.length >= 3 || hero.gold < item.cost) return false;

  recordWalletTransaction(world, hero, -item.cost, 'equipment-purchase', hero.id);
  hero.inventory.push(equipmentId);
  hero.attackDamage += item.attackDamage;
  hero.magicPower += item.magicPower;
  hero.maxHp += item.maxHp;
  hero.hp = Math.min(hero.maxHp, hero.hp + item.maxHp);
  hero.armor += item.armor;
  hero.resistance += item.resistance;
  hero.moveSpeed += item.moveSpeed;
  addEvent(world, {
    type: 'item-purchased', sourceId: hero.id, recipientId: hero.id,
    amount: item.cost, balanceAfter: hero.gold, team: hero.team as Team, detail: equipmentId,
  });
  return true;
}
