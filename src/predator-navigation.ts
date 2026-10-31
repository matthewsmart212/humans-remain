import {worldBlocked,type Vec,type World} from './survival-engine';
const BODY=22;
export type PredatorNavigationBudget={remaining:number};
export function routeClear(w:World,a:Vec,b:Vec){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/24));
 for(let i=1;i<=n;i++)if(worldBlocked(w,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,BODY))return false;
 return true;
}
export function clearSight(w:World,a:Vec,b:Vec){
 // Overlapping samples also catch thin wall panels at short bite distances.
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));
 for(let i=1;i<n;i++)if(worldBlocked(w,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,4))return false;
 return true;
}
