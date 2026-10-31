import type {Direction} from './survival-engine';
export const SURVIVOR_DIRECTIONS=['down','down-right','right','up-right','up','up-left','left','down-left'] as const;
export const SURVIVOR_COLUMNS=4;
export const SURVIVOR_WORLD_HEIGHT=112;
export function survivorDirection(direction:Direction):Direction{return direction}
// Legacy contact-frame indexing for artwork inspection. Live walking uses the
// authored walk/run sheets in runner-cycles instead of these two old contacts.
const WALK_COLUMNS=[1,0,2,0] as const;
export function survivorFrame(direction:Direction,moving:boolean,walkDistance:number){
 const facing=survivorDirection(direction);
 const phase=Math.floor(((walkDistance%112)+112)%112/28);
 return {direction:facing,row:SURVIVOR_DIRECTIONS.indexOf(facing),column:moving?WALK_COLUMNS[phase]:0};
}
