// Procedural low-poly models for the Starfall 3D renderer. Everything here is original
// geometry assembled from primitives; no external meshes or textures.
// A model is { groups: { name: Geo }, pivots: { name: [x,y,z] }, height, style }.
// Model space: +Y up, +Z forward, feet at y = 0, a hero is ~2.5 units tall.
import { Geo, M, TAU, hex, shade, rng } from './glkit.js';

const HIP = .55, SHOULDER_Y = 1.13, SHOULDER_X = .47, NECK = 1.22, HEAD_Y = 1.62, HEAD_R = .42;
export const PIVOTS = { body: [0, 0, 0], head: [0, NECK, 0], armL: [-SHOULDER_X, SHOULDER_Y, 0], armR: [SHOULDER_X, SHOULDER_Y, 0], legL: [-.17, HIP, 0], legR: [.17, HIP, 0], cape: [0, 1.26, -.26] };
const hand = side => [side * SHOULDER_X, .6, .04];
const TEAM = { blue: '#3f8cff', red: '#f0483e', neutral: '#d8c27a' };

function newGroups() { return { body: new Geo(), head: new Geo(), armL: new Geo(), armR: new Geo(), legL: new Geo(), legR: new Geo(), cape: new Geo() }; }

// Shared chibi body. o = { skin, torso, torso2, belt, arm, glove, leg, boot, shoulder, robe, bulk }
function body(g, o) {
  const k = o.bulk || 1;
  g.body.color(o.torso).at(M.scale(k, 1, .8 * k)).cyl(.33, .41, .7, 10, 0, .5, 0);
  g.body.color(o.belt || o.torso2).at(M.scale(k, 1, .82 * k)).cyl(.36, .36, .1, 10, 0, .5, 0);
  if (o.robe) g.body.color(o.robe).at(M.scale(k, 1, .9 * k)).cyl(.56, .33, .56, 12, 0, .04, 0);
  else g.body.color(o.torso2).at(M.scale(k, 1, .85 * k)).cyl(.44, .35, .24, 10, 0, .34, 0, { caps: false });
  g.body.at(null);
  if (o.chest) g.body.color(o.chest).at(M.translate(0, .82, .25 * k)).sphere(.27 * k, .25, .12);
  g.body.at(null);
  // Small baked-in armour seams and a raised clasp make silhouettes readable
  // without textures, post-processing, or per-frame work.
  const trim = o.trim || o.belt || o.torso2;
  g.body.color(trim).box(.28 * k, .11, .055, 0, .53, .34 * k);
  g.body.color(o.chest || o.shoulder || trim).box(.075 * k, .3, .045, 0, .83, .36 * k);
  g.body.color('#e8d5a0').sphere(.045 * k, .045, .025, 0, .53, .39 * k, 6, 4);
  for (const s of [-1, 1]) {
    const arm = s < 0 ? g.armL : g.armR, leg = s < 0 ? g.legL : g.legR;
    arm.color(o.arm).cyl(.1, .115, .5, 8, s * SHOULDER_X * k, .63, 0);
    arm.color(o.glove || o.skin).sphere(.125, .125, .125, s * SHOULDER_X * k, .6, .02, 8, 5);
    arm.color(trim).cyl(.12 * k, .12 * k, .075, 8, s * SHOULDER_X * k, .48, 0);
    if (o.shoulder) arm.color(o.shoulder).sphere(.21 * k, .17, .21 * k, s * SHOULDER_X * k, 1.17, 0, 8, 5);
    leg.color(o.leg).cyl(.125, .145, .4, 8, s * .17, .16, 0);
    leg.color(trim).box(.22 * k, .09, .055, s * .17, .25, .18);
    leg.color(o.boot).box(.25, .17, .36, s * .17, 0, .04);
  }
}
function head(g, o) {
  g.head.color(o.skin).sphere(HEAD_R, HEAD_R * .96, HEAD_R * .95, 0, HEAD_Y, 0, 12, 8);
  for (const s of [-1, 1]) {
    g.head.color('#1d1a22').sphere(.055, .09, .04, s * .15, HEAD_Y - .02, .375, 6, 4);
    g.head.color('#ffffff').sphere(.02, .028, .015, s * .15 + .018, HEAD_Y + .02, .41, 5, 3);
    if (o.cheek) g.head.color(o.cheek).sphere(.06, .035, .02, s * .26, HEAD_Y - .14, .32, 6, 3);
  }
}
const helmet = (g, color, band, depth = .55) => {
  g.head.color(color).sphere(HEAD_R + .045, HEAD_R + .05, HEAD_R + .045, 0, HEAD_Y + .01, 0, 12, 6, 0, depth);
  if (band) g.head.color(band).cyl(HEAD_R + .06, HEAD_R + .05, .07, 12, 0, HEAD_Y - .07, 0, { caps: false });
};
function cape(g, color, lining, w = .88, len = 1.08) {
  const p = PIVOTS.cape;
  g.cape.color(color).at(M.chain(M.translate(p[0], p[1], p[2]), M.rotX(-.1)));
  // two tapered slabs for a slightly flared silhouette
  g.cape.quad([-w * .36, 0, 0], [w * .36, 0, 0], [w * .5, -len, -.06], [-w * .5, -len, -.06]);
  g.cape.color(lining || shade(typeof color === 'string' ? hex(color) : color, .7)).quad([w * .36, 0, .03], [-w * .36, 0, .03], [-w * .5, -len, -.03], [w * .5, -len, -.03]);
  g.cape.at(null);
}
// blade polygon drawn in the X-Y plane (thin in Z); pts are [x,y]
function plate(geo, pts, thick, m) {
  geo.at(M.chain(m, M.rotX(-Math.PI / 2))).prism(pts.map(p => [p[0], p[1]]), -thick / 2, thick / 2).at(null);
}

