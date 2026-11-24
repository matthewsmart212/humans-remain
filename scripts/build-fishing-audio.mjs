import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';

const model=await build({stdin:{contents:"export * from './src/fishing-sound-design'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'error'});
const {FISHING_CUE_DURATION,FISHING_SAMPLE_RATE,fishingSoundSamples}=await import('data:text/javascript;base64,'+Buffer.from(model.outputFiles[0].text).toString('base64'));
const directory='public/audio/fishing-v2';fs.mkdirSync(directory,{recursive:true});
for(const cue of Object.keys(FISHING_CUE_DURATION)){
 const samples=fishingSoundSamples(cue),bytes=Buffer.alloc(44+samples.length*2);
 bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(FISHING_SAMPLE_RATE,24);bytes.writeUInt32LE(FISHING_SAMPLE_RATE*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++)bytes.writeInt16LE(Math.round(samples[i]*32767),44+i*2);
 fs.writeFileSync(path.join(directory,cue+'.wav'),bytes);
}
console.log('Built 13 original fishing cues from shared deterministic sound design.');
