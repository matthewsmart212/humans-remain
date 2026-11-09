import {CampThreatTracker,type CampThreat} from './camp-hud';
import {holdBuildingRepair,cancelBuildingRepair} from './building-repair';
import {furnaceRevision} from './camp-furnace';
import {isPickaxe,PICKAXE_GEAR} from './pickaxes';
import {nearbyMineableRock,canMineRock} from './rock-mining';
import {miningFocus,nearbyTreeFocus} from './resource-focus';
import {bowLockTarget,bowTargetName} from './bow-lock';
import {gear,isAxe,isKnife,isSpear,isSword,type GearInventory} from './player-gear';
import {cycleStatus} from './survival-cycle';
import {packLoad,expeditionKit,itemCount} from './expedition-inventory';
import {FOOD_RECIPES} from './food-items';
import {PROVISION_IDS,PROVISIONS,provisionCounts,heldProvision,provisionWouldHelp,canConsumeProvision,consumeProvision,type ProvisionId} from './food-provisions';
import {atStation} from './station-access';
import {COMBAT_DODGE} from './combat-model';
import {HOUND} from './hound-model';
import {BRUTE} from './brute-model';
import {playInteraction,type PlayInteraction} from './play-interaction';
import {timeOf,requestAttack,toggleAxe,dodgePlayer,doAction,type World,type Vec} from './survival-engine';
import {setFieldKitTarget,type FieldKitTarget} from './field-kit-target';
import {selectedQuickItem,QUICK_BAR_FRAME,QUICK_BAR_LAYOUT,type QuickItem} from './quick-items';
import {ACTION_HEX} from './action-hex';
import {mealWouldHelp,survivalWarning} from './survival-needs';
import {heldMeal,cookedCount} from './food-items';
import {FIELD_KIT_TOP} from './field-kit-vitals-layout';
import {warehouseStockForHUD,sameWarehouseStock,type WarehouseStock} from './warehouse-hud';

export type FieldKitIcon='bow'|'torch'|'axe'|'sprint'|'dodge'|'backpack'|'pause'|'settings'|'heart'|'stamina'|'food'|'water'|'chest'|'cook'|'collect'|'punch'|'logs'|'gate'|'close';
export const fieldKitArt=(name:FieldKitIcon|'vitals'|'ring')=>name==='bow'?'/survival/scrap-runner/bow-v1/bow-icon.webp':`/survival/ui-field-kit-v1/${name}.png`;
// Both pieces use identical vertical registration and meet at one source pixel
// boundary. A square portrait joins a slim row of four live vitals.
const badgeHeight=FIELD_KIT_TOP.height,portraitWidth=40,panelWidth=192,sourceWidth=834;
const sourceSplit=200;
const portraitImageWidth=sourceWidth*portraitWidth/sourceSplit;
const panelImageWidth=sourceWidth*panelWidth/(sourceWidth-sourceSplit);
export const fieldKitBadge={
 size:{width:portraitWidth+panelWidth,height:badgeHeight},
 portraitClip:{position:'absolute' as const,left:0,top:0,width:portraitWidth,height:badgeHeight,overflow:'hidden' as const},
 portraitImage:{position:'absolute' as const,left:0,top:0,width:portraitImageWidth,height:badgeHeight},
 panelClip:{position:'absolute' as const,left:portraitWidth,top:0,width:panelWidth,height:badgeHeight,overflow:'hidden' as const},
 panelImage:{position:'absolute' as const,left:panelWidth-panelImageWidth,top:0,width:panelImageWidth,height:badgeHeight},
 grid:{position:'absolute' as const,left:portraitWidth+7,top:10,width:176,height:24},
};
export type FieldKitAction={repair?:boolean;image?:string;owner:World;key:string;label:string;description:string;icon:FieldKitIcon;disabled:boolean;attack:boolean;target?:FieldKitTarget;interaction?:PlayInteraction;perform?:()=>boolean};
export type FieldKitSnapshot={warehouseStock?:WarehouseStock;creativeMode?:boolean;campThreat:CampThreat|null;expeditionRevision?:string;bowTarget?:{key:string;label:string};mealRecoveryRemaining?:number;provisions?:Partial<Record<ProvisionId,number>>;torch:boolean;cycle?:ReturnType<typeof cycleStatus>;weight:number;loadLabel:string;mealCooldown:number;stationPanel?:World['stationPanel'];stationRevision:string;axes:GearInventory;health:number;stamina:number;hunger:number;thirst:number;raw:number;cooked:number;rawRabbit:number;cookedRabbit:number;rawVenison:number;cookedVenison:number;ironOre?:number;ironIngot?:number;stone?:number;logs:number;scrap:number;fuel:number;loads:number;downed:boolean;equipped:boolean;selected:QuickItem;combat:boolean;healthCombat:boolean;dodge:number;notice:string;action:FieldKitAction;repairAction?:FieldKitAction};
export const fieldKitLayout=(width:number,height:number,safe={top:0,right:0,bottom:0,left:0})=>{
 const left=Math.max(12,safe.left+8),right=Math.max(12,safe.right+8),top=Math.max(12,safe.top+8),bottom=Math.max(height<440?12:18,safe.bottom+10);
 return{left,right,top,bottom,controlsBottom:bottom+(width<=height?QUICK_BAR_LAYOUT.height+16:0),quickbar:QUICK_BAR_FRAME.size.width,quickbarHeight:QUICK_BAR_FRAME.size.height,quickbarMaxWidth:Math.max(QUICK_BAR_LAYOUT.closedWidth,width-left-right-(width>height?ACTION_HEX.width+14:0)),vitals:Math.min(278,width-left-right-60),combatVitals:Math.max(0,width-left-right-56),cluster:150,primary:46,secondary:46};
};