// Colour adjacent facets of an existing band at build time. Vertex positions,
// triangle counts and animated groups are preserved.
function inlayBand(mesh, band, highlight, facets, build) {
  const start = mesh.n;
  build(mesh.color(band));
  const stride = (mesh.n - start) / facets;
  const rgb = hex(highlight).slice(0, 3);
  for (let facet = 0; facet < facets; facet += 2) {
    for (let i = start + facet * stride; i < start + (facet + 1) * stride; i += 10) {
      mesh.buf.set(rgb, i + 6);
    }
  }
}

// ---- heroes ----------------------------------------------------------------
function fighter() { // 程咬金: red cape, crested helmet, plate armour, great two-handed axe
  const g = newGroups(), gold = '#e0a63c', iron = '#4a4650', red = '#cf2f22';
  body(g, { skin: '#f2c391', torso: gold, torso2: iron, belt: '#7a2a1c', chest: '#f1c257', arm: iron, glove: '#7a4a2a', leg: '#5a3a2a', boot: iron, shoulder: gold, bulk: 1.06 });
  for (let i = 0; i < 4; i++) g.body.color(i % 2 ? gold : '#b9822c').at(M.chain(M.rotY(i * TAU / 4 + TAU / 8), M.translate(0, .3, .36))).box(.3, .26, .06).at(null); // tassets
  g.body.color('#9d4d25').quad([-.18,1.00,.354],[0,.89,.397],[.18,1.00,.354],[0,.82,.397]);
  head(g, { skin: '#f2c391', cheek: '#e79a7b' });
  helmet(g, iron, null, .5);
  inlayBand(g.head, gold, '#ffdc79', 12, band => band.cyl(.48, .46, .10, 12, 0, HEAD_Y + .045, 0, { caps: false }));
  g.head.color('#3a2a22').sphere(.2, .13, .1, 0, HEAD_Y - .23, .3, 7, 4); // beard
  inlayBand(g.head, gold, '#fff0a8', 6, band => band.cyl(.09, .07, .16, 6, 0, HEAD_Y + .44, 0));
  g.head.color(red).sphere(.1, .2, .26, 0, HEAD_Y + .66, -.1, 8, 6).sphere(.07, .12, .2, 0, HEAD_Y + .5, -.36, 6, 4); // plume
  cape(g, red, '#8f1f18');
  const h = hand(1), m = M.chain(M.translate(h[0], h[1], h[2]), M.rotX(.95));
  g.armR.color('#6b4a2b').at(m).cyl(.05, .05, 1.95, 6, 0, -.55, 0).color(gold).cyl(.08, .08, .12, 6, 0, 1.4, 0).cyl(.07, .0, .22, 6, 0, 1.52, 0).at(null);
  for (const s of [-1, 1]) {
    g.armR.color('#d5dbe2');
    plate(g.armR, [[s * .05, .95], [s * .5, .78], [s * .62, 1.2], [s * .5, 1.62], [s * .05, 1.45]], .06, m);
    g.armR.color(gold); plate(g.armR, [[s * .5, .78], [s * .6, .76], [s * .73, 1.2], [s * .6, 1.64], [s * .5, 1.62], [s * .62, 1.2]], .075, m);
  }
  return { groups: g, pivots: PIVOTS, height: 2.5, style: { twoHanded: true, attack: 'swing', armBase: -.55 } };
}
function tank() { // 樊哙: heavy steel, tower shield, short mace
  const g = newGroups(), steel = '#74808e', dark = '#48525e', gold = '#d9a441', brown = '#7a4e30';
  body(g, { skin: '#e9b98c', torso: steel, torso2: dark, belt: brown, chest: '#8c98a6', arm: dark, glove: brown, leg: '#4a3a30', boot: dark, shoulder: steel, bulk: 1.16 });
  head(g, { skin: '#e9b98c' });
  helmet(g, steel, null, .56);
  inlayBand(g.head, gold, '#f9d888', 12, band => band.cyl(.48, .46, .09, 12, 0, HEAD_Y + .045, 0, { caps: false }));
  g.head.color(dark).box(.1, .3, .08, 0, HEAD_Y - .12, .4); // nose guard
  for (const s of [-1, 1]) g.head.color('#e8e0cc').at(M.chain(M.translate(s * .42, HEAD_Y + .2, 0), M.rotZ(-s * .9))).cyl(.07, 0, .34, 6).at(null); // horns
  g.head.color('#4a3324').sphere(.24, .16, .12, 0, HEAD_Y - .25, .28, 7, 4);
  cape(g, brown, '#5a3822', .8, .9);
  const hl = hand(-1), sm = M.chain(M.translate(hl[0] - .12, hl[1] + .12, hl[2] + .2), M.rotY(-.25));
  g.armL.color(steel).at(sm).box(.78, 1.05, .09, 0, -.5, 0).color(gold).box(.84, .1, .11, 0, .5, 0).box(.84, .1, .11, 0, -.52, 0).box(.1, 1.05, .11, -.38, -.5, 0).box(.1, 1.05, .11, .38, -.5, 0)
    .at(M.chain(sm, M.translate(0, 0, .06), M.rotX(Math.PI / 2))).cyl(.2, .1, .1, 8).at(null);
  for (const side of [-1,1]) {
    g.armL.color('#314256').at(sm).quad([0,.28,.052],[side*.29,.38,.052],[side*.24,.25,.052],[0,.13,.052]).at(null);
  }
  const hr = hand(1), wm = M.chain(M.translate(hr[0], hr[1], hr[2]), M.rotX(.8));
  g.armR.color('#5d4630').at(wm).cyl(.05, .05, 1.0, 6, 0, -.2, 0).color(dark).cyl(.2, .2, .34, 8, 0, .72, 0).color(gold).cyl(.22, .22, .06, 8, 0, .86, 0).at(null);
  return { groups: g, pivots: PIVOTS, height: 2.4, style: { attack: 'swing', armBase: -.4, shield: true } };
}
function mage() { // 王昭君: indigo robe, long hair, pipa with a glowing string bridge
  const g = newGroups(), indigo = '#4353b4', cream = '#f6f0e6', red = '#c8324a';
  body(g, { skin: '#fbe0cf', torso: cream, torso2: indigo, belt: red, arm: indigo, leg: cream, boot: indigo, robe: indigo, bulk: .92 });
  inlayBand(g.body, '#7d9fe4', '#e6edff', 12, hem => hem.cyl(.58, .54, .11, 12, 0, .04, 0, { caps: false }));
  head(g, { skin: '#fbe0cf', cheek: '#f4a9a9' });
  g.head.color('#231c2c').sphere(HEAD_R + .05, HEAD_R + .05, HEAD_R + .05, 0, HEAD_Y + .02, -.03, 12, 6, 0, .5); // hair cap
  g.head.sphere(.3, .62, .16, 0, HEAD_Y - .5, -.36, 8, 6).sphere(.17, .17, .17, 0, HEAD_Y + .5, -.05, 8, 5); // long hair, bun
  g.head.color(red).sphere(.07, .07, .07, .2, HEAD_Y + .42, .12, 6, 4).color('#f3d27a').cyl(.02, .02, .5, 5, -.25, HEAD_Y + .35, -.05);
  cape(g, cream, '#c9d6f5', .8, 1.0);
  const h = hand(-1), m = M.chain(M.translate(h[0] + .2, h[1] + .25, h[2] + .26), M.rotZ(-.5), M.rotX(.15));
  g.armL.color('#a66a3a').at(m).sphere(.24, .32, .09, 0, 0, 0, 9, 6).color('#6f4324').cyl(.045, .04, .6, 6, 0, .25, 0).color('#f3d27a').box(.2, .05, .06, 0, .82, 0)
    .color(hex('#bfe4ff', .9)).box(.16, .03, .03, 0, -.08, .09).at(null);
  for (const x of [-.046,0,.046]) {
    g.armL.color('#ffe4ab').at(m).quad([x-.005,-.07,.097],[x+.005,-.07,.097],[x*.55+.005,.79,.048],[x*.55-.005,.79,.048]).at(null);
  }
  return { groups: g, pivots: PIVOTS, height: 2.3, style: { attack: 'cast', armBase: -.9, armLBase: -.75 } };
}
function marksman() { // 李广: teal coat, cream trousers, long bow and quiver
  const g = newGroups(), teal = '#2f8f8a', cream = '#e9e2cf', gold = '#c99a45', leather = '#7b5433';
  body(g, { skin: '#f0c79c', torso: teal, torso2: leather, belt: gold, chest: '#3aa39c', arm: teal, glove: leather, leg: cream, boot: leather, shoulder: leather });
  g.body.color(leather).quad([-.26,1.09,.26],[-.19,1.11,.30],[.07,.83,.389],[.01,.80,.389])
    .quad([.01,.80,.389],[.07,.83,.389],[.28,.60,.25],[.23,.56,.27]);
  head(g, { skin: '#f0c79c' });
  g.head.color('#2b2422').sphere(HEAD_R + .04, HEAD_R + .04, HEAD_R + .04, 0, HEAD_Y + .02, -.02, 12, 6, 0, .47);
  inlayBand(g.head, gold, '#f2e7bf', 12, band => band.cyl(.47, .46, .10, 12, 0, HEAD_Y + .1, 0, { caps: false }));
  g.head.color('#2b2422').sphere(.12, .12, .12, 0, HEAD_Y + .5, -.08, 5, 4).color('#eaf7f0').at(M.chain(M.translate(.1, HEAD_Y + .52, -.1), M.rotZ(-.5))).cyl(.03, 0, .4, 5).at(null); // topknot + feather
  g.body.color(leather).at(M.chain(M.translate(.22, .75, -.36), M.rotZ(.35))).cyl(.11, .12, .62, 8).color('#eaf7f0').cyl(.09, .02, .16, 6, 0, .62, 0).at(null); // quiver
  cape(g, teal, '#1f5f5c', .7, .8);
  const h = hand(-1), m = M.chain(M.translate(h[0], h[1], h[2] + .08));
  const seg = 9; g.armL.color('#8a5a2c');
  for (let i = 0; i < seg; i++) { // bow arc in the Y-Z plane
    const a0 = -1.15 + 2.3 * i / seg, a1 = -1.15 + 2.3 * (i + 1) / seg, r = .95, y0 = Math.sin(a0) * r, z0 = Math.cos(a0) * r - .55, y1 = Math.sin(a1) * r, z1 = Math.cos(a1) * r - .55;
    g.armL.at(M.chain(m, M.translate(0, (y0 + y1) / 2, (z0 + z1) / 2), M.rotX(Math.atan2(z1 - z0, y1 - y0)))).box(.055, Math.hypot(y1 - y0, z1 - z0) + .02, .07, 0, -Math.hypot(y1 - y0, z1 - z0) / 2, 0);
  }
  g.armL.color('#f4f0e2').at(m).box(.015, 1.74, .015, 0, -.87, -.16).at(null);
  return { groups: g, pivots: PIVOTS, height: 2.35, style: { attack: 'shoot', armBase: -.3, armLBase: -1.35 } };
}
function assassin() { // 荆轲: black garb, white hair and scarf, twin daggers
  const g = newGroups(), black = '#2a2538', violet = '#4a3e6e', white = '#ece8de', glow = '#b48cff';
  body(g, { skin: '#f1d2b6', torso: black, torso2: violet, belt: glow, arm: black, glove: violet, leg: black, boot: '#1c1926', shoulder: violet, bulk: .95 });
  head(g, { skin: '#f1d2b6' });
  g.head.color(white).sphere(HEAD_R + .05, HEAD_R + .06, HEAD_R + .05, 0, HEAD_Y + .02, -.03, 12, 5, 0, .5);
  for (let i = 0; i < 5; i++) g.head.at(M.chain(M.translate(0, HEAD_Y + .2, 0), M.rotY(i * 1.1 + 2.2), M.rotX(1.9))).cyl(.14, 0, .5, 5).at(null); // spiky hair
  g.head.color(black).cyl(HEAD_R + .02, HEAD_R + .02, .16, 12, 0, HEAD_Y - .3, 0, { caps: false }); // mask
  inlayBand(g.body, white, '#ada3cb', 10, scarf => scarf.cyl(.33, .38, .17, 10, 0, 1.12, 0));
  g.body.color('#87789c').quad([-.23,1.10,.20],[-.18,1.13,.24],[.21,.66,.25],[.16,.63,.27]);
  cape(g, white, '#c9c2d8', .5, .95);
  for (const s of [-1, 1]) {
    const h = hand(s), m = M.chain(M.translate(h[0], h[1], h[2]), M.rotX(1.45)), arm = s < 0 ? g.armL : g.armR;
    arm.color('#3a3348').at(m).cyl(.045, .045, .2, 6, 0, -.1, 0).color(glow).box(.2, .04, .07, 0, .1, 0).color(hex('#e9e4ff', .25)).at(null);
    plate(arm, [[-.06, .14], [.06, .14], [.05, .6], [0, .78], [-.05, .6]], .03, m);
  }
  return { groups: g, pivots: PIVOTS, height: 2.3, style: { attack: 'stab', armBase: -.5, armLBase: -.35, dual: true } };
}
export const HERO_BUILDERS = { fighter, tank, mage, marksman, assassin };

