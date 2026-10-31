import type {World} from './survival-engine';
import {campAccessLevel,campFacilities} from './camp-levels';
import {GEAR,gear} from './player-gear';
import {HQ_BENCH_ART,headquartersPlans,planCampLevel,markBuilding} from './headquarters-model';

export const JOURNAL_IDS=['shelter','metalworking','defences'] as const;
export type JournalId=typeof JOURNAL_IDS[number];
export type JournalStep={label:string;done:boolean;planId?:string};
export type JournalObjective={id:JournalId;title:string;description:string;image:string;steps:JournalStep[]};
export function journalObjectives(w:World):JournalObjective[]{
 const p=w.progression,facilities=campFacilities(w),g=gear(w);
 const pickaxe=p?.craftedMetalPickaxe||!p||!!((g.bag.metalPickaxe??0)+(g.chest.metalPickaxe??0));
 const smelted=!p||(p.ingotsSmelted===undefined?!!(p.metalCrafted||pickaxe):(p.ingotsSmelted>0));
 return [
  {id:'shelter',title:'First shelter',description:'Restore headquarters and establish your first working facilities.',image:HQ_BENCH_ART,steps:[
   {label:'Repair headquarters · Camp level 1',done:campAccessLevel(w)>=1,planId:'shelter'},
   {label:'Restore the workshop',done:facilities.workshop,planId:'workshop'},
   {label:'Restore the warehouse',done:facilities.warehouse,planId:'warehouse'}]},
  {id:'metalworking',title:'Tools of the trade',description:'Make your first metal tool.',image:GEAR.metalPickaxe.image,steps:[
   {label:'Repair the furnace on site',done:!p||p.furnaceRestored,planId:'metalworking'},
   {label:'Smelt an iron ingot',done:smelted,planId:'metalworking'},
   {label:'Craft a metal pickaxe',done:pickaxe,planId:'equipment-metalPickaxe'}]},
  {id:'defences',title:'A growing camp',description:'Prepare your camp for the nights ahead.',image:HQ_BENCH_ART,steps:[
   {label:'Reach Camp level 2',done:campAccessLevel(w)>=2,planId:'shelter'},
   {label:'Reinforce the perimeter',done:!p||p.fortified,planId:'reinforced-camp'},
   {label:'Survive a night raid',done:!p||p.siege.ended>=1}]},
 ];
}
export const objectiveComplete=(objective:JournalObjective)=>objective.steps.every(step=>step.done);
/** Resolve camp access before sending a survivor to an unavailable plan. */
export function journalNextStep(w:World,objective:JournalObjective):JournalStep|undefined{
 const next=objective.steps.find(step=>!step.done);
 if(next&&objective.id==='metalworking'&&campAccessLevel(w)<2)return {label:'Reach Camp level 2',done:false,planId:'shelter'};
 return next;
}
export function trackObjective(w:World,id?:JournalId){
 if(!w.progression||id!==undefined&&!JOURNAL_IDS.includes(id))return false;
 w.progression.trackedObjective=id;return true;
}
export function trackedObjectiveStatus(w:World){
 const id=w.progression?.trackedObjective;if(!id)return undefined;
 const objective=journalObjectives(w).find(o=>o.id===id);if(!objective)return undefined;
 const next=journalNextStep(w,objective);
 return {title:objective.title,step:next?.label??'Objective complete',planId:next?.planId};
}
export function markTrackedObjective(w:World){
 const id=trackedObjectiveStatus(w)?.planId,plan=id&&headquartersPlans(w).find(p=>p.id===id);
 return !!plan&&markBuilding(w,campAccessLevel(w)<planCampLevel(plan)?'headquarters':plan.building);
}
export function validJournalSave(p:{trackedObjective?:unknown;ingotsSmelted?:unknown;craftedMetalPickaxe?:unknown}){
 return (p.trackedObjective===undefined||JOURNAL_IDS.includes(p.trackedObjective as JournalId))
  &&(p.ingotsSmelted===undefined||Number.isSafeInteger(p.ingotsSmelted)&&Number(p.ingotsSmelted)>=0)
  &&(p.craftedMetalPickaxe===undefined||typeof p.craftedMetalPickaxe==='boolean');
}
