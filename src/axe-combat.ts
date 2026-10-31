/** All timings are simulation seconds; artwork, hit tests and audio share these.
 * A short two-cut survival-tool combo, with a committed facing for each cut. */
import {PICKAXE_STRIKE,WOODEN_PICKAXE_STRIKE} from './pickaxes';
export type AxeCut=1|2;
export type AxeSwingState={started:number;angle:number;resolved:boolean;cut?:AxeCut;queued?:boolean;tool?:'axe'|'woodenAxe'|'woodenPickaxe'|'metalPickaxe'};
export const AXE_SWING={duration:.58,contact:.265,cooldown:.66,cost:0,damage:40,reach:136,halfArc:Math.PI*.34,push:22} as const;
export const AXE_RETURN={duration:.64,contact:.29,cooldown:.80,cost:0,damage:48,reach:144,halfArc:Math.PI*.40,push:34} as const;
export const AXE_CHAIN={open:.10,heldOpen:.24,close:.53,start:.43} as const;
export const WOOD_AXE_SWING={...AXE_SWING,damage:20,push:14},WOOD_AXE_RETURN={...AXE_RETURN,damage:24,push:20};
export const axeProfile=(swing?:Pick<AxeSwingState,'cut'|'tool'>)=>swing?.tool==='woodenPickaxe'?WOODEN_PICKAXE_STRIKE:swing?.tool==='metalPickaxe'?PICKAXE_STRIKE:swing?.tool==='woodenAxe'?(swing.cut===2?WOOD_AXE_RETURN:WOOD_AXE_SWING):(swing?.cut===2?AXE_RETURN:AXE_SWING);
export function axePoseFrame(swing:AxeSwingState,now:number){
 const age=Math.max(0,now-swing.started),spec=axeProfile(swing),offset=swing.cut===2?4:0;
 // Strong silhouettes are held through wind-up and contact; no ghosted blends.
 return offset+(age<spec.contact-.065?0:age<spec.contact+.06?1:age<spec.duration-.13?2:3);
}
export function axeMoveScale(swing:AxeSwingState,now:number){
 const age=now-swing.started,spec=axeProfile(swing);
 if(age<0||age>=spec.duration)return 1;
 // You can steer throughout a strike. The weight is strongest at contact.
 return age<spec.contact-.07?.78:age<spec.contact+.09?(swing.cut===2?.52:.62):.84;
}
