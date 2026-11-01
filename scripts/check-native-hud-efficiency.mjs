// Native presentation regressions: exact dot geometry and authoritative sky
// endpoints, plus component scheduling with platform services substituted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'native-hud-'));
const originalSet=globalThis.setInterval,originalClear=globalThis.clearInterval;
try{
 await build({stdin:{contents:"export * from './native/hud-presentation';export * from './src/movement-trail';export * from './src/sky-clock';export {cycleStatus,RUN_DAY_SECONDS,RUN_NIGHT_SECONDS} from './src/survival-cycle';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'model.cjs'),logLevel:'error'});
 const require=createRequire(import.meta.url),m=require(path.join(temp,'model.cjs'));
 for(let i=0;i<1000;i++){
  const trail={origin:{x:i%397,y:i%181},current:{x:Math.sin(i*.73)*(i%1200),y:Math.cos(i*.37)*(i%900)}};
  if(i<5)trail.current={x:trail.origin.x+i,y:trail.origin.y};
  const expected=m.movementTrailDots(trail),actual=Array.from({length:m.MOVEMENT_TRAIL_DOTS},(_,index)=>m.nativeTrailDot(trail,index)).filter(p=>p.opacity>0);
  assert.deepEqual(actual,expected,'Retained native dots exactly preserve all original positions, sizes and alpha');
 }
 for(let i=0;i<m.MOVEMENT_TRAIL_DOTS;i++)assert.equal(m.nativeTrailDot(null,i).opacity,0,'Released/pinched/blurred trail is invisible');
 let calls=0,scheduled=0,cleared=0,callback;
 const clock={setInterval(fn,ms){assert.equal(ms,100);scheduled++;callback=fn;return 7},clearInterval(id){assert.equal(id,7);cleared++}};
 m.startVisibleHudPolling(false,()=>calls++,100,clock)();assert.equal(calls,0);assert.equal(scheduled,0);
 const stop=m.startVisibleHudPolling(true,()=>calls++,100,clock);assert.equal(calls,1,'Returning from the map refreshes immediately');callback();assert.equal(calls,2);stop();assert.equal(cleared,1);

 const world={cycle:{},phase:'day',phaseLeft:m.RUN_DAY_SECONDS,round:1,weather:{options:{}}};
 const at=(night,elapsed)=>m.cycleStatus({...world,phase:night?'night':'day',phaseLeft:(night?m.RUN_NIGHT_SECONDS:m.RUN_DAY_SECONDS)-elapsed});
 let maximumChordError=0,maximumOpacityError=0,maximumLagDistance=0;
 for(const night of [false,true]){
  const duration=night?m.RUN_NIGHT_SECONDS:m.RUN_DAY_SECONDS;
  for(let frame=0;frame<=duration*60;frame++){
   const t=frame/60,cycle=at(night,t),actual=m.nativeSkySample(cycle),expected=m.skyClockView(cycle);
   for(const orb of expected.orbs){const p=m.horizonPosition(orb);assert.equal(actual.pose[orb.icon+'X'],p.x);assert.equal(actual.pose[orb.icon+'Y'],p.y);assert.equal(actual.pose[orb.icon+'Opacity'],orb.opacity)}
   assert.equal(actual.pose.nightMix,expected.nightMix);assert.equal(actual.label,expected.label);assert.equal(actual.dayTag,expected.dayTag);
   const aTime=Math.floor(t/.25)*.25,bTime=Math.min(duration,aTime+.25),a=m.nativeSkySample(at(night,aTime)).pose,b=m.nativeSkySample(at(night,bTime)).pose,blend=bTime===aTime?0:(t-aTime)/(bTime-aTime);
   for(const icon of ['sun','moon']){
    if(actual.pose[icon+'Opacity']<=.001)continue;
    const x=a[icon+'X']+(b[icon+'X']-a[icon+'X'])*blend,y=a[icon+'Y']+(b[icon+'Y']-a[icon+'Y'])*blend;
    maximumChordError=Math.max(maximumChordError,Math.hypot(x-actual.pose[icon+'X'],y-actual.pose[icon+'Y']));
    maximumOpacityError=Math.max(maximumOpacityError,Math.abs(a[icon+'Opacity']+(b[icon+'Opacity']-a[icon+'Opacity'])*blend-actual.pose[icon+'Opacity']));
    const prior=m.nativeSkySample(at(night,Math.max(0,t-.25))).pose;
    maximumLagDistance=Math.max(maximumLagDistance,Math.hypot(prior[icon+'X']-actual.pose[icon+'X'],prior[icon+'Y']-actual.pose[icon+'Y']));
   }
  }
  const end=m.nativeSkySample(at(night,duration)).pose,next=m.nativeSkySample(at(!night,0)).pose,incoming=night?'sun':'moon';
  for(const field of ['X','Y','Opacity'])assert.equal(end[incoming+field],next[incoming+field],'The incoming orb is continuous at the day/night boundary');
  assert.equal(end.nightMix,next.nightMix);
 }
 assert(maximumChordError<.02,'Four-Hz interpolation retains the original curve within .02 logical pixels');
 assert(maximumOpacityError<.001,'Interpolation does not introduce a fade discontinuity');
 assert(maximumLagDistance<1,'Presentation interpolation remains within one logical pixel of the authoritative moving orb');

 const H=globalThis.__nativeHudHarness={slots:[],effects:[],cursor:0,pending:[],timings:[],shared:[],writes:0};
 H.useRef=value=>{const i=H.cursor++;return H.slots[i]??(H.slots[i]={current:value})};
 H.useState=initial=>{const i=H.cursor++;if(!(i in H.slots))H.slots[i]=typeof initial==='function'?initial():initial;return[H.slots[i],next=>{const value=typeof next==='function'?next(H.slots[i]):next;if(value!==H.slots[i]){H.slots[i]=value;H.writes++}}]};
 H.useEffect=(fn,deps)=>{const i=H.cursor++,old=H.effects[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))H.pending.push(()=>{old?.cleanup?.();H.effects[i]={deps,cleanup:fn()}})};
 H.useSharedValue=value=>{const ref=H.useRef(null);if(!ref.current){ref.current={value};H.shared.push(ref.current)}return ref.current};
 H.jsx=(type,props)=>({type,props});
 const aliases={
  react:"const h=globalThis.__nativeHudHarness;export const useRef=h.useRef,useState=h.useState,useEffect=h.useEffect;export default {createElement:(type,props,...children)=>({type,props:{...props,children}})};",
  'react/jsx-runtime':"const h=globalThis.__nativeHudHarness;export const jsx=h.jsx,jsxs=h.jsx,Fragment='Fragment';",
  'react-native':"export const View='View',Text='Text',Image='Image',Pressable='Pressable',StyleSheet={create:v=>v};class Value{constructor(v){this.value=v}setValue(v){this.value=v}interpolate(){return this.value}stopAnimation(){}};const motion=()=>({start(){},stop(){}});export const Animated={Value,View:'AnimatedView',Image:'AnimatedImage',add:()=>0,timing:motion,sequence:motion,loop:motion};export const Easing={linear:0,cubic:0,out:()=>0};export const AccessibilityInfo={isReduceMotionEnabled:async()=>false,addEventListener:(_name,fn)=>{globalThis.__nativeHudHarness.reduceMotion=fn;return{remove(){}}}};",
  'react-native-reanimated':"const h=globalThis.__nativeHudHarness;export const useSharedValue=h.useSharedValue,useAnimatedStyle=fn=>fn(),cancelAnimation=()=>{},Easing={linear:0},withTiming=(value,config)=>{h.timings.push({value,config});return value};export default {View:'ReanimatedView',Image:'ReanimatedImage'};",
 };
 await build({entryPoints:['native/SkyClock.tsx'],bundle:true,platform:'node',format:'cjs',outfile:path.join(temp,'component.cjs'),logLevel:'error',plugins:[{name:'native-services',setup(b){b.onResolve({filter:/^(react|react\/jsx-runtime|react-native|react-native-reanimated)$/},a=>({path:a.path,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:aliases[a.path],loader:'js'}));b.onLoad({filter:/\.(png|webp)$/},a=>({contents:'module.exports=1;',loader:'js'}));}}]});
 const component=require(path.join(temp,'component.cjs')).default,timers=new Map();let timerId=0;
 globalThis.setInterval=(fn,ms)=>{assert.equal(ms,250);timers.set(++timerId,fn);return timerId};globalThis.clearInterval=id=>timers.delete(id);
 const props={world:{current:world},cycle:m.cycleStatus(world),paused:false};
 const render=()=>{H.cursor=0;component(props);const pending=H.pending.splice(0);pending.forEach(fn=>fn())};
 render();await Promise.resolve();render();assert.equal(timers.size,1);
 H.writes=0;
 for(let i=0;i<12;i++){world.phaseLeft-=.25;[...timers.values()].forEach(fn=>fn())}
 assert.equal(H.writes,0,'Orb motion and background fade never commit React state');
 assert(H.timings.length>0);assert(H.timings.every(t=>t.config.duration===250));
 props.paused=true;render();assert.equal(timers.size,0,'Paused/hidden clocks have no sampling loop');assert.deepEqual(H.shared[0].value,m.nativeSkySample(m.cycleStatus(world)).pose,'Pause cancels interpolation and snaps to the exact simulation pose');
 world.phase='night';world.phaseLeft=m.RUN_NIGHT_SECONDS;props.paused=false;render();assert.equal(timers.size,1);assert.deepEqual(H.shared[0].value,m.nativeSkySample(m.cycleStatus(world)).pose,'Resume and phase changes start from the real simulation');
 const timingCount=H.timings.length;H.reduceMotion(true);render();world.phaseLeft-=.25;[...timers.values()].forEach(fn=>fn());assert.equal(H.timings.length,timingCount,'Reduced motion never schedules pose interpolation');assert.deepEqual(H.shared[0].value,m.nativeSkySample(m.cycleStatus(world)).pose,'Reduced motion uses the exact current pose');
 for(const effect of H.effects)effect?.cleanup?.();assert.equal(timers.size,0);
 console.log(JSON.stringify({passed:true,trailCases:1000,hiddenHudPolling:false,skyReactMotionUpdates:0,skySampleHz:4,maximumChordError,maximumOpacityError,maximumLagDistance,physicalIPhoneTested:false}));
}finally{globalThis.setInterval=originalSet;globalThis.clearInterval=originalClear;delete globalThis.__nativeHudHarness;fs.rmSync(temp,{recursive:true,force:true})}
