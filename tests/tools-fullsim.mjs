// Full-match simulation harness (not a test file: name does not match *.test.mjs).
// Usage: node tests/tools-fullsim.mjs [ai|afk|both] [seed] [heroId] [--trace]
import { World } from '../dist/sim.js';
const mode = process.argv[2] || 'both', seed = Number(process.argv[3] || 1122), heroId = process.argv[4] || 'mage', trace = process.argv.includes('--trace');
export function run(kind, { seed = 1122, heroId = 'mage', difficulty = 'normal', limit = 2400, trace = false } = {}) {
  const w = new World({ heroId, difficulty, seed, demo: kind === 'ai' });
  let peak = 0, seen = 0; const log = [];
  while (!w.winner && w.time < limit) {
    w.step(1 / 30); if (w.entities.length > peak) peak = w.entities.length;
    for (const e of w.events) if (e.id > seen) { seen = e.id; if (e.type === 'tower' || e.type === 'victory') log.push(`${e.time.toFixed(0)}s ${e.text}`); }
  }
  const cores = Object.fromEntries(w.entities.filter(e => e.type === 'core').map(c => [c.team, Math.round(c.hp)]));
  const towers = t => w.entities.filter(e => e.type === 'tower' && e.team === t && !e.alive).length;
  const levels = t => w.entities.filter(e => e.type === 'hero' && e.team === t).map(h => h.level).join('/');
  return { kind, seed, heroId, winner: w.winner, time: +w.time.toFixed(2), mmss: `${Math.floor(w.time / 60)}:${String(Math.floor(w.time % 60)).padStart(2, '0')}`, score: `${w.score.blue}:${w.score.red}`, cores, towersLost: { blue: towers('blue'), red: towers('red') }, levels: { blue: levels('blue'), red: levels('red') }, peak, log: trace ? log : undefined };
}
if (import.meta.url === `file://${process.argv[1]}`) for (const kind of mode === 'both' ? ['ai', 'afk'] : [mode]) console.log(JSON.stringify(run(kind, { seed, heroId, trace })));
