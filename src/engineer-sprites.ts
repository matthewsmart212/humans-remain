import type {Direction} from './survival-engine';
import type {RunnerSprite} from './runner-cycles';

/** Original painted Engineer sprites, four columns per direction:
 * idle, left step, right step, punch. Eight distinct directions, no mirrored
 * copies of the Survivor and no runtime costume overlay.
 */
export const ENGINEER_IMAGE_SOURCES:Record<string,string>={
 engineerFront:'/survival/engineer-v1/front.webp',
 engineerRear:'/survival/engineer-v1/rear.webp',
};

const CELL=314;
const SCALE=.42; // painted figure is about 113 world units tall, like the Survivor
const ANCHOR:readonly [number,number]=[157,297]; // fixed feet anchor across all poses
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
export const ENGINEER_DIRECTIONS=Object.keys(SHEETS) as Direction[];

function frame(sheet:string,row:number,column:number):RunnerSprite{
 return {sheet,crop:[column*CELL,row*CELL,CELL,CELL],anchor:ANCHOR,scale:SCALE};
}
export const ENGINEER_ART:Record<Direction,{idle:RunnerSprite;walk:readonly [RunnerSprite,RunnerSprite];punch:RunnerSprite}>=Object.fromEntries(
 (Object.entries(SHEETS) as [Direction,{sheet:string;row:number}][]).map(([direction,{sheet,row}])=>[
  direction,{idle:frame(sheet,row,0),walk:[frame(sheet,row,1),frame(sheet,row,2)],punch:frame(sheet,row,3)}
 ])
) as Record<Direction,{idle:RunnerSprite;walk:readonly [RunnerSprite,RunnerSprite];punch:RunnerSprite}>;

/** Same distance-driven phase as the original animation engine, using the
 * Engineer's own alternate foot contacts rather than borrowing runner legs.
 */
export function engineerCycle(direction:Direction,distance:number,running:boolean){
 const progress=(((distance%112)+112)%112)/112;
 const phase=Math.min(3,Math.floor(progress*4));
 const sprite=ENGINEER_ART[direction].walk[phase%2];
 return {sprite,mirror:false,frame:phase,bob:-(running?.55:.2)*(1-Math.cos(progress*Math.PI*4))};
}