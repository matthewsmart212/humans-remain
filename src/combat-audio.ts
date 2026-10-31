import {timeOf,type World} from './survival-engine';
import {axeProfile} from './axe-combat';
import {BRUTE} from './brute-model';

const KEY='camp-combat-sound-v1';
export function combatSoundEnabled(){try{return localStorage.getItem(KEY)!=='off'}catch{return true}}
export function setCombatSoundEnabled(enabled:boolean){try{localStorage.setItem(KEY,enabled?'on':'off')}catch{}window.dispatchEvent(new Event('camp-combat-sound'))}

/** Tiny synthesized foley, no media downloads or audio work during simulation.
 * One context, a reused noise buffer and at most eight simultaneous voices. */
export class CombatAudio{
 private context?:AudioContext;
 private noise?:AudioBuffer;
 private enabled=true;
 private voices=0;
 private world?:World;
 private seen=new Set<number>();
 private swing=-1;
 private lastSound=-10;
 setEnabled(value:boolean){this.enabled=value;if(!value)void this.context?.suspend().catch(()=>{})}
 unlock(){
  if(!this.enabled)return;
  try{if(!this.context){const Audio=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Audio)return;this.context=new Audio();const buffer=this.context.createBuffer(1,Math.floor(this.context.sampleRate*.16),this.context.sampleRate),data=buffer.getChannelData(0);let seed=391;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1}this.noise=buffer}if(this.context.state==='suspended')void this.context.resume().catch(()=>{})}catch{/* Audio is optional; browser policy must never block Play. */}
 }
 private tone(hz:number,endHz:number,duration:number,volume:number,type:OscillatorType='sine'){
  const c=this.context;if(!c||c.state!=='running'||this.voices>=8)return;this.voices++;
  const o=c.createOscillator(),gain=c.createGain(),t=c.currentTime;o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(endHz,t+duration);gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(gain);gain.connect(c.destination);o.onended=()=>{o.disconnect();gain.disconnect();this.voices--};o.start();o.stop(t+duration+.01);
 }
 private air(pitch:number,duration:number,volume:number){
  const c=this.context;if(!c||!this.noise||c.state!=='running'||this.voices>=8)return;this.voices++;
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),t=c.currentTime;source.buffer=this.noise;source.loop=true;filter.type='bandpass';filter.frequency.setValueAtTime(pitch,t);filter.frequency.exponentialRampToValueAtTime(pitch*.4,t+duration);filter.Q.value=.7;gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(volume,t+.012);gain.gain.exponentialRampToValueAtTime(.001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(c.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();this.voices--};source.start();source.stop(t+duration+.01);
 }
 update(w:World,active:boolean){
  if(this.world!==w){this.world=w;this.seen.clear();this.swing=-1;this.lastSound=-10}
  const t=timeOf(w),fresh=w.effects.filter(e=>!this.seen.has(e.id));this.seen=new Set(w.effects.map(e=>e.id));
  const newSwing=w.axeSwing&&this.swing!==w.axeSwing.started&&t-w.axeSwing.started>=axeProfile(w.axeSwing).contact-.095;if(newSwing)this.swing=w.axeSwing!.started;
  if(!active||!this.enabled||!w.combatTest||this.context?.state!=='running')return;
  if(newSwing)this.air(w.axeSwing?.cut===2?1200:1700,w.axeSwing?.cut===2?.18:.14,w.axeSwing?.cut===2?.09:.075);
  // Coalesce multi-target hits into one impact instead of stacking loud sounds.
  const event=fresh.filter(e=>t-e.born<.15&&['hit','kill','damage','enemy-strike','dodge','bomber-beep','bomber-blast','walker-windup','skitter-charge','skitter-laser','brute-windup','brute-slam','brute-hook','brute-catch','brute-crush','brute-release','brute-step','hound-charge','hound-launch','hound-contact','hound-land'].includes(e.type)&&(e.type!=='bomber-beep'&&e.type!=='bomber-blast'||Math.hypot(e.x-w.player.x,e.y-w.player.y)<700)).sort((a,b)=>Number(b.type==='brute-slam'||b.type==='brute-crush')-Number(a.type==='brute-slam'||a.type==='brute-crush')||Number(b.type==='bomber-blast')-Number(a.type==='bomber-blast')||Number(b.type==='skitter-laser')-Number(a.type==='skitter-laser')||Number(b.type==='damage')-Number(a.type==='damage')||Number(b.type==='kill')-Number(a.type==='kill'))[0];
  if(!event||t-this.lastSound<.055)return;this.lastSound=t;
  if(event.type==='bomber-blast'){this.tone(110,32,.48,.085);this.air(450,.42,.12);this.tone(1550,240,.18,.025,'triangle')}
  else if(event.type==='bomber-beep'){const pitch=620+Math.min(1,event.amount??0)*520;this.tone(pitch,pitch*.92,.07,.035,'square')}
  else if(event.type==='hit'||event.type==='kill'){this.tone(event.type==='kill'||event.heavy?150:300,90,event.heavy?.16:.12,.045,'triangle');this.tone(880,430,.085,.022);this.air(2200,.085,.09)}
  else if(event.type==='damage'){this.tone(100,42,.15,.07);this.air(500,.12,.07)}
  else if(event.type==='enemy-strike'){if(event.enemyKind==='scrap-walker'&&event.amount===0)this.air(1400,.10,.035);else{this.tone(105,48,.16,.045,'triangle');this.tone(920,310,.085,.018);this.air(650,.10,.045)}}
  else if(event.type==='brute-windup'){const duration=event.amount===.5?BRUTE.meleeWindup:event.amount?BRUTE.windup:BRUTE.hookWindup;this.tone(85,event.amount?155:240,duration*.9,.028,'triangle');this.air(700,Math.min(.24,duration*.65),.035)}
  else if(event.type==='brute-slam'){if(event.heavy){this.tone(85,26,.48,.10);this.air(480,.34,.10);this.air(2100,.22,.045);this.tone(520,95,.17,.035,'triangle')}else{this.tone(125,52,.14,.045,'triangle');this.air(850,.10,.04)}}
  else if(event.type==='brute-hook'){this.air(1700,.17,.065);this.tone(330,100,.2,.03,'sawtooth')}
  else if(event.type==='brute-catch'){this.tone(180,62,.2,.07,'triangle');this.air(1400,.16,.06)}
  else if(event.type==='brute-crush'){this.tone(105,32,.32,.085);this.air(900,.24,.08);this.tone(450,170,.19,.025,'sawtooth')}
  else if(event.type==='brute-release'){this.air(1800,.1,.045)}
  else if(event.type==='brute-step'){this.tone(65,35,.12,.022);this.air(450,.09,.015)}
  else if(event.type==='hound-charge'){this.tone(150,620,.32,.022,'sawtooth');this.tone(300,950,.35,.012,'triangle');this.air(1100,.27,.025)}
  else if(event.type==='hound-launch'){this.air(2200,.16,.055);this.tone(420,110,.18,.025,'triangle')}
  else if(event.type==='hound-contact'&&(event.amount??0)>0){this.tone(160,60,.15,.045,'triangle');this.air(1600,.1,.05)}
  else if(event.type==='hound-land'){this.tone(100,43,.15,.025);this.air(800,.23,.035)}
  else if(event.type==='skitter-charge'){this.tone(520,1350,.45,.014,'triangle')}
  else if(event.type==='skitter-laser'){this.tone(1700,260,.12,.032,'sawtooth');this.air(2500,.09,.025)}
  else if(event.type==='walker-windup'){this.tone(230,620,.23,.018,'triangle');this.air(1600,.16,.018)}
  else if(event.type==='dodge')this.air(850,.11,.05);
 }
 dispose(){const c=this.context;this.context=undefined;this.noise=undefined;this.seen.clear();if(c)void c.close().catch(()=>{})}
}
