/** Shared renderer state for editor previews and scheduled survival weather. */
export type WeatherOptions={rain:boolean;fog:boolean;lightning:boolean;heavyRain?:boolean};
export type WeatherKind=keyof WeatherOptions;
export type WeatherState={transitionSeconds?:number;options:WeatherOptions;time:number;rain:number;heavy:number;rainTravel:number;fog:number;flash:number;nextStrike:number;strikeAge:number;seed:number;reducedMotion:boolean};
export const CLEAR_WEATHER:WeatherOptions={rain:false,fog:false,lightning:false};
const KEY='camp-studio-weather';
export function readWeather():WeatherOptions{try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return{rain:v?.rain===true,fog:v?.fog===true,lightning:v?.lightning===true,...(v?.heavyRain===true?{heavyRain:true}:{})}}catch{return{...CLEAR_WEATHER}}}
export function rememberWeather(options:WeatherOptions){try{localStorage.setItem(KEY,JSON.stringify(options))}catch{}}
export function createWeather(options:WeatherOptions={...CLEAR_WEATHER},reducedMotion=false):WeatherState{return{options:{...options},time:0,rain:0,heavy:0,rainTravel:0,fog:0,flash:0,nextStrike:2.5,strikeAge:99,seed:137,reducedMotion}}
export function setWorldWeather(w:{weather?:WeatherState},options:WeatherOptions,reducedMotion=false,transitionSeconds=0){
 const state=w.weather??(w.weather=createWeather(options,reducedMotion));
 state.transitionSeconds=transitionSeconds;
 if(options.lightning&&!state.options.lightning){state.nextStrike=state.time+Math.max(2.5,transitionSeconds);state.strikeAge=99}
 state.options={...options};state.reducedMotion=reducedMotion;if(!options.lightning)state.flash=0;
}
/** Immediate ground-capable flash; leave time before the next automatic event. */
export function triggerLightning(w:{weather?:WeatherState;scene?:{weather?:string;lighting?:string}}){
 const s=w.weather;if(!s?.options.lightning||w.scene?.weather==='sheltered'||w.scene?.lighting==='baked')return false;
 s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;
 if(s.seed%3===0)s.seed++;
 s.strikeAge=0;s.flash=0;s.nextStrike=s.time+8+(s.seed/4294967296)*9;
 return true;
}
export function stepWeather(w:{weather?:WeatherState},elapsed:number){
 const s=w.weather;if(!s)return;const dt=Math.max(0,Math.min(.1,elapsed));if(!dt)return;
 // No visual clock work once every effect has faded away.
 if(!s.options.rain&&!s.options.fog&&!s.options.lightning&&s.rain===0&&s.fog===0)return;
 s.time+=dt;const approach=(v:number,on:boolean,speed:number)=>on?Math.min(1,v+dt/speed):Math.max(0,v-dt/speed);
 s.rain=approach(s.rain,s.options.rain,s.transitionSeconds||.65);s.heavy=approach(s.heavy,s.options.heavyRain===true,s.transitionSeconds||.8);s.rainTravel+=dt*(s.reducedMotion?170:390)*(1+s.heavy*.55);s.fog=approach(s.fog,s.options.fog,s.transitionSeconds||1.8);
 s.flash=0;if(!s.options.lightning)return;
 if(s.time>=s.nextStrike){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;s.nextStrike=s.time+8+(s.seed/4294967296)*9;s.strikeAge=0}
 s.strikeAge+=dt;const t=s.strikeAge;
 // A single soft cloud flash, never a rapid strobe; longer and gentler for reduced motion.
 const duration=s.reducedMotion?1.1:.55;
 if(t<duration)s.flash=Math.sin(Math.PI*Math.min(1,t/duration))**2*(s.reducedMotion?.07:.28);
}
