import {buildingRestored} from './camp-restoration';
import {stepFurnaces} from './camp-furnace';
import {isProvision,type ProvisionId} from './food-provisions-data';
import {consumeProvision,heldProvision} from './food-provisions';
import {SWORD_THRUST,type SwordThrust} from './sword-combat';
import {bowLockTarget,stepBowLock,bowLockedAim} from './bow-lock';
import {BOW_SHOT,arrowCircleHit,type BowShot,type BowArrow} from './bow-combat';
import {SPEAR_THRUST,type SpearThrust} from './spear-combat';
import {stepWaypoint} from './waypoint';
import {addInventory,canCarryCount,packLoad} from './expedition-inventory';
import {feedFire,queueFood,collectFood,stepKitchen,eatMeal} from './camp-kitchen';
import {isCookedFood,totalCooked,nextRawFood,foodName,type FoodSpecies} from './food-items';
import {riverWaterBlocked} from './river-collision';
import {addCarriedPickup,removeCarried} from './bag-loads';
import {SURVIVAL_BALANCE,canSprint,spendSprintStamina,stepSurvivalNeeds,mealWouldHelp,type SurvivalCondition} from './survival-needs';
import {newGear,gear,isAxe,hasAxe,equipAxe,isKnife,isSpear,hasGear,KNIFE_GEAR,KNIFE_COOLDOWN,SPEAR_GEAR,isSword,SWORD_GEAR} from './player-gear';
import {isPickaxe} from './pickaxes';
import {mineRock,nearbyMineableRock,canMineRock} from './rock-mining';
import {chopTree} from './tree-chopping';
import {getFieldKitTarget} from './field-kit-target';
import {chooseInteractionFocus} from './interaction-focus';
import {outdoorTerrainReadyAt} from './outdoor-terrain';
import {usesPaintedHomeTerrain} from './terrain-art';
import {gateBlockers,gatesBlocked,stepGates} from './camp-gates';
import {campBounds,originalCampBounds,worldBounds,type WorldBounds} from './world-bounds';
import {stepPuddles} from './puddle-motion';
import {stepFoliage} from './foliage-motion';
import {sceneBlocked} from './scene-collision';
import {placementBodies,layoutBlocked,layoutColliderHits,layoutCollisionKey,roleItems,type WorldLayout} from './world-layout';
import {MAP_WIDTH,MAP_HEIGHT,BASE_POINT,SPAWN_POINT,CAMP_LAMPS,SHUTTER_POINT,SHUTTER_CONTROL,BARRIER_POINT,CRUSHER_POINT,CRUSHER_CONTROL,OBSTACLES,LOOT_POINTS,ENTRANCES,EMERGENCY_FUEL,FURNITURE,BREAKABLE_POINTS,WELL_POINT,FIRE_POINT,ANIMAL_POINTS} from './factory-map';
import {hitCollider,staticBlocked,type Collider} from './camp-collision';
import {createCamp,stationFront,stationBody,STATION_IDS,HEARTH_CAPACITY,type CampState} from './camp-stations';
import {COMBAT_DODGE,WALKER_ATTACK,WALKER_ARMOUR,angleDelta,type WalkerMotion,type CombatStats} from './combat-model';
import {SKITTER_LASER} from './skitter-model';
import {BRUTE} from './brute-model';
import {HOUND} from './hound-model';
import {hitHound} from './hound-ai';
import {combatEnemyBody} from './enemy-types';
import {bruteArmour,hitBrutePoise,validateBruteGrab,struggleBruteGrab,releaseBruteGrab} from './brute-control';
import {AXE_SWING,AXE_CHAIN,axeProfile,axeMoveScale,type AxeSwingState,type AxeCut} from './axe-combat';
export {AXE_SWING} from './axe-combat';
// Pure simulation. No React, canvas or network dependency: an authoritative host can own this state later.
export const STEP=1/60,DAY_SECONDS=90,NIGHT_SECONDS=50;
export const BASE=BASE_POINT,SHUTTER=SHUTTER_POINT,BARRICADE=BARRIER_POINT,CRUSHER=CRUSHER_POINT;
export type Vec={x:number;y:number};
export type Direction='down'|'right'|'up'|'left'|'down-right'|'down-left'|'up-right'|'up-left';
export const DIRECTION_ANGLES:Record<Direction,number>={right:0,'down-right':Math.PI/4,down:Math.PI/2,'down-left':Math.PI*3/4,left:Math.PI,'up-left':-Math.PI*3/4,up:-Math.PI/2,'up-right':-Math.PI/4};
export function facing(x:number,y:number):Direction{return (['right','down-right','down','down-left','left','up-left','up','up-right'] as Direction[])[(Math.round(Math.atan2(y,x)/(Math.PI/4))+8)%8]}
export type Animal=Vec&{spawnedForTest?:boolean;wildlife?:import('./wildlife-population').WildlifeMember;predator?:import('./camp-predators').PredatorMotion;deer?:import('./camp-deer').DeerMotion;rabbit?:import('./camp-rabbits').RabbitMotion;chicken?:import('./camp-chickens').ChickenMotion;id:number;home:number;hp:number;maxHp?:number;healthFrom?:number;lastHitAt?:number;moving:boolean;right:boolean;flashUntil:number};
export type Resource='ironOre'|'ironIngot'|'stone'|'scrap'|'fuel'|'pallets'|'rawMeat'|'rawRabbit'|'rawVenison';
export type Stock=Record<Resource,number>;
export type Loot=Vec&{salvageVariant?:0|1|2;wildlifeSlot?:string;returned?:boolean;appearance?:'logs';sourceTreeId?:string;sourceRockId?:string;placementId?:string;id:number;kind:Resource|ProvisionId|'cookedMeat'|'cookedRabbit'|'cookedVenison';amount:number;flight?:{from:Vec;born:number;lands:number}};
export type Breakable=Loot&{kind:Resource;hp:number;maxHp:number;flashUntil:number};
export type Enemy=Vec&{siegeNight?:number;siegeTarget?:boolean;siegeBuilding?:import('./camp-restoration').CampBuildingId;hound?:import('./hound-model').HoundState;brute?:import('./brute-model').BruteState;bomber?:import('./bomber-model').BomberState;motion?:WalkerMotion;spawnedAt?:number;kind?:import('./enemy-types').EnemyKind;moving?:boolean;walkDistance?:number;faceRight?:boolean;id:number;hp:number;maxHp:number;attackAt:number;path:Vec[];repathAt:number;flashUntil:number};
export type Effect=Vec&{beamEnd?:Vec;radius?:number;target?:'animal'|'player';amount?:number;lethal?:boolean;id:number;born:number;type:'pickup'|'deposit'|'hit'|'damage'|'build'|'kill'|'dawn'|'night'|'enemy-strike'|'dodge'|'evade'|'bomber-blast'|'bomber-beep'|'walker-windup'|'skitter-charge'|'skitter-laser'|'brute-windup'|'brute-slam'|'brute-hook'|'brute-catch'|'brute-crush'|'brute-release'|'brute-step'|'hound-charge'|'hound-launch'|'hound-contact'|'hound-land';label:string;angle?:number;direction?:Direction;interrupted?:boolean;heavy?:boolean;enemyKind?:import('./enemy-types').EnemyKind};
export type SurvivalRun={nights:number;best:number;newBest:boolean;scrap:number;kills:number;reward:number;revives:number;cause:string;seconds:number};
export type World={survivorRole?:import('./survivor-roles').SurvivorRoleId;buildingRepair?:import('./building-repair').BuildingRepair;buildingHits?:Partial<Record<import('./camp-restoration').CampBuildingId,number>>;repairCheckpoint?:boolean;repairHammerUntil?:number;progression?:import('./run-progression').RunProgression;bruteGrab?:import('./brute-model').BruteGrab;bruteEscapeUntil?:number;miningSeed?:number;ironworks?:import('./camp-furnace').IronworksState;furnaceId?:string;smithyId?:string;rockMining?:Record<string,import('./rock-mining').RockMiningState>;minedRockColliders?:Set<string>;forage?:Record<string,import('./foraging').ForageState>;forageReadyAt?:number;bowLock?:import('./bow-lock').BowLock;bowShot?:BowShot;bowArrows?:BowArrow[];swordThrust?:SwordThrust;spearThrust?:SpearThrust;waypoint?:import('./waypoint').Waypoint;gear?:import('./player-gear').PlayerGear;cycle?:import('./survival-cycle').SurvivalCycle;kit?:import('./expedition-inventory').ExpeditionKit;stationPanel?:'headquarters'|'smithy'|'furnace'|'fire'|'storage'|'warehouse';ecology?:import('./wildlife-population').WildlifeState;survivalEnabled?:boolean;survival?:SurvivalCondition;treeChops?:Record<string,import('./tree-chopping').TreeChopState>;outdoorReady?:ReadonlySet<string>;gateMotions?:Record<string,import('./camp-gates').GateMotion>;puddleMotion?:import('./puddle-motion').PuddleMotion;foliageMotions?:Record<string,import('./foliage-motion').FoliageMotion>;attackQueuedUntil?:number;combatStats?:CombatStats;dodge?:{started:number;angle:number};dodgeReady?:number;combatTest?:boolean;weather?:import('./weather-model').WeatherState;nightAmount?:number;scene?:import('./scene-model').SceneDefinition;stepOnMotions?:Record<string,import('./step-on-animation').StepOnMotion>;chestMotions?:Record<string,import('./chest-animation').ChestMotion>;editorPreview?:boolean;layout?:WorldLayout;camp:CampState;tick:number;phase:'day'|'night'|'over';round:number;phaseLeft:number;survived:number;axeSwing?:AxeSwingState;player:Vec&{equipped?:import('./pickaxes').PickaxeKind|ProvisionId|'repairHammer'|'bow'|'woodenSword'|'metalSword'|'woodenSpear'|'metalSpear'|'woodenKnife'|'scrapKnife'|'torch'|'woodenAxe'|'axe'|'meal'|'rabbitMeal'|'venisonMeal'|null;appearance?:SurvivorAppearance;hp:number;stamina:number;direction:Direction;moving:boolean;walkDistance:number;walkBlend:number;sprinting:boolean;runBlend:number;hurtUntil:number;downedUntil:number;revive:number;lifeline:number};hunger:number;thirst:number;cooked:number;cookedRabbit:number;cookedVenison:number;needsDamageAt:number;drinkReady:number;fire:import('./camp-kitchen').KitchenState;animals:Animal[];tools:{bat:boolean;hammer:boolean;torch:boolean};torchOn:boolean;generator:{hp:number;maxHp:number;fuel:number;level:number};bag:Stock;loads:number;stock:Stock;loot:Loot[];breakables:Breakable[];searched:number[];enemies:Enemy[];effects:Effect[];serial:number;spawned:number;nextSpawn:number;nightFuelSpawned:boolean;attackReady:number;attackUntil:number;attackAngle:number;shutterUntil:number;shutterReady:number;barrierHp:number;crusherUntil:number;crusherReady:number;kills:number;scrap:number;revives:number;cause:string;shakeUntil:number;notice:string;noticeUntil:number};
const empty=():Stock=>({ironOre:0,ironIngot:0,stone:0,scrap:0,fuel:0,pallets:0,rawMeat:0,rawRabbit:0,rawVenison:0});
export const timeOf=(w:World)=>w.tick*STEP;
const needsActive=(w:World)=>!!w.survivalEnabled||!w.editorPreview;
export const powered=(w:World)=>w.generator.hp>0&&w.generator.fuel>0;
export const worldBase=(w:World)=>w.layout?roleItems(w.layout,'generator')[0]||BASE:BASE;
export const worldLamps=(w:World)=>w.layout?roleItems(w.layout,'lamp'):CAMP_LAMPS;
export const worldFurniture=(w:World)=>w.layout?roleItems(w.layout,'search').map(p=>({...p,cell:6,w:82*p.scale,h:153*p.scale,hw:28,hh:28,search:'scrap' as const,amount:6})):FURNITURE;
export const worldMachine=(w:World,kind:'crusher'|'shutter')=>w.layout?roleItems(w.layout,kind)[0]||{x:-10000,y:-10000}:kind==='crusher'?CRUSHER:SHUTTER;
export const worldControl=(w:World,kind:'crusher'|'shutter')=>w.layout?{x:worldMachine(w,kind).x,y:worldMachine(w,kind).y+100}:kind==='crusher'?CRUSHER_CONTROL:SHUTTER_CONTROL;
export const nearBase=(w:World)=>Math.hypot(w.player.x-worldBase(w).x,w.player.y-worldBase(w).y)<170&&lineClear(w.player,worldBase(w),w);
export const hearthLit=(w:World)=>buildingRestored(w,'fire')&&w.camp.hearth.fuel>0;
export const inCampLight=(w:World,p:Vec)=>(hearthLit(w)&&distance(p,w.camp.hearth)<180)||(powered(w)&&(distance(p,worldBase(w))<135||worldLamps(w).some(l=>distance(p,l)<230)));
export const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export function circleRect(x:number,y:number,r:number,bx:number,by:number,hw:number,hh:number){return Math.hypot(x-Math.max(bx-hw,Math.min(bx+hw,x)),y-Math.max(by-hh,Math.min(by+hh,y)))<r}
function effect(w:World,type:Effect['type'],p:Vec,label='',detail:Partial<Effect>={}){w.effects.push({x:p.x,y:p.y,...detail,id:w.serial++,born:timeOf(w),type,label})}
function announce(w:World,s:string,seconds=2.4){w.notice=s;w.noticeUntil=timeOf(w)+seconds}
export function seedLoot(w:World){w.loot=[...w.loot.filter(l=>l.returned||l.kind==='ironOre'||l.kind==='ironIngot'||l.kind==='stone'||l.kind==='rawMeat'||l.kind==='rawRabbit'||l.kind==='rawVenison'||isCookedFood(l.kind)||isProvision(l.kind)||l.appearance==='logs'),...(w.layout?w.layout.items.filter(p=>['scrap','fuel','pallets'].includes(p.role)).map(p=>({...p,placementId:p.id,kind:p.role as Resource,amount:p.role==='fuel'?25:p.role==='pallets'?3:5})):LOOT_POINTS).filter(p=>!w.layout||!layoutBlocked(w.layout,p.x,p.y,12)).map(p=>({...p,id:w.serial++}))]}
export function createWorld(layout?:WorldLayout):World{const w:World={layout,miningSeed:Math.floor(Math.random()*0x100000000),ironworks:{stations:Object.create(null)},gear:newGear(),camp:createCamp(),tick:0,phase:'day',round:1,phaseLeft:DAY_SECONDS,survived:0,player:{...SPAWN_POINT,equipped:null,hp:100,stamina:100,direction:'up',moving:false,walkDistance:0,walkBlend:0,sprinting:false,runBlend:0,hurtUntil:0,downedUntil:0,revive:0,lifeline:1},hunger:100,thirst:100,cooked:0,cookedRabbit:0,cookedVenison:0,needsDamageAt:0,drinkReady:0,fire:{cookUntil:0,ready:false},animals:[],tools:{bat:true,hammer:false,torch:true},torchOn:false,generator:{hp:180,maxHp:180,fuel:35,level:1},bag:empty(),loads:0,stock:empty(),loot:[],breakables:[],searched:[],enemies:[],effects:[],serial:0,spawned:0,nextSpawn:0,nightFuelSpawned:false,attackReady:0,attackUntil:0,attackAngle:0,shutterUntil:0,shutterReady:0,barrierHp:0,crusherUntil:0,crusherReady:0,kills:0,scrap:0,revives:0,cause:'',shakeUntil:0,notice:'DAY 1',noticeUntil:2.5};if(layout){w.player.x=layout.spawn.x;w.player.y=layout.spawn.y;for(const id of STATION_IDS){const p=roleItems(layout,id)[0];if(p){w.camp[id].x=p.x;w.camp[id].y=p.y}else{w.camp[id].x=-10000;w.camp[id].y=-10000}}}seedLoot(w);seedAnimals(w);w.breakables=(layout?roleItems(layout,'crate').map(p=>({...p,placementId:p.id,kind:'scrap' as const,amount:5})):BREAKABLE_POINTS).map(b=>({...b,id:w.serial++,hp:64,maxHp:64,flashUntil:0}));return w}
export function beginNight(w:World){const BASE=worldBase(w);if(w.phase!=='day')return false;w.phase='night';w.phaseLeft=NIGHT_SECONDS;w.spawned=0;w.nextSpawn=timeOf(w)+2.5;w.nightFuelSpawned=false;announce(w,`NIGHT ${w.round}`,3);effect(w,'night',BASE);return true}
function dawn(w:World){releaseBruteGrab(w,'',false);const BASE=worldBase(w);w.survived=w.round;w.round++;w.phase='day';w.phaseLeft=DAY_SECONDS;w.enemies=[];if(w.hunger>=25&&w.thirst>=25)w.player.hp=Math.min(100,w.player.hp+25);if(w.player.downedUntil>0){w.player.hp=40;w.player.downedUntil=0;w.player.revive=0}seedLoot(w);seedAnimals(w);announce(w,'SHIFT SURVIVED',3);effect(w,'dawn',BASE);}
export const SHUTTER_BODY={x:SHUTTER.x,y:SHUTTER.y,hw:59,hh:15},BARRICADE_BODY={x:BARRICADE.x,y:BARRICADE.y,hw:32,hh:53};
export function blocked(x:number,y:number,r=19,includeBase=true){const b=originalCampBounds();if(x<b.left+r||x>b.right-r||y<b.top+r||y>b.bottom-r)return true;if(includeBase&&circleRect(x,y,r,BASE.x,BASE.y-10,48,35))return true;return staticBlocked(x,y,r)}
export function worldBlocked(w:World,x:number,y:number,r=19,includeBase=true,ignoreId=-1){if(!w.scene&&w.layout&&usesPaintedHomeTerrain(w.layout.terrainImage)&&!outdoorTerrainReadyAt(w.outdoorReady,x,y,r))return true;if(!w.scene&&w.layout&&usesPaintedHomeTerrain(w.layout.terrainImage)&&riverWaterBlocked(x,y,r))return true;if(w.scene&&sceneBlocked(w.scene,x,y,r))return true;if(w.layout&&gatesBlocked(w,x,y,r))return true;if(w.layout&&w.editorPreview)return layoutBlocked(w.layout,x,y,r,[],undefined,w.scene,true,w.minedRockColliders);if(w.layout)return layoutBlocked(w.layout,x,y,r,includeBase?['crate','shutter']:['generator','crate','shutter'],undefined,w.scene,true,w.minedRockColliders)||(timeOf(w)<w.shutterUntil&&circleRect(x,y,r,worldMachine(w,'shutter').x,worldMachine(w,'shutter').y,59,15))||w.breakables.some(b=>{if(b.hp<=0||b.id===ignoreId)return false;const placement=w.layout!.items.find(p=>p.id===b.placementId);return placement?placementBodies(placement).some(c=>hitCollider(c,x,y,r)):circleRect(x,y,r,b.x,b.y-13,31,25)});const generatorScale=(142+(w.generator.level-1)*22)/142;return blocked(x,y,r,false)||STATION_IDS.some(id=>{const b=stationBody(w.camp,id);return circleRect(x,y,r,b.x,b.y,b.hw,b.hh)})||(includeBase&&circleRect(x,y,r,BASE.x,BASE.y-10,48*generatorScale,35*generatorScale))||w.breakables.some(b=>b.hp>0&&b.id!==ignoreId&&circleRect(x,y,r,b.x,b.y-13,31,25))||(timeOf(w)<w.shutterUntil&&circleRect(x,y,r,SHUTTER_BODY.x,SHUTTER_BODY.y,SHUTTER_BODY.hw,SHUTTER_BODY.hh))||(w.barrierHp>0&&circleRect(x,y,r,BARRICADE_BODY.x,BARRICADE_BODY.y,BARRICADE_BODY.hw,BARRICADE_BODY.hh))}
/** Fixed substeps cover knockback as well as walking, so thin fences cannot be skipped. */
export function moveBody(w:World,p:Vec,dx:number,dy:number,r=19){
 // A zero displacement never resolves penetration: the old sweep only wrote
 // the same coordinate back. Skip its collision work for idle actors/axes.
 if(dx===0&&dy===0)return;
 const n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));
 const blockedAt=(x:number,y:number)=>worldBlocked(w,x,y,r)||(
  p===w.player&&w.combatTest&&!w.dodge&&(w.enemies.some(e=>e.hp>0&&Math.hypot(x-e.x,y-e.y)<r+combatEnemyBody(e.kind)&&Math.hypot(x-e.x,y-e.y)<distance(p,e)-.001)||w.animals.some(a=>a.hp>0&&a.predator&&Math.hypot(x-a.x,y-a.y)<r+22&&Math.hypot(x-a.x,y-a.y)<distance(p,a)-.001)));
 for(let i=0;i<n;i++){if(dx!==0){const nx=p.x+dx/n;if(!blockedAt(nx,p.y))p.x=nx}if(dy!==0){const ny=p.y+dy/n;if(!blockedAt(p.x,ny))p.y=ny}}
}
export const SPRINT_SPEED=1.55;
/** A short, committed sidestep. Dodge cannot pass through authored collision,
 * cancel a strike before contact or be held to become permanently invulnerable. */
