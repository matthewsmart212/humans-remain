export type TrailPoint={x:number;y:number};
export type MovementTrail={origin:TrailPoint;current:TrailPoint};
/** A small, bounded set of dots connects the press origin to the live thumb. */
export function movementTrailDots({origin,current}:MovementTrail){
 const dx=current.x-origin.x,dy=current.y-origin.y,distance=Math.hypot(dx,dy);
 if(distance<5)return[{x:origin.x,y:origin.y,r:3.5,opacity:.45}];
 const steps=Math.min(24,Math.max(2,Math.ceil(distance/12)));
 return Array.from({length:steps+1},(_,i)=>{const t=i/steps;return{x:origin.x+dx*t,y:origin.y+dy*t,r:i===steps?5:i===0?3.5:2.6,opacity:.25+.6*t}});
}
