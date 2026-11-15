import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

// Pure regression: no requests, no player saves, no mutation of real world JSON.
const modules=['world-tiers','world-assets','world-layout','imported-art','camp-garden-placement'];
const compiled=await build({stdin:{contents:modules.map(m=>`export * from './src/${m}';`).join(''),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const garden=m.newPlacement('art_camp_garden_broken',1700,1700),base={...m.emptyLayout(),items:[garden]};
const source=JSON.stringify(base);
assert.deepEqual(m.tierOptions(garden.assetId).map(o=>o.tier),[0,1],'garden offers only broken and repaired');
assert(!m.tierOptions(garden.assetId).some(t=>t.tier===2),'retired Tier 2 is not selectable');

// A first repair retains the existing location; repairing does not move the lot.
const repaired=m.changePlacementTier(base,garden.id,1);
assert.equal(repaired.items[0].x,garden.x);
assert.equal(repaired.items[0].tierPositions,undefined,'tier switching alone does not bloat old world files');
const movedRepaired=m.rememberTierMove(repaired.items[0],{x:garden.x+130,y:garden.y-70});
assert.deepEqual(movedRepaired.tierPositions.base,{x:garden.x,y:garden.y});
assert.deepEqual(movedRepaired.tierPositions['1'],{x:movedRepaired.x,y:movedRepaired.y});
const different={...repaired,items:[movedRepaired]};
const broken=m.changePlacementTier(different,garden.id,0);
assert.equal(broken.items[0].x,garden.x,'broken-state coordinates are preserved');
assert.equal(broken.items[0].y,garden.y,'broken-state height is preserved');
const again=m.changePlacementTier(broken,garden.id,1);
assert.deepEqual({x:again.items[0].x,y:again.items[0].y},{x:movedRepaired.x,y:movedRepaired.y},'repaired state restores its own position');
const editedBroken=m.rememberTierMove(broken.items[0],{x:garden.x-55});
const editedLayout={...broken,items:[editedBroken]};
assert.equal(m.changePlacementTier(editedLayout,garden.id,1).items[0].x,movedRepaired.x,'moving broken state does not change repaired position');
assert.equal(m.changePlacementTier(editedLayout,garden.id,0),editedLayout,'selecting current state is a no-op');
const validated=m.validateLayout(JSON.parse(JSON.stringify(editedLayout)));
assert.deepEqual(validated.errors,[],'layout with separate tier positions validates');
assert.deepEqual(validated.layout.items[0].tierPositions,editedBroken.tierPositions,'roundtrip retains every saved tier position');
assert.deepEqual(validated.layout.items[0].frame,editedBroken.frame,'existing fixed artwork frame survives');

// Duplicate offsets the saved broken and repaired positions together.
const offset={x:180,y:90};
const copy=m.translateTierPositions(again.items[0],{x:again.items[0].x+offset.x,y:again.items[0].y+offset.y},p=>p);
assert.deepEqual(copy.tierPositions.base,{x:garden.x+offset.x,y:garden.y+offset.y});
assert.deepEqual(copy.tierPositions['1'],{x:again.items[0].x+offset.x,y:again.items[0].y+offset.y});
const malformed=structuredClone(editedLayout);
malformed.items[0].tierPositions['1']={x:Infinity,y:25};
assert(m.validateLayout(malformed).errors.length,'invalid per-tier coordinates cannot publish');
malformed.items[0].tierPositions['1']={x:garden.x,y:garden.y};
malformed.items[0].tierPositions.__proto__={x:1,y:1};
malformed.items[0].tierPositions.extra={x:garden.x,y:garden.y};
assert(m.validateLayout(malformed).errors.length,'unrecognized tier keys cannot publish');
assert.equal(JSON.stringify(base),source,'tier edits never mutate the authored source');

// An older Tier 2 save migrates into the single repaired state without moving the lot.
const legacy=m.newPlacement('art_camp_garden_t2',1890,1750);
legacy.frame={sourceAssetId:'art_camp_garden_t2',width:340,height:340,anchor:[.5,.90]};
const oldLayout={...m.emptyLayout(),potatoGardenVersion:1,items:[legacy]};
const migrated=m.addApprovedCampGarden(oldLayout);
assert.equal(migrated.items[0].assetId,'art_camp_garden_t1','old upgrade becomes repaired garden');
assert.equal(migrated.items[0].frame.sourceAssetId,'art_camp_garden_t1','old tier frame is remapped');
assert.equal(migrated.items[0].x,1890,'existing garden position is preserved');
assert.equal(migrated.items[0].y,1750,'existing garden height is preserved');
assert.equal(m.addApprovedCampGarden(migrated),migrated,'migration remains idempotent');
assert.deepEqual(m.validateLayout(migrated).errors,[],'migrated garden validates');
assert.equal(oldLayout.items[0].assetId,'art_camp_garden_t2','migrating does not mutate save input');

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
console.log('PASS: two-state garden, legacy Tier 2 migration, independent repair positions, wall segments, saves, and offset duplicates.');
