// Visual regression for the WebGL2 3D edition (brief sections B, C, D).
// Three layers of checks on deterministic, frozen scenes:
//   1. structure  - renderer type, 45 degree camera, hero = 1/10 of the viewport, HUD layout boxes;
//   2. content    - colour statistics of the rendered frame (grass / water / stone / gold) and minimap pixels;
//   3. baselines  - tolerant pixel comparison against tests/visual-baseline/*.png
//                   (regenerate with UPDATE_VISUAL=1 npm test after an intended visual change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, serveDist, launch, openGame, startFrozen, analyse, diffImages } from './browser-harness.mjs';

const BASE = path.join(ROOT, 'tests', 'visual-baseline'), UPDATE = process.env.UPDATE_VISUAL === '1';
const VIEW = { width: 960, height: 540 };

test('visual regression: title, hero select, 3D battlefield, HUD, minimap, death screen, 2D fallback', async t => {
  const { browser, skip } = await launch(); if (skip) { t.skip(skip); return; }
  const server = await serveDist();
  try {
    const { context, page, errors } = await openGame(browser, server.url, VIEW);
    const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const box = sel => page.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, cx: b.left + b.width / 2, cy: b.top + b.height / 2 }; }, sel);
    async function baseline(name) {
      await settle(); const shot = await page.screenshot(), file = path.join(BASE, name + '.png');
      if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, shot); t.diagnostic(`baseline written: ${name}.png`); return shot; }
      const d = await diffImages(page, shot, fs.readFileSync(file));
      t.diagnostic(`${name}: mean diff ${d.mean}, changed pixels ${(d.bad * 100).toFixed(2)}%`);
      assert.ok(!d.sizeMismatch, `${name}: size changed ${JSON.stringify(d)}`);
      assert.ok(d.mean < 6 && d.bad < .05, `${name} drifted from its baseline: ${JSON.stringify(d)} (UPDATE_VISUAL=1 to accept)`);
      return shot;
    }

    // ---- title page: navy starfield, gold serif title -----------------------------------------
    await page.evaluate(() => window.__starfall.freeze(true));
    const title = await analyse(page, await baseline('title'));
    assert.ok(title.dark > .6, `title page is a dark night sky (${title.dark})`);
    assert.ok(title.gold > .01, `gold title and button present (${title.gold})`);
    const titleFont = await page.evaluate(() => getComputedStyle(document.querySelector('.game-title')).fontFamily);
    assert.match(titleFont, /Serif|Song|SimSun/i, 'title uses a Songti/serif face');
    assert.equal(await page.evaluate(() => document.querySelectorAll('.obelisk').length), 2);

    // ---- hero select: five cards left, 3D hero on the pedestal, skill/stat panel right ---------
    await page.evaluate(() => { window.__starfall.select(); });
    await page.waitForFunction(() => !!window.__starfall.stage, null, { timeout: 30000 });
    await page.evaluate(() => { const s = window.__starfall.stage; s.setHero('fighter'); s.clock = 1; });
    await settle();
    const stage = await box('#hero-stage-canvas'), roster = await box('#roster'), detail = await box('#hero-detail');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#roster .hero-card').length), 5);
    assert.ok(roster.cx < stage.cx && stage.cx < detail.cx, 'roster | stage | detail from left to right');
    assert.deepEqual(await page.evaluate(() => [document.querySelector('#stage-name').textContent, document.querySelector('#stage-role').textContent]), ['程咬金', '战士']);
    assert.match(await page.evaluate(() => document.querySelector('#hero-detail').textContent), /拦腰一斧.*冷却 6\.5~5 秒.*消耗 40~60.*距离 5\.5 米.*220\/275\/330\/385\/440\/495\(\+80%物攻\).*生命3450.*法力430.*物攻172.*攻速0\.90.*护甲104.*魔抗55/s);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-difficulty]')].map(b => b.textContent)), ['简单', '普通', '困难']);
    const selectShot = await baseline('select');
    const pedestal = await analyse(page, selectShot, { x: Math.round(stage.x), y: Math.round(stage.y + stage.h * .25), w: Math.round(stage.w), h: Math.round(stage.h * .75) });
    assert.ok(pedestal.gold > .01, `hero stage shows the gold-rimmed pedestal and armour (${pedestal.gold})`);

    // ---- battlefield at the spawn: WebGL2, 45 degrees, hero = 1/10, HUD layout -------------------
    await startFrozen(page, { heroId: 'fighter', seed: 1122, seconds: 2, clock: 1.5 });
    const cam = await page.evaluate(() => { const r = window.__starfall.renderer, w = window.__starfall.world, p = w.player, a = r.worldToScreen(p.x, p.y), b = r.worldToScreen(p.x + 1, p.y), c = r.worldToScreen(p.x, p.y - 1), d = r.worldToScreen(p.x, p.y - 6), e = r.worldToScreen(p.x + 1, p.y - 6);
      return { kind: document.querySelector('#battle').dataset.renderer, is3D: !!r.is3D, pitch: r.pitchDegrees, hero: r.heroScreenFraction(), back: r.screenToWorld(a.x, a.y), p: { x: p.x, y: p.y }, a, unitNear: b.x - a.x, unitFar: e.x - d.x, up: a.y - c.y, h: innerHeight, w: innerWidth, tris: r.triangles }; });
    assert.equal(cam.kind, 'webgl2'); assert.equal(cam.is3D, true);
    assert.ok(Math.abs(cam.pitch - 45) < .01, `camera elevation is 45 degrees (${cam.pitch})`);
    assert.ok(Math.abs(cam.hero - 1 / 10) < .01, `hero covers 1/10 of the viewport height (${cam.hero})`);
    assert.ok(Math.abs(cam.a.x - cam.w / 2) < 3 && Math.abs(cam.a.y - cam.h / 2) < cam.h * .12, 'camera follows the hero');
    // 1/10 camera (approved 2026-11-22): pulling the camera back weakens perspective
    // convergence vs the 1/6 camera (measured ratio 0.867 in the frozen scene, was < 0.82).
    // 0.90 still catches a flat/orthographic view (ratio 1.0).
    assert.ok(cam.unitFar < cam.unitNear * .90, `ground converges with distance (${cam.unitNear.toFixed(1)} -> ${cam.unitFar.toFixed(1)} px per unit)`);
    assert.ok(cam.up > 0 && cam.up < cam.unitNear, 'north is up-screen and foreshortened by the tilt');
    assert.ok(Math.hypot(cam.back.x - cam.p.x, cam.back.y - cam.p.y) < .35, 'screenToWorld inverts worldToScreen');
    const spawnShot = await baseline('spawn'), spawn = await analyse(page, spawnShot);
    assert.ok(spawn.stone > .15, `grey stone dais and paving dominate the spawn (${spawn.stone})`);
    assert.ok(spawn.gold > .004 && spawn.water > .01, `gold ring and blue crystal/ring visible (${spawn.gold}, ${spawn.water})`);

    const mini = await box('#minimap'), bag = await box('#shop-bag'), score = await box('#scorebar'), card = await box('#hero-card'), stick = await box('#joystick'), cluster = await box('#skill-controls'), top = await box('.hud-top-right'), objective = await box('#objective');
    assert.ok(Math.abs(mini.w - mini.h) < 1.5, 'minimap is square'); assert.ok(mini.x < 30 && mini.y < 30, 'minimap sits top-left');
    assert.ok(mini.w / VIEW.width > .17 && mini.w / VIEW.width < .23, `minimap is about 1/5 of the width (${(mini.w / VIEW.width).toFixed(3)})`);
    const miniStyle = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('#minimap')); return { radius: parseFloat(s.borderTopLeftRadius), border: s.borderTopColor, bw: parseFloat(s.borderTopWidth), transform: s.transform }; });
    assert.ok(miniStyle.radius >= 6 && miniStyle.bw <= 2 && miniStyle.transform === 'none', 'rounded, thin frame, not rotated into a diamond');
    assert.equal(miniStyle.border, 'rgb(226, 182, 78)', 'gold frame');
    assert.ok(bag.y >= mini.y + mini.h && bag.x < mini.x + mini.w, 'money-bag shop button hangs below the minimap');
    assert.ok(Math.abs(score.cx - VIEW.width / 2) < 4 && score.y < 20, 'score bar top-centre'); assert.ok(objective.y > score.y + score.h - 2 && Math.abs(objective.cx - VIEW.width / 2) < 4);
    assert.ok(top.x > VIEW.width * .65 && top.y < 20, 'record/gold top-right');
    assert.ok(Math.abs(card.cx - VIEW.width / 2) < 4 && card.y + card.h > VIEW.height - 20, 'hero card bottom-centre');
    assert.ok(stick.cx < VIEW.width * .2 && stick.cy > VIEW.height * .7 && Math.abs(stick.w - stick.h) < 1.5, 'round joystick bottom-left');
    assert.ok(cluster.x + cluster.w > VIEW.width - 30 && cluster.y + cluster.h > VIEW.height - 20, 'skill cluster bottom-right');
    const sk = {}; for (const [k, s] of Object.entries({ attack: '#attack-button', ult: '.sk-skill[data-skill="2"]', flash: '#flash', heal: '#heal', recall: '#recall', move: '.sk-skill[data-skill="1"]', burst: '.sk-skill[data-skill="0"]' })) sk[k] = await box(s + ' .sk-face');
    assert.ok(Object.values(sk).every(b => b.w <= sk.attack.w) && sk.attack.w > sk.ult.w && sk.ult.w > sk.flash.w, 'attack is the largest button, then the ultimate');
    assert.ok(sk.flash.cx > sk.heal.cx && sk.flash.cy < sk.move.cy, 'flash is upper right');
    assert.ok(Math.abs(sk.heal.cx - sk.recall.cx) < 2 && sk.heal.cy < sk.recall.cy, 'heal and recall share the left column');
    assert.ok(sk.attack.cx > sk.burst.cx && sk.attack.cy > sk.move.cy && sk.attack.cy > sk.ult.cy, 'attack is bottom right, below dash and ultimate');
    assert.deepEqual(await page.evaluate(() => ['#flash', '#heal', '#recall', '.sk-skill[data-skill="1"]', '.sk-skill[data-skill="2"]', '.sk-skill[data-skill="0"]'].map(s => document.querySelector(s + ' small').textContent)), ['闪现', '治疗', '回城', '位移', '大招', '爆发']);
    const hud = await page.evaluate(() => ({ time: document.querySelector('#match-time').textContent, wave: document.querySelector('#wave-time').textContent, objective: document.querySelector('#objective').textContent, gold: document.querySelector('#gold').textContent, stats: document.querySelector('.hc-stats').textContent, hp: document.querySelector('#health-text').textContent,
      locked: [...document.querySelectorAll('.sk-skill')].map(b => [b.dataset.skill, b.classList.contains('locked'), getComputedStyle(b.querySelector('.sk-lock')).display]), border: getComputedStyle(document.querySelector('#flash .sk-face')).borderTopColor, round: getComputedStyle(document.querySelector('#flash .sk-face')).borderTopLeftRadius }));
    assert.equal(hud.time, '00:02'); assert.equal(hud.wave, '8秒'); assert.equal(hud.objective, '当前目标小兵 8 秒后出发，先去上路一塔等着');
    assert.match(hud.gold, /^5\d$/, 'starts from 50 gold'); assert.match(hud.stats, /程咬金.*物攻 172.*护甲 104.*魔抗 55.*移速 6\.3/); assert.equal(hud.hp, '3450/3450');
    assert.deepEqual(hud.locked.sort(), [['0', false, 'none'], ['1', true, 'block'], ['2', true, 'block']], 'E and R show the padlock at level 1');
    assert.equal(hud.border, 'rgb(226, 182, 78)'); assert.equal(hud.round, '50%');

    // ---- minimap pixels: navy frame ground, green jungle, blue river, sand lanes, team markers ----
    const mm = await page.evaluate(() => { const c = document.querySelector('#minimap'), g = c.getContext('2d'), S = c.width, at = (x, y) => [...g.getImageData(Math.round((x + 57.5) / 115 * S), Math.round((y + 57.5) / 115 * S), 1, 1).data.slice(0, 3)];
      const d = g.getImageData(0, 0, S, S).data; let red = 0, blue = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 200 && d[i + 1] < 110 && d[i + 2] < 100) red++; if (d[i] < 100 && d[i + 1] > 120 && d[i + 2] > 220) blue++; }
      return { size: S, river: at(-12, -12), lane: at(-52, 0), jungle: at(-30, 36), corner: at(-57.4, -57.4), wall: at(-44, 0), red, blue }; });
    const isBlue = c => c[2] > 150 && c[2] > c[0] * 1.5, isSand = c => c[0] > 170 && c[1] > 150 && c[2] > 90 && c[2] < c[0], isGreen = c => c[1] > c[0] * 1.5 && c[1] > c[2] * 1.3;
    assert.ok(isBlue(mm.river), `river is blue ${mm.river}`); assert.ok(isSand(mm.lane), `lane is sand-coloured ${mm.lane}`); assert.ok(isGreen(mm.jungle), `jungle is green ${mm.jungle}`);
    assert.ok(mm.corner[0] < 40 && mm.corner[1] < 40 && mm.corner[2] < 60, `frame ground is near-black navy ${mm.corner}`);
    assert.ok(Math.abs(mm.wall[0] - mm.wall[1]) < 25 && mm.wall[0] > 50, `walls are grey ${mm.wall}`);
    assert.ok(mm.red > 150 && mm.blue > 150, `red and blue structure/hero markers drawn (${mm.red}, ${mm.blue})`);

    // ---- river scene with a cast: water, lily pads, tall grass and the purple magic circle --------
    await startFrozen(page, { heroId: 'mage', seed: 1122, seconds: 1, clock: 2 });
    const cast = await page.evaluate(() => { const s = window.__starfall, w = s.world, p = w.player; p.x = -6; p.y = -9; const r = w.command({ type: 'cast', slot: 0, x: 4, y: -9 }); s.advance(.3, 2); return { ok: r.ok, circles: s.renderer.circles.map(c => ({ purple: c.purple, life: c.life, r: c.r })), cd: document.querySelector('.sk-skill[data-skill="0"] .cooldown').textContent, cooling: document.querySelector('.sk-skill[data-skill="0"]').classList.contains('on-cooldown') }; });
    assert.equal(cast.ok, true); assert.equal(cast.circles.length, 1, 'one magic circle per cast');
    assert.deepEqual([cast.circles[0].purple, cast.circles[0].life], [true, 1], 'purple variant for the mage, lasting about one second'); assert.ok(cast.circles[0].r >= 3, 'large circle');
    assert.match(cast.cd, /^\d+$/, 'cooldown shows a big countdown number'); assert.equal(cast.cooling, true);
    const river = await analyse(page, await baseline('river'));
    assert.ok(river.water > .12, `bright blue water (${river.water})`); assert.ok(river.green > .12, `grass and tall-grass blades (${river.green})`);

    // ---- death screen -----------------------------------------------------------------------------
    await startFrozen(page, { heroId: 'fighter', seed: 1122, seconds: 40, clock: 2 });
    await page.evaluate(() => { const s = window.__starfall, w = s.world, p = w.player, k = w.entities.find(e => e.type === 'hero' && e.team === 'red' && e.heroId === 'mage'); p.x = 0; p.y = 0; k.x = 3; k.y = 0; w._buildGrid(); w._damage(k, p, 99999, 'true', 'skill'); s.advance(.4, 2); });
    const dead = await page.evaluate(() => ({ shown: !document.querySelector('#respawn').hidden, text: document.querySelector('#respawn').textContent, banner: document.querySelector('#kill-banner').textContent, bannerShown: !document.querySelector('#kill-banner').hidden, faces: document.querySelectorAll('#kill-banner img').length,
      filter: getComputedStyle(document.querySelector('#battlefield')).filter, cluster: document.querySelector('#skill-controls').classList.contains('dead'), bg: getComputedStyle(document.querySelector('#kill-banner')).backgroundImage }));
    assert.equal(dead.shown, true); assert.match(dead.text, /你已阵亡\d+秒后复活击杀者 敌方 王昭君 法师 Lv\.\d+阵亡期间金币照常来，自出装备买买/);
    assert.equal(dead.bannerShown, true); assert.match(dead.banner, /敌方王昭君 击杀了你/); assert.equal(dead.faces, 2, 'both portraits in the banner'); assert.match(dead.bg, /rgba?\(216, 53, 44/, 'red banner');
    assert.match(dead.filter, /grayscale/); assert.equal(dead.cluster, true, 'skill buttons greyed out');
    // central battlefield area only (the minimap and HUD keep their colours)
    const deadShot = await analyse(page, await baseline('dead'), { x: 300, y: 130, w: 360, h: 280 });
    assert.ok(deadShot.grey > .2 && deadShot.green < .01 && deadShot.water < .01, `battlefield colour is washed out while dead (${JSON.stringify(deadShot)})`);
    assert.deepEqual(errors, [], 'no page errors in WebGL2 mode');
    await context.close();

    // ---- Canvas2D fallback keeps working when WebGL2 is not used ---------------------------------
    const f = await openGame(browser, server.url, { ...VIEW, query: '?renderer=2d' });
    await startFrozen(f.page, { heroId: 'fighter', seed: 1122, seconds: 2 });
    const fallback = await f.page.evaluate(() => ({ kind: document.querySelector('#battle').dataset.renderer, is3D: !!window.__starfall.renderer.is3D, overlayHidden: document.querySelector('#battle-overlay').hidden, alive: window.__starfall.world.player.alive }));
    assert.deepEqual(fallback, { kind: 'canvas2d', is3D: false, overlayHidden: true, alive: true });
    const flat = await analyse(f.page, await f.page.screenshot()); assert.ok(flat.green > .15, `2D battlefield renders (${flat.green})`);
    assert.deepEqual(f.errors, [], 'no page errors in Canvas2D mode');
    await f.context.close();
  } finally { await browser.close(); await server.close(); }
});
