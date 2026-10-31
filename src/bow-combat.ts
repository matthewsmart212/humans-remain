import type {Direction,Vec} from './survival-engine';

/** One committed draw. Ammo leaves the pack on the visible release frame. */
export const BOW_SHOT={duration:.84,release:.42,cooldown:.90,damage:34,speed:980,range:900,aimArc:Math.PI/12,maxArrows:24} as const;
export type BowShot={started:number;angle:number;direction:Direction;released:boolean;target?:import('./bow-lock').BowTargetRef};
export type BowArrow=Vec&{id:number;born:number;angle:number;travelled:number};
export function bowFrame(age:number){
 if(age<.06)return 0;
 if(age<.16)return 1;
 if(age<.28)return 2;
 if(age<BOW_SHOT.release)return 3;
 if(age<.58)return 4;
 if(age<.74)return 5;
 return 0;
}
/** First entry into a target circle, including a projectile that starts inside. */
export function arrowCircleHit(from:Vec,to:Vec,center:Vec,radius:number){
 const dx=to.x-from.x,dy=to.y-from.y,x=from.x-center.x,y=from.y-center.y;
 const c=x*x+y*y-radius*radius;if(c<=0)return 0;
 const a=dx*dx+dy*dy;if(!a)return;
 const b=2*(x*dx+y*dy),disc=b*b-4*a*c;if(disc<0)return;
 const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:undefined;
}
