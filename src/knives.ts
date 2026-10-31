import type {World} from './survival-engine';
import {weaponGrip,type WeaponView} from './weapon-grip';
export {drawWeaponGrip as drawKnifeGrip} from './weapon-grip';
const ANGLES:Record<WeaponView,{carry:number;attack:number}>={down:{carry:-1.98,attack:Math.PI},'down-right':{carry:1.85,attack:Math.PI*.75},right:{carry:1.35,attack:Math.PI/2},'up-right':{carry:.75,attack:Math.PI/4},up:{carry:.3,attack:0}};

export const KNIFE_IMAGES={woodenKnife:'/survival/equipment/wooden-knife-v1.png',scrapKnife:'/survival/equipment/scrap-knife-v1.png'};
export function knifePose(w:World){
 const p=w.player;
 if((p.equipped!=='woodenKnife'&&p.equipped!=='scrapKnife')||p.downedUntil||p.hp<=0||w.phase==='over')return;
 const grip=weaponGrip(w),angles=ANGLES[grip.view];
 return {...grip,angle:grip.striking?angles.attack:angles.carry,flip:1,item:p.equipped};
}
export function drawKnife(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:NonNullable<ReturnType<typeof knifePose>>){
 ctx.save();ctx.translate(...pose.hand);ctx.rotate(pose.angle);ctx.scale(pose.flip,1);
 // Both upright source images use the grip centre as their fixed pivot.
 const k=.027,gripX=pose.item==='woodenKnife'?500:475;
 ctx.drawImage(image,-gripX*k,-1130*k,1024*k,1536*k);ctx.restore();
}
