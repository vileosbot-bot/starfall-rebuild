# Shared implementation interface

All runtime files are original ES modules in dist/. No dependencies needed. Coordinate system world x,y bounded -57.5..57.5; blue core (-47,47), red (47,-47). Team strings blue/red/neutral.

## sim.js (mechanics agent owns)
Exports HEROES (array), ITEMS (array), MAP (object), World (class).
HEROES entries {id,name,role,title,color,description,stats:{hp,mp,ad,armor,range,speed},skills:[{name,key,description,cooldown,mana,range}], ...}; ids tank/fighter/mage/marksman/assassin. All stats/tuning can have additional fields.
ITEMS entries {id,name,price,category,description,icon,stats}.
MAP {bound:57.5,lanes:{top:[{x,y}],mid:[{x,y}],bot:[{x,y}]}, fountains:{blue:{x,y},red:{x,y}}, ...}.
new World({heroId:'mage',difficulty:'normal',seed:1122,demo:false})
World properties: time seconds; entities array; player reference; effects array; events array (bounded); winner null|'blue'|'red'; score {blue:number,red:number}; input {x:0,y:0}; paused boolean.
Entities common: {id,type:'hero'|'minion'|'tower'|'core'|'monster',team,x,y,hp,maxHp,mp,maxMp,radius,alive,name,facing:number,attackTimer,...}. Heroes {heroId,role,level,gold,kills,deaths,assists,items:[itemId],cooldowns:[number],flashCooldown,healCooldown,respawnTimer,recallTimer,ad,armor,range,speed,...}. Towers {lane,tier,protected:boolean}. Minions {variant:'melee'|'ranged'|'siege'|'super',lane}. Monsters {variant}. Additional properties allowed. All arrays contain live and dead persistent hero/structure entities; minions cleared when dead after short delay.
Effects {id,kind:'hit'|'projectile'|'ring'|'slash'|'heal'|'death'|'text'|'beam'|'cast',x,y,toX?,toY?,team,color?,life,maxLife?,radius?,text?}; time fields count down inside World.step.
Events {id,time,type,text,team,...}, bounded to200.
World.step(dt) advances with dt <=0.05; handles input vector and simulation. Root uses fixed 1/30.
World.command({type:'move',x,y}|{type:'attack',targetId?}|{type:'cast',slot:0|1|2,x,y}|{type:'recall'}|{type:'flash',x,y}|{type:'heal'}|{type:'purchase',itemId}|{type:'sell',slot}) returns {ok:boolean,message?:string}. Purchasing/economy conditions fully enforced. cast single-target resolves valid target near aim or facing; AoE as appropriate. No valid target for required target skill must not consume mana.
World.isStructureVulnerable(entity) optional. Never write browser/DOM APIs in sim.js. Node-testable.

## render.js (render agent owns)
Exports class Renderer with constructor(canvas), resize(width,height,dpr=1), draw(world,{aim=null,pointer=null,showRanges=false,quality='high',dt=1/60}={}), screenToWorld(px,py), worldToScreen(x,y), resetCamera(player), panTo(x,y), follow() and drawMinimap(canvas,world).
Canvas renderer must work without WebGL2, use Canvas2D rich isometric/2.5D procedural terrain and models (original independent drawing), camera follows player; no DOM overlay rendering except provided canvas. drawMinimap can be exported standalone or method; include method.
Renderer aim={slot,x,y,range,radius} in world coordinates; pointer={x,y} world. Camera can pan via minimap then return follow. All drawing self-contained. Keep map, paths, river, forest rocks, towers/crystals, heroes/classes, minions, monsters visibly distinct; team hp bars and player ring. Handle no dimensions until resized. Methods should not mutate simulation.

## root owns
dist/index.html, dist/style.css, dist/app.js, assets/icons and portraits, audio, integration/tests, packaging and deployment.

Avoid editing files owned by another agent. Communicate changes to schema and missing fields. Fidelity goal: current https://sanwan.online/games/xingyun-moba/, evidence saved in scratch reference/. Code is a fresh implementation of observed rules, not copied app bundle.
