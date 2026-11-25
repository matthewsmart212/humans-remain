import {PATCH_ROBOT_ANCHOR,PATCH_ROBOT_CELL,PATCH_ROBOT_SCALE} from './patch-art';
import {patchSpriteFrame} from './patch-animation';
import {patchQuestSite} from './patch-placement';
import {ASSET_BY_ID} from './world-assets';
import {placementArtPoint} from './world-layout';
import {patchBeacon,patchRepairProgress,patchSpeech} from './patch-quest';
import {lineClear,type World} from './survival-engine';
import type {FoliageViewport} from './foliage-renderer';

const TAU=Math.PI*2,VISUAL_SCALE=PATCH_ROBOT_SCALE/.3;

// Speech is authored and brief. A conservative character budget avoids a
// Canvas measureText dependency that the native Skia adapter does not have.
function speechLines(speech:string){
 const words=speech.trim().split(/\s+/),lines:string[]=[];
 let line='';
 for(const word of words){
  if(line&&line.length+word.length+1>22){lines.push(line);line=word}
  else line+=(line?' ':'')+word;
 }
 if(line)lines.push(line);
 if(lines.length>2)lines.splice(1,lines.length-1,lines.slice(1).join(' '));
 return lines.slice(0,2).map(line=>line.length>28?line.slice(0,27).trimEnd()+'…':line);
}

/** Uses only path primitives shared by Canvas and both Skia implementations. */
function speechBubble(ctx:CanvasRenderingContext2D,speech:string,x:number,tipY:number,view:FoliageViewport){
 const lines=speechLines(speech);if(!lines.length)return;
 const width=Math.max(100,Math.min(254,Math.max(...lines.map(line=>line.length))*8+30));
 const height=lines.length*19+18,margin=8;
 const left=Math.max(view.x+margin,Math.min(x-width/2,view.x+view.width-margin-width));
 const top=Math.max(view.y+6,tipY-7-height),right=left+width,bottom=top+height;
 const pointer=Math.max(left+15,Math.min(x,right-15));
 const pointerY=Math.max(tipY,bottom+6);
 const outline=(dy=0)=>{
  ctx.beginPath();ctx.moveTo(left+5,top+dy);ctx.lineTo(right-5,top+dy);
  ctx.lineTo(right,top+5+dy);ctx.lineTo(right,bottom-5+dy);ctx.lineTo(right-5,bottom+dy);
  ctx.lineTo(pointer+6,bottom+dy);ctx.lineTo(pointer,pointerY+dy);ctx.lineTo(pointer-6,bottom+dy);
  ctx.lineTo(left+5,bottom+dy);ctx.lineTo(left,bottom-5+dy);ctx.lineTo(left,top+5+dy);ctx.closePath();
 };
 ctx.save();
 outline(2);ctx.fillStyle='#0b100e55';ctx.fill();
 outline();ctx.fillStyle='#20271ff5';ctx.fill();ctx.strokeStyle='#ae915a99';ctx.lineWidth=1;ctx.stroke();
 ctx.beginPath();ctx.moveTo(left+8,top+2);ctx.lineTo(right-8,top+2);ctx.strokeStyle='#d6b77a26';ctx.stroke();
 ctx.font="600 16px 'Barlow Condensed'";ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle='#f6ecd4';
 lines.forEach((line,index)=>ctx.fillText(line,left+width/2,top+25+index*19));
 ctx.restore();
}

function pose(w:World,view?:FoliageViewport,editor=false){
 if(w.scene||!w.layout||!w.progression&&!editor)return null;
 const q=w.patchQuest,site=patchQuestSite(w.layout);
 if(!q?.servoInstalled&&!site)return null;
 const position=q?.servoInstalled?q.position:site!.robot;
 const halfWidth=PATCH_ROBOT_CELL*PATCH_ROBOT_SCALE/2+24,above=PATCH_ROBOT_ANCHOR[1]*PATCH_ROBOT_SCALE+32,below=(PATCH_ROBOT_CELL-PATCH_ROBOT_ANCHOR[1])*PATCH_ROBOT_SCALE+8;
 if(view&&(position.x<view.x-halfWidth||position.x>view.x+view.width+halfWidth||position.y<view.y-below||position.y>view.y+view.height+above))return null;
 const damaged=!q?.servoInstalled;
 return{...position,damaged,direction:damaged?'down-right' as const:q!.direction,moving:!!q?.moving&&!damaged,walkDistance:q?.walkDistance??0};
}
function visibleFrame(p:NonNullable<ReturnType<typeof pose>>,imgs:Record<string,HTMLImageElement>){
 const mode=p.damaged&&imgs.patchDamaged?'damaged':p.moving&&imgs.patchWalk?'walk':imgs.patchRobot?'idle':!p.damaged&&imgs.patchWalk?'walk':undefined;
 return mode?patchSpriteFrame(mode,p.direction,p.moving?p.walkDistance:0):undefined;
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
 const frame=visibleFrame(p,imgs);if(!frame)return[];const image=imgs[frame.image];
 const cell=PATCH_ROBOT_CELL,scale=PATCH_ROBOT_SCALE;
 return[{y:p.y,draw:()=>{
  ctx.save();const shadowWidth=(p.damaged?22:17)*VISUAL_SCALE,shadowHeight=5*VISUAL_SCALE;
  ctx.fillStyle='#111c1326';ctx.beginPath();ctx.ellipse(p.x,p.y+VISUAL_SCALE,shadowWidth,shadowHeight,0,0,TAU);ctx.fill();
  ctx.fillStyle='#111c1333';ctx.beginPath();ctx.ellipse(p.x,p.y+VISUAL_SCALE,shadowWidth*.72,shadowHeight*.65,0,0,TAU);ctx.fill();
  // Art contains the leg/arm movement. Keep the registered feet at the actor's
  // actual ground point: no rotating or bobbing a standing sprite to fake it.
  ctx.drawImage(image,...frame.source,p.x-PATCH_ROBOT_ANCHOR[0]*scale,p.y-PATCH_ROBOT_ANCHOR[1]*scale,cell*scale,cell*scale);
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
 const lampX=p.x+(lamp[0]-PATCH_ROBOT_ANCHOR[0])*PATCH_ROBOT_SCALE,lampY=p.y+(lamp[1]-PATCH_ROBOT_ANCHOR[1])*PATCH_ROBOT_SCALE;
 if(pulse>0){
  ctx.save();ctx.globalAlpha=pulse;const radius=14*VISUAL_SCALE;
  const glow=ctx.createRadialGradient(lampX,lampY,0,lampX,lampY,radius);glow.addColorStop(0,'#ffc46980');glow.addColorStop(.3,'#ffbe4e38');glow.addColorStop(1,'#ffb64b00');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(lampX,lampY,radius,0,TAU);ctx.fill();
  ctx.fillStyle='#ffe1a4';ctx.beginPath();ctx.arc(lampX,lampY,1.5*VISUAL_SCALE,0,TAU);ctx.fill();ctx.restore();
 }
 const speech=patchSpeech(w);if(!speech)return;
 const tipY=p.y-(p.damaged?168:PATCH_ROBOT_ANCHOR[1])*PATCH_ROBOT_SCALE-9;
 speechBubble(ctx,speech,p.x,tipY,view);
}
