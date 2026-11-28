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
 if(!(frame.equipped??frame.opacity>0)||p.downedUntil||p.hp<=0)return;
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

export function drawHeldPatchScanner(ctx:CanvasRenderingContext2D,image:HTMLImageElement,rig:NonNullable<ReturnType<typeof heldPatchScanner>>,power:number){
 const [sx,sy,sw,sh]=PATCH_SCENERY_FRAMES.scanner;
 ctx.save();
 ctx.globalAlpha=1;
 ctx.translate(rig.x,rig.y);
 ctx.rotate(rig.tilt);
 ctx.scale(rig.flip*rig.scale,rig.scale);
 ctx.drawImage(image,sx,sy,sw,sh,-gripX,-gripY,sw,sh);
 if(power>0){
  const x=lensX-gripX,y=lensY-gripY;
  const glint=ctx.createRadialGradient(x,y,0,x,y,30);
  glint.addColorStop(0,'#e0f8ffeb');glint.addColorStop(.22,'#72d9ff9e');glint.addColorStop(1,'#3585ff00');
  ctx.globalAlpha=power;ctx.fillStyle=glint;ctx.fillRect(x-30,y-30,60,60);
 }
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
 brush.globalCompositeOperation='source-in';brush.fillStyle='#8bdcffe0';brush.fillRect(0,0,width,height);
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

/** Canvas fallback keeps the same soft projection, without outlined radar arcs. */
function drawBeamFallback(ctx:CanvasRenderingContext2D,frame:PatchScanFrame,apex:Vec){
 const {radius,angle,halfAngle,sweep,opacity}=frame;
 const light=ctx.createRadialGradient(apex.x,apex.y,0,apex.x,apex.y,radius);
 light.addColorStop(0,'#388dff6c');light.addColorStop(.08,'#2d88ff48');
 light.addColorStop(.3,'#2781ff3d');light.addColorStop(.65,'#1e70ff1c');light.addColorStop(1,'#1e70ff00');
 const ripple=ctx.createRadialGradient(apex.x,apex.y,0,apex.x,apex.y,radius);
 const start=Math.max(0,sweep-.095),end=Math.min(1,sweep+.095);
 ripple.addColorStop(0,'#8cdeff00');ripple.addColorStop(start,'#8cdeff00');
 ripple.addColorStop(sweep,'#8cdeff13');ripple.addColorStop(end,'#8cdeff00');ripple.addColorStop(1,'#8cdeff00');
 const smooth=(a:number,b:number,value:number)=>{const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t)};
 const waveFade=smooth(.04,.18,sweep)*(1-smooth(.72,1,sweep))*(1-smooth(.15,1,sweep));
 const slices=48,width=2*halfAngle/slices;
 ctx.globalCompositeOperation='screen';
 for(let i=0;i<slices;i++){
  const a=angle-halfAngle+i*width,offset=Math.abs((i+.5)/slices*2-1);
  const feather=1-smooth(.35,1,offset),core=1-smooth(0,.65,offset);
  ctx.globalAlpha=opacity*feather*(.65+.35*core);
  ctx.beginPath();ctx.moveTo(apex.x,apex.y);
  // Explicit vertices also work with the native adapter's addArc semantics.
  for(const edge of [a,a+width/2,a+width+.001])ctx.lineTo(apex.x+Math.cos(edge)*radius,apex.y+Math.sin(edge)*radius);
  ctx.closePath();
  ctx.fillStyle=light;ctx.fill();
  ctx.globalAlpha=opacity*feather*waveFade;ctx.fillStyle=ripple;ctx.fill();
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
