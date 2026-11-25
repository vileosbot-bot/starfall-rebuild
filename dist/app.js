import { HEROES, ITEMS, MAP, World } from './sim.js';
import { canFullscreen, enterLandscape } from './display.js';
import { Renderer } from './render.js';
import { Renderer3D, HeroStage, webgl2Available } from './render3d.js';
import { drawMinimap, miniToMap } from './minimap.js';
import { portraitSVG, portraitURL, iconSVG } from './portraits.js';
import { GameAudio } from './audio.js';
import { pickEntityAt, nearestAimTarget } from './controls.js';
import { createJoystick, bindPress } from './touch.js';
import { renderCombatRecord, objectiveText, waveCountdown, deathLines, killBanner } from './hud.js';


const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const escape = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const fmt = n => {const t=Math.max(0,Math.floor(n));return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;};
const getHero = id => HEROES.find(h=>h.id===id) || HEROES[0];
const getItem = id => ITEMS.find(i=>i.id===id);
// Entries follow World._cast slot order (Q, E, R).
const skillDisplay = {
  fighter: [['axe','爆发'], ['dash','位移'], ['spin','大招']],
  tank: [['dash','位移'], ['shield','护盾'], ['impact','大招']],
  mage: [['wave','音波'], ['pull','聚敌'], ['chord','大招']],
  marksman: [['bow','重箭'], ['dash','位移'], ['volley','大招']],
  assassin: [['dash','位移'], ['fan','飞匕'], ['dagger','大招']]
};
const lanes = {top:'上路',mid:'中路',bot:'下路',jungle:'打野'};
const storage = {read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v ?? fallback;}catch{return fallback;}},write(key,v){try{localStorage.setItem(key,JSON.stringify(v));}catch{}}};
const saved = storage.read('sf-rebuild-settings',{});
const settings = {volume:clamp(Number(saved.volume ?? .35),0,1),music:!!saved.music,muted:!!saved.muted,quality:['high','medium','low'].includes(saved.quality)?saved.quality:'high',showFps:!!saved.showFps,autoBuy:saved.autoBuy!==false,tutorial:saved.tutorial!==false};
const audio = new GameAudio();
audio.setVolume(settings.volume);audio.setMuted(settings.muted);audio.setMusic(settings.music);
const query = new URLSearchParams(location.search);
let screen='home', selectedHero='fighter', detailSkill=0, difficulty='normal', world=null, renderer=null, heroStage=null, heroStageFailed=false;
let modalType=null, pauseForModal=false, heldScoreboard=false, aimSlot=null, flashAim=false;
let pointer={x:0,y:0}, pointerSeen=false, lastPointerType='mouse', pressed=new Set(), joystickVector={x:0,y:0}, joystick=null;
let lastFrame=performance.now(), accumulator=0, hudTime=0, lastEventId=0, resultShown=false, lastAutoBuy=0;
let frameCount=0,fpsTime=0,fps=60, lastBoard=0, tutorialStep=0, tutorialStart=null, autoAttackHeld=false,lastSoundEffect=0,renderTime=0;
let shopCategory='全部',shopItemId=ITEMS[0]?.id, lastShopBalance=-1, toastTimer, announceTimer, bannerTimer, panPointer=null, panStart=0, frozen=false;
const portraits = Object.fromEntries(HEROES.map(h=>[h.id,portraitURL(h.id)]));
const portrait = (id,cls='') => `<img class="${cls}" src="${portraits[id]}" alt="${escape(getHero(id).name)}" draggable="false">`;
const battle = $('#battle'), overlayCanvas = $('#battle-overlay');
let canvas = $('#battlefield');

function saveSettings(){storage.write('sf-rebuild-settings',settings);audio.setVolume(settings.volume);audio.setMuted(settings.muted);audio.setMusic(settings.music);$('#tutorial-toggle').checked=settings.tutorial;$('#fps').hidden=!settings.showFps;}
function notify(message){if(!message)return;$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2300);}
function announce(message){$('#announcement').textContent=message;$('#announcement').classList.add('show');clearTimeout(announceTimer);announceTimer=setTimeout(()=>$('#announcement').classList.remove('show'),2800);}
function clickSound(){audio.unlock();audio.play('ui');}
function changeScreen(next){screen=next;for(const id of ['home','selection','battle'])$('#'+id).hidden=id!==next;$('#stars').hidden=next==='battle';document.body.dataset.screen=next;pressed.clear();joystick?.reset();joystickVector={x:0,y:0};autoAttackHeld=false;if(next==='battle')resize();}
function showModal(type,body,{title='',wide='',footer='',pause=false}={}){
  if(modalType)closeModal();modalType=type;pauseForModal=!!(pause&&world&&!world.winner&&screen==='battle');
  if(pauseForModal){world.paused=true;pressed.clear();world.input={x:0,y:0};}
  $('#modal').className=`modal ${wide}`;$('#modal').setAttribute('aria-label',title||'游戏对话框');
  $('#modal').innerHTML=`${title?`<header class="modal-header"><h2>${escape(title)}</h2>${type==='shop'?'<span class="shop-balance" id="shop-balance"></span>':''}<button class="modal-close" aria-label="关闭" data-close>×</button></header>`:''}<div class="modal-body">${body}</div>${footer?`<footer class="modal-footer">${footer}</footer>`:''}`;
  $('#overlay').hidden=false;$('#modal [data-close]')?.addEventListener('click',closeModal);
  $('#modal').querySelector('button,select,input')?.focus({preventScroll:true});
}
function closeModal(){if(pauseForModal&&world)world.paused=false;pauseForModal=false;modalType=null;heldScoreboard=false;$('#overlay').hidden=true;$('#modal').innerHTML='';pressed.clear();if(screen==='battle')canvas.focus({preventScroll:true});}
$('#overlay').addEventListener('pointerdown',e=>{if(e.target===$('#overlay')&&modalType!=='result')closeModal();});

