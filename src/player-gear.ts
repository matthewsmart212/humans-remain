import type {World} from './survival-engine';
import {nearbyChest} from './station-access';
import {placementBounds,placementPoint} from './world-layout';
import {packWeight,PACK_CAPACITY} from './expedition-inventory';
import {PICKAXE_GEAR,isPickaxe,type PickaxeKind} from './pickaxes';
export type AxeKind='woodenAxe'|'axe';
export type KnifeKind='woodenKnife'|'scrapKnife';
export type SpearKind='woodenSpear'|'metalSpear';
export type SwordKind='woodenSword'|'metalSword';
export type GearKind=PickaxeKind|AxeKind|KnifeKind|SpearKind|SwordKind|'repairHammer'|'bow'|'arrows';
export type GearInventory=Record<AxeKind,number>&Partial<Record<PickaxeKind|KnifeKind|SpearKind|SwordKind|'repairHammer'|'bow'|'arrows',number>>;
export type PlayerGear={bag:GearInventory;chest:GearInventory};
export const KNIFE_GEAR={woodenKnife:{name:'Wooden knife',weight:.3,image:'/survival/equipment/wooden-knife-v1.png',damage:18},scrapKnife:{name:'Scrap knife',weight:.5,image:'/survival/equipment/scrap-knife-v1.png',damage:28}} as const;
export const KNIFE_COOLDOWN=.30;
export const isKnife=(id:unknown):id is KnifeKind=>id==='woodenKnife'||id==='scrapKnife';
export const SPEAR_GEAR={woodenSpear:{name:'Wooden spear',weight:1.1,image:'/survival/equipment/wooden-spear-v1.png',damage:24},metalSpear:{name:'Metal spear',weight:1.6,image:'/survival/equipment/metal-spear-v1.png',damage:38}} as const;
export const isSpear=(id:unknown):id is SpearKind=>id==='woodenSpear'||id==='metalSpear';
export const SWORD_GEAR={woodenSword:{name:'Wooden sword',weight:1.4,image:'/survival/equipment/wooden-sword-v1.png',damage:26},metalSword:{name:'Metal sword',weight:2,image:'/survival/equipment/metal-sword-v1.png',damage:42}} as const;
export const isSword=(id:unknown):id is SwordKind=>id==='woodenSword'||id==='metalSword';
export const AXE_GEAR={woodenAxe:{name:'Wooden axe',weight:1.2,image:'/survival/equipment/wooden-axe-v1.webp',damage:20,returnDamage:24},axe:{name:'Camp axe',weight:2,image:'/survival/ui-field-kit-v1/axe.png',damage:40,returnDamage:48}} as const;
export const isAxe=(id:unknown):id is AxeKind=>id==='axe'||id==='woodenAxe';
export const BOW_GEAR={bow:{name:'Makeshift bow',weight:1,image:'/survival/scrap-runner/bow-v1/bow-icon.webp',damage:34},arrows:{name:'Arrows',weight:.025,image:'/survival/scrap-runner/bow-v1/arrows-icon.webp',damage:0}} as const;
export const isBow=(id:unknown):id is 'bow'=>id==='bow';
export const GEAR={repairHammer:{name:'Repair hammer',weight:1.2,image:'/survival/equipment/repair-hammer-v1.webp',damage:0},...PICKAXE_GEAR,...AXE_GEAR,...KNIFE_GEAR,...SPEAR_GEAR,...SWORD_GEAR,...BOW_GEAR};
export const isGear=(id:unknown):id is GearKind=>id==='repairHammer'||isPickaxe(id)||isAxe(id)||isKnife(id)||isSpear(id)||isSword(id)||isBow(id)||id==='arrows';
export const newGear=():PlayerGear=>({bag:{repairHammer:1,woodenPickaxe:0,metalPickaxe:0,woodenAxe:0,axe:0,woodenKnife:0,scrapKnife:0,woodenSpear:1,metalSpear:1,woodenSword:1,metalSword:1,bow:1,arrows:40},chest:{repairHammer:0,woodenPickaxe:1,metalPickaxe:1,woodenAxe:1,axe:1,woodenKnife:1,scrapKnife:1,woodenSpear:0,metalSpear:0,woodenSword:0,metalSword:0,bow:0,arrows:120}});
export function gear(w:World){const g=w.gear??=newGear();for(const side of ['bag','chest'] as const)for(const id of ['woodenPickaxe','metalPickaxe'] as const)if(g[side][id]===undefined)g[side][id]=!w.progression&&side==='chest'?1:0;return g}
export const hasGear=(w:World,id:GearKind)=>(gear(w).bag[id]??0)>0;
export const hasAxe=(w:World,id:AxeKind)=>hasGear(w,id);
export const gearWeight=(w:World)=>Object.entries(gear(w).bag).reduce((n,[id,count])=>n+GEAR[id as GearKind].weight*(count??0),0);
/** Gear is kept in the headquarters chest; ordinary supplies remain shared. */
export function atHeadquartersChest(w:World){
 const id=nearbyChest(w);if(!id)return false;
 const chest=w.layout?.items.find(p=>p.id===id);if(!chest||chest.assetId!=='art_hq_storage_chest')return false;
 const hq=w.layout?.items.find(p=>p.id==='4d468bcc-83b9-4bb7-af01-da4b69a67d9a');
 if(!hq)return true;
 const b=placementBounds(hq),[x,y]=placementPoint(hq,chest.x,chest.y,true);
 return x>b.x&&x<b.x+b.width&&y>b.y&&y<b.y+b.height;
}
export function transferGear(w:World,id:GearKind,take:boolean,quantity=1){
 if(!atHeadquartersChest(w)||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.axeSwing||w.spearThrust||w.swordThrust||w.bowShot||w.dodge)return false;
 const g=gear(w),from=take?g.chest:g.bag,to=take?g.bag:g.chest;
 const amount=id==='arrows'?quantity:1;
 if(!Number.isSafeInteger(amount)||amount<1||(from[id]??0)<amount||take&&packWeight(w)+GEAR[id].weight*amount>PACK_CAPACITY+1e-8)return false;
 from[id]=(from[id]??0)-amount;to[id]=(to[id]??0)+amount;
 if(!take&&w.player.equipped===id&&!from[id])w.player.equipped=null;
 return true;
}
export function equipGear(w:World,id:GearKind){
 if(id==='arrows'||!hasGear(w,id)||w.stationPanel||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.axeSwing||w.bowShot||w.dodge||w.tick/60<w.attackUntil)return false;
 w.attackQueuedUntil=undefined;w.player.equipped=w.player.equipped===id?null:id;return true;
}

export const transferAxe=transferGear;
export const equipAxe=equipGear;

/** Give older expeditions a mining tool once; preserve owned/stored tools and weapons. */
export function grantStarterPickaxe(w:World){
 if(!w.progression||w.progression.starterPickaxe)return;
 const g=gear(w);if(!(['bag','chest'] as const).some(side=>(g[side].woodenPickaxe??0)>0||(g[side].metalPickaxe??0)>0))g.bag.woodenPickaxe=1;
 w.progression.starterPickaxe=true;
}
