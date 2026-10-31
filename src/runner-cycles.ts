import type {Direction} from './survival-engine';
import registered from './runner-cycle-frames.json';

export type RunnerSprite={sheet:string;crop:readonly number[];anchor:readonly number[];scale:number};
export const RUNNER_CYCLES:Record<string,readonly RunnerSprite[]>=registered;
export const RUNNER_CYCLE_SOURCES={
 runnerCycleDown:'/survival/scrap-runner/scrap-runner-down-walk-sprint-v1.png',
 runnerCycleDownRight:'/survival/scrap-runner/scrap-runner-down-right-walk-sprint-v1.png',
 runnerCycleRight:'/survival/scrap-runner/scrap-runner-right-walk-sprint-v1.png',
 runnerCycleUpRight:'/survival/scrap-runner/scrap-runner-up-right-walk-sprint-v1.png',
 runnerCycleUp:'/survival/scrap-runner/scrap-runner-up-walk-sprint-v1.png',
 runnerLegLayers:'/survival/scrap-runner/scrap-runner-leg-layers-v1.png'
};
const VIEWS:Record<Direction,{view:Direction;mirror:boolean}>={
 down:{view:'down',mirror:false},'down-right':{view:'down-right',mirror:false},right:{view:'right',mirror:false},
 'up-right':{view:'up-right',mirror:false},up:{view:'up',mirror:false},
 'up-left':{view:'up-right',mirror:true},left:{view:'right',mirror:true},'down-left':{view:'down-right',mirror:true}
};
// Idle and movement must use the same painted view. The separately generated
// left-facing idle drawings are wider than their mirrored movement cycles.
export const runnerFacing=(direction:Direction)=>VIEWS[direction];

// Four restrained body/arm poses. Approved views retain the complete drawings;
// runner-leg-motion replaces the legs only in the affected view/gait pairs.
export const WALK_SEQUENCE:Record<string,readonly number[]>={
 down:[0,2,4,6],'down-right':[0,1,6,5],right:[0,1,4,5],
 'up-right':[0,2,1,3],up:[0,1,3,2]
};
export const RUN_SEQUENCE:Record<string,readonly number[]>={
 down:[8,9,12,11],'down-right':[8,9,12,13],right:[8,9,12,13],
 'up-right':[12,13,14,15],up:[8,9,12,13]
};
export function runnerCycle(direction:Direction,distance:number,running:boolean){
 const {view,mirror}=VIEWS[direction],phase=((distance%112)+112)%112/112;
 const frame=Math.min(3,Math.floor(phase*4)),index=(running?RUN_SEQUENCE:WALK_SEQUENCE)[view][frame];
 return {sprite:RUNNER_CYCLES[view][index],mirror,frame,
  bob:-(running?.55:.2)*(1-Math.cos(phase*Math.PI*4))};
}
