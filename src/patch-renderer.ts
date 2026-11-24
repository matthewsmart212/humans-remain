import {PATCH_ROBOT_ANCHOR,PATCH_ROBOT_CELL,PATCH_ROBOT_FRAMES,PATCH_ROBOT_SCALE,PATCH_ROBOT_LAMPS,PATCH_DAMAGED_LAMP} from './patch-art';
import {patchQuestSite} from './patch-placement';
import {ASSET_BY_ID} from './world-assets';
import {placementArtPoint} from './world-layout';
import {patchBeacon,patchRepairProgress,patchSpeech} from './patch-quest';
import {lineClear,type World} from './survival-engine';
import type {FoliageViewport} from './foliage-renderer';

const TAU=Math.PI*2;
function pose(w:World,view?:FoliageViewport,editor=false){
 if(w.scene||!w.layout||!w.progression&&!editor)return null;
 const q=w.patchQuest,site=patchQuestSite(w.layout);
 if(!q?.servoInstalled&&!site)return null;
 const position=q?.servoInstalled?q.position:site!.robot;
 if(view&&(position.x<view.x-90||position.x>view.x+view.width+90||position.y<view.y-30||position.y>view.y+view.height+110))return null;
 const damaged=!q?.servoInstalled,reduced=!!w.weather?.reducedMotion,moving=!!q?.moving&&!damaged;
 const step=reduced||!moving?0:Math.sin((q?.walkDistance??0)/19);
 return{...position,damaged,direction:damaged?'down-right' as const:q!.direction,step,bob:Math.abs(step)*1.3};
}
/** Tight masonry/metal contacts belong beneath the complete prop painting. */
export function drawPatchGroundContacts(ctx:CanvasRenderingContext2D,w:World,view:FoliageViewport){
 if(w.scene)return;const site=patchQuestSite(w.layout);if(!site)return;
 for(const p of [site.station,site.lockerPlacement]){
  if(p.x<view.x-500||p.x>view.x+view.width+500||p.y<view.y-350||p.y>view.y+view.height+350)continue;
  const collision=p.collision??ASSET_BY_ID.get(p.assetId)?.collision;if(!collision)continue;
  ctx.save();ctx.fillStyle='#172119';ctx.strokeStyle='#172119';ctx.lineJoin='round';
  for(const outline of collision.paths){
   if(!outline.closed)continue;ctx.beginPath();
   outline.points.forEach(([u,v],i)=>{const q=placementArtPoint(p,u,v);i?ctx.lineTo(q.x,q.y+2*p.scale):ctx.moveTo(q.x,q.y+2*p.scale)});ctx.closePath();
   ctx.globalAlpha=.15;ctx.fill();ctx.globalAlpha=.10;ctx.lineWidth=8*p.scale;ctx.stroke();
  }
  ctx.restore();
 }
}
/** One registered sprite per visible robot, sorted at the same feet as actors. */
export function patchDrawables(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view?:FoliageViewport,editor=false){
 const p=pose(w,view,editor);if(!p)return[];
 const damaged=p.damaged&&!!imgs.patchDamaged,image=imgs[damaged?'patchDamaged':'patchRobot'];if(!image)return[];
 const cell=PATCH_ROBOT_CELL,frame=damaged?0:PATCH_ROBOT_FRAMES[p.direction],scale=PATCH_ROBOT_SCALE;
 return[{y:p.y,draw:()=>{
  ctx.save();ctx.fillStyle='#16221942';ctx.beginPath();ctx.ellipse(p.x,p.y+1,p.damaged?22:17,5,0,0,TAU);ctx.fill();
  ctx.translate(p.x,p.y-p.bob);ctx.rotate(p.step*.025);ctx.scale(scale,scale);
  ctx.drawImage(image,damaged?0:frame%4*cell,damaged?0:Math.floor(frame/4)*cell,cell,cell,-PATCH_ROBOT_ANCHOR[0],-PATCH_ROBOT_ANCHOR[1],cell,cell);
  ctx.restore();
  const progress=patchRepairProgress(w);
  if(progress>0){
   ctx.save();ctx.strokeStyle='#25251fcc';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y+2,29,10,0,0,TAU);ctx.stroke();
   // The native Canvas adapter draws complete ellipses. Explicit arc points
   // keep a partial repair ring identical on Canvas and Skia.
   ctx.strokeStyle='#f0bf70';ctx.beginPath();const segments=Math.max(1,Math.ceil(progress*40));
   for(let i=0;i<=segments;i++){const angle=-Math.PI/2+progress*TAU*i/segments,x=p.x+Math.cos(angle)*29,y=p.y+2+Math.sin(angle)*10;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
   ctx.stroke();ctx.restore();
  }
 }}];
}
/** Small amber emitter and short speech remain legible after night shading.
 * A wall between the player and robot also hides this overlay. */
export function drawPatchFeedback(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view:FoliageViewport){
 const p=pose(w,view);if(!p||!imgs.patchRobot&&!imgs.patchDamaged)return;
 if(Math.hypot(p.x-w.player.x,p.y-w.player.y)>1000||!lineClear(w.player,p,w))return;
 const pulse=patchBeacon(w),lamp=p.damaged?PATCH_DAMAGED_LAMP:PATCH_ROBOT_LAMPS[PATCH_ROBOT_FRAMES[p.direction]];
 const localX=(lamp[0]-PATCH_ROBOT_ANCHOR[0])*PATCH_ROBOT_SCALE,localY=(lamp[1]-PATCH_ROBOT_ANCHOR[1])*PATCH_ROBOT_SCALE;
 const angle=p.step*.025,c=Math.cos(angle),s=Math.sin(angle),lampX=p.x+localX*c-localY*s,lampY=p.y-p.bob+localX*s+localY*c;
 if(pulse>0){
  ctx.save();ctx.globalAlpha=pulse;
  const glow=ctx.createRadialGradient(lampX,lampY,0,lampX,lampY,14);glow.addColorStop(0,'#ffc46980');glow.addColorStop(.3,'#ffbe4e38');glow.addColorStop(1,'#ffb64b00');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(lampX,lampY,14,0,TAU);ctx.fill();
  ctx.fillStyle='#ffe1a4';ctx.beginPath();ctx.arc(lampX,lampY,1.5,0,TAU);ctx.fill();ctx.restore();
 }
 const speech=patchSpeech(w);if(!speech)return;
 ctx.save();ctx.font="600 15px 'Barlow Condensed'";ctx.textAlign='center';ctx.textBaseline='bottom';
 ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='#17211dee';ctx.fillStyle='#f3dfb8';
 ctx.strokeText(speech,p.x,p.y-86);ctx.fillText(speech,p.x,p.y-86);ctx.restore();
}