function heroSelect(){changeScreen('selection');detailSkill=0;renderRoster();renderSelected();}
function renderRoster(){
  $('#roster').innerHTML=HEROES.map(h=>`<button class="hero-card" data-hero="${h.id}" role="option" aria-selected="${h.id===selectedHero}" style="--hero:${h.color}"><span class="card-portrait">${portrait(h.id)}</span><span class="card-info"><strong>${escape(h.name)}<i class="card-role">${escape(h.role)}</i></strong><small>${escape(h.title)}</small><em><span>${lanes[h.lane]||''}</span></em><span class="difficulty-stars">${'★'.repeat(h.difficulty||1)}${'☆'.repeat(3-(h.difficulty||1))}</span></span></button>`).join('');
  $$('#roster button').forEach(btn=>btn.addEventListener('click',()=>{selectedHero=btn.dataset.hero;detailSkill=0;clickSound();renderRoster();renderSelected();}));
}
const SLOT_NAMES=['一技能','二技能','大招'];
function skillTags(s,label){
  const v=s.values||{},tags=[];
  tags.push(label);if(label!=='位移' && (v.dashSpeed||v.leapTime||v.vanish))tags.push('位移');if(v.slow)tags.push('减速');if(v.knockup||v.stun)tags.push('控制');if(v.shield&&label!=='护盾')tags.push('护盾');if(v.haste||v.asBonus)tags.push('加速');if(v.reduction)tags.push('减伤');
  tags.push({cone:'面前一片扇形',direction:'直线方向',position:'指定区域',self:'身边一圈',target:'指定敌方英雄'}[s.castType]||'');
  return tags.filter(Boolean);
}
const span=a=>Array.isArray(a)?(a[0]===a[a.length-1]?`${a[0]}`:`${a[0]}~${a[a.length-1]}`):`${a}`;
function skillNumbers(h,s){
  const v=s.values||{},parts=[],kind=(h.id==='tank' && s===h.skills[1]) || h.damageType==='magic'?'法术':'物理';
  if(v.damage){const ratio=v.adRatio?`(+${Math.round(v.adRatio*100)}%物攻)`:v.apRatio?`(+${Math.round(v.apRatio*100)}%法强)`:v.hpRatio&&!v.shield?`(+${Math.round(v.hpRatio*100)}%生命)`:'';parts.push(`造成 ${Array.isArray(v.damage)?v.damage.join('/'):v.damage}${ratio} 点${kind}伤害`);}
  if(v.shield)parts.push(`获得 ${Array.isArray(v.shield)?v.shield.join('/'):v.shield}(+${Math.round((v.hpRatio||0)*100)}%生命) 护盾，持续 ${v.duration} 秒`);
  if(v.slow)parts.push(`减速 ${Math.round(v.slow*100)}%${v.slowDur?`，持续 ${v.slowDur} 秒`:''}`);
  if(v.knockup)parts.push(`击飞 ${v.knockup} 秒`);if(v.asBonus)parts.push(`攻速提高 ${span(v.asBonus.map(value=>Math.round(value*100)))}%，持续 ${v.asDur} 秒`);
  if(v.haste)parts.push(`移速提高 ${Math.round(v.haste*100)}%，持续 ${v.hasteDur} 秒`);if(v.reduction)parts.push(`期间减伤 ${Math.round(v.reduction*100)}%`);
  return parts.join('，')+(parts.length?'。':'');
}
function radarSVG(values,labels){
  const n=values.length,pt=(i,r)=>{const a=-Math.PI/2+i*Math.PI*2/n;return `${(60+Math.cos(a)*r).toFixed(1)},${(60+Math.sin(a)*r).toFixed(1)}`;};
  const grid=[14,28,42].map(r=>`<polygon points="${values.map((_,i)=>pt(i,r)).join(' ')}" fill="none" stroke="#7f95c044"/>`).join('');
  return `<svg class="radar" viewBox="-14 -6 148 132" aria-hidden="true">${grid}${values.map((_,i)=>`<line x1="60" y1="60" x2="${pt(i,42).split(',')[0]}" y2="${pt(i,42).split(',')[1]}" stroke="#7f95c033"/>`).join('')}<polygon points="${values.map((v,i)=>pt(i,42*v/5)).join(' ')}" fill="#e7bd5540" stroke="#f1cf7a" stroke-width="1.5"/>${labels.map((t,i)=>{const [x,y]=pt(i,54).split(',');return `<text x="${x}" y="${y}" font-size="9.5" fill="#b9c8e2" text-anchor="middle" dominant-baseline="middle">${t}</text>`;}).join('')}</svg>`;
}
function renderSelected(){
  const h=getHero(selectedHero),s=h.skills[detailSkill];$('#selection').style.setProperty('--hero',h.color);
  $('#stage-name').textContent=h.name;$('#stage-title').textContent=h.title;$('#stage-role').textContent=h.role;
  if(!heroStage&&!heroStageFailed&&webgl2Available()){try{heroStage=new HeroStage($('#hero-stage-canvas'));}catch(err){console.warn('hero stage falls back to 2D art',err);heroStageFailed=true;}}
  if(heroStage){heroStage.setHero(h.id);$('#hero-art').hidden=true;$('#hero-stage-canvas').hidden=false;}
  else{$('#hero-stage-canvas').hidden=true;$('#hero-art').hidden=false;$('#hero-art').innerHTML=portraitSVG(h.id,{idPrefix:'stage',full:false});}
  const ratings={tank:[5,2,2,4],fighter:[4,4,3,3],mage:[2,5,2,4],marksman:[2,5,3,2],assassin:[2,5,5,3]}[h.id],st=h.stats;
  $('#hero-detail').innerHTML=`<div class="detail-eyebrow"><span>定位 <b class="role-tag">${escape(h.role)}</b></span><span>路线 <b>${lanes[h.lane]||''}</b></span><span><b>${h.attackType==='ranged'?'远程':'近战'}</b></span><span class="detail-stars">难度 ${'★'.repeat(h.difficulty||1)}${'☆'.repeat(3-(h.difficulty||1))}</span></div><p class="hero-description">${escape(h.description)}</p><h4 class="detail-h">技能</h4><div class="detail-skills">${h.skills.map((k,i)=>`<button class="detail-skill ${i===detailSkill?'selected':''}" data-detail-skill="${i}" aria-label="${escape(k.name)}">${iconSVG(skillDisplay[h.id][i][0],{color:h.color})}<kbd>${k.key||['Q','E','R'][i]}</kbd></button>`).join('')}<span class="detail-skill passive" title="被动：${escape(h.passive?.name||'')}">${iconSVG('magic',{color:'#e7bd55'})}<kbd>被动</kbd></span><span class="detail-skill mini" title="闪现">${iconSVG('flash',{color:'#ffe09a'})}</span><span class="detail-skill mini" title="治疗">${iconSVG('heal',{color:'#a0eab4'})}</span></div><div class="skill-description"><h4>${escape(s.name)} <kbd>${s.key}</kbd> <em>${SLOT_NAMES[detailSkill]}</em></h4><div class="skill-tags">${skillTags(s,skillDisplay[h.id][detailSkill][1]).map(t=>`<i>${t}</i>`).join('')}</div><div class="skill-meta"><span>冷却 ${span(s.cooldowns||s.cooldown)} 秒</span><span>消耗 ${span(s.manaCosts||s.mana)}</span><span>距离 ${s.range} 米</span></div><p>${escape(s.description)}${skillNumbers(h,s)?'<br>'+escape(skillNumbers(h,s)):''}</p><p class="passive-line">被动 · ${escape(h.passive?.name||'')}</p></div><h4 class="detail-h">能力</h4><div class="ability">${radarSVG(ratings,['生存','输出','机动','控制'])}<div class="stat-grid"><span>生命<b>${st.hp}</b></span><span>法力<b>${st.mp}</b></span><span>物攻<b>${st.ad}</b></span><span>攻速<b>${st.attackSpeed.toFixed(2)}</b></span><span>护甲<b>${st.armor}</b></span><span>魔抗<b>${st.mr}</b></span></div></div><p class="selection-note">2 级解锁二技能 · 4 级解锁大招 · 摧毁任意一路高地塔即可进攻敌方水晶。</p>`;
  $$('[data-detail-skill]').forEach(btn=>btn.addEventListener('click',()=>{detailSkill=Number(btn.dataset.detailSkill);clickSound();renderSelected();}));
}
function cycleHero(step){const i=HEROES.findIndex(h=>h.id===selectedHero);selectedHero=HEROES[(i+step+HEROES.length)%HEROES.length].id;detailSkill=0;renderRoster();renderSelected();audio.play('ui');}
$('#hero-prev').addEventListener('click',()=>cycleHero(-1));$('#hero-next').addEventListener('click',()=>cycleHero(1));
const appRoot = $('#app');
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
$('#ios-hint').hidden = !isIOS || matchMedia('(display-mode: standalone)').matches;
$('#portrait-start').addEventListener('click', () => { clickSound(); heroSelect(); });
$('#start').addEventListener('click', () => {
  clickSound();
  const mobile = navigator.maxTouchPoints > 0 || matchMedia('(orientation: portrait)').matches;
  const pending = enterLandscape(appRoot, window.screen.orientation, mobile);
  heroSelect();
  pending.then(locked => {
    if (mobile && !locked) notify('请旋转手机横屏游玩');
  });
});
$('#back-home').addEventListener('click',()=>{clickSound();changeScreen('home');});
const difficultyNames={easy:'简单',normal:'普通',hard:'困难'};
$$('[data-difficulty]').forEach(btn=>btn.addEventListener('click',()=>{difficulty=btn.dataset.difficulty;clickSound();$$('[data-difficulty]').forEach(b=>b.setAttribute('aria-checked',String(b===btn)));$('#difficulty-description').textContent={easy:'对手更宽容，适合第一次来到星陨高原',normal:'均衡的对抗，适合熟悉 MOBA 的玩家',hard:'更果断的对手，需要更好的走位与配合'}[difficulty];}));
$('#tutorial-toggle').checked=settings.tutorial;$('#tutorial-toggle').addEventListener('change',e=>{settings.tutorial=e.target.checked;saveSettings();});

