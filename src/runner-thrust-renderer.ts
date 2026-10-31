import {runnerLegView,drawRunnerLegs,drawRunnerTorso} from './runner-leg-motion';
import type {runnerCycle,RunnerSprite} from './runner-cycles';
import type {Direction} from './survival-engine';

type Point=readonly [number,number];
const LOWER:readonly Point[]=[[-17,-39],[17,-39],[17,-24],[32,-13],[64,0],[64,34],[-64,34],[-64,0],[-32,-13],[-17,-24]];
const UPPER:readonly Point[]=[[-90,-160],[90,-160],[90,-25],[-90,-25]];
function clipped(ctx:CanvasRenderingContext2D,image:HTMLImageElement,s:RunnerSprite,outline:readonly Point[]){
 const [sx,sy,sw,sh]=s.crop,k=s.scale;ctx.save();ctx.beginPath();
 outline.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
 ctx.drawImage(image,sx,sy,sw,sh,-s.anchor[0]*k,-s.anchor[1]*k,sw*k,sh*k);ctx.restore();
}
/** Keep the approved extended-arm drawing while the normal walking legs
 * continue underneath it. No separate character art or sword swing rig. */
export function drawMovingSwordThrust(ctx:CanvasRenderingContext2D,imgs:Record<string,HTMLImageElement>,sprite:RunnerSprite,direction:Direction,cycle:ReturnType<typeof runnerCycle>,distance:number){
 const view=runnerLegView(direction,false),image=imgs[sprite.sheet];
 if(view&&imgs.runnerLegLayers){
  drawRunnerLegs(ctx,imgs.runnerLegLayers,view,distance,false);
  drawRunnerTorso(ctx,image,sprite,view,false,cycle.frame);
 }else{
  clipped(ctx,imgs[cycle.sprite.sheet],cycle.sprite,LOWER);
  clipped(ctx,image,sprite,UPPER);
 }
}
