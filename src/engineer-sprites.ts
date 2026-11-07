import type {Direction} from './survival-engine';
import type {RunnerSprite} from './runner-cycles';

/** Painted Engineer atlases: 8 directions × (idle, walk A, walk B, punch).
 * No source-Survivor costume overlays; the character body is entirely replaced.
 */
export const ENGINEER_IMAGE_SOURCES:Record<string,string>={
 engineerFront:'/survival/engineer-v1/front.webp',
 engineerRear:'/survival/engineer-v1/rear.webp',
};
const CELL=314,SCALE=.42;
const ANCHOR:readonly [number,number]=[157,297];
const SHEETS:Record<Direction,{sheet:string;row:number}>={
 down:{sheet:'engineerFront',row:0},
 'down-right':{sheet:'engineerFront',row:1},
 right:{sheet:'engineerFront',row:2},
 'up-right':{sheet:'engineerFront',row:3},
 up:{sheet:'engineerRear',row:0},
 'up-left':{sheet:'engineerRear',row:1},
 left:{sheet:'engineerRear',row:2},
 'down-left':{sheet:'engineerRear',row:3},
};
function frame(sheet:string,row:number,column:number):RunnerSprite{
 return {sheet,crop:[column*CELL,row*CELL,CELL,CELL],anchor:ANCHOR,scale:SCALE};
}
export const ENGINEER_ART:Record<Direction,{idle:RunnerSprite;walk:readonly [RunnerSprite,RunnerSprite];punch:RunnerSprite}>=Object.fromEntries(
 (Object.entries(SHEETS) as [Direction,{sheet:string;row:number}][]).map(([direction,{sheet,row}])=>[
  direction,{idle:frame(sheet,row,0),walk:[frame(sheet,row,1),frame(sheet,row,2)],punch:frame(sheet,row,3)}
 ])
) as Record<Direction,{idle:RunnerSprite;walk:readonly [RunnerSprite,RunnerSprite];punch:RunnerSprite}>;
export function engineerCycle(direction:Direction,distance:number,running:boolean){
 const progress=(((distance%112)+112)%112)/112;
 const phase=Math.min(3,Math.floor(progress*4));
 return {sprite:ENGINEER_ART[direction].walk[phase%2],mirror:false,frame:phase,bob:-(running?.55:.2)*(1-Math.cos(progress*Math.PI*4))};
}
