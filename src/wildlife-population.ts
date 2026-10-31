import {timeOf,worldBlocked,type Animal,type Vec,type World} from './survival-engine';
import {usesPaintedHomeTerrain} from './terrain-art';
import {DEER_HEALTH} from './camp-deer';
import {PREDATOR_RULES} from './camp-predators';
import {clearSight} from './predator-navigation';

type Species='chicken'|'rabbit'|'doe'|'stag'|'boar'|'wolf';
type Habitat={id:string;name:string;at:Vec;members:Species[]};
export type WildlifeSlot={id:string;group:string;species:Species;home:Vec;entityId?:number;missingAt?:number};
export type WildlifeState={slots:WildlifeSlot[];nextCheck:number};
export type WildlifeMember={slot:string;group:string;alertUntil?:number};
const habitat=(id:string,name:string,x:number,y:number,members:Species[]):Habitat=>({id,name,at:{x,y},members});
/** Stable territories make learning the landscape worthwhile. Group members
 * have nearby homes, but roam independently and share a local alarm. */
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
 habitat('north-wolves','Northwestern hunting grounds',-4500,-3000,['wolf','wolf']),
 ...[[5000,4300],[-2500,6500],[9000,-3000]].map(([x,y],i)=>habitat(`wolf-${i}`,'Lone wolf territory',x,y,['wolf'])),
];
export const WILDLIFE_RETURN_SECONDS={chicken:600,rabbit:720,doe:1200,stag:1200,boar:1500,wolf:1800} as const;
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
 const home=clearHome(w,slot.home,index,w.animals.filter(a=>a.hp>0)),t=timeOf(w);if(!home)return false;
 const species=slot.species,hp=species==='boar'||species==='wolf'?PREDATOR_RULES[species].health:species==='doe'||species==='stag'?DEER_HEALTH[species]:32;
 const a:Animal={...home,id:w.serial++,home:index,hp,maxHp:hp,moving:false,right:false,flashUntil:0,wildlife:{slot:slot.id,group:slot.group}};
 const motion={home:{...home},target:{...home},direction:index%2?'down-left' as const:'down-right' as const,distance:0,state:'idle' as const,since:t,until:t+.5+(index%7)*.23,thinkAt:t,seed:1103+index,cycle:0};
 if(species==='chicken')a.chicken=motion;
 else if(species==='rabbit')a.rabbit={...motion,hop:0};
 else if(species==='doe'||species==='stag')a.deer={...motion,kind:species,stride:0};
 else a.predator={...motion,kind:species,readyAt:t+1.2,engaged:false,angle:0};
 w.animals.push(a);slot.entityId=a.id;slot.missingAt=undefined;return true;
}
export function seedWildlife(w:World){
 if(w.scene||!usesPaintedHomeTerrain(w.layout?.terrainImage)||w.ecology)return false;
 const slots:WildlifeSlot[]=[];
 for(const h of WILDLIFE_HABITATS)h.members.forEach((species,i)=>{
  const angle=i*2.399963,r=h.members.length>1?95:0;
  slots.push({id:`${h.id}:${i}`,group:h.id,species,home:{x:h.at.x+Math.cos(angle)*r,y:h.at.y+Math.sin(angle)*r}});
 });
 w.ecology={slots,nextCheck:0};slots.forEach((slot,i)=>spawn(w,slot,i));return true;
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
