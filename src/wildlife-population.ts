import {timeOf,worldBlocked,type Animal,type Vec,type World} from './survival-engine';
import {usesPaintedHomeTerrain} from './terrain-art';
import {DEER_HEALTH} from './camp-deer';
import {PREDATOR_RULES} from './camp-predators';
import {clearSight} from './predator-navigation';
import {ABANDONED_CAMP_ID} from './abandoned-camp-art';
import {NORTHWEST_ABANDONED_CAMP} from './abandoned-camp-placement';
import {SOUTHEAST_SMALLHOLDING} from './smallholding-cottage';
import {yardPoint} from './smallholding-yard';
import {placementArtPoint} from './world-layout';

type Species='chicken'|'rabbit'|'doe'|'stag'|'boar'|'wolf';
type Habitat={id:string;name:string;at:Vec;members:Species[]};
export type WildlifeSlot={id:string;group:string;species:Species;home:Vec;entityId?:number;missingAt?:number};
export type WildlifeState={slots:WildlifeSlot[];nextCheck:number};
export type WildlifeMember={slot:string;group:string;alertUntil?:number};
const habitat=(id:string,name:string,x:number,y:number,members:Species[]):Habitat=>({id,name,at:{x,y},members});
/** Stable territories make learning the landscape worthwhile. Group members
 * have nearby homes, but roam independently and share a local alarm. */
const northWolves=habitat('north-wolves','Northwestern hunting grounds',-4300,-3850,['wolf','wolf']);
export const WILDLIFE_HABITATS:Habitat[]=[
 habitat('camp-meadow','Camp meadow',100,800,Array(4).fill('chicken')),
 habitat('east-meadow','East meadow',3500,2800,Array(4).fill('chicken')),
 habitat('north-west-copse','Northwest copse',-2500,-1500,Array(4).fill('chicken')),
 habitat('east-copse','Eastern copse',7000,-1000,Array(4).fill('chicken')),
 habitat('south-meadow','Southern meadow',3000,8000,Array(4).fill('chicken')),
 habitat('west-warren','West warren',-300,2200,Array(3).fill('rabbit')),
 habitat('north-warren','North warren',2800,-1200,Array(3).fill('rabbit')),
 habitat('east-warren','East warren',6200,4200,Array(3).fill('rabbit')),
 habitat('south-warren','South warren',-1200,8000,Array(3).fill('rabbit')),
 ...[[-4500,800],[1500,-4300],[8600,800],[9000,10000],[-4500,10500],[4000,11000]].map(([x,y],i)=>habitat(`rabbit-${i}`,'Woodland rabbit',x,y,['rabbit'])),
 habitat('west-herd','Western clearing',-3000,3500,['doe','doe','stag']),
 habitat('north-herd','Northern clearing',4800,-3000,['doe','doe','stag']),
 habitat('south-herd','Southern clearing',5600,9500,['doe','doe','stag']),
 ...[[-5200,-4500],[9300,4000],[-4500,9000]].map(([x,y],i)=>habitat(`stag-${i}`,'Roaming stag',x,y,['stag'])),
 habitat('west-boars','West thicket',-700,3500,['boar','boar']),
 habitat('east-boars','East thicket',5500,1000,['boar','boar']),
 ...[[-4500,8000],[2500,-3000],[8000,1500]].map(([x,y],i)=>habitat(`boar-${i}`,'Boar territory',x,y,['boar'])),
 habitat('south-wolves','Southeastern hunting grounds',8500,7500,['wolf','wolf']),
 northWolves,
 ...[[5000,4300],[-2500,6500],[9000,-3000]].map(([x,y],i)=>habitat(`wolf-${i}`,'Lone wolf territory',x,y,['wolf'])),
];
export const WILDLIFE_RETURN_SECONDS={chicken:600,rabbit:720,doe:1200,stag:1200,boar:1500,wolf:1800} as const;
export const WOODLAND_CHEST_WOLF_PACK='woodland-chest-wolves';
function clearHome(w:World,at:Vec,seed:number,occupied:Vec[]){
 // Collision geometry is authoritative; texture streaming must not decide
 // whether a distant habitat exists.
 const geometry={...w,outdoorReady:undefined};
 for(let i=0;i<160;i++){
  const angle=(i+seed)*2.399963,r=i===0?0:35+Math.sqrt(i)*48,p={x:at.x+Math.cos(angle)*r,y:at.y+Math.sin(angle)*r};
  if(!worldBlocked(geometry,p.x,p.y,30)&&occupied.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>75))return p;
 }
}
function spawn(w:World,slot:WildlifeSlot,index:number){
 const occupied:Vec[]=w.animals.filter(a=>a.hp>0);
 if(slot.group===WOODLAND_CHEST_WOLF_PACK)occupied.push(w.player);
 const home=clearHome(w,slot.home,index,occupied),t=timeOf(w);if(!home)return false;
 const species=slot.species,hp=species==='boar'||species==='wolf'?PREDATOR_RULES[species].health:species==='doe'||species==='stag'?DEER_HEALTH[species]:32;
 const a:Animal={...home,id:w.serial++,home:index,hp,maxHp:hp,moving:false,right:false,flashUntil:0,wildlife:{slot:slot.id,group:slot.group}};
 const motion={home:{...home},target:{...home},direction:index%2?'down-left' as const:'down-right' as const,distance:0,state:'idle' as const,since:t,until:t+.5+(index%7)*.23,thinkAt:t,seed:1103+index,cycle:0};
 if(species==='chicken')a.chicken=motion;
 else if(species==='rabbit')a.rabbit={...motion,hop:0};
 else if(species==='doe'||species==='stag')a.deer={...motion,kind:species,stride:0};
 else a.predator={...motion,kind:species,readyAt:t+1.2,engaged:false,angle:0};
 w.animals.push(a);slot.entityId=a.id;slot.missingAt=undefined;return true;
}

