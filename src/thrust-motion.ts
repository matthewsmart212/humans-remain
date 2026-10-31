import type {WeaponView} from './weapon-grip';

const ANGLES:Record<WeaponView,{carry:number;attack:number}>={
 down:{carry:-1.98,attack:-Math.PI},'down-right':{carry:1.85,attack:Math.PI*.75},
 right:{carry:1.35,attack:Math.PI/2},'up-right':{carry:.75,attack:Math.PI/4},up:{carry:.3,attack:0}
};
const ease=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x)};
/** Shared spear/sword alignment: extend, hold through contact, then recover. */
export function thrustAngle(view:WeaponView,age:number,spec:{extend:number;retract:number;duration:number}){
 const extension=age<=spec.retract?ease(age/spec.extend):1-ease((age-spec.retract)/(spec.duration-spec.retract));
 const angles=ANGLES[view];return angles.carry+(angles.attack-angles.carry)*extension;
}
