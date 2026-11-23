// WebGL2 3D renderer for Starfall. Same public interface as the Canvas2D Renderer in
// render.js (see CONTRACT.md), so app.js can fall back to it when WebGL2 is unavailable.
// All geometry, textures and shaders are generated procedurally at start-up.
import { HEROES, MAP } from './sim.js';
import { Geo, M, TAU, clamp, lerp, smooth, hex, rng, program, mesh, canvasTexture, noiseTexture, stoneTexture, dataTexture, MESH_VS, MESH_FS, GROUND_VS, GROUND_FS, FX_VS, FX_FS } from './glkit.js';
import { HERO_BUILDERS, MONSTER_BUILDERS, MONSTER_SCALE, minion, siegeCart, tower, core, addTree, addRock, addMushroom, addGrassTuft, addLilyPad, addWall, addSpawnDais, addCampMark, TEAM } from './models3d.js';
import { drawMinimap } from './minimap.js';

export const CAMERA_PITCH = Math.PI / 4;      // elevation fixed at 45 degrees (brief section D)
export const CAMERA_FOV = 40 * Math.PI / 180; // vertical field of view
export const HERO_SCREEN_FRACTION = 1 / 10;   // a hero is ~1/10 of the viewport height
const HERO_SCALE = 1.12, HERO_HEIGHT = 2.5 * HERO_SCALE, MINION_SCALE = .62, EXTENT = 72, DAIS_R = 5.6, DAIS_H = .28, EDGE = 2.6; // EDGE: the perimeter wall sits this far outside the walkable bound
const HERO_COLOR = Object.fromEntries(HEROES.map(h => [h.id, h.color]));
const PURPLE_CASTERS = new Set(['mage', 'assassin']);
const pt = p => [p.x, p.y];
function segDist(x, y, a, b) { const dx = b.x - a.x, dy = b.y - a.y, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(x - a.x - dx * t, y - a.y - dy * t); }
function polyDist(x, y, pts) { let d = Infinity; for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(x, y, pts[i - 1], pts[i])); return d; }
function inside(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
function edgeDist(x, y, poly) { let d = Infinity; for (let i = 0; i < poly.length; i++) d = Math.min(d, segDist(x, y, poly[i], poly[(i + 1) % poly.length])); return d; }
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const RIVER = [{ x: -45.5, y: -45.5 }, { x: 0, y: 0 }, { x: 45.5, y: 45.5 }];

// The simulation advances at 30 Hz while rendering commonly runs at 60 Hz.
// Keep a short movement hold across the intervening zero-displacement render
// frames so the hero's gait blend does not alternate between moving and idle.
export function updateLocomotion(st, speed, dt, alive = true, teleported = false) {
  if (!alive || teleported) st.moveHold = 0;
  else if (speed > .6) st.moveHold = .085;
  else st.moveHold = Math.max(0, (st.moveHold || 0) - dt);
  const moving = alive && !teleported && st.moveHold > 0;
  st.move += ((moving ? 1 : 0) - st.move) * (1 - Math.exp(-dt * 12));
  return moving;
}

export function webgl2Available() {
  try { const c = document.createElement('canvas'), gl = c.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; }
}
/** Height of the walkable surface: only the two spawn daises are raised. */
export function groundY(x, y) {
  let h = 0;
  for (const f of Object.values(MAP.fountains)) h = Math.max(h, DAIS_H * (1 - smooth(DAIS_R, DAIS_R + .5, Math.hypot(x - f.x, y - f.y))));
  return h;
}

// Shared GL plumbing for the battlefield renderer and the hero-select stage.
class GLBase {
  constructor(canvas, attrs) {
    this.canvas = canvas;
    const gl = this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', ...attrs });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.meshP = program(gl, MESH_VS, MESH_FS, ['uVP', 'uM', 'uTint', 'uAdd', 'uMode', 'uEye']);
    this.models = new Map(); this.vp = M.ident(); this.eye = [0, 10, 10];
  }
  _model(key, build) {
    let m = this.models.get(key);
    if (!m) { const src = build(); m = { ...src, meshes: Object.fromEntries(Object.entries(src.groups).map(([k, g]) => [k, g.count ? mesh(this.gl, g) : null])) }; this.models.set(key, m); }
    return m;
  }
  _useMesh(mode = 0) {
    const gl = this.gl, P = this.meshP; gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.uVP, false, this.vp); gl.uniform3fv(P.u.uEye, this.eye); gl.uniform1i(P.u.uMode, mode);
    gl.uniform4f(P.u.uTint, 1, 1, 1, 1); gl.uniform3f(P.u.uAdd, 0, 0, 0);
  }
  _draw(m, matrix, tint, add) {
    if (!m) return; const gl = this.gl, u = this.meshP.u;
    gl.uniformMatrix4fv(u.uM, false, matrix); gl.uniform4fv(u.uTint, tint || WHITE); gl.uniform3fv(u.uAdd, add || ZERO);
    gl.bindVertexArray(m.vao); gl.drawArrays(gl.TRIANGLES, 0, m.count);
  }
  // Pose and draw a humanoid / beast / cart model. st: { walk, move, atk (0..1 or -1), t }
  _drawModel(model, root, st, tint, add) {
    const P = model.pivots, G = model.meshes, s = model.style || {}, sw = Math.sin(st.walk) * st.move, a = st.atk;
    if (s.cart) { const rec = a >= 0 ? Math.sin(a * Math.PI) * -.25 : 0; this._draw(G.body, M.mul(root, M.translate(0, 0, rec)), tint, add); this._draw(G.wheels, M.mul(root, M.translate(0, 0, rec)), tint, add); return; }
    if (s.beast) {
      const lunge = a >= 0 ? Math.sin(a * Math.PI) : 0, r = M.mul(root, M.translate(0, Math.abs(sw) * .05, lunge * .35));
      this._draw(G.body, r, tint, add);
      this._draw(G.head, M.mul(r, M.pivot(P.head, M.rotX(lunge * .5 + Math.sin(st.t * 2) * .05))), tint, add);
      this._draw(G.legFL, M.mul(r, M.pivot(P.legFL, M.rotX(sw * .7))), tint, add); this._draw(G.legBR, M.mul(r, M.pivot(P.legBR, M.rotX(sw * .7))), tint, add);
      this._draw(G.legFR, M.mul(r, M.pivot(P.legFR, M.rotX(-sw * .7))), tint, add); this._draw(G.legBL, M.mul(r, M.pivot(P.legBL, M.rotX(-sw * .7))), tint, add);
      if (G.wingL) { const f = Math.sin(st.t * 9) * .55 + .15; this._draw(G.wingL, M.mul(r, M.pivot(P.wingL, M.rotZ(-f))), tint, add); this._draw(G.wingR, M.mul(r, M.pivot(P.wingR, M.rotZ(f))), tint, add); }
      return;
    }
    let aR = (s.armBase ?? 0) + sw * .22, aL = (s.armLBase ?? 0) - sw * (s.shield ? .15 : .5), twist = 0, bodyLean = st.move * .1;
    if (s.twoHanded) aL = aR;
    if (a >= 0) {
      const k = (p0, p1, v0, v1) => lerp(v0, v1, smooth(p0, p1, a));
      if (s.attack === 'swing') { aR = a < .32 ? k(0, .32, aR, -2.75) : a < .62 ? k(.32, .62, -2.75, -.3) : k(.62, 1, -.3, aR); twist = a < .32 ? k(0, .32, 0, -.35) : a < .62 ? k(.32, .62, -.35, .3) : k(.62, 1, .3, 0); bodyLean += a > .3 && a < .7 ? .18 : 0; if (s.twoHanded) aL = aR; }
      else if (s.attack === 'stab') { aR = a < .3 ? k(0, .3, aR, .35) : a < .55 ? k(.3, .55, .35, -1.55) : k(.55, 1, -1.55, aR); if (s.dual) aL = a < .5 ? k(.2, .5, aL, -1.5) : k(.5, 1, -1.5, aL); twist = Math.sin(a * Math.PI) * .25; }
      else if (s.attack === 'cast') { const up = Math.sin(a * Math.PI); aR = lerp(aR, -2.3, up); aL = lerp(aL, -1.2, up * .5); }
      else if (s.attack === 'shoot') { aL = lerp(aL, -1.57, smooth(0, .25, a) * (1 - smooth(.8, 1, a))); aR = a < .45 ? k(0, .45, aR, -1.5) : k(.45, 1, -.9, aR); twist = -.5 * Math.sin(a * Math.PI); }
    }
    const r = M.chain(root, M.translate(0, Math.abs(sw) * .09 + (st.move < .05 ? Math.sin(st.t * 2.2) * .012 : 0), 0), M.rotY(twist), M.rotX(bodyLean));
    this._draw(G.body, r, tint, add);
    this._draw(G.head, M.mul(r, M.pivot(P.head, M.rotX(-bodyLean * .6 + Math.sin(st.walk * 2) * .03 * st.move))), tint, add);
    this._draw(G.legL, M.mul(r, M.pivot(P.legL, M.rotX(sw * .8 - bodyLean))), tint, add);
    this._draw(G.legR, M.mul(r, M.pivot(P.legR, M.rotX(-sw * .8 - bodyLean))), tint, add);
    this._draw(G.armL, M.mul(r, M.pivot(P.armL, M.rotX(aL))), tint, add);
    this._draw(G.armR, M.mul(r, M.pivot(P.armR, M.rotX(aR))), tint, add);
    if (G.cape) this._draw(G.cape, M.mul(r, M.pivot(P.cape, M.rotX(.1 + st.move * .45 + Math.sin(st.t * 3.1 + st.walk * .5) * (.04 + st.move * .06)))), tint, add);
  }
  _hero(id) { return this._model('hero:' + id, HERO_BUILDERS[id] || HERO_BUILDERS.fighter); }
}
const WHITE = new Float32Array([1, 1, 1, 1]), ZERO = new Float32Array([0, 0, 0]);

