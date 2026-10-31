import {isSpear,SPEAR_GEAR} from './player-gear';
import {timeOf,type World} from './survival-engine';
import {SPEAR_THRUST} from './spear-combat';
import {weaponGrip} from './weapon-grip';
import {thrustAngle} from './thrust-motion';

export const SPEAR_IMAGES={woodenSpear:SPEAR_GEAR.woodenSpear.image,metalSpear:SPEAR_GEAR.metalSpear.image};
export function spearPose(w:World){
 const p=w.player;if(!isSpear(p.equipped)||p.downedUntil||p.hp<=0||w.phase==='over')return;
 const grip=weaponGrip(w),age=w.spearThrust?timeOf(w)-w.spearThrust.started:Infinity;
 return {...grip,item:p.equipped,angle:thrustAngle(grip.view,age,SPEAR_THRUST)};
}
export function drawSpear(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:NonNullable<ReturnType<typeof spearPose>>,part:'whole'|'tip'|'tail'='whole'){
 ctx.save();ctx.translate(...pose.hand);ctx.rotate(pose.angle);
 // The leather grip is registered to the palm, never the tip or canvas edge.
 // A pole extends on both sides of the fist: its butt passes behind the torso
 // and head while the forward section passes in front. Never lay it over eyes.
 const k=.094,y=part==='tail'?875:0,height=part==='tip'?875:1536-y;
 ctx.drawImage(image,0,y,1024,height,-512*k,(y-875)*k,1024*k,height*k);ctx.restore();
}