// WebGL2 first; the original Canvas2D renderer remains the fallback (or ?renderer=2d).
function makeRenderer(){
  if(query.get('renderer')!=='2d'&&webgl2Available()){
    try{const r=new Renderer3D(canvas,overlayCanvas,{antialias:settings.quality!=='low'&&query.get('aa')!=='0'});overlayCanvas.hidden=false;battle.dataset.renderer='webgl2';return r;}
    catch(err){console.warn('WebGL2 renderer failed, falling back to Canvas2D',err);const fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);canvas=fresh;bindCanvas(canvas);}
  }
  overlayCanvas.hidden=true;battle.dataset.renderer='canvas2d';return new Renderer(canvas);
}
async function startMatch(options={}){
  closeModal();audio.unlock();$('#loading').hidden=false;pressed.clear();
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,80)));
  try{
    if(options.heroId)selectedHero=options.heroId;
    world=new World({heroId:selectedHero,difficulty:options.difficulty||difficulty,seed:options.seed??Math.floor(Date.now()%2147483647)});
    world.command({type:'autoBuy',enabled:settings.autoBuy});
    renderer??=makeRenderer();changeScreen('battle');renderer.resetCamera(world.player);lastEventId=0;lastSoundEffect=0;resultShown=false;accumulator=0;hudTime=0;lastAutoBuy=0;
    aimSlot=null;flashAim=false;autoAttackHeld=false;pointerSeen=false;tutorialStep=0;tutorialStart={x:world.player.x,y:world.player.y};
    setupPlayerUI();$('#killfeed').innerHTML='';$('#announcement').classList.remove('show');$('#kill-banner').hidden=true;
    if(settings.tutorial&&options.tutorial!==false)showTutorial();else $('#tutorial').hidden=true;
    audio.play('start');updateHUD();canvas.focus({preventScroll:true});lastFrame=performance.now();
  }catch(err){console.error(err);notify('战场载入遇到问题，请返回重试。');changeScreen('selection');}
  finally{$('#loading').hidden=true;}
}
$('#enter-match').addEventListener('click',()=>startMatch());
function setupPlayerUI(){
  const h=getHero(world.player.heroId);$('#player-portrait').innerHTML=portrait(h.id);$('#player-name').textContent=h.name;
  const movementSlot = skillDisplay[h.id][0][1] === '位移' ? 0 : 1;
  $$('.sk-skill[data-skill]').forEach(btn => {
    const slot = Number(btn.dataset.skill);
    const [icon, label] = skillDisplay[h.id][slot];
    const skill = h.skills[slot];
    btn.querySelector('small').textContent = label;
    if (slot < 2) {
      btn.style.gridArea = slot === movementSlot ? 'move' : 'burst';
      btn.classList.toggle('sk-move', slot === movementSlot);
      btn.classList.toggle('sk-burst', slot !== movementSlot);
    }
    btn.querySelector('.skill-art').innerHTML = iconSVG(icon, {color:'#fff3d0'});
    btn.setAttribute('aria-label', `${skill.name}（${skill.key}）`);
    btn.title = `${skill.name}：${skill.description}`;
  });
  $('#inventory').innerHTML=Array.from({length:6},(_,i)=>`<button data-inventory="${i}" aria-label="装备栏 ${i+1}"></button>`).join('');
  $$('#inventory button').forEach(btn=>btn.addEventListener('click',()=>{const id=world.player.items[Number(btn.dataset.inventory)];if(id)shopItemId=id;openShop();}));
  const mates=world.entities.filter(e=>e.type==='hero'&&e.team===world.player.team&&!e.isPlayer);
  $('#team-strip').innerHTML=mates.map(m=>`<div class="ts-mate" data-mate="${m.id}">${portrait(m.heroId)}<i><b></b></i><em></em></div>`).join('');
  $('#fps').hidden=!settings.showFps;
}