function atlasCanvas() { // 2x2 cells: soft blob, thin ring, magic circle, four-point spark
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S * 2; const g = c.getContext('2d', { willReadFrequently: true });
  // soft glow without shadowBlur (canvas filters are very slow on software GPUs): repeat the stroke wider and fainter
  const glow = (draw, w) => { for (const [k, a] of [[3.2, .1], [2.1, .18], [1, 1]]) { g.globalAlpha = a; g.lineWidth = w * k; draw(); } g.globalAlpha = 1; };
  const cell = (i, fn) => { g.save(); g.translate((i % 2) * S + S / 2, Math.floor(i / 2) * S + S / 2); g.beginPath(); g.rect(-S / 2, -S / 2, S, S); g.clip(); fn(S / 2 - 6); g.restore(); };
  g.strokeStyle = g.fillStyle = '#fff'; g.lineCap = 'round';
  cell(0, R => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, R); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-R, -R, R * 2, R * 2); });
  cell(1, R => { glow(() => { g.beginPath(); g.arc(0, 0, R * .88, 0, TAU); g.stroke(); }, R * .06); g.globalAlpha = .22; g.lineWidth = R * .03; g.beginPath(); g.arc(0, 0, R * .76, 0, TAU); g.stroke(); g.globalAlpha = 1; });
  cell(2, R => { // star ring with graduation ticks
    glow(() => { g.beginPath(); g.arc(0, 0, R * .93, 0, TAU); g.stroke(); }, R * .03); g.lineWidth = R * .02; g.beginPath(); g.arc(0, 0, R * .82, 0, TAU); g.stroke();
    for (let i = 0; i < 48; i++) { const a = i * TAU / 48, r0 = R * (i % 4 ? .87 : .84), r1 = R * .915; g.lineWidth = R * (i % 4 ? .012 : .024); g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke(); }
    g.lineWidth = R * .028; g.lineJoin = 'round';
    for (const step of [3]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i * step * TAU / 8; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * .8, Math.sin(a) * R * .8); } g.stroke(); }
    g.lineWidth = R * .02; g.beginPath(); g.arc(0, 0, R * .44, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, R * .3, 0, TAU); g.stroke();
    g.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 2 * TAU / 5; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * .3, Math.sin(a) * R * .3); } g.stroke();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + TAU / 16; g.beginPath(); g.arc(Math.cos(a) * R * .62, Math.sin(a) * R * .62, R * .045, 0, TAU); g.stroke(); }
    // Twelve short rune marks and inset sparks sharpen the spell-circle read at a glance.
    g.lineWidth = R * .014;
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12, r0 = R * .49, r1 = R * (i % 3 ? .56 : .6);
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
      g.beginPath(); g.arc(Math.cos(a) * R * .68, Math.sin(a) * R * .68, R * (i % 3 ? .012 : .022), 0, TAU); g.fill();
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, R); gr.addColorStop(0, 'rgba(255,255,255,.34)'); gr.addColorStop(.8, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * .93, 0, TAU); g.fill();
  });
  cell(3, R => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, R * .6); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-R, -R, R * 2, R * 2);
    g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8, r = i % 2 ? R * .1 : R * .95; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); });
  return c;
}
const CELL = i => { const u = (i % 2) * .5, v = Math.floor(i / 2) * .5, e = .006; return [u + e, v + e, u + .5 - e, v + .5 - e]; };
const UV = [CELL(0), CELL(1), CELL(2), CELL(3)], BLOB = 0, RING = 1, CIRCLE = 2, SPARK = 3;

