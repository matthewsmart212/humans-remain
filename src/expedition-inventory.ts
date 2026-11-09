import {IRONWORKS_MATERIALS} from './ironworks-data';
import {gearWeight} from './player-gear';
import {PROVISION_IDS,PROVISIONS,isProvision,emptyProvisionCounts,type ProvisionId,type ProvisionCounts} from './food-provisions-data';
import type {Resource,World} from './survival-engine';
export const PACK_CAPACITY=24,PACK_COMFORT=18;
/** Virtual building supplies for Creative Mode; the real inventory stays untouched. */
export const CREATIVE_RESOURCE_COUNT=9999;
export const CREATIVE_RESOURCES=['pallets','stone','scrap','ironOre','ironIngot','fuel'] as const;
export const isCreativeResource=(kind:string):kind is typeof CREATIVE_RESOURCES[number]=>CREATIVE_RESOURCES.some(id=>id===kind);
export type InventoryKind=Resource|'cookedMeat'|'cookedRabbit'|'cookedVenison'|ProvisionId;
export type ExpeditionKit={mealReadyAt:number;pantry:Record<'cookedMeat'|'cookedRabbit'|'cookedVenison',number>;provisions?:{bag:ProvisionCounts;chest:ProvisionCounts}};
export const ITEM_RULES={...IRONWORKS_MATERIALS,stone:{name:'Stone',weight:.75},pallets:{name:'Logs',weight:1.25},scrap:{name:'Metal scrap',weight:.2},fuel:{name:'Fuel',weight:.08},rawMeat:{name:'Raw chicken',weight:.65},rawRabbit:{name:'Raw rabbit',weight:.45},rawVenison:{name:'Raw meat',weight:.9},cookedMeat:{name:'Cooked chicken',weight:.45},cookedRabbit:{name:'Cooked rabbit',weight:.3},cookedVenison:{name:'Cooked meat',weight:.65},...PROVISIONS} as const;
export const INVENTORY_KINDS=Object.keys(ITEM_RULES) as InventoryKind[];
const checkedProvisionCounts=new WeakSet<object>();
const normalizedCount=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(value))):0;
/** Repair old/partial snapshots once per counter object, not on each weight sample. */
function normalizeProvisionCounts(value:unknown):ProvisionCounts{
 const counts=value&&typeof value==='object'&&!Array.isArray(value)?value as ProvisionCounts:emptyProvisionCounts();
 if(!checkedProvisionCounts.has(counts)){
  for(const id of PROVISION_IDS)counts[id]=normalizedCount(counts[id]);
  checkedProvisionCounts.add(counts);
 }
 return counts;
}
export function expeditionKit(w:World):ExpeditionKit{
 const kit:ExpeditionKit=w.kit??=( {mealReadyAt:0,pantry:{cookedMeat:0,cookedRabbit:0,cookedVenison:0}} );
 if(!kit.provisions||typeof kit.provisions!=='object'||Array.isArray(kit.provisions))kit.provisions={bag:emptyProvisionCounts(),chest:emptyProvisionCounts()};
 kit.provisions.bag=normalizeProvisionCounts(kit.provisions.bag);kit.provisions.chest=normalizeProvisionCounts(kit.provisions.chest);return kit;
}
export const provisionCounts=(w:World,side:'bag'|'chest'='bag')=>expeditionKit(w).provisions![side];
const cookedKey={cookedMeat:'cooked',cookedRabbit:'cookedRabbit',cookedVenison:'cookedVenison'} as const;
function realItemCount(w:World,kind:InventoryKind){return isProvision(kind)?(provisionCounts(w,'bag')[kind]||0):kind in cookedKey?(w[cookedKey[kind as keyof typeof cookedKey]]||0):(w.bag[kind as Resource]||0)}
export function itemCount(w:World,kind:InventoryKind){return w.creativeMode&&isCreativeResource(kind)?CREATIVE_RESOURCE_COUNT:realItemCount(w,kind)}
export function setItemCount(w:World,kind:InventoryKind,count:number){
 if(!Number.isFinite(count))return;
 const n=normalizedCount(count);if(isProvision(kind))provisionCounts(w,'bag')[kind]=n;else if(kind in cookedKey)w[cookedKey[kind as keyof typeof cookedKey]]=n;else w.bag[kind as Resource]=n;
 // Compatibility counter only. Pickup bundles never determine capacity.
 w.loads=INVENTORY_KINDS.filter(k=>itemCount(w,k)>0).length;
 if(!n&&((isProvision(kind)&&w.player.equipped===kind)||(kind==='cookedMeat'&&w.player.equipped==='meal')||(kind==='cookedRabbit'&&w.player.equipped==='rabbitMeal')||(kind==='cookedVenison'&&w.player.equipped==='venisonMeal')))w.player.equipped=null;
}
export function packWeight(w:World){return gearWeight(w)+INVENTORY_KINDS.reduce((sum,k)=>sum+realItemCount(w,k)*ITEM_RULES[k].weight,0)}
export function packLoad(w:World){const weight=packWeight(w),burden=w.creativeMode?0:Math.max(0,Math.min(1,(weight-PACK_COMFORT)/(PACK_CAPACITY-PACK_COMFORT)));return{weight,capacity:PACK_CAPACITY,burden,speed:1-burden*.12,stamina:1+burden*.3,label:w.creativeMode?'Creative':weight>PACK_CAPACITY+.001?'Overloaded':burden>0?'Heavy':'Comfortable'}}
export function canCarryCount(w:World,kind:InventoryKind,requested:number){return Math.max(0,w.creativeMode?Math.floor(requested):Math.min(Math.floor(requested),Math.floor((PACK_CAPACITY-packWeight(w)+1e-7)/ITEM_RULES[kind].weight)))}
export function addInventory(w:World,kind:InventoryKind,requested:number){const count=canCarryCount(w,kind,requested);if(count)setItemCount(w,kind,realItemCount(w,kind)+count);return count}
export function takeInventory(w:World,kind:InventoryKind,count:number){if(!Number.isInteger(count)||count<=0)return false;if(w.creativeMode&&isCreativeResource(kind))return true;if(itemCount(w,kind)<count)return false;setItemCount(w,kind,itemCount(w,kind)-count);return true}
export function storedCount(w:World,kind:InventoryKind){return isProvision(kind)?(provisionCounts(w,'chest')[kind]||0):kind in cookedKey?expeditionKit(w).pantry[kind as keyof ExpeditionKit['pantry']]:(w.stock[kind as Resource]||0)}
export function setStoredCount(w:World,kind:InventoryKind,count:number){if(!Number.isFinite(count))return;const n=normalizedCount(count);if(isProvision(kind))provisionCounts(w,'chest')[kind]=n;else if(kind in cookedKey)expeditionKit(w).pantry[kind as keyof ExpeditionKit['pantry']]=n;else w.stock[kind as Resource]=n}
export const weightLabel=(kg:number)=>`${kg.toFixed(1)} kg`;
