export const FIXED_STEP_SECONDS = 0.05;
export const TICKS_PER_SECOND = 20;
export const WAVE_INTERVAL_TICKS = 500;
export const MAX_HERO_LEVEL = 10;

export type Team = 'blue' | 'red';
export type Faction = Team | 'neutral';
export type UnitKind = 'hero' | 'minion' | 'monster' | 'tower' | 'crystal';
export type DamageType = 'physical' | 'magic';
export type HeroRole = 'vanguard' | 'ranger' | 'arcanist' | 'duelist' | 'guardian';
export type HeroBehavior = 'push' | 'farm' | 'retreat' | 'heal';
export type MinionType = 'melee' | 'ranged';
export type MonsterType = 'sentinel' | 'brute';
export type EquipmentId = 'ember-blade' | 'gale-fang' | 'star-core' | 'moon-prism' | 'tide-ward' | 'bastion-plate';
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
  | 'ai-state-changed';

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
  assists: number;
  inventory: EquipmentId[];
  alive: boolean;
  respawnTicks: number;
  respawnDurationTicks: number;
  bountyGold: number;
  bountyExperience: number;
  critChance: number;
  aggroRange: number;
}

export interface SimEvent {
  tick: number;
  type: SimEventType;
  sourceId?: string;
  targetId?: string;
  amount?: number;
  team?: Team;
  detail?: string;
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
  passiveGoldIntervalTicks: 20,
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

const HERO_LANE_OFFSETS = [-2, -1, 0, 1, 2] as const;
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

function addEvent(world: Simulation, event: Omit<SimEvent, 'tick'>): void {
  world.events.push({ tick: world.tick, ...event });
}

function nextRandom(world: Simulation): number {
  let value = world.rngState >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  world.rngState = value >>> 0;
  return world.rngState / 0x100000000;
}

function createHero(team: Team, template: HeroTemplate, index: number): SimEntity {
  const spawnX = team === 'blue' ? -10.8 : 10.8;
  return {
    id: team + '-hero-' + template.role,
    name: team + ' ' + template.name,
    kind: 'hero',
    team,
    role: template.role,
    aiState: 'push',
    position: { x: spawnX, y: HERO_LANE_OFFSETS[index] },
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
    moveSpeed: template.moveSpeed,
    level: 1,
    experience: 0,
    gold: 320,
    kills: 0,
    deaths: 0,
    assists: 0,
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

function createTower(team: Team, index: number, x: number): SimEntity {
  return {
    id: team + '-tower-' + index,
    name: team + ' ' + (index === 1 ? 'Outer' : 'Inner') + ' Tower',
    kind: 'tower',
    team,
    towerIndex: index,
    position: { x, y: 0 },
    hp: 1050,
    maxHp: 1050,
    armor: 38,
    resistance: 24,
    attackDamage: 44,
    magicPower: 0,
    damageType: 'physical',
    attackRange: 5.8,
    attackCooldownTicks: 24,
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
    bountyGold: 120,
    bountyExperience: 100,
    critChance: 0,
    aggroRange: 5.8,
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

export function createSimulation(seed = 1): Simulation {
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
  };

  for (const team of ['blue', 'red'] as const) {
    HERO_TEMPLATES.forEach((template, index) => {
      world.entities.push(createHero(team, template, index));
    });
  }

  // Outer towers guard the lane nearer the river; inner towers protect each base.
  world.entities.push(createTower('blue', 1, -4));
  world.entities.push(createTower('blue', 2, -8));
  world.entities.push(createTower('red', 1, 4));
  world.entities.push(createTower('red', 2, 8));
  world.entities.push(createCrystal('blue'));
  world.entities.push(createCrystal('red'));
  world.entities.push(createMonster('sentinel'));
  world.entities.push(createMonster('brute'));

  return world;
}

function createMinion(team: Team, type: MinionType, wave: number, index: number): SimEntity {
  const melee = type === 'melee';
  const spawnX = team === 'blue' ? -10.2 : 10.2;
  const y = melee ? (index - 1) * 0.55 : (index === 0 ? -1.45 : 1.45);
  return {
    id: team + '-minion-' + wave + '-' + type + '-' + index,
    name: team + ' ' + type + ' minion ' + wave + '.' + (index + 1),
    kind: 'minion',
    team,
    minionType: type,
    position: { x: spawnX, y },
    hp: melee ? 230 : 160,
    maxHp: melee ? 230 : 160,
    armor: melee ? 10 : 5,
    resistance: melee ? 7 : 10,
    attackDamage: melee ? 23 : 0,
    magicPower: melee ? 0 : 25,
    damageType: melee ? 'physical' : 'magic',
    attackRange: melee ? 1.35 : 4.4,
    attackCooldownTicks: melee ? 20 : 25,
    cooldownRemaining: 0,
    moveSpeed: melee ? 1.75 : 1.55,
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
    bountyGold: melee ? 18 : 22,
    bountyExperience: melee ? 24 : 28,
    critChance: 0,
    aggroRange: 4.8,
  };
}

function spawnWave(world: Simulation): void {
  world.waveCount += 1;
  for (const team of ['blue', 'red'] as const) {
    for (let index = 0; index < 3; index += 1) {
      world.entities.push(createMinion(team, 'melee', world.waveCount, index));
    }
    for (let index = 0; index < 2; index += 1) {
      world.entities.push(createMinion(team, 'ranged', world.waveCount, index));
    }
    addEvent(world, { type: 'wave-spawned', team, amount: 5, detail: 'wave-' + world.waveCount });
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
  const towers = world.entities
    .filter((entity) => entity.kind === 'tower' && entity.team === enemy && entity.alive)
    .sort((a, b) => (a.towerIndex ?? 0) - (b.towerIndex ?? 0));
  if (towers.length > 0) return towers[0];
  return world.entities.find((entity) => entity.kind === 'crystal' && entity.team === enemy && entity.alive) ?? null;
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
    // Ignore a cross-team near-tie within one melee-minion fixed-step movement (1.75 * 0.05).
    if (rankedPrey.some((entry) => entry.entity.team !== nearest.entity.team && entry.range - nearest.range <= 0.0875)) return null;
    return nearest.entity;
  }

  const enemy = oppositeTeam(actor.team);
  const alive = world.entities.filter((entity) => entity.alive && entity.team === enemy);

  if (actor.kind === 'tower') {
    const minions = alive.filter((entity) => entity.kind === 'minion');
    const minionTarget = nearestEntity(actor, minions, actor.attackRange);
    if (minionTarget) return minionTarget;
    const heroes = alive.filter((entity) => entity.kind === 'hero');
    return nearestEntity(actor, heroes, actor.attackRange);
  }

  if (actor.kind === 'hero') {
    const heroes = alive.filter((entity) => entity.kind === 'hero');
    const heroTarget = nearestEntity(actor, heroes, VISION_RANGE);
    if (heroTarget) return heroTarget;
    const minions = alive.filter((entity) => entity.kind === 'minion');
    const minionTarget = nearestEntity(actor, minions, VISION_RANGE);
    if (minionTarget) return minionTarget;
    const monsters = world.entities.filter((entity) => entity.alive && entity.team === 'neutral' && entity.kind === 'monster');
    const monsterTarget = nearestEntity(actor, monsters, 4.6);
    if (monsterTarget) return monsterTarget;
    return findStructureTarget(world, actor);
  }

  if (actor.kind === 'minion') {
    const minions = alive.filter((entity) => entity.kind === 'minion');
    const minionTarget = nearestEntity(actor, minions, actor.aggroRange);
    if (minionTarget) return minionTarget;
    const structure = findStructureTarget(world, actor);
    // Once a minion reaches its structure's lane pocket, it stays on the siege target
    // instead of being pulled away by a nearby defending hero.
    if (structure && distance(actor.position, structure.position) <= actor.aggroRange) return structure;
    const heroes = alive.filter((entity) => entity.kind === 'hero');
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

function killEntity(world: Simulation, attacker: SimEntity, target: SimEntity): void {
  if (!target.alive) return;
  target.alive = false;
  target.hp = 0;

  if (target.kind === 'hero') {
    target.deaths += 1;
    target.respawnTicks = target.respawnDurationTicks;
  } else if (target.kind === 'monster') {
    target.respawnTicks = target.respawnDurationTicks;
  }

  if (attacker.kind === 'hero' && attacker.team !== target.team) {
    if (target.kind === 'hero') attacker.kills += 1;
    attacker.gold += target.bountyGold;
    gainExperience(world, attacker, target.bountyExperience);
  }

  if (target.kind === 'tower') {
    addEvent(world, { type: 'tower-destroyed', sourceId: attacker.id, targetId: target.id, team: attacker.team as Team });
  }

  addEvent(world, { type: 'unit-died', sourceId: attacker.id, targetId: target.id, amount: target.bountyGold });

  if (target.kind === 'crystal' && attacker.team !== 'neutral') {
    world.winner = attacker.team;
    world.endReason = 'crystal-destroyed';
    addEvent(world, { type: 'crystal-destroyed', sourceId: attacker.id, targetId: target.id, team: attacker.team });
  }
}

function performAttack(world: Simulation, attacker: SimEntity, target: SimEntity): void {
  let amount = calculateDamage(attacker, target);
  let critical = false;
  if (attacker.kind === 'hero' && attacker.critChance > 0 && nextRandom(world) < attacker.critChance) {
    amount = Math.round(amount * 1.5);
    critical = true;
  }

  attacker.cooldownRemaining = attacker.attackCooldownTicks;
  target.hp = Math.max(0, target.hp - amount);
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
  const enemy = oppositeTeam(hero.team as Team);
  const enemyHeroes = world.entities
    .filter((entity) => entity.alive && entity.team === enemy && entity.kind === 'hero')
    .map((entity) => ({ entity, range: distance(hero.position, entity.position) }))
    // Execute local threats, and intercept wounded heroes that have crossed onto our half.
    .filter((entry) =>
      (entry.range <= AI_RULES.minionSearchRange ||
        (hero.team === 'blue' ? entry.entity.position.x < 0 : entry.entity.position.x > 0)) &&
      entry.entity.hp / entry.entity.maxHp <= AI_RULES.lowHealthEnemyHeroRatio
    )
    .sort((a, b) => a.entity.hp - b.entity.hp || a.range - b.range || (a.entity.id < b.entity.id ? -1 : a.entity.id > b.entity.id ? 1 : 0));
  if (enemyHeroes.length > 0) return enemyHeroes[0].entity;

  const enemyMinions = world.entities.filter((entity) =>
    entity.alive && entity.team === enemy && entity.kind === 'minion'
  );
  const minionTarget = nearestEntity(hero, enemyMinions, AI_RULES.minionSearchRange);
  if (minionTarget) return minionTarget;

  // The escorted structure takes priority over optional jungle farming. The minion
  // inside tower range is the explicit tanking window that authorizes hero damage.
  const structure = findStructureTarget(world, hero);
  if (structure?.kind === 'tower') {
    return hasFriendlyMinionInTowerRange(world, hero, structure) ? structure : null;
  }
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
      distance(hero.position, entity.position) <= 8
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
      entity.position = {
        x: entity.team === 'blue' ? -10.8 : 10.8,
        y: entity.role ? HERO_LANE_OFFSETS[HERO_TEMPLATES.findIndex((template) => template.role === entity.role)] ?? 0 : 0,
      };
      addEvent(world, { type: 'hero-respawned', sourceId: entity.id, team: entity.team });
    } else if (entity.kind === 'monster') {
      entity.position = entity.monsterType === 'sentinel' ? { x: 0, y: -3.4 } : { x: 0, y: 3.4 };
      addEvent(world, { type: 'monster-respawned', sourceId: entity.id });
    }
  }
}

export function stepSimulation(world: Simulation, steps = 1): Simulation {
  if (!Number.isInteger(steps) || steps < 0) {
    throw new RangeError('steps must be a non-negative integer');
  }

  for (let step = 0; step < steps; step += 1) {
    if (world.winner !== null) break;
    if (world.tick % WAVE_INTERVAL_TICKS === 0) spawnWave(world);
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
    world.tick += 1;
    if (world.tick % AI_RULES.passiveGoldIntervalTicks === 0) {
      for (const hero of world.entities) {
        if (hero.kind !== 'hero' || !hero.alive) continue;
        hero.gold += AI_RULES.passiveGoldAmount;
        addEvent(world, {
          type: 'passive-gold', sourceId: hero.id, team: hero.team as Team,
          amount: AI_RULES.passiveGoldAmount, detail: 'every-20-ticks',
        });
      }
    }
  }
  return world;
}

export function purchaseEquipment(world: Simulation, heroId: string, equipmentId: EquipmentId): boolean {
  const hero = world.entities.find((entity) => entity.id === heroId);
  const item = EQUIPMENT[equipmentId];
  if (!hero || hero.kind !== 'hero' || !hero.alive || !item) return false;
  if (hero.inventory.includes(equipmentId) || hero.inventory.length >= 3 || hero.gold < item.cost) return false;

  hero.gold -= item.cost;
  hero.inventory.push(equipmentId);
  hero.attackDamage += item.attackDamage;
  hero.magicPower += item.magicPower;
  hero.maxHp += item.maxHp;
  hero.hp = Math.min(hero.maxHp, hero.hp + item.maxHp);
  hero.armor += item.armor;
  hero.resistance += item.resistance;
  hero.moveSpeed += item.moveSpeed;
  addEvent(world, { type: 'item-purchased', sourceId: hero.id, amount: item.cost, team: hero.team as Team, detail: equipmentId });
  return true;
}
