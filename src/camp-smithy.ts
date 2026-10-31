import {buildingRestored} from './camp-restoration';
import {recipeUnlocked} from './run-progression';
import {campAccessLevel} from './camp-levels';
import {placementBounds,placementPoint,type Placement,type WorldLayout} from './world-layout';
import {lineClear,timeOf,type World} from './survival-engine';
import {FORGE_RECIPES} from './forge-recipes';
import {GEAR,gear,type GearKind} from './player-gear';
import {ITEM_RULES,itemCount,packWeight,PACK_CAPACITY} from './expedition-inventory';
import {materialEntries,canPayMaterials,payMaterials} from './camp-materials';

export const SMITHY_ID='base_workshop_t1';
export const SMITHY_IMAGE='/survival/camp-workshop-v1/camp-workshop.webp';
const cache=new WeakMap<WorldLayout,Placement[]>();
export function smithies(layout?:WorldLayout){if(!layout)return[];let list=cache.get(layout);if(!list){list=layout.items.filter(p=>p.assetId===SMITHY_ID);cache.set(layout,list)}return list}
/** The clear ground just in front of the open-front workbench, including editor transforms. */
export function smithyDock(p:Placement){const b=placementBounds(p),[x,y]=placementPoint(p,b.x+b.width*.57,b.y+b.height*.98);return{x,y}}
export function nearbySmithy(w:World){
 if(w.scene)return null;let nearest:{placement:Placement;x:number;y:number}|null=null,best=140;
 for(const p of smithies(w.layout)){const dock=smithyDock(p),d=Math.hypot(w.player.x-dock.x,w.player.y-dock.y);if(d<best&&lineClear(w.player,dock,w)){best=d;nearest={placement:p,...dock}}}return nearest;
}
const canUse=(w:World)=>buildingRestored(w,'headquarters')&&buildingRestored(w,'workshop')&&w.phase!=='over'&&w.player.hp>0&&!w.player.downedUntil&&!w.axeSwing&&!w.spearThrust&&!w.swordThrust&&!w.bowShot&&!w.dodge&&w.player.hurtUntil<=timeOf(w)&&w.attackUntil<=timeOf(w);
export function openSmithy(w:World,id:string){
 if(w.stationPanel||!canUse(w)||nearbySmithy(w)?.placement.id!==id)return false;
 w.smithyId=id;w.stationPanel='smithy';return true;
}
export const smithyAccess=(w:World)=>w.stationPanel==='smithy'&&!!w.smithyId&&canUse(w)&&nearbySmithy(w)?.placement.id===w.smithyId;
export function smithyCraftStatus(w:World,id:GearKind){
 const recipe=FORGE_RECIPES.find(r=>r.id===id);if(!recipe||!smithyAccess(w))return'Approach the camp smithy';
 if(!recipeUnlocked(w,id))return campAccessLevel(w)<2?'Expand to Camp level 2':'Restore the camp furnace';
 if(!canPayMaterials(w,recipe.cost))return'Need materials';
 const freed=materialEntries(recipe.cost).reduce((n,[kind,count])=>n+Math.min(count,itemCount(w,kind))*ITEM_RULES[kind].weight,0);
 return packWeight(w)-freed+GEAR[id].weight*recipe.count>PACK_CAPACITY+1e-7?'Backpack full':'Ready to craft';
}
export function craftSmithyGear(w:World,id:GearKind){
 const recipe=FORGE_RECIPES.find(r=>r.id===id);if(!recipe||smithyCraftStatus(w,id)!=='Ready to craft'||!payMaterials(w,recipe.cost))return false;
 if(w.progression&&['scrapKnife','metalSpear','metalSword','axe'].includes(id))w.progression.metalCrafted=true;
 if(w.progression&&id==='metalPickaxe')w.progression.craftedMetalPickaxe=true;
 const bag=gear(w).bag;bag[id]=(bag[id]??0)+recipe.count;w.notice=`Crafted ${recipe.count>1?recipe.count+' ':''}${GEAR[id].name.toLowerCase()} · Added to backpack`;w.noticeUntil=timeOf(w)+2;return true;
}
