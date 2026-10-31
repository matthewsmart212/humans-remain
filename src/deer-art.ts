import type {Direction} from './survival-engine';
import type {DeerKind} from './camp-deer';
export const DEER_IMAGES={doeDown:'/survival/deer-v1/doe/down.webp',doeDownLeft:'/survival/deer-v1/doe/down-left.webp',doeLeft:'/survival/deer-v1/doe/left.webp',doeUpLeft:'/survival/deer-v1/doe/up-left.webp',doeUp:'/survival/deer-v1/doe/up.webp',stagDown:'/survival/deer-v1/stag/down.webp',stagDownLeft:'/survival/deer-v1/stag/down-left.webp',stagLeft:'/survival/deer-v1/stag/left.webp',stagUpLeft:'/survival/deer-v1/stag/up-left.webp',stagUp:'/survival/deer-v1/stag/up.webp'};
export const DEER_CELL=224,DEER_ANCHOR=[112,204] as const;
export const DEER_SCALE={doe:.6,stag:.68};
const views:Record<Direction,{suffix:'Down'|'DownLeft'|'Left'|'UpLeft'|'Up';mirror:boolean}>={down:{suffix:'Down',mirror:false},'down-left':{suffix:'DownLeft',mirror:false},left:{suffix:'Left',mirror:false},'up-left':{suffix:'UpLeft',mirror:false},up:{suffix:'Up',mirror:false},'up-right':{suffix:'UpLeft',mirror:true},right:{suffix:'Left',mirror:true},'down-right':{suffix:'DownLeft',mirror:true}};
export function deerView(kind:DeerKind,direction:Direction){const v=views[direction];return{key:(kind+v.suffix) as keyof typeof DEER_IMAGES,mirror:v.mirror}}