function maskCanvases() {
  const S = 1024, k = S / (EXTENT * 2), X = v => (v + EXTENT) * k, mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'lighter'; g.lineCap = g.lineJoin = 'round'; return [c, g]; };
  // Edges are softened by a two-step downsample (1024 -> 512 -> 256) instead of a blur filter; the shader
  // thresholds the bilinear gradient and adds noise, so 256 px is plenty.
  const soften = c => { let src = c; for (const n of [512, 256]) { const d = document.createElement('canvas'); d.width = d.height = n; const g = d.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, n, n); src = d; } return src; };
  const [ca, a] = mk(), [cb, b] = mk();
  const path = (g, pts, close) => { g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](X(p.x), X(p.y))); if (close) g.closePath(); };
  a.strokeStyle = '#f00'; a.lineWidth = 7.8 * k; for (const lane of Object.values(MAP.lanes)) { path(a, lane); a.stroke(); }
  a.strokeStyle = '#0f0'; a.lineWidth = (MAP.riverWidth || 10.6) * .86 * k; path(a, RIVER); a.stroke();
  a.fillStyle = '#00f'; for (const poly of MAP.bushes || []) { path(a, poly, true); a.fill(); a.strokeStyle = '#00f'; a.lineWidth = .8 * k; a.stroke(); }
  b.fillStyle = '#f00'; for (const c of MAP.camps || []) { b.beginPath(); b.arc(X(c.x), X(c.y), (c.radius + .7) * k, 0, TAU); b.fill(); }
  b.fillStyle = '#0f0'; for (const team of ['blue', 'red']) { const c = MAP.cores[team], f = MAP.fountains[team]; b.beginPath(); b.arc(X(c.x), X(c.y), 10.5 * k, 0, TAU); b.fill(); b.beginPath(); b.arc(X(f.x), X(f.y), 9 * k, 0, TAU); b.fill(); }
  b.fillStyle = '#00f'; const B = MAP.bound + EDGE; b.fillRect(X(-B), X(-B), B * 2 * k, B * 2 * k);
  return [soften(ca), soften(cb)];
}

