import type {Direction} from './survival-engine';
import type {RunnerSprite} from './runner-cycles';
import {HUNTER_WALK_V2,HUNTER_WALK_V2_SOURCES,hunterWalkV2Cycle} from './hunter-walk-v2';
import {HUNTER_RUN_GRIPS} from './hunter-run-grips';

const SHEETS={down:'hunterDown','down-right':'hunterDownRight',right:'hunterRight','up-right':'hunterUpRight',up:'hunterUp'};
const VIEWS:Record<Direction,keyof typeof SHEETS>={
 down:'down','down-right':'down-right',right:'right','up-right':'up-right',up:'up',
 'up-left':'up-right',left:'right','down-left':'down-right'
};

// Each painted facing has a legacy sheet, a walk sheet and a run sheet.
// Their three mirrored views reuse those same textures.
export const HUNTER_IMAGE_SOURCES:Record<string,string>={...HUNTER_WALK_V2_SOURCES};
for(const [direction,sheet] of Object.entries(SHEETS)){
 HUNTER_IMAGE_SOURCES[sheet]=`/survival/hunter-v1/${direction}.webp`;
 HUNTER_IMAGE_SOURCES[sheet+'Run']=`/survival/hunter-v1/run-v5/${direction}.webp`;
}

const WIDTH=206,HEIGHT=236,SCALE=112/222;
const ANCHOR:readonly [number,number]=[103,232];
const legacyFrame=(sheet:string,index:number):RunnerSprite=>({
 sheet,crop:[(index%6)*WIDTH,Math.floor(index/6)*HEIGHT,WIDTH,HEIGHT],
 anchor:ANCHOR,scale:SCALE
});
type Poses={idle:RunnerSprite;punch:RunnerSprite;walk:readonly RunnerSprite[]};

export const HUNTER_LEGACY_ART:Record<Direction,Poses>=Object.fromEntries(
 Object.entries(VIEWS).map(([direction,view])=>{
  const sheet=SHEETS[view];
  return [direction,{
   idle:legacyFrame(sheet,6),
   punch:legacyFrame(sheet,6),
   walk:Array.from({length:36},(_,i)=>legacyFrame(sheet,i))
  }];
 })
) as unknown as Record<Direction,Poses>;

/** Select stationary, planted-feet frames from the user's new walking artwork. */
const IDLE_FRAME:Record<Direction,number>={
 down:0,'down-right':8,right:7,'up-right':7,up:7,
 'up-left':7,left:7,'down-left':8
};
// Each facing packs its own stride into a single mobile texture.
const RUN_WIDTH=288,RUN_HEIGHT=400,RUN_COLS=6;
const RUN_ANCHOR:readonly [number,number]=[RUN_WIDTH/2,RUN_HEIGHT-4];
type HunterPoses=Poses&{run:readonly RunnerSprite[]};
export const HUNTER_ART:Record<Direction,HunterPoses>=Object.fromEntries(
 (Object.keys(VIEWS) as Direction[]).map<[Direction,HunterPoses]>(direction=>[
  direction,{
   idle:HUNTER_WALK_V2[direction][IDLE_FRAME[direction]],
   punch:HUNTER_LEGACY_ART[direction].punch,
   walk:HUNTER_WALK_V2[direction],
   run:HUNTER_RUN_GRIPS[VIEWS[direction]].map((hand,index):RunnerSprite=>({
    sheet:SHEETS[VIEWS[direction]]+'Run',
    crop:[index%RUN_COLS*RUN_WIDTH,Math.floor(index/RUN_COLS)*RUN_HEIGHT,RUN_WIDTH,RUN_HEIGHT],
    anchor:RUN_ANCHOR,scale:1/3,
    hand
   }))
  }
 ])
) as Record<Direction,HunterPoses>;

export const hunterFacing=(direction:Direction)=>({view:direction,mirror:VIEWS[direction]!==direction});

/** World movement wraps walkDistance at 112 for both gaits, including co-op peers. */
export function hunterCycle(direction:Direction,distance:number,running:boolean,images?:Readonly<Record<string,unknown>>){
 const art=HUNTER_ART[direction];
 if(running&&(!images||images[art.run[0].sheet])){
  const phase=((distance%112)+112)%112/112;
  const mirror=VIEWS[direction]!==direction;
  const index=Math.floor(phase*art.run.length);
  return {sprite:art.run[index],mirror,frame:Math.floor(index*4/art.run.length),bob:0};
 }
 if(images&&!images[art.idle.sheet])return hunterLegacyCycle(direction,distance,running);
 return hunterWalkV2Cycle(direction,distance,running);
}

/** Only used if the new walking atlas for the current direction isn't available. */
export function hunterLegacyCycle(direction:Direction,distance:number,running:boolean){
 const absolute=((distance%(112*6))+(112*6))%(112*6);
 const row=Math.floor(absolute/112),progress=(absolute%112)/112;
 const column=Math.min(5,Math.floor(progress*6)),frameIndex=row*6+column;
 const gripFrame=Math.min(3,Math.floor(column*4/6));
 return {
  sprite:HUNTER_LEGACY_ART[direction].walk[frameIndex],
  mirror:VIEWS[direction]!==direction,frame:gripFrame,
  bob:-(running?.55:.2)*(1-Math.cos(progress*Math.PI*4))
 };
}
