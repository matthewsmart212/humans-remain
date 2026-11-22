import art from './smallholding-yard-art.json';
import type {WorldAsset} from './world-assets';
import type {Placement,WorldLayout} from './world-layout';

type Point={x:number;y:number};
export const YARD_IMAGE='/survival/smallholding-v2/yard.webp';
export const YARD_IMAGE_SIZE=art.size;
// All sockets and post feet use pixels in the ground frame of the atlas.
// The cottage's threshold anchor fixes the painting to the same world site on Continue.
const cottageAnchor=[818,362];
const unitsPerPixel=1.3;
export function yardPoint(cottage:Point,u:number,v:number){
 return {x:cottage.x+(u-cottageAnchor[0])*unitsPerPixel,y:cottage.y+(v-cottageAnchor[1])*unitsPerPixel};
}
const yard:WorldAsset={
 id:'smallholding-yard',name:'Overgrown vegetable garden',group:'Smallholding',image:YARD_IMAGE,
 crop:art.ground,anchor:cottageAnchor,width:art.ground[2]*unitsPerPixel,height:art.ground[3]*unitsPerPixel,
 groundDetail:true,solid:false,allowTransparency:false,role:'prop',body:[],
};

// Each rail has a transparent foreground frame. Sorting and collision both
// follow its two painted feet, including the braced leaf beside the entrance.
const rails=art.panels.map(({crop,offset,feet:[[ax,ay],[bx,by]]},index)=>{
 const u=(ax+bx)/2,v=(ay+by)/2;
 const asset:WorldAsset={
  id:'smallholding-yard-rail-'+index,name:index===0?'Open timber gate':'Overgrown timber fence',
  group:'Smallholding',image:YARD_IMAGE,crop,anchor:[u-offset[0],v-offset[1]],
  width:crop[2]*unitsPerPixel,height:crop[3]*unitsPerPixel,solid:true,role:'prop',body:[],
  perimeter:'wall',perimeterRise:92,
  segments:[{x:(ax-u)*unitsPerPixel,y:(ay-v)*unitsPerPixel,ex:(bx-u)*unitsPerPixel,ey:(by-v)*unitsPerPixel,r:7}],
 };
 return {asset,u,v};
});
const props=art.props.map(({id,crop,anchor,foot:[u,v]})=>{
 const asset:WorldAsset={
  id:'smallholding-'+id,name:id==='kindling'?'Stack of kindling':'Tin watering can',group:'Smallholding',
  image:YARD_IMAGE,crop,anchor,width:crop[2]*unitsPerPixel,height:crop[3]*unitsPerPixel,
  solid:false,role:'prop',body:[],
 };
 return {asset,u,v};
});
export const SMALLHOLDING_YARD_ASSETS=[yard,...rails.map(rail=>rail.asset),...props.map(prop=>prop.asset)];

export function smallholdingYard(cottage:Point):Placement[]{
 const place=(id:string,assetId:string,position:Point,solid:boolean,scale=1):Placement=>({
  id,assetId,...position,solid,scale,role:'prop',locked:true,roof:'auto',
 });
 return [
  {...place(yard.id,yard.id,cottage,false),layer:-7},
  ...rails.map(({asset,u,v},i)=>place(i===0?'smallholding-fence-gate':asset.id,asset.id,yardPoint(cottage,u,v),true)),
  ...props.map(({asset,u,v})=>place(asset.id,asset.id,yardPoint(cottage,u,v),false)),
  place('smallholding-gate-birch','art_tree_birch',yardPoint(cottage,450,944),true),
  place('smallholding-rear-birch','art_tree_birch',yardPoint(cottage,927,116),true,.82),
 ];
}

// In portrait the usual height-based zoom crops both sides of the garden.
// Ease into a width-based view at the rails and keep the player's pinch zoom.
const yardByLayout=new WeakMap<WorldLayout,Placement|null>();
export function portraitYardCamera(layout:WorldLayout,player:Point,width:number,scale:number,zoom:number){
 let site=yardByLayout.get(layout);
 if(site===undefined){
  site=layout.items.find(p=>p.id===yard.id)??null;
  yardByLayout.set(layout,site);
 }
 if(!site)return;
 const left=site.x-900,right=site.x+680;
 const distance=Math.max(0,left-player.x,player.x-right,site.y-500-player.y,player.y-site.y-660);
 if(distance>=480)return;
 const t=1-distance/480,blend=t*t*(3-2*t);
 const fitted=Math.min(scale,width/1660*zoom);
 const nextScale=scale+(fitted-scale)*blend;
 const half=width/(2*fitted);
 const framed=Math.max(right+36-half,Math.min(left-36+half,player.x));
 return {scale:nextScale,focusX:player.x+(framed-player.x)*blend};
}
