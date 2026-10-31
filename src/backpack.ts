import {IRONWORKS_MATERIALS} from './ironworks-data';
import {PICKAXE_GEAR,STONE_IMAGE} from './pickaxes';
import {AXE_GEAR,KNIFE_GEAR,SPEAR_GEAR,SWORD_GEAR,equipGear,isGear} from './player-gear';
import {SWORD_THRUST} from './sword-combat';
import {BOW_SHOT} from './bow-combat';
import {GEAR,BOW_GEAR} from './player-gear';
import {SPEAR_THRUST} from './spear-combat';
import {FOOD_RECIPES} from './food-items';
import {ITEM_RULES,itemCount,takeInventory,type InventoryKind} from './expedition-inventory';
import {PROVISION_IDS,PROVISIONS,isProvision,consumeProvision,type ProvisionId} from './food-provisions';
import {BONFIRE_FOOD_IMAGES} from './bonfire-food-art';
import {RABBIT_FOOD_IMAGES,VENISON_FOOD_IMAGES,foodName} from './food-items';
import {AXE_SWING,AXE_RETURN} from './axe-combat';
import {doAction,toggleAxe,worldBlocked,lineClear,timeOf,type World,type Vec} from './survival-engine';
import type {FieldKitSnapshot} from './field-kit';

