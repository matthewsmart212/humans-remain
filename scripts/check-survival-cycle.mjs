import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url),temp=fs.mkdtempSync(path.join(os.tmpdir(),'survival-cycle-'));
try{
 await build({stdin:{contents:"export * from './src/survival-cycle';export * from './src/weather-model';export * from './src/camp-lighting';export * from './src/studio-play';export {createWorld} from './src/survival-engine';export {installImportedArt} from './src/imported-art';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs')});
 const m=require(path.join(temp,'model.cjs')),make=seed=>{const w=m.createWorld();m.startSurvivalCycle(w,seed);return w},w=make(12345),step=(w,n)=>{for(let i=0;i<n;i++){w.tick+=60;m.stepSurvivalCycle(w,1)}};
 assert.equal(m.cycleStatus(w).time,'3:00');assert.equal(w.weather.options.lightning,false);
 step(w,160);assert.equal(m.cycleStatus(w).stage,'DUSK');assert(!w.notice.includes('20 seconds'),'The sky clock owns dusk status');assert.equal(w.nightAmount,0);
 step(w,10);assert.equal(w.nightAmount,.5);m.stepCampLighting(w,.1);assert.equal(w.nightAmount,.5,'Render fades cannot override the simulation sun');
 step(w,10);assert.equal(w.phase,'night');assert.equal(w.phaseLeft,90);assert.equal(m.cycleStatus(w).time,'1:30');assert.equal(w.nightAmount,1);
 step(w,80);assert.equal(m.cycleStatus(w).stage,'DAWN');step(w,5);assert.equal(w.nightAmount,.5);step(w,5);assert.equal(w.phase,'day');assert.equal(w.round,2);assert.equal(w.survived,1);assert.equal(w.phaseLeft,180);assert.equal(w.nightAmount,0);
 const paused=JSON.stringify(w.cycle),left=w.phaseLeft;m.stepSurvivalCycle(w,0);assert.equal(w.phaseLeft,left);assert.equal(JSON.stringify(w.cycle),paused);w.phase='over';step(w,20);assert.equal(w.phaseLeft,left,'Ended runs stop advancing');
 const a=make(9876),b=make(9876),seen=new Set(),days=[];for(let day=0;day<60;day++){
  const old=a.cycle.pattern;days.push(old);for(let second=0;second<270;second++){step(a,1);step(b,1);seen.add(m.cycleStatus(a).weather);assert.equal(a.cycle.seed,b.cycle.seed);assert.deepEqual(a.weather.options,b.weather.options);assert.equal(a.nightAmount,b.nightAmount)}assert.notEqual(a.cycle.pattern,old,'Consecutive days have different patterns');
 }
 assert.deepEqual([...seen].sort(),['CLEAR SKIES','FOGGY','HEAVY RAIN','MIST + RAIN','SHOWERS','THUNDERSTORM']);assert.notDeepEqual(make(1).cycle,make(2).cycle);
 const weather=make(777);m.setWorldWeather(weather,{rain:true,fog:true,lightning:true,heavyRain:true},true,20);for(let i=0;i<600;i++)m.stepWeather(weather,1/60);assert(Math.abs(weather.weather.rain-.5)<.001);assert.equal(weather.weather.flash,0,'Lightning waits for the front to arrive');for(let i=0;i<700;i++){m.stepWeather(weather,1/60);assert(weather.weather.flash<=.07)}assert.equal(weather.weather.rain,1);m.setWorldWeather(weather,m.CLEAR_WEATHER,true,20);for(let i=0;i<1201;i++)m.stepWeather(weather,1/60);assert.equal(weather.weather.rain,0);assert.equal(weather.weather.fog,0);
 const saved=JSON.parse(fs.readFileSync('native/assets/world-snapshot.json'));m.installImportedArt(saved.records);const play=m.createCampPlaySession(saved.layout);play.enemies=[];play.animals=[];play.phaseLeft=1/60;m.stepCampPlaySession(play,{x:0,y:0},false,false);assert.equal(play.phase,'night','Actual play loop advances the run clock');assert.equal(play.phaseLeft,90);assert.equal(play.round,1);
 const report={passed:true,daySeconds:180,nightSeconds:90,duskSeconds:20,dawnSeconds:10,weatherFadeSeconds:20,weatherTypes:[...seen],checks:['actual play-loop integration','full day/night boundaries and round count','continuous dusk/dawn brightness','pause and game-over freeze','60 seeded days repeat deterministically','all weather mixes and no identical consecutive day patterns','gentle first day','weather fades and delayed reduced-motion lightning'],browserTested:false};fs.mkdirSync('docs/qa/survival-cycle',{recursive:true});fs.writeFileSync('docs/qa/survival-cycle/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{fs.rmSync(temp,{recursive:true,force:true})}
