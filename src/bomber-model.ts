/** World units and simulation seconds. Shared by damage, art and warning. */
export const BOMBER_ATTACK={fuse:1.9,trigger:82,radius:142,damage:44,maxArming:2} as const;
export type BomberState={armedAt:number;beep:number;detonated?:boolean};
export const bomberPulsePhase=(age:number)=>2*Math.max(0,age)+1.5*Math.max(0,age)**2/BOMBER_ATTACK.fuse;
export const bomberProgress=(age:number)=>Math.max(0,Math.min(1,age/BOMBER_ATTACK.fuse));

/** Grow once across the fuse, then draw inward during the final 180 ms. */
export const BOMBER_COLLAPSE=.18;
export function bomberWarningRadius(age:number,reducedMotion=false){
 if(reducedMotion)return BOMBER_ATTACK.radius;
 const growUntil=BOMBER_ATTACK.fuse-BOMBER_COLLAPSE;
 if(age<=growUntil)return BOMBER_ATTACK.radius*Math.max(0,age/growUntil);
 const inward=Math.max(0,Math.min(1,(age-growUntil)/BOMBER_COLLAPSE));
 return BOMBER_ATTACK.radius*(1-inward*inward);
}
