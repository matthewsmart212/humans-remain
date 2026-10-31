import type {World} from './survival-engine';
import {setWorldWeather,type WeatherOptions} from './weather-model';

export const RUN_DAY_SECONDS=180,RUN_NIGHT_SECONDS=90,DUSK_SECONDS=20,DAWN_SECONDS=10;
const fronts={clear:{rain:false,fog:false,lightning:false},mist:{rain:false,fog:true,lightning:false},showers:{rain:true,fog:false,lightning:false},wetMist:{rain:true,fog:true,lightning:false},downpour:{rain:true,heavyRain:true,fog:false,lightning:false},storm:{rain:true,heavyRain:true,fog:true,lightning:true}} satisfies Record<string,WeatherOptions>;
type Front=keyof typeof fronts;
const patterns:{weight:number;fronts:[Front,Front,Front]}[]=[
 {weight:32,fronts:['clear','clear','mist']},
 {weight:23,fronts:['mist','clear','mist']},
 {weight:20,fronts:['clear','showers','clear']},
 {weight:12,fronts:['showers','downpour','showers']},
 {weight:8,fronts:['showers','storm','wetMist']},
 {weight:5,fronts:['wetMist','showers','mist']},
];
export type SurvivalCycle={seed:number;pattern:number;front:number;warning:boolean};
function random(s:SurvivalCycle){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296}
function applyFront(w:World,index:number){const c=w.cycle!;c.front=index;setWorldWeather(w,fronts[patterns[c.pattern].fronts[index]],w.weather?.reducedMotion??false,20)}
function chooseDay(w:World){const c=w.cycle!,choices=patterns.map((p,i)=>({p,i})).filter(({i})=>i!==c.pattern);let roll=random(c)*choices.reduce((n,{p})=>n+p.weight,0);c.pattern=choices.at(-1)!.i;for(const {p,i} of choices){roll-=p.weight;if(roll<0){c.pattern=i;break}}applyFront(w,0)}
export function startSurvivalCycle(w:World,seed=Math.floor(Math.random()*4294967296)){
 w.cycle={seed:seed>>>0,pattern:0,front:0,warning:false};w.phase='day';w.round=1;w.survived=0;w.phaseLeft=RUN_DAY_SECONDS;w.nightAmount=0;
 // The first expedition starts clear; its afternoon can bring a mild shower.
 w.cycle.pattern=random(w.cycle)<.5?0:2;applyFront(w,0);
 if(w.weather)w.weather.seed=w.cycle.seed;
}
export function cycleNightAmount(w:World){
 return w.phase==='night'?Math.min(1,w.phaseLeft/DAWN_SECONDS):Math.max(0,1-w.phaseLeft/DUSK_SECONDS);
}
export function stepSurvivalCycle(w:World,dt:number){
 const c=w.cycle;if(!c||w.phase==='over'||dt<=0)return;
 w.phaseLeft=Math.max(0,w.phaseLeft-dt);
 if(w.phase==='day'&&c.front===0&&w.phaseLeft<=RUN_DAY_SECONDS/2)applyFront(w,1);
 if(w.phase==='day'&&!c.warning&&w.phaseLeft<=DUSK_SECONDS)c.warning=true;
 if(w.phaseLeft<=1e-7){
  if(w.phase==='day'){w.phase='night';w.phaseLeft=RUN_NIGHT_SECONDS;applyFront(w,2)}
  else{w.survived=w.round;w.round++;w.phase='day';w.phaseLeft=RUN_DAY_SECONDS;c.warning=false;chooseDay(w)}
 }
 w.nightAmount=cycleNightAmount(w);
}
export function cycleStatus(w:World){
 if(!w.cycle)return undefined;
 const seconds=Math.max(0,Math.ceil(w.phaseLeft-1e-7)),night=w.phase==='night',stage=night?(w.phaseLeft<=DAWN_SECONDS?'DAWN':'NIGHT'):(w.phaseLeft<=DUSK_SECONDS?'DUSK':'DAYLIGHT'),o=w.weather?.options;
 const weather=o?.lightning?'THUNDERSTORM':o?.heavyRain?'HEAVY RAIN':o?.rain?(o.fog?'MIST + RAIN':'SHOWERS'):o?.fog?'FOGGY':'CLEAR SKIES';
 return{day:w.round,stage,night,weather,time:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`,remaining:seconds,progress:w.phaseLeft/(night?RUN_NIGHT_SECONDS:RUN_DAY_SECONDS)};
}
