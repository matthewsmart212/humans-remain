import type {Direction} from './survival-engine';
import type {RunnerSprite} from './runner-cycles';

/**
 * Five original Ludo Hunter walk sheets, 36 frames per view.
 * All frames use a common 206x236 cell, fixed head pivot and planted feet.
 * The three leftward views mirror the artwork, never the whole game camera.
 * One six-frame walk cycle is used per 112 travelled world units; the six
 * authored rows rotate across strides instead of playing 36 poses in one step.
 * Until a dedicated run/attack pack exists, sprint accelerates this same
 * distance-driven gait and attacks hold the neutral Hunter pose.
 */
export const HUNTER_IMAGE_SOURCES:Record<string,string>={
 hunterDown:'/survival/hunter-v1/down.webp',
 hunterDownRight:'/survival/hunter-v1/down-right.webp',
 hunterRight:'/survival/hunter-v1/right.webp',
 hunterUpRight:'/survival/hunter-v1/up-right.webp',
 hunterUp:'/survival/hunter-v1/up.webp',
};
type View={sheet:string;mirror:boolean};
const VIEWS:Record<Direction,View>={
 down:{sheet:'hunterDown',mirror:false},
 'down-right':{sheet:'hunterDownRight',mirror:false},
 right:{sheet:'hunterRight',mirror:false},
 'up-right':{sheet:'hunterUpRight',mirror:false},
 up:{sheet:'hunterUp',mirror:false},
 'up-left':{sheet:'hunterUpRight',mirror:true},
 left:{sheet:'hunterRight',mirror:true},
 'down-left':{sheet:'hunterDownRight',mirror:true}
};
const WIDTH=206,HEIGHT=236,SCALE=112/222;
const ANCHOR:readonly [number,number]=[103,232];
const frame=(sheet:string,index:number):RunnerSprite=>({
 sheet,crop:[(index%6)*WIDTH,Math.floor(index/6)*HEIGHT,WIDTH,HEIGHT],
 anchor:ANCHOR,scale:SCALE
});
type Poses={idle:RunnerSprite;punch:RunnerSprite;walk:readonly RunnerSprite[]};
export const HUNTER_ART:Record<Direction,Poses>=Object.fromEntries(
 (Object.entries(VIEWS) as [Direction,View][]).map(([direction,{sheet}])=>[
  direction,{idle:frame(sheet,6),punch:frame(sheet,6),walk:Array.from({length:36},(_,i)=>frame(sheet,i))}
 ])
) as unknown as Record<Direction,Poses>;
export const hunterFacing=(direction:Direction)=>({view:direction,mirror:VIEWS[direction].mirror});
export function hunterCycle(direction:Direction,distance:number,running:boolean){
 const absolute=((distance%(112*6))+(112*6))%(112*6);
 const row=Math.floor(absolute/112),progress=(absolute%112)/112;
 const column=Math.min(5,Math.floor(progress*6)),frameIndex=row*6+column;
 // Tool grips, melee attachments and torch positions have four registered
 // phases. The Hunter artwork itself has six distinct poses per stride.
 // Keep all six painted poses, but report a compatible 0..3 grip phase.
 const gripFrame=Math.min(3,Math.floor(column*4/6));
 return {sprite:HUNTER_ART[direction].walk[frameIndex],mirror:VIEWS[direction].mirror,
  frame:gripFrame,bob:-(running?.55:.2)*(1-Math.cos(progress*Math.PI*4))};
}
