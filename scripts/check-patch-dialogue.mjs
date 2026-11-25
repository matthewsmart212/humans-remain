import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'patch-dialogue-'));
try{
 const file=path.join(temporary,'model.cjs');
 await build({stdin:{contents:['patch-dialogue','patch-quest','survival-engine','world-layout'].map(id=>`export * from './src/${id}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:file,logLevel:'error'});
 const m=createRequire(import.meta.url)(file),world=m.createWorld(m.emptyLayout());
 world.progression={};world.editorPreview=true;
 const state=m.ensurePatchQuest(world);assert(state);
 const ids=['supplies','identity','reclamation','damage'];
 assert.deepEqual(m.patchDialogueTopics(world),[],'An undiscovered companion reveals no optional conversation');
 for(const id of ids)assert.equal(m.patchDialogueReply(world,id),undefined);

 state.discovered=true;
 assert.deepEqual(m.patchDialogueTopics(world).map(topic=>topic.id),ids);
 const unchanged=()=>{
  const before=JSON.stringify(world);
  const opening=m.patchOpeningLine(world);assert(opening.length>0);
  for(const topic of m.patchDialogueTopics(world)){
   assert(topic.label.length>0);assert(m.patchDialogueReply(world,topic.id)?.length>0);
  }
  assert.equal(JSON.stringify(world),before,'Conversation cannot alter commands, rewards, repair, bag or saved quest progress');
 };
 unchanged();const damagedOpening=m.patchOpeningLine(world);
 state.servoClaimed=true;unchanged();assert.notEqual(m.patchOpeningLine(world),damagedOpening,'The greeting acknowledges the recovered part');
 state.servoInstalled=true;unchanged();
 assert(!m.patchDialogueTopics(world).some(topic=>topic.id==='damage'));
 assert.equal(m.patchDialogueReply(world,'damage'),undefined,'A stale selected damage question is rejected after repair');
 assert(m.patchStatus(world).canRecruit&&!m.patchStatus(world).canCommand,'Conversation does not bypass recruitment or homecoming');
 const numberReply=m.patchDialogueReply(world,'identity');
 state.recruited=true;unchanged();assert(!m.patchStatus(world).canCommand);
 state.returnedToCamp=true;state.suppliesDelivered=true;unchanged();
 assert.notEqual(m.patchDialogueReply(world,'identity'),numberReply,'The nickname belongs to the completed homecoming');
 const greetings=[];
 for(const command of ['follow','stay','camp']){
  state.command=command;unchanged();greetings.push(m.patchOpeningLine(world));
 }
 assert.equal(new Set(greetings).size,3,'The greeting reflects the selected command');
 assert.equal(m.patchDialogueReply(world,'unknown'),undefined,'Unknown topics cannot select an arbitrary answer');
 console.log('PASS: Patch optional dialogue discovery/repair/homecoming gates, stale topic rejection, command-specific greetings and unchanged world state.');
}finally{fs.rmSync(temporary,{recursive:true,force:true})}
