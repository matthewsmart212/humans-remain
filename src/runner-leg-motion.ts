import type {Direction} from './survival-engine';
import layers from './runner-leg-layers.json';
import armOutlines from './runner-arm-outlines.json';
import type {RunnerSprite} from './runner-cycles';

type View='right'|'down-right'|'up-right';
type Point=readonly [number,number];
export function runnerLegView(direction:Direction,running:boolean):View|undefined{
 if(direction==='down-right'||direction==='down-left')return 'down-right';
 if(running&&(direction==='up-right'||direction==='up-left'))return 'up-right';
 if(!running&&(direction==='right'||direction==='left'))return 'right';
}

// The two complete painted legs have separate hip attachments. Their gait
// phases are exactly half a cycle apart, including during walk/run changes.
// Small whole-leg transforms retain short thighs and intact boots.
export function runnerLegPose(view:View,distance:number,running:boolean,near:boolean){
 // Both gaits hold the same four poses as the body and the approved directions:
 // contact, passing, opposite contact, opposite passing.
 const sampledDistance=Math.floor((((distance%112)+112)%112)/28)*28;
 const phase=(((sampledDistance/112+(near?0:.5))%1)+1)%1;
 const reach=running?12:16,advance=Math.cos(phase*Math.PI*2)*reach;
 const lift=Math.pow(Math.max(0,-Math.sin(phase*Math.PI*2)),2)*(running?6:3);
 const vector:Point=view==='right'?[1,0]:view==='down-right'?[.75,.55]:[.75,-.55];
 const hip:Point=view==='right'?(near?[-8,-30]:[-1,-32]):view==='down-right'?
  (running?(near?[-10,-41]:[5,-41]):(near?[-10,-31]:[5,-34])):
  (near?[3,-36]:[-13,-41]);
 const length=31,dx=advance*vector[0],dy=length+advance*vector[1]-lift;
 return {phase,advance,lift,hip,dx,dy,length,angle:-Math.atan2(dx,dy),stretch:Math.hypot(dx,dy)/length};
}

export function drawRunnerLegs(ctx:CanvasRenderingContext2D,image:HTMLImageElement,view:View,distance:number,running:boolean){
 const poses=[runnerLegPose(view,distance,running,false),runnerLegPose(view,distance,running,true)];
 const order=view==='right'?[0,1]:[0,1].sort((a,b)=>(poses[a].hip[1]+poses[a].dy)-(poses[b].hip[1]+poses[b].dy));
 for(const index of order){
  const layer=layers[view][index],pose=poses[index],[sx,sy,sw,sh]=layer.crop;
  const scale=28/sw,vertical=pose.length/sh;
  ctx.save();ctx.translate(...pose.hip);ctx.rotate(pose.angle);ctx.scale(1,pose.stretch);
  // The source's soft background fringe is outside this measured silhouette.
  // Clipping is runtime-only; no pixels or painted leg details are rewritten.
  ctx.beginPath();layer.outline.forEach(([x,y],i)=>{const px=(x-layer.root[0])*scale,py=y*vertical;i?ctx.lineTo(px,py):ctx.moveTo(px,py)});ctx.closePath();ctx.clip();
  ctx.drawImage(image,sx,sy,sw,sh,-layer.root[0]*scale,0,sw*scale,pose.length);
  ctx.restore();
 }
}

export function drawRunnerTorso(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sprite:RunnerSprite,view:View,running:boolean,frame:number){
 const walkHem=[-26,-32,-30,-33][frame];
 const runLeft=[[-54,-39],[-70,-48],[-82,-54],[-60,-43]][frame];
 const edge:readonly Point[]=view==='right'?[[-55,-42],[-29,-25],[-18,-18],[-10,-19],[0,-26],[17,-27],[35,-34],[55,-42]]:
  view==='down-right'?(running?[[-55,-105],[-39,runLeft[0]],[-31,runLeft[1]],[-24,-31],[-16,-34],[-5,-39],[18,-36],[35,-29],[55,-48]]:
   [[-55,-45],[-31,-26],[-24,-20],[-16,-21],[-8,-26],[18,walkHem],[34,walkHem-2],[55,-40]]):
  [[-55,-49],[-28,-36],[-14,-34],[-5,-30],[8,-28],[20,-30],[33,-38],[55,-45]];
 ctx.save();ctx.beginPath();ctx.moveTo(-80,-160);ctx.lineTo(80,-160);
 for(let i=edge.length-1;i>=0;i--)ctx.lineTo(...edge[i]);
 ctx.closePath();
 if(view==='down-right'&&running){
  armOutlines[frame].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 }
 ctx.clip();
 const [sx,sy,sw,sh]=sprite.crop,k=sprite.scale;
 ctx.drawImage(image,sx,sy,sw,sh,-sprite.anchor[0]*k,-sprite.anchor[1]*k,sw*k,sh*k);
 ctx.restore();
}