export function dodgePlayer(w:World,input:Vec={x:0,y:0}){
 validateBruteGrab(w);if(w.bruteGrab)return struggleBruteGrab(w);
 const t=timeOf(w),p=w.player;
 if(w.stationPanel||!w.combatTest||p.downedUntil||w.phase==='over'||t<(w.dodgeReady??0)||(w.axeSwing&&!w.axeSwing.resolved)||(w.spearThrust&&!w.spearThrust.resolved)||(w.swordThrust&&!w.swordThrust.resolved)||(w.bowShot&&!w.bowShot.released))return false;
 const angle=Math.hypot(input.x,input.y)>.12?Math.atan2(input.y,input.x):DIRECTION_ANGLES[p.direction];
 w.bowShot=undefined;w.axeSwing=undefined;w.spearThrust=undefined;w.swordThrust=undefined;w.attackQueuedUntil=undefined;w.attackUntil=0;w.dodge={started:t,angle};w.dodgeReady=t+COMBAT_DODGE.cooldown;
 if(w.combatStats)w.combatStats.dodges++;
 effect(w,'dodge',p,'',{angle});return true;
}
export function movePlayer(w:World,input:Vec,sprint=false){
 validateBruteGrab(w);if(w.bruteGrab){w.player.moving=false;w.player.sprinting=false;w.player.walkBlend=0;w.player.runBlend=0;return}
 if(w.bowShot&&!w.player.downedUntil){w.player.direction=w.bowShot.direction;w.player.moving=false;w.player.sprinting=false;w.player.walkBlend=0;w.player.runBlend=0;return}
 if(w.stationPanel){w.player.moving=false;w.player.sprinting=false;w.player.walkBlend=0;w.player.runBlend=0;return}
 const dodgeAge=w.dodge?timeOf(w)-w.dodge.started:Infinity;
 if(w.dodge&&dodgeAge>=COMBAT_DODGE.duration)w.dodge=undefined;
 if(w.dodge&&!w.player.downedUntil){
  const p=w.player,before={x:p.x,y:p.y},angle=w.dodge.angle;
  // Use the existing running gait, advanced only by actual displacement.
  p.direction=facing(Math.cos(angle),Math.sin(angle));
  const speed=COMBAT_DODGE.speed*(1-.45*dodgeAge/COMBAT_DODGE.duration);
  moveBody(w,p,Math.cos(angle)*speed*STEP,Math.sin(angle)*speed*STEP);
  const travelled=distance(p,before);p.moving=travelled>.001;p.sprinting=p.moving;p.runBlend=1;p.walkBlend=p.moving?1:0;
  if(p.moving)p.walkDistance=(p.walkDistance+travelled*112/200)%112;
  return;
 }
 const swinging=w.axeSwing&&timeOf(w)-w.axeSwing.started<axeProfile(w.axeSwing).duration;
 const thrusting=!!w.spearThrust,swordThrusting=!!w.swordThrust;
 if(swinging||thrusting||swordThrusting)sprint=false;
 const p=w.player,m=Math.hypot(input.x,input.y),dx=m>.12?input.x/Math.max(1,m):0,dy=m>.12?input.y/Math.max(1,m):0;
 const before={x:p.x,y:p.y};
 if(dx||dy){const angle=Math.atan2(dy,dx),held=DIRECTION_ANGLES[p.direction],turn=Math.abs(Math.atan2(Math.sin(angle-held),Math.cos(angle-held)));if(!p.moving||turn>Math.PI/8+.055)p.direction=facing(dx,dy)}
 const requested=sprint&&!p.downedUntil&&!!(dx||dy)&&(!needsActive(w)||canSprint(w));
 // The same blend drives speed and pose; toggling never resets the foot phase.
 const runTarget=requested?1:0;
 p.runBlend=runTarget+((p.runBlend??0)-runTarget)*Math.exp(-STEP*14);
 if(p.runBlend<.001)p.runBlend=0;else if(p.runBlend>.999)p.runBlend=1;
 // Movement cannot change inventory; share this tick's weight calculation
 // between speed and sprint cost instead of traversing the pack twice.
 const load=p.downedUntil?undefined:packLoad(w);
 const speed=p.downedUntil?65:285*load!.speed*(1+(SPRINT_SPEED-1)*(swinging||thrusting||swordThrusting?0:p.runBlend))*(swinging?axeMoveScale(w.axeSwing!,timeOf(w)):thrusting?.6:swordThrusting?.65:1);
 moveBody(w,p,dx*speed*STEP,dy*speed*STEP);
 const travelled=distance(p,before);p.moving=travelled>.001;p.sprinting=requested&&p.moving;
 if(p.sprinting&&needsActive(w))spendSprintStamina(w,STEP*load!.stamina,timeOf(w));
 // Running lengthens the stride as well as increasing the cadence. Advance by
 // real displacement so a wall or released joystick never runs on the spot.
 if(p.moving)p.walkDistance=(p.walkDistance+travelled*112/(160+40*p.runBlend))%112;
 const target=p.moving&&!p.downedUntil?1:0;
 p.walkBlend=target+((p.walkBlend??0)-target)*Math.exp(-STEP*(target?24:28));
 if(p.walkBlend<.001)p.walkBlend=0;
}
// Small-grid BFS gives the single prototype creature proper routes around racks and machinery.
const PATH_CELL=45,PATH_BOUNDS=originalCampBounds(),PATH_COLS=Math.ceil(PATH_BOUNDS.width/PATH_CELL),PATH_ROWS=Math.ceil(PATH_BOUNDS.height/PATH_CELL);
const pathGrid=Array.from({length:PATH_COLS*PATH_ROWS},(_,i)=>!blocked(PATH_BOUNDS.left+(i%PATH_COLS+.5)*PATH_CELL,PATH_BOUNDS.top+(Math.floor(i/PATH_COLS)+.5)*PATH_CELL,21));
// Raids search the same cell centres thousands of times a night. Collision that
// cannot change during play (bounds, water, scene walls and placed colliders) is
// kept per layout, scene and body radius; streamed ground, gates and mined rocks
// are evaluated afresh. Results are identical to worldBlocked at the cell centre.
type NavigationCells={left:number;top:number;cols:number;state:Uint8Array;hits:Map<number,readonly string[]>};
const NAV_KNOWN=1,NAV_BLOCKED=2,NAV_HITS=4,NO_SCENE={},navigationCache=new WeakMap<object,WeakMap<object,Map<number,NavigationCells>>>();
function navigationCells(layout:WorldLayout,scene:object|undefined,bounds:WorldBounds,cols:number,count:number,r:number){
 const index=layoutCollisionKey(layout);let scenes=navigationCache.get(index);if(!scenes)navigationCache.set(index,scenes=new WeakMap());
 let radii=scenes.get(scene??NO_SCENE);if(!radii)scenes.set(scene??NO_SCENE,radii=new Map());
 let cells=radii.get(r);
 if(!cells||cells.left!==bounds.left||cells.top!==bounds.top||cells.cols!==cols||cells.state.length!==count)radii.set(r,cells={left:bounds.left,top:bounds.top,cols,state:new Uint8Array(count),hits:new Map()});
 return cells;
}
function navigationBlocked(w:World,layout:WorldLayout,cells:NavigationCells,gates:readonly Collider[],painted:boolean,id:number,x:number,y:number,r:number){
 if(painted&&!outdoorTerrainReadyAt(w.outdoorReady,x,y,r))return true;
 let state=cells.state[id];
 if(!state){
  state=NAV_KNOWN;
  if(painted&&riverWaterBlocked(x,y,r)||w.scene&&sceneBlocked(w.scene,x,y,r))state|=NAV_BLOCKED;
  else{const hits=layoutColliderHits(layout,x,y,r,w.scene);if(hits===true)state|=NAV_BLOCKED;else if(hits.length){state|=NAV_HITS;cells.hits.set(id,hits.map(c=>c.id))}}
  cells.state[id]=state;
 }
 if(state&NAV_BLOCKED)return true;
 for(const c of gates)if(hitCollider(c,x,y,r))return true;
 if(!(state&NAV_HITS))return false;
 const mined=w.minedRockColliders;for(const c of cells.hits.get(id)!)if(!mined?.has(c))return true;
 return false;
}
// Search scratch is reused; a generation stamp marks the entries of the current search.
let searchGeneration=0,searchVisited=new Uint32Array(0),searchParent=new Int32Array(0),searchQueue=new Int32Array(0),searchKnown=new Uint32Array(0),searchOpen=new Uint8Array(0);
function beginSearch(count:number){
 if(searchVisited.length<count){searchVisited=new Uint32Array(count);searchParent=new Int32Array(count);searchQueue=new Int32Array(count);searchKnown=new Uint32Array(count);searchOpen=new Uint8Array(count);searchGeneration=0}
 if(++searchGeneration===0xffffffff){searchVisited.fill(0);searchKnown.fill(0);searchGeneration=1}
 return searchGeneration;
}
const STEP_X=[1,-1,0,0],STEP_Y=[0,0,1,-1];
export function pathTo(start:Vec,target:Vec,w?:World,maxVisited=Infinity,bodyRadius=21):Vec[]{
 const size=PATH_CELL,bounds=worldBounds(w),cols=Math.ceil(bounds.width/size),rows=Math.ceil(bounds.height/size),count=cols*rows,key=(x:number,y:number)=>y*cols+x;
 const cell=(p:Vec)=>({x:Math.max(0,Math.min(cols-1,Math.floor((p.x-bounds.left)/size))),y:Math.max(0,Math.min(rows-1,Math.floor((p.y-bounds.top)/size)))});
 const generation=beginSearch(count),layout=w?.layout,cached=w&&layout&&w.editorPreview?navigationCells(layout,w.scene,bounds,cols,count,bodyRadius):undefined;
 const gates=cached?gateBlockers(w!):[],painted=!!cached&&!w!.scene&&usesPaintedHomeTerrain(layout!.terrainImage);
 const open=(x:number,y:number)=>{
  if(!(x>=0&&x<cols&&y>=0&&y<rows&&(w?.layout||w?.scene||pathGrid[key(x,y)])))return false;
  if(!w)return true;
  const id=key(x,y);if(searchKnown[id]===generation)return searchOpen[id]===1;
  const cx=bounds.left+(x+.5)*size,cy=bounds.top+(y+.5)*size,clear=cached?!navigationBlocked(w,layout!,cached,gates,painted,id,cx,cy,bodyRadius):!worldBlocked(w,cx,cy,bodyRadius);
  searchKnown[id]=generation;searchOpen[id]=clear?1:0;return clear;
 };
 const a=cell(start);let b=cell(target);
 // A valid interaction point can lie in a grid cell whose centre overlaps a wall.
 // Route to the closest open centre instead of permitting a blocked goal cell.
 if(!open(b.x,b.y)){const choices:{x:number;y:number}[]=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(open(b.x+dx,b.y+dy))choices.push({x:b.x+dx,y:b.y+dy});choices.sort((u,v)=>Math.hypot(bounds.left+(u.x+.5)*size-target.x,bounds.top+(u.y+.5)*size-target.y)-Math.hypot(bounds.left+(v.x+.5)*size-target.x,bounds.top+(v.y+.5)*size-target.y));if(!choices.length)return[];b=choices[0]}
 const from=key(a.x,a.y),goal=key(b.x,b.y),visited=searchVisited,parent=searchParent,queue=searchQueue;
 visited[from]=generation;parent[from]=-1;queue[0]=from;let head=0,tail=1;
 while(head<tail&&head<maxVisited){const n=queue[head++];if(n===goal)break;const x=n%cols,y=Math.floor(n/cols);for(let d=0;d<4;d++){const nx=x+STEP_X[d],ny=y+STEP_Y[d],id=key(nx,ny);if(visited[id]===generation||!open(nx,ny))continue;visited[id]=generation;parent[id]=n;queue[tail++]=id}}
 if(visited[goal]!==generation)return[];const path:Vec[]=[];for(let n=goal;n!==from&&n!==-1;n=parent[n])path.push({x:bounds.left+(n%cols+.5)*size,y:bounds.top+(Math.floor(n/cols)+.5)*size});return path.reverse();
}
/** Explicit taps queue sooner than a held press. Late recovery taps
 * are buffered for 140ms; a queued action never survives an input reset. */
