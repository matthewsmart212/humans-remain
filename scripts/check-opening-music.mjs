import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/opening-music.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {createOpeningMusic}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
let downloaded;
globalThis.fetch=()=>new Promise(resolve=>{downloaded=()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});
function fakeContext(){
 const sources=[];
 return {sources,state:'suspended',currentTime:0,destination:{},
  createGain:()=>({gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),
  createBufferSource(){const s={starts:[],stops:0,connect(){},disconnect(){},start(...args){this.starts.push(args)},stop(){this.stops++}};sources.push(s);return s},
  resume(){this.state='running';return Promise.resolve()},
  close(){this.state='closed';return Promise.resolve()},
  decodeAudioData:async()=>({duration:60})
 };
}
const errors=[];
const context=fakeContext(),music=createOpeningMusic(context,'/music.mp3',()=>errors.push('load'));
music.start(); // User taps before download completes.
assert.equal(context.state,'running','the tap unlocks audio immediately');
assert.equal(context.sources.length,0);
downloaded();await flush();
assert.equal(context.sources.length,1,'download completion honours the original tap');
assert.deepEqual(context.sources[0].starts,[[0,0]]);
context.currentTime=4;
music.start();music.start(); // Video starts; then the menu starts.
assert.equal(context.sources.length,1,'video/menu start cannot replace the music source');
assert.equal(context.sources[0].stops,0,'music stays uninterrupted across transitions');
music.pause();
assert.equal(context.sources[0].stops,1);
context.currentTime=50;music.start();
assert.deepEqual(context.sources[1].starts,[[0,4]],'visibility/mute resume preserves the playback position');
context.currentTime=115;music.pause();music.start();
assert.deepEqual(context.sources[2].starts,[[0,9]],'offset wraps correctly after the loop ends');
music.dispose();music.start();
assert.equal(context.sources.length,3,'disposed player cannot restart');
const mutedContext=fakeContext(),muted=createOpeningMusic(mutedContext,'/music.mp3',()=>errors.push('muted'));
muted.start();muted.pause();downloaded();await flush();
assert.equal(mutedContext.sources.length,0,'muting during download prevents late playback');
muted.dispose();
assert.deepEqual(errors,[]);
console.log('PASS: early tap, continuous video/menu music, mute/background resume, loop offsets, disposal, and muted preload.');
