import {beginBuildingRepair,holdBuildingRepair,repairProgress,repairAnchor} from './building-repair';
import {selectQuickItem} from './quick-items';
import {hasGear} from './player-gear';
import {REPAIR_HAMMER_IMAGE} from './repair-hammer';
import {buildingRepairStatus,buildingRepairCost,costRows,restoreCampBuilding} from './run-progression';
import {buildingRestored,buildingEstablished,buildingNeedsRepair,buildingHp,buildingMaxHp,CAMP_REPAIRS,campBuildingPlacements,type CampBuildingId} from './camp-restoration';
import {nearbyHeadquarters,openHeadquarters,nearRepairCache,recoverRepairPart,hasMetalworking} from './run-progression';
import {nearbyFurnace,openFurnace,furnaceWorking} from './camp-furnace';
import {nearbySmithy,openSmithy} from './camp-smithy';
import {GEAR} from './player-gear';
import {IRONWORKS_IMAGES} from './ironworks-data';
import {chooseInteractionFocus,type FocusCandidate} from './interaction-focus';
import {getFieldKitTarget,type FieldKitTarget} from './field-kit-target';
import {nearbyForageTargets,pickForage,canForage} from './foraging';
import {FORAGE_BY_ID} from './forage-art';
import {PROVISIONS} from './food-provisions-data';
import {timeOf,pickupTarget,campAction,type World} from './survival-engine';
import {nearbyWarehouse} from './warehouse';
import {layoutViews} from './layout-views';
import {placementBounds} from './world-layout';
import {nearbyChest} from './station-access';
export {nearbyChest} from './station-access';
import {nearbyGate,toggleGate,gateActionLabel} from './camp-gates';
import {chestIsOpen,toggleChest} from './chest-animation';
import {campInteraction,performCampInteraction} from './studio-play';
import {foodName} from './food-items';
import {nearPotatoPatch,potatoPatchAction} from './potato-farming';

export type PlayInteraction={repairAction?:PlayInteraction;repair?:boolean;image?:string;key:string;label:string;shortLabel:string;icon:'gate'|'chest'|'collect'|'cook'|'water';disabled:boolean;available?:boolean;target?:FieldKitTarget;perform:()=>unknown};