export function clearAttackQueue(w:World){w.attackQueuedUntil=undefined;if(w.axeSwing)w.axeSwing.queued=false}
export function requestAttack(w:World){
 validateBruteGrab(w);if(w.bruteGrab){clearAttackQueue(w);return struggleBruteGrab(w)}
 if(w.stationPanel){clearAttackQueue(w);return false}
 if((isProvision(w.player.equipped)||w.player.equipped==='repairHammer'||w.player.equipped==='torch'||w.player.equipped==='meal'||w.player.equipped==='rabbitMeal'||w.player.equipped==='venisonMeal')){clearAttackQueue(w);return false}
 const accepted=attack(w);
 w.attackQueuedUntil=!accepted&&w.combatTest&&!w.player.downedUntil?timeOf(w)+.14:undefined;
 return accepted;
}
export function attack(w:World,held=false){
 validateBruteGrab(w);if(w.bruteGrab)return !held&&struggleBruteGrab(w);
 if(w.player.equipped==='bow')return shootBow(w);
 if((isProvision(w.player.equipped)||w.player.equipped==='repairHammer'||w.player.equipped==='torch'||w.player.equipped==='meal'||w.player.equipped==='rabbitMeal'||w.player.equipped==='venisonMeal'))return false;
 if(w.dodge||w.stationPanel)return false;
 if(isSword(w.player.equipped))return thrustSword(w);
 if(isSpear(w.player.equipped))return thrustSpear(w);
 if(isKnife(w.player.equipped)&&!hasGear(w,w.player.equipped))return false;
 if(isPickaxe(w.player.equipped))return swingPickaxe(w);
 if(isAxe(w.player.equipped)&&hasAxe(w,w.player.equipped))return swingAxe(w,held);
 const t=timeOf(w);if(w.phase==='over'||!w.tools.bat||w.player.downedUntil||t<w.attackReady)return false;
 const knife=isKnife(w.player.equipped)&&hasGear(w,w.player.equipped)?KNIFE_GEAR[w.player.equipped]:undefined;
 const reach=knife?110:148;
 w.attackReady=t+(knife?KNIFE_COOLDOWN:.52);w.attackUntil=t+(knife ? .14 : .22);
 const candidates=w.enemies.filter(e=>e.hp>0&&distance(e,w.player)<reach&&lineClear(e,w.player,w)).sort((a,b)=>distance(a,w.player)-distance(b,w.player));
 const animal=w.animals.filter(a=>a.hp>0&&distance(a,w.player)<reach&&lineClear(a,w.player,w)).sort((a,b)=>distance(a,w.player)-distance(b,w.player))[0];
 const crate=nearestBreakable(w),target=candidates[0]||animal||(!knife&&crate);
 w.attackAngle=target?Math.atan2(target.y-w.player.y,target.x-w.player.x):DIRECTION_ANGLES[w.player.direction];
 if(w.editorPreview&&!w.combatTest)return true;
 for(const e of candidates.slice(0,knife?1:3))hitEnemy(w,e,knife?.damage??32,knife?12:27,false,knife?'weapon':'fists');
 if((!w.editorPreview||w.survivalEnabled)&&!candidates.length&&animal)hitAnimal(w,animal,knife?knife.damage:animal.chicken||animal.rabbit||animal.deer||animal.predator?16:32);
 if(!knife&&!w.editorPreview&&!candidates.length&&!animal&&crate){crate.hp=Math.max(0,crate.hp-32);crate.flashUntil=t+.18;effect(w,'hit',crate);if(!crate.hp){w.loot.push({x:crate.x,y:crate.y,id:w.serial++,kind:crate.kind,amount:crate.amount});w.shakeUntil=t+.13;effect(w,'build',crate,'SALVAGE')}}
 if(!knife&&!candidates.length&&!animal&&!crate&&(!w.editorPreview||w.survivalEnabled)&&chopTree(w,w.attackAngle,148,Math.PI*.34,8,(from,to)=>lineClear(from,to,w))){
  // Recoil happens only when a punch actually connects with a living tree.
  w.player.hp=Math.max(0,w.player.hp-1);w.player.hurtUntil=t+.18;
  effect(w,'hit',w.player,'-1');w.shakeUntil=t+.08;
  w.notice='Bare hands · -1 health · An axe cuts faster';w.noticeUntil=t+1.2;
  if(!w.player.hp){w.phase='over';w.cause='INJURED CHOPPING BAREHANDED'}
 }
 removeDead(w);return true;
}
/** Lock tracks the draw, then commits one straight projectile at release. */
export function shootBow(w:World){
 if(w.bruteGrab)return false;
 const p=w.player,t=timeOf(w),spec=BOW_SHOT;
 if(p.equipped!=='bow'||!hasGear(w,'bow')||w.phase==='over'||p.hp<=0||p.downedUntil||w.dodge||w.stationPanel||w.bowShot||t<w.attackReady)return false;
 if((gear(w).bag.arrows??0)<1){w.notice='No arrows · Restock at the headquarters chest';w.noticeUntil=t+2;return false}
 stepBowLock(w,true);
 const locked=bowLockTarget(w);
 let angle=DIRECTION_ANGLES[p.direction];
 if(locked)angle=Math.atan2(locked.entity.y-p.y,locked.entity.x-p.x);
 else{
  const targets=[...w.enemies,...w.animals].filter(target=>target.hp>0&&distance(p,target)<=spec.range&&Math.abs(angleDelta(Math.atan2(target.y-p.y,target.x-p.x),angle))<=spec.aimArc&&lineClear(p,target,w)).sort((a,b)=>distance(a,p)-distance(b,p));
  if(targets[0])angle=Math.atan2(targets[0].y-p.y,targets[0].x-p.x);
 }
 w.bowShot={started:t,angle,direction:facing(Math.cos(angle),Math.sin(angle)),released:false,...(locked?{target:{kind:locked.ref.kind,id:locked.ref.id}}:{})};
 w.attackAngle=angle;w.attackReady=t+spec.cooldown;w.attackUntil=t+spec.duration;
 p.sprinting=false;p.runBlend=0;return true;
}
export function stepBow(w:World){
 stepBowLock(w);
 const p=w.player,t=timeOf(w),shot=w.bowShot,spec=BOW_SHOT;
 if(shot){
  if(p.downedUntil||p.hp<=0||w.phase==='over'||w.stationPanel||p.equipped!=='bow'||!hasGear(w,'bow')){w.bowShot=undefined;w.attackQueuedUntil=undefined}
  else{
   const age=t-shot.started;
   if(!shot.released&&shot.target){
    const target=stepBowLock(w,age>=spec.release);
    if(target&&target.ref.id===shot.target?.id&&target.ref.kind===shot.target?.kind){
     shot.angle=age>=spec.release?bowLockedAim(w,target):Math.atan2(target.entity.y-p.y,target.entity.x-p.x);
     // Turn the existing eight-way artwork without quantizing the arrow.
     if(Math.abs(angleDelta(shot.angle,DIRECTION_ANGLES[shot.direction]))>Math.PI/8+.06)shot.direction=facing(Math.cos(shot.angle),Math.sin(shot.angle));
     p.direction=shot.direction;w.attackAngle=shot.angle;
    }
   }
   if(!shot.released&&age>=spec.release){
    shot.released=true;const bag=gear(w).bag;
    if((bag.arrows??0)>0){
     bag.arrows=(bag.arrows??0)-1;
     const arrows=w.bowArrows??=[];
     arrows.push({x:p.x,y:p.y,id:w.serial++,born:t,angle:shot.angle,travelled:0});
     if(arrows.length>spec.maxArrows)arrows.splice(0,arrows.length-spec.maxArrows);
    }
   }
   if(age>=spec.duration)w.bowShot=undefined;
  }
 }
 if(w.phase==='over'){w.bowArrows=[];return}
 const active:BowArrow[]=[];
 for(const arrow of w.bowArrows??[]){
  const distanceLeft=spec.range-arrow.travelled;
  if(distanceLeft<=0||t-arrow.born>spec.range/spec.speed+.2)continue;
  const travel=Math.min(spec.speed*STEP,distanceLeft),dx=Math.cos(arrow.angle),dy=Math.sin(arrow.angle),next={x:arrow.x+dx*travel,y:arrow.y+dy*travel};
  let wall=Infinity;
  const steps=Math.max(1,Math.ceil(travel/4));
  for(let i=1;i<=steps;i++){const u=i/steps;if(worldBlocked(w,arrow.x+(next.x-arrow.x)*u,arrow.y+(next.y-arrow.y)*u,2,false)){wall=u;break}}
  let contact:{target:Animal|Enemy;animal:boolean;at:number}|undefined;
  const check=(target:Animal|Enemy,animal:boolean,radius:number)=>{if(target.hp<=0)return;const at=arrowCircleHit(arrow,next,target,radius+2);if(at!==undefined&&at<=wall&&(!contact||at<contact.at))contact={target,animal,at}};
  if(!w.editorPreview||w.combatTest)for(const enemy of w.enemies)check(enemy,false,combatEnemyBody(enemy.kind));
  if(!w.editorPreview||w.survivalEnabled)for(const animal of w.animals)check(animal,true,animal.chicken?12:animal.rabbit?14:animal.deer?26:animal.predator?24:18);
  if(contact){
   if(contact.animal)hitAnimal(w,contact.target as Animal,spec.damage);
   else{const enemy=contact.target as Enemy;hitEnemy(w,enemy,spec.damage,0);if(!enemy.bomber){const push=enemy.kind==='scrap-hound'&&enemy.hound?.phase==='pounce'?0:enemy.kind==='iron-brute'?1:9;moveBody(w,enemy,dx*push,dy*push,combatEnemyBody(enemy.kind))}}
   continue;
  }
  if(wall!==Infinity)continue;
  arrow.x=next.x;arrow.y=next.y;arrow.travelled+=travel;
  if(arrow.travelled<spec.range)active.push(arrow);
 }
 w.bowArrows=active;removeDead(w);stepBowLock(w);
}
/** Spears aim into a narrow forward lane and resolve on the extension frame.
 * Recheck reach and walls at contact, so moving away can evade the thrust. */
