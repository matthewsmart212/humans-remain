import {furnaceView} from './furnace-view';
import {stepFurnaces} from './camp-furnace';
import {canCarryCount} from './expedition-inventory';
import {SMELT_RECIPES,type SmeltRecipe} from './ironworks-data';
import type {World} from './survival-engine';

type FurnaceView=NonNullable<ReturnType<typeof furnaceView>>;

/** UI quantities are ingots/jobs, bounded by both stock and free queue slots. */
export function furnaceBatchSelection(view:FurnaceView,id:SmeltRecipe,quantity:number){
 const recipe=view.recipes.find(r=>r.id===id)??view.recipes[0],input=SMELT_RECIPES[recipe.id];
 const free=Math.max(0,view.queueMax-view.queueSize);
 const limit=recipe.canQueue?Math.max(0,Math.min(free,Math.floor(recipe.available/input.count))):0;
 const requested=Number.isFinite(quantity)?Math.max(1,Math.floor(quantity)):1;
 const amount=Math.min(requested,Math.max(1,limit)),missing=Math.max(0,input.count*amount-recipe.available);
 const blocked=!free?'Queue full':missing?`Need ${missing} more ${recipe.id==='ore'?'ore':'scrap'}`:!recipe.canQueue?'Furnace unavailable':'';
 return{recipe,input,limit,amount,missing,blocked};
}

/** Recheck live stock on every press; existing engine actions own payment and jobs. */
export function queueFurnaceBatches(world:World,id:SmeltRecipe,quantity:number){
 if(!world.furnaceId||!Object.hasOwn(SMELT_RECIPES,id)||!Number.isFinite(quantity)||quantity<1)return 0;
 stepFurnaces(world);
 const view=furnaceView(world);if(!view)return 0;
 const selection=furnaceBatchSelection(view,id,quantity);if(!selection.limit)return 0;
 let queued=0;
 while(queued<selection.amount&&selection.recipe.queue())queued++;
 return queued;
}

export const smeltMaterialName=(id:SmeltRecipe)=>id==='ore'?'Iron ore':'Metal scrap';
export const smeltCostLabel=(id:SmeltRecipe)=>`${SMELT_RECIPES[id].count} ${id==='ore'?'ore':'scrap'} → 1 ingot`;
export const furnaceCollectCount=(world:World,view:FurnaceView)=>view.canTake?canCarryCount(world,'ironIngot',view.ready):0;
export const furnaceFuelTime=(seconds:number)=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
export const furnaceJobLabel=(label:string)=>label==='ADD WOOD'?'Needs wood':label==='TAKE INGOTS'?'Collect ingots':label==='WAITING'?'Waiting':`${label} left`;
