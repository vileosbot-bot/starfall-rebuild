// Pure HUD text helpers (no DOM): objective banner, wave countdown, death and kill banners.
import { MAP } from './sim.js';

export const LANE_NAMES = { top: '上路', mid: '中路', bot: '下路', jungle: '野区' };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function laneDistance(p, lane) {
  const pts = MAP.lanes[lane]; let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t));
  }
  return best;
}
/** "6秒" style countdown to the next minion wave, shown under the score bar. */
export function waveCountdown(world) { return `${Math.max(0, Math.ceil((world.nextWaveIn ?? 0) - 1e-6))}秒`; }

/** Text for the "当前目标" banner. */
export function objectiveText(world) {
  const p = world.player; if (!p) return '';
  const lane = p.lane === 'jungle' ? 'mid' : p.lane, name = LANE_NAMES[lane] || '中路', enemy = p.team === 'blue' ? 'red' : 'blue';
  if (world.winner) return world.winner === p.team ? '胜利！敌方水晶已摧毁' : '我方水晶被摧毁';
  if (!p.alive) return '等待复活，先看看装备';
  if (p.recallTimer > 0) return '回城中，别动';
  if (p.hp / p.maxHp < .3) return '血量偏低，回城补给再出发';
  const towers = world.entities.filter(e => e.type === 'tower');
  const enemyCore = world.entities.find(e => e.type === 'core' && e.team === enemy), ownCore = world.entities.find(e => e.type === 'core' && e.team === p.team);
  if (ownCore && world.entities.some(e => e.type === 'hero' && e.team === enemy && e.alive && dist(e, ownCore) < 16) && ['top', 'mid', 'bot'].some(l => !towers.some(t => t.team === p.team && t.lane === l && t.tier === 3 && t.alive))) return '敌人打到家了，回防我方水晶';
  if (enemyCore && ['top', 'mid', 'bot'].some(l => !towers.some(t => t.team === enemy && t.lane === l && t.tier === 3 && t.alive))) return '敌方高地已破，跟著小兵拆水晶';
  if (world.wave === 0) {
    const n = Math.max(0, Math.ceil((world.nextWaveIn ?? 0) - 1e-6));
    return p.lane === 'jungle' ? `小兵 ${n} 秒后出发，先去野区打野怪` : `小兵 ${n} 秒后出发，先去${name}一塔等着`;
  }
  if (p.lane === 'jungle' && world.time < 390) {
    const camp = (world.camps || []).some(c => c.side === p.team && c.alive);
    if (camp) return '清理我方野区的野怪，再去支援中路';
  }
  if (laneDistance(p, lane) > 13) return `回到${name}，跟著小兵打`;
  const next = towers.filter(t => t.team === enemy && t.lane === lane && t.alive).sort((a, b) => a.tier - b.tier)[0];
  if (!next) return `${name}已打通，跟著小兵拆水晶`;
  return `跟著小兵推掉敌方${name}${next.tier === 3 ? '高地塔' : ['一', '二'][next.tier - 1] + '塔'}`;
}

/** Who killed the player most recently: { killer, first } from the event log, or null. */
export function lastDeath(world) {
  const p = world.player;
  for (let i = world.events.length - 1; i >= 0; i--) {
    const e = world.events[i];
    if (e.type === 'kill' && e.victimId === p.id) return { killer: e.killerId != null ? world.getEntity(e.killerId) : null, first: !!e.firstBlood, time: e.time };
  }
  return null;
}
export function deathLines(world) {
  const d = lastDeath(world), k = d?.killer;
  return {
    banner: k ? `敌方${k.name} 击杀了你` : '你被防御塔或野怪击杀',
    killer: k ? `击杀者 敌方 ${k.name} ${k.role} Lv.${k.level}` : '击杀者 防御塔 / 野怪',
    first: !!d?.first, killerHeroId: k?.heroId || null
  };
}
/** Banner text for a kill event from the player's point of view. */
export function killBanner(world, e) {
  const p = world.player, killer = e.killerId != null ? world.getEntity(e.killerId) : null, victim = world.getEntity(e.victimId);
  if (!victim) return null;
  const mine = killer && killer.team === p.team, side = t => t === p.team ? '我方' : '敌方';
  const text = victim.id === p.id ? (killer ? `敌方${killer.name} 击杀了你` : '你已阵亡') : killer?.id === p.id ? `你 击杀了 敌方${victim.name}` : killer ? `${side(killer.team)}${killer.name} 击杀了 ${side(victim.team)}${victim.name}` : `${side(victim.team)}${victim.name} 阵亡`;
  return { text, tone: mine ? 'ally' : 'enemy', first: !!e.firstBlood, killerHeroId: killer?.heroId || null, victimHeroId: victim.heroId || null };
}
