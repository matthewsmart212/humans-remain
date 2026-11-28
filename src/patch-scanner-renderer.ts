import type {FoliageViewport} from './foliage-renderer';
import {PATCH_SCENERY_FRAMES} from './patch-scenery';
import {PATCH_TRACK_WIDTH} from './patch-scanner-trail';
import type {PatchScanFrame,PatchScanPrint} from './patch-scanner';
import {type Vec,type World} from './survival-engine';
import {weaponGrip} from './weapon-grip';
import {runnerCycle,runnerFacing} from './runner-cycles';
import {ENGINEER_ART,engineerCycle} from './engineer-sprites';
import {HUNTER_ART,hunterCycle,hunterFacing} from './hunter-sprites';

const trackFrames={'right-tread':'tread','left-skid':'scrape',crawler:'crawler',rope:'ropeDrag'} as const;

type ScanCanvas=CanvasRenderingContext2D&{
 drawPatchScanLight?:(aperture:Vec,angle:number,halfAngle:number,radius:number,phase:number)=>boolean;
 drawPatchScanPrint?:(image:HTMLImageElement,crop:readonly [number,number,number,number],width:number,height:number)=>boolean;
};

const scannerWidth=33,gripX=96,gripY=71,lensX=23,lensY=96;

export function heldPatchScanner(w:World,frame:PatchScanFrame,images?:Readonly<Record<string,unknown>>){
 const p=w.player,dir=p.direction;
 if(frame.opacity<=0||p.downedUntil||p.hp<=0)return;
 const hunter=w.survivorRole==='hunter',engineer=w.survivorRole==='engineer',grip=weaponGrip(w);
 const running=(p.runBlend??0)>.45;
 const cycle=p.moving?(hunter?hunterCycle(dir,p.walkDistance,running,images):engineer?engineerCycle(dir,p.walkDistance,running):runnerCycle(dir,p.walkDistance,running)):undefined;
 const hand=cycle?.sprite.hand??(hunter?HUNTER_ART[dir].idle.hand:engineer?ENGINEER_ART[dir].idle.hand:undefined)??grip.hand;
 const mirrored=hunter?hunterFacing(dir).mirror:!engineer&&runnerFacing(dir).mirror;
 const x=p.x+(mirrored?-hand[0]:hand[0]),y=p.y+hand[1]+(cycle?.bob??0)*(p.walkBlend??1);
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
 glint.addColorStop(0,'#e0f8ffeb');glint.addColorStop(.22,'#72c9ffae');glint.addColorStop(1,'#3585ff00');
 ctx.fillStyle=glint;ctx.fillRect(x-30,y-30,60,60);
 ctx.restore();
}

const blueTracks=new WeakMap<HTMLImageElement,Map<PatchScanPrint['kind'],HTMLCanvasElement>>();
function blueTrack(image:HTMLImageElement,kind:PatchScanPrint['kind']){
 let frames=blueTracks.get(image);
 if(!frames){frames=new Map();blueTracks.set(image,frames)}
 let tile=frames.get(kind);
 if(tile)return tile;
 const [x,y,width,height]=PATCH_SCENERY_FRAMES[trackFrames[kind]];
 tile=document.createElement('canvas');tile.width=width;tile.height=height;
 const brush=tile.getContext('2d');if(!brush)return;
 brush.drawImage(image,x,y,width,height,0,0,width,height);
 brush.globalCompositeOperation='source-in';brush.fillStyle='#79d7ff';brush.fillRect(0,0,width,height);
 frames.set(kind,tile);return tile;
}

function drawImpression(ctx:CanvasRenderingContext2D,image:HTMLImageElement,print:PatchScanPrint){
 const width=PATCH_TRACK_WIDTH[print.kind];
 const [sx,sy,sw,sh]=PATCH_SCENERY_FRAMES[trackFrames[print.kind]];
 const height=width*sh/sw;
 ctx.save();
 ctx.globalAlpha=print.opacity;
 ctx.translate(print.x,print.y);
 ctx.rotate(print.angle);
 if(!(ctx as ScanCanvas).drawPatchScanPrint?.(image,[sx,sy,sw,sh],width,height)){
  const tile=typeof document==='undefined'?undefined:blueTrack(image,print.kind);
  if(tile)ctx.drawImage(tile,-width/2,-height/2,width,height);
  else ctx.drawImage(image,sx,sy,sw,sh,-width/2,-height/2,width,height);
 }
 ctx.restore();
}

/** Canvas fallback uses narrow, feathered sectors matching the shader's penumbra. */
function drawBeamFallback(ctx:CanvasRenderingContext2D,frame:PatchScanFrame,apex:Vec){
 const {radius,angle,halfAngle,sweep,opacity}=frame;
 const light=ctx.createRadialGradient(apex.x,apex.y,0,apex.x,apex.y,radius);
 light.addColorStop(0,'#1657ff38');light.addColorStop(.75,'#1657ff20');light.addColorStop(1,'#1657ff00');
 const slices=40,width=2*halfAngle/slices;
 for(let i=0;i<slices;i++){
  const a=angle-halfAngle+i*width,offset=Math.abs((i+.5)/slices*2-1);
  const feather=Math.max(0,Math.min(1,(1-offset)/.24));
  ctx.globalAlpha=opacity*feather*feather*(3-2*feather);
  ctx.beginPath();ctx.moveTo(apex.x,apex.y);ctx.arc(apex.x,apex.y,radius,a,a+width+.001);ctx.closePath();
  ctx.fillStyle=light;ctx.fill();
  for(const phase of [sweep,(sweep+.5)%1]){
   const reach=radius*phase,fade=1-Math.max(0,Math.min(1,(phase-.75)/.25));
   ctx.beginPath();ctx.arc(apex.x,apex.y,reach,a,a+width+.001);
   ctx.strokeStyle='#48c4ff';ctx.globalAlpha=opacity*feather*fade*.45;ctx.lineWidth=2.2;ctx.stroke();
  }
 }
}

export function drawPatchScanner(ctx:CanvasRenderingContext2D,image:HTMLImageElement|undefined,frame:PatchScanFrame,view:FoliageViewport,lens?:Vec){
 const {origin,radius,sweep,opacity}=frame,margin=radius+55;
 const beamVisible=origin.x>=view.x-margin&&origin.x<=view.x+view.width+margin&&
  origin.y>=view.y-margin&&origin.y<=view.y+view.height+margin;
 if(beamVisible&&opacity>0){
  ctx.save();
  ctx.translate(origin.x,origin.y);ctx.globalAlpha=opacity;
  const aperture=frame.aperture??lens??origin;
  const apex={x:aperture.x-origin.x,y:aperture.y-origin.y};
  if(!(ctx as ScanCanvas).drawPatchScanLight?.(apex,frame.angle,frame.halfAngle,radius,sweep))drawBeamFallback(ctx,frame,apex);
  ctx.restore();
 }
 // Marks have their own lifetime and viewport check, even after walking or teleporting away.
 if(image)for(const print of frame.prints){
  const pad=PATCH_TRACK_WIDTH[print.kind];
  if(print.opacity>0&&print.x>=view.x-pad&&print.x<=view.x+view.width+pad&&
   print.y>=view.y-pad&&print.y<=view.y+view.height+pad)drawImpression(ctx,image,print);
 }
}