// ---- minions ---------------------------------------------------------------
export function minion(variant, team) {
  const g = newGroups(), armor = '#7f90a6', dark = '#566579', tc = TEAM[team] || TEAM.neutral, big = variant === 'super';
  body(g, { skin: '#eac9a4', torso: armor, torso2: dark, belt: tc, chest: big ? '#e2b64e' : '#9fb0c4', arm: dark, glove: '#5a4636', leg: '#4c5666', boot: '#39414e', shoulder: big ? '#e2b64e' : armor, bulk: big ? 1.15 : 1 });
  g.body.color(tc).at(M.translate(0, .52, .34)).box(.3, .5, .04).at(null); // team tabard
  g.body.color('#dce5ee').at(M.translate(0, .52, .37)).box(.055, .34, .025).color('#e2b64e').sphere(.075, .075, .035, 0, .84, .38, 6, 4).at(null);
  head(g, { skin: '#eac9a4' });
  helmet(g, armor, tc, .56);
  g.head.color(tc).sphere(.07, .17, .2, 0, HEAD_Y + .55, -.06, 6, 4);
  g.head.color('#dce5ee').box(.08, .2, .055, 0, HEAD_Y + .25, .38);
  const h = hand(1), m = M.chain(M.translate(h[0], h[1], h[2]), M.rotX(1.0));
  if (variant === 'ranged') {
    g.armR.color('#7a5a36').at(m).cyl(.04, .04, 1.5, 6, 0, -.5, 0).color('#dfe6ee').cyl(.07, 0, .3, 6, 0, 1.0, 0).at(null); // javelin
    g.body.color('#6d4c2e').at(M.chain(M.translate(-.2, .75, -.34), M.rotZ(-.3))).cyl(.1, .1, .55, 6).at(null);
  } else if (big) {
    g.armR.color('#5a4632').at(m).cyl(.055, .055, 1.5, 6, 0, -.4, 0).color('#c9ced6').box(.46, .32, .32, 0, 1.0, 0).color('#e2b64e').box(.5, .08, .36, 0, 1.12, 0).at(null); // hammer
    cape(g, tc, null, .8, .9);
  } else {
    g.armR.color('#5a4632').at(m).cyl(.045, .045, .2, 6, 0, -.1, 0).color('#e2b64e').box(.26, .05, .08, 0, .1, 0).color('#dfe6ee').at(null);
    plate(g.armR, [[-.07, .15], [.07, .15], [.06, .85], [0, 1.0], [-.06, .85]], .035, m);
    const hl = hand(-1); // round shield
    g.armL.color(tc).at(M.chain(M.translate(hl[0] - .1, hl[1] + .15, hl[2] + .18), M.rotX(Math.PI / 2))).cyl(.36, .36, .06, 10).color('#e8edf2').cyl(.12, .06, .1, 8, 0, .06, 0).color('#e2b64e').sphere(.09, .09, .055, 0, 0, .12, 8, 5).at(null);
  }
  return { groups: g, pivots: PIVOTS, height: 2.3, style: { attack: variant === 'ranged' ? 'stab' : 'swing', armBase: -.5 } };
}
export function siegeCart(team) { // wheeled ballista-cannon; groups: body + 2 wheel sets
  const body = new Geo(), wheels = new Geo(), tc = TEAM[team] || TEAM.neutral;
  body.color('#6d5236').box(1.2, .36, 1.9, 0, .42, 0).color('#8a6a45').box(1.0, .12, 1.7, 0, .78, 0).color(tc).box(1.26, .12, .3, 0, .5, .7).box(1.26, .12, .3, 0, .5, -.7);
  body.color('#59626e').at(M.chain(M.translate(0, 1.05, .1), M.rotX(Math.PI / 2 - .35))).cyl(.3, .22, 1.5, 10).color('#2a2f38').cyl(.17, .17, .05, 10, 0, 1.47, 0).at(null);
  body.color('#e2b64e').at(M.chain(M.translate(0, 1.05, .1), M.rotX(Math.PI / 2 - .35))).cyl(.33, .33, .14, 10, 0, .1, 0).cyl(.27, .27, .1, 10, 0, 1.2, 0).at(null);
  for (const [x, z] of [[-.68, .6], [.68, .6], [-.68, -.6], [.68, -.6]]) wheels.color('#4a3826').at(M.chain(M.translate(x, .42, z), M.rotZ(Math.PI / 2))).cyl(.42, .42, .14, 10, 0, -.07, 0).color('#c9a04a').cyl(.12, .12, .2, 6, 0, -.1, 0).at(null);
  return { groups: { body, wheels }, pivots: { body: [0, 0, 0], wheels: [0, 0, 0] }, height: 1.6, style: { cart: true } };
}

