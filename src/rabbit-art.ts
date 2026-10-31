import type {Direction} from './survival-engine';
export const RABBIT_IMAGES={rabbitDown:'/survival/rabbit-v1/down.webp',rabbitDownLeft:'/survival/rabbit-v1/down-left.webp',rabbitLeft:'/survival/rabbit-v1/left.webp',rabbitUpLeft:'/survival/rabbit-v1/up-left.webp',rabbitUp:'/survival/rabbit-v1/up.webp'};
export const RABBIT_CELL=192,RABBIT_ANCHOR=[96,170] as const,RABBIT_SCALE=.36;
const views:Record<Direction,{key:keyof typeof RABBIT_IMAGES;mirror:boolean}>={down:{key:'rabbitDown',mirror:false},'down-left':{key:'rabbitDownLeft',mirror:false},left:{key:'rabbitLeft',mirror:false},'up-left':{key:'rabbitUpLeft',mirror:false},up:{key:'rabbitUp',mirror:false},'up-right':{key:'rabbitUpLeft',mirror:true},right:{key:'rabbitLeft',mirror:true},'down-right':{key:'rabbitDownLeft',mirror:true}};
export const rabbitView=(direction:Direction)=>views[direction];
