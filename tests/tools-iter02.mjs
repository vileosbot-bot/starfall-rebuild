// Run the same capture against either checkout, using its dist server.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const [checkout, output] = process.argv.slice(2);
if (!checkout || !output) throw Error('Usage: node tests/tools-iter02.mjs CHECKOUT OUTPUT_DIRECTORY');
const harness = await import(pathToFileURL(path.resolve(checkout,'tests/browser-harness.mjs')));
const {browser,skip} = await harness.launch();
if (!browser) throw Error(skip);
const server = await harness.serveDist();
try {
  await fs.mkdir(output,{recursive:true});
  const {page,context} = await harness.openGame(browser,server.url);
  await page.evaluate(() => { window.__starfall.select(); window.__starfall.freeze(true); });
  for (const hero of ['fighter','tank','mage','marksman','assassin']) {
    await page.locator('[data-hero="'+hero+'"]').click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.locator('#hero-stage-canvas').screenshot({path:path.join(output,hero+'.png')});
  }
  await harness.startFrozen(page,{heroId:'fighter',seed:1122,seconds:12});
  const samples = await page.evaluate(async () => {
    const renderer = window.__starfall.renderer;
    if (!renderer.is3D) throw Error('WebGL2 required for frameMs');
    const frameMs = [], intervals = [];
    let last = await new Promise(requestAnimationFrame);
    for (let i=0; i<100; i++) {
      const now = await new Promise(requestAnimationFrame);
      if (i>=20) { frameMs.push(renderer.stats.frameMs); intervals.push(now-last); }
      last = now;
    }
    return {frameMs,intervals};
  });
  await fs.writeFile(path.join(output,'frame-times.json'),JSON.stringify(samples,null,2));
  await context.close();
  for (const [width,height] of [[390,844],[844,390],[1280,720]]) {
    const {context,page} = await harness.openGame(browser,server.url,{width,height,touch:width!==1280});
    await page.locator('#tutorial-toggle').check();
    await page.evaluate(async () => {
      const game = window.__starfall;
      await game.start({heroId:'fighter',seed:1122,tutorial:true});
      game.advance(2,1.5);
    });
    const name = width+'x'+height;
    await page.screenshot({path:path.join(output,'hud-'+name+'.png')});
    await page.locator('.hud-top-right').screenshot({path:path.join(output,'record-'+name+'.png')});
    await context.close();
  }
} finally { await browser.close(); await server.close(); }
