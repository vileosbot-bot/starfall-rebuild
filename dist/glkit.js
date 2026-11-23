// Minimal WebGL2 toolkit for the Starfall 3D renderer: matrix maths, a procedural
// geometry builder and the three shader programs. Original code, no dependencies.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
export function hex(color, emissive = 0) {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, emissive];
}
export const shade = (c, k) => [clamp(c[0] * k, 0, 1), clamp(c[1] * k, 0, 1), clamp(c[2] * k, 0, 1), c[3] ?? 0];

// ---- mat4 (column-major Float32Array) -------------------------------------
export const M = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b, o = new Float32Array(16)) {
    const r = M._t;
    for (let c = 0; c < 4; c++) for (let w = 0; w < 4; w++)
      r[c * 4 + w] = a[w] * b[c * 4] + a[4 + w] * b[c * 4 + 1] + a[8 + w] * b[c * 4 + 2] + a[12 + w] * b[c * 4 + 3];
    o.set(r); return o;
  },
  _t: new Float32Array(16),
  trs(x, y, z, ry = 0, s = 1) { // translate * rotateY * uniform scale
    const m = new Float32Array(16), c = Math.cos(ry) * s, n = Math.sin(ry) * s;
    m[0] = c; m[2] = -n; m[5] = s; m[8] = n; m[10] = c; m[12] = x; m[13] = y; m[14] = z; m[15] = 1; return m;
  },
  translate(x, y, z) { const m = M.ident(); m[12] = x; m[13] = y; m[14] = z; return m; },
  scale(x, y = x, z = x) { const m = M.ident(); m[0] = x; m[5] = y; m[10] = z; return m; },
  rotX(a) { const m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  rotY(a) { const m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  rotZ(a) { const m = M.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  chain(...ms) { let r = ms[0]; for (let i = 1; i < ms.length; i++) r = M.mul(r, ms[i]); return r; },
  // rotate about a pivot: T(p) * R * T(-p)
  pivot(p, r) { return M.chain(M.translate(p[0], p[1], p[2]), r, M.translate(-p[0], -p[1], -p[2])); },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = 2 * far * near / (near - far); return m;
  },
  lookAt(e, t, up = [0, 1, 0]) {
    let zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2]; const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; const xl = Math.hypot(xx, xy, xz); xx /= xl; xy /= xl; xz /= xl;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx, m = new Float32Array(16);
    m[0] = xx; m[1] = yx; m[2] = zx; m[4] = xy; m[5] = yy; m[6] = zy; m[8] = xz; m[9] = yz; m[10] = zz;
    m[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); m[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); m[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); m[15] = 1; return m;
  },
  invert(a) {
    const o = new Float32Array(16), b = new Float64Array(12);
    b[0] = a[0] * a[5] - a[1] * a[4]; b[1] = a[0] * a[6] - a[2] * a[4]; b[2] = a[0] * a[7] - a[3] * a[4]; b[3] = a[1] * a[6] - a[2] * a[5];
    b[4] = a[1] * a[7] - a[3] * a[5]; b[5] = a[2] * a[7] - a[3] * a[6]; b[6] = a[8] * a[13] - a[9] * a[12]; b[7] = a[8] * a[14] - a[10] * a[12];
    b[8] = a[8] * a[15] - a[11] * a[12]; b[9] = a[9] * a[14] - a[10] * a[13]; b[10] = a[9] * a[15] - a[11] * a[13]; b[11] = a[10] * a[15] - a[11] * a[14];
    const d = 1 / (b[0] * b[11] - b[1] * b[10] + b[2] * b[9] + b[3] * b[8] - b[4] * b[7] + b[5] * b[6]);
    o[0] = (a[5] * b[11] - a[6] * b[10] + a[7] * b[9]) * d; o[1] = (a[2] * b[10] - a[1] * b[11] - a[3] * b[9]) * d;
    o[2] = (a[13] * b[5] - a[14] * b[4] + a[15] * b[3]) * d; o[3] = (a[10] * b[4] - a[9] * b[5] - a[11] * b[3]) * d;
    o[4] = (a[6] * b[8] - a[4] * b[11] - a[7] * b[7]) * d; o[5] = (a[0] * b[11] - a[2] * b[8] + a[3] * b[7]) * d;
    o[6] = (a[14] * b[2] - a[12] * b[5] - a[15] * b[1]) * d; o[7] = (a[8] * b[5] - a[10] * b[2] + a[11] * b[1]) * d;
    o[8] = (a[4] * b[10] - a[5] * b[8] + a[7] * b[6]) * d; o[9] = (a[1] * b[8] - a[0] * b[10] - a[3] * b[6]) * d;
    o[10] = (a[12] * b[4] - a[13] * b[2] + a[15] * b[0]) * d; o[11] = (a[9] * b[2] - a[8] * b[4] - a[11] * b[0]) * d;
    o[12] = (a[5] * b[7] - a[4] * b[9] - a[6] * b[6]) * d; o[13] = (a[0] * b[9] - a[1] * b[7] + a[2] * b[6]) * d;
    o[14] = (a[13] * b[1] - a[12] * b[3] - a[14] * b[0]) * d; o[15] = (a[8] * b[3] - a[9] * b[1] + a[10] * b[0]) * d; return o;
  },
  // returns [x,y,z,w] in clip space
  project(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]]; }
};

