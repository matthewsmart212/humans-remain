import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles}=await build({stdin:{
 contents:['patch-chat','patch-awareness','patch-audio-cues','patch-quest','patch-placement','world-layout','survival-engine','patch-art','world-assets']
  .map(m=>"export * from './src/"+m+"';").join('\n'),resolveDir:process.cwd(),
},bundle:true,platform:'node',format:'esm',write:false});
const game=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].contents).toString('base64'));
const layout=game.emptyLayout();
layout.spawn={x:1100,y:1000};
const w=game.createWorld(layout);
w.editorPreview=true;
w.progression={};
const q=game.ensurePatchQuest(w);
q.position={x:1000,y:1000};
q.suppliesDelivered=q.servoInstalled=q.recruited=true;
q.command='follow';
const scan=()=>{w.tick+=60;game.stepPatchAwareness(w);return game.patchSupportSpeech(w)};
w.enemies=[{id:1,x:1250,y:1000,hp:30}];
assert.equal(scan(),'Machine to the east.');
assert.equal(game.patchSupportSpeech({...w}),'Machine to the east.','Presentation copies share the same observation');
w.tick+=600;
assert.equal(scan(),undefined,'The same enemy does not repeat its warning');
w.enemies=[];w.thirst=10;
assert.match(scan(),/Water/);
q.command='camp';
assert.equal(scan(),undefined,'The lookout stays quiet when returning alone');
q.command='follow';w.tick+=600;w.thirst=90;w.player.hp=12;w.player.x=q.position.x+30;
assert(game.inspectPatch(w));
assert.equal(scan(),undefined,'A conversation owns its dialogue');
game.closePatchChat(w);
assert.match(scan(),/hurt/);

const cues=new game.PatchCueTracker();
assert.equal(cues.update(w,true),undefined,'Restoring camp does not replay the ending');
q.servoInstalled=q.suppliesDelivered=false;
cues.update(w,true);
q.servoInstalled=true;
assert.equal(cues.update(w,true).cue,'servo');
assert.equal(cues.update(w,true),undefined);
q.suppliesDelivered=true;
assert.equal(cues.update(w,true).cue,'home');
cues.update(w,false);
assert.equal(cues.update(w,true),undefined);
q.servoInstalled=false;
layout.items=[
 {id:game.PATCH_STATION_PLACEMENT_ID,assetId:game.PATCH_STATION_ID,x:900,y:900,scale:1},
 {id:game.PATCH_LOCKER_PLACEMENT_ID,assetId:game.PATCH_LOCKER_ID,x:600,y:900,scale:1},
];
w.tick=323;cues.update(w,true);
for(let i=0;i<6;i++){
 w.tick=324+i*54;
 assert.equal(cues.update(w,true)?.cue,i<3?'beacon':undefined);
}
w.player.x+=600;w.tick=648;
assert.equal(cues.update(w,true),undefined,'A distant distress signal is silent');

// Use the field interactions, including the load plate on the other side of the brake.
const survey=game.emptyLayout();
survey.items=['dispatch','hauler'].map((kind,i)=>({
 id:game.PATCH_ROUTE_IDS[kind],assetId:game.PATCH_ROUTE_ART[kind].id,
 x:1600+i*1200,y:1600,scale:1,solid:true,role:'prop',
}));
const field=game.createWorld(survey),fieldCues=new game.PatchCueTracker();
field.editorPreview=true;field.progression={};
const state=game.ensurePatchQuest(field);state.discovered=true;state.diagnosed=true;
const dispatch=game.patchRouteSite(survey,'dispatch'),hauler=game.patchRouteSite(survey,'hauler');
Object.assign(field.player,dispatch.approach);
assert.equal(fieldCues.update(field,true),undefined);
assert(game.examinePatchSite(field,'dispatch'));
assert.equal(fieldCues.update(field,true)?.cue,'ledger');
assert(!game.examinePatchSite(field,'dispatch'));
assert.equal(fieldCues.update(field,true),undefined,'Rereading an existing clue stays quiet');
Object.assign(field.player,hauler.approach);
assert(game.examinePatchSite(field,'hauler-inspect'));
assert.equal(fieldCues.update(field,true),undefined,'Inspecting the plate does not release the brake');
Object.assign(field.player,hauler.release);
assert(game.examinePatchSite(field,'hauler-salvage'));
assert.equal(fieldCues.update(field,true)?.cue,'brake');
assert.equal(fieldCues.update(field,true),undefined);
field.patchQuest=structuredClone(state);
assert.equal(fieldCues.update(field,true),undefined,'Restoring both discoveries never replays them');
field.patchQuest={...state,dispatchRead:false,haulerInspected:false,servoClaimed:false};
assert.equal(fieldCues.update(field,true),undefined);
field.patchQuest.dispatchRead=true;
assert.equal(fieldCues.update(field,false),undefined,'A muted discovery produces no sound');
assert.equal(fieldCues.update(field,true),undefined,'Turning sounds on does not catch up on missed cues');
console.log('Patch lookout, audio cadence, proximity, field discoveries, mute and restore behavior passed.');