function command(cmd,{quiet=false}={}){
  if(!world||world.winner||world.paused)return {ok:false};
  const r=world.command(cmd)||{ok:true};
  if(!r.ok&&!quiet)notify(r.message||'暂时无法执行此操作');
  if(r.ok){if(cmd.type==='cast'){audio.play('cast');advanceTutorial('skill');}else if(cmd.type==='recall')audio.play('recall');else if(cmd.type==='purchase'){audio.play('purchase');advanceTutorial('shop');}else if(cmd.type==='attack')audio.play('attack');}
  return r;
}
function aimAt(auto=false){
  const p=world.player;
  if(!auto&&pointerSeen&&Math.hypot(pointer.x-p.x,pointer.y-p.y)>.5)return pointer;
  const target=nearestAimTarget(world.entities,p);
  if(target)return {x:target.x,y:target.y};
  return {x:p.x+Math.cos(p.facing||-Math.PI/4)*8,y:p.y+Math.sin(p.facing||-Math.PI/4)*8};
}
function useSkill(slot,{instant=false}={}){
  if(!world||world.paused||world.winner||!world.player.alive)return;
  const s=getHero(world.player.heroId).skills[slot],rank=world.player.skillLevels?.[slot]??1;
  if(!rank){notify(slot===2?'大招将在 4 级解锁':'二技能将在 2 级解锁');return;}
  if(world.player.cooldowns[slot]>.05){notify('技能尚未冷却');return;}
  if(world.player.mp<(s.manaCosts?.[rank-1]??s.mana)){notify('法力不足');return;}
  if(s.castType==='self'||instant||aimSlot===slot){const target=aimAt(instant);command({type:'cast',slot,...target});aimSlot=null;flashAim=false;}
  else{aimSlot=slot;flashAim=false;notify(`${s.name}：点击目标位置释放，右键取消`);}
}
function basicAttack(){if(!world)return;aimSlot=null;flashAim=false;const r=command({type:'attack'},{quiet:true});if(r.ok)advanceTutorial('attack');}
function issueAt(x,y,button='left',touch=false){
  if(!world||world.paused||modalType||world.winner)return;
  pointer=renderer.screenToWorld(x,y);pointerSeen=true;
  if(button==='right'&&(aimSlot!==null||flashAim)){aimSlot=null;flashAim=false;return;}
  if(aimSlot!==null){command({type:'cast',slot:aimSlot,...pointer});aimSlot=null;return;}
  if(flashAim){command({type:'flash',...pointer});flashAim=false;return;}
  const p=world.player,target=pickEntityAt(world.entities,renderer,x,y,p.team);
  if(target){command({type:'attack',targetId:target.id});advanceTutorial('attack');}
  else if(button==='right'||touch){command({type:'move',...pointer},{quiet:true});renderer.follow();}
}
function moveVector(){
  let x=(pressed.has('d')||pressed.has('arrowright')?1:0)-(pressed.has('a')||pressed.has('arrowleft')?1:0)+joystickVector.x;
  let y=(pressed.has('s')||pressed.has('arrowdown')?1:0)-(pressed.has('w')||pressed.has('arrowup')?1:0)+joystickVector.y;
  const len=Math.hypot(x,y);return len>1?{x:x/len,y:y/len}:{x,y};
}
// Flash follows the held direction (joystick or keys) first, then the mouse cursor, then the facing.
function flashTarget(){
  const p=world.player,v=moveVector(),len=Math.hypot(v.x,v.y);
  if(len>.1)return {x:p.x+v.x/len*6,y:p.y+v.y/len*6};
  if(lastPointerType==='mouse'&&pointerSeen&&Math.hypot(pointer.x-p.x,pointer.y-p.y)>.5)return pointer;
  return {x:p.x+Math.cos(p.facing||0)*6,y:p.y+Math.sin(p.facing||0)*6};
}
function useFlash(){if(world)command({type:'flash',...flashTarget()});}
function bindCanvas(el){
  el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('pointermove',e=>{if(!renderer||e.pointerType!=='mouse')return;const r=el.getBoundingClientRect();pointer=renderer.screenToWorld(e.clientX-r.left,e.clientY-r.top);pointerSeen=true;lastPointerType='mouse';});
  el.addEventListener('pointerdown',e=>{e.preventDefault();lastPointerType=e.pointerType;el.focus({preventScroll:true});const r=el.getBoundingClientRect();issueAt(e.clientX-r.left,e.clientY-r.top,e.button===2?'right':'left',e.pointerType!=='mouse');});
}
bindCanvas(canvas);
// Every control below owns its own pointerId (see touch.js), so they work simultaneously.
$$('.sk-skill[data-skill]').forEach(btn=>{
  const slot=Number(btn.dataset.skill);
  bindPress(btn,{
    down:()=>{audio.unlock();},
    drag:(dx,dy)=>{if(!world||!world.player.alive)return;const s=getHero(world.player.heroId).skills[slot];if(!(world.player.skillLevels?.[slot])||world.player.cooldowns[slot]>.05)return;aimSlot=slot;const len=Math.hypot(dx,dy)||1,dist=Math.min(s.range||9,len/9);pointer={x:world.player.x+dx/len*dist,y:world.player.y+dy/len*dist};pointerSeen=true;},
    up:({dragged,event})=>{if(!world||modalType)return;if(dragged&&aimSlot===slot){command({type:'cast',slot,...pointer});aimSlot=null;}else useSkill(slot,{instant:event.pointerType!=='mouse'});},
    cancel:()=>{if(aimSlot===slot)aimSlot=null;},
    key:()=>useSkill(slot)
  });
});
bindPress($('#attack-button'),{down:()=>{audio.unlock();basicAttack();autoAttackHeld=true;},up:()=>{autoAttackHeld=false;},cancel:()=>{autoAttackHeld=false;},key:()=>basicAttack()});
bindPress($('#flash'),{down:()=>{audio.unlock();useFlash();},key:useFlash});
bindPress($('#heal'),{down:()=>{audio.unlock();command({type:'heal'});},key:()=>command({type:'heal'})});
bindPress($('#recall'),{down:()=>{audio.unlock();command({type:'recall'});},key:()=>command({type:'recall'})});
$('#camera-follow').addEventListener('click',()=>{renderer?.follow();canvas.focus({preventScroll:true});});
joystick=createJoystick($('#joystick'),$('#joystick-knob'),{onVector:v=>{joystickVector=v;if(v.x||v.y){lastPointerType='touch';renderer?.follow();}}});
function panMinimap(e){if(!world||!renderer)return;const rect=$('#minimap').getBoundingClientRect(),m=miniToMap(e.clientX-rect.left,e.clientY-rect.top,rect.width);renderer.panTo(m.x,m.y);}
// Hold: look at that spot until release. Quick tap: jump there and linger (the renderer returns to the hero
// after ~3.5 s, or at once when the hero is moved).
function endPan(e){if(e.pointerId!==panPointer)return;panPointer=null;if(performance.now()-panStart>260)renderer?.follow();}
$('#minimap').addEventListener('pointerdown',e=>{if(panPointer!==null)return;e.preventDefault();panPointer=e.pointerId;panStart=performance.now();try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}panMinimap(e);});
$('#minimap').addEventListener('pointermove',e=>{if(e.pointerId===panPointer)panMinimap(e);});
$('#minimap').addEventListener('pointerup',endPan);$('#minimap').addEventListener('pointercancel',endPan);