function habitatHome(h:Habitat,i:number):Vec{
 const angle=i*2.399963,r=h.members.length>1?95:0;
 return {x:h.at.x+Math.cos(angle)*r,y:h.at.y+Math.sin(angle)*r};
}

/** Older expeditions placed the den within sight of the W-6 inspection plate.
 * Preserve each wolf, its health and its respawn clock. A visible wolf walks
 * back on its own and an ongoing chase can finish normally. */
export function migrateCableWorksWolfDen(w:World){
 const ecology=w.ecology;
 if(!ecology||w.scene)return;
 const oldDen={...northWolves,at:{x:-4500,y:-3000}};
 for(const [index,slot] of ecology.slots.entries()){
  if(slot.group!==northWolves.id)continue;
  const member=northWolves.members.findIndex((_,i)=>slot.id===northWolves.id+':'+i);
  if(member<0)continue;
  const next=habitatHome(northWolves,member);
  const previous=habitatHome(oldDen,member);
  if(Math.hypot(slot.home.x-previous.x,slot.home.y-previous.y)>1)continue;
  slot.home=next;
  const wolf=w.animals.find(a=>a.id===slot.entityId);
  if(!wolf?.predator||wolf.hp<=0)continue;
  const home=clearHome(w,next,index,w.animals.filter(a=>a!==wolf&&a.hp>0));
  if(!home)continue;
  wolf.predator.home=home;
  if(!wolf.predator.engaged){
   wolf.predator.target={...home};
   wolf.predator.state='return';
   if(Math.hypot(wolf.x-w.player.x,wolf.y-w.player.y)>1700&&Math.hypot(home.x-w.player.x,home.y-w.player.y)>1700){
    wolf.x=home.x;wolf.y=home.y;
   }
  }
 }
}

