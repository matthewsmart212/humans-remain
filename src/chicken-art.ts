import type {Direction} from './survival-engine';

export const CHICKEN_IMAGES={chickenDown:'/survival/chicken-v1/down.webp',chickenDownLeft:'/survival/chicken-v1/down-left.webp',chickenLeft:'/survival/chicken-v1/left.webp',chickenUpLeft:'/survival/chicken-v1/up-left.webp',chickenUp:'/survival/chicken-v1/up.webp'};
export const CHICKEN_CELL=224,CHICKEN_ANCHOR=[112,196] as const,CHICKEN_SCALE=.32;
const VIEWS:Record<Direction,{key:keyof typeof CHICKEN_IMAGES;mirror:boolean}>={
 down:{key:'chickenDown',mirror:false},'down-right':{key:'chickenDownLeft',mirror:true},right:{key:'chickenLeft',mirror:true},'up-right':{key:'chickenUpLeft',mirror:true},up:{key:'chickenUp',mirror:false},'up-left':{key:'chickenUpLeft',mirror:false},left:{key:'chickenLeft',mirror:false},'down-left':{key:'chickenDownLeft',mirror:false},
};
export function chickenView(direction:Direction){return VIEWS[direction]}
