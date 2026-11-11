export const MIN_PLAY_ZOOM=.7,MAX_PLAY_ZOOM=1;
/** Extra-wide gameplay framing. A normal pinch cannot enter the atlas in this mode. */
export const FULL_PLAY_ZOOM=.35;
export const FULL_ZOOM_SETTING_KEY='humans-remain-full-zoom-v1';
export const clampPlayZoom=(zoom:number,minimum=MIN_PLAY_ZOOM)=>Number.isFinite(zoom)?Math.max(minimum,Math.min(MAX_PLAY_ZOOM,zoom)):MAX_PLAY_ZOOM;
export type PinchPoint={id:string|number;x:number;y:number};

/** Gesture state only; the camera remains the single source of zoom state. */
export class PlayPinchZoom{
 private pair:{ids:readonly (string|number)[];distance:number}|null=null;
 private mapRequested=false;
 constructor(private minimum=MIN_PLAY_ZOOM){}
 setMinimum(value:number){this.minimum=value}
 private clamp(value:number){return Number.isFinite(value)?Math.max(this.minimum,Math.min(MAX_PLAY_ZOOM,value)):MAX_PLAY_ZOOM}
 cancel(){this.pair=null;this.mapRequested=false}
 takeMapRequest(){const requested=this.mapRequested;this.mapRequested=false;return requested}
 update(points:readonly PinchPoint[],zoom:number){
  zoom=this.clamp(zoom);
  if(points.length!==2){this.cancel();return zoom}
  const [a,b]=points,distance=Math.hypot(a.x-b.x,a.y-b.y);
  if(!Number.isFinite(distance)||distance<4){this.cancel();return zoom}
  const previous=this.pair;
  this.pair={ids:[a.id,b.id],distance};
  if(!previous||!previous.ids.includes(a.id)||!previous.ids.includes(b.id))return zoom;
  // Rebase each sample, including at the limits, so reversing a pinch has
  // an immediate response without having to undo an overshoot first.
  const proposed=zoom*distance/previous.distance;
  if(distance<previous.distance&&proposed<=MIN_PLAY_ZOOM)this.mapRequested=true;
  return this.clamp(proposed);
 }
}
