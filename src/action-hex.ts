/** Point-up regular hexagons. Each secondary's facing edge is centred
 * against a main hexagon edge, with a constant perpendicular gap. */
// The main control is 20% larger; keep companion buttons at their familiar
// size and give every facing edge a little more breathing room.
const c=Math.sqrt(3)/2,primaryRadius=36*1.2,secondaryRadius=27,gap=7;
const smallHalfWidth=c*secondaryRadius;
// Offset along the shared edge's outward normal (30 degrees from vertical).
const centreDistance=c*(primaryRadius+secondaryRadius)+gap;
const dx=centreDistance/2,dy=c*centreDistance;
const centreX=dx+smallHalfWidth,centreY=secondaryRadius+dy;
// Extend the touch wrapper to the left for Repair. Shifting every existing
// cell by the same amount preserves their absolute positions when right-anchored.
const repairInset=centreDistance+smallHalfWidth-centreX;
export type ActionHexCell={left:number;top:number;width:number;height:number};
export type ActionHexSlot='primary'|'sprint'|'dodge'|'repair';
export const ACTION_HEX={gap,padding:6,secondaryScale:secondaryRadius/primaryRadius,width:centreX*2+repairInset,height:centreY+primaryRadius,cells:{
 primary:{left:repairInset+centreX-c*primaryRadius,top:centreY-primaryRadius,width:2*c*primaryRadius,height:2*primaryRadius},
 sprint:{left:repairInset+centreX+dx-smallHalfWidth,top:0,width:2*smallHalfWidth,height:2*secondaryRadius},
 dodge:{left:repairInset,top:0,width:2*smallHalfWidth,height:2*secondaryRadius},
 repair:{left:0,top:centreY-secondaryRadius,width:2*smallHalfWidth,height:2*secondaryRadius},
}} as const;
export const ACTION_HEX_CLIP='polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)';
/** Same inset path for the web SVG and native Skia repair progress border. */
export function actionHexOutline(cell:Pick<ActionHexCell,'width'|'height'>,inset=2){
 const w=cell.width,h=cell.height;
 return `M ${w/2} ${inset} L ${w-inset} ${h*.25+inset/2} L ${w-inset} ${h*.75-inset/2} L ${w/2} ${h-inset} L ${inset} ${h*.75-inset/2} L ${inset} ${h*.25+inset/2} Z`;
}
export function pointInActionHex(x:number,y:number,cell:ActionHexCell){
 const px=Math.abs(x-cell.left-cell.width/2),py=Math.abs(y-cell.top-cell.height/2);
 return px<=cell.width/2&&py<=cell.height/2-px/Math.sqrt(3);
}
export function actionHexAt(x:number,y:number):ActionHexSlot|undefined{return(['primary','sprint','dodge','repair'] as const).find(slot=>pointInActionHex(x,y,ACTION_HEX.cells[slot]))}