export function thrustSpear(w:World){
 if(w.bruteGrab)return false;
 const p=w.player,t=timeOf(w),spec=SPEAR_THRUST;
 if(!isSpear(p.equipped)||!hasGear(w,p.equipped)||w.phase==='over'||p.hp<=0||p.downedUntil||w.dodge||w.stationPanel||w.spearThrust||t<w.attackReady)return false;
 let angle=DIRECTION_ANGLES[p.direction];
 const targets=[...w.enemies,...w.animals].filter(target=>target.hp>0&&distance(p,target)<=spec.reach&&Math.abs(angleDelta(Math.atan2(target.y-p.y,target.x-p.x),angle))<Math.PI/6&&lineClear(p,target,w)).sort((a,b)=>distance(a,p)-distance(b,p));
 if(targets[0])angle=Math.atan2(targets[0].y-p.y,targets[0].x-p.x);
 w.spearThrust={started:t,angle,tool:p.equipped,resolved:false};
 w.attackAngle=angle;w.attackReady=t+spec.cooldown;w.attackUntil=t+spec.duration;p.sprinting=false;
 return true;
}
export function stepSpear(w:World){
 const thrust=w.spearThrust;if(!thrust)return;
 const t=timeOf(w),age=t-thrust.started,p=w.player,spec=SPEAR_THRUST;
 if(p.downedUntil||p.hp<=0||w.phase==='over'||p.equipped!==thrust.tool||!hasGear(w,thrust.tool)){
  w.spearThrust=undefined;w.attackQueuedUntil=undefined;return;
 }
 if(!thrust.resolved&&age>=spec.contact){
  thrust.resolved=true;
  const inLane=(target:Vec)=>distance(p,target)<=spec.reach&&Math.abs(angleDelta(Math.atan2(target.y-p.y,target.x-p.x),thrust.angle))<=spec.halfArc&&lineClear(p,target,w);
  const enemies=(!w.editorPreview||w.combatTest)?w.enemies.filter(e=>e.hp>0&&inLane(e)):[];
  const animals=(!w.editorPreview||w.survivalEnabled)?w.animals.filter(a=>a.hp>0&&inLane(a)):[];
  const targets=[...enemies.map(target=>({target,animal:false})),...animals.map(target=>({target,animal:true}))].sort((a,b)=>distance(a.target,p)-distance(b.target,p));
  const hit=targets[0],damage=SPEAR_GEAR[thrust.tool].damage;
  if(hit?.animal)hitAnimal(w,hit.target as Animal,damage);
  else if(hit)hitEnemy(w,hit.target as Enemy,damage,spec.push);
  if(enemies.length)removeDead(w);
 }
 if(age>=spec.duration)w.spearThrust=undefined;
}
/** A short, committed thrust hits the nearest target directly ahead. */
export function thrustSword(w:World){
 if(w.bruteGrab)return false;
 const p=w.player,t=timeOf(w),spec=SWORD_THRUST;
 if(!isSword(p.equipped)||!hasGear(w,p.equipped)||w.phase==='over'||p.hp<=0||p.downedUntil||w.dodge||w.stationPanel||w.swordThrust||t<w.attackReady)return false;
 const angle=DIRECTION_ANGLES[p.direction];
 w.swordThrust={started:t,angle,tool:p.equipped,resolved:false};
 w.attackAngle=angle;w.attackReady=t+spec.cooldown;w.attackUntil=t+spec.duration;p.sprinting=false;
 return true;
}
export function stepSword(w:World){
 const thrust=w.swordThrust;if(!thrust)return;
 const t=timeOf(w),age=t-thrust.started,p=w.player,spec=SWORD_THRUST;
 if(p.downedUntil||p.hp<=0||w.phase==='over'||p.equipped!==thrust.tool||!hasGear(w,thrust.tool)){
  w.swordThrust=undefined;w.attackQueuedUntil=undefined;return;
 }
 if(!thrust.resolved&&age>=spec.contact){
  thrust.resolved=true;
  const inLane=(target:Vec)=>distance(p,target)<=spec.reach&&Math.abs(angleDelta(Math.atan2(target.y-p.y,target.x-p.x),thrust.angle))<=spec.halfArc&&lineClear(p,target,w);
  const enemies=(!w.editorPreview||w.combatTest)?w.enemies.filter(e=>e.hp>0&&inLane(e)):[];
  const animals=(!w.editorPreview||w.survivalEnabled)?w.animals.filter(a=>a.hp>0&&inLane(a)):[];
  const targets=[...enemies.map(target=>({target,animal:false})),...animals.map(target=>({target,animal:true}))].sort((a,b)=>distance(a.target,p)-distance(b.target,p));
  const hit=targets[0];
  if(hit){
   const damage=SWORD_GEAR[thrust.tool].damage;
   if(hit.animal)hitAnimal(w,hit.target as Animal,damage);
   else hitEnemy(w,hit.target as Enemy,damage,spec.push);
  }
  if(enemies.length)removeDead(w);
 }
 if(age>=spec.duration)w.swordThrust=undefined;
}
export function swingPickaxe(w:World){if(w.bruteGrab)return false;
 const p=w.player,t=timeOf(w),tool=p.equipped;
 if(!isPickaxe(tool)||!hasGear(w,tool)||w.phase==='over'||p.hp<=0||p.downedUntil||w.stationPanel||w.dodge||w.axeSwing||w.spearThrust||w.swordThrust||w.bowShot||t<w.attackReady)return false;
 let angle=DIRECTION_ANGLES[p.direction];const target=nearbyMineableRock(w,getFieldKitTarget(w)?.rockId?undefined:angle);
 if(target&&!canMineRock(w,target)){w.notice='Metal pickaxe required for iron-veined boulders';w.noticeUntil=t+1.5;return false;}
 if(target)angle=Math.atan2(target.point.y-p.y,target.point.x-p.x);
 const spec=axeProfile({tool});w.axeSwing={tool,cut:1,started:t,angle,resolved:false};w.attackAngle=angle;w.attackReady=t+spec.cooldown;w.attackUntil=t+spec.duration;p.sprinting=false;return true;
}
function startAxeCut(w:World,cut:AxeCut){
 const t=timeOf(w),p=w.player;
 const tool=p.equipped==='woodenAxe'?'woodenAxe':'axe',spec=axeProfile({cut,tool});
 // Axe cuts are free, including at zero stamina. Do not call spendStamina(0):
 // that would still reset the recovery delay and exhaustion latch.
 let angle=DIRECTION_ANGLES[p.direction];
 // Modest frontal assistance helps a thumb-stick without snapping to enemies
 // behind you. Once the wind-up starts, its facing is committed.
 if(w.combatTest){const target=w.enemies.filter(e=>e.hp>0&&distance(e,p)<spec.reach&&Math.abs(angleDelta(Math.atan2(e.y-p.y,e.x-p.x),angle))<Math.PI/5&&lineClear(p,e,w)).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(target)angle+=Math.max(-.22,Math.min(.22,angleDelta(Math.atan2(target.y-p.y,target.x-p.x),angle)))}
 w.axeSwing={started:t,angle,resolved:false,cut,tool};
 w.attackAngle=angle;w.attackReady=t+spec.cooldown;w.attackUntil=t+spec.duration;
 p.sprinting=false;return true;
}
/** Lock facing for one cut, while allowing a moving strike. A fresh input in
 * the first cut links exactly one return cut, never resets the active hit. */
