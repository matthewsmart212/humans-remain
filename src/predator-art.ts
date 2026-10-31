import artwork from '../public/survival/predators-v1/artwork.json';
import boarScale from '../public/survival/predators-v1/boar-scale.json';
import type {Direction} from './survival-engine';
export type PredatorKind='boar'|'wolf';
export type PredatorAnimation=keyof typeof artwork.clips|'charge';
export const PREDATOR_CELL=224,PREDATOR_ANCHOR=[112,204] as const;
export const PREDATOR_IMAGES={boarDown:'/survival/predators-v1/boar/down.webp',boarDownLeft:'/survival/predators-v1/boar/down-left.webp',boarLeft:'/survival/predators-v1/boar/left.webp',boarUpLeft:'/survival/predators-v1/boar/up-left.webp',boarUp:'/survival/predators-v1/boar/up.webp',wolfDown:'/survival/predators-v1/wolf/down.webp',wolfDownLeft:'/survival/predators-v1/wolf/down-left.webp',wolfLeft:'/survival/predators-v1/wolf/left.webp',wolfUpLeft:'/survival/predators-v1/wolf/up-left.webp',wolfUp:'/survival/predators-v1/wolf/up.webp'} as const;
const views:Record<Direction,{suffix:'Down'|'DownLeft'|'Left'|'UpLeft'|'Up';mirror:boolean}>={down:{suffix:'Down',mirror:false},'down-left':{suffix:'DownLeft',mirror:false},left:{suffix:'Left',mirror:false},'up-left':{suffix:'UpLeft',mirror:false},up:{suffix:'Up',mirror:false},'up-right':{suffix:'UpLeft',mirror:true},right:{suffix:'Left',mirror:true},'down-right':{suffix:'DownLeft',mirror:true}};
export function predatorView(kind:PredatorKind,direction:Direction){const v=views[direction];return{key:(kind+v.suffix) as keyof typeof PREDATOR_IMAGES,mirror:v.mirror}}
/** One uniform correction per view, shared by every pose and both renderers. */
export function predatorScale(kind:PredatorKind,direction:Direction){
 const source=artwork.views[direction].source as keyof typeof boarScale;
 return kind==='boar'?.68*boarScale[source]:.65;
}
export function predatorClip(kind:PredatorKind,state:PredatorAnimation){
 const overrides=artwork.combatClips[kind] as Record<string,{frames:number[];milliseconds:number[];loop:boolean}>;
 return overrides[state]??artwork.clips[state as keyof typeof artwork.clips]??artwork.clips.run;
}
/** Sprite timeline only. Hitboxes and damage live in camp-predators. */
export function predatorFrame(kind:PredatorKind,state:PredatorAnimation,ageSeconds:number){
 const clip=predatorClip(kind,state),duration=clip.milliseconds.reduce((a,b)=>a+b,0);let ms=Math.max(0,Number.isFinite(ageSeconds)?ageSeconds*1000:0);
 if(clip.loop)ms%=duration;
 for(let i=0;i<clip.frames.length;i++){if(ms<clip.milliseconds[i])return clip.frames[i];ms-=clip.milliseconds[i]}
 return clip.frames[clip.frames.length-1];
}
