import type {WorldAsset} from './world-assets';
import type {Placement} from './world-layout';

export const smallholdingBed:WorldAsset={
 id:'smallholding-vegetable-bed',name:'Neglected vegetable bed',group:'Smallholding',
 image:'/survival/smallholding-v1/vegetable-bed.webp',crop:[0,0,768,512],anchor:[384,256],
 width:318,height:212,solid:false,allowTransparency:false,groundDetail:true,role:'prop',body:[],
};

/** Stable plant IDs keep individual harvests in the run's existing forage state. */
export function smallholdingCrops(origin:{x:number;y:number}):Placement[]{
 const beds=[
  {kind:'potato',x:-295,plants:[[-82,-55,.86],[46,-48,.76],[-18,7,.93],[64,64,.82]]},
  {kind:'carrot',x:290,plants:[[-51,-53,.85],[79,-50,.90],[9,9,.82],[-77,65,.90],[62,62,.78]]},
 ] as const;
 const placements:Placement[]=[];
 for(const bed of beds){
  const x=origin.x+bed.x,y=origin.y+223,id='smallholding-'+bed.kind;
  placements.push({
   id:id+'-bed',assetId:smallholdingBed.id,x,y,scale:1,layer:-6,flipX:bed.kind==='carrot',
   locked:true,solid:false,roof:'auto',role:'prop',
  });
  bed.plants.forEach(([dx,dy,scale],i)=>placements.push({
   id:id+'-'+(i+1),assetId:'art_forage_wild_'+bed.kind,x:x+dx,y:y+dy,scale,
   flipX:i%2===1,locked:true,solid:false,roof:'auto',role:'prop',
  }));
 }
 return placements;
}
