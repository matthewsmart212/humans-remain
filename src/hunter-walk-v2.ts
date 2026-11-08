import type {Direction} from './survival-engine';
import type {RunnerSprite} from './runner-cycles';

/**
 * Hunter Ludo walking pack, November 2026.
 * Five authored directions; the three westward directions are mirrored at draw time.
 * Atlas cells: 283 x 436; 5 columns. The bottom-centre is the character's ground pivot.
 *
 * This module is prepared separately so the existing live Hunter rendering continues
 * to work until the matching PNG atlases have been committed.
 */
export const HUNTER_WALK_V2_SOURCES:Record<string,string> = {
 hunterWalkV2Down: '/survival/hunter-v1/walk-v2/down.png',
 hunterWalkV2DownRight: '/survival/hunter-v1/walk-v2/down-right.png',
 hunterWalkV2Right: '/survival/hunter-v1/walk-v2/right.png',
 hunterWalkV2UpRight: '/survival/hunter-v1/walk-v2/up-right.png',
 hunterWalkV2Up: '/survival/hunter-v1/walk-v2/up.png'
};

const CELL_WIDTH = 283;
const CELL_HEIGHT = 436;
const COLS = 5;
const SCALE = 112 / 410;
const ANCHOR:readonly [number,number] = [CELL_WIDTH / 2, CELL_HEIGHT - 4];
const STEP_DISTANCE = 112;
export const HUNTER_WALK_V2_SUGGESTED_FRAME_MS = 70;

const VIEWS:Record<Direction,{sheet:string;count:number;mirror:boolean}> = {
 down:{sheet:'hunterWalkV2Down',count:13,mirror:false},
 'down-right':{sheet:'hunterWalkV2DownRight',count:20,mirror:false},
 right:{sheet:'hunterWalkV2Right',count:18,mirror:false},
 'up-right':{sheet:'hunterWalkV2UpRight',count:18,mirror:false},
 up:{sheet:'hunterWalkV2Up',count:19,mirror:false},
 'up-left':{sheet:'hunterWalkV2UpRight',count:18,mirror:true},
 left:{sheet:'hunterWalkV2Right',count:18,mirror:true},
 'down-left':{sheet:'hunterWalkV2DownRight',count:20,mirror:true}
};

function sprite(sheet:string,index:number):RunnerSprite {
 return {
  sheet,
  crop:[(index % COLS)*CELL_WIDTH,Math.floor(index / COLS)*CELL_HEIGHT,CELL_WIDTH,CELL_HEIGHT],
  anchor:ANCHOR,
  scale:SCALE
 };
}

export const HUNTER_WALK_V2:Record<Direction,readonly RunnerSprite[]> = Object.fromEntries(
 (Object.entries(VIEWS) as [Direction,(typeof VIEWS)[Direction]][]).map(
  ([direction,view]) => [direction,Array.from({length:view.count},(_,index)=>sprite(view.sheet,index))]
 )
) as unknown as Record<Direction,readonly RunnerSprite[]>;

/** Frame selection is distance-driven to prevent skating at different movement speeds. */
export function hunterWalkV2Cycle(direction:Direction,distance:number,running:boolean) {
 const view=VIEWS[direction];
 const strideProgress=((distance % STEP_DISTANCE)+STEP_DISTANCE)%STEP_DISTANCE / STEP_DISTANCE;
 const index=Math.min(view.count-1,Math.floor(strideProgress*view.count));
 const gripFrame=Math.min(3,Math.floor(strideProgress*4));
 return {
  sprite:HUNTER_WALK_V2[direction][index],
  mirror:view.mirror,
  frame:gripFrame,
  bob:-(running ? .55 : .2)*(1-Math.cos(strideProgress*Math.PI*4))
 };
}
