import {FORGE_RECIPES,craftCategory,CRAFT_CATEGORIES} from './forge-recipes';
import {smithyAccess,smithyCraftStatus,craftSmithyGear,SMITHY_ID,SMITHY_IMAGE} from './camp-smithy';
import {GEAR,gear,type GearKind} from './player-gear';
import {ASSET_BY_ID} from './world-assets';
import {recipeIngredients} from './craft-material-view';
import type {World} from './survival-engine';

const notes:Record<GearKind,string>={fishingRod:'Cast from Stillwater pier and bring fresh fish back to camp.',repairHammer:'Restore camp ruins on site.',
 woodenPickaxe:'Break ordinary boulders into stone. A simple start for mining.',metalPickaxe:'Break boulders faster and mine iron-veined deposits.',
 woodenAxe:'A light wooden axe for gathering timber.',axe:'A sturdy steel axe. The fastest tool for chopping trees.',
 woodenKnife:'A light blade for quick, close-range hunting.',scrapKnife:'A sharp steel blade for fast, close-range attacks.',
 woodenSpear:'A sharpened timber spear. Keep animals and robots at a distance.',metalSpear:'A reinforced steel point for stronger, long-range thrusts.',
 woodenSword:'A carved timber blade for short, precise thrusts.',metalSword:'A salvaged steel blade for powerful, close-range thrusts.',
 bow:'A makeshift hunting bow. Carry arrows and hunt from a distance.',arrows:'Steel-tipped arrows. Each shot uses one; craft a bundle of ten.',
};
export function smithyView(w:World){
 if(!w.smithyId||w.stationPanel!=='smithy')return null;
 const g=gear(w);
 return{image:ASSET_BY_ID.get(SMITHY_ID)?.image??SMITHY_IMAGE,categories:CRAFT_CATEGORIES,access:smithyAccess(w),
  recipes:FORGE_RECIPES.map(r=>{
   const item=GEAR[r.id],status=smithyCraftStatus(w,r.id),ingredients=recipeIngredients(w,r.cost);
   return {...r,category:craftCategory(r.id),image:item.image,description:notes[r.id],owned:g.bag[r.id]??0,
    stored:g.chest[r.id]??0,weight:item.weight*r.count,stat:r.id==='arrows'?['Makes','10 arrows']:
     ['woodenPickaxe','metalPickaxe'].includes(r.id)?['Rock damage',String(item.damage)]:['Damage',String(item.damage)],
    ingredients,costLabel:ingredients.map(m=>`${m.name} ×${m.needed}`).join(' · '),
    status,canCraft:status==='Ready to craft',craft:()=>craftSmithyGear(w,r.id)};
  }),
  hint:'Uses backpack materials first, then camp stores. Crafted equipment goes into your backpack.',
 };
}
