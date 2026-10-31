import {FORGE_RECIPES,craftCategory,CRAFT_CATEGORIES} from './forge-recipes';
import {smithyAccess,smithyCraftStatus,craftSmithyGear,SMITHY_IMAGE} from './camp-smithy';
import {GEAR,gear,type GearKind} from './player-gear';
import {packLoad} from './expedition-inventory';
import {recipeIngredients} from './craft-material-view';
import type {World} from './survival-engine';

const notes:Record<GearKind,string>={repairHammer:'Restore camp ruins on site.',
 woodenPickaxe:'Break ordinary boulders into stone. A simple start for mining.',metalPickaxe:'Break boulders faster and mine iron-veined deposits.',
 woodenAxe:'A light wooden axe for gathering timber.',axe:'A sturdy steel axe. The fastest tool for chopping trees.',
 woodenKnife:'A light blade for quick, close-range hunting.',scrapKnife:'A sharp steel blade for fast, close-range attacks.',
 woodenSpear:'A sharpened timber spear. Keep animals and robots at a distance.',metalSpear:'A reinforced steel point for stronger, long-range thrusts.',
 woodenSword:'A carved timber blade for short, precise thrusts.',metalSword:'A salvaged steel blade for powerful, close-range thrusts.',
 bow:'A makeshift hunting bow. Carry arrows and hunt from a distance.',arrows:'Steel-tipped arrows. Each shot uses one; craft a bundle of ten.',
};
export function smithyView(w:World){
 if(!w.smithyId||w.stationPanel!=='smithy')return null;
 const load=packLoad(w),g=gear(w);
 return{image:SMITHY_IMAGE,categories:CRAFT_CATEGORIES,access:smithyAccess(w),weight:load.weight,loadLabel:load.label,
  recipes:FORGE_RECIPES.map(r=>{const item=GEAR[r.id],status=smithyCraftStatus(w,r.id);return{...r,category:craftCategory(r.id),image:item.image,description:notes[r.id],owned:g.bag[r.id]??0,stored:g.chest[r.id]??0,weight:item.weight*r.count,stat:r.id==='arrows'?['Makes','10 arrows']:['woodenPickaxe','metalPickaxe'].includes(r.id)?['Rock damage',String(item.damage)]:['Damage',String(item.damage)],ingredients:recipeIngredients(w,r.cost),status,canCraft:status==='Ready to craft',craft:()=>craftSmithyGear(w,r.id)}}),
  hint:'Uses backpack materials first, then camp stores. Crafted equipment goes into your backpack.',
 };
}
