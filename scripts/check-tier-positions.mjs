import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

// Pure regression: no requests, no player saves, no mutation of real world JSON.
const modules=['world-tiers','world-assets','world-layout','imported-art'];
const compiled=await build({stdin:{contents:modules.map(m=>`export * from './src/${m}';`).join(''),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const hearth=m.newPlacement('art_camp_garden_t1',1700,1700),base={...m.emptyLayout(),items:[hearth]};
const source=JSON.stringify(base);
assert(m.tierOptions(hearth.assetId).some(t=>t.tier===2&&t.available),'second potato patch tier is available');

// An unedited upgrade retains the existing location on first visit.
const tier2=m.changePlacementTier(base,hearth.id,2);
assert.equal(tier2.items[0].x,hearth.x);
assert.equal(tier2.items[0].tierPositions,undefined,'tier switching alone does not bloat old world files');
const moved2=m.rememberTierMove(tier2.items[0],{x:hearth.x+130,y:hearth.y-70});
assert.deepEqual(moved2.tierPositions.base,{x:hearth.x,y:hearth.y});
assert.deepEqual(moved2.tierPositions['2'],{x:moved2.x,y:moved2.y});
const different={...tier2,items:[moved2]};
const back=m.changePlacementTier(different,hearth.id,1);
assert.equal(back.items[0].x,hearth.x,'original tier coordinates are preserved');
assert.equal(back.items[0].y,hearth.y,'original tier height is preserved');
const again=m.changePlacementTier(back,hearth.id,2);
assert.deepEqual({x:again.items[0].x,y:again.items[0].y},{x:moved2.x,y:moved2.y},'upgraded tier restores its own position');
const edited1=m.rememberTierMove(back.items[0],{x:hearth.x-55});
const editedLayout={...back,items:[edited1]};
assert.equal(m.changePlacementTier(editedLayout,hearth.id,2).items[0].x,moved2.x,'lower tier move does not change upgrade');
assert.equal(m.changePlacementTier(editedLayout,hearth.id,1),editedLayout,'selecting current tier is a no-op');
const validated=m.validateLayout(JSON.parse(JSON.stringify(editedLayout)));
assert.deepEqual(validated.errors,[],'layout with separate tier positions validates');
assert.deepEqual(validated.layout.items[0].tierPositions,edited1.tierPositions,'roundtrip retains every saved tier position');
assert.deepEqual(validated.layout.items[0].frame,edited1.frame,'existing fixed artwork frame survives');

// Duplicate must offset all saved positions, not snap a lower tier to the
// source object's original coordinates when the duplicate changes tier.
const offset={x:180,y:90};
const copy=m.translateTierPositions(again.items[0],{x:again.items[0].x+offset.x,y:again.items[0].y+offset.y},p=>p);
assert.deepEqual(copy.tierPositions.base,{x:hearth.x+offset.x,y:hearth.y+offset.y});
assert.deepEqual(copy.tierPositions['2'],{x:again.items[0].x+offset.x,y:again.items[0].y+offset.y});
const malformed=structuredClone(editedLayout);
malformed.items[0].tierPositions['2']={x:Infinity,y:25};
assert(m.validateLayout(malformed).errors.length,'invalid per-tier coordinates cannot publish');
malformed.items[0].tierPositions['2']={x:hearth.x,y:hearth.y};
malformed.items[0].tierPositions.__proto__={x:1,y:1};
malformed.items[0].tierPositions.extra={x:hearth.x,y:hearth.y};
assert(m.validateLayout(malformed).errors.length,'unrecognized tier keys cannot publish');
assert.equal(JSON.stringify(base),source,'tier edits never mutate the authored source');

// Linked perimeter changes tiers together, but each piece tracks its own
// positions, even when another wall segment of the same shape is moved.
const wallManifest=JSON.parse(fs.readFileSync('src/wall-artwork-replacements.json','utf8'));
const records=wallManifest.slice(0,2).map((w,i)=>({
 id:w.entryId,revision:1,updatedAt:'2026-01-01T00:00:00Z',
 customAsset:{id:w.entryId,name:'Wall '+i,createdAt:'2026-01-01T00:00:00Z'},
 config:{kind:'sprite',base:{id:w.sourceId,url:'/api/asset-files/'+w.sourceId,name:'wall.png',mime:'image/png',width:w.width/2,height:w.height/2,bytes:1000},frames:[],fps:8,worldWidth:w.width/2,anchor:[.5,.94],solid:true,footprint:{width:.6,depth:.1}}
}));
m.installImportedArt(records);
const walls=records.map((r,i)=>m.newPlacement(r.id,1000+i*700,2300));
const wallLayout={...m.emptyLayout(),items:walls},walls2=m.changePlacementTier(wallLayout,walls[0].id,2);
assert(walls2.items.every(p=>m.wallIdentity(p.assetId)?.tier===2),'all perimeter parts switch together');
const movedWall=m.rememberTierMove(walls2.items[0],{x:walls2.items[0].x+80,y:walls2.items[0].y+45});
const updatedWalls={...walls2,items:[movedWall,walls2.items[1]]};
const restored=m.changePlacementTier(updatedWalls,walls[0].id,1);
assert.deepEqual(restored.items.map(p=>[p.x,p.y]),walls.map(p=>[p.x,p.y]),'lower-tier wall ring stays in its original position');
const upgraded=m.changePlacementTier(restored,walls[0].id,2);
assert.deepEqual([upgraded.items[0].x,upgraded.items[0].y],[movedWall.x,movedWall.y],'upgraded ring restores custom segment position');
assert.deepEqual([upgraded.items[1].x,upgraded.items[1].y],[walls[1].x,walls[1].y],'other segment was never moved');
assert.deepEqual(m.validateLayout(JSON.parse(JSON.stringify(upgraded))).errors,[],'perimeter positions survive export');
console.log('PASS: independent per-tier positions, wall segments, save validation, unchanged originals, and offset duplicates.');
