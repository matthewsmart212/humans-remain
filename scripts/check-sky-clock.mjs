import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sky-horizon-'));
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} must equal ${b}`);
try{
 await build({stdin:{contents:"export * from './src/sky-clock';export * from './src/survival-cycle';export {createWorld} from './src/survival-engine';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(tmp,'sky.cjs')});const m=require(path.join(tmp,'sky.cjs')),w=m.createWorld();m.startSurvivalCycle(w,20);
 const sample=()=>m.skyClockView(m.cycleStatus(w));
 const h=m.HORIZON,baseY=h.baseline-h.icon/2,peakX=h.width/2-h.icon/2,peakY=baseY-h.rise;
 assert.equal(h.height,34,'Chrome matches the stats body, excluding its raised crest');assert(h.height+10>=44,'Slim artwork retains a 44px touch target');assert(peakY>=0&&peakY+h.icon<h.height,'The unchanged round orb fits at its peak');
 let v=sample();assert.equal(v.icon,'sun');assert.deepEqual(v.orbs.map(o=>o.icon),['sun','moon']);
 const body=(v,icon)=>v.orbs.find(o=>o.icon===icon),centerY=orb=>m.horizonPosition(orb).y+h.icon/2;
 const at=(night,elapsed)=>m.skyClockView({...m.cycleStatus(w),night,progress:1-elapsed/(night?m.RUN_NIGHT_SECONDS:m.RUN_DAY_SECONDS)});
 for(const night of [false,true]){
  const duration=night?m.RUN_NIGHT_SECONDS:m.RUN_DAY_SECONDS,outgoing=night?'moon':'sun',incoming=night?'sun':'moon';
  const peak=m.horizonPosition(body(at(night,duration/2),outgoing));near(peak.x,peakX);near(peak.y,peakY);
  const begin=at(night,duration-h.handover);
  near(centerY(body(begin,outgoing)),h.lip);near(body(begin,incoming).opacity,0);
  near(centerY(body(begin,incoming)),h.lip+h.orbRadius);
  const lastSeconds=at(night,duration-2);
  assert(centerY(body(lastSeconds,outgoing))>h.lip+h.orbRadius*.8,'Outgoing disc is nearly below the rim two seconds before the world changes');
  assert(body(lastSeconds,outgoing).opacity<.2,'Outgoing glow fades before the change');
  for(const remaining of [6,4,2,0]){
   const before=m.horizonPosition(body(at(night,duration-remaining-.01),incoming)),after=m.horizonPosition(body(at(night,duration-remaining),incoming));
   assert(after.x>before.x&&after.y<before.y,'Incoming body keeps travelling and rising, without waiting at the edge');
  }
  // The same rising body must preserve position and velocity as the game flips phase.
  const eps=.001,left=m.horizonPosition(body(at(night,duration-eps),incoming)),edge=m.horizonPosition(body(at(night,duration),incoming)),start=m.horizonPosition(body(at(!night,0),incoming)),right=m.horizonPosition(body(at(!night,eps),incoming));
  near(edge.x,start.x);near(edge.y,start.y);
  for(const axis of ['x','y'])assert(Math.abs((edge[axis]-left[axis])/eps-(right[axis]-start[axis])/eps)<.003,'Rise velocity is continuous across the phase boundary');
  // Sample every simulated frame, including the old setting/remount threshold.
  let previous=at(night,0);
  for(let frame=1;frame<=duration*60;frame++){
   const next=at(night,frame/60);assert.deepEqual(next.orbs.map(o=>o.icon),['sun','moon']);
   for(const icon of ['sun','moon']){
    const a=body(previous,icon),b=body(next,icon),p=m.horizonPosition(a),q=m.horizonPosition(b);
    assert(Math.hypot(q.x-p.x,q.y-p.y)<.1,'No position jump during a rise, arc or set');
    assert(Math.abs(b.opacity-a.opacity)<.004,'Glow does not pop');
   }previous=next;
  }
  near(at(night,duration).nightMix,night?0:1);
 }
 const held=JSON.stringify(sample());m.stepSurvivalCycle(w,0);assert.equal(JSON.stringify(sample()),held,'Pausing holds the exact sky');
 m.stepSurvivalCycle(w,m.RUN_DAY_SECONDS);assert.equal(w.phase,'night');m.stepSurvivalCycle(w,m.RUN_NIGHT_SECONDS);assert.equal(w.round,2);assert.equal(sample().icon,'sun');
 for(const p of [5,-1])assert(m.skyClockView({...m.cycleStatus(w),progress:p}).orbs.every(o=>o.travel>=0&&o.travel<=1));
 for(const [width,height,safe] of [[320,568,{top:0,right:0,bottom:0,left:0}],[390,844,{top:47,right:0,bottom:34,left:0}],[768,1024,{top:24,right:0,bottom:20,left:0}],[844,390,{top:0,right:47,bottom:21,left:47}],[667,375,{top:0,right:0,bottom:0,left:0}]]){
  const l=m.skyHudLayout(width,height,safe),left=Math.max(12,safe.left+8),right=Math.max(12,safe.right+8);assert.equal(l.portrait,height>=width);assert.equal(l.toolbarWidth,l.portrait?140:272);assert.equal(l.clockWidth,120,'Narrow screens preserve the same height and round sun/moon');assert(width-right-l.toolbarWidth>=safe.left+8,'The whole horizon and controls fit within safe edges');assert(l.combatWidth>=0);
  assert.equal(l.topOffset,5);assert.equal(m.skyHudLayout(width,height,safe,true).topOffset,5,'Controls align below the crest even with expanded vitals');near(left+l.combatWidth+12,width-right-l.toolbarWidth);
  assert.equal(m.skyHudLayout(width,height,safe,true).vitalsTopOffset,l.portrait?104:0);
 }
 assert.equal(m.DAY_WING.width,72);
 for(const [width,height] of [[320,568],[390,844],[568,320],[844,390]])for(const waypoint of [false,true]){
  const l=m.skyHudLayout(width,height,undefined,false,true,waypoint,true);
  assert.equal(l.toolbarWidth,height>=width?(waypoint?190:140):344+(waypoint?50:0),'Expanded calendar reserves the correct toolbar space');
  assert(l.combatWidth>0);
  const left=height>=width?width-12-120-m.DAY_WING.width:width-12-l.toolbarWidth;
  assert(left>=12,'The left-extending calendar fits even on a small phone');
  assert.equal(m.skyHudLayout(width,height,undefined,true,true,waypoint,true).vitalsTopOffset,height>=width?104:52,'Expanded vitals leave the calendar clear');
 }
 for(const file of ['sun.png','moon.png','day.png','night.png','rim.png','sun-glow.png','moon-glow.png'])assert(fs.statSync(`public/survival/ui-survivor-dial-v2/${file}`).size>1000);
 for(const file of ['day','night','rim']){const png=fs.readFileSync(`public/survival/ui-survivor-dial-v2/${file}.png`);assert.equal(png.readUInt32BE(16),h.width*4);assert.equal(png.readUInt32BE(20),h.height*4,'Scene and frame share the new artwork height');}
 for(const file of ['pause-light','backpack-light','utility-panel'])assert(fs.statSync(`public/survival/ui-field-kit-v1/${file}.png`).size>1000,'Both platforms ship the shared ivory icons and teal backing');
 for(const day of [1,9,10,99,100,365])assert.equal(m.skyClockView({...m.cycleStatus(w),day}).dayTag,String(day).padStart(2,'0'),'The calendar displays the real day without truncating long runs');
 console.log('PASS: authoritative day/night durations, noon/midnight peaks, early half-hidden sunset/moonset, dusk moonrise, dawn sunrise, continuous phase boundaries, pause and safe HUD layout.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}
