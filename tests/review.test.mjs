import test from 'node:test';
import assert from 'node:assert/strict';
import { World, HEROES, ITEMS, MAP } from '../dist/sim.js';

function isolated(heroId='mage') {
  const w=new World({heroId,autoBuy:false,seed:4821});
  w.nextWave=Infinity; for(const c of w._camps)c.spawnAt=Infinity;
  for(const h of w.entities.filter(e=>e.type==='hero'))h._think=1e9;
  return w;
}
function advance(w,seconds) { for(let i=0;i<Math.round(seconds*30);i++)w.step(1/30); }
function ready(w,x=0,y=0) { w.player.x=x;w.player.y=y;w._buildGrid();w._updateVisibility(); }

test('review: structures respect each lane and one broken high ground unlocks core',()=>{
  const w=isolated();
  const lane=(name,tier)=>w.entities.find(e=>e.type==='tower'&&e.team==='red'&&e.lane===name&&e.tier===tier);
  const core=w.entities.find(e=>e.type==='core'&&e.team==='red');
  assert.equal(w.isStructureVulnerable(core),false);
  assert.equal(w.isStructureVulnerable(lane('mid',1)),true);
  assert.equal(w.isStructureVulnerable(lane('mid',2)),false);
  const hp=lane('mid',2).hp;
  assert.equal(w._damage(w.player,lane('mid',2),1e8,'true'),0);
  assert.equal(lane('mid',2).hp,hp);
  w._damage(w.player,lane('mid',1),1e8,'true');
  assert.equal(w.isStructureVulnerable(lane('mid',2)),true);
  assert.equal(w.isStructureVulnerable(lane('top',2)),false);
  w._damage(w.player,lane('mid',2),1e8,'true');
  assert.equal(w.isStructureVulnerable(lane('mid',3)),true);
  assert.equal(w.isStructureVulnerable(core),false);
  w._damage(w.player,lane('mid',3),1e8,'true');
  assert.equal(w.isStructureVulnerable(core),true);
  assert.ok(lane('top',3).alive&&lane('bot',3).alive);
  assert.equal(w.winner,null);
  w._damage(w.player,core,1e8,'true');
  assert.equal(w.winner,'blue');
  const time=w.time;w.step(1/30);assert.equal(w.time,time);
  assert.equal(w.command({type:'move',x:0,y:0}).ok,false);
});

test('review: arbitrary elapsed time cannot declare a winner',()=>{
 const w=isolated();w.time=100000;w.step(1/30);
 assert.equal(w.winner,null);
 assert.equal(w.entities.filter(e=>e.type==='core'&&e.alive).length,2);
});

test('review: damaging recall cancels it; uninterrupted recall reaches home',()=>{
 const w=isolated();ready(w,-35,35);
 const h=w.player, enemy=w.entities.find(e=>e.type==='hero'&&e.team==='red');
 assert.equal(w.command({type:'recall'}).ok,true);
 advance(w,2);
 assert.ok(h.recallTimer>2.9&&h.recallTimer<3.1);
 w._damage(enemy,h,100,'true');
 assert.equal(h.recallTimer,0);
 const x=h.x,y=h.y;advance(w,4);assert.equal(h.x,x);assert.equal(h.y,y);
 assert.equal(w.command({type:'recall'}).ok,true);advance(w,5.1);
 assert.equal(h.recallTimer,0);assert.equal(h.x,MAP.fountains.blue.x);assert.equal(h.y,MAP.fountains.blue.y);
});

test('review: keyboard movement cancels recall without teleporting',()=>{
 const w=isolated();ready(w,-35,35);
 w.command({type:'recall'});advance(w,1);w.input.x=1;w.step(1/30);
 assert.equal(w.player.recallTimer,0);assert.notEqual(w.player.x,MAP.fountains.blue.x);
});

