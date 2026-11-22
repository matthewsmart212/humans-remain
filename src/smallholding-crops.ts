import {yardPoint} from './smallholding-yard';
import type {WorldAsset} from './world-assets';
import type {Placement} from './world-layout';

export const smallholdingBed:WorldAsset={
 id:'smallholding-vegetable-bed',name:'Neglected vegetable bed',group:'Smallholding',
 image:'/survival/smallholding-v1/vegetable-bed.webp',crop:[0,0,768,512],anchor:[384,256],
 width:318,height:212,solid:false,allowTransparency:false,groundDetail:true,role:'prop',body:[],
};

/** Keep the original harvest IDs so a picked vegetable stays picked on Continue. */
export function smallholdingCrops(cottage:{x:number;y:number}):Placement[]{
 const beds={
  potato:[[600,440,1.04],[631,469,1.11],[550,484,1.12],[576,511,1.04]],
  carrot:[[825,504,.98],[925,510,1.03],[866,535,.98],[816,553,1.03],[953,553,1.07],
   [898,568,.93],[984,535,.92],[752,632,.74],[832,644,.65]],
 };
 return Object.entries(beds).flatMap(([kind,sockets])=>sockets.map(([u,v,scale],i):Placement=>({
  id:'smallholding-'+kind+'-'+(i+1),assetId:'art_forage_wild_'+kind,...yardPoint(cottage,u,v),scale,
  flipX:i%2===1,locked:true,solid:false,roof:'auto',role:'prop',
 })));
}
