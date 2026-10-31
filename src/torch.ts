import type {World} from './survival-engine';
import {workerAnimation} from './worker-animation';
import {runnerCycle,runnerFacing} from './runner-cycles';
import {axeAttachment} from './axe-renderer';
export type TorchBeam={x:number;y:number;dx:number;dy:number;range:number};
/** Same measured fist and body bob for the carried prop and its light source. */
export function torchPose(w:World){
 const p=w.player;if(p.equipped!=='torch'||!w.tools.torch||p.downedUntil||p.hp<=0||w.phase==='over')return;
 const animation=workerAnimation(w),facing=runnerFacing(animation.direction);
 const moving=animation.pose==='walk'||animation.pose==='run';
 const cycle=moving?runnerCycle(animation.direction,p.walkDistance,(p.runBlend??0)>.45):undefined;
 const carry=axeAttachment(w,cycle?animation.direction:facing.view,animation.pose,cycle);
 const angle=facing.view==='down'?Math.PI/2:facing.view==='up'?-Math.PI/2:facing.view==='down-right'?Math.PI/4:facing.view==='up-right'?-Math.PI/4:0;
 const mirror=facing.mirror?-1:1,dx=Math.cos(angle)*mirror,dy=Math.sin(angle);
 return {...carry,behind:carry.behind&&facing.view!=='up',angle,beam:{x:p.x+carry.hand[0]*mirror+dx*25,y:p.y+carry.hand[1]+(cycle?.bob??0)*(p.walkBlend??1)+dy*25,dx,dy,range:560}};
}
export function torchBeam(w:World):TorchBeam|undefined{return w.torchOn?torchPose(w)?.beam:undefined}
export function drawTorch(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:NonNullable<ReturnType<typeof torchPose>>,on:boolean){
 ctx.save();ctx.translate(...pose.hand);ctx.rotate(pose.angle);
 ctx.drawImage(image,-11,-5.625,36,11.25);
 if(on){ctx.fillStyle='#fff0b5';ctx.beginPath();ctx.ellipse(24,0,1.4,3.3,0,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}
