import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-ui-cadence-'));
try{
 // Exercise the real worklet accumulator with only native hook imports stubbed.
 await build({entryPoints:['native/UiFrameProbe.tsx'],bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'test.cjs'),plugins:[{name:'native-hooks',setup(build){
  build.onResolve({filter:/^(react|react-native|react-native-reanimated|react-native-worklets)$/},args=>({path:args.path,namespace:'native-hook'}));
  build.onLoad({filter:/.*/,namespace:'native-hook'},()=>({contents:'export const useCallback=()=>{},useEffect=()=>{},useRef=()=>{},useState=()=>{},AppState={},useFrameCallback=()=>{},useSharedValue=()=>{},scheduleOnRN=()=>{};'}));
 }}]});
 const {createUiCadenceState,collectUiCadence}=createRequire(import.meta.url)(path.join(temp,'test.cjs'));
 let state=createUiCadenceState(7),batches=[];
 for(const interval of [null,0,-2,NaN,Infinity])assert.equal(collectUiCadence(state,interval),null);
 assert.equal(state.intervals,0,'First callbacks and invalid timestamps are excluded');
 for(let i=0;i<60;i++){
  const batch=collectUiCadence(state,1000/60);
  if(batch){batches.push(batch);state.pending=false}
 }
 assert.equal(batches.length,2,'Only two batches per second on a 60Hz UI');
 assert.equal(batches.reduce((n,b)=>n+b.intervals,0),60);
 assert(batches.every(b=>b.token===7&&b.over33ms===0&&b.over100ms===0));
 state=createUiCadenceState(8);const first=collectUiCadence(state,510);
 assert(first);assert.equal(first.worstFrameMs,510);assert.equal(first.over100ms,1);
 for(let i=0;i<600;i++)assert.equal(collectUiCadence(state,1000/60),null,'A blocked RN runtime cannot accumulate bridge messages');
 assert.equal(state.intervals,600);assert(Math.abs(state.windowMs-10000)<.0001);
 state.pending=false;const catchup=collectUiCadence(state,16);
 assert.equal(catchup.intervals,601);assert.equal(catchup.over33ms,0,'Smooth UI during JS blockage remains distinguishable');
 assert(Math.abs(catchup.windowMs-10016)<.0001);
 state=createUiCadenceState(9);
 for(const dt of [16,34,51,101])collectUiCadence(state,dt);
 const hitch=collectUiCadence(state,300);
 assert.equal(hitch.intervals,5);assert.equal(hitch.over33ms,4);assert.equal(hitch.over50ms,3);assert.equal(hitch.over100ms,2);assert.equal(hitch.worstFrameMs,300);
 state=createUiCadenceState(10);assert.equal(collectUiCadence(state,null),null);assert.equal(state.windowMs,0);assert.equal(state.pending,false);
 console.log(JSON.stringify({passed:true,checks:['first activation interval excluded','500ms cadence batching','bounded bridge queue during JS stalls','UI interval counts survive JS backlog','hitch thresholds','session reset'],physicalIPhoneTested:false},null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