/** Per-play-session context. Combat has a short tail so Dodge doesn't flicker
 * away as an enemy briefly leaves reach. No scan of the map's scenery assets. */
export class FieldKitController{
 private threat=new CampThreatTracker();private inspected?:FieldKitTarget;private inspectedUntil=-Infinity;
 private world?:World;private combatUntil=-Infinity;private healthUntil=-Infinity;private locked?:{world:World;action:FieldKitAction;channel:'primary'|'repair'};
 cancel(){this.release();if(this.world)setFieldKitTarget(this.world)}
 reset(){this.cancel();this.threat=new CampThreatTracker();this.inspected=undefined;this.world=undefined;this.combatUntil=-Infinity;this.healthUntil=-Infinity}
 sample(w:World):FieldKitSnapshot{
  if(w!==this.world){this.reset();this.world=w}
  const t=timeOf(w),p=w.player;
  const threat=w.enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<(e.kind==='iron-brute'?BRUTE.hookRange+80:e.kind==='scrap-hound'?HOUND.trigger+80:280))||w.animals.some(a=>a.hp>0&&(a.deer?.retaliation||a.predator?.engaged)&&Math.hypot(a.x-p.x,a.y-p.y)<500);
  if(threat||p.hurtUntil>t)this.combatUntil=t+2;
  const combat=!!w.combatTest&&(t<this.combatUntil||!!w.dodge),downed=!!p.downedUntil||p.hp<=0;
  // Hunting reveals the health meter without hiding Collect/Cook behind the
  // fighting action state. Hold the deadline even after a corpse is removed.
  for(const a of w.animals)if(a.lastHitAt!==undefined&&a.lastHitAt<=t)this.healthUntil=Math.max(this.healthUntil,a.lastHitAt+3.5);
  const healthCombat=combat||t<this.healthUntil;
  if(w.stationPanel&&(combat&&p.equipped!=='repairHammer'||p.hurtUntil>t||downed||!atStation(w))){w.stationPanel=undefined;this.locked=undefined}
  const kit=expeditionKit(w),load=packLoad(w),mealCooldown=Math.max(0,Math.ceil(kit.mealReadyAt-t));
  let action:FieldKitAction,repairAction:FieldKitAction|undefined;
  const lockedTarget=bowLockTarget(w),selected=selectedQuickItem(w),meal=heldMeal(w),provision=heldProvision(w),candidate=(combat&&!w.buildingRepair&&selected!=='repairHammer')||lockedTarget?null:playInteraction(w),interaction=combat&&candidate&&selected!=='repairHammer'&&!candidate.key.startsWith('broken:')&&!candidate.key.startsWith('repairing:')?null:candidate;
  const rock=combat?null:nearbyMineableRock(w),tree=!combat&&isAxe(p.equipped)?nearbyTreeFocus(w):undefined;
  if(w.bruteGrab)action={owner:w,key:'brute-escape',label:'BREAK FREE',description:'Tap repeatedly to escape the Iron Brute',icon:'punch',disabled:downed,attack:true};
  else if(interaction&&(interaction.available!==false||!(rock&&canMineRock(w,rock)||tree)))action={owner:w,key:interaction.key,label:interaction.shortLabel,description:interaction.label,icon:interaction.icon,image:interaction.image,disabled:interaction.disabled||downed,attack:false,target:interaction.target,repair:interaction.repair,interaction};
  else if(provision){
   const f=PROVISIONS[provision],benefits=[f.food?`+${f.food} food`:null,f.water?`+${f.water} water`:null,f.stamina?`+${f.stamina} stamina`:null,f.healOverTime?`+${f.healOverTime} health over ${f.duration}s`:null].filter(Boolean).join(' · ');
   action={owner:w,key:`eat:${provision}:${provisionCounts(w,'bag')[provision]}`,label:'EAT',description:mealCooldown?`Eat again in ${mealCooldown}s`:!provisionWouldHelp(w,provision)?'These food benefits are already full':`Eat ${f.name.toLowerCase()} · ${benefits}`,icon:'food',disabled:!canConsumeProvision(w,provision),attack:false,perform:()=>heldProvision(w)===provision&&consumeProvision(w,provision)};
  }
  else if(meal)action={owner:w,key:`eat:${meal}:${cookedCount(w,meal)}`,label:'EAT',description:mealCooldown?`Eat again in ${mealCooldown}s`:!mealWouldHelp(w)?'Health and food are full':`Eat cooked ${meal==='venison'?'wild meat':meal} · +${FOOD_RECIPES[meal].food} food, +${FOOD_RECIPES[meal].health} health`,icon:'food',disabled:downed||!!mealCooldown||!!w.axeSwing||!!w.dodge||p.hurtUntil>t||!mealWouldHelp(w),attack:false,perform:()=>heldMeal(w)===meal&&doAction(w,'eat',meal)};
  else if(selected==='repairHammer')action={owner:w,key:'repair-hammer-idle',label:'REPAIR',description:'Approach a broken or damaged camp building to repair it',image:'/survival/equipment/repair-hammer-v1.webp',icon:'chest',disabled:true,attack:false};
  else if(selected==='torch')action={owner:w,key:`torch:${w.torchOn}`,label:w.torchOn?'OFF':'LIGHT',description:w.torchOn?'Switch torch off':'Switch torch on',icon:'torch',disabled:downed,attack:false,perform:()=>doAction(w,'torch')};
  else if(selected==='bow')action={owner:w,key:'shoot',label:'SHOOT',description:`Shoot ${lockedTarget?'at locked '+bowTargetName(lockedTarget).toLowerCase():'bow'} · ${gear(w).bag.arrows??0} arrows`,icon:'bow',disabled:downed||!(gear(w).bag.arrows??0),attack:true};
  else if(isPickaxe(p.equipped)||!combat&&selected==='fists'&&rock){const tool=PICKAXE_GEAR[isPickaxe(p.equipped)?p.equipped:'woodenPickaxe'];action={owner:w,key:`mine:${p.equipped}:${rock?.placement.id??'air'}`,label:'MINE',description:rock?`${canMineRock(w,rock)?'Hold to mine':rock.metalOnly?'Metal pickaxe needed':'Pickaxe needed'} · ${rock.metalOnly?'Iron boulder':'Stone boulder'}`:'Face a boulder and hold to mine',icon:'axe',image:tool.image,disabled:downed||!!rock&&!canMineRock(w,rock),attack:true,target:rock?miningFocus(w,rock):undefined}}
  else action={owner:w,key:combat?'attack':isSword(p.equipped)?'sword-thrust':isSpear(p.equipped)?'thrust':isKnife(p.equipped)?'stab':isAxe(p.equipped)?'cut':'punch',label:combat?'ATTACK':isSword(p.equipped)?'THRUST':isSpear(p.equipped)?'THRUST':isKnife(p.equipped)?'STAB':isAxe(p.equipped)?'CUT':'PUNCH',description:combat?'Attack':isSword(p.equipped)?'Short-range sword thrust':isSpear(p.equipped)?'Long-range spear thrust':isKnife(p.equipped)?'Quick close-range knife attack':isAxe(p.equipped)?'Cut with axe':'Punch',icon:isAxe(p.equipped)?'axe':'punch',disabled:downed,attack:true,target:tree};
  if(candidate?.repairAction){const repair=candidate.repairAction;repairAction={owner:w,key:repair.key,label:repair.shortLabel,description:repair.label,icon:repair.icon,image:repair.image,disabled:repair.disabled||downed,attack:false,target:repair.target,repair:repair.repair,interaction:repair}}
  if(!w.bruteGrab&&this.locked?.world===w&&(this.locked.action.attack||w.stationPanel)){const shown=this.locked.action;action={...shown,target:shown.target?.id===action.target?.id?action.target:undefined}}
  if(downed||w.stationPanel)action={...action,target:undefined};
  if(downed||w.stationPanel||w.bruteGrab)repairAction=undefined;
  if(!action.target||t>=this.inspectedUntil||this.inspected?.id!==action.target.id&&(!w.buildingRepair||this.inspected?.buildingId!==action.target.buildingId))this.inspected=undefined;
  if(action.target)action={...action,target:{...action.target,revealed:!!action.target.repairInfo||!!this.inspected||!!w.buildingRepair}};
  if(repairAction?.target)repairAction={...repairAction,target:{...repairAction.target,revealed:true}};
  setFieldKitTarget(w,repairAction?.target??action.target);
  return{creativeMode:!!w.creativeMode,warehouseStock:warehouseStockForHUD(w,action.target,repairAction?.target),campThreat:this.threat.sample(w),expeditionRevision:w.progression?JSON.stringify([w.progression.campLevel,w.progression.restoredBuildings,w.progression.buildingHp,w.progression.trackedObjective,w.progression.ingotsSmelted,w.progression.craftedMetalPickaxe,w.progression.siege.ended,w.progression.briefed,w.progression.repairPart,w.progression.furnaceRestored,w.progression.metalCrafted,w.progression.completed,Math.ceil(w.progression.hqHp),Math.ceil(w.progression.defence),w.progression.siege.spawned]):'',bowTarget:lockedTarget?{key:`${lockedTarget.ref.kind}:${lockedTarget.ref.id}`,label:bowTargetName(lockedTarget)}:undefined,mealRecoveryRemaining:Math.max(0,Math.ceil(w.survival?.mealRecovery?.remaining??0)),provisions:{...provisionCounts(w,'bag')},torch:w.tools.torch,axes:{...gear(w).bag},cycle:cycleStatus(w),weight:Math.round(load.weight*100)/100,loadLabel:load.label,mealCooldown,stationPanel:w.stationPanel,stationRevision:w.stationPanel?JSON.stringify([Math.ceil(w.camp.hearth.fuel*4),w.fire.logs?.length,w.fire.queue?.map(j=>[j.id,Math.ceil(j.remaining*4)]),w.fire.rack,furnaceRevision(w),w.stock,kit.pantry,kit.provisions,w.gear,w.progression]):'',health:Math.max(0,Math.ceil(p.hp)),stamina:Math.max(0,Math.floor(p.stamina)),hunger:Math.ceil(w.hunger),thirst:Math.ceil(w.thirst),raw:w.bag.rawMeat,cooked:w.cooked,rawRabbit:w.bag.rawRabbit||0,cookedRabbit:w.cookedRabbit||0,rawVenison:w.bag.rawVenison||0,cookedVenison:w.cookedVenison||0,ironOre:itemCount(w,'ironOre'),ironIngot:itemCount(w,'ironIngot'),stone:itemCount(w,'stone'),logs:itemCount(w,'pallets'),scrap:itemCount(w,'scrap'),fuel:itemCount(w,'fuel'),loads:w.loads,downed,equipped:isAxe(p.equipped),selected,combat,healthCombat,dodge:Math.max(0,Math.ceil(((w.dodgeReady??0)-t)*10)/10),notice:w.noticeUntil>t?w.notice:w.survivalEnabled?survivalWarning(w):'',action,repairAction};
 }
 /** Capture the action the player actually saw, never substitute a different
  * nearby object or turn a held Cut into Open when walking past a chest. */
 press(w:World,shown:FieldKitAction,channel:'primary'|'repair'='primary'){
  if(this.locked||shown.owner!==w||w.phase==='over'||w.player.downedUntil||w.player.hp<=0)return false;
  const sampled=this.sample(w),current=channel==='repair'?sampled.repairAction:sampled.action;
  if(!current||shown.key!==current.key)return false;
  if(current.target){this.inspected=current.target;this.inspectedUntil=timeOf(w)+4}
  if(current.disabled)return false;
  this.locked={world:w,action:shown,channel};
  if(shown.attack){requestAttack(w);return true}
  const performed=shown.perform?shown.perform():!!shown.interaction?.perform();if(!performed)this.locked=undefined;else if(shown.repair)holdBuildingRepair(w,true);else cancelBuildingRepair(w,false);return performed;
 }
 pressRepair(w:World,shown:FieldKitAction){return this.press(w,shown,'repair')}
 release(channel?:'primary'|'repair'){if(channel&&this.locked?.channel!==channel)return;if(this.world)holdBuildingRepair(this.world,false);this.locked=undefined}
 get holdingRepair(){return !!this.locked?.action.repair&&!!this.world?.buildingRepair?.held}
 get holdingAttack(){return !!this.locked?.action.attack}
}
const sameRepairAction=(a:FieldKitAction|undefined,b:FieldKitAction|undefined)=>a?.owner===b?.owner&&a?.key===b?.key&&a?.label===b?.label&&a?.description===b?.description&&a?.disabled===b?.disabled&&a?.repair===b?.repair&&JSON.stringify(a?.target)===JSON.stringify(b?.target);
export const sameFieldKit=(a:FieldKitSnapshot,b:FieldKitSnapshot)=>
 a.creativeMode===b.creativeMode&&sameWarehouseStock(a.warehouseStock,b.warehouseStock)&&sameRepairAction(a.repairAction,b.repairAction)&&JSON.stringify(a.action.target?.repairInfo)===JSON.stringify(b.action.target?.repairInfo)&&a.campThreat?.title===b.campThreat?.title&&a.campThreat?.approaching===b.campThreat?.approaching&&a.campThreat?.compact===b.campThreat?.compact&&a.campThreat?.detail===b.campThreat?.detail&&a.campThreat?.critical===b.campThreat?.critical&&a.action.target?.revealed===b.action.target?.revealed&&a.action.target?.repairState===b.action.target?.repairState&&a.expeditionRevision===b.expeditionRevision&&a.ironOre===b.ironOre&&a.ironIngot===b.ironIngot&&a.stone===b.stone&&a.axes.repairHammer===b.axes.repairHammer&&a.axes.woodenPickaxe===b.axes.woodenPickaxe&&a.axes.metalPickaxe===b.axes.metalPickaxe&&a.bowTarget?.key===b.bowTarget?.key&&(a.mealRecoveryRemaining??0)===(b.mealRecoveryRemaining??0)&&PROVISION_IDS.every(id=>(a.provisions?.[id]??0)===(b.provisions?.[id]??0))&&a.torch===b.torch&&a.axes.bow===b.axes.bow&&a.axes.arrows===b.axes.arrows&&a.axes.woodenSword===b.axes.woodenSword&&a.axes.metalSword===b.axes.metalSword&&a.axes.woodenSpear===b.axes.woodenSpear&&a.axes.metalSpear===b.axes.metalSpear&&a.axes.woodenKnife===b.axes.woodenKnife&&a.axes.scrapKnife===b.axes.scrapKnife&&a.axes.axe===b.axes.axe&&a.axes.woodenAxe===b.axes.woodenAxe&&a.cycle?.day===b.cycle?.day&&a.cycle?.stage===b.cycle?.stage&&a.cycle?.remaining===b.cycle?.remaining&&a.cycle?.weather===b.cycle?.weather&&a.weight===b.weight&&a.loadLabel===b.loadLabel&&a.mealCooldown===b.mealCooldown&&a.stationPanel===b.stationPanel&&a.stationRevision===b.stationRevision&&a.action.target?.id===b.action.target?.id&&a.action.target?.detail===b.action.target?.detail&&a.action.target?.blocked===b.action.target?.blocked&&a.action.target?.progress===b.action.target?.progress&&a.action.target?.label===b.action.target?.label&&a.action.owner===b.action.owner&&a.action.key===b.action.key&&a.action.label===b.action.label&&a.action.description===b.action.description&&a.action.disabled===b.action.disabled&&a.health===b.health&&a.stamina===b.stamina&&a.hunger===b.hunger&&a.thirst===b.thirst&&a.raw===b.raw&&a.cooked===b.cooked&&a.rawRabbit===b.rawRabbit&&a.cookedRabbit===b.cookedRabbit&&a.rawVenison===b.rawVenison&&a.cookedVenison===b.cookedVenison&&a.logs===b.logs&&a.scrap===b.scrap&&a.fuel===b.fuel&&a.loads===b.loads&&a.downed===b.downed&&a.equipped===b.equipped&&a.selected===b.selected&&a.combat===b.combat&&a.healthCombat===b.healthCombat&&a.dodge===b.dodge&&a.notice===b.notice;
export const dodgeProgress=(remaining:number)=>Math.max(0,Math.min(1,1-remaining/COMBAT_DODGE.cooldown));
export function fieldKitTool(w:World){return toggleAxe(w)}
export function fieldKitDodge(w:World,input:Vec){return dodgePlayer(w,input)}
export function fieldKitEat(w:World){const provision=heldProvision(w);return provision?consumeProvision(w,provision):doAction(w,'eat')}