// ---- jungle monsters ---------------------------------------------------------
// Four-legged beasts share groups body/head/legs (legs: FL, FR, BL, BR) + optional wings.
function beast(o) {
  const g = { body: new Geo(), head: new Geo(), legFL: new Geo(), legFR: new Geo(), legBL: new Geo(), legBR: new Geo() };
  const L = o.len, W = o.wid, H = o.hgt, legH = o.leg;
  g.body.color(o.fur).sphere(W, H, L, 0, legH + H * .8, 0, 10, 7).color(o.back).sphere(W * .82, H * .7, L * .86, 0, legH + H * 1.15, -L * .05, 10, 5, 0, .55);
  g.body.color(o.fur2).at(M.chain(M.translate(0, legH + H, -L * .95), M.rotX(-2.2))).cyl(.1 * o.s, .03, .6 * o.s, 6).at(null); // tail
  if (o.spikes) for (let i = 0; i < 4; i++) g.body.color(o.spikes).cyl(.14 * o.s, 0, .4 * o.s, 5, 0, legH + H * 1.6, L * (.5 - i * .33));
  const hy = legH + H * 1.05, hz = L * .95;
  g.head.color(o.fur).sphere(W * .72, H * .78, W * .78, 0, hy, hz, 10, 6).color(o.fur2).sphere(W * .4, H * .36, W * .4, 0, hy - H * .25, hz + W * .55, 8, 5);
  for (const s of [-1, 1]) {
    g.head.color('#16131a').sphere(.07 * o.s, .09 * o.s, .05 * o.s, s * W * .36, hy + H * .12, hz + W * .62, 6, 4).color(hex(o.eye || '#ffd15a', .8)).sphere(.03 * o.s, .03 * o.s, .02 * o.s, s * W * .36, hy + H * .14, hz + W * .67, 5, 3);
    g.head.color(o.fur2).at(M.chain(M.translate(s * W * .5, hy + H * .6, hz - .05), M.rotZ(-s * .5))).cyl(.12 * o.s, 0, .34 * o.s, 5).at(null); // ears
    if (o.horn) g.head.color(o.horn).at(M.chain(M.translate(s * W * .4, hy + H * .55, hz + .1), M.rotZ(-s * .7), M.rotX(.4))).cyl(.09 * o.s, 0, .7 * o.s, 5).at(null);
  }
  const P = {};
  for (const [name, sx, sz] of [['legFL', -1, 1], ['legFR', 1, 1], ['legBL', -1, -1], ['legBR', 1, -1]]) {
    g[name].color(o.fur2).cyl(.13 * o.s, .16 * o.s, legH + .1, 6, sx * W * .62, 0, sz * L * .55).color('#2c2420').box(.3 * o.s, .1 * o.s, .34 * o.s, sx * W * .62, 0, sz * L * .55 + .04);
    P[name] = [sx * W * .62, legH + .1, sz * L * .55];
  }
  if (o.wings) for (const s of [-1, 1]) {
    const w = g[s < 0 ? 'wingL' : 'wingR'] = new Geo(); P[s < 0 ? 'wingL' : 'wingR'] = [s * W * .5, legH + H * 1.5, 0];
    w.color(o.wings); const bx = s * W * .5, by = legH + H * 1.5, sp = o.span;
    w.tri([bx, by, L * .5], [bx + s * sp, by + sp * .25, L * .2], [bx, by, -L * .5]).tri([bx + s * sp, by + sp * .25, L * .2], [bx + s * sp * .8, by + sp * .1, -L * .8], [bx, by, -L * .5]);
    w.color(o.wings2 || o.fur2).tri([bx, by + .02, L * .5], [bx + s * sp * 1.02, by + sp * .27, L * .22], [bx + s * sp * .5, by + sp * .16, L * .42]);
  }
  P.body = [0, 0, 0]; P.head = [0, hy, hz - W * .5];
  return { groups: g, pivots: P, height: legH + H * 2.1, style: { beast: true } };
}
function golem(o) { // upright bulky guardian reusing the humanoid rig
  const g = newGroups();
  body(g, { skin: o.rock, torso: o.rock, torso2: o.rock2, belt: o.glow, chest: o.rock2, arm: o.rock2, glove: o.rock, leg: o.rock2, boot: o.rock, shoulder: o.rock, bulk: 1.3 });
  g.head.color(o.rock).sphere(.4, .36, .38, 0, HEAD_Y - .12, 0, 8, 5);
  for (const s of [-1, 1]) g.head.color(hex(o.glow, 1)).sphere(.07, .05, .04, s * .15, HEAD_Y - .1, .35, 6, 3);
  g.body.color(hex(o.glow, .9)).at(M.translate(0, .9, .33)).crystal(.14, .34, 4).at(null);
  for (const s of [-1, 1]) (s < 0 ? g.armL : g.armR).color(o.rock).sphere(.24, .26, .24, s * SHOULDER_X * 1.3, .55, .02, 7, 5);
  if (o.antlers) for (const s of [-1, 1]) { g.head.color(o.antlers).at(M.chain(M.translate(s * .25, HEAD_Y + .15, 0), M.rotZ(-s * .6))).cyl(.06, .03, .6, 5).at(M.chain(M.translate(s * .5, HEAD_Y + .5, 0), M.rotZ(-s * 1.3))).cyl(.045, 0, .35, 5).at(M.chain(M.translate(s * .42, HEAD_Y + .42, 0), M.rotZ(s * .2))).cyl(.045, 0, .35, 5).at(null); }
  if (o.crown) g.head.color(hex(o.crown, .7)).at(M.translate(0, HEAD_Y + .3, 0)).crystal(.22, .6, 5).at(null);
  if (o.spines) for (let i = 0; i < 3; i++) g.body.color(hex(o.glow, .6)).at(M.chain(M.translate(0, 1.0 - i * .22, -.34), M.rotX(-1.9))).cyl(.1, 0, .36, 4).at(null);
  return { groups: g, pivots: PIVOTS, height: 2.2, style: { attack: 'swing', armBase: -.25, twoHanded: true } };
}
export const MONSTER_BUILDERS = {
  mossback: () => beast({ s: 1, len: .62, wid: .46, hgt: .36, leg: .26, fur: '#8a6442', fur2: '#6a4a30', back: '#5f8f3a', eye: '#ffd15a' }),
  glimwing: () => beast({ s: .8, len: .42, wid: .3, hgt: .28, leg: .2, fur: '#9a7350', fur2: '#70523a', back: '#c9a56a', wings: hex('#e8d49a', .25), wings2: '#b98c4e', span: .9, eye: '#9ff5ff' }),
  frost_golem: () => golem({ rock: '#b9d4ea', rock2: '#7fa3c8', glow: '#7fe3ff', antlers: '#e9f4ff' }),
  ember_golem: () => golem({ rock: '#8a4a36', rock2: '#5e2f25', glow: '#ff8a3c', spines: true }),
  abyss_drake: () => beast({ s: 1.5, len: 1.25, wid: .62, hgt: .5, leg: .4, fur: '#3f6f8f', fur2: '#2c4f6a', back: '#57a6c4', spikes: '#c8f1ff', horn: '#e8f4ff', wings: hex('#3f86a8', .1), wings2: '#2a5670', span: 1.9, eye: '#ffe07a' }),
  star_colossus: () => golem({ rock: '#6a5a8e', rock2: '#463a66', glow: '#ffd76a', crown: '#ffd76a' })
};
// world-space scale so small camps are ~half a hero and the bosses tower over one
export const MONSTER_SCALE = { mossback: 1.0, glimwing: .95, frost_golem: .92, ember_golem: .92, abyss_drake: 1.25, star_colossus: 1.75 };