export class Renderer3D extends GLBase {
  constructor(canvas, overlay, { antialias = true } = {}) {
    super(canvas, { antialias });
    this.overlay = overlay; this.octx = overlay?.getContext('2d') || null; this.is3D = true;
    this.width = 1; this.height = 1; this.dpr = 1; this.scale = 40; this.bound = Number(MAP.bound || 57.5);
    this.camera = { x: -47, y: 47 }; this.manualTime = 0; this.hasCamera = false; this.clock = 0; this.time = 0;
    this.state = new Map(); this.circles = []; this.seenFx = 0; this.fxWorld = null;
    this.stats = { drawCalls: 0, frameMs: 0 };
    this._init();
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { this.models.clear(); this.meshP = program(this.gl, MESH_VS, MESH_FS, ['uVP', 'uM', 'uTint', 'uAdd', 'uMode', 'uEye']); this._init(); this.lost = false; });
    this.resize(canvas.clientWidth || 1280, canvas.clientHeight || 720, Math.min(window.devicePixelRatio || 1, 2));
  }
  _init() {
    const gl = this.gl;
    this.groundP = program(gl, GROUND_VS, GROUND_FS, ['uVP', 'uMaskA', 'uMaskB', 'uNoise', 'uStone', 'uTime', 'uExtent', 'uDetail']);
    this.fxP = program(gl, FX_VS, FX_FS, ['uVP', 'uTex']);
    const [ma, mb] = maskCanvases(); this.maskA = canvasTexture(gl, ma, { mip: false }); this.maskB = canvasTexture(gl, mb, { mip: false }); this.atlas = canvasTexture(gl, atlasCanvas()); this.noiseTex = dataTexture(gl, noiseTexture()); this.stoneTex = dataTexture(gl, stoneTexture());
    const q = new Geo(); q.quad([-EXTENT, 0, -EXTENT], [-EXTENT, 0, EXTENT], [EXTENT, 0, EXTENT], [EXTENT, 0, -EXTENT]); this.ground = mesh(gl, q);
    this._buildScenery();
    this.fx = { ground: this._fxBuffer(4096), glow: this._fxBuffer(4096) };
    this.towerModels = new Map(); this.coreModels = new Map();
  }
  _fxBuffer(quads) {
    const gl = this.gl, data = new Float32Array(quads * 6 * 9), vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 36, 12); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 36, 20);
    gl.bindVertexArray(null); return { data, vao, buf, n: 0, max: quads * 6 };
  }
  // ---- static world ---------------------------------------------------------
  _buildScenery() {
    const r = rng(20261122), CH = 24, chunks = new Map(), decal = new Geo(), tufts = new Map();
    const chunk = (map, x, z) => { const key = `${Math.floor((x + EXTENT) / CH)},${Math.floor((z + EXTENT) / CH)}`; let c = map.get(key); if (!c) map.set(key, c = { geo: new Geo(), x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }); return c; };
    const grow = (c, x, z, pad) => { c.x0 = Math.min(c.x0, x - pad); c.x1 = Math.max(c.x1, x + pad); c.z0 = Math.min(c.z0, z - pad); c.z1 = Math.max(c.z1, z + pad); };
    const lanes = Object.values(MAP.lanes), walls = MAP.walls || [], bushes = MAP.bushes || [], camps = MAP.camps || [];
    const open = (x, z, pad = 0) => Math.abs(x) < this.bound - 1 && Math.abs(z) < this.bound - 1 && !lanes.some(l => polyDist(x, z, l) < 5.2 + pad) && polyDist(x, z, RIVER) > 5.6 + pad &&
      !walls.some(w => inside(x, z, w) || edgeDist(x, z, w) < .5 + pad) && !camps.some(c => Math.hypot(x - c.x, z - c.y) < c.radius + 1.3 + pad) &&
      !['blue', 'red'].some(t => Math.hypot(x - MAP.cores[t].x, z - MAP.cores[t].y) < 12 || Math.hypot(x - MAP.fountains[t].x, z - MAP.fountains[t].y) < 10) && !MAP.towers.some(t => Math.hypot(x - t.x, z - t.y) < 3.2);
    // stone walls with trees and rocks planted on top (their footprint is impassable in the sim)
    const WALL_H = 1.15; // low enough that a hero standing behind a wall keeps head and shoulders visible
    for (const w of walls) {
      let cx = 0, cz = 0; for (const p of w) { cx += p.x; cz += p.y; } cx /= w.length; cz /= w.length;
      const c = chunk(chunks, cx, cz); addWall(c.geo, w.map(pt), WALL_H, r); for (const p of w) grow(c, p.x, p.y, 1);
      const xs = w.map(p => p.x), zs = w.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), placed = [];
      for (let i = 0; i < (x1 - x0) * (z1 - z0) * .5; i++) {
        const x = lerp(x0, x1, r()), z = lerp(z0, z1, r()); if (!inside(x, z, w)) continue; const ed = edgeDist(x, z, w);
        if (ed > 1.5 && !placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 2.5)) { placed.push([x, z]); addTree(c.geo, x, WALL_H - .05, z, .85 + r() * .5, r); }
        else if (ed > .9 && ed < 1.5 && r() < .16) addRock(c.geo, x, WALL_H - .05, z, .7 + r() * .6, r);
        else if (ed > 1.0 && r() < .1) addGrassTuft(c.geo, x, WALL_H - .03, z, .8, r);
      }
    }
    // perimeter wall and the forest beyond the playable square
    const B = this.bound + EDGE;
    for (const [ax, az, bx, bz] of [[-B, -B, B, -B], [B, -B, B, B], [B, B, -B, B], [-B, B, -B, -B]]) for (let i = 0; i < 5; i++) {
      const t0 = i / 5, t1 = (i + 1) / 5, x0 = lerp(ax, bx, t0), z0 = lerp(az, bz, t0), x1 = lerp(ax, bx, t1), z1 = lerp(az, bz, t1), nx = (bz - az) / (2 * B) * 1.3, nz = -(bx - ax) / (2 * B) * 1.3;
      const c = chunk(chunks, (x0 + x1) / 2, (z0 + z1) / 2); addWall(c.geo, [[x0, z0], [x1, z1], [x1 + nx, z1 + nz], [x0 + nx, z0 + nz]], .9, r, false); grow(c, x0, z0, 2); grow(c, x1, z1, 2);
    }
    for (let i = 0; i < 260; i++) { // side 2 is the south edge, nearest the camera: only low rocks there so nothing blocks the view
      const side = Math.floor(r() * 4), u = lerp(-EXTENT + 3, EXTENT - 3, r()), v = this.bound + EDGE + 2.4 + r() * 8, x = side === 0 ? u : side === 1 ? v : side === 2 ? u : -v, z = side === 0 ? -v : side === 1 ? u : side === 2 ? v : u;
      const c = chunk(chunks, x, z); grow(c, x, z, 2);
      if (side === 2 || z > this.bound - 6) { if (r() < .5) addRock(c.geo, x, 0, z, .6 + r() * .8, r); } else addTree(c.geo, x, 0, z, 1 + r() * .7, r);
    }
    // jungle dressing: rocks, red mushrooms, loose trees in open pockets
    for (let i = 0; i < 2600; i++) {
      const x = lerp(-this.bound, this.bound, r()), z = lerp(-this.bound, this.bound, r()), k = r(); if (!open(x, z, .2)) continue; const c = chunk(chunks, x, z); grow(c, x, z, 1.5);
      if (k < .2) addRock(c.geo, x, 0, z, .45 + r() * .7, r); else if (k < .42) addMushroom(c.geo, x, 0, z, .9 + r() * .9, r);
    }
    // tall grass: dense upright blade clusters filling every bush polygon, plus loose tufts
    for (const b of bushes) {
      const xs = b.map(p => p.x), zs = b.map(p => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      for (let x = x0; x <= x1; x += .62) for (let z = z0; z <= z1; z += .62) { const px = x + (r() - .5) * .5, pz = z + (r() - .5) * .5; if (!inside(px, pz, b)) continue; const c = chunk(tufts, px, pz); addGrassTuft(c.geo, px, 0, pz, 1.15 + r() * .5, r); grow(c, px, pz, 1); }
    }
    for (let i = 0; i < 2200; i++) { const x = lerp(-this.bound, this.bound, r()), z = lerp(-this.bound, this.bound, r()); if (!open(x, z, -.3)) continue; const c = chunk(tufts, x, z); addGrassTuft(c.geo, x, 0, z, .45 + r() * .4, r); grow(c, x, z, 1); }
    // river: lily pads
    for (let i = 0; i < 150; i++) { const t = lerp(-44, 44, r()), o = (r() - .5) * 6.4, x = t + o * .707, z = t - o * .707; if (Math.abs(t) < 5.5 || lanes.some(l => polyDist(x, z, l) < 4.4)) continue; const c = chunk(chunks, x, z); addLilyPad(c.geo, x, .035, z, .7 + r() * .7, r); grow(c, x, z, 1); }
    // spawn daises and camp markings
    for (const team of ['blue', 'red']) { const f = MAP.fountains[team], c = chunk(chunks, f.x, f.y); addSpawnDais(c.geo, decal, f.x, f.y, DAIS_R, DAIS_H, team); grow(c, f.x, f.y, DAIS_R + 1); }
    for (const c of camps) addCampMark(decal, c.x, c.y, c.radius);
    const bake = map => [...map.values()].filter(c => c.geo.count).map(c => ({ mesh: mesh(this.gl, c.geo), x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1 }));
    this.chunks = bake(chunks); this.tuftChunks = bake(tufts); this.decals = mesh(this.gl, decal);
    this.triangles = [...chunks.values(), ...tufts.values()].reduce((n, c) => n + c.geo.count / 3, 0);
  }
  // ---- camera ---------------------------------------------------------------
  resize(width, height, dpr = 1) {
    this.width = Math.max(1, width); this.height = Math.max(1, height); this.dpr = clamp(dpr, .5, 2);
    const w = Math.round(this.width * this.dpr), h = Math.round(this.height * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    if (this.overlay && (this.overlay.width !== w || this.overlay.height !== h)) { this.overlay.width = w; this.overlay.height = h; }
    const aspect = this.width / this.height, span = HERO_HEIGHT * Math.cos(CAMERA_PITCH) / HERO_SCREEN_FRACTION; // view height at the hero, perpendicular to the view axis
    // keep at least ~15 world units visible across narrow (portrait) screens
    this.proj = M.perspective(CAMERA_FOV, aspect, 1, 160);
    // solve the distance at which a hero (feet to crest) covers exactly the target fraction, perspective included
    let lo = 4, hi = 80;
    for (let i = 0; i < 28; i++) { this.distance = (lo + hi) / 2; this._updateCamera(); if (this.heroScreenFraction() > HERO_SCREEN_FRACTION) lo = this.distance; else hi = this.distance; }
    // keep at least ~11 world units visible across narrow (portrait) screens
    const minSpan = Math.max(span, 11 / aspect); this.distance = Math.max(this.distance, minSpan / (2 * Math.tan(CAMERA_FOV / 2)));
    this.viewSpan = this.distance * 2 * Math.tan(CAMERA_FOV / 2); this.scale = this.height / this.viewSpan;
    this._updateCamera();
  }
  _updateCamera() {
    const tx = this.camera.x, tz = this.camera.y, ty = 1.2, d = this.distance;
    this.eye = [tx, ty + Math.sin(CAMERA_PITCH) * d, tz + Math.cos(CAMERA_PITCH) * d];
    this.view = M.lookAt(this.eye, [tx, ty, tz]); this.vp = M.mul(this.proj, this.view, new Float32Array(16)); this.ivp = M.invert(this.vp);
    const v = this.view; this.right = [v[0], v[4], v[8]]; this.up = [v[1], v[5], v[9]];
  }
  /** Fraction of the viewport height covered by a hero standing at the camera target. */
  heroScreenFraction() { const a = this.project(this.camera.x, 0, this.camera.y), b = this.project(this.camera.x, HERO_HEIGHT, this.camera.y); return Math.abs(a.y - b.y) / this.height; }
  get pitchDegrees() { const dy = this.eye[1] - 1.2, dz = this.eye[2] - this.camera.y; return Math.atan2(dy, Math.hypot(dz, this.eye[0] - this.camera.x)) * 180 / Math.PI; }
  project(x, y, z) { const c = M.project(this.vp, x, y, z), w = c[3] || 1e-6; return { x: (c[0] / w * .5 + .5) * this.width, y: (1 - (c[1] / w * .5 + .5)) * this.height, w: c[3] }; }
  worldToScreen(x, y) { const p = this.project(x, groundY(x, y), y); return { x: p.x, y: p.y }; }
  screenToWorld(px, py) {
    const nx = px / this.width * 2 - 1, ny = 1 - py / this.height * 2, a = M.project(this.ivp, nx, ny, -1), b = M.project(this.ivp, nx, ny, 1);
    const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]], dy = p1[1] - p0[1];
    const t = Math.abs(dy) < 1e-6 ? 0 : -p0[1] / dy;
    return { x: clamp(p0[0] + (p1[0] - p0[0]) * t, -this.bound - 20, this.bound + 20), y: clamp(p0[2] + (p1[2] - p0[2]) * t, -this.bound - 20, this.bound + 20) };
  }
  resetCamera(player) { if (player) { this.camera.x = player.x; this.camera.y = player.y; } this.hasCamera = true; this.manualTime = 0; this._updateCamera(); }
  panTo(x, y) { this.camera.x = clamp(x, -this.bound, this.bound); this.camera.y = clamp(y, -this.bound, this.bound); this.manualTime = 3.5; this.hasCamera = true; this._updateCamera(); }
  follow() { this.manualTime = 0; }
  setClock(t) { this.clock = t; }
  /** Ground-plane footprint of the viewport, used by the minimap view frame. */
  viewCorners() { return [[0, 0], [this.width, 0], [this.width, this.height], [0, this.height]].map(([x, y]) => this.screenToWorld(x, y)); }
  drawMinimap(canvas, world) { drawMinimap(canvas, world, this); }

  // ---- effect quads ------------------------------------------------------------
  _push(b, p, uv, c) { // p: 4 corners [x,y,z], uv rect, colour rgba
    if (b.n + 6 > b.max) return; const d = b.data; let o = b.n * 9;
    const put = (q, u, v) => { d[o++] = q[0]; d[o++] = q[1]; d[o++] = q[2]; d[o++] = u; d[o++] = v; d[o++] = c[0]; d[o++] = c[1]; d[o++] = c[2]; d[o++] = c[3]; };
    put(p[0], uv[0], uv[1]); put(p[1], uv[2], uv[1]); put(p[2], uv[2], uv[3]); put(p[0], uv[0], uv[1]); put(p[2], uv[2], uv[3]); put(p[3], uv[0], uv[3]); b.n += 6;
  }
  _flat(b, x, z, r, cell, c, rot = 0, y = null) { // quad lying on the ground
    const gy = (y ?? groundY(x, z)) + .045, cs = Math.cos(rot) * r, sn = Math.sin(rot) * r;
    this._push(b, [[x - cs + sn, gy, z - sn - cs], [x + cs + sn, gy, z + sn - cs], [x + cs - sn, gy, z + sn + cs], [x - cs - sn, gy, z - sn + cs]], UV[cell], c);
  }
  _bill(b, x, y, z, r, cell, c) { // camera-facing quad
    const R = this.right, U = this.up;
    this._push(b, [[x - R[0] * r + U[0] * r, y - R[1] * r + U[1] * r, z - R[2] * r + U[2] * r], [x + R[0] * r + U[0] * r, y + R[1] * r + U[1] * r, z + R[2] * r + U[2] * r], [x + R[0] * r - U[0] * r, y + R[1] * r - U[1] * r, z + R[2] * r - U[2] * r], [x - R[0] * r - U[0] * r, y - R[1] * r - U[1] * r, z - R[2] * r - U[2] * r]], UV[cell], c);
  }
  _ribbon(b, x0, z0, x1, z1, y, w, c) { // horizontal streak between two points, soft across its width
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w, nz = dx / l * w, u = UV[BLOB], um = (u[0] + u[2]) / 2;
    this._push(b, [[x0 - nx, y, z0 - nz], [x1 - nx, y, z1 - nz], [x1 + nx, y, z1 + nz], [x0 + nx, y, z0 + nz]], [um, u[1], um + .001, u[3]], c);
  }
  _arc(b, x, z, y, r0, r1, a0, a1, c) { // swoosh sector made of short ribbons
    const n = 10, u = UV[BLOB], um = (u[0] + u[2]) / 2;
    for (let i = 0; i < n; i++) { const t0 = lerp(a0, a1, i / n), t1 = lerp(a0, a1, (i + 1) / n), k = Math.sin((i + .5) / n * Math.PI), cc = [c[0], c[1], c[2], c[3] * k];
      this._push(b, [[x + Math.cos(t0) * r0, y, z + Math.sin(t0) * r0], [x + Math.cos(t1) * r0, y, z + Math.sin(t1) * r0], [x + Math.cos(t1) * r1, y, z + Math.sin(t1) * r1], [x + Math.cos(t0) * r1, y, z + Math.sin(t0) * r1]], [um, u[1], um + .001, (u[1] + u[3]) / 2], cc); }
  }
  _flush(b, additive) {
    if (!b.n) return; const gl = this.gl;
    gl.blendFunc(gl.SRC_ALPHA, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(b.vao); gl.bindBuffer(gl.ARRAY_BUFFER, b.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, b.data, 0, b.n * 9); gl.drawArrays(gl.TRIANGLES, 0, b.n); b.n = 0;
  }

  // ---- frame ----------------------------------------------------------------
  draw(world, options = {}) {
    if (!world || this.lost) return;
    const t0 = performance.now(), { aim = null, showRanges = false, quality = 'high', dt = 1 / 60 } = options, gl = this.gl, p = world.player, team = p?.team || 'blue';
    this.playerId = p?.id;
    this.clock += dt; this.time = world.time || 0; const T = this.clock;
    if (this.fxWorld !== world) { this.fxWorld = world; this.state.clear(); this.circles = []; this.seenFx = 0; this._maxFx = 0; }
    if (!this.hasCamera && p) this.resetCamera(p);
    if (this.manualTime > 0) this.manualTime = Math.max(0, this.manualTime - dt);
    else if (p) { const k = 1 - Math.exp(-dt * 8); this.camera.x += (p.x - this.camera.x) * k; this.camera.y += (p.y - this.camera.y) * k; }
    this._updateCamera();
    const cx = this.camera.x, cz = this.camera.y, reach = this.viewSpan * 1.25 + this.viewSpan * (this.width / this.height) * .62 + 4;
    const near = (x0, x1, z0, z1) => Math.hypot(Math.max(x0 - cx, 0, cx - x1), Math.max(z0 - (cz - 6), 0, (cz - 6) - z1)) < reach;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height); gl.clearColor(.07, .16, .1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    // ground
    const G = this.groundP; gl.useProgram(G.p); gl.uniformMatrix4fv(G.u.uVP, false, this.vp); gl.uniform1f(G.u.uTime, T); gl.uniform1f(G.u.uExtent, EXTENT); gl.uniform1i(G.u.uDetail, quality === 'low' ? 0 : 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.maskA); gl.uniform1i(G.u.uMaskA, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.maskB); gl.uniform1i(G.u.uMaskB, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.noiseTex); gl.uniform1i(G.u.uNoise, 2); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.stoneTex); gl.uniform1i(G.u.uStone, 3);
    gl.bindVertexArray(this.ground.vao); gl.drawArrays(gl.TRIANGLES, 0, this.ground.count);
    // static scenery
    this._useMesh(0); const I = IDENT; let calls = 1;
    for (const c of this.chunks) if (near(c.x0, c.x1, c.z0, c.z1)) { this._draw(c.mesh, I); calls++; }
    if (quality !== 'low') for (const c of this.tuftChunks) if (near(c.x0, c.x1, c.z0, c.z1)) { this._draw(c.mesh, I); calls++; }

    // gather visible units
    const units = [], seen = new Set();
    for (const e of world.entities || []) {
      if (Math.abs(e.x - cx) > reach || Math.abs(e.y - (cz - 6)) > reach) continue;
      const friendly = e.team === team || e.team === 'neutral', vis = friendly || (e.visibleTo?.[team] !== false && !(e.invisibleTimer > 0));
      if (!vis && e.type !== 'tower' && e.type !== 'core') continue;
      units.push(e); seen.add(e.id);
    }
    // ground decals (inlays, shadows, rings, magic circles)
    gl.enable(gl.BLEND); gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); this._useMesh(1); this._draw(this.decals, I); calls++;
    const fg = this.fx.ground, fa = this.fx.glow;
    for (const e of units) {
      const st = this._state(e, dt), structure = e.type === 'tower' || e.type === 'core';
      if (st.hidden) continue;
      const r = structure ? e.radius * 1.5 : e.type === 'hero' ? .95 : (e.radius || .5) * 1.5;
      this._flat(fg, e.x, e.y, r, BLOB, [0, 0, 0, .34 * st.fade]);
      if (e.type === 'hero' && e.alive) {
        if (e === p) { const pulse = 1 + Math.sin(T * 4) * .04; this._flat(fg, e.x, e.y, 1.25 * pulse, RING, [.35, 1, .45, .95]); this._flat(fg, e.x, e.y, 1.05, BLOB, [.3, 1, .4, .22]); }
        else { const c = e.team === team ? [.35, .65, 1, .75] : [1, .32, .28, .75]; this._flat(fg, e.x, e.y, 1.05, RING, c); }
      }
    }
    if (p && p.alive) {
      if (showRanges || aim) this._flat(fg, p.x, p.y, (aim?.range || p.range || 6) * 1.11, RING, [.55, .92, 1, .7]);
      if (aim) { const ax = aim.x ?? p.x, az = aim.y ?? p.y, rr = aim.radius || 1.6; this._flat(fg, ax, az, rr, BLOB, [.45, .9, 1, .3]); this._flat(fg, ax, az, rr * 1.11, RING, [.8, 1, 1, .95]); this._ribbon(fg, p.x, p.y, ax, az, groundY(p.x, p.y) + .06, .12, [.7, 1, 1, .7]); }
      const mt = p.moveTarget; if (mt && Number.isFinite(mt.x)) this._flat(fg, mt.x, mt.y, .45 + Math.sin(T * 9) * .08, RING, [1, .95, .68, .8]);
    }
    this._effects(world, dt, fg, fa, p);
    gl.useProgram(this.fxP.p); gl.uniformMatrix4fv(this.fxP.u.uVP, false, this.vp); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlas); gl.uniform1i(this.fxP.u.uTex, 0);
    this._flush(fg, false); calls++;
    gl.disable(gl.BLEND); gl.depthMask(true);

    // units
    this._useMesh(0);
    for (const e of units) { const st = this.state.get(e.id); if (!st || st.hidden) continue; calls += this._unit(e, st, p, T, fa); }
    // additive glows, projectiles, beams
    gl.enable(gl.BLEND); gl.depthMask(false);
    gl.useProgram(this.fxP.p); gl.uniformMatrix4fv(this.fxP.u.uVP, false, this.vp); gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    this._flush(fa, true); calls++;
    gl.disable(gl.BLEND); gl.depthMask(true); gl.bindVertexArray(null);

    this._overlay(world, units, p, team);
    if ((this._gc = (this._gc || 0) + 1) % 180 === 0) { const ids = new Set((world.entities || []).map(e => e.id)); for (const id of this.state.keys()) if (!ids.has(id)) this.state.delete(id); }
    this.stats.drawCalls = calls; this.stats.frameMs = performance.now() - t0; this.stats.units = units.length;
  }
  _state(e, dt) {
    let st = this.state.get(e.id);
    if (!st) { st = { yaw: e.facing || 0, walk: (e.id * 1.7) % TAU, move: 0, x: e.x, y: e.y, atk: -1, flash: 0, dead: 0, fade: 1, hidden: false, gy: groundY(e.x, e.y) }; this.state.set(e.id, st); }
    if (dt > 0) {
      const d = Math.hypot(e.x - st.x, e.y - st.y), speed = d / dt, teleported = d > 3; st.x = e.x; st.y = e.y;
      const isPlayer = e.id === this.playerId;
      const moving = isPlayer ? updateLocomotion(st, speed, dt, e.alive, teleported) : e.alive && !teleported && speed > .6;
      if (!isPlayer) st.move += ((moving ? 1 : 0) - st.move) * (1 - Math.exp(-dt * 12));
      if (moving) st.walk += Math.min(speed, 12) * dt * 1.75;
      st.yaw += angDiff(e.facing || 0, st.yaw) * (1 - Math.exp(-dt * 14));
      if ((e.attackFlash || 0) > st.flash + .05) st.atk = 0; st.flash = e.attackFlash || 0;
      if (st.atk >= 0) { st.atk += dt / .42; if (st.atk >= 1) st.atk = -1; }
      st.gy += (groundY(e.x, e.y) - st.gy) * (1 - Math.exp(-dt * 16));
      if (!e.alive && e.type !== 'tower' && e.type !== 'core') { st.dead += dt; st.fade = 1 - smooth(e.type === 'hero' ? 1.3 : .35, e.type === 'hero' ? 2.1 : .6, st.dead); st.hidden = st.fade <= .01; }
      else { st.dead = 0; st.fade = 1; st.hidden = false; }
    }
    return st;
  }
  _unit(e, st, p, T, fa) {
    const hit = this.time - (e.lastHitTime ?? -9) < .09 && e.alive ? HIT_ADD : null, tm = TEAM[e.team] || TEAM.neutral;
    if (e.type === 'tower' || e.type === 'core') {
      const key = e.type + e.team + (e.tier || 0); let m = this.towerModels.get(key);
      if (!m) { const src = e.type === 'tower' ? tower(e.team, e.tier || 1) : core(e.team); m = { base: mesh(this.gl, src.base), gem: mesh(this.gl, src.gem), ruin: mesh(this.gl, src.ruin), gemY: src.gemY }; this.towerModels.set(key, m); }
      const root = M.translate(e.x, 0, e.y);
      if (!e.alive) { this._draw(m.ruin, root); return 1; }
      this._draw(m.base, root, null, hit);
      const c = hex(tm), bob = Math.sin(T * 1.6 + e.id) * .12, shielded = e.protected ? .55 : 1;
      if (e.type === 'tower') { this._draw(m.gem, M.chain(M.translate(e.x, m.gemY + bob, e.y), M.rotY(T * .9 + e.id)), [shielded, shielded, shielded, 1], hit); this._bill(fa, e.x, m.gemY + bob + .7, e.y, 1.7, BLOB, [c[0], c[1], c[2], .33 * shielded]); }
      else { this._draw(m.gem, M.chain(M.translate(e.x, m.gemY + bob * .6, e.y), M.rotY(T * .35)), null, hit); this._bill(fa, e.x, m.gemY + 2.6, e.y, 5.2, BLOB, [c[0], c[1], c[2], .3 + Math.sin(T * 2) * .05]); this._bill(fa, e.x, m.gemY + 4.4, e.y, 1.5 + Math.sin(T * 3) * .15, SPARK, [1, 1, 1, .75]); }
      return 2;
    }
    let model, scale = 1;
    if (e.type === 'hero') { model = this._hero(e.heroId); scale = HERO_SCALE; }
    else if (e.type === 'minion') { scale = e.variant === 'super' ? .82 : e.variant === 'siege' ? .95 : MINION_SCALE; model = this._model(`minion:${e.variant}:${e.team}`, () => e.variant === 'siege' ? siegeCart(e.team) : minion(e.variant, e.team)); }
    else { scale = MONSTER_SCALE[e.variant] || 1; model = this._model('monster:' + e.variant, MONSTER_BUILDERS[e.variant] || MONSTER_BUILDERS.mossback); }
    const fall = e.alive ? 0 : smooth(0, e.type === 'hero' ? .5 : .3, st.dead), sink = e.alive ? 0 : (1 - st.fade) * .9;
    let root = M.chain(M.translate(e.x, st.gy - sink, e.y), M.rotY(Math.PI / 2 - st.yaw));
    if (fall > 0) root = M.chain(root, M.rotX(-fall * 1.5), M.translate(0, fall * .1, 0));
    if (e.stunTimer > 0 && e.alive) root = M.mul(root, M.rotZ(Math.sin(T * 14) * .06));
    root = M.mul(root, M.scale(scale));
    const stealth = e.invisibleTimer > 0, tint = stealth ? STEALTH : e.alive ? null : [.62, .62, .66, 1];
    this._drawModel(model, root, { walk: st.walk, move: e.alive ? st.move : 0, atk: e.alive ? st.atk : -1, t: T + e.id }, tint, hit);
    if (e.type === 'hero' && e.alive && e.shield > 0) this._bill(fa, e.x, st.gy + 1.2, e.y, 1.7, BLOB, [1, .9, .55, .22]);
    return 7;
  }
  _effects(world, dt, fg, fa, p) {
    const col = (c, a) => { const h = hex(c || '#ffffff'); return [h[0], h[1], h[2], a]; };
    for (const fx of world.effects || []) {
      const k = clamp(fx.life / (fx.maxLife || .45), 0, 1), y = groundY(fx.x, fx.y);
      if (fx.kind === 'cast') {
        if (fx.id > this.seenFx && !fx.zone && !fx.cone) { // a fresh cast: spawn a render-side magic circle that outlives the 0.45 s sim effect
          const heroId = HEROES.find(h => h.color === fx.color)?.id, purple = PURPLE_CASTERS.has(heroId);
          this.circles.push({ x: fx.x, y: fx.y, r: clamp((fx.radius || 2) * 1.05, 3.0, 5.6), age: 0, life: 1.0, rot: fx.id, color: purple ? [.74, .45, 1] : [1, .82, .3], purple });
        } else if (fx.cone) this._arc(fg, fx.x, fx.y, y + .05, .5, fx.radius, (fx.facing || 0) - Math.PI / 6, (fx.facing || 0) + Math.PI / 6, col(fx.color, .7 * (1 - k * .5)));
        else if (fx.zone) this._flat(fg, fx.x, fx.y, (fx.radius || 2) * (1.15 - k * .25), RING, col(fx.color, k * .8));
      } else if (fx.kind === 'ring') {
        const grow = fx.followId || fx.zone ? 1 : 1 - k * .25, a = fx.maxLife > 1.2 ? Math.min(1, fx.life * 2) * .85 : k * .9;
        this._flat(fg, fx.x, fx.y, (fx.radius || 1) * 1.11 * grow, RING, col(fx.color, a));
        if (fx.zone) this._flat(fg, fx.x, fx.y, (fx.radius || 1), BLOB, col(fx.color, a * .2));
      } else if (fx.kind === 'heal') {
        this._flat(fg, fx.x, fx.y, (fx.radius || 1.8) * (1.2 - k * .4), RING, col(fx.color || '#72f2a3', k * .9));
        for (let i = 0; i < 4; i++) { const a = fx.id + i * 1.6; this._bill(fa, fx.x + Math.cos(a) * .7, y + .4 + (1 - k) * 2.2 + i * .25, fx.y + Math.sin(a) * .7, .26, SPARK, col(fx.color || '#72f2a3', k)); }
      } else if (fx.kind === 'projectile') {
        const t = 1 - k, x = lerp(fx.x, fx.toX ?? fx.x, t), z = lerp(fx.y, fx.toY ?? fx.y, t), h = y + 1.25, r = (fx.radius || .22) * 2.4, c = col(fx.color, 1);
        this._bill(fa, x, h, z, r * 1.6, BLOB, [c[0], c[1], c[2], .55]); this._bill(fa, x, h, z, r * .9, SPARK, [1, 1, 1, .95]);
        const bx = lerp(fx.x, fx.toX ?? fx.x, Math.max(0, t - .18)), bz = lerp(fx.y, fx.toY ?? fx.y, Math.max(0, t - .18)); this._ribbon(fa, bx, bz, x, z, h, r * .5, [c[0], c[1], c[2], .5]);
      } else if (fx.kind === 'beam') {
        const c = col(fx.color, k * .85), w = Math.max(.25, (fx.radius || .6) * .55);
        this._ribbon(fa, fx.x, fx.y, fx.toX ?? fx.x, fx.toY ?? fx.y, y + 1.0, w, c); this._ribbon(fa, fx.x, fx.y, fx.toX ?? fx.x, fx.toY ?? fx.y, y + 1.0, w * .35, [1, 1, 1, k * .8]);
      } else if (fx.kind === 'slash') {
        const f = fx.facing ?? 0, sweep = (1 - k) * 1.4 - .7, r = fx.radius || 2;
        this._arc(fa, fx.x, fx.y, y + 1.05, r * .45, r * 1.05, f + sweep - .9, f + sweep + .5, col(fx.color || '#ffe9c0', k * .9));
      } else if (fx.kind === 'hit') this._bill(fa, fx.x, y + 1.1, fx.y, .5 + (1 - k) * .5, SPARK, col(fx.color, k));
      else if (fx.kind === 'death') this._flat(fg, fx.x, fx.y, (fx.radius || 1.5) * (1.3 - k * .8), RING, col(fx.color, k * .8));
      if (fx.id > this.seenFx) this._maxFx = Math.max(this._maxFx || 0, fx.id);
    }
    if (this._maxFx) this.seenFx = Math.max(this.seenFx, this._maxFx);
    // magic circles: gold star ring (purple variant for the mage and assassin), ~1 s
    this.circles = this.circles.filter(c => (c.age += dt) < c.life);
    for (const c of this.circles) {
      const t = c.age / c.life, a = smooth(0, .12, t) * (1 - smooth(.65, 1, t)), s = c.r * (.55 + .45 * smooth(0, .18, t)), col4 = [c.color[0], c.color[1], c.color[2], a];
      this._flat(fg, c.x, c.y, s * 1.02, CIRCLE, col4, c.rot + this.clock * .9); this._flat(fg, c.x, c.y, s * .5, CIRCLE, [1, 1, .9, a * .55], -c.rot - this.clock * 1.6);
      this._flat(fa, c.x, c.y, s * 1.15, BLOB, [c.color[0], c.color[1], c.color[2], a * .28]);
    }
  }
  // ---- 2D overlay: health bars, names, floating numbers ------------------------
  _overlay(world, units, p, team) {
    const c = this.octx; if (!c) return;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.width, this.height); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    const bar = (x, y, w, h, frac, color, shield = 0) => {
      c.fillStyle = 'rgba(8,12,22,.82)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2); c.fillStyle = color; c.fillRect(x - w / 2, y, w * clamp(frac, 0, 1), h);
      if (shield > 0) { c.fillStyle = '#f4f1dc'; c.fillRect(x - w / 2 + w * clamp(frac, 0, 1) - w * Math.min(shield, frac), y, w * Math.min(shield, frac), h * .45); }
    };
    const k = clamp(this.scale / 44, .7, 1.5);
    for (const e of units) {
      const st = this.state.get(e.id); if (!e.alive || !st || st.hidden) continue;
      const structure = e.type === 'tower' || e.type === 'core', top = e.type === 'hero' ? HERO_HEIGHT + .35 : e.type === 'minion' ? (e.variant === 'super' ? 2.3 : e.variant === 'siege' ? 1.9 : 1.6) : e.type === 'tower' ? 6.9 : e.type === 'core' ? 7.6 : 2.3 * (MONSTER_SCALE[e.variant] || 1) + .3;
      const s = this.project(e.x, st.gy + top, e.y); if (s.w <= 0 || s.x < -80 || s.x > this.width + 80 || s.y < -40 || s.y > this.height + 60) continue;
      const frac = e.hp / (e.maxHp || 1), ally = e.team === team, color = e === p ? '#4fdc5c' : e.team === 'neutral' ? '#e2b53e' : ally ? '#3f9bff' : '#f04a40';
      if (e.type === 'hero') {
        const w = 66 * k, h = 7 * k; bar(s.x, s.y, w, h, frac, color, e.shield / (e.maxHp || 1));
        c.strokeStyle = 'rgba(8,12,22,.5)'; c.lineWidth = 1; for (let v = 1000; v < e.maxHp; v += 1000) { const x = s.x - w / 2 + w * v / e.maxHp; c.beginPath(); c.moveTo(x, s.y); c.lineTo(x, s.y + h * .6); c.stroke(); }
        if (e.maxMp > 0) bar(s.x, s.y + h + 2, w, 2.5 * k, e.mp / e.maxMp, '#4aa3ff');
        c.fillStyle = 'rgba(8,12,22,.9)'; c.beginPath(); c.arc(s.x - w / 2 - 9 * k, s.y + h * .6, 8.5 * k, 0, TAU); c.fill(); c.strokeStyle = color; c.lineWidth = 1.5; c.stroke();
        c.font = `700 ${Math.round(10.5 * k)}px system-ui,sans-serif`; c.fillStyle = '#fff'; c.fillText(String(e.level || 1), s.x - w / 2 - 9 * k, s.y + h * .6 + .5);
        c.font = `700 ${Math.round(12.5 * k)}px "Microsoft YaHei","PingFang SC",system-ui,sans-serif`; c.lineWidth = 3; c.strokeStyle = 'rgba(6,10,20,.85)'; c.strokeText(e.name, s.x, s.y - 10 * k); c.fillStyle = e === p ? '#ffe9a6' : ally ? '#cfe6ff' : '#ffd0cb'; c.fillText(e.name, s.x, s.y - 10 * k);
      } else if (structure) { if (frac < 1 || !e.protected) bar(s.x, s.y, 84 * k, 7 * k, frac, color); }
      else if (e.type === 'minion') bar(s.x, s.y, 30 * k, 4 * k, frac, color);
      else if (frac < 1 || e.radius > 1.5) bar(s.x, s.y, (e.radius > 1.5 ? 90 : 44) * k, 5 * k, frac, color);
    }
    for (const fx of world.effects || []) if (fx.kind === 'text') { // damage numbers rise from above the target's head
      const t = 1 - clamp(fx.life / (fx.maxLife || .75), 0, 1), s = this.project(fx.x + Math.sin(fx.id * 2.4) * .35, groundY(fx.x, fx.y) + 2.3 + t * 1.7, fx.y); if (s.w <= 0) continue;
      const size = Math.round((15 + Math.min(9, String(fx.text).length * 1.5)) * k * (1 + .35 * (1 - smooth(0, .18, t))));
      c.globalAlpha = 1 - smooth(.6, 1, t); c.font = `800 ${size}px system-ui,sans-serif`; c.lineWidth = 3.5; c.strokeStyle = 'rgba(20,10,6,.9)'; c.strokeText(fx.text, s.x, s.y); c.fillStyle = fx.color || '#ffe3a5'; c.fillText(fx.text, s.x, s.y); c.globalAlpha = 1;
    }
  }
}
const IDENT = M.ident(), HIT_ADD = new Float32Array([.28, .26, .22]), STEALTH = new Float32Array([.5, .58, .9, 1]);

