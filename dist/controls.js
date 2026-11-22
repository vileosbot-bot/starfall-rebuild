/** Pick the visible rendered body, including its elevation above the ground. */
export function pickEntityAt(entities, renderer, sx, sy, team='blue') {
  let chosen=null,best=Infinity;
  for(const e of entities){
    if(!e.alive||e.team===team||e.visibleTo?.[team]===false||(e.invisibleTimer||0)>0)continue;
    const p=renderer.worldToScreen(e.x,e.y),scale=renderer.scale||30;
    const tall={hero:2.5,minion:1.3,tower:4.0,core:5.2,monster:2.6}[e.type]||1.5;
    const height=Math.max(20,tall*scale),halfWidth=Math.max(15,(e.radius||.5)*scale*1.35);
    const dx=(sx-p.x)/halfWidth,dy=(sy-(p.y-height*.43))/(height*.63);
    const score=Math.hypot(dx,dy);
    if(score<=1&&score<best){best=score;chosen=e;}
  }
  return chosen;
}

export function nearestAimTarget(entities, player, maxRange=14){
  let target=null,distance=maxRange;
  for(const e of entities){
    if(!e.alive||e.team===player.team||e.visibleTo?.[player.team]===false||(e.invisibleTimer||0)>0||!['hero','minion','monster'].includes(e.type))continue;
    const d=Math.hypot(e.x-player.x,e.y-player.y);
    if(d<distance){distance=d;target=e;}
  }
  return target;
}
