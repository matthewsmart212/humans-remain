import {isSword,SWORD_GEAR} from './player-gear';
import {timeOf,type World} from './survival-engine';
import {SWORD_THRUST} from './sword-combat';
import {weaponGrip} from './weapon-grip';
import {thrustAngle} from './thrust-motion';

export const SWORD_IMAGES={woodenSword:SWORD_GEAR.woodenSword.image,metalSword:SWORD_GEAR.metalSword.image};
export function swordPose(w:World){
 const p=w.player;if(!isSword(p.equipped)||p.downedUntil||p.hp<=0||w.phase==='over')return;
 const grip=weaponGrip(w),age=w.swordThrust?timeOf(w)-w.swordThrust.started:Infinity;
 return {...grip,item:p.equipped,age,active:age>=0&&age<SWORD_THRUST.duration,angle:thrustAngle(grip.view,age,SWORD_THRUST)};
}
export function drawSword(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:Pick<NonNullable<ReturnType<typeof swordPose>>,'hand'|'angle'|'item'>){
 ctx.save();ctx.translate(...pose.hand);ctx.rotate(pose.angle);
 const k=.055,[x,y]=pose.item==='woodenSword'?[513,1255]:[528,1215];
 ctx.drawImage(image,-x*k,-y*k,1024*k,1536*k);ctx.restore();
}
