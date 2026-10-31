import {MAX_LAYOUT_ITEMS} from './layout-limits';
import plan from './camp-perimeter-layout.json';
import oldWalls from './wall-artwork-replacements.json';
import {usesPaintedHomeTerrain} from './terrain-art';
import type {Placement,WorldLayout} from './world-layout';
const oldIds=new Set(oldWalls.flatMap(a=>[a.entryId,'wall-t2-'+a.entryId]));
const isCampGate=(p:Placement)=>p.id.startsWith('camp-original-gate-')||p.assetId.startsWith('camp_gate_')||p.frame?.sourceAssetId.startsWith('camp_gate_');
/** Keep the original walls; v4 removes only gates from an already restored camp. */
export function addApprovedCampPerimeter(layout:WorldLayout):WorldLayout{
 if(layout.campPerimeterVersion===4||!usesPaintedHomeTerrain(layout.terrainImage)||!layout.items.some(p=>p.id==='06c42057-0d46-43ef-977b-f183d7c50561'&&p.role==='hearth'))return layout;
 // Never restore/reposition walls or undo the owner's edits in a v3 camp.
 if(layout.campPerimeterVersion===3)return {...layout,campPerimeterVersion:4,items:layout.items.filter(p=>!isCampGate(p)),updatedAt:new Date().toISOString()};
 const keep=layout.items.filter(p=>!oldIds.has(p.assetId)&&!oldIds.has(p.frame?.sourceAssetId||'')&&!p.id.startsWith('camp-perimeter-v3-')&&!p.id.startsWith('camp-original-gate-'));
 const walls=(plan.placements as Placement[]).filter(p=>!isCampGate(p));
 const withoutGates=keep.filter(p=>!isCampGate(p));
 if(withoutGates.length+walls.length>MAX_LAYOUT_ITEMS)return layout;
 const ids=new Set(keep.map(p=>p.id));
 return {...layout,campPerimeterVersion:4,items:[...withoutGates,...walls.filter(p=>!ids.has(p.id))],updatedAt:new Date().toISOString()};
}
