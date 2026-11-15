import {GARDEN_ART,GARDEN_IDS,GARDEN_LEGACY_ID,GARDEN_PLACEMENT_ID} from './camp-garden-art';
import {MAX_LAYOUT_ITEMS} from './layout-limits';
import {newPlacement,type Placement,type WorldLayout} from './world-layout';

/** Retired Tier 2 saves become the normal four-bed garden in place, even when
 * the player previously moved it in the editor. Never relocate an existing lot. */
function migrateLegacyGarden(p:Placement):Placement{
 const assetId=p.assetId===GARDEN_LEGACY_ID?'art_camp_garden_t1':p.assetId;
 const frame=p.frame?.sourceAssetId===GARDEN_LEGACY_ID?{...p.frame,sourceAssetId:'art_camp_garden_t1'}:p.frame;
 return assetId===p.assetId&&frame===p.frame?p:{...p,assetId,...(frame?{frame}:{})};
}

/** Place the initial broken plot once; retain authored owner moves/removals. */
export function addApprovedCampGarden(layout:WorldLayout):WorldLayout{
 const migrated=layout.items.map(migrateLegacyGarden);
 if(layout.potatoGardenVersion===1)return migrated.every((p,i)=>p===layout.items[i])?layout:{...layout,items:migrated,updatedAt:new Date().toISOString()};
 const puddle=migrated.find(p=>p.id==='camp-puddle-v1-4');
 const original=migrated.find(p=>p.id===GARDEN_PLACEMENT_ID||GARDEN_IDS.has(p.assetId));
 const x=puddle?puddle.x+490:original?.x??840,y=puddle?puddle.y+315:original?.y??1345;
 const items=original?migrated.map(p=>p===original?{...p,x,y,assetId:GARDEN_ART[0].id,scale:1,locked:true,allowTransparency:false,solid:false}:p):
   migrated.length<MAX_LAYOUT_ITEMS?[...migrated,{...newPlacement(GARDEN_ART[0].id,x,y),id:GARDEN_PLACEMENT_ID,locked:true,allowTransparency:false,solid:false}]:migrated;
 return {...layout,campGardenVersion:1,potatoGardenVersion:1,items,updatedAt:new Date().toISOString()};
}
