import type {World} from './survival-engine';
import type {axeAttachment} from './axe-renderer';
import {gear} from './player-gear';

export const REPAIR_HAMMER_IMAGE='/survival/equipment/repair-hammer-v1.webp';
export const REPAIR_HAMMER_IMAGES={repairHammer:REPAIR_HAMMER_IMAGE};
/** One-time starter-kit migration for expeditions saved before the hammer. */
export function grantStarterRepairHammer(w:World){
 if(!w.progression||w.progression.starterRepairHammer)return;
 const g=gear(w);if(!(g.bag.repairHammer??0)&&!(g.chest.repairHammer??0))g.bag.repairHammer=1;
 w.tools.hammer=true;w.progression.starterRepairHammer=true;
}
export function drawRepairHammer(ctx:CanvasRenderingContext2D,image:HTMLImageElement,pose:ReturnType<typeof axeAttachment>){
 ctx.save();ctx.translate(...pose.hand);ctx.rotate(pose.angle);ctx.scale(pose.flip,1);
 const k=.039;ctx.drawImage(image,-510*k,-1180*k,1024*k,1536*k);ctx.restore();
}
