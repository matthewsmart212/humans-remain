import {FOOD_RECIPES,type FoodSpecies} from './food-items';
import {worldBlocked,timeOf,type World,type Vec} from './survival-engine';
import {placementBounds} from './world-layout';
import {stationFront} from './camp-stations';

export const COOKED_FOOD_HOP_SECONDS=.6;
function walkClear(w:World,a:Vec,b:Vec){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/18));
 for(let i=0;i<=steps;i++)if(worldBlocked(w,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,22))return false;
 return true;
}
/** Search a walkable ring from the fire's approach, so a hop cannot strand food
 * inside scenery or across a wall. Randomise the reachable landing direction. */
export function cookedFoodLanding(w:World):Vec|null{
 const hearth=w.camp.hearth,p=w.layout?.items.find(p=>p.role==='hearth'),b=p?placementBounds(p):{width:112,height:112};
 const front=stationFront(w.camp,'hearth',w.layout),start=Math.floor(Math.random()*16),extra=Math.random()*24;
 for(let band=0;band<3;band++){
  const rx=b.width*.5+48+extra+band*32,ry=b.height*.24+48+extra+band*24;
  const points=Array.from({length:16},(_,i)=>({x:hearth.x+Math.cos(i*Math.PI/8)*rx,y:hearth.y-b.height*.2+Math.sin(i*Math.PI/8)*ry}));
  const open=points.map(q=>!worldBlocked(w,q.x,q.y,22)),reachable=new Set<number>(),queue:number[]=[];
  const nearest=points.map((q,i)=>({i,d:Math.hypot(q.x-front.x,q.y-front.y)})).sort((a,b)=>a.d-b.d);
  for(const {i} of nearest)if(open[i]&&walkClear(w,front,points[i])){reachable.add(i);queue.push(i);break}
  for(let n=0;n<queue.length;n++)for(const i of [(queue[n]+1)%16,(queue[n]+15)%16]){
   if(!open[i]||reachable.has(i)||!walkClear(w,points[queue[n]],points[i]))continue;
   reachable.add(i);queue.push(i);
  }
  let fallback:Vec|undefined;
  for(let j=0;j<16;j++){const i=(start+j)%16;if(!reachable.has(i))continue;const q=points[i];fallback??=q;
   if(!w.loot.some(l=>l.amount>0&&Math.hypot(l.x-q.x,l.y-q.y)<34))return q;
  }
  if(fallback)return fallback;
 }
 return !worldBlocked(w,front.x,front.y,22)?front:null;
}
/** Each portion becomes ordinary saved loot; collection uses the ground action. */
export function dropCookedFood(w:World,species:FoodSpecies,born=timeOf(w)){
 const point=cookedFoodLanding(w);if(!point)return false;
 const p=w.layout?.items.find(p=>p.role==='hearth'),height=p?placementBounds(p).height:112;
 w.loot.push({...point,id:w.serial++,kind:FOOD_RECIPES[species].cooked,amount:1,
  flight:{from:{x:w.camp.hearth.x,y:w.camp.hearth.y-height*.44},born,lands:born+COOKED_FOOD_HOP_SECONDS}});
 return true;
}
