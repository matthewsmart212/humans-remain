import type {WorldBounds} from '../src/world-bounds';
import type {PlayerMapView} from '../src/player-map';

export type MapPoint={x:number;y:number};
export type NativeMapCamera={bounds:WorldBounds;width:number;height:number;entry:number;continuous:boolean;zoom:number;baseFocus:MapPoint;focus:MapPoint};
export function nativeAtlasOpacity(amount:number){'worklet';const t=Math.max(0,Math.min(1,(.7-amount)/(.7-.56)));return t*t*(3-2*t)}
/** Worklet equivalent of playerMapView. Kept small so camera movement never
 * imports world geometry or React into the UI runtime. */
export function nativeMapView(bounds:WorldBounds,screenWidth:number,screenHeight:number,zoom:number,focus:MapPoint,maxZoom=12):PlayerMapView{
 'worklet';
 const sw=Math.max(1,Number.isFinite(screenWidth)?screenWidth:1),sh=Math.max(1,Number.isFinite(screenHeight)?screenHeight:1),inset=Math.min(32,sw*.2,sh*.2);
 const z=Math.max(1,Math.min(maxZoom,Number.isFinite(zoom)?zoom:1)),scale=Math.min((sw-inset*2)/bounds.width,(sh-inset*2)/bounds.height)*z,width=sw/scale,height=sh/scale,margin=inset/scale;
 const left=bounds.left-margin,right=bounds.right+margin-width,top=bounds.top-margin,bottom=bounds.bottom+margin-height;
 return{x:left>right?(bounds.left+bounds.right-width)/2:Math.max(left,Math.min(right,focus.x-width/2)),y:top>bottom?(bounds.top+bounds.bottom-height)/2:Math.max(top,Math.min(bottom,focus.y-height/2)),width,height,scale};
}
export function nativeMapCameraView(camera:NativeMapCamera,amount:number,focus:MapPoint):PlayerMapView{
 'worklet';
 const opacity=camera.continuous?nativeAtlasOpacity(amount):1;
 return nativeMapView(camera.bounds,camera.width,camera.height,camera.continuous?Math.max(1,camera.entry*amount/.7):camera.zoom,camera.continuous?{x:camera.baseFocus.x+(focus.x-camera.baseFocus.x)*opacity,y:camera.baseFocus.y+(focus.y-camera.baseFocus.y)*opacity}:focus,Math.max(12,camera.entry));
}
export function nativeMapPoint(point:MapPoint,view:PlayerMapView){'worklet';return{x:(point.x-view.x)*view.scale,y:(point.y-view.y)*view.scale}}
export function nativeMapPan(view:PlayerMapView,from:MapPoint,to:MapPoint,width:number,height:number){
 'worklet';return{x:view.x+from.x/view.scale-(to.x-width/2)/view.scale,y:view.y+from.y/view.scale-(to.y-height/2)/view.scale};
}
export type NativeMapLabelData={x:number;y:number;kind:string;label:string;illustration?:{x:number;y:number;width:number;height:number;rotation:number;kind:string}};
export function nativeMapLabel(data:NativeMapLabelData,view:PlayerMapView,width:number,height:number,campSpan:number){
 'worklet';
 const art=data.illustration,anchor=nativeMapPoint(art??data,view),detail=Math.max(0,Math.min(1,(campSpan*view.scale-260)/40));
 const factor=art?.kind==='camp'?Math.max(1,28/(art.width*view.scale)):1,artHeight=art?(Math.abs(Math.sin(art.rotation))*art.width+Math.abs(Math.cos(art.rotation))*art.height)*view.scale*factor:24;
 const w=data.label.length*7+8,h=15,top=data.kind==='headquarters'?anchor.y-artHeight/2-h-5:anchor.y+(data.kind==='camp'?Math.max(28,artHeight/2+4):artHeight/2+4),left=anchor.x-w/2;
 const inView=anchor.x>=-120&&anchor.y>=-120&&anchor.x<=width+120&&anchor.y<=height+120,inside=left>=8&&top>=8&&left+w<=width-8&&top+h<=height-8,controls=left<width&&left+w>width-76&&top<184&&top+h>0;
 const opacity=data.kind==='camp'?1:detail;
 return{anchor,left,top,width:w,opacity:inView?opacity:0,labelOpacity:inView&&inside&&!controls?opacity:0};
}
/** Mirrors the tile request coverage, not the per-pixel camera transform. */
export function nativeMapCoverageKey(view:PlayerMapView,bounds:WorldBounds,pixelRatio:number){
 'worklet';
 const extent=Math.max(bounds.width,bounds.height,1),need=view.scale*pixelRatio*.75/(512/extent),level=need<=1?0:Math.min(10,Math.ceil(Math.log2(need)-1e-9));
 const span=extent/2**level,cols=Math.max(1,Math.ceil(bounds.width/span-1e-9)),rows=Math.max(1,Math.ceil(bounds.height/span-1e-9));
 return level+':'+Math.max(0,Math.floor((view.x-bounds.left)/span))+':'+Math.min(cols-1,Math.floor((view.x+view.width-bounds.left)/span))+':'+Math.max(0,Math.floor((view.y-bounds.top)/span))+':'+Math.min(rows-1,Math.floor((view.y+view.height-bounds.top)/span));
}
export function nativeMapFollowAllowed(following:boolean,currentScene:string,currentEpoch:number,requestedScene:string,requestedEpoch:number){
 'worklet';return following&&currentScene===requestedScene&&currentEpoch===requestedEpoch;
}