function showKillBanner(e,sticky=false){
  const b=killBanner(world,e);if(!b)return;const el=$('#kill-banner');
  el.className=`kill-banner ${b.tone}${b.first?' first':''}`;$('#kb-text').textContent=b.text;$('#kb-first').hidden=!b.first;
  $('#kb-killer').innerHTML=b.killerHeroId?portrait(b.killerHeroId):'';$('#kb-victim').innerHTML=b.victimHeroId?portrait(b.victimHeroId):'';
  el.hidden=false;clearTimeout(bannerTimer);if(!sticky)bannerTimer=setTimeout(()=>{el.hidden=true;},3800);
}
function updateHUD(){
  if(!world)return;const p=world.player;
  $('#blue-score').textContent=world.score.blue;$('#red-score').textContent=world.score.red;$('#match-time').textContent=fmt(world.time);
  $('#wave-time').textContent=waveCountdown(world);$('#objective-text').textContent=objectiveText(world);
  const gold=Math.floor(p.gold).toLocaleString('en-US');
  renderCombatRecord(p, $('#kda'), $('#cs'));
  $('#gold').textContent=gold;$('#bag-gold').textContent=gold;$('#card-gold').textContent=gold;
  $('#player-level').textContent=p.level;$('#stat-ad').textContent=Math.round(p.ad);$('#stat-armor').textContent=Math.round(p.armor);$('#stat-mr').textContent=Math.round(p.mr);$('#stat-speed').textContent=(Math.round(p.speed*10)/10).toFixed(1);
  $('#health-fill').style.width=`${clamp(p.hp/p.maxHp*100,0,100)}%`;$('#mana-fill').style.width=`${clamp(p.mp/p.maxMp*100,0,100)}%`;
  $('#health-text').textContent=`${Math.ceil(p.hp)}/${Math.ceil(p.maxHp)}`;$('#mana-text').textContent=`${Math.floor(p.mp)}/${Math.floor(p.maxMp)}`;
  $('#xp-fill').style.width=`${p.level>=15?100:clamp((p.xp||0)/(p.xpToNext||1)*100,0,100)}%`;
  const cdText=cd=>cd>=1?String(Math.ceil(cd)):cd.toFixed(1);
  $$('.sk-skill[data-skill]').forEach(btn=>{const slot=Number(btn.dataset.skill),cd=p.cooldowns[slot]||0,rank=p.skillLevels?.[slot]??1;const locked=!rank;
    btn.classList.toggle('locked',locked);btn.classList.toggle('on-cooldown',!locked&&cd>.05);btn.classList.toggle('aiming',slot===aimSlot);btn.querySelector('.cooldown').textContent=!locked&&cd>.05?cdText(cd):'';
    btn.setAttribute('aria-disabled',String(locked||!p.alive||cd>.05));
  });
  for(const [id,cd] of [['flash',p.flashCooldown],['heal',p.healCooldown]]){const b=$('#'+id);b.classList.toggle('on-cooldown',cd>.05);b.querySelector('.cooldown').textContent=cd>.05?cdText(cd):'';b.setAttribute('aria-disabled',String(cd>.05||!p.alive));}
  $('#recall').classList.toggle('channeling',p.recallTimer>0);
  $('#skill-controls').classList.toggle('dead',!p.alive);battle.classList.toggle('player-dead',!p.alive&&!world.winner);
  $$('#inventory button').forEach((btn,i)=>{const id=p.items[i]||'';if(btn.dataset.item!==id){btn.dataset.item=id;btn.classList.toggle('filled',!!id);btn.innerHTML=id?iconSVG(id,{color:'#e6cc8b'}):'';btn.title=id?getItem(id)?.name:'空装备栏';btn.setAttribute('aria-label',id?`${getItem(id)?.name}，查看商店`:`空装备栏 ${i+1}`);}});
  $$('#team-strip .ts-mate').forEach(el=>{const m=world.getEntity(Number(el.dataset.mate));if(!m)return;el.classList.toggle('down',!m.alive);el.querySelector('b').style.width=`${clamp(m.hp/m.maxHp*100,0,100)}%`;el.querySelector('em').textContent=m.alive?'':Math.ceil(m.respawnTimer||0);});
  $('#channel').hidden=!(p.recallTimer>0);if(p.recallTimer>0)$('#channel b').style.width=`${(1-p.recallTimer/5)*100}%`;
  const dead=!p.alive&&!world.winner;
  if(dead&&$('#respawn').hidden){const d=deathLines(world);$('#death-killer').textContent=d.killer;}
  $('#respawn').hidden=!dead;if(dead)$('#respawn-time').textContent=Math.ceil(p.respawnTimer||0);else if(battle.dataset.deathBanner==='1'){battle.dataset.deathBanner='0';$('#kill-banner').hidden=true;}
  battle.dataset.playerX=p.x.toFixed(2);battle.dataset.playerY=p.y.toFixed(2);battle.dataset.playerAlive=String(p.alive);battle.dataset.matchTime=world.time.toFixed(2);battle.dataset.matchState=world.winner?'finished':world.paused?'paused':'running';battle.dataset.entityCount=String(world.entities.length);
  if(modalType==='shop'&&Math.floor(p.gold)!==lastShopBalance)updateShopMoney();
  if(modalType==='scoreboard'&&world.time-lastBoard>.5){updateScoreboard();lastBoard=world.time;}
  if(tutorialStep===0&&tutorialStart&&Math.hypot(p.x-tutorialStart.x,p.y-tutorialStart.y)>2)advanceTutorial('move');
  for(const fx of world.effects){if(fx.id<=lastSoundEffect)continue;lastSoundEffect=fx.id;if(Math.hypot(fx.x-p.x,fx.y-p.y)<16){if(fx.kind==='hit')audio.play('hit');else if(fx.kind==='projectile'||fx.kind==='slash')audio.play('attack');}}
  for(const e of world.events){if(e.id<=lastEventId)continue;lastEventId=e.id;
    if(['kill','tower','monster'].includes(e.type)){const row=document.createElement('div');row.className=`feed-row ${e.team}`;row.textContent=e.text;$('#killfeed').prepend(row);while($('#killfeed').children.length>4)$('#killfeed').lastChild.remove();setTimeout(()=>row.remove(),6500);}
    if(e.type==='kill'){audio.play(e.victimId===p.id?'death':'kill');
      if(e.victimId===p.id){showKillBanner(e,true);battle.dataset.deathBanner='1';}else if(e.killerId===p.id||e.firstBlood)showKillBanner(e);}
    if(e.type==='tower'){audio.play('tower');announce(e.text);advanceTutorial('push');}
    if(e.type==='level'){audio.play('purchase');announce(e.text);}
    if(e.type==='purchase'){notify(e.text);advanceTutorial('shop');}
    if(e.type==='start')announce('全军出击');
  }
}

const tutorialSteps=[
  {key:'move',title:'移动',text:'按 W A S D 移动，或鼠标右键点地面。',touchText:'拖动左下角摇杆移动英雄，松开摇杆停止。'},
  {key:'attack',title:'普攻',text:'右键点敌人，或按空格 / 右下角普攻键攻击最近目标。',touchText:'轻点敌方单位或右下角普攻按钮，攻击最近的目标。'},
  {key:'skill',title:'技能',text:'按 Q / E / R 进入技能瞄准，再点击释放。',touchText:'轻点技能按钮施放；按住并拖动技能按钮可调整瞄准方向。'},
  {key:'shop',title:'装备',text:'点击小地图下方的钱袋（P）打开商店，购买装备。',touchText:'点击小地图下方的钱袋打开商店，选择装备购买。'},
  {key:'push',title:'推塔',text:'跟随小兵依次摧毁三座塔，破高地后拆水晶。B 回城、F 闪现、G 治疗。',touchText:'跟随己方小兵推进，依次摧毁防御塔与水晶；使用右侧技能按钮作战。'}
];
function showTutorial(){if(tutorialStep>=tutorialSteps.length){$('#tutorial').hidden=true;return;}const t=tutorialSteps[tutorialStep],touch=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;$('#tutorial').classList.toggle('touch',touch);$('#tutorial').hidden=false;$('#tutorial-title').textContent=t.title;$('#tutorial-text').textContent=touch?(t.touchText||t.text):t.text;$('#tutorial-steps').textContent=`${tutorialStep+1}/${tutorialSteps.length}`;$('#tutorial-next').textContent=tutorialStep===tutorialSteps.length-1?'开始战斗':'下一步';}
function advanceTutorial(key){if(!settings.tutorial||$('#tutorial').hidden)return;if(tutorialSteps[tutorialStep]?.key===key){tutorialStep++;showTutorial();}}
$('#tutorial-next').addEventListener('click',()=>{tutorialStep++;showTutorial();});$('#close-tutorial').addEventListener('click',()=>$('#tutorial').hidden=true);


