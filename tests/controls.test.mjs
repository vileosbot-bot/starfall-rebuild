import test from 'node:test';
import assert from 'node:assert/strict';
import {pickEntityAt,nearestAimTarget} from '../dist/controls.js';
import {World} from '../dist/sim.js';
const renderer={scale:30,worldToScreen:(x,y)=>({x:x*30,y:y*20})};
const hero={id:1,type:'hero',team:'red',alive:true,x:10,y:10,radius:.62,visibleTo:{blue:true},invisibleTimer:0};
test('clicking a raised hero body selects it without requiring a click at its feet',()=>{
  assert.equal(pickEntityAt([hero],renderer,300,150)?.id,1);
  assert.equal(pickEntityAt([hero],renderer,300,199)?.id,1);
  assert.equal(pickEntityAt([hero],renderer,360,150),null);
});
test('hidden, allied and dead entities cannot be picked or acquired by touch aim',()=>{
  const hidden={...hero,visibleTo:{blue:false}},ally={...hero,team:'blue'},dead={...hero,alive:false},invisible={...hero,invisibleTimer:2};
  assert.equal(pickEntityAt([hidden,ally,dead,invisible],renderer,300,150),null);
  assert.equal(nearestAimTarget([hidden,ally,dead,invisible],{x:8,y:10,team:'blue'}),null);
});
test('touch aim resolves nearby visible target and returns nothing when out of reach',()=>{
  assert.equal(nearestAimTarget([hero],{x:8,y:10,team:'blue'})?.id,1);
  assert.equal(nearestAimTarget([hero],{x:-40,y:-40,team:'blue'}),null);
});
test('turning off recommended purchases changes only the player, while bots still equip themselves',()=>{
  const world=new World({heroId:'mage',seed:1122});
  world.command({type:'autoBuy',enabled:false});
  // Starting gold is 50 (original value): bots can afford the 250-gold boots after ~52s of passive income.
  for(let i=0;i<58*30;i++)world.step(1/30);
  assert.equal(world.player.autoBuy,false);
  assert.equal(world.player.items.length,0);
  const bots=world.entities.filter(e=>e.type==='hero'&&!e.isPlayer);
  assert.equal(bots.length,9);
  assert.ok(bots.every(h=>h.autoBuy&&h.items.includes('boots')));
});