test('review: dead heroes reject all combat and movement commands',()=>{
 const w=isolated('assassin');const h=w.player;h.skillLevels=[2,1,1];
 w._kill(h,null);
 const snapshot={mp:h.mp,x:h.x,y:h.y,gold:h.gold,cd:[...h.cooldowns]};
 for(const command of [{type:'move',x:0,y:0},{type:'attack'},{type:'cast',slot:0,x:0,y:0},{type:'recall'},{type:'heal'},{type:'flash',x:0,y:0}])assert.equal(w.command(command).ok,false,command.type);
 assert.deepEqual({mp:h.mp,x:h.x,y:h.y,gold:h.gold,cd:[...h.cooldowns]},snapshot);
});

test('review: empty aimed assassination does not spend mana or start cooldown',()=>{
 const w=isolated('assassin');ready(w,0,0);const h=w.player;h.skillLevels=[2,1,1];
 const target=w.entities.find(e=>e.type==='hero'&&e.team==='red');target.x=3;target.y=0;w._buildGrid();w._updateVisibility();
 const mp=h.mp;
 assert.equal(w.command({type:'cast',slot:2,x:0,y:4}).ok,false);
 assert.equal(h.mp,mp);assert.equal(h.cooldowns[2],0);
 assert.equal(w.command({type:'cast',slot:2,x:target.x,y:target.y}).ok,true);
 assert.ok(h.mp<mp);assert.ok(h.cooldowns[2]>0);
});

test('review: purchases honor budget, six slots, refunds and boot replacement',()=>{
 const w=isolated();const h=w.player;h.gold=0;
 assert.equal(w.command({type:'purchase',itemId:'boots'}).ok,false);assert.equal(h.items.length,0);
 h.gold=100000;
 const nonboots=ITEMS.filter(i=>i.category!=='boots').slice(0,6);
 for(const item of nonboots)assert.equal(w.command({type:'purchase',itemId:item.id}).ok,true);
 const before=h.gold;
 assert.equal(w.command({type:'purchase',itemId:'boots'}).ok,false);assert.equal(h.gold,before);assert.equal(h.items.length,6);
 assert.equal(w.command({type:'sell',slot:2}).ok,true);assert.equal(h.gold,before+Math.floor(nonboots[2].price*.6));
 assert.equal(w.command({type:'purchase',itemId:'boots'}).ok,true);assert.equal(h.items.length,6);
 const gold=h.gold,boots=ITEMS.find(i=>i.id==='boots'),upgrade=ITEMS.find(i=>i.id==='boots_arcane');
 assert.equal(w.command({type:'purchase',itemId:upgrade.id}).ok,true);assert.equal(h.items.length,6);
 assert.equal(h.gold,gold-upgrade.price+Math.floor(boots.price*.6));
 assert.equal(w.command({type:'purchase',itemId:upgrade.id}).ok,false);
 assert.equal(h.items.filter(id=>ITEMS.find(i=>i.id===id).category==='boots').length,1);
});

test('review: slow reduces direct player displacement',()=>{
 const a=isolated('mage'),b=isolated('mage');ready(a,0,0);ready(b,0,0);
 a.input.x=b.input.x=1;b.player.slowTimer=5;b.player.slowAmount=.5;
 advance(a,.5);advance(b,.5);
 assert.ok(Math.abs(b.player.x/a.player.x-.5)<.001,`expected half movement, got ${a.player.x} and ${b.player.x}`);
});

test('review: fixed input and seed are deterministic over a meaningful 30s combat window',()=>{
 const a=new World({heroId:'mage',seed:71,demo:true}),b=new World({heroId:'mage',seed:71,demo:true});
 advance(a,30);advance(b,30);
 const snapshot=w=>({time:w.time,score:w.score,entities:w.entities.map(e=>[e.id,e.type,e.team,e.x,e.y,e.hp,e.alive])});
 assert.deepEqual(snapshot(a),snapshot(b));
 assert.ok(a.entities.some(e=>e.type==='minion'));assert.ok(a.entities.some(e=>e.type==='monster'));
});