function openSettings(){
  clickSound();const inMatch=screen==='battle'&&world&&!world.winner;
  showModal('settings',`${inMatch?'<div class="pause-label">对局已暂停</div>':''}<div class="setting-row"><div><strong>主音量</strong><small>技能、攻击与界面音效</small></div><input id="setting-volume" type="range" min="0" max="100" value="${Math.round(settings.volume*100)}" aria-label="主音量"></div><div class="setting-row"><div><strong>背景音乐</strong><small>轻量合成的星空氛围音乐</small></div><input id="setting-music" type="checkbox" ${settings.music?'checked':''} aria-label="背景音乐"></div><div class="setting-row"><div><strong>静音</strong><small>关闭全部声音</small></div><input id="setting-muted" type="checkbox" ${settings.muted?'checked':''} aria-label="静音"></div><div class="setting-row"><div><strong>画面质量</strong><small>降低质量可减轻手机的运行负担</small></div><select id="setting-quality" aria-label="画面质量"><option value="high" ${settings.quality==='high'?'selected':''}>高</option><option value="medium" ${settings.quality==='medium'?'selected':''}>中</option><option value="low" ${settings.quality==='low'?'selected':''}>低</option></select></div><div class="setting-row"><div><strong>推荐出装</strong><small>金币足够时自动购买当前英雄的推荐装备</small></div><input id="setting-autobuy" type="checkbox" ${settings.autoBuy?'checked':''} aria-label="推荐出装"></div><div class="setting-row"><div><strong>显示帧率</strong><small>在战场上显示当前运行帧率</small></div><input id="setting-fps" type="checkbox" ${settings.showFps?'checked':''} aria-label="显示帧率"></div><p class="setting-note">电脑使用键鼠，手机建议横屏并使用摇杆。设置和对战记录保存在当前浏览器。</p>`,{title:inMatch?'暂停与设置':'设置',pause:!!inMatch,footer:`${inMatch?'<button class="quit-link" id="quit-match">返回标题</button>':''}<button class="primary" id="settings-done">${inMatch?'继续对战':'完成'}</button>`});
  $('#setting-volume').addEventListener('input',e=>{settings.volume=Number(e.target.value)/100;saveSettings();});
  $('#setting-volume').addEventListener('change',()=>audio.play('purchase'));
  for(const [id,prop] of [['music','music'],['muted','muted'],['autobuy','autoBuy'],['fps','showFps']])$('#setting-'+id).addEventListener('change',e=>{settings[prop]=e.target.checked;saveSettings();if(prop==='autoBuy'&&world)world.command({type:'autoBuy',enabled:settings.autoBuy});});
  $('#setting-quality').addEventListener('change',e=>{settings.quality=e.target.value;saveSettings();resize();});$('#settings-done').addEventListener('click',closeModal);
  $('#quit-match')?.addEventListener('click',()=>showQuit());
}
function showQuit(){showModal('quit','<p style="color:#afc1d9;line-height:1.9">当前对局尚未结束。返回标题后可以重新选择英雄并开始新的一局。</p>',{title:'离开本局？',pause:true,footer:'<button class="secondary" id="stay-match">继续对战</button><button class="primary" id="confirm-quit">返回标题</button>'});$('#stay-match').addEventListener('click',closeModal);$('#confirm-quit').addEventListener('click',()=>{closeModal();world=null;audio.stop();changeScreen('home');});}

function openHelp(tab='keys'){
  clickSound();showModal('help',`<div class="help-tabs"><button data-help="keys" class="${tab==='keys'?'active':''}">键盘鼠标</button><button data-help="touch" class="${tab==='touch'?'active':''}">触屏操作</button><button data-help="win" class="${tab==='win'?'active':''}">怎么赢</button></div><div id="help-content"></div>`,{title:'操作说明',pause:screen==='battle'});
  const tables={keys:[['W A S D','移动英雄'],['右键','移动到地面，或追击并攻击目标'],['Space','普通攻击附近目标'],['Q / E / R','进入技能瞄准；点击释放，右键取消'],['F / G / B','闪现 / 治疗 / 回城'],['P','打开或关闭装备商店'],['Tab','按住查看双方战况'],['C','镜头回到英雄'],['Esc','取消瞄准、关闭面板或暂停']],touch:[['左侧摇杆','拖动控制英雄移动'],['攻击键','点击或按住攻击附近目标'],['技能键','轻触智能施放；拖动瞄准后松手释放'],['闪现 / 治疗 / 回城','使用通用技能，回城需要保持原地'],['小地图','按住观察战场，松开回到英雄'],['商店 / 金币','查看和购买装备'],['右上角暂停','暂停对局、调整设置']]};
  $('#help-content').innerHTML=tab==='win'?'<div class="help-objectives"><div class="objective-step"><span>Ⅰ</span><div><h3>跟随兵线，获得成长</h3><p>每 30 秒生成一波小兵。补刀、击败敌人、参与团战和打野都能获得金币与经验。升级解锁更强技能。</p></div></div><div class="objective-step"><span>Ⅱ</span><div><h3>推塔需要一步一步</h3><p>每路三座塔依次解锁。敌塔优先攻击小兵，但你攻击塔下敌方英雄会引来塔的仇恨。没有己方小兵时，防御塔会获得减伤。</p></div></div><div class="objective-step"><span>Ⅲ</span><div><h3>攻破高地，摧毁水晶</h3><p>摧毁任意一路高地塔，即可攻击敌方水晶。摧毁水晶获得胜利。阵亡后会在泉水复活，回城也能恢复生命与法力。</p></div></div></div>':`<table class="control-table"><tbody>${tables[tab].map(([a,b])=>`<tr><td>${escape(a)}</td><td>${escape(b)}</td></tr>`).join('')}</tbody></table>`;
  $$('[data-help]').forEach(btn=>btn.addEventListener('click',()=>openHelp(btn.dataset.help)));
}
function openJournal(){
  clickSound();const records=storage.read('sf-rebuild-history',[]);const rows=Array.isArray(records)?records.slice(0,20):[];
  showModal('journal',rows.length?rows.map(r=>`<div class="history-row ${r.won?'win':'loss'}"><strong>${r.won?'胜利':'失败'}</strong><span>${escape(r.hero)}<br><small>${escape(r.kda)} · ${escape(r.duration)}</small></span><span class="history-meta">${escape(r.date)}<br>${escape(r.difficulty)}</span></div>`).join(''):'<div class="history-empty"><span style="font-size:40px;color:#c3a65d">✦</span><strong>你的传奇，由此开始</strong>完成一场对局后，可在这里查看结果与战绩。</div>',{title:'对战记录'});
}
$$('[data-action]').forEach(btn=>btn.addEventListener('click',()=>({settings:openSettings,help:openHelp,journal:openJournal}[btn.dataset.action])()));
$('#pause-button').addEventListener('click',openSettings);
async function toggleBattleFullscreen(){
  try{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(!canFullscreen(appRoot)){notify('当前浏览器不支持全屏显示');return;}
    await appRoot.requestFullscreen();
  }catch{notify('全屏请求被浏览器拒绝');}
}
function syncFullscreenButton(){
  const active=document.fullscreenElement===appRoot,button=$('#fullscreen-button');
  button.setAttribute('aria-pressed',String(active));
  button.setAttribute('aria-label',active?'退出全屏':'切换全屏');
  button.title=active?'退出全屏（Esc）':'切换全屏';
}
$('#fullscreen-button').addEventListener('click',()=>{clickSound();toggleBattleFullscreen();});
document.addEventListener('fullscreenchange',()=>{syncFullscreenButton();resize();});

