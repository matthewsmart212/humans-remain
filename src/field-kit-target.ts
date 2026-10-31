export type FieldKitTarget={
 buildingId?:import('./camp-restoration').CampBuildingId;revealed?:boolean;repairState?:'holding'|'falling'|'ready';
 repairInfo?:{condition:string;materials:{id:string;name:string;have:number;needed:number}[];hint:string};
 x:number;y:number;label:string;id?:string;detail?:string;blocked?:boolean;
 rockId?:string;forageId?:string;treeId?:string;pickupId?:number;
 ground?:{x:number;y:number;rx:number;ry:number};
 progress?:number;progressLabel?:string;
};
type Presentation={tick?:number;fieldKitTarget?:FieldKitTarget;fieldKitBuildingFocus?:{id:import('./camp-restoration').CampBuildingId;tick:number}};
export function getFieldKitTarget(world:object){return (world as Presentation).fieldKitTarget}
export function getBuildingFocus(world:object){return (world as Presentation).fieldKitBuildingFocus}
// Presentation only; presentPlayer carries this through its shallow World copy.
export function setFieldKitTarget(world:object,target?:FieldKitTarget){const p=world as Presentation;p.fieldKitTarget=target;if(target?.revealed&&target.buildingId)p.fieldKitBuildingFocus={id:target.buildingId,tick:p.tick??0}}
/** A single ground-level brass ring, before scenery and actors. No world text. */
export function drawFieldKitTarget(ctx:CanvasRenderingContext2D,world:object,scale:number){
 const target=getFieldKitTarget(world);if(!target)return;
 const s=Math.max(.05,scale),g=target.ground??{x:target.x,y:target.y+5,rx:28,ry:10};
 const rx=Math.max(g.rx,16/s),ry=Math.max(g.ry,5/s);
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
 // Explicit arcs also work with the native Skia adapter's full-oval ellipse API.
 for(const start of [.12,Math.PI+.12])for(let i=0;i<=24;i++){
  const angle=start+(Math.PI-.24)*i/24,x=g.x+Math.cos(angle)*rx,y=g.y+Math.sin(angle)*ry;
  if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
 }
 ctx.strokeStyle='#182c25cc';ctx.lineWidth=3.8/s;ctx.stroke();
 ctx.strokeStyle=target.blocked?'#b7aa85':'#e6cf92';ctx.lineWidth=1.25/s;ctx.stroke();ctx.restore();
}
