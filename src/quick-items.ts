import {PICKAXE_GEAR} from './pickaxes';
import {hasGear,isGear,AXE_GEAR,KNIFE_GEAR,SPEAR_GEAR,SWORD_GEAR,type GearInventory} from './player-gear';
import {BONFIRE_FOOD_IMAGES} from './bonfire-food-art';
import {RABBIT_FOOD_IMAGES,VENISON_FOOD_IMAGES} from './food-items';
import {clearAttackQueue,timeOf,type World} from './survival-engine';
import {PROVISION_IDS,PROVISIONS,isProvision,type ProvisionId} from './food-provisions-data';
import {provisionCounts} from './expedition-inventory';
import {ACTION_HEX} from './action-hex';

export type QuickItem='woodenPickaxe'|'metalPickaxe'|ProvisionId|'repairHammer'|'bow'|'woodenSword'|'metalSword'|'woodenSpear'|'metalSpear'|'woodenKnife'|'scrapKnife'|'torch'|'fists'|'woodenAxe'|'axe'|'meal'|'rabbitMeal'|'venisonMeal';
export const QUICK_ITEMS:readonly {id:QuickItem;label:string;image:string}[]=[
 {id:'fists',label:'Fists',image:'/survival/ui-field-kit-v1/punch.png'},
 {id:'repairHammer',label:'Hammer',image:'/survival/equipment/repair-hammer-v1.webp'},
 {id:'torch',label:'Torch',image:'/survival/ui-field-kit-v1/torch.png'},
 {id:'bow',label:'Bow',image:'/survival/scrap-runner/bow-v1/bow-icon.webp'},
 {id:'woodenAxe',label:'Wood axe',image:AXE_GEAR.woodenAxe.image},
 {id:'axe',label:'Axe',image:'/survival/ui-field-kit-v1/axe.png'},
 {id:'woodenPickaxe',label:'Wood pick',image:PICKAXE_GEAR.woodenPickaxe.image},
 {id:'metalPickaxe',label:'Metal pick',image:PICKAXE_GEAR.metalPickaxe.image},
 {id:'woodenKnife',label:'Wood knife',image:KNIFE_GEAR.woodenKnife.image},
 {id:'scrapKnife',label:'Scrap knife',image:KNIFE_GEAR.scrapKnife.image},
 {id:'woodenSpear',label:'Wood spear',image:SPEAR_GEAR.woodenSpear.image},
 {id:'metalSpear',label:'Metal spear',image:SPEAR_GEAR.metalSpear.image},
 {id:'woodenSword',label:'Wood sword',image:SWORD_GEAR.woodenSword.image},
 {id:'metalSword',label:'Metal sword',image:SWORD_GEAR.metalSword.image},
 {id:'meal',label:'Chicken',image:BONFIRE_FOOD_IMAGES.bonfireCooked},
 {id:'rabbitMeal',label:'Rabbit',image:RABBIT_FOOD_IMAGES.rabbitCooked},
 {id:'venisonMeal',label:'Meat',image:VENISON_FOOD_IMAGES.venisonCooked},
 ...PROVISION_IDS.map(id=>({id,label:id==='beans'?'Beans':id==='energyBar'?'Energy bar':id==='huntersMeal'?"Hunter’s meal":PROVISIONS[id].name,image:PROVISIONS[id].image})),
];
export const QUICK_EMPTY_SLOTS=0;
export type QuickBarInventory={torch?:boolean;cooked:number;cookedRabbit?:number;cookedVenison?:number;provisions?:Partial<Record<ProvisionId,number>>;axes?:GearInventory};
export type QuickBarProps=QuickBarInventory&{selected:QuickItem;disabled:boolean;onSelect:(id:QuickItem)=>void;onExpandedChange?:(expanded:boolean)=>void};
// One scale for both primary controls; opening the selector never shrinks items.
export const QUICK_BAR_LAYOUT={height:ACTION_HEX.cells.primary.height,closedWidth:ACTION_HEX.cells.primary.width,slotWidth:64,toggleWidth:40,padding:6,gap:4,iconSize:42,closedIconSize:34*1.2} as const;
export function quickBarWidth(slots:number){const l=QUICK_BAR_LAYOUT;return l.padding*2+Math.max(1,slots)*l.slotWidth+l.toggleWidth+Math.max(1,slots)*l.gap}
// Fixed end caps retain the hand-painted corners as the centre opens sideways.
export const QUICK_BAR_SLICES=[
 {id:'left',from:790,to:834,width:13,flip:true},
 {id:'centre',from:210,to:790},
 {id:'right',from:790,to:834,width:13},
] as const;
export function quickBarSliceImage(part:{from:number;to:number}){return{position:'absolute' as const,left:`${-part.from/(part.to-part.from)*100}%` as `${number}%`,top:0,width:`${834/(part.to-part.from)*100}%` as `${number}%`,height:'100%' as const}}
// Reuse the status panel pixels. The mirrored end cap closes the portrait
// join without adding another texture or stretching a character into the bar.
const barWidth=QUICK_BAR_LAYOUT.closedWidth,barHeight=QUICK_BAR_LAYOUT.height,panelImageWidth=834*barWidth/(834-200),edgeImageWidth=834*8/30;
export const QUICK_BAR_FRAME={
 size:{width:barWidth,height:barHeight},
 panelClip:{position:'absolute' as const,left:0,top:0,width:barWidth,height:barHeight,overflow:'hidden' as const},
 panelImage:{position:'absolute' as const,left:barWidth-panelImageWidth,top:0,width:panelImageWidth,height:barHeight},
 edgeClip:{position:'absolute' as const,left:0,top:0,width:8,height:barHeight,overflow:'hidden' as const},
 edgeImage:{position:'absolute' as const,left:8-edgeImageWidth,top:0,width:edgeImageWidth,height:barHeight},
};
export const quickItemCount=(id:QuickItem,cooked:number,rabbit=0,venison=0,arrows?:number,provisions:Partial<Record<ProvisionId,number>>={})=>isProvision(id)?provisions[id]??0:id==='bow'?arrows:id==='meal'?cooked:id==='rabbitMeal'?rabbit:id==='venisonMeal'?venison:undefined;
export function availableQuickItems({torch=false,cooked,cookedRabbit=0,cookedVenison=0,provisions={},axes={axe:0,woodenAxe:0}}:QuickBarInventory){return QUICK_ITEMS.filter(item=>(item.id!=='torch'||torch)&&quickItemCount(item.id,cooked,cookedRabbit,cookedVenison,undefined,provisions)!==0&&(!isGear(item.id)||(axes[item.id]??0)>0))}
export function selectedQuickItem(w:World):QuickItem{if(isProvision(w.player.equipped)&&provisionCounts(w,'bag')[w.player.equipped]>0)return w.player.equipped;return w.player.equipped==='torch'&&w.tools.torch?'torch':isGear(w.player.equipped)&&hasGear(w,w.player.equipped)?w.player.equipped:w.player.equipped==='meal'&&w.cooked>0?'meal':w.player.equipped==='rabbitMeal'&&w.cookedRabbit>0?'rabbitMeal':w.player.equipped==='venisonMeal'&&w.cookedVenison>0?'venisonMeal':'fists'}
export function selectQuickItem(w:World,item:QuickItem){
 if(w.stationPanel||w.phase==='over'||w.player.hp<=0||w.player.downedUntil||w.dodge||w.axeSwing||w.bowShot||timeOf(w)<w.attackUntil)return false;
 if(isProvision(item)&&provisionCounts(w,'bag')[item]<=0)return false;
 if(item==='torch'&&!w.tools.torch)return false;
 if(isGear(item)&&!hasGear(w,item))return false;
 if(item==='meal'&&w.cooked<=0)return false;
 if(item==='venisonMeal'&&!(w.cookedVenison>0))return false;
 if(item==='rabbitMeal'&&!(w.cookedRabbit>0))return false;
 clearAttackQueue(w);w.player.equipped=item==='fists'?null:item;if(item==='torch')w.torchOn=true;
 return true;
}
