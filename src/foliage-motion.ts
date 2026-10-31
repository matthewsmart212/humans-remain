import {ASSET_BY_ID} from './world-assets';
import {placementBounds,type Placement,type WorldLayout} from './world-layout';
import type {World} from './survival-engine';

export type FoliageMotion={x:number;y:number;vx:number;vy:number;lastTouch:number};
type Plant={p:Placement;rx:number;ry:number};
const CELL=160;
const targetsByWorld=new WeakMap<World,Map<string,{x:number;y:number}>>();
let indices=new WeakMap<WorldLayout,{cells:Map<string,Plant[]>;ids:Set<string>}>();
export function invalidateFoliageMotion(){indices=new WeakMap()}
const clamp=(n:number)=>Math.max(-1,Math.min(1,n));

/** Index only plant footprints once per edited layout, never scan the whole
 * camp for each actor/tick. Each query visits just the actor's occupied cell. */
function plantIndex(layout:WorldLayout){
 let index=indices.get(layout);if(index)return index;
 index={cells:new Map(),ids:new Set()};
 for(const p of layout.items){
  if(!ASSET_BY_ID.get(p.assetId)?.foliage)continue;
  const b=placementBounds(p),radius=Math.max(b.width,b.height)*.5;
  // A circular broad phase remains conservative for flipped/rotated plants.
  const plant={p,rx:radius+24,ry:radius*.62+21};index.ids.add(p.id);
  for(let x=Math.floor((p.x-plant.rx)/CELL);x<=Math.floor((p.x+plant.rx)/CELL);x++)
   for(let y=Math.floor((p.y-plant.ry)/CELL);y<=Math.floor((p.y+plant.ry)/CELL);y++){
    const key=x+','+y,list=index.cells.get(key)||[];list.push(plant);index.cells.set(key,list);
   }
 }
 indices.set(layout,index);return index;
}

/** Fixed 60Hz spring simulation. State belongs to the play session, not a
 * placement or image, so rendering/interpolation never mutates a saved draft. */
export function stepFoliage(w:World,seconds:number){
 if(!w.layout){w.foliageMotions=undefined;return}
 if(w.weather?.reducedMotion){w.foliageMotions=undefined;return}
 // Idle actors cannot keep a plant awake. Recovery springs alone may continue
 // briefly after contact; a settled world needs no plant query or state allocation.
 const playerMoving=w.player.moving,enemyMoving=w.enemies.some(e=>e.hp>0&&e.moving),animalMoving=w.animals.some(a=>a.hp>0&&a.moving);
 if(!playerMoving&&!enemyMoving&&!animalMoving&&!w.foliageMotions)return;
 const index=plantIndex(w.layout);if(!index.ids.size){w.foliageMotions=undefined;return}
 const dt=Math.min(1/30,Math.max(0,seconds));if(!dt)return;
 const time=w.tick/60;let targets=targetsByWorld.get(w);if(!targets){targets=new Map();targetsByWorld.set(w,targets)}else targets.clear();
 const touch=(actor:{x:number;y:number},strength:number,flowX=0,flowY=0)=>{
  for(const {p,rx,ry}of index.cells.get(Math.floor(actor.x/CELL)+','+Math.floor(actor.y/CELL))||[]){
   const dx=(p.x-actor.x)/rx,dy=(p.y-actor.y)/ry,d2=dx*dx+dy*dy;if(d2>=1)continue;
   const distance=Math.sqrt(d2),amount=(1-d2)*strength;
   const target=targets.get(p.id)||{x:0,y:0};
   // Push away from the boots, with a little follow-through in travel direction.
   target.x=clamp(target.x+((distance>.08?dx/distance:0)*.78+flowX*.32)*amount);
   target.y=clamp(target.y+((distance>.08?dy/distance:0)*.78+flowY*.32)*amount);
   targets.set(p.id,target);
  }
 };
 const p=w.player,direction=p.direction;
 let fx=direction.includes('right')?1:direction.includes('left')?-1:0,fy=direction.includes('down')?1:direction.includes('up')?-1:0;
 const len=Math.hypot(fx,fy)||1;fx/=len;fy/=len;
 if(playerMoving)touch(p,p.sprinting?1:.64,fx,fy);
 // Enemies use the same local query. No new collision or pathfinding work.
 for(const enemy of w.enemies)if(enemy.hp>0&&enemy.moving)touch(enemy,.66);
 for(const animal of w.animals)if(animal.hp>0&&animal.moving)touch(animal,.45);
 if(!targets.size&&!w.foliageMotions)return;
 const motions=w.foliageMotions??(w.foliageMotions={});
 for(const id of targets.keys())motions[id]??={x:0,y:0,vx:0,vy:0,lastTouch:time};
 for(const [id,m]of Object.entries(motions)){
  if(!index.ids.has(id)){delete motions[id];continue}
  const target=targets.get(id);if(target)m.lastTouch=time;
  // Critically damped-ish: short soft recovery, never a jelly-like oscillation.
  const stiffness=92,damping=17;
  m.vx+=((target?.x||0)-m.x)*stiffness*dt;m.vy+=((target?.y||0)-m.y)*stiffness*dt;
  const drag=Math.exp(-damping*dt);m.vx*=drag;m.vy*=drag;
  m.x=clamp(m.x+m.vx*dt);m.y=clamp(m.y+m.vy*dt);
  if(!target&&time-m.lastTouch>1.8&&Math.abs(m.x)+Math.abs(m.y)+Math.abs(m.vx)+Math.abs(m.vy)<.003)delete motions[id];
 }
 if(!Object.keys(motions).length)w.foliageMotions=undefined;
}