/** Keep the pack's territory attached to the authored woodland camp, even if it moves in Build. */
export function seedWoodlandChestWolves(w:World){
 if(w.scene)return;
 const camp=w.layout?.items.find(p=>p.id===NORTHWEST_ABANDONED_CAMP&&p.assetId===ABANDONED_CAMP_ID);
 if(!camp)return;
 const ecology=w.ecology??={slots:[],nextCheck:0};
 const homes=[[.08,1.04],[.48,.93],[.65,1.02]];
 for(const [i,[x,y]] of homes.entries()){
  const id=`${WOODLAND_CHEST_WOLF_PACK}:${i}`;
  if(ecology.slots.some(slot=>slot.id===id))continue;
  const slot:WildlifeSlot={id,group:WOODLAND_CHEST_WOLF_PACK,species:'wolf',home:placementArtPoint(camp,x,y)};
  ecology.slots.push(slot);
  spawn(w,slot,ecology.slots.length-1);
 }
}
export function seedSmallholdingRabbits(w:World){
 const cottage=w.layout?.items.find(p=>p.id===SOUTHEAST_SMALLHOLDING);
 if(w.scene||!cottage)return;
 const ecology=w.ecology??={slots:[],nextCheck:0};
 const group='smallholding-rabbits';
 for(const [i,[u,v]] of [[370,680],[850,790],[1320,540]].entries()){
  const id=group+':'+i;
  if(ecology.slots.some(slot=>slot.id===id))continue;
  const slot:WildlifeSlot={id,group,species:'rabbit',home:yardPoint(cottage,u,v)};
  ecology.slots.push(slot);
  spawn(w,slot,ecology.slots.length-1);
 }
}
export function seedWildlife(w:World){
 if(w.scene||!usesPaintedHomeTerrain(w.layout?.terrainImage)||w.ecology)return false;
 const slots:WildlifeSlot[]=[];
 for(const h of WILDLIFE_HABITATS)h.members.forEach((species,i)=>{
  slots.push({id:`${h.id}:${i}`,group:h.id,species,home:habitatHome(h,i)});
 });
 w.ecology={slots,nextCheck:0};slots.forEach((slot,i)=>spawn(w,slot,i));seedWoodlandChestWolves(w);seedSmallholdingRabbits(w);return true;
}
export function stepWildlife(w:World){
 const ecology=w.ecology,t=timeOf(w);if(!ecology||t<ecology.nextCheck)return;ecology.nextCheck=t+.25;
 for(const [i,slot] of ecology.slots.entries()){
  const a=w.animals.find(a=>a.id===slot.entityId);
  if(!a||a.hp<=0){
   slot.missingAt??=a?.chicken?.deadAt??a?.rabbit?.deadAt??a?.deer?.deadAt??a?.predator?.deadAt??t;
   if(t-slot.missingAt>=WILDLIFE_RETURN_SECONDS[slot.species]&&Math.hypot(w.player.x-slot.home.x,w.player.y-slot.home.y)>1700&&!w.loot.some(l=>l.wildlifeSlot===slot.id)){
    if(spawn(w,slot,i)&&a)w.animals=w.animals.filter(old=>old.id!==a.id);
   }
  }
 }
 // Alarm propagates only from a fresh sighting or hit, never from another
 // animal's remembered alarm. Packs can therefore genuinely lose the player.
 for(const a of w.animals){
  if(a.hp<=0||!a.wildlife||Math.hypot(a.x-w.player.x,a.y-w.player.y)>900)continue;
  const near=Math.hypot(a.x-w.player.x,a.y-w.player.y),freshHit=a.lastHitAt!==undefined&&t-a.lastHitAt<.4;
  if(a.predator){
   const h=a.predator.wolf??a.predator.boar;
   if(!a.predator.engaged||!h?.visible||!clearSight(w,a,w.player))continue;
   for(const mate of w.animals){const m=mate.predator;if(mate.id===a.id||mate.hp<=0||mate.wildlife?.group!==a.wildlife.group||!m||Math.hypot(mate.x-a.x,mate.y-a.y)>650)continue;
    const hunt=m.wolf??m.boar;if(hunt){m.engaged=true;hunt.lastSeen={...h.lastSeen!};hunt.lastSeenAt=t}
   }
  }else if(freshHit||near<(a.rabbit?185:a.deer?(w.player.sprinting?245:180):160)){
   for(const mate of w.animals)if(mate.hp>0&&mate.wildlife?.group===a.wildlife.group&&Math.hypot(mate.x-a.x,mate.y-a.y)<600)mate.wildlife!.alertUntil=t+2;
  }
 }
}
