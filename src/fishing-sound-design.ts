import type {FishingCue} from './fishing-feedback';

/** Original, deterministic mono foley. Shared by browser playback and the tiny
 * bundled iPhone WAVs; no fetching, synthesis or file IO in the game loop. */
export const FISHING_SAMPLE_RATE=22050;
export const FISHING_CUE_DURATION:Record<FishingCue,number>={cast:.32,splash:.36,nibble:.11,bite:.29,hook:.15,surge:.36,land:.52,keep:.22,release:.4,escape:.25,signal:.64,warning:.38,reel:.055};
export function fishingSoundSamples(cue:FishingCue){
 const duration=FISHING_CUE_DURATION[cue],data=new Float32Array(Math.ceil(FISHING_SAMPLE_RATE*duration));let seed=391+cue.length*7919,low=0;
 for(let i=0;i<data.length;i++){
  const t=i/FISHING_SAMPLE_RATE,u=t/duration;seed=(seed*16807)%2147483647;const noise=seed/1073741824-1;low=low*.84+noise*.16;
  const envelope=Math.min(1,t/.008)*Math.pow(1-u,2),tone=(hz:number)=>Math.sin(2*Math.PI*hz*t),water=low*.8+noise*.12;
  let value=0;
  if(cue==='cast')value=(noise-low)*Math.sin(Math.PI*u)*.13;
  else if(cue==='splash'||cue==='release')value=water*envelope*.78+tone(180-90*u)*envelope*.07;
  else if(cue==='nibble')value=tone(540-250*u)*envelope*.105+water*envelope*.12;
  else if(cue==='bite'){const pulse=t<.12?Math.exp(-t*24):t>.16?Math.exp(-(t-.16)*25):0;value=(tone(640-160*u)*.24+water*.4)*pulse*Math.min(1,t/.004)}
  else if(cue==='hook')value=(tone(310-190*u)*.18+(noise-low)*.18)*envelope;
  else if(cue==='warning')value=(tone(160+120*u)*.05+low*.18)*(Math.sin(Math.PI*u)**2);
  else if(cue==='surge')value=(water*.55+tone(110-35*u)*.07)*envelope;
  else if(cue==='land')value=(water*.55+tone(130-50*u)*.10)*envelope+tone(540)*Math.sin(Math.PI*u)*.025;
  else if(cue==='keep')value=(low*.3+tone(125)*.10)*envelope;
  else if(cue==='escape')value=(water*.35+tone(390-210*u)*.055)*envelope;
  else if(cue==='signal'){const pulse=t% .2;value=(pulse<.065?tone(710+80*Math.floor(t/.2))*Math.sin(Math.PI*pulse/.065)*.07:0)+noise*envelope*.014}
  else if(cue==='reel')value=((noise-low)*.15+tone(1350)*.025)*envelope;
  data[i]=Math.max(-.7,Math.min(.7,value));
 }
 return data;
}