const shopCategories=[['全部','全部'],['推荐','推荐'],['attack','攻击'],['magic','法术'],['defense','防御'],['boots','移动']];
function openShop(){
  if(!world||world.winner)return;clickSound();aimSlot=null;showModal('shop','<div class="shop-layout"><nav id="shop-categories" class="shop-categories" aria-label="装备分类"></nav><div class="shop-grid" id="shop-grid"></div><aside class="item-detail" id="item-detail"></aside></div><div class="shop-inventory" id="shop-inventory"></div><p class="setting-note" style="margin-top:22px">装备上限 6 件 · 鞋类可升级 · 出售返还 60% 金币</p>',{title:'装备商店',wide:'shop-modal'});renderShop();
}
function itemPrice(item){if(!world)return item.price;const old=world.player.items.map(getItem).find(i=>i?.category==='boots');return item.category==='boots'&&item.tier>1&&old&&old.id!==item.id?Math.max(0,item.price-Math.floor(old.price*.6)):item.price;}
function renderShop(){
  if(modalType!=='shop'||!world)return;
  $('#shop-categories').innerHTML=shopCategories.map(([id,label])=>`<button data-category="${id}" class="${id===shopCategory?'active':''}">${label}</button>`).join('');
  const build=getHero(world.player.heroId).build||[];
  const items=ITEMS.filter(i=>shopCategory==='全部'||(shopCategory==='推荐'?build.includes(i.id):i.category===shopCategory));
  if(!items.some(i=>i.id===shopItemId))shopItemId=items[0]?.id||ITEMS[0].id;
  $('#shop-grid').innerHTML=items.map(i=>`<button class="item-card ${world.player.items.includes(i.id)?'owned':''} ${i.id===shopItemId?'selected':''}" data-item="${i.id}" aria-label="${escape(i.name)}，${i.price}金币"><span class="item-art">${iconSVG(i.id,{color:i.color||'#e1cf95'})}</span><strong>${escape(i.name)}</strong><small>◈ ${i.price}</small></button>`).join('');
  const item=getItem(shopItemId);
  $('#item-detail').innerHTML=`<span class="item-art">${iconSVG(item.id,{color:item.color||'#ead58e'})}</span><h3>${escape(item.name)}</h3><p>${escape(item.description)}${item.passive?`<br><br><span style="color:#c3cfe2">${escape(item.passive.name||'装备效果')}</span>`:''}</p><div class="item-price" id="item-price">◈ ${itemPrice(item)}</div><button class="primary" id="buy-item">购买装备</button>`;
  $('#shop-inventory').innerHTML='<span>当前装备</span>'+Array.from({length:6},(_,i)=>{const item=getItem(world.player.items[i]);return `<button data-sell="${i}" ${item?'':'disabled'} title="${item?escape(`出售 ${item.name}，返还 ${Math.floor(item.price*.6)} 金币`):'空装备栏'}" aria-label="${item?escape(`出售 ${item.name}`):'空装备栏'}">${item?iconSVG(item.id,{color:item.color||'#ecd79c'})+'<small>出售</small>':''}</button>`;}).join('');
  $$('[data-category]').forEach(b=>b.addEventListener('click',()=>{shopCategory=b.dataset.category;renderShop();}));
  $$('[data-item]').forEach(b=>b.addEventListener('click',()=>{shopItemId=b.dataset.item;audio.play('ui');renderShop();}));
  $('#buy-item').addEventListener('click',()=>{const r=command({type:'purchase',itemId:shopItemId});if(r.ok){notify(r.message);renderShop();updateHUD();}});
  $$('[data-sell]').forEach(b=>b.addEventListener('click',()=>{const r=command({type:'sell',slot:Number(b.dataset.sell)});if(r.ok){settings.autoBuy=world.player.autoBuy;saveSettings();notify(r.message);renderShop();updateHUD();}}));
  lastShopBalance=-1;updateShopMoney();
}
function updateShopMoney(){if(modalType!=='shop'||!world)return;lastShopBalance=Math.floor(world.player.gold);$('#shop-balance').textContent=`◈ ${lastShopBalance}`;const item=getItem(shopItemId);if(!item)return;const price=itemPrice(item),boot=world.player.items.map(getItem).find(i=>i?.category==='boots'),sameBoot=item.category==='boots'&&!!boot&&(boot.id===item.id||item.tier===1),full=world.player.items.length>=6&&!(item.category==='boots'&&boot);$('#item-price').textContent=`◈ ${price}`;$('#buy-item').disabled=sameBoot||full||world.player.gold<price;$('#buy-item').textContent=sameBoot?'已装备鞋类':full?'装备栏已满':world.player.gold<price?`还差 ${Math.ceil(price-world.player.gold)}`:'购买装备';}
$('#gold-chip').addEventListener('click',openShop);$('#shop-bag').addEventListener('click',openShop);

function boardHTML(){
  if(!world)return '';
  return ['blue','red'].map(team=>{const heroes=world.entities.filter(e=>e.type==='hero'&&e.team===team);const gold=heroes.reduce((sum,h)=>sum+(h.goldEarned||h.gold),0);const towers=world.entities.filter(e=>e.type==='tower'&&e.team!==team&&!e.alive).length;
    return `<div class="team-heading ${team}"><strong>${team==='blue'?'蓝方 · 我方':'红方 · 敌方'}　${world.score[team]}</strong><span>团队经济 ${Math.round(gold).toLocaleString()}　推塔 ${towers}</span></div><table class="score-table"><thead><tr><th>英雄</th><th>等级</th><th>击杀 / 阵亡 / 助攻</th><th>补刀</th><th>装备</th><th>经济</th></tr></thead><tbody>${heroes.map(h=>`<tr><td class="${h.isPlayer?'you':''}"><span class="score-avatar">${portrait(h.heroId)}</span><span>${escape(h.name)}${h.isPlayer?' · 你':''}${!h.alive?' †':''}</span></td><td>${h.level}</td><td>${h.kills} / ${h.deaths} / ${h.assists}</td><td>${h.cs||0}</td><td>${h.items.length}/6</td><td>${Math.floor(h.goldEarned||h.gold)}</td></tr>`).join('')}</tbody></table>`;
  }).join('');
}
function openScoreboard(){if(!world||world.winner)return;showModal('scoreboard','<div id="board-content"></div>',{title:'双方战况',wide:'scoreboard-modal'});updateScoreboard();}
function updateScoreboard(){if(modalType==='scoreboard')$('#board-content').innerHTML=boardHTML();}
$('#scoreboard-button').addEventListener('click',()=>{clickSound();openScoreboard();});
function showResult(){
  if(resultShown||!world.winner)return;resultShown=true;const p=world.player,won=world.winner==='blue';audio.play(won?'victory':'defeat');
  const old=storage.read('sf-rebuild-history',[]);storage.write('sf-rebuild-history',[{won,hero:p.name,kda:`${p.kills} / ${p.deaths} / ${p.assists}`,duration:fmt(world.time),date:new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),difficulty:difficultyNames[difficulty]},...(Array.isArray(old)?old:[])].slice(0,30));
  showModal('result',`<div class="result-hero ${won?'':'defeat'}"><div class="result-symbol">✦</div><h2>${won?'胜利':'失败'}</h2><p>${won?'VICTORY':'DEFEAT'}</p></div><div class="result-stats"><div><strong>${p.kills} / ${p.deaths} / ${p.assists}</strong><small>击杀 / 阵亡 / 助攻</small></div><div><strong>${fmt(world.time)}</strong><small>对战时长</small></div><div><strong>${Math.floor(p.goldEarned||p.gold).toLocaleString()}</strong><small>累计金币</small></div><div><strong>${p.cs||0}</strong><small>补刀</small></div></div><p class="result-info">${won?'敌方水晶已被摧毁，星陨高原记住了你们的胜利。':'我方水晶被摧毁。调整出装与推进节奏，再战星陨高原。'}</p><details style="padding:0 20px 12px"><summary style="color:#b7c7dc;font-size:13px;cursor:pointer">查看完整战况</summary>${boardHTML()}</details>`,{wide:'result-modal',footer:'<button class="secondary" id="result-home">返回标题</button><button class="primary" id="result-replay">再来一局</button>'});
  $('#result-home').addEventListener('click',()=>{closeModal();world=null;changeScreen('home');});$('#result-replay').addEventListener('click',()=>{closeModal();world=null;heroSelect();});
}

