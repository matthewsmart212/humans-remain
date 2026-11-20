export type FieldKitTarget={
 buildingId?:import('./camp-restoration').CampBuildingId;revealed?:boolean;repairState?:'holding'|'falling'|'ready';
 repairInfo?:{condition:string;materials:{id:string;name:string;have:number;needed:number}[];hint:string};
 x:number;y:number;label:string;id?:string;detail?:string;blocked?:boolean;
 rockId?:string;forageId?:string;treeId?:string;pickupId?:number;
 progress?:number;progressLabel?:string;
};
type Presentation={tick?:number;fieldKitTarget?:FieldKitTarget;fieldKitBuildingFocus?:{id:import('./camp-restoration').CampBuildingId;tick:number}};
export function getFieldKitTarget(world:object){return (world as Presentation).fieldKitTarget}
export function getBuildingFocus(world:object){return (world as Presentation).fieldKitBuildingFocus}
// Presentation only; presentPlayer carries this through its shallow World copy.
export function setFieldKitTarget(world:object,target?:FieldKitTarget){const p=world as Presentation;p.fieldKitTarget=target;if(target?.revealed&&target.buildingId)p.fieldKitBuildingFocus={id:target.buildingId,tick:p.tick??0}}
// The short tail points to the usable spot while the plate sits beside the actor.
const pinOutline = [[0,0],[3,-8],[3,-19],[7,-23],[19,-23],[23,-19],[23,-9],[19,-5],[8,-5]] as const;
const hand = [[7,-14],[10,-12],[10,-18],[11.5,-18],[11.5,-14],[12,-14],[12,-19.5],[13.5,-19.5],[13.5,-14],[14,-14],[14,-19],[15.5,-19],[15.5,-14],[16,-14],[16,-17.5],[17.5,-17.5],[17.5,-12],[16,-9],[11,-9],[7,-13]] as const;

function polygon(ctx:CanvasRenderingContext2D,points:readonly (readonly [number,number])[]){
 ctx.beginPath();
 ctx.moveTo(...points[0]);
 for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
 ctx.closePath();
}

export function drawFieldKitTarget(ctx:CanvasRenderingContext2D,world:object,scale:number){
 const target=getFieldKitTarget(world);
 if(!target||typeof target.id==='string'&&target.id.startsWith('rare-chest:'))return;
 ctx.save();
 ctx.translate(target.x,target.y);
 const unit=1/Math.max(.05,scale);
 ctx.scale(unit,unit);
 polygon(ctx,pinOutline);
 ctx.fillStyle=target.blocked?'#39352e':'#233d36';
 ctx.fill();
 ctx.strokeStyle=target.blocked?'#bc9e77':'#e4bf78';
 ctx.lineWidth=1.6;
 ctx.stroke();
 ctx.fillStyle=target.blocked?'#ffc09b':'#ffdf9f';
 if(target.blocked){
  ctx.fillRect(8.5,-15,9,2);
 }else{
  polygon(ctx,hand);
  ctx.fill();
 }
 ctx.restore();
}
