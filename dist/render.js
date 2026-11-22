import { MAP, HEROES } from './sim.js';

// Original, dependency-free 2.5D renderer. Ground coordinates match the simulation.
const DEPTH = Math.sin(46 * Math.PI / 180);
const HEIGHT = Math.cos(46 * Math.PI / 180);
const TAU = Math.PI * 2;
const PALETTE = {
  blue: { light: '#bcf6ff', main: '#43bded', dark: '#185d90', glow: '#7fe7ff', stone: '#ced6d8', trim: '#e5c577' },
  red: { light: '#ffcfaf', main: '#f17261', dark: '#9b3943', glow: '#ff9b73', stone: '#70636b', trim: '#deb07d' },
  neutral: { light: '#ffe7a6', main: '#d1b36f', dark: '#716748', glow: '#ffe29d', stone: '#a2a599', trim: '#d7c494' },
};
const HERO_STYLE = {
  tank: { cloth: '#306a85', light: '#80b2c0', metal: '#cad6ce', dark: '#30485e', hair: '#2a242b', skin: '#cf9873' },
  fighter: { cloth: '#aa463e', light: '#e89970', metal: '#d8c49c', dark: '#572e31', hair: '#512e28', skin: '#dca37a' },
  mage: { cloth: '#86bfd3', light: '#e9ffff', metal: '#d9c990', dark: '#39728e', hair: '#263b52', skin: '#f1d5be' },
  marksman: { cloth: '#587f53', light: '#c3c88b', metal: '#cbb579', dark: '#354d3e', hair: '#3c3029', skin: '#d9ae82' },
  assassin: { cloth: '#695177', light: '#ba9ac9', metal: '#c9d8e5', dark: '#2d2d48', hair: '#242333', skin: '#d5b4a4' },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const point = p => Array.isArray(p) ? { x: p[0], y: p[1] } : { x: Number(p.x ?? p.cx ?? 0), y: Number(p.y ?? p.z ?? p.cy ?? 0) };
const hash = value => { let n = 2166136261; for (const c of String(value)) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); } return n >>> 0; };
const random = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed); n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n; return ((n ^ n >>> 14) >>> 0) / 4294967296; };
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function polygon(ctx, pts, fill, stroke, width = .04) {
  if (!pts.length) return;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function line(ctx, pts, color, width, closed = false) {
  if (!pts.length) return;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function ellipse(ctx, x, y, rx, ry, fill, stroke, width = .04) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(.001, rx), Math.max(.001, ry), 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function ringPoints(radius, sides = 8, phase = Math.PI / 8) { return Array.from({ length: sides }, (_, i) => [Math.cos(i * TAU / sides + phase) * radius, Math.sin(i * TAU / sides + phase) * radius]); }
function prism(ctx, pts, height, top = '#b7b6a1', front = '#858a80', right = '#687c77', base = 0) {
  const p0 = pts.map(([x, y]) => [x, y * DEPTH - base * HEIGHT]);
  const p1 = pts.map(([x, y]) => [x, y * DEPTH - (base + height) * HEIGHT]);
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    if (pts[j][0] - pts[i][0] < .001 || pts[i][1] + pts[j][1] > 0) polygon(ctx, [p0[i], p0[j], p1[j], p1[i]], pts[j][0] > pts[i][0] ? front : right);
  }
  polygon(ctx, p1, top);
}
function segmentDistance(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}
function insidePolygon(x, y, pts) {
  let yes = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y || 1) + a.x) yes = !yes; }
  return yes;
}
function lanePaths() {
  const paths = MAP.lanes || {};
  const defaults = {
    top: [[-52,42],[-52,-45],[-51,-49],[-49,-51],[-45,-52],[42,-52]],
    mid: [[-43,43],[-36,36],[0,0],[36,-36],[43,-43]],
    bot: [[-42,52],[45,52],[49,51],[51,49],[52,45],[52,-42]],
  };
  return Object.fromEntries(Object.keys(defaults).map(key => [key, (paths[key]?.path || paths[key] || defaults[key]).map(point)]));
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 1; this.height = 1; this.dpr = 1; this.scale = 28;
    this.camera = { x: -47, y: 47 }; this.manualTime = 0; this.hasCamera = false;
    this.time = 0; this.frame = 0; this.decorations = []; this.previous = new Map();
    this.paths = lanePaths(); this.bound = Number(MAP.bound || 57.5); this.worldExtent = 68;
    // One fixed cache (about 19 MB desktop, 14.5 MB narrow screens), not per-frame textures.
    this.terrainResolution = (canvas.clientWidth || 1280) < 760 ? 14 : 16;
    this._makeTerrain();
    this.resize(canvas.clientWidth || 1280, canvas.clientHeight || 720, Math.min(window.devicePixelRatio || 1, 2));
  }

  resize(width, height, dpr = 1) {
    this.width = Math.max(1, width); this.height = Math.max(1, height); this.dpr = clamp(dpr, 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.scale = clamp(Math.min(this.width / 36, this.height / 23), 13, 52);
    this.originX = this.width * .5; this.originY = this.height * .51;
  }

  screenToWorld(px, py) { return { x: (px - this.originX) / this.scale + this.camera.x, y: (py - this.originY) / (this.scale * DEPTH) + this.camera.y }; }
  worldToScreen(x, y) { return { x: (x - this.camera.x) * this.scale + this.originX, y: (y - this.camera.y) * this.scale * DEPTH + this.originY }; }
  resetCamera(player) { if (player) { this.camera.x = player.x; this.camera.y = player.y - 1.5; } this.hasCamera = true; this.manualTime = 0; }
  panTo(x, y) { this.camera.x = clamp(x, -this.bound, this.bound); this.camera.y = clamp(y, -this.bound, this.bound); this.manualTime = 3.5; this.hasCamera = true; }
  follow() { this.manualTime = 0; }

  _makeTerrain() {
    const r = this.terrainResolution, E = this.worldExtent;
    this.terrain = canvasOf(2 * E * r, 2 * E * r);
    const c = this.terrain.getContext('2d'); c.setTransform(r, 0, 0, r, E * r, E * r);
    const rnd = random(220611), paths = Object.values(this.paths);
    const distanceToLane = (x, y) => Math.min(...paths.flatMap(p => p.slice(1).map((b, i) => segmentDistance(x, y, p[i], b))));
    c.fillStyle = '#41684c'; c.fillRect(-E, -E, E * 2, E * 2);
    c.fillStyle = '#789b56'; c.fillRect(-59, -59, 118, 118);
    for (let i = 0; i < 7000; i++) {
      const x = rnd() * 130 - 65, y = rnd() * 130 - 65, size = rnd() * 1.6 + .15;
      ellipse(c, x, y, size, size * (.4 + rnd()), ['#75994e','#83a25d','#8ba665','#6d934f','#a1ad66','#608848'][Math.floor(rnd() * 6)]);
    }
    // Soft organic river banks, then clear cyan water and a light caustic texture.
    const river = (MAP.river?.path || MAP.river || [[-57,-57],[0,0],[57,57]]);
    const riverPoints = (Array.isArray(river) ? river : [[-57,-57],[0,0],[57,57]]).map(p => { const q = point(p); return [q.x,q.y]; });
    line(c, riverPoints, '#7f9872', Number(MAP.riverWidth || 10.6) + 4);
    line(c, riverPoints, '#b3b687', Number(MAP.riverWidth || 10.6) + 2);
    line(c, riverPoints, '#6fb7b8', Number(MAP.riverWidth || 10.6) + .8);
    line(c, riverPoints, '#3b9ba6', Number(MAP.riverWidth || 10.6));
    line(c, riverPoints, '#2d8796', Number(MAP.riverWidth || 10.6) * .47);
    for (let i = 0; i < 650; i++) {
      const v = rnd() * 118 - 59, off = rnd() * 5.5 - 2.75;
      line(c, [[v + off, v - off], [v + off + .5 + rnd(), v - off + .2]], rnd() > .4 ? '#70c7c7' : '#44aab2', .025 + rnd() * .04);
    }
    // The roads follow the exact three lane paths from the simulation.
    for (const path of paths) {
      const pts = path.map(p => [p.x,p.y]);
      line(c, pts, '#567a50', 8.2); line(c, pts, '#a4a57e', 7.5); line(c, pts, '#b8b494', 6.5); line(c, pts, '#c7bea1', 5.85);
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], len = Math.hypot(b.x-a.x,b.y-a.y), angle = Math.atan2(b.y-a.y,b.x-a.x), steps = Math.ceil(len / 1.6);
        for (let j = 0; j < steps; j++) {
          const t = (j + .5) / steps, x = a.x + (b.x-a.x)*t, y = a.y+(b.y-a.y)*t;
          c.save(); c.translate(x,y); c.rotate(angle);
          for (let row = -1; row <= 1; row++) {
            const yy = row*1.78 + (rnd()-.5)*.16, xx=(rnd()-.5)*.12;
            polygon(c, [[xx-.73,yy-.78],[xx+.7,yy-.76],[xx+.78,yy+.78],[xx-.72,yy+.8]], ['#c4bba0','#bab69b','#ccc5aa','#b9b29a','#d0c7ac'][Math.floor(rnd()*5)], '#aca88e', .045);
            if(rnd()>.86) line(c, [[xx-.3,yy-.76],[xx-.15,yy-.25],[xx+.2,yy+.1]], '#999d88', .03);
          }
          c.restore();
        }
      }
    }
    for (const [team, core] of Object.entries(MAP.cores || {blue:{x:-47,y:47},red:{x:47,y:-47}})) {
      const p=point(core), pal=PALETTE[team]||PALETTE.blue;
      ellipse(c,p.x,p.y,11.6,11.6, '#8a9e80'); ellipse(c,p.x,p.y,10.5,10.5, '#aeb39b','#788977',.35);
      ellipse(c,p.x,p.y,9.6,9.6, team==='red'?'#a9a397':'#b8c4ae', '#d1d1b6',.16);
      for(let a=0;a<TAU;a+=Math.PI/8) line(c,[[p.x+Math.cos(a)*3,p.y+Math.sin(a)*3],[p.x+Math.cos(a)*9.5,p.y+Math.sin(a)*9.5]],'#889d8c',.12);
      ellipse(c,p.x,p.y,6.4,6.4,null,'#d4d3b4',.16); ellipse(c,p.x,p.y,3.6,3.6,'#9ea99a',pal.dark,.14);
      for(let i=0;i<8;i++){ const a=i*Math.PI/4; polygon(c,[[p.x+Math.cos(a)*8.7,p.y+Math.sin(a)*8.7],[p.x+Math.cos(a+.08)*9.2,p.y+Math.sin(a+.08)*9.2],[p.x+Math.cos(a+.16)*8.7,p.y+Math.sin(a+.16)*8.7]],pal.main); }
    }
    for(const [team, fountain] of Object.entries(MAP.fountains||{blue:{x:-54,y:54},red:{x:54,y:-54}})){
      const p=point(fountain),pal=PALETTE[team]||PALETTE.blue;
      ellipse(c,p.x,p.y,4.6,4.6,'#8daba4','#ced7bc',.24);ellipse(c,p.x,p.y,3.7,3.7,'#507e87',pal.main,.16);ellipse(c,p.x,p.y,2.9,2.9,'#77c5ce',pal.light,.08);
      for(let i=0;i<12;i++){const a=i*TAU/12;line(c,[[p.x+Math.cos(a)*3.9,p.y+Math.sin(a)*3.9],[p.x+Math.cos(a)*4.4,p.y+Math.sin(a)*4.4]],pal.trim,.14);}
    }
    // Small grass blades, pebbles and flowers break up the procedural surface.
    for (let i=0;i<9000;i++){
      const x=rnd()*118-59,y=rnd()*118-59;if(distanceToLane(x,y)<3.6||Math.abs(x-y)<7.2)continue;
      if(Math.hypot(x+47,y-47)<11||Math.hypot(x-47,y+47)<11)continue;
      c.fillStyle=['#4e7747','#638948','#89a85c','#a7b574'][Math.floor(rnd()*4)];c.fillRect(x,y,.04+rnd()*.1,.13+rnd()*.24);
      if(i%35===0){ellipse(c,x,y,.1,.09,'#e6dba3');ellipse(c,x+.13,y+.14,.07,.06,'#aabce3');}
    }
    const wallEntries = MAP.walls || [];
    for(let i=0;i<wallEntries.length;i++){
      const wall=wallEntries[i];const raw=Array.isArray(wall)?wall:(wall.points||wall.polygon||wall.vertices||[]);if(raw.length<3)continue;
      const pts=raw.map(point),cx=pts.reduce((n,p)=>n+p.x,0)/pts.length,cy=pts.reduce((n,p)=>n+p.y,0)/pts.length;
      polygon(c,pts.map(p=>[p.x,p.y]),'#64874e','#516f47',.5);
      this.decorations.push({kind:'wall',x:cx,y:cy,pts:pts.map(p=>[p.x-cx,p.y-cy]),height:1.0+rnd()*.9,seed:i});
      const count=Math.max(2,Math.floor(Math.hypot(pts[0].x-cx,pts[0].y-cy)*1.5));
      for(let j=0;j<count;j++){
        const q=pts[Math.floor(rnd()*pts.length)],x=cx+(q.x-cx)*rnd()*.85,y=cy+(q.y-cy)*rnd()*.85;
        if(j%3!==0)this.decorations.push({kind:'tree',x,y,height:2.8+rnd()*2.7,size:.9+rnd()*.65,seed:i*17+j});
      }
    }
    // Rim forests retain a finished battlefield boundary instead of empty canvas.
    for(let i=0;i<165;i++){
      const side=Math.floor(rnd()*4),t=rnd()*128-64,edge=60+rnd()*4;
      const x=side===0?-edge:side===1?edge:t,y=side===2?-edge:side===3?edge:t;
      this.decorations.push({kind:'tree',x,y,height:3.2+rnd()*2.8,size:1.2+rnd()*.6,seed:2000+i});
    }
    if(!wallEntries.length){
      for(let i=0;i<110;i++){const x=rnd()*102-51,y=rnd()*102-51;if(distanceToLane(x,y)>7&&Math.abs(x-y)>10&&Math.hypot(x+47,y-47)>14&&Math.hypot(x-47,y+47)>14)this.decorations.push({kind:i%5?'tree':'rock',x,y,height:2.4+rnd()*2,size:.8+rnd(),seed:i});}
    }
    for(let i=0;i<(MAP.bushes||[]).length;i++){
      const bush=MAP.bushes[i];let p,size;
      if(Array.isArray(bush)&&bush.length&&typeof bush[0]==='object'){
        const pts=bush.map(point);p={x:pts.reduce((n,v)=>n+v.x,0)/pts.length,y:pts.reduce((n,v)=>n+v.y,0)/pts.length};size=Math.max(...pts.map(v=>Math.hypot(v.x-p.x,v.y-p.y)))*.7;polygon(c,pts.map(v=>[v.x,v.y]),'#698a47');
      }else{p=point(bush.center||bush);size=bush.radius||bush.r||2;ellipse(c,p.x,p.y,size,size*.85,'#698a47');}
      this.decorations.push({kind:'bush',x:p.x,y:p.y,size,height:.75,seed:4000+i});
    }
    // Camps have recognizable circular earthen clearings.
    for(const camp of MAP.camps||[]){const p=point(camp.pos||camp.position||camp);ellipse(c,p.x,p.y,camp.radius||3.0,camp.radius||3.0,'#929c70','#70895b',.12);ellipse(c,p.x,p.y,1.8,1.8,null,'#b9b98d',.08);}
    this.decorations.sort((a,b)=>a.y-b.y);
    this.miniTerrain = canvasOf(256,256); const mc=this.miniTerrain.getContext('2d');const margin=(E-this.bound)*r;mc.drawImage(this.terrain,margin,margin,this.bound*2*r,this.bound*2*r,0,0,256,256);
  }

  draw(world, options = {}) {
    if(!world)return;
    const {aim=null,pointer=null,showRanges=false,quality='high',dt=1/60}=options;
    const ctx=this.ctx, p=world.player; this.time=world.time||0;this.frame++;
    if(!this.hasCamera&&p)this.resetCamera(p);
    if(this.manualTime>0)this.manualTime=Math.max(0,this.manualTime-dt);
    else if(p){const smooth=1-Math.exp(-dt*7);this.camera.x+=(p.x-this.camera.x)*smooth;this.camera.y+=(p.y-1.65-this.camera.y)*smooth;}
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.globalAlpha=1;ctx.fillStyle='#42674f';ctx.fillRect(0,0,this.width,this.height);
    const E=this.worldExtent,worldOrigin=this.worldToScreen(0,0);
    ctx.save();ctx.translate(worldOrigin.x,worldOrigin.y);ctx.scale(this.scale,this.scale*DEPTH);ctx.imageSmoothingEnabled=true;
    ctx.drawImage(this.terrain,-E,-E,E*2,E*2);
    // Moving highlights are intentionally sparse; texture is cached.
    ctx.globalAlpha=.11;ctx.strokeStyle='#d6fff0';ctx.lineWidth=.04;
    for(let i=0;i<24;i++){const v=(i*5.7+(this.time*.38)%5.7)-65;ctx.beginPath();ctx.ellipse(v+1.5,v-1.5,1.6,.32,Math.PI/4,0,Math.PI);ctx.stroke();}
    ctx.globalAlpha=1;
    for(const[team,fountain]of Object.entries(MAP.fountains||{})){
      const f=point(fountain), pal=PALETTE[team]||PALETTE.blue;ctx.globalAlpha=.24+.07*Math.sin(this.time*2);ellipse(ctx,f.x,f.y,3.5,3.5,null,pal.light,.12);ctx.globalAlpha=1;
    }
    if(p&&p.alive){
      if(showRanges){ellipse(ctx,p.x,p.y,p.range||6,p.range||6,'#e6f9c00c','#d5eab86a',.07);}
      if(aim){const range=aim.range||10;ellipse(ctx,p.x,p.y,range,range,'#5edbfd12','#8ce9f6a0',.07);const ax=aim.x??p.x,ay=aim.y??p.y;ellipse(ctx,ax,ay,aim.radius||1.6,aim.radius||1.6,'#74e1f638','#c5ffff',.09);line(ctx,[[p.x,p.y],[ax,ay]],'#b2f9ff99',.08);}
      if(p.recallTimer>0){const progress=clamp(1-p.recallTimer/5,0,1);ellipse(ctx,p.x,p.y,1.65,1.65,'#75ceff25','#a6efff',.09);ctx.beginPath();ctx.arc(p.x,p.y,1.82,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.strokeStyle='#f3e4ac';ctx.lineWidth=.15;ctx.stroke();}
    }
    for(const effect of world.effects||[])if(effect.kind==='ring'||effect.kind==='cast'||effect.kind==='heal')this._groundEffect(ctx,effect);
    const target=p?.moveTarget||p?.destination;
    if(target&&Number.isFinite(target.x)&&Number.isFinite(target.y)){
      ctx.globalAlpha=.55+.2*Math.sin(this.time*6);const rr=.35+.09*Math.sin(this.time*9);ellipse(ctx,target.x,target.y,rr,rr,null,'#fff2ae',.06);line(ctx,[[target.x-.6,target.y],[target.x+.6,target.y]],'#fff2ae',.06);line(ctx,[[target.x,target.y-.6],[target.x,target.y+.6]],'#fff2ae',.06);ctx.globalAlpha=1;
    }
    ctx.restore();
    const units=(world.entities||[]).filter(e=>(e.alive!==false||e.type==='tower'||e.type==='core')&&(e.team===p?.team||e.team==='neutral'||((e.visibleTo?.[p?.team||'blue']!==false)&&!(e.invisibleTimer>0))));
    const visible=e=>{const s=this.worldToScreen(e.x,e.y);return s.x>-230&&s.x<this.width+230&&s.y>-100&&s.y<this.height+300;};
    const objects=[...this.decorations.filter(visible).map(item=>({isDecoration:true,item,y:item.y})),...units.filter(visible).map(item=>({item,y:item.y}))].sort((a,b)=>a.y-b.y);
    for(const entry of objects){
      const e=entry.item,s=this.worldToScreen(e.x,e.y);ctx.save();ctx.translate(s.x,s.y);ctx.scale(this.scale,this.scale);
      if(entry.isDecoration){if(e.kind==='tree'&&p&&Math.abs(e.x-p.x)<2.8&&e.y>p.y-.2&&e.y<p.y+5)ctx.globalAlpha=.32;this._decoration(ctx,e,quality);}
      else {if(e.invisibleTimer>0)ctx.globalAlpha=.42;this._entity(ctx,e,e===p,dt);}
      ctx.restore();
    }
    // Effects above models: streaks, curved skill slashes and floating combat numbers.
    for(const e of world.effects||[])if(!['ring','cast','heal'].includes(e.kind))this._effect(ctx,e);
    for(const e of units)if(e.alive!==false&&visible(e))this._healthbar(ctx,e,e===p);
    if(p&&p.alive===false){ctx.fillStyle='rgba(19,26,35,.22)';ctx.fillRect(0,0,this.width,this.height);}
    // A subtle peripheral shade helps the HUD and battlefield share one visual frame.
    const vignette=ctx.createRadialGradient(this.width*.5,this.height*.5,Math.min(this.width,this.height)*.22,this.width*.5,this.height*.5,Math.max(this.width,this.height)*.7);vignette.addColorStop(0,'rgba(9,20,25,0)');vignette.addColorStop(1,'rgba(9,20,25,.22)');ctx.fillStyle=vignette;ctx.fillRect(0,0,this.width,this.height);
    if(this.frame%120===0){const ids=new Set((world.entities||[]).map(e=>e.id));for(const id of this.previous.keys())if(!ids.has(id))this.previous.delete(id);}
  }

  _decoration(c,d,quality){
    if(d.kind==='wall'){
      ellipse(c,.4,.55,Math.max(1,...d.pts.map(p=>Math.abs(p[0]))),1.3,'#263c3b30');
      prism(c,d.pts,d.height,'#a3ad8c','#7c8b79','#65786e');
      const top=d.pts.map(([x,y])=>[x*.84,y*.84*DEPTH-d.height*HEIGHT]);polygon(c,top,'#7e965c');
      if(quality!=='low')for(let i=0;i<d.pts.length;i+=2){const[x,y]=d.pts[i];line(c,[[x,y*DEPTH-d.height*HEIGHT*.1],[x*.8,y*.8*DEPTH-d.height*HEIGHT*.9]],'#65786b',.05);}
      return;
    }
    if(d.kind==='rock'){
      ellipse(c,.3,.35,d.size*1.1,d.size*.5,'#21382d40');prism(c,ringPoints(d.size,6,d.seed),d.height*.55,'#b1b5a0','#8b9a8e','#65786b');return;
    }
    if(d.kind==='bush'){
      const r=random(d.seed),size=d.size;ellipse(c,0,0,size,size*.55,'#426e473a');
      for(let i=0;i<16;i++){const x=(r()-.5)*size*1.8,y=(r()-.5)*size*.75,h=.3+r()*.65;polygon(c,[[x-.08,y],[x-.2,y-h*.75],[x+.02,y-h],[x+.12,y-h*.5],[x+.11,y]],['#668c43','#789c50','#9ab466','#4f7c3e'][i%4]);}
      return;
    }
    if(d.kind==='tree'){
      const s=d.size,h=d.height;ellipse(c,.6,.65,s*1.55,s*.68,'#203b3445');
      polygon(c,[[-.17,.05],[.24,.04],[.14,-h*.7],[-.04,-h*.77]],'#776c4f');line(c,[[0,-h*.55],[-s*.5,-h*.82]],'#6d6749',.15);
      const base=-h*HEIGHT*.75;
      polygon(c,[[-s,base+.48],[-s*1.16,base-.33],[-s*.55,base-.95],[s*.08,base-1.3],[s*.82,base-.75],[s*1.12,base-.05],[s*.65,base+.5]],'#3e7453');
      polygon(c,[[-s*1.16,base-.33],[-s*.55,base-.95],[s*.08,base-1.3],[s*.2,base-.25],[-s*.25,base+.08]],'#6f9b58');
      polygon(c,[[s*.08,base-1.3],[s*.82,base-.75],[s*1.12,base-.05],[s*.38,base-.12],[s*.2,base-.25]],'#8bad66');
      polygon(c,[[-s*.25,base+.08],[s*.2,base-.25],[s*1.12,base-.05],[s*.65,base+.5]],'#46784c');
      if(quality!=='low'){polygon(c,[[-s*.7,base-.48],[-s*.47,base-.78],[s*.02,base-.87],[-s*.16,base-.5]],'#a0b675');polygon(c,[[s*.42,base-.58],[s*.62,base-.63],[s*.81,base-.38],[s*.52,base-.25]],'#a4b977');}
    }
  }

  _entity(c,e,isPlayer,dt){
    if(e.type==='tower'){this._tower(c,e);return;}
    if(e.type==='core'){this._core(c,e);return;}
    if(e.alive===false)return;
    const pal=PALETTE[e.team]||PALETTE.neutral;
    if(e.type==='hero'){
      ellipse(c,.25,.15,.66,.27,'#20383e70');
      if(isPlayer){ellipse(c,0,0,.93,.93*DEPTH,'#e9e8a31b','#f9e7a7',.05);ellipse(c,0,0,1.05,1.05*DEPTH,null,'#f5eab65c',.035);}
      else ellipse(c,0,0,.65,.65*DEPTH,null,pal.main+'bb',.04);
      const old=this.previous.get(e.id),moving=e.moving||(old&&Math.hypot(e.x-old.x,e.y-old.y)>.001);
      this.previous.set(e.id,{x:e.x,y:e.y});const bob=moving?Math.sin(this.time*11+hash(e.id))*.05:Math.sin(this.time*2.3)*.018;
      const attackLean=Math.sin(clamp((e.attackFlash||0)/.24,0,1)*Math.PI)*.12;
      c.save();c.translate(Math.cos(e.facing||0)*attackLean,bob);c.rotate(Math.cos(e.facing||0)*attackLean*.3);this._hero(c,e,moving);c.restore();
      if(e.stunTimer>0){for(let i=0;i<3;i++){const a=this.time*5+i*TAU/3;ellipse(c,Math.cos(a)*.35,-2.7+Math.sin(a)*.08,.04,.04,'#f7e7a9');}}
      if(e.recallTimer>0){const a=this.time*2;for(let i=0;i<5;i++){const t=a+i*TAU/5;ellipse(c,Math.cos(t)*.7,-.3-((this.time*.7+i*.4)%2),.025,.07,'#aeefff');}}
      return;
    }
    if(e.type==='minion'){this._minion(c,e);return;}
    if(e.type==='monster'){this._monster(c,e);return;}
  }

  _tower(c,e){
    const p=PALETTE[e.team]||PALETTE.neutral;
    ellipse(c,.5,.6,2,1.1,'#263e3e40');prism(c,ringPoints(1.65,8),.32,'#c1c6b0','#9ba58f','#788c7d');prism(c,ringPoints(1.3,8),.24,p.stone,'#9ba9a2','#738a87',.32);
    if(e.alive===false||e.hp<=0){prism(c,ringPoints(.74,5,.3),.6,'#929c95','#687f78','#536b68',.56);polygon(c,[[.15,-.6],[.9,-.4],[.8,.2],[.4,.1]],'#8fa59c');return;}
    prism(c,ringPoints(.73,6),2.2,p.stone,e.team==='red'?'#68565e':'#a4b9bb',e.team==='red'?'#51434e':'#6f919d',.56);
    prism(c,ringPoints(.84,6),.18,p.trim,'#a89c76','#878469',.7);
    prism(c,ringPoints(.85,6),.23,p.trim,'#aaa17a','#7d8d83',2.6);
    for(let i=0;i<3;i++){const x=(i-1)*.35;polygon(c,[[x-.07,-.95],[x+.07,-.95],[x+.07,-1.72],[x-.07,-1.72]],p.dark);}
    ellipse(c,0,-2.34,.65,.21,p.dark,p.main,.08);
    const bob=Math.sin(this.time*2+e.x)*.05;
    c.save();c.translate(0,-2.6+bob);this._crystal(c,.66,1.2,p);c.restore();
    for(const sign of [-1,1])polygon(c,[[sign*.7,-1.96],[sign*1.0,-2.36],[sign*.82,-3.06],[sign*.58,-2.56]],p.stone,p.trim,.045);
    if(e.protected){ellipse(c,0,-1.28,1.25,2.0,'#aff1ff0b',p.main+'48',.025);}
  }

  _crystal(c,w,h,p){
    const glow=c.createRadialGradient(0,-h*.55,.01,0,-h*.55,h*1.1);glow.addColorStop(0,p.main+'77');glow.addColorStop(1,p.main+'00');c.fillStyle=glow;c.fillRect(-h*1.2,-h*1.8,h*2.4,h*2.5);
    polygon(c,[[0,-h],[w*.55,-h*.4],[0,.24],[-w*.55,-h*.4]],p.main);
    polygon(c,[[0,-h],[-w*.55,-h*.4],[0,-h*.2]],p.light);polygon(c,[[0,-h],[w*.55,-h*.4],[0,-h*.2]],p.main);polygon(c,[[0,-h*.2],[w*.55,-h*.4],[0,.24]],p.dark);polygon(c,[[0,-h*.2],[-w*.55,-h*.4],[0,.24]],p.glow);
    line(c,[[0,-h],[-w*.55,-h*.4],[0,.24]],p.light,.025);
  }

  _core(c,e){
    const p=PALETTE[e.team]||PALETTE.neutral;
    ellipse(c,.8,.7,3.3,1.55,'#20383d4d');prism(c,ringPoints(2.7,8),.4,'#adb9a7','#829e93','#6a8d89');prism(c,ringPoints(2.25,8),.3,p.stone,'#a3afa3','#768c87',.4);prism(c,ringPoints(1.7,6),.42,'#9aafa6','#6e9393','#456d7b',.7);
    if(e.alive===false||e.hp<=0){prism(c,ringPoints(.9,5),.65,'#8d9990','#6c837e','#506c6b',1.1);return;}
    ellipse(c,0,-.9,1.7,.6,p.dark,p.trim,.09);ellipse(c,0,-.97,1.35,.42,p.main+'70',p.light,.055);
    c.save();c.translate(0,-1.4+Math.sin(this.time*1.6)*.12);this._crystal(c,2.7,3.4,p);c.restore();
    for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a)*1.95,y=Math.sin(a)*1.95*DEPTH;polygon(c,[[x-.22,y-.5],[x+.22,y-.5],[x+.13,y-1.7],[x,y-2],[x-.17,y-1.65]],p.stone,p.trim,.05);}
    for(let i=0;i<7;i++){const a=this.time*.4+i*TAU/7;ellipse(c,Math.cos(a)*1.8,Math.sin(a)*.55-2.1,.035,.035,p.light);}
  }

  _hero(c,e,moving){
    const id=e.heroId||'fighter',s=HERO_STYLE[id]||HERO_STYLE.fighter,team=PALETTE[e.team]||PALETTE.blue;
    const face=Math.cos(e.facing||0)>=0?1:-1; c.save();c.scale(face,1);
    const step=moving?Math.sin(this.time*11+hash(e.id))* .12:0,bulky=id==='tank'?1.2:id==='fighter'?1.12:1;
    c.scale(bulky,1);
    // Layered capes/robes, boots and faceted armour produce silhouettes without bitmaps.
    polygon(c,[[-.4,-1.5],[.25,-1.5],[.55+step,-.23],[.07,-.09],[-.61-step,-.25]],s.dark);
    polygon(c,[[-.38,-1.45],[.04,-1.37],[-.05,-.2],[-.61-step,-.25]],s.cloth);
    polygon(c,[[-.28,-.76],[-.03,-.68],[-.03+step,-.05],[-.31+step,-.04]],'#334349');
    polygon(c,[[.06,-.75],[.32,-.69],[.32-step,-.04],[.09-step,-.02]],'#263842');
    ellipse(c,-.2+step,-.04,.2,.08,'#363b3c');ellipse(c,.24-step,-.02,.2,.08,'#3a4142');
    if(id==='mage'){
      polygon(c,[[-.3,-1.68],[.27,-1.67],[.49,-.18],[.1,-.03],[-.51,-.22]],s.light);
      polygon(c,[[-.3,-1.68],[-.05,-1.5],[-.12,-.06],[-.51,-.22]],s.cloth);
      polygon(c,[[.1,-1.57],[.25,-1.65],[.43,-.26],[.24,-.14]],'#b8ddea');
      line(c,[[-.37,-.32],[.1,-.11],[.42,-.27]],s.metal,.055);
    }else{
      polygon(c,[[-.34,-1.65],[.27,-1.67],[.42,-.83],[.12,-.65],[-.36,-.85]],s.cloth);
      polygon(c,[[-.3,-1.56],[.04,-1.65],[.18,-1.0],[-.34,-1.08]],s.metal);
      polygon(c,[[.04,-1.65],[.27,-1.56],[.4,-.93],[.18,-1.0]],s.light);
      line(c,[[-.34,-.88],[.32,-.83]],'#bea666',.12);
      polygon(c,[[-.2,-.79],[.06,-.77],[.1,-.4],[-.28,-.44]],s.cloth);
    }
    // Neck, head, hair and visible brow.
    polygon(c,[[-.12,-1.9],[.14,-1.9],[.16,-1.6],[-.09,-1.6]],s.skin);
    ellipse(c,.01,-1.97,.25,.32,s.skin);
    polygon(c,[[-.25,-1.94],[-.26,-2.23],[-.1,-2.39],[.16,-2.36],[.3,-2.1],[.1,-2.18],[-.08,-2.13],[-.13,-1.91]],s.hair);
    line(c,[[.1,-2.05],[.23,-2.05]],'#343b42',.025);
    if(id==='tank'){
      polygon(c,[[-.27,-2.08],[-.3,-2.33],[-.05,-2.51],[.24,-2.3],[.29,-2.13],[.04,-2.23]],s.metal);
      polygon(c,[[-.12,-1.87],[.2,-1.86],[.13,-1.64],[-.08,-1.7]],s.hair);
      polygon(c,[[-.48,-1.68],[-.2,-1.7],[-.36,-1.28],[-.63,-1.27]],s.metal);
      ellipse(c,-.59,-.94,.4,.65,s.dark,s.metal,.08);ellipse(c,-.62,-1.02,.28,.44,s.cloth,s.metal,.04);polygon(c,[[-.62,-1.4],[-.4,-1.03],[-.63,-.64],[-.83,-1.04]],team.main);ellipse(c,-.62,-1.03,.11,.13,s.metal);
      line(c,[[.43,-.48],[.7,-2.0]],'#67563e',.105);polygon(c,[[.6,-1.93],[.9,-2.44],[.95,-1.92],[.75,-1.66]],s.metal);polygon(c,[[.67,-1.92],[.89,-2.38],[.82,-1.86]],'#eef3dc');
    }else if(id==='fighter'){
      polygon(c,[[-.24,-1.95],[-.18,-1.7],[.14,-1.61],[.25,-1.84],[.02,-1.93]],'#63402c');
      polygon(c,[[-.44,-1.67],[-.24,-1.65],[-.41,-1.12],[-.65,-1.18]],s.metal);
      line(c,[[.43,-.63],[.7,-2.43]],'#6d5137',.13);polygon(c,[[.64,-2.34],[.22,-2.52],[.2,-2.07],[.58,-2.03],[.77,-1.99],[1.16,-2.09],[1.13,-2.55],[.77,-2.36]],s.metal);line(c,[[.23,-2.49],[.2,-2.08]],'#f9edcc',.06);line(c,[[1.13,-2.53],[1.16,-2.1]],'#f9edcc',.06);
    }else if(id==='mage'){
      polygon(c,[[-.26,-2.16],[-.3,-1.85],[-.47,-1.05],[-.23,-1.22],[-.1,-1.9]],s.hair);
      line(c,[[-.27,-2.29],[.03,-2.47],[.27,-2.28]],s.metal,.065);ellipse(c,.04,-2.4,.06,.08,team.light);
      polygon(c,[[-.34,-1.61],[-.5,-1.56],[-.78,-.97],[-.5,-.93],[-.25,-1.36]],s.light);
      polygon(c,[[.26,-1.61],[.47,-1.47],[.6,-1.02],[.37,-.98],[.15,-1.4]],s.light);
      line(c,[[.63,-.19],[.66,-2.3]],'#c9c48f',.055);c.save();c.translate(.66,-2.33);this._crystal(c,.32,.44,team);c.restore();
      ellipse(c,-.67,-1.05,.15,.15,'#bcefff99','#eaffff',.025);
    }else if(id==='marksman'){
      polygon(c,[[-.26,-2.17],[-.25,-2.36],[.15,-2.43],[.44,-2.15]],s.cloth);line(c,[[-.2,-2.34],[-.4,-2.7]],'#ddd1a1',.07);
      polygon(c,[[-.38,-1.6],[-.63,-1.2],[-.42,-1.07],[-.17,-1.4]],s.cloth);
      c.save();c.translate(.59,-1.3);c.beginPath();c.arc(-.25,0,.8,-1.2,1.2);c.strokeStyle='#c4a774';c.lineWidth=.08;c.stroke();line(c,[[.04,-.75],[.04,.75]],'#e1d6a6',.025);line(c,[[-.4,.02],[.68,.02]],'#dfd8b4',.04);polygon(c,[[.68,.02],[.5,-.07],[.5,.11]],'#e8e8c9');c.restore();
    }else{
      polygon(c,[[-.3,-2.05],[-.31,-2.32],[-.08,-2.56],[.25,-2.3],[.32,-2.03],[.1,-2.2],[-.08,-2.16],[-.16,-1.99]],s.dark);polygon(c,[[-.13,-1.99],[.28,-2],[.15,-1.82],[-.12,-1.83]],s.cloth);
      polygon(c,[[-.41,-1.6],[-.65,-1.24],[-.48,-1.13],[-.21,-1.37]],s.dark);polygon(c,[[.3,-1.6],[.52,-1.12],[.7,-1.19],[.51,-1.64]],s.dark);
      line(c,[[-.61,-1.18],[-.77,-.73]],'#c0b58f',.09);polygon(c,[[-.77,-.73],[-.98,-.13],[-.56,-.65]],'#c5dfeb');line(c,[[.63,-1.16],[.85,-1.5]],'#c0b58f',.09);polygon(c,[[.85,-1.5],[1.13,-2.12],[.67,-1.57]],'#d1eaf1');
    }
    c.restore();
  }

  _minion(c,e){
    const p=PALETTE[e.team]||PALETTE.neutral,variant=e.variant||'melee';ellipse(c,.15,.08,.44,.21,'#21383b55');
    if(variant==='siege'||variant==='super'){
      for(const x of [-.62,.62])ellipse(c,x,.02,.2,.26,'#465659','#c2b993',.05);prism(c,[[-.58,-.5],[.58,-.5],[.58,.4],[-.58,.4]],.5,'#aab6a5','#738d87','#527278');
      polygon(c,[[-.45,-.55],[.45,-.55],[.3,-.95],[-.22,-.93]],p.main);line(c,[[0,-.75],[.15,-1.6]],'#d8d5b1',.18);ellipse(c,.15,-1.6,.17,.09,'#384b53','#c7c3a5',.035);return;
    }
    const step=Math.sin(this.time*10+hash(e.id))*.06;line(c,[[-.16,-.35],[-.17+step,-.01]],'#485652',.13);line(c,[[.17,-.35],[.17-step,-.01]],'#485652',.13);
    polygon(c,[[-.26,-.86],[.24,-.86],[.29,-.35],[-.26,-.31]],p.main);polygon(c,[[-.26,-.86],[-.02,-.86],[.03,-.34],[-.26,-.31]],p.dark);
    ellipse(c,0,-1,.24,.23,'#e2c79a');
    if(variant==='ranged'){
      polygon(c,[[-.35,-1.13],[.02,-1.55],[.32,-1.13]],p.main,p.light,.025);line(c,[[.38,-.17],[.45,-1.35]],'#b2a47e',.06);ellipse(c,.45,-1.37,.1,.14,p.light);
    }else{
      polygon(c,[[-.28,-1.01],[-.23,-1.27],[.08,-1.34],[.28,-1.12],[.27,-1.0]],'#c4cbb9');line(c,[[-.15,-1.13],[.2,-1.13]],'#647b80',.055);ellipse(c,-.32,-.57,.23,.32,p.dark,p.light,.035);line(c,[[.37,-.43],[.49,-1.07]],'#d8d7b5',.065);
    }
  }

  _monster(c,e){
    const name=e.name||e.variant||'',big=/龙|主宰|暴君|dragon|boss/i.test(name),blue=/蓝|blue/i.test(name),red=/红|red/i.test(name);
    const p=blue?PALETTE.blue:red?PALETTE.red:PALETTE.neutral;const size=big?1.7:1;
    c.save();c.scale(size,size);ellipse(c,.3,.2,1,.5,'#263b3150');
    if(big){
      polygon(c,[[-.3,-1.1],[-1.8,-2.5],[-2,-1.15],[-1.15,-1.35],[-.4,-.55]],'#706b8e','#b6a0c5',.035);polygon(c,[[.3,-1.1],[1.8,-2.5],[2,-1.15],[1.15,-1.35],[.4,-.55]],'#8b7899','#c5abc6',.035);
      polygon(c,[[-.45,-1.8],[.4,-1.8],[.7,-.6],[.3,-.15],[-.55,-.38]],'#8c8b95');polygon(c,[[-.3,-1.8],[.05,-1.8],[.15,-.25],[-.55,-.38]],'#666f84');
      polygon(c,[[-.45,-1.8],[-.5,-2.3],[-.13,-2.65],[.36,-2.52],[.62,-2.13],[.32,-1.75]],'#b8a7ac');polygon(c,[[-.4,-2.45],[-.5,-3.02],[-.13,-2.6]],'#dfd5b4');polygon(c,[[.25,-2.54],[.56,-3.04],[.48,-2.3]],'#e5cda8');line(c,[[-.14,-2.22],[.04,-2.19]],'#aef5ff',.05);line(c,[[.26,-2.19],[.39,-2.22]],'#aef5ff',.05);
    }else{
      prism(c,ringPoints(.7,6),1.15,'#a6a791','#7e8d7b','#64766b');
      for(const x of [-.76,.76]){prism(c,ringPoints(.31,5).map(([a,b])=>[a+x,b]),.72,'#a6ac96','#81917b','#637861',.15);}
      polygon(c,[[-.42,-1.18],[-.34,-1.7],[.03,-1.91],[.42,-1.62],[.39,-1.17]],'#bcc0a1');line(c,[[-.24,-1.48],[-.07,-1.48]],p.glow,.07);line(c,[[.14,-1.48],[.31,-1.48]],p.glow,.07);
      if(blue||red){c.save();c.translate(0,-.86);this._crystal(c,.45,.65,p);c.restore();}
    }
    c.restore();
  }

  _groundEffect(c,e){
    const ratio=clamp((e.life??.3)/(e.maxLife||e.duration||1),0,1),color=e.color||(PALETTE[e.team]||PALETTE.blue).glow,r=e.radius||1.5;
    c.save();c.globalAlpha=clamp(ratio,.08,.7);ellipse(c,e.x,e.y,r*(1+(1-ratio)*.12),r*(1+(1-ratio)*.12),color+'22',color,.08);
    if(e.kind==='cast'){ellipse(c,e.x,e.y,r*.7,r*.7,null,color,.035);for(let i=0;i<6;i++){const a=i*TAU/6+this.time;line(c,[[e.x+Math.cos(a)*r*.7,e.y+Math.sin(a)*r*.7],[e.x+Math.cos(a)*r,e.y+Math.sin(a)*r]],color,.05);}}
    c.restore();
  }

  _effect(c,e){
    const s=this.worldToScreen(e.x,e.y),ratio=clamp((e.life??.3)/(e.maxLife||e.duration||.7),0,1),color=e.color||(PALETTE[e.team]||PALETTE.blue).glow;
    c.save();c.globalAlpha=clamp(ratio*1.5,0,1);c.lineCap='round';
    if(e.kind==='text'){
      c.font=`700 ${clamp(this.scale*.42,14,23)}px "Segoe UI",sans-serif`;c.textAlign='center';c.textBaseline='bottom';c.lineWidth=3;c.strokeStyle='#27383bcc';const y=s.y-this.scale*(1.8+(1-ratio)*1.4);c.strokeText(String(e.text??''),s.x,y);c.fillStyle=color;c.fillText(String(e.text??''),s.x,y);
    }else if(e.kind==='projectile'||e.kind==='beam'){
      const t=this.worldToScreen(e.toX??e.x,e.toY??e.y),k=e.kind==='beam'?1:1-ratio,x=s.x+(t.x-s.x)*k,y=s.y+(t.y-s.y)*k-this.scale*.9;
      c.strokeStyle=color;c.lineWidth=e.kind==='beam'?this.scale*.14:Math.max(2,this.scale*.055);c.shadowColor=color;c.shadowBlur=9;c.beginPath();c.moveTo(e.kind==='beam'?s.x:x-(t.x-s.x)*.08,e.kind==='beam'?s.y-this.scale*.9:y-(t.y-s.y)*.08);c.lineTo(x,y);c.stroke();ellipse(c,x,y,this.scale*.08,this.scale*.08,'#fff4cf');
    }else if(e.kind==='slash'){
      const rr=(e.radius||1.4)*this.scale;c.translate(s.x,s.y-this.scale);c.scale(1,.65);c.beginPath();c.arc(0,0,rr,-Math.PI*.85+((1-ratio)*.4),Math.PI*.2+(1-ratio)*.4);c.strokeStyle=color;c.lineWidth=this.scale*.12*ratio;c.shadowColor=color;c.shadowBlur=12;c.stroke();
    }else{
      const seed=hash(e.id||e.x),rng=random(seed);for(let i=0;i<7;i++){const a=rng()*TAU,r=(1-ratio)*this.scale*(e.kind==='death'?2.4:1.0),x=s.x+Math.cos(a)*r,y=s.y-this.scale+Math.sin(a)*r*.7;c.fillStyle=color;c.fillRect(x,y,2+ratio*3,2+ratio*3);}
      if(ratio>.4){ellipse(c,s.x,s.y-this.scale,this.scale*.13*ratio,this.scale*.4*ratio,'#fff6d9');ellipse(c,s.x,s.y-this.scale,this.scale*.4*ratio,this.scale*.1*ratio,color);}
    }
    c.restore();
  }

  _healthbar(c,e,isPlayer){
    if(e.type==='minion'&&e.hp>=e.maxHp)return;
    const s=this.worldToScreen(e.x,e.y),p=PALETTE[e.team]||PALETTE.neutral;
    const hero=e.type==='hero',structure=e.type==='tower'||e.type==='core',big=/龙|主宰|暴君|dragon|boss/i.test(e.name||'');
    const raise=e.type==='core'?5.4:e.type==='tower'?4.25:hero?2.7:big?5.5:2.2;
    const w=hero?clamp(this.scale*1.75,48,78):structure?clamp(this.scale*2,60,92):clamp(this.scale*1.2,27,50),h=hero?6:4,x=s.x-w/2,y=s.y-this.scale*raise;
    c.fillStyle='#172b30df';c.fillRect(x-1,y-1,w+2,h+2);c.fillStyle=isPlayer?'#b5dc6c':p.main;c.fillRect(x,y,w*clamp(e.hp/e.maxHp,0,1),h);
    c.fillStyle='#ffffff25';c.fillRect(x,y,w*clamp(e.hp/e.maxHp,0,1),Math.max(1,h/3));
    if(hero){
      const mp=clamp((e.mp||0)/(e.maxMp||1),0,1);c.fillStyle='#203449';c.fillRect(x,y+h+2,w,2);c.fillStyle='#76bce7';c.fillRect(x,y+h+2,w*mp,2);
      c.font=`600 ${clamp(this.scale*.3,11,14)}px "Microsoft YaHei","PingFang SC",sans-serif`;c.textAlign='center';c.textBaseline='bottom';c.lineWidth=2.5;c.strokeStyle='#243b38';c.strokeText(e.name||HEROES.find(h=>h.id===e.heroId)?.name||'',s.x,y-5);c.fillStyle=isPlayer?'#fff4bb':'#f0f4dc';c.fillText(e.name||HEROES.find(h=>h.id===e.heroId)?.name||'',s.x,y-5);
      const r=8;c.fillStyle='#182f36';c.fillRect(x-r*1.8,y-2,r*1.5,12);c.fillStyle='#e8dfa7';c.font='bold 10px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(e.level||1),x-r*1.05,y+4);
    }
    if(structure&&e.protected){c.font='12px sans-serif';c.fillStyle='#e6f0dd';c.textAlign='center';c.fillText('◆',s.x,y-6);}
  }

  drawMinimap(canvas,world){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,b=this.bound;const sx=x=>(x+b)/(b*2)*w,sy=y=>(y+b)/(b*2)*h;
    c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.drawImage(this.miniTerrain,0,0,w,h);c.fillStyle='#071c2f50';c.fillRect(0,0,w,h);
    for(const e of world.entities||[]){
      if(e.alive===false||(e.team!==world.player?.team&&e.team!=='neutral'&&(e.visibleTo?.[world.player?.team||'blue']===false||e.invisibleTimer>0)))continue;const x=sx(e.x),y=sy(e.y),p=PALETTE[e.team]||PALETTE.neutral;
      if(e.type==='hero'){
        const is=e===world.player,r=is?5.1:3.8;c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=is?'#fff1ae':p.main;c.fill();c.strokeStyle=is?'#fff8dd':'#14323e';c.lineWidth=is?1.5:1;c.stroke();
        if(is){c.beginPath();c.moveTo(x,y-8);c.lineTo(x-2.5,y-4.8);c.lineTo(x+2.5,y-4.8);c.closePath();c.fill();}
      }else if(e.type==='tower'){const r=2.4;polygon(c,[[x,y-r],[x+r,y],[x,y+r],[x-r,y]],p.main,'#0b2531',1);}
      else if(e.type==='core'){polygon(c,[[x,y-4],[x+3.5,y],[x,y+4],[x-3.5,y]],p.light,p.dark,1);}
      else if(e.type==='monster'){ellipse(c,x,y,1.5,1.5,p.main);}
      else{c.fillStyle=p.main;c.fillRect(x-1,y-1,2,2);}
    }
    const halfX=this.width/this.scale/2,halfY=this.height/(this.scale*DEPTH)/2;
    c.strokeStyle='#f4ebc7a0';c.lineWidth=1;c.strokeRect(sx(this.camera.x-halfX),sy(this.camera.y-halfY),halfX*2/(2*b)*w,halfY*2/(2*b)*h);
    c.strokeStyle='#c3b789';c.lineWidth=2;c.strokeRect(1,1,w-2,h-2);
  }
}

export function drawMinimap(canvas,world,renderer){if(renderer)renderer.drawMinimap(canvas,world);}

export function drawHeroPortrait(canvas, heroId, team = 'blue') {
  const c = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  const def = HEROES.find(hero => hero.id === heroId), color = def?.color || '#8ed6eb';
  c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,w,h);
  const glow = c.createRadialGradient(w*.5,h*.35,0,w*.5,h*.45,w*.85);
  glow.addColorStop(0,color+'66');glow.addColorStop(.6,'#183248');glow.addColorStop(1,'#0a1224');c.fillStyle=glow;c.fillRect(0,0,w,h);
  c.strokeStyle=color+'38';c.lineWidth=Math.max(1,w/200);c.beginPath();c.ellipse(w*.5,h*.45,w*.41,h*.34,0,0,TAU);c.stroke();
  c.save();c.translate(w*.5,h*.94);const scale=Math.min(w/2.4,h/2.8);c.scale(scale,scale);
  ellipse(c,0,0,.8,.18,'#05121a66');
  const portraitRenderer = Object.create(Renderer.prototype); portraitRenderer.time = 0;
  portraitRenderer._hero(c,{heroId,id:heroId,team,facing:0},false);
  c.restore();
}
