import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles}=await build({stdin:{
 contents:['patch-awareness','patch-audio-cues','patch-quest','patch-placement','world-layout','survival-engine','patch-art','world-assets']
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
q.command='follow';w.tick+=600;w.thirst=90;w.player.hp=12;w.stationPanel='patch';
assert.equal(scan(),undefined,'A conversation owns its dialogue');
w.stationPanel=undefined;
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
console.log('Patch lookout, interpolated observations, audio cadence, proximity and one-shot cues passed.');