// Hero-select stage: one hero standing on a purple-and-gold round pedestal.
export class HeroStage extends GLBase {
  constructor(canvas) {
    super(canvas, { alpha: true, premultipliedAlpha: false });
    const g = new Geo(), gold = '#e7bd55';
    g.color('#3a2a66').cyl(1.95, 1.75, .3, 40).color(gold).cyl(1.8, 1.78, .12, 40, 0, .3, 0).color('#6b46b8').ring(0, 1.72, 40, 0, .425, 0).color('#8a63d6').ring(1.1, 1.45, 40, 0, .43, 0)
      .color(hex(gold, .7)).ring(1.5, 1.6, 40, 0, .435, 0).ring(.92, .98, 32, 0, .435, 0).star(.9, 5, .07, 0, .44, 0).color(hex('#fff0b8', .9)).star(.42, 5, .05, 0, .445, 0);
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.color(hex(gold, .6)).ring(0, .06, 6, Math.cos(a) * 1.3, .44, Math.sin(a) * 1.3); }
    this.pedestal = mesh(this.gl, g); this.heroId = 'fighter'; this.clock = 0;
  }
  setHero(id) { if (id !== this.heroId) { this.heroId = id; this.spin = 0; } }
  draw(dt = 1 / 60) {
    const gl = this.gl, c = this.canvas, w = Math.max(1, Math.round(c.clientWidth * Math.min(devicePixelRatio || 1, 2))), h = Math.max(1, Math.round(c.clientHeight * Math.min(devicePixelRatio || 1, 2)));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.clock += dt; const T = this.clock;
    this.eye = [0, 2.75, 7.1]; this.vp = M.mul(M.perspective(34 * Math.PI / 180, w / h, .5, 40), M.lookAt(this.eye, [0, 1.42, 0]), new Float32Array(16));
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    this._useMesh(0); this._draw(this.pedestal, M.rotY(T * .15));
    const cycle = T % 4.2, atk = cycle > 3.2 ? (cycle - 3.2) / 1.0 : -1;
    this._drawModel(this._hero(this.heroId), M.chain(M.translate(0, .43, 0), M.rotY(Math.sin(T * .5) * .45 + .2), M.scale(1.02)), { walk: 0, move: 0, atk, t: T });
    gl.bindVertexArray(null);
  }
}
