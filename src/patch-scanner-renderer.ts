import type {FoliageViewport} from './foliage-renderer';
import {PATCH_SCENERY_FRAMES} from './patch-scenery';
import {PATCH_TRACK_WIDTH} from './patch-scanner-trail';
import type {PatchScanFrame,PatchScanPrint} from './patch-scanner';
import {DIRECTION_ANGLES,type Vec,type World} from './survival-engine';
import {weaponGrip} from './weapon-grip';
import {runnerFacing} from './runner-cycles';
import {ENGINEER_ART} from './engineer-sprites';
import {HUNTER_ART,hunterFacing} from './hunter-sprites';

const trackFrames={'right-tread':'tread','left-skid':'scrape',crawler:'crawler',rope:'ropeDrag'} as const;

type ScanCanvas=CanvasRenderingContext2D&{
 drawPatchScanLight?:(aperture:Vec,angle:number,halfAngle:number,radius:number,reach:number)=>boolean;
 drawPatchScanPrint?:(image:HTMLImageElement,crop:readonly [number,number,number,number],width:number,height:number)=>boolean;
};

const scannerWidth=33,gripX=96,gripY=71,lensX=23,lensY=96;

export function heldPatchScanner(w:World,frame:PatchScanFrame){
 const p=w.player,dir=p.direction;
 if(frame.opacity<=0||p.moving||p.downedUntil||DIRECTION_ANGLES[dir]!==frame.angle||
    Math.hypot(p.x-frame.origin.x,p.y-frame.origin.y)>4)return;
 const hunter=w.survivorRole==='hunter',engineer=w.survivorRole==='engineer',grip=weaponGrip(w);
 const hand=(hunter?HUNTER_ART[dir].idle.hand:engineer?ENGINEER_ART[dir].idle.hand:undefined)??grip.hand;
 const mirrored=hunter?hunterFacing(dir).mirror:!engineer&&runnerFacing(dir).mirror;
 const x=p.x+(mirrored?-hand[0]:hand[0]),y=p.y+hand[1];
 // The atlas lens faces left. Retain its downward-hanging strap when looking to either side.
 const flip=Math.cos(frame.angle)>=0?-1:1;
 const tilt=-flip*Math.atan2(Math.sin(frame.angle)*.58,Math.abs(Math.cos(frame.angle))+.28);
 const scale=scannerWidth/PATCH_SCENERY_FRAMES.scanner[2],dx=flip*(lensX-gripX)*scale,dy=(lensY-gripY)*scale;
 const lens={x:x+dx*Math.cos(tilt)-dy*Math.sin(tilt),y:y+dx*Math.sin(tilt)+dy*Math.cos(tilt)};
 return {x,y,lens,flip,tilt,scale,behind:grip.behind};
}

export function drawHeldPatchScanner(ctx:CanvasRenderingContext2D,image:HTMLImageElement,rig:NonNullable<ReturnType<typeof heldPatchScanner>>,opacity:number){
 const [sx,sy,sw,sh]=PATCH_SCENERY_FRAMES.scanner;
 ctx.save();
 ctx.globalAlpha=opacity;
 ctx.translate(rig.x,rig.y);
 ctx.rotate(rig.tilt);
 ctx.scale(rig.flip*rig.scale,rig.scale);
 ctx.drawImage(image,sx,sy,sw,sh,-gripX,-gripY,sw,sh);
 const x=lensX-gripX,y=lensY-gripY;
 const glint=ctx.createRadialGradient(x,y,0,x,y,30);
 glint.addColorStop(0,'#fff3cfeb');glint.addColorStop(.22,'#d8f0daae');glint.addColorStop(1,'#a0d9dc00');
 ctx.fillStyle=glint;ctx.fillRect(x-30,y-30,60,60);
 ctx.restore();
}

function drawImpression(ctx:CanvasRenderingContext2D,image:HTMLImageElement,print:PatchScanPrint){
 const width=PATCH_TRACK_WIDTH[print.kind];
 const [sx,sy,sw,sh]=PATCH_SCENERY_FRAMES[trackFrames[print.kind]];
 const height=width*sh/sw;
 ctx.save();
 ctx.globalAlpha=print.opacity;
 ctx.translate(print.x,print.y);
 ctx.rotate(print.angle);
 ctx.drawImage(image,sx,sy,sw,sh,-width/2,-height/2,width,height);
 ctx.restore();
}

/** Trace the actual visible silhouette rather than sending the beam through walls or across water. */
function sweepEdge(ctx:CanvasRenderingContext2D,frame:PatchScanFrame,reach:number,sector:boolean,apex:Vec,trim=0){
 ctx.beginPath();
 if(sector)ctx.moveTo(apex.x,apex.y);
 for(let i=trim;i<frame.rays.length-trim;i++){
  const ray=frame.rays[i],distance=Math.min(reach,ray.radius);
  const near=1-distance/frame.radius;
  const x=distance*Math.cos(ray.angle)+apex.x*near,y=distance*Math.sin(ray.angle)+apex.y*near;
  if(i===trim&&!sector)ctx.moveTo(x,y);
  else ctx.lineTo(x,y);
 }
 if(sector)ctx.closePath();
}

export function drawPatchScanner(ctx:CanvasRenderingContext2D,image:HTMLImageElement|undefined,frame:PatchScanFrame,view:FoliageViewport,lens?:Vec){
 const {origin,radius,sweep,opacity}=frame,margin=radius+55;
 if(origin.x<view.x-margin||origin.x>view.x+view.width+margin||
    origin.y<view.y-margin||origin.y>view.y+view.height+margin)return;
 if(opacity>0&&sweep>0&&frame.rays.length){
  ctx.save();
  ctx.translate(origin.x,origin.y);ctx.globalAlpha=opacity;
  const apex=lens?{x:lens.x-origin.x,y:lens.y-origin.y}:{x:0,y:0},reach=radius*sweep;
  sweepEdge(ctx,frame,radius,true,apex);ctx.clip();
  if(!(ctx as ScanCanvas).drawPatchScanLight?.(apex,frame.angle,frame.halfAngle,radius,reach)){
   const light=ctx.createRadialGradient(apex.x,apex.y,0,apex.x,apex.y,radius);
   light.addColorStop(0,'#c1e7df6b');light.addColorStop(.5,'#92c6c336');light.addColorStop(1,'#8fbfbe0a');
   ctx.fillStyle=light;
   ctx.globalAlpha=opacity*.24;
   for(let trim=0;trim<4&&2*trim+1<frame.rays.length;trim++){sweepEdge(ctx,frame,reach,true,apex,trim);ctx.fill()}
   ctx.globalAlpha=opacity;
   if(reach>9){sweepEdge(ctx,frame,reach-9,false,apex,1);ctx.strokeStyle='#acdad631';ctx.lineWidth=3;ctx.stroke()}
   sweepEdge(ctx,frame,reach,false,apex,1);ctx.strokeStyle='#c9eadbb3';ctx.lineWidth=2.2;ctx.stroke();
  }
  ctx.restore();
 }
 // Physical relief remains legible through the beam and lingers on the ground as its light decays.
 if(image)for(const print of frame.prints)if(print.opacity>0)drawImpression(ctx,image,print);
}
