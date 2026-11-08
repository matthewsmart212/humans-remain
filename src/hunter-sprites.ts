import type {Direction} from './survival-engine';
import type {RunnerSprite} from './runner-cycles';
import {HUNTER_WALK_V2,HUNTER_WALK_V2_SOURCES,hunterWalkV2Cycle} from './hunter-walk-v2';

/**
 * Hunter gameplay sprites. The new painted Ludo v2 atlases are used for
 * walking and neutral idle in every view. Keep the original v1 sheets for
 * punch poses and as a fallback if a v2 texture fails to load.
 *
 * Every new pose uses the same 283 x 436 crop and foot-relative anchor.
 * Westward views mirror the eastward textures at draw time.
 */
export const HUNTER_IMAGE_SOURCES:Record<string,string>={
 hunterDown:'/survival/hunter-v1/down.webp',
 hunterDownRight:'/survival/hunter-v1/down-right.webp',
 hunterRight:'/survival/hunter-v1/right.webp',
 hunterUpRight:'/survival/hunter-v1/up-right.webp',
 hunterUp:'/survival/hunter-v1/up.webp',
 ...HUNTER_WALK_V2_SOURCES
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
const legacyFrame=(sheet:string,index:number):RunnerSprite=>({
 sheet,crop:[(index%6)*WIDTH,Math.floor(index/6)*HEIGHT,WIDTH,HEIGHT],
 anchor:ANCHOR,scale:SCALE
});
type Poses={idle:RunnerSprite;punch:RunnerSprite;walk:readonly RunnerSprite[]};

export const HUNTER_LEGACY_ART:Record<Direction,Poses>=Object.fromEntries(
 (Object.entries(VIEWS) as [Direction,View][]).map(([direction,{sheet}])=>[
  direction,{
   idle:legacyFrame(sheet,6),
   punch:legacyFrame(sheet,6),
   walk:Array.from({length:36},(_,i)=>legacyFrame(sheet,i))
  }
 ])
) as unknown as Record<Direction,Poses>;

/** Select stationary, planted-feet frames from the user's new walking artwork. */
const IDLE_FRAME:Record<Direction,number>={
 down:0,'down-right':8,right:7,'up-right':7,up:7,
 'up-left':7,left:7,'down-left':8
};
export const HUNTER_ART:Record<Direction,Poses>=Object.fromEntries(
 (Object.keys(VIEWS) as Direction[]).map(direction=>[
  direction,{
   idle:HUNTER_WALK_V2[direction][IDLE_FRAME[direction]],
   punch:HUNTER_LEGACY_ART[direction].punch,
   walk:HUNTER_WALK_V2[direction]
  }
 ])
) as unknown as Record<Direction,Poses>;

export const hunterFacing=(direction:Direction)=>({view:direction,mirror:VIEWS[direction].mirror});

/** Distance-driven gait, synced to world movement and compatible with tool grip phases. */
export const hunterCycle=hunterWalkV2Cycle;

/** Only used if the new walking atlas for the current direction isn't available. */
export function hunterLegacyCycle(direction:Direction,distance:number,running:boolean){
 const absolute=((distance%(112*6))+(112*6))%(112*6);
 const row=Math.floor(absolute/112),progress=(absolute%112)/112;
 const column=Math.min(5,Math.floor(progress*6)),frameIndex=row*6+column;
 const gripFrame=Math.min(3,Math.floor(column*4/6));
 return {
  sprite:HUNTER_LEGACY_ART[direction].walk[frameIndex],
  mirror:VIEWS[direction].mirror,frame:gripFrame,
  bob:-(running?.55:.2)*(1-Math.cos(progress*Math.PI*4))
 };
}