const materialName=(row:{name:string;needed:number})=>row.needed===1?({Logs:'log','Iron ingots':'iron ingot'}[row.name]??row.name.toLowerCase()):row.name.toLowerCase();
/** Same material/condition presentation before, during and after a hold. */
export function repairTargetInfo(world:World,id:import('./camp-restoration').CampBuildingId):NonNullable<FieldKitTarget['repairInfo']>{
 const status=buildingRepairStatus(world,id),job=world.buildingRepair;
 const health=Math.ceil(buildingHp(world,id)/buildingMaxHp(world,id)*100);
 const condition=!buildingRestored(world,id)?'Broken':id==='headquarters'&&health===100?'Defences damaged':`Damaged · ${health}%`;
 const hint=world.creativeMode?'Tap to repair instantly':id==='headquarters'&&!buildingEstablished(world,id)?'Repair in headquarters menu':job?.id===id?(job.held?'Materials used on completion':job.worked>0?'Released · Progress falling':'Hold to repair'):status==='Ready'?(id==='headquarters'?'Tap to repair':'Hold to repair'):status==='Need repair materials'?'More materials needed':status;
 return {condition,materials:costRows(world,buildingRepairCost(world,id)),hint};
}
/** A repair is its own action, so equipping a hammer never takes away a usable station. */
function repairInteraction(world:World,id:CampBuildingId,placementId:string):PlayInteraction|null{
 const site=repairAnchor(world,id);if(!site||Math.hypot(world.player.x-site.x,world.player.y-site.y)>=145)return null;
 const job=world.buildingRepair?.id===id?world.buildingRepair:undefined,status=buildingRepairStatus(world,id);
 if(job){
  const cost=costRows(world,job.cost).map(row=>`${row.needed} ${materialName(row)}`).join(' · ');
  return {key:'repairing:'+id,repair:true,label:'Hold to repair '+CAMP_REPAIRS[id].name.toLowerCase()+' · Release to let progress fall',shortLabel:job.held?'HOLD':'REPAIR',icon:'chest',image:REPAIR_HAMMER_IMAGE,disabled:status!=='Ready',target:{id:'repairing:'+id,buildingId:id,x:site.x,y:site.y,label:CAMP_REPAIRS[id].name,repairInfo:repairTargetInfo(world,id),detail:job.held?'Cost: '+cost:job.worked>0?'Progress falling':'Cost: '+cost,blocked:status!=='Ready',repairState:job.held?'holding':job.worked>0?'falling':'ready',progress:Math.floor(repairProgress(world)*100)/100,progressLabel:'Repair progress'},perform:()=>world.buildingRepair?.id===id&&buildingRepairStatus(world,id)==='Ready'&&holdBuildingRepair(world,true)};
 }
 const needsHQ=!world.creativeMode&&id!=='headquarters'&&!buildingRestored(world,'headquarters'),equip=status==='Equip repair hammer',instant=id==='headquarters'||!!world.creativeMode;
 const rows=costRows(world,buildingRepairCost(world,id));
 const materials=rows.length===1?`Needs ${rows[0].needed} ${materialName(rows[0])} · Have ${rows[0].have}`:rows.map(row=>`${row.have}/${row.needed} ${row.name.toLowerCase()}`).join(' · ');
 const detail=needsHQ?'Requires Camp level 1':status==='Requires Camp level 2'?status:materials+(status==='Repair hammer needed'?' · Hammer needed':'');
 return {key:'broken:'+placementId+':'+status,repair:!instant&&!needsHQ&&!equip&&status==='Ready',label:`${equip?'Equip hammer to repair':instant?'Tap to repair':'Hold to repair'} ${CAMP_REPAIRS[id].name.toLowerCase()} · ${detail}`,shortLabel:needsHQ?'INSPECT':equip?'EQUIP':'REPAIR',icon:'chest',image:REPAIR_HAMMER_IMAGE,disabled:needsHQ||!equip&&status!=='Ready',target:{id:'broken:'+placementId,buildingId:id,x:site.x,y:site.y,label:CAMP_REPAIRS[id].name,repairInfo:repairTargetInfo(world,id),detail,blocked:needsHQ||!equip&&status!=='Ready'},perform:()=>{
  if(needsHQ)return false;
  if(equip)return hasGear(world,'repairHammer')&&selectQuickItem(world,'repairHammer');
  return instant?restoreCampBuilding(world,id):beginBuildingRepair(world,id);
 }};
}
export function playInteraction(world:World):PlayInteraction|null{
 if(world.phase==='over'||world.player.hp<=0||world.player.downedUntil||world.stationPanel)return null;
 if(world.buildingRepair&&!buildingRestored(world,world.buildingRepair.id))return repairInteraction(world,world.buildingRepair.id,world.buildingRepair.id);
 const hammer=world.player.equipped==='repairHammer';
 const candidates:FocusCandidate<PlayInteraction>[]=[],add=(value:PlayInteraction)=>{
  const target=value.target!,available=value.available??!value.disabled;candidates.push({id:target.id!,x:target.x,y:target.y,available,value:{...value,available}});
 };
 const headquarters=nearbyHeadquarters(world);if(headquarters)add({key:'headquarters',label:buildingRestored(world,'headquarters')?'Open headquarters plans':'Repair headquarters',shortLabel:buildingRestored(world,'headquarters')?'PLANS':'REPAIR',icon:'chest',disabled:false,target:{id:'headquarters',buildingId:'headquarters',x:headquarters.x,y:headquarters.y,label:'Headquarters',detail:buildingRestored(world,'headquarters')?'Camp plans & blueprints':'Repair first · Unlock Camp level 1'},perform:()=>openHeadquarters(world)});
 if(nearRepairCache(world)&&!world.progression!.repairPart){const p=world.progression!;add({key:'furnace-bellows',label:'Recover furnace bellows',shortLabel:'RECOVER',icon:'collect',disabled:false,target:{id:'furnace-bellows',...p.cache,label:'Salvage cache',detail:'Furnace bellows'},perform:()=>recoverRepairPart(world)})}
 const gate=nearbyGate(world);if(gate){const label=gateActionLabel(world,gate.id);add({key:`gate:${gate.id}:${label}`,label,shortLabel:label.toLowerCase().includes('close')?'CLOSE':'OPEN',icon:'gate',disabled:false,target:{id:`gate:${gate.id}`,x:gate.x,y:gate.y,label:'Camp gate'},perform:()=>nearbyGate(world)?.id===gate.id&&gateActionLabel(world,gate.id)===label&&toggleGate(world,gate.id)})}
 const furnace=nearbyFurnace(world);if(furnace&&buildingRestored(world,'furnace')){const f=world.ironworks?.stations[furnace.placement.id];add({key:`furnace:${furnace.placement.id}`,label:hasMetalworking(world)?'Use camp furnace · Smelt iron':'Inspect damaged furnace',shortLabel:'FURNACE',icon:'cook',image:IRONWORKS_IMAGES.ironIngot,disabled:false,target:{id:`furnace:${furnace.placement.id}`,buildingId:'furnace',x:furnace.x,y:furnace.y,label:hasMetalworking(world)?'Camp furnace':'Damaged furnace',detail:!hasMetalworking(world)?'Restore metalworking':f?.ready?`${f.ready} ingots ready`:furnaceWorking(f)?'Smelting':f?.queue.length&&!f.fuel?'Add wood':'Smelt iron'},perform:()=>openFurnace(world,furnace.placement.id)})}
 const smithy=nearbySmithy(world);if(smithy&&buildingRestored(world,'workshop'))add({key:`smithy:${smithy.placement.id}`,label:'Use camp smithy · Craft tools and weapons',shortLabel:'CRAFT',icon:'chest',image:GEAR.axe.image,disabled:false,target:{id:`smithy:${smithy.placement.id}`,buildingId:'workshop',x:smithy.x,y:smithy.y,label:'Camp smithy',detail:'Tools & weapons'},perform:()=>openSmithy(world,smithy.placement.id)});
 const warehouse=nearbyWarehouse(world);if(warehouse&&buildingRestored(world,'warehouse'))add({key:`warehouse:${warehouse.placement.id}`,label:'Open warehouse',shortLabel:'STORE',icon:'chest',disabled:false,target:{id:`warehouse:${warehouse.placement.id}`,buildingId:'warehouse',x:warehouse.x,y:warehouse.y,label:'Warehouse',detail:'Wood & scrap storage'},perform:()=>{if(nearbyWarehouse(world)?.placement.id!==warehouse.placement.id)return false;world.stationPanel='warehouse';return true}});
 const chest=nearbyChest(world);if(chest){const open=chestIsOpen(world,chest),p=layoutViews(world.layout).chests.find(p=>p.id===chest)!;add({key:`chest:${chest}:${open}`,label:'Open camp storage',shortLabel:'STORAGE',icon:'chest',disabled:false,target:{id:`chest:${chest}`,x:p.x,y:p.y,label:'Supply chest',detail:'Equipment & supplies'},perform:()=>{if(nearbyChest(world)!==chest||chestIsOpen(world,chest)!==open)return false;if(!open)toggleChest(world,chest);world.stationPanel='storage';return true}})}
 const action=campInteraction(world),pickup=action?.action==='pickup'?pickupTarget(world):null;
 if(action){
  const station=action.action==='drink'?world.camp.well:action.action==='deposit'?world.camp.storage:world.camp.hearth;
  const name=pickup?(pickup.appearance==='logs'||pickup.kind==='pallets'?'Fallen logs':foodName(pickup.kind)??(pickup.kind==='ironOre'?'Iron ore':pickup.kind==='ironIngot'?'Iron ingot':pickup.kind==='stone'?'Stone':pickup.kind==='fuel'?'Fuel':'Metal scrap')):action.action==='drink'?'Camp well':action.action==='deposit'?'Supply chest':'Campfire';
  const detail=pickup?(action.disabled?'Backpack full':`×${pickup.amount}`):action.action==='drink'?(action.disabled?'Fully hydrated':'Restore water'):action.action==='deposit'?'Equipment & supplies':world.camp.hearth.fuel<=0?'Add wood':world.fire.rack?.length?`${world.fire.rack.length} meals ready`:`Fuel ${Math.floor(world.camp.hearth.fuel/60)}:${String(Math.floor(world.camp.hearth.fuel)%60).padStart(2,'0')}`;
  add({...action,key:pickup?`pickup:${pickup.id}`:`camp:${action.action}`,shortLabel:action.action==='pickup'?'COLLECT':action.action==='drink'?'DRINK':action.action==='deposit'?'STORAGE':'FIRE',icon:action.action==='pickup'?'collect':action.action==='drink'?'water':action.action==='deposit'?'chest':'cook',target:{id:pickup?`pickup:${pickup.id}`:`camp:${action.action}`,buildingId:action.action==='drink'?'well':action.action==='cook'?'fire':undefined,x:pickup?.x??station.x,y:pickup?.y??station.y,label:name,detail,blocked:action.disabled,...(pickup?{pickupId:pickup.id}:{})},perform:()=>{if(pickup?pickupTarget(world)?.id!==pickup.id:campAction(world)!==action.action)return false;return performCampInteraction(world)}});
 }
 for(const forage of nearbyForageTargets(world)){
  const {placement:p,remaining,fits,root}=forage;if(!remaining)continue;
  const art=FORAGE_BY_ID.get(p.assetId)!,b=placementBounds(p),noun=art.kind==='berries'?'berry portion':art.kind==='potato'?'potato':'apple',cooling=timeOf(world)<(world.forageReadyAt??0);
  add({key:`forage:${p.id}:${remaining}`,label:!fits?'Backpack full · Drop or store supplies':`Pick 1 ${noun} · ${remaining} left`,shortLabel:!fits?'PACK FULL':'PICK 1',icon:'collect',image:PROVISIONS[art.kind].image,available:!!fits,disabled:!fits||cooling||!canForage(world),target:{id:`forage:${p.id}`,...root,forageId:p.id,label:art.kind==='berries'?'Wild berries':art.kind==='potato'?'Wild potato plant':'Apple tree',detail:fits?`${remaining} left`:'Backpack full',blocked:!fits,ground:{x:root.x,y:root.y-3,rx:b.width*(art.kind==='berries'?.46:art.kind==='potato'?.32:.16),ry:b.width*(art.kind==='berries'?.12:art.kind==='potato'?.09:.05)}},perform:()=>pickForage(world,p.id)});
 }
 const patch=nearPotatoPatch(world),patchAction=patch?potatoPatchAction(world):null;
 if(patch&&patchAction)add({
  key:`potato:${patchAction.kind}:${world.potatoPatch?.plantedAt.length??0}:${world.potatoPatch?.tier??1}`,
  label:patchAction.label,shortLabel:patchAction.shortLabel,icon:patchAction.kind==='harvest'?'collect':'chest',
  image:patchAction.kind==='harvest'?PROVISIONS.potato.image:undefined,
  disabled:patchAction.disabled,
  target:{id:'potato-patch',buildingId:'garden',x:patch.x,y:patch.y,label:'Potato patch',detail:patchAction.detail,blocked:patchAction.disabled},
  perform:patchAction.perform,
 });
 // Usable buildings keep their normal action. An in-progress companion keeps
 // its job even if a pickup temporarily becomes the primary interaction.
 let activeRepair:PlayInteraction|undefined;
 for(const {placement:p,id} of campBuildingPlacements(world.layout)){
  if(!buildingNeedsRepair(world,id)||id==='headquarters'&&!buildingEstablished(world,id)||buildingRestored(world,id)&&!hammer)continue;
  const repair=repairInteraction(world,id,p.id);if(!repair)continue;
  const normal=buildingRestored(world,id)?candidates.find(c=>c.value.target?.buildingId===id):undefined;
  if(normal){
   const available=normal.available||!repair.disabled;
   normal.available=available;
   normal.value={...normal.value,available,repairAction:{...repair,target:{...repair.target!,id:normal.value.target!.id}}};
  }else add(repair);
  if(world.buildingRepair?.id===id&&buildingRestored(world,id))activeRepair=normal?.value.repairAction??repair;
 }
 // A usable station's active repair must not jump into the primary hex when
 // its normal action is temporarily masked by nearby loot. Keep other primary
 // choices, and retain the captured repair target identity beside them.
 const primaryCandidates=activeRepair?candidates.filter(c=>c.value.key!==activeRepair.key):candidates;
 const focused=chooseInteractionFocus(world,primaryCandidates.length?primaryCandidates:candidates);
 if(focused&&activeRepair&&focused.key!==activeRepair.key){
  const previous=getFieldKitTarget(world),target=activeRepair.target!;
  focused.repairAction={...activeRepair,target:{...target,id:previous?.buildingId===target.buildingId?(previous?.id??target.id):target.id}};
 }
 const id=focused?.target?.buildingId;
 if(focused?.target&&id&&buildingNeedsRepair(world,id))focused.target={...focused.target,repairInfo:repairTargetInfo(world,id)};
 return focused;
}