export function swingAxe(w:World,held=false){
 if(w.bruteGrab)return false;
 const t=timeOf(w),p=w.player;
 if(w.phase==='over'||!isAxe(p.equipped)||!hasAxe(w,p.equipped)||p.downedUntil||w.dodge)return false;
 if(w.axeSwing){
  const age=t-w.axeSwing.started;
  if(w.axeSwing.cut!==2&&!w.axeSwing.queued&&age>=(held?AXE_CHAIN.heldOpen:AXE_CHAIN.open)&&age<=AXE_CHAIN.close){w.axeSwing.queued=true;return true}
  return false;
 }
 if(t<w.attackReady)return false;
 return startAxeCut(w,1);
}
export function toggleAxe(w:World){
 return equipAxe(w,hasAxe(w,'axe')?'axe':'woodenAxe');
}
export function stepAxe(w:World){
 const swing=w.axeSwing;if(!swing)return;
 const elapsed=timeOf(w)-swing.started,spec=axeProfile(swing);
 if(w.player.downedUntil||w.phase==='over'){w.axeSwing=undefined;w.attackQueuedUntil=undefined;return}
 if(!swing.resolved&&elapsed>=spec.contact){
  swing.resolved=true;
  // Pickaxes exclusively resolve rock contacts. Other weapons cannot enter this path.
  if(isPickaxe(swing.tool)){if(w.player.equipped===swing.tool)mineRock(w,swing.angle)}
  else {
  // Tree damage is transient World state, never a saved layout mutation.
   const p=w.player,t=timeOf(w),inArc=(target:Vec,ignore=-1)=>{
    const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
    return d<=spec.reach&&Math.cos(Math.atan2(dy,dx)-swing.angle)>=Math.cos(spec.halfArc)&&lineClear(p,target,w,ignore);
   };
   const enemies=(!w.editorPreview||w.combatTest)?w.enemies.filter(e=>inArc(e)).sort((a,b)=>distance(a,p)-distance(b,p)).slice(0,3):[];
   for(const e of enemies)hitEnemy(w,e,spec.damage,spec.push,swing.cut===2);
   const animal=(!w.editorPreview||w.survivalEnabled)?w.animals.filter(a=>a.hp>0&&inArc(a)).sort((a,b)=>distance(a,p)-distance(b,p))[0]:undefined;
   const treeHit=!enemies.length&&!animal&&chopTree(w,swing.angle,spec.reach,spec.halfArc,spec.damage,(from,to)=>lineClear(from,to,w));
   if(!enemies.length&&!treeHit&&(!w.editorPreview||w.survivalEnabled)){
    const crate=w.breakables.filter(b=>b.hp>0&&inArc(b,b.id)).sort((a,b)=>distance(a,p)-distance(b,p))[0];
    if(animal)hitAnimal(w,animal,spec.damage);
    else if(crate&&!w.editorPreview){crate.hp=Math.max(0,crate.hp-spec.damage);crate.flashUntil=t+.18;effect(w,'hit',crate);if(!crate.hp){w.loot.push({x:crate.x,y:crate.y,id:w.serial++,kind:crate.kind,amount:crate.amount});effect(w,'build',crate,'SALVAGE');w.shakeUntil=t+.1}}
   }
   if(!w.editorPreview||w.combatTest)removeDead(w);
  }
 }
 if(!isPickaxe(swing.tool)&&swing.cut!==2&&swing.queued&&swing.resolved&&elapsed>=AXE_CHAIN.start){
  swing.queued=false;
  if(startAxeCut(w,2)){w.attackQueuedUntil=undefined;return}
 }
 if(elapsed>=spec.duration)w.axeSwing=undefined;
}
export function lineClear(a:Vec,b:Vec,w?:World,ignoreId=-1){const steps=Math.ceil(distance(a,b)/15);for(let i=1;i<steps;i++){const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;if(w?worldBlocked(w,x,y,3,false,ignoreId):blocked(x,y,3,false))return false}return true}
export function nearestBreakable(w:World){return w.breakables.filter(b=>b.hp>0&&distance(b,w.player)<130&&lineClear(w.player,b,w,b.id)).sort((a,b)=>distance(a,w.player)-distance(b,w.player))[0]}
export function searchTarget(w:World){return worldFurniture(w).map((f,id)=>({...f,id,front:{x:f.x,y:f.y+50}})).filter(f=>f.search&&!w.searched.includes(f.id)&&distance(w.player,f.front)<110&&lineClear(w.player,f.front,w)).sort((a,b)=>distance(a.front,w.player)-distance(b.front,w.player))[0]}
export function pickupTarget(w:World){return chooseInteractionFocus(w,w.loot.filter(l=>l.amount>0&&(!l.flight||timeOf(w)>=l.flight.lands)&&distance(w.player,l)<112&&lineClear(w.player,l,w)).map(value=>({id:`pickup:${value.id}`,x:value.x,y:value.y,available:canCarryCount(w,value.kind,value.amount)>0,value})))??undefined}
export function pickup(w:World){if(w.bruteGrab)return false;
 if(w.phase==='over'||w.player.downedUntil)return false;const l=pickupTarget(w);if(!l)return false;
 const amount=addInventory(w,l.kind,l.amount);if(!amount){announce(w,'Backpack full · Drop or store supplies');return false}
 if(l.kind==='scrap'&&!l.returned)w.scrap+=amount;
 l.amount-=amount;effect(w,'pickup',l,`+${amount} ${foodName(l.kind)|| (l.kind==='pallets'?'LOGS':l.kind.toUpperCase())}`);
 if(l.amount)announce(w,`Packed ${amount} · ${l.amount} left on the ground`);else w.loot=w.loot.filter(item=>item.id!==l.id);
 return true;
}
function hitEnemy(w:World,e:Enemy,damage:number,push:number,heavy=false,impact:'weapon'|'fists'='weapon'){
 const tank=e.kind==='iron-brute',hound=e.kind==='scrap-hound',braced=tank||e.kind==='scrap-walker'&&impact==='fists';
 if(hound&&e.hound?.phase==='recover')damage=Math.round(damage*HOUND.exposedMultiplier);
 if(hound&&(e.hound?.phase==='pounce'||impact==='fists'))push=Math.min(push,e.hound?.phase==='pounce'?0:2);
 if(tank){damage=bruteArmour(e,damage,impact);push=Math.min(push,1)}
 if(braced&&!tank){damage=Math.max(1,Math.round(damage*WALKER_ARMOUR.fistDamageMultiplier));push=Math.min(push,WALKER_ARMOUR.fistPush)}
 const t=timeOf(w),p=w.player,d=distance(e,p)||1,angle=Math.atan2(e.y-p.y,e.x-p.x),before=e.hp;
 e.hp-=damage;e.flashUntil=t+.13;
 const interrupted=tank?hitBrutePoise(w,e,damage,impact,heavy):hound?hitHound(w,e,impact):!braced&&e.motion?.phase==='windup';
 const armed=!!e.bomber;
 if(w.combatTest){
  if((braced||hound)&&e.motion){
   // Preserve its phase, facing, contact deadline and attack admission slot.
   Object.assign(e.motion,{hitAt:t,hitAngle:angle,healthFrom:before});
  }else{
   e.motion={phase:armed?'arming':'stagger',since:armed?e.bomber!.armedAt:t,direction:e.motion?.direction??facing(p.x-e.x,p.y-e.y),angle:e.motion?.angle??angle+Math.PI,resolved:true,hitAt:t,hitAngle:angle,healthFrom:before};
   e.moving=false;e.attackAt=Math.max(e.attackAt,t+(e.kind==='skitter'?SKITTER_LASER.stagger:WALKER_ATTACK.stagger)+.28);
  }
  if(w.combatStats){w.combatStats.landed++;w.combatStats.damageDealt+=Math.min(before,damage);if(interrupted)w.combatStats.interrupts++}
  w.shakeUntil=Math.max(w.shakeUntil,t+.08);
 }
 // Respect the enemy's body radius, including the stronger return cut, so an
 // impact can never embed it in a thin wall.
 if(!armed)moveBody(w,e,(e.x-p.x)/d*push,(e.y-p.y)/d*push,w.combatTest?combatEnemyBody(e.kind):12);
 effect(w,'hit',e,w.combatTest?String(damage):'',{angle,interrupted,heavy,enemyKind:e.kind});
}
function removeDead(w:World){if(w.bruteGrab&&w.enemies.some(e=>e.id===w.bruteGrab!.enemyId&&e.hp<=0))releaseBruteGrab(w,'GRIP BROKEN');for(const e of w.enemies)if(e.hp<=0&&!e.bomber?.detonated){w.kills++;effect(w,'kill',e,w.combatTest?'':'+1',{enemyKind:e.kind,direction:e.motion?.direction,angle:e.motion?.hitAngle});if(w.combatTest&&w.layout)w.loot.push({x:e.x,y:e.y,id:w.serial++,kind:'scrap',amount:e.kind==='iron-brute'?4+e.id%3:1+(e.id%3===0?1:0)});else if(!w.combatTest&&e.id%3===0)w.loot.push({x:e.x,y:e.y,id:w.serial++,kind:'scrap',amount:2})}w.enemies=w.enemies.filter(e=>e.hp>0)}
export type BuildAction='fuel'|'repair'|'upgrade'|'barricade'|'shutter'|'crusher'|'search'|'pickup'|'torch'|'drink'|'cook'|'eat'|'deposit'|'stoke'|'collectFood';
export function doAction(w:World,action:BuildAction,food?:FoodSpecies){if(w.bruteGrab)return false;const BASE=worldBase(w),SHUTTER=worldMachine(w,'shutter'),CRUSHER=worldMachine(w,'crusher'),SHUTTER_CONTROL=worldControl(w,'shutter'),CRUSHER_CONTROL=worldControl(w,'crusher'),SHUTTER_BODY={x:SHUTTER.x,y:SHUTTER.y,hw:59,hh:15};const t=timeOf(w);if(w.phase==='over'||w.player.downedUntil)return false;
 if(action==='pickup')return pickup(w);
 if(action==='deposit'){
  if(campAction(w)!=='deposit'||(w.bag.ironOre??0)+(w.bag.ironIngot??0)+(w.bag.stone??0)+w.bag.scrap+w.bag.fuel+w.bag.pallets<=0)return false;
  for(const k of ['ironOre','ironIngot','stone','scrap','fuel','pallets'] as const){const amount=w.bag[k];if(amount&&removeCarried(w,k,amount))w.stock[k]+=amount}
  w.camp.storage.openedUntil=t+.8;
  effect(w,'deposit',w.camp.storage,'SUPPLIES STORED');return true;
 }
 if(action==='stoke'){if(!feedFire(w))return false;effect(w,'build',w.camp.hearth,'+90s FIRE');return true}
 if(action==='collectFood'){const n=collectFood(w);if(!n)return false;effect(w,'pickup',w.player,`${n} MEALS PACKED`);return true}
 if(action==='drink'){
  if(campAction(w)!=='drink'||t<w.drinkReady)return false;
  if(w.thirst>=100)return false;w.thirst=100;w.drinkReady=t+2;effect(w,'pickup',w.player,'WATER RESTORED');return true;
 }
 if(action==='eat'){const provision=!food&&heldProvision(w);if(provision)return consumeProvision(w,provision);const species=food??(w.player.equipped==='venisonMeal'?'venison':w.player.equipped==='rabbitMeal'?'rabbit':'chicken');if(!eatMeal(w,species))return false;effect(w,'pickup',w.player,'MEAL EATEN');return true}
 if(action==='cook'){const raw=food??(nextRawFood(w)==='rawRabbit'?'rabbit':nextRawFood(w)==='rawVenison'?'venison':'chicken');if(!queueFood(w,raw))return false;effect(w,'build',w.camp.hearth,'FOOD QUEUED');return true}
 if(action==='torch'){if(!w.tools.torch)return false;w.torchOn=!w.torchOn;return true}
 if(action==='search'){const f=searchTarget(w);if(!f||!f.search)return false;w.searched.push(f.id);w.loot.push({...f.front,id:w.serial++,kind:f.search,amount:f.amount!});effect(w,'build',f.front,'FOUND');return true}
 if(action==='shutter'){if(distance(w.player,SHUTTER_CONTROL)>125||!powered(w)||t<w.shutterReady||[w.player,...w.enemies,...w.animals].some(p=>circleRect(p.x,p.y,19,SHUTTER_BODY.x,SHUTTER_BODY.y,SHUTTER_BODY.hw,SHUTTER_BODY.hh)))return false;w.shutterUntil=t+12;w.shutterReady=t+20;w.generator.fuel=Math.max(0,w.generator.fuel-3);effect(w,'build',SHUTTER,'SEALED');return true}
 if(action==='crusher'){if(distance(w.player,CRUSHER_CONTROL)>110||!powered(w)||t<w.crusherReady)return false;w.crusherUntil=t+1;w.crusherReady=t+9;w.generator.fuel=Math.max(0,w.generator.fuel-3);for(const e of w.enemies)if(distance(e,CRUSHER)<185)e.hp=0;removeDead(w);effect(w,'hit',CRUSHER);w.shakeUntil=t+.25;return true}
 if(!nearBase(w))return false;
 if(action==='fuel'){const amount=Math.min(25,w.stock.fuel,100-w.generator.fuel);if(amount<=0)return false;w.stock.fuel-=amount;w.generator.fuel+=amount;effect(w,'deposit',BASE,'+FUEL');return true}
 if(action==='repair'){if(!w.tools.hammer||w.stock.scrap<4||w.generator.hp>=w.generator.maxHp)return false;w.stock.scrap-=4;w.generator.hp=Math.min(w.generator.maxHp,w.generator.hp+55);effect(w,'build',BASE,'REPAIRED');return true}
 if(action==='upgrade'){const cost=8*w.generator.level;if(w.stock.scrap<cost||w.generator.level>=3)return false;w.stock.scrap-=cost;w.generator.level++;w.generator.maxHp+=60;w.generator.hp+=60;effect(w,'build',BASE,'UPGRADED');return true}
 if(action==='barricade'){if(w.layout)return false;if(w.stock.pallets<4||w.barrierHp>=120||[w.player,...w.enemies,...w.animals].some(p=>circleRect(p.x,p.y,19,BARRICADE_BODY.x,BARRICADE_BODY.y,BARRICADE_BODY.hw,BARRICADE_BODY.hh)))return false;w.stock.pallets-=4;w.barrierHp=120;effect(w,'build',BARRICADE,'BARRICADE');return true}return false;
}
export function damagePlayer(w:World,amount:number,environmental=false,source?:Vec){const t=timeOf(w),p=w.player;if(p.downedUntil||(!environmental&&(t<p.hurtUntil||(w.dodge&&t-w.dodge.started<COMBAT_DODGE.invulnerable))))return false;const applied=Math.min(p.hp,amount);p.hp=Math.max(0,p.hp-amount);if(!environmental){p.hurtUntil=t+.7;w.shakeUntil=t+.18}effect(w,'damage',p,w.combatTest?`−${Math.round(applied*10)/10}`:'',{target:environmental?undefined:'player',amount:applied,angle:source?Math.atan2(p.y-source.y,p.x-source.x):undefined});if(w.combatStats)w.combatStats.damageTaken+=applied;if(p.hp===0){releaseBruteGrab(w,'',false);if(environmental)w.cause=w.thirst<=0?'DEHYDRATION':'STARVATION';w.dodge=undefined;p.downedUntil=t+14;announce(w,w.combatTest?'DOWNED':p.lifeline?'DOWNED · CRAWL TO THE GENERATOR':'DOWNED · HOLD ON UNTIL DAWN',3)}return true}
/** Needs damage is batched once a second and bypasses combat invulnerability.
 * It never adds camera shake or hurt flashing to every simulation frame. */
