// Developer tool: capture review screenshots into docs/shots/. Usage: node tests/tools-shots.mjs [names...]
// One browser context at a time (software WebGL is slow when several pages animate at once).
import path from 'node:path';
import { ROOT, serveDist, launch, openGame, startFrozen } from './browser-harness.mjs';
const want = new Set(process.argv.slice(2)), on = n => !want.size || want.has(n), out = n => path.join(ROOT, 'docs', 'shots', n + '.png');
const { browser, skip } = await launch(); if (skip) { console.error(skip); process.exit(1); }
const server = await serveDist(), T0 = Date.now();
async function shot(name, { view = {}, start = null, pre = null, file = name } = {}) {
  if (!on(name)) return;
  const { context, page, errors } = await openGame(browser, server.url, view);
  try {
    if (start) await startFrozen(page, start);
    if (pre) await pre(page);
    await page.screenshot({ path: out(file) });
    const info = await page.evaluate(() => { const r = window.__starfall.renderer; return r ? { is3D: !!r.is3D, pitch: r.pitchDegrees, hero: r.heroScreenFraction?.(), tris: r.triangles, draws: r.stats?.drawCalls } : null; });
    console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s] ${file}`, JSON.stringify({ errors, info }));
  } finally { await context.close(); }
}
const tp = (x, y) => `const s = window.__starfall, w = s.world, p = w.player; p.x = ${x}; p.y = ${y};`;
try {
  await shot('01-title');
  await shot('02-select', { pre: async p => { await p.evaluate(() => window.__starfall.select()); await p.waitForTimeout(900); } });
  await shot('03-spawn', { start: { heroId: 'fighter', seconds: 2 } });
  await shot('05-river', { start: { heroId: 'mage', seconds: 1 }, pre: p => p.evaluate(`${tp(-6, -9)} w.command({ type: 'cast', slot: 0, x: 4, y: -9 }); s.advance(.3, 2);`) });
  await shot('06-jungle', { start: { heroId: 'assassin', seconds: 30 }, pre: p => p.evaluate(`${tp(-20.5, 4.5)} s.advance(.1, 2);`) });
  await shot('07-fight', { start: { heroId: 'fighter', seconds: 62 }, pre: p => p.evaluate(`${tp(0, 0)} const m = w.entities.filter(e => e.type === 'minion' && e.lane === 'top' && e.team === 'red' && e.alive)[0]; if (m) { p.x = m.x - 1.8; p.y = m.y + 1.2; } p.level = 4; p.skillLevels = [2, 1, 1]; w.command({ type: 'cast', slot: 0, x: m?.x, y: m?.y }); s.advance(.25, 2); w.command({ type: 'attack' }); s.advance(.12, 2);`) });
  await shot('08-dead', { start: { heroId: 'fighter', seconds: 40 }, pre: p => p.evaluate(`${tp(0, 0)} const k = w.entities.find(e => e.type === 'hero' && e.team === 'red' && e.heroId === 'mage'); k.x = 3; k.y = 0; w._damage(k, p, 99999, 'true', 'skill'); s.advance(.4, 2);`) });
  await shot('09-phone-landscape', { view: { width: 844, height: 390, touch: true }, start: { heroId: 'fighter', seconds: 45 }, pre: p => p.evaluate(`${tp(-50, 20)} s.advance(.1, 2);`) });
  await shot('10-phone-squarish', { view: { width: 720, height: 680, touch: true }, start: { heroId: 'fighter', seconds: 2 } });
  await shot('11-canvas2d-fallback', { view: { query: '?renderer=2d' }, start: { heroId: 'fighter', seconds: 2 } });
  await shot('12-tower', { start: { heroId: 'fighter', seconds: 20 }, pre: p => p.evaluate(`${tp(-50, -19)} s.advance(.1, 2);`) });
} finally { await browser.close(); await server.close(); }