// ---- geometry builder ------------------------------------------------------
// Non-indexed triangles; vertex = position(3) normal(3) colour rgba(4), alpha channel = emissive
// amount for lit meshes or opacity for decals.
export class Geo {
  constructor() { this.buf = new Float32Array(3000); this.n = 0; this.m = null; this.c = [1, 1, 1, 0]; }
  _v(p, nr, c) { // append one vertex (10 floats), growing the buffer geometrically
    if (this.n + 10 > this.buf.length) { const b = new Float32Array(this.buf.length * 2); b.set(this.buf); this.buf = b; }
    const b = this.buf, o = this.n; b[o] = p[0]; b[o + 1] = p[1]; b[o + 2] = p[2]; b[o + 3] = nr[0]; b[o + 4] = nr[1]; b[o + 5] = nr[2]; b[o + 6] = c[0]; b[o + 7] = c[1]; b[o + 8] = c[2]; b[o + 9] = c[3] ?? 0; this.n = o + 10;
  }
  color(c, emissive) { this.c = typeof c === 'string' ? hex(c, emissive ?? 0) : emissive == null ? c : [c[0], c[1], c[2], emissive]; return this; }
  at(m) { this.m = m; return this; } // local transform applied to subsequently added primitives
  _p(x, y, z) { const m = this.m; return m ? [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]] : [x, y, z]; }
  _n(x, y, z) { const m = this.m; if (!m) return [x, y, z]; const a = m[0] * x + m[4] * y + m[8] * z, b = m[1] * x + m[5] * y + m[9] * z, c = m[2] * x + m[6] * y + m[10] * z, l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; }
  // raw triangle in local space with optional per-vertex normals / colours
  tri(a, b, c, na, nb, nc, ca, cb, cc) {
    const A = this._p(...a), B = this._p(...b), C = this._p(...c);
    let NA, NB, NC;
    if (na) { NA = this._n(...na); NB = this._n(...nb); NC = this._n(...nc); }
    else {
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; NA = NB = NC = [nx / l, ny / l, nz / l];
    }
    this._v(A, NA, ca || this.c); this._v(B, NB, cb || this.c); this._v(C, NC, cc || this.c); return this;
  }
  quad(a, b, c, d) { return this.tri(a, b, c).tri(a, c, d); }
  box(w, h, d, x = 0, y = 0, z = 0) { // centred on x,z; base at y
    const x0 = x - w / 2, x1 = x + w / 2, y0 = y, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
    return this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]).quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0])
      .quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]).quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0])
      .quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]).quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
  }
  // frustum / cylinder / cone along +Y, base radius r0 at y, top radius r1 at y+h
  cyl(r0, r1, h, seg = 10, x = 0, y = 0, z = 0, { caps = true, smooth: sm = true, phase = 0 } = {}) {
    for (let i = 0; i < seg; i++) {
      const a0 = phase + i / seg * TAU, a1 = phase + (i + 1) / seg * TAU, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const p0 = [x + c0 * r0, y, z + s0 * r0], p1 = [x + c1 * r0, y, z + s1 * r0], p2 = [x + c1 * r1, y + h, z + s1 * r1], p3 = [x + c0 * r1, y + h, z + s0 * r1];
      const k = (r0 - r1) / (h || 1), n0 = [c0, k, s0], n1 = [c1, k, s1];
      if (sm) { this.tri(p0, p2, p1, n0, n1, n1); if (r1 > 1e-4) this.tri(p0, p3, p2, n0, n0, n1); }
      else { this.tri(p0, p2, p1); if (r1 > 1e-4) this.tri(p0, p3, p2); }
      if (caps) { if (r1 > 1e-4) this.tri([x, y + h, z], p2, p3, [0, 1, 0], [0, 1, 0], [0, 1, 0]); if (r0 > 1e-4) this.tri([x, y, z], p0, p1, [0, -1, 0], [0, -1, 0], [0, -1, 0]); }
    }
    return this;
  }
  // ellipsoid; v0..v1 select a latitude band (0 = top pole, 1 = bottom pole)
  sphere(rx, ry = rx, rz = rx, x = 0, y = 0, z = 0, seg = 10, rings = 7, v0 = 0, v1 = 1) {
    const P = (u, v) => { const th = u * TAU, ph = v * Math.PI, sp = Math.sin(ph); return [Math.cos(th) * sp, Math.cos(ph), Math.sin(th) * sp]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const u0 = i / seg, u1 = (i + 1) / seg, w0 = v0 + (v1 - v0) * j / rings, w1 = v0 + (v1 - v0) * (j + 1) / rings;
      const n = [P(u0, w0), P(u1, w0), P(u1, w1), P(u0, w1)], p = n.map(q => [x + q[0] * rx, y + q[1] * ry, z + q[2] * rz]);
      const nn = n.map(q => { const a = q[0] / rx, b = q[1] / ry, c = q[2] / rz, l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; });
      if (w0 > 1e-4) this.tri(p[0], p[1], p[2], nn[0], nn[1], nn[2]);
      if (w1 < 1 - 1e-4) this.tri(p[0], p[2], p[3], nn[0], nn[2], nn[3]);
      else if (w0 <= 1e-4) this.tri(p[0], p[2], p[3], nn[0], nn[2], nn[3]);
    }
    return this;
  }
  // flat horizontal annulus (or disc when r0 = 0) facing up
  ring(r0, r1, seg = 32, x = 0, y = 0, z = 0, a0 = 0, a1 = TAU) {
    const up = [0, 1, 0];
    for (let i = 0; i < seg; i++) {
      const t0 = a0 + (a1 - a0) * i / seg, t1 = a0 + (a1 - a0) * (i + 1) / seg, c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
      const o0 = [x + c0 * r1, y, z + s0 * r1], o1 = [x + c1 * r1, y, z + s1 * r1];
      if (r0 <= 1e-5) this.tri([x, y, z], o1, o0, up, up, up);
      else { const i0 = [x + c0 * r0, y, z + s0 * r0], i1 = [x + c1 * r0, y, z + s1 * r0]; this.tri(i0, o1, o0, up, up, up).tri(i0, i1, o1, up, up, up); }
    }
    return this;
  }
  // flat ground line segment of given width (for star / rune decals)
  line(x0, z0, x1, z1, w, y = 0) {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2, up = [0, 1, 0];
    return this.tri([x0 - nx, y, z0 - nz], [x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], up, up, up).tri([x0 - nx, y, z0 - nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], up, up, up);
  }
  // n-pointed star outline on the ground
  star(r, n = 5, w = .1, x = 0, y = 0, z = 0, phase = -Math.PI / 2, step = 2) {
    for (let i = 0; i < n; i++) { const a = phase + i * TAU / n, b = phase + (i + step) * TAU / n; this.line(x + Math.cos(a) * r, z + Math.sin(a) * r, x + Math.cos(b) * r, z + Math.sin(b) * r, w, y); }
    return this;
  }
  // extruded polygon (points [[x,z],...] in either winding) from y0 to y1
  prism(pts, y0, y1, sideColor, topColor) {
    let area = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const p = area > 0 ? pts.slice().reverse() : pts, keep = this.c;
    if (sideColor) this.c = sideColor;
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; this.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]); }
    if (topColor) this.c = topColor;
    let cx = 0, cz = 0; for (const q of p) { cx += q[0]; cz += q[1]; } cx /= p.length; cz /= p.length;
    // ear-free fan from centroid is adequate for the mildly concave map polygons used here
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; this.tri([cx, y1, cz], [a[0], y1, a[1]], [b[0], y1, b[1]], [0, 1, 0], [0, 1, 0], [0, 1, 0]); }
    this.c = keep; return this;
  }
  // octahedral / bipyramid crystal: n sides, radius r, total height h, girdle at fraction k
  crystal(r, h, n = 6, x = 0, y = 0, z = 0, k = .32) {
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, p0 = [x + Math.cos(a0) * r, y + h * k, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, y + h * k, z + Math.sin(a1) * r];
      this.tri([x, y + h, z], p1, p0).tri([x, y, z], p0, p1);
    }
    return this;
  }
  data() { return this.buf.subarray(0, this.n); }
  get count() { return this.n / 10; }
}