export function stepPlayerSurvival(w:World){
 if(!needsActive(w)||w.phase==='over'||w.player.downedUntil||w.player.hp<=0)return;
 const t=timeOf(w),damage=stepSurvivalNeeds(w,STEP,t),state=w.survival!;
 if(damage>0){
  if(!state.pendingDamage)w.needsDamageAt=t+1;
  state.pendingDamage=(state.pendingDamage||0)+damage;
  if(t>=w.needsDamageAt){const amount=state.pendingDamage;state.pendingDamage=0;state.healthRecoveryAt=t+SURVIVAL_BALANCE.healthRecoveryDelay;damagePlayer(w,amount,true)}
 }else state.pendingDamage=0;
}
function enemyStep(w:World,e:Enemy){const BASE=worldBase(w),SHUTTER=worldMachine(w,'shutter');const t=timeOf(w),p=w.player;let target:Vec=distance(e,p)<(e.id%3===0?110:240)&&!p.downedUntil||w.generator.hp<=0?p:BASE;
 if(t<w.shutterUntil&&e.y<SHUTTER.y+75&&Math.abs(e.x-SHUTTER.x)<130){target={x:SHUTTER.x,y:SHUTTER.y-25};if(distance(e,target)<60)return}
 if(w.barrierHp>0&&e.x<BARRICADE.x+80&&Math.abs(e.y-BARRICADE.y)<145){target=BARRICADE;if(distance(e,target)<72){if(t>=e.attackAt){w.barrierHp=Math.max(0,w.barrierHp-12);e.attackAt=t+1.1;effect(w,'hit',BARRICADE)}return}}
 const range=target===BASE?112:target===p?49:30;if(distance(e,target)<range&&lineClear(e,target,w)){if(t>=e.attackAt){e.attackAt=t+1.15;if(target===BASE){w.generator.hp=Math.max(0,w.generator.hp-7-w.round);effect(w,'damage',BASE)}else if(target===p)damagePlayer(w,11+w.round)}return}
 if(t>=e.repathAt||!e.path.length){e.path=pathTo(e,target,w);e.repathAt=t+.6}
 let next=e.path[0]||target;if(distance(e,next)<14){e.path.shift();next=e.path[0]||target}const d=distance(e,next)||1,speed=(73+Math.min(55,w.round*5))*(inCampLight(w,e)?.66:1.18);moveBody(w,e,(next.x-e.x)/d*speed*STEP,(next.y-e.y)/d*speed*STEP,12);
}
export function stepWorld(w:World,input:Vec,attackHeld=false,sprint=false){stepGates(w,STEP);if(w.phase==='over')return;w.tick++;const t=timeOf(w);w.phaseLeft=Math.max(0,w.phaseLeft-STEP);movePlayer(w,input,sprint);stepWaypoint(w);stepPuddles(w,STEP);const p=w.player;
 if(p.downedUntil){if(nearBase(w)&&p.lifeline){p.revive+=STEP;if(p.revive>=2){p.lifeline--;p.downedUntil=0;p.revive=0;p.hp=50;p.hurtUntil=t+2;w.revives++;effect(w,'dawn',p,'BACK ON YOUR FEET')}}else p.revive=0;if(p.downedUntil&&t>=p.downedUntil){w.phase='over';w.cause='THE CREW WENT DOWN';return}}
 else if(attackHeld)attack(w,true);
 stepAxe(w);stepSpear(w);stepSword(w);stepBow(w);
 if(w.generator.hp>0&&w.generator.fuel>0)w.generator.fuel=Math.max(0,w.generator.fuel-(w.phase==='night'?.65*(1+w.round*.08)/(1+(w.generator.level-1)*.22):.025)*STEP);
 if(w.phase==='night'){
 const total=Math.min(32,5+w.round*2);if(t>=w.nextSpawn&&w.spawned<total){const configured=w.layout?roleItems(w.layout,'enemySpawn'):[],points=configured.length?configured:ENTRANCES;const pos=points[w.spawned%points.length];const safePos=w.layout?findOpen(w,pos):pos,hp=45+w.round*4;w.enemies.push({...safePos,id:w.serial++,hp,maxHp:hp,attackAt:t+1,path:[],repathAt:0,flashUntil:0});w.spawned++;w.nextSpawn=t+(w.spawned%3?1.2:Math.max(3,11-w.round*.4))}
 if(!w.nightFuelSpawned&&w.phaseLeft<30){w.nightFuelSpawned=true;w.loot.push({...(w.layout?findOpen(w,EMERGENCY_FUEL):EMERGENCY_FUEL),id:w.serial++,kind:'fuel',amount:25})}
 for(const e of w.enemies)enemyStep(w,e);
 }
 stepPlayerSurvival(w);
 stepBonfireCooking(w);
 for(const animal of w.animals)animalStep(w,animal);
 stepFoliage(w,STEP);
 w.effects=w.effects.filter(e=>t-e.born<1.2);
 if(w.phaseLeft<=0){if(w.phase==='day')beginNight(w);else dawn(w)}
}
export function readProgress(){try{const p=JSON.parse(localStorage.getItem('safety-last-survival-v1')||'{}');return{best:Number.isFinite(p.best)?p.best:0,runs:Number.isFinite(p.runs)?p.runs:0}}catch{return{best:0,runs:0}}}
export function finishRun(w:World):SurvivalRun{const p=readProgress(),best=Math.max(p.best,w.survived);try{localStorage.setItem('safety-last-survival-v1',JSON.stringify({best,runs:p.runs+1}))}catch{}return{nights:w.survived,best,newBest:w.survived>p.best,scrap:w.scrap,kills:w.kills,reward:w.survived*20+w.kills*2,revives:w.revives,cause:w.cause,seconds:Math.floor(timeOf(w))}}

