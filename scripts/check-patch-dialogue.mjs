import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'patch-dialogue-'));
try{
 const file=path.join(temporary,'model.cjs');
 await build({stdin:{contents:['patch-chat','patch-dialogue','patch-quest','survival-engine','world-layout'].map(id=>`export * from './src/${id}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:file,logLevel:'error'});
 const m=createRequire(import.meta.url)(file),world=m.createWorld(m.emptyLayout());
 world.progression={};world.editorPreview=true;
 const state=m.ensurePatchQuest(world);assert(state);
 const ids=['damage','supplies','reclamation','identity'];
 assert.deepEqual(m.patchDialogueTopics(world),[],'An undiscovered companion reveals no optional conversation');
 for(const id of ids)assert.equal(m.patchDialogueReply(world,id),undefined);

 state.discovered=true;
 assert.deepEqual(m.patchDialogueTopics(world).map(topic=>topic.id),ids);
 assert.match(m.patchDialogueReply(world,'reclamation'),/cut my receiver wire/);
 assert.match(m.patchDialogueFollowup(world,'reclamation').reply,/keep choosing/);
 const foundAlone=m.patchOpeningLine(world);state.noteRead=true;
 assert.notEqual(m.patchOpeningLine(world),foundAlone,'The first meeting remembers the folded note');
 const unchanged=()=>{
  const before=JSON.stringify(world);
  const opening=m.patchOpeningLine(world);assert(opening.length>0);
  for(const topic of m.patchDialogueTopics(world)){
   assert(topic.label.length>0);assert(m.patchDialogueReply(world,topic.id)?.length>0);
  }
  for(const topic of m.patchDialogueTopics(world)){
   const followup=m.patchDialogueFollowup(world,topic.id);
   if(followup)assert(followup.question.length&&followup.reply.length);
  }
  assert.equal(JSON.stringify(world),before,'Conversation cannot alter commands, rewards, repair, bag or saved quest progress');
 };
 unchanged();const damagedOpening=m.patchOpeningLine(world);
 state.servoClaimed=true;unchanged();assert.notEqual(m.patchOpeningLine(world),damagedOpening,'The greeting acknowledges the recovered part');
 state.servoInstalled=true;unchanged();
 assert(!m.patchDialogueTopics(world).some(topic=>topic.id==='damage'));
 assert.equal(m.patchDialogueReply(world,'damage'),undefined,'A stale selected damage question is rejected after repair');
 assert(m.patchStatus(world).canRecruit&&!m.patchStatus(world).canCommand,'Conversation does not bypass recruitment or homecoming');
 assert(m.patchDialogueTopics(world).some(t=>t.id==='drive'));
 assert.equal(m.patchDialogueReply(world,'watch'),undefined);
 const numberReply=m.patchDialogueReply(world,'identity');
 state.recruited=true;unchanged();assert(!m.patchStatus(world).canCommand);
 state.returnedToCamp=true;state.suppliesDelivered=true;unchanged();
 assert.notEqual(m.patchDialogueReply(world,'identity'),numberReply,'The nickname belongs to the completed homecoming');
 assert.match(m.patchDialogueReply(world,'watch'),/call its bearing/);
 const day=m.patchDialogueReply(world,'camp');world.phase='night';const night=m.patchDialogueReply(world,'camp');
 world.player.hp=38;assert.equal(new Set([day,night,m.patchDialogueReply(world,'camp')]).size,3,'Camp observations respond to condition and night');
 const greetings=[];
 for(const command of ['follow','stay','camp']){
  state.command=command;unchanged();greetings.push(m.patchOpeningLine(world));
 }
 assert.equal(new Set(greetings).size,3,'The greeting reflects the selected command');
 assert.equal(m.patchDialogueReply(world,'unknown'),undefined,'Unknown topics cannot select an arbitrary answer');
 // All interaction, including the receiver memory, stays at Patch's feet.
 state.position={x:1000,y:1000};Object.assign(world.player,{x:1040,y:1000,hp:100,hurtUntil:0});
 world.enemies=[];world.animals=[];world.combatTest=true;
 const startTalk=()=>{assert(m.inspectPatch(world));assert(!world.stationPanel);return m.patchChat(world)};
 assert.equal(startTalk().view,'greeting');
 const runBefore=JSON.stringify(world);
 assert(m.choosePatchChat(world,'ask'));assert(m.choosePatchChat(world,'topic:reclamation'));
 let snapshot=m.patchChat(world);const first=snapshot,lines=[snapshot.line];
 assert.equal(m.patchSpeech({...world}),snapshot.line,'The world renderer reads the live page from an interpolated frame');
 while(snapshot.choices.some(c=>c.id==='more')){
  assert(m.choosePatchChat(world,'more',snapshot));snapshot=m.patchChat(world);lines.push(snapshot.line);
 }
 assert.equal(lines.join(' '),m.patchDialogueReply(world,'reclamation'));
 assert(lines.length>1&&lines.every(l=>l.length<=78),'Full replies are split at readable pauses');
 assert(!m.choosePatchChat(world,'more',first),'Stale touches cannot turn a new page');
 assert(m.choosePatchChat(world,'followup'));assert(m.patchChat(world).line.includes('thank you'));
 assert(m.choosePatchChat(world,'back'));assert.equal(m.patchChat(world).line,snapshot.line,'Back returns to the last page of the previous reply');
 while(m.patchChat(world).pageIndex>0)assert(m.choosePatchChat(world,'back'));
 assert(m.backPatchChat(world));assert.equal(m.patchChat(world).view,'topics');
 assert(m.choosePatchChat(world,'back'));assert.equal(m.patchChat(world).view,'greeting');
 assert.equal(JSON.stringify(world),runBefore,'Navigating the conversation never enters serialized game state');
 m.closePatchChat(world);assert(!m.patchChat(world));
 startTalk();world.player.hp--;m.stepPatchQuest(world);assert(!m.patchChat(world),'Damage interrupts speech');
 startTalk();world.enemies=[{id:23,x:1030,y:1020,hp:20}];m.stepPatchQuest(world);assert(!m.patchChat(world),'Nearby combat interrupts speech');
 assert(!m.inspectPatch(world));world.enemies=[];
 startTalk();world.stationPanel='storage';assert(!m.choosePatchChat(world,'ask'));assert(!m.patchChat(world));world.stationPanel=undefined;
 startTalk();world.scene={id:'test-interior'};m.stepPatchQuest(world);assert(!m.patchChat(world));world.scene=undefined;
 startTalk();m.restorePatchQuest(world);assert(!m.patchChat(world),'Restoring a run discards its chat cursor');
 startTalk();assert(m.choosePatchChat(world,'stay'));assert.equal(state.command,'stay');assert(!m.patchChat(world));
 console.log('PASS: Live companion chat, lossless paging and backtracking, stale touch rejection, movement/combat/damage/scene exits, optional dialogue discovery/repair/homecoming gates, stale topic rejection, command-specific greetings and unchanged world state.');
}finally{fs.rmSync(temporary,{recursive:true,force:true})}