// ---- structures --------------------------------------------------------------
export function tower(team, tier) {
  const base = new Geo(), gem = new Geo(), tc = TEAM[team], stone = '#b9b4a6', stone2 = '#8f8a7d', k = 1 + (tier - 1) * .08;
  base.color(stone2).cyl(1.75, 1.5, .45, 8, 0, 0, 0, { smooth: false, phase: TAU / 16 }).color(stone).cyl(1.25, 1.0, .9, 8, 0, .45, 0, { smooth: false, phase: TAU / 16 });
  base.color('#a8a294').cyl(.95, .8, 2.5 * k, 8, 0, 1.35, 0, { smooth: false, phase: TAU / 16 });
  base.color(tc).cyl(.99, .97, .22, 8, 0, 1.75, 0, { smooth: false, phase: TAU / 16, caps: false }).cyl(.86, .85, .22, 8, 0, 3.0 * k, 0, { smooth: false, phase: TAU / 16, caps: false });
  const top = 1.35 + 2.5 * k;
  base.color(stone).cyl(.82, 1.2, .35, 8, 0, top, 0, { smooth: false, phase: TAU / 16 }).color(stone2).cyl(1.2, 1.2, .2, 8, 0, top + .35, 0, { smooth: false, phase: TAU / 16 });
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + TAU / 16; base.color(i % 2 ? stone : '#cfc9ba').box(.42, .4, .3, Math.cos(a) * 1.05, top + .55, Math.sin(a) * 1.05); }
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; base.color(i % 2 ? '#77736a' : '#d0cabb').at(M.chain(M.translate(Math.cos(a) * .98, 1.55 * k, Math.sin(a) * .98), M.rotY(-a))).box(.16, 1.7 * k, .12).at(null); }
  base.color('#e2b64e').cyl(.5, .3, .25, 6, 0, top + .55, 0);
  gem.color(hex(tc, .85)).crystal(.42 + tier * .05, 1.3 + tier * .15, 6, 0, 0, 0, .4);
  const ruin = new Geo();
  ruin.color('#77736a').cyl(1.75, 1.5, .45, 8, 0, 0, 0, { smooth: false, phase: TAU / 16 }).color('#8b867a').cyl(1.2, .9, .7, 7, 0, .45, 0, { smooth: false }).color('#6c685f').box(.7, .45, .6, 1.2, 0, .9).box(.5, .35, .7, -1.3, 0, -.6).box(.6, .3, .5, .2, 0, -1.5);
  return { base, gem, ruin, gemY: top + 1.2 };
}
export function core(team) {
  const base = new Geo(), gem = new Geo(), tc = TEAM[team], gold = '#e2b64e';
  base.color('#8f8a7d').cyl(3.5, 3.3, .35, 24).color(gold).cyl(3.32, 3.2, .18, 24, 0, .35, 0).color('#b9b4a6').cyl(2.9, 2.7, .3, 24, 0, .5, 0).color(gold).cyl(1.75, 1.5, .4, 12, 0, .8, 0);
  base.color(hex(tc, .5)).ring(2.0, 2.3, 32, 0, .82, 0).color(hex('#ffe9a8', .5)).star(2.6, 8, .08, 0, .815, 0, 0, 3);
  for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + TAU / 8; base.color('#a8a294').cyl(.34, .26, 1.3, 6, Math.cos(a) * 2.75, .5, Math.sin(a) * 2.75, { smooth: false }).color(hex(tc, .8)).crystal(.24, .8, 5, Math.cos(a) * 2.75, 1.9, Math.sin(a) * 2.75, .4); }
  gem.color(hex(tc, .78)).crystal(1.35, 5.2, 7, 0, 0, 0, .36).color(hex('#ffffff', .95)).crystal(.55, 3.6, 5, 0, .8, 0, .4);
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + .6; gem.color(hex(tc, .7)).at(M.chain(M.translate(Math.cos(a) * 1.1, .1, Math.sin(a) * 1.1), M.rotZ(Math.cos(a) * -.35), M.rotX(Math.sin(a) * .35))).crystal(.5, 2.2, 5, 0, 0, 0, .3).at(null); }
  const ruin = new Geo();
  ruin.color('#77736a').cyl(3.5, 3.3, .35, 24).color('#8b867a').cyl(2.9, 2.7, .3, 24, 0, .35, 0);
  for (let i = 0; i < 6; i++) { const a = i * 1.1; ruin.color(hex(tc, .15)).at(M.chain(M.translate(Math.cos(a) * 1.4, .6, Math.sin(a) * 1.4), M.rotZ(1.2 + i), M.rotX(i))).crystal(.4, 1.1, 5).at(null); }
  return { base, gem, ruin, gemY: 1.25 };
}

