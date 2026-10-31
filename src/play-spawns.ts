import {DIRECTION_ANGLES,distance,facing,lineClear,timeOf,worldBlocked,type Animal,type Vec,type World} from './survival-engine';
import {spawnCombatEnemies,clearCombatEnemies,type SpawnView} from './studio-combat';
import {DEER_HEALTH} from './camp-deer';
import {PREDATOR_RULES} from './camp-predators';
import {CHICKEN_IMAGES} from './chicken-art';
import {RABBIT_IMAGES} from './rabbit-art';
import {DEER_IMAGES} from './deer-art';
import {PREDATOR_IMAGES} from './predator-art';
import {WALKER_IMAGE_SOURCES} from './walker-sprites';
import {BOMBER_IMAGE_SOURCES} from './bomber-sprites';
import {SKITTER_IMAGE_SOURCES} from './skitter-sprites';
import {HOUND_IMAGE_SOURCES} from './hound-sprites';
import {BRUTE_IMAGE_SOURCES} from './brute-sprites';

export type SpawnKind='chicken'|'rabbit'|'doe'|'stag'|'boar'|'wolf'|'scrap-bomber'|'scrap-walker'|'skitter'|'iron-brute'|'scrap-hound';
export const SPAWNABLES:{id:SpawnKind;name:string;group:'Animals'|'Robots';note:string;image:string}[]=[
 {id:'chicken',name:'Chicken',group:'Animals',note:'Foraging animal',image:'/survival/spawn-menu-v1/chicken.webp'},
 {id:'rabbit',name:'Rabbit',group:'Animals',note:'Fast and timid',image:'/survival/spawn-menu-v1/rabbit.webp'},
 {id:'doe',name:'Deer',group:'Animals',note:'Flees from danger',image:'/survival/spawn-menu-v1/doe.webp'},
 {id:'stag',name:'Stag',group:'Animals',note:'Fights back',image:'/survival/spawn-menu-v1/stag.webp'},
 {id:'boar',name:'Wild boar',group:'Animals',note:'Aggressive charger',image:'/survival/spawn-menu-v1/boar.webp'},
 {id:'wolf',name:'Wolf',group:'Animals',note:'Aggressive hunter',image:'/survival/spawn-menu-v1/wolf.webp'},
 {id:'scrap-walker',name:'Scrap Walker',group:'Robots',note:'Armoured melee attacker',image:'/survival/scrap-walker-v3/thumbnail.webp'},
 {id:'scrap-bomber',name:'Scrap Bomber',group:'Robots',note:'Arms and self-destructs',image:'/survival/scrap-bomber-v1/thumbnail.webp'},
 {id:'skitter',name:'Skitter',group:'Robots',note:'Small, fast eye-laser robot',image:'/survival/skitter-v1/thumbnail.webp'},
 {id:'scrap-hound',name:'Scrap Hound',group:'Robots',note:'Fast hunter · Overdrive Pounce',image:'/survival/scrap-hound-v1/thumbnail.webp'},
 {id:'iron-brute',name:'Iron Brute',group:'Robots',note:'Heavy tank · leap, grapple and crush',image:'/survival/iron-brute-v1/thumbnail.webp'},
];
export const TEST_ANIMAL_LIMIT=30;
export function spawnImages(kind:SpawnKind):Record<string,string>{
 if(kind==='scrap-bomber')return BOMBER_IMAGE_SOURCES;
 if(kind==='scrap-walker')return WALKER_IMAGE_SOURCES;
 if(kind==='skitter')return SKITTER_IMAGE_SOURCES;
 if(kind==='scrap-hound')return HOUND_IMAGE_SOURCES;
 if(kind==='iron-brute')return BRUTE_IMAGE_SOURCES;
 if(kind==='chicken')return CHICKEN_IMAGES;
 if(kind==='rabbit')return RABBIT_IMAGES;
 return Object.fromEntries(Object.entries(kind==='doe'||kind==='stag'?DEER_IMAGES:PREDATOR_IMAGES).filter(([key])=>key.startsWith(kind)));
}
/** Runtime-only entities: no habitat slots, map placements or saved records. */
export function spawnPlayCreature(w:World,kind:SpawnKind,requested:number,view?:SpawnView){
 const spec=SPAWNABLES.find(s=>s.id===kind);
 if(!spec||!w.combatTest||w.phase==='over'||w.player.downedUntil)return{spawned:0,message:'Start or restart Play before spawning.'};
 if(kind==='scrap-bomber'||kind==='scrap-walker'||kind==='skitter'||kind==='iron-brute'||kind==='scrap-hound')return spawnCombatEnemies(w,kind,requested,view);
 const active=w.animals.filter(a=>a.spawnedForTest&&a.hp>0).length;
 const count=Math.min(TEST_ANIMAL_LIMIT-active,Math.max(0,Math.min(5,Math.floor(requested)||0)));
 if(count<=0)return{spawned:0,message:active>=TEST_ANIMAL_LIMIT?'Animal limit reached. Clear spawned creatures to make room.':'Choose a quantity to spawn.'};
 const radius=kind==='doe'||kind==='stag'||kind==='boar'||kind==='wolf'?26:16,angle=DIRECTION_ANGLES[w.player.direction],t=timeOf(w);let spawned=0;
 for(const ring of [220,300,380,460]){
  for(let i=0;i<32&&spawned<count;i++){
   const a=angle+(i%2?-1:1)*Math.ceil(i/2)*Math.PI/16,p={x:w.player.x+Math.cos(a)*ring,y:w.player.y+Math.sin(a)*ring};
   if(view&&(p.x<view.x+50||p.x>view.x+view.width-50||p.y<view.y+135||p.y>view.y+view.height-45))continue;
   if(worldBlocked(w,p.x,p.y,radius)||!lineClear(w.player,p,w)||w.animals.some(a=>a.hp>0&&distance(a,p)<85)||w.enemies.some(e=>e.hp>0&&distance(e,p)<85))continue;
   // Check the whole short approach, so spawning cannot strand a creature behind a thin wall.
   let clear=true;for(let step=1;step<=Math.ceil(ring/18);step++){const f=step/Math.ceil(ring/18);if(worldBlocked(w,w.player.x+(p.x-w.player.x)*f,w.player.y+(p.y-w.player.y)*f,radius)){clear=false;break}}if(!clear)continue;
   const id=w.serial++,hp=kind==='boar'||kind==='wolf'?PREDATOR_RULES[kind].health:kind==='doe'||kind==='stag'?DEER_HEALTH[kind]:32;
   const animal:Animal={...p,id,home:id,hp,maxHp:hp,moving:false,right:false,flashUntil:0,spawnedForTest:true};
   const motion={home:{...p},target:{...p},direction:facing(w.player.x-p.x,w.player.y-p.y),distance:0,state:'idle' as const,since:t,until:t+.6,thinkAt:t,seed:1103+id,cycle:0};
   if(kind==='chicken')animal.chicken=motion;
   else if(kind==='rabbit')animal.rabbit={...motion,hop:0};
   else if(kind==='doe'||kind==='stag')animal.deer={...motion,kind,stride:0};
   else animal.predator={...motion,kind,readyAt:t+1.2,engaged:false,angle:Math.atan2(w.player.y-p.y,w.player.x-p.x)};
   w.animals.push(animal);spawned++;
  }
  if(spawned===count)break;
 }
 return{spawned,message:spawned?`${spawned} ${spec.name.toLowerCase()}${spawned>1&&kind!=='doe'?'s':''} spawned nearby.${spawned<count?' No more clear space in view.':''}`:'No clear ground nearby. Move into an open area and try again.'};
}
export function clearPlaySpawns(w:World){if(!w.combatTest)return;clearCombatEnemies(w);w.animals=w.animals.filter(a=>!a.spawnedForTest)}
