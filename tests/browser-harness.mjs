// Shared helpers for the browser-driven tests (visual regression + multi-touch).
// Playwright is not a project dependency: it is resolved from PLAYWRIGHT_MODULE, a local
// node_modules, or well-known host locations. Tests skip (with a reason) when none is found.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

export function serveDist() {
  const dist = path.join(ROOT, 'dist');
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname), file = path.join(dist, rel === '/' ? 'index.html' : rel);
    if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(r => server.close(r)) })));
}

function findPlaywright() {
  const bases = [process.env.PLAYWRIGHT_MODULE, path.join(ROOT, 'node_modules'), '/opt/hatch/skills/spaces/ts-runtime/dist/node_modules', '/opt/muse/assets/spaces/ts-runtime/dist/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules'].filter(Boolean);
  for (const base of bases) for (const name of ['playwright', 'playwright-core']) {
    try { return createRequire(path.join(base, 'noop.js'))(name); } catch {}
  }
  return null;
}
function findChromium() {
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(cache)) for (const dir of fs.readdirSync(cache).sort().reverse()) {
    for (const rel of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/headless_shell', 'chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const file = path.join(cache, dir, rel); if (fs.existsSync(file)) return file;
    }
  }
  for (const file of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (fs.existsSync(file)) return file;
  return null;
}
/** Launch headless Chromium with software WebGL2. Returns { browser } or { skip: reason }. */
export async function launch() {
  const pw = findPlaywright(); if (!pw) return { skip: 'Playwright not found (set PLAYWRIGHT_MODULE to a node_modules directory)' };
  const executablePath = findChromium();
  try {
    const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--font-render-hinting=none'] });
    return { browser };
  } catch (err) { return { skip: `Chromium could not start: ${String(err.message).split('\n')[0]}` }; }
}
/** Open the game in a fresh context and wait for the app module. */
export async function openGame(browser, url, { width = 1280, height = 720, touch = false, query = '' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: touch, isMobile: false });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('sf-rebuild-settings', JSON.stringify({ tutorial: false, muted: true, quality: 'high' })); } catch {} });
  await page.goto(url + query); await page.waitForFunction(() => !!window.__starfall, null, { timeout: 30000 });
  return { context, page, errors };
}
/** Start a deterministic match and stop the real-time loop; the sim only moves via advance(). */
export async function startFrozen(page, { heroId = 'fighter', seed = 1122, seconds = 0, clock = 1.5 } = {}) {
  await page.evaluate(async o => { await window.__starfall.start({ heroId: o.heroId, seed: o.seed }); window.__starfall.freeze(true); window.__starfall.advance(o.seconds, o.clock); }, { heroId, seed, seconds, clock });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Decode PNG buffers in the page and return colour statistics / a tolerant diff. */
export async function analyse(page, png, { x = 0, y = 0, w = null, h = null } = {}) {
  return page.evaluate(async ({ b64, x, y, w, h }) => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
    const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const W = w ?? img.width - x, H = h ?? img.height - y, d = g.getImageData(x, y, W, H).data, n = W * H, out = { width: img.width, height: img.height, green: 0, water: 0, stone: 0, gold: 0, grey: 0, dark: 0, luma: 0 };
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gr = d[i + 1], b = d[i + 2], mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), sat = mx ? (mx - mn) / mx : 0; out.luma += (r * .299 + gr * .587 + b * .114);
      if (gr > r * 1.15 && gr > b * 1.25 && gr > 70) out.green++;
      else if (b > r * 1.3 && b > 110 && gr > r) out.water++;
      else if (r > 170 && gr > 130 && b < gr * .72 && r > b * 1.5) out.gold++;
      else if (sat < .2 && mx > 120) out.stone++;
      if (sat < .12) out.grey++;
      if (mx < 50) out.dark++;
    }
    for (const k of ['green', 'water', 'stone', 'gold', 'grey', 'dark']) out[k] = +(out[k] / n).toFixed(4); out.luma = +(out.luma / n).toFixed(2);
    return out;
  }, { b64: png.toString('base64'), x, y, w, h });
}
export async function diffImages(page, a, b) {
  return page.evaluate(async ({ a, b }) => {
    const load = async s => { const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(img.width, img.height), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data }; };
    const A = await load(a), B = await load(b); if (A.w !== B.w || A.h !== B.h) return { sizeMismatch: true, a: [A.w, A.h], b: [B.w, B.h] };
    let sum = 0, bad = 0; const n = A.w * A.h;
    for (let i = 0; i < A.d.length; i += 4) { const e = (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2])) / 3; sum += e; if (e > 40) bad++; }
    return { mean: +(sum / n).toFixed(3), bad: +(bad / n).toFixed(4) };
  }, { a: a.toString('base64'), b: b.toString('base64') });
}