// Interactions use clear approach points, so walls cannot grant access to water or cooking.
export const WELL_FRONT={x:WELL_POINT.x,y:WELL_POINT.y+65},FIRE_FRONT={x:FIRE_POINT.x,y:FIRE_POINT.y+65};
export function campAction(w:World):'drink'|'cook'|'deposit'|null{const options=[{kind:'drink' as const,p:stationFront(w.camp,'well')},{kind:'cook' as const,p:stationFront(w.camp,'hearth')},{kind:'deposit' as const,p:stationFront(w.camp,'storage')}];return options.filter(o=>buildingRestored(w,o.kind==='drink'?'well':o.kind==='cook'?'fire':'headquarters')&&distance(w.player,o.p)<115&&lineClear(w.player,o.p,w)).sort((a,b)=>distance(w.player,a.p)-distance(w.player,b.p))[0]?.kind||null}
export function fireLabel(w:World){return w.camp.hearth.fuel<=0?'FIRE OUT · ADD WOOD':w.fire.ready?'MEALS READY':w.fire.cookUntil>0?'COOKING '+Math.ceil(w.fire.cookUntil-timeOf(w))+'s':'COOKING FIRE'}
export function stepBonfireCooking(w:World){stepKitchen(w);stepFurnaces(w)}

/** Shared harvest path: a corpse cannot award a second drop. */
export function hitAnimal(w:World,a:Animal,damage:number){
 if(a.hp<=0||damage<=0)return false;
 const t=timeOf(w),before=a.hp,applied=Math.min(before,damage);a.maxHp??=before;a.healthFrom=before;a.lastHitAt=t;a.hp=Math.max(0,before-damage);a.flashUntil=t+.18;effect(w,'hit',a,String(applied),{target:'animal',amount:applied,lethal:a.hp===0,angle:Math.atan2(a.y-w.player.y,a.x-w.player.x)});
 const motion=a.predator||a.deer||a.rabbit||a.chicken;if(motion){motion.hitAt=t;a.moving=false}
 if(a.hp<=0){
  w.loot.push({x:a.x,y:a.y,id:w.serial++,wildlifeSlot:a.wildlife?.slot,kind:a.predator||a.deer?'rawVenison':a.rabbit?'rawRabbit':'rawMeat',amount:a.predator?(a.predator.kind==='boar'?3:2):a.deer?(a.deer.kind==='stag'?3:2):1});effect(w,'build',a,a.predator||a.deer?'RAW WILD MEAT':a.rabbit?'RAW RABBIT':a.chicken?'RAW CHICKEN':'RAW MEAT');
  if(motion)motion.deadAt=t;
  else w.animals=w.animals.filter(other=>other.id!==a.id);
 }
 return true;
}
const animalHomes=(w:World)=>w.layout?roleItems(w.layout,'animal'):ANIMAL_POINTS;
function seedAnimals(w:World){animalHomes(w).forEach((p,home)=>{if(!w.animals.some(a=>a.home===home))w.animals.push({...p,id:w.serial++,home,hp:48,maxHp:48,moving:false,right:true,flashUntil:0})})}
function animalStep(w:World,a:Animal){const t=timeOf(w),home=animalHomes(w)[a.home]||a,flee=distance(a,w.player)<170&&!w.player.downedUntil;let dx=0,dy=0;
 if(distance(a,home)>210){dx=home.x-a.x;dy=home.y-a.y}else if(flee){dx=a.x-w.player.x;dy=a.y-w.player.y}else if(Math.sin(t*.75+a.home*2)>.1){const angle=Math.floor(t/3+a.home)*2.399+a.home;dx=Math.cos(angle);dy=Math.sin(angle)}
 const d=Math.hypot(dx,dy);a.moving=d>0;if(!d)return;const speed=flee?155:48;a.right=dx>=0;moveBody(w,a,dx/d*speed*STEP,dy/d*speed*STEP,12);
}

function findOpen(w:World,p:Vec):Vec{for(let r=0;r<500;r+=45)for(let i=0;i<12;i++){const q={x:p.x+Math.cos(i*Math.PI/6)*r,y:p.y+Math.sin(i*Math.PI/6)*r};if(!worldBlocked(w,q.x,q.y,21))return q}return {...w.player};}
import type {SurvivorAppearance} from './survivor-cosmetics';
