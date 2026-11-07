import type {Direction} from './survival-engine';
import type {RunnerSprite} from './runner-cycles';

/** Engineer v2: fully painted character, no layers from the original Survivor.
 * Each direction has a planted idle, two opposing contact poses, two original
 * Engineer passing poses and a strike. Four gait phases match runnerCycle().
 * Poses are registered and rescaled offline to keep the head/boots stable.
 */
export const ENGINEER_IMAGE_SOURCES:Record<string,string>={
 engineerFront:'/survival/engineer-v2/front.webp',
 engineerRear:'/survival/engineer-v2/rear.webp',
 engineerWalkFront:'/survival/engineer-v2/walk-front.webp',
 engineerWalkRear:'/survival/engineer-v2/walk-rear.webp',
};

const CELL=314;
const SCALE=.42;
const ANCHOR:readonly [number,number]=[157,297];
type EngineerView={sheet:string;passing:string;row:number};
const SHEETS:Record<Direction,EngineerView>={
 down:{sheet:'engineerFront',passing:'engineerWalkFront',row:0},
 'down-right':{sheet:'engineerFront',passing:'engineerWalkFront',row:1},
 right:{sheet:'engineerFront',passing:'engineerWalkFront',row:2},
 'up-right':{sheet:'engineerFront',passing:'engineerWalkFront',row:3},
 up:{sheet:'engineerRear',passing:'engineerWalkRear',row:0},
 'up-left':{sheet:'engineerRear',passing:'engineerWalkRear',row:1},
 left:{sheet:'engineerRear',passing:'engineerWalkRear',row:2},
 'down-left':{sheet:'engineerRear',passing:'engineerWalkRear',row:3},
};
export const ENGINEER_DIRECTIONS=Object.keys(SHEETS) as Direction[];
const frame=(sheet:string,row:number,column:number):RunnerSprite=>({
 sheet,crop:[column*CELL,row*CELL,CELL,CELL],anchor:ANCHOR,scale:SCALE
});
type EngineerPoses={
 idle:RunnerSprite;
 walk:readonly [RunnerSprite,RunnerSprite,RunnerSprite,RunnerSprite];
 punch:RunnerSprite;
};
export const ENGINEER_ART:Record<Direction,EngineerPoses>=Object.fromEntries(
 (Object.entries(SHEETS) as [Direction,EngineerView][]).map(([direction,{sheet,passing,row}])=>[
  direction,{
   idle:frame(sheet,row,0),
   walk:[
    frame(sheet,row,1),   // forward contact
    frame(passing,row,0), // planted passing step, matching arm A
    frame(sheet,row,2),   // opposite foot contact
    frame(passing,row,1), // planted passing step, matching arm B
   ],
   punch:frame(sheet,row,3),
  }
 ])
) as Record<Direction,EngineerPoses>;

/** Identical stride distance, four-phase stepping and bob as the original.
 * No time-based cycling while stationary or blocked; sprint stays aligned.
 */
export function engineerCycle(direction:Direction,distance:number,running:boolean){
 const progress=(((distance%112)+112)%112)/112;
 const phase=Math.min(3,Math.floor(progress*4));
 return {
  sprite:ENGINEER_ART[direction].walk[phase],
  mirror:false,
  frame:phase,
  bob:-(running?.55:.2)*(1-Math.cos(progress*Math.PI*4))
 };
}