// ---- GL wrappers -----------------------------------------------------------
function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
  return s;
}
export function program(gl, vs, fs, uniforms) {
  const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const u = {}; for (const name of uniforms) u[name] = gl.getUniformLocation(p, name);
  return { p, u };
}
export function mesh(gl, geo) {
  const data = geo instanceof Float32Array ? geo : geo.data(), vao = gl.createVertexArray(), buf = gl.createBuffer();
  gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 24);
  gl.bindVertexArray(null);
  return { vao, buf, count: data.length / 10 };
}
export function canvasTexture(gl, canvas, { repeat = false, mip = true } = {}) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  return t;
}

// ---- shaders ---------------------------------------------------------------
export const MESH_VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol;
uniform mat4 uVP, uM; out vec3 vN; out vec4 vC; out vec3 vW;
void main(){ vec4 w = uM * vec4(aPos, 1.0); vW = w.xyz; vN = mat3(uM) * aNrm; vC = aCol; gl_Position = uVP * w; }`;
// uMode 0: lit, vertex alpha = emissive. uMode 1: unlit decal, vertex alpha = opacity.
export const MESH_FS = `#version 300 es
precision mediump float;
in vec3 vN; in vec4 vC; in vec3 vW; uniform vec4 uTint; uniform vec3 uAdd; uniform int uMode; uniform vec3 uEye; out vec4 o;
void main(){
  if (uMode == 1) { o = vec4(vC.rgb * uTint.rgb + uAdd, vC.a * uTint.a); return; }
  vec3 n = normalize(vN), L = normalize(vec3(-0.42, 0.80, 0.43)), v = normalize(uEye - vW);
  if (dot(n, v) < 0.0) n = -n; // winding-agnostic: every solid is viewed from outside
  float d = dot(n, L), wrap = clamp(d * 0.55 + 0.45, 0.0, 1.0);
  vec3 hemi = mix(vec3(0.46, 0.50, 0.44), vec3(0.62, 0.70, 0.86), n.y * 0.5 + 0.5);
  vec3 lit = vC.rgb * uTint.rgb * (hemi * 0.62 + vec3(1.0, 0.95, 0.84) * wrap * 0.72);
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  lit += rim * 0.10 * vec3(0.8, 0.9, 1.0);
  vec3 c = mix(lit, vC.rgb * uTint.rgb * 1.25, clamp(vC.a, 0.0, 1.0)) + uAdd;
  o = vec4(c, uTint.a);
}`;

export const GROUND_VS = `#version 300 es
layout(location=0) in vec3 aPos; uniform mat4 uVP; out vec2 vW;
void main(){ vW = aPos.xz; gl_Position = uVP * vec4(aPos, 1.0); }`;
// Mask A: R lane stone, G river, B tall-grass floor. Mask B: R camp dirt, G base plaza, B map interior.
// Detail comes from two small tiling textures baked once on the CPU (noise + flagstones), so the
// per-pixel cost is a handful of texture fetches: cheap on low-end phones and software GL alike.
export const GROUND_FS = `#version 300 es
precision highp float;
in vec2 vW; uniform sampler2D uMaskA, uMaskB, uNoise, uStone; uniform float uTime, uExtent; uniform int uDetail; out vec4 o;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = vW / (uExtent * 2.0) + 0.5; vec4 a = texture(uMaskA, uv), b = texture(uMaskB, uv);
  vec4 nz = texture(uNoise, vW / 48.0); float n1 = nz.r, n2 = nz.g, n3 = texture(uNoise, vW / 8.0).g;
  float wob = (n2 - 0.5) * 0.16;
  // grass
  vec3 col = mix(vec3(0.36, 0.60, 0.20), vec3(0.50, 0.72, 0.26), smoothstep(0.25, 0.75, n1 * 0.65 + n2 * 0.35));
  col = mix(col, vec3(0.58, 0.79, 0.31), smoothstep(0.62, 0.9, n3) * 0.35);
  col *= 0.93 + 0.12 * texture(uNoise, vW / 3.4).b;
  float bush = smoothstep(0.4, 0.6, a.b + wob); col = mix(col, vec3(0.20, 0.44, 0.17) * (0.85 + 0.3 * n3), bush * 0.85);
  float dirt = smoothstep(0.42, 0.58, b.r + wob * 0.6); col = mix(col, vec3(0.34, 0.23, 0.15) * (0.8 + 0.4 * n2), dirt);
  // stone lanes and base plaza: irregular flagstones
  float stone = max(smoothstep(0.44, 0.56, a.r + wob), smoothstep(0.45, 0.55, b.g + wob * 0.5));
  if (stone > 0.001) {
    vec3 s = uDetail > 0 ? texture(uStone, vW / 13.0).rgb * (0.92 + 0.14 * n3) : vec3(0.68, 0.65, 0.58) * (0.9 + 0.2 * n2);
    s = mix(s, vec3(0.42, 0.50, 0.30), (1.0 - smoothstep(0.5, 0.75, max(a.r, b.g) + wob)) * 0.55); // mossy rim
    col = mix(col, s, stone);
  }
  // river: bright blue water, drifting highlights, expanding ripple rings, foam at the bank
  float water = smoothstep(0.46, 0.54, a.g + wob * 0.7);
  if (water > 0.001) {
    float depth = smoothstep(0.5, 0.95, a.g);
    float c1 = texture(uNoise, vW / 21.0 + vec2(uTime * 0.011, -uTime * 0.008)).a, c2 = texture(uNoise, vW / 9.0 - vec2(uTime * 0.017, uTime * 0.006)).a;
    vec3 w = mix(vec3(0.30, 0.74, 0.86), vec3(0.14, 0.56, 0.80), depth);
    w += vec3(0.20, 0.24, 0.22) * smoothstep(0.58, 0.74, c1 * 0.6 + c2 * 0.4);
    vec2 cell = floor(vW / 4.2), lp = fract(vW / 4.2) - 0.5; float rnd = h21(cell + 9.1), ph = fract(uTime * 0.33 + rnd);
    vec2 rc = vec2(h21(cell + 1.7), h21(cell + 5.3)) * 0.5 - 0.25; float ringd = abs(length(lp - rc) - ph * 0.42);
    w += vec3(0.5) * smoothstep(0.022, 0.0, ringd) * (1.0 - ph) * step(0.35, rnd);
    w = mix(vec3(0.80, 0.93, 0.93), w, smoothstep(0.0, 0.2, a.g - 0.5 + wob * 0.6));
    col = mix(col, w, water);
  }
  // drifting soft light patches and the darker forest beyond the playable square
  col *= 0.94 + 0.10 * texture(uNoise, vW / 190.0 + uTime * 0.0004).r;
  col = mix(vec3(0.12, 0.26, 0.14) * (0.8 + 0.4 * n2), col, b.b);
  o = vec4(col, 1.0);
}`;

/** Tiling value-noise texture data: R 3-unit blotches, G fine, B grain, A water (at 48 units per tile). */
export function noiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4), periods = [16, 64, 128, 32];
  periods.forEach((period, ch) => {
    const r = rng(977 + ch * 131), lattice = new Float32Array(period * period); for (let i = 0; i < lattice.length; i++) lattice[i] = r();
    const at = (x, y) => lattice[(y % period) * period + (x % period)], k = period / size;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = x * k, fy = y * k, ix = Math.floor(fx), iy = Math.floor(fy); let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const v = lerp(lerp(at(ix, iy), at(ix + 1, iy), tx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), tx), ty);
      data[(y * size + x) * 4 + ch] = Math.round(v * 255);
    }
  });
  return { data, size };
}
/** Tiling irregular-flagstone texture (periodic Voronoi cells with dark grout), 13 world units per tile. */
export function stoneTexture(size = 512, cells = 8) {
  const r = rng(4242), pts = [], data = new Uint8Array(size * size * 4);
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) pts.push([i + .15 + .7 * r(), j + .15 + .7 * r(), r(), r()]);
  const P = (i, j) => pts[((j % cells) + cells) % cells * cells + ((i % cells) + cells) % cells];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = x / size * cells, fy = y / size * cells, cx = Math.floor(fx), cy = Math.floor(fy); let d1 = 9, d2 = 9, best = null;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const p = P(cx + i, cy + j), dx = cx + i - ((cx + i) % cells + cells) % cells + p[0] - fx, dy = cy + j - ((cy + j) % cells + cells) % cells + p[1] - fy, d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; best = p; } else if (d < d2) d2 = d; }
    const edge = d2 - d1, grout = smooth(.03, .1, edge), tone = best[2], speck = .94 + .12 * r(), bevel = 1 - .1 * (1 - smooth(0, .3, edge)) * (best[3] > .5 ? 1 : 0);
    const veinX = Math.abs(Math.sin((fx * 5.7 + Math.sin(fy * 3.2) * .24) * Math.PI * 2)), veinY = Math.abs(Math.sin((fy * 6.1 + Math.sin(fx * 2.7) * .22) * Math.PI * 2));
    const vein = 1 - smooth(.008, .075, Math.min(veinX, veinY)), pit = r() > .997 ? .76 : 1;
    const c = [lerp(.60, .77, tone), lerp(.57, .73, tone), lerp(.51, .65, tone)], o = (y * size + x) * 4;
    for (let k = 0; k < 3; k++) data[o + k] = Math.round(255 * lerp([.40, .39, .35][k], c[k] * speck * bevel * (1 - vein * .045) * pit, grout));
    data[o + 3] = 255;
  }
  return { data, size };
}
export function dataTexture(gl, { data, size }) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); gl.generateMipmap(gl.TEXTURE_2D);
  return t;
}

// Billboards / ground quads with a texture atlas-free single texture and tint.
export const FX_VS = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec2 aUV; layout(location=2) in vec4 aCol;
uniform mat4 uVP; out vec2 vUV; out vec4 vC;
void main(){ vUV = aUV; vC = aCol; gl_Position = uVP * vec4(aPos, 1.0); }`;
export const FX_FS = `#version 300 es
precision mediump float;
in vec2 vUV; in vec4 vC; uniform sampler2D uTex; out vec4 o;
void main(){ vec4 t = texture(uTex, vUV); o = vec4(t.rgb * vC.rgb, t.a * vC.a); }`;