window.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select'))return;
  const key=e.key.toLowerCase();
  if(key==='escape'&&document.fullscreenElement)return;
  if(['tab',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
  if(e.repeat&&key!==' ')return;
  if(key==='escape'){
    e.preventDefault();if(aimSlot!==null||flashAim){aimSlot=null;flashAim=false;return;}
    if(modalType){if(modalType!=='result')closeModal();return;}
    if(screen==='battle')openSettings();else if(screen==='selection')changeScreen('home');return;
  }
  if(modalType){if(key==='p'&&modalType==='shop')closeModal();return;}
  if(screen==='home'&&key==='enter'&&!e.target.closest('button,input')){e.preventDefault();$('#start').click();return;}
  if(screen==='selection'){
    if(key==='enter'){startMatch();return;}
    if(['arrowleft','arrowright','arrowup','arrowdown'].includes(key))cycleHero(['arrowleft','arrowup'].includes(key)?-1:1);return;
  }
  if(screen!=='battle'||!world||world.winner)return;
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){pressed.add(key);renderer.follow();}
  else if(key===' '){basicAttack();pressed.add(' ');}
  else if(['q','e','r'].includes(key))useSkill(['q','e','r'].indexOf(key));
  else if(key==='b')command({type:'recall'});
  else if(key==='f')useFlash();
  else if(key==='g')command({type:'heal'});
  else if(key==='p')openShop();
  else if(key==='tab'){openScoreboard();heldScoreboard=true;}
  else if(key==='c')renderer.follow();
});
window.addEventListener('keyup',e=>{pressed.delete(e.key.toLowerCase());if(e.key==='Tab'&&heldScoreboard)closeModal();});
window.addEventListener('blur',()=>{pressed.clear();joystick?.reset();autoAttackHeld=false;if(world)world.input={x:0,y:0};});
document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();accumulator=0;pressed.clear();joystick?.reset();});

const starCanvas=$('#stars'),starContext=starCanvas.getContext('2d');let stars=[],meteors=[],starWidth=0,starHeight=0;
function setupStars(){starWidth=window.innerWidth;starHeight=window.innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5);starCanvas.width=starWidth*dpr;starCanvas.height=starHeight*dpr;starContext.setTransform(dpr,0,0,dpr,0,0);let s=4181;const rand=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};stars=Array.from({length:Math.min(390,Math.round(starWidth*starHeight/3400))},()=>({x:rand()*starWidth,y:rand()*starHeight,r:rand()<.06?1.5:rand()*.9+.2,a:rand(),phase:rand()*6.28}));meteors=[{x:.13,y:.65,len:.27,speed:.02,phase:0},{x:.88,y:.72,len:.18,speed:.012,phase:.4}];}
function drawStars(t){
  const ctx=starContext,w=starWidth,h=starHeight;ctx.fillStyle='#02050c';ctx.fillRect(0,0,w,h);
  const nebula=ctx.createRadialGradient(w*.5,h*.44,0,w*.5,h*.44,w*.56);nebula.addColorStop(0,'#19304a33');nebula.addColorStop(.5,'#0f1b2f22');nebula.addColorStop(1,'#02050c00');ctx.fillStyle=nebula;ctx.fillRect(0,0,w,h);
  for(const s of stars){const alpha=.25+s.a*.5+Math.sin(t*.6+s.phase)*.2;ctx.fillStyle=`rgba(197,225,241,${alpha})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();if(s.r>1.3){ctx.strokeStyle=`rgba(217,238,251,${alpha*.6})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(s.x-5,s.y);ctx.lineTo(s.x+5,s.y);ctx.moveTo(s.x,s.y-5);ctx.lineTo(s.x,s.y+5);ctx.stroke();}}
  for(const m of meteors){const phase=(t*m.speed+m.phase)%1;const x=(.95-phase)*w,y=(.03+phase*.7)*h;const len=w*m.len;const g=ctx.createLinearGradient(x,y,x+len,y-len*.57);g.addColorStop(0,'#deeee6b0');g.addColorStop(.15,'#b9e2df50');g.addColorStop(1,'#9fbcbe00');ctx.strokeStyle=g;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y-len*.57);ctx.stroke();ctx.fillStyle='#e1f2ed';ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<18;i++){const x=(i*113.77+t*6)%w,y=(i*i*19.31-t*12+h*4)%h;ctx.strokeStyle=`rgba(225,192,116,${.08+(i%4)*.035})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+2,y-9,x+7,y-17);ctx.stroke();}
}
function resize(){setupStars();if(renderer&&screen==='battle'){const box=battle.getBoundingClientRect();renderer.resize(box.width,box.height,Math.min(devicePixelRatio||1,settings.quality==='low'?1:settings.quality==='medium'?1.35:1.75));}}
window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
function frame(now){
  const dt=Math.min(.15,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  frameCount++;fpsTime+=dt;if(fpsTime>=1){fps=Math.round(frameCount/fpsTime);frameCount=0;fpsTime=0;$('#fps').textContent=`${fps} FPS`;}
  if(screen==='battle'&&world&&renderer){
    if(!document.hidden&&!world.paused&&!world.winner&&!frozen){
      const v=modalType?{x:0,y:0}:moveVector();world.input={x:v.x,y:v.y};
      accumulator+=dt;let steps=0;while(accumulator>=1/30&&steps<5){world.step(1/30);accumulator-=1/30;steps++;}
      if(steps===5)accumulator=0;
      if((pressed.has(' ')||autoAttackHeld)&&!modalType&&world.time-lastAutoBuy>.25){basicAttack();lastAutoBuy=world.time;}
    }
    const h=getHero(world.player.heroId);const aim=aimSlot!==null?{slot:aimSlot,...pointer,range:h.skills[aimSlot].range,radius:h.skills[aimSlot].radius||1.4}:null;
    renderTime+=dt;
    if(!modalType||renderTime>.1){renderer.draw(world,{aim,pointer:pointerSeen?pointer:null,quality:settings.quality,dt:frozen?0:renderTime,showRanges:aimSlot!==null});renderTime=0;}
    hudTime+=dt;if(hudTime>.1){updateHUD();drawMinimap($('#minimap'),world,renderer);hudTime=0;}
    if(world.winner&&!resultShown)showResult();
  }else{drawStars(frozen?0:now/1000);if(screen==='selection'&&heroStage&&!modalType)heroStage.draw(frozen?0:dt);}
  audio.update();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('error',e=>{if(e.message&&!/ResizeObserver/.test(e.message))console.error('Game error:',e.message);});
// Read-mostly handle for automated tests and debugging (tests/*.test.mjs drive the game through it).
window.__starfall={
  get world(){return world;},get renderer(){return renderer;},get screen(){return screen;},get joystick(){return joystick;},get stage(){return heroStage;},get input(){return moveVector();},
  start:options=>startMatch({tutorial:false,...options}),select:()=>heroSelect(),
  freeze(value=true){frozen=!!value;},
  /** Advance the simulation deterministically (frame loop frozen), then redraw once with a fixed clock. */
  advance(seconds=0,clock=null){frozen=true;for(let i=0;i<Math.round(seconds*30);i++)world.step(1/30);if(clock!==null)renderer.setClock?.(clock);renderer.resetCamera(world.player);renderer.draw(world,{quality:settings.quality,dt:Math.min(.3,seconds)});if(clock!==null)renderer.setClock?.(clock);renderer.draw(world,{quality:settings.quality,dt:0});updateHUD();drawMinimap($('#minimap'),world,renderer);},
  hud:()=>updateHUD()
};