export type BagItemId='repairHammer'|'ironOre'|'ironIngot'|'stone'|'woodenPickaxe'|'metalPickaxe'|ProvisionId|'bow'|'arrows'|'woodenSword'|'metalSword'|'woodenSpear'|'metalSpear'|'woodenKnife'|'scrapKnife'|'woodenAxe'|'axe'|'raw'|'meal'|'rabbitRaw'|'rabbitMeal'|'venisonRaw'|'venisonMeal'|'logs'|'scrap'|'fuel';
export type BagFilter='All'|'Food'|'Materials'|'Gear';
export type BagItem={id:BagItemId;name:string;category:Exclude<BagFilter,'All'>;count:number;image:string;description:string;facts:readonly [string,string][];hint:string;food?:number;health?:number;water?:number;stamina?:number;healthOverTime?:number;duration?:number;raw?:boolean;useLabel?:string;useDisabled:boolean;droppable:boolean};
export const BAG_IMAGES={repairHammer:GEAR.repairHammer.image,ironOre:IRONWORKS_MATERIALS.ironOre.image,ironIngot:IRONWORKS_MATERIALS.ironIngot.image,stone:STONE_IMAGE,woodenPickaxe:PICKAXE_GEAR.woodenPickaxe.image,metalPickaxe:PICKAXE_GEAR.metalPickaxe.image,...Object.fromEntries(PROVISION_IDS.map(id=>[id,PROVISIONS[id].image])) as Record<ProvisionId,string>,bow:BOW_GEAR.bow.image,arrows:BOW_GEAR.arrows.image,woodenSword:SWORD_GEAR.woodenSword.image,metalSword:SWORD_GEAR.metalSword.image,woodenSpear:SPEAR_GEAR.woodenSpear.image,metalSpear:SPEAR_GEAR.metalSpear.image,woodenKnife:KNIFE_GEAR.woodenKnife.image,scrapKnife:KNIFE_GEAR.scrapKnife.image,woodenAxe:AXE_GEAR.woodenAxe.image,axe:'/survival/ui-field-kit-v1/axe.png',raw:BONFIRE_FOOD_IMAGES.bonfireRaw,meal:BONFIRE_FOOD_IMAGES.bonfireCooked,rabbitRaw:RABBIT_FOOD_IMAGES.rabbitRaw,rabbitMeal:RABBIT_FOOD_IMAGES.rabbitCooked,venisonRaw:VENISON_FOOD_IMAGES.venisonRaw,venisonMeal:VENISON_FOOD_IMAGES.venisonCooked,logs:'/survival/ui-field-kit-v1/logs.png',scrap:'/survival/ui-backpack-v1/scrap.png',fuel:'/survival/ui-backpack-v1/fuel.png'} as const;
export type BackpackContents=Pick<FieldKitSnapshot,'axes'|'selected'|'downed'|'raw'|'cooked'|'rawRabbit'|'cookedRabbit'|'rawVenison'|'cookedVenison'|'logs'|'scrap'|'fuel'|'mealCooldown'|'health'|'hunger'>&Partial<Pick<FieldKitSnapshot,'ironOre'|'ironIngot'|'stone'|'provisions'|'stamina'|'thirst'|'mealRecoveryRemaining'>>;
export function backpackItems(s:BackpackContents):BagItem[]{
 const items:BagItem[]=(['woodenAxe','axe'] as const).filter(id=>s.axes[id]>0).map(id=>{const a=AXE_GEAR[id];return{id,name:a.name,category:'Gear',count:s.axes[id],image:BAG_IMAGES[id],description:id==='woodenAxe'?'A carved wooden axe. Faster and safer than fists; weaker than the camp axe.':'A sturdy steel axe. The fastest tool for chopping trees.',facts:[['Damage',`${a.damage} / ${a.returnDamage}`],['Stamina','No cost'],['Weight',`${a.weight} kg`]],hint:'Take or store tools in the headquarters chest.',useLabel:s.selected===id?'Stow axe':'Equip axe',useDisabled:s.downed,droppable:false}});
 if(s.axes.repairHammer)items.push({id:'repairHammer',name:'Repair hammer',category:'Gear',count:s.axes.repairHammer,image:GEAR.repairHammer.image,description:'Restore camp ruins and repair robot damage on site.',facts:[['Use','Repair on site'],['Stamina','No cost'],['Weight','1.2 kg']],hint:'Equip the hammer and approach a damaged building. Hold REPAIR to fill the wheel. Releasing drains progress; materials are used only at 100%.',useLabel:s.selected==='repairHammer'?'Stow hammer':'Equip hammer',useDisabled:s.downed,droppable:false});
 for(const id of ['woodenPickaxe','metalPickaxe'] as const){const a=PICKAXE_GEAR[id],count=s.axes[id]??0;if(count)items.push({id,name:a.name,category:'Gear',count,image:a.image,description:id==='woodenPickaxe'?'A rope-bound hardwood mining tool. Breaks boulders into collectible stone.':'A salvaged steel mining head on a timber haft. Mines the same stone in roughly half the strikes.',facts:[['Rock damage',String(a.damage)],['Stamina','No cost'],['Weight',`${a.weight} kg`]],hint:'Only pickaxes can mine boulders. Take or store tools in the headquarters chest.',useLabel:s.selected===id?'Stow pickaxe':'Equip pickaxe',useDisabled:s.downed,droppable:false})}
 for(const id of ['woodenKnife','scrapKnife'] as const){const k=KNIFE_GEAR[id],count=s.axes[id]??0;if(count)items.push({id,name:k.name,category:'Gear',count,image:k.image,description:id==='woodenKnife'?'A light carved wooden blade for quick close-range hunting.':'A sharp salvaged steel blade. Fast close-range attacks for hunting and finishing weakened enemies.',facts:[['Damage',`${k.damage}`],['Attack interval','0.3 seconds'],['Weight',`${k.weight} kg`]],hint:'Store or take knives at the headquarters chest.',useLabel:s.selected===id?'Stow knife':'Equip knife',useDisabled:s.downed,droppable:false})}
 for(const id of ['woodenSpear','metalSpear'] as const){const spear=SPEAR_GEAR[id],count=s.axes[id]??0;if(count)items.push({id,name:spear.name,category:'Gear',count,image:spear.image,description:id==='woodenSpear'?'A sharpened timber spear. Long, precise thrusts keep animals and robots at a distance.':'A wooden spear reinforced with a salvaged steel point. The same long reach, with more damage against tough enemies.',facts:[['Damage',`${spear.damage}`],['Attack interval',`${SPEAR_THRUST.cooldown} seconds`],['Weight',`${spear.weight} kg`]],hint:'One target per thrust. Store or take spears at the headquarters chest.',useLabel:s.selected===id?'Stow spear':'Equip spear',useDisabled:s.downed,droppable:false})}
 for(const id of ['woodenSword','metalSword'] as const){const sword=SWORD_GEAR[id],count=s.axes[id]??0;if(count)items.push({id,name:sword.name,category:'Gear',count,image:sword.image,description:id==='woodenSword'?'A carved timber blade for short, precise thrusts.':'A salvaged steel blade with a wrapped grip. Stronger close-range thrusts.',facts:[['Damage',`${sword.damage}`],['Attack interval',`${SWORD_THRUST.cooldown} seconds`],['Weight',`${sword.weight} kg`]],hint:'One target per thrust. Shorter reach than a spear. Store or take swords at the headquarters chest.',useLabel:s.selected===id?'Stow sword':'Equip sword',useDisabled:s.downed,droppable:false})}
 if(s.axes.bow)items.push({id:'bow',name:BOW_GEAR.bow.name,category:'Gear',count:s.axes.bow,image:BOW_GEAR.bow.image,description:'A carved wooden hunting bow with leather and worn teal bindings. Fire arrows at animals and robots from a distance.',facts:[['Damage',String(BOW_SHOT.damage)],['Range',String(BOW_SHOT.range)],['Arrows',String(s.axes.arrows??0)]],hint:'Face your target and tap Shoot. Hold to keep firing. Restock arrows in the headquarters chest.',useLabel:s.selected==='bow'?'Stow bow':'Equip bow',useDisabled:s.downed,droppable:false});
 if(s.axes.arrows)items.push({id:'arrows',name:'Arrows',category:'Gear',count:s.axes.arrows,image:BOW_GEAR.arrows.image,description:'Wooden shafts with feather fletching and salvaged steel points. Each bow shot uses one arrow.',facts:[['Ammo',String(s.axes.arrows)],['Each',`${BOW_GEAR.arrows.weight} kg`],['Stack',`${(s.axes.arrows*BOW_GEAR.arrows.weight).toFixed(2)} kg`]],hint:'Consumed when the bow releases. Store or take a stack in the headquarters chest.',useDisabled:true,droppable:false});
 const ids={chicken:['raw','meal'],rabbit:['rabbitRaw','rabbitMeal'],venison:['venisonRaw','venisonMeal']} as const;
 const counts={chicken:[s.raw,s.cooked],rabbit:[s.rawRabbit||0,s.cookedRabbit||0],venison:[s.rawVenison||0,s.cookedVenison||0]};
 for(const species of ['chicken','rabbit','venison'] as const){const r=FOOD_RECIPES[species];for(const cooked of [false,true]){
  const id=ids[species][cooked?1:0],count=counts[species][cooked?1:0],kind=cooked?r.cooked:r.raw,weight=ITEM_RULES[kind].weight;
  if(!count)continue;
  items.push({id,name:ITEM_RULES[kind].name,category:'Food',count,image:BAG_IMAGES[id],description:cooked?'Ready to eat. Restores food and a little health.':`Cook over the campfire for ${r.seconds}s before eating.`,food:r.food,health:r.health,raw:!cooked,facts:[['Each',`${weight} kg`],['Stack',`${(weight*count).toFixed(2)} kg`]],hint:cooked?(s.mealCooldown?`Ready again in ${s.mealCooldown}s of play.`:s.hunger>=100&&s.health>=100?'Food and health are full.': '8 seconds between meals.'):'Benefits shown are for the cooked meal.',useLabel:cooked?(s.mealCooldown?`Wait ${s.mealCooldown}s`:'Eat'):undefined,useDisabled:!cooked||s.downed||!count||!!s.mealCooldown||(s.hunger>=100&&s.health>=100),droppable:true});
 }}
 for(const id of PROVISION_IDS){
  const r=PROVISIONS[id],count=s.provisions?.[id]??0;if(!count)continue;
  const useful=r.food>0&&s.hunger<=99||r.water>0&&(s.thirst??100)<=99||r.stamina>0&&(s.stamina??100)<=99||r.healOverTime>0&&s.health+(s.mealRecoveryRemaining??0)<=99;
  items.push({id,name:r.name,category:'Food',count,image:r.image,description:r.description,food:r.food,health:0,water:r.water,stamina:r.stamina,healthOverTime:r.healOverTime,duration:r.duration,
   facts:[['Each',`${r.weight} kg`],['Stack',`${(count*r.weight).toFixed(2)} kg`]],
   hint:s.mealCooldown?`Ready again in ${s.mealCooldown}s of play.`:!useful?'Your restored stats are already full.':id==='huntersMeal'?'Prepare at the campfire with 1 cooked meat and 2 berries.':`${r.cooldown} seconds between bites.`,
   useLabel:s.mealCooldown?`Wait ${s.mealCooldown}s`:'Eat',useDisabled:s.downed||!!s.mealCooldown||!useful,droppable:true});
 }
 for(const [id,kind,count,description,hint] of [
  ['logs','pallets',s.logs,'Timber chopped from trees. Each log keeps the cooking fire burning for 90 seconds.','Use at the fire or store heavy stacks in a camp chest.'],
  ['ironOre','ironOre',s.ironOre??0,'Raw iron-bearing rock. Find bonus ore in ordinary boulders or mine visible iron deposits with a metal pickaxe.','At the camp furnace, smelt 2 ore into 1 iron ingot using log fuel.'],
  ['ironIngot','ironIngot',s.ironIngot??0,'Refined iron, ready for metal tools, weapons and furnace upgrades.','Craft equipment at the camp smithy beside the furnace. Store spare ingots in any camp chest.'],
  ['stone','stone',s.stone??0,'Stone mined from weathered boulders. Use with ingots and logs to reinforce the camp furnace.','Store stone in a camp chest to free carrying weight.'],
  ['scrap','scrap',s.scrap,'Recovered metal pieces. Recycle 3 scrap into 1 iron ingot at the camp furnace.','Unload at a camp chest to free carrying weight.'],
  ['fuel','fuel',s.fuel,'Recovered fuel for camp equipment.','Campfire cooking uses logs. Store fuel at camp.'],
 ] as const){const weight=ITEM_RULES[kind].weight;items.push({id,name:ITEM_RULES[kind].name,category:'Materials',count,image:BAG_IMAGES[id],description,facts:[['Each',`${weight} kg`],['Stack',`${(count*weight).toFixed(2)} kg`]],hint,useDisabled:true,droppable:true})}
 return items.filter(i=>i.count>0);
}
export function useBackpackItem(w:World,id:BagItemId){
 if(w.phase==='over'||w.player.downedUntil||w.player.hp<=0)return false;
 if(isGear(id))return equipGear(w,id);
 if(isProvision(id))return consumeProvision(w,id);
 if(id==='meal'||id==='rabbitMeal'||id==='venisonMeal')return doAction(w,'eat',id==='venisonMeal'?'venison':id==='rabbitMeal'?'rabbit':'chicken');
 return false;
}
export type BagResult={ok:boolean;message:string};
/** Resolve all landing positions before changing inventory. Aggregate each stack into one pile; dropping never changes its unit weight. */
export function dropBackpackItem(w:World,id:BagItemId,quantity:1|'all'):BagResult{
 if(w.phase==='over'||w.player.downedUntil||w.player.hp<=0)return{ok:false,message:'You cannot drop items right now.'};
 if(isGear(id))return{ok:false,message:'Store tools in the headquarters chest.'};
 const kind:InventoryKind=id==='venisonRaw'?'rawVenison':id==='venisonMeal'?'cookedVenison':id==='rabbitRaw'?'rawRabbit':id==='rabbitMeal'?'cookedRabbit':id==='raw'?'rawMeat':id==='meal'?'cookedMeat':id==='logs'?'pallets':id;
 const owned=itemCount(w,kind),amount=quantity==='all'?owned:1;
 if(!owned||amount>owned)return{ok:false,message:'There are no items left in that stack.'};
 const portions=Number.isSafeInteger(amount)&&amount>0?[amount]:[];
 if(!portions.length)return{ok:false,message:'That stack cannot be dropped right now.'};
 const points:Vec[]=[];
 for(const radius of [42,70,96])for(let i=0;i<16&&points.length<portions.length;i++){
  const angle=Math.PI/2+i*Math.PI/8,p={x:w.player.x+Math.cos(angle)*radius,y:w.player.y+Math.sin(angle)*radius};
  if(!worldBlocked(w,p.x,p.y,12)&&lineClear(w.player,p,w)&&!points.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<26)&&!w.loot.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<26))points.push(p);
 }
 if(points.length<portions.length)return{ok:false,message:'No clear ground nearby. Move into an open area and try again.'};
 if(!takeInventory(w,kind,amount))return{ok:false,message:'That stack has changed. Select it again.'};
 portions.forEach((count,i)=>w.loot.push({...points[i],id:w.serial++,kind,amount:count,returned:true,...(id==='logs'?{appearance:'logs' as const}:{})}));
 w.notice=`Dropped ${amount} ${foodName(kind)?.toLowerCase()||id}.`;w.noticeUntil=timeOf(w)+2;
 return{ok:true,message:`Dropped ${amount}. Collect it again from the ground nearby.`};
}
