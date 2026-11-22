// Square minimap drawn with Canvas2D. Shared by the WebGL2 and the Canvas2D renderer.
// Layout follows the original: near-black navy ground, green jungle, a diagonal blue river,
// sand-coloured lanes, grey wall outlines, camp dots with respawn timers, square towers,
// round heroes (own team with a white rim), tiny minion dots and diamond crystals.
import { MAP } from './sim.js';

const TAU = Math.PI * 2, B = Number(MAP.bound || 57.5);
const COLORS = { blue: '#3f9bff', red: '#f0483e', neutral: '#e2b53e' };
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let cache = null;

export function mapToMini(x, y, size) { return { x: (x + B) / (2 * B) * size, y: (y + B) / (2 * B) * size }; }
export function miniToMap(px, py, size) { return { x: Math.max(-B, Math.min(B, px / size * 2 * B - B)), y: Math.max(-B, Math.min(B, py / size * 2 * B - B)) }; }

function terrain(size) {
  if (cache?.size === size) return cache.canvas;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const c = canvas.getContext('2d'), k = size / (2 * B), X = v => (v + B) * k;
  const path = (pts, close) => { c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](X(p.x), X(p.y))); if (close) c.closePath(); };
  c.fillStyle = '#070b18'; c.fillRect(0, 0, size, size);
  c.fillStyle = '#1f5a2c'; c.fillRect(X(-B + 1.5), X(-B + 1.5), (2 * B - 3) * k, (2 * B - 3) * k); // jungle
  c.fillStyle = '#2a6f33'; for (const b of MAP.bushes || []) { path(b, true); c.fill(); }
  c.lineCap = c.lineJoin = 'round';
  c.strokeStyle = '#2f8fd6'; c.lineWidth = (MAP.riverWidth || 10.6) * .8 * k; path([{ x: -46, y: -46 }, { x: 46, y: 46 }]); c.stroke(); // river
  c.strokeStyle = '#59b7ee'; c.lineWidth = Math.max(1, 1.2 * k); c.setLineDash([3 * k, 5 * k]); path([{ x: -44, y: -44 }, { x: 44, y: 44 }]); c.stroke(); c.setLineDash([]);
  c.strokeStyle = '#d9c38a'; c.lineWidth = 6.4 * k; for (const lane of Object.values(MAP.lanes)) { path(lane); c.stroke(); } // lanes
  c.strokeStyle = '#c4ad76'; c.lineWidth = Math.max(.6, .5 * k); for (const lane of Object.values(MAP.lanes)) { path(lane); c.stroke(); }
  for (const team of ['blue', 'red']) { const f = MAP.fountains[team], o = MAP.cores[team]; c.fillStyle = '#b9b3a2'; c.beginPath(); c.arc(X(o.x), X(o.y), 8.5 * k, 0, TAU); c.fill(); c.beginPath(); c.arc(X(f.x), X(f.y), 6.2 * k, 0, TAU); c.fill(); c.strokeStyle = COLORS[team]; c.lineWidth = Math.max(1, .9 * k); c.beginPath(); c.arc(X(f.x), X(f.y), 4.2 * k, 0, TAU); c.stroke(); }
  c.fillStyle = '#4d5560'; c.strokeStyle = '#9aa3ad'; c.lineWidth = Math.max(.8, .55 * k); for (const w of MAP.walls || []) { path(w, true); c.fill(); c.stroke(); } // stone walls
  cache = { size, canvas }; return canvas;
}

export function drawMinimap(canvas, world, renderer) {
  if (!canvas || !world) return;
  const size = canvas.width, c = canvas.getContext('2d'), k = size / (2 * B), X = v => (v + B) * k, team = world.player?.team || 'blue', u = size / 220;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(terrain(size), 0, 0);
  // jungle camps: dot while alive, hollow dot + countdown while waiting to (re)spawn
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const camp of world.camps || []) {
    const x = X(camp.x), y = X(camp.y), boss = camp.side === 'neutral', r = (boss ? 3.6 : 2.2) * u;
    c.beginPath(); c.arc(x, y, r, 0, TAU);
    if (camp.alive) { c.fillStyle = boss ? '#ffcf4a' : '#d9a441'; c.fill(); c.strokeStyle = '#3a2a10'; c.lineWidth = u; c.stroke(); }
    else { c.strokeStyle = boss ? '#ffcf4a' : '#a88a4a'; c.lineWidth = 1.2 * u; c.stroke(); }
    if (boss && !camp.alive && camp.respawnIn > 0) { c.font = `700 ${Math.round(11 * u)}px system-ui,sans-serif`; c.lineWidth = 3 * u; c.strokeStyle = 'rgba(4,8,18,.9)'; c.strokeText(mmss(camp.respawnIn), x, y - 9 * u); c.fillStyle = '#ffe9a6'; c.fillText(mmss(camp.respawnIn), x, y - 9 * u); }
  }
  const order = { minion: 0, monster: 0, tower: 1, core: 2, hero: 3 };
  const list = (world.entities || []).filter(e => e.alive !== false && e.type !== 'monster' && (e.team === team || (e.visibleTo?.[team] !== false && !(e.invisibleTimer > 0)) || e.type === 'tower' || e.type === 'core')).sort((a, b) => order[a.type] - order[b.type] || (a === world.player) - (b === world.player));
  for (const e of list) {
    const x = X(e.x), y = X(e.y), col = COLORS[e.team] || COLORS.neutral;
    if (e.type === 'minion') { c.fillStyle = col; c.beginPath(); c.arc(x, y, 1.5 * u, 0, TAU); c.fill(); }
    else if (e.type === 'tower') { const r = 3.4 * u; c.fillStyle = col; c.fillRect(x - r, y - r, r * 2, r * 2); c.strokeStyle = '#0a0f1c'; c.lineWidth = u; c.strokeRect(x - r, y - r, r * 2, r * 2); }
    else if (e.type === 'core') { const r = 6.5 * u; c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .8, y); c.lineTo(x, y + r); c.lineTo(x - r * .8, y); c.closePath(); c.fill(); c.strokeStyle = '#fff3c4'; c.lineWidth = 1.2 * u; c.stroke(); }
    else if (e.type === 'hero') {
      const me = e === world.player, r = (me ? 5.2 : 4.2) * u; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill();
      c.lineWidth = (me ? 2 : 1.3) * u; c.strokeStyle = e.team === team ? '#ffffff' : '#2a0c0a'; c.stroke();
      if (me) { c.beginPath(); c.arc(x, y, r + 3 * u, 0, TAU); c.strokeStyle = 'rgba(120,255,140,.9)'; c.lineWidth = 1.2 * u; c.stroke(); }
    }
  }
  // camera footprint
  const corners = renderer?.viewCorners?.();
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.2 * u;
  if (corners) { c.beginPath(); corners.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](X(Math.max(-B, Math.min(B, p.x))), X(Math.max(-B, Math.min(B, p.y))))); c.closePath(); c.stroke(); }
  else if (renderer?.camera) { const hx = renderer.width / renderer.scale / 2, hy = renderer.height / (renderer.scale * .72) / 2; c.strokeRect(X(renderer.camera.x - hx), X(renderer.camera.y - hy), hx * 2 * k, hy * 2 * k); }
}
