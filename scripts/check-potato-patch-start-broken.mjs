import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';

// Regression: gameplay uses editorPreview=true even in survival. The garden
// must obey progression restoration, not whichever art tier the editor saved.
const modules=['studio-play','authored-world','imported-art','potato-patch-renderer','potato-patch-art','camp-restoration'];
const compiled=await build({stdin:{contents:modules.map(m=>`export * from './src/${m}';`).join(''),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const snapshot=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json','utf8'));
m.installImportedArt(snapshot.records);
const layout=m.prepareAuthoredWorld(snapshot.layout);
const game=m.createCampPlaySession(layout,undefined,'survival');
const garden=game.layout.items.find(p=>p.id==='camp-garden-v1'||p.assetId.startsWith('art_camp_garden_'));
assert(garden,'The current camp includes the garden');
assert.equal(game.editorPreview,true,'Regression uses the real game preview flag');
assert(game.progression,'The survival run has a progression state');
assert(!m.buildingRestored(game,'garden'),'The patch is not repaired at the start of a new run');
assert.equal(m.potatoPatchImageForWorld(game,garden.assetId),m.POTATO_PATCH_BROKEN,'Day 1 shows broken garden even when the layout selected repaired art');

// A normal repair is the ONLY event switching the art to the repaired state.
game.progression.restoredBuildings.push('headquarters','well','fire','garden');
game.progression.campLevel=2;
assert(m.buildingRestored(game,'garden'),'Garden repair registered');
assert.equal(m.potatoPatchImageForWorld(game,garden.assetId),m.potatoStageUrl(1,0),'Repaired plot uses four-bed asset');
game.progression.buildingHp={garden:0};
assert.equal(m.potatoPatchImageForWorld(game,garden.assetId),m.POTATO_PATCH_BROKEN,'Destroyed garden appears broken again');

// The editor still previews explicitly chosen tiers when no game run is active.
const preview={...game,progression:undefined,editorPreview:true};
assert.equal(m.potatoPatchImageForWorld(preview,'art_camp_garden_broken'),m.POTATO_PATCH_BROKEN,'Editor broken choice previews broken');
assert.equal(m.potatoPatchImageForWorld(preview,'art_camp_garden_t1'),m.potatoStageUrl(1,0),'Editor repaired choice previews repaired');
console.log('PASS: Day 1 broken, repair restores, destruction breaks, and editor previews preserved.');
