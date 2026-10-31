export const FIELD_KIT_TOP={height:40,radius:11,hitSlop:2} as const;
// Match the painted bar below its raised crest, not the full sprite bounds.
export const FIELD_KIT_UTILITY={width:40,height:34,topOffset:5,hitSlop:5} as const;

// Reuse the original painted panel without stretching its portrait, end caps
// or central crest. Only the quiet teal fields grow with the combat meter.
export const COMBAT_VITALS_SLICES=[
 {id:'join',from:200,to:240,width:8},
 {id:'left',from:240,to:480},
 {id:'crest',from:480,to:580,width:20},
 {id:'right',from:580,to:794},
 {id:'end',from:794,to:834,width:8},
] as const;

export function combatVitalsFrame(width:number){
 const w=Math.max(0,width),field=Math.max(0,(w-40-36)/2);let left=40;
 const pieces=COMBAT_VITALS_SLICES.map(part=>{
  const size='width' in part?part.width:field,span=part.to-part.from;
  const clip={position:'absolute' as const,left,top:0,width:size,height:40,overflow:'hidden' as const};
  const image={position:'absolute' as const,left:-part.from/span*size,top:0,width:834/span*size,height:40};
  left+=size;return{id:part.id,clip,image};
 });
 const narrow=w<360;
 return{size:{width:w,height:FIELD_KIT_TOP.height},pieces,grid:{position:'absolute' as const,left:47,top:10,width:Math.max(0,w-56),height:24},cellWidth:narrow?36:44,iconSize:narrow?12:14,fontSize:narrow?10:12,valueWidth:narrow?24:28,gap:narrow?3:4};
}
