import {stepBuildingRepair} from './building-repair';
import {startExpedition} from './run-progression';
import {stepCampSiege} from './camp-siege';
import {seedScrapSalvage} from './scrap-salvage';
import {stockFoodChest} from './food-chest-stock';
import {stepWaypoint} from './waypoint';
import {seedWildlife,stepWildlife} from './wildlife-population';
import {startSurvivalCycle,stepSurvivalCycle} from './survival-cycle';
import {canCarryCount} from './expedition-inventory';
import {seedCampChickens,stepCampChickens} from './camp-chickens';
import {seedCampDeer,stepCampDeer} from './camp-deer';
import {seedCampPredators,stepCampPredators} from './camp-predators';
import {seedCampRabbits,stepCampRabbits} from './camp-rabbits';
import {isCookedFood,totalCooked,nextRawFood,foodName} from './food-items';
import {stepGates} from './camp-gates';
import {stepPuddles} from './puddle-motion';
import {stepOnAnimations} from './step-on-animation';
import {stepCombatEnemies} from './studio-combat';
import {emptyCombatStats} from './combat-model';
import {stepFoliage} from './foliage-motion';
import {createWorld,movePlayer,STEP,attack,stepAxe,stepSpear,stepSword,stepBow,stepPlayerSurvival,stepBonfireCooking,campAction,doAction,pickupTarget,fireLabel,type World} from './survival-engine';
import {layoutBlocked,validateLayout,type WorldLayout} from './world-layout';

/** A play session owns a snapshot. Runtime changes must never reach the draft. */
export function createCampPlaySession(draft:WorldLayout,from?:{x:number;y:number},mode:'sandbox'|'survival'='sandbox'):World {
 const checked=validateLayout(draft);
 if(!checked.layout||checked.errors.length)throw Error(checked.errors.join(' ')||'This world cannot be played yet.');
 const snapshot=JSON.parse(JSON.stringify(draft)) as WorldLayout;
 const spawn=from||snapshot.spawn;
 if(layoutBlocked(snapshot,spawn.x,spawn.y,19))throw Error('The player start is blocked. Use Set spawn to choose clear ground, then press Play.');
 snapshot.spawn={...spawn};
 const world=createWorld(snapshot);
 world.player.x=spawn.x;world.player.y=spawn.y;
 // Play the authored camp without the retired factory generator/shift loop.
 // Survival progression adds its own raids; the sandbox remains available.
 world.editorPreview=true;
 world.combatTest=true;
 world.survivalEnabled=true;
 world.combatStats=emptyCombatStats();
 world.notice='';world.noticeUntil=0;
 world.hunger=100;world.thirst=100;
 stockFoodChest(world);
 // Axes and knives start in the headquarters chest; spears and new swords are carried for testing.
 if(!seedWildlife(world)){seedCampChickens(world);
 seedCampRabbits(world);
 seedCampDeer(world);
 seedCampPredators(world); }
 seedScrapSalvage(world);
 startSurvivalCycle(world);
 if(mode==='survival')startExpedition(world);
 return world;
}

export function stepCampPlaySession(world:World,input:{x:number;y:number},sprint:boolean,swing:boolean){
 if(world.phase==='over')return;
 stepGates(world,STEP);movePlayer(world,input,sprint);stepWaypoint(world);
 world.tick++;
 stepSurvivalCycle(world,STEP);
 if(!world.scene)stepCampSiege(world);
 stepOnAnimations(world,STEP);
 const tapped=(world.attackQueuedUntil??0)>=world.tick*STEP;
 if(swing||tapped){if(attack(world,!tapped))world.attackQueuedUntil=undefined}
 if(world.attackQueuedUntil&&world.attackQueuedUntil<world.tick*STEP)world.attackQueuedUntil=undefined;
 stepAxe(world);stepSpear(world);stepSword(world);stepBow(world);stepCombatEnemies(world);stepWildlife(world);stepCampChickens(world,STEP);stepCampRabbits(world,STEP);stepCampDeer(world,STEP);stepCampPredators(world,STEP);stepBonfireCooking(world);stepFoliage(world,STEP);stepPuddles(world,STEP);
 stepBuildingRepair(world,input);
 world.effects=world.effects.filter(e=>world.tick*STEP-e.born<(e.type==='kill'&&e.enemyKind==='iron-brute'?1.7:1.2));
 if(world.survivalEnabled){stepPlayerSurvival(world);if(world.player.hp<=0){world.phase='over';world.cause||='THE CREW WENT DOWN'}}
}

export function campInteraction(world:World):{label:string;action:'pickup'|'cook'|'drink'|'deposit';disabled:boolean}|null{
 const pickup=pickupTarget(world);
 if(pickup){const fits=canCarryCount(world,pickup.kind,pickup.amount);return{label:fits?`Collect ${fits} ${foodName(pickup.kind)?.toLowerCase()|| (pickup.kind==='pallets'?'logs':pickup.kind)}`:'Backpack full · Drop or store supplies',action:'pickup',disabled:!fits}}
 const action=campAction(world);
 if(action==='cook')return{label:'Manage cooking and firewood',action,disabled:false};
 if(action==='deposit')return{label:'Open camp storage',action,disabled:false};
 if(action==='drink')return{label:'Drink from the well · Restore water',action,disabled:world.thirst>99||world.tick*STEP<world.drinkReady};
 return null;
}
export function performCampInteraction(world:World){if(world.bruteGrab)return false;
 const interaction=campInteraction(world);if(!interaction||interaction.disabled)return false;
 if(interaction.action==='cook'||interaction.action==='deposit'){world.stationPanel=interaction.action==='cook'?'fire':'storage';return true}
 return doAction(world,interaction.action);
}