// ---- scenery (appended to static batches by the renderer) ----------------------
export function addTree(g, x, y, z, s, r) {
  const trunk = shade(hex('#7a5433'), .85 + r() * .3), leaf = shade(hex('#3f8f3a'), .85 + r() * .35), leaf2 = shade(leaf, 1.22), ry = r() * TAU;
  g.at(M.trs(x, y, z, ry, s)).color(trunk).cyl(.24, .17, 1.3, 5, 0, 0, 0, { caps: false }).color(shade(leaf, .78)).sphere(1.0, .82, 1.0, 0, 1.75, 0, 7, 4).color(leaf).sphere(.86, .76, .86, .22, 2.25, .1, 7, 4).color(leaf2).sphere(.6, .52, .6, -.12, 2.72, -.08, 6, 3).at(null);
}
export function addRock(g, x, y, z, s, r) {
  const c = shade(hex('#9a9a96'), .8 + r() * .35);
  g.at(M.chain(M.trs(x, y, z, r() * TAU, s), M.rotZ((r() - .5) * .5))).color(c).sphere(.6, .42, .5, 0, .3, 0, 6, 4).color(shade(c, 1.15)).sphere(.38, .3, .34, .3, .52, .12, 5, 3).color(shade(c, .85)).sphere(.3, .22, .3, -.42, .16, .2, 5, 3).at(null);
}
export function addMushroom(g, x, y, z, s, r) {
  g.at(M.trs(x, y, z, r() * TAU, s)).color('#f3ead8').cyl(.07, .06, .26, 6).color('#d8302a').sphere(.22, .16, .22, 0, .26, 0, 8, 4, 0, .5).color('#fff6e6');
  for (let i = 0; i < 4; i++) g.sphere(.035, .02, .035, Math.cos(i * 1.7) * .12, .36 - (i % 2) * .03, Math.sin(i * 1.7) * .12, 5, 2);
  g.color('#f3ead8').cyl(.05, .04, .16, 5, .2, 0, .1).color('#e0453a').sphere(.13, .1, .13, .2, .16, .1, 7, 3, 0, .5).at(null);
}
export function addGrassTuft(g, x, y, z, s, r) { // upright blade cluster, used densely in tall-grass areas
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = r() * .55 * s, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d, h = (.75 + r() * .7) * s, w = .11 * s, lean = (r() - .5) * .5, ya = r() * Math.PI;
    const dx = Math.cos(ya) * w, dz = Math.sin(ya) * w, c0 = shade(hex('#2f7a2c'), .8 + r() * .3), c1 = shade(hex('#7fcf4a'), .85 + r() * .3), up = [0, 1, 0];
    g.tri([bx - dx, y, bz - dz], [bx + dx, y, bz + dz], [bx + lean * h, y + h, bz + lean * h * .5], up, up, up, c0, c0, c1);
  }
}
export function addLilyPad(g, x, y, z, s, r) {
  const a = r() * TAU;
  g.color(shade(hex('#4faa4a'), .85 + r() * .3)).ring(0, .5 * s, 12, x, y, z, a + .35, a + TAU - .35).color('#3b8a3c').ring(0, .16 * s, 8, x, y + .004, z);
  if (r() < .35) g.color('#ffe1ee').at(M.translate(x + .1 * s, y, z)).crystal(.13 * s, .2 * s, 6, 0, 0, 0, .5).color('#ffd34a').sphere(.04 * s, .04 * s, .04 * s, 0, .12 * s, 0, 5, 3).at(null);
}
export function addWall(g, pts, h, r, planted = true) { // stone block wall around a polygon with a planted top
  const side = hex('#8e8d88'), cap = hex('#b4b2aa');
  let area = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const p = area > 0 ? pts.slice().reverse() : pts;
  let cx = 0, cz = 0; for (const q of p) { cx += q[0]; cz += q[1]; } cx /= p.length; cz /= p.length;
  const inward = (q, d) => { const dx = cx - q[0], dz = cz - q[1], l = Math.hypot(dx, dz) || 1; return [q[0] + dx / l * d, q[1] + dz / l * d]; };
  for (let i = 0; i < p.length; i++) { // courses of individually tinted blocks along every edge
    const a = p[i], b = p[(i + 1) % p.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 1.5)), rows = 3;
    for (let row = 0; row < rows; row++) for (let j = 0; j < n; j++) {
      const o = row % 2 ? .5 : 0, t0 = Math.max(0, (j - o) / n), t1 = Math.min(1, (j + 1 - o) / n); if (t1 <= t0) continue;
      const y0 = h * row / rows, y1 = h * (row + 1) / rows - .03, x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0, x1 = a[0] + (b[0] - a[0]) * (t1 - .03 / n), z1 = a[1] + (b[1] - a[1]) * (t1 - .03 / n);
      g.color(shade(side, .82 + r() * .3)).quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0]);
    }
    const ma = inward(a, .05), mb = inward(b, .05);
    g.color('#5d5c58').quad([ma[0], 0, ma[1]], [mb[0], 0, mb[1]], [mb[0], h - .01, mb[1]], [ma[0], h - .01, ma[1]]); // recessed mortar
  }
  // capstone rim + grassy top
  const inset = p.map(q => inward(q, planted ? .7 : .3)), up = [0, 1, 0];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], ia = inset[i], ib = inset[(i + 1) % p.length];
    g.color(shade(cap, .92 + r() * .14)).tri([a[0], h, a[1]], [ib[0], h, ib[1]], [b[0], h, b[1]], up, up, up).tri([a[0], h, a[1]], [ia[0], h, ia[1]], [ib[0], h, ib[1]], up, up, up);
    g.color(planted ? shade(hex('#4f9440'), .9 + r() * .2) : shade(cap, .9)).tri([cx, h - .02, cz], [ia[0], h - .02, ia[1]], [ib[0], h - .02, ib[1]], up, up, up);
  }
}
// Spawn platform: low round grey stone dais with gold ring, blue ring and star inlay.
export function addSpawnDais(g, decal, x, z, R, h, team) {
  const tc = TEAM[team];
  g.color('#9d9a92').cyl(R + .5, R, h, 40, x, 0, z).color('#c2beb3').ring(0, R, 40, x, h + .001, z);
  for (let i = 0; i < 16; i++) { const a = i * TAU / 16; g.color(i % 2 ? '#b3afa4' : '#cdc9bd').ring(R * .58, R * .8, 3, x, h + .003, z, a, a + TAU / 16); }
  const y = h + .012;
  decal.color(hex('#e9c15a', 1)).ring(R * .86, R * .93, 48, x, y, z).ring(R * .26, R * .3, 32, x, y, z);
  decal.color(hex(tc, .95)).ring(R * .5, R * .56, 48, x, y, z).color(hex(tc, .35)).ring(R * .3, R * .5, 40, x, y - .003, z);
  decal.color(hex('#f4d88a', 1)).star(R * .84, 8, .09, x, y + .002, z, 0, 3).star(R * .48, 5, .08, x, y + .003, z);
  for (let i = 0; i < 24; i++) { const a = i * TAU / 24; decal.line(x + Math.cos(a) * R * .93, z + Math.sin(a) * R * .93, x + Math.cos(a) * R * .99, z + Math.sin(a) * R * .99, .07, y); }
}
// Monster camp marking: red pentagram outline, ring and tick dots on dark earth.
export function addCampMark(decal, x, z, R) {
  const red = hex('#e03a2e', .9), y = .03;
  decal.color(red).ring(R * .96, R * 1.02, 40, x, y, z).star(R * .93, 5, .1, x, y, z);
  for (let i = 0; i < 20; i++) { const a = i * TAU / 20; decal.ring(0, .09, 6, x + Math.cos(a) * R * 1.14, y, z + Math.sin(a) * R * 1.14); }
}
export { TEAM };
export const seeded = rng;
