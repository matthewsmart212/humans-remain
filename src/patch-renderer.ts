import {PATCH_ROBOT_ANCHOR,PATCH_ROBOT_CELL,PATCH_ROBOT_SCALE} from './patch-art';
import {drawPatchBubble} from './patch-speech-bubble';
import {patchChat} from './patch-chat';
import {patchSpriteFrame} from './patch-animation';
import {patchLandmarks,patchRescueSite} from './patch-placement';
import {ASSET_BY_ID} from './world-assets';
import {placementArtPoint} from './world-layout';
import {patchBeacon,patchRepairProgress,patchSpeech} from './patch-quest';
import {lineClear,type World} from './survival-engine';
import type {PresentedWorld} from './player-presentation';
import type {FoliageViewport} from './foliage-renderer';

const TAU=Math.PI*2,VISUAL_SCALE=PATCH_ROBOT_SCALE/.3;

function pose(w:PresentedWorld,view?:FoliageViewport,editor=false,margin=0){
 if(w.scene||!w.layout||!w.progression&&!editor)return null;
 const q=w.patchQuest,site=patchRescueSite(w.layout);
 if(!q?.servoInstalled&&!site)return null;
 const position=q?.servoInstalled?(w.presentedPatch??q.position):site!.robot;
 const halfWidth=PATCH_ROBOT_CELL*PATCH_ROBOT_SCALE/2+24,above=PATCH_ROBOT_ANCHOR[1]*PATCH_ROBOT_SCALE+32,below=(PATCH_ROBOT_CELL-PATCH_ROBOT_ANCHOR[1])*PATCH_ROBOT_SCALE+8;
 if(view&&(position.x<view.x-halfWidth-margin||position.x>view.x+view.width+halfWidth+margin||position.y<view.y-below-margin||position.y>view.y+view.height+above+margin))return null;
 const damaged=!q?.servoInstalled;
 return{...position,damaged,direction:damaged?'down-right' as const:q!.direction,moving:!!q?.moving&&!damaged,walkDistance:w.presentedPatch?.walkDistance??q?.walkDistance??0};
}
function visibleFrame(p:NonNullable<ReturnType<typeof pose>>,imgs:Record<string,HTMLImageElement>){
 const mode=p.damaged&&imgs.patchDamaged?'damaged':p.moving&&imgs.patchWalk?'walk':imgs.patchRobot?'idle':!p.damaged&&imgs.patchWalk?'walk':undefined;
 return mode?patchSpriteFrame(mode,p.direction,p.moving?p.walkDistance:0):undefined;
}
/** Tight masonry/metal contacts belong beneath the complete prop painting. */
export function drawPatchGroundContacts(ctx:CanvasRenderingContext2D,w:World,view:FoliageViewport){
 if(w.scene||!w.layout)return;
 for(const p of patchLandmarks(w.layout)){
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
 const frame=visibleFrame(p,imgs);if(!frame)return[];const image=imgs[frame.image];
 const cell=PATCH_ROBOT_CELL,scale=PATCH_ROBOT_SCALE;
 return[{y:p.y,draw:()=>{
  ctx.save();const shadowWidth=(p.damaged?22:17)*VISUAL_SCALE,shadowHeight=5*VISUAL_SCALE;
  ctx.fillStyle='#111c1326';ctx.beginPath();ctx.ellipse(p.x,p.y+VISUAL_SCALE,shadowWidth,shadowHeight,0,0,TAU);ctx.fill();
  ctx.fillStyle='#111c1333';ctx.beginPath();ctx.ellipse(p.x,p.y+VISUAL_SCALE,shadowWidth*.72,shadowHeight*.65,0,0,TAU);ctx.fill();
  // Art contains the leg/arm movement. Keep the registered feet at the actor's
  // actual ground point: no rotating or bobbing a standing sprite to fake it.
  const [ratio,dx,dy]=frame.registration;
  ctx.drawImage(image,...frame.source,p.x+(dx-PATCH_ROBOT_ANCHOR[0]*ratio)*scale,p.y+(dy-PATCH_ROBOT_ANCHOR[1]*ratio)*scale,cell*ratio*scale,cell*ratio*scale);
  ctx.restore();
  const progress=patchRepairProgress(w);
  if(progress>0){
   const rx=29*VISUAL_SCALE,ry=10*VISUAL_SCALE,cy=p.y+2*VISUAL_SCALE;
   ctx.save();ctx.strokeStyle='#25251fcc';ctx.lineWidth=3*VISUAL_SCALE;ctx.beginPath();ctx.ellipse(p.x,cy,rx,ry,0,0,TAU);ctx.stroke();
   // The native Canvas adapter draws complete ellipses. Explicit arc points
   // keep a partial repair ring identical on Canvas and Skia.
   ctx.strokeStyle='#f0bf70';ctx.beginPath();const segments=Math.max(1,Math.ceil(progress*40));
   for(let i=0;i<=segments;i++){const angle=-Math.PI/2+progress*TAU*i/segments,x=p.x+Math.cos(angle)*rx,y=cy+Math.sin(angle)*ry;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
   ctx.stroke();ctx.restore();
  }
 }}];
}
/** Small amber emitter and short speech remain legible after night shading.
 * A wall between the player and robot also hides this overlay. */
export function drawPatchFeedback(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,w:World,view:FoliageViewport){
 const p=pose(w,view);if(!p)return;const frame=visibleFrame(p,imgs);if(!frame)return;
 if(Math.hypot(p.x-w.player.x,p.y-w.player.y)>1000||!lineClear(w.player,p,w))return;
 const pulse=patchBeacon(w),lamp=frame.lamp;
 const [ratio,dx,dy]=frame.registration;
 const lampX=p.x+(dx+(lamp[0]-PATCH_ROBOT_ANCHOR[0])*ratio)*PATCH_ROBOT_SCALE;
 const lampY=p.y+(dy+(lamp[1]-PATCH_ROBOT_ANCHOR[1])*ratio)*PATCH_ROBOT_SCALE;
 if(pulse>0){
  ctx.save();ctx.globalAlpha=pulse;const radius=14*VISUAL_SCALE;
  const glow=ctx.createRadialGradient(lampX,lampY,0,lampX,lampY,radius);glow.addColorStop(0,'#ffc46980');glow.addColorStop(.3,'#ffbe4e38');glow.addColorStop(1,'#ffb64b00');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(lampX,lampY,radius,0,TAU);ctx.fill();
  ctx.fillStyle='#ffe1a4';ctx.beginPath();ctx.arc(lampX,lampY,1.5*VISUAL_SCALE,0,TAU);ctx.fill();ctx.restore();
 }
 if(patchChat(w))return;
 const speech=patchSpeech(w);if(!speech)return;
 const scale=view.scale||1;
 // Cancel the world transform for a logical-pixel bubble while the projected
 // lamp, feet and choice tray continue to share the same screen coordinates.
 ctx.save();ctx.translate(view.x,view.y);ctx.scale(1/scale,1/scale);
 const feet=(p.y-view.y)*scale,head=feet-(p.damaged?157:200)*PATCH_ROBOT_SCALE*scale;
 drawPatchBubble(ctx,speech,{x:(p.x-view.x)*scale,head,feet,halfWidth:(p.damaged?41:28)*scale},
  view.width*scale,view.height*scale);
 ctx.restore();
}

/** One moving light uniform leaves the cached camp light field intact. */
export function patchNightLight(w:World,view:FoliageViewport){
 const p=pose(w,view,false,145);
 if(!p||Math.hypot(p.x-w.player.x,p.y-w.player.y)>1000||!lineClear(w.player,p,w))return;
 const pulse=patchBeacon(w),talking=!!patchChat(w);
 // In the two-shot the lamp lights the survivor opposite him, even through
 // the long rest between the three signal flashes.
 const radius=talking?203:p.damaged?125:145;
 return {x:p.x,y:p.y-(p.damaged?32:49),radius,strength:talking ? .72+pulse*.18 : .24+pulse*.55};
}
