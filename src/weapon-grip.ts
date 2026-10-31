import type {World} from './survival-engine';
import {workerAnimation} from './worker-animation';
import {runnerCycle,runnerFacing,type RunnerSprite} from './runner-cycles';

export type WeaponPoint=readonly [number,number];
export type WeaponView='down'|'down-right'|'right'|'up-right'|'up';
// Measured palms for the approved painted character. Shared by both blades
// and poles so south-facing equipment stays beneath the same fingers.
const HANDS:Record<WeaponView,{idle:WeaponPoint;strike:WeaponPoint;walk:WeaponPoint[];run:WeaponPoint[]}>= {
 down:{idle:[-29,-35],strike:[-17,-44],walk:[[-29,-40],[-26,-42],[-22,-40],[-28,-41]],run:[[-27,-49],[-26,-51],[-23,-47],[-19,-47]]},
 'down-right':{idle:[-26,-31],strike:[7,-44],walk:[[-31,-38],[-27,-36],[-23,-46],[-19,-41]],run:[[-31,-54],[-32,-54],[-18,-41],[-31,-55]]},
 right:{idle:[-3,-29],strike:[35,-48],walk:[[-14,-28],[-10,-27],[16,-40],[3,-34]],run:[[6,-46],[2,-46],[-15,-37],[-5,-42]]},
 'up-right':{idle:[25,-30],strike:[38,-63],walk:[[23,-33],[18,-31],[26,-40],[24,-41]],run:[[16,-43],[19,-43],[18,-44],[27,-45]]},
 up:{idle:[27,-36],strike:[23,-103],walk:[[23,-47],[25,-38],[25,-47],[23,-38]],run:[[27,-55],[24,-51],[27,-39],[24,-49]]}
};
export function weaponGrip(w:World){
 const p=w.player,animation=workerAnimation(w),facing=runnerFacing(animation.direction);
 const moving=animation.pose==='walk'||animation.pose==='run';
 const running=!w.swordThrust&&(p.runBlend??0)>.45;
 const cycle=moving?runnerCycle(animation.direction,p.walkDistance,running):undefined;
 const view=facing.view as WeaponView,grip=HANDS[view],striking=animation.pose==='punch';
 const hand=cycle?grip[running?'run':'walk'][cycle.frame]:striking?grip.strike:grip.idle;
 return {hand,striking,view,behind:view==='up'||view==='up-right'};
}
export function drawWeaponGrip(ctx:CanvasRenderingContext2D,image:HTMLImageElement,sprite:RunnerSprite,pose:{hand:WeaponPoint;striking:boolean}){
 const radius=pose.striking?7.7:5.8;
 ctx.save();ctx.beginPath();ctx.ellipse(pose.hand[0],pose.hand[1],radius,radius,0,0,Math.PI*2);ctx.clip();
 const [sx,sy,sw,sh]=sprite.crop,k=sprite.scale;
 ctx.drawImage(image,sx,sy,sw,sh,-sprite.anchor[0]*k,-sprite.anchor[1]*k,sw*k,sh*k);ctx.restore();
}
