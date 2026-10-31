import {projectMapPoint,type PlayerMapFeatures,type PlayerMapLandmark,type PlayerMapView} from './player-map';
import {mapArtDisplayFactor} from './player-map-art';
import {CAMP_MAP_WALL} from './player-map-camp-wall';
import type {Vec} from './survival-engine';

type Box={left:number;top:number;width:number;height:number};
export type MapLabel={mark:PlayerMapLandmark;anchor:Vec;illustrated:boolean;opacity:number;box?:Box};
export const MAP_LABEL_FONT_SIZE=13;
export const CAMP_DETAIL_SPAN={hidden:260,full:300};
const overlaps=(a:Box,b:Box)=>a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top;

/** Captions never seek another position. Font size stays in screen pixels;
 * the same anchor follows the illustration through every pan and zoom. */
export function playerMapLabels(features:PlayerMapFeatures,view:PlayerMapView,width:number,height:number,_zoom:number,_player:Vec,artReady:boolean):MapLabel[]{
 const art=new Map(features.illustrations.filter(a=>a.kind!=='palisade').map(a=>[a.id,a]));
 const span=CAMP_MAP_WALL.radius*2*view.scale,detail=Math.max(0,Math.min(1,(span-CAMP_DETAIL_SPAN.hidden)/(CAMP_DETAIL_SPAN.full-CAMP_DETAIL_SPAN.hidden)));
 return features.landmarks.flatMap(mark=>{
  if(mark.kind!=='camp'&&detail===0)return[];
  const illustration=art.get(mark.id),anchor=projectMapPoint(illustration??mark,view);
  if(anchor.x<-120||anchor.y<-120||anchor.x>width+120||anchor.y>height+120)return[];
  const factor=illustration?mapArtDisplayFactor(illustration,view.scale):1;
  const artHeight=illustration?(Math.abs(Math.sin(illustration.rotation))*illustration.width+Math.abs(Math.cos(illustration.rotation))*illustration.height)*view.scale*factor:24;
  const labelWidth=mark.label.length*7+8,labelHeight=15;
  // Headquarters always names the roof from above; every other caption stays below.
  const top=mark.kind==='headquarters'?anchor.y-artHeight/2-labelHeight-5:anchor.y+(mark.kind==='camp'?Math.max(28,artHeight/2+4):artHeight/2+4);
  const fixed={left:anchor.x-labelWidth/2,top,width:labelWidth,height:labelHeight};
  const inside=fixed.left>=8&&fixed.top>=8&&fixed.left+fixed.width<=width-8&&fixed.top+fixed.height<=height-8;
  const controls={left:width-76,top:0,width:76,height:184};
  return[{mark,anchor,illustrated:artReady&&!!illustration,opacity:mark.kind==='camp'?1:detail,box:inside&&!overlaps(fixed,controls)?fixed:undefined}];
 });
}
