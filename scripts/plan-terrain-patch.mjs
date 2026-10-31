// Read-only design brief for the next adjoining ground batch. It never unlocks
// terrain, changes saved objects or creates background artwork.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-plan-'));
try{
 await build({stdin:{contents:"export * from './src/world-master-plan';export * from './src/world-plan-geometry';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'plan.cjs')});
 const p=createRequire(import.meta.url)(path.join(temp,'plan.cjs')),id=process.argv[2]||'A1',batch=p.WORLD_PLAN_BATCHES.find(b=>b.id===id);
 if(!batch)throw Error('Choose a batch: '+p.WORLD_PLAN_BATCHES.map(b=>b.id).join(', '));
 console.log(JSON.stringify({...batch,routeContacts:p.patchRouteContacts(batch.bounds),instructions:['Preserve the camp coordinates, placements and source-pixel scale.','Inspect actual adjacent artwork at every contact; built route coordinates are surveyed guides.','Follow the planned destinations and widths; add no road merely to connect tile edges.','Keep buildings, water, rocks, foliage and resources separate.','Use close-up native-detail passes, lossless registered contacts and renderer checks.','Do not open unbuilt ground or alter the runtime footprint until finished artwork is integrated.']},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
