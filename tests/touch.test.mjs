// Multi-touch regression (brief section E): real touch points are injected through CDP
// Input.dispatchTouchEvent, so the browser produces genuine Pointer Events with distinct
// pointerIds. The joystick must keep its finger while other fingers tap the buttons.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serveDist, launch, openGame } from './browser-harness.mjs';

test('multi-touch: joystick held + skill/flash/heal/recall taps work together', async t => {
  const { browser, skip } = await launch(); if (skip) { t.skip(skip); return; }
  const server = await serveDist();
  try {
    const { context, page, errors } = await openGame(browser, server.url, { width: 844, height: 390, touch: true });
    const cdp = await context.newCDPSession(page);
    const active = new Map(); // id -> {x,y}: CDP wants the full list of touching points on start/move
    const send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([id, p]) => ({ id, x: p.x, y: p.y, radiusX: 9, radiusY: 9, force: 1 })) });
    const down = async (id, p) => { active.set(id, p); await send('touchStart', [...active]); };
    const move = async (id, p) => { active.set(id, p); await send('touchMove', [...active]); };
    // Lifting ONE finger: touchEnd that lists exactly the lifted point (verified against Chromium: the other
    // fingers stay down and keep their pointerIds). An empty touchEnd lifts everything.
    const up = async id => { const p = active.get(id); active.delete(id); await send('touchEnd', [[id, p]]); };
    const tap = async (id, p) => { await down(id, p); await page.waitForTimeout(40); await up(id); };
    const centre = sel => page.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
    // software WebGL frames can be slow, so waits are expressed in simulation time, not wall time
    const waitSim = seconds => page.evaluate(() => window.__starfall.world.time).then(t0 => page.waitForFunction(([t, s]) => window.__starfall.world.time >= t + s, [t0, seconds], { timeout: 30000 }));
    const state = () => page.evaluate(() => { const s = window.__starfall, p = s.world.player; return { x: p.x, y: p.y, flash: p.flashCooldown, heal: p.healCooldown, cd: [...p.cooldowns], mp: p.mp, recall: p.recallTimer, stick: s.joystick.pointerId, vec: s.joystick.vector, input: s.input, knob: document.querySelector('#joystick-knob').style.transform, cmds: [...window.__cmds], t: s.world.time }; });

    await page.evaluate(async () => {
      await window.__starfall.start({ heroId: 'fighter', seed: 1122 });
      const w = window.__starfall.world, original = w.command.bind(w); window.__cmds = [];
      w.command = c => { const r = original(c); window.__cmds.push(`${c.type}${c.slot ?? ''}:${r.ok ? 'ok' : 'no'}`); return r; };
    });
    // touch-action must be none on every touch control so the browser never steals the gesture
    const actions = await page.evaluate(() => ['#joystick', '#flash', '#heal', '#recall', '#attack-button', '.sk-skill[data-skill="0"]', '#battlefield', '#minimap'].map(s => getComputedStyle(document.querySelector(s)).touchAction));
    assert.deepEqual([...new Set(actions)], ['none']);

    // 1. finger A holds the joystick towards the lane (up-right on screen)
    const stick = await centre('#joystick'), A = 11, B = 12, before = await state();
    await down(A, stick); await move(A, { x: stick.x + 34, y: stick.y - 34 });
    await waitSim(.7);
    const held = await state();
    assert.notEqual(held.stick, null, 'joystick owns a pointer');
    assert.ok(held.vec.x > .5 && held.vec.y < -.5, `joystick vector ${JSON.stringify(held.vec)}`);
    assert.ok(held.x - before.x > .8 && before.y - held.y > .8, `hero moved with the stick: ${JSON.stringify([before.x, before.y, held.x, held.y])}`);
    assert.match(held.knob, /translate\((?!0(\.0)?px,0(\.0)?px)/, 'knob is offset');

    // 2. finger B taps Flash while A is still down: it must fire at once, along the held direction
    const flashBefore = await state();
    await tap(B, await centre('#flash'));
    const flashed = await state();
    assert.ok(flashed.flash > 100, `flash went on cooldown (${flashed.flash})`);
    assert.ok(flashed.cmds.includes('flash:ok'));
    const jump = Math.hypot(flashed.x - flashBefore.x, flashed.y - flashBefore.y);
    assert.ok(jump > 3.5, `flash displaced the hero by ${jump.toFixed(2)}`);
    assert.ok(flashed.x > flashBefore.x && flashed.y < flashBefore.y, 'flash followed the joystick direction');
    assert.equal(flashed.stick, held.stick, 'joystick kept its pointer during the tap');
    await waitSim(.4);
    const afterFlash = await state();
    assert.ok(afterFlash.x - flashed.x > .4, 'hero keeps walking after the tap');
    assert.ok(afterFlash.vec.x > .5, 'joystick vector intact');

    // 3. heal, skill Q and recall, each with the second finger, joystick still held
    await tap(B, await centre('#heal'));
    const healed = await state(); assert.ok(healed.heal > 50, 'heal fired'); assert.ok(healed.cmds.includes('heal:ok'));
    await tap(B, await centre('.sk-skill[data-skill="0"]'));
    const cast = await state(); assert.ok(cast.cd[0] > 1, `Q went on cooldown (${cast.cd[0]})`); assert.ok(cast.mp < healed.mp + 5 && cast.cmds.includes('cast0:ok'));
    await tap(B, await centre('#recall'));
    const recalled = await state(); assert.ok(recalled.cmds.includes('recall:ok'), 'recall command reached the sim');
    assert.equal(recalled.stick, held.stick);

    // 4. buttons on cooldown / locked do nothing, and never disturb the joystick
    const count = recalled.cmds.filter(c => c === 'flash:ok').length;
    await tap(B, await centre('#flash')); await tap(B, await centre('.sk-skill[data-skill="0"]')); await tap(B, await centre('.sk-skill[data-skill="2"]'));
    await waitSim(.3);
    const blocked = await state();
    assert.equal(blocked.cmds.filter(c => c === 'flash:ok').length, count, 'flash on cooldown did not fire again');
    assert.equal(blocked.cmds.filter(c => c === 'cast0:ok').length, 1, 'Q on cooldown did not fire again');
    assert.ok(!blocked.cmds.some(c => c.startsWith('cast2:ok')), 'locked ultimate did not fire');
    assert.equal(blocked.stick, held.stick); assert.ok(blocked.vec.x > .5 && blocked.x > recalled.x, 'still moving');

    // 5. two extra fingers at once (attack held + another tap) while the joystick stays down
    const attack = await centre('#attack-button'); await down(B, attack); await tap(13, await centre('#heal')); await up(B);
    assert.equal((await state()).stick, held.stick, 'joystick survived three simultaneous touches');

    // 6. releasing finger A recentres the stick and stops the hero
    await up(A); await waitSim(.15);
    const released = await state(); await waitSim(.4); const still = await state();
    assert.equal(released.stick, null); assert.deepEqual(released.vec, { x: 0, y: 0 }); assert.deepEqual(released.input, { x: 0, y: 0 });
    assert.match(released.knob, /translate\(0(\.0)?px,\s*0(\.0)?px\)/);
    assert.ok(Math.hypot(still.x - released.x, still.y - released.y) < .05, 'hero stopped');

    // 7. pointercancel releases too; a button finger lifting first must not reset a later joystick finger
    await down(21, await centre('#attack-button')); await down(22, stick); await move(22, { x: stick.x - 30, y: stick.y });
    await up(21); await waitSim(.12);
    const second = await state(); assert.notEqual(second.stick, null); assert.ok(second.vec.x < -.5, 'joystick unaffected by the other finger lifting');
    active.clear(); await send('touchCancel', []); await waitSim(.12);
    const cancelled = await state(); assert.equal(cancelled.stick, null); assert.deepEqual(cancelled.vec, { x: 0, y: 0 });

    assert.deepEqual(errors, [], 'no page errors');
    await context.close();
  } finally { await browser.close(); await server.close(); }
});
